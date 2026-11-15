import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { Cameras, type RigId } from '../../viewer/camera/index.ts';
import { approach } from '../../viewer/camera/maths.ts';
import { chooseLevel, distanceTo, lodUrl } from '../../viewer/lod.ts';
import { InkPass, type Look, Looks } from '../../viewer/look.ts';
import { refused, sayRefused, watchContext } from '../../viewer/lost.ts';
import { fitIndices, fitPictures } from '../../viewer/pictures.ts';
import type { Tone } from '../../viewer/studio.ts';
import { type Tier, tier } from '../../viewer/tier.ts';
import type { LineupRow } from '../address.ts';
import { Hall } from './hall.ts';
import { allot, type Entry, layOutRow } from './row.ts';
import { dress, fitTo, release, Stand } from './stand.ts';

/**
 * The Lineup's scene: every vehicle the flights have built, standing in one row on one floor at one scale, in the
 * order they flew (lineup.ts is the page; row.ts the arithmetic; stand.ts one vehicle; hall.ts the room). It is a
 * scene of its own, on the page's canvas with a renderer of its own, and not a `Stage`: a stage holds one flight, in
 * full, and this holds all of them, mostly coarse. It shares with the stages what makes a vehicle look as it does
 * there (the studio's light and room, the two looks, the levels of detail and their fade) and the camera
 * (viewer/camera: one camera, its rigs, and everything they promise). What it keeps of rendering.md, in its own terms:
 *
 * - **Coarsest first, finest where the eye is.** The page opens on the coarsest level of every vehicle (a fifth of the
 *   bytes of the finest) and the row is formed from those. Each vehicle is then drawn at the level its size on screen
 *   calls for (`chooseLevel`, by its own measured thresholds, to the nearest point of its box), as far as the device
 *   can hold: `allot` gives the allowance (`ALLOWANCE`) to what is nearest the middle of the view first. A finer level
 *   is fetched only once the view has come to rest on wanting it, fades in over the coarser (`Crossfade`), and is let
 *   go whole a few seconds after it stops being wanted, or at once when another needs its room.
 * - **Drawn only when the picture changes**: the camera moved, a level arrived or is fading, something was chosen or
 *   switched. A still row costs nothing.
 * - **No fixed near plane** (`fitDepth`): half the way to the nearest vehicle's box, never past the floor at the
 *   camera's feet; in at once, out over a moment.
 * - **No shadow map.** Each vehicle's shadow is its own picture, drawn once (stand.ts): nothing to redraw as the view
 *   moves, nothing to shimmer.
 * - **Positions are floats.** The row is a few hundred metres long and stands about the origin: a float holds a place
 *   in it to a fiftieth of a millimetre, so nothing is drawn from the eye here (`uOrigin` is a stage's).
 * - **Both looks**: every level is handed to `Looks` as it arrives and taken from it before it is let go; the ink line
 *   is the stages' own pass, on this frame's depth.
 */

/** What the page is told. */
export interface LineupHost {
  /** The pointer is on a vehicle (its flight's id), or on none. */
  hover(id: string | null): void;
  /** A vehicle was clicked, or (null) nothing was. */
  pick(id: string | null): void;
  /** The hands have taken the view: turned, slid or zoomed it. */
  taken(): void;
  /** The reset key. */
  home(): void;
  /** The rig in charge has changed. */
  rig(id: RigId): void;
  /** A frame has been drawn: what is written over the picture goes where the picture now has it. */
  drawn(): void;
}

/** A part of the canvas nothing covers, CSS pixels from the canvas's own corner. */
export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * What a device may hold of levels finer than the coarsest, MiB of buffers and pictures on the GPU. The lighter tier's
 * is what keeps the page under the launch site's budget as a phone with one vehicle framed in full (docs/agents/
 * rendering.md, "Memory"; measured by tools/lineup-test.mjs); a desk's is past what the whole row in full takes.
 */
const ALLOWANCE = { lighter: 96, full: 1024 } as const;
/** The most texels a side of any picture a vehicle wears here: a panel's 4096 is for the couch in front of it, not for a row seen from across a hall. */
const PICTURE_MOST = 1024;
/** Seconds a finer level is kept after it stops being wanted, so a look to one side and back fetches nothing. */
const LINGER = 6;
/** Levels fetched at once. */
const FETCHES = 2;
/** Seconds the view must have wanted a finer level before it is fetched: a camera on its way down the row asks for nothing it only passes. */
const SETTLE = 0.35;
/** The lens views are framed for, degrees: longer than a stage's 35, so that the row is seen nearly square on from end to end and heights compare. */
const LENS = 28;
const NEAR_LEAST = 0.05;
const NEAR_EASE = 0.25;
/** How much of the clear part of the picture a subject is framed to fill. */
const FILL = 0.86;
/** The row as it is first seen: square on from the front and a little above, as a drawing of it would be. Pivot to eye. */
const HOME = new THREE.Vector3(0, 0.09, 1).normalize();
const UP = new THREE.Vector3(0, 1, 0);
const MIB = 2 ** 20;

export class LineupScene {
  readonly canvas: HTMLCanvasElement;
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(LENS, 1, 0.5, 4000);
  readonly cam: Cameras;
  readonly hall: Hall;
  readonly tier: Tier = tier();
  /** Every vehicle, in the order they flew: in the row or, while others are compared, out of it. */
  readonly stands: Stand[];
  /** For tests: a change of level is a cut, and nothing eases. */
  frozen = false;
  /** For tests: what the device may hold of finer levels, MiB (the tier's own, unless set). */
  allowance: number = this.tier.lighter ? ALLOWANCE.lighter : ALLOWANCE.full;

  private readonly host: LineupHost;
  private readonly composer: EffectComposer;
  private readonly frameTarget: THREE.WebGLRenderTarget;
  private readonly backdropPass: RenderPass;
  private readonly ink = new InkPass();
  private readonly looks = new Looks();
  private readonly loader = new GLTFLoader();
  private readonly rowGroup = new THREE.Group();
  private readonly timer = new THREE.Timer();
  private readonly raycaster = new THREE.Raycaster();
  private readonly frustum = new THREE.Frustum();
  private readonly lastView = new THREE.Matrix4();
  private readonly lastProjection = new THREE.Matrix4();
  private readonly pointer = new THREE.Vector2();
  private row: LineupRow = 'vehicles';
  private only: string[] | null = null;
  private chosen: string | null = null;
  private hovered: string | null = null;
  private dirty = true;
  private lost = false;
  private asleep = false;
  private pointerDirty = false;
  private down: { x: number; y: number; id: string | null } | null = null;
  /** The middle of the row and how far it reaches, for the camera's limits and the depth range. */
  private readonly bounds = new THREE.Sphere(new THREE.Vector3(), 30);
  private extent = { from: -10, to: 10, front: 2, back: -2, tallest: 10 };
  /** What the camera was last sent to frame (null: all that stands), until the hands take the view. */
  private following: { ids: string[] | null } | null = null;
  /** Where nothing covers the picture: beside the title card (the whole height) and under it (the whole width). */
  private clear: { beside: Rect; under: Rect } | null = null;
  /** How far to one side of the middle the pivot is seen (-1 to 1 across), so that it is in the middle of what is clear; where it is now, and where it is going. */
  private aside = 0;
  private asideNow = 0;
  /** How far the lens is shifted for it, pixels (NaN: to be set again, the picture having changed shape). */
  private shifted = 0;
  private nearEased = NEAR_LEAST;
  /** What the camera is on its way to, and how large it will be drawn there, drawing pixels a metre: asked of the levels of detail while it travels. */
  private ahead: { ids: string[]; ppm: number } | null = null;
  /** The camera has been sent somewhere at least once: before that it has no direction worth keeping. */
  private framed = false;
  private fetches = 0;
  private settled = 0;
  private measured = true;
  private peopled = true;
  private frames = 0;
  private drawnFrames = 0;
  private work = 0;
  private statsAt = performance.now();
  private readonly observer: ResizeObserver;

  constructor(canvas: HTMLCanvasElement, entries: readonly Entry[], host: LineupHost) {
    this.canvas = canvas;
    this.host = host;
    const renderer = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.info.autoReset = false; // counted per frame drawn, across every pass (stats())
    // a context the browser takes away (a phone short of memory) stops the loop and says so: never a dead page, never a reload by itself (lost.ts)
    watchContext(canvas, () => {
      this.lost = true;
      renderer.setAnimationLoop(null);
    });
    // models are Draco-compressed; the decoder is served from public/draco, and is fetched now, beside the first model
    this.loader.setDRACOLoader(new DRACOLoader().setDecoderPath(`${import.meta.env.BASE_URL}draco/`).preload());

    this.hall = new Hall(renderer);
    this.scene.add(this.hall.group, this.rowGroup);
    this.looks.add(this.hall.group);
    this.stands = entries.map((entry) => new Stand(entry, this.hall.colours.figure, this.hall.shadow));
    for (const stand of this.stands) this.rowGroup.add(stand.group);
    this.relight();

    this.cam = new Cameras(
      this.camera,
      canvas,
      {
        upAt: (_p, out) => out.copy(UP),
        clearance: (p) => p.y,
        reach: () => ({ centre: this.bounds.center, radius: this.bounds.radius + 25 }),
        far: () => 6 * this.bounds.radius + 200,
        maxPolar: () => Math.PI / 2 - 0.012,
        // no higher than 58 degrees above the level, as in the studio: things that stand are looked at, not down on
        minPolar: () => THREE.MathUtils.degToRad(32),
        craft: () => null,
        solidAt: (x, y) => this.solidAt(x, y),
        free: () => true,
        piloted: () => false,
        watching: () => false,
      },
      {
        taken: (how) => {
          if (how === 'tilt') return;
          this.following = null;
          this.host.taken();
        },
        home: () => this.host.home(),
        rig: (id) => this.host.rig(id),
      },
      LENS,
    );
    this.cam.calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // A multisampled half-float frame with a depth of its own, as a stage's is: thin bright struts against a plain
    // wall, and the ink line read from its depth. The composer's other buffer is a plain texture; only the ink pass
    // draws into it, and the two are put back after each frame (`draw`).
    const target = (this.frameTarget = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: 4,
      depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedIntType),
    }));
    this.composer = new EffectComposer(renderer, target);
    this.composer.renderTarget2.dispose();
    this.composer.renderTarget2 = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
    this.composer.readBuffer = target;
    this.composer.writeBuffer = this.composer.renderTarget2;
    this.backdropPass = new RenderPass(this.hall.backdrop.scene, this.hall.backdrop.camera);
    this.composer.addPass(this.backdropPass);
    const main = new RenderPass(this.scene, this.camera);
    main.clear = false;
    main.clearDepth = true;
    this.composer.addPass(main);
    this.ink.enabled = false;
    this.composer.addPass(this.ink);
    this.composer.addPass(new OutputPass());

    // A press that does not move is a click, and chooses; the pick is made as the press starts (the page may be laid
    // out again by the time it ends).
    const aim = (e: PointerEvent): void => {
      const r = canvas.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    canvas.addEventListener('pointermove', (e) => {
      aim(e);
      this.pointerDirty = e.pointerType === 'mouse'; // a finger has no hover
    });
    canvas.addEventListener('pointerleave', () => this.setHover(null));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      aim(e);
      this.down = { x: e.clientX, y: e.clientY, id: this.standAt(this.pointer.x, this.pointer.y)?.entry.flight.id ?? null };
    });
    canvas.addEventListener('pointerup', (e) => {
      const down = this.down;
      this.down = null;
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) >= 5) return;
      this.host.pick(down.id);
    });
    canvas.addEventListener('pointercancel', () => (this.down = null));
    // the pixel ratio changes when the window moves to another display or the page is zoomed
    const watchRatio = (): void => {
      matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener('change', watchRatio, { once: true });
      this.resize();
    };
    watchRatio();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.resize();
    renderer.setAnimationLoop(() => this.tick());
  }

  // ----------------------------------------------------------------------------------------------- arriving

  /** Fetch one level of one vehicle, dressed and in the look in force. */
  private async fetch(stand: Stand, level: number, onProgress?: (loaded: number, total: number) => void): Promise<THREE.Object3D> {
    const url = import.meta.env.BASE_URL + lodUrl(stand.entry.vehicle.url, level);
    const gltf = await this.loader.loadAsync(url, (e) => onProgress?.(e.loaded, e.total));
    await fitPictures(gltf.scene); // (the tier's sizes, before anything is sent to the GPU: pictures.ts)
    await fitTo(gltf.scene, PICTURE_MOST);
    fitIndices(gltf.scene);
    dress(gltf.scene, this.renderer.capabilities.getMaxAnisotropy());
    this.looks.add(gltf.scene);
    return gltf.scene;
  }

  /** Let a level go: the looks' twins of its materials first, then all of it. */
  private drop(root: THREE.Object3D): void {
    this.looks.remove(root);
    release(root); // (it was not being drawn: the picture is as it was, and is not drawn again for this)
  }

  /**
   * Bring every vehicle in at its coarsest level and form the row. `onProgress`: how much of them all has arrived, 0
   * to 1, and the bytes. Resolves with the callsigns of any that did not arrive, which are left out of the row (the
   * page says so); rejects only if none did.
   */
  async load(onProgress?: (fraction: number, loaded: number, total: number) => void): Promise<string[]> {
    const parts = this.stands.map(() => ({ loaded: 0, total: 0 }));
    const say = (): void => {
      const sized = parts.filter((p) => p.total > 0);
      const [loaded, total] = [sized.reduce((a, p) => a + p.loaded, 0), sized.reduce((a, p) => a + p.total, 0)];
      // (until every size is known, the ones that are stand for the rest)
      onProgress?.(total ? (loaded / total) * (sized.length / parts.length) : 0, loaded, total);
    };
    const missing: string[] = [];
    await Promise.all(
      this.stands.map(async (stand, i) => {
        // the coarsest there is: a vehicle built without its coarser levels stands as the finest of what it has
        for (let level = stand.coarsest; level >= 0; level--) {
          try {
            const root = await this.fetch(stand, level, (loaded, total) => {
              parts[i] = { loaded, total: total || parts[i]!.total };
              say();
            });
            if (level !== stand.coarsest) stand.finest = stand.coarsest; // (what it has is all there is to draw)
            stand.add(stand.coarsest, root, false);
            parts[i] = { loaded: parts[i]!.total, total: parts[i]!.total };
            say();
            return;
          } catch (e) {
            if (level === 0) {
              console.warn(`${stand.entry.flight.id} did not arrive, and is left out of the row:`, e);
              missing.push(stand.entry.flight.callsign);
            }
          }
        }
      }),
    );
    if (!this.stands.some((s) => s.here)) throw new Error('no vehicle arrived');
    this.form();
    return missing;
  }

  /**
   * Build what the first frames need, unseen, so that the row moves smoothly from the moment it is shown: the scene's
   * shaders as it stands, and the ones a level wears while it fades.
   */
  async warm(): Promise<void> {
    this.step(0);
    for (const stand of this.stands) if (stand.standing) stand.cast(this.renderer, this.hall.toKey);
    await this.renderer.compileAsync(this.scene, this.camera).catch(() => {});
    this.dirty = true;
    this.step(0);
    if (refused(this.renderer, [this.frameTarget])) sayRefused();
  }

  // ------------------------------------------------------------------------------------------------ the row

  /** The vehicles that stand in the row now, in order. */
  get standing(): Stand[] {
    return this.stands.filter((s) => s.standing);
  }

  stand(id: string | null): Stand | null {
    return (id && this.stands.find((s) => s.entry.flight.id === id)) || null;
  }

  /** What stands in the row: every vehicle whole or each spacecraft alone, and all of them or only `only` (to be compared). */
  setRow(row: LineupRow, only: readonly string[] | null): void {
    const same = row === this.row && JSON.stringify(only) === JSON.stringify(this.only);
    if (same) return;
    const parted = row !== this.row;
    this.row = row;
    this.only = only ? [...only] : null;
    if (parted) for (const stand of this.stands) stand.form(row);
    this.form();
  }

  /** Stand everything that is in the row where it goes, and rule the hall for it. */
  private form(): void {
    for (const stand of this.stands) {
      stand.standing = stand.here && (!this.only || this.only.includes(stand.entry.flight.id));
      stand.group.visible = stand.standing;
    }
    const standing = this.standing;
    const { at, length } = layOutRow(standing.map((s) => s.size.x));
    standing.forEach((stand, i) => stand.place(at[i]!));
    const tallest = Math.max(1, ...standing.map((s) => s.height));
    const deepest = Math.max(1, ...standing.map((s) => s.size.z));
    this.extent = { from: -length / 2, to: length / 2, front: deepest / 2, back: -deepest / 2, tallest };
    this.hall.fit(this.extent);
    this.bounds.center.set(0, tallest / 2, 0);
    this.bounds.radius = Math.hypot(length / 2, tallest / 2, deepest / 2);
    for (const stand of standing) stand.cast(this.renderer, this.hall.toKey);
    this.settled = 0;
    this.dirty = true;
  }

  /** Mark one vehicle as chosen (its plate lights), or none. */
  choose(id: string | null): void {
    this.chosen = id;
    for (const stand of this.stands) if (stand.choose(stand.entry.flight.id === id)) this.dirty = true;
  }

  // ----------------------------------------------------------------------------------------------- the view

  /** Where nothing covers the picture (CSS pixels from the canvas's corner): beside the title card, and under it. */
  setClear(beside: Rect, under: Rect): void {
    const was = JSON.stringify(this.clear);
    this.clear = { beside, under };
    if (JSON.stringify(this.clear) === was) return;
    this.refollow();
  }

  /** The box round some of the row (null: all that stands). */
  private boxOf(ids: readonly string[] | null): THREE.Box3 {
    const box = new THREE.Box3();
    for (const stand of this.standing) if (!ids || ids.includes(stand.entry.flight.id)) box.union(stand.box);
    return box;
  }

  /**
   * Frame some of the row (the flights named; null: all that stands) in what is clear of the picture. An explicit act:
   * with the reset key, the only thing that moves a view the hands have set. `again`: the same subject, framed again
   * because the picture changed shape, from the side it is seen from now.
   */
  frame(ids: readonly string[] | null, snap = false, again = false): void {
    const box = this.boxOf(ids);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const [w, h] = [Math.max(1, this.canvas.clientWidth), Math.max(1, this.canvas.clientHeight)];
    const whole: Rect = { left: 0, top: 0, right: w, bottom: h };
    // whichever clear part shows it larger: beside the title card for a tall thing, under it for a long row
    const rects = this.clear ? [this.clear.beside, this.clear.under] : [whole];
    const fits = (r: Rect): number => Math.min(Math.max(1, r.right - r.left) / size.x, Math.max(1, r.bottom - r.top) / size.y);
    const rect = rects.reduce((best, r) => (fits(r) > fits(best) ? r : best));
    // pixels a metre at the distance asked, by the lens: the subject fills FILL of the clear part, and its front
    // (half its depth nearer than its middle) is what must fit
    const tan = Math.tan(THREE.MathUtils.degToRad(LENS / 2));
    const distance = (h / (2 * tan * fits(rect) * FILL)) * 1 + size.z / 2;
    this.aside = ((rect.left + rect.right) / 2 - w / 2) / (w / 2);
    this.cam.inset = THREE.MathUtils.clamp((h - rect.bottom) / h - rect.top / h, -0.6, 0.65);
    const all = !ids || ids.length === this.standing.length;
    // (the whole row is seen from the front; one of it from wherever the view is, once it has been anywhere)
    const direction = (again || !all) && this.framed ? this.cam.direction() : HOME.clone();
    this.framed = true;
    direction.setY(Math.max(direction.y, 0.06)).normalize();
    this.following = { ids: ids ? [...ids] : null };
    // (a few of them sent for: their finer levels are asked for as the camera sets out, not when it arrives)
    this.ahead = ids && !all && !snap ? { ids: [...ids], ppm: fits(rect) * FILL * this.renderer.getPixelRatio() } : null;
    this.cam.frame({
      centre: box.getCenter(new THREE.Vector3()),
      distance,
      direction,
      min: Math.max(0.6, 0.62 * Math.min(size.x, size.z)),
      max: this.cam.fit(2 * this.bounds.radius, 0.3),
      snap: snap || this.frozen,
      again,
    });
    if (snap || this.frozen || this.cam.calm) this.asideNow = this.aside;
    this.dirty = true;
  }

  /** Frame again whatever the camera was last sent to, if the hands have not taken the view since: the picture has changed shape. */
  private refollow(): void {
    if (this.following) this.frame(this.following.ids, !this.cam.travelling, true);
  }

  /** Whether the view is still the one last framed (the hands have not taken it). */
  get followed(): boolean {
    return this.following !== null;
  }

  /** For tests and screenshots: the orbiting rig exactly here, looking straight at a point of the row, and still. */
  pose(azimuthDeg: number, elevationDeg: number, distance: number, y = this.bounds.center.y, x = 0, z = 0): void {
    const [az, el] = [THREE.MathUtils.degToRad(azimuthDeg), THREE.MathUtils.degToRad(elevationDeg)];
    const pivot = new THREE.Vector3(x, y, z);
    const eye = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el))
      .multiplyScalar(distance)
      .add(pivot);
    this.following = null;
    this.aside = this.asideNow = 0;
    this.cam.place(pivot, eye);
    this.dirty = true;
  }

  /** (A stage's switch, which the screenshot tool throws: nothing here turns by itthis.) */
  setAutoRotate(_on: boolean): void {}

  /** Where a point of the scene is on the page, CSS pixels; null behind the camera. */
  screenOf(point: THREE.Vector3): { x: number; y: number } | null {
    const v = point.clone().project(this.camera);
    if (v.z > 1 || v.z < -1) return null;
    const r = this.canvas.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  }

  /**
   * Where one of the ruled heights crosses a column of the page (`x`, CSS pixels): the page's y there, or null if the
   * line does not reach that column. The line runs along the row at height `y` in the plane of the vehicles' axes.
   */
  markAt(y: number, x: number): number | null {
    const r = this.canvas.getBoundingClientRect();
    const ndc = ((x - r.left) / r.width) * 2 - 1;
    const m = new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    // along the line the clip coordinates are straight lines in its own x: solve for where it is at this column
    const a = new THREE.Vector4(0, y, 0, 1).applyMatrix4(m);
    const b = new THREE.Vector4(1, y, 0, 1).applyMatrix4(m).sub(a);
    const t = (ndc * a.w - a.x) / (b.x - ndc * b.w);
    if (!Number.isFinite(t) || t < this.hall.ruled.from || t > this.hall.ruled.to) return null;
    const w = a.w + t * b.w;
    if (w <= 0) return null;
    return r.top + ((1 - (a.y + t * b.y) / w) / 2) * r.height;
  }

  /** The vehicle a ray through this place in the view (-1 to 1 across and up) first meets, by the box round it. */
  private standAt(x: number, y: number): Stand | null {
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
    const hit = new THREE.Vector3();
    let best: Stand | null = null;
    let least = Number.POSITIVE_INFINITY;
    for (const stand of this.standing) {
      if (!this.raycaster.ray.intersectBox(stand.box, hit)) continue;
      const far = hit.distanceTo(this.raycaster.ray.origin);
      if (far < least) [best, least] = [stand, far];
    }
    return best;
  }

  /** What is solid under a place in the view, for the camera: a vehicle (the box round it), or the floor near the row. */
  private solidAt(x: number, y: number): { point: THREE.Vector3; ground: boolean } | null {
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
    const ray = this.raycaster.ray;
    const point = new THREE.Vector3();
    let least = Number.POSITIVE_INFINITY;
    let found: THREE.Vector3 | null = null;
    for (const stand of this.standing) {
      if (!ray.intersectBox(stand.box, point)) continue;
      const far = point.distanceTo(ray.origin);
      if (far < least) [found, least] = [point.clone(), far];
    }
    if (found) return { point: found, ground: false };
    if (ray.direction.y >= -1e-6) return null;
    const floor = ray.at(-ray.origin.y / ray.direction.y, point);
    return floor.distanceTo(this.bounds.center) <= this.bounds.radius + 25 ? { point: floor.clone(), ground: true } : null;
  }

  private setHover(id: string | null): void {
    if (id === this.hovered) return;
    this.hovered = id;
    this.canvas.style.cursor = id ? 'pointer' : '';
    this.host.hover(id);
  }

  // ---------------------------------------------------------------------------------------------- the looks

  get look(): Look {
    return this.looks.current;
  }

  setLook(look: Look): void {
    this.looks.set(look);
    for (const stand of this.stands) stand.relook();
    this.ink.enabled = look === 'cel';
    this.hall.setLook(look);
    this.relight();
  }

  setTone(tone: Tone): void {
    this.hall.setTone(tone);
    this.relight();
  }

  /** The scale: a person beside each vehicle, the ruled heights and the tape. */
  setScale(on: boolean): void {
    this.measured = this.peopled = on;
    this.hall.measure(on);
    for (const stand of this.stands) stand.people(on);
    this.dirty = true;
  }

  /** The heights ruled across the row that carry a figure, metres; none while the scale is away. */
  marks(): number[] {
    return this.measured ? this.hall.marks.filter((m) => m.major).map((m) => m.y) : [];
  }

  /** Where a vehicle's foot is on the page (the middle of its front edge on the floor), CSS pixels; null if it is not standing, or is behind the eye. */
  footOf(id: string): { x: number; y: number } | null {
    const stand = this.stand(id);
    return stand?.standing ? this.screenOf(new THREE.Vector3(stand.group.position.x, 0, stand.box.max.z)) : null;
  }

  /** Where a vehicle's top is on the page. */
  topOf(id: string): { x: number; y: number } | null {
    const stand = this.stand(id);
    return stand?.standing ? this.screenOf(new THREE.Vector3(stand.group.position.x, stand.height, 0)) : null;
  }

  /** Where one of the ruled heights begins, at the row's first end, on the page. */
  markStart(y: number): { x: number; y: number } | null {
    return this.screenOf(new THREE.Vector3(this.hall.ruled.from, y, 0));
  }

  /** Where the middle of the row's top is on the page. */
  crown(): { x: number; y: number } | null {
    return this.screenOf(new THREE.Vector3(0, this.extent.tallest, 0));
  }

  /** How tall each one that stands in the row stands, metres, and whether what stands is its spacecraft alone. */
  heights(): { id: string; height: number; parted: boolean }[] {
    return this.standing.map((s) => ({ id: s.entry.flight.id, height: s.height, parted: s.parted }));
  }

  /** The view as it stands, to come back to (`goBack`): what is turned about, where from, and whether it is still the one last framed. */
  viewNow(): { pivot: THREE.Vector3; eye: THREE.Vector3; following: { ids: string[] | null } | null; aside: number; inset: number } {
    return {
      pivot: this.cam.pivot.clone(),
      eye: this.camera.position.clone(),
      following: this.following,
      aside: this.aside,
      inset: this.cam.inset,
    };
  }

  /** Go back to a view as it was left (`viewNow`): flown to, and the hands' again if it was theirs. */
  goBack(to: ReturnType<LineupScene['viewNow']>): void {
    this.aside = to.aside;
    this.cam.inset = to.inset;
    const offset = to.eye.clone().sub(to.pivot);
    this.cam.frame({
      centre: to.pivot,
      distance: offset.length(),
      direction: offset,
      min: 0.6,
      max: this.cam.fit(2 * this.bounds.radius, 0.3),
    });
    this.following = to.following;
    this.dirty = true;
  }

  private relight(): void {
    this.scene.environment = this.hall.environment;
    this.scene.environmentIntensity = this.hall.environmentIntensity;
    this.renderer.toneMappingExposure = this.hall.exposure;
    // a drawing's colours are left as painted, where the real look rolls bright ones off like film
    this.renderer.toneMapping = this.looks.current === 'cel' ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping;
    this.dirty = true;
  }

  // -------------------------------------------------------------------------------------------- frame by frame

  private resize(): void {
    const [w, h] = [this.canvas.clientWidth, this.canvas.clientHeight];
    if (!w || !h) return;
    // a phone's GPU has four times the pixels to fill per inch and a fraction of the power
    const coarse = matchMedia('(pointer: coarse)').matches;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.5 : 2, this.tier.pixelRatio));
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.shifted = Number.NaN;
    this.dirty = true;
    this.refollow(); // a framing made for the old shape no longer fits
  }

  /** Stop drawing and hearing (the page is going somewhere else), or carry on. */
  sleep(on: boolean): void {
    this.asleep = on;
    if (on) this.cam.keys.clear();
    this.dirty = true;
  }

  private tick(): void {
    if (this.lost || this.asleep) return;
    const began = performance.now();
    this.timer.update();
    this.step(Math.min(this.timer.getDelta(), 0.1));
    this.frames++;
    this.work += performance.now() - began;
  }

  private step(dt: number): void {
    this.cam.update(dt);
    // The pivot is seen in the middle of what is clear. Up and down, the rig tips the camera for it. Across, the lens
    // is shifted: the picture is a part, off to one side, of a wider one about the same axis. Nothing is turned, so
    // the row seen square on stays square on, its ruled lines level from end to end. Eased by time.
    this.asideNow = this.frozen || this.cam.calm || dt === 0 ? this.aside : approach(this.asideNow, this.aside, 0.22, dt);
    if (Math.abs(this.asideNow - this.aside) < 1e-4) this.asideNow = this.aside;
    const [w, h] = [this.canvas.clientWidth, this.canvas.clientHeight];
    const shift = Math.round((-this.asideNow * w) / 2);
    if (shift !== this.shifted && w && h) {
      this.shifted = shift;
      for (const camera of [this.camera, this.hall.backdrop.camera]) {
        if (shift) camera.setViewOffset(w, h, shift, 0, w, h);
        else camera.clearViewOffset();
      }
    }
    this.camera.updateMatrixWorld();
    this.fitDepth(dt);
    this.detail(dt);
    if (this.pointerDirty && !this.down) {
      this.pointerDirty = false;
      this.setHover(this.standAt(this.pointer.x, this.pointer.y)?.entry.flight.id ?? null);
    }
    const backdrop = this.hall.backdrop.camera;
    backdrop.quaternion.copy(this.camera.quaternion);
    if (backdrop.aspect !== this.camera.aspect || backdrop.fov !== this.camera.fov) {
      backdrop.fov = this.camera.fov;
      backdrop.aspect = this.camera.aspect;
      backdrop.updateProjectionMatrix();
    }
    // draw only what has changed: a still row is not drawn again
    const moved = !this.lastView.equals(this.camera.matrixWorld) || !this.lastProjection.equals(this.camera.projectionMatrix);
    if (!(this.dirty || moved)) return;
    this.lastView.copy(this.camera.matrixWorld);
    this.lastProjection.copy(this.camera.projectionMatrix);
    this.dirty = false;
    this.draw();
  }

  private draw(): void {
    this.hall.view(this.camera, this.cam.pivot);
    for (const stand of this.stands) if (stand.standing) stand.face(this.camera);
    this.ink.range(this.camera);
    this.renderer.info.reset();
    this.composer.render();
    if (this.composer.readBuffer !== this.frameTarget) this.composer.swapBuffers(); // (the ink pass changed them over: see the constructor)
    this.drawnFrames++;
    this.host.drawn();
  }

  /**
   * The depth range, fitted to what is there: the near plane half the way to the nearest vehicle's box and never past
   * the floor at the camera's feet (the nearest floor in view is at the frame's corner); the far one past the far end
   * of the row. In at once, out over a moment.
   */
  private fitDepth(dt: number): void {
    const eye = this.camera.position;
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * Math.hypot(1, this.camera.aspect);
    const corner = Math.hypot(1, tan);
    let nearest = Number.POSITIVE_INFINITY;
    for (const stand of this.stands) if (stand.standing) nearest = Math.min(nearest, stand.box.distanceToPoint(eye));
    let near = Math.min((0.9 * Math.max(0, eye.y)) / corner, (0.5 * nearest) / corner);
    near = Math.max(NEAR_LEAST, near);
    const was = this.nearEased;
    if (!(near > was) || this.frozen || !(dt > 0)) this.nearEased = near;
    else this.nearEased = Math.min(near, was * (near / was) ** (1 - Math.exp(-dt / NEAR_EASE)));
    near = this.nearEased;
    const far = eye.distanceTo(this.bounds.center) + 2 * this.bounds.radius + 80;
    if (Math.abs(near - this.camera.near) > near * 0.02 || Math.abs(far - this.camera.far) > far * 0.02) {
      this.camera.near = near;
      this.camera.far = far;
      this.camera.updateProjectionMatrix();
    }
  }

  /** Whether a box, as the camera sees it, reaches into a part of the picture's breadth (-1 to 1 across). */
  private spans(box: THREE.Box3, from: number, to: number): boolean {
    let [low, high] = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
    const corner = new THREE.Vector3();
    for (let i = 0; i < 8; i++) {
      corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
      corner.applyMatrix4(this.camera.matrixWorldInverse);
      // (a corner beside or behind the eye says nothing of where the box is across: it is taken to reach everywhere)
      if (corner.z > -this.camera.near) return true;
      corner.applyMatrix4(this.camera.projectionMatrix);
      low = Math.min(low, corner.x);
      high = Math.max(high, corner.x);
    }
    return high >= from && low <= to;
  }

  /** What every level finer than the coarsest that is held, or on its way, takes: bytes. */
  private held(): number {
    let bytes = 0;
    for (const stand of this.stands)
      for (let level = 0; level < stand.coarsest; level++) if (stand.levels[level] || stand.fetching[level]) bytes += stand.cost[level]!;
    return bytes;
  }

  /**
   * The levels of detail: each vehicle at the level its size on screen calls for, as far as the device's allowance
   * goes, the nearest to what is being looked at first (`allot`). What is granted and has arrived is drawn, fading in;
   * what is granted and has not is fetched once the view has rested on it; what is no longer granted is let go after
   * a moment, or at once when its room is needed.
   */
  private detail(dt: number): void {
    const now = performance.now();
    const fade = this.frozen ? Number.POSITIVE_INFINITY : dt;
    for (const stand of this.stands) if (stand.step(fade)) this.dirty = true;
    const eye = this.camera.position;
    const scale = this.renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
    this.frustum.setFromProjectionMatrix(
      new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse),
    );
    const centre = new THREE.Vector3();
    if (!this.cam.travelling) this.ahead = null;
    const ahead = this.ahead;
    // (what is in the picture and under a panel is not seen: only what is in the part of it that is clear, across)
    const w = Math.max(1, this.canvas.clientWidth);
    const across = this.clear
      ? [(Math.min(this.clear.beside.left, this.clear.under.left) / w) * 2 - 1, (this.clear.under.right / w) * 2 - 1]
      : [-1, 1];
    const asks = this.stands.map((stand) => {
      // (the one the camera is on its way to is as good as seen, at the size it will be when the camera gets there)
      const going = ahead?.ids.includes(stand.entry.flight.id) ? ahead.ppm : 0;
      const seen =
        stand.standing && (going > 0 || (this.frustum.intersectsBox(stand.box) && this.spans(stand.box, across[0]!, across[1]!)));
      // (what is not in the picture is wanted no finer than the coarsest: frames and memory are saved on what is hidden)
      const wanted = seen
        ? Math.max(stand.finest, chooseLevel(Math.max(going, scale / distanceTo(stand.box, eye)), stand.wanted, stand.above))
        : stand.coarsest;
      if (wanted !== stand.wanted) this.settled = 0;
      stand.wanted = wanted;
      const near = !seen
        ? Number.POSITIVE_INFINITY
        : stand.entry.flight.id === this.chosen
          ? -1
          : stand.box.getCenter(centre).distanceTo(this.cam.pivot);
      return { wanted, near, cost: stand.cost };
    });
    const granted = allot(asks, this.allowance * MIB);
    this.settled += dt;
    const order = this.stands.map((_, i) => i).sort((a, b) => asks[a]!.near - asks[b]!.near);
    // (room is needed when what is held, with what is granted and still to be fetched, is more than the allowance:
    // what lingers then goes at once, not when its moment is up)
    let waiting = 0;
    this.stands.forEach((stand, i) => {
      const level = granted[i]!;
      if (stand.here && level < stand.coarsest && !stand.levels[level] && !stand.fetching[level]) waiting += stand.cost[level]!;
    });
    const pressed = (): boolean => this.held() + waiting > this.allowance * MIB;
    for (const i of order) {
      const stand = this.stands[i]!;
      if (!stand.here) continue;
      stand.granted = granted[i]!;
      const level = stand.granted;
      // what is granted and here is drawn; one that shows a finer level than it is granted keeps it until the granted
      // one arrives, unless its room is needed: then it goes to the coarsest, which is always here
      if (!stand.fading) {
        const to = stand.levels[level] ? level : stand.shown < level && pressed() ? stand.coarsest : stand.shown;
        if (to !== stand.shown && stand.show(to, Number.isFinite(fade))) this.dirty = true;
      }
      for (let finer = 0; finer < stand.coarsest; finer++) {
        if (!stand.levels[finer]) continue;
        if (finer === level) stand.lingers[finer] = 0;
        else if (!stand.lingers[finer]) stand.lingers[finer] = now + LINGER * 1000;
        if (finer !== level && (now > stand.lingers[finer]! || pressed())) {
          const root = stand.take(finer);
          if (root) this.drop(root);
        }
      }
    }
    // fetch what is granted and not here, nearest first, once the view has rested on wanting it
    if (this.settled < SETTLE && !this.frozen) return;
    for (const i of order) {
      if (this.fetches >= FETCHES) break;
      const stand = this.stands[i]!;
      const level = stand.granted;
      if (!stand.here || level >= stand.coarsest || stand.levels[level] || stand.fetching[level]) continue;
      // (a camera on its way down the row fetches for where it is going, and for nothing it only passes)
      if (this.cam.travelling && !ahead?.ids.includes(stand.entry.flight.id)) continue;
      if (this.held() + stand.cost[level]! > this.allowance * MIB) continue;
      this.fetches++;
      stand.fetching[level] = true;
      this.fetch(stand, level)
        .then((root) => {
          // (wanted by the time it came? If not it is let go at once: its room is somebody else's now)
          if (stand.granted !== level) {
            stand.fetching[level] = false;
            this.drop(root);
          } else {
            stand.add(level, root, !this.frozen);
            this.dirty = true;
          }
        })
        .catch((e) => {
          console.warn(`a level of detail of ${stand.entry.flight.id} did not arrive, and is done without:`, e);
          stand.fetching[level] = false;
          stand.finest = level + 1; // (not asked for again)
        })
        .finally(() => {
          this.fetches--;
        });
    }
  }

  /** Whether every vehicle is drawn at the level it is granted, with nothing on its way or fading: the picture is as good as it will get. */
  get settledDetail(): boolean {
    return this.fetches === 0 && this.stands.every((s) => !s.here || (s.shown === s.granted && !s.fading));
  }

  /** For tests: the mean brightness of the picture, 0 to 255, drawn again now and read back before the page takes it. */
  mean(): number {
    this.draw();
    const gl = this.renderer.getContext();
    const [w, h] = [gl.drawingBufferWidth, gl.drawingBufferHeight];
    const pixels = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let [sum, n] = [0, 0];
    for (let i = 0; i < pixels.length; i += 4 * 7) {
      sum += pixels[i]! + pixels[i + 1]! + pixels[i + 2]!;
      n += 3;
    }
    return sum / Math.max(1, n);
  }

  /** For the diagnostics readout, and tests: how fast the loop turns over, what a drawn frame costs, each vehicle's level. */
  stats(): { fps: number; drawn: number; ms: number; triangles: number; calls: number; levels: number[]; heldMiB: number } {
    const now = performance.now();
    const seconds = Math.max(1e-3, (now - this.statsAt) / 1000);
    const out = {
      fps: this.frames / seconds,
      drawn: this.drawnFrames / seconds,
      ms: this.frames ? this.work / this.frames : 0,
      triangles: this.renderer.info.render.triangles,
      calls: this.renderer.info.render.calls,
      levels: this.stands.map((s) => s.shown),
      heldMiB: this.held() / MIB,
    };
    this.statsAt = now;
    this.frames = this.drawnFrames = this.work = 0;
    return out;
  }

  /** For tests: where each vehicle stands and at what level. */
  report(): {
    id: string;
    standing: boolean;
    x: number;
    width: number;
    depth: number;
    height: number;
    scale: number;
    shown: number;
    granted: number;
    wanted: number;
  }[] {
    const scale = new THREE.Vector3();
    return this.stands.map((s) => ({
      id: s.entry.flight.id,
      standing: s.standing,
      x: s.group.position.x,
      width: s.size.x,
      depth: s.size.z,
      height: s.height,
      // (how large a metre of it is drawn: 1, or it is not to scale)
      scale: (s.levels[s.shown] ?? s.group).getWorldScale(scale).x,
      shown: s.shown,
      granted: s.granted,
      wanted: s.wanted,
    }));
  }

  /** The people are shown. */
  get scaled(): boolean {
    return this.peopled;
  }
}

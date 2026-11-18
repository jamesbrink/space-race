import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { Setting } from '../backdrops.ts';
import { Bloom } from '../bloom.ts';
import { CloudPass } from '../clouds.ts';
import { ExhaustPass } from '../exhaust.ts';
import type { Staged } from '../lod.ts';
import { INK, InkPass } from '../look.ts';
import { watchContext } from '../lost.ts';
import type { Solids } from '../onfoot/walk.ts';
import { Origin } from '../origin.ts';
import { Outline } from '../outline.ts';
import { drawsLast } from '../overlay.ts';
import { Quality } from '../quality.ts';
import { tier } from '../tier.ts';

/** The glow's threshold in the scene's light at a day's exposure. */
const BLOOM_THRESHOLD = 2.4;
/** The least exposure any day has (daysky.ts: 0.8 x 0.9). */
const DAY_LEAST = 0.72;
/** The exposure over which the ink is darkened with it: above every day's and under sunset's (daysky.ts: 1.6 there). */
const INK_DAY = 1.1;

/**
 * Have the output draw the frame toward what the rods see, by `rods` (0: not at all, and not worked out), where nothing
 * lights it but the night: `land` is a white surface's light under the night's own sky and Moon (scene's units), and what
 * is drawn up to 0.8 of that is the rods', from there to two and a half times it less so, and over it the cones' (the
 * lamps are drawn only some tens of times the night: lamps.ts, so a painted face in the floods is a few times a white one
 * under the stars). It is
 * judged on a pixel's brightest channel, not its luminance, so that what a lamp lights is seen in colour whatever its
 * paint: a red face in the floods has little luminance and much red (a structure lit red and white from over the pad
 * went grey and dark when it was judged on luminance against the land's own fifth). Their luminance
 * from the colour's XYZ (Larson, Rushmeier and Piatko, "A visibility matching tone reproduction operator for high
 * dynamic range scenes", IEEE TVCG 3 (1997) 291: V = Y (1.33 (1 + (Y + Z) / X) - 1.68), over the 2.574 a white's comes
 * to, so a white keeps its brightness), in the blue a white looks in the dark (Hunt's, as Durand and Dorsey give it:
 * 1.05, 0.97, 1.27). How much of the eye is the rods' is the stage's (stage.ts `rods`).
 */
function scotopic(output: OutputPass, rods: { value: number }, land: { value: number }): void {
  const material = output.material;
  const at = '// tone mapping';
  if (!material.fragmentShader.includes(at)) throw new Error('pipeline: the output pass has changed its shader');
  material.fragmentShader = material.fragmentShader
    .replace('uniform sampler2D tDiffuse;', 'uniform sampler2D tDiffuse;\nuniform float uRods, uRodsLand;')
    .replace(
      at,
      `if (uRods > 0.0) {
        vec3 xyz = mat3(0.4124, 0.2126, 0.0193, 0.3576, 0.7152, 0.1192, 0.1805, 0.0722, 0.9505) * max(gl_FragColor.rgb, vec3(0.0));
        float v = xyz.y * (1.33 * (1.0 + (xyz.y + xyz.z) / max(xyz.x, 1e-6)) - 1.68) / 2.574;
        vec3 c = max(gl_FragColor.rgb, vec3(0.0));
        float rods = uRods * (1.0 - smoothstep(0.8, 2.5, max(c.r, max(c.g, c.b)) / uRodsLand));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, max(v, 0.0) * vec3(1.05, 0.97, 1.27), rods);
      }
      ${at}`,
    );
  material.uniforms.uRods = rods;
  material.uniforms.uRodsLand = land;
  material.needsUpdate = true;
}

/** The nearest the orbiting camera's near plane ever comes, metres (the eye itself stops 5 cm short of a surface: camera/maths.ts NEAREST). */
const NEAR_LEAST = 0.03;
/** Seconds the near plane takes to go most of the way out to where it may stand (`fitDepth`); it comes in at once. */
const NEAR_EASE = 0.25;
/** Metres: taller than anything that grows at a site (flora.ts: the tallest palm), for a near plane fitted from well above it. */
const CANOPY = 30;
/** Metres from where a parachute is made fast within which all of it is (the main's lines and canopy, with room). */
const CHUTE_REACH = 60;

/**
 * The renderer for a stage's canvas, as every stage draws: tone-mapped, shadows drawn only when asked for, clipping
 * for the cutaway, counted per frame drawn. A context the browser takes away (a phone short of memory) stops the
 * loop and says so (`lost`): never a dead page, never a reload by itself (lost.ts).
 */
export function makeRenderer(canvas: HTMLCanvasElement, lost: () => void): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // nothing that casts a shadow moves by itself: the map is redrawn when something is changed
  renderer.shadowMap.autoUpdate = false;
  renderer.localClippingEnabled = true;
  renderer.info.autoReset = false; // counted per frame drawn, across every pass (stats())
  watchContext(canvas, () => {
    lost();
    renderer.setAnimationLoop(null);
  });
  return renderer;
}

/** What the near plane asks of the scene (`Pipeline.fitDepth`): where the things that may stand nearest are. */
export interface DepthScene {
  /** The bounds of the models on show (a vehicle in flight left out). */
  readonly bounds: THREE.Sphere;
  frozen(): boolean;
  /** What the camera turns about. */
  pivot(): THREE.Vector3;
  setting(): Setting;
  /** The terrain's height under the models' zero. */
  grade(): number;
  /** The flown vehicle while it is off its pad; null on the pad or with nothing that flies. */
  flying(): Staged | null;
  /** What it has shed, each in its holder, and its parachutes. */
  shed(): readonly { holder: THREE.Object3D }[];
  chutes(): readonly { group: THREE.Object3D }[] | null;
  /** The walker's solids (walk.ts), and every root that is solid now. */
  solids(): Solids;
  solidRoots(): THREE.Object3D[];
  /** A geometry with no hierarchy yet: one is owed, made in time to spare (`Picker.growTrees`, stage/picker.ts). */
  owe(geometry: THREE.BufferGeometry): void;
}

/** What the pipeline is given by the stage it draws for. */
export interface PipelineHost {
  /** The setting's sky as the stage opens (`setBackdrop` changes it). */
  backdrop: { scene: THREE.Scene; camera: THREE.Camera };
  /** What is drawn without depth and may stand in front of cloud (read live: clouds.ts `veils`). */
  veils: THREE.Object3D[];
  /** What hides a part from the outline although it writes no depth (outline.ts). */
  screens: () => readonly THREE.Object3D[];
  /** The cutaway's planes, in the scene's frame. */
  cutPlanes: readonly THREE.Plane[];
  /** `?plain`: everything the old way, for measuring the new against it (tools/bench.mjs). */
  plain: boolean;
  /** Something on show has changed: the next frame is drawn. */
  redraw: () => void;
  depth: DepthScene;
}

/**
 * A stage's frame, from the scene to the screen: the passes (the sky, the scene, the clouds' depth, the ink, the fire
 * and smoke, the clouds, the outline, the glow, the output, and over that what is drawn last: overlay.ts `drawLast`),
 * drawn from the eye (origin.ts); the drawing's resolution and the net under the frame rate; the near and far planes fitted to what is
 * there (`fitDepth`); and the counts the diagnostics read.
 */
export class Pipeline {
  readonly composer: EffectComposer;
  /** The buffer the scene is drawn into: multisampled, with the frame's depth. */
  readonly frameTarget: THREE.WebGLRenderTarget;
  /** The cumulus, marched through and laid over the frame (clouds.ts). */
  readonly clouds: CloudPass;
  /** Draws the scene from the eye (origin.ts): the GPU sees only eye-relative positions; everything the code reads stays where it is. */
  readonly origin: Origin;
  readonly backdropPass: RenderPass;
  readonly outline: Outline;
  readonly ink = new InkPass();
  /** The glow (bloom.ts): strength, radius and threshold as three's pass had them. */
  readonly bloom = new Bloom(0.14, 0.6, BLOOM_THRESHOLD);
  /** How much of the eye is the rods' (`night`), and the land's light under the sky alone: the frame is drawn toward what they see. */
  private readonly rods = { value: 0 };
  private readonly land = { value: 1 };
  private bloomWas: UnrealBloomPass | null = null;
  /** The net under the frame rate: the drawing's resolution, lowered only while the machine cannot keep up (quality.ts). */
  readonly quality = new Quality();
  /** Frames drawn one after another, and the share of full resolution the canvas is at now. */
  private run = 0;
  private pixelScale = 1;
  private nextScale = 1;
  private resized = true;
  private frameAt = 0;
  /** What the stars were last sized for: a pixel ratio, in a sky (their points are sized in the drawing's pixels). */
  private starsFor: { ratio: number; sky: THREE.Scene | null } = { ratio: 0, sky: null };
  private frames = 0;
  /** Frames drawn since the stage was made (a still view is not drawn again). */
  drawn = 0;
  private work = 0;
  private statsAt = performance.now();

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly h: PipelineHost,
  ) {
    // Multisampled HDR target: trusses are all thin bright lines against a plain background.
    // The depth texture is explicit: left to its default the target gets 16 bits of depth, which
    // cannot tell concrete from the ground 6 cm under it across the pad. 24 bits can.
    const target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: 4,
      depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedIntType),
    });
    this.composer = new EffectComposer(this.renderer, target);
    // The composer's other buffer is a copy of that one: multisampled, with its own depth. Only the ink pass ever
    // draws into it (one quad, in the cel look), after which the two changed places, so the scene was drawn into
    // each in turn and both had to be whole. It is a plain texture here, and the two are put back after each frame
    // (`draw`): the scene is always drawn into `target`, and a second multisampled frame with its depth is never made.
    this.frameTarget = target;
    this.composer.renderTarget2.dispose();
    this.composer.renderTarget2 = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
    this.composer.readBuffer = target;
    this.composer.writeBuffer = this.composer.renderTarget2;
    this.backdropPass = new RenderPass(h.backdrop.scene, h.backdrop.camera);
    this.composer.addPass(this.backdropPass);
    const main = new RenderPass(scene, this.camera);
    main.clear = false;
    main.clearDepth = true;
    this.composer.addPass(main);
    this.clouds = new CloudPass(scene, this.camera);
    this.clouds.veils = h.veils; // (read live: panes arrive as each level of detail does)
    this.composer.addPass(this.clouds.mark); // the scene's depth, for the clouds laid over after the ink
    this.ink.enabled = false; // straight after the scene, while the frame's depth is still the scene's
    this.composer.addPass(this.ink);
    this.composer.addPass(new ExhaustPass(scene, this.camera, this.clouds)); // the engine's fire and its smoke, marched (exhaust.ts): over the ink, under the clouds and the bloom
    this.composer.addPass(this.clouds);
    // (the frame's depth says where a part is hidden; glass and what the cutaway has opened are not in it)
    this.outline = new Outline(scene, this.camera, () => this.clouds.mark.texture, h.screens);
    this.outline.edgeStrength = 3;
    this.outline.edgeThickness = 1;
    this.outline.edgeGlow = 0.4;
    this.outline.visibleEdgeColor.set(0xffc46b);
    this.outline.hiddenEdgeColor.set(0x9a7434); // dimmer than the visible edge, but still an outline
    this.composer.addPass(this.outline);
    this.composer.addPass(this.bloom);
    const output = new OutputPass();
    this.clouds.adopt(output); // (the clouds are laid over the frame as it goes to the screen)
    this.bloom.adopt(output); // (and the glow added under them, in the same pass)
    scotopic(output, this.rods, this.land); // (and, by night, what the rods make of it all: after the glow and the clouds, before the tone mapping)
    if (h.plain) this.bloomOld = true;
    this.composer.addPass(output);
    // (and over all of it, as it goes to the canvas, what is no part of the frame: a parachute's lines, the predicted path,
    // hidden by the scene's depth and the cloud in front of them: overlay.ts `drawLast`)
    drawsLast(
      output,
      scene,
      this.camera,
      () => this.clouds.mark.texture,
      () => this.clouds.laid(),
    );
    // (the lights with a shadow and the sky's light are handed over as the stage makes them: `origin.light`)
    this.origin = new Origin(this.renderer, scene, this.camera, h.cutPlanes);
  }

  /**
   * The glow the old way, for measuring the new against it (`?plain` sets it): three's own pass, at the drawing
   * buffer's size with its blurs in texels, blended over the multisampled frame. Made the first time it is asked for.
   */
  get bloomOld(): boolean {
    return this.bloomWas?.enabled ?? false;
  }

  set bloomOld(on: boolean) {
    if (on && !this.bloomWas) {
      this.bloomWas = new UnrealBloomPass(new THREE.Vector2(1, 1), this.bloom.strength, this.bloom.radius, this.bloom.threshold);
      this.composer.insertPass(this.bloomWas, this.composer.passes.indexOf(this.bloom));
      const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
      this.bloomWas.setSize(size.x, size.y);
    }
    if (this.bloomWas) this.bloomWas.enabled = on;
    this.bloom.enabled = !on;
    this.h.redraw();
  }

  /**
   * The frame is to go to the screen at this exposure, with this much of the eye the rods' (0 by day, 1 deep in the
   * night): what is set by the exposure in the scene's own light follows it. The glow's threshold is the scene's light
   * and was set for the day's exposure: under any day's (`DAY_LEAST`) it is raised by as much, so what glows to an eye
   * among floodlights is what glows by day. The ink is a colour in the scene's light and was set for the day: as the
   * night's exposure goes over twilight's (`INK_DAY`) it is taken down by as much, and where what is under it is darker
   * still it is a share of that (`uInkUnder`), so it never stands lighter than the land it is drawn on.
   */
  night(exposure: number, rods: number, land: number, outdoors = 1): void {
    this.bloom.threshold = BLOOM_THRESHOLD * Math.max(1, DAY_LEAST / exposure);
    const u = this.ink.uniforms;
    // (indoors the room's exposure is the day's look of a lit room, and its ink is as it was: `outdoors` 0)
    const inkAt = INK_DAY + (Math.max(exposure, INK_DAY) - INK_DAY) * outdoors;
    (u.uInk!.value as THREE.Color).copy(INK).multiplyScalar(Math.min(1, INK_DAY / inkAt));
    u.uInkUnder!.value = Math.exp(THREE.MathUtils.lerp(Math.log(1e6), Math.log(0.45), THREE.MathUtils.smoothstep(inkAt, INK_DAY, 3)));
    this.rods.value = rods;
    this.land.value = Math.max(land, 1e-9);
  }

  /** The setting's sky is drawn first, a scene of its own: another setting, another sky. */
  setBackdrop(backdrop: { scene: THREE.Scene; camera: THREE.Camera }): void {
    this.backdropPass.scene = backdrop.scene;
    this.backdropPass.camera = backdrop.camera;
  }

  /**
   * The drawing's pixels for the canvas as it is: the screen's own, up to two a CSS pixel, times what the net under the
   * frame rate allows (quality.ts: 1 on a machine that keeps up). The canvas keeps its place and size on the page.
   */
  resize(): void {
    this.resized = true;
    this.h.redraw();
  }

  private fitPixels(scale: number): void {
    const canvas = this.renderer.domElement;
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    if (!w || !h) return;
    // a phone's GPU has four times the pixels to fill per inch and a fraction of the power
    const coarse = matchMedia('(pointer: coarse)').matches;
    const full = Math.min(window.devicePixelRatio, coarse ? 1.5 : 2, tier().pixelRatio);
    this.quality.setFull(full);
    this.pixelScale = scale;
    this.renderer.setPixelRatio(full * scale);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    this.bloom.fit(w, h);
    this.h.redraw();
  }

  /** The stars are points sized in the drawing's pixels: told when those change, or the sky does, so they keep their size on the screen. */
  sizeStars(sky: THREE.Scene): void {
    const ratio = this.renderer.getPixelRatio();
    if (this.starsFor.ratio === ratio && this.starsFor.sky === sky) return;
    this.starsFor = { ratio, sky };
    sky.traverse((o) => {
      const uniform = ((o as THREE.Points).material as THREE.ShaderMaterial | undefined)?.uniforms?.uPixel;
      if ((o as THREE.Points).isPoints && uniform) uniform.value = ratio;
    });
  }

  /**
   * For the diagnostics readout: how fast the loop is turning over and what a drawn frame costs.
   * `fps` is the loop (what motion would get); `drawn` is how many of those frames were actually
   * drawn, since a still view is not redrawn. `levels`: each model's level of detail.
   */
  stats(levels: number[]): { fps: number; drawn: number; ms: number; triangles: number; calls: number; levels: number[]; scale: number } {
    const now = performance.now();
    const seconds = Math.max(1e-3, (now - this.statsAt) / 1000);
    const out = {
      fps: this.frames / seconds,
      drawn: this.drawn / seconds,
      ms: this.frames ? this.work / this.frames : 0,
      triangles: this.renderer.info.render.triangles,
      calls: this.renderer.info.render.calls,
      levels,
      scale: this.pixelScale,
    };
    this.statsAt = now;
    this.frames = this.drawn = this.work = 0;
    return out;
  }

  /** A turn of the loop is over, begun at `began` (`performance.now()`): counted for the diagnostics. */
  counted(began: number): void {
    this.frames++;
    this.work += performance.now() - began;
  }

  /**
   * The pace of frames drawn one after another is what the net under the frame rate goes by (quality.ts). A view that
   * is still is always drawn at full: the frame after the last one that moved is drawn again at the screen's own
   * pixels, and the lowered resolution comes back only once it has been moving again for a few frames.
   */
  paced(began: number, drew: boolean): void {
    if (!drew) {
      this.run = 0;
      this.quality.idle();
      this.nextScale = 1;
    } else {
      if (this.run > 0 && this.quality.frame(began - this.frameAt, began)) this.run = Math.min(this.run, 3); // (taken up below)
      this.run++;
      if (this.run > 3) this.nextScale = this.quality.scale;
    }
    if (this.nextScale !== this.pixelScale) this.h.redraw();
    this.frameAt = began;
  }

  /** A frame is to be drawn: the ink's depth range taken from the camera, and the renderer's counts begun again. */
  begin(): void {
    // Resizing clears the WebGL canvas. Do it only when a replacement picture will be drawn in this callback.
    if (this.resized || this.nextScale !== this.pixelScale) {
      this.resized = false;
      this.fitPixels(this.nextScale);
    }
    this.ink.range(this.camera);
    this.renderer.info.reset();
    this.drawn++;
  }

  /** Draw the frame through every pass, from the eye. */
  draw(sinceDrawn: number, frozen: boolean): void {
    // (a frozen stage keeps nothing of an earlier frame: the clouds' blend with their last frames is the one thing that would)
    (this.clouds as { frozen?: boolean }).frozen = frozen;
    this.bloom.before();
    this.origin.draw(() => this.composer.render(sinceDrawn));
    if (this.composer.readBuffer !== this.frameTarget) this.composer.swapBuffers(); // (the ink pass changed them over: see the constructor)
  }

  /**
   * Keep the near plane as far out as what is there allows, every frame, whatever the rig. Depth precision at
   * distance d is about d² / (near × 2²⁴): with a fixed 5 cm near plane, faces 3 mm apart fight from across the pad,
   * and with one 15 m out the pad's slab and the ground under it, 12 cm apart, fight from 20 km up. So the plane
   * stands at half the way to the nearest thing drawn in the scene's depth, and that is asked of what is there, not
   * guessed from what the camera turns about (it was a quarter of the pivot's distance, and a free camera's pivot is
   * a point just in front of the lens): the ground or the sea under the eye; the flown vehicle, what it has shed and
   * its parachutes; and every solid thing and plant (`uncut`). Twenty kilometres over the site with nothing nearer
   * than the ground that is a plane kilometres out and depth steps of centimetres down there. It comes in at once
   * (nothing is ever cut) and goes out over a moment (`NEAR_EASE`: it never steps); a frozen stage has it at once.
   */
  fitDepth(dt: number): void {
    const d = this.h.depth;
    const setting = d.setting();
    const bounds = d.bounds;
    const eye = this.camera.position;
    const toCentre = eye.distanceTo(bounds.center);
    const toTarget = eye.distanceTo(d.pivot());
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * Math.hypot(1, this.camera.aspect);
    const corner = Math.hypot(1, tan);
    let near = Number.POSITIVE_INFINITY;
    let plants = true;
    // (beyond the site there is no ground at the camera's feet to keep in view)
    if (setting.floor && Math.hypot(eye.x, eye.z) <= (setting.reach ?? Infinity)) {
      // Never past the ground at the camera's feet. The nearest ground in view is at the corner of the frame, no
      // nearer along the view than the camera's height times the cosine of the frame's half-diagonal; a near plane
      // beyond that slices the foreground away. From well above, what grows on the ground is counted with it (the
      // tallest palm is under `CANOPY`), and the plants are not asked one by one.
      let height = eye.y - d.grade();
      if (height > 4 * CANOPY) {
        height -= CANOPY;
        plants = false;
      }
      near = Math.min(near, (0.9 * height) / corner);
    }
    // beyond the site's ground the globe's sea is under the camera instead, and it is seen out to its horizon
    const globe = setting.globe;
    if (globe?.mesh.visible) near = Math.min(near, (0.9 * globe.altitude(eye)) / corner);
    let far = Math.max(toCentre + bounds.radius + (setting.horizon ?? 10), globe?.reach(eye) ?? 0);
    // a vehicle in flight is seen as far off as it is, and the near plane is never beyond it
    const flier = d.flying();
    if (flier) {
      const to = eye.distanceTo(flier.sphere.center);
      // (with room to spare: the far plane is only moved when it is 2 % out, and a vehicle going away from a camera that
      // stands still, the pad camera's, would otherwise be beyond it between one move and the next)
      far = Math.max(far, 1.05 * (to + flier.sphere.radius));
      near = Math.min(near, Math.max(NEAR_LEAST, 0.5 * (to - flier.sphere.radius), 0.01 * toTarget));
      // ...nor beyond what it has shed, which is no longer part of it, nor a parachute (reshaped as it fills: its
      // bounds as made say nothing, so it is taken as everything within its lines' length of where it is made fast)
      const box = this.depthBox;
      const at = this.depthAt;
      for (const shed of d.shed()) near = Math.min(near, (0.5 * box.setFromObject(shed.holder).distanceToPoint(eye)) / corner);
      for (const chute of d.chutes() ?? [])
        if (chute.group.visible)
          near = Math.min(near, (0.5 * Math.max(0, chute.group.getWorldPosition(at).distanceTo(eye) - CHUTE_REACH)) / corner);
    }
    // (a setting with no ground and no sea, a studio: the models are all there is, and are asked below)
    if (near === Number.POSITIVE_INFINITY) near = Math.max(NEAR_LEAST, 0.5 * (toCentre - bounds.radius), 0.01 * toTarget);
    near = this.uncut(Math.max(NEAR_LEAST, near), plants);
    // in at once, out over a moment
    const was = this.nearEased;
    if (!(near > was) || d.frozen() || !(dt > 0)) this.nearEased = near;
    else this.nearEased = Math.min(near, was * (near / was) ** (1 - Math.exp(-dt / NEAR_EASE)));
    near = this.nearEased;
    if (Math.abs(near - this.camera.near) > near * 0.02 || Math.abs(far - this.camera.far) > far * 0.02) {
      this.camera.near = near;
      this.camera.far = far;
      this.camera.updateProjectionMatrix();
    }
  }

  private nearEased = NEAR_LEAST;
  private readonly depthBox = new THREE.Box3();
  private readonly depthAt = new THREE.Vector3();

  /**
   * The near plane brought in, if it must be, so that it cuts nothing: `near` is where the view's subject and the
   * ground would let it be, which knows nothing of what stands between (orbiting the pad from 150 m it was 19 m out,
   * and the other pad's gantry, 15 m in front of the eye, was sliced away). So the nearest surface of anything solid
   * is asked for (the walker's `Solids`: every model as posed and the place round them, exactly, by their hierarchies),
   * and the plants, which are not solid, are asked for where they stand (`Setting.plantsClear`). The plane's corner, not its middle, is what must stay short of the thing. Depth resolution is spent only
   * where something really is that near, which is where it was being cut.
   */
  private uncut(near: number, plants = true): number {
    if (near <= NEAR_LEAST) return near;
    const d = this.h.depth;
    const frozen = d.frozen();
    const eye = this.camera.position;
    // (a still eye is asked again only a few times a second, for what may have moved toward it)
    const kept = this.uncutKept;
    const now = performance.now();
    if (!frozen && kept.eye.equals(eye) && kept.asked >= near && now - kept.at < 250) return Math.min(near, kept.near);
    const corner = Math.hypot(1, Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * Math.hypot(1, this.camera.aspect));
    // (the plane at half the way to the nearest thing: so things are looked for twice as far as its corner reaches)
    const reach = 2 * near * corner;
    let clear = reach;
    if (plants) clear = d.setting().plantsClear?.(eye, clear) ?? clear;
    const solids = d.solids();
    solids.set(d.solidRoots());
    // (what has no hierarchy yet is taken as its box and its hierarchy is owed, made in time to spare: `growTrees`. Made
    // here, the capsule's were made in the frame it left its booster, as the chase view came in on it: 26 ms. A frozen
    // stage makes them at once: a frame of it owes nothing to when it is drawn, and a box given way to its hierarchy some
    // frames later moved the near plane and with it 149 pixels along the pad's lines, test:frozen's "thrown")
    solids.gather(eye, clear, clear, clear, frozen);
    for (const geometry of solids.wanted) d.owe(geometry);
    solids.wanted.clear();
    clear = solids.clear(eye, clear);
    const fitted = clear >= reach ? near : Math.max(NEAR_LEAST, (0.5 * clear) / corner);
    kept.eye.copy(eye);
    kept.asked = near;
    kept.near = clear >= reach ? Number.POSITIVE_INFINITY : fitted;
    kept.at = now;
    return fitted;
  }

  private readonly uncutKept = { eye: new THREE.Vector3(Number.NaN), asked: 0, near: 0, at: 0 };
}

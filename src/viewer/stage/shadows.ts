import * as THREE from 'three';
import type { Setting } from '../backdrops.ts';
import type { Cameras } from '../camera/index.ts';
import { ABOUT_PLACE } from '../camera/rig.ts';
import { ShadowCache } from '../shadowcache.ts';
import { BAND, depthBias, FarShadow } from '../shadows.ts';
import { tier } from '../tier.ts';

const UP = new THREE.Vector3(0, 1, 0);
/** While walking: half the width of ground the shadow map covers round the walker, metres (a texel is then a little over a centimetre). */
const WALK_SHADOW = 26;
/** Texels along a side of the Sun's shadow map, as the orbiting views use it. */
const SHADOW_MAP = tier().shadow.fine;
/** In the gallery, the most steps of a root of two down from the section's reach the fine shadow map is spent on (Shadows.focusWanted): ten, a 32nd (0.6 m of a Gemini-Titan's). */
const FOCUS_LEVELS = 10;
/** Seconds the fine map takes to fade out, or in, when it is spent somewhere else (Shadows.steerFocus). */
const FOCUS_FADE = 0.25;
/** Seconds a new place for it must be wanted, the camera at rest, before it goes there. */
const FOCUS_HOLD = 0.15;
/** Where the gallery's fine shadow map is spent (Shadows.shadowFocus). */
type Focus = { centre: THREE.Vector3; half: number; level: number };

/** What the Sun's shadows are given by the stage that casts them. */
export interface ShadowsHost {
  readonly renderer: THREE.WebGLRenderer;
  readonly camera: THREE.PerspectiveCamera;
  readonly cam: Cameras;
  /** The bounds of the models on show. */
  readonly bounds: THREE.Sphere;
  /** `?plain`: no cache of the still casters on foot (tools/bench.mjs). */
  readonly plain: boolean;
  setting(): Setting;
  /** The stage shows an exhibit (the gallery's). */
  exhibit(): boolean;
  frozen(): boolean;
  redraw(): void;
  /** Hardware has moved: its shadows are drawn again in the same frame. */
  oweShadows(): void;
  /** What stands at the place, for the far map (every model where it stands, not one in flight, and the place round them). */
  cover(): THREE.Box3 | null;
  /** The section's model as it stands and fully taken apart, together; null with none. */
  section(): THREE.Box3 | null;
  /** Measure what is on show again (`bounds`). */
  fitBounds(): void;
  /** The box round the seated model's cabin, a metre added all round; null if there is none. */
  cabin(): THREE.Box3 | null;
  /** Where the walker's feet are. */
  walker(): THREE.Vector3;
  /** The vehicle a rig about it is with (or what it shed, while that is followed): its middle in its own frame, and that frame. */
  craft(): { centre: THREE.Vector3; matrix: THREE.Matrix4 } | null;
  /** Something on foot is moving more than the figure where it stands (limp, driving, getting in): the still casters' cache waits. */
  busy(): boolean;
}

/**
 * The Sun's shadows (shadows.ts has the far map itself): the fine map, spent on the section at a site, on what is
 * looked at closely in the gallery, round the walker on foot and on the vehicle while a rig is with it; its maps by
 * size; the far map under it; and on foot the cache of the still casters.
 */
export class Shadows {
  readonly sun = new THREE.DirectionalLight(0xffffff, 4);

  /** The Sun's shadow maps, by their size in texels a side (`shadowGrain`). */
  private readonly shadowMaps = new Map<number, THREE.WebGLRenderTarget>();

  /** The Sun's second shadow map: everything that stands at the place, coarsely (shadows.ts). */
  readonly far: FarShadow;

  /** On foot, the fine map's still casters kept from one frame to the next, and only the figure drawn again (shadowcache.ts). */
  readonly shadowCache: ShadowCache;

  /** When the last walk ended (`performance.now()`), until the maps it used have been let go; 0: nothing is owed. */
  walkEnded = 0;

  /** How far up its line the Sun's light stands from what it is aimed at, as last fitted (shadeCraft keeps it to the bit). */
  private readonly sunBack = new THREE.Vector3();

  constructor(private readonly h: ShadowsHost) {
    this.sun.castShadow = true;
    this.shadowGrain(SHADOW_MAP, 1);
    this.sun.shadow.bias = -0.0002;
    this.sun.shadow.normalBias = 0.012;
    // the whole place has shadows, under the fine map (shadows.ts): its light comes after the Sun and gives none
    this.far = new FarShadow(h.renderer, this.sun, () => h.cover());
    // (not while he is limp, driving or getting in: what moves then is more than the figure where it stands)
    this.shadowCache = new ShadowCache(
      h.renderer,
      this.sun,
      () => this.far.waiting || this.far.light.shadow.needsUpdate || this.far.sky.shadow.needsUpdate || h.busy(),
      () => this.far.nearOnly(),
    );
    if (h.plain || !tier().walkCache) this.shadowCache.enabled = false; // (the lighter tier holds no second fine map: tier.ts)
  }

  /**
   * As a frame is drawn (`walking`: the figure walked as, or null): the cache of the still casters is told who moves,
   * the maps only a walk uses are let go a while after it, and the far map is drawn if it is owed (shadows.ts).
   */
  before(walking: THREE.Object3D | null, frozen: boolean): void {
    this.shadowCache.figure = walking;
    if (walking) this.walkEnded = 0;
    else if (this.walkEnded && performance.now() - this.walkEnded > (tier().lighter ? 2_000 : 30_000)) this.freeWalkShadows();
    this.far.before(walking, frozen);
  }

  /** While a rig that is about the vehicle is in charge, the Sun's shadow map goes with the vehicle, so it shades itself all the way up. */
  shadeCraft(): void {
    // (or with the stage that has left, while the view is following that)
    const c = ABOUT_PLACE.has(this.h.cam.rig) ? null : this.h.craft();
    if (!c) return;
    // (put where the vehicle is, not moved by how far it went: a sum of moves is a last bit out, and the map of a
    // vehicle that went and came back would not be the map it had)
    const to = c.centre.clone().applyMatrix4(c.matrix);
    const target = this.sun.target.position;
    if (to.equals(target)) return;
    const back = this.sun.position.sub(target);
    if (this.sunBack.distanceToSquared(back) > 1e-12 * back.lengthSq()) this.sunBack.copy(back);
    target.copy(to);
    this.sun.position.copy(to).add(this.sunBack);
    this.h.oweShadows();
  }

  /**
   * Aim the shadow map, once per section. It is spent on the model being studied and its
   * surroundings, since one map stretched over a whole launch pad gives the rocket sawtooth
   * shadows; and it is sized for that model fully taken apart, so that moving the slider never
   * changes it. (Refitting it as parts moved made every other shadow on the pad shift and
   * change sharpness with the slider.) In the gallery it may be spent closer still (`shadowFocus`).
   */
  fitShadows(): void {
    const box = this.h.section();
    if (!box) return;
    this.h.fitBounds();
    const centre = box.getCenter(new THREE.Vector3());
    const radius = Math.min(
      this.h.bounds.radius,
      box.getSize(new THREE.Vector3()).length() / 2 + Math.max(6, box.getSize(new THREE.Vector3()).length() * 0.5),
    );
    this.sectionFit = { centre: centre.clone(), radius };
    const focus = this.h.exhibit() ? this.shadowFocus : null;
    const half = focus ? focus.half : radius;
    const aim = focus ? focus.centre : centre;
    // (a map spent on a part still reaches back toward the Sun over the whole section, or what stands between it and
    // the Sun would cast nothing into it: its depth runs from beyond the section to past the part)
    const back = focus ? Math.abs(this.h.setting().sunDir.dot(new THREE.Vector3().subVectors(centre, aim))) + radius + 10 : radius + 10;
    this.sun.target.position.copy(aim);
    this.sun.position.copy(aim).addScaledVector(this.h.setting().sunDir, back);
    Object.assign(this.sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: back + half + 10 });
    this.sun.shadow.camera.updateProjectionMatrix();
    this.sun.shadow.normalBias = focus ? Math.max((1.5 * 2 * half) / SHADOW_MAP, half / 900) : Math.max(0.012, radius / 900);
    this.shadowGrain(SHADOW_MAP, this.h.setting().shadowRadius ?? 1);
    depthBias(this.sun.shadow); // (a length, a few texels of the map: not a share of the camera's depth, shadows.ts)
    this.h.renderer.shadowMap.needsUpdate = true;
  }

  /** The section's own fit (`fitShadows`): the middle of its box and how far the map reaches from it. */
  private sectionFit: { centre: THREE.Vector3; radius: number } | null = null;

  /**
   * In the gallery, where the fine shadow map is spent now when that is not the whole section: a square `half` metres
   * from the middle across the light, `level` steps of a root of two down from the section's reach. Null: the whole section.
   */
  private shadowFocus: Focus | null = null;

  /** A fit the fine map is fading out to go to (undefined: none), and how long the wish for it has held still. */
  private refocus: Focus | null | undefined = undefined;

  private refocusHeld = 0;

  /** How much of the fine map is read now (1: all of it; under, the far one is read in its place: `uShadowFade`). */
  fineShare = 1;

  /**
   * Where the fine shadow map is to be spent, in the gallery. The far map (shadows.ts) holds the whole exhibit as far
   * apart as it goes, at a centimetre a texel for a 34 m Gemini-Titan; the fine one is spent on what is looked at
   * closely, at the scale it is framed: the cabin while sat in, else a square round the camera's pivot wide enough to
   * hold all that is in view at the pivot's distance, inside the far map's band, in steps of a root of two down from
   * the section's reach (so a slow zoom changes it seldom, and each step is a clear gain). Cut open on the Gemini cabin from 5 m, 2 mm a
   * texel for 8.4. At a site the fine map stays on the section: there the far one is 16 cm a texel, and what stands
   * round a part looked at closely (the gantry, the pad) is in view and would lose its shadows' edges.
   */
  private focusWanted(): Focus | null {
    const fit = this.sectionFit;
    if (!this.h.exhibit() || !fit) return null;
    let centre: THREE.Vector3;
    let reach: number;
    if (this.h.cam.rig === 'onboard') {
      const cabin = this.h.cabin();
      if (!cabin) return null;
      centre = cabin.getCenter(new THREE.Vector3());
      reach = cabin.getSize(new THREE.Vector3()).length() / 2;
    } else {
      centre = this.h.cam.pivot.clone();
      const along = this.h.camera.position.distanceTo(centre);
      const tall = along * Math.tan(THREE.MathUtils.degToRad(this.h.camera.fov / 2));
      reach = 1.1 * tall * Math.hypot(1, Math.max(1, this.h.camera.aspect));
    }
    const half = reach / BAND[0];
    // steps of a root of two down from the section's reach: held a little either side of a step, so a resting zoom does not flutter
    const exact = 2 * Math.log2(fit.radius / half);
    const was = this.shadowFocus?.level ?? 0;
    let level = exact > was - 0.2 && exact < was + 1.2 ? was : Math.floor(exact);
    level = Math.min(FOCUS_LEVELS, Math.max(0, level));
    if (level === 0) return null;
    const size = fit.radius / Math.SQRT2 ** level;
    // (held where it is while the pivot stays well inside it; moved, on a grid of an eighth of it)
    if (this.shadowFocus && this.shadowFocus.level === level && this.shadowFocus.centre.distanceTo(centre) < size * 0.2)
      return this.shadowFocus;
    const grid = size / 8;
    centre.set(Math.round(centre.x / grid) * grid, Math.round(centre.y / grid) * grid, Math.round(centre.z / grid) * grid);
    return { centre, half: size, level };
  }

  /**
   * Each frame, in the gallery: take the fine shadow map where it is wanted (`focusWanted`). It is never moved in a
   * cut: it fades out (the far map read in its place, the whole exhibit's grain, as the gallery was before), waits
   * until the camera has stopped and the wish has held still, is fitted again, and fades back in. While the view moves
   * the map does not chase it. A frozen stage (a test) moves it at once.
   */
  steerFocus(dt: number): void {
    if (!this.h.exhibit()) return;
    const want = this.focusWanted();
    const same = (a: Focus | null | undefined, b: Focus | null): boolean =>
      a === b || Boolean(a && b && a.level === b.level && a.centre.equals(b.centre));
    if (this.h.frozen()) {
      if (!same(this.shadowFocus, want)) {
        this.shadowFocus = want;
        this.fitShadows();
      }
      this.refocus = undefined;
      this.fineShare = 1;
      return;
    }
    if (this.refocus === undefined && same(this.shadowFocus, want)) {
      if (this.fineShare < 1) {
        this.fineShare = Math.min(1, this.fineShare + dt / FOCUS_FADE);
        this.h.redraw();
      }
      return;
    }
    // something else is wanted: out first, then (once it holds still, the camera at rest) fitted, and in again
    if (!same(this.refocus, want)) this.refocusHeld = 0;
    this.refocus = want;
    this.refocusHeld += dt;
    if (this.fineShare > 0) {
      this.fineShare = Math.max(0, this.fineShare - dt / FOCUS_FADE);
      this.h.redraw();
      return;
    }
    if (this.refocusHeld < FOCUS_HOLD || this.h.cam.travelling || this.h.cam.handled) return;
    this.shadowFocus = want;
    this.refocus = undefined;
    this.fitShadows();
    this.far.nearOnly(); // (the far map holds the whole exhibit and has not changed)
  }

  /**
   * Give the Sun's shadow map this many texels a side and this much softening of its edges. There is one map for
   * each size asked for (the section's, and the finer one on foot), kept: going on foot and back changes which is
   * in use, and frees and allocates nothing. Whoever changes the size has the map drawn again.
   *
   * The maps are made here, not left to three (WebGLShadowMap makes one where `shadow.map` is null). Its own is a
   * render target with the default colour texture beside the depth: four bytes a texel that nothing reads, 256 MB
   * at 8192 a side. A WebGL render target has to have a colour texture, so this one has the smallest there is, one
   * byte a texel. The depth texture is exactly three's for a PCF shadow: 24 bits (in 32), compared in the lookup,
   * linearly filtered.
   */
  shadowGrain(size: number, radius: number): void {
    const shadow = this.sun.shadow;
    shadow.radius = radius;
    if (shadow.mapSize.x === size && shadow.map) return;
    shadow.mapSize.set(size, size);
    let map = this.shadowMaps.get(size);
    if (!map) {
      map = new THREE.WebGLRenderTarget(size, size, { format: THREE.RedFormat, type: THREE.UnsignedByteType, generateMipmaps: false });
      map.texture.name = 'sun.shadowMapUnread';
      const depth = new THREE.DepthTexture(size, size, THREE.UnsignedIntType);
      depth.name = 'sun.shadowMap';
      depth.format = THREE.DepthFormat;
      depth.compareFunction = THREE.LessEqualCompare;
      depth.minFilter = depth.magFilter = THREE.LinearFilter;
      map.depthTexture = depth;
      this.shadowMaps.set(size, map);
    }
    shadow.map = map;
    // (the lighter tier holds only the one in use, tier.ts: the other is made again when it is next wanted)
    if (tier().oneFineMap)
      for (const [other, unused] of this.shadowMaps) {
        if (unused === map) continue;
        unused.depthTexture?.dispose();
        unused.dispose();
        this.shadowMaps.delete(other);
      }
  }

  /**
   * Half a minute after a walk: the maps only a walk uses are let go, the fine one (8192 a side is a quarter of a
   * gigabyte) and the still casters' copy of it. The next walk makes them again in its first frame.
   */
  private freeWalkShadows(): void {
    this.walkEnded = 0;
    this.shadowCache.release();
    for (const [size, map] of this.shadowMaps) {
      if (size <= SHADOW_MAP || this.sun.shadow.map === map) continue;
      map.depthTexture?.dispose();
      map.dispose();
      this.shadowMaps.delete(size);
    }
  }

  /**
   * How the shadow map is spent on foot. From eye height a wall two metres off that the Sun
   * grazes shows every texel of the map as a tooth along a shadow's edge, so the map is made as
   * fine as the machine allows: 8192 a side over 52 m of ground (6 mm a texel) where the GPU
   * takes a texture that size and is not a phone's, and otherwise the usual 4096 over a smaller
   * 36 m (9 mm), or on the lighter tier 3072 over the same 36 m (12 mm: tier.ts); and its edges
   * are softened by a texel or two either way.
   */
  private walkShadow(): { half: number; size: number; radius: number } {
    const most = tier().shadow.walk; // (the lighter tier's is the smaller map: tier.ts)
    const big = most >= 8192 && this.h.renderer.capabilities.maxTextureSize >= 8192 && !matchMedia('(pointer: coarse)').matches;
    return big ? { half: WALK_SHADOW, size: 8192, radius: 1.5 } : { half: 18, size: Math.min(most, 4096), radius: 2 };
  }

  /**
   * While walking, the shadow map is spent on the ground round the walker: the section's own fit
   * (fitShadows) is a few metres round where the figure started, and a figure walked out of it
   * had no shadow at all. The map moves in steps of whole texels, in the light's own frame, so
   * that a shadow's edge does not crawl as he walks; and it reaches up the Sun's line far enough
   * for whatever stands over him to shade him.
   */
  fitWalkShadows(force = false): void {
    const p = this.h.walker();
    const shadow = this.sun.shadow;
    const { half, size, radius } = this.walkShadow();
    // It goes with the walker a metre at a time (in whole texels, below), not in leaps: it is drawn again every frame
    // he moves anyway, for his own shadow, and where it hands over to the far map (shadows.ts) must not jump.
    if (!force && this.sun.target.position.distanceTo(p) < 1) return;
    this.shadowGrain(size, radius);
    const dir = this.h.setting().sunDir;
    const right = new THREE.Vector3().crossVectors(UP, dir).normalize();
    const up = new THREE.Vector3().crossVectors(dir, right);
    const texel = (2 * half) / shadow.mapSize.x;
    const snap = (v: number) => Math.round(v / texel) * texel;
    const centre = new THREE.Vector3()
      .addScaledVector(right, snap(p.dot(right)))
      .addScaledVector(up, snap(p.dot(up)))
      .addScaledVector(dir, p.dot(dir));
    const back = Math.min(400, this.h.bounds.radius + 20);
    this.sun.target.position.copy(centre);
    this.sun.position.copy(centre).addScaledVector(dir, back);
    Object.assign(shadow.camera, {
      left: -half,
      right: half,
      top: half,
      bottom: -half,
      near: 1,
      far: back + half + 20,
    });
    shadow.camera.updateProjectionMatrix();
    shadow.normalBias = Math.max(0.012, half / 900);
    depthBias(shadow);
    this.far.nearOnly(); // (the fine map is moved: the far one stays where it is)
  }
}

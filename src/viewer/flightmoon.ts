import * as THREE from 'three';
import { RSPHERE } from '../sim/core/gravity.ts';
import { SUN } from '../world/bodies.ts';
import { type EarthFrame, sinceLiftoff } from '../world/earthframe.ts';
import { ephemerisOf, moonPosition, stateOf, sunPosition } from '../world/ephemeris.ts';
import { ecefToSite, ecefToSiteDirection, inertialToJ2000, type Mat3, rotate, type Site, scale, sub, type Vec3 } from '../world/frames.ts';
import { LUNAR_SITES, type LunarSite } from '../world/lunar-terrain.ts';
import { lunarGround } from './lunar/ground.ts';
import { meanEarthAxes, MOON_RADIUS } from '../world/moon.ts';
import { MoonBody, type MoonDetail, type PlaneMeta } from './moon.ts';
import { LandingApron } from './moonsite.ts';

/**
 * The Moon in a flight's scene: the front page's body (viewer/moon.ts `MoonBody`) where the ephemeris has it at the
 * clock's instant, turned as the Moon was turned, lit by the Sun, from a dot beside the Earth to the ground under a
 * spacecraft 15 km over a landing site. It knows no flight: it is given the site's frame, the frame the flight is flown
 * in, and each frame the instant and the eye.
 *
 * **Where it is.** Its centre is the place the flight's gravity takes it to be (sim/core/gravity.ts: DE440's geometric
 * place where it is loaded and covers the date, Meeus's of date otherwise), put over the turning Earth and into the
 * site's frame as the vehicle is (viewer/ascent.ts: `EarthFrame.toFixed`, then `ecefToSite`), so a spacecraft the run
 * has passing 110 km over it is drawn 110 km over it. Its axes are its mean-Earth frame (world/moon.ts
 * `meanEarthAxes`: DE440's principal axes turned to the frame its maps and landing sites are in), so a crater is where
 * it was that day; the shader is handed the turn from that frame to the scene's, and the eye in the Moon's own frame
 * worked out in doubles, so a float never holds 384,000 km and a metre together.
 *
 * **What is drawn of it.** The whole Moon's maps are the front page's (public/front/moon.whole.jpg and moon.colour.jpg,
 * fetched once the eye is out of the air: nothing of the Moon is held on the ground, where the sky's disc is the Moon,
 * heavens.ts). Its rings are about the point under the eye wherever the eye goes (`MoonBody`'s flight mode), on a
 * coarse mesh from beyond 40,000 km and the fine one nearer. Within `DETAIL_WITHIN` of the ground the nearest Apollo
 * landing site's finest map (481 m a texel, 728 km across, baked by tools/front-moon.mjs `--sites`) and its ground
 * (the apron: world/lunar-ground.ts `LandingGround`, LROC's stereo round the LM and SLDEM2015 along the descent) are
 * fetched and faded in; another site's take their place as the eye goes on to be over it.
 *
 * **How it comes in.** As the eye leaves the air (the setting's `space`, from 24 to 48 km up) the body is laid over the
 * sky's disc of the Moon by its alpha, and the disc is let go once it is covered (backdrops.ts), so there is no step.
 * The two are within a few per cent of each other in brightness: the disc's sunlit radiance (heavens.ts, 0.16) and the
 * body's, the Moon's albedo of 0.12 in the Sun's light above the air (0.17).
 *
 * What is simplified: only the six landing sites have maps finer than the whole Moon's 5.3 km a texel, so the far side
 * and the rest of the near side are soft from low orbit; away from a site's apron the eye and the near plane are kept
 * over the Moon's highest ground (`HIGHEST`), not over the ground under them; the Moon casts no shadow on the vehicle
 * (its eclipse of the Sun dims the Sun's light at the eye instead: `sunShown`).
 */

/** The highest ground on the Moon over its 1737.4 km sphere, metres: the near plane and the eye are kept above it where the ground under them is not known in doubles (LOLA's, 10,786 m: Smith et al. 2010). */
const HIGHEST = 10_786;
/** From how far over the ground a landing site's finest maps are fetched, metres: from further, a texel of them is a tenth of a pixel. */
const DETAIL_WITHIN = 4_000_000;
/** How much nearer another site must be than the one on show before its maps are fetched in its place, radians. */
const DETAIL_KEEP = 3 * (Math.PI / 180);
/** The setting's `space` (out of the air) over which the body comes in over the sky's disc. */
const COMES_IN = [0.95, 1] as const;
/**
 * The eye's up is the Moon's vertical within half the guidance computer's sphere of its centre, the Earth's beyond one and a
 * half times it, and turned evenly from the one to the other between (`toward`): at a translunar coast's pace a turn
 * over some eighteen hours.
 */
const UP_FROM = [0.5, 1.5] as const;

const smooth = (x: number, a: number, b: number): number => THREE.MathUtils.smoothstep(x, a, b);

/**
 * A landing site's finest map (its moon.json's `near`: tools/front-moon.mjs `--sites`) and its ground (the landing
 * ground's, fetched once a page for the flight scene and the lunar setting alike: viewer/lunar/ground.ts), as `MoonBody`
 * draws them; null where the site has not been baked, or anything of it could not be fetched.
 */
export async function landingDetail(base: string, id: LunarSite): Promise<MoonDetail | null> {
  const dir = `${base}lunar/`;
  try {
    const [meta, data] = await Promise.all([
      fetch(`${dir}${id}.moon.json`).then((r) => (r.ok ? (r.json() as Promise<{ near: PlaneMeta }>) : null)),
      lunarGround(id),
    ]);
    if (!meta) return null;
    const s = LUNAR_SITES[id];
    return { id, dir, near: meta.near, ground: new LandingApron([s.landing[0]!, s.landing[1]!], s.height, data.ground) };
  } catch {
    return null;
  }
}

export class FlightMoon {
  /** What the stage adds to its scene. */
  readonly group = new THREE.Group();
  /** Its centre in the scene, metres, at the instant `at` was last given. */
  readonly centre = new THREE.Vector3();
  /** Its axes in the scene: north, its mean-Earth frame's +Z. */
  readonly pole = new THREE.Vector3(0, 1, 0);
  readonly radius = MOON_RADIUS;
  /** From the Sun, in the scene (unit): toward it from the Moon. */
  readonly sun = new THREE.Vector3(0, 1, 0);
  private body: MoonBody | null = null;
  /** The turn from the Moon's frame to the scene's, as numbers in doubles (rows: the scene's x, y, z in the Moon's frame). */
  private toScene: Mat3 = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  private sunMe: Vec3 = [1, 0, 0];
  private earthMe: Vec3 = [-1, 0, 0];
  private earthLit = 0;
  private jd = Number.NaN;
  private shown = 0;
  private cel = false;
  private readonly light = new THREE.Color(1, 1, 1);
  /** The landing sites' grounds, made once each when wanted. */
  private readonly details = new Map<string, Promise<MoonDetail | null>>();
  private detailId: string | null = null;
  private gone = false;

  private readonly site: Site;
  private readonly frame: EarthFrame;
  private readonly base: string;
  private readonly lighter: boolean;
  private readonly anisotropy: number;

  /** `base`: where the page's files are (the whole Moon's maps under front/, the sites' under lunar/). */
  constructor(site: Site, frame: EarthFrame, base: string, lighter: boolean, anisotropy: number) {
    this.site = site;
    this.frame = frame;
    this.base = base;
    this.lighter = lighter;
    this.anisotropy = anisotropy;
    this.group.name = 'The Moon';
    this.group.visible = false;
  }

  /** Whether any of it is drawn (it is out of the air and its maps are here). */
  get drawn(): boolean {
    return this.shown > 0 && Boolean(this.body?.ready);
  }

  /** How much of the sky's disc of the Moon it covers: 1 once it is wholly in. */
  get covers(): number {
    return this.body?.ready ? this.shown : 0;
  }

  /** The landing site whose finest maps are drawn or coming, if any. */
  get detail(): string | null {
    return this.body?.detailed ?? null;
  }

  /**
   * Put it where it is at an instant (a Julian date in UT, the clock's), and the Sun and the Earth where they are from it;
   * `space`, how far out of the air the eye is (the setting's), says how much of it is laid over the sky.
   */
  at(jdUT: number, space: number): void {
    this.shown = smooth(space, COMES_IN[0], COMES_IN[1]);
    if (this.shown > 0 && !this.body && !this.gone) {
      this.body = new MoonBody(`${this.base}front/`, this.light, this.lighter, this.anisotropy, true);
      this.body.cel(this.cel);
      this.group.add(this.body.group);
    }
    this.body?.fade(this.body.ready ? this.shown : 0);
    this.group.visible = this.drawn;
    if (jdUT === this.jd) return;
    this.jd = jdUT;
    const frame = this.frame;
    // (the seconds since liftoff to the millisecond, as the frame's own reckoning has them: a Julian date in one double
    // steps by 40 microseconds, and over the turning Earth the Moon goes half a metre in that)
    const t = sinceLiftoff(frame, jdUT);
    const jdTT = frame.jdTT(t);
    // where the flight's gravity has it (core/gravity.ts placeOf): DE440's geometric place, or Meeus's of date
    const jpl = ephemerisOf(jdTT) === 'DE440';
    const moonIcrf = stateOf('moon', jdTT).r;
    const inFrame = jpl ? frame.fromIcrf(moonIcrf) : frame.fromDate(moonPosition(jdTT));
    const c = ecefToSite(this.site, frame.toFixed(inFrame, t));
    this.centre.set(c[0], c[1], c[2]);
    // its axes, each a direction in the ICRF, into the scene
    const axes = meanEarthAxes(jdTT).axes;
    const scene = axes.map((row) => ecefToSiteDirection(this.site, frame.toFixed(frame.fromIcrf(row), t))) as unknown as Mat3;
    // (the columns of the turn into the scene are the Moon's axes there: so its rows, as numbers, are the scene's axes in the Moon's frame)
    this.toScene = [
      [scene[0][0], scene[1][0], scene[2][0]],
      [scene[0][1], scene[1][1], scene[2][1]],
      [scene[0][2], scene[1][2], scene[2][2]],
    ];
    this.pole.set(scene[2][0], scene[2][1], scene[2][2]);
    // the Sun and the Earth from it, in its own frame
    const sunIcrf = jpl ? stateOf('sun', jdTT).r : inertialToJ2000(sunPosition(jdTT), jdTT);
    const moon = jpl ? moonIcrf : inertialToJ2000(moonPosition(jdTT), jdTT);
    const toSun = sub(sunIcrf, moon);
    this.sunMe = rotate(axes, toSun);
    this.earthMe = rotate(axes, scale(moon, -1));
    const s = ecefToSiteDirection(this.site, frame.toFixed(frame.fromIcrf(toSun), t));
    this.sun.set(s[0], s[1], s[2]).normalize();
    // the Earth's phase seen from the Moon: the angle at the Earth between the Sun and the Moon
    const e = sub(sunIcrf, [0, 0, 0]);
    const cos = (e[0] * moon[0] + e[1] * moon[1] + e[2] * moon[2]) / (Math.hypot(...e) * Math.hypot(...moon));
    this.earthLit = (1 + Math.max(-1, Math.min(1, cos))) / 2;
    const m = this.toScene;
    this.body?.turn(new THREE.Matrix3().set(m[0][0], m[0][1], m[0][2], m[1][0], m[1][1], m[1][2], m[2][0], m[2][1], m[2][2]));
  }

  /** A place in the scene, in the Moon's own frame, metres from its centre. */
  private inMoon(p: THREE.Vector3): Vec3 {
    const d: Vec3 = [p.x - this.centre.x, p.y - this.centre.y, p.z - this.centre.z];
    const m = this.toScene;
    // (the turn's inverse is its transpose: the scene's axes in the Moon's frame are its rows)
    return [
      m[0][0] * d[0] + m[1][0] * d[1] + m[2][0] * d[2],
      m[0][1] * d[0] + m[1][1] * d[1] + m[2][1] * d[2],
      m[0][2] * d[0] + m[1][2] * d[1] + m[2][2] * d[2],
    ];
  }

  /**
   * Where the eye is now (after the camera has moved: Stage.attend), and the Sun's light above the air, as the globe is lit
   * by (atmosphere.ts `uAtmSunLight`); `atOnce` (a frozen stage) finishes every fade. True if what is drawn of it changed.
   */
  attend(eye: THREE.Vector3, sunLight: THREE.Vector3 | THREE.Color, atOnce = false): boolean {
    const body = this.body;
    if (!body || this.shown <= 0) return false;
    // (the Sun's light over pi, as the front page gives it: viewer/moon.ts)
    const l = sunLight as { x?: number; r?: number; y?: number; g?: number; z?: number; b?: number };
    this.light.setRGB((l.x ?? l.r ?? 1) / Math.PI, (l.y ?? l.g ?? 1) / Math.PI, (l.z ?? l.b ?? 1) / Math.PI);
    const at = this.inMoon(eye);
    // (a frozen stage: whatever is fading in or out is finished, so a frame drawn again is the same frame)
    const coming = body.place(at, this.sunMe, this.earthMe, this.earthLit, atOnce ? Number.POSITIVE_INFINITY : performance.now());
    this.choose(at);
    return coming;
  }

  /** The landing site nearest the point under the eye, once the eye is near enough for its maps to show (`DETAIL_WITHIN`). */
  private choose(at: Vec3): void {
    const body = this.body!;
    const r = Math.hypot(at[0], at[1], at[2]);
    if (r - MOON_RADIUS > DETAIL_WITHIN) return;
    const under: Vec3 = [at[0] / r, at[1] / r, at[2] / r];
    let best: string | null = null;
    let least = Number.POSITIVE_INFINITY;
    let held = Number.POSITIVE_INFINITY;
    for (const [id, s] of Object.entries(LUNAR_SITES)) {
      const [lat, lon] = s.landing.map((x) => (x * Math.PI) / 180) as [number, number];
      const d = Math.acos(
        Math.min(1, under[0] * Math.cos(lat) * Math.cos(lon) + under[1] * Math.cos(lat) * Math.sin(lon) + under[2] * Math.sin(lat)),
      );
      if (d < least) [best, least] = [id, d];
      if (id === this.detailId) held = d;
    }
    if (!best || best === this.detailId || least > held - DETAIL_KEEP) return;
    this.detailId = best;
    const id = best;
    void this.detailFor(id as LunarSite).then((d) => {
      if (!this.gone && this.detailId === id && d) body.detail(d);
    });
  }

  /** A landing site's finest map and its ground, fetched once (null where it has not been baked). */
  private detailFor(id: LunarSite): Promise<MoonDetail | null> {
    let made = this.details.get(id);
    if (!made) {
      made = landingDetail(this.base, id);
      this.details.set(id, made);
    }
    return made;
  }

  /**
   * A place over the Moon, in the scene: `height` metres over its 1737.4 km sphere at a selenographic latitude and longitude
   * (degrees, the mean-Earth frame), and its east, north and up there. For a debug pose (Stage.moonPose).
   */
  over(
    latitude: number,
    longitude: number,
    height: number,
  ): { at: THREE.Vector3; east: THREE.Vector3; north: THREE.Vector3; up: THREE.Vector3 } {
    const [p, l] = [(latitude * Math.PI) / 180, (longitude * Math.PI) / 180];
    const m = this.toScene;
    const toScene = (v: Vec3): THREE.Vector3 =>
      new THREE.Vector3(
        m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
        m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
        m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
      );
    const up = toScene([Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)]);
    const east = toScene([-Math.sin(l), Math.cos(l), 0]);
    const north = new THREE.Vector3().crossVectors(up, east);
    return {
      at: up
        .clone()
        .multiplyScalar(MOON_RADIUS + height)
        .add(this.centre),
      east,
      north,
      up,
    };
  }

  /** How high a place in the scene is over the Moon's highest ground (`HIGHEST`), metres. */
  altitude(p: THREE.Vector3): number {
    return p.distanceTo(this.centre) - MOON_RADIUS - HIGHEST;
  }

  /** The furthest anything of it is from a place, metres: for the far plane. */
  reach(p: THREE.Vector3): number {
    return p.distanceTo(this.centre) + MOON_RADIUS + HIGHEST;
  }

  /** Straight up from the Moon at a place in the scene. */
  up(p: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    return out.copy(p).sub(this.centre).normalize();
  }

  /**
   * How much of the way from the Earth's vertical to the Moon's a place's up is turned (`UP_FROM`, by the guidance
   * computer's sphere of the Moon: sim/core/gravity.ts `RSPHERE`): 0 far from it, 1 near it.
   */
  toward(p: THREE.Vector3): number {
    // (not yet put anywhere: no instant has been given, and its centre is not the Moon's)
    if (Number.isNaN(this.jd)) return 0;
    const sphere = RSPHERE.value;
    return 1 - smooth(p.distanceTo(this.centre), UP_FROM[0] * sphere, UP_FROM[1] * sphere);
  }

  /**
   * How much of the Sun's disc is seen past the Moon from a place in the scene, 0 to 1: the share of the disc's area the
   * Moon's leaves uncovered (two circles' overlap, from their angular radii and the angle between their middles).
   */
  sunShown(p: THREE.Vector3): number {
    const toMoon = new THREE.Vector3().subVectors(this.centre, p);
    const d = toMoon.length();
    if (d < MOON_RADIUS) return 0;
    const moon = Math.asin(MOON_RADIUS / d);
    // (the Sun is so far that its direction from the Moon and from the eye are the same to a few arcseconds near the Moon)
    const sun = SUN.equatorialRadius.value / 1.496e11;
    const apart = toMoon.normalize().angleTo(this.sun);
    if (apart >= moon + sun) return 1;
    if (apart <= moon - sun) return 0;
    if (apart <= sun - moon) return 1 - (moon * moon) / (sun * sun);
    // the area two discs share (small angles, taken as flat)
    const [r, R, x] = [sun, moon, apart];
    const a = r * r * Math.acos((x * x + r * r - R * R) / (2 * x * r));
    const b = R * R * Math.acos((x * x + R * R - r * r) / (2 * x * R));
    const c = 0.5 * Math.sqrt(Math.max(0, (-x + r + R) * (x + r - R) * (x - r + R) * (x + r + R)));
    return 1 - (a + b - c) / (Math.PI * r * r);
  }

  /**
   * The sunlit Moon's light at a place, as a share of what a white wall square to the Sun would send back (its normal
   * albedo, 0.12, by the share of its face that is lit as seen from there, over the sky it fills): what it lays over the
   * stars and lends the fill (backdrops.ts).
   */
  shine(p: THREE.Vector3): { radius: number; lit: number; phase: number; toward: THREE.Vector3 } {
    const toward = new THREE.Vector3().subVectors(this.centre, p);
    const d = Math.max(toward.length(), MOON_RADIUS * 1.0001);
    toward.normalize();
    // the phase angle at the Moon between the Sun and the eye
    const phase = Math.acos(THREE.MathUtils.clamp(-toward.dot(this.sun), -1, 1));
    return { radius: Math.asin(MOON_RADIUS / d), lit: (1 + Math.cos(phase)) / 2, phase, toward };
  }

  /** The cel look: its light in flat tones. */
  simplify(on: boolean): void {
    this.cel = on;
    this.body?.cel(on);
  }

  /** The camera as it is about to draw: none of it is drawn when it is wholly out of the frame. */
  view(camera: THREE.PerspectiveCamera): void {
    if (!this.body || !this.drawn) return;
    const to = new THREE.Vector3().subVectors(this.centre, camera.position);
    const d = to.length();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const half = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.hypot(1, camera.aspect));
    const size = d > MOON_RADIUS + HIGHEST ? Math.asin((MOON_RADIUS + HIGHEST) / d) : Math.PI;
    this.group.visible = to.normalize().angleTo(forward) < half + size;
  }

  dispose(): void {
    this.gone = true;
    this.body?.dispose();
    this.body = null;
  }
}

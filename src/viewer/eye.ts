import * as THREE from 'three';
import { smoothstep } from '../util/math.ts';
import { NIGHT_LUX } from './daysky.ts';

/**
 * The eye on foot or over a place by night: adapted to what it is looking at, lamps and all.
 *
 * The setting's exposure (daysky.ts) is the eye's for the light of the sky alone, over open ground, which changes with
 * the Sun and the Moon slowly enough for the eye to keep up with it. What the lamps add does not: walk off a floodlit
 * apron and the eye, adapted to the floodlight, sees black, and the land comes up only as it adapts to the dark again.
 * So the light in front of the eye is measured each frame (`Eye.measure`: rays over the view to the ground, each lit by
 * the sky's light and by every lamp's, which is known: no frame is read back), its log-mean taken over the sky's alone
 * gives how many times brighter the view is for the lamps, and the eye follows that over its own times: quickly to
 * more light, slowly to less (`adapt`). That moves the exposure (`factor`), which is otherwise the setting's.
 *
 * Nothing here has a clock of its own: the eye's time is the world's (`dt` times the clock's rate, never less than the
 * frame's), and a frozen stage has the eye settled at once, so a frame drawn twice is the same frame.
 */

/**
 * Seconds for the eye to come most of the way to more light: the rods' light adaptation (Durand and Dorsey,
 * "Interactive tone mapping", Eurographics Workshop on Rendering 2000, section 3.3: τ = 0.4 s for the rods, 0.1 s for
 * the cones; the slower is taken). Documented.
 */
export const LIGHT_SECONDS = 0.4;
/**
 * And to less: the cones' pigment coming back after light (Pattanaik, Tumblin, Yee and Greenberg, "Time-dependent
 * visual adaptation for fast realistic image display", SIGGRAPH 2000: τ = 110 s for the cones, 400 s for the rods).
 * The rods' longer return, the last of a full dark adaptation (half an hour: Hecht, Haig and Chase 1937), is not
 * followed. Documented.
 */
export const DARK_SECONDS = 110;
/**
 * How much of each tenfold step in the light in view the eye does not make up, on the scale the scene draws it (the
 * lamps are drawn far dimmer against the night than they are: lamps.ts): a floodlit apron is drawn brighter than the
 * dark round it, but not burned out. Estimated: chosen so the floodlit concrete at Complex 5 by night reads as it does
 * at dusk.
 */
export const VIEW_KEEP = 0.45;

/** Toward `target` from `state` (both the log of a level) over `dt` seconds of the eye's time: brighter fast, darker slow. */
export function adapt(state: number, target: number, dt: number): number {
  const seconds = target > state ? LIGHT_SECONDS : DARK_SECONDS;
  return target + (state - target) * Math.exp(-Math.max(dt, 0) / seconds);
}

/** What a lamp is to the eye: where it is, what way it shines, and as three's spotlight falls off. */
export interface Shining {
  position: THREE.Vector3;
  /** Toward where it points (unit). */
  facing: THREE.Vector3;
  intensity: number;
  /** Half the beam's angle, radians, and the share of it given to the soft edge. */
  angle: number;
  penumbra: number;
  /** Three's distance falloff: 1 / d^decay, and to nothing at `distance` (0: never). */
  decay: number;
  distance: number;
}

/** Light from one lamp on a surface at `at` facing `normal` (null: square on to the lamp), as three's spotlight gives it. */
export function shone(lamp: Shining, at: THREE.Vector3, normal: THREE.Vector3 | null): number {
  const dx = lamp.position.x - at.x,
    dy = lamp.position.y - at.y,
    dz = lamp.position.z - at.z;
  const d = Math.hypot(dx, dy, dz);
  if (d < 1e-3 || lamp.intensity <= 0) return 0;
  const toward = -(dx * lamp.facing.x + dy * lamp.facing.y + dz * lamp.facing.z) / d; // cos of the angle off the beam's axis
  const cone = Math.cos(lamp.angle);
  const soft = Math.cos(lamp.angle * (1 - lamp.penumbra));
  const spot = smoothstep(cone, soft, toward);
  if (spot <= 0) return 0;
  let falloff = 1 / Math.max(d ** lamp.decay, 0.01);
  if (lamp.distance > 0) falloff *= Math.max(0, 1 - (d / lamp.distance) ** 4) ** 2;
  const cos = normal ? Math.max(0, (dx * normal.x + dy * normal.y + dz * normal.z) / d) : 1;
  return lamp.intensity * spot * falloff * cos;
}

/** The rays the view is measured along: a grid over the picture, its middle counted most (an eye looks at what is in front of it). */
const GRID: { x: number; y: number; weight: number }[] = [];
for (let i = 0; i < 7; i++)
  for (let j = 0; j < 5; j++) {
    const x = -0.9 + (1.8 * i) / 6,
      y = -0.9 + (1.8 * j) / 4;
    GRID.push({ x, y, weight: Math.exp(-(x * x + y * y) / (2 * 0.45 * 0.45)) });
  }

/** How much of what lights the ground the land gives back toward the eye: as daysky's LAND_REFLECTANCE, which it is beside. */
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Glare: what a lamp in view adds over the whole of it, as a veil over what the eye adapts to. Stiles and Holladay's
 * disability glare, L = 10 E / θ² (cd/m², with E the lamp's light at the eye in lux and θ its angle off the line of
 * sight in degrees, held to at least 1.5): the CIE's formula for the veiling luminance of a glare source. Taken on the
 * scene's own scale.
 */
const GLARE = 10;

export class Eye {
  /** The log of how many times what the eye is adapted to is over the sky's light alone. */
  private level = 0;
  private wanted = 0;
  private readonly ray = new THREE.Vector3();
  private readonly hit = new THREE.Vector3();
  private readonly ahead = new THREE.Vector3();

  /** How many times over the sky's light alone the eye is adapted to (1 with no lamps). */
  get over(): number {
    return Math.exp(this.level);
  }

  /** What the exposure is multiplied by for what the eye is adapted to: 1 with no lamps. */
  get factor(): number {
    return Math.exp(this.level * (VIEW_KEEP - 1));
  }

  /** Where the eye was last asked to go (the log), for a test. */
  get target(): number {
    return this.wanted;
  }

  /**
   * What the view in front of `camera` has over the sky's light alone (a factor, at least 1): `ground` is the sky's
   * light on level ground (scene units, as the lamps' are) at the height `grade`, and `lamps` what shines.
   */
  measure(camera: THREE.PerspectiveCamera, grade: number, ground: number, lamps: readonly Shining[]): number {
    if (!lamps.length || ground <= 0) return 1;
    const eye = camera.position;
    let lit = 0,
      dark = 0,
      weights = 0;
    for (const g of GRID) {
      this.ray.set(g.x, g.y, 0.5).unproject(camera).sub(eye).normalize();
      // (a ray that meets no ground within the lamps' reach sees the sky, or land the lamps do not reach: the sky's light alone)
      let extra = 0;
      if (this.ray.y < -1e-4) {
        const t = (grade - eye.y) / this.ray.y;
        if (t > 0 && t < 2000) {
          this.hit.copy(eye).addScaledVector(this.ray, t);
          for (const lamp of lamps) extra += shone(lamp, this.hit, UP);
        }
      }
      lit += g.weight * Math.log(ground + extra);
      dark += g.weight * Math.log(ground);
      weights += g.weight;
    }
    // the veil over all of it from lamps in view
    camera.getWorldDirection(this.ahead);
    const half = THREE.MathUtils.degToRad(camera.fov / 2) * Math.max(1, camera.aspect);
    let veil = 0;
    for (const lamp of lamps) {
      this.ray.copy(lamp.position).sub(eye);
      const d = this.ray.length();
      if (d < 1e-3) continue;
      const off = this.ray.angleTo(this.ahead);
      if (off > half) continue;
      const at = shone(lamp, eye, null);
      if (at > 0) veil += (GLARE * at) / Math.max(1.5, THREE.MathUtils.radToDeg(off)) ** 2;
    }
    // (the view's log-mean, with the veil over it, against the sky's alone: luminance is light over π, and the land's
    // reflectance is the same in both, so it comes out)
    const mean = Math.exp(lit / weights) + Math.PI * veil;
    return Math.max(1, mean / Math.exp(dark / weights));
  }

  /**
   * A frame's worth of the eye's time toward `over` (what `measure` gave). `atOnce`: settled now (a frozen stage, a jump
   * of the clock, a place just arrived at). True if what the eye is adapted to has changed enough to be drawn again.
   */
  step(over: number, dt: number, atOnce: boolean): boolean {
    this.wanted = Math.log(Math.max(over, 1));
    const was = this.level;
    this.level = atOnce ? this.wanted : adapt(this.level, this.wanted, dt);
    // (nearly there is there: no frames drawn for a thousandth of an exposure, and no eye forever a hair off the sky's)
    if (Math.abs(this.level - this.wanted) < 1e-4) this.level = this.wanted;
    return Math.abs(this.level - was) > 1e-5 || (this.level !== was && this.level === this.wanted);
  }

  /** Back to the sky's light alone, at once (another place, another flight). */
  reset(): void {
    this.level = this.wanted = 0;
  }
}

/**
 * The eye above the air, among things the Sun lights: what it can still see of the stars.
 *
 * Out there the sky is black whatever the hour, and what hides the stars is what else is in view: the sunlit Earth,
 * the vehicle, the Moon, the Sun itself. Each lays a veil over the whole view (Stiles and Holladay's, `GLARE` above:
 * its light at the eye over the square of its angle off the line of sight), and against a ground that bright a point
 * of light is seen only if it is as bright as Hecht's law asks (`faintest`). Both are documented, and taken whole
 * they say that beside a sunlit spacecraft filling a tenth of the frame no star is seen at all, which is what the
 * crews said and what their photographs show. The scene keeps a sky all the same (daysky.ts `starLimit` hands over to
 * this limit as the air thins): of each magnitude the law takes, the picture takes `STAR_KEEP`. Estimated, and the one thing here
 * that is: the stars are faint beside what is lit, fainter the more of the view it fills, and all there (with the
 * Milky Way, heavens.ts) only for an eye looking at nothing lit, once it has had the minutes that takes (`adapt`).
 */

/**
 * The faintest star seen against a ground of luminance `b` (cd/m²), as a visual magnitude: Hecht's threshold for a
 * point of light (S. Hecht, "Visual thresholds of steady point sources of light in fields of brightness from dark to
 * daylight", JOSA 37 (1947) 59), in the units and with the constants A. Crumey gives it ("Human contrast threshold
 * and astronomical visibility", MNRAS 442 (2014) 2600, equation 20: the least illuminance seen, lux, is
 * c (1 + sqrt(K b))², with one c and K for the rods and another for the cones, which meet at 0.01645 cd/m²), and
 * his magnitude for an illuminance (-2.5 log lux - 13.99). 7.93 in the dark. Documented; Crumey shows it is out by up
 * to half a magnitude between a moonlit sky's ground and twilight's, which the share kept of it here (`STAR_KEEP`)
 * makes a tenth of one.
 */
export function faintest(b: number): number {
  const [c, k] = b <= 1.645e-2 ? [1.706e-9, 1.259e3] : [4.808e-8, 1.259e-1];
  return -2.5 * Math.log10(c * (1 + Math.sqrt(k * Math.max(b, 0))) ** 2) - 13.99;
}

/**
 * The sky's own ground above the air, cd/m²: the zodiacal light, the galaxy's and the faint stars' (daysky.ts
 * `NIGHT_LUX`, each the light it sheds on level ground, over π as a sky of even brightness), with no airglow.
 * Derived.
 */
export const SPACE_GROUND = (NIGHT_LUX.zodiacal + NIGHT_LUX.galaxy + NIGHT_LUX.stars) / Math.PI;

/** How much of each magnitude the veil takes off the stars the picture takes off them. Estimated (above). */
export const STAR_KEEP = 0.15;

/** The faintest star of the catalogue drawn: what an eye in the dark sees (heavens.ts). */
const DARK_LIMIT = 6.5;

/** The faintest star drawn by an eye adapted to a veil of `veil` cd/m² over the sky's own ground. */
export const limitUnder = (veil: number): number =>
  DARK_LIMIT - STAR_KEEP * (faintest(SPACE_GROUND) - faintest(SPACE_GROUND + Math.max(veil, 0)));

/** Something lit in an eye's view above the air: toward it from the eye (a unit vector in the scene), half its width (radians) and its light at the eye, lux. */
export interface Glaring {
  toward: THREE.Vector3;
  radius: number;
  lux: number;
}

/**
 * How far past the frame's edge a light still reaches the eye, radians: a window's frame or a lens's hood shields
 * what is outside the view, over a few degrees and not at a line. Estimated.
 */
const SHIELD = (3 * Math.PI) / 180;

const seenAt = new THREE.Vector3();

/**
 * The veil the lit things in `camera`'s view lay over it, cd/m² (Stiles and Holladay: 10 E / θ², θ in degrees off
 * the line of sight, no less than 1.5 nor than the thing's own half width). Only what is in the frame counts, each
 * coming in over `SHIELD` as it crosses the frame's edge, so a view turned away from the Earth loses its veil
 * smoothly. The camera's world matrix must be as the frame draws it.
 */
export function veiled(camera: THREE.PerspectiveCamera, things: readonly Glaring[]): number {
  const halfY = THREE.MathUtils.degToRad(camera.fov / 2);
  const halfX = Math.atan(Math.tan(halfY) * camera.aspect);
  let veil = 0;
  for (const thing of things) {
    if (thing.lux <= 0) continue;
    seenAt.copy(thing.toward).transformDirection(camera.matrixWorldInverse);
    const x = Math.abs(Math.atan2(seenAt.x, -seenAt.z));
    const y = Math.abs(Math.atan2(seenAt.y, Math.hypot(seenAt.x, seenAt.z)));
    const inside =
      (1 - smoothstep(halfX + thing.radius - SHIELD, halfX + thing.radius + SHIELD, x)) *
      (1 - smoothstep(halfY + thing.radius - SHIELD, halfY + thing.radius + SHIELD, y));
    if (inside <= 0) continue;
    const off = THREE.MathUtils.radToDeg(Math.max(Math.acos(THREE.MathUtils.clamp(-seenAt.z, -1, 1)), thing.radius));
    veil += (inside * GLARE * thing.lux) / Math.max(1.5, off) ** 2;
  }
  return veil;
}

/**
 * The eye's adaptation to that veil, followed over its own times (`adapt`: to more light in under a second, to less
 * over minutes), and the faintest star it sees for it.
 */
export class StarEye {
  /** The log of the luminance the eye is adapted to, cd/m²: the sky's own ground with nothing lit in view. */
  private level = Math.log(SPACE_GROUND);

  /** The faintest star drawn, a magnitude: 6.5 in the dark. */
  get limit(): number {
    return limitUnder(Math.exp(this.level) - SPACE_GROUND);
  }

  /** A frame's worth of the eye's time toward a veil of `veil` cd/m²; `atOnce`: settled now. True if the limit has moved enough to be drawn again. */
  step(veil: number, dt: number, atOnce: boolean): boolean {
    const wanted = Math.log(SPACE_GROUND + Math.max(veil, 0));
    const was = this.limit;
    this.level = atOnce ? wanted : adapt(this.level, wanted, dt);
    if (Math.abs(this.level - wanted) < 1e-4) this.level = wanted;
    return Math.abs(this.limit - was) > 1e-4;
  }

  /** Back to the dark, at once (another place, another flight). */
  reset(): void {
    this.level = Math.log(SPACE_GROUND);
  }
}

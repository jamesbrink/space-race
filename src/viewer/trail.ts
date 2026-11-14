import * as THREE from 'three';
import { installedAir } from './air.ts';
import { NODES, type Smoke, shadeBy, tend, veilMesh } from './exhaust.ts';

/**
 * What a rocket leaves in the air: the smoke along the path its nozzle has flown, and the blast
 * over the pad it left. Both are volumes, marched with the engine's fire (exhaust.ts); this file
 * says where they are and how much of them there is.
 *
 * Points are added in the scene's frame as the flight goes (`reach`) and kept, so going back on
 * the clock only draws less of them: `nodes` gives the trail as it stands at an instant, ending
 * where the clock is (between two points laid, or at the nozzle while it burns) and never ahead of it.
 *
 * None of it is in the record; all of it is estimated, from film of Redstone and Mercury-Redstone
 * launches and from what the engine burned:
 *
 * - Alcohol and liquid oxygen leave water and carbon dioxide, no soot. Low down, in the Cape's
 *   humid air, the exhaust and the turbine's steam (the A-7's pump ran on hydrogen peroxide) show
 *   as a thin white trail that is gone in half a minute (`trailFade`: the first term).
 * - Between about 7 and 13 km, where the air is cold enough for the water to freeze, there is a
 *   contrail that lasts minutes; above it the air holds nothing and there is no trail (the second).
 * - At liftoff the fire meets the deflector under the stand and is thrown outward over the concrete: a
 *   puff of steam round the stand, a ring of steam and dust that runs out some 40 m and is mostly
 *   gone by T+6, wisps drifting downwind after it (`blast`).
 */

/** Seconds of flight between points. */
export const TRAIL_STEP = 0.5;
/** The most points: the powered flight is 142 s. */
const MOST = 400;
/** The air's density falls by e over this height, metres: stage.ts lays each point with exp(-height / 8000). */
const SCALE_HEIGHT = 8000;
/** The noise the smoke is cut from repeats over this many metres along the path (exhaust.ts): a node's place along it is kept within it. */
const ALONG = 4096;

const smooth = (x: number, a: number, b: number): number => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

/**
 * How far the smoke has spread from the path, metres, at `age` seconds: from the fire's own breadth (`breadth`: 2.5 m for
 * one engine; a cluster's is as much more as its engines are spread), a metre and a half a second, to 90 m.
 */
export const trailRadius = (age: number, breadth = 2.5): number => Math.min(breadth + 1.6 * Math.max(age, 0), 90);

/**
 * How much trail there is at a point laid `age` seconds ago in air thinned to `air` of sea level's,
 * as its optical depth across its middle: none ahead of the clock (a point laid on an earlier run
 * through the flight, which the clock has gone back before), coming in behind the fire, thinning as
 * it spreads and with age. Estimated: see the head of this file.
 */
export function trailFade(age: number, air: number, breadth = 2.5): number {
  if (age <= 0 || air <= 0) return 0;
  const height = -SCALE_HEIGHT * Math.log(Math.min(air, 1));
  const spread = breadth / trailRadius(age, breadth);
  // steam in the humid air near the ground: not in the first metres, where the fire's wash goes into the blast
  const low = 0.8 * smooth(height, 6, 40) * Math.exp(-height / 3000) * Math.exp(-age / 25) * spread ** 0.7;
  // the contrail: ice, which stays, and thins only as it spreads
  const cold = 1.4 * smooth(height, 7000, 8500) * (1 - smooth(height, 12000, 14000)) * Math.exp(-age / 120) * spread ** 0.4;
  return smooth(age, 0.2, 1.4) * (low + cold);
}

/**
 * The cloud over the pad at liftoff, in three parts, each a volume (exhaust.ts `blastForm` gives
 * their shapes, cut into billows):
 *
 * - the puff: the steam the engine's start throws round the stand (the "LOX and water lead start",
 *   TM X-53107 table 5-1), a squat dome on the concrete; dense and white, and blown away as the
 *   vehicle climbs;
 * - the ring: the jet thrown outward by the deflector under the stand, rolled up where it runs out
 *   over the concrete into a head of steam that billows, slows, is thicker in some ways than others,
 *   lifts off the ground as it warms, drifts with the wind and breaks up into wisps;
 * - the dust: a low tan haze in the lowest two metres, the jet's thin wash behind the head and a
 *   little past it.
 *
 * All of it is estimated, from photographs of MR-2, MR-3 and MR-4 leaving LC-5 (named in
 * docs/sources.md, "Launch photographs"): a knobbly white cloud hugging the stand at ignition, about
 * 8 m across and 3 m high, then 20 m across and 5 m high (35 m and 6 m for MR-4); gone from round the
 * stand once the vehicle is a few metres up; a translucent veil of steam and dust 20 to 50 m out and
 * 5 to 10 m high while it is low; the apron clear but for wisps by the time it is two or three of its
 * own heights up (about T+6). No deluge, so no great white wall. The wind that carries it is the
 * day's surface wind, which is not in the record: the clouds' (cape.ts, from 090) taken at six tenths
 * near the ground, about 4 m/s.
 *
 * What it leaves out: the billows do not roll, they grow with the ring, drift and churn upward; the
 * tongues round the ring are fixed lobes, not the deflector's true shape (which is not settled:
 * docs/sources.md); the cloud goes through what stands on the pad instead of round it; and nothing
 * is drawn before liftoff, though the engine burned for a moment on the stand.
 */
export interface Blast {
  /** The puff's radius and height, metres, and its extinction a metre. */
  puffRadius: number;
  puffHeight: number;
  puff: number;
  /** The ring's front, metres from the stand; how tall its head is; its extinction a metre; how far its head has lifted off the ground. */
  ringRadius: number;
  head: number;
  ring: number;
  lift: number;
  /** The dust's extinction a metre. */
  dust: number;
  /** How far the wind has carried the ring (metres, the scene's x and z; the puff a third of that). */
  drift: [number, number];
  /** How far its billows have churned upward, metres, and how far it has broken up into wisps (0 to 1). */
  rise: number;
  thin: number;
  /** Whether there is any of it to draw. */
  amount: number;
  /**
   * Where a flame pit takes the exhaust (`Pit`): the ring's middle from the stand, metres (the scene's x and z), round
   * which it runs out only on the side away from the stand (the cosine of half the angle it fills; under -1 all round),
   * and how far under the stand its base can be. All nought for a stand over a deck.
   */
  mouth: [number, number];
  fan: number;
  deep: number;
}

/**
 * A site whose exhaust goes down into a flame pit and out of its open side (SiteDef.exhaust): the way toward the open
 * side (a unit vector in the scene's x and z), how deep the pit is, how far from the stand the gas comes along its floor
 * to where it can rise (the end of the slot under the deck), and the slot's width, metres.
 */
export interface Pit {
  toward: [number, number];
  depth: number;
  out: number;
  width: number;
}

/** Of the clouds' wind (cape.ts), what blows over the concrete: the ground slows it (estimated). */
export const SURFACE_WIND = 0.6;

/** The cloud over the pad `t` seconds after liftoff, in a surface wind of `wind` m/s (toward, the scene's x and z). Estimated: see `Blast`. */
export function blast(at: number, wind: readonly [number, number] = [0, 0], pit?: Pit): Blast {
  const t = Math.max(at, 0) || 0;
  if (pit) return pitBlast(t, wind, pit);
  // the puff: up at once, about 20 m across and 5 m high by T+1.5, blown off the stand by T+3
  const grow = 1 - Math.exp(-t / 0.6);
  const puff = 1.2 * smooth(t, 0, 0.8) * Math.exp(-Math.max(t - 1, 0) / 0.8);
  // the ring: out fast and slowing, 14 m at T+1 (a mound round the stand still), 24 at T+2, 29 at T+3, 38 at T+6; its
  // head 3 m tall at first, 6 m at T+3, 8 m at T+6
  const ringRadius = 2 + 42 * (1 - Math.exp(-t / 3));
  const head = 1.5 + 0.12 * ringRadius + 0.3 * Math.max(t - 2, 0);
  // fed while the fire reaches the concrete, then thinning: mostly in a few seconds, the last wisps over a quarter of a minute
  const fed = smooth(t, 0.1, 1.0);
  const after = Math.max(t - 2, 0);
  const ring = 1.0 * fed * (0.85 * Math.exp(-after / 1.4) + 0.15 * Math.exp(-after / 8));
  const dust = 0.015 * smooth(t, 0.2, 1.2) * Math.exp(-after / 3);
  // the wind takes it once the jet no longer pushes it out (from about T+1.5)
  const blown = Math.max(t - 1.5, 0);
  const amount = Math.max(puff / 1.2, ring, dust / 0.015);
  // (the last of it goes out over a few seconds, not at once)
  const left = smooth(amount, 0.02, 0.06);
  return {
    puffRadius: 3 + 8 * grow,
    puffHeight: 2 + 3.5 * grow,
    puff: puff * left,
    ringRadius,
    head,
    ring: ring * left,
    lift: 0.4 * Math.max(t - 3, 0),
    dust: dust * left,
    drift: [wind[0] * blown, wind[1] * blown],
    rise: 0.6 * t,
    thin: smooth(t, 2.5, 10),
    amount: left > 0 ? amount : 0,
    mouth: [0, 0],
    fan: -2,
    deep: 0,
  };
}

/**
 * The cloud at liftoff where the exhaust goes into a flame pit (an R-7 at Site 1). The deck has an opening over the pit
 * and no deflector of its own: the five fires go down through it onto the curved deflector under it, which turns them
 * along the pit's floor toward its open side, and the cloud rolls up out of the pit there, far larger than LC-5's and
 * away from the rocket, with little on the deck itself. Its geometry is the site's (`Pit`: site-1.md, "The flame pit");
 * the cloud's growth and size are estimated, from photographs and film of R-7s leaving Site 1 (the launch of 12 April
 * 1961 from across the pit, RussianSpaceWeb; colour film of Soyuz launches from the same pad): a wall of cloud rising
 * out of the pit's eastern part within two or three seconds, some 30 m above the deck by the time the rocket clears the
 * towers and 80 m and more along the pit, drifting off and thinning over half a minute.
 *
 * The gas comes along the floor from the slot's end (`out`) and runs on east over the sump and up the rising floor: the
 * ring's middle runs from there 25 m further, and it spreads only on the side away from the stand (a fan of 150
 * degrees: the pit's walls hold it in, and nothing comes back over the deck). Its head starts deep in the pit and rises
 * out of it. A little steam and smoke comes up through the opening round the vehicle (a fifth of LC-5's puff).
 *
 * What it leaves out: the pit's own walls do not shape it (the fan and the rise stand for them); the gas is not seen
 * going down the deflector; the cloud is the white of LC-5's where film shows the R-7's grey-brown with the steppe's
 * dust; and the engines' run on the pad before liftoff (the preliminary stage) puts no cloud there before T+0.
 */
function pitBlast(t: number, wind: readonly [number, number], pit: Pit): Blast {
  const grow = 1 - Math.exp(-t / 0.6);
  const puff = 0.2 * 1.2 * smooth(t, 0, 0.8) * Math.exp(-Math.max(t - 1, 0) / 0.8);
  // out along the floor and up, a mass rather than a ring: its front 8 m out at once, 40 m by T+3, 52 m by T+6, its
  // head 13 m tall at first, 32 m by T+3 and 41 m by T+6, so that there is little hole in its middle
  const ringRadius = 0.25 * pit.width + 50 * (1 - Math.exp(-t / 3));
  const head = 8 + 0.6 * ringRadius + 0.5 * Math.max(t - 2, 0);
  const run = pit.out + 25 * (1 - Math.exp(-t / 2.5));
  const fed = smooth(t, 0.1, 1.0);
  const after = Math.max(t - 4, 0);
  const ring = 1.2 * fed * (0.8 * Math.exp(-after / 3) + 0.2 * Math.exp(-after / 12));
  const blown = Math.max(t - 2, 0);
  const amount = Math.max(puff / 1.2, ring);
  const left = smooth(amount, 0.02, 0.06);
  return {
    puffRadius: 2 + 4 * grow,
    puffHeight: 2 + 2 * grow,
    puff: puff * left,
    ringRadius,
    head,
    ring: ring * left,
    // up out of the pit: its head's foot from most of the way down to the rim by T+3, and on up as it warms
    lift: Math.min(-0.8 * pit.depth + 12 * t, 0.5 * Math.max(t - 3, 0)),
    dust: 0,
    drift: [wind[0] * blown, wind[1] * blown],
    rise: 0.8 * t,
    thin: smooth(t, 4, 20),
    amount: left > 0 ? amount : 0,
    mouth: [pit.toward[0] * run, pit.toward[1] * run],
    fan: Math.cos((75 * Math.PI) / 180),
    deep: pit.depth,
  };
}

export class Trail implements Smoke {
  /** What stands for the trail in the scene: the fire and smoke's cover, for the clouds (exhaust.ts `veilMesh`). */
  readonly mesh: THREE.Mesh;
  private count = 0;
  private readonly at = new Float64Array(MOST * 3);
  private readonly born = new Float64Array(MOST);
  private readonly air = new Float64Array(MOST);
  /** How far along the path each point is, metres. */
  private readonly arc = new Float64Array(MOST);
  /** The live end: the nozzle now, while it burns and the clock is ahead of all that is laid. */
  private readonly live = { on: false, at: new THREE.Vector3(), born: 0, air: 1 };
  now: number | null = null;
  /** How broad the fire it leaves is, metres (`trailRadius`). */
  private readonly breadth: number;

  /** Where the site sends the exhaust, if into a flame pit (`Pit`); else the deck's cloud. */
  private readonly pit: Pit | undefined;

  constructor(breadth = 2.5, pit?: Pit) {
    this.breadth = breadth;
    this.pit = pit;
    this.mesh = veilMesh();
    this.mesh.visible = false;
    tend(this);
  }

  /** How many points are laid. */
  get laid(): number {
    return this.count;
  }

  /**
   * Put the trail's live end at the nozzle now, after the last point laid: points are half a
   * second apart, which at speed is hundreds of metres, and the trail must leave the fire itself.
   */
  head(at: THREE.Vector3, _along: THREE.Vector3, now: number, air: number): void {
    // The clock is behind what is laid (gone back, or a second run): the trail ends where the
    // clock is, between two points already there, and a live end joined to the last of them
    // would be a chord across the sky to wherever the engine last burned.
    if (this.count >= MOST || (this.count > 0 && now < this.born[this.count - 1]!)) {
      this.headless();
      return;
    }
    this.live.on = true;
    this.live.at.copy(at);
    this.live.born = now;
    this.live.air = air;
  }

  /** No live end: the engine is out, and the trail ends where it last burned. */
  headless(): void {
    this.live.on = false;
  }

  /** Lay the next point: the nozzle at `born` seconds, in air thinned to `air` of sea level's. */
  reach(at: THREE.Vector3, _along: THREE.Vector3, born: number, air: number): void {
    const i = this.count;
    if (i >= MOST) return;
    at.toArray(this.at, i * 3);
    this.born[i] = born;
    this.air[i] = air;
    this.arc[i] = i ? this.arc[i - 1]! + Math.hypot(at.x - this.at[i * 3 - 3]!, at.y - this.at[i * 3 - 2]!, at.z - this.at[i * 3 - 1]!) : 0;
    this.count++;
  }

  /** Show it at `now` seconds of flight (null: not flying). The light is the scene's own (exhaust.ts). */
  show(now: number | null, _light?: number): void {
    this.now = now;
    this.mesh.visible = now !== null;
    shadeBy(this); // (its shadow, for the frame about to be drawn)
  }

  /** The cloud over the pad at the instant shown, in the day's wind. */
  blast(): Blast {
    const wind = installedAir()?.clouds?.wind ?? [0, 0];
    return blast(this.now ?? 0, [SURFACE_WIND * wind[0], SURFACE_WIND * wind[1]], this.pit);
  }

  /** Where the blast is: on the ground (the models' y = 0) under where the nozzle was when it lit. Null before anything is known. */
  pad(out: THREE.Vector3): THREE.Vector3 | null {
    if (this.count > 0) return out.set(this.at[0]!, 0, this.at[2]!);
    return this.live.on ? out.set(this.live.at.x, 0, this.live.at.z) : null;
  }

  /**
   * The trail as it stands at `now`, oldest first, six numbers a node into `out`: its place (the
   * scene's frame), how far the smoke has spread there, its extinction on the path (a metre), how
   * far along the path it is (within `ALONG`). It ends where the clock is: at the live end, or
   * between the two points laid either side of `now`, or where the engine last burned. Old smoke is
   * wide, so of old points only every second, fourth, eighth is given (by a point's own number, so
   * which are given does not change from one instant to the next but as each ages past 8, 16, 32 s);
   * and stretches with nothing in them are left off both ends. Returns how many: at most NODES.
   */
  nodes(now: number, out: Float64Array): number {
    const n = this.count;
    if (n < 1) return 0;
    // the last point laid at or before now
    let lo = 0,
      hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.born[mid]! <= now) lo = mid + 1;
      else hi = mid;
    }
    const k = lo - 1;
    if (k < 0) return 0;
    let made = 0;
    const put = (x: number, y: number, z: number, born: number, air: number, arc: number): void => {
      const age = now - born;
      const radius = trailRadius(age, this.breadth);
      out.set([x, y, z, radius, trailFade(age, air, this.breadth) / (1.1 * radius), arc % ALONG], made++ * 6);
    };
    // newest first: the end, then the points laid, back to the first
    const at = this.at;
    const a = k * 3;
    if (k < n - 1) {
      const b = a + 3;
      const f = (now - this.born[k]!) / (this.born[k + 1]! - this.born[k]!);
      const lerp = (p: number, q: number) => p + (q - p) * f;
      if (f > 1e-9)
        put(
          lerp(at[a]!, at[b]!),
          lerp(at[a + 1]!, at[b + 1]!),
          lerp(at[a + 2]!, at[b + 2]!),
          now,
          lerp(this.air[k]!, this.air[k + 1]!),
          lerp(this.arc[k]!, this.arc[k + 1]!),
        );
    } else if (this.live.on && this.live.born > this.born[k]! && this.live.born <= now + 1e-9) {
      const p = this.live.at;
      put(p.x, p.y, p.z, this.live.born, this.live.air, this.arc[k]! + Math.hypot(p.x - at[a]!, p.y - at[a + 1]!, p.z - at[a + 2]!));
    }
    for (let i = k; i >= 0 && made < NODES; i--) {
      const age = now - this.born[i]!;
      const every = age < 8 ? 1 : 2 ** Math.min(5, Math.floor(Math.log2(age / 4)));
      if (i > 0 && i < k && (i + 1) % every) continue;
      put(at[i * 3]!, at[i * 3 + 1]!, at[i * 3 + 2]!, this.born[i]!, this.air[i]!, this.arc[i]!);
    }
    // nothing at either end: left off (a node stays while the one next to it has smoke: the stretch between them has some)
    const dead = (i: number) => out[i * 6 + 3]! * out[i * 6 + 4]! < 2e-3; // (a five-hundredth of the light: not to be seen)
    let first = 0,
      last = made - 1;
    while (first < last && dead(first) && dead(first + 1)) first++;
    while (last > first && dead(last) && dead(last - 1)) last--;
    if (last - first < 1) return 0;
    // oldest first
    const kept = out.slice(first * 6, (last + 1) * 6);
    const count = last - first + 1;
    for (let i = 0; i < count; i++) out.set(kept.subarray((count - 1 - i) * 6, (count - i) * 6), i * 6);
    return count;
  }

  dispose(): void {
    tend(this, false);
    this.now = null;
    shadeBy(this);
    this.mesh.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      (m.material as THREE.Material | undefined)?.dispose();
    });
  }
}

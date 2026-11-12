import * as THREE from 'three';
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
 * - At liftoff the fire meets the pad and its deflector and is thrown outward over the concrete:
 *   a low ring of steam and dust that reaches some 40 m in the first five seconds, while the
 *   nozzle is within a fire's length of the ground, and then thins where it lies (`blast`).
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

/** How far the smoke has spread from the path, metres, at `age` seconds: from the fire's own breadth, a metre and a half a second, to 90 m. */
export const trailRadius = (age: number): number => Math.min(2.5 + 1.6 * Math.max(age, 0), 90);

/**
 * How much trail there is at a point laid `age` seconds ago in air thinned to `air` of sea level's,
 * as its optical depth across its middle: none ahead of the clock (a point laid on an earlier run
 * through the flight, which the clock has gone back before), coming in behind the fire, thinning as
 * it spreads and with age. Estimated: see the head of this file.
 */
export function trailFade(age: number, air: number): number {
  if (age <= 0 || air <= 0) return 0;
  const height = -SCALE_HEIGHT * Math.log(Math.min(air, 1));
  const spread = 2.5 / trailRadius(age);
  // steam in the humid air near the ground: not in the first metres, where the fire's wash goes into the blast
  const low = 0.8 * smooth(height, 6, 40) * Math.exp(-height / 3000) * Math.exp(-age / 25) * spread ** 0.7;
  // the contrail: ice, which stays, and thins only as it spreads
  const cold = 1.4 * smooth(height, 7000, 8500) * (1 - smooth(height, 12000, 14000)) * Math.exp(-age / 120) * spread ** 0.4;
  return smooth(age, 0.2, 1.4) * (low + cold);
}

/**
 * The blast over the pad `t` seconds after liftoff: how far out its front is and how high it
 * stands (metres), how much of it there is (0 to 1), and how far its billows have risen. Estimated:
 * the front runs out fast and slows (21 m at 2 s, 39 m at 5 s, 48 m at the last); it is fed while the fire reaches
 * the ground, about the first five seconds (the nozzle is 25 m up by then, at the 1.9 m/s² the
 * vehicle leaves with), then thins, to a twentieth in half a minute.
 */
export function blast(t: number): { radius: number; height: number; amount: number; rise: number } {
  if (!(t > 0)) return { radius: 4, height: 2.5, amount: 0, rise: 0 };
  const amount = (1 - Math.exp(-t / 1.2)) * Math.exp(-Math.max(t - 5, 0) / 9);
  return {
    radius: 4 + 44 * (1 - Math.exp(-t / 3.2)),
    height: 3 + 1.3 * Math.min(t, 5) + 0.4 * Math.min(Math.max(t - 5, 0), 30),
    amount: amount < 0.01 ? 0 : amount,
    rise: 0.5 * t,
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

  constructor() {
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

  /** The blast over the pad at the instant shown. */
  blast(): ReturnType<typeof blast> {
    return blast(this.now ?? 0);
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
      const radius = trailRadius(age);
      out.set([x, y, z, radius, trailFade(age, air) / (1.1 * radius), arc % ALONG], made++ * 6);
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

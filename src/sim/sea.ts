/**
 * The sea's surface where a flight came down, as a function of the instant and the place: each train of the day's waves
 * (types.ts `SeaState`: the swell and the waves the wind raised, each a significant height, a period and the bearing it
 * comes from) as one long-crested sine travelling the way it goes, on deep water. What a body afloat rises and falls on
 * (sim/afloat.ts) and what is drawn are this one function, so the two cannot disagree.
 *
 * A train's amplitude is its significant height over 2 root 2: a sea of one sine whose crest-to-trough height is four of
 * its standard deviations, as the significant height is defined (H_s = 4 sigma, and a sine of amplitude a has sigma a /
 * root 2). Its wavenumber is deep water's (omega^2 = g k). Its phase at the landing is chosen: the record gives no
 * instant of any crest. A real sea is many trains at once; one each is the simplification, and says so.
 */
import type { WaveTrain } from '../types.ts';
import { G0 } from '../world/bodies.ts';

/** One train as the arithmetic takes it: amplitude, m; angular frequency, rad/s; wavenumber east and north, rad/m (the way it travels); phase, rad. */
export interface Wave {
  a: number;
  omega: number;
  k: [number, number];
  phase: number;
}

/** The phase each train has at the instant its sea is begun from: chosen, a turn's golden share apart, so no two trains begin in step. */
const PHASE = Math.PI * (3 - Math.sqrt(5));

/** The day's trains as waves: travelling away from where each comes from. */
export function wavesOf(trains: readonly WaveTrain[] | undefined): Wave[] {
  return (trains ?? []).map((w, i) => {
    const omega = (2 * Math.PI) / w.period.value;
    const k = (omega * omega) / G0;
    // (it comes from `from`, so it goes toward the bearing opposite: east and north parts of that)
    const to = ((w.from.value + 180) * Math.PI) / 180;
    return { a: w.height.value / (2 * Math.SQRT2), omega, k: [k * Math.sin(to), k * Math.cos(to)], phase: i * PHASE };
  });
}

/**
 * The surface's height over still water, m, at `t` seconds from `t0` and `east`, `north` m from where the body came down,
 * and how fast it rises, m/s.
 */
export function surfaceAt(waves: readonly Wave[], t: number, east = 0, north = 0): { height: number; rate: number } {
  let height = 0;
  let rate = 0;
  for (const w of waves) {
    const theta = w.omega * t - w.k[0] * east - w.k[1] * north + w.phase;
    height += w.a * Math.cos(theta);
    rate -= w.a * w.omega * Math.sin(theta);
  }
  return { height, rate };
}

/** The surface's slope there, east and north (rise over run): what tips a small body that rides it. */
export function slopeAt(waves: readonly Wave[], t: number, east = 0, north = 0): [number, number] {
  let e = 0;
  let n = 0;
  for (const w of waves) {
    const s = w.a * Math.sin(w.omega * t - w.k[0] * east - w.k[1] * north + w.phase);
    e += w.k[0] * s;
    n += w.k[1] * s;
  }
  return [e, n];
}

/**
 * The surface's slope there along a bearing (degrees true: rise over run toward it), and how fast it changes, 1/s: what
 * tips a body that heels in the vertical plane of that bearing (sim/afloat.ts).
 */
export function tiltAt(waves: readonly Wave[], t: number, bearing: number, east = 0, north = 0): { slope: number; rate: number } {
  const b = (bearing * Math.PI) / 180;
  const [se, sn] = [Math.sin(b), Math.cos(b)];
  let slope = 0;
  let rate = 0;
  for (const w of waves) {
    const theta = w.omega * t - w.k[0] * east - w.k[1] * north + w.phase;
    const along = w.k[0] * se + w.k[1] * sn;
    slope += along * w.a * Math.sin(theta);
    rate += along * w.a * w.omega * Math.cos(theta);
  }
  return { slope, rate };
}

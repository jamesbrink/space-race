/**
 * What the flight sounds like, as numbers: levels, filter frequencies, delays and Doppler factors
 * worked out from where the vehicle is, what it is doing and where the ears are. Nothing here
 * makes a sound (sound/engine.ts turns these numbers into Web Audio) and nothing here knows which
 * flight it is: thrust, exhaust speed, nozzle size, event times and the retrorockets' burn come
 * from the flight's plan, the air from sim/atmosphere.ts.
 *
 * What is physics, and what is not:
 *
 * - The path is physics. Sound heard at the clock's instant `t` left the engine at the earlier
 *   instant `te` for which `te + distance(te) / c = t` (`heardAt`): so the roar arrives late by
 *   distance over the speed of sound, events are heard when `te` passes them, and the Doppler
 *   factor is how fast `te` runs against `t`. Level falls with the square of the distance (`spl`),
 *   the air takes the high frequencies first (`absorption`, ISO 9613-2 table 2 at 20 C and 70 %
 *   humidity, quoted to one decimal), and a source or a listener in thin air radiates and hears
 *   in proportion to the density there, so in vacuum nothing is airborne.
 * - The source's level is a rule of thumb: half a per cent of the jet's mechanical power
 *   (thrust times exhaust speed over two) leaves as sound (`EFFICIENCY`), and its spectrum peaks
 *   at a Strouhal number of 0.02 on the nozzle's exit (`craft`). Both are `estimated`: published
 *   values run from 0.2 to 1 per cent and the peak is broad. The air's own noise on the skin is
 *   0.006 of the dynamic pressure, more through Mach 1 (`SKIN`), also a rule of thumb.
 * - What reaches someone riding with the vehicle (`riding`) is a guess, `estimated` throughout:
 *   the structure carries the engine at a fixed loss (`STRUCTURE`), the cabin wall takes another
 *   from what comes through the air (`CABIN`), and past Mach 1 the vehicle has outrun its own
 *   exhaust noise. So in vacuum only the structure is left.
 * - How loud a level is on a loudspeaker is a choice: `loudness` puts `FULL` dB at full scale and
 *   halves the range in decibels, since 140 dB at the pad and 60 dB of surf cannot both be
 *   reproduced. Inverse-square is exact in `spl` and compressed in what is heard.
 * - The one-shots' levels (`CUES`), the place's bed (`PlaceDef.quiet`) and every timbre are synthesised
 *   impressions, `estimated`: no recording was measured or used.
 * - On the ground (`Works`): a driven vehicle's engine (`engineVoice`: its firing frequency from its own cylinders and
 *   revolutions, PlaceDef.engines) and tyres (`tyreVoice`, by what is under them, PlaceDef.tread), and each machine that
 *   moves a part (`MACHINES`, by the kind its move names: types.ts Machine). The path is the launch's (inverse square
 *   from a metre, the air's absorption, the delay of distance over the speed of sound); every level at a metre and every
 *   timbre is `estimated`: impressions of the kind of machine, in proportion to one another, nothing measured.
 */
import { atmosphere } from '../sim/atmosphere.ts';
import { ballisticOf } from '../sim/fly.ts';
import type { FlightPlan } from '../sim/plan.ts';
import type { Engine, MachineKind, Tread, TreadKind } from '../types.ts';
import { clamp, lerp, smoothstep } from '../util/math.ts';
import { EARTH_SPHERE, G0 } from '../world/bodies.ts';

export type Vec = readonly [number, number, number];

const RHO0 = atmosphere(0).density;
/** The reference sound pressure, Pa, and intensity, W/m^2: 0 dB. */
const P_REF = 2e-5;
const I_REF = 1e-12;
/** The Earth's sphere, m (world/bodies.ts): how far the sea has fallen below the site's flat frame at a distance. */
const EARTH = EARTH_SPHERE;

/** The share of a jet's mechanical power that leaves as sound. Estimated: a rule of thumb for rockets (0.2 to 1 per cent). */
export const EFFICIENCY = 0.005;
/** No source is nearer than this, m: an engine's noise comes from tens of metres of plume, not a point. */
export const NEAR = 10;
/** The level put at full scale, dB, how many decibels of level make one of gain, and the level under which nothing is played. */
export const FULL = 140;
export const SQUEEZE = 2;
export const FLOOR = 38;
/** What the structure loses carrying the engine's sound to the cabin, what the cabin wall loses from the air outside, and what a small rocket bolted to the spacecraft loses, dB. Estimated. */
const STRUCTURE = 46;
const CABIN = 34;
const BOLTED = 24;
/** What an event loses on its way to ears beside the vehicle rather than inside it, dB. Estimated. */
const BESIDE = 12;
/** What the air's noise loses on its way to ears under the drogue, and under the main, where it is heard in the lines and the canopy, dB. Estimated. */
const CANOPY = [22, 12] as const;
/** Pressure fluctuation on the skin under a turbulent boundary layer, over dynamic pressure. Estimated: the usual 0.006 for attached flow. */
const SKIN = 0.006;
/** The exhaust speed assumed for the small solid rockets and the jets, m/s, whose own is not in a plan. Estimated. */
const SMALL_EXHAUST = 2400;
const JET_EXHAUST = 1000;
/** Faster than this the flight is not played as it sounds but kept as a low bed, and its events are not played at all. */
export const FASTEST = 2;

const distance = (a: Vec, b: Vec): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * How much of sea level's air there is at a height, for carrying sound: the density's share, and nothing at all by
 * 120 km, where the molecules are metres apart, further than a sound's wavelength (the fade from 80 km is estimated).
 */
export function carries(height: number): number {
  const h = Math.max(0, height);
  return Math.min(1, atmosphere(h).density / RHO0) * (1 - smoothstep(80_000, 120_000, h));
}

/** A point of the scene's frame (the site's: +Y up from its origin) as a height above the sea, m: the frame is flat and the sea is not. */
export function heightOf(p: Vec, padHeight: number): number {
  return p[1] + padHeight + (p[0] * p[0] + p[2] * p[2]) / (2 * EARTH);
}

/** Sound power, W, of a rocket of this thrust (N) and exhaust speed (m/s). */
export function acousticPower(thrust: number, exhaustSpeed: number): number {
  return EFFICIENCY * 0.5 * Math.max(0, thrust) * exhaustSpeed;
}

/** Sound pressure level, dB, at `metres` from a source of `power` watts radiating evenly: inverse-square, and nothing nearer than NEAR. */
export function spl(power: number, metres: number): number {
  if (!(power > 0)) return Number.NEGATIVE_INFINITY;
  const d = Math.max(NEAR, metres);
  return 10 * Math.log10(power / (4 * Math.PI * d * d) / I_REF);
}

/** ISO 9613-2, table 2: what air at 20 C and 70 % relative humidity takes from a pure tone, dB a kilometre, by octave band (Hz). */
const ABSORPTION: readonly [number, number][] = [
  [63, 0.1],
  [125, 0.3],
  [250, 1.1],
  [500, 2.8],
  [1000, 5.0],
  [2000, 9.0],
  [4000, 22.9],
  [8000, 76.6],
];

/** What the air takes from a tone of `hertz`, dB a kilometre: read between the table's bands in the logarithm, and as the square of the frequency beyond its ends. */
export function absorption(hertz: number): number {
  const f = Math.max(1, hertz);
  const first = ABSORPTION[0]!;
  const last = ABSORPTION[ABSORPTION.length - 1]!;
  if (f <= first[0]) return first[1] * (f / first[0]) ** 2;
  if (f >= last[0]) return last[1] * (f / last[0]) ** 2;
  let i = 1;
  while (f > ABSORPTION[i]![0]) i++;
  const [f0, a0] = ABSORPTION[i - 1]!;
  const [f1, a1] = ABSORPTION[i]!;
  return a0 * (a1 / a0) ** (Math.log(f / f0) / Math.log(f1 / f0));
}

/** What `metres` of air take from a tone of `hertz`, dB. */
export function absorbed(hertz: number, metres: number): number {
  return (absorption(hertz) * Math.max(0, metres)) / 1000;
}

/** The frequency, Hz, above which `metres` of air have taken more than 12 dB: where a low-pass filter is put. Between 40 Hz and 16 kHz. */
export function cutoffAfter(metres: number): number {
  let lo = Math.log(40);
  let hi = Math.log(16_000);
  if (absorbed(16_000, metres) <= 12) return 16_000;
  if (absorbed(40, metres) >= 12) return 40;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (absorbed(Math.exp(mid), metres) > 12) hi = mid;
    else lo = mid;
  }
  return Math.exp((lo + hi) / 2);
}

/** The speed of sound over a path between two heights above the sea, m/s: the harmonic mean of the ends' (1976 standard air). */
export function soundSpeed(heightA: number, heightB: number): number {
  const a = atmosphere(Math.max(0, heightA)).soundSpeed;
  const b = atmosphere(Math.max(0, heightB)).soundSpeed;
  return (2 * a * b) / (a + b);
}

/** The gain a level in dB is played at: FULL is 1, every SQUEEZE decibels of level one of gain, nothing under FLOOR. */
export function loudness(level: number): number {
  if (!(level > FLOOR)) return 0;
  return Math.min(1.4, 10 ** ((level - FULL) / (20 * SQUEEZE))) * smoothstep(FLOOR, FLOOR + 12, level);
}

export interface Heard {
  /** The flight's instant whose sound is arriving now, s. */
  emitted: number;
  /** How far it came, m, and how long it took, s. */
  distance: number;
  delay: number;
  /** How fast the emitted instant runs against the clock: over 1 coming, under 1 going. Pitch is multiplied by it. */
  doppler: number;
}

/**
 * What is being heard at `t` by ears at rest at `ears`, from a source that was at `where(te)`:
 * the `te` for which `te + |ears - where(te)| / c = t`, found by halving. `speed` is the speed of
 * sound to a point of the source's path.
 */
export function heardAt(t: number, ears: Vec, where: (t: number) => Vec, speed: (from: Vec) => number): Heard {
  const late = (te: number): number => {
    const p = where(te);
    return te + distance(ears, p) / speed(p) - t;
  };
  let hi = t;
  let lo = t - distance(ears, where(t)) / speed(where(t)) - 1;
  for (let i = 0; i < 30 && late(lo) > 0; i++) lo -= 2 * (t - lo);
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    if (late(mid) > 0) hi = mid;
    else lo = mid;
  }
  const emitted = (lo + hi) / 2;
  const at = where(emitted);
  const c = speed(at);
  const h = 0.05;
  const going = (distance(ears, where(emitted + h)) - distance(ears, where(emitted - h))) / (2 * h);
  return { emitted, distance: distance(ears, at), delay: t - emitted, doppler: clamp(1 / Math.max(0.2, 1 + going / c), 0.4, 2) };
}

/** What sound needs of a flight's sample (sim/fly.ts `Sample`; a live one also says what its jets push with). */
export interface Moment {
  t: number;
  altitude: number;
  q: number;
  mach: number;
  rcs?: { firing: readonly number[] };
}

/** The flight between its samples at `t`: height, dynamic pressure and Mach number read straight between the two either side, the jets' whole thrust (N) from the earlier. */
export function stateAt(samples: readonly Moment[], t: number): { altitude: number; q: number; mach: number; jets: number } {
  if (!samples.length) return { altitude: 0, q: 0, mach: 0, jets: 0 };
  let lo = 0;
  let hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid]!.t <= t) lo = mid;
    else hi = mid;
  }
  const a = samples[lo]!;
  const b = samples[hi]!;
  const k = b.t > a.t ? clamp((t - a.t) / (b.t - a.t), 0, 1) : t >= b.t ? 1 : 0;
  const from = k >= 1 ? b : a;
  const jets = (from.rcs?.firing ?? []).reduce((sum, f) => sum + Math.abs(f), 0);
  return { altitude: lerp(a.altitude, b.altitude, k), q: lerp(a.q, b.q, k), mach: lerp(a.mach, b.mach, k), jets };
}

/** An engine as a source of sound. */
export interface Craft {
  /** N at sea level, and the exhaust's speed, m/s. */
  thrust: number;
  exhaustSpeed: number;
  /** Where its spectrum peaks, Hz. */
  peak: number;
}

/** The engine a plan describes: exhaust speed from the specific impulse, the spectrum's peak at a Strouhal number of 0.02 on the nozzle's exit (estimated). */
export function craft(thrust: number, isp: number, exitArea: number): Craft {
  const exhaustSpeed = isp * G0;
  const exit = Math.sqrt((4 * Math.max(1e-3, exitArea)) / Math.PI);
  return { thrust, exhaustSpeed, peak: clamp((0.02 * exhaustSpeed) / exit, 18, 160) };
}

/** Everything `mix` is worked from. */
export interface Hearing {
  /** The clock: its instant (s from liftoff), its rate, whether it runs. */
  t: number;
  rate: number;
  running: boolean;
  /** Where the ears are, in the scene's frame, and how far they are riding with the vehicle (0 standing somewhere, 1 going with it). */
  ears: Vec;
  riding: number;
  craft: Craft;
  /** Where the engine is at a flight instant, in the scene's frame, and how it burns then (0 out to 1). */
  where(t: number): Vec;
  burn(t: number): number;
  samples: readonly Moment[];
  /** When each parachute came out and when it came down: Infinity until then. */
  out: { drogue: number; main: number };
  duration: number;
  /** It stays where it came down (a flight flown by hand) rather than going back to its pad. */
  stays: boolean;
  /** The scene's origin above the sea, m. */
  padHeight: number;
  /** The place's own bed (`PlaceDef.quiet`). */
  place: Place;
}

/**
 * A place's quiet: gains for wind, surf and far-off machinery, heard at its ground, and for the water round a spacecraft
 * that has come down and stayed (`sea`: nought where its flights come down on land). A place's own data (`PlaceDef.quiet`).
 */
export interface Place {
  wind: number;
  surf: number;
  hum: number;
  sea: number;
}

/** What the engine (sound/engine.ts) is set to. Gains are of full scale. */
export interface Mix {
  /** The whole flight's gain: 0 while the clock is stopped, low when it runs faster than FASTEST. */
  flight: number;
  engine: {
    /** The rumble, the crackle over it and the sub-bass under it. */
    gain: number;
    crackle: number;
    sub: number;
    /** Low-pass over all three, Hz, and where the rumble's spectrum peaks, Hz. */
    cutoff: number;
    peak: number;
    /** Doppler: pitch times this. */
    rate: number;
    /** The reflection off the ground: how late, s, and how strong. */
    echo: { delay: number; gain: number };
  };
  /** The air on the skin: a band of noise, its centre (Hz), and how deeply and fast it flutters (buffet, a canopy). */
  air: { gain: number; centre: number; flutter: number; flutterRate: number };
  /** The attitude jets' hiss. */
  jets: number;
  /** The place: wind, water (surf at the site, the sea round a spacecraft that is down), hum. */
  place: { wind: number; water: number; hum: number };
  /** For the events and the diagnostics: the instant being heard now (the clock's own for whoever rides), and its path. */
  heard: Heard;
}

/** The whole flight's gain by how the clock runs: silent stopped or backwards, a bed that sinks as it runs faster. */
export function gate(running: boolean, rate: number): number {
  if (!running || !(rate > 0)) return 0;
  if (rate <= FASTEST) return 1;
  if (rate <= 10) return 0.3;
  if (rate <= 60) return 0.12;
  return 0;
}

export function mix(h: Hearing): Mix {
  const k = clamp(h.riding, 0, 1);
  const earsHeight = heightOf(h.ears, h.padHeight);
  const earsAir = carries(earsHeight);
  const { thrust, exhaustSpeed, peak } = h.craft;

  // from outside: what left the engine a while ago, after its distance of air
  const heard = heardAt(h.t, h.ears, h.where, (p) => soundSpeed(earsHeight, heightOf(p, h.padHeight)));
  const from = h.where(heard.emitted);
  const thin = Math.min(earsAir, carries(heightOf(from, h.padHeight)));
  const level = spl(acousticPower(thrust * h.burn(heard.emitted), exhaustSpeed) * thin, heard.distance);
  const far = {
    gain: loudness(level - absorbed(4 * peak, heard.distance)),
    crackle: loudness(level - 6 - absorbed(2000, heard.distance)),
    sub: loudness(level - 3 - absorbed(peak, heard.distance)),
    cutoff: cutoffAfter(heard.distance),
  };

  // riding with it: the structure, and what the air outside still carries to the cabin wall
  const now = stateAt(h.samples, h.t);
  const air = carries(now.altitude);
  const power = acousticPower(thrust * h.burn(h.t), exhaustSpeed);
  const structure = loudness(spl(power, NEAR) - STRUCTURE);
  const cabin = loudness(spl(power * air * (1 - smoothstep(0.8, 1.3, now.mach)), NEAR) - CABIN);
  const through = cabin / (structure + cabin + 1e-9);
  const inside = { gain: structure + cabin, crackle: 0.35 * cabin, sub: structure + 0.7 * cabin, cutoff: 180 + 1400 * through };

  // the ground's reflection: beside the direct sound for someone standing off, back up from the pad for someone aboard
  const c = atmosphere(Math.max(0, earsHeight)).soundSpeed;
  const up = Math.max(0, from[1]);
  const stand = Math.max(1.5, h.ears[1]);
  const across = Math.hypot(h.ears[0] - from[0], h.ears[2] - from[2]);
  const longer = Math.hypot(across, up + stand) - Math.hypot(across, up - stand);
  const rise = Math.max(0, h.where(h.t)[1]);
  const echo = {
    delay: clamp(lerp(longer / c, (2 * rise) / c, k), 0, 0.5),
    gain: lerp(0.6 * (1 - smoothstep(60, 500, up)), 0.5 * (1 - smoothstep(20, 250, rise)), k),
  };

  // the air on the skin, for whoever rides: by dynamic pressure, rougher through Mach 1; under a canopy it is heard in the open, flapping
  const drogue = smoothstep(h.out.drogue, h.out.drogue + 1.5, h.t);
  const main = smoothstep(h.out.main, h.out.main + 1.5, h.t);
  const under = Math.max(drogue, main);
  // (down over the last half second of the fall, so that it is so when the clock stops at the landing)
  const down = smoothstep(h.duration - 0.5, h.duration, h.t);
  const sonic = Math.exp(-(((now.mach - 1) / 0.15) ** 2));
  const skin = SKIN * Math.max(0, now.q) * (1 + 1.5 * sonic);
  const rush = skin > 0 ? 20 * Math.log10(skin / P_REF) - lerp(lerp(CABIN, CANOPY[0], drogue), CANOPY[1], main) : Number.NEGATIVE_INFINITY;

  // the jets: small rockets on the spacecraft itself, heard through it
  const jets = k * loudness(spl(acousticPower(now.jets, JET_EXHAUST), NEAR) - BOLTED);

  // the place: its own bed near its ground, and the sea round a spacecraft that has come down and stayed
  const off = Math.hypot(h.ears[0], h.ears[2]);
  const near = (1 / (1 + (Math.max(0, h.ears[1]) / 500) ** 2)) * (1 - smoothstep(5000, 30_000, off)) * earsAir;
  const afloat = h.stays ? k * down : 0;

  return {
    flight: gate(h.running, h.rate),
    engine: {
      gain: lerp(far.gain, inside.gain, k),
      crackle: lerp(far.crackle, inside.crackle, k),
      sub: lerp(far.sub, inside.sub, k),
      cutoff: Math.exp(lerp(Math.log(far.cutoff), Math.log(inside.cutoff), k)),
      peak,
      rate: lerp(heard.doppler, 1, k),
      echo,
    },
    air: {
      gain: k * loudness(rush) * (1 - down),
      centre: lerp((250 + 500 * Math.min(1, now.mach / 3)) * (1 - 0.4 * sonic), 520, under),
      flutter: Math.max(0.5 * sonic, 0.6 * under),
      flutterRate: lerp(9, 3.5, under),
    },
    jets,
    place: {
      wind: h.place.wind * Math.max(near, 0.8 * afloat),
      water: Math.max(h.place.surf * near, h.place.sea * afloat),
      hum: h.place.hum * near,
    },
    // whoever rides hears the vehicle's own instant: it is beside them, however far behind its sound in the air has fallen
    heard: k > 0.5 ? { emitted: h.t, distance: distance(h.ears, h.where(h.t)), delay: 0, doppler: 1 } : heard,
  };
}

/** Something that happens once, at a flight instant. */
export interface Cue {
  at: number;
  kind: 'ignition' | 'tower' | 'separation' | 'retro' | 'release' | 'mortar' | 'canopy' | 'splash';
  /** For a rocket: how long it burns, s, and its thrust, N. */
  seconds?: number;
  thrust?: number;
}

/** What a flight's record says happens, for `score`: times in seconds from liftoff, Infinity for what has not happened. */
export interface Plan {
  /** What leaves the vehicle, and the one-shot its leaving makes, where it makes one (sound/index.ts `dropCue`). */
  drops: readonly { at: number; cue?: 'tower' | 'separation' | 'release' }[];
  /** Each retrorocket's firing, its burning time and thrust. */
  retro: { fires: readonly number[]; burn: number; thrust: number } | null;
  out: { drogue: number; main: number };
  duration: number;
}

/** The flight's one-shots, in order: ignition at liftoff, what its drops and its retrorockets and parachutes give, and the landing. */
export function score(plan: Plan): Cue[] {
  const cues: Cue[] = [{ at: 0, kind: 'ignition' }];
  for (const d of plan.drops) if (d.cue) cues.push({ at: d.at, kind: d.cue });
  for (const at of plan.retro?.fires ?? []) cues.push({ at, kind: 'retro', seconds: plan.retro!.burn, thrust: plan.retro!.thrust });
  cues.push({ at: plan.out.drogue, kind: 'mortar' }, { at: plan.out.main, kind: 'canopy' }, { at: plan.duration, kind: 'splash' });
  return cues.filter((c) => Number.isFinite(c.at)).sort((a, b) => a.at - b.at);
}

/** One burst of sound for the engine to play: a stretch of noise through a filter that sweeps, under an envelope, with a low tone under it if it thumps. */
export interface Shot {
  noise: 'white' | 'brown' | 'crackle';
  filter: 'lowpass' | 'bandpass' | 'highpass';
  /** The filter's frequency at the start and at the end, Hz, and its sharpness. */
  from: number;
  to: number;
  q: number;
  /** Seconds to come up, to hold, and to die away (to a thousandth). */
  attack: number;
  hold: number;
  decay: number;
  gain: number;
  thump?: { from: number; to: number; gain: number; decay: number };
  /** Which bus: the flight's (which follows the clock), the walk's, or the works' (the site's machines and vehicles, which follow what moves). */
  bus: 'flight' | 'walk' | 'works';
}

/** The level at 10 m in sea-level air of each event's bang, dB. Estimated: impressions, in proportion to one another. */
const CUES: Record<Cue['kind'], number> = {
  ignition: 146,
  tower: 136,
  separation: 132,
  retro: 124,
  release: 112,
  mortar: 128,
  canopy: 122,
  splash: 118,
};

/**
 * A cue as it is heard: `metres` away through air `thin` of sea level's density at the thinner
 * end, by ears riding (`riding`, 0 to 1) in air `air` of sea level's. Riding, it comes through the
 * structure whatever the air; standing off, through the air or not at all. Nothing where it could
 * not be heard.
 */
export function cueShots(cue: Cue, metres: number, thin: number, riding: number, air: number): Shot[] {
  const k = clamp(riding, 0, 1);
  const heardAs = (level: number): number => {
    const off = loudness(
      level - 20 * Math.log10(Math.max(NEAR, metres) / NEAR) + 10 * Math.log10(Math.max(1e-12, thin)) - absorbed(500, metres),
    );
    const aboard = Math.max(loudness(level - BOLTED), loudness(level + 10 * Math.log10(Math.max(1e-12, air)) - BESIDE));
    return lerp(off, aboard, k);
  };
  // what the air leaves of the highs standing off; aboard, the structure's dull knock, brighter where there is air round it
  const top = Math.exp(lerp(Math.log(cutoffAfter(metres)), Math.log(500 + 3500 * air), k));
  const bang = heardAs(CUES[cue.kind]);
  const shots: Shot[] = [];
  const add = (s: Omit<Shot, 'bus'>) => {
    if (s.gain > 0.002) shots.push({ ...s, bus: 'flight' });
  };
  const knock = (gain: number, decay: number, tone = 70) =>
    add({
      noise: 'brown',
      filter: 'lowpass',
      from: Math.min(top, 1800),
      to: Math.min(top, 150),
      q: 0.7,
      attack: 0.003,
      hold: 0.01,
      decay,
      gain,
      thump: { from: tone, to: tone / 2.2, gain: 0.8 * gain, decay: decay * 0.8 },
    });
  const burn = (level: number, seconds: number) =>
    add({
      noise: 'crackle',
      filter: 'lowpass',
      from: Math.min(top, 5000),
      to: Math.min(top, 2500),
      q: 0.5,
      attack: 0.04,
      hold: seconds,
      decay: 0.35,
      gain: heardAs(level),
    });
  switch (cue.kind) {
    case 'ignition':
      knock(bang, 0.9, 55);
      add({
        noise: 'crackle',
        filter: 'bandpass',
        from: Math.min(top, 300),
        to: Math.min(top, 1400),
        q: 0.6,
        attack: 0.25,
        hold: 0.2,
        decay: 1.2,
        gain: 0.6 * bang,
      });
      break;
    case 'tower':
      knock(0.6 * bang, 0.25, 90);
      burn(CUES.tower, 1.3);
      break;
    case 'separation':
      knock(bang, 0.35, 80);
      burn(CUES.separation - 8, 1);
      break;
    case 'retro':
      knock(bang, 0.3, 75);
      burn(spl(acousticPower(cue.thrust ?? 0, SMALL_EXHAUST), NEAR), cue.seconds ?? 1);
      break;
    case 'release':
      knock(bang, 0.12, 140);
      break;
    case 'mortar':
      knock(bang, 0.22, 110);
      break;
    case 'canopy':
      add({ noise: 'white', filter: 'highpass', from: 700, to: 700, q: 0.7, attack: 0.002, hold: 0.01, decay: 0.09, gain: 0.7 * bang });
      add({
        noise: 'brown',
        filter: 'lowpass',
        from: Math.min(top, 900),
        to: 120,
        q: 0.7,
        attack: 0.05,
        hold: 0.25,
        decay: 1.1,
        gain: bang,
      });
      break;
    case 'splash':
      knock(0.8 * bang, 0.3, 60);
      add({
        noise: 'white',
        filter: 'lowpass',
        from: Math.min(top, 5000),
        to: 350,
        q: 0.7,
        attack: 0.03,
        hold: 0.2,
        decay: 1.6,
        gain: bang,
      });
      break;
  }
  return shots;
}

/** A foot coming down (audio.ts `Footfall`), quietly: a stride, a ladder's rung, or a landing by how far it fell. Estimated, and one surface: the event does not say what was trodden on. */
export function stepShots(kind: 'step' | 'rung' | 'landing', pace: number, height = 0): Shot[] {
  const walk = (s: Omit<Shot, 'bus'>): Shot => ({ ...s, bus: 'walk' });
  if (kind === 'rung')
    return [walk({ noise: 'white', filter: 'bandpass', from: 1500, to: 1300, q: 14, attack: 0.002, hold: 0.005, decay: 0.11, gain: 0.05 })];
  if (kind === 'landing') {
    const gain = clamp(0.05 + 0.07 * Math.max(0, height), 0.05, 0.4);
    return [
      walk({
        noise: 'brown',
        filter: 'lowpass',
        from: 600,
        to: 90,
        q: 0.7,
        attack: 0.003,
        hold: 0.01,
        decay: 0.2,
        gain,
        thump: { from: 75, to: 38, gain: 0.7 * gain, decay: 0.16 },
      }),
    ];
  }
  const gain = 0.035 + 0.035 * clamp(pace / 4, 0, 1);
  return [
    walk({ noise: 'brown', filter: 'lowpass', from: 420, to: 140, q: 0.7, attack: 0.004, hold: 0.004, decay: 0.08, gain }),
    walk({ noise: 'white', filter: 'highpass', from: 2200, to: 2200, q: 0.7, attack: 0.002, hold: 0.002, decay: 0.035, gain: 0.25 * gain }),
  ];
}

/** A breath in a helmet at `phase` (audio.ts: 0 about to breathe in, 0.5 about to breathe out): how loud the hiss is and where its band is, Hz. Estimated. */
export function breath(phase: number): { gain: number; centre: number } {
  const p = phase - Math.floor(phase);
  if (p < 0.42) return { gain: 0.011 * Math.sin((Math.PI * p) / 0.42), centre: 1500 };
  if (p >= 0.5 && p < 0.95) return { gain: 0.015 * Math.sin((Math.PI * (p - 0.5)) / 0.45), centre: 750 };
  return { gain: 0, centre: 1000 };
}

// ---------------------------------------------------------------------------------------------------------------------
// On the ground: a driven vehicle and the site's machines (types.ts Machine). The path is the launch's; the sources'
// levels (dB at a metre) and timbres are estimated throughout, as impressions of each kind in proportion to the rest.

/** No vehicle or machine is heard from nearer than this, m: they are a metre or more across. */
export const CLOSE = 1;
/** The speed of sound at the ground, m/s (1976 standard air at sea level). */
const GROUND_C = atmosphere(0).soundSpeed;
/** How many voices the works have (engine.ts): the loudest at any moment are played, the rest are not. */
export const WORK_VOICES = 6;

/** One voice of the works (engine.ts `works`): a buzz (a sawtooth through a low-pass), a tone, a band of hiss and one of grit (crackle). */
export interface Voice {
  /** Of full scale, the whole voice; each part's own gain is its share of it. */
  gain: number;
  buzz: { hertz: number; gain: number; cut: number };
  tone: { hertz: number; gain: number };
  hiss: { hertz: number; q: number; gain: number };
  grit: { hertz: number; q: number; gain: number };
  /** What the air between leaves of the highs (a low-pass, Hz), and how late it arrives, s. */
  cutoff: number;
  delay: number;
}

/** A source of `level` dB at a metre heard `metres` off: its level at the ears, what the air leaves of its highs, and its delay. */
export function across(level: number, metres: number, hertz = 500): { level: number; cutoff: number; delay: number } {
  const d = Math.max(CLOSE, metres);
  return {
    level: level - 20 * Math.log10(d) - absorbed(hertz, metres),
    cutoff: cutoffAfter(metres),
    delay: Math.max(0, metres) / GROUND_C,
  };
}

/** A voice's timbre before the path: its level at a metre, dB, and its parts (gains are shares, 0 to 1). */
export interface Timbre {
  level: number;
  buzz: { hertz: number; gain: number; cut: number };
  tone: { hertz: number; gain: number };
  hiss: { hertz: number; q: number; gain: number };
  grit: { hertz: number; q: number; gain: number };
}

const NO_BUZZ = { hertz: 50, gain: 0, cut: 200 };
const NO_TONE = { hertz: 100, gain: 0 };
const NO_HISS = { hertz: 1000, q: 0.7, gain: 0 };

/** The timbre heard `metres` off, as a voice: nothing under the floor. */
export function voiceOf(t: Timbre, metres: number): Voice {
  const path = across(t.level, metres);
  return { gain: loudness(path.level), buzz: t.buzz, tone: t.tone, hiss: t.hiss, grit: t.grit, cutoff: path.cutoff, delay: path.delay };
}

/**
 * An engine, four-stroke, at `speed` (m/s, of its `top`) with its throttle down `throttle` (0 to 1): it turns between its
 * idle and its most with the speed and the pedal (65 and 35 per cent, as a gearbox would keep it in its range), fires
 * cylinders/2 times a turn, and is louder under load (14 dB from idle to full). A diesel is 6 dB louder than a petrol
 * engine at a metre and knocks more (its buzz brighter). The buzz is the firing; the tone half of it, a four-stroke's
 * uneven beat; the hiss the intake and the exhaust. Estimated, every figure.
 */
export function engineVoice(engine: Engine, speed: number, top: number, throttle: number): Timbre & { rpm: number; firing: number } {
  const v = clamp(Math.abs(speed) / Math.max(1, top), 0, 1);
  const pedal = clamp(throttle, 0, 1);
  const turn = clamp(0.65 * v + 0.35 * pedal, 0, 1);
  const rpm = engine.idle + (engine.most - engine.idle) * turn;
  const firing = (rpm / 60) * (Math.max(1, engine.cylinders) / 2);
  const load = clamp(0.25 * v + 0.75 * pedal, 0, 1);
  const diesel = engine.fuel === 'diesel';
  return {
    rpm,
    firing,
    level: (diesel ? 86 : 80) + 14 * load + 4 * turn,
    buzz: { hertz: firing, gain: 1, cut: firing * ((diesel ? 6 : 4) + 8 * load) },
    tone: { hertz: firing / 2, gain: 0.45 },
    hiss: { hertz: clamp(firing * 8, 300, 4000), q: 1.1, gain: 0.08 + 0.25 * load },
    grit: { hertz: 2500, q: 0.8, gain: diesel ? 0.12 + 0.2 * load : 0 },
  };
}

/** What each surface gives a tyre at 14 m/s and a metre (dB), and its sound: a hiss for a smooth one, grit for loose stones and a crust. Estimated. */
const TREADS: Record<TreadKind, Omit<Timbre, 'buzz'>> = {
  concrete: { level: 82, tone: NO_TONE, hiss: { hertz: 900, q: 0.7, gain: 1 }, grit: { hertz: 3000, q: 0.8, gain: 0.08 } },
  gravel: { level: 86, tone: NO_TONE, hiss: { hertz: 500, q: 0.8, gain: 0.4 }, grit: { hertz: 1600, q: 0.6, gain: 1 } },
  earth: { level: 78, tone: NO_TONE, hiss: { hertz: 350, q: 0.7, gain: 0.7 }, grit: { hertz: 700, q: 0.8, gain: 0.35 } },
  steppe: { level: 79, tone: NO_TONE, hiss: { hertz: 300, q: 0.7, gain: 0.7 }, grit: { hertz: 900, q: 0.8, gain: 0.45 } },
  sand: { level: 74, tone: NO_TONE, hiss: { hertz: 450, q: 0.6, gain: 0.8 }, grit: { hertz: 1200, q: 0.8, gain: 0.1 } },
  steel: { level: 84, tone: { hertz: 70, gain: 0.5 }, hiss: { hertz: 1200, q: 1, gain: 0.5 }, grit: { hertz: 2400, q: 1.5, gain: 0.2 } },
  timber: { level: 82, tone: { hertz: 50, gain: 0.4 }, hiss: { hertz: 600, q: 0.8, gain: 0.3 }, grit: { hertz: 400, q: 1, gain: 0.6 } },
};

/** Tyres rolling at `speed` m/s on a surface: louder as the 3.5th power of the speed (35 dB a decade), silent standing. Estimated. */
export function tyreVoice(on: TreadKind, speed: number): Timbre {
  const t = TREADS[on];
  const v = Math.abs(speed);
  const level = v > 0.05 ? t.level + 35 * Math.log10(v / 14) : Number.NEGATIVE_INFINITY;
  return { level, buzz: NO_BUZZ, tone: t.tone, hiss: { ...t.hiss, hertz: t.hiss.hertz * (0.8 + 0.4 * clamp(v / 14, 0, 1)) }, grit: t.grit };
}

/**
 * What is under a tyre: a place's material (a model's own name for it) by the first of the place's prefixes it begins
 * with; else, on the land, what the land is painted as there (`painted`: a road, an apron, by the name the place's ground
 * gives it), else the land.
 */
export function treadOf(material: string | null, tread: Tread, painted: string | null = null): TreadKind {
  if (material) for (const m of tread.materials) if (material.startsWith(m.prefix)) return m.kind;
  return (painted && tread.painted[painted]?.kind) || tread.land.kind;
}

/** A one-shot of a machine's: a Shot's recipe with its level at a metre (dB) in place of its gain. */
export type Burst = Omit<Shot, 'bus' | 'gain'> & { level: number };

/** How a kind of machine is heard: its timbre running, how it comes up and runs down, and its one-shots. */
export interface MachineSound extends Timbre {
  /** Seconds to come up to its running, and to run down. */
  up: number;
  down: number;
  /** Its pitch comes up with it (a motor, a pump), or stays where it is (friction). */
  spins: boolean;
  /** As it starts, as it stops, and as it shuts (stops where its travel begins: a door's latch). */
  start?: Burst;
  stop?: Burst;
  shut?: Burst;
  /** A wagon's: how far apart its rails' joints are, m. */
  joints?: number;
}

const knock = (level: number, from: number, decay: number): Burst => ({
  level,
  noise: 'brown',
  filter: 'lowpass',
  from,
  to: 150,
  q: 0.7,
  attack: 0.002,
  hold: 0.01,
  decay,
});
const click = (level: number, hertz: number): Burst => ({
  level,
  noise: 'white',
  filter: 'highpass',
  from: hertz,
  to: hertz,
  q: 0.7,
  attack: 0.001,
  hold: 0.004,
  decay: 0.06,
});

/**
 * Each kind of machine as it is heard (types.ts MachineKind). Every figure is estimated: impressions of the kind, not of
 * the machine, none measured. `road` and `locomotive` are heard as their engines (engineVoice), and `road` and `towed`
 * as their tyres too; what is given here for them is the rest of them.
 */
export const MACHINES: Record<Exclude<MachineKind, 'none'>, MachineSound> = {
  motor: {
    level: 74,
    buzz: { hertz: 100, gain: 0.35, cut: 600 },
    tone: { hertz: 780, gain: 0.35 },
    hiss: { hertz: 2500, q: 1, gain: 0.12 },
    grit: { hertz: 1500, q: 2, gain: 0.05 },
    up: 0.4,
    down: 0.7,
    spins: true,
    start: click(78, 2500),
    stop: knock(80, 900, 0.12),
  },
  winch: {
    level: 82,
    buzz: { hertz: 100, gain: 0.4, cut: 500 },
    tone: { hertz: 520, gain: 0.3 },
    hiss: { hertz: 1800, q: 1, gain: 0.08 },
    grit: { hertz: 900, q: 2, gain: 0.25 },
    up: 0.6,
    down: 0.9,
    spins: true,
    start: knock(88, 1200, 0.15),
    stop: knock(92, 1500, 0.25),
  },
  hydraulic: {
    level: 84,
    buzz: { hertz: 180, gain: 0.3, cut: 900 },
    tone: { hertz: 360, gain: 0.4 },
    hiss: { hertz: 3000, q: 0.7, gain: 0.35 },
    grit: { hertz: 600, q: 1, gain: 0.08 },
    up: 0.5,
    down: 0.4,
    spins: true,
    start: click(84, 1800),
    stop: knock(90, 1000, 0.3),
  },
  rails: {
    level: 88,
    buzz: { hertz: 100, gain: 0.35, cut: 400 },
    tone: { hertz: 600, gain: 0.2 },
    hiss: { hertz: 1500, q: 0.8, gain: 0.1 },
    grit: { hertz: 250, q: 0.8, gain: 0.6 },
    up: 1.5,
    down: 2,
    spins: true,
    start: knock(92, 800, 0.4),
    stop: knock(94, 700, 0.5),
  },
  locomotive: {
    level: 90,
    buzz: NO_BUZZ,
    tone: NO_TONE,
    hiss: NO_HISS,
    grit: { hertz: 300, q: 0.8, gain: 0.5 },
    up: 2,
    down: 3,
    spins: true,
    joints: 25,
  },
  // (its start is the starter motor turning it over until it catches)
  road: {
    level: 80,
    buzz: NO_BUZZ,
    tone: NO_TONE,
    hiss: NO_HISS,
    grit: NO_HISS,
    up: 1.2,
    down: 1.5,
    spins: true,
    start: { level: 80, noise: 'brown', filter: 'bandpass', from: 220, to: 420, q: 2, attack: 0.05, hold: 0.55, decay: 0.2 },
  },
  towed: {
    level: 76,
    buzz: NO_BUZZ,
    tone: NO_TONE,
    hiss: NO_HISS,
    grit: { hertz: 700, q: 1.2, gain: 0.5 },
    up: 0.3,
    down: 0.5,
    spins: false,
  },
  skids: {
    level: 84,
    buzz: NO_BUZZ,
    tone: NO_TONE,
    hiss: { hertz: 1500, q: 0.8, gain: 0.3 },
    grit: { hertz: 500, q: 0.6, gain: 1 },
    up: 0.2,
    down: 0.3,
    spins: false,
  },
  hand: {
    level: 62,
    buzz: NO_BUZZ,
    tone: NO_TONE,
    hiss: { hertz: 700, q: 0.8, gain: 0.3 },
    grit: { hertz: 1200, q: 3, gain: 0.4 },
    up: 0.15,
    down: 0.2,
    spins: false,
    stop: knock(72, 900, 0.08),
  },
  lift: {
    level: 76,
    buzz: { hertz: 100, gain: 0.3, cut: 300 },
    tone: { hertz: 420, gain: 0.2 },
    hiss: { hertz: 1200, q: 0.8, gain: 0.08 },
    grit: { hertz: 700, q: 1, gain: 0.3 },
    up: 0.5,
    down: 0.6,
    spins: true,
    start: knock(82, 1000, 0.15),
    stop: knock(86, 1200, 0.25),
  },
  door: {
    level: 58,
    buzz: NO_BUZZ,
    tone: { hertz: 1100, gain: 0.25 },
    hiss: { hertz: 900, q: 1, gain: 0.2 },
    grit: { hertz: 2000, q: 6, gain: 0.3 },
    up: 0.05,
    down: 0.1,
    spins: false,
    stop: knock(66, 700, 0.08),
    shut: { level: 86, noise: 'white', filter: 'bandpass', from: 1800, to: 900, q: 1.2, attack: 0.001, hold: 0.008, decay: 0.12 },
  },
  release: {
    level: 70,
    buzz: NO_BUZZ,
    tone: NO_TONE,
    hiss: { hertz: 800, q: 0.7, gain: 0.5 },
    grit: { hertz: 300, q: 0.8, gain: 0.3 },
    up: 0.1,
    down: 0.3,
    spins: false,
    start: click(84, 1800),
    stop: { ...knock(104, 1400, 0.5), thump: { from: 70, to: 32, gain: 0.8, decay: 0.4 } },
  },
};

/** A machine's one-shot `metres` off: its level after the path, its highs what the air leaves; null if it would not be heard. */
export function burstShot(b: Burst, metres: number): Shot | null {
  const path = across(b.level, metres, Math.max(b.from, b.to));
  const gain = loudness(path.level);
  if (!(gain > 0.001)) return null;
  const { level: _level, ...recipe } = b;
  return { ...recipe, from: Math.min(b.from, path.cutoff), to: Math.min(b.to, path.cutoff), gain, bus: 'works' };
}

/** A wagon's wheels over a rail joint: a knock and its ring. Estimated. */
const JOINT: Burst = {
  level: 92,
  noise: 'white',
  filter: 'bandpass',
  from: 2400,
  to: 900,
  q: 1.5,
  attack: 0.001,
  hold: 0.005,
  decay: 0.07,
  thump: { from: 110, to: 60, gain: 0.8, decay: 0.08 },
};

/** Something that moves, as the works hear it: a move of the hardware (sound/audio.ts `Working`), or a vehicle being driven. */
export interface Source {
  key: unknown;
  kind: Exclude<MachineKind, 'none'>;
  /** How far along its travel it is in its own measure, and the whole of its travel (Infinity: open-ended). */
  along: number;
  travel: number;
  /** Where it is heard from, in the scene's frame. */
  where: Vec;
  /** A vehicle driven by hand: its own speed and pedal (it runs whether it moves or not), not how far along it has gone. */
  driven?: { speed: number; top: number; throttle: number };
  /** Its engine (`road`, `locomotive`), and what each of its tyres is on (`road`, `towed`; none given: the place's land). */
  engine?: Engine | null;
  treads?: readonly TreadKind[];
}

/** What a voice of the works is playing, for the diagnostics: which source, which part of it, how loud and how far. */
export interface Playing {
  key: unknown;
  kind: MachineKind;
  part: 'machine' | 'engine' | 'tyres';
  gain: number;
  metres: number;
  /** An engine's revolutions a minute; a tyre's surface. */
  rpm?: number;
  tread?: TreadKind;
}

/** A source's state from one hearing to the next. */
interface Run {
  along: number;
  /** How far it is come up to its running, 0 to 1. */
  spin: number;
  /** How long since it last moved, s, and how fast it went then, in its measure a second. */
  still: number;
  pace: number;
  moving: boolean;
  kind: Exclude<MachineKind, 'none'>;
  where: Vec;
  engine: Engine | null;
  treads: readonly TreadKind[];
  driven: Source['driven'];
  /** The last rail joint it was over, for a wagon. */
  joint: number;
  /** Its number, for its voices' names. */
  n: number;
}

/** How long a move may go without being posed again and still be running, s: the scene poses it each frame it changes, not each hearing. */
export const HOLD = 0.25;
/** More of its travel than this in one hearing is a jump (the slider dragged across it, the clock put elsewhere): nothing it passed over is heard. */
export const JUMP = 0.3;
/** A slider's or the clock's road vehicle says no top speed: what drive.ts takes for one whose model gives none, m/s. */
const ROAD_TOP = 11;

/**
 * The site's machines and vehicles, heard. Pure (the page's state is passed in, and nothing is played): at each
 * hearing, every source's progress since the last says whether it is moving; a machine comes up to its running over
 * its `up` and runs down over its `down` once it stops, starting and stopping with its one-shots, and is silent when it
 * has run down. The loudest WORK_VOICES voices are played, each kept in its slot while it sounds, so that none jumps
 * from one to another.
 */
export class Works {
  private readonly runs = new Map<unknown, Run>();
  private readonly slots: (string | null)[] = new Array(WORK_VOICES).fill(null);
  private count = 0;
  /** What each slot played at the last hearing (null: nothing). */
  playing: (Playing | null)[] = new Array(WORK_VOICES).fill(null);

  /** One hearing, `dt` s after the last, from `ears`, on a place whose land is `land`: the voices to play now, in their slots, and the one-shots due. */
  hear(sources: readonly Source[], ears: Vec, dt: number, land: TreadKind): { voices: (Voice | null)[]; shots: Shot[] } {
    const shots: Shot[] = [];
    const shoot = (b: Burst | undefined, metres: number): void => {
      const shot = b && burstShot(b, metres);
      if (shot) shots.push(shot);
    };
    const seen = new Set<unknown>();
    for (const src of sources) {
      seen.add(src.key);
      const m = MACHINES[src.kind];
      let run = this.runs.get(src.key);
      if (!run) {
        run = {
          along: src.along,
          spin: 0,
          still: Number.POSITIVE_INFINITY,
          pace: 0,
          moving: false,
          kind: src.kind,
          where: src.where,
          engine: src.engine ?? null,
          treads: src.treads?.length ? src.treads : [land],
          driven: src.driven,
          joint: Math.floor(src.along / (m.joints ?? Number.POSITIVE_INFINITY)),
          n: this.count++,
        };
        this.runs.set(src.key, run);
      }
      const gone = Math.abs(src.along - run.along);
      const jumped = Number.isFinite(src.travel) && src.travel > 0 && gone > JUMP * src.travel;
      run.where = src.where;
      run.engine = src.engine ?? run.engine;
      run.treads = src.treads?.length ? src.treads : [land];
      run.driven = src.driven;
      if (jumped) {
        // put somewhere else at once: nothing it passed over is heard, and it stands as it was left
        run.spin = 0;
        run.still = Number.POSITIVE_INFINITY;
      } else if (src.driven || gone > 1e-9) {
        if (gone > 1e-9) run.pace += (gone / Math.max(dt, Math.min(run.still + dt, 1)) - run.pace) * 0.5;
        run.still = 0;
      } else {
        run.still += dt;
        if (run.still >= HOLD) run.pace *= Math.exp(-dt / 0.4); // (stopped: what it was doing dies away, it does not end at once)
      }
      run.along = src.along;
      if (src.driven) run.pace = Math.abs(src.driven.speed);
      const moving = !jumped && run.still < HOLD;
      const metres = distance(ears, run.where);
      if (moving && !run.moving && run.spin < 0.3) shoot(m.start, metres);
      if (!moving && run.moving && !jumped) shoot(m.shut && src.along <= 1e-6 ? m.shut : m.stop, metres);
      // a wagon over its rails' joints
      if (m.joints) {
        const joint = Math.floor(src.along / m.joints);
        if (moving && joint !== run.joint) shoot(JOINT, metres);
        run.joint = joint;
      }
      run.moving = moving;
    }
    // a source no longer posed (a driver has got out, a model has gone): it runs down as if it had stopped
    for (const [key, run] of this.runs)
      if (!seen.has(key)) {
        run.still += dt;
        run.driven = undefined;
        run.pace = 0;
        if (run.moving) shoot(MACHINES[run.kind].stop, distance(ears, run.where));
        run.moving = false;
      }
    // each comes up and runs down at its own rate, and is forgotten once it has run down and gone
    const wanted: { name: string; voice: Voice; playing: Playing }[] = [];
    for (const [key, run] of this.runs) {
      const m = MACHINES[run.kind];
      run.spin = run.moving ? Math.min(1, run.spin + dt / m.up) : Math.max(0, run.spin - dt / m.down);
      if (run.spin <= 0 && !run.moving) {
        if (!seen.has(key)) this.runs.delete(key);
        continue;
      }
      const metres = distance(ears, run.where);
      for (const [part, timbre, tread] of this.timbres(run)) {
        if (!timbre) continue;
        const voice = voiceOf(timbre, metres);
        voice.gain *= run.spin;
        if (!(voice.gain > 1e-4)) continue;
        const rpm = 'rpm' in timbre ? (timbre.rpm as number) : undefined;
        const playing: Playing = { key, kind: run.kind, part, gain: voice.gain, metres, ...(rpm ? { rpm } : {}) };
        if (tread) playing.tread = tread;
        wanted.push({ name: `${run.n}/${part}${tread ? `/${tread}` : ''}`, voice, playing });
      }
    }
    // the loudest, each kept in the slot it has
    wanted.sort((a, b) => b.voice.gain - a.voice.gain);
    const chosen = new Map(wanted.slice(0, WORK_VOICES).map((w) => [w.name, w]));
    for (let i = 0; i < this.slots.length; i++) if (this.slots[i] && !chosen.has(this.slots[i]!)) this.slots[i] = null;
    for (const name of chosen.keys()) if (!this.slots.includes(name)) this.slots[this.slots.indexOf(null)] = name;
    this.playing = this.slots.map((name) => (name ? chosen.get(name)!.playing : null));
    return { voices: this.slots.map((name) => (name ? chosen.get(name)!.voice : null)), shots };
  }

  /**
   * A run's timbres at a metre: its machine's, or its engine's and its tyres'. The tyres are a voice for each surface its
   * wheels are on, each that surface's share of them (two wheels of four on concrete: 3 dB under all four), with it named.
   */
  private timbres(run: Run): [Playing['part'], Timbre | null, TreadKind?][] {
    const tyres = (speed: number): [Playing['part'], Timbre, TreadKind][] => {
      const count = new Map<TreadKind, number>();
      for (const t of run.treads) count.set(t, (count.get(t) ?? 0) + 1);
      return [...count].map(([on, n]): [Playing['part'], Timbre, TreadKind] => {
        const t = tyreVoice(on, speed);
        return ['tyres', { ...t, level: t.level + 10 * Math.log10(n / run.treads.length) }, on];
      });
    };
    const m = MACHINES[run.kind];
    const speed = run.driven ? run.driven.speed : run.pace;
    const top = run.driven?.top ?? ROAD_TOP;
    // (one the slider or the clock drives is taken to have its pedal half down while it gathers pace, and let up as it stops)
    const throttle = run.driven ? run.driven.throttle : 0.5 * clamp(run.pace / 3, 0, 1);
    if (run.kind === 'road') return [['engine', run.engine ? engineVoice(run.engine, speed, top, throttle) : null], ...tyres(speed)];
    // a locomotive's engine works at a notch while it draws, and its wheels rumble on the rails by its pace
    if (run.kind === 'locomotive')
      return [
        ['engine', run.engine ? engineVoice(run.engine, 0.5 * ROAD_TOP, ROAD_TOP, 0.6) : null],
        ['machine', { ...m, level: m.level + 20 * Math.log10(clamp(run.pace / 2, 0.2, 2)) }],
      ];
    if (run.kind === 'towed') return [...tyres(speed), ['machine', m]];
    // a motor's pitch comes up as it does; friction's is where it is
    const k = m.spins ? 0.35 + 0.65 * run.spin : 1;
    return [
      [
        'machine',
        { ...m, buzz: { ...m.buzz, hertz: m.buzz.hertz * k, cut: m.buzz.cut * k }, tone: { ...m.tone, hertz: m.tone.hertz * k } },
      ],
    ];
  }
}

/**
 * The one-shot a drop makes as it leaves (`Cue`), by the joint that lets it go (`flies.drops[].on`, found by what it is:
 * fly.ts `ballisticOf`): the tower jettisoned, the booster parting, the retropack let go; none for anything else.
 */
export function dropCue(plan: FlightPlan, on: string | undefined): 'tower' | 'separation' | 'release' | undefined {
  if (!on || plan.kind !== 'ballistic') return undefined;
  const b = ballisticOf(plan);
  if (on === b.towerJoint?.id) return 'tower';
  if (on === b.separation.id) return 'separation';
  if (on === b.packJoint?.id) return 'release';
  return undefined;
}

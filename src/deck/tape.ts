import { solidModels, solidUrl } from '../sim/siteworld.ts';
import type { Flight } from '../types.ts';
import type { Clock } from '../world/clock.ts';

/**
 * A run flown by hand, kept as what was done to the deck and when, so that it can be flown again exactly: the deck's own
 * code on the same simulator, given the same inputs at the same instants, makes the same run to the last bit (the
 * simulator steps whole ticks whatever the frames, sim/vehicle.ts and stagedlive.ts). That is far smaller than the run
 * (a ballistic flight's samples are megabytes; what a hand did in it is a few kilobytes), and it brings back everything
 * the deck holds, whichever kind it is: the vehicle's state, the samples the scene and the path draw, what has been let
 * go, the switches, the consumables, the burns and the descent given by hand.
 *
 * What is written down (an `Entry`) is each call into the deck that can change the flight, with the clock's instant, the
 * simulator's tick count and the page's time (for the deck's own guards: a second Space within a second and a half, X
 * twice) as it was: a command, a key of the kind's own, a cabin's or a part's order, a mechanism worked, the throttle's
 * slider, a hand going to the controls, the keys and the stick held as they change, and, where the kind's flight depends on
 * the frames themselves (the orbital deck's attitude turned by hand, integrated frame by frame), each frame's instant while
 * it does. Flown again on a clock of its own, with nothing told to the page, the deck must arrive at each entry at the
 * same tick and at the end at the same tick and the same state (`end.print`): if it does not, the run is not restored at
 * all (a changed flight, a changed simulator, a browser that does its arithmetic otherwise), never restored wrong.
 */

/** The version of what is written: a run written by another is not read. */
export const SAVE = 1;

/** What a deck was asked, by kind: the keys and stick held, a hand on them, a command, a key, an order, a mechanism, the lever, a frame. */
export type EntryKind = 'h' | 's' | 'c' | 'x' | 'a' | 'w' | 'l' | 'f';
/** One entry: its kind, the clock's instant, the simulator's ticks then, the page's time (ms), whether the clock ran, and what was asked. */
export type Entry = [kind: EntryKind, t: number, ticks: number, now: number, running: 0 | 1, ...payload: (string | number)[]];

/** A run as it is written: the switches it began with, what was done, and where it had got to. */
export interface Taped {
  v: number;
  /** The kind's switches as the run began (guidance, the sequencer...): set before the deck stands it on the pad. */
  setup: Record<string, boolean>;
  entries: Entry[];
  /** Where the simulator had got to: the instant the deck last flew up to, its ticks then, and its state there (the kind's `print`). */
  end: { t: number; ticks: number; print: string };
  /** The clock as it was left (the instant, its pace, whether it ran): where Resume takes it up. */
  view: { t: number; rate: number; running: boolean };
}

/**
 * JSON that keeps every double as it was: what JSON cannot say (an infinity, NaN, minus zero: a hatch never blown is
 * `Infinity`) goes as a tagged string, and every finite double is written in the shortest form that reads back as itself.
 */
export function pack(x: unknown): string {
  return JSON.stringify(x, (_, v: unknown) => {
    if (typeof v !== 'number') return v;
    if (Number.isNaN(v)) return '~NaN';
    if (v === Infinity) return '~Infinity';
    if (v === -Infinity) return '~-Infinity';
    if (Object.is(v, -0)) return '~-0';
    return v;
  });
}
export function unpack(s: string): unknown {
  return JSON.parse(s, (_, v: unknown) =>
    typeof v === 'string' && v.startsWith('~') && ['~NaN', '~Infinity', '~-Infinity', '~-0'].includes(v) ? Number(v.slice(1)) : v,
  );
}

/** The simulator's own stamp: a hash of its code, made by the build (vite.config.ts); 'node' where nothing built it (a test). */
const SIM: string = import.meta.env?.SIM_STAMP ?? 'node';
const PAD_STAMPS: Record<string, string> = import.meta.env?.PAD_STAMPS ?? {};
/** Each baked solids file's stamp, by its url (sim/siteworld.ts `solidUrl`): what a flight flown by hand can strike, and its hull. */
const SOLID_STAMPS: Record<string, string> = import.meta.env?.SOLID_STAMPS ?? {};

/** A string's hash, 53 bits as base 36 (cyrb53): enough to tell one flight's data from another's, not a secret. */
export function hash(s: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/**
 * What a kept run was flown on: the version of what is written, the simulator's code, and the flight's data that a deck
 * flies (its plan, its site and day, what its model sheds and works, and what stands at its site to be struck: the baked
 * solids and where each model is placed). Any of them changed, the run is not flown again.
 */
export function stampOf(flight: Flight): string {
  const mechanisms = flight.models.find((m) => m.id === flight.flies?.model)?.mechanisms ?? [];
  const pad = flight.plan?.record?.aborts?.some((mode) => mode.escape?.tower?.hull)
    ? flight.models.find((model) => model.id === 'pad')
    : null;
  const padPose = pad && {
    url: pad.url,
    geometry: PAD_STAMPS[pad.url],
    position: pad.position,
    rotationY: pad.rotationY,
    sequence: pad.sequence?.map(({ at, slider }) => [at, slider]),
    parts: pad.parts.map(({ node, order, explode, moves }) => [node, order, explode, moves?.map(({ machine: _, ...pose }) => pose)]),
  };
  return `${SAVE}.${SIM}.${hash(JSON.stringify([flight.plan ?? null, flight.site, flight.launch, flight.flies ?? null, mechanisms, ...(padPose ? [padPose] : []), ...(flight.docking ? [flight.docking, flight.specs] : []), solidModels(flight).map(({ def }) => [def.id, def.position, def.rotationY, SOLID_STAMPS[solidUrl(flight, def)]])]))}`;
}

/** What flies a tape again: a deck on a clock of its own (whose every change it follows, as the page's clock is followed). */
export interface Player {
  readonly clock: Clock;
  /** The simulator's ticks so far: what each entry is checked against. */
  readonly ticks: number;
  /** The page's time the deck reads while an entry is played (ms). */
  now: number;
  /** Do what the entry did. */
  play(e: Entry): void;
  /** The state as the kind prints it (`Taped.end.print`). */
  print(): string;
}

/**
 * Bring the deck's clock to `t` as the page's clock would have, the deck following it: at most `MOST` seconds of flight a
 * step (deck.ts), so it may take several; it stops where the deck holds the clock (on the pad, before anything is lit).
 * Yields after each step, so a long stretch can be flown a slice at a time.
 */
function* reach(p: Player, t: number): Generator<void, void> {
  for (let i = 0; i < 1_000_000; i++) {
    if (p.clock.t === t) return;
    const ticks = p.ticks;
    p.clock.seek(t);
    if (p.clock.t === t || p.ticks === ticks) return;
    yield;
  }
}

/**
 * Fly `tape` again on `p`: true if it came to the same state, false if it did not (it diverged at an entry, or ended
 * elsewhere), and then nothing of it may be used. Yields between steps, a share done each time (0 to 1).
 */
export function* replay(tape: Taped, p: Player): Generator<number, boolean> {
  const n = tape.entries.length;
  for (let i = 0; i < n; i++) {
    const e = tape.entries[i]!;
    for (const _ of reach(p, e[1])) yield i / (n + 1);
    if (p.ticks !== e[2]) return false;
    const running = e[4] === 1;
    if (p.clock.running !== running) p.clock.play(running);
    p.now = e[3];
    p.play(e);
    yield (i + 1) / (n + 1);
  }
  for (const _ of reach(p, tape.end.t)) yield n / (n + 1);
  return p.ticks === tape.end.ticks && p.print() === tape.end.print;
}

/** Read a written run back, or null if it is not one this page can fly (another version, or not a run at all). */
export function readTape(text: string): Taped | null {
  try {
    const x = unpack(text) as Taped;
    const ok =
      x &&
      x.v === SAVE &&
      typeof x.setup === 'object' &&
      Array.isArray(x.entries) &&
      x.entries.every((e) => Array.isArray(e) && typeof e[0] === 'string' && typeof e[1] === 'number' && typeof e[2] === 'number') &&
      typeof x.end?.t === 'number' &&
      typeof x.end.ticks === 'number' &&
      typeof x.end.print === 'string' &&
      typeof x.view?.t === 'number';
    return ok ? x : null;
  } catch {
    return null;
  }
}

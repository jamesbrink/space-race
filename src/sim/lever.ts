/**
 * The throttle lever, as a pilot's hand has it: where it stands, and what that asks of the vehicle each tick
 * (`Controls.throttle`, laid over the autopilot's with `blend`; a staged vehicle's `StagedControls.lever`). It is the
 * flight deck's lever (deck.ts) with the page taken away, so that the way from the lever to the engine can be flown in
 * a test. Nothing here knows any flight; what the engine then does with the figure is its nature's (craft.ts: below its
 * least it is off, and it starts again only as often as it can).
 *
 * Every liquid engine has a lever (`handRange`): its own range where the record gives one, and where the real engine ran
 * at one thrust, a range the game gives it (`HAND_LEAST`, estimated), said as such wherever the lever is shown. A solid
 * has none: lit, it burns until it is spent.
 */
import type { Confidence } from '../measure.ts';
import type { EngineNature } from '../types.ts';

/**
 * The least a liquid engine that ran at one thrust is let down to by a hand, of its rated thrust. None of the period's
 * fixed-thrust engines here (the A-7, the MA-5's, the LR87's, the H-1, the J-2) has a stable minimum in any source read:
 * this is the deepest steady level a pump-fed engine of the time is recorded holding in flight in this repository, the
 * RD-107's first intermediate stage, 60 per cent (590.0 of 972.3 kN: vostok-8k72k.ts `strapOnThrottle`), taken for them.
 */
export const HAND_LEAST = 0.6;
const HAND_SOURCE =
  'Its floor is the RD-107’s first intermediate stage, 60 per cent (vostok-8k72k.ts `strapOnThrottle`), taken for an engine ' +
  'whose own stable minimum has not been read';

/** What a hand's lever may ask of an engine: its least and most, of rated thrust, and whether the real engine throttled. */
export interface HandRange {
  least: number;
  most: number;
  /** The real engine could be throttled over this range (its plan's own `throttle.range`); false: the game's (`HAND_LEAST`). */
  real: boolean;
  /** The game's range on an engine that ran at one thrust (no record of a setting); false where its control system throttled it (a `throttle.curve`). */
  fixed: boolean;
  confidence: Confidence;
  source: string;
  /**
   * Where the engine has a fixed position above its range (`EngineDef.throttle.detent`, the descent engine's full throttle
   * position): the range's own top and that position, which is then `most`. Between the two it does not run (`onLever`).
   */
  top?: number;
  detent?: number;
}

/**
 * The share of rated thrust an engine runs at for a lever at `k` (under its least the lever cuts it, which is the caller's):
 * held to its range, and past the range's top, where it has a fixed position above it, at that position, as the descent
 * engine's control assembly put any command above 65 per cent at full throttle (LMA790-3-LM, §2.5).
 */
export function onLever(range: HandRange, k: number): number {
  const at = Math.min(range.most, Math.max(range.least, k));
  return range.top !== undefined && range.detent !== undefined && at > range.top + 1e-9 ? range.detent : at;
}

/** The lever a hand has on an engine: null for a solid, which no hand can throttle or shut down. */
export function handRange(engine: {
  kind: EngineNature['kind'];
  throttle?: { range?: [least: number, most: number]; curve?: unknown; detent?: { value: number } };
}): HandRange | null {
  if (engine.kind === 'solid') return null;
  const range = engine.throttle?.range;
  const detent = engine.throttle?.detent?.value;
  if (range)
    return {
      least: range[0],
      most: detent ?? range[1],
      ...(detent !== undefined ? { top: range[1], detent } : {}),
      real: true,
      fixed: false,
      confidence: 'documented',
      source:
        detent !== undefined
          ? 'the engine’s own range and its fixed position above it, as its plan gives them'
          : 'the engine’s own range, as its plan gives it',
    };
  const fixed = !engine.throttle?.curve;
  return {
    least: HAND_LEAST,
    most: 1,
    real: false,
    fixed,
    confidence: 'estimated',
    source: `${fixed ? 'The real engine ran at one thrust' : 'The real engine was throttled only by its control system’s programme'}: this range is the game’s. ${HAND_SOURCE}`,
  };
}

/** A notch of the lever, of rated thrust: one press of an arrow key. */
export const NOTCH = 0.05;

export class Lever {
  /** Where it stands, 0 to the engine's most. It starts at full. */
  at: number;
  /** The engine has been asked to start: until then the lever is only being set. */
  lit = false;
  readonly least: number;
  readonly most: number;
  /** The range's top and the fixed position above it, where the engine has one (`HandRange.detent`): the lever goes from one to the other in one move. */
  readonly top: number | undefined;
  readonly detent: number | undefined;

  constructor(range: NonNullable<EngineNature['throttle']> | HandRange) {
    if (Array.isArray(range)) {
      [this.least, this.most] = range;
      this.top = this.detent = undefined;
    } else ({ least: this.least, most: this.most, top: this.top, detent: this.detent } = range);
    this.at = this.most;
  }

  /**
   * Put it somewhere: no further than the engine's most. Under its least is allowed, and is off. Between the range's top
   * and a fixed position above it (`detent`) it does not stop: moved up into the gap it goes to the position, down into it to the top.
   */
  move(to: number): void {
    let at = Math.max(0, Math.min(this.most, to));
    if (this.top !== undefined && this.detent !== undefined && at > this.top + 1e-9 && at < this.detent - 1e-9)
      at = at > this.at ? this.detent : this.top;
    this.at = at;
  }

  /** A notch up or down. */
  notch(by: 1 | -1): void {
    this.move(this.at + by * NOTCH);
  }

  /**
   * What the hand asks this tick: nothing until the engine has been asked to start (the autopilot's
   * word stands), then where the lever is. `cut`: the sequencer has shut the engine down at the
   * record's time, which the lever, left where it was, does not undo.
   */
  asks(cut = false): number | undefined {
    if (!this.lit) return undefined;
    return cut ? 0 : this.at;
  }
}

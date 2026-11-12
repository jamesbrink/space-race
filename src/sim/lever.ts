/**
 * The throttle lever of an engine that throttles, as a pilot's hand has it: where it stands, and
 * what that asks of the vehicle each tick (`Controls.throttle`, laid over the autopilot's with
 * `blend`). It is the flight deck's lever (cockpit.ts) with the page taken away, so that the way
 * from the lever to the engine can be flown in a test. Nothing here knows any flight; what the
 * engine then does with the figure is its nature's (vehicle.ts: below its least it is off, and it
 * starts again only as often as it can).
 */
import type { EngineNature } from '../types';

/** A notch of the lever, of rated thrust: one press of an arrow key. */
export const NOTCH = 0.05;

export class Lever {
  /** Where it stands, 0 to the engine's most. It starts at full. */
  at: number;
  /** The engine has been asked to start: until then the lever is only being set. */
  lit = false;
  readonly least: number;
  readonly most: number;

  constructor(range: NonNullable<EngineNature['throttle']>) {
    [this.least, this.most] = range;
    this.at = this.most;
  }

  /** Put it somewhere: no further than the engine's most. Under its least is allowed, and is off. */
  move(to: number): void {
    this.at = Math.max(0, Math.min(this.most, to));
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

/**
 * The simulation's clock: one instant that everything shown is shown at. It counts seconds from
 * an epoch, which for a flight is its launch, so `t` is the countdown and the mission clock in
 * one: negative before liftoff, positive after. The sky is computed from it today
 * (ephemeris.ts, by way of `jdUT`); the countdown's hardware and the flight itself will be.
 *
 * It starts stopped at the epoch, and it only moves when `advance` is called while it is running,
 * so a still view of a stopped clock costs nothing. `t` is a double of seconds: exact to a
 * microsecond over a century, where a Julian date holds 40 microseconds; the Julian date is made
 * from it only when an ephemeris asks.
 */
import { julianDate } from './time.ts';

/** How many seconds of the world pass in one of ours, from real time up to an hour a second: the steps `faster` and `slower` take. */
export const RATES: readonly number[] = [1, 10, 60, 600, 3600];

export class Clock {
  /** The Julian date (UT) of t = 0. */
  readonly epoch: number;
  private seconds = 0;
  private speed = 1;
  private going = false;
  private readonly listeners = new Set<() => void>();

  /** `epoch`: an ISO 8601 instant, as flight.ts records a launch. */
  constructor(epoch: string) {
    this.epoch = julianDate(epoch);
  }

  /** Seconds from the epoch: T minus (negative) or T plus. */
  get t(): number {
    return this.seconds;
  }

  /** The instant as a Julian date in UT, for time.ts and ephemeris.ts. */
  get jdUT(): number {
    return this.epoch + this.seconds / 86_400;
  }

  get running(): boolean {
    return this.going;
  }

  /** Seconds of the world per second of ours. Negative runs it backwards. */
  get rate(): number {
    return this.speed;
  }

  /** A frame has passed: `dt` seconds of ours. True if the instant moved. */
  advance(dt: number): boolean {
    if (!this.going || this.speed === 0 || dt === 0) return false;
    this.seconds += dt * this.speed;
    this.tell();
    return true;
  }

  /** Go to an instant, in seconds from the epoch. Running or not is left as it was. */
  seek(t: number): void {
    if (t === this.seconds) return;
    this.seconds = t;
    this.tell();
  }

  play(on = true): void {
    if (on === this.going) return;
    this.going = on;
    this.tell();
  }

  pause(): void {
    this.play(false);
  }

  setRate(rate: number): void {
    if (rate === this.speed) return;
    this.speed = rate;
    this.tell();
  }

  /** The next step up or down RATES from the nearest one to the present rate. */
  step(direction: 1 | -1): void {
    const size = Math.abs(this.speed);
    let nearest = 0;
    RATES.forEach((r, i) => {
      if (Math.abs(r - size) < Math.abs(RATES[nearest]! - size)) nearest = i;
    });
    this.setRate(RATES[Math.max(0, Math.min(RATES.length - 1, nearest + direction))]! * (this.speed < 0 ? -1 : 1));
  }

  /** Back to the epoch, stopped, at real time: as it started. */
  reset(): void {
    this.going = false;
    this.speed = 1;
    this.seconds = 0;
    this.tell();
  }

  /** Be told whenever the instant, the rate or running changes. Returns how to stop being told. */
  listen(heard: () => void): () => void {
    this.listeners.add(heard);
    return () => this.listeners.delete(heard);
  }

  private tell(): void {
    for (const heard of this.listeners) heard();
  }
}

const two = (n: number): string => String(n).padStart(2, '0');

/** Seconds from launch as a countdown reads it: 'T-00:08:45', 'T+00:02:22', with days in front past 24 hours. */
export function missionTime(t: number): string {
  const whole = Math.floor(Math.abs(t) + 1e-6);
  const sign = t < 0 && whole > 0 ? '−' : '+';
  const days = Math.floor(whole / 86_400);
  const clock = `${two(Math.floor((whole % 86_400) / 3600))}:${two(Math.floor((whole % 3600) / 60))}:${two(whole % 60)}`;
  return `T${sign}${days ? `${days}d ` : ''}${clock}`;
}

/**
 * The time on a wall clock at a place: hours, minutes and seconds of the civil day, and the
 * fraction of that day gone (0 at local midnight). `utcOffset` is the zone's hours ahead of UTC:
 * -5 for Eastern Standard Time.
 */
export function localTime(jdUT: number, utcOffset: number): { text: string; dayFraction: number; date: string } {
  const local = jdUT + utcOffset / 24 + 0.5; // days, turning over at local midnight
  const dayFraction = local - Math.floor(local);
  const seconds = Math.min(86_399, Math.floor(dayFraction * 86_400 + 1e-3));
  const date = new Date((Math.floor(local) - 2_440_588) * 86_400_000).toISOString().slice(0, 10);
  return { text: `${two(Math.floor(seconds / 3600))}:${two(Math.floor((seconds % 3600) / 60))}:${two(seconds % 60)}`, dayFraction, date };
}

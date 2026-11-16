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

/** How many seconds of the world pass in one of ours, from real time up to an hour a second: the steps `faster` and `slower` take, and the time bar's. */
export const RATES: readonly number[] = [1, 10, 60, 600, 3600];

/**
 * And beyond, for a coast of days between the Earth and the Moon (a day in nine seconds, then in under one): reached only
 * once something has let the clock go that fast (`allow`), and that something flies the coast on rails, not frame by frame
 * (docs/agents/world.md, "Faster than an hour a second"). On the ground they are not offered: at 100,000 times the Sun
 * crosses the sky in a third of a second.
 */
export const COAST_RATES: readonly number[] = [10_000, 100_000];

export class Clock {
  /** The Julian date (UT) of t = 0. */
  readonly epoch: number;
  private seconds = 0;
  private speed = 1;
  private going = false;
  private most = RATES[RATES.length - 1]!;
  private due = Number.NaN;
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

  /** The fastest it may run, either way: an hour a second unless something has allowed more. */
  get fastest(): number {
    return this.most;
  }

  /**
   * Let it run as fast as `fastest` seconds a second (one of COAST_RATES, for a coast flown on rails), or bring it back to
   * RATES's last. A rate past the new limit comes down to it.
   */
  allow(fastest: number): void {
    this.most = Math.max(1, fastest);
    if (Math.abs(this.speed) > this.most) this.setRate(Math.sign(this.speed) * this.most);
  }

  /** The next instant that must be lived through and not skipped (an engine to light, an arrival), or NaN for none. */
  get dueAt(): number {
    return this.due;
  }

  /**
   * The clock will not run past `t` (seconds from the epoch) faster than real time: a frame that would cross it stops on
   * it and the rate goes back to 1, still running, and the instant is forgotten. NaN for none. Whatever flies a coast on
   * rails sets the next thing it must not skip.
   */
  hold(t: number): void {
    this.due = t;
  }

  /** A frame has passed: `dt` seconds of ours. True if the instant moved. */
  advance(dt: number): boolean {
    if (!this.going || this.speed === 0 || dt === 0) return false;
    const to = this.seconds + dt * this.speed;
    const d = this.due;
    if (Math.abs(this.speed) > 1 && !Number.isNaN(d) && (to - d) * (this.seconds - d) <= 0 && this.seconds !== d) {
      this.seconds = d;
      this.due = Number.NaN;
      this.speed = Math.sign(this.speed);
    } else this.seconds = to;
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

  /** Seconds of the world a second, held to `fastest`. */
  setRate(rate: number): void {
    const held = Math.max(-this.most, Math.min(this.most, rate));
    if (held === this.speed) return;
    this.speed = held;
    this.tell();
  }

  /** The next step up or down the rates it may run at (RATES, and COAST_RATES as far as allowed) from the nearest to the present one. */
  step(direction: 1 | -1): void {
    const rates = [...RATES, ...COAST_RATES.filter((r) => r <= this.most)];
    const size = Math.abs(this.speed);
    let nearest = 0;
    rates.forEach((r, i) => {
      if (Math.abs(r - size) < Math.abs(rates[nearest]! - size)) nearest = i;
    });
    this.setRate(rates[Math.max(0, Math.min(rates.length - 1, nearest + direction))]! * (this.speed < 0 ? -1 : 1));
  }

  /** Back to the epoch, stopped, at real time, an hour a second at most and nothing held: as it started. */
  reset(): void {
    this.going = false;
    this.speed = 1;
    this.seconds = 0;
    this.most = RATES[RATES.length - 1]!;
    this.due = Number.NaN;
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

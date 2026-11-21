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

/** Each rate twice the one before it, from `from` up, and `most` itself to end on. */
function doubling(from: number, most: number): readonly number[] {
  const rates: number[] = [];
  for (let r = from; r < most; r *= 2) rates.push(r);
  return [...rates, most];
}

/**
 * How many seconds of the world pass in one of ours, from real time up to an hour a second, each twice the last (1, 2,
 * 4 ... 2048, and the hour itself): the steps `faster` and `slower` take, and the time bar's.
 */
export const RATES: readonly number[] = doubling(1, 3600);

/**
 * And beyond, doubling on from the hour a second (2, 4, 8 and 16 hours a second, then 100,000 times, a day in under a
 * second), for a coast of days between the Earth and the Moon: reached only once something has let the clock go that fast
 * (`allow`), and that something flies the coast on rails, not frame by frame (docs/agents/world.md, "Faster than an hour
 * a second"). On the ground they are not offered: at 100,000 times the Sun crosses the sky in a third of a second.
 */
export const COAST_RATES: readonly number[] = doubling(7200, 100_000);

/**
 * And on past a day a second, in ones, twos and fives to ten million times (a day in under a hundredth of a second), for
 * a coast far from every body: reached only as far as the coast's own rate lets the clock go (sim/rails.ts `railsRate`:
 * from how slowly the vehicle goes round the body it is nearest, and how near the next instant due is), so it is a
 * translunar coast's, not a low orbit's. Chosen: the 1-2-5 steps read as round numbers on the time bar.
 */
export const DEEP_RATES: readonly number[] = [200_000, 500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000];

/** The fastest the clock ever runs: the last of `DEEP_RATES`. */
export const DEEPEST: number = DEEP_RATES[DEEP_RATES.length - 1]!;

/** Where a warp is going (`Clock.warpTo`): the instant, seconds from the epoch, and what is there, in words. */
export interface Warp {
  t: number;
  what: string;
}

export class Clock {
  /** The Julian date (UT) of t = 0. */
  readonly epoch: number;
  private seconds = 0;
  private speed = 1;
  private going = false;
  private most = RATES[RATES.length - 1]!;
  private due = Number.NaN;
  private aim: Warp | null = null;
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
    // (a warp rides the limit, up as well as down: it goes as fast as it is let)
    if (this.aim) this.pace(this.most);
    else if (Math.abs(this.speed) > this.most) this.pace(Math.sign(this.speed) * this.most);
  }

  /** Where a warp is going, or null when none is. */
  get warp(): Warp | null {
    return this.aim;
  }

  /**
   * Go to `t` (seconds from the epoch, ahead of the present) as fast as the clock is let (`fastest`, which a warp keeps up
   * with as it changes), and stop on it at real time, still running, as on an instant held (`hold`). It stops sooner, on an
   * instant held before it, and it ends on anything that sets the rate (`step`, `setRate`, `endWarp`) or goes back to
   * the start (`reset`).
   */
  warpTo(t: number, what: string): void {
    if (!(t > this.seconds) || !Number.isFinite(t)) return;
    this.aim = { t, what };
    this.speed = this.most;
    this.going = true;
    this.tell();
  }

  /** The warp given up where it stands: real time, still running. Nothing happens if there is none. */
  endWarp(): void {
    if (!this.aim) return;
    this.aim = null;
    this.speed = 1;
    this.tell();
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
    // (the nearer of the instant held and a warp's end, whichever the frame would cross first)
    const crosses = (d: number) => !Number.isNaN(d) && (to - d) * (this.seconds - d) <= 0 && this.seconds !== d;
    const d = crosses(this.due) ? this.due : Number.NaN;
    const w = this.aim && crosses(this.aim.t) ? this.aim.t : Number.NaN;
    const stop = Number.isNaN(d) ? w : Number.isNaN(w) ? d : Math.abs(d - this.seconds) <= Math.abs(w - this.seconds) ? d : w;
    if (!Number.isNaN(stop) && (Math.abs(this.speed) > 1 || !Number.isNaN(w))) {
      this.seconds = stop;
      if (stop === this.due) this.due = Number.NaN;
      this.aim = null;
      this.speed = Math.sign(this.speed);
    } else this.seconds = to;
    this.tell();
    return true;
  }

  /** Go to an instant, in seconds from the epoch. Running or not is left as it was. */
  seek(t: number): void {
    if (t === this.seconds) return;
    this.seconds = t;
    if (this.aim && t >= this.aim.t) this.endWarp();
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
    this.aim = null;
    this.pace(rate);
  }

  /** The rate set, held to `fastest`, whatever a warp is doing. */
  private pace(rate: number): void {
    const held = Math.max(-this.most, Math.min(this.most, rate));
    if (held === this.speed) return;
    this.speed = held;
    this.tell();
  }

  /** The next step up or down the rates it may run at (RATES, and COAST_RATES and DEEP_RATES as far as allowed) from the nearest to the present one. A warp ends there. */
  step(direction: 1 | -1): void {
    const aimed = this.aim !== null;
    this.aim = null;
    const rates = [...RATES, ...[...COAST_RATES, ...DEEP_RATES].filter((r) => r <= this.most)];
    const size = Math.abs(this.speed);
    let nearest = 0;
    rates.forEach((r, i) => {
      if (Math.abs(r - size) < Math.abs(rates[nearest]! - size)) nearest = i;
    });
    this.setRate(rates[Math.max(0, Math.min(rates.length - 1, nearest + direction))]! * (this.speed < 0 ? -1 : 1));
    if (aimed) this.tell(); // (the warp gone, whether the rate moved or not)
  }

  /** Back to the epoch, stopped, at real time, an hour a second at most and nothing held: as it started. */
  reset(): void {
    this.going = false;
    this.speed = 1;
    this.seconds = 0;
    this.most = RATES[RATES.length - 1]!;
    this.due = Number.NaN;
    this.aim = null;
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

/**
 * A rate as the time bar writes it: whole, in thousands with commas past 9,999 and to three figures there (a warp's rate
 * follows the coast's limit, which is any number): '1×', '3600×', '100,000×', '2,370,000×'. Negative runs back.
 */
export function rateText(rate: number): string {
  const size = Math.abs(rate);
  const figures = size < 10_000 ? Math.round(size) : Number(size.toPrecision(3));
  return `${rate < 0 ? '−' : ''}${figures < 10_000 ? String(figures) : String(figures).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}×`;
}

/**
 * A mission time as typed: hours, minutes and seconds ('61:30', '61:30:00', '+61:30'), with days in front as the clock
 * writes them ('2d 13:30', 'T+2d 13:30:15'), or hours alone ('61'). Seconds from launch, or NaN for what is not one.
 */
export function parseMissionTime(text: string): number {
  const m = /^\s*(?:t\s*)?\+?\s*(?:(\d+)\s*d\s*)?(\d+)(?::(\d{1,2}))?(?::(\d{1,2}(?:\.\d+)?))?\s*$/i.exec(text);
  if (!m) return Number.NaN;
  const [days, hours, minutes, seconds] = [m[1], m[2], m[3], m[4]].map((x) => Number(x ?? 0)) as [number, number, number, number];
  if (minutes >= 60 || seconds >= 60) return Number.NaN;
  return days * 86_400 + hours * 3600 + minutes * 60 + seconds;
}

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

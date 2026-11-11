import type { Flight, ModelDef } from './types';
import type { Clock } from './world/clock.ts';
import { sliderAt } from './world/sequence.ts';

/**
 * The idle show. Left alone, the page does not sit still: the day runs (quickly through the
 * night, slowly enough through the count that the hardware is seen working) while the camera
 * goes from one thing to the next, takes the vehicle apart, opens it, looks in at a window, and
 * says in a callout what each thing is. Any touch of the page ends it and hands everything back.
 * It knows nothing of any flight: what there is to show, and when things move, come from the
 * flight's own data (its models, their parts, a model's slider and `sequence`).
 */

/** What the show asks of the page. Angles are radians: `turn` round from where the camera is, `rise` above the level. */
export interface DemoHost {
  /** Go to a section (a model of the flight). */
  show(model: string): void;
  /** The section as a whole. */
  whole(turn: number, rise: number): void;
  /** One part of the section; `inside` parts are seen with the section cut open. */
  part(node: string, inside: boolean, turn: number, rise: number): void;
  /** Take the section this far apart (0 to 1): only asked of a section whose slider is not the clock. */
  apart(t: number): void;
  /** Go up to the section's `n`th window and look in. False if it has no windows. */
  window(n: number): boolean;
  /** Say this about what is on show; `at` is the part it is about, 'window', or null for nothing in particular. */
  say(text: { eyebrow: string; title: string; text: string }, at: string | 'window' | null): void;
  /** It is dark: the Sun is down and what is seen is what the lamps light. */
  dark(): boolean;
  /** Nothing must start the show now: someone is on foot, a page is in front, the scene is not ready. */
  busy(): boolean;
  /** The show began or ended. */
  running(on: boolean): void;
}

export type Shot =
  | { model: string; kind: 'whole' }
  | { model: string; kind: 'apart'; to: 0 | 1 }
  | { model: string; kind: 'part'; node: string }
  | { model: string; kind: 'window'; n: number };

/** Seconds on one thing before going to the next. */
const DWELL: Record<Shot['kind'], number> = { whole: 7, apart: 7, part: 8.5, window: 8 };
/**
 * What the show is doing: watching hardware at work, going through everything in daylight, or
 * waiting out the night over the lit pad. Each runs the clock at its own pace, seconds of the
 * world per second of ours: the count slowly enough to see things move, the day long enough to
 * see every part by the Sun, the night quickly.
 */
export type Programme = 'work' | 'day' | 'night';
const PACE: Record<Programme, number> = { work: 150, day: 110, night: 1200 };
/** How far round the camera comes for each new thing, radians: always the same way, the way the view drifts. */
const TURN = 0.5;
/** Seconds to take a section apart or put it together. */
const APART = 5;
/** Seconds without a touch before the show starts by itself: the first time, and after it has been stopped. */
export const IDLE_FIRST = 20;
export const IDLE_AGAIN = 120;
/** Seconds the front page waits, untouched, before it fades into the show. */
export const IDLE_TITLE = 30;
const DAY = 86_400;

/** The stretch of the clock in which a flight's hardware is at work: from its first keyframe to a while after its last. Null if nothing is on the clock. */
export function workingHours(flight: Flight): [number, number] | null {
  const times = flight.models.flatMap((m) => (m.sequence ?? []).map((k) => k.at));
  return times.length ? [Math.min(...times) - 300, Math.max(...times) + 300] : null;
}

/** What the show does at `t`. */
export function programme(t: number, working: [number, number] | null, dark: boolean): Programme {
  if (working && t >= working[0] && t <= working[1]) return 'work';
  return dark ? 'night' : 'day';
}

/** How fast the clock runs during a programme. */
export const pace = (p: Programme): number => PACE[p];

/**
 * How much of a slider may pass in one of our seconds while something is moving: the whole of
 * a mast's fall or a cab's swing is seen happening, at any clock rate, instead of landing in a
 * frame or two. Between events the clock runs at the programme's pace again.
 */
const WATCHABLE = 0.012;
const SLOWEST = 4;

/** The clock's rate at `t`: the programme's pace, slowed wherever the flight's hardware is moving fast. */
export function watchablePace(flight: Flight, t: number, p: Programme): number {
  let rate = PACE[p];
  for (const m of flight.models) {
    if (!m.sequence) continue;
    // the fastest the slider moves from a little behind to well ahead (a few of our seconds at
    // full pace), per second of the world: slowing starts before the motion does
    let speed = 0;
    for (let at = t - 60; at < t + rate * 4; at += 10)
      speed = Math.max(speed, Math.abs(sliderAt(m.sequence, at + 10) - sliderAt(m.sequence, at)) / 10);
    if (speed > 0) rate = Math.min(rate, Math.max(SLOWEST, WATCHABLE / speed));
  }
  return rate;
}

/** Everything worth seeing of one section, in the order it is best seen. */
function sectionTour(m: ModelDef): Shot[] {
  const shots: Shot[] = [{ model: m.id, kind: 'whole' }];
  const outside = m.parts.filter((p) => !p.inside);
  const inside = m.parts.filter((p) => p.inside);
  const comesApart = Boolean(m.slider && !m.sequence);
  // taken apart, each part is seen clear of the rest; then it goes together again
  if (comesApart) shots.push({ model: m.id, kind: 'apart', to: 1 });
  for (const p of outside) shots.push({ model: m.id, kind: 'part', node: p.node });
  if (comesApart) shots.push({ model: m.id, kind: 'apart', to: 0 });
  // what is inside is seen through the cutaway, and then through the glass
  for (const p of inside) shots.push({ model: m.id, kind: 'part', node: p.node });
  if (m.cutaway || inside.length) shots.push({ model: m.id, kind: 'window', n: 0 });
  return shots;
}

/**
 * What to look at, in order. While hardware is at work the show stays with the model whose
 * sequence it is and goes round the parts of it that move. By day it goes through every section
 * in full. By night there is only what the lamps light: the place as a whole, from one side and
 * then another.
 */
export function tour(flight: Flight, doing: Programme): Shot[] {
  const machines = flight.models.filter((m) => m.sequence);
  if (doing === 'work' && machines.length)
    return machines.flatMap((m): Shot[] => [
      { model: m.id, kind: 'whole' },
      ...m.parts.filter((p) => p.moves?.length).map((p): Shot => ({ model: m.id, kind: 'part', node: p.node })),
    ]);
  if (doing === 'night') return (machines.length ? machines : flight.models).map((m): Shot => ({ model: m.id, kind: 'whole' }));
  // what is not on the clock first (the vehicle, the crew), then the machinery standing as it was left
  return [...flight.models.filter((m) => !m.sequence), ...machines].flatMap(sectionTour);
}

export class Demo {
  private on = false;
  private shots: Shot[] = [];
  private at = -1;
  private doing: Programme | null = null;
  private count = 0;
  /** How far apart the section on show is, and is going. */
  private apartNow = 0;
  private apartGoal = 0;
  /** Seconds until the next shot, and since the page was last touched. */
  private left = 0;
  private idle = 0;
  private wait = IDLE_FIRST;
  private readonly working: [number, number] | null;
  private readonly flight: Flight;
  private readonly clock: Clock;
  private readonly host: DemoHost;

  constructor(flight: Flight, clock: Clock, host: DemoHost) {
    this.flight = flight;
    this.clock = clock;
    this.host = host;
    this.working = workingHours(flight);
  }

  get active(): boolean {
    return this.on;
  }

  start(): void {
    if (this.on || this.host.busy()) return;
    this.on = true;
    this.at = -1;
    this.left = 0;
    this.shots = [];
    this.doing = null;
    this.apartNow = this.apartGoal = 0;
    // begin a little before the hardware starts to move, so the first thing seen is something happening
    if (this.working) this.clock.seek(this.working[0]);
    this.clock.play();
    this.host.running(true);
  }

  /** The page was touched. `keepClock`: the touch was on the clock itself, which is left as it is. */
  stop(keepClock = false): void {
    this.idle = 0;
    this.wait = IDLE_AGAIN;
    if (!this.on) return;
    this.on = false;
    if (!keepClock) this.clock.reset(); // back to liftoff, stopped: the inventory as it is studied
    this.host.running(false);
  }

  /** `dt` seconds of ours have passed. */
  tick(dt: number): void {
    if (!this.on) {
      this.idle += dt;
      if (this.idle >= this.wait) this.start();
      return;
    }
    if (this.host.busy()) {
      this.stop();
      return;
    }
    const { clock } = this;
    // the day goes round: a day after it began, it begins again
    const from = this.working ? this.working[0] : -DAY / 2;
    if (clock.t > from + DAY) clock.seek(from);
    const doing = programme(clock.t, this.working, this.host.dark());
    // eased toward, so a change of pace is a slowing and a quickening, never a lurch
    const want = watchablePace(this.flight, clock.t, this.doing ?? doing);
    const k = Math.min(1, dt * 2.5);
    clock.setRate(Math.exp(Math.log(clock.rate > 0 ? clock.rate : want) * (1 - k) + Math.log(want) * k));
    if (!clock.running) clock.play();
    // a section coming apart, or going together, does so over a few seconds
    if (this.apartNow !== this.apartGoal) {
      const step = dt / APART;
      this.apartNow =
        Math.abs(this.apartGoal - this.apartNow) <= step
          ? this.apartGoal
          : this.apartNow + Math.sign(this.apartGoal - this.apartNow) * step;
      const k = this.apartNow;
      this.host.apart(k * k * (3 - 2 * k)); // eased at both ends
    }
    this.left -= dt;
    if (doing !== this.doing) {
      // a change of programme: whatever is apart goes together first, then the new tour begins
      this.apartGoal = 0;
      if (this.apartNow !== 0) return;
      this.doing = doing;
      this.shots = tour(this.flight, doing);
      this.at = -1;
      this.left = 0;
    }
    if (this.left > 0) return;
    this.next();
  }

  private next(): void {
    for (let tries = 0; tries < this.shots.length; tries++) {
      this.at = (this.at + 1) % this.shots.length;
      if (this.take(this.shots[this.at]!)) return;
    }
  }

  /** Go to a shot. False if it cannot be taken (a section with no window): the next one is taken at once. */
  private take(shot: Shot): boolean {
    const model = this.flight.models.find((m) => m.id === shot.model)!;
    // The camera keeps going round the same way, a steady step each time, rising and sinking
    // slowly over several shots: one continuous walk round the subject, not a series of cuts.
    const n = this.count++;
    const turn = TURN;
    const rise = 0.2 + 0.1 * Math.sin(n * 0.9);
    this.host.show(shot.model);
    if (shot.kind === 'whole') {
      this.host.whole(turn, rise);
      this.host.say(
        {
          eyebrow: this.flight.designation,
          title: this.flight.callsign === model.name ? model.name : `${this.flight.callsign} · ${model.name}`,
          text: model.scale,
        },
        null,
      );
    } else if (shot.kind === 'apart') {
      this.apartGoal = shot.to;
      this.host.whole(turn, 0.2);
      this.host.say(
        shot.to
          ? { eyebrow: model.name, title: 'Taken apart', text: 'Every part, in the order it goes together.' }
          : { eyebrow: model.name, title: 'And together again', text: model.scale },
        null,
      );
    } else if (shot.kind === 'part') {
      const part = model.parts.find((p) => p.node === shot.node)!;
      this.host.part(part.node, Boolean(part.inside), turn, rise);
      this.host.say({ eyebrow: model.name, title: part.name, text: part.summary }, part.node);
    } else {
      if (!this.host.window(shot.n)) return false;
      this.host.say(
        {
          eyebrow: model.name,
          title: 'Through the glass',
          text: 'The windows are real openings: what is seen through them is what is inside.',
        },
        'window',
      );
    }
    this.left = DWELL[shot.kind];
    return true;
  }
}

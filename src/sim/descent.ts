/**
 * One body of an orbital flight's descent (`OrbitalFlight.descent.bodies`), as it comes down: its mass (the entry body
 * carrying the pilot until he leaves and the instrument module until the modules part), what drags it (its own, every
 * parachute filled, the one filling), what it puts out and when (by height, by time after the ejection, by a hand), and
 * the air's tearing of what is out. What the descent flown (orbital.ts `flyDown`) and a flier on its way down
 * (fliers.ts `descending`) both fly: the one object, so the path ahead of a body is the descent's own.
 *
 * It keeps no state of the flight itself (position, velocity, time: its caller's) and steps nothing: it says what pushes
 * the body at a state (`push`), does what is due at an instant (`events`), and wears what is out (`wear`). What it lets
 * loose (a body that leaves it at an event, what a canopy leaves behind) it hands to its caller (`DescentContext`).
 * `snapshot` and `restore` carry it whole from one run to another (a prediction begun part-way down).
 */
import type { EarthFrame } from '../world/earthframe.ts';
import { cross, length, scale, sub, type Vec3 } from '../world/frames.ts';
import type { State } from '../world/orbit.ts';
import { airDrag } from './air.ts';
import { atmosphere } from './atmosphere.ts';
import { along, chuteArea } from './fly.ts';
import { tearOf } from './loads.ts';
import {
  automatic,
  chuteEvent,
  type DescentBody,
  type DescentChute,
  type DescentHands,
  type DescentTear,
  type OrbitalFlight,
} from './orbital.ts';

/** What a body of the descent shares with the rest: the flight, its frame and sea, the hands, the one ejection, and where what it lets loose goes. */
export interface DescentContext {
  o: OrbitalFlight;
  frame: EarthFrame;
  seaLevel: number;
  hands?: DescentHands;
  /** When the pilot left, s from liftoff (NaN: not yet): one for every body. */
  ejected: { at: number };
  /** An event happened at `t` with the body at `s`: what leaves on it. */
  loose(event: string, t: number, s: State): void;
  /** A canopy that replaces its body leaves this behind, from `s` at `t`. */
  leaves(body: DescentBody, t: number, s: State): void;
}

/** What a body's descent holds, to carry it to another run. */
export interface DescentSnapshot {
  aboard: boolean;
  mass: number;
  base: number;
  filling: { area: number; at: number; fills: number; name: string } | null;
  kept: [string, number][];
  out: number[];
  times: Record<string, number>;
  gone: Record<string, number>;
  torn: Record<string, DescentTear>;
  worst: Record<string, { q: number; pull: number }>;
  ejected: number;
}

export class Descent {
  readonly body: DescentBody;
  /** The entry body: the first of the descent, which carries the pilot and the instrument module. */
  readonly entry: boolean;
  /** When each parachute came out, and was let go (`instead`), s from liftoff; each that tore; the most each met while out. */
  readonly times: Record<string, number> = {};
  readonly gone: Record<string, number> = {};
  readonly torn: Record<string, DescentTear> = {};
  readonly worst: Record<string, { q: number; pull: number }> = {};
  /** The pilot is aboard (the entry body, until the ejection). */
  aboard: boolean;
  mass: number;
  /** What is out for good, m^2: the body's own drag area, and every parachute filled. */
  base: number;
  filling: { area: number; at: number; fills: number; name: string } | null = null;
  /** Each parachute in `base`, by name, with its area (for `instead`). */
  readonly kept = new Map<string, number>();
  readonly out = new Set<number>();
  /** The instant the step under way began at: the instrument module hangs on until the modules part, and within a step it is as at its start. */
  as: number;
  private readonly ctx: DescentContext;
  private readonly spin: Vec3;
  private readonly floor: number;
  private readonly parted: number;
  private readonly joined: number;

  constructor(ctx: DescentContext, body: DescentBody, entry: boolean, t0: number) {
    const o = ctx.o;
    this.ctx = ctx;
    this.body = body;
    this.entry = entry;
    this.spin = ctx.frame.spin;
    this.floor = o.ejection.altitude.value;
    this.parted = o.entry.separation.value;
    this.joined = o.mass.value - o.entry.mass.value; // (the instrument module, while it hangs on)
    this.aboard = entry;
    this.mass = entry ? o.entry.mass.value : body.mass.value;
    this.base = body.dragArea.value;
    this.as = t0;
  }

  heightOf(q: State, at: number): number {
    return this.ctx.frame.place(q.r, at).height - this.ctx.seaLevel;
  }
  airOf(q: State): Vec3 {
    return sub(q.v, cross(this.spin, q.r));
  }
  massAt(_at: number): number {
    return this.mass + (this.entry && this.as < this.parted ? this.joined : 0);
  }
  private areaAt(at: number, h: number, mach: number): number {
    const o = this.ctx.o;
    const f = this.filling;
    return (
      (this.entry && h > this.floor + 1 ? o.entry.area.value * along(o.entry.drag, mach) - this.body.dragArea.value : 0) +
      this.base +
      (f ? chuteArea({ full: f.area, was: 0, at: f.at, fills: f.fills }, at) : 0)
    );
  }
  /** Everything but gravity on it at a state, over its mass, m/s^2. */
  push(q: State, at: number): Vec3 {
    const h = this.heightOf(q, at);
    const air = atmosphere(h);
    const wind = this.airOf(q);
    const speed = length(wind);
    return speed > 0
      ? scale(airDrag(wind, speed, air.density, this.areaAt(at, h, speed / air.soundSpeed)), 1 / this.massAt(at))
      : [0, 0, 0];
  }
  pressure(q: State, h: number): number {
    return 0.5 * atmosphere(h).density * length(this.airOf(q)) ** 2;
  }

  /** Parachute `c` (the `i`th of the body) out at `t`, torn at once in more air than its cloth takes. */
  private letOut(c: DescentChute, i: number, q: State, h: number, t: number): void {
    const body = this.body;
    const d = this.ctx.o.descent!;
    this.out.add(i);
    this.times[c.name] = t;
    this.ctx.loose(chuteEvent(body.id, c.name), t, q);
    // what was filling is full now, or is left behind with the seat
    if (c.replaces) {
      const leaves = c.replaces.leaves;
      if (leaves)
        this.ctx.leaves(
          {
            id: leaves.id,
            label: leaves.label,
            mass: { value: this.mass - c.replaces.mass.value, confidence: 'derived', source: `${body.id}'s mass less what goes on` },
            dragArea: leaves.dragArea,
            chutes: [],
          },
          t,
          q,
        );
      // (what was out goes with what is left behind, or, with nothing left behind, is let go)
      if (!leaves) for (const name of [...this.kept.keys(), ...(this.filling ? [this.filling.name] : [])]) this.gone[name] ??= t;
      this.base = 0;
      this.kept.clear();
      this.mass = c.replaces.mass.value;
    } else if (this.filling) {
      this.base += this.filling.area;
      this.kept.set(this.filling.name, this.filling.area);
    }
    const p = this.pressure(q, h);
    const tears = tearOf(p, 0, 0, { strength: c.strength?.value, torn: 0 }) !== null;
    if (tears) this.torn[c.name] = { t, by: 'pressure', q: p, pull: 0 };
    this.worst[c.name] = { q: p, pull: 0 };
    this.filling = { area: c.dragArea.value * (tears ? (d.torn?.value ?? 0) : 1), at: t, fills: c.fills.value, name: c.name };
    // what it takes the place of goes, with its drag
    for (const name of c.instead ?? []) {
      const area = this.kept.get(name);
      if (area === undefined) continue;
      this.base -= area;
      this.kept.delete(name);
      this.gone[name] = t;
    }
  }

  /** The air on what is out at `t`: a parachute in more than its cloth takes, or pulled harder than its lines take, tears. */
  wear(q: State, h: number, t: number): void {
    const d = this.ctx.o.descent!;
    const p = this.pressure(q, h);
    this.body.chutes.forEach((c, i) => {
      if (!this.out.has(i) || this.gone[c.name] !== undefined) return;
      const now = this.filling?.name === c.name ? this.filling : null;
      const area = now ? now.area * Math.min(1, Math.max(0, (t - now.at) / now.fills)) : this.kept.get(c.name);
      if (area === undefined) return;
      const pull = p * area;
      const m = this.worst[c.name]!;
      m.q = Math.max(m.q, p);
      m.pull = Math.max(m.pull, pull);
      if (this.torn[c.name] || (!c.strength && !c.pull)) return;
      const tear = tearOf(p, area, c.dragArea.value, { strength: c.strength?.value, pull: c.pull?.value, torn: d.torn?.value ?? 0 });
      if (!tear) return;
      this.torn[c.name] = { t, by: tear.by, q: p, pull };
      // (what is left streams: a part of its drag area, or what it had filled to if that was less)
      const left = tear.left;
      if (now) this.filling = null;
      else this.base -= area;
      this.base += left;
      this.kept.set(c.name, left);
    });
  }

  /** What is due at the instant `t` now reached: a hand's events, the ejection, the parachutes. `begun`: the body begins now. */
  events(q: State, h: number, falling: boolean, begun: boolean, t: number): void {
    const { hands, ejected } = this.ctx;
    const given = hands?.given ?? {};
    if (this.aboard) {
      const due =
        (given.ejection ?? Number.POSITIVE_INFINITY) <= t + 1e-9 ||
        (automatic(hands, t) && falling && h <= this.floor + (begun ? 1e-3 : 0));
      if (due) {
        this.aboard = false;
        ejected.at = t;
        this.mass = this.body.mass.value;
        this.ctx.loose('ejection', t, q);
      }
    }
    // (a parachute by its height or its time after the ejection: none at the instant a body begins but what a hand gave then)
    this.body.chutes.forEach((c, i) => {
      if (this.out.has(i)) return;
      const hand = (given[chuteEvent(this.body.id, c.name)] ?? Number.POSITIVE_INFINITY) <= t + 1e-9;
      const auto =
        !begun &&
        automatic(hands, t) &&
        (c.altitude ? h <= c.altitude.value && falling : c.after ? !Number.isNaN(ejected.at) && t - ejected.at >= c.after.value : false);
      if (hand || auto) this.letOut(c, i, q, h, t);
    });
  }

  /** The heights it will next do something coming down through, highest first: the ejection, each parachute's own still to come. */
  heights(): number[] {
    const out: number[] = [];
    if (this.aboard) out.push(this.floor);
    this.body.chutes.forEach((c, i) => {
      if (!this.out.has(i) && c.altitude) out.push(c.altitude.value);
    });
    return out.sort((a, b) => b - a);
  }

  /** What changes only at an event or a tear, as a word: a snapshot is kept where it changes. */
  key(): string {
    const f = this.filling;
    return `${this.aboard}|${this.mass}|${this.base}|${f?.name}|${f?.area}|${this.out.size}|${Object.keys(this.torn).length}|${Object.keys(this.gone).length}`;
  }

  snapshot(): DescentSnapshot {
    return {
      aboard: this.aboard,
      mass: this.mass,
      base: this.base,
      filling: this.filling ? { ...this.filling } : null,
      kept: [...this.kept],
      out: [...this.out],
      times: { ...this.times },
      gone: { ...this.gone },
      torn: { ...this.torn },
      worst: Object.fromEntries(Object.entries(this.worst).map(([k, v]) => [k, { ...v }])),
      ejected: this.ctx.ejected.at,
    };
  }

  /** A body's descent as a snapshot left it, in a new context (its own ejection taken from it). */
  static restore(ctx: DescentContext, body: DescentBody, entry: boolean, t: number, s: DescentSnapshot): Descent {
    const d = new Descent(ctx, body, entry, t);
    d.aboard = s.aboard;
    d.mass = s.mass;
    d.base = s.base;
    d.filling = s.filling ? { ...s.filling } : null;
    for (const [k, v] of s.kept) d.kept.set(k, v);
    for (const i of s.out) d.out.add(i);
    Object.assign(d.times, s.times);
    Object.assign(d.gone, s.gone);
    Object.assign(d.torn, s.torn);
    for (const [k, v] of Object.entries(s.worst)) d.worst[k] = { ...v };
    ctx.ejected.at = s.ejected;
    return d;
  }
}

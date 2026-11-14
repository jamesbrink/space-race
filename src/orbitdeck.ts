import { type CockpitHost, Deck, type DeckSpec, type Figure, tank } from './deck';
import type { OrbitalFlight } from './sim/orbital.ts';
import { orbitPredictor } from './sim/orbitpath.ts';
import type { Predictor } from './sim/predict.ts';
import { aboutAxis, multiply, normalize, type Quat, turn } from './sim/rigid.ts';
import { byHand, type FlownWhole, flowOf, flyWhole, held, integral, recordSamples } from './sim/staged.ts';
import type { LiveSample } from './sim/vehicle.ts';
import type { SitedFlight } from './types';
import type { Run } from './viewer/ascent';
import { firesOf, orbitalEvents, orbitalFlown, orbitalRecord } from './viewer/ascent';
import type { DeckNews } from './viewer/cabin';
import type { Clock } from './world/clock.ts';
import { sunPosition } from './world/ephemeris.ts';
import { angleBetween, DEG, siteFrame, type Vec3 } from './world/frames.ts';
import { elementsOf } from './world/orbit.ts';
import { greenwichSiderealTime, julianDate, terrestrialTime } from './world/time.ts';

/**
 * The flight deck's kind for a flight into orbit (`Flight.orbital` with an `ascent`): the deck (deck.ts) is the one every
 * flight has; what is this kind's is what the flight's record says it had. Nothing here knows which flight it is: the
 * stages, the events and what the hands could reach are the flight's record (sim/orbital.ts: `manual`).
 *
 * As flown, the whole flight is automatic, as Vostok's was: the ascent on its law (sim/staged.ts), the coast, the
 * braking burn at the record's instant aimed as the record has it, the descent. The pilot rides, and the clock runs it
 * (up to 3,600 times life: an orbit in a minute and a half). That run is the record's own, the same physics.
 *
 * By hand: once the spacecraft is alone, the code on the lock (`manual.code`, typed as its digits) frees the hand
 * controls, as the envelope aboard did. Then W S A D Q E turn the spacecraft about its own axes at the hand
 * controller's rate (`manual.rate`, estimated), the automatic burn is given up, and Space fires the braking engine
 * along the spacecraft's long axis as it then points, for as long as its integrator takes to reach its impulse
 * (`manual.deltaV` at `manual.thrust`). From there the coast, the entry and the descent are flown again (orbital.ts
 * flyOrbit, with that aim; flyDown) and shown: where it comes down, against the record's landing. The attitude is turned
 * as a hand turns it, not flown as a rigid body: the jets, their gas and the tumbles of the record are not modelled.
 */
const KM = 1000;
const KEYS: Record<string, [axis: Vec3, sense: number]> = {
  w: [[0, 1, 0], 1],
  s: [[0, 1, 0], -1],
  a: [[0, 0, 1], 1],
  d: [[0, 0, 1], -1],
  q: [[1, 0, 0], -1],
  e: [[1, 0, 0], 1],
};
/** The states of the deck a control in the cabin can stand by (CabinDef.controls[].holds): the hand controls freed, or not. */
const FREE: ReadonlySet<string> = new Set(['free']);
const NONE: ReadonlySet<string> = new Set();
/** The figures going up, as a ballistic flight's; and once the spacecraft is alone, its orbit's. */
const RISING: Figure[] = [
  { id: 'altitude', label: 'Height', unit: 'km', about: 'Height above the sea' },
  { id: 'speed', label: 'Speed', unit: 'm/s', about: 'Speed over the turning Earth (Earth-fixed)' },
  { id: 'climb', label: 'Climb', unit: 'm/s', about: 'How fast it is rising' },
  { id: 'g', label: 'Load', unit: 'g', about: 'What an accelerometer reads' },
  { id: 'mach', label: 'Mach', unit: '', about: 'Speed through the air over the speed of sound there' },
];
const ORBITING: Figure[] = [
  RISING[0]!,
  { id: 'speed', label: 'Speed', unit: 'm/s', about: 'Speed in the frame that does not turn: the orbital speed (space-fixed)' },
  { id: 'apogee', label: 'Apogee', unit: 'km', about: 'The orbit’s highest point now, over the record’s reference ball' },
  {
    id: 'perigee',
    label: 'Perigee',
    unit: 'km',
    about: 'The orbit’s lowest point now, over the same ball: under the ground, it comes down',
  },
  { id: 'period', label: 'Period', unit: 'min', about: 'Once round the orbit now' },
];
/** A stage's name, short: before its first comma ('Strap-on boosters, Blocks B, V, G, D' is 'Strap-on boosters'). */
const short = (name: string) => name.split(',')[0]!.replace('Strap-on boosters', 'Strap-ons');

export class OrbitDeck extends Deck {
  /** When each of the record's events happens on the run on show (viewer/ascent.ts `orbitalEvents`): what the cabin's lamps read. */
  private times: Record<string, number> = {};
  /** The record's run, and the one on show (the record's, or one with a burn by hand). */
  private record: Run | null = null;
  private run: Run | null = null;
  private flown: FlownWhole | null = null;
  /** The lock: digits typed so far; freed once the code is in. */
  private typed = '';
  private free = false;
  /** The hand's attitude (fly.ts's frame, body to frame) and when it was last turned; the burn by hand, once fired. */
  private hand: { q: Quat; t: number; log: { t: number; q: Quat }[] } | null = null;
  private fired: number | null = null;
  /** The record as this flight now has it: the record's own, its burn given up (hands free, nothing fired), or the hand's burn. */
  private planned: OrbitalFlight | null = null;

  constructor(parent: HTMLElement, flight: SitedFlight, clock: Clock, host: CockpitHost) {
    super(parent, flight, clock, host, OrbitDeck.spec(flight));
    this.systems();
  }

  private static spec(flight: SitedFlight): DeckSpec {
    const code = String(flight.orbital?.manual?.code.value ?? '');
    return {
      figures: RISING,
      readings: [
        { id: 'q', label: 'Pressure', unit: 'kPa', about: 'Dynamic pressure: the push of the air' },
        { id: 'alpha', label: 'Off wind', unit: '°', about: 'The angle between the nose and the motion through the air' },
        { id: 'range', label: 'Range', unit: 'km', about: 'Distance over the ground from the pad' },
        { id: 'pitch', label: 'Pitch', unit: '°', about: 'The nose above the level: 90 is straight up' },
        { id: 'inclination', label: 'Inclination', unit: '°', about: 'The orbit’s plane against the equator, once there is an orbit' },
        {
          id: 'aim',
          label: 'Off retro',
          unit: '°',
          about: 'How far the long axis (the braking engine’s push) is from straight against the motion: 0 is retrograde',
        },
      ],
      guidance: 'Guidance: the record’s automatic flight, the ascent on its steering law',
      sequence: 'Sequencer: the record’s events at their times',
      choose: false,
      flightKeys: code
        ? `<span class="deck-turn" title="The lock on the hand controls: its code, typed in order, frees them once the spacecraft is alone">${[
            ...code,
          ]
            .map((d) => `<button data-press="${d}" title="A digit of the lock’s code (${d})"><kbd>${d}</kbd></button>`)
            .join('')}<em>lock</em></span>`
        : '',
      enter: 'Fly this flight: as flown, or take the controls (L)',
    };
  }

  get able(): boolean {
    return Boolean(this.flight.orbital?.ascent && this.flight.flies);
  }
  /** No vehicle of sim/vehicle.ts's is flown here: the guidance's programme is not drawn ahead on the path. */
  get craft(): null {
    return null;
  }
  /** What the predicted path is made from (viewer/path.ts): this flight's plan, as it stands. */
  get plan(): string {
    return this.fired !== null ? `hand ${this.fired}` : this.free ? 'free' : 'record';
  }

  /** The path ahead from a sample of the spacecraft alone: none on the launch vehicle, whose law the path does not fly. */
  predict(start: { t: number; r: Vec3; v: Vec3 }): Predictor | null {
    const o = this.flight.orbital!;
    if (start.t <= this.parting) return null;
    let plan = this.planned ?? o;
    if (this.free && this.fired === null) {
      // the timer's burn given up and none fired yet: it stays up, as far as anyone has said
      plan = structuredClone(o);
      plan.retro.on.value = plan.retro.off.value = plan.entry.separation.value = Number.MAX_SAFE_INTEGER;
    }
    return orbitPredictor(plan, siteFrame(this.flight.site), julianDate(this.flight.launch), this.flight.site.seaLevel.value, start);
  }

  get steering(): { guidance: boolean; sequence: boolean; trim: { pitch: number; yaw: number } } {
    return { guidance: !this.free, sequence: !this.free, trim: { pitch: 0, yaw: 0 } };
  }
  // (no mechanism, no part's command yet: the deck of a ballistic flight has them)
  travel(_id: string, _t: number): number | null {
    return null;
  }
  work(_id: string): string | null {
    return null;
  }
  headed(_id: string): boolean | null {
    return null;
  }
  can(_what: string): boolean {
    return false;
  }
  /**
   * A control in the cabin (CabinDef `does`): a key of the lock (`code:<digit>`), the same as its digit typed; the braking
   * engine's button, the same as Space once the hands are free; the manual orientation's switch (`manual`), which the
   * lock throws: it says whether the hand controller has the attitude.
   */
  ask(what: string): void {
    if (!this.on) return;
    if (what.startsWith('code:')) this.digit(what.slice(5));
    else if (what === 'manual')
      this.host.say?.(
        'Manual orientation',
        this.free ? 'On: the hand controller has the attitude (W S A D Q E)' : 'Locked: the code on the lock frees it',
      );
    else if (what === 'retro' && this.free && this.fired === null && this.hand) this.fire(this.clock.t);
    else if (what === 'retro') this.host.say?.('Braking engine', this.free ? 'Fired already' : 'Locked: the hand controls are not free');
  }

  enter(): void {
    if (!this.able || this.on) return;
    this.opened();
    this.fresh();
  }

  leave(): void {
    if (!this.on) return;
    this.closed('Fly this flight: as flown, or take the controls (L)');
  }

  /** When the spacecraft leaves the last stage, s. */
  private get parting(): number {
    const o = this.flight.orbital!;
    return o.stages[o.stages.length - 1]!.separation?.value ?? Infinity;
  }

  /** The systems strip, from the record: what each stage has left, the braking engine, the lock, and what is burning. */
  private systems(): void {
    const o = this.flight.orbital!;
    const el = this.cells.get('systems')!;
    const code = String(o.manual?.code.value ?? '');
    el.innerHTML = `
      <div class="tank engine" title="What is burning, and what kind of engines they are"><span>Engine</span><b data-cell="engine"></b><i data-cell="engine-kind"></i></div>
      ${o.stages.map((s, i) => tank(`stage-${i}`, short(s.name), `${s.name}: propellant left of what it carries${s.count > 1 ? `, the ${s.count} together` : ''}`)).join('')}
      <div class="tank engine" title="The braking engine: when it fires, and how"><span>Braking</span><b data-cell="retro"></b><i></i></div>
      ${code ? `<div class="tank jets" title="The lock on the hand controls: a lamp for each digit of its code typed in order"><span>Lock</span><b>${[...code].map((d, i) => `<u data-digit="${i}">${d}</u>`).join('')}<u data-cell="lock"></u></b></div>` : ''}
      <div class="tank motors" title="Every engine burning now, with its thrust"><span>Burning</span><b data-cell="motors"></b></div>`;
    for (const cell of el.querySelectorAll<HTMLElement>('[data-cell]')) this.cells.set(cell.dataset.cell!, cell);
  }

  /** Back on the pad, the clock stopped at liftoff, the lock shut. */
  private fresh(): void {
    this.clock.reset();
    this.record ??= orbitalRecord(this.flight);
    this.run = this.record;
    this.flown = null;
    this.typed = '';
    this.free = false;
    this.hand = null;
    this.fired = null;
    this.planned = null;
    this.times = orbitalEvents(this.flight, orbitalFlown(this.flight));
    this.host.fly(this.run);
    this.show();
  }

  protected command(what: string): void {
    if (!this.on) return;
    if (what === 'leave') this.leave();
    else if (what === 'again') this.fresh();
    else if (what === 'next') this.next();
    else if (what === 'guidance' || what === 'sequence' || what === 'abort')
      this.host.say?.(what === 'abort' ? 'Abort' : 'As flown', 'The record’s automatic flight: nothing to switch');
    this.show();
  }

  /** The lock's digits are keys of this kind's. */
  protected override extraKey(key: string): boolean {
    if (!/^[0-9]$/.test(key)) return false;
    this.digit(key);
    return true;
  }

  /** Space: liftoff from the pad; with the hand controls free and the burn not yet made, the braking engine. */
  private next(): void {
    const t = this.clock.t;
    if (t <= 0 && !this.clock.running) {
      this.clock.play(true);
      return;
    }
    if (this.free && this.fired === null && this.hand) this.fire(t);
  }

  /** A digit on the lock: the code in order frees the hand controls, once the spacecraft is alone in orbit. */
  private digit(d: string): void {
    const o = this.flight.orbital!;
    const code = String(o.manual?.code.value ?? '');
    if (!code || this.free) return;
    const alone = this.clock.t > this.parting;
    this.typed = (this.typed + d).slice(-code.length);
    if (this.typed !== code) return void this.show();
    if (!alone) {
      this.host.say?.('Hand controls', 'Not on the launch vehicle: there were none to free');
      this.typed = '';
      return void this.show();
    }
    if (this.clock.t >= o.retro.on.value) {
      this.host.say?.('Hand controls', 'The braking burn has been made: the descent is the automatic system’s');
      return;
    }
    this.free = true;
    // (the timer's burn given up: nothing of the descent happens until a hand fires the engine)
    for (const id of ['retro-command', 'retro-on', 'retro-off', 'retro-timer', 'modules', 'ejection']) this.times[id] = Infinity;
    for (const id of Object.keys(this.times)) if (id.endsWith('-down')) this.times[id] = Infinity;
    const s = this.sampleAt(this.clock.t);
    this.hand = { q: s.attitude, t: s.t, log: [{ t: s.t, q: s.attitude }] };
    this.host.say?.(
      'Hand controls free',
      'Manual descent: not the flight of 12 April. Turn with W S A D Q E, fire the braking engine with Space',
    );
    this.show();
  }

  /** Fire the braking engine by hand along the long axis as it points: the rest of the flight flown again from it. */
  private fire(t: number): void {
    const o = this.flight.orbital!;
    const m = o.manual!;
    const site = siteFrame(this.flight.site);
    const jd = julianDate(this.flight.launch);
    const gast0 = greenwichSiderealTime(jd);
    this.turnTo(t);
    // the long axis in fly.ts's frame, into the inertial frame of date
    const x = turn(this.hand!.q, [1, 0, 0]);
    const [c, s] = [Math.cos(gast0), Math.sin(gast0)];
    const aim: Vec3 = [c * x[0] - s * x[1], s * x[0] + c * x[1], x[2]];
    const plan = byHand(o, t, aim);
    const burn = plan.retro.off.value - t;
    this.planned = plan;
    this.flown = flyWhole(plan, site, jd, this.flight.site.seaLevel.value, undefined, 1, 'published');
    const samples = recordSamples(plan, this.flown, jd, (this.flight.flies?.datum ?? 0) + (o.ascent!.centre?.value ?? 0), (at) =>
      sunPosition(terrestrialTime(jd + at / 86_400)),
    );
    // as the hand turned it, to the burn's end, then as it falls
    const log = this.hand!.log;
    for (const sample of samples) {
      if (sample.t < log[0]!.t || sample.t > t + burn) continue;
      const at = log.filter((k) => k.t <= sample.t).at(-1) ?? log[0]!;
      sample.attitude = at.q;
      sample.axis = turn(at.q, [1, 0, 0]);
    }
    const record = this.record!;
    this.fired = t;
    this.times = orbitalEvents(this.flight, this.flown, { on: t, off: t + burn, parting: plan.entry.separation.value });
    // what leaves at the modules' parting and at the ejection leaves when this flight has them, or never
    const ejected = this.flown.coast.results.ejectionAt;
    const dropped = this.flight.flies!.drops.map((d, i) =>
      d.on === 'modules'
        ? plan.entry.separation.value
        : d.on === 'ejection'
          ? Number.isFinite(ejected)
            ? ejected
            : Infinity
          : record.dropped[i]!,
    );
    this.run = {
      ...record,
      samples,
      dropped,
      duration: samples[samples.length - 1]!.t,
      fires: firesOf(this.flight, this.flown, { on: t, off: t + burn }),
    };
    this.host.fly(this.run);
    this.host.say?.('Braking engine', `Fired by hand: ${burn.toFixed(0)} s to ${m.deltaV.value} m/s`);
  }

  /** Turn the hand's attitude on to `t` by the keys held and the finger's stick. */
  private turnTo(t: number): void {
    const h = this.hand;
    if (!h || this.fired !== null) return;
    const dt = t - h.t;
    h.t = t;
    const push = this.push();
    if (dt <= 0 || (push.pitch === 0 && push.yaw === 0 && push.roll === 0)) return;
    const rate = this.flight.orbital!.manual!.rate.value * DEG;
    let q = h.q;
    q = normalize(multiply(q, aboutAxis(KEYS.w![0], push.pitch * rate * dt)));
    q = normalize(multiply(q, aboutAxis(KEYS.a![0], push.yaw * rate * dt)));
    q = normalize(multiply(q, aboutAxis(KEYS.e![0], push.roll * rate * dt)));
    h.q = q;
    h.log.push({ t, q });
  }

  /** Which way the hands push, each -1 to 1: the keys held, and the finger's stick and roll laid over them. */
  private push(): { pitch: number; yaw: number; roll: number } {
    const axis = (plus: string, minus: string, finger: number) =>
      Math.max(-1, Math.min(1, Number(this.held.has(plus)) - Number(this.held.has(minus)) + finger));
    return { pitch: axis('w', 's', this.finger.pitch), yaw: axis('a', 'd', this.finger.yaw), roll: axis('e', 'q', this.finger.roll) };
  }

  private sampleAt(t: number): LiveSample {
    const samples = this.run!.samples as readonly LiveSample[];
    let lo = 0;
    let hi = samples.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (samples[mid]!.t <= t) lo = mid;
      else hi = mid;
    }
    return samples[t >= samples[hi]!.t ? hi : lo]!;
  }

  /** The clock has moved: turn by hand, put the moment on the instruments, and stop at the end. */
  protected follow(): void {
    if (!this.on || !this.run) return;
    const t = this.clock.t;
    if (t < 0) this.clock.seek(0);
    if (this.free && this.fired === null && this.hand) {
      this.turnTo(t);
      // the turned attitude is what the scene shows from here on
      const samples = this.run.samples as LiveSample[];
      const copy = samples.map((s) =>
        s.t >= this.hand!.log[0]!.t ? { ...s, attitude: this.hand!.q, axis: turn(this.hand!.q, [1, 0, 0]) } : s,
      );
      // (and the timer's burn given up: the braking engine does not fire at the record's instant)
      this.run = { ...this.run, samples: copy, fires: firesOf(this.flight, orbitalFlown(this.flight), { on: Infinity, off: Infinity }) };
      this.host.fly(this.run);
    }
    if (t > this.run.duration + 12) {
      this.clock.pause();
      this.clock.seek(this.run.duration + 12);
    }
    this.show();
  }

  /** What came of a burn by hand: where the pilot came down against the record's landing, or that it stays up. */
  private outcome(t: number): string {
    const pilot = this.landed(this.flown);
    if (!pilot) return 'Still in orbit: it comes down only as the orbit decays, on ten days of supplies';
    if (!this.run || t < this.run.duration) return 'Fired: what follows is flown from your burn';
    return `Down at ${pilot.latitude.toFixed(2)}° N ${pilot.longitude.toFixed(2)}° E, ${this.apart(pilot).toFixed(0)} km from where the record has the landing, at ${pilot.speed.toFixed(1)} m/s`;
  }
  private landed(whole: FlownWhole | null) {
    const down = whole?.down;
    return down ? (down.landed.pilot ?? Object.values(down.landed)[0]) : undefined;
  }
  /** How far a landing is from the record's, km. */
  private apart(at: { latitude: number; longitude: number }): number {
    const o = this.flight.orbital!;
    const [la, lo] = [o.landing.latitude.value * DEG, o.landing.longitude.value * DEG];
    const [pa, po] = [at.latitude * DEG, at.longitude * DEG];
    return 6_371 * Math.acos(Math.min(1, Math.sin(la) * Math.sin(pa) + Math.cos(la) * Math.cos(pa) * Math.cos(po - lo)));
  }
  /** A time of the flight as a clock on the wall read it that day. */
  private wall(at: number): string {
    return new Date(Date.parse(this.flight.launch) + at * 1000 + this.flight.site.zone.utcOffset * 3600_000).toISOString().slice(11, 19);
  }

  /** What each stage has left at `t` on the record's run, kg (of what it can burn), and whether it is still aboard. */
  private stagesAt(t: number): { left: number; full: number; aboard: boolean; burning: boolean }[] {
    const o = this.flight.orbital!;
    const stops = orbitalFlown(this.flight).ascent.stops;
    return o.stages.map((s, i) => {
      const full = s.count * (s.usable ?? s.propellant).value;
      const from = s.ignition.value;
      const burned = s.count * flowOf(s) * integral(s.throttle, from, Math.max(from, Math.min(t, stops[i]!)));
      const sep = s.separation?.value ?? Infinity;
      return { left: Math.max(0, full - burned), full, aboard: t < sep, burning: t > 0 && t >= from && t < stops[i]! };
    });
  }

  private show(): void {
    if (!this.run) return;
    const o = this.flight.orbital!;
    const t = Math.max(0, this.clock.t);
    const s = this.sampleAt(t);
    const pushed = this.free && this.fired === null ? this.push() : { pitch: 0, yaw: 0, roll: 0 };
    const news: DeckNews = { times: this.times, hand: pushed, holds: this.free ? FREE : NONE };
    for (const fn of this.watchers) fn(s, null, news);
    const set = (id: string, text: string) => this.put(id, text);
    const jd = julianDate(this.flight.launch);
    const gast0 = greenwichSiderealTime(jd);
    const [c, sn] = [Math.cos(gast0), Math.sin(gast0)];
    const into = (v: Vec3): Vec3 => [c * v[0] - sn * v[1], sn * v[0] + c * v[1], v[2]];
    const el = elementsOf(into(s.r), into(s.v));
    const ball = o.orbit.radius.value;
    const alone = t > this.parting;
    const orbit = el.e < 1;
    this.figures(alone ? ORBITING : RISING);
    set('altitude', (Math.max(0, s.altitude) / KM).toFixed(s.altitude < 99_950 ? 2 : 1));
    set('speed', (alone ? s.speed : t > 0 ? s.groundSpeed : 0).toFixed(0));
    set('climb', (t > 0 ? s.groundSpeed * Math.sin(s.groundClimb * DEG) : 0).toFixed(0));
    set('g', t > 0 ? s.g.toFixed(2) : '1.00'); // (on the pad it stands on the launch system: one g)
    set('mach', s.mach.toFixed(2));
    set('apogee', orbit ? ((el.a * (1 + el.e) - ball) / KM).toFixed(0) : '—');
    set('perigee', orbit ? ((el.a * (1 - el.e) - ball) / KM).toFixed(0) : '—');
    set('period', orbit && el.a > ball ? ((2 * Math.PI * Math.sqrt(el.a ** 3 / 3.986004418e14)) / 60).toFixed(1) : '—');
    set('q', (s.q / 1000).toFixed(1));
    set('alpha', t > 0 && s.groundSpeed > 5 && s.q > 1 ? s.alpha.toFixed(1) : '–');
    set('range', (s.range / KM).toFixed(s.range < 99_950 ? 2 : 1));
    const up = s.r;
    set('pitch', (90 - angleBetween(s.axis, up) / DEG).toFixed(0));
    set('inclination', alone && orbit ? (el.i / DEG).toFixed(2) : '–');
    const v = s.v;
    const off = Math.acos(Math.max(-1, Math.min(1, -(s.axis[0] * v[0] + s.axis[1] * v[1] + s.axis[2] * v[2]) / Math.hypot(...v)))) / DEG;
    set('aim', alone ? off.toFixed(0) : '–');
    // the systems: each stage's propellant, the braking engine, the lock
    const stages = this.stagesAt(t);
    stages.forEach((st, i) => {
      const id = `stage-${i}`;
      const part = st.full > 0 ? st.left / st.full : 0;
      const row = this.cells.get(id)!.parentElement!;
      set(id, st.aboard ? (part < 0.002 ? 'Empty' : `${(part * 100).toFixed(0)} %`) : 'Gone');
      set(`${id}-kg`, st.aboard && part >= 0.002 ? `${st.left.toFixed(0)} kg` : '');
      row.style.setProperty('--left', `${st.aboard ? (100 * part).toFixed(0) : 0}%`);
      row.classList.toggle('low', st.aboard && part < 0.2);
    });
    const burning = o.stages.filter((_, i) => stages[i]!.burning).map((st) => short(st.name));
    const braking = t >= o.retro.on.value && t < o.retro.off.value && this.fired === null && !this.free;
    const thrust = s.burning.reduce((sum, m) => sum + m.thrust, 0);
    set('engine', burning.length ? `${burning.join(' + ')}` : braking ? 'Braking engine' : t <= 0 ? 'Not lit' : 'None burning');
    set('engine-kind', 'fixed thrust, cut by the record');
    const command = o.events.find((e) => e.id === 'retro-command')?.at.value ?? o.retro.on.value;
    set('retro', this.fired !== null ? `By hand, ${this.wall(this.fired)}` : this.free ? 'Yours: Space' : `Timer, ${this.wall(command)}`);
    set('lock', this.free ? 'Free' : 'Locked');
    for (const lamp of this.root.querySelectorAll<HTMLElement>('[data-digit]'))
      lamp.classList.toggle('on', this.free || Number(lamp.dataset.digit) < this.typed.length);
    set('motors', thrust > 0 ? `${burning.join(' + ') || 'braking'} ${(thrust / 1000).toFixed(0)} kN` : '–');
    const phase =
      t <= 0
        ? 'On the pad'
        : s.phase === 'powered'
          ? 'Powered flight'
          : s.phase === 'coast'
            ? 'On the third stage'
            : s.phase === 'capsule'
              ? 'In orbit'
              : s.phase === 'entry'
                ? 'Re-entry'
                : t >= this.run.duration
                  ? 'Down'
                  : 'Under the parachutes';
    set('phase', phase);
    // (from the spacecraft's separation the run is the published orbit begun where the simulated ascent left it: said, so it is not taken for a result)
    set(
      'mode',
      this.free
        ? 'Manual descent: not the flight of 12 April'
        : alone
          ? 'On the published orbit: the simulated ascent fell short (Flown)'
          : 'As flown: automatic',
    );
    for (const id of ['guidance', 'sequence']) this.root.querySelector(`[data-do=${id}]`)!.setAttribute('aria-pressed', String(!this.free));
    const waiting = t <= 0 && !this.clock.running;
    const can = waiting || (this.free && this.fired === null);
    set('next', waiting ? 'Ignition' : can ? 'Braking engine' : 'Nothing to do: it flies itself');
    this.root.querySelector<HTMLButtonElement>('[data-do=next]')!.disabled = !can;
    this.root.querySelector<HTMLButtonElement>('[data-do=abort]')!.disabled = true;
    this.root.classList.toggle('waiting', waiting);
    this.root.classList.toggle('thrusting', burning.length > 0 && t > 0);
    const code = String(o.manual?.code.value ?? '');
    const prompt = this.cells.get('prompt')!;
    const text = waiting
      ? 'Ready: Space lights the engines; the flight is the record’s'
      : !alone
        ? 'The launch vehicle flies itself: its pilot had no controls going up'
        : this.free
          ? this.fired === null
            ? 'Turn the long axis against the motion, then fire'
            : this.outcome(t)
          : code && t < o.retro.on.value
            ? `The hand controls are locked: the code ${[...code].join('-')} frees them`
            : 'The descent is automatic';
    if (prompt.textContent !== text) prompt.textContent = text;
    prompt.hidden = !text;
    this.card(t);
  }

  /**
   * Down: the card of the flight against the record's, as the ballistic deck's is. The figures are the run's own (sim/staged.ts
   * `held`), whoever flew it; a check the record's own run is known to miss is marked so, from tests/staged.test.mjs's reasons
   * as mission.md states them, by name only.
   */
  private card(t: number): void {
    const el = this.root.querySelector<HTMLElement>('.cockpit-card')!;
    const whole = this.flown ?? orbitalFlown(this.flight);
    const down = this.landed(whole);
    // (the run on show follows the descent module down; the pilot lands under his canopy some minutes after it)
    const over = this.run !== null && down !== undefined && t >= this.run.duration;
    if (el.hidden === !over && el.dataset.at === String(this.fired)) return;
    el.hidden = !over;
    el.dataset.at = String(this.fired);
    if (!over) return;
    const o = this.flight.orbital!;
    const show = (unit: string, v: number) =>
      unit === 'm' ? `${(v / 1000).toFixed(1)} km` : unit === 's' ? this.wall(v) : `${v.toFixed(unit === 'deg' ? 2 : 1)} ${unit}`;
    // (the coast's and the descent's: what a pilot's hand can change. The ascent's are the Flown panel's)
    const rows = held(o, whole)
      .slice(o.ascent?.checks.length ?? 0)
      .filter((c) => Number.isFinite(c.got) && c.id !== 'period')
      .map(
        (c) =>
          `<tr${Math.abs(c.got - c.value) > c.tolerance ? ' class="out"' : ''}><th>${c.label}</th><td>${show(c.unit, c.got)}</td><td>${show(c.unit, c.value)}</td></tr>`,
      )
      .join('');
    el.innerHTML = `
      <h3>${this.fired !== null ? 'Down, by your own braking burn' : 'Down, as the automatic system flew it'}</h3>
      <p class="cockpit-why">The descent module landed at ${this.wall(this.run!.duration)}; the pilot at ${this.wall(down.at)}, ${down.latitude.toFixed(2)}° N ${down.longitude.toFixed(2)}° E, at ${down.speed.toFixed(1)} m/s: ${this.apart(down).toFixed(0)} km from where the record has the landing.${this.fired !== null ? ' A manual descent: not the flight of 12 April.' : ''}</p>
      <table>
        <thead><tr><td></td><td>You</td><td>${this.flight.callsign}</td></tr></thead>
        ${rows}
      </table>
      <p class="cockpit-why">Amber rows are outside the tolerance the record sets. The flight as recorded misses several of them itself (the Flown panel, and the flight’s mission.md, say why).</p>
      <p><button data-do="again"><kbd>N</kbd> Fly it again</button><button data-do="leave"><kbd>Esc</kbd> Leave</button></p>`;
  }
}

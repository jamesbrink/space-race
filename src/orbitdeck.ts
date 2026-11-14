import { type CockpitHost, Deck, type DeckSpec, type Figure, tank } from './deck';
import { automatic, chuteEvent, type DescentHands, decay, type OrbitalFlight } from './sim/orbital.ts';
import { orbitPredictor } from './sim/orbitpath.ts';
import type { Predictor } from './sim/predict.ts';
import { aboutAxis, multiply, normalize, type Quat, turn } from './sim/rigid.ts';
import { Sheds } from './sim/shed.ts';
import {
  type Ascended,
  byHand,
  type DrawnDescent,
  descentOf,
  type FlownWhole,
  flowOf,
  flyOn,
  held,
  integral,
  published,
  recordSamples,
} from './sim/staged.ts';
import {
  ascentSample,
  type StagedPilot,
  type StagedPilotOptions,
  type StagedState,
  StagedTally,
  type StagedVehicle,
  type Step,
  stagedPilot,
  stagedVehicle,
} from './sim/stagedlive.ts';
import { type LiveSample, TICK } from './sim/vehicle.ts';
import { downVerdict } from './sim/verdict.ts';
import type { SitedFlight } from './types';
import type { Run } from './viewer/ascent';
import { firesOf, orbitalEvents, orbitalFlown, orbitalRecord, pushedOff } from './viewer/ascent';
import type { DeckNews } from './viewer/cabin';
import type { Clock } from './world/clock.ts';
import { sunPosition } from './world/ephemeris.ts';
import { add, angleBetween, DEG, scale, siteFrame, type Vec3 } from './world/frames.ts';
import { EARTH_ROTATION_RATE } from './world/bodies.ts';
import { elementsOf, subpoint } from './world/orbit.ts';
import { greenwichSiderealTime, julianDate, terrestrialTime } from './world/time.ts';

/**
 * The flight deck's kind for a flight into orbit (`Flight.orbital` with an `ascent`): the deck (deck.ts) is the one every
 * flight has; what is this kind's is what the flight's record says it had. Nothing here knows which flight it is: the
 * stages, the events and what the hands could reach are the flight's record (sim/orbital.ts: `manual`).
 *
 * As flown (the default): the whole flight is automatic, as Vostok's was, and the run is the record's own (sim/staged.ts
 * flyWhole): the ascent on its law, the coast, the braking burn at the record's instant, the descent. The pilot rides.
 * Once the spacecraft is alone the code on the lock (`manual.code`, typed as its digits) frees the hand controls, as the
 * envelope aboard did: W S A D Q E turn the spacecraft at the hand controller's rate (`manual.rate`, estimated), the
 * timer's burn is given up, and Space fires the braking engine along the long axis for its integrator's impulse.
 *
 * Taken over (G, B or Space in the ascent; or either switch thrown on the pad): from that instant the flight is the
 * user's and not the record's, and the deck says so. The launch vehicle is the live staged vehicle (sim/stagedlive.ts:
 * the batch run's stages, engines, drag and air, a rigid body steered at a stated acceleration), caught up to the record
 * at that instant and flown on: guidance on, the law flies it and W S A D lean the law; off, the keys are the steering;
 * the sequencer on, the record's steps come at its times, off, Space sets off each in turn (a stage lit, cut, let go; the
 * fairing; the spacecraft parted), whenever it is pressed. Parted, the spacecraft coasts from where this ascent left it
 * (orbital.ts flyOrbit), short of an orbit or not: no handover to the published orbit. Its hand controls are the user's
 * without the lock, and the braking burn is Space. The attitude in orbit is turned as a hand turns it, not flown as a
 * rigid body: the jets, their gas and the tumbles of the record are not modelled.
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
/** How often a live sample is kept for the scene, s; the most flight one frame steps, s; Space's guard between two presses, s. */
const KEEP = 0.1;
const MOST = 5;
const GUARD = 1.5;
/** How fast a held key leans the law guidance flies, radians a second, and the most it may lean (as the ballistic deck's). */
const TRIM = 3 * DEG;
const TRIM_MOST = 30 * DEG;
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
/** A stage's name, short: before its first comma ('Strap-on boosters, Blocks B, V, G, D' is 'Strap-ons'). */
const short = (name: string) => name.split(',')[0]!.replace('Strap-on boosters', 'Strap-ons');
const ENTER = 'Fly this flight: as flown, or take it over (L)';

export class OrbitDeck extends Deck {
  /** When each of the record's events happens on the run on show (viewer/ascent.ts `orbitalEvents`): what the cabin's lamps read. */
  private times: Record<string, number> = {};
  /** The record's run, and the one on show (the record's, the user's, or either with a burn by hand). */
  private record: Run | null = null;
  private run: Run | null = null;
  private flown: FlownWhole | null = null;
  /** The lock: digits typed so far; the hands free (by the code, or because the flight is the user's). */
  private typed = '';
  private free = false;
  /** The hand's attitude (fly.ts's frame, body to frame) and when it was last turned; the burn by hand, once fired. */
  private hand: { q: Quat; t: number; log: { t: number; q: Quat }[] } | null = null;
  private fired: number | null = null;
  /** The record as this flight now has it: the record's own, its burn given up (hands free, nothing fired), or the hand's burn. */
  private planned: OrbitalFlight | null = null;
  /** How it is flown: the two switches, and how far the hands have leaned the law. */
  private guidance = true;
  private sequence = true;
  private trim = { pitch: 0, yaw: 0 };
  /** When the flight became the user's (0 from the pad), or null while it is the record's. */
  private mine: number | null = null;
  /** The live staged vehicle and its state while the user's flight is on the launch vehicle; its pilot and what the hands asked. */
  private vehicle: StagedVehicle | null = null;
  private state: StagedState | null = null;
  private pilot: StagedPilot | null = null;
  private options: StagedPilotOptions = { guidance: true, sequence: true };
  private asked: Step[] = [];
  private tally: StagedTally | null = null;
  private kept = 0;
  private eventAt = Number.NEGATIVE_INFINITY;
  /** The user's ascent as staged.ts's batch run has its results, once the spacecraft has parted (for the coast and the checks). */
  private ascended: Ascended | null = null;
  private told = 0;
  /**
   * The descent by hand (sim/orbital.ts `DescentHands`): each event a hand gave and when, the automatic sequence's switch as
   * it was thrown, the modules parted by hand; when the descent was taken from the record's flight (null while it is the
   * record's); and how long the orbit lasts, for the flight on show that stays up (worked once: orbital.ts `decay`).
   */
  private given: Record<string, number> = {};
  private switched: { t: number; on: boolean }[] = [];
  private partedBy: number | null = null;
  private downMine: number | null = null;
  private lasts: { of: FlownWhole; s: number } | null = null;
  /** The plan the flight on show was last flown on (`refly`), and how many times it has been: the card is made again when it is. */
  private flownPlan: OrbitalFlight | null = null;
  private flownAt = 0;

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
      guidance:
        'Guidance: the automatic flight, the ascent on its steering law, and a key held leans it. Off, the hands fly alone: the record’s pilot had no such control, so switching it takes the flight over',
      sequence:
        'Sequencer: the record’s events at their times. Off, each is set off by hand with Space: the record’s pilot could not, so switching it takes the flight over',
      choose: false,
      flightKeys: code
        ? `<span class="deck-turn" title="The lock on the hand controls: its code, typed in order, frees them once the spacecraft is alone">${[
            ...code,
          ]
            .map((d) => `<button data-press="${d}" title="A digit of the lock’s code (${d})"><kbd>${d}</kbd></button>`)
            .join('')}<em>lock</em></span>`
        : '',
      enter: ENTER,
    };
  }

  get able(): boolean {
    return Boolean(this.flight.orbital?.ascent && this.flight.flies);
  }
  /** No vehicle of sim/vehicle.ts's is flown here: the ballistic guidance's programme is not drawn ahead on the path. */
  get craft(): null {
    return null;
  }
  /** What the predicted path is made from (viewer/path.ts): this flight's plan, as it stands. */
  get plan(): string {
    return `${this.mine === null ? 'record' : `mine ${this.mine}`}|${this.fired !== null ? `hand ${this.fired}` : this.free ? 'free' : 'timer'}`;
  }

  /**
   * The path ahead from a sample: with the spacecraft alone, its coast as planned (the timer's burn, a hand's, or none);
   * on the launch vehicle, where it goes if the engines stopped now, with nothing more done (no burn), flown by the same
   * coast. That coast's drag is the spacecraft's ball's, not the stack's: low in the air the path is drawn as if the ball
   * flew it, so where a vehicle cut low comes down is nearer than drawn (said here, and in the flight's README).
   */
  predict(start: { t: number; r: Vec3; v: Vec3 }): Predictor | null {
    const o = this.flight.orbital!;
    let plan = this.planned ?? o;
    if (start.t <= this.parting || (this.free && this.fired === null)) plan = this.givenUp();
    return orbitPredictor(plan, siteFrame(this.flight.site), julianDate(this.flight.launch), this.flight.site.seaLevel.value, start);
  }

  get steering(): { guidance: boolean; sequence: boolean; trim: { pitch: number; yaw: number } } {
    return { guidance: this.guidance && !this.free, sequence: this.sequence && !this.free, trim: this.trim };
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
  /**
   * Whether a part's command (`Part.commands`) can act now: a step of the launch vehicle while it is still on it and not yet
   * done (on the record's flight, not yet come: asking it takes the flight over, as Space does); the braking engine once
   * the hand controls are free and it has not fired.
   */
  can(what: string): boolean {
    if (!this.on) return false;
    if (what.startsWith('descent:')) return this.descentWhy(what.slice(8)) === null;
    if (what === 'retro') return this.free && this.fired === null && this.hand !== null && this.retroWhy() === null;
    const step = stepOf(what);
    if (!step || this.ascended || this.clock.t > this.parting) return false;
    return this.undone(step);
  }

  /** Whether a step of the launch vehicle is still to be taken on the flight on show at the clock's instant. */
  private undone(st: Step): boolean {
    const s = this.state;
    const v = this.vehicleOf();
    if (this.mine === null || !s) {
      // the record's: what has not happened by now (a stage cut or let go at its time, a drop at its)
      const t = this.clock.t;
      const o = this.flight.orbital!;
      if (st.kind === 'drop') return (o.ascent?.drops.find((d) => d.id === st.id)?.at.value ?? -Infinity) > t;
      const g = o.stages[st.stage];
      if (!g || (g.separation?.value ?? Infinity) <= t) return false;
      if (st.kind === 'ignite') return g.ignition.value > t;
      if (st.kind === 'cut') return g.ignition.value <= t && g.cutoff.value > t;
      return true;
    }
    if (st.kind === 'drop') return !Number.isFinite(s.drops[st.id] ?? Infinity);
    const g = s.stages[st.stage];
    if (!g || Number.isFinite(g.gone)) return false;
    if (st.kind === 'ignite') return !Number.isFinite(g.from);
    if (st.kind === 'cut') return Number.isFinite(g.from) && v.burning(s, st.stage);
    return true;
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
    else if (what.startsWith('step:')) {
      const step = stepOf(what);
      if (!step || !this.can(what)) return;
      if (this.mine === null) {
        this.takeOver();
        this.host.say?.('Taken over', `Not the flight of ${this.day}: Gagarin had no say over the launch vehicle`);
      }
      this.eventAt = performance.now() / 1000;
      this.asked.push(step);
      if (!this.clock.running) this.clock.play(true);
    } else if (what.startsWith('descent:')) this.give(what.slice(8));
    else if (what === 'retro' && this.can('retro')) this.fire(this.clock.t);
    else if (what === 'retro')
      this.host.say?.('Braking engine', !this.free ? 'Locked: the hand controls are not free' : (this.retroWhy() ?? 'Fired already'));
  }

  enter(): void {
    if (!this.able || this.on) return;
    this.opened();
    this.fresh();
  }

  leave(): void {
    if (!this.on) return;
    this.closed(ENTER);
  }

  /** When the spacecraft leaves the last stage on the flight on show, s. */
  private get parting(): number {
    const o = this.flight.orbital!;
    if (this.mine !== null) return this.ascended?.separation.t ?? Infinity;
    return o.stages[o.stages.length - 1]!.separation?.value ?? Infinity;
  }
  /** The day of the record's flight, as the deck says it ('12 April'). */
  private get day(): string {
    return new Date(this.flight.launch).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  }
  /** The record with its timer's burn given up: nothing fires until a hand does. */
  private givenUp(): OrbitalFlight {
    const plan = structuredClone(this.flight.orbital!);
    plan.retro.on.value = plan.retro.off.value = plan.entry.separation.value = Number.MAX_SAFE_INTEGER;
    return plan;
  }

  /** The systems strip: what each stage has left, the braking engine, the lock, and what is burning. */
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

  /** Back on the pad, the clock stopped at liftoff, the lock shut, the flight the record's. */
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
    this.mine = this.guidance && this.sequence ? null : 0;
    this.state = null;
    this.pilot = null;
    this.asked = [];
    this.tally = null;
    this.ascended = null;
    this.trim = { pitch: 0, yaw: 0 };
    this.eventAt = Number.NEGATIVE_INFINITY;
    this.given = {};
    this.switched = [];
    this.partedBy = null;
    this.downMine = null;
    this.lasts = null;
    this.flownPlan = null;
    this.flownAt++;
    this.times = orbitalEvents(this.flight, orbitalFlown(this.flight));
    this.host.fly(this.run);
    this.show();
  }

  protected command(what: string): void {
    if (!this.on) return;
    if (what === 'leave') return void this.leave();
    if (what === 'again') this.fresh();
    else if (what === 'next') this.next();
    else if (what === 'guidance' || what === 'sequence') this.toggle(what);
    else if (what === 'abort') this.host.say?.('Abort', 'Not simulated for this flight');
    this.show();
  }

  /** The lock's digits are keys of this kind's. */
  protected override extraKey(key: string): boolean {
    if (!/^[0-9]$/.test(key)) return false;
    this.digit(key);
    return true;
  }

  /** A hand went to the controls: on the record's ascent there were none, and the deck says so and how to take over. */
  protected override steered(): void {
    if (!this.on || performance.now() - this.told < 4000) return;
    const t = this.clock.t;
    if (this.mine === null && t <= this.parting && (t > 0 || this.clock.running)) {
      this.told = performance.now();
      this.host.say?.('No hand controls going up', `As on ${this.day}: G or B takes the flight over, and it is yours`);
    } else if (!this.free && t > this.parting && this.fired === null) {
      this.told = performance.now();
      const code = String(this.flight.orbital!.manual?.code.value ?? '');
      this.host.say?.(
        'Hand controls locked',
        `${code ? `The code ${[...code].join('-')} frees them, as the envelope did; or ` : ''}G takes them`,
      );
    }
  }

  /** G or B: on the pad a switch; going up, the flight taken over and the switch thrown; with the spacecraft alone, the hands freed. */
  private toggle(which: 'guidance' | 'sequence'): void {
    const t = this.clock.t;
    const waiting = t <= 0 && !this.clock.running;
    if (!waiting && t > this.parting) {
      // (B, alone: the descent's automatic sequence off or on again; before the timer's burn that gives the burn up too)
      if (which === 'sequence' && !this.burnPending(t)) return void this.switchDescent();
      if (!this.free && this.fired === null) {
        this.freeHands(`Taken over: not the flight of ${this.day}. Turn with W S A D Q E, fire the braking engine with Space`);
        if (which === 'sequence') this.switchDescent();
      }
      return;
    }
    if (!waiting && this.mine === null) this.takeOver();
    this[which] = !this[which];
    this.options.guidance = this.guidance;
    this.options.sequence = this.sequence;
    if (waiting) this.mine = this.guidance && this.sequence ? null : 0;
  }

  /** Space: the next thing to do. */
  private next(): void {
    const t = this.clock.t;
    const now = performance.now() / 1000;
    if (this.state && t < this.state.t - TICK) return void this.clock.play(true); // (looking back: run on)
    if (now - this.eventAt < GUARD) return;
    if (t <= 0 && !this.clock.running) {
      this.eventAt = now;
      if (this.mine !== null) this.liftoff();
      this.clock.setRate(1);
      this.clock.play(true);
      return;
    }
    if (t <= this.parting && !this.ascended) {
      const step = this.nextStep();
      if (!step) return;
      this.eventAt = now;
      if (this.mine === null) this.takeOver();
      this.asked.push(step.step);
      if (!this.clock.running) this.clock.play(true);
      return;
    }
    if (this.can('retro')) {
      this.eventAt = now;
      this.fire(t);
      return;
    }
    // the descent's next event not yet given: in the order the record's run has them
    const next = this.nextDescent();
    if (next) {
      this.eventAt = now;
      this.give(next.id);
    }
  }

  /** The next step of the record's sequence this flight has not taken: on the record's run, the next in time; on the user's, the first not done. */
  private nextStep(): { step: Step; label: string } | null {
    const v = this.vehicleOf();
    if (this.mine === null) return v.sequence.find((k) => k.at > this.clock.t + 1e-9) ?? null;
    const s = this.state;
    if (!s) return null;
    return (
      v.sequence.find((k) => {
        const st = k.step;
        if (st.kind === 'drop') return !Number.isFinite(s.drops[st.id] ?? Infinity);
        const g = s.stages[st.stage]!;
        if (Number.isFinite(g.gone)) return false;
        if (st.kind === 'ignite') return !Number.isFinite(g.from);
        if (st.kind === 'cut') return Number.isFinite(g.from) && v.burning(s, st.stage);
        return true;
      }) ?? null
    );
  }

  private vehicleOf(): StagedVehicle {
    if (!this.vehicle) {
      const o = this.flight.orbital!;
      this.vehicle = stagedVehicle(
        o,
        siteFrame(this.flight.site),
        julianDate(this.flight.launch),
        this.flight.site.seaLevel.value,
        orbitalFlown(this.flight).ascent.solved,
      );
    }
    return this.vehicle;
  }

  /** The user's flight from the pad: the live vehicle standing there, its first stages lit now. */
  private liftoff(): void {
    const v = this.vehicleOf();
    const o = this.flight.orbital!;
    this.begin(v.start(), 0);
    this.asked.push(...o.stages.flatMap((s, i) => (s.ignition.value <= 0 ? [{ kind: 'ignite' as const, stage: i }] : [])));
    this.say();
  }

  /**
   * The flight taken over at the clock's instant on the record's ascent: the live vehicle flown from the pad on the law, its
   * attitude placed as the batch run places it (the two agree to a hundredth of a metre a second: tests/stagedlive.test.mjs),
   * up to this instant, and handed to the user's switches from there.
   */
  private takeOver(): void {
    const t = Math.max(0, this.clock.t);
    const v = this.vehicleOf();
    const o = this.flight.orbital!;
    const site = siteFrame(this.flight.site);
    const jd = julianDate(this.flight.launch);
    const solved = orbitalFlown(this.flight).ascent.solved;
    this.options = { guidance: this.guidance, sequence: this.sequence, memo: { thetaTurn: null } };
    const caught = stagedPilot(v, solved, site, jd, this.flight.site.seaLevel.value, {
      ...this.options,
      guidance: true,
      sequence: true,
      prescribed: true,
      memo: this.options.memo,
    });
    let s = v.tick(v.start(), {
      pitch: 0,
      yaw: 0,
      roll: 0,
      steps: o.stages.flatMap((st, i) => (st.ignition.value <= 0 ? [{ kind: 'ignite' as const, stage: i }] : [])),
    });
    const tally = new StagedTally(v);
    while (s.t < t - TICK / 2 && !s.parted) {
      const was = s;
      s = v.tick(s, caught);
      tally.note(was, s);
    }
    s = { ...s, controls: { pitch: 0, yaw: 0, roll: 0 } };
    this.begin(s, t, tally);
    this.say();
  }

  /** The live vehicle's flight begun at `s`, the run on show the record's up to `from` and this flight's after. */
  private begin(s: StagedState, from: number, tally?: StagedTally): void {
    const v = this.vehicleOf();
    const o = this.flight.orbital!;
    this.mine = from;
    this.state = s;
    this.tally = tally ?? new StagedTally(v);
    this.options.guidance = this.guidance;
    this.options.sequence = this.sequence;
    this.options.memo ??= { thetaTurn: null };
    const inner = stagedPilot(
      v,
      orbitalFlown(this.flight).ascent.solved,
      siteFrame(this.flight.site),
      julianDate(this.flight.launch),
      this.flight.site.seaLevel.value,
      {
        ...this.options,
        hands: () => {
          const p = this.push();
          return this.guidance ? { pitch: 0, yaw: 0, roll: p.roll } : p;
        },
        steps: () => this.asked.splice(0),
      },
    );
    const options = this.options;
    // (the switches are read every tick: one pilot flies the whole flight, so the law's turn is the one it began)
    this.pilot = (st) => {
      if (this.guidance) {
        const p = this.push();
        const lean = (now: number, by: number) => Math.max(-TRIM_MOST, Math.min(TRIM_MOST, now + by * TRIM * TICK));
        this.trim = { pitch: lean(this.trim.pitch, p.pitch), yaw: lean(this.trim.yaw, p.yaw) };
      }
      options.trim = this.trim;
      return inner(st);
    };
    // the run: the record's up to here, then this flight's
    const record = this.record!;
    const before = (record.samples as LiveSample[]).filter((x) => x.t < from - 1e-9);
    const sample = v.sample(s, (this.flight.flies?.datum ?? 0) + (o.ascent!.centre?.value ?? 0));
    const sheds = new Sheds(
      { area: o.ascent!.drag[0]!.area, body: { sheds: o.ascent!.sheds ?? [] } },
      siteFrame(this.flight.site),
      this.flight.site.seaLevel.value,
    );
    this.run = {
      ...record,
      samples: [...before, sample],
      duration: Infinity,
      cutoff: Infinity,
      dropped: this.flight.flies!.drops.map(() => Infinity),
      sheds,
      live: true,
      descent: null,
    };
    this.kept = this.run.samples.length;
    this.dropsFrom(s, from);
    this.host.fly(this.run);
  }

  /** The note that the flight is now the user's, with what the record's pilot could do. */
  private say(): void {
    this.host.say?.(
      'Your flight',
      `Not the flight of ${this.day}: its pilot had no controls going up, and behind the lock only orientation and the braking burn`,
    );
  }

  /** The instant each of `flies.drops` leaves on this flight, and its body put in the scene as it leaves. */
  private dropsFrom(s: StagedState, from = -Infinity): void {
    const run = this.run!;
    const o = this.flight.orbital!;
    const record = this.record!;
    this.flight.flies!.drops.forEach((d, i) => {
      if (Number.isFinite(run.dropped[i]!)) return;
      const drop = o.ascent!.drops.find((x) => x.id === d.on);
      const event = o.events.find((e) => e.id === d.on);
      const stage = event ? o.stages.findIndex((st) => st.separation && Math.abs(st.separation.value - event.at.value) < 1e-6) : -1;
      // (the record's, for what left before the flight was taken over)
      const at = drop ? (s.drops[drop.id] ?? Infinity) : stage >= 0 ? s.stages[stage]!.gone : Infinity;
      const was = record.dropped[i]!;
      const when = was < from ? was : at;
      if (!Number.isFinite(when)) return;
      run.dropped[i] = when;
      const def = o.ascent!.sheds?.find((x) => x.on === d.on);
      if (!def?.mass || !def.centre || !def.gyration || !(when >= from)) return;
      const x = this.sampleAt(when);
      const m = def.mass.value;
      run.sheds?.add({
        on: def.on,
        t: when,
        r: add(x.r, scale(x.axis, def.centre.value)),
        v: pushedOff(def, x.v, x.axis, o.mass.value),
        q: x.attitude,
        w: [0, 0, 0],
        mass: m,
        roll: m * def.gyration.roll.value ** 2,
        across: m * def.gyration.across.value ** 2,
        centre: def.centre.value,
      });
    });
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
    if (this.mine === null && this.clock.t >= o.retro.on.value) {
      this.host.say?.('Hand controls', 'The braking burn has been made: the descent is the automatic system’s');
      return;
    }
    this.freeHands(`Manual descent: not the flight of ${this.day}. Turn with W S A D Q E, fire the braking engine with Space`);
  }

  /** The hand controls free: the timer's burn given up, the attitude the hand's from this instant (and the flight flown again without that burn). */
  private freeHands(why: string | null): void {
    this.free = true;
    if (why !== null) this.refly();
    // (the timer's burn given up: nothing of the descent happens until a hand fires the engine)
    for (const id of ['retro-command', 'retro-on', 'retro-off', 'retro-timer', 'modules', 'ejection']) this.times[id] = Infinity;
    for (const id of Object.keys(this.times)) if (id.endsWith('-down')) this.times[id] = Infinity;
    const s = this.sampleAt(this.clock.t);
    this.hand = { q: s.attitude, t: s.t, log: [{ t: s.t, q: s.attitude }] };
    if (why) this.host.say?.('Hand controls free', why);
    this.show();
  }

  /** The coast and what follows on this flight with `plan`: from where the user's ascent left the spacecraft, or the record's whole flight. */
  private whole(plan: OrbitalFlight, hands?: DescentHands): FlownWhole {
    const site = siteFrame(this.flight.site);
    const jd = julianDate(this.flight.launch);
    const sea = this.flight.site.seaLevel.value;
    // (the record's ascent as the scene has it, then the published orbit from where it left the spacecraft: staged.ts flyWhole's 'published')
    if (this.mine === null || !this.ascended) {
      const record = orbitalFlown(this.flight);
      return flyOn(plan, site, jd, sea, record.ascent, published(plan, record.ascent.separation), hands);
    }
    return flyOn(plan, site, jd, sea, this.ascended, this.ascended.separation, hands);
  }

  /** What this flight gave for each of the record's checks (sim/staged.ts `held`): the ascent's only where the ascent was the user's. */
  private heldOf(): Record<string, number> | undefined {
    const o = this.flight.orbital!;
    if (!this.flown) return undefined;
    const all = held(o, this.flown).slice(this.mine !== null ? 0 : (o.ascent?.checks.length ?? 0));
    return Object.fromEntries(all.map((c) => [c.id, c.got]));
  }

  /** The bodies down from the ejection on this flight as flown now, for the scene to carry what came down on each. */
  private descentOf(): DrawnDescent | null {
    const o = this.flight.orbital!;
    const centre = (this.flight.flies?.datum ?? 0) + (o.ascent!.centre?.value ?? 0);
    return this.flown ? descentOf(this.flown, julianDate(this.flight.launch), centre, o.descent?.ground.value) : null;
  }

  /** Samples the scene can show of a whole flight from `plan`: the user's ascent's own, then the coast's. */
  private samplesOf(plan: OrbitalFlight, whole: FlownWhole): LiveSample[] {
    const o = this.flight.orbital!;
    const jd = julianDate(this.flight.launch);
    const centre = (this.flight.flies?.datum ?? 0) + (o.ascent!.centre?.value ?? 0);
    const all = recordSamples(plan, whole, jd, centre, (at) => sunPosition(terrestrialTime(jd + at / 86_400)));
    if (this.mine === null) return all;
    const mine = (this.run!.samples as LiveSample[]).filter((x) => x.t <= this.ascended!.separation.t + 1e-9);
    return [...mine, ...all.slice(1)];
  }

  /** The spacecraft has parted on the user's flight: its coast from there, the hands free. */
  private parted(s: StagedState): void {
    const v = this.vehicleOf();
    const at = ascentSample(v, s);
    const tally = this.tally!;
    this.ascended = {
      samples: [at],
      at: tally.at,
      summary: tally.summary,
      solved: orbitalFlown(this.flight).ascent.solved,
      stops: this.flight.orbital!.stages.map((_, i) => Math.min(s.stages[i]!.to, v.dry(i, s.stages[i]!.from), s.stages[i]!.gone)),
      left: v.left(s),
      separation: s.parted!,
      plane: v.plane,
    };
    const plan = this.givenUp();
    this.flown = this.whole(plan);
    const samples = this.samplesOf(plan, this.flown);
    this.run = { ...this.run!, samples, duration: samples[samples.length - 1]!.t, descent: this.descentOf(), held: this.heldOf() };
    this.dropsFrom(s);
    this.times = orbitalEvents(this.flight, this.flown);
    this.freeHands(null);
    const el = elementsOf(s.parted!.r, s.parted!.v);
    const perigee = (el.a * (1 - el.e) - this.flight.orbital!.orbit.radius.value) / KM;
    this.host.say?.(
      'Spacecraft parted',
      perigee > 100
        ? `In an orbit of your own: perigee ${perigee.toFixed(0)} km. The braking burn is yours (Space)`
        : `Short of an orbit: perigee ${perigee.toFixed(0)} km. It comes down`,
    );
    this.host.fly(this.run);
  }

  /** Fire the braking engine by hand along the long axis as it points: the rest of the flight flown again from it. */
  private fire(t: number): void {
    const o = this.flight.orbital!;
    const m = o.manual;
    if (!m) return;
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
    this.fired = t;
    this.refly();
    this.host.say?.('Braking engine', `Fired by hand: ${burn.toFixed(0)} s to ${m.deltaV.value} m/s`);
  }

  /** Why the braking engine cannot be fired now by a hand that is free, or null: it went with the instrument module, or he has left. */
  private retroWhy(): string | null {
    const t = this.clock.t;
    if (this.parts <= t) return 'Gone with the instrument module: the modules have parted';
    const down = this.flown?.down;
    if (down && down.ejected <= t) return 'He has left the ship';
    return null;
  }

  /**
   * The record as this flight now has it (its braking burn: the timer's, a hand's, or none), and what the hands gave in the
   * descent: the modules part when a hand parted them, or when the sequence would (the timer after a burn, or the record's
   * instant) if it was on then, or never.
   */
  private descentPlan(): { plan: OrbitalFlight; hands: DescentHands } {
    const plan = structuredClone(this.planned ?? (this.free || this.mine !== null ? this.givenUp() : this.flight.orbital!));
    plan.entry.separation.value = this.parts;
    return { plan, hands: { given: this.given, switched: this.switched } };
  }

  /** When the modules part on the flight as it now stands, s from liftoff (`descentPlan`), or never (the largest safe integer). */
  private get parts(): number {
    const base = this.planned ?? (this.free || this.mine !== null ? null : this.flight.orbital!);
    const auto = base?.entry.separation.value ?? Number.MAX_SAFE_INTEGER;
    return this.partedBy ?? (automatic({ given: {}, switched: this.switched }, auto) ? auto : Number.MAX_SAFE_INTEGER);
  }

  /**
   * The flight flown again from where the spacecraft parted with all that the hands have given (the burn, the descent's
   * events), and the run on show made from it: its samples (after a burn by hand, the hand's attitude), what leaves when,
   * the events the cabin's lamps read, the checks.
   */
  private refly(): void {
    const o = this.flight.orbital!;
    const { plan, hands } = this.descentPlan();
    this.flown = this.whole(plan, hands);
    this.flownPlan = plan;
    this.flownAt++;
    const samples = this.samplesOf(plan, this.flown);
    const parts = plan.entry.separation.value;
    const t = this.fired;
    const burn = t === null ? null : { on: t, off: Math.min(plan.retro.off.value, parts) };
    if (t !== null && this.hand) {
      // as the hand turned it, to the burn's end; then as the hand left it, until the modules part; then turning from there
      // over half a minute to lie along its motion through the air, as the record's rule turns it (staged.ts recordSamples)
      const log = this.hand.log;
      const left = log.at(-1)!.q;
      for (const sample of samples) {
        if (sample.t < log[0]!.t) continue;
        let q: Quat;
        if (sample.t <= burn!.off) q = (log.filter((k) => k.t <= sample.t).at(-1) ?? log[0]!).q;
        else if (sample.t < parts) q = left;
        else q = towards(left, sample.attitude, Math.min(1, (sample.t - parts) / 30));
        sample.attitude = q;
        sample.axis = turn(q, [1, 0, 0]);
      }
    }
    const down = this.flown.down;
    const first = o.descent?.bodies[0]?.id ?? '';
    const landed = down?.landed[first]?.at ?? Number.POSITIVE_INFINITY;
    this.times = orbitalEvents(this.flight, this.flown, burn ? { ...burn, parting: parts } : undefined);
    this.times.modules = parts < landed ? parts : Number.POSITIVE_INFINITY;
    if (this.free && t === null) for (const id of ['retro-command', 'retro-on', 'retro-off', 'retro-timer']) this.times[id] = Infinity;
    // what leaves at the modules' parting and with the descent's bodies leaves when this flight has them, or never
    const run = this.run!;
    const dropped = this.flight.flies!.drops.map((d, i) =>
      d.on === 'modules'
        ? this.times.modules!
        : d.rides?.length
          ? (down?.tracks[d.rides[0]!.body]?.[0]?.t ?? Number.POSITIVE_INFINITY)
          : run.dropped[i]!,
    );
    const timer = !this.free && this.mine === null ? { on: plan.retro.on.value, off: Math.min(plan.retro.off.value, parts) } : undefined;
    this.run = {
      ...run,
      samples,
      dropped,
      duration: samples[samples.length - 1]!.t,
      fires: this.fires(burn ?? timer),
      descent: this.descentOf(),
      held: this.heldOf(),
    };
    this.host.fly(this.run);
  }

  /** What a hand can give in the descent, in the order the record's run has them: the modules, the ejection, each parachute. */
  private order: { id: string; at: number }[] | null = null;
  private descentOrder(): { id: string; at: number }[] {
    if (this.order) return this.order;
    const o = this.flight.orbital!;
    const record = orbitalFlown(this.flight);
    const down = record.down;
    if (!o.descent) return [];
    this.order = [
      { id: 'modules', at: o.entry.separation.value },
      { id: 'ejection', at: down?.ejected ?? Number.POSITIVE_INFINITY },
      ...o.descent.bodies.flatMap((b) =>
        b.chutes.map((c) => ({ id: chuteEvent(b.id, c.name), at: down?.opened[b.id]?.[c.name] ?? Number.POSITIVE_INFINITY })),
      ),
    ].sort((p, q) => p.at - q.at);
    return this.order;
  }

  /** The next event of the descent a hand can give now, with what Space says for it. */
  private nextDescent(): { id: string; label: string } | null {
    const next = this.descentOrder().find((e) => this.descentWhy(e.id) === null);
    return next ? { id: next.id, label: this.descentLabel(next.id) } : null;
  }

  /** What an event of the descent is called on the deck. */
  private descentLabel(id: string): string {
    if (id === 'modules') return 'Part the modules';
    if (id === 'ejection') return 'Eject';
    const [body, name] = id.split('/');
    const c = this.flight.orbital?.descent?.bodies.find((b) => b.id === body)?.chutes.find((k) => k.name === name);
    if (c?.replaces?.leaves) return `Leave ${c.replaces.leaves.label.replace(/^The /, 'the ')}`;
    const whose = body === this.flight.orbital?.descent?.crew?.alone ? '' : 'Module’s ';
    return `${whose}${whose ? name : name![0]!.toUpperCase() + name!.slice(1)}`;
  }

  /** Whether a braking burn is still to come or burning on the flight on show at `t`: the timer's on the record's, or a hand's. */
  private burnPending(t: number): boolean {
    if (this.fired !== null) return t < this.planned!.retro.off.value;
    if (this.free || this.mine !== null) return false;
    return t < this.flight.orbital!.retro.off.value;
  }

  /**
   * Why event `id` of the descent (`modules`, `ejection`, `<body>/<parachute>`) cannot be given now on the flight on show, or
   * null if it can: the spacecraft alone; for all but the modules, no braking burn still to come; the body it belongs to
   * loose and not down; the event not yet happened.
   */
  private descentWhy(id: string): string | null {
    const o = this.flight.orbital!;
    const d = o.descent;
    if (!d) return 'This flight’s record has no descent';
    const t = this.clock.t;
    if (!(t > this.parting)) return 'Not on the launch vehicle';
    const whole = this.flown ?? orbitalFlown(this.flight);
    const down = whole.down;
    const first = d.bodies[0]!.id;
    const landed = (body: string) => down?.landed[body]?.at ?? Number.POSITIVE_INFINITY;
    if (t >= landed(first) && (id === 'modules' || id === 'ejection' || id.startsWith(`${first}/`))) return 'Down';
    if (id === 'modules') return this.parts <= t ? 'Parted already' : null;
    if (this.burnPending(t)) return 'The braking burn is still to come: the descent follows it';
    if (id === 'ejection') return (down?.ejected ?? Number.NaN) <= t ? 'He has left the ship already' : null;
    const [body, name] = id.split('/');
    const b = d.bodies.find((x) => x.id === body);
    const i = b?.chutes.findIndex((c) => c.name === name) ?? -1;
    if (!b || i < 0) return 'No such parachute';
    const began = body === first ? Number.NEGATIVE_INFINITY : (down?.tracks[body!]?.[0]?.t ?? Number.POSITIVE_INFINITY);
    if (!(t >= began)) return body === d.crew?.alone ? 'He is still in the ship: eject first' : 'Still on the ship';
    if (t >= landed(body!)) return 'Down';
    if ((down?.opened[body!]?.[name!] ?? Number.POSITIVE_INFINITY) <= t) return 'Out already';
    const j = b.chutes.findIndex((c) => c.replaces?.leaves);
    if (j >= 0 && i < j && (down?.opened[body!]?.[b.chutes[j]!.name] ?? Number.POSITIVE_INFINITY) <= t)
      return `It stayed with ${b.chutes[j]!.replaces!.leaves!.label.replace(/^The /, 'the ')}`;
    return null;
  }

  /**
   * Whether event `id` of the descent would have come by now, by the automatic sequence's own trigger: the modules at the
   * sequence's instant, the ejection and a parachute at their heights (the body's own), or a time after the ejection.
   */
  private descentDue(id: string, t: number): boolean {
    const o = this.flight.orbital!;
    const d = o.descent!;
    const down = this.flown?.down;
    if (id === 'modules') return t >= (this.planned ?? o).entry.separation.value;
    const first = d.bodies[0]!.id;
    const [body, name] = id === 'ejection' ? [first, ''] : id.split('/');
    // the body's height now: its track's, or the run's own sample's for the entry body
    let h = this.sampleAt(t).altitude;
    const track = down?.tracks[body!];
    if (body !== first && track?.length) {
      const p = track.find((x) => x.t >= t) ?? track[track.length - 1]!;
      const gast0 = greenwichSiderealTime(julianDate(this.flight.launch));
      h = subpoint(p.r, gast0 + EARTH_ROTATION_RATE * p.t).height - this.flight.site.seaLevel.value;
    }
    if (id === 'ejection') return h <= o.ejection.altitude.value;
    const c = d.bodies.find((b) => b.id === body)?.chutes.find((k) => k.name === name);
    if (!c) return false;
    if (c.altitude) return h <= c.altitude.value;
    return c.after !== undefined && down !== null && down !== undefined && t - down.ejected >= c.after.value;
  }

  /** Whether the record's flight is still the record's: nothing taken over, no lock opened, no burn, nothing given in the descent. */
  private get recorded(): boolean {
    return this.mine === null && this.fired === null && !this.free && this.downMine === null;
  }

  /** Event `id` of the descent given by a hand at the clock's instant: what had been given after it is forgotten, and the rest is flown again. */
  private give(id: string): void {
    const why = this.descentWhy(id);
    if (why) return void this.host.say?.(this.descentLabel(id), why);
    const t = this.clock.t;
    const taken = this.recorded;
    if (taken) this.downMine = t;
    for (const [k, at] of Object.entries(this.given)) if (at > t) delete this.given[k];
    this.switched = this.switched.filter((s) => s.t <= t);
    if (this.partedBy !== null && this.partedBy > t) this.partedBy = null;
    if (id === 'modules') this.partedBy = t;
    else this.given[id] = t;
    this.refly();
    const o = this.flight.orbital!;
    this.host.say?.(
      this.descentLabel(id),
      `${this.consequence(id, t)}${taken ? ` Not the flight of ${this.day}: ${o.descent?.automatic ?? 'it was automatic'}.` : ''}`,
    );
    if (!this.clock.running) this.clock.play(true);
  }

  /** What came of an event given at `t`, at once: where it was, and a parachute torn as it came out. */
  private consequence(id: string, t: number): string {
    const down = this.flown?.down;
    const s = this.sampleAt(t);
    const where = `${(Math.max(0, s.altitude) / KM).toFixed(1)} km up at ${s.groundSpeed.toFixed(0)} m/s through the air`;
    if (id === 'modules') return `Parted ${where}.`;
    if (id === 'ejection') return `Hatch No. 1 off and the seat out ${where}, ${(s.q / 1000).toFixed(1)} kPa.`;
    const [body, name] = id.split('/');
    const tore = down?.torn[body!]?.[name!];
    if (tore && Math.abs(tore.t - t) < 1e-6) return `Out, and torn at once: ${(tore.q / 1000).toFixed(1)} kPa on its cloth.`;
    return tore ? `Out; it tears at ${this.wall(tore.t)}.` : 'Out.';
  }

  /** B with the spacecraft alone and no burn to come: the descent's automatic sequence off, or on again, from the clock's instant. */
  private switchDescent(): void {
    const t = this.clock.t;
    const on = !automatic({ given: {}, switched: this.switched }, t);
    if (this.recorded) this.downMine = t;
    this.switched = [...this.switched.filter((s) => s.t < t), { t, on }];
    this.refly();
    this.host.say?.(
      'Sequencer',
      on
        ? 'On: the timer and the barometric switches act again'
        : `Off: nothing in the descent happens but what you give (Space, or a right click on the part). ${this.flight.orbital?.descent?.automatic ?? ''}`,
    );
  }

  /**
   * When each of `flies.fires` burns on this flight, in their order: a stage's from its lighting to its stop (the record's run's,
   * or the user's vehicle's), the braking engine's between `retro`'s instants (none until a hand fires it, once the hands are free).
   */
  private fires(retro: { on: number; off: number } = { on: Infinity, off: Infinity }): { from: number; to: number }[] {
    const record = firesOf(this.flight, orbitalFlown(this.flight), retro);
    const s = this.mine !== null ? this.state : null;
    const v = s ? this.vehicleOf() : null;
    return (this.flight.flies?.fires ?? []).map((f, k) => {
      if (f.on === 'retro' || !s || !v) return record[k]!;
      const i = Number(f.on.replace('stage:', ''));
      const st = s.stages[i];
      if (!st || !Number.isFinite(st.from)) return { from: Infinity, to: Infinity };
      return { from: st.from, to: Math.min(st.to, v.dry(i, st.from), st.gone) };
    });
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

  /** The clock has moved: fly the user's launch vehicle up to it, or turn by hand; put the moment on the instruments; stop at the end. */
  protected follow(): void {
    if (!this.on || !this.run) return;
    const t = this.clock.t;
    if (t < 0) this.clock.seek(0);
    if (this.state && this.pilot && !this.ascended) {
      this.fly(t);
      return void this.show();
    }
    if (this.free && this.fired === null && this.hand) {
      this.turnTo(t);
      // the turned attitude is what the scene shows from here on
      const samples = this.run.samples as LiveSample[];
      const copy = samples.map((s) =>
        s.t >= this.hand!.log[0]!.t ? { ...s, attitude: this.hand!.q, axis: turn(this.hand!.q, [1, 0, 0]) } : s,
      );
      // (and the timer's burn given up: the braking engine does not fire at the record's instant)
      this.run = { ...this.run, samples: copy, fires: this.fires() };
      this.host.fly(this.run);
    }
    if (t > this.over() + 12) {
      this.clock.pause();
      this.clock.seek(this.over() + 12);
    }
    this.show();
  }

  /** The user's launch vehicle stepped up to the clock (as the ballistic deck steps its own: every tick noted, kept every tenth of a second). */
  private fly(t: number): void {
    const v = this.vehicleOf();
    let s = this.state!;
    const run = this.run! as Run & { samples: LiveSample[] };
    const ahead = t - s.t;
    const begun = !s.held || v.burning(s, 0) || v.burning(s, 1) || this.asked.length > 0;
    if (ahead <= 0 || !begun || s.landed) {
      if (s.landed && t > s.landed.t + 12) {
        this.clock.pause();
        this.clock.seek(s.landed.t + 12);
      }
      return;
    }
    const centre = (this.flight.flies?.datum ?? 0) + (this.flight.orbital!.ascent!.centre?.value ?? 0);
    const upTo = s.t + Math.min(ahead, MOST);
    while (s.t < upTo - TICK / 2 && !s.landed && !s.parted) {
      const was = s;
      s = v.tick(s, this.pilot!);
      if (s.parted) break;
      if (s.ticks === was.ticks) break;
      this.tally!.note(was, s);
      // (a sample kept every tenth of a second and at every event; between, only the frame's last is put at the head)
      const last = run.samples[this.kept - 1]!;
      const event = s.stages.some((st, i) => st.gone !== was.stages[i]!.gone || v.burning(s, i) !== v.burning(was, i));
      const end = s.t >= upTo - TICK / 2;
      if (!event && !end && s.t - last.t < KEEP - TICK / 2) continue;
      run.samples.length = this.kept;
      run.samples.push(v.sample(s, centre));
      if (event || s.t - last.t >= KEEP - TICK / 2) this.kept = run.samples.length;
    }
    this.state = s;
    if (ahead > MOST) this.clock.seek(s.t);
    this.dropsFrom(s);
    run.fires = this.fires();
    // the engines lit on the pad burn until the last of them stops (the sound's burn, and the trail's: viewer/ascent.ts `cutoff`)
    const o = this.flight.orbital!;
    const engine = o.stages.reduce(
      (last, st, i) => (st.ignition.value <= 0 && (last < 0 || st.cutoff.value > o.stages[last]!.cutoff.value) ? i : last),
      -1,
    );
    if (engine >= 0) {
      const st = s.stages[engine]!;
      run.cutoff = Number.isFinite(st.from) && !v.burning(s, engine) ? Math.min(st.to, v.dry(engine, st.from), st.gone) : Infinity;
    }
    if (s.parted) return void this.parted(s);
    if (s.landed) {
      run.duration = s.landed.t;
      this.clock.setRate(1);
      this.clock.seek(s.landed.t);
      this.host.say?.('Down', `The launch vehicle came back to the ground at ${s.landed.speed.toFixed(0)} m/s, the spacecraft still on it`);
    }
  }

  /** What came of a burn by hand: where the pilot came down against the record's landing, or that it stays up. */
  private outcome(t: number): string {
    const pilot = this.landed(this.flown);
    if (!pilot) return 'Still in orbit: it comes down only as the orbit decays, on ten days of supplies';
    if (!this.run || t < this.run.duration) return this.fired !== null ? 'Fired: what follows is flown from your burn' : 'Coming down';
    return `Down at ${pilot.latitude.toFixed(2)}° N ${pilot.longitude.toFixed(2)}° E, ${this.apart(pilot).toFixed(0)} km from where the record has the landing, at ${pilot.speed.toFixed(1)} m/s`;
  }
  private landed(whole: FlownWhole | null) {
    const down = whole?.down;
    return down ? (down.landed.pilot ?? Object.values(down.landed)[0]) : undefined;
  }
  /** How far a landing is from the record's, km. */
  /** When the flight on show is over: the last body of its descent on the ground (the pilot, minutes after the module), or the run's own end. */
  private over(): number {
    const run = this.run;
    if (!run) return Infinity;
    const whole = this.flown ?? (this.mine === null && this.fired === null ? orbitalFlown(this.flight) : null);
    const landings = Object.values(whole?.down?.landed ?? {}).map((l) => l.at);
    return Math.max(run.duration, ...landings);
  }

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

  /** What each stage has left at `t` (all its units), and whether it is aboard and burning: the user's vehicle's, or the record's run's. */
  private stagesAt(t: number): { left: number; full: number; aboard: boolean; burning: boolean }[] {
    const o = this.flight.orbital!;
    if (this.state && this.mine !== null && t >= this.mine) {
      const v = this.vehicleOf();
      const s = this.state;
      const left = v.left(s);
      return o.stages.map((st, i) => ({
        left: left[i]!,
        full: st.count * (st.usable ?? st.propellant).value,
        aboard: !Number.isFinite(s.stages[i]!.gone) && !s.parted,
        burning: v.burning(s, i) && !s.parted,
      }));
    }
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
    const live = this.state && this.pilot && !this.ascended ? this.state : null;
    const t = Math.max(0, live ? Math.min(this.clock.t, live.t) : this.clock.t);
    const s = this.sampleAt(t);
    const hands = this.free || (this.mine !== null && !this.ascended);
    const pushed = hands && this.fired === null ? this.push() : { pitch: 0, yaw: 0, roll: 0 };
    const news: DeckNews = { times: this.times, hand: pushed, holds: hands ? FREE : NONE };
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
    set('pitch', (90 - angleBetween(s.axis, s.r) / DEG).toFixed(0));
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
    const retro =
      this.fired !== null
        ? { on: this.fired, off: this.planned!.retro.off.value }
        : this.free
          ? null
          : this.mine === null
            ? { on: o.retro.on.value, off: o.retro.off.value }
            : null;
    const braking = retro !== null && t >= retro.on && t < retro.off;
    const thrust = s.burning.reduce((sum, m) => sum + m.thrust, 0);
    set('engine', burning.length ? burning.join(' + ') : braking ? 'Braking engine' : t <= 0 ? 'Not lit' : 'None burning');
    set('engine-kind', this.mine === null ? 'fixed thrust, cut by the record' : 'fixed thrust: Space cuts it');
    const command = o.events.find((e) => e.id === 'retro-command')?.at.value ?? o.retro.on.value;
    set(
      'retro',
      this.fired !== null
        ? `By hand, ${this.wall(this.fired)}`
        : this.free
          ? 'Yours: Space'
          : this.mine === null
            ? `Timer, ${this.wall(command)}`
            : 'Yours, once parted',
    );
    set('lock', this.free ? 'Free' : 'Locked');
    for (const lamp of this.root.querySelectorAll<HTMLElement>('[data-digit]'))
      lamp.classList.toggle('on', this.free || Number(lamp.dataset.digit) < this.typed.length);
    set('motors', thrust > 0 ? `${burning.join(' + ') || 'braking'} ${(thrust / 1000).toFixed(0)} kN` : '–');
    const phase =
      t <= 0
        ? 'On the pad'
        : this.state?.landed && t >= this.state.landed.t
          ? 'Down'
          : s.phase === 'powered'
            ? 'Powered flight'
            : s.phase === 'coast'
              ? alone
                ? 'Spacecraft alone'
                : 'Coasting on the launch vehicle'
              : s.phase === 'capsule'
                ? orbit && el.a * (1 - el.e) > ball + 100_000
                  ? 'In orbit'
                  : 'Spacecraft alone'
                : s.phase === 'entry'
                  ? 'Re-entry'
                  : t >= this.run.duration
                    ? 'Down'
                    : Math.min(
                          ...Object.values((this.flown ?? orbitalFlown(this.flight)).down?.opened[o.descent?.bodies[0]?.id ?? ''] ?? {}),
                        ) <= t
                      ? 'Under the parachutes'
                      : 'Falling';
    set('phase', phase);
    // (from the spacecraft's separation the record's run is the published orbit begun where the simulated ascent left it: said, so it is not taken for a result)
    const leant = (x: number, plus: string, minus: string) =>
      Math.abs(x) < 0.05 * DEG ? '' : ` ${(Math.abs(x) / DEG).toFixed(1)}° ${x > 0 ? plus : minus}`;
    const leans = !alone && this.guidance ? leant(this.trim.pitch, 'downrange', 'back') + leant(this.trim.yaw, 'left', 'right') : '';
    set(
      'mode',
      this.mine !== null
        ? `Not the record’s${alone ? '' : !this.guidance ? ': hands only' : leans ? `: law leaned${leans}` : ''}`
        : this.downMine !== null
          ? `Not the record’s: the descent by hand`
          : this.free
            ? `Manual descent: not the flight of ${this.day}`
            : alone
              ? 'On the published orbit: the simulated ascent fell short (Flown)'
              : 'As flown: automatic',
    );
    this.root.querySelector('[data-do=guidance]')!.setAttribute('aria-pressed', String(this.guidance && !this.free));
    // (alone, with no burn to come, the sequencer is the descent's automatic sequence)
    const descending = alone && !this.burnPending(t);
    const auto = automatic({ given: {}, switched: this.switched }, t);
    this.root.querySelector('[data-do=sequence]')!.setAttribute('aria-pressed', String(descending ? auto : this.sequence && !this.free));
    const waiting = t <= 0 && !this.clock.running;
    const replay = live !== null && this.clock.t < live.t - TICK;
    const step = !waiting && !alone && !this.ascended ? this.nextStep() : null;
    const fire = this.can('retro');
    const descent = alone && !fire ? this.nextDescent() : null;
    set(
      'next',
      replay
        ? 'Run on'
        : waiting
          ? 'Ignition'
          : step
            ? step.label
            : fire
              ? 'Braking engine'
              : descent
                ? descent.label
                : alone
                  ? 'Nothing to do: it flies itself'
                  : 'Nothing left to do',
    );
    this.root.querySelector<HTMLButtonElement>('[data-do=next]')!.disabled = !(replay || waiting || step || fire || descent);
    this.root.querySelector<HTMLButtonElement>('[data-do=abort]')!.disabled = true;
    this.root.classList.toggle('waiting', waiting);
    this.root.classList.toggle('thrusting', burning.length > 0 && t > 0);
    const code = String(o.manual?.code.value ?? '');
    const due =
      (!this.sequence && this.mine !== null && step && !alone && t >= this.dueAt(step.step)) ||
      (descending && !auto && descent !== null && this.descentDue(descent.id, t));
    const prompt = this.cells.get('prompt')!;
    const lights = matchMedia('(hover: none), (pointer: coarse)').matches ? 'Ignition lights' : 'Space lights';
    const text = waiting
      ? this.mine === null
        ? `Ready: ${lights} the engines; the flight is the record’s. G or B makes it yours`
        : `Ready: ${lights} the engines; the flight is yours`
      : !alone
        ? this.mine === null
          ? `Its pilot had no controls going up; behind the lock, orientation and the braking burn. G, B or Space takes it over`
          : due && step
            ? `${step.label} is due: Space`
            : this.guidance
              ? 'Guidance flies the law: W S A D lean it'
              : 'Hands only: W S pitch, A D yaw, Q E roll, while an engine burns'
        : descending && (!auto || this.downMine !== null)
          ? !descent
            ? t >= this.over()
              ? 'Down: the card says how it ended'
              : 'Nothing left to give: the rest is the physics'
            : !auto
              ? `Sequencer off: nothing in the descent happens but what you give. ${descent.label}${due ? ' is due' : ' next'}: Space`
              : `The automatic sequence flies the rest. Space: ${descent.label}, now`
          : this.free
            ? this.fired === null
              ? this.mine !== null && !(orbit && el.a * (1 - el.e) > ball + 100_000)
                ? 'Short of an orbit: it comes down, unless the braking engine pushes it on'
                : 'Turn the long axis against the motion, then fire'
              : this.outcome(t)
            : code && t < o.retro.on.value
              ? `The hand controls are locked: the code ${[...code].join('-')} frees them`
              : 'The descent is automatic';
    if (prompt.textContent !== text) prompt.textContent = text;
    prompt.hidden = !text;
    prompt.classList.toggle('due', Boolean(due));
    this.card(t);
  }

  /** When the record has a step, s (a stage cut on its velocity: its recorded cutoff). */
  private dueAt(step: Step): number {
    return this.vehicleOf().sequence.find((k) => JSON.stringify(k.step) === JSON.stringify(step))?.at ?? Infinity;
  }

  /**
   * Down: the card of the flight against the record's, as the ballistic deck's is. The figures are the run's own (sim/staged.ts
   * `held`), whoever flew it: the coast's and the descent's; and the ascent's too when the ascent was the user's.
   */
  private card(t: number): void {
    const el = this.root.querySelector<HTMLElement>('.cockpit-card')!;
    const whole = this.flown ?? orbitalFlown(this.flight);
    const down = this.landed(whole);
    // (the run on show follows the descent module down; the pilot lands under his canopy some minutes after it)
    const crashed = this.state?.landed && t >= this.state.landed.t;
    // (a flight that does not come down: its coast flown six hours on, still up)
    const stays = !whole.down && whole.coast.samples[whole.coast.samples.length - 1]!.phase !== 'down';
    // (and the card waits until the last of them is down)
    const over = this.run !== null && (Boolean(crashed) || ((down !== undefined || stays) && t >= this.over()));
    const key = `${this.flownAt}|${this.mine}|${crashed}`;
    if (el.hidden === !over && el.dataset.at === key) return;
    el.hidden = !over;
    el.dataset.at = key;
    if (!over) return;
    const o = this.flight.orbital!;
    const buttons =
      '<p><button data-do="again"><kbd>N</kbd> Fly it again</button><button data-do="leave"><kbd>Esc</kbd> Leave</button></p>';
    if (crashed) {
      el.innerHTML = `<h3>Back on the ground, on the launch vehicle</h3><p class="cockpit-why">Your flight never parted the spacecraft from its launch vehicle: it came down with it at ${this.state!.landed!.speed.toFixed(0)} m/s, ${(this.sampleAt(t).range / KM).toFixed(0)} km from the pad. Not survivable.</p>${buttons}`;
      return;
    }
    // how it ended for him, in the record's terms (sim/verdict.ts downVerdict), and how long an orbit that stays up lasts
    const plan = this.flownPlan ?? o;
    let decayed: number | undefined;
    if (stays) {
      if (this.lasts?.of !== whole)
        this.lasts = {
          of: whole,
          s: decay(
            plan,
            julianDate(this.flight.launch),
            this.flight.site.seaLevel.value,
            whole.coast.samples[whole.coast.samples.length - 1]!,
          ),
        };
      decayed = this.lasts.s;
    }
    const v = downVerdict(
      plan,
      whole,
      (at) => this.wall(at),
      (at) => this.apart(at),
      decayed,
    );
    const lives =
      stays || v.survivable === null ? '' : v.survivable ? ' He lives, by the limits taken.' : ' He does not live, by the limits taken.';
    // the record's own landings: each body's time (its check) and the place the record gives
    const when = (id: string) => o.descent?.checks.find((c) => c.id === `${id}.at`);
    const landings = [
      ...(o.descent?.bodies.slice(0, 2) ?? []).flatMap((b) => {
        const c = when(b.id);
        return c ? [`${c.label} at ${this.wall(c.value)}`] : [];
      }),
      `the landing at Smelovka, ${o.landing.latitude.value.toFixed(2)}° N ${o.landing.longitude.value.toFixed(2)}° E, ${o.descent?.ground.value.toFixed(0) ?? 0} m above the sea`,
    ].join('; ');
    const show = (unit: string, x: number) =>
      unit === 'm' ? `${(x / 1000).toFixed(1)} km` : unit === 's' ? this.wall(x) : `${x.toFixed(unit === 'deg' ? 2 : 1)} ${unit}`;
    // (the coast's and the descent's: what a pilot's hand can change; the ascent's too, on a flight that was the user's going up)
    const rows = held(o, whole)
      .slice(this.mine !== null ? 0 : (o.ascent?.checks.length ?? 0))
      .filter((c) => Number.isFinite(c.got) && c.id !== 'period' && !(stays && c.got === 0))
      .map(
        (c) =>
          `<tr${Math.abs(c.got - c.value) > c.tolerance ? ' class="out"' : ''}><th>${c.label}</th><td>${show(c.unit, c.got)}</td><td>${show(c.unit, c.value)}</td></tr>`,
      )
      .join('');
    const mine = this.mine !== null || this.fired !== null || this.downMine !== null || this.free;
    el.innerHTML = `
      <h3>${stays ? 'Still in orbit' : this.mine !== null ? 'Down, on your own flight' : this.downMine !== null ? 'Down, on your own descent' : this.fired !== null ? 'Down, by your own braking burn' : 'Down, as the automatic system flew it'}</h3>
      <p class="cockpit-why"><b>${v.how}.</b>${lives}${mine ? ` Not the flight of ${this.day}.` : ''}</p>
      <p class="cockpit-why">${v.why.join(' ')}</p>
      ${v.against ? `<p class="cockpit-why">${v.against}</p>` : ''}
      <p class="cockpit-why">${this.flight.callsign} as recorded: ${landings}.</p>
      ${
        rows
          ? `<table>
        <thead><tr><td></td><td>You</td><td>${this.flight.callsign}</td></tr></thead>
        ${rows}
      </table>
      <p class="cockpit-why">Amber rows are outside the tolerance the record sets. The flight as recorded misses several of them itself (the Flown panel, and the flight’s mission.md, say why).</p>`
          : ''
      }
      ${buttons}`;
  }
}

/** An attitude part of the way from one to another: the straight blend made a rotation again, the short way round. */
function towards(from: Quat, to: Quat, k: number): Quat {
  const sign = from[0] * to[0] + from[1] * to[1] + from[2] * to[2] + from[3] * to[3] < 0 ? -1 : 1;
  const q = [0, 1, 2, 3].map((i) => from[i]! + (sign * to[i]! - from[i]!) * k);
  const n = Math.hypot(...q);
  return [q[0]! / n, q[1]! / n, q[2]! / n, q[3]! / n];
}

/** A part's command as a step of the launch vehicle (`step:<kind>:<stage>`, `step:drop:<id>`), or null. */
function stepOf(what: string): Step | null {
  const [, kind, of] = what.split(':');
  if (kind === 'drop' && of) return { kind: 'drop', id: of };
  const stage = Number(of);
  return (kind === 'ignite' || kind === 'cut' || kind === 'separate') && Number.isInteger(stage) ? { kind, stage } : null;
}

import { autopilot, blend, rateCommand, Tally } from '../sim/autopilot.ts';
import { hasLeft } from '../sim/craft.ts';
import { type Ballistic, ballisticOf, changed, type Doing, type Results } from '../sim/fly.ts';
import { handRange } from '../sim/lever.ts';
import { standing } from '../sim/loads.ts';
import { type Hand, type Span, sentBy, travelAt } from '../sim/mechanism.ts';
import { MISSES } from '../sim/misses.ts';
import type { EventDef } from '../sim/plan.ts';
import { afterwards, blownAloft, grown, keepContact, type Run, runOf } from '../sim/run.ts';
import { Sheds } from '../sim/shed.ts';
import { type Controls, type LiveSample, type Pilot, TICK, type Vehicle, type VehicleState, vehicle } from '../sim/vehicle.ts';
import { landsOf, verdict } from '../sim/verdict.ts';
import type { Command, MechanismDef, SitedFlight } from '../types.ts';
import type { Clock } from '../world/clock.ts';
import { frameOf } from '../world/earthframe.ts';
import { angleBetween, DEG, siteFrame } from '../world/frames.ts';
import { ABORT_ARMED, type CockpitHost, Deck, type DeckSpec, GUARD, KEEP, MOST, type ThrottleView, TRIM, TRIM_MOST, tank } from './deck.ts';
import { pack } from './tape.ts';

/**
 * Flying the flight by hand: the live simulator (sim/vehicle.ts) stepped by the clock, steered by
 * the keys, and read back on a strip of instruments. Nothing here knows which flight it is: the
 * vehicle is the flight's plan, the events offered are the ones its record has, and what
 * the scene sheds is `Flight.flies.drops`.
 *
 * The clock is the flight's own: stopped at liftoff until the engine is lit, then run. Each time
 * it moves on, the vehicle is stepped up to it; when it is stopped, so is the flight; put back,
 * it shows what was flown (the scene reads the run's samples) and the flight goes on from where
 * it had got to when the clock comes back to it.
 *
 * Guidance is the autopilot (sim/autopilot.ts) flying the record's tilt programme through the
 * same controls the keys work: a key held takes its axis from it, and G switches it off
 * altogether. The sequencer sets each event off at the record's time; Space sets the next one
 * off now.
 */

/** What Space does next, in the order a flight goes. */
type Step = 'ignite' | 'cutoff' | 'tower' | 'separate' | 'retro' | 'retropack' | 'drogue' | 'main' | 'hatch';
const RATE_ON = new Set(['rate']);
const RATE_OFF = new Set<string>();
const STEPS: Record<Step, string> = {
  ignite: 'Ignition',
  cutoff: 'Engine cutoff',
  tower: 'Jettison the tower',
  separate: 'Separate the spacecraft',
  retro: 'Retrofire',
  retropack: 'Jettison the retropack',
  drogue: 'Drogue parachute',
  main: 'Main parachute',
  hatch: 'Blow the hatch',
};
/** The plan's event a step sets off, found by what it does (fly.ts `ballisticOf`), asked of the vehicle as a hand's command. */
const eventOf = (b: Ballistic, step: Step): EventDef | undefined =>
  step === 'tower'
    ? b.towerOff
    : step === 'separate'
      ? b.parting
      : step === 'retro'
        ? b.retro
        : step === 'retropack'
          ? b.packOff
          : step === 'drogue'
            ? b.drogueOut
            : step === 'main'
              ? b.mainOut
              : undefined;
/** What the flight is doing (fly.ts `Doing`), in the deck's words: a parachute by the plan's own name for it. */
const doingWords = (s: Doing, chutes: readonly { id: string; label: string }[]): string =>
  s.landed
    ? 'Down'
    : s.riding
      ? s.powered
        ? 'Powered flight'
        : 'Coasting on the booster'
      : s.escaping
        ? 'Abort: on the escape rocket'
        : s.out !== null
          ? `Under the ${(chutes.find((c) => c.id === s.out)?.label ?? 'parachute').toLowerCase()}`
          : s.entered
            ? 'Re-entry'
            : 'Spacecraft alone';
/** A ballistic flight's hardware by role (sim/fly.ts), or null for one of another kind. */
// (this deck flies only a ballistic plan: deck/decks.ts gives every other kind its own)
const rolesOf = (f: SitedFlight): Ballistic | null => (f.plan ? ballisticOf(f.plan) : null);

/** The clock runs on this long after the landing, at life's pace, for what is still moving to come to rest (the parachute lying down: viewer/chute.ts), and then stops. */
const AFTER = 12;
/** Seconds the clock runs on after the spacecraft has gone out of sight under the sea (sim/afloat.ts), where its hatch was blown. */
const SUNK = 20;
/** How a command that works a mechanism by hand begins (types.ts `Command`): the mechanism's id follows. */
const WORK = 'work:';
/** An abort is asked for twice: the second press within this many seconds of the first. */
/** A supply under this much of what it held is shown amber. */
const LOW = 0.2;
const FT = 0.3048;

export type { CockpitHost } from './deck.ts';

export class Cockpit extends Deck {
  /** The flight's ballistic hardware by what each is (sim/fly.ts `ballisticOf`): what the machine is asked about. */
  private get roles(): Ballistic {
    return rolesOf(this.flight)!;
  }
  /** The greatest dynamic pressure flown through on the booster so far, Pa: for calling it. */
  private maxQ = 0;
  private readonly vehicle: Vehicle | null;
  /** Kilograms a second through the engine, and what there is to burn. */
  private readonly flow: number;

  private state: VehicleState | null = null;
  private run: Run & { samples: LiveSample[] } = runOf(this.flight, {
    samples: [] as LiveSample[],
    duration: Infinity,
    cutoff: Infinity,
    dropped: [],
    live: true,
    kept: true,
    out: { drogue: Infinity, main: Infinity },
  }) as Run & { samples: LiveSample[] };
  private tally = new Tally();
  /** How many of the run's samples are kept: one past them is the head, replaced each frame. */
  private kept = 0;
  private guidance = true;
  private sequence = true;
  /** The capsule's rate command mode, where it has one (types.ts `rcs.rate`): on, the stick asks for rates on the spacecraft alone. */
  private rate = false;
  /** What the hands are asking: axes while keys are held, the plan's events once asked for (each asked every tick until it is done). */
  private hand: Partial<Controls> = {};
  private eventAt = Number.NEGATIVE_INFINITY;
  /** How far the hands have leaned the programme guidance flies, radians (sim/autopilot.ts `trim`). */
  private trim = { pitch: 0, yaw: 0 };
  private towerAt = Infinity;
  private retropackAt = Infinity;
  /** When the hatch was blown, where the flight has one to blow (`flies.hatch`): Infinity while it is on. */
  private hatchAt = Infinity;
  /** The flown model's mechanisms (types.ts: MechanismDef), and for each what the hands have told it, at the flight's instants. */
  private readonly mechanisms: MechanismDef[];
  private rateChanges: Hand[] = [];
  private readonly hands = new Map<string, Hand[]>();
  /** The stretches of this flight flown with the sequencer off: a mechanism's programme is not heard in them (sim/mechanism.ts). */
  private unsequenced: Span[] = [];

  constructor(parent: HTMLElement, flight: SitedFlight, clock: Clock, host: CockpitHost) {
    super(parent, flight, clock, host, Cockpit.spec(flight));
    const roles = rolesOf(flight);
    this.vehicle =
      roles?.craft.rigid && flight.flies
        ? vehicle(flight.plan!, siteFrame(flight.site), flight.site.seaLevel.value, { frame: frameOf(flight) })
        : null;
    this.flow = roles ? roles.flow : 0;
    this.mechanisms = flight.models.find((m) => m.id === flight.flies?.model)?.mechanisms ?? [];
    this.systems();
    this.button.hidden = !this.vehicle;
  }

  /** What a ballistic flight puts on the deck: its five figures, its four readings and its mechanisms' switches. */
  private static spec(flight: SitedFlight): DeckSpec {
    const mechanisms = flight.models.find((m) => m.id === flight.flies?.model)?.mechanisms ?? [];
    // (each is a switch among the deck's keys, lit while it is headed out. It has no key: every letter is taken)
    const works = mechanisms
      .map(
        (m) =>
          `<button data-work="${m.id}" class="switch" aria-pressed="false" title="${m.name}: ${m.says[1].toLowerCase()} or ${m.says[0].toLowerCase()} by hand. It goes back to its programme at the programme's next event">${m.name}</button>`,
      )
      .join('');
    // (a capsule with a rate command mode has its switch among the deck's keys: it has no key, every letter being taken)
    const rate = rolesOf(flight)?.craft.rigid?.capsule.rcs?.rate;
    const rated = rate
      ? `<button data-do="rate" class="switch" aria-pressed="false" title="Rate command: on the spacecraft alone the stick asks for a rate of turn, ${rate.full.value} degrees a second at full throw, and the manual jets hold it to ${rate.deadband.value}; let go, they damp the rates and hold no attitude. Off, the stick works the jets as it is pushed">Rate command</button>`
      : '';
    return {
      figures: [
        { id: 'altitude', label: 'Height', unit: 'km', about: 'Height above the sea' },
        { id: 'speed', label: 'Speed', unit: 'm/s', about: 'Speed over the turning Earth (Earth-fixed)' },
        { id: 'climb', label: 'Climb', unit: 'm/s', about: 'How fast it is rising' },
        { id: 'g', label: 'Load', unit: 'g', about: 'What an accelerometer reads' },
        { id: 'mach', label: 'Mach', unit: '', about: 'Speed through the air over the speed of sound there' },
      ],
      readings: [
        { id: 'q', label: 'Pressure', unit: 'kPa', about: 'Dynamic pressure: the push of the air' },
        { id: 'alpha', label: 'Off wind', unit: '°', about: 'The angle between the nose and the motion through the air' },
        { id: 'range', label: 'Range', unit: 'km', about: 'Distance over the ground from the pad' },
        { id: 'pitch', label: 'Pitch', unit: '°', about: 'The nose above the level: 90 is straight up' },
      ],
      guidance: "Guidance: the autopilot flies the record's tilt programme, and a key held takes its axis. Off, the hands fly alone",
      sequence: "Sequencer: events happen at the record's times. Off, each is set off by hand with the action button",
      choose: true,
      flightKeys: `${works}${rated}`,
      enter: 'Fly this flight yourself (L)',
    };
  }

  /** Whether this flight can be flown by hand: it has a plan with a rigid body to steer, and a model to carry. */
  get able(): boolean {
    return this.vehicle !== null;
  }

  /** The vehicle being flown, and how it is flown: guidance on or off, the sequencer on or off, and the pilot's trim on the programme, radians. */
  get craft(): Vehicle | null {
    return this.vehicle;
  }
  get steering(): { guidance: boolean; sequence: boolean; trim: { pitch: number; yaw: number } } {
    return { guidance: this.guidance, sequence: this.sequence, trim: this.trim };
  }

  private abortArmed = Number.NEGATIVE_INFINITY;

  /**
   * The lever moved: a hand on the engine (the flight is taken over). Raised again over its least after a cut, an engine
   * that cannot be started again says so (the machine refuses it: sim/craft.ts).
   */
  protected override levered(from: number): void {
    const s = this.state;
    if (!this.on || !s) return;
    this.touched = true;
    const range = handRange(this.roles.engine);
    const nature = this.roles.engine.starts;
    if (range && from < range.least && this.lever.at >= range.least && s.cutoff && s.starts >= nature.count && !s.landing)
      this.host.say?.(
        'Not lit',
        `The ${this.engineLabel(this.vehicle!.engine)} starts ${nature.count === 1 ? 'once' : `${nature.count} times`}, and cannot be again${nature.source ? `: ${nature.source}` : ''}`,
      );
  }

  /** What the lever works: the booster's engine while it is aboard, from the live state (or the sample looked back at). */
  protected override throttled(): ThrottleView | null {
    const s = this.state;
    const v = this.vehicle;
    if (!s || !v) return null;
    const roles = this.roles;
    if (hasLeft(s.craft, roles.booster.id)) return null;
    const engine = roles.engine;
    const sample = this.run.samples[this.run.samples.length - 1] as LiveSample;
    const main = sample.burning.find((m) => m.engine === v.engine);
    const burnable = this.flow * roles.cutoff;
    const left = Math.max(0, s.mass - (roles.craft.mass.value - burnable));
    const lit = Boolean(main) && !s.cutoff;
    const throttle = lit ? s.throttle || this.lever.at : this.lever.at;
    return {
      engines: engine.label,
      burning: lit,
      range: handRange(engine),
      thrust: main?.thrust ?? 0,
      left,
      flow: this.flow * throttle,
      isp: (engine.isp?.vacuum ?? engine.isp?.seaLevel)?.value ?? 0,
      mass: s.mass,
      ...(s.abortAt !== null ? { not: 'aborted: the lever is let go' } : {}),
    };
  }

  /** The strip of what the pilot has to fly with, built from the flight's data: the engine and its tanks, each jet supply, the jets, the motors. */
  private systems(): void {
    const roles = rolesOf(this.flight);
    const body = roles?.craft.rigid;
    const el = this.cells.get('systems') ?? this.root.querySelector<HTMLElement>('[data-cell=systems]')!;
    if (!roles || !body) return;
    const supplies = body.capsule.rcs?.supplies ?? [];
    const axes = body.capsule.rcs ? ['pitch', 'yaw', 'roll'] : [];
    el.innerHTML = `
      <div class="tank engine" title="The engine: what it is doing, and what kind it is"><span>Engine</span><b data-cell="engine"></b><i data-cell="engine-kind"></i></div>
      <div class="tank burn" title="Propellant left of what the engine burns before its cutoff"><span>Burn left</span><u class="bar"></u><b><u data-cell="fuel"></u></b><i></i></div>
      ${this.vehicle?.tanks ? tank('oxidizer', 'Oxidizer', 'Liquid oxygen left in its tank') + tank('fuel-tank', 'Fuel', 'Fuel left in its tank') : ''}
      ${supplies.map((u, i) => tank(`rcs-${i}`, `Jets ${u.name.length > 6 ? u.name.slice(0, 4) : u.name}`, `Attitude-jet propellant left in the ${u.name} system’s tank`)).join('')}
      ${
        axes.length
          ? `<div class="tank jets" title="Which attitude jets are firing: pitch, yaw and roll, each way"><span>Jets firing</span><b>${axes
              .map((a) => `<u data-jet="${a}+">${a[0]!.toUpperCase()}+</u><u data-jet="${a}-">${a[0]!.toUpperCase()}−</u>`)
              .join('')}</b></div>`
          : ''
      }
      <div class="tank motors" title="Every motor burning now, with its thrust"><span>Burning</span><b data-cell="motors"></b></div>`;
    for (const cell of el.querySelectorAll<HTMLElement>('[data-cell]')) this.cells.set(cell.dataset.cell!, cell);
  }

  /** Take the flight deck: the vehicle stands on its pad, the clock stopped at liftoff, waiting for ignition. */
  enter(): void {
    if (!this.vehicle || this.on) return;
    this.opened();
    if (this.keeping) this.resume();
    else this.fresh();
  }

  /** Taken over: guidance or the sequencer off, or a hand to the controls (the stick, a key of the six, the abort). */
  protected get byHand(): boolean {
    return !this.guidance || !this.sequence || this.touched;
  }
  protected get runOver(): boolean {
    return Boolean(this.state?.landing);
  }
  protected restore(): void {
    this.host.fly(this.run);
    this.follow();
  }
  private touched = false;
  protected override steered(): void {
    this.touched = true;
  }
  protected get ticks(): number {
    return this.state?.ticks ?? 0;
  }
  /** The run as it stands (deck/tape.ts): the vehicle's state, how it is flown and what the hands have done, and how much of it is kept. */
  protected print(): string {
    return pack([
      this.state,
      this.guidance,
      this.sequence,
      this.rate,
      this.touched,
      this.trim,
      this.hand,
      [this.lever.at, this.lever.lit],
      this.towerAt,
      this.retropackAt,
      this.hatchAt,
      [...this.hands],
      this.unsequenced,
      this.kept,
      this.run.samples.length,
      this.run.dropped,
    ]);
  }
  protected switches(to?: Record<string, boolean>): Record<string, boolean> {
    if (to) {
      this.guidance = to.guidance ?? true;
      this.sequence = to.sequence ?? true;
      this.rate = to.rate ?? false;
    }
    return { guidance: this.guidance, sequence: this.sequence, rate: this.rate };
  }

  /** A new flight: back on the pad. */
  protected fresh(): void {
    const v = this.vehicle!;
    this.clock.reset();
    this.started();
    this.state = v.start();
    this.tally = new Tally();
    this.hand = {};
    this.trim = { pitch: 0, yaw: 0 };
    this.touched = false;
    this.abortArmed = Number.NEGATIVE_INFINITY;
    this.kept = 0;
    this.eventAt = Number.NEGATIVE_INFINITY;
    this.towerAt = this.retropackAt = this.hatchAt = Infinity;
    this.hands.clear();
    this.rateChanges = [{ t: 0, out: this.rate }];
    this.unsequenced = this.sequence ? [] : [{ from: Number.NEGATIVE_INFINITY, to: Infinity }];
    this.run = runOf(this.flight, {
      samples: [v.sample(this.state)],
      duration: Infinity,
      cutoff: Infinity,
      dropped: this.flight.flies!.drops.map(() => Infinity),
      live: true,
      kept: true,
      out: { drogue: Infinity, main: Infinity },
      sheds: new Sheds(this.flight.plan!, siteFrame(this.flight.site), this.flight.site.seaLevel.value, {
        frame: frameOf(this.flight),
      }),
    }) as Run & { samples: LiveSample[] };
    this.maxQ = 0;
    this.kept = 1;
    this.card(null);
    this.host.fly(this.run);
    this.show(this.run.samples[0]!);
  }

  /** Who flies each tick: the autopilot as far as it is switched on, with the hands laid over it. */
  private pilot(): Pilot {
    const auto = autopilot(this.vehicle!, {
      launch: false,
      sequence: this.sequence,
      pitch: this.guidance,
      yaw: this.guidance,
      roll: this.guidance,
      trim: () => this.trim,
    });
    // (a key is all or nothing; a finger's stick is as far as it is pushed)
    const stick = (plus: string, minus: string, finger: number): number =>
      Math.max(-1, Math.min(1, Number(this.held.has(plus)) - Number(this.held.has(minus)) + finger));
    return (s) => {
      // W tips the nose down the range and S back; A swings it left of the azimuth; E rolls right
      const pitch = stick('w', 's', this.finger.pitch);
      const yaw = stick('a', 'd', this.finger.yaw);
      const roll = stick('e', 'q', this.finger.roll);
      // On the booster with guidance on, the stick leans the programme the platform holds (TRIM a second) and the
      // platform does the steering: the vanes at full throw would turn the stack end over end in four seconds.
      // Otherwise (guidance off, or the spacecraft alone on its gentle jets) the stick is the control itself.
      const trimmed = this.guidance && !hasLeft(s.craft, this.roles.booster.id);
      if (trimmed) {
        const lean = (now: number, by: number) => Math.max(-TRIM_MOST, Math.min(TRIM_MOST, now + by * TRIM * TICK));
        this.trim = { pitch: lean(this.trim.pitch, pitch), yaw: lean(this.trim.yaw, yaw) };
      }
      const own = (v: number): number | undefined => (v !== 0 ? v : this.guidance ? undefined : 0);
      // an engine with a lever runs where the lever stands, from the moment it is lit; the sequencer's cutoff at the record's time is not undone by it
      const cut = this.sequence && s.abortAt === null && s.t >= rolesOf(this.flight)!.cutoff - 1e-9;
      // rate command, on the spacecraft alone: the stick is a rate asked for on every axis, held through the manual jets
      const rated = this.rate && hasLeft(s.craft, this.roles.booster.id) ? rolesOf(this.flight)!.craft.rigid!.capsule.rcs?.rate : undefined;
      if (rated) return blend(auto(s), { ...this.hand, ...rateCommand(s, { pitch, yaw, roll }, rated), automatic: this.sequence });
      return blend(auto(s), {
        ...this.hand,
        ...(s.abortAt === null ? { throttle: this.lever.asks(cut) } : {}),
        pitch: trimmed ? undefined : own(pitch),
        yaw: trimmed ? undefined : own(yaw),
        roll: own(roll),
        // On the spacecraft an axis the hand has is worked through the manual system's own chambers and tank; what the
        // autopilot steers goes through the automatic system's. (Mercury's fly-by-wire, a hand on the automatic
        // system's chambers, is not offered.) With the sequencer off the spacecraft's own sequence is off too: no
        // parachute comes out by itself.
        manual: { pitch: own(pitch) !== undefined, yaw: own(yaw) !== undefined, roll: own(roll) !== undefined },
        automatic: this.sequence,
      });
    };
  }

  /** The clock has moved (or been stopped, or put somewhere): bring the flight up to it. */
  protected follow(): void {
    const v = this.vehicle;
    let state = this.state;
    if (!this.on || !v || !state) return;
    const t = this.clock.t;
    if (t < 0) this.clock.seek(0); // there is no countdown to fly
    const ahead = t - state.t;
    const begun = state.ignited || state.abortAt !== null || state.towerAt !== null;
    if (ahead <= 0 || !begun || state.landing) {
      // put back, or waiting on the pad, or down: show the moment the clock is at, as it was flown
      if (!begun && t > 0) this.clock.seek(0);
      const over = this.over(state);
      if (state.landing && t > over) {
        this.clock.pause();
        this.clock.seek(over);
      }
      this.show(this.at(Math.min(t, state.t)));
      return;
    }
    const pilot = this.pilot();
    const upTo = state.t + Math.min(ahead, MOST);
    while (state.t < upTo - TICK / 2 && !state.landing) {
      const before = state;
      state = this.tick(state, pilot);
      if (state.ticks === before.ticks) break;
    }
    this.state = state;
    if (ahead > MOST) this.clock.seek(state.t); // (the clock was run faster than the flight can be flown: it waits)
    // a frame's fraction of a tick is left for the next frame: the scene is shown at the flight's own instant
    this.show(this.run.samples[this.run.samples.length - 1]!);
    if (state.landing) {
      // down: the flight is over at this instant, and the clock goes on from it at life's pace for a few seconds more (`AFTER`)
      this.run.duration = state.landing.t;
      // in the sea (sim/afloat.ts): with its hatch blown on the way the sea comes in over the sill at once
      if (!this.run.afloat) {
        afterwards(this.flight, this.run, { hatch: this.hatchAt });
        const hatch = this.flight.flies?.hatch;
        if (hatch && this.hatchAt <= state.landing.t && this.run.afloat) this.host.say?.(hatch.label, hatch.afloat);
      }
      this.clock.setRate(1);
      this.clock.seek(state.landing.t);
      this.card(this.tally.results);
    }
  }

  /** One tick of the flight, noted: its sample kept for the scene, its events' times, what it came to. Every tick goes through here, so none is flown unseen. */
  private tick(before: VehicleState, pilot: Pilot): VehicleState {
    const v = this.vehicle!;
    const free = v.tick(before, pilot);
    const { state, hits, impulses } = this.run.sheds!.ballistic(v, before, free);
    const touched = state !== free;
    if (touched) this.kept = keepContact(this.run.samples, this.kept, before, free, impulses, v.sample);
    for (const hit of hits) this.impact(hit);
    // (let go under thrust: said once, as it happens, and once more when it parts)
    if (state.loose !== null && before.loose === null && !hasLeft(state.craft, this.roles.booster.id))
      this.host.say?.(
        'Let go, still pushing',
        'The spacecraft is let go, but the booster still pushes it: it rides on its adapter until the engine stops',
      );
    else if (state.loose !== null && hasLeft(state.craft, this.roles.booster.id) && !hasLeft(before.craft, this.roles.booster.id))
      this.host.say?.('Parted', 'The spacecraft parted at last, the booster’s push gone');
    if (state.retroAt !== null && before.retroAt === null && !hasLeft(state.craft, this.roles.booster.id))
      this.host.say?.(
        'Retrofire on the booster',
        'The retrorockets fire into the adapter: their push is on the whole stack, through the clamp ring. What their jets do to the adapter is not modelled',
      );
    if (state.ticks === before.ticks) return state;
    const s = v.sample(state);
    this.tally.note(s, state, v);
    this.note(before, state, s, touched);
    return state;
  }

  /** A tick has been flown: keep its sample for the scene, and the times of what happened in it. */
  private note(before: VehicleState, state: VehicleState, s: LiveSample, touched: boolean): void {
    const run = this.run;
    const last = run.samples[this.kept - 1]!;
    const event =
      touched ||
      state.cutoff !== before.cutoff ||
      Object.keys(state.craft.bodies).some((k) => state.craft.bodies[k] !== before.craft.bodies[k]) ||
      changed(s, last) ||
      Boolean(state.landing);
    run.samples.length = this.kept;
    run.samples.push(s);
    if (event || s.t - last.t >= KEEP - TICK / 2) this.kept = run.samples.length;
    if (!hasLeft(state.craft, this.roles.booster.id)) this.maxQ = Math.max(this.maxQ, s.q);
    // (an engine shut down that was never lit, in an abort off the pad, did not burn up to now: it never burned)
    if (state.cutoff && !before.cutoff) run.cutoff = state.ignited ? state.t : Number.NEGATIVE_INFINITY;
    if (hasLeft(state.craft, this.roles.tower) && !hasLeft(before.craft, this.roles.tower)) this.towerAt = state.t;
    if (hasLeft(state.craft, this.roles.pack) && !hasLeft(before.craft, this.roles.pack)) this.retropackAt = state.t;
    run.out = { drogue: state.drogueAt ?? Infinity, main: state.mainAt ?? Infinity };
    Object.assign(run, grown(this.flight.plan!, state.craft));
    run.entered = state.enteredAt ?? Infinity;
    run.torn = { drogue: state.tore.drogue?.t ?? Infinity, main: state.tore.main?.t ?? Infinity };
    // (each drop as what lets it go, by the plan's id: the tower's, the booster's and the pack's joints, the parachutes; the hatch by its node)
    const roles = this.roles;
    const when = new Map<string | undefined, number>([
      [roles.towerJoint?.id, this.towerAt],
      [roles.separation.id, state.separation?.t ?? Infinity],
      [roles.packJoint?.id, this.retropackAt],
      [roles.drogue.id, run.out.drogue],
      [roles.main.id, run.out.main],
    ]);
    const hatch = this.flight.flies?.hatch?.node;
    run.dropped = this.flight.flies!.drops.map((d) =>
      hatch && d.nodes.includes(hatch) ? this.hatchAt : d.on ? (when.get(d.on) ?? Infinity) : Infinity,
    );
    // an event asked for has happened: the hand lets go of it
    if (state.abortAt !== null) this.hand.events = this.hand.events?.filter((e) => e !== this.abortEvent);
    if (state.ignited) delete this.hand.throttle;
    if (state.cutoff && this.hand.throttle === 0) delete this.hand.throttle;
  }

  /** A hand asks for one of the plan's events: the vehicle sets it off as soon as it can. */
  private asks(event: string): void {
    if (!this.hand.events?.includes(event)) this.hand.events = [...(this.hand.events ?? []), event];
  }

  /** The abort: the plan's event a hand's command sets off. */
  private get abortEvent(): string | undefined {
    return this.vehicle?.plan.events.find((e) => e.when.some((w) => 'command' in w))?.id;
  }

  /** The flight as it was at `t`: the kept sample at or before it. */
  /** What the plan calls an engine, said short (a sample's motors are by the plan's id). */
  private engineLabel(id: string): string {
    return this.vehicle!.plan.craft[0]!.engines.find((e) => e.id === id)?.label.toLowerCase() ?? id;
  }

  private at(t: number): LiveSample {
    const samples = this.run.samples;
    let lo = 0;
    let hi = samples.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (samples[mid]!.t <= t) lo = mid;
      else hi = mid - 1;
    }
    return samples[lo]!;
  }

  /** What Space would do now, or null when there is nothing left to set off. */
  private next(): Step | null {
    const s = this.state;
    const roles = rolesOf(this.flight)!;
    // (down, all that is left is a hatch to blow, where there is one)
    if (s?.landing) return this.can('hatch') ? 'hatch' : null;
    if (!s) return null;
    if (!s.ignited && s.abortAt === null) return 'ignite';
    if (!s.cutoff) return 'cutoff';
    if (roles.towerJoint?.at && !hasLeft(s.craft, this.roles.tower)) return 'tower';
    if (!hasLeft(s.craft, this.roles.booster.id)) return 'separate';
    // (after an abort the retrorockets are not part of what is left to do: the parachutes are next)
    if (s.abortAt === null && s.retroAt === null) return 'retro';
    if (s.abortAt === null && !hasLeft(s.craft, this.roles.pack)) return 'retropack';
    if (s.drogueAt === null) return 'drogue';
    if (s.mainAt === null) return 'main';
    return null;
  }

  /**
   * A control in the cabin worked by hand (viewer/cabin.ts): 'abort' and 'next' are the keys' own, guarded as they
   * are; any other names the one thing to set off now (a pull ring does its own thing, whatever is next in order).
   */
  protected obey(what: string): void {
    if (what === 'abort' || what === 'next' || what === 'rate') return void this.command(what);
    if (what.startsWith(WORK)) return void this.work(what.slice(WORK.length)); // (a mechanism worked by hand: types.ts `Command`)
    if (what === 'hatch') return void this.blow();
    const s = this.state;
    if (!this.on || !s || s.landing || this.clock.t < s.t - TICK) return;
    if (what === 'cutoff') {
      // (the lever, as Space does it)
      if (!s.ignited || s.cutoff) return;
      this.setLever(0);
    } else {
      const event = eventOf(this.roles, what as Step);
      if (!event) return;
      this.asks(event.id);
      // (the tower let go on the pad unlit: its rockets start the clock, as an abort's does)
      if (what === 'tower' && !s.ignited && s.abortAt === null) {
        this.state = this.tick(s, this.pilot());
        this.clock.setRate(1);
        this.clock.play(true);
        return;
      }
    }
    if (!this.clock.running && s.ignited) this.clock.play(true);
  }

  /**
   * A mechanism of the vehicle worked by hand (its control in the cabin, its switch on the deck, its part's menu): sent the
   * other way from where it is headed, from this instant of the flight. Says where it is now sent, or null if there
   * is nothing to work (no such mechanism, no flight being flown, or the clock put back to look at what was flown).
   */
  protected worked(id: string): string | null {
    const mechanism = this.mechanisms.find((m) => m.id === id);
    const s = this.state;
    if (!mechanism || !this.on || !s || this.clock.t < s.t - TICK) return null;
    const hands = this.hands.get(id) ?? [];
    const out = !sentBy(mechanism, s.t, hands, this.unsequenced);
    this.hands.set(id, [...hands, { t: s.t, out }]);
    this.show(this.at(Math.min(this.clock.t, s.t)));
    this.host.say?.(mechanism.name, `${mechanism.says[out ? 1 : 0]} by hand`);
    return mechanism.says[out ? 1 : 0];
  }

  /**
   * Blow the hatch (`flies.hatch`), now: it leaves as a body of its own (sim/loose.ts). In flight the flight flies on as if
   * the cabin were closed, the debrief saying what that meant; afloat the spacecraft floods as sim/afloat.ts has it, and the
   * clock runs on at life's pace until it has gone under (`Run.afloat`).
   */
  private blow(): void {
    const hatch = this.flight.flies?.hatch;
    const s = this.state;
    if (!hatch || !s || !this.can('hatch')) return;
    const afloat = Boolean(s.landing);
    this.hatchAt = afloat ? Math.max(this.clock.t, s.landing!.t) : s.t;
    // (the drop that is the hatch: the one of its node)
    const i = this.flight.flies!.drops.findIndex((d) => d.nodes.includes(hatch.node));
    if (i >= 0) this.run.dropped[i] = this.hatchAt;
    if (afloat) afterwards(this.flight, this.run, { hatch: this.hatchAt });
    else blownAloft(this.flight, this.run, this.run.samples[this.run.samples.length - 1] as LiveSample);
    this.host.say?.(hatch.label, afloat ? hatch.afloat : hatch.aloft);
    if (afloat) {
      this.clock.setRate(1);
      this.clock.play(true);
      this.card(this.tally.results);
    } else if (!this.clock.running) this.clock.play(true);
  }

  /** When the flight is over: a few seconds after it is down, or after it has gone under where the hatch was blown afloat. */
  private over(state: VehicleState): number {
    const down = state.landing ? state.landing.t : Infinity;
    const a = this.run.afloat;
    return Math.max(down + AFTER, a && Number.isFinite(a.under) ? a.end + SUNK : -Infinity);
  }

  /** Where a mechanism is headed at this instant of the flight being flown: out (true) or in. Null: no such mechanism, or no flight. */
  headed(id: string): boolean | null {
    const mechanism = this.mechanisms.find((m) => m.id === id);
    const s = this.state;
    return mechanism && this.on && s ? sentBy(mechanism, s.t, this.hands.get(id), this.unsequenced) : null;
  }

  /**
   * How far out a mechanism is at `t` of the flight being flown, 0 to 1: its programme, what the hands have told it
   * and the sequencer's being off, each heard at its instant (sim/mechanism.ts). Null: no such mechanism, or no flight.
   */
  travel(id: string, t: number): number | null {
    const mechanism = this.mechanisms.find((m) => m.id === id);
    if (!mechanism || !this.on) return null;
    return travelAt(mechanism, t, this.hands.get(id), this.unsequenced);
  }

  /**
   * Whether a step can be set off now (types.ts `Command`): the flight is being flown, at its own instant and not
   * looked back at, and the simulator would hear the command (sim/vehicle.ts: no parachute past a tower, no
   * retrorockets on a spacecraft still on its booster, nothing twice).
   */
  can(what: Command['ask']): boolean {
    const s = this.state;
    // (a mechanism can be worked whenever `work` would hear it: held on the pad and under the parachute as in flight)
    if (what.startsWith(WORK))
      return this.on && !!s && this.clock.t >= s.t - TICK && this.mechanisms.some((m) => m.id === what.slice(WORK.length));
    // (the hatch, with the spacecraft alone: in flight, and afloat after it is down)
    if (what === 'hatch')
      return (
        Boolean(this.flight.flies?.hatch) &&
        this.on &&
        !!s &&
        hasLeft(s.craft, this.roles.booster.id) &&
        this.hatchAt === Infinity &&
        this.clock.t >= s.t - TICK
      );
    // (the tower, on the pad as in flight: sim/vehicle.ts lets it go wherever the stack stands)
    if (what === 'tower')
      return (
        this.on &&
        !!s &&
        !s.landing &&
        this.clock.t >= s.t - TICK &&
        Boolean(rolesOf(this.flight)?.towerJoint?.at) &&
        !hasLeft(s.craft, this.roles.tower)
      );
    if (!this.on || !s || s.landing || s.held || this.clock.t < s.t - TICK) return false;
    const alone = hasLeft(s.craft, this.roles.booster.id);
    if (what === 'cutoff') return s.ignited && !s.cutoff;
    if (what === 'separate') return !alone;
    if (what === 'retro') return s.retroAt === null && !hasLeft(s.craft, this.roles.pack);
    if (what === 'retropack') return alone && !hasLeft(s.craft, this.roles.pack);
    if (what === 'drogue') return alone && hasLeft(s.craft, this.roles.tower) && s.drogueAt === null && s.mainAt === null;
    return alone && hasLeft(s.craft, this.roles.tower) && s.mainAt === null;
  }

  protected command(what: string): void {
    if (!this.on) return;
    if (what === 'leave') this.leave();
    else if (what === 'again') this.fresh();
    else if (what === 'guidance') this.guidance = !this.guidance;
    else if (what === 'rate' && rolesOf(this.flight)?.craft.rigid?.capsule.rcs?.rate) {
      this.rate = !this.rate;
      this.rateChanges.push({ t: this.state?.t ?? 0, out: this.rate });
    } else if (what === 'sequence') {
      this.sequence = !this.sequence;
      // (when in this flight it was off: a mechanism's programme is not heard then, and is taken up again where it is switched on)
      const now = this.state?.t ?? 0;
      const open = this.unsequenced.find((span) => span.to === Infinity);
      if (this.sequence && open) open.to = now;
      else if (!this.sequence && !open) this.unsequenced.push({ from: now, to: Infinity });
    } else if (what === 'abort') {
      // guarded: the first press arms it and says so, the second within two seconds fires the rocket
      const s = this.state;
      const now = this.now() / 1000;
      if (!s || s.landing || hasLeft(s.craft, this.roles.tower) || s.abortAt !== null || !rolesOf(this.flight)?.escape) return;
      if (this.clock.t < s.t - TICK) return; // (looking back at what was flown)
      if (now - this.abortArmed > ABORT_ARMED) this.abortArmed = now;
      else {
        this.abortArmed = Number.NEGATIVE_INFINITY;
        this.touched = true;
        if (this.abortEvent) this.asks(this.abortEvent);
        delete this.hand.throttle;
        if (!s.ignited) {
          this.state = this.tick(s, this.pilot()); // off the pad unlit: the clock has a flight to run from this instant
          this.clock.setRate(1);
        }
        this.clock.play(true);
      }
    } else if (what === 'next') {
      const step = this.next();
      const now = this.now() / 1000;
      // (put back to look at what was flown, Space runs the clock on again rather than setting anything off)
      if (this.state && this.clock.t < this.state.t - TICK) {
        this.clock.play(true);
        return;
      }
      if (!step || now - this.eventAt < GUARD) return;
      this.eventAt = now;
      if (step === 'ignite') {
        this.lever.lit = true;
        this.state = this.tick(this.state!, this.pilot()); // lit at this instant, so the clock has a flight to run
        this.clock.setRate(1);
        this.clock.play(true);
      } else if (step === 'cutoff') this.setLever(0);
      else if (step === 'hatch') return void this.blow();
      else {
        const event = eventOf(this.roles, step);
        if (event) this.asks(event.id);
      }
      if (!this.clock.running && step !== 'ignite') this.clock.play(true);
    }
    if (this.state) this.show(this.at(Math.min(this.clock.t, this.state.t)));
  }

  /** Put a sample on the instruments. Only what has changed touches the page. */
  private show(s: LiveSample): void {
    const roles = rolesOf(this.flight)!;
    const set = (id: string, text: string) => {
      const el = this.cells.get(id)!;
      if (el.textContent !== text) el.textContent = text;
    };
    const up = s.r;
    const burnable = this.flow * roles.cutoff;
    const state = this.state!;
    // (the greatest dynamic pressure is called as it comes and goes: within 3 per cent of the most so far, and no longer rising by a per cent of it a second)
    const riding = s.riding;
    const maxQ = riding && s.mach > 0.5 && s.q >= 0.97 * this.maxQ && s.q - this.at(s.t - 1).q < 0.01 * this.maxQ;
    set(
      'phase',
      state.landing && s.t >= state.landing.t
        ? 'Down'
        : !state.ignited && state.abortAt === null
          ? 'On the pad'
          : `${doingWords(s, roles.craft.chutes)}${maxQ ? ' · MAX Q' : ''}`,
    );
    const load = this.cells.get('load')!;
    load.hidden = !riding || !(s.strain > 0.02);
    if (!load.hidden) {
      set('load', `Bending ${(100 * s.strain).toFixed(0)} %`);
      load.dataset.standing = standing(s.strain);
      load.style.setProperty('--load', `${Math.min(100, 100 * s.strain).toFixed(0)}%`);
    }
    // (a height a hair under nothing, as a landing leaves it, is nothing: not "-0.00")
    set('altitude', (Math.max(0, s.altitude) / 1000).toFixed(s.altitude < 99_950 ? 2 : 1));
    set('speed', s.groundSpeed.toFixed(0));
    set('climb', (s.groundSpeed * Math.sin(s.groundClimb * DEG)).toFixed(0));
    set('range', (s.range / 1000).toFixed(s.range < 99_950 ? 2 : 1));
    set('g', s.g.toFixed(2));
    set('q', (s.q / 1000).toFixed(1));
    set('mach', s.mach.toFixed(2));
    set('pitch', (90 - angleBetween(s.axis, up) / DEG).toFixed(0));
    set('alpha', s.groundSpeed > 5 && s.q > 1 ? s.alpha.toFixed(1) : '–');
    const toBurn = Math.max(0, Math.min(100, (100 * (s.mass - (roles.craft.mass.value - burnable))) / burnable));
    set('fuel', riding ? `${toBurn.toFixed(0)} %` : '–');
    const burn = this.cells.get('fuel')!.closest<HTMLElement>('.tank')!;
    burn.style.setProperty('--left', `${riding ? toBurn.toFixed(0) : 0}%`);
    burn.classList.toggle('low', riding && toBurn < 100 * LOW && toBurn > 0);
    const replay = this.clock.t < state.t - TICK;
    const leant = (v: number, plus: string, minus: string) =>
      Math.abs(v) < 0.05 * DEG ? '' : ` ${(Math.abs(v) / DEG).toFixed(1)}° ${v > 0 ? plus : minus}`;
    const leans = hasLeft(state.craft, this.roles.booster.id)
      ? ''
      : leant(this.trim.pitch, 'downrange', 'back') + leant(this.trim.yaw, 'left', 'right');
    const step = this.next();
    set('next', replay ? 'Run on' : step ? STEPS[step] : 'Nothing left to do');
    this.root.querySelector<HTMLButtonElement>('[data-do=next]')!.disabled = !replay && !step;
    // (the two switches say how it is being flown; this line is for what is out of the ordinary)
    const ratedAt = replay ? this.rateChanges.reduce((old, change) => (change.t <= s.t ? change.out : old), false) : this.rate;
    const rated = ratedAt && hasLeft(state.craft, this.roles.booster.id);
    set(
      'mode',
      replay
        ? 'Looking back at what was flown'
        : leans
          ? `Programme leaned${leans}`
          : rated
            ? 'Rate command'
            : !this.guidance
              ? 'Hands only'
              : '',
    );
    this.root.querySelector('[data-do=guidance]')!.setAttribute('aria-pressed', String(this.guidance));
    this.root.querySelector('[data-do=sequence]')!.setAttribute('aria-pressed', String(this.sequence));
    this.root.querySelector('[data-do=rate]')?.setAttribute('aria-pressed', String(ratedAt));
    for (const m of this.mechanisms)
      this.root
        .querySelector(`[data-work="${m.id}"]`)!
        .setAttribute('aria-pressed', String(sentBy(m, s.t, this.hands.get(m.id), this.unsequenced)));
    this.root.classList.toggle('thrusting', state.ignited && !state.cutoff && !replay);
    const heat = this.host.heat?.(s.t);
    this.cells.get('heat')!.hidden = !heat?.warm; // (it reads once the air has begun to heat it)
    this.cells.get('heat')!.classList.toggle('hot', Boolean(heat?.hot));
    if (heat?.warm)
      set('heat', `${heat.name} ${heat.temperature.toFixed(0)} K of ${heat.limit.toFixed(0)} · ${(heat.flux / 1000).toFixed(0)} kW/m²`);
    this.gauges(s, state, replay);
    for (const fn of this.watchers) fn(s, replay ? null : state, { holds: ratedAt ? RATE_ON : RATE_OFF });
  }

  /** The systems strip and the prompt: what there is left to fly with, what is firing, and what is due. */
  private gauges(s: LiveSample, state: VehicleState, replay: boolean): void {
    const roles = rolesOf(this.flight)!;
    const body = roles.craft.rigid!;
    const set = (id: string, text: string, low = false) => {
      const el = this.cells.get(id);
      if (!el) return;
      if (el.textContent !== text) el.textContent = text;
      el.parentElement!.classList.toggle('low', low);
    };
    const left = (id: string, now: number, full: number) => {
      const part = full > 0 ? now / full : 0;
      const empty = part < 0.002;
      set(id, empty ? 'Empty' : `${(part * 100).toFixed(0)} %`, part < LOW);
      set(`${id}-kg`, empty ? '' : `${now.toFixed(now < 100 ? 1 : 0)} kg`, part < LOW);
      this.cells.get(id)?.parentElement?.style.setProperty('--left', `${(100 * Math.max(0, Math.min(1, part))).toFixed(0)}%`);
    };
    // the engine: its kind, and what it is doing
    const nature = roles.engine;
    const main = s.burning.find((m) => m.engine === this.vehicle!.engine);
    const range = nature.throttle?.range;
    set(
      'engine-kind',
      nature.kind === 'solid'
        ? 'solid: burns out'
        : range
          ? `throttle ${(range[0] * 100).toFixed(0)} to ${(range[1] * 100).toFixed(0)} %`
          : 'fixed thrust',
    );
    const before = !state.ignited && state.abortAt === null;
    const spent = this.vehicle!.tanks && s.tanks ? Math.min(s.tanks.oxidizer, s.tanks.fuel) < 1 : false;
    const at = this.lever?.at ?? 1;
    const lever = range ? `, lever ${(at * 100).toFixed(0)} %` : '';
    set(
      'engine',
      main
        ? `${(main.thrust / 1000).toFixed(0)} kN${range ? ` (${((state.throttle || at) * 100).toFixed(0)} %${lever})` : ''}`
        : before
          ? 'Not lit'
          : s.tanks === null
            ? 'Gone'
            : spent
              ? nature.kind === 'solid'
                ? 'Burnt out'
                : 'Out of propellant'
              : 'Cut off',
    );
    const full = this.vehicle!.tanks;
    if (full && s.tanks) {
      left('oxidizer', s.tanks.oxidizer, full.oxidizer);
      left('fuel-tank', s.tanks.fuel, full.fuel);
    } else if (full) {
      // (the tanks went with the booster)
      for (const id of ['oxidizer', 'fuel-tank']) {
        set(id, '–');
        set(`${id}-kg`, '');
        this.cells.get(id)?.parentElement?.style.setProperty('--left', '0%');
      }
    }
    const rcs = body.capsule.rcs;
    if (rcs) {
      rcs.supplies.forEach((u, i) => left(`rcs-${i}`, s.rcs.left[i] ?? u.propellant.value, u.propellant.value));
      const open = new Set<string>();
      s.rcs.firing.forEach((f, i) => {
        if (f > 0) open.add(`${rcs.thrusters[i]!.axis}${rcs.thrusters[i]!.sense > 0 ? '+' : '-'}`);
      });
      for (const lamp of this.root.querySelectorAll<HTMLElement>('[data-jet]')) lamp.classList.toggle('on', open.has(lamp.dataset.jet!));
    }
    set(
      'motors',
      s.burning.length
        ? s.burning.map((m) => `${this.engineLabel(m.engine)} ${(m.thrust / 1000).toFixed(m.thrust < 20_000 ? 1 : 0)} kN`).join(' · ')
        : '–',
    );

    // the abort: there while the tower is, and armed between its two presses
    const abort = this.root.querySelector<HTMLButtonElement>('[data-do=abort]')!;
    const can = Boolean(body.escape) && !hasLeft(state.craft, this.roles.tower) && state.abortAt === null && !state.landing && !replay;
    abort.disabled = !can;
    const armed = can && this.now() / 1000 - this.abortArmed <= ABORT_ARMED;
    abort.classList.toggle('armed', armed);
    set('abort', armed ? 'Press again to abort' : 'Abort');

    // what the sequence depends on, and what is due and not done when it is the pilot's to do
    const cues: string[] = [];
    const due: string[] = [];
    const coming = s.groundClimb < 0 && hasLeft(state.craft, this.roles.booster.id);
    if (state.enteredAt !== null && s.t >= state.enteredAt && state.drogueAt === null) cues.push('0.05 g');
    const feet = (m: number) => `${Math.round(m / FT / 100) * 100} ft`.replace(/(\d)(\d{3}) /, '$1,$2 ');
    if (coming && hasLeft(state.craft, this.roles.tower) && state.mainAt === null) {
      const which = state.drogueAt === null ? ('drogue' as const) : ('main' as const);
      const at = which === 'drogue' ? roles.drogueHeight : roles.mainHeight;
      cues.push(`${which === 'drogue' ? 'Drogue' : 'Main'}: ${feet(at)} (${(at / 1000).toFixed(1)} km)`);
      if (!this.sequence && s.altitude <= at) due.push(`${which === 'drogue' ? 'Drogue' : 'Main'} parachute is due`);
    }
    if (!this.sequence && !replay && !state.landing && state.ignited && state.abortAt === null) {
      const late = (at: number) => s.t >= at;
      const towerAt = roles.towerJoint?.at?.value;
      if (!state.cutoff && late(roles.cutoff)) due.push('Cutoff is due');
      else if (state.cutoff && towerAt !== undefined && !hasLeft(state.craft, this.roles.tower) && late(towerAt))
        due.push('Tower jettison is due');
      else if (
        hasLeft(state.craft, this.roles.tower) &&
        !hasLeft(state.craft, this.roles.booster.id) &&
        late(roles.separation.at?.value ?? Infinity)
      )
        due.push('Separation is due');
      else if (hasLeft(state.craft, this.roles.booster.id) && state.retroAt === null && late(roles.retroAt)) due.push('Retrofire is due');
      else if (state.retroAt !== null && !hasLeft(state.craft, this.roles.pack) && late(roles.packJoint?.at?.value ?? Infinity))
        due.push('Retropack jettison is due');
    }
    if (state.abortAt !== null && !hasLeft(state.craft, this.roles.tower) && !this.sequence && coming)
      due.push('Tower jettison is due: no parachute comes out past it');
    // waiting on the pilot to begin: said, and the button asks (cockpit.css `waiting`)
    const waiting = before && !replay;
    if (waiting)
      cues.push(
        matchMedia('(hover: none), (pointer: coarse)').matches ? 'Ready: Ignition lights the engine' : 'Ready: Space lights the engine',
      );
    this.root.classList.toggle('waiting', waiting);
    const prompt = this.cells.get('prompt')!;
    const text = [...due, ...cues].join(' · ');
    if (prompt.textContent !== text) prompt.textContent = text;
    if (prompt.title !== text) prompt.title = text;
    prompt.hidden = !text || replay;
    prompt.classList.toggle('due', due.length > 0);
  }

  /** How it ended, said plainly, beside what the reports give for the flight itself. */
  private card(results: Results | null): void {
    const el = this.root.querySelector<HTMLElement>('.cockpit-card')!;
    el.hidden = !results;
    const landing = this.state?.landing;
    if (!results || !landing) return;
    const said = (id: string) => this.flight.checks?.find((c) => c.id === id)?.value;
    // where the simulator's own run of this flight is known to miss the record (sim/misses.ts), the figure says so and why
    const known = MISSES[this.flight.id]?.whole ?? {};
    const row = (label: string, flown: number, id: string, per: number, unit: string, digits = 1) => {
      const record = said(id);
      const check = this.flight.checks?.find((c) => c.id === id);
      const miss = known[id];
      const note =
        miss && check && Math.abs(flown - check.value) > check.tolerance
          ? `<small class="cockpit-miss">a known miss: ${miss.short ?? miss.why}</small>`
          : '';
      return `<tr><th>${label}${note}</th><td>${(flown / per).toFixed(digits)} ${unit}</td><td>${record === undefined ? '' : `${(record / per).toFixed(digits)} ${unit}`}</td></tr>`;
    };
    const end = verdict(this.state!, results, this.flight.plan!, this.tally.peakG);
    const lived =
      end.survivable === null
        ? ''
        : `<p class="cockpit-verdict${end.survivable ? '' : ' lost'}">${end.survivable ? 'Survivable.' : 'Not survivable.'} ${end.against}</p>`;
    // what the structure and the parachutes did not take (sim/loads.ts), and where what was let go came down (sim/shed.ts)
    const { broke, tore } = this.state!;
    // (each by the plan's own name for it)
    const names = { drogue: this.roles.drogue.label.toLowerCase(), main: this.roles.main.label.toLowerCase() };
    const tears = (['drogue', 'main'] as const).flatMap((which) => {
      const tear = tore[which];
      if (!tear) return [];
      const out = which === 'drogue' ? this.state!.drogueAt : this.state!.mainAt;
      // (torn as it came out, or by the air it was carried into afterwards)
      const how =
        tear.by === 'pull'
          ? `the pull on its lines came to ${(tear.pull / 1000).toFixed(0)} kN`
          : `${tear.t - (out ?? tear.t) < 0.02 ? 'let out in' : 'carried into'} ${(tear.q / 1000).toFixed(1)} kPa of dynamic pressure`;
      return [`The ${names[which]} tore at T+${tear.t.toFixed(0)} s: ${how}, more than it can take.`];
    });
    const lost = [
      broke
        ? `Broke up at T+${broke.t.toFixed(0)} s: bending load ${(100 * broke.load).toFixed(0)} per cent of the limit at ${(broke.q / 1000).toFixed(0)} kPa, ${broke.alpha.toFixed(0)} degrees off the wind.`
        : '',
      ...tears,
    ].filter(Boolean);
    const fell = (this.run.sheds?.all ?? []).map((body) => {
      const down = body.finish();
      if (!down) return `${body.shedder.def.name}: still aloft at the end of the landing search.`;
      return `${body.shedder.def.name}: ${down.t <= body.from ? 'stayed where it stood' : `down ${(down.range / 1000).toFixed(0)} km from the pad at ${down.speed.toFixed(0)} m/s, T+${down.t.toFixed(0)} s`}.`;
    });
    // the hatch, where it was blown: what it meant, and on a spacecraft afloat what the record has after
    const hatch = this.flight.flies?.hatch;
    const aloft = hatch && this.hatchAt < (this.state?.landing?.t ?? Infinity) ? [hatch.aloft] : [];
    const sank = Number.isFinite(this.run.afloat?.under ?? Infinity);
    // (what the flight's own words say of its going down, after it was afloat: Craft.lands `sank`)
    const sunk = landsOf(this.flight.plan!).sank;
    const blown = !hatch || this.hatchAt === Infinity ? [] : sank ? [...aloft, hatch.afloat, hatch.record] : aloft;
    const kept = hatch && this.hatchAt === Infinity ? [`The hatch stayed on. ${hatch.record}`] : [];
    el.innerHTML = `
      <h3>${end.how}${sank && sunk ? `; ${sunk}` : ''}</h3>
      ${[...lost, ...end.why, ...blown].map((w) => `<p class="cockpit-why">${w}</p>`).join('')}
      ${kept.map((w) => `<p class="cockpit-fell">${w}</p>`).join('')}
      ${fell.length ? `<p class="cockpit-fell">${fell.join(' ')}</p>` : ''}
      ${this.impactSummary()}
      ${lived}
      <table>
        <thead><tr><td></td><td>You</td><td>${this.flight.callsign}</td></tr></thead>
        ${row('Greatest height', results.apogee, 'apogee', 1000, 'km')}
        ${row('Range', results.range, 'range', 1000, 'km')}
        ${row('Time of flight', results.duration, 'duration', 1, 's', 0)}
        ${row('Greatest load going up', results.exitG, 'exitG', 1, 'g')}
        ${row('Greatest load coming down', results.entryG, 'entryG', 1, 'g')}
        ${row(`Speed at ${landsOf(this.flight.plan!).surface}`, results.landingSpeed, 'landingSpeed', 1, 'm/s')}
      </table>
      <p><button data-do="again"><kbd>N</kbd> Fly it again</button><button data-do="leave"><kbd>Esc</kbd> Leave</button></p>`;
  }
}

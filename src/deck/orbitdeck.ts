import type { Impact } from '../sim/contact.ts';
import { downOf } from '../sim/descent.ts';
import { apparentBy, type Descend, guided, spacecraft } from '../sim/fliers.ts';
import { along } from '../sim/fly.ts';
import {
  automatic,
  coastEngineState,
  coastEvents,
  coastOf,
  type DescentFlown,
  type DescentHands,
  heightsBall,
  shipOf,
} from '../sim/orbital.ts';
import { skyOf } from '../sim/air.ts';
import { handRange } from '../sim/lever.ts';
import { targetAt } from '../sim/orbital-target.ts';
import { type AbortMode, abortAt, clockAt, eventOf, type FlightPlan, flownByHand } from '../sim/plan.ts';
import { type Predictor, propagate, reaches } from '../sim/predict.ts';
import { due, onRails } from '../sim/rails.ts';
import { aboutAxis, conjugate, multiply, type Quat, turn } from '../sim/rigid.ts';
import {
  attend,
  attitudeBetween,
  between,
  coastContacts,
  either,
  firesOf,
  floatUprighting,
  flownPlan,
  grown,
  keepContact,
  orbitalEvents,
  orbitalFlown,
  orbitalRecord,
  type Run,
  shownAt,
} from '../sim/run.ts';
import {
  type Ascended,
  type DrawnDescent,
  descentOf,
  type FlownWhole,
  flowOf,
  flyOn,
  givenUp,
  airOf,
  guidanceOf,
  held,
  lawOf,
  passiveSpherePose,
  recordSamples,
  sequenceOf,
  stagesOf,
} from '../sim/staged.ts';
import {
  type StagedPilot,
  type StagedPilotOptions,
  type StagedState,
  type StagedTally,
  type StagedVehicle,
  type Step,
  stagedVehicle,
} from '../sim/stagedlive.ts';
import { type LiveSample, TICK } from '../sim/vehicle.ts';
import { landsOf } from '../sim/verdict.ts';
import type { SitedFlight } from '../types.ts';
import { is } from '../util/keys.ts';
import type { DeckNews } from '../viewer/cabin.ts';
import { G0 } from '../world/bodies.ts';
import { type Clock, COAST_RATES, RATES } from '../world/clock.ts';
import { sunPosition } from '../world/ephemeris.ts';
import { angleBetween, DEG, dot, length, scale, siteFrame, sub, unit, type Vec3 } from '../world/frames.ts';
import { elementsOf, period } from '../world/orbit.ts';
import { julianDate, terrestrialTime } from '../world/time.ts';
import { ABORT_ARMED, type CockpitHost, Deck, type DeckSpec, GUARD, KEEP, MOST, START, type ThrottleView, tank } from './deck.ts';
import type { NavSample } from './navball.ts';
import { pack } from './tape.ts';
import { type Passed, termsOf } from '../sim/core/gravity.ts';
import { KM, RISING, ABOVE_AIR, PHASES, phaseOf } from './phases/phase.ts';
import {
  short,
  recordStages,
  undone,
  abortWhy,
  abortAsked,
  eject,
  nextStep,
  firingOf,
  liftoff,
  takeOver,
  recordOnPad,
  leverCuts,
  whenIntended,
  dropsFrom,
  parted,
  stagesAt,
  hotNote,
  dueAt,
} from './phases/ascent.ts';
import { digit, freeHands, planHands, drawHands, manualJetsGone, turnTo, pushOf } from './phases/coast.ts';
import { burnNext, burnAsked, burnName, burnByHand, fire, nextMove, move, retroWhy } from './phases/burn.ts';
import {
  descentPlan,
  hands,
  steers,
  entrySteered,
  nextDescent,
  burnPending,
  descentWhy,
  descentDue,
  recorded,
  give,
  switchEntry,
  rollTo,
  rollDue,
  switchDescent,
} from './phases/entry.ts';
import { card, outcome, overAt, wall } from './phases/surface.ts';

/** The states of the deck a control in the cabin can stand by (CabinDef.controls[].holds): the hand controls freed, or not. */
const FREE: ReadonlySet<string> = new Set(['free']);
const NONE: ReadonlySet<string> = new Set();
const ENTER = 'Fly this flight: as flown, or take it over (L)';

/**
 * The flight deck's kind for a flight into orbit (an orbital plan whose ascent is flown on a steering law): the deck
 * (deck.ts) is the one every flight has; what is this kind's is what the flight's plan says it had. Nothing here knows
 * which flight it is: the stages, the events and what the hands could reach are the plan's (sim/plan.ts: its engines,
 * events and thrusters, `PlanRecord.manual`), found by what each does.
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
 * (orbital.ts flyOrbit), short of an orbit or not, as the record's own run does. Its hand controls are the user's
 * without the lock, and the braking burn is Space. The attitude in orbit is turned as a hand turns it, not flown as a
 * rigid body: the jets, their gas and the tumbles of the record are not modelled.
 *
 * What the deck shows and does in each part of the flight is its phase's (phases/phase.ts `phaseOf`, chosen from the run's
 * state): the ascent, the coast, a burn, entry and down, each a module of functions of this deck's state (phases/*.ts).
 */
export class OrbitDeck extends Deck {
  // (the deck's state and its own workings, which its phases (phases/*.ts) read and change as functions of it: no other module touches them)
  /**
   * The flight's plan as its record's run flew it (sim/run.ts `flownPlan`): the flight's own, with its braking burn and
   * all the clock sets off after it where guidance timed them for the landing place (sim/plan.ts `LandingAim`). What
   * this deck asks whenever it wants the record's plan, so its instants are the run's on show.
   */
  private flownAs: FlightPlan | null = null;
  get recordPlan(): FlightPlan {
    this.flownAs ??= flownPlan(this.flight);
    return this.flownAs;
  }
  /** When each of the record's events happens on the run on show (sim/run.ts `orbitalEvents`): what the cabin's lamps read. */
  times: Record<string, number> = {};
  /** The record's run, and the one on show (the record's, the user's, or either with a burn by hand). */
  record: Run | null = null;
  run: Run | null = null;
  flown: FlownWhole | null = null;
  /** The lock: digits typed so far; the hands free (by the code, or because the flight is the user's). */
  typed = '';
  free = false;
  /** The hand's attitude (fly.ts's frame, body to frame) and when it was last turned; the burn by hand, once fired. */
  hand: { q: Quat; t: number; log: { t: number; q: Quat }[] } | null = null;
  /** Which of the record's own periods by hand (`manual.periods`) the hands are in, as flown, and the samples they turned from. */
  byPlan: number | null = null;
  planBase: readonly LiveSample[] | null = null;
  fired: number | null = null;
  /** When each of the record's manoeuvres (orbital.ts `movesOf`) was fired by hand, in the record's order. */
  moved: number[] = [];
  /** Preserve the record up to an orbital takeover, then integrate freely from its state there. */
  handover: { t: number; r: Vec3; v: Vec3 } | null = null;
  priorMoves = 0;
  /** The plan as this flight now has it: the record's own, its burn given up (hands free, nothing fired), or the hand's burn. */
  planned: FlightPlan | null = null;
  /** How it is flown: the two switches, and how far the hands have leaned the law. */
  guidance = START.guidance;
  sequence = START.sequence;
  /** Hold (deck.ts `START`): with guidance off the steering keeps `holdAt`, the attitude the hands leave the launch vehicle at. */
  hold = START.hold;
  holdAt: Vec3 | null = null;
  trim = { pitch: 0, yaw: 0 };
  /** When the flight became the user's (0 from the pad), or null while it is the record's. */
  mine: number | null = null;
  /** The live staged vehicle and its state while the user's flight is on the launch vehicle; its pilot and what the hands asked. */
  private vehicle: StagedVehicle | null = null;
  state: StagedState | null = null;
  pilot: StagedPilot | null = null;
  options: StagedPilotOptions = { guidance: true, sequence: true };
  asked: Step[] = [];
  /** The stages the lever has cut (taken under their least): raised again, each is asked to start once more. */
  cutByLever = new Set<number>();
  tally: StagedTally | null = null;
  kept = 0;
  /** How many of the live vehicle's notes (`StagedState.said`) the deck has said. */
  heard = 0;
  eventAt = Number.NEGATIVE_INFINITY;
  /** The user's ascent as staged.ts's batch run has its results, once the spacecraft has parted (for the coast and the checks). */
  ascended: Ascended | null = null;
  private told = Number.NEGATIVE_INFINITY;
  /**
   * The descent by hand (sim/orbital.ts `DescentHands`): each event a hand gave and when, the automatic sequence's switch as
   * it was thrown, the modules parted by hand; when the descent was taken from the record's flight (null while it is the
   * record's); and how long the orbit lasts, for the flight on show that stays up (worked once: orbital.ts `decay`).
   */
  given: Record<string, number> = {};
  switched: { t: number; on: boolean }[] = [];
  partedBy: number | null = null;
  /**
   * The entry by hand (sim/entry.ts `EntryHands`), on a flight whose entry is steered to a place (`Hold.entry`): the
   * guidance switch as thrown with the spacecraft alone and no burn to come, each change of the stick's roll with Hold as
   * it stood, and the bank the run had where the record's flight was taken over part-way down.
   */
  entryGuided: { t: number; on: boolean }[] = [];
  rolls: { t: number; stick: number; hold: boolean }[] = [];
  bankTaken: number | null = null;
  /** The abort asked for going up: the record's mode for the instant (`PlanRecord.aborts`) and when. */
  aborted: { mode: AbortMode; t: number } | null = null;
  padImpact: Impact | null = null;
  padGrazes: Impact[] = [];
  /** The crew's descent from the launch vehicle after an abort's ejection (`AbortMode.escape.eject`), and when they left. */
  ejected: { down: DescentFlown; at: number } | null = null;
  /** When X was first pressed: a second within ABORT_ARMED fires it. */
  abortArmed = Number.NEGATIVE_INFINITY;
  abortArmedFor: AbortMode | null = null;
  private readonly orbitAbort: HTMLButtonElement | null;
  downMine: number | null = null;
  lasts: { of: FlownWhole; s: number } | null = null;
  /** The plan the flight on show was last flown on (`refly`), and how many times it has been: the card is made again when it is. */
  flownPlan: FlightPlan | null = null;
  flownAt = 0;

  constructor(parent: HTMLElement, flight: SitedFlight, clock: Clock, host: CockpitHost) {
    super(parent, flight, clock, host, OrbitDeck.spec(flight));
    this.systems();
    const canReachOrbit = flight.plan?.record?.aborts?.some((mode) => mode.escape?.separate?.service?.goal.kind === 'orbit');
    this.orbitAbort = canReachOrbit ? document.createElement('button') : null;
    if (this.orbitAbort) {
      this.orbitAbort.className = 'cockpit-abort';
      this.orbitAbort.dataset.do = 'abort-orbit';
      this.orbitAbort.disabled = true;
      this.orbitAbort.textContent = 'Abort to orbit';
      this.orbitAbort.title = 'Choose abort to orbit while direct entry is also available. Press twice to confirm.';
      this.root.querySelector('.cockpit-abort')?.after(this.orbitAbort);
    }
  }

  private static spec(flight: SitedFlight): DeckSpec {
    const code = String(flight.plan?.record?.manual?.code?.value ?? '');
    return {
      figures: RISING,
      readings: [
        ...(flight.flies?.target
          ? [
              {
                id: 'target-range',
                label: `${flight.flies.target.name} range`,
                unit: 'km',
                about: 'Separation from the reconstructed stage',
              },
              { id: 'target-rate', label: 'Range rate', unit: 'm/s', about: 'Positive when moving apart' },
            ]
          : []),
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
      guidance: `Guidance: the automatic flight, the ascent on its steering law, and the flight controls lean it. Off, the hands fly alone: nobody aboard on the day had such a control, so switching it takes the flight over`,
      sequence: `Sequencer: the record’s events at their times. Off, each is set off by hand with the action button: nobody aboard on the day could, so switching it takes the flight over`,
      choose: false,
      flightKeys: code
        ? `<span class="deck-lock" title="Enter the code to free the hand controls once the spacecraft is alone">${[...code]
            .map((d) => `<button data-press="${d}" title="A digit of the lock’s code (${d})">${d}</button>`)
            .join('')}<em>lock</em></span>`
        : '',
      enter: ENTER,
    };
  }

  get able(): boolean {
    return flownByHand(this.flight.plan) && Boolean(this.flight.flies);
  }
  /** No vehicle of sim/vehicle.ts's is flown here: the ballistic guidance's programme is not drawn ahead on the path. */
  get craft(): null {
    return null;
  }
  /** What the predicted path is made from (viewer/path.ts): this flight's plan, as it stands. */
  get plan(): string {
    return `${this.mine === null ? 'record' : `mine ${this.mine}`}|${this.fired !== null ? `hand ${this.fired}` : this.free ? 'free' : 'timer'}${this.state?.broke ? '|broke' : ''}`;
  }

  /**
   * The path ahead from a sample, by the one propagator (sim/predict.ts): with the spacecraft alone, its coast as planned
   * (the timer's burn, a hand's, or none: sim/fliers.ts `spacecraft`) and on down the descent the run on show follows
   * (`descending`: the descent module, with what the hands gave) to its landing, or once round; on the launch
   * vehicle, where it goes if the engines stopped now (`stack`: what it still carries, on the drag of the shape it has), to
   * the ground or once round; or, under guidance with a cutoff to come and asked for (`guided`, K on the path), where the
   * guidance would take it (`guided`: the law, the record's steps while the sequencer is on, to the parting, then the
   * spacecraft as planned).
   */
  predict(start: { t: number; r: Vec3; v: Vec3; mass: number }, points?: number, underGuidance = false): Predictor | null {
    const site = siteFrame(this.flight.site);
    const sea = this.flight.site.seaLevel.value;
    // (the Moon and the Sun where the plan names them, `FlightPlan.gravity`: a path bound for the Moon drawn as it goes)
    const where = {
      site,
      seaLevel: sea,
      frame: this.frame,
      ...(this.flight.plan?.gravity ? { gravity: termsOf(this.flight.plan.gravity, this.frame) } : {}),
    };
    const options = points ? { points } : {};
    if (this.state?.broke && start.t >= this.state.broke.t - 1e-9) return null; // (in pieces: nothing to predict)
    const plan = this.planned ?? (this.free && this.fired === null ? this.givenUp() : this.recordPlan);
    if (start.t < this.parting) {
      const v = this.vehicleOf();
      const flown = orbitalFlown(this.flight).ascent;
      const live = this.mine !== null && this.state ? this.state : null;
      // the record's vehicle as it stood at the instant (each stage lit, stopped and let go at the run's instants), or the user's
      const record = this.recordPlan;
      const stood = live ?? {
        stages: recordStages(record, flown.stops).map((st, i) => ({
          from: st.from <= start.t ? st.from : Number.POSITIVE_INFINITY,
          to: flown.stops[i]! <= start.t ? flown.stops[i]! : Number.POSITIVE_INFINITY,
          gone: st.sep <= start.t ? st.sep : Number.POSITIVE_INFINITY,
          loose: st.sep <= start.t ? st.sep : Number.POSITIVE_INFINITY,
        })),
        drops: Object.fromEntries(
          sequenceOf(record)
            .drops.filter((d) => d.at <= start.t)
            .map((d) => [d.joint, d.at]),
        ),
        apparent: [] as number[],
      };
      const state = live ? live : { ...stood, apparent: apparentBy(record, v, stood, start.t) };
      const turned = start.t > guidanceOf(record).turn.value;
      const sequence = live ? this.sequence : true;
      const law = {
        vehicle: v,
        solved: flown.solved,
        state,
        sequence,
        ...(live ? { live: true, trim: this.trim, fired: live.craft.fired } : {}),
        thetaTurn: live ? (this.options.memo?.thetaTurn ?? null) : turned ? flown.thetaTurn : null,
      };
      if (underGuidance && this.guidable) return propagate(guided(record, site, sea, start, { ...law, plan }), start, where, options);
      // if cut now: every engine stopped here, and what the vehicle then does by itself (sim/fliers.ts `guided`, stopped):
      // what has been let go parts, the sequencer (while it is on) lets go what it lets go at its instants, and from the
      // parting the spacecraft as the deck then flies it (`parted`: the timer's burn given up for the hands, with what the
      // hands gave the descent)
      const after = this.planned ?? this.givenUp();
      const descent = this.descendOf(after, false);
      return propagate(
        guided(record, site, sea, start, {
          ...law,
          plan: after,
          stopped: { axis: live ? turn(live.q, [1, 0, 0]) : null },
          alone: (x) => spacecraft(after, this.frame, site, sea, x, descent),
        }),
        start,
        where,
        options,
      );
    }
    // (begun within the burn, the burn in progress: the line it was fixed on as it lit, from the run's own state then)
    const ship = shipOf(plan);
    const on = ship.on;
    const was =
      start.t > on && start.t < ship.off
        ? (this.run?.samples as readonly LiveSample[] | undefined)?.find((x) => Math.abs(x.t - on) < 1e-6)
        : undefined;
    const lit = was ? { lit: { r: was.centre ?? was.r, v: was.v } } : {};
    // (and on from the height the pilot leaves at, the descent module the run on show follows, with what the hands gave,
    // to its landing: begun part-way down, from the run's own state of it)
    // (and through a steered entry on the banks the run on show flew: the path is that run's, sim/fliers.ts `spacecraft`)
    const banks = this.flown?.coast.entry ? { banks: this.flown.coast.entry.banks } : {};
    return propagate(
      spacecraft(plan, this.frame, site, sea, start, { ...lit, ...banks, ...this.descendOf(plan, true) }),
      start,
      where,
      options,
    );
  }
  /** The other bodies the plan's gravity names that a path can pass (sim/core/gravity.ts `Passed`: the Moon), made once. */
  private pulling(): readonly Passed[] {
    this.pulls ??= termsOf(this.flight.plan?.gravity, this.frame).flatMap((term) => (term.body ? [term.body] : []));
    return this.pulls;
  }
  private pulls: readonly Passed[] | null = null;

  /**
   * How the spacecraft of `plan` goes on down from the height the pilot leaves at (sim/fliers.ts `descending`): the descent
   * module the run on show follows, with what the hands gave; `begun`, from the run's own state of it (a prediction made
   * part-way down), not one still to come.
   */
  private descendOf(plan: FlightPlan, begun: boolean): { descend?: Descend } {
    const first = downOf(plan)?.bodies[0];
    if (!first) return {};
    const down = begun ? (this.flown ?? orbitalFlown(this.flight)).down : null;
    return { descend: { follow: first.id, hands: hands(this), ...(down ? { from: down } : {}) } };
  }
  /** The run's line flown (sim/run.ts `Run.track`): the predicted path draws the line flown from it (viewer/path.ts `PathSource.track`). */
  track(): readonly LiveSample[] {
    return (this.run?.track() ?? []) as readonly LiveSample[];
  }
  /**
   * Whether the path can show where guidance would take the launch vehicle (viewer/path.ts, K): before the parting, under
   * guidance, with an engine burning and the last stage's cutoff still to come.
   */
  get guidable(): boolean {
    const t = this.clock.t;
    if (!(t > 0) || t >= this.parting || !this.steering.guidance) return false;
    const live = this.mine !== null && this.state ? this.state : null;
    if (live) return !live.parted && this.vehicleOf().thrust(live) > 0;
    return t < (orbitalFlown(this.flight).ascent.stops.at(-1) ?? 0);
  }
  /** What the path on show is, in a word or two beside its figures and in full where the pointer rests (viewer/path.ts). */
  get pathAs(): { short: string; long: string } {
    if (this.clock.t < this.parting)
      return {
        short: 'if cut now',
        long: 'Where it goes if the engines stopped now: the stack with what it still carries, on its own drag, nothing more lit or let go. Under guidance, K shows where guidance would take it instead',
      };
    if (this.free && this.fired === null)
      return {
        short: 'hands off',
        long: `The hands are free and nothing is planned: the coast with no burn, down to where ${landsOf(this.recordPlan).ship} lands or once round`,
      };
    return {
      short: this.fired !== null ? 'as fired' : 'as planned',
      long: `The coast from here with the braking burn ${this.fired !== null ? 'the hand fired' : 'the timer has set'}, the modules parting after it, down to where ${landsOf(this.recordPlan).ship} lands`,
    };
  }
  get steering(): { guidance: boolean; sequence: boolean; trim: { pitch: number; yaw: number } } {
    return { guidance: this.guidance && !this.free, sequence: this.sequence && !this.free, trim: this.trim };
  }
  // (no mechanism, no part's command yet: the deck of a ballistic flight has them)
  travel(_id: string, _t: number): number | null {
    return null;
  }
  protected worked(_id: string): string | null {
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
    if (what.startsWith('descent:')) return descentWhy(this, what.slice(8)) === null;
    if (what === 'retro') return this.free && this.fired === null && this.hand !== null && retroWhy(this) === null;
    if (what === 'move') return nextMove(this) !== null;
    const step = stepOf(what);
    if (!step || this.ascended || this.clock.t > this.parting) return false;
    return undone(this, step);
  }

  /**
   * A control in the cabin (CabinDef `does`): a key of the lock (`code:<digit>`), the same as its digit typed; the braking
   * engine's button, the same as Space once the hands are free; the manual orientation's switch (`manual`), which the
   * lock throws: it says whether the hand controller has the attitude.
   */
  protected obey(what: string): void {
    if (!this.on || this.padImpact) return;
    if (what.startsWith('code:')) digit(this, what.slice(5));
    else if (what === 'manual')
      this.host.say?.(
        'Manual orientation',
        this.free ? 'On: the flight controls steer the spacecraft' : 'Locked: the code on the lock frees it',
      );
    else if (what.startsWith('step:')) {
      const step = stepOf(what);
      if (!step || !this.can(what)) return;
      if (this.mine === null) {
        takeOver(this);
        this.host.say?.('Your flight', 'The simulator will follow this flight from the event you just commanded');
      }
      this.eventAt = this.now() / 1000;
      this.asked.push(step);
      if (!this.clock.running) this.clock.play(true);
    } else if (what.startsWith('descent:')) give(this, what.slice(8));
    else if (what === 'move' && this.can('move')) move(this, this.clock.t);
    else if (what === 'retro' && this.can('retro')) fire(this, this.clock.t);
    else if (what === 'retro')
      this.host.say?.(burnName(this), !this.free ? 'Locked: the hand controls are not free' : (retroWhy(this) ?? 'Fired already'));
  }

  enter(): void {
    if (!this.able || this.on) return;
    this.opened();
    if (this.keeping) this.resume();
    else {
      this.switches({}); // (each entry by hand: `START`)
      this.fresh();
    }
  }

  /** Taken over: not the record's flight any more (a hand on the ascent, the lock opened, a burn, a descent given). */
  protected get byHand(): boolean {
    return !recorded(this);
  }
  protected get runOver(): boolean {
    const run = this.run;
    return run !== null && Number.isFinite(run.duration) && this.clock.t >= run.duration - 1e-6;
  }
  protected restore(): void {
    this.host.fly(this.run);
    this.show();
  }
  protected get ticks(): number {
    return this.state?.ticks ?? 0;
  }
  /** The live vehicle has been set going: lit on the pad, taken over, or escaped from it (a pad escape is flown whole, at tick 0). */
  protected override get begun(): boolean {
    return this.state !== null;
  }
  /** The run as it stands (deck/tape.ts): the live vehicle's state, how it is flown, and all that the hands have given since. */
  protected print(): string {
    return pack([
      this.state,
      this.mine,
      this.guidance,
      this.sequence,
      this.trim,
      this.asked,
      this.free,
      this.typed,
      this.hand && [this.hand.q, this.hand.t, this.hand.log.length],
      this.fired,
      this.moved,
      this.given,
      this.switched,
      this.entryGuided,
      this.rolls,
      this.bankTaken,
      this.partedBy,
      this.aborted && [this.aborted.t, this.aborted.mode.until.value],
      this.ejected?.at ?? null,
      this.downMine,
      this.run && [this.run.samples.length, this.run.duration, this.run.dropped],
      [this.lever.at, [...this.cutByLever]],
      [this.hold, this.holdAt],
    ]);
  }
  protected switches(to?: Record<string, boolean>): Record<string, boolean> {
    if (to) {
      this.guidance = to.guidance ?? START.guidance;
      this.sequence = to.sequence ?? START.sequence;
      this.hold = to.hold ?? START.hold;
      this.options.guidance = this.guidance;
      this.options.sequence = this.sequence;
    }
    return { guidance: this.guidance, sequence: this.sequence, hold: this.hold };
  }
  /** The attitude turned by hand is integrated frame by frame (`turnTo`): while the hands turn it, each frame is part of the run. */
  protected override get framed(): boolean {
    // (and a frame on which the stick's roll changes in a steered entry by hand: the entry is flown again from its instant)
    if (rollDue(this, this.clock.t)) return true;
    if (!this.hand || this.fired !== null || !(this.free || this.byPlan !== null)) return false;
    const p = pushOf(this);
    return p.pitch !== 0 || p.yaw !== 0 || p.roll !== 0;
  }

  /** When the spacecraft leaves the last stage on the flight on show, s. */
  get parting(): number {
    if (this.mine !== null) return this.ascended?.separation.t ?? Infinity;
    const flown = orbitalFlown(this.flight).ascent;
    const sep = recordStages(this.recordPlan, flown.stops).at(-1)?.sep ?? Infinity;
    // (a last stage that is itself the spacecraft, an Agena, is let go of by nothing: alone once its engine has stopped)
    return Number.isFinite(sep) ? sep : flown.separation.t;
  }
  /** The day of the record's flight, as the deck says it ('12 April'). */
  get day(): string {
    return new Date(this.flight.launch).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  }
  /** The plan with its timer's burn given up: nothing fires until a hand does. */
  givenUp(): FlightPlan {
    return givenUp(this.recordPlan, this.handover?.t);
  }

  /** The systems strip: what each stage has left, the braking engine, the lock, and what is burning. */
  private systems(): void {
    const plan = this.recordPlan;
    const el = this.cells.get('systems')!;
    const code = String(plan.record?.manual?.code?.value ?? '');
    const service = coastEvents(plan).burn;
    el.innerHTML = `
      ${stagesOf(plan)
        .map((s, i, all) =>
          tank(
            `stage-${i}`,
            // (two stages on one body, an Atlas's sustainer and its verniers, are told apart by their engines)
            short(all.some((o, j) => j !== i && o.body.id === s.body.id) ? s.engine.label : s.body.label),
            s.shares.length > 1
              ? `${s.body.label}: propellant left in the tank it draws on with ${s.shares.length - 1 === 1 ? 'another stage' : 'other stages'}`
              : `${s.body.label}: propellant left of what it carries${s.count > 1 ? `, the ${s.count} together` : ''}`,
          ),
        )
        .join('')}
      ${service?.tanks.length ? tank('coast-fuel', 'Service propulsion', `${service.label}: propellant and ignition starts remaining`) : ''}
      <div class="tank engine" title="The braking engine: when it fires, and how"><span>Braking</span><b data-cell="retro"></b><i></i></div>
      ${code ? `<div class="tank jets" title="The lock on the hand controls: a lamp for each digit of its code typed in order"><span>Lock</span><b>${[...code].map((d, i) => `<u data-digit="${i}">${d}</u>`).join('')}<u data-cell="lock"></u></b></div>` : ''}
      <div class="tank motors" title="Every engine burning now, with its thrust"><span>Burning</span><b data-cell="motors"></b></div>`;
    for (const cell of el.querySelectorAll<HTMLElement>('[data-cell]')) this.cells.set(cell.dataset.cell!, cell);
  }

  /** Back on the pad, the clock stopped at liftoff, the lock shut, the flight the record's. */
  protected fresh(): void {
    this.clock.reset();
    this.started();
    this.record ??= orbitalRecord(this.flight);
    this.run = this.record;
    this.encounters = null;
    this.flown = null;
    this.typed = '';
    this.free = false;
    this.hand = null;
    this.byPlan = null;
    this.planBase = null;
    this.fired = null;
    this.moved = [];
    this.handover = null;
    this.bankTaken = null;
    this.priorMoves = 0;
    this.planned = null;
    this.mine = recordOnPad(this) ? null : 0;
    this.state = null;
    this.pilot = null;
    // (nothing of a run before: the law's turn is this run's own, and so is when the deck last spoke of the hands)
    this.options = { guidance: this.guidance, sequence: this.sequence };
    this.told = Number.NEGATIVE_INFINITY;
    this.asked = [];
    this.cutByLever = new Set();
    this.holdAt = null;
    this.tally = null;
    this.heard = 0;
    this.ascended = null;
    this.trim = { pitch: 0, yaw: 0 };
    this.eventAt = Number.NEGATIVE_INFINITY;
    this.given = {};
    this.switched = [];
    this.partedBy = null;
    this.entryGuided = [];
    this.rolls = [];
    this.aborted = null;
    this.padImpact = null;
    this.padGrazes = [];
    this.ejected = null;
    this.abortArmed = Number.NEGATIVE_INFINITY;
    this.abortArmedFor = null;
    this.downMine = null;
    this.lasts = null;
    this.flownPlan = null;
    this.flownAt++;
    this.times = orbitalEvents(this.flight, orbitalFlown(this.flight));
    this.host.fly(this.run);
    this.show();
  }

  protected command(what: string, input: (string | number)[] = []): void {
    if (!this.on) return;
    if (what === 'leave') return void this.leave();
    if (what === 'again') this.fresh();
    else if (this.padImpact) return;
    else if (what === 'next') this.next();
    else if (what === 'guidance' || what === 'sequence') this.toggle(what);
    else if (what === 'hold') this.toggleHold();
    else if (what === 'abort' || what === 'abort-orbit') abortAsked(this, what === 'abort-orbit', input);
    this.show();
  }

  /** The lock's digits are keys of this kind's. */
  protected override extraKey(key: string): boolean {
    if (!is(key, 'deck.code')) return false;
    digit(this, key);
    return true;
  }

  /** A hand went to the controls: on the record's ascent there were none, and the deck says so and how to take over. */
  protected override steered(): void {
    if (!this.on || this.padImpact || this.now() - this.told < 4000) return;
    const t = this.clock.t;
    if (this.mine === null && t <= this.parting && (t > 0 || this.clock.running)) {
      this.told = this.now();
      this.host.say?.('As flown', 'Switch steering or events to manual to take control');
    } else if (!this.free && this.byPlan === null && t > this.parting && this.fired === null) {
      // (a spacecraft whose hand controls had no lock: the hand on them has them, as its pilot's did)
      if (!this.recordPlan.record?.manual?.code && this.recordPlan.record?.manual) {
        if (this.mine === null && this.clock.t >= coastOf(this.recordPlan).on) return;
        freeHands(
          this,
          `Taken in hand: not the flight of ${this.day}. Steer with the flight controls and use the action button to fire the ${burnName(this).toLowerCase()}`,
        );
        return;
      }
      this.told = this.now();
      const code = String(this.recordPlan.record?.manual?.code?.value ?? '');
      this.host.say?.(
        'Hand controls locked',
        `${code ? `The code ${[...code].join('-')} frees them, as the envelope did; or ` : ''}switch Steering to Manual`,
      );
    }
  }

  /** G or B: on the pad a switch; going up, the flight taken over and the switch thrown; with the spacecraft alone, the hands freed. */
  private toggle(which: 'guidance' | 'sequence'): void {
    const t = this.clock.t;
    const waiting = t <= 0 && !this.clock.running;
    if (!waiting && t > this.parting) {
      // (B, alone: the descent's automatic sequence off or on again; before the timer's burn that gives the burn up too)
      if (which === 'sequence' && !burnPending(this, t)) return void switchDescent(this);
      // (G, alone on a flight whose entry is steered: the entry's computer off, the bank the stick's, or on again)
      if (which === 'guidance' && !burnPending(this, t) && steers(this)) return void switchEntry(this);
      if (!this.free && this.fired === null) {
        freeHands(
          this,
          `Taken over: not the flight of ${this.day}. Steer with the flight controls and use the action button to fire the ${burnName(this).toLowerCase()}`,
        );
        if (which === 'sequence') switchDescent(this);
      }
      return;
    }
    if (!waiting && this.mine === null) takeOver(this);
    this[which] = !this[which];
    this.options.guidance = this.guidance;
    this.options.sequence = this.sequence;
    if (waiting) this.mine = recordOnPad(this) ? null : 0;
    else this.say();
  }

  /** Hold thrown: on the pad a switch; going up, the flight taken over (as a switch does) and the hold kept or let go. */
  private toggleHold(): void {
    const t = this.clock.t;
    const waiting = t <= 0 && !this.clock.running;
    if (!waiting && this.mine === null && t <= this.parting && !this.ascended) takeOver(this);
    this.hold = !this.hold;
    if (waiting) this.mine = recordOnPad(this) ? null : 0;
  }

  /** Space: the next thing to do. */
  private next(): void {
    const t = this.clock.t;
    const now = this.now() / 1000;
    if (this.state && t < this.state.t - TICK) return void this.clock.play(true); // (looking back: run on)
    // (the guard is a finger's, in real time: not while a stage fires into a joined one, whose top burns in flight time)
    if (now - this.eventAt < GUARD && !firingOf(this)) return;
    const flotation = this.flight.flies?.uprighting;
    if (flotation && this.run?.afloat && t >= this.run.duration) {
      if (t < (this.run.afloat.inflation?.at ?? Infinity)) {
        this.run = { ...this.run };
        floatUprighting(this.flight, this.run, t);
        this.host.fly(this.run);
        this.host.say?.('Uprighting bags', 'Compressors running');
        this.clock.play(true);
      }
      return;
    }
    if (t <= 0 && !this.clock.running) {
      this.eventAt = now;
      if (this.mine !== null) liftoff(this);
      this.clock.setRate(1);
      this.clock.play(true);
      return;
    }
    if (t <= this.parting && !this.ascended) {
      const step = nextStep(this);
      if (!step) return;
      this.eventAt = now;
      if (this.mine === null) {
        takeOver(this);
        this.host.say?.('Your flight', `You commanded ${step.label.toLowerCase()}. The simulator will fly from here`);
      }
      this.asked.push(step.step);
      if (!this.clock.running) this.clock.play(true);
      return;
    }
    if (this.can('move')) {
      this.eventAt = now;
      move(this, t);
      return;
    }
    if (burnNext(this)) {
      this.eventAt = now;
      // (no lock: the hand on the button has the controls, as its pilot's did)
      if (!this.free) freeHands(this, null);
      fire(this, t);
      return;
    }
    // the descent's next event not yet given: in the order the record's run has them
    const next = nextDescent(this);
    if (next) {
      this.eventAt = now;
      give(this, next.id);
    }
  }

  vehicleOf(): StagedVehicle {
    if (!this.vehicle) {
      this.vehicle = stagedVehicle(
        this.recordPlan,
        siteFrame(this.flight.site),
        this.frame,
        this.flight.site.seaLevel.value,
        orbitalFlown(this.flight).ascent.solved,
        undefined,
        this.atSiteOf(() => this.vehicle!.start().q).floor,
      );
    }
    return this.vehicle;
  }

  /**
   * The lever moved. On the pad it is set for the liftoff (off full, the flight is a flight of one's own, as a switch
   * thrown makes it); going up it takes the flight over as a switch does, and is given to every stage (`StagedControls.lever`);
   * under an engine's least it asks for what it holds to be cut, and raised again for each to start once more, which the
   * machine allows only as often as the engine starts (stagedlive.ts says when it cannot). Alone, the spacecraft's burn is
   * Space's: the lever does not reach it.
   */
  protected override levered(from: number): void {
    if (!this.on || this.padImpact || this.aborted || this.ejected) return;
    const t = this.clock.t;
    if (t <= 0 && !this.clock.running) {
      this.mine = recordOnPad(this) ? null : 0;
      return;
    }
    if (t > this.parting || this.ascended) return;
    if (this.mine === null) {
      takeOver(this);
      this.host.say?.('Your flight', 'You took the throttle. The simulator will fly from here');
    }
    const s = this.state;
    if (!s) return;
    const v = this.vehicleOf();
    stagesOf(this.recordPlan).forEach((st, i) => {
      const range = handRange(st.engine);
      if (!range || Number.isFinite(s.stages[i]!.gone)) return;
      if (from < range.least && this.lever.at >= range.least && this.cutByLever.delete(i)) this.asked.push({ kind: 'ignite', stage: i });
    });
    leverCuts(this, s, v);
    if (!this.clock.running) this.clock.play(true);
  }

  /** The law's angle as the tangent took over, for the director: kept from the first instant it is asked in that part. */
  private directorTheta: number | null = null;
  /** The record's steering law and its air, made once (staged.ts `lawOf`, `airOf`). */
  private lawNow: { law: ReturnType<typeof lawOf>; air: ReturnType<typeof airOf> } | null = null;
  /**
   * The flight director: the attitude the record's steering law asks for at a sample on the launch vehicle (staged.ts
   * `lawOf`, the axis the live vehicle's guidance steers to, leaned by the trim while it flies), on the pad and while
   * anything burns, as flown or by hand: what the mission intended.
   */
  override director(s: NavSample): Vec3 | null {
    if (this.ejected || this.aborted || s.t > this.parting || this.ascended || !(s.powered || s.t <= 0)) return null;
    const plan = this.recordPlan;
    this.lawNow ??= {
      law: lawOf(plan, siteFrame(this.flight.site), this.frame, orbitalFlown(this.flight).ascent.solved),
      air: airOf(this.flight.site.seaLevel.value, this.frame, skyOf(plan)),
    };
    const { law, air } = this.lawNow;
    const st = { r: s.r, v: s.v };
    const mode = law.modeAt(s.t);
    if (mode !== 'tangent') this.directorTheta = null;
    else this.directorTheta ??= this.options.memo?.thetaTurn ?? law.thetaAt(st, s.t, air(st, s.t).ground);
    let aim = law.axisAt(st, s.t, mode, air(st, s.t).ground, this.directorTheta ?? 0);
    if (this.guidance && this.trim.pitch) aim = turn(aboutAxis(law.n, this.trim.pitch), aim);
    if (this.guidance && this.trim.yaw) aim = turn(aboutAxis(unit(s.r), this.trim.yaw), aim);
    return aim;
  }

  /**
   * What the lever works now: the launch vehicle's stages burning (or the next to light), from the live state where the
   * flight is one's own and from the record's run where it is as flown; alone, the spacecraft's burn, which it does not reach.
   */
  protected override throttled(): ThrottleView | null {
    if (!this.run || this.ejected) return null;
    const plan = this.recordPlan;
    const stages = stagesOf(plan);
    const live = this.state && this.pilot && !this.ascended && this.mine !== null ? this.state : null;
    const t = Math.max(0, live ? Math.min(this.clock.t, live.t) : this.clock.t);
    if (t > this.parting || this.ascended) {
      const burn = coastEvents(plan).burn;
      if (!burn || t >= this.parts) return null;
      const engine = plan.craft[0]!.engines.find((e) => e.id === burn.id) ?? burn;
      return {
        engines: burnName(this),
        burning: false,
        range: handRange(engine),
        thrust: 0,
        left: 0,
        flow: 0,
        isp: 0,
        mass: 0,
        not: engine.kind === 'solid' ? 'fired whole by Space' : 'fired by Space at full: no throttle in orbit yet',
      };
    }
    const now = stagesAt(this, t);
    const lit = now.map((x, i) => (x.burning ? i : -1)).filter((i) => i >= 0);
    // (nothing burning: on the pad, the stages lit at liftoff; after, the first still aboard with something left)
    const pad = recordStages(plan).flatMap((st, i) => (st.from <= 0 ? [i] : []));
    const next = now.findIndex((x) => x.aboard && !x.burning && x.left > 0);
    const on = lit.length ? lit : t <= 0 && pad.length ? pad : next >= 0 ? [next] : [];
    if (!on.length) return null;
    const v = this.vehicleOf();
    const s = this.sampleAt(t);
    const throttle = (i: number) => (live ? v.throttle(live, i, t) : stages[i]!.throttle ? along(stages[i]!.throttle!, t) : 1);
    // (its flow's share over its thrust's, where the record has the two apart: Stage.drawn)
    const drawnOver = (i: number) => {
      const st = stages[i]!;
      return st.drawn && st.drawn !== st.throttle && st.throttle ? along(st.drawn, t) / along(st.throttle, t) : 1;
    };
    const flow = (i: number) => stages[i]!.count * flowOf(stages[i]!.engine) * (lit.length ? throttle(i) * drawnOver(i) : this.lever.at);
    // (the specific impulse is the engines' whatever the setting: their rated thrust over their rated flow)
    const rated = on.reduce((sum, i) => sum + stages[i]!.count * flowOf(stages[i]!.engine), 0);
    const vac = (i: number) => stages[i]!.count * stages[i]!.engine.thrust.vacuum.value;
    // (a tank several stages draw on is counted once)
    const holders = new Set<string>();
    const left = on.reduce((sum, i) => {
      const key = stages[i]!.shares.length > 1 ? stages[i]!.holder.id : `own-${i}`;
      if (holders.has(key)) return sum;
      holders.add(key);
      return sum + now[i]!.left;
    }, 0);
    const flows = on.reduce((sum, i) => sum + flow(i), 0);
    const range = handRange(stages[on[0]!]!.engine);
    return {
      engines: [...new Set(on.map((i) => short(stages[i]!.body.label)))].join(' + '),
      burning: lit.length > 0,
      range,
      thrust: lit.length ? s.burning.reduce((sum, m) => sum + m.thrust, 0) : 0,
      left,
      flow: flows,
      isp: rated > 0 ? on.reduce((sum, i) => sum + vac(i), 0) / (G0 * rated) : 0,
      mass: s.mass,
      ...(!lit.length && live && Number.isFinite(live.stages[on[0]!]!.from) ? { doing: 'cut off' } : {}),
      // (the record's setting of the first of them now: its throttle curve, full where it has none)
      record: stages[on[0]!]!.throttle ? along(stages[on[0]!]!.throttle!, t) : 1,
      ...(this.mine === null && t > 0 ? { not: 'as flown: the lever takes it over' } : {}),
    };
  }

  /** The control the user has just taken over. */
  say(): void {
    const manual = [
      this.guidance ? '' : 'Steer with the flight controls',
      this.sequence ? '' : 'Use the action button to advance flight events',
    ].filter(Boolean);
    this.host.say?.('Your flight', manual.join('. ') || 'Automatic steering and events have resumed on your current flight');
  }

  /** The coast and what follows on this flight with `plan`: from where the user's ascent left the spacecraft, or the record's whole flight. */
  encounters: ReturnType<typeof coastContacts> | null = null;
  private nextImpact = 0;

  whole(plan: FlightPlan, hands?: DescentHands): FlownWhole {
    const site = siteFrame(this.flight.site);
    const sea = this.flight.site.seaLevel.value;
    const user = this.mine !== null ? this.ascended : null;
    const ascent = user ?? orbitalFlown(this.flight).ascent;
    const from = this.handover ?? ascent.separation;
    const baseline = flyOn(plan, site, this.frame, sea, ascent, from, hands);
    const samples = this.samplesOf(plan, baseline);
    this.handSamples(samples, shipOf(plan));
    const dropped = this.coastDrops(plan, baseline);
    this.encounters = coastContacts(
      this.flight,
      plan,
      samples,
      from.t,
      dropped,
      this.run?.sheds,
      this.centre,
      user ? this.state?.w : undefined,
    );
    const whole = flyOn(plan, site, this.frame, sea, ascent, from, hands, 1, this.encounters.contacts);
    this.nextImpact = 0;
    while (this.nextImpact < this.encounters.hits.length && this.encounters.hits[this.nextImpact]!.t < this.clock.t - 1e-8)
      this.nextImpact++;
    return whole;
  }

  coastDrops(plan: FlightPlan, whole: FlownWhole): number[] {
    const parting = coastEvents(plan).parting;
    const parts = new Set(parting?.do.flatMap((a) => ('separate' in a ? [a.separate] : [])));
    const ejection = eventOf(plan, downOf(plan)?.ejection ?? '');
    const ejects = new Set(ejection?.do.flatMap((a) => ('separate' in a ? [a.separate] : [])));
    const first = downOf(plan)?.bodies[0]?.id ?? '';
    const landed = whole.down?.landed[first]?.at ?? Infinity;
    const seq = sequenceOf(plan);
    const ascentJoints = new Set([
      ...seq.stages.map((s) => s.joint),
      ...seq.drops.filter((d) => d.at <= seq.stages.at(-1)!.sep).map((d) => d.joint),
    ]);
    return this.flight.flies!.drops.map((d, i) => {
      if (d.on && ascentJoints.has(d.on.split('/')[0]!)) return this.run!.dropped[i]!;
      if (d.on && ejects.has(d.on) && whole.down) return whole.down.ejected;
      if (d.on && parts.has(d.on)) {
        const t = shipOf(plan).parted;
        return t < landed ? t : Infinity;
      }
      if (d.rides?.length) return whole.down?.tracks[d.rides[0]!.body]?.[0]?.t ?? Infinity;
      const event = plan.events.find((e) => e.do.some((a) => 'separate' in a && a.separate === d.on?.split('/')[0]));
      const when = clockAt(plan, event);
      if (event) return when >= whole.ascent.separation.t && when <= landed ? when : Infinity;
      return this.record!.dropped[i]!;
    });
  }

  /** What this flight gave for each of the record's checks (sim/staged.ts `held`): the ascent's only where the ascent was the user's. */
  heldOf(): Record<string, number> | undefined {
    if (!this.flown) return undefined;
    const all = held(this.recordPlan, this.flown).slice(this.mine !== null ? 0 : this.ascentChecks);
    return Object.fromEntries(all.map((c) => [c.id, c.got]));
  }

  /** The bodies down from the ejection on this flight as flown now, for the scene to carry what came down on each. */
  descentOf(): DrawnDescent | null {
    return this.flown ? descentOf(this.flown, this.centre, this.recordPlan.record?.ground?.value) : null;
  }

  /** The spacecraft's centre of mass above the flown model's origin, m (`PlanRecord.centre`, from the stack's datum). */
  get centre(): number {
    return (this.flight.flies?.datum ?? 0) + (this.recordPlan.record?.centre?.value ?? 0);
  }
  /** How many of the plan's checks are its ascent's: the first of `held`'s. */
  get ascentChecks(): number {
    return this.recordPlan.checks.filter((c) => c.of === 'ascent').length;
  }

  /** Samples the scene can show of a whole flight from `plan`: the user's ascent's own, then the coast's. */
  samplesOf(plan: FlightPlan, whole: FlownWhole): LiveSample[] {
    const jd = julianDate(this.flight.launch);
    const all = recordSamples(
      plan,
      whole,
      this.frame,
      this.centre,
      (at) => sunPosition(terrestrialTime(jd + at / 86_400)),
      this.mine === null ? undefined : this.state?.q,
    );
    if (this.handover) {
      const t = this.handover.t;
      const past = this.record!.samples.filter((s) => s.t < t) as LiveSample[];
      return [...past, ...all.filter((s) => s.t >= t)];
    }
    if (this.mine === null) return all;
    const mine = (this.run!.samples as LiveSample[]).filter((x) => x.riding && x.t <= this.ascended!.separation.t);
    return [...mine, ...all.slice(1)];
  }

  /** When the modules part on the flight as it now stands, s from liftoff (`descentPlan`), or never (the largest safe integer). */
  get parts(): number {
    const base = this.planned ?? (this.free || this.mine !== null ? null : this.recordPlan);
    const auto = base ? shipOf(base).parted : Number.MAX_SAFE_INTEGER;
    return this.partedBy ?? (automatic({ given: {}, switched: this.switched }, auto) ? auto : Number.MAX_SAFE_INTEGER);
  }

  /**
   * The flight flown again from where the spacecraft parted with all that the hands have given (the burn, the descent's
   * events), and the run on show made from it: its samples (after a burn by hand, the hand's attitude), what leaves when,
   * the events the cabin's lamps read, the checks.
   */
  handSamples(samples: LiveSample[], ship: ReturnType<typeof shipOf>) {
    const t = this.fired;
    const parts = ship.parted;
    if (this.hand && (t !== null || this.free)) {
      // as the hand turned it, to the burn's end; then as the hand left it, until the modules part; passive spheres follow the entry load, other craft turn
      // over half a minute toward the airflow (staged.ts recordSamples)
      const log = this.hand.log;
      const left = log.at(-1)!.q;
      // (where the hand turned it in a quiet stretch the coast kept only the ends of, the samples between are made again: sim/run.ts `attend`)
      attend(
        samples,
        log.map((x) => x.t),
      );
      let i = 0;
      for (const sample of samples) {
        if (sample.riding || sample.t < log[0]!.t) continue;
        let q: Quat;
        if (sample.passive) {
          while (i + 1 < log.length && log[i + 1]!.t <= parts) i++;
          q = passiveSpherePose(log[i]!.q, sample.passive.wind, sample.passive.alignment);
        } else if (t === null || sample.t <= Math.min(ship.off, parts)) {
          while (i + 1 < log.length && log[i + 1]!.t <= sample.t) i++;
          q = log[i]!.q;
        } else if (sample.t < parts) q = left;
        else {
          const base = sample.rotation ? multiply(sample.attitude, conjugate(sample.rotation.delta)) : sample.attitude;
          q = towards(left, base, Math.min(1, (sample.t - parts) / 30));
        }
        if (sample.rotation) q = multiply(q, sample.rotation.delta);
        sample.attitude = q;
        sample.axis = turn(q, [1, 0, 0]);
        sample.r = sub(sample.centre, scale(sample.axis, this.centre));
      }
    }
  }

  refly(): void {
    const { plan, hands } = descentPlan(this);
    this.flown = this.whole(plan, hands);
    this.flownPlan = plan;
    this.flownAt++;
    const samples = this.samplesOf(plan, this.flown);
    const ship = shipOf(plan);
    const parts = ship.parted;
    const t = this.fired;
    const burn = t === null ? null : { on: t, off: Math.min(ship.off, parts) };
    this.handSamples(samples, ship);
    const down = this.flown.down;
    const first = downOf(this.recordPlan)?.bodies[0]?.id ?? '';
    const landed = down?.landed[first]?.at ?? Number.POSITIVE_INFINITY;
    const parting = parts < landed ? parts : Number.POSITIVE_INFINITY;
    // (the burn: the hand's; none once the hands are free and nothing is fired; or the timer's, as recorded)
    const deorbited = this.handover && this.handover.t >= ship.on;
    this.times = orbitalEvents(this.flight, this.flown, { ...(burn ? { burn } : this.free && !deorbited ? { burn: null } : {}), parting });
    // what leaves at the modules' parting (the drop that names its record event) and with the descent's bodies leaves when
    // this flight has them, or never
    const run = this.run!;
    const dropped = this.coastDrops(plan, this.flown);
    this.encounters!.finish(samples, dropped);
    const timer = !this.free && this.mine === null ? { on: ship.on, off: Math.min(ship.off, parts) } : undefined;
    this.run = {
      ...run,
      samples,
      sheds: this.encounters!.sheds,
      dropped,
      duration: samples[samples.length - 1]!.t,
      fires: this.fires(burn ?? timer),
      descent: this.descentOf(),
      held: this.heldOf(),
    };
    this.run.afloat = undefined;
    if (down) floatUprighting(this.flight, this.run, Infinity);
    this.host.fly(this.run);
  }

  /** What a hand can give in the descent, in the order the record's run has them: the modules, the ejection, each parachute. */
  order: { id: string; at: number }[] | null = null;

  /**
   * When each of `flies.fires` burns on this flight, in their order: a stage's from its lighting to its stop (the record's run's,
   * or the user's vehicle's), the coast's burn between `retro`'s instants (none until a hand fires it, once the hands are free).
   */
  fires(retro: { on: number; off: number } = { on: Infinity, off: Infinity }): { from: number; to: number }[] {
    const record = firesOf(
      this.flight,
      orbitalFlown(this.flight),
      retro,
      this.planned ?? (this.free || this.mine !== null ? this.givenUp() : this.recordPlan),
    );
    const s = this.mine !== null ? this.state : null;
    const v = s ? this.vehicleOf() : null;
    const stages = stagesOf(this.recordPlan);
    return (this.flight.flies?.fires ?? []).map((f, k) => {
      const i = stages.findIndex((x) => x.engine.id === f.on);
      if (i < 0 || !s || !v) return record[k]!;
      const st = s.stages[i];
      if (!st || !Number.isFinite(st.from)) return { from: Infinity, to: Infinity };
      return { from: st.from, to: Math.min(st.to, v.dry(i, st.from), st.gone) };
    });
  }

  sampleAt(t: number): LiveSample {
    const samples = this.run!.samples as readonly LiveSample[];
    const [a, b, fraction] = either(samples, t);
    if (fraction === 0) return a;
    // (a quiet stretch of the coast kept as its two ends: the sample there, flown again)
    if (a.rails) return shownAt(samples, t);
    const { r, v } = between(samples, t);
    const centre = between(samples, t, (sample) => sample.centre).r;
    const attitude = attitudeBetween(a, b, fraction);
    const position = this.frame.place(centre, t);
    const lerp = (low: number, high: number) => low + (high - low) * fraction;
    return {
      ...a,
      r,
      v,
      centre,
      attitude,
      axis: turn(attitude, [1, 0, 0]),
      altitude: lerp(a.altitude, b.altitude),
      latitude: position.latitude,
      longitude: position.longitude,
      speed: length(v),
      groundSpeed: lerp(a.groundSpeed, b.groundSpeed),
      groundClimb: lerp(a.groundClimb, b.groundClimb),
      t,
    };
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
    while (this.encounters && this.nextImpact < this.encounters.hits.length && this.encounters.hits[this.nextImpact]!.t <= t)
      this.impact(this.encounters.hits[this.nextImpact++]!);
    while (this.padGrazes[0] && this.padGrazes[0].t <= t) this.impact(this.padGrazes.shift()!);
    if (!this.free && this.mine === null && this.fired === null && this.downMine === null) planHands(this, t);
    if (this.free && this.fired === null && this.hand) {
      const logged = this.hand.log.at(-1);
      turnTo(this, t);
      if (logged !== this.hand.log.at(-1)) drawHands(this);
    }
    rollTo(this, t);
    if (t > overAt(this) + 12) {
      this.clock.pause();
      this.clock.seek(overAt(this) + 12);
    }
    this.rails(t);
    this.show();
  }

  /**
   * A coast on rails (sim/rails.ts): with nothing burning above the air and nothing asked of the hands, the clock may run
   * past an hour a second (world/clock.ts `COAST_RATES`), and it is held at the next of the run's events and the record's
   * instants as this flight has them, which are lived at real time. Otherwise it is held to an hour a second.
   */
  private rails(t: number): void {
    const run = this.run!;
    const on = run.samples.length > 0 && onRails(run.at(t) as LiveSample, this.asked.length > 0);
    this.clock.allow(on ? COAST_RATES[COAST_RATES.length - 1]! : RATES[RATES.length - 1]!);
    // (and at each crossing of the sphere its centre changes at, where its gravity has one: sim/core/gravity.ts)
    const crossings = (run.crossings ?? []).map((c) => c.t);
    this.clock.hold(on ? due([...run.events.map((e) => e.t), ...Object.values(this.times), ...crossings, run.duration], t) : Number.NaN);
  }

  /** The user's launch vehicle stepped up to the clock (as the ballistic deck steps its own: every tick noted, kept every tenth of a second). */
  private fly(t: number): void {
    const v = this.vehicleOf();
    let s = this.state!;
    const run = this.run! as Run & { samples: LiveSample[] };
    const ahead = t - s.t;
    const begun = !s.held || v.burning(s, 0) || v.burning(s, 1) || this.asked.length > 0;
    // (the crew out and the stack done with: the clock runs on until they are down)
    if (this.ejected && (s.landed || s.broke || s.parted)) {
      if (t > overAt(this) + 12) {
        this.clock.pause();
        this.clock.seek(overAt(this) + 12);
      }
      return;
    }
    if (ahead <= 0 || !begun || s.landed) {
      if (s.landed && t > s.landed.t + 12) {
        this.clock.pause();
        this.clock.seek(s.landed.t + 12);
      }
      return;
    }
    const centre = this.centre;
    const upTo = s.t + Math.min(ahead, MOST);
    // (an abort whose seat waits for the falling stack to come down through a height: Molodtsov's from 40 s)
    const falling = this.ejected ? undefined : this.aborted?.mode.escape?.eject?.falling?.value;
    while (s.t < upTo - TICK / 2 && !s.landed && !s.parted && !s.broke) {
      const was = s;
      s = v.tick(s, this.pilot!);
      if (falling !== undefined && !this.ejected) {
        const at = v.fell(was, s, centre, falling);
        if (at) {
          this.state = s;
          eject(this, at);
        }
      }
      // Separations happen at the start of a tick, which can lie between retained samples.
      const release =
        s.craft !== was.craft &&
        (s.stages.some((st, i) => st.gone !== was.stages[i]!.gone) || Object.keys(s.drops).length !== Object.keys(was.drops).length);
      if (release && run.samples[this.kept - 1]!.t < was.t) {
        run.samples.length = this.kept;
        run.samples.push(v.sample(was, centre));
        this.kept = run.samples.length;
      }
      if (release) dropsFrom(this, s);
      let touched = false;
      if (!s.parted && !s.broke && !s.landed && !s.held && run.sheds?.size) {
        const met = run.sheds.meet({ ...was, station: 0, mass: v.mass(was) }, { ...s, station: 0, mass: v.mass(s) }, centre);
        touched = met.r !== s.r;
        if (touched) {
          this.kept = keepContact(run.samples, this.kept, was, s, met.hits, (state) => v.sample(state, centre));
          s = { ...s, r: met.r, v: met.v, q: met.q, w: met.w };
        }
        for (const hit of [...met.hits, ...run.sheds.siblings(was.t, s.t)]) this.impact(hit);
      }
      // and then what stands at the site, struck by the vehicle's own hull (sim/sitecontact.ts)
      const site = s.parted || s.broke || s.landed || s.held ? null : this.siteContact(() => v.start().q);
      if (site) {
        const left = new Set(this.flight.flies!.drops.filter((_, i) => run.dropped[i]! <= s.t).flatMap((d) => d.nodes));
        const met = site.meet({ ...was, station: 0, mass: v.mass(was) }, { ...s, station: 0, mass: v.mass(s) }, (node) => left.has(node));
        if (met.r !== s.r) {
          this.kept = keepContact(run.samples, this.kept, was, s, met.hits, (state) => v.sample(state, centre));
          s = { ...s, r: met.r, v: met.v, q: met.q, w: met.w };
          touched = true;
        }
        // (the first blow hard enough breaks parts free, as one from something shed does: sim/shed.ts `broke`)
        for (const hit of met.hits) if (hit.activeBroken && !run.sheds?.broke(hit)) delete hit.activeBroken;
        for (const hit of met.hits) this.impact(hit);
        // lying still on what it met, it is down there: as fast as the hardest it struck on the way (sitecontact.ts `Lying`)
        if (met.rest) s = { ...s, landed: { t: s.t, speed: Math.hypot(met.rest.vertical, met.rest.horizontal) } };
      }
      if (s.parted) break;
      if (s.broke) {
        run.samples.length = this.kept;
        run.samples.push(v.sample(s, centre));
        this.kept = run.samples.length;
        break;
      }
      if (s.ticks === was.ticks) break;
      this.tally!.note(was, s);
      // (a sample kept every tenth of a second and at every event; between, only the frame's last is put at the head)
      const last = run.samples[this.kept - 1]!;
      const event = touched || release || s.stages.some((_, i) => v.burning(s, i) !== v.burning(was, i));
      const end = s.t >= upTo - TICK / 2;
      if (!event && !end && s.t - last.t < KEEP - TICK / 2) continue;
      run.samples.length = this.kept;
      run.samples.push(v.sample(s, centre));
      if (event || s.t - last.t >= KEEP - TICK / 2) this.kept = run.samples.length;
    }
    this.state = s;
    // what the hardware made of what was asked, each said once
    for (const n of s.said.slice(this.heard)) this.host.say?.(n.title, n.text);
    this.heard = s.said.length;
    if (ahead > MOST) this.clock.seek(s.t);
    dropsFrom(this, s);
    run.fires = this.fires();
    Object.assign(run, grown(this.recordPlan, s.craft));
    // the engines lit on the pad burn until the last of them stops (the sound's burn, and the trail's: viewer/ascent.ts `cutoff`)
    const staged = recordStages(this.recordPlan);
    const engine = staged.reduce((last, st, i) => (st.from <= 0 && (last < 0 || st.cut > staged[last]!.cut) ? i : last), -1);
    if (engine >= 0) {
      const st = s.stages[engine]!;
      run.cutoff = Number.isFinite(st.from) && !v.burning(s, engine) ? Math.min(st.to, v.dry(engine, st.from), st.gone) : Infinity;
    }
    if (s.parted && this.ejected) {
      // (the ship let go empty: the stack's flight ends there, and the crew's goes on)
      run.duration = s.parted.t;
      return void this.host.say?.('Spacecraft parted', 'The empty ship separated from its launch vehicle: not followed further');
    }
    if (s.parted) return void parted(this, s);
    if (s.broke) {
      run.duration = s.broke.t;
      this.clock.setRate(1);
      if (!this.ejected) this.clock.seek(s.broke.t);
      this.host.say?.('Broke up', s.broke.text);
    }
    if (s.landed) {
      run.duration = s.landed.t;
      this.clock.setRate(1);
      if (!this.ejected) this.clock.seek(s.landed.t);
      this.host.say?.(
        'Down',
        `The launch vehicle came back to the ground at ${s.landed.speed.toFixed(0)} m/s, the spacecraft still on it${this.ejected ? ', empty' : ''}`,
      );
    }
  }

  show(): void {
    if (!this.run) return;
    const plan = this.recordPlan;
    const record = plan.record!;
    const coast = coastOf(plan);
    const live = this.state && this.pilot && !this.ascended ? this.state : null;
    const t = Math.max(0, live ? Math.min(this.clock.t, live.t) : this.clock.t);
    const s = this.sampleAt(t);
    const hands = !manualJetsGone(this, t) && (this.free || this.byPlan !== null || (this.mine !== null && !this.ascended));
    const pushed = hands && this.fired === null ? pushOf(this) : { pitch: 0, yaw: 0, roll: 0 };
    const news: DeckNews = { times: this.times, hand: pushed, holds: hands ? FREE : NONE };
    // (down at the run's end, whatever the descent's last moment of motion: the navball reads nought as the figures do)
    // (broken up in the air it is not down: its pieces fall on, and what the figures last read stands)
    const struck = this.padImpact !== null && t >= this.padImpact.t;
    const broken = struck || Boolean(this.state?.broke && t >= this.state.broke.t - 1e-9);
    // (on the launch vehicle the point its simulator flies is the stack's own, `r`, its datum; the spacecraft's centre up its
    // axis is where it is drawn from: the path predicts from the one and draws at the other, viewer/path.ts `PathSample.flies`)
    const ended = t >= this.run.duration && !broken;
    const stack = t < this.parting;
    const shown = ended || stack ? Object.assign({}, s, ended ? { down: true } : {}, stack ? { flies: s.r } : {}) : s;
    for (const fn of this.watchers) fn(shown, null, news);
    const set = (id: string, text: string) => this.put(id, text);
    const el = elementsOf(s.r, s.v);
    const ball = heightsBall(plan, siteFrame(this.flight.site));
    // down: what it rode is on the ground (the run's end), standing still on it, in no orbit; the figures say so, as
    // the ballistic deck's do, and not the space-fixed speed and orbit of a point on the turning Earth
    const down = t >= this.run.duration && !broken;
    const alone = t > this.parting && !down && !struck;
    const orbit = el.e < 1;
    const high = !alone && !down && s.altitude > ABOVE_AIR;
    const thrust = s.burning.reduce((sum, m) => sum + m.thrust, 0);
    // (the run as flown, and the instant its coast hands over to the descent: from there it comes down on its own bodies)
    const whole = this.flown ?? orbitalFlown(this.flight);
    const handed = whole.down ? whole.coast.samples[whole.coast.samples.length - 1]!.t : Number.POSITIVE_INFINITY;
    // the phase it is in (phases/phase.ts), and what the middle panel shows in it
    const here = { down, alone, burning: thrust > 0, entering: s.entered || t > handed, altitude: s.altitude };
    this.figures(PHASES[phaseOf(here)].figures(here));
    this.figure('altitude', down ? 0 : Math.max(0, s.altitude) / KM, down || s.altitude < 99_950 ? 2 : 1);
    this.figure('speed', alone || high ? s.speed : t > 0 && !down ? s.groundSpeed : 0, 0);
    this.figure('climb', t > 0 && !down ? s.groundSpeed * Math.sin(s.groundClimb * DEG) : 0, 0);
    set('g', t > 0 && !down ? s.g.toFixed(2) : '1.00'); // (on the pad it stands on the launch system, and on the ground: one g)
    this.figure('mach', down ? 0 : s.mach, 2);
    // (each figure fits its cell at every magnitude: fewer decimals, then a larger unit, as it grows: fit.ts)
    // (an ellipse that reaches the Moon's sphere, or past what the Earth holds, is not what it will do: its far end names
    // what it meets instead of a height it never comes to, and it has no period; the path, J and M, flies what happens)
    const meets = orbit ? reaches(s.r, s.v, t, this.pulling()) : null;
    this.figure('apogee', !orbit || meets === 'escape' ? null : (meets ?? (el.a * (1 + el.e) - ball) / KM), 0);
    this.figure('perigee', orbit ? (el.a * (1 - el.e) - ball) / KM : null, 0);
    this.figure('period', orbit && !meets && el.a > ball ? period(el.a) / 60 : null, 1);
    if (this.flight.flies?.target) {
      const target = targetAt(this.flight, this.run, t);
      const delta = target && sub(target.r, s.r);
      const distance = delta ? length(delta) : 0;
      set('target-range', target ? (distance / 1000).toFixed(distance < 10000 ? 3 : 1) : '–');
      set('target-rate', target && delta && distance > 0.1 ? (dot(delta, sub(target.v, s.v)) / distance).toFixed(1) : '–');
    }
    set('q', (s.q / 1000).toFixed(1));
    set('alpha', t > 0 && s.groundSpeed > 5 && s.q > 1 ? s.alpha.toFixed(1) : '–');
    set('range', (s.range / KM).toFixed(s.range < 99_950 ? 2 : 1));
    set('pitch', (90 - angleBetween(s.axis, s.r) / DEG).toFixed(0));
    set('inclination', alone && orbit ? (el.i / DEG).toFixed(2) : '–');
    const v = s.v;
    const off = Math.acos(Math.max(-1, Math.min(1, -(s.axis[0] * v[0] + s.axis[1] * v[1] + s.axis[2] * v[2]) / Math.hypot(...v)))) / DEG;
    set('aim', alone ? off.toFixed(0) : '–');
    // the systems: each stage's propellant, the braking engine, the lock
    const stages = stagesAt(this, t);
    stages.forEach((st, i) => {
      const id = `stage-${i}`;
      const part = st.full > 0 ? st.left / st.full : 0;
      const row = this.cells.get(id)!.parentElement!;
      set(id, st.aboard ? (part < 0.002 ? 'Empty' : `${(part * 100).toFixed(0)} %`) : 'Gone');
      set(`${id}-kg`, st.aboard && part >= 0.002 ? `${st.left.toFixed(0)} kg` : '');
      row.style.setProperty('--left', `${st.aboard ? (100 * part).toFixed(0) : 0}%`);
      row.classList.toggle('low', st.aboard && part < 0.2);
    });
    const all = stagesOf(plan);
    const burning = [
      ...all
        .filter((_, i) => stages[i]!.burning)
        // (two stages on one body, an Atlas's sustainer and its verniers, by their engines)
        .map((st) => short(all.some((o) => o !== st && o.body.id === st.body.id) ? st.engine.label : st.body.label)),
      // (a manoeuvre burning on the flight as it stands, by its thrusters' name: orbital.ts `movesOf`)
      ...shipOf(this.planned ?? (this.free || this.mine !== null ? this.givenUp() : plan))
        .moves.filter((m) => t >= m.on && t < m.off)
        .map((m) => plan.craft[0]!.engines.find((e) => e.id === m.engine)!.label),
    ];
    const coastEngine = coastEvents(plan).burn;
    const fuelTank = plan.craft[0]!.tanks.find((tank) => tank.id === coastEngine?.tanks[0]);
    if (fuelTank && coastEngine) {
      const planned = this.planned ?? (this.free || this.mine !== null ? this.givenUp() : plan);
      const fuel = coastEngineState(planned, coastEngine.id, t);
      const aboard = t < this.parts;
      const fraction = aboard ? fuel.kg / (fuelTank.usable ?? fuelTank.load).value : 0;
      const row = this.cells.get('coast-fuel')!.parentElement!;
      set('coast-fuel', aboard ? `${fuel.starts} starts` : 'Gone');
      set('coast-fuel-kg', aboard ? `${fuel.kg.toFixed(0)} kg` : '');
      row.style.setProperty('--left', `${100 * fraction}%`);
      row.classList.toggle('low', aboard && fraction < 0.2);
    }
    const retro =
      this.fired !== null
        ? { on: this.fired, off: shipOf(this.planned!).off }
        : this.free
          ? null
          : this.mine === null
            ? { on: coast.on, off: coast.off }
            : null;
    const braking = retro !== null && t >= retro.on && t < Math.min(retro.off, this.parts);
    // (the timer's command for the burn, where the plan has one, or its lighting)
    const burnEvents = coastEvents(plan);
    const command = clockAt(plan, burnEvents.command ?? burnEvents.on);
    const onDay = burnByHand(this);
    set(
      'retro',
      this.fired !== null
        ? `By hand, ${wall(this, this.fired)}`
        : this.free
          ? 'Yours to fire'
          : !burnEvents.burn
            ? 'None aboard'
            : this.mine === null
              ? `${onDay ? 'By hand on the day' : 'Timer'}, ${wall(this, command)}`
              : 'Yours, once parted',
    );
    set('lock', this.free ? 'Free' : this.byPlan !== null ? 'Open, by plan' : 'Locked');
    for (const lamp of this.root.querySelectorAll<HTMLElement>('[data-digit]'))
      lamp.classList.toggle('on', this.free || Number(lamp.dataset.digit) < this.typed.length);
    // (what burns by name, the coast's burn by the plan's: nothing on the pad, where the record's first sample already has the stages' thrust)
    const named = burning.length ? burning.join(' + ') : braking ? burnName(this) : null;
    set('motors', named && t > 0 && thrust > 0 ? `${named} ${(thrust / 1000).toFixed(0)} kN` : '–');
    const phase =
      t <= 0
        ? 'On the pad'
        : this.state?.landed && t >= this.state.landed.t
          ? 'Down'
          : this.state?.broke && t >= this.state.broke.t
            ? 'Broken up'
            : s.powered
              ? 'Powered flight'
              : s.riding
                ? alone
                  ? 'Spacecraft alone'
                  : 'Coasting on the launch vehicle'
                : t <= handed && !s.entered
                  ? orbit && el.a * (1 - el.e) > ball + 100_000
                    ? 'In orbit'
                    : 'Spacecraft alone'
                  : t <= handed
                    ? 'Re-entry'
                    : t >= this.run.duration
                      ? 'Down'
                      : Math.min(...Object.values(whole.down?.opened[downOf(plan)?.bodies[0]?.id ?? ''] ?? {})) <= t
                        ? 'Under the parachutes'
                        : 'Falling';
    set('phase', struck ? 'Structure strike' : phase);
    const leant = (x: number, plus: string, minus: string) =>
      Math.abs(x) < 0.05 * DEG ? '' : ` ${(Math.abs(x) / DEG).toFixed(1)}° ${x > 0 ? plus : minus}`;
    const leans = !alone && this.guidance ? leant(this.trim.pitch, 'downrange', 'back') + leant(this.trim.yaw, 'left', 'right') : '';
    set(
      'mode',
      this.mine !== null
        ? `Not the record’s${alone ? '' : !this.guidance ? (this.hold ? (s.powered ? ': hold' : ': hold, nothing to steer with') : ': hands only') : leans ? `: law leaned${leans}` : ''}`
        : this.downMine !== null
          ? `Not the record’s: the descent by hand`
          : this.free
            ? `Manual descent: not the flight of ${this.day}`
            : onDay && t >= command
              ? 'As flown: the braking burn by hand'
              : 'As flown: automatic',
    );
    const guidance = this.root.querySelector<HTMLButtonElement>('[data-do=guidance]')!;
    // (alone, with no burn to come and an entry steered to a place, guidance is the entry's computer)
    const steering = alone && !burnPending(this, t) && steers(this);
    guidance.setAttribute('aria-pressed', String(steering ? entrySteered(this, t) : this.guidance && !this.free));
    guidance.disabled = Boolean(this.padImpact);
    // (alone, with no burn to come, the sequencer is the descent's automatic sequence)
    const descending = alone && !burnPending(this, t);
    const auto = automatic({ given: {}, switched: this.switched }, t);
    const sequence = this.root.querySelector<HTMLButtonElement>('[data-do=sequence]')!;
    sequence.setAttribute('aria-pressed', String(descending ? auto : this.sequence && !this.free));
    this.root.querySelector('[data-do=hold]')?.setAttribute('aria-pressed', String(this.hold));
    sequence.disabled = Boolean(this.padImpact);
    const waiting = t <= 0 && !this.clock.running;
    const replay = live !== null && this.clock.t < live.t - TICK;
    const step = !waiting && !alone && !this.ascended ? nextStep(this) : null;
    const move = nextMove(this);
    const fire = !move && burnNext(this);
    const descent = alone && !fire && !move ? nextDescent(this) : null;
    const flotation = this.run.afloat?.inflation;
    const inflate = Boolean(flotation && t >= this.run.duration && t < flotation.at);
    set(
      'next',
      this.padImpact
        ? struck
          ? 'Escape ended'
          : 'Escape in progress'
        : replay
          ? 'Run on'
          : waiting
            ? 'Ignition'
            : inflate
              ? 'Inflate uprighting bags'
              : step
                ? step.label
                : move
                  ? move.label
                  : fire
                    ? burnAsked(this)
                    : descent
                      ? descent.label
                      : alone
                        ? 'Nothing to do: it flies itself'
                        : 'Nothing left to do',
    );
    this.root.querySelector<HTMLButtonElement>('[data-do=next]')!.disabled = !(
      !this.padImpact &&
      (replay || waiting || inflate || step || move || fire || descent)
    );
    const abort = this.root.querySelector<HTMLButtonElement>('[data-do=abort]')!;
    abort.disabled = abortWhy(this) !== null;
    const selected = abortAt(plan, t);
    const stillArmed = this.now() / 1000 - this.abortArmed <= ABORT_ARMED;
    const armed = !abort.disabled && stillArmed && this.abortArmedFor === selected;
    abort.classList.toggle('armed', armed);
    set('abort', armed ? 'Press again to abort' : 'Abort');
    if (this.orbitAbort) {
      const alternative = abortAt(plan, t, true);
      this.orbitAbort.disabled = !alternative || selected === alternative || abortWhy(this, true) !== null;
      const orbitArmed = !this.orbitAbort.disabled && stillArmed && this.abortArmedFor === alternative;
      this.orbitAbort.classList.toggle('armed', orbitArmed);
      this.orbitAbort.textContent = orbitArmed ? 'Confirm abort to orbit' : 'Abort to orbit';
    }
    this.root.classList.toggle('waiting', waiting);
    this.root.classList.toggle('thrusting', burning.length > 0 && t > 0);
    const code = String(record.manual?.code?.value ?? '');
    // (a stage firing into a joined one: what the staging sequence a hand set off has still to do, or, nothing pending, the
    // next step due now and how long the top below has left)
    const firing = !alone ? firingOf(this) : null;
    const owed = !alone && this.mine !== null ? this.state?.chain?.[0] : undefined;
    const owedLabel = owed && this.vehicleOf().sequence.find((k) => JSON.stringify(k.step) === JSON.stringify(owed.step))?.label;
    const scorched = firing ? short(stagesOf(plan)[firing.stage - 1]!.body.label).toLowerCase() : '';
    const due =
      (!this.sequence && this.mine !== null && step && !alone && t >= dueAt(this, step.step)) ||
      (firing !== null && !owed && step !== null) ||
      (descending && !auto && descent !== null && descentDue(this, descent.id, t));
    const prompt = this.cells.get('prompt')!;
    const touch = matchMedia('(hover: none), (pointer: coarse)').matches;
    const lights = touch ? 'Ignition lights' : 'Space lights';
    // (how a flight is taken over, in a line: the switches, the action or the throttle)
    const takes = touch ? 'a switch, the action or the throttle takes it over' : 'G, B, Space or the throttle takes it over';
    // (the next step lights a stage into the one it stands on: said where it is offered, as it is how it flew)
    const hot = step ? hotNote(this, step.step) : null;
    const text =
      flotation && down
        ? inflate
          ? 'Apex down · The uprighting bags can turn the spacecraft right side up'
          : 'Uprighting bags inflated by the postlanding compressors'
        : waiting
          ? this.mine === null
            ? `Ready: ${lights} the engines · as flown until ${takes.replace(' takes it over', ' takes it')}`
            : `Ready: ${lights} the engines · by hand: ${touch ? 'the switches have' : 'G and B have'} the record fly it`
          : broken
            ? 'Broken up: the card says by what, against which limit'
            : !alone
              ? this.mine === null
                ? hot
                  ? 'Next: hot staging, as it flew'
                  : `As flown: ${takes}`
                : owed && owedLabel
                  ? `Hot staging: ${owedLabel.charAt(0).toLowerCase()}${owedLabel.slice(1)} in ${Math.max(0, owed.at - t).toFixed(1)} s, by its sequence`
                  : firing && step
                    ? `${step.label} is due now · ${Math.max(0, firing.left).toFixed(1)} s before the ${scorched}’s top gives`
                    : due && step
                      ? `${step.label} is due${hot ? ' · hot staging' : ''}`
                      : !this.sequence && step
                        ? `Next: ${step.label.charAt(0).toLowerCase()}${step.label.slice(1)} ${whenIntended(this, step)}${hot ? ' · hot staging' : ''}`
                        : hot
                          ? 'Next: hot staging, as it flew'
                          : this.guidance
                            ? 'Guidance flying · steer to lean its aim'
                            : 'Hands only · steer while an engine burns'
              : descending && (!auto || this.downMine !== null)
                ? !descent
                  ? t >= overAt(this)
                    ? 'Down: the card says how it ended'
                    : 'Nothing left to give: the rest is the physics'
                  : !auto
                    ? `Sequencer off · ${descent.label}${due ? ' is due' : ' next'}`
                    : `The automatic sequence flies the rest · the action sets it off sooner`
                : this.free
                  ? this.fired === null
                    ? this.mine !== null && !(orbit && el.a * (1 - el.e) > ball + 100_000)
                      ? `Short of an orbit: it comes down, unless the ${burnName(this).toLowerCase()} pushes it on`
                      : 'Turn the long axis against the motion, then fire'
                    : outcome(this, t)
                  : this.byPlan !== null
                    ? `By hand, as flown: the flight controls steer the ship until ${wall(this, record.manual!.periods![this.byPlan]!.to.value)}`
                    : code && t < coast.on
                      ? `Open More and enter ${[...code].join('-')} to unlock steering`
                      : fire
                        ? `Next: the ${burnName(this).toLowerCase()} by the action, or at ${wall(this, coast.on)}`
                        : coast.on === Number.POSITIVE_INFINITY && !downOf(plan)
                          ? orbit && el.a * (1 - el.e) > ball + 100_000
                            ? record.bound
                              ? `On its way to ${record.bound.for}: the run ends here`
                              : 'In orbit: it stays up'
                            : 'Short of orbit: it falls to the sea'
                          : 'The descent is automatic';
    if (prompt.textContent !== text) prompt.textContent = text;
    // (a line of the instrument's; what is behind it, where there is more to say, in its title)
    const tip = hot ? `${step!.label}: ${hot}` : text;
    if (prompt.title !== tip) prompt.title = tip;
    prompt.hidden = !text;
    prompt.classList.toggle('due', Boolean(due));
    card(this, t);
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

import type { Impact } from '../sim/contact.ts';
import { type DownBody, type DownChute, downOf } from '../sim/descent.ts';
import { apparentBy, type Descend, guided, spacecraft } from '../sim/fliers.ts';
import { along, MEAN_RADIUS } from '../sim/fly.ts';
import {
  type EscapeState,
  type EscapeSweep,
  launchEscape,
  ORBIT_SLACK,
  planAfterEscape,
  withEscapeTranslation,
  withServiceAbort,
} from '../sim/launchescape.ts';
import {
  automatic,
  coastEngineState,
  coastEvents,
  coastOf,
  crewWords,
  type DescentFlown,
  type DescentHands,
  decay,
  flyEjected,
  heightsBall,
  type Move,
  shipOf,
} from '../sim/orbital.ts';
import { skyOf } from '../sim/air.ts';
import { handRange } from '../sim/lever.ts';
import { targetAt } from '../sim/orbital-target.ts';
import { type AbortMode, abortAt, clockAt, eventOf, type FlightPlan, flownByHand, type TowerEscape } from '../sim/plan.ts';
import { type Predictor, propagate } from '../sim/predict.ts';
import { due, onRails } from '../sim/rails.ts';
import { aboutAxis, conjugate, multiply, normalize, type Quat, turn } from '../sim/rigid.ts';
import {
  attitudeBetween,
  between,
  coastContacts,
  descentRecords,
  either,
  firesOf,
  floatUprighting,
  flownPlan,
  grown,
  keepContact,
  orbitalEvents,
  orbitalFlown,
  orbitalRecord,
  orbitalRelease,
  type Run,
} from '../sim/run.ts';
import { Sheds } from '../sim/shed.ts';
import {
  type Ascended,
  byHand,
  type DrawnDescent,
  descentOf,
  drawnOf,
  type FlownWhole,
  flowOf,
  flyOn,
  givenUp,
  airOf,
  guidanceOf,
  held,
  lawOf,
  integral,
  movedTo,
  partingAt,
  passiveSpherePose,
  recordSamples,
  sequenceOf,
  stagesOf,
} from '../sim/staged.ts';
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
} from '../sim/stagedlive.ts';
import { type LiveSample, TICK } from '../sim/vehicle.ts';
import { downVerdict, ejectedVerdict, landsOf } from '../sim/verdict.ts';
import type { SitedFlight } from '../types.ts';
import { is } from '../util/keys.ts';
import type { DeckNews } from '../viewer/cabin.ts';
import { EARTH_SPHERE, G0 } from '../world/bodies.ts';
import { type Clock, COAST_RATES, missionTime, RATES } from '../world/clock.ts';
import { sunPosition } from '../world/ephemeris.ts';
import { angleBetween, cross, DEG, dot, length, scale, siteFrame, sub, unit, type Vec3 } from '../world/frames.ts';
import { elementsOf, period } from '../world/orbit.ts';
import { julianDate, terrestrialTime } from '../world/time.ts';
import {
  ABORT_ARMED,
  type CockpitHost,
  Deck,
  type DeckSpec,
  type Figure,
  FINE,
  GUARD,
  KEEP,
  HOLD_TURN,
  MOST,
  START,
  type ThrottleView,
  TRIM,
  TRIM_MOST,
  tank,
} from './deck.ts';
import type { NavSample } from './navball.ts';
import { pack } from './tape.ts';
import { termsOf } from '../sim/core/gravity.ts';

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
/**
 * Above the air on the launch vehicle, as KSP's: the orbit it would be on were it cut now (its osculating apsides), with
 * the space-fixed speed, so a hand can fly it to the record's orbit and cut it there.
 */
const CLIMBING: Figure[] = [
  RISING[0]!,
  ORBITING[1]!,
  RISING[2]!,
  { id: 'apogee', label: 'Apogee', unit: 'km', about: 'The highest point of the orbit it would be on were it cut now' },
  {
    id: 'perigee',
    label: 'Perigee',
    unit: 'km',
    about: 'The lowest point of the orbit it would be on were it cut now: under the ground, it comes down',
  },
];
/** The height above which the deck shows the orbit going up (`CLIMBING`): where the air's push has fallen away, m. */
const ABOVE_AIR = 60_000;
/** A stage's name, short: before its first comma ('Strap-on boosters, Blocks B, V, G, D' is 'Strap-ons'). */
const short = (name: string) => name.split(',')[0]!.replace('Strap-on boosters', 'Strap-ons');
/** The record's stages as a plan has them, base first: when each is lit, cut (its own cut's record instant, or its letting go where it has none) and let go, s. */
/**
 * Each stage as the record's run has it: lit, stopped and let go. A stage its guidance cuts on the state (its speed, the
 * orbit reached) stops when the run stops it (`stops`, the run's own), and one let go so long after such a stop is let go
 * that long after; every other instant is the record's.
 */
const recordStages = (plan: FlightPlan, stops?: readonly number[]) =>
  sequenceOf(plan).stages.map((k, i) => {
    const stop = stops?.[i];
    const own = (k.orbit || k.speed !== null) && stop !== undefined && Number.isFinite(stop);
    return { from: k.from, cut: own ? stop : (k.cutAt ?? k.sep), sep: own && k.wait !== null ? stop + k.wait : k.sep };
  });
const ENTER = 'Fly this flight: as flown, or take it over (L)';
/** The months, for a time on another day than the launch's ('10:18:00 on 7 August'). */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export class OrbitDeck extends Deck {
  /**
   * The flight's plan as its record's run flew it (sim/run.ts `flownPlan`): the flight's own, with its braking burn and
   * all the clock sets off after it where guidance timed them for the landing place (sim/plan.ts `LandingAim`). What
   * this deck asks whenever it wants the record's plan, so its instants are the run's on show.
   */
  private flownAs: FlightPlan | null = null;
  private get recordPlan(): FlightPlan {
    this.flownAs ??= flownPlan(this.flight);
    return this.flownAs;
  }
  /** When each of the record's events happens on the run on show (sim/run.ts `orbitalEvents`): what the cabin's lamps read. */
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
  /** Which of the record's own periods by hand (`manual.periods`) the hands are in, as flown, and the samples they turned from. */
  private byPlan: number | null = null;
  private planBase: readonly LiveSample[] | null = null;
  private fired: number | null = null;
  /** When each of the record's manoeuvres (orbital.ts `movesOf`) was fired by hand, in the record's order. */
  private moved: number[] = [];
  /** Preserve the record up to an orbital takeover, then integrate freely from its state there. */
  private handover: { t: number; r: Vec3; v: Vec3 } | null = null;
  private priorMoves = 0;
  /** The plan as this flight now has it: the record's own, its burn given up (hands free, nothing fired), or the hand's burn. */
  private planned: FlightPlan | null = null;
  /** How it is flown: the two switches, and how far the hands have leaned the law. */
  private guidance = START.guidance;
  private sequence = START.sequence;
  /** Hold (deck.ts `START`): with guidance off the steering keeps `holdAt`, the attitude the hands leave the launch vehicle at. */
  private hold = START.hold;
  private holdAt: Vec3 | null = null;
  private trim = { pitch: 0, yaw: 0 };
  /** When the flight became the user's (0 from the pad), or null while it is the record's. */
  private mine: number | null = null;
  /** The live staged vehicle and its state while the user's flight is on the launch vehicle; its pilot and what the hands asked. */
  private vehicle: StagedVehicle | null = null;
  private state: StagedState | null = null;
  private pilot: StagedPilot | null = null;
  private options: StagedPilotOptions = { guidance: true, sequence: true };
  private asked: Step[] = [];
  /** The stages the lever has cut (taken under their least): raised again, each is asked to start once more. */
  private cutByLever = new Set<number>();
  private tally: StagedTally | null = null;
  private kept = 0;
  /** How many of the live vehicle's notes (`StagedState.said`) the deck has said. */
  private heard = 0;
  private eventAt = Number.NEGATIVE_INFINITY;
  /** The user's ascent as staged.ts's batch run has its results, once the spacecraft has parted (for the coast and the checks). */
  private ascended: Ascended | null = null;
  private told = Number.NEGATIVE_INFINITY;
  /**
   * The descent by hand (sim/orbital.ts `DescentHands`): each event a hand gave and when, the automatic sequence's switch as
   * it was thrown, the modules parted by hand; when the descent was taken from the record's flight (null while it is the
   * record's); and how long the orbit lasts, for the flight on show that stays up (worked once: orbital.ts `decay`).
   */
  private given: Record<string, number> = {};
  private switched: { t: number; on: boolean }[] = [];
  private partedBy: number | null = null;
  /** The abort asked for going up: the record's mode for the instant (`PlanRecord.aborts`) and when. */
  private aborted: { mode: AbortMode; t: number } | null = null;
  private padImpact: Impact | null = null;
  private padGrazes: Impact[] = [];
  /** The crew's descent from the launch vehicle after an abort's ejection (`AbortMode.escape.eject`), and when they left. */
  private ejected: { down: DescentFlown; at: number } | null = null;
  /** When X was first pressed: a second within ABORT_ARMED fires it. */
  private abortArmed = Number.NEGATIVE_INFINITY;
  private abortArmedFor: AbortMode | null = null;
  private readonly orbitAbort: HTMLButtonElement | null;
  private downMine: number | null = null;
  private lasts: { of: FlownWhole; s: number } | null = null;
  /** The plan the flight on show was last flown on (`refly`), and how many times it has been: the card is made again when it is. */
  private flownPlan: FlightPlan | null = null;
  private flownAt = 0;

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

  /**
   * Whether the coast's burn is the next thing a hand could do, which Space then does: once alone, with the hands free (a
   * lock opened), or, for a spacecraft whose hand controls had no lock (`PlanRecord.manual` without a `code`), before the
   * record's own burn is made: its pilot's next act in the record's order, before the parting that follows it.
   */
  private get burnNext(): boolean {
    if (this.can('retro')) return true;
    const manual = this.recordPlan.record?.manual;
    const t = this.clock.t;
    if (!this.on || !manual || manual.code || this.free || this.fired !== null || !(t > this.parting)) return false;
    if (this.mine === null && t >= coastOf(this.recordPlan).on) return false;
    return this.retroWhy() === null;
  }

  /** The action for the coast's burn, with any wording the plan supplies. */
  private get burnAsked(): string {
    return coastEvents(this.recordPlan).on?.asked ?? `Fire the ${this.burnName.toLowerCase()}`;
  }

  /** The coast's burn as the plan names it ('Braking engine', 'Retrorockets'): what the deck calls it. */
  private get burnName(): string {
    return coastEvents(this.recordPlan).burn?.label ?? 'Braking engine';
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
    return propagate(spacecraft(plan, this.frame, site, sea, start, { ...lit, ...this.descendOf(plan, true) }), start, where, options);
  }
  /**
   * How the spacecraft of `plan` goes on down from the height the pilot leaves at (sim/fliers.ts `descending`): the descent
   * module the run on show follows, with what the hands gave; `begun`, from the run's own state of it (a prediction made
   * part-way down), not one still to come.
   */
  private descendOf(plan: FlightPlan, begun: boolean): { descend?: Descend } {
    const first = downOf(plan)?.bodies[0];
    if (!first) return {};
    const down = begun ? (this.flown ?? orbitalFlown(this.flight)).down : null;
    return { descend: { follow: first.id, hands: { given: this.given, switched: this.switched }, ...(down ? { from: down } : {}) } };
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
    if (what.startsWith('descent:')) return this.descentWhy(what.slice(8)) === null;
    if (what === 'retro') return this.free && this.fired === null && this.hand !== null && this.retroWhy() === null;
    if (what === 'move') return this.nextMove() !== null;
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
      const plan = this.recordPlan;
      if (st.kind === 'drop') return (sequenceOf(plan).drops.find((d) => d.joint === st.id)?.at ?? -Infinity) > t;
      const g = recordStages(plan, orbitalFlown(this.flight).ascent.stops)[st.stage];
      if (!g || g.sep <= t) return false;
      if (st.kind === 'ignite') return g.from > t;
      if (st.kind === 'cut') return g.from <= t && g.cut > t;
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
  protected obey(what: string): void {
    if (!this.on || this.padImpact) return;
    if (what.startsWith('code:')) this.digit(what.slice(5));
    else if (what === 'manual')
      this.host.say?.(
        'Manual orientation',
        this.free ? 'On: the flight controls steer the spacecraft' : 'Locked: the code on the lock frees it',
      );
    else if (what.startsWith('step:')) {
      const step = stepOf(what);
      if (!step || !this.can(what)) return;
      if (this.mine === null) {
        this.takeOver();
        this.host.say?.('Your flight', 'The simulator will follow this flight from the event you just commanded');
      }
      this.eventAt = this.now() / 1000;
      this.asked.push(step);
      if (!this.clock.running) this.clock.play(true);
    } else if (what.startsWith('descent:')) this.give(what.slice(8));
    else if (what === 'move' && this.can('move')) this.move(this.clock.t);
    else if (what === 'retro' && this.can('retro')) this.fire(this.clock.t);
    else if (what === 'retro')
      this.host.say?.(this.burnName, !this.free ? 'Locked: the hand controls are not free' : (this.retroWhy() ?? 'Fired already'));
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
    return !this.recorded;
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
    if (!this.hand || this.fired !== null || !(this.free || this.byPlan !== null)) return false;
    const p = this.push();
    return p.pitch !== 0 || p.yaw !== 0 || p.roll !== 0;
  }

  /** When the spacecraft leaves the last stage on the flight on show, s. */
  private get parting(): number {
    if (this.mine !== null) return this.ascended?.separation.t ?? Infinity;
    const flown = orbitalFlown(this.flight).ascent;
    const sep = recordStages(this.recordPlan, flown.stops).at(-1)?.sep ?? Infinity;
    // (a last stage that is itself the spacecraft, an Agena, is let go of by nothing: alone once its engine has stopped)
    return Number.isFinite(sep) ? sep : flown.separation.t;
  }
  /** Whether the record's own braking burn was fired by hand: its command within one of the record's periods of orientation by hand. */
  private get burnByHand(): boolean {
    const plan = this.recordPlan;
    const events = coastEvents(plan);
    const command = clockAt(plan, events.command ?? events.on);
    return (plan.record?.manual?.periods ?? []).some((p) => command >= p.from.value && command <= p.to.value + 1e-6);
  }
  /** The day of the record's flight, as the deck says it ('12 April'). */
  private get day(): string {
    return new Date(this.flight.launch).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  }
  /** The plan with its timer's burn given up: nothing fires until a hand does. */
  private givenUp(): FlightPlan {
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
    this.priorMoves = 0;
    this.planned = null;
    this.mine = this.recordOnPad ? null : 0;
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
    else if (what === 'abort' || what === 'abort-orbit') this.abortAsked(what === 'abort-orbit', input);
    this.show();
  }

  /**
   * The spacecraft's escape the record has for the clock's instant on the launch vehicle (`PlanRecord.aborts`, each mode
   * `until` its second: plan.ts `abortAt`), or why there is none to fly; null when there is one. A mode the record says no
   * more of than words (`AbortMode.escape` left out) is said and not flown, and so is a seat a crew did not have.
   */
  private abortWhy(preferOrbit = false): string | null {
    const t = this.clock.t;
    if (this.ascended || t > this.parting) return 'The spacecraft has left its launch vehicle: there is nothing to escape from';
    if (this.state?.broke && t >= this.state.broke.t - 1e-9) return 'Broken up';
    if (this.aborted) return 'Aborted already';
    const plan = this.recordPlan;
    if (!plan.record?.aborts?.length) return 'This flight’s record gives no mode of escape from its launch vehicle: none is flown here';
    const mode = abortAt(plan, t, preferOrbit);
    if (!mode) return 'Past the last of the escape’s modes';
    if (!mode.escape) return `By the record, ${mode.does} This mode is described in the record.`;
    if (t <= 0 && !this.clock.running && !this.state && !mode.escape.tower) return 'On the pad: the escape begins with flight';
    if (mode.escape.eject && plan.craft[0]!.crew?.alone === undefined)
      return `By the record, ${mode.does}; but this ship’s crew had no seats to leave it on. Not flown here`;
    return null;
  }

  /** X: the first press arms the abort and says what it would do; a second within two seconds does it. */
  private abortAsked(preferOrbit: boolean, input: (string | number)[]): void {
    const why = this.abortWhy(preferOrbit);
    if (why) return void this.host.say?.('Abort', why);
    const now = this.now() / 1000;
    const mode = abortAt(this.recordPlan, this.clock.t, preferOrbit)!;
    if (now - this.abortArmed > ABORT_ARMED || this.abortArmedFor !== mode) {
      this.abortArmed = now;
      this.abortArmedFor = mode;
      return void this.host.say?.('Abort armed', `Again to abort: ${mode.does}`);
    }
    this.abortArmed = Number.NEGATIVE_INFINITY;
    this.abortArmedFor = null;
    this.abort(mode, input);
  }

  /**
   * The escape's `mode` at the clock's instant, as the record has the hardware do it (`AbortMode.escape`): every stage
   * burning cut, the crew ejected at once from the stack's state (or, `falling`, as the falling stack comes down through
   * its height: `fly`), the last stage let go. The cuts and the letting go are asked of the live vehicle as steps, so
   * what parts and when is its physics: held in while the fairing covers it, pressed on until the push falls
   * (sim/staging.ts). With `separate.entry` the modules part once the spacecraft has (`parted`).
   */
  private abort(mode: AbortMode, input: (string | number)[]): void {
    const plan = this.recordPlan;
    const e = mode.escape!;
    const v = this.vehicleOf();
    if (!this.state && this.clock.t <= 0 && e.tower) this.begin(v.start(), 0);
    else if (this.mine === null) this.takeOver();
    const s = this.state!;
    this.aborted = { mode, t: s.t };
    this.run!.launchAborted = true;
    this.eventAt = this.now() / 1000;
    this.host.say?.('Abort', mode.does);
    if (e.tower) {
      this.escapeOnTower(e.tower, s, input);
      if (!this.clock.running) this.clock.play(true);
      return;
    }
    const stages = stagesOf(plan);
    const steps: Step[] = e.cut ? stages.flatMap((_, i) => (v.burning(s, i) ? [{ kind: 'cut' as const, stage: i }] : [])) : [];
    if (e.separate) steps.push({ kind: 'separate', stage: stages.length - 1 });
    this.asked.push(...steps);
    if (e.eject && !e.eject.falling) this.eject(v.aboard(s, this.centre));
    if (!this.clock.running) this.clock.play(true);
  }

  /** Lift the capsule away from the stages, then continue on its ordinary Earth landing system. */
  private escapeOnTower(tower: TowerEscape, state: StagedState, input: (string | number)[]): void {
    const source = this.recordPlan;
    const v = this.vehicleOf();
    const station = tower.hull?.centre.value ?? this.centre;
    const first = v.sample(state, station);
    const site = siteFrame(this.flight.site);
    const sea = this.flight.site.seaLevel.value;
    const start = { ...v.aboard(state, station), axis: first.axis };
    const runEscape = (sweep?: EscapeSweep) => launchEscape(source, tower, start, this.frame, sea, sweep);
    const track = tower.hull ? this.escapeFromPad(tower.hull.obstacles, first.t, input, runEscape) : runEscape();
    const release = track.at(-1)!;
    this.padGrazes = track.flatMap((point) => (point.impact && !point.impact.activeBroken ? [point.impact] : []));
    if (release.impact?.activeBroken) return void this.endPadEscape(tower, state, first, track);
    const escapeSamples = this.escapeSamples(track, first, tower.engine);
    const last = escapeSamples.at(-1)!;
    const plan = planAfterEscape(source, tower, release.t);
    const down = downOf(plan)!;
    const cover =
      release.t + (release.t - first.t <= tower.jettison.after.value + 0.2 ? tower.coverAfter.low.value : tower.coverAfter.high.value);
    const hands = { given: { [down.ejection]: cover }, switched: [] };
    const stops = state.stages.map((record) => Math.min(record.to, record.gone, state.t));
    this.ascended = {
      ...orbitalFlown(this.flight).ascent,
      samples: [ascentSample(v, state)],
      separation: release,
      stops,
    };
    this.state = { ...state, parted: { t: first.t, r: first.r, v: first.v, stageMass: 0 } };
    this.flown = flyOn(plan, site, this.frame, sea, this.ascended, release, hands);
    this.flownPlan = plan;
    this.flownAt++;
    this.planned = plan;
    this.partedBy = release.t;
    this.given = hands.given;
    const run = this.run!;
    const jd = julianDate(this.flight.launch);
    const samples = recordSamples(
      plan,
      this.flown,
      this.frame,
      station,
      (at) => sunPosition(terrestrialTime(jd + at / 86_400)),
      last.attitude,
      true,
    );
    const tail = samples.filter((sample) => sample.t > release.t + 1e-9);
    const before = samples.filter((sample) => sample.t <= state.t && sample.riding);
    const joined = [...before, ...escapeSamples, ...tail];
    const changes: Record<string, number> = Object.fromEntries(tower.stages.map((id) => [id, state.t]));
    changes[tower.service] = state.t;
    changes[tower.tower] = release.t;
    changes[tower.cover] = this.flown.down?.ejected ?? cover;
    const drops = this.flight.flies!.drops.map((drop, i) => Math.min(run.dropped[i]!, changes[drop.on ?? ''] ?? Infinity));
    const bodyDrops = source.craft[0]!.joints.flatMap((joint) =>
      joint.id in changes ? joint.gone.map((id) => [id, changes[joint.id]!]) : [],
    );
    for (const body of source.craft[0]!.sheds ?? []) {
      if (run.sheds?.get(body.on)) continue;
      const i = this.flight.flies!.drops.findIndex((drop) => drop.on === body.on);
      const at = drops[i] ?? Infinity;
      if (!Number.isFinite(at) || (state.held && at <= first.t)) continue;
      // The launch escape motor is spent. Its propellant has already left the departing assembly.
      const mass = body.on === tower.tower && body.mass ? body.mass.value - tower.propellant.value : undefined;
      const released = orbitalRelease(source, body, joined, at, undefined, mass);
      if (released) run.sheds?.add(released);
    }
    this.times = { ...orbitalEvents(this.flight, this.flown, { burn: null, parting: state.t }), ...changes };
    this.run = {
      ...run,
      samples: joined,
      cutoff: state.t,
      duration: joined.at(-1)!.t,
      dropped: drops,
      bodies: { ...run.bodies, ...Object.fromEntries(bodyDrops) },
      events: [
        ...run.events.filter((event) => event.t < first.t),
        { t: first.t, event: 'launch-escape' },
        { t: first.t + tower.canards.value, event: 'escape-canards' },
        ...Object.entries(changes).map(([event, t]) => ({ event, t })),
      ].sort((a, b) => a.t - b.t),
      descent: this.flown.down ? drawnOf(this.flown.down, [0, 0, 0], source.record?.ground?.value) : null,
      afloat: undefined,
      fires: firesOf(this.flight, this.flown, undefined, plan).map((fire, i) =>
        this.flight.flies!.fires?.[i]?.on === tower.engine
          ? { from: state.t, to: state.t + source.craft[0]!.engines.find((engine) => engine.id === tower.engine)!.burn!.value }
          : fire,
      ),
    };
    this.host.fly(this.run);
  }

  private escapeSamples(track: readonly EscapeState[], first: LiveSample, engine: string): LiveSample[] {
    const station = dot(sub(first.centre, first.r), first.axis);
    const sea = this.flight.site.seaLevel.value;
    const pad = this.frame.toFixed(this.vehicleOf().start().r, 0);
    let previous = first;
    return track.map((point) => {
      const position = this.frame.place(point.r, point.t);
      const motion = this.frame.overGround(point.r, point.v);
      const up = this.frame.up(point.r, point.t);
      // Carry the previous roll with the turning axis. The same angular motion gives a departing part its point velocity.
      const hinge = cross(previous.axis, point.axis);
      const sa = length(hinge);
      const swing = Math.atan2(sa, dot(previous.axis, point.axis));
      const attitude = sa > 1e-9 ? multiply(aboutAxis(scale(hinge, 1 / sa), swing), previous.attitude) : previous.attitude;
      const dt = point.t - previous.t;
      const rates: Vec3 = dt > 0 ? (sa > 1e-9 ? turn(conjugate(attitude), scale(hinge, swing / (sa * dt))) : [0, 0, 0]) : first.rates;
      previous = {
        ...first,
        ...point,
        r: sub(point.r, scale(point.axis, station)),
        centre: point.r,
        latitude: position.latitude,
        longitude: position.longitude,
        altitude: position.height - sea,
        range: angleBetween(this.frame.toFixed(point.r, point.t), pad) * MEAN_RADIUS,
        speed: length(point.v),
        groundSpeed: length(motion),
        climb: Math.atan2(dot(point.v, up), length(cross(point.v, up))) / DEG,
        groundClimb: Math.atan2(dot(motion, up), length(cross(motion, up))) / DEG,
        attitude,
        rates,
        riding: false,
        powered: point.thrust > 0,
        burning: point.thrust > 0 ? [{ engine, thrust: point.thrust }] : [],
      };
      return previous;
    });
  }

  private endPadEscape(tower: TowerEscape, state: StagedState, first: LiveSample, track: readonly EscapeState[]): void {
    const hit = track.at(-1)!.impact!;
    const run = this.run!;
    const past = (run.samples as LiveSample[]).filter((sample) => sample.riding && sample.t <= first.t);
    const samples = [...past, ...this.escapeSamples(track, first, tower.engine)];
    const parts = [...tower.stages, tower.service];
    this.ascended = {
      ...orbitalFlown(this.flight).ascent,
      samples: [ascentSample(this.vehicleOf(), state)],
      separation: track.at(-1)!,
      stops: state.stages.map((record) => Math.min(record.to, record.gone, state.t)),
    };
    this.padImpact = hit;
    this.state = { ...state, parted: { t: first.t, r: first.r, v: first.v, stageMass: 0 } };
    this.partedBy = first.t;
    this.run = {
      ...run,
      samples,
      duration: hit.t,
      cutoff: first.t,
      dropped: this.flight.flies!.drops.map((drop, i) =>
        parts.some((id) => id === drop.on) ? Math.min(run.dropped[i]!, first.t) : run.dropped[i]!,
      ),
      events: [
        ...run.events.filter((event) => event.t < first.t),
        { t: first.t, event: 'launch-escape' },
        ...parts.map((event) => ({ t: first.t, event })),
        { t: hit.t, event: 'escape-impact' },
      ],
      descent: null,
      afloat: undefined,
      fires: (this.flight.flies!.fires ?? []).map((fire, i) => {
        if (fire.on === tower.engine) {
          const burn = this.recordPlan.craft[0]!.engines.find((engine) => engine.id === tower.engine)!.burn!.value;
          return { from: first.t, to: Math.min(hit.t, first.t + burn) };
        }
        const held = run.fires?.[i];
        return { from: held?.from ?? Infinity, to: Math.min(held?.to ?? Infinity, first.t) };
      }),
    };
    this.host.fly(this.run);
  }

  /**
   * The crew ejected from the launch vehicle at `at` (the spacecraft's state on the stack): their descent flown at once from
   * there (orbital.ts `flyEjected`) and put in the run on show, each piece that comes down on it (the seat, the hatches)
   * leaving the model as it leaves. The stack flies on as the live vehicle has it, the ship on it empty.
   */
  private eject(at: { t: number; r: Vec3; v: Vec3 }): void {
    const plan = this.recordPlan;
    const v = this.vehicleOf();
    const down = flyEjected(plan, this.frame, this.flight.site.seaLevel.value, at, { ground: v.ground });
    if (!down) return;
    this.ejected = { down, at: at.t };
    const run = this.run!;
    run.descent = drawnOf(down, [0, 0, 0]);
    this.flight.flies!.drops.forEach((d, i) => {
      if (d.rides?.length) run.dropped[i] = down.tracks[d.rides[0]!.body]?.[0]?.t ?? Number.POSITIVE_INFINITY;
    });
    const x = v.sample(this.state!, this.centre);
    const { who, their } = crewWords(plan.craft[0]!.crew);
    this.host.say?.(
      'Ejected',
      `${who} left the ship on ${their} seat at ${(x.altitude / KM).toFixed(1)} km, ${x.groundSpeed.toFixed(0)} m/s through the air. The launch vehicle flies on, the ship on it empty`,
    );
    this.host.fly(run);
  }

  /** The lock's digits are keys of this kind's. */
  protected override extraKey(key: string): boolean {
    if (!is(key, 'deck.code')) return false;
    this.digit(key);
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
        this.freeHands(
          `Taken in hand: not the flight of ${this.day}. Steer with the flight controls and use the action button to fire the ${this.burnName.toLowerCase()}`,
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
      if (which === 'sequence' && !this.burnPending(t)) return void this.switchDescent();
      if (!this.free && this.fired === null) {
        this.freeHands(
          `Taken over: not the flight of ${this.day}. Steer with the flight controls and use the action button to fire the ${this.burnName.toLowerCase()}`,
        );
        if (which === 'sequence') this.switchDescent();
      }
      return;
    }
    if (!waiting && this.mine === null) this.takeOver();
    this[which] = !this[which];
    this.options.guidance = this.guidance;
    this.options.sequence = this.sequence;
    if (waiting) this.mine = this.recordOnPad ? null : 0;
    else this.say();
  }

  /** Hold thrown: on the pad a switch; going up, the flight taken over (as a switch does) and the hold kept or let go. */
  private toggleHold(): void {
    const t = this.clock.t;
    const waiting = t <= 0 && !this.clock.running;
    if (!waiting && this.mine === null && t <= this.parting && !this.ascended) this.takeOver();
    this.hold = !this.hold;
    if (waiting) this.mine = this.recordOnPad ? null : 0;
  }

  /** Space: the next thing to do. */
  private next(): void {
    const t = this.clock.t;
    const now = this.now() / 1000;
    if (this.state && t < this.state.t - TICK) return void this.clock.play(true); // (looking back: run on)
    // (the guard is a finger's, in real time: not while a stage fires into a joined one, whose top burns in flight time)
    if (now - this.eventAt < GUARD && !this.firing) return;
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
      if (this.mine !== null) this.liftoff();
      this.clock.setRate(1);
      this.clock.play(true);
      return;
    }
    if (t <= this.parting && !this.ascended) {
      const step = this.nextStep();
      if (!step) return;
      this.eventAt = now;
      if (this.mine === null) {
        this.takeOver();
        this.host.say?.('Your flight', `You commanded ${step.label.toLowerCase()}. The simulator will fly from here`);
      }
      this.asked.push(step.step);
      if (!this.clock.running) this.clock.play(true);
      return;
    }
    if (this.can('move')) {
      this.eventAt = now;
      this.move(t);
      return;
    }
    if (this.burnNext) {
      this.eventAt = now;
      // (no lock: the hand on the button has the controls, as its pilot's did)
      if (!this.free) this.freeHands(null);
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
  private nextStep(): { step: Step; label: string; at: number } | null {
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

  /** On this flight's own vehicle, a stage firing into the one it stands on, still joined, now (stagedlive.ts `firing`). */
  private get firing(): ReturnType<StagedVehicle['firing']> {
    const s = this.mine !== null ? this.state : null;
    return s && !s.broke && !s.parted && !s.landed ? this.vehicleOf().firing(s) : null;
  }

  private vehicleOf(): StagedVehicle {
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

  /** The user's flight from the pad: the live vehicle standing there, its first stages lit now. */
  private liftoff(): void {
    const v = this.vehicleOf();
    this.begin(v.start(), 0);
    this.asked.push(...recordStages(this.recordPlan).flatMap((s, i) => (s.from <= 0 ? [{ kind: 'ignite' as const, stage: i }] : [])));
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
    const site = siteFrame(this.flight.site);
    const solved = orbitalFlown(this.flight).ascent.solved;
    this.options = { guidance: this.guidance, sequence: this.sequence, memo: { thetaTurn: null } };
    const caught = stagedPilot(v, solved, site, this.frame, this.flight.site.seaLevel.value, {
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
      steps: recordStages(this.recordPlan).flatMap((st, i) => (st.from <= 0 ? [{ kind: 'ignite' as const, stage: i }] : [])),
    });
    const tally = new StagedTally(v);
    while (s.t < t - TICK / 2 && !s.parted && !s.broke) {
      const was = s;
      s = v.tick(s, caught);
      tally.note(was, s);
    }
    s = { ...s, controls: { pitch: 0, yaw: 0, roll: 0 } };
    this.begin(s, t, tally);
  }

  /** The live vehicle's flight begun at `s`, the run on show the record's up to `from` and this flight's after. */
  private begin(s: StagedState, from: number, tally?: StagedTally): void {
    const v = this.vehicleOf();
    this.mine = from;
    this.state = s;
    this.tally = tally ?? new StagedTally(v);
    this.options.guidance = this.guidance;
    this.options.sequence = this.sequence;
    this.options.memo ??= { thetaTurn: null };
    // (the pilot is given the deck's own options, not a copy: the switches thrown after this are read every tick)
    const options = this.options;
    // (keys at `FINE` of full throw on the launch vehicle flown by hand, as the ballistic deck's; with Hold, they move the hold)
    options.hands = () => {
      const p = this.push(this.guidance || this.hold ? 1 : FINE);
      return this.guidance || this.hold ? { pitch: 0, yaw: 0, roll: p.roll } : p;
    };
    options.hold = () => (this.hold && !this.guidance ? this.holdAt : null);
    options.steps = () => this.asked.splice(0);
    const inner = stagedPilot(
      v,
      orbitalFlown(this.flight).ascent.solved,
      siteFrame(this.flight.site),
      this.frame,
      this.flight.site.seaLevel.value,
      options,
    );
    // (one pilot flies the whole flight, so the law's turn is the one it began)
    this.pilot = (st) => {
      if (this.guidance) {
        const p = this.push();
        const lean = (now: number, by: number) => Math.max(-TRIM_MOST, Math.min(TRIM_MOST, now + by * TRIM * TICK));
        this.trim = { pitch: lean(this.trim.pitch, p.pitch), yaw: lean(this.trim.yaw, p.yaw) };
      }
      options.trim = this.trim;
      if (this.hold && !this.guidance) {
        // the attitude held: where it is as Hold takes it, turned by the keys at `HOLD_TURN` about the body's own axes
        this.holdAt ??= turn(st.q, [1, 0, 0]);
        const p = this.push();
        const by = (x: number) => x * HOLD_TURN * TICK;
        if (p.pitch) this.holdAt = turn(aboutAxis(turn(st.q, [0, 1, 0]), by(p.pitch)), this.holdAt);
        if (p.yaw) this.holdAt = turn(aboutAxis(turn(st.q, [0, 0, 1]), by(p.yaw)), this.holdAt);
      } else this.holdAt = null;
      this.leverCuts(st);
      const c = inner(st);
      // (the lever on every stage, as KSP's one throttle: left out while it is full and has never moved, so the record's run is the same to the bit)
      return this.lever.at === 1 && !st.hand ? c : { ...c, lever: stagesOf(this.recordPlan).map(() => this.lever.at) };
    };
    // the run: the record's up to here, then this flight's
    const record = this.record!;
    const before = (record.samples as LiveSample[]).filter((x) => x.t < from - 1e-9);
    const sample = v.sample(s, this.centre);
    const stands = this.atSiteOf(() => v.start().q);
    const sheds = new Sheds(this.recordPlan, siteFrame(this.flight.site), this.flight.site.seaLevel.value, {
      frame: this.frame,
      site: stands.site,
      names: stands.names,
      floor: stands.under,
    });
    this.run = {
      ...record,
      samples: [...before, sample],
      duration: Infinity,
      cutoff: Infinity,
      dropped: this.flight.flies!.drops.map(() => Infinity),
      sheds,
      live: true,
      kept: true,
      descent: null,
      ...grown(this.recordPlan, s.craft),
      results: [],
    };
    this.kept = this.run.samples.length;
    this.heard = s.said.length;
    this.dropsFrom(s, from);
    this.host.fly(this.run);
  }

  /** On the pad, as flown: both switches on and the lever full. */
  private get recordOnPad(): boolean {
    return this.guidance && this.sequence && this.lever.at === 1;
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
      this.mine = this.recordOnPad ? null : 0;
      return;
    }
    if (t > this.parting || this.ascended) return;
    if (this.mine === null) {
      this.takeOver();
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
    this.leverCuts(s, v);
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

  /** The lever under a burning liquid stage's least: it is asked to be cut (once), whenever it is lit. */
  private leverCuts(s: StagedState, v = this.vehicleOf()): void {
    if (this.lever.at >= 1) return;
    stagesOf(this.recordPlan).forEach((st, i) => {
      const range = handRange(st.engine);
      if (!range || this.lever.at >= range.least - 1e-9 || !v.burning(s, i) || this.asked.some((k) => k.kind === 'cut' && k.stage === i))
        return;
      this.asked.push({ kind: 'cut', stage: i });
      this.cutByLever.add(i);
    });
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
        engines: this.burnName,
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
    const now = this.stagesAt(t);
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

  /**
   * When the record had a step and on what (plan.ts: its trigger), for a hand flying it: at its instant, or on reaching its
   * speed (space-fixed, or its integrator's), or on the record's orbit (the guidance's cut). From the plan, never written.
   */
  private whenIntended(next: { step: Step; at: number }): string {
    const at = `at ${missionTime(next.at)}`;
    if (next.step.kind !== 'cut') return at;
    const k = sequenceOf(this.recordPlan).stages[next.step.stage];
    if (k?.speed) return `${at}, on ${k.speed.value.toFixed(0)} m/s${k.speed.apparent ? ' on its integrator' : ''}`;
    const orbit = this.recordPlan.record?.orbit;
    if (k?.orbit && orbit)
      return `${at}, on the record’s orbit: ${(orbit.perigee.value / KM).toFixed(0)} by ${(orbit.apogee.value / KM).toFixed(0)} km`;
    return at;
  }

  /** The control the user has just taken over. */
  private say(): void {
    const manual = [
      this.guidance ? '' : 'Steer with the flight controls',
      this.sequence ? '' : 'Use the action button to advance flight events',
    ].filter(Boolean);
    this.host.say?.('Your flight', manual.join('. ') || 'Automatic steering and events have resumed on your current flight');
  }

  /** The instant each of `flies.drops` leaves on this flight, and its body put in the scene as it leaves. */
  private dropsFrom(s: StagedState, from = -Infinity): void {
    const run = this.run!;
    const plan = this.recordPlan;
    const record = this.record!;
    const seq = sequenceOf(plan);
    const stages = stagesOf(plan);
    this.flight.flies!.drops.forEach((d, i) => {
      if (Number.isFinite(run.dropped[i]!)) return;
      // (each by the plan's joint that lets it go, a drop's or a stage's; several bodies may leave by one joint, each after a
      // slash: the strap-ons' joint and each one's letter)
      const on = d.on?.split('/')[0];
      const drop = seq.drops.find((x) => x.joint === on);
      const stage = on ? seq.stages.findIndex((k) => k.joint === on) : -1;
      // (the record's, for what left before the flight was taken over)
      const at = drop ? (s.drops[drop.joint] ?? Infinity) : stage >= 0 ? s.stages[stage]!.gone : Infinity;
      const was = record.dropped[i]!;
      const when = was < from ? was : at;
      if (!Number.isFinite(when)) return;
      run.dropped[i] = when;
      const def = plan.craft[0]!.sheds?.find((x) => x.on === d.on);
      if (!def) return;
      if (when < from) {
        const previous = record.sheds?.get(def.on);
        if (previous) run.sheds?.add(previous.shedder.release);
        return;
      }
      // a strap-on let go while its stage still burns swings out on what it was burning at, not on the tail-off
      const burning = stage >= 0 && s.stages[stage]!.to > when ? stages[stage]! : null;
      const unit = burning ? burning.engine.thrust.vacuum.value * (burning.throttle ? along(burning.throttle, when) : 1) : undefined;
      const finalStage = s.parted && when === s.parted.t && stage === stages.length - 1;
      const samples = finalStage ? [{ ...this.vehicleOf().sample(s, this.centre), v: s.parted!.v }] : (run.samples as LiveSample[]);
      // (a stage's own body leaves with what it had not burned, whenever that is: the record's leftover is the record's)
      const mass = finalStage
        ? s.parted!.stageMass
        : stage >= 0 && this.ownBody(d, stage)
          ? this.vehicleOf().unitMass(s, stage, when)
          : undefined;
      const release = orbitalRelease(plan, def, samples, when, unit, mass);
      if (release) run.sheds?.add(release);
    });
  }

  /** Whether a drop is stage `i`'s own body (each of its nodes the body's): it leaves with what that stage had not burned. */
  private ownBody(drop: { nodes: readonly string[] }, i: number): boolean {
    const nodes = stagesOf(this.recordPlan)[i]?.body.nodes ?? [];
    return drop.nodes.length > 0 && drop.nodes.every((n) => nodes.includes(n));
  }

  /** A digit on the lock: the code in order frees the hand controls, once the spacecraft is alone in orbit. */
  private digit(d: string): void {
    const code = String(this.recordPlan.record?.manual?.code?.value ?? '');
    if (!code || this.free || this.padImpact) return;
    const alone = this.clock.t > this.parting;
    this.typed = (this.typed + d).slice(-code.length);
    if (this.typed !== code) return void this.show();
    if (!alone) {
      this.host.say?.('Hand controls', 'Not on the launch vehicle: there were none to free');
      this.typed = '';
      return void this.show();
    }
    if (this.mine === null && this.clock.t >= coastOf(this.recordPlan).on) {
      this.host.say?.('Hand controls', 'The braking burn has been made: the descent is the automatic system’s');
      return;
    }
    this.freeHands(
      `Manual descent: not the flight of ${this.day}. Steer with the flight controls and use the action button to fire the ${this.burnName.toLowerCase()}`,
    );
  }

  /** The hand controls free: the timer's burn given up, the attitude the hand's from this instant (and the flight flown again without that burn). */
  private freeHands(why: string | null): void {
    const t = this.clock.t;
    if (this.manualJetsGone(t)) {
      this.host.say?.('No attitude jets', 'The instrument module carried the attitude jets away.');
      return;
    }
    this.free = true;
    this.takeOrbitAt(t);
    if (this.handover) this.planned ??= this.givenUp();
    const [a, b, k] = either(this.run!.samples as LiveSample[], t);
    const attitude = attitudeBetween(a, b, k);
    const drift = this.encounters?.contacts.rotation?.(t);
    const q = drift ? multiply(attitude, conjugate(drift.delta)) : attitude;
    this.hand = { q, t, log: [{ t, q }] };
    if (why !== null) this.refly();
    else this.drawHands();
    // (the timer's burn given up: nothing of the descent happens until a hand fires the engine)
    for (const id of descentRecords(this.recordPlan)) this.times[id] = Infinity;
    if (why) this.host.say?.('Hand controls free', why);
    this.show();
  }

  /** The coast and what follows on this flight with `plan`: from where the user's ascent left the spacecraft, or the record's whole flight. */
  private encounters: ReturnType<typeof coastContacts> | null = null;
  private nextImpact = 0;

  private takeOrbitAt(t: number): void {
    const plan = this.recordPlan;
    if (this.mine !== null || this.handover || !plan.record?.coastFixes?.length) return;
    const coast = orbitalFlown(this.flight).coast.samples;
    if (t < coast[0]!.t || t >= coast.at(-1)!.t) return;
    this.handover = { t, ...between(coast, t) };
    this.priorMoves = shipOf(plan).moves.filter((move) => move.on <= t).length;
  }

  private whole(plan: FlightPlan, hands?: DescentHands): FlownWhole {
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

  private coastDrops(plan: FlightPlan, whole: FlownWhole): number[] {
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
  private heldOf(): Record<string, number> | undefined {
    if (!this.flown) return undefined;
    const all = held(this.recordPlan, this.flown).slice(this.mine !== null ? 0 : this.ascentChecks);
    return Object.fromEntries(all.map((c) => [c.id, c.got]));
  }

  /** The bodies down from the ejection on this flight as flown now, for the scene to carry what came down on each. */
  private descentOf(): DrawnDescent | null {
    return this.flown ? descentOf(this.flown, this.centre, this.recordPlan.record?.ground?.value) : null;
  }

  /** The spacecraft's centre of mass above the flown model's origin, m (`PlanRecord.centre`, from the stack's datum). */
  private get centre(): number {
    return (this.flight.flies?.datum ?? 0) + (this.recordPlan.record?.centre?.value ?? 0);
  }
  /** How many of the plan's checks are its ascent's: the first of `held`'s. */
  private get ascentChecks(): number {
    return this.recordPlan.checks.filter((c) => c.of === 'ascent').length;
  }

  /** Samples the scene can show of a whole flight from `plan`: the user's ascent's own, then the coast's. */
  private samplesOf(plan: FlightPlan, whole: FlownWhole): LiveSample[] {
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
      stops: stagesOf(this.recordPlan).map((_, i) => Math.min(s.stages[i]!.to, v.dry(i, s.stages[i]!.from, s), s.stages[i]!.gone)),
      left: v.left(s),
      separation: s.parted!,
      parted: { kept: tally.summary.massLeft, gone: s.parted!.stageMass },
      plane: v.plane,
      thetaTurn: this.options.memo?.thetaTurn ?? orbitalFlown(this.flight).ascent.thetaTurn,
    };
    const abortSequence = this.aborted?.mode.escape?.separate;
    const translation = abortSequence?.motor;
    const service = abortSequence?.service;
    const from = s.parted!;
    const solved = service
      ? withServiceAbort(this.recordPlan, service, from, at.axis, this.frame, siteFrame(this.flight.site), this.flight.site.seaLevel.value)
      : null;
    const plan =
      solved?.plan ??
      (translation
        ? withEscapeTranslation(this.recordPlan, translation.engine, from.t, translation.duration.value, at.axis)
        : this.givenUp());
    if (translation || service) {
      this.planned = plan;
      this.partedBy = service?.goal.kind === 'orbit' ? null : shipOf(plan).parted;
    }
    this.flown = this.whole(plan);
    const samples = this.samplesOf(plan, this.flown);
    const abortEvents = this.aborted
      ? shipOf(plan).moves.flatMap((move) => [
          { event: move.lit, t: move.on },
          { event: move.cut, t: move.off },
        ])
      : [];
    this.encounters!.finish(samples, this.coastDrops(plan, this.flown));
    this.run = {
      ...this.run!,
      sheds: this.encounters!.sheds,
      dropped: this.coastDrops(plan, this.flown),
      samples,
      duration: samples[samples.length - 1]!.t,
      descent: this.descentOf(),
      events: [...this.run!.events, ...abortEvents].sort((a, b) => a.t - b.t),
      fires: this.fires(),
      held: this.heldOf(),
    };
    this.dropsFrom(s);
    this.times = orbitalEvents(this.flight, this.flown);
    this.freeHands(null);
    const el = elementsOf(s.parted!.r, s.parted!.v);
    const perigee = (el.a * (1 - el.e) - heightsBall(this.recordPlan, siteFrame(this.flight.site))) / KM;
    if (!solved)
      this.host.say?.(
        'Spacecraft parted',
        perigee > 100
          ? `In an orbit of your own: perigee ${perigee.toFixed(0)} km. Use the action button to fire the braking burn`
          : `Short of an orbit: perigee ${perigee.toFixed(0)} km. It comes down`,
      );
    if (solved && service) {
      const orbit = service.goal.kind === 'orbit';
      const reached = orbit
        ? solved.achieved >= service.goal.target.value - ORBIT_SLACK
        : Math.abs(solved.achieved - service.goal.target.value) < 1852;
      const reading = Number.isFinite(solved.achieved) ? `${(solved.achieved / KM).toFixed(0)} km` : 'outside this trajectory’s reach';
      const firing = solved.duration > 0 ? `SPS firing ${solved.duration.toFixed(1)} s` : 'Already at the contingency orbit';
      this.host.say?.(
        orbit ? 'Abort to orbit' : 'Direct entry abort',
        `${firing} · ${orbit ? 'perigee' : 'recovery range'} ${reading}${reached ? '' : ' · target outside the model’s available burn range'}`,
      );
    }
    if (this.flown.down) floatUprighting(this.flight, this.run, Infinity);
    this.host.fly(this.run);
    // This escape mode calls for a separate entry. Describe the sequence given for this flight.
    if (abortSequence?.entry && !translation && !service) {
      this.partedBy = s.parted!.t;
      this.refly();
      if (this.aborted) this.host.say?.('Abort', this.aborted.mode.does);
    }
  }

  /** Fire the braking engine by hand along the long axis as it points: the rest of the flight flown again from it. */
  private fire(t: number): void {
    const deltaV = this.recordPlan.record?.manual && coastEvents(this.recordPlan).burn?.deltaV;
    if (!deltaV || this.parts <= t) return;
    this.turnTo(t);
    // the long axis, in the flight's frame
    const aim = this.handAxis(t);
    const plan = byHand(this.planned ?? this.recordPlan, t, aim);
    const burn = shipOf(plan).off - t;
    this.planned = plan;
    this.fired = t;
    this.refly();
    this.host.say?.(this.burnName, `Fired by hand: ${burn.toFixed(0)} s to ${deltaV.value} m/s`);
  }

  /**
   * The record's next manoeuvre a hand that is free can fire now, or null: the hands free, nothing burning from the last,
   * the coast's burn not yet fired, and the thrusters still aboard (their body not let go by the clock on the flight as it
   * stands).
   */
  private nextMove(): Move | null {
    if (!this.free || this.hand === null || this.fired !== null || this.aborted) return null;
    const plan = this.recordPlan;
    const index = this.priorMoves + this.moved.length;
    const m = shipOf(plan).moves[index];
    if (!m) return null;
    const t = this.clock.t;
    const last = this.moved.at(-1);
    const previous = shipOf(plan).moves[index - 1];
    if (previous && t < (last === undefined ? previous.off : last + previous.off - previous.on)) return null;
    const base = this.planned ?? this.givenUp();
    const engine = plan.craft[0]!.engines.find((e) => e.id === m.engine)!;
    const resources = coastEngineState(base, engine.id, t);
    if (engine.tanks.length && (resources.starts <= 0 || resources.kg <= 0)) return null;
    const body = engine.body;
    const joint = plan.craft[0]!.joints.find((j) => j.gone.includes(body));
    const parting = joint && base.events.find((e) => e.do.some((a) => 'separate' in a && a.separate === joint.id));
    if (parting && clockAt(base, parting) <= t) return null;
    return m;
  }

  /** The record's next manoeuvre fired by hand now, along the long axis as the hand holds it, its impulse and length the record's. */
  private move(t: number): void {
    const m = this.nextMove();
    if (!m) return;
    this.turnTo(t);
    const axis = this.handAxis(t);
    this.planned = movedTo(this.recordPlan, this.planned ?? this.givenUp(), this.priorMoves + this.moved.length, t, axis);
    this.moved.push(t);
    this.refly();
    this.host.say?.(
      m.label,
      `Fired by hand: ${(m.off - m.on).toFixed(0)} s, ${(m.accel * (m.off - m.on)).toFixed(1)} m/s ${m.accel < 0 ? 'toward the tail' : 'toward the nose'}`,
    );
  }

  /** Why the braking engine cannot be fired now by a hand that is free, or null: it went with the instrument module, or he has left. */
  private retroWhy(): string | null {
    const t = this.clock.t;
    if (this.aborted && this.planned && shipOf(this.planned).moves.some((move) => t < move.off))
      return 'The abort propulsion sequence is in progress';
    if (this.handover && this.handover.t >= coastOf(this.recordPlan).on) return 'The deorbit firing has already started';
    const plan = this.planned ?? (this.free ? this.givenUp() : this.recordPlan);
    const engine = coastEvents(plan).burn;
    if (engine?.tanks.length) {
      const state = coastEngineState(plan, engine.id, t);
      if (state.starts <= 0) return 'No engine starts left';
      if (state.kg <= 0) return 'The propulsion tanks are empty';
    }
    if (this.parts <= t) return 'Gone with the instrument module: the modules have parted';
    const down = this.flown?.down;
    if (down && down.ejected <= t && this.recordPlan.craft[0]!.crew?.alone)
      return `${crewWords(this.recordPlan.craft[0]!.crew).who} has left the ship`;
    return null;
  }

  /**
   * The record as this flight now has it (its braking burn: the timer's, a hand's, or none), and what the hands gave in the
   * descent: the modules part when a hand parted them, or when the sequence would (the timer after a burn, or the record's
   * instant) if it was on then, or never.
   */
  private descentPlan(): { plan: FlightPlan; hands: DescentHands } {
    const base = this.planned ?? (this.free || this.mine !== null ? this.givenUp() : this.recordPlan);
    return { plan: partingAt(base, this.parts), hands: { given: this.given, switched: this.switched } };
  }

  /** When the modules part on the flight as it now stands, s from liftoff (`descentPlan`), or never (the largest safe integer). */
  private get parts(): number {
    const base = this.planned ?? (this.free || this.mine !== null ? null : this.recordPlan);
    const auto = base ? shipOf(base).parted : Number.MAX_SAFE_INTEGER;
    return this.partedBy ?? (automatic({ given: {}, switched: this.switched }, auto) ? auto : Number.MAX_SAFE_INTEGER);
  }

  /**
   * The flight flown again from where the spacecraft parted with all that the hands have given (the burn, the descent's
   * events), and the run on show made from it: its samples (after a burn by hand, the hand's attitude), what leaves when,
   * the events the cabin's lamps read, the checks.
   */
  private handSamples(samples: LiveSample[], ship: ReturnType<typeof shipOf>) {
    const t = this.fired;
    const parts = ship.parted;
    if (this.hand && (t !== null || this.free)) {
      // as the hand turned it, to the burn's end; then as the hand left it, until the modules part; passive spheres follow the entry load, other craft turn
      // over half a minute toward the airflow (staged.ts recordSamples)
      const log = this.hand.log;
      const left = log.at(-1)!.q;
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

  private refly(): void {
    const { plan, hands } = this.descentPlan();
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
  private order: { id: string; at: number }[] | null = null;
  private descentOrder(): { id: string; at: number }[] {
    if (this.order) return this.order;
    const plan = this.recordPlan;
    const d = downOf(plan);
    const parting = coastEvents(plan).parting;
    const down = orbitalFlown(this.flight).down;
    if (!d || !parting) return [];
    this.order = [
      { id: parting.id, at: parting.at?.value ?? clockAt(plan, parting) },
      { id: d.ejection, at: down?.ejected ?? Number.POSITIVE_INFINITY },
      ...d.bodies.flatMap((b) => b.chutes.map((c) => ({ id: c.event, at: down?.opened[b.id]?.[c.name] ?? Number.POSITIVE_INFINITY }))),
    ]
      // (the event that sets what comes down loose can be a parachute's own: a Mercury capsule's drogue)
      .filter((e, i, all) => all.findIndex((x) => x.id === e.id) === i)
      .sort((p, q) => p.at - q.at);
    return this.order;
  }

  /** The next event of the descent a hand can give now, with what Space says for it. */
  private nextDescent(): { id: string; label: string } | null {
    const next = this.descentOrder().find((e) => this.descentWhy(e.id) === null);
    return next ? { id: next.id, label: this.descentLabel(next.id) } : null;
  }

  /** What an event of the descent is called on the deck. */
  private descentLabel(id: string): string {
    const plan = this.recordPlan;
    const asked = eventOf(plan, id)?.asked;
    if (asked) return asked;
    if (id === coastOf(plan).parting) return 'Part the modules';
    if (id === coastOf(plan).loose) return 'Eject';
    const { body, chute: c } = this.chuteOf(id);
    if (c?.replaces?.leaves) return `Leave ${c.replaces.leaves.label.replace(/^The /, 'the ')}`;
    const name = c?.name ?? id;
    const whose = body?.id === plan.craft[0]!.crew?.alone ? '' : 'Module’s ';
    return `${whose}${whose ? name : name[0]!.toUpperCase() + name.slice(1)}`;
  }

  /** The body of the descent and the parachute an event of it puts out (sim/descent.ts `DownChute.event`), if it puts one out. */
  private chuteOf(id: string): { body?: DownBody; chute?: DownChute } {
    for (const body of downOf(this.recordPlan)?.bodies ?? []) {
      const chute = body.chutes.find((c) => c.event === id);
      if (chute) return { body, chute };
    }
    return {};
  }

  /** Whether a braking burn is still to come or burning on the flight on show at `t`: the timer's on the record's, or a hand's. */
  private burnPending(t: number): boolean {
    if (this.fired !== null) return t < shipOf(this.planned!).off;
    if (this.free || this.mine !== null) return false;
    return t < coastOf(this.recordPlan).off;
  }

  /**
   * Why event `id` of the descent (the modules' parting, the pilot set loose, a parachute put out: the plan's events) cannot
   * be given now on the flight on show, or null if it can: the spacecraft alone; for all but the parting, no braking burn
   * still to come; the body it belongs to loose and not down; the event not yet happened.
   */
  private descentWhy(id: string): string | null {
    const plan = this.recordPlan;
    const d = downOf(plan);
    if (!d) return 'This flight’s record has no descent';
    const t = this.clock.t;
    if (!(t > this.parting)) return 'Not on the launch vehicle';
    const whole = this.flown ?? orbitalFlown(this.flight);
    const down = whole.down;
    const first = d.bodies[0]!.id;
    const landed = (body: string) => down?.landed[body]?.at ?? Number.POSITIVE_INFINITY;
    const parting = id === coastOf(plan).parting;
    const { body: b, chute } = this.chuteOf(id);
    if (t >= landed(first) && (parting || id === d.ejection || b?.id === first)) return 'Down';
    if (parting) return this.parts <= t ? 'Parted already' : null;
    if (this.burnPending(t)) return 'The braking burn is still to come: the descent follows it';
    if (id === d.ejection && !chute)
      return (down?.ejected ?? Number.NaN) <= t
        ? plan.craft[0]!.crew?.alone === undefined
          ? 'Done already'
          : `${crewWords(plan.craft[0]!.crew).who} has left the ship already`
        : null;
    if (!b || !chute) return 'No such parachute';
    const i = b.chutes.indexOf(chute);
    const body = b.id;
    const name = chute.name;
    const began = body === first ? Number.NEGATIVE_INFINITY : (down?.tracks[body]?.[0]?.t ?? Number.POSITIVE_INFINITY);
    if (!(t >= began))
      return body === plan.craft[0]!.crew?.alone
        ? `${crewWords(plan.craft[0]!.crew).who} is still in the ship: eject first`
        : 'Still on the ship';
    if (t >= landed(body)) return 'Down';
    if ((down?.opened[body]?.[name] ?? Number.POSITIVE_INFINITY) <= t) return 'Out already';
    const j = b.chutes.findIndex((c) => c.replaces?.leaves);
    if (j >= 0 && i < j && (down?.opened[body]?.[b.chutes[j]!.name] ?? Number.POSITIVE_INFINITY) <= t)
      return `It stayed with ${b.chutes[j]!.replaces!.leaves!.label.replace(/^The /, 'the ')}`;
    return null;
  }

  /**
   * Whether event `id` of the descent would have come by now, by the automatic sequence's own trigger: the modules at the
   * sequence's instant, the ejection and a parachute at their heights (the body's own), or a time after the ejection.
   */
  private descentDue(id: string, t: number): boolean {
    const plan = this.recordPlan;
    const d = downOf(plan)!;
    const down = this.flown?.down;
    if (id === coastOf(plan).parting) return t >= shipOf(this.planned ?? plan).parted;
    const first = d.bodies[0]!.id;
    const { body: b, chute: c } = this.chuteOf(id);
    const body = id === d.ejection ? first : b?.id;
    // the body's height now: its track's, or the run's own sample's for the entry body
    let h = this.sampleAt(t).altitude;
    const track = body ? down?.tracks[body] : undefined;
    if (body !== first && track?.length) {
      const p = track.find((x) => x.t >= t) ?? track[track.length - 1]!;
      h = this.frame.place(p.r, p.t).height - this.flight.site.seaLevel.value;
    }
    if (id === d.ejection) return h <= d.floor;
    if (!c) return false;
    if (c.altitude !== undefined) return h <= c.altitude;
    return c.after !== undefined && down !== null && down !== undefined && t - down.ejected >= c.after;
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
    if (id === coastOf(this.recordPlan).parting) this.partedBy = t;
    else this.given[id] = t;
    this.refly();
    this.host.say?.(
      this.descentLabel(id),
      `${this.consequence(id, t)}${taken ? ` Not the flight of ${this.day}: ${this.recordPlan.record?.automatic ?? 'it was automatic'}.` : ''}`,
    );
    if (!this.clock.running) this.clock.play(true);
  }

  /** What came of an event given at `t`, at once: where it was, and a parachute torn as it came out. */
  private consequence(id: string, t: number): string {
    const down = this.flown?.down;
    const s = this.sampleAt(t);
    const where = `${(Math.max(0, s.altitude) / KM).toFixed(1)} km up at ${s.groundSpeed.toFixed(0)} m/s through the air`;
    const coast = coastOf(this.recordPlan);
    if (id === coast.parting) return `Parted ${where}.`;
    if (id === coast.loose && !this.chuteOf(id).chute) return `Hatch No. 1 off and the seat out ${where}, ${(s.q / 1000).toFixed(1)} kPa.`;
    const { body, chute } = this.chuteOf(id);
    if (chute?.stays) return 'Given: it stayed in its container.';
    const tore = body && chute ? down?.torn[body.id]?.[chute.name] : undefined;
    if (tore?.by === 'fouled') return `Out, in the shadow of the ${chute?.fouls?.by.join(' and ')}: it streams and does not fill.`;
    if (tore && Math.abs(tore.t - t) < 1e-6) return `Out, and torn at once: ${(tore.q / 1000).toFixed(1)} kPa on its cloth.`;
    return tore ? `Out; it tears at ${this.wall(tore.t)}.` : 'Out.';
  }

  /** B with the spacecraft alone and no burn to come: the descent's automatic sequence off, or on again, from the clock's instant. */
  private switchDescent(): void {
    const t = this.clock.t;
    const on = !automatic({ given: {}, switched: this.switched }, t);
    if (this.recorded) {
      this.downMine = t;
      this.takeOrbitAt(t);
    }
    this.switched = [...this.switched.filter((s) => s.t < t), { t, on }];
    this.refly();
    this.host.say?.(
      'Sequencer',
      on
        ? 'On: the timer and the barometric switches act again'
        : `Off: nothing in the descent happens but what you give using the action button. ${this.recordPlan.record?.automatic ?? ''}`,
    );
  }

  /**
   * When each of `flies.fires` burns on this flight, in their order: a stage's from its lighting to its stop (the record's run's,
   * or the user's vehicle's), the coast's burn between `retro`'s instants (none until a hand fires it, once the hands are free).
   */
  private fires(retro: { on: number; off: number } = { on: Infinity, off: Infinity }): { from: number; to: number }[] {
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

  /**
   * The record's own periods of flying by hand (`manual.periods`: Titov's, by plan, with the lock's code given him). Within
   * one, as flown, the hands have the attitude without the lock, and the flight stays the record's (the timer's burn is
   * kept: nothing a hand turns changes the coast). Out of it the lock is shut again, and what the hands left is held until
   * the automatic orientation turns the ship to its burn over a minute, as the record's own drawing turns it
   * (staged.ts `recordSamples`). Only the attitude is drawn: no jets, no gas.
   */
  private planHands(t: number): void {
    const plan = this.recordPlan;
    const periods = plan.record?.manual?.periods ?? [];
    if (!periods.length || !this.run) return;
    const i = periods.findIndex((p) => t >= p.from.value && t < p.to.value);
    const now = i >= 0 ? i : null;
    if (now !== this.byPlan) {
      if (now !== null) {
        this.planBase ??= this.run.samples as readonly LiveSample[];
        const s = this.sampleAt(t);
        this.hand = { q: s.attitude, t, log: [{ t, q: s.attitude }] };
        this.host.say?.(
          'By hand, as flown',
          `${periods[now]!.what}: the flight controls steer the ship until ${this.wall(periods[now]!.to.value)}`,
        );
      } else if (this.byPlan !== null)
        this.host.say?.('Hands off, as flown', `The hand controller off at ${this.wall(periods[this.byPlan]!.to.value)}`);
      this.byPlan = now;
    }
    if (this.byPlan === null || !this.hand || !this.planBase) return;
    this.turnTo(t);
    const from = this.hand.log[0]!.t;
    const q = this.hand.q;
    // (turned to the burn's aim where the plan turns it, where that comes before the burn; else a minute before: as staged.ts recordSamples)
    const ship = shipOf(plan);
    const turned = clockAt(
      plan,
      plan.events.find((e) => e.automatic && e.do.some((a) => 'attitude' in a && a.attitude === ship.aimId)),
    );
    const oriented = turned < ship.on ? turned : ship.on - 60;
    // (the hands' attitude from where they took it until the automatic orientation, then turned over a minute to the record's)
    const samples = this.planBase.map((x) => {
      if (x.t < from) return x;
      const k = x.t < oriented ? 0 : Math.min(1, (x.t - oriented) / 60);
      if (k >= 1) return x;
      const sign = q[0] * x.attitude[0] + q[1] * x.attitude[1] + q[2] * x.attitude[2] + q[3] * x.attitude[3] < 0 ? -1 : 1;
      const a = normalize([0, 1, 2, 3].map((j) => q[j]! + (sign * x.attitude[j]! - q[j]!) * k) as unknown as Quat);
      return { ...x, attitude: a, axis: turn(a, [1, 0, 0]) };
    });
    this.run = { ...this.run, samples };
    this.host.fly(this.run);
  }

  private drawHands(): void {
    const run = this.run!;
    const samples = (run.samples as LiveSample[]).map((s) => ({ ...s }));
    this.handSamples(samples, shipOf(this.planned ?? this.recordPlan));
    this.run = { ...run, samples, fires: this.fires() };
    this.host.fly(this.run);
  }

  private handAxis(t: number): Vec3 {
    const drift = this.encounters?.contacts.rotation?.(t);
    return turn(drift ? multiply(this.hand!.q, drift.delta) : this.hand!.q, [1, 0, 0]);
  }

  private manualJetsGone(t: number): boolean {
    if (t < this.parts) return false;
    const craft = this.recordPlan.craft[0]!;
    const jets = craft.thrusters.find((set) => set.mode === 'manual' && set.rate);
    const brake = craft.engines.find((e) => e.flown);
    return !!jets && !!brake && craft.joints.some((joint) => joint.gone.includes(brake.body) && joint.gone.includes(jets.body));
  }

  /** Turn the hand's attitude on to `t` by the keys held and the finger's stick. */
  private turnTo(t: number): void {
    const h = this.hand;
    if (!h || this.fired !== null) return;
    const until = this.manualJetsGone(t) ? this.parts : t;
    const from = h.t;
    const dt = until - from;
    h.t = t;
    const push = this.push();
    const steering = dt > 0 && (push.pitch !== 0 || push.yaw !== 0 || push.roll !== 0) && until >= h.log[0]!.t;
    if (t < from || h.log.at(-1)!.t > from) {
      // Browsing the tape preserves every recorded turn. A new command branches where the stick was taken.
      const at = steering ? from : until;
      let i = h.log.length - 1;
      while (i > 0 && h.log[i]!.t > at) i--;
      h.q = h.log[i]!.q;
      if (steering) h.log.length = i + 1;
    }
    // (the hand controller's rate: the thruster set worked by hand; a craft with none, an uncrewed target, is not turned by
    // the keys at all, where it threw and stopped the deck)
    const manual = this.recordPlan.craft[0]!.thrusters.find((x) => x.mode === 'manual' && x.rate);
    if (!steering || !manual) return;
    const rate = manual.rate!.value * DEG;
    let q = h.q;
    q = normalize(multiply(q, aboutAxis(KEYS.w![0], push.pitch * rate * dt)));
    q = normalize(multiply(q, aboutAxis(KEYS.a![0], push.yaw * rate * dt)));
    q = normalize(multiply(q, aboutAxis(KEYS.e![0], push.roll * rate * dt)));
    h.q = q;
    h.log.push({ t: until, q });
  }

  /** Which way the hands push, each -1 to 1: the keys held, and the finger's stick and roll laid over them. */
  private push(fine = 1): { pitch: number; yaw: number; roll: number } {
    const axis = (plus: string, minus: string, finger: number) =>
      Math.max(-1, Math.min(1, fine * (Number(this.held.has(plus)) - Number(this.held.has(minus))) + finger));
    return { pitch: axis('w', 's', this.finger.pitch), yaw: axis('a', 'd', this.finger.yaw), roll: axis('e', 'q', this.finger.roll) };
  }

  private sampleAt(t: number): LiveSample {
    const samples = this.run!.samples as readonly LiveSample[];
    const [a, b, fraction] = either(samples, t);
    if (fraction === 0) return a;
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
    if (!this.free && this.mine === null && this.fired === null && this.downMine === null) this.planHands(t);
    if (this.free && this.fired === null && this.hand) {
      const logged = this.hand.log.at(-1);
      this.turnTo(t);
      if (logged !== this.hand.log.at(-1)) this.drawHands();
    }
    if (t > this.over() + 12) {
      this.clock.pause();
      this.clock.seek(this.over() + 12);
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
    this.clock.hold(on ? due([...run.events.map((e) => e.t), ...Object.values(this.times), run.duration], t) : Number.NaN);
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
      if (t > this.over() + 12) {
        this.clock.pause();
        this.clock.seek(this.over() + 12);
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
          this.eject(at);
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
      if (release) this.dropsFrom(s);
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
    this.dropsFrom(s);
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
    if (s.parted) return void this.parted(s);
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

  /** What came of a burn by hand: where the pilot came down against the record's landing, or that it stays up. */
  private outcome(t: number): string {
    if (this.padImpact && t >= this.padImpact.t) return 'Escape ended in a strike on the launch structure';
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
    // (or the crew ejected from the launch vehicle, and the stack: the later of their ends)
    const landings = Object.values((this.ejected ?? whole)?.down?.landed ?? {}).map((l) => l.at);
    return Math.max(run.duration, run.afloat?.samples.at(-1)?.t ?? 0, ...landings);
  }

  private apart(
    at: { latitude: number; longitude: number },
    landing: { latitude: { value: number }; longitude: { value: number } } = this.recordPlan.record!.landing!,
  ): number {
    const [la, lo] = [landing.latitude.value * DEG, landing.longitude.value * DEG];
    const [pa, po] = [at.latitude * DEG, at.longitude * DEG];
    return (EARTH_SPHERE / KM) * Math.acos(Math.min(1, Math.sin(la) * Math.sin(pa) + Math.cos(la) * Math.cos(pa) * Math.cos(po - lo)));
  }
  /** A time of the flight as a clock on the wall read it that day. */
  private wall(at: number): string {
    // (an instant that never comes: a target's braking burn, which it has none of)
    if (!Number.isFinite(at)) return 'never';
    const local = (t: number) => new Date(Date.parse(this.flight.launch) + t * 1000 + this.flight.site.zone.utcOffset * 3600_000);
    const when = local(at);
    // (on a flight that runs past midnight, a time on another day than the launch's says which)
    const day =
      when.toISOString().slice(0, 10) === local(0).toISOString().slice(0, 10)
        ? ''
        : ` on ${when.getUTCDate()} ${MONTHS[when.getUTCMonth()]}`;
    return when.toISOString().slice(11, 19) + day;
  }

  /** What each stage has left at `t` (all its units), and whether it is aboard and burning: the user's vehicle's, or the record's run's. */
  private stagesAt(t: number): { left: number; full: number; aboard: boolean; burning: boolean }[] {
    const plan = this.recordPlan;
    const stages = stagesOf(plan);
    if (this.state && this.mine !== null && t >= this.mine) {
      const v = this.vehicleOf();
      const s = this.state;
      const left = v.left(s);
      return stages.map((st, i) => ({
        left: left[i]!,
        full: st.shares.length > 1 ? st.holder.count * st.load : st.count * st.load,
        aboard: !Number.isFinite(s.stages[i]!.gone) && !s.parted,
        burning: v.burning(s, i) && !s.parted,
      }));
    }
    const stops = orbitalFlown(this.flight).ascent.stops;
    const staged = recordStages(plan, stops);
    /** What one of them has burned by `t`, all its units. */
    const burnedBy = (j: number) => {
      const from = staged[j]!.from;
      return stages[j]!.count * flowOf(stages[j]!.engine) * integral(stages[j]!.drawn, from, Math.max(from, Math.min(t, stops[j]!)));
    };
    return stages.map((s, i) => {
      // (a tank several stages draw on, an Atlas's: what is left in it, drawn by all of them)
      const shared = s.shares.length > 1;
      const full = shared ? s.holder.count * s.load : s.count * s.load;
      const from = staged[i]!.from;
      const burned = shared ? s.shares.reduce((sum, j) => sum + burnedBy(j), 0) : burnedBy(i);
      const sep = staged[i]!.sep;
      return { left: Math.max(0, full - burned), full, aboard: t < sep, burning: t > 0 && t >= from && t < stops[i]! };
    });
  }

  private show(): void {
    if (!this.run) return;
    const plan = this.recordPlan;
    const record = plan.record!;
    const coast = coastOf(plan);
    const live = this.state && this.pilot && !this.ascended ? this.state : null;
    const t = Math.max(0, live ? Math.min(this.clock.t, live.t) : this.clock.t);
    const s = this.sampleAt(t);
    const hands = !this.manualJetsGone(t) && (this.free || this.byPlan !== null || (this.mine !== null && !this.ascended));
    const pushed = hands && this.fired === null ? this.push() : { pitch: 0, yaw: 0, roll: 0 };
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
    this.figures(alone ? ORBITING : high ? CLIMBING : RISING);
    set('altitude', down ? '0.00' : (Math.max(0, s.altitude) / KM).toFixed(s.altitude < 99_950 ? 2 : 1));
    set('speed', (alone || high ? s.speed : t > 0 && !down ? s.groundSpeed : 0).toFixed(0));
    set('climb', (t > 0 && !down ? s.groundSpeed * Math.sin(s.groundClimb * DEG) : 0).toFixed(0));
    set('g', t > 0 && !down ? s.g.toFixed(2) : '1.00'); // (on the pad it stands on the launch system, and on the ground: one g)
    set('mach', down ? '0.00' : s.mach.toFixed(2));
    set('apogee', orbit ? ((el.a * (1 + el.e) - ball) / KM).toFixed(0) : '—');
    set('perigee', orbit ? ((el.a * (1 - el.e) - ball) / KM).toFixed(0) : '—');
    set('period', orbit && el.a > ball ? (period(el.a) / 60).toFixed(1) : '—');
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
    const thrust = s.burning.reduce((sum, m) => sum + m.thrust, 0);
    // (the timer's command for the burn, where the plan has one, or its lighting)
    const burnEvents = coastEvents(plan);
    const command = clockAt(plan, burnEvents.command ?? burnEvents.on);
    const onDay = this.burnByHand;
    set(
      'retro',
      this.fired !== null
        ? `By hand, ${this.wall(this.fired)}`
        : this.free
          ? 'Yours to fire'
          : !burnEvents.burn
            ? 'None aboard'
            : this.mine === null
              ? `${onDay ? 'By hand on the day' : 'Timer'}, ${this.wall(command)}`
              : 'Yours, once parted',
    );
    set('lock', this.free ? 'Free' : this.byPlan !== null ? 'Open, by plan' : 'Locked');
    for (const lamp of this.root.querySelectorAll<HTMLElement>('[data-digit]'))
      lamp.classList.toggle('on', this.free || Number(lamp.dataset.digit) < this.typed.length);
    // (what burns by name, the coast's burn by the plan's: nothing on the pad, where the record's first sample already has the stages' thrust)
    const named = burning.length ? burning.join(' + ') : braking ? this.burnName : null;
    set('motors', named && t > 0 && thrust > 0 ? `${named} ${(thrust / 1000).toFixed(0)} kN` : '–');
    // (the run as flown, and the instant its coast hands over to the descent: from there it comes down on its own bodies)
    const whole = this.flown ?? orbitalFlown(this.flight);
    const handed = whole.down ? whole.coast.samples[whole.coast.samples.length - 1]!.t : Number.POSITIVE_INFINITY;
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
    guidance.setAttribute('aria-pressed', String(this.guidance && !this.free));
    guidance.disabled = Boolean(this.padImpact);
    // (alone, with no burn to come, the sequencer is the descent's automatic sequence)
    const descending = alone && !this.burnPending(t);
    const auto = automatic({ given: {}, switched: this.switched }, t);
    const sequence = this.root.querySelector<HTMLButtonElement>('[data-do=sequence]')!;
    sequence.setAttribute('aria-pressed', String(descending ? auto : this.sequence && !this.free));
    this.root.querySelector('[data-do=hold]')?.setAttribute('aria-pressed', String(this.hold));
    sequence.disabled = Boolean(this.padImpact);
    const waiting = t <= 0 && !this.clock.running;
    const replay = live !== null && this.clock.t < live.t - TICK;
    const step = !waiting && !alone && !this.ascended ? this.nextStep() : null;
    const move = this.nextMove();
    const fire = !move && this.burnNext;
    const descent = alone && !fire && !move ? this.nextDescent() : null;
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
                    ? this.burnAsked
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
    abort.disabled = this.abortWhy() !== null;
    const selected = abortAt(plan, t);
    const stillArmed = this.now() / 1000 - this.abortArmed <= ABORT_ARMED;
    const armed = !abort.disabled && stillArmed && this.abortArmedFor === selected;
    abort.classList.toggle('armed', armed);
    set('abort', armed ? 'Press again to abort' : 'Abort');
    if (this.orbitAbort) {
      const alternative = abortAt(plan, t, true);
      this.orbitAbort.disabled = !alternative || selected === alternative || this.abortWhy(true) !== null;
      const orbitArmed = !this.orbitAbort.disabled && stillArmed && this.abortArmedFor === alternative;
      this.orbitAbort.classList.toggle('armed', orbitArmed);
      this.orbitAbort.textContent = orbitArmed ? 'Confirm abort to orbit' : 'Abort to orbit';
    }
    this.root.classList.toggle('waiting', waiting);
    this.root.classList.toggle('thrusting', burning.length > 0 && t > 0);
    const code = String(record.manual?.code?.value ?? '');
    // (a stage firing into a joined one: what the staging sequence a hand set off has still to do, or, nothing pending, the
    // next step due now and how long the top below has left)
    const firing = !alone ? this.firing : null;
    const owed = !alone && this.mine !== null ? this.state?.chain?.[0] : undefined;
    const owedLabel = owed && this.vehicleOf().sequence.find((k) => JSON.stringify(k.step) === JSON.stringify(owed.step))?.label;
    const scorched = firing ? short(stagesOf(plan)[firing.stage - 1]!.body.label).toLowerCase() : '';
    const due =
      (!this.sequence && this.mine !== null && step && !alone && t >= this.dueAt(step.step)) ||
      (firing !== null && !owed && step !== null) ||
      (descending && !auto && descent !== null && this.descentDue(descent.id, t));
    const prompt = this.cells.get('prompt')!;
    const touch = matchMedia('(hover: none), (pointer: coarse)').matches;
    const lights = touch ? 'Ignition lights' : 'Space lights';
    // (how a flight is taken over, in a line: the switches, the action or the throttle)
    const takes = touch ? 'a switch, the action or the throttle takes it over' : 'G, B, Space or the throttle takes it over';
    // (the next step lights a stage into the one it stands on: said where it is offered, as it is how it flew)
    const hot = step ? this.hotNote(step.step) : null;
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
                        ? `Next: ${step.label.charAt(0).toLowerCase()}${step.label.slice(1)} ${this.whenIntended(step)}${hot ? ' · hot staging' : ''}`
                        : hot
                          ? 'Next: hot staging, as it flew'
                          : this.guidance
                            ? 'Guidance flying · steer to lean its aim'
                            : 'Hands only · steer while an engine burns'
              : descending && (!auto || this.downMine !== null)
                ? !descent
                  ? t >= this.over()
                    ? 'Down: the card says how it ended'
                    : 'Nothing left to give: the rest is the physics'
                  : !auto
                    ? `Sequencer off · ${descent.label}${due ? ' is due' : ' next'}`
                    : `The automatic sequence flies the rest · the action sets it off sooner`
                : this.free
                  ? this.fired === null
                    ? this.mine !== null && !(orbit && el.a * (1 - el.e) > ball + 100_000)
                      ? `Short of an orbit: it comes down, unless the ${this.burnName.toLowerCase()} pushes it on`
                      : 'Turn the long axis against the motion, then fire'
                    : this.outcome(t)
                  : this.byPlan !== null
                    ? `By hand, as flown: the flight controls steer the ship until ${this.wall(record.manual!.periods![this.byPlan]!.to.value)}`
                    : code && t < coast.on
                      ? `Open More and enter ${[...code].join('-')} to unlock steering`
                      : fire
                        ? `Next: the ${this.burnName.toLowerCase()} by the action, or at ${this.wall(coast.on)}`
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
    this.card(t);
  }

  /**
   * What to know of a step that lights a stage while the stage it stands on is still on (the joint below's `hot`, that
   * engine's): hot staging, which is how it flew, and what it costs if it goes on too long. Null for any other step.
   */
  private hotNote(step: Step): string | null {
    if (step.kind !== 'ignite') return null;
    const plan = this.recordPlan;
    const stages = stagesOf(plan);
    const engine = stages[step.stage]?.engine.id;
    const hot = plan.craft[0]!.joints.find((j) => j.hot && j.hot.engine === engine)?.hot;
    if (!hot) return null;
    const below = stages[step.stage - 1];
    const s = this.mine !== null ? this.state : null;
    const on = s ? !Number.isFinite(s.stages[step.stage]!.from) && !Number.isFinite(s.stages[step.stage - 1]!.gone) : true;
    if (!below || !on) return null;
    const lower = short(below.body.label).toLowerCase();
    // (what the one command set off after it, as the record had it: stagedlive.ts `setsOff`)
    const sets = this.vehicleOf().setsOff(step.stage);
    const after = (k: Step['kind']) => sets.find((x) => x.step.kind === k)?.wait;
    const [cut, parts] = [after('cut'), after('separate')];
    const when = (w: number) => (w < 0.005 ? 'at once' : `${w.toFixed(1)} s later`);
    // (its letting go cuts it too, where the record has no cut of its own before it)
    const then =
      cut !== undefined && parts !== undefined && Math.abs(cut - parts) >= 0.005
        ? `cut ${when(cut)} and let go ${when(parts)}`
        : parts !== undefined
          ? `cut and let go ${when(parts)}`
          : cut !== undefined
            ? `cut ${when(cut)}`
            : '';
    return `hot staging, as it flew: one command lit it with the ${lower} still under it, its fire out through the open joint onto the deflector on the ${lower}’s top${then ? `, and the ${lower} was ${then}, as the record has it; the crew had no say in it. Lit early by hand, the same follows` : ''}. Not for long: the ${lower}’s top is taken to stand ${hot.endures.value} s of it (${hot.endures.confidence})`;
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
    if (this.ejected) return void this.ejectedCard(el, t);
    if (this.padImpact) {
      const hit = this.padImpact;
      el.hidden = t < hit.t;
      const key = `pad-impact-${hit.t}`;
      if (el.dataset.at !== key) {
        el.dataset.at = key;
        el.innerHTML = `<h3>Launch structure strike</h3><p class="cockpit-why">${hit.name} · T+${hit.t.toFixed(2)} s · ${hit.speed.toFixed(1)} m/s. The escape ended at contact.</p>
          <p><button data-do="again"><kbd>N</kbd> Fly it again</button><button data-do="leave"><kbd>Esc</kbd> Leave</button></p>`;
      }
      return;
    }
    const whole = this.flown ?? orbitalFlown(this.flight);
    const down = this.landed(whole);
    // (the run on show follows the descent module down; the pilot lands under his canopy some minutes after it)
    const crashed = this.state?.landed && t >= this.state.landed.t;
    const broke = this.state?.broke && t >= this.state.broke.t - 1e-9 ? this.state.broke : null;
    // (a flight that does not come down: its coast flown six hours on, still up)
    const stays = !whole.down && whole.coast.samples[whole.coast.samples.length - 1]!.phase !== 'down';
    // (and the card waits until the last of them is down)
    const over = this.run !== null && (Boolean(crashed) || broke !== null || ((down !== undefined || stays) && t >= this.over()));
    const key = `${this.flownAt}|${this.mine}|${crashed}|${broke?.t}`;
    if (el.hidden === !over && el.dataset.at === key) return;
    el.hidden = !over;
    el.dataset.at = key;
    if (!over) return;
    const record = this.recordPlan.record!;
    const buttons =
      '<p><button data-do="again"><kbd>N</kbd> Fly it again</button><button data-do="leave"><kbd>Esc</kbd> Leave</button></p>';
    // (an abort whose seat was to wait for the falling stack to come down through its height, and the stack ended first)
    const waited = this.aborted?.mode.escape?.eject?.falling;
    const unwaited = this.aborted && waited ? `Aborted at T+${this.aborted.t.toFixed(0)} s: by the record, ${this.aborted.mode.does}.` : '';
    if (broke) {
      // what the record says its escape would have done at that instant (`ascent.aborts`): said, not flown
      const abort = record.aborts?.find((x) => broke.t < x.until.value);
      el.innerHTML = `<h3>Broke up on the launch vehicle</h3><p class="cockpit-why"><b>${broke.text}.</b></p>${
        unwaited
          ? `<p class="cockpit-why">${unwaited} It broke up before it came down through ${(waited!.value / KM).toFixed(0)} km, where the seat was to take the pilot out: what comes through a breakup is not modelled, and the flight ends there.</p>`
          : abort
            ? `<p class="cockpit-why">What the spacecraft’s escape did at that time, by the record: ${abort.does}. Not flown here: the flight ends at the breakup.</p>`
            : ''
      }<p class="cockpit-why">Not the flight of ${this.day}.</p>${buttons}`;
      return;
    }
    if (crashed) {
      el.innerHTML = `<h3>Down, on the launch vehicle</h3><p class="cockpit-why">${
        unwaited
          ? `${unwaited} It never came down through ${(waited!.value / KM).toFixed(0)} km falling, where the seat was to fire: it came down`
          : 'Your flight never parted the spacecraft from its launch vehicle: it came down with it'
      } at ${this.state!.landed!.speed.toFixed(0)} m/s, ${(this.sampleAt(t).range / KM).toFixed(0)} km from the pad. Not survivable.</p>${buttons}`;
      return;
    }
    // how it ended for him, in the record's terms (sim/verdict.ts downVerdict), and how long an orbit that stays up lasts
    const plan = this.flownPlan ?? this.recordPlan;
    let decayed: number | undefined;
    if (stays && !record.bound) {
      if (this.lasts?.of !== whole)
        this.lasts = {
          of: whole,
          s: decay(plan, this.frame, this.flight.site.seaLevel.value, whole.coast.samples[whole.coast.samples.length - 1]!),
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
    // (in the words the flight's data gives for whoever rode it: sim/orbital.ts `crewWords`)
    const { who, many } = crewWords(plan.craft[0]!.crew);
    const lives =
      stays || v.survivable === null
        ? ''
        : v.survivable
          ? ` ${who} ${many ? 'live' : 'lives'}, by the limits taken.`
          : ` ${who} ${many ? 'do' : 'does'} not live, by the limits taken.`;
    // the record's own landings: each body's time (its check) and the place the record gives
    const when = (id: string) => plan.checks.find((c) => c.of === 'descent' && c.id === `${id}.at`);
    const landing = record.landing;
    const { on } = landsOf(plan);
    const landings = [
      ...(downOf(plan)?.bodies.slice(0, 2) ?? []).flatMap((b) => {
        const c = when(b.id);
        return c ? [`${c.label} at ${this.wall(c.value)}`] : [];
      }),
      // (the place in the record's words, in the sea or near a place on land as the flight's data says: verdict.ts `landsOf`)
      // (a flight the run does not bring down, a target or one bound for the Moon, has no landing of the record's to set beside it)
      ...(landing
        ? [
            `the landing${landing.near ? ` ${on === 'sea' ? 'in' : on === 'land' ? 'near' : 'at'} ${landing.near}` : ''}, ${degrees(landing.latitude.value, 'N', 'S')} ${degrees(landing.longitude.value, 'E', 'W')}${on === 'sea' || !record.ground ? '' : `, ${record.ground.value.toFixed(0)} m above the sea`}`,
          ]
        : []),
    ].join('; ');
    const show = (unit: string, x: number) =>
      unit === 'm' ? `${(x / 1000).toFixed(1)} km` : unit === 's' ? this.wall(x) : `${x.toFixed(unit === 'deg' ? 2 : 1)} ${unit}`;
    // (a figure is held together, a figure and its unit, a day and its month: a time that carries its date may break before
    // its "on" only, so the two columns fit the card at any width: cockpit.css)
    const cell = (x: string) => x.replace(/ /g, '\u00a0').replace('\u00a0on\u00a0', ' on\u00a0');
    // (the coast's and the descent's: what a pilot's hand can change; the ascent's too, on a flight that was the user's going up)
    const rows = held(this.recordPlan, whole)
      .slice(this.mine !== null ? 0 : this.ascentChecks)
      .filter((c) => Number.isFinite(c.got) && c.id !== 'period' && !(stays && c.got === 0))
      .map(
        (c) =>
          `<tr${Math.abs(c.got - c.value) > c.tolerance ? ' class="out"' : ''}><th>${c.label}</th><td>${cell(show(c.unit, c.got))}</td><td>${cell(show(c.unit, c.value))}</td></tr>`,
      )
      .join('');
    const mine = this.mine !== null || this.fired !== null || this.downMine !== null || this.free;
    el.innerHTML = `
      <h3>${stays ? (record.bound ? `On its way to ${record.bound.for}` : 'Still in orbit') : this.mine !== null ? 'Down, on your own flight' : this.downMine !== null ? 'Down, on your own descent' : this.fired !== null ? 'Down, by your own braking burn' : this.burnByHand ? 'Down, as flown on the day: the braking burn by hand' : 'Down, as the automatic system flew it'}</h3>
      <p class="cockpit-why"><b>${v.how}.</b>${lives}${mine ? ` Not the flight of ${this.day}.` : ''}</p>
      <p class="cockpit-why">${v.why.join(' ')}</p>
      ${this.impactSummary()}
      ${v.against ? `<p class="cockpit-why">${v.against}</p>` : ''}
      ${landings ? `<p class="cockpit-why">${this.flight.callsign} as recorded: ${landings}.</p>` : ''}
      ${
        rows
          ? `<table class="dated">
        <thead><tr><td></td><td>You</td><td>${this.flight.callsign}</td></tr></thead>
        ${rows}
      </table>
      <p class="cockpit-why">Amber rows are outside the tolerance the record sets. The flight as recorded misses several of them itself (the Flown panel, and the flight’s mission.md, say why).</p>`
          : ''
      }
      ${buttons}`;
  }

  /**
   * The card after an abort's ejection from the launch vehicle, once the crew and the stack are both done: how it ended for
   * them by the limits taken (sim/verdict.ts `ejectedVerdict`), the escape the record has for that instant, and what became
   * of the stack.
   */
  private ejectedCard(el: HTMLElement, t: number): void {
    const out = this.ejected!;
    const s = this.state!;
    const over = t >= this.over();
    const key = `ejected|${out.at}|${s.landed?.t}|${s.broke?.t}|${s.parted?.t}`;
    if (el.hidden === !over && el.dataset.at === key) return;
    el.hidden = !over;
    el.dataset.at = key;
    if (!over) return;
    const plan = this.recordPlan;
    const pad = this.flight.site;
    const v = ejectedVerdict(
      plan,
      out.down,
      (at) => this.wall(at),
      (at) => this.apart(at, { latitude: { value: pad.latitude.value }, longitude: { value: pad.longitude.value } }),
    )!;
    const { who, many } = crewWords(plan.craft[0]!.crew);
    const lives =
      v.survivable === null
        ? ''
        : ` ${who} ${v.survivable ? (many ? 'live' : 'lives') : many ? 'do not live' : 'does not live'}, by the limits taken.`;
    const at = (x: number) => `T+${x.toFixed(0)} s`;
    const stack = s.broke
      ? `The launch vehicle broke up at ${at(s.broke.t)}: ${s.broke.text}.`
      : s.landed
        ? `The launch vehicle came back to the ground at ${at(s.landed.t)}, ${s.landed.speed.toFixed(0)} m/s, the empty ship on it.`
        : s.parted
          ? `The launch vehicle flew on and let the empty ship go at ${at(s.parted.t)}: not followed further.`
          : '';
    const buttons =
      '<p><button data-do="again"><kbd>N</kbd> Fly it again</button><button data-do="leave"><kbd>Esc</kbd> Leave</button></p>';
    el.innerHTML = `
      <h3>Ejected from the launch vehicle</h3>
      <p class="cockpit-why"><b>${v.how}.</b>${lives} Not the flight of ${this.day}.</p>
      <p class="cockpit-why">Aborted at ${at(this.aborted!.t)}: by the record, ${this.aborted!.mode.does}. Out on the seat at ${at(out.at)}.</p>
      <p class="cockpit-why">${v.why.join(' ')}</p>
      ${this.impactSummary()}
      ${stack ? `<p class="cockpit-why">${stack}</p>` : ''}
      <p class="cockpit-why">Not modelled: the seat’s way out through the fairing’s opening (thrown here against its motion through the air, as from the falling ball), and what the stack did to anyone near it.</p>
      <p class="cockpit-why">${v.against}</p>
      ${buttons}`;
  }
}

/** A latitude or longitude as a place is written: degrees and the side of the equator or the meridian it is on. */
const degrees = (x: number, plus: string, minus: string): string => `${Math.abs(x).toFixed(2)}° ${x < 0 ? minus : plus}`;

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

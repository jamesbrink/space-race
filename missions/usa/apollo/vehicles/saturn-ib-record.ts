/**
 * A Saturn IB flight as its own record has it (the flight's orbital.ts: `SaturnIBRecord`), from which saturn-ib-plan.ts
 * writes the plan the simulator flies (sim/plan.ts): the S-IB's eight H-1s and the S-IVB's J-2 with their propellant and
 * sequence, the escape tower, the orbit reached, the command and service modules' firings in orbit, their parting, the
 * entry and the Earth landing system to the sea, and the figures the run is held to. Every figure is a `Measure` with its
 * confidence and source, in SI; nothing here is code. A second flight on the same machinery is a second record: what differs
 * between AS-205 and SA-206 to SA-208 (the stages' masses and loads, the engines' figures and the J-2's mixture-ratio shift,
 * the sequence, the burns in orbit and what they were made on, the entry) is data in it.
 *
 * What the run flies: from liftoff to the splashdown, one craft that sheds the S-IB, the tower, the S-IVB (flown on as a
 * craft of its own where the record makes it the target: `target`), the service module and the forward heat shield.
 */
import type { Measure } from '../../../../src/measure.ts';
import type { Guidance } from '../../../../src/sim/orbital.ts';
import type {
  AbortMode,
  AttitudeDef,
  Craft,
  DragDef,
  EngineDef,
  EventDef,
  OrbitFix,
  PlanCheck,
  PlanRecord,
  Pursuit,
  TargetDef,
  VentDef,
} from '../../../../src/sim/plan.ts';
import type { Curve } from '../../../../src/types.ts';
import type { J2Figures, MixtureShift } from './saturn-v-record.ts';

/** One H-1 as the record has it: its thrust, N, and specific impulse, s, at sea level and in vacuum. */
export interface H1Figures {
  thrust: { seaLevel: Measure; vacuum: Measure };
  isp: { seaLevel: Measure; vacuum: Measure };
}

/**
 * A firing in orbit by the service module's engine (`sps`) or its thrusters (`sm-rcs`), as the record has it: the attitude
 * it was made in (its own `AttitudeDef`, an `aim` hold), its ignition and cutoff, the impulse the record gives it, m/s
 * (`flown`: what it is held to), and where the record has them, its firing time, the mass it lit at, and what it was made
 * on another craft for (`toward`: sim/plan.ts `Pursuit`, carried out by guidance on where the two are).
 */
export interface Burn {
  id: string;
  label: string;
  engine: 'sps' | 'sm-rcs';
  aim: AttitudeDef;
  on: Measure;
  off: { at: Measure; label: string };
  flown: Measure;
  firingTime?: Measure;
  massAtIgnition?: Measure;
  toward?: Pursuit;
}

export interface SaturnIBRecord {
  /** The stack as the plan's craft is named ('Saturn IB AS-205 with CSM-101'). */
  label: string;
  /** Everything at first motion, kg. */
  liftoff: Measure;
  /**
   * The first stage with the interstage, at first motion less what its engines burned on the pad; its propellant; what
   * leaves at the separation (`spent`); one H-1's figures; its sequence, s; and how fast the stages were pushed apart, m/s.
   */
  sib: {
    mass: Measure;
    spent: Measure;
    propellant: { load: Measure; usable?: Measure };
    h1: H1Figures;
    inboardCut: Measure;
    outboardCut: Measure;
    separation: Measure;
    push: Measure;
  };
  /**
   * The second stage with the instrument unit and the adapter, at first motion; its propellant; its J-2, lit once and
   * cut by its guidance on the orbit reached (`cutoff`: the record's instant, a figure the run is held to), with its
   * mixture-ratio shift; and what the stage let out in orbit while the spacecraft was on it (`vents`).
   */
  sivb: {
    mass: Measure;
    propellant: { load: Measure; usable?: Measure };
    j2: J2Figures & { shift?: MixtureShift; starts: string };
    ignition: Measure;
    cutoff: Measure;
    vents?: VentDef[];
  };
  /** The launch escape tower with its boost cover: its mass, when it was let go, the motor that pulled it clear, and its escape motor. */
  les: { mass: Measure; at: Measure; motor: { thrust: Measure; burn: Measure }; escape: EngineDef };
  /** The command and service modules. */
  csm: {
    /** The service module as flown up, kg (the spacecraft less the command module and its forward heat shield). */
    sm: Measure;
    /** The command module: its name, its mass through the descent, and its own lift and trim in the entry (the drag is CM-107's: command-module-aero.ts). */
    cm: { label: string; mass: Measure; lift: Curve; trim: Measure };
    /** The forward heat shield, kg. */
    shield: Measure;
    /** The service propulsion system: its thrust and impulse, how many times it was lit, its load, and the last firing's impulse (`deltaV`). */
    sps: { thrust: Measure; isp: Measure; starts: Measure; load: Measure; deltaV?: Measure };
    /** The spacecraft let go of the S-IVB: when, and how fast they part, m/s. */
    separation: { at: Measure; push: Measure };
    /** The command module let go of the service module: when, the command module's mass after, the service module's, and its push, m/s. */
    modules: { at: Measure; after: Measure; leaves: Measure; push: Measure };
  };
  /** The firings in orbit, in the order they are flown. */
  burns: Burn[];
  /**
   * The entry as the record flies it: the attitude held from the modules' parting (`parting`), and the attitudes and
   * events after it (the banks flown).
   */
  entry: { parting: AttitudeDef; attitudes: AttitudeDef[]; events: EventDef[] };
  /**
   * The Earth landing system: the forward heat shield let go below a height (the barometric switches') once the modules have
   * parted, the twin drogues a wait after it, the three mains below a height; the record's instant of each, a figure;
   * how long each canopy takes to fill and its push, m/s.
   */
  els: {
    shield: { at: Measure; height: Measure; push: Measure };
    drogues: { at: Measure; wait: Measure; fills: Measure };
    mains: { at: Measure; height: Measure; fills: Measure };
  };
  ascent: {
    /** The law flown to the orbit (sim/staged.ts), and what it is read from. */
    guidance: Guidance;
    source: string;
    drag: DragDef[];
    /** What the gimballed engines turn the stack by at full throw, deg/s^2. */
    steering: Measure;
  };
  /** The spacecraft in orbit in the free-molecule flow (plan.ts `Craft.rarefied`). */
  rarefied: NonNullable<Craft['rarefied']>;
  /** Another craft the burns are made on (plan.ts `TargetDef`): the spent S-IVB, flown on from the separation. */
  target?: TargetDef;
  /** The orbit as published, and the stack on it. */
  orbit: NonNullable<PlanRecord['orbit']>;
  /** The record's instants that set nothing off. */
  marks: NonNullable<PlanRecord['marks']>;
  /** What else the record has that is held to or shown: the entry interface, the landing, the days aboard. */
  mission: Omit<PlanRecord, 'orbit' | 'marks' | 'coastFixes' | 'aborts'>;
  checks: PlanCheck[];
  coastFixes: OrbitFix[];
  aborts: AbortMode[];
}

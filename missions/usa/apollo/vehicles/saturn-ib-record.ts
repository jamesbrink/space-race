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
  Craft,
  DragDef,
  EngineDef,
  OrbitFix,
  PlanCheck,
  PlanRecord,
  TargetDef,
  VentDef,
} from '../../../../src/sim/plan.ts';
import type { Burn, CsmRecord, ElsRecord, EntryRecord } from './csm-record.ts';
import type { J2Figures, MixtureShift } from './saturn-v-record.ts';

export type { Burn } from './csm-record.ts';

/** One H-1 as the record has it: its thrust, N, and specific impulse, s, at sea level and in vacuum. */
export interface H1Figures {
  thrust: { seaLevel: Measure; vacuum: Measure };
  isp: { seaLevel: Measure; vacuum: Measure };
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
  csm: CsmRecord;
  /** The firings in orbit, in the order they are flown. */
  burns: Burn[];
  /** The entry as the record flies it (csm-record.ts `EntryRecord`). */
  entry: EntryRecord;
  /** The Earth landing system (csm-record.ts `ElsRecord`). */
  els: ElsRecord;
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

/**
 * A Saturn V flight as its own record has it (each flight's orbital.ts: `SaturnVRecord`), from which saturn-v-plan.ts
 * writes the plan the simulator flies (sim/plan.ts): the three stages with their engines, propellant and sequence, the
 * escape tower, the parking orbit and the translunar injection, and the figures the run is held to. Every figure is a
 * `Measure` with its confidence and source, in SI; nothing here is code. A second flight on the same machinery is a second
 * record: what differs between AS-503 and AS-512 (an S-II centre engine cut early, a stage's mixture-ratio shift, the
 * injection's target) is data in it.
 *
 * What the run flies, and what it does not: from liftoff through the S-IVB's second cutoff, the stack whole; then on, the
 * stack still whole, through the translunar coast with the Moon pulling on it (`FlightPlan.gravity`). The transposition,
 * the lunar module's extraction, the S-IVB's slingshot and everything at the Moon are not flown.
 */
import type { Measure } from '../../../../src/measure.ts';
import type { Guidance } from '../../../../src/sim/orbital.ts';
import type { AbortMode, Craft, DragDef, OrbitFix, PlanCheck, PlanRecord } from '../../../../src/sim/plan.ts';

/** One F-1 as the record has it at sea level, and its nozzle's exit area, m^2: its thrust and impulse in vacuum are derived from them. */
export interface F1Figures {
  thrust: Measure;
  isp: Measure;
  exitArea: Measure;
}

/** One J-2 above the air: its thrust, N, and specific impulse, s. */
export interface J2Figures {
  thrust: Measure;
  isp: Measure;
}

/**
 * A mixture-ratio shift (the propellant utilisation valve stepped): the engine's thrust and flow before it and after it, each
 * as a share of the figures given for it, and when, s from liftoff. The impulse is taken as unchanged by it.
 */
export interface MixtureShift {
  at: Measure;
  before: Measure;
  after: Measure;
}

export interface SaturnVRecord {
  /** The stack as the plan's craft is named ('Saturn V SA-506 with CSM-107 and LM-5'). */
  label: string;
  /** Everything at first motion, kg. */
  liftoff: Measure;
  /** The first stage, with what leaves with it, at first motion; its propellant; one F-1's figures; its sequence, s. */
  sic: {
    mass: Measure;
    propellant: { load: Measure; usable: Measure };
    f1: F1Figures;
    centreCut: Measure;
    outboardCut: Measure;
    separation: Measure;
    /** How fast the stages were pushed apart at the first plane (the S-IC's retrorockets, the S-II's ullage motors), m/s. */
    push: Measure;
  };
  /**
   * The second stage with the S-II/S-IVB interstage on it, at first motion; its aft interstage, let go at the second plane;
   * its propellant; its centre engine and its four outboard engines, each cut as the record has it (`why`: what the
   * centre's cut was for, in the record's words); the outboards' mixture-ratio shift; its separation. Where the record has
   * the outboard engines cut by the stage's own depletion sensors and the run is to find when (`outboard.spent`, in the
   * record's words), their cut is flown at the instant the run's propellant is spent and the events after it (the separation,
   * the S-IVB's start) at the record's intervals from it, as the instrument unit timed them from that cutoff (its time
   * base 4): the record's instants are then figures the run is held to (saturn-v-plan.ts `siiSpent`).
   */
  sii: {
    mass: Measure;
    skirt: { mass: Measure; at: Measure };
    propellant: { load: Measure; usable: Measure };
    ignition: Measure;
    centre: J2Figures & { cut: Measure; why: string };
    outboard: J2Figures & { cut: Measure; shift?: MixtureShift; spent?: string };
    separation: Measure;
    push: Measure;
  };
  /** The launch escape tower with its boost cover: its mass, when it was let go, and the motor that pulled it clear. */
  les: { mass: Measure; at: Measure; motor: { thrust: Measure; burn: Measure } };
  /**
   * The third stage with the instrument unit and the adapter on it, at first motion, and what rides in the adapter (a lunar
   * module, or Apollo 8's test article), by its model's nodes: it stays with the stage and is not flown apart; its propellant, which both its burns draw on; its first burn, to the
   * parking orbit, cut by its guidance on the orbit reached (`orbit`); its second, the translunar injection, lit by the
   * clock and cut by its guidance on its speed, steered by its own law to `target` (`Guidance.injection`), the stack
   * turned to its attitude `align` seconds before it lights; and the attitude jets that hold it in orbit.
   */
  sivb: {
    mass: Measure;
    payload?: { label: string; mass: Measure; nodes: string[] };
    propellant: { load: Measure; usable: Measure };
    first: J2Figures & { ignition: Measure; cutoff: Measure };
    second: J2Figures & {
      ignition: Measure;
      cutoff: Measure;
      speed: Measure;
      shift?: MixtureShift;
      align: Measure;
      target: NonNullable<Guidance['injection']>['target'];
    };
    jets: Measure;
  };
  /** The command and service modules at first motion, kg, and the command module's share. */
  csm: { mass: Measure; cm: Measure };
  ascent: {
    guidance: Omit<Guidance, 'injection'>;
    drag: DragDef[];
    /** What the gimballed engines turn the stack by at full throw, deg/s^2. */
    steering: Measure;
    /** The stack in orbit in the free-molecule flow (plan.ts `Craft.rarefied`). */
    rarefied: NonNullable<Craft['rarefied']>;
    /**
     * Where the stack that coasts on after the injection has its centre of mass, m above the F-1s' exits (the flown model's
     * origin: plan.ts `PlanRecord.centre`): what flies on is that stack, nothing parting from it.
     */
    centre: Measure;
  };
  /** Where the stack is bound after the injection, and what the flight did next that is not flown (plan.ts `PlanRecord.bound`). */
  bound: { for: string; next: string };
  /** The parking orbit as published, and the stack on it. */
  orbit: NonNullable<PlanRecord['orbit']>;
  /** The record's instants that set nothing off (Mach 1, the greatest dynamic pressure, the insertion, the injection). */
  marks: { id: string; label: string; at: Measure }[];
  checks: PlanCheck[];
  coastFixes: OrbitFix[];
  aborts: AbortMode[];
}

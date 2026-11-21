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
 * the lunar module's extraction, the S-IVB's slingshot and everything at the Moon are not flown, but where the flight's
 * record is a lunar one (apollo-lunar-record.ts `ApolloLunarRecord`), which goes on from the injection to the splashdown.
 */
import { assumed, derived, type Measure } from '../../../../src/measure.ts';
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
 * as a share of the figures given for it, and when, s from liftoff. Where the record has the flow after it apart from the
 * thrust (`flow`: from the stage's propellant mass history, or an impulse it gives at the low ratio), the engine draws that
 * share and its impulse after the shift is the thrust's share over it; without it the impulse is taken as unchanged.
 */
export interface MixtureShift {
  at: Measure;
  before: Measure;
  after: Measure;
  flow?: Measure;
}

/**
 * The trajectory match's adjustment of the S-II's engines (AS-503's evaluation, Table 6-3): the factors on the engines'
 * thrust and flow at the reconstruction's time slice (Table 6-1's ESC+61 s figures) that give the stage's average
 * through the high mixture ratio as a six-degree-of-freedom simulation, fitted to the tracked trajectory, found it
 * (`high`); and the factors on the low mixture ratio's shares of those (`low`), where the low ratio's shares are not
 * already the match's own.
 */
export interface SiiMatch {
  high: { thrust: Measure; flow: Measure };
  low?: { thrust: Measure; flow: Measure };
}

const AS503 = 'Saturn V Launch Vehicle Flight Evaluation Report AS-503 (MSFC, MPR-SAT-FE-69-1, 1969)';
const AS503_MATCH = `${AS503}, Table 6-3 (S-II flight reconstruction comparison with simulation trajectory match results) and §6.3: "a six-degrees-of-freedom trajectory simulation determined adjustments to thrust and mass flow histories to yield a simulated trajectory which closely matched the observed postflight trajectory" (within 1.1 m/s)`;
/** AS-503's five J-2s at the ESC+61 s time slice (Table 6-2): their thrust, N, and their flow, their thrusts over their impulses, kg/s. */
const AS503_SLICE = {
  thrust: 1_033_744 + 1_021_276 + 1_010_858 + 1_000_908 + 1_020_102,
  flow: 1_033_744 / 4141.3 + 1_021_276 / 4161.9 + 1_010_858 / 4157.0 + 1_000_908 / 4155.1 + 1_020_102 / 4159.0,
};

/**
 * AS-503's trajectory match over its engines' figures at the time slice, taken for a stage whose own evaluation gives the
 * propulsion reconstruction alone: the matched average thrust and vehicle mass loss through the high mixture ratio over
 * the five engines' thrust and flow at ESC+61 s, and the matched low ratio's shares of those over the reconstruction's,
 * `assumed` for this flight's stage.
 */
export function siiMatchTaken(stage: string): SiiMatch {
  const taken = `taken for ${stage} (its evaluation gives the propulsion reconstruction alone)`;
  return {
    high: {
      thrust: assumed(
        5_094_321 / AS503_SLICE.thrust,
        `${AS503_MATCH}: the high mixture ratio's average longitudinal stage thrust, 5,094,321 N matched (5,074,980 reconstructed), over the five engines' at the ESC+61 s time slice, 5,086,888 N (Table 6-2), ${taken}`,
      ),
      flow: assumed(
        1_221.4 / AS503_SLICE.flow,
        `${AS503_MATCH}: the high mixture ratio's average vehicle mass loss rate, 1,221.4 kg/s matched (1,220.3 reconstructed), over the five engines' flow at the time slice, ${AS503_SLICE.flow.toFixed(1)} kg/s (Table 6-2: their thrusts over their impulses), ${taken}`,
      ),
    },
    low: {
      thrust: assumed(
        3_889_725 / 5_094_321 / (3_871_114 / 5_074_980),
        `${AS503_MATCH}: the low mixture ratio's thrust over the high's as matched (3,889,725 over 5,094,321 N) against as reconstructed (3,871,114 over 5,074,980), ${taken}`,
      ),
      flow: assumed(
        920.6 / 1_221.4 / (918.3 / 1_220.3),
        `${AS503_MATCH}: the low mixture ratio's mass loss rate over the high's as matched (920.6 over 1,221.4 kg/s) against as reconstructed (918.3 over 1,220.3), ${taken}`,
      ),
    },
  };
}

/** A piece of the stack's drag as a record gives it (plan.ts `DragDef`): its base's force without its end, which is the S-IC's outboard cutoff. */
export type SaturnVDrag = Omit<DragDef, 'base'> & { base?: Omit<NonNullable<DragDef['base']>, 'until'> };

/**
 * The Saturn V's air as AS-503's evaluation has it (§20.2, "Vehicle axial force characteristics"): the forebody's axial force
 * coefficient against the Mach number on the 396 in reference diameter (Fig. 20-2, AS-502's and AS-503's, "predictions
 * based on wind tunnel data"), and the force on the S-IC's base, `F = -0.798 (Pbase - Pamb) Aref`, from its average base
 * differential pressure against the height (Fig. 20-1, AS-503's flown, from its six valid base pressure measurements),
 * until the S-IC's outboard engines stop (saturn-v-plan.ts: the record's `sic.outboardCut`); flown to the end of the ascent (`until`). Read off the page at 110
 * dpi, so `estimated`: to some 0.02 of the coefficient and 0.03 N/cm² of the pressure. `flight`: whose stack this is
 * (AS-503's own, or AS-503's taken for a later one: the same shape and S-IC base).
 */
export function saturnVDrag(until: Measure, flight: string): SaturnVDrag[] {
  const whose = flight === 'AS-503' ? 'AS-503’s own' : `AS-503’s, taken for ${flight}: the same outer lines and S-IC base`;
  return [
    {
      until,
      area: derived(
        Math.PI * (198 * 0.0254) ** 2,
        `${AS503}, §20.2, Figs. 20-1 and 20-2: the reference diameter, 10.06 m (396 in), its disc`,
      ),
      curve: {
        points: [
          [0, 0.14],
          [0.6, 0.14],
          [0.8, 0.19],
          [1, 0.41],
          [1.1, 0.53],
          [1.2, 0.565],
          [1.5, 0.505],
          [2, 0.435],
          [2.5, 0.395],
          [3, 0.36],
          [3.5, 0.335],
          [4, 0.295],
          [5, 0.235],
          [6, 0.2],
          [7, 0.175],
          [8, 0.155],
        ],
        confidence: 'estimated',
        source: `${AS503}, §20.2 and Fig. 20-2: the forebody axial force coefficient against the Mach number, AS-502's and AS-503's (predictions based on wind tunnel data), read off the page; held past Mach 8. ${whose}`,
      },
      base: {
        pressure: {
          points: [
            [0, 300],
            [3_000, -1_500],
            [5_000, -3_000],
            [6_000, -3_300],
            [8_000, -1_500],
            [9_000, 0],
            [10_000, 1_200],
            [12_000, 3_200],
            [14_000, 4_000],
            [16_000, 4_100],
            [18_000, 3_900],
            [20_000, 3_500],
            [22_000, 3_100],
            [25_000, 2_500],
            [28_000, 1_900],
            [30_000, 1_300],
            [32_000, 900],
            [35_000, 600],
            [40_000, 450],
            [44_000, 400],
            [46_000, 0],
          ],
          confidence: 'estimated',
          source: `${AS503}, §20.2 and Fig. 20-1: the S-IC's average base differential pressure (base less ambient) against the height, AS-503's, read off the page (N/cm² as Pa): its suction low down, its base pumped above the ambient from 9 km, and the drop at the centre engine's cutoff (some 44 km). ${whose}`,
        },
        factor: derived(0.798, `${AS503}, §20.2 and Fig. 20-1: the base axial force, F = -0.798 (Pbase - Pamb) Aref`),
      },
    },
  ];
}

/** What one engine of each kind still gives once cut (plan.ts `EngineDef.decay`): its cutoff impulse, N s. */
export interface Decays {
  centre: Measure;
  outboard: Measure;
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
    /** How fast the stages were pushed apart at the first plane (the S-IC's retrorockets), m/s: the S-IC's speed away from the stack. */
    push: Measure;
    /**
     * The S-II's ullage motors' whole impulse, N s, where it carried them: fired as the stages parted, they pushed the stack
     * that flew on, which gains it over its mass then (plan.ts `JointDef.ahead`, derived in saturn-v-plan.ts).
     */
    ullage?: Measure;
    /** The F-1s' cutoff impulse, one engine's, where the record gives it. */
    decay?: Decays;
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
    /** The trajectory match's adjustment of its engines' reconstructed figures (`SiiMatch`), where the record has one. */
    match?: SiiMatch;
    /** The J-2s' cutoff impulse, one engine's, where the record gives it. */
    decay?: Decays;
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
    drag: SaturnVDrag[];
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
  /**
   * Where the stack is bound after the injection, and what the flight did next that is not flown (plan.ts
   * `PlanRecord.bound`): a flight flown to its injection and no further. Left out of one flown on to its end
   * (apollo-lunar-record.ts).
   */
  bound?: { for: string; next: string };
  /** The parking orbit as published, and the stack on it. */
  orbit: NonNullable<PlanRecord['orbit']>;
  /** The record's instants that set nothing off (Mach 1, the greatest dynamic pressure, the insertion, the injection). */
  marks: NonNullable<PlanRecord['marks']>;
  checks: PlanCheck[];
  coastFixes: OrbitFix[];
  aborts: AbortMode[];
}

/**
 * The command and service modules as a flight's record has them, whatever carried them up (a Saturn IB's record,
 * saturn-ib-record.ts; a Saturn V's to the Moon, apollo-lunar-record.ts): the modules' masses, the service propulsion
 * system, the spacecraft's parting from its last stage and the modules' from each other, the firings the record gives,
 * the entry and the Earth landing system. csm-plan.ts writes the plan's pieces from it. Every figure is a `Measure` with
 * its confidence and source, in SI; nothing here is code.
 */
import type { Measure } from '../../../../src/measure.ts';
import type { AttitudeDef, EventDef, Pursuit, ThrusterSet } from '../../../../src/sim/plan.ts';
import type { Curve } from '../../../../src/types.ts';

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

/** The command and service modules. */
export interface CsmRecord {
  /** The service module as flown up, kg (the spacecraft less the command module and its forward heat shield). */
  sm: Measure;
  /** The command module: its name, its mass through the descent, and its own lift and trim in the entry (the drag is CM-107's: command-module-aero.ts). */
  cm: { label: string; mass: Measure; lift: Curve; trim: Measure };
  /** The forward heat shield, kg. */
  shield: Measure;
  /**
   * The service propulsion system: its thrust and impulse, how many times it was lit, its load, and the last firing's
   * impulse: `deltaV` where it was the braking burn, flown evenly and cut by its integrator (a return from Earth orbit), or
   * `flown` where it was solved for an end and nothing brakes the coast (the transearth injection: sim/orbital.ts
   * `coastEvents`). An engine with neither is no engine of the coast's.
   */
  sps: { thrust: Measure; isp: Measure; starts: Measure; load: Measure; deltaV?: Measure; flown?: Measure };
  /** The spacecraft let go of the S-IVB: when, and how fast they part, m/s. */
  separation: { at: Measure; push: Measure };
  /** The command module let go of the service module: when, the command module's mass after, the service module's, and its push, m/s. */
  modules: { at: Measure; after: Measure; leaves: Measure; push: Measure };
  /**
   * The service module's reaction control system as the attitude is flown with it alone in orbit (sm-rcs.ts, sim/attitude.ts):
   * the centre of mass its chambers are placed about (XA, inches), its propellant load, kg, and the record's mass properties
   * through the free flight. Left out, the attitude is turned as a hand turns it, at the hand's rate.
   */
  rcs?: { centre: Measure; load: Measure; inertia: NonNullable<ThrusterSet['inertia']> };
}

/**
 * The entry as the record flies it: the attitude held from the modules' parting (`parting`: lift up, or an entry
 * steered to the computer's target on its own events, `Hold.entry`, sim/entry.ts), and any attitudes and events after
 * it (banks flown by the clock, where a record has only those).
 */
export interface EntryRecord {
  parting: AttitudeDef;
  attitudes: AttitudeDef[];
  events: EventDef[];
}

/**
 * The Earth landing system: the forward heat shield let go below a height (the barometric switches') once the modules have
 * parted, the twin drogues a wait after it, the three mains below a height; the record's instant of each, a figure;
 * how long each canopy takes to fill and its push, m/s.
 */
export interface ElsRecord {
  shield: { at: Measure; height: Measure; push: Measure };
  drogues: { at: Measure; wait: Measure; fills: Measure };
  mains: { at: Measure; height: Measure; fills: Measure };
}

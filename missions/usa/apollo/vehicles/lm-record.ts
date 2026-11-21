/**
 * What one flight's lunar module was, as its mission report gives it: the figures lm-plan.ts writes the craft's plan from.
 * The type's figures (the engines, the thrusters' places, the gear) are lm-plan.ts's and lm-rcs.ts's and name no flight;
 * this is what a flight gives of its own: its masses at separation, what it loaded, its centre of mass and its mass
 * properties through the flight, which legs carried probes, and the record's figures a run is held to.
 */
import type { Measure } from '../../../../src/measure.ts';
import type { ThrusterSet } from '../../../../src/sim/plan.ts';

export interface LmRecord {
  /** Its name, as the flight's words have it ('Eagle'), and its number ('LM-5'). */
  label: string;
  unit: string;
  /** The whole lunar module as it separated from the command and service module, kg. */
  mass: Measure;
  /** The descent stage and the ascent stage, each with what is in its tanks, kg; they sum to `mass`. */
  descent: Measure;
  ascent: Measure;
  /** Each engine's propellant as loaded, and what of it the engine can draw, kg. */
  dps: { loaded: Measure; usable: Measure };
  aps: { loaded: Measure; usable: Measure };
  /** The reaction control system's two systems as loaded, kg. */
  rcs: { a: Measure; b: Measure };
  /** The centre of mass its thrusters' torques are worked about (LM coordinates, inches). */
  centre: { x: Measure; y: Measure; z: Measure };
  /** The record's mass properties, the whole lunar module's and then the ascent stage's, each row a mass and its moments about X, Y and Z. */
  inertia: NonNullable<ThrusterSet['inertia']>;
  /** The centre of mass against mass, as the same table gives it (LM coordinates, inches): what the lander's legs are placed about. */
  centres: { mass: Measure; x: Measure; y: Measure; z: Measure }[];
  /** The legs that carried a lunar surface sensing probe, by the gear's leg ids. */
  probes: string[];
  /** The record's figures a run is held to: the mass at landing and at lunar lift-off, kg. */
  landed: { mass: Measure };
  liftoff: { mass: Measure };
}

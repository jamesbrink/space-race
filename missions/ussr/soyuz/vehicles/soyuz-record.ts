/**
 * A Soyuz flight's record, as its flight's orbital.ts gives it: the shape every flight on an R-7 has here (vostok-record.ts
 * `VostokRecord`: the stages, the instants, the published orbit, the braking burn, the descent and the checks), with what a
 * Soyuz has beyond a Vostok or a Voskhod: three modules, one engine that makes every burn in orbit and the braking burn from
 * one load of propellant, those burns, and a descent module that flies its entry on its own lift. Every number is a Measure
 * with its confidence and source. Only soyuz-plan.ts writes a plan from it and soyuz-flies.ts what the scene shows; nothing
 * in src/ reads it.
 */
import type { Confidence, Curve, Measure } from '../../../../src/types.ts';
import type { Nozzle } from '../../../../src/sim/plan.ts';
import type { Aim, VostokRecord } from '../../vostok/vehicles/vostok-record.ts';

/**
 * A burn in orbit by the main engine, as the record has it (one the rendezvous made on another ship is flown as a burn
 * like any other: the other ship is not in the plan, and each flight's README says so): the attitude it was made in, when
 * the ship was turned to it, when the engine was lit and cut, and the impulse it gave.
 */
export interface SoyuzBurn {
  id: string;
  /** The flight's own words for it. */
  label: string;
  /** Along or against the motion (an orbit raised or lowered), or along the orbit's normal (its plane turned); `below`, pitched down from the level. */
  attitude: { label: string; aim: 'velocity' | 'normal'; sense: 1 | -1; below?: Measure; confidence: Confidence; source: string };
  turned: Measure;
  on: Measure;
  off: Measure;
  deltaV: Measure;
}

/** The main engine (the approach and correction engine of the KTDU-35, or its successor) and what it draws on. */
export interface SoyuzEngine {
  name: string;
  /** In vacuum: it is lit only above the air. */
  thrust: Measure;
  isp: Measure;
  /** What it can burn, kg: the load in its tanks that goes through its chamber. Every burn in orbit and the braking burn draw on it. */
  propellant: Measure;
  /** How many times it can be lit. */
  starts: { count: number; confidence: Confidence; source: string };
  nozzle?: Nozzle;
}

export interface SoyuzRecord extends Omit<VostokRecord, 'orbit' | 'retro' | 'entry' | 'manual'> {
  /**
   * The orbit as published (`VostokRecord.orbit`), and where its heights come with no period of their own, the ball they
   * are over (`radius`: the flight's own figures' ball, where its later orbits have heights and periods; orbital.ts
   * `heightsBall`). Left out, the convention a Vostok's heights alone are read by.
   */
  orbit: VostokRecord['orbit'] & { radius?: Measure };
  /**
   * Two of the ship's three modules in orbit, kg: the orbital module (БО) and the instrument and propulsion module (ПАО); the
   * third, the descent module with its crew (СА), is `entry.mass`. The three sum to `mass`: where the sources' do not, the
   * instrument module is what is left, and says so.
   */
  modules: { orbital: Measure; instrument: Measure };
  engine: SoyuzEngine;
  /** Each burn in orbit before the braking burn, in order. */
  burns: SoyuzBurn[];
  /**
   * The braking burn: turned to its attitude at `turned`, the engine lit at `on` and cut at `off` (its integrator's,
   * at `deltaV`), pushing along `aim`.
   */
  retro: { turned: Measure; on: Measure; off: Measure; deltaV: Measure; aim: Aim };
  /**
   * What comes down, once the modules have parted at `separation` (s from liftoff, the orbital and instrument modules at
   * once): the descent module's mass, its drag against Mach number on `area`, its lift over drag at the angle of attack it
   * trims at (`lift`, `trim`), and the bank its control system held its lift at from `banked`; each later bank, where the
   * record has one, from its instant. An entry the record has flown ballistic (its control system off, the module turning
   * its lift every way) holds no bank: `bank` and `banked` are left out, and its lift is never flown (plan.ts `Hold.bank`).
   */
  entry: {
    separation: Measure;
    mass: Measure;
    area: Measure;
    drag: Curve;
    lift: Curve;
    trim: Measure;
    bank?: Measure;
    banked?: Measure;
    banks?: { label: string; bank: Measure; at: Measure }[];
  };
  /**
   * What a hand could do: how fast the hand controller turned the ship (deg/s), and how long after a burn by hand the
   * modules part (s), as the record's did after its own. No code locked the hand controls.
   */
  manual: { rate: Measure; parting: Measure };
}

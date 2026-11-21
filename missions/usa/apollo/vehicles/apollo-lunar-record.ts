/**
 * A Saturn V flight to the Moon as its own record has it, flown from the pad to the splashdown (the flight's orbital.ts:
 * `ApolloLunarRecord`), from which apollo-lunar-plan.ts writes the plan the simulator flies (sim/plan.ts). It is a Saturn
 * V's record to the translunar injection (saturn-v-record.ts `SaturnVRecord`, which the ascent is flown from unchanged)
 * and then the spacecraft's: the command and service modules let go of the S-IVB (csm-record.ts `CsmRecord`), each
 * firing after the injection with what it was for (`Burn.toward`: the midcourse corrections aimed at a pericynthion, the
 * lunar orbit's burns at an orbit, the return's at the entry interface, each solved on the run's own state: sim/pursuit.ts),
 * the modules' parting, the entry steered to its target (`Hold.entry`, sim/entry.ts) and the Earth landing system to the
 * sea. Every figure is a `Measure` with its confidence and source, in SI; nothing here is code.
 *
 * What rode in the adapter is the Saturn V record's `sivb.payload`: a lunar module, or Apollo 8's test article. Here it
 * stays with the S-IVB, which is let go with it and flown on as a body of its own with no push of its own (its evasive
 * manoeuvre and the slingshot its propellant dump gave it are not flown). A lunar module's transposition, docking and
 * extraction need joints formed by docking (A3): until then a flight that carried one is not written from this record.
 */
import type { Measure } from '../../../../src/measure.ts';
import type { PlanRecord } from '../../../../src/sim/plan.ts';
import type { Burn, CsmRecord, ElsRecord, EntryRecord } from './csm-record.ts';
import type { SaturnVRecord } from './saturn-v-record.ts';

export interface ApolloLunarRecord extends Omit<SaturnVRecord, 'bound'> {
  /** The command and service modules from the pad to their parting (csm-record.ts), and what they did there. */
  spacecraft: CsmRecord;
  /**
   * The S-IVB with the instrument unit, the adapter and what rides in it, as the spacecraft leaves it, kg: flown on from
   * the parting as a body of its own (sim/shed.ts), nothing of its own pushing it.
   */
  stage: { mass: Measure };
  /** The firings after the injection, in the order they are flown: each in its own attitude, with what it was for. */
  burns: Burn[];
  /** The entry as the record flies it, and the Earth landing system. */
  entry: EntryRecord;
  els: ElsRecord;
  /** What else the record has that is held to or shown: the entry interface, where it came down, the days aboard. */
  mission: Pick<PlanRecord, 'landing' | 'entryInterface' | 'ground' | 'supplies' | 'automatic' | 'manoeuvreTurn'>;
}

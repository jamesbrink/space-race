/**
 * A Saturn V flight to the Moon flown from the pad to the splashdown (sim/plan.ts), written from its record
 * (apollo-lunar-record.ts `ApolloLunarRecord`, the flight's orbital.ts): the Saturn V's plan to the translunar injection
 * (saturn-v-plan.ts `saturnVPlan`, its ascent the same to the bit) and the command and service modules' after it
 * (csm-plan.ts, which the Saturn IB's flights fly too). The spacecraft parts from the S-IVB, which is flown on with what
 * rode in its adapter as a body of its own; each firing after it is lit by the clock at the record's instant, in its own
 * attitude, and solved for what it was for on the run's own state as it lights (`Burn.toward`, sim/pursuit.ts): the
 * separation manoeuvres flown as the record's impulse, the midcourse corrections aimed at a pericynthion, the lunar orbit's
 * insertion and circularization at an orbit about the Moon, the transearth injection and the return's correction at the
 * entry interface. The modules part, the command module's entry is steered to its target by its computer (`Hold.entry`,
 * sim/entry.ts) and its parachutes bring it to the sea.
 *
 * The whole flight is flown under the Earth's gravity with J2, the Moon's field and the Sun, about the Earth outside the
 * guidance computer's sphere about the Moon and about the Moon within it (sim/core/gravity.ts `RSPHERE`). Nothing here
 * names a flight: each figure is the record's.
 */
import { RSPHERE } from '../../../../src/sim/core/gravity.ts';
import type { FlightPlan } from '../../../../src/sim/plan.ts';
import type { ApolloLunarRecord } from './apollo-lunar-record.ts';
import {
  burnEvents,
  cmHeating,
  csmBodies,
  csmEngines,
  csmJoints,
  csmSheds,
  elsChutes,
  elsEvents,
  modulesParting,
  smManualRate,
  spacecraftSeparation,
  spsTank,
} from './csm-plan.ts';
import { STATIONS, saturnVPlan, shed } from './saturn-v-plan.ts';

const IN = 0.0254;
/** The command module's heat shield, m above the F-1s' exits: the adapter's top (the service module's aft bulkhead, XA838) and 162 in (saturn_v.py, apollo_csm.py). */
const STACK_CM = (STATIONS.slaTop + 162) * IN;

export function apolloLunarPlan(o: ApolloLunarRecord): FlightPlan {
  const base = saturnVPlan(o);
  const craft = base.craft[0]!;
  const s = o.spacecraft;
  const payload = craft.bodies.some((b) => b.id === 'payload');
  // (the spacecraft's bodies are the modules' own, the service module, the forward heat shield and the command module, in
  // place of the Saturn V's two: the same mass at liftoff)
  const bodies = [...craft.bodies.filter((b) => b.id !== 'sm' && b.id !== 'cm'), ...csmBodies(s)];
  const { bound: _, ...record } = base.record!;
  return {
    ...base,
    craft: [
      {
        ...craft,
        bodies,
        joints: [...craft.joints, ...csmJoints(s, o.els, ['sivb', ...(payload ? ['payload'] : [])])],
        engines: [...craft.engines, ...csmEngines(s)],
        tanks: [...craft.tanks, spsTank(s)],
        thrusters: [...craft.thrusters, smManualRate(s)],
        sheds: [
          ...(craft.sheds ?? []),
          shed('spacecraft-separation', 'S-IVB, instrument unit and adapter', o.stage.mass, STATIONS.taperTop, STATIONS.slaTop, 130 * IN),
          ...csmSheds(s, STACK_CM),
        ],
        chutes: elsChutes(o.els),
        heating: cmHeating,
      },
    ],
    events: [
      ...base.events,
      spacecraftSeparation(s),
      ...o.burns.flatMap(burnEvents),
      modulesParting(s, o.entry),
      ...o.entry.events,
      ...elsEvents(o.els),
    ],
    attitude: [...base.attitude, ...o.burns.map((b) => b.aim), o.entry.parting, ...o.entry.attitudes],
    gravity: { central: 'earth', terms: ['j2', 'moon', 'sun'], sphere: RSPHERE },
    record: { ...record, ...o.mission },
  };
}

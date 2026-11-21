import { enrol } from '../../../../src/sim/roster.ts';
import type { Flight, Part } from '../../../../src/types.ts';
import { LC14 } from '../../places/cape-canaveral/lc-14.ts';
import { AGENA, ATDA, agenaDimensions, agenaMotors, agenaParts, atdaDimensions, atdaMotors, TARGET_GROUP } from './gemini-targets.ts';
import { targetLaunches } from './target-launches.ts';
import { targetSiteModels } from './target-pad.ts';
import { type TargetRecord, targetPlan } from './target-plan.ts';

/**
 * How a target's launch is shown (`Flight.flies`): the Atlas stack off the pad, each of the Atlas's five chambers and the
 * Agena's engine burning as the plan has them (all on the stack's exterior model, its origin at the booster exits'
 * plane), and what leaves: the booster section, the Atlas with the adapter, the Agena's nose shroud.
 */
function targetFlies(o: TargetRecord): NonNullable<Flight['flies']> {
  const atlas = o.atlas;
  return {
    model: 'vehicle',
    datum: 0,
    fires: [
      { node: 'BoosterEngines_Nozzles', on: 'booster-engines', burns: 'kerosene-lox' },
      { node: 'Sustainer_Nozzle', on: 'sustainer', burns: 'kerosene-lox' },
      { node: 'Verniers_Nozzles', on: 'verniers', burns: 'kerosene-lox' },
      ...(o.payload.engine ? [{ node: 'AgenaEngine', on: 'agena-engine', burns: 'amine-nitric' as const }] : []),
    ],
    drops: [
      { at: atlas.booster.separation.value, nodes: ['AtlasBoosterSection', 'AtlasBoosterEngines'], on: 'booster-latch' },
      { at: o.separation.at.value, nodes: atlas.tank.nodes, on: 'target-separation' },
      ...(o.payload.shroud ? [{ at: o.payload.shroud.at.value, nodes: ['TargetAscentShroud'], on: 'shroud-band' }] : []),
    ],
    air: { frost: ['frost-lox'] },
  };
}

/** The same hardware as the crew saw, now on the floor by itself at its own launch date. */
export function encounterParts(encounter: Flight): Part[] {
  return encounter.models.find((model) => model.id === 'vehicle')!.parts.filter((part) => part.group === TARGET_GROUP);
}

export function lostParts(unit: '5002' | '5004'): Part[] {
  return agenaParts([
    {
      node: 'TargetDockingAdapter',
      name: 'Target docking adapter',
      summary: 'The collar built to receive the Gemini nose.',
      detail:
        unit === '5002'
          ? 'McDonnell built adapter 2 for the original Gemini VI. Three latches were to catch the spacecraft. The Agena never reached orbit.'
          : 'Adapter 5 carried an S-10 micrometeorite collector. It was lost with its Atlas. The adapter Stafford and Cernan later saw belonged to a different target.',
    },
    {
      node: 'AgenaForwardSection',
      name: 'Forward equipment section',
      summary: 'The forward rack contained electrical and guidance equipment.',
      detail:
        'The exhibit uses the early Agena rack. The exact equipment layout of this individual unit is assumed from the Gemini VIII vehicle.',
    },
    {
      node: 'AgenaTankSection',
      name: 'Tank section',
      summary: 'The central cylinder held separate propellant tanks.',
      detail:
        'The outside diameter and longitudinal stations follow the Lockheed drawings. The arrangement of the outside fittings is taken from the early Agena configuration.',
    },
    {
      node: 'AgenaAftSection',
      name: 'Aft equipment rack',
      summary: 'An open frame around the main engine.',
      detail:
        'The rack carried the two secondary propulsion units. The individual equipment cases and their mounts are reconstructed from drawings of the type.',
    },
    {
      node: 'AgenaEngine',
      name: 'Main engine',
      summary: 'The restartable engine at the tail of the target.',
      detail:
        unit === '5002'
          ? 'The Agena was lost at the start of its ascent burn. Schirra and Stafford remained on the ground.'
          : 'The Atlas failed during ascent. The crew never had an opportunity to command this engine in orbit.',
    },
  ]);
}

/**
 * A target's launch as a flight. It is enrolled with the simulator as it is built (sim/roster.ts), so the flight that
 * went up to it can name it as its target (`TargetDef.flight`) wherever this flight's `flight.ts` has been loaded.
 */
export function targetFlight(id: keyof typeof targetLaunches, parts: Part[], orbital?: TargetRecord): Flight {
  const record = targetLaunches[id];
  const augmented = id === 'atda';
  const flight: Flight = {
    id: 'usa/gemini/' + id,
    nation: 'USA',
    agency: 'NASA',
    program: 'Project Gemini',
    designation: record.mission + ' target',
    callsign: record.name,
    spacecraft: record.name,
    launchVehicle: 'Atlas SLV-3 ' + record.atlas,
    launch: record.launch,
    launchSite: 'Cape Kennedy, Launch Complex 14',
    crew: [],
    site: LC14,
    surroundings: 'models/usa/places/cape-canaveral/lc14/1962-02.glb',
    summary: record.story,
    facts: [
      { label: 'Docking adapter', value: 'TDA ' + record.adapter },
      { label: 'Launch vehicle', value: 'Atlas ' + record.atlas },
    ],
    timeline: orbital
      ? orbital.events.map((e) => ({
          t: e.at.value,
          event: e.id === 'liftoff' ? `${record.name} leaves Complex 14 on Atlas ${record.atlas}` : e.label,
        }))
      : [{ t: 0, event: record.name + ' leaves Complex 14 on Atlas ' + record.atlas }],
    ...(orbital ? { plan: targetPlan(orbital), flies: targetFlies(orbital) } : {}),
    specs: (augmented ? atdaDimensions() : agenaDimensions()).map((s) => ({ ...s, group: 'Spacecraft' })),
    motors: augmented ? atdaMotors() : agenaMotors(),
    models: [
      {
        id: 'spacecraft',
        galleryOnly: true,
        name: record.name,
        url: 'models/usa/gemini/' + id + '/vehicle.glb',
        backdrop: 'studio',
        cutaway: true,
        scale: augmented ? '3.73 m from antenna tip to docking cone' : '7.95 m from nozzle to docking cone',
        slider: ['Assembled', 'Taken apart'],
        parts: parts.map((p) => ({ ...p, group: 'Spacecraft' })),
        views: [
          { id: 'target', label: 'Whole target', nodes: augmented ? ATDA : AGENA, from: [1, 0.18, 0.6] },
          { id: 'cone', label: 'Docking cone', nodes: ['DockingCone', 'TargetDockingAdapter'], from: [0.7, 1.1, 0.2] },
        ],
      },
      ...targetSiteModels(id, record),
    ],
  };
  enrol(flight);
  return flight;
}

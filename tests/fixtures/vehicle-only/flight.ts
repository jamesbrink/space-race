import type { Flight } from '../../../src/types';

/**
 * A flight that is only its vehicle: no site, no trajectory, no pad, no crew. It is not a flight
 * (it is in no index and is nobody's record): it is the least a flight can be and still be shown,
 * which is what a new programme's first flight is while only its spacecraft is built. The gallery
 * must show it end to end (tests/address.test.mjs; in the browser, `pnpm dev` and
 * `/?fixture#test/fixture/vehicle-only`).
 *
 * The model is Freedom 7's vehicle, borrowed for its nodes; the parts named here are three of
 * its, with no headings, so nothing can stand there alone, and no crew, so the measure's person
 * is the outline.
 */
export const flight: Flight = {
  id: 'test/fixture/vehicle-only',
  nation: 'Test',
  agency: 'None',
  program: 'Fixture',
  designation: 'Vehicle only',
  callsign: 'Fixture 1',
  spacecraft: 'A spacecraft with no site built',
  launchVehicle: '',
  launch: '1961-04-12T06:07:00Z',
  launchSite: 'Not built',
  crew: ['Nobody'],
  summary: 'A flight with only its vehicle built: what the gallery must be able to show by itself.',
  facts: [],
  timeline: [],
  specs: [{ group: 'Spacecraft', label: 'Heat shield diameter', value: 1.892, unit: 'm', confidence: 'documented', note: '74.5 in' }],
  motors: [],
  models: [
    {
      id: 'vehicle',
      name: 'Vehicle',
      url: 'models/usa/mercury/mr-3-freedom-7/vehicle.glb',
      scale: 'a fixture, to no scale of its own',
      backdrop: 'studio',
      slider: ['Assembled', 'Exploded'],
      cutaway: true,
      views: [{ id: 'top', label: 'Top', nodes: ['EscapeTower'] }],
      parts: [
        {
          node: 'EscapeTower',
          name: 'Tower',
          summary: 'The first part, which leaves first.',
          detail: 'Stands for any part that is outside.',
          explode: [0, 4, 0],
          order: 0,
        },
        {
          node: 'CrewCabin',
          name: 'Cabin',
          summary: 'A part that is inside another.',
          detail: 'Choosing it opens the cutaway.',
          inside: true,
          facts: [['Kind', 'inside']],
          explode: [0, 2, 0],
          order: 1,
        },
        {
          node: 'RedstoneEngine',
          name: 'Engine',
          summary: 'The last part, which does not move.',
          detail: 'It is clear of the rest when the rest has left it.',
          explode: [0, 0, 0],
          order: 2,
        },
      ],
    },
  ],
};

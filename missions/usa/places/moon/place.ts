import type { PlaceDef } from '../../../../src/types.ts';

/**
 * The Moon: the place every Apollo landing site is in (tranquility.ts, ocean-of-storms.ts, fra-mauro.ts, hadley.ts,
 * descartes.ts, taurus-littrow.ts), and what is the same for all of them. It has no air, so no weather, no wind and
 * nothing heard through the air; no grid, so no hum. What a site's ground is, is its terrain bake
 * (tools/lunar-terrain.py: public/lunar/<site>.terrain.bin and <site>.descent.bin).
 */
export const MOON_PLACE: PlaceDef = {
  name: 'moon',
  // Nothing is carried through a vacuum: what a person on the Moon hears comes through the suit and what it touches.
  quiet: { wind: 0, surf: 0, hum: 0, sea: 0 },
  mains: {
    value: 0,
    confidence: 'documented',
    source:
      'none: there was no power grid on the Moon (each lunar module, experiment package and rover carried its own batteries), and quiet.hum is 0',
  },
  tread: {
    land: {
      kind: 'sand',
      confidence: 'estimated',
      source:
        'the regolith, a fine loose soil of broken rock and glass: of the kinds a tyre is heard on, sand is the nearest. Nothing of it is ' +
        'carried through the vacuum; what a rider hears comes through the frame and the suit',
    },
    materials: [],
    painted: {},
    source: 'nothing is made on the land: there are no roads, aprons or rails on the Moon',
  },
  engines: {},
};

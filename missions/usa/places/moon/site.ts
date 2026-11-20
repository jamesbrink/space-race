import type { LunarSiteDef, Measure } from '../../../../src/types.ts';
import { MOON_PLACE } from './place.ts';

/** The coordinates of every Apollo LM, measured off LROC's narrow-angle images (docs/sources.md, "The Moon's landing sites"). */
export const WAGNER_2017 =
  'Wagner, Nelson, Plescia, Robinson, Speyerer and Mazarico (2017), “Coordinates of anthropogenic features on the Moon”, Icarus 283, 92–103, as LROC publishes them (PDS LROLRC_2001 EXTRAS/SHAPEFILE/ANTHROPOGENIC_OBJECTS, revised 2026-08-14)';

/** What a landing site's module gives: the rest of its `SiteDef» is the same at every site. */
export interface Landing {
  id: string;
  name: string;
  /** The row of Wagner et al.'s table: its OBJECT_ID, the LM's name, its latitude and longitude (degrees), their uncertainty (m), how they were measured. */
  lm: { object: string; vehicle: string; latitude: number; longitude: number; uncertainty: number; method: string };
  /** The ground under the LM, metres above the Moon's 1737.4 km sphere, as the bake found it in the NAC terrain model. */
  height: Measure;
  stereo: string[];
  centre: Measure;
  approach: Measure;
}

/**
 * A landing site's `LunarSiteDef». The frame's origin is the ground under the LM's middle (the plane its four pads stand on,
 * tools/lunar-terrain.py); +X is east, +Y the local vertical, +Z south: the frame the rover's terrain was baked in.
 */
export function landingSite(l: Landing): LunarSiteDef {
  const where =
    `${WAGNER_2017}: ${l.lm.object}, the descent stage of ${l.lm.vehicle}, ${l.lm.latitude}, ${l.lm.longitude}, to ${l.lm.uncertainty} m ` +
    `(${l.lm.method}). In the Moon's mean Earth/polar axis frame (DE421's), the frame LROC's and LOLA's maps are in, on the IAU's ` +
    'Moon 2000 sphere of 1737.4 km';
  return {
    id: l.id,
    site: {
      name: l.name,
      body: 'moon',
      place: MOON_PLACE,
      latitude: { value: l.lm.latitude, confidence: 'documented', source: where },
      longitude: { value: l.lm.longitude, confidence: 'documented', source: where },
      height: l.height,
      seaLevel: {
        value: 0,
        confidence: 'documented',
        source:
          'by definition: the Moon has no sea, and its heights are measured from the sphere of 1737.4 km (the IAU/IAG figure, ' +
          'world/bodies.ts MOON) that LOLA, SLDEM2015 and the NAC terrain models all use',
      },
      bearingX: {
        value: 90,
        confidence: 'documented',
        source: 'by definition: +X east and +Z south, the frame the terrain is baked in (tools/lunar-terrain.py)',
      },
      grade: {
        value: 0,
        confidence: 'documented',
        source: 'by definition: the origin is on the ground under the LM, the plane its pads stand on (tools/lunar-terrain.py)',
      },
      zone: { name: 'UTC', utcOffset: 0 },
    },
    stereo: l.stereo,
    centre: l.centre,
    approach: l.approach,
  };
}

/** The grids centred on the LM itself: where no rover was parked. */
export const ON_THE_LM: Measure = { value: 0, confidence: 'documented', source: 'by definition: the grids are centred on the LM' };

/** The grids centred where the rover was parked, 12 m east of the LM (the rover's gallery starts it there). */
export const ROVER_PARKED: Measure = {
  value: 12,
  confidence: 'estimated',
  source: 'the rover’s starting place in its gallery scene, 12 m east of the LM (missions/usa/apollo/vehicles/lunar-rovers.md)',
};

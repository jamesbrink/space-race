import type { ModelDef, Part, SiteDef } from '../../../../src/types.ts';
import { TYURATAM } from './place.ts';

const map = 'OpenStreetMap way 392622243, outline of Pad 31/6. The rocket axis is estimated from the centre of the deck.';
export const SITE31: SiteDef = {
  name: 'Tyuratam (Baikonur), Site 31',
  place: TYURATAM,
  latitude: { value: 45.99605, confidence: 'estimated', source: map },
  longitude: { value: 63.56422, confidence: 'estimated', source: map },
  bearingX: {
    value: 310.5,
    confidence: 'derived',
    source:
      'Bearing of the final straight rail approach, OpenStreetMap way 392622252, rounded to 0.1 degree. The historical alignment is assumed.',
  },
  height: {
    value: 78,
    confidence: 'estimated',
    source: 'Site 1’s estimated ellipsoidal deck height, used as a regional approximation. Site 31 has no surveyed height here.',
  },
  seaLevel: { value: -34, confidence: 'assumed', source: 'EGM96 at nearby Site 1, rounded to the nearest metre.' },
  grade: {
    value: -0.12,
    confidence: 'estimated',
    source: 'The rail approach meets the deck at grade. The model lays the soil twelve centimetres below the nominal slab surface.',
  },
  zone: { name: 'MSK', utcOffset: 3 },
};

const hardware = (node: string, name: string, summary: string, detail: string): Part => ({
  node,
  name,
  summary,
  detail,
  group: 'Site 31',
  order: 0,
  explode: [0, 0, 0],
});

export const site31Pad: ModelDef = {
  id: 'pad',
  name: 'Site 31',
  url: 'models/ussr/places/tyuratam/site31/pad.glb',
  backdrop: 'ground',
  scale: '39.6 m deck · reconstructed from the mapped pad outline',
  parts: [
    hardware(
      'PadMast',
      'Lattice mast',
      'A tall mast stood beside the launch platform.',
      'A mast is visible against the sky in the Soyuz 4 liftoff photograph. Its footprint, section and height here are estimated. Its presence in October 1968 is assumed.',
    ),
    hardware(
      'RailApproach',
      'Rail approach',
      'Soyuz reached the pad horizontally by train.',
      'The final straight approaches from the southeast. Its exposed length, paving and surface detail are reconstructed.',
    ),
    hardware(
      'Platform',
      'Launch platform',
      'The train came level with the concrete deck at the edge of the excavation.',
      'A circular opening lets the tail hang below the deck. The outline follows the mapped platform; the supports and the shape of the earth cut are estimated.',
    ),
    hardware(
      'LaunchRing',
      'Four support trusses',
      'The four green trusses cradle the rocket above the opening.',
      'The reconstructed R-7 family support assembly is shared with Site 1. Site 31’s individual fittings and orientation against the rocket are assumed.',
    ),
    hardware(
      'ServiceTrusses',
      'Service platforms',
      'The access platforms are folded away from the launcher.',
      'The launch photograph of Soyuz 4 shows the area above the rocket supports clear. The exhibit uses the taller Soyuz service towers at Site 1 as a family approximation for both flights.',
    ),
  ],
  views: [
    { id: 'platform', label: 'Launch platform', nodes: ['Platform', 'LaunchRing', 'ServiceTrusses'], span: 61, from: [1, 0.46, 1] },
    { id: 'rails', label: 'Rail approach', nodes: ['RailApproach'], span: 87, from: [-0.8, 0.42, 1] },
  ],
};

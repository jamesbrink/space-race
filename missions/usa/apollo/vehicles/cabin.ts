import type { ModelDef } from '../../../../src/types.ts';

const IN = 0.0254;
export function blockIICabin(datum: number) {
  const cabinPoint = (x: number, y: number, xc: number): [number, number, number] => [x * IN, (datum + xc) * IN, -y * IN];

  // NAA training CS, interior lighting, Block II, and News Reference, panels 5/8.
  // Three areas are represented by broad exhibit lights. Locations, output and colour are estimated.
  const lights: NonNullable<ModelDef['lights']> = [-1, 0, 1].map((side) => ({
    position: cabinPoint(18, side * 29, 55),
    colour: 0xfff6e8,
    intensity: 0.6,
    reach: 3,
  }));

  const cabin: NonNullable<ModelDef['cabin']> = {
    within: [
      'CabinStructure',
      'MainConsole',
      'FlightDirectorIndicators',
      'ConsoleEquipment',
      'DSKYFrontWeb',
      'CrewCouches',
      'CabinEquipmentBays',
      // the hatch as the crew see it: its pressure door and latch drive (under SideHatch, whose outer cover is outside)
      'CM_SideHatchPressureDoor',
      'CM_HatchDriveAndHandle',
    ],
    overhead: [1, 0, 0],
    instruments: [],
    lighting: {
      name: 'Cabin floodlighting',
      about: 'Three crew areas with estimated lighting. The individual rheostats are not modelled.',
      ways: [
        { says: 'Flood', lit: [0, 1, 2] },
        {
          says: 'Dim',
          lit: [
            { light: 0, level: 0.25 },
            { light: 1, level: 0.25 },
            { light: 2, level: 0.25 },
          ],
        },
        { says: 'Off', lit: [] },
      ],
    },
    // Centres of the pressure-window frame outlines, offset to the inner glazing. The spans are nominal.
    windows: [
      { name: 'Side left window', at: cabinPoint(27.31037, -45.40262, 51.75532), out: [0.4284828, 0.5391659, 0.7250535], across: 13 * IN },
      { name: 'Side right window', at: cabinPoint(27.53107, 45.49484, 51.68278), out: [0.4417824, 0.5387893, -0.7173106], across: 13 * IN },
      {
        name: 'Rendezvous left window',
        at: cabinPoint(38.47952, -25.80198, 60.92348),
        out: [0.5163357, 0.8563317, -0.0096665],
        across: 8 * IN,
      },
      {
        name: 'Rendezvous right window',
        at: cabinPoint(38.47952, 25.65527, 60.92348),
        out: [0.5163366, 0.8563311, 0.0096678],
        across: 8 * IN,
      },
      { name: 'Hatch window', at: cabinPoint(46.32318, -0.54187, 60.83316), out: [0.8485583, 0.5290987, 0.0018332], across: 9 * IN },
    ],
  };

  return { cabin, lights };
}

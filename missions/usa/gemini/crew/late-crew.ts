import type { ModelDef } from '../../../../src/types.ts';
import { g4cParts, standing } from './g4c-suit.parts.ts';

/** Bare stature comes from the crew biographies and suited height comes from the standing build. See g4c-suit.md. */
const people = {
  10: [
    { name: 'John W. Young', surname: 'Young', stature: 1.753, height: 1.807 },
    { name: 'Michael Collins', surname: 'Collins', stature: 1.803, height: 1.851 },
  ],
  11: [
    { name: 'Charles Conrad Jr.', surname: 'Conrad', stature: 1.676, height: 1.74 },
    { name: 'Richard F. Gordon Jr.', surname: 'Gordon', stature: 1.702, height: 1.763 },
  ],
  12: [
    { name: 'James A. Lovell Jr.', surname: 'Lovell', stature: 1.829, height: 1.874 },
    { name: 'Edwin E. Aldrin Jr.', surname: 'Aldrin', stature: 1.778, height: 1.829 },
  ],
} as const;

/** The two suited figures at the foot of the Complex 19 crew ramp. */
export function lateCrew(flight: keyof typeof people, boarding: number): [ModelDef, ModelDef] {
  const make = (id: 'crew' | 'pilot'): ModelDef => {
    const command = id === 'crew';
    const who = people[flight][command ? 0 : 1];
    const sign = command ? 'THE' : 'END';
    const suit = command
      ? 'The command pilot’s G4C had a light outer cover to keep the underlying pressure garment from snagging.'
      : 'The pilot’s G4C added a cover against heat and micrometeoroids for work outside the spacecraft.';
    const figure = standing({
      flight: `gt-${flight}`,
      id,
      name: command ? 'Command pilot' : 'Pilot',
      scale: `${who.name} · ${who.stature.toFixed(2)} m, ${who.height.toFixed(2)} m suited · to scale`,
      parts: g4cParts(who.surname, {
        Torso: {
          summary: command ? 'The G4C pressure garment under a lightweight cover.' : 'The G4C with the thicker cover for going outside.',
          detail: flight === 12 ? `${suit} The red ${sign} sign on his back marked Gemini’s last flight.` : suit,
        },
        Arms: {
          summary: 'The United States flag on the left sleeve and the flight emblem on the right.',
          detail: 'The left forearm gauge showed the pressure inside the suit. Each sleeve also had a pocket.',
        },
        ...(flight === 12 && !command
          ? {
              Gloves: {
                summary: 'The gloves included insulation for spacewalks.',
                detail: 'Aldrin’s thermal protection was built into the gloves, so he could work outside without separate overgloves.',
              },
            }
          : {}),
      }),
      height: who.height,
      at: command ? [15, 0, -7] : [21, 0, -7],
      boarding,
    });
    return { ...figure, galleryCraft: who.name, galleryFrom: figure.views[0]?.from, motorNames: [] };
  };
  return [make('crew'), make('pilot')];
}

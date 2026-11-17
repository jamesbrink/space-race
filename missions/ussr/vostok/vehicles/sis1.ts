import type { CabinDef } from '../../../../src/types.ts';

/**
 * The cabin of the SIS-1-3KA as somewhere to fly from (types.ts: CabinDef; viewer/cabin.ts): the board PD-1-3KA with the
 * Globus, the control panel PU-1-3KA with the logical lock, the hand controller RU-1A and the Vzor, as
 * vehicles/vostok_cabin.py builds them (`build`, a ship's fit), each needle with its scale in its own extras. Vostok 1
 * flew it, and Vostok 2 a set its own maker says differed from it only in what is said of each ship. What a flight
 * gives is its own: what its needles read (`instruments`), which signal lamps its record lights (`lit`), its Globus as
 * set (`globus`), what is known of its lock's code (`code`) and its lights (`lighting`). What each thing rests on is the
 * flight's spacecraft.md, "Cabin".
 */

export const NOT_SIMULATED = 'Not simulated: the needle stands where it was built.';

// which lens carries which words is not established: the words are a reconstruction (vostoksupersite, from archive
// documents it names, with doubts of its own), so each lens says its block's and stays dark
export const SIGNALS: [block: string, lamps: number, says: string][] = [
  [
    'TS1',
    10,
    'The upper block, warnings: among them, as reconstructed, cabin pressure low, carbon dioxide, start the braking engine or cancel the descent, gas for one descent, prepare to eject, the seat’s locks; sound, and the emergency signal being sent.',
  ],
  [
    'TS2',
    10,
    'The middle block: among them, as reconstructed, fly by hand, orientation on the Sun, transmission under way, a call to the radio; VHF transmitting, the gas analyser, manual orientation, and descent I, II and III.',
  ],
  ['TS3', 4, 'The lower block: among them, as reconstructed, starting the braking engine is permitted.'],
];
// The Vzor's view (CabinDef.periscope). Its axis is the model's: square out of hatch No. 3's porthole, whose latitude on the
// ball is estimated (15 degrees toward the nose: vostok-3ka.md), so the axis on the Earth's centre leaves the long axis 15
// degrees off level; the ring's angles and the screen's field are estimated (spacecraft.md, "The Vzor")
export const VZOR: NonNullable<CabinDef['periscope']> = {
  screen: 'Vzor_Screen',
  name: 'Vzor',
  about:
    'The optical orientator on the porthole at his feet: a mirror ring in which the horizon stands in all eight windows alike when the axis points at the Earth’s centre, and a centre 7 degrees across through which the ground runs along the arrows when the ship lies along its track for braking (Tyapchenko; Gagarin’s report: “the whole horizon was inscribed perfectly evenly in the outer ring”). That is how the ship was turned by hand for the braking burn. ' +
    'Here the centre is the outside along the porthole’s axis and the ring the band where the horizon stands from 150 to 350 km up (Tyapchenko), drawn as a straight map of angle to radius; the mirrors’ own geometry, their inner ring at 5 to 7 degrees and the arrows lit for the jets are not drawn (spacecraft.md, “The Vzor”).',
  // the objective just outside the porthole's glass, on its axis (vostok_cabin.py prints the porthole's place)
  at: [0.82, 3.34, 0.82],
  axis: [0.683013, 0.258819, 0.683013],
  // the ship's nose (its long axis, toward the braking engine's push) at the top of the screen, where the arrows point
  up: [0, 1, 0],
  // its centre's whole field (Gagarin: «угол зрения «взора» 7 градусов»); the ring from a degree and a half inside the horizon at
  // 350 km (71.4 degrees off the nadir) to as far outside it at 150 km (77.7): the margins are ours
  fields: [7],
  reticle: false,
  ring: { mesh: 'Vzor_Ring', from: 70, to: 79 },
};
// What a lens lit by the record says of itself: the legends a pilot's words put a time to, each on a lens of its colour
export const WHICH =
  'The legend, its colour and when it lit are the record’s; which of the 24 lenses carried it is not known, and this one is chosen.';

/** What a flight of the SIS-1-3KA gives its cabin (`sis1Cabin`). */
export interface Sis1Words {
  instruments: CabinDef['instruments'];
  lit: Record<string, Omit<NonNullable<CabinDef['lamps']>[number], 'node'>>;
  globus: string;
  code: string;
  lighting: CabinDef['lighting'];
  /** What else of the ship's own is to be named from the seat (a control of `controls` with no command). */
  more?: NonNullable<CabinDef['controls']>;
}

/** The cabin, as the flight gives it its words (`Sis1Words`). */
export function sis1Cabin(o: Sis1Words): CabinDef {
  return {
    within: ['Cabin', 'EjectionSeat'],
    // the top of the pilot's head: up the seat's rails, toward hatch No. 1 (vehicles/vostok_3ka.py `seat_node`)
    overhead: [-0.646, 0.407, -0.646],
    // a head in a helmet fixed to the suit, and the eyes' own turn: estimated, nothing read gives it. Down is far enough
    // to bring the Vzor, 26 degrees under the board, to the middle of the view
    head: { side: 1.4, up: 0.7, down: 0.5 },
    instruments: o.instruments,
    lamps: [
      ...SIGNALS.flatMap(([block, lamps, says]) =>
        Array.from({ length: lamps }, (_, i) => {
          const node = `Tele_${block}_${i + 1}`;
          const known = o.lit[node];
          return known
            ? { ...known, node }
            : { node, name: 'Signal lamp', about: `${says} Which lens says which is not established. Not simulated: it stays dark.` };
        }),
      ),
      // the signaller over the Globus: lit by the globe's second mode (`globe.modes`, below), not by a signal of the flight
      {
        node: 'Tele_Landing',
        name: '«Посадка»: landing',
        about:
          'Over the globe. It comes on when the tumbler ГЛОБУС is thrown to МЕСТО ПОСАДКИ, so that the place under the cross is not taken for where the ship is (Tyapchenko, fig. 16: “the «Посадка» signaller: switched on once the Globus tumbler on the panel is put to landing place”). It shows the tumbler, not an event of the flight: flown as it was flown, with the tumbler at the present place, it stays dark. Its colour is estimated.',
        colour: 0xffb340,
      },
    ],
    controls: [
      ...[1, 2, 3, 4, 5, 6].map((key) => ({
        node: `Ctl_Code${key}`,
        name: `Logical lock, key ${key}`,
        about: o.code,
        // (the flight deck's lock, orbitdeck.ts: pressed here or typed there, the same key)
        does: `code:${key}`,
      })),
      {
        node: 'Ctl_ManualOrientation',
        name: 'Manual orientation',
        about:
          'Under the clear cover: with the lock open, it hands the ship’s attitude to the hand controller. On the flight deck the code on the lock throws it: it stands thrown while the hand controls are free.',
        // (orbitdeck.ts: `manual` says whether it is on; it stands as the deck's hands are, `free`)
        does: 'manual',
        holds: 'free',
        says: ['Off', 'On'],
      },
      {
        node: 'Ctl_Descent3',
        name: 'Descent III',
        about:
          'Under the clear cover: the manual descent’s cycle. The crew’s table for it has the pilot, given the times from the ground (or working from his table and the Globus without them), throw the Globus to the landing place, open the lock, switch on manual orientation five minutes before and orient coarsely, then switch on «Спуск III» at its time, refine the orientation by the Vzor, and at the burn’s own later time press the braking engine’s red button (doc. 90 of March 1961, table «Спуск III»; the ground’s order was to read “switch on «Спуск III» at 21:11, switch on the TDU at 21:22”, doc. 95). So it did not fire the engine: the red button does that here, as it did. What the cycle itself set going inside the ship’s timer is in nothing read, so here it throws, stays thrown, and drives nothing.',
        says: ['Off', 'On'],
      },
      {
        node: 'Ctl_RetroFire',
        name: 'Start the braking engine',
        about: 'Red, under the clear cover: the pilot’s own command to the TDU, for a ship he has turned by the Vzor.',
        does: 'retro',
      },
      {
        node: 'Ctl_Oxygen',
        name: 'Oxygen',
        about:
          'Under the clear cover. Most likely the emergency oxygen supply: the instruction of January 1961 has the pilot, if the cabin lost its pressure, put on his gloves and “switch on the emergency oxygen supply’s tumbler”, the suit then keeping him five hours; Titov was asked after his flight whether he had thrown “the oxygen tumbler” and had not. That this tumbler is that one is our reading: no document read names the panel’s switch. The cabin’s air and the suit are not simulated, so it throws, stays thrown, and drives nothing.',
        says: ['Off', 'On'],
      },
      { node: 'Ctl_Alarm', name: 'Emergency signal', about: 'Under the clear cover: sends the alarm to the ground. Not simulated.' },
      {
        // (its two positions are in its `throw` extras, vehicles/vostok_cabin.py; it is the globe's `control`, below)
        node: 'Ctl_GlobusMode',
        name: 'Globus: present place or landing place',
        about:
          'ГЛОБУС, on the control panel’s face: МЕСТО ПОЛОЖЕНИЯ, where the ship is, or МЕСТО ПОСАДКИ, where it would come down if the braking engine were started now (Tyapchenko, fig. 16; the instruction of January 1961 has the pilot throw it over and back as a check after reaching orbit). Built at the present place, as it flew. Thrown, the globe turns to the landing place the simulator works out for a burn fired now: the real instrument advanced the globe by a fixed arc set on the ground.',
      },
      {
        node: 'Ctl_HandController',
        name: 'Hand controller',
        about:
          'A short stalk on a ball with a ribbed grip across it, at his right hand: it works the manual system’s gas jets, once the lock is open. Gagarin never used it; Titov turned Vostok 2 by it twice. On the flight deck, with the hand controls free, it moves as W S A D Q E turn the ship.',
      },
      ...(o.more ?? []),
    ],
    lighting: o.lighting,
    // the two portholes that can be looked out of, as light (vehicles/vostok_cabin.py prints them in this frame): the one in
    // hatch No. 1 over his head and the one at his right. The third is behind the Vzor
    windows: [
      { at: [-0.711, 3.477, -0.711], out: [-0.646, 0.407, -0.646], across: 0.2, name: 'Hatch porthole' },
      { at: [-0.379, 3.546, 0.894], out: [-0.345, 0.469, 0.813], across: 0.2, name: 'Right porthole' },
    ],
    // The node's own axes: +Y up the stalk, +X along the grip. That it had two axes is the maker's history (Tyapchenko);
    // which two, how the third was commanded and how far it tipped are estimated
    stick: { node: 'Ctl_HandController', throw: 0.2, pitch: [1, 0, 0], roll: [0, 0, 1], yaw: [0, 1, 0] },
    // its two modes on the one tumbler (Tyapchenko, fig. 16's caption: documented); the landing place is the simulator's
    // (derived: the real instrument advanced the globe by a fixed arc set on the ground). The «Посадка» signaller over the
    // globe lit with the second (documented, the same caption): `Tele_Landing` (vehicles/vostok_cabin.py), one of `lamps`
    globe: {
      node: 'Globus_Globe',
      name: 'Globus',
      about: o.globus,
      control: 'Ctl_GlobusMode',
      modes: [
        { says: 'Present place', shows: 'place' },
        { says: 'Landing place', shows: 'landing', lamp: 'Tele_Landing' },
      ],
    },
    periscope: VZOR,
  };
}

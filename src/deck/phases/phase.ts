import type { Figure } from '../deck.ts';

/**
 * The orbital deck's phases (orbitdeck.ts): which part of a flight it is in, chosen from the run's state at the clock's
 * instant (`phaseOf`), and what the deck shows in it (`PHASES`). One deck flies the whole flight; a phase is what changes on
 * it as the flight goes from the pad to the ground. What each phase does (the steps, the hands, the burns) is in its own
 * module beside this one: ascent.ts, coast.ts, burn.ts, entry.ts, surface.ts, each a set of functions of the deck's state.
 * A new phase is an id here, a branch of `phaseOf` on the run's state, an entry in `PHASES` and a module of its own; never a
 * second deck (AGENTS.md: the flight deck).
 *
 * The ids still to come, which `phaseOf` does not yet give: `rendezvous` (range, rate, elevation angle), `dock` (today the
 * docking deck, dockdeck.ts, a deck of its own, to be folded in), `descent` (to a body's surface: radar altitude, rate,
 * propellant, the guidance's programme). `coast` will be about the Earth or the Moon. `surface` is on either: down on the
 * Earth at the run's end (surface.ts, the card), or stood at a landing site on the Moon (`PhaseState.down` then too, the
 * stage there: app/session.ts `surface`), where the deck offers Go out and Lift off (deck.ts `onSurface`).
 */
export type PhaseId = 'ascent' | 'coast' | 'burn' | 'rendezvous' | 'dock' | 'descent' | 'surface' | 'entry';

/** What the deck reads off the flight on show to choose its phase and what the phase shows (orbitdeck.ts `show`). */
export interface PhaseState {
  /** Down: what it rode on the ground at the run's end, standing still on it, in no orbit; or the flight stood on the Moon. */
  down: boolean;
  /** The spacecraft alone: parted from its launch vehicle, not down, not struck on the pad. */
  alone: boolean;
  /** Something of the flight on show burning (the sample's motors: a braking burn, a manoeuvre). */
  burning: boolean;
  /** Coming down: through entry, or past the instant the coast hands over to the descent. */
  entering: boolean;
  /** Height above the sea, m. */
  altitude: number;
}

/** What a phase puts on the deck. Today its figures; the readings, systems, steps and keys stay the kind's (`DeckSpec`) until a phase differs in them. */
export interface Phase {
  id: PhaseId;
  /** The middle panel's figures in this phase (the first three are a phone's one line), from where the flight is. */
  figures(s: PhaseState): Figure[];
}

/** Kilometres, in metres: the unit of the figures. */
export const KM = 1000;
/** The figures going up, as a ballistic flight's; and once the spacecraft is alone, its orbit's. */
export const RISING: Figure[] = [
  { id: 'altitude', label: 'Height', unit: 'km', about: 'Height above the sea' },
  { id: 'speed', label: 'Speed', unit: 'm/s', about: 'Speed over the turning Earth (Earth-fixed)' },
  { id: 'climb', label: 'Climb', unit: 'm/s', about: 'How fast it is rising' },
  { id: 'g', label: 'Load', unit: 'g', about: 'What an accelerometer reads' },
  { id: 'mach', label: 'Mach', unit: '', about: 'Speed through the air over the speed of sound there' },
];
const ORBITING: Figure[] = [
  RISING[0]!,
  { id: 'speed', label: 'Speed', unit: 'm/s', about: 'Speed in the frame that does not turn: the orbital speed (space-fixed)' },
  { id: 'apogee', label: 'Apogee', unit: 'km', about: 'The orbit’s highest point now, over the record’s reference ball' },
  {
    id: 'perigee',
    label: 'Perigee',
    unit: 'km',
    about: 'The orbit’s lowest point now, over the same ball: under the ground, it comes down',
  },
  { id: 'period', label: 'Period', unit: 'min', about: 'Once round the orbit now' },
];
/**
 * Above the air on the launch vehicle, as KSP's: the orbit it would be on were it cut now (its osculating apsides), with
 * the space-fixed speed, so a hand can fly it to the record's orbit and cut it there.
 */
const CLIMBING: Figure[] = [
  RISING[0]!,
  ORBITING[1]!,
  RISING[2]!,
  { id: 'apogee', label: 'Apogee', unit: 'km', about: 'The highest point of the orbit it would be on were it cut now' },
  {
    id: 'perigee',
    label: 'Perigee',
    unit: 'km',
    about: 'The lowest point of the orbit it would be on were it cut now: under the ground, it comes down',
  },
];
/** The height above which the deck shows the orbit going up (`CLIMBING`): where the air's push has fallen away, m. */
export const ABOVE_AIR = 60_000;

/**
 * The phase the flight on show is in: down is the surface; on the launch vehicle (or struck on the pad) the ascent; the
 * spacecraft alone is in a burn while something burns, in entry once it comes down, and otherwise coasts.
 */
export function phaseOf(s: PhaseState): 'ascent' | 'coast' | 'burn' | 'entry' | 'surface' {
  if (s.down) return 'surface';
  if (!s.alone) return 'ascent';
  if (s.burning) return 'burn';
  if (s.entering) return 'entry';
  return 'coast';
}

/** The orbital deck's phases, as `phaseOf` chooses them. Alone, every phase shows the orbit; down, the ascent's five, at rest. */
export const PHASES: Record<ReturnType<typeof phaseOf>, Phase> = {
  ascent: { id: 'ascent', figures: (s) => (s.altitude > ABOVE_AIR ? CLIMBING : RISING) },
  coast: { id: 'coast', figures: () => ORBITING },
  burn: { id: 'burn', figures: () => ORBITING },
  entry: { id: 'entry', figures: () => ORBITING },
  surface: { id: 'surface', figures: () => RISING },
};

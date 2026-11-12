/**
 * What the viewer remembers between visits: which panels are tucked away, whether the view
 * drifts. Kept in the browser's local storage; where that is not allowed (private browsing)
 * nothing is remembered and nothing breaks.
 */
export type Pref =
  | 'panelTucked'
  | 'titleTucked'
  | 'bare'
  | 'legendOpen'
  | 'legendMore'
  | 'factsOpen'
  | 'deckKeys'
  | 'timeOpen'
  | 'orbitOff'
  | 'cel'
  | 'fly'
  | 'demo'
  | 'walkThird'
  | 'motionFull'
  | 'motionReduced'
  | 'motionOff'
  | 'walkVisor'
  | 'navballTucked'
  | 'orbitFrame'
  | 'pathOff'
  | 'pathGuided'
  | 'soundOff'
  | 'galleryLight'
  | 'galleryMeasure'
  | 'galleryNamesOff';

const KEY = 'space-race.prefs';
/** Amounts are kept apart from the switches, which are all true or false. */
export type Level = 'soundVolume';
const LEVELS = 'space-race.levels';

function read(): Partial<Record<Pref, boolean>> {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return stored && typeof stored === 'object' ? (stored as Partial<Record<Pref, boolean>>) : {}; // ("null" is valid JSON)
  } catch {
    return {};
  }
}

export const prefs = {
  get: (name: Pref): boolean => read()[name] === true,
  set(name: Pref, on: boolean): void {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...read(), [name]: on }));
    } catch {
      // not allowed here: the choice lasts until the page is closed
    }
  },
  /** A remembered amount from 0 to 1 (a volume), or `otherwise` where none has been chosen. */
  level(name: Level, otherwise: number): number {
    try {
      const v = (JSON.parse(localStorage.getItem(LEVELS) ?? '{}') as Partial<Record<Level, unknown>>)[name];
      return typeof v === 'number' && v >= 0 && v <= 1 ? v : otherwise;
    } catch {
      return otherwise;
    }
  },
  setLevel(name: Level, value: number): void {
    try {
      const all = JSON.parse(localStorage.getItem(LEVELS) ?? '{}') as Record<string, unknown>;
      localStorage.setItem(LEVELS, JSON.stringify({ ...all, [name]: Math.max(0, Math.min(1, value)) }));
    } catch {
      // not allowed here
    }
  },
};

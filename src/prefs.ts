/**
 * What the viewer remembers between visits: which panels are tucked away, whether the view
 * drifts. Kept in the browser's local storage; where that is not allowed (private browsing)
 * nothing is remembered and nothing breaks.
 */
export type Pref = 'panelTucked' | 'titleTucked' | 'bare' | 'legendFolded' | 'orbitOff' | 'cel';

const KEY = 'space-race.prefs';

function read(): Partial<Record<Pref, boolean>> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Record<Pref, boolean>>;
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
};

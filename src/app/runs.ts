/**
 * The flights flown by hand that the page keeps between visits: one for each flight at most, in the browser's local
 * storage, so a run left (for the gallery, another flight, the front page, a closed tab) can be taken up again days later.
 * What a run is and how it is flown again is the deck's (deck/tape.ts); this only keeps it, and says where there are any.
 *
 * Every access is wrapped: where storage is not allowed (a private window), is full, or holds something it cannot read,
 * nothing is kept and nothing breaks. A write says whether it took, so a way out that relies on it can ask instead
 * (deck/leaving.ts). The list of what is kept is a key of its own, small, so the front page can mark its rows without
 * reading any run.
 */

/** What is said of a kept run without reading it: where its clock was left, what it was doing, and when it was left. */
export interface RunNote {
  /** Seconds of the flight's clock it was left at. */
  t: number;
  /** What it was doing then, in the deck's words ('Powered flight'). */
  phase: string;
  /** When it was left: milliseconds since 1970, the visitor's clock. */
  left: number;
}

/** A kept run: its note, the stamp of what it was flown on (deck/tape.ts `stampOf`), and the run itself, as text. */
export interface KeptRun extends RunNote {
  flight: string;
  stamp: string;
  run: string;
}

const INDEX = 'space-race.runs';
const RUN = 'space-race.run:';
/** The most a run may take, in characters: more is not written (and the way out asks instead), so one run cannot fill the store. */
export const MOST = 1_500_000;

/** Where they are kept: the browser's local storage, or another for a test. Reaching it may itself throw. */
let store: () => Storage = () => localStorage;
/** Whether anything can be kept there at all: tried once, by writing and removing a key. */
let usable: boolean | null = null;
export function useStore(s: () => Storage): void {
  store = s;
  usable = null;
}

const isNote = (x: unknown): x is RunNote =>
  typeof x === 'object' &&
  x !== null &&
  typeof (x as RunNote).t === 'number' &&
  typeof (x as RunNote).phase === 'string' &&
  typeof (x as RunNote).left === 'number';

function index(): Record<string, RunNote> {
  try {
    const all: unknown = JSON.parse(store().getItem(INDEX) ?? '{}');
    if (!all || typeof all !== 'object') return {};
    return Object.fromEntries(Object.entries(all).filter(([, v]) => isNote(v))) as Record<string, RunNote>;
  } catch {
    return {};
  }
}

export const runs = {
  /** Whether this browser lets runs be kept (asked once a page: a private window, or storage switched off, does not). */
  usable(): boolean {
    if (usable !== null) return usable;
    try {
      const s = store();
      s.setItem(`${RUN}?`, '1');
      s.removeItem(`${RUN}?`);
      usable = true;
    } catch {
      usable = false;
    }
    return usable;
  },

  /** Every flight with a run kept, and what is said of it. */
  list: (): Record<string, RunNote> => index(),

  /** The run kept for `flight`, or null: none, or none that can be read. */
  read(flight: string): KeptRun | null {
    try {
      const x: unknown = JSON.parse(store().getItem(RUN + flight) ?? 'null');
      if (!isNote(x)) return null;
      const k = x as KeptRun;
      return k.flight === flight && typeof k.stamp === 'string' && typeof k.run === 'string' ? k : null;
    } catch {
      return null;
    }
  },

  /** Keep `run` for its flight, in place of any kept before. False: it was not kept (not allowed here, too large, the store full). */
  write(run: KeptRun): boolean {
    let s: Storage;
    let text: string;
    try {
      text = JSON.stringify(run);
      if (text.length > MOST) return false;
      s = store();
      s.setItem(RUN + run.flight, text);
    } catch {
      return false;
    }
    try {
      s.setItem(INDEX, JSON.stringify({ ...index(), [run.flight]: { t: run.t, phase: run.phase, left: run.left } }));
      return true;
    } catch {
      // (kept, but not listed: then it is not kept at all, so nothing says it is when it is not)
      try {
        s.removeItem(RUN + run.flight);
      } catch {
        // as before
      }
      return false;
    }
  },

  /** Let the run kept for `flight` go. */
  drop(flight: string): void {
    try {
      const s = store();
      s.removeItem(RUN + flight);
      const rest = index();
      delete rest[flight];
      s.setItem(INDEX, JSON.stringify(rest));
    } catch {
      // nothing could be kept here, so nothing is
    }
  },
};

/** When a run was left, in plain words: 'a moment ago', '5 minutes ago', 'today at 14:05', 'yesterday at 09:12', 'on 12 November at 09:12'. */
export function leftWhen(left: number, now = Date.now()): string {
  const ago = Math.max(0, now - left) / 1000;
  if (ago < 60) return 'a moment ago';
  if (ago < 3600) {
    const m = Math.round(ago / 60);
    return `${m} minute${m === 1 ? '' : 's'} ago`;
  }
  const then = new Date(left);
  const clock = then.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(new Date(now)) - day(then)) / 86_400_000);
  if (days <= 0) return `today at ${clock}`;
  if (days === 1) return `yesterday at ${clock}`;
  return `on ${then.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} at ${clock}`;
}

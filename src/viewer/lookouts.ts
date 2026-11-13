import type { CabinDef } from '../types.ts';

/**
 * What can be looked out of from a cabin's seat, in order: each window its data lists (`CabinDef.windows`), then its
 * periscope. Each is one act on board (a button, a digit key, a click on it): the pilot leans to it and looks out.
 * Named as the data names them; a window it does not name is "Window", or "Window 2" when there are several.
 */
export interface LookoutDef {
  name: string;
  /** Which of `CabinDef.windows` it is; absent for the periscope. */
  window?: number;
  periscope?: true;
}

export function lookoutsOf(cabin: CabinDef | undefined): LookoutDef[] {
  if (!cabin) return [];
  const windows = cabin.windows ?? [];
  const out: LookoutDef[] = windows.map((w, i) => ({ name: w.name ?? (windows.length > 1 ? `Window ${i + 1}` : 'Window'), window: i }));
  if (cabin.periscope) out.push({ name: cabin.periscope.name, periscope: true });
  return out;
}

/** Which of `windows` a point on a pane belongs to (in the same frame as their `at`): the nearest; -1 if there are none. */
export function windowAt(windows: CabinDef['windows'], point: [number, number, number]): number {
  let best = -1;
  let far = Number.POSITIVE_INFINITY;
  (windows ?? []).forEach((w, i) => {
    const d = Math.hypot(w.at[0] - point[0], w.at[1] - point[1], w.at[2] - point[2]);
    if (d < far) {
      far = d;
      best = i;
    }
  });
  return best;
}

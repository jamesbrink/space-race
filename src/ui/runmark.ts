import './runmark.css';
import { leftWhen, runs } from '../app/runs.ts';
import { missionTime } from '../world/clock.ts';

/**
 * Where a flight flown by hand is kept (app/runs.ts), the front page's row for that flight says so, quietly: a lamp, "In
 * flight" and the mission time it was left at, under its crew. Its Fly takes it up (deck.ts). Nothing of the run is read:
 * only the list of what is kept.
 */
export function markRuns(root: ParentNode): void {
  for (const [id, note] of Object.entries(runs.list())) {
    const row = [...root.querySelectorAll<HTMLElement>('[data-flight]')].find((b) => b.dataset.flight === id);
    const what = row?.querySelector('.what');
    if (!what || what.querySelector('.run-mark')) continue;
    const mark = document.createElement('span');
    mark.className = 'run-mark';
    mark.textContent = `In flight · ${missionTime(note.t)}`;
    mark.title = `Your flight is kept: ${note.phase.toLowerCase()} at ${missionTime(note.t)}, left ${leftWhen(note.left)}. Its Fly resumes it`;
    what.append(mark);
    row!.setAttribute('aria-description', `Your flight in progress, kept at ${missionTime(note.t)}`);
  }
}

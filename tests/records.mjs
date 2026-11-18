// Each orbital flight's record (its flight's orbital.ts: a Vostok's is a vostok-record.ts `VostokRecord`), which its plan
// is written from (vostok-plan.ts `vostokPlan`): for the tests that hold the record itself, or fly a plan written from a
// changed copy of it. Nothing in src/ reads a record; the flight carries only its plan.
import { globSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = join(import.meta.dirname, '..');
const url = (file) => pathToFileURL(join(root, file)).href;
const records = new Map(
  await Promise.all(
    globSync('missions/*/*/flights/*/orbital.ts', { cwd: root }).map(async (file) => [
      (await import(url(join(dirname(file), 'flight.ts')))).flight.id,
      (await import(url(file))).orbital,
    ]),
  ),
);

/** The record `flight`'s plan was written from (its orbital.ts's `orbital`). */
export function recordFrom(flight) {
  const o = records.get(flight.id) ?? (flight.plan?.record?.coastFixes ? flight.plan : undefined);
  if (!o) throw new Error(`${flight.id} has no orbital record`);
  return o;
}

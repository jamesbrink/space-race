// A prediction depends on its start as the physics does, and no more (issue #30). Every prediction the figures capture
// (tools/predictions.mjs) is made again from a start a hair apart: its place moved out from the Earth's centre by one
// part in 1e12 either way (six micrometres), and in a frame turned a nanoradian either way. Nothing it counts may change
// (its outcome, its points, its events), and each of its figures may move only by as little as that (one part in 1e9),
// or as the physics carries a hair: smoothly, as much one way as the other (the two moves equal and opposite to a tenth
// of either). A step the integrator chose, a crossing found to a step, or a point budget at its edge, each turned by the
// hair, moves a figure by the integrator's tolerance or by a step, in one direction or the other: what it held to.
import assert from 'node:assert/strict';
import { globSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { predictions } from '../tools/predictions.mjs';

const root = join(import.meta.dirname, '..');
const flights = (
  await Promise.all(
    globSync('missions/*/*/flights/*/flight.ts', { cwd: root }).map(async (f) => (await import(pathToFileURL(join(root, f)).href)).flight),
  )
).filter((f) => f.plan && f.site);
/** What a prediction counts: these do not move at all. */
const COUNTS = new Set(['outcome', 'points', 'events']);
/** A hair: the start's place out by this fraction, the frame turned by this many radians. */
const NUDGE = 1e-12;
const TURN = 1e-9;
/** As little as a hair moves a figure (relative), and how nearly a smooth move is the same either way. */
const LITTLE = 1e-9;
const EVEN = 0.1;

for (const flight of flights) {
  for (const p of predictions(flight)) {
    test(`${flight.id} ${p.run}: a hair's difference in the start moves it as the physics does`, () => {
      const base = p.make();
      for (const [what, plus, minus] of [
        ['moved out', p.make({ nudge: NUDGE }), p.make({ nudge: -NUDGE })],
        ['turned', p.make({ turn: TURN }), p.make({ turn: -TURN })],
      ]) {
        for (const [k, x] of Object.entries(base)) {
          const [a, b] = [plus[k], minus[k]];
          if (COUNTS.has(k) || typeof x !== 'number') {
            assert.equal(a, x, `${what}: ${k}`);
            assert.equal(b, x, `${what}: ${k}`);
            continue;
          }
          const [da, db] = [a - x, b - x];
          const little = Math.max(Math.abs(da), Math.abs(db)) <= LITTLE * Math.abs(x);
          const smooth = Math.abs(da + db) <= EVEN * Math.max(Math.abs(da), Math.abs(db));
          assert.ok(little || smooth, `${what}: ${k} ${x} moved by ${da} one way and ${db} the other`);
        }
      }
    });
  }
}

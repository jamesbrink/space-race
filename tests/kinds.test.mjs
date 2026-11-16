// Nothing outside the simulator and the deck registry asks what kind of flight it has. The scene, the sound, the cabin,
// the effects, the panels and the address ask the flight's run (sim/run.ts `Run`) or a question src/sim answers for any
// plan (`liftoffOf`, `brakingOf`, `signalsOf`, `chuteOf`, `bearingOf`, plan.ts `flownByHand`); the deck that flies it is
// chosen once, by its plan's kind, in src/deck/decks.ts. So a new kind of flight is new code in src/sim and a deck, and
// nothing else learns its name.
import assert from 'node:assert/strict';
import { globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const root = join(import.meta.dirname, '..');
/** Where a flight's kind may be read: the simulator, and the registry that picks a flight's deck by it. */
const allowed = (file) => file.startsWith('src/sim/') || file === 'src/deck/decks.ts';
/** A plan's kind read (`plan.kind`, `flight.plan?.kind`), or one of the kinds' names written as a string. */
const asks = [/\bplan\)?[!?]?\.kind\b/, /['"`](ballistic|orbital)['"`]/];

test('nothing outside src/sim and the deck registry branches on the kind of flight', () => {
  const files = globSync('src/**/*.ts', { cwd: root }).filter((f) => !allowed(f));
  assert.ok(files.length > 100, `${files.length} files read`);
  const found = [];
  for (const file of files) {
    const lines = readFileSync(join(root, file), 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (asks.some((re) => re.test(line))) found.push(`${file}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(found, [], `the kind of flight asked outside src/sim and src/deck/decks.ts:\n${found.join('\n')}`);
});

test('the deck registry is where a deck is chosen by the kind', () => {
  const decks = readFileSync(join(root, 'src/deck/decks.ts'), 'utf8');
  assert.match(decks, /plan\?\.kind/);
});

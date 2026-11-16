// A flight inherits its hardware's data (AGENTS.md, "One place per number"): what the type gives every flight of it is
// said once, in the programme's vehicle module, and a flight's flight.ts gives its own words and what differed on its
// ship. So no flight.ts has its own `along` (the vehicle module's places a direction round the model), and no motor in
// a flight.ts types its thrust as a number: it quotes the vehicle module's `Measure`.
import assert from 'node:assert/strict';
import { globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const root = join(import.meta.dirname, '..');
const files = globSync('missions/*/*/flights/*/flight.ts', { cwd: root }).sort();
/** Programmes whose flights do not inherit yet: each comes off as it is done. */
const NOT_YET = ['missions/ussr/voskhod/', 'missions/usa/mercury/'];

/** A number typed out: digits, the units' names in capitals, and arithmetic (`215000 * LBF`, `30.4 * 1000 * KGF`). */
const LITERAL = /^[\d.\s*/+\-()]*\d[\d.\s*/+\-()]*(\s*\*\s*[A-Z][A-Z_0-9]*)*\s*,?$/;

for (const file of files) {
  if (NOT_YET.some((p) => file.startsWith(p))) continue;
  const source = readFileSync(join(root, file), 'utf8');

  test(`${file}: no along of its own`, () => {
    assert.doesNotMatch(source, /\b(const|let|var|function)\s+along\b/, 'along belongs to the vehicle module');
  });

  test(`${file}: every thrust quotes the vehicle module`, () => {
    const typed = [...source.matchAll(/^\s*thrustN:\s*(.+)$/gm)].map((m) => m[1].trim()).filter((v) => LITERAL.test(v));
    assert.deepEqual(typed, [], 'a thrust typed as a number: quote the vehicle module’s Measure');
  });
}

test('the literal pattern knows a typed number from a quoted one', () => {
  for (const v of ['215000 * LBF,', '30.4 * 1000 * KGF,', '815900,', '1.5 * KGF', '(2 + 3) * LBF,']) assert.match(v, LITERAL, v);
  for (const v of ['THRUST.stage2.value,', 'RD107.value,', 'THRUST,', 'BLOCK_E.engine.thrust.value * 2,'])
    assert.doesNotMatch(v, LITERAL, v);
});

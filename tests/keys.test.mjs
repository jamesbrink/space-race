// The keys are one table (src/util/keys.ts): every listener asks it and every legend is drawn from it, so a key and
// what the page says of it cannot drift. Held here: no key is compared anywhere else, every entry is used, every key
// a button presses or a rig reads as held is in the table, and only keys every keyboard has are in it (AGENTS.md).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { KEYS, keysOf } from '../src/util/keys.ts';

const root = join(import.meta.dirname, '..');
const sources = execFileSync('git', ['ls-files', 'src'], { cwd: root, encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter((f) => f.endsWith('.ts') && f !== 'src/util/keys.ts')
  .map((f) => ({ file: f, text: readFileSync(join(root, f), 'utf8') }));
const names = Object.keys(KEYS);
const all = keysOf(...names);

test('no key is compared outside the table: every listener asks keys.ts', () => {
  const raw = /\be\.key\b|\be\.code\b|\.key\.toLowerCase\(\)|\bkey\s*[!=]==\s*['"]|\[['"](?:arrow\w+|escape|enter)['"]\]/;
  const found = sources.flatMap(({ file, text }) =>
    text
      .split('\n')
      .flatMap((line, i) =>
        raw.test(line) && !line.trim().startsWith('//') && !line.trim().startsWith('*') ? [`${file}:${i + 1}: ${line.trim()}`] : [],
      ),
  );
  assert.deepEqual(found, []);
});

test('every key in the table is used by something', () => {
  const unused = names.filter((n) => !sources.some(({ text }) => text.includes(`'${n}'`)));
  assert.deepEqual(unused, []);
});

test('what a button presses, and what a rig reads as held, is a key of the table', () => {
  const pressed = sources.flatMap(({ file, text }) =>
    [...text.matchAll(/data-(?:press|hold)="([^"$]+)"/g)].map((m) => [file, m[1]]).filter(([, k]) => !all.has(k)),
  );
  assert.deepEqual(pressed, [], 'data-press / data-hold');
  const held = sources
    .filter(({ file }) => /viewer\/(camera\/|fly\.ts|onfoot\/walk\.ts)/.test(file))
    .flatMap(({ file, text }) =>
      [...text.matchAll(/\bhas\(([^)]*)\)/g)]
        .flatMap((m) => [...m[1].matchAll(/'([^']*)'/g)].map((k) => [file, k[1]]))
        .filter(([, k]) => !all.has(k)),
    );
  assert.deepEqual(held, [], 'held keys');
});

test('only keys every keyboard has: letters, digits, arrows and a few of the rest; no Home, End, Page or function keys', () => {
  const allowed = /^(?:[a-z0-9]|[[\]?+=-]|arrow(?:up|down|left|right)|escape|enter|tab|shift| )$/;
  assert.deepEqual(
    [...all].filter((k) => !allowed.test(k)),
    [],
  );
});

test('every entry says what it does and where', () => {
  for (const [name, def] of Object.entries(KEYS)) {
    assert.ok(def.slots.length > 0, `${name}: no keys`);
    assert.ok(def.does.trim(), `${name}: says nothing of what it does`);
    assert.ok(def.when.trim(), `${name}: says nothing of where`);
  }
});

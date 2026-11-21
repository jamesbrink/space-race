// Code never names a flight's data: no id the flights' plans and scenes give (an event, a body, a joint, an engine, a
// tank, a thruster set, a parachute, an attitude, a craft, a record's instant, what a drop or a fire is let go or lit
// on) appears as a quoted literal in the simulator, the decks, the scene's flight code or the sound. What generic code
// needs of a flight it finds by what the thing is (fly.ts `ballisticOf`, staged.ts `stagesOf`, orbital.ts `coastEvents`,
// descent.ts `downOf`), so a new flight is flown without code being told its names, and a data id can never be
// mistaken for a word of the code's own.
import assert from 'node:assert/strict';
import { globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

const root = join(import.meta.dirname, '..');
const flights = (
  await Promise.all(
    globSync('missions/*/*/flights/*/flight.ts', { cwd: root }).map(async (f) => (await import(pathToFileURL(join(root, f)).href)).flight),
  )
).filter((f) => f.plan);

/** Every id the flights' data gives, with what each is. */
const ids = new Map();
const add = (id, what) => {
  if (typeof id === 'string' && id) ids.set(id, new Set([...(ids.get(id) ?? []), what]));
};
for (const f of flights) {
  const p = f.plan;
  for (const c of p.craft) {
    add(c.id, 'craft');
    for (const kind of ['bodies', 'joints', 'engines', 'tanks', 'thrusters', 'chutes']) for (const x of c[kind] ?? []) add(x.id, kind);
    for (const b of c.bodies) for (const m of b.crew ?? []) add(m, 'crew member');
    for (const s of c.sheds ?? []) add(s.on, 'a shed body’s on');
  }
  for (const e of p.events) {
    add(e.id, 'event');
    if (e.record) add(e.record.id, 'record');
    for (const w of e.when) if ('command' in w) add(w.command, 'command');
  }
  for (const m of p.record?.marks ?? []) add(m.id, 'mark');
  for (const a of p.attitude) add(a.id, 'attitude');
  for (const d of f.flies?.drops ?? []) {
    add(d.on, 'a drop’s on');
    add(d.under, 'a drop’s under');
  }
  for (const d of f.flies?.fires ?? []) add(d.on, 'a fire’s on');
  for (const d of f.flies?.chutes ?? []) add(d.on, 'a parachute’s on');
}

/** The code that must not name them. */
const CODE = [
  'src/sim/**/*.ts',
  'src/deck/**/*.ts',
  'src/sound/**/*.ts',
  'src/viewer/ascent.ts',
  'src/viewer/path.ts',
  'src/viewer/effects.ts',
  'src/viewer/cabin.ts',
];

test('the flights give ids to be held to', () => {
  assert.ok(flights.length >= 4, 'MR-3, MR-4, Vostok 1 and 2');
  assert.ok(ids.size > 40, `${ids.size} ids`);
});

test('no id of the flights’ data is a literal in the code that flies, shows or sounds them', () => {
  const hits = [];
  for (const file of CODE.flatMap((g) => globSync(g, { cwd: root })).sort()) {
    readFileSync(join(root, file), 'utf8')
      .split('\n')
      .forEach((line, i) => {
        // (a template literal is held by its text up to its first substitution: `stage:${i}` is 'stage:')
        for (const m of line.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`$\n]*)(?:`|\$\{)/g)) {
          const text = m[1] ?? m[2] ?? m[3];
          if (ids.has(text)) hits.push(`${file}:${i + 1}: '${text}' (${[...ids.get(text)].join(', ')})`);
        }
      });
  }
  assert.deepEqual(hits, [], `data ids named in code:\n${hits.join('\n')}`);
});

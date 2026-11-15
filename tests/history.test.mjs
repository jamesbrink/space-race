// The Lineup's history (missions/history.ts) against the flights: every date a real day in UTC and the timeline in order,
// every flight it names one the repo has (built, or listed in missions/upcoming.ts), every entry sourced and labelled,
// every first a moment on the timeline, every crew member of a built flight a person, and the text plain.
import assert from 'node:assert/strict';
import { globSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { MILESTONES, PEOPLE, PROGRAMMES, STORIES } from '../missions/history.ts';
import { upcoming } from '../missions/upcoming.ts';

const root = join(import.meta.dirname, '..');
// Found as tests/ballistic.mjs finds them: missions/index.ts imports without extensions.
const files = globSync('missions/*/*/flights/*/flight.ts', { cwd: root });
const built = await Promise.all(files.map(async (f) => (await import(pathToFileURL(join(root, f)).href)).flight));
/** Every flight id the repo knows, with its nation. */
const nations = new Map([...built.map((f) => [f.id, f.nation]), ...upcoming.map((u) => [u.id, u.nation])]);
const CONFIDENCES = new Set(['documented', 'assumed', 'derived', 'estimated']);
/** What the Lineup shows on one line of a phone. */
const SHORT = 60;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z$/;
/** Whether `s` is a day or an instant in UTC that the calendar has (no 30 February). */
const isDate = (s) =>
  (DAY.test(s) || INSTANT.test(s)) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s.slice(0, 10);

/** Every string a person reads: plain text, a blank line the only break, no exclamation marks. */
const plain = (where, s) => {
  assert.equal(typeof s, 'string', `${where}: not a string`);
  assert.ok(s.trim().length > 0, `${where}: empty`);
  assert.ok(!/[<>]/.test(s), `${where}: markup in ${JSON.stringify(s.slice(0, 60))}`);
  assert.ok(!s.includes('!'), `${where}: an exclamation mark`);
  assert.ok(!/\n(?!\n)/.test(s.replace(/\n\n/g, '')), `${where}: a line break that is not a paragraph's`);
};

test('every milestone is a real day in UTC, and the timeline is in order', () => {
  assert.ok(MILESTONES.length > 0);
  for (const m of MILESTONES) assert.ok(isDate(m.date), `${m.title}: ${m.date} is not a UTC day or instant`);
  for (let i = 1; i < MILESTONES.length; i++) {
    const a = MILESTONES[i - 1];
    const b = MILESTONES[i];
    const [da, db] = [a.date.slice(0, 10), b.date.slice(0, 10)];
    // Two moments of one day are in order by their instants where both have one.
    const ordered = da < db || (da === db && (a.date.length === 10 || b.date.length === 10 || Date.parse(a.date) <= Date.parse(b.date)));
    assert.ok(ordered, `out of order: ${a.date} ${a.title} before ${b.date} ${b.title}`);
  }
});

test('every milestone names a flight the repo has, its nation, a source and a confidence', () => {
  for (const m of MILESTONES) {
    assert.ok(m.nation === 'USA' || m.nation === 'USSR', `${m.title}: nation ${m.nation}`);
    if (m.flight !== undefined) {
      assert.ok(nations.has(m.flight), `${m.title}: no flight ${m.flight} in missions/index.ts or upcoming.ts`);
      assert.equal(m.nation, nations.get(m.flight), `${m.title}: its flight is ${nations.get(m.flight)}'s`);
    }
    plain(`${m.title}: title`, m.title);
    assert.ok(m.title.length <= SHORT, `${m.title}: title longer than ${SHORT}`);
    plain(`${m.title}: text`, m.text);
    plain(`${m.title}: source`, m.source);
    assert.ok(CONFIDENCES.has(m.confidence), `${m.title}: confidence ${m.confidence}`);
  }
  const titles = MILESTONES.map((m) => `${m.flight ?? ''} ${m.title}`);
  assert.equal(new Set(titles).size, titles.length, 'a milestone twice');
});

test('every built flight has a story, and every story a flight', () => {
  for (const f of built) assert.ok(STORIES[f.id], `${f.id} has no story in missions/history.ts`);
  for (const [id, s] of Object.entries(STORIES)) {
    assert.equal(s.flight, id, `${id}: keyed under another flight's id`);
    assert.ok(nations.has(id), `${id}: no such flight in missions/index.ts or upcoming.ts`);
    plain(`${id}: headline`, s.headline);
    assert.ok(s.headline.length <= SHORT, `${id}: headline longer than ${SHORT}`);
    plain(`${id}: story`, s.story);
    plain(`${id}: source`, s.source);
    if (s.named) {
      plain(`${id}: named`, s.named.why);
      plain(`${id}: named source`, s.named.source);
      assert.ok(CONFIDENCES.has(s.named.confidence), `${id}: named confidence ${s.named.confidence}`);
    }
  }
});

test("every story's firsts are its flight's milestones, word for word", () => {
  for (const [id, s] of Object.entries(STORIES)) {
    const own = new Set(MILESTONES.filter((m) => m.flight === id).map((m) => m.title));
    for (const first of s.firsts) {
      assert.ok(first.length <= SHORT, `${id}: first "${first}" longer than ${SHORT}`);
      assert.ok(own.has(first), `${id}: "${first}" is no milestone of this flight (${[...own].join('; ') || 'it has none'})`);
    }
  }
});

test('every person is dated, sourced, and flew flights the repo has', () => {
  const ids = PEOPLE.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, 'a person twice');
  for (const p of PEOPLE) {
    assert.match(p.id, /^[a-z-]+$/, `${p.name}: id ${p.id}`);
    plain(`${p.id}: name`, p.name);
    assert.ok(DAY.test(p.born) && isDate(p.born), `${p.id}: born ${p.born}`);
    if (p.died !== undefined) {
      assert.ok(DAY.test(p.died) && isDate(p.died), `${p.id}: died ${p.died}`);
      assert.ok(p.died > p.born, `${p.id}: died before born`);
    }
    assert.ok(p.flights.length > 0, `${p.id}: no flights`);
    for (const f of p.flights) {
      assert.ok(nations.has(f), `${p.id}: no flight ${f}`);
      assert.equal(nations.get(f), p.nation, `${p.id}: ${f} is not ${p.nation}'s`);
    }
    plain(`${p.id}: bio`, p.bio);
    plain(`${p.id}: source`, p.source);
    assert.ok(CONFIDENCES.has(p.confidence), `${p.id}: confidence ${p.confidence}`);
  }
});

test("every crew member of a built flight is a person, by the flight's own name for them", () => {
  for (const f of built) {
    for (const name of f.crew) {
      const p = PEOPLE.find((q) => q.name === name);
      assert.ok(p, `${f.id}: no person named "${name}" in missions/history.ts`);
      assert.ok(p.flights.includes(f.id), `${p.id}: flights do not include ${f.id}`);
    }
  }
});

/**
 * A name's surname, without Jr. or a numeral, and with the Russian -ий ending as either transliteration writes it:
 * 'Charles M. Duke Jr.' is 'duke'; Siddiqi's 'Dobrovolskiy' is upcoming.ts's 'Dobrovolsky'.
 */
const surname = (name) =>
  name
    .replace(/,?\s+(Jr\.?|II|III)$/i, '')
    .split(/\s+/)
    .at(-1)
    .toLowerCase()
    .replace(/iy$/, 'y');

test('every crew member of a flight to come that has a story is a person who flew it', () => {
  for (const u of upcoming) {
    if (!STORIES[u.id]) continue;
    // The line is the designation where the name is the spacecraft's, then the crew: 'Gemini-Titan 4 · Jim McDivitt · Ed White'.
    const crew = u.line.split(' · ').filter((s) => !/\d/.test(s));
    for (const name of crew) {
      const p = PEOPLE.find((q) => surname(q.name) === surname(name) && q.flights.includes(u.id));
      assert.ok(p, `${u.id}: no person ${name} who flew it`);
    }
  }
});

test('every programme is one the flights are filed under', () => {
  const ids = PROGRAMMES.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, 'a programme twice');
  for (const p of PROGRAMMES) {
    assert.ok(
      [...nations.keys()].some((f) => f.startsWith(`${p.id}/`)),
      `${p.id}: no flight's id starts with it`,
    );
    assert.equal(p.id.startsWith('usa/') ? 'USA' : 'USSR', p.nation, `${p.id}: nation`);
    assert.match(p.years, /^\d{4}(–(\d{4})?)?$/, `${p.id}: years ${p.years}`);
    for (const k of ['name', 'why', 'how', 'legacy', 'source']) plain(`${p.id}: ${k}`, p[k]);
  }
});

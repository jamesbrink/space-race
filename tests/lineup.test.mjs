// The Lineup's arithmetic (src/app/lineup/row.ts): who stands in the row and in what order, what is said of each, the
// programmes' sections, the timeline, the key figures as the flights give them, where each stands, and which level of
// detail each is granted. Held against every flight there is, so a flight that is added is held too.
import assert from 'node:assert/strict';
import { globSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MILESTONES, PEOPLE, PROGRAMMES, STORIES } from '../missions/history.ts';
import { byDate, exhibit, programmeOf, targetNodes } from '../src/app/address.ts';
import {
  allot,
  claimsFirst,
  craftNodes,
  crewOf,
  css,
  entries,
  figureText,
  headline,
  heightMarks,
  headingsOf,
  heightSpec,
  keyFigures,
  layOutRow,
  nations,
  showCard,
  SLOTS,
  sections,
  spacecraftNodes,
  timeAxis,
  timeline,
  tintOf,
  toldOf,
} from '../src/app/lineup/row.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const flights = [];
for (const file of globSync('missions/*/*/flights/*/flight.ts', { cwd: root }))
  flights.push((await import(pathToFileURL(join(root, file)).href)).flight);
const history = { milestones: MILESTONES, stories: STORIES, people: PEOPLE, programmes: PROGRAMMES };
const row = entries(flights, history);

test('the row is every flight that has a vehicle, in the order they flew', () => {
  const built = byDate(flights).filter((f) => exhibit(f));
  assert.ok(row.length > 1);
  assert.deepEqual(
    row.map((e) => e.flight.id),
    built.map((f) => f.id),
  );
  for (const e of row) assert.equal(e.vehicle, exhibit(e.flight), `${e.flight.id}: what stands there is its vehicle`);
  // (and nothing but the list decides it: one more flight is one more in the row, in its place by date)
  const one = { ...built[0], id: 'test/programme/extra', launch: '1999-01-01T00:00:00Z', nation: 'Elsewhere', program: 'Extra' };
  const more = entries([one, ...flights]);
  assert.equal(more.length, row.length + 1);
  assert.equal(more.at(-1).flight.id, 'test/programme/extra');
  assert.equal(more.at(-1).nation, nations([one, ...flights]).indexOf('Elsewhere'));
});

test('every vehicle says which of its parts are the spacecraft alone, and they are parts of it', () => {
  for (const e of row) {
    assert.ok(e.craft?.length, `${e.flight.id}: a Spacecraft heading in its parts list`);
    assert.ok(e.craft.length < e.vehicle.parts.length, `${e.flight.id}: the spacecraft is not the whole vehicle`);
    for (const node of e.craft)
      assert.ok(
        e.vehicle.parts.some((p) => p.node === node),
        `${e.flight.id}: ${node} is a part`,
      );
  }
  assert.equal(spacecraftNodes({ name: 'Vehicle', parts: [{ node: 'A', group: 'Only' }] }), null, 'one heading: nothing to part');
});

test('the spacecraft alone is what rides on the launch vehicle: its own heading, and any other that stands wholly on it', () => {
  // as Voskhod 2's parts list has it: the airlock folded against the cabin under a heading of its own, and the fairing
  // listed with the third stage it stands on
  const headings = [
    { id: 'third-stage', nodes: ['Fairing', 'BlockI'] },
    { id: 'strap-on-boosters', nodes: ['Booster_B'] },
    { id: 'spacecraft', nodes: ['DescentModule', 'InstrumentModule'] },
    { id: 'airlock', nodes: ['Airlock', 'AirlockHatch'] },
  ];
  const lowest = {
    Fairing: 34.2,
    BlockI: 27.5,
    Booster_B: 0,
    DescentModule: 37.1,
    InstrumentModule: 35.0,
    Airlock: 36.3,
    AirlockHatch: 38.9,
  };
  const craft = craftNodes(headings, (n) => lowest[n] ?? null);
  assert.deepEqual(craft, ['DescentModule', 'InstrumentModule', 'Airlock', 'AirlockHatch'], 'the airlock rides with the spacecraft');
  // (a heading that reaches below the spacecraft is the launch vehicle's, even where some of it stands higher)
  assert.ok(!craft.includes('Fairing') && !craft.includes('Booster_B'));
  // a node the model does not have says nothing; with none known, the heading alone
  assert.deepEqual(
    craftNodes(headings, () => null),
    ['DescentModule', 'InstrumentModule'],
  );
  assert.equal(
    craftNodes([{ id: 'launch-vehicle', nodes: ['A'] }], () => 0),
    null,
    'no Spacecraft heading: nothing parted',
  );
  // every vehicle's headings are its parts list's, each part under one
  for (const e of row) {
    assert.deepEqual(e.headings, headingsOf(e.vehicle));
    assert.ok(
      e.headings.some((h) => h.id === 'spacecraft'),
      `${e.flight.id}: a Spacecraft heading`,
    );
    // (what its spacecraft flew to meet is under no heading of the vehicle's: it is a third kind, and stands beside)
    assert.equal(e.headings.flatMap((h) => h.nodes).length + e.beside.length, e.vehicle.parts.filter((p) => p.group).length);
    assert.deepEqual(e.beside, targetNodes(e.vehicle));
    assert.ok(
      e.beside.every((n) => !e.headings.some((h) => h.nodes.includes(n))),
      `${e.flight.id}: its target is no heading's`,
    );
    assert.equal(e.beside.length > 0, Boolean(e.vehicle.target), `${e.flight.id}: a target is stated in the model's data`);
  }
  // a target is the model's to state (ModelDef.target), by its heading: with one, the spacecraft alone is still what
  // rides on the launch vehicle, measured without it, and the target is beside
  const stack = {
    name: 'Vehicle',
    target: 'Docking target',
    parts: [
      { node: 'Cabin', group: 'Spacecraft' },
      { node: 'Adapter', group: 'Spacecraft' },
      { node: 'Stage', group: 'Launch vehicle' },
      { node: 'Cone', group: 'Docking target' },
      { node: 'Engine', group: 'Docking target' },
    ],
  };
  assert.deepEqual(
    headingsOf(stack).map((h) => h.id),
    ['spacecraft', 'launch-vehicle'],
  );
  const low = { Cabin: 30, Adapter: 27, Stage: 0, Cone: 7, Engine: 0 };
  assert.deepEqual(
    craftNodes(headingsOf(stack), (n) => low[n]),
    ['Cabin', 'Adapter'],
  );
  assert.deepEqual(targetNodes(stack), ['Cone', 'Engine']);
  assert.deepEqual(targetNodes({ ...stack, target: undefined }), [], 'none where the model states none');
});

test('a flight the history says nothing of speaks for itself: its line is what its summary says first', () => {
  assert.equal(headline('The first American in space. A fifteen-minute arc.'), 'The first American in space');
  assert.equal(
    headline('The first crew of more than one: a pilot, an engineer and a doctor in a ball.'),
    'The first crew of more than one',
  );
  assert.equal(headline('Six times round in 9.2 hours; then home.'), 'Six times round in 9.2 hours');
  assert.equal(headline('No full stop'), 'No full stop');
  assert.ok(claimsFirst('The first walk in space'));
  assert.ok(!claimsFirst('The second American in space'));
  for (const e of entries(flights)) {
    assert.equal(e.story, null);
    assert.equal(e.headline, headline(e.flight.summary));
    assert.ok(e.headline.length > 8 && e.flight.summary.startsWith(e.headline), `${e.flight.id}: its own words`);
    assert.deepEqual(e.firsts, claimsFirst(e.headline) ? [e.headline] : []);
  }
  // with a story, the story's words are used, and the flight's figures are still its own
  const id = row[0].flight.id;
  const told = entries(flights, {
    ...history,
    stories: { [id]: { flight: id, headline: 'A line', story: 'Told.', firsts: ['One'], source: 'S' } },
  });
  assert.equal(told[0].headline, 'A line');
  assert.deepEqual(told[0].firsts, ['One']);
});

test('the history is about flights there are, or that are to come', () => {
  const ids = new Set(flights.map((f) => f.id));
  for (const id of Object.keys(STORIES)) {
    assert.equal(STORIES[id].flight, id, `${id}: a story is keyed by its flight`);
    assert.ok(ids.has(id) || /^[a-z]+\/[a-z0-9-]+\/[a-z0-9-]+$/.test(id), `${id}: a flight's id`);
  }
  for (const p of PROGRAMMES) assert.match(p.id, /^[a-z]+\/[a-z0-9-]+$/, `${p.id}: the first two words of its flights' ids`);
  // (what order they are in, and what each must say, is the history's own to hold: tests/history.test.mjs)
  assert.ok(
    MILESTONES.every((m) => Number.isFinite(Date.parse(m.date))),
    'every milestone has a date the timeline can place',
  );
});

test('each programme has its section of the row, and its own tint', () => {
  const parts = sections(row, history);
  assert.deepEqual(parts.flatMap((s) => s.flights).sort(), row.map((e) => e.flight.id).sort(), 'every vehicle is in one section');
  for (const s of parts) {
    for (const id of s.flights) assert.equal(programmeOf(id), s.id);
    assert.ok(s.name && s.years && s.nation);
  }
  // sections are in the order each first flew, and no two have the same tint
  const firsts = parts.map((s) => Date.parse(row.find((e) => e.flight.id === s.flights[0]).flight.launch));
  assert.deepEqual(
    firsts,
    [...firsts].sort((a, b) => a - b),
  );
  assert.equal(new Set(parts.map((s) => css(s.tint))).size, parts.length);
  for (const e of row) assert.deepEqual(e.tint, parts[e.programme].tint);
  // a nation's programmes are kin: nearer in hue to each other than to another nation's
  const hue = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
  assert.ok(hue(tintOf(0, 0)[0], tintOf(0, 1)[0]) < hue(tintOf(0, 0)[0], tintOf(1, 0)[0]));
  assert.ok(hue(tintOf(0, 1)[0], tintOf(1, 1)[0]) > 90, 'and the two nations stay apart');
});

test('people are put against a flight’s own crew, whatever the spelling', () => {
  const person = (name, flight) => ({
    id: name,
    name,
    born: '1930-01-01',
    nation: 'USA',
    flights: [flight],
    bio: '',
    source: '',
    confidence: 'documented',
  });
  const flight = { id: 'a/b/c', crew: ['Virgil I. Grissom', 'John W. Young'] };
  const crew = crewOf(flight, [person('John Young', 'a/b/c'), person('Virgil I. "Gus" Grissom', 'a/b/c'), person('Alan Shepard', 'x/y/z')]);
  assert.deepEqual(
    crew.map((c) => c.person?.name),
    ['Virgil I. "Gus" Grissom', 'John Young'],
  );
  assert.deepEqual(
    crewOf({ id: 'a/b/c', crew: ['Walter M. Schirra, Jr.'] }, [person('Walter M. Schirra Jr.', 'a/b/c')]).map((c) => c.person?.name),
    ['Walter M. Schirra Jr.'],
  );
  assert.deepEqual(
    crewOf(flight, []).map((c) => [c.name, c.person]),
    [
      ['Virgil I. Grissom', null],
      ['John W. Young', null],
    ],
  );
});

test('the timeline is the history’s milestones and, among them, every vehicle of the row', () => {
  const moments = timeline(row, history);
  for (const e of row)
    assert.ok(
      moments.some((m) => m.flight === e.flight.id && m.built),
      `${e.flight.id} is on the timeline`,
    );
  const days = moments.map((m) => new Date(m.date).toISOString().slice(0, 10));
  assert.deepEqual(days, [...days].sort(), 'day by day, in order');
  // a milestone that is a flight of the row takes that flight's place; one that is not is there too, and is not a way in
  const id = row[1].flight.id;
  const with_ = timeline(row, {
    ...history,
    milestones: [
      { date: '1957-10-04', nation: 'USSR', title: 'A satellite', text: 'T', source: 'S', confidence: 'documented' },
      {
        date: row[1].flight.launch,
        flight: id,
        nation: row[1].flight.nation,
        title: 'Told',
        text: 'T',
        source: 'S',
        confidence: 'documented',
      },
    ],
  });
  assert.equal(with_.filter((m) => m.flight === id).length, 1);
  assert.equal(with_.find((m) => m.flight === id).title, 'Told');
  assert.deepEqual([with_[0].title, with_[0].built, with_[0].flight], ['A satellite', false, null]);
  const axis = timeAxis(with_.map((m) => m.date));
  assert.equal(axis.years[0], 1957);
  assert.ok(axis.at.every((t) => t >= 0 && t <= 1));
  assert.deepEqual(timeAxis([]).years, []);
});

test('a flight’s gallery is told what the history tells of it, and nothing of a flight it has no story for', () => {
  for (const f of flights) {
    const told = toldOf(f, history);
    if (!STORIES[f.id]) {
      assert.equal(told, null, `${f.id}: no story, so no History tab`);
      continue;
    }
    assert.equal(told.story, STORIES[f.id]);
    assert.equal(told.programme?.id ?? programmeOf(f.id), programmeOf(f.id), `${f.id}: its own programme`);
    assert.ok(told.programme, `${f.id}: the history tells of its programme`);
    assert.deepEqual(
      told.crew.map((c) => c.name),
      f.crew,
      `${f.id}: its crew as the flight names them`,
    );
    for (const { name, person } of told.crew) assert.ok(person?.flights.includes(f.id), `${f.id}: ${name} has a story of their own`);
    assert.ok(
      told.milestones.every((m) => m.flight === f.id),
      `${f.id}: only its own moments`,
    );
    assert.deepEqual(
      told.milestones,
      MILESTONES.filter((m) => m.flight === f.id),
    );
  }
  // (a flight the history has never heard of: nothing, rather than an empty section)
  assert.equal(toldOf({ id: 'test/fixture/vehicle-only', crew: [] }, history), null);
  assert.equal(toldOf(flights[0]), null);
});

test('the show says of each what the history says first, and stays as long as it takes to read', () => {
  for (const e of row) {
    const card = showCard(e, 9);
    assert.ok(card.dwell >= 9);
    if (e.story) {
      assert.equal(card.lead, e.story.headline, `${e.flight.id}: its headline`);
      assert.ok(e.story.story.startsWith(card.text), `${e.flight.id}: the start of its story`);
      assert.ok(!card.text.includes('\n'), `${e.flight.id}: one paragraph`);
      const words = `${card.lead} ${card.text}`.split(/\s+/).length;
      assert.ok(card.dwell >= words / 4, `${e.flight.id}: ${card.dwell} s for ${words} words`);
    } else assert.deepEqual([card.lead, card.text], ['', e.flight.summary]);
  }
  const bare = { flight: { summary: 'Its own words.' }, story: null };
  assert.deepEqual(showCard(bare, 9), { lead: '', text: 'Its own words.', dwell: 9 });
});

test('every flight’s key figures are its own: a spec or a check of that flight, with its confidence', () => {
  for (const f of flights) {
    const figures = keyFigures(f);
    for (const x of figures) {
      const spec = f.specs.find((s) => s.label === x.label && s.value === x.value && s.unit === x.unit);
      const check = f.checks?.find((c) => c.label === x.label && c.value === x.value);
      assert.ok(spec || check, `${f.id}: ${x.name} is a figure the flight gives`);
      assert.equal(x.confidence, (spec ?? check).confidence, `${f.id}: ${x.name} keeps its confidence`);
    }
    const slots = figures.map((x) => x.slot);
    assert.deepEqual(
      slots,
      SLOTS.map(([slot]) => slot).filter((s) => slots.includes(s)),
      `${f.id}: in the card's order, none twice`,
    );
    if (!exhibit(f)) continue;
    const had = Object.fromEntries(figures.map((x) => [x.slot, x]));
    // every vehicle built so far says how tall it stood and how long its spacecraft is
    assert.ok(had.height && had.height.unit === 'm' && had.height.value > 10 && had.height.value < 120, `${f.id}: its height on the pad`);
    assert.ok(had.craftLength && had.craftLength.value < had.height.value, `${f.id}: its spacecraft's length`);
    // (what a flight does not give is not shown: Liberty Bell 7 gives no mass of its spacecraft yet)
    if (had.craftMass) assert.equal(had.craftMass.unit, 'kg');
    if (had.liftoff && had.craftMass)
      assert.ok(had.liftoff.value > had.craftMass.value, `${f.id}: the whole vehicle outweighs its spacecraft`);
  }
});

test('a figure is written in a unit that reads, from the flight’s own number', () => {
  assert.equal(figureText(25.414, 'm'), '25.41 m');
  assert.equal(figureText(160975.84, 'm'), '161.0 km');
  assert.equal(figureText(181, 'km'), '181 km');
  assert.equal(figureText(287000, 'kg'), '287,000 kg');
  assert.equal(figureText(17723, 's'), '4 h 55 min 23 s');
  assert.equal(figureText(123589, 's'), '1 d 10 h 19 min');
  assert.equal(figureText(922, 's'), '15 min 22 s');
  assert.equal(figureText(5309, 's'), '88 min 29 s');
  assert.equal(figureText(7200, 's'), '2 h 0 min');
  assert.equal(figureText(89.44, 'min'), '89.44 min');
  assert.equal(figureText(64.95, 'deg'), '64.95°');
  const f = flights.find((x) => x.id === 'usa/mercury/mr-3-freedom-7');
  assert.equal(heightSpec(f, 25.41).label, 'Height on the pad');
  assert.equal(heightSpec(f, 31), null, 'no figure of the flight’s within a hundredth: as modelled');
});

test('the row is laid out with the same clear floor between every two, about its middle', () => {
  const widths = [3.9, 10.3, 3.9, 10.3, 4.9, 10.3, 3];
  const { at, gap, length } = layOutRow(widths);
  assert.equal(gap, 0.5 * 10.3, 'half the widest’s width');
  assert.equal(layOutRow([...widths, 3, 3, 3]).gap, gap, 'and no other for narrower ones being added');
  for (let i = 1; i < at.length; i++)
    assert.ok(Math.abs(at[i] - widths[i] / 2 - (at[i - 1] + widths[i - 1] / 2) - gap) < 1e-9, 'the same floor between neighbours');
  assert.ok(Math.abs(at[0] - widths[0] / 2 + length / 2) < 1e-9 && Math.abs(at.at(-1) + widths.at(-1) / 2 - length / 2) < 1e-9, 'centred');
  assert.equal(layOutRow([0.2, 0.3]).gap, 1, 'never under a metre');
  assert.deepEqual(layOutRow([]).at, []);
  assert.deepEqual(layOutRow([4]).at, [0]);
});

test('the heights ruled suit what stands there', () => {
  assert.deepEqual(heightMarks(44.16), { major: 10, minor: 5, top: 50 });
  assert.deepEqual(heightMarks(38.36), { major: 10, minor: 5, top: 40 });
  assert.deepEqual(heightMarks(7.91), { major: 2, minor: 1, top: 8 });
  assert.deepEqual(heightMarks(110.6), { major: 20, minor: 10, top: 120 });
  assert.deepEqual(heightMarks(40), { major: 10, minor: 5, top: 40 });
});

test('the finest levels go to what is looked at, as far as the device can hold', () => {
  const cost = [60, 20, 0];
  const ask = (wanted, near) => ({ wanted, near, cost });
  // room for all: each has what it asks
  assert.deepEqual(allot([ask(0, 2), ask(1, 1), ask(2, 3)], 1000), [0, 1, 2]);
  // room for one in full: the nearest has it, the next the finest that still fits, the last the coarsest
  assert.deepEqual(allot([ask(0, 3), ask(0, 1), ask(0, 2)], 90), [2, 0, 1]);
  // none to spare: everything at the coarsest, which costs nothing
  assert.deepEqual(allot([ask(0, 1), ask(0, 2)], 0), [2, 2]);
  // nothing is ever given a finer level than it asked for
  assert.deepEqual(allot([ask(2, 1), ask(1, 2)], 1000), [2, 1]);
  // the one chosen is first whatever its place
  assert.deepEqual(allot([ask(0, 1), ask(0, -1)], 60), [2, 0]);
  let total = 0;
  const many = Array.from({ length: 19 }, (_, i) => ask(0, i));
  for (const level of allot(many, 300)) total += cost[level];
  assert.ok(total <= 300, 'never over the allowance');
});

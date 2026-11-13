// The address bar and the places a flight is seen in (src/address.ts): what an address names,
// which places a flight has, which it opens in, and what the gallery is given to show.
import assert from 'node:assert/strict';
import { globSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  byDate,
  entrances,
  exhibit,
  flightFor,
  formatAddress,
  galleryAt,
  galleryFlight,
  lacks,
  opensIn,
  PLACES,
  parseAddress,
  plinths,
  plinthViews,
  scaleFigure,
  WHOLE_VIEW,
} from '../src/address.ts';
import { flight as fixture } from './fixtures/vehicle-only/flight.ts';

// (every flight there is, found as tests/flights.test.mjs finds them)
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const flights = [];
for (const file of globSync('missions/*/*/flights/*/flight.ts', { cwd: root }))
  flights.push((await import(pathToFileURL(join(root, file)).href)).flight);
const mr3 = flights.find((f) => f.id === 'usa/mercury/mr-3-freedom-7');
const vostok = flights.find((f) => f.id === 'ussr/vostok/vostok-1');
const MR3 = 'usa/mercury/mr-3-freedom-7';

test('an address names a flight, a place and what is on show there', () => {
  assert.deepEqual(parseAddress(''), { flightId: '', place: null, what: '' });
  assert.deepEqual(parseAddress('#'), { flightId: '', place: null, what: '' });
  assert.deepEqual(parseAddress(`#${MR3}`), { flightId: MR3, place: null, what: '' });
  assert.deepEqual(parseAddress(`#${MR3}/gallery`), { flightId: MR3, place: 'gallery', what: '' });
  assert.deepEqual(parseAddress(`#${MR3}/gallery/CrewCabin`), { flightId: MR3, place: 'gallery', what: 'CrewCabin' });
  assert.deepEqual(parseAddress(`#${MR3}/site`), { flightId: MR3, place: 'site', what: '' });
  assert.deepEqual(parseAddress(`#${MR3}/site/pad`), { flightId: MR3, place: 'site', what: 'pad' });
  assert.deepEqual(parseAddress(`#${MR3}/fly`), { flightId: MR3, place: 'fly', what: '' });
});

test('addresses older than the places still land where they did', () => {
  // a section of the site, with the flight named and without: what every tool and script uses (#pad)
  for (const model of ['vehicle', 'pad', 'crew']) {
    assert.deepEqual(parseAddress(`#${MR3}/${model}`), { flightId: MR3, place: 'site', what: model });
    assert.deepEqual(parseAddress(`#${model}`), { flightId: '', place: 'site', what: model });
  }
  // the places have the same short form
  assert.deepEqual(parseAddress('#gallery'), { flightId: '', place: 'gallery', what: '' });
  assert.deepEqual(parseAddress('#gallery/Hatch'), { flightId: '', place: 'gallery', what: 'Hatch' });
  assert.deepEqual(parseAddress('#site/pad'), { flightId: '', place: 'site', what: 'pad' });
  assert.deepEqual(parseAddress('#fly'), { flightId: '', place: 'fly', what: '' });
});

test('an address written is the address read', () => {
  for (const [id, place, what] of [
    [MR3, 'site', 'pad'],
    [MR3, 'site', ''],
    [MR3, 'fly', ''],
    ['ussr/vostok/vostok-1', 'gallery', ''],
    ['ussr/vostok/vostok-1', 'gallery', 'DescentModule'],
    ['ussr/vostok/vostok-1', 'gallery', 'instrument-module'],
  ])
    assert.deepEqual(parseAddress(formatAddress(id, place, what)), { flightId: id, place, what });
  assert.equal(formatAddress(MR3, 'site', 'pad'), `#${MR3}/site/pad`);
  assert.equal(formatAddress(MR3, 'gallery'), `#${MR3}/gallery`);
  // the flight deck has nothing further to name
  assert.equal(formatAddress(MR3, 'fly', 'vehicle'), `#${MR3}/fly`);
});

test('no model is called by a place`s word, which an address reads as the place', () => {
  for (const f of [...flights, fixture]) for (const m of f.models) assert.ok(!PLACES.includes(m.id), `${f.id}: a model called ${m.id}`);
});

test('the flight an address is about', () => {
  // the first listed is the one an address that names no flight means (#pad): the page's own list is in this order
  const listed = [mr3, vostok];
  assert.equal(flightFor(listed, `#${vostok.id}/gallery`), vostok);
  assert.equal(flightFor(listed, `#${MR3}/pad`), mr3);
  for (const old of ['#pad', '#vehicle', '#crew', '#gallery', '#fly']) assert.equal(flightFor(listed, old), mr3, old);
  // the front page names nothing: the first that flew turns behind it
  assert.equal(flightFor(listed, ''), vostok);
  assert.equal(flightFor(listed, '#'), vostok);
  assert.deepEqual(
    byDate(listed).map((f) => f.id),
    [vostok.id, MR3],
  );
  assert.deepEqual(listed, [mr3, vostok], 'the list itself is left in its order');
  // a flight nobody has heard of is the front page's
  assert.equal(flightFor(listed, '#no/such/flight'), vostok);
});

test('every flight has the same three places, and opens in its gallery', () => {
  assert.deepEqual(PLACES, ['gallery', 'site', 'fly']);
  for (const f of [...flights, fixture]) {
    assert.deepEqual(Object.keys(entrances(f)), PLACES);
    assert.equal(opensIn(f), 'gallery', f.id);
    for (const place of PLACES) assert.equal(entrances(f)[place], lacks(f, place) === null);
  }
});

test('Vostok 1 has its gallery and its launch site, and no flight deck yet', () => {
  assert.deepEqual(entrances(vostok), { gallery: true, site: true, fly: false });
  assert.equal(lacks(vostok, 'fly'), 'Fly: no trajectory yet');
  assert.equal(opensIn(vostok), 'gallery');
  assert.equal(opensIn(vostok, 'site'), 'site');
  assert.equal(opensIn(vostok, 'fly'), 'gallery');
});

test('Freedom 7 has all three places', () => {
  assert.deepEqual(entrances(mr3), { gallery: true, site: true, fly: true });
  for (const place of PLACES) assert.equal(opensIn(mr3, place), place);
});

test('a flight that is only its vehicle has the gallery, and says why it has no more', () => {
  assert.equal(fixture.site, undefined);
  assert.equal(fixture.trajectory, undefined);
  assert.equal(fixture.models.length, 1);
  assert.deepEqual(entrances(fixture), { gallery: true, site: false, fly: false });
  assert.equal(lacks(fixture, 'gallery'), null);
  assert.equal(lacks(fixture, 'site'), 'Launch site: not built yet');
  assert.equal(lacks(fixture, 'fly'), 'Fly: no trajectory yet');
  // whatever is asked for, it opens where it can be seen
  for (const place of PLACES) assert.equal(opensIn(fixture, place), 'gallery');
  // a site said but nothing built to stand there is no site to go to
  assert.equal(
    lacks({ ...vostok, models: vostok.models.map((m) => ({ ...m, backdrop: 'studio' })) }, 'site'),
    'Launch site: not built yet',
  );
  // a trajectory with no site to fly from is not to be flown either, and says which it lacks
  assert.equal(lacks({ ...mr3, site: undefined }, 'fly'), 'Fly: its launch site is not built yet');
  assert.equal(lacks({ ...mr3, trajectory: undefined }, 'fly'), 'Fly: no trajectory yet');
  assert.equal(lacks({ ...mr3, trajectory: undefined }, 'site'), null);
  // and a flight with nothing to exhibit has no gallery: it opens at its site
  const bare = { ...mr3, models: mr3.models.filter((m) => m.walker || m.sequence), flies: undefined };
  assert.equal(lacks(bare, 'gallery'), 'Gallery: no vehicle built yet');
  assert.equal(opensIn(bare), 'site');
});

test('the gallery shows the vehicle: what the flight flies, or its first hardware that is neither a person nor a place at work', () => {
  assert.equal(exhibit(mr3).id, mr3.flies.model);
  assert.equal(exhibit({ ...mr3, flies: undefined }).id, 'vehicle');
  assert.equal(exhibit(fixture).id, 'vehicle');
  assert.equal(scaleFigure(mr3).id, 'crew');
  assert.equal(scaleFigure(fixture), null);
});

test('what can stand in the gallery comes from the headings of the parts list', () => {
  const vehicle = exhibit(mr3);
  const all = plinths(vehicle);
  assert.deepEqual(
    all.map((p) => p.id),
    ['whole', 'spacecraft', 'launch-vehicle'],
  );
  assert.equal(all[0].label, 'Whole vehicle');
  assert.equal(all[0].nodes, null);
  // every part stands in exactly one of the choices that are not the whole
  const listed = all.slice(1).flatMap((p) => p.nodes);
  assert.deepEqual([...listed].sort(), vehicle.parts.map((p) => p.node).sort());
  assert.ok(all[1].nodes.includes('CrewCabin') && !all[1].nodes.includes('RedstoneEngine'));
  // a vehicle with no headings is only ever shown whole
  assert.deepEqual(
    plinths(exhibit(fixture)).map((p) => p.id),
    ['whole'],
  );
});

test('a gallery address names a part, or what stands there', () => {
  const vehicle = exhibit(mr3);
  assert.deepEqual(galleryAt(vehicle, ''), { plinth: plinths(vehicle)[0], part: null });
  const part = galleryAt(vehicle, 'CrewCabin');
  assert.equal(part.part, 'CrewCabin');
  assert.equal(part.plinth.id, 'whole');
  assert.equal(galleryAt(vehicle, 'spacecraft').plinth.id, 'spacecraft');
  assert.equal(galleryAt(vehicle, 'spacecraft').part, null);
  // what names nothing is the whole of it, not an error
  assert.deepEqual(galleryAt(vehicle, 'NoSuchThing'), { plinth: plinths(vehicle)[0], part: null });
});

test('the views of what stands there are the vehicle`s own, of parts that are there', () => {
  const vehicle = exhibit(mr3);
  const [whole, spacecraft, booster] = plinths(vehicle);
  const ids = (p) => plinthViews(vehicle, p).map((v) => v.id);
  assert.equal(ids(whole)[0], WHOLE_VIEW);
  for (const id of ['spacecraft', 'capsule', 'engine']) assert.ok(ids(whole).includes(id), id);
  // the spacecraft alone: its capsule, but not the engine, and not itself a second time
  assert.deepEqual(ids(spacecraft), [WHOLE_VIEW, 'capsule']);
  assert.deepEqual(ids(booster), [WHOLE_VIEW, 'engine']);
  // a view is of parts wherever they are: none of these carries a height or a span measured on the pad
  for (const p of [whole, spacecraft, booster])
    for (const v of plinthViews(vehicle, p)) assert.ok(v.centreY === undefined && v.span === undefined);
  // a view that is a height and a span is of the whole vehicle where its flight stood it: kept with the whole of it on
  // show, raised by as much as the vehicle stands higher here, from the direction it gives; and not with a part of it
  const measured = { views: [{ id: 'engine', label: 'Engine', centreY: 2.5, span: 2.6, from: [0, -0.5, 1] }, ...vehicle.views] };
  const engine = plinthViews(measured, whole, -0.5).find((v) => v.id === 'engine');
  assert.deepEqual(engine, { id: 'engine', label: 'Engine', centreY: 2, span: 2.6, from: [0, -0.5, 1] });
  assert.ok(!plinthViews(measured, spacecraft, -0.5).some((v) => v.id === 'engine'));
  // and a view of parts keeps the direction it is to be seen from
  const sided = { views: [{ id: 'hatch', label: 'Hatch', nodes: ['Hatch'], from: [1, 0, 0] }] };
  assert.deepEqual(plinthViews(sided, whole)[1].from, [1, 0, 0]);
  // given for a vehicle its flight turns on its pad (as the scene has it), and turned back for one standing as built
  const turned = { ...sided, rotationY: Math.PI / 2 };
  const back = plinthViews(turned, whole)[1].from;
  for (const [i, v] of [0, 0, 1].entries()) assert.ok(Math.abs(back[i] - v) < 1e-12, `${back}`);
});

test('the gallery`s stage is given the vehicle alone, in the studio, with nothing of the site', () => {
  for (const f of [mr3, fixture]) {
    const staged = galleryFlight(f);
    assert.equal(staged.models.length, 1);
    const [model] = staged.models;
    assert.equal(model.backdrop, 'studio');
    assert.equal(model.home, WHOLE_VIEW);
    assert.ok(model.views.some((v) => v.id === WHOLE_VIEW));
    for (const key of ['walker', 'seats', 'sequence', 'with', 'position', 'rotationY']) assert.equal(model[key], undefined, key);
    for (const key of ['site', 'trajectory', 'checks', 'flies', 'surroundings']) assert.equal(staged[key], undefined, key);
    // the parts, the slider and the cutaway are the vehicle's own, untouched
    assert.deepEqual(model.parts, exhibit(f).parts);
    assert.deepEqual(model.slider, exhibit(f).slider);
    assert.equal(model.cutaway, exhibit(f).cutaway);
    assert.deepEqual(entrances(staged), { gallery: true, site: false, fly: false });
  }
  // the flight it was made from is not changed by it
  assert.ok(mr3.site && mr3.trajectory && exhibit(mr3).position);
});

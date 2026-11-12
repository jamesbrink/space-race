// The address bar and the two places a flight can be seen in (src/address.ts): what an address
// names, which ways in a flight has, and what the gallery is given to show.
import assert from 'node:assert/strict';
import { globSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  entrances,
  exhibit,
  formatAddress,
  GALLERY,
  galleryAt,
  galleryFlight,
  opensIn,
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

test('an address names a flight, a place and what is on show there', () => {
  assert.deepEqual(parseAddress(''), { flightId: '', place: null, what: '' });
  assert.deepEqual(parseAddress('#'), { flightId: '', place: null, what: '' });
  assert.deepEqual(parseAddress('#usa/mercury/mr-3-freedom-7'), { flightId: 'usa/mercury/mr-3-freedom-7', place: null, what: '' });
  assert.deepEqual(parseAddress('#usa/mercury/mr-3-freedom-7/pad'), { flightId: 'usa/mercury/mr-3-freedom-7', place: 'site', what: 'pad' });
  assert.deepEqual(parseAddress('#usa/mercury/mr-3-freedom-7/gallery'), {
    flightId: 'usa/mercury/mr-3-freedom-7',
    place: 'gallery',
    what: '',
  });
  assert.deepEqual(parseAddress('#usa/mercury/mr-3-freedom-7/gallery/CrewCabin'), {
    flightId: 'usa/mercury/mr-3-freedom-7',
    place: 'gallery',
    what: 'CrewCabin',
  });
});

test('addresses made when there was one flight still work', () => {
  assert.deepEqual(parseAddress('#vehicle'), { flightId: '', place: 'site', what: 'vehicle' });
  assert.deepEqual(parseAddress('#crew'), { flightId: '', place: 'site', what: 'crew' });
  // and the gallery has the same short form
  assert.deepEqual(parseAddress('#gallery'), { flightId: '', place: 'gallery', what: '' });
  assert.deepEqual(parseAddress('#gallery/Hatch'), { flightId: '', place: 'gallery', what: 'Hatch' });
});

test('an address written is the address read', () => {
  for (const [id, place, what] of [
    ['usa/mercury/mr-3-freedom-7', 'site', 'pad'],
    ['usa/mercury/mr-3-freedom-7', 'site', ''],
    ['ussr/vostok/vostok-1', 'gallery', ''],
    ['ussr/vostok/vostok-1', 'gallery', 'DescentModule'],
    ['ussr/vostok/vostok-1', 'gallery', 'launch-vehicle'],
  ]) {
    const hash = formatAddress(id, place, what);
    assert.ok(hash.startsWith(`#${id}`), hash);
    const read = parseAddress(hash);
    assert.equal(read.flightId, id);
    // (an address that names only the flight does not say where: it opens where the flight opens)
    assert.equal(read.place, place === 'site' && !what ? null : place);
    assert.equal(read.what, what);
  }
});

test('no model is called by the gallery`s word, which an address reads as the place', () => {
  for (const f of [...flights, fixture]) for (const m of f.models) assert.notEqual(m.id, GALLERY, `${f.id}: a model called ${GALLERY}`);
});

test('a flight with a site has both ways in, and opens at its site', () => {
  assert.deepEqual(entrances(mr3), { site: true, gallery: true });
  assert.equal(opensIn(mr3), 'site');
  assert.equal(opensIn(mr3, 'gallery'), 'gallery');
  assert.equal(opensIn(mr3, 'site'), 'site');
});

test('a flight that is only its vehicle has the gallery only, whatever is asked for', () => {
  assert.equal(fixture.site, undefined);
  assert.equal(fixture.trajectory, undefined);
  assert.equal(fixture.models.length, 1);
  assert.deepEqual(entrances(fixture), { site: false, gallery: true });
  assert.equal(opensIn(fixture), 'gallery');
  assert.equal(opensIn(fixture, 'site'), 'gallery');
  // one that says where it flew from but has built nothing to stand there is no different
  const located = { ...fixture, site: mr3.site };
  assert.deepEqual(entrances(located), { site: false, gallery: true });
  // and one with nothing to exhibit has no gallery
  assert.deepEqual(entrances({ ...mr3, models: mr3.models.filter((m) => m.walker || m.sequence), flies: undefined }), {
    site: true,
    gallery: false,
  });
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
  // a view is of parts wherever they are: none carries a height or a span measured on the pad
  for (const p of [whole, spacecraft, booster])
    for (const v of plinthViews(vehicle, p)) assert.ok(v.centreY === undefined && v.span === undefined && v.from === undefined);
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
    assert.equal(entrances(staged).site, false);
  }
  // the flight it was made from is not changed by it
  assert.ok(mr3.site && mr3.trajectory && exhibit(mr3).position);
});

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
  listed,
  namesNothing,
  openingFor,
  opensIn,
  PLACES,
  parseAddress,
  plinths,
  plinthViews,
  samePlace,
  scaleFigure,
  settle,
  WHOLE_VIEW,
  write,
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
  // an address that names nothing is the front page's, which is no flight's (front.ts): asked all the same, the first listed
  for (const nothing of ['', '#', '#/', '#//']) assert.ok(namesNothing(nothing), `"${nothing}" names nothing`);
  for (const something of ['#pad', '#vehicle', '#gallery', '#fly', `#${MR3}`, `#${MR3}/site/pad`, '#no/such/flight'])
    assert.ok(!namesNothing(something), `"${something}" names something`);
  assert.equal(flightFor(listed, ''), mr3);
  assert.equal(flightFor(listed, '#'), mr3);
  assert.deepEqual(
    byDate(listed).map((f) => f.id),
    [vostok.id, MR3],
  );
  assert.deepEqual(listed, [mr3, vostok], 'the list itself is left in its order');
  // a flight nobody has heard of is the front page's
  assert.equal(flightFor(listed, '#no/such/flight'), mr3);
});

test('every flight has the same three places, and opens in its gallery', () => {
  assert.deepEqual(PLACES, ['gallery', 'site', 'fly']);
  for (const f of [...flights, fixture]) {
    assert.deepEqual(Object.keys(entrances(f)), PLACES);
    assert.equal(opensIn(f), 'gallery', f.id);
    for (const place of PLACES) assert.equal(entrances(f)[place], lacks(f, place) === null);
  }
});

test('Vostok 1 has all three places: its flight deck is lit by its ascent to orbit, with no trajectory', () => {
  assert.equal(vostok.trajectory, undefined);
  assert.deepEqual(entrances(vostok), { gallery: true, site: true, fly: true });
  assert.equal(opensIn(vostok), 'gallery');
  assert.equal(opensIn(vostok, 'site'), 'site');
  assert.equal(opensIn(vostok, 'fly'), 'fly');
  // without its ascent it would not be
  const { orbital, ...rest } = vostok;
  assert.equal(lacks({ ...rest, orbital: { ...orbital, ascent: undefined } }, 'fly'), 'Fly: no trajectory yet');
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
  assert.deepEqual(galleryAt(vehicle, ''), { plinth: plinths(vehicle)[0], part: null, seat: null });
  const part = galleryAt(vehicle, 'CrewCabin');
  assert.equal(part.part, 'CrewCabin');
  assert.equal(part.plinth.id, 'whole');
  assert.equal(galleryAt(vehicle, 'spacecraft').plinth.id, 'spacecraft');
  assert.equal(galleryAt(vehicle, 'spacecraft').part, null);
  // what names nothing is the whole of it, not an error
  assert.deepEqual(galleryAt(vehicle, 'NoSuchThing'), { plinth: plinths(vehicle)[0], part: null, seat: null });
});

test('a gallery address names a seat to sit in, by its node, and it is a choice within the gallery', () => {
  const gt3 = flights.find((f) => f.id === 'usa/gemini/gt-3');
  const vehicle = exhibit(gt3);
  // each of the vehicle's seats, by its node: sat in with the whole vehicle standing, nothing chosen
  vehicle.seats.forEach((seat, i) => assert.deepEqual(galleryAt(vehicle, seat.node), { plinth: plinths(vehicle)[0], part: null, seat: i }));
  // a link straight into Grissom's seat comes back to it, and is the gallery's own entry in the history
  const into = formatAddress(gt3.id, 'gallery', 'Seat_CommandPilot');
  assert.equal(into, '#usa/gemini/gt-3/gallery/Seat_CommandPilot');
  assert.deepEqual(parseAddress(into), { flightId: gt3.id, place: 'gallery', what: 'Seat_CommandPilot' });
  assert.ok(samePlace(into, formatAddress(gt3.id, 'gallery')), 'sitting down is not going anywhere');
  assert.ok(samePlace(into, formatAddress(gt3.id, 'gallery', 'Seat_Pilot')), 'nor is moving to the other seat');
  // a vehicle with no seats has none to name: the word is nothing, and the whole of it is shown
  assert.equal(galleryAt({ ...vehicle, seats: undefined }, 'Seat_Pilot').seat, null);
  // a part's node is a part before it is anything else
  assert.equal(galleryAt(vehicle, 'CrewStation').part, 'CrewStation');
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
    for (const key of ['walker', 'sequence', 'with', 'position', 'rotationY']) assert.equal(model[key], undefined, key);
    // its seats are kept to be sat in where it stands, each as the vehicle has it but for whoever stood outside it
    assert.deepEqual(
      model.seats,
      exhibit(f).seats?.map(({ figure: _figure, ...seat }) => seat),
    );
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

test('the front page lists the flights there are and those to come, in the order they flew', async () => {
  const { upcoming } = await import('../missions/upcoming.ts');
  const all = listed(flights);
  for (let i = 1; i < all.length; i++)
    assert.ok(Date.parse(all[i - 1].launch) <= Date.parse(all[i].launch), `${all[i].id} is in its order`);
  assert.equal(new Set(all.map((f) => f.id)).size, all.length, 'nothing is listed twice');
  for (const f of flights) assert.ok(all.includes(f), `${f.id} is listed`);
  // the first ten crewed flights are all there, built or to come
  assert.ok(all.length >= 10, `${all.length} listed`);
  // one to come gives way to the flight that takes its id, and to nothing else
  const [first] = upcoming;
  const built = { id: first.id, launch: `${first.launch}T06:00:00Z`, callsign: 'built' };
  const after = listed([...flights, built]);
  assert.ok(after.includes(built) && !after.includes(first), 'the flight has taken its place');
  assert.equal(after.length, listed(flights).includes(first) ? all.length : all.length + 1);
  // and each is a day, with a name and a line to say
  for (const u of upcoming) {
    assert.match(u.launch, /^\d{4}-\d{2}-\d{2}$/, `${u.id}: a day`);
    assert.ok(u.name && u.line && u.nation, `${u.id} says what it is`);
    assert.match(u.id, /^[a-z]+\/[a-z-]+\/[a-z0-9-]+$/, `${u.id}: an id like a flight's`);
  }
});

test('one entry in the history is one flight at one place, whatever is on show there', () => {
  const at = (place, what) => formatAddress(MR3, place, what);
  assert.ok(samePlace(at('site', 'vehicle'), at('site', 'pad')), 'a section of the site is the site');
  assert.ok(samePlace(at('gallery'), at('gallery', 'capsule')), 'a part in the gallery is the gallery');
  assert.ok(samePlace('', '#'), 'the front page is the front page');
  assert.ok(!samePlace(at('gallery'), at('site', 'vehicle')), 'the gallery and the site are two');
  assert.ok(!samePlace(at('site', 'vehicle'), at('fly')), 'the site and the flight deck are two');
  assert.ok(!samePlace('', at('gallery')), 'the front page and a flight are two');
  assert.ok(!samePlace(at('gallery'), formatAddress('ussr/vostok/vostok-1', 'gallery')), 'two flights are two');
  // read as written: an old link is not its flight's place until the page has settled it into that form
  assert.ok(!samePlace('#pad', at('site', 'pad')));
});

test('going to another place is a step in the history; anything else rewrites the step it is on', () => {
  // (the address bar, as a browser keeps it: the entries, and the one on show)
  const entries = ['#'];
  let on = 0;
  const said = (url) => `#${url.split('#')[1] ?? ''}`;
  globalThis.location = {
    pathname: '/',
    search: '',
    get hash() {
      return entries[on] === '#' ? '' : entries[on];
    },
  };
  globalThis.history = {
    pushState: (_s, _t, url) => {
      entries.splice(++on, Infinity, said(url));
    },
    replaceState: (_s, _t, url) => {
      entries[on] = said(url);
    },
  };
  try {
    const at = (place, what) => formatAddress(MR3, place, what);
    write(at('gallery')); // into a flight from the front page
    write(at('gallery', 'capsule')); // a part chosen
    write(at('site', 'vehicle')); // the launch site
    write(at('site', 'pad')); // a section of it
    write(at('fly')); // the flight deck
    write(at('fly')); // (said again: nothing)
    assert.deepEqual(entries, ['#', at('gallery', 'capsule'), at('site', 'pad'), at('fly')]);
    // Back, and the page follows it: the site, as it was left; the entries after it are kept for Forward
    on = 2;
    write(at('site', 'pad'));
    assert.deepEqual(entries, ['#', at('gallery', 'capsule'), at('site', 'pad'), at('fly')]);
    // an old link settled into its own form, and the front page come back to: no step at all
    entries.splice(0, Infinity, '#pad');
    on = 0;
    settle(at('site', 'pad'));
    assert.deepEqual(entries, [at('site', 'pad')]);
    settle(at('gallery'));
    assert.deepEqual(entries, [at('gallery')]);
    // the way out to the front page is a step too, and writes the bare address
    write('');
    assert.deepEqual(entries, [at('gallery'), '#']);
  } finally {
    delete globalThis.location;
    delete globalThis.history;
  }
});

test('a launch site opens at the instant its flight says, and every other at liftoff (Flight.opens)', () => {
  const first = { fly: false, named: '', clockAt: 0, running: false };
  // Vostok 1 opens on the morning the film shows at 43:26: the bus stopped, the Commission and the send-off on the apron
  const v = openingFor(vostok, first);
  assert.ok(v);
  assert.equal(v.model, 'pad');
  assert.equal(v.view, 'send-off');
  const pad = vostok.models.find((m) => m.id === 'pad');
  assert.ok(
    pad.views.some((w) => w.id === v.view),
    "the view is one of the section's own",
  );
  // the instant is one of the morning's keyframes, and the clock and the slider agree on it
  const key = pad.sequence.find((k) => k.at === v.at);
  assert.ok(key, "the instant is a keyframe of the pad's sequence");
  assert.match(key.event, /bus stops/);
  // the bus has come to a stop, and the Commission and the send-off have not yet gone
  const clocked = (node) => pad.parts.flatMap((p) => p.clocked ?? []).filter((m) => m.node === node);
  assert.ok(clocked('Bus_In').length > 0);
  for (const m of clocked('Bus_In')) assert.ok(m.to <= v.at, 'the bus is parked');
  for (const node of ['StateCommission_People', 'SendOff_People']) {
    assert.ok(clocked(node).length > 0, node);
    for (const m of clocked(node)) assert.ok(m.from >= v.at, `${node} is still there`);
  }
  // an address that names a section keeps it, at the same instant; the flight's own view is only for its own section
  assert.deepEqual(openingFor(vostok, { ...first, named: 'vehicle' }), { at: v.at, model: 'vehicle', view: null });
  assert.deepEqual(openingFor(vostok, { ...first, named: 'pad' }), v);
  // the flight deck starts at liftoff; a clock run or moved already is the visitor's
  assert.equal(openingFor(vostok, { ...first, fly: true }), null);
  assert.equal(openingFor(vostok, { ...first, clockAt: -60 }), null);
  assert.equal(openingFor(vostok, { ...first, running: true }), null);
  // every other flight opens as it always did: at liftoff, on what is asked for or its first section
  for (const f of flights.filter((f) => f !== vostok)) assert.equal(openingFor(f, first), null, f.id);
  assert.equal(openingFor(mr3, first), null);
});

// Coming down at a site (src/sim/sitecontact.ts, shed.ts): what a vehicle has shed strikes what stands there and the
// land, a surface drags on what slides over it, a body that lies still is down where it lies, a hard blow breaks
// parts free once, and the simulators' floor follows the land where the land is lower. On sites made here, round
// Freedom 7: nothing in the simulator or in a flight's data was changed to bring a figure in.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flights } from '../missions/index.ts';
import { floorAt } from '../src/sim/forces.ts';
import { aboutAxis, multiply, rotateFor, turn } from '../src/sim/rigid.ts';
import { Sheds } from '../src/sim/shed.ts';
import { FRICTION, floorOver, Lying, RESTS, SiteContact, STILL } from '../src/sim/sitecontact.ts';
import { SiteWorld } from '../src/sim/siteworld.ts';
import { TICK, vehicle } from '../src/sim/vehicle.ts';
import { G0 } from '../src/world/bodies.ts';
import { frameOf } from '../src/world/earthframe.ts';
import {
  add,
  cross,
  dot,
  ecefToGeodetic,
  ecefToSite,
  length,
  scale,
  siteFrame,
  siteToEcef,
  siteToEcefDirection,
  sub,
  unit,
} from '../src/world/frames.ts';
import { R } from './ballistic.mjs';
import { siteOf } from './siteflight.mjs';

const mr3 = flights.find((f) => f.id === 'usa/mercury/mr-3-freedom-7');
const site = siteFrame(mr3.site);
const frame = frameOf(mr3);
const SEA = mr3.site.seaLevel.value;
const v0 = vehicle(mr3.plan, site, SEA, { frame });
const standing = v0.start();
const STILL_POSE = { p: [0, 0, 0], q: [0, 0, 0, 1] };
const near = (a, b, slack, what) => assert.ok(Math.abs(a - b) <= slack, `${what}: ${a} against ${b}`);
const world = (...pieces) =>
  new SiteWorld([
    {
      id: 'made',
      solids: {
        cell: 0.25,
        source: 'test',
        hulls: [],
        pieces: pieces.map((p) => ({ part: p.node, cell: 0.25, pose: STILL_POSE, ...p, boxes: Float32Array.from(p.boxes.flat()) })),
      },
    },
  ]);
const contactOn = (stands, ground = null) => new SiteContact(mr3, stands, siteOf(mr3, stands).hull, site, frame, standing.q, ground);
const toward = (d, t) => frame.toInertial(siteToEcefDirection(site, d), t);
const placed = (p, t) => frame.toInertial(siteToEcef(site, p), t);
/** Where a point of the frame that does not turn is in the site's frame at `t`. */
const inSite = (r, t) => ecefToSite(site, frame.toFixed(r, t));
const rate = length(frame.spin);
/** The attitude of something that stood upright on the pad at liftoff and has been carried round with the ground to `t`. */
const upright = (t) => multiply(aboutAxis(unit(frame.spin), rate * t), standing.q);

// --- the vehicle: a capsule alone, stepped under gravity -----------------------------------------------------------

const BOOSTER = new Set(['RedstoneAdapter', 'RedstoneAftUnit', 'RedstoneCenterUnit', 'RedstoneTailUnit', 'RedstoneEngine', 'EscapeTower']);
const alone = (node) => BOOSTER.has(node);
// (flown by its centre of mass, 18.8 m up the stack; its heat shield is 18.19 m up it)
const CAPSULE = { station: 18.8, mass: 1300, centre: 18.8, inertia: [500, 600, 600] };
const SHIELD = 18.19 - 18.8;
/** The capsule let fall with its heat shield `height` m over the site's zero at `at`, going `along` m/s over the ground toward the site's +X. */
function fall(contact, at, height, along, seconds) {
  const t0 = 10;
  const r0 = placed([at[0], height - SHIELD, at[1]], t0);
  let s = { ...CAPSULE, t: t0, r: r0, v: add(cross(frame.spin, r0), scale(toward([1, 0, 0], t0), along)), q: upright(t0), w: [0, 0, 0] };
  const hits = [];
  let rest = null;
  while (!rest && s.t < t0 + seconds) {
    const v = add(s.v, scale(frame.up(s.r, s.t), -G0 * TICK));
    const next = { ...s, t: s.t + TICK, r: add(s.r, scale(v, TICK)), v, q: rotateFor(s.q, s.w, TICK) };
    const met = contact.meet(s, next, alone);
    hits.push(...met.hits);
    rest = met.rest;
    s = { ...next, r: met.r, v: met.v, q: met.q, w: met.w };
  }
  return { s, hits, rest, t0, start: inSite(r0, t0), end: inSite(s.r, s.t) };
}

test('a surface drags on what slides over it, by its share of the force between them and no more than stops it', () => {
  const contact = contactOn(world({ node: 'Deck', boxes: [[-30, 30.41, -30, 30, 31.41, 30]] }));
  const dt = 0.1;
  const pose = (p, t, more = {}) => {
    const r = placed(p, t);
    const whole = { station: 0, mass: 30000, centre: 8, inertia: [12000, 900000, 900000] };
    return { t, r, q: upright(t), w: [0, 0, 0], ...whole, v: add(cross(frame.spin, r), more.v ?? [0, 0, 0]) };
  };
  // sideways at 100 m/s under a deck and rising into it at 2: struck at 2 m/s, and slowed along it by friction's share of that
  const oblique = add(scale(toward([1, 0, 0], 10 + dt), 100), scale(toward([0, 1, 0], 10 + dt), 2));
  const glance = contact.meet(pose([0, 4.9, 0], 10), pose([10, 5.1, 0], 10 + dt, { v: oblique }));
  assert.equal(glance.hits.length, 1);
  near(glance.hits[0].speed, 2, 0.05, 'the speed into it');
  const over = (m) => sub(m.v, cross(frame.spin, m.r));
  // the drag on its centre of mass is against its going, and no more than friction's share of the blow (which is at
  // most the whole of its 2 m/s into the deck); struck at its nose, it is also set turning
  const drag = dot(glance.hits[0].dv, toward([1, 0, 0], 10 + dt));
  assert.ok(
    drag < -0.01 && drag >= -FRICTION * glance.hits[0].speed * 1.01,
    `slowed along it, by no more than friction's share of the blow: ${drag}`,
  );
  // going slowly along it, the drag stops the point that touches and does not send it back
  const slow = add(scale(toward([1, 0, 0], 10 + dt), 0.1), scale(toward([0, 1, 0], 10 + dt), 2));
  const stopped = contact.meet(pose([0, 4.9, 0], 10), pose([0.01, 5.1, 0], 10 + dt, { v: slow }));
  assert.ok(dot(over(stopped), toward([1, 0, 0], 10 + dt)) > -0.05, 'not sent back the way it came');
});

test('a capsule that comes down on a deck going sideways is slowed by it, lies still and is down there', () => {
  const contact = contactOn(world({ node: 'Deck', boxes: [[-40, 9, -40, 40, 10, 40]] }));
  const { s, hits, rest, t0, start, end } = fall(contact, [0, 0], 10.5, 3, 8);
  assert.ok(rest, 'it came to rest');
  assert.equal(hits[0]?.on, 'made/Deck');
  // it fell less than the half metre its heat shield was over the deck (its retropack hangs under the shield): under
  // 3.1 m/s down, with the 3 m/s it had over the ground
  assert.ok(
    rest.vertical > 1 && rest.vertical < Math.sqrt(2 * G0 * 0.5) + 0.1,
    `how fast it was coming down when it struck: ${rest.vertical}`,
  );
  near(rest.horizontal, 3, 0.3, 'and going over the ground');
  // friction took its 3 m/s in about v^2 / (2 mu g) = 0.9 m, give or take its rocking; without friction it would have gone 3 m a second
  const slid = Math.hypot(end[0] - start[0], end[2] - start[2]);
  assert.ok(slid > 0.2 && slid < 4, `it slid ${slid} m`);
  assert.ok(length(sub(s.v, cross(frame.spin, s.r))) < 0.5, 'and is all but still');
  assert.ok(rest.t - t0 >= RESTS && rest.t - t0 < 8, `after lying still a second: ${rest.t - t0}`);
  // on the deck, not under it
  assert.ok(end[1] + SHIELD > 9.9, `its heat shield is ${end[1] + SHIELD} m up`);
  const lies = contact.lies(s, s.t);
  near(lies.latitude, mr3.site.latitude.value, 1e-3, 'where it lies');
});

test('with no land given a body over open ground meets nothing; with it, it comes down on the land and is turned by its slope', () => {
  const none = contactOn(world());
  assert.equal(fall(none, [200, 0], 3, 0, 1.5).rest, null, 'nothing there to meet');
  // land sloping down toward +X at one in five, half a metre under the site's zero at x = 200 (the pad is 2 m over the sea)
  const slope = { at: (x) => -0.5 - (x - 200) / 5, reach: 5000 };
  const contact = contactOn(world(), slope);
  const { hits, end, start } = fall(contact, [200, 0], 1, 0, 1.5);
  assert.equal(hits[0]?.on, 'ground');
  assert.equal(hits[0]?.name, 'The ground');
  // it met the land where the land is, not the site's zero
  assert.ok(end[1] + SHIELD < 0.3 && end[1] + SHIELD > -1.9, `its heat shield is ${end[1] + SHIELD} m up`);
  // the blow is along the land's own normal, which leans downhill
  const normal = unit(hits[0].dv);
  assert.ok(dot(normal, toward([1, 0, 0], hits[0].t)) > 0.1, 'the blow leans downhill');
  assert.ok(end[0] >= start[0] - 0.05, 'and it does not go uphill');
  // land under the sea is the sea's bed, and is not met: what comes down there comes down in the sea
  const seabed = contactOn(world(), { at: () => SEA - site.height - 5, reach: 5000 });
  assert.equal(fall(seabed, [200, 0], -4, 0, 1.5).hits.length, 0, 'the sea’s bed is not struck');
});

test('lying still is touching and slow for a second; a flight put back starts again', () => {
  const lying = new Lying();
  const here = [
    [0, 0, 0],
    [5, 0, 0],
  ];
  assert.equal(lying.note(1, true, here, 9, 2), null, 'just come');
  for (let t = 1.01; t < 1.99; t += 0.01) assert.equal(lying.note(t, true, here, 0, 0), null, 'not yet a second');
  // a point of it has gone further than a hand's breadth: it starts again from there
  const turned = [
    [0, 0, 0],
    [5, 0, 2 * STILL],
  ];
  assert.equal(lying.note(2.02, true, turned, 0, 0), null, 'it has turned');
  assert.equal(lying.note(3, true, turned, 0, 0), null, 'not yet a second since');
  const rest = lying.note(3.03, true, turned, 0, 0);
  assert.deepEqual([rest.vertical, rest.horizontal], [9, 2], 'as fast as the hardest it struck');
  // off the surface for a moment and it starts again
  assert.equal(lying.note(3.5, false, [], 0, 0), null);
  assert.equal(lying.note(3.51, true, turned, 0, 0), null);
  // put back in time
  assert.equal(lying.note(0.5, true, turned, 0, 0), null);
});

// --- what the vehicle has shed ---------------------------------------------------------------------------------

// the booster as an abort on the pad lets it go: its own mass and moments
const padAbort = v0.tick(standing, { throttle: 0, pitch: 0, yaw: 0, roll: 0, events: [R.abort.id] }).released[0];
/** The booster let go at 20 s with its centre of mass at `p` of the site's frame, still over the ground, its long axis leaned `lean` radians toward the site's +X. */
function booster(p, lean = 0) {
  const t = 20;
  const r = placed(p, t);
  const q = multiply(aboutAxis(toward([0, 0, -1], t), lean), upright(t));
  return { ...padAbort, stands: false, t, r, v: cross(frame.spin, r), q, w: [0, 0, 0] };
}
const shedsAt = (surfaces, floor) =>
  new Sheds(mr3.plan, site, SEA, { frame, ...(surfaces ? { site: () => surfaces } : {}), ...(floor ? { floor } : {}) });

test('a spent stage that falls on a deck lands on it, lies down and is down there; with no site it falls to the floor', () => {
  const stands = world({ node: 'Deck', boxes: [[-60, 9, -60, 60, 10, 60]] });
  const surfaces = contactOn(stands).surfaces;
  // leaning 20 degrees, its centre of mass 22 m up: its tail is a few metres over the deck
  const release = booster([0, 22, 0], (20 * Math.PI) / 180);
  const run = shedsAt(surfaces).add(release);
  run.upTo(release.t + 40);
  const landing = run.now.landing;
  assert.ok(landing, 'it is down');
  assert.ok(landing.t > release.t + 1 && landing.t < release.t + 40, `after ${landing.t - release.t} s`);
  const lies = inSite(run.now.r, run.now.t);
  // lying on the deck: its axis is a tank's radius over it (0.89 m), give or take its fins and engine
  assert.ok(lies[1] > 10.3 && lies[1] < 12.5, `its centre of mass is ${lies[1]} m up`);
  const axis = turn(run.now.q, [1, 0, 0]);
  assert.ok(Math.abs(dot(axis, frame.up(run.now.r, run.now.t))) < 0.2, 'and it lies on its side');
  // it struck the deck, and the deck says so
  assert.ok(
    run.struck.some((h) => h.on === 'made/Deck'),
    'the blow is kept for the deck',
  );
  // it stays there, carried round with the ground
  const later = run.at(release.t + 300);
  assert.ok(later.down);
  near(inSite(later.r, release.t + 300)[1], lies[1], 0.05, 'where it lay');
  // the same release with no site falls through where the deck was, to the floor
  const free = shedsAt(null).add(release);
  free.upTo(release.t + 40);
  assert.ok(free.now.landing && inSite(free.now.r, free.now.t)[1] < 9, 'with no site it is on the floor');
  // and told as an impact with the body's name and the piece's
  const sheds = shedsAt(surfaces);
  sheds.add(release).upTo(release.t + 40);
  const said = sheds.siblings(release.t, release.t + 40);
  assert.ok(said.length >= 1 && /deck/i.test(said[0].name), `said: ${said.map((h) => h.name)}`);
  assert.deepEqual(sheds.siblings(release.t, release.t + 40), [], 'once');
});

test('a stage that comes down fast on a deck is broken by it, and the deck stands', () => {
  const stands = world({ node: 'Deck', boxes: [[-60, 9, -60, 60, 10, 60]] });
  const surfaces = contactOn(stands).surfaces;
  const sheds = shedsAt(surfaces);
  const release = booster([0, 200, 0], 0.3);
  const run = sheds.add(release);
  run.upTo(release.t + 60);
  const said = sheds.siblings(release.t, release.t + 60);
  assert.ok(said[0].speed > 30, `it struck at ${said[0].speed} m/s`);
  assert.deepEqual(said[0].broken, [R.separation.id], 'and broke');
  assert.ok(Number.isFinite(run.brokenAt));
  // nothing of it is under the deck
  assert.ok(inSite(run.now.r, run.now.t)[1] > 10, 'it did not pass through');
  // the deck is where it was
  assert.deepEqual(stands.poseAt('made/Deck', release.t + 60), { p: [0, 0, 0], q: [0, 0, 0, 1] });
});

test('a stage that falls on the land lies on the land, and the first hard blow on the vehicle breaks it once', () => {
  // level land 1 m under the site's zero (a metre over the sea), with nothing standing
  const land = { at: () => -1, reach: 5000 };
  const contact = contactOn(world(), land);
  const flat = floorAt(site, SEA);
  const sheds = shedsAt(
    contact.surfaces,
    floorOver(() => contact, flat, 1),
  );
  const release = booster([150, 20, 0], 0.4);
  const run = sheds.add(release);
  run.upTo(release.t + 60);
  assert.ok(run.now.landing, 'it is down');
  const lies = inSite(run.now.r, run.now.t);
  assert.ok(lies[1] > -1 + 0.5 && lies[1] < -1 + 2.5, `lying on the land: ${lies[1]} m`);
  assert.ok(Math.abs(dot(turn(run.now.q, [1, 0, 0]), frame.up(run.now.r, run.now.t))) < 0.2, 'on its side');
  // the vehicle's own breaking: the first hard blow, once
  const hard = { on: 'made/Deck', name: 'Deck', t: 30, speed: 40, energy: 1e6 };
  assert.equal(sheds.broke({ ...hard, speed: 2 }), false, 'a knock breaks nothing');
  assert.equal(sheds.broke(hard), true);
  assert.equal(sheds.activeBrokenAt, 30);
  assert.equal(sheds.broke({ ...hard, t: 31 }), false, 'not again');
});

test('the floor follows the land where it lies lower, keeps the level the vehicle stood on, and is the sea over the sea’s bed', () => {
  const flat = floorAt(site, SEA);
  const pad = site.height - SEA;
  const here = (x, z) => {
    const g = ecefToGeodetic(siteToEcef(site, [x, 0, z]));
    return [g.latitude, g.longitude];
  };
  // (the pad is 2 m over the sea) a hollow half a metre deep from x = 50 on, a dune 4 m high at x < -50, the sea's bed beyond x = 400
  const land = { at: (x) => (x > 400 ? -pad - 6 : x > 50 ? -0.5 : x < -50 ? 4 : -0.1), reach: 3000 };
  const contact = contactOn(world(), land);
  const floor = floorOver(() => contact, flat);
  near(floor(...here(0, 0)), pad, 1e-6, 'where the vehicle stood: the level it stood on');
  near(floor(...here(100, 0)), pad - 0.5, 0.01, 'over the hollow: its bottom');
  near(floor(...here(-100, 0)), pad, 0.01, 'under the dune: no higher than the simulator’s own, the land is met by contact');
  assert.equal(floor(...here(500, 0)), 0, 'over the sea’s bed: the sea');
  // for what is shed, a metre under the land
  near(floorOver(() => contact, flat, 1)(...here(100, 0)), pad - 1.5, 0.01, 'under the land');
  // with no land known, or none to ask of yet, it is the simulator's own
  assert.equal(floorOver(() => contactOn(world()), flat)(...here(100, 0)), pad);
  assert.equal(floorOver(() => null, flat)(...here(100, 0)), pad);
});

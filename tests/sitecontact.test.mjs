// A vehicle against what stands at its site (src/sim/sitecontact.ts): every flight, flown as flown by the live
// simulator, clears its own site; and on sites made here, a vehicle that drifts into a tower strikes it, a blow is
// along the surface's normal and takes only the motion into it, a glancing pass is not a blow, no speed passes through
// a deck, a capsule comes down on a deck and on a slope, a structure that has moved away is not struck, and a vehicle
// that has struck a tower is not in it as it is drawn (its model's own vertices). A surface's drag on what slides over
// it, lying still and what is shed are in siterest.test.mjs.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { flights } from '../missions/index.ts';
import { aboutAxis, multiply, turn, unturn } from '../src/sim/rigid.ts';
import { FRICTION, SiteContact } from '../src/sim/sitecontact.ts';
import { SiteWorld } from '../src/sim/siteworld.ts';
import { vehicle } from '../src/sim/vehicle.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { add, cross, dot, length, scale, siteFrame, siteToEcef, siteToEcefDirection, sub, unit } from '../src/world/frames.ts';
import { readGlb } from '../tools/glb-geometry.mjs';
import { flyThroughSite, siteOf } from './siteflight.mjs';

const flown = flights.filter((f) => f.site && f.flies && f.plan);
/** The least a blow's direction lies along its surface's normal: when the surface's drag is all that friction allows. */
const GRAZE = 1 / Math.hypot(1, FRICTION);
const near = (a, b, slack, what) => assert.ok(Math.abs(a - b) <= slack, `${what}: ${a} against ${b}`);

test('every flight, flown as flown from its pad, clears everything that stands at its site', () => {
  assert.ok(flown.length >= 16, 'the flights were found');
  for (const flight of flown) {
    const { strikes, ticks, state } = flyThroughSite(flight, { seconds: 30 });
    assert.ok(ticks > 2000 && state.t > 29, `${flight.id}: it flew (${ticks} ticks to ${state.t} s)`);
    assert.deepEqual(
      strikes.map((s) => `${s.on} (${s.node}) by ${s.by} at t=${s.t.toFixed(2)}, ${s.speed.toFixed(2)} m/s`),
      [],
      `${flight.id} struck its own site: a shape's fault or the model's`,
    );
  }
});

// --- sites made here, round Freedom 7 ---------------------------------------------------------------------------

const mr3 = flights.find((f) => f.id === 'usa/mercury/mr-3-freedom-7');
const site = siteFrame(mr3.site);
const frame = frameOf(mr3);
const standing = vehicle(mr3.plan, site, mr3.site.seaLevel.value, { frame }).start();
const STILL = { p: [0, 0, 0], q: [0, 0, 0, 1] };
const world = (...pieces) =>
  new SiteWorld([
    {
      id: 'made',
      solids: {
        cell: 0.25,
        source: 'test',
        hulls: [],
        pieces: pieces.map((p) => ({ part: p.node, cell: 0.25, pose: STILL, ...p, boxes: Float32Array.from(p.boxes.flat()) })),
      },
    },
  ]);
const contactOn = (stands) => new SiteContact(mr3, stands, siteOf(mr3, stands).hull, site, frame, standing.q);
const rate = length(frame.spin);
/**
 * The stack standing upright with its base at `p` of the site's frame at `t` (after the page has let it down off its
 * support), moving with the ground; `more.v` is its velocity over the ground.
 */
const pose = (p, t, more = {}) => {
  const r = frame.toInertial(siteToEcef(site, p), t);
  return {
    t,
    r,
    q: multiply(aboutAxis(unit(frame.spin), rate * t), standing.q),
    w: [0, 0, 0],
    station: 0,
    mass: 30000,
    centre: 8,
    inertia: [12000, 900000, 900000],
    ...more,
    v: add(cross(frame.spin, r), more.v ?? [0, 0, 0]),
  };
};
/** A pose's velocity over the ground. */
const over = (m) => sub(m.v, cross(frame.spin, m.r));
/** A direction of the site's frame in the frame that does not turn, at `t`. */
const toward = (d, t) => frame.toInertial(siteToEcefDirection(site, d), t);
// (the Redstone and its capsule and tower stand 25.4 m tall; the tank is 0.89 m in radius)
const TOP = 25.41;

test('a vehicle that drifts sideways at liftoff strikes the tower beside it, and does not pass into it', () => {
  // a wall 4 m from the launch axis, as tall as the vehicle; a push of 2 m/s^2 toward it from liftoff
  const stands = world({ node: 'Tower', boxes: [[4, 0, -6, 6, 60, 6]] });
  const pushed = (s) => ({ v: add(s.v, scale(toward([1, 0, 0], s.t), 0.02)) });
  const { strikes, pose: m, contact } = flyThroughSite(mr3, { seconds: 6, world: stands, nudge: pushed });
  assert.ok(strikes.length >= 1, 'it struck');
  assert.equal(strikes[0].on, 'made/Tower');
  assert.ok(strikes[0].t > 1 && strikes[0].t < 4, `when: ${strikes[0].t}`);
  assert.ok(strikes[0].speed > 1 && strikes[0].speed < 10, `how fast: ${strikes[0].speed}`);
  // the blow is along the wall's normal, back toward the pad, with the wall's drag on a vehicle sliding up it: no
  // more than friction's share of the blow, across it
  assert.ok(dot(unit(strikes[0].dv), toward([-1, 0, 0], strikes[0].t)) >= GRAZE - 1e-9, 'along the normal, but for the drag');
  // and at the end no sphere of its hull is in the wall
  for (const bead of contact.beads) {
    const at = add(m.r, turn(m.q, [bead.at[0] - m.station, bead.at[1], bead.at[2]]));
    const x = dot(sub(at, frame.toInertial(siteToEcef(site, [0, 0, 0]), m.t)), toward([1, 0, 0], m.t));
    assert.ok(x + bead.radius <= 4 + 0.02, `a sphere of ${bead.node} at ${x} of ${bead.radius} is in the wall`);
  }
  // and without the wall, the same push meets nothing
  assert.deepEqual(flyThroughSite(mr3, { seconds: 6, world: world(), nudge: pushed }).strikes, []);
});

test('head-on, the blow takes the motion into the surface and nothing else; glancing, there is none', () => {
  // a deck over the vehicle, 5 m above its tip
  const contact = contactOn(world({ node: 'Deck', boxes: [[-30, TOP + 5, -30, 30, TOP + 6, 30]] }));
  const dt = 0.1;
  // rising 10 m in the step: 100 m/s, its tip into the deck
  const up = contact.meet(pose([0, 0, 0], 10), pose([0, 10, 0], 10 + dt, { v: scale(toward([0, 1, 0], 10 + dt), 100) }));
  assert.equal(up.hits.length, 1);
  near(up.hits[0].speed, 100, 0.5, 'closing speed');
  near(dot(unit(up.hits[0].dv), toward([0, -1, 0], 10 + dt)), 1, 1e-6, 'straight back down');
  // on the axis, through the centre of mass: all of the mass answers, and it does not turn
  near(length(up.hits[0].dv), 100, 0.5, 'all of the motion into it');
  near(up.hits[0].energy, 0.5 * 30000 * 100 ** 2, 0.02 * 0.5 * 30000 * 100 ** 2, 'the energy it had toward the deck');
  assert.ok(length(up.hits[0].dw) < 1e-4, `no turn: ${up.hits[0].dw}`);
  // what is left of its speed is none toward the deck
  near(dot(over(up), toward([0, 1, 0], 10 + dt)), 0, 0.5, 'no speed into the deck left');
  // sliding 10 m sideways just under the deck: nothing is struck
  const along = contact.meet(pose([0, 4.9, 0], 10), pose([10, 4.9, 0], 10 + dt));
  assert.deepEqual(along.hits, []);
  // sideways at 100 m/s and rising at 2: struck at 2 m/s, and of the sideways speed the deck's drag takes no more than
  // friction's share of that blow
  const oblique = scale(add(scale(toward([1, 0, 0], 10 + dt), 100), scale(toward([0, 1, 0], 10 + dt), 2)), 1);
  // (a vehicle that had not just struck the deck: one already touching it is settling on it, and a knock so gentle is not said)
  const fresh = contactOn(world({ node: 'Deck', boxes: [[-30, TOP + 5, -30, 30, TOP + 6, 30]] }));
  const glance = fresh.meet(pose([0, 4.9, 0], 10), pose([10, 5.1, 0], 10 + dt, { v: oblique }));
  assert.equal(glance.hits.length, 1);
  near(glance.hits[0].speed, 2, 0.05, 'the speed into it, not the speed along it');
  const dragged = dot(glance.hits[0].dv, toward([1, 0, 0], 10 + dt));
  assert.ok(dragged <= 0 && dragged >= -FRICTION * glance.hits[0].speed * 1.01, `the speed along it is kept, but for the drag: ${dragged}`);
});

test('no speed passes through a deck: ten kilometres in a step', () => {
  const contact = contactOn(world({ node: 'Deck', boxes: [[-30, TOP + 5, -30, 30, TOP + 5.01, 30]] }));
  const met = contact.meet(pose([0, 0, 0], 10), pose([0, 10000, 0], 11, { v: scale(toward([0, 1, 0], 11), 10000) }));
  assert.equal(met.hits.length, 1);
  assert.equal(met.hits[0].activeBroken, true, 'and at that speed it is broken');
  // it is left under the deck, not above it
  const height = dot(sub(met.r, frame.toInertial(siteToEcef(site, [0, 0, 0]), 11)), toward([0, 1, 0], 11));
  assert.ok(height < 5.1 && height > 4.5, `the base is ${height} m up`);
});

test('a blow off the axis turns the vehicle', () => {
  // a post beside the nose, in the way of a vehicle moving sideways: it is struck high above its centre of mass
  const contact = contactOn(world({ node: 'Post', boxes: [[3, 20, -1, 4, 30, 1]] }));
  const dt = 0.1;
  const met = contact.meet(pose([0, 0, 0], 10), pose([3, 0, 0], 10 + dt, { v: scale(toward([1, 0, 0], 10 + dt), 30) }));
  assert.equal(met.hits.length, 1);
  assert.ok(length(met.hits[0].dw) > 1e-3, 'it is set turning');
  // less than all of its sideways speed is taken: the nose stops and the tail swings on
  assert.ok(length(met.hits[0].dv) < 30 && length(met.hits[0].dv) > 1, `the centre keeps some: ${length(met.hits[0].dv)}`);
});

test('a capsule alone comes down on a deck, and on a slope it is turned off along it', () => {
  const booster = new Set([
    'RedstoneAdapter',
    'RedstoneAftUnit',
    'RedstoneCenterUnit',
    'RedstoneTailUnit',
    'RedstoneEngine',
    'EscapeTower',
  ]);
  const alone = (node) => booster.has(node);
  // (the capsule's heat shield is 18.2 m up the stack; it is flown by its own centre of mass, 18.8 m up it, as the
  // simulator carries a spacecraft alone)
  const capsule = { station: 18.8, mass: 1300, centre: 18.8, inertia: [500, 600, 600] };
  const dt = 0.05;
  const falling = (from, to, t) => [
    pose([0, from - 18.19 + 18.8, 0], t, capsule),
    pose([0, to - 18.19 + 18.8, 0], t + dt, { ...capsule, v: scale(toward([0, -1, 0], t + dt), (from - to) / dt) }),
  ];
  const flat = contactOn(world({ node: 'Deck', boxes: [[-20, 9, -20, 20, 10, 20]] }));
  const down = flat.meet(...falling(10.5, 10.5 - 0.5, 10), alone);
  assert.equal(down.hits.length, 1);
  assert.equal(down.hits[0].on, 'made/Deck');
  near(down.hits[0].speed, 10, 0.1, 'at the speed it fell');
  near(dot(unit(down.hits[0].dv), toward([0, 1, 0], 10 + dt)), 1, 1e-6, 'straight up');
  // 18 m higher, the capsule alone is nowhere near the deck; with its booster still under it, the booster's tail strikes
  assert.deepEqual(flat.meet(...falling(28.4, 27.9, 10), alone).hits, []);
  assert.equal(flat.meet(...falling(28.4, 27.9, 10)).hits.length, 1, 'the booster, still on, strikes');
  // a deck tilted 20 degrees about the site's Z: the blow is along its normal, which leans
  const lean = (20 * Math.PI) / 180;
  const slope = contactOn(
    world({
      node: 'Slope',
      boxes: [[-40, -1, -40, 40, 0, 40]],
      pose: { p: [0, 10, 0], q: [0, 0, Math.sin(lean / 2), Math.cos(lean / 2)] },
    }),
  );
  const slid = slope.meet(...falling(11.5, 10.5, 10), alone);
  assert.equal(slid.hits.length, 1);
  const normal = unit(slid.hits[0].dv);
  assert.ok(
    dot(normal, toward([-Math.sin(lean), Math.cos(lean), 0], 10 + dt)) >= GRAZE - 1e-6,
    'along the slope’s normal, but for its drag',
  );
  // It met the slope with the rim of its heat shield, off its centre: the blow stops the rim, sets the capsule turning,
  // and leaves its centre most of its speed along the slope and little into it.
  const into = dot(over(slid), toward([-Math.sin(lean), Math.cos(lean), 0], 10 + dt));
  assert.ok(Math.abs(into) < 0.15 * 20 * Math.cos(lean), `little into the slope: ${into}`);
  assert.ok(Math.abs(dot(over(slid), toward([Math.cos(lean), Math.sin(lean), 0], 10 + dt))) > 3, 'and some along it');
  assert.ok(length(slid.hits[0].dw) > 1e-3, 'and it is turning');
});

test('a structure that has swung away is not struck; while it is there, it is', () => {
  // an arm over the nose at liftoff, gone 20 m aside by ten seconds after
  const arm = {
    node: 'Arm',
    boxes: [[-2, TOP + 3, -2, 2, TOP + 4, 2]],
    track: Float32Array.from([0, 0, 0, 0, 0, 0, 0, 1, 10, 20, 0, 0, 0, 0, 0, 1]),
  };
  const contact = contactOn(world(arm));
  const rise = (t) => [pose([0, 0, 0], t), pose([0, 6, 0], t + 0.1, { v: scale(toward([0, 1, 0], t + 0.1), 60) })];
  assert.equal(contact.meet(...rise(6)).hits.length, 0, 'at six seconds it is 12 m aside');
  assert.equal(contact.meet(...rise(20)).hits.length, 0, 'and it stays away');
  const still = contactOn(world({ ...arm, track: undefined }));
  assert.equal(still.meet(...rise(6)).hits.length, 1, 'one that never moves is struck');
});

test('struck, the vehicle as it is drawn is not in the structure: its model’s own vertices, not only its hull’s spheres', async () => {
  // Friendship 7 pushed from liftoff toward its egress tower at 3 m/s^2: the Atlas's tank strikes the tower two seconds up
  const ma6 = flights.find((f) => f.id === 'usa/mercury/ma-6-friendship-7');
  const [ground, turning] = [siteFrame(ma6.site), frameOf(ma6)];
  const push = (s) => ({ v: add(s.v, scale(turning.toInertial(siteToEcefDirection(ground, [0, 0, 1]), s.t), 0.03)) });
  const first = flyThroughSite(ma6, { seconds: 6, nudge: push }).strikes[0];
  assert.ok(first && first.on === 'pad/EgressTower' && first.speed > 3, `it struck the tower: ${first?.on} at ${first?.speed} m/s`);
  // every vertex of the model that is drawn, in the model's frame
  const def = ma6.models.find((m) => m.id === ma6.flies.model);
  const glb = await readGlb(join(import.meta.dirname, '..', 'public', def.url));
  const vertices = [];
  glb.gltf.nodes.forEach((_, i) => {
    const m = glb.frames[i];
    for (const { positions } of glb.triangles(i))
      for (let k = 0; k < positions.length; k += 3) {
        const [x, y, z] = [positions[k], positions[k + 1], positions[k + 2]];
        vertices.push([
          m[0] * x + m[4] * y + m[8] * z + m[12],
          m[1] * x + m[5] * y + m[9] * z + m[13],
          m[2] * x + m[6] * y + m[10] * z + m[14],
        ]);
      }
  });
  assert.ok(vertices.length > 100000, 'the model was read');
  const datum = ma6.flies.datum ?? def.position?.[1] ?? 0;
  const yaw = def.rotationY ?? 0;
  const { world: stands } = siteOf(ma6);
  // as it was left by the blow, and for a second after, still pushed at the tower
  let deepest = 0;
  for (const after of [0.02, 0.1, 0.2, 0.4, 0.7, 1]) {
    const { pose: m, contact } = flyThroughSite(ma6, { seconds: first.t + after, nudge: push });
    for (const [x, y, z] of vertices) {
      // (placed as sitecontact.ts places the hull's spheres, which is as the page draws the model)
      const across = [x * Math.cos(yaw) + z * Math.sin(yaw), 0, -x * Math.sin(yaw) + z * Math.cos(yaw)];
      const body = unturn(contact.standing, turning.toInertial(siteToEcefDirection(ground, across), 0));
      const at = contact.surfaces.drawn(add(m.r, turn(m.q, [y + datum - m.station, body[1], body[2]])), m.t);
      deepest = Math.max(deepest, stands.depth(at, m.t));
    }
  }
  // a box is the model's surface squared off to its cell, and a hull's sphere leaves out what lies beyond 95% of its
  // slice's radius (a conduit, a fairing's lip): a hand's breadth is the most either lets through
  assert.ok(deepest < 0.1, `a vertex of the drawn vehicle is ${deepest.toFixed(3)} m inside the tower`);
});

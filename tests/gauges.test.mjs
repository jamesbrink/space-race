// What a cabin's instruments read and where that puts a needle (src/viewer/gauges.ts), and every flight's cabin
// against its model: an instrument whose node is not in the GLB, or has no scale there, would only show up as a
// needle that never moves.
import assert from 'node:assert/strict';
import { globSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { attitudeOf, drumAt, ratesOf, scaleAt, signalsAt } from '../src/viewer/gauges.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const near = (a, b, by = 1e-6) => assert.ok(Math.abs(a - b) <= by, `${a} is not ${b} (within ${by})`);

test('a scale: in proportion between its marks, on the stop past either end', () => {
  const scale = [0, 0, 20, 45, 40, 75, 140, 180]; // (a descent meter's: closer together as it goes)
  near(scaleAt(scale, 0), 0);
  near(scaleAt(scale, 10), 22.5);
  near(scaleAt(scale, 30), 60);
  near(scaleAt(scale, 90), 127.5);
  near(scaleAt(scale, -5), 0);
  near(scaleAt(scale, 500), 180);
  near(scaleAt([], 3), 0);
  near(scaleAt(scale, Number.NaN), 0);
});

test('a scale that goes round: a clock, a heading', () => {
  const minute = [0, 0, 3600, -2 * Math.PI];
  near(scaleAt(minute, 900, 3600), -Math.PI / 2);
  near(scaleAt(minute, 3600 + 900, 3600), -Math.PI / 2);
  near(scaleAt(minute, -900, 3600), (-3 * Math.PI) / 2);
  const heading = [-180, Math.PI, 180, -Math.PI];
  near(scaleAt(heading, 190, 360), scaleAt(heading, -170, 360));
});

test('a counter: each wheel stands on its figure and rolls as the one below comes up to nought', () => {
  assert.equal(drumAt(0, 0), 0);
  assert.equal(drumAt(7.5, 0), 7);
  near(drumAt(7.875, 0), 7.5); // half way through the last quarter of the unit
  assert.equal(drumAt(142, 0), 2);
  assert.equal(drumAt(142, 1), 4);
  assert.equal(drumAt(142, 2), 1);
  assert.equal(drumAt(142, 3), 0);
  assert.equal(drumAt(199.5, 1), 9); // the tens wheel waits for the last quarter of the last second
  near(drumAt(199.875, 1), 9.5);
  near(drumAt(199.875, 2), 1.5);
  assert.equal(drumAt(-3, 0), 0);
});

test('attitude: the pad, the climb, and the attitude held for retrofire', () => {
  const up = [0, 1, 0];
  const downrange = [1, 0, 0];
  // standing on the pad, the pilot's head away from downrange: every needle upright
  let a = attitudeOf([0, 1, 0], [-1, 0, 0], up, downrange);
  near(a.pitch, 90);
  near(a.yaw, 0);
  near(a.roll, 0);
  // tipped 30 degrees downrange, small end leading: the same roll, and the heading has turned up
  const c = Math.cos(Math.PI / 6);
  a = attitudeOf([0.5, c, 0], [-c, 0.5, 0], up, downrange);
  near(a.pitch, 60);
  near(Math.abs(a.yaw), 180);
  near(a.roll, 0);
  // retrofire: small end trailing and 34 degrees down, head up
  const r = (34 * Math.PI) / 180;
  a = attitudeOf([-Math.cos(r), -Math.sin(r), 0], [-Math.sin(r), Math.cos(r), 0], up, downrange);
  near(a.pitch, -34);
  near(a.yaw, 0);
  near(a.roll, 0);
  // rolled a quarter turn there, and swung 20 degrees to the left of the way flown
  a = attitudeOf([-Math.cos(r), -Math.sin(r), 0], [0, 0, 1], up, downrange);
  near(Math.abs(a.roll), 90);
  const y = (20 * Math.PI) / 180;
  a = attitudeOf([-Math.cos(y), 0, -Math.sin(y)], [0, 1, 0], up, downrange);
  near(a.yaw, 20);
  near(a.pitch, 0);
});

test('rates: a turn of ten degrees in a second about one axis is ten degrees a second about it', () => {
  const half = (5 * Math.PI) / 180;
  const [x, y, z] = ratesOf([0, 0, 0, 1], [0, Math.sin(half), 0, Math.cos(half)], 1);
  near(x, 0);
  near(y, 10);
  near(z, 0);
  assert.deepEqual(ratesOf([0, 0, 0, 1], [0, 0, 0, 1], 0), [0, 0, 0]);
  // the same turn said the long way round (q and -q are one attitude)
  near(ratesOf([0, 0, 0, 1], [0, -Math.sin(half), 0, -Math.cos(half)], 0.5)[1], 20);
});

test('signals: what has happened by an instant', () => {
  const times = { tower: 142, separated: 152, main: Infinity };
  let s = signalsAt(times, 0, false);
  assert.ok(s.ready && !s.tower && !s.separated && !s.main && !s.drogue);
  s = signalsAt(times, 150, true);
  assert.ok(!s.ready && s.tower && !s.separated);
  s = signalsAt(times, 1e6, true);
  assert.ok(s.separated && !s.main && !s.retro);
});

/**
 * Every node of a GLB by name, with its extras; and with `places`, where each one's origin stands in the model's own
 * frame instead, through whatever it hangs from (a seat's node may ride on a seat that has a frame of its own).
 */
function nodesOf(file, places = false) {
  const glb = readFileSync(file);
  const gltf = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8'));
  if (!places) return new Map(gltf.nodes.map((n) => [n.name, n.extras ?? {}]));
  const parent = new Map();
  gltf.nodes.forEach((n, i) => {
    for (const child of n.children ?? []) parent.set(child, i);
  });
  // a point of a node's frame in its parent's: scaled, turned by the node's quaternion, moved
  const up = (n, [x, y, z]) => {
    const [sx, sy, sz] = n.scale ?? [1, 1, 1];
    const [qx, qy, qz, qw] = n.rotation ?? [0, 0, 0, 1];
    const v = [x * sx, y * sy, z * sz];
    const t = [2 * (qy * v[2] - qz * v[1]), 2 * (qz * v[0] - qx * v[2]), 2 * (qx * v[1] - qy * v[0])];
    const [tx, ty, tz] = n.translation ?? [0, 0, 0];
    return [
      v[0] + qw * t[0] + (qy * t[2] - qz * t[1]) + tx,
      v[1] + qw * t[1] + (qz * t[0] - qx * t[2]) + ty,
      v[2] + qw * t[2] + (qx * t[1] - qy * t[0]) + tz,
    ];
  };
  return new Map(
    gltf.nodes.map((n, i) => {
      let at = [0, 0, 0];
      for (let k = i; k !== undefined; k = parent.get(k)) at = up(gltf.nodes[k], at);
      return [n.name, at];
    }),
  );
}

for (const file of globSync('missions/*/*/flights/*/flight.ts', { cwd: root })) {
  const { flight } = await import(pathToFileURL(join(root, file)).href);
  for (const model of flight.models.filter((m) => m.cabin))
    test(`${flight.id}: ${model.id}'s cabin matches its GLB`, () => {
      const nodes = nodesOf(join(root, 'public', model.url));
      const cabin = model.cabin;
      for (const name of cabin.within) assert.ok(nodes.has(name), `within: no node ${name}`);
      const seen = new Set();
      for (const i of cabin.instruments) {
        const extras = nodes.get(i.node);
        assert.ok(extras, `instrument ${i.node} is not in ${model.url}`);
        assert.ok(!seen.has(i.node), `instrument ${i.node} is listed twice`);
        seen.add(i.node);
        const scale = extras.turn ?? extras.slide;
        assert.ok(scale || extras.drum, `${i.node} has no scale in its extras (turn, slide or drum)`);
        if (scale) {
          assert.ok(scale.length >= 4 && scale.length % 2 === 0, `${i.node}: a scale is pairs of value and position`);
          for (let k = 2; k < scale.length; k += 2) assert.ok(scale[k] >= scale[k - 2], `${i.node}: its scale is not in order of value`);
        }
        assert.ok(i.name && i.about, `${i.node}: a name and something to say about it`);
        assert.ok(i.reads || /not simulated/i.test(i.about), `${i.node} reads nothing, and does not say it is not simulated`);
        // (a history read off the record: each reading's event is one of the record's)
        for (const h of i.history ?? [])
          if (h.from)
            assert.ok(
              (flight.orbital?.events ?? []).some((e) => e.id === h.from),
              `${i.node}: no event ${h.from} in the record`,
            );
        if (i.reads?.startsWith('supply'))
          assert.ok(flight.trajectory?.body?.capsule.rcs?.supplies[Number(i.reads.slice(6))], `${i.node}: no such supply as ${i.reads}`);
      }
      for (const l of cabin.lamps ?? []) {
        assert.ok(nodes.has(l.node), `lamp ${l.node} is not in ${model.url}`);
        assert.ok(l.shows || /not simulated|stays dark|not aboard/i.test(l.about), `${l.node} shows nothing, and does not say so`);
        // (an event of an orbital flight's record, by its id; and what puts it out, likewise)
        const ids = new Set((flight.orbital?.events ?? []).map((e) => e.id));
        if (l.shows?.startsWith('event:')) assert.ok(ids.has(l.shows.slice(6)), `${l.node}: no event ${l.shows} in the record`);
        if (l.until) assert.ok(ids.has(l.until), `${l.node}: no event ${l.until} in the record`);
      }
      for (const c of cabin.controls ?? []) {
        assert.ok(nodes.has(c.node), `control ${c.node} is not in ${model.url}`);
        if (c.does)
          assert.ok(
            // (or a key of a logical lock, `code:<digit>`, or the manual orientation's switch, which an orbital flight's deck hears: orbitdeck.ts `ask`)
            ['tower', 'separate', 'retro', 'retropack', 'drogue', 'main', 'abort', 'next', 'manual'].includes(c.does) ||
              /^code:\d$/.test(c.does),
            `${c.node}: ${c.does}`,
          );
        // a control that stands as a state of the deck has a position for each way: as built, and thrown
        if (c.holds) {
          const throws = nodes.get(c.node).throw;
          assert.ok(Array.isArray(throws) && throws.length >= 2 && throws[0] === 0, `${c.node}: holds ${c.holds} and has no throw`);
          assert.ok(['free'].includes(c.holds), `${c.node}: the deck has no state ${c.holds}`);
        }
      }
      if (cabin.globe) assert.ok(nodes.has(cabin.globe.node), `globe ${cabin.globe.node} is not in ${model.url}`);
      if (cabin.periscope?.ring)
        assert.ok(nodes.has(cabin.periscope.ring.mesh), `ring ${cabin.periscope.ring.mesh} is not in ${model.url}`);
      if (cabin.lighting) {
        // the lights' switch is a node with a turn for each position it has, the first as built; and each position
        // lights lamps the model has, each with its tube in the file
        const lever = nodes.get(cabin.lighting.control);
        assert.ok(lever, `lighting: no control ${cabin.lighting.control} in ${model.url}`);
        assert.ok(Array.isArray(lever.throw) && lever.throw[0] === 0, `${cabin.lighting.control}: its extras give no throw from as built`);
        assert.equal(lever.throw.length, cabin.lighting.ways.length, `${cabin.lighting.control}: a position for every turn of its lever`);
        assert.ok(new Set(lever.throw).size === lever.throw.length, `${cabin.lighting.control}: two positions at one turn`);
        // and it stands on its switch, within reach of the seat: a lever left at the model's origin turns there, unseen
        const places = nodesOf(join(root, 'public', model.url), true);
        const seat = places.get(model.seats?.[0]?.node ?? '');
        const at = places.get(cabin.lighting.control);
        assert.ok(seat, `lighting: no seat to work ${cabin.lighting.control} from`);
        const off = Math.hypot(at[0] - seat[0], at[1] - seat[1], at[2] - seat[2]);
        assert.ok(
          Math.hypot(...at) > 0.05 && off > 0.2 && off < 1.2,
          `${cabin.lighting.control} is ${off.toFixed(2)} m from the seat, at ${at}`,
        );
        const lamps = model.lights ?? [];
        for (const way of cabin.lighting.ways) {
          assert.ok(way.says, 'a position says what it is');
          for (const i of way.lit) assert.ok(lamps[i], `lighting: ${way.says} lights lamp ${i}, and the model has ${lamps.length}`);
        }
        assert.deepEqual(
          cabin.lighting.ways[0].lit,
          lamps.map((_, i) => i),
          'as built, every lamp the model draws lit is lit',
        );
        assert.equal((cabin.lighting.fittings ?? []).length, lamps.length, 'lighting: a fitting for each lamp');
        for (const fitting of cabin.lighting.fittings ?? [])
          assert.ok(nodes.has(fitting), `lighting: no fitting ${fitting} in ${model.url}`);
        assert.ok(cabin.lighting.name && cabin.lighting.about);
      }
      if (cabin.stick) {
        assert.ok(nodes.has(cabin.stick.node), `stick ${cabin.stick.node} is not in ${model.url}`);
        for (const axis of [cabin.stick.pitch, cabin.stick.roll, cabin.stick.yaw]) near(Math.hypot(...axis), 1);
      }
      if (cabin.periscope) {
        assert.ok(nodes.has(cabin.periscope.screen), `periscope: no screen ${cabin.periscope.screen} in ${model.url}`);
        near(Math.hypot(...cabin.periscope.axis), 1);
        assert.ok(
          cabin.periscope.fields.length > 0 && cabin.periscope.fields.every((f, k, all) => f > 0 && f <= 180 && (!k || f < all[k - 1])),
        );
      }
      // whoever sits here is one of the flight's own figures
      for (const seat of model.seats ?? [])
        if (seat.figure)
          assert.ok(
            flight.models.some((m) => m.id === seat.figure && m.walker),
            `seat ${seat.node}: no figure ${seat.figure}`,
          );
    });
}

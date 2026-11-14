// src/viewer/chute.ts: how a parachute opens against the simulator's seconds, the cloth's line, how it is cut, and
// that what is built from them hangs together. The looks are judged by eye; these are the parts that are arithmetic.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { flight } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { bands, Chute, FILLED, mouth, paid, profile, STREAM, TEARS, tornMouth } from '../src/viewer/chute.ts';

const near = (got, want, tolerance, what) =>
  assert.ok(Math.abs(got - want) <= tolerance, `${what}: got ${got}, want ${want} within ${tolerance}`);
const measure = (value) => ({ value, confidence: 'estimated', source: 'a test' });
const CHUTES = flight.flies.chutes;
const moment = (since, fills, more = {}) => ({
  since,
  fills,
  air: new THREE.Vector3(0, -9, 0),
  up: new THREE.Vector3(0, 1, 0),
  torn: -1,
  seen: 1,
  down: -1,
  floor: 0,
  ...more,
});

test('the mouth opens with the simulator’s seconds: a streamer when out, never closing, full at `fills`', () => {
  for (const def of [{}, { stretch: measure(0.5) }, { reefed: { mouth: measure(0.25), until: measure(7) } }, ...CHUTES]) {
    const fills = 9;
    assert.equal(mouth(def, 0, fills), STREAM, 'a streamer the moment it is out');
    assert.equal(mouth(def, -1, fills), STREAM);
    assert.equal(mouth(def, fills, fills), 1, 'full when the simulator has it full');
    assert.equal(mouth(def, fills + 100, fills), 1);
    let last = 0;
    for (let t = 0; t <= fills; t += 0.01) {
      const m = mouth(def, t, fills);
      assert.ok(Number.isFinite(m) && m >= last - 1e-12 && m <= 1, `it only opens: ${m} after ${last} at ${t}`);
      last = m;
    }
  }
  // with no reefing its area, the width squared, grows evenly, as the simulator's drag does
  near((mouth({}, 4.5, 9) - STREAM) / (1 - STREAM), Math.sqrt(0.5), 1e-12, 'half the area at half the time');
});

test('a reefed mouth is held at the reefed width until it is let go, and paying out comes first', () => {
  const def = { reefed: { mouth: measure(0.25), until: measure(7) }, stretch: measure(0.8) };
  assert.equal(mouth(def, 0.79, 9), STREAM, 'still a streamer before line stretch');
  for (const t of [3, 5, 6.99]) near(mouth(def, t, 9), 0.25, 1e-9, `held at ${t} s`);
  assert.ok(mouth(def, 8, 9) > 0.25 && mouth(def, 8, 9) < 1, 'opening once let go');
  assert.equal(paid(def, 0), 0);
  near(paid(def, 0.4), 0.5, 1e-12, 'half paid out at half the time to line stretch');
  assert.equal(paid(def, 0.8), 1);
  assert.equal(paid({}, 0), 1, 'with no time given it is at its lines’ length at once');
});

test('the cloth is as long as it is whatever the opening, and filled it is two thirds of its made width across', () => {
  for (const open of [STREAM, 0.1, 0.25, 0.5, 0.8, 1]) {
    let length = 0;
    let widest = 0;
    let [r0, y0] = profile(open, 0);
    near(r0, 0, 1e-12, 'the apex is on the axis');
    near(y0, 0, 1e-12, 'and is where depth is measured from');
    for (let i = 1; i <= 960; i++) {
      const [r, y] = profile(open, i / 960);
      assert.ok(
        Number.isFinite(r) && Number.isFinite(y) && r >= 0 && y <= y0 + 1e-12,
        'it goes down from the apex and never crosses the axis',
      );
      length += Math.hypot(r - r0, y - y0);
      widest = Math.max(widest, r);
      [r0, y0] = [r, y];
    }
    near(length, 1, 0.002, `cloth length with the mouth ${open} open`);
    assert.ok(profile(open, 1)[0] <= widest + 1e-12, 'the skirt is no wider than the shoulder');
    if (open === 1) near(widest, FILLED, 0.01, 'filled width');
    near(profile(open, 1)[0], FILLED * open * 0.97, 0.02 * FILLED, 'the mouth is as wide as it is said to be');
  }
  // not a hemisphere: a quarter of the way down the cloth the crown is flatter than a ball of that width would be
  const [r, y] = profile(1, 0.25);
  const ball = FILLED * (1 - Math.cos(0.25 / FILLED));
  assert.ok(-y < 0.7 * ball, `a flat crown: ${(-y).toFixed(3)} down where a ball is ${ball.toFixed(3)}`);
  assert.ok(r > 0.24, 'so the cloth there runs nearly straight out');
});

test('the cloth is cut in bands that run apex to skirt in order, with openings between and a vent at the crown', () => {
  for (const cut of ['ringsail', 'ribbon']) {
    const all = bands(cut);
    assert.ok(all[0].from > 0, 'a vent');
    let cloth = 0;
    all.forEach((b, i) => {
      assert.ok(b.from < b.to && b.to <= b.close && b.close <= 1 + 1e-12, 'a band runs down the gore');
      if (i > 0) assert.ok(b.from >= all[i - 1].close - 1e-12, 'and the next begins at or below it');
      cloth += b.to - b.from;
    });
    if (cut === 'ringsail') {
      near(all.at(-1).to, 1, 1e-12, 'the last sail is the skirt');
      assert.ok(
        all.slice(0, -1).every((b, i) => b.close === all[i + 1].from),
        'each reaches the next at the seams: the openings are crescents',
      );
      assert.ok(all.some((b) => b.full > 0) && all[0].full === 0, 'sails stand fuller at their lower edge; the crown’s rings do not');
      assert.ok(cloth > 0.8, 'mostly cloth');
    } else {
      assert.ok(
        all.every((b) => b.close === b.to),
        'a ribbon’s slots are open right across',
      );
      assert.ok(cloth < 0.75 && cloth > 0.5, `ribbons and slots: ${cloth.toFixed(2)} cloth`);
    }
  }
});

test('built from the flight’s data: every line is its length, nothing is not a number, and it settles flat', () => {
  for (const def of CHUTES) {
    const chute = new Chute(def, new THREE.Group());
    const fills = flight.trajectory[def.on].fills.value;
    const cloths = chute.group.children[0].children;
    assert.equal(cloths.length, def.colours.value.length, 'a mesh for each colour');
    assert.ok(
      cloths.every((m) => m.castShadow),
      'it casts a shadow',
    );
    const lines = chute.group.children[1].geometry.getAttribute('position');
    assert.equal(lines.count, (1 + def.gores.value) * 4, 'a riser and a line a gore, each a ribbon');
    const finite = (attribute) => Array.from(attribute.array).every(Number.isFinite);
    for (const since of [0, 0.01, (def.stretch?.value ?? 0) / 2, fills / 3, fills, fills + 60]) {
      chute.set(moment(since, fills), 1);
      assert.ok(chute.group.visible);
      for (const m of cloths)
        assert.ok(finite(m.geometry.getAttribute('position')) && finite(m.geometry.getAttribute('normal')), `cloth at ${since} s`);
      assert.ok(finite(lines), `lines at ${since} s`);
      const out = paid(def, since);
      const a = new THREE.Vector3();
      const b = new THREE.Vector3();
      near(
        b.fromBufferAttribute(lines, 2).distanceTo(a.fromBufferAttribute(lines, 0)),
        def.riser.value * out,
        1e-4,
        `the riser at ${since} s`,
      );
      for (let g = 0; g < def.gores.value; g++) {
        a.fromBufferAttribute(lines, 4 + g * 4);
        b.fromBufferAttribute(lines, 6 + g * 4);
        if (out === 1) near(a.distanceTo(b), def.lines.value, 1e-3, `line ${g} at ${since} s`);
        else assert.ok(a.distanceTo(b) <= def.lines.value + 1e-3, 'paying out: no longer than it is');
      }
    }
    // full, it is two thirds of its made diameter across (and up to a fifth more where the gores stand out: most on a canopy of few gores)
    const across = new THREE.Box3().setFromBufferAttribute(cloths[0].geometry.getAttribute('position')).getSize(new THREE.Vector3());
    assert.ok(
      across.x > FILLED * def.diameter.value * 0.98 && across.x < FILLED * def.diameter.value * 1.2,
      `${across.x.toFixed(2)} m across`,
    );
    // down on a flight flown by hand: after it has settled the cloth is within half a metre of flat, wider than it flew, and stays so
    chute.set(moment(fills + 60, fills, { down: 30, floor: -2, air: new THREE.Vector3() }), 1);
    const flat = new THREE.Box3().setFromBufferAttribute(cloths[0].geometry.getAttribute('position')).getSize(new THREE.Vector3());
    assert.ok(flat.y < 0.5 && flat.x > across.x, `settled: ${flat.y.toFixed(2)} m deep, ${flat.x.toFixed(1)} m across`);
    const before = Array.from(cloths[0].geometry.getAttribute('position').array);
    chute.set(moment(fills + 60, fills, { down: 300, floor: -2, air: new THREE.Vector3() }), 1);
    assert.deepEqual(Array.from(cloths[0].geometry.getAttribute('position').array), before, 'and it lies still');
    chute.set(null, 1);
    assert.equal(chute.group.visible, false);
    chute.dispose();
  }
});

test('it breathes on the simulator’s seconds: the same instant is the same cloth', () => {
  const def = CHUTES.find((c) => c.on === 'main');
  const chute = new Chute(def, new THREE.Group());
  const cloth = chute.group.children[0].children[0].geometry.getAttribute('position');
  const at = (since) => {
    chute.set(moment(since, 9), 1);
    return Array.from(cloth.array);
  };
  const a = at(100);
  const b = at(100.6);
  assert.notDeepEqual(a, b, 'the skirt has moved');
  const most = Math.max(...a.map((v, i) => Math.abs(v - b[i])));
  assert.ok(most < 0.03 * def.diameter.value, `gently: ${most.toFixed(3)} m at most`);
  assert.deepEqual(at(100), a, 'and back at the same second it is the same shape');
});

test('a canopy that tears lets its air go and streams, from the mouth it had', () => {
  for (const open of [1, 0.25]) {
    assert.equal(tornMouth(open, -1), open, 'whole, it is as open as it was');
    assert.equal(tornMouth(open, 0), open, 'at the instant it tears, the same: nothing jumps');
    assert.equal(tornMouth(open, TEARS), STREAM, 'a streamer once it has gone');
    assert.equal(tornMouth(open, 60), STREAM, 'and it stays one');
    let last = open;
    for (let t = 0; t <= TEARS; t += TEARS / 20) {
      const m = tornMouth(open, t);
      assert.ok(m <= last + 1e-12, 'closing all the way');
      last = m;
    }
  }
});

// An orbital flight's descent drawn (types.ts ChuteDef.body, flies.drops[].rides, flies.hangs): each parachute and each piece
// names what the simulator flies, and the seat left at the pilot's canopy comes down as a body of its own.
test('Vostok 1’s descents: every parachute and every piece drawn names a body and a parachute flyDown flies', async () => {
  const { flight: v } = await import('../missions/ussr/vostok/flights/vostok-1/flight.ts');
  const { flyWhole, descentOf } = await import('../src/sim/staged.ts');
  const { siteFrame } = await import('../src/world/frames.ts');
  const { julianDate } = await import('../src/world/time.ts');
  const o = v.orbital;
  const jd = julianDate(v.launch);
  const whole = flyWhole(o, siteFrame(v.site), jd, v.site.seaLevel.value, undefined, 10, 'published');
  const drawn = descentOf(whole, jd, (v.flies.datum ?? 0) + (o.ascent.centre?.value ?? 0));
  assert.ok(drawn, 'the record’s run comes down from the ejection height');
  for (const c of v.flies.chutes.filter((c) => c.body)) {
    const body = o.descent.bodies.find((b) => b.id === c.body);
    assert.ok(
      body?.chutes.some((p) => p.name === c.on),
      `${c.on} is a parachute of ${c.body}`,
    );
    assert.ok(Number.isFinite(drawn.opened[c.body][c.on]), `${c.on} comes out on the record’s run`);
    assert.ok(
      Math.abs(c.diameter.value ** 2 * (Math.PI / 4) - body.chutes.find((p) => p.name === c.on).dragArea.value / 0.75) < 1,
      `${c.on}: drawn with the area its drag is worked on`,
    );
  }
  for (const d of v.flies.drops.filter((d) => d.rides))
    for (const r of d.rides) assert.ok(drawn.tracks[r.body]?.length > 1, `${d.nodes[0]} rides ${r.body}, which is flown`);
  for (const h of v.flies.hangs) assert.ok(Number.isFinite(drawn.opened[h.body][h.from]), `the figure comes in as ${h.from} comes out`);
  // the seat begins where the pilot left it, with the stabilising parachute, and lands before him
  const seat = drawn.tracks.seat;
  assert.equal(seat[0].t, drawn.opened.pilot['main canopy']);
  assert.ok(whole.down.landed.seat.at < whole.down.landed.pilot.at);
  // each of the module's parachutes is let go as the next comes out
  assert.equal(drawn.gone.module['pilot parachute'], drawn.opened.module['braking parachute']);
  assert.equal(drawn.gone.module['braking parachute'], drawn.opened.module['main parachute']);
});

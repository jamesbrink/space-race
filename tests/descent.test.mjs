// The descent of an orbital flight given by hand (src/sim/orbital.ts flyDown with `DescentHands`, flyOrbit handing over at
// a hand's first event; staged.ts flyOn): the same physics as the record's run, each event at the instant a hand gives it,
// with its consequence by the flight's own limits (the tear rule, the crew's landings and the air's blast). Nothing given,
// it is the record's run to the last bit. Each ending prints what it came to.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/ussr/vostok/flights/vostok-1/flight.ts';
import { decay } from '../src/sim/orbital.ts';
import { byHand, flyOn, published } from '../src/sim/staged.ts';
import { downVerdict } from '../src/sim/verdict.ts';
import { orbitalFlown } from '../src/viewer/ascent.ts';
import { siteFrame } from '../src/world/frames.ts';
import { EARTH_ROTATION_RATE } from '../src/world/bodies.ts';
import { subpoint } from '../src/world/orbit.ts';
import { greenwichSiderealTime, julianDate } from '../src/world/time.ts';

const o = flight.orbital;
const site = siteFrame(flight.site);
const jd = julianDate(flight.launch);
const sea = flight.site.seaLevel.value;
const shown = orbitalFlown(flight);
const from = published(o, shown.ascent.separation);
const fly = (plan, hands) => flyOn(plan, site, jd, sea, shown.ascent, from, hands);
const wall = (t) => new Date(Date.parse(flight.launch) + t * 1000 + 3 * 3600_000).toISOString().slice(11, 19);
const field = (at) => {
  const r = Math.PI / 180;
  const [la, lo] = [o.landing.latitude.value * r, o.landing.longitude.value * r];
  return (
    6371 *
    Math.acos(
      Math.min(1, Math.sin(la) * Math.sin(at.latitude * r) + Math.cos(la) * Math.cos(at.latitude * r) * Math.cos(at.longitude * r - lo)),
    )
  );
};
const say = (name, whole, decayed, plan = o) => {
  const v = downVerdict(plan, whole, wall, field, decayed);
  console.log(`  # ${name}: ${v.how}. ${v.why.join(' ')} Survivable: ${v.survivable}`);
  return v;
};
/** When the entry body first falls through `height` after the burn on a run: on the coast, or on its own track below. */
const gast0 = greenwichSiderealTime(jd);
const heightOf = (p) => subpoint(p.r, gast0 + EARTH_ROTATION_RATE * p.t).height - sea;
const through = (whole, height) => {
  const coast = whole.coast.samples.filter((x) => x.t > o.retro.off.value && x.phase !== 'down');
  const track = whole.down?.tracks[o.descent.bodies[0].id] ?? [];
  return [...coast, ...track].find((p) => heightOf(p) <= height)?.t ?? Number.NaN;
};
const off = (t) => ({ given: {}, switched: [{ t, on: false }] });

test('nothing given: the record’s descent to the last bit', () => {
  const again = fly(o, { given: {}, switched: [] });
  assert.deepEqual(again.down.landed, shown.down.landed);
  assert.deepEqual(again.down.opened, shown.down.opened);
  assert.equal(again.down.ejected, shown.coast.results.ejectionAt);
  assert.deepEqual(shown.down.torn.module, {}, 'no parachute of the record’s tears by the limits taken');
  assert.deepEqual(shown.down.torn.pilot, {});
  const v = say('as the record', shown);
  assert.equal(v.survivable, true);
});

test('the sequencer off and nothing given: no ejection, no parachute, the ball with him in it into the ground', () => {
  const w = fly(o, off(o.retro.off.value + 60));
  assert.ok(Number.isNaN(w.down.ejected));
  assert.deepEqual(w.down.opened.module, {});
  assert.ok(w.down.landed.module.speed > 50, `${w.down.landed.module.speed.toFixed(0)} m/s`);
  assert.equal(say('nothing given', w).survivable, false);
});

test('never ejected: he rides the ball down on its parachutes, given by hand at their heights, and lands at its 10 m/s', () => {
  let hands = off(o.retro.off.value + 60);
  let w = fly(o, hands);
  for (const [name, h] of [
    ['pilot parachute', 7000],
    ['braking parachute', 4000],
    ['main parachute', 2500],
  ]) {
    hands = { ...hands, given: { ...hands.given, [`module/${name}`]: through(w, h) } };
    w = fly(o, hands);
  }
  assert.ok(Number.isNaN(w.down.ejected), 'never ejected');
  assert.ok(w.down.tracks.cover, 'the cover goes as the module’s first parachute is let out');
  assert.ok(!w.down.tracks.pilot && !w.down.tracks.hatch, 'and neither he nor his hatch leave');
  const l = w.down.landed.module;
  assert.ok(l.speed > shown.down.landed.module.speed, 'heavier by him and his seat, it lands faster than the empty module');
  const v = say('ejection never', w);
  assert.equal(v.survivable, false, 'past the landing taken as lived through aboard');
});

test('the modules never parted: the ball comes down with the instrument module hanging on, and its main parachute gives', () => {
  const plan = structuredClone(o);
  plan.entry.separation.value = Number.MAX_SAFE_INTEGER;
  const w = fly(plan);
  assert.ok(Number.isNaN(w.down.parted));
  assert.ok(w.down.torn.module['main parachute'], 'twice the mass on the main');
  assert.ok(w.down.landed.module.speed > 20);
  const v = say('modules never parted', w, undefined, plan);
  assert.equal(v.survivable, true, 'he left at 7 km all the same, on his own parachutes');
});

test('a parachute let out too fast tears: the module’s main at 7 km', () => {
  const at = shown.coast.results.ejectionAt;
  const w = fly(o, { given: { 'module/main parachute': at }, switched: [] });
  assert.equal(w.down.torn.module['main parachute']?.by, 'pressure');
  say('main at 7 km', w);
});

test('ejected above the air: he meets the entry on his own, and its blast is past any man', () => {
  const at = shown.coast.results.interfaceAt;
  const w = fly(o, { given: { ejection: at }, switched: [] });
  assert.ok(Math.abs(w.down.ejected - at) < 1e-6);
  assert.ok(w.down.peak.pilot.speed > o.descent.crew.fastest.value, 'out in the air at the speed of the entry');
  assert.equal(say('ejected at 100 km', w).survivable, false);
});

test('ejected low: the canopy has no time to fill', () => {
  // the sequencer off above 7 km, he goes at 1 km and his main canopy with him
  let w = fly(o, off(o.retro.off.value + 60));
  const at = through(w, 1000);
  w = fly(o, { given: { ejection: at, 'pilot/main canopy': at }, switched: [{ t: o.retro.off.value + 60, on: false }] });
  assert.ok(w.down.landed.pilot.speed > o.descent.crew.landing.alone.value);
  assert.equal(say('ejected at 1 km', w).survivable, false);
});

test('a forward burn stays up, and the card says how long its orbit lasts against the supplies', () => {
  const at = o.retro.on.value;
  const s = shown.coast.samples.find((p) => p.t >= at);
  const plan = byHand(
    o,
    s.t,
    s.v.map((c) => c / Math.hypot(...s.v)),
  );
  const w = fly(plan);
  assert.equal(w.down, null);
  const end = w.coast.samples.at(-1);
  const lasts = decay(plan, jd, sea, end);
  assert.ok(lasts > 0);
  say('forward burn from the record’s orbit', w, lasts, plan);
});

test('as drawn, each body comes to rest on the drawn surface (the globe at the sea), not the ground’s 43 m above it', async () => {
  const { descentOf } = await import('../src/sim/staged.ts');
  const centre = (flight.flies?.datum ?? 0) + (o.ascent.centre?.value ?? 0);
  const drawn = descentOf(shown, jd, centre, o.descent.ground.value);
  const plain = descentOf(shown, jd, centre, 0);
  // (fly.ts's frame that does not turn, back into the frame of date: the drawn point's height over the sea)
  const [c, s] = [Math.cos(gast0), Math.sin(gast0)];
  const height = (p) => heightOf({ t: p.t, r: [c * p.r[0] - s * p.r[1], s * p.r[0] + c * p.r[1], p.r[2]] });
  for (const id of Object.keys(shown.down.landed)) {
    const end = drawn.tracks[id].at(-1);
    assert.ok(Math.abs(height(end)) < 0.5, `${id} at ${height(end).toFixed(2)} m over the drawn sea`);
    // high up it is where it flew
    const top = drawn.tracks[id][0];
    if (height(plain.tracks[id][0]) > 2000) assert.deepEqual(top.r, plain.tracks[id][0].r);
  }
});

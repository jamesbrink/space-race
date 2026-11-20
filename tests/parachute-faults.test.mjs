// A parachute that stays in its container and one that fouls in the shadow of another (sim/descent.ts: a ChuteDef's `stays`
// and `fouls`), as Soyuz 1's record has them: the drogue out with the cover, the main held in its container, the reserve put
// out by the system's speed check and caught in the shadow of the drogue, which stayed fast to the main's pack. The hardware's
// faults whatever a hand gives; each ending prints what it came to.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/ussr/soyuz/flights/soyuz-1/flight.ts';
import { downOf } from '../src/sim/descent.ts';
import { coastOf } from '../src/sim/orbital.ts';
import { orbitalFlown } from '../src/sim/run.ts';
import { flyOn } from '../src/sim/staged.ts';
import { downVerdict } from '../src/sim/verdict.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { siteFrame } from '../src/world/frames.ts';

const record = flight.plan;
const down = downOf(record);
const timed = coastOf(record);
const shown = orbitalFlown(flight);
const site = siteFrame(flight.site);
const dated = frameOf(flight);
const sea = flight.site.seaLevel.value;
const fly = (hands) => flyOn(record, site, dated, sea, shown.ascent, shown.ascent.separation, hands);
const wall = (t) => new Date(Date.parse(flight.launch) + t * 1000 + 3 * 3600_000).toISOString().slice(11, 19);
const say = (name, whole) => {
  const v = downVerdict(record, whole, wall, () => 0);
  console.log(`  # ${name}: ${v.how}. ${v.why.join(' ')} Survivable: ${v.survivable}`);
  return v;
};
const module = down.bodies[0];
const chute = (name) => module.chutes.find((c) => c.name === name);

test('the record’s faults are in its plan: the main stays, the reserve fouls on the drogue', () => {
  assert.ok(chute('main parachute').stays);
  assert.deepEqual(chute('reserve parachute').fouls.by, ['drogue parachute']);
  assert.ok(!chute('drogue parachute').stays && !chute('drogue parachute').fouls);
});

test('as the record: the drogue out, the main never, the reserve out in its shadow and never filled; into the ground', () => {
  const opened = shown.down.opened.module;
  assert.ok(opened['drogue parachute'] > 0);
  assert.equal(opened['main parachute'], undefined, 'the main stayed in its container');
  assert.ok(opened['reserve parachute'] > opened['drogue parachute']);
  assert.equal(shown.down.gone.module['drogue parachute'], undefined, 'nothing let the drogue go');
  const torn = shown.down.torn.module['reserve parachute'];
  assert.equal(torn?.by, 'fouled');
  assert.equal(torn.t, opened['reserve parachute']);
  // (the soft-landing engines wait on the main, which never came out)
  assert.deepEqual(shown.down.fired.module ?? {}, {});
  const landed = shown.down.landed.module;
  assert.ok(landed.speed > 30 && landed.speed < 45, `${landed.speed.toFixed(1)} m/s`);
  const v = say('as the record', shown);
  assert.equal(v.survivable, false);
  assert.ok(v.why.some((w) => w.includes('main parachute never came out')));
  assert.ok(v.why.some((w) => w.includes('reserve parachute came out') && w.includes('never filled')));
});

test('given by hand: the main still stays; without the reserve the module falls faster on the drogue alone', () => {
  const t = timed.off + 60;
  // (the sequencer off after the burn: the parting, the cover, the drogue and the main given by hand at the record's instants)
  const out = shown.down.opened.module['drogue parachute'];
  const given = {
    [timed.parting]: shown.down.parted,
    [down.ejection]: out,
    'module/drogue parachute': out,
    'module/main parachute': out + 17,
  };
  const w = fly({ given, switched: [{ t, on: false }] });
  assert.ok(w.down.opened.module['drogue parachute'] > 0);
  assert.equal(w.down.opened.module['main parachute'], undefined);
  assert.equal(w.down.opened.module['reserve parachute'], undefined, 'not given, and the sequencer off: it stays packed');
  assert.ok(w.down.landed.module.speed > shown.down.landed.module.speed);
  assert.equal(say('the main given by hand, the sequencer off', w).survivable, false);
});

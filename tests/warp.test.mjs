// src/sim/warp.ts: where a warp may go on a coast on rails. Each apsis where the motion about the body turns, placed to
// a millisecond; a pass of a body (an apsis of a path it is not bound to) told from one that comes every revolution; the
// air come down to; the burns' lead-ins; the order of it all, what "the next" is, and what a warp stops for on its way.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/ussr/vostok/flights/vostok-2/flight.ts';
import { apsides, comesDown, LEAD_IN, nextWarp, trackOf, warpStop, warpTargets } from '../src/sim/warp.ts';
import { orbitalRecord } from '../src/sim/run.ts';
import { dot, length } from '../src/world/frames.ts';

const run = orbitalRecord(flight);

test('the apsides of a low orbit, each where the motion about the Earth turns, a perigee and an apogee in turn half a revolution apart', () => {
  const track = trackOf(run);
  const found = apsides(track, 1000, track.end, 4);
  assert.equal(found.length, 4, found.map((a) => a.what).join(', '));
  for (const a of found) {
    const c = track.centred(a.t);
    assert.ok(Math.abs(dot(c.r, c.v)) / (length(c.r) * length(c.v)) < 1e-6, `${a.what} at ${a.t.toFixed(3)}: still falling or rising`);
    assert.ok(!a.once, 'an orbit that goes round: every revolution');
  }
  const names = found.map((a) => a.what.split(' ')[0]);
  assert.ok(names[0] !== names[1] && names[0] === names[2] && names[1] === names[3], names.join(', '));
  // (Vostok 2's period was 88.5 minutes: half of it between each)
  for (let i = 1; i < found.length; i++) {
    const half = found[i].t - found[i - 1].t;
    assert.ok(half > 2300 && half < 3100, `${half.toFixed(0)} s apart`);
  }
});

test('a pass of a body is an apsis of a path not bound to it: it comes once', () => {
  // (a straight line past the Moon at 3 km/s, 10,000 km from its centre at its nearest)
  const line = {
    end: 10_000,
    instants: (from, to) => [0, 2000, 4000, 6000, 8000, 10_000].filter((t) => t > from && t <= to),
    centred: (t) => ({ central: 'moon', r: [1e7, 3000 * (t - 5000.5), 0], v: [0, 3000, 0] }),
    height: () => 1e7,
  };
  const [pass] = apsides(line, 0);
  assert.ok(Math.abs(pass.t - 5000.5) < 1e-3, `at ${pass.t}`);
  assert.ok(pass.once, 'once');
  assert.ok(pass.what.startsWith('Perilune'), pass.what);
  assert.equal(nextWarp([pass]), pass, 'and the next warp goes to it');
});

test('the run coming down through a height: between its samples, to a millisecond', () => {
  const track = trackOf(run);
  const t = comesDown(track, 1000, 120_000);
  assert.ok(Number.isFinite(t), 'Vostok 2 comes down');
  assert.ok(Math.abs(track.height(t) - 120_000) < 1, `${track.height(t)} m at ${t}`);
  assert.ok(Number.isNaN(comesDown(track, t + 1, 120_000)), 'and once');
});

test('what a warp could go to, in order; the next of it, which an orbit’s every apsis is not; and where a warp stops on its way', () => {
  const track = trackOf(run);
  const burn = { t: 5000, what: 'Retrofire' };
  const list = warpTargets(track, 1000, { burns: [burn], dues: [{ t: 3000, what: 'A mark' }], chosen: 4000 });
  for (let i = 1; i < list.length; i++) assert.ok(list[i].t > list[i - 1].t, 'in order of time');
  const lead = list.find((x) => x.kind === 'burn');
  assert.equal(lead.t, burn.t - LEAD_IN, 'a burn is gone to its lead-in before it');
  assert.equal(lead.what, 'Lead-in: Retrofire');
  // from within the lead-in, the burn itself
  assert.equal(warpTargets(track, 4800, { burns: [burn] }).find((x) => x.kind === 'burn').t, 5000);
  const next = nextWarp(list);
  assert.notEqual(next.kind, 'apsis', 'an apsis of an orbit that goes round is not "the next": one comes every 45 minutes');
  assert.equal(next.t, 3000);
  const time = list.find((x) => x.kind === 'time');
  assert.equal(time.t, 4000);
  assert.equal(warpStop(list, time).t, 3000, 'a warp to a time stops first at what is due before it');
  assert.equal(
    warpStop(
      list,
      list.find((x) => x.kind === 'event'),
    ),
    list.find((x) => x.kind === 'event'),
  );
  assert.ok(
    list.some((x) => x.kind === 'entry'),
    'and the air, come down to',
  );
});

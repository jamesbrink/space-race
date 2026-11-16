// The descent's one body object (src/sim/descent.ts `Descent`), flown two ways: whole by orbital.ts `flyDown` and as a
// flier the predictor steps (fliers.ts `descending`; `spacecraft` with `descend`, on from the ejection height). Each
// body's predicted landing must stand where the descent flown lands it, begun at the coast's handing over, part-way
// down, or from the coast before the ejection. The tolerances were set before it was run, from the two integrators:
// flyDown's fixed 0.05 s RK4 finds a height a step late (under a second, at the speeds under a parachute), the
// predictor finds it to the millimetre; under a canopy at 7 to 10 m/s a second is ten metres, and above it the
// difference in the instant a parachute comes out carries a body a few hundred metres at most.
import assert from 'node:assert/strict';
import { globSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { descending, spacecraft } from '../src/sim/fliers.ts';
import { planOfOrbital } from '../src/sim/planof.ts';
import { propagate } from '../src/sim/predict.ts';
import { flyWhole } from '../src/sim/staged.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { geodeticToEcef, length, siteFrame, sub } from '../src/world/frames.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const all = await Promise.all(
  globSync('missions/*/*/flights/*/flight.ts', { cwd: root }).map(
    async (file) => (await import(pathToFileURL(join(root, file)).href)).flight,
  ),
);
const SECONDS = 2;
const METRES = 500;
const SPEED = 0.5;

const apart = (a, b) =>
  length(
    sub(
      geodeticToEcef({ latitude: a.latitude, longitude: a.longitude, height: 0 }),
      geodeticToEcef({ latitude: b.latitude, longitude: b.longitude, height: 0 }),
    ),
  );

for (const f of all.filter((x) => x.orbital?.descent && x.site)) {
  const o = f.orbital;
  const dated = frameOf(f);
  const site = siteFrame(f.site);
  const sea = f.site.seaLevel.value;
  const where = { site, seaLevel: sea, frame: dated };
  const whole = flyWhole(planOfOrbital(o), site, dated, sea, undefined, 10, 'published');
  const down = whole.down;
  const predicted = (flier, start) => {
    const p = propagate(flier, start, where);
    p.run();
    return p.result;
  };
  const held = (got, want, what) => {
    assert.ok(got.impact, `${what}: it comes down`);
    const miss = apart(got.impact, want);
    console.log(
      `# ${f.id} ${what}: down at ${got.impact.t.toFixed(1)} s (flown ${want.at.toFixed(1)}), ${miss.toFixed(0)} m from it, ${got.impact.speed.toFixed(2)} m/s (${want.speed.toFixed(2)})`,
    );
    assert.ok(Math.abs(got.impact.t - want.at) < SECONDS, `${what}: ${got.impact.t} s against ${want.at}`);
    assert.ok(miss < METRES, `${what}: ${miss} m apart`);
    assert.ok(Math.abs(got.impact.speed - want.speed) < SPEED, `${what}: ${got.impact.speed} m/s against ${want.speed}`);
  };
  test(`${f.id}: each body's predicted descent lands where the descent flown lands it`, () => {
    assert.ok(down, 'the record’s run comes down');
    const begun = down.tracks[o.descent.bodies[0].id][0];
    for (const b of o.descent.bodies.slice(0, 2)) {
      const want = down.landed[b.id];
      held(
        predicted(descending(planOfOrbital(o), dated, sea, { t: begun.t }, { follow: b.id }), begun),
        want,
        `${b.id} from the handing over`,
      );
    }
  });
  test(`${f.id}: begun part-way down, from the run's own state of each body`, () => {
    const first = o.descent.bodies[0];
    const track = down.tracks[first.id];
    // after its first parachute is out, and again under its last
    for (const at of [Object.values(down.opened[first.id])[0] + 30, down.landed[first.id].at - 120]) {
      const s = track.findLast((x) => x.t <= at);
      held(
        predicted(descending(planOfOrbital(o), dated, sea, { t: s.t }, { follow: first.id, from: down }), s),
        down.landed[first.id],
        `${first.id} from ${s.t.toFixed(0)} s`,
      );
    }
  });
  test(`${f.id}: the spacecraft's path, with the descent asked for, goes on from the ejection height to the followed body's landing`, () => {
    const first = o.descent.bodies[0];
    const samples = whole.coast.samples;
    const s = samples.findLast((x) => x.t <= down.tracks[first.id][0].t - 300);
    const start = { t: s.t, r: s.r, v: s.v };
    const short = predicted(spacecraft(planOfOrbital(o), dated, site, sea, start), start);
    assert.ok(
      short.impact && Math.abs(short.impact.altitude - o.ejection.altitude.value) < 1,
      'without it, it stops where the pilot leaves',
    );
    held(
      predicted(spacecraft(planOfOrbital(o), dated, site, sea, start, { descend: { follow: first.id } }), start),
      down.landed[first.id],
      `${first.id} from the coast`,
    );
  });
}

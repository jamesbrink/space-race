// The path "if cut now" on a staged launch vehicle (sim/fliers.ts `guided`, stopped; orbitdeck.ts `predict`) against the
// live vehicle (stagedlive.ts) cut by hand and flown on with nothing more done: at seeded instants of every flight into
// orbit, the sequencer on or off and guidance on or off, its engines cut, what it then does by itself (what was let go
// parting, the sequencer letting go what it lets go at its instants) is what the path flies: the spacecraft parts where
// and when the live vehicle parts it, or the stack comes down where the live one comes down. Issue #56.
import assert from 'node:assert/strict';
import { globSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { guided } from '../src/sim/fliers.ts';
import { propagate } from '../src/sim/predict.ts';
import { turn } from '../src/sim/rigid.ts';
import { givenUp, sequenceOf, stagesOf, steer } from '../src/sim/staged.ts';
import { stagedPilot, stagedVehicle } from '../src/sim/stagedlive.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { length, siteFrame, sub } from '../src/world/frames.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const all = await Promise.all(
  globSync('missions/*/*/flights/*/flight.ts', { cwd: root }).map(
    async (file) => (await import(pathToFileURL(join(root, file)).href)).flight,
  ),
);
const flown = all.filter((f) => f.plan?.kind === 'orbital' && f.plan.attitude.some((a) => 'law' in a.hold) && f.site);

/** A seeded generator (mulberry32): the same instants on every run. */
function randOf(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const seedOf = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 1961);

/**
 * The live vehicle flown on its guidance and the record's sequence to `t1`, every engine then cut, the switches thrown
 * as given, and flown on with nothing more done until it parts, lands or breaks up: the state after the cut and at the end.
 */
function cutAt(f, t1, { sequence, guidance }) {
  const site = siteFrame(f.site);
  const frame = frameOf(f);
  const sea = f.site.seaLevel.value;
  const x = steer(f.plan, site, frame, sea);
  const v = stagedVehicle(f.plan, site, frame, sea, x);
  const options = { guidance: true, sequence: true, memo: { thetaTurn: null } };
  const asked = [];
  const pilot = stagedPilot(v, x, site, frame, sea, { ...options, steps: () => asked.splice(0) });
  // (the same object read every tick, as the deck's switches are: begin with the record's, then the hands')
  const live = stagedPilot(v, x, site, frame, sea, Object.assign(options, { steps: () => asked.splice(0) }));
  const first = sequenceOf(f.plan).stages.flatMap((k, i) => (k.from <= 0 ? [{ kind: 'ignite', stage: i }] : []));
  let s = v.tick(v.start(), { pitch: 0, yaw: 0, roll: 0, steps: first });
  while (s.t < t1 && !s.parted && !s.broke) s = v.tick(s, pilot);
  if (s.parted || s.broke) return null;
  stagesOf(f.plan).forEach((_, i) => {
    if (v.burning(s, i)) asked.push({ kind: 'cut', stage: i });
  });
  options.sequence = sequence;
  options.guidance = guidance;
  s = v.tick(s, live);
  if (v.thrust(s) > 0) return null; // (an engine with a tail-off still pushing: the hands would wait)
  const cut = s;
  while (!s.parted && !s.landed && !s.broke && s.t < cut.t + 1200) s = v.tick(s, live);
  return { v, x, site, frame, sea, cut, end: s, memo: options.memo };
}

/** The path from the state after the cut, as the deck makes it. */
function pathOf(f, c, sequence) {
  const start = { t: c.cut.t, r: c.cut.r, v: c.cut.v };
  const flier = guided(f.plan, c.site, c.sea, start, {
    vehicle: c.v,
    solved: c.x,
    state: c.cut,
    sequence,
    live: true,
    fired: c.cut.craft.fired,
    thetaTurn: c.memo.thetaTurn,
    plan: givenUp(f.plan),
    stopped: { axis: turn(c.cut.q, [1, 0, 0]) },
  });
  const job = propagate(flier, start, { site: c.site, seaLevel: c.sea, frame: c.frame });
  job.run();
  return job.result;
}

for (const f of flown) {
  // (a minute's ticks a second on a runner: each flight is held to four minutes, so a slow one fails by its name)
  test(`${f.id}: cut by hand at generated instants, the path flies what the vehicle then does by itself`, { timeout: 240_000 }, () => {
    const rand = randOf(seedOf(f.id));
    // (the instants are the ascent's: to the spacecraft's parting, and no later than 15 minutes, which no ascent reaches;
    // a parting set hours on, after a docking, is not an ascent's)
    const parting = Math.min(sequenceOf(f.plan).stages.at(-1).sep, 900);
    for (let n = 0; n < 3; n++) {
      const sequence = n % 2 === 0;
      const guidance = rand() < 0.5;
      const t1 = 20 + rand() * (parting - 25);
      const c = cutAt(f, t1, { sequence, guidance });
      if (!c) continue;
      // (the sequencer lit a stage after the cut: the path "if cut now" lights none, and says nothing of that flight)
      const relit = c.end.stages.findIndex((x) => Number.isFinite(x.from) && x.from > c.cut.t + 1e-9);
      if (relit >= 0) {
        console.log(
          `# ${f.id} cut at T+${c.cut.t.toFixed(2)}: the sequencer lit stage ${relit} at T+${c.end.stages[relit].from.toFixed(2)}, passed over`,
        );
        continue;
      }
      const p = pathOf(f, c, sequence);
      const parted = p.events.find((e) => e.kind === 'separation');
      const label = `${f.id} cut at T+${c.cut.t.toFixed(2)}, sequencer ${sequence ? 'on' : 'off'}, guidance ${guidance ? 'on' : 'off'}`;
      if (c.end.parted) {
        // the parting: when, where and how fast, against the live vehicle's (a rigid body that keeps its attitude, against a
        // point mass on the drag of the shape it has)
        assert.ok(parted, `${label}: the live vehicle parts at T+${c.end.parted.t.toFixed(2)}, the path has no separation`);
        // (the state the parting is made from, before its push: the push is the one function of the same two masses,
        // stagedlive.ts `separationSpeed`, which tests/stagedlive.test.mjs holds to the prediction's)
        const dt = parted.t - c.end.parted.t;
        const dr = length(sub(parted.r, c.end.r));
        const dv = length(sub(parted.v, c.end.v));
        console.log(
          `# ${label}: parts at T+${parted.t.toFixed(2)} (live ${c.end.parted.t.toFixed(2)}), ${dr.toFixed(1)} m and ${dv.toFixed(3)} m/s apart`,
        );
        assert.ok(
          Math.abs(dt) < 0.011,
          `${label}: the path parts at T+${parted.t.toFixed(2)}, the live vehicle at T+${c.end.parted.t.toFixed(2)}`,
        );
        const fell = c.end.parted.t - c.cut.t;
        // (the live vehicle parts on its tick, the path at the instant: at most a hundredth of a second's flight apart)
        assert.ok(
          dr < 50 + length(c.end.v) * Math.abs(dt) + 0.002 * fell * fell,
          `${label}: ${dr.toFixed(0)} m from the live vehicle at the parting`,
        );
        assert.ok(dv < 0.5 + 0.004 * fell, `${label}: ${dv.toFixed(2)} m/s from the live vehicle at the parting`);
      } else if (c.end.landed) {
        assert.equal(parted, undefined, `${label}: the live stack comes down whole, the path parts it at T+${parted?.t.toFixed(2)}`);
        assert.equal(p.outcome, 'impact', `${label}: the live stack comes down at T+${c.end.landed.t.toFixed(0)}, the path ${p.outcome}`);
        const miss = length(sub(p.impact.r, c.end.r));
        const way = length(sub(c.cut.r, c.end.r));
        console.log(
          `# ${label}: comes down at T+${p.impact.t.toFixed(0)} (live ${c.end.landed.t.toFixed(0)}), ${(miss / 1000).toFixed(2)} km apart over ${(way / 1000).toFixed(0)} km`,
        );
        assert.ok(miss < 2000 + 0.02 * way, `${label}: ${(miss / 1000).toFixed(1)} km from where the live stack comes down`);
      } else if (!c.end.broke) {
        assert.equal(parted, undefined, `${label}: the live stack stays whole and up, the path parts it`);
        console.log(`# ${label}: stays up whole, the path ${p.outcome}`);
      }
    }
  });
}

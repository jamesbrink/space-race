// src/viewer/fires.ts and Ascent.fireLevels: which of a flight's fires burn when, how hard, and from which nozzles. Every
// stage that gives thrust at an instant must have its fires burning then, on the record's run and on one flown by hand;
// none may burn while its stage gives none; and Freedom 7's one fire is what it always was.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight as freedom7 } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { flight as vostok1 } from '../missions/ussr/vostok/flights/vostok-1/flight.ts';
import { steer } from '../src/sim/staged.ts';
import { stagedPilot, stagedVehicle } from '../src/sim/stagedlive.ts';
import { Ascent, firesOf, orbitalFlown } from '../src/viewer/ascent.ts';
import { clusterOf, exitsOf, fireLevel, mergeOf } from '../src/viewer/fires.ts';
import { jetEdge, plumeShape } from '../src/viewer/plume.ts';
import { siteFrame } from '../src/world/frames.ts';
import { julianDate } from '../src/world/time.ts';

/** A bell lathed as the engine scripts lathe one (vostok_8k72k/engines.py): rings of `segs` points from its lip up, open below. */
function bell(points, cx, cz, exitR, y0, height, segs) {
  for (let k = 0; k <= 12; k++) {
    const y = y0 + (height * k) / 12;
    const r = exitR * (1 - 0.6 * Math.sin((Math.PI * k) / 24)); // (narrowing to a throat)
    for (let i = 0; i < segs; i++) {
      const a = (2 * Math.PI * i) / segs;
      points.push(cx + r * Math.cos(a), y, cz + r * Math.sin(a));
    }
  }
  // the fuel's manifold round the lip: a little proud of it
  for (let i = 0; i < segs; i++) {
    const a = (2 * Math.PI * i) / segs;
    points.push(cx + (exitR + 0.034) * Math.cos(a), y0 + 0.078, cz + (exitR + 0.034) * Math.sin(a));
  }
}

/** An RD-107 as the model has it (common.py, booster.py): four main chambers on the diagonals, two steering chambers 1.5 m out either side of the rudder. */
function rd107(cx = 0, cz = 0) {
  const points = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bell(points, cx + sx * 0.4455, cz + sz * 0.4455, 0.36, 0, 2.09, 40);
  for (const s of [-1, 1]) {
    const a = (s * 24 * Math.PI) / 180;
    bell(points, cx + 1.5 * Math.cos(a), cz + 1.5 * Math.sin(a), 0.125, 0.06, 0.7, 20);
  }
  return points;
}

test("an engine's chambers are found in its geometry: each bell apart from the others seen from below, its exit its lowest ring", () => {
  const exits = exitsOf(rd107(2.81, 0));
  assert.equal(exits.length, 6, 'four main chambers and two steering chambers');
  for (const e of exits.slice(0, 4))
    assert.ok(Math.abs(e.radius - 0.36) < 1e-9 && Math.abs(e.y) < 1e-9, 'a main exit, 720 mm across, on the exit plane');
  for (const e of exits.slice(4))
    assert.ok(Math.abs(e.radius - 0.125) < 1e-9 && Math.abs(e.y - 0.06) < 1e-9, 'a steering exit, 60 mm above it');
  const c = clusterOf(exits);
  assert.equal(c.main.length, 4);
  assert.equal(c.steering.length, 2);
  assert.ok(
    Math.abs(c.centre.x - 2.81) < 1e-9 && Math.abs(c.centre.z) < 1e-9,
    "the fire's middle is the main chambers' middle, on the engine's axis",
  );
  assert.ok(Math.abs(c.radius - 0.72) < 1e-9, 'the merged jet is as large as the four exits together: twice one');
  for (const [x, z] of c.main) assert.ok(Math.abs(Math.hypot(x, z) - 0.63) < 1e-3, 'each main chamber 630 mm from the axis');
  assert.ok(
    Math.abs(c.steeringShare - (2 * 0.125 ** 2) / (4 * 0.36 ** 2 + 2 * 0.125 ** 2)) < 1e-12,
    'the steering chambers give their exits’ share',
  );
  // one round exit is one chamber, and no exit at all is no fire
  const one = [];
  bell(one, 0, 0, 0.366, 0, 1.5, 48);
  assert.equal(exitsOf(one).length, 1);
  assert.equal(clusterOf(exitsOf([])), null);
});

test("a cluster's chambers merge where their jets have widened to touch: low down in air, at once where there is none", () => {
  const gap = 0.891 / 0.36;
  const sea = mergeOf((x) => jetEdge(plumeShape(0), x), gap);
  const thin = mergeOf((x) => jetEdge(plumeShape(0.6), x), gap);
  assert.ok(sea.start > 1 && sea.start < 4, `at sea level they touch about a metre down (${(sea.start * 0.36).toFixed(2)} m)`);
  assert.ok(thin.start < 0.5 * sea.start && thin.end > thin.start, 'and sooner as the air thins and each swells');
});

test('a fire comes up and dies over half a second, burns at its stage’s throttle, and a stage throttled to its steering chambers runs on them alone', () => {
  assert.deepEqual(fireLevel(-1, 0, 100), { main: 0, steering: 0 });
  assert.equal(fireLevel(0.25, 0, 100).main, 0.5);
  assert.equal(fireLevel(50, 0, 100).main, 1);
  assert.equal(fireLevel(100.6, 0, 100).main, 0);
  assert.deepEqual(fireLevel(50, 0, 100, 0.6, 0.06), { main: 0.6, steering: 0.6 }, 'an intermediate stage throttles every chamber');
  assert.deepEqual(
    fireLevel(50, 0, 100, 0.104, 0.1076),
    { main: 0, steering: 0.104 / 0.1076 },
    'the final stage: the steering chambers alone',
  );
  assert.deepEqual(fireLevel(50, 0, 100, 1), { main: 1, steering: 0 }, 'one round exit has no steering chambers');
});

// The steering chambers' shares the model's exits give (vostok_8k72k/common.py: main exits 360 mm, steering 125 mm in radius): two on an
// RD-107, four on the RD-108. The browser check (tools/fires-test.mjs) finds the same in the GLB.
const SHARE = { booster: (2 * 0.125 ** 2) / (4 * 0.36 ** 2 + 2 * 0.125 ** 2), core: (4 * 0.125 ** 2) / (4 * 0.36 ** 2 + 4 * 0.125 ** 2) };
const shares = vostok1.flies.fires.map((f) => (f.on === 'stage:0' ? SHARE.booster : f.on === 'stage:1' ? SHARE.core : 0));
const stageOf = (f) => (f.on.startsWith('stage:') ? Number(f.on.slice(6)) : -1);

/** Every instant from liftoff to `until`: each stage giving thrust has every one of its fires burning, and a fire burns only within half a second of its stage's burn. */
function everyStageHasItsFire(ascent, burning, until, label) {
  let checked = 0;
  for (let t = 0.6; t < until; t += 0.25) {
    const { levels } = ascent.fireLevels(t, shares);
    vostok1.flies.fires.forEach((f, k) => {
      const i = stageOf(f);
      if (i < 0) return;
      const lit = levels[k].main > 0 || levels[k].steering > 0;
      const now = burning(i, t);
      if (now === null) return; // (within half a second of a change: the fire comes up and dies over that)
      assert.equal(
        lit,
        now,
        `${label}: T+${t.toFixed(2)} ${f.node} is ${lit ? 'lit' : 'out'} while stage ${i} ${now ? 'burns' : 'does not'}`,
      );
      checked++;
    });
  }
  return checked;
}

test("Vostok 1's record: the four strap-ons and the core from the pad, the strap-ons out at their cutoff, the core on its steering chambers at the last, then Block E", () => {
  const ascent = Ascent.of(vostok1);
  const o = vostok1.orbital;
  const whole = orbitalFlown(vostok1);
  const when = firesOf(vostok1, whole);
  const burning = (i, t) => {
    const from = o.stages[i].ignition.value,
      to = whole.ascent.stops[i];
    if (Math.abs(t - from) < 0.5 || Math.abs(t - to) < 0.5) return null;
    return t > from && t < to;
  };
  assert.ok(everyStageHasItsFire(ascent, burning, 700, 'record') > 10_000);
  // five engines at liftoff, each its own fire
  const at = (t) => ascent.fireLevels(t, shares).levels;
  assert.equal(at(2).filter((l) => l.main > 0).length, 5, 'five fires at T+2: the four RD-107s and the RD-108');
  assert.ok(
    at(2).every((l, k) => (k < 5 ? l.steering > 0 : l.main === 0)),
    'and every steering chamber with them; nothing of Block E or the braking engine',
  );
  // the strap-ons' intermediate stage before they part, and nothing of them after
  assert.ok(
    Math.abs(at(116)[0].main - 0.6) < 1e-9 && at(116)[4].main === 1,
    'T+116: the strap-ons at their intermediate stage, the core rated',
  );
  assert.ok(
    at(125)
      .slice(0, 4)
      .every((l) => l.main === 0 && l.steering === 0),
    'T+125: the strap-ons are out',
  );
  // the core's final stage, and the third stage
  assert.ok(at(295)[4].main === 0 && at(295)[4].steering > 0.9, 'T+295: the RD-108 on its four steering chambers alone');
  assert.equal(when[5].from, o.stages[2].ignition.value);
  assert.ok(
    at(400)[5].main === 1 &&
      at(400)
        .slice(0, 5)
        .every((l) => l.main === 0 && l.steering === 0),
    'T+400: Block E alone',
  );
  const v = ascent.fireLevels(400, shares).vacuum;
  assert.ok(v > 0.99, `in near vacuum (${v})`);
});

test('Vostok 1 flown by hand: its fires burn when its own stages do, not when the record has them', () => {
  const o = vostok1.orbital;
  const site = siteFrame(vostok1.site);
  const jd = julianDate(vostok1.launch);
  const sea = vostok1.site.seaLevel.value;
  const x = steer(o, site, jd, sea);
  const v = stagedVehicle(o, site, jd, sea, x);
  // no guidance: the pilot's sequence, but the attitude held as it was, so the path and each stage's stop are its own
  const pilot = stagedPilot(v, x, site, jd, sea, { guidance: false, sequence: true });
  const centre = (vostok1.flies.datum ?? 0) + (o.ascent.centre?.value ?? 0);
  let s = v.start();
  s = v.tick(s, {
    pitch: 0,
    yaw: 0,
    roll: 0,
    steps: [
      { kind: 'ignite', stage: 0 },
      { kind: 'ignite', stage: 1 },
    ],
  });
  const samples = [v.sample(s, centre)];
  const states = [s];
  while (!s.parted && !s.landed && s.t < 600) {
    const was = s;
    s = v.tick(s, pilot);
    if (s.ticks === was.ticks) break;
    samples.push(v.sample(s, centre));
    states.push(s);
  }
  const fires = vostok1.flies.fires.map((f) => {
    const i = stageOf(f);
    const st = s.stages[i];
    if (i < 0 || !st || !Number.isFinite(st.from)) return { from: Infinity, to: Infinity };
    return { from: st.from, to: Math.min(st.to, v.dry(i, st.from), st.gone) };
  });
  const ascent = Ascent.of(vostok1);
  ascent.use({
    samples,
    duration: Infinity,
    cutoff: fires[4].to,
    dropped: vostok1.flies.drops.map(() => Infinity),
    live: true,
    out: { drogue: Infinity, main: Infinity },
    fires,
  });
  // the truth: the live vehicle's own stages, sample by sample
  const burning = (i, t) => {
    if (fires.some((f, k) => stageOf(vostok1.flies.fires[k]) === i && (Math.abs(t - f.from) < 0.5 || Math.abs(t - f.to) < 0.5)))
      return null;
    let lo = 0;
    while (lo < states.length - 1 && states[lo + 1].t <= t) lo++;
    return v.burning(states[lo], i);
  };
  const end = samples.at(-1).t;
  assert.ok(everyStageHasItsFire(ascent, burning, end, 'flown') > 5_000, `flown to T+${end.toFixed(0)}`);
  ascent.use(null);
});

test("Freedom 7's one fire is what it always was: the Redstone's, from liftoff to the cutoff", () => {
  const ascent = Ascent.of(freedom7);
  assert.equal(freedom7.flies.fires, undefined);
  for (let t = -1; t < 200; t += 0.05) {
    const { vacuum, levels } = ascent.fireLevels(t);
    const burn = ascent.burn(t);
    assert.equal(levels.length, 1);
    assert.equal(levels[0].main, burn.on, `T+${t.toFixed(2)}`);
    assert.equal(levels[0].steering, 0);
    if (burn.on > 0) assert.equal(vacuum, burn.vacuum);
  }
});

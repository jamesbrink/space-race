// src/viewer/fires.ts and Ascent.fireLevels: which of a flight's fires burn when, how hard, and from which nozzles. Every
// stage that gives thrust at an instant must have its fires burning then, on the record's run and on one flown by hand;
// none may burn while its stage gives none; and Freedom 7's one fire is what it always was.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { flight as freedom7 } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { flight as vostok1 } from '../missions/ussr/vostok/flights/vostok-1/flight.ts';
import { sequenceOf, steer } from '../src/sim/staged.ts';
import { stagedPilot, stagedVehicle } from '../src/sim/stagedlive.ts';
import { Ascent, firesOf, orbitalFlown } from '../src/viewer/ascent.ts';
import { clusterOf, exitsOf, fireLevel, jetEdge, mergeOf } from '../src/viewer/fires.ts';
import { A7_NOZZLE } from '../missions/usa/mercury/vehicles/mercury-redstone.ts';
import { plumeShape } from '../src/viewer/plume.ts';
import { P0 } from '../src/world/bodies.ts';

const A7 = A7_NOZZLE.exit.value / P0;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
import { siteFrame } from '../src/world/frames.ts';
import { frameOf } from '../src/world/earthframe.ts';

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
  const sea = mergeOf((x) => jetEdge(plumeShape(0, A7), x), gap);
  const thin = mergeOf((x) => jetEdge(plumeShape(0.6, A7), x), gap);
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
  const lit = sequenceOf(vostok1.plan).stages.map((k) => k.from);
  const whole = orbitalFlown(vostok1);
  const when = firesOf(vostok1, whole);
  const burning = (i, t) => {
    const from = lit[i],
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
  assert.equal(when[5].from, lit[2]);
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
  const site = siteFrame(vostok1.site);
  const dated = frameOf(vostok1);
  const sea = vostok1.site.seaLevel.value;
  const x = steer(vostok1.plan, site, dated, sea);
  const v = stagedVehicle(vostok1.plan, site, dated, sea, x);
  // no guidance: the pilot's sequence, but the attitude held as it was, so the path and each stage's stop are its own
  const pilot = stagedPilot(v, x, site, dated, sea, { guidance: false, sequence: true });
  const centre = (vostok1.flies.datum ?? 0) + (vostok1.plan.record.centre?.value ?? 0);
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

test('a fire looks as what it burns: the Redstone’s alcohol flame as it always was, the R-7’s kerosene brighter and thicker, Titan’s hydrazine fainter', async () => {
  const { FLAMES, KINDS, kindOf } = await import('../src/viewer/flames.ts');
  // the alcohol flame is the unit, and its colours are those the fire was first drawn with (exhaust.ts before flames.ts)
  const a = FLAMES['alcohol-lox'];
  assert.deepEqual([a.luminous, a.opacity, a.body], [1, 1, 1]);
  assert.deepEqual(
    [a.cool, a.warm, a.hot, a.core, a.vacuum],
    [
      [1, 0.3, 0.05],
      [1, 0.56, 0.15],
      [1, 0.9, 0.62],
      [1, 0.93, 0.78],
      [0.7, 0.8, 1],
    ],
  );
  assert.equal(kindOf(undefined), 0, 'with nothing said, the alcohol flame');
  assert.equal(KINDS[kindOf('kerosene-lox')], 'kerosene-lox');
  const k = FLAMES['kerosene-lox'];
  const h = FLAMES['hydrazine-n2o4'];
  assert.ok(k.luminous > 2 && k.opacity > 2, 'soot: far brighter, and opaque near the nozzles');
  assert.ok(h.luminous < 1 && h.opacity < 1, 'no soot: fainter and seen through');
  for (const id of KINDS) {
    const f = FLAMES[id];
    assert.ok(
      f.temperature.source.length > 20 && ['documented', 'assumed', 'derived', 'estimated'].includes(f.temperature.confidence),
      `${id}: its temperature cited`,
    );
    assert.ok(f.look.length > 20, `${id}: what its look was judged on`);
  }
  // the flights say what each engine burned: Freedom 7's Redstone alcohol, Vostok 1's stages kerosene and its braking engine nitric acid
  assert.equal(freedom7.flies.burns, 'alcohol-lox');
  const fires = vostok1.flies.fires;
  assert.ok(fires.filter((f) => f.on.startsWith('stage:')).every((f) => f.burns === 'kerosene-lox'));
  assert.equal(fires.find((f) => vostok1.plan.craft[0].engines.find((e) => e.id === f.on)?.flown).burns, 'amine-nitric');
});

test('at Site 1 the exhaust goes down into the flame pit and its cloud rises out of the pit’s open side, away from the rocket', async () => {
  const { blast } = await import('../src/viewer/trail.ts');
  const { SITE1 } = await import('../missions/ussr/places/tyuratam/site-1.ts');
  const way = SITE1.exhaust;
  assert.equal(way.way, 'pit');
  const pit = { toward: [1, 0], depth: way.depth.value, out: way.out.value, width: way.width.value };
  const deck = blast(3);
  assert.deepEqual([deck.mouth, deck.fan, deck.deep], [[0, 0], -2, 0], 'over a deck: all round, on the concrete (LC-5’s cloud unchanged)');
  const early = blast(0.5, [0, 0], pit);
  const later = blast(4, [0, 0], pit);
  assert.ok(early.lift < -20, 'at first its head is deep in the pit');
  assert.ok(later.lift >= 0, 'by T+4 it has risen out of it');
  assert.ok(later.mouth[0] > way.out.value && later.mouth[1] === 0, 'it comes out east of the slot’s end, along the pit');
  assert.ok(later.fan > -1 && later.fan < 1, 'on the side away from the stand only');
  assert.ok(early.puff <= 0.21 * blast(0.5).puff, 'little on the deck');
  assert.ok(later.ringRadius > blast(4).ringRadius, 'a greater cloud than LC-5’s');
  assert.equal(blast(90, [0, 0], pit).amount, 0, 'gone in a minute and a half');
});

test('a jet that blows while its engine runs goes as the engine works, on all its chambers or its steering chambers alone', async () => {
  const { engineWork } = await import('../src/viewer/fires.ts');
  const share = 0.1;
  assert.equal(engineWork({ main: 0, steering: 0 }, share), 0, 'out');
  assert.ok(Math.abs(engineWork(fireLevel(10, 0, 100, 0.8, share), share) - 0.8) < 1e-12, 'throttled with every chamber: as throttled');
  assert.ok(
    Math.abs(engineWork(fireLevel(10, 0, 100, 0.05, share), share) - 0.05) < 1e-12,
    'on its steering chambers alone: their share of what is asked',
  );
  assert.equal(engineWork(fireLevel(10, 0, 100, 1, share), share), 1, 'rated');
});

test('a shed body’s vent blows from the instant it left, as long as the simulator flies its motor, and dies away', async () => {
  const { shedLevel } = await import('../src/viewer/fires.ts');
  assert.equal(shedLevel(119, 119.5, 6), 0, 'not before it has left');
  assert.ok(shedLevel(119.55, 119.5, 6) > 0 && shedLevel(119.55, 119.5, 6) < 1, 'coming up');
  assert.equal(shedLevel(122, 119.5, 6), 1, 'steady for its burn');
  assert.ok(shedLevel(125.75, 119.5, 6) > 0 && shedLevel(125.75, 119.5, 6) < 1, 'dying over half a second');
  assert.equal(shedLevel(126.1, 119.5, 6), 0, 'out');
  assert.ok(Math.abs(shedLevel(126.5, 119.5, 6, 2) - 0.5) < 1e-12, 'with a tail, falling evenly over it, as sim/shed.ts has the thrust');
});

test('a gas jet opens as a fire does: a column in the air at the sea from a mouth at its pressure, a fan into none', async () => {
  const { gasEdge, gasLength } = await import('../src/viewer/fires.ts');
  assert.equal(gasEdge(0, 40, 0), 1, 'as wide as its mouth at the mouth');
  const sea = plumeShape(0, 1);
  assert.equal(sea.width, 1, 'a pipe at the sea’s pressure does not swell');
  assert.ok(gasEdge(40, sea.width, sea.air) < 1 + 0.16 * 40 + 1e-9, 'it spreads only as it mixes');
  const thin = plumeShape(0.99, 2.4);
  assert.ok(thin.width > 20, 'a vent at 2.4 atmospheres into the thin air of separation swells to a fan');
  assert.ok(gasEdge(200, thin.width, thin.air) > thin.width, 'as wide as it swells, and spreading');
  for (let x = 1; x < 300; x += 7) assert.ok(gasEdge(x, thin.width, thin.air) > gasEdge(x - 1, thin.width, thin.air), 'never narrowing');
  assert.ok(Math.abs(gasLength(3000, 0.04, 0.12) - (0.12 * Math.sqrt(3000)) / 0.04) < 1e-9, 'its length goes as the root of its thrust');
  assert.equal(gasLength(0, 0.04, 0.12), 12, 'and is never nothing');
});

/** The nodes of a GLB by name, with each one's place and its -Y (the way a nozzle's gas leaves) in the model's frame. */
function nodesOf(file) {
  const glb = readFileSync(file);
  const g = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8'));
  const parent = new Map();
  g.nodes.forEach((n, i) => {
    for (const c of n.children ?? []) parent.set(c, i);
  });
  const local = (n) => {
    const [x, y, z, w] = n.rotation ?? [0, 0, 0, 1];
    const [tx, ty, tz] = n.translation ?? [0, 0, 0];
    return { q: [x, y, z, w], t: [tx, ty, tz] };
  };
  const turn = ([x, y, z, w], v) => {
    const u = [y * v[2] - z * v[1], z * v[0] - x * v[2], x * v[1] - y * v[0]];
    const uu = [y * u[2] - z * u[1], z * u[0] - x * u[2], x * u[1] - y * u[0]];
    return v.map((c, i) => c + 2 * (w * u[i] + uu[i]));
  };
  const out = new Map();
  g.nodes.forEach((n, i) => {
    let at = [0, 0, 0];
    let down = [0, -1, 0];
    for (let k = i; k !== undefined; k = parent.get(k)) {
      const { q, t } = local(g.nodes[k]);
      at = turn(q, at).map((c, j) => c + t[j]);
      down = turn(q, down);
    }
    out.set(n.name, { at, down });
  });
  return out;
}

test('each flight’s jets hang on nodes its model has, and blow by what its plan has, where it has one: an engine it has, a shed body’s motor it flies', async () => {
  const { flights } = await import('../missions/index.ts');
  let jets = 0;
  for (const f of flights)
    for (const m of f.models) {
      if (!m.jets?.length) continue;
      const nodes = nodesOf(join(root, 'public', m.url));
      for (const j of m.jets) {
        jets++;
        assert.ok(nodes.has(j.node), `${f.id}: no node ${j.node} in ${m.url}`);
        for (const x of [j.radius, j.thrust, j.flow, j.speed, j.exit].filter(Boolean))
          assert.ok(x.confidence && x.source, `${f.id} ${j.node}: every figure has its confidence and source`);
        // (a flight that has no plan yet flies nothing: its jets are hung and never blow)
        const c = f.plan?.craft[0];
        if (!c) continue;
        if ('with' in j.when)
          assert.ok(
            c?.engines.some((e) => e.id === j.when.with),
            `${f.id} ${j.node}: no engine ${j.when.with} in the plan`,
          );
        if ('shed' in j.when) {
          const body = c?.sheds?.find((b) => b.on === j.when.shed);
          assert.ok(
            body?.motors?.some((x) => x.name === j.when.motor),
            `${f.id} ${j.node}: the plan flies no ${j.when.motor} on ${j.when.shed}`,
          );
          assert.ok(
            f.flies?.drops.some((d) => d.on === j.when.shed),
            `${f.id} ${j.node}: nothing drops as ${j.when.shed}`,
          );
        }
      }
    }
  assert.ok(jets >= 2 * 10 + 2, 'at the least Vostok 1’s and 2’s turbine exhausts and vents, and the Voskhods’ reserve engines');
});

test('the vents blow forward and in toward the core, the turbines’ exhausts down, the Voskhod’s reserve engine forward off its nose', () => {
  const vostok = nodesOf(join(root, 'public/models/ussr/vostok/vostok-1/vehicle.glb'));
  const deg = (a, b) => (Math.acos(Math.min(1, Math.abs(a.reduce((s, x, i) => s + x * b[i], 0)))) * 180) / Math.PI;
  for (const letter of ['B', 'V', 'G', 'D']) {
    const { at, down } = vostok.get(`Booster_${letter}_Vent`);
    assert.ok(down[1] > 0.6, `${letter}'s vent's gas goes forward`);
    assert.ok(down[0] * at[0] + down[2] * at[2] < 0, `${letter}'s vent's gas goes in toward the core`);
    assert.ok(Math.abs(deg(down, [0, 1, 0]) - 45) < 5, `${letter}'s vent at about 45° to the axis (the booster leaning in a little)`);
    assert.ok(vostok.get(`RD107_${letter}_TurbineExhaust`).down[1] < -0.99, `${letter}'s turbine exhaust goes down`);
  }
  assert.ok(vostok.get('RD108_TurbineExhaust').down[1] < -0.999, 'the core’s turbine exhaust goes down');
  for (const id of ['voskhod-1', 'voskhod-2']) {
    const reserve = nodesOf(join(root, `public/models/ussr/voskhod/${id}/vehicle.glb`)).get('ReserveEngine_Nozzle');
    assert.ok(
      deg(reserve.down, [0, 1, 0]) < 1 && reserve.down[1] > 0,
      `${id}'s reserve engine's gas goes forward along the axis, within a degree`,
    );
  }
});

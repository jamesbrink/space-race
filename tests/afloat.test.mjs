// A body afloat (src/sim/afloat.ts), the sea it floats on (src/sim/sea.ts) and a part thrown off it (src/sim/loose.ts):
// each piece of the physics against its own arithmetic, then Liberty Bell 7 after it came down against the record.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight as lb7 } from '../missions/usa/mercury/flights/mr-4-liberty-bell-7/flight.ts';
import { estimated } from '../src/measure.ts';
import { floatOn, SEA_WATER, Solid } from '../src/sim/afloat.ts';
import { flyLoose } from '../src/sim/loose.ts';
import { afterwards, recordOf } from '../src/sim/run.ts';
import { surfaceAt, wavesOf } from '../src/sim/sea.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { geodeticToEcef, length, sub } from '../src/world/frames.ts';
import { holdChecks, missesOf } from './misses.mjs';

const ID = 'usa/mercury/mr-4-liberty-bell-7';
const m = (v) => estimated(v, 'a test');

test('a solid of revolution: a cylinder’s and a cone’s volumes, and the height a volume fills them to', () => {
  const cylinder = new Solid([
    [0, 1],
    [2, 1],
  ]);
  assert.ok(Math.abs(cylinder.volume(1) - Math.PI) < 1e-12);
  assert.ok(Math.abs(cylinder.whole - 2 * Math.PI) < 1e-12);
  assert.ok(Math.abs(cylinder.height(Math.PI / 2) - 0.5) < 1e-9);
  const cone = new Solid([
    [0, 0],
    [3, 1],
  ]);
  // (a cone up to h holds pi r(h)^2 h / 3, r(h) = h / 3)
  for (const h of [0.5, 1.7, 3]) assert.ok(Math.abs(cone.volume(h) - (Math.PI * (h / 3) ** 2 * h) / 3) < 1e-12);
  for (const h of [0.3, 1.1, 2.9]) assert.ok(Math.abs(cone.height(cone.volume(h)) - h) < 1e-9, `the cone filled to ${h} m`);
  const half = new Solid(cylinder.profile, 0.5);
  assert.ok(Math.abs(half.whole - Math.PI) < 1e-12, 'what water can take of it is its share');
});

/** A plain body: a sealed drum of 1 m radius and 3 m tall, its spaces given. */
const drum = (mass, spaces = []) => ({
  hull: {
    profile: [
      [0, 1],
      [3, 1],
    ],
    confidence: 'estimated',
    source: 'a test',
  },
  datum: m(0),
  mass: m(mass),
  leaves: [],
  spaces,
  heave: m(0.2),
  drag: m(2),
  rights: m(1),
});

test('in a calm sea a body floats where it puts aside its own weight of water (Archimedes), and stays there', () => {
  const mass = 2000;
  const run = floatOn(drum(mass), [], 0, 60);
  const draft = mass / (SEA_WATER * Math.PI);
  for (const s of run.samples) assert.ok(Math.abs(-s.z - draft) < 1e-9, `at ${s.t} s it floats ${-s.z} m deep, not ${draft}`);
  assert.equal(run.under, Number.POSITIVE_INFINITY);
});

test('heavier than the sea it can put aside, it goes down, and its drag holds it to the speed its weight is worth', () => {
  const mass = 1.2 * SEA_WATER * 3 * Math.PI;
  const run = floatOn(drum(mass), [], 0, 600, {}, 200);
  assert.ok(Number.isFinite(run.under), 'it went under');
  const last = run.samples[run.samples.length - 1];
  // (terminal: the weight less the sea put aside, against half rho v^2 CdA)
  const terminal = Math.sqrt((2 * (mass - SEA_WATER * 3 * Math.PI) * 9.80665) / (SEA_WATER * 2));
  assert.ok(Math.abs(-last.w - terminal) / terminal < 0.01, `it goes down at ${-last.w} m/s, not ${terminal}`);
});

test('an opening lets the sea in until the water inside stands as high as the sea outside, and a hatch shut until it is blown lets nothing in', () => {
  const space = {
    id: 'inside',
    label: 'inside',
    shape: [
      [0.1, 0.9],
      [2.9, 0.9],
    ],
    free: m(1),
    openings: [{ id: 'door', label: 'a door', from: 0.2, to: 2.8, width: [0.2, 0.2], cd: m(0.6), shut: true }],
  };
  // heavy enough to float with the door's foot in the sea, light enough to float with the space full
  const body = drum(1000, [space]);
  const shut = floatOn(body, [], 0, 120, {});
  assert.ok(
    shut.samples.every((s) => s.water[0] === 0),
    'shut, nothing comes in',
  );
  const open = floatOn(body, [], 0, 400, { opened: { door: 10 } });
  const last = open.samples[open.samples.length - 1];
  const inside = new Solid(space.shape).height(last.water[0]);
  assert.ok(Math.abs(inside - (last.surface - last.z)) < 0.01, `inside ${inside}, the sea outside ${last.surface - last.z}`);
  assert.ok(open.samples.find((s) => s.t > 10.05)?.water[0] > 0, 'open, it comes in');
});

test('the sea: each train a sine whose crest-to-trough height is four standard deviations, travelling the way it goes', () => {
  const trains = [{ label: 'a swell', height: m(0.8), period: m(6.4), from: m(90) }];
  const waves = wavesOf(trains);
  let sum = 0;
  const n = 64_000;
  for (let k = 0; k < n; k++) sum += surfaceAt(waves, (k * 6.4) / 1000).height ** 2;
  assert.ok(Math.abs(4 * Math.sqrt(sum / n) - 0.8) < 1e-6, 'four sigma is the significant height');
  // from the east it goes west: a crest at the place moves to the west of it
  const k = waves[0].k;
  assert.ok(k[0] < 0 && Math.abs(k[1]) < 1e-12);
});

test('a part thrown off from a metre and a half over the sea at 3 m/s comes down where its throw and gravity put it', () => {
  const frame = frameOf(lb7);
  const sea = lb7.site.seaLevel.value;
  const p = geodeticToEcef({ latitude: 27.5, longitude: -75.7, height: sea + 1.5 });
  const t = 1000;
  const r = frame.toInertial(p, t);
  const v = frame.velocityToInertial(p, [0, 0, 0], t);
  const east = [Math.sin((75.7 * Math.PI) / 180), Math.cos((75.7 * Math.PI) / 180), 0];
  const flown = flyLoose({ mass: m(10), impulse: m(30), drag: m(0) }, frame, undefined, sea, t, r, v, frame.toInertial(east, t));
  const fall = Math.sqrt((2 * 1.5) / 9.79);
  const range = length(sub(flown.down.fixed, p));
  assert.ok(Math.abs(flown.down.t - t - fall) < 0.01, `down in ${flown.down.t - t} s, not ${fall}`);
  assert.ok(Math.abs(range - Math.hypot(3 * fall, 1.5)) < 0.05, `${range} m from where it left`);
});

test('Liberty Bell 7 after it came down: the record’s figures, the helicopter that could not lift it, and its going down', () => {
  const run = recordOf(lb7);
  const a = run.afloat;
  assert.ok(a, 'the record’s run goes on into the sea');
  const record = lb7.flies.afloat.record;
  const lb = 0.45359237;
  const figures = { flooded: a.flooded / lb, under: a.under - record.hatch.value };
  holdChecks(lb7.flies.afloat.checks, (id) => figures[id], missesOf(ID, 'afloat'), { name: 'afloat' });
  // the helicopter pulled with all it had and never had it out of the sea
  assert.ok(Math.abs(a.held - lb7.flies.afloat.hoist.capacity.value) < 1, `the line held ${a.held} N`);
  assert.ok(a.rose < 0, `its lowest point came ${a.rose} m over the sea`);
  // let go, it goes out of sight within a minute and a half ("allowing the spacecraft to sink swiftly": This New Ocean, p. 375)
  assert.ok(a.end > record.cast.value && a.end - record.cast.value < 90, `out of sight ${a.end - record.cast.value} s after it was let go`);
  // before the hatch it floated with its sill clear of the still sea, as every capsule did
  const before = a.samples.filter((s) => s.t < record.hatch.value);
  const sill = lb7.flies.afloat.body.spaces.find((s) => s.openings.some((o) => o.id === lb7.flies.hatch.opens)).openings[0].from;
  const mean = before.reduce((sum, s) => sum + s.surface - s.z, 0) / before.length;
  assert.ok(mean < sill, `on the average the sea stood ${mean} m up the hull, the sill at ${sill}`);
  // the hatch: thrown off as a body of its own, down on the sea about five feet out (This New Ocean, p. 373)
  const i = lb7.flies.drops.findIndex((d) => d.nodes.includes(lb7.flies.hatch.node));
  const hatch = run.loose?.[i];
  assert.ok(hatch, 'the hatch flies');
  assert.equal(run.dropped[i], record.hatch.value);
  const out = length(sub(hatch.down.fixed, run.frame.toFixed(hatch.samples[0].r, hatch.from)));
  assert.ok(out > 1.2 && out < 1.9, `the hatch struck the water ${out} m from where it left`);
  console.log(
    `  #   afloat: under ${(a.under - record.hatch.value).toFixed(1)} s after the hatch, flooded ${(a.flooded / lb).toFixed(0)} lb, held ${(a.held / 4.4482216).toFixed(0)} lbf, ` +
      `its foot ${(-a.rose).toFixed(2)} m under at best, out of sight ${(a.end - record.cast.value).toFixed(0)} s after it was let go; the hatch down ${out.toFixed(2)} m out`,
  );
});

test('flown by hand: blown in flight it lands open and goes down; never blown it floats', () => {
  // (sim/run.ts afterwards with a hand's hatch, from the record's landing; a copy of the record's run, its drops its own)
  const copy = () => {
    const record = recordOf(lb7);
    return { ...record, dropped: [...record.dropped], loose: undefined };
  };
  const run = copy();
  afterwards(lb7, run, { hatch: 200 });
  assert.ok(Number.isFinite(run.afloat.under), 'open from the landing it goes under');
  assert.ok(run.afloat.under - run.duration < 120, `under ${run.afloat.under - run.duration} s after the landing`);
  const kept = copy();
  afterwards(lb7, kept, { hatch: Number.POSITIVE_INFINITY });
  assert.equal(kept.afloat.under, Number.POSITIVE_INFINITY, 'the hatch kept on, it floats');
});

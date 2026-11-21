import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flights } from '../missions/index.ts';
import { A7_NOZZLE } from '../missions/usa/mercury/vehicles/mercury-redstone.ts';
import { STRAP_ONS } from '../missions/ussr/vostok/vehicles/vostok-8k72k.ts';
import { coreLength, JUDGED_AT, Plume, plumeExit, plumeLength, plumeShape } from '../src/viewer/plume.ts';
import { P0 } from '../src/world/bodies.ts';

/** The A-7's exit pressure and an RD-107's, atmospheres: each engine's own (sim/plan.ts `Nozzle`). */
const A7 = A7_NOZZLE.exit.value / P0;
const RD107 = STRAP_ONS.nozzle.exit.value / P0;

// The engine's fire as data: what the air lets it be, and what it is told (the drawing is exhaust.ts's, on the GPU).

test('a fire without a nozzle record uses the neutral display fallback', () => {
  const engine = {};
  assert.equal(plumeExit(engine), 1);
  assert.equal(plumeExit(undefined), 1);
  assert.deepEqual(engine, {});
  assert.equal(plumeExit({ nozzle: { exit: { value: 0.5 * P0 } } }), 0.5);
});

/**
 * The liquid engines' fires still drawn without a nozzle record (plume.ts `plumeExit` and `plumeLength`: the neutral
 * fallback), by flight. Solid motors' nozzles are recorded on no flight, and the Gemini's thrusters' not either.
 * SP-8120's Table I has the H-1's, the J-2's and the service module's AJ10-137's, not yet put in Apollo 7's record.
 */
const FALLBACK = {
  'usa/apollo/apollo-7': ['h1-inboard', 'h1-outboard', 'sivb-j2', 'sps'],
  'usa/skylab/skylab-2': ['h1-inboard', 'h1-outboard', 'sivb-j2', 'sps'],
  // (the F-1's and the J-2's chamber pressures and expansions are not yet in a Saturn V record)
  'usa/apollo/apollo-8': ['f1-centre', 'f1-outboard', 'j2-centre', 'j2-outboard', 'sivb-j2', 'sivb-tli', 'sps'],
  'usa/apollo/apollo-10': ['f1-centre', 'f1-outboard', 'j2-centre', 'j2-outboard', 'sivb-j2', 'sivb-tli'],
  'usa/apollo/apollo-11': ['f1-centre', 'f1-outboard', 'j2-centre', 'j2-outboard', 'sivb-j2', 'sivb-tli'],
  'usa/apollo/apollo-13': ['f1-centre', 'f1-outboard', 'j2-centre', 'j2-outboard', 'sivb-j2', 'sivb-tli'],
  'usa/apollo/apollo-14': ['f1-centre', 'f1-outboard', 'j2-centre', 'j2-outboard', 'sivb-j2', 'sivb-tli'],
  'usa/apollo/apollo-12': ['f1-centre', 'f1-outboard', 'j2-centre', 'j2-outboard', 'sivb-j2', 'sivb-tli'],
  'usa/apollo/apollo-15': ['f1-centre', 'f1-outboard', 'j2-centre', 'j2-outboard', 'sivb-j2', 'sivb-tli'],
  'usa/apollo/apollo-16': ['f1-centre', 'f1-outboard', 'j2-centre', 'j2-outboard', 'sivb-j2', 'sivb-tli'],
  'usa/apollo/apollo-17': ['f1-centre', 'f1-outboard', 'j2-centre', 'j2-outboard', 'sivb-j2', 'sivb-tli'],
  'usa/gemini/gt-3': ['forward-thrusters', 'aft-thrusters'],
  'usa/gemini/gt-4': ['forward-thrusters', 'aft-thrusters'],
  'usa/gemini/gt-5': ['aft-thrusters'],
  'usa/gemini/gt-6a': ['forward-thrusters', 'aft-thrusters'],
  'usa/gemini/gt-7': ['forward-thrusters', 'aft-thrusters'],
  'usa/gemini/gt-8': ['forward-thrusters', 'aft-thrusters'],
  'usa/gemini/gt-12': ['forward-thrusters', 'aft-thrusters'],
  // (the Agena's Bell 8247: its 45:1 expansion is documented, LMSC-A604166-2 14.2.1, but no chamber pressure was read)
  ...Object.fromEntries(
    ['gatv-5001', 'gatv-5002', 'gatv-5003', 'gatv-5005', 'gatv-5006'].map((id) => [`usa/gemini/${id}`, ['agena-engine']]),
  ),
};
const SOLIDS = ['retrorockets', 'launch-escape-motor'];

test('every ascent fire of the Mercury-Atlas and Gemini-Titan flights is drawn from its own nozzle record', () => {
  let seen = 0;
  for (const f of flights) {
    const engines = f.plan?.craft[0]?.engines ?? [];
    for (const fire of f.flies?.fires ?? []) {
      const nozzle = fire.nozzle ?? engines.find((e) => e.id === fire.on)?.nozzle;
      const neutral = SOLIDS.includes(fire.on) || (FALLBACK[f.id] ?? []).includes(fire.on);
      if (/\/(ma-|gt-)/.test(f.id) && !neutral) {
        assert.ok(nozzle?.chamber && nozzle.exit, `${f.id} ${fire.node} (${fire.on}) has a nozzle record with its chamber`);
        seen++;
      }
      if (!nozzle) assert.ok(neutral, `${f.id} ${fire.node} (${fire.on}) is drawn neutral: list it in FALLBACK`);
    }
  }
  assert.equal(
    seen,
    4 * 3 + 7 * 3,
    'four Mercury-Atlas flights of three ascent fires, and Gemini-Titans 3, 4, 5, 6A, 7, 8 and 12 of three each',
  );
});

test('the fire is as long as its supersonic core, scaled once to the A-7: Freedom 7 is left as it was', () => {
  assert.equal(JUDGED_AT, A7_NOZZLE.chamber.value, 'judged at the A-7 record’s chamber');
  assert.equal(plumeLength(A7_NOZZLE), 38, 'the A-7’s fire, 38 exit radii, to the bit');
  assert.equal(plumeLength(undefined), 38, 'a fire without a record at the A-7’s');
  assert.equal(plumeLength({}), 38);
  // SP-8072, Figure 11: at a fully expanded Mach 1 the core is 3.45 times 1.38 squared, 6.57 exit diameters
  const sonic = P0 * 1.1 ** 6; // (gamma 1.2: the chamber over the air that expands a jet to Mach 1)
  assert.ok(Math.abs(coreLength(sonic) - 3.45 * 1.38 ** 2) < 1e-9);
  assert.ok(plumeLength(STRAP_ONS.nozzle) > 38, 'a harder chamber blows a longer core');
  let last = 0;
  for (let pc = 1.5e6; pc < 2e7; pc += 1e5) {
    const L = plumeLength({ chamber: { value: pc } });
    assert.ok(L > last, `longer the harder the chamber (${pc} Pa)`);
    last = L;
  }
  const own = new Plume(0.5, 1, null, undefined, 0, 45);
  assert.equal(own.shape().length, 45, 'the fire drawn at its own length at sea level');
});

test('the jet is nearly matched at sea level and opens as the air thins, without a step', () => {
  const sea = plumeShape(0, A7);
  assert.equal(sea.width, 1, 'the exit is at nine tenths of an atmosphere: the jet does not swell');
  assert.equal(sea.air, 1);
  assert.ok(sea.length * 0.366 > 12 && sea.length * 0.366 < 16, 'about 14 m of fire under a 25 m vehicle');
  let last = sea;
  for (let v = 0.005; v <= 1; v += 0.005) {
    const s = plumeShape(v, A7);
    assert.ok(s.width >= last.width && s.length >= last.length && s.air <= last.air && s.cell >= last.cell, `it only opens (${v})`);
    assert.ok(s.width - last.width < 6 && s.air - last.air > -0.03, `without a step (${v})`); // (fastest near vacuum: a tenth of its width in 0.005)
    last = s;
  }
  assert.ok(plumeShape(0.5, A7).width > 3 && plumeShape(1, A7).width >= 30, 'a wide balloon in near vacuum');
  assert.ok(plumeShape(1, A7).air < 1e-3, 'with nothing to burn in or to stand shocks up');
});

test('each engine opens by its own nozzle: a jet that leaves at a third of an atmosphere opens higher than one at nine tenths', () => {
  assert.equal(plumeShape(0, RD107).width, 1, 'over-expanded at the sea: a column');
  for (const v of [0.1, 0.2, 0.3, 0.5]) assert.ok(plumeShape(v, RD107).width < plumeShape(v, A7).width, `narrower at ${v}`);
  assert.equal(plumeShape(1, RD107).width, plumeShape(1, A7).width, 'and as wide as a jet is drawn in vacuum');
});

test("the fire is the clock's: the same instant is the same fire, and its light is in the scene at no strength when it is out", () => {
  const plume = new Plume(0.366, A7);
  assert.equal(plume.light.intensity, 0);
  assert.equal(plume.set(0, 0, -5, 1), false, 'nothing to draw before it lights');
  assert.equal(plume.mesh.visible, false);
  assert.equal(plume.set(1, 0, 3, 1), true);
  assert.ok(plume.mesh.visible && plume.light.intensity > 100);
  const day = plume.light.intensity;
  assert.equal(plume.time, 3, 'its motion is worked from the seconds it is given, not from a timer');
  plume.set(1, 0, 3, 12);
  assert.ok(plume.bright < 0.2 && plume.light.intensity < 0.2 * day, 'dimmed against a night exposure: not a white blot');
  plume.set(1, 0.95, 140, 1);
  assert.ok(plume.light.intensity < 0.4 * day, 'and fainter as the air thins');
  assert.equal(plume.set(0, 1, 143, 1), true, 'going out is a change');
  assert.equal(plume.light.intensity, 0);
  assert.equal(plume.set(0, 1, 144, 1), false);
});

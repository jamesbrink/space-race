// Apollo 7's built model against its own figures, at every level of detail: each figure read from the flight's specs,
// so the model and flight.ts cannot drift apart with this test still passing. A nozzle-exit radius taken for a
// mounting radius, or a cant the wrong way, looks plausible and puts the thrust on the wrong side of the vehicle.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { flight } from '../missions/usa/apollo/flights/apollo-7/flight.ts';
import { framesOf, materialsUnder } from './glb.mjs';

const model = flight.models[0];
const spec = (label) => {
  const s = flight.specs.find((x) => x.label === label);
  assert.ok(s, `no spec '${label}'`);
  return s.unit === 'deg' ? (s.value * Math.PI) / 180 : s.value;
};
const file = (suffix) => fileURLToPath(new URL(`../public/${model.url.replace(/\.glb$/, `${suffix}.glb`)}`, import.meta.url));

for (const suffix of ['', '.lod1', '.lod2']) {
  test(`Apollo 7: the S-IB's fins span what flight.ts says${suffix}`, () => {
    const { lo, hi } = framesOf(file(suffix)).box('SaturnFirstStage');
    // two opposite pairs lie on the X and Z axes; the paint and the tank cluster are inside both
    for (const axis of [0, 2]) assert.ok(Math.abs(hi[axis] - lo[axis] - spec('S-IB span across fins')) < 0.001, 'opposed fin tips');
  });

  test(`Apollo 7: the H-1s are mounted and canted as flight.ts says, the four inboard fixed and the four outboard gimballed${suffix}`, () => {
    const frames = framesOf(file(suffix));
    const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} differs from ${b}`);
    const station = spec('H-1 mounting plane station');
    for (let i = 0; i < 8; i++) {
      const inboard = i < 4;
      const radius = spec(inboard ? 'H-1 inboard mounting radius' : 'H-1 outboard mounting radius');
      const cant = spec(inboard ? 'H-1 inboard outward cant' : 'H-1 outboard outward cant');
      // (the checklist's Figure 25: inboards on the vehicle's axes, outboards between them)
      const angle = (((i % 4) * 90 + (inboard ? 0 : 45)) * Math.PI) / 180;
      const mount = `H1_Mount_${i}`;
      const at = frames.point(mount);
      assert.ok(at, `missing ${mount}`);
      close(at[0], radius * Math.cos(angle));
      close(at[1], station);
      close(at[2], -radius * Math.sin(angle));
      const up = frames.point(mount, [0, 1, 0]).map((v, k) => v - at[k]);
      close(up[0], -Math.sin(cant) * Math.cos(angle));
      close(up[1], Math.cos(cant));
      close(up[2], Math.sin(cant) * Math.sin(angle));
      // the bell itself goes with its mount, not only an empty
      const bell = frames.point(`H1_Bell_${i}`);
      const bellUp = frames.point(`H1_Bell_${i}`, [0, 1, 0]).map((v, k) => v - bell[k]);
      up.forEach((v, k) => close(bellUp[k], v));
      assert.ok(Math.hypot(bell[0], bell[2]) > radius, 'the exhaust points outboard of the mount');
    }
  });
}

test('Apollo 7: the couches carry their restraints at full detail, and the cabin’s fittings are left out of the distant levels', () => {
  const materials = materialsUnder(file(''), 'CrewCouches');
  assert.ok(materials.includes('apollo-couch-harness'), 'the harnesses');
  assert.ok(materials.includes('apollo-couch-heel-pad'), 'the heel restraints');
  for (const suffix of ['.lod1', '.lod2'])
    for (const node of ['CrewCouches', 'FlightDirectorIndicators', 'ConsoleEquipment'])
      assert.deepEqual(materialsUnder(file(suffix), node), [], `${node}${suffix}: the part's node only`);
});

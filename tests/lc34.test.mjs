import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { framesOf, materialsUnder } from './glb.mjs';

const FT = 0.3048;
const IN = 0.0254;
const vehicle = new URL('../public/models/usa/apollo/apollo-7/vehicle.glb', import.meta.url);
const close = (actual, expected, message, tolerance = 0.005) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${message}: ${actual}, expected ${expected}`);

for (const suffix of ['', '.lod1', '.lod2']) {
  const file = new URL(`../public/models/usa/places/cape-canaveral/lc34/1968-10${suffix}.glb`, import.meta.url);

  test(`LC-34 apron, launch deck and egress hardware share the recorded datums${suffix}`, () => {
    const model = framesOf(file);
    const apron = model.box('Apron_Concrete');
    for (const k of [0, 2]) close(apron.hi[k] - apron.lo[k], 430 * FT, 'concrete circle diameter');
    close(apron.hi[1], 0, 'apron top at local origin');

    const pedestal = model.box('Launch_Pedestal_Plate');
    close(pedestal.hi[1], 27 * FT, 'launch deck top');
    for (const k of [0, 2]) close(pedestal.hi[k] - pedestal.lo[k], 42.56 * FT, 'the plate overlaps the concrete');
    assert.ok(model.box('Duty_Deflector').hi[1] < pedestal.hi[1], 'flame deflector fits under the stand');
    assert.ok((materialsUnder(file, 'Flame_Deflectors') ?? []).includes('ceramic-flame-chute'));

    const bytes = readFileSync(file);
    const nodes = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12))).nodes;
    const properties = (name) => nodes.find((node) => node.name === name)?.extras;
    const tower = properties('Tower_Lift');
    assert.equal(tower?.lift, 1);
    assert.ok(tower.stops.some((height) => Math.abs(height - 220 * FT) < 0.005));
    close(model.point('White_Room_Pivot')[1], 220 * FT, 'access arm hinge at egress stop');
    const whiteRoomFloor = model.point('White_Room_Deck')[1] - 27 * FT;
    const capsuleSill = framesOf(vehicle).box('SideHatch').lo[1];
    assert.ok(capsuleSill > whiteRoomFloor && capsuleSill - whiteRoomFloor < 0.3, 'white room floor meets the hatch within one step');
    assert.equal(properties('Blockhouse_Door')?.door, 1);
    for (let i = 1; i <= 4; i++) assert.equal(properties(`Apron_Flood_${i}_ApronLamp`)?.lens_out, 1);
  });

  test(`LC-34 mobile service structure and transfer van keep working parts at each detail${suffix}`, () => {
    const model = framesOf(file);
    close(model.point('Service_Structure')[0], -600 * FT, 'service structure begins at park site');
    close(model.box('Service_Structure_SteelRoof').hi[1], 310 * FT, 'service structure height');
    assert.ok((materialsUnder(file, 'Apron') ?? []).includes('steel-rail'));
    for (let i = 0; i < 48; i++) {
      const [, height, z] = model.point(`Service_Wheel_${i}`);
      close(height - 1.5 * FT, 0.21 * FT, `wheel ${i} rests on rail head`);
      close(Math.abs(z), [53, 59][Number(i < 24 === (i % 2 === 0))] * FT, `wheel ${i} follows its own rail`);
    }

    const bytes = readFileSync(file);
    const nodes = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12))).nodes;
    const properties = (name) => nodes.find((node) => node.name === name)?.extras;
    const van = properties('Transfer_Van');
    assert.ok(van, 'transfer van is present');
    close(van.wheelbase, 120 * IN, 'Cortez wheelbase');
    for (const i of [1, 2]) {
      assert.equal(properties(`Transfer_Van_Knuckle_${i}`)?.steer, 1);
      const front = model.point(`Transfer_Van_SteerWheel_${i}`);
      const rear = model.point(`Transfer_Van_Wheel_${i}`);
      close(front[0] - rear[0], 120 * IN, 'wheel centers are aligned on the stated wheelbase');
      close(front[1] - van.wheel_radius, 0, 'front tread on apron');
      close(rear[1] - van.wheel_radius, 0, 'rear tread on apron');
    }
    assert.equal(properties('Transfer_Van_Seat_Driver')?.seat, 1);
    assert.equal(properties('Transfer_Van_Door_1')?.door, 1);
    assert.equal(properties('Transfer_Van_Rear_Door')?.door, 1);
  });
}

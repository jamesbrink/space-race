import assert from 'node:assert/strict';
import { test } from 'node:test';
import { atSite, entrances, exhibit } from '../src/app/address.ts';
import { framesOf } from './glb.mjs';

const roots = ['gatv-5002', 'gatv-5003', 'gatv-5004', 'atda', 'gatv-5005', 'gatv-5006', 'gatv-5001'];
const levels = ['', '.lod1', '.lod2'];
const publicRoot = new URL('../public/', import.meta.url);
const asset = (url, level) => new URL(url.replace('.glb', level + '.glb'), publicRoot);

test('each Gemini target opens its spacecraft exhibit and stands shrouded on its own Atlas at Complex 14', async () => {
  for (const id of roots) {
    const { flight } = await import('../missions/usa/gemini/flights/' + id + '/flight.ts');
    assert.deepEqual(entrances(flight), { gallery: true, site: true, fly: false });
    const craft = exhibit(flight);
    const [stack, pad] = atSite(flight).models;
    assert.equal(craft.id, 'spacecraft');
    assert.equal(stack.id, 'vehicle');
    assert.equal(pad.id, 'pad');
    const atda = id === 'atda';
    for (const level of levels) {
      const shape = framesOf(asset(stack.url, level));
      const tip = shape.box('TargetAscentShroud').hi[1];
      assert.ok(Math.abs(tip - (atda ? 1145.55 : 1244.2) * 0.0254) < 0.002, id + level + ' nose tip');
      assert.ok(Math.abs(shape.box('AtlasBoosterEngines').lo[1]) < 0.001, id + level + ' exit plane');
      assert.equal(shape.point('AtlasAdapter'), null, 'the Mercury adapter is absent');
      assert.equal(shape.point(atda ? 'AgenaTankSection' : 'AtdaEquipmentSection'), null);
      assert.ok(shape.point(atda ? 'AtdaEquipmentSection' : 'AgenaTankSection'));
      assert.equal(shape.point('AtdaShroud'), null, 'the hung-open orbital shroud is absent at launch');
      for (const part of stack.parts) assert.ok(shape.point(part.node), id + level + ' ' + part.node);
    }
  }
});

test('the replacement tower and the parked gantry appear only on the Gemini pad', () => {
  for (const level of levels) {
    const pad = framesOf(asset('models/usa/places/cape-canaveral/lc14/1965-10-pad.glb', level));
    const old = framesOf(asset('models/usa/mercury/ma-6-friendship-7/pad.glb', level));
    assert.equal(pad.point('EgressTower'), null);
    assert.equal(old.point('AgenaUmbilicalTower'), null);
    assert.ok(old.point('EgressTower'));
    assert.ok(Math.abs(pad.box('AgenaUmbilicalTower').hi[1] - 101 * 0.3048) < 0.06);
    assert.ok(Math.abs(pad.point('ServiceStructure')[0] - 300 * 0.3048) < 0.01);
  }
});

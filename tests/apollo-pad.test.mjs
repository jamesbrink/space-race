import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { flights } from '../missions/index.ts';
import { atSite, exhibit } from '../src/app/address.ts';
import { framesOf } from './glb.mjs';

for (const [number, letter, launcher] of [
  [8, 'A', 1],
  [9, 'A', 2],
  [10, 'B', 3],
]) {
  const flight = flights.find((f) => f.id === `usa/apollo/apollo-${number}`);
  const vehicle = exhibit(flight);
  const pad = flight.models.find((model) => model.id === 'pad');
  test(`Apollo ${number} stands on ML-${launcher} at 39${letter} with its hatch at the white room`, () => {
    assert.equal(flight.site.name, `Kennedy Space Center, Launch Complex 39${letter}`);
    assert.equal(pad.name, `Mobile launcher ${launcher}`);
    assert.deepEqual(
      atSite(flight).models.map((m) => m.id),
      ['vehicle', 'pad', 'crew', 'pilot', 'lmp'],
    );
    const hatch = framesOf(fileURLToPath(new URL('../public/' + vehicle.url, import.meta.url))).box('SideHatch');
    for (const suffix of ['', '.lod1', '.lod2']) {
      const frames = framesOf(fileURLToPath(new URL('../public/' + pad.url.replace('.glb', suffix + '.glb'), import.meta.url)));
      const room = frames.box('Service_Arm_9_White');
      // The walls start 0.05 ft above the finished floor. The lower edge of the onboard hatch and the
      // adjacent landing must be within a person's step at every LOD. The near end reaches the hatch.
      const floor = room.lo[1] + pad.position[1] - 0.05 * 0.3048;
      assert.ok(Math.abs(hatch.lo[1] - floor) < 0.15, `sill ${hatch.lo[1]}, landing ${floor}`);
      assert.ok(room.lo[0] >= hatch.lo[0] && room.lo[0] <= hatch.hi[0]);
      assert.ok(room.lo[2] < hatch.lo[2] && room.hi[2] > hatch.hi[2]);
      assert.equal(Boolean(frames.point('Substation')), letter === 'A');
    }
  });
}

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { flights } from '../missions/index.ts';
import { atSite, exhibit } from '../src/app/address.ts';
import { sliderAt } from '../src/world/sequence.ts';
import { framesOf } from './glb.mjs';

for (const [number, letter, launcher] of [
  [8, 'A', 1],
  [9, 'A', 2],
  [10, 'B', 3],
  [11, 'A', 1],
]) {
  const flight = flights.find((f) => f.id === `usa/apollo/apollo-${number}`);
  const vehicle = exhibit(flight);
  const pad = flight.models.find((model) => model.id === 'pad');
  test(`Apollo ${number} opens for boarding, holds the access arm 12° away and retracts the five flight arms at first motion`, () => {
    const arms = pad.parts.filter((p) => p.node.startsWith('Service_Arm_'));
    const degrees = (p, at) =>
      p.moves.reduce((sum, move) => {
        const k = Math.min(1, Math.max(0, (sliderAt(pad.sequence, at) - move.from) / (move.to - move.from)));
        return sum + ((move.angle * 180) / Math.PI) * k * k * (3 - 2 * k);
      }, 0);
    for (const seat of vehicle.seats) {
      assert.equal(seat.open[0], flight.opens.at);
      assert.equal(degrees(arms[8], seat.open[0]), 0);
      assert.equal(degrees(arms[8], seat.open[1]), 0);
    }
    assert.ok(Math.abs(degrees(arms[8], -301) - 12) < 1e-6);
    assert.equal(Math.round(degrees(arms[8], -269)), 90);
    for (const [i, p] of arms.entries()) {
      if (number === 9 && i === 0) {
        assert.ok(degrees(p, 0) > 72 && degrees(p, 0) < 90);
        assert.equal(Math.round(degrees(p, 1.77)), 90);
      } else assert.equal(Math.round(degrees(p, 0)), i < 3 || i === 8 ? 90 : 0);
      assert.equal(Math.round(degrees(p, pad.sequence.at(-1).at)), 90);
    }
  });
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
      const craft = framesOf(fileURLToPath(new URL('../public/' + vehicle.url.replace('.glb', suffix + '.glb'), import.meta.url)));
      for (const [part, pivot] of [
        ['SideHatch', 'Side_Hatch_Pivot'],
        ['BoostCover', 'Boost_Hatch_Pivot'],
      ]) {
        assert.ok(craft.point(pivot), `${part} must have its own hinged access door at every LOD`);
        const moves = vehicle.parts.find((p) => p.node === part).clocked;
        assert.equal(moves[0].node, pivot);
        assert.ok(moves[0].to <= flight.opens.at && moves[1].from >= vehicle.seats[0].open[1]);
        assert.equal(moves[0].angle + moves[1].angle, 0);
      }
      const room = frames.box('Service_Arm_9_White');
      // The walls start 0.05 ft above the finished floor. The lower edge of the onboard hatch and the
      // adjacent landing must be within a person's step at every LOD. The near end reaches the hatch.
      const floor = room.lo[1] + pad.position[1] - 0.05 * 0.3048;
      assert.ok(Math.abs(hatch.lo[1] - floor) < 0.15, `sill ${hatch.lo[1]}, landing ${floor}`);
      // (a dated launcher's white room, Apollo 8's, 10's and 11's: lc-39.md)
      if (number !== 9) {
        const gap = room.lo[0] - hatch.hi[0];
        assert.ok(gap > 0 && gap < 0.3, `white room to hatch threshold: ${gap} m`);
      } else {
        assert.ok(room.lo[0] >= hatch.lo[0] && room.lo[0] <= hatch.hi[0]);
      }
      assert.ok(room.lo[2] < hatch.lo[2] && room.hi[2] > hatch.hi[2]);
      assert.equal(Boolean(frames.point('Substation')), letter === 'A');
      // The two leaves hinge toward the negative-Z vestibule wall. Bound their reach through
      // every opening angle with a circle around the hinge. The roof extends 0.25 ft past the inner face.
      const innerWall = room.lo[2] + 0.25 * 0.3048;
      for (const leaf of ['Side_Hatch_Pivot', 'Boost_Hatch_Pivot']) {
        const [x, , z] = craft.point(leaf);
        const { lo, hi } = craft.box(leaf);
        const radial = Math.hypot(Math.max(x - lo[0], hi[0] - x), Math.max(z - lo[2], hi[2] - z));
        assert.ok(z - radial > innerWall, leaf + ' must clear the white-room wall throughout its swing');
      }
      // A conservative swept bound: the greatest towerward reach of any corner of the
      // arm's box during a quarter turn. Even the widest truss clears the tower columns.
      const nearColumn = (60 - 1.15 / 2) * 0.3048;
      for (const arm of pad.parts.filter((p) => p.node.startsWith('Service_Arm_'))) {
        const [x, , z] = frames.point(arm.node);
        const { hi } = frames.box(arm.node);
        const reach = Math.hypot(Math.max(0, hi[0] - x), Math.max(0, hi[2] - z));
        assert.ok(x + reach < nearColumn, arm.node + ' must swing outside the tower columns');
      }
    }
  });
}

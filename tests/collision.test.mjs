// The baked solids (tools/collision-bake.mjs) against the models they were baked from: every model of every sited
// flight has a file and it is current (a GLB rebuilt, or a move changed, and this fails until `pnpm collision` is run);
// each structure's boxes lie where its GLB has that part; a flown vehicle has a hull for every node it sheds, inside
// that node's own bounds; and one hull is held to a documented figure.
import assert from 'node:assert/strict';
import { globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { flights } from '../missions/index.ts';
import { SiteWorld, solidModels, solidUrl } from '../src/sim/siteworld.ts';
import { decodeSolids, outOf } from '../src/sim/solids.ts';
import { bake, sourceOf, staleness } from '../tools/collision-bake.mjs';
import { framesOf } from './glb.mjs';

const root = join(import.meta.dirname, '..');
const load = (url) => decodeSolids(readFileSync(join(root, 'public', url)));
const sited = flights.filter((f) => f.site);

test('every model of every flight with a site has its solids, baked from the model as it is now', () => {
  assert.ok(sited.length > 30, 'the flights were found');
  const wrong = [];
  for (const flight of sited)
    for (const { def, kind } of solidModels(flight)) {
      const state = staleness(def, kind, flight);
      if (state) wrong.push(`${flight.id} ${def.id}: ${state}`);
    }
  assert.deepEqual(wrong, [], 'run `pnpm collision`');
  // and there is no file that no flight's model names: one left behind by a model renamed or a flight removed
  const named = new Set(sited.flatMap((flight) => solidModels(flight).map(({ def }) => `public/${solidUrl(flight, def)}`)));
  const orphans = globSync('public/models/**/*.solid.bin', { cwd: root }).filter((file) => !named.has(file));
  assert.deepEqual(orphans, [], 'files no model names: remove them');
});

test('the files are what the bake makes today: a flight’s pad and its vehicle, baked again, are the same bytes', async () => {
  // (the digest knows the GLB and the flight's data, not the tool: a change to what the bake makes shows here, and wants
  // every file baked again with `pnpm collision --force`)
  const flight = flights.find((f) => f.id === 'usa/mercury/mr-3-freedom-7');
  const models = solidModels(flight);
  assert.deepEqual(models.map((m) => `${m.def.id}: ${m.kind}`).sort(), ['pad: structure', 'vehicle: vehicle']);
  for (const { def, kind } of models) {
    const again = await bake(def, kind, flight);
    assert.ok(
      Buffer.from(again).equals(readFileSync(join(root, 'public', solidUrl(flight, def)))),
      `${def.id}: the committed file is not what the bake makes`,
    );
  }
});

test('a file’s digest does not turn on a figure’s last bit, and does turn on a change', () => {
  // (a figure worked out with a sine differs in its last bit between an arm64 Mac and the x86 Linux of CI: a digest of
  // every digit called files baked on the one stale on the other)
  const flight = flights.find((f) => f.id === 'usa/mercury/mr-3-freedom-7');
  const pad = flight.models.find((m) => m.id === 'pad');
  const was = sourceOf(pad, 'structure', flight);
  /** The pad with the first figure of its parts' moves that is not a whole number multiplied by `by`. */
  const nudged = (by) => {
    let done = false;
    const walk = (v) => {
      if (done) return v;
      if (typeof v === 'number' && !Number.isInteger(v)) {
        done = true;
        return v * by;
      }
      if (Array.isArray(v)) return v.map(walk);
      if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
      return v;
    };
    const parts = pad.parts.map((p) => ({ ...p, moves: walk(p.moves) }));
    assert.ok(done, 'the pad has a figure to nudge');
    return { ...pad, parts };
  };
  assert.equal(sourceOf(nudged(1 + 2 ** -52), 'structure', flight), was, 'the last bit');
  assert.notEqual(sourceOf(nudged(1.001), 'structure', flight), was, 'a part in a thousand');
  // what the site does not draw is not baked, so it is in the digest; a vehicle's hulls do not turn on its parts' moves
  assert.notEqual(sourceOf({ ...pad, absent: ['CameraTowers'] }, 'structure', flight), was, 'a part left out');
  const vehicle = flight.models.find((m) => m.id === 'vehicle');
  const moved = { ...vehicle, parts: vehicle.parts.map((p) => ({ ...p, explode: [1, 2, 3] })) };
  assert.equal(sourceOf(moved, 'vehicle', flight), sourceOf(vehicle, 'vehicle', flight), 'a vehicle’s parts’ offsets');
  const shedding = { ...flight, flies: { ...flight.flies, drops: [...flight.flies.drops, { at: 1, nodes: ['Hatch'] }] } };
  assert.notEqual(sourceOf(vehicle, 'vehicle', shedding), sourceOf(vehicle, 'vehicle', flight), 'another node shed');
});

test('a structure’s boxes lie where its model has that part', () => {
  let pieces = 0;
  for (const flight of sited)
    for (const { def, kind } of solidModels(flight)) {
      if (kind !== 'structure') continue;
      const solids = load(solidUrl(flight, def));
      const frames = framesOf(join(root, 'public', def.url));
      // (a part nothing moves stands as it was built; one that moves is somewhere else by liftoff)
      const moved = new Set(def.parts.filter((p) => p.moves?.length || p.clocked?.length || p.explode.some(Boolean)).map((p) => p.node));
      for (const piece of solids.pieces) {
        assert.ok(frames.point(piece.part), `${flight.id} ${def.id}: no node ${piece.part}`);
        if (moved.has(piece.part) || piece.track) continue;
        const { lo, hi } = frames.box(piece.part);
        const slack = piece.cell + 0.02;
        for (let i = 0; i < piece.boxes.length; i += 6)
          for (const corner of [0, 7]) {
            const p = outOf(
              piece.pose,
              [0, 1, 2].map((k) => piece.boxes[i + (corner ? 3 : 0) + k]),
            );
            for (let k = 0; k < 3; k++)
              assert.ok(
                p[k] >= lo[k] - slack && p[k] <= hi[k] + slack,
                `${flight.id} ${def.id} ${piece.node}: a box at ${p} outside ${lo} to ${hi}`,
              );
          }
        pieces++;
      }
      // no part of people is solid
      const people = def.parts.filter((p) => p.going?.length).map((p) => p.node);
      for (const piece of solids.pieces) assert.ok(!people.includes(piece.part), `${flight.id} ${def.id}: ${piece.part} is people`);
    }
  assert.ok(pieces > 200, `pieces were checked (${pieces})`);
});

test('a piece that moves after liftoff has a track that starts at liftoff, runs forward and keeps its turns whole', () => {
  let tracks = 0;
  for (const flight of sited)
    for (const { def, kind } of solidModels(flight)) {
      if (kind !== 'structure') continue;
      for (const piece of load(solidUrl(flight, def)).pieces) {
        const track = piece.track;
        if (!track) continue;
        const where = `${flight.id} ${def.id} ${piece.node}`;
        assert.ok(track.length >= 16 && track.length % 8 === 0, `${where}: ${track.length} figures`);
        assert.equal(track[0], 0, `${where}: starts at liftoff`);
        // (its liftoff pose is its track's first)
        for (let k = 0; k < 3; k++) assert.equal(track[1 + k], Math.fround(piece.pose.p[k]), `${where}: liftoff pose`);
        for (let i = 0; i < track.length; i += 8) {
          if (i) assert.ok(track[i] > track[i - 8], `${where}: time runs forward`);
          const turn = Math.hypot(track[i + 4], track[i + 5], track[i + 6], track[i + 7]);
          assert.ok(Math.abs(turn - 1) < 1e-4, `${where}: a turn of length ${turn}`);
        }
        tracks++;
      }
    }
  assert.ok(tracks > 20, `tracks were checked (${tracks})`);
});

test('a flown vehicle has a hull for every node it sheds, within that node', () => {
  let hulls = 0;
  for (const flight of sited) {
    const flown = solidModels(flight).find((m) => m.kind === 'vehicle');
    if (!flown) continue;
    const solids = load(solidUrl(flight, flown.def));
    const frames = framesOf(join(root, 'public', flown.def.url));
    const absent = new Set(flown.def.absent ?? []);
    for (const node of flight.flies.drops.flatMap((d) => d.nodes)) {
      if (absent.has(node) || !frames.point(node)) continue;
      const { lo, hi } = frames.box(node);
      if (!(hi[1] > lo[1])) continue; // (a node with nothing in it)
      const hull = solids.hulls.find((h) => h.node === node);
      assert.ok(hull?.beads.length, `${flight.id}: no hull for ${node}`);
      for (let i = 0; i < hull.beads.length; i += 4) {
        const [x, y, z, r] = hull.beads.subarray(i, i + 4);
        assert.ok(
          r > 0 && y - r >= lo[1] - 0.05 && y + r <= hi[1] + 0.05,
          `${flight.id} ${node}: a sphere at ${y} of ${r} outside ${lo[1]} to ${hi[1]}`,
        );
        assert.ok(
          x >= lo[0] - 0.05 && x <= hi[0] + 0.05 && z >= lo[2] - 0.05 && z <= hi[2] + 0.05,
          `${flight.id} ${node}: a sphere off the node`,
        );
        // and no sphere reaches beyond the node's sides (a sphere wider than its stage struck a tower it stood clear of)
        assert.ok(
          x - r >= lo[0] - 0.1 && x + r <= hi[0] + 0.1 && z - r >= lo[2] - 0.1 && z + r <= hi[2] + 0.1,
          `${flight.id} ${node}: a sphere of ${r} at ${x}, ${z} beyond the node's sides, ${lo[0]} to ${hi[0]} and ${lo[2]} to ${hi[2]}`,
        );
      }
      hulls++;
    }
  }
  assert.ok(hulls > 50, `hulls were checked (${hulls})`);
});

test('the Redstone’s hull is the Redstone’s: 70 in across', () => {
  const flight = flights.find((f) => f.id === 'usa/mercury/mr-3-freedom-7');
  const tank = load(solidUrl(flight, { id: 'vehicle' })).hulls.find((h) => h.node === 'RedstoneCenterUnit');
  const radii = [];
  for (let i = 3; i < tank.beads.length; i += 4) radii.push(tank.beads[i]);
  radii.sort((a, b) => a - b);
  const median = radii[radii.length >> 1];
  // (documented: 70 in diameter, 0.889 m radius; the model's skin has stringers and conduits on it)
  assert.ok(Math.abs(median - 0.889) < 0.03, `median radius ${median}`);
});

test('Complex 5 on the morning of Freedom 7: the launch axis is clear above the launcher, and the structures stand off it', () => {
  const flight = flights.find((f) => f.id === 'usa/mercury/mr-3-freedom-7');
  const world = SiteWorld.of(flight, load);
  for (const name of ['pad/LaunchPedestal', 'pad/ServiceStructure', 'pad/UmbilicalMast', 'pad/BoosterMast'])
    assert.ok(world.names.includes(name), `${name} stands there`);
  // straight down the launch axis from high above: the first thing under it is the launcher or the pad, near the ground
  const under = world.below([0, 200, 0], 0);
  assert.ok(under && under.height < 5, `over the launch axis: ${JSON.stringify(under)}`);
  // a sphere the vehicle's width rising up the axis from above the launcher meets nothing: the structure is rolled back
  assert.equal(world.sweep([0, 6, 0], [0, 200, 0], 0.9, 0), null);
});

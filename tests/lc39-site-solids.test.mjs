import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Box3, Matrix3, Matrix4, Quaternion, Vector3 } from 'three';
import { OBB } from 'three/examples/jsm/math/OBB.js';
import { SiteWorld } from '../src/sim/siteworld.ts';
import { BoxTree, decodeSolids, poseAt } from '../src/sim/solids.ts';
import { Exploder } from '../src/viewer/explode.ts';
import { RADIUS } from '../src/viewer/onfoot/walk.ts';
import { sliderAt } from '../src/world/sequence.ts';
import { hierarchy } from './glb.mjs';
import { countdownSamples, flights } from './lc39-clearance.mjs';

const base = new URL('../public/', import.meta.url);
// Before liftoff, the on-foot countdown poses the rendered hierarchy. Place the decoded boxes
// on that same hierarchy to check whether their approximation fills the open hatch or room.
function countdownModel(model, solid) {
  const glb = readFileSync(new URL(model.url, base));
  const graph = hierarchy(JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12))));
  const exploder = new Exploder(graph, model.parts);
  const nodes = solid.pieces.map((piece) => graph.getObjectByName(piece.node));
  return (t) => {
    if (t >= 0) {
      const pieces = solid.pieces.map((piece) => ({ ...piece, pose: poseAt(piece, t), track: undefined }));
      return { ...model, solids: { ...solid, pieces } };
    }
    exploder.set(model.sequence ? sliderAt(model.sequence, t) : 0);
    exploder.clock(t);
    graph.updateMatrixWorld(true);
    const pieces = solid.pieces.map((piece, index) => {
      const node = nodes[index];
      const position = node.getWorldPosition(new Vector3()).toArray();
      const rotation = node.getWorldQuaternion(new Quaternion()).toArray();
      return { ...piece, pose: { p: position, q: rotation }, track: undefined };
    });
    return { ...model, solids: { ...solid, pieces } };
  };
}

function boxAt(boxes, offset, target) {
  target.min.fromArray(boxes, offset);
  target.max.fromArray(boxes, offset + 3);
  return target;
}

// Build one spatial index per rigid piece. The pad and rocket are independent assets,
// so a comparison needs both the flight's placement and each node's current pose.
function collisionPieces(model, solid) {
  const placedAt = countdownModel(model, solid);
  const indexes = new Map();
  const placement = new Matrix4().makeRotationY(model.rotationY ?? 0);
  placement.setPosition(new Vector3(...(model.position ?? [0, 0, 0])));
  for (const piece of solid.pieces) {
    const tree = new BoxTree(piece.boxes);
    const { lo, hi } = tree.extent;
    const bounds = new Box3(new Vector3(...lo), new Vector3(...hi));
    indexes.set(piece.node, { piece, tree, bounds, siteBounds: new Box3(), matrix: new Matrix4(), inverse: new Matrix4() });
  }
  const pos = new Vector3(),
    rot = new Quaternion(),
    unit = new Vector3(1, 1, 1);
  const nextFrame = new Matrix4();
  return (t) => {
    for (const posed of placedAt(t).solids.pieces) {
      const item = indexes.get(posed.node);
      if (!item) continue;
      nextFrame.compose(pos.fromArray(posed.pose.p), rot.fromArray(posed.pose.q), unit).premultiply(placement);
      item.moved = item.siteBounds.isEmpty() || !item.matrix.equals(nextFrame);
      if (!item.moved) continue;
      item.matrix.copy(nextFrame);
      item.inverse.copy(item.matrix).invert();
      item.siteBounds.copy(item.bounds).applyMatrix4(item.matrix);
    }
    return indexes.values();
  };
}

function intersect(a, b) {
  if (!a.siteBounds.intersectsBox(b.siteBounds)) return false;
  // Query the larger piece's tree with the fewer boxes from its neighbour.
  const [probe, target] = a.piece.boxes.length <= b.piece.boxes.length ? [a, b] : [b, a];
  const toTarget = new Matrix4().multiplyMatrices(target.inverse, probe.matrix);
  const rotation = new Matrix3().setFromMatrix4(toTarget);
  const box = new Box3(),
    candidate = new Box3(),
    oriented = new OBB();
  for (let i = 0; i < probe.piece.boxes.length; i += 6) {
    oriented.fromBox3(boxAt(probe.piece.boxes, i, box));
    oriented.center.applyMatrix4(toTarget);
    oriented.rotation.copy(rotation);
    const radius = oriented.halfSize.length();
    if (target.bounds.distanceToPoint(oriented.center) > radius) continue;
    for (const j of target.tree.touching(oriented.center.toArray(), radius + 1e-8)) {
      if (oriented.intersectsBox3(boxAt(target.piece.boxes, 6 * j, candidate))) return true;
    }
  }
  return false;
}

for (const [flight] of flights) {
  const pad = flight.models.find((model) => model.id === 'pad');
  const stack = flight.models.find((model) => model.id === 'vehicle');
  const solidsOf = (model) => decodeSolids(readFileSync(new URL(`models/${flight.id}/${model.id}.solid.bin`, base)));

  test(`${flight.id} open hatch passes a shoulder-width probe from the white room and the closed hatch stops it`, () => {
    const poses = [countdownModel(pad, solidsOf(pad)), countdownModel(stack, solidsOf(stack))];
    const [opens, shuts] = stack.seats[0].open;
    const from = [4, 99.8, 0];
    const to = [1.15, 99.8, 0];
    for (const t of [opens - 30, opens, (opens + shuts) / 2, shuts, shuts + 30]) {
      const world = new SiteWorld(poses.map((pose) => pose(t)));
      const hit = world.sweep(from, to, RADIUS, t);
      if (t < opens || t > shuts) assert.equal(hit?.node, 'Boost_Hatch_Pivot', `outer leaf at ${t}`);
      else assert.ok(world.clear(from, to, RADIUS, t), `blocked by ${hit?.node} at ${t}`);
    }
  });

  test(`${flight.id} full fin span clears the baked tower, crane and withdrawn service arms along the launch axis`, () => {
    const full = solidsOf(pad);
    // Test the full swept width even at heights where the stack is narrower than its four fins.
    const radius = (63 / 2) * 0.3048;
    const a = [0, 0, 0];
    const b = [0, 150, 0];
    const allClear = pad.sequence.at(-1).at;
    const inflight = new Set(['Service_Arm_4', 'Service_Arm_5', 'Service_Arm_6', 'Service_Arm_7', 'Service_Arm_8']);
    const pieces = full.pieces.filter((p) => ['Umbilical_Tower', 'Hammerhead_Crane'].includes(p.node) || /^Service_Arm_\d+$/.test(p.node));
    assert.equal(pieces.length, 11);
    for (const piece of pieces) {
      const world = new SiteWorld([{ ...pad, solids: { ...full, pieces: [piece] } }]);
      const start = inflight.has(piece.node) ? allClear : 0;
      assert.ok(world.clear(a, b, radius, start, allClear), piece.node);
    }
  });

  test(`${flight.id} all nine arm bodies and the surrounding structures clear every baked rocket piece through the countdown`, () => {
    const siteAt = collisionPieces(pad, solidsOf(pad));
    // The model stays on its four bearing soles. Only moving clamp links and umbilical carriers
    // also mate with the S-IC, and each has to clear it when its own withdrawal ends.
    const releaseEnds = new Map(
      pad.parts.flatMap((p) => (p.clocked ?? []).filter((m) => /^(Holddown_Link_|Tail_Carrier_)/.test(m.node)).map((m) => [m.node, m.to])),
    );
    assert.equal(releaseEnds.size, 7);
    const rocketAt = collisionPieces(stack, solidsOf(stack));
    for (const t of countdownSamples(stack, pad, 128)) {
      const rocket = [...rocketAt(t)];
      for (const structure of siteAt(t)) {
        for (const body of rocket) {
          const node = structure.piece.node;
          if (body.piece.node === 'SaturnFirstStage' && (node === 'Holddown_Arms' || t < (releaseEnds.get(node) ?? -Infinity))) continue;
          // An unchanged pair has the same clearance it had at the previous sample.
          if ((structure.moved || body.moved || t === releaseEnds.get(node)) && intersect(structure, body)) {
            assert.fail(`${structure.piece.node} touches ${body.piece.node} at T${t.toFixed(3)}`);
          }
        }
      }
    }
  });
}

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
import { framesOf, hierarchy } from './glb.mjs';
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

function intersect(a, b, allowed) {
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
      if (!oriented.intersectsBox3(boxAt(target.piece.boxes, 6 * j, candidate))) continue;
      if (!allowed) return true;
      // Bound the contact in site coordinates. Only the steel adjacent to a designed
      // vehicle interface can share a baked voxel with the rocket.
      const contact = box.clone().applyMatrix4(probe.matrix).intersect(candidate.clone().applyMatrix4(target.matrix));
      if (!allowed.some((area) => area.containsBox(contact))) return true;
    }
  }
  return false;
}

for (const [flight, serial, firstMotion] of flights) {
  const pad = flight.models.find((model) => model.id === 'pad');
  const stack = flight.models.find((model) => model.id === 'vehicle');
  const solidsOf = (model) => decodeSolids(readFileSync(new URL(`models/${flight.id}/${model.id}.solid.bin`, base)));

  test(`${flight.id} open hatch passes a shoulder-width probe from the white room and the closed hatch stops it`, () => {
    const poses = [countdownModel(pad, solidsOf(pad)), countdownModel(stack, solidsOf(stack))];
    const [opens, shuts] = stack.seats[0].open;
    const from = [4, 99.8, 0];
    const to = [1.15, 99.8, 0];
    const doors = (node) => stack.parts.flatMap((p) => p.clocked ?? []).filter((m) => m.node === node);
    const [coverOpens, coverCloses] = doors('Boost_Hatch_Pivot');
    const [hatchOpens, hatchCloses] = doors('Side_Hatch_Pivot');
    const hitAt = (t) => new SiteWorld(poses.map((pose) => pose(t))).sweep(from, to, RADIUS, t)?.node;
    assert.equal(hitAt(coverOpens.from - 1), 'Boost_Hatch_Pivot');
    assert.equal(hitAt(coverCloses.to + 1), 'Boost_Hatch_Pivot');
    for (const t of [hatchOpens.to, opens, (opens + shuts) / 2, shuts]) assert.equal(hitAt(t), undefined, `boarding passage at ${t}`);
    if (hatchCloses.to < coverCloses.from) {
      // The closeout crew could work on the cover after shutting the pressure hatch.
      assert.equal(hitAt((hatchCloses.to + coverCloses.from) / 2), 'Side_Hatch_Pivot');
    }
  });

  test(`${flight.id} full fin span clears the baked tower, crane and withdrawn service arms along the launch axis`, () => {
    const full = solidsOf(pad);
    // Test the full swept width even at heights where the stack is narrower than its fins.
    const radius = ((serial === 206 ? 40.7 : 63) / 2) * 0.3048;
    const a = stack.position ?? [0, 0, 0];
    const b = [a[0], a[1] + 150, a[2]];
    const allClear = pad.sequence.at(-1).at;
    const inflight = new Set(['Service_Arm_1A', 'Service_Arm_4', 'Service_Arm_5', 'Service_Arm_6', 'Service_Arm_7', 'Service_Arm_8']);
    const pieces = full.pieces.filter(
      (p) => ['Umbilical_Tower', 'Hammerhead_Crane'].includes(p.node) || /^Service_Arm_(?:\d+|1A)$/.test(p.node),
    );
    assert.equal(pieces.length, serial === 206 ? 7 : 11);
    for (const piece of pieces) {
      const world = new SiteWorld([{ ...pad, solids: { ...full, pieces: [piece] } }]);
      const start = inflight.has(piece.node) ? allClear : 0;
      assert.ok(world.clear(a, b, radius, start, allClear), piece.node);
    }
  });

  if (serial === 206) {
    test(`${flight.id} clears every baked structure during inflight arm retraction and through 150 m of ascent`, () => {
      const end = pad.sequence.at(-1).at;
      const rocket = [...collisionPieces(stack, solidsOf(stack))(end)];
      const site = [...collisionPieces(pad, solidsOf(pad))(end)];
      // Index the unmoved rocket by horizontal footprint. Sweeping the pad boxes downward
      // by a range of heights then tests the entire upward path of the actual fin/H-1 layout.
      const columns = new Map();
      const envelope = new Box3();
      for (const piece of rocket) {
        for (let i = 0; i < piece.piece.boxes.length; i += 6) {
          const box = boxAt(piece.piece.boxes, i, new Box3()).applyMatrix4(piece.matrix);
          envelope.union(box);
          for (let x = Math.floor(box.min.x); x <= box.max.x; x++) {
            for (let z = Math.floor(box.min.z); z <= box.max.z; z++) {
              const key = `${x},${z}`;
              if (!columns.has(key)) columns.set(key, []);
              columns.get(key).push({ box, name: piece.piece.node });
            }
          }
        }
      }
      const box = new Box3(),
        corner = new Box3(),
        local = new Box3();
      function sweep(piece, startPose, endPose, rise, at) {
        const q0 = new Quaternion().setFromRotationMatrix(startPose);
        const q1 = new Quaternion().setFromRotationMatrix(endPose);
        // Between successive baked samples the hinge turns on the shortest quaternion arc.
        // The farthest corner bows away from its endpoint chord by at most this fraction of its hinge radius.
        const sagitta = 1 - Math.cos(0.5 * q0.angleTo(q1));
        for (let i = 0; i < piece.boxes.length; i += 6) {
          boxAt(piece.boxes, i, local);
          const radius = Math.hypot(...['x', 'y', 'z'].map((axis) => Math.max(Math.abs(local.min[axis]), Math.abs(local.max[axis]))));
          box
            .copy(local)
            .applyMatrix4(startPose)
            .union(corner.copy(local).applyMatrix4(endPose))
            .expandByScalar(radius * sagitta);
          box.min.y -= rise;
          box.intersect(envelope);
          if (box.isEmpty()) continue;
          for (let x = Math.floor(box.min.x); x <= box.max.x; x++) {
            for (let z = Math.floor(box.min.z); z <= box.max.z; z++) {
              for (const body of columns.get(`${x},${z}`) ?? []) {
                if (box.intersectsBox(body.box)) assert.fail(`${piece.node} is in the vertical path of ${body.name} by T+${at}s`);
              }
            }
          }
        }
      }
      const unit = new Vector3(1, 1, 1);
      const placement = new Matrix4().makeRotationY(pad.rotationY ?? 0).setPosition(new Vector3(...pad.position));
      for (const { piece, matrix } of site) {
        sweep(piece, matrix, matrix, 150, end);
        if (!piece.track) continue;
        const frame = (t) => {
          const { p, q } = poseAt(piece, t);
          return new Matrix4().compose(new Vector3(...p), new Quaternion(...q), unit).premultiply(placement);
        };
        let start = frame(firstMotion);
        const times = piece.track.filter((v, i) => i % 8 === 0 && v > firstMotion && v < end);
        for (const t of [...times, end]) {
          const finish = frame(t);
          // MPR-SAT-FE-73-3 §§6 and 16: ~7.3 MN at 586 tonnes, only ~3 t/s propellant
          // flow. 5 m/s² upward bounds net acceleration for these first 6.3 s, allowing
          // for falling mass. Test every height up to that bound, independently of actual timing.
          const maxRise = 0.5 * 5 * (t - firstMotion) ** 2;
          sweep(piece, start, finish, maxRise, t);
          start = finish;
        }
      }
    });
  }
  test(`${flight.id} all service arms and the surrounding structures clear every baked rocket piece through the countdown`, () => {
    const siteAt = collisionPieces(pad, solidsOf(pad));
    const stackSolid = solidsOf(stack);
    const rocketAt = collisionPieces(stack, stackSolid);
    // The model stays on the launcher while its clock runs. Each moving interface must
    // fully clear the corresponding stage once its withdrawal ends.
    const releaseEnds = new Map(
      pad.parts.flatMap((p) => (p.clocked ?? []).filter((m) => /^(Holddown_Link_|Tail_Carrier_)/.test(m.node)).map((m) => [m.node, m.to])),
    );
    assert.equal(releaseEnds.size, serial === 206 ? 8 : 7);
    const allowed = new Map();
    if (serial === 206) {
      // Only the small bearing at each fin tip can share bake cells with pedestal hardware.
      // The allowance covers the sloping underside plus one clipped box cell on each side.
      const area = (i) => {
        const angle = (i * Math.PI) / 4;
        const tip = new Vector3(20 * 0.3048 * Math.cos(angle), stack.position[1] + 63 * 0.0254, -20 * 0.3048 * Math.sin(angle));
        return new Box3(tip.clone(), tip.clone()).expandByScalar(stackSolid.cell + 0.1);
      };
      for (let i = 0; i < 8; i++) allowed.set(`Holddown_Link_${i + 1}`, [area(i)]);
    } else {
      const vehicle = framesOf(new URL(stack.url, base));
      // Stage surfaces angled across a bake cell can occupy a little more space than the mesh.
      const lugs = Array.from({ length: 4 }, (_, i) => {
        const { lo, hi } = vehicle.box(`SIC${serial}_BearingLug_${i + 1}`);
        return new Box3(new Vector3(...lo), new Vector3(...hi)).expandByScalar(stackSolid.cell);
      });
      const soles = lugs.map((lug) => {
        const plane = lug.min.y + stackSolid.cell;
        const area = lug.clone();
        // Allow 2 mm for the independent compressed meshes and baked box bounds.
        area.min.y = plane - 0.002;
        area.max.y = plane + 0.002;
        return area;
      });
      allowed.set('Holddown_Arms', soles);
      for (const [i, lug] of lugs.entries()) allowed.set(`Holddown_Link_${i + 1}`, [lug]);
      // The carrier translates into the tip of its swinging boom. Limit the contact
      // allowance to its local withdrawal stroke until the plate has pulled away.
      for (const p of siteAt(-1)) {
        if (p.piece.node.startsWith('Tail_Carrier_')) allowed.set(p.piece.node, [p.siteBounds.clone()]);
      }
      for (const [node, stop] of releaseEnds) {
        if (!node.startsWith('Tail_Carrier_')) continue;
        const carrier = [...siteAt(stop)].find((piece) => piece.piece.node === node);
        allowed.get(node)[0].union(carrier.siteBounds).expandByScalar(stackSolid.cell);
      }
    }
    for (const t of countdownSamples(stack, pad, 128)) {
      const rocket = [...rocketAt(t)];
      for (const structure of siteAt(t)) {
        for (const body of rocket) {
          const node = structure.piece.node;
          const mating = body.piece.node === 'SaturnFirstStage' && (node === 'Holddown_Arms' || t < (releaseEnds.get(node) ?? -Infinity));
          // An unchanged pair has the same clearance it had at the previous sample.
          if (
            (structure.moved || body.moved || t === releaseEnds.get(node)) &&
            intersect(structure, body, mating ? allowed.get(node) : undefined)
          ) {
            assert.fail(`${structure.piece.node} touches ${body.piece.node} at T${t.toFixed(3)}`);
          }
        }
      }
    }
  });
}

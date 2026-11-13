// Every flight's data against its built models: a renamed node, a missing GLB or a view that
// does not exist would otherwise only show up as a part that silently does nothing.
import assert from 'node:assert/strict';
import { existsSync, globSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { faults } from '../src/world/sequence.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIDENCE = ['documented', 'derived', 'estimated'];

/** The names of a GLB's top-level nodes, read from its JSON chunk (no geometry is decoded). */
function topLevelNodes(file) {
  const glb = readFileSync(file);
  assert.equal(glb.readUInt32LE(0), 0x46546c67, `${file} is not a GLB`);
  const gltf = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8'));
  const scene = gltf.scenes[gltf.scene ?? 0];
  // the exporter may wrap everything in one unnamed root: look through it
  const names = (ids) => ids.flatMap((i) => [gltf.nodes[i].name, ...(ids.length === 1 ? names(gltf.nodes[i].children ?? []) : [])]);
  return new Set(names(scene.nodes));
}

/** The names of every node in a GLB, at any depth. */
function allNodes(file) {
  const glb = readFileSync(file);
  return new Set(JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8')).nodes.map((n) => n.name));
}

/** Every node of a GLB by name, with its extras. */
function extrasOf(file) {
  const glb = readFileSync(file);
  return new Map(JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8')).nodes.map((n) => [n.name, n.extras ?? {}]));
}

const files = globSync('missions/*/*/flights/*/flight.ts', { cwd: root });
assert.ok(files.length > 0, 'no flights found');
const index = readFileSync(join(root, 'missions/index.ts'), 'utf8');

for (const file of files) {
  const { flight } = await import(pathToFileURL(join(root, file)).href);
  const [, nation, programme, , name] = file.split('/');

  test(`${flight.id}: identity`, () => {
    assert.equal(flight.id, `${nation}/${programme}/${name}`, 'id must be the path');
    assert.ok(index.includes(relative('missions', dirname(file))), 'not listed in missions/index.ts');
    assert.ok(!Number.isNaN(Date.parse(flight.launch)), 'launch is not a date');
    const ids = flight.models.map((m) => m.id);
    assert.equal(new Set(ids).size, ids.length, 'model ids repeat');
  });

  test(`${flight.id}: numbers carry a confidence`, () => {
    for (const s of [...flight.specs, ...flight.motors]) {
      assert.ok(CONFIDENCE.includes(s.confidence), `${s.label ?? s.name}: confidence`);
      if (s.confidence !== 'estimated') assert.ok(s.note, `${s.label ?? s.name}: a ${s.confidence} figure needs a note naming its source`);
    }
    for (const s of flight.specs) assert.ok(Number.isFinite(s.value), `${s.label}: value`);
    const times = flight.timeline.map((e) => e.t);
    assert.deepEqual(
      times,
      [...times].sort((a, b) => a - b),
      'timeline out of order',
    );
  });

  if (flight.surroundings)
    test(`${flight.id}: surroundings`, () => {
      assert.ok(!flight.surroundings.startsWith('/'), 'url must be relative (Pages serves from a sub-path)');
      assert.ok(existsSync(join(root, 'public', flight.surroundings)), `${flight.surroundings} is missing: run pnpm models`);
    });

  for (const model of flight.models)
    test(`${flight.id}: ${model.id} matches its GLB`, () => {
      assert.ok(!model.url.startsWith('/'), 'url must be relative (Pages serves from a sub-path)');
      const glb = join(root, 'public', model.url);
      assert.ok(existsSync(glb), `${model.url} is missing: run pnpm models`);
      const nodes = topLevelNodes(glb);
      for (const part of model.parts) {
        assert.ok(nodes.has(part.node), `part ${part.node} is not a top-level node of ${model.url}`);
        assert.ok(Number.isInteger(part.order) && part.order >= 0, `${part.node}: order`);
      }
      // the coarser levels of detail are the same model: every part is in each of them
      for (const level of [1, 2]) {
        const lod = glb.replace(/\.glb$/, `.lod${level}.glb`);
        assert.ok(existsSync(lod), `${model.url} has no level ${level}: run pnpm models`);
        const lodNodes = topLevelNodes(lod);
        for (const part of model.parts) assert.ok(lodNodes.has(part.node), `part ${part.node} is missing from level ${level}`);
      }
      // what moves on the clock is a node of its own, at every level of detail; and one that runs its own motion
      // carries it there (its extras' `run`: seven figures a sample, beginning as it was built)
      const levels = [glb, glb.replace(/\.glb$/, '.lod1.glb'), glb.replace(/\.glb$/, '.lod2.glb')];
      const clockedNodes = new Set();
      for (const part of model.parts)
        for (const move of part.clocked ?? []) {
          assert.ok(move.node, `${part.node}: a clocked move names its node`);
          assert.ok(move.to > move.from, `${part.node}: ${move.node} moves over no time`);
          clockedNodes.add(move.node);
          for (const file of levels) {
            assert.ok(allNodes(file).has(move.node), `${part.node}: no node ${move.node} in ${relative(root, file)}`);
            if (move.kind !== 'run') continue;
            const run = extrasOf(file).get(move.node)?.run;
            assert.ok(
              Array.isArray(run) && run.length >= 14 && run.length % 7 === 0,
              `${move.node} has no motion of its own in ${relative(root, file)}`,
            );
            assert.ok(
              run.slice(0, 7).every((v, i) => Math.abs(v - [0, 0, 0, 0, 0, 0, 1][i]) < 1e-9),
              `${move.node}: its motion begins where it was built`,
            );
            for (let i = 3; i < run.length; i += 7)
              assert.ok(
                Math.abs(Math.hypot(run[i], run[i + 1], run[i + 2], run[i + 3]) - 1) < 1e-4,
                `${move.node}: a turn is a unit quaternion`,
              );
          }
        }
      // a mechanism (types.ts: MechanismDef): its nodes move on the clock, at its own events and for as long as it takes
      for (const mechanism of model.mechanisms ?? []) {
        for (const node of mechanism.nodes) assert.ok(clockedNodes.has(node), `mechanism ${mechanism.id}: ${node} has no clocked move`);
        assert.ok(mechanism.takes > 0 && mechanism.says.length === 2);
        const times = mechanism.events.map(([at]) => at);
        assert.deepEqual(
          times,
          [...times].sort((a, b) => a - b),
          `mechanism ${mechanism.id}: its events are in order`,
        );
        const at = mechanism.events.findIndex(([t, out]) => t === mechanism.from && out);
        assert.ok(at > 0 && !mechanism.events[at - 1][1], `mechanism ${mechanism.id}: \`from\` is an event that sends it out from in`);
        assert.ok(
          (mechanism.events[at + 1]?.[0] ?? Infinity) - mechanism.from >= mechanism.takes,
          `mechanism ${mechanism.id}: its travel from \`from\` is cut short`,
        );
        for (const part of model.parts)
          for (const move of part.clocked ?? [])
            if (mechanism.nodes.includes(move.node)) {
              const event = mechanism.events.find(([t]) => t === move.from);
              assert.ok(event, `mechanism ${mechanism.id}: ${move.node} moves at ${move.from}, which is none of its events`);
              assert.equal(
                move.to - move.from,
                mechanism.takes,
                `mechanism ${mechanism.id}: ${move.node}'s move takes as long as the mechanism does`,
              );
              assert.equal(
                Boolean(move.back),
                !event[1],
                `mechanism ${mechanism.id}: ${move.node} runs out when it is sent out and back when sent in`,
              );
            }
        if (model.cabin?.periscope?.mechanism) assert.ok(model.mechanisms.some((m) => m.id === model.cabin.periscope.mechanism));
        for (const c of model.cabin?.controls ?? [])
          if (c.works)
            assert.ok(
              model.mechanisms.some((m) => m.id === c.works),
              `control ${c.node} works no mechanism called ${c.works}`,
            );
      }
      // a command that works a mechanism by hand (types.ts Command, `work:<id>`) names one the model has, and says
      // what drawing it in is called as well as putting it out; and a mechanism has one on some part, to be found by
      for (const part of model.parts)
        for (const c of part.commands ?? [])
          if (c.ask.startsWith('work:')) {
            assert.ok(
              (model.mechanisms ?? []).some((m) => m.id === c.ask.slice(5)),
              `${part.node}: a command works no mechanism called ${c.ask.slice(5)}`,
            );
            assert.ok(c.label && c.back && c.back !== c.label, `${part.node}: ${c.ask} says which way it is sent`);
          }
      if (flight.flies?.model === model.id)
        for (const mechanism of model.mechanisms ?? [])
          assert.ok(
            model.parts.some((p) => (p.commands ?? []).some((c) => c.ask === `work:${mechanism.id}`)),
            `mechanism ${mechanism.id}: no part offers it by hand`,
          );
      // what a part's moves and functions name is a node of the model too, at every level of detail: a motion on
      // a node that is not there does nothing, and says nothing
      for (const part of model.parts) {
        const named = [...(part.moves ?? []).map((move) => move.node), ...(part.functions ?? []).flatMap((fn) => fn.nodes)];
        for (const node of new Set(named.filter(Boolean)))
          for (const file of [glb, glb.replace(/\.glb$/, '.lod1.glb'), glb.replace(/\.glb$/, '.lod2.glb')])
            assert.ok(allNodes(file).has(node), `${part.node}: its moves name ${node}, which is not in ${relative(root, file)}`);
      }
      // a model that follows the clock: its keyframes in order, its slider from one end to the other
      if (model.sequence) assert.deepEqual(faults(model.sequence), [], `${model.id}: sequence`);
      const parts = model.parts.map((p) => p.node);
      assert.equal(new Set(parts).size, parts.length, 'part nodes repeat');
      const views = model.views.map((v) => v.id);
      assert.equal(new Set(views).size, views.length, 'view ids repeat');
      assert.ok(!views.includes('all'), "'all' is the automatic view");
      if (model.home) assert.ok(model.home === 'all' || views.includes(model.home), `home view ${model.home} does not exist`);
      for (const w of model.with ?? []) {
        assert.ok(w.model !== model.id, 'a model cannot accompany itself');
        assert.ok(
          flight.models.some((m) => m.id === w.model),
          `with: no model ${w.model}`,
        );
      }
      // a figure that can be walked as: its eye level is measured off a node, which has to be there
      if (model.walker?.eyes) assert.ok(allNodes(glb).has(model.walker.eyes), `walker.eyes: no node ${model.walker.eyes} in ${model.url}`);
      for (const node of model.walker?.hide ?? []) assert.ok(allNodes(glb).has(node), `walker.hide: no node ${node} in ${model.url}`);
      for (const c of model.walker?.carries ?? [])
        for (const node of [c.node, c.hose?.mesh, c.hose?.from, c.hose?.to, `Grip.${c.hand}`].filter(Boolean))
          assert.ok(allNodes(glb).has(node), `walker.carries: no node ${node} in ${model.url}`);
      if (model.walker?.forward)
        assert.ok(Math.abs(Math.hypot(...model.walker.forward) - 1) < 1e-6, 'walker.forward must be a unit (x, z)');
      // a place to be taken: boarded from a node that is there, with its own node or a stand-in for it, and what it hides there too
      for (const seat of model.seats ?? []) {
        for (const node of [seat.from, ...(seat.hide ?? [])]) assert.ok(allNodes(glb).has(node), `seats: no node ${node} in ${model.url}`);
        assert.ok(
          allNodes(glb).has(seat.node) || allNodes(glb).has(seat.standIn?.mesh),
          `seats: neither ${seat.node} nor a stand-in in ${model.url}`,
        );
        assert.ok(seat.open[0] < seat.open[1], `seats: ${seat.node} is open for no time`);
      }
      const groups = new Set(flight.specs.map((s) => s.group));
      for (const g of model.specGroups ?? []) assert.ok(groups.has(g), `specGroups: no specs in group ${g}`);
    });
}

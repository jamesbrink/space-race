// Every flight's data against its built models: a renamed node, a missing GLB or a view that
// does not exist would otherwise only show up as a part that silently does nothing.
import assert from 'node:assert/strict';
import { existsSync, globSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
      const groups = new Set(flight.specs.map((s) => s.group));
      for (const g of model.specGroups ?? []) assert.ok(groups.has(g), `specGroups: no specs in group ${g}`);
    });
}

// Each model's and each piece's own thresholds for its levels of detail (src/viewer/lod.ts `thresholdsOf`).
//
//   node tools/lod-thresholds.mjs                 put every <name>.lod.json's thresholds into its GLB's extras
//   node tools/lod-thresholds.mjs --check         say which GLBs do not carry what their .lod.json says (exit 1)
//   node tools/lod-thresholds.mjs --measure [--url http://localhost:5180/] [--flight usa/mercury/mr-3-freedom-7] [--only <regex>]
//                                                 measure them again in a real browser (needs `pnpm dev`), write the
//                                                 .lod.json files, then put them into the GLBs. --only: the things
//                                                 whose `<glb>:<name>` matches (the rest keep what they had)
//
// What is measured. The levels of a thing differ mostly in what is there, not in how round it is: a coarser level
// leaves out a truss's lighter bracing, the room behind a window, wires. So no measure of shape says when the change
// can be seen; the picture does. A thing is drawn at level n and at n+1 from the same eye, frozen, at 1280 x 800, and
// the pixels that differ by more than 30 of 765 (red, green and blue summed) are counted, from two sides, in both
// looks (the worse of the two is kept: a drawn tone flips where a shaded one drifts), at each of `PPMS` pixels a
// metre. Level n is drawn again after n+1 as a control: a frozen stage draws the same frame twice, so the two must
// be the same picture, and all three are taken again if the page was still arriving. Its threshold for that boundary is the largest of those sizes at and under which never more
// than `ALLOWED` pixels differ: there the change is that many pixels fading over 0.6 s (lod.ts `Crossfade`). It is
// never put under the viewer's own (lod.ts `LOD_ABOVE`, which is what the worst things need), nor over the largest
// size measured, which is no larger than the one at which the whole thing is still in the window (lod-measure.mjs
// `whole`: nearer than that the picture is of a part of it, and says nothing of the rest); and the second threshold is kept a size under the first, so that no thing goes from level 0 straight
// to level 2, which is a change that was not measured.
//
// The numbers are kept beside the model's script (`missions/.../model/<name>.lod.json`, with what was measured, so
// that they can be checked) and carried in the GLB: `lod_above` in the scene's extras for a model drawn at one level
// (a vehicle, a pad, a crew), in each top-level node's extras for a place drawn piece by piece. tools/build-model.mjs
// puts them back after a rebuild; tests/lodthresholds.test.mjs fails a GLB that has lost them. After changing what a
// level leaves out, measure again.
import { existsSync, globSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** The viewer's own thresholds: keep in step with LOD_ABOVE in src/viewer/lod.ts (tests/lodthresholds.test.mjs checks). */
export const LOD_ABOVE = [8, 2];
/** Pixels a metre a thing is measured at, largest first. */
export const PPMS = [80, 56, 40, 28, 20, 14, 10, 7, 5, 3.5, 2.5];
/** The pixels (of 1,024,000) that may differ at a change of level: from 0 to 1, from 1 to 2. */
export const ALLOWED = [100, 350];

/** Where a model's thresholds are kept, given its GLB's path under public/models (`usa/mercury/mr-3-freedom-7/pad.glb`). */
export function recordOf(glb) {
  const parts = glb.replace(/\.glb$/, '').split('/');
  const name = parts.pop();
  const at = parts.indexOf('sites');
  const dir = at >= 0 ? parts : [...parts.slice(0, 2), 'flights', ...parts.slice(2)];
  return join(root, 'missions', ...dir, 'model', `${name}.lod.json`);
}

/** Every record there is, with the GLB it is for. */
export function records() {
  return globSync('missions/**/model/*.lod.json', { cwd: root })
    .sort()
    .map((file) => {
      const parts = file.split('/').slice(1); // nation, programme, ('flights', flight | 'sites', site), 'model', name.lod.json
      const name = parts.pop().replace(/\.lod\.json$/, '');
      parts.pop();
      const dir = parts.filter((p, i) => !(p === 'flights' && i === 2));
      return { file: join(root, file), glb: join(root, 'public', 'models', ...dir, `${name}.glb`) };
    });
}

/** The thresholds from what was measured: `rows` are `{ ppm, differ }` for one boundary (`n` to `n + 1`). */
export function thresholdFrom(rows, n) {
  let above = LOD_ABOVE[n];
  for (const { ppm, differ } of [...rows].sort((a, b) => a.ppm - b.ppm)) {
    if (differ > ALLOWED[n]) break;
    above = Math.max(above, ppm);
  }
  return above;
}

/**
 * The two changes kept apart: a thing whose second threshold came out at its first or over would go from level 0
 * straight to level 2, a change nobody measured. The second is brought under the first by a size.
 */
export function apart(above) {
  const out = [...above];
  for (let n = 1; n < out.length; n++)
    if (out[n] >= out[n - 1]) out[n] = Math.max(LOD_ABOVE[n], ...PPMS.filter((p) => p < out[n - 1] && p <= out[n]));
  return out;
}

/** A GLB's JSON, and a way to write it back with the rest untouched. */
function open(path) {
  const file = readFileSync(path);
  if (file.readUInt32LE(0) !== 0x46546c67 || file.readUInt32LE(12 + 4) !== 0x4e4f534a) throw new Error(`${path}: not a GLB`);
  const length = file.readUInt32LE(12);
  const json = JSON.parse(file.subarray(20, 20 + length).toString('utf8'));
  const rest = file.subarray(20 + length);
  return {
    json,
    write() {
      let text = Buffer.from(JSON.stringify(json), 'utf8');
      if (text.length % 4) text = Buffer.concat([text, Buffer.alloc(4 - (text.length % 4), 0x20)]);
      const head = Buffer.alloc(20);
      head.writeUInt32LE(0x46546c67, 0);
      head.writeUInt32LE(2, 4);
      head.writeUInt32LE(20 + text.length + rest.length, 8);
      head.writeUInt32LE(text.length, 12);
      head.writeUInt32LE(0x4e4f534a, 16);
      writeFileSync(path, Buffer.concat([head, text, rest]));
    },
  };
}

/**
 * Put a record's thresholds into its GLB (or with `check`, only look). Returns what does not agree: empty, all is
 * as the record says. `""` in the record is the model as a whole; any other name is a top-level node.
 */
export function carry(record, glb, check = false) {
  const { above } = JSON.parse(readFileSync(record, 'utf8'));
  if (!existsSync(glb)) return [`${relative(root, glb)}: not there`];
  const model = open(glb);
  const scene = model.json.scenes[model.json.scene ?? 0];
  const wrong = [];
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const put = (holder, what, value) => {
    if (same(holder.extras?.lod_above, value)) return;
    wrong.push(
      `${relative(root, glb)}: ${what} carries ${JSON.stringify(holder.extras?.lod_above)}, its record says ${JSON.stringify(value)}`,
    );
    if (value === undefined) delete holder.extras.lod_above;
    else holder.extras = { ...holder.extras, lod_above: value };
  };
  put(scene, 'the model', above['']);
  const named = new Set();
  for (const i of scene.nodes) {
    const node = model.json.nodes[i];
    named.add(node.name);
    put(node, node.name, above[node.name]);
    // (a piece may be a child of a top-level node whose children stand apart: lod.ts `Staged.split`)
    for (const c of node.children ?? []) {
      const child = model.json.nodes[c];
      if (!child.name || named.has(child.name)) continue;
      if (above[child.name] === undefined && child.extras?.lod_above === undefined) continue;
      named.add(child.name);
      put(child, child.name, above[child.name]);
    }
  }
  for (const name of Object.keys(above))
    if (name && !named.has(name)) wrong.push(`${relative(root, record)}: ${name} is not a node of the model`);
  if (!check && wrong.length) model.write();
  return wrong;
}

/** As a command. (Not awaited where the module is read: the measuring reads this module in its turn.) */
async function main(args) {
  if (args.includes('--measure')) {
    const { measure } = await import('./lod-measure.mjs');
    const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
    await measure({ url: option('--url') ?? 'http://localhost:5180/', flight: option('--flight'), only: option('--only') });
  }
  const check = args.includes('--check');
  let wrong = 0;
  for (const { file, glb } of records()) {
    const found = carry(file, glb, check);
    for (const line of found) console.log(check ? line : `put right: ${line}`);
    if (check || found.some((l) => l.includes('is not a node') || l.includes('not there'))) wrong += found.length;
  }
  if (wrong) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));

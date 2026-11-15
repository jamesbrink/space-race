// Runs a flight's Blender scripts headless: each model/<name>.py becomes
// public/models/<nation>/<programme>/<flight>/<name>.glb. A place's own models are built the same
// way from missions/<nation>/places/<place>/<package>/model/<name>.py, to public/models/<nation>/places/<place>/<package>/.
//   node tools/build-model.mjs                                  lists the targets
//   node tools/build-model.mjs mr-3 [--only pad] [--preview <dir>]
//   node tools/build-model.mjs lc-5 [--only 1961-05]
//   node tools/build-model.mjs --all
// A target is named by its id (usa/mercury/mr-3-freedom-7, usa/places/cape-canaveral/lc5), its path under missions/
// (usa/mercury/flights/mr-3-freedom-7), its folder's name (mr-3-freedom-7, lc5), or the start of that name
// before a dash (mr-3), dashes optional (lc-5, site-1). `pnpm model <target>` runs this.
//   node tools/build-model.mjs --all --detail 0.3 --out-dir <dir>    a lower level of detail, written elsewhere
// Blender is found at $BLENDER, on PATH, or in /Applications (macOS).
import { spawnSync } from 'node:child_process';
import { existsSync, globSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
/** The coarser levels built beside each model: `<name>.lod1.glb`, `<name>.lod2.glb`. Keep in step with LOD_ABOVE in src/viewer/lod.ts and tools/lod-thresholds.mjs. */
const LODS = [0.6, 0.3];
const blender = process.env.BLENDER ?? ['/Applications/Blender.app/Contents/MacOS/Blender'].find(existsSync) ?? 'blender';

/** Every <nation>/<program>/<flight> that has a model/ directory. */
function allFlights() {
  const out = [];
  const dirs = (p) =>
    readdirSync(p, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  for (const nation of dirs(join(root, 'missions')))
    for (const program of dirs(join(root, 'missions', nation))) {
      // a place's own models: what stood there, as of a date, shared by every flight from it
      if (program === 'places') {
        for (const place of dirs(join(root, 'missions', nation, 'places')))
          for (const pkg of dirs(join(root, 'missions', nation, 'places', place)))
            if (existsSync(join(root, 'missions', nation, 'places', place, pkg, 'model'))) out.push(`${nation}/places/${place}/${pkg}`);
        continue;
      }
      const flights = join(root, 'missions', nation, program, 'flights');
      if (!existsSync(flights)) continue;
      for (const flight of dirs(flights)) if (existsSync(join(flights, flight, 'model'))) out.push(`${nation}/${program}/${flight}`);
    }
  return out;
}

const args = process.argv.slice(2);
/** Remove `--name value` from the arguments and return the value. */
function option(name) {
  const at = args.indexOf(name);
  return at >= 0 ? args.splice(at, 2)[1] : null;
}
const preview = option('--preview');
const detail = option('--detail');
const outDir = option('--out-dir');
const only = option('--only');
if (detail && !outDir) {
  console.error('--detail needs --out-dir: the committed GLBs are the full-detail ones');
  process.exit(2);
}
if (!args.length) {
  console.log('usage: build-model.mjs <target> ... | --all   [--only <name>] [--preview <dir>] [--detail <0..1> --out-dir <dir>]');
  console.log(`targets:\n  ${allFlights().join('\n  ')}`);
  process.exit(0);
}

/** The target a name given on the command line means: see the header. */
function resolveTarget(name) {
  const all = allFlights();
  const id = name
    .replace(/^missions\//, '')
    .replace(/\/flights\//, '/')
    .replace(/\/$/, '');
  if (all.includes(id)) return id;
  const bare = (s) => s.replaceAll('-', '');
  const leaf = (t) => t.split('/').at(-1);
  for (const match of [(t) => leaf(t) === id, (t) => leaf(t).startsWith(`${id}-`), (t) => bare(leaf(t)) === bare(id)]) {
    const found = all.filter(match);
    if (found.length === 1) return found[0];
    if (found.length > 1) {
      console.error(`${name} could be any of: ${found.join(', ')}`);
      process.exit(2);
    }
  }
  console.error(`no target ${name}; the targets are:\n  ${all.join('\n  ')}`);
  process.exit(2);
}

const targets = args.includes('--all') ? allFlights() : args.map(resolveTarget);

/**
 * Every string in every flight's data. A build joins static meshes that share a material
 * (srlib.merge_static), but never one the viewer finds by name, and the names it looks for are
 * the ones the flights give it (a move's node, a function's, a seat's, a walker's eyes, a hose).
 * The data is evaluated, not searched, so a name put together in code is there too; a site's
 * models get every flight's names, since any flight may stand on it.
 */
async function namedByFlights() {
  const strings = new Set();
  const seen = new Set();
  const walk = (value) => {
    if (typeof value === 'string') strings.add(value);
    else if (value && typeof value === 'object' && !seen.has(value)) {
      seen.add(value);
      for (const inner of Object.values(value)) walk(inner);
    }
  };
  for (const file of globSync('missions/*/*/flights/*/flight.ts', { cwd: root })) walk(await import(pathToFileURL(join(root, file)).href));
  return [...strings].sort();
}
const scratch = mkdtempSync(join(tmpdir(), 'space-race-models-'));
const named = join(scratch, 'named.json');
writeFileSync(named, JSON.stringify(await namedByFlights()));
process.on('exit', () => rmSync(scratch, { recursive: true, force: true }));

for (const id of targets) {
  // A flight is <nation>/<programme>/<flight>; a place's package is <nation>/places/<place>/<package>. Either
  // has a model/ directory of scripts, and its GLBs go to the same path under public/models/.
  const parts = id.split('/');
  const place = parts[1] === 'places';
  const [nation, program] = parts;
  const flight = place ? join(parts[2], parts[3]) : parts[2];
  const dir = place
    ? join(root, 'missions', nation, 'places', parts[2], parts[3], 'model')
    : join(root, 'missions', nation, program, 'flights', parts[2], 'model');
  const scripts = readdirSync(dir)
    .filter((f) => f.endsWith('.py') && (!only || f === `${only}.py`))
    .sort();
  if (!scripts.length) {
    console.error(`no model scripts in ${dir}${only ? ` named ${only}.py` : ''}`);
    process.exit(2);
  }
  for (const file of scripts) {
    // The inventory's model, then the same script at each coarser level of detail, which the
    // viewer shows from further off (src/viewer/lod.ts). `--detail` builds one level elsewhere.
    const levels = detail
      ? [{ detail, suffix: '' }]
      : [{ detail: null, suffix: '' }, ...LODS.map((d, n) => ({ detail: String(d), suffix: `.lod${n + 1}` }))];
    for (const level of levels) {
      const out = join(outDir ?? join(root, 'public', 'models'), nation, program, flight, file.replace(/\.py$/, `${level.suffix}.glb`));
      const extra = [...(preview && !level.suffix ? ['--preview', preview] : []), ...(level.detail ? ['--detail', level.detail] : [])];
      // --factory-startup: no user preferences or add-ons, so the same script gives the same model anywhere
      const r = spawnSync(
        blender,
        ['-b', '--factory-startup', '--python-exit-code', '1', '-P', join(dir, file), '--', '--out', out, '--named', named, ...extra],
        { encoding: 'utf8' },
      );
      const lines = (r.stdout + r.stderr).split('\n');
      if (r.status !== 0) {
        const at = lines.findIndex((l) => l.includes('CLEARANCE FAILED') || l.includes('MERGE FAILED'));
        if (level.detail) console.error(`at --detail ${level.detail}:`);
        console.error((at >= 0 ? lines.slice(at, at + 60) : lines.slice(-30)).join('\n'));
        process.exit(r.status ?? 1);
      }
      console.log(lines.filter((l) => l.includes(' triangles')).join('\n') || `built ${id}/${file}`);
    }
  }
}

// A model built again has lost the thresholds its levels of detail are chosen by: put back from its record
// (tools/lod-thresholds.mjs). If what a level leaves out has changed, measure them again (`--measure` there).
if (!outDir) {
  const { carry, records } = await import('./lod-thresholds.mjs');
  for (const { file, glb } of records()) for (const line of carry(file, glb)) console.log(`levels of detail: put right: ${line}`);
}

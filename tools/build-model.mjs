// Runs a flight's Blender scripts headless: each model/<name>.py becomes
// public/models/<nation>/<programme>/<flight>/<name>.glb. A place's own models are built the same
// way from missions/<nation>/<programme>/sites/<site>/model/<name>.py.
//   node tools/build-model.mjs usa/mercury/mr-3-freedom-7 [--only pad] [--preview <dir>]
//   node tools/build-model.mjs usa/mercury/sites/lc5 [--only 1961-05]
//   node tools/build-model.mjs --all
//   node tools/build-model.mjs --all --detail 0.3 --out-dir <dir>    a lower level of detail, written elsewhere
// Blender is found at $BLENDER, on PATH, or in /Applications (macOS).
import { spawnSync } from 'node:child_process';
import { existsSync, globSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
/** The coarser levels built beside each model: `<name>.lod1.glb`, `<name>.lod2.glb`. Keep in step with LOD_ABOVE in src/viewer/lod.ts. */
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
      const flights = join(root, 'missions', nation, program, 'flights');
      if (!existsSync(flights)) continue;
      for (const flight of dirs(flights)) if (existsSync(join(flights, flight, 'model'))) out.push(`${nation}/${program}/${flight}`);
      // a place's own models: what stood there, as of a date, shared by every flight from it
      const sites = join(root, 'missions', nation, program, 'sites');
      if (existsSync(sites))
        for (const site of dirs(sites)) if (existsSync(join(sites, site, 'model'))) out.push(`${nation}/${program}/sites/${site}`);
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
  console.error(
    'usage: build-model.mjs <nation>/<program>/<flight> | --all   [--only <name>] [--preview <dir>] [--detail <0..1> --out-dir <dir>]',
  );
  process.exit(2);
}

const targets = args.includes('--all') ? allFlights() : args;

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
  // A flight is <nation>/<programme>/<flight>; a place is <nation>/<programme>/sites/<site>. Either
  // has a model/ directory of scripts, and its GLBs go to the same path under public/models/.
  const parts = id.split('/');
  const site = parts[2] === 'sites';
  const [nation, program] = parts;
  const flight = site ? join('sites', parts[3]) : parts[2];
  const dir = site
    ? join(root, 'missions', nation, program, 'sites', parts[3], 'model')
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

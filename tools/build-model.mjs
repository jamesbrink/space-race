// Runs a flight's Blender scripts headless: each model/<name>.py becomes
// public/models/<nation>/<programme>/<flight>/<name>.glb.
//   node tools/build-model.mjs usa/mercury/mr-3-freedom-7 [--only pad] [--preview <dir>]
//   node tools/build-model.mjs --all
//   node tools/build-model.mjs --all --detail 0.3 --out-dir <dir>    a lower level of detail, written elsewhere
// Blender is found at $BLENDER, on PATH, or in /Applications (macOS).
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

for (const id of targets) {
  const [nation, program, flight] = id.split('/');
  const dir = join(root, 'missions', nation, program, 'flights', flight, 'model');
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
        ['-b', '--factory-startup', '--python-exit-code', '1', '-P', join(dir, file), '--', '--out', out, ...extra],
        { encoding: 'utf8' },
      );
      const lines = (r.stdout + r.stderr).split('\n');
      if (r.status !== 0) {
        const at = lines.findIndex((l) => l.includes('CLEARANCE FAILED'));
        if (level.detail) console.error(`at --detail ${level.detail}:`);
        console.error((at >= 0 ? lines.slice(at, at + 60) : lines.slice(-30)).join('\n'));
        process.exit(r.status ?? 1);
      }
      console.log(lines.filter((l) => l.includes(' triangles')).join('\n') || `built ${id}/${file}`);
    }
  }
}

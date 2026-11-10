// Runs a flight's Blender scripts headless: each model/<name>.py becomes
// public/models/<nation>/<programme>/<flight>/<name>.glb.
//   node tools/build-model.mjs usa/mercury/mr-3-freedom-7 [--only pad] [--preview <dir>]
//   node tools/build-model.mjs --all
// Blender is found at $BLENDER, on PATH, or in /Applications (macOS).
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const blender =
  process.env.BLENDER ??
  ['/Applications/Blender.app/Contents/MacOS/Blender'].find(existsSync) ??
  'blender';

/** Every <nation>/<program>/<flight> that has a model/ directory. */
function allFlights() {
  const out = [];
  const dirs = (p) => readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  for (const nation of dirs(join(root, 'missions')))
    for (const program of dirs(join(root, 'missions', nation))) {
      const flights = join(root, 'missions', nation, program, 'flights');
      if (!existsSync(flights)) continue;
      for (const flight of dirs(flights))
        if (existsSync(join(flights, flight, 'model'))) out.push(`${nation}/${program}/${flight}`);
    }
  return out;
}

const args = process.argv.slice(2);
const previewAt = args.indexOf('--preview');
const preview = previewAt >= 0 ? args.splice(previewAt, 2)[1] : null;
if (!args.length) {
  console.error('usage: build-model.mjs <nation>/<program>/<flight> | --all   [--only <name>] [--preview <dir>]');
  process.exit(2);
}

const onlyAt = args.indexOf('--only');
const only = onlyAt >= 0 ? args.splice(onlyAt, 2)[1] : null;
const targets = args.includes('--all') ? allFlights() : args;

for (const id of targets) {
  const [nation, program, flight] = id.split('/');
  const dir = join(root, 'missions', nation, program, 'flights', flight, 'model');
  const scripts = readdirSync(dir).filter((f) => f.endsWith('.py') && (!only || f === `${only}.py`)).sort();
  if (!scripts.length) {
    console.error(`no model scripts in ${dir}${only ? ` named ${only}.py` : ''}`);
    process.exit(2);
  }
  for (const file of scripts) {
    const out = join(root, 'public', 'models', nation, program, flight, file.replace(/\.py$/, '.glb'));
    const extra = preview ? ['--preview', preview] : [];
    const r = spawnSync(blender, ['-b', '--python-exit-code', '1', '-P', join(dir, file), '--', '--out', out, ...extra], {
      encoding: 'utf8',
    });
    const lines = (r.stdout + r.stderr).split('\n');
    if (r.status !== 0) {
      const at = lines.findIndex((l) => l.includes('CLEARANCE FAILED'));
      console.error((at >= 0 ? lines.slice(at, at + 60) : lines.slice(-30)).join('\n'));
      process.exit(r.status ?? 1);
    }
    console.log(lines.filter((l) => l.includes(' triangles')).join('\n') || `built ${id}/${file}`);
  }
}

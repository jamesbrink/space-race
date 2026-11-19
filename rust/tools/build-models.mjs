// Rebuild the native sources in series. The ordinary model command still owns the exporter,
// clearance check, named nodes and destination layout for flights and dated places alike.
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const cwd = resolve(import.meta.dirname, '../..');
const models = [
  ['mr-3', 'vehicle'],
  ['mr-3', 'pad'],
  ['lc-5', '1961-05'],
  ['complexes', '1961-05'],
];
for (const [target, name] of models) {
  const result = spawnSync(
    process.execPath,
    ['tools/build-model.mjs', target, '--only', name, '--detail', '2', '--out-dir', 'rust/models'],
    {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, SR_NATIVE_SURFACES: '1' },
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

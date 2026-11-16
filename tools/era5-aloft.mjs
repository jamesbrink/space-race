// Bakes the air over each flight's site at the hour nearest its liftoff from ECMWF's ERA5, into an `aloft.ts` beside the
// flight's weather.ts, which hands it on (types.ts: `DayWeather.aloft`, `DayWeather.hours`; src/world/aloft.ts reads it):
//   node tools/era5-aloft.mjs [--cache <dir>] [<flight id> ...]
//
// The column: the ground (ERA5's surface pressure, the geopotential of its ground, the temperature at 2 m and the wind
// at 10 m) and every one of its 37 pressure levels above it, 1000 to 1 hPa (about 48 km): temperature, geopotential and
// the wind's east and north parts, each between the four quarter-degree cells round the pad. Heights are geometric:
// geopotential over standard gravity (ERA5's own geopotential height), then the 1976 standard's rule to geometric.
// The hours: the surface's figures from six hours before the liftoff's hour to six after.
//
// Read from the public ARCO-ERA5 copy (tools/era5.mjs: by range, only the blocks round the pad: some 40 MB a flight,
// cached in ~/.cache/space-race/era5). A reanalysis is a weather model run again over the observations there were: for
// 1961, the surface and balloon network and no satellite. So every figure is `derived`, and a flight whose record has
// its own sounding puts that in its weather.ts in its place.
import { execFileSync } from 'node:child_process';
import { existsSync, globSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fieldAt, hourOf, pressureLevels } from './era5.mjs';
import { geometric } from '../src/world/aloft.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const at = args.indexOf('--cache');
const cache = at >= 0 ? args[at + 1] : join(homedir(), '.cache/space-race/era5');
const asked = args.filter((a, i) => !a.startsWith('--') && (at < 0 || i !== at + 1));
mkdirSync(cache, { recursive: true });
const G = 9.80665;
const SOURCE =
  'ECMWF ERA5 hourly data on pressure levels and single levels (Hersbach et al. 2020, doi:10.24381/cds.bd0915c6 and ' +
  'doi:10.24381/cds.adbb2d47), from the ARCO-ERA5 copy (Carver and Merose 2023), between the four quarter-degree cells round ' +
  'the pad (tools/era5-aloft.mjs); contains modified Copernicus Climate Change Service information';

const flights = globSync('missions/*/*/flights/*/weather.ts', { cwd: root })
  .map((w) => dirname(w))
  .filter((dir) => !asked.length || asked.some((id) => dir.endsWith(id)));
const levels = await pressureLevels(cache);
const round = (x, d) => Number(x.toFixed(d));

for (const dir of flights) {
  // (the flight's weather.ts hands this file on: a first bake has none to import yet, so an empty one stands in until it is written)
  if (!existsSync(join(root, dir, 'aloft.ts')))
    writeFileSync(join(root, dir, 'aloft.ts'), 'export const ALOFT = undefined;\nexport const HOURS = undefined;\n');
  const { flight } = await import(pathToFileURL(join(root, dir, 'flight.ts')).href);
  if (!flight.site) continue;
  const [lat, lon] = [flight.site.latitude.value, flight.site.longitude.value];
  const { hour, at: when } = hourOf(flight.launch);
  const one = (name, h = hour) => fieldAt(cache, name, h, lat, lon);
  const many = (name) => fieldAt(cache, name, hour, lat, lon, levels.length);
  const [t, z, u, v] = await Promise.all(['temperature', 'geopotential', 'u_component_of_wind', 'v_component_of_wind'].map(many));
  const [ps, zs, t2, u10, v10] = await Promise.all(
    ['surface_pressure', 'geopotential_at_surface', '2m_temperature', '10m_u_component_of_wind', '10m_v_component_of_wind'].map((n) =>
      one(n),
    ),
  );
  const ground = geometric(zs / G);
  const rows = [[round(ps / 100, 2), round(ground, 1), round(t2, 2), round(u10, 2), round(v10, 2)]];
  levels.forEach((p, k) => {
    const h = geometric(z[k] / G);
    if (p * 100 < ps && h > ground) rows.push([p, round(h, 1), round(t[k], 2), round(u[k], 2), round(v[k], 2)]);
  });
  const hours = [];
  for (let d = -6; d <= 6; d++) {
    const [a, b, c, e] = await Promise.all(
      ['10m_u_component_of_wind', '10m_v_component_of_wind', '2m_temperature', 'surface_pressure'].map((n) => one(n, hour + d)),
    );
    const iso = new Date(Date.UTC(1900, 0, 1) + (hour + d) * 3_600_000).toISOString().replace('.000', '');
    hours.push([iso, round(a, 2), round(b, 2), round(c, 2), round(e, 0)]);
  }
  const back = relative(join(root, dir), join(root, 'src/world/aloft.ts')).replaceAll('\\', '/');
  const file = join(root, dir, 'aloft.ts');
  writeFileSync(
    file,
    `/**
 * The air over ${flight.site.name} at ${when}, the hour nearest ${flight.callsign ?? flight.designation}'s liftoff,
 * and the surface's hours round it:
 * ERA5's, between the four quarter-degree cells round the pad. Written by tools/era5-aloft.mjs (\`pnpm era5:aloft\`): do
 * not edit by hand. Each row of the column: pressure (hPa), height (m above the sea), temperature (K), wind east and north
 * (m/s), the ground's first; of the hours: the hour, the wind east and north at 10 m, the temperature at 2 m, the
 * pressure at the ground (Pa).
 */
import { aloftFrom, hoursFrom } from '${back}';

const SOURCE = ${JSON.stringify(SOURCE)};

export const ALOFT = aloftFrom(
  { where: ${JSON.stringify(`ERA5 over ${flight.site.name} (${lat.toFixed(3)}, ${lon.toFixed(3)})`)}, at: '${when}', source: SOURCE },
  ${JSON.stringify(rows)},
  'derived',
  SOURCE,
);

export const HOURS = hoursFrom(${JSON.stringify(hours)}, 'derived', SOURCE);
`,
  );
  execFileSync(join(root, 'node_modules/.bin/biome'), ['format', '--write', file], { stdio: 'ignore' });
  console.log(`${dir}/aloft.ts: ${rows.length} levels to ${Math.max(...rows.map((r) => r[1]))} m, ${hours.length} hours, at ${when}`);
}

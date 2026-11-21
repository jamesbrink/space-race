// node tools/lunar-sites.mjs: write src/world/lunar-sites.json from the landing sites' own modules
// (missions/usa/places/moon/*.ts), which are the one place their figures live. The terrain's baker
// (tools/lunar-terrain.py, Python) and the viewer read the JSON; tests/lunar-sites.test.mjs fails when it is stale.
import { readFileSync, writeFileSync } from 'node:fs';
import { LUNAR_BAKE, LUNAR_SITES } from '../missions/usa/places/moon/sites.ts';

export const PATH = new URL('../src/world/lunar-sites.json', import.meta.url);

/** The JSON's text, as it should be. */
export function lunarSitesJson() {
  const sites = Object.fromEntries(
    LUNAR_SITES.map((s) => [
      s.id,
      {
        name: s.site.name,
        landing: [s.site.latitude.value, s.site.longitude.value],
        height: s.site.height.value,
        approach: s.approach.value,
        centre: s.centre.value,
        stereo: s.stereo,
        rest: { heading: s.rest.heading.value, pitch: s.rest.pitch.value, roll: s.rest.roll.value },
      },
    ]),
  );
  const about = 'Written by tools/lunar-sites.mjs from missions/usa/places/moon/*.ts, where each figure has its source: do not edit.';
  return `${JSON.stringify({ about, ...LUNAR_BAKE, sites }, null, 2)}\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const text = lunarSitesJson();
  const was = (() => {
    try {
      return readFileSync(PATH, 'utf8');
    } catch {
      return '';
    }
  })();
  writeFileSync(PATH, text);
  console.log(was === text ? 'src/world/lunar-sites.json: unchanged' : 'src/world/lunar-sites.json: written');
}

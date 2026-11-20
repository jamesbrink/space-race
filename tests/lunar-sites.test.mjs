// The Apollo landing sites (missions/usa/places/moon/): the JSON the baker and the viewer read is what the sites' modules
// say, every figure says how sure it is, and the ground baked for each (tools/lunar-terrain.py) stands where LROC and LOLA put
// it: the stereo's ground under the LM (SiteDef.height) against SLDEM2015's (LOLA's heights, placed by SELENE's stereo).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { LUNAR_SITES } from '../missions/usa/places/moon/sites.ts';
import { DescentStrip, LandingGround } from '../src/world/lunar-ground.ts';
import { LunarTerrain, ROVER_SITES, LUNAR_SITES as SITES_JSON } from '../src/world/lunar-terrain.ts';
import { lunarSitesJson } from '../tools/lunar-sites.mjs';

const buffer = (path) => {
  const file = readFileSync(path);
  return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
};
const R = 1_737_400;
/** Metres between the stereo's ground under an LM and SLDEM2015's there: SLDEM2015 is good to a few metres, and a 250 m cell averages the relief round the LM (measured: 0.4 to 3.7 m). */
const TOLERANCE = 8;
const DEG = Math.PI / 180;
/** The place `metres» from a latitude and longitude on `bearing» (degrees true), on the sphere. */
function from([latitude, longitude], bearing, metres) {
  const [p, l, a, d] = [latitude * DEG, longitude * DEG, bearing * DEG, metres / R];
  const q = Math.asin(Math.sin(p) * Math.cos(d) + Math.cos(p) * Math.sin(d) * Math.cos(a));
  return [q / DEG, (l + Math.atan2(Math.sin(a) * Math.sin(d) * Math.cos(p), Math.cos(d) - Math.sin(p) * Math.sin(q))) / DEG];
}

test('src/world/lunar-sites.json is what the sites’ modules say (node tools/lunar-sites.mjs writes it)', () => {
  assert.deepEqual(JSON.parse(readFileSync('src/world/lunar-sites.json', 'utf8')), JSON.parse(lunarSitesJson()));
});

test('every rover’s site is its landing site’s position and name', () => {
  for (const [id, rover] of Object.entries(ROVER_SITES)) {
    assert.deepEqual(rover.landing, SITES_JSON[id].landing, id);
    assert.equal(rover.label, SITES_JSON[id].name, id);
  }
});

for (const lunar of LUNAR_SITES) {
  const { id, site } = lunar;

  test(`${id} stands on the Moon, each figure with its confidence and source`, () => {
    assert.equal(site.body, 'moon');
    assert.equal(site.place.name, 'moon');
    assert.deepEqual(site.zone, { name: 'UTC', utcOffset: 0 });
    for (const [name, m] of Object.entries({ ...site, centre: lunar.centre, approach: lunar.approach })) {
      if (!m || typeof m !== 'object' || !('value' in m)) continue;
      assert.ok(Number.isFinite(m.value), `${id} ${name}`);
      assert.ok(['documented', 'assumed', 'derived', 'estimated'].includes(m.confidence), `${id} ${name}`);
      assert.ok(m.source.length > 20, `${id} ${name}: its source`);
    }
    for (const m of [site.latitude, site.longitude]) {
      assert.equal(m.confidence, 'documented');
      assert.match(m.source, /Wagner/);
      assert.match(m.source, /mean Earth\/polar axis/);
    }
    assert.equal(site.seaLevel.value, 0);
    assert.equal(site.bearingX.value, 90);
  });

  test(`${id}: the ground under the LM, the stereo’s against SLDEM2015’s, and the grids and the strip as one`, () => {
    const terrain = new LunarTerrain(buffer(`public/lunar/${id}.terrain.bin`));
    const strip = new DescentStrip(buffer(`public/lunar/${id}.descent.bin`));
    const landing = [site.latitude.value, site.longitude.value];
    assert.deepEqual([strip.latitude, strip.longitude, strip.approach], [...landing, lunar.approach.value]);
    assert.equal(terrain.height(0, 0), 0);
    // The four pads stand on one plane under the LM (the bake's support plane), so opposite pads balance.
    const lm = -lunar.centre.value;
    const pads = [
      [lm - 4.4, 0],
      [lm + 4.4, 0],
      [lm, 4.4],
      [lm, -4.4],
    ].map(([x, z]) => terrain.height(x, z));
    assert.ok(Math.abs(pads[0] + pads[1] - pads[2] - pads[3]) < 0.02);

    // The stereo's ground under the LM against the altimeter's (SLDEM2015, averaged over 250 m): the NAC models are tied to
    // LOLA, so they agree to the relief inside a cell. TOLERANCE is that, with room.
    const lola = strip.height(...landing);
    assert.ok(Math.abs(lola - site.height.value) < TOLERANCE, `${id}: stereo ${site.height.value} m, SLDEM2015 ${lola.toFixed(1)} m`);

    // The strip covers the descent from where it began: 520 km back along the track, 40 km past the LM, 30 km either side.
    for (const [bearing, metres] of [
      [lunar.approach.value + 180, 515_000],
      [lunar.approach.value + 90, 29_000],
      [lunar.approach.value - 90, 29_000],
      [lunar.approach.value, 39_000],
    ]) {
      assert.ok(strip.covers(...from(landing, bearing, metres)), `${id}: ${metres} m on ${bearing}`);
    }
    assert.ok(!strip.covers(...from(landing, lunar.approach.value + 90, 40_000)));

    const ground = new LandingGround({ landing, height: site.height.value, centre: lunar.centre.value }, terrain, strip);
    assert.ok(Math.abs(ground.height(...landing) - site.height.value) < 0.02);
    // Out of the grids and into the strip with no step, where a descent comes in or overshoots (within 30 degrees of the
    // track, either way): 50 m apart, the ground moves no more than the two it is made of do, and the share of their
    // difference the 4 km fade hands on in 50 m.
    let worst = 0;
    for (const bearing of [-30, -15, 0, 15, 30].flatMap((d) => [lunar.approach.value + d, lunar.approach.value + 180 + d])) {
      const sample = (m) => {
        const p = from(landing, bearing, m);
        return { covered: ground.covers(...p), h: ground.height(...p), s: strip.height(...p), g: ground.grids(...p)?.h ?? null };
      };
      let last = sample(26_000);
      for (let m = 26_050; m <= 36_000; m += 50) {
        const now = sample(m);
        if (last.covered && now.covered) {
          const gap = Math.max(...[last, now].filter((x) => x.g !== null).map((x) => Math.abs(x.g - x.s)), 0);
          const bound =
            Math.abs(now.s - last.s) + (last.g !== null && now.g !== null ? Math.abs(now.g - last.g) : 0) + (2 * 50 * gap) / 4096 + 0.5;
          worst = Math.max(worst, Math.abs(now.h - last.h) - bound);
        }
        last = now;
      }
    }
    assert.ok(worst <= 0, `${id}: a step ${worst.toFixed(1)} m more than the ground it is made of where the grids give way to the strip`);
  });
}

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { cloudCutAt } from '../src/viewer/air.ts';
import { breeze, dayOf, deckPatches, reportReach, veilShade } from '../src/viewer/day.ts';
import {
  believed,
  coverNear,
  deckCutAt,
  deckPatchGlsl,
  deckTex,
  heldDistance,
  highOf,
  landShare,
  MOST,
  mapDayOf,
  NEAR,
  sheetsGlsl,
  toScene,
  weatherAt,
  weatherGlsl,
} from '../src/viewer/weather.ts';
import { ecefToSite, geodeticToEcef, siteFrame } from '../src/world/frames.ts';

const sea = { shore: -40, height: -3000 };
const land = { shore: 40, height: 20 };

test('at the site the cumulus cover is the record’s, whatever the map says; away from it, the map’s', () => {
  assert.equal(coverNear(0.1, 0.6, 0), 0.1);
  assert.equal(coverNear(0.1, 0.6, NEAR[0]), 0.1);
  assert.equal(coverNear(0.1, 0.6, NEAR[1]), 0.6);
  assert.equal(coverNear(0.1, 0.6, 500_000), 0.6);
  let last = 0;
  for (let d = 0; d <= NEAR[1]; d += 500) {
    assert.ok(believed(d) >= last, 'the map comes in one way');
    last = believed(d);
  }
});

test('the weather is cloud cover: fractions of the sky, everywhere in the map', () => {
  for (let e = -2_000_000; e <= 2_000_000; e += 137_000)
    for (let n = -2_000_000; n <= 2_000_000; n += 149_000)
      for (const place of [sea, land, { shore: 0, height: 0 }, { shore: 30, height: 2500 }]) {
        const w = weatherAt(e, n, place);
        for (const v of [w.cumulus, w.cirrus, w.deck]) assert.ok(v >= 0 && v <= 1 && Number.isFinite(v));
        assert.ok(w.cumulus <= MOST);
      }
});

test('the sea beside a shore and a lake are clearer than the open sea; high ground has more cumulus than low', () => {
  let beside = 0,
    open = 0,
    low = 0,
    high = 0;
  for (let i = 0; i < 400; i++) {
    const e = -300_000 + 2311 * i,
      n = 250_000 - 1787 * i;
    beside += weatherAt(e, n, { shore: -6, height: -10 }).cumulus;
    open += weatherAt(e, n, sea).cumulus;
    low += weatherAt(e, n, land).cumulus;
    high += weatherAt(e, n, { shore: 40, height: 1200 }).cumulus;
  }
  assert.ok(beside < 0.45 * open, `beside a shore ${beside / 400}, open sea ${open / 400}`);
  assert.ok(high > 1.5 * low, `high ground ${high / 400}, low ${low / 400}`);
  // the morning is fair: on the whole a fifth of the sky or less over low land and open sea
  assert.ok(open / 400 < 0.25 && low / 400 < 0.3);
});

test('the field cut for a cover covers that much, and more cover is a lower cut', () => {
  let last = Infinity;
  for (const cover of [0.02, 0.1, 0.25, 0.5, 0.85]) {
    const cut = cloudCutAt(cover);
    assert.ok(cut < last);
    last = cut;
  }
});

test('the middle deck cut for an eighth covers an eighth', () => {
  const cut = deckCutAt(0.125);
  let over = 0,
    all = 0;
  for (let i = 0; i < 260; i++)
    for (let j = 0; j < 260; j++) {
      all++;
      if (deckTex(i * 211.3 + 40_000, j * 197.9 - 90_000) > cut) over++;
    }
  assert.ok(Math.abs(over / all - 0.125) < 0.03, `${over / all}`);
});

test('east and north of the site in the scene’s frame: +X on the site’s bearing, +Z a quarter turn clockwise', () => {
  const b = (295 * Math.PI) / 180;
  // a point on the bearing is on +X; one a quarter turn clockwise of it is on +Z
  const [x, z] = toScene(Math.sin(b), Math.cos(b), b);
  assert.ok(Math.abs(x - 1) < 1e-12 && Math.abs(z) < 1e-12);
  const [x2, z2] = toScene(Math.sin(b + Math.PI / 2), Math.cos(b + Math.PI / 2), b);
  assert.ok(Math.abs(x2) < 1e-12 && Math.abs(z2 - 1) < 1e-12);
});

test('the map’s land is all of the land a few kilometres in from a shore, none of the water, and runs one way between', () => {
  assert.equal(landShare({ shore: 40, height: 20 }), 1);
  assert.equal(landShare({ shore: -40, height: -3000 }), 0);
  assert.equal(landShare({ shore: -3, height: 0 }), 0);
  let last = 0;
  for (let shore = -5; shore <= 10; shore += 0.25) {
    const share = landShare({ shore, height: 0 });
    assert.ok(share >= last && share >= 0 && share <= 1);
    last = share;
  }
});

// ---- a day's weather: the flight's record, and what is drawn from it (types.ts: DayWeather; viewer/day.ts) ----

const flightsDir = new URL('../missions/', import.meta.url);
const load = async (path) => (await import(new URL(path, flightsDir).href)).flight;
const mr3 = await load('usa/mercury/flights/mr-3-freedom-7/flight.ts');
const mr4 = await load('usa/mercury/flights/mr-4-liberty-bell-7/flight.ts');
const vostok1 = await load('ussr/vostok/flights/vostok-1/flight.ts');
const CONFIDENCE = ['documented', 'derived', 'estimated'];
const RAD = Math.PI / 180;

/** Every Measure in a record, with where it is. */
function* measures(v, path = 'weather') {
  if (!v || typeof v !== 'object') return;
  if (typeof v.value === 'number' && 'confidence' in v) yield [path, v];
  else for (const [k, each] of Object.entries(v)) yield* measures(each, `${path}.${k}`);
}

test('every figure of a flight’s weather, and of a site’s default sky, carries a confidence and a source; a default is all estimate', () => {
  for (const f of [mr3, mr4, vostok1]) {
    assert.ok(f.weather, `${f.id} has its day's weather`);
    let n = 0;
    for (const [path, m] of measures(f.weather)) {
      n++;
      assert.ok(CONFIDENCE.includes(m.confidence), `${f.id} ${path}: ${m.confidence}`);
      assert.ok(m.source.length > 12, `${f.id} ${path}: a source`);
      // a documented figure names where it is documented: a station, or a report and a page
      if (m.confidence === 'documented')
        assert.match(m.source, /station \d|p\. \d|the same observation|the one area/, `${f.id} ${path}: ${m.source}`);
    }
    assert.ok(n >= 5, `${f.id}: ${n} figures`);
    assert.ok(!Number.isNaN(Date.parse(f.weather.observed.at)), `${f.id}: observed at an hour`);
    for (const b of f.weather.beyond ?? []) assert.ok(b.south < b.north && b.west < b.east && b.source.length > 12 && b.what.length > 12);
    // and a site's own default, for a flight with none: an estimate, every figure of it
    for (const [path, m] of measures(f.site.weather)) assert.equal(m.confidence, 'estimated', `${f.site.name} ${path}`);
  }
});

test('Freedom 7’s day is the sky the Cape was first drawn under, figure for figure', () => {
  const day = dayOf(mr3);
  const compass = (mr3.site.bearingX.value - 90) * RAD;
  assert.deepEqual({ ...day.cumulus, wind: null }, { height: 720, depth: 650, cover: 0.1, size: 1500, wind: null });
  // (it drifts toward 270 at 7 m/s: in the pad's frame, as cape.ts had it)
  assert.ok(
    Math.abs(day.cumulus.wind[0] - -7 * Math.cos(compass)) < 1e-12 && Math.abs(day.cumulus.wind[1] - 7 * Math.sin(compass)) < 1e-12,
  );
  assert.deepEqual(day.deck, { cover: 0.3, height: 3600 }); // one okta of altocumulus is patches over 0.30 of the sky
  assert.deepEqual(day.high, { cover: null, height: 10_500, veil: false, depth: 0 }); // no high cloud in the record: the map's own
  assert.equal(day.visibility, 80_000);
  assert.equal(day.haze, 1400);
  assert.deepEqual(breeze(day), { toward: 270 * RAD, strength: 1 });
  assert.equal(day.map, 'cape-canaveral.1961-05-05');
  // and its map is the first map: the same wind, the same part of the noise, nothing more recorded
  assert.deepEqual(mapDayOf(day), { wind: [-1, 0], apart: 0, beyond: [] });
  for (let i = 0; i < 300; i++) {
    const e = -1_900_000 + 12_711 * i,
      n = 1_700_000 - 11_093 * i;
    const place = i % 3 ? sea : land;
    assert.deepEqual(weatherAt(e, n, place, mapDayOf(day)), weatherAt(e, n, place));
  }
});

test('Liberty Bell 7’s day is its own: the record’s three layers, wind and air', () => {
  const day = dayOf(mr4);
  assert.equal(day.cumulus.cover, 0.125);
  assert.equal(day.cumulus.height, 510);
  // from 200 degrees: it drifts toward 020, north-north-east
  const [x, z] = toScene(3 * Math.sin(20 * RAD), 3 * Math.cos(20 * RAD), mr4.site.bearingX.value * RAD);
  assert.ok(Math.abs(day.cumulus.wind[0] - x) < 1e-9 && Math.abs(day.cumulus.wind[1] - z) < 1e-9);
  assert.equal(day.deck.height, 5400);
  assert.equal(day.deck.cover, deckPatches(0.25));
  assert.deepEqual(day.high, { cover: 1, height: 10_500, veil: true, depth: 0.4 });
  assert.equal(day.map, 'cape-canaveral.1961-07-21');
  assert.equal(day.apart, 77);
  assert.ok(day.visibility < dayOf(mr3).visibility);
});

test('Vostok 1’s day has high cloud and nothing under it, and its own map over Site 1’s region', () => {
  const day = dayOf(vostok1);
  assert.equal(day.cumulus, null);
  assert.equal(day.deck.cover, 0);
  assert.equal(day.high.cover, 0.875);
  assert.equal(day.high.veil, false);
  // (without one its cirrus stood over the whole Earth in view from height)
  assert.equal(day.map, 'tyuratam.1961-04-12');
});

test('a flight with no weather stands under its site’s, and with neither under a clear sky; neither has a map', () => {
  const { weather: _, ...bare } = mr3;
  const site = dayOf(bare);
  assert.equal(site.cumulus.cover, mr3.site.weather.low.cover.value);
  assert.equal(site.map, null);
  const { weather: __, ...nowhere } = mr3.site;
  const clear = dayOf({ ...bare, site: nowhere });
  assert.equal(clear.cumulus, null);
  assert.equal(clear.high.cover, null);
  assert.equal(clear.deck.cover, 0);
});

test('the deck’s patches for a cover of cloud: none for none, more for more, the whole sky for a whole sky', () => {
  assert.equal(deckPatches(0), 0);
  assert.equal(deckPatches(0.125), 0.3);
  assert.equal(deckPatches(1), 1);
  let last = 0;
  for (let okta = 1; okta <= 8; okta++) {
    const p = deckPatches(okta / 8);
    assert.ok(p > last && p <= 1, `${okta} oktas: ${p}`);
    last = p;
  }
});

/** A place by its latitude and longitude, as the map is given it: metres east and north of a flight's site, on its plane. */
function placed(flight, latitude, longitude, shore) {
  const site = siteFrame(flight.site);
  const [x, , z] = ecefToSite(site, geodeticToEcef({ latitude, longitude, height: site.height }));
  const b = site.bearingX * RAD;
  return {
    e: x * Math.sin(b) + z * Math.cos(b),
    n: x * Math.cos(b) - z * Math.sin(b),
    place: { shore, height: shore > 0 ? 20 : -200, latitude, longitude },
  };
}

test('on 21 July the record holds in the map: at the Cape for the high cloud, and over each stretch of country it speaks of', () => {
  const day = mapDayOf(dayOf(mr4));
  const at = (lat, lon, shore) => {
    const p = placed(mr4, lat, lon, shore);
    return weatherAt(p.e, p.n, p.place, day);
  };
  // the station's whole sky of cirrostratus, as far as its report holds (60 km), whatever lies round it
  assert.equal(day.high.cover, 1);
  assert.ok(Math.abs(day.high.reach[0] - 10_500 / Math.tan(10 * RAD)) < 1);
  for (let bearing = 0; bearing < 360; bearing += 30)
    for (const d of [0, 20_000, 55_000]) {
      const e = d * Math.sin(bearing * RAD),
        n = d * Math.cos(bearing * RAD);
      assert.equal(weatherAt(e, n, { shore: 5, height: 3, latitude: 28.44, longitude: -80.57 }, day).cirrus, 1);
    }
  // "High cirrus blotted out everything": downrange over the Atlantic, the Bahamas, Georgia, Cuba
  for (const [lat, lon] of [
    [27.5, -75.7],
    [26.6, -78.3],
    [32.5, -83.5],
    [21.5, -79],
    [29, -70],
  ])
    assert.ok(Math.abs(at(lat, lon, -40).cirrus - 0.9) < 1e-9, `${lat} ${lon}: ${at(lat, lon, -40).cirrus}`);
  // "... except an area from about Daytona Beach back inland to Orlando and Lakeland to Lake Okeechobee and down to the tip of Florida"
  for (const [lat, lon] of [
    [28.04, -81.95], // Lakeland
    [26.95, -80.95], // Lake Okeechobee
    [25.3, -80.95], // the tip
    [29.1, -81.9], // inland of Daytona Beach
  ])
    assert.equal(at(lat, lon, 40).cirrus, 0, `${lat} ${lon}`);
  // "Beyond this the Gulf of Mexico was visible": a little high cloud, not blotted out
  assert.ok(Math.abs(at(27, -85, -40).cirrus - 0.2) < 1e-9);
  assert.ok(Math.abs(at(30, -86.5, -5).cirrus - 0.2) < 1e-9); // the coast between Apalachicola and Mobile
  // "lower patches of cumulus" over northern Florida, "scattered cumulus" over southern Florida and Cuba: about the cover taken, in patches
  const cover = (south, north, west, east) => {
    let sum = 0,
      most = 0,
      least = 1,
      count = 0;
    for (let lat = south; lat <= north; lat += 0.1)
      for (let lon = west; lon <= east; lon += 0.1) {
        const c = at(lat, lon, 40).cumulus;
        sum += c;
        most = Math.max(most, c);
        least = Math.min(least, c);
        count++;
      }
    return { mean: sum / count, most, least };
  };
  const north = cover(29.3, 30.9, -87.5, -80.1);
  assert.ok(Math.abs(north.mean - 0.3) < 0.09 && north.most > 0.4 && north.least < 0.15, JSON.stringify(north));
  const south = cover(20, 27.4, -84.9, -74.2);
  assert.ok(Math.abs(south.mean - 0.2) < 0.06 && south.most > 0.28 && south.least < 0.1, JSON.stringify(south));
  // and the two days do not have the same estimated field: far out over the sea to the south-east, where no record speaks of the low cloud
  let differ = 0;
  for (let i = 0; i < 200; i++) {
    const e = 900_000 + 4_000 * i,
      n = -1_500_000 + 3_000 * i;
    if (Math.abs(weatherAt(e, n, sea, day).cumulus - weatherAt(e, n, sea).cumulus) > 0.02) differ++;
  }
  assert.ok(differ > 100, `${differ} of 200 places differ`);
});

test('every day flown from a region has its baked map, and the first day’s is the file it always was', () => {
  for (const f of [mr3, mr4, vostok1]) {
    const map = dayOf(f).map;
    if (!map) continue;
    const file = new URL(`../public/globe/${map}.weather.png`, import.meta.url);
    assert.ok(existsSync(file), `${f.id}: public/globe/${map}.weather.png is baked (pnpm globe:weather)`);
  }
  // Freedom 7's far weather is the map it had before a flight could give its day: the same bytes. (A change to the
  // estimated field, the land map or the relief changes it honestly: bake again and pin it again.)
  const first = readFileSync(new URL('../public/globe/cape-canaveral.1961-05-05.weather.png', import.meta.url));
  assert.equal(createHash('sha256').update(first).digest('hex'), '818e80fb89bc68c4088619330972ff5df64675023855ff6c27c48d0d5ade39de');
});

/** A shader's text as it is compiled: without its comments and its white space. */
const compiled = (glsl) =>
  createHash('sha256')
    .update(
      glsl
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .digest('hex');

test('a day is written into the shaders: Freedom 7’s are the text they were before a flight could give its day', () => {
  // (comments aside. These are what the map's reader, the two sheets and the deck's shadow came to with 5 May's
  // figures as constants in viewer/weather.ts and cape.ts. A change that is meant changes them: then say so, look at
  // Freedom 7's sky before and after, and pin them again. A change that is not meant is a day's term that got into
  // a shader the day does not have it in.)
  const day = dayOf(mr3);
  assert.equal(highOf(day), null);
  assert.equal(compiled(weatherGlsl(day)), 'b96b0f54d3e47520b08f59640c3714ab963df64188690e5a9b859a501e7f2b1a');
  assert.equal(compiled(sheetsGlsl('over_', day)), '55dd7fc13487037523d5ebe55b72b57225ce2595bf4331fa8bb2f7e679cbc69c');
  assert.equal(compiled(deckPatchGlsl('air_', day.deck.height)), 'f7d193bec08bb41d2786139ec6daeb3b627c1589dbb85f6ccfdc3eba03805902');
  for (const text of [weatherGlsl(day), sheetsGlsl('over_', day)]) assert.doesNotMatch(text, /veil|highCoverAt|highAt/);
});

test('and a day with high cloud in its record has it in them: Liberty Bell 7’s veil, Vostok 1’s cirrus', () => {
  const veil = dayOf(mr4),
    cirrus = dayOf(vostok1);
  assert.deepEqual(highOf(veil), { cover: 1, depth: 0.4, veil: true, reach: reportReach(10_500) });
  assert.deepEqual(highOf(cirrus), { cover: 0.875, depth: 0.35, veil: false, reach: reportReach(9000) });
  const sheets = sheetsGlsl('over_', veil);
  // the record's cover at the site and how far it holds, its depth as it is seen through and (half of it) as it dims
  // the Sun, the deck at its own height and cover that day
  assert.match(
    sheets,
    /float highCoverAt\(vec3 w, vec2 xz\) \{ return mix\(1\.000, w\.g, smoothstep\(59548\.5, 89322\.7, length\(xz\)\)\); \}/,
  );
  assert.match(sheets, /float veilShade\(float cover, float mu\) \{ return exp\(-0\.2000 \* cover \/ max\(mu, 0\.08\)\); \}/);
  assert.match(sheets, /float veilAt\(/);
  assert.match(sheets, /exp\(-0\.4000 \* amount/);
  assert.match(sheets, /seaY \+ 5400\.0 - world\.y/);
  assert.match(sheets, /mix\(0\.43, w\.b,/);
  // until the map has come in the sky a station reported whole is whole
  assert.match(weatherGlsl(veil), /w\.g = mix\(1\.000, map\.g, uWeatherIn\);/);
  // cirrus has no veil: fibres however much of the sky they cover, and still the Sun through them
  const fibres = sheetsGlsl('over_', cirrus);
  assert.doesNotMatch(fibres, /float veilAt\(/);
  assert.match(fibres, /float highAt\(vec2 xz, float fp, float amount\) \{ return cirrusAt\(xz, fp, amount\); \}/);
  assert.match(fibres, /mix\(0\.875, w\.g,/);
  assert.match(fibres, /mix\(0\.00, w\.b,/); // (no middle deck in the record)
});

test('a report holds as far as the layer is seen from under it, and gives way over half as far again', () => {
  const [held, gone] = reportReach(10_500);
  assert.ok(held > 55_000 && held < 65_000 && Math.abs(gone - 1.5 * held) < 1e-6);
  assert.ok(reportReach(5400)[0] < held);
});

test('the Sun through high cloud: all of it through none, less through more and the lower it stands, and never a step', () => {
  assert.equal(veilShade(0, 1, 0.5), 1);
  assert.equal(veilShade(0.4, 0, 0.5), 1);
  let last = 0;
  for (let elevation = 0; elevation <= 90; elevation += 0.05) {
    const left = veilShade(0.4, 1, Math.sin(elevation * RAD));
    assert.ok(left >= last && left > 0 && left < 1, `${elevation}: ${left}`);
    assert.ok(left - last < 0.02 || elevation === 0, `a step at ${elevation}: ${last} to ${left}`);
    last = left;
  }
  // Liberty Bell 7's liftoff, the Sun 20.6 degrees up: about half the beam is left to cast a shadow
  const liftoff = veilShade(0.4, 1, Math.sin(20.6 * RAD));
  assert.ok(liftoff > 0.5 && liftoff < 0.65, `${liftoff}`);
  assert.ok(veilShade(0.4, 1, 1) > liftoff && veilShade(0.8, 1, 1) < veilShade(0.4, 1, 1));
});

test('fibrous high cloud gives way along a ragged line, a veil along a circle; the map and the shaders take the same line', () => {
  assert.equal(mapDayOf(dayOf(vostok1)).high.ragged, true);
  assert.equal(mapDayOf(dayOf(mr4)).high.ragged, undefined);
  // half to one and a half times the distance, and not the same all round
  const round = Array.from({ length: 72 }, (_, k) => heldDistance(75_000 * Math.sin(k * 0.0873), 75_000 * Math.cos(k * 0.0873)));
  assert.ok(Math.min(...round) >= 75_000 * 0.5 && Math.max(...round) <= 75_000 * 1.5);
  assert.ok(Math.max(...round) - Math.min(...round) > 15_000, 'lobed');
  // the shaders' text has it on Vostok 1's day and not on Liberty Bell 7's
  assert.match(sheetsGlsl('over_', dayOf(vostok1)), /highHeld\(xz\)/);
  assert.doesNotMatch(sheetsGlsl('over_', dayOf(mr4)), /highHeld/);
});

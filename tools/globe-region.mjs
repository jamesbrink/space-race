// Bakes a site's region (types.ts: RegionDef) for the globe (viewer/globe.ts): where the land is,
// from OpenStreetMap's coastline and its larger lakes, as signed distance fields on two planes.
//   node tools/globe-region.mjs <site module> [--from <dir>]
//
// <site module> is a sites/<site>.ts exporting a SiteDef with a `region`. <dir> holds
// coastline.json and water.json as the Overpass queries below return them; without it they are
// fetched into a temporary folder. Writes public/globe/<name>.near.png, <name>.wide.png and
// <name>.json (the planes, for the viewer).
//
// Each map is a gnomonic plane (world/region.ts): `near` centred on the site, NEAR_HALF each way at
// NEAR_TEXELS a side; `wide` over the region's bounds, its longer side WIDE_TEXELS. A texel holds
// the distance from its centre to the nearest shore, in texels, positive on land, clamped at SPREAD
// and stored as 128 + d * 127 / SPREAD, as tools/globe.mjs stores the globe's.
//
// The coastline is not assembled into polygons: OpenStreetMap draws every coastline way with the
// land on its left, so each texel near a shore takes its side from the nearest piece of it (at a
// corner, from the two pieces' normals together), and the texels further off take the side of the
// texels round them. Lakes are closed rings, filled. Then the works built after the region's
// `asOf` are undone along their lines (`later`): a causeway's fill put back to water, a canal filled.
//
// The data is OpenStreetMap's, © OpenStreetMap contributors, under the Open Database Licence
// (docs/sources.md); the maps baked from it are a produced work and say so.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { planeAt, surfaceDirection, toPlane } from '../src/world/region.ts';
import { gaussianRadius } from '../src/world/surface.ts';
import { writeGreyPng } from './png.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};

/** Texels a distance is kept to each side of the shore (the globe's own maps keep the same). */
const SPREAD = 8;
/** The near map: half its side, metres, and texels a side (39 m a texel). */
const NEAR_HALF = 80_000;
const NEAR_TEXELS = 4096;
/** The wide map's longer side, texels. */
const WIDE_TEXELS = 4096;
/** How far in from each map's edge it is faded in over the coarser one under it, metres. */
const FADE = { near: 8_000, wide: 30_000 };
/** Lakes smaller than this are left out of each map, square metres: under about three texels across. */
const LAKE_MIN = { near: 0.05e6, wide: 1e6 };
/** Degrees the data is fetched past the region's bounds, so no shore that reaches into it is cut short. */
const PAD = 0.25;
const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

const sitePath = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--from');
if (!sitePath) throw new Error('usage: node tools/globe-region.mjs <sites/<site>.ts> [--from <dir>]');
const site = Object.values(await import(pathToFileURL(resolve(sitePath)).href)).find((v) => v && typeof v === 'object' && v.region);
if (!site) throw new Error(`${sitePath}: no SiteDef with a region`);
const region = site.region;

async function source() {
  const from = opt('from', null);
  if (from) return from;
  const dir = mkdtempSync(join(tmpdir(), 'osm-region-'));
  const box = `${region.south - PAD},${region.west - PAD},${region.north + PAD},${region.east + PAD}`;
  const queries = {
    coastline: `[out:json][timeout:600];way["natural"="coastline"](${box});out body geom;`,
    water: `[out:json][timeout:900];(way["natural"="water"]["name"](${box});relation["natural"="water"]["name"](${box}););out body geom;`,
    // the rivers the region names, as their middle lines: drawn as strips where the map has no water area for them
    ...(region.rivers?.length
      ? {
          rivers: `[out:json][timeout:600];(${region.rivers.map((r) => `way["waterway"="river"]["name"~"${r.match}"](${box});`).join('')});out body geom;`,
        }
      : {}),
  };
  for (const [name, query] of Object.entries(queries)) {
    let body = null;
    // the public servers turn away a client with no name, and are often busy: each is tried in turn, then again after a wait
    for (let round = 0; round < 4 && !body; round++) {
      if (round) await new Promise((r) => setTimeout(r, 30_000 * round));
      for (const url of OVERPASS) {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'User-Agent': 'globe-region-bake/1.0', Accept: 'application/json' },
          body: new URLSearchParams({ data: query }),
        }).catch((e) => ({ ok: false, status: e.message, text: async () => '' }));
        const text = await res.text();
        if (res.ok && text.startsWith('{')) {
          body = text;
          break;
        }
        console.log(`${url}: ${res.status}, trying the next`);
      }
    }
    if (!body) throw new Error(`${name}: no Overpass server answered`);
    writeFileSync(join(dir, `${name}.json`), body);
    console.log('fetched', name, 'into', dir);
  }
  return dir;
}

const dir = await source();
const coastline = JSON.parse(readFileSync(join(dir, 'coastline.json'), 'utf8'));
const water = JSON.parse(readFileSync(join(dir, 'water.json'), 'utf8'));
const riverWays = region.rivers?.length ? JSON.parse(readFileSync(join(dir, 'rivers.json'), 'utf8')).elements : [];

/** The coastline's ways joined end to end into chains, each with the land on its left, as [lat, lon] lists; and whether each closes. */
function chains(elements) {
  const ways = elements.filter((e) => e.type === 'way' && e.geometry?.length >= 2);
  const byFirst = new Map();
  const byLast = new Map();
  for (const w of ways) {
    byFirst.set(w.nodes[0], w);
    byLast.set(w.nodes[w.nodes.length - 1], w);
  }
  const used = new Set();
  const out = [];
  for (const start of ways) {
    if (used.has(start)) continue;
    // walk back to the start of the chain this way is in (or round to it, if it closes)
    let first = start;
    for (let guard = 0; guard < ways.length; guard++) {
      const before = byLast.get(first.nodes[0]);
      if (!before || before === start || used.has(before)) break;
      first = before;
    }
    const pts = [];
    let w = first;
    let closed = false;
    while (w && !used.has(w)) {
      used.add(w);
      const g = w.geometry.map((p) => [p.lat, p.lon]);
      pts.push(...(pts.length ? g.slice(1) : g));
      const next = byFirst.get(w.nodes[w.nodes.length - 1]);
      if (next === first) closed = true;
      w = next;
    }
    out.push({ pts, closed });
  }
  return out;
}

/** The lakes: each a list of closed rings ([lat, lon] lists), outer and inner together (they are filled even-odd). */
function lakes(elements) {
  const out = [];
  for (const e of elements) {
    const tags = e.tags ?? {};
    if (tags.intermittent === 'yes' || tags.seasonal === 'yes' || tags.tidal === 'yes') continue;
    if (e.type === 'way') {
      const g = e.geometry ?? [];
      if (g.length >= 4 && e.nodes[0] === e.nodes[e.nodes.length - 1]) out.push({ name: tags.name, rings: [g.map((p) => [p.lat, p.lon])] });
    } else if (e.type === 'relation') {
      const rings = joinRings(
        (e.members ?? []).filter((m) => m.type === 'way' && m.geometry?.length >= 2).map((m) => m.geometry.map((p) => [p.lat, p.lon])),
      );
      if (rings.length) out.push({ name: tags.name, rings });
    }
  }
  return out;
}

/** Ways joined into closed rings by their ends' places (a multipolygon's members, either way round). Rings that do not close are dropped. */
function joinRings(lines) {
  const key = (p) => `${p[0].toFixed(7)},${p[1].toFixed(7)}`;
  const left = lines.slice();
  const rings = [];
  while (left.length) {
    let ring = left.pop().slice();
    for (let grew = true; grew && key(ring[0]) !== key(ring[ring.length - 1]); ) {
      grew = false;
      const end = key(ring[ring.length - 1]);
      for (let i = 0; i < left.length; i++) {
        const l = left[i];
        if (key(l[0]) === end) ring = ring.concat(l.slice(1));
        else if (key(l[l.length - 1]) === end) ring = ring.concat(l.slice(0, -1).reverse());
        else continue;
        left.splice(i, 1);
        grew = true;
        break;
      }
    }
    if (ring.length >= 4 && key(ring[0]) === key(ring[ring.length - 1])) rings.push(ring);
  }
  return rings;
}

/** A map: a plane touching the sphere at a middle, the box on it that it covers (plane units), and its texels. */
function mapOf(name, centreLat, centreLon, box, width, height) {
  const radius = gaussianRadius(centreLat);
  const [x0, x1, y0, y1] = box;
  const metres = (((x1 - x0) / width + (y1 - y0) / height) / 2) * radius;
  return { name, plane: planeAt(centreLat, centreLon), centre: [centreLat, centreLon], box, width, height, metres, radius };
}

/** A place in a map's texels: x right, y up (north), the texel centres at half-integers; y is flipped to rows only when written. */
function texel(map, lat, lon) {
  const p = toPlane(map.plane, surfaceDirection(lat, lon));
  const [x0, x1, y0, y1] = map.box;
  return [((p[0] - x0) / (x1 - x0)) * map.width, ((p[1] - y0) / (y1 - y0)) * map.height];
}

/**
 * The coast's signed distance on a map, in texels (positive on land), from oriented chains: near
 * a shore by the side of its nearest piece, elsewhere by the side of the texels round it.
 */
function coastField(map, chainList) {
  const { width: w, height: h } = map;
  const far = (SPREAD + 1) ** 2;
  const dist = new Float32Array(w * h).fill(far);
  const side = new Int8Array(w * h);
  const normal = (a, b) => {
    const dx = b[0] - a[0],
      dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l]; // the left: the land
  };
  for (const { pts, closed } of chainList) {
    const xy = pts.map(([lat, lon]) => texel(map, lat, lon));
    const n = xy.length;
    const segs = n - 1;
    const normals = [];
    for (let k = 0; k < segs; k++) normals.push(normal(xy[k], xy[k + 1]));
    for (let k = 0; k < segs; k++) {
      const a = xy[k],
        b = xy[k + 1];
      const i0 = Math.max(0, Math.floor(Math.min(a[0], b[0]) - SPREAD)),
        i1 = Math.min(w - 1, Math.ceil(Math.max(a[0], b[0]) + SPREAD));
      const j0 = Math.max(0, Math.floor(Math.min(a[1], b[1]) - SPREAD)),
        j1 = Math.min(h - 1, Math.ceil(Math.max(a[1], b[1]) + SPREAD));
      if (i0 > i1 || j0 > j1) continue;
      const dx = b[0] - a[0],
        dy = b[1] - a[1];
      const ll = dx * dx + dy * dy;
      if (ll < 1e-12) continue;
      const nk = normals[k];
      // at each end, the normals of the pieces meeting there together (a lone end: its own)
      const prev = k > 0 ? normals[k - 1] : closed ? normals[segs - 1] : nk;
      const next = k < segs - 1 ? normals[k + 1] : closed ? normals[0] : nk;
      const na = [nk[0] + prev[0], nk[1] + prev[1]],
        nb = [nk[0] + next[0], nk[1] + next[1]];
      for (let j = j0; j <= j1; j++) {
        const py = j + 0.5 - a[1];
        for (let i = i0; i <= i1; i++) {
          const px = i + 0.5 - a[0];
          const t = (px * dx + py * dy) / ll;
          const tc = Math.max(0, Math.min(1, t));
          const qx = px - tc * dx,
            qy = py - tc * dy;
          const d = qx * qx + qy * qy;
          const at = j * w + i;
          if (d >= dist[at]) continue;
          dist[at] = d;
          const s = t <= 0 ? px * na[0] + py * na[1] : t >= 1 ? qx * nb[0] + qy * nb[1] : px * nk[0] + py * nk[1];
          side[at] = s >= 0 ? 1 : -1;
        }
      }
    }
  }
  // the rest: the side of whatever known texel is reached first, spreading outward
  const queue = new Int32Array(w * h);
  let head = 0,
    tail = 0;
  for (let k = 0; k < w * h; k++) if (side[k]) queue[tail++] = k;
  // no shore at all: all one side. Land, inland (a launch site stands on land, and the region is round it); the sea only
  // where a coastline is fetched and none of it reaches the map
  if (tail === 0) side.fill(chainList.length ? -1 : 1);
  while (head < tail) {
    const k = queue[head++];
    const i = k % w,
      j = (k - i) / w;
    for (const m of [i > 0 ? k - 1 : -1, i < w - 1 ? k + 1 : -1, j > 0 ? k - w : -1, j < h - 1 ? k + w : -1]) {
      if (m >= 0 && side[m] === 0) {
        side[m] = side[k];
        queue[tail++] = m;
      }
    }
  }
  // texels beyond the spread whose neighbours beyond it disagree: where the coastline's sides do not add up
  let clashes = 0;
  for (let j = 0; j < h; j++)
    for (let i = 0; i + 1 < w; i++) {
      const k = j * w + i;
      if (dist[k] >= far && dist[k + 1] >= far && side[k] !== side[k + 1]) clashes++;
    }
  const field = new Float32Array(w * h);
  for (let k = 0; k < w * h; k++) field[k] = side[k] * Math.min(SPREAD, Math.sqrt(dist[k]));
  return { field, clashes };
}

/** Even-odd fill of rings (texel coordinates, y up) over a map: 1 where a texel's centre is inside. */
function fillRings(map, rings) {
  const { width: w, height: h } = map;
  const mask = new Uint8Array(w * h);
  const rows = new Map();
  for (const xy of rings) {
    const n = xy.length;
    for (let e = 0; e < n - 1; e++) {
      const [ax, ay] = xy[e],
        [bx, by] = xy[e + 1];
      if (ay === by) continue;
      const j0 = Math.max(0, Math.ceil(Math.min(ay, by) - 0.5)),
        j1 = Math.min(h - 1, Math.ceil(Math.max(ay, by) - 0.5) - 1);
      for (let j = j0; j <= j1; j++) {
        const y = j + 0.5;
        if (!rows.has(j)) rows.set(j, []);
        rows.get(j).push(ax + ((y - ay) / (by - ay)) * (bx - ax));
      }
    }
  }
  for (const [j, xs] of rows) {
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const i0 = Math.max(0, Math.ceil(xs[k] - 0.5)),
        i1 = Math.min(w - 1, Math.ceil(xs[k + 1] - 0.5) - 1);
      for (let i = i0; i <= i1; i++) mask[j * w + i] ^= 1;
    }
  }
  return mask;
}

/** Unsigned distance to a set of polylines (texel coordinates), texels, up to SPREAD: written into `dist` as squares where nearer. */
function polylineDistance(map, lines, dist, reach = SPREAD) {
  const { width: w, height: h } = map;
  for (const xy of lines)
    for (let e = 0; e + 1 < xy.length; e++) {
      const [ax, ay] = xy[e],
        [bx, by] = xy[e + 1];
      const i0 = Math.max(0, Math.floor(Math.min(ax, bx) - reach)),
        i1 = Math.min(w - 1, Math.ceil(Math.max(ax, bx) + reach));
      const j0 = Math.max(0, Math.floor(Math.min(ay, by) - reach)),
        j1 = Math.min(h - 1, Math.ceil(Math.max(ay, by) + reach));
      const dx = bx - ax,
        dy = by - ay;
      const ll = dx * dx + dy * dy || 1e-12;
      for (let j = j0; j <= j1; j++) {
        const py = j + 0.5 - ay;
        for (let i = i0; i <= i1; i++) {
          const px = i + 0.5 - ax;
          const t = Math.max(0, Math.min(1, (px * dx + py * dy) / ll));
          const qx = px - t * dx,
            qy = py - t * dy;
          const d = qx * qx + qy * qy;
          if (d < dist[j * w + i]) dist[j * w + i] = d;
        }
      }
    }
}

/** The area a ring encloses on the map, square metres. */
const ringArea = (map, xy) => {
  let a = 0;
  for (let e = 0; e + 1 < xy.length; e++) a += xy[e][0] * xy[e + 1][1] - xy[e + 1][0] * xy[e][1];
  return Math.abs(a / 2) * map.metres * map.metres;
};

/** Bilinear lookup of a field at texel coordinates (y up). */
function sample(map, field, x, y) {
  const i = Math.max(0, Math.min(map.width - 1.001, x - 0.5)),
    j = Math.max(0, Math.min(map.height - 1.001, y - 0.5));
  const i0 = Math.floor(i),
    j0 = Math.floor(j);
  const fx = i - i0,
    fy = j - j0;
  const at = (a, b) => field[b * map.width + a];
  return (at(i0, j0) * (1 - fx) + at(i0 + 1, j0) * fx) * (1 - fy) + (at(i0, j0 + 1) * (1 - fx) + at(i0 + 1, j0 + 1) * fx) * fy;
}

function bake(map, coast, lakeList, later, asOfYear) {
  const began = performance.now();
  const { field, clashes } = coastField(map, coast);
  // a coastline with a way missing (an Overpass server not up to date, an edit half made) lets the sea's side
  // spread inland through the gap, and the two sides meet in straight lines across the land: refuse it
  if (clashes) throw new Error(`${map.name}: the coastline's sides disagree at ${clashes} texels; fetch it again, or from another server`);
  const { width: w, height: h } = map;
  // lakes inside the land (a lagoon the coastline already goes round is the sea's): most of the ring's points on land
  const rings = [];
  let kept = 0;
  for (const lake of lakeList) {
    const xys = lake.rings.map((r) => r.map(([lat, lon]) => texel(map, lat, lon)));
    const outside = xys.every((xy) => xy.every(([x, y]) => x < -SPREAD || y < -SPREAD || x > w + SPREAD || y > h + SPREAD));
    if (outside) continue;
    const area = Math.max(...xys.map((xy) => ringArea(map, xy)));
    if (area < LAKE_MIN[map.name]) continue;
    const pts = xys.flat();
    const inland = pts.filter(([x, y]) => sample(map, field, x, y) > 1).length / pts.length;
    if (inland < 0.5) continue;
    rings.push(...xys);
    kept++;
  }
  const inLake = fillRings(map, rings);
  const lakeDist = new Float32Array(w * h).fill(SPREAD * SPREAD);
  polylineDistance(map, rings, lakeDist);
  for (let k = 0; k < w * h; k++) field[k] = Math.min(field[k], (inLake[k] ? -1 : 1) * Math.sqrt(lakeDist[k]));
  // the named rivers' channels, a strip of their width along each middle line (where the map draws the river as an
  // area as well, the wider of the two is the water)
  for (const river of region.rivers ?? []) {
    const re = new RegExp(river.match);
    const lines = riverWays
      .filter((e) => e.type === 'way' && re.test(e.tags?.name ?? '') && e.geometry?.length >= 2)
      .map((e) => e.geometry.map((p) => texel(map, p.lat, p.lon)));
    const half = river.width / 2 / map.metres;
    const d = new Float32Array(w * h).fill((half + SPREAD) ** 2);
    polylineDistance(map, lines, d, half + SPREAD);
    for (let k = 0; k < w * h; k++) field[k] = Math.min(field[k], Math.sqrt(d[k]) - half);
  }
  // the works built since: undone along their lines
  let undone = 0;
  for (const work of later) {
    if (work.built <= asOfYear) continue;
    if (work.ring) {
      // an area as it was (a sea that has shrunk since): inside the ring what it `was`, by the distance to the ring's
      // edge; where today's map has a shore inside it, that shore is gone
      const xy = work.ring.map(([lat, lon]) => texel(map, lat, lon));
      const inside = fillRings(map, [xy]);
      const d = new Float32Array(w * h).fill(SPREAD * SPREAD);
      polylineDistance(map, [xy], d);
      for (let k = 0; k < w * h; k++) {
        const s = (inside[k] ? -1 : 1) * Math.sqrt(d[k]); // positive outside the ring
        field[k] = work.was === 'water' ? Math.min(field[k], s) : Math.max(field[k], -s);
      }
      undone++;
      continue;
    }
    const xy = work.path.map(([lat, lon]) => texel(map, lat, lon));
    const half = work.width / 2 / map.metres;
    const d = new Float32Array(w * h).fill((half + SPREAD) ** 2);
    polylineDistance(map, [xy], d, half + SPREAD);
    for (let k = 0; k < w * h; k++) {
      const off = Math.sqrt(d[k]) - half; // texels outside the work's strip
      field[k] = work.was === 'water' ? Math.min(field[k], off) : Math.max(field[k], -off);
    }
    // Round the strip, what the shore that has gone said of the distance is now too near: a causeway's sides
    // left ridges in the water a texel deep, which drawn from far off showed as a ghost of it. Measured
    // again from the land and water as they now are (to the nearest texel of the other kind, less half a texel),
    // where that is further than what is there.
    const xs = xy.map((p) => p[0]),
      ys = xy.map((p) => p[1]);
    const reach = half + 2 * SPREAD;
    const i0 = Math.max(0, Math.floor(Math.min(...xs) - reach)),
      i1 = Math.min(w - 1, Math.ceil(Math.max(...xs) + reach));
    const j0 = Math.max(0, Math.floor(Math.min(...ys) - reach)),
      j1 = Math.min(h - 1, Math.ceil(Math.max(...ys) + reach));
    const was = field.slice();
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const k = j * w + i;
        const land = was[k] > 0;
        let best = SPREAD + 0.5;
        for (let b = Math.max(0, j - SPREAD); b <= Math.min(h - 1, j + SPREAD); b++)
          for (let a = Math.max(0, i - SPREAD); a <= Math.min(w - 1, i + SPREAD); a++)
            if (was[b * w + a] > 0 !== land) best = Math.min(best, Math.hypot(a - i, b - j));
        const again = Math.min(SPREAD, best - 0.5);
        if (again > Math.abs(was[k]) + 1) field[k] = land ? again : -again;
      }
    undone++;
  }
  const data = new Uint8Array(w * h);
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const d = Math.max(-SPREAD, Math.min(SPREAD, field[j * w + i]));
      data[(h - 1 - j) * w + i] = Math.max(0, Math.min(255, Math.round(128 + (d * 127) / SPREAD))); // rows north first
    }
  const file = `${region.name}.${map.name}.png`;
  writeGreyPng(join(out, file), data, w, h);
  console.log(
    `${file}: ${w} x ${h}, ${map.metres.toFixed(1)} m a texel, ${kept} lakes, ${undone} works undone, ${clashes} clashes, ${Math.round(performance.now() - began)} ms`,
  );
  return file;
}

const out = join(root, 'public', 'globe');
if (!existsSync(out)) mkdirSync(out, { recursive: true });
const coast = chains(coastline.elements);
const lakeList = lakes(water.elements);
console.log(`${coast.length} coastline chains (${coast.filter((c) => c.closed).length} closed), ${lakeList.length} named waters`);
const lat0 = site.latitude.value,
  lon0 = site.longitude.value;
// the near map: a square on the plane about the site, NEAR_HALF each way along its axes
const k = Math.tan(NEAR_HALF / gaussianRadius(lat0));
const nearMap = mapOf('near', lat0, lon0, [-k, k, -k, k], NEAR_TEXELS, NEAR_TEXELS);
// the wide one: the region's bounds as they fall on the plane at its middle, its longer side WIDE_TEXELS
const { south, north, west, east } = region;
const widePlane = planeAt((south + north) / 2, (west + east) / 2);
const edge = [];
for (let s = 0; s <= 16; s++) {
  const f = s / 16;
  for (const [lat, lon] of [
    [south, west + f * (east - west)],
    [north, west + f * (east - west)],
    [south + f * (north - south), west],
    [south + f * (north - south), east],
  ])
    edge.push(toPlane(widePlane, surfaceDirection(lat, lon)));
}
const wideBox = [
  Math.min(...edge.map((p) => p[0])),
  Math.max(...edge.map((p) => p[0])),
  Math.min(...edge.map((p) => p[1])),
  Math.max(...edge.map((p) => p[1])),
];
const along = Math.max(wideBox[1] - wideBox[0], wideBox[3] - wideBox[2]);
const wideMap = mapOf(
  'wide',
  (south + north) / 2,
  (west + east) / 2,
  wideBox,
  Math.round(((wideBox[1] - wideBox[0]) / along) * (WIDE_TEXELS / 64)) * 64,
  Math.round(((wideBox[3] - wideBox[2]) / along) * (WIDE_TEXELS / 64)) * 64,
);
const asOfYear = Number(region.asOf.slice(0, 4));
const levels = [];
for (const map of [nearMap, wideMap]) {
  const file = bake(map, coast, lakeList, region.later, asOfYear);
  levels.push({
    name: map.name,
    file,
    centre: map.centre,
    box: map.box,
    width: map.width,
    height: map.height,
    metres: Number(map.metres.toFixed(3)),
    fade: FADE[map.name] / map.radius,
  });
}
writeFileSync(
  join(out, `${region.name}.json`),
  `${JSON.stringify(
    {
      region: region.name,
      asOf: region.asOf,
      data: `OpenStreetMap, © OpenStreetMap contributors, ODbL; coastline as of ${coastline.osm3s?.timestamp_osm_base ?? '?'}`,
      spread: SPREAD,
      levels,
    },
    null,
    2,
  )}\n`,
);
console.log(`${region.name}.json`);

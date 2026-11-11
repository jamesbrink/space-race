// Bakes the globe's maps (viewer/globe.ts) from Natural Earth's public-domain vectors: where the
// land is, and where the ice is, as signed distance fields on the six faces of a cube.
//   node tools/globe.mjs [--from <dir>] [--size 2048]
//
// <dir> holds the GeoJSON layers named below (natural-earth-vector's geojson/ folder); without it
// they are fetched from GitHub into a temporary folder. The faces are written to public/globe/.
//
// Each face is a gnomonic projection of the sphere (great circles are straight lines on it),
// indexed the way a cube map is sampled: by the direction from the Earth's centre in ECEF (frames.ts),
// face order and orientation as OpenGL samples them. A texel holds the distance from its centre to
// the nearest shore, in texels, positive on land, clamped at SPREAD and stored as 128 + d * 127 /
// SPREAD. Filtered, a distance field gives a clean coastline at any magnification: the edge is
// where it crosses zero, found per pixel.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeGreyPng } from './png.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};

/** Texels a distance is kept to, each side of the shore: past it a texel says only "land" or "sea". */
const SPREAD = 8;
/** Texels drawn round each face beyond its edge, so the distances near an edge see shores on the next face. */
const MARGIN = SPREAD + 2;
const BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';
const LAYERS = {
  land: ['ne_10m_land', 'ne_10m_minor_islands', 'ne_10m_antarctic_ice_shelves_polys'],
  water: ['ne_10m_lakes'],
  ice: ['ne_10m_glaciated_areas', 'ne_10m_antarctic_ice_shelves_polys'],
};

async function source() {
  const from = opt('from', null);
  if (from) return from;
  const dir = mkdtempSync(join(tmpdir(), 'natural-earth-'));
  for (const name of new Set(Object.values(LAYERS).flat())) {
    const res = await fetch(`${BASE}${name}.geojson`);
    if (!res.ok) throw new Error(`${name}: ${res.status}`);
    writeFileSync(join(dir, `${name}.geojson`), Buffer.from(await res.arrayBuffer()));
    console.log('fetched', name);
  }
  return dir;
}

// WGS 84 (bodies.ts): a point at a latitude and longitude on the ellipsoid, as a unit direction from the centre
const A = 6378137;
const F = 1 / 298.257223563;
const E2 = F * (2 - F);
function direction(lon, lat) {
  const p = (lat * Math.PI) / 180,
    l = (lon * Math.PI) / 180;
  const s = Math.sin(p),
    c = Math.cos(p);
  const N = A / Math.sqrt(1 - E2 * s * s);
  const v = [N * c * Math.cos(l), N * c * Math.sin(l), N * (1 - E2) * s];
  const len = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / len, v[1] / len, v[2] / len];
}

/**
 * The rings of a layer, each a list of directions with, for each edge, whether it is a shore:
 * Natural Earth cuts polygons at the antimeridian and runs Antarctica's along the pole, and
 * those edges are seams inside the land, not coasts.
 */
function rings(dir, names) {
  return names.map((name) => layer(dir, name));
}
function layer(dir, name) {
  const out = [];
  {
    const json = JSON.parse(readFileSync(join(dir, `${name}.geojson`), 'utf8'));
    for (const f of json.features) {
      const g = f.geometry;
      if (!g) continue;
      const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
      for (const poly of polys)
        for (const ring of poly) {
          const pts = ring.map(([lon, lat]) => direction(lon, lat));
          const shore = ring.map(([lon, lat], i) => {
            const [lon2, lat2] = ring[(i + 1) % ring.length];
            return !((Math.abs(lon) === 180 && Math.abs(lon2) === 180) || (lat === -90 && lat2 === -90));
          });
          out.push(shore.every(Boolean) ? { pts: rounded(pts), shore: rounded(pts).map(() => true) } : { pts, shore });
        }
    }
  }
  return out;
}

/**
 * A closed ring with its corners cut (Chaikin, twice): Natural Earth's 1:10 million shore is a
 * line of straight runs a few kilometres long, and from orbit its corners showed as kinks. The cut
 * moves the line by at most a quarter of a run at a corner, inside the generalisation it already
 * has. Rings with seams (above) are left as they are.
 */
const roundedCache = new WeakMap();
function rounded(pts) {
  let r = roundedCache.get(pts);
  if (r) return r;
  r = pts.slice(0, pts.length > 1 && pts[0].every((v, k) => v === pts[pts.length - 1][k]) ? -1 : undefined);
  for (let pass = 0; pass < 2 && r.length >= 4; pass++) {
    const next = [];
    for (let i = 0; i < r.length; i++) {
      const a = r[i],
        b = r[(i + 1) % r.length];
      next.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1], 0.75 * a[2] + 0.25 * b[2]]);
      next.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1], 0.25 * a[2] + 0.75 * b[2]]);
    }
    r = next;
  }
  roundedCache.set(pts, r);
  return r;
}

/** Each face's (major axis, s axis, t axis) as OpenGL picks them: s = sc / ma, t = tc / ma. */
const FACES = [
  ['px', [1, 0, 0], [0, 0, -1], [0, -1, 0]],
  ['nx', [-1, 0, 0], [0, 0, 1], [0, -1, 0]],
  ['py', [0, 1, 0], [1, 0, 0], [0, 0, 1]],
  ['ny', [0, -1, 0], [1, 0, 0], [0, 0, -1]],
  ['pz', [0, 0, 1], [1, 0, 0], [0, -1, 0]],
  ['nz', [0, 0, -1], [-1, 0, 0], [0, -1, 0]],
];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * A ring clipped to the pyramid a face (with its margin) sees, by Sutherland and Hodgman against
 * planes through the centre (so the edges, great-circle arcs, are clipped exactly), then projected
 * onto the face in texels. An edge made by the clip is not a shore.
 */
function project(ring, face, size, reach) {
  const [, ma, sa, ta] = face;
  // the four sides: sc <= k ma, -sc <= k ma, tc <= k ma, -tc <= k ma (together they also keep ma > 0)
  const planes = [
    (v) => reach * dot(v, ma) - dot(v, sa),
    (v) => reach * dot(v, ma) + dot(v, sa),
    (v) => reach * dot(v, ma) - dot(v, ta),
    (v) => reach * dot(v, ma) + dot(v, ta),
  ];
  let pts = ring.pts;
  let shore = ring.shore;
  for (const side of planes) {
    if (pts.length === 0) break;
    const nextPts = [];
    const nextShore = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i],
        b = pts[(i + 1) % n];
      const da = side(a),
        db = side(b);
      if (da >= 0) {
        nextPts.push(a);
        // the edge leaving a kept point keeps its kind if b is kept too, or as far as the cut
        nextShore.push(shore[i]);
      }
      if (da >= 0 !== db >= 0) {
        const k = da / (da - db);
        nextPts.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]);
        // from the cut: along the edge if b is kept, along the plane (no shore) if not
        nextShore.push(db >= 0 ? shore[i] : false);
      }
    }
    pts = nextPts;
    shore = nextShore;
  }
  // face coordinates to texels: s = -1 is the left of texel 0, t = -1 the top of row 0
  const xy = pts.map((v) => {
    const m = dot(v, ma);
    return [((dot(v, sa) / m + 1) / 2) * size, ((dot(v, ta) / m + 1) / 2) * size];
  });
  return { xy, shore };
}

/** Fill a mask of the texel centres inside a set of rings, even-odd, over [-pad, size + pad) both ways. */
function fill(mask, w, pad, polys, value) {
  const rows = Array.from({ length: w }, () => []);
  for (const { xy } of polys) {
    const n = xy.length;
    for (let i = 0; i < n; i++) {
      const [x0, y0] = xy[i];
      const [x1, y1] = xy[(i + 1) % n];
      if (y0 === y1) continue;
      const lo = Math.min(y0, y1),
        hi = Math.max(y0, y1);
      // rows whose centre (j + 0.5 - pad) is in [lo, hi)
      const j0 = Math.max(0, Math.ceil(lo + pad - 0.5)),
        j1 = Math.min(w - 1, Math.ceil(hi + pad - 0.5) - 1);
      for (let j = j0; j <= j1; j++) {
        const y = j + 0.5 - pad;
        rows[j].push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
      }
    }
  }
  for (let j = 0; j < w; j++) {
    const xs = rows[j].sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const i0 = Math.max(0, Math.ceil(xs[k] + pad - 0.5)),
        i1 = Math.min(w - 1, Math.ceil(xs[k + 1] + pad - 0.5) - 1);
      for (let i = i0; i <= i1; i++) mask[j * w + i] ^= value;
    }
  }
}

/** The distance from each texel centre of the face to the nearest shore edge, in texels, up to SPREAD. */
function distances(dist, size, polys) {
  for (const { xy, shore } of polys) {
    const n = xy.length;
    for (let e = 0; e < n; e++) {
      if (!shore[e]) continue;
      const [ax, ay] = xy[e];
      const [bx, by] = xy[(e + 1) % n];
      const i0 = Math.max(0, Math.floor(Math.min(ax, bx) - SPREAD)),
        i1 = Math.min(size - 1, Math.ceil(Math.max(ax, bx) + SPREAD));
      const j0 = Math.max(0, Math.floor(Math.min(ay, by) - SPREAD)),
        j1 = Math.min(size - 1, Math.ceil(Math.max(ay, by) + SPREAD));
      if (i0 > i1 || j0 > j1) continue;
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
          const at = j * size + i;
          if (d < dist[at]) dist[at] = d;
        }
      }
    }
  }
}

/**
 * One map: the solid layers less the holes, as a distance field on each face. Each layer is filled
 * even-odd on its own (a ring inside a ring is a hole in it) and the layers are joined, so two
 * layers that overlap do not cancel.
 */
function bakeMap(name, solid, holes, size, out) {
  const w = size + 2 * MARGIN;
  const reach = 1 + (2 * MARGIN) / size; // the margin, in face units
  for (const face of FACES) {
    const began = performance.now();
    const on = (layers) => layers.map((rs) => rs.map((r) => project(r, face, size, reach)).filter((p) => p.xy.length >= 3));
    const union = (layers) => {
      const mask = new Uint8Array(w * w);
      for (const polys of layers) {
        const one = new Uint8Array(w * w);
        fill(one, w, MARGIN, polys, 1);
        for (let k = 0; k < mask.length; k++) mask[k] |= one[k];
      }
      return mask;
    };
    const solids = on(solid);
    const cut = on(holes);
    const mask = union(solids);
    const water = union(cut);
    const dist = new Float32Array(size * size).fill(SPREAD * SPREAD);
    distances(dist, size, [...solids, ...cut].flat());
    const data = new Uint8Array(size * size);
    for (let j = 0; j < size; j++)
      for (let i = 0; i < size; i++) {
        const m = (j + MARGIN) * w + i + MARGIN;
        const inside = mask[m] && !water[m];
        const d = Math.sqrt(dist[j * size + i]) * (inside ? 1 : -1);
        data[j * size + i] = Math.max(0, Math.min(255, Math.round(128 + (d * 127) / SPREAD)));
      }
    writeGreyPng(join(out, `${name}.${face[0]}.png`), data, size, size);
    console.log(`${name}.${face[0]}.png`, `${Math.round(performance.now() - began)} ms`);
  }
}

const dir = await source();
const size = Number(opt('size', 2048));
const out = join(root, 'public', 'globe');
if (!existsSync(out)) mkdirSync(out, { recursive: true });
bakeMap('land', rings(dir, LAYERS.land), rings(dir, LAYERS.water), size, out);
bakeMap('ice', rings(dir, LAYERS.ice), [], size / 4, out);

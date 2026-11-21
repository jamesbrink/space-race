// Bakes the Sun, the Moon, the Earth and the planets from JPL's DE440 into public/ephemeris/de440.bin, which
// src/world/jpl.ts reads (and src/world/ephemeris.ts `stateOf` answers from):
//   node tools/ephemeris-bake.mjs [--cache <dir>] [--bsp <file>] [--check]
//
// Source: JPL's planetary and lunar ephemeris DE440 (Park, Folkner, Williams and Boggs 2021, AJ 161:105), as the
// SPICE kernel de440s.bsp (31 MB: the same integration as de440.bsp, cut to 1849-2150), fetched once into the cache
// (default ~/.cache/space-race/ephemeris; never committed) from ssd.jpl.nasa.gov/ftp/eph/planets/bsp/. The kernel is a
// NAIF DAF file of SPK type 2 segments: Chebyshev polynomials in each coordinate of position, km, ICRF, over fixed
// intervals of TDB seconds from J2000 (NAIF's "SPK Required Reading" and "DAF Required Reading").
//
// What is baked, 1957-01-01 to 2035-01-01 TDB, each as Chebyshev segments of its own length and degree fitted afresh to
// the kernel's positions and velocities at many points in each segment (least squares, both together, the ends held),
// so a segment's derivative is the velocity:
//   moon       the Moon from the Earth's centre (the kernel's 301 - 399): what the sky and a flight to it want most
//   emb        the Earth-Moon barycentre from the solar system's (3); the Earth is it less the Moon / (1 + EMRAT)
//   sun        the Sun from the solar system's barycentre (10)
//   mercury .. pluto   each planet's system barycentre from the solar system's (1, 2, 4 to 9): placeholders' places
//   moonpa     the Moon's orientation: the three Euler angles (3-1-3: the node of its equator on the ICRF's, its tilt
//              to it, and its turn from that node) that take the ICRF to the Moon's principal axes as DE440 integrated
//              them, with its physical librations. Radians, not metres. From the binary PCK moon_pa_de440_200625.bpc
//              (NAIF generic kernels, 12 MB, fetched once beside the SPK): a DAF/PCK file of type 2 segments for the
//              frame MOON_PA_DE440 (class id 31008) against the ICRF (NAIF's "PCK Required Reading"). What a field of
//              the Moon's gravity is turned by (src/world/moon.ts `principalAxes`).
// Each is checked against the kernel at points that were not fitted, and the worst error in position and velocity over
// the whole span is printed and kept in the file's header (jpl.ts `accuracy`). `--check` only fits and reports.
//
// The file, little-endian: the bytes 'SRDE440\0', a uint32 header length, the header as UTF-8 JSON (what each series
// is, its first instant as a TDB Julian date, its segments' length in days and degree, where its coefficients start
// and how far each was measured to agree with DE440), then for each series its segments' coefficients as float64, x's
// degree + 1 then y's then z's, in metres: the first few of each (`doubled`) as float64, every series's, then the rest
// as float32, which a series's accuracy is measured with.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);
const cache = opt('cache', join(homedir(), '.cache/space-race/ephemeris'));
const checkOnly = args.includes('--check');
const KERNEL = 'https://ssd.jpl.nasa.gov/ftp/eph/planets/bsp/de440s.bsp';
const LIBRATIONS = 'https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/moon_pa_de440_200625.bpc';

/** A kernel's path: the one given (`--<flag> <file>`), or the cache's copy, fetched once from `url`. */
async function kernelPath(flag = 'bsp', url = KERNEL) {
  const given = opt(flag, null);
  if (given) return given;
  mkdirSync(cache, { recursive: true });
  const path = join(cache, url.slice(url.lastIndexOf('/') + 1));
  if (!existsSync(path)) {
    // (a generic client name: nothing about whoever runs this is sent)
    const res = await fetch(url, { headers: { 'User-Agent': 'ephemeris-bake' } });
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
    console.log('fetched', url);
  }
  return path;
}

/**
 * The Moon's orientation from a binary PCK (NAIF's DAF layout, as the SPK's; its summaries are two doubles, the span,
 * and five integers: the frame's class id, the frame it is given against, the type, and where its data begin and end):
 * the three Euler angles of frame 31008 against the ICRF (1) and their rates at `et` TDB seconds from J2000, radians and
 * radians a second, as `{ r, v }` so that it is fitted as a place is.
 */
function readPck(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const id = new TextDecoder().decode(bytes.subarray(0, 8));
  if (id !== 'DAF/PCK ') throw new Error(`not a binary PCK file: ${id}`);
  const format = new TextDecoder().decode(bytes.subarray(88, 96));
  if (format !== 'LTL-IEEE') throw new Error(`not little-endian IEEE: ${format}`);
  const nd = view.getInt32(8, true);
  const ni = view.getInt32(12, true);
  const words = nd + Math.ceil(ni / 2);
  const doubleAt = (address) => view.getFloat64((address - 1) * 8, true);
  const segments = [];
  for (let record = view.getInt32(76, true); record > 0; ) {
    const at = (record - 1) * 1024;
    const next = view.getFloat64(at, true);
    const count = view.getFloat64(at + 16, true);
    for (let i = 0; i < count; i++) {
      const s = at + 24 + i * words * 8;
      const ints = [];
      for (let k = 0; k < ni; k++) ints.push(view.getInt32(s + nd * 8 + k * 4, true));
      const [frame, against, type, begin, end] = ints;
      if (frame !== 31008 || against !== 1 || type !== 2)
        throw new Error(`a segment of frame ${frame} against ${against}, type ${type}: only 31008 against the ICRF, type 2, is read`);
      const [init, intlen, rsize, n] = [doubleAt(end - 3), doubleAt(end - 2), doubleAt(end - 1), doubleAt(end)];
      segments.push({ begin, init, intlen, rsize, n, start: view.getFloat64(s, true), stop: view.getFloat64(s + 8, true) });
    }
    record = next;
  }
  return (et) => {
    const seg = segments.find((g) => et >= g.start && et <= g.stop);
    if (!seg) throw new Error(`no orientation at ${et}`);
    const i = Math.min(seg.n - 1, Math.floor((et - seg.init) / seg.intlen));
    const base = seg.begin + i * seg.rsize;
    const mid = doubleAt(base);
    const radius = doubleAt(base + 1);
    const degree = (seg.rsize - 2) / 3 - 1;
    const x = (et - mid) / radius;
    const { T, D } = chebyshev(x, degree);
    const r = [0, 0, 0];
    const v = [0, 0, 0];
    for (let c = 0; c < 3; c++) {
      const from = base + 2 + c * (degree + 1);
      for (let k = 0; k <= degree; k++) {
        r[c] += doubleAt(from + k) * T[k];
        v[c] += (doubleAt(from + k) * D[k]) / radius;
      }
    }
    return { r, v };
  };
}

/** The kernel's type 2 segments by target and centre: NAIF's DAF layout. */
function readSpk(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const id = new TextDecoder().decode(bytes.subarray(0, 8));
  if (id !== 'DAF/SPK ') throw new Error(`not an SPK file: ${id}`);
  const format = new TextDecoder().decode(bytes.subarray(88, 96));
  if (format !== 'LTL-IEEE') throw new Error(`not little-endian IEEE: ${format}`);
  const nd = view.getInt32(8, true);
  const ni = view.getInt32(12, true);
  const words = nd + Math.ceil(ni / 2); // a summary's length in doubles
  const doubleAt = (address) => view.getFloat64((address - 1) * 8, true); // (DAF addresses count doubles from 1)
  const segments = [];
  for (let record = view.getInt32(76, true); record > 0; ) {
    const at = (record - 1) * 1024;
    const next = view.getFloat64(at, true);
    const count = view.getFloat64(at + 16, true);
    for (let i = 0; i < count; i++) {
      const s = at + 24 + i * words * 8;
      const ints = [];
      for (let k = 0; k < ni; k++) ints.push(view.getInt32(s + nd * 8 + k * 4, true));
      const [target, centre, frame, type, begin, end] = ints;
      if (type !== 2) throw new Error(`segment ${target} of type ${type}: only type 2 is read`);
      if (frame !== 1) throw new Error(`segment ${target} in frame ${frame}: only J2000 (the ICRF) is read`);
      const [init, intlen, rsize, n] = [doubleAt(end - 3), doubleAt(end - 2), doubleAt(end - 1), doubleAt(end)];
      segments.push({ target, centre, begin, init, intlen, rsize, n, start: view.getFloat64(s, true), stop: view.getFloat64(s + 8, true) });
    }
    record = next;
  }
  /** Position (km) and velocity (km/s) of `target` from `centre` at `et` TDB seconds from J2000. */
  const state = (target, centre, et) => {
    const seg = segments.find((g) => g.target === target && g.centre === centre && et >= g.start && et <= g.stop);
    if (!seg) throw new Error(`no segment for ${target} from ${centre} at ${et}`);
    const i = Math.min(seg.n - 1, Math.floor((et - seg.init) / seg.intlen));
    const base = seg.begin + i * seg.rsize;
    const mid = doubleAt(base);
    const radius = doubleAt(base + 1);
    const degree = (seg.rsize - 2) / 3 - 1;
    const x = (et - mid) / radius;
    const r = [0, 0, 0];
    const v = [0, 0, 0];
    for (let c = 0; c < 3; c++) {
      const from = base + 2 + c * (degree + 1);
      let [t0, t1, d0, d1] = [1, x, 0, 1];
      let p = doubleAt(from) + doubleAt(from + 1) * x;
      let q = doubleAt(from + 1);
      for (let k = 2; k <= degree; k++) {
        const t2 = 2 * x * t1 - t0;
        const d2 = 2 * t1 + 2 * x * d1 - d0;
        const a = doubleAt(from + k);
        p += a * t2;
        q += a * d2;
        [t0, t1, d0, d1] = [t1, t2, d1, d2];
      }
      r[c] = p;
      v[c] = q / radius;
    }
    return { r, v };
  };
  return { segments, state };
}

/** Least squares by Householder reflections: the `x` minimising |A x - b|, A given as rows. */
function leastSquares(A, b) {
  const m = A.length;
  const n = A[0].length;
  const a = A.map((row) => row.slice());
  const y = b.slice();
  for (let k = 0; k < n; k++) {
    let norm = 0;
    for (let i = k; i < m; i++) norm += a[i][k] ** 2;
    norm = Math.sqrt(norm);
    if (norm === 0) continue;
    const alpha = a[k][k] > 0 ? -norm : norm;
    const v = new Array(m).fill(0);
    v[k] = a[k][k] - alpha;
    for (let i = k + 1; i < m; i++) v[i] = a[i][k];
    const vv = v.reduce((s, x, i) => (i >= k ? s + x * x : s), 0);
    for (let j = k; j < n; j++) {
      let s = 0;
      for (let i = k; i < m; i++) s += v[i] * a[i][j];
      const f = (2 * s) / vv;
      for (let i = k; i < m; i++) a[i][j] -= f * v[i];
    }
    let s = 0;
    for (let i = k; i < m; i++) s += v[i] * y[i];
    const f = (2 * s) / vv;
    for (let i = k; i < m; i++) y[i] -= f * v[i];
  }
  const x = new Array(n).fill(0);
  for (let k = n - 1; k >= 0; k--) {
    let s = y[k];
    for (let j = k + 1; j < n; j++) s -= a[k][j] * x[j];
    x[k] = s / a[k][k];
  }
  return x;
}

/** The Chebyshev polynomials and their derivatives at x, to `degree`. */
function chebyshev(x, degree) {
  const T = [1, x];
  const D = [0, 1];
  for (let k = 2; k <= degree; k++) {
    T.push(2 * x * T[k - 1] - T[k - 2]);
    D.push(2 * T[k - 1] + 2 * x * D[k - 1] - D[k - 2]);
  }
  return { T: T.slice(0, degree + 1), D: D.slice(0, degree + 1) };
}

const DAY = 86_400;
const J2000 = 2_451_545.0;
const FROM = 2_435_839.5; // 1957 January 1, 0h TDB
const TO = 2_464_328.5; // 2035 January 1

/**
 * One series fitted: `of(et)` its state (km, km/s) from the kernel; `days` its segments' length and `degree` their
 * order. Positions and velocities at `2 (degree + 1)` points in each segment (Chebyshev's, ends included), velocities
 * weighted so a millimetre a second counts as `weight` metres; the ends weighted hard, so neighbours meet. `unit`: what
 * the kernel's figures are multiplied by to be kept (1000: kilometres as metres; 1: radians as they are).
 */
function fit(of, days, degree, weight, doubled, unit) {
  const count = Math.ceil((TO - FROM) / days);
  const coefficients = new Float64Array(count * 3 * (degree + 1));
  const span = days * DAY;
  const m = 2 * (degree + 1);
  const xs = Array.from({ length: m }, (_, j) => -Math.cos((Math.PI * j) / (m - 1)));
  const basis = xs.map((x) => chebyshev(x, degree));
  const w = weight * 1e3; // (km per km/s)
  const ends = 100;
  const rows = [];
  for (let j = 0; j < m; j++) {
    const e = j === 0 || j === m - 1 ? ends : 1;
    rows.push(basis[j].T.map((t) => t * e));
    rows.push(basis[j].D.map((d) => ((d * 2) / span) * w * e));
  }
  for (let s = 0; s < count; s++) {
    const start = (FROM - J2000 + s * days) * DAY;
    const states = xs.map((x) => of(start + ((x + 1) * span) / 2));
    for (let c = 0; c < 3; c++) {
      const b = [];
      for (let j = 0; j < m; j++) {
        const e = j === 0 || j === m - 1 ? ends : 1;
        b.push(states[j].r[c] * e, states[j].v[c] * w * e);
      }
      const x = leastSquares(rows, b);
      // (metres, or radians; the first `doubled` as doubles, the rest as singles, as the file keeps them)
      for (let k = 0; k <= degree; k++) coefficients[(s * 3 + c) * (degree + 1) + k] = k < doubled ? x[k] * unit : Math.fround(x[k] * unit);
    }
  }
  return { count, coefficients };
}

/** A fitted series evaluated: metres and metres a second at `et`. */
function evaluate(series, et) {
  const { days, degree, coefficients } = series;
  const span = days * DAY;
  const s = Math.min(series.count - 1, Math.max(0, Math.floor((et / DAY + J2000 - FROM) / days)));
  const start = (FROM - J2000 + s * days) * DAY;
  const x = (2 * (et - start)) / span - 1;
  const { T, D } = chebyshev(x, degree);
  const r = [0, 0, 0];
  const v = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    const at = (s * 3 + c) * (degree + 1);
    for (let k = 0; k <= degree; k++) {
      r[c] += coefficients[at + k] * T[k];
      v[c] += (coefficients[at + k] * D[k] * 2) / span;
    }
  }
  return { r, v };
}

/** The worst disagreement with the kernel, metres and metres a second, at `per` points in every segment that were not fitted. */
function measure(of, series, per = 7) {
  let [dr, dv] = [0, 0];
  for (let s = 0; s < series.count; s++) {
    for (let k = 0; k < per; k++) {
      const et = (FROM - J2000 + (s + (k + 0.37) / per) * series.days) * DAY;
      if (et / DAY + J2000 > TO) continue;
      const want = of(et);
      const got = evaluate(series, et);
      dr = Math.max(dr, Math.hypot(...got.r.map((x, i) => x - want.r[i] * series.unit)));
      dv = Math.max(dv, Math.hypot(...got.v.map((x, i) => x - want.v[i] * series.unit)));
    }
  }
  return { position: dr, velocity: dv };
}

const spk = readSpk(readFileSync(await kernelPath()));
const at = (target, centre) => (et) => spk.state(target, centre, et);
const minus = (a, b) => (et) => {
  const [p, q] = [a(et), b(et)];
  return { r: p.r.map((x, i) => x - q.r[i]), v: p.v.map((x, i) => x - q.v[i]) };
};
const moon = minus(at(301, 3), at(399, 3));
// EMRAT: the Earth's mass over the Moon's, read off the kernel (the Earth's place from the barycentre is the Moon's / (1 + EMRAT))
const probe = 1e8;
const emrat = Math.hypot(...moon(probe).r) / Math.hypot(...at(399, 3)(probe).r) - 1;

const librations = readPck(readFileSync(await kernelPath('pck', LIBRATIONS)));

/** What is baked: [id, what it is, the state, segment length (days), degree, velocity weight, how many coefficients are kept as doubles, and (angles) the unit]. */
const PLAN = [
  ['moon', 'the Moon from the Earth’s centre (DE440 301 - 399)', moon, 16, 18, 1e2, 3],
  ['emb', 'the Earth-Moon barycentre from the solar system’s (DE440 3)', at(3, 0), 64, 12, 1e3, 4],
  ['sun', 'the Sun from the solar system’s barycentre (DE440 10)', at(10, 0), 128, 10, 1e3, 3],
  ['mercury', 'Mercury from the solar system’s barycentre (DE440 1)', at(1, 0), 32, 16, 1e4, 4],
  ['venus', 'Venus from the solar system’s barycentre (DE440 2)', at(2, 0), 128, 12, 1e4, 4],
  ['mars', 'the Mars system’s barycentre (DE440 4)', at(4, 0), 256, 14, 1e4, 4],
  ['jupiter', 'the Jupiter system’s barycentre (DE440 5)', at(5, 0), 512, 9, 1e4, 4],
  ['saturn', 'the Saturn system’s barycentre (DE440 6)', at(6, 0), 1024, 9, 1e4, 4],
  ['uranus', 'the Uranus system’s barycentre (DE440 7)', at(7, 0), 2048, 8, 1e4, 4],
  ['neptune', 'the Neptune system’s barycentre (DE440 8)', at(8, 0), 2048, 8, 1e4, 4],
  ['pluto', 'the Pluto system’s barycentre (DE440 9)', at(9, 0), 2048, 8, 1e4, 4],
  [
    'moonpa',
    'the Moon’s principal axes from the ICRF, as Euler angles 3-1-3, radians (DE440: moon_pa_de440_200625.bpc, frame 31008)',
    librations,
    16,
    12,
    1e2,
    2,
    1,
  ],
];

// (`--try id:days:degree,...` fits other lengths and degrees, to see what they would cost)
for (const t of (opt('try', '') || '').split(',').filter(Boolean)) {
  const [id, days, degree, doubled] = t.split(':');
  const row = PLAN.find((p) => p[0] === id);
  [row[3], row[4]] = [Number(days), Number(degree)];
  if (doubled) row[6] = Number(doubled);
}

const series = [];
for (const [id, what, of, days, degree, weight, doubled, unit = 1e3] of PLAN) {
  const fitted = fit(of, days, degree, weight, doubled, unit);
  const s = { id, what, days, degree, doubled, unit, ...fitted };
  s.accuracy = measure(of, s);
  console.log(
    `${id.padEnd(8)} ${String(days).padStart(4)} d, degree ${String(degree).padStart(2)}: ${s.count} segments, ` +
      `${((s.coefficients.length * 4 + s.count * 3 * doubled * 4) / 1024).toFixed(0)} kB; within ${s.accuracy.position.toPrecision(3)} ${unit === 1 ? 'rad' : 'm'} and ` +
      `${(s.accuracy.velocity * 1e3).toPrecision(3)} ${unit === 1 ? 'mrad/s' : 'mm/s'} of DE440`,
  );
  series.push(s);
}

if (!checkOnly) {
  // (the first few coefficients of each coordinate in each segment as doubles, all the series's together, then the
  // rest as singles: what a single's rounding costs is in the accuracy measured)
  let [wide, narrow] = [0, 0];
  const header = {
    source: 'JPL DE440 (Park et al. 2021, AJ 161:105), from de440s.bsp; refitted by tools/ephemeris-bake.mjs',
    frame: 'ICRF; metres and metres a second (moonpa: radians and radians a second); argued in TDB Julian dates',
    emrat,
    from: FROM,
    to: TO,
    series: series.map((s) => {
      const { id, what, days, degree, doubled, count, accuracy } = s;
      const out = { id, what, start: FROM, days, degree, doubled, count, wide, narrow, accuracy };
      wide += count * 3 * doubled;
      narrow += count * 3 * (degree + 1 - doubled);
      return out;
    }),
  };
  const doubles = new Float64Array(wide);
  const singles = new Float32Array(narrow);
  for (const [i, s] of series.entries()) {
    const h = header.series[i];
    for (let row = 0; row < s.count * 3; row++) {
      const from = row * (s.degree + 1);
      const n = s.doubled;
      for (let k = 0; k < n; k++) doubles[h.wide + row * n + k] = s.coefficients[from + k];
      for (let k = n; k <= s.degree; k++) singles[h.narrow + row * (s.degree + 1 - n) + k - n] = s.coefficients[from + k];
    }
  }
  header.doubles = wide;
  header.singles = narrow;
  let json = Buffer.from(JSON.stringify(header), 'utf8');
  // (the doubles start on a multiple of eight bytes, so a Float64Array can be laid straight over them)
  const pad = (8 - ((12 + json.length) % 8)) % 8;
  json = Buffer.concat([json, Buffer.alloc(pad, 0x20)]);
  const head = Buffer.alloc(12);
  head.write('SRDE440\0', 0, 'latin1');
  head.writeUInt32LE(json.length, 8);
  mkdirSync(join(root, 'public/ephemeris'), { recursive: true });
  const out = join(root, 'public/ephemeris/de440.bin');
  const file = Buffer.concat([head, json, Buffer.from(doubles.buffer), Buffer.from(singles.buffer)]);
  writeFileSync(out, file);
  console.log(`wrote ${out}: ${(file.length / 1024).toFixed(0)} kB; EMRAT ${emrat}`);
}

import * as THREE from 'three';
import { TYURATAM_HEIGHTS } from '../../missions/ussr/vostok/sites/tyuratam-heights.ts';
import { FANS, TYURATAM_WORKS } from '../../missions/ussr/vostok/sites/tyuratam-works.ts';
import { STEPPE } from './steppe.ts';

/**
 * What the land round Site 1 has past the place's own ground: the lie of the land from SRTM (tyuratam-heights.ts), and
 * the worked ground off the Corona frames of December 1960 and May 1962 (tyuratam-works.ts): the railways, the roads
 * and the dirt tracks as ways drawn on the ground at any distance, and the tracks fanning over the worked ground.
 * tyuratam.ts puts them in its land; what each rests on is in site-1.md, "The worked ground" and "The lie of the land".
 */

const glsl = (v: number) => v.toFixed(3);
const vec3 = (c: THREE.Color) => `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`;

// ---------------------------------------------------------------------------------------------------------------
// The lie of the land: SRTM's heights, every `step` metres, as a cubic B-spline (smooth to its second derivative, so
// the ground's light has no crease along the grid), in JavaScript (the walker, the plants) and GLSL (the mesh): the
// same arithmetic, so the two are one surface.

const H = TYURATAM_HEIGHTS;
/** Metres above the deck's level, row 0 the southern, west to east. */
const HEIGHTS = (() => {
  const bytes = Uint8Array.from(atob(H.bytes), (c) => c.charCodeAt(0));
  if (bytes.length !== H.n * H.n) throw new Error('tyuratam-heights.ts: the grid is not n by n');
  const out = new Float32Array(H.n * H.n);
  for (let i = 0; i < out.length; i++) out[i] = Math.fround(H.low + bytes[i]! * H.quant - H.level);
  return out;
})();

const bspline = (t: number): [number, number, number, number] => {
  const t2 = t * t,
    t3 = t2 * t;
  return [(1 - t) ** 3 / 6, (3 * t3 - 6 * t2 + 4) / 6, (-3 * t3 + 3 * t2 + 3 * t + 1) / 6, t3 / 6];
};

/** The ground's height from SRTM at `x` metres east and `y` north of the pad, metres from the deck's level. */
export function heightsAt(x: number, y: number): number {
  const u = (x + H.half) / H.step,
    v = (y + H.half) / H.step;
  const i = Math.floor(u),
    j = Math.floor(v);
  const wx = bspline(u - i),
    wy = bspline(v - j);
  const last = H.n - 1;
  let h = 0;
  for (let b = 0; b < 4; b++) {
    const row = Math.min(last, Math.max(0, j + b - 1)) * H.n;
    let s = 0;
    for (let a = 0; a < 4; a++) s += wx[a]! * HEIGHTS[row + Math.min(last, Math.max(0, i + a - 1))]!;
    h += wy[b]! * s;
  }
  return h;
}

/**
 * The heights and the ways (below) go to the GPU as one table, `uWorks`, WIDE texels a row: the land's material reads
 * it and the four cover maps, and no more, so that it keeps the texture units its lights need (units.ts). The heights
 * first, one to a texel in its red, `H.n` to a grid row and row after row from the south; the ways after them.
 */
const WIDE = 1024;
const HEIGHT_ROWS = Math.ceil((H.n * H.n) / WIDE);

/** GLSL: `float heightsAt(vec2 q)`, q metres east and north, as `heightsAt`. Uniform uWorks. */
export const HEIGHTS_GLSL = /* glsl */ `
  uniform highp sampler2D uWorks;
  float heightAt(ivec2 c) {
    int i = c.y * ${H.n} + c.x;
    return texelFetch(uWorks, ivec2(i % ${WIDE}, i / ${WIDE}), 0).r;
  }
  vec4 heightsSpline(float t) {
    float t2 = t * t, t3 = t2 * t;
    return vec4((1.0 - t) * (1.0 - t) * (1.0 - t), 3.0 * t3 - 6.0 * t2 + 4.0, -3.0 * t3 + 3.0 * t2 + 3.0 * t + 1.0, t3) / 6.0;
  }
  float heightsAt(vec2 q) {
    vec2 u = (q + ${glsl(H.half)}) / ${glsl(H.step)};
    vec2 i = floor(u);
    vec4 wx = heightsSpline(u.x - i.x), wy = heightsSpline(u.y - i.y);
    float h = 0.0;
    for (int b = 0; b < 4; b++) {
      float s = 0.0;
      for (int a = 0; a < 4; a++)
        s += wx[a] * heightAt(clamp(ivec2(i) + ivec2(a - 1, b - 1), ivec2(0), ivec2(${H.n - 1})));
      h += wy[b] * s;
    }
    return h;
  }`;

// ---------------------------------------------------------------------------------------------------------------
// The ways (rails, roads, tracks, a graded strip): a table the terrain's shader reads per pixel, so a way is drawn
// sharp at any distance and fades to its tone once it is under a pixel. In `uWorks` after the heights: each
// segment as two texels, (x0, y0, x1, y1) and (kind, half its breadth, how far along its way it starts, its way's
// number); then a grid of WAYS_GRID cells a side, each (its first entry, how many) in the list that follows of the
// segments that come within reach of it. Metres east and north.

/** The ways' kinds, as the shader numbers them. */
export const WAY = { rail: 0, road: 1, track: 2, graded: 3 } as const;
const WAYS_GRID = 64;
/** How far round a way its marks reach (a rail's banks, a road's windrows and verge), metres past half its breadth. */
const WAYS_REACH = 8;

/** How many tracks a fan has all round (some of them run only a while), and within what distance of its place (from, to: metres) it fades out. */
const FAN_LANES = 120;
const FAN_NEAR: [number, number] = [220, 520];

const ways = TYURATAM_WORKS.filter((w) => w.line && w.frames === 'both');
const WAYS = (() => {
  const segs: number[][] = [];
  ways.forEach((w, n) => {
    const line = w.line!;
    let along = 0;
    for (let i = 0; i + 1 < line.length; i++) {
      const [ax, ay] = line[i]!;
      const [bx, by] = line[i + 1]!;
      segs.push([ax, ay, bx, by, WAY[w.kind as keyof typeof WAY], w.width! / 2, along, n]);
      along += Math.hypot(bx - ax, by - ay);
    }
  });
  const half = H.half;
  const cell = (2 * half) / WAYS_GRID;
  const cells: number[][] = [];
  const list: number[] = [];
  for (let gy = 0; gy < WAYS_GRID; gy++)
    for (let gx = 0; gx < WAYS_GRID; gx++) {
      const cx = -half + (gx + 0.5) * cell,
        cy = -half + (gy + 0.5) * cell;
      const start = list.length;
      segs.forEach((s, k) => {
        // the segment's distance from the cell's middle, against the cell's half diagonal and the way's reach
        const [ax, ay, bx, by, , hw] = s as [number, number, number, number, number, number];
        const dx = bx - ax,
          dy = by - ay;
        const t = Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / (dx * dx + dy * dy)));
        const d = Math.hypot(cx - ax - t * dx, cy - ay - t * dy);
        if (d <= cell * Math.SQRT1_2 + hw + WAYS_REACH) list.push(k);
      });
      cells.push([start, list.length - start]);
    }
  const rows = (n: number) => Math.max(1, Math.ceil(n / WIDE));
  const at = { segs: HEIGHT_ROWS, cells: 0, list: 0, height: 0 };
  at.cells = at.segs + rows(2 * segs.length);
  at.list = at.cells + rows(cells.length);
  at.height = at.list + rows(list.length);
  const data = new Float32Array(WIDE * at.height * 4);
  const put = (row: number, i: number, v: number[]) => data.set(v, ((row + Math.floor(i / WIDE)) * WIDE + (i % WIDE)) * 4);
  HEIGHTS.forEach((h, i) => put(0, i, [h]));
  segs.forEach((s, k) => {
    put(at.segs, 2 * k, s.slice(0, 4));
    put(at.segs, 2 * k + 1, s.slice(4, 8));
  });
  cells.forEach((v, j) => put(at.cells, j, v));
  list.forEach((v, j) => put(at.list, j, [v]));
  const texture = new THREE.DataTexture(data, WIDE, at.height, THREE.RGBAFormat, THREE.FloatType);
  texture.needsUpdate = true;
  return { at, texture, half, cell, count: segs.length };
})();

/**
 * GLSL both the cover's bake and the terrain's shader use (after HEIGHTS_GLSL, which declares uWorks): `void waysAt(vec2 q, out vec4 way[4])`, for each kind of way
 * (WAY) the nearest: (how far across from its middle, signed, m; half its breadth; how far along it, m; its way's
 * number), or a distance of 1e4 where none is near. And the fans of tracks over the worked ground (FANS):
 * `float fansAt(vec2 q, out float across, out float lane)`, how much of a track lies at q (0 to 1), how far across it q
 * is (m) and which track it is. q metres east and north.
 */
export const WAYS_GLSL = /* glsl */ `
  vec4 waysTexel(int row, int i) {
    return texelFetch(uWorks, ivec2(i % ${WIDE}, row + i / ${WIDE}), 0);
  }
  void waysAt(vec2 q, out vec4 way[4]) {
    for (int k = 0; k < 4; k++) way[k] = vec4(1e4, 0.0, 0.0, 0.0);
    ivec2 g = ivec2(floor((q + ${glsl(WAYS.half)}) / ${glsl(WAYS.cell)}));
    if (g.x < 0 || g.y < 0 || g.x >= ${WAYS_GRID} || g.y >= ${WAYS_GRID}) return;
    vec4 c = waysTexel(${WAYS.at.cells}, g.y * ${WAYS_GRID} + g.x);
    int start = int(c.x + 0.5), n = int(c.y + 0.5);
    for (int j = 0; j < n; j++) {
      int s = int(waysTexel(${WAYS.at.list}, start + j).x + 0.5);
      vec4 e = waysTexel(${WAYS.at.segs}, 2 * s), info = waysTexel(${WAYS.at.segs}, 2 * s + 1);
      vec2 a = e.xy, ab = e.zw - e.xy;
      float len = length(ab);
      float t = clamp(dot(q - a, ab) / (len * len), 0.0, 1.0);
      vec2 off = q - a - ab * t;
      float d = length(off);
      int kind = int(info.x + 0.5);
      if (d < abs(way[kind].x)) way[kind] = vec4(sign(ab.x * off.y - ab.y * off.x) * d, info.y, info.z + t * len, info.w);
    }
  }
  uniform vec2 uFans[${FANS.length}];
  // one fan's track at q: how much (0 to 1), how far across it, which
  float fanAt(vec2 q, int k, out float across, out float lane) {
    vec2 d = q - uFans[k];
    float r = length(d);
    across = 1e4;
    lane = 0.0;
    // (near the place itself the traffic spreads over its own made ground and the fan is lost in it)
    if (r < ${glsl(FAN_NEAR[0])}) return 0.0;
    float step_ = 6.2832 / ${FAN_LANES.toFixed(1)};
    float u = atan(d.y, d.x) / step_ + 1.4 * (noise2(vec2(r * 0.004, float(k) * 7.0), 141) - 0.5);
    float best = 0.0;
    for (int o = -1; o <= 1; o++) {
      float l = floor(u) + float(o);
      float id = mod(l, ${FAN_LANES.toFixed(1)}) + float(k) * ${FAN_LANES.toFixed(1)};
      float h = hash2(ivec2(int(id), k), 142);
      float a = (u - l - 0.5 - 0.7 * (h - 0.5)) * step_ * r;   // metres across, from the track's middle
      float w = mix(1.6, 4.5, hash2(ivec2(int(id), k), 143));   // half its breadth
      // a track runs a while and gives out; some are only a few hundred metres long
      float runs = smoothstep(0.36, 0.52, noise2(vec2(r * 0.005, id * 1.7), 144));
      // (with the dust its wheels throw up lying either side of it, paler than the ground, to twice its breadth)
      float on = max(1.0 - smoothstep(w * 0.55, w, abs(a)), 0.45 * (1.0 - smoothstep(w, 2.4 * w, abs(a)))) * runs;
      if (on > best) { best = on; across = a; lane = id; }
    }
    return best * smoothstep(${glsl(FAN_NEAR[0])}, ${glsl(FAN_NEAR[1])}, r);
  }
  float fansAt(vec2 q, out float across, out float lane) {
    // the nearest place the tracks run to, and the next: where the two fans meet, their tracks cross
    float d1 = 1e9, d2 = 1e9;
    int k1 = 0, k2 = 0;
    for (int k = 0; k < ${FANS.length}; k++) {
      float d = length(q - uFans[k]);
      if (d < d1) { d2 = d1; k2 = k1; d1 = d; k1 = k; }
      else if (d < d2) { d2 = d; k2 = k; }
    }
    float a2, l2;
    float t = fanAt(q, k1, across, lane);
    float t2 = fanAt(q, k2, a2, l2) * (1.0 - smoothstep(0.0, 350.0, d2 - d1));
    if (t2 > t) { t = t2; across = a2; lane = l2; }
    return t;
  }`;

/**
 * GLSL for the terrain's paint: `void paintWorks(vec2 p, vec4 B, inout Ground g)`, the ways and the fans' tracks laid
 * on the ground at p (the land's frame: +Y south). B is the cover's second map: its red, how worked the ground is.
 */
export const WORKS_PAINT = /* glsl */ `
  void paintWorks(vec2 p, vec4 B, inout Ground g) {
    vec2 q = vec2(p.x, -p.y);
    vec4 way[4];
    waysAt(q, way);
    bool cel = uCel > 0.5;
    vec3 dust = ${vec3(STEPPE.dust)}, rut = ${vec3(STEPPE.rut)};
    // The fans over the worked ground: a track is two wheels' ruts in pale dust, 3 to 6 m of it; under two pixels, its tone
    // (not inside the pad's fence, whose ground is its own: tyuratam.ts fenced)
    float worked = smoothstep(0.12, 0.4, B.r) * smoothstep(-20.0, 20.0, -fenced(p));
    if (worked > 0.0) {
      float across, lane;
      float t = fansAt(q, across, lane) * worked;
      if (t > 0.0) {
        float band = t * mix(0.6, 1.0, seen(3.0));
        // (the ruts of the wheels: two of them, 1.6 m apart, in the track's middle; several such pairs in a broad one)
        float off = across + 0.3 * (noise(vec3(p * 0.05, lane)) - 0.5);
        float pair = off - 3.4 * floor(off / 3.4 + 0.5);
        float wheels = (1.0 - smoothstep(0.12, 0.26, abs(abs(pair) - 0.8))) * smoothstep(0.7, 1.0, t);
        if (cel) {
          g.albedo = mix(g.albedo, dust * 1.1, step(0.5, band) * seen(4.0));
          g.albedo = mix(g.albedo, g.albedo * 0.72, step(0.5, wheels) * seen(0.25));
        } else {
          g.albedo = mix(g.albedo, dust * 1.06, 0.7 * band);
          g.albedo = mix(g.albedo, rut, 0.65 * wheels * seen(0.25));
          g.bump += -0.012 * wheels * seen(0.25);
        }
      }
    }
    // a dirt track (2) and a graded strip (3): pale dust the breadth of the way, its edge wandering; in it, the ruts of
    // two wheels braided across it, coming and going along it
    for (int k = 2; k <= 3; k++) {
      vec4 w = way[k];
      float half_ = w.y;
      if (abs(w.x) > half_ + 3.0) continue;
      float s = w.x + 0.12 * half_ * (noise(vec3(w.z * 0.02, w.w, 150.0)) - 0.5) * 2.0;
      float band = 1.0 - smoothstep(half_ * 0.7, half_ + 1.0, abs(s));
      // (a way under a pixel or two broad is its tone, faded with how much of a pixel it covers: no dashes from height)
      float seenWay = seen(2.0 * half_);
      if (k == 3) {
        g.albedo = cel ? mix(g.albedo, dust * 1.14, step(0.5, band) * seenWay) : mix(g.albedo, dust * 1.08 * (0.96 + 0.08 * noise(vec3(p * 0.1, 151.0))), band);
        continue;
      }
      float lanes = s + 1.6 * (noise(vec3(w.z * 0.008, w.w, 152.0)) - 0.5);
      float f = lanes - 3.4 * floor(lanes / 3.4 + 0.5);
      float wheels = (1.0 - smoothstep(0.12, 0.26, abs(abs(f) - 0.8))) * smoothstep(0.35, 0.6, noise(vec3(w.z * 0.01, floor(lanes / 3.4 + 0.5), w.w + 153.0))) * band;
      if (cel) {
        g.albedo = mix(g.albedo, dust * 1.1, step(0.5, band) * seenWay);
        g.albedo = mix(g.albedo, g.albedo * 0.72, step(0.5, wheels) * seen(0.25));
      } else {
        g.albedo = mix(g.albedo, dust * (0.98 + 0.06 * noise(vec3(p * 0.3, 154.0))), 0.85 * band);
        g.albedo = mix(g.albedo, rut, 0.6 * wheels * seen(0.25));
        g.bump += -0.015 * wheels * seen(0.25);
      }
    }
    // a road of graded earth: a crown of packed earth, paler, a windrow of what the grader pushed aside along each edge,
    // two wheel tracks pressed into it, and a margin of loose dust
    {
      vec4 w = way[1];
      float half_ = w.y, a = abs(w.x);
      if (a < half_ + 4.0) {
        float crown = 1.0 - smoothstep(half_ - 0.15, half_ + 0.15, a);
        float windrow = (1.0 - smoothstep(0.25, 0.6, abs(a - half_ - 0.55))) * seen(0.6);
        float margin = (1.0 - smoothstep(half_, half_ + 3.5, a)) * (1.0 - crown);
        float tracks = (1.0 - smoothstep(0.25, 0.45, abs(a - half_ * 0.45))) * crown * seen(0.4);
        vec3 packed = mix(dust, ${vec3(STEPPE.loam)}, 0.25) * 1.06 * (0.97 + 0.05 * noise(vec3(p * 0.6, 155.0)));
        if (cel) {
          g.albedo = mix(g.albedo, dust * 1.1, step(0.5, margin));
          g.albedo = mix(g.albedo, dust * 1.18, crown);
          g.albedo = mix(g.albedo, g.albedo * 0.72, step(0.5, max(windrow, tracks)) * seen(0.3));
        } else {
          g.albedo = mix(g.albedo, dust, 0.6 * margin);
          g.albedo = mix(g.albedo, packed, crown);
          g.albedo = mix(g.albedo, packed * 0.86, 0.6 * tracks);
          g.albedo = mix(g.albedo, ${vec3(STEPPE.loamDark)}, 0.5 * windrow);
          g.bump += 0.04 * windrow - 0.01 * tracks;
          g.rough = mix(g.rough, 0.95, crown);
        }
      }
    }
    // a railway: the bed of grey ballast, the sleepers and the two rails where they can be made out, and the embankment's
    // banks of bare earth either side down to its toe
    {
      vec4 w = way[0];
      float half_ = w.y, a = abs(w.x);
      float bank = half_ + 4.0;
      if (a < bank + 1.0) {
        float bed = 1.0 - smoothstep(1.6, 1.9, a);
        float banks = (1.0 - smoothstep(bank - 0.6, bank + 0.6, a)) * (1.0 - bed);
        float toe = (1.0 - smoothstep(0.2, 0.6, abs(a - bank))) * seen(0.8);
        vec3 earth = mix(${vec3(STEPPE.loamDark)}, dust, 0.35) * (0.95 + 0.08 * noise(vec3(p * 0.4, 156.0)));
        vec3 ballast = vec3(0.33, 0.32, 0.30) * (0.85 + 0.3 * mix(0.5, noise(vec3(p * 22.0, 157.0)), seen(0.04)));
        float tie = (1.0 - smoothstep(0.11, 0.14, abs(fract(w.z / 0.55) - 0.5) * 0.55)) * step(a, 1.35) * seen(0.25);
        float steel = (1.0 - smoothstep(0.03, 0.05, abs(a - 0.79))) * seen(0.07);
        if (cel) {
          g.albedo = mix(g.albedo, earth * 1.12, step(0.5, banks));
          g.albedo = mix(g.albedo, vec3(0.42, 0.41, 0.39), bed);
          g.albedo = mix(g.albedo, g.albedo * 0.62, step(0.5, max(max(tie, steel), toe)) * max(bed, toe));
        } else {
          g.albedo = mix(g.albedo, earth, banks);
          g.albedo = mix(g.albedo, earth * 0.88, 0.5 * toe);
          g.albedo = mix(g.albedo, ballast, bed);
          g.albedo = mix(g.albedo, vec3(0.13, 0.1, 0.08), tie * bed);
          g.albedo = mix(g.albedo, vec3(0.42, 0.4, 0.38), steel * bed);
          g.rough = mix(g.rough, 0.45, steel * bed);
          g.bump = mix(g.bump, 0.01 * (noise(vec3(p * 12.0, 158.0)) - 0.5), bed);
        }
      }
    }
  }`;

/** The uniforms the GLSL above reads. */
export const worksUniforms = (): Record<string, THREE.IUniform> => ({
  uWorks: { value: WAYS.texture },
  uFans: { value: FANS.map((f) => new THREE.Vector2(f.at[0], f.at[1])) },
});

/** For the cover's bake (tyuratam.ts KINDS): the worked areas and the ways, each a ring or a line with half its breadth. */
export const WORKS_FOR_KINDS = TYURATAM_WORKS.filter((w) => w.frames === 'both').map((w) => ({
  kind: w.kind,
  rings: w.ring ? [w.ring, ...(w.holes ?? [])] : [],
  line: w.line ?? null,
  half: (w.width ?? 0) / 2,
}));

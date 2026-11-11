import * as THREE from 'three';
import type { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';
import { type Clouds, cloudMiddle, cloudNoiseGlsl, cloudRise, cloudUniform, hazeAboveUniform, installedAir } from './air';
import { fieldAs, hash2 } from './field';
import { uOrigin } from './origin';

/** The layer the veils are drawn again on (nothing else uses it): see `drawVeils`. */
const VEIL_LAYER = 7;

/**
 * The cumulus as a volume: air.ts's cloud field, heaped into clouds and marched through.
 *
 * A cloud stands where the field's noise is over its cut (`cloudMiddle`, which makes the record's
 * cover), on a flat base at the layer's height, and rises the higher the further the noise is over
 * it, to the layer's full depth in the heart of the biggest: a fair-weather heap, wider than it is
 * tall. Billows, round lumps of three sizes (a tiling 3D noise of cells, `billows`), stand out from
 * it and cut into it, small at the foot and quickly bigger above, so a cumulus is cauliflower on top;
 * the base is left flat, and lit a lighter grey by the ground. The billows churn slowly upward
 * (`cloudRise`) as the field drifts.
 *
 * Each frame drawn, a ray from the eye through each pixel of a target half the window's size each
 * way (in CSS pixels, so a sixteenth of a dense screen's) is marched through the layer, as far as
 * the scene's depth or the haze lets anything through. Over clear air it strides: the field is
 * baked round the eye into a texture, with a map of how far each 128 m cell is from any that could
 * hold cloud, and nearer cloud it steps by how far outside the heap it is. Where it crosses into a
 * cloud the surface is found by bisection and the march goes on from there in steps laid from the
 * surface, short at first, so neighbouring pixels sample the cloud's skin alike: no rings, and no
 * noise to hide them with. At each step inside, the light is marched toward the Sun (Beer and
 * Lambert, with octaves of multiple scattering and a powder term where the cloud is thin), and the
 * sky and the ground light it from above and below, less in the creases. Each step is seen through
 * the haze between it and the eye, as anything else is (air.ts). The layer lies on the Earth's
 * curve, so downrange the clouds stay at their height over the sea.
 *
 * Far off, past what is baked or where a cloud is a few of the march's pixels across (`near`), the
 * same field is drawn flat on a shell through the layer instead (`farCover`), fading in as the
 * volume fades out; where its clouds are under a pixel it is the record's cover, evenly. That is
 * worked out for each pixel of the frame as the clouds are laid over it, not marched: it is one
 * reading of the field, and far clouds are the small ones. So from orbit the whole Earth in view
 * has its tenth of cumulus, and nothing shimmers. Their shadows are air.ts's (`cloudShade`), on the
 * ground and the globe alike.
 *
 * The march is brought up to the frame's size and laid over it in the output's own pass, as the
 * frame goes to the screen (`adopt`). Besides its colour and opacity each low pixel keeps where
 * along its ray the cloud began and where it became half opaque; a pixel of the frame takes cloud
 * from its low neighbours only as far as its own surface lies past those, so the rocket and the
 * gantry cut the clouds on their own edges, not on a coarse pixel's. A cloud's own outline is
 * marched a second time at the frame's pixels (`CloudPass.fine`), only there, so it is not in the
 * first march's steps. How far off the scene's surface is, is read with the depth buffer's own
 * coarseness allowed for (`sceneDistance`): from orbit one step of it is kilometres. The fire and
 * its trail write no depth (`veils`): they are drawn again on their own, and cloud behind them is
 * seen through them only as much as they let through. In the cel look the cloud is a drawing: its
 * opacity is cut at one half and its light in two flat tones, at the frame's resolution, so the
 * edge is clean.
 *
 * Nothing in it moves by itself between frames (no temporal jitter), so a still view of drifting
 * cloud does not shimmer. Glass, which writes no depth either, is still laid over by cloud behind it.
 */

/** Texels a side of the baked field, and metres a texel: 131 km across, laid round the eye. */
const SIDE = 4096;
const TEXEL = 32;
const EXTENT = SIDE * TEXEL;
/** The two maps of where there is cloud: cells this many metres across (whole texels of the field). */
const CELL = 128;
/** How many cells round each the map of clear air looks for cloud: so the longest stride over it is 3.8 km. */
const REACH = 24;
/** The bake is centred on multiples of this, which is whole cells and whole tiles of the billows: nothing moves when it is baked again. */
const SNAP = 2048;
/** The field is baked again once the eye is this far over it from the middle of the last bake. */
const REBAKE = 16000;
/** Clouds fade out between these distances from the eye (horizontally), within what is baked. */
const FADE: [number, number] = [32000, 48000];
/** Clouds fade from the volume to the flat far layer as a low pixel grows from the first to the second, in metres. */
const SMALL: [number, number] = [50, 110];
/** Half the breadth of the field's soft edge, in the noise's units (air.ts). */
const SOFT = 0.1;
/** The billows' noise: texels a side, and metres before it repeats. */
const NOISE = 64;
const TILE = 1024;
/** Extinction in the heart of a cloud, per metre: 100 m of cloud dims what is behind it to 5 %. */
const SIGMA = 0.03;
/** The baked field stores the noise's excess over its cut, from BELOW under it to RANGE - BELOW over it. */
const BELOW = 0.1;
const RANGE = 0.4;
/** Excess at which a cloud's top reaches the layer's full depth: the noise's greatest, 0.22 over the cut (its 99th percentile is 0.11). */
const TOWER = 0.2;
/** A cloud's top rises as this power of the distance in from its edge: under 1, so its sides are steep and its top rounded. */
const DOME = 0.8;
/**
 * Metres from a cloud's edge per unit of excess, for every metre of the field's cells (Clouds.size):
 * the reciprocal of the noise's mean slope, 5.3e-4 a metre at 900 m cells.
 */
const SIDE_PER_SIZE = 2000 / 900;
/** How far the billows stand out from a cloud's dome at its top, metres (and as far again cut into it). */
const BILLOW = 140;
/** The billows' mean (billows()), about which they stand out and cut in; and how far out they stand at most, as a multiple of their size. */
const LUMPS = 0.54;
const STANDS = 2 * (1 - LUMPS);
/** How far the lumps over a cloud's base dent it up or hang it down, metres: its flatness is the condensation level's, give or take. */
const BASE_DENT = 60;
/** Billows at a cloud's foot, metres: over half the top's, so the rim of a flat base is ragged, not the clean edge of a saucer seen from under it. */
const FOOT = 80;
/**
 * The least excess at which there can be cloud at any height (`side`: SIDE_PER_SIZE times the
 * cells' size): where the billows at their highest (STANDS times their size) stand out further than
 * the dome is in from its edge. The dome narrows upward faster than the billows grow, so this is at
 * the foot, a little outside the field's edge.
 */
const reaches = (side: number): number =>
  Math.min(
    ...Array.from({ length: 101 }, (_, i) => {
      const y = i / 100;
      return (TOWER * side * y ** (1 / DOME) - STANDS * (FOOT + (BILLOW - FOOT) * Math.sqrt(y))) / side;
    }),
  );
/** The Earth's mean radius: the layer is a shell this far plus its height from the centre under the site. */
const EARTH = 6_371_000;

const VERTEX = /* glsl */ `
  in vec3 position;
  in vec2 uv;
  out vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/** The cloud noise baked round the eye: its excess over the cut, from -BELOW to RANGE - BELOW, as 0 to 1. */
const bakeShader = (c: Clouds) => /* glsl */ `
  precision highp float; precision highp int;
  uniform vec2 uCorner;
  out vec4 oValue;
  ${fieldAs('bake_')}
  ${cloudNoiseGlsl(c, 'bake_')}
  void main() {
    float n = cloudNoise(uCorner + gl_FragCoord.xy * ${TEXEL.toFixed(1)});
    oValue = vec4(clamp((n - ${cloudMiddle(c).toFixed(4)} + ${BELOW.toFixed(3)}) / ${RANGE.toFixed(3)}, 0.0, 1.0), 0.0, 0.0, 1.0);
  }`;

/**
 * Where there is cloud, coarsely, for striding over clear air: the largest value over each block of
 * the texture below (`uMode` 0, `uBlock` texels a side); then how many cells away the nearest one
 * with any cloud in it is, in one row (1) and then in any direction (2: the larger of the two
 * offsets, so a square), up to REACH cells, as a count out of 255.
 */
const REDUCE = /* glsl */ `
  precision highp float; precision highp int;
  uniform sampler2D tFrom;
  uniform int uMode, uBlock;
  uniform float uOccupied;
  out vec4 oValue;
  void main() {
    ivec2 at = ivec2(gl_FragCoord.xy), size = textureSize(tFrom, 0);
    float m = 0.0;
    if (uMode == 0) {
      for (int y = 0; y < uBlock; y++) for (int x = 0; x < uBlock; x++) m = max(m, texelFetch(tFrom, at * uBlock + ivec2(x, y), 0).r);
    } else if (uMode == 1) {
      m = ${REACH + 1}.0;
      for (int x = -${REACH}; x <= ${REACH}; x++)
        if (texelFetch(tFrom, clamp(at + ivec2(x, 0), ivec2(0), size - 1), 0).r > uOccupied) m = min(m, float(abs(x)));
      m /= 255.0;
    } else {
      m = ${REACH + 1}.0;
      for (int y = -${REACH}; y <= ${REACH}; y++)
        m = min(m, max(float(abs(y)), texelFetch(tFrom, clamp(at + ivec2(0, y), ivec2(0), size - 1), 0).r * 255.0));
      m /= 255.0;
    }
    oValue = vec4(m, 0.0, 0.0, 1.0);
  }`;

/** What the march and the composite share: the scene's depth, as distance along the ray. */
const DEPTH = /* glsl */ `
  uniform sampler2D tDepth;
  uniform mat4 uProjInv;
  uniform vec2 uRange;
  // the ray through a point of the frame, in the camera's frame
  vec3 viewRay(vec2 uv) {
    vec4 v = uProjInv * vec4(uv * 2.0 - 1.0, 1.0, 1.0);
    return normalize(v.xyz / v.w);
  }
  // How far along that ray the scene's surface is, at the furthest the depth buffer can mean by what it holds; the sky
  // is endlessly far. The buffer has 24 bits, and far off one step of it is a long way (from 187 km up, with the near
  // plane at 2 m, 2 km at the sea under the eye and 150 km at the horizon): a cloud a kilometre over the sea was in
  // front of it in one pixel and behind it in the next, in blocks and streaks. So the surface is taken to be eight
  // steps further off than the buffer says (the vertex's own arithmetic, in floats, is good to a few steps and no
  // better): what stands in front of a cloud by less than that cannot be told from what stands behind it, and far
  // off it is the ground, which is under the clouds. Near the eye eight steps are nothing (a quarter of a
  // millimetre at 30 m), so the rocket still cuts the cloud on its own edge.
  float sceneDistance(float depth, vec3 ray) {
    if (depth >= 1.0) return 1e9;
    float n = uRange.x, f = uRange.y;
    float z = n * f / (f * (1.0 - depth) + n * depth); // (1 - depth first: near 1 the buffer's steps are all the figures a float has)
    z += z * z * (f - n) / (n * f) * ${(8 / 2 ** 24).toExponential(4)};
    return z / max(-ray.z, 1e-4);
  }`;

/**
 * What the march and the composite share of the layer: heights over the Earth's curve, how much of a
 * cloud is drawn as a volume, the haze.
 */
const LAYER = /* glsl */ `
  uniform float uEyeH;       // the eye's height above the sea
  uniform float uRe;         // the Earth's radius plus that
  uniform vec3 uUp;          // straight up at the eye
  uniform float uPixel;      // radians a pixel of the march's target
  uniform float uHazeDensity, uScale;   // the haze's density at the sea, and the height over which it falls by e
  #define EARTH ${EARTH.toFixed(1)}
  // the height above the sea of a point v from the eye, on the Earth's curve (in the small form: floats hold it)
  float heightAt(vec3 v) {
    float s = 2.0 * uRe * dot(uUp, v) + dot(v, v);
    return uEyeH + s / (sqrt(uRe * uRe + s) + uRe);
  }
  // how much of the cloud at v from the eye is drawn as a volume: all of it near, none far off (round the eye, past
  // what is baked) or where a cloud is no more than a few of the march's pixels across; the rest is drawn flat (farCover)
  float near(vec3 v) {
    return (1.0 - smoothstep(${FADE[0].toFixed(1)}, ${FADE[1].toFixed(1)}, length(v.xz))) * (1.0 - smoothstep(${SMALL[0].toFixed(1)}, ${SMALL[1].toFixed(1)}, length(v) * uPixel));
  }
  // the haze's mean density between two heights (in its scale heights), as a fraction of the sea's (air.ts: airFog)
  float hazeMean(float a, float b) { return abs(a - b) < 1e-3 ? exp(-0.5 * (a + b)) : (exp(-min(a, b)) - exp(-max(a, b))) / abs(b - a); }`;

/** The field's noise with a cell one unit across: the composite, which is compiled before the clouds are known, is given their size. */
const UNIT: Clouds = { height: 0, depth: 0, cover: 0, size: 1, wind: [0, 0] };

/**
 * The march. `sharpen`: the same again at twice the size each way, only where the first's neighbours
 * disagree about how much cloud there is (a silhouette), blended with its own last result as the
 * first is by SETTLE.
 */
const marchShader = (clouds: Clouds, sharpen: boolean) => /* glsl */ `
  precision highp float; precision highp int; precision highp sampler3D;
  ${DEPTH}
  ${LAYER}
  uniform sampler2D tField, tClear;
  uniform sampler3D tBillows;
  uniform mat3 uTurn;        // the camera's turn: its frame to the world's
  uniform vec2 uLow;         // this target's size, pixels
  uniform float uGrain;      // radians a pixel of it
  uniform vec2 uEye;         // the eye in the baked field's frame, metres from its corner
  uniform vec2 uLayer;       // the clouds' base and greatest top above the sea
  uniform float uRise;       // how far the billows have risen
  uniform float uDome;       // a dome's height for each metre^DOME in from its edge
  uniform vec3 uSun, uSunLight, uSkyLight, uGroundLight, uHaze;
  uniform sampler2D tLow, tOld0, tOld1;   // (sharpen) the first march's light and opacity; this one's last results
  uniform float uKeep;
  in vec2 vUv;
  layout(location = 0) out vec4 oColour;   // light sent toward the eye (premultiplied), and opacity
  layout(location = 1) out vec4 oInfo;     // where the cloud began, where it was half opaque; its light (cel) and haze, per opacity

  #define EXTENT ${EXTENT.toFixed(1)}
  #define TILE ${TILE.toFixed(1)}
  #define SIGMA ${SIGMA.toFixed(4)}

  // where the ray meets the sphere h above the sea: the nearer and further crossing; x > y if it misses
  vec2 shell(float h, float ud) {
    float b = uRe * ud;
    float c = (uEyeH - h) * (uRe + EARTH + h);
    float disc = b * b - c;
    if (disc < 0.0) return vec2(1.0, -1.0);
    float q = -(b + (b >= 0.0 ? 1.0 : -1.0) * sqrt(disc));
    float t0 = q, t1 = c / q;
    return vec2(min(t0, t1), max(t0, t1));
  }

  // how big the billows are at a height in the layer: quickly bigger above the foot, so a low cloud has turrets too
  float billow(float y) { return mix(${FOOT.toFixed(1)}, ${BILLOW.toFixed(1)}, sqrt(max(y, 0.0))); }

  // how far inside a cloud the point v from the eye is, metres, roughly (negative outside); f: the same point in the
  // baked field's frame; y: its height in the layer, 0 at the base to 1 at the greatest top
  float inside(vec3 v, vec2 f, float lod, out float y, bool billowed) {
    float depth = uLayer.y - uLayer.x;
    float h = heightAt(v) - uLayer.x;
    y = h / depth;
    if (h < 0.0) return h;
    if (y > 1.0) return (1.0 - y) * depth;
    float x = texture(tField, f / EXTENT).r * ${RANGE.toFixed(3)} - ${BELOW.toFixed(3)};
    // the heap: a dome on the field, rising from its edge as the DOME power of the distance in from it, so steeply at
    // first and then rounding over; the biggest (the noise furthest over its cut) reaching the layer's full depth.
    // Measured across (metres in from its side at this height), so the sides are as sharp as the top.
    float heap = x * ${(SIDE_PER_SIZE * clouds.size).toFixed(1)} - pow(h / uDome, ${(1 / DOME).toFixed(4)});
    if (!billowed || heap <= -${STANDS.toFixed(3)} * billow(y)) return heap; // (no billow reaches out so far)
    // and billows heaped on it and cut into it, bigger the higher up: lumps of 200, 95 and 45 m, so a cumulus is
    // cauliflower at the top and only scalloped at the foot
    vec3 b = textureLod(tBillows, vec3(f.x, h - uRise, f.y) / TILE, lod).rgb;
    float lumps = dot(b, vec3(0.45, 0.33, 0.22)) - ${LUMPS.toFixed(3)};
    float sd = heap + billow(y) * 2.0 * lumps;
    // the base is flat, give or take the lumps over it: a plane exactly level met by an even wall drew, from under
    // it, the same clean ring round every cloud, stacked like saucers; dented a little, its rim wanders as a real one does
    return min(sd, h + ${BASE_DENT.toFixed(1)} * lumps);
  }
  // the cloud's extinction there, per metre: rising over \`ramp\` metres from its surface, and fading out far from the eye
  float density(vec3 v, float ramp, float lod, out float y, out float sd, bool billowed) {
    sd = inside(v, uEye + v.xz, lod, y, billowed);
    return SIGMA * smoothstep(0.0, ramp, sd) * near(v);
  }

  float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * c, 1.5); }
  // forward scattering with a little back: so the side toward the Sun is bright and a thin edge against it glows
  float phase(float c, float g) { return mix(hg(c, g), hg(c, -0.2), 0.3); }

  // the fraction of the light lost to the haze between the eye and a point at height h above the sea and d away (air.ts: airFog)
  float hazeLost(float h, float d) {
    return 1.0 - exp(-uHazeDensity * d * hazeMean(max(uEyeH, 0.0) / uScale, max(h, 0.0) / uScale));
  }

  void marched() {
    vec2 px = 0.5 / uLow;
    // the furthest of the scene under this pixel: the frame's pixels nearer than the cloud are cut out when it is laid over
    float depth = max(max(texture(tDepth, vUv + vec2(-0.5, -0.5) * px).x, texture(tDepth, vUv + vec2(0.5, -0.5) * px).x),
                      max(texture(tDepth, vUv + vec2(-0.5, 0.5) * px).x, texture(tDepth, vUv + vec2(0.5, 0.5) * px).x));
    vec3 ray = viewRay(vUv);
    float far = sceneDistance(depth, ray);
    vec3 dir = normalize(uTurn * ray);
    oColour = vec4(0.0);
    oInfo = vec4(6e4, 6.1e4, 0.0, 0.0);

    // the stretch of the ray inside the layer
    float ud = dot(uUp, dir);
    vec2 base = shell(uLayer.x, ud), top = shell(uLayer.y, ud);
    float t0, t1;
    if (uEyeH < uLayer.x) {
      t0 = base.y;
      t1 = top.y;
    } else if (uEyeH < uLayer.y) {
      t0 = 0.0;
      t1 = base.x <= base.y && base.x > 0.0 ? base.x : top.y;
    } else {
      if (top.x > top.y || top.y < 0.0) return;
      t0 = max(top.x, 0.0);
      t1 = base.x <= base.y && base.x > 0.0 ? base.x : top.y;
    }
    // and no further than the haze lets anything through: 3 % of a cloud's light at the middle of the layer
    float mean = hazeMean(max(uEyeH, 0.0) / uScale, 0.5 * (uLayer.x + uLayer.y) / uScale);
    float seen = min(far, 3.5 / max(uHazeDensity * mean, 1e-9));
    float across = length(dir.xz);
    // the volume, as far as it is drawn as one
    t1 = min(min(t1, seen), min(across > 1e-4 ? ${FADE[1].toFixed(1)} / across : 1e9, ${SMALL[1].toFixed(1)} / uPixel));

    float cosT = dot(dir, uSun);
    vec3 phases = vec3(phase(cosT, 0.6), phase(cosT, 0.3), phase(cosT, 0.15));
    float powderMix = 0.5 - 0.5 * cosT;   // thin cloud is darker seen with the Sun behind
    float sunGain = 1.25;
    vec3 white = uSunLight + uSkyLight;
    float whiteLum = max(dot(white, vec3(0.2126, 0.7152, 0.0722)), 1e-5);

    float T = 1.0, lit = 0.0, haze = 0.0, front = 6e4, mid = 6e4;
    vec3 colour = vec3(0.0);
    // Outside a cloud the ray strides over clear air; where it crosses into one the surface is found exactly
    // (bisection), and the march goes on from there in steps laid from the surface, short at first. So every pixel's
    // steps lie the same way through the cloud's skin as its neighbours': no rings, and nothing to hide with noise.
    float t = t0, was = t0;
    int deep = -1; // steps taken since the surface, or -1 while outside
    for (int i = 0; i < (t1 > t0 ? 256 : 0); i++) {
      if (t >= t1 || T < 0.01) break;
      vec3 v = dir * t;
      float st = clamp(t * 0.004, 6.0, 120.0);
      float lod = max(log2(max(t * uGrain, 1.0) / ${(TILE / NOISE).toFixed(1)}), 0.0);
      float y;
      if (deep < 0) {
        vec2 cell = (uEye + v.xz) / EXTENT;
        // the nearest cloud is k cells off: so the next k - 1 cells across, less a texel the field's filter reaches, are clear
        float k = texture(tClear, cell).r * 255.0;
        if (k >= 2.0) {
          t += across > 1e-4 ? ((k - 1.0) * ${CELL.toFixed(1)} - ${TEXEL.toFixed(1)}) / across : 1e9;
          was = t;
          continue;
        }
        float sd = inside(v, uEye + v.xz, lod, y, true);
        if (sd <= 0.0) {
          // Clear air: stride as far as the heap could rise to where its billows might reach out, at its steepest;
          // among billows, which change faster, a third of the way to the nearest; close to a surface, short
          // steps, so a lump thinner than a step is not caught one frame and missed the next as the cloud drifts
          float reach = ${STANDS.toFixed(3)} * billow(clamp(y, 0.0, 1.0));
          was = t;
          t += sd < -reach ? 0.5 * st + 0.5 * (-sd - reach) : max(min(st, 0.1 * st - 0.35 * sd), -0.35 * sd);
          continue;
        }
        float a = was, b = t;
        for (int k = 0; k < 6; k++) {
          float m = 0.5 * (a + b);
          vec3 w = dir * m;
          if (inside(w, uEye + w.xz, lod, y, true) > 0.0) b = m;
          else a = m;
        }
        t = a;
        deep = 0;
      }
      float step = st * min(0.25 + 0.35 * float(deep), 1.6);
      v = dir * (t + 0.5 * step);
      float ramp = clamp(t * 0.005, 3.0, 60.0); // the skin: a few pixels deep at any distance
      float sd;
      float d = density(v, ramp, lod, y, sd, true);
      if (sd <= 0.0) {
        // out of it again, between billows or past the cloud: back to looking for cloud, from here
        t += 0.5 * step;
        was = t;
        deep = -1;
        continue;
      }
      if (d > 0.0) {
        // toward the Sun: how much cloud the light has come through
        float tau = 0.0, s = 0.0, yy, ss;
        for (int k = 0; k < 5; k++) {
          float ds = 12.0 * exp2(float(k));
          s += ds * 0.5;
          tau += density(v + uSun * s, max(ramp, 0.5 * ds), lod + float(k) * 0.5, yy, ss, k < 2) * ds; // (further off, the heap without its billows)
          s += ds * 0.5;
        }
        // octaves of scattering: each deeper one less dimmed and less forward
        float sun = phases.x * exp(-tau) + 0.4 * phases.y * exp(-tau * 0.3) + 0.22 * phases.z * exp(-tau * 0.07);
        sun *= mix(1.0, 1.0 - exp(-d * 100.0), powderMix) * sunGain;
        // the sky's light is shut out of the creases between billows and from under more cloud
        vec3 up = v + uUp * 80.0;
        float open = 1.0 - 0.4 * smoothstep(-20.0, 150.0, inside(up, uEye + up.xz, lod + 1.0, yy, true));
        // and the base, flat and facing down, is lit by the sunlit ground and the light the cloud's sides scatter
        // into it: a lighter grey than its shade, not a dark cave
        vec3 light = uSunLight * (sun + 0.08 * (1.0 - y) * max(uSun.y, 0.0))
          + (uSkyLight * (0.4 + 0.55 * y) + uGroundLight * 0.35 * (1.0 - y)) * open;
        float hz = hazeLost(y * (uLayer.y - uLayer.x) + uLayer.x, t);
        float a = 1.0 - exp(-d * min(step, t1 - t));
        float w = T * a;
        colour += w * mix(light, uHaze, hz);
        lit += w * dot(light, vec3(0.2126, 0.7152, 0.0722)) / whiteLum;
        haze += w * hz;
        T *= 1.0 - a;
        if (front > 5e4 && T < 0.98) front = t;
        if (mid > 5e4 && T < 0.5) mid = t;
      }
      t += step;
      deep++;
    }
    float opacity = 1.0 - T;
    if (opacity < 1e-4) return;
    oColour = vec4(colour, opacity);
    // (the two are kept in sixteen bits, which hold three figures: the second is past the first by more than that)
    oInfo = vec4(front, max(mid, front * 1.004 + 1.0), lit / opacity, haze / opacity);
  }

  void main() {
    ${
      sharpen
        ? /* glsl */ `
    // only where the first march's four pixels round this one disagree: on a cloud's outline, which it has in steps
    ivec2 size = textureSize(tLow, 0);
    ivec2 i0 = ivec2(floor(vUv * vec2(size) - 0.5));
    float least = 1.0, most = 0.0;
    for (int k = 0; k < 4; k++) {
      float a = texelFetch(tLow, clamp(i0 + ivec2(k & 1, k >> 1), ivec2(0), size - 1), 0).a;
      least = min(least, a);
      most = max(most, a);
    }
    if (most - least < ${EDGE.toFixed(3)}) discard;
    marched();
    // blended with what was here while the eye is still, as the first march is (SETTLE); nothing here last time says 0
    ivec2 at = ivec2(gl_FragCoord.xy);
    vec4 oc = texelFetch(tOld0, at, 0), oi = texelFetch(tOld1, at, 0);
    if (uKeep > 0.0 && oi.x > 0.0) {
      bool here = oColour.a > 1e-3, was = oc.a > 1e-3;
      oInfo = here ? (was ? mix(oInfo, oi, uKeep) : oInfo) : (was ? oi : oInfo);
      oColour = mix(oColour, oc, uKeep);
    }`
        : 'marched();'
    }
  }`;

/**
 * The clouds laid over a pixel of the frame: premultiplied colour and opacity (`cloudsOver`), for the
 * output's shader to put over what is there (adopt), or for a pass of their own (COMPOSITE). The
 * volume comes from the march, the far cover (`farCover`) is worked out here, for this pixel.
 */
const OVER = /* glsl */ `
  precision highp int;
  ${LAYER}
  uniform sampler2D tCloud, tInfo, tFine, tFineInfo, tVeil, tVeilDepth;
  uniform vec3 uSun, uSunLight, uSkyLight, uGroundLight, uHaze;
  uniform mat3 uTurn;        // the camera's turn: its frame to the world's
  uniform vec2 uField;       // the eye in the field's own frame (metres, the drift taken off)
  uniform vec2 uLayer;       // the clouds' base and greatest top above the sea
  uniform vec3 uCumulus;     // across a cloud, metres; the noise's cut; the cover
  uniform float uFine;       // radians a pixel of the frame
  uniform vec2 uFarSpan;     // between which heights (the ray's part along uUp) the far cover can be
  uniform float uCel, uVeils;
  ${fieldAs('over_')}
  ${cloudNoiseGlsl(UNIT, 'over_')}
  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

  // the cloud's two flat tones in the cel look, by how well lit it is, seen through the haze
  vec3 celTone(float l, float edge, float hz) {
    vec3 tone = mix(uSkyLight * 1.1 + uSunLight * 0.35, uSunLight * 0.95 + uSkyLight, smoothstep(0.62 - edge, 0.62 + edge, l));
    return mix(tone, uHaze, hz);
  }

  // The far clouds: the field painted flat on a shell through the layer, where the volume has faded out (near), behind
  // it. Worked out at the frame's own pixels, not the march's: far off the clouds are small, and a quarter of the
  // pixels drew them as blocks. A cloud's edge widens with the pixel, and where a cloud is under a pixel the cover is
  // the record's, evenly: so nothing too small to draw is drawn, and nothing shimmers as it drifts.
  // farWhere: how far along a ray the shell is, or -1 where there is none of it to draw; how much of it the shell's
  // limb leaves (\`limb\`), and how much the volume (\`far\`). farCover: its light and opacity there; \`dv\`, \`veil\`: the
  // nearest fire or smoke, and how much it covers.
  float farWhere(vec3 dir, out float limb, out float far) {
    limb = far = 0.0;
    float hm = mix(uLayer.x, uLayer.y, 0.3), rs = EARTH + hm;
    float ud = dot(uUp, dir), b = uRe * ud, c = (uEyeH - hm) * (uRe + rs);
    bool under = uEyeH < hm;
    // (most of the frame stops here: the rays that meet the shell, past the sea's horizon or the nearest the volume fades)
    if (ud <= uFarSpan.x || ud >= uFarSpan.y) return -1.0;
    // from above, the shell ends at its limb, a pixel or two over the Earth's: faded across a pixel there, not cut
    limb = under ? 1.0 : clamp(0.5 + (-ud - sqrt(c) / uRe) * uRe / (rs * uFine), 0.0, 1.0);
    if (limb <= 0.0) return -1.0;
    float root = sqrt(max(b * b - c, 0.0));
    float tm = under ? root - b : c / (root - b);
    far = 1.0 - near(dir * tm);
    return far > 0.0 ? tm : -1.0;
  }
  vec4 farCover(vec3 dir, float tm, float limb, float far, float dv, float veil) {
    vec3 v = dir * tm;
    vec3 up = normalize(uRe * uUp + v);
    float fp = tm * uFine / max(abs(dot(up, dir)), 0.1);   // metres of the shell a pixel
    float n = cloudNoise((uField + v.xz) / uCumulus.x);
    float w = ${SOFT.toFixed(3)} + 0.25 * fp / uCumulus.x;
    float even = smoothstep(0.08 * uCumulus.x, 0.5 * uCumulus.x, fp);
    // (spread evenly, the cover is laid on at a third of its worth: white cloud is so much brighter than the sea that the
    // record's tenth, laid on whole, veiled the Earth pale from orbit, and the look wants the sea and the coast seen: estimated)
    float a = 0.95 * mix(smoothstep(uCumulus.y - w, uCumulus.y + w, n), uCumulus.z * 0.33, even) * far * limb;
    if (a <= 0.0) return vec4(0.0);
    // its top in the Sun and the sky, or its base, lit by what the ground sends up: as the volume's are, on the whole
    float sunUp = dot(up, uSun);
    vec3 tops = uSunLight * 1.1 * smoothstep(-0.05, 0.25, sunUp) + uSkyLight * 0.9;
    vec3 bases = uSunLight * 0.15 * max(sunUp, 0.0) + uSkyLight * 0.5 + uGroundLight * 0.35;
    vec3 light = mix(bases, tops, smoothstep(uLayer.x, uLayer.y, uEyeH));
    // the haze between, over the Earth's curve: the ray in six pieces, each with its height taken as changing evenly
    // along it (as globe.ts hazes the sea under these clouds: toward the limb a ray stays low in the air ten times
    // as long as a flat Earth would have it, and the clouds there stood out pale against a sea rightly lost in it)
    float tau = 0.0, ha = max(uEyeH, 0.0) / uScale;
    for (int k = 1; k <= 6; k++) {
      float hb = max(heightAt(v * (float(k) / 6.0)), 0.0) / uScale;
      tau += hazeMean(ha, hb);
      ha = hb;
    }
    float hz = 1.0 - exp(-uHazeDensity * tau * tm / 6.0);
    float shown = mix(1.0 - veil, 1.0, step(tm, dv));   // (behind fire or smoke, what shows through it)
    if (uCel < 0.5) return vec4(mix(light, uHaze, hz), 1.0) * (a * shown);
    // drawn: cut where the field is, a pixel wide (the noise's mean slope is 0.48 across a cloud), in one flat tone;
    // where the cover is spread evenly there are no clouds to draw, only their tint, laid on as it is
    float wn = max(0.35 * fp / uCumulus.x, 1e-4);
    float cut = smoothstep(uCumulus.y - wn, uCumulus.y + wn, n) * smoothstep(0.45, 0.55, far) * limb;
    float l = dot(light, LUMA) / max(dot(uSunLight + uSkyLight, LUMA), 1e-5);
    return vec4(celTone(l, 1e-3 + even, hz), 1.0) * (mix(cut, a, even) * shown);
  }

  float w4(int k, vec2 fr) { return ((k & 1) == 1 ? fr.x : 1.0 - fr.x) * ((k >> 1) == 1 ? fr.y : 1.0 - fr.y); }
  // one of the march's pixels, laid on a pixel of the frame: only the cloud this pixel's own surface lies beyond, and
  // of that, behind the fire or smoke, what shows through it
  void lay(vec4 c, vec4 info, float w, float d, float dv, float veil, inout vec4 cloud, inout vec2 tone) {
    w *= smoothstep(info.x, info.y, d) * mix(1.0 - veil, 1.0, smoothstep(info.x, info.y, dv));
    cloud += w * c;
    tone += w * c.a * info.zw;
  }
  // The clouds over a pixel of the frame. The volume is brought up from the march's pixels: where a cloud's outline
  // was marched again at twice the size (tFine: where it was, its second texture says how far off, and 0 elsewhere),
  // that is what is laid here, so the outline is as fine as the frame; the rest is the first march's four pixels
  // round this one, blended. Behind it, the far cover.
  vec4 cloudsOver(vec2 uv) {
    ivec2 size = textureSize(tCloud, 0), fine = textureSize(tFine, 0);
    vec2 p = uv * vec2(size) - 0.5, q = uv * vec2(fine) - 0.5;
    vec2 i0 = floor(p), fr = p - i0, j0 = floor(q), fq = q - j0;
    ivec2 at[4], fat[4];
    vec4 c[4], fi[4];
    float any = 0.0, sharp = 0.0;
    for (int k = 0; k < 4; k++) {
      at[k] = clamp(ivec2(i0) + ivec2(k & 1, k >> 1), ivec2(0), size - 1);
      c[k] = texelFetch(tCloud, at[k], 0);
      any += c[k].a;
      // (on a plain screen the outline's pixels are the frame's: one of the four has all the weight)
      fi[k] = vec4(0.0);
      float w = w4(k, fq);
      if (w < 1e-3) continue;
      fat[k] = clamp(ivec2(j0) + ivec2(k & 1, k >> 1), ivec2(0), fine - 1);
      fi[k] = texelFetch(tFineInfo, fat[k], 0);
      if (fi[k].x > 0.0) sharp += w;
    }
    vec3 ray = viewRay(uv), dir = normalize(uTurn * ray);
    float limb, far, tm = farWhere(dir, limb, far);
    // (the real look has no derivatives to keep, so most of the frame, under no cloud, stops here)
    if (uCel < 0.5 && any <= 0.0 && sharp <= 0.0 && tm < 0.0) return vec4(0.0);
    float d = sceneDistance(texture(tDepth, uv).x, ray);
    // fire and smoke, which write no depth and were drawn with the scene: what of them is in front of the scene here,
    // and how far off. Cloud behind them is seen through them, so only as much as they let through
    float veil = 0.0, dv = 1e9;
    if (uVeils > 0.5) {
      dv = sceneDistance(texture(tVeilDepth, uv).x, ray);
      veil = dv < d ? texture(tVeil, uv).a : 0.0;
    }
    vec4 cloud = vec4(0.0);
    vec2 tone = vec2(0.0);   // its light (cel) and haze, by opacity
    for (int k = 0; k < 4; k++) {
      if (fi[k].x > 0.0) lay(texelFetch(tFine, fat[k], 0), fi[k], w4(k, fq), d, dv, veil, cloud, tone);
      if (sharp < 0.999 && c[k].a > 0.0) lay(c[k], texelFetch(tInfo, at[k], 0), (1.0 - sharp) * w4(k, fr), d, dv, veil, cloud, tone);
    }
    if (uCel > 0.5) {
      // drawn: cut at half opacity, in two tones, at this resolution
      float a = cloud.a;
      float alpha = smoothstep(0.5 - max(fwidth(a), 1e-3), 0.5 + max(fwidth(a), 1e-3), a);
      float l = tone.x / max(a, 1e-4);
      cloud = vec4(celTone(l, max(fwidth(l), 1e-3), tone.y / max(a, 1e-4)), 1.0) * alpha;
    }
    if (tm > 0.0 && tm <= d) cloud += (1.0 - cloud.a) * farCover(dir, tm, limb, far, dv, veil);
    return cloud;
  }`;

/** A pass of their own, laid over the frame where it is: blended onto what is there (one, one minus alpha). */
const COMPOSITE = /* glsl */ `
  precision highp float; precision highp int;
  ${DEPTH}
  ${OVER}
  in vec2 vUv;
  out vec4 oColour;
  void main() {
    oColour = cloudsOver(vUv);
    if (oColour.a <= 0.0) discard;
  }`;

/**
 * The billows: three octaves of round lumps (cellular noise made into balls: 1 at a lump's heart,
 * falling to 0 in the creases between), 5, 11 and 23 to a tile, in red, green and blue; each has a
 * mean of 0.54 (LUMPS). It repeats every NOISE texels. Made a few slices at a time (about 170 ms in all):
 * `CloudPass.warm` makes it before anyone is looking.
 */
function* billowsMade(): Generator<void, THREE.Data3DTexture> {
  const n = NOISE;
  const data = new Uint8Array(n * n * n * 4);
  for (const [channel, cells] of [5, 11, 23].entries()) {
    const points = new Float32Array(cells * cells * cells * 3);
    for (let i = 0; i < cells; i++)
      for (let j = 0; j < cells; j++)
        for (let k = 0; k < cells; k++) {
          const at = ((i * cells + j) * cells + k) * 3;
          for (let a = 0; a < 3; a++) points[at + a] = hash2(i * cells + j, k, 700 + channel * 3 + a);
        }
    const per = n / cells; // texels a cell
    const wrap = (c: number) => ((c % cells) + cells) % cells;
    for (let z = 0; z < n; z++) {
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          const px = (x + 0.5) / per,
            py = (y + 0.5) / per,
            pz = (z + 0.5) / per;
          const cx = Math.floor(px),
            cy = Math.floor(py),
            cz = Math.floor(pz);
          let best = 9;
          for (let dz = -1; dz <= 1; dz++)
            for (let dy = -1; dy <= 1; dy++)
              for (let dx = -1; dx <= 1; dx++) {
                const at = ((wrap(cx + dx) * cells + wrap(cy + dy)) * cells + wrap(cz + dz)) * 3;
                const ex = cx + dx + points[at]! - px,
                  ey = cy + dy + points[at + 1]! - py,
                  ez = cz + dz + points[at + 2]! - pz;
                best = Math.min(best, ex * ex + ey * ey + ez * ez);
              }
          data[((z * n + y) * n + x) * 4 + channel] = Math.round(255 * Math.sqrt(Math.max(0, 1 - best * 2.2))); // a ball, not a cone
        }
      if (z % 8 === 7) yield; // (a slice at a time, so whoever is waiting can let the page breathe)
    }
  }
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  const texture = new THREE.Data3DTexture(data, n, n, n);
  texture.format = THREE.RGBAFormat;
  texture.wrapS = texture.wrapT = texture.wrapR = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/** The march's two results at its own size: light and opacity, and where the cloud is. */
const lowTarget = () =>
  new THREE.WebGLRenderTarget(1, 1, {
    count: 2,
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: false,
  });

/** How much of the last blend each still frame keeps (`CloudPass.history`): about three frames' worth. */
const KEEP = 0.65;
/** A cloud's outline, to be marched again finer (`CloudPass.fine`): where the march's neighbouring pixels differ by this much opacity. */
const EDGE = 0.1;

/** The blend: light mixed; where the cloud is, from whichever frame has any (an empty one says 6e4). */
const SETTLE = /* glsl */ `
  precision highp float;
  uniform sampler2D tNew0, tNew1, tOld0, tOld1;
  uniform float uKeep;
  in vec2 vUv;
  layout(location = 0) out vec4 oColour;
  layout(location = 1) out vec4 oInfo;
  void main() {
    vec4 c = texture(tNew0, vUv), oc = texture(tOld0, vUv);
    vec4 i = texture(tNew1, vUv), oi = texture(tOld1, vUv);
    oColour = mix(c, oc, uKeep);
    bool here = c.a > 1e-3, was = oc.a > 1e-3;
    oInfo = here ? (was ? mix(i, oi, uKeep) : i) : (was && uKeep > 0.0 ? oi : i);
  }`;

const target = (size: number, linear: boolean) =>
  new THREE.WebGLRenderTarget(size, size, {
    format: THREE.RedFormat,
    type: THREE.UnsignedByteType,
    minFilter: linear ? THREE.LinearFilter : THREE.NearestFilter,
    magFilter: linear ? THREE.LinearFilter : THREE.NearestFilter,
    depthBuffer: false,
    generateMipmaps: false,
  });

const raw = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>) =>
  new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VERTEX,
    fragmentShader,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });

/** Marks the scene's depth as it stands straight after the scene is drawn, for the clouds laid over later. Goes after the scene's pass. */
export class DepthMark extends Pass {
  texture: THREE.DepthTexture | null = null;
  constructor() {
    super();
    this.needsSwap = false;
  }
  render(_renderer: THREE.WebGLRenderer, _write: THREE.WebGLRenderTarget, read: THREE.WebGLRenderTarget): void {
    this.texture = read.depthTexture;
  }
}

/**
 * The clouds' pass: marches them, and lays them over the frame itself unless the output has
 * adopted them (`adopt`). It goes after the ink; `mark` goes straight after the scene. Does nothing
 * where no air with clouds is installed (air.ts) or the scene has no haze (a studio, orbit).
 */
export class CloudPass extends Pass {
  readonly mark = new DepthMark();
  /** The cel look: cut at half opacity, two flat tones. */
  cel = false;
  /**
   * What is drawn with the scene but writes no depth and can stand in front of a cloud: the engine's fire and its
   * trail. Cloud behind them is laid over them only as far as they let it through.
   */
  veils: THREE.Object3D[] = [];
  private readonly quad = new FullScreenQuad();
  private readonly low = lowTarget();
  /**
   * The march's last results, blended (`settle`): while the eye is still, each frame's clouds are mixed with what
   * came before, so an edge the march catches one frame and misses the next (a billow's tip thinner than its
   * pixel, drifting) neither flickers nor fills a whole pixel; the moment the eye moves they start again.
   */
  private readonly history = [lowTarget(), lowTarget()];
  private ping = 0;
  private settled = false;
  private readonly lastEye = new THREE.Vector3(Number.NaN, 0, 0);
  private readonly lastTurn = new THREE.Quaternion();
  private readonly lastLens = new THREE.Matrix4();
  private readonly blend = raw(SETTLE, {
    tNew0: { value: this.low.textures[0]! },
    tNew1: { value: this.low.textures[1]! },
    tOld0: { value: null as THREE.Texture | null },
    tOld1: { value: null as THREE.Texture | null },
    uKeep: { value: 0 },
  });
  /**
   * The clouds' outlines, marched again at twice the march's size each way (the frame's own, on a plain screen):
   * the march has a cloud's edge in steps of its own pixels, and brought up to the frame's size a step is still a
   * step. So wherever its neighbouring pixels disagree about how much cloud there is, the frame's pixels between
   * them are marched for themselves, each to its own depth, and laid in place of the blend (OVER). Only outlines:
   * a tenth of the frame or so. Two, because each is blended with the last while the eye is still, as `history` is.
   */
  private readonly fine = [lowTarget(), lowTarget()];
  private pong = 0;
  /** What the second march has of its own: its target's size and pixel, the first march to find the outlines in, its own last results. */
  private readonly finer = {
    uLow: { value: new THREE.Vector2(1, 1) },
    uGrain: { value: 0.001 },
    tLow: { value: null as THREE.Texture | null },
    tOld0: { value: null as THREE.Texture | null },
    tOld1: { value: null as THREE.Texture | null },
    uKeep: { value: 0 },
  };
  private sharpen: THREE.RawShaderMaterial | null = null;
  /** Fire and smoke in front of the scene (`veils`), drawn again on their own: how much they cover, and how far off the nearest is. */
  private readonly veil = new THREE.WebGLRenderTarget(1, 1, { depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedIntType) });
  private readonly field = target(SIDE, true);
  private readonly cells = target(SIDE / (CELL / TEXEL), false);
  private readonly row = target(SIDE / (CELL / TEXEL), false);
  private readonly clearAir = target(SIDE / (CELL / TEXEL), false);
  private bakeMaterial: THREE.RawShaderMaterial | null = null;
  private march: THREE.RawShaderMaterial | null = null;
  private readonly reduce = raw(REDUCE, {
    tFrom: { value: null },
    uMode: { value: 0 },
    uBlock: { value: CELL / TEXEL },
    uOccupied: { value: 0 },
  });
  private readonly composite: THREE.RawShaderMaterial;
  private readonly uniforms = {
    tDepth: { value: null as THREE.Texture | null },
    uProjInv: { value: new THREE.Matrix4() },
    uRange: { value: new THREE.Vector2(0.1, 1000) },
    tField: { value: this.field.texture },
    tClear: { value: this.clearAir.texture },
    tBillows: { value: null as THREE.Data3DTexture | null },
    uTurn: { value: new THREE.Matrix3() },
    uLow: { value: new THREE.Vector2(1, 1) },
    uGrain: { value: 0.001 },
    uEye: { value: new THREE.Vector2() },
    uField: { value: new THREE.Vector2() },
    uCumulus: { value: new THREE.Vector3(1000, 0.5, 0.1) },
    uFarSpan: { value: new THREE.Vector2(-1, 1) },
    uEyeH: { value: 0 },
    uRe: { value: EARTH },
    uUp: { value: new THREE.Vector3(0, 1, 0) },
    uLayer: { value: new THREE.Vector2(720, 1370) },
    uRise: cloudRise,
    uDome: { value: 1 },
    uSun: { value: new THREE.Vector3(0, 1, 0) },
    uSunLight: { value: new THREE.Color() },
    uSkyLight: { value: new THREE.Color() },
    uGroundLight: { value: new THREE.Color() },
    uHaze: { value: new THREE.Color() },
    uHazeDensity: { value: 0 },
    uScale: { value: 1400 },
    uPixel: { value: 0.001 },
    uFine: { value: 0.001 },
    uCel: { value: 0 },
    tCloud: { value: this.low.textures[0]! },
    tInfo: { value: this.low.textures[1]! },
    tFine: { value: this.fine[0]!.textures[0]! },
    tFineInfo: { value: this.fine[0]!.textures[1]! },
    tVeil: { value: this.veil.texture },
    tVeilDepth: { value: this.veil.depthTexture },
    uVeils: { value: 0 },
    uClouds: { value: 0 },
  };
  /** What was baked: for which clouds, round which point of the field (its frame, metres). */
  private baked: { clouds: Clouds; x: number; z: number } | null = null;
  private sun: THREE.DirectionalLight | null = null;
  private sky: THREE.HemisphereLight | null = null;
  private readonly eye = new THREE.Vector3();
  private readonly turn = new THREE.Matrix4();

  constructor(
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.PerspectiveCamera,
  ) {
    super();
    this.composite = raw(COMPOSITE, this.uniforms);
    this.composite.blending = THREE.CustomBlending;
    this.composite.blendSrc = THREE.OneFactor;
    this.composite.blendDst = THREE.OneMinusSrcAlphaFactor;
    this.composite.blendSrcAlpha = THREE.ZeroFactor;
    this.composite.blendDstAlpha = THREE.OneFactor;
    this.composite.transparent = true;
    this.needsSwap = false;
  }

  /**
   * Lay the clouds over the frame in the output's own pass (three's OutputPass, the last, which draws
   * the frame to the screen), instead of in a pass of their own: a pass over the multisampled frame
   * costs a millisecond and a half on a dense screen, and the output reads every pixel anyway. They
   * are then over the outline and the bloom as well as the scene. Call before the output is first drawn.
   */
  adopt(output: OutputPass): void {
    const material = output.material;
    // (in GLSL ES 3.00, which the clouds' lookups need)
    material.glslVersion = THREE.GLSL3;
    material.vertexShader = material.vertexShader.replaceAll('attribute ', 'in ').replaceAll('varying ', 'out ');
    material.fragmentShader = material.fragmentShader
      .replace('varying vec2 vUv;', `in vec2 vUv;\nout highp vec4 oOutput;\n${DEPTH}\n${OVER}\nuniform float uClouds;`)
      .replace(
        'gl_FragColor = texture2D( tDiffuse, vUv );',
        `gl_FragColor = texture2D( tDiffuse, vUv );
        if (uClouds > 0.5) { vec4 clouds = cloudsOver(vUv); gl_FragColor.rgb = gl_FragColor.rgb * (1.0 - clouds.a) + clouds.rgb; }`,
      )
      .replaceAll('texture2D(', 'texture(')
      .replaceAll('gl_FragColor', 'oOutput');
    if (!material.fragmentShader.includes('cloudsOver(vUv)')) throw new Error('clouds: the output pass has changed its shader');
    Object.assign(material.uniforms, this.uniforms);
    this.adopted = true;
  }
  private adopted = false;

  /** Make what the clouds are drawn with before anyone is looking, a little at a time (Stage.warm). */
  async warm(): Promise<void> {
    if (this.uniforms.tBillows.value) return;
    const made = billowsMade();
    for (let r = made.next(); ; r = made.next()) {
      if (r.done) {
        this.uniforms.tBillows.value ??= r.value;
        return;
      }
      await new Promise((done) => setTimeout(done, 0));
    }
  }

  /**
   * Half the window's size each way in CSS pixels (a quarter of its pixels on a plain screen, a sixteenth on a dense
   * one); and the outlines at twice that, which on a plain screen is the frame's own size.
   */
  private fit(renderer: THREE.WebGLRenderer, frame: THREE.WebGLRenderTarget): void {
    const step = 2 * Math.max(1, renderer.getPixelRatio());
    const w = Math.max(1, Math.ceil(frame.width / step)),
      h = Math.max(1, Math.ceil(frame.height / step));
    const fw = Math.min(frame.width, 2 * w),
      fh = Math.min(frame.height, 2 * h);
    if (w === this.low.width && h === this.low.height && fw === this.fine[0]!.width && fh === this.fine[0]!.height) return;
    this.low.setSize(w, h);
    for (const t of this.history) t.setSize(w, h);
    for (const t of this.fine) t.setSize(fw, fh);
    this.settled = false;
    this.uniforms.uLow.value.set(w, h);
    this.finer.uLow.value.set(fw, fh);
  }

  render(renderer: THREE.WebGLRenderer, _writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget): void {
    const air = installedAir();
    const clouds = air?.clouds;
    const fog = this.scene.fog as THREE.FogExp2 | null;
    this.uniforms.uClouds.value = 0;
    if (!air || !clouds || !fog || !this.mark.texture) return;
    this.fit(renderer, readBuffer);
    const u = this.uniforms;
    const camera = this.camera;
    // the eye in the scene's frame: the scene is drawn from it (origin.ts), so it is the origin's place plus the camera's
    const o = uOrigin.value;
    const eye = this.eye.set(camera.position.x + o.x, camera.position.y + o.y, camera.position.z + o.z);
    const fx = eye.x - cloudUniform.value.x,
      fz = eye.z - cloudUniform.value.z;
    this.bake(renderer, clouds, fx, fz);
    const baked = this.baked!;
    u.uEye.value.set(fx - baked.x + EXTENT / 2, fz - baked.z + EXTENT / 2);
    u.uField.value.set(fx, fz);
    u.uCumulus.value.set(clouds.size, cloudMiddle(clouds), clouds.cover);
    u.uScale.value = air.scale;
    // the Earth's centre lies under the site's origin, its radius below the sea
    const cy = eye.y - (air.base - EARTH);
    const r = Math.hypot(eye.x, cy, eye.z);
    u.uEyeH.value = r - EARTH;
    u.uRe.value = r;
    u.uUp.value.set(eye.x / r, cy / r, eye.z / r);
    u.uLayer.value.set(clouds.height, clouds.height + clouds.depth);
    u.uDome.value = clouds.depth / (TOWER * SIDE_PER_SIZE * clouds.size) ** DOME;
    u.uProjInv.value.copy(camera.projectionMatrixInverse);
    u.uRange.value.set(camera.near, camera.far);
    u.uTurn.value.setFromMatrix4(this.turn.extractRotation(camera.matrixWorld));
    const tall = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    u.uPixel.value = u.uGrain.value = tall / u.uLow.value.y;
    u.uFine.value = tall / readBuffer.height;
    // Where the far cover can be, as the ray's part along straight up (OVER: farWhere). The volume is all there is
    // nearer than `least` (near()), and the shell (0.3 of the way up the layer) is that far off along one cone of rays
    // round the vertical: from under it, the far cover is below that cone and above the sea's horizon; from over it,
    // between that cone and level.
    const shell = EARTH + clouds.height + 0.3 * clouds.depth;
    const least = Math.min(FADE[0], SMALL[0] / u.uPixel.value);
    const cone = (shell * shell - r * r - least * least) / (2 * r * least);
    if (r < shell) u.uFarSpan.value.set(-Math.sqrt(Math.max(r - EARTH, 0) * (r + EARTH)) / r, cone);
    else u.uFarSpan.value.set(cone, 0);
    this.finer.uGrain.value = tall / this.finer.uLow.value.y;
    u.tDepth.value = this.mark.texture;
    u.uCel.value = Number(this.cel);
    this.light(fog);

    this.march ??= raw(marchShader(clouds, false), u);
    this.sharpen ??= raw(marchShader(clouds, true), { ...u, ...this.finer });
    if (!u.tBillows.value) {
      // (not warmed: made now, all at once)
      const made = billowsMade();
      for (let r = made.next(); ; r = made.next())
        if (r.done) {
          u.tBillows.value = r.value;
          break;
        }
    }
    renderer.setRenderTarget(this.low);
    this.quad.material = this.march;
    this.quad.render(renderer);
    const still = this.settle(renderer, eye);

    // the outlines again, finer: found in the blend the composite reads, so they are where it would have had steps
    const from = this.fine[this.pong]!,
      to = this.fine[1 - this.pong]!;
    this.finer.tLow.value = u.tCloud.value;
    this.finer.tOld0.value = from.textures[0]!;
    this.finer.tOld1.value = from.textures[1]!;
    this.finer.uKeep.value = still ? KEEP : 0;
    const clear = renderer.getClearColor(new THREE.Color()),
      alpha = renderer.getClearAlpha(),
      auto = renderer.autoClear;
    renderer.setRenderTarget(to);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, false, false);
    renderer.autoClear = false;
    this.quad.material = this.sharpen;
    if (!this.cel) this.quad.render(renderer); // (a drawing's outline is cut from the blend, which is smooth: nothing to sharpen)
    renderer.autoClear = auto;
    renderer.setClearColor(clear, alpha);
    u.tFine.value = to.textures[0]!;
    u.tFineInfo.value = to.textures[1]!;
    this.pong = 1 - this.pong;

    u.uVeils.value = Number(this.drawVeils(renderer, readBuffer));
    u.uClouds.value = 1;
    if (this.adopted) return; // (the output lays them over)

    // over the frame as it stands, in place
    // (the depth is the scene's still: it need not be resolved out of the multisampled buffer again)
    const autoClear = renderer.autoClear,
      resolve = readBuffer.resolveDepthBuffer;
    renderer.autoClear = false;
    readBuffer.resolveDepthBuffer = false;
    renderer.setRenderTarget(readBuffer);
    this.quad.material = this.composite;
    this.quad.render(renderer);
    renderer.autoClear = autoClear;
    readBuffer.resolveDepthBuffer = resolve;
  }

  /** Blend the march's results into the history (see `history`), and have the composite read the blend. True if the eye was still. */
  private settle(renderer: THREE.WebGLRenderer, eye: THREE.Vector3): boolean {
    const camera = this.camera;
    const still =
      this.settled &&
      eye.distanceToSquared(this.lastEye) < 1e-8 &&
      camera.quaternion.angleTo(this.lastTurn) < 1e-7 &&
      camera.projectionMatrix.equals(this.lastLens);
    this.lastEye.copy(eye);
    this.lastTurn.copy(camera.quaternion);
    this.lastLens.copy(camera.projectionMatrix);
    const from = this.history[this.ping]!,
      to = this.history[1 - this.ping]!;
    const b = this.blend.uniforms;
    b.tOld0!.value = from.textures[0];
    b.tOld1!.value = from.textures[1];
    b.uKeep!.value = still ? KEEP : 0;
    renderer.setRenderTarget(to);
    this.quad.material = this.blend;
    this.quad.render(renderer);
    const u = this.uniforms;
    u.tCloud.value = to.textures[0]!;
    u.tInfo.value = to.textures[1]!;
    this.ping = 1 - this.ping;
    this.settled = true;
    return still;
  }

  /** Draw the veils on show on their own, with their depth: false if none is. */
  private drawVeils(renderer: THREE.WebGLRenderer, frame: THREE.WebGLRenderTarget): boolean {
    const shown = this.veils.filter((o) => {
      let p: THREE.Object3D = o;
      for (; p.parent; p = p.parent) if (!p.visible) return false;
      return p === this.scene; // (in the scene, and shown all the way up)
    });
    if (!shown.length) return false;
    if (this.veil.width !== frame.width || this.veil.height !== frame.height) this.veil.setSize(frame.width, frame.height);
    const clear = renderer.getClearColor(new THREE.Color()),
      alpha = renderer.getClearAlpha(),
      autoClear = renderer.autoClear;
    renderer.setRenderTarget(this.veil);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, false);
    renderer.autoClear = false;
    // All of them in one draw of the scene, seen on their own layer: a draw call each, not a render each (a frame
    // has dozens of panes of glass). Writing depth here, so the nearest of them is kept where they overlap.
    const materials = new Set<THREE.Material>();
    for (const o of shown)
      o.traverse((m) => {
        m.layers.enable(VEIL_LAYER);
        const material = (m as THREE.Mesh).material;
        if (material) for (const each of Array.isArray(material) ? material : [material]) materials.add(each);
      });
    const wrote = [...materials].map((m) => m.depthWrite);
    for (const m of materials) m.depthWrite = true;
    const mask = this.camera.layers.mask;
    this.camera.layers.set(VEIL_LAYER);
    renderer.render(this.scene, this.camera);
    this.camera.layers.mask = mask;
    [...materials].forEach((m, i) => (m.depthWrite = wrote[i]!));
    renderer.autoClear = autoClear;
    renderer.setClearColor(clear, alpha);
    return true;
  }

  /** Bake the field round the eye (x, z in the field's frame) if it has gone far over the last bake. */
  private bake(renderer: THREE.WebGLRenderer, clouds: Clouds, x: number, z: number): void {
    const b = this.baked;
    if (b && b.clouds === clouds && Math.abs(x - b.x) < REBAKE && Math.abs(z - b.z) < REBAKE) return;
    const cx = Math.round(x / SNAP) * SNAP,
      cz = Math.round(z / SNAP) * SNAP;
    if (!b || b.clouds !== clouds) {
      this.bakeMaterial?.dispose();
      this.bakeMaterial = raw(bakeShader(clouds), { uCorner: { value: new THREE.Vector2() } });
      this.reduce.uniforms.uOccupied!.value = (BELOW + reaches(SIDE_PER_SIZE * clouds.size)) / RANGE - 0.5 / 255;
    }
    this.baked = { clouds, x: cx, z: cz };
    const bake = this.bakeMaterial!;
    (bake.uniforms.uCorner!.value as THREE.Vector2).set(cx - EXTENT / 2, cz - EXTENT / 2);
    const was = renderer.getRenderTarget();
    this.quad.material = bake;
    renderer.setRenderTarget(this.field);
    this.quad.render(renderer);
    // where there is any cloud: the largest value in each cell; then how far each cell is from one with any
    this.quad.material = this.reduce;
    const pass = (from: THREE.WebGLRenderTarget, to: THREE.WebGLRenderTarget, mode: number) => {
      this.reduce.uniforms.tFrom!.value = from.texture;
      this.reduce.uniforms.uMode!.value = mode;
      renderer.setRenderTarget(to);
      this.quad.render(renderer);
    };
    pass(this.field, this.cells, 0);
    pass(this.cells, this.row, 1);
    pass(this.row, this.clearAir, 2);
    renderer.setRenderTarget(was);
  }

  /** The scene's light: its Sun (or Moon), its sky and what the ground sends up, and the haze as seen from where the eye is. */
  private light(fog: THREE.FogExp2): void {
    if (!this.sun || !this.sky)
      this.scene.traverse((o) => {
        if ((o as THREE.DirectionalLight).isDirectionalLight && !this.sun) this.sun = o as THREE.DirectionalLight;
        if ((o as THREE.HemisphereLight).isHemisphereLight && !this.sky) this.sky = o as THREE.HemisphereLight;
      });
    const u = this.uniforms;
    if (this.sun) {
      u.uSun.value.subVectors(this.sun.position, this.sun.target.position).normalize();
      u.uSunLight.value.copy(this.sun.color).multiplyScalar(this.sun.intensity / Math.PI);
    }
    if (this.sky) {
      u.uSkyLight.value.copy(this.sky.color).multiplyScalar(this.sky.intensity);
      u.uGroundLight.value.copy(this.sky.groundColor).multiplyScalar(this.sky.intensity);
    }
    // air.ts's hazeSeen: from above, the haze sends back a neutral third of its light
    const c = fog.color;
    const grey = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    const above = hazeAboveUniform.value.x;
    u.uHaze.value.setRGB(
      c.r + (grey * 0.86 * 0.33 - c.r) * above,
      c.g + (grey * 0.95 * 0.33 - c.g) * above,
      c.b + (grey * 1.1 * 0.33 - c.b) * above,
    );
    u.uHazeDensity.value = fog.density;
  }

  dispose(): void {
    for (const t of [this.low, ...this.history, ...this.fine, this.veil, this.field, this.cells, this.row, this.clearAir]) t.dispose();
    this.uniforms.tBillows.value?.dispose();
    this.quad.dispose();
  }
}

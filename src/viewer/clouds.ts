import * as THREE from 'three';
import type { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';
import { type Clouds, cloudMiddle, cloudNoiseGlsl, cloudRise, cloudUniform, hazeAboveUniform, installedAir } from './air';
import { fieldAs, hash2 } from './field';
import { uOrigin } from './origin';

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
 * Far off, past what is baked or where a cloud is a few pixels across (`near`), the same field is
 * drawn flat on a shell through the layer instead (`flatCover`), fading in as the volume fades out;
 * where its clouds are under a pixel it is the record's cover, evenly. So from orbit the whole
 * Earth in view has its tenth of cumulus, and nothing shimmers. Their shadows are air.ts's
 * (`cloudShade`), on the ground and the globe alike.
 *
 * The result is brought up to the frame's size and laid over it in the output's own pass, as the
 * frame goes to the screen (`adopt`). Besides its colour and opacity each low pixel keeps where
 * along its ray the cloud began and where it became half opaque; a pixel of the frame takes cloud
 * from its low neighbours only as far as its own surface lies past those, so the rocket and the
 * gantry cut the clouds on their own edges, not on a coarse pixel's. The fire and its trail write no
 * depth (`veils`): they are drawn again on their own, and cloud behind them is seen through them
 * only as much as they let through. In the cel look the cloud is a drawing: its opacity is cut at
 * one half and its light in two flat tones, at the frame's resolution, so the edge is clean.
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
/** Billows at a cloud's foot, metres: a quarter of the top's. */
const FOOT = 35;
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
  // how far along that ray the scene's surface is; the sky is endlessly far
  float sceneDistance(float depth, vec3 ray) {
    if (depth >= 1.0) return 1e9;
    float z = depth * 2.0 - 1.0;
    float n = uRange.x, f = uRange.y;
    return 2.0 * n * f / (f + n - z * (f - n)) / max(-ray.z, 1e-4);
  }`;

const marchShader = (scale: number, clouds: Clouds) => /* glsl */ `
  precision highp float; precision highp int; precision highp sampler3D;
  ${DEPTH}
  uniform sampler2D tField, tClear;
  uniform sampler3D tBillows;
  uniform mat3 uTurn;        // the camera's turn: its frame to the world's
  uniform vec2 uLow;         // this target's size, pixels
  uniform vec2 uEye;         // the eye in the baked field's frame, metres from its corner
  uniform float uEyeH;       // the eye's height above the sea
  uniform float uRe;         // the Earth's radius plus that
  uniform vec3 uUp;          // straight up at the eye
  uniform vec2 uLayer;       // the clouds' base and greatest top above the sea
  uniform float uRise;       // how far the billows have risen
  uniform float uDome;       // a dome's height for each metre^DOME in from its edge
  uniform vec3 uSun, uSunLight, uSkyLight, uGroundLight, uHaze;
  uniform float uHazeDensity;
  uniform float uPixel;      // radians a low pixel
  uniform float uCel;
  uniform vec2 uCorner;      // the baked field's corner in the field's own frame
  in vec2 vUv;
  ${fieldAs('m_')}
  ${cloudNoiseGlsl(clouds, 'm_')}
  layout(location = 0) out vec4 oColour;   // light sent toward the eye (premultiplied), and opacity
  layout(location = 2) out vec4 oEven;     // how much of it is the far cover spread evenly, not clouds drawn (cel), per opacity
  layout(location = 1) out vec4 oInfo;     // where the cloud began, where it was half opaque; its light (cel) and haze, per opacity

  #define EXTENT ${EXTENT.toFixed(1)}
  #define TILE ${TILE.toFixed(1)}
  #define SIGMA ${SIGMA.toFixed(4)}
  #define EARTH ${EARTH.toFixed(1)}

  // the height above the sea of a point v from the eye, on the Earth's curve (in the small form: floats hold it)
  float heightAt(vec3 v) {
    float s = 2.0 * uRe * dot(uUp, v) + dot(v, v);
    return uEyeH + s / (sqrt(uRe * uRe + s) + uRe);
  }
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

  // how much of the cloud at v from the eye is drawn as a volume: all of it near, none far off (round the eye, past
  // what is baked) or where a cloud is no more than a few pixels across; the rest is drawn flat (flatCover)
  float near(vec3 v) {
    return (1.0 - smoothstep(${FADE[0].toFixed(1)}, ${FADE[1].toFixed(1)}, length(v.xz))) * (1.0 - smoothstep(${SMALL[0].toFixed(1)}, ${SMALL[1].toFixed(1)}, length(v) * uPixel));
  }
  // The far clouds: the field painted flat on a shell through the layer, at \`f\` in the field's own frame (metres), seen
  // with pixels \`fp\` metres across. Its edge widens with the pixel, and where a cloud is under a pixel the cover is the
  // record's, evenly: so nothing too small to draw is drawn, and nothing shimmers as it drifts.
  float flatCover(vec2 f, float fp, out float even) {
    float w = ${SOFT.toFixed(3)} + 0.25 * fp / ${clouds.size.toFixed(1)};
    float c = smoothstep(${cloudMiddle(clouds).toFixed(4)} - w, ${cloudMiddle(clouds).toFixed(4)} + w, cloudNoise(f));
    even = smoothstep(${(0.08 * clouds.size).toFixed(1)}, ${(0.5 * clouds.size).toFixed(1)}, fp);
    return mix(c, ${clouds.cover.toFixed(3)}, even);
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
    float sd = heap + billow(y) * 2.0 * (dot(b, vec3(0.45, 0.33, 0.22)) - ${LUMPS.toFixed(3)});
    return min(sd, h); // the base is flat
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
    float a = max(uEyeH, 0.0) / ${scale.toFixed(1)};
    float b = max(h, 0.0) / ${scale.toFixed(1)};
    float mean = abs(a - b) < 1e-3 ? exp(-0.5 * (a + b)) : (exp(-min(a, b)) - exp(-max(a, b))) / abs(b - a);
    return 1.0 - exp(-uHazeDensity * d * mean);
  }

  void main() {
    vec2 px = 0.5 / uLow;
    // the furthest of the scene under this pixel: the frame's pixels nearer than the cloud are cut out when it is laid over
    float depth = max(max(texture(tDepth, vUv + vec2(-0.5, -0.5) * px).x, texture(tDepth, vUv + vec2(0.5, -0.5) * px).x),
                      max(texture(tDepth, vUv + vec2(-0.5, 0.5) * px).x, texture(tDepth, vUv + vec2(0.5, 0.5) * px).x));
    vec3 ray = viewRay(vUv);
    float far = sceneDistance(depth, ray);
    vec3 dir = normalize(uTurn * ray);
    oColour = vec4(0.0);
    oInfo = vec4(6e4, 6e4, 0.0, 0.0);
    oEven = vec4(0.0);

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
    float a = max(uEyeH, 0.0) / ${scale.toFixed(1)}, b = 0.5 * (uLayer.x + uLayer.y) / ${scale.toFixed(1)};
    float mean = abs(a - b) < 1e-3 ? exp(-0.5 * (a + b)) : (exp(-min(a, b)) - exp(-max(a, b))) / abs(b - a);
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

    float T = 1.0, lit = 0.0, haze = 0.0, even = 0.0, front = 6e4, mid = 6e4;
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
      float lod = max(log2(max(t * uPixel, 1.0) / ${(TILE / NOISE).toFixed(1)}), 0.0);
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
    // and beyond it, the same clouds drawn flat, through the middle of the layer, as much as the volume has faded
    float hm = mix(uLayer.x, uLayer.y, 0.3);
    vec2 m = shell(hm, ud);
    float tm = uEyeH < hm ? m.y : (m.x <= m.y && m.x > 0.0 ? m.x : -1.0);
    if (tm > 0.0 && tm < seen && T > 0.01) {
      vec3 v = dir * tm;
      vec3 up = normalize(uRe * uUp + v);
      float fp = tm * uPixel / max(abs(dot(up, dir)), 0.1);
      float spread;
      float c = flatCover(uCorner + uEye + v.xz, fp, spread) * (1.0 - near(v));
      if (c > 0.0) {
        // its top in the Sun and the sky, or its base, lit by what the ground sends up: as the volume's are, on the whole
        float sunUp = dot(up, uSun);
        vec3 tops = uSunLight * 1.1 * smoothstep(-0.05, 0.25, sunUp) + uSkyLight * 0.9;
        vec3 bases = uSunLight * 0.15 * max(sunUp, 0.0) + uSkyLight * 0.5 + uGroundLight * 0.35;
        vec3 light = mix(bases, tops, smoothstep(uLayer.x, uLayer.y, uEyeH));
        float hz = hazeLost(hm, tm);
        float a = 0.95 * c, w = T * a;
        colour += w * mix(light, uHaze, hz);
        lit += w * dot(light, vec3(0.2126, 0.7152, 0.0722)) / whiteLum;
        haze += w * hz;
        even += w * spread;
        T *= 1.0 - a;
        if (front > 5e4) front = tm;
        if (mid > 5e4 && T < 0.5) mid = tm + 1.0;
      }
    }

    float opacity = 1.0 - T;
    if (opacity < 1e-4) return;
    oColour = vec4(colour, opacity);
    oInfo = vec4(front, max(mid, front + 1.0), lit / opacity, haze / opacity);
    oEven = vec4(even / opacity, 0.0, 0.0, 1.0);
  }`;

/**
 * The clouds laid over a pixel of the frame: premultiplied colour and opacity (`cloudsOver`), for the
 * output's shader to put over what is there (adopt), or for a pass of their own (COMPOSITE).
 */
const OVER = /* glsl */ `
  uniform sampler2D tCloud, tInfo, tEven, tVeil, tVeilDepth;
  uniform vec3 uSunLight, uSkyLight, uHaze;
  uniform float uCel, uVeils;
  float w4(int k, vec2 fr) { return ((k & 1) == 1 ? fr.x : 1.0 - fr.x) * ((k >> 1) == 1 ? fr.y : 1.0 - fr.y); }
  vec4 cloudsOver(vec2 uv) {
    ivec2 size = textureSize(tCloud, 0);
    vec2 p = uv * vec2(size) - 0.5;
    vec2 i0 = floor(p), fr = p - i0;
    ivec2 at[4];
    vec4 c[4];
    float any = 0.0;
    for (int k = 0; k < 4; k++) {
      at[k] = clamp(ivec2(i0) + ivec2(k & 1, k >> 1), ivec2(0), size - 1);
      c[k] = texelFetch(tCloud, at[k], 0);
      any += c[k].a;
    }
    // (the real look has no derivatives to keep, so most of the frame, under no cloud, stops here)
    if (uCel < 0.5 && any <= 0.0) return vec4(0.0);
    vec3 ray = viewRay(uv);
    float d = sceneDistance(texture(tDepth, uv).x, ray);
    // fire and smoke, which write no depth and were drawn with the scene: what of them is in front of the scene here,
    // and how far off. Cloud behind them is seen through them, so only as much as they let through
    float veil = 0.0, dv = 1e9;
    if (uVeils > 0.5) {
      dv = sceneDistance(texture(tVeilDepth, uv).x, ray);
      veil = dv < d ? texture(tVeil, uv).a : 0.0;
    }
    vec4 cloud = vec4(0.0);
    float lit = 0.0, haze = 0.0, even = 0.0;
    for (int k = 0; k < 4; k++) {
      vec4 info = texelFetch(tInfo, at[k], 0);
      if (uCel > 0.5) even += w4(k, fr) * c[k].a * texelFetch(tEven, at[k], 0).r;
      // only the cloud this pixel's own surface lies beyond, and of that, behind the fire or smoke, what shows through it
      float w = w4(k, fr) * smoothstep(info.x, info.y, d);
      w *= mix(1.0 - veil, 1.0, smoothstep(info.x, info.y, dv));
      cloud += w * c[k];
      lit += w * c[k].a * info.z;
      haze += w * c[k].a * info.w;
    }
    if (uCel < 0.5) return cloud;
    // drawn: cut at half opacity, in two tones, at this resolution
    // (where the far cover is spread evenly there are no clouds to draw, only their tint: that is laid on as it is)
    float a = cloud.a;
    float spread = even / max(a, 1e-4);
    float edge = max(fwidth(a), 1e-3);
    float alpha = mix(smoothstep(0.5 - edge, 0.5 + edge, a), a, spread);
    float l = lit / max(a, 1e-4);
    float le = max(fwidth(l), 1e-3) + spread;
    vec3 tone = mix(uSkyLight * 1.1 + uSunLight * 0.35, uSunLight * 0.95 + uSkyLight, smoothstep(0.62 - le, 0.62 + le, l));
    tone = mix(tone, uHaze, haze / max(a, 1e-4));
    return vec4(tone * alpha, alpha);
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
  private readonly low = new THREE.WebGLRenderTarget(1, 1, {
    count: 3,
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: false,
  });
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
    uEye: { value: new THREE.Vector2() },
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
    uPixel: { value: 0.001 },
    uCel: { value: 0 },
    uCorner: { value: new THREE.Vector2() },
    tCloud: { value: this.low.textures[0]! },
    tInfo: { value: this.low.textures[1]! },
    tEven: { value: this.low.textures[2]! },
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

  /** Half the window's size each way in CSS pixels (a quarter of its pixels on a plain screen, a sixteenth on a dense one). */
  private fit(renderer: THREE.WebGLRenderer, frame: THREE.WebGLRenderTarget): void {
    const step = 2 * Math.max(1, renderer.getPixelRatio());
    const w = Math.max(1, Math.ceil(frame.width / step)),
      h = Math.max(1, Math.ceil(frame.height / step));
    if (w === this.low.width && h === this.low.height) return;
    this.low.setSize(w, h);
    this.uniforms.uLow.value.set(w, h);
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
    u.uCorner.value.set(baked.x - EXTENT / 2, baked.z - EXTENT / 2);
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
    u.uPixel.value = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / u.uLow.value.y;
    u.tDepth.value = this.mark.texture;
    u.uCel.value = Number(this.cel);
    this.light(fog);

    this.march ??= raw(marchShader(air.scale, clouds), u);
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
    for (const o of shown) {
      // (writing depth here, so the nearest of it is kept where it overlaps itself)
      const materials: THREE.Material[] = [];
      o.traverse((m) => {
        const material = (m as THREE.Mesh).material;
        if (material) materials.push(...(Array.isArray(material) ? material : [material]));
      });
      const wrote = materials.map((m) => m.depthWrite);
      for (const m of materials) m.depthWrite = true;
      renderer.render(o, this.camera);
      materials.forEach((m, i) => (m.depthWrite = wrote[i]!));
    }
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
    for (const t of [this.low, this.veil, this.field, this.cells, this.row, this.clearAir]) t.dispose();
    this.uniforms.tBillows.value?.dispose();
    this.quad.dispose();
  }
}

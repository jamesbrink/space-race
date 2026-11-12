import * as THREE from 'three';
import type { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';
import { type Clouds, cloudCutGlsl, cloudMiddle, cloudNoiseGlsl, cloudRise, cloudUniform, hazeAboveUniform, installedAir } from './air';
import { ATMOSPHERE_COARSE_GLSL, atmosphereUniforms } from './atmosphere';
import { billowsData, DETAIL_SIDE, detailData, NOISE } from './cloudnoise';
import { fieldAs } from './field';
import { uOrigin } from './origin';
import { CIRRUS_HEIGHT, cumulusBiasGlsl, cumulusCellsGlsl, DECK_HEIGHT, sheetsGlsl, WEATHER_GLSL } from './weather.ts';
import { onWeather, weatherUniforms } from './weathermap';

/** The layer the veils are drawn again on (nothing else uses it): see `drawVeils`. */
const VEIL_LAYER = 7;

/**
 * The cumulus as a volume: air.ts's cloud field, heaped into clouds and marched through.
 *
 * A cloud stands where the field's noise is over its cut (`cloudMiddle`, which makes the record's
 * cover), on a flat base at the layer's height, and rises the higher the further the noise is over
 * it, to the layer's full depth in the heart of the biggest: a fair-weather heap, wider than it is
 * tall. Billows, round lumps of three sizes (a tiling 3D noise of cells, `billows`), stand out from
 * it and cut into it, small at the foot and quickly bigger above, so a cumulus is cauliflower on top.
 * Its skin is then worn by finer lumps still (`detailMade`: 64, 32 and 16 m, crowded round the
 * billows), which only take cloud away, so the outline is crisp and knobbled; a cloud that is going
 * (the baked field's second channel) is cut far deeper and thinned, into shreds. None of this
 * reaches the base, which is the condensation level: dead flat, at one height for every cloud. The
 * billows churn slowly upward (`cloudRise`) as the field drifts.
 *
 * In the real look they are to look as cumulus photographed, not designed (the owner's word; the
 * cel look is the drawing). The light is the scene's own, every frame: nothing is baked to an hour.
 *
 * Each frame drawn, a ray from the eye through each pixel of a target half the window's size each
 * way (in CSS pixels, so a sixteenth of a dense screen's) is marched through the layer, as far as
 * the scene's depth or the haze lets anything through. Over clear air it strides: the field is
 * baked round the eye into a texture, with a map of how far each 128 m cell is from any that could
 * hold cloud, and nearer cloud it steps by how far outside the heap it is. Where it crosses into a
 * cloud the surface is found by bisection and the march goes on from there in steps laid from the
 * surface, short at first, so neighbouring pixels sample the cloud's skin alike: no rings, and no
 * noise to hide them with. At each step inside, the light is marched toward the Sun (`shadowed`:
 * six samples in a cone, Beer and Lambert), and scattered in three octaves with a two-lobed phase
 * (white toward the Sun however thick the cloud, a twentieth of that on the far side, a glowing
 * edge against the Sun), duller where the cloud is thin (powder), brighter where the skin faces
 * the Sun, darker in the creases; the sky lights it from above by how much cloud is overhead, and
 * the horizon's sky and the ground light the base, grey-blue. Each step is seen through
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
 * marched a second time at the frame's pixels (`CloudPass.fine`), and so are its creases (where
 * the first march's neighbours differ in light), only there, so neither is in the first march's
 * steps or its blur. How far off the scene's surface is, is read with the depth buffer's own
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
/**
 * Half the breadth of a far cloud's edge, in the noise's units: 90 m. (It was the breadth of the shadows' edge, 0.1:
 * a far cloud was then a pale blot three times a near one's size.)
 */
const FAR_SOFT = 0.025;
/** The billows' noise: texels a side, and metres before it repeats. */
const TILE = 1024;
/**
 * Extinction in the heart of a cloud, per metre: 60 m of cloud dims what is behind it to 5 % (a cumulus's is 0.05 to
 * 0.1). Thick enough that a lump 30 m across is a solid thing with a lit side and a shaded one, not a mist.
 */
const SIGMA = 0.05;
/** A step of the march through more optical depth than this has its opacity worked out in parts (marchShader). */
const THICK = 0.55;
/**
 * Which way a cloud's skin faces the Sun is read across this many of the march's pixels (and never less than 4.5 m):
 * see where `facing` is worked out.
 */
const FACING = 2;
/** The baked field stores the noise's excess over its cut, from BELOW under it to RANGE - BELOW over it. */
const BELOW = 0.1;
const RANGE = 0.4;
/**
 * Excess at which a cloud's top reaches the layer's full depth: a little under the noise's greatest, 0.22 over the
 * cut (one cloud in ten peaks over 0.12, half under 0.04: so towers of 500 m among heaps of 250 and scraps).
 */
const TOWER = 0.16;
/** A cloud's top rises as this power of the distance in from its edge: well under 1, so its sides are steep and its top rounded. */
const DOME = 0.65;
/**
 * Metres from a cloud's edge per unit of excess, for every metre of the field's cells (Clouds.size):
 * the reciprocal of the noise's mean slope at its cut, 0.36 a cell.
 */
const SIDE_PER_SIZE = 1 / 0.36;
/** How far the billows stand out from a cloud's dome at its top, metres (and as far again cut into it). */
const BILLOW = 140;
/** The billows' mean (billows()), about which they stand out and cut in; and how far out they stand at most, as a multiple of their size. */
const LUMPS = 0.54;
const STANDS = 2 * (1 - LUMPS);
/** How far the lumps over a cloud's base dent it up or hang it down, metres: its flatness is the condensation level's, give or take. */
const BASE_DENT = 8;
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
/**
 * The detail that wears a cloud's skin: finer lumps (64, 32 and 16 m: `detailMade`) than the billows, in a noise of
 * DETAIL_SIDE texels that repeats every DETAIL_TILE metres (which divides the billows' tile, so both rise seamlessly).
 * The creases between them are cut this many metres into the skin at a cloud's top, and less at its foot; looked up
 * where the billows push it aside (WARP, metres), so the fine lumps crowd round the big ones instead of lying on a grid.
 */
const DETAIL_TILE = 256;
const DETAIL = 30;
const DETAIL_FOOT = 10;
const WARP = 36;
/**
 * A fraying cloud (the field's second channel) is cut into this much further, metres, by lumps twice as broad; its
 * skin is this much deeper, and it is this much thinner all through: shreds one can see the sky through.
 */
const FRAY = 90;
const FRAY_SKIN = 14;
const FRAY_THIN = 0.25;
/** How much brighter than a white wall facing it the Sun's light leaves a thick cloud, with the phase and the octaves below (fitted by eye). */
const SUN_GAIN = 1.65;
/** The Earth's mean radius: the layer is a shell this far plus its height from the centre under the site. */
const EARTH = 6_371_000;

/** A cloud's outline, to be marched again finer (`CloudPass.fine`): where the march's neighbouring pixels differ by this much opacity. */
const EDGE = 0.1;
/** And its creases: where they differ by this much of their light. */
const CONTRAST = 0.1;

const VERTEX = /* glsl */ `
  in vec3 position;
  in vec2 uv;
  out vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/**
 * The cloud noise baked round the eye: its excess over the cut, from -BELOW to RANGE - BELOW, as 0 to 1 (red); and
 * how far gone each cloud is (green): 0 one that is growing, hard-edged, to 1 one that is evaporating, frayed. A
 * slow noise in the field's own frame, broader than a cloud, so a cloud is mostly one or the other and keeps it
 * as it drifts: which cloud was which is not known.
 */
const bakeShader = (c: Clouds) => /* glsl */ `
  precision highp float; precision highp int;
  uniform vec2 uCorner;
  uniform vec2 uBakeDrift;   // the clouds' drift when this was baked: the field's frame to the scene's
  out vec4 oValue;
  ${fieldAs('bake_')}
  ${cloudNoiseGlsl(c, 'bake_')}
  ${WEATHER_GLSL}
  ${cloudCutGlsl()}
  ${cumulusBiasGlsl('bake_')}
  void main() {
    vec2 at = uCorner + gl_FragCoord.xy * ${TEXEL.toFixed(1)};
    // (cut for the cover the weather has at each place: weather.ts; at the site that is the record's and nothing is added)
    vec3 w;
    float streets;
    float n = cloudNoise(at) + cumulusBias(at / ${c.size.toFixed(1)}, at + uBakeDrift, w, streets);
    float gone = smoothstep(0.52, 0.8, bake_noise2(at / ${(1.9 * c.size).toFixed(1)} + vec2(13.7, 4.1), 97));
    oValue = vec4(clamp((n - ${cloudMiddle(c).toFixed(4)} + ${BELOW.toFixed(3)}) / ${RANGE.toFixed(3)}, 0.0, 1.0), gone, 0.0, 1.0);
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
  uniform sampler3D tBillows, tDetail;
  uniform float uCel;
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
  uniform float uOld;        // (for measuring: CloudPass.old)
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

  // What inside() found on its way, for the light: the billows there, about their mean (under 0 a crease, over it a
  // lump's heart); how worn the skin is by the detail (0 on a fine lump, 1 in a crease between); how far gone the
  // cloud is (0 growing, 1 fraying); how much of the dome is overhead, metres; how far in from the dome's side.
  float gLumps, gWorn, gGone, gAbove, gHeap;
  float gPixel;   // metres a pixel of this target where the march has got to: the detail is no finer than that

  // how far inside a cloud the point v from the eye is, metres, roughly (negative outside); f: the same point in the
  // baked field's frame; y: its height in the layer, 0 at the base to 1 at the greatest top. \`skin\`: how deep the
  // skin is taken to be there, or under 0 for the cloud without its fine detail (finding it, and far along the light).
  float inside(vec3 v, vec2 f, float lod, out float y, bool billowed, float skin) {
    float depth = uLayer.y - uLayer.x;
    float h = heightAt(v) - uLayer.x;
    y = h / depth;
    gLumps = gWorn = gGone = gAbove = gHeap = 0.0;
    if (h < 0.0) return h;
    if (y > 1.0) return (1.0 - y) * depth;
    vec2 field = texture(tField, f / EXTENT).rg;
    float x = field.r * ${RANGE.toFixed(3)} - ${BELOW.toFixed(3)};
    // the heap: a dome on the field, rising from its edge as the DOME power of the distance in from it, so steeply at
    // first and then rounding over; the biggest (the noise furthest over its cut) reaching the layer's full depth.
    // Measured across (metres in from its side at this height), so the sides are as sharp as the top.
    float in_ = x * ${(SIDE_PER_SIZE * clouds.size).toFixed(1)};
    float heap = in_ - pow(h / uDome, ${(1 / DOME).toFixed(4)});
    gHeap = heap;
    gAbove = uDome * pow(max(in_, 0.0), ${DOME.toFixed(4)}) - h;
    if (!billowed || heap <= -${STANDS.toFixed(3)} * billow(y)) return heap; // (no billow reaches out so far)
    // and billows heaped on it and cut into it, bigger the higher up: lumps of 200, 95 and 45 m, so a cumulus is
    // cauliflower at the top and only scalloped at the foot
    vec3 b = textureLod(tBillows, vec3(f.x, h - uRise, f.y) / TILE, lod).rgb;
    float lumps = dot(b, vec3(0.45, 0.33, 0.22)) - ${LUMPS.toFixed(3)};
    gLumps = lumps;
    // (within 70 m of the base the billows only stand out, never cut in: the foot is as broad as the field has it)
    float foot = smoothstep(0.0, 70.0, h);
    float sd = heap + billow(y) * 2.0 * (lumps < 0.0 ? lumps * foot : lumps);
    // the base is flat, give or take the lumps over it: a plane exactly level met by an even wall drew, from under
    // it, the same clean ring round every cloud, stacked like saucers; dented a little, its rim wanders as a real one does
    sd = min(sd, h + ${BASE_DENT.toFixed(1)} * lumps);
    if (skin < 0.0 || sd <= 0.0 || uCel > 0.5) return sd;   // (a drawing has no fine detail: its line is the billows')
    // The skin is worn by finer lumps still (64, 32 and 16 m), which only ever take cloud away: the creases between
    // them are cut into it, so its outline is crisp and knobbled where the cloud is growing. One that is going is cut
    // far deeper by broader ones and has a deep, thin skin: shreds and wisps. Only within reach of the skin: deeper
    // in, the cloud is as thick either way.
    float gone = field.g;
    // (and none of it at the base itself, which is the condensation level: dead flat, whatever becomes of the cloud above)
    float cut = mix(${DETAIL_FOOT.toFixed(1)}, ${DETAIL.toFixed(1)}, sqrt(y)) * (0.25 + 0.75 * foot);
    gone *= foot;
    gGone = gone;
    if (sd < cut * (1.0 + gone) + skin + gone * ${(FRAY + FRAY_SKIN).toFixed(1)}) {
      vec3 at = vec3(f.x, h - 1.5 * uRise, f.y) + (b - 0.5) * ${WARP.toFixed(1)};
      // (no finer than a pixel and a half: a lump two pixels across is there in one frame and gone in the next as it drifts)
      float fine = max(log2(gPixel / ${(DETAIL_TILE / DETAIL_SIDE).toFixed(1)}) + 1.2, 0.0);
      float worn = 1.0 - textureLod(tDetail, at / ${DETAIL_TILE.toFixed(1)}, fine).r;
      gWorn = worn;
      sd -= cut * (1.0 + gone) * worn;
      if (gone > 0.01) sd -= gone * ${FRAY.toFixed(1)} * (1.0 - textureLod(tDetail, vec3(f.y, h - uRise, f.x) / ${(2 * DETAIL_TILE).toFixed(1)} + b * 0.12, max(fine - 1.0, 0.0)).r);
    }
    return sd;
  }
  // the cloud's extinction there, per metre: rising over \`ramp\` metres from its surface (a fraying cloud's over
  // more), and fading out far from the eye. \`detailed\`: with the skin's fine detail.
  float density(vec3 v, float ramp, float lod, out float y, out float sd, bool billowed, bool detailed) {
    sd = inside(v, uEye + v.xz, lod, y, billowed, detailed ? ramp : -1.0);
    return SIGMA * (1.0 - ${FRAY_THIN.toFixed(2)} * gGone) * smoothstep(0.0, ramp + gGone * ${FRAY_SKIN.toFixed(1)}, sd) * near(v);
  }

  float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * c, 1.5); }
  // Two lobes (Henyey and Greenstein's, as 1 for scattering evenly): most of the light goes on forward, so a thin edge
  // against the Sun glows (the silver lining; held to 9 times, or the edge burns out), and some comes back, so the
  // side toward the Sun is the brightest seen with the Sun behind
  float phase(float c, float g) { return mix(min(hg(c, g), 9.0), hg(c, -0.2), 0.45); }

  // How much cloud the Sun's light has come through to reach v, as optical depth: six samples toward it, each twice
  // as far as the last (to 570 m, most of the layer's depth), spread in a cone so one lump's shadow has a soft edge.
  // The nearest has the skin's detail, the next two the billows, the rest only the heap. The same places for every
  // pixel and every frame: nothing here is random.
  const vec3 CONE[6] = vec3[6](vec3(0.0), vec3(0.11, -0.05, 0.08), vec3(-0.1, 0.07, -0.09), vec3(0.04, 0.12, 0.1), vec3(-0.12, -0.08, 0.03), vec3(0.08, 0.02, -0.13));
  // \`toward\`: how far inside the cloud the nearest of them is: against the same at v, which way the skin there faces.
  float shadowed(vec3 v, float ramp, float lod, out float toward) {
    float tau = 0.0, s = 0.0, yy, ss;
    for (int k = 0; k < 6; k++) {
      float ds = 9.0 * exp2(float(k));
      s += ds * 0.5;
      tau += density(v + (uSun + CONE[k]) * s, max(ramp, 0.5 * ds), lod + float(k) * 0.5, yy, ss, k < 3, k < 1) * ds;
      if (k == 0) toward = ss;
      s += ds * 0.5;
    }
    return tau;
  }

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
    vec3 phases = vec3(phase(cosT, 0.75), phase(cosT, 0.4), phase(cosT, 0.2));
    float powderMix = 0.5 - 0.5 * cosT;   // thin cloud is darker seen with the Sun behind
    // A cloud is the whitest thing in sight, and a photograph is balanced to it: so the Sun's light on it is taken a
    // third of the way to white (estimated). At a low Sun it is still the Sun's colour, only less so.
    vec3 sunWhite = mix(uSunLight, vec3(dot(uSunLight, vec3(0.2126, 0.7152, 0.0722))), 0.33);
    vec3 white = uSunLight + uSkyLight;
    float whiteLum = max(dot(white, vec3(0.2126, 0.7152, 0.0722)), 1e-5);

    float T = 1.0, lit = 0.0, haze = 0.0, front = 6e4, mid = 6e4, first = 6e4, last = 6e4;
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
      gPixel = max(t * uGrain, 1.0);
      // (the billows no finer than two of this target's pixels: at one, a lump lit on one side was there in one frame and
      // gone in the next as the eye climbed, and a cloud's face crawled; only far off: nearer than 6 km nothing changes)
      float lod = max(log2(gPixel / ${(TILE / NOISE).toFixed(1)}) + 1.0, 0.0);
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
        float sd = inside(v, uEye + v.xz, lod, y, true, -1.0);
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
          if (inside(w, uEye + w.xz, lod, y, true, -1.0) > 0.0) b = m;
          else a = m;
        }
        t = a;
        deep = 0;
      }
      float step = st * min(0.25 + 0.35 * float(deep), 1.6);
      float ramp = clamp(t * 0.004, 3.0, 60.0); // the skin: a few pixels deep at any distance
      float sd;
      // Far off a step is thicker than the cloud lets light through (at 20 km the second is 48 m, and 20 m of cloud
      // dims by e): lit at its middle, a pixel's light was what reached 44 m into the cloud, which is next to none and
      // changes with every lump toward the Sun, so a far cloud's face was speckled dark and the specks changed as the
      // eye climbed (190 pixels a frame at 20 km). So where a step is thick its opacity is worked out in parts (the
      // density alone, which is cheap) and it is lit once, where the light it sends back comes from on the whole: the
      // middle of what the parts hide, each weighed by how much of it is seen. Near the eye a step is thin and is as
      // it was: at its middle (\`parts\` fades in, so nothing changes at a distance in a ring).
      float centre = 0.5 * step, through = -1.0;
      float parts = smoothstep(0.3, 0.7, SIGMA * step);
      if (parts > 0.0) {
        float count = clamp(ceil(SIGMA * step / ${THICK.toFixed(2)}), 3.0, 8.0);
        float left = 1.0, seen = 0.0, where = 0.0, part = min(step, t1 - t) / count;
        for (int j = 0; j < 8; j++) {
          if (float(j) >= count) break;
          float sj = (float(j) + 0.5) * step / count, sdj;
          float aj = 1.0 - exp(-density(dir * (t + sj), ramp, lod, y, sdj, true, true) * part);
          seen += left * aj;
          where += left * aj * sj;
          left *= 1.0 - aj;
        }
        if (seen > 1e-5) centre = mix(centre, where / seen, parts);
        through = 1.0 - left;
      }
      v = dir * (t + centre);
      float d = density(v, ramp, lod, y, sd, true, true);
      if (sd <= 0.0 && gWorn <= 0.0) {
        // out of it again, between billows or past the cloud: back to looking for cloud, from here
        t += 0.5 * step;
        was = t;
        deep = -1;
        continue;
      }
      if (d > 0.0) {
        float lumps = gLumps, worn = gWorn, above = gAbove, heap = gHeap;
        float toward, tau = shadowed(v, ramp, lod, toward);
        // The Sun's light, scattered once and again and again (octaves: each less of it, less dimmed by the cloud it
        // came through and less forward). So the side toward the Sun is white however thick the cloud, its far side
        // and its base are left a twentieth of that, and a thin edge against the Sun glows.
        // What has been scattered least still knows where the Sun is: a lump's side toward it is brighter than its
        // top or its flank, as any lit surface's is (the way the skin faces: it is shallower 4.5 m toward the Sun).
        // Far off that is read over two of this target's pixels instead: over 4.5 m it was the slope of lumps far
        // smaller than a pixel, taken at one point of it, so a far cloud's face was lit pixel by pixel as by chance and
        // every pixel changed as the eye climbed (of 24 pixels a frame that flipped at 20 km, 15 were this). Within a
        // kilometre or two of the eye it is the same sample as before.
        float span = 4.5;
        if (uOld < 0.5 && ${FACING.toFixed(1)} * gPixel > span) {
          span = ${FACING.toFixed(1)} * gPixel;
          float ys;
          density(v + uSun * span, ramp, lod, ys, toward, true, true);
        }
        float facing = 0.5 + 0.5 * clamp((sd - toward) / (2.0 * span), -1.0, 1.0);
        float sun = (phases.x * exp(-tau) + 0.5 * phases.y * exp(-0.35 * tau)) * facing + 0.2 * phases.z * exp(-0.15 * tau) * (0.6 + 0.4 * facing);
        // thin cloud has too little in it to scatter the light back (the powder of sugar): duller, seen with the Sun behind
        float thin = exp(-sd / 20.0);
        sun *= 1.0 - 0.5 * powderMix * thin;
        // The creases between lumps see less of the Sun's scattered light and of the sky than the lumps do: at the
        // skin, the billows' own value says which this is, and the detail's.
        float crease = mix(0.4, 1.0, smoothstep(-0.34, 0.1, lumps)) * (1.0 - 0.35 * worn);
        // the sky lights the top and, half as well, the sides: less with every metre of cloud overhead or outside
        float sky = max(exp(-max(above, 0.0) / 110.0), 0.5 * exp(-max(heap, 0.0) / 70.0));
        // and the base is lit from below: by the horizon's sky under the layer and by what the ground sends up, which
        // is little, so a base is grey-blue, darkest under the thickest cloud
        float low = exp(-max(y, 0.0) * (uLayer.y - uLayer.x) / 70.0);
        vec3 light = sunWhite * (sun * ${SUN_GAIN.toFixed(2)} * crease) + uSkyLight * (0.8 * sky * crease + 0.35 * low) + uGroundLight * low;
        // (a drawing's two tones are cut by how much cloud the Sun's light came through, 1 at the lit skin: not by the
        // phase, the creases or the way the skin faces, which would speckle a flat tone)
        float plain = (exp(-tau) + 0.5 * exp(-0.35 * tau) + 0.2 * exp(-0.15 * tau)) / 1.7;
        float hz = hazeLost(y * (uLayer.y - uLayer.x) + uLayer.x, t);
        float a = 1.0 - exp(-d * min(step, t1 - t));
        if (through >= 0.0) a = mix(a, through, parts);
        float w = T * a;
        colour += w * mix(light, uHaze, hz);
        lit += w * plain;
        haze += w * hz;
        T *= 1.0 - a;
        if (first > 5e4) first = t;
        last = t + min(step, t1 - t);
        if (front > 5e4 && T < 0.98) front = t;
        if (mid > 5e4 && T < 0.5) mid = t;
      }
      t += step;
      deep++;
    }
    float opacity = 1.0 - T;
    if (opacity < 1e-4) return;
    oColour = vec4(colour, opacity);
    // Thin cloud never hides half of what is behind it, and the thinnest not a fiftieth: it is in front of whatever
    // lies past its own far side. (Left at the empty pixel's 60 km, cloud under half opaque was laid over nothing
    // nearer than that: seen from above, with the sea a kilometre under it, every cloud was cut off at half opacity,
    // a hard stair with no thin edge, and that line jumped a pixel to and fro as the eye climbed: half the flicker.)
    if (uOld < 0.5) {
      if (front > 5e4) front = first;
      if (mid > 5e4) mid = last;
    }
    // (the two are kept in sixteen bits, which hold three figures: the second is past the first by more than that)
    oInfo = vec4(front, max(mid, front * 1.004 + 1.0), lit / opacity, haze / opacity);
  }

  void main() {
    ${
      sharpen
        ? /* glsl */ `
    // only where the first march's four pixels round this one disagree: on a cloud's outline, which it has in steps,
    // and where its light changes from one to the next (a crease, the line between a lump's lit side and its shaded
    // one), which brought up to the frame's size it has as a blur
    ivec2 size = textureSize(tLow, 0);
    ivec2 i0 = ivec2(floor(vUv * vec2(size) - 0.5));
    float least = 1.0, most = 0.0, dim = 1e9, bright = 0.0;
    for (int k = 0; k < 4; k++) {
      vec4 c = texelFetch(tLow, clamp(i0 + ivec2(k & 1, k >> 1), ivec2(0), size - 1), 0);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      least = min(least, c.a);
      most = max(most, c.a);
      dim = min(dim, l);
      bright = max(bright, l);
    }
    // (while the eye is still, a pixel that was marched last time is kept on at half the difference: a crease that
    // hovers about the least worth marching would otherwise be sharp in one frame and soft in the next)
    ivec2 at = ivec2(gl_FragCoord.xy);
    vec4 oc = texelFetch(tOld0, at, 0), oi = texelFetch(tOld1, at, 0);
    float need = uKeep > 0.0 && oi.x > 0.0 ? 0.5 : 1.0;
    if (most - least < ${EDGE.toFixed(3)} * need && bright - dim < ${CONTRAST.toFixed(3)} * need * bright) discard;
    marched();
    // blended with what was here while the eye is still, as the first march is (SETTLE); nothing here last time says 0
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
  uniform highp sampler3D tBillows;
  uniform float uRise;
  uniform float uDome;       // a dome's height for each metre^DOME in from its edge
  uniform vec2 uEyeXZ;       // the eye in the scene's frame
  ${fieldAs('over_')}
  ${cloudNoiseGlsl(UNIT, 'over_')}
  ${WEATHER_GLSL}
  ${cloudCutGlsl()}
  ${cumulusBiasGlsl('over_')}
  ${sheetsGlsl('over_')}
  ${cumulusCellsGlsl('over_')}
  // the field over its cut at a place (in cells): the noise's own, and by cells (0 to 1) its cells instead
  float gFpq;   // a pixel's breadth on the field, in cells: set by whoever reads the field
  float fieldOver(vec2 q, float bias, float cells) {
    float x = cells < 1.0 ? cloudNoise(q) + bias - uCumulus.y : 0.0;
    return cells > 0.0 ? mix(x, cumulusCells(q, bias, uCumulus.y, gFpq), cells) + cellsMorph(cells) : x;
  }
  ${ATMOSPHERE_COARSE_GLSL}
  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
  uniform float uAbove;      // how far the eye is out of the air, 0 to 1
  uniform vec3 uTrueSun;     // toward the Sun itself, whatever lights the scene
  // A far cloud seen through the air, from above it: what the air between leaves of its light, and the air's own
  // light in front of it, over that much of the pixel (c: its light times its opacity, and its opacity).
  vec4 throughAir(vec4 c, vec3 dir, float tm) {
    if (uAbove <= 0.0 || c.a <= 0.0) return c;
    vec3 through;
    vec3 air = atmScatter(-uRe * uUp, uRe - uEyeH, dir, 0.0, tm, uTrueSun, through);
    // (A wide bright field is dimmed less selectively than a single beam: of the light the air scatters out of the
    // line of sight, mostly blue, much is put back from the cloud beside it. Taken as most of the way to grey, or
    // cloud toward the limb came out pink where photographs have it white: estimated.)
    through = mix(through, vec3(dot(through, vec3(0.3, 0.4, 0.3))), 0.7);
    return vec4(mix(c.rgb, c.rgb * through + air * c.a, uAbove), c.a);
  }
  // The Sun's light on a far cloud's top: near the site the scene's own (so a far cloud and a near one are lit
  // alike where one hands over to the other); far off, the true Sun's through the air over that place, so cloud
  // along the terminator is red and beyond it dark, whatever the hour at the site. h: the top's height;
  // up: straight up there; v: the place, from the eye.
  vec3 sunOn(float h, vec3 up, vec3 v) {
    vec3 scene = mix(uSunLight, vec3(dot(uSunLight, LUMA)), 0.33) * smoothstep(-0.05, 0.25, dot(up, uSun));
    vec3 true_ = uAtmSunLight * atmSunAt(h, dot(up, uTrueSun)) / 3.14159265;
    return mix(scene, mix(true_, vec3(dot(true_, LUMA)), 0.33), uAbove * smoothstep(60000.0, 300000.0, length(uEyeXZ + v.xz)));
  }

  // the cloud's two flat tones in the cel look, by how well lit it is, seen through the haze
  vec3 celTone(float l, float edge, float hz) {
    vec3 tone = mix(uSkyLight * 1.1 + uSunLight * 0.35, uSunLight * 0.95 + uSkyLight, smoothstep(0.62 - edge, 0.62 + edge, l));
    return mix(tone, uHaze, hz);
  }

  // how far along a ray the shell hm above the sea is: from above it, the nearer crossing; from under it, the
  // further. -1 where there is none. From above, the shell ends at its limb, a pixel or two over the Earth's: faded
  // across a pixel there (limb), not cut.
  float shellHit(vec3 dir, float hm, out float limb) {
    float rs = EARTH + hm;
    float ud = dot(uUp, dir), b = uRe * ud, c = (uEyeH - hm) * (uRe + rs);
    limb = 1.0;
    float root = sqrt(max(b * b - c, 0.0));
    if (uEyeH < hm) return root - b;
    if (ud >= 0.0) return -1.0;
    limb = clamp(0.5 + (-ud - sqrt(c) / uRe) * uRe / (rs * uFine), 0.0, 1.0);
    return limb > 0.0 ? c / (root - b) : -1.0;
  }
  // Whether the scene's surface, d off, is in front of far cloud tm off. Not by which is the nearer: tens and hundreds
  // of kilometres off the depth buffer's steps are kilometres (a tenth of the distance at the limb with the near
  // plane at a metre), and the sea a kilometre under a cloud came out in front of it in blocks. What does stand in
  // front of far cloud is either close to the eye (the vehicle) or the ground this side of the horizon with the
  // cloud beyond it, and either way it is nearer by far: by a quarter of the way, at the least.
  bool hidden(float tm, float d) { return d < 0.75 * tm; }
  // the haze between the eye and v from it, over the Earth's curve, as the light lost: the ray in six pieces, each
  // with its height taken as changing evenly along it (as globe.ts hazes the sea under the clouds: toward the limb a
  // ray stays low in the air ten times as long as a flat Earth would have it)
  float hazeTo(vec3 v) {
    float tau = 0.0, ha = max(uEyeH, 0.0) / uScale;
    for (int k = 1; k <= 6; k++) {
      float hb = max(heightAt(v * (float(k) / 6.0)), 0.0) / uScale;
      tau += hazeMean(ha, hb);
      ha = hb;
    }
    return 1.0 - exp(-uHazeDensity * tau * length(v) / 6.0);
  }

  // The far cumulus: the field where the volume has faded out (near), behind it, out to the limb. Worked out at the
  // frame's own pixels, not the march's: far off the clouds are small, and a quarter of the pixels drew them as blocks.
  //
  // Where a cloud is more than a pixel or so across it is drawn as three slices through the heap the volume would
  // be, at three heights, each cut where the dome has narrowed to at that height and scalloped by the billows there,
  // the highest in front: so from orbit a cumulus has a top that stands over its foot (it shifts against the sea as
  // the eye moves), a lit side and a shaded one. Where clouds are under a pixel there is nothing to draw but how
  // much of the sky they cover there, and that is not one number: it is the weather's (weather.ts), gathered and
  // lined up along the wind as the field is, and more seen aslant (a field of heaps looked along hides the gaps
  // between them). So cloud goes on to the limb, in the weather's own shapes, and nothing shimmers.
  // \`d\`: how far off the scene's surface is; \`dv\`, \`veil\`: the nearest fire or smoke, and how much it covers.
  // How high a heap's top stands over a place of the field (in cells), metres above the base: the dome the volume
  // has there (clouds.ts: inside()), with the billows on it as far as \`lod\` shows them.
  float gOver;   // the field over its cut where heapTop last read it
  float heapTop(vec2 q, float bias, float lod, float cells) {
    float x = fieldOver(q, bias, cells);
    gOver = x;
    if (x <= 0.0) return 0.0;
    float h = min(uDome * pow(x * ${SIDE_PER_SIZE.toFixed(4)} * uCumulus.x, ${DOME.toFixed(4)}), uLayer.y - uLayer.x);
    vec3 b = textureLod(tBillows, vec3(q.x * uCumulus.x, 0.6 * (uLayer.y - uLayer.x) - uRise, q.y * uCumulus.x) / ${TILE.toFixed(1)}, lod).rgb;
    return h + ${BILLOW.toFixed(1)} * (dot(b, vec3(0.45, 0.33, 0.22)) - ${LUMPS.toFixed(3)}) * smoothstep(0.0, 150.0, h);
  }
  vec4 farCumulus(vec3 dir, float d, float dv, float veil) {
    float ud = dot(uUp, dir);
    // (most of the frame stops here: the rays that meet the shell, past the sea's horizon or the nearest the volume fades)
    if (ud <= uFarSpan.x || ud >= uFarSpan.y) return vec4(0.0);
    float depth = uLayer.y - uLayer.x;
    bool under = uEyeH < uLayer.x + 0.3 * depth;
    float limb, tm = shellHit(dir, uLayer.x + 0.3 * depth, limb);
    if (tm < 0.0 || hidden(tm, d)) return vec4(0.0);
    vec3 v = dir * tm;
    float far = 1.0 - near(v);
    if (far <= 0.0) return vec4(0.0);
    vec3 up = normalize(uRe * uUp + v);
    float cosv = max(abs(dot(up, dir)), 0.05);
    // metres of the shell a pixel: across the line of sight, and along it (far more, looked along)
    float fpAcross = tm * uFine, fp = fpAcross / cosv;
    vec2 q0 = (uField + v.xz) / uCumulus.x;
    vec3 w;
    float streets;
    float bias = cumulusBias(q0, uEyeXZ + v.xz, w, streets);
    // three ways, each fading into the next: slices, while a cloud is more than a pixel or so both ways; then, while it
    // still is across but not along (looked along, toward the limb), the field averaged along the pixel's length; then
    // only how much of the sky is covered
    gFpq = fpAcross / uCumulus.x;
    float along = smoothstep(0.12 * uCumulus.x, 0.5 * uCumulus.x, fp);
    float even = smoothstep(0.12 * uCumulus.x, 0.6 * uCumulus.x, fpAcross);
    float sunUp = dot(up, uSun);
    vec3 sunWhite = mix(uSunLight, vec3(dot(uSunLight, LUMA)), 0.33);   // (as the march has it)
    // the sheets over them take some of the Sun (by how much of each there is thereabouts)
    vec3 sunTop = sunOn(uLayer.y, up, v) * (1.0 - 0.7 * deckCoverAt(w, uEyeXZ + v.xz)) * (1.0 - 0.3 * w.g);
    vec3 bases = sunWhite * 0.1 * max(sunUp, 0.0) + uSkyLight * 0.6 + uGroundLight * 0.5;
    vec4 acc = vec4(0.0);
    float lit = 0.0;   // (cel) how well lit, by opacity
    // (the edge is as soft as a pixel is broad; the cut is moved up with it, or the soft edge, lying where there is
    // more of the noise under the cut than over it, would add to the cover)
    // (the edge is the pixel's own share of cloud: across a pixel and a half of the field the noise climbs by about
    // 0.36 a cell times that, so the outline is coverage, soft over that breadth, and never a threshold's stair)
    // (a cell's side is two or three times as steep as the noise's, 0.9 to 1.6 a cell against 0.36: so as cells the
    // edge is taken that much broader, or it was a third of a pixel and flickered as the eye climbed)
    float wd = ${(FAR_SOFT / 2).toFixed(4)} + 0.6 * fpAcross / uCumulus.x * (1.0 + 1.5 * (under ? 0.0 : cellsShare(fpAcross)));
    // seen aslant a field of heaps hides the gaps between them: each covers its own breadth and its height's shadow
    float overHere = -1.0;   // the field over its cut here, where the slices are drawn
    float aslant = min(sqrt(max(1.0 - cosv * cosv, 0.0)) / cosv, 12.0);
    if (along < 1.0) {
      float lod = max(log2(fpAcross / ${(TILE / NOISE).toFixed(1)}), 0.0);
      // (seen from far above, as cells: weather.ts)
      float cells = under ? 0.0 : cellsShare(fpAcross);
      // (for the light, the billows no finer than two pixels: lit lump by lump at one, a cloud was a stipple of white
      // pixels and grey that would crawl as it drifted)
      float soft = lod + 1.0;
      vec2 sunward = uSun.xz / max(length(uSun.xz), 1e-3);
      // The light on a heap, from its shape: how high its top stands here, a little way toward the Sun and further
      // that way (heapTop: the dome the volume has, with its billows). Where the top falls away toward the Sun it
      // faces it and is the brightest; where it rises that way it is turned from it, and where what stands sunward
      // is higher than the Sun's rays clear, it is in that shadow. Thin cloud at a heap's edge is dimmer, and seen
      // through. So from straight over them the cumulus have a lit side, a shaded side and a soft rim.
      float span = max(2.5 * fpAcross, 120.0);
      vec2 toSun = sunward * span / uCumulus.x;
      float h0 = heapTop(q0, bias, soft, cells);
      overHere = gOver;
      // (how many pixels across the cell here is: one of a few pixels has no lit side and shaded side to show, and
      // drawn with them was a white pixel beside a dark one: a hard speck with a dark rim, where from orbit a small
      // cumulus is a soft pale dot)
      float across = cells > 0.0 ? mix(8.0, 2.0 * gCell * uCumulus.x / fpAcross, cells) : 8.0;
      float shaped = smoothstep(2.0, 7.0, across);
      float h1 = heapTop(q0 + toSun, bias, soft, cells), h2 = h0 > 0.0 ? heapTop(q0 + 3.0 * toSun, bias, soft, cells) : 0.0;
      float sunLow = sqrt(max(1.0 - sunUp * sunUp, 0.0));
      float rise = (h1 - h0) / span;
      float facing = (sunUp - rise * sunLow) / (sqrt(1.0 + rise * rise) * max(sunUp, 0.12));
      float shadow = max(smoothstep(0.0, 60.0, h1 - h0 - span * sunUp / max(sunLow, 0.05)), smoothstep(0.0, 90.0, h2 - h0 - 3.0 * span * sunUp / max(sunLow, 0.05)));
      float thick = smoothstep(0.0, 260.0, h0);
      // (a small heap is thin, and thin cloud is grey beside a thick one's white: so a field has every brightness in it)
      float shape = mix(0.85, mix(0.36, 1.15, smoothstep(0.15, 1.5, facing)) * (1.0 - 0.5 * shadow), shaped) * (0.45 + 0.55 * thick);
      // (and thin cloud is seen through: a puff 100 m deep hides two thirds of the sea under it)
      float rim = under ? 1.0 : mix(0.18, 1.0, smoothstep(0.0, 180.0, h0));
      // (as cells, the field is read for the highest slice and the lowest and taken as running evenly between: the
      // slices are a few hundred metres apart on it at most, and reading the cells five times cost as many milliseconds)
      float overTop = 0.0, overBase = 0.0;
      if (cells >= 1.0) {
        float l0, l4, t0 = shellHit(dir, uLayer.x + 0.9 * depth, l0), t4 = shellHit(dir, uLayer.x + 0.06 * depth, l4);
        overTop = fieldOver((uField + dir.xz * max(t0, 0.0)) / uCumulus.x, bias, 1.0);
        overBase = fieldOver((uField + dir.xz * max(t4, 0.0)) / uCumulus.x, bias, 1.0);
      }
      for (int k = 0; k < (under ? 1 : 5); k++) {
        float y = under ? 0.06 : 0.9 - 0.21 * float(k);
        float lk, tk = shellHit(dir, uLayer.x + y * depth, lk);
        if (tk < 0.0) continue;
        vec2 f = uField + dir.xz * tk;
        float smooth_ = uCumulus.y + (cells >= 1.0 ? mix(overTop, overBase, float(k) / 4.0) : fieldOver(f / uCumulus.x, bias, cells));
        // with the billows the volume has at that height, as far as a pixel can show them: so a far cloud's outline is
        // scalloped in round lumps as a near one's is, not the noise's own ragged line, and one becomes the other unseen
        // (and no lump under three pixels across: smaller, they tore a far cloud's rim into confetti, where from orbit a
        // cumulus is a rounded cell)
        vec3 b = textureLod(tBillows, vec3(f.x, y * depth - uRise, f.y) / ${TILE.toFixed(1)}, lod + 1.6).rgb;
        float lumps = dot(b, vec3(0.45, 0.33, 0.22)) - ${LUMPS.toFixed(3)};
        float n = smooth_ + lumps * 2.0 * mix(${FOOT.toFixed(1)}, ${BILLOW.toFixed(1)}, sqrt(y)) / (${SIDE_PER_SIZE.toFixed(4)} * uCumulus.x);
        // (the dome at this height is in from the field's edge by what the volume has it: clouds.ts, inside())
        float need = uCumulus.y + 0.3 * wd + pow(y * depth / uDome, ${(1 / DOME).toFixed(4)}) / (${SIDE_PER_SIZE.toFixed(4)} * uCumulus.x);
        float a = smoothstep(need - wd, need + wd, n);
        if (a <= 0.0) continue;
        // (a slice lower in the heap is its side, a little darker than its top)
        float sun = shape * (0.7 + 0.3 * y);
        vec3 light = under ? bases : sunTop * sun + uSkyLight * (0.4 + 0.3 * y + 0.2 * thick);
        float t = (1.0 - acc.a) * a * rim;
        acc += t * vec4(light, 1.0);
        lit += t * (under ? 0.3 : sun);
      }
    }
    // Thin cloud between and round the heaps, from far above: where the field is a little under its cut the air is
    // nearly saturated, and what is there is scraps and haze under a pixel, seen as a faint veil that thickens toward
    // each heap. So a field runs from clear air through haze to bright cores, and no heap ends at a line. (Estimated.)
    if (along < 1.0 && !under) {
      float veiled = 0.3 * cellsShare(fpAcross) * smoothstep(-0.075, 0.005, overHere) * (1.0 - along);
      acc += (1.0 - acc.a) * veiled * vec4(sunTop * 0.62 + uSkyLight * 0.6, 1.0);
      lit += (1.0 - acc.a) * veiled * 0.5;
    }
    if (along > 0.0 && even < 1.0) {
      // the field along the pixel's length, four places: a cloud looked along is a sliver, and a row of them a line
      vec2 run = normalize(dir.xz + 1e-6) * min(fp, 6.0 * uCumulus.x) / uCumulus.x;
      float a = 0.0;
      for (int k = 0; k < 4; k++) {
        float n = cloudNoise(q0 + run * (float(k) - 1.5) / 4.0) + bias;
        a += smoothstep(uCumulus.y + 0.3 * wd - wd, uCumulus.y + 0.3 * wd + wd, n);
      }
      a = 1.0 - pow(1.0 - 0.25 * a, 1.0 + ${(0.7 * 0.45).toFixed(3)} * aslant);
      // (what is seen of them from here is their sides as much as their tops: toward the Sun or away from it)
      vec3 light = under ? bases : sunTop * mix(0.62, 0.95, 0.5 + 0.5 * dot(normalize(dir.xz + 1e-6), -uSun.xz / max(length(uSun.xz), 1e-3)) * sqrt(max(1.0 - sunUp * sunUp, 0.0))) + uSkyLight * 0.8;
      acc = mix(acc, vec4(light, 1.0) * a, along);
      lit = mix(lit, a * 0.8, along);
    }
    if (even > 0.0) {
      float fine = 1.0 - smoothstep(2.0 * uCumulus.x, 8.0 * uCumulus.x, fpAcross);
      float gather = over_noise2(q0 * 0.23 + vec2(1.7, 5.3), 94) - 0.5;
      float c = clamp(w.r * exp(fine * (5.0 * gather + 7.0 * streets)), 0.0, 1.0);
      float a = 1.0 - pow(1.0 - c, 1.0 + ${(0.7 * 0.45).toFixed(3)} * aslant);
      vec3 light = under ? bases : sunTop * 0.9 + uSkyLight * 0.8;
      acc = mix(acc, vec4(light, 1.0) * a, even);
      lit = mix(lit, a * 0.8, even);
    }
    if (acc.a <= 0.0) return vec4(0.0);
    float hz = hazeTo(v);
    float shown = mix(1.0 - veil, 1.0, step(tm, dv)) * far * limb;   // (behind fire or smoke, what shows through it)
    if (uCel < 0.5) return throughAir(vec4(mix(acc.rgb, uHaze * acc.a, hz), acc.a), dir, tm) * (0.97 * shown);
    // drawn: cut at half, in flat tones; where the cover is spread evenly there are no clouds to draw, only their
    // tint, laid on as it is
    float cut = smoothstep(0.5 - max(fwidth(acc.a), 1e-3), 0.5 + max(fwidth(acc.a), 1e-3), acc.a);
    float l = lit / max(acc.a, 1e-4);
    return vec4(celTone(l, 1e-3 + max(even, along), hz), 1.0) * (mix(cut, acc.a, max(even, along)) * shown);
  }

  // The sheets over the cumulus: the middle deck (\`kind\` 0) and the cirrus (1), each on a shell at its own height
  // (weather.ts), seen from above, from under, and along. Drawn here, at the frame's pixels: they are thin, and
  // have no depth to march.
  vec4 sheet(vec3 dir, int kind, float d, float dv, float veil) {
    float height = kind == 0 ? ${DECK_HEIGHT.toFixed(1)} : ${CIRRUS_HEIGHT.toFixed(1)};
    float limb, tm = shellHit(dir, height, limb);
    if (tm < 0.0 || hidden(tm, d)) return vec4(0.0);
    vec3 v = dir * tm;
    vec3 up = normalize(uRe * uUp + v);
    float cosv = max(abs(dot(up, dir)), 0.05);
    float fp = tm * uFine / sqrt(cosv);
    vec2 xz = uEyeXZ + v.xz;
    vec3 w = weatherAt(xz);
    float a = kind == 0 ? deckAt(xz, fp, deckCoverAt(w, xz)) : cirrusAt(xz, fp, w.g);
    if (a <= 0.0) return vec4(0.0);
    float thick = smoothstep(0.15, 0.9, a);   // (where it is thickest it is whitest: a cloudlet's heart, a fibre's middle)
    // looked along, a sheet is as many times thicker as the ray is longer in it
    a = 1.0 - pow(1.0 - a, min(1.0 / cosv, uEyeH < height ? 2.2 : kind == 0 ? 5.0 : 3.5));
    // (and the eye goes through it, not into a wall: nothing of it close by)
    a *= limb * smoothstep(0.0, kind == 0 ? 3000.0 : 8000.0, tm);
    float sunUp = dot(up, uSun);
    vec3 sunWhite = sunOn(height, up, v);
    bool under = uEyeH < height;
    // from above, its lit top (the cirrus's ice a little brighter toward the Sun); from under, the light that comes
    // through it, most where the Sun is behind it, and the sky's
    float toSun = max(dot(dir, uSun), 0.0);
    vec3 light = under
      ? sunWhite * (kind == 0 ? 0.6 : 0.75) * (0.8 + 0.9 * pow(toSun, 6.0)) + uSkyLight * (kind == 0 ? 0.8 : 0.9) + uGroundLight * 0.2
      : sunWhite * (kind == 0 ? 0.98 : 0.92) * (0.7 + 0.3 * thick) + uSkyLight * 0.85;
    float hz = hazeTo(v);
    float shown = mix(1.0 - veil, 1.0, step(tm, dv));
    if (uCel < 0.5) return throughAir(vec4(mix(light, uHaze, hz), 1.0) * a, dir, tm) * shown;
    float cut = kind == 0 ? smoothstep(0.4, 0.5, a) : 0.0;   // (a drawing has no cirrus: a wash is not a shape)
    return vec4(celTone(under ? 0.3 : 0.9, 1e-3, hz), 1.0) * (cut * shown);
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
    float least = 1.0, most = 0.0, dim = 1e9, bright = 0.0;
    for (int k = 0; k < 4; k++) {
      at[k] = clamp(ivec2(i0) + ivec2(k & 1, k >> 1), ivec2(0), size - 1);
      c[k] = texelFetch(tCloud, at[k], 0);
      any += c[k].a;
      float l = dot(c[k].rgb, vec3(0.2126, 0.7152, 0.0722));
      least = min(least, c[k].a);
      most = max(most, c[k].a);
      dim = min(dim, l);
      bright = max(bright, l);
      // (on a plain screen the outline's pixels are the frame's: one of the four has all the weight)
      fi[k] = vec4(0.0);
      float w = w4(k, fq);
      if (w < 1e-3) continue;
      fat[k] = clamp(ivec2(j0) + ivec2(k & 1, k >> 1), ivec2(0), fine - 1);
      fi[k] = texelFetch(tFineInfo, fat[k], 0);
      if (fi[k].x > 0.0) sharp += w;
    }
    // How much the finer march is believed here: nothing where the first march's pixels only just differ enough for
    // it to have been marched at all (marchShader's test, made again), all of it where they differ by twice that. So
    // a crease that hovers about the least worth marching fades between the two as the eye moves, and does not blink.
    float finer = smoothstep(1.0, 2.0, max((most - least) / ${EDGE.toFixed(3)}, (bright - dim) / (${CONTRAST.toFixed(3)} * max(bright, 1e-5))));
    sharp *= finer;
    vec3 ray = viewRay(uv), dir = normalize(uTurn * ray);
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
      if (fi[k].x > 0.0 && finer > 0.0) lay(texelFetch(tFine, fat[k], 0), fi[k], finer * w4(k, fq), d, dv, veil, cloud, tone);
      if (sharp < 0.999 && c[k].a > 0.0) lay(c[k], texelFetch(tInfo, at[k], 0), (1.0 - sharp) * w4(k, fr), d, dv, veil, cloud, tone);
    }
    if (uCel > 0.5) {
      // drawn: cut at half opacity, in two tones, at this resolution
      float a = cloud.a;
      float alpha = smoothstep(0.5 - max(fwidth(a), 1e-3), 0.5 + max(fwidth(a), 1e-3), a);
      float l = tone.x / max(a, 1e-4);
      cloud = vec4(celTone(l, max(fwidth(l), 1e-3), tone.y / max(a, 1e-4)), 1.0) * alpha;
    }
    cloud += (1.0 - cloud.a) * farCumulus(dir, d, dv, veil);
    // the sheets: whichever of them the eye is over lie in front of the cumulus, the rest behind
    vec4 deck = sheet(dir, 0, d, dv, veil), cirrus = sheet(dir, 1, d, dv, veil);
    vec4 all = uEyeH > ${CIRRUS_HEIGHT.toFixed(1)} ? cirrus : vec4(0.0);
    if (uEyeH > ${DECK_HEIGHT.toFixed(1)}) all += (1.0 - all.a) * deck;
    all += (1.0 - all.a) * cloud;
    if (uEyeH <= ${DECK_HEIGHT.toFixed(1)}) all += (1.0 - all.a) * deck;
    if (uEyeH <= ${CIRRUS_HEIGHT.toFixed(1)}) all += (1.0 - all.a) * cirrus;
    return all;
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

/** The billows' tile (cloudnoise.ts) as the texture the march reads. */
function billowsOf(data: Uint8Array<ArrayBuffer>): THREE.Data3DTexture {
  const n = NOISE;
  const texture = new THREE.Data3DTexture(data, n, n, n);
  texture.format = THREE.RGBAFormat;
  texture.wrapS = texture.wrapT = texture.wrapR = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/** The detail's tile (cloudnoise.ts) as the texture the march reads. */
function detailOf(data: Uint8Array<ArrayBuffer>): THREE.Data3DTexture {
  const n = DETAIL_SIDE;
  const texture = new THREE.Data3DTexture(data, n, n, n);
  texture.format = THREE.RedFormat;
  texture.wrapS = texture.wrapT = texture.wrapR = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  return texture;
}

/** The two tiles: how each is made (a few slices at a time) and made into a texture. */
const TILES = [
  { name: 'billows', made: billowsData, of: billowsOf },
  { name: 'detail', made: detailData, of: detailOf },
] as const;

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

const target = (size: number, linear: boolean, format: THREE.PixelFormat = THREE.RedFormat) =>
  new THREE.WebGLRenderTarget(size, size, {
    format,
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
  /** The stage is frozen for a test (Stage.frozen): nothing of an earlier frame is kept, so a frame drawn again is the same frame. */
  frozen = false;
  /** Draw as before the last changes to the march, for measuring the new against the old in one page (`sr.stage.clouds.old = true`). */
  old = false;
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
  /** The veils' materials that do not write depth, made to for the veils' own draw (`drawVeils`). */
  private readonly lent: THREE.Material[] = [];
  private readonly cleared = new THREE.Color();
  private readonly field = target(SIDE, true, THREE.RGFormat);
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
    tDetail: { value: null as THREE.Data3DTexture | null },
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
    uEyeXZ: { value: new THREE.Vector2() },
    uAbove: { value: 0 },
    uOld: { value: 0 },
    ...weatherUniforms,
    ...atmosphereUniforms,
  };
  /** What was baked: for which clouds, round which point of the field (its frame, metres). */
  private baked: { clouds: Clouds; x: number; z: number; driftX: number; driftZ: number } | null = null;
  /** The weather's map has arrived since the field was baked. */
  private stale = false;
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
    onWeather(() => {
      this.stale = true;
    });
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

  /**
   * Make what the clouds are drawn with before anyone is looking (Stage.warm): the two tiles of noise, by a worker
   * while the page gets on with loading, or where there is none a few slices at a time here. Whichever comes first is
   * kept: a frame that cannot wait makes them on the spot (`render`), and what arrives after that is dropped.
   */
  async warm(): Promise<void> {
    const u = this.uniforms;
    const into = { billows: u.tBillows, detail: u.tDetail };
    if (TILES.every((t) => into[t.name].value)) return;
    const worked = await new Promise<Record<'billows' | 'detail', Uint8Array<ArrayBuffer>> | null>((done) => {
      try {
        const worker = new Worker(new URL('./cloudnoise.worker.ts', import.meta.url), { type: 'module' });
        const end = (data: Record<'billows' | 'detail', Uint8Array<ArrayBuffer>> | null): void => {
          worker.terminate();
          done(data);
        };
        worker.onmessage = (e: MessageEvent<Record<'billows' | 'detail', Uint8Array<ArrayBuffer>>>) => end(e.data);
        worker.onerror = () => end(null);
      } catch {
        done(null); // (no workers here, or none from this address)
      }
    });
    for (const tile of TILES) {
      const slot = into[tile.name];
      if (slot.value) continue;
      if (worked) {
        slot.value = tile.of(worked[tile.name]);
        continue;
      }
      const making = tile.made();
      let r = making.next();
      for (; !r.done; r = making.next()) await new Promise((done) => setTimeout(done, 0));
      slot.value ??= tile.of(r.value);
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
    u.uEyeXZ.value.set(eye.x, eye.z);
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
    u.uOld.value = Number(this.old);
    this.light(fog);

    this.march ??= raw(marchShader(clouds, false), u);
    this.sharpen ??= raw(marchShader(clouds, true), { ...u, ...this.finer });
    // (not warmed yet: made now, all at once)
    for (const tile of TILES) {
      const slot = tile.name === 'billows' ? u.tBillows : u.tDetail;
      if (slot.value) continue;
      const making = tile.made();
      let r = making.next();
      while (!r.done) r = making.next();
      slot.value = tile.of(r.value);
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
      !this.frozen &&
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

  /**
   * Put something under a veil on the veils' layer, and have its materials write depth for the veils' own draw
   * (`drawVeils`), which puts back the ones that did not (`lent`). Materials are read each time: the look swaps them.
   */
  private readonly lend = (m: THREE.Object3D): void => {
    m.layers.enable(VEIL_LAYER);
    const material = (m as THREE.Mesh).material;
    if (!material) return;
    if (Array.isArray(material)) {
      for (const each of material) {
        if (each.depthWrite) continue;
        each.depthWrite = true;
        this.lent.push(each);
      }
    } else if (!material.depthWrite) {
      material.depthWrite = true;
      this.lent.push(material);
    }
  };

  /** The scene as the veils' own draw sees it: its children, under a scene with a lighting state of its own (`drawVeils`). */
  private readonly veiled = Object.assign(new THREE.Scene(), { matrixAutoUpdate: false, matrixWorldAutoUpdate: false });

  /** Draw the veils on show on their own, with their depth: false if none is. */
  private drawVeils(renderer: THREE.WebGLRenderer, frame: THREE.WebGLRenderTarget): boolean {
    // their materials write depth for this one draw, so the nearest of them is kept where they overlap
    const lent = this.lent;
    lent.length = 0;
    let any = false;
    for (const o of this.veils) {
      let p: THREE.Object3D = o;
      for (; p.parent; p = p.parent) if (!p.visible) break;
      if (p !== this.scene) continue; // (in the scene, and shown all the way up)
      any = true;
      // (nearly every veil is one mesh, a pane of glass: nothing to walk)
      if (o.children.length) o.traverse(this.lend);
      else this.lend(o);
    }
    if (!any) return false;
    if (this.veil.width !== frame.width || this.veil.height !== frame.height) this.veil.setSize(frame.width, frame.height);
    const clear = renderer.getClearColor(this.cleared),
      alpha = renderer.getClearAlpha(),
      autoClear = renderer.autoClear;
    renderer.setRenderTarget(this.veil);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, false);
    renderer.autoClear = false;
    // All of them in one draw of the scene, seen on their own layer: a draw call each, not a render each (a frame
    // has dozens of panes of glass). The scene has just been drawn and nothing has moved since, so its world
    // matrices are not worked out again.
    //
    // It is drawn as a scene of its own that holds the scene's own children (`veiled`), not as the scene: on this
    // layer the camera sees no lights, and three keeps one lighting state for each scene it draws. Drawn as the
    // scene itself, the state went from the frame's lights to none and back every frame, and each change sent every
    // lit material in the frame to have its shader looked up again (its whole description rebuilt, 1.4 MB of
    // garbage a frame, a fifth of the frame's time on the main thread). The picture is the same: the same objects,
    // the same sky in the glass, the same fog, no lights as before.
    const mask = this.camera.layers.mask;
    const veiled = this.veiled;
    veiled.children = this.scene.children;
    veiled.environment = this.scene.environment;
    veiled.environmentIntensity = this.scene.environmentIntensity;
    veiled.environmentRotation.copy(this.scene.environmentRotation);
    veiled.background = this.scene.background;
    veiled.backgroundIntensity = this.scene.backgroundIntensity;
    veiled.fog = this.scene.fog;
    veiled.overrideMaterial = this.scene.overrideMaterial;
    this.camera.layers.set(VEIL_LAYER);
    try {
      renderer.render(veiled, this.camera);
    } finally {
      this.camera.layers.mask = mask;
      for (const m of lent) m.depthWrite = false;
      lent.length = 0;
    }
    renderer.autoClear = autoClear;
    renderer.setClearColor(clear, alpha);
    return true;
  }

  /** Bake the field round the eye (x, z in the field's frame) if it has gone far over the last bake. */
  private bake(renderer: THREE.WebGLRenderer, clouds: Clouds, x: number, z: number): void {
    const b = this.baked;
    // (and again when the weather's map arrives, or the clouds have drifted 4 km over it: the map is fixed to the Earth)
    const drift = cloudUniform.value;
    if (
      b &&
      b.clouds === clouds &&
      !this.stale &&
      Math.abs(x - b.x) < REBAKE &&
      Math.abs(z - b.z) < REBAKE &&
      Math.abs(drift.x - b.driftX) + Math.abs(drift.z - b.driftZ) < 4000
    )
      return;
    this.stale = false;
    const cx = Math.round(x / SNAP) * SNAP,
      cz = Math.round(z / SNAP) * SNAP;
    if (!b || b.clouds !== clouds) {
      this.bakeMaterial?.dispose();
      this.bakeMaterial = raw(bakeShader(clouds), {
        uCorner: { value: new THREE.Vector2() },
        uBakeDrift: { value: new THREE.Vector2() },
        ...weatherUniforms,
      });
      this.reduce.uniforms.uOccupied!.value = (BELOW + reaches(SIDE_PER_SIZE * clouds.size)) / RANGE - 0.5 / 255;
    }
    this.baked = { clouds, x: cx, z: cz, driftX: drift.x, driftZ: drift.z };
    const bake = this.bakeMaterial!;
    (bake.uniforms.uCorner!.value as THREE.Vector2).set(cx - EXTENT / 2, cz - EXTENT / 2);
    (bake.uniforms.uBakeDrift!.value as THREE.Vector2).set(drift.x, drift.z);
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
    // (the haze goes as the eye leaves the air, as it does for everything else: air.ts; from above, the air in front
    // of a far cloud is atmosphere.ts's)
    u.uHazeDensity.value = fog.density * (1 - above);
    u.uAbove.value = above;
  }

  dispose(): void {
    for (const t of [this.low, ...this.history, ...this.fine, this.veil, this.field, this.cells, this.row, this.clearAir]) t.dispose();
    this.uniforms.tBillows.value?.dispose();
    this.uniforms.tDetail.value?.dispose();
    this.quad.dispose();
  }
}

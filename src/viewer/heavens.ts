import * as THREE from 'three';
import { refraction, type Seen, type Sky } from '../world/ephemeris.ts';
import { EARTH_SPHERE } from '../world/bodies.ts';
import { DEG, enuToSite, fromEquatorial, fromHorizontal, j2000ToSite, type Site, scale, sub, unit, type Vec3 } from '../world/frames.ts';
import { MILKY_WAY, STAR_STRIDE, STARS, starColour, starMotion, yearsFrom2000 } from '../world/stars.ts';
import { airmass } from './daysky.ts';
import { later } from './later.ts';
import { queued } from './pack.ts';

/**
 * What is in the sky besides the Sun: the Moon, the stars and the planets, each where
 * src/world/ephemeris.ts puts it for a site and an instant, in the site's own frame (which is the
 * models'). Both skies draw from here: the ground's dome (backdrops.ts) and the view from orbit
 * (space.ts). It is moved to an instant by `Heavens.at`; whoever calls that knows whether the
 * change is worth a redraw.
 *
 * Positions, sizes, the Moon's phase and the tilt of its lit limb are computed. How bright each
 * thing is drawn is chosen by eye against the sky's own colours, from these facts: the sunlit Moon
 * is about as bright as the blue of the zenith by day, which is why a high daytime Moon is a pale
 * patch and a low one is nearly lost in the haze; air dims what is low (0.2 magnitudes for each
 * thickness of atmosphere looked through); and the brightening sky hides the stars in order of
 * faintness. The Moon is a plain grey ball: no maria, no earthshine, no libration.
 */

/** The fraction of light that gets through that much air on a clear night at sea level: 0.2 magnitudes an airmass. */
const transmission = (elevation: number): number => 10 ** (-0.4 * 0.2 * airmass(elevation / DEG));

/** The sunlit Moon against the sky shader's colours, where a sunlit cloud is about 1. */
const MOON_RADIANCE = 0.16;

/**
 * The Moon as light arriving along a direction: a sphere lit by the Sun, shaded by the
 * Lommel-Seeliger law (which is why the full Moon is a flat disc, not a ball), with its limb
 * anti-aliased. Returns nothing outside the disc and on the unlit part, so by day the dark of the
 * Moon is the colour of the sky, as it is.
 */
export const MOON_GLSL = /* glsl */ `
  uniform vec3 uMoon;       // toward the Moon
  uniform vec3 uMoonSun;    // from the Moon toward the Sun
  uniform float uMoonSize;  // sine of its angular radius
  uniform float uMoonLight; // radiance of its sunlit ground, after the air; 0: not in this sky
  vec3 moonLight(vec3 d) {
    float along = dot(d, uMoon);
    if (uMoonLight <= 0.0 || along <= 0.0) return vec3(0.0);
    vec3 off = (d - uMoon * along) / uMoonSize;   // across the disc: length 1 at the limb
    float r = length(off);
    float edge = min(fwidth(r), 0.5);   // (never broader than half the disc: a wild derivative on a seam of the dome's triangles drew dots)
    float disc = 1.0 - smoothstep(1.0 - edge, 1.0 + edge, r);
    if (disc <= 0.0) return vec3(0.0);
    float rr = min(r, 1.0);
    vec3 n = off * (rr / max(r, 1e-5)) - uMoon * sqrt(1.0 - rr * rr);
    float mu0 = max(dot(n, uMoonSun), 0.0), mu = max(dot(n, -uMoon), 0.0);
    float lit = smoothstep(0.0, 0.03, dot(n, uMoonSun)) * 2.0 * mu0 / (mu0 + mu + 1e-4);
    return vec3(1.0, 0.97, 0.91) * (lit * disc * uMoonLight);
  }`;

export type MoonUniforms = Record<'uMoon' | 'uMoonSun' | 'uMoonSize' | 'uMoonLight', THREE.IUniform>;

/** The faintest star of the catalogue an eye in the dark sees: what the sky is drawn to when nothing hides it. */
export const DARK_LIMIT = 6.5;

/**
 * A star's colour as it is drawn: its black body's by its B-V index (stars.ts starColour: documented), paler the
 * fainter the star, since the eye has little colour for a faint point: all of it at first magnitude, three tenths
 * at the catalogue's faintest. That share is estimated. Linear, at a luminance of 1.
 */
function tint(bv: number, mag: number): [number, number, number] {
  const c = starColour(bv);
  const k = THREE.MathUtils.clamp(0.3 + 0.13 * (DARK_LIMIT - mag), 0.3, 1);
  return [1 + (c[0] - 1) * k, 1 + (c[1] - 1) * k, 1 + (c[2] - 1) * k];
}

/** Colour indices for the planets as points: Mars is red, Uranus and Neptune are not. Estimated. */
const PLANET_BV: Record<string, number> = { mercury: 0.9, venus: 0.8, mars: 1.4, jupiter: 0.85, saturn: 1.05, uranus: 0.5, neptune: 0.4 };

/**
 * GLSL: how much of something in the direction dir (a unit vector in the scene) an eye in the air sees: nothing of
 * what the Earth hides, and what is low dimmed by the air. uUp is the plumb line at the eye and uAir.y the sine of
 * the horizon's dip from its height, so from far out what is hidden is the Earth's own disc wherever it stands, not
 * half the sky under the place the flight left (which was a straight edge across the stars from 100,000 km). uAir.x
 * is how much of the air is still above the eye: 0.2 magnitudes for each thickness of it looked through, none above
 * it. The horizon is a degree of soft edge at any height.
 */
const AIRED = /* glsl */ `
  uniform vec2 uAir; uniform vec3 uUp;
  float aired(vec3 dir) {
    float up = dot(dir, uUp);
    float edge = 0.02 * sqrt(max(1.0 - uAir.y * uAir.y, 0.0)) + 1e-4;
    float air = 1.0 / (max(up, 0.0) + 0.025);                 // thicknesses of atmosphere, near enough
    return smoothstep(uAir.y, uAir.y + edge, up) * pow(10.0, -0.08 * (air - 1.0) * uAir.x);
  }`;

/**
 * Points at infinity: each is drawn in its direction from wherever the camera is, its light by its magnitude, and
 * left out if it is fainter than the eye sees (uLimit). uGround hides what the Earth hides and dims what is low
 * (AIRED). A star is carried along its proper motion by uYears (years from 2000.0) before it is turned.
 *
 * What is physical: where each is, its colour (its black body's), which is the brighter, and that a point of light
 * has no size: a star is the blur of whatever looks at it, the same small blur for every star, and a brighter one
 * is more light in that blur until the blur's middle can hold no more, when it spreads (as on film, or in an eye).
 * So a faint star is a dim point a pixel or so across and a bright one a brighter and then a slightly wider one,
 * never a disc. What is for the look (estimated): a screen cannot show the four hundred to one between Vega and a
 * star of magnitude 6.5, so a star's light is drawn as the STAR_KEEP power of what it is over the faintest seen
 * (five magnitudes are twelve times, not a hundred), the faintest seen being drawn at STAR_FAINTEST of white; the
 * brightest dozen have a faint skirt round them. All of it is counted from the faintest star the eye sees, so as
 * the eye's limit falls (something lit in view: eye.ts) every star dims with it and the faint ones go, in order.
 *
 * The blur is STAR_BLUR pixels of the drawing (its standard deviation; times the root of the screen's density, so
 * a dense screen draws a finer point, not the same one from more pixels), which a point moves across smoothly as
 * the view turns: it neither twinkles nor pops.
 *
 * The cel look (uCel) draws the same stars in the same places as flat dots with an edge: five sizes by magnitude
 * (a size is the star's own, so none changes size as the eye's limit moves), each one flat tone.
 */
const STAR_FAINTEST = 0.1;
const STAR_KEEP = 0.55;
const STAR_BLUR = 0.62;
function pointsMaterial(limit: number, ground: boolean, pixelRatio: number, gain: number, up: THREE.Vector3): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLimit: { value: limit },
      uGround: { value: ground ? 1 : 0 },
      uPixel: { value: pixelRatio },
      uGain: { value: gain },
      uYears: { value: 0 },
      uAir: { value: new THREE.Vector2(1, 0) },
      uUp: { value: up },
      uFaint: { value: 1 },
      uCel: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float mag; attribute vec3 tint; attribute vec3 motion;
      uniform float uLimit, uGround, uPixel, uGain, uYears, uFaint, uCel;
      ${AIRED}
      varying vec3 vColor; varying vec4 vBlur;   // the point's width, pixels; the blur's variance; the skirt's share; the cel dot's radius
      void main() {
        vec3 dir = normalize(mat3(modelMatrix) * (position + motion * uYears));
        gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * dir * 90.0, 1.0);
        float over = uLimit - mag;                       // magnitudes brighter than the faintest seen
        float seen = clamp(over / 0.8, 0.0, 1.0);
        if (mag > 4.0) seen *= uFaint;   // (the stars the first view did without, coming in once they have arrived)
        if (uGround > 0.5) seen *= aired(dir);
        vColor = vec3(0.0);
        vBlur = vec4(1.0, 1.0, 0.0, 0.0);
        if (seen <= 0.0) {   // (not drawn at all: most of the catalogue, by day)
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        } else if (uCel > 0.5) {
          float size = floor(clamp((${DARK_LIMIT.toFixed(1)} - mag) / 1.5, 0.0, 4.0));
          float radius = (0.6 + 0.3 * size) * sqrt(uPixel);
          vBlur = vec4(2.0 * radius + 3.0, 1.0, 0.0, radius);
          vColor = mix(vec3(1.0), tint, 0.6) * (0.3 + 0.14 * size) * seen * uGain;
        } else {
          // its light, of white: what it is over the faintest seen, compressed; a finer point on a denser screen is made up half way
          float light = min(${STAR_FAINTEST.toFixed(3)} * pow(10.0, ${(0.4 * STAR_KEEP).toFixed(3)} * over), 4.0) * seen * sqrt(uPixel);
          // the blur holds 1.5 of white at its middle: more light than that is a wider blur
          float spread = max(light / 1.5, 1.0);
          float variance = ${(STAR_BLUR * STAR_BLUR).toFixed(4)} * uPixel * spread;
          float skirt = smoothstep(1.0, 2.5, spread);
          vBlur = vec4(2.0 * ceil((3.0 + 4.0 * skirt) * sqrt(variance)) + 1.0, variance, 0.05 * skirt, 0.0);
          vColor = tint * (light / spread) * uGain;
        }
        gl_PointSize = vBlur.x;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor; varying vec4 vBlur;
      void main() {
        float r = length(gl_PointCoord - 0.5) * vBlur.x;   // pixels from the middle
        float a = vBlur.w > 0.0
          ? smoothstep(vBlur.w + 0.5, vBlur.w - 0.5, r)
          : exp(-0.5 * r * r / vBlur.y) + vBlur.z * pow(max(1.0 - 2.0 * r / vBlur.x, 0.0), 3.0);
        if (a <= 0.002) discard;
        gl_FragColor = vec4(vColor * a, 1.0);
      }`,
  });
}

function geometryOf(directions: number[], mags: number[], bvs: number[], motions?: number[]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(directions, 3));
  geometry.setAttribute('mag', new THREE.Float32BufferAttribute(mags, 1));
  geometry.setAttribute(
    'tint',
    new THREE.Float32BufferAttribute(
      bvs.flatMap((bv, i) => tint(bv, mags[i]!)),
      3,
    ),
  );
  geometry.setAttribute('motion', new THREE.Float32BufferAttribute(motions ?? new Array(directions.length).fill(0), 3));
  return geometry;
}

function points(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Points {
  const p = new THREE.Points(geometry, material);
  p.frustumCulled = false; // the shader places them, not their positions
  return p;
}

/** A table of stars (stars.ts: STARS, or the whole catalogue as fetched) as points: unit vectors in J2000 at 2000.0, their yearly motions, magnitudes and colours. */
function catalogue(table: ArrayLike<number> = STARS): THREE.BufferGeometry {
  const directions: number[] = [];
  const motions: number[] = [];
  const mags: number[] = [];
  const bvs: number[] = [];
  for (let i = 0; i + STAR_STRIDE <= table.length; i += STAR_STRIDE) {
    directions.push(...fromEquatorial(table[i]! * DEG, table[i + 1]! * DEG));
    mags.push(table[i + 2]!);
    bvs.push(table[i + 3]!);
    motions.push(...starMotion(table[i]!, table[i + 1]!, table[i + 4]!, table[i + 5]!));
  }
  return geometryOf(directions, mags, bvs, motions);
}

/** The whole catalogue (public/sky/stars.bin), once: every sky made asks for the same one. Nothing where there is no page to fetch it for (a test). */
let whole: Promise<Float32Array | null> | null = null;
const wholeCatalogue = (): Promise<Float32Array | null> => {
  const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL;
  // (after the scene is up: the first view has the bright stars in the bundle, and by day none of the rest shows)
  whole ??=
    base === undefined
      ? Promise.resolve(null)
      : new Promise<void>((go) => later(go))
          .then(() => fetch(`${base}sky/stars.bin`))
          .then((res) => (res.ok ? res.arrayBuffer() : null))
          .then((data) => (data ? new Float32Array(data) : null))
          .catch(() => null);
  return whole;
};

/**
 * The Milky Way and the sky's other unresolved light (the Magellanic Clouds, the glow of the galaxy's disc): NASA's
 * map (tools/stars.mjs), drawn on a ball round the eye in the catalogue's frame, added to whatever is behind.
 *
 * Where it is, its shape and its contrasts are the map's (documented): its light is drawn in proportion to the map's
 * own linear light (stars.ts `MILKY_WAY` says how a byte is that), so the galaxy's poles are a thirtieth of the star
 * clouds in Sagittarius and the rifts are as dark as they are, and nothing faint is lifted. Its colour is the map's
 * (the tint, kept apart at a quarter of the size), `BAND_COLOUR` of it: an eye has next to no colour for a light so
 * faint. How bright it is drawn is for the look (estimated): the map's brightest clouds (its 99.9th part, 0.4 of its
 * unit) at `BAND_PEAK` of white, under the faintest star drawn (STAR_FAINTEST), so the band is a faint grey-white
 * glow with dark lanes in it, and dimmed with the stars as the eye's limit falls (each magnitude of the limit as a
 * star's light is: STAR_KEEP), gone once stars of the fifth magnitude are (a band needs a dark sky: estimated). Low
 * down it is dimmed by the air and hidden by the Earth as the stars are (AIRED).
 *
 * The cel look draws it as two flat tones with an edge: the band where the map is over its 90th part, its bright
 * clouds where it is over its 99th.
 */
const BAND_PEAK = 0.1;
const BAND_COLOUR = 0.3;
function milkyWay(ground: boolean, up: THREE.Vector3): THREE.Mesh {
  const uniforms = {
    tMap: { value: null as THREE.Texture | null },
    tTint: { value: null as THREE.Texture | null },
    uLimit: { value: DARK_LIMIT },
    uGain: { value: 1 },
    uGround: { value: ground ? 1 : 0 },
    uAir: { value: new THREE.Vector2(1, 0) },
    uUp: { value: up },
    uIn: { value: 0 },
    uCel: { value: 0 },
    uPeak: { value: BAND_PEAK },
  };
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(80, 48, 24),
    new THREE.ShaderMaterial({
      uniforms,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec3 vSky, vDir;
        void main() {
          vSky = position;
          vDir = mat3(modelMatrix) * position;
          gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * vDir, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D tMap, tTint;
        uniform float uLimit, uGain, uGround, uIn, uCel, uPeak;
        ${AIRED}
        varying vec3 vSky, vDir;
        void main() {
          // seen as the faint stars are: gone by the fifth magnitude, and dimmed as a star is by each magnitude the limit falls
          float seen = smoothstep(4.8, 5.8, uLimit) * pow(10.0, ${(0.4 * STAR_KEEP).toFixed(3)} * min(uLimit - ${DARK_LIMIT.toFixed(1)}, 0.0)) * uGain * uIn;
          vec3 d = normalize(vSky);
          if (uGround > 0.5) seen *= aired(normalize(vDir));
          if (seen <= 0.0) discard;
          // the map: right ascension 0 in the middle, increasing to the left; north up
          float ra = atan(d.y, d.x);
          vec2 uv = vec2(0.5 - ra / 6.2831853, 0.5 + asin(clamp(d.z, -1.0, 1.0)) / 3.14159265);
          // (looked up with the gradient of a place that has no seam, or the wrap at 12 hours would draw a line)
          vec2 flat_ = vec2(fract(uv.x + 0.5) - 0.5, uv.y);
          vec2 dx = dFdx(flat_), dy = dFdy(flat_);
          float light = ${MILKY_WAY.white.toFixed(3)} * pow(textureGrad(tMap, uv, dx, dy).r, ${MILKY_WAY.gamma.toFixed(2)});
          vec3 tint = mix(vec3(1.0), textureGrad(tTint, uv, dx, dy).rgb / ${MILKY_WAY.unit.toFixed(5)}, ${BAND_COLOUR.toFixed(2)});
          vec3 c;
          if (uCel > 0.5) {
            // two flat tones, each with an edge a pixel wide
            float w = fwidth(light) + 1e-5;
            c = vec3(0.92, 0.95, 1.0) * (0.012 * smoothstep(0.062 - w, 0.062 + w, light) + 0.014 * smoothstep(0.194 - w, 0.194 + w, light));
          } else {
            c = tint * light * (uPeak / 0.4);
          }
          gl_FragColor = vec4(c * seen, 1.0);
        }`,
    }),
  );
  mesh.frustumCulled = false;
  mesh.matrixAutoUpdate = false;
  mesh.visible = false; // until its maps have arrived
  mesh.renderOrder = -1; // under the stars
  const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL;
  if (base !== undefined)
    later(() => {
      // the light and the tint are data, not colours: decoded in the shader by MILKY_WAY's own rule
      const load = (name: string): Promise<THREE.Texture> =>
        new Promise((done, failed) =>
          new THREE.TextureLoader().load(
            `${base}sky/${name}`,
            (map) => {
              map.colorSpace = THREE.NoColorSpace;
              map.wrapS = THREE.RepeatWrapping;
              map.generateMipmaps = false; // (it is only ever magnified: a texel of the light is a sixth of a degree)
              map.minFilter = map.magFilter = THREE.LinearFilter;
              done(map);
            },
            undefined,
            failed,
          ),
        );
      void Promise.all([load('milkyway.jpg'), load('milkyway.tint.jpg')])
        .then(([map, tint]) =>
          // (shown from a frame of its own: its upload is not to land with another map's: pack.ts)
          queued(() => {
            uniforms.tMap.value = map;
            uniforms.tTint.value = tint;
            mesh.visible = true;
            mesh.userData.arrivedAt = performance.now();
          }),
        )
        .catch(() => {});
    });
  return mesh;
}

/**
 * The sky for a place, movable to any instant. `air`: it is seen from the ground, so the Sun and
 * Moon are lifted by refraction, what is low is dimmed, what is under the horizon is not there,
 * and daylight hides the stars. Without it (from orbit) everything is where geometry puts it and
 * the sky is black at noon.
 */
export class Heavens {
  /** Toward the Sun and the Moon, in the site's frame. The same vectors throughout: shaders hold them. */
  readonly sunDir = new THREE.Vector3(0, 1, 0);
  readonly moonDir = new THREE.Vector3(0, 1, 0);
  /** Apparent elevations, degrees. */
  sunElevation = 90;
  moonElevation = 90;
  /** Half the Sun's apparent width, radians. */
  sunRadius = 0.00465;
  /** Whether any of the Moon is above the horizon, and how much of its disc is lit. */
  moonUp = false;
  moonLit = 0;
  /** For a shader that includes MOON_GLSL. */
  readonly moon: MoonUniforms = {
    uMoon: { value: this.moonDir },
    uMoonSun: { value: new THREE.Vector3(0, 1, 0) },
    uMoonSize: { value: 0.0045 },
    uMoonLight: { value: 0 },
  };
  /** The plumb line at the eye, in the site's frame: what is under the eye's horizon is hidden by it (a setting keeps it: backdrops.ts). */
  readonly up = new THREE.Vector3(0, 1, 0);
  /** The stars and planets. */
  readonly stars = new THREE.Group();
  /** The Milky Way, under them. */
  readonly band: THREE.Mesh;
  /**
   * The Milky Way's place in the sky: not drawn at all while none of it can be seen. Its shader throws every pixel away
   * then (`seen` is 0 when the limit is 5.5 or brighter, or the gain is 0), but only after being run for every pixel
   * of the window, blended: by day that was a whole screen of work for nothing. The same test, made once here.
   */
  private readonly night = new THREE.Group();
  /** All of it: add to a backdrop's scene, after whatever it shines through. */
  readonly sky = new THREE.Group();
  /** Set when the whole catalogue has arrived and taken the bright stars' place: whoever draws the sky draws it again. */
  arrived = false;
  private readonly site: Site;
  private readonly air: boolean;
  private readonly material: THREE.ShaderMaterial;
  private readonly fixed: THREE.Points;
  private wanderers: THREE.Points | null = null;

  constructor(site: Site, air: boolean, pixelRatio: number) {
    this.site = site;
    this.air = air;
    this.material = pointsMaterial(DARK_LIMIT, air, pixelRatio, 1, this.up);
    // the bright stars at once; the whole catalogue in their place when it has arrived (it has them too)
    this.fixed = points(catalogue(), this.material);
    this.fixed.matrixAutoUpdate = false;
    this.stars.add(this.fixed);
    this.band = milkyWay(air, this.up);
    this.night.add(this.band);
    this.sky.add(this.night, this.stars);
    void wholeCatalogue().then((table) => {
      if (!table) return;
      this.fixed.geometry.dispose();
      this.fixed.geometry = catalogue(table);
      this.material.uniforms.uFaint!.value = 0;
      this.arrived = true;
      this.fadeIn();
    });
  }

  /**
   * What arrived after the first view (the faint stars, the Milky Way) comes in over a second and a half, so nothing
   * pops into a night sky: stepped by the page's own frames, each of which says the sky is to be drawn again (`arrived`).
   */
  private fadeIn(): void {
    if (typeof requestAnimationFrame === 'undefined') {
      this.material.uniforms.uFaint!.value = 1;
      return;
    }
    const began = performance.now();
    const band = (this.band.material as THREE.ShaderMaterial).uniforms;
    const step = (): void => {
      const now = performance.now();
      this.material.uniforms.uFaint!.value = Math.min(1, (now - began) / 1500);
      const at = this.band.userData.arrivedAt as number | undefined;
      band.uIn!.value = at === undefined ? 0 : Math.min(1, (now - at) / 1500);
      this.arrived = true;
      // (waiting for the Milky Way's map no longer than twenty seconds: without it there is nothing more to bring in)
      if (now - began < 1500 || (at === undefined ? now - began < 20_000 : now - at < 1500)) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /** Put everything where it is at an instant. */
  at(sky: Sky): void {
    const { site, air } = this;
    const toward = (seen: Seen): Vec3 =>
      air ? enuToSite(site.bearingX, fromHorizontal(seen.azimuth, seen.elevation + refraction(seen.elevation))) : seen.direction;
    const sun = toward(sky.sun);
    const moon = toward(sky.moon);
    this.sunDir.set(sun[0], sun[1], sun[2]);
    this.moonDir.set(moon[0], moon[1], moon[2]);
    this.sunElevation = Math.asin(sun[1]) / DEG;
    this.moonElevation = Math.asin(moon[1]) / DEG;
    this.sunRadius = sky.sun.angularRadius;
    this.moonUp = !air || this.moonElevation * DEG > -sky.moon.angularRadius;
    this.moonLit = sky.moon.illuminated;
    // the Sun as the Moon sees it: the two are 150 million km apart, so this is nearly the Sun's own direction
    const moonSun = unit(sub(scale(sky.sun.direction, sky.sun.distance), scale(sky.moon.direction, sky.moon.distance)));
    (this.moon.uMoonSun.value as THREE.Vector3).set(moonSun[0], moonSun[1], moonSun[2]);
    this.moon.uMoonSize.value = Math.sin(sky.moon.angularRadius);
    this.moon.uMoonLight.value = this.moonUp ? MOON_RADIANCE * (air ? transmission(Math.max(this.moonElevation * DEG, 0)) : 1) : 0;

    // one rotation takes the catalogue's frame to the site's: precession, the Earth's turn, latitude, bearing
    const m = j2000ToSite(site, sky.siderealTime, sky.jdTT);
    this.fixed.matrix.set(m[0][0], m[0][1], m[0][2], 0, m[1][0], m[1][1], m[1][2], 0, m[2][0], m[2][1], m[2][2], 0, 0, 0, 0, 1);
    this.fixed.matrixWorldNeedsUpdate = true;
    this.band.matrix.copy(this.fixed.matrix);
    this.band.matrixWorldNeedsUpdate = true;
    // (and each star carried along its own motion to the date, before that)
    this.material.uniforms.uYears!.value = yearsFrom2000(sky.jdTT);

    if (!this.wanderers) {
      this.wanderers = points(
        geometryOf(
          sky.planets.flatMap((p) => p.direction),
          sky.planets.map((p) => p.magnitude),
          sky.planets.map((p) => PLANET_BV[p.body.id] ?? 0.8),
        ),
        this.material,
      );
      this.stars.add(this.wanderers);
    } else {
      const position = this.wanderers.geometry.getAttribute('position') as THREE.BufferAttribute;
      const mag = this.wanderers.geometry.getAttribute('mag') as THREE.BufferAttribute;
      sky.planets.forEach((p, i) => {
        position.setXYZ(i, p.direction[0], p.direction[1], p.direction[2]);
        mag.setX(i, p.magnitude);
      });
      position.needsUpdate = mag.needsUpdate = true;
    }
  }

  /**
   * How the stars are shown: the faintest magnitude the eye sees (every star is drawn from it: pointsMaterial), and a
   * scale on their brightness (the reciprocal of whatever the setting's exposure has been raised by, so that they are
   * drawn as bright as the eye sees them). `air`: how much of the air is still above the eye (1 on the ground: what is
   * low is dimmed by it); `height`: the eye's, metres (`horizon`).
   */
  show(limit: number, gain: number, air = 1, height = 0): void {
    this.material.uniforms.uLimit!.value = limit;
    this.material.uniforms.uGain!.value = gain;
    const band = (this.band.material as THREE.ShaderMaterial).uniforms;
    band.uLimit!.value = limit;
    band.uGain!.value = gain;
    this.night.visible = limit > 4.8 && gain > 0;
    (this.material.uniforms.uAir!.value as THREE.Vector2).x = air;
    (band.uAir!.value as THREE.Vector2).x = air;
    this.horizon(height);
  }

  /**
   * The eye is `height` metres over the sea under it: the sine of its horizon's dip, under the level of its plumb line
   * (`up`). From the ground that is nothing; from 150 km, 12.3 degrees; from the Moon's distance the Earth's own disc,
   * a degree across, is all that is hidden. The eye's true height, wherever it is: a setting asks this every frame.
   */
  horizon(height: number): void {
    const h = Math.max(height, 0);
    const dip = -Math.sqrt(h * (2 * EARTH_SPHERE + h)) / (EARTH_SPHERE + h);
    (this.material.uniforms.uAir!.value as THREE.Vector2).y = dip;
    ((this.band.material as THREE.ShaderMaterial).uniforms.uAir!.value as THREE.Vector2).y = dip;
  }

  /** The cel look: the same stars in the same places as flat dots, the Milky Way as two flat tones (pointsMaterial, milkyWay). */
  cel(on: boolean): void {
    this.material.uniforms.uCel!.value = on ? 1 : 0;
    (this.band.material as THREE.ShaderMaterial).uniforms.uCel!.value = on ? 1 : 0;
  }
}

/** A sky with nothing in it but the catalogue's stars, turned to no place: for a setting shown before any flight. */
export function starsAlone(pixelRatio: number): THREE.Object3D {
  return points(catalogue(), pointsMaterial(DARK_LIMIT, false, pixelRatio, 1, new THREE.Vector3(0, 1, 0)));
}

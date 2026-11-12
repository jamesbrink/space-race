import * as THREE from 'three';
import { refraction, type Seen, type Sky } from '../world/ephemeris.ts';
import { DEG, enuToSite, fromEquatorial, fromHorizontal, j2000ToSite, type Site, scale, sub, unit, type Vec3 } from '../world/frames.ts';
import { STAR_STRIDE, STARS, starMotion, yearsFrom2000 } from '../world/stars.ts';
import { airmass } from './daysky.ts';

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
    float edge = fwidth(r);
    float disc = 1.0 - smoothstep(1.0 - edge, 1.0 + edge, r);
    if (disc <= 0.0) return vec3(0.0);
    float rr = min(r, 1.0);
    vec3 n = off * (rr / max(r, 1e-5)) - uMoon * sqrt(1.0 - rr * rr);
    float mu0 = max(dot(n, uMoonSun), 0.0), mu = max(dot(n, -uMoon), 0.0);
    float lit = smoothstep(0.0, 0.03, dot(n, uMoonSun)) * 2.0 * mu0 / (mu0 + mu + 1e-4);
    return vec3(1.0, 0.97, 0.91) * (lit * disc * uMoonLight);
  }`;

export type MoonUniforms = Record<'uMoon' | 'uMoonSun' | 'uMoonSize' | 'uMoonLight', THREE.IUniform>;

/** A star's colour from its B-V index: blue-white through white to orange. Linear, about unit brightness. */
function tint(bv: number): [number, number, number] {
  const t = THREE.MathUtils.clamp((bv + 0.3) / 1.9, 0, 1);
  const hot = [0.72, 0.82, 1.0];
  const white = [1.0, 0.98, 0.95];
  const cool = [1.0, 0.72, 0.45];
  const [a, b, k] = t < 0.45 ? [hot, white, t / 0.45] : [white, cool, (t - 0.45) / 0.55];
  return [a[0]! + (b[0]! - a[0]!) * k, a[1]! + (b[1]! - a[1]!) * k, a[2]! + (b[2]! - a[2]!) * k];
}

/** Colour indices for the planets as points: Mars is red, Uranus and Neptune are not. Estimated. */
const PLANET_BV: Record<string, number> = { mercury: 0.9, venus: 0.8, mars: 1.4, jupiter: 0.85, saturn: 1.05, uranus: 0.5, neptune: 0.4 };

/**
 * Points at infinity: each is drawn in its direction from wherever the camera is, sized and
 * brightened by its magnitude, and left out if it is fainter than the sky allows. `uGround` hides
 * what is under the horizon and dims what is near it (the air's extinction: none above the air).
 * A star is carried along its proper motion by `uYears` (years from 2000.0) before it is turned.
 *
 * What is physical: where each is, its colour's order (B-V), which is the brighter, and that a
 * magnitude is a factor of 2.512 in light. What is for the look: a screen cannot show the hundreds
 * to one between Sirius and a sixth-magnitude star, so light is drawn as its 0.4 power (five
 * magnitudes are six times, not a hundred) and the brightest are a little larger, as they are to
 * an eye or a lens; estimated. A point is never under 1.6 pixels across with a soft edge, so it
 * moves smoothly over the pixels as the view turns and neither twinkles nor pops.
 */
function pointsMaterial(limit: number, ground: boolean, pixelRatio: number, gain: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLimit: { value: limit },
      uGround: { value: ground ? 1 : 0 },
      uPixel: { value: pixelRatio },
      uGain: { value: gain },
      uYears: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float mag; attribute vec3 tint; attribute vec3 motion;
      uniform float uLimit, uGround, uPixel, uGain, uYears;
      varying vec3 vColor;
      void main() {
        vec3 dir = normalize(mat3(modelMatrix) * (position + motion * uYears));
        gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * dir * 90.0, 1.0);
        float flux = pow(10.0, -0.4 * mag);
        float seen = clamp((uLimit - mag) / 1.5, 0.0, 1.0);
        if (uGround > 0.5) {
          float air = 1.0 / (max(dir.y, 0.0) + 0.025);                 // thicknesses of atmosphere, near enough
          seen *= smoothstep(0.0, 0.02, dir.y) * pow(10.0, -0.08 * (air - 1.0));
        }
        gl_PointSize = uPixel * min(1.6 + 2.4 * pow(flux, 0.3), 7.0);
        vColor = tint * min(2.1 * pow(flux, 0.4), 3.0) * seen * uGain;
        if (seen <= 0.0) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);   // (not drawn at all: most of the catalogue, by day)
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      void main() {
        float a = smoothstep(1.0, 0.25, length(gl_PointCoord - 0.5) * 2.0);
        if (a <= 0.0 || dot(vColor, vec3(1.0)) <= 0.0) discard;
        gl_FragColor = vec4(vColor * a, 1.0);
      }`,
  });
}

function geometryOf(directions: number[], mags: number[], bvs: number[], motions?: number[]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(directions, 3));
  geometry.setAttribute('mag', new THREE.Float32BufferAttribute(mags, 1));
  geometry.setAttribute('tint', new THREE.Float32BufferAttribute(bvs.flatMap(tint), 3));
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
  whole ??=
    base === undefined
      ? Promise.resolve(null)
      : fetch(`${base}sky/stars.bin`)
          .then((res) => (res.ok ? res.arrayBuffer() : null))
          .then((data) => (data ? new Float32Array(data) : null))
          .catch(() => null);
  return whole;
};

/**
 * The Milky Way and the sky's other unresolved light (the Magellanic Clouds, the glow of the galaxy's disc): NASA's
 * map (tools/stars.mjs), drawn on a ball round the eye in the catalogue's frame, added to whatever is behind.
 * Where it is and its shape are the map's (documented); how bright it is drawn is for the look (estimated): it is
 * faint, comes in only as stars of magnitude 5.5 to 6.3 do (`uLimit`), and is dimmed toward the horizon as they are.
 */
function milkyWay(ground: boolean): THREE.Mesh {
  const uniforms = {
    tMap: { value: null as THREE.Texture | null },
    uLimit: { value: 6.5 },
    uGain: { value: 1 },
    uGround: { value: ground ? 1 : 0 },
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
        uniform sampler2D tMap;
        uniform float uLimit, uGain, uGround;
        varying vec3 vSky, vDir;
        void main() {
          float seen = smoothstep(5.5, 6.3, uLimit) * uGain;
          vec3 d = normalize(vSky), dir = normalize(vDir);
          if (uGround > 0.5) seen *= smoothstep(0.0, 0.04, dir.y) * pow(10.0, -0.08 * (1.0 / (max(dir.y, 0.0) + 0.025) - 1.0));
          if (seen <= 0.0) discard;
          // the map: right ascension 0 in the middle, increasing to the left; north up
          float ra = atan(d.y, d.x);
          vec2 uv = vec2(0.5 - ra / 6.2831853, 0.5 + asin(clamp(d.z, -1.0, 1.0)) / 3.14159265);
          // (looked up with the gradient of a place that has no seam, or the wrap at 12 hours would draw a line)
          vec2 flat_ = vec2(fract(uv.x + 0.5) - 0.5, uv.y);
          gl_FragColor = vec4(textureGrad(tMap, uv, dFdx(flat_), dFdy(flat_)).rgb * (0.09 * seen), 1.0);
        }`,
    }),
  );
  mesh.frustumCulled = false;
  mesh.matrixAutoUpdate = false;
  mesh.visible = false; // until its map has arrived
  mesh.renderOrder = -1; // under the stars
  const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL;
  if (base !== undefined)
    new THREE.TextureLoader().load(`${base}sky/milkyway.jpg`, (map) => {
      map.colorSpace = THREE.SRGBColorSpace;
      map.wrapS = THREE.RepeatWrapping;
      map.generateMipmaps = false; // (it is only ever magnified: a texel is a sixth of a degree)
      map.minFilter = map.magFilter = THREE.LinearFilter;
      uniforms.tMap.value = map;
      mesh.visible = true;
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
  /** The stars and planets. */
  readonly stars = new THREE.Group();
  /** The Milky Way, under them. */
  readonly band: THREE.Mesh;
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
    this.material = pointsMaterial(6.5, air, pixelRatio, 1);
    // the bright stars at once; the whole catalogue in their place when it has arrived (it has them too)
    this.fixed = points(catalogue(), this.material);
    this.fixed.matrixAutoUpdate = false;
    this.stars.add(this.fixed);
    this.band = milkyWay(air);
    this.sky.add(this.band, this.stars);
    void wholeCatalogue().then((table) => {
      if (!table) return;
      this.fixed.geometry.dispose();
      this.fixed.geometry = catalogue(table);
      this.arrived = true;
    });
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
   * How the stars are shown: the faintest magnitude the sky lets through, and a scale on their
   * brightness (the reciprocal of whatever the setting's exposure has been raised by, so that they
   * are drawn as bright as the eye sees them).
   */
  show(limit: number, gain: number): void {
    this.material.uniforms.uLimit!.value = limit;
    this.material.uniforms.uGain!.value = gain;
    const band = (this.band.material as THREE.ShaderMaterial).uniforms;
    band.uLimit!.value = limit;
    band.uGain!.value = gain;
  }
}

/** A sky with nothing in it but the catalogue's stars, turned to no place: for a setting shown before any flight. */
export function starsAlone(pixelRatio: number): THREE.Object3D {
  return points(catalogue(), pointsMaterial(6.5, false, pixelRatio, 1));
}

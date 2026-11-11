import * as THREE from 'three';
import { refraction, type Seen, type Sky } from '../world/ephemeris.ts';
import { DEG, enuToSite, fromEquatorial, fromHorizontal, j2000ToSite, type Site, scale, sub, unit, type Vec3 } from '../world/frames.ts';
import { STAR_STRIDE, STARS } from '../world/stars.ts';
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
 * what is under the horizon and dims what is near it.
 */
function pointsMaterial(limit: number, ground: boolean, pixelRatio: number, gain: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uLimit: { value: limit }, uGround: { value: ground ? 1 : 0 }, uPixel: { value: pixelRatio }, uGain: { value: gain } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float mag; attribute vec3 tint;
      uniform float uLimit, uGround, uPixel, uGain;
      varying vec3 vColor;
      void main() {
        vec3 dir = normalize(mat3(modelMatrix) * position);
        gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * dir * 90.0, 1.0);
        float flux = pow(10.0, -0.4 * mag);
        float seen = clamp((uLimit - mag) / 1.5, 0.0, 1.0);
        if (uGround > 0.5) {
          float air = 1.0 / (max(dir.y, 0.0) + 0.025);                 // thicknesses of atmosphere, near enough
          seen *= smoothstep(0.0, 0.02, dir.y) * pow(10.0, -0.08 * (air - 1.0));
        }
        gl_PointSize = uPixel * min(1.8 + 2.2 * pow(flux, 0.3), 7.0);
        vColor = tint * min(0.5 + 1.6 * sqrt(flux), 3.0) * seen * uGain;
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

function points(directions: Vec3[], mags: number[], bvs: number[], material: THREE.Material): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(directions.flat(), 3));
  geometry.setAttribute('mag', new THREE.Float32BufferAttribute(mags, 1));
  geometry.setAttribute('tint', new THREE.Float32BufferAttribute(bvs.flatMap(tint), 3));
  const p = new THREE.Points(geometry, material);
  p.frustumCulled = false; // the shader places them, not their positions
  return p;
}

/** The catalogue's stars as unit vectors in J2000, with their magnitudes and colours. */
function catalogue(): { directions: Vec3[]; mags: number[]; bvs: number[] } {
  const directions: Vec3[] = [];
  const mags: number[] = [];
  const bvs: number[] = [];
  for (let i = 0; i < STARS.length; i += STAR_STRIDE) {
    directions.push(fromEquatorial(STARS[i]! * DEG, STARS[i + 1]! * DEG));
    mags.push(STARS[i + 2]!);
    bvs.push(STARS[i + 3]!);
  }
  return { directions, mags, bvs };
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
  /** The stars and planets: add to a backdrop's scene, after whatever they shine through. */
  readonly stars = new THREE.Group();
  private readonly site: Site;
  private readonly air: boolean;
  private readonly material: THREE.ShaderMaterial;
  private readonly fixed: THREE.Points;
  private wanderers: THREE.Points | null = null;

  constructor(site: Site, air: boolean, pixelRatio: number) {
    this.site = site;
    this.air = air;
    this.material = pointsMaterial(6.5, air, pixelRatio, 1);
    const stars = catalogue();
    this.fixed = points(stars.directions, stars.mags, stars.bvs, this.material);
    this.fixed.matrixAutoUpdate = false;
    this.stars.add(this.fixed);
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

    if (!this.wanderers) {
      this.wanderers = points(
        sky.planets.map((p) => p.direction),
        sky.planets.map((p) => p.magnitude),
        sky.planets.map((p) => PLANET_BV[p.body.id] ?? 0.8),
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
  }
}

/** A sky with nothing in it but the catalogue's stars, turned to no place: for a setting shown before any flight. */
export function starsAlone(pixelRatio: number): THREE.Object3D {
  const stars = catalogue();
  return points(stars.directions, stars.mags, stars.bvs, pointsMaterial(6.5, false, pixelRatio, 1));
}

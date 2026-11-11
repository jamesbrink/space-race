import * as THREE from 'three';
import {
  add,
  cross,
  dot,
  ecefToGeodetic,
  geodeticToEcef,
  length,
  type Site,
  scale,
  siteToEcefDirection,
  sub,
  unit,
  type Vec3,
} from '../world/frames.ts';
import { ellipsoidNormal, gaussianRadius, horizonAngle, horizonDistance, seaPoint } from '../world/surface.ts';
import type { Beyond } from './land';

/**
 * The Earth as a globe, to scale, under a site: the sea and the land seen from height, and
 * downrange where the site's own ground (land.ts) has ended. Nothing here knows which site it is:
 * it is given a place on the Earth (frames.ts: Site) and the height of the sea there, and it is
 * drawn in that site's frame, which is the scene's.
 *
 * **The shape** is the WGS 84 ellipsoid raised to the site's mean sea level (world/surface.ts).
 * It is a mesh round the point under the eye, made in doubles on the CPU: rings at distances
 * h sinh(k i) over the surface (h the eye's height), so each triangle looks about the same size
 * from the eye, near or far, out past the horizon; 192 round. Its vertices are relative to the
 * point under the eye (the mesh's own position), so the GPU only ever sees small numbers. It is
 * made again when the eye has moved a tenth of its height or changed height by a quarter: a few
 * milliseconds, and nothing at all while the eye is still.
 *
 * **The map** is land, inland water and ice from Natural Earth (public domain; tools/globe.mjs
 * bakes it): a distance to the shore on the six faces of a cube, looked up by the direction from
 * the Earth's centre, so the coastline is a clean line at any magnification and there is no seam
 * or pole. Flat tones: one for the sea, one for land, one for ice. No imagery, no relief.
 *
 * **The site's ground** is drawn by the site (land.ts) out to its edge, flat. The globe leaves a
 * hole for it (`Hole`) a little inside that edge, and the ground hands over to the globe across a
 * band before it (`beyond`): it bends down to the curve of the sea and takes the globe's colours,
 * so where the two overlap they are the same surface in the same colour, and which of them the
 * depth buffer picks cannot be seen.
 *
 * **The light** is the scene's (the Sun or the Moon as daysky.ts has it over the site), so the
 * globe and the ground agree where they meet; where the Sun is down on the globe itself (from the
 * true Sun, `sun`) the sky's fill goes out, so the night side is dark. The haze is the scene's
 * (air.ts), worked out along the ray with true heights over the curved sea.
 */

/** Rings and spokes of the mesh. */
const SPOKES = 192;
const RINGS = 150;
/** Distances to the shore are stored to this many texels (tools/globe.mjs: SPREAD). */
const SPREAD = 8;
/** The maps' faces, in the order a cube map takes them. */
const FACES = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];

/** Linear colours, chosen by eye against photographs from orbit (estimated): the sea's is the Cape's offshore water (cape.ts). */
const SEA = new THREE.Color().setRGB(0.018, 0.07, 0.12);
const LAND = new THREE.Color(0x56603f);
const ICE = new THREE.Color(0xe4eaee);

const vec3 = (c: THREE.Color) => `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`;

/** GLSL: the globe's colour toward a direction from the Earth's centre (ECEF), with its roughness. Uniforms uGlobeLand, uGlobeIce. */
const COLOUR = /* glsl */ `
  uniform samplerCube uGlobeLand, uGlobeIce;
  float globeField(samplerCube map, vec3 d) { return (texture(map, d).r * 255.0 - 128.0) * ${(SPREAD / 127).toFixed(6)}; }
  vec3 globeAlbedo(vec3 d, out float rough) {
    // the land's distance taken as the mean of five lookups half a texel or so apart: a filtered distance's
    // zero bends at every texel, and from orbit those bends were kinks in the shore
    vec3 t1 = normalize(cross(d, abs(d.z) < 0.9 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0))), t2 = cross(d, t1);
    float r = ${((0.6 * (Math.PI / 2)) / 2048).toExponential(4)};   // radians: 0.6 of a texel of the land's faces, at their middles
    float l = (globeField(uGlobeLand, d) + globeField(uGlobeLand, d + t1 * r) + globeField(uGlobeLand, d - t1 * r)
      + globeField(uGlobeLand, d + t2 * r) + globeField(uGlobeLand, d - t2 * r)) / 5.0;
    float land = smoothstep(-0.5, 0.5, l / (fwidth(l) * 0.8 + 0.03));   // the shore: a clean line, one pixel soft
    float i = globeField(uGlobeIce, d);
    float ice = smoothstep(-0.5, 0.5, i / (fwidth(i) * 0.8 + 0.03));
    // (lakes are cut out of the land map, so they are the sea's colour)
    vec3 c = mix(${vec3(SEA)}, ${vec3(LAND)}, land);
    c = mix(c, ${vec3(ICE)}, ice);
    rough = mix(0.32, 0.95, max(land, ice));
    return c;
  }`;

/** The air's top, and how far its density falls by e: the Rayleigh scattering of the 1976 standard atmosphere, fitted. */
const TOP = 80_000;
const SCALE = 8_000;
/**
 * The air seen from above: a glowing rim at the limb, blue over the globe, red where the Sun is
 * setting under it. Drawn on a ball round the eye (so nothing nearer than it is hazed: the
 * vehicle the eye is following) and worked out along each ray through a spherical shell of air
 * whose density falls off exponentially: single Rayleigh scattering, in twelve pieces along the
 * ray, the sunlight reaching each dimmed by the air it has come through (`chapman`), with no
 * light scattered twice. The scattering coefficients are Rayleigh's at sea level
 * for 680, 550 and 440 nm (Bucholtz 1995, rounded).
 */
/** The Sun's light above the air, in the scene's units (a directional light's intensity): a little over the light at noon (daysky.ts). Estimated. */
const SUNLIGHT = 4.5;
/** Rayleigh's optical depth straight up from the sea, for 680, 550 and 440 nm: BETA times SCALE. */
const RAYLEIGH = [5.8e-6 * SCALE, 13.5e-6 * SCALE, 33.1e-6 * SCALE] as const;

/**
 * How many times the air straight up a ray toward the Sun goes through, from `height` metres up
 * with the Sun `mu` (a cosine) from the zenith, over an Earth of `radius` and air thinning by e
 * every `scale` metres: the Chapman function, by Schüler's approximation (2012). It is the plain
 * secant overhead, grows to about 38 along the horizon at sea level, and goes on growing smoothly
 * as the Sun sinks under the horizon and the ray passes through the Earth's shadow, so a twilight
 * fades and does not step.
 */
export function chapman(height: number, mu: number, radius: number, scale: number): number {
  const X = radius / scale,
    h = Math.max(height, 0) / scale;
  // the grazing value sqrt(pi x / 2), and between it and 1 overhead Schüler's form; under the horizon, the
  // function's own identity: twice the grazing value at the ray's lowest point, less the value looking up
  const c = Math.sqrt((Math.PI / 2) * (X + h));
  if (mu >= 0) return c / ((c - 1) * mu + 1);
  const x0 = Math.sqrt(1 - mu * mu) * (X + h);
  return 2 * Math.sqrt((Math.PI / 2) * x0) * Math.exp(X + h - x0) - c / (1 - (c - 1) * mu);
}

/** How much of the Sun's green light reaches the sea through the air with it `mu` from the zenith, and `aerosol` of haze straight up. */
export const transmission = (mu: number, aerosol: number, radius: number): number =>
  Math.exp(-(RAYLEIGH[1] + aerosol) * chapman(0, mu, radius, SCALE));
/** GLSL: chapman() as in TypeScript. */
const CHAPMAN = /* glsl */ `
  float chapman(float height, float mu, float radius) {
    float X = radius / ${SCALE.toFixed(1)}, h = max(height, 0.0) / ${SCALE.toFixed(1)};
    float c = sqrt(1.5707963 * (X + h));
    if (mu >= 0.0) return c / ((c - 1.0) * mu + 1.0);
    float x0 = sqrt(1.0 - mu * mu) * (X + h);
    return 2.0 * sqrt(1.5707963 * x0) * exp(min(X + h - x0, 80.0)) - c / (1.0 - (c - 1.0) * mu);
  }`;
const AIR = /* glsl */ `
  uniform vec3 uCentre, uSun;
  uniform float uAlt, uRadius, uWeight, uSunLight;
  varying vec3 vDir;
  const float TOP = ${TOP.toFixed(1)}, H = ${SCALE.toFixed(1)};
  const vec3 BETA = vec3(5.8e-6, 13.5e-6, 33.1e-6);
  // Along the eye's own line of sight the light scattered toward it is dimmed less selectively than single
  // scattering says: light scattered more than once fills the blue back in. Taken as most of the way to grey,
  // or a grazing line through the low air came out brown where the real limb is white (estimated).
  const vec3 SEEN = mix(BETA, vec3(BETA.x + BETA.y + BETA.z) / 3.0, 0.75);
  float heightAt(vec3 p) { return length(p - uCentre) - uRadius; }
  ${CHAPMAN}
  void main() {
    vec3 d = normalize(vDir);
    float b = dot(d, uCentre);
    // where the ray meets the top of the air and the sea: (eye to centre)^2 - R^2 kept in its small form
    float outside = (uAlt - TOP) * (2.0 * uRadius + uAlt + TOP);
    float discA = b * b - outside;
    if (discA <= 0.0) discard;
    float t0 = max(0.0, b - sqrt(discA)), t1 = b + sqrt(discA);
    float discG = b * b - uAlt * (2.0 * uRadius + uAlt);
    if (discG > 0.0 && b - sqrt(discG) > 0.0) t1 = b - sqrt(discG);
    if (t1 <= t0) discard;
    float len = (t1 - t0) / 12.0;
    float tau = 0.0;   // optical depth from the eye, as metres of sea-level air
    vec3 glow = vec3(0.0);
    float ha = heightAt(d * t0) / H;
    for (int k = 0; k < 12; k++) {
      float tb = t0 + len * float(k + 1);
      float hb = heightAt(d * tb) / H;
      float mean = abs(ha - hb) < 1e-3 ? exp(-0.5 * (ha + hb)) : (exp(-min(ha, hb)) - exp(-max(ha, hb))) / abs(hb - ha);
      float od = len * mean;
      vec3 mid = d * (tb - 0.5 * len);
      float hm = max(heightAt(mid), 0.0);
      float mu = dot(normalize(mid - uCentre), uSun);
      float toSun = H * exp(-hm / H) * chapman(hm, mu, uRadius);
      glow += od * exp(-SEEN * (tau + 0.5 * od) - BETA * toSun);
      tau += od;
      ha = hb;
    }
    float cosv = dot(d, uSun);
    vec3 light = BETA * glow * (0.0597 * (1.0 + cosv * cosv)) * uSunLight;   // Rayleigh's phase function, 3 / 16 pi (1 + cos^2)
    vec3 through = exp(-BETA * tau);
    gl_FragColor = vec4(light * uWeight, mix(1.0, dot(through, vec3(0.3, 0.4, 0.3)), uWeight));
  }`;

/** The square the site's own ground covers, which the globe leaves to it. */
export interface Hole {
  /** From the scene's frame to the ground's own (its mesh's inverse world matrix): the square is axis-aligned there. */
  frame: THREE.Matrix4;
  /** Half the square's side, metres: the globe is drawn only outside it. */
  half: number;
}

/** A cube map of one channel from the six faces tools/globe.mjs writes. */
async function loadCube(name: string): Promise<THREE.CubeTexture> {
  const faces = await Promise.all(
    FACES.map(async (f) => {
      const blob = await (await fetch(`${import.meta.env.BASE_URL}globe/${name}.${f}.png`)).blob();
      const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const g = canvas.getContext('2d', { willReadFrequently: true })!;
      g.drawImage(bitmap, 0, 0);
      const rgba = g.getImageData(0, 0, bitmap.width, bitmap.height).data;
      const red = new Uint8Array(bitmap.width * bitmap.height);
      for (let i = 0; i < red.length; i++) red[i] = rgba[i * 4]!;
      return new THREE.DataTexture(red, bitmap.width, bitmap.height, THREE.RedFormat);
    }),
  );
  return cube(faces);
}

function cube(faces: THREE.DataTexture[]): THREE.CubeTexture {
  const texture = new THREE.CubeTexture(faces as unknown as HTMLImageElement[]);
  texture.format = THREE.RedFormat;
  texture.type = THREE.UnsignedByteType;
  texture.colorSpace = THREE.NoColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.flipY = false;
  texture.needsUpdate = true;
  return texture;
}

/** A cube that is sea everywhere, until the maps arrive. */
const empty = () => cube(FACES.map(() => new THREE.DataTexture(new Uint8Array([0]), 1, 1, THREE.RedFormat)));

export class Globe {
  /** Everything the globe draws: the surface, and the air seen from above (`air`). */
  readonly group = new THREE.Group();
  readonly mesh: THREE.Mesh;
  /** The air seen from above (AIR). */
  readonly air: THREE.Mesh;
  /** How much of the air is drawn: 0 at the ground, where the sky (backdrops.ts) is the air, to 1 above it. Set by the setting. */
  thin = 0;
  private readonly airUniforms: Record<string, THREE.IUniform>;
  /** Toward the true Sun, in the scene's frame: where it is down on the globe, the night side is dark. */
  readonly sun = new THREE.Vector3(0, 1, 0);
  private readonly site: Site;
  private readonly seaLevel: number;
  /** The site's origin in ECEF, and its axes. */
  private readonly origin: Vec3;
  private readonly axes: [Vec3, Vec3, Vec3];
  /** The sphere that fits the sea round the site: its radius. */
  private readonly radius: number;
  private readonly positions: THREE.BufferAttribute;
  private readonly normals: THREE.BufferAttribute;
  private readonly earth: THREE.BufferAttribute;
  private readonly uniforms: Record<string, THREE.IUniform>;
  /** What the mesh was made for: the eye's point under it and its height. */
  private madeAt: Vec3 | null = null;
  private madeHeight = 0;
  private arrived = false;
  private readonly hole: Hole | null;

  /** `seaLevel`: the sea's height above the ellipsoid at the site (SiteDef.seaLevel); `hole`: the site's own ground. */
  constructor(site: Site, seaLevel: number, hole: Hole | null, haze: { scale: number } | null) {
    this.site = site;
    this.seaLevel = seaLevel;
    this.hole = hole;
    this.origin = geodeticToEcef(site);
    this.axes = [siteToEcefDirection(site, [1, 0, 0]), siteToEcefDirection(site, [0, 1, 0]), siteToEcefDirection(site, [0, 0, 1])];
    this.radius = gaussianRadius(site.latitude);

    const vertices = (RINGS + 1) * (SPOKES + 1);
    const geometry = new THREE.BufferGeometry();
    this.positions = new THREE.BufferAttribute(new Float32Array(vertices * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.normals = new THREE.BufferAttribute(new Float32Array(vertices * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.earth = new THREE.BufferAttribute(new Float32Array(vertices * 3), 3).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', this.positions);
    geometry.setAttribute('normal', this.normals);
    geometry.setAttribute('aEarth', this.earth);
    const index: number[] = [];
    const at = (i: number, j: number) => i * (SPOKES + 1) + j;
    for (let i = 0; i < RINGS; i++)
      for (let j = 0; j < SPOKES; j++) index.push(at(i, j), at(i + 1, j), at(i, j + 1), at(i, j + 1), at(i + 1, j), at(i + 1, j + 1));
    geometry.setIndex(index);

    const o = this.origin;
    const m = this.axes;
    this.uniforms = {
      uGlobeLand: { value: empty() },
      uGlobeIce: { value: empty() },
      uGlobeSun: { value: this.sun },
      // from the scene's frame to ECEF: the site's origin, and its axes as the columns of a matrix
      uGlobeOrigin: { value: new THREE.Vector3(o[0], o[1], o[2]) },
      uGlobeAxes: { value: new THREE.Matrix3().set(m[0][0], m[1][0], m[2][0], m[0][1], m[1][1], m[2][1], m[0][2], m[1][2], m[2][2]) },
      uGlobeSeaLevel: { value: seaLevel },
      uGlobeHole: { value: hole ? hole.frame : new THREE.Matrix4() },
      uGlobeHalf: { value: hole ? hole.half : -1 },
      uGlobeHaze: { value: haze?.scale ?? 1400 },
      uGlobeSunLight: { value: SUNLIGHT },
      uGlobeAerosol: { value: 0 },
      uGlobeAbove: { value: 0 },
    };

    const material = new THREE.MeshStandardMaterial({ name: 'globe', roughness: 1, metalness: 0 });
    this.shade(material);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = 'globe';
    this.mesh.frustumCulled = false; // made round the eye: something of it is always in view when it is shown
    this.mesh.raycast = () => {}; // nothing to pick: what is clicked is the place, not the planet
    this.mesh.visible = false;
    this.mesh.renderOrder = 2; // after the site's ground (land.ts: 1), so what that covers is not shaded
    this.group.add(this.mesh);

    this.airUniforms = {
      uCentre: { value: new THREE.Vector3() },
      uSun: { value: this.sun },
      uAlt: { value: 0 },
      uRadius: { value: this.radius },
      uWeight: { value: 0 },
      uSunLight: { value: SUNLIGHT },
    };
    this.air = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 32),
      new THREE.ShaderMaterial({
        name: 'air',
        uniforms: this.airUniforms,
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: AIR,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        // what is behind keeps what the air lets through (alpha), and the air's own light is added
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.SrcAlphaFactor,
      }),
    );
    this.air.name = 'air';
    this.air.frustumCulled = false;
    this.air.raycast = () => {};
    this.air.renderOrder = 10;
    this.air.visible = false;
    this.group.add(this.air);

    void Promise.all([loadCube('land'), loadCube('ice')]).then(([land, ice]) => {
      this.uniforms.uGlobeLand!.value = land;
      this.uniforms.uGlobeIce!.value = ice;
      this.arrived = true;
    });
  }

  /** GLSL and uniforms for the site's ground to hand over to the globe across its last stretch (land.ts: Land.meet). */
  get beyond(): Beyond {
    const y0 = this.seaLevel - this.site.height; // the sea under the site's origin, in its frame
    const R = this.radius.toFixed(1);
    return {
      uniforms: this.uniforms,
      // the sea's height under a point of the scene (its x and z), on the sphere that fits it round the site
      vertex: /* glsl */ `
        float beyondHeight(vec3 p) {
          float r = length(p.xz);
          return ${y0.toFixed(3)} - r * r / (${R} + sqrt(${R} * ${R} - r * r));
        }`,
      fragment: /* glsl */ `
        uniform vec3 uGlobeOrigin;
        uniform mat3 uGlobeAxes;
        ${COLOUR}
        vec3 beyondAlbedo(vec3 p, out float rough) { return globeAlbedo(normalize(uGlobeOrigin + uGlobeAxes * p), rough); }`,
    };
  }

  /**
   * The Sun's light on the globe: the true Sun's, dimmed by the air it comes through to each
   * place (so the terminator reddens) and by `aerosol` of haze straight up. Near the site the
   * scene's own light is kept, so the globe and the site's ground agree where they meet; and the
   * Sun's strength is set so that at the site the two are the same (`sunlight`: the scene's light
   * when it is the Sun, null when it is not).
   */
  light(sunlight: number | null, aerosol: number): void {
    const t = transmission(this.sun.y, aerosol, this.radius); // the site's own up is +Y
    this.uniforms.uGlobeSunLight!.value =
      sunlight !== null && t > 0.05 ? THREE.MathUtils.clamp(sunlight / t, 0.5 * SUNLIGHT, 2 * SUNLIGHT) : SUNLIGHT;
    this.uniforms.uGlobeAerosol!.value = aerosol;
  }

  /** Where the hole for the site's ground ends, as a distance from its middle in its frame: the ground has handed over by then. */
  get holeEdge(): number {
    return this.hole?.half ?? 0;
  }

  /** The eye's height above the sea, metres (geodetic, as the simulator measures it). */
  altitude(eye: THREE.Vector3): number {
    return ecefToGeodetic(this.toEcef(eye)).height - this.seaLevel;
  }

  /** Straight up from the sea under the eye, in the scene's frame. */
  up(eye: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    const n = ellipsoidNormal(this.toEcef(eye));
    const [ex, ey, ez] = this.axes;
    return out.set(dot(ex, n), dot(ey, n), dot(ez, n));
  }

  /** How far off the furthest part of the globe in view is: its horizon, metres; 0 while it is not drawn. */
  reach(eye: THREE.Vector3): number {
    return this.mesh.visible ? 1.05 * horizonDistance(this.altitude(eye), this.radius) + 1000 : 0;
  }

  /** Where the eye is (the scene's frame): the mesh is made round it. True if what is drawn changed. */
  attend(eye: THREE.Vector3): boolean {
    let changed = false;
    if (this.arrived) {
      this.arrived = false;
      changed = true;
    }
    const height = Math.max(0, this.altitude(eye));
    // the globe is all under the site's ground while the horizon is nearer than its edge
    const shown = !this.hole || Math.hypot(eye.x, eye.z) + horizonDistance(height, this.radius) > 0.9 * this.hole.half;
    if (shown !== this.mesh.visible) {
      this.mesh.visible = shown;
      changed = true;
    }
    if (this.uniforms.uGlobeAbove!.value !== this.thin) {
      this.uniforms.uGlobeAbove!.value = this.thin;
      changed = true;
    }
    // the air: a ball round the eye, inside the far plane and outside whatever is being followed
    const thin = this.thin > 0.01;
    if (thin !== this.air.visible) {
      this.air.visible = thin;
      changed = true;
    }
    if (thin) {
      const u = this.airUniforms;
      // the sphere that fits the sea under the eye: its centre, from the eye
      const e = this.toEcef(eye);
      const sphere = gaussianRadius(ecefToGeodetic(e).latitude);
      const under = seaPoint(e, this.seaLevel);
      const centre = this.toSite(sub(under, scale(ellipsoidNormal(under), sphere)));
      u.uCentre!.value.set(centre[0] - eye.x, centre[1] - eye.y, centre[2] - eye.z);
      u.uRadius!.value = sphere;
      u.uAlt!.value = height;
      if (u.uWeight!.value !== this.thin) changed = true;
      u.uWeight!.value = this.thin;
      this.air.position.copy(eye);
      this.air.scale.setScalar(THREE.MathUtils.clamp(0.1 * height, 300, 30_000));
    }
    if (!shown) return changed;
    const e = this.toEcef(eye);
    const under = seaPoint(e, this.seaLevel);
    const made = this.madeAt;
    const h = Math.max(height, 30);
    if (made && length(sub(under, made)) < 0.1 * this.madeHeight && h > 0.8 * this.madeHeight && h < 1.25 * this.madeHeight) return changed;
    this.make(under, h);
    return true;
  }

  private toEcef(p: THREE.Vector3): Vec3 {
    const [ex, ey, ez] = this.axes;
    return add(this.origin, add(add(scale(ex, p.x), scale(ey, p.y)), scale(ez, p.z)));
  }

  private toSite(q: Vec3): Vec3 {
    const d = sub(q, this.origin);
    return [dot(this.axes[0], d), dot(this.axes[1], d), dot(this.axes[2], d)];
  }

  /** Make the mesh round the point of the sea `under` the eye, which is `height` above it. */
  private make(under: Vec3, height: number): void {
    this.madeAt = under;
    this.madeHeight = height;
    const u0 = unit(under);
    // out past the horizon of an eye a third higher, so a climb does not show the edge before the next making
    const reach = Math.min(1.5, horizonAngle(1.35 * height, this.radius) * 1.05 + 1e-4);
    const span = reach * this.radius;
    const k = Math.asinh(span / height) / RINGS;
    // two directions along the surface at the point under the eye
    const east = length(cross([0, 0, 1], u0)) > 1e-6 ? unit(cross([0, 0, 1], u0)) : ([1, 0, 0] as Vec3);
    const north = cross(u0, east);
    const anchor = this.toSite(under);
    this.mesh.position.set(anchor[0], anchor[1], anchor[2]);
    const pos = this.positions.array as Float32Array;
    const nor = this.normals.array as Float32Array;
    const dir = this.earth.array as Float32Array;
    const [ex, ey, ez] = this.axes;
    const cos = Array.from({ length: SPOKES + 1 }, (_, j) => Math.cos((2 * Math.PI * j) / SPOKES));
    const sin = Array.from({ length: SPOKES + 1 }, (_, j) => Math.sin((2 * Math.PI * j) / SPOKES));
    let v = 0;
    for (let i = 0; i <= RINGS; i++) {
      const theta = (height * Math.sinh(k * i)) / this.radius;
      const [ct, st] = [Math.cos(theta), Math.sin(theta)];
      for (let j = 0; j <= SPOKES; j++, v += 3) {
        const a = cos[j]! * st,
          b = sin[j]! * st;
        const u: Vec3 = [
          u0[0] * ct + east[0] * a + north[0] * b,
          u0[1] * ct + east[1] * a + north[1] * b,
          u0[2] * ct + east[2] * a + north[2] * b,
        ];
        const p = seaPoint(u, this.seaLevel);
        const s = this.toSite(p);
        pos[v] = s[0] - anchor[0];
        pos[v + 1] = s[1] - anchor[1];
        pos[v + 2] = s[2] - anchor[2];
        const n = ellipsoidNormal(p);
        nor[v] = dot(ex, n);
        nor[v + 1] = dot(ey, n);
        nor[v + 2] = dot(ez, n);
        dir[v] = u[0];
        dir[v + 1] = u[1];
        dir[v + 2] = u[2];
      }
    }
    this.positions.needsUpdate = true;
    this.normals.needsUpdate = true;
    this.earth.needsUpdate = true;
    this.mesh.updateMatrixWorld();
  }

  private shade(material: THREE.MeshStandardMaterial): void {
    const uniforms = this.uniforms;
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          /* glsl */ `#include <common>
          attribute vec3 aEarth;
          varying vec3 vEarth;
          varying vec3 vGlobeSite;
          varying vec3 vGlobeNormal;`,
        )
        .replace(
          '#include <fog_vertex>',
          /* glsl */ `#include <fog_vertex>
          vEarth = aEarth;
          vGlobeSite = (modelMatrix * vec4(transformed, 1.0)).xyz + uOrigin;
          vGlobeNormal = normal;`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          /* glsl */ `#include <common>
          varying vec3 vEarth;
          varying vec3 vGlobeSite;
          varying vec3 vGlobeNormal;
          uniform vec3 uGlobeSun, uGlobeOrigin;
          uniform mat3 uGlobeAxes;
          uniform mat4 uGlobeHole;
          uniform float uGlobeHalf, uGlobeSeaLevel, uGlobeHaze, uGlobeSunLight, uGlobeAerosol, uGlobeAbove;
          ${CHAPMAN}
          float globeRough;
          ${COLOUR}
          // height above the sea of a point of the scene, metres: radially over the ellipsoid, which at these heights is the same as along its normal
          float globeHeight(vec3 p) {
            vec3 q = uGlobeOrigin + uGlobeAxes * p;
            float s = sqrt(dot(q.xy, q.xy) / ${(6378137 ** 2).toExponential(10)} + q.z * q.z / ${(6356752.314245 ** 2).toExponential(10)});
            return length(q) * (1.0 - 1.0 / s) - uGlobeSeaLevel;
          }`,
        )
        .replace(
          '#include <fog_pars_fragment>',
          /* glsl */ `#include <fog_pars_fragment>
          #define cloudAt(xz) 0.0`, // the cumulus are the site's (air.ts): their shadows stay there
        )
        .replace(
          '#include <map_fragment>',
          /* glsl */ `
          // the site's own ground is drawn there (but not on the far side of the Earth, whose x and z are the same)
          if (uGlobeHalf > 0.0 && vGlobeSite.y > -3000.0) {
            vec2 q = (uGlobeHole * vec4(vGlobeSite, 1.0)).xz;
            if (max(abs(q.x), abs(q.y)) < uGlobeHalf) discard;
          }
          diffuseColor.rgb = globeAlbedo(normalize(vEarth), globeRough);`,
        )
        .replace(
          '#include <roughnessmap_fragment>',
          /* glsl */ `#include <roughnessmap_fragment>
          roughnessFactor = globeRough;`,
        )
        .replace(
          '#include <lights_fragment_end>',
          /* glsl */ `#include <lights_fragment_end>
          {
            // where the Sun is down here the sky gives no light (the scene's sky is the site's)
            float day = smoothstep(-0.1, 0.06, dot(normalize(vGlobeNormal), uGlobeSun));
            reflectedLight.indirectDiffuse *= mix(0.02, 1.0, day);
            reflectedLight.indirectSpecular *= mix(0.02, 1.0, day);
          }
          #if NUM_DIR_LIGHTS > 0
          {
            // away from the site, the true Sun through the air over each place in place of the scene's light
            float away = uGlobeHalf > 0.0 ? smoothstep(uGlobeHalf, 3.0 * uGlobeHalf, length(vGlobeSite)) : 1.0;
            if (away > 0.0) {
              ReflectedLight scene = ReflectedLight(vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));
              IncidentLight light;
              getDirectionalLightInfo(directionalLights[0], light);
              RE_Direct(light, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, scene);
              ReflectedLight sun = ReflectedLight(vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));
              float mu = dot(normalize(vGlobeNormal), uGlobeSun);
              light.direction = normalize((viewMatrix * vec4(uGlobeSun, 0.0)).xyz);
              light.color = uGlobeSunLight * exp(-(vec3(${RAYLEIGH.map((v) => v.toFixed(4)).join(', ')}) + uGlobeAerosol) * chapman(0.0, mu, ${this.radius.toFixed(1)}));
              light.visible = true;
              RE_Direct(light, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, sun);
              reflectedLight.directDiffuse += away * (sun.directDiffuse - scene.directDiffuse);
              reflectedLight.directSpecular += away * (sun.directSpecular - scene.directSpecular);
            }
          }
          #endif`,
        )
        .replace(
          '#include <fog_fragment>',
          /* glsl */ `
          #if defined( USE_FOG ) && defined( FOG_EXP2 )
          {
            // the haze (air.ts), its density falling by e every uGlobeHaze metres of height over the curved sea:
            // the ray in six pieces, each with its height taken as changing evenly along it
            vec3 eye = cameraPosition + uOrigin;
            float len = distance(eye, vGlobeSite) / 6.0;
            float tau = 0.0;
            float a = max(globeHeight(eye), 0.0) / uGlobeHaze;
            for (int k = 1; k <= 6; k++) {
              // (the end is on the sea: its height is 0, not what the flat triangle under it says)
              float b = k == 6 ? 0.0 : max(globeHeight(mix(eye, vGlobeSite, float(k) / 6.0)), 0.0) / uGlobeHaze;
              tau += len * (abs(a - b) < 1e-3 ? exp(-0.5 * (a + b)) : (exp(-min(a, b)) - exp(-max(a, b))) / abs(b - a));
              a = b;
            }
            // The scene's haze colour is the haze seen along the ground, warmed by the long path through it. Seen from
            // above (as the sky gives way to the air, uGlobeAbove) the haze is lit from over it: as bright, not warm, a
            // little blue; and over the night side, unlit. Without this the daytime limb had a brown line along it.
            vec3 haze = mix(fogColor, vec3(dot(fogColor, vec3(0.2126, 0.7152, 0.0722))) * vec3(0.86, 0.95, 1.1), uGlobeAbove);
            haze *= mix(1.0, smoothstep(-0.15, 0.1, dot(normalize(vGlobeNormal), uGlobeSun)), uGlobeAbove);
            gl_FragColor.rgb = mix(gl_FragColor.rgb, haze, 1.0 - exp(-fogDensity * tau));
          }
          #endif`,
        );
    };
    material.customProgramCacheKey = () => 'globe';
  }
}

import * as THREE from 'three';
import { ATMOSPHERE_GLSL, type atmosphereUniforms } from '../viewer/atmosphere.ts';
import { WGS84_A, WGS84_B } from '../world/bodies.ts';
import type { Mat3, Vec3 } from '../world/frames.ts';
import { RELIEF_GLSL } from '../world/relief.ts';

/**
 * The Earth from the Moon: the whole of it, 1.9 degrees across, as one ball.
 *
 * It is the same Earth the globe draws under a flight (viewer/globe.ts), at the size 370,000 km
 * needs: the globe's own maps baked small (tools/front-earth.mjs: the land's and the ice's shores,
 * the relief, Blue Marble's colours), the same air (viewer/atmosphere.ts: Rayleigh's blue, the
 * haze, ozone, the Earth's shadow), the same sea (dark water coloured by its depth, the Sun's
 * glint by Cox and Munk's law). The globe's mesh is made round an eye a few hundred kilometres
 * up, its air on a ball round that eye and its maps are a third of a gigabyte: none of that is
 * for a planet a pixel of which is 25 km.
 *
 * What the globe does not have and this does is **the day**: the cloud, the sea ice and the snow
 * of the hour, from ECMWF's ERA5 reanalysis (tools/front-earth.mjs says how, and how far it can
 * be trusted: derived, well held over the northern continents in 1961 and the model's own over the
 * southern oceans). The cloud is drawn as how much of the Sun's light it sends back, cell by
 * cell: a front is bright, cirrus a veil, and there is no noise standing in for what a quarter of
 * a degree does not show. The night side is dark: no lights, since none are recorded.
 *
 * **How it is drawn.** One ball of the air's top (100 km over the sea), flattened as the Earth
 * is. Each pixel's ray is met with the air and the sea in the Earth's own frame, where every
 * number is a few thousand kilometres (from the eye they are 370,000 and a float keeps 32 m):
 * squashed along the axis so that the ellipsoid is a sphere, which puts the air's top 0.3 per cent
 * out near the poles and nothing else. Where the ray meets the sea the surface is coloured and
 * lit by the true Sun through the air over it; then the air along the ray is walked
 * (`atmScatter`), adding its light and dimming what is behind. Where it misses, the air's light
 * is all there is: the limb's glow, a pixel or less of it at this distance.
 *
 * Estimated, for the look: the snow's whiteness on land (trees stand through it), the cloud's
 * whiteness, the haze (a clean ocean's). The sea's own colours and the waves' slopes are the
 * globe's figures, restated here because the globe's module is a launch site's and is not brought
 * into the front page: change them in both.
 */

/** Deep water's own colour, and what the slopes of its waves come to at 7 m/s (globe.ts: DEEP, SEA_SLOPES). */
const DEEP = [0.003, 0.016, 0.045] as const;
const SEA_SLOPES = 0.003 + 0.00512 * 7;
/** Ice and snow seen whole (globe.ts: ICE, 0xe4eaee, in linear light). */
const ICE = new THREE.Color(0xe4eaee);
/** Distances to the shore are kept to this many texels of the globe's own maps (tools/globe.mjs: SPREAD). */
const SPREAD = 8;
/** The top of the air over the sea, metres (atmosphere.ts: TOP). */
const TOP = 100_000;

const vec3 = (c: readonly number[] | THREE.Color): string => {
  const [r, g, b] = c instanceof THREE.Color ? [c.r, c.g, c.b] : c;
  return `vec3(${r!.toFixed(4)}, ${g!.toFixed(4)}, ${b!.toFixed(4)})`;
};

const VERTEX = /* glsl */ `
  varying vec3 vObj;
  void main() {
    vObj = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uEye;      // the eye in the Earth's own frame, squashed (metres)
  uniform vec3 uSun;      // toward the Sun, in the Earth's frame
  uniform samplerCube tSurface, tColour, tDay;
  uniform float uIn;      // how far the maps have come in since they arrived, 0 to 1
  uniform float uDay;     // and the day's
  varying vec3 vObj;
  ${ATMOSPHERE_GLSL}
  ${RELIEF_GLSL}
  const float A = ${WGS84_A.toFixed(1)}, SQUASH = ${(WGS84_B / WGS84_A).toFixed(9)}, SHELL = ${(WGS84_A + TOP).toFixed(1)};

  // The Sun's glint on the sea: Cox and Munk's law (1954), as viewer/globe.ts has it (globeGlint). l, n, v: toward
  // the light, the sea's normal, toward the eye.
  float glint(vec3 l, vec3 n, vec3 v) {
    vec3 h = normalize(l + v);
    float nh = dot(n, h), nl = dot(n, l), nv = max(dot(n, v), 1e-3), vh = clamp(dot(v, h), 1e-3, 1.0);
    if (nl <= 0.0 || nh <= 1e-3) return 0.0;
    float nh2 = nh * nh;
    float spread = exp(-(1.0 - nh2) / (nh2 * ${SEA_SLOPES.toFixed(5)})) / (${(Math.PI * SEA_SLOPES).toFixed(5)} * nh2 * nh2);
    float away = 1.0 - vh;
    float fresnel = 0.02 + 0.98 * away * away * away * away * away;
    float seen = min(1.0, 2.0 * nh * min(nv, nl) / vh);
    return fresnel * spread * seen / (4.0 * nv);
  }

  void main() {
    // the ray, in the squashed frame: from the eye through this point of the ball
    vec3 o = vObj * SHELL;
    vec3 d = normalize(o - uEye);
    float b = dot(o, d);
    float miss2 = dot(o, o) - b * b;   // how far the ray passes from the centre, squared
    float discT = SHELL * SHELL - miss2;
    if (discT <= 0.0) discard;
    float tIn = -b - sqrt(discT), tEnd = -b + sqrt(discT);
    float discG = A * A - miss2;
    // how much of the pixel is the sea's disc: its edge taken over the pixel, since no triangle's edge is there
    float miss = sqrt(max(miss2, 0.0));
    float ground = 1.0 - smoothstep(-0.5, 0.5, (miss - A) / max(fwidth(miss), 1.0));
    if (discG > 0.0) tEnd = -b - sqrt(discG);
    vec3 from = o + d * tIn;   // where the ray comes into the air
    vec3 through;
    vec3 light = atmScatter(-from, A, d, 0.0, tEnd - tIn, uSun, through);

    vec3 surface = vec3(0.0);
    if (ground > 0.0) {
      // the point of the sea the ray meets (or, at the very edge, passes nearest), its place and its normal
      vec3 p = normalize(o + d * (discG > 0.0 ? tEnd : -b));
      vec3 place = normalize(p * vec3(1.0, 1.0, SQUASH));
      vec3 n = normalize(p * vec3(1.0, 1.0, 1.0 / SQUASH));
      float mu = dot(n, uSun);
      vec3 sun = uAtmSunLight * atmSunAt(0.0, mu) * (1.0 / 3.14159265);   // what a white level surface sends back, squarely lit
      vec4 s = texture(tSurface, place);
      float l = (s.r * 255.0 - 128.0) * ${(SPREAD / 127).toFixed(6)};
      float land = smoothstep(-0.5, 0.5, l / (fwidth(l) * 0.8 + 0.25));
      float i = (s.g * 255.0 - 128.0) * ${(SPREAD / 127).toFixed(6)};
      float ice = smoothstep(-0.5, 0.5, i / (fwidth(i) * 0.8 + 0.25));
      float h = reliefMetres(s.b * 255.0);
      vec3 day = texture(tDay, place).rgb * uDay;
      // the sea by its depth (globe.ts: globeWater, away from the banks), and the ice on it
      vec3 deep = ${vec3(DEEP)};
      vec3 water = deep + (vec3(0.05, 0.06, 0.045) - deep) * exp(-vec3(0.70, 0.14, 0.07) * 2.2 * max(h > 1.5 ? 12.0 : -h, 2.0));
      water = mix(water, ${vec3(ICE)} * 0.85, day.g * (1.0 - land));
      // the land in its own colours, under the day's snow (which trees stand through: 0.6 of it, estimated)
      vec3 soil = mix(${vec3(new THREE.Color(0x4f7a42))}, texture(tColour, place).rgb, uIn);
      soil = mix(soil, ${vec3(ICE)}, 0.6 * day.b);
      vec3 albedo = mix(mix(water, soil, land), ${vec3(ICE)}, ice);
      float sea = (1.0 - max(land, ice)) * (1.0 - day.g);
      float lit = max(mu, 0.0);
      vec3 v = -normalize(d * vec3(1.0, 1.0, SQUASH));
      surface = albedo * sun * lit + sea * uAtmSunLight * atmSunAt(0.0, mu) * glint(uSun, n, v);
      // the cloud: what of the Sun's light it sends back, and what it keeps from the ground and gives back to it
      float cloud = day.r;
      surface = surface * (1.0 - cloud) * (1.0 - cloud) + vec3(0.96, 0.97, 1.0) * cloud * sun * lit;
    }
    vec3 colour = light + surface * through * ground;
    float alpha = max(ground, 1.0 - dot(through, vec3(0.3, 0.4, 0.3)));
    gl_FragColor = vec4(colour, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

/** A picture's six faces, side by side as tools/front-earth.mjs writes them, as a cube map: `side` texels a face on the GPU (smaller than the file's on the lighter tier). */
async function cube(url: string, side: number | null, srgb: boolean): Promise<THREE.CubeTexture> {
  const blob = await (await fetch(url)).blob();
  const whole = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none', imageOrientation: 'none' });
  const face = whole.height;
  const faces = await Promise.all(
    Array.from({ length: 6 }, (_, f) =>
      createImageBitmap(whole, f * face, 0, face, face, {
        colorSpaceConversion: 'none',
        premultiplyAlpha: 'none',
        imageOrientation: 'none',
        ...(side && side < face ? { resizeWidth: side, resizeHeight: side, resizeQuality: 'high' as const } : {}),
      }),
    ),
  );
  whole.close();
  const texture = new THREE.CubeTexture(faces as unknown as HTMLImageElement[]);
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.flipY = false;
  texture.needsUpdate = true;
  // (the decoded faces are let go once they have been sent: `sent`)
  texture.onUpdate = () => {
    for (const f of faces) f.close();
    texture.onUpdate = null as unknown as () => void;
  };
  return texture;
}

/** One texel of one value on every face: what a map reads until it arrives. */
function blank(r: number, g: number, b: number): THREE.CubeTexture {
  const texel = new Uint8Array([r, g, b, 255]);
  const texture = new THREE.CubeTexture(
    Array.from({ length: 6 }, () => new THREE.DataTexture(texel, 1, 1, THREE.RGBAFormat)) as unknown as HTMLImageElement[],
  );
  texture.needsUpdate = true;
  return texture;
}

/** Milliseconds a map takes to come in once it has arrived: no pop. */
const SURFACING = 1200;

export class FarEarth {
  readonly mesh: THREE.Mesh;
  private readonly uniforms: Record<string, THREE.IUniform>;
  private readonly textures: THREE.Texture[] = [];
  /** When the surface and the day arrived (milliseconds; 0: not yet). */
  private surfacedAt = 0;
  private dayAt = 0;
  private gone = false;

  /**
   * `air`: this scene's own tables of the air (atmosphere.ts: ownAtmosphere, made by makeAtmosphere). `base`: where
   * the page's files are. `lighter`: the colours at half size each way (tier.ts).
   */
  constructor(air: typeof atmosphereUniforms, base: string, lighter: boolean) {
    this.uniforms = {
      uEye: { value: new THREE.Vector3() },
      uSun: { value: new THREE.Vector3(1, 0, 0) },
      // (until they arrive: open sea everywhere at sea level, in the globe's one green, under a clear sky)
      tSurface: { value: this.keep(blank(0, 0, 100)) },
      tColour: { value: this.keep(blank(128, 128, 128)) },
      tDay: { value: this.keep(blank(0, 0, 0)) },
      uIn: { value: 0 },
      uDay: { value: 0 },
      ...air,
    };
    const geometry = new THREE.SphereGeometry(1, 128, 64);
    // (the ball's poles on the Earth's: three's sphere has them on +Y)
    geometry.rotateX(Math.PI / 2);
    this.mesh = new THREE.Mesh(
      geometry,
      new THREE.ShaderMaterial({
        name: 'far-earth',
        uniforms: this.uniforms,
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        // (drawn with what is solid, before the Moon, which is in front of it wherever both are: not left to the end
        // with what is see-through)
        transparent: false,
        depthTest: false,
        depthWrite: false,
        // (what is behind, a star, shows through the thin air at the limb and not through the Earth)
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
      }),
    );
    this.mesh.name = 'earth';
    this.mesh.frustumCulled = false;
    this.mesh.scale.set(WGS84_A + TOP, WGS84_A + TOP, (WGS84_A + TOP) * (WGS84_B / WGS84_A));
    this.mesh.renderOrder = 1;
    void this.load(base, lighter);
  }

  private keep<T extends THREE.Texture>(texture: T): T {
    this.textures.push(texture);
    return texture;
  }

  /** The maps, the surface first: each is shown when it is in, and comes up over a second. */
  private async load(base: string, lighter: boolean): Promise<void> {
    const put = (name: string, texture: THREE.CubeTexture): void => {
      if (this.gone) return void texture.dispose();
      (this.uniforms[name]!.value as THREE.Texture).dispose();
      this.uniforms[name]!.value = this.keep(texture);
    };
    const [surface, colour] = await Promise.all([
      cube(`${base}front/earth.surface.png`, null, false),
      cube(`${base}front/earth.colour.jpg`, lighter ? 512 : null, true),
    ]);
    put('tSurface', surface);
    put('tColour', colour);
    this.surfacedAt = performance.now();
    put('tDay', await cube(`${base}front/earth.day.jpg`, null, false));
    this.dayAt = performance.now();
  }

  /** Whether its surface has arrived: the first frame worth showing. */
  get ready(): boolean {
    return this.surfacedAt > 0;
  }

  /**
   * Put it where it is: its centre from the eye and how it is turned (front/view.ts: FrontSky), with the Sun's
   * direction, all in the scene's frame. True while something of it is still coming in.
   */
  place(centre: Vec3, axes: Mat3, sun: Vec3, now: number): boolean {
    this.mesh.position.set(centre[0], centre[1], centre[2]);
    // the Earth's own axes are the rotation's columns
    const m = new THREE.Matrix4().set(
      axes[0][0],
      axes[0][1],
      axes[0][2],
      0,
      axes[1][0],
      axes[1][1],
      axes[1][2],
      0,
      axes[2][0],
      axes[2][1],
      axes[2][2],
      0,
      0,
      0,
      0,
      1,
    );
    this.mesh.quaternion.setFromRotationMatrix(m);
    // the eye and the Sun in the Earth's frame: back through its axes (the eye is at the scene's origin while it is drawn)
    const back = (v: Vec3): [number, number, number] => [
      axes[0][0] * v[0] + axes[1][0] * v[1] + axes[2][0] * v[2],
      axes[0][1] * v[0] + axes[1][1] * v[1] + axes[2][1] * v[2],
      axes[0][2] * v[0] + axes[1][2] * v[1] + axes[2][2] * v[2],
    ];
    const eye = back([-centre[0], -centre[1], -centre[2]]);
    (this.uniforms.uEye!.value as THREE.Vector3).set(eye[0], eye[1], eye[2] * (WGS84_A / WGS84_B));
    const s = back(sun);
    (this.uniforms.uSun!.value as THREE.Vector3).set(s[0], s[1], s[2]).normalize();
    const surfaced = this.surfacedAt ? Math.min(1, (now - this.surfacedAt) / SURFACING) : 0;
    const day = this.dayAt ? Math.min(1, (now - this.dayAt) / SURFACING) : 0;
    const coming = surfaced !== this.uniforms.uIn!.value || day !== this.uniforms.uDay!.value;
    this.uniforms.uIn!.value = surfaced;
    this.uniforms.uDay!.value = day;
    return coming;
  }

  dispose(): void {
    this.gone = true;
    for (const t of this.textures) t.dispose();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

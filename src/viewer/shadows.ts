import * as THREE from 'three';

/**
 * The Sun's second shadow map: the whole place, coarsely, under the fine one.
 *
 * The Sun's own map (stage.ts: fitShadows, fitWalkShadows) is spent where it is looked at: on the
 * section's model, or on foot on 52 m of ground round the walker at 6 mm a texel. Beyond its edge
 * nothing had a shadow at all: from the hardstand the blockhouse, the other pad's gantry and the
 * far rails stood unshadowed on lit ground, and on foot the edge was 26 m off and jumped 9 m
 * each time the map was fitted again, so shadows came and went in pieces as one walked.
 *
 * So there are two maps. This one covers everything that stands at the place and is fitted once
 * (again only when the light has moved or the place has changed), so it never shifts under a
 * walker. It belongs to a second directional light that gives no light (black, and its own turn
 * in the shader's loop is left out): three draws its map and hands the shader its matrix, and the
 * shader's one change (below) is that the Sun's shadow is read from the fine map and, over the
 * outer part of that map and beyond it, from this one, the two mixed across the band so there is
 * no line where one takes over.
 *
 * It is drawn only when something asked for the shadows again that it would show: the light (at
 * once), a structure rolling back or a level of detail changing (ten times a second). The figure being walked as asks every frame it
 * moves, for the fine map alone (`nearOnly`), and is left out of this one, which is not drawn
 * again as he goes and would keep his shadow where he had been: so on foot this map is drawn in
 * a frame of its own, with his shadow switched off, and the fine map in the frames either side.
 */

/** Texels a side. At 300 m of half-width a texel is 15 cm: soft, and never seen from nearer than the fine map's edge. */
const SIZE = 4096;
/** The most it covers, metres from the middle of the place: beyond, a texel is too coarse to be a shadow. */
const REACH = 330;
/** On foot, how many frames this map waits for one in which the fine map is not wanted, before it takes one anyway. */
const PATIENCE = 12;
/** How many times a second this map is drawn again for what is not the light moving. */
const RATE = 10;
/** The sky map: texels a side, and how much of the sky's light is left under a roof (what comes in at doors and windows and off the walls, as a share). */
/**
 * Whether the sky map is drawn and read. Off: the land's and the globe's shaders already use every texture unit a
 * fragment shader is promised (16), and a shadowed light adds a sampler to every lit material whether it reads it
 * or not, so with a third map they do not link. Until one of their maps is given up or packed, the sky's light is
 * not held back under roofs.
 */
const SKY_ON = false;
const SKY_SIZE = 2048;
const UNDER = 0.22;
/** Where across the fine map (0 its middle, 1 its edge) the far one comes in, from and to. */
const BAND = [0.78, 0.96] as const;

// The shader. Two directional lights with shadows are the Sun and this: the first reads both maps, the second gives nothing.
/** three's loop over the directional lights, as lights_fragment_begin has it: each light's shadow, then its light. */
const LOOP =
  /#if defined\( USE_SHADOWMAP \) && \( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS \)\s+directionalLightShadow = directionalLightShadows\[ i \];\s+directLight\.color[^\n]+\n\s+#endif\s+RE_Direct\([^\n]+\n/;
const found = LOOP.exec(THREE.ShaderChunk.lights_fragment_begin)?.[0];
const CASCADED = /* glsl */ `
		#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS == 3
			#if UNROLLED_LOOP_INDEX == 0
			#ifdef SKY_OVERHEAD
			if ( receiveShadow ) {
				// how much of the sky is over this point: the third map looks straight down
				directionalLightShadow = directionalLightShadows[ 2 ];
				skyOpen = mix( ${UNDER.toFixed(2)}, 1.0, getShadow( directionalShadowMap[ 2 ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ 2 ] ) );
			}
			#endif
			if ( receiveShadow ) {
				directionalLightShadow = directionalLightShadows[ 0 ];
				vec3 fineAt = vDirectionalShadowCoord[ 0 ].xyz / vDirectionalShadowCoord[ 0 ].w;
				// how far out across the fine map: 0 at its middle, 1 at its edge (and past its far plane, outside it)
				float out0 = fineAt.z > 1.0 ? 2.0 : 2.0 * max( abs( fineAt.x - 0.5 ), abs( fineAt.y - 0.5 ) );
				float farShare = smoothstep( ${BAND[0].toFixed(2)}, ${BAND[1].toFixed(2)}, out0 );
				float lit = 1.0;
				if ( farShare < 1.0 ) lit = getShadow( directionalShadowMap[ 0 ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ 0 ] );
				if ( farShare > 0.0 ) {
					directionalLightShadow = directionalLightShadows[ 1 ];
					lit = mix( lit, getShadow( directionalShadowMap[ 1 ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ 1 ] ), farShare );
				}
				directLight.color *= lit;
			}
			RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
			#endif
		#else
		${found}
		#endif
`;
// The sky's light under a roof. The hemisphere light and the sky's reflection fall on every surface alike: a floor
// indoors was lit blue by a sky it cannot see, a ceiling by the ground's colour, and a room looked like outdoors in
// shade. `skyOpen` is how much of the sky is over a point (1 in the open, UNDER below anything), read from a third
// map that looks straight down, and both of the sky's terms are scaled by it: a room is then lit by its lamps and
// by the Sun through its windows, and what stands on a floor is darker underneath.
// Only a material that asks reads it (`SKY_OVERHEAD` defined: the models' are, Stage.dress): the land and the globe
// have no texture unit to spare for a third map, and nothing of theirs is under a roof.
const HEMI = 'irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );';
const IBL = [
  'iblIrradiance += getIBLIrradiance( geometryNormal );',
  'vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );',
];
const begin = THREE.ShaderChunk.lights_fragment_begin;
const maps = THREE.ShaderChunk.lights_fragment_maps;
if (found && begin.includes(HEMI) && IBL.every((line) => maps.includes(line))) {
  THREE.ShaderChunk.lights_fragment_begin = `float skyOpen = 1.0;\n${begin.replace(found, CASCADED).replace(HEMI, HEMI.replace(';', ' * skyOpen;'))}`;
  THREE.ShaderChunk.lights_fragment_maps = maps
    .replace(IBL[0]!, IBL[0]!.replace(';', ' * skyOpen;'))
    .replace(IBL[1]!, IBL[1]!.replace(';', ' * skyOpen;'));
} else console.warn('shadows.ts: three’s light loops are not as they were: the far shadow map and the sky under roofs will not be read');

type ShadowMap = THREE.WebGLRenderer['shadowMap'];

/**
 * Give a directional light's shadow its depth bias as a length: so many texels of its map, and never under 2 cm,
 * whatever depth the map's camera spans. Call it after the camera and the map's size are set.
 *
 * Three's `bias` is a fraction of the camera's depth range, and it was set as one (a fraction of the map's width):
 * on foot, with 400 m of range, that came to 29 cm, and in the orbiting view to 60 cm. A caster nearer than that to
 * what it shades cast nothing: sunlight came through every flat roof (18 cm of concrete) along the tops of the walls
 * inside, and under every platform. What a depth bias is for is the map's own grain, which is a texel or two; a
 * surface the light grazes is `normalBias`'s work.
 */
export function depthBias(shadow: THREE.LightShadow, texels = 2.5): void {
  const camera = shadow.camera as THREE.OrthographicCamera;
  const texel = (camera.right - camera.left) / shadow.mapSize.x;
  shadow.bias = -Math.max(0.02, texels * texel) / (camera.far - camera.near);
}

export class FarShadow {
  /** The light the map belongs to: in the scene after the Sun, giving no light. Its target is its own child of the scene too. */
  readonly light = new THREE.DirectionalLight(0x000000, 0);
  private readonly map: ShadowMap;
  private readonly sun: THREE.DirectionalLight;
  private readonly cover: () => THREE.Box3 | null;
  /** The light whose map looks straight down on the place: what is under a roof (`skyOpen` in the shader). In the scene after `light`. */
  readonly sky = new THREE.DirectionalLight(0x000000, 0);
  /** Something asked for the shadows again that this map would show. */
  private pending = true;
  /** The place has changed: the map is to be fitted to it again. */
  private stale = true;
  private quiet = false;
  private waited = 0;
  private drawnAt = Number.NEGATIVE_INFINITY;
  private readonly fitted = new THREE.Vector3();
  private readonly dir = new THREE.Vector3();
  private readonly sphere = new THREE.Sphere();
  /** While this map has a frame to itself: the meshes whose shadows were switched off for it, and whether the fine map is owed its turn. */
  private alone: { hidden: THREE.Object3D[]; owed: boolean } | null = null;

  /**
   * `sun` is the light whose shadow this continues; `cover` says what is to have a shadow (a box
   * in the scene's frame, or null while there is nothing). The renderer's shadow map must be
   * drawn on demand (`autoUpdate` false), as the stage's is: every request made of it from now on
   * is heard here.
   */
  constructor(renderer: THREE.WebGLRenderer, sun: THREE.DirectionalLight, cover: () => THREE.Box3 | null) {
    this.map = renderer.shadowMap;
    this.sun = sun;
    this.cover = cover;
    const light = this.light;
    light.castShadow = true;
    light.shadow.autoUpdate = false;
    light.shadow.mapSize.set(SIZE, SIZE);
    light.shadow.radius = 1.5;
    // (made here for the reason the Sun's is, stage.ts shadowGrain: three's own carries a colour texture nothing reads)
    const target = new THREE.WebGLRenderTarget(SIZE, SIZE, {
      format: THREE.RedFormat,
      type: THREE.UnsignedByteType,
      generateMipmaps: false,
    });
    target.texture.name = 'sun.farShadowMapUnread';
    const depth = new THREE.DepthTexture(SIZE, SIZE, THREE.UnsignedIntType);
    depth.name = 'sun.farShadowMap';
    depth.format = THREE.DepthFormat;
    depth.compareFunction = THREE.LessEqualCompare;
    depth.minFilter = depth.magFilter = THREE.LinearFilter;
    target.depthTexture = depth;
    light.shadow.map = target;
    const sky = this.sky;
    sky.castShadow = SKY_ON;
    sky.shadow.autoUpdate = false;
    sky.shadow.mapSize.set(SKY_SIZE, SKY_SIZE);
    sky.shadow.radius = 5; // soft: the sky does not stop at a doorway's line
    const over = new THREE.WebGLRenderTarget(SKY_SIZE, SKY_SIZE, {
      format: THREE.RedFormat,
      type: THREE.UnsignedByteType,
      generateMipmaps: false,
    });
    over.texture.name = 'sky.overheadMapUnread';
    const overDepth = new THREE.DepthTexture(SKY_SIZE, SKY_SIZE, THREE.UnsignedIntType);
    overDepth.name = 'sky.overheadMap';
    overDepth.format = THREE.DepthFormat;
    overDepth.compareFunction = THREE.LessEqualCompare;
    overDepth.minFilter = overDepth.magFilter = THREE.LinearFilter;
    over.depthTexture = overDepth;
    sky.shadow.map = over;
    // every request for the shadows to be drawn again is a request of this map too, unless it says otherwise
    const map = this.map;
    let wanted = map.needsUpdate;
    Object.defineProperty(map, 'needsUpdate', {
      configurable: true,
      get: () => wanted,
      set: (on: boolean) => {
        wanted = on;
        if (on && !this.quiet) this.pending = true;
      },
    });
  }

  /** Something other than the figure walked as has asked for the shadows since this map was last drawn (shadowcache.ts asks). */
  get waiting(): boolean {
    return this.pending;
  }

  /** Ask for the fine map alone to be drawn again: what moved is the figure walked as, which this map leaves out. */
  nearOnly(): void {
    this.quiet = true;
    this.map.needsUpdate = true;
    this.quiet = false;
  }

  /** What stands at the place has changed (a flight shown, its surroundings arrived): fit the map to it again. */
  refit(): void {
    this.stale = this.pending = true;
  }

  /**
   * Just before a frame is drawn. `walking` is the figure being walked as (its shadow is the fine
   * map's alone), or null. Decides whether this map is drawn in this frame, and fits it first if
   * the light has moved or the place has changed. `atOnce`: whatever asked is followed in this frame (a test's still scene).
   */
  before(walking: THREE.Object3D | null, atOnce = false): void {
    const shadow = this.light.shadow;
    shadow.needsUpdate = this.sky.shadow.needsUpdate = false;
    if (!this.pending) return;
    const fineWanted = this.map.needsUpdate;
    // on foot the fine map goes first, for as long as it is asked for and this one can wait
    if (walking && fineWanted && this.waited < PATIENCE) {
      this.waited++;
      return;
    }
    this.dir.copy(this.sun.position).sub(this.sun.target.position).normalize();
    const moved = this.stale || this.dir.distanceToSquared(this.fitted) > 1e-12;
    // The light is followed at once, as the fine map follows it. Anything else (hardware moving, a level of detail
    // fading in) is followed a few times a second: at a texel of this map and beyond the fine one, sooner is not seen.
    const now = performance.now();
    if (!moved && !atOnce && now - this.drawnAt < 1000 / RATE) return;
    this.drawnAt = now;
    if (moved) this.fit();
    if (this.sphere.radius <= 0) return; // (nothing there yet)
    this.pending = false;
    this.waited = 0;
    shadow.needsUpdate = true;
    this.sky.shadow.needsUpdate = true; // (what is overhead changes when hardware does: the same cadence)
    if (walking) {
      // a frame of its own: the figure casts nothing into it, and the fine map keeps what it has until the next
      const hidden: THREE.Object3D[] = [];
      walking.traverse((o) => {
        if (o.castShadow) {
          o.castShadow = false;
          hidden.push(o);
        }
      });
      this.alone = { hidden, owed: fineWanted };
      this.sun.shadow.autoUpdate = false;
    }
    this.nearOnly(); // (three draws no shadow map at all unless asked)
  }

  /** Just after the frame is drawn: what `before` put aside is put back. */
  after(): void {
    const alone = this.alone;
    if (!alone) return;
    this.alone = null;
    for (const o of alone.hidden) o.castShadow = true;
    this.sun.shadow.autoUpdate = true;
    if (alone.owed) this.nearOnly();
  }

  /** Aim the map along the Sun's light at everything `cover` gives, its middle on a whole texel so that a small move of the light does not swim. */
  private fit(): void {
    this.stale = false;
    this.fitted.copy(this.dir);
    const box = this.cover();
    if (!box || box.isEmpty()) {
      this.sphere.radius = 0;
      return;
    }
    box.getBoundingSphere(this.sphere);
    const radius = Math.min(REACH, this.sphere.radius + 4);
    const dir = this.dir;
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir);
    if (right.lengthSq() < 1e-8) right.set(1, 0, 0);
    right.normalize();
    const up = new THREE.Vector3().crossVectors(dir, right);
    const texel = (2 * radius) / SIZE;
    const snap = (v: number) => Math.round(v / texel) * texel;
    const c = this.sphere.center;
    const centre = new THREE.Vector3()
      .addScaledVector(right, snap(c.dot(right)))
      .addScaledVector(up, snap(c.dot(up)))
      .addScaledVector(dir, c.dot(dir));
    const light = this.light;
    light.target.position.copy(centre);
    light.position.copy(centre).addScaledVector(dir, radius + 20);
    light.updateMatrixWorld();
    light.target.updateMatrixWorld();
    Object.assign(light.shadow.camera, { left: -radius, right: radius, top: radius, bottom: -radius, near: 1, far: 2 * radius + 40 });
    light.shadow.camera.updateProjectionMatrix();
    // a texel and a half off the surface, and a depth bias of the map's own grain
    light.shadow.normalBias = 1.5 * texel;
    depthBias(light.shadow);
    // the sky map: straight down on the same ground (a hair off plumb, so the camera has a way up), from above the tallest thing
    const sky = this.sky;
    const down = new THREE.Vector3(0.012, 1, 0.007).normalize();
    const top = box.max.y + 10,
      deep = Math.max(20, top - box.min.y + 10);
    sky.target.position.set(c.x, top - deep, c.z);
    sky.position.copy(sky.target.position).addScaledVector(down, deep);
    sky.updateMatrixWorld();
    sky.target.updateMatrixWorld();
    Object.assign(sky.shadow.camera, { left: -radius, right: radius, top: radius, bottom: -radius, near: 0.5, far: deep + 5 });
    sky.shadow.camera.updateProjectionMatrix();
    sky.shadow.normalBias = (1.5 * 2 * radius) / SKY_SIZE;
    depthBias(sky.shadow);
  }
}

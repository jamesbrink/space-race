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
/** Where across the fine map (0 its middle, 1 its edge) the far one comes in, from and to. */
const BAND = [0.78, 0.96] as const;

// The shader. Two directional lights with shadows are the Sun and this: the first reads both maps, the second gives nothing.
/** three's loop over the directional lights, as lights_fragment_begin has it: each light's shadow, then its light. */
const LOOP =
  /#if defined\( USE_SHADOWMAP \) && \( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS \)\s+directionalLightShadow = directionalLightShadows\[ i \];\s+directLight\.color[^\n]+\n\s+#endif\s+RE_Direct\([^\n]+\n/;
const found = LOOP.exec(THREE.ShaderChunk.lights_fragment_begin)?.[0];
const CASCADED = /* glsl */ `
		#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS == 2
			#if UNROLLED_LOOP_INDEX == 0
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
if (found) THREE.ShaderChunk.lights_fragment_begin = THREE.ShaderChunk.lights_fragment_begin.replace(found, CASCADED);
else console.warn('shadows.ts: three’s directional light loop is not as it was: the far shadow map will not be read');

type ShadowMap = THREE.WebGLRenderer['shadowMap'];

export class FarShadow {
  /** The light the map belongs to: in the scene after the Sun, giving no light. Its target is its own child of the scene too. */
  readonly light = new THREE.DirectionalLight(0x000000, 0);
  private readonly map: ShadowMap;
  private readonly sun: THREE.DirectionalLight;
  private readonly cover: () => THREE.Box3 | null;
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
    shadow.needsUpdate = false;
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
    // a texel and a half off the surface, and a depth bias to match (as the Sun's own map, stage.ts fitShadows)
    light.shadow.normalBias = 1.5 * texel;
    light.shadow.bias = -Math.max(0.0002, radius / 40000);
  }
}

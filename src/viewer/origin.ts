import * as THREE from 'three';

/**
 * Eye-relative drawing: a floating origin.
 *
 * The GPU works in 32-bit floats, which step in 1 mm at 10 km, 3 cm at 500 km and half a metre at
 * the Earth's radius. A matrix uploaded with such a translation in it (three's `modelMatrix`, and
 * through it a shadow's lookup, a reflection's direction, any shader that wants a world position)
 * lands on a different step each frame as things move: shadows crawl and surfaces shimmer. The
 * view itself is safe (three multiplies the view and model matrices in JavaScript, in doubles),
 * but nothing else is.
 *
 * So nothing is drawn where it is. Positions live in doubles in JavaScript, in the scene's own
 * frame, which is fixed to the Earth (today a site's frame, metres; one day the Earth-centred
 * one): `position`, `matrixWorld`, a ray's hit, a box, all of it, at every moment the page's code
 * can see. Only for the draw is the whole scene moved by minus the eye, so that every matrix the
 * GPU is given is relative to the eye, where floats are fine, and then put back. The scene is not
 * turned, only moved: its axes are the Earth's, so a thing standing on the ground has the same
 * matrix every frame.
 *
 * What the draw needs besides is put right here as well: the cutaway's planes (they are in the
 * scene's frame), each shadow's lookup matrix, which three only makes when it draws the shadow
 * map, and a hemisphere light, whose position three reads as a direction from the origin. A shader that wants a position in the scene's frame adds `uOrigin` back (as surface.ts
 * does): the answer is as coarse as it always was, which is fine for grain and noise.
 *
 * Code that runs during the draw (onBeforeRender, a pass) and reads a world matrix gets an
 * eye-relative one: `absolute()` puts it back. Nothing else needs it.
 */

/** The eye, in the scene's frame, for shaders: add it to `modelMatrix * position` for a position in the scene's frame. */
export const uOrigin: THREE.IUniform<THREE.Vector3> = { value: new THREE.Vector3() };

let drawing = false;
const eye = new THREE.Vector3();
const shift = new THREE.Matrix4();

/**
 * Put a world matrix or point read during the draw (eye-relative) back into the scene's frame. At
 * any other time what is read is already there, and this leaves it alone. Returns its argument.
 */
export function absolute<T extends THREE.Matrix4 | THREE.Vector3>(m: T): T {
  if (!drawing) return m;
  if (m instanceof THREE.Matrix4) m.premultiply(shift.makeTranslation(eye));
  else m.add(eye);
  return m;
}

/** Light shadows as three keeps them: `matrix` takes a world position to the shadow map. */
type Shadowed = THREE.Light & { shadow: THREE.LightShadow };

export class Origin {
  /** Each shadow's lookup in the scene's frame, as of the last time its map was drawn. */
  private readonly shadows = new WeakMap<THREE.LightShadow, THREE.Matrix4>();
  private readonly lights: Shadowed[] = [];
  private readonly skies: { light: THREE.HemisphereLight; was: THREE.Vector3 }[] = [];
  private readonly m = new THREE.Matrix4();
  private readonly constants: number[] = [];

  /** `camera` must have no parent: its position is the eye. `planes` are clipping planes in the scene's frame. */
  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.Camera,
    private readonly planes: readonly THREE.Plane[],
  ) {}

  /** Off: draw where things are, as three does by default (for comparing the two: they must look the same). */
  enabled = true;

  /** Draw (`render` draws the scene through the camera, in as many passes as it likes) from the eye. */
  draw(render: () => void): void {
    if (!this.enabled) {
      uOrigin.value.set(0, 0, 0);
      render();
      return;
    }
    const { scene, camera } = this;
    eye.copy(camera.position);
    uOrigin.value.copy(eye);
    this.lights.length = 0;
    this.skies.length = 0;
    scene.traverseVisible((o) => {
      if ((o as Shadowed).castShadow && (o as Shadowed).shadow) this.lights.push(o as Shadowed);
      if ((o as THREE.HemisphereLight).isHemisphereLight) this.skies.push({ light: o as THREE.HemisphereLight, was: o.position.clone() });
    });
    const redrawn = this.renderer.shadowMap.needsUpdate || this.renderer.shadowMap.autoUpdate;
    scene.position.sub(eye);
    camera.position.sub(eye);
    camera.updateMatrixWorld();
    for (const { light } of this.skies) light.position.add(eye); // a direction, not a place: it must not move
    this.planes.forEach((p, i) => {
      this.constants[i] = p.constant;
      p.constant += p.normal.dot(eye);
    });
    // a shadow map not drawn this frame was drawn from another eye: its lookup is moved to this one
    if (!redrawn) for (const light of this.lights) this.lookup(light.shadow);
    drawing = true;
    try {
      render();
    } finally {
      drawing = false;
      scene.position.add(eye);
      camera.position.add(eye);
      camera.updateMatrixWorld();
      this.planes.forEach((p, i) => (p.constant = this.constants[i]!)); // as they were to the last bit, not shifted back
      for (const { light, was } of this.skies) light.position.copy(was);
      scene.updateMatrixWorld();
      // a shadow map drawn just now: remember its lookup in the scene's frame
      if (redrawn)
        for (const light of this.lights) {
          const kept = this.shadows.get(light.shadow) ?? new THREE.Matrix4();
          this.shadows.set(light.shadow, kept.copy(light.shadow.matrix).multiply(this.m.makeTranslation(-eye.x, -eye.y, -eye.z)));
        }
    }
  }

  /** Point a shadow's lookup, kept in the scene's frame, at positions relative to the eye. */
  private lookup(shadow: THREE.LightShadow): void {
    const kept = this.shadows.get(shadow);
    if (kept) shadow.matrix.copy(kept).multiply(this.m.makeTranslation(eye.x, eye.y, eye.z));
  }
}

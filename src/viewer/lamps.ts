import * as THREE from 'three';

/**
 * Lamps that light things. A model draws a floodlight as a lens of the material `lamp`; here
 * every such lens becomes a light after dark. One mesh may hold many lenses (a part's lamps are
 * one mesh), so the lenses are found by where their vertices gather, and each cluster of them
 * (the heads on one crossarm) is one spotlight, aimed the way its lenses face. By day the lights
 * are out and cost nothing.
 */

/** Lenses within this of each other are one fitting, metres. */
const FITTING = 3.2;
/** The most lights a scene is given: each one is work for every pixel. The largest fittings are kept. */
const MOST = 12;
/** The most room lights drawn at once (see `roomPool`). */
const ROOMS = 3;
/** A room keeps its light until another is this much nearer than the furthest lit one: the eye drifting between two does not flick it back and forth. */
const KEEP = 1.25;
/** Seconds for a room light to go out, or come on, when it is given to another room. */
const HANDOVER = 0.6;
/** Luminous intensity of one fitting, candela: a bank of 1,500 W incandescent floods is some hundred thousand; the scene's exposure at night is high, so far less is asked for. */
const CANDELA = 110;
/** A flood's beam: wide, soft-edged. */
const SPREAD = THREE.MathUtils.degToRad(48);

const isLamp = (name: string) => name === 'lamp' || name.startsWith('lamp-flood');

interface Fitting {
  at: THREE.Vector3;
  facing: THREE.Vector3;
  lenses: number;
}

/**
 * A lamp the model describes for itself: a lens mesh (or its node) with `candela` and `spread`
 * (degrees, the whole beam), as a searchlight is. A real searchlight is thousands of times a
 * flood; the scene's night exposure is set for floods, so a described lamp is given at most this
 * many floods' worth (spread over a cone a fraction of a flood's), which keeps its beam the brightest thing there without burning out the frame.
 */
const STRONGEST = 6;
/** The narrowest beam drawn, degrees, whole beam. */
const MIN_BEAM = 7;
const FLOOD_CANDELA = 1e5;
/** How much of a searchlight's front glass is seen by day: enough to carry the sky's glint, little enough to see the mirror through. */
const GLASS_OPACITY = 0.35;
const described = (o: THREE.Object3D): { candela: number; spread: number } | null => {
  for (let at: THREE.Object3D | null = o; at; at = at.parent) {
    const candela = Number(at.userData.candela);
    if (candela > 0) return { candela, spread: Number(at.userData.spread) || 48 };
    if (at.parent?.type === 'Scene') break;
  }
  return null;
};

/** The fittings in one mesh, in the mesh's own frame. */
function fittings(mesh: THREE.Mesh): Fitting[] {
  const position = mesh.geometry.getAttribute('position');
  const normal = mesh.geometry.getAttribute('normal');
  if (!position || !normal) return [];
  const found: Fitting[] = [];
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    n.fromBufferAttribute(normal, i);
    let fitting = found.find((f) => f.at.distanceTo(p) < FITTING);
    if (!fitting) found.push((fitting = { at: p.clone(), facing: new THREE.Vector3(), lenses: 0 }));
    // the running middle of what has gathered here
    fitting.at.multiplyScalar(fitting.lenses / (fitting.lenses + 1)).addScaledVector(p, 1 / (fitting.lenses + 1));
    fitting.facing.add(n);
    fitting.lenses++;
  }
  return found.filter((f) => f.facing.lengthSq() > 1e-6);
}

export class Lamps {
  private readonly lights: THREE.SpotLight[] = [];
  /** Each light's fitting: the mesh it belongs to and where on it, so the light can follow hardware that moves. */
  private readonly homes: { mesh: THREE.Mesh; fitting: Fitting; strength: number }[] = [];
  /** Room lights: a point light at each `Light_<room>` empty a model carries, following it. */
  private readonly rooms: { at: THREE.Object3D; intensity: number; reach: number }[] = [];
  /**
   * The room lights drawn: a few, given to the rooms nearest the eye. Every light is work for
   * every pixel of the scene, so a site's dozen rooms cannot all be lit at once; and the number
   * must not change, or every material is built again. Only rooms the eye could be near matter.
   */
  private readonly roomPool: THREE.PointLight[] = [];
  /** Which room each pooled light is lighting, which it is to light, and how far up it is (0 to 1). */
  private readonly given: { room: number; want: number; level: number }[] = [];
  private handedAt = 0;
  private readonly lenses = new Set<THREE.MeshStandardMaterial>();
  /** The front glass of searchlights: glass by day (the mirror behind it and the sky on it), the arc's glow after dark. */
  private readonly fronts = new Set<THREE.MeshStandardMaterial>();
  private level = -1;

  /**
   * A searchlight's front is a sheet of glass over a mirror, and by day, with the arc out, that is
   * what is seen: the sky glancing off it and the bright bowl inside. Drawn as an opaque glowing
   * disc it read as a white plate. It is made a clear, glossy pane once, and `set` turns it from
   * glass to glow as night falls (opacity and emission only, which need no new shader).
   */
  private glass(material: THREE.MeshStandardMaterial): void {
    if (this.fronts.has(material)) return;
    this.fronts.add(material);
    material.color.setRGB(0.04, 0.045, 0.05);
    material.roughness = 0.04;
    material.metalness = 0;
    material.transparent = true;
    material.depthWrite = false;
    material.opacity = GLASS_OPACITY;
    material.emissiveIntensity = 0;
    material.needsUpdate = true;
  }
  private exposure = 1;

  /**
   * Find the lamps under `root` and make a light for each fitting, kept in `scene`. A light is
   * not hung on its mesh: that mesh may be a level of detail that is not being drawn, and a light
   * under something hidden is out. `place()` moves the lights to where their fittings are.
   */
  add(root: THREE.Object3D, scene: THREE.Object3D): void {
    const all: { mesh: THREE.Mesh; fitting: Fitting; own: { candela: number; spread: number } | null }[] = [];
    root.traverse((o) => {
      if (o.name.startsWith('Light_') && !(o as THREE.Mesh).isMesh) {
        // in the scene, not under the empty: the empty may be in a level of detail not being drawn
        this.rooms.push({ at: o, intensity: Number(o.userData.intensity) || 6, reach: Number(o.userData.reach) || 8 });
        while (this.roomPool.length < Math.min(ROOMS, this.rooms.length)) {
          const light = new THREE.PointLight(0xfff1d6, 0, 8, 2);
          scene.add(light);
          this.roomPool.push(light);
          this.given.push({ room: -1, want: -1, level: 0 });
          this.settled = false;
        }
        return;
      }
      const mesh = o as THREE.Mesh;
      const material = (mesh.userData.real ?? mesh.material) as THREE.MeshStandardMaterial | undefined;
      if (!mesh.isMesh || !material || Array.isArray(material) || !isLamp(material.name)) return;
      const own = described(mesh);
      if (own) this.glass(material);
      else this.lenses.add(material);
      // The site builders draw a lens as the inside face of the lamp's bowl (lamp_head, searchlight:
      // `flip=True`), so its normals face into the housing; the light goes the other way.
      // (a lens built facing out says so, `lens_out`, and shines along its own normals)
      const out = Boolean(mesh.userData.lens_out ?? mesh.parent?.userData.lens_out);
      for (const fitting of fittings(mesh)) {
        if (!out) fitting.facing.negate();
        all.push({ mesh, fitting, own });
      }
    });
    // what describes itself comes first (a searchlight is one lens, not a bank), then the biggest banks
    all.sort((a, b) => Number(Boolean(b.own)) - Number(Boolean(a.own)) || b.fitting.lenses - a.fitting.lenses);
    for (const { mesh, fitting, own } of all.slice(0, Math.max(0, MOST - this.lights.length))) {
      const strength = own ? Math.min(STRONGEST, own.candela / FLOOD_CANDELA) : 1;
      // (a searchlight's own beam is a degree or two; drawn that narrow its spot is a few pixels that
      // sparkle as the view moves, so it is drawn no narrower than a crew would defocus it to flood a vehicle)
      const cone = own ? THREE.MathUtils.degToRad(Math.max(own.spread, MIN_BEAM) / 2) : SPREAD;
      const light = new THREE.SpotLight(own ? 0xf4f6ff : 0xffe2b0, 0, own ? 600 : 140, cone, own ? 0.35 : 0.7, own ? 1.2 : 1.6);
      fitting.facing.normalize();
      light.visible = false;
      scene.add(light, light.target);
      this.lights.push(light);
      this.homes.push({ mesh, fitting, strength });
    }
    this.level = -1;
    this.place();
  }

  /**
   * Light the lenses under `root` without making lights for them: a coarser level of detail of
   * something `add` has had, whose lenses must glow (and a searchlight's front be glass) as the
   * finer level's do, while its lights are the finer level's.
   */
  glow(root: THREE.Object3D): void {
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      const material = (mesh.userData.real ?? mesh.material) as THREE.MeshStandardMaterial | undefined;
      if (!mesh.isMesh || !material || Array.isArray(material) || !isLamp(material.name)) return;
      if (described(mesh)) this.glass(material);
      else this.lenses.add(material);
    });
    this.level = -1; // (so the next `set` reaches them)
  }

  /** How many lights there are: spotlights at fittings, and room lights. */
  get count(): number {
    return this.lights.length + this.roomPool.length;
  }

  /** Put every light where its fitting is now: call when hardware that carries lamps has moved. */
  place(): void {
    this.lights.forEach((light, i) => {
      const { mesh, fitting } = this.homes[i]!;
      mesh.updateWorldMatrix(true, false);
      light.position.copy(fitting.at).applyMatrix4(mesh.matrixWorld);
      light.target.position.copy(fitting.at).addScaledVector(fitting.facing, 10).applyMatrix4(mesh.matrixWorld);
    });
    this.near(this.eye, true);
  }

  private readonly eye = new THREE.Vector3(1e9, 0, 0);
  /** Where each room was when the lights were last handed round, and whether that left nothing still to do (`near`). */
  private readonly where: THREE.Vector3[] = [];
  private settled = false;

  /**
   * Give the room lights to the rooms nearest `eye`. A light handed to another room goes out over
   * a moment and comes on there, and a room keeps its light until another is clearly nearer, so
   * nothing is seen to switch. True if that changed what is lit.
   */
  near(eye: THREE.Vector3, moved = false): boolean {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.handedAt) / 1000);
    this.handedAt = now;
    let still = this.settled && !moved && this.eye.equals(eye);
    this.eye.copy(eye);
    if (!this.rooms.length) return false;
    // where each room is now (kept, not made each frame), and whether any has moved
    const where = this.where;
    this.rooms.forEach((r, i) => {
      r.at.updateWorldMatrix(true, false);
      const e = r.at.matrixWorld.elements;
      const p = (where[i] ??= new THREE.Vector3(Number.NaN));
      if (p.x !== e[12] || p.y !== e[13] || p.z !== e[14]) still = false;
      p.set(e[12]!, e[13]!, e[14]!);
    });
    // Nothing more to do where the last call left every light with its room, fully on or out, and neither the eye
    // nor a room has moved since: the same question has the same answer.
    if (still) return false;
    const far = this.rooms.map((_, i) => where[i]!.distanceTo(eye));
    const order = far.map((_, i) => i).sort((a, b) => far[a]! - far[b]!);
    const nearest = order.slice(0, this.roomPool.length);
    const edge = far[nearest[nearest.length - 1]!]! * KEEP;
    // the rooms to light: those already lit that are still near enough, then the nearest others
    const keep = this.given.map((g) => (g.want >= 0 && far[g.want]! <= edge ? g.want : -1));
    const others = nearest.filter((r) => !keep.includes(r));
    for (const [i, g] of this.given.entries()) g.want = keep[i]! >= 0 ? keep[i]! : (others.shift() ?? -1);
    let changed = false;
    this.roomPool.forEach((light, i) => {
      const g = this.given[i]!;
      const step = dt / HANDOVER;
      const level = g.room === g.want ? Math.min(1, g.level + step) : Math.max(0, g.level - step);
      if (g.room !== g.want && level === 0) g.room = g.want; // out: it may move
      if (level !== g.level) changed = true;
      g.level = level;
      const room = this.rooms[g.room];
      if (!room) return;
      if (light.position.distanceToSquared(where[g.room]!) > 1e-6) changed = true;
      light.position.copy(where[g.room]!);
      light.distance = room.reach;
      light.intensity = room.intensity * g.level;
    });
    this.settled = !changed && this.given.every((g) => g.room === g.want);
    return changed;
  }

  /** Take the lights out of the scene: the flight they belonged to has gone. */
  clear(): void {
    for (const light of this.lights) {
      light.removeFromParent();
      light.target.removeFromParent();
    }
    for (const light of this.roomPool) light.removeFromParent();
  }

  /** How dark it is, 0 by day to 1 at night. True if what is lit changed. */
  set(night: number, exposure = 1): boolean {
    // followed closely: a lamp that came on in steps would be seen stepping as dusk falls quickly
    const level = THREE.MathUtils.clamp(night, 0, 1);
    if (Math.abs(level - this.level) < 0.002 && Math.abs(exposure - this.exposure) < 0.004 * exposure) return false;
    this.level = level;
    this.exposure = exposure;
    this.lights.forEach((light, i) => {
      light.visible = level > 0; // out by day: a light that is off is still work, one that is not there is none
      light.intensity = CANDELA * this.homes[i]!.strength * level;
    });
    // a lit lens glows whether or not it is night; after dark it is the brightest thing there
    // ...but no brighter on the screen at night than by day. The night's exposure is several
    // times the day's, and a lens a pixel or two across, eight times over-bright, is a spark
    // that comes and goes with every move of the camera: the lamps looked as if they flickered.
    for (const lens of this.lenses) lens.emissiveIntensity = (0.6 + 1.0 * level) / Math.max(1, exposure / 0.8);
    // (a searchlight's arc is struck only after dark: until then its front is glass)
    for (const front of this.fronts) {
      front.opacity = GLASS_OPACITY + (1 - GLASS_OPACITY) * level;
      front.emissiveIntensity = (1.6 * level) / Math.max(1, exposure / 0.8);
    }
    return true;
  }
}

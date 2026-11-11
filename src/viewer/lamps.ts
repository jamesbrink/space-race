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
const MOST = 16;
/** Luminous intensity of one fitting, candela: a bank of 1,500 W incandescent floods is some hundred thousand; the scene's exposure at night is high, so far less is asked for. */
const CANDELA = 380;
/** A flood's beam: wide, soft-edged. */
const SPREAD = THREE.MathUtils.degToRad(48);

const isLamp = (name: string) => name === 'lamp' || name.startsWith('lamp-flood');

interface Fitting {
  at: THREE.Vector3;
  facing: THREE.Vector3;
  lenses: number;
}

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
  private readonly homes: { mesh: THREE.Mesh; fitting: Fitting }[] = [];
  private readonly lenses = new Set<THREE.MeshStandardMaterial>();
  private level = -1;
  private exposure = 1;

  /**
   * Find the lamps under `root` and make a light for each fitting, kept in `scene`. A light is
   * not hung on its mesh: that mesh may be a level of detail that is not being drawn, and a light
   * under something hidden is out. `place()` moves the lights to where their fittings are.
   */
  add(root: THREE.Object3D, scene: THREE.Object3D): void {
    const all: { mesh: THREE.Mesh; fitting: Fitting }[] = [];
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      const material = (mesh.userData.real ?? mesh.material) as THREE.MeshStandardMaterial | undefined;
      if (!mesh.isMesh || !material || Array.isArray(material) || !isLamp(material.name)) return;
      this.lenses.add(material);
      for (const fitting of fittings(mesh)) all.push({ mesh, fitting });
    });
    all.sort((a, b) => b.fitting.lenses - a.fitting.lenses);
    for (const { mesh, fitting } of all.slice(0, Math.max(0, MOST - this.lights.length))) {
      const light = new THREE.SpotLight(0xffe2b0, 0, 140, SPREAD, 0.7, 1.6);
      fitting.facing.normalize();
      light.visible = false;
      scene.add(light, light.target);
      this.lights.push(light);
      this.homes.push({ mesh, fitting });
    }
    this.level = -1;
    this.place();
  }

  /** Put every light where its fitting is now: call when hardware that carries lamps has moved. */
  place(): void {
    this.lights.forEach((light, i) => {
      const { mesh, fitting } = this.homes[i]!;
      mesh.updateWorldMatrix(true, false);
      light.position.copy(fitting.at).applyMatrix4(mesh.matrixWorld);
      light.target.position.copy(fitting.at).addScaledVector(fitting.facing, 10).applyMatrix4(mesh.matrixWorld);
    });
  }

  /** Take the lights out of the scene: the flight they belonged to has gone. */
  clear(): void {
    for (const light of this.lights) {
      light.removeFromParent();
      light.target.removeFromParent();
    }
  }

  /** How dark it is, 0 by day to 1 at night. True if what is lit changed. */
  set(night: number, exposure = 1): boolean {
    // followed closely: a lamp that came on in steps would be seen stepping as dusk falls quickly
    const level = THREE.MathUtils.clamp(night, 0, 1);
    if (Math.abs(level - this.level) < 0.004 && Math.abs(exposure - this.exposure) < 0.02 * exposure) return false;
    this.level = level;
    this.exposure = exposure;
    for (const light of this.lights) {
      light.visible = level > 0; // out by day: a light that is off is still work, one that is not there is none
      light.intensity = CANDELA * level;
    }
    // a lit lens glows whether or not it is night; after dark it is the brightest thing there
    // ...but no brighter on the screen at night than by day. The night's exposure is several
    // times the day's, and a lens a pixel or two across, eight times over-bright, is a spark
    // that comes and goes with every move of the camera: the lamps looked as if they flickered.
    for (const lens of this.lenses) lens.emissiveIntensity = (0.6 + 1.0 * level) / Math.max(1, exposure / 0.8);
    return true;
  }
}

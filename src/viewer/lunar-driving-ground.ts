import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ROVER_SITES, type RoverSite } from '../world/lunar-terrain.ts';
import { disposeTree } from './dispose.ts';
import { landerAt, landerPose, lunarGround } from './lunar/ground.ts';
import { type LunarSetting, lunarSetting } from './lunar/setting.ts';

/**
 * The rover's gallery scene's ground (ui/rover.ts `RoverDrive`): the lunar setting (lunar/setting.ts), with a state of
 * its own (the gallery shares nothing with the site's stage but code: gallery.md), at the instant the rover-site table
 * gives (world/lunar-rover-sites.json `sunAt`), and the LM standing on it. In the rover's frame: the origin where the
 * rover was parked, the grids' centre (lunar-sites.json `centre`, east of the LM), +X east, +Y up, +Z south.
 */
export interface LunarDrivingGround {
  /** The ground, the LM and the Sun's light, in the rover's frame. */
  group: THREE.Group;
  /** The setting it is (its sky: `backdrop`; its light and exposure). */
  setting: LunarSetting;
  height(x: number, z: number): number;
  blocked(x: number, z: number): boolean;
  radius: number;
  /** The stones and the Sun's shadow are laid round a place. */
  follow(x: number, z: number): void;
  /** Where the eye is (in the rover's frame): true while something of the far ground is still coming in. */
  attend(eye: THREE.Vector3): boolean;
  dispose(): void;
}

export async function lunarDrivingGround(
  site: RoverSite,
  renderer: THREE.WebGLRenderer,
  signal?: AbortSignal,
): Promise<LunarDrivingGround> {
  const def = ROVER_SITES[site];
  const base = import.meta.env.BASE_URL;
  const lander = landerAt(site)!;
  const [data, lm] = await Promise.all([
    lunarGround(site, signal),
    fetch(base + lander.url, { signal }).then((res) => {
      if (!res.ok) throw new Error(`Could not load ${lander.url} (${res.status})`);
      return res.arrayBuffer();
    }),
  ]);
  signal?.throwIfAborted();
  const draco = new DRACOLoader().setDecoderPath(`${base}draco/`);
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const group = new THREE.Group();
  let setting: LunarSetting | null = null;
  try {
    const model = (await loader.parseAsync(lm, '')).scene;
    signal?.throwIfAborted();
    setting = lunarSetting(renderer, { launch: def.sunAt }, data);
    const s = setting;
    const near = s.lunar.near;
    // the rover's frame is the setting's moved to where the rover was parked
    const centre = data.site.centre;
    const ground = new THREE.Group();
    ground.position.x = -centre;
    // (the whole Moon beyond draws itself in both looks: setting.selfDrawn, which the scene adds apart from the looks)
    ground.add(s.floor!, ...s.scenery);
    // The LM on its pads, on the frame's origin (the plane its pads stand on: SiteDef), turned and tipped as it stood at rest
    // (the site's `rest`: ground.ts landerPose; its pads set on this ground by the stay on the Moon, app/surface.ts, not here)
    const pose = landerPose(lander.rest, [], () => 0);
    model.rotation.set(pose.attitude.roll, pose.rotationY, pose.attitude.pitch, 'YZX');
    const unloaded = new Set(lander.unloaded);
    model.traverse((node) => {
      if (unloaded.has(node.name) || node.name.includes('ProbeHinge')) node.visible = false;
      if ((node as THREE.Mesh).isMesh) node.castShadow = node.receiveShadow = true;
    });
    ground.add(model);
    group.add(ground);
    const sun = new THREE.DirectionalLight(s.sunColor, s.sunIntensity);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 0.5, far: 110 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.normalBias = 0.015;
    const fill = new THREE.HemisphereLight(s.fill[0], s.fill[1], s.fill[2]);
    group.add(sun, sun.target, fill);
    const follow = (x: number, z: number): void => {
      near.follow(x + centre, z);
      sun.target.position.set(x, near.height(x + centre, z), z);
      sun.position.copy(sun.target.position).addScaledVector(s.sunDir, 65);
    };
    follow(0, 0);
    const eyeAt = new THREE.Vector3();
    return {
      group,
      setting: s,
      radius: 9000,
      height: (x, z) => near.height(x + centre, z),
      follow,
      blocked: (x, z) => Math.hypot(x + centre, z) < 6.7,
      attend: (eye) => s.attend?.(eyeAt.copy(eye).setX(eye.x + centre)) ?? false,
      dispose() {
        sun.shadow.dispose();
        disposeTree(model);
        s.release?.();
        disposeTree(s.backdrop.scene);
      },
    };
  } catch (error) {
    disposeTree(group);
    setting?.release?.();
    throw error;
  } finally {
    draco.dispose();
  }
}

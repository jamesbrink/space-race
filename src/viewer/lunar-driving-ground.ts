import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { cross, DEG, dot, type Vec3 } from '../world/frames.ts';
import { LunarTerrain, ROVER_SITES, type RoverSite, TERRAIN_INTERVALS, TERRAIN_SPACING } from '../world/lunar-terrain.ts';
import { fromMoon, fromSelenographic } from '../world/moon.ts';
import { julianDate, terrestrialTime } from '../world/time.ts';
import { disposeTree } from './dispose.ts';
import { lunarRockShape } from './moonrocks.ts';

export interface LunarDrivingGround {
  group: THREE.Group;
  height(x: number, z: number): number;
  blocked(x: number, z: number): boolean;
  radius: number;
  follow(x: number, z: number): void;
  dispose(): void;
}

/** Mipmapped soil grain below the stereo camera's 2 m resolution. Fixed in local metres as the rover moves. */
function soil() {
  const size = 128;
  const pixels = new Uint8Array(size * size * 4);
  let seed = 1971;
  for (let i = 0; i < pixels.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const grey = 155 + (seed >>> 26);
    pixels.set([grey, grey, grey, 255], i);
  }
  const grain = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.magFilter = THREE.LinearFilter;
  grain.minFilter = THREE.LinearMipmapLinearFilter;
  grain.generateMipmaps = true;
  grain.colorSpace = THREE.SRGBColorSpace;
  grain.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ color: 0xb7b4b0, map: grain, roughness: 1 });
}

/** Sub-wheel gravel is estimated. Each 16 m cell uses a fixed seed, so the same stones are there on the return trip. */
function gravel(terrain: LunarTerrain) {
  const span = 16,
    cells = 5,
    perCell = 42;
  const geometry = lunarRockShape(1);
  geometry.computeVertexNormals();
  const mesh = new THREE.InstancedMesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: 0x8d8985, roughness: 1 }),
    cells * cells * perCell,
  );
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const pose = new THREE.Object3D();
  let lastX = Infinity,
    lastZ = Infinity;
  function follow(x: number, z: number) {
    const cx = Math.floor(x / span),
      cz = Math.floor(z / span);
    if (cx === lastX && cz === lastZ) return;
    lastX = cx;
    lastZ = cz;
    let index = 0;
    for (let j = cz - 2; j <= cz + 2; j++) {
      for (let i = cx - 2; i <= cx + 2; i++) {
        let seed = (Math.imul(i, 73856093) ^ Math.imul(j, 19349663) ^ 1971) >>> 0;
        const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
        for (let k = 0; k < perCell; k++) {
          const px = (i + next()) * span,
            pz = (j + next()) * span;
          const size = 0.018 + 0.06 * next() ** 3;
          pose.position.set(px, terrain.height(px, pz), pz);
          pose.rotation.set(next(), next() * 2 * Math.PI, next());
          pose.scale.set(size * 1.3, size * 0.7, size);
          pose.updateMatrix();
          mesh.setMatrixAt(index++, pose.matrix);
        }
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  return { mesh, follow };
}

function surface(terrain: LunarTerrain, level: number, material: THREE.Material) {
  const step = TERRAIN_SPACING[level]!;
  const n = TERRAIN_INTERVALS;
  const half = n / 2;
  const hole = level ? (half * TERRAIN_SPACING[level - 1]!) / step : 0;
  const side = n + 1;
  const geo = new THREE.BufferGeometry();
  const pos = [],
    normal = [],
    uv = [],
    indices = [];
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const x = (i - half) * step;
      const z = (j - half) * step;
      pos.push(x, terrain.levels[level]![j * side + i]!, z);
      const dx = terrain.height(x - step, z) - terrain.height(x + step, z);
      const dz = terrain.height(x, z - step) - terrain.height(x, z + step);
      const length = Math.hypot(dx, 2 * step, dz);
      normal.push(dx / length, (2 * step) / length, dz / length);
      uv.push(x / 3, z / 3);
      if (i === n || j === n || (i >= half - hole && j >= half - hole && i < half + hole && j < half + hole)) continue;
      const a = j * side + i;
      indices.push(a, a + side, a + 1, a + 1, a + side, a + side + 1);
    }
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices);
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  return mesh;
}

export async function lunarDrivingGround(site: RoverSite, signal?: AbortSignal): Promise<LunarDrivingGround> {
  const def = ROVER_SITES[site];
  const base = import.meta.env.BASE_URL;
  const buffer = async (url: string) => {
    const res = await fetch(base + url, { signal });
    if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
    return res.arrayBuffer();
  };
  const [heights, lm] = await Promise.all([buffer(`lunar/${site}.terrain.bin`), buffer(def.lander)]);
  const draco = new DRACOLoader().setDecoderPath(`${base}draco/`);
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const group = new THREE.Group();
  try {
    const lander = (await loader.parseAsync(lm, '')).scene;
    group.add(lander);
    signal?.throwIfAborted();
    const terrain = new LunarTerrain(heights);
    const material = soil();
    for (let i = 0; i < TERRAIN_SPACING.length; i++) group.add(surface(terrain, i, material));

    const stones = gravel(terrain);
    group.add(stones.mesh);
    const lx = -12;
    // Set the four pads onto their mean local slope. Quadrant I and the rover pallet have been unloaded.
    const span = 4.4;
    const nx = terrain.height(lx - span, 0) - terrain.height(lx + span, 0);
    const nz = terrain.height(lx, -span) - terrain.height(lx, span);
    lander.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(nx, span * 2, nz).normalize());
    // The mesh's +X points through the forward hatch; the local terrain's +X is east.
    if ('landerBearing' in def) lander.rotateY((90 - def.landerBearing) * DEG);
    lander.position.set(lx, terrain.height(lx, 0), 0);
    const unloaded = new Set([
      'LMRover',
      'LMRoverPallet',
      'LMRetroreflector',
      'LMFarUV',
      'LMScienceBay',
      ...('unloaded' in def ? def.unloaded : []),
    ]);
    lander.traverse((node) => {
      if (unloaded.has(node.name) || node.name.includes('ProbeHinge')) node.visible = false;
      if ((node as THREE.Mesh).isMesh) node.castShadow = node.receiveShadow = true;
    });

    const [lat, lon] = def.landing as [number, number];
    const sunlight = fromMoon(terrestrialTime(julianDate(def.sunAt))).sun;
    const up = fromSelenographic(lon, lat);
    const east: Vec3 = [-Math.sin(lon * DEG), Math.cos(lon * DEG), 0];
    const north = cross(up, east);
    const direction = new THREE.Vector3(dot(sunlight, east), dot(sunlight, up), -dot(sunlight, north)).normalize();
    const sun = new THREE.DirectionalLight(0xfffaf0, 3.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 0.5, far: 110 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.normalBias = 0.015;
    group.add(sun, sun.target, new THREE.HemisphereLight(0x656572, 0x928982, 0.45));
    function follow(x: number, z: number) {
      stones.follow(x, z);
      sun.target.position.set(x, terrain.height(x, z), z);
      sun.position.copy(sun.target.position).addScaledVector(direction, 65);
    }
    follow(0, 0);
    return {
      group,
      radius: 9000,
      height: (x, z) => terrain.height(x, z),
      follow,
      blocked: (x, z) => Math.hypot(x - lx, z) < 6.7,
      dispose() {
        sun.shadow.dispose();
        disposeTree(group);
      },
    };
  } catch (error) {
    disposeTree(group);
    throw error;
  } finally {
    draco.dispose();
  }
}

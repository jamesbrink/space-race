import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { NOISE } from './space';

/**
 * Cape Canaveral round Launch Complex 5, May 1961, as scenery: enough of the place that the
 * pad is somewhere. Everything here is laid out on the compass, in metres from pad 5: +X is
 * east (the Atlantic), -Z north. The pad model has its own frame (the capsule's hatch on +X,
 * the service structure's rails along Z), which lies at an angle to the compass; COMPASS turns
 * the one into the other, and the whole site is turned by it.
 *
 * What is placed from a source (the site plan in TM X-53107 Figure 7-6 and mapped outlines of
 * what survives; see sites/lc-5.md): the sea to the east, the rail line on 025 degrees, pad 6
 * 520 ft along it, the blockhouse 351 ft away on 348 degrees. What is impression: the
 * lighthouse's exact bearing, the roads, and Missile Row's towers up the coast, which are there
 * to say "there were a dozen more pads this way", not to map them.
 */

/** The pad model's frame on the compass: its +X (the hatch) faces 295 degrees, west-north-west. Radians about the vertical. */
export const COMPASS = THREE.MathUtils.degToRad(205);
const COS = Math.cos(COMPASS);
const SIN = Math.sin(COMPASS);
/** A point on the compass, as the pad model sees it. */
const toPad = (x: number, z: number): [number, number] => [x * COS + z * SIN, -x * SIN + z * COS];
/** A direction on the compass (bearing in degrees), as a point `distance` metres along it. */
const bearing = (degrees: number, distance: number): [number, number] => {
  const a = THREE.MathUtils.degToRad(degrees);
  return [distance * Math.sin(a), -distance * Math.cos(a)];
};
const RAIL = 25; // the structure's track runs 025/205 degrees, through pads 5 and 6 and on to complex 26
const PAD6 = bearing(RAIL, 158.5);
const BLOCKHOUSE = bearing(348, 107);
const APRON = bearing(295, 31); // where the stub road leaves the hardstand, on the hatch side

const SHORE = 330; // metres east of the pad where scrub gives way to beach
const SURF = 410; // and beach to water
const FAR = 7000;

/** Sand tracks, as [x0, z0, x1, z1, half-width]. Drawn in the terrain's shader: no geometry to fight with. */
const TRACKS: [number, number, number, number, number][] = [
  [...bearing(RAIL + 180, 95), ...bearing(RAIL, 520), 4.2], // the rail line's ballast
  [...APRON, ...bearing(295, 78), 3.4], // the stub road off the hardstand
  [...bearing(295, 78), BLOCKHOUSE[0] - 26, BLOCKHOUSE[1] + 4, 3.2], // and round to the blockhouse
  [-260, 118, 300, 118, 4.0], // the road along the complex's south side
  [118, 118, 250, -420, 3.2], // Lighthouse Road
  [-140, 118, -140, -260, 3.2],
  [-140, -214, 0, -214, 3.2],
];

function terrain(groundY: number): { mesh: THREE.Mesh; tick: (dt: number) => void } {
  const time = { value: 0 };
  const material = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.uniforms.uTracks = { value: TRACKS.map((t) => new THREE.Vector4(t[0], t[1], t[2], t[3])) };
    shader.uniforms.uTrackWidth = { value: TRACKS.map((t) => t[4]) };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCape;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCape = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        varying vec3 vCape;
        uniform float uTime;
        uniform vec4 uTracks[${TRACKS.length}];
        uniform float uTrackWidth[${TRACKS.length}];
        ${NOISE}
        float capeSea;
        float segment(vec2 p, vec4 s) {
          vec2 a = s.xy, b = s.zw, ab = b - a;
          return length(p - a - ab * clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0));
        }`,
      )
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
        vec2 pad = vCape.xz;                              // the pad's own frame
        vec2 p = vec2(pad.x * ${COS.toFixed(5)} - pad.y * ${SIN.toFixed(5)}, pad.x * ${SIN.toFixed(5)} + pad.y * ${COS.toFixed(5)});   // on the compass
        float big = fbm(vec3(p * 0.0035, 1.0));           // the lie of the land: hundreds of metres
        float mid = fbm(vec3(p * 0.028, 7.0));            // thickets and clearings
        float fine = noise(vec3(p * 1.3, 3.0));           // individual plants
        vec3 sand = vec3(0.50, 0.45, 0.33), dry = vec3(0.30, 0.29, 0.15);
        vec3 scrub = vec3(0.085, 0.15, 0.05), thicket = vec3(0.035, 0.07, 0.03);
        float veg = smoothstep(0.40, 0.60, big * 0.55 + mid * 0.45);
        vec3 c = mix(mix(sand, dry, smoothstep(0.3, 0.62, mid)), mix(scrub, thicket, smoothstep(0.3, 0.8, fine)), veg);
        // ground cleared and graded round the pad
        float apron = 1.0 - smoothstep(42.0, 70.0, max(abs(pad.x), abs(pad.y)) + 14.0 * (mid - 0.5));
        c = mix(c, sand * (0.9 + 0.25 * fine), apron * 0.9);
        // crushed-shell tracks, a little paler down the wheel lines
        float track = 0.0;
        for (int i = 0; i < ${TRACKS.length}; i++) {
          float d = segment(p, uTracks[i]) + 1.2 * (mid - 0.5);
          track = max(track, 1.0 - smoothstep(uTrackWidth[i] - 0.7, uTrackWidth[i] + 0.9, d));
        }
        c = mix(c, vec3(0.56, 0.53, 0.45) * (0.88 + 0.2 * fine), track);
        // the shore wanders; beach, then water that darkens as it deepens
        float shore = p.x + 26.0 * (fbm(vec3(p.y * 0.006, 0.0, 4.0)) - 0.5);
        float beach = smoothstep(${SHORE.toFixed(1)} - 14.0, ${SHORE.toFixed(1)} + 6.0, shore);
        c = mix(c, vec3(0.66, 0.60, 0.46) * (0.92 + 0.14 * fine), beach);
        float lap = 3.5 * sin(uTime * 0.5 + p.y * 0.035) + 2.0 * sin(uTime * 0.31 + p.y * 0.011);
        capeSea = smoothstep(${SURF.toFixed(1)} - 2.0, ${SURF.toFixed(1)} + 2.0, shore + lap);
        float depth = clamp((shore - ${SURF.toFixed(1)}) / 900.0, 0.0, 1.0);
        vec3 water = mix(vec3(0.07, 0.30, 0.30), vec3(0.012, 0.075, 0.16), pow(depth, 0.45));
        // lines of surf rolling in, breaking up along their length
        float roll = fract((shore + lap) * 0.035 - uTime * 0.06);
        float foam = smoothstep(0.86, 1.0, roll) * (1.0 - smoothstep(0.0, 110.0, shore - ${SURF.toFixed(1)}))
                   * smoothstep(0.35, 0.6, noise(vec3(p * 0.16, uTime * 0.25)));
        foam = max(foam, (1.0 - smoothstep(0.0, 5.0, abs(shore + lap - ${SURF.toFixed(1)}))) * 0.85);
        c = mix(c, mix(water, vec3(0.92), foam), capeSea);
        diffuseColor.rgb = c;`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        /* glsl */ `#include <roughnessmap_fragment>
        roughnessFactor = mix(1.0, 0.16, capeSea);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `#include <normal_fragment_maps>
        // chop: tilt the water's normal with moving noise, so the Sun breaks up on it
        vec2 w = vCape.xz * 0.22 + vec2(uTime * 0.35, uTime * 0.2);
        vec3 chop = vec3(noise(vec3(w, 0.0)) - 0.5, 0.0, noise(vec3(w, 9.0)) - 0.5);
        normal = normalize(normal + capeSea * 0.22 * (viewMatrix * vec4(chop, 0.0)).xyz);`,
      );
  };
  // Many small triangles, not two big ones: depth interpolated across a kilometres-long
  // triangle is too coarse to keep anything near the ground from flickering.
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2 * FAR, 2 * FAR, 180, 180), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = groundY;
  return { mesh, tick: (dt) => (time.value += dt) };
}

function scrub(groundY: number): THREE.InstancedMesh {
  const count = 6000;
  // One clump of saw palmetto, turned and stretched differently each time it is used: a low
  // mass of shade with fans of blades arching out of it. Up close it has leaves; from across
  // the pad it is a dark tuft with a lit top, which is what the Cape's scrub looks like.
  const positions: number[] = [];
  const colours: number[] = [];
  const indices: number[] = [];
  let r = 7;
  const noise = () => ((r = (r * 16807) % 2147483647) - 1) / 2147483646;
  const push = (p: THREE.Vector3, shade: number, dry: number) => {
    positions.push(p.x, p.y, p.z);
    colours.push(shade * (0.95 + 0.5 * dry), shade * (1 + 0.15 * dry), shade * (0.7 - 0.2 * dry));
    return positions.length / 3 - 1;
  };
  // the shaded mass underneath
  const core = mergeVertices(new THREE.IcosahedronGeometry(1, 1).deleteAttribute('normal').deleteAttribute('uv'));
  const corePos = core.getAttribute('position');
  const v = new THREE.Vector3();
  const base = positions.length / 3;
  for (let i = 0; i < corePos.count; i++) {
    v.fromBufferAttribute(corePos, i).multiply(new THREE.Vector3(0.42, 0.2, 0.42));
    if (v.y < 0) v.y *= 0.3;
    push(v, 0.3 + 0.35 * Math.max(0, v.y), 0);
  }
  for (const i of core.getIndex()!.array) indices.push(base + i);
  // fans: each a stem rising from the mass and a spray of blades folding outward from its tip
  for (let f = 0; f < 15; f++) {
    const yaw = (f / 15) * Math.PI * 2 * 2.4 + noise() * 0.6; // wound round twice and a bit, so no two fans line up
    const lean = noise() ** 0.8; // some stand straight up in the middle, most reach outward
    const tip = new THREE.Vector3(Math.cos(yaw) * lean * 0.42, 0.16 + (1 - lean) * 0.4 + noise() * 0.14, Math.sin(yaw) * lean * 0.42);
    // a fan faces up and out: nearly flat to the sky in the middle, tilted over at the edge
    const out = new THREE.Vector3(Math.cos(yaw) * (0.35 + lean), 1.1 - 0.6 * lean, Math.sin(yaw) * (0.35 + lean)).normalize();
    const side = new THREE.Vector3(-Math.sin(yaw), 0, Math.cos(yaw));
    const up = new THREE.Vector3().crossVectors(side, out);
    const dry = noise() < 0.2 ? 0.8 : noise() * 0.25; // a few fronds have gone brown
    // its stalk, from the heart of the clump
    const root = new THREE.Vector3(tip.x * 0.25, 0.04, tip.z * 0.25);
    const s0 = push(root.clone().addScaledVector(side, 0.02), 0.4, dry);
    const s1 = push(root.clone().addScaledVector(side, -0.02), 0.4, dry);
    const s2 = push(tip.clone().addScaledVector(side, 0.015), 0.6, dry);
    const s3 = push(tip.clone().addScaledVector(side, -0.015), 0.6, dry);
    indices.push(s0, s2, s1, s1, s2, s3);
    for (let b = -4; b <= 4; b++) {
      const a = b * 0.27 + (noise() - 0.5) * 0.1;
      const dir = out.clone().multiplyScalar(Math.cos(a)).addScaledVector(side, Math.sin(a));
      const across = new THREE.Vector3().crossVectors(dir, up).normalize();
      const length = (0.42 + noise() * 0.2) * (1 - 0.035 * b * b);
      const mid = tip
        .clone()
        .addScaledVector(dir, length * 0.55)
        .addScaledVector(up, 0.06);
      const end = tip
        .clone()
        .addScaledVector(dir, length)
        .addScaledVector(up, -0.03 - noise() * 0.07); // the tip droops a little
      const i0 = push(tip, 0.55, dry);
      const i1 = push(mid.clone().addScaledVector(across, 0.055), 0.95, dry);
      const i2 = push(mid.clone().addScaledVector(across, -0.055), 0.8, dry);
      const i3 = push(end, 1.15, dry);
      indices.push(i0, i1, i2, i1, i3, i2);
    }
  }
  const mound = new THREE.BufferGeometry();
  mound.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  mound.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  mound.setIndex(indices);
  mound.computeVertexNormals();
  const mesh = new THREE.InstancedMesh(
    mound,
    new THREE.MeshStandardMaterial({ roughness: 1, vertexColors: true, side: THREE.DoubleSide }),
    count,
  );
  let seed = 23;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const m = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    s = new THREE.Vector3(),
    p = new THREE.Vector3();
  const colour = new THREE.Color();
  const onTrack = (x: number, z: number) =>
    TRACKS.some(([x0, z0, x1, z1, w]) => {
      const dx = x1 - x0,
        dz = z1 - z0;
      const t = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / (dx * dx + dz * dz)));
      return Math.hypot(x - x0 - dx * t, z - z0 - dz * t) < w + 2.5;
    });
  for (let i = 0; i < count; ) {
    // dense near the pad, where it gives the ground its depth; thinning with distance
    const r = 52 + 760 * rand() ** 1.6,
      a = rand() * Math.PI * 2;
    const x = r * Math.cos(a),
      z = r * Math.sin(a);
    const [px, pz] = toPad(x, z);
    if (Math.max(Math.abs(px), Math.abs(pz)) < 42 || x > SHORE - 30 || onTrack(x, z)) continue; // the hardstand
    if (Math.abs(px) < 11 && pz > -100 && pz < 560) continue; // the rail line
    if (Math.hypot(x - PAD6[0], z - PAD6[1]) < 48 || Math.hypot(x - BLOCKHOUSE[0], z - BLOCKHOUSE[1]) < 26) continue;
    // saw palmetto and sea grape: knee to head high, wider than tall, in clumps
    const w = 0.5 + rand() * rand() * 2.2;
    s.set(w, w * (0.75 + rand() * 0.5), w * (0.7 + rand() * 0.6));
    q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, rand() * 6.28);
    mesh.setMatrixAt(i, m.compose(p.set(x, groundY + s.y * 0.04, z), q, s));
    const g = 0.1 + rand() * 0.11;
    mesh.setColorAt(i, colour.setRGB(g * (0.5 + rand() * 0.45), g, g * (0.3 + rand() * 0.3)));
    i++;
  }
  mesh.castShadow = false;
  return mesh;
}

const concrete = new THREE.MeshStandardMaterial({ color: 0x8d8a82, roughness: 0.95 });
const paint = (hex: number) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.6 });

function boxAt(w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y + h / 2, z);
  return mesh;
}

/** The blockhouse pads 5 and 6 shared: a low concrete bunker behind an earth bank. */
function blockhouse(groundY: number): THREE.Group {
  const g = new THREE.Group();
  g.add(boxAt(22, 4.6, 14, 0, groundY, 0, concrete), boxAt(16, 1.6, 9, 0, groundY + 4.6, 0, concrete));
  g.add(boxAt(26, 0.5, 18, 0, groundY, 0, concrete));
  for (const x of [-6, 0, 6]) g.add(boxAt(3.2, 1.0, 0.25, x, groundY + 2.4, -7.05, paint(0x10151a)));
  for (const x of [-5, 5]) g.add(boxAt(0.3, 3.4, 0.3, x, groundY + 6.2, 0, paint(0x55585c)));
  g.position.set(BLOCKHOUSE[0], 0, BLOCKHOUSE[1]);
  g.rotation.y = THREE.MathUtils.degToRad(-RAIL - 90); // its long side along the rail line, its windows toward the pads
  return g;
}

/** Pad 6: the other half of the complex, empty today. */
function padSix(groundY: number): THREE.Group {
  const g = new THREE.Group();
  g.add(boxAt(62, 1.2, 62, 0, groundY - 0.75, 0, concrete));
  g.add(boxAt(5.5, 0.14, 5.5, 0, groundY + 0.45, 0, paint(0x1c1a19)));
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.6, 1.5, 24, 1, true), paint(0x3d4246));
  ring.position.set(0, groundY + 0.45 + 0.75 + 0.14, 0);
  g.add(ring);
  g.position.set(PAD6[0], 0, PAD6[1]);
  g.rotation.y = THREE.MathUtils.degToRad(-RAIL); // square to the rails, like pad 5
  return g;
}

/** Cape Canaveral Light: black and white bands, 46 m, the Cape's landmark since 1868. */
function lighthouse(groundY: number): THREE.Group {
  const g = new THREE.Group();
  const bands = 6,
    h = 39 / bands;
  for (let i = 0; i < bands; i++) {
    const r0 = 4.0 - (i * 2.1) / bands,
      r1 = 4.0 - ((i + 1) * 2.1) / bands;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, h, 24), paint(i % 2 ? 0xe9e6dc : 0x121212));
    band.position.y = groundY + h * (i + 0.5);
    g.add(band);
  }
  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, 0.4, 24), paint(0x121212));
  gallery.position.y = groundY + 39.2;
  const lantern = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.5, 3.4, 12),
    new THREE.MeshStandardMaterial({ color: 0xbfd6d8, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.55 }),
  );
  lantern.position.y = groundY + 41.1;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.9, 2.2, 12), paint(0x121212));
  cap.position.y = groundY + 43.9;
  g.add(gallery, lantern, cap);
  g.position.set(250, 0, -420);
  return g;
}

/** Missile Row: the service towers of the Atlas and Titan pads, marching up the coast into the haze. */
function missileRow(groundY: number): THREE.Group {
  const g = new THREE.Group();
  const red = paint(0x7a2018),
    white = paint(0xdedbd2);
  let seed = 5;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < 11; i++) {
    const z = -900 - i * 520 - rand() * 160,
      x = 150 + rand() * 120;
    const h = 38 + rand() * 22,
      w = 9 + rand() * 5;
    const tower = new THREE.Group();
    for (const [dx, dz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const)
      tower.add(boxAt(1.0, h, 1.0, (dx * w) / 2, groundY, (dz * w) / 2, red));
    for (let y = 6; y < h; y += 6) tower.add(boxAt(w + 1, 0.7, w + 1, 0, groundY + y, 0, y % 12 ? white : red));
    tower.add(boxAt(w * 1.9, 2.2, w * 0.7, w * 0.45, groundY + h, 0, red));
    if (i % 3 !== 1) {
      const rocket = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, h * 0.62, 12), white);
      rocket.position.set(w * 1.15, groundY + h * 0.31 + 3, 0);
      tower.add(rocket, boxAt(8, 3, 8, w * 1.15, groundY, 0, concrete));
    }
    tower.position.set(x, 0, z);
    tower.rotation.y = rand() * 0.8 - 0.4;
    g.add(tower);
  }
  return g;
}

/** Everything round the pad. `groundY` is the terrain's height; the pad's own surface is 0. */
export function buildCape(groundY: number): { floor: THREE.Mesh; scenery: THREE.Object3D[]; tick: (dt: number) => void } {
  const { mesh, tick } = terrain(groundY);
  const plants = scrub(groundY);
  plants.receiveShadow = true;
  const built = [blockhouse(groundY), padSix(groundY), lighthouse(groundY), missileRow(groundY)];
  for (const group of built)
    group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = true;
    });
  // laid out on the compass, then turned as one to lie round the pad model
  const site = new THREE.Group();
  site.add(plants, ...built);
  site.rotation.y = COMPASS;
  return { floor: mesh, scenery: [site], tick };
}

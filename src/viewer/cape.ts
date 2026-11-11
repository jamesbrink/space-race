import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildCape1961, CLEARINGS, COAST, RIVER, shoreAt } from './cape1961';
import { NOISE } from './space';

/**
 * Cape Canaveral round Launch Complex 5, May 1961, as scenery: enough of the place that the
 * pad is somewhere. Everything here is laid out on the compass, in metres from pad 5: +X is
 * east (the Atlantic), -Z north. The pad model has its own frame (the capsule's hatch on +X,
 * the service structure's rails along Z), which lies at an angle to the compass; COMPASS turns
 * the one into the other, and the whole site is turned by it.
 *
 * The complex itself (the blockhouse, pad 6, the track, the huts, the parked cars) is not here: it
 * is modelled in Blender like the pad, in the pad's frame (Flight.surroundings; sites/lc-5.md).
 * Nor is the rest of the Cape: the other complexes, the lighthouse and the line of the shore are
 * cape1961.ts, each at its published place. This file is the ground itself: the land and the sea
 * either side of that shore, the scrub, the rail line on 025 degrees, and the shell roads round
 * the blockhouse where the July 1961 photographs show them. No road is drawn that is not in a
 * photograph, so the roads here end where the photographs do.
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
const FT = 0.3048;
/** A point given in the pad model's own frame, in feet as its scripts have it (x toward the hatch side, y along the rails to the south-south-west), on the compass. */
const site = (x: number, y: number): [number, number] => [x * FT * COS + y * FT * SIN, x * FT * SIN - y * FT * COS];
const RAIL = 25; // the structure's track runs 025/205 degrees, through pads 5 and 6 and on to complex 26
const PAD6 = bearing(RAIL, 158.5);
/** Ground the modelled complex stands on, where no scrub grows: [x, y, radius] in the pad model's feet. */
const KEPT: [number, number, number][] = [
  [212, -283, 104], // the blockhouse, the ready rooms and their paving
  [238, -192, 30], // the hut behind it and its transformer yard
  [300, -155, 34], // the hut by the road
  [137, -107, 26], // the generator building
  [50, -262, 24], // the shed by the track
  [-92, -148, 38], // the cable racks
  [-148, -140, 14], // the scaffold stair
];
/** Strips kept clear the same way: the two cable trenches and the turnout's curve, as [x0, y0, x1, y1, half-width] in feet. */
const STRIPS: [number, number, number, number, number][] = [
  [100, -99, 178, -241, 10],
  [100, -421, 178, -281, 10],
  [-10, -185, -40, -290, 26],
  [-40, -290, -95, -360, 26],
  [-95, -360, -150, -410, 26],
];

/** The neighbouring pads near enough for their cleared ground to show: within 2.5 km. */
const NEAR = CLEARINGS.filter(([x, z]) => Math.hypot(x, z) < 2500);
const BEACH = 80; // metres of sand between the scrub and the surf line
const FAR = 11000; // how far the ground is drawn: past Complex 34, 9.2 km up the coast

/** Sand tracks, as [x0, z0, x1, z1, half-width]. Drawn in the terrain's shader: no geometry to fight with. */
const TRACKS: [number, number, number, number, number][] = [
  [...bearing(RAIL + 180, 95), ...bearing(RAIL, 700), 4.2], // the rail line's ballast, on past pad 6 to Complex 26's two pads
  [...site(166, 0), ...site(340, 0), 4.0], // the stub road from the foot of the apron's ramp
  [...site(340, 586), ...site(340, -900), 3.6], // the road behind the blockhouse, parallel to the track (F16_016)
  [...site(340, -215), ...site(293, -215), 3.2], // the drive in to the blockhouse,
  [...site(293, -215), ...site(293, -349), 3.4], // past its back door,
  [...site(293, -349), ...site(340, -349), 3.2], // and out again
  [...site(276, -147), ...site(340, -147), 4.4], // the hut's parking
];

function terrain(groundY: number, cel: { value: number }): { mesh: THREE.Mesh; tick: (dt: number) => void } {
  const time = { value: 0 };
  const material = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.uniforms.uCel = cel;
    shader.uniforms.uTracks = { value: TRACKS.map((t) => new THREE.Vector4(t[0], t[1], t[2], t[3])) };
    shader.uniforms.uTrackWidth = { value: TRACKS.map((t) => t[4]) };
    shader.uniforms.uCoast = { value: COAST.map(([n, x]) => new THREE.Vector2(n, x)) };
    shader.uniforms.uRiver = { value: RIVER.map(([n, x]) => new THREE.Vector2(n, x)) };
    shader.uniforms.uClear = { value: NEAR.map(([x, z, r]) => new THREE.Vector3(x, z, r)) };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCape;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCape = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        varying vec3 vCape;
        uniform float uTime;
        uniform float uCel;    // 1 in the cel look: the same land in a few flat colours with hard edges
        uniform vec4 uTracks[${TRACKS.length}];
        uniform float uTrackWidth[${TRACKS.length}];
        ${NOISE}
        uniform vec2 uCoast[${COAST.length}];   // the Atlantic shore: (metres north, metres east) of the pad, northward
        uniform vec2 uRiver[${RIVER.length}];   // the Banana River's east shore, the same way
        uniform vec3 uClear[${NEAR.length}];    // ground kept clear round the neighbouring pads: (x, z, radius)
        float capeSea;
        float coastAt(float north) {
          float x = uCoast[0].y;
          for (int i = 0; i < ${COAST.length - 1}; i++)
            if (north >= uCoast[i].x) x = mix(uCoast[i].y, uCoast[i + 1].y, clamp((north - uCoast[i].x) / (uCoast[i + 1].x - uCoast[i].x), 0.0, 1.0));
          return x;
        }
        float riverAt(float north) {
          float x = uRiver[0].y;
          for (int i = 0; i < ${RIVER.length - 1}; i++)
            if (north >= uRiver[i].x) x = mix(uRiver[i].y, uRiver[i + 1].y, clamp((north - uRiver[i].x) / (uRiver[i + 1].x - uRiver[i].x), 0.0, 1.0));
          return x;
        }
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
        fine = mix(fine, 0.5, uCel);
        vec3 sand = vec3(0.50, 0.45, 0.33), dry = vec3(0.30, 0.29, 0.15);
        vec3 scrub = vec3(0.085, 0.15, 0.05), thicket = vec3(0.035, 0.07, 0.03);
        float veg = smoothstep(0.40, 0.60, big * 0.55 + mid * 0.45);
        vec3 c = mix(mix(sand, dry, smoothstep(0.3, 0.62, mid)), mix(scrub, thicket, smoothstep(0.3, 0.8, fine)), veg);
        c = mix(c, mix(sand, vec3(0.12, 0.22, 0.07), step(0.5, veg)), uCel);
        // ground cleared and graded round the pad
        float apron = 1.0 - smoothstep(42.0, 70.0, max(abs(pad.x), abs(pad.y)) + 14.0 * (mid - 0.5));
        apron = max(apron, 1.0 - smoothstep(42.0, 62.0, max(abs(pad.x), abs(pad.y - 158.5)) + 12.0 * (mid - 0.5)));   // pad 6
        apron = max(apron, 1.0 - smoothstep(36.0, 58.0, length(pad - vec2(66.0, 84.0)) + 14.0 * (mid - 0.5)));        // the blockhouse
        for (int i = 0; i < ${NEAR.length}; i++) apron = max(apron, 1.0 - smoothstep(uClear[i].z, uClear[i].z + 18.0, length(p - uClear[i].xy) + 12.0 * (mid - 0.5)));
        apron = mix(apron, step(0.5, apron), uCel);
        c = mix(c, sand * (0.9 + 0.25 * fine), apron * 0.9);
        // crushed-shell tracks, a little paler down the wheel lines
        float track = 0.0;
        for (int i = 0; i < ${TRACKS.length}; i++) {
          float d = segment(p, uTracks[i]) + 1.2 * (mid - 0.5);
          track = max(track, 1.0 - smoothstep(uTrackWidth[i] - 0.7, uTrackWidth[i] + 0.9, d));
        }
        track = mix(track, step(0.5, track), uCel);
        c = mix(c, vec3(0.56, 0.53, 0.45) * (0.88 + 0.2 * fine), track);
        // the shore wanders; beach, then water that darkens as it deepens
        // the shore is the Cape's own (cape1961.ts), and wanders a little about it; shore is metres seaward of the surf line
        float shore = p.x - coastAt(-p.y) + 26.0 * (fbm(vec3(p.y * 0.006, 0.0, 4.0)) - 0.5);
        float beach = smoothstep(-${BEACH.toFixed(1)} - 14.0, -${BEACH.toFixed(1)} + 6.0, shore);
        beach = mix(beach, step(0.5, beach), uCel);
        c = mix(c, vec3(0.66, 0.60, 0.46) * (0.92 + 0.14 * fine), beach);
        float lap = 3.5 * sin(uTime * 0.5 + p.y * 0.035) + 2.0 * sin(uTime * 0.31 + p.y * 0.011);
        capeSea = smoothstep(-2.0, 2.0, shore + lap);
        float depth = clamp(shore / 900.0, 0.0, 1.0);
        depth = mix(depth, pow(floor(pow(depth, 0.45) * 3.0 + 0.5) / 3.0, 2.22), uCel);   // the sea in bands
        vec3 water = mix(vec3(0.07, 0.30, 0.30), vec3(0.012, 0.075, 0.16), pow(depth, 0.45));
        // lines of surf rolling in, breaking up along their length
        float roll = fract((shore + lap) * 0.035 - uTime * 0.06);
        float foam = smoothstep(0.86, 1.0, roll) * (1.0 - smoothstep(0.0, 110.0, shore))
                   * smoothstep(0.35, 0.6, noise(vec3(p * 0.16, uTime * 0.25)));
        foam = max(foam, (1.0 - smoothstep(0.0, 5.0, abs(shore + lap))) * 0.85);
        foam = mix(foam, step(0.5, foam), uCel);
        c = mix(c, mix(water, vec3(0.92), foam), mix(capeSea, step(0.5, capeSea), uCel));
        // the Banana River behind the Cape: flat water, no surf
        float river = smoothstep(-3.0, 3.0, riverAt(-p.y) - p.x + 30.0 * (big - 0.5));
        river = mix(river, step(0.5, river), uCel);
        c = mix(c, vec3(0.06, 0.24, 0.26), river);
        capeSea = max(capeSea, river);
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
        normal = normalize(normal + (1.0 - uCel) * capeSea * 0.22 * (viewMatrix * vec4(chop, 0.0)).xyz);`,
      );
  };
  // Many small triangles, not two big ones: depth interpolated across a kilometres-long
  // triangle is too coarse to keep anything near the ground from flickering.
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2 * FAR, 2 * FAR, 260, 260), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = groundY;
  return { mesh, tick: (dt) => (time.value += dt) };
}

/** Within this far of the eye a plant is drawn frond by frond; beyond it, as one rounded tuft. Metres. */
const FRONDS_WITHIN = 260;
/** The plants are sorted into near and far again once the eye has moved this far. */
const RESORT = 35;

function scrub(groundY: number): {
  plants: THREE.InstancedMesh;
  tufts: THREE.InstancedMesh;
  /** Sort the plants into those drawn in full and those drawn as tufts, for an eye at (x, z) on the compass; `drawn` is the cel look, all tufts. */
  arrange: (x: number, z: number, drawn: boolean) => void;
} {
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
    if (Math.max(Math.abs(px), Math.abs(pz)) < 42 || onTrack(x, z)) continue; // the hardstand
    if (x > shoreAt(COAST, -z) - BEACH - 30 || x < shoreAt(RIVER, -z) + 30) continue; // the beach, the river
    if (NEAR.some(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) < cr + 6)) continue; // the neighbouring pads
    if (Math.abs(px) < 11 && pz > -100 && pz < 560) continue; // the rail line
    if (px > -18 && px < 0 && pz > 28 && pz < 130) continue; // the concrete road beside it
    if (Math.hypot(x - PAD6[0], z - PAD6[1]) < 48) continue;
    const fx = px / FT,
      fy = -pz / FT; // the pad model's feet
    if (KEPT.some(([kx, ky, kr]) => Math.hypot(fx - kx, fy - ky) < kr)) continue;
    if (
      STRIPS.some(([x0, y0, x1, y1, w]) => {
        const dx = x1 - x0,
          dy = y1 - y0;
        const t = Math.max(0, Math.min(1, ((fx - x0) * dx + (fy - y0) * dy) / (dx * dx + dy * dy)));
        return Math.hypot(fx - x0 - dx * t, fy - y0 - dy * t) < w;
      })
    )
      continue;
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
  // The same plants as a drawing would have them: one rounded tuft each, where the real look
  // has a clump of fronds. Same places, sizes and colours; only one of the two is ever shown.
  const tuft = mergeVertices(new THREE.IcosahedronGeometry(1, 1).deleteAttribute('normal').deleteAttribute('uv'));
  const at = tuft.getAttribute('position');
  for (let i = 0; i < at.count; i++) at.setXYZ(i, at.getX(i) * 0.5, Math.max(at.getY(i), -0.12) * 0.42 + 0.05, at.getZ(i) * 0.5);
  tuft.computeVertexNormals();
  const tufts = new THREE.InstancedMesh(tuft, new THREE.MeshStandardMaterial({ roughness: 1 }), count);
  tufts.castShadow = false;
  // Every plant's place and colour, kept apart from the two meshes: each plant is in one of them
  // at a time. A clump of fronds is 380 triangles and there are six thousand; drawn frond by
  // frond only near the eye, where fronds can be seen, the far ones cost a fifth as much.
  const places = Array.from({ length: count }, (_, i) => {
    const matrix = new THREE.Matrix4();
    const tone = new THREE.Color();
    mesh.getMatrixAt(i, matrix);
    mesh.getColorAt(i, tone);
    return { matrix, tone, x: matrix.elements[12]!, z: matrix.elements[14]! };
  });
  const arrange = (x: number, z: number, drawn: boolean) => {
    let near = 0;
    let far = 0;
    for (const place of places) {
      if (!drawn && Math.hypot(place.x - x, place.z - z) < FRONDS_WITHIN) {
        mesh.setMatrixAt(near, place.matrix);
        mesh.setColorAt(near++, place.tone);
      } else {
        tufts.setMatrixAt(far, place.matrix);
        // a tuft has one colour where the fronds had many lit faces: brighter, and brighter still as a drawing
        tufts.setColorAt(far++, colour.copy(place.tone).multiplyScalar(drawn ? 2.2 : 1.25));
      }
    }
    for (const [o, n] of [
      [mesh, near],
      [tufts, far],
    ] as const) {
      o.count = n;
      o.visible = n > 0;
      o.instanceMatrix.needsUpdate = true;
      if (o.instanceColor) o.instanceColor.needsUpdate = true;
      o.computeBoundingSphere();
    }
  };
  arrange(0, 0, false);
  return { plants: mesh, tufts, arrange };
}

/** Everything round the pad. `groundY` is the terrain's height; the pad's own surface is 0. */
export function buildCape(groundY: number): {
  floor: THREE.Mesh;
  scenery: THREE.Object3D[];
  tick: (dt: number) => void;
  /** Draw the land and its plants in full, or simplified for the cel look. */
  simplify: (on: boolean) => void;
  /** Where the eye is (world): what is near it is drawn in full. True if that changed what is drawn. */
  attend: (eye: THREE.Vector3) => boolean;
} {
  const cel = { value: 0 };
  const { mesh, tick } = terrain(groundY, cel);
  const { plants, tufts, arrange } = scrub(groundY);
  plants.receiveShadow = tufts.receiveShadow = true;
  const built = buildCape1961(groundY); // the other complexes and the lighthouse, where they stood
  // laid out on the compass, then turned as one to lie round the pad model
  const site = new THREE.Group();
  site.add(plants, tufts, ...built);
  site.rotation.y = COMPASS;
  const sorted = new THREE.Vector3(0, 0, 0); // where the eye was, on the compass, when the plants were last sorted
  const simplify = (on: boolean) => {
    cel.value = Number(on);
    arrange(sorted.x, sorted.z, on);
  };
  const eye = new THREE.Vector3();
  const attend = (at: THREE.Vector3) => {
    site.worldToLocal(eye.copy(at));
    if (Math.hypot(eye.x - sorted.x, eye.z - sorted.z) < RESORT) return false;
    sorted.copy(eye);
    arrange(eye.x, eye.z, cel.value > 0);
    return true;
  };
  return { floor: mesh, scenery: [site], tick, simplify, attend };
}

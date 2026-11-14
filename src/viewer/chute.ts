import * as THREE from 'three';
import type { ChuteDef } from '../types';
import type { ChuteMoment } from './ascent';

/**
 * A parachute as the hardware was, built from the flight's data (`Flight.flies.chutes`: diameter,
 * gores, colours, line and riser lengths, the reefed stage, each with its confidence). It knows
 * no flight.
 *
 * The cloth. A canopy of gores between radial seams, each gore billowed outward between its
 * seams, so the skirt is scalloped. Along a gore the cloth is cut by its kind (`bands`): a
 * ringsail's close rings over the crown and, below them, sails whose lower edge stands fuller
 * than the upper edge of the next, which opens a crescent between them that closes at the seams;
 * a ribbon parachute's ribbons, with open slots right across. There is a vent at the crown. The
 * filled shape is not a hemisphere (`profile`): a flatter crown, a full shoulder and a skirt
 * drawn in a little. The material is the scene's own lit one with one thing added: thin nylon
 * lets light through, so a side turned from a light glows with that light, tinted by the cloth.
 * It casts a shadow and is shaded by itself, and takes the scene's haze. The cel look draws the
 * same geometry in its own tones.
 *
 * The lines. One from each seam at the skirt to where they meet, and the riser from there to the
 * vehicle: straight, being under load, and drawn as ribbons that face the eye, as wide as they
 * are and never narrower than a pixel and a quarter, so they neither vanish nor shimmer.
 *
 * What it does is the simulator's, on the clock's seconds (`ChuteMoment.since`), never a timer:
 * thrown out, it pays out to line stretch (`stretch`), streams, fills over what is left of the
 * trajectory's `fills` (through the reefed stage, if it has one: `mouth`), and breathes. It
 * streams against the motion through the air of what it hangs from, which the simulator already
 * swings under it. After a landing flown by hand it lets its air go and settles on the surface
 * to one side, and stays there (the simulator has no wind to say which side).
 */

/** Filled, a canopy is about two thirds of its made diameter across: the usual proportion, not a measurement of any one. */
export const FILLED = 2 / 3;
/** How wide the mouth is while it streams, of its full width. */
export const STREAM = 0.04;
/** Seconds a canopy that tears takes to go from the mouth it had to a streamer: judged, not recorded. */
export const TEARS = 0.4;
/** Seconds it takes to let its air go and settle after a landing. */
export const COLLAPSE = 6;
/** How the crown is rounded: the cloth's turn from flat at the apex to upright at the shoulder goes as this power of the way there (1 is a hemisphere; more is a flatter crown and a fuller shoulder). */
const CROWN = 1.5;
/** Rows of vertices down one band of cloth, and columns across one gore. */
const ROWS = 4;
const COLS = 5;
/** Steps the cloth's line is worked out in. */
const STEPS = 96;
/** A suspension line's width and a riser's, m, and the least either is drawn, in pixels. Judged, not recorded. */
const LINE_WIDTH = 0.008;
const RISER_WIDTH = 0.03;
const LEAST_PIXELS = 1.25;
/** How much of the light falling on the far side of the cloth comes through it. Judged from photographs of nylon canopies against the Sun. */
const THROUGH = 0.55;
/** And how much more every part of the cloth has from the light going about inside the canopy, as a share of a light square on. Judged likewise. */
const INSIDE = 0.3;

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const smooth = (x: number): number => {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
};

/** The radius a crown of unit arc reaches: the integral of the cosine of its turn. */
const REACH = (() => {
  let sum = 0;
  for (let i = 0; i < 400; i++) sum += Math.cos((Math.PI / 2) * ((i + 0.5) / 400) ** CROWN) / 400;
  return sum;
})();

/**
 * How far open the mouth is, 0 to 1 of its full width, `since` seconds after it was thrown out, on a
 * parachute the simulator fills in `fills`. Until line stretch (`stretch`) it is a streamer. Then,
 * without a reefed stage, its area grows evenly to full at `fills`, so the width goes as the square
 * root. Reefed, the mouth comes to the reefed width in the first third of what is left of the
 * stage, is held there until it is let go (`reefed.until`, from when it was thrown out), and is
 * full at `fills`.
 */
export function mouth(def: Pick<ChuteDef, 'reefed' | 'stretch'>, since: number, fills: number): number {
  const stretch = Math.max(0, Math.min(def.stretch?.value ?? 0, fills * 0.9));
  if (!(since > stretch)) return STREAM;
  if (since >= fills) return 1;
  const reef = def.reefed;
  if (!reef || reef.until.value <= stretch || reef.until.value >= fills) {
    return STREAM + (1 - STREAM) * Math.sqrt((since - stretch) / (fills - stretch));
  }
  const held = Math.max(STREAM, Math.min(1, reef.mouth.value));
  if (since <= reef.until.value) return STREAM + (held - STREAM) * smooth((since - stretch) / ((reef.until.value - stretch) / 3));
  return held + (1 - held) * smooth((since - reef.until.value) / (fills - reef.until.value));
}

/** The mouth of a canopy that tore `torn` seconds ago with its mouth `open`: it lets its air go and streams. Whole (`torn` < 0), `open`. */
export function tornMouth(open: number, torn: number): number {
  return torn < 0 ? open : STREAM + (open - STREAM) * (1 - smooth(torn / TEARS));
}

/** How far out it has been paid, 0 to 1 of its lines' and riser's length, `since` seconds after it was thrown out. */
export function paid(def: Pick<ChuteDef, 'stretch'>, since: number): number {
  const stretch = def.stretch?.value ?? 0;
  return stretch > 0 ? clamp01(Math.max(since, 0) / stretch) : 1;
}

/**
 * The cloth's line from the apex to the skirt with the mouth `open` (0 to 1), as a table of
 * STEPS + 1 points evenly spaced along the cloth: distance from the axis and depth below the
 * apex, in made radii. The crown is a bubble wider than the mouth (as wide as the filled canopy
 * when the mouth is full), turning from flat at the apex to upright at its shoulder; what cloth
 * is left hangs from the shoulder as a sleeve drawn in to the mouth. The cloth is as long as it
 * is whatever the opening: each step is the same length.
 */
function line(open: number): Float64Array {
  const o = Math.max(open, 1e-3);
  const crown = FILLED * o ** 0.75;
  const arc = crown / REACH; // the cloth it takes to come round to upright
  const sleeve = Math.max(1e-6, 1 - arc);
  const lip = FILLED * o * 0.97; // the mouth's own radius: a full canopy's skirt is drawn in a little
  const lean = Math.asin(Math.min(0.95, Math.max(0, (crown - lip) / sleeve)));
  const out = new Float64Array((STEPS + 1) * 2);
  let r = 0;
  let y = 0;
  const h = 1 / STEPS;
  for (let i = 0; i < STEPS; i++) {
    const s = (i + 0.5) * h;
    // (the sleeve takes up its lean over its first fifth, so the shoulder is round, not a corner)
    const turn = s <= arc ? (Math.PI / 2) * (s / arc) ** CROWN : Math.PI / 2 + lean * (1 + 0.25 * (1 - smooth((s - arc) / (0.2 * sleeve))));
    r += Math.cos(turn) * h;
    y -= Math.sin(turn) * h;
    out[(i + 1) * 2] = Math.max(r, 0);
    out[(i + 1) * 2 + 1] = y;
  }
  return out;
}

/** A point of a `line` table at `s` (0 apex, 1 skirt). */
function on(table: Float64Array, s: number): [r: number, y: number] {
  const x = clamp01(s) * STEPS;
  const i = Math.min(STEPS - 1, Math.floor(x));
  const k = x - i;
  return [table[i * 2]! + (table[i * 2 + 2]! - table[i * 2]!) * k, table[i * 2 + 1]! + (table[i * 2 + 3]! - table[i * 2 + 1]!) * k];
}

/** Where the cloth is `s` of the way from the apex (0) to the skirt (1) with the mouth `open`: its distance from the axis and depth below the apex, in made radii. */
export function profile(open: number, s: number): [r: number, y: number] {
  return on(line(open), s);
}

/**
 * The bands of cloth down a gore, apex to skirt, for a cut: where each begins and ends on the
 * gore's middle line, in made radii, and where it ends at the seams (`close`). Between `to` and
 * the next band is open: right across for a ribbon, and for a ringsail only in the middle of the
 * gore, each band reaching the next at the seams (`close` is the next one's `from`), so the opening
 * is a crescent. `full`: how much fuller the band's lower edge stands than its upper.
 */
export function bands(cut: ChuteDef['cut']): { from: number; to: number; close: number; full: number }[] {
  const vent = 0.04;
  const out: { from: number; to: number; close: number; full: number }[] = [];
  const at = (i: number, n: number): number => vent + ((1 - vent) * i) / n;
  if (cut === 'ribbon') {
    const n = 8;
    for (let i = 0; i < n; i++) {
      const to = at(i + 0.68, n);
      out.push({ from: at(i, n), to, close: to, full: 0 });
    }
    return out;
  }
  // a solid canopy: one sheet of cloth from the vent to the skirt, no slots
  if (cut === 'solid') return [{ from: vent, to: 1, close: 1, full: 0 }];
  // a ringsail: close rings over the crown, then sails, each fuller at its lower edge, with crescents between
  const n = 12;
  for (let i = 0; i < n; i++) {
    const sail = i >= 4;
    const last = i === n - 1;
    out.push({ from: at(i, n), to: last ? 1 : at(i + (sail ? 0.8 : 0.95), n), close: last ? 1 : at(i + 1, n), full: sail ? 0.5 : 0 });
  }
  return out;
}

/** One colour's share of the canopy: the gores of that colour, and where on the canopy each of its vertices is. */
interface Panel {
  mesh: THREE.Mesh;
  /** For each vertex: its band's from, to, close and fullness, how far down the band (0 to 1), its gore, and how far across it (0 to 1). */
  at: Float32Array;
}
const STRIDE = 7;

const Y = new THREE.Vector3(0, 1, 0);

/** Thin nylon lets light through: the side turned from a light is lit by it too, tinted by the cloth. For three's lit materials, real and toon. */
function translucent(material: THREE.Material): void {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_end>',
      /* glsl */ `#include <lights_fragment_end>
      #if NUM_DIR_LIGHTS > 0
        for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
          // what comes straight through from behind (the weave scatters it: it wraps a little), and what comes back out of
          // the inside of a canopy that is lit within
          float behind = max(dot(-normal, directionalLights[i].direction) * 0.75 + 0.25, 0.0) + ${INSIDE.toFixed(2)};
          reflectedLight.directDiffuse += directionalLights[i].color * diffuseColor.rgb * diffuseColor.rgb * (${THROUGH.toFixed(2)} * behind * 0.3183);
        }
      #endif`,
    );
  };
  material.customProgramCacheKey = () => 'chute-cloth';
}

/** What makes a line a ribbon facing the eye: the vertex is moved off its line, across it on the screen, by half its width or half the least width. */
function ribbon(material: THREE.Material, size: THREE.Vector2): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSize = { value: size };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute vec3 aOther;\nattribute vec2 aSide;\nuniform vec2 uSize;\nvarying float vThin;',
      )
      .replace(
        '#include <project_vertex>',
        /* glsl */ `#include <project_vertex>
        {
          // A line that runs past the eye is cut at the near plane here, before anything is worked out on the screen: an end
          // behind the eye has no place on the screen (its w is nothing or less), and a ribbon made from one was a sheet
          // across the whole view, seen from close above the spacecraft with the riser going by. Both ends behind: not drawn.
          vec4 far = projectionMatrix * modelViewMatrix * vec4(aOther, 1.0);
          float nearW = projectionMatrix[3][2] / (projectionMatrix[2][2] - 1.0);
          vec4 here = gl_Position;
          if (here.w < nearW && far.w > nearW) here = mix(here, far, (nearW - here.w) / (far.w - here.w));
          if (far.w < nearW && here.w > nearW) far = mix(far, here, (nearW - far.w) / (here.w - far.w));
          if (here.w < nearW) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          else {
            gl_Position = here;
            vec2 along = (far.xy / far.w - here.xy / here.w) * uSize;
            float len = length(along);
            if (len > 1e-6) {
              vec2 across = vec2(-along.y, along.x) / len;
              // half its own width in pixels at this distance, or half the least: and one held at the least is drawn fainter by as
              // much as it is thinner than that, so forty-eight lines a kilometre off are a haze of cord, not a white cone
              float own = 0.5 * aSide.y * projectionMatrix[1][1] * uSize.y * 0.5 / here.w;
              float half_ = max(own, ${(LEAST_PIXELS / 2).toFixed(3)});
              vThin = clamp(own / half_, 0.12, 1.0);
              gl_Position.xy += across * aSide.x * half_ * 2.0 / uSize * here.w;
            }
          }
        }`,
      );
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvThin = 1.0;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vThin;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vThin;');
  };
  material.customProgramCacheKey = () => 'chute-line';
}

export class Chute {
  /** Stands at the attachment, its +Y along the lines. */
  readonly group = new THREE.Group();
  private readonly def: ChuteDef;
  private readonly node: THREE.Object3D;
  /** Where on the node it is made fast, in the node's own frame. */
  private readonly fast = new THREE.Vector3();
  private readonly crown = new THREE.Group();
  private readonly panels: Panel[] = [];
  private readonly lines: THREE.Mesh;
  private readonly lineColour: THREE.Color;
  private readonly size = new THREE.Vector2(1, 1);
  private readonly radius: number;
  private readonly gores: number;
  private shape = { open: -1, lay: -1, beat: -1 };
  /** The way it streamed when last in the air: where it starts to fall over from, and to which side. */
  private readonly along = new THREE.Vector3(0, 1, 0);

  /** `node`: the object the flight names (`ChuteDef.at`); the parachute is made fast at the middle of the top of its bounds. */
  constructor(def: ChuteDef, node: THREE.Object3D) {
    this.def = def;
    this.node = node;
    this.radius = def.diameter.value / 2;
    this.gores = Math.max(3, Math.round(def.gores.value));
    this.group.name = `Chute_${def.on}`;
    this.group.visible = false;

    // the top of the node, in its own frame, from its meshes' own matrices (wherever the node has been carried off to)
    const box = new THREE.Box3();
    node.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.boundingBox ?? mesh.geometry.computeBoundingBox();
      const to = new THREE.Matrix4();
      for (let p: THREE.Object3D | null = mesh; p && p !== node; p = p.parent) to.premultiply(p.matrix);
      box.union(mesh.geometry.boundingBox!.clone().applyMatrix4(to));
    });
    if (!box.isEmpty()) this.fast.set((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2);

    const colours = def.colours.value.length ? def.colours.value : ['#ffffff'];
    const cloth = bands(def.cut);
    colours.forEach((colour, c) => {
      const at: number[] = [];
      const index: number[] = [];
      for (let g = c; g < this.gores; g += colours.length) {
        for (const band of cloth) {
          const base = at.length / STRIDE;
          for (let i = 0; i < ROWS; i++)
            for (let j = 0; j < COLS; j++) at.push(band.from, band.to, band.close, band.full, i / (ROWS - 1), g, j / (COLS - 1));
          for (let i = 0; i < ROWS - 1; i++)
            for (let j = 0; j < COLS - 1; j++) {
              const [p, q] = [base + i * COLS + j, base + (i + 1) * COLS + j];
              index.push(p, q, p + 1, p + 1, q, q + 1);
            }
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((at.length / STRIDE) * 3), 3));
      // (its normals are worked out when it is first shaped; having the attribute from the start, it is drawn by the
      // shader `Stage.warm` built for it: a mesh with normals and one without are two shaders, and the second was
      // built as the parachute opened, with the page stopped for it)
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array((at.length / STRIDE) * 3), 3));
      geometry.setIndex(index);
      const material = new THREE.MeshStandardMaterial({
        name: `chute-cloth-${c}`,
        color: new THREE.Color(colour),
        roughness: 0.82,
        metalness: 0,
        side: THREE.DoubleSide, // both sides are seen: from above, and from the spacecraft looking up into it
      });
      // Its shadow is cast by the cloth turned from the light only (the gores are wound facing inward, so that is the far wall's
      // front): the lit sails then do not shade themselves in stripes, and the inside and the sea are shaded all the same.
      material.shadowSide = THREE.FrontSide;
      translucent(material);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `Chute_${def.on}_Cloth_${c}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true; // it shades itself: the inside is lit by what comes through the cloth and the slots
      mesh.frustumCulled = false; // it is reshaped as it fills: its first bounds say nothing
      mesh.raycast = () => {}; // cloth in the air is not picked or stood on
      this.crown.add(mesh);
      this.panels.push({ mesh, at: new Float32Array(at) });
    });
    this.group.add(this.crown);

    // the riser, then a line from where they meet to each seam at the skirt: each a ribbon of four vertices
    const count = 1 + this.gores;
    const lines = new THREE.BufferGeometry();
    const side = new Float32Array(count * 8);
    const index: number[] = [];
    for (let l = 0; l < count; l++) {
      const width = l === 0 ? RISER_WIDTH : LINE_WIDTH;
      // two vertices at each end; at the far end the line runs the other way on the screen, so the sides are named the other way round
      side.set([1, width, -1, width, -1, width, 1, width], l * 8);
      index.push(l * 4, l * 4 + 1, l * 4 + 2, l * 4 + 1, l * 4 + 3, l * 4 + 2);
    }
    lines.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 12), 3));
    lines.setAttribute('aOther', new THREE.Float32BufferAttribute(new Float32Array(count * 12), 3));
    lines.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 2));
    lines.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute(
        new Float32Array(count * 12).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)),
        3,
      ),
    );
    lines.setIndex(index);
    this.lineColour = new THREE.Color(0xe6e1d2);
    const cord = new THREE.MeshBasicMaterial({
      name: 'chute-line',
      color: this.lineColour.clone(),
      side: THREE.DoubleSide,
      transparent: true,
    });
    ribbon(cord, this.size);
    this.lines = new THREE.Mesh(lines, cord);
    this.lines.name = `Chute_${def.on}_Lines`;
    this.lines.frustumCulled = false;
    this.lines.raycast = () => {};
    this.lines.onBeforeRender = (renderer) => {
      renderer.getDrawingBufferSize(this.size);
    };
    this.group.add(this.lines);
  }

  /** Where it is made fast, in the frame of the node it is made fast to. */
  get anchor(): THREE.Vector3 {
    return this.fast;
  }

  /**
   * Draw it as it is at a moment (viewer/ascent.ts `chute`), or not at all (null). `light`: how bright the day is, 0 to
   * 1: the lines are drawn unlit, so they are dimmed by it.
   */
  set(m: ChuteMoment | null, light: number): void {
    this.group.visible = m !== null;
    if (!m) return;
    const { def, group, crown } = this;
    this.node.updateWorldMatrix(true, false);
    group.position.copy(this.fast).applyMatrix4(this.node.matrixWorld);
    group.scale.setScalar(m.seen);
    // (torn, it had the mouth it had filled to when it tore, and has let it go since)
    const open = tornMouth(mouth(def, m.torn >= 0 ? m.since - m.torn : m.since, m.fills), m.torn);
    const out = paid(def, m.since);
    const lay = m.down >= 0 ? smooth(m.down / COLLAPSE) : 0;
    const table = line(open);
    const R = this.radius;
    const lip = table[STEPS * 2]! * R;
    const depth = -table[STEPS * 2 + 1]! * R;
    // The lines are as long as they are: the wider the mouth, the nearer the skirt is to where they meet. Before line
    // stretch they are still paying out, and what is out of the pack is drawn.
    const riser = def.riser.value * out;
    const reach = riser + Math.sqrt(Math.max(0, def.lines.value ** 2 - lip ** 2)) * out;

    const up = m.up;
    if (m.down < 0) {
      // in the air: it streams against the motion of what it hangs from
      if (m.air.lengthSq() > 1) this.along.copy(m.air).normalize().negate();
      else this.along.copy(up);
      group.quaternion.setFromUnitVectors(Y, this.along);
      crown.quaternion.identity();
    } else {
      // Down: it lets its air go and falls over until the cloth is on the surface, where it turns to lie flat. To the
      // side it was already leaning to, which is downwind of its last motion; with none, to one side.
      const aside = this.along.clone().addScaledVector(up, -this.along.dot(up));
      if (aside.lengthSq() < 1e-4) aside.set(1, 0, 0).addScaledVector(up, -up.x);
      if (aside.lengthSq() < 1e-6) aside.set(0, 0, 1);
      aside.normalize();
      const sine = Math.max(-1, Math.min(1, (m.floor + 0.3 - group.position.y) / Math.max(reach, 1e-3)));
      const lying = aside.multiplyScalar(Math.sqrt(1 - sine * sine)).addScaledVector(up, sine);
      const from = new THREE.Quaternion().setFromUnitVectors(Y, this.along);
      group.quaternion.copy(from).slerp(new THREE.Quaternion().setFromUnitVectors(Y, lying), lay);
      const flat = group.quaternion.clone().invert().multiply(new THREE.Quaternion().setFromUnitVectors(Y, up));
      crown.quaternion.identity().slerp(flat, lay);
    }
    crown.position.set(0, reach, 0);

    // it breathes: the clock's seconds, in steps too small to see, and only while there is air in it
    const beat = lay < 1 ? Math.round(m.since * 30) / 30 : 0;
    if (Math.abs(open - this.shape.open) > 1e-4 || Math.abs(lay - this.shape.lay) > 1e-4 || beat !== this.shape.beat) {
      this.shape = { open, lay, beat };
      this.cut(table, open, lay, depth, beat);
    }
    this.string(table, lay, riser, depth);
    (this.lines.material as THREE.MeshBasicMaterial).color.copy(this.lineColour).multiplyScalar(Math.max(0.04, Math.min(1, light)));
  }

  /** Where the cloth is at `s` down a gore, in the crown's frame (the skirt's plane at 0, the apex above it), metres from the axis and up. */
  private cloth(table: Float64Array, lay: number, s: number, depth: number): [r: number, y: number] {
    const [r, y] = on(table, s);
    const R = this.radius;
    if (lay <= 0) return [r * R, y * R + depth];
    // settled: spread nearly to its made width on the surface, a hand's breadth of ripple in it, the crown the last to go down
    const flatR = 0.94 * s * R;
    const flatY = 0.1 + 0.08 * Math.sin(s * 13) + 0.5 * (1 - s) * (1 - lay);
    // (it comes down before it spreads: the air goes out of it as it falls over, and it lies out flat only at the end)
    const spread = lay ** 3;
    return [r * R * (1 - 0.35 * (lay - spread)) + (flatR - r * R) * spread, (y * R + depth) * (1 - lay * lay) + flatY * spread];
  }

  /** Put every vertex of the cloth where the opening has it. */
  private cut(table: Float64Array, open: number, lay: number, depth: number, beat: number): void {
    const half = Math.PI / this.gores;
    const R = this.radius;
    // breathing: the skirt works in and out a little, slower for a bigger canopy, and each gore a little out of step with the next
    const rate = 5 / Math.sqrt(Math.max(R, 0.5));
    const air = open * (1 - lay);
    for (const { mesh, at } of this.panels) {
      const position = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < position.count; i++) {
        const k = i * STRIDE;
        const [from, to, close, full, v, gore, u] = [at[k]!, at[k + 1]!, at[k + 2]!, at[k + 3]!, at[k + 4]!, at[k + 5]!, at[k + 6]!];
        const middle = 4 * u * (1 - u); // 0 at the seams, 1 on the gore's middle line
        const s = from + (to + (close - to) * (1 - middle) - from) * v;
        let [r, y] = this.cloth(table, lay, s, depth);
        const breath = 1 + air * s * s * (0.012 * Math.sin(beat * rate) + 0.006 * Math.sin(beat * rate * 1.7 + gore * 2.4));
        r *= breath;
        // the gore stands out from its seams: by the chord's own bow, by the cloth there is too much of when the mouth is narrow,
        // and a sail's lower edge by more than its upper
        const chord = r * Math.sin(half);
        const made = s * R * Math.sin(half);
        const spare = Math.sqrt(Math.max(0, made * made - chord * chord));
        const bow = Math.min(0.6 * r + 0.02, (0.2 * chord + 0.32 * spare) * (1 + full * v * v));
        r += bow * middle * (1 - 0.85 * lay);
        y += 0.06 * middle * lay; // (settled, the fluting is a ripple)
        const angle = ((gore + u) / this.gores) * Math.PI * 2;
        position.setXYZ(i, r * Math.cos(angle), y, r * Math.sin(angle));
      }
      position.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
    }
  }

  /** The lines: the riser up the axis, then one from its top to each seam of the skirt, wherever the crown has been turned to. */
  private string(table: Float64Array, lay: number, riser: number, depth: number): void {
    const position = this.lines.geometry.getAttribute('position') as THREE.BufferAttribute;
    const other = this.lines.geometry.getAttribute('aOther') as THREE.BufferAttribute;
    const [r, y] = this.cloth(table, lay, 1, depth);
    const p = new THREE.Vector3();
    const lay4 = (l: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number): void => {
      for (let k = 0; k < 2; k++) {
        position.setXYZ(l * 4 + k, ax, ay, az);
        other.setXYZ(l * 4 + k, bx, by, bz);
        position.setXYZ(l * 4 + 2 + k, bx, by, bz);
        other.setXYZ(l * 4 + 2 + k, ax, ay, az);
      }
    };
    lay4(0, 0, 0, 0, 0, riser, 0);
    for (let g = 0; g < this.gores; g++) {
      const angle = (g / this.gores) * Math.PI * 2;
      p.set(r * Math.cos(angle), y, r * Math.sin(angle))
        .applyQuaternion(this.crown.quaternion)
        .add(this.crown.position);
      lay4(1 + g, 0, riser, 0, p.x, p.y, p.z);
    }
    position.needsUpdate = true;
    other.needsUpdate = true;
  }

  dispose(): void {
    for (const { mesh } of this.panels) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.lines.geometry.dispose();
    (this.lines.material as THREE.Material).dispose();
  }
}

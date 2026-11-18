import * as THREE from 'three';
import { clone as cloneRigged } from 'three/addons/utils/SkeletonUtils.js';
import type { Run } from '../../sim/run.ts';
import { exitAreaOf } from '../../sim/staged.ts';
import type { Burns, Flight as FlightData, JetDef, ModelDef, SitedFlight } from '../../types.ts';
import { P0 } from '../../world/bodies.ts';
import type { Clock } from '../../world/clock.ts';
import { siteFrame, type Vec3 } from '../../world/frames.ts';
import { Ascent } from '../ascent.ts';
import type { Setting } from '../backdrops.ts';
import { BreakupFragment, type FragmentPiece, fragmentPieces, separableBranches } from '../breakup.ts';
import type { Cameras } from '../camera/index.ts';
import { ABOUT_PLACE, type Craft } from '../camera/rig.ts';
import { Chute } from '../chute.ts';
import type { Effects } from '../effects.ts';
import { type Cluster, clusterOf, type Exit, engineWork, exitsOf, shedLevel } from '../fires.ts';
import { gasKindOf, kindOf } from '../flames.ts';
import { Flooding } from '../flooding.ts';
import { GasJet, Jets } from '../jets.ts';
import type { Staged } from '../lod.ts';
import type { Looks } from '../look.ts';
import { jointKey } from '../onfoot/gait.ts';
import { absolute } from '../origin.ts';
import { lightFires, Plume, plumeExit } from '../plume.ts';
import type { LineState, Recovery } from '../recovery.ts';
import { Swimmer } from '../swimmer.ts';
import { TRAIL_STEP, Trail } from '../trail.ts';

/** No smoke is laid above this height over the ground, m: none is drawn there (trail.ts), and Freedom 7's engine was out by 60 km. */
const TRAIL_TOP = 80_000;
const UP = new THREE.Vector3(0, 1, 0);
const ONE = new THREE.Vector3(1, 1, 1);
/** How far off something a vehicle has shed is still drawn, m: an 18 m booster is half a pixel at this distance. It is flown on beyond it (sim/shed.ts). */
const SHED_SIGHT = 40_000;

/**
 * A figure for a descent (`flies.hangs`): its finest level copied, skeleton and all, and put in the pose its `Harness`
 * node's extras give (`hang_joints`, `hang`: a quaternion in each joint's own axes, sk-1.md), with where its harness is in
 * its own frame and how far below that its feet hang.
 */
function hangerOf(full: THREE.Object3D): { root: THREE.Object3D; harness: THREE.Vector3; foot: number } {
  const root = cloneRigged(full);
  // (a copy's userData went through JSON: the real material each mesh is drawn from is the original's, not a copy of it)
  const made: THREE.Object3D[] = [];
  full.traverse((o) => made.push(o));
  let n = 0;
  root.traverse((o) => {
    const was = made[n++];
    if (was && (o as THREE.Mesh).isMesh) {
      o.userData = { ...was.userData };
      (o as THREE.Mesh).material = (was as THREE.Mesh).material;
    }
  });
  root.position.set(0, 0, 0);
  root.quaternion.identity();
  root.scale.setScalar(1);
  const harness = root.getObjectByName('Harness');
  const extras = harness?.userData as { hang_joints?: string; hang?: number[] } | undefined;
  const joints = new Map<string, THREE.Object3D>();
  root.traverse((o) => joints.set(jointKey(o.name), o));
  (extras?.hang_joints ?? '').split(',').forEach((name, i) => {
    const q = extras?.hang?.slice(i * 4, i * 4 + 4);
    const joint = joints.get(jointKey(name.trim()));
    if (joint && q?.length === 4) joint.quaternion.set(q[0]!, q[1]!, q[2]!, q[3]!);
  });
  root.updateMatrixWorld(true);
  const at = harness ? harness.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0, 1.5, 0);
  const feet = ['Foot.L', 'Foot.R'].map((f) => joints.get(jointKey(f))?.getWorldPosition(new THREE.Vector3()).y ?? 0);
  root.traverse((o) => {
    o.frustumCulled = false; // (posed away from its bounds as made)
  });
  return { root, harness: at, foot: Math.max(0, at.y - Math.min(...feet)) + 0.08 };
}

/**
 * The mouths of the nozzles under `node`, in its own frame (the gas along its -Y): every vertex of its meshes taken
 * into that frame and told apart into pieces as an engine's bells are (fires.ts `exitsOf`).
 */
function mouthsOf(node: THREE.Object3D): Exit[] {
  node.updateWorldMatrix(true, true);
  const into = new THREE.Matrix4().copy(node.matrixWorld).invert();
  const points: number[] = [];
  const p = new THREE.Vector3();
  node.traverse((o) => {
    const position = (o as THREE.Mesh).isMesh ? (o as THREE.Mesh).geometry.getAttribute('position') : undefined;
    if (!position) return;
    const m = new THREE.Matrix4().multiplyMatrices(into, o.matrixWorld);
    for (let i = 0; i < position.count; i++) points.push(...p.fromBufferAttribute(position, i).applyMatrix4(m).toArray());
  });
  return exitsOf(points);
}

/** A node that rides a descent's body, as `Ascent.rideAt` needs it: the middle of its meshes and its +Y, in the flown model's frame (`rel`: its parent's place there). */
function pieceOf(node: THREE.Object3D, rel: THREE.Matrix4): { centre: THREE.Vector3; lie: THREE.Vector3 } {
  const own = rel.clone().multiply(node.matrix);
  const box = new THREE.Box3();
  node.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.boundingBox ?? mesh.geometry.computeBoundingBox();
    const to = new THREE.Matrix4();
    for (let p: THREE.Object3D | null = mesh; p && p !== node; p = p.parent) to.premultiply(p.matrix);
    box.union(mesh.geometry.boundingBox!.clone().applyMatrix4(to));
  });
  const centre = box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3());
  return { centre: centre.applyMatrix4(own), lie: new THREE.Vector3(0, 1, 0).transformDirection(own) };
}

/** What the flight on show asks of the stage it is shown on. */
export interface FlightShowHost {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly cam: Cameras;
  /** The Sun: its shadow map goes with the vehicle while it can fall inside it. */
  readonly sun: THREE.DirectionalLight;
  /** What is drawn without depth and may stand in front of cloud (clouds.ts `veils`): the fires and the trail join it. */
  readonly veils: THREE.Object3D[];
  readonly looks: Looks;
  /** `?plain`: nothing made ahead of its moment (tools/bench.mjs). */
  readonly plain: boolean;
  clock(): Clock | null;
  defs(): readonly ModelDef[];
  staged(): readonly Staged[];
  /** All the flight's models, under which what is shed is carried. */
  root(): THREE.Group | null;
  setting(): Setting;
  /** The terrain's height under the models' zero. */
  grade(): number;
  /** What the flight's air does that is seen and felt (effects.ts), given by the page. */
  effects(): Effects | null;
  /** Whether the cutaway is open, and to open it again (cut open on its pad, its skin off in flight). */
  cut(): boolean;
  setCutaway(on: boolean): void;
  /** Measure what is on show again. */
  fitBounds(): void;
  /** The exhibit as the camera needs it (stage/cabinview.ts), where nothing flies. */
  exhibited(): Craft | null;
  /** Whether this stage shows an exhibit (the gallery's), and the part chosen there, if one is. */
  exhibit(): boolean;
  selected(): string | null;
  /** The node a seat is (stage/cabinview.ts). */
  seatIndex(): number;
  seatNode(at: number, seat: NonNullable<ModelDef['seats']>[number]): THREE.Object3D | null;
  redraw(): void;
  /** Hardware has moved: its shadows are drawn again in the same frame. */
  oweShadows(): void;
  /** The view has been sent to follow something the vehicle let go (its name), or is back with the vehicle (null). */
  onFollow(name: string | null): void;
  /** What came to the spacecraft where it came down (recovery.ts), loaded with the flight. */
  recovery(): readonly Recovery[];
}

/**
 * The flight on show (stage/flightshow.ts): the flown vehicle where the run on show has it at the clock's instant
 * (ascent.ts), what it sheds carried away from it, the figures and parachutes of its descent, its attitude jets, each
 * engine's fire hung at its nozzles and the trail it leaves; and the vehicle as the camera needs it (`craft`), or what
 * it has let go while the view follows that.
 */
export class FlightShow {
  constructor(private readonly h: FlightShowHost) {}

  /** Take up another flight: its run, nothing shed, its fires hung afresh (the last flight's parachutes and jets taken away). */
  load(flight: FlightData): void {
    this.restoreFragments();
    this.usedRotations = false;
    this.followed = null;
    this.shedCraft = null;
    this.crafted = null;
    this.ascent = Ascent.of(flight);
    this.lifted.t = Number.NaN;
    this.debris.length = 0; // (their holders were under the last flight's root)
    this.flightData = flight;
    this.unhang();
    this.hangPlume(flight);
    // (in the gallery nothing flies: what leaves the exhibit that is an engine of its own is shown while its part is chosen)
    if (!this.ascent && this.h.exhibit()) this.h.defs().forEach((def, i) => this.hangJets(this.h.staged()[i], def));
  }

  /** The flight off the pad (ascent.ts), and what has been done to the model that flies: the clock's instant it was put at, the nodes it has shed, how far it moved this frame. */
  ascent: Ascent | null = null;

  flightData: FlightData | null = null;

  /**
   * The flown vehicle's fires (plume.ts), one an engine: each hung at its nozzles' exit on the part that carries it
   * (`owner`, a top-level node of the model, which may leave as a body of its own), at `offset` in that part's frame;
   * `level`: its place in what `Ascent.fireLevels` gives; `share`: its steering chambers' share of its thrust.
   */
  plumes: { plume: Plume; owner: THREE.Object3D; node: THREE.Object3D; offset: THREE.Matrix4; level: number; share: number }[] = [];

  /** Their one light (plume.ts `lightFires`), in the flown model's frame. */
  private fireLight: THREE.PointLight | null = null;

  /** Where the trail leaves the vehicle, in its frame as it stands: the middle of the fires lit at liftoff, by their exits' areas. */
  private readonly trailFrom = new THREE.Vector3();

  /** The trail it leaves in the air while the engine burns (trail.ts), in the scene's frame. */
  trail: Trail | null = null;

  /**
   * What leaves the vehicle that is not a main engine's fire (`ModelDef.jets`, jets.ts), a jet a mouth: each hung on its
   * node (`node`) at `at` in the node's own frame, so that it goes along the node's -Y (the model's own way out) as the
   * node stands at every instant, a tumbling booster's with it. A gas is a `GasJet`, a solid's burst a fire (`Plume`).
   * `def` is its entry, `part` the top-level part that carries it.
   */
  gases: { jet: GasJet | Plume; node: THREE.Object3D; at: THREE.Matrix4; def: JetDef; part: string }[] = [];

  /** The light a solid's burst is given and never lights (plume.ts: a fire takes a light; the gas jets' fires throw none). */
  private readonly unlit = new THREE.PointLight(0xffffff, 0, 0, 2);

  readonly lifted = {
    t: Number.NaN,
    flying: false,
    /** Gone from the scene: after the record's run has ended (ascent.ts `gone`). */
    gone: false,
    shed: '',
    shrank: false,
    /** Whether its shadow could fall inside the shadow map when last put somewhere. */
    shadowed: false,
    hidden: [] as THREE.Object3D[],
    by: new THREE.Vector3(),
  };

  /**
   * What the flown vehicle has shed and is still seen falling away (ascent.ts `shed`): each node
   * taken out of the model's full level into a holder that stands where its parent would be, so it
   * keeps its own place and turn under it; `rel` is that parent in the model's frame.
   */
  /**
   * What the vehicle has let go that the view is following in place of the vehicle (an index into the ascent's drops),
   * or null; and that piece as the camera needs it, measured once in its own frame.
   */
  followed: number | null = null;

  shedCraft: (Craft & { drop: number }) | null = null;

  /**
   * What the vehicle has let go, each node in a holder of its own: by its drop's index, or for a figure carried down on a
   * descent (`flies.hangs`) the number of drops and its own. What rides a descent's bodies has its `piece` measured once
   * (its centre and +Y in the model's frame), and `hidden` what of it is not drawn on the leg it is on.
   */
  readonly debris: {
    node: THREE.Object3D;
    parent: THREE.Object3D;
    drop: number;
    holder: THREE.Group;
    rel: THREE.Matrix4;
    piece?: { centre: THREE.Vector3; lie: THREE.Vector3 };
    hidden?: THREE.Object3D[];
  }[] = [];

  /** The flight's figures that come down on a descent (`flies.hangs`), each posed as it hangs, made the first time the vehicle flies. */
  private hangers: { root: THREE.Object3D; harness: THREE.Vector3; foot: number }[] | null = null;

  /** The flown vehicle as the camera needs it (camera/rig.ts: Craft): its frame, the middle and size of what is left of it, a place to see from inside it. */
  craft(): Craft | null {
    const s = this.flier;
    if (!s) return this.h.exhibited();
    if (this.followed !== null) {
      const shed = this.shedAsCraft(this.followed);
      if (shed) return shed;
    }
    const c = (this.crafted ??= {
      matrix: s.group.matrixWorld,
      centre: new THREE.Vector3(),
      radius: 1,
      shape: 0,
      flying: false,
      seat: null as THREE.Matrix4 | null,
      of: null as Staged | null,
      shed: '',
      level: null as THREE.Object3D | null,
      place: null as THREE.Object3D | null,
      seatIndex: -1,
      size: new THREE.Vector3(),
    });
    const at = this.h.defs().findIndex((m) => m.id === this.ascent?.model);
    const index = this.h.seatIndex();
    const seat = this.h.defs()[at]?.seats?.[index];
    if (c.of !== s || index !== c.seatIndex) {
      c.place = seat ? this.h.seatNode(at, seat) : null;
      c.seatIndex = index;
    }
    if (c.of !== s || c.shed !== this.lifted.shed || c.level !== s.shown) {
      // measured when what is left of it changes, not every frame: the box round what is still drawn of it
      c.of = s;
      c.shed = this.lifted.shed;
      c.level = s.shown;
      c.matrix = s.group.matrixWorld;
      // (in the vehicle's own frame, so it is the same box however the vehicle lay when it was taken: a box in the
      // scene's frame round a pitched rocket is a different box, and the camera and the Sun's map then stood a little
      // differently according to when a level or a stage had last changed)
      // (and from each node's own placing up to the vehicle's, never through where the vehicle is in the world: twelve
      // kilometres up that is the last bits of every number, and the same box must come back to the bit)
      const left = new THREE.Box3();
      const within = new THREE.Matrix4();
      const each = new THREE.Box3();
      s.shown.traverseVisible((o) => {
        const geometry = (o as THREE.Mesh).isMesh ? (o as THREE.Mesh).geometry : null;
        if (!geometry) return;
        if (!geometry.boundingBox) geometry.computeBoundingBox();
        within.copy(o.matrix);
        for (let up = o.parent; up && up !== s.group; up = up.parent) within.premultiply(up.matrix);
        left.union(each.copy(geometry.boundingBox!).applyMatrix4(within));
      });
      if (!left.isEmpty()) {
        const centre = left.getCenter(new THREE.Vector3());
        const radius = left.getSize(new THREE.Vector3()).length() / 2;
        // (a coarser level of the same thing is the same shape: only a real change counts as one)
        if (centre.distanceTo(c.centre) > 0.05 * radius || Math.abs(radius - c.radius) > 0.05 * radius) c.shape++;
        c.centre.copy(centre);
        c.radius = radius;
        left.getSize(c.size);
      }
    }
    c.flying = this.lifted.flying;
    // the eyes, in the seat's frame
    const node = c.place;
    if (node && seat) {
      node.updateWorldMatrix(true, false);
      c.seat = (c.seat ?? new THREE.Matrix4())
        .copy(node.matrixWorld)
        .multiply(new THREE.Matrix4().makeTranslation(...(seat.eye ?? ([0, 0, 0] as const))));
    } else c.seat = null;
    return c;
  }

  crafted:
    | (Craft & {
        of: Staged | null;
        shed: string;
        level: THREE.Object3D | null;
        seatIndex: number;
        place: THREE.Object3D | null;
        size: THREE.Vector3;
      })
    | null = null;

  /**
   * Something the vehicle has let go, as the camera needs it: the frame it is carried in (the vehicle's own, as it was
   * when the piece left, moved and turned as its body has gone since), and the middle and size of its nodes in that
   * frame, measured when the view is first sent to it. Null when none of it is drawn (the clock is back before it left).
   */
  shedAsCraft(drop: number): Craft | null {
    const pieces = this.debris.filter((d) => d.drop === drop && d.holder.visible);
    const first = pieces[0];
    if (!first) return null;
    const frame = new THREE.Matrix4().copy(first.rel).invert().premultiply(first.holder.matrix);
    let c = this.shedCraft;
    if (!c || c.drop !== drop) {
      const into = new THREE.Matrix4().copy(frame).invert();
      const box = new THREE.Box3();
      const each = new THREE.Box3();
      const within = new THREE.Matrix4();
      for (const d of pieces) {
        d.node.traverse((o) => {
          const geometry = (o as THREE.Mesh).isMesh ? (o as THREE.Mesh).geometry : null;
          if (!geometry) return;
          if (!geometry.boundingBox) geometry.computeBoundingBox();
          // (from each mesh up to its holder, then the holder's own place: never through the world, as `craft` has it)
          within.copy(o.matrix);
          for (let up = o.parent; up && up !== d.holder; up = up.parent) within.premultiply(up.matrix);
          within.premultiply(d.holder.matrix).premultiply(into);
          box.union(each.copy(geometry.boundingBox!).applyMatrix4(within));
        });
      }
      if (box.isEmpty()) return null;
      c = this.shedCraft = {
        drop,
        matrix: new THREE.Matrix4(),
        centre: box.getCenter(new THREE.Vector3()),
        radius: box.getSize(new THREE.Vector3()).length() / 2,
        shape: 1000 + drop,
        flying: true,
        seat: null,
      };
    }
    c.matrix.copy(frame);
    return c;
  }

  /**
   * Send the view after something the vehicle has let go (a drop of the ascent's, by its index: `onSpot` names the one
   * under a right click), or back to the vehicle (null). The flight goes on being flown; only what the chase view, the
   * locked view and the pad camera are about changes, until the reset key, another rig, or the clock going back before
   * the piece left.
   */
  followShed(drop: number | null): void {
    if (drop === this.followed) return;
    if (drop !== null && !this.debris.some((d) => d.drop === drop && d.holder.visible)) return;
    this.followed = drop;
    this.shedCraft = null;
    this.h.cam.retake();
    this.h.onFollow(drop === null ? null : this.dropTitle(drop));
    this.h.oweShadows();
    this.h.redraw();
  }

  /** Let go of what was being followed without moving the view: another rig has it now, or the piece is no longer there. */
  unfollow(): void {
    if (this.followed === null) return;
    this.followed = null;
    this.shedCraft = null;
    this.h.onFollow(null);
  }

  /** What a drop is called: its body's name where the flight gives one, or the part its first node is. */
  dropTitle(drop: number): string {
    const node = this.ascent?.drops[drop]?.nodes[0];
    const part = this.h
      .defs()
      .find((m) => m.id === this.ascent?.model)
      ?.parts.find((p) => p.node === node);
    return this.ascent?.dropName(drop) ?? part?.name ?? 'stage';
  }

  /**
   * Show a flight being flown by hand (sim/run.ts `Run`) in place of the record's, or the record's again (null).
   * The trail starts afresh: the one laid belongs to the flight before.
   */
  flyRun(run: Run | null): void {
    if (!this.ascent) return;
    this.ascent.use(run);
    this.h.effects()?.use(run);
    this.stand();
    if (this.flightData) this.hangPlume(this.flightData);
    // (the jets and the parachutes are the flight's, not the run's: kept, with the shaders `warm` built for them. Made
    // again here, the deck's were made and their shaders built at their first use, in the middle of the flight. The jets
    // stand in the body's axes as this run has them on its pad.)
    const flier = this.h.defs().find((m) => m.id === this.ascent?.model);
    const frame = this.jets && this.ascent.bodyFrame(new THREE.Quaternion().setFromAxisAngle(UP, flier?.rotationY ?? 0));
    if (this.jets && frame) this.jets.group.matrix.copy(frame);
    this.lifted.t = Number.NaN;
    this.h.redraw();
  }

  /**
   * Stand the flown model on its pad, whole, wherever the run before had it: what it had shed is put back in it and
   * shown. The fire is hung on it as it stands there (`hangPlume` measures the nozzle on the model upright, and finds
   * the engine in the model, not carried off with a booster that has left); `lift` then puts it where the run on show
   * has it at the clock's instant, and does what follows from its having moved.
   */
  stand(): void {
    this.restoreFragments();
    const s = this.flier;
    const def = this.h.defs().find((m) => m.id === this.ascent?.model);
    if (!s || !def) return;
    for (const d of this.debris.splice(0)) {
      d.parent.add(d.node);
      d.holder.removeFromParent();
      for (const o of d.hidden?.splice(0) ?? []) o.visible = true;
    }
    for (const o of this.lifted.hidden) o.visible = true;
    this.lifted.hidden = [];
    this.lifted.shed = '';
    s.group.position.set(...(def.position ?? [0, 0, 0]));
    s.group.quaternion.setFromAxisAngle(UP, def.rotationY ?? 0);
    s.group.updateMatrixWorld(true);
    this.h.oweShadows();
  }

  /** The model the flight carries off the pad, if there is one. */
  get flier(): Staged | null {
    const id = this.ascent?.model;
    return this.h.staged()[this.h.defs().findIndex((m) => m.id === id)] ?? null;
  }

  private readonly rotationHome = new WeakMap<THREE.Object3D, THREE.Quaternion>();
  private readonly rotationNodes = new WeakMap<THREE.Object3D, Map<string, THREE.Object3D | undefined>>();
  private usedRotations = false;

  private rotateEvents(ascent: Ascent, staged: Staged, t: number): void {
    const moves = this.flightData?.flies?.eventRotations;
    if (!moves?.length || (t < 0 && !this.usedRotations)) return;
    const turns = new Map<string, THREE.Quaternion>();
    const axis = new THREE.Vector3();
    const turn = new THREE.Quaternion();
    for (const move of moves) {
      const elapsed = t < 0 ? -Infinity : t - ascent.rotationTime(move.event);
      const by = move.angle * THREE.MathUtils.smoothstep(elapsed, move.from, move.to);
      let angle = turns.get(move.node);
      if (!angle) {
        angle = new THREE.Quaternion();
        turns.set(move.node, angle);
      }
      angle.premultiply(turn.setFromAxisAngle(axis.set(...move.axis), by));
    }
    const active = [...turns.values()].some((angle) => angle.w < 1);
    if (!active && !this.usedRotations) return;
    this.usedRotations = active;
    let moved = false;
    for (const level of [...staged.group.children, ...this.debris.map((piece) => piece.node)]) {
      let named = this.rotationNodes.get(level);
      if (!named) {
        named = new Map();
        this.rotationNodes.set(level, named);
      }
      for (const [name, angle] of turns) {
        if (!named.has(name)) named.set(name, level.getObjectByName(name));
        const hinge = named.get(name);
        if (!hinge) continue;
        let base = this.rotationHome.get(hinge);
        if (!base) {
          base = hinge.quaternion.clone();
          this.rotationHome.set(hinge, base);
        }
        turn.copy(base).premultiply(angle);
        if (Math.abs(hinge.quaternion.dot(turn)) >= 1 - 1e-12) continue;
        hinge.quaternion.copy(turn);
        moved = true;
      }
    }
    if (moved) this.h.oweShadows();
  }

  /**
   * Put the flown vehicle where the simulator has it at the clock's instant (ascent.ts): from
   * liftoff to landing it flies, without what it has shed; before it stands on its pad, and after the record's run has
   * ended it is not in the scene (a flight flown by hand stays where it came down).
   */
  lift(): void {
    this.lifted.by.set(0, 0, 0);
    const ascent = this.ascent;
    const s = this.flier;
    const clock = this.h.clock();
    if (!ascent && this.gases.length) this.showChosen();
    if (!ascent || !s || !clock) return;
    const t = clock.t;
    if (t === this.lifted.t) return;
    this.lifted.t = t;
    const def = this.h.defs().find((m) => m.id === ascent.model)!;
    const g = s.group;
    const before = g.position.clone();
    const pad = new THREE.Quaternion().setFromAxisAngle(UP, def.rotationY ?? 0);
    const flying = ascent.place(t, pad, g.position, g.quaternion);
    // (the day's sea where the run on show comes down, drawn moving round it: swell.ts)
    const globe = this.h.setting().globe;
    if (globe) {
      const down = ascent.down();
      if (globe.swell(down?.centre ?? null, down?.t0)) this.h.redraw();
      if (globe.swellAt(t)) this.h.redraw();
    }
    this.recover(ascent, t, g);
    this.flood(ascent, s, t);
    this.inflateBags(ascent, s, t);
    this.rotateEvents(ascent, s, t);
    this.unseat(ascent, g, t);
    // (after the record's run has ended the vehicle is not in the scene at all: not back on its pad)
    const gone = ascent.gone(t);
    if (gone !== this.lifted.gone) {
      this.lifted.gone = gone;
      g.visible = !gone;
      this.h.renderer.shadowMap.needsUpdate = true;
      this.h.oweShadows();
      this.h.redraw();
    }
    if (!flying && !this.lifted.flying) return; // standing on its pad (or gone), as it was
    if (!flying) {
      g.position.set(...(def.position ?? [0, 0, 0]));
      g.quaternion.copy(pad);
    }
    const changed = flying !== this.lifted.flying;
    this.lifted.flying = flying;
    const shed = ascent.dropped(t);
    if (shed.join() !== this.lifted.shed) {
      this.lifted.shed = shed.join();
      for (const o of this.lifted.hidden) o.visible = true;
      this.lifted.hidden = [];
      const names = new Set(shed);
      g.traverse((o) => {
        if (names.has(o.name) && o.visible) {
          o.visible = false;
          this.lifted.hidden.push(o);
        }
      });
      this.h.renderer.shadowMap.needsUpdate = true;
      this.lifted.shrank = flying;
    }
    this.restoreFragments((f) => !flying || t < f.at || f.at !== ascent.brokenAt(f.source));
    this.fall(ascent, s, pad, t, flying);
    if (flying) this.breakup(ascent, s, def, pad, t);
    this.hang(ascent, s, pad, t, flying);
    this.burnFires(ascent, t); // (their flicker is the clock's: the same instant is the same fire)
    this.layTrail(ascent, pad, t, flying);
    this.h
      .effects()
      ?.set(
        t,
        flying && !ascent.afloat(t),
        g,
        s.full,
        clock.rate,
        this.h.renderer.toneMappingExposure,
        this.h.setting().sunIntensity,
        this.h.veils,
      );
    this.lifted.by.subVectors(g.position, before);
    g.updateMatrixWorld(true);
    s.measure(); // levels of detail are chosen by the distance to it
    if (changed) this.h.fitBounds(); // (a vehicle in flight is left out of them, so they change only as it leaves and comes back)
    if (changed && this.h.cut()) this.h.setCutaway(true); // (cut open on its pad, its skin off in flight: as it leaves and comes back)
    this.h.redraw();
    // its shadow is drawn again only while it can fall inside the shadow map (which goes with it under the chase camera):
    // a rocket long gone from a map fitted to the pad casts nothing there
    const box = this.h.sun.shadow.camera;
    const within = !ABOUT_PLACE.has(this.h.cam.rig) || g.position.distanceTo(this.h.sun.target.position) < 2 * box.right + 60;
    if (within || this.lifted.shadowed || changed || this.lifted.shrank) this.h.oweShadows();
    this.lifted.shrank = false;
    this.lifted.shadowed = within;
  }

  /** Who is in the sea (swimmer.ts), made the first time he is wanted; and the nodes of him in the cabin, not drawn once he is out. */
  private swimmer: Swimmer | null = null;
  private unseated: THREE.Object3D[] = [];

  /** Once the crew is out of the spacecraft afloat (`Ascent.outAt`), the figure in its cabin (`swimmer.seat`, a name's prefix) is not drawn. */
  private unseat(ascent: Ascent, g: THREE.Object3D, t: number): void {
    const seat = this.flightData?.swimmer?.seat;
    if (!seat) return;
    const out = t >= ascent.outAt;
    if (out === this.unseated.length > 0) return;
    for (const o of this.unseated) o.visible = true;
    this.unseated = [];
    if (out)
      g.traverse((o) => {
        if (o.name.startsWith(seat) && o.visible) {
          o.visible = false;
          this.unseated.push(o);
        }
      });
    this.h.oweShadows();
    this.h.redraw();
  }

  private bags: { group: THREE.Group; geometry: THREE.SphereGeometry; material: THREE.MeshStandardMaterial } | null = null;

  private inflateBags(ascent: Ascent, s: Staged, t: number): void {
    const body = this.flightData?.flies?.uprighting?.body;
    if (!body?.bags) return;
    const fraction = ascent.bagVolume(t);
    if (!this.bags && fraction > 0) {
      const geometry = new THREE.SphereGeometry(1, 32, 24);
      const material = new THREE.MeshStandardMaterial({ color: 0xdd8b30, roughness: 0.94 });
      const group = new THREE.Group();
      for (const bag of body.bags) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(bag.out, bag.up - body.datum.value, bag.across);
        group.add(mesh);
      }
      s.group.add(group);
      this.h.looks.add(group);
      this.bags = { group, geometry, material };
    }
    if (!this.bags) return;
    this.bags.group.visible = fraction > 0;
    const scale = Math.cbrt(fraction);
    this.bags.group.children.forEach((bag, i) => bag.scale.setScalar(body.bags![i]!.radius.value * scale));
    if (fraction > 0 && fraction < 1) this.h.oweShadows();
  }

  /** The sea inside the spacecraft afloat (flooding.ts), in the flown model's frame: made the first time it is down. */
  private flooding: Flooding | null = null;

  /** Draw the water in each space of the spacecraft afloat that can be seen into, as the run on show has it at `t`. */
  private flood(ascent: Ascent, s: Staged, t: number): void {
    const afloat = this.flightData?.flies?.afloat;
    const now = ascent.floating(t);
    if (!afloat?.seen?.length || (!now && !this.flooding)) return;
    if (!this.flooding) {
      this.flooding = new Flooding(afloat.body, afloat.seen);
      s.group.add(this.flooding.group);
      this.h.looks.add(this.flooding.group);
    }
    if (this.flooding.set(now)) this.h.redraw();
  }

  /**
   * Fly what came to the spacecraft where it came down (recovery.ts) on the record's run, about where that run came down:
   * its line to the top of the flown model's node it was made fast to, pulling as the run afloat has it.
   */
  private recover(ascent: Ascent, t: number, g: THREE.Object3D): void {
    const crafts = this.h.recovery();
    if (!crafts.length) return;
    const down = ascent.recorded ? (ascent.down()?.centre ?? null) : null;
    const taut = this.flightData?.flies?.afloat?.record.taut.value ?? Number.POSITIVE_INFINITY;
    for (const r of crafts) {
      const to = r.def.line ? g.getObjectByName(r.def.line.to) : undefined;
      let line: LineState | null = null;
      if (to && down) {
        g.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(to);
        const up = ascent.down() ? this.h.setting().globe?.up(box.getCenter(new THREE.Vector3()), new THREE.Vector3()) : null;
        const top = box.getCenter(new THREE.Vector3());
        if (up) {
          const size = box.getSize(new THREE.Vector3());
          top.addScaledVector(up, 0.5 * (Math.abs(up.x) * size.x + Math.abs(up.y) * size.y + Math.abs(up.z) * size.z));
        }
        line = { top, tension: ascent.pull(t), taut };
      }
      if (r.set(t, down, line)) this.h.oweShadows();
    }
    this.swim(ascent, t, down);
  }

  /** Who is in the sea where the record's run came down (`Flight.swimmer`), on the record's clock, and the hoist's cable that lifts him. */
  private swim(ascent: Ascent, t: number, down: Vec3 | null): void {
    const def = this.flightData?.swimmer;
    const flight = this.flightData;
    if (!def || !flight?.site) return;
    const by = this.h.recovery().find((r) => r.def.name === def.by);
    if (!this.swimmer) {
      const figure = this.h.staged()[this.h.defs().findIndex((m) => m.id === def.model)];
      if (!figure || !down) return;
      this.swimmer = new Swimmer(def, figure.full, by?.def, siteFrame(flight.site), flight.site.seaLevel.value);
      this.h.scene.add(this.swimmer.group);
      this.h.looks.add(this.swimmer.group);
    }
    const t0 = ascent.down()?.t0 ?? 0;
    const sheave = by?.sheave(t) ?? null;
    if (this.swimmer.set(t, down, ascent.waves, t0, sheave)) this.h.oweShadows();
    if (by && sheave) {
      const hoist = by.def.hoist!;
      const up = this.h.setting().globe?.up(sheave, new THREE.Vector3()) ?? new THREE.Vector3(0, 1, 0);
      let end = this.swimmer.collar;
      if (t < hoist.grab.value) {
        // (the collar swinging in the water under the sheave, at the sea's level where he is)
        const rise = sheave.clone().sub(this.swimmer.collar).dot(up);
        end = sheave.clone().addScaledVector(up, -rise - 0.2);
      }
      by.drawHoist(t, end);
    }
  }

  /**
   * Carry what the vehicle has shed away from it: the tower on its own rocket, the booster and
   * the retropack falling behind (ascent.ts `shed`), instead of their vanishing. Each is the full
   * level's own node, moved into a holder in the scene while it falls and put back when the clock
   * goes back before it left or the flight is over.
   */
  fall(ascent: Ascent, s: Staged, pad: THREE.Quaternion, t: number, flying: boolean): void {
    const root = this.h.root();
    const drops = ascent.drops.length;
    const gone = (i: number) =>
      flying && (i < drops ? t >= ascent.drops[i]!.at : ascent.hangerAt(i - drops, t, pad, this.pieceOf) !== null);
    for (let k = this.debris.length - 1; k >= 0; k--) {
      const d = this.debris[k]!;
      if (gone(d.drop)) continue;
      d.parent.add(d.node);
      d.holder.removeFromParent();
      for (const o of d.hidden?.splice(0) ?? []) o.visible = true;
      this.debris.splice(k, 1);
    }
    s.group.updateMatrixWorld(true);
    const into = new THREE.Matrix4().copy(s.group.matrixWorld).invert();
    const riders = this.flightData?.flies?.drops ?? [];
    ascent.drops.forEach((drop, i) => {
      if (!gone(i) || this.debris.some((d) => d.drop === i)) return;
      for (const name of drop.nodes) {
        const node = s.full.getObjectByName(name);
        const parent = node?.parent;
        if (!node || !parent || !root) continue;
        const holder = new THREE.Group();
        holder.matrixAutoUpdate = false;
        root.add(holder);
        holder.add(node);
        node.visible = true; // (hidden with the rest of what was shed, at every level, a moment ago)
        const rel = into.clone().multiply(parent.matrixWorld);
        this.debris.push({ node, parent, drop: i, holder, rel, piece: riders[i]?.rides ? pieceOf(node, rel) : undefined });
      }
    });
    // the figures carried down on a descent, as each comes to be (his canopy out: he has left the seat)
    this.hangers?.forEach((h, j) => {
      const drop = drops + j;
      if (!gone(drop) || this.debris.some((d) => d.drop === drop) || !root) return;
      const holder = new THREE.Group();
      holder.matrixAutoUpdate = false;
      root.add(holder);
      const parent = h.root.parent ?? new THREE.Group();
      holder.add(h.root);
      this.debris.push({ node: h.root, parent, drop, holder, rel: new THREE.Matrix4() });
    });
    const at = new THREE.Vector3();
    const turn = new THREE.Quaternion();
    for (const d of this.debris) {
      let shown: boolean;
      if (d.drop >= drops) {
        // a figure: his harness where the body is, the line up to his canopy through it, his feet coming down under it
        const h = this.hangers![d.drop - drops]!;
        const now = ascent.hangerAt(d.drop - drops, t, pad, this.pieceOf);
        shown = now !== null;
        if (now) {
          turn.setFromUnitVectors(UP, now.line);
          at.copy(now.harness)
            .addScaledVector(now.line, h.foot * THREE.MathUtils.smoothstep(now.since, 0, 2))
            .sub(h.harness.clone().applyQuaternion(turn));
          d.holder.matrix.compose(at, turn, ONE);
        }
      } else if (d.piece) {
        // on a descent's body: its centre along the body's track, its +Y against the air
        const ride = ascent.rideAt(d.drop, t, pad, d.piece);
        shown = ride !== null;
        if (ride) {
          at.copy(d.piece.centre).applyQuaternion(ride.turn).negate().add(ride.centre);
          d.holder.matrix.compose(at, ride.turn, ONE).multiply(d.rel);
          const hide = riders[d.drop]?.rides?.[ride.leg]?.hide ?? [];
          if ((d.hidden?.length ?? 0) !== hide.length) {
            for (const o of d.hidden?.splice(0) ?? []) o.visible = true;
            d.hidden = hide.map((name) => d.node.getObjectByName(name)).filter((o): o is THREE.Object3D => Boolean(o?.visible));
            for (const o of d.hidden) o.visible = false;
            this.h.oweShadows();
          }
        }
      } else {
        shown = ascent.shed(d.drop, t, pad, at, turn);
        // (what left under a parachute is lost to sight: drawn smaller, to nothing)
        if (shown) d.holder.matrix.compose(at, turn, ONE.clone().multiplyScalar(ascent.seen(d.drop, t))).multiply(d.rel);
      }
      // (what the flight gives no body for is not drawn; nor is anything past SHED_SIGHT of both the eye and the vehicle, which
      // the camera may be about to go to: it is under a pixel there, and is flown on all the same)
      const where = new THREE.Vector3().setFromMatrixPosition(d.holder.matrix);
      d.holder.visible = shown && Math.min(where.distanceTo(this.h.camera.position), where.distanceTo(s.group.position)) < SHED_SIGHT;
      if (d.holder.visible) d.holder.matrixWorldNeedsUpdate = true;
    }
    // what the view was following is no longer there (the clock put back before it left, the flight begun again): back to the vehicle
    const followed = this.followed;
    if (followed !== null && !this.debris.some((d) => d.drop === followed && d.holder.visible)) this.followShed(null);
  }

  private readonly fragments: BreakupFragment[] = [];

  private restoreFragments(when: (f: BreakupFragment) => boolean = () => true) {
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const f = this.fragments[i]!;
      if (!when(f)) continue;
      f.restore();
      this.fragments.splice(i, 1);
      this.h.oweShadows();
    }
  }

  private breakup(ascent: Ascent, s: Staged, def: ModelDef, pad: THREE.Quaternion, t: number) {
    const root = this.h.root();
    if (!root) return;
    const drops = this.flightData?.flies?.drops ?? [];
    const add = (source: number | 'active', at: number, pieces: FragmentPiece[]) => {
      for (const [i, piece] of pieces.entries()) {
        // A fixed local drift opens a visible gap, including for a part centred on the long axis.
        const outward = new THREE.Vector3(piece.centre.x, 0.4, piece.centre.z);
        if (outward.lengthSq() < 0.25) outward.set(i % 2 ? -1 : 1, 0.3, 0.5);
        const motion = ascent.fragmentMotion(source, at, pad, piece.centre, outward.normalize());
        if (motion) this.fragments.push(new BreakupFragment(source, at, piece, motion, root));
      }
      if (pieces.length) this.h.oweShadows();
    };
    const activeAt = ascent.brokenAt('active');
    if (!ascent.activeReleased && t >= activeAt && !this.fragments.some((f) => f.source === 'active')) {
      const scheduled = new Set(drops.flatMap((d) => d.nodes));
      const external = def.parts
        .filter((p) => !p.inside && !scheduled.has(p.node))
        .flatMap((p) => {
          const node = s.full.getObjectByName(p.node);
          // Keep scheduled releases and their descendants in the ordinary staging path.
          for (let a = node; a; a = a.parent ?? undefined) if (scheduled.has(a.name)) return [];
          if (!node || [...scheduled].some((name) => node.getObjectByName(name))) return [];
          return [node];
        });
      const pieces = fragmentPieces(external, s.group, 1);
      if (pieces[0] && pieces[0].size > 2) {
        const finer = fragmentPieces(separableBranches(pieces[0].node), s.group, 1);
        if (finer.length) pieces.splice(0, 1, ...finer);
      }
      add('active', activeAt, pieces);
    }
    for (const drop of new Set(this.debris.map((d) => d.drop))) {
      const at = ascent.brokenAt(drop);
      if (!(t >= at) || this.fragments.some((f) => f.source === drop)) continue;
      const sources = this.debris.filter((d) => d.drop === drop);
      const pieces = sources.flatMap((d) => {
        const branches = separableBranches(d.node);
        return fragmentPieces(branches, d.holder, Math.min(2, branches.length - 1), d.rel);
      });
      // A stack joined from separate single-mesh parts still has whole parts to shed.
      if (!pieces.length && sources.length > 1) {
        const d = sources[0]!;
        pieces.push(...fragmentPieces([d.node], d.holder, 1, d.rel));
      }
      add(drop, at, pieces.slice(0, 3));
    }
    for (const f of this.fragments) {
      if (f.source === 'active') f.hideLowerLevels(s.group, s.full);
      f.place(t);
    }
  }

  /** Where the visible breakup pieces actually are in the scene, in the site's metre coordinates. */
  breakupReport(): { source: string; name: string; at: number; position: number[]; physical: boolean }[] {
    const drops = this.flightData?.flies?.drops ?? [];
    const out = this.fragments.map((f) => ({
      source: f.source === 'active' ? 'active' : (drops[f.source]?.on ?? String(f.source)),
      name: f.piece.node.name,
      at: f.at,
      position: f.position.toArray() as number[],
      physical: false,
    }));
    const released = this.ascent?.activeReleased;
    const at = this.ascent?.brokenAt('active') ?? Infinity;
    if (released && this.lifted.t >= at) {
      const d = this.debris.find((d) => drops[d.drop]?.on === released && d.holder.visible);
      if (d) {
        const central = fragmentPieces([d.node], d.holder, 1)[0]?.centre;
        if (central)
          out.push({ source: 'active', name: d.node.name, at, position: central.applyMatrix4(d.holder.matrix).toArray(), physical: true });
      }
    }
    return out;
  }

  /** What drop `i` rides a descent on, as `fall` measured it (its first node's), for `Ascent.hangerAt`. */
  private readonly pieceOf = (i: number): { centre: THREE.Vector3; lie: THREE.Vector3 } | null =>
    this.debris.find((d) => d.drop === i && d.piece)?.piece ?? null;

  /** The flown vehicle's parachutes (`Flight.flies.chutes`), made the first time the vehicle flies, and its attitude jets (viewer/jets.ts). */
  chutes: Chute[] | null = null;

  jets: Jets | null = null;

  /**
   * Draw the parachutes as the run has them at `t` (ascent.ts `chute`, viewer/chute.ts): each made fast to the node the
   * flight names, on the full level's own node, so one that leaves with what it carried off goes where `fall` puts that.
   */
  hang(ascent: Ascent, s: Staged, pad: THREE.Quaternion, t: number, flying: boolean): void {
    // the attitude jets: a cone at each chamber that is open, on the model in the body's own axes
    const thrusters = this.flightData?.plan?.craft[0]?.rigid?.capsule.rcs?.thrusters;
    const frame = thrusters && !this.jets ? ascent.bodyFrame(pad) : null;
    if (thrusters && frame) {
      this.jets = new Jets(thrusters);
      this.jets.group.matrix.copy(frame);
      s.group.add(this.jets.group);
    }
    this.jets?.set(flying ? ascent.jets(t) : null, this.h.renderer.toneMappingExposure);
    if (!this.hangers) {
      this.hangers = (this.flightData?.flies?.hangs ?? []).flatMap((h) => {
        const figure = this.h.staged()[this.h.defs().findIndex((m) => m.id === h.model)];
        return figure ? [hangerOf(figure.full)] : [];
      });
      for (const h of this.hangers) this.h.looks.add(h.root);
    }
    if (!ascent.chutes.length) return;
    if (!this.chutes) {
      s.group.updateMatrixWorld(true);
      const into = new THREE.Matrix4().copy(s.group.matrixWorld).invert();
      // (the first body of the plan's that comes down on its own air: an orbital flight's descent module, the one whose
      // parachutes are drawn by body; a ballistic one's are not, and name none)
      const own = this.flightData?.plan?.craft[0]?.bodies.find((b) => b.aero)?.id;
      this.chutes = ascent.chutes.map((def) => {
        // (the node may be away already, carried off in `fall`'s holder, or on a figure carried down)
        const node =
          s.full.getObjectByName(def.at) ??
          this.hangers?.map((h) => h.root.getObjectByName(def.at)).find(Boolean) ??
          this.debris.map((d) => d.node.getObjectByName(def.at)).find(Boolean) ??
          s.full;
        const chute = new Chute(def, node);
        // (the run's own body hangs from where its parachute is made fast: measured on the model as it stands now)
        if (def.body && def.body === own && !ascent.hangsFrom && s.full.getObjectByName(def.at)) {
          node.updateWorldMatrix(true, false);
          ascent.hangsFrom = chute.anchor.clone().applyMatrix4(node.matrixWorld).applyMatrix4(into);
        }
        this.h.scene.add(chute.group);
        this.h.looks.add(chute.group);
        return chute;
      });
    }
    const light = this.h.setting().sunIntensity / 3 + 0.1;
    this.chutes.forEach((chute, i) => chute.set(flying ? ascent.chute(i, t, pad) : null, light));
  }

  /**
   * Lay the trail up to `t` (it is laid once, point by point, as far as the clock has gone while
   * the engine burns; going back only shows less of it) and show it as it stands at `t`.
   */
  layTrail(ascent: Ascent, pad: THREE.Quaternion, t: number, flying: boolean): void {
    const trail = this.trail;
    const nozzle = this.plumes.length ? this.trailFrom : undefined;
    if (!trail || !nozzle) return;
    // (nothing is laid, and no head drawn, above TRAIL_TOP: no trail is drawn there, and an orbital flight's, laid on round
    // the Earth, swelled the volume the smoke is marched in until the page stalled)
    const upTo = flying ? Math.min(t, ascent.cutoff) : -1;
    const at = new THREE.Vector3();
    const turn = new THREE.Quaternion();
    while ((trail.laid + 1) * TRAIL_STEP <= upTo) {
      const born = (trail.laid + 1) * TRAIL_STEP;
      if (!ascent.place(born, pad, at, turn)) break;
      at.add(nozzle.clone().applyQuaternion(turn));
      if (at.y - this.h.grade() > TRAIL_TOP) break;
      const along = UP.clone().applyQuaternion(turn);
      trail.reach(at, along, born, Math.exp(-Math.max(0, at.y - this.h.grade()) / 8000));
    }
    // and from the last point to the nozzle as it is now, while it burns
    if (flying && t < ascent.cutoff && ascent.place(t, pad, at, turn) && at.y - this.h.grade() <= TRAIL_TOP) {
      at.add(nozzle.clone().applyQuaternion(turn));
      trail.head(at, UP.clone().applyQuaternion(turn), t, Math.exp(-Math.max(0, at.y - this.h.grade()) / 8000));
    } else trail.headless();
    trail.show(flying ? t : null, this.h.setting().sunIntensity / 3 + 0.1);
  }

  /** Take the last flight's parachutes and attitude jets away: another flight has its own. */
  unhang(): void {
    for (const chute of this.chutes ?? []) {
      chute.group.removeFromParent();
      this.h.looks.remove(chute.group); // (or every flight's parachutes would be kept, and dressed again at each change of look)
      chute.dispose();
    }
    this.chutes = null;
    for (const h of this.hangers ?? []) {
      h.root.removeFromParent();
      this.h.looks.remove(h.root);
    }
    this.hangers = null;
    this.jets?.group.removeFromParent();
    this.jets?.dispose();
    this.jets = null;
    if (this.swimmer) {
      this.swimmer.group.removeFromParent();
      this.h.looks.remove(this.swimmer.group);
    }
    this.swimmer = null;
    this.unseated = [];
    if (this.flooding) {
      this.flooding.group.removeFromParent();
      this.h.looks.remove(this.flooding.group);
      this.flooding.dispose();
    }
    this.flooding = null;
    if (this.bags) {
      this.bags.group.removeFromParent();
      this.h.looks.remove(this.bags.group);
      this.bags.geometry.dispose();
      this.bags.material.dispose();
      this.bags = null;
    }
  }

  /**
   * Burn each fire as the run on show has it at `t` (`Ascent.fireLevels`), where the part that carries it is now: on
   * the vehicle, or on a booster swinging away, which takes its dying fire with it. Then their one light.
   */
  burnFires(ascent: Ascent, t: number): void {
    const root = this.h.root();
    if (!root || (!this.plumes.length && !this.gases.length)) return;
    const { vacuum, levels } = ascent.fireLevels(
      t,
      Array.from(
        { length: this.plumes.length ? Math.max(...this.plumes.map((h) => h.level)) + 1 : 0 },
        (_, i) => this.plumes.find((h) => h.level === i)?.share ?? 0,
      ),
    );
    root.updateWorldMatrix(true, false);
    const into = new THREE.Matrix4().copy(root.matrixWorld).invert();
    for (const h of this.plumes) {
      const l = levels[h.level] ?? { main: 0, steering: 0 };
      h.owner.updateWorldMatrix(true, false);
      h.plume.mesh.matrix.multiplyMatrices(into, h.owner.matrixWorld).multiply(h.offset);
      h.plume.mesh.matrixWorldNeedsUpdate = true;
      h.plume.set(l.main, vacuum, t, this.h.renderer.toneMappingExposure, l.steering);
    }
    if (this.fireLight)
      lightFires(
        this.fireLight,
        this.plumes.map((h) => h.plume),
      );
    this.blowJets(ascent, t, vacuum, levels);
  }

  /**
   * Hang what leaves `def`'s model that is not a main engine's fire (`ModelDef.jets`, jets.ts) on its nodes in `s`, a jet
   * a mouth: the one round mouth `radius` gives at the node's origin, or each found in the node's geometry as an engine's
   * nozzles are (fires.ts `exitsOf`), in the node's own frame, the gas along its -Y. A jet's thrust is shared among its
   * mouths by their areas; with `when.shed` it is the simulator's motor's (`flight`'s plan). Each is in the scene, out.
   */
  private hangJets(s: Staged | undefined, def: ModelDef, flight?: FlightData): void {
    const root = this.h.root();
    if (!s || !root || !def.jets?.length) return;
    s.group.updateMatrixWorld(true);
    for (const j of def.jets) {
      const node = s.full.getObjectByName(j.node);
      if (!node) continue;
      let part = node;
      while (part.parent && part.parent !== s.full) part = part.parent;
      const mouths: Exit[] = j.radius ? [{ x: 0, y: 0, z: 0, radius: j.radius.value }] : mouthsOf(node);
      const motor =
        'shed' in j.when
          ? flight?.plan?.craft[0]?.sheds
              ?.find((b) => b.on === (j.when as { shed: string }).shed)
              ?.motors?.find((m) => m.name === (j.when as { motor: string }).motor)
          : undefined;
      const thrust = (motor?.thrust ?? j.thrust)?.value ?? 0;
      const exit = j.exit.value / P0;
      const area = mouths.reduce((a, m) => a + m.radius ** 2, 0);
      for (const m of mouths) {
        const jet =
          j.gas === 'solid' || j.gas === 'hypergolic'
            ? new Plume(m.radius, exit, null, this.unlit, kindOf(j.burns ?? (j.gas === 'solid' ? 'solid-perchlorate' : 'hydrazine-n2o4')))
            : new GasJet(m.radius, gasKindOf(j.gas), (thrust * m.radius ** 2) / area, exit);
        jet.mesh.matrixAutoUpdate = false;
        root.add(jet.mesh);
        this.gases.push({ jet, node, at: new THREE.Matrix4().makeTranslation(m.x, m.y, m.z), def: j, part: part.name });
        this.h.veils.push(jet.mesh); // (cloud behind it shows through it: clouds.ts)
      }
    }
  }

  /**
   * Blow each jet as the run on show has it at `t`, where its node is now. One that blows `with` an engine, or is an
   * engine of its own that a fire of the flight names, as hard as that engine works (fires.ts `engineWork`: `levels` are
   * `Ascent.fireLevels`'); one from a shed body, as the simulator flies its motor from the instant the body left on this
   * run (fires.ts `shedLevel`). `vacuum`: the air the vehicle is in.
   */
  private blowJets(ascent: Ascent, t: number, vacuum: number, levels: readonly { main: number; steering: number }[]): void {
    const flies = this.flightData?.flies;
    if (!this.gases.length || !flies) return;
    const flying = ascent.flying(t);
    const first = flies.engine ? 1 : 0;
    // how hard the plan's engine `id` works now: the hardest of the fires that name it
    const works = (id: string): number => {
      let most = 0;
      (flies.fires ?? []).forEach((f, k) => {
        if (f.on !== id) return;
        const share = this.plumes.find((h) => h.level === first + k)?.share ?? 0;
        most = Math.max(most, engineWork(levels[first + k] ?? { main: 0, steering: 0 }, share));
      });
      return most;
    };
    const motors = this.flightData?.plan?.craft[0]?.sheds ?? [];
    const on = (w: JetDef['when']): number => {
      if (!flying) return 0;
      if ('with' in w) {
        if (flies.fires?.some((f) => f.on === w.with)) return works(w.with);
        const thrust = ascent.engineThrust(w.with, t);
        const installed = this.gases
          .filter((g) => 'with' in g.def.when && g.def.when.with === w.with)
          .reduce((sum, g) => sum + (g.def.thrust?.value ?? 0), 0);
        return thrust === undefined ? 0 : installed > 0 && thrust > 0 ? Math.min(1, thrust / installed) : 1;
      }
      if ('engine' in w) return works(w.engine);
      const i = flies.drops.findIndex((d) => d.on === w.shed);
      const at = ascent.drops[i]?.at ?? Infinity;
      const motor = motors.find((b) => b.on === w.shed)?.motors?.find((m) => m.name === w.motor);
      if (!motor || !Number.isFinite(at)) return 0;
      const tail = motor.impulse
        ? Math.max(0, (2 * (motor.impulse.value - motor.thrust.value * motor.burn.value)) / motor.thrust.value)
        : 0;
      return shedLevel(t, at, motor.burn.value, tail);
    };
    for (const g of this.gases) this.blow(g, on(g.def.when), vacuum, t);
  }

  /** Put jet `g` where its node is now and set it blowing at `level` in the air `vacuum` gives, at the clock's `time`. */
  private blow(g: (typeof this.gases)[number], level: number, vacuum: number, time: number): boolean {
    const root = this.h.root();
    if (!root) return false;
    // (not drawn where its node is not: a strap-on gone from sight, shed past SHED_SIGHT; the level of detail it is in aside)
    let seen = true;
    const staged = this.h.staged();
    for (let o: THREE.Object3D | null = g.node; o && o !== root; o = o.parent)
      if (!o.visible && !staged.some((st) => st.full === o)) seen = false;
    const on = seen ? level : 0;
    if (on > 0.001) {
      g.node.updateWorldMatrix(true, false);
      root.updateWorldMatrix(true, false);
      g.jet.mesh.matrix.copy(root.matrixWorld).invert().multiply(g.node.matrixWorld).multiply(g.at);
      g.jet.mesh.matrixWorldNeedsUpdate = true;
    }
    return g.jet instanceof GasJet ? g.jet.set(on, vacuum, time) : g.jet.set(on, vacuum, time, this.h.renderer.toneMappingExposure);
  }

  /**
   * In the gallery, where nothing flies: each jet that is an engine of its own burns as rated while the part that carries
   * it is chosen, in no air (as it would have fired in orbit), so the way it fires can be seen; every other is out.
   */
  private showChosen(): void {
    const chosen = this.h.selected();
    const time = performance.now() / 1000;
    let changed = false;
    for (const g of this.gases) changed = this.blow(g, 'engine' in g.def.when && chosen === g.part ? 1 : 0, 1, time) || changed;
    if (changed) this.h.redraw(); // (it flickers by the time: drawn again each frame while it burns, and once as it goes out)
  }

  /** Every jet's mesh, for `Stage.warm` to show for a frame, so that the march's shader is built before anyone looks. */
  jetMeshes(): THREE.Object3D[] {
    return this.gases.map((g) => g.jet.mesh);
  }

  /**
   * For tests (tools/fires-test.mjs): each jet hung, as it stands: its node, its gas, how hard it blows, whether it is
   * drawn, its mouth and the way its gas goes in the world, and its node's origin and -Y there.
   */
  jetReport(): { node: string; gas: string; on: number; drawn: boolean; mouth: number[]; axis: number[]; at: number[]; out: number[] }[] {
    return this.gases.map((g) => {
      g.jet.mesh.updateWorldMatrix(true, false);
      g.node.updateWorldMatrix(true, false);
      let drawn = g.jet.mesh.visible;
      for (let o = g.jet.mesh.parent; o; o = o.parent) drawn &&= o.visible;
      const m = g.jet.mesh.matrixWorld.elements;
      const n = g.node.matrixWorld.elements;
      return {
        node: g.def.node,
        gas: g.def.gas,
        on: g.jet.on,
        drawn,
        mouth: new THREE.Vector3().setFromMatrixPosition(g.jet.mesh.matrixWorld).toArray(),
        axis: new THREE.Vector3(-m[4]!, -m[5]!, -m[6]!).normalize().toArray(),
        at: new THREE.Vector3().setFromMatrixPosition(g.node.matrixWorld).toArray(),
        out: new THREE.Vector3(-n[4]!, -n[5]!, -n[6]!).normalize().toArray(),
      };
    });
  }

  /**
   * For tests (tools/fires-test.mjs): each fire hung, as it stands: which of the flight's it is (`level`: `flies.engine`
   * first if there is one, then each of `flies.fires` in order), the part that carries it, how hard it burns, whether it
   * is drawn, its exit's middle and the part's bounds in the world, the node it was hung at (`flies.fires`' `node`, or
   * `flies.engine`) and that node's bounds, and how many chambers of each kind it has.
   */
  fireReport(): {
    level: number;
    owner: string;
    node: string;
    nodeBox: number[][];
    on: number;
    steering: number;
    drawn: boolean;
    exit: number[];
    box: number[][];
    chambers: number[];
  }[] {
    return this.plumes.map((h) => {
      h.plume.mesh.updateWorldMatrix(true, false);
      const box = new THREE.Box3().setFromObject(h.owner);
      const own = new THREE.Box3().setFromObject(h.node);
      let shown = h.plume.mesh.visible;
      for (let o = h.plume.mesh.parent; o; o = o.parent) shown &&= o.visible;
      return {
        level: h.level,
        owner: h.owner.name,
        node: h.node.name,
        nodeBox: [own.min.toArray(), own.max.toArray()],
        on: h.plume.on,
        steering: h.plume.steering,
        drawn: shown,
        exit: new THREE.Vector3().setFromMatrixPosition(h.plume.mesh.matrixWorld).toArray(),
        box: [box.min.toArray(), box.max.toArray()],
        chambers: [h.plume.cluster?.main.length ?? 1, h.plume.cluster?.steering.length ?? 0],
      };
    });
  }

  /**
   * Hang the flown vehicle's fires, measured as it stands on the pad: `Flight.flies.engine`'s (one round exit at its
   * node's lowest middle, its area the trajectory's or its stage's), then each of `flies.fires`: one round exit of the
   * `radius` given, or, with none given, the nozzles found in the node's geometry (fires.ts `exitsOf`: an engine of
   * several chambers, main and steering). Each is carried by the top-level part of the model that holds its node.
   */
  hangPlume(flight: FlightData): void {
    const gone = [...this.plumes.map((h) => h.plume.mesh), ...this.gases.map((g) => g.jet.mesh), this.trail?.mesh];
    for (const g of this.gases) g.jet.dispose();
    this.gases = [];
    this.h.veils.splice(0, this.h.veils.length, ...this.h.veils.filter((o) => !gone.includes(o as THREE.Mesh)));
    // (their meshes draw nothing, but the clouds' pass has drawn them among the veils, so the renderer holds their geometry)
    for (const h of this.plumes) h.plume.dispose();
    this.plumes = [];
    this.fireLight?.removeFromParent();
    this.fireLight = null;
    this.trail?.mesh.removeFromParent();
    this.trail?.dispose();
    this.trail = null;
    const s = this.flier;
    const root = this.h.root();
    if (!s || !root || !flight.flies) return;
    s.group.updateMatrixWorld(true);
    const fromGroup = new THREE.Matrix4().copy(s.group.matrixWorld);
    const intoGroup = fromGroup.clone().invert();
    const light = new THREE.PointLight(0xffb468, 0, 0, 2);
    light.name = 'PlumeLight';
    // the lowest middle of a node's bounds as the vehicle stands, in its frame
    const lowest = (node: THREE.Object3D): THREE.Vector3 => {
      const b = new THREE.Box3().setFromObject(node);
      return s.group.worldToLocal(new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y, (b.min.z + b.max.z) / 2));
    };
    // the pressure each engine's gas leaves its nozzle at, atmospheres, by the plan's engine (sim/plan.ts `Nozzle`); an engine
    // whose plan gives none is drawn matched to the air at the sea, widening only as the air thins below that
    const engines = flight.plan?.craft[0]?.engines ?? [];
    const hang = (
      node: THREE.Object3D,
      level: number,
      radius: number,
      exit: number,
      at: THREE.Vector3,
      cluster: Cluster | null,
      burns?: Burns,
      mount?: THREE.Matrix4,
    ): void => {
      let owner = node;
      while (owner.parent && owner.parent !== s.full) owner = owner.parent;
      if (!owner.parent) owner = s.group;
      owner.updateWorldMatrix(true, false);
      const offset = new THREE.Matrix4()
        .copy(owner.matrixWorld)
        .invert()
        .multiply(fromGroup)
        .multiply(mount ?? new THREE.Matrix4().makeTranslation(at));
      const plume = new Plume(radius, exit, cluster, light, kindOf(burns));
      plume.mesh.matrixAutoUpdate = false;
      plume.mesh.matrix.copy(new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(owner.matrixWorld).multiply(offset));
      root.add(plume.mesh);
      this.plumes.push({ plume, owner, node, offset, level, share: cluster?.steeringShare ?? 0 });
    };
    let level = 0;
    if (flight.flies.engine) {
      const engine = s.full.getObjectByName(flight.flies.engine);
      // (the engine on the body whose model nodes hold it, or the first body's: what stands on the pad)
      const craft = flight.plan?.craft[0];
      const body = craft?.bodies.find((b) => b.nodes?.includes(flight.flies?.engine ?? '')) ?? craft?.bodies[0];
      const lit = craft?.engines.find((e) => e.body === body?.id);
      const exitArea = lit ? exitAreaOf(lit) : undefined;
      if (engine && exitArea) hang(engine, level, Math.sqrt(exitArea / Math.PI), plumeExit(lit), lowest(engine), null, flight.flies.burns);
      level++;
    }
    for (const f of flight.flies.fires ?? []) {
      const node = s.full.getObjectByName(f.node);
      // (its engine by the id it burns by; the braking burn's is the plan's braking engine)
      const exit = plumeExit(engines.find((e) => e.id === f.on));
      if (node && f.radius) {
        const mount = f.mount ? intoGroup.clone().multiply(node.matrixWorld) : undefined;
        hang(node, level, f.radius, exit, lowest(node), null, f.burns, mount);
      } else if (node) {
        // every vertex under it, in the vehicle's frame as it stands
        const points: number[] = [];
        const p = new THREE.Vector3();
        node.updateWorldMatrix(true, true);
        node.traverse((o) => {
          const position = (o as THREE.Mesh).isMesh ? (o as THREE.Mesh).geometry.getAttribute('position') : undefined;
          if (!position) return;
          const m = new THREE.Matrix4().multiplyMatrices(intoGroup, o.matrixWorld);
          for (let i = 0; i < position.count; i++) points.push(...p.fromBufferAttribute(position, i).applyMatrix4(m).toArray());
        });
        const cluster = clusterOf(exitsOf(points));
        if (cluster) {
          const { x, y, z } = cluster.centre;
          hang(
            node,
            level,
            cluster.radius,
            exit,
            new THREE.Vector3(x, y, z),
            cluster.main.length > 1 || cluster.steering.length ? cluster : null,
            f.burns,
          );
        }
      }
      level++;
    }
    const def = this.h.defs().find((m) => m.id === this.ascent?.model);
    if (def) this.hangJets(s, def, flight);
    if (!this.plumes.length) return;
    s.group.add(light); // (in the scene at no strength until a fire burns: lighting it builds no shader)
    this.fireLight = light;
    // the trail leaves from the middle of the fires lit at liftoff, as wide as they are spread
    const ascent = this.ascent;
    const lit = ascent?.fireLevels(
      1,
      Array.from({ length: level }, (_, i) => this.plumes.find((h) => h.level === i)?.share ?? 0),
    ).levels;
    const first = this.plumes.filter((h) => (lit?.[h.level]?.main ?? 0) > 0);
    const from = first.length ? first : this.plumes.slice(0, 1);
    const at = (h: (typeof this.plumes)[number]) =>
      new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().multiplyMatrices(intoGroup, h.owner.matrixWorld).multiply(h.offset));
    let area = 0;
    this.trailFrom.set(0, 0, 0);
    for (const h of from) {
      const a = h.plume.radius ** 2;
      this.trailFrom.addScaledVector(at(h), a);
      area += a;
    }
    this.trailFrom.divideScalar(area);
    const spread = Math.max(...from.map((h) => Math.hypot(at(h).x - this.trailFrom.x, at(h).z - this.trailFrom.z)));
    // (where the site sends the exhaust: into a flame pit and out of its open side, or out over the concrete all round)
    const way = (flight as Partial<SitedFlight>).site?.exhaust;
    const bearing = THREE.MathUtils.degToRad((way?.toward.value ?? 0) - ((flight as Partial<SitedFlight>).site?.bearingX.value ?? 0));
    this.trail = new Trail(
      2.5 + spread,
      way
        ? { toward: [Math.cos(bearing), Math.sin(bearing)], depth: way.depth.value, out: way.out.value, width: way.width.value }
        : undefined,
      () => this.h.setting().air?.air.clouds?.wind ?? [0, 0],
    );
    this.h.scene.add(this.trail.mesh);
    this.h.veils.push(...this.plumes.map((h) => h.plume.mesh), this.trail.mesh); // (cloud behind them shows through them: clouds.ts)
  }

  /**
   * Have everything the flight will put in the scene made now, unseen: the frost that comes off at liftoff, the glow
   * of the entry, the attitude jets, the parachutes. Each was made the first time it was wanted, and its shader built
   * there and then, with the page stopped for it in the middle of the flight (141 ms at liftoff). Made here, hidden
   * as they are until their moment, they are in the scene when `warm` has every shader built, and shown to it (`uncover`).
   */
  rehearse(): void {
    const ascent = this.ascent;
    const s = this.flier;
    const clock = this.h.clock();
    if (!ascent || !s || !clock || this.h.plain) return;
    const def = this.h.defs().find((m) => m.id === ascent.model)!;
    const pad = new THREE.Quaternion().setFromAxisAngle(UP, def.rotationY ?? 0);
    const t = clock.t;
    s.group.updateMatrixWorld(true);
    this.h
      .effects()
      ?.set(t, false, s.group, s.full, clock.rate, this.h.renderer.toneMappingExposure, this.h.setting().sunIntensity, this.h.veils);
    this.hang(ascent, s, pad, t, false);
  }

  /**
   * The flown vehicle, in the scene's frame (also during the draw): its middle into `out`, its long axis into `axis`; the
   * radius of a ball round what is left of it, and half its length and its breadth along and across that axis. Null if
   * nothing flies.
   */
  vessel(out: THREE.Vector3, axis?: THREE.Vector3): { radius: number; half: number; across: number } | null {
    // (as the camera last measured it this frame, not measured again: in the draw every world matrix is the eye's, and
    // what `craft` keeps, the seat's, must not be taken then)
    const c = this.crafted;
    const of = this.flier;
    if (!c || !of || c.of !== of || !this.lifted.flying) return null;
    absolute(out.copy(c.centre).applyMatrix4(of.group.matrixWorld));
    const size = c.size;
    const long = size.x >= size.y && size.x >= size.z ? 0 : size.y >= size.z ? 1 : 2;
    axis?.setFromMatrixColumn(of.group.matrixWorld, long).normalize();
    const across = (long === 0 ? Math.max(size.y, size.z) : long === 1 ? Math.max(size.x, size.z) : Math.max(size.x, size.y)) / 2;
    return { radius: c.radius, half: size.getComponent(long) / 2, across };
  }
}

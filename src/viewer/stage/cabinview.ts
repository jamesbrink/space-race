import * as THREE from 'three';
import type { ModelDef } from '../../types.ts';
import { ease } from '../../util/math.ts';
import type { Cabin, CabinThing } from '../cabin.ts';
import { AT_GLASS, leanPath } from '../camera/head.ts';
import type { Cameras, RigId } from '../camera/index.ts';
import type { Craft } from '../camera/rig.ts';
import type { Staged } from '../lod.ts';
import { type LookoutDef, lookoutsOf, windowAt } from '../lookouts.ts';
import type { Walker } from '../onfoot/walk.ts';
import { through } from '../pick.ts';

const UP = new THREE.Vector3(0, 1, 0);

/** A seat as the cabin view needs it: its model's definition and level, and the frame of its eyes in the scene. */
export type Sitting = { def: ModelDef; group: THREE.Object3D; eyes: THREE.Matrix4 };

/** What the view from a seat asks of the stage. */
export interface CabinViewHost {
  readonly cam: Cameras;
  walk(): Walker;
  /** The bounds of the models on show. */
  readonly bounds: THREE.Sphere;
  defs(): readonly ModelDef[];
  staged(): readonly Staged[];
  current(): number;
  /** The stage shows an exhibit (the gallery's): its seats are sat in where it stands. */
  exhibit(): boolean;
  /** The model the flight carries off the pad, if there is one. */
  flown(): string | undefined;
  /** The flown vehicle as the camera needs it (the exhibit, if nothing flies). */
  craft(): Craft | null;
  /** The inside of the model that has one. */
  cabin(): Cabin | null;
  /** The couch boarded on foot, if one is (onfoot/onfoot.ts). */
  boarded(): { model: string; seat: NonNullable<ModelDef['seats']>[number]; node: THREE.Object3D } | null;
  /** The part of the section a node is in. */
  partOf(name: string): string | null;
  /** What the vehicle has let go, each node in its holder. */
  shed(): readonly { node: THREE.Object3D }[];
  redraw(): void;
  /** Something that casts a shadow has changed: the maps and the frame are drawn again. */
  reshade(): void;
  /** What can be looked out of has changed (a seat taken or left). */
  onSeat(): void;
  /** What is leant to has changed. */
  onLean(at: number | null): void;
}

/**
 * The view from a seat (stage/cabinview.ts; camera.md): which seat is sat in, at a site or in the gallery's exhibit,
 * what can be looked out of from it and the lean to a window or the periscope, the way in to a port found in the
 * model itself (`approach`), and what of the model is not drawn from inside it.
 */
export class CabinView {
  constructor(private readonly h: CabinViewHost) {}

  /** Back from a lean by another way than asking (0, another camera, out of the seat): the page's buttons are told. */
  unleant(): void {
    if (this.leanAt !== null && this.leaning === null) {
      this.leanAt = null;
      const cabin = this.h.cabin();
      if (cabin) cabin.watched = false;
      this.h.onLean(null);
    }
  }

  /**
   * The seat being sat in, if the view is from one: the on-board view's (the flown vehicle's first seat), or the couch
   * boarded on foot. Its model's definition and level, and the frame of its eyes in the scene (+Z where they rest).
   */
  sitting(): { def: ModelDef; group: THREE.Object3D; eyes: THREE.Matrix4 } | null {
    if (this.h.walk().active) {
      const b = this.h.boarded();
      const at = b ? this.h.defs().findIndex((m) => m.id === b.model) : -1;
      if (!b || at < 0) return null;
      b.node.updateWorldMatrix(true, false);
      const eyes = b.node.matrixWorld.clone().multiply(new THREE.Matrix4().makeTranslation(...(b.seat.eye ?? ([0, 0, 0] as const))));
      return { def: this.h.defs()[at]!, group: this.h.staged()[at]!.group, eyes };
    }
    if (this.h.cam.rig !== 'onboard') return null;
    const seat = this.h.craft()?.seat;
    const at = this.seatHolder;
    return seat && at >= 0 ? { def: this.h.defs()[at]!, group: this.h.staged()[at]!.group, eyes: seat } : null;
  }

  /**
   * The model whose seats the on-board view is from: at a site the flown vehicle's; on a stage that shows an exhibit
   * (`exhibit`: the gallery's), the model on show. -1: none.
   */
  get seatHolder(): number {
    if (this.h.flown() !== undefined) return this.h.defs().findIndex((m) => m.id === this.h.flown());
    return this.h.exhibit() ? this.h.current() : -1;
  }

  /** Which of the seat holder's seats the on-board view is from (the site's is always its first). */
  seatAt = 0;

  /** What each of the exhibit's seats is called (`ModelDef.seats[].label`): empty where it has none, or nothing is an exhibit. */
  get seatLabels(): string[] {
    return this.h.exhibit() ? (this.h.defs()[this.seatHolder]?.seats ?? []).map((s) => s.label) : [];
  }

  /** The exhibit's seat being sat in (an index into `seatLabels`), or null. */
  get seat(): number | null {
    return this.h.exhibit() && this.h.cam.rig === 'onboard' ? this.seatAt : null;
  }

  /** The exhibit's seat `n`'s node (ModelDef.seats[].node): the address's word for it. */
  seatName(n: number): string | null {
    return this.h.exhibit() ? (this.h.defs()[this.seatHolder]?.seats?.[n]?.node ?? null) : null;
  }

  /**
   * Sit in the exhibit's seat `n`, or with null get out of the one sat in: back to the view the seat was taken from, as
   * it was left (camera/index.ts `unseat`). From one seat to another the eye is carried across. Each is an explicit act:
   * nothing else puts the camera in a seat. The seat's part must be on show (`Stage.only`): false if it is not.
   */
  sit(n: number | null): boolean {
    if (!this.h.exhibit()) return false;
    const at = this.seatHolder;
    const seats = this.h.defs()[at]?.seats ?? [];
    const on = this.h.cam.rig === 'onboard';
    if (n === null) {
      if (on) this.h.cam.unseat();
      return true;
    }
    if (!seats[n]) return false;
    if (on && n === this.seatAt) return true;
    const was = this.seatAt;
    this.seatAt = n;
    if (!this.h.craft()?.seat) {
      this.seatAt = was;
      return false;
    }
    if (!on) {
      this.h.cam.set('onboard');
      return (this.h.cam.rig as RigId) === 'onboard';
    }
    // from one seat to the next: the other man's helmet is drawn again, this one's not
    this.showSeatHidden(at, seats[was]?.hide, true);
    this.showSeatHidden(at, seats[n]!.hide, false);
    this.h.cam.reseat();
    this.h.reshade();
    this.h.onSeat();
    return true;
  }

  /** The box round the seated model's cabin (`CabinDef.within`, else the part the seat is in), a metre added all round; null if there is none. */
  cabinBox(): THREE.Box3 | null {
    const at = this.seatHolder;
    const def = this.h.defs()[at];
    const full = this.h.staged()[at]?.full;
    if (!def || !full) return null;
    const seat = def.seats?.[this.seatAt]?.node;
    const names = def.cabin?.within ?? (seat ? [this.h.partOf(seat) ?? ''] : []);
    const box = new THREE.Box3();
    for (const n of names) {
      const node = full.getObjectByName(n);
      if (node) box.expandByObject(node);
    }
    return box.isEmpty() ? null : box.expandByScalar(1);
  }

  /** What can be looked out of from the seat being sat in (lookouts.ts): its windows, then its periscope. Empty when not in one. */
  lookouts(): LookoutDef[] {
    return lookoutsOf(this.sitting()?.def.cabin);
  }

  /** Which of `lookouts` the pilot is leaning to, or null. */
  get leaning(): number | null {
    const out = this.h.walk().active
      ? this.h.boarded() !== null && this.h.walk().head.looking()
      : this.h.cam.rig === 'onboard' && this.h.cam.onboard.looking;
    return out ? this.leanAt : null;
  }

  /**
   * Lean to the `n`th of `lookouts` and look out of it, or come back to the seat (null, or the one already leant to
   * asked again). A window is looked out of from just inside its pane, along it: what is seen is the scene itself.
   * The periscope is leant to until its screen fills the view, at its wide power. Says what to say, if anything.
   */
  leanTo(n: number | null): string | null {
    const seat = this.sitting();
    const list = lookoutsOf(seat?.def.cabin);
    const to = n === null || n === this.leaning ? null : (list[n] ?? null);
    const head = this.h.walk().active ? this.h.walk().head : this.h.cam.onboard;
    let said: string | null = null;
    if (!seat || !to) {
      head.lean(null);
      this.leanAt = null;
    } else if (to.periscope) {
      const screen = this.h.cabin()?.screen;
      if (!screen) return null;
      head.lean({ kind: 'screen', at: screen.point, facing: screen.normal, radius: screen.radius });
      const fields = seat.def.cabin?.periscope?.fields ?? [];
      const power = this.h.cabin()?.power(0) ?? 0;
      said = fields.length > 1 ? `Low power · ${fields[power]}° · click the screen for high` : null;
      this.leanAt = n;
    } else {
      const w = seat.def.cabin!.windows![to.window!]!;
      seat.group.updateWorldMatrix(true, false);
      const at = new THREE.Vector3(...w.at).applyMatrix4(seat.group.matrixWorld);
      const out = new THREE.Vector3(...w.out).transformDirection(seat.group.matrixWorld);
      head.lean({ kind: 'port', at, across: w.across, ...this.approach(seat, at, out, w.across) });
      this.leanAt = n;
    }
    const cabin = this.h.cabin();
    if (cabin) cabin.watched = this.leanAt !== null && Boolean(list[this.leanAt]?.periscope);
    this.h.onLean(this.leanAt);
    this.h.redraw();
    return said;
  }

  leanAt: number | null = null;

  /**
   * From the seat, a click on something to look out through: a window's pane (`point` on it) leans to that window; the
   * periscope's screen leans to it, and clicked again while leant to, changes its power. Anything else comes back.
   */
  lookOut(thing: CabinThing | null): string | null {
    const seat = this.sitting();
    if (!seat || !thing?.lookout) return this.leanTo(null);
    const list = lookoutsOf(seat.def.cabin);
    if (thing.lookout === 'screen') {
      const n = list.findIndex((l) => l.periscope);
      if (n < 0) return null;
      if (this.leaning !== n) return this.leanTo(n);
      const fields = seat.def.cabin?.periscope?.fields ?? [];
      const power = this.h.cabin()?.power() ?? 0;
      return fields.length > 1 ? `${power ? 'High' : 'Low'} power · ${fields[power]}° · click again to change` : null;
    }
    const n = thing.point ? this.lookoutAt(thing.point) : -1;
    return n < 0 ? null : this.leanTo(n);
  }

  /**
   * The line to lean in along and look out of a window by (its pane's middle `at`, facing out `out`, `across` its glass),
   * in the scene: square to the pane if that is clear, or as little toward the line from the eyes at rest to the pane as
   * is. Clear is that the eyes' way there passes through nothing and that from where they stop the middle of the glass
   * and most of its breadth can be seen. What stands in a cabin is the cabin's (a box in front of a port, the hoses
   * across it), so this is asked of the model and not of the data. The line from the eyes is the last resort: if the
   * pane can be seen from the seat, it is clear.
   */
  private approach(
    seat: { def: ModelDef; group: THREE.Object3D; eyes: THREE.Matrix4 },
    at: THREE.Vector3,
    out: THREE.Vector3,
    across: number,
  ): { out: THREE.Vector3; stop: number } {
    const at0 = this.h.staged()[this.h.defs().indexOf(seat.def)]!;
    const root = at0.full; // (the cabin is the full level's: a coarser one has no inside to be in the way)
    const rest = new THREE.Vector3().setFromMatrixPosition(seat.eyes);
    const sight = at.clone().sub(rest).normalize();
    const caster = new THREE.Raycaster();
    const hidden = (o: THREE.Object3D | null): boolean => (o ? !o.visible || hidden(o.parent) : false);
    const glass = (o: THREE.Object3D) => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      return (Array.isArray(m) ? m[0] : m)?.name.startsWith('glass') ?? false;
    };
    // (straight from a to b, short of b by a centimetre: does it meet anything but glass? With `r`, nor do the four lines
    // `r` to either side of it: a tube that much round the line)
    const across3 = new THREE.Vector3();
    const up3 = new THREE.Vector3();
    const line = (a: THREE.Vector3, b: THREE.Vector3): boolean => {
      const far = a.distanceTo(b) - 0.01;
      if (far <= 0) return false;
      caster.set(a, b.clone().sub(a).normalize());
      caster.far = far;
      return through(caster, [root], (g) => this.h.walk().solids.tree(g), true).some((h) => !hidden(h.object) && !glass(h.object));
    };
    const blocked = (a: THREE.Vector3, b: THREE.Vector3, r = 0): boolean => {
      if (line(a, b)) return true;
      if (!r) return false;
      const d = b.clone().sub(a).normalize();
      across3.crossVectors(d, Math.abs(d.y) < 0.9 ? UP : new THREE.Vector3(1, 0, 0)).normalize();
      up3.crossVectors(d, across3);
      for (const o of [across3, across3.clone().negate(), up3, up3.clone().negate()])
        if (line(a.clone().addScaledVector(o, r), b.clone().addScaledVector(o, r))) return true;
      return false;
    };
    const side = new THREE.Vector3().crossVectors(out, Math.abs(out.y) < 0.9 ? UP : new THREE.Vector3(1, 0, 0)).normalize();
    const lift = new THREE.Vector3().crossVectors(out, side);
    // most of the glass's breadth, all round
    const rim = Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * 2 * Math.PI;
      return at
        .clone()
        .addScaledVector(side, 0.4 * across * Math.cos(a))
        .addScaledVector(lift, 0.4 * across * Math.sin(a));
    });
    const curve = new THREE.Vector3();
    const cone = new THREE.Vector3();
    // (something in the picture nearer than the visor would be, looking along `dir` from `eye`: rays round the line, a
    // lens's half-width out)
    const crowded = (eye: THREE.Vector3, dir: THREE.Vector3): boolean => {
      const a3 = new THREE.Vector3().crossVectors(dir, Math.abs(dir.y) < 0.9 ? UP : new THREE.Vector3(1, 0, 0)).normalize();
      const b3 = new THREE.Vector3().crossVectors(dir, a3);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * 2 * Math.PI;
        cone
          .copy(dir)
          .addScaledVector(a3, 0.55 * Math.cos(a))
          .addScaledVector(b3, 0.55 * Math.sin(a))
          .normalize();
        if (blocked(eye, eye.clone().addScaledVector(cone, 0.09))) return true;
      }
      return false;
    };
    // the best there is: the least of the glass hidden (its middle counts twice), nearest the glass, nearest square to it
    let best: { out: THREE.Vector3; stop: number; hid: number } | null = null;
    for (const stop of AT_GLASS) {
      for (let k = 0; k <= 1.0001; k += 0.1) {
        const dir = out.clone().lerp(sight, k).normalize();
        const eye = at.clone().addScaledVector(dir, -stop);
        // how much of the glass is hidden from where the eyes stop
        const hid = 2 * Number(blocked(eye, at)) + rim.filter((p) => blocked(eye, p)).length;
        // (its middle and all but two of the eight round it, or it is not looking out of it)
        if (hid > 2 || (best && hid >= best.hid)) continue;
        if (crowded(eye, dir)) continue;
        // the way there, as the head will take it (head.ts leanPath, in to the pane along `dir`), with room round it
        let from = rest.clone();
        let clear = true;
        for (let i = 1; i <= 12 && clear; i++) {
          leanPath(rest, eye, null, dir, ease(i / 12), curve);
          clear = !blocked(from, curve, 0.04);
          from = curve.clone();
        }
        if (!clear) continue;
        best = { out: dir, stop, hid };
        if (!hid) return best;
      }
    }
    if (best) return best;
    // no room for a face at it: lean along the line from the eyes at rest to the pane as far as there is room, and the
    // lens brings the glass up to fill the picture from there (from the seat, if the pane can be seen at all)
    const all = rest.distanceTo(at);
    let stop = all;
    for (let go = 0.03; all - go >= AT_GLASS[0]!; go += 0.03) {
      const eye = rest.clone().addScaledVector(sight, go);
      if (blocked(rest.clone().addScaledVector(sight, go - 0.03), eye, 0.04) || crowded(eye, sight)) break;
      stop = all - go;
    }
    return { out: sight, stop };
  }

  /** Which of `lookouts` a point on a pane in the scene is (the nearest window of the seat's cabin), or -1. */
  lookoutAt(point: THREE.Vector3): number {
    const seat = this.sitting();
    if (!seat) return -1;
    const p = seat.group.worldToLocal(point.clone());
    const w = windowAt(seat.def.cabin?.windows, [p.x, p.y, p.z]);
    return lookoutsOf(seat.def.cabin).findIndex((l) => l.window === w);
  }

  /** From the seat, something is being looked out through (`leanTo`). */
  get lookingOut(): boolean {
    return this.leaning !== null;
  }

  /** The view is from the seat: nothing is labelled over the scene (the predicted path's markers would lie across the cabin). */
  aboard(): boolean {
    return this.h.cam.rig === 'onboard' && !this.h.walk().active;
  }

  /**
   * Whoever sits in the flown model's seat is aboard it, or back outside: the flight's figure of him standing on the
   * pad (`seats[].figure`) is not drawn while he is in the couch. There is one of him.
   */
  crewAboard(on: boolean): void {
    const at = this.h.defs().findIndex((m) => m.id === this.h.flown());
    for (const seat of this.h.defs()[at]?.seats ?? []) {
      const figure = this.h.staged()[this.h.defs().findIndex((m) => m.id === seat.figure)];
      if (figure && figure.group.visible === on) {
        figure.group.visible = !on;
        this.h.reshade();
      }
    }
    this.h.cabin()?.piloted(on);
  }

  /**
   * The exhibit as the camera needs it (`exhibit`): where it stands, and the eyes of the seat chosen (`seatAt`), if its
   * part is on show. It never flies.
   */
  exhibited(): Craft | null {
    if (!this.h.exhibit()) return null;
    const at = this.seatHolder;
    const staged = this.h.staged()[at];
    const seat = this.h.defs()[at]?.seats?.[this.seatAt];
    if (!staged || !seat) return null;
    const e = (this.exhibitCraft ??= {
      matrix: staged.group.matrixWorld,
      centre: new THREE.Vector3(),
      radius: 1,
      shape: 0,
      flying: false,
      seat: null,
      exhibit: true,
    });
    const key = `${at}/${this.seatAt}`;
    if (this.shownKey !== key) {
      this.shownKey = key;
      this.shownPlace = this.seatNode(at, seat);
    }
    e.matrix = staged.group.matrixWorld;
    e.radius = this.h.bounds.radius;
    const node = this.shownPlace;
    const drawn = (o: THREE.Object3D | null): boolean => !o || (o.visible && drawn(o.parent));
    if (node && drawn(node)) {
      node.updateWorldMatrix(true, false);
      e.seat = (e.seat ?? new THREE.Matrix4())
        .copy(node.matrixWorld)
        .multiply(new THREE.Matrix4().makeTranslation(...(seat.eye ?? ([0, 0, 0] as const))));
    } else e.seat = null;
    return e;
  }

  private exhibitCraft: Craft | null = null;

  private shownKey = '';

  private shownPlace: THREE.Object3D | null = null;

  /** The node a seat is (ModelDef.seats): the model's own, or, until the model has one, a placeholder made at the middle of its stand-in, facing along `look`. */
  seatNode(at: number, seat: NonNullable<ModelDef['seats']>[number]): THREE.Object3D | null {
    const level = this.h.staged()[at]?.full;
    if (!level) return null;
    let place = level.getObjectByName(seat.node);
    if (!place && seat.standIn) {
      const mesh = level.getObjectByName(seat.standIn.mesh);
      if (!mesh?.parent) return null;
      level.updateWorldMatrix(true, true);
      const middle = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
      const look = new THREE.Vector3(...seat.standIn.look).transformDirection(level.matrixWorld);
      place = new THREE.Object3D();
      place.name = seat.node;
      mesh.parent.add(place);
      place.position.copy(mesh.parent.worldToLocal(middle));
      const parent = mesh.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
      const turn = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), look);
      if (seat.standIn.up) {
        // (+Z along `look`, +Y as near `up` as that allows)
        const up = new THREE.Vector3(...seat.standIn.up).transformDirection(level.matrixWorld);
        const across = new THREE.Vector3().crossVectors(up, look).normalize();
        turn.setFromRotationMatrix(new THREE.Matrix4().makeBasis(across, new THREE.Vector3().crossVectors(look, across), look));
      }
      place.quaternion.copy(parent.multiply(turn));
      console.info(`seat ${seat.node}: a placeholder at the middle of ${seat.standIn.mesh}; the model has no such node`);
    }
    return place ?? null;
  }

  showSeatHidden(at: number, names: string[] | undefined, shown: boolean): void {
    if (!names?.length) return;
    this.h.staged()[at]?.group.traverse((o) => names.includes(o.name) && (o.visible = shown));
    // (and on what has left the model with the seat: the seat out of the ball at the ejection height, its pilot in it)
    for (const d of this.h.shed()) d.node.traverse((o) => names.includes(o.name) && (o.visible = shown));
  }
}

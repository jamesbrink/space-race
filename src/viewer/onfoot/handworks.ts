import * as THREE from 'three';
import type { ModelDef } from '../../types.ts';
import { type Fn, functionsOf, refusal, scriptedAt, sliderFor } from '../explode.ts';
import type { Staged } from '../lod.ts';

const UP = new THREE.Vector3(0, 1, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const spin = new THREE.Quaternion();

/** What the functions worked by hand ask of the stage. */
export interface HandWorksHost {
  defs(): readonly ModelDef[];
  staged(): readonly Staged[];
  /** How far apart each model is taken (its slider), 0 to 1: where the script has each function. */
  apart(): readonly number[];
  /** The clock moved hardware this frame: what is held by hand gives way to the script. */
  scripted(): boolean;
  redraw(): void;
  /** Something that casts a shadow has moved: the maps and the frame are drawn again. */
  reshade(): void;
  /** Measure what is on show again. */
  fitBounds(): void;
}

/**
 * The functions of a model's parts worked by hand (explode.ts `Fn`; walking.md): a tower raised, a jib lowered, from the
 * wheel's menu or a panel's slider, each at its own pace and held until the script next moves the hardware, then eased
 * back to it; and a function's lever held over as far as it is pushed.
 */
export class HandWorks {
  constructor(private readonly h: HandWorksHost) {}

  /** Another flight is on the stage: nothing of the last is held by hand (what is held is by model index). */
  reset(): void {
    this.handset.clear();
  }

  /**
   * Functions being worked by hand (explode.ts: Fn), by `<model index>/<function id>`: how far
   * along its travel each has been put (0 to 1), and how fast it is moving (in travels a second
   * times its pace: it eases to a stop). The slider is the script; these hold until the script
   * next moves the hardware, then ease back to it.
   */
  private readonly handset = new Map<
    string,
    { at: number; fn: Fn; v: number; pace: number; push: number; back?: boolean; lever?: number }
  >();

  /** Levers found by name in each level of detail (swingLever). */
  private readonly levers = new WeakMap<THREE.Object3D, Map<string, THREE.Object3D | null>>();

  private readonly fns = new WeakMap<object, Fn[]>();

  /** The functions of one part of a model (what it does, each workable by hand), with how far along each is and why it will not move, if it will not. */
  functions(model: string, node: string): { fn: Fn; value: number; refused: string | null }[] {
    const at = this.h.defs().findIndex((m) => m.id === model);
    const part = this.h.defs()[at]?.parts.find((p) => p.node === node);
    if (!part) return [];
    let fns = this.fns.get(part);
    if (!fns) this.fns.set(part, (fns = functionsOf(part)));
    const value = (id: string) => {
      const fn = fns!.find((f) => f.id === id);
      return this.handset.get(`${at}/${id}`)?.v ?? (fn ? scriptedAt(fn, this.h.apart()[at] ?? 0) : 0);
    };
    return fns.map((fn) => ({ fn, value: value(fn.id), refused: refusal(fn, value) }));
  }

  /**
   * Work a function by hand. `push` is 1 to run it toward the end of its travel, -1 back, 0 to
   * let go: it runs at its own pace for as long as it is pushed and eases to a stop. Returns why
   * it will not move, if it will not.
   */
  push(model: string, node: string, id: string, push: number): string | null {
    const found = this.functions(model, node).find((f) => f.fn.id === id);
    if (!found) return null;
    const at = this.h.defs().findIndex((m) => m.id === model);
    const key = `${at}/${id}`;
    if (push && found.refused) return found.refused;
    const held = this.handset.get(key) ?? { at, fn: found.fn, v: found.value, pace: 0, push: 0 };
    held.push = push;
    if (push) held.back = false; // taken in hand again
    this.handset.set(key, held);
    return null;
  }

  /** Put a function straight to a place along its travel (a slider in a panel). Returns where it now is: where it was, if it will not move. */
  set(model: string, node: string, id: string, v: number): number {
    const found = this.functions(model, node).find((f) => f.fn.id === id);
    if (!found || found.refused) return found?.value ?? 0;
    const at = this.h.defs().findIndex((m) => m.id === model);
    this.handset.set(`${at}/${id}`, { at, fn: found.fn, v: THREE.MathUtils.clamp(v, 0, 1), pace: 0, push: 0 });
    this.poseFunction(at, found.fn, v);
    return v;
  }

  private poseFunction(at: number, fn: Fn, v: number | null): void {
    for (const node of fn.nodes) this.h.staged()[at]?.hold(node, v === null ? null : sliderFor(fn, v));
    this.h.reshade();
  }

  /** A frame of the functions worked by hand: those being pushed run, the rest stay; and all of them go back to the script when the script moves. */
  run(dt: number): void {
    if (!this.handset.size) return;
    let moved = false;
    for (const [key, held] of this.handset) {
      const { fn, at } = held;
      const script = scriptedAt(fn, this.h.apart()[at] ?? 0);
      if (this.h.scripted() && !held.push) held.back = true;
      if (held.back && !held.push) {
        // the script has moved the hardware: back to where it has this function, at the function's own pace (or in a few seconds, if that is longer), and let go
        const step = dt / Math.min(fn.seconds, 6);
        held.v = Math.abs(script - held.v) <= step ? script : held.v + Math.sign(script - held.v) * step;
        if (held.v === script) {
          this.handset.delete(key);
          this.poseFunction(at, fn, null);
        } else this.poseFunction(at, fn, held.v);
        moved = true;
        continue;
      }
      // pushed, it gathers its pace over a quarter of a second; let go, it loses it as quickly
      held.pace += (held.push - held.pace) * (1 - Math.exp(-dt / 0.2));
      if (!held.push && Math.abs(held.pace) < 0.01) held.pace = 0;
      // its lever is held over as far as it is being pushed, and springs back to the middle
      if (fn.lever && held.lever !== held.pace) this.swingLever(at, fn.lever, (held.lever = held.pace));
      if (!held.pace) continue;
      const to = THREE.MathUtils.clamp(held.v + (held.pace * dt) / fn.seconds, 0, 1);
      if (to === held.v) continue;
      held.v = to;
      this.poseFunction(at, fn, to);
      moved = true;
    }
    if (moved) this.h.fitBounds();
  }

  /** Hold a lever (Part.functions: lever) over by `k` of its swing, -1 to 1, at every level of detail. */
  private swingLever(at: number, name: string, k: number): void {
    for (const level of this.h.staged()[at]?.group.children ?? []) {
      let found = this.levers.get(level);
      if (!found) this.levers.set(level, (found = new Map()));
      if (!found.has(name)) found.set(name, level.getObjectByName(name) ?? null);
      const lever = found.get(name);
      if (!lever) continue;
      const rest = ((lever.userData.rest as THREE.Quaternion | undefined) ??= lever.quaternion.clone());
      const axis = String(lever.userData.axis ?? 'z');
      const turn = THREE.MathUtils.degToRad(Number(lever.userData.swing) || 25) * k;
      lever.quaternion.copy(rest).multiply(spin.setFromAxisAngle(axis === 'x' ? X_AXIS : axis === 'y' ? UP : Z_AXIS, turn));
    }
    this.h.redraw();
  }
}

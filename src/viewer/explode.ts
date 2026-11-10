import * as THREE from 'three';
import type { Drive, Part } from '../types';

/**
 * How far along its travel a part is when the explode slider reads `t`.
 *
 * `t`      slider position, 0 (assembled) to 1 (fully apart)
 * `order`  the part's place in the sequence; 0 leaves first
 * `orders` the highest `order` in the flight
 * returns  0 (in place) to 1 (at its full `explode` offset)
 *
 * This is the whole feel of the exploded view. As written the parts leave in sequence,
 * each taking half the slider's travel, eased at both ends: the tower is gone before the
 * retropack starts to move. Alternatives worth trying: everything at once (`return t`),
 * a sharper cascade (a smaller WINDOW), or an overshoot so parts settle like hardware.
 */
export function partProgress(t: number, order: number, orders: number): number {
  const WINDOW = 0.5;
  const start = orders > 0 ? (order / orders) * (1 - WINDOW) : 0;
  const x = Math.min(1, Math.max(0, (t - start) / WINDOW));
  return x * x * (3 - 2 * x);
}

/** Where a driven vehicle's rear axle is, and how it is turned, a distance along its route. */
export interface RoutePoint {
  x: number;
  z: number;
  /** Radians about the vertical, relative to how it stood at the start. */
  heading: number;
  /** Radians per metre: how sharply the route is turning here (positive turns the heading up). */
  curvature: number;
}

/**
 * A route on the ground: a smooth curve from the origin through `points`, measured by distance.
 * The vehicle starts at the origin facing along the first leg (or backing along it).
 */
export class Route {
  readonly length: number;
  private readonly samples: { s: number; x: number; z: number; h: number }[] = [];

  constructor(points: [number, number][]) {
    const curve = new THREE.CatmullRomCurve3(
      [new THREE.Vector3(), ...points.map(([x, z]) => new THREE.Vector3(x, 0, z))],
      false,
      'centripetal',
    );
    const pts = curve.getSpacedPoints(Math.max(32, points.length * 48));
    let s = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)]!;
      const b = pts[Math.min(pts.length - 1, i + 1)]!;
      if (i) s += pts[i]!.distanceTo(pts[i - 1]!);
      this.samples.push({ s, x: pts[i]!.x, z: pts[i]!.z, h: Math.atan2(b.x - a.x, b.z - a.z) });
    }
    // headings as one continuous turn, measured from the first
    const h0 = this.samples[0]!.h;
    let last = 0;
    for (const p of this.samples) {
      let d = p.h - h0;
      while (d - last > Math.PI) d -= 2 * Math.PI;
      while (d - last < -Math.PI) d += 2 * Math.PI;
      p.h = last = d;
    }
    this.length = s;
  }

  at(distance: number): RoutePoint {
    const s = Math.min(this.length, Math.max(0, distance));
    const n = this.samples.length;
    let i = Math.min(n - 2, Math.floor((s / this.length) * (n - 1)));
    while (i > 0 && this.samples[i]!.s > s) i--;
    while (i < n - 2 && this.samples[i + 1]!.s < s) i++;
    const a = this.samples[i]!;
    const b = this.samples[i + 1]!;
    const k = b.s > a.s ? (s - a.s) / (b.s - a.s) : 0;
    return {
      x: a.x + (b.x - a.x) * k,
      z: a.z + (b.z - a.z) * k,
      heading: a.h + (b.h - a.h) * k,
      curvature: b.s > a.s ? (b.h - a.h) / (b.s - a.s) : 0,
    };
  }
}

const UP = new THREE.Vector3(0, 1, 0);

/** A part that leaves under its own power: it follows a route, turns with it, and its wheels roll and steer. */
class Driver {
  private readonly route: Route;
  private readonly pivot: THREE.Vector3;
  private readonly rolling: THREE.Object3D[] = [];
  private readonly steering: THREE.Object3D[] = [];
  private readonly spin: number;
  private readonly axis: 'x' | 'z';
  private readonly object: THREE.Object3D;
  private readonly home: THREE.Vector3;
  private readonly drive: Drive;

  // (no parameter properties: the tests load this file with Node's type stripping, which cannot erase them)
  constructor(object: THREE.Object3D, home: THREE.Vector3, drive: Drive) {
    this.object = object;
    this.home = home;
    this.drive = drive;
    this.route = new Route(drive.path);
    this.pivot = new THREE.Vector3(...drive.pivot);
    this.axis = drive.axle;
    // the top of a wheel moves along axle x up; rolling forward is positive when that is the way it faces
    const axle = this.axis === 'x' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
    const forward = new THREE.Vector3(drive.forward[0], 0, drive.forward[1]);
    this.spin = Math.sign(axle.cross(UP).dot(forward)) * (drive.reverse ? -1 : 1) || 1;
    object.traverse((o) => {
      const steered = o.name.startsWith(drive.steered);
      if (!steered && !o.name.startsWith(drive.wheels)) return;
      o.rotation.order = this.axis === 'x' ? 'YXZ' : 'YZX'; // turned about the vertical, then rolled about the axle
      this.rolling.push(o);
      if (steered) this.steering.push(o);
    });
  }

  set(k: number): void {
    const distance = k * this.route.length;
    const p = this.route.at(distance);
    // turn about the rear axle, which is what follows the route
    const turned = this.pivot.clone().applyAxisAngle(UP, p.heading);
    this.object.rotation.y = p.heading;
    this.object.position.set(this.home.x + p.x + this.pivot.x - turned.x, this.home.y, this.home.z + p.z + this.pivot.z - turned.z);
    const roll = (this.spin * distance) / this.drive.wheelRadius;
    for (const w of this.rolling) w.rotation[this.axis] = roll;
    // the front wheels point where the route is going: one wheelbase ahead of the rear axle
    const still = k <= 0 || k >= 1;
    const steer = still ? 0 : Math.atan(this.drive.wheelbase * p.curvature) * (this.drive.reverse ? -1 : 1);
    for (const w of this.steering) w.rotation.y = steer;
  }
}

/** Moves a flight's parts between their assembled and exploded positions. */
export class Exploder {
  private readonly entries: { object: THREE.Object3D; home: THREE.Vector3; part: Part; driver?: Driver }[] = [];
  private readonly orders: number;

  constructor(root: THREE.Object3D, parts: Part[]) {
    this.orders = Math.max(0, ...parts.map((p) => p.order));
    for (const part of parts) {
      const object = root.getObjectByName(part.node);
      if (!object) {
        console.warn(`explode: model has no node named ${part.node}`);
        continue;
      }
      // remember where it was built, so the model can be shown again later from a clean state
      const home = ((object.userData.home as THREE.Vector3 | undefined) ??= object.position.clone());
      this.entries.push({ object, home, part, driver: part.drive && new Driver(object, home, part.drive) });
    }
  }

  set(t: number): void {
    for (const { object, home, part, driver } of this.entries) {
      const k = partProgress(t, part.order, this.orders);
      if (driver) driver.set(k);
      else object.position.set(home.x + part.explode[0] * k, home.y + part.explode[1] * k, home.z + part.explode[2] * k);
    }
  }
}

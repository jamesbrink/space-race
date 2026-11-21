/** Terminal Earth-orbit rendezvous. Body +Y points out of its mating ring, +Z is the roll datum.
 * The ring offset is from the centre of mass. Positions, velocities and angular momenta use the
 * same inertial frame throughout, including when the active pilot changes seats: the flight's (world/earthframe.ts
 * `frameOf`), which approach.ts lays each tracking fix in and the flown runs are in, and whose +Z is the pole the
 * gravity here (world/orbit.ts, with J2) is about. */
import { add, cross, dot, length, scale, sub, unit, type Vec3 } from '../world/frames.ts';
import { coast, type State, step } from '../world/orbit.ts';
import { aboutAxis, conjugate, fromAxes, multiply, nlerp, type Quat, rotateFor, turn, unturn } from './rigid.ts';
import { tetherImpulse } from './tether.ts';

const Y: Vec3 = [0, 1, 0],
  Z: Vec3 = [0, 0, 1],
  zero: Vec3 = [0, 0, 0];
const opposed = aboutAxis(Z, Math.PI);
export interface DockBody extends State {
  q: Quat;
  /** Angular velocity in body axes, rad/s. */
  w: Vec3;
  mass: number;
  /** Principal moments, kg m², in body axes. */
  inertia: Vec3;
  port: number;
}
export interface CaptureLimits {
  stroke: number;
  radius: number;
  tilt: number;
  roll: number;
  closing: number;
  sideways: number;
  /** Maximum relative angular speed at contact, rad/s. */
  angular: number;
  retract: number;
  blocked?: boolean;
}
type Mat = [Vec3, Vec3, Vec3];
const axes: Mat = [[1, 0, 0], Y, Z];
const solve = (a: Mat, x: Vec3): Vec3 => {
  const det = dot(a[0], cross(a[1], a[2]));
  return [dot(x, cross(a[1], a[2])) / det, dot(x, cross(a[2], a[0])) / det, dot(x, cross(a[0], a[1])) / det];
};
const inertiaAt = (b: DockBody, x: Vec3): Vec3 => {
  const v = unturn(b.q, x);
  return turn(b.q, [v[0] * b.inertia[0], v[1] * b.inertia[1], v[2] * b.inertia[2]]);
};
function coastBody(b: DockBody, time: number, dt: number, force: Vec3 = zero, torque: Vec3 = zero) {
  const h = inertiaAt(b, turn(b.q, b.w));
  const rates = (q: Quat, impulse: number): Vec3 => {
    const local = unturn(q, add(h, scale(torque, impulse)));
    return [local[0] / b.inertia[0], local[1] / b.inertia[1], local[2] / b.inertia[2]];
  };
  const half = rotateFor(b.q, b.w, dt / 2);
  b.q = rotateFor(b.q, rates(half, dt / 2), dt);
  b.w = rates(b.q, dt);
  Object.assign(b, step(b, time, dt, force === zero ? undefined : () => scale(force, 1 / b.mass)));
}
const mean = (a: Vec3, b: Vec3, share: number) => add(a, scale(sub(b, a), share));
function ring(b: DockBody) {
  const arm = turn(b.q, [0, b.port, 0]);
  return { r: add(b.r, arm), v: add(b.v, cross(turn(b.q, b.w), arm)), normal: turn(b.q, Y) };
}
export function portGap(a: DockBody, b: DockBody) {
  const p = ring(a),
    q = ring(b);
  const d = sub(p.r, q.r),
    v = sub(p.v, q.v);
  const gap = dot(d, q.normal),
    closing = -dot(v, q.normal);
  const tilt = Math.acos(Math.min(1, Math.max(-1, -dot(p.normal, q.normal))));
  const z = turn(a.q, Z),
    key = turn(b.q, Z);
  const roll = Math.abs(Math.atan2(dot(cross(key, z), q.normal), dot(key, z)));
  return {
    gap,
    closing,
    offset: length(sub(d, scale(q.normal, gap))),
    sideways: length(add(v, scale(q.normal, closing))),
    angular: length(sub(turn(a.q, a.w), turn(b.q, b.w))),
    tilt,
    roll,
  };
}

export class DockPair {
  plan?: Pick<import('./plan.ts').FlightPlan, 'craft'>;
  readonly bodies: [DockBody, DockBody];
  readonly limits: CaptureLimits;
  /** The lunar module is initially bolted to a carrier. Both inherit the same rigid motion until extraction. */
  private carrierMount: { payload: Pick<DockBody, 'mass' | 'port' | 'inertia'>; mass: number; arm: number; inertia: Vec3 } | null = null;
  released: DockBody | null = null;
  tetherLength = 0;
  tension = 0;
  get mounted() {
    return this.carrierMount !== null;
  }
  mountTarget(mass: number, arm: number, inertia: Vec3) {
    if (this.phase !== 'free' || this.carrierMount || this.released) throw Error('Carrier must be mounted before docking');
    const b = this.bodies[1],
      payload = { mass: b.mass, port: b.port, inertia: b.inertia };
    const shift = (-arm * mass) / (b.mass + mass);
    const d = turn(b.q, [0, shift, 0]);
    b.r = add(b.r, d);
    b.v = add(b.v, cross(turn(b.q, b.w), d));
    const parallel = b.mass * shift ** 2 + mass * (arm + shift) ** 2;
    b.port -= shift;
    b.mass += mass;
    b.inertia = [b.inertia[0] + inertia[0] + parallel, b.inertia[1] + inertia[1], b.inertia[2] + inertia[2] + parallel];
    this.carrierMount = { payload, mass, arm, inertia };
  }
  /** Rebase the joined spacecraft and give the departed carrier its own inherited state; no instantaneous kick. */
  extract(): boolean {
    const mount = this.carrierMount;
    if (this.phase !== 'hard' || !mount) return false;
    const b = this.bodies[1],
      { mass, arm, inertia, payload } = mount;
    const state = (offset: number) => {
      const d = turn(b.q, [0, offset, 0]);
      return { r: add(b.r, d), v: add(b.v, cross(turn(b.q, b.w), d)), q: b.q, w: b.w };
    };
    const offset = b.port - payload.port;
    this.released = { ...state(offset - arm), port: 0, mass, inertia };
    Object.assign(b, state(offset), payload);
    this.carrierMount = null;
    this.couple();
    this.place(b.q, 1);
    return true;
  }
  t: number;
  phase: 'free' | 'capture' | 'hard' = 'free';
  private elapsed = 0;
  private centre: State | null = null;
  private momentum: Vec3 = zero;
  private separation: Vec3 = zero;
  private relative: Quat = opposed;
  constructor(a: DockBody, b: DockBody, limits: CaptureLimits, t = 0) {
    this.bodies = [{ ...a }, { ...b }];
    this.limits = limits;
    this.t = t;
  }

  /** Travel from the extended capture position to the hard-dock plane. */
  get closure(): number {
    if (this.phase === 'free') return 0;
    const u = Math.min(1, this.elapsed / this.limits.retract);
    return u * u * (3 - 2 * u);
  }

  private coupled() {
    const [a, b] = this.bodies,
      mass = a.mass + b.mass;
    const r = mean(a.r, b.r, b.mass / mass),
      v = mean(a.v, b.v, b.mass / mass);
    const tensor = axes.map((x) =>
      this.bodies.reduce((sum, body) => {
        const d = sub(body.r, r);
        return add(sum, add(inertiaAt(body, x), scale(sub(scale(x, dot(d, d)), scale(d, dot(d, x))), body.mass)));
      }, zero),
    ) as Mat;
    return { r, v, mass, tensor };
  }

  attempt(): boolean {
    const [a, b] = this.bodies,
      l = this.limits,
      d = portGap(a, b);
    if (
      this.phase !== 'free' ||
      l.blocked ||
      d.gap < -0.01 ||
      d.gap > l.stroke ||
      d.offset > l.radius ||
      d.tilt > l.tilt ||
      d.roll > l.roll ||
      d.closing < -0.0001 ||
      d.closing > l.closing ||
      d.angular > l.angular ||
      d.sideways > l.sideways
    )
      return false;
    this.couple();
    this.phase = 'capture';
    this.elapsed = 0;
    this.place(b.q, 0);
    return true;
  }

  private couple() {
    const [a, b] = this.bodies;
    const c = this.coupled();
    this.centre = { r: c.r, v: c.v };
    this.momentum = this.bodies.reduce(
      (h, x) => add(h, add(inertiaAt(x, turn(x.q, x.w)), scale(cross(sub(x.r, c.r), sub(x.v, c.v)), x.mass))),
      zero,
    );
    this.separation = unturn(b.q, sub(a.r, b.r));
    this.relative = multiply(conjugate(b.q), a.q);
  }

  private place(q: Quat, progress: number) {
    const [a, b] = this.bodies,
      c = this.centre!,
      m = a.mass + b.mass;
    const s = progress * progress * (3 - 2 * progress);
    const final: Vec3 = [0, a.port + b.port, 0];
    const d = turn(q, mean(this.separation, final, s));
    a.r = add(c.r, scale(d, b.mass / m));
    b.r = sub(c.r, scale(d, a.mass / m));
    b.q = q;
    a.q = multiply(q, nlerp(this.relative, opposed, s));
    const retract = turn(q, scale(sub(final, this.separation), (6 * progress * (1 - progress)) / this.limits.retract));
    // The axial draw-in and small alignment correction are internal movements. Subtract their
    // angular momentum before solving for the common rotation of the two spacecraft.
    const ds = progress < 1 ? Math.min(1e-5, 1 - progress) : 0;
    let relativeSpin: Vec3 = zero;
    if (ds > 0) {
      const later = progress + ds,
        next = nlerp(this.relative, opposed, later * later * (3 - 2 * later));
      const delta = multiply(next, conjugate(nlerp(this.relative, opposed, s)));
      relativeSpin = turn(q, scale([delta[1], delta[2], delta[3]], (2 * Math.sign(delta[0])) / (ds * this.limits.retract)));
    }
    const hInternal = add(scale(cross(d, retract), (a.mass * b.mass) / m), inertiaAt(a, relativeSpin));
    const spin = solve(this.coupled().tensor, sub(this.momentum, hInternal));
    const relativeVelocity = add(cross(spin, d), retract);
    a.v = add(c.v, scale(relativeVelocity, b.mass / m));
    b.v = sub(c.v, scale(relativeVelocity, a.mass / m));
    a.w = unturn(a.q, add(spin, relativeSpin));
    b.w = unturn(b.q, spin);
  }

  /** Skip the uneventful coast to a recorded maneuver and take up its local-horizontal attitude.
   * The navigator supplies the commanded yaw and pitch; the actual orbital state propagates from the last run. */
  coastToBurn(at: number, yaw: number, pitch: number): boolean {
    if (this.phase !== 'hard' || !this.centre || at < this.t || this.mounted || this.released) return false;
    this.centre = coast(this.centre, at - this.t);
    const pos = this.centre.r,
      vel = this.centre.v;
    const up = unit(pos),
      normal = unit(cross(pos, vel)),
      forward = cross(normal, up);
    const horizontal = add(scale(forward, Math.cos(yaw)), scale(normal, Math.sin(yaw)));
    const axis = add(scale(horizontal, Math.cos(pitch)), scale(up, Math.sin(pitch)));
    const x = unit(cross(axis, up));
    this.momentum = zero;
    this.t = at;
    this.place(fromAxes(x, axis, cross(x, axis)), 1);
    return true;
  }

  /** Force and torque are in the firing vehicle's axes, N and N m. */
  advance(dt: number, pilot: 0 | 1, force: Vec3 = zero, torque: Vec3 = zero) {
    this.advanceBoth(dt, pilot === 0 ? [force, zero] : [zero, force], pilot === 0 ? [torque, zero] : [zero, torque]);
  }

  /** Each spacecraft retains its own body-frame loads, even when the other pilot has control. */
  advanceBoth(dt: number, forces: readonly [Vec3, Vec3], torques: readonly [Vec3, Vec3]) {
    if (!(dt > 0) || !Number.isFinite(dt)) return;
    const steps = Math.ceil(dt / 0.25),
      h = dt / steps;
    for (let n = 0; n < steps; n++) {
      const [a, b] = this.bodies;
      const fa = turn(a.q, forces[0]),
        fb = turn(b.q, forces[1]);
      const ta = turn(a.q, torques[0]),
        tb = turn(b.q, torques[1]);
      if (this.phase === 'free') {
        coastBody(a, this.t, h, fa, ta);
        coastBody(b, this.t, h, fb, tb);
      } else {
        const c = this.centre!;
        const torque = add(add(ta, tb), add(cross(sub(a.r, c.r), fa), cross(sub(b.r, c.r), fb)));
        this.momentum = add(this.momentum, scale(torque, h));
        const acceleration = scale(add(fa, fb), 1 / (a.mass + b.mass));
        this.centre = step(c, this.t, h, () => acceleration);
        this.elapsed += h;
        const progress = Math.min(1, this.elapsed / this.limits.retract);
        this.place(rotateFor(b.q, b.w, h), progress);
        if (progress === 1) this.phase = 'hard';
      }
      this.tension = this.phase === 'free' && this.tetherLength > 0 ? tetherImpulse(...this.bodies, this.tetherLength, h) : 0;
      if (this.released) coastBody(this.released, this.t, h);
      this.t += h;
    }
  }

  undock(speed: number): boolean {
    if (this.phase === 'free' || !Number.isFinite(speed) || speed < 0) return false;
    const [a, b] = this.bodies,
      m = a.mass + b.mass,
      away = unit(sub(a.r, b.r));
    a.v = add(a.v, scale(away, (speed * b.mass) / m));
    b.v = sub(b.v, scale(away, (speed * a.mass) / m));
    this.phase = 'free';
    this.centre = null;
    return true;
  }
}

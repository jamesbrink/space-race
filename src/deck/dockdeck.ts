import type { Flight } from '../types.ts';
import { terminalApproach, startDockedBurn, startTether, transpositionInput, faultInput } from '../sim/approach.ts';
import { portGap } from '../sim/docking.ts';
import { elementsOf } from '../world/orbit.ts';
import { WGS84_A } from '../world/bodies.ts';
import { add, scale, type Vec3 } from '../world/frames.ts';
import { Clock, missionTime } from '../world/clock.ts';
import { is, which } from '../util/keys.ts';
import { Deck, type CockpitHost } from './deck.ts';
import { pack } from './tape.ts';
import '../ui/navball.css';
import { Navball, type NavSample } from './navball.ts';

const pulses: Record<string, Vec3> = {
  forward: [0, 1, 0],
  back: [0, -1, 0],
  left: [-1, 0, 0],
  right: [1, 0, 0],
  up: [0, 0, 1],
  down: [0, 0, -1],
};
const timeline = (id: string, label: string, unit: string, about: string) => ({ id, label, unit, about });

export class DockDeck extends Deck<Flight> {
  run = terminalApproach(this.flight);
  pilot: 0 | 1 = 0;
  firedForce: [Vec3, Vec3] = [
    [0, 0, 0],
    [0, 0, 0],
  ];
  firedTorque: [Vec3, Vec3] = [
    [0, 0, 0],
    [0, 0, 0],
  ];
  get mainFiring() {
    return !!this.powered && this.run.t < this.powered.until;
  }
  redock = false;
  transpose = false;
  private extractedAt: number | null = null;
  private burnIndex = 0;
  private powered: ReturnType<typeof startDockedBurn> = null;
  private faultEnabled = true;
  private inhibitCapture = false;
  private crewInTarget = false;
  private automatic = true;
  private hand = false;
  private tickCount = 0;
  private pulse: Vec3 = [0, 0, 0];
  private ends = -Infinity;
  private readonly ball: Navball;
  private ballSample?: (sample: NavSample, live: unknown) => void;

  constructor(parent: HTMLElement, flight: Flight, clock: Clock, host: CockpitHost) {
    super(parent, flight, clock, host, {
      figures: [
        timeline('gap', 'Port gap', 'm', 'Distance along the target’s docking axis'),
        timeline('closing', 'Closing', 'm/s', 'Relative port velocity along the docking axis'),
        timeline('offset', 'Offset', 'm', 'Sideways miss between the mating rings'),
      ],
      readings: [
        timeline('clock', 'Mission time', '', 'Elapsed time from launch'),
        timeline('tilt', 'Axis tilt', '°', 'Angle between the docking axes'),
        timeline('roll', 'Roll error', '°', 'Rotation between the clocking datums'),
        timeline('apogee', 'Apogee', 'km', 'Osculating apogee over Earth’s equatorial radius'),
        timeline('mass', 'Mass', 'kg', 'Mass under the active pilot’s control'),
      ],
      guidance: 'Hold the current attitude by damping rotation',
      sequence: 'Capture when the port enters the docking envelope',
      choose: false,
      enter: 'Fly the terminal docking approach',
      flightKeys:
        Object.keys(pulses)
          .map((d) => `<button data-do="${d}" title="Fire a one-second translation pulse">${d}</button>`)
          .join('') +
        (flight.docking?.interface === 'probe' ? '<button data-do="change-craft">Switch pilot</button>' : '') +
        (flight.docking?.fault ? '<button data-do="oams-failure">Thruster No. 8</button>' : '') +
        (flight.docking?.tether ? '<button data-do="tether-exercise">Tether rotation</button>' : '') +
        (flight.docking?.burns?.length ? '<button data-do="next-burn">Coast to burn</button>' : '') +
        (flight.docking?.interface === 'probe'
          ? '<button data-do="transpose">Separation and transposition</button><button data-do="crew-transfer">Transfer crew</button><button data-do="second">LM approach</button>'
          : ''),
    });
    this.root.classList.add('docking-deck');
    this.button.hidden = true;
    for (const query of ['[data-do="abort"]', '[data-do="path"]', '[data-skin]', '[data-press="m"]'])
      this.root.querySelector<HTMLElement>(query)?.setAttribute('hidden', '');
    const self = this;
    this.ball = new Navball(
      this.root,
      {
        get active() {
          return self.active;
        },
        frame: this.frame,
        listen: (fn) => {
          this.ballSample = fn;
        },
      },
      this.root.querySelector('[data-do="navball"]'),
    );
  }
  readonly able = true;
  readonly craft = null;
  private guided = true;
  get steering() {
    return { guidance: this.guided, sequence: this.automatic, trim: { pitch: 0, yaw: 0 } };
  }
  protected get ticks() {
    return this.tickCount;
  }
  protected get byHand() {
    return this.hand;
  }
  protected get runOver() {
    return false;
  }
  protected get framed() {
    return this.hand;
  }
  protected print() {
    return pack([
      this.run,
      this.pilot,
      this.redock,
      this.ends,
      this.pulse,
      this.guided,
      this.automatic,
      this.hand,
      this.faultEnabled,
      this.transpose,
      this.extractedAt,
      this.burnIndex,
      this.powered,
      this.inhibitCapture,
      this.crewInTarget,
    ]);
  }
  protected switches(to?: Record<string, boolean>) {
    if (to) {
      this.automatic = to.sequence ?? true;
      this.guided = to.guidance ?? true;
      this.redock = to.redock ?? false;
      this.transpose = to.transpose ?? false;
    }
    return { sequence: this.automatic, guidance: this.guided, redock: this.redock, transpose: this.transpose };
  }
  protected restore() {
    this.follow();
  }
  protected steered() {
    this.hand = true;
  }
  protected obey(what: string) {
    if (what === 'separate') this.command('next');
  }
  protected worked() {
    return null;
  }
  can() {
    return false;
  }
  headed() {
    return null;
  }
  travel() {
    return null;
  }
  enter() {
    if (this.on) return;
    this.opened();
    if (this.keeping) this.resume();
    else this.fresh();
  }
  protected fresh() {
    this.run = terminalApproach(this.flight, this.redock, this.transpose);
    this.pilot = this.redock ? 1 : 0;
    this.firedForce = [
      [0, 0, 0],
      [0, 0, 0],
    ];
    this.firedTorque = [
      [0, 0, 0],
      [0, 0, 0],
    ];
    this.faultEnabled = true;
    this.extractedAt = null;
    this.burnIndex = 0;
    this.inhibitCapture = false;
    this.crewInTarget = this.redock;
    this.powered = null;
    this.tickCount = 0;
    this.hand = false;
    this.ends = -Infinity;
    this.pulse = [0, 0, 0];
    this.clock.pause();
    this.clock.setRate(1);
    this.clock.seek(this.run.t);
    this.started();
    this.clock.play();
    this.follow();
  }
  protected command(what: string) {
    if (what === 'leave') {
      this.leave();
      return;
    }
    if (what === 'again' || what === 'second' || what === 'transpose') {
      this.redock = what === 'second';
      this.transpose = what === 'transpose';
      this.fresh();
      return;
    }
    if (what === 'navball') {
      this.ball.tuck(this.root.querySelector('[data-do="navball"]')?.getAttribute('aria-pressed') === 'true');
      return;
    }
    this.hand = true;
    if (what === 'oams-failure' && this.flight.docking!.fault) {
      if (this.run.t >= this.flight.docking!.fault.at && this.faultEnabled) this.faultEnabled = false;
      else if (this.run.coastToBurn(this.flight.docking!.fault.at, 0, 0)) {
        this.faultEnabled = true;
        this.pilot = 0;
        this.clock.seek(this.run.t);
      }
    }
    if (what === 'tether-exercise' && this.flight.docking?.tether) {
      if (this.run.tetherLength) this.run.tetherLength = 0;
      else if (this.burnIndex === this.flight.docking.burns?.length && startTether(this.run, this.flight.docking.tether)) {
        this.pilot = 0;
        this.guided = false;
        this.clock.seek(this.run.t);
      }
    }
    if (what === 'next-burn') {
      const burn = this.flight.docking!.burns?.[this.burnIndex];
      if (burn) {
        const operation = startDockedBurn(this.run, burn);
        if (operation) {
          this.powered = operation;
          this.burnIndex++;
          this.pilot = 0;
          this.clock.seek(this.run.t);
        }
      }
    }
    if (what === 'crew-transfer' && this.run.phase === 'hard' && !this.run.mounted) this.crewInTarget = !this.crewInTarget;
    if (what === 'change-craft' && this.flight.docking!.interface === 'probe') this.pilot = this.pilot ? 0 : 1;
    if (what === 'sequence') this.automatic = !this.automatic;
    if (what === 'guidance') this.guided = !this.guided;
    if (what === 'next') {
      if (this.run.phase === 'free') {
        this.inhibitCapture = false;
        this.run.attempt();
      } else if (this.run.mounted && this.run.extract()) this.extractedAt = this.run.t;
      else if (this.run.phase === 'hard') {
        // Opening the latches imparts no invented spring impulse. Translation is the pilot's next action.
        this.run.undock(0);
        this.inhibitCapture = true;
      }
    }
    if (pulses[what]) {
      this.pulse = pulses[what]!;
      this.ends = this.run.t + 1;
    }
    this.follow();
  }
  protected extraKey(key: string) {
    if (is(key, 'clock.run')) {
      this.clock.play(!this.clock.running);
      return true;
    }
    if (is(key, 'clock.rate')) {
      this.clock.step(which(key, 'clock.rate') === 0 ? -1 : 1);
      return true;
    }
    return false;
  }
  protected follow() {
    if (!this.on || !this.run) return;
    const torqueAxis: Vec3 = [
      Number(this.held.has('w')) - Number(this.held.has('s')) + this.finger.pitch,
      Number(this.held.has('e')) - Number(this.held.has('q')) + this.finger.roll,
      Number(this.held.has('a')) - Number(this.held.has('d')) + this.finger.yaw,
    ];
    const b = this.run.bodies[this.pilot];
    while (this.run.t + 0.05 <= this.clock.t + 1e-8) {
      const controls = this.flight.docking!.controls;
      const axial = this.pulse[1];
      const level = axial ? 2 * (axial > 0 ? controls.ahead : controls.astern).value : controls.lateral.value;
      const force = scale(this.pulse, this.run.t < this.ends ? level : 0);
      const authority = 2 * controls.attitude.value * b.port;
      let torque = torqueAxis.map(
        (u, i) => Math.max(-1, Math.min(1, u - (this.guided ? (b.w[i]! * b.inertia[i]!) / authority : 0))) * authority,
      ) as unknown as Vec3;
      if (this.transpose && !this.hand && this.run.phase === 'free') {
        const { force, torque } = transpositionInput(this.run, this.flight);
        this.firedForce = [force, [0, 0, 0]];
        this.firedTorque = [torque, [0, 0, 0]];
        this.run.advance(0.05, 0, force, torque);
        this.tickCount++;
        if (this.automatic) this.run.attempt();
        continue;
      }
      const forces: [Vec3, Vec3] = [
        [0, 0, 0],
        [0, 0, 0],
      ];
      const torques: [Vec3, Vec3] = [
        [0, 0, 0],
        [0, 0, 0],
      ];
      const fault = this.flight.docking!.fault;
      if (fault && this.run.t >= fault.at) {
        if (this.automatic && this.run.phase === 'hard' && this.run.t >= fault.undock && this.faultEnabled) {
          this.run.undock(0);
          this.inhibitCapture = true;
        }
        const demand = faultInput(this.run, this.flight, this.faultEnabled);
        forces[0] = demand.force;
        torques[0] = demand.torque;
        if (this.pilot === 0 && this.faultEnabled && this.run.phase === 'free' && this.run.t < fault.recovery)
          torque = torqueAxis.map((u) => u * authority) as unknown as Vec3;
      }
      forces[this.pilot] = add(forces[this.pilot], force);
      torques[this.pilot] = add(torques[this.pilot], torque);
      if (
        this.extractedAt !== null &&
        this.automatic &&
        this.run.phase === 'hard' &&
        this.flight.docking?.carrier?.pulses.some(
          (p) => this.run.t - this.extractedAt! >= p.after && this.run.t - this.extractedAt! < p.after + p.seconds,
        )
      )
        forces[0] = add(forces[0], [0, -4 * controls.astern.value, 0]);
      this.firedForce = [...forces];
      this.firedTorque = torques;
      if (this.powered && this.run.t < this.powered.until && this.run.phase === 'hard') {
        const fraction = Math.min(1, (this.powered.until - this.run.t) / 0.05);
        forces[1] = add(forces[1], [0, this.powered.thrust * fraction, 0]);
      } else this.powered = null;
      this.run.advanceBoth(0.05, forces, torques);
      this.tickCount++;
      if (this.automatic && this.run.tetherLength && this.run.t >= this.flight.docking!.tether!.releaseAt) this.run.tetherLength = 0;
      if (this.inhibitCapture && portGap(...this.run.bodies).gap > this.run.limits.stroke) this.inhibitCapture = false;
      if (this.automatic && !this.inhibitCapture && this.run.phase === 'free') this.run.attempt();
      if (this.automatic && this.run.mounted && this.run.t >= this.flight.docking!.carrier!.extractAt && this.run.extract())
        this.extractedAt = this.run.t;
    }
    const d = portGap(...this.run.bodies),
      phase = this.run.phase;
    this.put(
      'phase',
      phase === 'hard'
        ? 'Hard dock'
        : phase === 'capture'
          ? 'Retracting'
          : this.flight.docking!.interface === 'shrouded'
            ? 'Shroud obstructs docking'
            : 'Free flight',
    );
    this.put(
      'mode',
      (this.pilot ? this.flight.docking!.target : this.flight.docking!.interface === 'probe' ? 'Gumdrop' : 'Gemini') +
        (this.hand ? ' · By hand' : ' · Terminal approach'),
    );
    this.put('next', phase === 'hard' ? (this.run.mounted ? 'Extract' : 'Undock') : phase === 'capture' ? 'Retracting' : 'Capture');
    this.put('gap', d.gap.toFixed(2));
    this.put('closing', d.closing.toFixed(2));
    this.put('offset', d.offset.toFixed(2));
    this.put('tilt', ((d.tilt * 180) / Math.PI).toFixed(1));
    this.put('roll', ((d.roll * 180) / Math.PI).toFixed(1));
    this.put('mass', String(Math.round(phase === 'free' ? b.mass : this.run.bodies[0].mass + this.run.bodies[1].mass)));
    const orbit = elementsOf(b.r, b.v);
    this.put('apogee', ((orbit.a * (1 + orbit.e) - WGS84_A) / 1000).toFixed(1));
    const transfer = this.root.querySelector<HTMLButtonElement>('[data-do="crew-transfer"]');
    if (transfer) {
      transfer.disabled = phase !== 'hard' || this.run.mounted;
      transfer.textContent = this.crewInTarget ? 'Return crew to CSM' : 'Transfer crew to LM';
    }
    const failure = this.root.querySelector<HTMLButtonElement>('[data-do="oams-failure"]');
    if (failure && this.flight.docking!.fault) {
      const running = this.faultEnabled && this.run.t >= this.flight.docking!.fault.at;
      failure.textContent = running ? 'Isolate thruster No. 8' : 'Thruster No. 8';
      failure.disabled = running
        ? this.run.t >= this.flight.docking!.fault.isolate
        : phase !== 'hard' || this.run.t > this.flight.docking!.fault.at;
    }
    const strap = this.root.querySelector<HTMLButtonElement>('[data-do="tether-exercise"]');
    if (strap) {
      strap.textContent = this.run.tetherLength ? 'Release tether · ' + this.run.tension.toFixed(1) + ' N' : 'Tether rotation';
      strap.disabled =
        !this.run.tetherLength && (phase !== 'hard' || this.burnIndex !== this.flight.docking!.burns?.length || !!this.powered);
    }
    const fire = this.root.querySelector<HTMLButtonElement>('[data-do="next-burn"]');
    if (fire) {
      const next = this.flight.docking!.burns?.[this.burnIndex];
      fire.disabled = !next || phase !== 'hard' || !!this.powered;
      fire.textContent = this.powered
        ? 'Firing · ' + this.flight.docking!.burns![this.burnIndex - 1]!.label
        : next
          ? 'Coast to ' + next.label.toLowerCase()
          : 'Burns complete';
    }
    this.put('clock', missionTime(this.run.t));
    for (const [id, on] of [
      ['sequence', this.automatic],
      ['guidance', this.guided],
    ] as const)
      this.root.querySelector('[data-do="' + id + '"]')!.setAttribute('aria-pressed', String(on));
    this.ballSample?.({ t: this.run.t, r: b.r, v: b.v, attitude: b.q }, null);
  }
}

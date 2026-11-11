import './cockpit.css';
import { autopilot, blend, Tally } from './sim/autopilot.ts';
import { G0, type Results } from './sim/fly.ts';
import { type Controls, type LiveSample, type Pilot, TICK, type Vehicle, type VehicleState, vehicle } from './sim/vehicle.ts';
import type { Flight } from './types';
import type { Run } from './viewer/ascent';
import type { Clock } from './world/clock.ts';
import { angleBetween, DEG, siteFrame } from './world/frames.ts';

/**
 * Flying the flight by hand: the live simulator (sim/vehicle.ts) stepped by the clock, steered by
 * the keys, and read back on a strip of instruments. Nothing here knows which flight it is: the
 * vehicle is the flight's `trajectory`, the events offered are the ones its record has, and what
 * the scene sheds is `Flight.flies.drops`.
 *
 * The clock is the flight's own: stopped at liftoff until the engine is lit, then run. Each time
 * it moves on, the vehicle is stepped up to it; when it is stopped, so is the flight; put back,
 * it shows what was flown (the scene reads the run's samples) and the flight goes on from where
 * it had got to when the clock comes back to it.
 *
 * Guidance is the autopilot (sim/autopilot.ts) flying the record's tilt programme through the
 * same controls the keys work: a key held takes its axis from it, and G switches it off
 * altogether. The sequencer sets each event off at the record's time; Space sets the next one
 * off now.
 */

/** What Space does next, in the order a flight goes. */
type Step = 'ignite' | 'cutoff' | 'tower' | 'separate' | 'retro' | 'retropack' | 'drogue' | 'main';
const STEPS: Record<Step, string> = {
  ignite: 'Ignition',
  cutoff: 'Engine cutoff',
  tower: 'Jettison the tower',
  separate: 'Separate the spacecraft',
  retro: 'Retrofire',
  retropack: 'Jettison the retropack',
  drogue: 'Drogue parachute',
  main: 'Main parachute',
};
const PHASES: Record<LiveSample['phase'], string> = {
  powered: 'Powered flight',
  coast: 'Coasting on the booster',
  capsule: 'Spacecraft alone',
  entry: 'Re-entry',
  drogue: 'Under the drogue',
  main: 'Under the main parachute',
  landed: 'Down',
};
/** How often a sample is kept for the scene to replay, s, and the longest stretch of flight one frame may step, s. */
const KEEP = 0.1;
const MOST = 5;
/** Seconds after one event before Space will set off the next: a second press of the same finger. */
const GUARD = 1.5;
/** How fast a held key leans the programme guidance flies, radians a second, and the most it may lean. */
const TRIM = 3 * DEG;
const TRIM_MOST = 30 * DEG;

export interface CockpitHost {
  /** The run to show in the scene (viewer/ascent.ts), or null for the record's again. */
  fly(run: Run | null): void;
  /** The flight deck has been taken, or left: the page makes way and gives the view to the vehicle. */
  piloting(on: boolean): void;
}

export class Cockpit {
  private readonly flight: Flight;
  private readonly clock: Clock;
  private readonly host: CockpitHost;
  private readonly root: HTMLElement;
  private readonly button: HTMLButtonElement;
  private readonly cells = new Map<string, HTMLElement>();
  private readonly vehicle: Vehicle | null;
  /** Kilograms a second through the engine, and what there is to burn. */
  private readonly flow: number;

  private on = false;
  private state: VehicleState | null = null;
  private run: Run & { samples: LiveSample[] } = { samples: [], duration: Infinity, cutoff: Infinity, dropped: [], live: true };
  private tally = new Tally();
  /** How many of the run's samples are kept: one past them is the head, replaced each frame. */
  private kept = 0;
  private guidance = true;
  private sequence = true;
  /** What the hands are asking: axes while keys are held, events once asked for. */
  private hand: Partial<Controls> = {};
  private readonly held = new Set<string>();
  private eventAt = Number.NEGATIVE_INFINITY;
  /** How far the hands have leaned the programme guidance flies, radians (sim/autopilot.ts `trim`). */
  private trim = { pitch: 0, yaw: 0 };
  private towerAt = Infinity;
  private retropackAt = Infinity;

  constructor(parent: HTMLElement, flight: Flight, clock: Clock, host: CockpitHost) {
    this.flight = flight;
    this.clock = clock;
    this.host = host;
    const tr = flight.trajectory;
    this.vehicle = tr?.body && flight.flies ? vehicle(tr, siteFrame(flight.site), flight.site.seaLevel.value) : null;
    this.flow = tr ? tr.engine.thrust.value / (G0 * tr.engine.isp.value) : 0;

    const root = (this.root = document.createElement('aside'));
    root.className = 'cockpit';
    root.hidden = true;
    root.setAttribute('aria-label', 'Flight instruments');
    const cell = (id: string, label: string, unit: string) =>
      `<div class="gauge"><span>${label}</span><b data-cell="${id}">0</b><i>${unit}</i></div>`;
    root.innerHTML = `
      <p class="cockpit-phase"><b data-cell="phase"></b><span data-cell="mode"></span></p>
      <div class="gauges">
        ${cell('altitude', 'Height', 'km')}
        ${cell('speed', 'Ground speed', 'm/s')}
        ${cell('climb', 'Climb', 'm/s')}
        ${cell('range', 'Range', 'km')}
        ${cell('g', 'Load', 'g')}
        ${cell('q', 'Pressure', 'kPa')}
        ${cell('mach', 'Mach', '')}
        ${cell('pitch', 'Nose above level', '°')}
        ${cell('alpha', 'Off the wind', '°')}
        ${cell('fuel', 'Propellant', '%')}
      </div>
      <p class="cockpit-keys">
        <button data-do="next" class="cockpit-next"><kbd>Space</kbd> <span data-cell="next"></span></button>
        <span class="cockpit-steer"><kbd>W</kbd><kbd>S</kbd> pitch · <kbd>A</kbd><kbd>D</kbd> yaw · <kbd>Q</kbd><kbd>E</kbd> roll</span>
        <button data-do="guidance" aria-pressed="true" title="The autopilot flies the record's tilt programme; a key held takes its axis"><kbd>G</kbd> Guidance</button>
        <button data-do="sequence" aria-pressed="true" title="Events happen at the record's times; Space sets the next off now"><kbd>B</kbd> Sequencer</button>
        <button data-do="again" title="Back to the pad"><kbd>N</kbd> New flight</button>
        <button data-do="leave"><kbd>Esc</kbd> Leave</button>
      </p>
      <div class="cockpit-card" hidden></div>`;
    parent.append(root);
    for (const el of root.querySelectorAll<HTMLElement>('[data-cell]')) this.cells.set(el.dataset.cell!, el);
    root.addEventListener('click', (e) => {
      const what = (e.target as HTMLElement).closest<HTMLElement>('[data-do]')?.dataset.do;
      if (what) this.command(what);
      (document.activeElement as HTMLElement | null)?.blur?.(); // or Space would press the button again
    });

    // the way in: beside the clock, which is always on show
    this.button = document.createElement('button');
    this.button.className = 'cockpit-enter';
    this.button.textContent = 'Fly it';
    this.button.title = 'Fly this flight yourself (L)';
    this.button.hidden = !this.vehicle;
    this.button.addEventListener('click', () => (this.on ? this.leave() : this.enter()));
    (parent.querySelector('.time-row') ?? parent).append(this.button);

    window.addEventListener('keydown', (e) => this.key(e, true));
    window.addEventListener('keyup', (e) => this.key(e, false));
    window.addEventListener('blur', () => this.held.clear());
    clock.listen(() => this.follow());
  }

  get active(): boolean {
    return this.on;
  }

  /** Whether this flight can be flown by hand: it has a trajectory with a body to steer, and a model to carry. */
  get able(): boolean {
    return this.vehicle !== null;
  }

  /** Take the flight deck: the vehicle stands on its pad, the clock stopped at liftoff, waiting for ignition. */
  enter(): void {
    if (!this.vehicle || this.on) return;
    this.on = true;
    this.root.hidden = false;
    this.button.textContent = 'Leave';
    this.host.piloting(true);
    this.fresh();
  }

  leave(): void {
    if (!this.on) return;
    this.on = false;
    this.root.hidden = true;
    this.button.textContent = 'Fly it';
    this.held.clear();
    this.host.fly(null);
    this.clock.reset();
    this.host.piloting(false);
  }

  /** A new flight: back on the pad. */
  private fresh(): void {
    const v = this.vehicle!;
    this.clock.reset();
    this.state = v.start();
    this.tally = new Tally();
    this.hand = {};
    this.trim = { pitch: 0, yaw: 0 };
    this.kept = 0;
    this.eventAt = Number.NEGATIVE_INFINITY;
    this.towerAt = this.retropackAt = Infinity;
    this.run = {
      samples: [v.sample(this.state)],
      duration: Infinity,
      cutoff: Infinity,
      dropped: this.flight.flies!.drops.map(() => Infinity),
      live: true,
    };
    this.kept = 1;
    this.card(null);
    this.host.fly(this.run);
    this.show(this.run.samples[0]!);
  }

  /** Who flies each tick: the autopilot as far as it is switched on, with the hands laid over it. */
  private pilot(): Pilot {
    const auto = autopilot(this.vehicle!, {
      launch: false,
      sequence: this.sequence,
      pitch: this.guidance,
      yaw: this.guidance,
      roll: this.guidance,
      trim: () => this.trim,
    });
    const stick = (plus: string, minus: string): number => Number(this.held.has(plus)) - Number(this.held.has(minus));
    return (s) => {
      // W tips the nose down the range and S back; A swings it left of the azimuth; E rolls right
      const pitch = stick('w', 's');
      const yaw = stick('a', 'd');
      const roll = stick('e', 'q');
      // On the booster with guidance on, the stick leans the programme the platform holds (TRIM a second) and the
      // platform does the steering: the vanes at full throw would turn the stack end over end in four seconds.
      // Otherwise (guidance off, or the spacecraft alone on its gentle jets) the stick is the control itself.
      const trimmed = this.guidance && !s.shed.booster;
      if (trimmed) {
        const lean = (now: number, by: number) => Math.max(-TRIM_MOST, Math.min(TRIM_MOST, now + by * TRIM * TICK));
        this.trim = { pitch: lean(this.trim.pitch, pitch), yaw: lean(this.trim.yaw, yaw) };
      }
      const own = (v: number): number | undefined => (v !== 0 ? v : this.guidance ? undefined : 0);
      return blend(auto(s), {
        ...this.hand,
        pitch: trimmed ? undefined : own(pitch),
        yaw: trimmed ? undefined : own(yaw),
        roll: own(roll),
      });
    };
  }

  /** The clock has moved (or been stopped, or put somewhere): bring the flight up to it. */
  private follow(): void {
    const v = this.vehicle;
    let state = this.state;
    if (!this.on || !v || !state) return;
    const t = this.clock.t;
    if (t < 0) this.clock.seek(0); // there is no countdown to fly
    const ahead = t - state.t;
    if (ahead <= 0 || !state.ignited || state.landing) {
      // put back, or waiting on the pad, or down: show the moment the clock is at, as it was flown
      if (!state.ignited && t > 0) this.clock.seek(0);
      if (state.landing && t > state.landing.t) this.clock.pause();
      this.show(this.at(Math.min(t, state.t)));
      return;
    }
    const pilot = this.pilot();
    const upTo = state.t + Math.min(ahead, MOST);
    while (state.t < upTo - TICK / 2 && !state.landing) {
      const before = state;
      state = v.tick(state, pilot);
      if (state.ticks === before.ticks) break;
      const s = v.sample(state);
      this.tally.note(s, state, v);
      this.note(before, state, s);
    }
    this.state = state;
    if (ahead > MOST) this.clock.seek(state.t); // (the clock was run faster than the flight can be flown: it waits)
    // a frame's fraction of a tick is left for the next frame: the scene is shown at the flight's own instant
    this.show(this.run.samples[this.run.samples.length - 1]!);
    if (state.landing) {
      this.run.duration = state.landing.t;
      this.clock.pause();
      this.clock.seek(state.landing.t);
      this.card(this.tally.results);
    }
  }

  /** A tick has been flown: keep its sample for the scene, and the times of what happened in it. */
  private note(before: VehicleState, state: VehicleState, s: LiveSample): void {
    const run = this.run;
    const last = run.samples[this.kept - 1]!;
    const event = state.cutoff !== before.cutoff || state.shed !== before.shed || s.phase !== last.phase || Boolean(state.landing);
    run.samples.length = this.kept;
    run.samples.push(s);
    if (event || s.t - last.t >= KEEP - TICK / 2) this.kept = run.samples.length;
    if (state.cutoff && !before.cutoff) run.cutoff = state.t;
    if (state.shed.tower && !before.shed.tower) this.towerAt = state.t;
    if (state.shed.retropack && !before.shed.retropack) this.retropackAt = state.t;
    const when = { tower: this.towerAt, separation: state.separation?.t ?? Infinity, retropack: this.retropackAt };
    run.dropped = this.flight.flies!.drops.map((d) => (d.on ? when[d.on] : Infinity));
    // an event asked for has happened: the hand lets go of it
    if (state.ignited) delete this.hand.throttle;
    if (state.cutoff && this.hand.throttle === 0) delete this.hand.throttle;
  }

  /** The flight as it was at `t`: the kept sample at or before it. */
  private at(t: number): LiveSample {
    const samples = this.run.samples;
    let lo = 0;
    let hi = samples.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (samples[mid]!.t <= t) lo = mid;
      else hi = mid - 1;
    }
    return samples[lo]!;
  }

  /** What Space would do now, or null when there is nothing left to set off. */
  private next(): Step | null {
    const s = this.state;
    const tr = this.flight.trajectory!;
    if (!s || s.landing) return null;
    if (!s.ignited) return 'ignite';
    if (!s.cutoff) return 'cutoff';
    if (tr.body?.tower && !s.shed.tower) return 'tower';
    if (!s.shed.booster) return 'separate';
    if (s.retroAt === null) return 'retro';
    if (!s.shed.retropack) return 'retropack';
    if (s.drogueAt === null) return 'drogue';
    if (s.mainAt === null) return 'main';
    return null;
  }

  private command(what: string): void {
    if (!this.on) return;
    if (what === 'leave') this.leave();
    else if (what === 'again') this.fresh();
    else if (what === 'guidance') this.guidance = !this.guidance;
    else if (what === 'sequence') this.sequence = !this.sequence;
    else if (what === 'next') {
      const step = this.next();
      const now = performance.now() / 1000;
      // (put back to look at what was flown, Space runs the clock on again rather than setting anything off)
      if (this.state && this.clock.t < this.state.t - TICK) {
        this.clock.play(true);
        return;
      }
      if (!step || now - this.eventAt < GUARD) return;
      this.eventAt = now;
      if (step === 'ignite') {
        this.hand.throttle = 1;
        this.state = this.vehicle!.tick(this.state!, this.pilot()); // lit at this instant, so the clock has a flight to run
        this.clock.setRate(1);
        this.clock.play(true);
      } else if (step === 'cutoff') this.hand.throttle = 0;
      else this.hand[step] = true;
      if (!this.clock.running && step !== 'ignite') this.clock.play(true);
    }
    if (this.state) this.show(this.at(Math.min(this.clock.t, this.state.t)));
  }

  private key(e: KeyboardEvent, down: boolean): void {
    const typing = (e.target as HTMLElement).matches?.('input:not([type=range]), textarea');
    if (e.metaKey || e.ctrlKey || e.altKey || typing) return;
    const key = e.key.toLowerCase();
    if (!this.on) {
      if (down && key === 'l' && !e.repeat && this.vehicle && !this.button.hidden) this.enter();
      return;
    }
    if (['w', 'a', 's', 'd', 'q', 'e'].includes(key)) {
      if (down) this.held.add(key);
      else this.held.delete(key);
      e.preventDefault();
      return;
    }
    if (!down || e.repeat) return;
    const what = ({ ' ': 'next', g: 'guidance', b: 'sequence', n: 'again', escape: 'leave', l: 'leave' } as Record<string, string>)[key];
    if (!what) return;
    e.preventDefault();
    e.stopPropagation();
    this.command(what);
  }

  /** Put a sample on the instruments. Only what has changed touches the page. */
  private show(s: LiveSample): void {
    const tr = this.flight.trajectory!;
    const set = (id: string, text: string) => {
      const el = this.cells.get(id)!;
      if (el.textContent !== text) el.textContent = text;
    };
    const up = s.r;
    const burnable = this.flow * tr.engine.cutoff.value;
    const state = this.state!;
    set('phase', state.landing && s.t >= state.landing.t ? 'Down' : !state.ignited ? 'On the pad' : PHASES[s.phase]);
    set('altitude', (s.altitude / 1000).toFixed(s.altitude < 99_950 ? 2 : 1));
    set('speed', s.groundSpeed.toFixed(0));
    set('climb', (s.groundSpeed * Math.sin(s.groundClimb * DEG)).toFixed(0));
    set('range', (s.range / 1000).toFixed(s.range < 99_950 ? 2 : 1));
    set('g', s.g.toFixed(2));
    set('q', (s.q / 1000).toFixed(1));
    set('mach', s.mach.toFixed(2));
    set('pitch', (90 - angleBetween(s.axis, up) / DEG).toFixed(0));
    set('alpha', s.groundSpeed > 5 && s.q > 1 ? s.alpha.toFixed(1) : '–');
    set('fuel', Math.max(0, Math.min(100, (100 * (s.mass - (tr.liftoffMass.value - burnable))) / burnable)).toFixed(0));
    const replay = this.clock.t < state.t - TICK;
    const leant = (v: number, plus: string, minus: string) =>
      Math.abs(v) < 0.05 * DEG ? '' : ` ${(Math.abs(v) / DEG).toFixed(1)}° ${v > 0 ? plus : minus}`;
    const leans = state.shed.booster ? '' : leant(this.trim.pitch, 'downrange', 'back') + leant(this.trim.yaw, 'left', 'right');
    const lean = leans ? `, leaned${leans}` : '';
    const step = this.next();
    set('next', replay ? 'Run on' : step ? STEPS[step] : 'Nothing left to do');
    set(
      'mode',
      replay
        ? 'Looking back at what was flown'
        : `${this.guidance ? `Guidance flies the programme${lean}` : 'Hands only'} · ${this.sequence ? "events at the record's times" : 'events by hand'}`,
    );
    this.root.querySelector('[data-do=guidance]')!.setAttribute('aria-pressed', String(this.guidance));
    this.root.querySelector('[data-do=sequence]')!.setAttribute('aria-pressed', String(this.sequence));
    this.root.classList.toggle('thrusting', state.ignited && !state.cutoff && !replay);
  }

  /** How it ended, beside what the reports give for the flight itself. */
  private card(results: Results | null): void {
    const el = this.root.querySelector<HTMLElement>('.cockpit-card')!;
    el.hidden = !results;
    const landing = this.state?.landing;
    if (!results || !landing) return;
    const said = (id: string) => this.flight.checks?.find((c) => c.id === id)?.value;
    const row = (label: string, flown: number, id: string, per: number, unit: string, digits = 1) => {
      const record = said(id);
      return `<tr><th>${label}</th><td>${(flown / per).toFixed(digits)} ${unit}</td><td>${record === undefined ? '' : `${(record / per).toFixed(digits)} ${unit}`}</td></tr>`;
    };
    const how =
      this.state!.mainAt !== null
        ? `Down under the main parachute at ${landing.vertical.toFixed(1)} m/s`
        : this.state!.shed.booster
          ? `Down without the main parachute at ${landing.vertical.toFixed(0)} m/s`
          : `Down with the booster at ${Math.hypot(landing.vertical, landing.horizontal).toFixed(0)} m/s`;
    el.innerHTML = `
      <h3>${how}</h3>
      <table>
        <thead><tr><td></td><td>You</td><td>${this.flight.callsign}</td></tr></thead>
        ${row('Greatest height', results.apogee, 'apogee', 1000, 'km')}
        ${row('Range', results.range, 'range', 1000, 'km')}
        ${row('Time of flight', results.duration, 'duration', 1, 's', 0)}
        ${row('Greatest load going up', results.exitG, 'exitG', 1, 'g')}
        ${row('Greatest load coming down', results.entryG, 'entryG', 1, 'g')}
        ${row('Speed at the sea', results.landingSpeed, 'landingSpeed', 1, 'm/s')}
      </table>
      <p><button data-do="again"><kbd>N</kbd> Fly it again</button><button data-do="leave"><kbd>Esc</kbd> Leave</button></p>`;
  }
}

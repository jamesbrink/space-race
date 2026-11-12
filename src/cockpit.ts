import './cockpit.css';
import { prefs } from './prefs.ts';
import { autopilot, blend, Tally } from './sim/autopilot.ts';
import { G0, type Results } from './sim/fly.ts';
import { standing } from './sim/loads.ts';
import { Sheds } from './sim/shed.ts';
import { type Controls, type LiveSample, type Pilot, TICK, type Vehicle, type VehicleState, vehicle } from './sim/vehicle.ts';
import { verdict } from './sim/verdict.ts';
import type { SitedFlight } from './types';
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
  escape: 'Abort: on the escape rocket',
  capsule: 'Spacecraft alone',
  entry: 'Re-entry',
  drogue: 'Under the drogue',
  main: 'Under the main parachute',
  landed: 'Down',
};
/** How often a sample is kept for the scene to replay, s, and the longest stretch of flight one frame may step, s. */
const KEEP = 0.1;
const MOST = 5;
/** The clock runs on this long after the landing, at life's pace, for what is still moving to come to rest (the parachute lying down: viewer/chute.ts), and then stops. */
const AFTER = 12;
/** Seconds after one event before Space will set off the next: a second press of the same finger. */
const GUARD = 1.5;
/** How fast a held key leans the programme guidance flies, radians a second, and the most it may lean. */
const TRIM = 3 * DEG;
const TRIM_MOST = 30 * DEG;
/** An abort is asked for twice: the second press within this many seconds of the first. */
const ABORT_ARMED = 2;
/** A supply under this much of what it held is shown amber. */
const LOW = 0.2;
/** A step of the throttle lever, of rated thrust. */
const NOTCH = 0.05;
const FT = 0.3048;

export interface CockpitHost {
  /** The run to show in the scene (viewer/ascent.ts), or null for the record's again. */
  fly(run: Run | null): void;
  /** The flight deck has been taken, or left: the page makes way and gives the view to the vehicle. */
  piloting(on: boolean): void;
  /** The heat shield at `t` (viewer/effects.ts `reading`): its temperature and limit, K, and the stagnation-point heat flux, W/m2. */
  heat?(t: number): { name: string; temperature: number; limit: number; flux: number; warm: boolean; hot: boolean } | null;
}

export class Cockpit {
  private readonly flight: SitedFlight;
  private readonly clock: Clock;
  private readonly host: CockpitHost;
  private readonly root: HTMLElement;
  private readonly button: HTMLButtonElement;
  private readonly cells = new Map<string, HTMLElement>();
  /** The greatest dynamic pressure flown through on the booster so far, Pa: for calling it. */
  private maxQ = 0;
  private readonly vehicle: Vehicle | null;
  /** Kilograms a second through the engine, and what there is to burn. */
  private readonly flow: number;

  private on = false;
  private state: VehicleState | null = null;
  private run: Run & { samples: LiveSample[] } = {
    samples: [],
    duration: Infinity,
    cutoff: Infinity,
    dropped: [],
    live: true,
    out: { drogue: Infinity, main: Infinity },
  };
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

  constructor(parent: HTMLElement, flight: SitedFlight, clock: Clock, host: CockpitHost) {
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
    const cell = (id: string, label: string, unit: string, about: string) =>
      `<div class="gauge" title="${about}"><span>${label}</span><i>${unit}</i><b data-cell="${id}">0</b></div>`;
    const pair = (id: string, label: string, unit: string, about: string) =>
      `<div class="reading" title="${about}"><span>${label}</span><b><u data-cell="${id}">0</u>${unit ? `<i>${unit}</i>` : ''}</b></div>`;
    // a key that steers, as a button: held, it is the key held (W S A D Q E)
    const hold = (key: string, about: string) =>
      `<button data-hold="${key}" title="${about} (${key.toUpperCase()})"><kbd>${key.toUpperCase()}</kbd></button>`;
    const throttles = Boolean(flight.trajectory?.body?.engine?.throttle);
    // The deck is three panels: the navball's (navball.ts puts it in), this one in the middle, the systems on the right.
    root.innerHTML = `
      <section class="deck-main">
        <div class="cockpit-card" hidden></div>
        <p class="cockpit-phase"><b data-cell="phase"></b><span data-cell="mode"></span>
          <span class="deck-modes">
            <button data-do="guidance" class="switch" aria-pressed="true" title="Guidance: the autopilot flies the record's tilt programme, and a key held takes its axis. Off, the hands fly alone (G)"><kbd>G</kbd>Guidance</button>
            <button data-do="sequence" class="switch" aria-pressed="true" title="Sequencer: events happen at the record's times. Off, each is set off by hand with Space (B)"><kbd>B</kbd>Sequencer</button>
          </span></p>
        <div class="gauges">
          ${cell('altitude', 'Height', 'km', 'Height above the sea')}
          ${cell('speed', 'Speed', 'm/s', 'Speed over the turning Earth (Earth-fixed)')}
          ${cell('climb', 'Climb', 'm/s', 'How fast it is rising')}
          ${cell('g', 'Load', 'g', 'What an accelerometer reads')}
          ${cell('mach', 'Mach', '', 'Speed through the air over the speed of sound there')}
        </div>
        <div class="deck-act">
          <button data-do="next" class="cockpit-next" title="Set off the next event of the flight now (Space)"><kbd>Space</kbd><span data-cell="next"></span></button>
          <p class="cockpit-prompt" data-cell="prompt" role="status" hidden></p>
          <button data-do="abort" class="cockpit-abort" title="Abort on the escape rocket, while the tower is aboard: press twice (X, X)"><kbd>X</kbd><kbd>X</kbd><span data-cell="abort">Abort</span></button>
        </div>
        <p class="deck-foot">
          <span class="deck-steer for-keys">${hold('w', 'Pitch the nose downrange')}${hold('s', 'Pitch the nose back')}<em>pitch</em>${hold('a', 'Yaw left')}${hold('d', 'Yaw right')}<em>yaw</em>${hold('q', 'Roll left')}${hold('e', 'Roll right')}<em>roll</em></span>
          <span class="for-touch">Stick steers · ⟲ ⟳ roll</span>
          <button data-do="leave" class="for-keys" title="Leave the flight deck (Esc)"><kbd>Esc</kbd>Leave</button>
          <button data-do="keys" aria-expanded="false" title="Every key and control of the flight deck"><span class="for-keys">Keys</span><span class="for-touch">More</span><i class="chevron"></i></button>
        </p>
        <div class="cockpit-keys" hidden>
          <div><h4>Show</h4><p>
            <button data-do="path" class="switch" aria-pressed="true" title="The predicted path: where it goes from here, with its apogee and where it comes down (J)"><kbd>J</kbd>Path</button>
            <button data-do="navball" class="switch" aria-pressed="true" title="The navball: attitude against the horizon, prograde and retrograde (I)"><kbd>I</kbd>Navball</button>
            <button data-press="o" title="The navball's markers and speed: over the turning Earth, or in the frame that does not turn (O)"><kbd>O</kbd>Surface · orbit</button>
            <button data-press="k" title="While the engine burns, the path if it stopped now, or if guidance flies on (K)"><kbd>K</kbd>Path · coast · guided</button>
          </p></div>
          <div><h4>Camera</h4><p>
            <button data-press="c" title="The next camera (C)"><kbd>C</kbd>Next view</button>
            <button data-press="0" title="Centre the vehicle (0)"><kbd>0</kbd>Centre</button>
            <span class="deck-turn" title="Turn and tilt the view (the arrow keys)"><button data-press="arrowleft" data-held title="Turn the view left"><kbd>←</kbd></button><button data-press="arrowup" data-held title="Tilt the view up"><kbd>↑</kbd></button><button data-press="arrowdown" data-held title="Tilt the view down"><kbd>↓</kbd></button><button data-press="arrowright" data-held title="Turn the view right"><kbd>→</kbd></button><em>turn · tilt</em></span>
            <span class="deck-turn"><button data-press="r" data-held title="Zoom in (R)"><kbd>R</kbd></button><button data-press="f" data-held title="Zoom out (F)"><kbd>F</kbd></button><em>zoom</em></span>
            <button data-press="t" title="Cel shading (T)"><kbd>T</kbd>Cel</button>
            <button data-press="h" class="for-keys" title="Hide every panel; H shows them again (H)"><kbd>H</kbd>Hide panels</button>
          </p></div>
          <div><h4>Clock</h4><p>
            <button data-press="p" title="Run or stop the clock, and the flight with it (P)"><kbd>P</kbd>Run · stop</button>
            <button data-press="[" title="Time runs slower ([)"><kbd>[</kbd>Slower</button>
            <button data-press="]" title="Time runs faster (])"><kbd>]</kbd>Faster</button>
            <button data-press="u" title="Sound on or off (U)"><kbd>U</kbd>Sound</button>
          </p></div>
          <div><h4>Flight</h4><p>
            ${throttles ? '<button data-press="arrowup" title="Throttle up a notch (the up arrow)"><kbd>↑</kbd>Throttle up</button><button data-press="arrowdown" title="Throttle down a notch (the down arrow)"><kbd>↓</kbd>Down</button><button data-press="z" title="Full throttle (Z)"><kbd>Z</kbd>Full</button>' : ''}
            <button data-do="again" title="A new flight: back to the pad (N)"><kbd>N</kbd>New flight</button>
            <button data-do="leave" title="Leave the flight deck (Esc)"><kbd>Esc</kbd>Leave</button>
          </p></div>
        </div>
        <label class="cockpit-lever" hidden>Throttle <input type="range" min="0" max="1" step="0.01" value="1" data-lever title="The throttle lever (the up and down arrows; Z for full)" /></label>
      </section>
      <section class="deck-sys" aria-label="Systems">
        <div class="systems" data-cell="systems"></div>
        <div class="sys-rule"></div>
        <div class="readings">
          ${pair('q', 'Pressure', 'kPa', 'Dynamic pressure: the push of the air')}
          ${pair('alpha', 'Off wind', '°', 'The angle between the nose and the motion through the air')}
          ${pair('range', 'Range', 'km', 'Distance over the ground from the pad')}
          ${pair('pitch', 'Pitch', '°', 'The nose above the level: 90 is straight up')}
        </div>
        <em data-cell="load" class="cockpit-load" hidden title="The bending load on the stack (dynamic pressure times the angle off the wind) against what it can take: amber past four fifths, red over. Half a second over, or half as much again at once, breaks it"></em>
        <em data-cell="heat" hidden title="The heat shield's temperature against its limit, and the heat flux at its stagnation point: amber past four fifths of the limit"></em>
      </section>
      <div class="cockpit-stick" aria-hidden="true"><i></i></div>
      <div class="cockpit-roll"><button data-roll="-1" aria-label="Roll left" title="Roll left">⟲</button><button data-roll="1" aria-label="Roll right" title="Roll right">⟳</button></div>`;
    parent.append(root);
    this.systems();
    // a finger's stick, as the walk's (ui.ts): pushed up tips the nose downrange (W), left swings it left (A); the further, the harder
    const pad = root.querySelector<HTMLElement>('.cockpit-stick')!;
    const knob = pad.querySelector<HTMLElement>('i')!;
    const push = (e: PointerEvent | null) => {
      const r = pad.getBoundingClientRect();
      const reach = r.width / 2;
      let x = e ? (e.clientX - r.left - reach) / reach : 0;
      let y = e ? (e.clientY - r.top - reach) / reach : 0;
      const far = Math.hypot(x, y);
      if (far > 1) {
        x /= far;
        y /= far;
      }
      knob.style.transform = `translate(${x * reach * 0.6}px, ${y * reach * 0.6}px)`;
      this.finger.pitch = -y;
      this.finger.yaw = -x;
    };
    pad.addEventListener('pointerdown', (e) => {
      pad.setPointerCapture(e.pointerId);
      push(e);
    });
    pad.addEventListener('pointermove', (e) => {
      if (pad.hasPointerCapture(e.pointerId)) push(e);
    });
    for (const end of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) pad.addEventListener(end, () => push(null));
    for (const b of root.querySelectorAll<HTMLButtonElement>('[data-roll]')) {
      b.addEventListener('pointerdown', (e) => {
        b.setPointerCapture(e.pointerId);
        this.finger.roll = Number(b.dataset.roll);
      });
      for (const end of ['pointerup', 'pointercancel', 'lostpointercapture'] as const)
        b.addEventListener(end, () => (this.finger.roll = 0));
    }
    const lever = root.querySelector<HTMLInputElement>('[data-lever]')!;
    lever.addEventListener('input', () => this.setLever(Number(lever.value)));
    for (const el of root.querySelectorAll<HTMLElement>('[data-cell]')) this.cells.set(el.dataset.cell!, el);
    // Every key the deck shows is also a button. One that is an event (Space, G, X...) is its command; one that is held
    // (the six that steer) is that key held, for as long as the pointer is down on it; the rest press their key, so a
    // click does exactly what the key does, whoever listens for it (the camera, the clock, the navball, the path).
    const press = (key: string, down: boolean) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key }));
    root.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('button');
      if (b?.dataset.do === 'keys') this.showKeys(!root.classList.contains('keys-open'));
      else if (b?.dataset.do) this.command(b.dataset.do);
      else if (b?.dataset.press && !('held' in b.dataset)) {
        press(b.dataset.press, true);
        press(b.dataset.press, false);
      }
      (document.activeElement as HTMLElement | null)?.blur?.(); // or Space would press the button again
    });
    for (const b of root.querySelectorAll<HTMLButtonElement>('[data-hold], [data-held]')) {
      const key = b.dataset.hold ?? b.dataset.press!;
      const set = (down: boolean) => {
        if (b.classList.contains('down') === down) return;
        b.classList.toggle('down', down);
        if (!b.dataset.hold) press(key, down);
        else if (down) this.held.add(key);
        else this.held.delete(key);
      };
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault(); // (it takes no focus, so Space stays the next event's)
        try {
          b.setPointerCapture(e.pointerId); // (so that a pointer sliding off it still lets go here)
        } catch {
          // a pointer the browser no longer has: it lets go by itself
        }
        set(true);
      });
      for (const end of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) b.addEventListener(end, () => set(false));
      window.addEventListener('blur', () => set(false));
    }
    this.showKeys(prefs.get('deckKeys'), false);

    // the way in: beside the clock, which is always on show
    this.button = document.createElement('button');
    this.button.className = 'cockpit-enter';
    this.button.innerHTML = '<kbd>Esc</kbd><span>Fly it</span>';
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

  /** The list of every key and control, under the one line that is always there: opened or shut. Remembered. */
  private showKeys(open: boolean, remember = true): void {
    if (remember) prefs.set('deckKeys', open);
    this.root.querySelector<HTMLElement>('.cockpit-keys')!.hidden = !open;
    this.root.querySelector('[data-do=keys]')!.setAttribute('aria-expanded', String(open));
    this.root.classList.toggle('keys-open', open);
  }

  /** Whether this flight can be flown by hand: it has a trajectory with a body to steer, and a model to carry. */
  get able(): boolean {
    return this.vehicle !== null;
  }

  /** For the instruments that are not this one's (navball.ts, viewer/path.ts): told every sample put on show, with the live state when it is the flight's own instant (null when looking back). */
  listen(fn: (sample: LiveSample, live: VehicleState | null) => void): void {
    this.watchers.push(fn);
  }
  private readonly watchers: ((sample: LiveSample, live: VehicleState | null) => void)[] = [];

  /** The vehicle being flown, and how guidance is set: on or off, and the pilot's trim on the programme, radians. */
  get craft(): Vehicle | null {
    return this.vehicle;
  }
  get steering(): { guidance: boolean; trim: { pitch: number; yaw: number } } {
    return { guidance: this.guidance, trim: this.trim };
  }

  /** What a finger on the on-screen stick and roll buttons asks, each -1 to 1: laid over the keys. */
  private readonly finger = { pitch: 0, yaw: 0, roll: 0 };
  /** The throttle lever, 0 to 1 of rated thrust, for an engine that throttles. */
  private lever = 1;
  private abortArmed = Number.NEGATIVE_INFINITY;

  /** Move the throttle lever: only an engine whose nature has a range answers it. */
  private setLever(to: number): void {
    const range = this.flight.trajectory?.body?.engine?.throttle;
    if (!range) return;
    this.lever = Math.max(0, Math.min(range[1], to));
    const s = this.state;
    if (s?.ignited && !s.cutoff) this.hand.throttle = this.lever;
  }

  /** The strip of what the pilot has to fly with, built from the flight's data: the engine and its tanks, each jet supply, the jets, the motors. */
  private systems(): void {
    const tr = this.flight.trajectory;
    const el = this.cells.get('systems') ?? this.root.querySelector<HTMLElement>('[data-cell=systems]')!;
    if (!tr?.body) return;
    // a supply is a bar of what is left, with the figure beside it
    const tank = (id: string, label: string, about: string) =>
      `<div class="tank" title="${about}"><span>${label}</span><u class="bar"></u><b data-cell="${id}"></b><i data-cell="${id}-kg"></i></div>`;
    const supplies = tr.body.capsule.rcs?.supplies ?? [];
    const axes = tr.body.capsule.rcs ? ['pitch', 'yaw', 'roll'] : [];
    el.innerHTML = `
      <div class="tank engine" title="The engine: what it is doing, and what kind it is"><span>Engine</span><b data-cell="engine"></b><i data-cell="engine-kind"></i></div>
      <div class="tank burn" title="Propellant left of what the engine burns before its cutoff"><span>Burn left</span><u class="bar"></u><b><u data-cell="fuel"></u></b><i></i></div>
      ${this.vehicle?.tanks ? tank('oxidizer', 'Oxidizer', 'Liquid oxygen left in its tank') + tank('fuel-tank', 'Fuel', 'Fuel left in its tank') : ''}
      ${supplies.map((u, i) => tank(`rcs-${i}`, `Jets ${u.name.length > 6 ? u.name.slice(0, 4) : u.name}`, `Attitude-jet propellant left in the ${u.name} system’s tank`)).join('')}
      ${
        axes.length
          ? `<div class="tank jets" title="Which attitude jets are firing: pitch, yaw and roll, each way"><span>Jets firing</span><b>${axes
              .map((a) => `<u data-jet="${a}+">${a[0]!.toUpperCase()}+</u><u data-jet="${a}-">${a[0]!.toUpperCase()}−</u>`)
              .join('')}</b></div>`
          : ''
      }
      <div class="tank motors" title="Every motor burning now, with its thrust"><span>Burning</span><b data-cell="motors"></b></div>`;
    for (const cell of el.querySelectorAll<HTMLElement>('[data-cell]')) this.cells.set(cell.dataset.cell!, cell);
    this.root.querySelector<HTMLElement>('.cockpit-lever')!.hidden = !tr.body?.engine?.throttle;
  }

  /** Take the flight deck: the vehicle stands on its pad, the clock stopped at liftoff, waiting for ignition. */
  enter(): void {
    if (!this.vehicle || this.on) return;
    this.on = true;
    this.root.hidden = false;
    this.button.querySelector('span')!.textContent = 'Leave';
    this.button.title = 'Leave the flight deck (Esc)';
    this.host.piloting(true);
    this.fresh();
  }

  leave(): void {
    if (!this.on) return;
    this.on = false;
    this.root.hidden = true;
    this.button.querySelector('span')!.textContent = 'Fly it';
    this.button.title = 'Fly this flight yourself (L)';
    this.held.clear();
    this.finger.pitch = this.finger.yaw = this.finger.roll = 0;
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
    this.abortArmed = Number.NEGATIVE_INFINITY;
    this.kept = 0;
    this.eventAt = Number.NEGATIVE_INFINITY;
    this.towerAt = this.retropackAt = Infinity;
    this.run = {
      samples: [v.sample(this.state)],
      duration: Infinity,
      cutoff: Infinity,
      dropped: this.flight.flies!.drops.map(() => Infinity),
      live: true,
      out: { drogue: Infinity, main: Infinity },
      sheds: new Sheds(this.flight.trajectory!, siteFrame(this.flight.site), this.flight.site.seaLevel.value),
    };
    this.maxQ = 0;
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
    // (a key is all or nothing; a finger's stick is as far as it is pushed)
    const stick = (plus: string, minus: string, finger: number): number =>
      Math.max(-1, Math.min(1, Number(this.held.has(plus)) - Number(this.held.has(minus)) + finger));
    return (s) => {
      // W tips the nose down the range and S back; A swings it left of the azimuth; E rolls right
      const pitch = stick('w', 's', this.finger.pitch);
      const yaw = stick('a', 'd', this.finger.yaw);
      const roll = stick('e', 'q', this.finger.roll);
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
        // On the spacecraft an axis the hand has is worked through the manual system's own chambers and tank; what the
        // autopilot steers goes through the automatic system's. (Mercury's fly-by-wire, a hand on the automatic
        // system's chambers, is not offered.) With the sequencer off the spacecraft's own sequence is off too: no
        // parachute comes out by itself.
        manual: { pitch: own(pitch) !== undefined, yaw: own(yaw) !== undefined, roll: own(roll) !== undefined },
        automatic: this.sequence,
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
    const begun = state.ignited || state.abortAt !== null;
    if (ahead <= 0 || !begun || state.landing) {
      // put back, or waiting on the pad, or down: show the moment the clock is at, as it was flown
      if (!begun && t > 0) this.clock.seek(0);
      if (state.landing && t > state.landing.t + AFTER) {
        this.clock.pause();
        this.clock.seek(state.landing.t + AFTER);
      }
      this.show(this.at(Math.min(t, state.t)));
      return;
    }
    const pilot = this.pilot();
    const upTo = state.t + Math.min(ahead, MOST);
    while (state.t < upTo - TICK / 2 && !state.landing) {
      const before = state;
      state = this.tick(state, pilot);
      if (state.ticks === before.ticks) break;
    }
    this.state = state;
    this.run.sheds?.follow(state); // what it has let go is flown on beside it (sim/shed.ts)
    if (ahead > MOST) this.clock.seek(state.t); // (the clock was run faster than the flight can be flown: it waits)
    // a frame's fraction of a tick is left for the next frame: the scene is shown at the flight's own instant
    this.show(this.run.samples[this.run.samples.length - 1]!);
    if (state.landing) {
      // down: the flight is over at this instant, and the clock goes on from it at life's pace for a few seconds more (`AFTER`)
      this.run.duration = state.landing.t;
      this.clock.setRate(1);
      this.clock.seek(state.landing.t);
      this.card(this.tally.results);
    }
  }

  /** One tick of the flight, noted: its sample kept for the scene, its events' times, what it came to. Every tick goes through here, so none is flown unseen. */
  private tick(before: VehicleState, pilot: Pilot): VehicleState {
    const v = this.vehicle!;
    const state = v.tick(before, pilot);
    if (state.ticks === before.ticks) return state;
    const s = v.sample(state);
    this.tally.note(s, state, v);
    this.note(before, state, s);
    return state;
  }

  /** A tick has been flown: keep its sample for the scene, and the times of what happened in it. */
  private note(before: VehicleState, state: VehicleState, s: LiveSample): void {
    const run = this.run;
    const last = run.samples[this.kept - 1]!;
    const event =
      state.cutoff !== before.cutoff ||
      (Object.keys(state.shed) as (keyof typeof state.shed)[]).some((k) => state.shed[k] !== before.shed[k]) ||
      s.phase !== last.phase ||
      Boolean(state.landing);
    run.samples.length = this.kept;
    run.samples.push(s);
    if (event || s.t - last.t >= KEEP - TICK / 2) this.kept = run.samples.length;
    if (!state.shed.booster) this.maxQ = Math.max(this.maxQ, s.q);
    // (an engine shut down that was never lit, in an abort off the pad, did not burn up to now: it never burned)
    if (state.cutoff && !before.cutoff) run.cutoff = state.ignited ? state.t : Number.NEGATIVE_INFINITY;
    if (state.shed.tower && !before.shed.tower) this.towerAt = state.t;
    if (state.shed.retropack && !before.shed.retropack) this.retropackAt = state.t;
    run.out = { drogue: state.drogueAt ?? Infinity, main: state.mainAt ?? Infinity };
    const when = { tower: this.towerAt, separation: state.separation?.t ?? Infinity, retropack: this.retropackAt, ...run.out };
    run.dropped = this.flight.flies!.drops.map((d) => (d.on ? when[d.on] : Infinity));
    // an event asked for has happened: the hand lets go of it
    if (state.abortAt !== null) delete this.hand.abort;
    if (state.ignited && !this.flight.trajectory!.body?.engine?.throttle) delete this.hand.throttle;
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
    if (!s.ignited && s.abortAt === null) return 'ignite';
    if (!s.cutoff) return 'cutoff';
    if (tr.body?.tower && !s.shed.tower) return 'tower';
    if (!s.shed.booster) return 'separate';
    // (after an abort the retrorockets are not part of what is left to do: the parachutes are next)
    if (s.abortAt === null && s.retroAt === null) return 'retro';
    if (s.abortAt === null && !s.shed.retropack) return 'retropack';
    if (s.drogueAt === null) return 'drogue';
    if (s.mainAt === null) return 'main';
    return null;
  }

  /**
   * A control in the cabin worked by hand (viewer/cabin.ts): 'abort' and 'next' are the keys' own, guarded as they
   * are; any other names the one thing to set off now (a pull ring does its own thing, whatever is next in order).
   */
  ask(what: string): void {
    if (what === 'abort' || what === 'next') return void this.command(what);
    const s = this.state;
    if (!this.on || !s || s.landing || this.clock.t < s.t - TICK) return;
    if (!['tower', 'separate', 'retro', 'retropack', 'drogue', 'main'].includes(what)) return;
    this.hand[what as 'tower'] = true;
    if (!this.clock.running && s.ignited) this.clock.play(true);
  }

  private command(what: string): void {
    if (!this.on) return;
    if (what === 'leave') this.leave();
    else if (what === 'again') this.fresh();
    else if (what === 'guidance') this.guidance = !this.guidance;
    else if (what === 'sequence') this.sequence = !this.sequence;
    else if (what === 'abort') {
      // guarded: the first press arms it and says so, the second within two seconds fires the rocket
      const s = this.state;
      const now = performance.now() / 1000;
      if (!s || s.landing || s.shed.tower || s.abortAt !== null || !this.flight.trajectory?.body?.escape) return;
      if (this.clock.t < s.t - TICK) return; // (looking back at what was flown)
      if (now - this.abortArmed > ABORT_ARMED) this.abortArmed = now;
      else {
        this.abortArmed = Number.NEGATIVE_INFINITY;
        this.hand.abort = true;
        delete this.hand.throttle;
        if (!s.ignited) {
          this.state = this.tick(s, this.pilot()); // off the pad unlit: the clock has a flight to run from this instant
          this.clock.setRate(1);
        }
        this.clock.play(true);
      }
    } else if (what === 'next') {
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
        this.hand.throttle = this.flight.trajectory!.body?.engine?.throttle ? this.lever : 1;
        this.state = this.tick(this.state!, this.pilot()); // lit at this instant, so the clock has a flight to run
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
      this.root.querySelector(`[data-hold="${key}"]`)?.classList.toggle('down', down);
      e.preventDefault();
      return;
    }
    if (!down || e.repeat) return;
    if (this.flight.trajectory?.body?.engine?.throttle && ['arrowup', 'arrowdown', 'z'].includes(key)) {
      this.setLever(key === 'z' ? 1 : this.lever + (key === 'arrowup' ? NOTCH : -NOTCH));
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const what = (
      { ' ': 'next', g: 'guidance', b: 'sequence', n: 'again', escape: 'leave', l: 'leave', x: 'abort' } as Record<string, string>
    )[key];
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
    // (the greatest dynamic pressure is called as it comes and goes: within 3 per cent of the most so far, and no longer rising by a per cent of it a second)
    const riding = s.phase === 'powered' || s.phase === 'coast';
    const maxQ = riding && s.mach > 0.5 && s.q >= 0.97 * this.maxQ && s.q - this.at(s.t - 1).q < 0.01 * this.maxQ;
    set(
      'phase',
      state.landing && s.t >= state.landing.t
        ? 'Down'
        : !state.ignited && state.abortAt === null
          ? 'On the pad'
          : `${PHASES[s.phase]}${maxQ ? ' · MAX Q' : ''}`,
    );
    const load = this.cells.get('load')!;
    load.hidden = !riding || !(s.strain > 0.02);
    if (!load.hidden) {
      set('load', `Bending ${(100 * s.strain).toFixed(0)} %`);
      load.dataset.standing = standing(s.strain);
      load.style.setProperty('--load', `${Math.min(100, 100 * s.strain).toFixed(0)}%`);
    }
    // (a height a hair under nothing, as a landing leaves it, is nothing: not "-0.00")
    set('altitude', (Math.max(0, s.altitude) / 1000).toFixed(s.altitude < 99_950 ? 2 : 1));
    set('speed', s.groundSpeed.toFixed(0));
    set('climb', (s.groundSpeed * Math.sin(s.groundClimb * DEG)).toFixed(0));
    set('range', (s.range / 1000).toFixed(s.range < 99_950 ? 2 : 1));
    set('g', s.g.toFixed(2));
    set('q', (s.q / 1000).toFixed(1));
    set('mach', s.mach.toFixed(2));
    set('pitch', (90 - angleBetween(s.axis, up) / DEG).toFixed(0));
    set('alpha', s.groundSpeed > 5 && s.q > 1 ? s.alpha.toFixed(1) : '–');
    const toBurn = Math.max(0, Math.min(100, (100 * (s.mass - (tr.liftoffMass.value - burnable))) / burnable));
    set('fuel', riding ? `${toBurn.toFixed(0)} %` : '–');
    const burn = this.cells.get('fuel')!.closest<HTMLElement>('.tank')!;
    burn.style.setProperty('--left', `${riding ? toBurn.toFixed(0) : 0}%`);
    burn.classList.toggle('low', riding && toBurn < 100 * LOW && toBurn > 0);
    const replay = this.clock.t < state.t - TICK;
    const leant = (v: number, plus: string, minus: string) =>
      Math.abs(v) < 0.05 * DEG ? '' : ` ${(Math.abs(v) / DEG).toFixed(1)}° ${v > 0 ? plus : minus}`;
    const leans = state.shed.booster ? '' : leant(this.trim.pitch, 'downrange', 'back') + leant(this.trim.yaw, 'left', 'right');
    const step = this.next();
    set('next', replay ? 'Run on' : step ? STEPS[step] : 'Nothing left to do');
    this.root.querySelector<HTMLButtonElement>('[data-do=next]')!.disabled = !replay && !step;
    // (the two switches say how it is being flown; this line is for what is out of the ordinary)
    set('mode', replay ? 'Looking back at what was flown' : leans ? `Programme leaned${leans}` : !this.guidance ? 'Hands only' : '');
    this.root.querySelector('[data-do=guidance]')!.setAttribute('aria-pressed', String(this.guidance));
    this.root.querySelector('[data-do=sequence]')!.setAttribute('aria-pressed', String(this.sequence));
    this.root.classList.toggle('thrusting', state.ignited && !state.cutoff && !replay);
    const heat = this.host.heat?.(s.t);
    this.cells.get('heat')!.hidden = !heat?.warm; // (it reads once the air has begun to heat it)
    this.cells.get('heat')!.classList.toggle('hot', Boolean(heat?.hot));
    if (heat?.warm)
      set('heat', `${heat.name} ${heat.temperature.toFixed(0)} K of ${heat.limit.toFixed(0)} · ${(heat.flux / 1000).toFixed(0)} kW/m²`);
    this.gauges(s, state, replay);
    for (const fn of this.watchers) fn(s, replay ? null : state);
  }

  /** The systems strip and the prompt: what there is left to fly with, what is firing, and what is due. */
  private gauges(s: LiveSample, state: VehicleState, replay: boolean): void {
    const tr = this.flight.trajectory!;
    const body = tr.body!;
    const set = (id: string, text: string, low = false) => {
      const el = this.cells.get(id);
      if (!el) return;
      if (el.textContent !== text) el.textContent = text;
      el.parentElement!.classList.toggle('low', low);
    };
    const left = (id: string, now: number, full: number) => {
      const part = full > 0 ? now / full : 0;
      const empty = part < 0.002;
      set(id, empty ? 'Empty' : `${(part * 100).toFixed(0)} %`, part < LOW);
      set(`${id}-kg`, empty ? '' : `${now.toFixed(now < 100 ? 1 : 0)} kg`, part < LOW);
      this.cells.get(id)?.parentElement?.style.setProperty('--left', `${(100 * Math.max(0, Math.min(1, part))).toFixed(0)}%`);
    };
    // the engine: its kind, and what it is doing
    const nature = tr.body?.engine;
    const main = s.burning.find((m) => m.name === 'main');
    const range = nature?.throttle;
    set(
      'engine-kind',
      nature?.kind === 'solid'
        ? 'solid: burns out'
        : range
          ? `throttle ${(range[0] * 100).toFixed(0)} to ${(range[1] * 100).toFixed(0)} %`
          : 'fixed thrust',
    );
    const before = !state.ignited && state.abortAt === null;
    const spent = this.vehicle!.tanks && s.tanks ? Math.min(s.tanks.oxidizer, s.tanks.fuel) < 1 : false;
    const lever = range ? `, lever ${(this.lever * 100).toFixed(0)} %` : '';
    set(
      'engine',
      main
        ? `${(main.thrust / 1000).toFixed(0)} kN${range ? ` (${((state.throttle || this.lever) * 100).toFixed(0)} %${lever})` : ''}`
        : before
          ? 'Not lit'
          : s.tanks === null
            ? 'Gone'
            : spent
              ? nature?.kind === 'solid'
                ? 'Burnt out'
                : 'Out of propellant'
              : 'Cut off',
    );
    const full = this.vehicle!.tanks;
    if (full && s.tanks) {
      left('oxidizer', s.tanks.oxidizer, full.oxidizer);
      left('fuel-tank', s.tanks.fuel, full.fuel);
    } else if (full) {
      // (the tanks went with the booster)
      for (const id of ['oxidizer', 'fuel-tank']) {
        set(id, '–');
        set(`${id}-kg`, '');
        this.cells.get(id)?.parentElement?.style.setProperty('--left', '0%');
      }
    }
    const rcs = body.capsule.rcs;
    if (rcs) {
      rcs.supplies.forEach((u, i) => left(`rcs-${i}`, s.rcs.left[i] ?? u.propellant.value, u.propellant.value));
      const open = new Set<string>();
      s.rcs.firing.forEach((f, i) => {
        if (f > 0) open.add(`${rcs.thrusters[i]!.axis}${rcs.thrusters[i]!.sense > 0 ? '+' : '-'}`);
      });
      for (const lamp of this.root.querySelectorAll<HTMLElement>('[data-jet]')) lamp.classList.toggle('on', open.has(lamp.dataset.jet!));
    }
    set(
      'motors',
      s.burning.length ? s.burning.map((m) => `${m.name} ${(m.thrust / 1000).toFixed(m.thrust < 20_000 ? 1 : 0)} kN`).join(' · ') : '–',
    );

    // the abort: there while the tower is, and armed between its two presses
    const abort = this.root.querySelector<HTMLButtonElement>('[data-do=abort]')!;
    const can = Boolean(body.escape) && !state.shed.tower && state.abortAt === null && !state.landing && !replay;
    abort.disabled = !can;
    const armed = can && performance.now() / 1000 - this.abortArmed <= ABORT_ARMED;
    abort.classList.toggle('armed', armed);
    set('abort', armed ? 'Press again to abort' : 'Abort');

    // what the sequence depends on, and what is due and not done when it is the pilot's to do
    const cues: string[] = [];
    const due: string[] = [];
    const coming = s.groundClimb < 0 && state.shed.booster;
    if (state.enteredAt !== null && s.t >= state.enteredAt && state.drogueAt === null) cues.push('0.05 g');
    const feet = (m: number) => `${Math.round(m / FT / 100) * 100} ft`.replace(/(\d)(\d{3}) /, '$1,$2 ');
    if (coming && state.shed.tower && state.mainAt === null) {
      const which = state.drogueAt === null ? ('drogue' as const) : ('main' as const);
      const at = tr[which].altitude.value;
      cues.push(`${which === 'drogue' ? 'Drogue' : 'Main'}: ${feet(at)} (${(at / 1000).toFixed(1)} km)`);
      if (!this.sequence && s.altitude <= at) due.push(`${which === 'drogue' ? 'Drogue' : 'Main'} parachute is due: Space`);
    }
    if (!this.sequence && !replay && !state.landing && state.ignited && state.abortAt === null) {
      const late = (at: number) => s.t >= at;
      if (!state.cutoff && late(tr.engine.cutoff.value)) due.push('Cutoff is due');
      else if (state.cutoff && body.tower && !state.shed.tower && late(body.tower.at.value)) due.push('Tower jettison is due');
      else if (state.shed.tower && !state.shed.booster && late(tr.separation.at.value)) due.push('Separation is due');
      else if (state.shed.booster && state.retroAt === null && late(tr.retro.fires[0]!.value)) due.push('Retrofire is due');
      else if (state.retroAt !== null && !state.shed.retropack && late(tr.retropack.at.value)) due.push('Retropack jettison is due');
    }
    if (state.abortAt !== null && !state.shed.tower && !this.sequence && coming)
      due.push('Tower jettison is due: no parachute comes out past it');
    // waiting on the pilot to begin: said, and the button asks (cockpit.css `waiting`)
    const waiting = before && !replay;
    if (waiting)
      cues.push(
        matchMedia('(hover: none), (pointer: coarse)').matches ? 'Ready: Ignition lights the engine' : 'Ready: Space lights the engine',
      );
    this.root.classList.toggle('waiting', waiting);
    const prompt = this.cells.get('prompt')!;
    const text = [...due, ...cues].join(' · ');
    if (prompt.textContent !== text) prompt.textContent = text;
    prompt.hidden = !text || replay;
    prompt.classList.toggle('due', due.length > 0);
  }

  /** How it ended, said plainly, beside what the reports give for the flight itself. */
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
    const end = verdict(this.state!, results, this.flight.trajectory!, this.tally.peakG);
    const lived =
      end.survivable === null
        ? ''
        : `<p class="cockpit-verdict${end.survivable ? '' : ' lost'}">${end.survivable ? 'Survivable.' : 'Not survivable.'} ${end.against}</p>`;
    // what the structure and the parachutes did not take (sim/loads.ts), and where what was let go came down (sim/shed.ts)
    const { broke, torn } = this.state!;
    const lost = [
      broke
        ? `Broke up at T+${broke.t.toFixed(0)} s: bending load ${(100 * broke.load).toFixed(0)} per cent of the limit at ${(broke.q / 1000).toFixed(0)} kPa, ${broke.alpha.toFixed(0)} degrees off the wind.`
        : '',
      torn.drogue || torn.main
        ? `The ${torn.drogue && torn.main ? 'parachutes' : torn.drogue ? 'drogue' : 'main parachute'} tore: let out in more dynamic pressure than ${torn.drogue && torn.main ? 'they' : 'it'} can take.`
        : '',
    ].filter(Boolean);
    const fell = (this.run.sheds?.all ?? []).map((body) => {
      const down = body.finish();
      return `${body.shedder.def.name}: ${down.t <= body.from ? 'stayed where it stood' : `down ${(down.range / 1000).toFixed(0)} km from the pad at ${down.speed.toFixed(0)} m/s, T+${down.t.toFixed(0)} s`}.`;
    });
    el.innerHTML = `
      <h3>${end.how}</h3>
      ${[...lost, ...end.why].map((w) => `<p class="cockpit-why">${w}</p>`).join('')}
      ${fell.length ? `<p class="cockpit-fell">${fell.join(' ')}</p>` : ''}
      ${lived}
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

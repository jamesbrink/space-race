import '../ui/cockpit.css';
import type { LiveSample, VehicleState } from '../sim/vehicle.ts';
import type { Command, SitedFlight } from '../types.ts';
import type { Run } from '../sim/run.ts';
import type { DeckNews } from '../viewer/cabin.ts';
import { type Clock, missionTime } from '../world/clock.ts';
import { type EarthFrame, frameOf } from '../world/earthframe.ts';
import { capOf, capsOf, is, isTyping, kbd, type KeyName, keyOf, KEYS, keysOf, modified } from '../util/keys.ts';
import { Scope } from '../util/scope.ts';
import { ask } from './ask.ts';
import { type Stake, verdict } from './leaving.ts';
import { DEG } from '../world/frames.ts';

/**
 * The flight deck: one for every flight that can be flown, whatever its kind. This is the deck itself (its three panels,
 * its keys and their buttons, the finger's stick and roll, how it tucks on a phone, the way in and out, the card that ends
 * a flight); what flies is a flight kind's (cockpit.ts for a ballistic plan, orbitdeck.ts for one into orbit),
 * which says what goes in it as data: the middle panel's figures, the systems strip, the readings, the steps Space walks
 * through, what each key does and what the hands may do. Someone who has flown one flight knows where everything is on
 * the next.
 *
 * The panels: the navball's (navball.ts puts it in) in the left corner; the phase, the two switches that say how it is
 * flown (G guidance, B sequencer), the figures and the one action (Space) in the middle; the systems as bars and lamps
 * on the right. Under the middle one a line of the keys that steer and the way out, and behind Keys (More on a phone)
 * every key and control of the deck, each a button that does what its key does.
 */

export interface CockpitHost {
  /** The run to show in the scene (viewer/ascent.ts), or null for the record's again. */
  fly(run: Run | null): void;
  /** The flight deck has been taken, or left: the page makes way and gives the view to the vehicle. */
  piloting(on: boolean): void;
  /** Something to say across the page: a title and a line (a mechanism worked by hand says where it is sent). */
  say?(title: string, line: string): void;
  /** A flight flown by hand is kept, parked while the visitor is elsewhere in its page (the clock's instant), or is no longer (null): the Fly tab says so. */
  kept?(at: number | null): void;
  /** The heat shield at `t` (viewer/effects.ts `reading`): its temperature and limit, K, and the stagnation-point heat flux, W/m2. */
  heat?(t: number): { name: string; temperature: number; limit: number; flux: number; warm: boolean; hot: boolean } | null;
}

/** A flight kept as it stood: the clock's instant and pace, and whether it was running. */
interface Kept {
  t: number;
  rate: number;
  running: boolean;
}

/** A figure of the middle panel, or a reading of the right one: its cell's id, its name, its unit and what it is. */
export interface Figure {
  id: string;
  label: string;
  unit: string;
  about: string;
}

/** What a flight kind puts in the deck when it is built (the rest it fills as it flies). */
export interface DeckSpec {
  /** The middle panel's figures as the deck opens: the first three are a phone's one line. */
  figures: Figure[];
  /** The right panel's readings, under its bars and lamps. */
  readings: Figure[];
  /** Words for the two switches: what guidance flies, and what the sequencer sets off. */
  guidance: string;
  sequence: string;
  /** The K control (the path to cutoff or cut now): only where the path can fly the programme ahead. */
  choose: boolean;
  /** Buttons for the list's Flight group beyond New flight and Leave (a throttle, a mechanism, a lock's digits). */
  flightKeys: string;
  /** The way in's tooltip. */
  enter: string;
}

/** The keys that steer: W S pitch, A D yaw, Q E roll (keys.ts `deck.steer`). Held, each is a hand on its axis. */
export const STEER = [...keysOf('deck.steer')];
/** What every kind of deck keeps alike: how often a live sample is kept for the scene to replay, s; the longest stretch of flight one frame may step, s. */
export const KEEP = 0.1;
export const MOST = 5;
/** Seconds after one event before Space will set off the next: a second press of the same finger. */
export const GUARD = 1.5;
/** An abort is X twice: the second press within this long of the first, s. */
export const ABORT_ARMED = 2;
/** How fast a held key leans what guidance flies (a tilt programme, a steering law), radians a second, and the most it may lean. */
export const TRIM = 3 * DEG;
export const TRIM_MOST = 30 * DEG;

/** The deck's keys that are commands, and the command each gives (`command`). */
const COMMANDS: [KeyName, string][] = [
  ['deck.next', 'next'],
  ['deck.guidance', 'guidance'],
  ['deck.sequence', 'sequence'],
  ['deck.again', 'again'],
  ['deck.leave', 'leave'],
  ['deck.toggle', 'leave'],
  ['deck.abort', 'abort'],
];

export type Watcher = (sample: LiveSample, live: VehicleState | null, news?: DeckNews) => void;

const cell = (f: Figure) =>
  `<div class="gauge" title="${f.about}"><span>${f.label}</span><i>${f.unit}</i><b data-cell="${f.id}">0</b></div>`;
const pair = (f: Figure) =>
  `<div class="reading" title="${f.about}"><span>${f.label}</span><b><u data-cell="${f.id}">0</u>${f.unit ? `<i>${f.unit}</i>` : ''}</b></div>`;
/** A supply as a bar of what is left, with the figure and the kilograms beside it (the systems strip). */
export const tank = (id: string, label: string, about: string) =>
  `<div class="tank" title="${about}"><span>${label}</span><u class="bar"></u><b data-cell="${id}"></b><i data-cell="${id}-kg"></i></div>`;

export abstract class Deck {
  protected readonly flight: SitedFlight;
  protected readonly clock: Clock;
  protected readonly host: CockpitHost;
  protected readonly root: HTMLElement;
  protected readonly button: HTMLButtonElement;
  protected readonly cells = new Map<string, HTMLElement>();
  protected readonly watchers: Watcher[] = [];
  protected on = false;
  /** The keys held (W S A D Q E), by the keyboard or their buttons. */
  protected readonly held = new Set<string>();
  /** What the deck hangs on the window (util/scope.ts). */
  protected readonly scope = new Scope();
  /** What a finger on the on-screen stick and roll buttons asks, each -1 to 1: laid over the keys. */
  protected readonly finger = { pitch: 0, yaw: 0, roll: 0 };
  private figureKey = '';
  /** What the deck's own enter button says while the deck is not taken. */
  private readonly enterTip: string;
  /** A flight flown by hand, kept while the deck is left: where the clock stood, how fast it ran, and whether it was running. */
  private parked: Kept | null = null;
  /** The same, taken back up and not yet resumed (or started over): the clock is held where it was until one is chosen. */
  private pending: Kept | null = null;
  /** When the run on the deck was first seen to have ended, page time in ms; null while it goes on. */
  private endedAt: number | null = null;
  /** The browser is to ask before the page is closed or loaded again (`sync`). */
  private warned = false;
  private readonly unload = (e: BeforeUnloadEvent): void => {
    if (!this.stakes) return;
    e.preventDefault();
    e.returnValue = '';
  };

  constructor(parent: HTMLElement, flight: SitedFlight, clock: Clock, host: CockpitHost, spec: DeckSpec) {
    this.flight = flight;
    this.enterTip = spec.enter;
    this.clock = clock;
    this.host = host;
    const root = (this.root = document.createElement('aside'));
    root.className = 'cockpit';
    root.hidden = true;
    root.setAttribute('aria-label', 'Flight instruments');
    // a key that steers, as a button: held, it is the key held (W S A D Q E)
    const hold = (key: string, about: string) =>
      `<button data-hold="${key}" title="${about} (${capOf(key)})"><kbd>${capOf(key)}</kbd></button>`;
    // the keys of the deck's steering, in the table's order (keys.ts `deck.steer`: W S A D Q E)
    const [pitchDown, pitchUp, yawLeft, yawRight, rollLeft, rollRight] = STEER as [string, string, string, string, string, string];
    // a slot of a key in the table as a button that presses it: held (`data-held`) for the camera's turning and zooming
    const slot = (name: KeyName, i: number) => KEYS[name].slots[i] as string;
    const turn = (i: number, about: string) =>
      `<button data-press="${slot('orbit.turn', i)}" data-held title="${about}"><kbd>${capOf(slot('orbit.turn', i))}</kbd></button>`;
    const zoom = (i: number, about: string) => {
      const key = (KEYS['orbit.zoom'].slots[i] as readonly string[])[0]!;
      return `<button data-press="${key}" data-held title="${about} (${capOf(key)})"><kbd>${capOf(key)}</kbd></button>`;
    };
    const rate = (i: number, about: string, label: string) =>
      `<button data-press="${slot('clock.rate', i)}" title="${about} (${capOf(slot('clock.rate', i))})"><kbd>${capOf(slot('clock.rate', i))}</kbd>${label}</button>`;
    // The deck is three panels: the navball's (navball.ts puts it in), this one in the middle, the systems on the right.
    root.innerHTML = `
      <section class="deck-main">
        <div class="cockpit-card" hidden></div>
        <div class="cockpit-card cockpit-kept" role="group" aria-labelledby="deck-kept-t" hidden>
          <h3 id="deck-kept-t">Your flight, kept at <span data-cell="kept-at"></span></h3>
          <span class="cockpit-why">You left the deck with it still going. The clock is stopped where you left it until you choose.</span>
          <p>
            <button data-do="resume" title="Fly on from where it was left (${capsOf('deck.resume').join(' ')})">${kbd('deck.resume')}Resume</button>
            <button data-do="again" title="Throw it away and start again from the pad (${capsOf('deck.again').join(' ')})">${kbd('deck.again')}Start over</button>
          </p>
        </div>
        <p class="cockpit-phase"><b data-cell="phase"></b><span data-cell="mode"></span>
          <span class="deck-modes">
            <button data-do="guidance" class="switch" aria-pressed="true" title="${spec.guidance} (${capsOf('deck.guidance').join(' ')})">${kbd('deck.guidance')}Guidance</button>
            <button data-do="sequence" class="switch" aria-pressed="true" title="${spec.sequence} (${capsOf('deck.sequence').join(' ')})">${kbd('deck.sequence')}Sequencer</button>
          </span></p>
        <div class="gauges"></div>
        <div class="deck-act">
          <button data-do="next" class="cockpit-next" title="Set off the next event of the flight now (${capsOf('deck.next').join(' ')})">${kbd('deck.next')}<span data-cell="next"></span></button>
          <p class="cockpit-prompt" data-cell="prompt" role="status" hidden></p>
          <button data-do="abort" class="cockpit-abort" title="Abort: the escape the spacecraft had at this instant, while it is on its launch vehicle: press twice (${capsOf('deck.abort').join(' ')}, ${capsOf('deck.abort').join(' ')})">${kbd('deck.abort')}${kbd('deck.abort')}<span data-cell="abort">Abort</span></button>
        </div>
        <p class="deck-foot">
          <span class="deck-steer for-keys">${hold(pitchDown, 'Pitch the nose downrange')}${hold(pitchUp, 'Pitch the nose back')}<em>pitch</em>${hold(yawLeft, 'Yaw left')}${hold(yawRight, 'Yaw right')}<em>yaw</em>${hold(rollLeft, 'Roll left')}${hold(rollRight, 'Roll right')}<em>roll</em></span>
          <span class="for-touch">Stick steers · ⟲ ⟳ roll</span>
          <button data-do="leave" class="for-keys" title="Leave the flight deck (${capsOf('deck.leave').join(' ')})">${kbd('deck.leave')}Leave</button>
          <button data-do="keys" aria-expanded="false" title="Every key and control of the flight deck"><span class="for-keys">Keys</span><span class="for-touch">More</span><i class="chevron"></i></button>
        </p>
        <div class="cockpit-keys" hidden>
          <div><h4>Show</h4><p>
            <button data-do="path" class="switch" aria-pressed="true" title="The predicted path: where it goes from here if nothing more is done, its apogee, what happens on the way and where it comes down (${capsOf('path.show').join(' ')})">${kbd('path.show')}Path</button>
            <button data-do="navball" class="switch" aria-pressed="true" title="The navball: attitude against the horizon, prograde and retrograde (${capsOf('navball.show').join(' ')})">${kbd('navball.show')}Navball</button>
            <button data-press="${KEYS['cut.toggle'].slots[0]}" data-skin class="switch" aria-pressed="true" title="The vehicle's skin: off, to see what is inside it and how little room there is, and out of it all round; on, as it flew (${capsOf('cut.toggle').join(' ')})">${kbd('cut.toggle')}Skin</button>
            <button data-press="${KEYS['navball.frame'].slots[0]}" title="The navball's markers and speed: over the turning Earth, or in the frame that does not turn; and a path that goes round, drawn in the same frame (${capsOf('navball.frame').join(' ')})">${kbd('navball.frame')}Surface · orbit</button>
            ${spec.choose ? `<button data-press="${KEYS['path.choose'].slots[0]}" title="While the engine burns under guidance: the path if guidance flies on to the record's cutoff, or if the engine were cut now (${capsOf('path.choose').join(' ')})">${kbd('path.choose')}Path · to cutoff · cut now</button>` : ''}
          </p></div>
          <div><h4>Camera</h4><p>
            <button data-press="${KEYS['cam.next'].slots[0]}" title="The next camera (${capsOf('cam.next').join(' ')})">${kbd('cam.next')}Next view</button>
            <button data-press="${KEYS['cam.home'].slots[0]}" title="Centre the vehicle (${capsOf('cam.home').join(' ')})">${kbd('cam.home')}Centre</button>
            <span class="deck-turn" title="Turn and tilt the view (the arrow keys)">${turn(1, 'Turn the view left')}${turn(0, 'Tilt the view up')}${turn(2, 'Tilt the view down')}${turn(3, 'Turn the view right')}<em>turn · tilt</em></span>
            <span class="deck-turn">${zoom(0, 'Zoom in')}${zoom(1, 'Zoom out')}<em>zoom</em></span>
            <button data-press="${KEYS['page.cel'].slots[0]}" title="Cel shading (${capsOf('page.cel').join(' ')})">${kbd('page.cel')}Cel</button>
            <button data-press="${KEYS['page.bare'].slots[0]}" class="for-keys" title="Hide every panel; ${capsOf('page.bare').join(' ')} shows them again (${capsOf('page.bare').join(' ')})">${kbd('page.bare')}Hide panels</button>
          </p></div>
          <div><h4>Clock</h4><p>
            <button data-press="${KEYS['clock.run'].slots[0]}" title="Run or stop the clock, and the flight with it (${capsOf('clock.run').join(' ')})">${kbd('clock.run')}Run · stop</button>
            ${rate(0, 'Time runs slower', 'Slower')}
            ${rate(1, 'Time runs faster', 'Faster')}
            <button data-press="${KEYS['sound.toggle'].slots[0]}" title="Sound on or off (${capsOf('sound.toggle').join(' ')})">${kbd('sound.toggle')}Sound</button>
          </p></div>
          <div><h4>Flight</h4><p>
            ${spec.flightKeys}
            <button data-do="again" title="A new flight: back to the pad (${capsOf('deck.again').join(' ')})">${kbd('deck.again')}New flight</button>
            <button data-do="leave" title="Leave the flight deck (${capsOf('deck.leave').join(' ')})">${kbd('deck.leave')}Leave</button>
          </p></div>
        </div>
        <label class="cockpit-lever" hidden>Throttle <input type="range" min="0" max="1" step="0.01" value="1" data-lever title="The throttle lever (the up and down arrows; Z for full)" /></label>
      </section>
      <section class="deck-sys" aria-label="Systems">
        <div class="systems" data-cell="systems"></div>
        <div class="sys-rule"></div>
        <div class="readings">
          ${spec.readings.map(pair).join('\n          ')}
        </div>
        <em data-cell="load" class="cockpit-load" hidden title="The bending load on the stack (dynamic pressure times the angle off the wind) against what it can take: amber past four fifths, red over. Half a second over, or half as much again at once, breaks it"></em>
        <em data-cell="heat" hidden title="The heat shield's temperature against its limit, and the heat flux at its stagnation point: amber past four fifths of the limit"></em>
      </section>
      <div class="cockpit-stick" aria-hidden="true"><i></i></div>
      <div class="cockpit-roll"><button data-roll="-1" aria-label="Roll left" title="Roll left">⟲</button><button data-roll="1" aria-label="Roll right" title="Roll right">⟳</button></div>`;
    parent.append(root);
    this.figures(spec.figures);
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
      if (e) this.steered();
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
        this.steered();
      });
      for (const end of ['pointerup', 'pointercancel', 'lostpointercapture'] as const)
        b.addEventListener(end, () => (this.finger.roll = 0));
    }
    // On a phone the deck shows the least, and a swipe up on it brings up the rest (as More does); a swipe down puts it away
    const main = root.querySelector<HTMLElement>('.deck-main')!;
    let swipe: { y: number; t: number } | null = null;
    main.addEventListener('touchstart', (e) => (swipe = e.touches.length === 1 ? { y: e.touches[0]!.clientY, t: e.timeStamp } : null), {
      passive: true,
    });
    const ended = (e: TouchEvent): void => {
      const from = swipe;
      swipe = null;
      const y = e.changedTouches[0]?.clientY;
      if (!from || y === undefined || e.timeStamp - from.t > 1000 || !matchMedia('(max-width: 960px), (max-height: 520px)').matches) return;
      const open = root.classList.contains('keys-open');
      if (y - from.y < -36 && !open) this.showKeys(true);
      else if (y - from.y > 36 && open && root.scrollTop <= 0) this.showKeys(false);
    };
    main.addEventListener('touchend', ended);
    main.addEventListener('touchcancel', ended);
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
      else if (b?.dataset.work) this.work(b.dataset.work);
      else if (b?.dataset.do) this.act(b.dataset.do);
      else if (b?.dataset.press && !('held' in b.dataset)) {
        press(b.dataset.press, true);
        press(b.dataset.press, false);
      }
      (document.activeElement as HTMLElement | null)?.blur?.(); // or Space would press the button again
      this.sync();
    });
    for (const b of root.querySelectorAll<HTMLButtonElement>('[data-hold], [data-held]')) {
      const key = b.dataset.hold ?? b.dataset.press!;
      const set = (down: boolean) => {
        if (b.classList.contains('down') === down) return;
        b.classList.toggle('down', down);
        if (!b.dataset.hold) press(key, down);
        else if (down) {
          this.held.add(key);
          this.steered();
        } else this.held.delete(key);
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
      this.scope.on(window, 'blur', () => set(false));
    }
    this.showKeys(false);

    // the way in: beside the clock, which is always on show
    this.button = document.createElement('button');
    this.button.className = 'cockpit-enter';
    this.button.innerHTML = '<kbd>Esc</kbd><span>Fly it</span>';
    this.button.title = spec.enter;
    this.button.addEventListener('click', () => (this.on ? this.leave() : this.enter()));
    (parent.querySelector('.time-row') ?? parent).append(this.button);

    this.scope.on(window, 'keydown', (e) => this.key(e, true));
    this.scope.on(window, 'keyup', (e) => this.key(e, false));
    this.scope.on(window, 'blur', () => this.held.clear());
    clock.listen(() => {
      // (kept and not yet resumed: the clock stays where it was left, whoever touches it)
      const p = this.pending;
      if (p && this.on) {
        if (clock.running) clock.pause();
        if (clock.t !== p.t) clock.seek(p.t);
      }
      this.follow();
      this.watch();
    });
  }

  /** The page has gone to another flight: off the window, and out of the page. */
  dispose(): void {
    this.parked = this.pending = null;
    this.sync();
    this.host.kept?.(null);
    this.scope.dispose();
    this.root.remove();
    this.button.remove();
  }

  /** The frame the samples it hands on are in (world/earthframe.ts `frameOf`). */
  get frame(): EarthFrame {
    return frameOf(this.flight);
  }

  get active(): boolean {
    return this.on;
  }

  /** For the instruments that are not the deck's own (navball.ts, viewer/path.ts, the cabin): told every sample put on show, with the live state when it is the flight's own instant (null when looking back). */
  listen(fn: Watcher): void {
    this.watchers.push(fn);
  }

  /** Whether this flight can be flown on the deck. */
  abstract get able(): boolean;
  /** The flight's own vehicle of sim/vehicle.ts, where it has one (the path flies its programme ahead), and how it is flown. */
  abstract get craft(): import('../sim/vehicle.ts').Vehicle | null;
  abstract get steering(): { guidance: boolean; sequence: boolean; trim: { pitch: number; yaw: number } };
  /** The vehicle's skin is on, or off: the Skin switch's lamp says which (the page tells it, whoever took the skin off). */
  skin(on: boolean): void {
    this.root.querySelector('[data-skin]')?.setAttribute('aria-pressed', String(on));
  }

  /** A control in the cabin, or a part's menu, asking for something (types.ts `Command`, CabinDef `does`). */
  abstract ask(what: string): void;
  abstract can(what: Command['ask']): boolean;
  abstract work(id: string): string | null;
  abstract headed(id: string): boolean | null;
  abstract travel(id: string, t: number): number | null;
  abstract enter(): void;
  /** Whether the flight has been taken over (the deck's mode is no longer "as flown"). */
  protected abstract get byHand(): boolean;
  /** Whether the run on the deck has ended: landed, or broken up. */
  protected abstract get runOver(): boolean;
  /** The deck is taken back up with the run it kept: show it to the scene and the instant the clock is at. */
  protected abstract restore(): void;
  /** The clock has moved: bring the flight up to it and show it. */
  protected abstract follow(): void;
  /** A command of the deck's: a button's `data-do`, or a key's (next, guidance, sequence, abort, again, leave). */
  protected abstract command(what: string): void;
  /** A key the flight kind has beyond the deck's own (a throttle's arrows, a lock's digits): true if it took it. */
  protected extraKey(_key: string, _e: KeyboardEvent): boolean {
    return false;
  }
  /** A hand has gone to the controls (a key, its button, the stick): for a kind that must say what the hands may do. */
  protected steered(): void {}
  /** The throttle lever's slider has moved (where there is one). */
  protected setLever(_to: number): void {}

  /**
   * The middle panel's figures: the first three are a phone's one line. A flight kind may change them as the flight
   * goes (a flight into orbit has apogee and perigee once it is in one); only a change touches the page.
   */
  protected figures(list: Figure[]): void {
    const key = list.map((f) => `${f.id}|${f.label}|${f.unit}`).join(',');
    if (key === this.figureKey) return;
    this.figureKey = key;
    const el = this.root.querySelector<HTMLElement>('.gauges')!;
    el.innerHTML = `\n          ${list.map(cell).join('\n          ')}\n        `;
    for (const c of el.querySelectorAll<HTMLElement>('[data-cell]')) this.cells.set(c.dataset.cell!, c);
  }

  /** Put text in a cell, touching the page only if it has changed. */
  protected put(id: string, text: string): void {
    const el = this.cells.get(id);
    if (el && el.textContent !== text) el.textContent = text;
  }

  /**
   * The list of every key and control, under the one line that is always there: opened or shut. It is not remembered:
   * open, it covers a third of the view, so the deck is always entered with it shut and the world in front.
   */
  protected showKeys(open: boolean): void {
    this.root.querySelector<HTMLElement>('.cockpit-keys')!.hidden = !open;
    this.root.querySelector('[data-do=keys]')!.setAttribute('aria-expanded', String(open));
    this.root.classList.toggle('keys-open', open);
  }

  /** The deck's panels show, the way in becomes the way out, and the page makes way. */
  protected opened(): void {
    this.on = true;
    this.root.hidden = false;
    this.showKeys(false);
    this.button.querySelector('span')!.textContent = 'Leave';
    this.button.title = 'Leave the flight deck (Esc)';
    this.host.piloting(true);
  }

  /** What is on the deck, as leaving.ts weighs it. */
  get stake(): Stake {
    const over = this.on && this.runOver;
    return { byHand: this.byHand, over, since: over && this.endedAt !== null ? (performance.now() - this.endedAt) / 1000 : 0 };
  }

  /**
   * Whether leaving the page would lose a flight: a run flown by hand that is going on at the deck, or kept while the visitor
   * is elsewhere in the page (a kept flight is a hand-flown one that was going on).
   */
  get stakes(): boolean {
    return this.parked !== null || (this.on && verdict(this.stake, 'beyond') === 'ask');
  }

  /** A flight is kept: the Fly tab says so, and where. */
  get keeping(): boolean {
    return this.parked !== null;
  }

  /**
   * Leave the deck, going to another place of the same flight (its Gallery, its Launch site, or just the deck put away). A
   * flight flown by hand that is going on is kept, parked as it stands with the clock stopped, and Fly resumes it; anything
   * else is let go as it always was.
   */
  leave(): void {
    if (!this.on) return;
    if (verdict(this.stake, 'within') === 'keep') {
      const at = this.pending ?? { t: this.clock.t, rate: this.clock.rate, running: this.clock.running };
      this.pending = null;
      this.hideKept();
      this.closed(this.enterTip);
      this.parked = at;
      this.host.kept?.(at.t);
      this.host.say?.('Your flight is kept', `Fly resumes it where you left it, at ${missionTime(at.t)}`);
      this.sync();
    } else this.end();
  }

  /** Let the flight go, whatever it is: the deck is put away, and what was kept is dropped. */
  end(): void {
    this.pending = null;
    this.hideKept();
    if (this.on) this.closed(this.enterTip);
    this.parked = null;
    this.host.kept?.(null);
    this.sync();
  }

  /** Take up the flight that was kept, stopped where it was left, with the choice to resume or start over. */
  protected resume(): void {
    const at = this.parked!;
    this.parked = null;
    this.pending = at;
    this.host.kept?.(null);
    this.clock.seek(at.t);
    this.restore();
    this.cells.get('kept-at')!.textContent = missionTime(at.t);
    this.root.querySelector<HTMLElement>('.cockpit-kept')!.hidden = false;
    this.root.querySelector<HTMLElement>('.cockpit-kept [data-do=resume]')!.focus({ preventScroll: true });
    this.sync();
  }

  /** The kept flight, resumed (the clock runs again as it did when it was left) or started over. */
  private settle(resume: boolean): void {
    const at = this.pending!;
    this.pending = null;
    this.hideKept();
    (document.activeElement as HTMLElement | null)?.blur?.();
    if (!resume) return;
    this.clock.setRate(at.rate);
    if (at.running) this.clock.play(true);
  }

  private hideKept(): void {
    this.root.querySelector<HTMLElement>('.cockpit-kept')!.hidden = true;
  }

  /** What a command asks for, with a kept flight waiting to be resumed: only that, starting over, or leaving it again. */
  private act(what: string): void {
    if (this.pending) {
      if (what === 'resume') {
        this.settle(true);
        return;
      }
      if (what === 'again') this.settle(false);
      else if (what !== 'leave') return;
    } else if (what === 'resume') return;
    this.command(what);
    this.sync();
  }

  /** The run's end is noted as the clock moves, for the moment's grace that leaving.ts gives it. */
  private watch(): void {
    if (this.on && this.runOver) this.endedAt ??= performance.now();
    else this.endedAt = null;
    this.sync();
  }

  /** The browser's own question as the page is closed or loaded again: set while a flight flown by hand would be lost by it, and not otherwise. */
  private sync(): void {
    const want = this.stakes;
    if (want === this.warned) return;
    this.warned = want;
    if (want) window.addEventListener('beforeunload', this.unload);
    else window.removeEventListener('beforeunload', this.unload);
  }

  /** Whether the browser is set to ask before the page goes (the test reads it). */
  get warning(): boolean {
    return this.warned;
  }

  /** Put the question that stands before a way out that loses the flight (ask.ts), over the deck. */
  question(leave: () => void, stay: () => void): void {
    this.held.clear();
    this.finger.pitch = this.finger.yaw = this.finger.roll = 0;
    ask({
      parent: document.body, // (not the deck's own page: that is put away while the gallery is up, and a flight kept is asked about there too)
      clock: this.clock,
      line: this.parked
        ? 'Your flight is kept, but only while this page is open: leaving will not keep it.'
        : 'You are flying it by hand; it will not be kept.',
      leave,
      stay,
    });
  }

  protected closed(enter: string): void {
    this.on = false;
    this.root.hidden = true;
    this.button.querySelector('span')!.textContent = 'Fly it';
    this.button.title = enter;
    this.held.clear();
    this.finger.pitch = this.finger.yaw = this.finger.roll = 0;
    this.host.fly(null);
    this.clock.reset();
    this.host.piloting(false);
  }

  private key(e: KeyboardEvent, down: boolean): void {
    const typing = isTyping(e);
    if (modified(e) || typing) return;
    const key = keyOf(e);
    if (!this.on) {
      if (down && is(key, 'deck.toggle') && !e.repeat && this.able && !this.button.hidden) this.enter();
      return;
    }
    // a kept flight waiting to be resumed: its one action, starting over, or leaving it again; nothing else of the deck acts
    if (this.pending) {
      if (!down || e.repeat) return;
      const what = is(key, 'deck.resume') ? 'resume' : is(key, 'deck.again') ? 'again' : is(key, 'deck.leave') ? 'leave' : null;
      if (what) {
        e.preventDefault();
        e.stopPropagation();
        this.act(what);
      } else if (STEER.includes(key)) e.preventDefault();
      return;
    }
    if (STEER.includes(key)) {
      if (down) this.held.add(key);
      else this.held.delete(key);
      this.root.querySelector(`[data-hold="${key}"]`)?.classList.toggle('down', down);
      e.preventDefault();
      if (down && !e.repeat) this.steered();
      return;
    }
    if (!down || e.repeat) return;
    if (this.extraKey(key, e)) return;
    const what = COMMANDS.find(([name]) => is(key, name))?.[1];
    if (!what) return;
    e.preventDefault();
    e.stopPropagation();
    this.act(what);
    this.sync();
  }
}

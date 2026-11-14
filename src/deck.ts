import './cockpit.css';
import type { LiveSample, VehicleState } from './sim/vehicle.ts';
import type { Command, SitedFlight } from './types';
import type { Run } from './viewer/ascent';
import type { DeckNews } from './viewer/cabin';
import type { Clock } from './world/clock.ts';

/**
 * The flight deck: one for every flight that can be flown, whatever its kind. This is the deck itself (its three panels,
 * its keys and their buttons, the finger's stick and roll, how it tucks on a phone, the way in and out, the card that ends
 * a flight); what flies is a flight kind's (cockpit.ts for a flight on a `trajectory`, orbitdeck.ts for one into orbit),
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
  /** The heat shield at `t` (viewer/effects.ts `reading`): its temperature and limit, K, and the stagnation-point heat flux, W/m2. */
  heat?(t: number): { name: string; temperature: number; limit: number; flux: number; warm: boolean; hot: boolean } | null;
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

/** The keys that steer: W S pitch, A D yaw, Q E roll. Held, each is a hand on its axis. */
export const STEER = ['w', 'a', 's', 'd', 'q', 'e'];

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
  /** What a finger on the on-screen stick and roll buttons asks, each -1 to 1: laid over the keys. */
  protected readonly finger = { pitch: 0, yaw: 0, roll: 0 };
  private figureKey = '';

  constructor(parent: HTMLElement, flight: SitedFlight, clock: Clock, host: CockpitHost, spec: DeckSpec) {
    this.flight = flight;
    this.clock = clock;
    this.host = host;
    const root = (this.root = document.createElement('aside'));
    root.className = 'cockpit';
    root.hidden = true;
    root.setAttribute('aria-label', 'Flight instruments');
    // a key that steers, as a button: held, it is the key held (W S A D Q E)
    const hold = (key: string, about: string) =>
      `<button data-hold="${key}" title="${about} (${key.toUpperCase()})"><kbd>${key.toUpperCase()}</kbd></button>`;
    // The deck is three panels: the navball's (navball.ts puts it in), this one in the middle, the systems on the right.
    root.innerHTML = `
      <section class="deck-main">
        <div class="cockpit-card" hidden></div>
        <p class="cockpit-phase"><b data-cell="phase"></b><span data-cell="mode"></span>
          <span class="deck-modes">
            <button data-do="guidance" class="switch" aria-pressed="true" title="${spec.guidance} (G)"><kbd>G</kbd>Guidance</button>
            <button data-do="sequence" class="switch" aria-pressed="true" title="${spec.sequence} (B)"><kbd>B</kbd>Sequencer</button>
          </span></p>
        <div class="gauges"></div>
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
            <button data-do="path" class="switch" aria-pressed="true" title="The predicted path: where it goes from here if nothing more is done, its apogee, what happens on the way and where it comes down (J)"><kbd>J</kbd>Path</button>
            <button data-do="navball" class="switch" aria-pressed="true" title="The navball: attitude against the horizon, prograde and retrograde (I)"><kbd>I</kbd>Navball</button>
            <button data-press="y" title="The vehicle's skin off, to see what is inside it and how little room there is, and out of it all round; again puts it back (Y)"><kbd>Y</kbd>Skin off · on</button>
            <button data-press="o" title="The navball's markers and speed: over the turning Earth, or in the frame that does not turn; and a path that goes round, drawn in the same frame (O)"><kbd>O</kbd>Surface · orbit</button>
            ${spec.choose ? `<button data-press="k" title="While the engine burns under guidance: the path if guidance flies on to the record's cutoff, or if the engine were cut now (K)"><kbd>K</kbd>Path · to cutoff · cut now</button>` : ''}
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
            ${spec.flightKeys}
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
      window.addEventListener('blur', () => set(false));
    }
    this.showKeys(false);

    // the way in: beside the clock, which is always on show
    this.button = document.createElement('button');
    this.button.className = 'cockpit-enter';
    this.button.innerHTML = '<kbd>Esc</kbd><span>Fly it</span>';
    this.button.title = spec.enter;
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

  /** For the instruments that are not the deck's own (navball.ts, viewer/path.ts, the cabin): told every sample put on show, with the live state when it is the flight's own instant (null when looking back). */
  listen(fn: Watcher): void {
    this.watchers.push(fn);
  }

  /** Whether this flight can be flown on the deck. */
  abstract get able(): boolean;
  /** The flight's own vehicle of sim/vehicle.ts, where it has one (the path flies its programme ahead), and how it is flown. */
  abstract get craft(): import('./sim/vehicle.ts').Vehicle | null;
  abstract get steering(): { guidance: boolean; sequence: boolean; trim: { pitch: number; yaw: number } };
  /** A control in the cabin, or a part's menu, asking for something (types.ts `Command`, CabinDef `does`). */
  abstract ask(what: string): void;
  abstract can(what: Command['ask']): boolean;
  abstract work(id: string): string | null;
  abstract headed(id: string): boolean | null;
  abstract travel(id: string, t: number): number | null;
  abstract enter(): void;
  abstract leave(): void;
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
    const typing = (e.target as HTMLElement).matches?.('input:not([type=range]), textarea');
    if (e.metaKey || e.ctrlKey || e.altKey || typing) return;
    const key = e.key.toLowerCase();
    if (!this.on) {
      if (down && key === 'l' && !e.repeat && this.able && !this.button.hidden) this.enter();
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
    const what = (
      { ' ': 'next', g: 'guidance', b: 'sequence', n: 'again', escape: 'leave', l: 'leave', x: 'abort' } as Record<string, string>
    )[key];
    if (!what) return;
    e.preventDefault();
    e.stopPropagation();
    this.command(what);
  }
}

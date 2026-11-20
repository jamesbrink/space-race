import { type Impact, impactTitle } from '../sim/contact.ts';
import type { Quat } from '../sim/rigid.ts';
import { floorAt } from '../sim/forces.ts';
import { floorOver, type Ground, SiteContact } from '../sim/sitecontact.ts';
import type { SiteWorld } from '../sim/siteworld.ts';
import type { SolidModel } from '../sim/solids.ts';
import type { EscapeSweep } from '../sim/launchescape.ts';
import type { TowerEscape } from '../sim/plan.ts';
import '../ui/cockpit.css';
import { prefs } from '../app/prefs.ts';
import { leftWhen, runs } from '../app/runs.ts';
import { recordOf, type Run } from '../sim/run.ts';
import type { LiveSample, VehicleState } from '../sim/vehicle.ts';
import { type HandRange, Lever, NOTCH } from '../sim/lever.ts';
import type { Command, Flight, SitedFlight } from '../types.ts';
import { capOf, capsOf, is, isTyping, KEYS, type KeyName, kbd, keyOf, keysOf, modified, which } from '../util/keys.ts';
import { G0 } from '../world/bodies.ts';
import { Scope } from '../util/scope.ts';
import type { DeckNews } from '../viewer/cabin.ts';
import { type Clock, missionTime, Clock as Own } from '../world/clock.ts';
import { type EarthFrame, frameOf } from '../world/earthframe.ts';
import { DEG, siteFrame, type Vec3 } from '../world/frames.ts';
import { ask } from './ask.ts';
import type { NavSample } from './navball.ts';
import { inProgress, type Stake, verdict } from './leaving.ts';
import { type Entry, type EntryKind, pack, readTape, replay, SAVE, stampOf, type Taped } from './tape.ts';

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
  /** Query the pad at the simulation time of an escape, with the held hardware as recorded on its tape. */
  withEscapePad?<T>(
    obstacles: NonNullable<TowerEscape['hull']>['obstacles'],
    at: number,
    held: readonly (readonly [string, number])[] | undefined,
    query: (sweep: EscapeSweep, holds: readonly (readonly [string, number])[]) => T,
  ): T;
  /**
   * What stands at the flight's site and the flown model's hull (the baked solids: sim/siteworld.ts, sim/solids.ts), once
   * the page has them; null until then, and then nothing at the site is struck.
   */
  solids?(): { world: SiteWorld; hull: SolidModel; ground?: Ground | null } | null;
  /** The flight deck has been taken, or left: the page makes way and gives the view to the vehicle. */
  piloting(on: boolean): void;
  /** Something to say across the page: a title and a line (a mechanism worked by hand says where it is sent). */
  say?(title: string, line: string): void;
  /**
   * A flight flown by hand is kept (the clock's instant it was left at, and what it was doing then), parked while the visitor
   * is elsewhere in its page or in the browser's storage, or is no longer (null): the Fly tab says so.
   */
  kept?(at: number | null, phase?: string): void;
  /** The heat shield at `t` (viewer/effects.ts `reading`): its temperature and limit, K, and the stagnation-point heat flux, W/m2. */
  heat?(t: number): { name: string; temperature: number; limit: number; flux: number; warm: boolean; hot: boolean } | null;
}

/** A flight kept as it stood: the clock's instant and pace, and whether it was running. */
interface Kept {
  t: number;
  rate: number;
  running: boolean;
}

/** What a deck tells the page while a kept run is flown again: nothing. */
const SILENT: CockpitHost = { fly: () => {}, piloting: () => {} };
/** How often a run flown by hand is written to the browser's storage while it is flown, ms (and as the page is hidden or closed). */
const EVERY = 5000;
/** A slice of the work of flying a kept run again, ms of a frame: the page goes on drawing meanwhile. */
const SLICE = 8;
/** A key's event for a key played again from a kept run: nothing listens to what is done with it. */
const PLAYED = { preventDefault: () => {}, stopPropagation: () => {} } as unknown as KeyboardEvent;

/** A figure of the middle panel, or a reading of the right one: its cell's id, its name, its unit and what it is. */
export interface Figure {
  id: string;
  label: string;
  unit: string;
  about: string;
}

/**
 * What the throttle lever works at this instant, as the kind has it from the flight on show (`Deck.throttled`): the deck
 * draws it the same way for every flight. Nothing in it is the record's but where the flight on show is the record's.
 */
export interface ThrottleView {
  /** The engines it works, by name ('Strap-ons + Core', 'Booster engine'), and whether any of them is burning. */
  engines: string;
  burning: boolean;
  /** The hand's range on them (sim/lever.ts `handRange`): null for a solid, which no lever works. */
  range: HandRange | null;
  /** Their thrust now, N; the propellant left to them, kg; what they draw at this setting, kg/s; their vacuum specific impulse, s; the vehicle's mass, kg. */
  thrust: number;
  left: number;
  flow: number;
  isp: number;
  mass: number;
  /** Where the lever does not reach what burns now, why (said beside it): the lever is then shown and not worked. */
  not?: string;
  /** What the engines are doing when none burns ('not lit', 'cut off', 'out of propellant'): 'not lit' unless given. */
  doing?: string;
  /** Where the record had the lever at this instant (its throttle curve; 1 where it ran at full): a tick on the slider. */
  record?: number;
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
  /** Labels for a deck that flies an approach instead of a launch. */
  labels?: { steering: string; events: string; restart: string };
  /** Whether the deck has the Hold switch (a kind whose guidance is itself an attitude hold, the docking deck's, has not). */
  hold?: boolean;
  /** The K control (the path to cutoff or cut now): only where the path can fly the programme ahead. */
  choose: boolean;
  /** Buttons for the list's Flight group beyond restarting and leaving (a mechanism, a lock's digits). */
  flightKeys: string;
  /** The way in's tooltip. */
  enter: string;
}

/**
 * How every flight is flown as its deck is taken: by hand, with the attitude held (`hold`): the vehicle's own control system
 * keeps the attitude it was last left at and damps its rates, within the authority the plan gives its steering, and the
 * hands' keys move that attitude; Hold off, the keys work the controls themselves. The real vehicles' autopilots always
 * stabilised them; guidance was the programme on top.
 * How every flight is flown as its deck is taken: by hand. Guidance (G) and the sequencer (B) are off, and the player
 * lights, steers, throttles, stages, cuts and fires; each switch, turned on, has the record's guidance or its sequence fly
 * that part for them. Each entry to Fly starts so (nothing remembers it); a kept run resumes with the switches it had. The
 * launch site's own clock, the idle show and every batch run are still the record's (AGENTS.md: the flight deck).
 */
export const START: Readonly<{ guidance: boolean; sequence: boolean; hold: boolean }> = { guidance: false, sequence: false, hold: true };
/**
 * How fast a key held turns the attitude Hold keeps, rad/s: as a key leans guidance's programme (`TRIM`). The vehicle
 * follows it within its steering's authority, as it would follow its programme.
 */
export const HOLD_TURN = 3 * (Math.PI / 180);

/**
 * How far a key held steers a launch vehicle flown by hand, of its full throw: KSP's fine controls. A key is all or
 * nothing, and at full throw the Redstone's vanes turn the stack end over end in four seconds: a pilot holding the
 * flight director by keys alone (a degree's deadband, 0.15 s to react) breaks it up by bending at T+49 s at full throw,
 * and flies it whole to its cutoff at a tenth. The finger's stick asks as far as it is pushed. The game's, not a figure
 * of any vehicle's: a spacecraft's own jets are worked at their own throw.
 */
export const FINE = 0.1;

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
  ['deck.hold', 'hold'],
];

export type Watcher = (sample: LiveSample, live: VehicleState | null, news?: DeckNews) => void;

const cell = (f: Figure) =>
  `<div class="gauge" title="${f.about}"><span>${f.label}</span><i>${f.unit}</i><b data-cell="${f.id}">0</b></div>`;
const pair = (f: Figure) =>
  `<div class="reading" title="${f.about}"><span>${f.label}</span><b><u data-cell="${f.id}">0</u>${f.unit ? `<i>${f.unit}</i>` : ''}</b></div>`;
/** A supply as a bar of what is left, with the figure and the kilograms beside it (the systems strip). */
export const tank = (id: string, label: string, about: string) =>
  `<div class="tank" title="${about}"><span>${label}</span><u class="bar"></u><b data-cell="${id}"></b><i data-cell="${id}-kg"></i></div>`;

export abstract class Deck<F extends Flight = SitedFlight> {
  protected readonly flight: F;
  private readonly pageClock: Clock;
  private readonly pageHost: CockpitHost;
  protected readonly root: HTMLElement;
  protected readonly button: HTMLButtonElement;
  protected readonly cells = new Map<string, HTMLElement>();
  private readonly listeners: Watcher[] = [];
  protected on = false;
  /**
   * A kept run being flown again (tape.ts): on a clock of its own, at the page's time each entry had, telling the page
   * nothing; null otherwise. The deck's code reads `clock`, `host`, `watchers` and `now` and never knows the difference.
   */
  private replaying: { clock: Clock; now: number } | null = null;
  /** The clock the deck flies by: the page's, or its own while a kept run is flown again. */
  protected get clock(): Clock {
    return this.replaying?.clock ?? this.pageClock;
  }
  protected get host(): CockpitHost {
    return this.replaying ? SILENT : this.pageHost;
  }

  protected escapeFromPad<T>(
    obstacles: NonNullable<TowerEscape['hull']>['obstacles'],
    at: number,
    command: (string | number)[],
    run: (sweep?: EscapeSweep) => T,
  ): T {
    if (!this.pageHost.withEscapePad) return run();
    const held: [string, number][] = [];
    for (let i = 1; i + 1 < command.length; i += 2) {
      const node = command[i];
      const reading = command[i + 1];
      if (typeof node === 'string' && typeof reading === 'number' && Number.isFinite(reading)) held.push([node, reading]);
    }
    // The query is a simulator input even on replay, while the rest of the page host stays silent.
    return this.pageHost.withEscapePad(obstacles, at, this.replaying ? held : undefined, (sweep, holds) => {
      if (!this.replaying) for (const [node, reading] of holds) command.push(node, reading);
      return run(sweep);
    });
  }
  /** Who is told of each sample put on show (`listen`): nobody while a kept run is flown again. */
  protected get watchers(): readonly Watcher[] {
    return this.replaying ? [] : this.listeners;
  }
  /** The page's time as the deck's guards read it (a second Space, X twice), whole ms: as written in the tape while one is played. */
  protected now(): number {
    return this.replaying ? this.replaying.now : Math.round(performance.now() - this.zero);
  }
  /** Where `now` counts from: the deck's making, or (a kept run taken up again) far enough back that its guards have lapsed. */
  private zero = performance.now();
  /** What has been done to this run since it was stood on the pad (tape.ts), while the deck can write it down. */
  private tape: { setup: Record<string, boolean>; entries: Entry[] } | null = null;
  /** Calls into the deck under way: only the outermost is written down, the rest are what it does. */
  private depth = 0;
  /** The keys and stick as last written down. */
  private heldKey = '|0|0|0';
  /** The instant the deck last followed the clock to, and the last at which that flew the simulator on. */
  private lastT = 0;
  private reachT = 0;
  /** The run kept in the browser's storage for this flight, not yet taken up; why it cannot be ('stale'); and when it last went in. */
  private stored: { note: { t: number; phase: string; left: number }; tape: Taped | null } | null = null;
  private savedAt = 0;
  /** The last write to the browser's storage did not take: leaving the page would lose the run, and is asked about. */
  private unsaved = false;
  /** A kept run being flown again a slice at a time, and how to stop it. */
  private restoring: { stop(): void } | null = null;
  /**
   * The throttle lever (sim/lever.ts), one for every flight and every engine a hand can throttle: the arrows a notch, Z
   * full, Cut nothing. It starts full, which is the record's setting, and each kind gives it to what burns (`levered`).
   */
  protected lever = new Lever([0, 1]);
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
    if (!this.stakes || this.save()) return; // (written: nothing is lost by going)
    e.preventDefault();
    e.returnValue = '';
  };
  /** The page hidden or going: what is flown by hand is written down as it stands (and so is lost by nothing short of a crash). */
  private readonly hidden = (): void => {
    if (document.visibilityState === 'hidden') this.save();
  };

  private readonly lastImpact = new Map<string, number>();
  private readonly announcedBreakups = new Set<string>();
  private hardestImpact: Impact | null = null;
  private breakupSeen = false;
  protected impactSummary(): string {
    const hit = this.hardestImpact;
    return hit
      ? `<p class="cockpit-why">Largest collision: ${hit.name} at T+${hit.t.toFixed(1)} s, ${hit.speed.toFixed(2)} m/s closing and ${hit.energy.toFixed(1)} J absorbed.${this.breakupSeen ? ' Parts broke free during the flight.' : ''}</p>`
      : '';
  }
  private siteMade: SiteContact | null = null;
  /**
   * The flown vehicle against what stands at its site (sim/sitecontact.ts), once the page has the site's solids:
   * `standing` gives the vehicle's attitude at liftoff, by which the model's hull is the body's.
   */
  protected siteContact(standing: () => Quat): SiteContact | null {
    if (this.siteMade) return this.siteMade;
    const solids = this.pageHost.solids?.();
    if (!solids || !this.flight.site) return null;
    this.siteMade = new SiteContact(
      this.flight,
      solids.world,
      solids.hull,
      siteFrame(this.flight.site),
      frameOf(this.flight),
      standing(),
      solids.ground ?? null,
    );
    return this.siteMade;
  }

  /**
   * What a flight's shed bodies and its simulators' floors need of the site (sim/shed.ts `ShedOptions`, sitecontact.ts
   * `floorOver`): the site's surfaces once the page has them, what its pieces are called, and the floor under the land
   * for what comes down on the land by contact.
   */
  protected atSiteOf(standing: () => Quat) {
    if (!this.flight.site) throw new Error('a flight with no site has none to meet');
    const site = siteFrame(this.flight.site);
    const flat = floorAt(site, this.flight.site.seaLevel.value);
    const contact = () => this.siteContact(standing);
    return {
      site: () => contact()?.surfaces ?? null,
      names: new Map(this.flight.models.flatMap((m) => m.parts.map((p) => [`${m.id}/${p.node}`, p.name] as const))),
      /** The vehicle's own floor: the land where it lies lower than the pad's level. */
      floor: floorOver(contact, flat),
      /** And what it sheds: under the land, which it meets by contact. */
      under: floorOver(contact, flat, 1),
    };
  }

  protected impact(hit: Impact): void {
    if (hit.speed < 0.005 && hit.energy < 0.05) return; // both round to zero on the deck
    const breakup = Boolean(hit.activeBroken || hit.broken?.length);
    if (breakup) {
      // Replanning can return the same impact at the handover instant.
      const event = `${hit.on}@${hit.t.toFixed(6)}`;
      if (this.announcedBreakups.has(event)) return;
      this.announcedBreakups.add(event);
    }
    this.breakupSeen ||= breakup;
    if (!this.hardestImpact || hit.energy > this.hardestImpact.energy) this.hardestImpact = hit;
    const last = this.lastImpact.get(hit.on);
    this.lastImpact.set(hit.on, hit.t);
    if (!breakup && last !== undefined && hit.t >= last && hit.t - last < 0.5) return;
    this.host.say?.(
      impactTitle(hit),
      `${hit.name} struck at ${hit.speed.toFixed(2)} m/s. The impact absorbed ${hit.energy.toFixed(1)} J.${hit.activeBroken ? ' Parts broke free from the spacecraft.' : ''}${hit.broken?.length ? ' Detached hardware broke apart.' : ''}`,
    );
  }

  constructor(parent: HTMLElement, flight: F, clock: Clock, host: CockpitHost, spec: DeckSpec) {
    this.flight = flight;
    this.enterTip = spec.enter;
    this.pageClock = clock;
    this.pageHost = host;
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
    const warp = (i: number, about: string) =>
      `<button data-press="${slot('clock.rate', i)}" title="${about} (${capOf(slot('clock.rate', i))})"><kbd>${capOf(slot('clock.rate', i))}</kbd></button>`;
    const rate = (i: number, about: string, label: string) =>
      `<button data-press="${slot('clock.rate', i)}" title="${about} (${capOf(slot('clock.rate', i))})"><kbd>${capOf(slot('clock.rate', i))}</kbd>${label}</button>`;
    const { steering, events, restart } = spec.labels ?? { steering: 'Steering', events: 'Events', restart: 'Restart' };
    // The deck is three panels: the navball's (navball.ts puts it in), this one in the middle, the systems on the right.
    root.innerHTML = `
      <section class="deck-main">
        <div class="cockpit-card" hidden></div>
        <div class="cockpit-card cockpit-kept" role="group" aria-labelledby="deck-kept-t" hidden>
          <h3 id="deck-kept-t"><span data-kept="title">Your flight, kept at </span><span data-cell="kept-at"></span></h3>
          <span class="cockpit-why" data-kept="why"></span>
          <p>
            <button data-do="resume" title="Fly on from where it was left (${capsOf('deck.resume').join(' ')})">${kbd('deck.resume')}Resume</button>
            <button data-do="again" title="Throw it away and start again from the pad, as flown (${capsOf('deck.again').join(' ')})">${kbd('deck.again')}Start over</button>
          </p>
        </div>
        <p class="cockpit-phase"><b data-cell="phase"></b><span data-cell="mode"></span>
          <span class="deck-modes">
            <span class="deck-takeover">A switch, the action or the throttle takes control</span>
            <button data-do="guidance" class="switch" aria-pressed="true" title="${spec.guidance} (${capsOf('deck.guidance').join(' ')})">${kbd('deck.guidance')}<span class="for-keys">Guidance</span><span class="for-touch">${steering} · <span class="deck-auto">Auto</span><span class="deck-manual">Manual</span></span></button>
            <button data-do="sequence" class="switch" aria-pressed="true" title="${spec.sequence} (${capsOf('deck.sequence').join(' ')})">${kbd('deck.sequence')}<span class="for-keys">Sequencer</span><span class="for-touch">${events} · <span class="deck-auto">Auto</span><span class="deck-manual">Manual</span></span></button>
            ${spec.hold === false ? '' : `<button data-do="hold" class="switch" aria-pressed="true" title="Hold: the autopilot keeps the attitude you leave it at, within what the vehicle can steer with; your keys move it, and the navball's flight director shows where the record's programme points. Off, the keys work the controls themselves (${capsOf('deck.hold').join(' ')})">${kbd('deck.hold')}<span>Hold</span></button>`}
          </span></p>
        <div class="gauges"></div>
        <div class="deck-throttle" hidden>
          <span class="thr-name">Throttle</span>
          <span class="thr-lever"><input type="range" min="0" max="1" step="0.05" value="1" data-lever aria-label="Throttle" title="The throttle lever: a notch with the arrows (${capsOf('deck.lever').join(' ')}), ${capsOf('deck.full').join(' ')} full" /></span>
          <b data-cell="lever">100 %</b>
          <span class="thr-do">
            <button data-press="${KEYS['deck.lever'].slots[1]}" class="for-keys" title="Throttle down a notch (${capOf(KEYS['deck.lever'].slots[1] as string)})"><kbd>${capOf(KEYS['deck.lever'].slots[1] as string)}</kbd></button>
            <button data-press="${KEYS['deck.lever'].slots[0]}" class="for-keys" title="Throttle up a notch (${capOf(KEYS['deck.lever'].slots[0] as string)})"><kbd>${capOf(KEYS['deck.lever'].slots[0] as string)}</kbd></button>
            <button data-press="${KEYS['deck.full'].slots[0]}" title="Full throttle (${capsOf('deck.full').join(' ')})">${kbd('deck.full')}Full</button>
            <button data-do="cut" title="Cut: the lever to nothing, and every liquid engine it works shut down (a solid burns on)">Cut</button>
          </span>
          <span class="thr-what" data-cell="lever-engine"></span>
          <span class="thr-left" data-cell="lever-left"></span>
        </div>
        <div class="deck-act">
          <button data-do="next" class="cockpit-next" title="Set off the next event of the flight now (${capsOf('deck.next').join(' ')})">${kbd('deck.next')}<span data-cell="next"></span></button>
          <p class="cockpit-prompt" data-cell="prompt" role="status" hidden></p>
          <button data-do="abort" class="cockpit-abort" title="Abort: the escape the spacecraft had at this instant, while it is on its launch vehicle: press twice (${capsOf('deck.abort').join(' ')}, ${capsOf('deck.abort').join(' ')})">${kbd('deck.abort')}${kbd('deck.abort')}<span data-cell="abort">Abort</span></button>
        </div>
        <p class="deck-foot">
          <span class="deck-steer for-keys" title="W S pitch, A D yaw, Q E roll. On a launch vehicle flown by hand a key is a tenth of full throw (fine control); with guidance on it leans the programme">${hold(pitchDown, 'Pitch the nose downrange')}${hold(pitchUp, 'Pitch the nose back')}<em>pitch</em>${hold(yawLeft, 'Yaw left')}${hold(yawRight, 'Yaw right')}<em>yaw</em>${hold(rollLeft, 'Roll left')}${hold(rollRight, 'Roll right')}<em>roll</em></span>
          <span class="for-touch">Stick steers · ⟲ ⟳ roll</span>
          <span class="deck-turn deck-warp for-keys" title="How fast time runs: slower, faster (${capsOf('clock.rate').join(' ')})">${warp(0, 'Time runs slower')}${warp(1, 'Time runs faster')}<em data-cell="warp">1×</em></span>
          <button data-do="keys" aria-expanded="false" title="Every key and control of the flight deck"><span class="for-keys">Keys</span><span class="for-touch">More</span><i class="chevron"></i></button>
        </p>
        <div class="cockpit-keys" hidden>
          <div><h4>Flight</h4><p>
            ${spec.flightKeys}
            <button data-do="again" title="${restart} (${capsOf('deck.again').join(' ')})">${kbd('deck.again')}${restart}</button>
            <button data-do="leave" title="Leave the flight deck (${capsOf('deck.leave').join(' ')})">${kbd('deck.leave')}Leave</button>
          </p></div>
          <div><h4>Show</h4><p>
            <button data-do="path" class="switch" aria-pressed="true" title="The predicted path: where it goes from here if nothing more is done, its apogee, what happens on the way and where it comes down (${capsOf('path.show').join(' ')})">${kbd('path.show')}Path</button>
            <button data-press="${KEYS['map.show'].slots[0]}" data-map class="switch" aria-pressed="false" title="The map: the whole path from far out, the way it came and what else flies, the Earth turning under it; again for the view it was taken from (${capsOf('map.show').join(' ')})">${kbd('map.show')}Map</button>
            <button data-do="navball" class="switch" aria-pressed="true" title="The navball: attitude against the horizon, prograde and retrograde (${capsOf('navball.show').join(' ')})">${kbd('navball.show')}Navball</button>
            <button data-press="${KEYS['cut.toggle'].slots[0]}" data-skin class="switch" aria-pressed="true" title="The vehicle's skin: off, to see what is inside it and how little room there is, and out of it all round; on, as it flew (${capsOf('cut.toggle').join(' ')})">${kbd('cut.toggle')}Skin</button>
            <button data-press="${KEYS['navball.frame'].slots[0]}" title="The navball's markers and speed: over the turning Earth, or in the frame that does not turn; and a path that goes round, drawn in the same frame (${capsOf('navball.frame').join(' ')})">${kbd('navball.frame')}Surface · orbit</button>
            ${spec.choose ? `<button data-press="${KEYS['path.choose'].slots[0]}" title="While the engine burns under guidance: the path if guidance flies on to the record's cutoff, or if the engine were cut now (${capsOf('path.choose').join(' ')})">${kbd('path.choose')}Path · to cutoff · cut now</button>` : ''}
          </p></div>
          <div><h4>Camera</h4><p>
            <button data-press="${KEYS['cam.next'].slots[0]}" title="The next camera (${capsOf('cam.next').join(' ')})">${kbd('cam.next')}Next view</button>
            <button data-press="${KEYS['cam.home'].slots[0]}" title="Centre the vehicle (${capsOf('cam.home').join(' ')})">${kbd('cam.home')}Centre</button>
            <span class="deck-turn" title="Turn the view (the left and right arrows; drag to tilt it: up and down are the throttle's)">${turn(1, 'Turn the view left')}${turn(3, 'Turn the view right')}<em>turn</em></span>
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
        </div>
      </section>
      <section class="deck-sys" aria-label="Systems">
        <div class="systems" data-cell="systems"></div>
        <button class="sys-more" data-do="details" aria-expanded="false" title="The air on the vehicle, where it is and how it points: shown, or folded away"><span>Details</span><i class="chevron"></i></button>
        <div class="sys-detail">
          <div class="readings">
            ${spec.readings.map(pair).join('\n            ')}
          </div>
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
      if (e) this.steer();
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
        this.steer();
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
    lever.addEventListener('input', () => {
      const to = Number(lever.value);
      this.journal('l', [to], () => this.setLever(to));
    });
    this.throttleRow = root.querySelector<HTMLElement>('.deck-throttle')!;
    for (const el of root.querySelectorAll<HTMLElement>('[data-cell]')) this.cells.set(el.dataset.cell!, el);
    // Every key the deck shows is also a button. One that is an event (Space, G, X...) is its command; one that is held
    // (the six that steer) is that key held, for as long as the pointer is down on it; the rest press their key, so a
    // click does exactly what the key does, whoever listens for it (the camera, the clock, the navball, the path).
    const press = (key: string, down: boolean) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key }));
    root.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('button');
      if (b?.dataset.do === 'keys') this.showKeys(!root.classList.contains('keys-open'));
      else if (b?.dataset.do === 'details') this.showDetails(!root.classList.contains('details-open'));
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
          this.steer();
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
    this.showDetails(prefs.get('deckDetails'), false);
    // (the clock's pace beside the keys that set it)
    clock.listen(() => this.put('warp', `${clock.rate}×`));

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
    this.scope.on(document, 'visibilitychange', this.hidden);
    this.scope.on(window, 'pagehide', () => this.save());
    clock.listen(() => {
      if (this.replaying) return; // (a kept run is being flown again, on its own clock: the page's is held meanwhile)
      // (kept and not yet resumed: the clock stays where it was left, whoever touches it)
      const p = this.pending;
      if (p && this.on) {
        if (clock.running) clock.pause();
        if (clock.t !== p.t) clock.seek(p.t);
      }
      this.followed();
      this.watch();
    });
    // a run kept from another visit (runs.ts): the Fly tab says so, and Fly takes it up (or says why it cannot)
    const kept = runs.read(flight.id);
    if (kept) {
      const tape = kept.stamp === stampOf(flight) ? readTape(kept.run) : null;
      this.stored = { note: { t: kept.t, phase: kept.phase, left: kept.left }, tape };
      this.pageHost.kept?.(kept.t, kept.phase);
    }
  }

  /** The page has gone to another flight: off the window, and out of the page. A run flown by hand is written down first. */
  dispose(): void {
    this.restoring?.stop();
    this.save();
    this.parked = this.pending = null;
    this.tape = null;
    this.sync();
    this.pageHost.kept?.(null);
    this.scope.dispose();
    this.root.remove();
    this.button.remove();
  }

  /** The clock has moved: written down where the run depends on it (the keys held as they change; a frame the kind integrates), and followed. */
  private followed(): void {
    // (only the clock's own moves are written: one the deck makes as it follows, or a command makes, is made again by them)
    const writing = this.writing && this.depth === 0;
    if (writing) this.snapHeld(this.lastT);
    const framed = writing && this.framed;
    const t = this.clock.t;
    const ticks = this.ticks;
    this.depth++;
    try {
      this.follow();
    } finally {
      this.depth--;
    }
    this.drawThrottle();
    if (framed) this.write('f', [], t, this.ticks);
    this.lastT = this.clock.t;
    if (this.ticks !== ticks) this.reachT = this.clock.t;
    if (writing && this.stakes && performance.now() - this.savedAt > EVERY) {
      this.savedAt = performance.now(); // (once, whether it takes or not: tried again next time round)
      const idle = (window as { requestIdleCallback?: (f: () => void) => void }).requestIdleCallback ?? ((f) => setTimeout(f, 0));
      idle(() => this.save());
    }
  }

  /** The deck is writing down what is done to the run: one on the pad or in flight, not one being flown again, nor one kept and not yet resumed. */
  private get writing(): boolean {
    return this.tape !== null && !this.replaying && this.on && !this.pending;
  }

  /** The keys and stick as they stand, as one string. */
  private holdKey(): string {
    const f = this.finger;
    return `${[...this.held].sort().join('')}|${f.pitch}|${f.yaw}|${f.roll}`;
  }

  /** Write down the keys and stick held, if they have changed since they last were: at `t`, the instant the deck last followed to. */
  private snapHeld(t: number): void {
    const k = this.holdKey();
    if (k === this.heldKey) return;
    this.heldKey = k;
    const f = this.finger;
    this.write('h', [[...this.held].sort().join(''), f.pitch, f.yaw, f.roll], t);
  }

  private write(kind: EntryKind, payload: (string | number)[], t = this.clock.t, ticks = this.ticks, at?: number): void {
    const e: Entry = [kind, t, ticks, this.now(), this.clock.running ? 1 : 0, ...payload];
    if (at === undefined) this.tape!.entries.push(e);
    else this.tape!.entries.splice(at, 0, e);
  }

  /**
   * Do `fn`, something asked of the deck that can change the run (a command, a key, an order, a hand on the controls),
   * writing it down as it was asked (the clock, the ticks, the page's time before it) if it is not part of another, and if
   * `kept` says it was taken.
   */
  protected journal<T>(kind: EntryKind, payload: (string | number)[], fn: () => T, kept: (r: T) => boolean = () => true): T {
    if (!this.writing || this.depth > 0) return fn();
    this.snapHeld(this.clock.t);
    const tape = this.tape!;
    const at = tape.entries.length;
    const head = { t: this.clock.t, ticks: this.ticks, now: this.now(), running: this.clock.running };
    this.depth++;
    let r: T;
    try {
      r = fn();
    } finally {
      this.depth--;
    }
    if (kept(r) && this.tape === tape) tape.entries.splice(at, 0, [kind, head.t, head.ticks, head.now, head.running ? 1 : 0, ...payload]);
    return r;
  }

  /** A hand has gone to the controls: written down, then told to the kind. */
  private steer(): void {
    this.journal('s', [], () => this.steered());
  }

  /** A run begins on the pad (the kind's `fresh`): what is done to it is written down from here, with the switches it began with. */
  protected started(): void {
    this.lever = new Lever([0, 1]);
    this.syncLever();
    queueMicrotask(() => this.drawThrottle()); // (once the kind has stood the run on its pad)
    this.lastImpact.clear();
    this.announcedBreakups.clear();
    this.hardestImpact = null;
    this.breakupSeen = false;
    if (this.replaying) return;
    this.forget(); // (a new run: whatever was kept for this flight is let go, by starting over or by its having ended)
    this.tape = { setup: this.switches(), entries: [] };
    this.heldKey = this.holdKey();
    this.lastT = this.reachT = this.clock.t;
  }

  /**
   * Write the run flown by hand to the browser's storage as it stands (runs.ts), if there is one going on, kept, or waiting
   * to be resumed; a run that has ended, or one watched as flown, has nothing to keep and is let go from there. True if
   * nothing is lost by the page going now: written, or nothing to write (a kept run not yet taken up is there already).
   */
  save(): boolean {
    if (this.replaying || this.restoring || this.stored) return true; // (a run not yet taken up, or being taken up, is still where it was kept)
    const flying = this.on && !this.pending && verdict(this.stake, 'within') === 'keep';
    const waiting = this.refused ? null : this.pending;
    const view = this.parked ?? waiting ?? (flying ? { t: this.clock.t, rate: this.clock.rate, running: this.clock.running } : null);
    // (nothing to keep: lost by going only if it has just come down, its result not yet read: leaving.ts)
    if (!view || !this.tape) return !(this.on && verdict({ ...this.stake, saved: false }, 'beyond') === 'ask');
    const end = { t: this.reachT, ticks: this.ticks, print: this.print() };
    const run: Taped = { v: SAVE, setup: this.tape.setup, entries: this.tape.entries, end, view };
    const ok = runs.write({
      flight: this.flight.id,
      stamp: stampOf(this.flight),
      t: view.t,
      phase: this.parked && this.parkedPhase ? this.parkedPhase : this.phaseNow(),
      left: Date.now(),
      run: pack(run),
    });
    this.unsaved = !ok;
    this.stored = null;
    this.savedAt = performance.now();
    this.sync();
    return ok;
  }

  /** Whether going away from the page now would lose a run flown by hand: it is written down first if it can be (`save`). */
  risks(): boolean {
    return !this.save();
  }

  /** What the run was doing as it was parked: the phase line then (the deck is put away, and its line goes on). */
  private parkedPhase: string | null = null;

  /** What the run is doing, in the deck's words (its phase line). */
  private phaseNow(): string {
    return this.cells.get('phase')?.textContent || 'In flight';
  }

  /** The run kept in the browser's storage is let go: there is nothing to resume (it ended, was thrown away, or cannot be flown). */
  private forget(): void {
    this.stored = null;
    if (runs.list()[this.flight.id]) runs.drop(this.flight.id);
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
    this.listeners.push(fn);
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

  /** A control in the cabin, or a part's menu, asking for something (types.ts `Command`, CabinDef `does`): written down, and done (`order`). */
  ask(what: string): void {
    this.journal('a', [what], () => this.obey(what));
  }
  /** A mechanism worked by hand: written down, and done (`worked`). Says where it is now sent, or null if nothing was worked. */
  work(id: string): string | null {
    return this.journal('w', [id], () => this.worked(id));
  }
  protected abstract obey(what: string): void;
  protected abstract worked(id: string): string | null;
  abstract can(what: Command['ask']): boolean;
  abstract headed(id: string): boolean | null;
  abstract travel(id: string, t: number): number | null;
  abstract enter(): void;
  /** The run stood on its pad, its clock stopped at liftoff (each kind's own, which calls `started`). */
  protected abstract fresh(): void;
  /** How many ticks the simulator has flown on this run (tape.ts checks each entry against it). */
  protected abstract get ticks(): number;
  /** The run's state as one string, exactly (tape.ts `pack`): a run flown again must come to the same. */
  protected abstract print(): string;
  /** The kind's switches (guidance, the sequencer, ...): read, or set before a run is stood on the pad. */
  protected abstract switches(to?: Record<string, boolean>): Record<string, boolean>;
  /** Whether the run now depends on the frames themselves, so that each must be written down (the attitude turned by hand, frame by frame). */
  protected get framed(): boolean {
    return false;
  }
  /** Whether the flight has been taken over (the deck's mode is no longer "as flown"). */
  protected abstract get byHand(): boolean;
  /** Whether the run on the deck has ended: landed, or broken up. */
  protected abstract get runOver(): boolean;
  /** The deck is taken back up with the run it kept: show it to the scene and the instant the clock is at. */
  protected abstract restore(): void;
  /** The clock has moved: bring the flight up to it and show it. */
  protected abstract follow(): void;
  /** A command of the deck's: a button's `data-do`, or a key's (next, guidance, sequence, abort, again, leave). */
  protected abstract command(what: string, input?: (string | number)[]): void;
  /** A key the flight kind has beyond the deck's own (a throttle's arrows, a lock's digits): true if it took it. */
  protected extraKey(_key: string, _e: KeyboardEvent): boolean {
    return false;
  }
  /** A hand has gone to the controls (a key, its button, the stick): for a kind that must say what the hands may do. */
  protected steered(): void {}
  /**
   * The lever moved (its slider, an arrow, Z, Cut, or a kept run played again): put where it was asked, and told to the
   * kind (`levered`), which gives it to what burns.
   */
  protected setLever(to: number): void {
    const from = this.lever.at;
    this.lever.move(Math.round(to * 1000) / 1000); // (a notch is a twentieth: kept to the notch, not to its sum's last bit)
    this.syncLever();
    if (this.lever.at !== from) this.levered(from);
    this.drawThrottle();
  }
  /** The lever has moved from `from`: the kind's to give to its engines (and to take the flight over, where that is what it does). */
  protected levered(_from: number): void {}
  /**
   * Where the record's guidance would point the nose at a sample on show, or null where it has nothing to say: the
   * navball's flight-director cue (session.ts gives it to `Navball.target`), shown whether guidance flies or not, so a
   * hand can fly the mission as intended.
   */
  director(_s: NavSample): Vec3 | null {
    return null;
  }
  /**
   * The record's run, its samples in order of time (sim/run.ts `recordOf`, made once a flight): what the mission intended,
   * for the predicted path to draw as a reference line beside the way ahead (viewer/path.ts `PathSource.intended`). Empty
   * for a flight with nothing to fly.
   */
  intended(): readonly { t: number; r: Vec3; centre?: Vec3 }[] {
    const flight = this.flight as Flight & Partial<SitedFlight>;
    if (!flight.site) return [];
    return (recordOf(flight as SitedFlight)?.samples ?? []) as readonly { t: number; r: Vec3; centre?: Vec3 }[];
  }
  /** What the lever works now (`ThrottleView`), or null where there is nothing a lever could work. */
  protected throttled(): ThrottleView | null {
    return null;
  }
  private throttleRow: HTMLElement | null = null;
  private throttleKey = '';
  private syncLever(): void {
    const slider = this.root.querySelector<HTMLInputElement>('[data-lever]');
    if (slider && Number(slider.value) !== this.lever.at) slider.value = String(this.lever.at);
  }

  /**
   * The throttle row, from the kind's `throttled`: the lever and where it stands, what it works and its thrust, and what
   * is left to it (the burn's time at this setting and the speed it can still give, by the rocket equation on the live
   * mass). A range that is the game's and not the engine's says so.
   */
  protected drawThrottle(): void {
    const row = this.throttleRow;
    if (!row) return;
    const view = this.on ? this.throttled() : null;
    row.hidden = !view;
    if (!view) return;
    const r = view.range;
    const at = this.lever.at;
    const cut = r ? at < r.least - 1e-9 : false;
    const pct = (x: number) => `${Math.round(x * 100)}`;
    const lever = r ? (cut ? 'Cut' : `${pct(at)} %`) : 'Solid';
    const what = `${view.engines} · ${view.burning ? `${(view.thrust / 1000).toFixed(view.thrust < 20_000 ? 1 : 0)} kN` : (view.doing ?? 'not lit')}`;
    const burn = view.flow > 0 && view.burning ? view.left / view.flow : Number.NaN;
    const dv = view.left > 0 && view.mass > view.left && view.isp > 0 ? view.isp * G0 * Math.log(view.mass / (view.mass - view.left)) : 0;
    const time = (x: number) => (x >= 60 ? `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}` : `${x.toFixed(0)} s`);
    const left = view.left > 0.5 ? `${Number.isFinite(burn) ? `${time(burn)} · ` : ''}Δv ${dv.toFixed(0)} m/s` : 'Empty';
    const tip = view.not
      ? view.not
      : !r
        ? 'A solid: lit, it burns until it is spent. No lever works it'
        : r.real
          ? `The engine throttles ${pct(r.least)} to ${pct(r.most)} % of its rated thrust; under ${pct(r.least)} it is cut`
          : `${pct(r.least)} to ${pct(r.most)} % is the game’s range (${r.confidence}). ${r.source}`;
    const record = view.record;
    const key = [lever, what, left, tip, at, r?.least, record].join('|');
    if (key === this.throttleKey) return;
    this.throttleKey = key;
    this.put('lever', lever);
    const game = r && !r.real ? (r.fixed ? ' · real: fixed thrust' : ' · range: the game’s') : '';
    this.put('lever-engine', `${what}${view.not ? ` · ${view.not}` : game}`);
    this.put('lever-left', `${record !== undefined && record < 0.995 ? `record ${pct(record)} % · ` : ''}${left}`);
    row.title = tip;
    row.classList.toggle('solid', !r);
    row.classList.toggle('cut', cut);
    row.classList.toggle('idle', Boolean(view.not));
    row.style.setProperty('--least', `${(r?.least ?? 0) * 100}%`);
    row.style.setProperty('--record', record === undefined ? '-10%' : `${record * 100}%`);
  }

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

  /** The systems' readings (the air, where it is, how it points), shown or folded under Details: remembered. */
  protected showDetails(open: boolean, remember = true): void {
    if (remember) prefs.set('deckDetails', open);
    this.root.querySelector('[data-do=details]')!.setAttribute('aria-expanded', String(open));
    this.root.classList.toggle('details-open', open);
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
    return {
      // (by hand from the start, a run is at stake once it is flown: one still standing on its pad untouched is not)
      byHand: this.byHand && this.ticks > 0,
      over,
      since: over && this.endedAt !== null ? (performance.now() - this.endedAt) / 1000 : 0,
      saved: !this.unsaved && runs.usable(),
    };
  }

  /**
   * Whether the page holds a run flown by hand that has not ended (or ended a moment ago): going on at the deck, kept while
   * the visitor is elsewhere in the page, or taken up and not yet resumed. What becomes of it as the page goes is `save`'s.
   */
  get stakes(): boolean {
    return this.parked !== null || (this.pending !== null && !this.refused) || (this.on && inProgress(this.stake));
  }

  /** A flight is kept, in the page or in the browser's storage: the Fly tab says so, and Fly takes it up. */
  get keeping(): boolean {
    return this.parked !== null || this.stored !== null;
  }

  /**
   * Leave the deck, going to another place of the same flight (its Gallery, its Launch site, or just the deck put away). A
   * flight flown by hand that is going on is kept, parked as it stands with the clock stopped, written to the browser's
   * storage, and Fly resumes it (here, or on another visit); anything else is let go as it always was.
   */
  leave(): void {
    if (!this.on) return;
    if (this.restoring || this.refused) {
      // (still being flown again, or found unflyable: what was kept stays where it was, or is gone already)
      this.restoring?.stop();
      this.pending = null;
      this.refused = false;
      this.hideKept();
      this.closed(this.enterTip);
      if (this.stored) this.pageHost.kept?.(this.stored.note.t, this.stored.note.phase);
      this.sync();
      return;
    }
    if (verdict(this.stake, 'within') === 'keep') {
      const at = this.pending ?? { t: this.clock.t, rate: this.clock.rate, running: this.clock.running };
      this.parkedPhase = this.phaseNow();
      this.leftAt = Date.now();
      this.pending = null;
      this.hideKept();
      this.closed(this.enterTip);
      this.parked = at;
      const saved = this.save();
      this.host.kept?.(at.t, this.parkedPhase);
      this.host.say?.(
        'Your flight is kept',
        saved
          ? `Fly resumes it where you left it, at ${missionTime(at.t)}: now, or on another visit`
          : `Fly resumes it where you left it, at ${missionTime(at.t)}, while this page is open (this browser will not keep it)`,
      );
      this.sync();
    } else this.end();
  }

  /** Let the flight go, whatever it is: the deck is put away, and what was kept (in the page and in the browser's storage) is dropped. */
  end(): void {
    this.restoring?.stop();
    this.pending = null;
    this.refused = false;
    this.hideKept();
    if (this.on) this.closed(this.enterTip);
    this.parked = null;
    this.forget();
    this.pageHost.kept?.(null);
    this.sync();
  }

  /**
   * Put the deck away as the page lets the flight go (another flight, the front page): a run flown by hand is written down
   * first (`save`), and is not dropped: it is there to be taken up again.
   */
  shelve(): void {
    this.save();
    this.restoring?.stop();
    this.pending = null;
    this.refused = false;
    this.hideKept();
    if (this.on) this.closed(this.enterTip);
    this.parked = null;
    this.tape = null;
    this.pageHost.kept?.(null);
    this.sync();
  }

  /** The kept flight thrown away, by the mark beside Fly: asked first, since it cannot be had back. */
  discard(): void {
    this.question(
      () => this.end(),
      () => {},
      'drop',
    );
  }

  /** When the run parked in the page was left (ms since 1970). */
  private leftAt = 0;
  /** The kept run could not be flown again: the card says so, and only starting over is offered. */
  private refused = false;

  /** The card over the middle panel for a kept flight: what it is, and which of its two answers can be given. */
  private showKept(at: number, title: string, why: string, ready: boolean): void {
    const card = this.root.querySelector<HTMLElement>('.cockpit-kept')!;
    card.querySelector<HTMLElement>('[data-kept=title]')!.textContent = title;
    card.querySelector<HTMLElement>('[data-kept=why]')!.textContent = why;
    this.cells.get('kept-at')!.textContent = this.refused ? '' : missionTime(at);
    const resume = card.querySelector<HTMLButtonElement>('[data-do=resume]')!;
    resume.hidden = this.refused;
    resume.disabled = !ready;
    card.hidden = false;
    (ready ? resume : card.querySelector<HTMLButtonElement>('[data-do=again]')!).focus({ preventScroll: true });
  }

  /** What a kept flight's card says of it: what it was doing, when it was left, and that the clock waits. */
  private static why(phase: string, left: number): string {
    return `${phase}, left ${leftWhen(left)}. The clock is stopped where you left it until you choose.`;
  }

  /** Take up the flight that was kept, stopped where it was left, with the choice to resume or start over. */
  protected resume(): void {
    if (!this.parked) return void this.takeUp();
    const at = this.parked;
    this.parked = null;
    this.pending = at;
    this.host.kept?.(null);
    this.clock.seek(at.t);
    this.restore();
    this.drawThrottle(); // (the clock is held: nothing else draws it)
    this.showKept(at.t, 'Your flight, kept at ', Deck.why(this.parkedPhase ?? this.phaseNow(), this.leftAt), true);
    this.sync();
  }

  /**
   * Take up the run kept in the browser's storage: the deck flies it again from the pad, on a clock of its own and a slice
   * at a time (tape.ts `replay`), the page's clock held where it was left; then, if it came to the same state, it is as it
   * was when it was left, waiting for Resume. A run that cannot be flown again (the flight or the simulator has changed
   * since, or it came out otherwise) is let go, and the card says so.
   */
  private takeUp(): void {
    const kept = this.stored!;
    const tape = kept.tape;
    this.tape = null; // (what this page wrote before is not this run's)
    this.pageHost.kept?.(null);
    this.pending = tape?.view ?? { t: 0, rate: 1, running: false };
    if (!tape) return void this.refuse();
    this.pageClock.pause();
    this.pageClock.seek(tape.view.t);
    const own = new Own(this.flight.launch);
    this.replaying = { clock: own, now: 0 };
    own.listen(() => this.follow());
    this.switches(tape.setup);
    this.fresh();
    const play = (e: Entry) => this.play(e);
    const deck = this;
    const it = replay(tape, {
      clock: own,
      get ticks() {
        return deck.ticks;
      },
      get now() {
        return deck.replaying?.now ?? 0;
      },
      set now(v: number) {
        if (deck.replaying) deck.replaying.now = v;
      },
      play,
      print: () => this.print(),
    });
    let timer = 0;
    this.restoring = {
      stop: () => {
        clearTimeout(timer);
        this.replaying = null;
        this.restoring = null;
      },
    };
    const title = 'Your flight, kept at ';
    const flying = (share: number) =>
      this.showKept(tape.view.t, title, `Flying it again to where you left it: ${Math.floor(share * 100)} %`, false);
    flying(0);
    const step = (): void => {
      const until = performance.now() + SLICE;
      let r = it.next();
      while (!r.done && performance.now() < until) r = it.next();
      if (!r.done) {
        flying(r.value);
        timer = window.setTimeout(step, 0);
        return;
      }
      this.restoring = null;
      this.replaying = null;
      if (!r.value) return void this.refuse();
      this.tape = { setup: tape.setup, entries: [...tape.entries] };
      this.zero = performance.now() - ((tape.entries.at(-1)?.[3] ?? 0) + 60_000); // (its guards lapsed: a minute on from its last entry)
      this.heldKey = this.holdKey();
      this.held.clear();
      this.finger.pitch = this.finger.yaw = this.finger.roll = 0;
      this.lastT = this.reachT = tape.end.t;
      this.parkedPhase = kept.note.phase;
      this.stored = null;
      this.pageClock.seek(tape.view.t);
      this.restore();
      this.drawThrottle(); // (the clock is held: nothing else draws it)
      this.showKept(tape.view.t, title, Deck.why(kept.note.phase, kept.note.left), true);
      this.sync();
    };
    timer = window.setTimeout(step, 0);
  }

  /** Do again what an entry of a kept run did (tape.ts), as it was done. */
  private play(e: Entry): void {
    const [kind, , , , , ...p] = e;
    if (kind === 'h') {
      this.held.clear();
      for (const k of String(p[0])) this.held.add(k);
      this.finger.pitch = Number(p[1]);
      this.finger.yaw = Number(p[2]);
      this.finger.roll = Number(p[3]);
    } else if (kind === 's') this.steered();
    else if (kind === 'c') this.command(String(p[0]), p);
    else if (kind === 'x') this.extraKey(String(p[0]), PLAYED);
    else if (kind === 'a') this.obey(String(p[0]));
    else if (kind === 'w') this.worked(String(p[0]));
    else if (kind === 'l') this.setLever(Number(p[0]));
  }

  /** A kept run that cannot be flown again: let go, the flight stood on its pad as flown, and the card says why. */
  private refuse(): void {
    this.restoring?.stop();
    this.forget();
    this.switches({});
    this.fresh();
    this.pending = { t: 0, rate: 1, running: false };
    this.refused = true;
    this.showKept(
      0,
      'Your flight cannot be resumed',
      'The flight has changed since you flew it (its figures, or the simulator): it could not be flown again exactly, so it has been let go.',
      false,
    );
    this.sync();
  }

  /** The kept flight, resumed (the clock runs again as it did when it was left) or started over. */
  private settle(resume: boolean): void {
    const at = this.pending!;
    this.pending = null;
    this.refused = false;
    this.hideKept();
    (document.activeElement as HTMLElement | null)?.blur?.();
    if (!resume) return;
    this.clock.setRate(at.rate);
    if (at.running) this.clock.play(true);
  }

  private hideKept(): void {
    this.root.querySelector<HTMLElement>('.cockpit-kept')!.hidden = true;
  }

  /**
   * What a command asks for. With a kept flight waiting to be resumed: only that, starting over (the card is the question:
   * nothing more is asked), or leaving it again. Otherwise each is written down (tape.ts) and done, but for starting over
   * with a run flown by hand going on, which loses it and is asked first (leaving.ts, 'again').
   */
  private act(what: string): void {
    if (this.pending) {
      if (what === 'resume' && !this.refused) {
        if (!this.restoring) this.settle(true);
        return;
      }
      if (what === 'again' || what === 'resume') {
        this.restoring?.stop();
        this.settle(false);
        this.switches({}); // (on the pad, by hand: `START`)
        this.command('again');
        this.sync();
        return;
      }
      if (what !== 'leave') return;
    } else if (what === 'resume') return;
    if (what === 'again' && verdict(this.stake, 'again') === 'ask')
      return void this.question(
        () => {
          this.switches({}); // (on the pad by hand, `START`: the run thrown away, and how it was being flown with it)
          this.command('again');
          this.sync();
        },
        () => {},
        'again',
      );
    if (what === 'cut') {
      this.journal('l', [0], () => this.setLever(0));
      return void this.sync();
    }
    if (what === 'leave' || what === 'again') this.command(what);
    else {
      const input: (string | number)[] = [what];
      this.journal('c', input, () => this.command(what, input));
    }
    this.sync();
  }

  /** The run's end is noted as the clock moves, for the moment's grace that leaving.ts gives it; an ended run is no longer kept. */
  private watch(): void {
    if (this.on && this.runOver) {
      if (this.endedAt === null) {
        this.endedAt = performance.now();
        this.forget(); // (nothing to resume: its result is read here, as before)
      }
    } else this.endedAt = null;
    this.sync();
  }

  /**
   * The browser's own question as the page is closed or loaded again: set only while a run flown by hand would be lost by
   * it, which is when the browser will not keep it (storage off or full) or it has just come down, and not otherwise.
   */
  private sync(): void {
    const want = this.stakes && (this.unsaved || !runs.usable() || (this.on && this.runOver));
    if (want === this.warned) return;
    this.warned = want;
    if (want) window.addEventListener('beforeunload', this.unload);
    else window.removeEventListener('beforeunload', this.unload);
  }

  /** Whether the browser is set to ask before the page goes (the test reads it). */
  get warning(): boolean {
    return this.warned;
  }

  /**
   * Put a question that stands before an act that loses the flight (ask.ts), over the deck: a way out that cannot keep it
   * ('leave': this browser will not, or it has just come down), starting over with it going on ('again'), or throwing the
   * kept one away ('drop').
   */
  question(go: () => void, stay: () => void, what: 'leave' | 'again' | 'drop' = 'leave'): void {
    this.held.clear();
    this.finger.pitch = this.finger.yaw = this.finger.roll = 0;
    const at = this.parked?.t ?? this.stored?.note.t ?? this.clock.t;
    const words = {
      leave: {
        title: 'Leave this flight?',
        line:
          this.on && this.runOver
            ? 'It has just come down: its result goes with it.'
            : 'This browser will not keep it (its storage is off or full): leaving loses it.',
        go: 'Leave',
        key: 'ask.leave' as const,
      },
      again: {
        title: 'Start over?',
        line: `Your flight, at ${missionTime(at)}, is thrown away and a new one stands on the pad.`,
        go: 'Start over',
        key: 'ask.again' as const,
      },
      drop: {
        title: 'Throw your flight away?',
        line: `Your flight, kept at ${missionTime(at)}, is let go: Fly will start from the pad.`,
        go: 'Throw away',
        key: 'ask.again' as const,
      },
    }[what];
    ask({
      parent: document.body, // (not the deck's own page: that is put away while the gallery is up, and a flight kept is asked about there too)
      clock: this.clock,
      ...words,
      stayLabel: what === 'drop' ? 'Keep it' : 'Keep flying',
      leave: go,
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
      if (down && !e.repeat) this.steer();
      return;
    }
    const notch = which(key, 'deck.lever');
    if (down && (notch >= 0 || is(key, 'deck.full'))) {
      // (a notch at a time, pressed or held; under the engine's least it is cut, and up from there it comes back at its least)
      e.preventDefault();
      e.stopPropagation();
      const least = this.throttled()?.range?.least ?? 0;
      const at = this.lever.at;
      const to = notch < 0 ? 1 : notch === 0 ? (at < least - 1e-9 ? least : at + NOTCH) : at - NOTCH < least - 1e-9 ? 0 : at - NOTCH;
      this.journal('l', [to], () => this.setLever(to));
      return;
    }
    if (!down || e.repeat) return;
    if (this.journal('x', [key], () => this.extraKey(key, e), Boolean)) return;
    const what = COMMANDS.find(([name]) => is(key, name))?.[1];
    if (!what) return;
    e.preventDefault();
    e.stopPropagation();
    this.act(what);
    this.sync();
  }
}

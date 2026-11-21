// The debug handle every page has, `window.sr`: what tools/ (tools/shot.mjs, the browser tests) and a person at the
// console reach the page through. One place installs it, and says what is on it for each page (AGENTS.md: `window.sr`).
import type { Cockpit } from '../deck/cockpit.ts';
import type { Navball } from '../deck/navball.ts';
import type { OrbitDeck } from '../deck/orbitdeck.ts';
import type { Sound } from '../sound/index.ts';
import type { Flight, SitedFlight } from '../types.ts';
import type { Gallery } from '../ui/gallery.ts';
import type { LineupUi, LineupView } from '../ui/lineup.ts';
import type { Ui } from '../ui/ui.ts';
import type { Effects } from '../viewer/effects.ts';
import type { FlightPath } from '../viewer/path.ts';
import type { Stage } from '../viewer/stage.ts';
import type { Clock } from '../world/clock.ts';
import type { LunarSite } from '../world/lunar-terrain.ts';
import type { Demo } from './demo.ts';
import type { FrontScene } from './front/scene.ts';
import type { PATH } from './front/view.ts';
import type { entries, sections } from './lineup/row.ts';
import type { LineupScene } from './lineup/scene.ts';

/** A flight with a site (main.ts): its stage, panels, clock, deck, sound; sr.show('pad'), sr.stage.pose(az, el, dist). */
export interface FlightDebug {
  stage: Stage;
  ui: Ui;
  flight: SitedFlight;
  /** Open one of the flight's models (its id) as the section studied. */
  show: (id: string, snap?: boolean, asItStands?: boolean) => void;
  clock: Clock;
  demo: Demo;
  cockpit: Cockpit | OrbitDeck;
  navball: Navball;
  path: FlightPath;
  /** The sound; `sr.sound.voices` is what the works are playing now, slot by slot (sound/index.ts). */
  sound: Sound;
  effects: Effects;
  gallery: Gallery;
  /** The front page's picture, while it is still there under a flight just gone into from it (front.ts). */
  front?: FrontScene;
  /**
   * Stand the flight on the Moon at a landing site (its id: missions/usa/places/moon/), at `at` seconds of the mission's
   * clock (left out, where the clock is), as the run will once it lands (session.ts `surface`); resolves true once the
   * curtain has lifted. `offMoon` goes back to the pad's place; `moon` is the site stood at, or null.
   */
  onMoon: (site: LunarSite, at?: number) => Promise<boolean>;
  offMoon: () => Promise<boolean>;
  readonly moon: LunarSite | null;
}

/** A flight that is only its vehicle (only.ts): the gallery, and its stage as `stage` (null until it is made). */
export interface OnlyDebug {
  gallery: Gallery;
  flight: Flight;
  readonly stage: Stage | null;
  front?: FrontScene;
}

/** The front page (front.ts): sr.front.seek(120) goes two minutes along the path; sr.front.stats(); sr.front.cost(). */
export interface FrontDebug {
  front: FrontScene;
  /** The camera's way out from the Earth (front/view.ts). */
  path: typeof PATH;
  /** The moment on show, UTC. */
  readonly instant: string;
}

/** The Lineup (lineup.ts): sr.lineup (the page), sr.stage (its scene: sr.stage.pose(azimuth, elevation, distance, y, x)). */
export interface LineupDebug {
  stage: LineupScene;
  lineup: {
    scene: LineupScene;
    ui: LineupUi;
    readonly ready: boolean;
    readonly view: LineupView;
    readonly touring: boolean;
    entries: ReturnType<typeof entries>;
    sections: ReturnType<typeof sections>;
    show: (next: LineupView, fly?: boolean) => void;
    choose: (id: string | null) => void;
    step: (by: number) => void;
    whole: () => void;
    /** Start the show now, as if left alone, or go on to its next. */
    tour: () => void;
  };
}

export interface DockingDebug {
  flight: Flight;
  stage: Stage;
  readonly docking: import('../sim/docking.ts').DockPair;
}
export type Debug = FlightDebug | OnlyDebug | FrontDebug | LineupDebug | DockingDebug;

declare global {
  interface Window {
    sr?: Debug;
  }
}

/** Install the page's handle (one per page: the page that installs it last is the one on show). */
export function installDebug(handle: Debug): void {
  window.sr = handle;
}

/**
 * The front page's picture is kept on the handle of the flight gone into from it, for as long as it lasts (front.ts):
 * put there, or (null) taken off.
 */
export function keepFront(scene: FrontScene | null): void {
  const sr = window.sr as Partial<FlightDebug & OnlyDebug> | undefined;
  if (!sr) return;
  if (scene) sr.front = scene;
  else delete sr.front;
}

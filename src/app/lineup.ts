import { MILESTONES, PEOPLE, PROGRAMMES, STORIES } from '../../missions/history.ts';
import { flights } from '../../missions/index.ts';
import { Callout } from '../ui/callout.ts';
import { LineupUi, type LineupView } from '../ui/lineup.ts';
import { reducedMotion, scripted, unattended } from '../util/env.ts';
import { RIGS } from '../viewer/camera/index.ts';
import { chooseTier } from '../viewer/tier.ts';
import { formatAddress, formatLineup, namesLineup, onMoved, parseLineup, programmeOf, settle, where } from './address.ts';
import { follow } from './curtain.ts';
import { installDebug } from './debug.ts';
import { goHome } from './home.ts';
import { day, entries, sections, showCard, timeline } from './lineup/row.ts';
import { LineupScene } from './lineup/scene.ts';
import { prefs } from './prefs.ts';
import { is, isTyping, modified, modifierOnly, which } from '../util/keys.ts';

/**
 * The Lineup: every vehicle the flights have built, side by side on one floor at one scale, in the order they flew
 * (docs/agents/gallery.md, "The Lineup"). It is what `#lineup` shows, and like the front page it is no flight's: it
 * holds the coarsest level of every vehicle and the finest of the few being looked at, and nothing else of any
 * flight; a flight gone into from here is another page's worth of state (home.ts), and Back comes out here again.
 *
 * This file is the page: what the address says, what is chosen, what stands in the row, the keys, and the show it
 * gives when left alone. app/lineup/ is the scene (scene.ts), one vehicle of it (stand.ts), the room (hall.ts) and the
 * arithmetic (row.ts); ui/lineup.ts is what is written round it and on it.
 *
 * - **It reads the flights' data and the history, and knows no flight.** A flight appended to missions/index.ts
 *   stands in the row, in its programme's section, on the timeline and in the figures. What is said of it is the
 *   history's (missions/history.ts) where the history has it, and its own summary where it does not.
 * - **One thing is chosen at a time**, by a click on it, its name, its mark on the timeline, or N and B: the camera
 *   goes to it and its card comes up. Choosing is within the place: the address is rewritten, never a step.
 * - **What stands in the row is the whole of it, one programme's section, or a few standing together to be compared.**
 *   Forming the row again is a dip of the picture, never things sliding through each other.
 * - **Going into a flight's gallery is a step**, and lets all of this go; Back opens it again at the address it had.
 * - **Left alone, it shows itself**: the camera goes down the row, one vehicle at a time, with a card saying what each
 *   was. Any touch ends it, and the view goes back to where the hands had left it.
 */
const history = { milestones: MILESTONES, stories: STORIES, people: PEOPLE, programmes: PROGRAMMES };
const row = entries(flights, history);
const parts = sections(row, history);
const canvas = document.querySelector<HTMLCanvasElement>('#stage')!;
const root = document.querySelector<HTMLElement>('#ui')!;
document.title = 'The Lineup · Space Race';

/** Seconds without a touch before it shows itself, the first time and after the show has been stopped; and on each thing in the show. */
const IDLE_FIRST = 40;
const IDLE_AGAIN = 150;
const DWELL = 9;
/** Milliseconds the picture takes to dip while the row is formed again (lineup.css has the same). */
const DIP = 220;

const known = (id: string): boolean => row.some((e) => e.flight.id === id);
const inOrder = (ids: readonly string[]): string[] => row.map((e) => e.flight.id).filter((id) => ids.includes(id));

/** What an address says is on show. */
function read(): LineupView {
  const to = parseLineup(where()) ?? { row: 'vehicles' as const, programme: null, flights: [] };
  const named = to.flights.filter(known);
  const compared = named.length > 1 ? inOrder(named) : [];
  const section = !compared.length && parts.some((s) => s.id === to.programme) ? to.programme : null;
  // (one chosen in a programme's section is one of that programme)
  const chosen = named.length === 1 && (!section || programmeOf(named[0]!) === section) ? named[0]! : null;
  return { row: to.row, section, compared, chosen, picking: false };
}
const addressOf = (v: LineupView): string =>
  formatLineup(v.row, v.compared.length > 1 ? v.compared : v.chosen ? [v.chosen] : [], v.section);

/** The flights that stand in the row for a view: those compared, a programme's, or (null) all of them. */
function only(v: LineupView): string[] | null {
  if (v.compared.length > 1) return v.compared;
  return parts.find((s) => s.id === v.section)?.flights ?? null;
}
const formed = (v: LineupView): string => JSON.stringify([v.row, only(v)]);

let view = read();
let ready = false;
let dipping = 0;

const ui = new LineupUi(
  root,
  { entries: row, sections: parts, moments: timeline(row, history), people: PEOPLE },
  {
    home: () => goHome(),
    choose: (id) => choose(id),
    section: (id) => {
      const chosen = view.chosen && id && programmeOf(view.chosen) === id ? view.chosen : null;
      show({ ...view, section: id, compared: [], chosen, picking: false });
    },
    row: (to) => show({ ...view, row: to }),
    step: (by) => step(by),
    pick: (on) => pick(on),
    drop: (id) => {
      const left = view.compared.filter((x) => x !== id);
      show({ ...view, compared: left.length > 1 ? left : [], chosen: left.length > 1 ? null : (left[0] ?? null), picking: false });
    },
    whole: () => whole(),
    gallery: (id) => openGallery(id),
    scale: (on) => setScale(on),
    names: () => measure(), // (with the names away the row has the room they took)
    light: (on) => setLight(on),
    cel: (on) => setCel(on),
    lighter: (on) => {
      // (what a tier may hold is decided as the page opens: the choice is kept, and the page opened again in it)
      chooseTier(on);
      location.reload();
    },
    measured: () => measure(),
    retry: () => void arrive(),
  },
);
const callout = new Callout(document.body);

const scene = new LineupScene(canvas, row, {
  hover: (id) => ui.mark(touring ? null : id),
  pick: (id) => {
    // a click on a vehicle chooses it; a click on nothing lets the one chosen go, and with nothing chosen does nothing
    if (id) choose(id);
    else if (view.picking) pick(false);
    else if (view.chosen) choose(null);
  },
  taken: () => touched(),
  home: () => back(true),
  rig: (id) => ui.say(RIGS[id].name, RIGS[id].says),
  drawn: () => place(),
});

/** Put what is written on the picture where the picture has it. */
function place(): void {
  if (ready) ui.place(scene);
}

/** What the panels leave clear of the picture: the camera frames in it, and nothing is written under them. */
function measure(): void {
  if (!ready) return; // (asked while the page is being made: it is measured when the row has arrived)
  const { beside, under } = ui.clear(canvas);
  scene.setClear(beside, under);
  place();
}

/** What the camera is sent to for a view: the one chosen, or (null) all that stands. */
const subject = (v: LineupView): string[] | null => (v.chosen && v.compared.length < 2 ? [v.chosen] : null);

/** Form the row for the view in force and frame it: at once, behind the dip. */
function form(): void {
  scene.setRow(view.row, only(view));
  scene.choose(view.chosen);
  ui.measuredHeights(scene.heights());
  scene.frame(subject(view), true);
}

/**
 * Show the page as `next` has it. What is chosen within the row as it stands is flown to; a row formed again (another
 * row, a programme's section, a comparison) dips the picture and comes back formed. The address is rewritten to say
 * it: nothing here is a step in the history.
 */
function show(next: LineupView, fly = true): void {
  const again = formed(next) !== formed(view);
  const moved = again || next.chosen !== view.chosen;
  view = next;
  ui.render(view);
  settle(addressOf(view));
  if (!ready) return; // (the row is formed for whatever the view is when it has arrived)
  if (again && !(scripted() || reducedMotion())) {
    canvas.classList.add('dip');
    clearTimeout(dipping);
    dipping = window.setTimeout(() => {
      form();
      canvas.classList.remove('dip');
    }, DIP);
  } else if (again) form();
  else {
    scene.choose(view.chosen);
    if (moved && fly) scene.frame(subject(view));
  }
}

function choose(id: string | null): void {
  if (id && view.picking) {
    // the one to stand beside what is chosen, or with those already standing together
    const with_ = view.compared.length > 1 ? view.compared : view.chosen ? [view.chosen] : [];
    const all = inOrder([...with_, id]);
    if (all.length > 1) return void show({ ...view, section: null, compared: all, chosen: null, picking: false });
    return void show({ ...view, picking: false });
  }
  // one chosen out of a comparison, or from outside the section on show, is chosen in the whole row
  const section = id && view.section && programmeOf(id) !== view.section ? null : view.section;
  show({ ...view, section, compared: [], chosen: id, picking: false });
}

function pick(on: boolean): void {
  if (on && !view.chosen && view.compared.length < 2) return void ui.say('Compare', 'Choose a vehicle first');
  show({ ...view, picking: on });
  if (on) ui.say('Compare', 'Choose the one to stand beside it');
}

/** The next in the row as it stands, or the one before; from nothing chosen, the first or the last. */
function step(by: number): void {
  const standing = only(view) ?? row.map((e) => e.flight.id);
  if (!standing.length) return;
  const at = view.chosen ? standing.indexOf(view.chosen) : -1;
  const next = at < 0 ? (by > 0 ? 0 : standing.length - 1) : (at + by + standing.length) % standing.length;
  show({ ...view, compared: [], chosen: standing[next]!, picking: false });
}

/** The whole row, with nothing chosen. */
function whole(): void {
  const was = view;
  show({ ...view, section: null, compared: [], chosen: null, picking: false });
  if (ready && formed(was) === formed(view) && !was.chosen) scene.frame(null);
}

/** Back a step (Esc, 0): out of choosing another, out of a comparison, off the one chosen, out of a section; then the whole row framed again. */
function back(frame = false): void {
  if (view.picking) return void pick(false);
  if (view.compared.length > 1) return void show({ ...view, compared: [], chosen: null });
  if (view.chosen) return void show({ ...view, chosen: null });
  if (view.section) return void show({ ...view, section: null });
  if (frame && ready) scene.frame(null);
}

/** Into a flight's gallery: a step, and another page's worth of state (home.ts). Back opens the Lineup again as the address has it. */
function openGallery(id: string): void {
  if (!known(id)) return;
  scene.sleep(true);
  goHome(formatAddress(id, 'gallery'));
}

function setScale(on: boolean): void {
  prefs.set('lineupScaleOff', !on);
  scene.setScale(on);
  ui.switches({ scale: on });
}
function setLight(on: boolean): void {
  prefs.set('galleryLight', on);
  scene.setTone(on ? 'light' : 'dark');
  ui.switches({ light: on });
}
function setCel(on: boolean): void {
  prefs.set('cel', on);
  scene.setLook(on ? 'cel' : 'real');
  ui.switches({ cel: on });
}

/** Bring the row in: every vehicle at its coarsest, formed, its shaders built unseen; then the curtain lifts. */
async function arrive(): Promise<void> {
  const said = follow(ui.curtain, [`${row.length} vehicles, coarsest first`], {
    place: { label: 'Standing them in a row', share: 1 },
    shaders: { label: 'Building the shaders', share: 4 },
  });
  ui.curtain.begin('The Lineup');
  try {
    const missing = await scene.load((fraction, _loaded, total) => said.arrive(fraction, [{ fraction, total }]));
    said.step('place', 0.5);
    scene.setLook(prefs.get('cel') ? 'cel' : 'real');
    scene.setTone(prefs.get('galleryLight') ? 'light' : 'dark');
    scene.setScale(!prefs.get('lineupScaleOff'));
    ui.switches({ scale: !prefs.get('lineupScaleOff'), light: prefs.get('galleryLight'), cel: prefs.get('cel') });
    ready = true;
    measure();
    form();
    said.step('place', 1);
    await scene.warm();
    said.step('shaders', 1);
    said.end();
    ui.curtain.done();
    document.body.classList.add('scene-ready');
    // (once it has faded up: from then on the picture dips and comes back briskly when the row is formed again)
    window.setTimeout(() => canvas.classList.add('quick'), 1600);
    place();
    if (missing.length) ui.say('Left out', `${missing.join(', ')} did not arrive`);
  } catch (e) {
    console.error(e);
    said.end(false);
    ui.curtain.failed('The vehicles did not arrive. Check the connection and try again.');
  }
}

// ----------------------------------------------------------------------------------------------- the show

let idle = 0;
let wait = IDLE_FIRST;
let touring = false;
let shot = -1;
let left = 0;
let before: ReturnType<LineupScene['viewNow']> | null = null;

/** The next thing in the show: the whole row, then each one standing in it in turn. */
function next(): void {
  const standing = only(view) ?? row.map((e) => e.flight.id);
  shot = (shot + 1) % (standing.length + 1);
  left = DWELL;
  if (shot === 0) {
    scene.choose(null);
    scene.frame(null);
    const years = row.map((e) => new Date(e.flight.launch).getUTCFullYear());
    callout.show(
      {
        eyebrow: 'The Lineup',
        title: `${standing.length} vehicles, one scale`,
        text: `In the order they flew, ${Math.min(...years)} to ${Math.max(...years)}.`,
      },
      null,
    );
    return;
  }
  const e = row.find((x) => x.flight.id === standing[shot - 1])!;
  scene.choose(e.flight.id);
  scene.frame([e.flight.id]);
  // (what the history says of it where it has a story, its headline over the story's first part, and the time to read it)
  const card = showCard(e, DWELL);
  left = card.dwell;
  callout.show(
    { eyebrow: `${parts[e.programme]!.name} · ${day(e.flight.launch)}`, title: e.flight.callsign, lead: card.lead, text: card.text },
    () => scene.topOf(e.flight.id),
  );
}

function startShow(): void {
  touring = true;
  shot = -1;
  before = scene.viewNow();
  ui.mark(null);
  document.body.classList.add('demo');
  // the panels are away while it shows, and the card that says what each is stands low on the left (callout.css; across
  // the foot of a narrow page): the picture is framed in what the card leaves
  const { width, height } = canvas.getBoundingClientRect();
  const clear =
    width > 700
      ? { left: Math.min(0.42 * width, 440), top: 16, right: width - 16, bottom: height - 16 }
      : { left: 8, top: 8, right: width - 8, bottom: height - 250 };
  scene.setClear(clear, clear);
  next();
}

function endShow(): void {
  if (!touring) return;
  touring = false;
  wait = IDLE_AGAIN;
  document.body.classList.remove('demo');
  callout.hide();
  scene.choose(view.chosen);
  measure();
  if (before) scene.goBack(before);
  before = null;
}

/** Somebody touched the page: the show ends, and the next one is put off. */
function touched(): void {
  idle = 0;
  endShow();
}

for (const touch of ['pointerdown', 'wheel', 'keydown', 'touchstart', 'pointermove'] as const)
  window.addEventListener(
    touch,
    (e) => {
      if (e.type === 'pointermove' && touring) return; // (the mouse merely moving does not end a show that is on)
      if (e instanceof KeyboardEvent && modifierOnly(e)) return;
      touched();
    },
    { capture: true, passive: true },
  );
window.setInterval(() => {
  // not for a browser driven by a script (unless it asks: ?demo), nor for anyone who has asked their system for less motion
  if (!ready || document.hidden || (unattended() && !touring)) return;
  if (!touring) {
    idle += 0.25;
    if (idle >= wait && !view.picking) startShow();
    return;
  }
  left -= 0.25;
  if (left <= 0) next();
}, 250);

// ----------------------------------------------------------------------------------------------- the keys

window.addEventListener('keydown', (e) => {
  if (modified(e) || e.repeat || isTyping(e) || !ready) return;
  const next = which(e, 'lineup.next');
  if (next >= 0) step(next ? -1 : 1);
  else if (is(e, 'lineup.open') && view.chosen) openGallery(view.chosen);
  else if (is(e, 'lineup.pick')) pick(!view.picking);
  else if (is(e, 'lineup.row')) show({ ...view, row: view.row === 'spacecraft' ? 'vehicles' : 'spacecraft' });
  else if (is(e, 'lineup.scale')) setScale(!scene.scaled);
  else if (is(e, 'lineup.light')) setLight(scene.hall.tone !== 'light');
  else if (is(e, 'page.cel')) setCel(scene.look !== 'cel');
  else if (is(e, 'cam.next')) scene.cam.set(scene.cam.next());
  else if (is(e, 'page.bare')) ui.toggleBare();
  else if (is(e, 'page.legend')) ui.toggleKeys();
  else if (is(e, 'lineup.back')) back();
});

// Back and Forward: within the Lineup the address is followed in place; one that is somewhere else's (the front page,
// a flight) is another page's worth of state, and the page is opened again at it (home.ts)
onMoved(() => {
  if (!namesLineup(where())) return goHome(where());
  show(read());
});

// the diagnostics line, as a flight's page has: the loop's rate, frames drawn, triangles, draw calls, each vehicle's level
window.setInterval(() => {
  const s = scene.stats();
  ui.setStats(
    `${s.fps.toFixed(0)} fps · ${s.drawn.toFixed(0)} drawn · ${(s.triangles / 1000).toFixed(0)}k tris · ${s.calls} calls · detail ${s.levels.map((l) => (l < 0 ? '·' : l)).join('')} · ${s.heldMiB.toFixed(0)} MiB fine`,
  );
}, 1000);

ui.render(view);
settle(addressOf(view));
void arrive();

// debug handle, as every page has: sr.lineup (the page), sr.stage (its scene: sr.stage.pose(azimuth, elevation, distance, y, x))
installDebug({
  stage: scene,
  lineup: {
    scene,
    ui,
    get ready() {
      return ready;
    },
    get view() {
      return view;
    },
    get touring() {
      return touring;
    },
    entries: row,
    sections: parts,
    show,
    choose,
    step,
    whole,
  },
});

import { flights } from '../missions';
import { type Choice, choices, lookUp, nameOf, spaced, type Target } from './actions';
import { prefs } from './prefs';
import { Title } from './title';
import { Ui } from './ui';
import { Stage } from './viewer/stage';

/**
 * The address bar's fragment says what is on show: `#<nation>/<programme>/<flight>/<model>`.
 * A bare `#<model>` is the first flight's, so links made when there was one flight still work.
 */
function address(): { flightId: string; model: string } {
  const parts = location.hash.slice(1).split('/').filter(Boolean);
  const model = parts.length === 1 || parts.length === 4 ? parts.pop()! : '';
  return { flightId: parts.join('/'), model };
}

const flight = flights.find((f) => f.id === address().flightId) ?? flights[0]!;
document.title = `${flight.callsign} · ${flight.designation} · Space Race`;

const stage = new Stage(document.querySelector<HTMLCanvasElement>('#stage')!);
let selected: string | null = null;
let current = flight.models[0]!;
/** Everything is on the stage: until then a choice of section has nothing to fly to. */
let ready = false;
/** The user switched auto-orbit off themselves. Otherwise it is only ever paused, and the next move restarts it. */
let orbitOff = prefs.get('orbitOff');
stage.setLook(prefs.get('cel') ? 'cel' : 'real');
stage.walk.third = prefs.get('walkThird');

/**
 * How much the view on foot moves with the body: all of it, some, or none (a steady camera).
 * Remembered; until it has been chosen, none for anyone who has asked their system for less motion.
 */
const MOTION = { full: 1, reduced: 0.4, off: 0 } as const;
type Motion = keyof typeof MOTION;
function motion(): Motion {
  if (prefs.get('motionOff')) return 'off';
  if (prefs.get('motionReduced')) return 'reduced';
  if (prefs.get('motionFull')) return 'full';
  return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'off' : 'full';
}
function setMotion(level: Motion): void {
  prefs.set('motionFull', level === 'full');
  prefs.set('motionReduced', level === 'reduced');
  prefs.set('motionOff', level === 'off');
  stage.walk.motion = MOTION[level];
  ui.setWalkMotion(level);
}

const ui = new Ui(document.querySelector<HTMLElement>('#ui')!, flight, {
  model: (id) => (ready ? show(id) : void start(id)), // before it has loaded, this is "try again"
  explode: (t) => stage.setExplode(t),
  view: (id) => {
    stage.view(id);
    orbit();
  },
  autoRotate: (on) => {
    orbitOff = !on;
    prefs.set('orbitOff', orbitOff);
    stage.setAutoRotate(on);
  },
  cutaway: (on) => {
    autoCut = false; // asked for by hand: it stays until asked otherwise
    stage.setCutaway(on);
  },
  cel: (on) => stage.setLook(on ? 'cel' : 'real'),
  camera: (mode) => stage.setCamera(mode), // back in orbit the view holds still until something is chosen

  walk: (on) => (on ? void stage.enterWalk(current.id) : stage.exitWalk()),
  walkStick: (x, y) => stage.walk.stick(x, y),
  walkJump: () => stage.walk.jump(),
  walkAct: () => act(),
  walkView: () => stage.walk.setThird(!stage.walk.third),
  walkMotion: () => setMotion(({ full: 'reduced', reduced: 'off', off: 'full' } as const)[motion()]),
  hoverPart: (node) => stage.highlight(node, selected),
  selectPart: select,
  inset: (px) => stage.setInset(px),
});

/** True while the cutaway is open only because an inside part was chosen, not because it was asked for. */
let autoCut = false;

/** Drift round whatever was just chosen, unless the user has said not to. */
function orbit(): void {
  stage.setAutoRotate(!orbitOff);
  ui.showRotate(!orbitOff);
}

function select(node: string | null): void {
  if (!node && !selected) return; // a click on nothing, with nothing chosen, is not a request to move the camera
  selected = node;
  stage.highlight(null, node);
  ui.select(node);
  const inside = Boolean(node && current.parts.find((p) => p.node === node)?.inside);
  // something inside something else is only worth flying to if it can be seen; and once the
  // selection moves on, an opening nobody asked for closes again
  if (inside && !ui.cutaway) {
    ui.setCutaway(true);
    autoCut = true;
  } else if (!inside && autoCut) {
    ui.setCutaway(false);
    autoCut = false;
  }
  if (node) stage.focus(node);
  else stage.view(current.home ?? 'all'); // back to where this section starts
  orbit();
}

/**
 * Go to one of the flight's sections: the camera flies there and the panels change to match.
 * Nothing is loaded and nothing leaves the scene. The address bar follows, so a view can be linked.
 */
function show(id: string, snap = false): void {
  if (stage.walk.active) stage.exitWalk(); // going anywhere else ends a walk
  const model = flight.models.find((m) => m.id === id) ?? flight.models[0]!;
  selected = null;
  autoCut = false;
  current = model;
  ui.setModel(model.id, stage.exploded(model.id));
  stage.section(model.id, snap);
  orbit();
  const hash = `#${flight.id}/${model.id}`;
  if (!title.showing && location.hash !== hash) history.replaceState(null, '', hash); // the front page has no address of its own
}

/** Fetch the flight's models and open on a section. */
async function start(id: string): Promise<void> {
  ui.loading(flight.callsign);
  try {
    await stage.load(flight, (f) => ui.setProgress(f));
    ready = true;
    show(id, true);
    ui.loaded();
    if (prefs.get('fly')) ui.setCamera('fly');
  } catch (e) {
    console.error(e);
    ui.failed(e instanceof Error ? e.message : String(e));
  }
}

stage.onHover = (node) => ui.hover(node);
stage.onSelect = select;
stage.onModel = (id) => show(id); // a click on the pad, the rocket or the pilot goes to it
stage.onHoverModel = (id) => ui.hoverModel(id);
stage.onHoverPlace = (name) => ui.hint(name ? [spaced(name), 'Click to go and look'] : null);
stage.onVisit = orbit; // the view drifts round whatever was last chosen
stage.onHoverWindow = (over) => ui.hint(over ? ['Window', 'Click to look inside'] : null);
// taking the camera pauses the drift; it starts again with the next thing chosen
stage.onInteract = () => {
  stage.setAutoRotate(false);
  ui.showRotate(false);
};
stage.onView = (id) => ui.setView(id);
// Walking as a figure is done from that figure's section, wherever it was asked for; stopping returns to that section's view.
stage.onWalk = (on, model) => {
  if (on && current.id !== model) show(model);
  if (on && selected) select(null);
  ui.setWalking(on);
  if (on) ui.setWalkView(stage.walk.third);
  if (on) {
    stage.walk.motion = MOTION[motion()];
    ui.setWalkMotion(motion());
  }
  if (!on) show(model);
};
stage.onWalkLook = (captured) => ui.setWalkLook(captured);
stage.onWalkView = (third) => {
  prefs.set('walkThird', third);
  ui.setWalkView(third);
};

/** While walking: what is being looked at from within reach, if there is anything to be done with it. */
let target: Target | null = null;
/** Where the walker stood when the info card was opened: walking away from it puts it down. */
let cardAt: { x: number; z: number } | null = null;
stage.onWalkTarget = (found) => {
  target = found && choices(found, flight, stage.walkingAs ?? '', stage.workings).length ? found : null;
  ui.setWalkTarget(target ? nameOf(target, flight) : null);
  ui.wheel.close(); // what it was about is no longer in front of you
};
stage.onWalkAct = act;

/** The act key: offer what can be done with what is being looked at, on the wheel. With nothing there, it puts the card away. */
function act(): void {
  if (ui.wheel.isOpen) {
    ui.wheel.close();
    return;
  }
  const on = target;
  if (!on) {
    ui.showWalkCard(null);
    return;
  }
  const list = choices(on, flight, stage.walkingAs ?? '', stage.workings);
  // while it is open the walker stands still and the captured mouse points at choices; Escape shuts it
  stage.walk.hold(
    (dx, dy) => ui.wheel.nudge(dx, dy),
    () => ui.wheel.close(),
  );
  ui.wheel.open(
    nameOf(on, flight),
    list,
    (id) => perform(on, list.find((c) => c.id === id)!),
    () => stage.walk.release(),
    'e',
  );
}

/** Carry out a verb chosen on the wheel. */
function perform(on: Target, { verb }: Choice): void {
  const { part } = lookUp(on, flight);
  if (verb.do === 'info' && part) {
    ui.showWalkCard(part);
    cardAt = { x: stage.walk.body.position.x, z: stage.walk.body.position.z };
  } else if (verb.do === 'look') stage.walkLookIn();
  else if (verb.do === 'climb') stage.walkClimb();
  else if (verb.do === 'become') {
    ui.showWalkCard(null);
    stage.becomeWalk(verb.model);
  } else if (verb.do === 'action') {
    if (verb.action.do.kind === 'slider') stage.operate(verb.model, verb.action.do.to);
    else stage.workAction(verb.model, verb.node, verb.action, verb.stop);
  } else if (verb.do === 'inspect') {
    // out of the walk, and round the thing itself: a place in the surroundings, or a part in its own section
    if (on.place) stage.walkVisit();
    else if (on.model && on.node) {
      stage.exitWalk();
      show(on.model);
      select(on.node);
    }
  }
}
// with the mouse captured a click lands on no button: it chooses what the wheel is pointing at
document.addEventListener('mousedown', () => {
  if (ui.wheel.isOpen && document.pointerLockElement) ui.wheel.confirm();
});
stage.onHome = () => (selected ? select(null) : show(current.id));
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && selected) select(null);
  // V goes out on foot as the crew, from anywhere, and comes back: the same key will board and leave a crew member when there is a flight to fly
  const typing = (e.target as HTMLElement).matches?.('input:not([type=range]), textarea');
  if (e.key.toLowerCase() === 'v' && ready && !title.showing && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
    // with several figures to walk as, V goes on to the next of them, and back to the camera after the last
    const walkers = flight.models.filter((m) => m.walker).map((m) => m.id);
    const next = walkers[walkers.indexOf(stage.walkingAs ?? '') + 1];
    if (!stage.walk.active) stage.enterWalk();
    else if (next) {
      ui.showWalkCard(null);
      stage.becomeWalk(next);
    } else stage.exitWalk();
  }
});

/**
 * The front page is what an address that names nothing shows. Going in names the place, so from
 * then on a refresh or a link comes straight back to it.
 */
const title = new Title(document.body, flights, (id) => {
  if (id !== flight.id) {
    location.hash = `#${id}`;
    return location.reload(); // another flight is another page's worth of state
  }
  title.hide();
  history.replaceState(null, '', `#${flight.id}/${current.id}`);
  orbit();
});
if (location.hash.length <= 1) title.show();
document.addEventListener('click', (e) => {
  if (!(e.target as HTMLElement).closest?.('[data-home]')) return;
  history.replaceState(null, '', location.pathname + location.search);
  title.show();
});

void start(address().model);
window.addEventListener('hashchange', () => {
  if (location.hash.length <= 1) return title.show();
  if (title.showing) title.hide();
  const to = address();
  // another flight is another page's worth of state: start clean rather than rebuild in place
  if (to.flightId && to.flightId !== flight.id && flights.some((f) => f.id === to.flightId)) location.reload();
  else if (ready && to.model !== current.id) show(to.model);
});

// diagnostics, twice a second
setInterval(() => {
  // a card read and walked away from is put down
  if (cardAt && ui.walkCardOpen && Math.hypot(stage.walk.body.position.x - cardAt.x, stage.walk.body.position.z - cardAt.z) > 3)
    ui.showWalkCard(null);
  const s = stage.stats();
  const tris = s.triangles >= 1e6 ? `${(s.triangles / 1e6).toFixed(2)} M` : `${Math.round(s.triangles / 1e3)} k`;
  ui.setStats(
    `${s.fps.toFixed(0)} fps · ${s.drawn.toFixed(0)} drawn · ${s.ms.toFixed(1)} ms · ${tris} tris · ${s.calls} calls · detail ${s.levels.join('/')}${stage.walkRigid ? ' · figure rigid (no joints)' : ''}`,
  );
}, 500);

// debug handle, as in lunar-lift: sr.show('pad'), sr.stage.pose(az, el, dist)
Object.assign(window, { sr: { stage, ui, flight, show } });

import { flights } from '../missions';
import { type Choice, choices, lookUp, nameOf, quiet, spaced, type Target } from './actions';
import { Callout } from './callout';
import { Demo, IDLE_TITLE } from './demo';
import { prefs } from './prefs';
import { Box3, Vector3 } from 'three';
import { Flown } from './flown';
import { TimeBar } from './timebar';
import { Title } from './title';
import { Ui } from './ui';
import { Stage } from './viewer/stage';
import { Clock, localTime, missionTime } from './world/clock.ts';

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
/** The instant on show: stopped at liftoff until it is run or moved (the time bar, or `sr.clock`). */
const clock = new Clock(flight.launch);
stage.clock = clock;
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
  fnValues: (node) => stage.functions(current.id, node).map((f) => ({ id: f.fn.id, value: f.value, refused: f.refused })),
  setFn: (node, id, v) => stage.setFunction(current.id, node, id, v),
  inset: (px) => stage.setInset(px),
});
new TimeBar(document.querySelector<HTMLElement>('#ui')!, clock, flight);
// the flight as the simulator flies it, beside the reports' figures: in the Flight tab
new Flown(document.querySelector<HTMLElement>('#ui .flown')!, clock, flight);
// a section whose slider is a sequence of events reads the clock: as the clock moves, so does its slider
clock.listen(() => {
  if (current.sequence) ui.setSlider(stage.exploded(current.id));
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
function show(id: string, snap = false, asItStands = false): void {
  if (stage.walk.active) stage.exitWalk(); // going anywhere else ends a walk
  const model = flight.models.find((m) => m.id === id) ?? flight.models[0]!;
  selected = null;
  autoCut = false;
  current = model;
  ui.setModel(model.id, stage.exploded(model.id));
  stage.section(model.id, snap, asItStands);
  orbit();
  const hash = `#${flight.id}/${model.id}`;
  if (!title.showing && !demo.active && location.hash !== hash) history.replaceState(null, '', hash); // the front page has no address of its own
}

/** Fetch the flight's models and open on a section. */
async function start(id: string): Promise<void> {
  ui.loading(flight.callsign);
  try {
    await stage.load(flight, (f) => ui.setProgress(f));
    show(id, true);
    // The scene is kept dark until it can move smoothly (stage.warm): shown sooner, it would
    // stutter as the rest arrived and then jump. The front page waits over it meanwhile.
    await stage.warm();
    ready = true;
    // whatever is going to be playing when the curtain lifts is already playing
    if (prefs.get('demo') || (title.showing && !unattended)) demo.start();
    await new Promise((done) => setTimeout(done, 500));
    // (a script taking pictures does not wait for a fade)
    if (navigator.webdriver && !location.search.includes('demo')) document.body.classList.add('instant');
    document.body.classList.add('scene-ready');
    ui.loaded();
    if (prefs.get('fly')) ui.setCamera('fly');
    if (prefs.get('demo')) {
      // it was showing itself when the page was left: it goes on doing so
      if (title.showing) title.hide();
      demo.start();
      prefs.set('demo', true);
    }
  } catch (e) {
    console.error(e);
    ui.failed(e instanceof Error ? e.message : String(e));
  }
}

stage.onHover = (node) => ui.hover(node);
stage.onSelect = select;
stage.onModel = (id) => show(id); // a click on the pad, the rocket or the pilot goes to it
stage.onHoverModel = (id) => ui.hoverModel(id);
stage.onHoverPlace = (name, title) => ui.hint(name ? [title ?? spaced(name), 'Click to go and look'] : null);
// A right click offers what can be done at that spot: stand a crew member there and walk, or turn the view about it.
stage.onSpot = (page, point, floor) => {
  const walker = flight.models.find((m) => m.walker);
  ui.menu(page.x, page.y, [
    ...(walker && floor
      ? [{ label: `Walk from here as ${walker.name.toLowerCase()}`, run: () => void stage.enterWalk(walker.id, point) }]
      : []),
    {
      label: 'Look at this',
      run: () => {
        stage.visit(new Box3().setFromCenterAndSize(point, new Vector3(8, 4, 8)));
      },
    },
  ]);
};
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
  if (on && current.id !== model) show(model, false, true); // the hardware stays where it is while someone is walking on it
  if (on && selected) select(null);
  if (!on) stopWorking();
  ui.setWalking(on);
  if (on) ui.setWalkView(stage.walk.third);
  if (on) {
    stage.walk.motion = MOTION[motion()];
    ui.setWalkMotion(motion());
  }
  if (!on) show(model, false, true);
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
let naming = 0;
stage.onWalkTarget = (found) => {
  const offered = found ? choices(found, flight, stage.walkingAs ?? '', stage.workings) : [];
  target = found && offered.length ? found : null;
  ui.wheel.close(); // what it was about is no longer in front of you
  // the ground under your own feet is named only once it has been looked at for a second (E works on it at once all the same)
  clearTimeout(naming);
  const name = target ? nameOf(target, flight) : null;
  if (target && quiet(target, offered)) {
    ui.setWalkTarget(null);
    naming = window.setTimeout(() => ui.setWalkTarget(name), 1000);
  } else ui.setWalkTarget(name);
};
stage.onWalkAct = act;

/** The act key: offer what can be done with what is being looked at, on the wheel. With nothing there, it puts the card away. */
function act(): void {
  if (ui.wheel.isOpen) {
    ui.wheel.close();
    return;
  }
  // at the wheel of something, the act key gets out of it
  if (stage.driving) {
    stage.walkAlight();
    ui.setWalkNote(null);
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
  else if (verb.do === 'drive') {
    ui.showWalkCard(null);
    // (one that will not move yet says why: a tower still up, its legs still down)
    if (stage.walkDrive()) {
      const why = stage.wheelRefusal;
      ui.setWalkNote(why ? `It will not drive: ${why} · E get out` : 'W throttle · S brake, then reverse · A D steer · C view · E get out');
    }
  } else if (verb.do === 'become') {
    ui.showWalkCard(null);
    stage.becomeWalk(verb.model);
  } else if (verb.do === 'operate') startWorking(verb);
  else if (verb.do === 'action') {
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
/**
 * A function of a part being worked by hand, on foot (Part.functions): while it is, the walker
 * stands at the controls, W (or the up arrow) runs it toward the end of its travel and S back
 * for as long as it is held, and E or Escape lets go of the controls.
 */
let working: Extract<Choice['verb'], { do: 'operate' }> | null = null;
function startWorking(verb: NonNullable<typeof working>): void {
  working = verb;
  // (onClose of the wheel releases the walker after this returns: take the controls on the next turn)
  setTimeout(() => {
    if (working !== verb) return;
    stage.walk.hold(() => {}, stopWorking);
    noteWorking(null);
  });
}
function noteWorking(refused: string | null): void {
  if (!working) return;
  const [back, on] = working.ends ?? ['back', 'on'];
  ui.setWalkNote(refused ? `${working.name}: ${refused}` : `${working.name} · hold W: ${on} · S: ${back} · E done`);
}
function stopWorking(): void {
  if (!working) return;
  stage.pushFunction(working.model, working.node, working.fn, 0);
  working = null;
  stage.walk.release();
  ui.setWalkNote(null);
}
const pushKey = (key: string): number => (key === 'w' || key === 'arrowup' ? 1 : key === 's' || key === 'arrowdown' ? -1 : 0);
window.addEventListener('keydown', (e) => {
  if (!working || e.metaKey || e.ctrlKey || e.altKey) return;
  const key = e.key.toLowerCase();
  if (key === 'e') stopWorking();
  else if (pushKey(key) && !e.repeat) noteWorking(stage.pushFunction(working.model, working.node, working.fn, pushKey(key)));
});
window.addEventListener('keyup', (e) => {
  if (working && pushKey(e.key.toLowerCase())) stage.pushFunction(working.model, working.node, working.fn, 0);
});

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
  demo.stop(); // going in is taking over
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

/**
 * The idle show (demo.ts): left alone, the day runs and the camera goes round the flight. It
 * plays behind the front page from the start, and anywhere else once the page has been left
 * alone a while; any touch ends it. Not for a browser being driven by a script, nor for anyone
 * who has asked their system for less motion.
 */
const callout = new Callout(document.body);
const zone = flight.site.zone;
/** The window the show is looking in at, for its callout to point to. */
let pane: Vector3 | null = null;
const demo = new Demo(flight, clock, {
  show: (id) => {
    if (id !== current.id) show(id);
  },
  whole: (turn, rise) => {
    stage.setCutaway(false);
    stage.view(current.home ?? 'all');
    stage.swing(turn, rise);
    orbit();
  },
  part: (node, inside, turn, rise) => {
    stage.setCutaway(inside); // what is inside is only worth going to if it can be seen
    stage.focus(node, false, { turn, rise });
    orbit();
  },
  apart: (t) => {
    if (!current.sequence) stage.setExplode(t);
  },
  window: (n) => {
    const panes = stage.panes();
    if (!panes.length) return false;
    const to = panes[n % panes.length]!;
    stage.setCutaway(false);
    pane = to.point;
    stage.lookIn(to.point, to.normal);
    return true;
  },
  say: (text, at) => callout.show(text, at === null ? null : () => (at === 'window' ? pane && stage.screenOf(pane) : stage.screenOf(at))),
  dark: () => stage.dark,
  busy: () => !ready || stage.walk.active || stage.frozen || document.hidden,
  running: (on) => {
    document.body.classList.toggle('demo', on);
    stage.inert = on; // shown, not used: nothing lights up under the pointer
    stage.setDrift(on ? 2.4 : 1);
    stage.setUnhurried(on);
    // the show is a state of the page like any other: a reload comes back to it
    if (!on) prefs.set('demo', false);
    else if (!title.showing) prefs.set('demo', true);
    if (on) {
      select(null);
      stage.highlight(null, null);
      return;
    }
    // hand it back as it is studied: together, closed, at this section's own view
    callout.hide();
    if (!current.sequence) stage.setExplode(0);
    ui.setCutaway(false);
    show(current.id);
    if (!title.showing) history.replaceState(null, '', `#${flight.id}/${current.id}`); // where the show left off is now the place
  },
});
clock.listen(() => {
  if (demo.active)
    callout.time(
      `${localTime(clock.jdUT, zone.utcOffset).text.slice(0, 5)} ${zone.name} · ${missionTime(clock.t).slice(0, -3)} · ${matchMedia('(pointer: coarse)').matches ? 'tap' : 'click anywhere'} to begin`,
    );
});
// (a script driving the browser asks for the show with ?demo in the address)
const unattended = (navigator.webdriver && !location.search.includes('demo')) || matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Seconds the front page has been left alone. */
let titleIdle = 0;
for (const touch of ['pointerdown', 'wheel', 'keydown', 'touchstart'] as const)
  window.addEventListener(
    touch,
    (e) => {
      if (title.showing) {
        titleIdle = 0; // the front page is being read: the show stays behind it (going in ends it, below)
        return;
      }
      if (e instanceof KeyboardEvent && ['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
      demo.stop(Boolean((e.target as HTMLElement | null)?.closest?.('.timebar')));
    },
    { capture: true, passive: true },
  );
let demoAt = performance.now();
// Every frame: the show moves things (a vehicle coming apart), and stepped a few times a second they jerk.
const showFrame = (): void => {
  requestAnimationFrame(showFrame);
  const now = performance.now();
  const dt = Math.min(1, (now - demoAt) / 1000);
  demoAt = now;
  if (unattended && !demo.active) return;
  if (title.showing && ready && !demo.active) demo.start(); // behind the front page it plays at once
  // a front page nobody goes in from gives way to what is behind it
  titleIdle = title.showing ? titleIdle + dt : 0;
  if (title.showing && demo.active && titleIdle >= IDLE_TITLE) {
    title.hide();
    prefs.set('demo', true);
  }
  demo.tick(dt);
};
requestAnimationFrame(showFrame);

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
Object.assign(window, { sr: { stage, ui, flight, show, clock, demo } });

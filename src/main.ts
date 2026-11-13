import { Box3, type Object3D, Vector3 } from 'three';
import { flights } from '../missions';
import { type Choice, choices, lookUp, nameOf, quiet, spaced, type Target } from './actions';
import { flightFor, formatAddress, opensIn, type Place, parseAddress } from './address';
import { Callout } from './callout';
import { Cockpit } from './cockpit';
import { follow } from './curtain';
import { Demo, IDLE_TITLE } from './demo';
import { Flown } from './flown';
import { crumbs, Gallery, markPlace, placesNav } from './gallery';
import './navball.css';
import { Navball } from './navball';
import { prefs } from './prefs';
import { programmeAxis } from './sim/predict';
import { Sound } from './sound';
import { TimeBar } from './timebar';
import { Title } from './title';
import type { SitedFlight } from './types';
import { Ui } from './ui';
import { Effects } from './viewer/effects';
import { uOrigin } from './viewer/origin';
import { FlightPath } from './viewer/path';
import { Stage, type Thing, type WarmStep } from './viewer/stage';
import { Clock, localTime, missionTime } from './world/clock.ts';

/** What the address bar's fragment says is on show: the flight, which of its two places, and what there (address.ts). */
const address = () => parseAddress(location.hash);

// (enter.ts brings this page up only for a flight that has a site: one with only its vehicle built is the gallery's alone)
const flight = flightFor(flights, location.hash) as SitedFlight;
document.title = `${flight.callsign} · ${flight.designation} · Space Race`;

const stage = new Stage(document.querySelector<HTMLCanvasElement>('#stage')!);
stage.quality.auto = prefs.get('resolutionAuto'); // ("Hold frame rate": off unless chosen, so the picture is the screen's own)
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
  stage.cam.calm = level === 'off'; // (the camera eases and coasts as much as the walk moves: not at all when asked for none)
  effects.motion = MOTION[level];
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
  holdPace: (on) => {
    stage.quality.auto = on;
  },
  camera: (mode) => stage.setCamera(mode), // back in orbit the view holds still until something is chosen
  nextCamera: () => stage.nextCamera,
  refind: () => stage.refind(),

  walk: (on) => (on ? void stage.enterWalk(current.id) : stage.exitWalk()),
  walkStick: (x, y) => stage.walk.stick(x, y),
  walkJump: () => stage.walk.jump(),
  walkAct: () => act(),
  walkPush: (push) => {
    if (working) noteWorking(stage.pushFunction(working.model, working.node, working.fn, push));
  },
  walkView: () => stage.walk.setThird(!stage.walk.third),
  walkMotion: () => setMotion(({ full: 'reduced', reduced: 'off', off: 'full' } as const)[motion()]),
  hoverPart: (node) => stage.highlight(node, selected),
  selectPart: select,
  fnValues: (node) => stage.functions(current.id, node).map((f) => ({ id: f.fn.id, value: f.value, refused: f.refused })),
  setFn: (node, id, v) => stage.setFunction(current.id, node, id, v),
  inset: (px, top) => stage.setInset(px, top),
});
new TimeBar(document.querySelector<HTMLElement>('#ui')!, clock, flight);
// the flight as the simulator flies it, beside the reports' figures: in the Flight tab
const flown = new Flown(document.querySelector<HTMLElement>('#ui .flown')!, clock, flight);
// what it all sounds like from where the camera is (sound/): the flight by the clock, the place, the walk
const sound = new Sound(document.querySelector<HTMLElement>('#ui .timebar')!, flight, clock, {
  ears: () => uOrigin.value, // the eye the scene was last drawn from (viewer/origin.ts)
  riding: () => stage.cameraMode === 'chase',
});
stage.walk.sounds = sound.walk;
// the flight flown by hand: the live simulator at the keys, shown in the scene in place of the record's run
// what the air does to the flight, seen and felt (viewer/effects.ts): the camera is shaken for the draw only, as far as Motion allows,
// and an eye that goes with the vehicle (the chase camera) feels what the vehicle does
const effects = new Effects(flight);
effects.motion = MOTION[motion()];
stage.effects = effects;
stage.shaker = (camera, sky) => effects.shaker(camera, sky, stage.cameraMode === 'chase' && !stage.walk.active ? 1 : 0);
// What of the flown vehicle runs to a programme and can be taken by a hand (its periscope): in a flight flown by hand
// it stands where the programme, the hands and the sequencer have it (cockpit.travel), not where the record's clock does.
const mechanisms = flight.models.find((m) => m.id === flight.flies?.model)?.mechanisms ?? [];
const cockpit = new Cockpit(document.querySelector<HTMLElement>('#ui')!, flight, clock, {
  heat: (t) => effects.reading(t),
  say: (title, line) => ui.say(title, line),
  fly: (run) => {
    stage.flyRun(run);
    flown.fly(run); // its traces over the record's, as it grows
    sound.fly(run);
  },
  piloting: (on) => {
    if (on && stage.walk.active) stage.exitWalk();
    if (!on) for (const m of mechanisms) stage.setMechanism(m.id, null); // (back on the record's clock)
    stage.piloted = on;
    stage.crewAboard(on); // (he is in the couch from the moment the deck is taken: not also standing on the pad)
    document.querySelector('#ui')!.classList.toggle('piloting', on);
    const flier = flight.flies?.model;
    if (on && flier && current.id !== flier) show(flier);
    if (on && selected) select(null);
    // at the controls the view is one of the vehicle's (the stage offers only those while it is flown); back on the ground, the place's
    ui.setCamera(on ? 'chase' : 'orbit');
    if (!on) show(current.id);
    placed(on ? 'fly' : 'site');
  },
});
cockpit.listen((sample, state) => sound.follow(sample, state));
cockpit.listen((sample) => {
  for (const m of mechanisms) stage.setMechanism(m.id, cockpit.travel(m.id, sample.t));
});
// the cabin's own instruments read the same samples, and its controls are the flight deck's (viewer/cabin.ts)
cockpit.listen((sample, state) => stage.cabin?.fly(sample, state));
// From a seat, what can be looked out of: a switch apiece, and its digit (stage.leanTo)
const lookouts = () =>
  ui.setLookouts(
    stage.lookouts().map((l) => l.name),
    stage.leaning,
    stage.cabin?.lighting ?? null,
  );
// The cabin's own lights: the switch on its console (a click from the seat) and the button under the lookouts throw
// the one switch (viewer/cabin.ts `light`). It has no key: the flight deck has taken every letter a pilot's hands are near.
const cabinLights = (): void => {
  const said = stage.cabin?.light();
  const lighting = stage.cabin?.lighting;
  if (!said || !lighting) return;
  ui.say(lighting.name, said);
  lookouts();
};
ui.onCabinLights = cabinLights;
const leanTo = (n: number | null) => {
  const said = stage.leanTo(n);
  if (said && n !== null) ui.say(stage.lookouts()[n]?.name ?? 'Looking out', said);
};
ui.onLookout = leanTo;
stage.onLean = lookouts;
stage.onSeat = lookouts;
window.addEventListener('keydown', (e) => {
  const typing = (e.target as HTMLElement).matches?.('input:not([type=range]), textarea');
  if (!/^[1-9]$/.test(e.key) || e.repeat || typing || e.metaKey || e.ctrlKey || e.altKey || ui.wheel.isOpen) return;
  const n = Number(e.key) - 1;
  if (n >= stage.lookouts().length) return;
  leanTo(n);
  e.preventDefault();
});
stage.onCabin = (thing) => {
  if (thing.lights) cabinLights();
  else if (thing.works) {
    // a mechanism's own control: in a flight flown by hand it works it (the deck says where it is sent); otherwise it says why not
    stage.cabin?.work(thing.object);
    if (cockpit.work(thing.works) === null) ui.say(thing.label, 'It is on its programme: fly the flight yourself to work it by hand');
  } else if (thing.does) {
    stage.cabin?.work(thing.object);
    cockpit.ask(thing.does);
    ui.say(thing.label, thing.about ?? '');
  } else if (thing.lookout) {
    const said = stage.lookOut(thing);
    if (said) ui.say(thing.label || 'Looking out', said);
  } else if (thing.label) {
    stage.cabin?.work(thing.object);
    ui.say(thing.label, thing.about ?? '');
  } else stage.lookOut(null);
};
// its other instruments: the navball on the flight deck's top edge, and the predicted path drawn in the scene
const deck = document.querySelector<HTMLElement>('#ui .cockpit')!;
const navball = new Navball(deck, cockpit, deck.querySelector<HTMLElement>('[data-do=navball]'));
// (guidance's own aim is shown while it has something to steer with: the booster, burning)
navball.target = (s) =>
  cockpit.craft && cockpit.steering.guidance && s.phase === 'powered' ? programmeAxis(cockpit.craft, s.t, cockpit.steering.trim) : null;
const path = new FlightPath(
  document.querySelector<HTMLElement>('#ui')!,
  navball.aside,
  cockpit,
  flight,
  stage,
  deck.querySelector<HTMLElement>('[data-do=path]'),
);
navball.onFrame((frame) => path.setFrame(frame));
// the deck lies over the bottom of the view (the vehicle is framed above it), and the path's labels keep off every panel
ui.covers(deck);
path.obstacles = () => ui.panels();
// a section whose slider is a sequence of events reads the clock: as the clock moves, so does its slider
clock.listen(() => {
  if (current.sequence) ui.setSlider(stage.exploded(current.id));
});

/** True while the cutaway is open only because an inside part was chosen, not because it was asked for. */
let autoCut = false;
/** Open or close the cutaway as if its switch had been worked: asked for by hand, so it stays (and the switch shows it). */
function cut(on: boolean): void {
  ui.setCutaway(on);
  if (stage.cutaway !== on) {
    autoCut = false;
    stage.setCutaway(on); // (no switch on the page just now to work it through)
  }
}

/** Drift round whatever was just chosen, unless the user has said not to. */
/** Auto-orbit, unless it is switched off; and not while a part is chosen, which is flown to and held in view (the switch is as it was). */
function orbit(): void {
  stage.setAutoRotate(!orbitOff && !selected);
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
  const hash = formatAddress(flight.id, cockpit.active ? 'fly' : 'site', model.id);
  // (the front page has no address of its own, and the gallery's is its own: the site may have arrived behind it)
  if (!title.showing && !demo.active && !gallery.active && location.hash !== hash) history.replaceState(null, '', hash);
}

/** Fetch the flight's models and open on a section. */
async function start(id: string): Promise<void> {
  started = true;
  ui.loading(flight.callsign);
  stage.veiled = true; // nothing is picked or hovered behind the curtain
  // What the curtain says, as it happens (curtain.ts): each model by its bytes, then what the stage does before the scene can be shown.
  const steps: Record<WarmStep, { label: string; share: number }> = {
    place: { label: flight.surroundings ? 'The place round the pad' : 'Distant levels of detail', share: 0.15 },
    clouds: { label: 'Clouds', share: 0.2 },
    shaders: { label: 'Compiling shaders', share: 0.25 },
    settle: { label: 'Warming up', share: 0.05 },
  };
  const said = follow(
    ui.curtain,
    flight.models.map((m) => m.name),
    steps,
  );
  try {
    await stage.load(flight, (f, parts) => said.arrive(f, parts));
    said.arrive(1);
    show(id, true);
    // The scene is kept dark until it can move smoothly (stage.warm): shown sooner, it would
    // stutter as the rest arrived and then jump. The front page waits over it meanwhile.
    await stage.warm(undefined, (step, f) => said.step(step, f));
    said.end();
    ready = true;
    // whatever is going to be playing when the curtain lifts is already playing
    if (prefs.get('demo') || (title.showing && !unattended)) demo.start();
    await new Promise((done) => setTimeout(done, 500));
    // (a script taking pictures does not wait for a fade)
    if (navigator.webdriver && !location.search.includes('demo')) document.body.classList.add('instant');
    document.body.classList.add('scene-ready');
    ui.loaded();
    stage.veiled = false;
    if (prefs.get('fly')) ui.setCamera('free');
    if (prefs.get('demo')) {
      // it was showing itself when the page was left: it goes on doing so
      if (title.showing) title.hide();
      demo.start();
      prefs.set('demo', true);
    }
  } catch (e) {
    console.error(e);
    ui.failed(e instanceof Error ? e.message : String(e));
  } finally {
    said.end(false);
  }
}

stage.onHover = (node) => ui.hover(node);
stage.onSelect = select;
stage.onModel = (id) => show(id); // a click on the pad, the rocket or the pilot goes to it
stage.onHoverModel = (id) => ui.hoverModel(id);
stage.onHoverPlace = (name, title, about) => ui.hint(name ? [title ?? spaced(name), about ?? 'Click to go and look'] : null);
// A named object inside a part (one searchlight among the ground equipment) is named on hover...
stage.onHoverThing = (thing) => {
  if (thing) ui.hint([thing.label, thing.about ?? 'Click for more']);
  else ui.hint(null);
};
// ...and a click on it says what it is, pointing at it, until the next click elsewhere or Escape.
let told: Thing | null = null;
stage.onThing = (thing) => {
  told = thing;
  if (!thing) return void (demo.active || callout.hide());
  const eyebrow = current.parts.find((p) => thing.object.getObjectByName(p.node) || thingWithin(p.node, thing))?.name ?? current.name;
  callout.show({ eyebrow, title: thing.label, text: thing.about ?? 'Not yet described.' }, () => {
    const at = new Vector3();
    new Box3().setFromObject(thing.object).getCenter(at);
    return stage.screenOf(at);
  });
};
/** Whether `thing` is inside the part node `node` of the section on show. */
function thingWithin(node: string, thing: Thing): boolean {
  for (let o: Object3D | null = thing.object; o; o = o.parent) if (o.name === node) return true;
  return false;
}
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && told && !demo.active) {
    told = null;
    callout.hide();
  }
});
// A right click offers what can be done at that spot: stand a crew member there and walk, or turn the view about it.
stage.onSpot = (page, point, floor, on) => {
  if (stage.aboard()) return; // (from the couch there is nowhere to walk from or fly to: the view is the pilot's own)
  // Flying it, there is nobody to get out and walk (no flight here has an EVA), and a spot on the ground or the pad is not
  // somewhere the view can be sent while it is the vehicle's. What is offered is on the vehicle: what the part under the
  // pointer can be told to do now (Part.commands), and a look at it, which goes with the vehicle.
  if (cockpit.active) {
    // (something it has let go, falling beside it: the view can go with that instead, all the way down)
    if (on.shed) {
      const { drop, name } = on.shed;
      ui.menu(page.x, page.y, [{ label: `Follow the ${name.toLowerCase()}`, run: () => stage.followShed(drop) }]);
      return;
    }
    const spot = on.craft;
    if (!spot) return;
    const part = flight.models.find((m) => m.id === flight.flies?.model)?.parts.find((p) => p.node === on.node);
    ui.menu(page.x, page.y, [
      ...(part?.commands ?? [])
        .filter((c) => cockpit.can(c.ask))
        // (a mechanism worked by hand is offered by where it would now go: out, or back in)
        .map((c) => ({ label: c.back && cockpit.headed(c.ask.slice(5)) ? c.back : c.label, run: () => cockpit.ask(c.ask) })),
      { label: part ? `Look at the ${part.name.toLowerCase()}` : 'Look at this', run: () => stage.lookAtCraft(spot) },
      // (its skin off, to see what is under it and how little room there is: the cutaway, which in flight takes the whole skin)
      ...(current.cutaway && current.id === flight.flies?.model
        ? [{ label: stage.cutaway ? 'Put the skin back' : 'Take the skin off', run: () => cut(!stage.cutaway) }]
        : []),
    ]);
    return;
  }
  const walker = flight.models.find((m) => m.walker);
  ui.menu(page.x, page.y, [
    ...(walker && floor
      ? [{ label: `Walk from here as ${walker.name.toLowerCase()}`, run: () => void stage.enterWalk(walker.id, point) }]
      : []),
    {
      label: 'Look at this',
      run: () => stage.lookAt(point),
    },
  ]);
};
stage.onVisit = orbit; // the view drifts round whatever was last chosen
stage.onFollow = (name) =>
  name ? ui.say(`Following the ${name.toLowerCase()}`, '0 goes back to the spacecraft') : ui.say('Back with the spacecraft', '');
// (from a seat a window is one to look out of, by name, and its key; from outside, one to look in at)
stage.onHoverWindow = (over, name) =>
  ui.hint(
    !over
      ? null
      : name
        ? [name, `Click to lean to it and look out (${stage.lookouts().findIndex((l) => l.name === name) + 1})`]
        : ['Window', 'Click to look inside'],
  );
// taking the camera pauses the drift; it starts again with the next thing chosen
stage.onInteract = () => {
  stage.setAutoRotate(false);
  ui.showRotate(false);
};
stage.onView = (id) => ui.setView(id);
// the rig in charge of the camera has changed, by the page's asking or the stage's own doing (the vehicle left the pad while it was looked at)
stage.onRig = (id) => {
  ui.showCamera(id, !ready || demo.active);
  panelOnly();
  lookouts();
};
/**
 * From the couch the panel is the panel: the flight deck's strip says the same things over the top of it, so on board
 * it is put away (the keys still work, and the clock stays) unless it is asked for. P brings it back and puts it away
 * again, and which is remembered.
 */
function panelOnly(): void {
  const root = document.querySelector('#ui')!;
  const aboard = stage.cameraMode === 'onboard';
  const was = root.classList.contains('panel-only');
  // (not on a touch screen: there the deck's buttons and stick are the only keys there are, and there is no P)
  root.classList.toggle('panel-only', aboard && !prefs.get('deckAboard') && !matchMedia('(pointer: coarse)').matches);
  root.classList.toggle('aboard', aboard);
  if (aboard && !was && root.classList.contains('panel-only') && ready && !demo.active) {
    const n = stage.lookouts().length;
    ui.say('From the couch', '', `${n ? `${n > 1 ? `1–${n}` : '1'} lean and look out · ` : ''}P brings the flight deck back`);
  }
}
// Escape first lets go of a look out of a window or into the periscope; only then is it the flight deck's (which it leaves)
window.addEventListener(
  'keydown',
  (e) => {
    if (e.key !== 'Escape' || !stage.lookingOut) return;
    stage.leanTo(null);
    e.stopImmediatePropagation();
    e.preventDefault();
  },
  true,
);
window.addEventListener('keydown', (e) => {
  const typing = (e.target as HTMLElement).matches?.('input:not([type=range]), textarea');
  if (e.key.toLowerCase() !== 'p' || e.repeat || typing || e.metaKey || e.ctrlKey || e.altKey || stage.cameraMode !== 'onboard') return;
  prefs.set('deckAboard', !prefs.get('deckAboard'));
  panelOnly();
});
// Walking as a figure is done from that figure's section, wherever it was asked for; stopping returns to that section's view.
stage.onWalk = (on, model) => {
  if (on && current.id !== model) show(model, false, true); // the hardware stays where it is while someone is walking on it
  if (on && selected) select(null);
  if (!on) stopWorking();
  ui.setWalking(on);
  if (on) ui.setWalkView(stage.walk.third);
  if (on) {
    stage.walk.motion = MOTION[motion()];
    stage.cam.calm = motion() === 'off';
    ui.setWalkMotion(motion());
  }
  if (!on) show(model, false, true);
};
stage.onWalkLook = (captured) => ui.setWalkLook(captured);
stage.onWalkEyes = (through) => ui.setThroughEyes(through);
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
  // working something by hand, it lets go of the controls (the touch screen's Done)
  if (working) {
    stopWorking();
    return;
  }
  // in a seat (a couch), the act key gets out of it
  if (stage.seated) {
    stage.leaveSeat();
    ui.setWalkNote(null);
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
  else if (verb.do === 'board') {
    ui.showWalkCard(null);
    const why = stage.boardSeat(verb.model, verb.seat);
    ui.setWalkNote(why ? `Not now: ${why}` : 'Mouse looks · E gets out');
    if (why) setTimeout(() => !stage.seated && ui.setWalkNote(null), 4000);
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
    ui.setWorking(verb.ends ?? ['Back', 'Run']);
  });
}
function noteWorking(refused: string | null): void {
  if (!working) return;
  const [back, on] = working.ends ?? ['back', 'on'];
  const touch = matchMedia('(hover: none), (pointer: coarse)').matches;
  ui.setWalkNote(
    refused
      ? `${working.name}: ${refused}`
      : touch
        ? `${working.name} · hold a button to run it`
        : `${working.name} · hold W: ${on} · S: ${back} · E done`,
  );
}
function stopWorking(): void {
  if (!working) return;
  stage.pushFunction(working.model, working.node, working.fn, 0);
  working = null;
  stage.walk.release();
  ui.setWalkNote(null);
  ui.setWorking(null);
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
  // Y takes the skin off whatever is on show that can be opened (ModelDef.cutaway), and puts it back: cut open where it
  // stands, the whole skin off the vehicle in flight, from outside it or from its seat
  if (e.key.toLowerCase() === 'y' && ready && !title.showing && !typing && !e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey) {
    if (current.cutaway && !stage.walk.active && !gallery.active) cut(!stage.cutaway);
    return;
  }
  if (e.key.toLowerCase() === 'v' && ready && !title.showing && !typing && !cockpit.active && !e.metaKey && !e.ctrlKey && !e.altKey) {
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
    location.hash = formatAddress(id, 'gallery');
    return location.reload(); // another flight is another page's worth of state
  }
  demo.stop(); // going in is taking over
  title.hide();
  toGallery(); // a flight is gone into by its gallery: the launch site and the flight deck are gone on to from there
});
if (location.hash.length <= 1) title.show();

/**
 * A flight's three places (address.ts): the gallery, which it opens in; its launch site; and the
 * flight deck, which is at the site. The gallery (gallery.ts) is the vehicle alone on a stage of
 * its own, and all that is fetched until the site is first gone to. Going there puts the site to
 * sleep as it stands, and coming back wakes it as it was left: the section, the selection, the
 * camera, a figure walked somewhere, the clock's instant. A walk is ended first (the figure stays
 * where it stood), a clock that was running is stopped and started again on the way back, and
 * the flight deck is left.
 */
let started = false;
/**
 * Where the site was last asked to open, while it is on its way: the last asked for is the one landed on, and going
 * back to the gallery meanwhile is asking for nowhere at the site (null).
 */
let bound: (() => void) | null = null;
/** What going to the gallery stopped, to be started again on the way back. */
const held = { clock: false, sheet: false, cel: false };
const sheet = document.querySelector<HTMLElement>('#ui .panel')!;
const fronted = () => document.body.classList.contains('titled');
const gallery = new Gallery(document.body, flight, {
  go: (place) => go(place),
  home: () => {
    history.replaceState(null, '', location.pathname + location.search);
    title.show();
  },
  address: (what) => {
    if (!fronted()) history.replaceState(null, '', formatAddress(flight.id, 'gallery', what));
  },
  covered: fronted,
});
// the same switch the gallery has, in the same spot, and the same way back in the crumbs
const places = placesNav(flight, 'site', (to) => go(to));
// (on a narrow page, which has no room for crumbs, the heading is the way out to the front page: gallery.css)
document.querySelector('#ui .title h1')?.setAttribute('data-home', '');
document.querySelector('#ui .title .sub')?.after(places);
/** The site is being seen as the launch site or from the flight deck: the switch, the crumbs and the address say which. */
function placed(place: 'site' | 'fly', write = true): void {
  markPlace(places, place);
  const trail = document.querySelector('#ui .crumbs');
  if (trail) trail.innerHTML = crumbs(flight, place);
  if (write && !fronted() && !gallery.active && !demo.active)
    history.replaceState(null, '', formatAddress(flight.id, place, place === 'fly' ? '' : current.id));
}
/** Go to one of the flight's places. `what`: what an address names there; left out, the place is as it was left. */
function go(place: Place, what?: string): void {
  if (place === 'gallery') toGallery(what);
  else toSite(what ?? '', place === 'fly');
}
/** `what`: the part or the choice of what stands there that an address names ('' for the whole vehicle); left out, the gallery is as it was left. */
function toGallery(what?: string): void {
  if (gallery.active) {
    // (already there: an address that names something goes to it; coming in from the front page takes it over)
    if (what === undefined) void gallery.enter();
    else gallery.go(what);
    if (!fronted()) history.replaceState(null, '', formatAddress(flight.id, 'gallery', what ?? gallery.at));
    return;
  }
  bound = null;
  if (cockpit.active) cockpit.leave();
  demo.stop();
  if (stage.walk.active) stage.exitWalk();
  if (told) stage.onThing(null);
  held.clock = clock.running;
  clock.pause();
  held.sheet = sheet.classList.contains('open');
  held.cel = prefs.get('cel');
  sheet.classList.remove('open'); // (a phone's sheet, open, would keep its share of the gallery's screen)
  sound.hush(true);
  stage.sleep(true);
  if (!fronted()) history.replaceState(null, '', formatAddress(flight.id, 'gallery', what ?? gallery.at));
  void gallery.enter(what);
}
/** To the launch site (on `model`'s section, if one is named), or with `fly` to its flight deck. The first time, the site is fetched. */
function toSite(model = '', fly = false): void {
  if (gallery.active) {
    gallery.leave();
    stage.sleep(false);
    sound.hush(false);
    sheet.classList.toggle('open', held.sheet);
    if (held.clock) clock.play();
    // what is remembered for both places may have been changed there
    if (prefs.get('cel') !== held.cel) ui.setCel(prefs.get('cel'));
    if (prefs.get('orbitOff') !== orbitOff) {
      // (the turntable is one setting for both: switched there, the view here and its lamp follow now, not at the next choice)
      orbitOff = prefs.get('orbitOff');
      orbit();
    }
  }
  const land = (): void => {
    if (ready && model && model !== current.id && !fly) show(model);
    if (ready && fly && !cockpit.active) cockpit.enter();
    else if (!fly && cockpit.active) cockpit.leave();
    else placed(cockpit.active ? 'fly' : 'site');
  };
  if (ready) return void land();
  // still on its way: this is where it opens, whatever was asked before (the switch says so now; the address when it lands)
  bound = land;
  placed(fly ? 'fly' : 'site', false);
  if (started) return;
  prefs.set('demo', false); // (it was gone to by hand: it does not open showing itself, whatever it was doing when last left)
  void start(model).then(() => {
    const to = bound;
    bound = null;
    to?.();
  });
}
document.addEventListener('click', (e) => {
  // the crumbs: back to the flight (its gallery), or out to the front page
  if ((e.target as HTMLElement).closest?.('#ui [data-flight-home]')) return toGallery();
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
  // (not while someone is on foot, nor while a flight is being watched or flown: the show does not take a view that is being used)
  busy: () =>
    !ready ||
    gallery.active ||
    stage.walk.active ||
    stage.frozen ||
    document.hidden ||
    stage.piloted ||
    (!demo.active && (clock.running || stage.cameraMode !== 'orbit')),
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
    if (!title.showing) history.replaceState(null, '', formatAddress(flight.id, 'site', current.id)); // where the show left off is now the place
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
for (const touch of ['pointerdown', 'wheel', 'keydown', 'touchstart', 'pointermove'] as const)
  window.addEventListener(
    touch,
    (e) => {
      // the mouse moving is someone there: the show does not start under them (it does not end a show that is on: a press does)
      if (e.type === 'pointermove' && (title.showing || demo.active)) return;
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

// A flight opens in its gallery, and its site is fetched when it is first gone to; an address that names the site or
// the flight deck (or, as addresses once did, only a section of the site) opens there.
const first = address();
placed('site', false);
go(opensIn(flight, first.place), first.place ? first.what : undefined);
window.addEventListener('hashchange', () => {
  if (location.hash.length <= 1) return title.show();
  if (title.showing) title.hide();
  const to = address();
  // another flight is another page's worth of state: start clean rather than rebuild in place
  if (to.flightId && to.flightId !== flight.id && flights.some((f) => f.id === to.flightId)) location.reload();
  else go(opensIn(flight, to.place), to.place ? to.what : undefined);
});

// diagnostics, twice a second
setInterval(() => {
  // a card read and walked away from is put down
  if (cardAt && ui.walkCardOpen && Math.hypot(stage.walk.body.position.x - cardAt.x, stage.walk.body.position.z - cardAt.z) > 3)
    ui.showWalkCard(null);
  const s = stage.stats();
  const tris = s.triangles >= 1e6 ? `${(s.triangles / 1e6).toFixed(2)} M` : `${Math.round(s.triangles / 1e3)} k`;
  ui.showFind(stage.vehicleAway);
  ui.setStats(
    `${s.fps.toFixed(0)} fps · ${s.drawn.toFixed(0)} drawn · ${s.ms.toFixed(1)} ms · ${tris} tris · ${s.calls} calls · detail ${s.levels.join('/')}${stage.walkRigid ? ' · figure rigid (no joints)' : ''}${stage.quality.scale < 1 ? ` · ◐ resolution ${Math.round(s.scale * 100)} % (holding the frame rate)` : ''}`,
  );
}, 500);

// debug handle, as in lunar-lift: sr.show('pad'), sr.stage.pose(az, el, dist)
Object.assign(window, { sr: { stage, ui, flight, show, clock, demo, cockpit, navball, path, sound, effects, gallery } });

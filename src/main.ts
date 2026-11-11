import { flights } from '../missions';
import { prefs } from './prefs';
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
  walk: (on) => (on ? void stage.enterWalk(current.id) : stage.exitWalk()),
  walkStick: (x, y) => stage.walk.stick(x, y),
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
  if (location.hash !== hash) history.replaceState(null, '', hash);
}

/** Fetch the flight's models and open on a section. */
async function start(id: string): Promise<void> {
  ui.loading(flight.callsign);
  try {
    await stage.load(flight, (f) => ui.setProgress(f));
    ready = true;
    show(id, true);
    ui.loaded();
  } catch (e) {
    console.error(e);
    ui.failed(e instanceof Error ? e.message : String(e));
  }
}

stage.onHover = (node) => ui.hover(node);
stage.onSelect = select;
stage.onModel = (id) => show(id); // a click on the pad, the rocket or the pilot goes to it
stage.onHoverModel = (id) => ui.hoverModel(id);
stage.onHoverPlace = (name) =>
  // a node is named in one word (Pad6Gantry): spaced out, it is a label
  ui.hint(
    name
      ? [
          name.replace(/([a-z])([A-Z0-9])/g, '$1 $2').replace(/^(.)(.*)$/, (_, a: string, b: string) => a + b.toLowerCase()),
          'Click to go and look',
        ]
      : null,
  );
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
  if (!on) show(model);
};
stage.onWalkLook = (captured) => ui.setWalkLook(captured);
stage.onHome = () => (selected ? select(null) : show(current.id));
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && selected) select(null);
});

void start(address().model);
window.addEventListener('hashchange', () => {
  const to = address();
  // another flight is another page's worth of state: start clean rather than rebuild in place
  if (to.flightId && to.flightId !== flight.id && flights.some((f) => f.id === to.flightId)) location.reload();
  else if (ready && to.model !== current.id) show(to.model);
});

// diagnostics, twice a second
setInterval(() => {
  const s = stage.stats();
  const tris = s.triangles >= 1e6 ? `${(s.triangles / 1e6).toFixed(2)} M` : `${Math.round(s.triangles / 1e3)} k`;
  ui.setStats(
    `${s.fps.toFixed(0)} fps · ${s.drawn.toFixed(0)} drawn · ${s.ms.toFixed(1)} ms · ${tris} tris · ${s.calls} calls · detail ${s.levels.join('/')}`,
  );
}, 500);

// debug handle, as in lunar-lift: sr.show('pad'), sr.stage.pose(az, el, dist)
Object.assign(window, { sr: { stage, ui, flight, show } });

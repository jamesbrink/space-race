import { flights } from '../missions';
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

const ui = new Ui(document.querySelector<HTMLElement>('#ui')!, flight, {
  model: show,
  explode: (t) => stage.setExplode(t),
  view: (id) => stage.view(id),
  autoRotate: (on) => stage.setAutoRotate(on),
  cutaway: (on) => {
    autoCut = false; // asked for by hand: it stays until asked otherwise
    stage.setCutaway(on);
  },
  hoverPart: (node) => stage.highlight(node, selected),
  selectPart: select,
  inset: (px) => stage.setInset(px),
});

/** True while the cutaway is open only because an inside part was chosen, not because it was asked for. */
let autoCut = false;

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
  if (node) {
    stage.focus(node);
    ui.setRotate(false);
  } else {
    stage.view(current.home ?? 'all'); // back to where this section starts
  }
}

/** Switch to one of the flight's models. The address bar's #fragment follows, so a view can be linked. */
async function show(id: string): Promise<void> {
  const model = flight.models.find((m) => m.id === id) ?? flight.models[0]!;
  selected = null;
  autoCut = false;
  ui.loading(model.name);
  try {
    if (!(await stage.load(flight, model.id, (f) => ui.setProgress(f)))) return; // overtaken by a later choice
    current = model;
    ui.setModel(model.id);
    stage.setExplode(0);
    const hash = `#${flight.id}/${model.id}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
    ui.loaded();
  } catch (e) {
    console.error(e);
    ui.failed(e instanceof Error ? e.message : String(e));
  }
}

stage.onHover = (node) => ui.hover(node);
stage.onSelect = select;
stage.onModel = (id) => void show(id); // a click on the pad, the rocket or the pilot opens its section
stage.onHoverModel = (id) => ui.hoverModel(id);
stage.onInteract = () => ui.setRotate(false);
stage.onView = (id) => ui.setView(id);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && selected) select(null);
});

void show(address().model);
window.addEventListener('hashchange', () => {
  const to = address();
  // another flight is another page's worth of state: start clean rather than rebuild in place
  if (to.flightId && to.flightId !== flight.id && flights.some((f) => f.id === to.flightId)) location.reload();
  else void show(to.model);
});

// debug handle, as in lunar-lift: sr.show('pad'), sr.stage.pose(az, el, dist)
Object.assign(window, { sr: { stage, ui, flight, show } });

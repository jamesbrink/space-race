import { flights } from '../missions';
import { Ui } from './ui';
import { Stage } from './viewer/stage';

const flight = flights[0]!;
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
});

/** True while the cutaway is open only because an inside part was chosen, not because it was asked for. */
let autoCut = false;

function select(node: string | null): void {
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
    await stage.load(flight, model.id, (f) => ui.setProgress(f));
    current = model;
    ui.setModel(model.id);
    stage.setExplode(0);
    if (location.hash !== `#${model.id}`) history.replaceState(null, '', `#${model.id}`);
    ui.loaded();
  } catch (e) {
    console.error(e);
    ui.failed(e instanceof Error ? e.message : String(e));
  }
}

stage.onHover = (node) => ui.hover(node);
stage.onSelect = select;
stage.onInteract = () => ui.setRotate(false);
stage.onView = (id) => ui.setView(id);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && selected) select(null);
});

void show(location.hash.slice(1));
window.addEventListener('hashchange', () => void show(location.hash.slice(1)));

// debug handle, as in lunar-lift: sr.show('pad'), sr.stage.pose(az, el, dist)
Object.assign(window, { sr: { stage, ui, flight, show } });

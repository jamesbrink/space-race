import { flights } from '../missions';
import { Ui } from './ui';
import { Stage } from './viewer/stage';

const flight = flights[0]!;
document.title = `${flight.callsign} · ${flight.designation} · Space Race`;

const stage = new Stage(document.querySelector<HTMLCanvasElement>('#stage')!);
let selected: string | null = null;

const ui = new Ui(document.querySelector<HTMLElement>('#ui')!, flight, {
  model: show,
  explode: (t) => stage.setExplode(t),
  view: (id) => stage.view(id),
  autoRotate: (on) => stage.setAutoRotate(on),
  hoverPart: (node) => stage.highlight(node, selected),
  selectPart: select,
});

function select(node: string | null): void {
  selected = node;
  stage.highlight(null, node);
  ui.select(node);
}

/** Switch to one of the flight's models. The address bar's #fragment follows, so a view can be linked. */
async function show(id: string): Promise<void> {
  const model = flight.models.find((m) => m.id === id) ?? flight.models[0]!;
  selected = null;
  ui.loading(model.name);
  try {
    await stage.load(flight, model.id, (f) => ui.setProgress(f));
    ui.setModel(model.id);
    stage.setExplode(0);
    history.replaceState(null, '', `#${model.id}`);
    ui.loaded();
  } catch (e) {
    console.error(e);
    ui.failed(e instanceof Error ? e.message : String(e));
  }
}

stage.onHover = (node) => ui.hover(node);
stage.onSelect = select;
stage.onInteract = () => ui.setRotate(false);

void show(location.hash.slice(1));

// debug handle, as in lunar-lift: sr.show('pad'), sr.stage.pose(az, el, dist)
Object.assign(window, { sr: { stage, ui, flight, show } });

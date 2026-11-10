import { flights } from '../missions';
import { Ui } from './ui';
import { Stage } from './viewer/stage';

const flight = flights[0]!;
document.title = `${flight.callsign} · ${flight.designation} · Space Race`;

const stage = new Stage(document.querySelector<HTMLCanvasElement>('#stage')!);
let selected: string | null = null;

const ui = new Ui(document.querySelector<HTMLElement>('#ui')!, flight, {
  explode: (t) => stage.setExplode(t),
  view: (v) => stage.view(v),
  autoRotate: (on) => stage.setAutoRotate(on),
  hoverPart: (node) => stage.highlight(node, selected),
  selectPart: select,
});

function select(node: string | null): void {
  selected = node;
  stage.highlight(null, node);
  ui.select(node);
}

stage.onHover = (node) => ui.hover(node);
stage.onSelect = select;
stage.onInteract = () => ui.setRotate(false);

stage
  .load(flight, (f) => ui.setProgress(f))
  .then(() => ui.loaded())
  .catch((e: unknown) => {
    console.error(e);
    ui.failed(e instanceof Error ? e.message : String(e));
  });

// debug handle, as in lunar-lift: window.sr.stage.pose(az, el, dist)
Object.assign(window, { sr: { stage, ui, flight } });

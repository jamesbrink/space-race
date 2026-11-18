import { dock, fitName, handle, hintOnce, narrow, sayIn, viewHeight } from './fold.ts';
import { type Sheet, sheet } from './sheet.ts';
import './slider.ts';
import { CURTAIN, Curtain } from '../app/curtain.ts';
import { prefs } from '../app/prefs.ts';
import type { Confidence, Flight, ModelDef, Part } from '../types.ts';
import { flownByHand } from '../sim/plan.ts';
import { RIGS, type RigId } from '../viewer/camera/rig.ts';
import { functionsOf } from '../viewer/explode.ts';
import { chooseTier, tier } from '../viewer/tier.ts';
import { lookoutsOf } from '../viewer/lookouts.ts';
import { icon } from './icons.ts';
import { Wheel } from './wheel.ts';
import { $, esc } from '../util/dom.ts';
import { capsOf, doesOf, is, isTyping, KEYS, type KeyName, modified, which } from '../util/keys.ts';
import { Scope } from '../util/scope.ts';

/**
 * The walk bar's readout of something worked by hand (Ui.setWorking): its name and which way it is going, a travel bar
 * between its two ends, why it will not move if it will not, and its keys as buttons (W and S held, E pressed).
 */
function workMarkup(): string {
  // (each button presses the first key of its slot in the table, and shows that key's cap)
  const key = (name: KeyName, slot: number): string => {
    const s = (KEYS[name].slots as readonly (string | readonly string[])[])[slot]!;
    return typeof s === 'string' ? s : s[0]!;
  };
  const [on, back] = capsOf('work.push');
  const [done] = capsOf('work.done');
  return `<div class="work" hidden role="group" aria-label="Working by hand">
    <p class="work-what"><b class="work-name"></b><em class="work-way" aria-live="polite"></em><span class="work-pct"></span></p>
    <div class="travel" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i class="track"><i class="fill"></i><i class="mark"></i></i><small class="end0"></small><small class="end1"></small></div>
    <p class="work-why" hidden></p>
    <div class="work-keys"><button class="work-back" data-hold="${key('work.push', 1)}" title="Hold to run it back"><kbd>${esc(back!)}</kbd><span></span></button><button class="work-on" data-hold="${key('work.push', 0)}" title="Hold to run it on"><kbd>${esc(on!)}</kbd><span></span></button><button data-press="${key('work.done', 0)}" title="Let go of the controls"><kbd>${esc(done!)}</kbd><span>Done</span></button></div>
  </div>`;
}

export interface UiHandlers {
  model(id: string): void;
  explode(t: number): void;
  view(id: string): void;
  autoRotate(on: boolean): void;
  cutaway(on: boolean): void;
  /** Put a rig in charge of the camera (viewer/camera). */
  camera(mode: RigId): void;
  /** The rig C goes to next, as things stand: about the place on the pad, about the vehicle with a flight in the air. */
  nextCamera(): RigId;
  /** Bring the view back to what the camera is about; with a flight in the air and the view elsewhere, to the vehicle. */
  refind(): void;
  /** Draw the scene as a cel-shaded drawing, or as it would look. */
  cel(on: boolean): void;
  holdPace(on: boolean): void;
  /** Get down and walk the site as the figure whose section this is, or stop. */
  walk(on: boolean): void;
  walkReturn(): void;
  /** The on-screen stick while walking: x to the right, y forward, each -1 to 1. */
  walkStick(x: number, y: number): void;
  /** The on-screen jump button while walking. */
  walkJump(): void;
  /** While walking: the next setting of how much the view moves with the body. */
  walkMotion(): void;
  /** The on-screen view button while walking: through the figure's eyes, or over its shoulder. */
  walkView(): void;
  /** The on-screen act button while walking: offer what can be done with what is being looked at. */
  walkAct(): void;
  /** Working something by hand on a touch screen: a finger held on a run button (1 toward the end of its travel, -1 back), or lifted (0). */
  walkPush(push: number): void;
  hoverPart(node: string | null): void;
  selectPart(node: string | null): void;
  /** How far along its travel each function of a part is (0 to 1), and why it will not move, if it will not. */
  fnValues(node: string): { id: string; value: number; refused: string | null }[];
  /** Put a function of a part somewhere along its travel; returns where it now is. */
  setFn(node: string, id: string, v: number): number;
  /** How many pixels at the bottom of the 3D view the controls cover, and how many at the top along its centre line. */
  inset(pixels: number, top: number): void;
}

const CAMERA_LABEL: Record<RigId, string> = {
  orbit: 'Camera · orbit',
  free: 'Camera · free fly',
  chase: 'Camera · chase',
  locked: 'Camera · chase, locked',
  onboard: 'Camera · on board',
  pad: 'Camera · pad',
  eyes: 'On foot · through the eyes',
  shoulder: 'On foot · over the shoulder',
};
/** On the button the word "camera" is a picture of one: the rig's own name is what changes. */
const cameraName = (mode: RigId) => CAMERA_LABEL[mode].replace('Camera · ', '');
const CAMERA_ICON = icon('camera');
/** The class the page takes in each rig: which block of the legend is on show. */
const CAMERA_CLASS: Partial<Record<RigId, string>> = {
  free: 'flying',
  chase: 'chasing',
  locked: 'chasing',
  onboard: 'aboard',
  pad: 'tracking',
};

const clock = (t: number) => {
  const s = Math.round(t);
  return `T+${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export function si(value: number, unit: string): string {
  if (unit === 'N') return value >= 1000 ? `${(value / 1000).toFixed(value >= 1e5 ? 0 : 2)} kN` : `${value.toFixed(1)} N`;
  if (unit === 'kg') return `${value >= 100 ? Math.round(value).toLocaleString('en-US') : value.toFixed(1)} kg`;
  if (unit === 'deg') return `${value}°`;
  if (unit === 'kPa') return `${value.toFixed(1)} kPa`;
  if (unit === 'L') return `${Math.round(value).toLocaleString('en-US')} L`;
  if (unit === 'level') return `level ${value}`;
  return `${value.toFixed(value >= 10 ? 2 : 3)} ${unit}`;
}

export const dot = (c: Confidence) => `<i class="conf ${c}" title="${c}"></i>`;

export const legend = `<p class="fine legend"><span>${dot('documented')}documented</span><span>${dot('assumed')}assumed from its type</span><span>${dot('derived')}derived from documented</span><span>${dot('estimated')}estimated</span></p>`;

/** A row of the legend: a gesture in words, or keys (each its own cap), and what it does. */
type LegendRow = [on: string | string[], does: string];
/** One rig's legend: the keys drawn as they lie on the keyboard, the few things to know, and the rest in groups behind "More". */
interface LegendDef {
  pads: [shape: 'wasd' | 'arrows' | 'pair' | 'key', keys: string[], does: string][];
  main: LegendRow[];
  more: [group: string, rows: LegendRow[]][];
}
/** A row of keys from the table (util/keys.ts): their caps, in turn, and what they do (the first one's words, or `does`). */
const keyRow = (does: string | null, ...names: KeyName[]): LegendRow => [capsOf(...names), does ?? doesOf(names[0]!)];
/** A cluster of keys as they lie on the keyboard, from the table. */
const pad = (shape: LegendDef['pads'][number][0], name: KeyName, does = doesOf(name)): LegendDef['pads'][number] => [
  shape,
  capsOf(name),
  does,
];

/**
 * The legend (bottom left): every key and gesture, for whichever rig has the camera or for the walker. It is shut to a
 * "? Keys" tab until asked for; open, it shows the keys and the few things to know, and "More" unfolds the rest by purpose.
 * Every key in it is drawn from the table (util/keys.ts) its handler asks, so the two cannot drift; the gestures are
 * written here.
 */
function legendMarkup(f: Flight): string {
  const walker = f.models.find((m) => m.walker);
  const flies = flownByHand(f.plan) && Boolean(f.flies);
  // from the seat of what is flown: what can be looked out of, each by its digit (lookouts.ts)
  const lookouts = lookoutsOf(f.models.find((m) => m.id === f.flies?.model)?.cabin);
  // and the cabin's own lights, if it has a switch for them (CabinDef.lighting)
  const lighting = f.models.find((m) => m.id === f.flies?.model)?.cabin?.lighting;
  // what is the same whoever has the camera
  const go: LegendRow[] = [...(walker ? [keyRow(null, 'walk.go')] : []), ...(flies ? [keyRow(null, 'deck.toggle')] : [])];
  const clock: LegendRow[] = [keyRow(null, 'clock.run'), keyRow(null, 'clock.rate'), keyRow(null, 'sound.toggle')];
  const page: LegendRow[] = [keyRow(null, 'page.cel'), keyRow(null, 'page.legend')];
  const rest = (first: [string, LegendRow[]][]): LegendDef['more'] => [
    ...first,
    ...(go.length ? [['Go', go] as [string, LegendRow[]]] : []),
    ['Clock', clock],
    ['Page', page],
  ];
  const camera = (reset: string): LegendRow[] => [
    keyRow(null, 'cam.next'),
    keyRow(reset, 'cam.home'),
    keyRow(null, 'cut.toggle'),
    keyRow(null, 'page.bare'),
  ];
  const defs: Record<string, LegendDef> = {
    '': {
      pads: [pad('wasd', 'orbit.move'), pad('arrows', 'orbit.turn'), pad('pair', 'orbit.rise'), pad('pair', 'orbit.zoom')],
      main: [
        ['drag', 'orbit'],
        ['scroll · pinch', 'zoom to pointer'],
        ['click', 'go to it'],
        keyRow(null, 'page.back'),
        ...camera(doesOf('cam.home')),
      ],
      more: rest([
        [
          'Mouse',
          [
            ['right · middle · shift-drag', 'move'],
            ['two fingers', 'zoom · move · twist'],
            ['double-click', 'turn about it'],
            ['right-click', 'walk from there'],
            ...(walker ? [[`double-click ${walker.name.toLowerCase()}`, 'walk'] as LegendRow] : []),
          ],
        ],
      ]),
    },
    'in-flight': {
      pads: [pad('wasd', 'free.fly'), pad('arrows', 'free.look'), pad('pair', 'orbit.rise'), pad('key', 'free.faster')],
      main: [['drag', 'look round'], ['scroll · pinch', 'to pointer · back'], ['click', 'go to it'], ...camera(doesOf('cam.home'))],
      more: rest([['Mouse', [['right-drag', 'slide']]]]),
    },
    chasing: {
      pads: [pad('arrows', 'orbit.turn'), pad('pair', 'orbit.zoom')],
      main: [['drag', 'turn round it'], ['scroll · pinch', 'closer · further'], ...camera('centre the vehicle')],
      more: rest([
        [
          'Mouse',
          [
            ['right-click a part', 'what it can do · look at it · its skin off'],
            ['right-click a stage that has left', 'follow it'],
          ],
        ],
      ]),
    },
    aboard: {
      pads: [pad('arrows', 'free.look'), pad('pair', 'orbit.zoom')],
      main: [
        ['drag', 'look round'],
        ['scroll · pinch', 'zoom'],
        ...(lookouts.length
          ? [
              [
                capsOf('seat.lean').slice(0, lookouts.length),
                `${doesOf('seat.lean')}: ${lookouts.map((l) => l.name.toLowerCase()).join(' · ')}`,
              ] as LegendRow,
            ]
          : []),
        ['click', lighting ? `work a control · the ${lighting.name.toLowerCase()} switch` : 'work a control'],
        ...camera('look ahead'),
      ],
      more: rest([]),
    },
    tracking: {
      pads: [pad('arrows', 'pad.frame'), pad('pair', 'orbit.zoom')],
      main: [['drag', 'move it in the frame'], ['scroll · pinch', 'tighter · wider'], ...camera('centre the vehicle')],
      more: rest([]),
    },
    'on-foot': {
      pads: [pad('wasd', 'foot.walk'), pad('arrows', 'foot.turn'), pad('key', 'foot.run'), pad('key', 'foot.jump')],
      main: [
        ['mouse', 'look round'],
        keyRow(null, 'foot.act'),
        keyRow(null, 'foot.view'),
        keyRow(null, 'foot.free'),
        keyRow(`${doesOf('foot.leave')} (${capsOf('foot.leave')[0]}: once the mouse is free)`, 'walk.go', 'foot.leave'),
        keyRow(null, 'page.bare'),
      ],
      more: [
        ['On a ladder', [keyRow(null, 'foot.climb')]],
        ['Clock', clock],
        ['Page', page],
      ],
    },
  };
  const caps = (keys: string[]) => keys.map((k) => `<kbd>${esc(k)}</kbd>`).join(' ');
  const rows = (list: LegendRow[], cls = '') =>
    `<dl${cls ? ` class="${cls}"` : ''}>${list.map(([on, does]) => `<div><dt>${typeof on === 'string' ? esc(on) : caps(on)}</dt><dd>${esc(does)}</dd></div>`).join('')}</dl>`;
  const body = ([cls, d]: [string, LegendDef]) => `
        <div class="legend-body${cls ? ` ${cls}` : ''}">
          <div class="clusters">${d.pads
            .map(
              ([shape, keys, does]) =>
                `<div class="cluster">${shape === 'key' ? caps(keys) : `<span class="pad ${shape}">${keys.map((k) => `<kbd>${k}</kbd>`).join('')}</span>`}<em>${esc(does)}</em></div>`,
            )
            .join('')}</div>
          ${rows(d.main)}
          <div class="legend-more">${d.more.map(([group, list]) => `<h4>${esc(group)}</h4>${rows(list, list.every(([on]) => typeof on !== 'string') ? 'keys' : '')}`).join('')}</div>
        </div>`;
  return `<aside class="legend-keys" aria-label="Keys and gestures">
        <button class="legend-toggle" aria-expanded="false" title="Keys and gestures: show or hide (?)"><kbd>?</kbd><span>Keys</span><i class="chevron"></i></button>
        ${Object.entries(defs).map(body).join('')}
        <button class="legend-more-toggle" aria-expanded="false" title="Every other key and gesture"><span></span><i class="chevron"></i></button>
      </aside>`;
}

/** (View is the control block, which on a phone lives in the sheet: fold.ts) */
const TABS = ['View', 'Parts', 'Specs', 'Motors', 'Flight'] as const;
const pane = (name: (typeof TABS)[number]) => `data-pane="${name}" id="pane-${name}" role="tabpanel" aria-labelledby="tab-${name}"`;

/** The DOM half of the app. Everything it shows comes from the flight's data file. */
export class Ui {
  private note: string | null = null;
  private captured = false;
  /** The radial menu of things to do with what a walker is looking at (wheel.ts). */
  readonly wheel: Wheel;
  /** What the panels hang on the window (util/scope.ts): let go of with the page (`dispose`). */
  private readonly scope = new Scope();
  /** Shut the right click's menu, if one is open (it is on the page itself: `menu`). */
  private closeMenu: () => void = () => {};
  /** The classes the root had before the panels were written into it, for `dispose` to leave it as it found it. */
  private readonly rootClass: string;
  private selected: string | null = null;
  private cameraMode: RigId = 'orbit';

  get cutaway(): boolean {
    return this.root.querySelector('[data-cut]')?.getAttribute('aria-pressed') === 'true';
  }
  private pointer: [number, number] = [0, 0];
  private model: ModelDef;

  constructor(
    private readonly root: HTMLElement,
    private readonly flight: Flight,
    private readonly on: UiHandlers,
  ) {
    this.rootClass = root.className;
    const f = flight;
    this.model = f.models[0]!;
    const date = new Date(f.launch).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    const groups = [...new Set(f.specs.map((s) => s.group))];
    root.innerHTML = `
      <header class="title">
        <button class="tuck chevron" aria-label="Show or hide the flight summary" aria-expanded="true" title="Tuck the summary away, or bring it back"></button>
        <p class="crumbs"><button data-home title="Front page">Space Race</button> <b>/</b> ${esc(f.nation)} <b>/</b> ${esc(f.program)}</p>
        <h1>${esc(f.callsign)}</h1>
        <p class="sub">${esc(f.designation)}<span> <b>·</b> ${date}</span></p>
        <p class="lede">${esc(f.summary)}</p>
        <button class="facts-toggle" aria-expanded="false" aria-controls="flight-facts" title="The flight in figures: show or hide"><span>The flight in figures</span><i class="chevron"></i></button>
        <dl class="facts" id="flight-facts">${f.facts.map((x) => `<div><dt>${esc(x.label)}</dt><dd>${esc(x.value)}</dd></div>`).join('')}</dl>
      </header>

      <nav class="models" aria-label="What to look at">
        ${f.models.map((m) => `<button data-model="${m.id}" title="${esc(m.name)}: go to it">${esc(m.name)}</button>`).join('')}
      </nav>

      <aside class="panel">
        <nav class="tabs" role="tablist">
          ${TABS.map((t) => `<button role="tab" id="tab-${t}" data-tab="${t}" aria-controls="pane-${t}">${t}</button>`).join('')}
          <button class="close chevron" aria-label="Show or hide the panel" aria-expanded="true" title="Tuck the panel away, or bring it back"></button>
        </nav>
        <section ${pane('View')} hidden>
          <div class="slot" data-slot="apart"></div>
          <div class="slot" data-slot="buttons"></div>
          <div class="slot" data-slot="scale"></div>
          <div class="slot" data-slot="stats"></div>
        </section>
        <section ${pane('Parts')}><ol class="parts"></ol></section>
        <section ${pane('Specs')} hidden>
          ${groups
            .map(
              (g) => `
            <div data-group="${esc(g)}"><h2>${esc(g)}</h2>
            <table>${f.specs
              .filter((s) => s.group === g)
              .map(
                (s) => `
              <tr><th>${dot(s.confidence)}${esc(s.label)}</th><td>${si(s.value, s.unit)}${s.note ? `<small>${esc(s.note)}</small>` : ''}</td></tr>`,
              )
              .join('')}
            </table></div>`,
            )
            .join('')}
          ${legend}
        </section>
        <section ${pane('Motors')} hidden>
          <table>${f.motors
            .map(
              (m) => `
            <tr><th>${dot(m.confidence)}${m.count} × ${esc(m.name)}<small>${esc(m.propellant)}${m.note ? ` · ${esc(m.note)}` : ''}</small></th>
            <td>${si(m.thrustN, 'N')}${m.burnS ? `<small>${m.burnS} s burn</small>` : '<small>pulsed</small>'}</td></tr>`,
            )
            .join('')}
          </table>
          ${legend}
        </section>
        <section ${pane('Flight')} hidden>
          <p class="lede small-only">${esc(f.summary)}</p>
          <dl class="facts small-only">${f.facts.map((x) => `<div><dt>${esc(x.label)}</dt><dd>${esc(x.value)}</dd></div>`).join('')}</dl>
          <div class="flown"></div>
          <ol class="timeline">${f.timeline.map((e) => `<li><time>${clock(e.t)}</time><span>${esc(e.event)}</span></li>`).join('')}</ol>
          <p class="fine">${esc(f.spacecraft)}<br>${esc(f.launchVehicle)}<br>${esc(f.launchSite)}</p>
        </section>
        <nav class="handle" aria-label="What to look at, and the rest">
          <span class="handle-slot"></span>
          ${f.models.some((m) => m.walker) ? `<button class="handle-walk" data-press="v" title="Get down and walk the site as the crew (V)">${icon('walk')}Walk</button>` : ''}
          <button class="handle-open" aria-expanded="false" title="Views, taking it apart, the parts, the figures and the flight: open or put away"><b>More</b><i class="chevron"></i></button>
        </nav>
      </aside>

      <footer class="controls">
        <label class="explode"><span data-slider="0"></span>
          <input type="range" min="0" max="1" step="0.01" value="0" />
          <span data-slider="1"></span></label>
        <div class="buttons"></div>
        <p class="scale"></p>
      </footer>
      ${legendMarkup(f)}
      <div class="walkbar" hidden><span></span><div data-walk-location></div>${workMarkup()}<button data-walk-motion title="How much the view moves with the body: full, reduced, or a steady camera"></button><button data-walk-visor aria-pressed="false" title="The rim of the helmet's visor round the view, through the eyes">Visor</button><button data-walk-return title="Return to where this walk began">Back to start</button><button data-walk-exit title="Back to the camera (V or Esc)">Exit walk</button></div>
      <div class="visor" aria-hidden="true"></div>
      <div class="stick" aria-hidden="true"><i></i></div>
      <div class="walk-buttons"><button data-walk-push="-1" hidden></button><button data-walk-push="1" hidden></button><button data-walk-jump title="Jump">Jump</button><button data-walk-view aria-pressed="false" title="Through the eyes, or over the shoulder (C)">View</button><button data-walk-visor aria-pressed="false" title="The rim of the helmet's visor round the view, through the eyes">Visor</button><button data-walk-act hidden title="What can be done with what you are looking at">Act</button></div>
      <div class="reticle" aria-hidden="true"><i></i><p><kbd>E</kbd><span></span></p></div>
      <nav class="lookouts" aria-label="Look out" hidden></nav>
      <aside class="walk-card" hidden aria-live="polite">
        <button class="card-close" aria-label="Close" title="Close">×</button>
        <h3></h3><p class="card-what"></p><p class="card-more"></p><div class="pf"></div>
      </aside>
      <output class="stats" aria-label="Diagnostics"></output>
      <div class="tip" hidden><b></b><span></span></div>
      ${CURTAIN}`;
    this.curtain = new Curtain($<HTMLElement>(root, '.loading'));

    // On a phone the panel is a sheet: tapping a tab opens it, tapping the open tab closes it.
    const panel = $<HTMLElement>(root, '.panel');
    root.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) =>
      b.addEventListener('click', () => {
        const same = b.getAttribute('aria-selected') === 'true';
        this.tuckPanel(false);
        this.tab(b.dataset.tab!);
        // (on a phone the open tab pressed again puts the sheet away, as its handle does)
        if (narrow()) this.sheet?.set(same && panel.classList.contains('open') ? 0 : this.sheet.stop || 1);
        else panel.classList.toggle('open', !(same && panel.classList.contains('open')));
      }),
    );
    const stage = $<HTMLElement>(document, '#stage');
    // (on a phone the sheet stays where it was put: a finger on the view is turning the view)
    stage.addEventListener('pointerdown', () => !narrow() && panel.classList.remove('open'));
    // Panels tuck away. The data panel shuts to its row of tabs (on a phone it is a sheet that
    // does the same) and any tab opens it again; the title card folds to its heading; H clears
    // the lot for an unobstructed view.
    // Each of these choices is remembered (prefs.ts), so the page comes back the way it was left.
    this.tuckPanel(prefs.get('panelTucked'));
    $(root, '.close').addEventListener('click', () => {
      const tucked = panel.classList.contains('tucked');
      panel.classList.toggle('open', tucked);
      this.tuckPanel(!tucked);
    });
    const title = $<HTMLElement>(root, '.title');
    const tuck = $<HTMLElement>(title, '.tuck');
    const tuckTitle = (on: boolean) => {
      title.classList.toggle('tucked', on);
      tuck.setAttribute('aria-expanded', String(!on));
      prefs.set('titleTucked', on);
    };
    tuckTitle(prefs.get('titleTucked'));
    tuck.addEventListener('click', () => tuckTitle(!title.classList.contains('tucked')));
    const bare = (on: boolean) => {
      root.classList.toggle('bare', on);
      prefs.set('bare', on);
    };
    bare(prefs.get('bare'));
    // the legend is a "? Keys" tab until it is asked for; whether it is open, and how much of it, is remembered
    const legendKeys = $<HTMLElement>(root, '.legend-keys');
    const legendToggle = $<HTMLElement>(legendKeys, '.legend-toggle');
    const moreToggle = $<HTMLElement>(legendKeys, '.legend-more-toggle');
    const showLegend = (open: boolean) => {
      legendKeys.classList.toggle('folded', !open);
      legendToggle.setAttribute('aria-expanded', String(open));
      prefs.set('legendOpen', open);
    };
    const showMore = (open: boolean) => {
      legendKeys.classList.toggle('all', open);
      moreToggle.setAttribute('aria-expanded', String(open));
      $<HTMLSpanElement>(moreToggle, 'span').textContent = open ? 'Less' : 'More';
      prefs.set('legendMore', open);
    };
    showLegend(prefs.get('legendOpen'));
    showMore(prefs.get('legendMore'));
    legendToggle.addEventListener('click', () => showLegend(legendKeys.classList.contains('folded')));
    moreToggle.addEventListener('click', () => showMore(!legendKeys.classList.contains('all')));
    // the flight's facts fold under the summary: shut until asked for, and remembered
    const factsToggle = $<HTMLElement>(title, '.facts-toggle');
    const showFacts = (open: boolean) => {
      title.classList.toggle('facts-open', open);
      factsToggle.setAttribute('aria-expanded', String(open));
      prefs.set('factsOpen', open);
    };
    showFacts(prefs.get('factsOpen'));
    factsToggle.addEventListener('click', () => showFacts(!title.classList.contains('facts-open')));
    // the legend is never taller than the room under the title card
    this.scope.observer(() => root.style.setProperty('--title-h', `${title.offsetHeight}px`)).observe(title);
    const name = title.querySelector<HTMLElement>(':scope > h1');
    if (name) fitName(name, this.scope);
    this.scope.on(window, 'keydown', (e) => {
      const typing = isTyping(e);
      if (modified(e) || typing) return;
      if (is(e, 'page.bare')) bare(!root.classList.contains('bare'));
      if (is(e, 'page.cel')) this.setCel(!prefs.get('cel'));
      // C is the camera: it steps through the ways of moving the view (on foot it is the walker's, between first and third person)
      if (is(e, 'cam.next') && !root.classList.contains('walking')) this.nextCamera();
      if (is(e, 'page.legend')) showLegend(legendKeys.classList.contains('folded'));
    });
    // On a phone the panel is a sheet a finger moves between its stops (sheet.ts: the gallery's is the same one). At
    // rest again, the part being read is in view in it.
    // Its handle's button opens it to half and puts it away. Opening or closing it moves no camera the hands have set: the
    // measurement below tells the stage what is clear, and the stage frames again only a view still being followed.
    let grip: { shown(): void } | null = null;
    this.sheet = sheet(panel, () => {
      grip?.shown();
      window.setTimeout(() => this.root.querySelector('[data-node][aria-expanded=true]')?.scrollIntoView({ block: 'nearest' }), 320);
    });
    grip = handle($<HTMLElement>(root, '.handle-open'), panel, this.sheet);
    // a key that is also a button (the handle's Walk): pressed, it is the key itself
    $(root, '.handle').addEventListener('click', (e) => {
      const key = (e.target as HTMLElement).closest<HTMLElement>('[data-press]')?.dataset.press;
      if (key) window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    });
    $(root, '[data-walk-return]').addEventListener('click', () => on.walkReturn());
    $(root, '[data-walk-exit]').addEventListener('click', () => on.walk(false));
    $(root, '.lookouts').addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-lookout]');
      if (b) this.onLookout(Number(b.dataset.lookout));
      const sw = (e.target as HTMLElement).closest<HTMLElement>('[data-switch]');
      if (sw) this.onSwitch(Number(sw.dataset.switch));
      (document.activeElement as HTMLElement | null)?.blur?.(); // (or Space would press it again: Space is the flight's next event)
    });
    this.wheel = new Wheel(root);
    $(root, '[data-walk-act]').addEventListener('click', () => on.walkAct());
    $(root, '[data-walk-view]').addEventListener('click', () => on.walkView());
    $(root, '[data-walk-motion]').addEventListener('click', () => on.walkMotion());
    // the visor's rim round the view through the eyes: a choice, remembered
    const visor = (shown: boolean) => {
      root.classList.toggle('visor-on', shown);
      for (const b of root.querySelectorAll('[data-walk-visor]')) b.setAttribute('aria-pressed', String(shown));
      prefs.set('walkVisor', shown);
    };
    visor(prefs.get('walkVisor'));
    for (const b of root.querySelectorAll('[data-walk-visor]')) b.addEventListener('click', () => visor(!prefs.get('walkVisor')));
    $(root, '.card-close').addEventListener('click', () => this.showWalkCard(null));
    // (on the press, not the click: a jump is wanted now, and a finger held on the button must not look round)
    $(root, '[data-walk-jump]').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      on.walkJump();
    });
    // Working something by hand: a finger held on one of these runs it, for as long as it is held
    root.querySelectorAll<HTMLButtonElement>('[data-walk-push]').forEach((b) => {
      const way = Number(b.dataset.walkPush);
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        on.walkPush(way);
        try {
          b.setPointerCapture(e.pointerId); // (so that a finger sliding off it still lets go here)
        } catch {
          // a pointer the browser no longer has: it lets go by itself
        }
      });
      for (const end of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) b.addEventListener(end, () => on.walkPush(0));
    });
    // (what hangs under the walk bar, the clock, hangs under it however tall the readout makes it)
    const walkbar = $<HTMLElement>(root, '.walkbar');
    this.scope.observer(() => root.style.setProperty('--walkbar-h', `${walkbar.offsetHeight}px`)).observe(walkbar);
    // The readout's keys are buttons too (the deck's rule): one that is held is its key held for as long as the pointer is
    // down on it, the other presses its key; whoever listens for the key does what the key does.
    const press = (key: string, down: boolean) =>
      window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key, bubbles: true }));
    root.querySelectorAll<HTMLButtonElement>('.work [data-hold]').forEach((b) => {
      const set = (down: boolean) => {
        if (b.classList.contains('down') === down) return;
        b.classList.toggle('down', down);
        press(b.dataset.hold!, down);
      };
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault(); // (it takes no focus, so a key held next goes where it should)
        try {
          b.setPointerCapture(e.pointerId);
        } catch {
          // a pointer the browser no longer has: it lets go by itself
        }
        set(true);
      });
      for (const end of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) b.addEventListener(end, () => set(false));
      this.scope.on(window, 'blur', () => set(false));
    });
    root.querySelectorAll<HTMLButtonElement>('.work [data-press]').forEach((b) =>
      b.addEventListener('click', () => {
        press(b.dataset.press!, true);
        press(b.dataset.press!, false);
      }),
    );
    // The walking stick, for a finger: push it the way you want to go, further to go faster.
    const stick = $<HTMLElement>(root, '.stick');
    const knob = $<HTMLElement>(stick, 'i');
    const push = (e: PointerEvent | null) => {
      const r = stick.getBoundingClientRect();
      const reach = r.width / 2;
      let x = e ? (e.clientX - r.left - reach) / reach : 0;
      let y = e ? (e.clientY - r.top - reach) / reach : 0;
      const length = Math.hypot(x, y);
      if (length > 1) {
        x /= length;
        y /= length;
      }
      knob.style.transform = `translate(${x * reach * 0.6}px, ${y * reach * 0.6}px)`;
      on.walkStick(x, -y);
    };
    stick.addEventListener('pointerdown', (e) => {
      stick.setPointerCapture(e.pointerId);
      push(e);
    });
    stick.addEventListener('pointermove', (e) => {
      if (stick.hasPointerCapture(e.pointerId)) push(e);
    });
    for (const end of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) stick.addEventListener(end, () => push(null));
    $(root, '.loading button').addEventListener('click', () => on.model(this.model.id));
    root.querySelectorAll<HTMLButtonElement>('[data-model]').forEach((b) => b.addEventListener('click', () => on.model(b.dataset.model!)));
    $(root, '.tabs').addEventListener('keydown', (e) => {
      const step = which(e as KeyboardEvent, 'tabs.step');
      if (step < 0) return;
      const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-tab]')];
      const at = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
      const next = tabs[(at + (step ? 1 : tabs.length - 1)) % tabs.length]!;
      this.tab(next.dataset.tab!);
      next.focus();
    });
    this.slider.addEventListener('input', () => on.explode(Number(this.slider.value)));
    // parts and view buttons are rebuilt per model, so their clicks are delegated
    const parts = $<HTMLElement>(root, '.parts');
    const node = (e: Event) => (e.target as HTMLElement).closest<HTMLElement>('[data-node]')?.dataset.node ?? null;
    parts.addEventListener('pointerover', (e) => on.hoverPart(node(e)));
    parts.addEventListener('pointerleave', () => on.hoverPart(null));
    parts.addEventListener('click', (e) => {
      const n = node(e);
      if (n) on.selectPart(this.selected === n ? null : n);
    });
    // a function's slider under the selected part: worked by hand; if it will not move it says why and stays
    parts.addEventListener('input', (e) => {
      const input = e.target as HTMLInputElement;
      const box = input.closest<HTMLElement>('[data-fns]');
      if (!box || !input.dataset.fn) return;
      input.value = String(on.setFn(box.dataset.fns!, input.dataset.fn, Number(input.value)));
      this.showFns(box.dataset.fns!);
    });
    $<HTMLElement>(root, '.buttons').addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('button');
      if (b?.dataset.view) on.view(b.dataset.view);
      else if (b?.hasAttribute('data-rotate')) this.setRotate(b.getAttribute('aria-pressed') !== 'true');
      else if (b?.hasAttribute('data-cut')) this.setCutaway(b.getAttribute('aria-pressed') !== 'true');
      else if (b?.hasAttribute('data-walk')) on.walk(true);
      else if (b?.hasAttribute('data-camera')) this.nextCamera();
      else if (b?.hasAttribute('data-cel')) this.setCel(b.getAttribute('aria-pressed') !== 'true');
      else if (b?.hasAttribute('data-pace')) this.setHoldPace(b.getAttribute('aria-pressed') !== 'true');
      else if (b?.hasAttribute('data-lighter')) {
        // (what a tier allocates is allocated as the page opens: the choice is kept, and the page opened again in it)
        chooseTier(b.getAttribute('aria-pressed') !== 'true');
        location.reload();
      }
    });
    // the label that follows the pointer over the model
    this.scope.on(window, 'pointermove', (e) => {
      this.pointer = [e.clientX, e.clientY];
      this.placeTip();
    });
    // the phone layout stacks the switcher on the control block, whose height depends on wrapping
    const controls = $<HTMLElement>(root, '.controls');
    const switcher = $<HTMLElement>(root, '.models');
    this.measure = this.scope.observer(() => {
      root.style.setProperty('--controls-h', `${controls.offsetHeight}px`);
      // whatever sits over the lower half of the 3D view hides that much of it: views are framed above
      const view = stage.getBoundingClientRect();
      const top = (el: HTMLElement) => el.getBoundingClientRect().top;
      const shown = (el: HTMLElement) => el.offsetParent !== null;
      // (on a phone what lies across the foot of the view is the sheet: the control block is inside it)
      const tops = (narrow() ? [panel] : [controls, switcher])
        .filter(shown)
        .map(top)
        .filter((y) => y > view.top + view.height / 2);
      // What was named as covering the view (the flight deck) counts however tall it is (the stage takes at most two thirds of the
      // view), but only those of its panels that lie under the middle of the view, where the subject is: the corners are not in its way.
      const middle = (el: Element) => {
        const r = el.getBoundingClientRect();
        return r.height > 0 && r.left < view.left + view.width * 0.62 && r.right > view.left + view.width * 0.38;
      };
      for (const el of this.covering.filter(shown)) tops.push(...([...el.children] as HTMLElement[]).filter(middle).map(top));
      // and what lies over the top of the view along its centre line (the switcher and the clock; on a phone the title too)
      const clock = root.querySelector<HTMLElement>('.timebar');
      if (clock && !this.clockWatched) {
        this.clockWatched = true;
        this.measure.observe(clock);
      }
      const centre = view.left + view.width / 2;
      const heads = [title, switcher, ...(clock ? [clock] : [])]
        .filter(shown)
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.left < centre && r.right > centre && r.bottom < view.top + view.height / 2)
        .map((r) => r.bottom);
      on.inset(Math.max(0, view.bottom - Math.min(view.bottom, ...tops)), Math.max(0, ...heads) - view.top);
    });
    for (const el of [controls, switcher, stage, panel]) this.measure.observe(el);
    // On a phone the control block is the sheet's View pane and the sections are the handle's (fold.ts); on a wide page
    // they are where they were made
    const slot = (name: string) => $<HTMLElement>(root, `[data-slot=${name}]`);
    dock(
      [
        [$<HTMLElement>(root, '.explode'), slot('apart')],
        [$<HTMLElement>(root, '.buttons'), slot('buttons')],
        [$<HTMLElement>(root, '.controls .scale'), slot('scale')],
        [$<HTMLElement>(root, '.stats'), slot('stats')],
        [switcher, $<HTMLElement>(root, '.handle-slot')],
      ],
      (on) => {
        const at = root.querySelector<HTMLElement>('[data-tab][aria-selected=true]')?.dataset.tab;
        this.tab(!on && at === 'View' ? 'Parts' : (at ?? (on ? 'View' : 'Parts')));
        if (!on) panel.classList.remove('full');
        this.tuckPanel(prefs.get('panelTucked'), false);
      },
      this.scope,
    );
    this.scope.observer(() => this.sized()).observe(slot('buttons'));
    this.setModel(this.model.id);
  }

  private sheet: Sheet | null = null;

  /** How tall the sheet is with the View pane in it: as tall as what the pane holds, so the place keeps the rest (fold.css). */
  private sized(): void {
    const panel = $<HTMLElement>(this.root, '.panel');
    const tall = viewHeight(panel);
    if (tall) for (const el of [panel, $<HTMLElement>(document, '#stage')]) el.style.setProperty('--sheet-view', `${tall}px`);
  }

  private readonly measure: ResizeObserver;
  private readonly covering: HTMLElement[] = [];
  private clockWatched = false;

  /** Something else that lies over the bottom of the 3D view while it is on show (the flight deck): views are framed above it too. */
  covers(el: HTMLElement): void {
    this.covering.push(el);
    this.measure.observe(el);
    for (const panel of el.children) this.measure.observe(panel);
  }

  /** Every panel there is, shown or not: for what is drawn on the view and must not show through one (the path's labels). */
  panelElements(): HTMLElement[] {
    return [
      ...this.root.querySelectorAll<HTMLElement>(
        ':scope > :is(.title, .models, .panel, .controls, .timebar, .legend-keys, .walkbar, .walk-card), .notes > *, .cockpit > *, .cockpit-card',
      ),
    ];
  }

  /** Where every panel on show is, in the window. */
  panels(): DOMRect[] {
    return this.panelElements()
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0);
  }

  /** Beside the pointer, on whichever side has room. */
  private placeTip(): void {
    const tip = $<HTMLElement>(this.root, '.tip');
    if (tip.hidden) return;
    const [x, y] = this.pointer;
    const left = x > window.innerWidth * 0.6;
    tip.classList.toggle('left', left);
    tip.style.transform = `translate(${left ? x - 26 - tip.offsetWidth : x + 26}px, ${Math.max(8, y - 14)}px)`;
  }

  /** The slider has been moved from elsewhere (the clock): show where it is now. */
  setSlider(to: number): void {
    const value = String(to);
    if (this.slider.value !== value) this.slider.value = value;
  }

  private get slider(): HTMLInputElement {
    return $<HTMLInputElement>(this.root, '.explode input[type=range]'); // (its own, by name: the first slider on the page is no longer this one)
  }

  /** Rebuild everything that belongs to one model: its parts, its views, its scale line. */
  setModel(id: string, apart = 0): void {
    const m = (this.model = this.flight.models.find((x) => x.id === id) ?? this.model);
    const r = this.root;
    r.querySelectorAll<HTMLElement>('[data-model]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.model === m.id)));
    $(r, '.parts').innerHTML = m.parts
      .map(
        (p, i) => `${
          p.group && p.group !== m.parts[i - 1]?.group
            ? `<li class="group"><h2>${esc(p.group)} <b>·</b> ${m.parts.filter((x) => x.group === p.group).length}</h2></li>`
            : ''
        }
      <li><button data-node="${p.node}">
        <span class="n">${String(i + 1).padStart(2, '0')}</span>
        <span class="name">${esc(p.name)}${p.inside ? '<em>inside</em>' : ''}</span>
        <span class="what">${esc(p.summary)}</span>
        <span class="more">${esc(p.detail)}${p.facts ? `<span class="pf">${p.facts.map(([k, v]) => `<span><i>${esc(k)}</i>${esc(v)}</span>`).join('')}</span>` : ''}<span class="back"><kbd>Esc</kbd> back to the whole view</span></span>
      </button>${
        // what the part does, each function workable by hand: shown under the part while it is selected
        functionsOf(p).length
          ? `<div class="fns" data-fns="${p.node}">${functionsOf(p)
              .map(
                (f) =>
                  `<label><span>${esc(f.name)}</span><input type="range" min="0" max="1" step="0.005" value="0" data-fn="${esc(f.id)}" aria-label="${esc(f.name)}${f.ends ? `: ${esc(f.ends[0])} to ${esc(f.ends[1])}` : ''}" /></label>`,
              )
              .join('')}<p class="fn-why" hidden></p></div>`
          : ''
      }</li>`,
      )
      .join('');
    const rotating = r.querySelector('[data-rotate]')?.getAttribute('aria-pressed') ?? 'true';
    $(r, '.buttons').innerHTML =
      `<span class="set" role="group" aria-label="View"><span class="set-items sideways">${[
        ...(m.wide === false ? [] : [{ id: 'all', label: 'Wide' }]),
        ...m.views,
      ]
        .map((v) => `<button data-view="${v.id}" aria-pressed="false" title="View: ${esc(v.label)}">${esc(v.label)}</button>`)
        .join('')}</span></span>` +
      `<span class="set" role="group" aria-label="Show">${m.walker ? `<button data-walk title="Walk the site as ${esc(m.name)} (or double-click the figure)">${icon('walk')}Walk</button>` : ''}${m.cutaway ? '<button data-cut class="switch" aria-pressed="false" title="Slice the skin open to what is inside (Y)">Cutaway</button>' : ''}` +
      `<button data-camera title="${CAMERA_LABEL[this.cameraMode]}: the next camera (C)">${CAMERA_ICON}<span>${cameraName(this.cameraMode)}</span></button>` +
      `<button data-rotate class="switch" aria-pressed="${rotating}" title="The view drifts round what was last chosen">Auto-orbit</button>` +
      `<button data-cel class="switch" aria-pressed="${prefs.get('cel')}" title="Draw the scene as a cel-shaded drawing (T)">Cel shading</button>` +
      `<button data-pace class="switch" aria-pressed="${prefs.get('resolutionAuto')}" title="For a slow machine: lower the drawing's resolution a little while frames fall under 30 a second, and put it back. Off, always the screen's full resolution">Hold frame rate</button>` +
      `<button data-lighter class="switch" aria-pressed="${tier().lighter}" title="For a phone or a machine short of memory: smaller shadow maps and pictures, and nothing held that is not on show. Chosen for you on a phone. Changing it reloads the page">Lighter graphics</button></span>`;
    this.slider.setAttribute('aria-label', m.slider ? `${m.slider[0]} to ${m.slider[1]}` : '');
    // this model's own figures first
    const specs = $(r, '[data-pane="Specs"]');
    for (const g of [...(m.specGroups ?? [])].reverse()) {
      const el = specs.querySelector(`[data-group="${g}"]`);
      if (el) specs.prepend(el);
    }
    $(r, '.scale').textContent = m.scale;
    $<HTMLElement>(r, '.explode').hidden = !m.slider;
    $(r, '[data-slider="0"]').textContent = m.slider?.[0] ?? '';
    $(r, '[data-slider="1"]').textContent = m.slider?.[1] ?? '';
    this.slider.value = String(apart);
    this.selected = null;
    // (on a phone the sheet stays on the tab it was put on: the section is chosen from its handle)
    if (!narrow()) this.tab('Parts');
    else this.sized();
  }

  /** Which view button is current; null once the camera has been moved by hand. */
  setView(id: string | null): void {
    this.root.querySelectorAll<HTMLElement>('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === id)));
  }

  setCutaway(on: boolean): void {
    const b = this.root.querySelector('[data-cut]');
    if (!b) return;
    b.setAttribute('aria-pressed', String(on));
    this.on.cutaway(on);
  }

  /** Put a rig in charge of the camera. The stage says when it has (showCamera), and the page follows. */
  setCamera(mode: RigId): void {
    this.on.camera(mode);
  }

  /**
   * A rig has been put in charge of the camera, by the page or by the stage itself (the vehicle left the pad while it
   * was being looked at): the button, the legend and a line across the view say which. Flying free is remembered.
   */
  showCamera(mode: RigId, quiet = false): void {
    this.cameraMode = mode;
    if (mode === 'orbit' || mode === 'free') prefs.set('fly', mode === 'free');
    for (const c of new Set(Object.values(CAMERA_CLASS))) this.root.classList.toggle(c, CAMERA_CLASS[mode] === c);
    const b = this.root.querySelector<HTMLElement>('[data-camera]');
    if (b) {
      $<HTMLSpanElement>(b, 'span').textContent = cameraName(mode);
      b.title = `${CAMERA_LABEL[mode]}: the next camera (C)`;
    }
    if (!quiet) this.say(RIGS[mode].name, `${RIGS[mode].says} · C for the next view`);
  }

  /**
   * Where passing notes go: one stack, hung under the clock wherever the clock is and however tall, so no two notes are
   * ever on top of each other. How far down the stack ends is kept in `--under-clock`, for what sits below it (callout.css).
   */
  private notes(): HTMLElement {
    const had = this.root.querySelector<HTMLElement>('.notes');
    if (had) return had;
    const el = document.createElement('div');
    el.className = 'notes';
    const clock = this.root.querySelector<HTMLElement>('.timebar');
    (clock ?? this.root).append(el);
    const under = () => {
      const notes = el.getBoundingClientRect();
      const bar = (clock ?? el).getBoundingClientRect();
      document.documentElement.style.setProperty(
        '--under-clock',
        `${Math.round(Math.max(bar.bottom, notes.height ? notes.bottom : 0) + 10)}px`,
      );
    };
    const watch = this.scope.observer(under);
    watch.observe(el);
    if (clock) watch.observe(clock);
    this.scope.on(window, 'resize', under);
    return el;
  }

  /** The page has gone to another flight: off the window, the menu and the wheel shut, and the root left as it was found. */
  dispose(): void {
    this.scope.dispose();
    this.curtain.dismiss();
    this.closeMenu();
    this.wheel.dispose();
    this.root.innerHTML = '';
    this.root.className = this.rootClass;
  }

  /** The vehicle is in the air and the camera is not with it: a button that goes to it is on show. */
  showFind(on: boolean): void {
    this.notes(); // (asked every frame: so the stack is there, and measured, from the first)
    let b = this.root.querySelector<HTMLElement>('.find-vehicle');
    if (!b && on) {
      b = document.createElement('button');
      b.className = 'find-vehicle';
      b.title = 'Go to the vehicle (C)';
      b.textContent = 'Find the vehicle';
      b.addEventListener('click', () => this.on.refind());
      this.notes().prepend(b);
    }
    if (b && b.hidden === on) b.hidden = !on;
  }

  /** C: the next rig there is as things stand; with only this one to choose from, back to what it is about (the vehicle, lost off the screen). */
  private nextCamera(): void {
    const next = this.on.nextCamera();
    if (next !== this.cameraMode) {
      this.setCamera(next);
      return;
    }
    this.on.refind();
    this.say(RIGS[next].name, 'Centred again');
  }

  /**
   * Say something across the top of the view for a moment: which view the camera has just been put in, and what it does.
   * It goes by itself; saying something else replaces it.
   */
  say(title: string, line: string, note?: string): void {
    sayIn(this.notes(), title, note ?? line);
  }

  /** Cel shading on or off: for every section, and remembered. */
  setCel(on: boolean): void {
    prefs.set('cel', on);
    this.root.querySelector('[data-cel]')?.setAttribute('aria-pressed', String(on));
    this.on.cel(on);
  }

  /** The resolution lowered while the frame rate cannot be kept, or (off, as it starts) always the screen's own: remembered. */
  setHoldPace(on: boolean): void {
    prefs.set('resolutionAuto', on);
    this.root.querySelector('[data-pace]')?.setAttribute('aria-pressed', String(on));
    this.on.holdPace(on);
  }

  /** The user's own switch: on or off until they say otherwise. */
  setRotate(on: boolean): void {
    this.showRotate(on);
    this.on.autoRotate(on);
  }

  /** Show whether the view is drifting, without it being the user's decision (a drag pauses it). */
  showRotate(on: boolean): void {
    this.root.querySelector('[data-rotate]')?.setAttribute('aria-pressed', String(on));
  }

  /** Shut the data panel to its row of tabs, or open it again. */
  private tuckPanel(on: boolean, remember = true): void {
    // (a wide page's choice: on a phone the sheet has its stops, and the handle works them)
    $(this.root, '.panel').classList.toggle('tucked', on && !narrow());
    $(this.root, '.close').setAttribute('aria-expanded', String(!on));
    if (remember && !narrow()) prefs.set('panelTucked', on);
  }

  setWalkLocation(text: string): void {
    const label = $(this.root, '[data-walk-location]');
    if (label.textContent !== text) label.textContent = text;
  }

  /** Walking on foot has begun or ended: the panels make way for the view, and one bar says how to stop. */
  setWalking(on: boolean): void {
    this.root.classList.toggle('walking', on);
    $<HTMLElement>(this.root, '.walkbar').hidden = !on;
    $(this.root, '.panel').classList.remove('open', 'full'); // a phone's sheet would keep its share of the screen
    if (on) {
      (document.activeElement as HTMLElement | null)?.blur?.(); // or Space would press the button just used
      this.setWalkLook(false);
    } else {
      this.on.walkStick(0, 0);
      this.wheel.close();
      this.setWalkTarget(null);
      this.showWalkCard(null);
    }
  }

  /**
   * Working something by hand (on foot, at its controls), or not (null). The walk bar becomes its readout: what is held,
   * which way it is going and how far along its travel it is, between its two ends by name (`showWork`), with its keys,
   * each also a button. On a touch screen the jump button gives way to two that run it while a finger is on them, each
   * named by the end of its travel it runs toward, and the act button says Done.
   */
  setWorking(work: { name: string; ends?: [string, string] } | null): void {
    const ends = work ? (work.ends ?? (['the start', 'the end'] as [string, string])) : null;
    const [back, on] = this.root.querySelectorAll<HTMLButtonElement>('[data-walk-push]');
    back!.hidden = on!.hidden = !ends;
    if (ends) [back!.textContent, on!.textContent] = ends;
    $<HTMLButtonElement>(this.root, '[data-walk-jump]').hidden = Boolean(ends);
    this.working = Boolean(ends);
    this.updateAct();
    const bar = $<HTMLElement>(this.root, '.walkbar');
    bar.classList.toggle('working', Boolean(work));
    const panel = $<HTMLElement>(bar, '.work');
    panel.hidden = !work;
    if (!work || !ends) return;
    this.workEnds = ends;
    $(panel, '.work-name').textContent = work.name;
    $(panel, '.end0').textContent = ends[0];
    $(panel, '.end1').textContent = ends[1];
    $(panel, '.work-back span').textContent = ends[0];
    $(panel, '.work-on span').textContent = ends[1];
    $(panel, '.travel').setAttribute('aria-label', `${work.name}: from ${ends[0]} to ${ends[1]}`);
    this.shownWork = null;
    this.showWork({ value: 0, way: 0, refused: null });
  }
  private working = false;
  private workEnds: [string, string] = ['the start', 'the end'];
  private shownWork: { value: number; way: number; refused: string | null } | null = null;

  /** How what is being worked by hand stands: how far along its travel (0 to 1), which way it is going (1 toward its second end), and why it will not move. */
  showWork(state: { value: number; way: -1 | 0 | 1; refused: string | null }): void {
    if (!this.working) return;
    const pct = Math.round(Math.min(1, Math.max(0, state.value)) * 100);
    const was = this.shownWork;
    if (was && Math.round(was.value * 100) === pct && was.way === state.way && was.refused === state.refused) return;
    this.shownWork = { ...state };
    const panel = $<HTMLElement>(this.root, '.walkbar .work');
    const travel = $<HTMLElement>(panel, '.travel');
    travel.setAttribute('aria-valuenow', String(pct));
    travel.setAttribute('aria-valuetext', `${pct}% of the way to ${this.workEnds[1]}`);
    travel.dataset.value = String(state.value);
    travel.style.setProperty('--at', `${state.value * 100}%`);
    $(panel, '.work-pct').textContent = `${pct}%`;
    const way = $<HTMLElement>(panel, '.work-way');
    way.dataset.way = String(state.way);
    way.textContent =
      state.way > 0
        ? `▶ to ${this.workEnds[1]}`
        : state.way < 0
          ? `◀ to ${this.workEnds[0]}`
          : pct >= 100
            ? this.workEnds[1]
            : pct <= 0
              ? this.workEnds[0]
              : 'stopped';
    const why = $<HTMLElement>(panel, '.work-why');
    why.hidden = !state.refused;
    why.textContent = state.refused ? `Will not move: ${state.refused}` : '';
  }

  /** While walking: the view is through the figure's eyes (not from outside it), so the visor's rim, if chosen, is round it. */
  setThroughEyes(on: boolean): void {
    this.root.classList.toggle('eyes', on);
  }

  /** While walking: say something on the bar in place of the usual reminder (null: the reminder again). */
  setWalkNote(text: string | null): void {
    this.note = text;
    this.setWalkLook(this.captured);
  }

  /** While walking: how much the view moves with the body, as the bar's button says it. */
  setWalkMotion(level: 'full' | 'reduced' | 'off'): void {
    $(this.root, '[data-walk-motion]').textContent = `Motion · ${level}`;
  }

  /** While walking: whether the view is over the figure's shoulder (and not through its eyes). */
  setWalkView(third: boolean): void {
    $(this.root, '[data-walk-view]').setAttribute('aria-pressed', String(third));
  }

  /** While walking: the name of what is being looked at from within reach and can be acted on, or null. The reticle says so. */
  setWalkTarget(name: string | null): void {
    const reticle = $<HTMLElement>(this.root, '.reticle');
    reticle.classList.toggle('on', Boolean(name));
    $<HTMLSpanElement>(reticle, 'span').textContent = name ?? '';
    $(reticle, 'kbd').textContent = matchMedia('(hover: none), (pointer: coarse)').matches ? 'hold' : 'E';
    this.targetName = name;
    this.updateAct();
  }
  private targetName: string | null = null;

  /** The act button is there when there is something to act on, and says Done while something is being worked by hand. */
  private updateAct(): void {
    const act = $<HTMLElement>(this.root, '[data-walk-act]');
    act.hidden = !this.targetName && !this.working;
    act.textContent = this.working ? 'Done' : 'Act';
  }

  /** While walking: a compact card of what the flight's data says about a part (not the orbit view's panel), or null to put it away. */
  showWalkCard(part: Part | null): void {
    const card = $<HTMLElement>(this.root, '.walk-card');
    card.hidden = !part;
    if (!part) return;
    $(card, 'h3').textContent = part.name;
    $(card, '.card-what').textContent = part.summary;
    $(card, '.card-more').textContent = part.detail;
    $(card, '.pf').innerHTML = (part.facts ?? []).map(([k, v]) => `<span><i>${esc(k)}</i>${esc(v)}</span>`).join('');
    card.scrollTop = 0;
  }

  get walkCardOpen(): boolean {
    return !$<HTMLElement>(this.root, '.walk-card').hidden;
  }

  /** While walking: whether the mouse has been captured for looking round. The bar says what to do next. */
  setWalkLook(captured: boolean): void {
    this.captured = captured;
    const touch = matchMedia('(hover: none), (pointer: coarse)').matches;
    $(this.root, '.walkbar span').textContent = this.note
      ? this.note
      : touch
        ? 'Drag to look · stick walks'
        : captured
          ? `Mouse looks · WASD walks · E acts · C view · ${capsOf('foot.free')[0]} frees the mouse · ${capsOf('walk.go')[0]} leaves`
          : `Click the view to look round · WASD walks · ${capsOf('walk.go')[0]} or ${capsOf('foot.leave')[0]} leaves`;
  }

  /** The diagnostics line: this is an early build, and the numbers are worth having in view. */
  setStats(text: string): void {
    const stats = $<HTMLElement>(this.root, '.stats');
    stats.textContent = text;
    // Under the control block's own left edge it wraps rather than run beneath it (and the legend above it makes room for the lines)
    const controls = $<HTMLElement>(this.root, '.controls').getBoundingClientRect();
    const free = !this.root.classList.contains('piloting') && getComputedStyle(stats).position === 'absolute' && controls.width > 0;
    stats.style.maxWidth = free ? `${Math.max(120, Math.floor(controls.left - stats.offsetLeft - 14))}px` : '';
    this.root.style.setProperty('--stats-h', `${stats.offsetHeight}px`);
  }

  /**
   * The curtain is up: a flight is on its way in. Nothing behind it shows or answers until `loaded` (a label that was
   * beside the pointer is put away; the stage is told not to pick, main.ts), and the curtain says what is arriving.
   */
  loading(what: string): void {
    this.curtain.begin(what);
    const tip = $<HTMLElement>(this.root, '.tip');
    tip.hidden = true;
    delete tip.dataset.model;
  }
  /** The curtain itself (curtain.ts): the same one the gallery has. */
  readonly curtain: Curtain;

  loaded(): void {
    this.curtain.done();
    // (said once, on a first visit, under the clock: what the bar at the foot holds)
    hintOnce(this.notes(), 'The bar at the foot', 'What to look at, walking, and More: the views, the parts, the flight');
  }

  /** It did not arrive: said in the curtain's place as a notice (the panels stay usable), with the way to try again. */
  failed(message: string): void {
    this.curtain.failed(message);
  }

  /** A part under the pointer in the 3D view. */
  hover(node: string | null): void {
    const tip = $<HTMLElement>(this.root, '.tip');
    const part = this.model.parts.find((p) => p.node === node);
    // not for the part already selected: its name is on the panel, and the label would sit on it
    if (part) delete tip.dataset.model;
    // (with no part under the pointer the label may be showing a neighbouring model instead: leave it)
    if (!tip.dataset.model) tip.hidden = !part || node === this.selected || matchMedia('(hover: none)').matches;
    if (part) {
      $<HTMLElement>(tip, 'b').textContent = part.name;
      $<HTMLSpanElement>(tip, 'span').textContent =
        part.summary + (this.model.walker ? ` Double-click to walk as ${this.model.name}.` : '');
      this.placeTip();
    }
    this.root.querySelectorAll<HTMLElement>('[data-node]').forEach((b) => b.classList.toggle('hot', b.dataset.node === node));
  }

  /** A small menu at a point on the page: what can be done with what was right-clicked. Goes away on a choice, Escape or a click elsewhere. */
  menu(x: number, y: number, items: { label: string; run: () => void }[]): void {
    document.querySelector('.spot-menu')?.remove();
    if (!items.length) return;
    const menu = document.createElement('div');
    menu.className = 'spot-menu';
    menu.setAttribute('role', 'menu');
    for (const item of items) {
      const b = document.createElement('button');
      b.setAttribute('role', 'menuitem');
      b.textContent = item.label;
      b.addEventListener('click', () => {
        close();
        item.run();
      });
      menu.append(b);
    }
    const close = () => {
      this.closeMenu = () => {};
      menu.remove();
      window.removeEventListener('pointerdown', away, true);
      window.removeEventListener('keydown', key, true);
    };
    const away = (e: Event) => !menu.contains(e.target as Node) && close();
    const key = (e: KeyboardEvent) => is(e, 'menu.close') && close();
    document.body.append(menu); // on the page itself, not among the panels: it is there when they are hidden
    // kept on the page: opened near an edge, it opens the other way
    menu.style.left = `${Math.min(x, window.innerWidth - menu.offsetWidth - 8)}px`;
    menu.style.top = `${Math.min(y, window.innerHeight - menu.offsetHeight - 8)}px`;
    menu.querySelector('button')?.focus();
    this.closeMenu();
    this.closeMenu = close;
    this.scope.on(window, 'pointerdown', away, true);
    this.scope.on(window, 'keydown', key, true);
  }

  /**
   * From a seat (on board, or a couch boarded on foot): what can be looked out of, each a switch that leans the pilot
   * to it and back (its digit is the key), lit while he leans to it. An empty list puts it away.
   */
  setLookouts(names: string[], leaning: number | null, switches: CabinSwitch[] = []): void {
    lookoutsBar($<HTMLElement>(this.root, '.lookouts'), names, leaning, switches);
  }
  /** One of `setLookouts` was asked for. */
  onLookout: (n: number) => void = () => {};
  /** A cabin switch in the lookouts bar was pressed: its index (viewer/cabin.ts `throwSwitch`). */
  onSwitch: (index: number) => void = () => {};

  /** A label beside the pointer for something that is not a part: a window to look through. */
  hint(text: [title: string, line: string] | null): void {
    const tip = $<HTMLElement>(this.root, '.tip');
    if (!text) {
      if (tip.dataset.model === '-') {
        tip.hidden = true;
        delete tip.dataset.model;
      }
      return;
    }
    tip.dataset.model = '-';
    tip.hidden = matchMedia('(hover: none)').matches;
    $<HTMLElement>(tip, 'b').textContent = text[0];
    $<HTMLSpanElement>(tip, 'span').textContent = text[1];
    this.placeTip();
  }

  /** Another of the flight's models under the pointer: a click would open it. */
  hoverModel(id: string | null): void {
    const tip = $<HTMLElement>(this.root, '.tip');
    const model = this.flight.models.find((m) => m.id === id);
    if (!model) {
      if (tip.dataset.model) tip.hidden = true;
      delete tip.dataset.model;
      return;
    }
    tip.dataset.model = model.id;
    tip.hidden = matchMedia('(hover: none)').matches;
    $<HTMLElement>(tip, 'b').textContent = model.name;
    $<HTMLSpanElement>(tip, 'span').textContent = model.walker ? `Click to open · double-click to walk as ${model.name}` : 'Click to open';
    this.placeTip();
  }

  /** Bring a part's function sliders up to date with the hardware, and say why any of them will not move. */
  private showFns(node: string): void {
    const box = this.root.querySelector<HTMLElement>(`[data-fns="${node}"]`);
    if (!box) return;
    const values = this.on.fnValues(node);
    box.querySelectorAll<HTMLInputElement>('[data-fn]').forEach((input) => {
      const v = values.find((f) => f.id === input.dataset.fn);
      if (v && document.activeElement !== input) input.value = String(v.value);
    });
    const why = $<HTMLElement>(box, '.fn-why');
    const refused = values.find((f) => f.refused);
    why.hidden = !refused;
    why.textContent = refused?.refused ?? '';
  }

  select(node: string | null): void {
    this.selected = node;
    if (node) this.showFns(node);
    if (node && !narrow()) {
      this.tab('Parts');
      $(this.root, '.panel').classList.add('open');
      this.tuckPanel(false);
    } else if (node && !this.root.querySelector('.panel.open')) {
      // (on a phone choosing a part opens nothing: it is named in passing, and the sheet stays where it was put)
      const part = this.model.parts.find((p) => p.node === node);
      if (part) this.say(part.name, part.summary);
    }
    this.root.querySelectorAll<HTMLElement>('[data-node]').forEach((b) => {
      const on = b.dataset.node === node;
      b.setAttribute('aria-expanded', String(on));
      if (on) b.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  private tab(name: string): void {
    this.root.querySelectorAll<HTMLElement>('[data-tab]').forEach((b) => {
      b.setAttribute('aria-selected', String(b.dataset.tab === name));
      b.tabIndex = b.dataset.tab === name ? 0 : -1; // one stop in the tab order; the arrow keys move within
    });
    this.root.querySelectorAll<HTMLElement>('[data-pane]').forEach((p) => (p.hidden = p.dataset.pane !== name));
    $(this.root, '.panel').classList.toggle('on-view', name === 'View');
    this.sized();
  }
}

/**
 * A switch of the cabin as the bar shows it (viewer/cabin.ts `switched`): the cabin's lights, a globe's mode. Its index
 * (what pressing it throws), its name, its position and what that reads; `built`, it is in the model to be clicked.
 */
type CabinSwitch = { index: number; name: string; says: string; at: number; built?: boolean };

/**
 * The bar of what can be done from a seat (on board at a site, a couch boarded on foot, an exhibit's seat in the gallery):
 * what can be looked out of, each a switch that leans to it and back (its digit is the key), lit while leant to; the
 * cabin's switches (its own lights, a globe's mode), if it has any; and, in the gallery, the seats there are to move between and the way out
 * (`seats`). Hidden while there is nothing on it.
 */
export function lookoutsBar(
  bar: HTMLElement,
  names: string[],
  leaning: number | null,
  switches: CabinSwitch[] = [],
  seats: { labels: string[]; at: number | null } | null = null,
): void {
  const key = [...names, ...switches.map((s) => `${s.index} ${s.name}`), ...(seats ? ['', ...seats.labels] : [])].join('\n');
  if (bar.dataset.names !== key) {
    bar.dataset.names = key;
    const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    bar.innerHTML =
      // (one seat of several to move to: a switch apiece, lit for the one sat in; C goes round them)
      (seats && seats.labels.length > 1
        ? seats.labels
            .map(
              (label, i) =>
                `<button class="switch" data-seat="${i}" aria-pressed="false" title="Sit in ${esc(label)} (C goes round the seats)">${esc(capital(label.replace(/^the /, '')))}</button>`,
            )
            .join('')
        : '') +
      names
        .map(
          (name, i) =>
            `<button class="switch" data-lookout="${i}" aria-pressed="false" title="Lean to the ${esc(name.toLowerCase())} and look out; again, or Esc, to sit back (${i + 1})"><kbd>${i + 1}</kbd>${esc(name)}</button>`,
        )
        .join('') +
      // the cabin's switches (its own lights, a globe's mode): each the switch on its console, as a switch here
      switches
        .map(
          (s) =>
            `<button class="switch" data-switch="${s.index}" aria-pressed="false" title="Throw the ${esc(s.name.toLowerCase())} switch${s.built === false ? '' : ': or click it on its console'}"><span></span></button>`,
        )
        .join('') +
      (seats ? '<button data-unseat title="Get up out of the seat: back to the view you had (Esc)"><kbd>Esc</kbd>Get up</button>' : '');
  }
  // (at a site, nothing until there is something to look out of: the lights alone are no reason to show it)
  bar.hidden = names.length === 0 && !seats;
  for (const b of bar.querySelectorAll<HTMLElement>('[data-lookout]'))
    b.setAttribute('aria-pressed', String(Number(b.dataset.lookout) === leaning));
  for (const b of bar.querySelectorAll<HTMLElement>('[data-seat]'))
    b.setAttribute('aria-pressed', String(Number(b.dataset.seat) === seats?.at));
  for (const s of switches) {
    const b = bar.querySelector<HTMLElement>(`[data-switch="${s.index}"]`);
    if (!b) continue;
    // (lit while the switch is as the cabin was built: its first position is as flown)
    b.setAttribute('aria-pressed', String(s.at === 0));
    $<HTMLSpanElement>(b, 'span').textContent = `${s.name} · ${s.says}`;
  }
}

import './lineup.css';
import type { Person } from '../../missions/history.ts';
import type { LineupRow } from '../app/address.ts';
import { CURTAIN, Curtain } from '../app/curtain.ts';
import type { Rect } from '../app/lineup/scene.ts';
import {
  crewOf,
  css,
  day,
  type Entry,
  figureText,
  type Figure,
  heightSpec,
  keyFigures,
  type Moment,
  type Section,
  SLOTS,
  surnameOf,
  timeAxis,
  tintOf,
  yearOf,
} from '../app/lineup/row.ts';
import { prefs } from '../app/prefs.ts';
import type { Confidence, Spec } from '../types.ts';
import { esc } from '../util/dom.ts';
import { tier } from '../viewer/tier.ts';
import { dock, handle, hintOnce, narrow, sayIn, viewHeight } from './fold.ts';
import { type Sheet, sheet } from './sheet.ts';
import { dot, legend } from './ui.ts';

/**
 * The Lineup's page (app/lineup.ts is what works it; app/lineup/scene.ts what it is laid over). Its panels are the
 * site's own (style.css: the title card, the data panel, the control block, the legend, the curtain), in the page's
 * own `#ui`, so they are the same glass, tuck with the same chevron, clear with H and fold on a phone exactly as a
 * flight's launch site does (fold.css: one line across the top, one handle at the foot, everything else in the sheet).
 *
 * What is its own:
 *
 * - **The card** (the panel's Vehicle tab): the one chosen. What the history tells of it (its headline, its story, why
 *   it has its name, what it was first to do), who flew it (each opens to what the history tells of them), the way
 *   into its gallery, its key figures with the confidence each was given, and the flight in figures. With nothing
 *   chosen the tab lists the row; with several standing together it sets their figures side by side.
 * - **The programmes** (the Programmes tab): each programme of the row, which opens to why it was, how it was done and
 *   what it left, and forms its section of the row.
 * - **The timeline**: a strip under the row (a lane a programme, a mark a vehicle, the history's other milestones on a
 *   lane of their own), and the Timeline tab, which tells each moment in words.
 * - **What is written on the picture**: each vehicle's name and height under it, a figure at each ruled height, and a
 *   programme's name over its section. They are put where the picture has them after every frame drawn, never on a
 *   panel and never on each other.
 *
 * Every word here is the flights' (flight.ts) or the history's (missions/history.ts); this file writes only what the
 * controls are called.
 */

/** What the page shows: read off the address, and written back to it. */
export interface LineupView {
  row: LineupRow;
  /** The programme whose section is on show (its id), or null for the whole row. */
  section: string | null;
  /** The flights standing together to be compared (two or more), or none. */
  compared: string[];
  /** The flight chosen, or null. */
  chosen: string | null;
  /** Another is being chosen to stand beside the one chosen. */
  picking: boolean;
}

export interface LineupData {
  entries: Entry[];
  sections: Section[];
  moments: Moment[];
  people: readonly Person[];
}

export interface LineupHandlers {
  home(): void;
  /** A vehicle was chosen (its flight's id), by its name, its mark or its line; or none. */
  choose(id: string | null): void;
  /** A programme's section was asked for, or (null) the whole row. */
  section(id: string | null): void;
  row(row: LineupRow): void;
  step(by: number): void;
  /** Begin choosing another to stand beside the one chosen, or give that up. */
  pick(on: boolean): void;
  /** Leave one out of those standing together. */
  drop(id: string): void;
  /** Back to the whole row. */
  whole(): void;
  gallery(id: string): void;
  scale(on: boolean): void;
  names(on: boolean): void;
  light(on: boolean): void;
  cel(on: boolean): void;
  lighter(on: boolean): void;
  /** What the panels leave clear of the picture has changed. */
  measured(): void;
  retry(): void;
}

/** What the picture is asked, to write on it. */
export interface Picture {
  canvas: HTMLCanvasElement;
  /** Where a vehicle's foot and top are on the page (the middle of its box's front edge on the floor, and of its top), CSS pixels; null if it is not standing or is behind the eye. */
  footOf(id: string): { x: number; y: number } | null;
  topOf(id: string): { x: number; y: number } | null;
  /** The ruled heights that carry a figure, metres, and where each crosses a column of the page. */
  marks(): number[];
  markAt(y: number, x: number): number | null;
  /** Where a ruled height begins, at the row's first end. */
  markStart(y: number): { x: number; y: number } | null;
  /** Where the middle of the row's top is on the page. */
  crown(): { x: number; y: number } | null;
}

const TABS = ['View', 'Vehicle', 'Programmes', 'Timeline'] as const;
type Tab = (typeof TABS)[number];

/** Text as paragraphs: a blank line parts them (the history's one convention). */
const paras = (text: string): string =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join('');

/** A short day: 12 Apr 1961. */
const shortDay = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const overlap = (a: Rect, b: Rect, air = 0): boolean =>
  a.left < b.right + air && a.right > b.left - air && a.top < b.bottom + air && a.bottom > b.top - air;

export class LineupUi {
  readonly curtain: Curtain;
  private readonly root: HTMLElement;
  private readonly data: LineupData;
  private readonly on: LineupHandlers;
  private view: LineupView = { row: 'vehicles', section: null, compared: [], chosen: null, picking: false };
  private hovered: string | null = null;
  private pointer: [number, number] = [0, 0];
  /** How tall each stands, as measured on its model, and the flight's own figure for that if it gives one: for whichever row is on show. */
  private heights = new Map<string, { height: number; spec: Spec | null; parted: boolean }>();
  private sheet: Sheet | null = null;
  private names = !prefs.get('lineupNamesOff');
  private readonly labels = new Map<string, HTMLElement>();
  private readonly figures: HTMLElement[] = [];
  private covered: Rect[] = [];
  /** Which person's and which programme's words are open. */
  private openPerson: string | null = null;

  constructor(root: HTMLElement, data: LineupData, handlers: LineupHandlers) {
    this.root = root;
    this.data = data;
    this.on = handlers;
    root.classList.add('lineup');
    this.build();
    this.curtain = new Curtain(this.q('.loading'));
    this.listen();
  }

  private q<T extends HTMLElement = HTMLElement>(selector: string): T {
    return this.root.querySelector<T>(selector)!;
  }

  private entry(id: string | null): Entry | null {
    return (id && this.data.entries.find((e) => e.flight.id === id)) || null;
  }

  /** The vehicles that stand in the row as the page has it. */
  private get standing(): Entry[] {
    const { compared, section } = this.view;
    if (compared.length > 1) return this.data.entries.filter((e) => compared.includes(e.flight.id));
    const of = this.data.sections.find((s) => s.id === section);
    return of ? this.data.entries.filter((e) => of.flights.includes(e.flight.id)) : this.data.entries;
  }

  // ------------------------------------------------------------------------------------------------- built

  private build(): void {
    const { entries, sections } = this.data;
    const years = entries.map((e) => yearOf(e.flight.launch));
    const span = years.length
      ? Math.min(...years) === Math.max(...years)
        ? `${years[0]}`
        : `${Math.min(...years)} to ${Math.max(...years)}`
      : '';
    const pane = (name: Tab) => `data-pane="${name}" id="lineup-pane-${name}" role="tabpanel" aria-labelledby="lineup-tab-${name}"`;
    this.root.innerHTML = `
      <header class="title">
        <button class="tuck chevron" aria-label="Show or hide the summary" aria-expanded="true" title="Tuck away"></button>
        <p class="crumbs"><button data-home title="Front page">Space Race</button> <b>/</b> <span>Lineup</span></p>
        <h1 data-home title="Front page">The Lineup</h1>
        <p class="sub">${entries.length} vehicles<span> <b>·</b> ${span}</span></p>
        <p class="lede">Every crewed spacecraft built here so far, on its launch vehicle, at one scale, in the order they flew.</p>
        <ul class="lu-key" aria-label="Programmes">${sections
          .map(
            (s) =>
              `<li><button data-section="${esc(s.id)}" style="--tint: ${css(s.tint)}" title="${esc(s.name)}: its section of the row"><i></i>${esc(s.name)}<em>${esc(s.nation)}</em></button></li>`,
          )
          .join('')}</ul>
      </header>

      <div class="lu-top">
        <nav class="models" aria-label="What stands in the row">
          <button data-row="vehicles" aria-pressed="true" title="Each spacecraft on its launch vehicle, as it stood on the pad">Vehicles</button>
          <button data-row="spacecraft" aria-pressed="false" title="Each spacecraft alone, without its launch vehicle (P)">Spacecraft alone</button>
        </nav>
        <div class="notes"></div>
      </div>

      <aside class="panel">
        <nav class="tabs" role="tablist">
          ${TABS.map((t) => `<button role="tab" id="lineup-tab-${t}" data-tab="${t}" aria-controls="lineup-pane-${t}">${t}</button>`).join('')}
          <button class="close chevron" aria-label="Show or hide the panel" aria-expanded="true" title="Tuck away"></button>
        </nav>
        <section ${pane('View')} hidden>
          <div class="slot" data-slot="strip"></div>
          <div class="slot buttons" data-slot="views"></div>
          <div class="slot buttons" data-slot="show"></div>
          <div class="slot" data-slot="scale"></div>
        </section>
        <section ${pane('Vehicle')}></section>
        <section ${pane('Programmes')} hidden></section>
        <section ${pane('Timeline')} hidden></section>
        <nav class="steps handle" aria-label="Vehicle by vehicle">
          <button data-step="-1" title="The one before (B)" aria-label="The one before"><i class="arrow back"></i><span>Previous</span></button>
          <button class="handle-open" aria-expanded="false" title="The card, the programmes, the timeline and the view: open or put away"><b></b><span></span><output aria-live="off"></output><i class="chevron"></i></button>
          <button data-alone class="switch" aria-pressed="false" title="Each spacecraft alone, without its launch vehicle">Alone</button>
          <button data-step="1" title="The next (N)" aria-label="The next"><span>Next</span><i class="arrow"></i></button>
        </nav>
      </aside>

      <footer class="controls">
        <div class="lu-strip" role="group" aria-label="Timeline">${this.strip()}</div>
        <div class="buttons">
          <span class="set views" role="group" aria-label="View">
            <button data-step="-1" title="The one before (B)" aria-label="The one before"><i class="arrow back"></i></button>
            <button data-whole title="The whole row, with nothing chosen (0)">Whole row</button>
            <button data-step="1" title="The next (N)" aria-label="The next"><i class="arrow"></i></button>
          </span>
          <span class="set shows" role="group" aria-label="Show">
            <button data-measure class="switch" aria-pressed="false" title="A person 1.8 m tall beside each, the heights ruled across the row, and a tape along the floor (G)">Scale</button>
            <button data-names class="switch" aria-pressed="false" title="Each one's name and height, written under it">Names</button>
            <button data-light class="switch" aria-pressed="false" title="A light hall instead of a dark one (L)">Light</button>
            <button data-cel class="switch" aria-pressed="false" title="Draw it as a cel-shaded drawing (T)">Cel shading</button>
            <button data-lighter class="switch" aria-pressed="${tier().lighter}" title="For a phone or a machine short of memory: fewer vehicles drawn in full at once. Chosen for you on a phone. Changing it reloads the page">Lighter graphics</button>
          </span>
        </div>
        <p class="scale"></p>
      </footer>

      <aside class="legend-keys folded" aria-label="Keys and gestures">
        <button class="legend-toggle" aria-expanded="false" title="Keys and gestures: show or hide (?)"><kbd>?</kbd><span>Keys</span><i class="chevron"></i></button>
        <div class="legend-body">
          <div class="clusters">
            <div class="cluster"><span class="pad arrows"><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></span><em>turn · tilt</em></div>
            <div class="cluster"><span class="pad pair"><kbd>R</kbd><kbd>F</kbd></span><em>zoom</em></div>
            <div class="cluster"><span class="pad wasd"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span><em>along the row</em></div>
            <div class="cluster"><span class="pad pair"><kbd>E</kbd><kbd>Q</kbd></span><em>up · down</em></div>
          </div>
          <dl>
            <div><dt>drag</dt><dd>turn the view</dd></div>
            <div><dt>right-drag · two fingers</dt><dd>slide along the row</dd></div>
            <div><dt>scroll · pinch</dt><dd>zoom to the pointer</dd></div>
            <div><dt>click a vehicle</dt><dd>go to it, and read it</dd></div>
            <div><dt><kbd>N</kbd> <kbd>B</kbd></dt><dd>the next · the one before</dd></div>
            <div><dt><kbd>O</kbd></dt><dd>open the chosen one’s gallery</dd></div>
            <div><dt><kbd>X</kbd></dt><dd>stand another beside it, to compare</dd></div>
            <div><dt><kbd>P</kbd></dt><dd>spacecraft alone · whole vehicles</dd></div>
            <div><dt><kbd>G</kbd></dt><dd>people and heights, for scale</dd></div>
            <div><dt><kbd>L</kbd></dt><dd>light · dark hall</dd></div>
            <div><dt><kbd>T</kbd></dt><dd>cel shading</dd></div>
            <div><dt><kbd>C</kbd></dt><dd>camera: orbit · free</dd></div>
            <div><dt><kbd>0</kbd> <kbd>Esc</kbd></dt><dd>back a step: to the whole row</dd></div>
            <div><dt><kbd>H</kbd></dt><dd>hide panels</dd></div>
          </dl>
        </div>
      </aside>
      <p class="stats" aria-hidden="true"></p>
      <div class="lu-marks"><p class="lu-section" hidden></p></div>
      <div class="tip" hidden><b></b><span></span></div>
      ${CURTAIN}`;
    const marks = this.q('.lu-marks');
    for (const e of entries) {
      const label = document.createElement('button');
      label.className = 'lu-label';
      label.dataset.flight = e.flight.id;
      label.style.setProperty('--tint', css(e.tint));
      label.innerHTML = `<b>${esc(e.flight.callsign)}</b><span></span>`;
      marks.append(label);
      this.labels.set(e.flight.id, label);
    }
    this.tab(narrow() ? 'View' : 'Vehicle');
  }

  /** The timeline as a strip: a lane a programme, a mark a vehicle; what else the history marks, on a lane of its own. */
  private strip(): string {
    const { entries, sections, moments } = this.data;
    const dates = [...entries.map((e) => e.flight.launch), ...moments.map((m) => m.date)];
    const axis = timeAxis(dates);
    const at = (iso: string): number => (axis.to > axis.from ? ((Date.parse(iso) - axis.from) / (axis.to - axis.from)) * 100 : 50);
    const pc = (v: number): string => `${v.toFixed(2)}%`;
    const told = new Map(moments.flatMap((m) => (m.flight && m.source !== null ? [[m.flight, m] as const] : [])));
    const lanes = sections
      .map((s) => {
        const own = entries.filter((e) => s.flights.includes(e.flight.id));
        const [from, to] = [Math.min(...own.map((e) => at(e.flight.launch))), Math.max(...own.map((e) => at(e.flight.launch)))];
        return `
        <div class="lu-lane" style="--tint: ${css(s.tint)}">
          <button class="lu-lane-name" data-section="${esc(s.id)}" title="${esc(s.name)} (${esc(s.nation)}, ${esc(s.years)}): its section of the row">${esc(s.name)}</button>
          <div class="lu-track"><i class="lu-span" style="left: ${pc(from)}; width: ${pc(to - from)}"></i>${own
            .map((e) => {
              const first = told.has(e.flight.id) || e.firsts.length > 0;
              const says = `${e.flight.callsign} · ${day(e.flight.launch)} · ${told.get(e.flight.id)?.title ?? e.headline}`;
              return `<button class="lu-tick${first ? ' first' : ''}" data-flight="${esc(e.flight.id)}" style="left: ${pc(at(e.flight.launch))}" title="${esc(says)}" aria-label="${esc(says)}"></button>`;
            })
            .join('')}</div>
        </div>`;
      })
      .join('');
    // what the history marks that is no vehicle of the row: other events, and flights not built here yet
    const nationsOf = [...new Set([...entries.map((e) => e.flight.nation), ...moments.map((m) => m.nation)])];
    const others = moments.map((m, i) => ({ m, i })).filter(({ m }) => !m.built);
    const events = others.length
      ? `
        <div class="lu-lane events">
          <button class="lu-lane-name" data-tab-to="Timeline" title="The milestones of the race, in words">Milestones</button>
          <div class="lu-track">${others
            .map(({ m, i }) => {
              const says = `${shortDay(m.date)} · ${m.title}`;
              return `<button class="lu-dot" data-moment="${i}" style="left: ${pc(at(m.date))}; --tint: ${css(tintOf(nationsOf.indexOf(m.nation), 0))}" title="${esc(says)}" aria-label="${esc(says)}"></button>`;
            })
            .join('')}</div>
        </div>`
      : '';
    // (a figure at every year while there is room for them: every second, or fifth, of a long span)
    const every = axis.years.length > 12 ? 5 : axis.years.length > 6 ? 2 : 1;
    const ticks = axis.years
      .map((y) => {
        const x = at(new Date(Date.UTC(y, 0, 1)).toISOString());
        return `<i style="left: ${pc(x)}"${y % every === 0 ? ` data-year="${y}"` : ''}></i>`;
      })
      .join('');
    return `${events}${lanes}<div class="lu-lane axis"><span class="lu-lane-name"></span><div class="lu-track lu-years">${ticks}</div></div>`;
  }

  // ------------------------------------------------------------------------------------------------ heard

  private listen(): void {
    const root = this.root;
    const panel = this.q('.panel');
    const tuckPanel = (tucked: boolean, remember = true): void => {
      panel.classList.toggle('tucked', tucked && !narrow());
      this.q('.close').setAttribute('aria-expanded', String(!tucked));
      if (remember && !narrow()) prefs.set('panelTucked', tucked);
      this.on.measured();
    };
    tuckPanel(prefs.get('panelTucked'), false);
    this.untuck = () => {
      if (narrow()) return;
      tuckPanel(false);
    };
    root.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) =>
      b.addEventListener('click', () => {
        const same = b.getAttribute('aria-selected') === 'true';
        tuckPanel(false);
        this.tab(b.dataset.tab as Tab);
        // (on a phone the open tab pressed again puts the sheet away, as its handle does)
        if (narrow()) this.sheet?.set(same && panel.classList.contains('open') ? 0 : this.sheet.stop || 1);
      }),
    );
    this.q('.close').addEventListener('click', () => tuckPanel(!panel.classList.contains('tucked')));
    this.q('.tabs').addEventListener('keydown', (e) => {
      const key = (e as KeyboardEvent).key;
      if (key !== 'ArrowRight' && key !== 'ArrowLeft') return;
      const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-tab]')].filter((t) => t.offsetParent !== null);
      const at = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
      const next = tabs[(at + (key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]!;
      this.tab(next.dataset.tab as Tab);
      next.focus();
    });
    // on a phone the panel is a sheet a finger moves between its stops (sheet.ts), and its handle's button works them
    let grip: { shown(): void } | null = null;
    this.sheet = sheet(panel, () => {
      grip?.shown();
      window.setTimeout(() => this.on.measured(), 320);
    });
    grip = handle(this.q('.handle-open'), panel, this.sheet);
    // the control block is the sheet's View pane while the page is narrow, and under the row while it is wide
    const slot = (name: string): HTMLElement => this.q(`[data-slot=${name}]`);
    dock(
      [
        [this.q('.lu-strip'), slot('strip')],
        [this.q('.views'), slot('views')],
        [this.q('.shows'), slot('show')],
        [this.q('.controls .scale'), slot('scale')],
      ],
      (on) => {
        const at = root.querySelector<HTMLElement>('[data-tab][aria-selected=true]')?.dataset.tab as Tab | undefined;
        this.tab(!on && at === 'View' ? 'Vehicle' : (at ?? (on ? 'View' : 'Vehicle')));
        if (!on) panel.classList.remove('open', 'full');
        tuckPanel(prefs.get('panelTucked'), false);
      },
    );
    hintOnce(this.q('.notes'), 'The bar at the foot', 'Tap or pull it up: the card, the programmes, the timeline');

    const title = this.q('.title');
    const tuckTitle = (tucked: boolean): void => {
      title.classList.toggle('tucked', tucked);
      this.q('.tuck').setAttribute('aria-expanded', String(!tucked));
      prefs.set('titleTucked', tucked);
      this.on.measured();
    };
    tuckTitle(prefs.get('titleTucked'));
    this.q('.tuck').addEventListener('click', () => tuckTitle(!title.classList.contains('tucked')));
    root.classList.toggle('bare', prefs.get('bare'));
    this.showKeys(prefs.get('legendOpen'));
    this.q('.legend-toggle').addEventListener('click', () => this.showKeys(this.q('.legend-keys').classList.contains('folded')));

    // one listener for everything that is pressed: each control says what it is by an attribute
    root.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const b = target.closest<HTMLElement>('button, [data-home]');
      if (!b || b.closest('.loading')) return;
      const data = b.dataset;
      if (b.hasAttribute('data-home')) this.on.home();
      else if (data.row) this.on.row(data.row as LineupRow);
      else if (b.hasAttribute('data-alone')) this.on.row(this.view.row === 'spacecraft' ? 'vehicles' : 'spacecraft');
      else if (data.step) this.on.step(Number(data.step));
      else if (b.hasAttribute('data-whole')) this.on.whole();
      else if (data.gallery) this.on.gallery(data.gallery);
      else if (b.hasAttribute('data-pick')) this.on.pick(!this.view.picking);
      else if (data.drop) this.on.drop(data.drop);
      else if (data.person !== undefined) {
        this.openPerson = this.openPerson === data.person ? null : data.person;
        this.fill();
      } else if (data.section !== undefined) {
        // (a programme asked for anywhere opens its words in the Programmes tab; asked for again there, back to the whole row)
        const again = this.view.section === data.section && Boolean(b.closest('[data-pane=Programmes]'));
        this.on.section(again ? null : data.section);
        if (!again && !b.closest('[data-pane=Programmes]')) this.open('Programmes');
      } else if (data.moment !== undefined) this.toMoment(Number(data.moment));
      else if (data.tabTo) this.open(data.tabTo as Tab);
      else if (data.flight) {
        // (pressed again where it is listed, the one chosen is let go; its mark and its label only ever choose)
        const listed = Boolean(b.closest('[data-pane]'));
        this.on.choose(listed && !this.view.picking && this.view.chosen === data.flight && !b.closest('.lu-moments') ? null : data.flight);
      } else if (b.matches('.shows button')) {
        const on = b.getAttribute('aria-pressed') !== 'true';
        if (b.hasAttribute('data-measure')) this.on.scale(on);
        else if (b.hasAttribute('data-names')) this.setNames(on);
        else if (b.hasAttribute('data-light')) this.on.light(on);
        else if (b.hasAttribute('data-cel')) this.on.cel(on);
        else if (b.hasAttribute('data-lighter')) this.on.lighter(on);
      }
    });
    this.q('.loading button').addEventListener('click', () => this.on.retry());
    // a vehicle named anywhere on the page is marked in the picture while the pointer is on its name
    root.addEventListener('pointerover', (e) => {
      const id = (e.target as HTMLElement).closest<HTMLElement>('[data-flight]')?.dataset.flight ?? null;
      this.mark(id, false);
    });
    window.addEventListener('pointermove', (e) => {
      this.pointer = [e.clientX, e.clientY];
      this.placeTip();
    });
    // what the panels cover, measured whenever one of them changes size
    const watch = new ResizeObserver(() => this.on.measured());
    for (const el of [this.q('.controls'), this.q('.lu-top'), panel, title]) watch.observe(el);
    new ResizeObserver(() => this.sized()).observe(this.q('[data-pane=View]'));
    this.switches();
  }

  private untuck: () => void = () => {};

  private showKeys(open: boolean): void {
    this.q('.legend-keys').classList.toggle('folded', !open);
    this.q('.legend-toggle').setAttribute('aria-expanded', String(open));
    prefs.set('legendOpen', open);
  }

  /** ?: the keys, shown or put away. */
  toggleKeys(): void {
    this.showKeys(this.q('.legend-keys').classList.contains('folded'));
  }

  /** H: nothing between the visitor and the row, or the panels back. */
  toggleBare(): void {
    prefs.set('bare', this.root.classList.toggle('bare'));
    this.on.measured();
  }

  private setNames(on: boolean): void {
    this.names = on;
    prefs.set('lineupNamesOff', !on);
    this.switches();
    this.on.names(on);
  }

  /** The switches' lamps, as things stand. */
  switches(state: { scale?: boolean; light?: boolean; cel?: boolean } = {}): void {
    const set = (sel: string, on: boolean | undefined): void => {
      if (on !== undefined) this.q(sel).setAttribute('aria-pressed', String(on));
    };
    set('[data-measure]', state.scale);
    set('[data-light]', state.light);
    set('[data-cel]', state.cel);
    set('[data-names]', this.names);
    if (state.cel !== undefined) this.root.classList.toggle('cel', state.cel);
  }

  private tab(name: Tab): void {
    for (const b of this.root.querySelectorAll<HTMLElement>('[data-tab]')) b.setAttribute('aria-selected', String(b.dataset.tab === name));
    for (const s of this.root.querySelectorAll<HTMLElement>('.panel > [data-pane]')) s.hidden = s.dataset.pane !== name;
    this.q('.panel').classList.toggle('on-view', name === 'View');
    this.sized();
  }

  /** Bring a tab of the panel up, opening the panel (on a phone, raising the sheet) if it is away. */
  open(name: Tab): void {
    this.tab(name);
    this.untuck();
    if (narrow() && this.sheet && this.sheet.stop === 0) this.sheet.set(1);
  }

  /** How tall the sheet is with the View pane in it: as tall as what the pane holds, so the row keeps the rest. */
  private sized(): void {
    const tall = viewHeight(this.q('.panel'));
    if (!tall) return;
    this.q('.panel').style.setProperty('--sheet-view', `${tall}px`);
    document.querySelector<HTMLElement>('#stage')?.style.setProperty('--sheet-view', `${tall}px`);
  }

  /** Go to a moment of the timeline, in words. */
  private toMoment(i: number): void {
    this.open('Timeline');
    const row = this.q(`[data-pane=Timeline] [data-at="${i}"]`);
    row?.scrollIntoView({ block: 'center' });
    row?.classList.remove('lit');
    void row?.offsetWidth;
    row?.classList.add('lit');
  }

  // ------------------------------------------------------------------------------------------------ shown

  /** How tall each stands in the row on show, as the picture measured it. */
  measuredHeights(heights: { id: string; height: number; parted: boolean }[]): void {
    this.heights = new Map(
      heights.map(({ id, height, parted }) => [id, { height, parted, spec: heightSpec(this.entry(id)!.flight, height) }] as const),
    );
    for (const [id, label] of this.labels) {
      const h = this.heights.get(id);
      // (the flight's own figure where it gives one that matches what stands there, with its confidence; else as modelled)
      label.querySelector('span')!.innerHTML = h
        ? `${h.spec ? dot(h.spec.confidence) : ''}${(h.spec?.value ?? h.height).toFixed(2)} m`
        : '';
    }
    this.fill();
  }

  /** Show the page as `view` has it. */
  render(view: LineupView): void {
    const was = this.view;
    this.view = view;
    if (was.chosen !== view.chosen) this.openPerson = null;
    for (const b of this.root.querySelectorAll<HTMLElement>('[data-row]'))
      b.setAttribute('aria-pressed', String(b.dataset.row === view.row));
    this.q('[data-alone]').setAttribute('aria-pressed', String(view.row === 'spacecraft'));
    this.root.classList.toggle('picking', view.picking);
    for (const b of this.root.querySelectorAll<HTMLElement>('.lu-strip [data-flight], .lu-label')) {
      const id = b.dataset.flight!;
      b.classList.toggle('chosen', id === view.chosen || view.compared.includes(id));
    }
    for (const b of this.root.querySelectorAll<HTMLElement>('.lu-lane-name[data-section], .lu-key [data-section]'))
      b.setAttribute('aria-pressed', String(b.dataset.section === view.section));
    const section = this.data.sections.find((s) => s.id === view.section);
    const head = this.q('.lu-section');
    head.hidden = !section;
    if (section) {
      head.style.setProperty('--tint', css(section.tint));
      head.innerHTML = `<b>${esc(section.name)}</b><span>${esc(section.nation)} · ${esc(section.years)}</span>`;
    }
    const standing = this.standing;
    const what = view.row === 'spacecraft' ? 'spacecraft' : 'vehicles';
    const of =
      standing.length === this.data.entries.length
        ? `${standing.length} ${what}`
        : `${standing.length} of ${this.data.entries.length} ${what}`;
    this.q('.controls .scale, [data-slot=scale] .scale').textContent =
      `${of} · one scale · in the order they flew${view.row === 'spacecraft' ? ' · without their launch vehicles' : ''}`;
    this.fill();
    // (a choice brings its card up, on a wide page; on a phone the handle names it and the sheet stays where it was put)
    if (view.chosen && view.chosen !== was.chosen && !narrow()) this.open('Vehicle');
    if (view.compared.length > 1 && was.compared.length < 2 && !narrow()) this.open('Vehicle');
  }

  /** Write the panes and the handle for the page as it stands. */
  private fill(): void {
    const { view } = this;
    const chosen = this.entry(view.chosen);
    const standing = this.standing;
    this.q('[data-pane=Vehicle]').innerHTML =
      view.compared.length > 1 ? this.comparison(standing) : chosen ? this.card(chosen) : this.list(standing);
    this.q('[data-pane=Programmes]').innerHTML = this.programmes();
    this.q('[data-pane=Timeline]').innerHTML = this.moments();
    // the handle: the one chosen (or what stands there), and where it is in the row
    const open = this.q('.handle-open');
    const at = chosen ? standing.indexOf(chosen) : -1;
    const section = this.data.sections.find((s) => s.id === view.section);
    open.querySelector('b')!.textContent =
      view.compared.length > 1 ? `${standing.length} side by side` : chosen ? chosen.flight.callsign : (section?.name ?? 'The Lineup');
    open.querySelector('span')!.textContent =
      view.compared.length > 1
        ? standing.map((e) => e.flight.callsign).join(' · ')
        : chosen
          ? `${chosen.flight.designation} · ${shortDay(chosen.flight.launch)}`
          : `${standing.length} ${view.row === 'spacecraft' ? 'spacecraft' : 'vehicles'}, to scale`;
    open.querySelector('output')!.textContent =
      at >= 0 ? `${String(at + 1).padStart(2, '0')}/${String(standing.length).padStart(2, '0')}` : '';
  }

  private conf(c: Confidence | null): string {
    return c ? dot(c) : '';
  }

  /** How tall it stands in the row, as a row of the figures: the flight's own figure where it gives one to match, with its confidence; else as modelled. */
  private stands(e: Entry): { text: string; says: string; dot: string } | null {
    const h = this.heights.get(e.flight.id);
    if (!h) return null;
    return h.spec
      ? { text: figureText(h.spec.value, 'm'), says: h.spec.label, dot: dot(h.spec.confidence) }
      : { text: `${h.height.toFixed(2)} m`, says: 'as modelled', dot: '' };
  }

  /** The row as a list, to choose from. */
  private list(standing: Entry[]): string {
    const section = this.data.sections.find((s) => s.id === this.view.section);
    const all = this.data.entries;
    return `
      ${
        section
          ? `<div class="lu-head" style="--tint: ${css(section.tint)}"><p class="lu-eyebrow"><i></i>${esc(section.nation)} <b>·</b> ${esc(section.years)}</p><h2 class="lu-big">${esc(section.name)}</h2>
             <p class="lu-actions"><button data-tab-to="Programmes">Read about it</button><button data-whole>Whole row</button></p></div>`
          : `<p class="fine lu-hint">${this.view.picking ? 'Choose the one to stand beside it.' : 'Choose a vehicle: here, on the timeline, or in the row itself.'}</p>`
      }
      <ol class="parts lu-list">${standing
        .map(
          (e) => `
        <li><button data-flight="${esc(e.flight.id)}" style="--tint: ${css(e.tint)}">
          <span class="n">${String(all.indexOf(e) + 1).padStart(2, '0')}</span>
          <span class="name"><i class="lu-chip"></i>${esc(e.flight.callsign)}</span>
          <span class="what">${esc(e.flight.designation)} <b>·</b> ${day(e.flight.launch)}</span>
          <span class="what lu-line">${esc(e.headline)}</span>
        </button></li>`,
        )
        .join('')}</ol>`;
  }

  private figureRow(f: Figure): string {
    // (the flight's own words for what it measured, where they say more than the card's name for it)
    const own = f.label.toLowerCase() === f.name.toLowerCase() ? '' : `<small>${esc(f.label)}</small>`;
    return `<tr><th>${dot(f.confidence)}${esc(f.name)}${own}</th><td>${esc(figureText(f.value, f.unit))}</td></tr>`;
  }

  /** The card of the one chosen. */
  private card(e: Entry): string {
    const f = e.flight;
    const section = this.data.sections[e.programme]!;
    const all = this.data.entries;
    const crew = crewOf(f, this.data.people);
    const figures = keyFigures(f);
    // (how tall it stands here is said where it is not one of the figures already: as modelled, or the spacecraft alone)
    const height = this.heights.get(f.id);
    const stands =
      height?.spec && figures.some((x) => x.label === height.spec!.label && x.value === height.spec!.value) ? null : this.stands(e);
    const lived = (p: Person): string => (p.died ? `${yearOf(p.born)} to ${yearOf(p.died)}` : `born ${yearOf(p.born)}`);
    const story = e.story?.story ? paras(e.story.story) : `<p>${esc(f.summary)}</p>`;
    return `
      <article class="lu-card" style="--tint: ${css(e.tint)}">
        <p class="lu-eyebrow"><i></i><button data-section="${esc(section.id)}" title="${esc(section.name)}: its section of the row, and its story">${esc(section.name)}</button> <b>·</b> ${esc(f.nation)} <b>·</b> ${String(all.indexOf(e) + 1).padStart(2, '0')} of ${all.length}</p>
        <h2 class="lu-big">${esc(f.callsign)}</h2>
        <p class="sub">${esc(f.designation)} <b>·</b> ${day(f.launch)}</p>
        <p class="lu-headline">${esc(e.headline)}</p>
        <div class="lu-story">${story}</div>
        ${e.firsts.length && e.story ? `<ul class="lu-firsts" aria-label="Firsts">${e.firsts.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        <p class="lu-actions">
          <button class="lu-go" data-gallery="${esc(f.id)}" title="Its gallery: turn it, take it apart, cut it open (O)">Open its gallery<i class="arrow"></i></button>
          <button data-pick class="switch" aria-pressed="${this.view.picking}" title="Choose another to stand beside it (X)">Compare</button>
        </p>
        ${
          e.story?.named
            ? `<h3>The name</h3><div class="lu-told">${paras(e.story.named.why)}<small>${dot(e.story.named.confidence)}${esc(e.story.named.source)}</small></div>`
            : ''
        }
        <h3>${crew.length > 1 ? 'Crew' : 'Pilot'}</h3>
        <ul class="lu-crew">${crew
          .map(({ name, person }) =>
            person
              ? `<li><button data-person="${esc(person.id)}" aria-expanded="${this.openPerson === person.id}"><span class="name">${esc(name)}${person.native ? `<em lang="ru">${esc(person.native)}</em>` : ''}</span><span class="what">${esc(lived(person))}</span><i class="chevron"></i></button>
                 <div class="lu-told">${paras(person.bio)}${this.flown(person, f.id)}<small>${dot(person.confidence)}${esc(person.source)}</small></div></li>`
              : `<li><p><span class="name">${esc(name)}</span></p></li>`,
          )
          .join('')}</ul>
        <h3>Key figures</h3>
        <table>
          ${stands ? `<tr><th>${stands.dot}Stands here<small>${esc(stands.says)}</small></th><td>${esc(stands.text)}</td></tr>` : ''}
          ${figures.map((x) => this.figureRow(x)).join('')}
        </table>
        ${legend}
        ${
          f.facts.length
            ? `<h3>The flight in figures</h3><dl class="facts">${f.facts.map((x) => `<div><dt>${esc(x.label)}</dt><dd>${esc(x.value)}</dd></div>`).join('')}</dl>`
            : ''
        }
        <h3>The hardware</h3>
        <dl class="facts lu-wide"><div><dt>Spacecraft</dt><dd>${esc(f.spacecraft)}</dd></div><div><dt>Launch vehicle</dt><dd>${esc(f.launchVehicle)}</dd></div><div><dt>Launched from</dt><dd>${esc(f.launchSite)}</dd></div></dl>
        ${e.story?.source ? `<p class="fine lu-source">${esc(e.story.source)}</p>` : ''}
      </article>`;
  }

  /** The other flights somebody flew, as the history lists them: each that stands in the row is a way to it. */
  private flown(person: Person, here: string): string {
    const others = person.flights.filter((id) => id !== here);
    if (!others.length) return '';
    const link = (id: string): string => {
      const e = this.entry(id);
      return e ? `<button data-flight="${esc(id)}">${esc(e.flight.callsign)}</button>` : '';
    };
    const built = others.map(link).filter(Boolean);
    return built.length ? `<p class="lu-also">Also flew ${built.join(' ')}</p>` : '';
  }

  /** Those standing together, their figures side by side. */
  private comparison(standing: Entry[]): string {
    const rows = standing.map((e) => ({ e, figures: keyFigures(e.flight), stands: this.stands(e) }));
    // (how tall each stands here is a row of its own unless it is, for every one of them, the height its flight gives already)
    const said = rows.every(({ e, figures }) => {
      const spec = this.heights.get(e.flight.id)?.spec;
      return spec && figures.some((x) => x.slot === 'height' && x.label === spec.label && x.value === spec.value);
    });
    const cell = (html: string): string => `<td>${html}</td>`;
    const slots = SLOTS.filter(([slot]) => rows.some((r) => r.figures.some((x) => x.slot === slot)));
    return `
      <div class="lu-compare">
        <p class="lu-actions"><button data-pick class="switch" aria-pressed="${this.view.picking}" title="Choose another to stand with them (X)">Add another</button><button data-whole title="Back to the whole row (Esc)">Whole row</button></p>
        <div class="lu-scroll"><table>
          <thead><tr><th></th>${rows
            .map(
              ({ e }) =>
                `<th style="--tint: ${css(e.tint)}"><i class="lu-chip"></i><button data-flight="${esc(e.flight.id)}" title="Read it">${esc(e.flight.callsign)}</button><small>${esc(e.flight.designation)}</small>
                 <button class="lu-drop" data-drop="${esc(e.flight.id)}" title="Leave it out" aria-label="Leave ${esc(e.flight.callsign)} out">×</button></th>`,
            )
            .join('')}</tr></thead>
          <tbody>
            <tr><th>Launched</th>${rows.map(({ e }) => cell(esc(shortDay(e.flight.launch)))).join('')}</tr>
            <tr><th>Crew</th>${rows.map(({ e }) => cell(`${e.flight.crew.length}<small>${esc(e.flight.crew.map(surnameOf).join(', '))}</small>`)).join('')}</tr>
            ${said ? '' : `<tr><th>Stands here</th>${rows.map(({ stands }) => cell(stands ? `${stands.dot}${esc(stands.text)}<small>${esc(stands.says)}</small>` : '')).join('')}</tr>`}
            ${slots
              .map(
                ([slot, name]) =>
                  `<tr><th>${esc(name)}</th>${rows
                    .map(({ figures }) => {
                      const x = figures.find((y) => y.slot === slot);
                      const own = x && x.label.toLowerCase() !== name.toLowerCase() ? `<small>${esc(x.label)}</small>` : '';
                      return cell(x ? `${dot(x.confidence)}${esc(figureText(x.value, x.unit))}${own}` : '<small>not given</small>');
                    })
                    .join('')}</tr>`,
              )
              .join('')}
          </tbody>
        </table></div>
        ${legend}
        <p class="fine">Each figure is the flight’s own, under the flight’s own name for it: two in one row are not always measured the same way.</p>
      </div>`;
  }

  /** The programmes: each opens to why it was, how it was done and what it left, and forms its section of the row. */
  private programmes(): string {
    const { sections, entries } = this.data;
    return `<ol class="parts lu-programmes">${sections
      .map((s, i) => {
        const open = this.view.section === s.id;
        const told = s.told;
        return `
        <li style="--tint: ${css(s.tint)}"><button data-section="${esc(s.id)}" aria-expanded="${open}">
          <span class="n">${String(i + 1).padStart(2, '0')}</span>
          <span class="name"><i class="lu-chip"></i>${esc(s.name)}</span>
          <span class="what">${esc(s.nation)} <b>·</b> ${esc(s.years)} <b>·</b> ${s.flights.length} ${s.flights.length === 1 ? 'vehicle' : 'vehicles'} here</span>
        </button>
        <div class="lu-told lu-programme">
          ${
            told
              ? `<h4>Why</h4>${paras(told.why)}<h4>How</h4>${paras(told.how)}<h4>What it left</h4>${paras(told.legacy)}<small>${esc(told.source)}</small>`
              : '<p>Its story is not written here yet. Its vehicles are in the row:</p>'
          }
          <p class="lu-chips">${s.flights
            .map((id) => {
              const e = entries.find((x) => x.flight.id === id)!;
              return `<button data-flight="${esc(id)}">${esc(e.flight.callsign)}</button>`;
            })
            .join('')}</p>
          <p class="lu-actions"><button data-whole>Whole row</button></p>
        </div></li>`;
      })
      .join('')}</ol>`;
  }

  /** The timeline in words: every moment in the order they happened; one that is a vehicle of the row is a way to it. */
  private moments(): string {
    const { moments, entries } = this.data;
    const nationsOf = [...new Set([...entries.map((e) => e.flight.nation), ...moments.map((m) => m.nation)])];
    return `<ol class="lu-moments">${moments
      .map((m, i) => {
        const e = m.built ? this.entry(m.flight) : null;
        const tint = e ? e.tint : tintOf(nationsOf.indexOf(m.nation), 0);
        const body = `
          <time datetime="${esc(m.date)}">${esc(shortDay(m.date))}</time>
          <span class="name">${this.conf(m.confidence)}${esc(m.title)}</span>
          ${e ? `<span class="what">${esc(e.flight.callsign)} <b>·</b> ${esc(e.flight.designation)}</span>` : `<span class="what">${esc(m.nation)}${m.flight ? ' <b>·</b> not built here yet' : ''}</span>`}
          ${m.text ? `<span class="lu-text">${paras(m.text)}${m.source ? `<small>${esc(m.source)}</small>` : ''}</span>` : ''}`;
        const chosen = Boolean(e && e.flight.id === this.view.chosen);
        return `<li data-at="${i}" style="--tint: ${css(tint)}" class="${chosen ? 'chosen' : ''}">${e ? `<button data-flight="${esc(e.flight.id)}">${body}</button>` : `<div>${body}</div>`}</li>`;
      })
      .join('')}</ol>${this.data.moments.some((m) => m.confidence) ? legend : ''}`;
  }

  // ------------------------------------------------------------------------------ written on the picture

  /** Say something in the notes for a moment. */
  say(title: string, line: string): void {
    sayIn(this.q('.notes'), title, line);
  }

  setStats(text: string): void {
    this.q('.stats').textContent = text;
    document.documentElement.style.setProperty('--stats-h', `${this.q('.stats').offsetHeight}px`);
  }

  /** The pointer is on a vehicle in the picture (`tip`: say what it is beside the pointer), or on its name on the page. */
  mark(id: string | null, tip = true): void {
    if (id === this.hovered && tip) return;
    this.hovered = id;
    for (const b of this.root.querySelectorAll<HTMLElement>('.lu-strip [data-flight], .lu-label, .lu-list [data-flight]'))
      b.classList.toggle('hot', b.dataset.flight === id);
    const el = this.q('.tip');
    const e = tip ? this.entry(id) : null;
    el.hidden = !e;
    if (!e) return;
    el.querySelector('b')!.textContent = e.flight.callsign;
    el.querySelector('span')!.textContent = `${e.headline} · ${shortDay(e.flight.launch)}`;
    this.placeTip();
  }

  private placeTip(): void {
    const el = this.q('.tip');
    if (el.hidden) return;
    const [x, y] = this.pointer;
    const left = x + 24 + el.offsetWidth > innerWidth;
    el.classList.toggle('left', left);
    el.style.transform = `translate(${Math.round(left ? x - 24 - el.offsetWidth : x + 24)}px, ${Math.round(Math.min(innerHeight - el.offsetHeight - 8, Math.max(8, y - 14)))}px)`;
  }

  /**
   * What the panels leave clear of the picture, for the camera to frame in: beside the title card (the whole height
   * under the bar across the top) and under it (the whole width), each down to whatever lies across the foot. In CSS
   * pixels from the canvas's corner. Also notes what covers the picture, so that nothing is written under a panel.
   */
  clear(canvas: HTMLCanvasElement): { beside: Rect; under: Rect } {
    const view = canvas.getBoundingClientRect();
    const bare = this.root.classList.contains('bare');
    const shown = (el: HTMLElement): boolean => el.offsetParent !== null && !bare;
    const [title, panel, controls, top] = ['.title', '.panel', '.controls', '.lu-top .models'].map((s) => this.q(s)) as [
      HTMLElement,
      HTMLElement,
      HTMLElement,
      HTMLElement,
    ];
    this.root.style.setProperty('--controls-h', `${controls.offsetHeight}px`);
    const rects = [title, panel, controls, top].filter(shown).map((el) => el.getBoundingClientRect());
    // (the legend and the diagnostics line cover a corner of it too: nothing is written under them, though a view is framed past them)
    const corner = ['.legend-keys', '.stats']
      .map((s) => this.q(s))
      .filter(shown)
      .map((el) => el.getBoundingClientRect());
    this.covered = [...rects, ...corner].map((r) => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom }));
    const middle = view.left + view.width / 2;
    let [left, right, head, foot] = [view.left, view.right, view.top, view.bottom];
    let [cardRight, cardBottom] = [view.left, view.top];
    if (narrow()) {
      // the top line lies across the head, and the sheet's handle across the foot (the sheet itself is under the canvas)
      if (shown(title)) head = Math.max(head, title.getBoundingClientRect().bottom);
      if (shown(panel)) {
        const p = panel.getBoundingClientRect();
        if (p.left > middle) right = Math.min(right, p.left);
        else foot = Math.min(foot, p.top);
      }
    } else {
      if (shown(panel)) {
        const p = panel.getBoundingClientRect();
        // (open, it stands down the side; tucked, it is a row of tabs in the corner, which lies across the head)
        if (p.height > view.height / 2) right = Math.min(right, p.left);
        else head = Math.max(head, p.bottom);
      }
      if (shown(controls)) foot = Math.min(foot, controls.getBoundingClientRect().top);
      if (shown(top)) head = Math.max(head, top.getBoundingClientRect().bottom);
      if (shown(title)) {
        const t = title.getBoundingClientRect();
        [cardRight, cardBottom] = [t.right, t.bottom];
      }
    }
    const air = narrow() ? 6 : 14;
    // (room under the row's feet for what is written there: each one's name and height)
    if (this.names && !bare) foot -= narrow() ? 40 : 46;
    const rect = (l: number, t: number): Rect => ({
      left: l - view.left + air,
      top: t - view.top + air,
      right: Math.max(l - view.left + air + 40, right - view.left - air),
      bottom: Math.max(t - view.top + air + 40, foot - view.top - air),
    });
    return { beside: rect(Math.max(left, cardRight), head), under: rect(left, Math.max(head, cardBottom)) };
  }

  /**
   * Put what is written on the picture where the picture has it: each vehicle's name under its foot, a figure where
   * each ruled height crosses the picture's edge, a programme's name over its section. Nothing is written under a
   * panel or on something else already written: the one chosen is placed first, then the one under the pointer, then
   * the rest from the middle outward, and what has no room is left out until there is some.
   */
  place(picture: Picture): void {
    const view = picture.canvas.getBoundingClientRect();
    const frame: Rect = { left: view.left, top: view.top, right: view.right, bottom: view.bottom };
    const taken: Rect[] = [...this.covered];
    const fits = (box: Rect): boolean =>
      box.left >= frame.left &&
      box.right <= frame.right &&
      box.top >= frame.top &&
      box.bottom <= frame.bottom &&
      !taken.some((t) => overlap(box, t, 4));
    const put = (el: HTMLElement, box: Rect | null): void => {
      const on = Boolean(box && fits(box));
      el.classList.toggle('on', on);
      if (!on || !box) return;
      taken.push(box);
      el.style.transform = `translate(${Math.round(box.left)}px, ${Math.round(box.top)}px)`;
    };
    // the programme on show, over its section
    const head = this.q('.lu-section');
    if (!head.hidden) {
      const crown = picture.crown();
      const [w, h] = [head.offsetWidth, head.offsetHeight];
      put(head, crown && { left: crown.x - w / 2, top: crown.y - h - 26, right: crown.x + w / 2, bottom: crown.y - 26 });
    }
    // the names: under each one's foot
    const middle = (frame.left + frame.right) / 2;
    const feet = this.standing
      .map((e) => ({ id: e.flight.id, at: picture.footOf(e.flight.id) }))
      .sort((a, b) => {
        const rank = (x: typeof a): number =>
          x.id === this.view.chosen ? -2e6 : x.id === this.hovered ? -1e6 : Math.abs((x.at?.x ?? 1e9) - middle);
        return rank(a) - rank(b);
      });
    const placed = new Set<string>();
    for (const { id, at } of feet) {
      const label = this.labels.get(id)!;
      placed.add(id);
      if (!this.names || !at) {
        label.classList.remove('on');
        continue;
      }
      const [w, h] = [label.offsetWidth, label.offsetHeight];
      put(label, { left: at.x - w / 2, top: at.y + 10, right: at.x + w / 2, bottom: at.y + 10 + h });
    }
    for (const [id, label] of this.labels) if (!placed.has(id)) label.classList.remove('on');
    // the heights: a figure where each ruled line that carries one crosses the picture's left edge (or, past the title card, the edge of what is clear)
    const marks = picture.marks();
    const host = this.q('.lu-marks');
    while (this.figures.length < marks.length) {
      const el = document.createElement('p');
      el.className = 'lu-height';
      host.append(el);
      this.figures.push(el);
    }
    this.figures.forEach((el, i) => {
      const y = marks[i];
      if (y === undefined) return void el.classList.remove('on');
      const text = `${y} m`;
      if (el.textContent !== text) el.textContent = text;
      const [w, h] = [el.offsetWidth, el.offsetHeight];
      // at the end of its line, before the row's first vehicle; with that end out of the picture, on the line at the
      // picture's edge (or past whatever covers that edge)
      const start = picture.markStart(y);
      const boxes: Rect[] = start
        ? [
            { left: start.x - w - 6, top: start.y - h / 2, right: start.x - 6, bottom: start.y + h / 2 },
            { left: start.x + 2, top: start.y - h - 2, right: start.x + 2 + w, bottom: start.y - 2 },
          ]
        : [];
      for (const x of [frame.left + 10, ...this.covered.filter((c) => c.left <= frame.left + 40).map((c) => c.right + 10)]) {
        const at = picture.markAt(y, x);
        if (at !== null) boxes.push({ left: x, top: at - h - 2, right: x + w, bottom: at - 2 });
      }
      const box = boxes.find(fits);
      if (box) put(el, box);
      else el.classList.remove('on');
    });
  }
}

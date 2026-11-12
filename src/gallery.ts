import './gallery.css';
import type { Vector3 } from 'three';
import {
  exhibit,
  galleryAt,
  galleryFlight,
  lacks,
  PLACE_NAME,
  PLACES,
  type Place,
  type Plinth,
  plinths,
  plinthViews,
  scaleFigure,
  WHOLE_VIEW,
} from './address';
import { Callout } from './callout';
import { CURTAIN, Curtain, follow } from './curtain';
import { type Shot, tour } from './demo';
import { dock, handle, hintOnce, narrow, viewHeight } from './fold';
import { prefs } from './prefs';
import { type Sheet, sheet } from './sheet';
import './slider';
import type { Flight, ModelDef, Part, Spec } from './types';
import { dot, esc, legend, si } from './ui';
import { type Anchor, cleared, covers, type Frame, Labels, layOut } from './viewer/labels';
import { Stage } from './viewer/stage';
import { asStudio, type Studio } from './viewer/studio';
import { chooseTier, tier } from './viewer/tier';

/**
 * The gallery: a flight's vehicle and nothing else, on a plain floor under designed light
 * (viewer/studio.ts), to be turned, taken apart, cut open and read. It is the first of a flight's
 * places (src/address.ts): the one every flight opens in, and the only one it has until its
 * launch site is built.
 *
 * It is a second stage, on a canvas of its own, given the flight with everything but its vehicle
 * left out (`galleryFlight`). So nothing it does can reach the site: the vehicle on the pad, the
 * clock, a figure walked somewhere, a flight in the air are another stage's, asleep while this one
 * is up (`Stage.sleep`) and exactly as they were when it wakes. What is remembered between the two
 * is only what is remembered between visits (prefs.ts): the look, the turntable, the panels.
 *
 * Everything it shows comes from what a vehicle already declares: its parts and their headings
 * (what can stand there alone), its views, its slider, its cutaway, the flight's specs and motors.
 */
export interface GalleryHost {
  /** The switch was put to another place (one the flight has). */
  go(place: Place): void;
  /** The crumb back to the front page. */
  home(): void;
  /** What is on show has changed: the part or the choice of what stands there, '' for neither. The host writes the address. */
  address(what: string): void;
  /** Something lies over the gallery (the front page) and it is only a picture behind it. */
  covered(): boolean;
}

const PLACE_SAYS: Record<Place, string> = {
  gallery: 'The vehicle alone: turn it, take it apart, read it',
  site: 'Where it flew from: the pad, the place, the crew',
  fly: 'The flight deck: fly it yourself, or watch the flight as it was flown',
};

/**
 * The places as a switch: the same three, in the same order, in the same spot, for every flight
 * and in every place. One the flight does not have yet is there all the same, dimmed, and says why
 * when it is pointed at or pressed. `go` is told a place the flight has that is not this one.
 */
export function placesNav(flight: Flight, here: Place, go: (to: Place) => void): HTMLElement {
  const nav = document.createElement('nav');
  nav.className = 'places';
  nav.setAttribute('aria-label', 'Places');
  const button = (place: Place): string => {
    const why = lacks(flight, place);
    // ("site" alone where there is no room for more: beside "gallery" and "fly" it can be nothing else)
    const label = place === 'site' ? '<i>Launch </i>site' : PLACE_NAME[place];
    // (on a phone's menu a line under each name says what it is, or why it is not there yet, without the name again: gallery.css)
    const short = why ? why.replace(/^[^:]*:\s*/, '') : PLACE_SAYS[place].replace(/:.*/, '');
    const absent = why ? ` aria-disabled="true" data-why="${esc(why)}"` : '';
    return `<button data-place="${place}" aria-pressed="${place === here}"${absent} data-short="${esc(short.charAt(0).toUpperCase() + short.slice(1))}" title="${esc(why ?? PLACE_SAYS[place])}">${label}</button>`;
  };
  // (and, for a page with no room for a title card or crumbs, the way out to the front page: gallery.css shows it there)
  const out = '<button class="places-home" data-home title="Front page">Flights</button>';
  // (on a phone the switch is one control that says where you are, and opens to the three: fold.ts)
  const now = `<button class="places-now" aria-haspopup="true" aria-expanded="false" title="The places of this flight: ${PLACES.map((p) => PLACE_NAME[p]).join(', ')}"><span>${shortName(here)}</span><i class="chevron"></i></button>`;
  nav.innerHTML = `${now}${out}${PLACES.map(button).join('')}<p role="status" hidden></p>`;
  const says = nav.querySelector('p')!;
  const toggle = nav.querySelector<HTMLElement>('.places-now')!;
  const unfold = (open: boolean): void => {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => unfold(!nav.classList.contains('open')));
  // (open, it shuts on a press anywhere else: it is a menu)
  window.addEventListener('pointerdown', (e) => nav.classList.contains('open') && !nav.contains(e.target as Node) && unfold(false), true);
  let away = 0;
  nav.addEventListener('click', (e) => {
    const to = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-place]');
    if (!to) return;
    if (!to.dataset.why) unfold(false);
    // a place that is not built says so where it was asked for, for a few seconds
    says.hidden = !to.dataset.why;
    says.textContent = to.dataset.why ?? '';
    clearTimeout(away);
    if (to.dataset.why) away = window.setTimeout(() => (says.hidden = true), 4000);
    else if (to.getAttribute('aria-pressed') !== 'true') go(to.dataset.place as Place);
  });
  return nav;
}

/** A place's name, with what may go where there is no room for it ("Launch site" is "site" beside "gallery" and "fly"). */
const shortName = (place: Place): string => (place === 'site' ? '<i>Launch </i>site' : PLACE_NAME[place]);

/** Mark which place a switch is in (the site's shows the launch site or the flight deck). */
export function markPlace(nav: Element | null, here: Place): void {
  for (const b of nav?.querySelectorAll<HTMLElement>('[data-place]') ?? [])
    b.setAttribute('aria-pressed', String(b.dataset.place === here));
  const now = nav?.querySelector('.places-now span');
  if (now) now.innerHTML = shortName(here);
}

/** The way back, as the title card's crumbs say it: the front page, the flight (its gallery), the place. */
export const crumbs = (flight: Flight, here: Place): string =>
  `<button data-home title="Front page">Space Race</button> <b>/</b> ${
    here === 'gallery'
      ? esc(flight.callsign)
      : `<button data-flight-home title="${esc(flight.callsign)}: its gallery">${esc(flight.callsign)}</button>`
  } <b>/</b> <span>${PLACE_NAME[here]}</span>`;

/** (View is the control block, which on a phone lives in the sheet: fold.ts) */
const TABS = ['View', 'Parts', 'Specs', 'Motors'] as const;
/** The keys that are the camera's (viewer/camera/input.ts): they go on to it. Every other key is the gallery's, or nobody's while it is up. */
const CAMERA_KEYS = new Set([
  'w',
  'a',
  's',
  'd',
  'q',
  'e',
  'r',
  'f',
  '+',
  '=',
  '-',
  'arrowup',
  'arrowdown',
  'arrowleft',
  'arrowright',
  '0',
]);
/** Seconds without a touch before the gallery shows itself, the first time and after it has been stopped. */
const IDLE_FIRST = 40;
const IDLE_AGAIN = 150;
/** Seconds on each thing in the show, and to take the vehicle apart or put it together. */
const DWELL: Record<Shot['kind'], number> = { whole: 8, apart: 8, part: 8.5, window: 8 };
const APART = 5;
/** More views than this are folded behind one button. */
const MANY_VIEWS = 5;
/** Milliseconds its canvas takes to fade in over the site's, or out (gallery.css has the same). */
const FADE = 450;
const TURN = 0.5;
const ease = (x: number): number => x * x * (3 - 2 * x);

export class Gallery {
  private readonly root: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly flight: Flight;
  private readonly host: GalleryHost;
  /** The vehicle as the flight has it, and as the stage is given it (alone, in the studio). */
  private readonly vehicle: ModelDef;
  private readonly staged: Flight;
  private readonly model: ModelDef;
  private readonly choices: Plinth[];
  private plinth: Plinth;
  private made: { stage: Stage; studio: Studio } | null = null;
  /** The stage, from the first time it is wanted: made once, whether or not what it was to load arrived. */
  private own: Stage | null = null;
  private loading: Promise<void> | null = null;
  private ready = false;
  private open = false;
  /** What was last asked to be shown while the vehicle was still on its way: gone to when it has arrived. */
  private wanted: string | null = null;
  private selected: string | null = null;
  private hovered: string | null = null;
  /** True while the cutaway is open only because an inside part was chosen. */
  private autoCut = false;
  private cut = false;
  /** Where the slider is, 0 to 1 of what stands there coming apart. */
  private apart = 0;
  /** The turntable was switched off by hand: otherwise it is only ever paused, and the next choice restarts it. */
  private stopped = prefs.get('orbitOff');
  private readonly labels: Labels;
  private readonly callout: Callout;
  private clear: Frame = { left: 0, right: 0, top: 0, bottom: 0 };
  private pointer: [number, number] = [0, 0];
  private frame = 0;
  private last = performance.now();
  /** The show: which shot it is on (-1: not running), how long it has left, how long since anyone touched the page. */
  private shots: Shot[] = [];
  private shot = -1;
  private left = 0;
  private idle = 0;
  private wait = IDLE_FIRST;
  private count = 0;
  private apartGoal = 0;
  private settling = 0;

  constructor(parent: HTMLElement, flight: Flight, host: GalleryHost) {
    this.flight = flight;
    this.host = host;
    this.vehicle = exhibit(flight)!;
    this.staged = galleryFlight(flight);
    this.model = this.staged.models[0]!;
    this.choices = plinths(this.vehicle);
    this.plinth = this.choices[0]!;
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'gallery-stage';
    this.root = document.createElement('div');
    this.root.id = 'gallery';
    this.root.hidden = true;
    parent.append(this.canvas, this.root);
    this.build();
    this.labels = new Labels(this.root, {
      choose: (node) => this.select(this.selected === node ? null : node),
      hover: (node) => this.hover(node, false),
    });
    this.callout = new Callout(document.body);
    this.listen();
  }

  /** It is the place on show. */
  get active(): boolean {
    return this.open;
  }

  /** Its own stage, once it has been opened: for the debug handle and for tests. */
  get stage(): Stage | null {
    return this.made?.stage ?? null;
  }

  /** The show is running. */
  get touring(): boolean {
    return this.shot >= 0;
  }

  /**
   * Come in: the gallery takes the page, with `what` on show (a part's node, or one of the choices
   * of what stands there; '' for the whole of it), or left out, as it was left. The first time,
   * the vehicle is fetched.
   */
  async enter(what?: string): Promise<void> {
    this.endShow(); // (coming in is taking over, if it was showing itself behind the front page)
    this.open = true;
    // its canvas fades in over the site's last frame, which is put away once it is covered
    this.root.hidden = false;
    this.canvas.classList.add('on');
    document.body.classList.add('in-gallery');
    clearTimeout(this.settling);
    this.settling = window.setTimeout(() => document.body.classList.add('gallery-settled'), FADE);
    this.setCel(prefs.get('cel'), false); // (it may have been changed at the site)
    this.stopped = prefs.get('orbitOff');
    this.idle = 0;
    this.made?.stage.sleep(false);
    if (!this.frame) this.frame = requestAnimationFrame(() => this.tick());
    if (!this.ready) {
      // (asked for while it loads, by this or by `go`: the last asked for is the one gone to, and trying again keeps it)
      if (what !== undefined) this.wanted = what;
      try {
        await (this.loading ??= this.load());
      } catch {
        this.loading = null; // (it has said so on the page, with a button to try again)
        return;
      }
      what = this.wanted ?? undefined;
      this.wanted = null;
    }
    if (this.open && what !== undefined) this.go(what, true);
  }

  /** What is on show, as an address names it: the part chosen, else what stands there, '' for the whole vehicle. */
  get at(): string {
    return this.selected ?? (this.plinth.nodes ? this.plinth.id : '');
  }

  /** Go out: it sleeps as it stands, and is as it was left when next come into. */
  leave(): void {
    if (!this.open) return;
    this.endShow();
    this.open = false;
    // (and fades out over the site, which is awake and drawn under it by then)
    this.root.hidden = true;
    this.canvas.classList.remove('on');
    clearTimeout(this.settling);
    document.body.classList.remove('in-gallery', 'gallery-settled');
    this.tip(null);
    this.made?.stage.sleep(true);
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  /** Show what an address names: a part (chosen, in the whole vehicle) or what stands there. */
  go(what: string, snap = false): void {
    if (!this.ready) return void (this.wanted = what); // (kept: `enter` goes there when the vehicle has arrived)
    const to = galleryAt(this.vehicle, what);
    const plinth = this.choices.find((p) => p.id === to.plinth.id)!;
    // (a part that is not on show now is shown in the whole vehicle; one that is, where it stands)
    const there = to.part && (!this.plinth.nodes || this.plinth.nodes.includes(to.part));
    if (!there && plinth !== this.plinth) this.stand(plinth, snap);
    if (to.part !== this.selected) this.select(to.part, snap);
  }

  private get studio(): Studio {
    return this.made!.studio;
  }

  private q<T extends HTMLElement = HTMLElement>(selector: string): T {
    return this.root.querySelector<T>(selector)!;
  }

  /** The parts that stand there now, in the vehicle's order. */
  private get parts(): Part[] {
    const { nodes } = this.plinth;
    return nodes ? this.vehicle.parts.filter((p) => nodes.includes(p.node)) : this.vehicle.parts;
  }

  /**
   * The stretch of the vehicle's slider over which what stands there comes apart. A vehicle's parts
   * leave in order over the whole slider; the booster alone would sit still for the first third
   * of it, so the gallery's slider is that stretch and no more.
   */
  private get stretch(): [number, number] {
    const orders = Math.max(0, ...this.vehicle.parts.map((p) => p.order));
    const starts = (p: Part) => (orders > 0 ? (p.order / orders) * 0.5 : 0);
    const moving = this.parts.filter((p) => p.explode.some((v) => v !== 0));
    if (!moving.length) return [0, 1];
    return [Math.min(...moving.map(starts)), Math.max(...moving.map((p) => starts(p) + 0.5))];
  }

  /** The vehicle's own slider reading for the gallery's. */
  private get reading(): number {
    const [from, to] = this.stretch;
    return this.apart <= 0 ? 0 : from + (to - from) * this.apart;
  }

  private build(): void {
    const f = this.flight;
    const m = this.vehicle;
    const date = new Date(f.launch).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    const specs = m.specGroups ? f.specs.filter((s) => m.specGroups!.includes(s.group)) : f.specs;
    const groups = [...new Set(specs.map((s) => s.group))];
    const tabs = TABS.filter((t) => t !== 'Motors' || f.motors.length);
    const pane = (name: string) => `data-pane="${name}" id="gallery-pane-${name}" role="tabpanel" aria-labelledby="gallery-tab-${name}"`;
    this.root.innerHTML = `
      <header class="title">
        <button class="tuck chevron" aria-label="Show or hide the summary" aria-expanded="true" title="Tuck away"></button>
        <p class="crumbs">${crumbs(f, 'gallery')}</p>
        <h1 data-home title="Front page">${esc(f.callsign)}</h1>
        <p class="sub">${esc(f.designation)}<span> <b>·</b> ${date}</span></p>
        <p class="lede">${esc(f.summary)}</p>
        ${
          f.facts.length
            ? `<button class="facts-toggle" aria-expanded="false" aria-controls="gallery-facts" title="The flight in figures: show or hide"><span>The flight in figures</span><i class="chevron"></i></button>
        <dl class="facts" id="gallery-facts">${f.facts.map((x) => `<div><dt>${esc(x.label)}</dt><dd>${esc(x.value)}</dd></div>`).join('')}</dl>`
            : ''
        }
      </header>

      <nav class="models" aria-label="What stands in the gallery">
        ${this.choices.map((p) => `<button data-plinth="${p.id}" aria-pressed="false">${esc(p.label)}</button>`).join('')}
      </nav>
      <button class="alone" hidden title="Show the whole of it again"><svg aria-hidden="true"></svg><b></b><span></span><i>${esc(this.choices[0]!.label)}</i><em class="x" aria-hidden="true"></em></button>

      <aside class="panel">
        <nav class="tabs" role="tablist">
          ${tabs.map((t) => `<button role="tab" id="gallery-tab-${t}" data-tab="${t}" aria-controls="gallery-pane-${t}">${t}</button>`).join('')}
          <button class="close chevron" aria-label="Show or hide the panel" aria-expanded="true" title="Tuck away"></button>
        </nav>
        <section ${pane('View')} hidden>
          <div class="slot" data-slot="apart"></div>
          <div class="slot row" data-slot="models"><h3 class="slot-name">Stands<br>there</h3></div>
          <div class="slot row buttons" data-slot="views"><h3 class="slot-name">Views</h3></div>
          <div class="slot buttons" data-slot="show"></div>
          <div class="slot" data-slot="scale"></div>
        </section>
        <section ${pane('Parts')}><ol class="parts"></ol></section>
        <section ${pane('Specs')} hidden>
          ${groups
            .map(
              (g) => `
            <div><h2>${esc(g)}</h2>
            <table>${specs
              .filter((s) => s.group === g)
              .map(
                (s) =>
                  `<tr><th>${dot(s.confidence)}${esc(s.label)}</th><td>${si(s.value, s.unit)}${s.note ? `<small>${esc(s.note)}</small>` : ''}</td></tr>`,
              )
              .join('')}
            </table></div>`,
            )
            .join('')}
          ${legend}
        </section>
        ${
          f.motors.length
            ? `<section ${pane('Motors')} hidden>
          <table>${f.motors
            .map(
              (x) => `
            <tr><th>${dot(x.confidence)}${x.count} × ${esc(x.name)}<small>${esc(x.propellant)}${x.note ? ` · ${esc(x.note)}` : ''}</small></th>
            <td>${si(x.thrustN, 'N')}${x.burnS ? `<small>${x.burnS} s burn</small>` : '<small>pulsed</small>'}</td></tr>`,
            )
            .join('')}
          </table>
          ${legend}
        </section>`
            : ''
        }
        <nav class="steps handle" aria-label="Part by part">
          <button data-step="-1" title="The part before (B)" aria-label="The part before"><i class="arrow back"></i><span>Previous</span></button>
          <button class="handle-open" aria-expanded="false" title="Views, taking it apart, the parts and the figures: open or put away"><b></b><span></span><output aria-live="off"></output><i class="chevron"></i></button>
          <button data-apart class="switch" aria-pressed="false" title="Take it apart, or put it together again">Apart</button>
          <button data-step="1" title="The next part (N)" aria-label="The next part"><span>Next part</span><i class="arrow"></i></button>
        </nav>
      </aside>

      <footer class="controls">
        <label class="explode"><span>${esc(m.slider?.[0] ?? 'Assembled')}</span>
          <input type="range" min="0" max="1" step="0.005" value="0" aria-label="${esc(m.slider ? `${m.slider[0]} to ${m.slider[1]}` : 'Take it apart')}" />
          <span>${esc(m.slider?.[1] ?? 'Exploded')}</span></label>
        <div class="buttons">
          <span class="set views" role="group" aria-label="View"></span>
          <span class="set shows" role="group" aria-label="Show">
            ${m.cutaway ? '<button data-cut class="switch" aria-pressed="false" title="Slice the skin open to what is inside (X)">Cutaway</button>' : ''}
            <button data-names class="switch" aria-pressed="false" title="Name each part as it comes clear of the rest">Labels</button>
            <button data-measure class="switch" aria-pressed="false" title="A person and a range pole beside it, for scale (G)">Scale</button>
            <button data-rotate class="switch" aria-pressed="true" title="Turn slowly round what was last chosen">Turntable</button>
            <button data-light class="switch" aria-pressed="false" title="A light room instead of a dark one (L)">Light</button>
            <button data-cel class="switch" aria-pressed="false" title="Draw it as a cel-shaded drawing (T)">Cel shading</button>
            <button data-lighter class="switch" aria-pressed="${tier().lighter}" title="For a phone or a machine short of memory: smaller shadow maps and pictures, and nothing held that is not on show. Chosen for you on a phone. Changing it reloads the page">Lighter graphics</button>
          </span>
        </div>
        <p class="scale">${esc(m.scale)}</p>
      </footer>

      <aside class="legend-keys folded" aria-label="Keys and gestures">
        <button class="legend-toggle" aria-expanded="false" title="Keys and gestures: show or hide (?)"><kbd>?</kbd><span>Keys</span><i class="chevron"></i></button>
        <div class="legend-body">
          <div class="clusters">
            <div class="cluster"><span class="pad arrows"><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></span><em>turn · tilt</em></div>
            <div class="cluster"><span class="pad pair"><kbd>R</kbd><kbd>F</kbd></span><em>zoom</em></div>
            <div class="cluster"><span class="pad wasd"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span><em>slide</em></div>
            <div class="cluster"><span class="pad pair"><kbd>E</kbd><kbd>Q</kbd></span><em>up · down</em></div>
          </div>
          <dl>
            <div><dt>drag</dt><dd>turn it</dd></div>
            <div><dt>scroll · pinch</dt><dd>zoom to the pointer</dd></div>
            <div><dt>click a part</dt><dd>go to it</dd></div>
            <div><dt>click a window</dt><dd>look inside</dd></div>
            <div><dt><kbd>N</kbd> <kbd>B</kbd></dt><dd>next part · the one before</dd></div>
            ${m.cutaway ? '<div><dt><kbd>X</kbd></dt><dd>cutaway</dd></div>' : ''}
            <div><dt><kbd>G</kbd></dt><dd>a person for scale</dd></div>
            <div><dt><kbd>L</kbd></dt><dd>light · dark room</dd></div>
            <div><dt><kbd>T</kbd></dt><dd>cel shading</dd></div>
            <div><dt><kbd>0</kbd> <kbd>Esc</kbd></dt><dd>back to the whole of it</dd></div>
            <div><dt><kbd>H</kbd></dt><dd>hide panels</dd></div>
          </dl>
        </div>
      </aside>
      <div class="marks" aria-hidden="true"><p data-mark="pole"></p><p data-mark="head"></p></div>
      <div class="notes"></div>
      <div class="tip" hidden><b></b><span></span></div>
      ${CURTAIN}`;
    this.q('.title .sub').after(placesNav(f, 'gallery', (to) => this.host.go(to)));
    for (const b of this.root.querySelectorAll<HTMLElement>('[data-plinth]'))
      b.setAttribute('aria-pressed', String(b.dataset.plinth === this.plinth.id));
    this.fill();
    this.tab(narrow() ? 'View' : 'Parts');
  }

  /** Everything that belongs to what stands there: its parts, its views. */
  private fill(): void {
    const all = this.vehicle.parts;
    const parts = this.parts;
    this.q('.parts').innerHTML = parts
      .map(
        (p, i) => `${
          p.group && p.group !== parts[i - 1]?.group && !this.plinth.nodes
            ? `<li class="group"><h2>${esc(p.group)} <b>·</b> ${parts.filter((x) => x.group === p.group).length}</h2></li>`
            : ''
        }
      <li><button data-node="${p.node}" aria-expanded="false">
        <span class="n">${String(all.indexOf(p) + 1).padStart(2, '0')}</span>
        <span class="name">${esc(p.name)}${p.inside ? '<em>inside</em>' : ''}</span>
        <span class="what">${esc(p.summary)}</span>
        <span class="more">${esc(p.detail)}${p.facts ? `<span class="pf">${p.facts.map(([k, v]) => `<span><i>${esc(k)}</i>${esc(v)}</span>`).join('')}</span>` : ''}<span class="back"><kbd>Esc</kbd> back to the whole of it</span></span>
      </button></li>`,
      )
      .join('');
    // more views than a row or two holds are behind one button that opens them (the whole of it and the one on show stay out)
    const views = this.q('.views');
    const many = this.model.views.length > MANY_VIEWS;
    views.classList.toggle('many', many);
    views.classList.remove('open');
    views.innerHTML =
      this.model.views.map((v) => `<button data-view="${v.id}" aria-pressed="false">${esc(v.label)}</button>`).join('') +
      (many
        ? `<button data-views aria-expanded="false" title="Every view of it">${this.model.views.length - 1} views<i class="chevron"></i></button>`
        : '');
    this.q('.explode').hidden = !this.vehicle.slider || !parts.some((p) => p.explode.some((v) => v !== 0));
    this.q('[data-apart]').hidden = this.q('.explode').hidden;
    this.sized();
  }

  /** How tall the sheet is with the View pane in it: as tall as what the pane holds, so the vehicle keeps the rest (gallery.css). */
  private sized(): void {
    const tall = viewHeight(this.q('.panel'));
    if (tall) for (const el of [this.q('.panel'), this.canvas]) el.style.setProperty('--sheet-view', `${tall}px`);
  }

  private listen(): void {
    const root = this.root;
    const panel = this.q('.panel');
    // the panels tuck as the site's do, and the same choices are remembered for both
    const tuckPanel = (on: boolean, remember = true) => {
      // (a wide page's choice: on a phone the sheet has its stops, and the handle works them)
      panel.classList.toggle('tucked', on && !narrow());
      this.q('.close').setAttribute('aria-expanded', String(!on));
      if (remember && !narrow()) prefs.set('panelTucked', on);
    };
    tuckPanel(prefs.get('panelTucked'));
    root.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) =>
      b.addEventListener('click', () => {
        const same = b.getAttribute('aria-selected') === 'true';
        tuckPanel(false);
        this.tab(b.dataset.tab!);
        // (on a phone the open tab pressed again puts the sheet away, as its handle does)
        if (narrow()) this.sheet?.set(same && panel.classList.contains('open') ? 0 : this.sheet.stop || 1);
        else panel.classList.add('open');
      }),
    );
    this.q('.close').addEventListener('click', () => {
      const tucked = panel.classList.contains('tucked');
      panel.classList.toggle('open', tucked);
      tuckPanel(!tucked);
    });
    // (on a phone choosing a part opens nothing: the handle names it, and the sheet stays where it was put)
    this.untuck = () => {
      if (narrow()) return;
      panel.classList.add('open');
      tuckPanel(false);
      window.setTimeout(() => this.reveal(), 320); // (once the sheet has risen: before, the list has no height to scroll in)
    };
    // On a phone the panel is a sheet a finger moves between its stops (sheet.ts: the site's is the same one), or its
    // handle's button does. At rest again, the part being read is in view in it.
    let grip: { shown(): void } | null = null;
    this.sheet = sheet(panel, () => {
      grip?.shown();
      window.setTimeout(() => this.settle(), 320);
    });
    grip = handle(this.q('.handle-open'), panel, this.sheet);
    // the control block is the sheet's View pane while the page is narrow, piece by piece and taking it apart first; on a
    // wide page it is beside the view
    const slot = (name: string) => this.q(`[data-slot=${name}]`);
    dock(
      [
        [this.q('.explode'), slot('apart')],
        [this.q('.models'), slot('models')],
        [this.q('.views'), slot('views')],
        [this.q('.shows'), slot('show')],
        [this.q('.controls .scale'), slot('scale')],
      ],
      (on) => {
        const at = root.querySelector<HTMLElement>('[data-tab][aria-selected=true]')?.dataset.tab;
        this.tab(!on && at === 'View' ? 'Parts' : (at ?? (on ? 'View' : 'Parts')));
        if (!on) panel.classList.remove('open', 'full');
        tuckPanel(prefs.get('panelTucked'), false);
        this.measure();
      },
    );
    hintOnce(this.q('.notes'), 'The bar at the foot', 'Tap or pull it up: take it apart, the views, every part');
    // taking it apart from the handle: all the way, or together again, at the pace the show does it
    this.q('[data-apart]').addEventListener('click', () => {
      if (!this.ready) return;
      this.apartTo = this.apart > 0 ? 0 : 1;
    });
    this.q('.tabs').addEventListener('keydown', (e) => {
      const key = (e as KeyboardEvent).key;
      if (key !== 'ArrowRight' && key !== 'ArrowLeft') return;
      const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-tab]')];
      const at = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
      const next = tabs[(at + (key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]!;
      this.tab(next.dataset.tab!);
      next.focus();
    });
    const title = this.q('.title');
    const tuckTitle = (on: boolean) => {
      title.classList.toggle('tucked', on);
      this.q('.tuck').setAttribute('aria-expanded', String(!on));
      prefs.set('titleTucked', on);
    };
    tuckTitle(prefs.get('titleTucked'));
    this.q('.tuck').addEventListener('click', () => tuckTitle(!title.classList.contains('tucked')));
    // the card says of the flight what it says in every place: its summary, and its figures folded under it (remembered)
    const facts = title.querySelector<HTMLElement>('.facts-toggle');
    const showFacts = (open: boolean) => {
      title.classList.toggle('facts-open', open);
      facts?.setAttribute('aria-expanded', String(open));
      prefs.set('factsOpen', open);
    };
    if (facts) showFacts(prefs.get('factsOpen'));
    facts?.addEventListener('click', () => showFacts(!title.classList.contains('facts-open')));
    // the way out to the front page: the first crumb, and on a narrow page (which has no room for crumbs) the heading
    title.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('[data-home]')) this.host.home();
    });
    root.classList.toggle('bare', prefs.get('bare'));
    const keys = this.q('.legend-keys');
    this.showKeys = (open: boolean) => {
      keys.classList.toggle('folded', !open);
      this.q('.legend-toggle').setAttribute('aria-expanded', String(open));
      prefs.set('legendOpen', open);
    };
    this.showKeys(prefs.get('legendOpen'));
    this.q('.legend-toggle').addEventListener('click', () => this.showKeys(keys.classList.contains('folded')));

    // What stands there is changed by a press on its name and by nothing else: not by a finger that came down on the
    // bar on its way to the slider or the sheet under it and moved on (a press that travelled is not a choice).
    let pressed: { x: number; y: number } | null = null;
    this.q('.models').addEventListener('pointerdown', (e) => (pressed = { x: e.clientX, y: e.clientY }));
    this.q('.models').addEventListener('click', (e) => {
      const travelled = pressed ? Math.hypot(e.clientX - pressed.x, e.clientY - pressed.y) : 0;
      pressed = null;
      const id = (e.target as HTMLElement).closest<HTMLElement>('[data-plinth]')?.dataset.plinth;
      const to = this.choices.find((p) => p.id === id);
      if (to && to !== this.plinth && this.ready && travelled < 10) {
        this.stand(to);
        this.host.address(this.at);
      }
    });
    // a part of it standing alone says so, and the note is the way back to the whole of it
    this.q('.alone').addEventListener('click', () => {
      if (!this.ready) return;
      this.stand(this.choices[0]!);
      this.host.address(this.at);
    });
    const slider = this.q<HTMLInputElement>('.explode input');
    slider.addEventListener('input', () => {
      this.apartTo = null;
      this.setApart(Number(slider.value));
    });
    const parts = this.q('.parts');
    const node = (e: Event) => (e.target as HTMLElement).closest<HTMLElement>('[data-node]')?.dataset.node ?? null;
    parts.addEventListener('pointerover', (e) => this.hover(node(e), false));
    parts.addEventListener('pointerleave', () => this.hover(null, false));
    parts.addEventListener('click', (e) => {
      const n = node(e);
      if (n) this.select(this.selected === n ? null : n);
    });
    // (the views and the switches are beside the view on a wide page and in the sheet on a narrow one: asked for wherever they are)
    root.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>(':is(.views, .shows) button');
      if (!b || !this.ready) return;
      const on = b.getAttribute('aria-pressed') !== 'true';
      if (b.dataset.view) {
        this.made!.stage.view(b.dataset.view);
        this.turn();
      } else if (b.hasAttribute('data-views')) {
        b.setAttribute('aria-expanded', String(this.q('.views').classList.toggle('open')));
      } else if (b.hasAttribute('data-cut')) this.setCutaway(on, true);
      else if (b.hasAttribute('data-names')) this.setNames(on);
      else if (b.hasAttribute('data-measure')) this.setMeasure(on);
      else if (b.hasAttribute('data-rotate')) this.setTurntable(on);
      else if (b.hasAttribute('data-light')) this.setLight(on);
      else if (b.hasAttribute('data-cel')) this.setCel(on);
      else if (b.hasAttribute('data-lighter')) {
        // (what a tier allocates is allocated as the page opens: the choice is kept, and the page opened again in it, here)
        chooseTier(on);
        location.reload();
      }
    });
    this.q('.steps').addEventListener('click', (e) => {
      const by = (e.target as HTMLElement).closest<HTMLElement>('[data-step]')?.dataset.step;
      if (by && this.ready) this.step(Number(by));
    });
    this.q('.loading button').addEventListener('click', () => void this.enter());
    window.addEventListener('pointermove', (e) => {
      this.pointer = [e.clientX, e.clientY];
      this.placeTip();
    });
    // what the controls cover of the view, and the room the labels have: measured, since the control block wraps
    const controls = this.q('.controls');
    const measure = new ResizeObserver(() => this.measure());
    for (const el of [controls, this.q('.models'), panel, title, this.canvas]) measure.observe(el);
    new ResizeObserver(() => this.sized()).observe(this.q('[data-pane=View]'));

    // Any touch ends the show and puts off the next one (the mouse merely moving does not end one that is on). It is
    // listened for before the keys below, which let nothing go further: a key of the gallery's own is a touch too.
    for (const touch of ['pointerdown', 'wheel', 'keydown', 'touchstart', 'pointermove'] as const)
      window.addEventListener(
        touch,
        (e) => {
          if (!this.open) return;
          if (e.type === 'pointermove' && this.touring) return;
          if (e instanceof KeyboardEvent && ['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
          this.idle = 0;
          if (this.touring && !this.host.covered()) this.endShow();
        },
        { capture: true, passive: true },
      );

    /*
     * The keys. While the gallery is up every key comes here first: the camera's go on to the
     * camera (this stage's: the site's is asleep and hears nothing), the gallery's own are acted
     * on, and nothing goes any further, so no key of the site's (the clock, the flight deck,
     * going on foot) can reach a site that is not on show.
     */
    window.addEventListener(
      'keydown',
      (e) => {
        if (!this.open) return;
        const typing = (e.target as HTMLElement).matches?.('input:not([type=range]), textarea');
        if (e.metaKey || e.ctrlKey || e.altKey || typing) return;
        const key = e.key.toLowerCase();
        if (CAMERA_KEYS.has(key)) return;
        e.stopImmediatePropagation();
        if (this.host.covered() || e.repeat || !this.ready) return;
        if (key === 'escape') this.select(null);
        else if (key === 'n') this.step(1);
        else if (key === 'b') this.step(-1);
        else if (key === 'x' && this.vehicle.cutaway) this.setCutaway(!this.cut, true);
        else if (key === 'g') this.setMeasure(!this.studio.measured);
        else if (key === 'l') this.setLight(this.studio.tone !== 'light');
        else if (key === 't') this.setCel(!prefs.get('cel'));
        else if (key === 'h') {
          const bare = !root.classList.contains('bare');
          root.classList.toggle('bare', bare);
          prefs.set('bare', bare);
        } else if (e.key === '?') this.showKeys(keys.classList.contains('folded'));
      },
      true,
    );
  }
  private untuck: () => void = () => {};
  private sheet: Sheet | null = null;
  /** Where the handle's switch is taking the slider (null: nowhere). */
  private apartTo: number | null = null;
  private showKeys: (open: boolean) => void = () => {};

  private async load(): Promise<void> {
    // the same curtain as the site's, saying what the gallery fetches: the vehicle, and its shaders built
    const curtain = new Curtain(this.q('.loading'));
    curtain.begin(this.flight.callsign);
    const said = follow(curtain, [this.vehicle.name], {
      shaders: { label: 'Compiling shaders', share: 0.5 },
      settle: { label: 'Warming up', share: 0.15 },
    });
    try {
      const stage = (this.own ??= new Stage(this.canvas));
      stage.fullDetail = true;
      stage.setLook(prefs.get('cel') ? 'cel' : 'real');
      await stage.load(this.staged, (f, parts) => said.arrive(f, parts));
      said.arrive(1);
      const studio = asStudio(stage.place);
      if (!studio) throw new Error('the gallery is shown in the studio');
      this.made = { stage, studio };
      this.wire(stage);
      studio.setTone(prefs.get('galleryLight') ? 'light' : 'dark');
      this.outlines = stage.outlines();
      this.stand(this.plinth, true);
      this.setMeasure(prefs.get('galleryMeasure'));
      this.setNames(!prefs.get('galleryNamesOff'));
      this.q('[data-light]').setAttribute('aria-pressed', String(studio.tone === 'light'));
      // the flight's own crew, where it has one, is the person who stands beside it for scale
      const crew = scaleFigure(this.flight);
      if (crew)
        void stage
          .model(crew.url)
          .then((figure) => {
            for (const name of crew.walker?.hide ?? []) figure.getObjectByName(name)?.removeFromParent();
            studio.person(figure, crew.walker?.forward);
            stage.reset();
          })
          .catch((e) => console.warn('the figure for scale did not arrive: an outline stands in', e));
      await stage.warm(4000, (step, f) => said.step(step, f));
      said.end();
      this.ready = true;
      this.measure();
      if (navigator.webdriver) document.body.classList.add('instant'); // (a script taking pictures does not wait for a fade)
      this.canvas.classList.add('ready');
      curtain.done();
      if (!this.open) stage.sleep(true);
    } catch (e) {
      console.error(e);
      said.end(false);
      curtain.failed(e instanceof Error ? e.message : String(e));
      throw e;
    }
  }

  private wire(stage: Stage): void {
    stage.onHover = (node) => this.hover(node, true);
    stage.onSelect = (node) => this.select(node);
    stage.onHome = () => (this.selected ? this.select(null) : this.whole());
    stage.onView = (id) => {
      for (const b of this.root.querySelectorAll<HTMLElement>('[data-view]')) b.setAttribute('aria-pressed', String(b.dataset.view === id));
    };
    stage.onHoverWindow = (over) => this.tip(over ? ['Window', 'Click to look inside'] : null);
    // taking the view pauses the turntable; it starts again with the next thing chosen
    stage.onInteract = () => {
      stage.setAutoRotate(false);
      this.q('[data-rotate]').setAttribute('aria-pressed', 'false');
    };
  }

  /** Turn slowly round whatever was just chosen, unless the turntable has been switched off. */
  private turn(): void {
    this.made?.stage.setAutoRotate(!this.stopped);
    this.q('[data-rotate]').setAttribute('aria-pressed', String(!this.stopped));
  }

  /** Put something else on the floor: all of the vehicle, or the parts under one of its headings. */
  private stand(plinth: Plinth, snap = false): void {
    const { stage, studio } = this.made!;
    this.plinth = plinth;
    this.selected = this.hovered = null;
    this.autoCut = false;
    this.setCutaway(false);
    for (const b of this.root.querySelectorAll<HTMLElement>('[data-plinth]'))
      b.setAttribute('aria-pressed', String(b.dataset.plinth === plinth.id));
    this.apart = 0;
    this.q<HTMLInputElement>('.explode input').value = '0';
    stage.setExplode(0);
    const lift = stage.only(plinth.nodes);
    // the stage reads the model's views where it stands: these are the ones of what is there now, a height its flight
    // measured where it stood the vehicle raised to where it stands here
    this.model.views = plinthViews(this.vehicle, plinth, lift - (this.vehicle.position?.[1] ?? 0));
    studio.fit(stage.extent());
    stage.reset();
    this.fill();
    this.labels.name(this.parts.map((p) => ({ id: p.node, name: p.name, n: this.vehicle.parts.indexOf(p) + 1 })));
    // (nobody is to think the rest is missing: what has been left out is named)
    const note = this.q('.alone');
    note.hidden = !plinth.nodes;
    const others = this.choices.filter((p) => p.nodes && p !== plinth).map((p) => p.label.toLowerCase());
    note.querySelector('b')!.textContent = `${plinth.label} alone`;
    note.querySelector('span')!.textContent = others.length ? `${others.join(', ')} not shown` : '';
    this.map(note.querySelector('svg')!, plinth);
    this.measure(); // (the note lies across the top of the view: what is clear under it has changed)
    if (!narrow()) this.tab('Parts');
    else this.tally();
    this.apartTo = null;
    stage.view(WHOLE_VIEW, snap);
    this.turn();
    this.mark();
  }

  private whole(): void {
    this.made?.stage.view(WHOLE_VIEW);
    this.turn();
  }

  /** Take what stands there this far apart, 0 to 1. */
  private setApart(to: number): void {
    this.apart = Math.min(1, Math.max(0, to));
    this.made?.stage.setExplode(this.reading);
    this.root.querySelector('[data-apart]')?.setAttribute('aria-pressed', String(this.apart > 0));
  }

  private select(node: string | null, snap = false): void {
    if (!this.ready || (!node && !this.selected)) return;
    const stage = this.made!.stage;
    this.selected = node;
    stage.highlight(null, node);
    const part = this.vehicle.parts.find((p) => p.node === node);
    // something inside something else is only worth going to if it can be seen; and once the
    // selection moves on, an opening nobody asked for closes again
    if (part?.inside && !this.cut) {
      this.setCutaway(true);
      this.autoCut = true;
    } else if (!part?.inside && this.autoCut) {
      this.setCutaway(false);
      this.autoCut = false;
    }
    if (node) {
      if (!narrow()) this.tab('Parts');
      this.untuck();
      stage.focus(node, snap);
    } else stage.view(WHOLE_VIEW, snap);
    for (const b of this.root.querySelectorAll<HTMLElement>('[data-node]')) {
      const on = b.dataset.node === node;
      b.setAttribute('aria-expanded', String(on));
      if (on) b.scrollIntoView({ block: 'nearest', behavior: snap ? 'auto' : 'smooth' });
    }
    this.tally();
    this.turn();
    this.tip(null);
    if (!this.touring) this.host.address(this.at);
  }

  /**
   * The sheet has come to rest at another height: the part being read is in view in it, and what is being looked at
   * is framed again in what is now clear above it (moving the sheet is asking for the view to be made good: a finger
   * that slipped onto the picture on the way may have left it anywhere).
   */
  private settle(): void {
    this.reveal();
    if (!this.ready || this.touring) return;
    // (told what is clear now, the stage frames again what it was still following, and leaves a view the hands have set)
    this.measure();
  }

  /** Each part's place in the whole vehicle, put together: its height off the ground and how far out it reaches (Stage.outlines). */
  private outlines: { node: string; low: number; high: number; reach: number }[] = [];

  /**
   * The whole vehicle as a small diagram, with what stands there now marked in it: so that a part
   * of it standing alone is seen for a part of the whole. (The rest is not drawn faintly in the
   * room itself: what stands alone stands on the floor, at its own size beside the person, and the
   * rest of the vehicle would mostly be under that floor.)
   */
  private map(svg: SVGElement, plinth: Plinth): void {
    const all = this.outlines;
    if (!all.length || !plinth.nodes) return void svg.replaceChildren();
    const top = Math.max(...all.map((o) => o.high));
    const foot = Math.min(...all.map((o) => o.low));
    const wide = 2 * Math.max(...all.map((o) => o.reach));
    const H = 34;
    const k = H / Math.max(1e-6, top - foot);
    const W = Math.max(8, wide * k);
    svg.setAttribute('viewBox', `0 0 ${W.toFixed(1)} ${H}`);
    svg.setAttribute('width', W.toFixed(1));
    svg.setAttribute('height', String(H));
    svg.innerHTML = all
      .map((o) => {
        const w = Math.max(1, 2 * o.reach * k);
        const h = Math.max(1, (o.high - o.low) * k);
        const on = plinth.nodes!.includes(o.node);
        return `<rect x="${((W - w) / 2).toFixed(1)}" y="${((top - o.high) * k).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" class="${on ? 'on' : ''}"/>`;
      })
      .join('');
  }

  /** Bring the part being read into view in the list (which may only now have room to show it). */
  private reveal(): void {
    this.root.querySelector('[data-node][aria-expanded=true]')?.scrollIntoView({ block: 'nearest' });
  }

  /** Where among the parts the one chosen is, said between the two buttons that step through them. */
  private tally(): void {
    const parts = this.parts;
    const at = parts.findIndex((p) => p.node === this.selected);
    this.q('.steps output').textContent =
      at < 0 ? `${parts.length} parts` : narrow() ? `${at + 1}/${parts.length}` : `${at + 1} of ${parts.length}`;
    // (the handle names the part and says what it is in a line; with none chosen, what stands there)
    this.q('.handle-open b').textContent = at < 0 ? this.plinth.label : parts[at]!.name;
    this.q('.handle-open span').textContent = at < 0 ? '' : parts[at]!.summary;
  }

  /** The part after the one chosen (or before it), in the order they are listed, and round again: a way through all of them. */
  private step(by: number): void {
    const parts = this.parts;
    if (!parts.length) return;
    const at = parts.findIndex((p) => p.node === this.selected);
    const next = at < 0 ? (by > 0 ? 0 : parts.length - 1) : (at + by + parts.length) % parts.length;
    this.select(parts[next]!.node);
  }

  private hover(node: string | null, fromView: boolean): void {
    if (!this.ready || this.touring) return;
    this.hovered = node;
    if (!fromView) this.made!.stage.highlight(node, this.selected);
    const part = this.vehicle.parts.find((p) => p.node === node);
    for (const b of this.root.querySelectorAll<HTMLElement>('[data-node]')) b.classList.toggle('hot', b.dataset.node === node);
    // (over the picture a label follows the pointer, but not for the part already chosen: its name is on the panel)
    this.tip(fromView && part && node !== this.selected ? [part.name, part.summary] : null);
  }

  private setCutaway(on: boolean, byHand = false): void {
    if (byHand) this.autoCut = false; // asked for by hand: it stays until asked otherwise
    this.cut = on;
    this.root.querySelector('[data-cut]')?.setAttribute('aria-pressed', String(on));
    this.made?.studio.inside(on); // (opened, what is inside is lit)
    this.made?.stage.setCutaway(on);
  }

  private setNames(on: boolean): void {
    prefs.set('galleryNamesOff', !on);
    this.q('[data-names]').setAttribute('aria-pressed', String(on));
  }

  private setMeasure(on: boolean): void {
    prefs.set('galleryMeasure', on);
    this.q('[data-measure]').setAttribute('aria-pressed', String(on));
    this.studio.measure(on);
    this.made!.stage.reset();
  }

  private setTurntable(on: boolean): void {
    this.stopped = !on;
    prefs.set('orbitOff', !on);
    this.turn();
  }

  private setLight(on: boolean): void {
    prefs.set('galleryLight', on);
    this.q('[data-light]').setAttribute('aria-pressed', String(on));
    this.studio.setTone(on ? 'light' : 'dark');
    this.made!.stage.reset();
  }

  /** Cel shading on or off: for both places, and remembered. In a drawing the room is paper, whichever tone it has. */
  private setCel(on: boolean, remember = true): void {
    if (remember) prefs.set('cel', on);
    this.root.classList.toggle('cel', on);
    this.q('[data-cel]').setAttribute('aria-pressed', String(on));
    this.made?.stage.setLook(on ? 'cel' : 'real');
    this.made?.stage.reset();
  }

  private tab(name: string): void {
    for (const b of this.root.querySelectorAll<HTMLElement>('[data-tab]')) {
      b.setAttribute('aria-selected', String(b.dataset.tab === name));
      b.tabIndex = b.dataset.tab === name ? 0 : -1;
    }
    for (const p of this.root.querySelectorAll<HTMLElement>('[data-pane]')) p.hidden = p.dataset.pane !== name;
    // (on a phone the steps are the sheet's handle, there whichever tab is open)
    this.q('.steps').hidden = name !== 'Parts' && !narrow();
    this.q('.panel').classList.toggle('on-view', name === 'View');
    this.tally();
    this.sized();
  }

  /** A label beside the pointer, on whichever side has room; null puts it away. */
  private tip(text: [title: string, line: string] | null): void {
    const tip = this.q('.tip');
    tip.hidden = !text || matchMedia('(hover: none)').matches;
    if (!text) return;
    tip.querySelector('b')!.textContent = text[0];
    tip.querySelector('span')!.textContent = text[1];
    this.placeTip();
  }

  private placeTip(): void {
    const tip = this.q('.tip');
    if (tip.hidden) return;
    const [x, y] = this.pointer;
    const left = x > window.innerWidth * 0.6;
    tip.classList.toggle('left', left);
    tip.style.transform = `translate(${left ? x - 26 - tip.offsetWidth : x + 26}px, ${Math.max(8, y - 14)}px)`;
  }

  /** How much of the view the controls cover (views are framed above them), and the part of the page that is clear for labels. */
  private measure(): void {
    const view = this.canvas.getBoundingClientRect();
    if (!view.width || !view.height) return;
    const shown = (el: HTMLElement) => el.offsetParent !== null && !this.root.classList.contains('bare');
    const [controls, models, panel, title] = ['.controls', '.models', '.panel', '.title'].map((s) => this.q(s)) as [
      HTMLElement,
      HTMLElement,
      HTMLElement,
      HTMLElement,
    ];
    this.root.style.setProperty('--controls-h', `${controls.offsetHeight}px`);
    // the least the title card can be: everything in it but what it says of the flight, which scrolls (gallery.css)
    const cs = getComputedStyle(title);
    let least = Number.parseFloat(cs.paddingTop) + Number.parseFloat(cs.paddingBottom) + 2;
    for (const el of title.children as HTMLCollectionOf<HTMLElement>) {
      if (el.matches('.lede, .facts, .tuck') || el.offsetParent === null) continue;
      const m = getComputedStyle(el);
      least += el.offsetHeight + Number.parseFloat(m.marginTop) + Number.parseFloat(m.marginBottom);
    }
    this.root.style.setProperty('--card-least', `${Math.ceil(least)}px`);
    // (what lies across the middle of the view covers it: on a wide page the controls stand in the column under the
    // title card, beside the view and not over it)
    const middle = view.left + view.width / 2;
    const across = (r: DOMRect) => r.left < middle && r.right > middle;
    const column = shown(controls) && !across(controls.getBoundingClientRect()) ? controls.getBoundingClientRect() : null;
    // (on a phone the sheet's handle lies across the foot of the view; the control block is inside the sheet)
    const rects = (narrow() ? [panel] : [controls, models])
      .filter(shown)
      .map((el) => el.getBoundingClientRect())
      .filter(across);
    const low = rects.map((r) => r.top).filter((top) => top > view.top + view.height / 2);
    const bottom = Math.min(view.bottom, ...low);
    const high = rects.map((r) => r.bottom).filter((b) => b < view.top + view.height / 2);
    // on a narrow page the title card and the switch beside it lie across the top of the view, as the bar does on a wide one
    const head = shown(title) && matchMedia('(max-width: 960px)').matches ? title.getBoundingClientRect().bottom : view.top;
    const note = this.q('.alone');
    const said = shown(note) ? note.getBoundingClientRect().bottom : view.top;
    const top = Math.max(view.top, head, said < view.top + view.height / 2 ? said : view.top, ...high);
    // a view is framed in what is left clear between what lies across the top and the controls
    // (with a little kept clear at the foot and the head: a thing seen from above its middle reaches further down the
    // picture than the box round it says, and nothing is to touch the bar or be cut by the edge)
    const sideways = shown(panel) ? panel.getBoundingClientRect() : null;
    const right = sideways && sideways.left > middle && sideways.height > view.height / 2 ? sideways.left : view.right;
    const left = column && column.right < middle ? column.right : view.left;
    // (what is clear is taken to be about the middle: the narrower side of it, doubled)
    const clear = 2 * Math.min(middle - left, right - middle);
    const foot = Math.max(0, view.bottom - bottom) + 0.035 * view.height;
    const over = top - view.top + 0.01 * view.height;
    // (the stage fits a width as if the whole height were clear: told the clear width over the clear height's share, it
    // fits the clear part itself, which on a phone is short and wide)
    const tall = Math.max(0.2, 1 - (foot + over) / view.height);
    this.made?.stage.setInset(foot, over, clear / view.width / tall);
    // a panel down one side takes that side; one across the foot is already under the canvas
    const side = shown(panel) ? panel.getBoundingClientRect() : null;
    this.clear = {
      left: (column && column.right < middle ? column.right : view.left) + 10,
      right: (side && side.left > view.left + view.width / 2 && side.height > view.height / 2 ? side.left : view.right) - 10,
      top: top + 8,
      bottom: bottom - 10,
    };
  }

  /** Every frame while it is up: the names on the parts and the measure's figures follow the picture, and the show goes on. */
  private tick(): void {
    this.frame = requestAnimationFrame(() => this.tick());
    const now = performance.now();
    const dt = Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    if (!this.ready) return;
    if (this.apartTo !== null && !this.touring) {
      const far = this.apartTo - this.apart;
      const step = dt / (0.5 * APART);
      this.setApart(Math.abs(far) <= step ? this.apartTo : this.apart + Math.sign(far) * step);
      this.q<HTMLInputElement>('.explode input').value = String(this.apart);
      if (this.apart === this.apartTo) this.apartTo = null;
    }
    this.show(dt);
    this.name();
    this.figures();
  }

  /** Name the parts that have come clear of their neighbours, each out to one side with a leader. */
  private name(): void {
    const stage = this.made!.stage;
    const on =
      this.q('[data-names]').getAttribute('aria-pressed') === 'true' &&
      this.apart > 0 &&
      !this.touring &&
      !this.root.classList.contains('bare');
    if (!on) return void this.labels.clear();
    const parts = this.parts;
    const orders = Math.max(0, ...this.vehicle.parts.map((p) => p.order));
    const clear = cleared(parts, this.reading, orders);
    // On a phone the names are often wider than the room beside the thing, and would lie on it: then each part has a pin
    // with its number in the parts list instead, and the handle names the one chosen. (Once pins, it stays pins until
    // the names fit with room to spare: a column on the edge of fitting does not flicker between the two.)
    const lay = (pins: boolean) => {
      this.labels.pins(pins);
      const anchors: Anchor[] = [];
      parts.forEach((p, i) => {
        const at = clear[i] ? stage.frameOf(p.node) : null;
        if (at) anchors.push({ id: p.node, ...at, width: this.labels.width(p.node) });
      });
      return { anchors, placed: layOut(anchors, this.clear) };
    };
    let laid = lay(false);
    if (narrow() && covers(laid.anchors, laid.placed, this.labels.pinned ? 24 : 6)) laid = lay(true);
    this.labels.place(laid.placed);
    this.mark();
  }

  private mark(): void {
    this.labels.mark(this.selected, this.hovered);
  }

  /** The measure's two figures, written where they are: how tall the vehicle is and how tall the person. */
  private figures(): void {
    const { stage, studio } = this.made!;
    const marks = this.touring ? null : studio.marks();
    const [pole, head] = [this.q('[data-mark=pole]'), this.q('[data-mark=head]')];
    // (a figure whose mark is off the top of the clear part of the page stays at its edge: the pole is as tall as the thing)
    const { top, bottom } = this.clear;
    // Each figure stands just over its mark, to the right; where that would lie on a part's label or on the other
    // figure it goes to the mark's other side, and failing that up clear of them: no two things written on the picture
    // are ever on top of each other.
    const taken = this.labels.boxes.map((b) => ({ ...b }));
    const put = (el: HTMLElement, at: { x: number; y: number } | null, html: string) => {
      el.classList.toggle('shown', Boolean(at));
      if (!at) return;
      if (el.dataset.says !== html) el.innerHTML = el.dataset.says = html;
      const [w, h] = [el.offsetWidth, el.offsetHeight];
      const y = Math.min(bottom, Math.max(top + 32, at.y));
      const box = (dx: number, dy: number) => ({ left: at.x + dx, top: y + dy, right: at.x + dx + w, bottom: y + dy + h });
      const hits = (b: ReturnType<typeof box>) =>
        b.left < this.clear.left - 6 ||
        b.right > this.clear.right + 6 ||
        taken.some((t) => b.left < t.right + 4 && b.right > t.left - 4 && b.top < t.bottom + 3 && b.bottom > t.top - 3);
      const tries: [number, number][] = [
        [-14, -30],
        [14 - w, -30],
      ];
      for (let up = 1; up <= 6; up++) tries.push([-14, -30 - up * (h + 4)], [14 - w, -30 - up * (h + 4)]);
      const [dx, dy] = tries.find(([x, yy]) => !hits(box(x, yy))) ?? tries[0]!;
      taken.push(box(dx, dy));
      el.style.transform = `translate(${Math.round(at.x + dx)}px, ${Math.round(y + dy)}px)`;
    };
    if (!marks) return void [pole, head].forEach((el) => el.classList.remove('shown'));
    const spec = this.heightSpec(marks.height);
    put(
      pole,
      stage.screenOf(marks.pole),
      spec
        ? `${dot(spec.confidence)}<b>${spec.value.toFixed(2)} m</b><span>${esc(spec.label)}</span>`
        : `<b>${marks.height.toFixed(2)} m</b><span>as modelled</span>`,
    );
    put(head, stage.screenOf(marks.head), `<b>${marks.stature.toFixed(2)} m</b>`);
  }

  /** The flight's own figure for how tall what stands there is, if it gives one: a length among its specs within a hundredth of the model's. */
  private heightSpec(height: number): Spec | null {
    const near = this.flight.specs
      .filter((s) => s.unit === 'm' && Math.abs(s.value - height) < 0.01 * height)
      .sort((a, b) => Math.abs(a.value - height) - Math.abs(b.value - height));
    return near[0] ?? null;
  }

  /*
   * The show. Left alone, the gallery goes through the vehicle by itself: the whole of it, taken
   * apart, each part in turn with a card saying what it is, together again, then what is inside
   * through the cutaway and the glass. The same tour the idle show makes of a section at the site
   * (demo.ts `tour`), with no clock to run. Any touch ends it and puts everything back.
   */
  private show(dt: number): void {
    // not for a browser driven by a script (unless it asks: ?demo), nor for anyone who has asked their system for less motion
    const unattended = (navigator.webdriver && !location.search.includes('demo')) || matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (unattended && !this.touring) return;
    if (!this.touring) {
      this.idle += dt;
      // behind the front page it plays at once; in front of someone, only once they have left it alone a while
      if (document.hidden || (!this.host.covered() && this.idle < this.wait)) return;
      this.startShow();
    }
    if (this.apart !== this.apartGoal) {
      const step = dt / APART;
      const far = this.apartGoal - this.apart;
      this.apart = Math.abs(far) <= step ? this.apartGoal : this.apart + Math.sign(far) * step;
      this.made!.stage.setExplode(this.stretchAt(ease(this.apart)));
      this.q<HTMLInputElement>('.explode input').value = String(this.apart);
    }
    this.left -= dt;
    if (this.left <= 0) this.next();
  }

  /** The vehicle's slider reading for the show's, which eases in and out. */
  private stretchAt(k: number): number {
    const [from, to] = this.stretch;
    return k <= 0 ? 0 : from + (to - from) * k;
  }

  private startShow(): void {
    if (this.plinth !== this.choices[0]) this.stand(this.choices[0]!);
    this.select(null);
    this.shots = tour(this.staged, 'day');
    this.shot = 0;
    this.count = 0;
    this.apartGoal = this.apart;
    document.body.classList.add('gallery-show');
    const stage = this.made!.stage;
    stage.inert = true;
    stage.setDrift(2.2);
    stage.setAutoRotate(true);
    this.labels.clear();
    this.take(this.shots[0]!);
  }

  private endShow(): void {
    if (!this.touring) return;
    this.shot = -1;
    this.wait = IDLE_AGAIN;
    this.idle = 0;
    document.body.classList.remove('gallery-show');
    this.callout.hide();
    const stage = this.made!.stage;
    stage.inert = false;
    stage.setDrift(1);
    // handed back as it is studied: together, closed, the whole of it
    this.setApart(0);
    this.q<HTMLInputElement>('.explode input').value = '0';
    this.apartGoal = 0;
    this.autoCut = false;
    this.setCutaway(false);
    this.selected = null;
    stage.highlight(null, null);
    this.whole();
  }

  private next(): void {
    this.shot = (this.shot + 1) % this.shots.length;
    this.take(this.shots[this.shot]!);
  }

  private take(shot: Shot): void {
    const stage = this.made!.stage;
    this.left = DWELL[shot.kind];
    const f = this.flight;
    const eyebrow = `${f.callsign} · Gallery`;
    // each new thing is seen from further round, and from higher and lower by turns
    const rise = [0.2, 0.36, 0.12, 0.3][this.count++ % 4]!;
    const quiet = this.host.covered();
    const say = (title: string, text: string, at: string | null): void => {
      if (quiet) return; // (behind the front page the show says nothing)
      this.callout.show(
        { eyebrow, title, text },
        at === null ? null : () => (at === 'window' ? this.pane && stage.screenOf(this.pane) : stage.screenOf(at)),
      );
    };
    if (shot.kind === 'whole') {
      this.setCutaway(false);
      stage.view(WHOLE_VIEW);
      stage.swing(TURN, rise);
      say(f.callsign, `${f.spacecraft}. ${this.vehicle.scale}.`, null);
    } else if (shot.kind === 'apart') {
      this.apartGoal = shot.to;
      this.setCutaway(false);
      stage.view(WHOLE_VIEW);
      stage.swing(TURN, rise);
      say(shot.to ? 'Taken apart' : 'Together again', shot.to ? 'Every part, in the order it comes off.' : this.vehicle.scale, null);
    } else if (shot.kind === 'part') {
      const part = this.vehicle.parts.find((p) => p.node === shot.node);
      this.setCutaway(Boolean(part?.inside));
      stage.focus(shot.node, false, { turn: TURN, rise });
      if (part) say(part.name, part.summary, part.node);
    } else {
      const panes = stage.panes();
      const to = panes[shot.n % Math.max(1, panes.length)];
      if (!to) return void this.next();
      this.setCutaway(false);
      this.pane = to.point;
      stage.lookIn(to.point, to.normal);
      say('Through the window', 'What is inside is modelled too: every window is glass over an opening.', 'window');
    }
    stage.setAutoRotate(shot.kind !== 'window');
  }
  private pane: Vector3 | null = null;
}

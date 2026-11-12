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
import { type Shot, tour } from './demo';
import { prefs } from './prefs';
import type { Flight, ModelDef, Part, Spec } from './types';
import { dot, esc, legend, si } from './ui';
import { type Anchor, cleared, type Frame, Labels, layOut } from './viewer/labels';
import { Stage } from './viewer/stage';
import { asStudio, type Studio } from './viewer/studio';

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
    const absent = why ? ` aria-disabled="true" data-why="${esc(why)}"` : '';
    return `<button data-place="${place}" aria-pressed="${place === here}"${absent} title="${esc(why ?? PLACE_SAYS[place])}">${label}</button>`;
  };
  nav.innerHTML = `${PLACES.map(button).join('')}<p role="status" hidden></p>`;
  const says = nav.querySelector('p')!;
  let away = 0;
  nav.addEventListener('click', (e) => {
    const to = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-place]');
    if (!to) return;
    // a place that is not built says so where it was asked for, for a few seconds
    says.hidden = !to.dataset.why;
    says.textContent = to.dataset.why ?? '';
    clearTimeout(away);
    if (to.dataset.why) away = window.setTimeout(() => (says.hidden = true), 4000);
    else if (to.getAttribute('aria-pressed') !== 'true') go(to.dataset.place as Place);
  });
  return nav;
}

/** Mark which place a switch is in (the site's shows the launch site or the flight deck). */
export function markPlace(nav: Element | null, here: Place): void {
  for (const b of nav?.querySelectorAll<HTMLElement>('[data-place]') ?? [])
    b.setAttribute('aria-pressed', String(b.dataset.place === here));
}

/** The way back, as the title card's crumbs say it: the front page, the flight (its gallery), the place. */
export const crumbs = (flight: Flight, here: Place): string =>
  `<button data-home title="Front page">Space Race</button> <b>/</b> ${
    here === 'gallery'
      ? esc(flight.callsign)
      : `<button data-flight-home title="${esc(flight.callsign)}: its gallery">${esc(flight.callsign)}</button>`
  } <b>/</b> <span>${PLACE_NAME[here]}</span>`;

const TABS = ['Parts', 'Specs', 'Motors'] as const;
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
    this.canvas.hidden = true;
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
    this.root.hidden = this.canvas.hidden = false;
    document.body.classList.add('in-gallery');
    this.setCel(prefs.get('cel'), false); // (it may have been changed at the site)
    this.stopped = prefs.get('orbitOff');
    this.idle = 0;
    this.made?.stage.sleep(false);
    if (!this.frame) this.frame = requestAnimationFrame(() => this.tick());
    try {
      await (this.loading ??= this.load());
    } catch {
      this.loading = null; // (it has said so on the page, with a button to try again)
      return;
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
    this.root.hidden = this.canvas.hidden = true;
    document.body.classList.remove('in-gallery');
    this.root.querySelector('.panel')!.classList.remove('open');
    this.tip(null);
    this.made?.stage.sleep(true);
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  /** Show what an address names: a part (chosen, in the whole vehicle) or what stands there. */
  go(what: string, snap = false): void {
    if (!this.ready) return;
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
        <p class="sub">${esc(f.designation)} <b>·</b> ${date}</p>
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

      <aside class="panel">
        <nav class="tabs" role="tablist">
          ${tabs.map((t) => `<button role="tab" id="gallery-tab-${t}" data-tab="${t}" aria-controls="gallery-pane-${t}">${t}</button>`).join('')}
          <button class="close chevron" aria-label="Show or hide the panel" aria-expanded="true" title="Tuck away"></button>
        </nav>
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
        <nav class="steps" aria-label="Part by part">
          <button data-step="-1" title="The part before (B)"><i class="arrow back"></i>Previous</button>
          <output aria-live="off"></output>
          <button data-step="1" title="The next part (N)">Next part<i class="arrow"></i></button>
        </nav>
      </aside>

      <footer class="controls">
        <label class="explode"><span>${esc(m.slider?.[0] ?? 'Assembled')}</span>
          <input type="range" min="0" max="1" step="0.005" value="0" aria-label="${esc(m.slider ? `${m.slider[0]} to ${m.slider[1]}` : 'Take it apart')}" />
          <span>${esc(m.slider?.[1] ?? 'Exploded')}</span></label>
        <div class="buttons">
          <span class="set views" role="group" aria-label="View"></span>
          <span class="set" role="group" aria-label="Show">
            ${m.cutaway ? '<button data-cut class="switch" aria-pressed="false" title="Slice the skin open to what is inside (X)">Cutaway</button>' : ''}
            <button data-names class="switch" aria-pressed="false" title="Name each part as it comes clear of the rest">Labels</button>
            <button data-measure class="switch" aria-pressed="false" title="A person and a range pole beside it, for scale (G)">Scale</button>
            <button data-rotate class="switch" aria-pressed="true" title="Turn slowly round what was last chosen">Turntable</button>
            <button data-light class="switch" aria-pressed="false" title="A light room instead of a dark one (L)">Light</button>
            <button data-cel class="switch" aria-pressed="false" title="Draw it as a cel-shaded drawing (T)">Cel shading</button>
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
      <div class="tip" hidden><b></b><span></span></div>
      <div class="loading"><span>Loading</span><i></i><button hidden>Try again</button></div>`;
    this.q('.title .sub').after(placesNav(f, 'gallery', (to) => this.host.go(to)));
    for (const b of this.root.querySelectorAll<HTMLElement>('[data-plinth]'))
      b.setAttribute('aria-pressed', String(b.dataset.plinth === this.plinth.id));
    this.fill();
    this.tab('Parts');
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
    this.q('.views').innerHTML = this.model.views
      .map((v) => `<button data-view="${v.id}" aria-pressed="false">${esc(v.label)}</button>`)
      .join('');
    this.q('.explode').hidden = !this.vehicle.slider || !parts.some((p) => p.explode.some((v) => v !== 0));
  }

  private listen(): void {
    const root = this.root;
    const panel = this.q('.panel');
    // the panels tuck as the site's do, and the same choices are remembered for both
    const tuckPanel = (on: boolean) => {
      panel.classList.toggle('tucked', on);
      this.q('.close').setAttribute('aria-expanded', String(!on));
      prefs.set('panelTucked', on);
    };
    tuckPanel(prefs.get('panelTucked'));
    root.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) =>
      b.addEventListener('click', () => {
        const same = b.getAttribute('aria-selected') === 'true';
        panel.classList.toggle('open', !(same && panel.classList.contains('open')));
        tuckPanel(false);
        this.tab(b.dataset.tab!);
      }),
    );
    this.q('.close').addEventListener('click', () => {
      const tucked = panel.classList.contains('tucked');
      panel.classList.toggle('open', tucked);
      tuckPanel(!tucked);
    });
    this.untuck = () => {
      panel.classList.add('open');
      tuckPanel(false);
    };
    this.canvas.addEventListener('pointerdown', () => panel.classList.remove('open'));
    // On a phone the panel is a sheet, put away as the site's is: swiped down from its tabs, or from its content once
    // that is scrolled to the top (otherwise the swipe is a scroll). It follows the finger.
    let swipe: { y: number; pulling: boolean } | null = null;
    panel.addEventListener(
      'touchstart',
      (e) => {
        const pane = (e.target as HTMLElement).closest<HTMLElement>('[data-pane]');
        const sheet = panel.classList.contains('open') && matchMedia('(max-width: 960px) and (min-height: 521px)').matches;
        swipe = sheet && e.touches.length === 1 && (!pane || pane.scrollTop <= 0) ? { y: e.touches[0]!.clientY, pulling: false } : null;
      },
      { passive: true },
    );
    panel.addEventListener(
      'touchmove',
      (e) => {
        if (!swipe) return;
        const dy = e.touches[0]!.clientY - swipe.y;
        if (dy < 0 && !swipe.pulling) return void (swipe = null); // upward first: a scroll, not a dismissal
        swipe.pulling = dy > 6;
        if (e.cancelable) e.preventDefault();
        panel.style.transition = 'none';
        panel.style.transform = `translateY(${Math.max(0, dy)}px)`;
      },
      { passive: false },
    );
    const release = (e: TouchEvent) => {
      if (!swipe) return;
      const dy = (e.changedTouches[0]?.clientY ?? swipe.y) - swipe.y;
      swipe = null;
      panel.style.transition = panel.style.transform = '';
      if (dy > 70) panel.classList.remove('open');
    };
    panel.addEventListener('touchend', release);
    panel.addEventListener('touchcancel', release);
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

    this.q('.models').addEventListener('click', (e) => {
      const id = (e.target as HTMLElement).closest<HTMLElement>('[data-plinth]')?.dataset.plinth;
      const to = this.choices.find((p) => p.id === id);
      if (to && to !== this.plinth && this.ready) {
        this.stand(to);
        this.host.address(this.at);
      }
    });
    const slider = this.q<HTMLInputElement>('.explode input');
    slider.addEventListener('input', () => this.setApart(Number(slider.value)));
    const parts = this.q('.parts');
    const node = (e: Event) => (e.target as HTMLElement).closest<HTMLElement>('[data-node]')?.dataset.node ?? null;
    parts.addEventListener('pointerover', (e) => this.hover(node(e), false));
    parts.addEventListener('pointerleave', () => this.hover(null, false));
    parts.addEventListener('click', (e) => {
      const n = node(e);
      if (n) this.select(this.selected === n ? null : n);
    });
    this.q('.buttons').addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('button');
      if (!b || !this.ready) return;
      const on = b.getAttribute('aria-pressed') !== 'true';
      if (b.dataset.view) {
        this.made!.stage.view(b.dataset.view);
        this.turn();
      } else if (b.hasAttribute('data-cut')) this.setCutaway(on, true);
      else if (b.hasAttribute('data-names')) this.setNames(on);
      else if (b.hasAttribute('data-measure')) this.setMeasure(on);
      else if (b.hasAttribute('data-rotate')) this.setTurntable(on);
      else if (b.hasAttribute('data-light')) this.setLight(on);
      else if (b.hasAttribute('data-cel')) this.setCel(on);
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
    // any touch ends the show and puts off the next one (the mouse merely moving does not end one that is on)
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
  }
  private untuck: () => void = () => {};
  private showKeys: (open: boolean) => void = () => {};

  private async load(): Promise<void> {
    const bar = this.q('.loading');
    bar.classList.remove('done', 'failed');
    bar.querySelector('button')!.hidden = true;
    bar.querySelector('span')!.textContent = `Loading ${this.flight.callsign.toLowerCase()}`;
    const progress = (f: number) => bar.querySelector<HTMLElement>('i')!.style.setProperty('--p', String(f));
    progress(0);
    try {
      const stage = (this.own ??= new Stage(this.canvas));
      stage.fullDetail = true;
      stage.setLook(prefs.get('cel') ? 'cel' : 'real');
      await stage.load(this.staged, progress);
      const studio = asStudio(stage.place);
      if (!studio) throw new Error('the gallery is shown in the studio');
      this.made = { stage, studio };
      this.wire(stage);
      studio.setTone(prefs.get('galleryLight') ? 'light' : 'dark');
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
      await stage.warm(4000);
      this.ready = true;
      this.measure();
      if (navigator.webdriver) document.body.classList.add('instant'); // (a script taking pictures does not wait for a fade)
      this.canvas.classList.add('ready');
      bar.classList.add('done');
      if (!this.open) stage.sleep(true);
    } catch (e) {
      console.error(e);
      bar.classList.add('failed');
      bar.querySelector('button')!.hidden = false;
      bar.querySelector('span')!.textContent = `Could not load: ${e instanceof Error ? e.message : String(e)}`;
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
    this.labels.name(this.parts.map((p) => ({ id: p.node, name: p.name })));
    this.tab('Parts');
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
      this.tab('Parts');
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

  /** Where among the parts the one chosen is, said between the two buttons that step through them. */
  private tally(): void {
    const parts = this.parts;
    const at = parts.findIndex((p) => p.node === this.selected);
    this.q('.steps output').textContent = at < 0 ? `${parts.length} parts` : `${at + 1} of ${parts.length}`;
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
    this.q('.steps').hidden = name !== 'Parts';
    this.tally();
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
    // (what lies across the middle of the view covers it: on a wide page the controls stand in the column under the
    // title card, beside the view and not over it)
    const middle = view.left + view.width / 2;
    const across = (r: DOMRect) => r.left < middle && r.right > middle;
    const column = shown(controls) && !across(controls.getBoundingClientRect()) ? controls.getBoundingClientRect() : null;
    const rects = [controls, models]
      .filter(shown)
      .map((el) => el.getBoundingClientRect())
      .filter(across);
    const low = rects.map((r) => r.top).filter((top) => top > view.top + view.height / 2);
    const bottom = Math.min(view.bottom, ...low);
    const high = rects.map((r) => r.bottom).filter((b) => b < view.top + view.height / 2);
    // on a narrow page the title card and the switch beside it lie across the top of the view, as the bar does on a wide one
    const head = shown(title) && matchMedia('(max-width: 960px)').matches ? title.getBoundingClientRect().bottom : view.top;
    const top = Math.max(view.top, head, ...high);
    // a view is framed in what is left clear between what lies across the top and the controls
    this.made?.stage.setInset(Math.max(0, view.bottom - bottom), top - view.top);
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
    const anchors: Anchor[] = [];
    parts.forEach((p, i) => {
      const at = clear[i] ? stage.frameOf(p.node) : null;
      if (at) anchors.push({ id: p.node, ...at, width: this.labels.width(p.node) });
    });
    this.labels.place(layOut(anchors, this.clear));
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
    const put = (el: HTMLElement, at: { x: number; y: number } | null, html: string) => {
      el.classList.toggle('shown', Boolean(at));
      if (!at) return;
      if (el.dataset.says !== html) el.innerHTML = el.dataset.says = html;
      el.style.transform = `translate(${Math.round(at.x)}px, ${Math.round(Math.min(bottom, Math.max(top + 32, at.y)))}px)`;
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

import { prefs } from './prefs';
import { CAMERA_MODES, type CameraMode } from './viewer/fly';
import type { Confidence, Flight, ModelDef, Part } from './types';
import { Wheel } from './wheel';

export interface UiHandlers {
  model(id: string): void;
  explode(t: number): void;
  view(id: string): void;
  autoRotate(on: boolean): void;
  cutaway(on: boolean): void;
  /** How the view is moved: turning about a subject, or flying free. */
  camera(mode: CameraMode): void;
  /** Draw the scene as a cel-shaded drawing, or as it would look. */
  cel(on: boolean): void;
  /** Get down and walk the site as the figure whose section this is, or stop. */
  walk(on: boolean): void;
  /** The on-screen stick while walking: x to the right, y forward, each -1 to 1. */
  walkStick(x: number, y: number): void;
  /** The on-screen jump button while walking. */
  walkJump(): void;
  /** The on-screen act button while walking: offer what can be done with what is being looked at. */
  walkAct(): void;
  hoverPart(node: string | null): void;
  selectPart(node: string | null): void;
  /** How many pixels at the bottom of the 3D view the controls cover. */
  inset(pixels: number): void;
}

const CAMERA_LABEL: Record<CameraMode, string> = { orbit: 'Camera · orbit', fly: 'Camera · free fly' };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const clock = (t: number) => {
  const s = Math.round(t);
  return `T+${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

function si(value: number, unit: string): string {
  if (unit === 'N') return value >= 1000 ? `${(value / 1000).toFixed(value >= 1e5 ? 0 : 2)} kN` : `${value.toFixed(1)} N`;
  if (unit === 'kg') return `${value >= 100 ? Math.round(value).toLocaleString('en-US') : value.toFixed(1)} kg`;
  if (unit === 'deg') return `${value}°`;
  if (unit === 'kPa') return `${value.toFixed(1)} kPa`;
  if (unit === 'L') return `${Math.round(value).toLocaleString('en-US')} L`;
  if (unit === 'level') return `level ${value}`;
  return `${value.toFixed(value >= 10 ? 2 : 3)} ${unit}`;
}

const dot = (c: Confidence) => `<i class="conf ${c}" title="${c}"></i>`;

const legend = `<p class="fine legend"><span>${dot('documented')}documented</span><span>${dot('derived')}derived from documented</span><span>${dot('estimated')}estimated</span></p>`;

const TABS = ['Parts', 'Specs', 'Motors', 'Flight'] as const;
const pane = (name: (typeof TABS)[number]) => `data-pane="${name}" id="pane-${name}" role="tabpanel" aria-labelledby="tab-${name}"`;

/** The DOM half of the app. Everything it shows comes from the flight's data file. */
export class Ui {
  /** The radial menu of things to do with what a walker is looking at (wheel.ts). */
  readonly wheel: Wheel;
  private selected: string | null = null;
  private cameraMode: CameraMode = 'orbit';

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
    const f = flight;
    this.model = f.models[0]!;
    const date = new Date(f.launch).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    const groups = [...new Set(f.specs.map((s) => s.group))];
    root.innerHTML = `
      <header class="title">
        <button class="tuck chevron" aria-label="Show or hide the flight summary" aria-expanded="true" title="Tuck away"></button>
        <p class="crumbs"><button data-home title="Front page">Space Race</button> <b>/</b> ${esc(f.nation)} <b>/</b> ${esc(f.program)}</p>
        <h1>${esc(f.callsign)}</h1>
        <p class="sub">${esc(f.designation)} <b>·</b> ${date}</p>
        <p class="lede">${esc(f.summary)}</p>
        <dl class="facts">${f.facts.map((x) => `<div><dt>${esc(x.label)}</dt><dd>${esc(x.value)}</dd></div>`).join('')}</dl>
      </header>

      <nav class="models" aria-label="What to look at">
        ${f.models.map((m) => `<button data-model="${m.id}">${esc(m.name)}</button>`).join('')}
      </nav>

      <aside class="panel">
        <nav class="tabs" role="tablist">
          ${TABS.map((t) => `<button role="tab" id="tab-${t}" data-tab="${t}" aria-controls="pane-${t}">${t}</button>`).join('')}
          <button class="close chevron" aria-label="Show or hide the panel" aria-expanded="true" title="Tuck away"></button>
        </nav>
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
          <ol class="timeline">${f.timeline.map((e) => `<li><time>${clock(e.t)}</time><span>${esc(e.event)}</span></li>`).join('')}</ol>
          <p class="fine">${esc(f.spacecraft)}<br>${esc(f.launchVehicle)}<br>${esc(f.launchSite)}</p>
        </section>
      </aside>

      <footer class="controls">
        <label class="explode"><span data-slider="0"></span>
          <input type="range" min="0" max="1" step="0.01" value="0" />
          <span data-slider="1"></span></label>
        <div class="buttons"></div>
        <p class="scale"></p>
      </footer>
      <aside class="legend-keys" aria-label="Camera controls">
        <button class="legend-toggle" aria-expanded="true" title="Camera controls (?)">Controls<i class="chevron"></i></button>
        <div class="legend-body">
          <div class="cluster"><span class="pad wasd"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span><em>move</em></div>
          <div class="cluster"><span class="pad arrows"><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></span><em>orbit · tilt</em></div>
          <div class="cluster"><span class="pad pair"><kbd>E</kbd><kbd>Q</kbd></span><em>up · down</em></div>
          <div class="cluster"><span class="pad pair"><kbd>R</kbd><kbd>F</kbd></span><em>zoom</em></div>
          <dl>
            <div><dt>drag</dt><dd>orbit</dd></div>
            <div><dt>right-drag</dt><dd>move</dd></div>
            <div><dt>scroll</dt><dd>zoom to pointer</dd></div>
            <div><dt>click</dt><dd>go to it</dd></div>
            ${f.models.some((m) => m.walker) ? `<div><dt>double-click ${esc(f.models.find((m) => m.walker)!.name.toLowerCase())}</dt><dd>walk</dd></div>` : ''}
            <div><dt><kbd>C</kbd></dt><dd>camera: free fly</dd></div>
            ${f.models.some((m) => m.walker) ? '<div><dt><kbd>V</kbd></dt><dd>walk as crew</dd></div>' : ''}
            <div><dt><kbd>0</kbd></dt><dd>reset view</dd></div>
            <div><dt><kbd>T</kbd></dt><dd>cel shading</dd></div>
            <div><dt><kbd>H</kbd></dt><dd>hide panels</dd></div>
          </dl>
        </div>
        <div class="legend-body in-flight">
          <div class="cluster"><span class="pad wasd"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span><em>fly</em></div>
          <div class="cluster"><span class="pad arrows"><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></span><em>look</em></div>
          <div class="cluster"><span class="pad pair"><kbd>E</kbd><kbd>Q</kbd></span><em>up · down</em></div>
          <div class="cluster"><kbd>Shift</kbd><em>faster</em></div>
          <dl>
            <div><dt>drag</dt><dd>look round</dd></div>
            <div><dt>scroll</dt><dd>forward · back</dd></div>
            <div><dt>click</dt><dd>go to it</dd></div>
            <div><dt><kbd>C</kbd></dt><dd>camera: orbit</dd></div>
            ${f.models.some((m) => m.walker) ? '<div><dt><kbd>V</kbd></dt><dd>walk as crew</dd></div>' : ''}
            <div><dt><kbd>0</kbd></dt><dd>reset view</dd></div>
            <div><dt><kbd>T</kbd></dt><dd>cel shading</dd></div>
            <div><dt><kbd>H</kbd></dt><dd>hide panels</dd></div>
          </dl>
        </div>
        <div class="legend-body on-foot">
          <div class="cluster"><span class="pad wasd"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span><em>walk</em></div>
          <div class="cluster"><span class="pad arrows"><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></span><em>walk · turn</em></div>
          <div class="cluster"><kbd>Shift</kbd><em>run</em></div>
          <div class="cluster"><kbd>Space</kbd><em>jump</em></div>
          <dl>
            <div><dt>mouse</dt><dd>look round</dd></div>
            <div><dt><kbd>E</kbd></dt><dd>act on what you face</dd></div>
            <div><dt><kbd>Esc</kbd></dt><dd>stop walking</dd></div>
            <div><dt><kbd>T</kbd></dt><dd>cel shading</dd></div>
            <div><dt><kbd>H</kbd></dt><dd>hide panels</dd></div>
          </dl>
        </div>
      </aside>
      <div class="walkbar" hidden><span></span><button data-walk-exit>Exit walk</button></div>
      <div class="stick" aria-hidden="true"><i></i></div>
      <div class="walk-buttons"><button data-walk-jump>Jump</button><button data-walk-act hidden>Act</button></div>
      <div class="reticle" aria-hidden="true"><i></i><p><kbd>E</kbd><span></span></p></div>
      <aside class="walk-card" hidden aria-live="polite">
        <button class="card-close" aria-label="Close">×</button>
        <h3></h3><p class="card-what"></p><p class="card-more"></p><div class="pf"></div>
      </aside>
      <output class="stats" aria-label="Diagnostics"></output>
      <div class="tip" hidden><b></b><span></span></div>
      <div class="loading"><span>Loading</span><i></i><button hidden>Try again</button></div>`;

    // On a phone the panel is a sheet: tapping a tab opens it, tapping the open tab closes it.
    const panel = root.querySelector<HTMLElement>('.panel')!;
    root.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) =>
      b.addEventListener('click', () => {
        const same = b.getAttribute('aria-selected') === 'true';
        panel.classList.toggle('open', !(same && panel.classList.contains('open')));
        this.tuckPanel(false);
        this.tab(b.dataset.tab!);
      }),
    );
    const stage = document.querySelector<HTMLElement>('#stage')!;
    stage.addEventListener('pointerdown', () => panel.classList.remove('open'));
    // Panels tuck away. The data panel shuts to its row of tabs (on a phone it is a sheet that
    // does the same) and any tab opens it again; the title card folds to its heading; H clears
    // the lot for an unobstructed view.
    // Each of these choices is remembered (prefs.ts), so the page comes back the way it was left.
    this.tuckPanel(prefs.get('panelTucked'));
    root.querySelector('.close')!.addEventListener('click', () => {
      const tucked = panel.classList.contains('tucked');
      panel.classList.toggle('open', tucked);
      this.tuckPanel(!tucked);
    });
    const title = root.querySelector<HTMLElement>('.title')!;
    const tuck = title.querySelector<HTMLElement>('.tuck')!;
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
    // the camera legend folds to a word; whether it is open is remembered
    const legendKeys = root.querySelector<HTMLElement>('.legend-keys')!;
    const legendToggle = legendKeys.querySelector<HTMLElement>('.legend-toggle')!;
    const showLegend = (open: boolean) => {
      legendKeys.classList.toggle('folded', !open);
      legendToggle.setAttribute('aria-expanded', String(open));
      prefs.set('legendFolded', !open);
    };
    showLegend(!prefs.get('legendFolded'));
    legendToggle.addEventListener('click', () => showLegend(legendKeys.classList.contains('folded')));
    window.addEventListener('keydown', (e) => {
      const typing = (e.target as HTMLElement).matches?.('input:not([type=range]), textarea');
      if (e.metaKey || e.ctrlKey || e.altKey || typing) return;
      if (e.key.toLowerCase() === 'h') bare(!root.classList.contains('bare'));
      if (e.key.toLowerCase() === 't') this.setCel(!prefs.get('cel'));
      // C is the camera: it steps through the ways of moving the view (on foot it is the walker's, between first and third person)
      if (e.key.toLowerCase() === 'c' && !root.classList.contains('walking')) this.nextCamera();
      if (e.key === '?') showLegend(legendKeys.classList.contains('folded'));
    });
    // A sheet is put away by swiping it down: from its tabs at any time, or from its content
    // once that is scrolled to the top (otherwise the swipe is a scroll). It follows the finger.
    let swipe: { y: number; pulling: boolean } | null = null;
    panel.addEventListener(
      'touchstart',
      (e) => {
        const target = e.target as HTMLElement;
        const pane = target.closest<HTMLElement>('[data-pane]');
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
        if (e.cancelable) e.preventDefault(); // or the browser takes the gesture for a scroll and cancels the touch
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
    root.querySelector('[data-walk-exit]')!.addEventListener('click', () => on.walk(false));
    this.wheel = new Wheel(root);
    root.querySelector('[data-walk-act]')!.addEventListener('click', () => on.walkAct());
    root.querySelector('.card-close')!.addEventListener('click', () => this.showWalkCard(null));
    // (on the press, not the click: a jump is wanted now, and a finger held on the button must not look round)
    root.querySelector('[data-walk-jump]')!.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      on.walkJump();
    });
    // The walking stick, for a finger: push it the way you want to go, further to go faster.
    const stick = root.querySelector<HTMLElement>('.stick')!;
    const knob = stick.querySelector<HTMLElement>('i')!;
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
    root.querySelector('.loading button')!.addEventListener('click', () => on.model(this.model.id));
    root.querySelectorAll<HTMLButtonElement>('[data-model]').forEach((b) => b.addEventListener('click', () => on.model(b.dataset.model!)));
    root.querySelector('.tabs')!.addEventListener('keydown', (e) => {
      const key = (e as KeyboardEvent).key;
      if (key !== 'ArrowRight' && key !== 'ArrowLeft') return;
      const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-tab]')];
      const at = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
      const next = tabs[(at + (key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]!;
      this.tab(next.dataset.tab!);
      next.focus();
    });
    this.slider.addEventListener('input', () => on.explode(Number(this.slider.value)));
    // parts and view buttons are rebuilt per model, so their clicks are delegated
    const parts = root.querySelector<HTMLElement>('.parts')!;
    const node = (e: Event) => (e.target as HTMLElement).closest<HTMLElement>('[data-node]')?.dataset.node ?? null;
    parts.addEventListener('pointerover', (e) => on.hoverPart(node(e)));
    parts.addEventListener('pointerleave', () => on.hoverPart(null));
    parts.addEventListener('click', (e) => {
      const n = node(e);
      if (n) on.selectPart(this.selected === n ? null : n);
    });
    root.querySelector<HTMLElement>('.buttons')!.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('button');
      if (b?.dataset.view) on.view(b.dataset.view);
      else if (b?.hasAttribute('data-rotate')) this.setRotate(b.getAttribute('aria-pressed') !== 'true');
      else if (b?.hasAttribute('data-cut')) this.setCutaway(b.getAttribute('aria-pressed') !== 'true');
      else if (b?.hasAttribute('data-walk')) on.walk(true);
      else if (b?.hasAttribute('data-camera')) this.nextCamera();
      else if (b?.hasAttribute('data-cel')) this.setCel(b.getAttribute('aria-pressed') !== 'true');
    });
    // the label that follows the pointer over the model
    window.addEventListener('pointermove', (e) => {
      this.pointer = [e.clientX, e.clientY];
      this.placeTip();
    });
    // the phone layout stacks the switcher on the control block, whose height depends on wrapping
    const controls = root.querySelector<HTMLElement>('.controls')!;
    const switcher = root.querySelector<HTMLElement>('.models')!;
    const measure = new ResizeObserver(() => {
      root.style.setProperty('--controls-h', `${controls.offsetHeight}px`);
      // whatever sits over the lower half of the 3D view hides that much of it: views are framed above
      const view = stage.getBoundingClientRect();
      const tops = [controls, switcher]
        .filter((el) => el.offsetParent !== null)
        .map((el) => el.getBoundingClientRect().top)
        .filter((top) => top > view.top + view.height / 2);
      on.inset(Math.max(0, view.bottom - Math.min(view.bottom, ...tops)));
    });
    for (const el of [controls, switcher, stage, panel]) measure.observe(el);
    this.setModel(this.model.id);
  }

  /** Beside the pointer, on whichever side has room. */
  private placeTip(): void {
    const tip = this.root.querySelector<HTMLElement>('.tip')!;
    if (tip.hidden) return;
    const [x, y] = this.pointer;
    const left = x > window.innerWidth * 0.6;
    tip.classList.toggle('left', left);
    tip.style.transform = `translate(${left ? x - 26 - tip.offsetWidth : x + 26}px, ${Math.max(8, y - 14)}px)`;
  }

  private get slider(): HTMLInputElement {
    return this.root.querySelector<HTMLInputElement>('input[type=range]')!;
  }

  /** Rebuild everything that belongs to one model: its parts, its views, its scale line. */
  setModel(id: string, apart = 0): void {
    const m = (this.model = this.flight.models.find((x) => x.id === id) ?? this.model);
    const r = this.root;
    r.querySelectorAll<HTMLElement>('[data-model]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.model === m.id)));
    r.querySelector('.parts')!.innerHTML = m.parts
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
        <span class="more">${esc(p.detail)}${p.facts ? `<span class="pf">${p.facts.map(([k, v]) => `<span><i>${esc(k)}</i>${esc(v)}</span>`).join('')}</span>` : ''}</span>
      </button></li>`,
      )
      .join('');
    const rotating = r.querySelector('[data-rotate]')?.getAttribute('aria-pressed') ?? 'true';
    r.querySelector('.buttons')!.innerHTML =
      `<span class="set" role="group" aria-label="View">${[...(m.wide === false ? [] : [{ id: 'all', label: 'Wide' }]), ...m.views]
        .map((v) => `<button data-view="${v.id}" aria-pressed="false">${esc(v.label)}</button>`)
        .join('')}</span>` +
      `<span class="set" role="group" aria-label="Show">${m.walker ? `<button data-walk title="Walk the site as ${esc(m.name)} (or double-click the figure)">Walk</button>` : ''}${m.cutaway ? '<button data-cut aria-pressed="false">Cutaway</button>' : ''}` +
      `<button data-camera title="How the view moves (C)">${CAMERA_LABEL[this.cameraMode]}</button>` +
      `<button data-rotate aria-pressed="${rotating}">Auto-orbit</button>` +
      `<button data-cel aria-pressed="${prefs.get('cel')}" title="Cel shading (T)">Cel shading</button></span>`;
    this.slider.setAttribute('aria-label', m.slider ? `${m.slider[0]} to ${m.slider[1]}` : '');
    // this model's own figures first
    const specs = r.querySelector('[data-pane="Specs"]')!;
    for (const g of [...(m.specGroups ?? [])].reverse()) {
      const el = specs.querySelector(`[data-group="${g}"]`);
      if (el) specs.prepend(el);
    }
    r.querySelector('.scale')!.textContent = m.scale;
    r.querySelector<HTMLElement>('.explode')!.hidden = !m.slider;
    r.querySelector('[data-slider="0"]')!.textContent = m.slider?.[0] ?? '';
    r.querySelector('[data-slider="1"]')!.textContent = m.slider?.[1] ?? '';
    this.slider.value = String(apart);
    this.selected = null;
    this.tab('Parts');
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

  /** How the view is moved, for every section, and remembered. */
  setCamera(mode: CameraMode): void {
    this.cameraMode = mode;
    prefs.set('fly', mode === 'fly');
    this.root.classList.toggle('flying', mode === 'fly');
    const b = this.root.querySelector('[data-camera]');
    if (b) b.textContent = CAMERA_LABEL[mode];
    this.on.camera(mode);
  }

  private nextCamera(): void {
    this.setCamera(CAMERA_MODES[(CAMERA_MODES.indexOf(this.cameraMode) + 1) % CAMERA_MODES.length]!);
  }

  /** Cel shading on or off: for every section, and remembered. */
  setCel(on: boolean): void {
    prefs.set('cel', on);
    this.root.querySelector('[data-cel]')?.setAttribute('aria-pressed', String(on));
    this.on.cel(on);
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
  private tuckPanel(on: boolean): void {
    this.root.querySelector('.panel')!.classList.toggle('tucked', on);
    this.root.querySelector('.close')!.setAttribute('aria-expanded', String(!on));
    prefs.set('panelTucked', on);
  }

  /** Walking on foot has begun or ended: the panels make way for the view, and one bar says how to stop. */
  setWalking(on: boolean): void {
    this.root.classList.toggle('walking', on);
    this.root.querySelector<HTMLElement>('.walkbar')!.hidden = !on;
    this.root.querySelector('.panel')!.classList.remove('open'); // a phone's sheet would keep its share of the screen
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

  /** While walking: the name of what is being looked at from within reach and can be acted on, or null. The reticle says so. */
  setWalkTarget(name: string | null): void {
    const reticle = this.root.querySelector<HTMLElement>('.reticle')!;
    reticle.classList.toggle('on', Boolean(name));
    reticle.querySelector('span')!.textContent = name ?? '';
    reticle.querySelector('kbd')!.textContent = matchMedia('(hover: none), (pointer: coarse)').matches ? 'hold' : 'E';
    this.root.querySelector<HTMLElement>('[data-walk-act]')!.hidden = !name;
  }

  /** While walking: a compact card of what the flight's data says about a part (not the orbit view's panel), or null to put it away. */
  showWalkCard(part: Part | null): void {
    const card = this.root.querySelector<HTMLElement>('.walk-card')!;
    card.hidden = !part;
    if (!part) return;
    card.querySelector('h3')!.textContent = part.name;
    card.querySelector('.card-what')!.textContent = part.summary;
    card.querySelector('.card-more')!.textContent = part.detail;
    card.querySelector('.pf')!.innerHTML = (part.facts ?? []).map(([k, v]) => `<span><i>${esc(k)}</i>${esc(v)}</span>`).join('');
    card.scrollTop = 0;
  }

  get walkCardOpen(): boolean {
    return !this.root.querySelector<HTMLElement>('.walk-card')!.hidden;
  }

  /** While walking: whether the mouse has been captured for looking round. The bar says what to do next. */
  setWalkLook(captured: boolean): void {
    const touch = matchMedia('(hover: none), (pointer: coarse)').matches;
    this.root.querySelector('.walkbar span')!.textContent = touch
      ? 'Drag to look · stick walks'
      : captured
        ? 'Mouse looks · WASD walks · Shift runs · Esc stops'
        : 'Click the view to look round · WASD walks · Esc stops';
  }

  /** The diagnostics line: this is an early build, and the numbers are worth having in view. */
  setStats(text: string): void {
    this.root.querySelector('.stats')!.textContent = text;
  }

  loading(what: string): void {
    const el = this.root.querySelector<HTMLElement>('.loading')!;
    el.classList.remove('done', 'failed');
    el.querySelector('button')!.hidden = true;
    el.querySelector('span')!.textContent = `Loading ${what.toLowerCase()}`;
    this.setProgress(0);
  }

  setProgress(fraction: number): void {
    this.root.querySelector<HTMLElement>('.loading i')!.style.setProperty('--p', String(fraction));
  }

  loaded(): void {
    this.root.querySelector('.loading')!.classList.add('done');
  }

  failed(message: string): void {
    const el = this.root.querySelector<HTMLElement>('.loading')!;
    el.classList.add('failed');
    el.querySelector('button')!.hidden = false;
    el.querySelector('span')!.textContent = `Could not load: ${message}`;
  }

  /** A part under the pointer in the 3D view. */
  hover(node: string | null): void {
    const tip = this.root.querySelector<HTMLElement>('.tip')!;
    const part = this.model.parts.find((p) => p.node === node);
    // not for the part already selected: its name is on the panel, and the label would sit on it
    if (part) delete tip.dataset.model;
    // (with no part under the pointer the label may be showing a neighbouring model instead: leave it)
    if (!tip.dataset.model) tip.hidden = !part || node === this.selected || matchMedia('(hover: none)').matches;
    if (part) {
      tip.querySelector('b')!.textContent = part.name;
      tip.querySelector('span')!.textContent = part.summary + (this.model.walker ? ` Double-click to walk as ${this.model.name}.` : '');
      this.placeTip();
    }
    this.root.querySelectorAll<HTMLElement>('[data-node]').forEach((b) => b.classList.toggle('hot', b.dataset.node === node));
  }

  /** A label beside the pointer for something that is not a part: a window to look through. */
  hint(text: [title: string, line: string] | null): void {
    const tip = this.root.querySelector<HTMLElement>('.tip')!;
    if (!text) {
      if (tip.dataset.model === '-') {
        tip.hidden = true;
        delete tip.dataset.model;
      }
      return;
    }
    tip.dataset.model = '-';
    tip.hidden = matchMedia('(hover: none)').matches;
    tip.querySelector('b')!.textContent = text[0];
    tip.querySelector('span')!.textContent = text[1];
    this.placeTip();
  }

  /** Another of the flight's models under the pointer: a click would open it. */
  hoverModel(id: string | null): void {
    const tip = this.root.querySelector<HTMLElement>('.tip')!;
    const model = this.flight.models.find((m) => m.id === id);
    if (!model) {
      if (tip.dataset.model) tip.hidden = true;
      delete tip.dataset.model;
      return;
    }
    tip.dataset.model = model.id;
    tip.hidden = matchMedia('(hover: none)').matches;
    tip.querySelector('b')!.textContent = model.name;
    tip.querySelector('span')!.textContent = model.walker ? `Click to open · double-click to walk as ${model.name}` : 'Click to open';
    this.placeTip();
  }

  select(node: string | null): void {
    this.selected = node;
    if (node) {
      this.tab('Parts');
      this.root.querySelector('.panel')!.classList.add('open');
      this.tuckPanel(false);
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
  }
}

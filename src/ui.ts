import type { Confidence, Flight, ModelDef } from './types';

export interface UiHandlers {
  model(id: string): void;
  explode(t: number): void;
  view(id: string): void;
  autoRotate(on: boolean): void;
  cutaway(on: boolean): void;
  hoverPart(node: string | null): void;
  selectPart(node: string | null): void;
  /** How many pixels at the bottom of the 3D view the controls cover. */
  inset(pixels: number): void;
}

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
  private selected: string | null = null;

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
        <p class="crumbs">Space Race <b>/</b> ${esc(f.nation)} <b>/</b> ${esc(f.program)}</p>
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
          <button class="close" aria-label="Close panel">Close</button>
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
      <div class="tip" hidden><b></b><span></span></div>
      <div class="loading"><span>Loading</span><i></i><button hidden>Try again</button></div>`;

    // On a phone the panel is a sheet: tapping a tab opens it, tapping the open tab closes it.
    const panel = root.querySelector<HTMLElement>('.panel')!;
    root.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) =>
      b.addEventListener('click', () => {
        const same = b.getAttribute('aria-selected') === 'true';
        panel.classList.toggle('open', !(same && panel.classList.contains('open')));
        this.tab(b.dataset.tab!);
      }),
    );
    const stage = document.querySelector<HTMLElement>('#stage')!;
    stage.addEventListener('pointerdown', () => panel.classList.remove('open'));
    root.querySelector('.close')!.addEventListener('click', () => panel.classList.remove('open'));
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
  setModel(id: string): void {
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
      `<span class="set" role="group" aria-label="Show">${m.cutaway ? '<button data-cut aria-pressed="false">Cutaway</button>' : ''}` +
      `<button data-rotate aria-pressed="${rotating}">Auto-orbit</button></span>`;
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
    this.slider.value = '0';
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

  setRotate(on: boolean): void {
    this.root.querySelector('[data-rotate]')!.setAttribute('aria-pressed', String(on));
    this.on.autoRotate(on);
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
      tip.querySelector('span')!.textContent = part.summary;
      this.placeTip();
    }
    this.root.querySelectorAll<HTMLElement>('[data-node]').forEach((b) => b.classList.toggle('hot', b.dataset.node === node));
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
    tip.querySelector('span')!.textContent = 'Click to open';
    this.placeTip();
  }

  select(node: string | null): void {
    this.selected = node;
    if (node) {
      this.tab('Parts');
      this.root.querySelector('.panel')!.classList.add('open');
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

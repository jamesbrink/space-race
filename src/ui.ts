import type { Confidence, Flight, ModelDef } from './types';

export interface UiHandlers {
  model(id: string): void;
  explode(t: number): void;
  view(id: string): void;
  autoRotate(on: boolean): void;
  hoverPart(node: string | null): void;
  selectPart(node: string | null): void;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const clock = (t: number) => `T+${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;

function si(value: number, unit: string): string {
  if (unit === 'N') return value >= 1000 ? `${(value / 1000).toFixed(value >= 1e5 ? 0 : 2)} kN` : `${value.toFixed(1)} N`;
  if (unit === 'kg') return `${value >= 100 ? Math.round(value).toLocaleString('en-US') : value.toFixed(1)} kg`;
  if (unit === 'deg') return `${value}°`;
  if (unit === 'kPa') return `${value.toFixed(1)} kPa`;
  return `${value.toFixed(value >= 10 ? 2 : 3)} ${unit}`;
}

const dot = (c: Confidence) => `<i class="conf ${c}" title="${c}"></i>`;

const legend = `<p class="fine legend">${dot('documented')}published figure ${dot('derived')}computed from one ${dot('estimated')}read off photographs</p>`;

/** The DOM half of the app. Everything it shows comes from the flight's data file. */
export class Ui {
  private selected: string | null = null;
  private model: ModelDef;

  constructor(private readonly root: HTMLElement, private readonly flight: Flight, private readonly on: UiHandlers) {
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
          ${['Parts', 'Specs', 'Motors', 'Flight'].map((t, i) => `<button role="tab" data-tab="${t}" aria-selected="${i === 0}">${t}</button>`).join('')}
        </nav>
        <section data-pane="Parts"><ol class="parts"></ol></section>
        <section data-pane="Specs" hidden>
          ${groups.map((g) => `
            <h2>${esc(g)}</h2>
            <table>${f.specs.filter((s) => s.group === g).map((s) => `
              <tr><th>${dot(s.confidence)}${esc(s.label)}</th><td>${si(s.value, s.unit)}${s.note ? `<small>${esc(s.note)}</small>` : ''}</td></tr>`).join('')}
            </table>`).join('')}
          ${legend}
        </section>
        <section data-pane="Motors" hidden>
          <table>${f.motors.map((m) => `
            <tr><th>${dot(m.confidence)}${m.count} × ${esc(m.name)}<small>${esc(m.propellant)}${m.note ? ` · ${esc(m.note)}` : ''}</small></th>
            <td>${si(m.thrustN, 'N')}${m.burnS ? `<small>${m.burnS} s burn</small>` : '<small>pulsed</small>'}</td></tr>`).join('')}
          </table>
          ${legend}
        </section>
        <section data-pane="Flight" hidden>
          <ol class="timeline">${f.timeline.map((e) => `<li><time>${clock(e.t)}</time><span>${esc(e.event)}</span></li>`).join('')}</ol>
          <p class="fine">${esc(f.spacecraft)}<br>${esc(f.launchVehicle)}<br>${esc(f.launchSite)}</p>
        </section>
      </aside>

      <footer class="controls">
        <label class="explode"><span data-slider="0"></span>
          <input type="range" min="0" max="1" step="0.001" value="0" aria-label="Take apart" />
          <span data-slider="1"></span></label>
        <div class="buttons"></div>
        <p class="scale"></p>
      </footer>
      <div class="loading"><span>Loading</span><i></i></div>`;

    root.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) => b.addEventListener('click', () => this.tab(b.dataset.tab!)));
    root.querySelectorAll<HTMLButtonElement>('[data-model]').forEach((b) => b.addEventListener('click', () => on.model(b.dataset.model!)));
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
    });
    this.setModel(this.model.id);
  }

  private get slider(): HTMLInputElement {
    return this.root.querySelector<HTMLInputElement>('input[type=range]')!;
  }

  /** Rebuild everything that belongs to one model: its parts, its views, its scale line. */
  setModel(id: string): void {
    const m = (this.model = this.flight.models.find((x) => x.id === id) ?? this.model);
    const r = this.root;
    r.querySelectorAll<HTMLElement>('[data-model]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.model === m.id)));
    r.querySelector('.parts')!.innerHTML = m.parts.map((p, i) => `
      <li><button data-node="${p.node}">
        <span class="n">${String(i + 1).padStart(2, '0')}</span>
        <span class="name">${esc(p.name)}</span>
        <span class="what">${esc(p.summary)}</span>
        <span class="more">${esc(p.detail)}</span>
      </button></li>`).join('');
    const rotating = r.querySelector('[data-rotate]')?.getAttribute('aria-pressed') ?? 'true';
    r.querySelector('.buttons')!.innerHTML =
      [{ id: 'all', label: 'Everything' }, ...m.views].map((v) => `<button data-view="${v.id}">${esc(v.label)}</button>`).join('') +
      `<button data-rotate aria-pressed="${rotating}">Rotate</button>`;
    r.querySelector('.scale')!.textContent = m.scale;
    r.querySelector('[data-slider="0"]')!.textContent = m.slider[0];
    r.querySelector('[data-slider="1"]')!.textContent = m.slider[1];
    this.slider.value = '0';
    this.selected = null;
    this.tab('Parts');
  }

  setRotate(on: boolean): void {
    this.root.querySelector('[data-rotate]')!.setAttribute('aria-pressed', String(on));
    this.on.autoRotate(on);
  }

  loading(what: string): void {
    const el = this.root.querySelector<HTMLElement>('.loading')!;
    el.classList.remove('done', 'failed');
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
    el.querySelector('span')!.textContent = `Could not load: ${message}`;
  }

  /** A part under the pointer in the 3D view. */
  hover(node: string | null): void {
    this.root.querySelectorAll<HTMLElement>('[data-node]').forEach((b) => b.classList.toggle('hot', b.dataset.node === node));
  }

  select(node: string | null): void {
    this.selected = node;
    if (node) this.tab('Parts');
    this.root.querySelectorAll<HTMLElement>('[data-node]').forEach((b) => {
      const on = b.dataset.node === node;
      b.setAttribute('aria-expanded', String(on));
      if (on) b.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  private tab(name: string): void {
    this.root.querySelectorAll<HTMLElement>('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
    this.root.querySelectorAll<HTMLElement>('[data-pane]').forEach((p) => (p.hidden = p.dataset.pane !== name));
  }
}

import type { Confidence, Flight } from './types';
import type { View } from './viewer/stage';

export interface UiHandlers {
  explode(t: number): void;
  view(view: View): void;
  autoRotate(on: boolean): void;
  hoverPart(node: string | null): void;
  selectPart(node: string | null): void;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const clock = (t: number) => `T+${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;

function si(value: number, unit: string): string {
  if (unit === 'N') return value >= 1000 ? `${(value / 1000).toFixed(value >= 1e5 ? 0 : 2)} kN` : `${value.toFixed(1)} N`;
  if (unit === 'kg') return `${Math.round(value).toLocaleString('en-US')} kg`;
  if (unit === 'deg') return `${value}°`;
  return `${value.toFixed(3)} ${unit}`;
}

const dot = (c: Confidence) => `<i class="conf ${c}" title="${c}"></i>`;

/** The DOM half of the app. Everything it shows comes from the flight's data file. */
export class Ui {
  private readonly root: HTMLElement;
  private selected: string | null = null;

  constructor(root: HTMLElement, flight: Flight, private readonly on: UiHandlers) {
    this.root = root;
    const f = flight;
    const date = new Date(f.launch).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    root.innerHTML = `
      <header class="title">
        <p class="crumbs">Space Race <b>/</b> ${esc(f.nation)} <b>/</b> ${esc(f.program)}</p>
        <h1>${esc(f.callsign)}</h1>
        <p class="sub">${esc(f.designation)} <b>·</b> ${date}</p>
        <p class="lede">${esc(f.summary)}</p>
        <dl class="facts">${f.facts.map((x) => `<div><dt>${esc(x.label)}</dt><dd>${esc(x.value)}</dd></div>`).join('')}</dl>
      </header>

      <aside class="panel">
        <nav class="tabs" role="tablist">
          ${['Parts', 'Specs', 'Motors', 'Flight'].map((t, i) => `<button role="tab" data-tab="${t}" aria-selected="${i === 0}">${t}</button>`).join('')}
        </nav>
        <section data-pane="Parts">
          <ol class="parts">${f.parts.map((p, i) => `
            <li><button data-node="${p.node}">
              <span class="n">${String(i + 1).padStart(2, '0')}</span>
              <span class="name">${esc(p.name)}</span>
              <span class="what">${esc(p.summary)}</span>
              <span class="more">${esc(p.detail)}</span>
            </button></li>`).join('')}
          </ol>
        </section>
        <section data-pane="Specs" hidden>
          <table>${f.specs.map((s) => `
            <tr><th>${dot(s.confidence)}${esc(s.label)}</th><td>${si(s.value, s.unit)}${s.note ? `<small>${esc(s.note)}</small>` : ''}</td></tr>`).join('')}
          </table>
          ${legend()}
        </section>
        <section data-pane="Motors" hidden>
          <table>${f.motors.map((m) => `
            <tr><th>${dot(m.confidence)}${m.count} × ${esc(m.name)}<small>${esc(m.propellant)}${m.note ? ` · ${esc(m.note)}` : ''}</small></th>
            <td>${si(m.thrustN, 'N')}${m.burnS ? `<small>${m.burnS} s burn</small>` : '<small>pulsed</small>'}</td></tr>`).join('')}
          </table>
          ${legend()}
        </section>
        <section data-pane="Flight" hidden>
          <ol class="timeline">${f.timeline.map((e) => `<li><time>${clock(e.t)}</time><span>${esc(e.event)}</span></li>`).join('')}</ol>
          <p class="fine">${esc(f.spacecraft)}<br>${esc(f.launchVehicle)}<br>${esc(f.launchSite)}</p>
        </section>
      </aside>

      <footer class="controls">
        <label class="explode"><span>Assembled</span>
          <input type="range" min="0" max="1" step="0.001" value="0" aria-label="Exploded view" />
          <span>Exploded</span></label>
        <div class="buttons">
          <button data-view="stack">Full stack</button>
          <button data-view="spacecraft">Spacecraft</button>
          <button data-view="capsule">Capsule</button>
          <button data-rotate aria-pressed="true">Rotate</button>
        </div>
        <p class="scale">${f.model.heightM.toFixed(2)} m on the pad <b>·</b> spacecraft ${f.model.spacecraftHeightM.toFixed(2)} m <b>·</b> to scale</p>
      </footer>
      <div class="loading"><span>Loading spacecraft</span><i></i></div>`;

    root.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) =>
      b.addEventListener('click', () => this.tab(b.dataset.tab!)));
    root.querySelectorAll<HTMLButtonElement>('[data-node]').forEach((b) => {
      b.addEventListener('pointerenter', () => on.hoverPart(b.dataset.node!));
      b.addEventListener('pointerleave', () => on.hoverPart(null));
      b.addEventListener('click', () => on.selectPart(this.selected === b.dataset.node ? null : b.dataset.node!));
    });
    root.querySelector<HTMLInputElement>('input[type=range]')!.addEventListener('input', (e) =>
      on.explode(Number((e.target as HTMLInputElement).value)));
    root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) =>
      b.addEventListener('click', () => on.view(b.dataset.view as View)));
    root.querySelector<HTMLButtonElement>('[data-rotate]')!.addEventListener('click', () => this.setRotate(!this.rotating));
  }

  private get rotating(): boolean {
    return this.root.querySelector('[data-rotate]')!.getAttribute('aria-pressed') === 'true';
  }

  setRotate(on: boolean): void {
    this.root.querySelector('[data-rotate]')!.setAttribute('aria-pressed', String(on));
    this.on.autoRotate(on);
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
    el.querySelector('span')!.textContent = `Could not load the spacecraft: ${message}`;
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

function legend(): string {
  return `<p class="fine legend">${dot('documented')}published figure ${dot('derived')}computed from one ${dot('estimated')}read off photographs</p>`;
}

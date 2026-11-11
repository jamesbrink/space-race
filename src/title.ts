import './title.css';
import { logo } from './logo';
import type { Flight } from './types';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const date = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/**
 * The front page: the mark, and the flights there are to go into. It lies over the scene, which
 * is already loading and turning behind it, so going in is lifting a curtain and not a wait.
 * It is shown only when the address names nothing: a link or a refresh goes straight to its place.
 */
export class Title {
  private readonly root: HTMLElement;

  constructor(parent: HTMLElement, flights: Flight[], enter: (flightId: string) => void) {
    this.root = document.createElement('div');
    this.root.id = 'title';
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="title-mark">
        ${logo()}
        <p class="title-line">Every crewed spacecraft <i>·</i> to scale <i>·</i> as it flew</p>
      </div>
      <nav class="title-flights" aria-label="Flights">
        ${flights
          .map(
            (f, i) => `
          <button data-flight="${esc(f.id)}"${i === 0 ? ' autofocus' : ''}>
            <span class="n">${String(i + 1).padStart(2, '0')}</span>
            <span class="what"><b>${esc(f.callsign)}</b><em>${esc(f.designation)} · ${esc(f.crew.join(', '))}</em></span>
            <span class="when">${esc(f.nation)} · ${date(f.launch)}</span>
            <span class="go" aria-hidden="true">Enter</span>
          </button>`,
          )
          .join('')}
      </nav>
      <p class="title-foot">Vehicle, launch pad and crew of each flight, with every figure marked documented, derived or estimated.</p>
      <p class="title-rights">Copyright © 2026 James Brink</p>`;
    parent.append(this.root);
    this.root.addEventListener('click', (e) => {
      const id = (e.target as HTMLElement).closest<HTMLElement>('[data-flight]')?.dataset.flight;
      if (id) enter(id);
    });
  }

  get showing(): boolean {
    return !this.root.hidden;
  }

  show(): void {
    this.root.hidden = false;
    this.root.classList.remove('leaving');
    document.body.classList.add('titled');
    this.root.querySelector<HTMLElement>('[data-flight]')?.focus({ preventScroll: true });
  }

  /** Lift the curtain: the page fades and the scene behind it is the one to use. */
  hide(): void {
    if (this.root.hidden) return;
    document.body.classList.remove('titled');
    this.root.classList.add('leaving');
    const done = () => {
      this.root.hidden = true;
      this.root.classList.remove('leaving');
    };
    this.root.addEventListener('transitionend', done, { once: true });
    setTimeout(done, 700); // if no transition runs (reduced motion), still go
  }
}

import './title.css';
import { listed } from './address';
import { logo } from './logo';
import type { Flight } from './types';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const date = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/**
 * The front page's words: the mark, and the flights there are to go into, over the page's own
 * picture (front.ts: the Earth from out by the Moon). It is shown only when the address names
 * nothing: a link or a refresh goes straight to its place. Left alone it makes way for the
 * picture (`tuck`) and comes back at a touch.
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
        ${listed(flights)
          .map((f, i) => {
            const n = `<span class="n">${String(i + 1).padStart(2, '0')}</span>`;
            // (one that is to come is a line, not a way in: it says what will be here and when it flew)
            if (!('callsign' in f))
              return `
          <p class="to-come">
            ${n}
            <span class="what"><b>${esc(f.name)}</b><em>${esc(f.line)}</em></span>
            <span class="when">${esc(f.nation)} · ${date(f.launch)}</span>
            <span class="go">To come</span>
          </p>`;
            return `
          <button data-flight="${esc(f.id)}">
            ${n}
            <span class="what"><b>${esc(f.callsign)}</b><em>${esc(f.designation)} · ${esc(f.crew.join(', '))}</em></span>
            <span class="when">${esc(f.nation)} · ${date(f.launch)}</span>
            <span class="go" aria-hidden="true">Enter</span>
          </button>`;
          })
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

  /** Make way for the picture behind (the page has been left alone), or come back. */
  tuck(on: boolean): void {
    this.root.classList.toggle('tucked', on);
  }

  get tucked(): boolean {
    return this.root.classList.contains('tucked');
  }

  /** A flight has been chosen: the words fade, and the picture stays until the flight is there. */
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

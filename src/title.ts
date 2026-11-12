import './title.css';
import { entrances, opensIn, type Place } from './address';
import { logo } from './logo';
import type { Flight } from './types';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const date = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/**
 * The front page: the mark, and the flights there are to go into. It lies over the scene, which
 * is already loading and turning behind it, so going in is lifting a curtain and not a wait.
 * It is shown only when the address names nothing: a link or a refresh goes straight to its place.
 *
 * A flight has two ways in where it has both places (address.ts): the site it flew from, and the
 * gallery, where its vehicle stands alone. One whose site is not built yet has the gallery only,
 * and says so. The row itself goes where the flight opens.
 */
export class Title {
  private readonly root: HTMLElement;

  constructor(parent: HTMLElement, flights: Flight[], enter: (flightId: string, place: Place) => void) {
    this.root = document.createElement('div');
    this.root.id = 'title';
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="title-mark">
        ${logo()}
        <p class="title-line">Every crewed spacecraft <i>·</i> to scale <i>·</i> as it flew</p>
      </div>
      <nav class="title-flights" aria-label="Flights">
        ${[...flights]
          .sort((a, b) => Date.parse(a.launch) - Date.parse(b.launch))
          .map((f, i) => {
            const has = entrances(f);
            const way = (place: Place, label: string, title: string, first: boolean) =>
              has[place] ? `<button data-place="${place}" title="${esc(title)}"${first ? ' autofocus' : ''}>${label}</button>` : '';
            return `
          <div class="title-flight" data-flight="${esc(f.id)}">
            <span class="n">${String(i + 1).padStart(2, '0')}</span>
            <span class="what"><b>${esc(f.callsign)}</b><em>${esc(f.designation)} · ${esc(f.crew.join(', '))}</em>${
              has.site ? '' : '<small>Spacecraft only: its launch site is not built yet</small>'
            }</span>
            <span class="when">${esc(f.nation)} · ${date(f.launch)}</span>
            <span class="ways">${way('site', 'Launch site', `Where it flew from: ${f.launchSite}`, i === 0)}${way(
              'gallery',
              'Gallery',
              'The vehicle alone: turn it, take it apart, read it',
              i === 0 && !has.site,
            )}</span>
          </div>`;
          })
          .join('')}
      </nav>
      <p class="title-foot">Each flight at the place it flew from, and its vehicle alone in the gallery, with every figure marked documented, derived or estimated.</p>
      <p class="title-rights">Copyright © 2026 James Brink</p>`;
    parent.append(this.root);
    this.root.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const id = target.closest<HTMLElement>('[data-flight]')?.dataset.flight;
      const flight = flights.find((f) => f.id === id);
      // one of its two ways in, or anywhere else on its row: where it opens
      if (flight)
        enter(flight.id, opensIn(flight, (target.closest<HTMLElement>('[data-place]')?.dataset.place as Place | undefined) ?? null));
    });
  }

  get showing(): boolean {
    return !this.root.hidden;
  }

  show(): void {
    this.root.hidden = false;
    this.root.classList.remove('leaving');
    document.body.classList.add('titled');
    this.root.querySelector<HTMLElement>('[data-place]')?.focus({ preventScroll: true });
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

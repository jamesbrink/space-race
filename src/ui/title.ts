import './title.css';
import { type Browse, browseOf, exhibit, listed, programmeName } from '../app/address.ts';
import { logo } from './logo.ts';
import type { Flight } from '../types.ts';
import { esc } from '../util/dom.ts';

const date = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/**
 * The front page's words: the mark, the way into the Lineup, and the flights there are to go into, over the page's own
 * picture (front.ts: the Earth from out by the Moon). It is shown only when the address names
 * nothing: a link or a refresh goes straight to its place. Left alone it makes way for the
 * picture (`tuck`) and comes back at a touch.
 */
export class Title {
  private readonly root: HTMLElement;

  /** What the list is narrowed to, and who is told when that is changed (the page: the address says it). */
  private at: Browse = { nation: null, programme: null };

  constructor(
    parent: HTMLElement,
    flights: Flight[],
    enter: (flightId: string) => void,
    lineup?: () => void,
    browse?: { at: Browse; to: (to: Browse) => void },
  ) {
    const built = flights.filter((f) => exhibit(f)).length;
    const all = listed(flights);
    // the nations and their programmes, each in the order its first flight flew; a programme by its short name
    const nations = new Map<string, { name: string; programmes: Map<string, string> }>();
    for (const f of all) {
      const { nation, programme } = browseOf(f.id);
      if (!nations.has(nation)) nations.set(nation, { name: f.nation, programmes: new Map() });
      nations.get(nation)!.programmes.set(programme, programmeName(programme));
    }
    this.root = document.createElement('div');
    this.root.id = 'title';
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="title-mark">
        ${logo()}
        <p class="title-line">Every crewed spacecraft <i>·</i> to scale <i>·</i> as it flew</p>
      </div>
      <nav class="title-browse" aria-label="Browse the flights">
        <p role="group" aria-label="Nation">
          <button data-nation="" aria-pressed="true">All</button>
          ${[...nations].map(([key, n]) => `<button data-nation="${esc(key)}" aria-pressed="false">${esc(n.name)}</button>`).join('')}
        </p>
        ${[...nations]
          .map(
            ([key, n]) => `
        <p role="group" aria-label="${esc(n.name)}: programme" data-of="${esc(key)}" hidden>
          <button data-programme="" aria-pressed="true">Every programme</button>
          ${[...n.programmes].map(([id, name]) => `<button data-programme="${esc(id)}" aria-pressed="false">${esc(name)}</button>`).join('')}
        </p>`,
          )
          .join('')}
      </nav>
      <nav class="title-flights" aria-label="Flights">
        ${
          // (the Lineup: every vehicle there is, side by side; it is no flight's, and stands before them)
          lineup && built > 1
            ? `
          <button class="title-lineup" data-lineup>
            <svg class="n" viewBox="0 0 26 18" aria-hidden="true"><path d="M1 17h24M4 17V9M9 17V2M14 17V6M19 17V4M23 17v-6" /></svg>
            <span class="what"><b>The Lineup</b><em>All ${built} vehicles side by side, to scale, with their history</em></span>
            <span class="go" aria-hidden="true">Enter</span>
          </button>`
            : ''
        }
        ${all
          .map((f, i) => {
            const n = `<span class="n">${String(i + 1).padStart(2, '0')}</span>`;
            // (one that is to come is a line, not a way in: it says what will be here and when it flew)
            if (!('callsign' in f))
              return `
          <p class="to-come" data-under="${esc(browseOf(f.id).programme)}">
            ${n}
            <span class="what"><b>${esc(f.name)}</b><em>${esc(f.line)}</em></span>
            <span class="when">${esc(f.nation)} · ${date(f.launch)}</span>
            <span class="go">To come</span>
          </p>`;
            return `
          <button data-flight="${esc(f.id)}" data-under="${esc(browseOf(f.id).programme)}">
            ${n}
            <span class="what"><b>${esc(f.callsign)}</b><em>${esc(f.designation)} · ${esc(f.crew.join(', '))}</em></span>
            <span class="when">${esc(f.nation)} · ${date(f.launch)}</span>
            <span class="go" aria-hidden="true">Enter</span>
          </button>`;
          })
          .join('')}
      </nav>
      <p class="title-foot">Vehicle, launch pad and crew of each flight, with every figure marked documented, assumed, derived or estimated.</p>
      <p class="title-rights">Copyright © 2026 James Brink</p>`;
    parent.append(this.root);
    this.root.addEventListener('click', (e) => {
      const id = (e.target as HTMLElement).closest<HTMLElement>('[data-flight]')?.dataset.flight;
      const by = (e.target as HTMLElement).closest<HTMLElement>('.title-browse button');
      if (id) enter(id);
      else if ((e.target as HTMLElement).closest('[data-lineup]')) lineup?.();
      else if (by) {
        // a nation chosen shows its programmes under it; a programme narrows the nation's list; All is the whole list again
        const to: Browse =
          by.dataset.nation !== undefined
            ? { nation: by.dataset.nation || null, programme: null }
            : { nation: this.at.nation, programme: by.dataset.programme || null };
        this.narrow(to);
        browse?.to(to);
      }
    });
    // (an address that names a nation or a programme there is none of is the whole list)
    const asked = browse?.at ?? this.at;
    const nation = asked.nation && nations.has(asked.nation) ? asked.nation : null;
    this.narrow({
      nation,
      programme: nation && asked.programme && nations.get(nation)!.programmes.has(asked.programme) ? asked.programme : null,
    });
  }

  /** Show the flights of a nation, or of one of its programmes, or all of them; the Lineup's way in stays whatever is chosen. */
  private narrow(to: Browse): void {
    this.at = to;
    for (const b of this.root.querySelectorAll<HTMLElement>('[data-nation]'))
      b.setAttribute('aria-pressed', String(b.dataset.nation === (to.nation ?? '')));
    for (const row of this.root.querySelectorAll<HTMLElement>('[data-of]')) {
      row.hidden = row.dataset.of !== to.nation;
      for (const b of row.querySelectorAll<HTMLElement>('[data-programme]'))
        b.setAttribute('aria-pressed', String(!row.hidden && b.dataset.programme === (to.programme ?? '')));
    }
    for (const f of this.root.querySelectorAll<HTMLElement>('[data-under]')) {
      const under = f.dataset.under!;
      f.hidden = to.programme ? under !== to.programme : to.nation ? !under.startsWith(`${to.nation}/`) : false;
    }
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

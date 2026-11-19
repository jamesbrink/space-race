import './title.css';
import { type Browse, browseOf, exhibit, lacks, listed, PLACE_NAME, PLACES, type Place, programmeName } from '../app/address.ts';
import { toggleFullscreen } from './fullscreen.ts';
import { emblem, flag, icon } from './icons.ts';
import { logo } from './logo.ts';
import type { Flight } from '../types.ts';
import { esc } from '../util/dom.ts';
import { doesOf, is, kbd, which } from '../util/keys.ts';
import { runs } from '../app/runs.ts';
import { missionTime } from '../world/clock.ts';

const date = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/**
 * Which of its three places a flight has, as their icons: lit for each it has, dimmed for one it has not yet (address.ts
 * `lacks`, in the words the ways between the places say when pointed at). Said in words as well, for whoever cannot see them.
 */
const placesOf = (f: Flight): string => {
  const has = PLACES.filter((p) => !lacks(f, p));
  const says = `Built here: ${has.map((p) => PLACE_NAME[p].toLowerCase()).join(', ')}`;
  const told = PLACES.map((p) => lacks(f, p) ?? `${PLACE_NAME[p]}: built`).join('\n');
  return `<span class="has" role="img" aria-label="${esc(says)}" title="${esc(told)}">${PLACES.map((p) => `<i${lacks(f, p) ? ' class="lacks"' : ''}>${icon(p)}</i>`).join('')}</span>`;
};

/**
 * The front page's words, as a game's menu is: the mark, and beside it the missions to choose from (narrowed by nation
 * and programme from the menu, where Explore, the Lineup, and a kept flight also are). A mission chosen is gone into at
 * its gallery, which is its page: the vehicle to look over, what the flight was, and from there its launch site and its
 * launch. All over the page's own picture (front.ts: the Earth from out by the Moon). It is shown only when the address names
 * nothing: a link or a refresh goes straight to its place. Left alone it makes way for the picture (`tuck`) and comes
 * back at a touch.
 */
export class Title {
  private readonly root: HTMLElement;
  private readonly flown: Flight[];

  /** What the list is narrowed to, and who is told when that is changed (the page: the address says it). */
  private at: Browse = { nation: null, programme: null };

  constructor(
    parent: HTMLElement,
    flights: Flight[],
    enter: (flightId: string, place: Place) => void,
    lineup?: () => void,
    browse?: { at: Browse; to: (to: Browse) => void },
  ) {
    const built = flights.filter((f) => exhibit(f)).length;
    const all = listed(flights);
    this.flown = all.filter((f): f is Flight => 'callsign' in f);
    // the nations and their programmes, each in the order its first flight flew (the nations' buttons put the USA first); a programme by its short name
    const nations = new Map<string, { name: string; programmes: Map<string, string>; n: number }>();
    for (const f of all) {
      const { nation, programme } = browseOf(f.id);
      if (!nations.has(nation)) nations.set(nation, { name: f.nation, programmes: new Map(), n: 0 });
      nations.get(nation)!.programmes.set(programme, programmeName(programme));
      if ('callsign' in f) nations.get(nation)!.n++;
    }
    const ordered = [...nations].sort(([a], [b]) => Number(b === 'usa') - Number(a === 'usa'));
    // a line of the menu: its number, its mark, what it is, and a tally
    const item = (n: string, attr: string, glyph: string, name: string, line: string, tally: string) => `
        <button ${attr}>
          <span class="n">${n}</span>
          <span class="glyph">${glyph}</span>
          <span class="what"><b>${name}</b>${line ? `<em>${line}</em>` : ''}</span>
          <span class="tally">${tally}</span>
        </button>`;
    // a flight flown by hand and kept (app/runs.ts) is the first thing offered: the one left last, taken up where it was left
    const [keptId, keptNote] = Object.entries(runs.list()).sort(([, a], [, b]) => b.left - a.left)[0] ?? [];
    const kept = this.flown.find((f) => f.id === keptId);
    this.root = document.createElement('div');
    this.root.id = 'title';
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="title-screen title-home">
        <div class="title-side">
          <div class="title-mark">
            ${logo()}
            <p class="title-line">Every crewed spacecraft <i>·</i> to scale <i>·</i> as it flew</p>
          </div>
          <nav class="title-menu" aria-label="Main menu">
            ${kept && keptNote ? item('▸', `class="resume" data-resume="${esc(kept.id)}"`, icon('fly'), 'Continue', `${esc(kept.callsign)} · ${esc(keptNote.phase)} at ${missionTime(keptNote.t)}`, 'In flight') : ''}
            ${item('01', 'data-nation="" aria-pressed="true"', '', 'All missions', '', `${this.flown.length} flights`)}
            ${ordered.map(([key, n], i) => item(String(i + 2).padStart(2, '0'), `data-nation="${esc(key)}" aria-pressed="false"`, flag(key), esc(n.name), '', `${n.n} flights`)).join('')}
            ${lineup && built > 1 ? item(String(ordered.length + 2).padStart(2, '0'), 'data-lineup', icon('lineup'), 'Explore', 'Every vehicle side by side, to scale', `${built} vehicles`) : ''}
          </nav>
          ${document.fullscreenEnabled ? '<p class="title-set"><button class="switch" data-full aria-pressed="false">Full screen</button></p>' : ''}
          <p class="title-keys">${(['front.step', 'front.into', 'front.back'] as const).map((k) => `<span>${kbd(k)}${doesOf(k)}</span>`).join('')}</p>
          <p class="title-foot">Every figure marked documented, assumed, derived or estimated.</p>
          <p class="title-rights">Copyright © 2026 James Brink</p>
        </div>
        <section class="title-select" aria-label="Choose a mission">
          <header>
            <h2>Select a mission</h2>
            <p class="title-says"></p>
          </header>
          <nav class="title-browse" aria-label="Programme">
            ${ordered
              .map(
                ([key, n]) => `
            <p role="group" aria-label="${esc(n.name)}: programme" data-of="${esc(key)}" hidden>
              <button data-programme="" aria-pressed="true">Every programme</button>
              ${[...n.programmes].map(([id, name]) => `<button data-programme="${esc(id)}" aria-pressed="false">${emblem(id)}${esc(name)}</button>`).join('')}
            </p>`,
              )
              .join('')}
          </nav>
          <nav class="title-flights" aria-label="Flights">
            ${all
              .map((f) => {
                const { nation, programme } = browseOf(f.id);
                // (the number, then the programme's emblem: the list reads by programme down its left edge)
                const n = `<span class="n"></span><span class="mark">${emblem(programme)}</span>`;
                const day = `<span class="day">${flag(nation)}${esc(f.nation)} · ${date(f.launch)}</span>`;
                // (one that is to come is a line, not a way in: it says what will be here and when it flew)
                if (!('callsign' in f))
                  return `
            <p class="to-come" data-under="${esc(programme)}">
              ${n}
              <span class="what"><b>${esc(f.name)}</b><em>${esc(f.line)}</em></span>
              <span class="when">${day}</span>
              <span class="go">To come</span>
            </p>`;
                return `
            <button data-flight="${esc(f.id)}" data-under="${esc(programme)}">
              ${n}
              <span class="what"><b>${esc(f.callsign)}</b><em>${esc(f.designation)} · ${esc(f.crew.join(', ') || 'Uncrewed')}</em></span>
              <span class="when">${day}${placesOf(f)}</span>
              <span class="go" aria-hidden="true">Enter ›</span>
            </button>`;
              })
              .join('')}
          </nav>
        </section>
      </div>`;
    parent.append(this.root);
    this.root.addEventListener('click', (e) => {
      const on = (sel: string) => (e.target as HTMLElement).closest<HTMLElement>(sel);
      const id = on('[data-flight]')?.dataset.flight;
      const resumed = on('[data-resume]')?.dataset.resume;
      const by = on('[data-nation], [data-programme]');
      if (on('[data-full]')) toggleFullscreen();
      else if (resumed) enter(resumed, 'fly');
      else if (id) enter(id, 'gallery');
      else if (on('[data-lineup]')) lineup?.();
      else if (by) {
        // a nation chosen shows its programmes over the list; a programme narrows the nation's list; All is the whole list again
        const to: Browse =
          by.dataset.nation !== undefined
            ? { nation: by.dataset.nation || null, programme: null }
            : { nation: this.at.nation, programme: by.dataset.programme || null };
        this.narrow(to);
        browse?.to(to);
        // (where the missions lie under the menu, a nation chosen by hand brings them up into view)
        const select = this.root.querySelector<HTMLElement>('.title-select')!;
        if (e.detail > 0 && select.getBoundingClientRect().top > innerHeight * 0.6)
          select.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    // (the switch says what the window is, however it came to be so: Escape and the browser's own key leave full screen too)
    document.addEventListener('fullscreenchange', () =>
      this.root.querySelector('[data-full]')?.setAttribute('aria-pressed', String(Boolean(document.fullscreenElement))),
    );
    // by keys: up and down along what the focus is in (the menu or the flights), right from the menu to the flights, left or Escape back to the menu
    document.addEventListener('keydown', (e) => {
      if (this.root.hidden || this.root.classList.contains('leaving')) return;
      const at = document.activeElement as HTMLElement | null;
      const group = at?.closest('.title-select') ? '.title-flights [data-flight]:not([hidden])' : '.title-menu button';
      const step = which(e, 'front.step');
      if (step >= 0) {
        const all = [...this.root.querySelectorAll<HTMLElement>(group)];
        const i = at ? all.indexOf(at) : -1;
        const to = all[Math.max(0, Math.min(all.length - 1, i < 0 ? 0 : i + (step ? 1 : -1)))];
        to?.focus();
        // (the cursor is the choice: a nation come to by the arrows narrows the missions as it is come to)
        if (to?.dataset.nation !== undefined && to.dataset.nation !== (this.at.nation ?? '')) to.click();
        e.preventDefault();
      } else if (is(e, 'front.into') && at?.closest('.title-menu')) {
        this.root.querySelector<HTMLElement>('.title-flights [data-flight]:not([hidden])')?.focus();
        e.preventDefault();
      } else if (is(e, 'front.back') && at?.closest('.title-select')) {
        this.root.querySelector<HTMLElement>('.title-menu [aria-pressed="true"]')?.focus();
        e.preventDefault();
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
    let n = 0;
    for (const f of this.root.querySelectorAll<HTMLElement>('[data-under]')) {
      const under = f.dataset.under!;
      f.hidden = to.programme ? under !== to.programme : to.nation ? !under.startsWith(`${to.nation}/`) : false;
      if (!f.hidden && f.dataset.flight) n++;
    }
    this.root.querySelector('.title-says')!.textContent = `${n} to choose from, in the order they flew`;
  }

  get showing(): boolean {
    return !this.root.hidden;
  }

  show(): void {
    this.root.hidden = false;
    this.root.classList.remove('leaving');
    document.body.classList.add('titled');
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
    this.root.addEventListener('transitionend', (e) => e.target === this.root && done());
    setTimeout(done, 700); // if no transition runs (reduced motion), still go
  }
}

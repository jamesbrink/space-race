import './history.css';
import type { FlightStory, Person, Programme } from '../../missions/history.ts';
import type { Confidence } from '../types.ts';
import { esc } from '../util/dom.ts';
import { emblemFigure } from './icons.ts';
import { dot } from './ui.ts';

/**
 * The history's words (missions/history.ts) as the page writes them, the same wherever they are told: on the Lineup's
 * card (ui/lineup.ts) and in a flight's own gallery (its History tab, ui/gallery.ts). A flight's story under its
 * headline, what it was first to do, why it has its name, who flew it (each opens to their own story), its programme,
 * its moments. Each is markup for the page to put where it wants it (history.css is its look, the panels' glass
 * round it is the page's); what is pressed in it is the page's to hear. Nothing here is written but what the
 * history says and the names of its headings, but for what a programme's emblem is, which icons.ts says.
 */

/** Text as paragraphs: a blank line parts them (the history's one convention). */
export const paras = (text: string): string =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join('');

/** A short day: 12 Apr 1961. */
export const shortDay = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const yearOf = (iso: string): number => new Date(iso).getUTCFullYear();

/** The years someone lived, or when they were born. */
export const lived = (p: Person): string => (p.died ? `${yearOf(p.born)} to ${yearOf(p.died)}` : `born ${yearOf(p.born)}`);

/** A flight's headline, its story (or what speaks for it where the history has none) and its firsts. */
export function storyMarkup(headline: string, story: string, firsts: readonly string[]): string {
  return `
    <p class="hist-headline">${esc(headline)}</p>
    <div class="hist-story">${paras(story)}</div>
    ${firsts.length ? `<ul class="hist-firsts" aria-label="Firsts">${firsts.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`;
}

/** Why the ship has its name: the words, then where they are from with how sure they are. */
export function namedMarkup(named: NonNullable<FlightStory['named']>): string {
  return `<h3>The name</h3><div class="hist-told hist-named">${paras(named.why)}<small>${dot(named.confidence)}${esc(named.source)}</small></div>`;
}

/**
 * Who flew it, under its heading: each the history tells of opens to their story (a button with `data-person`, its
 * `aria-expanded` saying whether it is open; the page hears the press). `more` adds to a person's story where the page
 * has more to say (the Lineup: the other flights they flew that stand in its row).
 */
export function crewMarkup(
  crew: readonly { name: string; person: Person | null }[],
  open: (id: string) => boolean = () => false,
  more: (person: Person) => string = () => '',
): string {
  if (!crew.length) return '<h3>Crew</h3><p>Uncrewed</p>';
  return `
    <h3>${crew.length > 1 ? 'Crew' : 'Pilot'}</h3>
    <ul class="hist-crew">${crew
      .map(({ name, person }) =>
        person
          ? `<li><button data-person="${esc(person.id)}" aria-expanded="${open(person.id)}"><span class="name">${esc(name)}${person.native ? `<em lang="ru">${esc(person.native)}</em>` : ''}</span><span class="what">${esc(lived(person))}</span><i class="chevron"></i></button>
             <div class="hist-told">${paras(person.bio)}${more(person)}<small>${dot(person.confidence)}${esc(person.source)}</small></div></li>`
          : `<li><p><span class="name">${esc(name)}</span></p></li>`,
      )
      .join('')}</ul>`;
}

/** A programme's words: why it was, how it was done, what it left, and where they are from. */
export function programmeMarkup(told: Programme): string {
  return `${emblemFigure(told.id)}<h4>Why</h4>${paras(told.why)}<h4>How</h4>${paras(told.how)}<h4>What it left</h4>${paras(told.legacy)}<small>${esc(told.source)}</small>`;
}

/** A moment of the race as one row of a list of them (`hist-moments`): its day, its title with how sure it is, `what` under that, its words and their source. */
export function momentMarkup(m: {
  date: string;
  title: string;
  text: string;
  what: string;
  source: string | null;
  confidence: Confidence | null;
}): string {
  return `
    <time datetime="${esc(m.date)}">${esc(shortDay(m.date))}</time>
    <span class="name">${m.confidence ? dot(m.confidence) : ''}${esc(m.title)}</span>
    ${m.what ? `<span class="what">${m.what}</span>` : ''}
    ${m.text ? `<span class="hist-text">${paras(m.text)}${m.source ? `<small>${esc(m.source)}</small>` : ''}</span>` : ''}`;
}

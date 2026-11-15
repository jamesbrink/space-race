/**
 * The history the Lineup tells: the moments of the Space Race on a timeline, what each flight was for, why each ship
 * has its name, the people who flew them and the programmes they flew in. A flight's figures are its own (flight.ts);
 * nothing here is a number the simulator reads.
 */
import type { Confidence } from '../src/measure.ts';

/** One moment of the Space Race, on the timeline. */
export interface Milestone {
  /** UTC: 'YYYY-MM-DD', or a full ISO instant where the source gives the time. */
  date: string;
  /** The flight it belongs to: an id from missions/index.ts or missions/upcoming.ts; absent for an event that was no crewed flight (Sputnik 1, a speech). */
  flight?: string;
  nation: 'USA' | 'USSR';
  /** A first or a turning point, in a few words: "First person in space". */
  title: string;
  /** One or two sentences: what happened and why it mattered. */
  text: string;
  /** Where it is from: document, author, year, page or section. */
  source: string;
  confidence: Confidence;
}

/** What the Lineup's card says about one flight beyond its own data (its figures come from flight.ts, never from here). */
export interface FlightStory {
  flight: string;
  /** One line under the name: what this flight was for. */
  headline: string;
  /** Two to four sentences: why it flew, what it proved, what went wrong or nearly did, what it led to. */
  story: string;
  /** Its firsts, each a few words (the same wording as its Milestone titles). */
  firsts: string[];
  source: string;
  /** Why the ship has its name (or why it has none). */
  named?: { why: string; source: string; confidence: Confidence };
}

/** Someone who flew one of the flights. */
export interface Person {
  /** A short slug: 'gagarin', 'grissom'. */
  id: string;
  /** As the flights' `crew` gives it. */
  name: string;
  /** The name in its own script, where that is not the Latin alphabet: 'Юрий Алексеевич Гагарин'. */
  native?: string;
  /** 'YYYY-MM-DD'. */
  born: string;
  /** 'YYYY-MM-DD'; absent while they live. */
  died?: string;
  nation: 'USA' | 'USSR';
  /** The ids of the flights they flew, from missions/index.ts or missions/upcoming.ts, in the order flown. */
  flights: string[];
  /** Three to six sentences: who they were before, what they did, what came after. */
  bio: string;
  source: string;
  confidence: Confidence;
}

/** A programme: the flights of one kind of ship. */
export interface Programme {
  /** The flights' id prefix, as missions/<nation>/<programme>: 'usa/mercury'. */
  id: string;
  name: string;
  nation: 'USA' | 'USSR';
  /** Its crewed flights' years, for display: '1961–1963'. */
  years: string;
  /** Why it was started, and by whom. */
  why: string;
  /** The hardware and the plan, in brief. */
  how: string;
  /** What it led to. */
  legacy: string;
  source: string;
}

export const MILESTONES: readonly Milestone[] = [];

export const STORIES: Readonly<Record<string, FlightStory>> = {};

export const PEOPLE: readonly Person[] = [];

export const PROGRAMMES: readonly Programme[] = [];

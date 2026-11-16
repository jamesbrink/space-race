import type { FlightStory, Milestone, Person, Programme } from '../../../missions/history.ts';
import type { Confidence, Flight, ModelDef, Spec } from '../../types.ts';
import { byDate, exhibit, plinths, programmeOf } from '../address.ts';

/**
 * The Lineup's row, as arithmetic on the flights' data: who stands in it and in what order, what is said of each, where
 * each stands, which level of detail each may be drawn at. Nothing here touches the page or the renderer
 * (tests/lineup.test.mjs), and nothing here knows any one flight: a flight appended to missions/index.ts is in the row,
 * in its programme's section, on the timeline and in the figures without being told how.
 *
 * Two things are read. **The flights' own data** gives everything that is a fact of the flight: what it is called, when
 * it flew, who was aboard, its vehicle, every figure with the confidence it was given there. **The history**
 * (missions/history.ts: stories, the names' stories, the people, the programmes, the milestones) gives the words. Where
 * the history says nothing of a flight yet, the flight's own summary speaks for it (its first sentence is its line on
 * the timeline), so a flight is never left out for want of a story, and no word is written here.
 */

/** The history, as the row is given it (missions/history.ts). */
export interface History {
  milestones: readonly Milestone[];
  stories: Readonly<Record<string, FlightStory>>;
  people: readonly Person[];
  programmes: readonly Programme[];
}

/** A tint: hue in degrees, saturation and lightness 0 to 1. */
export type Tint = [h: number, s: number, l: number];

/**
 * The hues nations are told apart by, in the order they first flew, degrees. Each programme of a nation is a step
 * round from its nation's hue, so two programmes of one nation are kin and are still told apart. A design: chosen to
 * read on the dark floor, the light one and paper.
 */
const HUES = [8, 212, 135, 280, 48, 172] as const;
const HUE_STEP = 30;

/** The tint of a nation's `nth` programme (0 for its first). */
export function tintOf(nation: number, nth: number): Tint {
  // (warm hues step toward yellow and cool ones toward green: away from each other, whichever nation has more programmes)
  const hue = HUES[nation % HUES.length]! + (nation % 2 ? -1 : 1) * HUE_STEP * nth;
  return [(hue + 360) % 360, 0.86, nth % 2 ? 0.74 : 0.68];
}

/** A tint as a style sheet writes it. */
export const css = ([h, s, l]: Tint): string => `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;

/** One vehicle of the row: a flight that has a vehicle to stand in it. */
export interface Entry {
  flight: Flight;
  /** The model that stands there: the flight's vehicle (`exhibit`). */
  vehicle: ModelDef;
  /** The nodes under the vehicle's `Spacecraft` heading; null where its parts list does not part them. What rides with them is found on the model (`craftNodes`). */
  craft: string[] | null;
  /** Its parts list's headings (`headingsOf`): what the spacecraft alone is found from. */
  headings: Heading[];
  /** Which of the row's nations it flew for, and which of its programmes it is of: indexes into `nations` and `sections`. */
  nation: number;
  programme: number;
  tint: Tint;
  /** What the history tells of it, if it tells anything yet. */
  story: FlightStory | null;
  /** Its line on the timeline: the history's headline, or what its own summary says first. */
  headline: string;
  /** What it was the first to do: the history's list, or its own line if that claims a first. */
  firsts: string[];
}

/** A programme, as the row has it: its section of the row, and what the history tells of it. */
export interface Section {
  /** The first two words of its flights' ids. */
  id: string;
  /** What it is called: the history's name for it, or its flights' own (`Flight.program`). */
  name: string;
  nation: string;
  tint: Tint;
  /** Its vehicles in the row, by their flights' ids, in the order they flew. */
  flights: string[];
  /** Its years: the history's, or those of its flights that stand here. */
  years: string;
  /** Why it was, how it was done, what it left: if the history tells it yet. */
  told: Programme | null;
}

/** The heading a vehicle's parts list puts its spacecraft under, as a choice of what stands in the gallery (address.ts `plinths`). */
const SPACECRAFT = 'spacecraft';

/** The parts listed under the vehicle's `Spacecraft` heading, where its parts list has one among others. */
export function spacecraftNodes(model: Pick<ModelDef, 'parts' | 'name'>): string[] | null {
  return plinths(model).find((p) => p.id === SPACECRAFT)?.nodes ?? null;
}

/** A heading of a vehicle's parts list, and the top-level nodes listed under it. */
export interface Heading {
  id: string;
  nodes: string[];
}

/** The headings of a vehicle's parts list, in the order they come, where it has more than one (address.ts `plinths`). */
export function headingsOf(model: Pick<ModelDef, 'parts' | 'name'>): Heading[] {
  return plinths(model).flatMap((p) => (p.nodes ? [{ id: p.id, nodes: p.nodes }] : []));
}

/** How far under the spacecraft's own lowest point another heading's lowest may be and still stand on it, metres: what a model's levels differ by. */
const STANDS_ON = 0.05;

/**
 * The spacecraft alone, as the row stands it: what rides on the launch vehicle. That is the parts under the
 * `Spacecraft` heading, and the parts of any other heading that stands wholly on it, its lowest point no lower than the
 * spacecraft's own (an airlock folded against the cabin: Voskhod 2's is listed under a heading of its own). A heading
 * that reaches below the spacecraft is the launch vehicle's (a stage, its boosters, the fairing that stands on the
 * third stage). `lowest`: how low a node reaches in the model, metres (null for one it does not have). Null where the
 * parts list has no `Spacecraft` heading among others: nothing is parted.
 */
export function craftNodes(headings: readonly Heading[], lowest: (node: string) => number | null): string[] | null {
  const craft = headings.find((h) => h.id === SPACECRAFT);
  if (!craft) return null;
  const least = (h: Heading): number => Math.min(...h.nodes.map((n) => lowest(n) ?? Number.POSITIVE_INFINITY));
  const floor = least(craft);
  if (!Number.isFinite(floor)) return [...craft.nodes];
  return headings.filter((h) => h === craft || least(h) >= floor - STANDS_ON).flatMap((h) => h.nodes);
}

/**
 * What a summary says first: its first sentence, or as much of that as comes before a colon or a semicolon ("The first
 * crew of more than one: a pilot, an engineer and a doctor..." is "The first crew of more than one").
 */
export function headline(summary: string): string {
  const cut = /^(.*?)[.:;!?](?:\s|$)/s.exec(summary.trim());
  return (cut?.[1] ?? summary).trim();
}

/** Whether a line claims a first. */
export const claimsFirst = (line: string): boolean => /\bfirst\b/i.test(line);

/** The nations of the flights, in the order each first flew. */
export function nations(flights: readonly Pick<Flight, 'nation' | 'launch' | 'id'>[]): string[] {
  return [...new Set(byDate(flights).map((f) => f.nation))];
}

const NONE: History = { milestones: [], stories: {}, people: [], programmes: [] };

/** The row: every flight that has a vehicle, in the order they flew. */
export function entries(flights: readonly Flight[], history: History = NONE): Entry[] {
  const all = nations(flights);
  const dated = byDate(flights).filter((f) => exhibit(f));
  const ids = [...new Set(dated.map((f) => programmeOf(f.id)))];
  const nationOf = (programme: string): string => dated.find((f) => programmeOf(f.id) === programme)!.nation;
  return dated.map((flight): Entry => {
    const vehicle = exhibit(flight)!;
    const nation = all.indexOf(flight.nation);
    const programme = ids.indexOf(programmeOf(flight.id));
    // (which of its nation's programmes it is, in the order they first flew: its step round from the nation's hue)
    const nth = ids.filter((id, i) => i < programme && nationOf(id) === flight.nation).length;
    const story = history.stories[flight.id] ?? null;
    const line = story?.headline || headline(flight.summary);
    return {
      flight,
      vehicle,
      craft: spacecraftNodes(vehicle),
      headings: headingsOf(vehicle),
      nation,
      programme,
      tint: tintOf(nation, nth),
      story,
      headline: line,
      firsts: story?.firsts.length ? story.firsts : claimsFirst(line) ? [line] : [],
    };
  });
}

/** A day as the page writes it: 12 April 1961. */
export const day = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** The year a flight flew in, UTC. */
export const yearOf = (iso: string): number => new Date(iso).getUTCFullYear();

/** The programmes of the row, in the order each first flew: each one's section, and what the history tells of it. */
export function sections(row: readonly Entry[], history: History = NONE): Section[] {
  const out: Section[] = [];
  for (const e of row) {
    const id = programmeOf(e.flight.id);
    if (!out[e.programme]) {
      const told = history.programmes.find((p) => p.id === id) ?? null;
      out[e.programme] = { id, name: told?.name || e.flight.program, nation: e.flight.nation, tint: e.tint, flights: [], years: '', told };
    }
    out[e.programme]!.flights.push(e.flight.id);
  }
  for (const section of out) {
    const years = section.flights.map((id) => yearOf(row.find((e) => e.flight.id === id)!.flight.launch));
    const [from, to] = [Math.min(...years), Math.max(...years)];
    section.years = section.told?.years || (from === to ? `${from}` : `${from} to ${to}`);
  }
  return out;
}

/** A person's surname, from their name as a flight gives it: its last word, not counting a Jr. or a II. */
export const surnameOf = (name: string): string =>
  name
    .replace(/,?\s+(Jr|Sr|II|III)\.?$/i, '')
    .trim()
    .split(/\s+/)
    .at(-1)!;

/**
 * Who flew a flight, in the order the flight names them: each with what the history tells of them, if it tells anything
 * yet. The history's people are matched by the flights they flew, and put against the flight's own names by surname
 * (the last word of each), so the two need not be spelt alike.
 */
export function crewOf(flight: Pick<Flight, 'id' | 'crew'>, people: readonly Person[]): { name: string; person: Person | null }[] {
  // (one name, two transliterations: Dobrovolskiy and Dobrovolsky)
  const surname = (name: string): string => surnameOf(name).toLowerCase().replace(/iy$/, 'y');
  const left = people.filter((p) => p.flights.includes(flight.id));
  const out = flight.crew.map((name) => {
    const at = left.findIndex((p) => surname(p.name) === surname(name));
    return { name, person: at >= 0 ? left.splice(at, 1)[0]! : null };
  });
  // (anyone the history has aboard whom no name matched is given to a name still without one, in order)
  for (const slot of out) if (!slot.person && left.length) slot.person = left.shift()!;
  return out;
}

/** What the history tells of one flight, as its own gallery tells it (ui/history.ts): its story, who flew it, its programme and its moments. */
export interface Told {
  story: FlightStory;
  crew: { name: string; person: Person | null }[];
  /** Its programme's why, how and legacy, if the history tells them yet. */
  programme: Programme | null;
  /** The milestones that are this flight, in the history's order. */
  milestones: Milestone[];
}

/** What the history tells of a flight; null while it has no story for it, so that nothing is shown rather than an empty section. */
export function toldOf(flight: Pick<Flight, 'id' | 'crew'>, history: History = NONE): Told | null {
  const story = history.stories[flight.id];
  if (!story) return null;
  return {
    story,
    crew: crewOf(flight, history.people),
    programme: history.programmes.find((p) => p.id === programmeOf(flight.id)) ?? null,
    milestones: history.milestones.filter((m) => m.flight === flight.id),
  };
}

/** Words read in a second, by someone reading a card on a picture that moves. */
const READ = 3.5;

/**
 * What the idle show's card says of one in the row: the history's headline over the first paragraph of its story (the
 * whole of it is on its card when it is chosen), or, where the history has no story for it yet, its own summary. And
 * how long the show stays on it, seconds: `least`, or as long as the words take to read.
 */
export function showCard(e: Pick<Entry, 'story' | 'flight'>, least: number): { lead: string; text: string; dwell: number } {
  const lead = e.story?.headline ?? '';
  const text = (e.story?.story.split(/\n\s*\n/)[0] ?? '').trim() || e.flight.summary;
  const words = `${lead} ${text}`.split(/\s+/).filter(Boolean).length;
  return { lead, text, dwell: Math.max(least, Math.ceil(words / READ)) };
}

/** A moment on the timeline: a milestone of the history, or a flight of the row the history has no milestone for. */
export interface Moment {
  /** UTC: a day or an instant, as given. */
  date: string;
  title: string;
  text: string;
  nation: string;
  /** The flight it was, by its id; null for what was no crewed flight. */
  flight: string | null;
  /** That flight stands in the row. */
  built: boolean;
  /** Where the words are from, and how far they can be trusted: null for a flight speaking for itself (its own summary). */
  source: string | null;
  confidence: Confidence | null;
}

/**
 * The timeline: the history's milestones, and among them every flight of the row that none of them is, each at its
 * launch with its own line. Day by day in the order they happened.
 */
export function timeline(row: readonly Entry[], history: History = NONE): Moment[] {
  const told = new Set(history.milestones.flatMap((m) => (m.flight ? [m.flight] : [])));
  const built = new Set(row.map((e) => e.flight.id));
  const moments: Moment[] = [
    ...history.milestones.map(
      (m): Moment => ({
        date: m.date,
        title: m.title,
        text: m.text,
        nation: m.nation,
        flight: m.flight ?? null,
        built: Boolean(m.flight && built.has(m.flight)),
        source: m.source,
        confidence: m.confidence,
      }),
    ),
    ...row
      .filter((e) => !told.has(e.flight.id))
      .map(
        (e): Moment => ({
          date: e.flight.launch,
          title: e.headline,
          text: '',
          nation: e.flight.nation,
          flight: e.flight.id,
          built: true,
          source: null,
          confidence: null,
        }),
      ),
  ];
  // by the day; within a day as the history has them (it puts what it can time before what it cannot), then the flights
  const dayOf = (m: Moment): string => new Date(m.date).toISOString().slice(0, 10);
  return moments
    .map((m, i) => ({ m, i, day: dayOf(m) }))
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : a.i - b.i))
    .map(({ m }) => m);
}

/**
 * The timeline's axis: whole years, from the first date's to the end of the last's, and where each date falls on it
 * (0 to 1).
 */
export function timeAxis(dates: readonly string[]): { from: number; to: number; years: number[]; at: number[] } {
  if (!dates.length) return { from: 0, to: 0, years: [], at: [] };
  const times = dates.map((iso) => Date.parse(iso));
  const first = yearOf(dates[times.indexOf(Math.min(...times))]!);
  const last = yearOf(dates[times.indexOf(Math.max(...times))]!);
  const [from, to] = [Date.UTC(first, 0, 1), Date.UTC(last + 1, 0, 1)];
  const years = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  return { from, to, years, at: times.map((t) => (t - from) / (to - from)) };
}

/** A key figure of a flight, as its data gives it. */
export interface Figure {
  /** Which of the figures the card asks for it is. */
  slot: Slot;
  /** What the card calls the slot. */
  name: string;
  /** The flight's own label for the figure it gave: what exactly was measured. */
  label: string;
  /** As the flight gives it, in the flight's unit. */
  value: number;
  unit: string;
  confidence: Confidence;
  note?: string;
}

export type Slot =
  | 'height'
  | 'liftoff'
  | 'craftLength'
  | 'craftMass'
  | 'apogee'
  | 'perigee'
  | 'range'
  | 'period'
  | 'inclination'
  | 'duration';

/** What the card asks a flight for, in the order it shows them, and what it calls each. */
export const SLOTS: readonly [Slot, string][] = [
  ['height', 'Height on the pad'],
  ['liftoff', 'Mass at liftoff'],
  ['craftLength', 'Spacecraft length'],
  ['craftMass', 'Spacecraft mass'],
  ['apogee', 'Apogee'],
  ['perigee', 'Perigee'],
  ['range', 'Range'],
  ['period', 'Period'],
  ['inclination', 'Inclination'],
  ['duration', 'Duration'],
];

const isCraft = (s: Spec): boolean => /spacecraft/i.test(s.group);
const largest = (specs: Spec[]): Spec | undefined => [...specs].sort((a, b) => b.value - a.value)[0];

/**
 * How each figure is found among a flight's specs. A flight's labels are its own words ("Weight at launch", "Mass in
 * orbit", "Length on the pad"), so a figure is found by what its label says, never by position, and one a flight does
 * not give is simply not shown. Every pick is a spec as the flight wrote it: its value, unit, confidence and note.
 */
const FIND: Record<Slot, (specs: Spec[]) => Spec | undefined> = {
  height: (specs) => specs.find((s) => /\b(height|length) on the pad\b/i.test(s.label)),
  liftoff: (specs) =>
    specs.find((s) => s.unit === 'kg' && /\blift-?off\b/i.test(s.label) && /^(lift-?off )?(mass|weight)\b/i.test(s.label)),
  // (as it stands in the row: the longest the flight gives, which is the spacecraft as launched)
  craftLength: (specs) => largest(specs.filter((s) => isCraft(s) && s.unit === 'm' && /^length\b/i.test(s.label))),
  // (in orbit where the flight gives it, which every orbital flight can; else as launched)
  craftMass: (specs) => {
    const masses = specs.filter((s) => isCraft(s) && s.unit === 'kg' && /\b(mass|weight)\b/i.test(s.label));
    return masses.find((s) => /\bin orbit\b/i.test(s.label)) ?? masses.find((s) => /\blaunch\b/i.test(s.label));
  },
  apogee: (specs) => specs.find((s) => /^apogee\b/i.test(s.label)),
  perigee: (specs) => specs.find((s) => /^perigee\b/i.test(s.label)),
  range: (specs) => specs.find((s) => /^range\b/i.test(s.label)),
  period: (specs) => specs.find((s) => /^period\b/i.test(s.label)),
  inclination: (specs) => specs.find((s) => /^inclination\b/i.test(s.label)),
  duration: (specs) => specs.find((s) => /^duration\b/i.test(s.label)),
};

/** The results a flight is checked against (`Flight.checks`) that are figures the card asks for, where its specs do not give them. */
const CHECKED: Partial<Record<Slot, string>> = { apogee: 'apogee', range: 'range', duration: 'duration' };

/** A flight's key figures: those of `SLOTS` its data gives, in that order. */
export function keyFigures(flight: Pick<Flight, 'specs' | 'checks'>): Figure[] {
  return SLOTS.flatMap(([slot, name]): Figure[] => {
    const spec = FIND[slot](flight.specs);
    if (spec) return [{ slot, name, label: spec.label, value: spec.value, unit: spec.unit, confidence: spec.confidence, note: spec.note }];
    const check = flight.checks?.find((c) => c.id === CHECKED[slot]);
    if (check)
      return [{ slot, name, label: check.label, value: check.value, unit: check.unit, confidence: check.confidence, note: check.source }];
    return [];
  });
}

const thousands = (n: number): string => Math.round(n).toLocaleString('en-US');

/** A figure as the card writes it: the flight's own number in a unit that reads (161,494 m is 161.5 km; 17,723 s is 4 h 55 min 23 s). */
export function figureText(value: number, unit: string): string {
  if (unit === 'm') return value >= 10_000 ? `${(value / 1000).toFixed(1)} km` : `${value.toFixed(2)} m`;
  if (unit === 'km') return `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })} km`;
  if (unit === 'kg') return `${value >= 100 ? thousands(value) : value.toFixed(1)} kg`;
  if (unit === 'deg') return `${value}°`;
  if (unit === 's') {
    if (value < 120) return `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })} s`;
    const whole = Math.round(value);
    // (under two hours, in minutes: an orbit's period is 88 min 29 s, not 1 h 28 min 29 s)
    if (whole < 7200) return [`${Math.floor(whole / 60)} min`, whole % 60 ? `${whole % 60} s` : ''].filter(Boolean).join(' ');
    const [d, h, m, s] = [Math.floor(whole / 86400), Math.floor((whole % 86400) / 3600), Math.floor((whole % 3600) / 60), whole % 60];
    return [d ? `${d} d` : '', d || h ? `${h} h` : '', `${m} min`, s && !d ? `${s} s` : ''].filter(Boolean).join(' ');
  }
  if (unit === 'min') return `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })} min`;
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${unit}`;
}

/**
 * The flight's own figure for how tall something stands, if it gives one: a length among its specs within a hundredth of
 * what was measured on the model (the gallery's rule for its range pole). Null: the page says "as modelled".
 */
export function heightSpec(flight: Pick<Flight, 'specs'>, height: number): Spec | null {
  const near = flight.specs
    .filter((s) => s.unit === 'm' && Math.abs(s.value - height) < 0.01 * height)
    .sort((a, b) => Math.abs(a.value - height) - Math.abs(b.value - height));
  return near[0] ?? null;
}

/**
 * Where each stands along the row, metres: the middle of each, given how wide each is, with the same clear floor
 * between every two neighbours: half the width of the widest of them, and never under a metre (room to walk between
 * them, at whatever scale the row is; by the widest and not by the usual one, so that a flight added to the row does
 * not close it up or open it out unless it is wider than any before it). The row is centred on nought.
 */
export function layOutRow(widths: readonly number[]): { at: number[]; gap: number; length: number } {
  const gap = Math.max(1, 0.5 * Math.max(0, ...widths));
  const at: number[] = [];
  let x = 0;
  widths.forEach((w, i) => {
    x += i ? gap + w / 2 : w / 2;
    at.push(x);
    x += w / 2;
  });
  return { at: at.map((v) => v - x / 2), gap, length: x };
}

/**
 * The heights the row is ruled at, metres: a line at every `minor` and a figure at every `major`, up to the first major
 * line at or over the tallest thing there. Tens and fives for launch vehicles, twos and ones for spacecraft.
 */
export function heightMarks(tallest: number): { major: number; minor: number; top: number } {
  const major = tallest > 60 ? 20 : tallest > 12 ? 10 : tallest > 5 ? 2 : 1;
  const minor = major === 20 ? 10 : major === 10 ? 5 : major === 2 ? 1 : 0.5;
  return { major, minor, top: Math.max(major, Math.ceil(tallest / major - 1e-9) * major) };
}

/** What one stand asks of the levels of detail: the level its size on screen calls for, how near what is being looked at it is, and what each level costs to hold, bytes. */
export interface Ask {
  wanted: number;
  near: number;
  cost: readonly number[];
}

/**
 * Which level each stand is drawn at, within what the device can hold (`allowance`, bytes, for every level finer than
 * the coarsest, which is always held and costs nothing here). Each has the level its size on screen calls for, the
 * nearest to what is being looked at first, while the allowance lasts; past it, the finest coarser level that still
 * fits. So what is framed is drawn at the highest detail there is, and what is saved is saved at the edges.
 */
export function allot(asks: readonly Ask[], allowance: number): number[] {
  const coarsest = (a: Ask): number => a.cost.length - 1;
  const granted = asks.map(coarsest);
  let left = allowance;
  const order = asks.map((_, i) => i).sort((a, b) => asks[a]!.near - asks[b]!.near || a - b);
  for (const i of order) {
    const ask = asks[i]!;
    for (let level = Math.max(0, ask.wanted); level < coarsest(ask); level++) {
      if (ask.cost[level]! > left) continue;
      left -= ask.cost[level]!;
      granted[i] = level;
      break;
    }
  }
  return granted;
}

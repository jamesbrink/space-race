import { type Upcoming, upcoming } from '../../missions/upcoming.ts';
import type { Flight, ModelDef, ViewDef } from '../types.ts';
import { flownByHand } from '../sim/plan.ts';

/**
 * Where the page is: the address bar's fragment, and the places a flight is seen in.
 *
 * Every flight has the same three places, in the same order, and opens in the first:
 *
 * - the **gallery**: the vehicle alone on a plain floor under designed light, to be turned, taken
 *   apart and read. Every flight has it from the day its vehicle is built.
 * - the **launch site**: where it flew from. The pad, the crew, the day's sky, the clock; its
 *   sections are the flight's models there (vehicle, pad, crew).
 * - **fly**: the flight deck, at the site: the vehicle under your hands, and the recorded flight.
 *
 * A place a flight does not have yet is still named, and says why it cannot be gone to (`lacks`).
 * The way back is always the same: front page, flight, place.
 *
 *   #                                    the front page: no flight's (front.ts)
 *   #lineup[/spacecraft][/<nation>/<programme>][/<flight id>[/vs/<flight id>...]]
 *                                        the Lineup: every vehicle side by side (lineup.ts); no flight's either. With
 *                                        `spacecraft`, the spacecraft alone; a programme named, its section of the
 *                                        row; a flight named is the one chosen; more, each after `vs`, stand together
 *                                        to be compared (`parseLineup`)
 *   #<flight id>                         the flight: its gallery
 *   #<flight id>/gallery[/<what>]        the gallery, on a part (its node), with one of the
 *                                        choices of what stands there (its id), or sitting in
 *                                        one of the vehicle's seats (its node: `Seat_Pilot`)
 *   #<flight id>/site[/<model>]          the launch site, on one of its sections
 *   #<flight id>/fly                     the flight deck
 *
 * Addresses older than the places still mean what they meant: `#<flight id>/<model>` is that
 * section of the site, and a bare `#<model>` (or `#gallery`, `#site/<model>`, `#fly`) is the first
 * listed flight's. So no model may be called `gallery`, `site`, `fly` or `lineup`.
 *
 * Nothing here touches the page but the last four (`where`, `write`, `settle`, `onMoved`), which are the only
 * things anywhere that read or write the address bar; the rest is arithmetic on the flight's data (tests/address.test.mjs).
 *
 * The history (docs/agents/gallery.md, "Back and Forward"): going to another flight or another place (the front page,
 * a flight's Gallery, Launch site, Fly) is a new entry, so Back returns to exactly where the visitor was and Forward
 * goes on again; what changes within a place (a part, a section, what stands there), and the page settling an address
 * into its own form, rewrites the entry it is on. So `write` decides by `samePlace`, and `settle` never adds one.
 */
export type Place = 'gallery' | 'site' | 'fly';

/** The places, in the order they are always offered, and what each is called. */
export const PLACES: readonly Place[] = ['gallery', 'site', 'fly'];
export const PLACE_NAME: Record<Place, string> = { gallery: 'Gallery', site: 'Launch site', fly: 'Fly' };
const isPlace = (s: string | undefined): s is Place => PLACES.includes(s as Place);

export interface Address {
  /** '' where the address names no flight. */
  flightId: string;
  /** Null: the address does not say, and the flight opens where it opens (`opensIn`). */
  place: Place | null;
  /** At the site, the section's model; in the gallery, a part's node, a choice's id or a seat's node. '' for none. */
  what: string;
}

/** Read an address bar's fragment (with or without its `#`). */
export function parseAddress(hash: string): Address {
  const parts = hash.replace(/^#/, '').split('/').filter(Boolean).map(decodeURIComponent);
  // a flight's id is three words; what follows, or stands alone, is a place and what is on show there
  const flight = parts.length >= 3 ? parts.slice(0, 3) : [];
  const [place, what = ''] = parts.slice(flight.length);
  const flightId = flight.join('/');
  if (place === undefined) return { flightId, place: null, what: '' };
  if (isPlace(place)) return { flightId, place, what: place === 'fly' ? '' : what };
  return { flightId, place: 'site', what: place }; // (an address older than the places: a section of the site)
}

/** Write one: the fragment, with its `#`. */
export function formatAddress(flightId: string, place: Place, what = ''): string {
  const words = [flightId, place, ...(what && place !== 'fly' ? [what] : [])];
  return `#${words.map((s) => s.split('/').map(encodeURIComponent).join('/')).join('/')}`;
}

type Dated = Pick<Flight, 'id' | 'launch'>;

/** The flights in the order they flew: the front page's, whatever order they are listed in. */
export const byDate = <F extends Dated>(flights: readonly F[]): F[] =>
  [...flights].sort((a, b) => Date.parse(a.launch) - Date.parse(b.launch));

/**
 * What the front page lists, in the order they flew: the flights there are, and between them those to come
 * (missions/upcoming.ts) that no flight has taken the place of yet. One to come has no `callsign`: it is not a flight.
 */
export function listed<F extends Dated>(flights: readonly F[], coming: readonly Upcoming[] = upcoming): (F | Upcoming)[] {
  const built = new Set(flights.map((f) => f.id));
  return byDate<F | Upcoming>([...flights, ...coming.filter((u) => !built.has(u.id))]);
}

/** Whether an address names nothing at all, neither a flight nor a place: the front page's (front.ts), which is no flight's. */
export const namesNothing = (hash: string): boolean => hash.replace(/^#/, '').split('/').filter(Boolean).length === 0;

/** The word an address begins with when it is the Lineup's. */
export const LINEUP = 'lineup';

/** What stands in the Lineup's row: every vehicle whole, or each spacecraft alone, without its launch vehicle. */
export type LineupRow = 'vehicles' | 'spacecraft';

/** What a Lineup address names. */
export interface LineupAddress {
  row: LineupRow;
  /**
   * A programme, by the first two words of its flights' ids ('usa/mercury'): its section of the row is what stands
   * there. Null: the whole row.
   */
  programme: string | null;
  /**
   * The flights named, in the order given: none, nothing chosen; one, that one chosen where it stands; more, those
   * alone, standing together to be compared (and no programme's section).
   */
  flights: string[];
}

/**
 * Read a Lineup address, or null if the address is not the Lineup's:
 *
 *   #lineup[/spacecraft][/<nation>/<programme>][/<flight id>[/vs/<flight id>...]]
 *
 * A flight's id is three words and a programme's is the first two of its flights'. What is named and is neither, or is
 * named twice, is left out (whether there is such a flight is for whoever has the list: `lineupFlights`).
 */
export function parseLineup(hash: string): LineupAddress | null {
  const words = hash.replace(/^#/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (words[0] !== LINEUP) return null;
  const rest = words.slice(1);
  const row: LineupRow = rest[0] === 'spacecraft' ? 'spacecraft' : 'vehicles';
  if (rest[0] === 'spacecraft') rest.shift();
  const flights: string[] = [];
  let programme: string | null = null;
  rest
    .join('/')
    .split(/(?:^|\/)vs(?:\/|$)/)
    .forEach((group, i) => {
      const id = group.split('/').filter(Boolean);
      // (the first thing named may be a programme, alone or before a flight of its own)
      if (i === 0 && (id.length === 2 || id.length === 5)) programme = id.splice(0, 2).join('/');
      if (id.length === 3 && !flights.includes(id.join('/'))) flights.push(id.join('/'));
    });
  return { row, programme: flights.length > 1 ? null : programme, flights };
}

/** Write a Lineup address: the fragment, with its `#`. */
export function formatLineup(row: LineupRow = 'vehicles', flights: readonly string[] = [], programme: string | null = null): string {
  const words = [
    LINEUP,
    ...(row === 'spacecraft' ? ['spacecraft'] : []),
    ...(programme && flights.length < 2 ? [programme] : []),
    ...flights.flatMap((id, i) => (i ? ['vs', id] : [id])),
  ];
  return `#${words.map((s) => s.split('/').map(encodeURIComponent).join('/')).join('/')}`;
}

/** The programme a flight is of, as an address names it: the first two words of its id. */
export const programmeOf = (flightId: string): string => flightId.split('/').slice(0, 2).join('/');

/** Whether an address is the Lineup's. */
export const namesLineup = (hash: string): boolean => parseLineup(hash) !== null;

/** Whether an address is about no one flight: the front page's or the Lineup's. A flight's page that finds itself at one lets itself go (home.ts). */
export const aboutNoFlight = (hash: string): boolean => namesNothing(hash) || namesLineup(hash);

/** The flights a Lineup address names that there are, in the order named. */
export function lineupFlights<F extends Dated>(flights: readonly F[], to: LineupAddress): F[] {
  return to.flights.flatMap((id) => flights.find((f) => f.id === id) ?? []);
}

/**
 * The flight an address is about: the one it names; and for one that names a place and no flight
 * (`#pad`, from when there was one flight), the first listed, which is the one that is whole
 * (missions/index.ts). An address that names nothing is about no flight (`namesNothing`: the front
 * page has a scene of its own); asked all the same, this gives the first listed.
 */
export function flightFor<F extends Dated>(flights: readonly F[], hash: string): F {
  const to = parseAddress(hash);
  return flights.find((f) => f.id === to.flightId) ?? flights[0]!;
}

/**
 * The model the gallery shows: the flight's vehicle. It is the one the run carries off the
 * pad where the flight says (`flies`); otherwise the first model that is hardware and not a person
 * (`walker`) or a place working through its morning (`sequence`). Null: nothing to exhibit.
 */
export function exhibit(flight: Pick<Flight, 'models' | 'flies'>): ModelDef | null {
  const hardware = flight.models.filter((m) => !m.walker && !m.sequence);
  return hardware.find((m) => m.id === flight.flies?.model) ?? hardware[0] ?? null;
}

type Placed = Pick<Flight, 'models' | 'flies' | 'site' | 'plan'>;

/**
 * Why a flight cannot be gone to at a place, or null if it can. It has a gallery when it has a
 * vehicle; a launch site when it says where that is (`site`) and has something that stands
 * there (a model whose backdrop is a place, not the studio); and it can be flown when it has that
 * site, a plan with a rigid body to steer (or, into orbit, an ascent on its steering law), and says which model flies (`flies`).
 */
export function lacks(flight: Placed, place: Place): string | null {
  if (place === 'gallery') return exhibit(flight) ? null : 'Gallery: no vehicle built yet';
  const sited = Boolean(flight.site) && flight.models.some((m) => m.backdrop !== 'studio');
  if (place === 'site') return sited ? null : 'Launch site: not built yet';
  // (a ballistic plan needs its rigid body to be steered; an orbital one an ascent on its steering law: sim/plan.ts `flownByHand`)
  if (!flownByHand(flight.plan) || !flight.flies) return 'Fly: no trajectory yet';
  return sited ? null : 'Fly: its launch site is not built yet';
}

/** Which places a flight has. */
export function entrances(flight: Placed): Record<Place, boolean> {
  return { gallery: !lacks(flight, 'gallery'), site: !lacks(flight, 'site'), fly: !lacks(flight, 'fly') };
}

/** The place a flight opens in: the one asked for if it has it, otherwise its gallery (its site, for a flight with no vehicle to show). */
export function opensIn(flight: Placed, asked: Place | null = null): Place {
  const has = entrances(flight);
  if (asked && has[asked]) return asked;
  return has.gallery ? 'gallery' : 'site';
}

/**
 * How the launch site first shows, as it is first gone to (`Flight.opens`): the instant to put the clock at, the section
 * and the view. Null where it opens as it always has (liftoff, the section asked for or the first, its home view): a
 * flight that says nothing, the flight deck (which starts at liftoff: cockpit.ts), or a clock that has been run or moved
 * already, which is the visitor's. `named`: the section the address names ('' for none), which wins over the flight's.
 */
export function openingFor(
  flight: Pick<Flight, 'opens' | 'models'>,
  how: { fly: boolean; named: string; clockAt: number; running: boolean },
): { at: number; model: string; view: string | null } | null {
  const o = flight.opens;
  if (!o || how.fly || how.running || how.clockAt !== 0) return null;
  const own = !how.named || how.named === (o.model ?? flight.models[0]?.id);
  const model = how.named || (o.model ?? flight.models[0]?.id ?? '');
  return { at: o.at, model, view: own ? (o.view ?? null) : null };
}

/** One choice of what stands in the gallery: all of the vehicle, or the parts under one heading of its parts list. */
export interface Plinth {
  id: string;
  label: string;
  /** The part nodes that stand there; null for all of them. */
  nodes: string[] | null;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * What can stand in the gallery, from the vehicle's own parts list: the whole of it, and each of
 * its groups alone (the spacecraft without its booster, the booster without its spacecraft) where
 * it has more than one. Nothing new is asked of a flight: `Part.group` is the heading the parts
 * are already listed under. Given how low each of the model's nodes reaches (`lowest`, once it has
 * arrived), the spacecraft alone is what rides on the launch vehicle, as the Lineup stands it
 * (`craftNodes`): Voskhod 2's airlock, listed under a heading of its own, with it. And what the
 * spacecraft flew to meet (`ModelDef.target`) stands beside it there, as in the Lineup (`targetNodes`).
 */
export function plinths(model: Pick<ModelDef, 'parts' | 'name' | 'target'>, lowest?: (node: string) => number | null): Plinth[] {
  const groups = [...new Set(model.parts.flatMap((p) => (p.group ? [p.group] : [])))];
  const whole: Plinth = { id: 'whole', label: `Whole ${model.name.toLowerCase()}`, nodes: null };
  if (groups.length < 2) return [whole];
  const each = groups.map((g) => ({ id: slug(g), label: g, nodes: model.parts.filter((p) => p.group === g).map((p) => p.node) }));
  // (a target is no part of the spacecraft and rides on nothing: it is left out of what is measured, and stood beside)
  const target = targetNodes(model);
  const craft = lowest ? craftNodes(vehicleHeadings(model), lowest) : null;
  return [whole, ...each.map((p) => (p.id === SPACECRAFT ? { ...p, nodes: [...(craft ?? p.nodes), ...target] } : p))];
}

/**
 * The headings of the vehicle itself, in the order its parts list has them, each with the nodes listed under it: its
 * spacecraft, its launch vehicle, an airlock. Not its target's (`ModelDef.target`), which is no part of it.
 */
export function vehicleHeadings(model: Pick<ModelDef, 'parts' | 'target'>): Heading[] {
  const groups = [...new Set(model.parts.flatMap((p) => (p.group && p.group !== model.target ? [p.group] : [])))];
  return groups.map((g) => ({ id: slug(g), nodes: model.parts.filter((p) => p.group === g).map((p) => p.node) }));
}

/**
 * The nodes of what the vehicle's spacecraft flew to meet (`ModelDef.target`: the parts under that heading of its
 * parts list): a third kind, neither the spacecraft nor what carried it. Where the spacecraft stands alone they
 * stand on the floor beside it, kept and not lowered with it; none where the model says no target.
 */
export function targetNodes(model: Pick<ModelDef, 'parts' | 'target'>): string[] {
  return model.target ? model.parts.filter((p) => p.group === model.target).map((p) => p.node) : [];
}

/** The heading a vehicle's parts list puts its spacecraft under, as a choice of what stands in the gallery (`plinths`). */
const SPACECRAFT = 'spacecraft';

/** A heading of a vehicle's parts list, and the top-level nodes listed under it. */
export interface Heading {
  id: string;
  nodes: string[];
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
 * What the gallery's address names: a part of the vehicle (shown whole, with that part chosen), one of the choices of
 * what stands there, or one of its seats (`seat`, by its index in `ModelDef.seats`: sat in, in the whole vehicle).
 * Anything else is the whole of it.
 */
export function galleryAt(
  model: Pick<ModelDef, 'parts' | 'name' | 'seats'>,
  what: string,
): { plinth: Plinth; part: string | null; seat: number | null } {
  const all = plinths(model);
  const part = model.parts.find((p) => p.node === what);
  if (part) return { plinth: all[0]!, part: part.node, seat: null };
  const seat = (model.seats ?? []).findIndex((s) => s.node === what);
  if (seat >= 0) return { plinth: all[0]!, part: null, seat };
  return { plinth: all.find((p) => p.id === what) ?? all[0]!, part: null, seat: null };
}

/**
 * The views there are of what stands on the plinth, after one of the whole of it: the vehicle's
 * own views of parts that are all there, from the direction each gives. A view given as a height
 * and a span (no parts) is of the whole vehicle where its flight stands it: it is kept only with
 * the whole of it on show, moved by `lift`, how much higher the vehicle stands here than there.
 */
export function plinthViews(model: Pick<ModelDef, 'views' | 'rotationY'>, plinth: Plinth, lift = 0): ViewDef[] {
  const there = (v: ViewDef) => Boolean(v.nodes?.length) && (!plinth.nodes || v.nodes!.every((n) => plinth.nodes!.includes(n)));
  // (a view that covers exactly what stands there is the whole of it again)
  const same = (v: ViewDef) => Boolean(plinth.nodes) && v.nodes!.length === plinth.nodes!.length;
  const measured = (v: ViewDef) => !v.nodes?.length && v.centreY !== undefined && v.span !== undefined && !plinth.nodes;
  // (a view's direction is the scene's, for the model as the flight turns it on its pad; here it stands as built)
  const turn = -(model.rotationY ?? 0);
  const unturned = ([x, y, z]: [number, number, number]): [number, number, number] =>
    turn ? [x * Math.cos(turn) + z * Math.sin(turn), y, -x * Math.sin(turn) + z * Math.cos(turn)] : [x, y, z];
  const from = (v: ViewDef) => (v.from ? { from: unturned(v.from) } : {});
  return [
    { id: WHOLE_VIEW, label: 'Whole' },
    ...model.views.flatMap((v): ViewDef[] => {
      if (there(v) && !same(v)) return [{ id: v.id, label: v.label, nodes: v.nodes!, ...from(v) }];
      if (measured(v)) return [{ id: v.id, label: v.label, centreY: v.centreY! + lift, span: v.span!, ...from(v) }];
      return [];
    }),
  ];
}

/** The gallery's view of everything that stands there: named so it is no vehicle's own. */
export const WHOLE_VIEW = 'gallery-whole';

/**
 * The flight as the gallery's stage is given it: the vehicle alone, at the origin of a studio, as
 * built (its slider at rest, nothing asked of anything else), with no site, no clock to follow,
 * no plan and nobody to walk as. Its seats are kept, to be sat in where it stands (`CabinView.sit`), with
 * nobody standing outside them (`figure`): there is no one else in the gallery.
 */
export function galleryFlight(flight: Flight): Flight {
  const vehicle = exhibit(flight);
  if (!vehicle) throw new Error(`${flight.id} has no vehicle to exhibit`);
  const { site: _site, plan: _plan, checks: _checks, flies: _flies, surroundings: _surroundings, ...rest } = flight;
  const {
    sequence: _sequence,
    walker: _walker,
    seats,
    with: _with,
    position: _position,
    rotationY: _rotationY,
    home: _home,
    ...model
  } = vehicle;
  const views = plinthViews(vehicle, plinths(vehicle)[0]!);
  const sat = seats?.map(({ figure: _figure, ...seat }) => seat);
  return {
    ...rest,
    models: [{ ...model, ...(sat?.length ? { seats: sat } : {}), backdrop: 'studio', wide: false, home: WHOLE_VIEW, views }],
  };
}

/** The figure that stands beside the vehicle for scale, where the flight has one: its first crew model. Null: an outline of a person does. */
export function scaleFigure(flight: Pick<Flight, 'models'>): ModelDef | null {
  return flight.models.find((m) => m.walker) ?? null;
}

/**
 * Whether two addresses are one entry's worth of the history: the same flight at the same place (or both the front
 * page, or both the Lineup), whatever is on show there. Read as written: `#pad` and the flight's own `#…/site/pad` are not the same place
 * until the page has settled the first into the second (`settle`).
 */
export function samePlace(a: string, b: string): boolean {
  // (the Lineup is one place, whatever is chosen or compared in it)
  if (namesLineup(a) || namesLineup(b)) return namesLineup(a) && namesLineup(b);
  const [x, y] = [parseAddress(a), parseAddress(b)];
  return x.flightId === y.flightId && x.place === y.place;
}

/** The address bar's fragment, with its `#` ('' for one that names nothing). */
export const where = (): string => location.hash;

const bar = (hash: string): string => hash || location.pathname + location.search;

/**
 * Say where the page is: a new entry in the history if it is another flight or place than the address says now (the
 * visitor has gone somewhere: Back returns), otherwise the entry it is on rewritten (something chosen within a place).
 */
export function write(hash: string): void {
  if (hash === where()) return;
  if (samePlace(where(), hash)) history.replaceState(history.state, '', bar(hash));
  else history.pushState(null, '', bar(hash));
}

/** Rewrite the entry the page is on, whatever it names: an address settled into its own form (`#pad`, a flight with no place), never a step of the visitor's. */
export function settle(hash: string): void {
  if (hash !== where()) history.replaceState(history.state, '', bar(hash));
}

/**
 * Keep something of how a place was left with the entry the page is on (the gallery's open tab), so that coming Back to
 * it finds it as it was. The address is not changed. Rewriting the entry (`write` within a place, `settle`) keeps what
 * is kept; a new entry starts with nothing.
 */
export function keep(name: string, value: string | null): void {
  const state = { ...((history.state as Record<string, unknown> | null) ?? {}), [name]: value };
  history.replaceState(state, '');
}

/** What was kept with the entry the page is on (`keep`), or null. */
export function kept(name: string): string | null {
  const value = (history.state as Record<string, unknown> | null)?.[name];
  return typeof value === 'string' ? value : null;
}

/** `then` is called when the address is changed under the page: Back, Forward, or one typed or followed. (Not for `write` or `settle`.) */
export function onMoved(then: () => void): void {
  addEventListener('hashchange', then);
}

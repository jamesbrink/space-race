import type { Flight, ModelDef, ViewDef } from './types';

/**
 * Where the page is: the address bar's fragment, and the two places a flight can be seen in.
 *
 * A flight is shown in one of two places. The **site** is where it flew from: the pad, the crew,
 * the day's sky, the clock, the flight itself. The **gallery** is nowhere: the vehicle alone on a
 * plain floor under designed light, to be taken apart and read. A flight whose site is not built
 * yet has only the gallery.
 *
 *   #                                        the front page
 *   #<nation>/<programme>/<flight>           the flight, in the place it opens in
 *   #<nation>/<programme>/<flight>/<model>   at its site, on one of its sections
 *   #<nation>/<programme>/<flight>/gallery   in the gallery
 *   #<nation>/<programme>/<flight>/gallery/<what>
 *                                            in the gallery, on a part (its node) or with one of
 *                                            the choices of what stands there (its id)
 *
 * A bare `#<model>`, `#gallery` or `#gallery/<what>` is the first flight's, so links made when
 * there was one flight still work. So no model may be called `gallery`.
 *
 * Nothing here touches the page: it is all arithmetic on the flight's data (tests/address.test.mjs).
 */
export type Place = 'site' | 'gallery';

export const GALLERY = 'gallery';

export interface Address {
  /** '' for the first flight (an address that names none). */
  flightId: string;
  /** Null: the address does not say, and the flight opens where it opens (`opensIn`). */
  place: Place | null;
  /** At the site, the section's model; in the gallery, a part's node or a choice's id. '' for neither. */
  what: string;
}

/** Read an address bar's fragment (with or without its `#`). */
export function parseAddress(hash: string): Address {
  const parts = hash.replace(/^#/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const at = parts.indexOf(GALLERY);
  // the gallery's word is only ever in the second or fourth place: after nothing, or after a flight's three
  if (at === 0 || at === 3) return { flightId: parts.slice(0, at).join('/'), place: 'gallery', what: parts[at + 1] ?? '' };
  if (parts.length === 1 || parts.length === 4) return { flightId: parts.slice(0, -1).join('/'), place: 'site', what: parts.at(-1)! };
  return { flightId: parts.join('/'), place: null, what: '' };
}

/** Write one: the fragment, with its `#`. */
export function formatAddress(flightId: string, place: Place, what = ''): string {
  const tail = place === 'gallery' ? [GALLERY, ...(what ? [what] : [])] : what ? [what] : [];
  return `#${[flightId, ...tail].map((s) => s.split('/').map(encodeURIComponent).join('/')).join('/')}`;
}

/**
 * The model the gallery shows: the flight's vehicle. It is the one the trajectory carries off the
 * pad where the flight says (`flies`); otherwise the first model that is hardware and not a person
 * (`walker`) or a place working through its morning (`sequence`). Null: nothing to exhibit.
 */
export function exhibit(flight: Pick<Flight, 'models' | 'flies'>): ModelDef | null {
  const hardware = flight.models.filter((m) => !m.walker && !m.sequence);
  return hardware.find((m) => m.id === flight.flies?.model) ?? hardware[0] ?? null;
}

/**
 * The ways into a flight. It has a site to go to when it says where that is (`site`) and has
 * something that stands in a place: a model whose backdrop is somewhere, not the studio. It has a
 * gallery when it has a vehicle. A flight with only its vehicle built has only the gallery.
 */
export function entrances(flight: Pick<Flight, 'models' | 'flies' | 'site'>): Record<Place, boolean> {
  return {
    site: Boolean(flight.site) && flight.models.some((m) => m.backdrop !== 'studio'),
    gallery: exhibit(flight) !== null,
  };
}

/** The place a flight opens in when the address asks for one it does not have, or for none: its site if it has one. */
export function opensIn(flight: Pick<Flight, 'models' | 'flies' | 'site'>, asked: Place | null = null): Place {
  const has = entrances(flight);
  if (asked && has[asked]) return asked;
  return has.site ? 'site' : 'gallery';
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
 * are already listed under.
 */
export function plinths(model: Pick<ModelDef, 'parts'>): Plinth[] {
  const groups = [...new Set(model.parts.flatMap((p) => (p.group ? [p.group] : [])))];
  const whole: Plinth = { id: 'whole', label: groups.length > 1 ? 'Whole stack' : 'Whole', nodes: null };
  if (groups.length < 2) return [whole];
  return [whole, ...groups.map((g) => ({ id: slug(g), label: g, nodes: model.parts.filter((p) => p.group === g).map((p) => p.node) }))];
}

/**
 * What the gallery's address names: a part of the vehicle (shown whole, with that part chosen),
 * or one of the choices of what stands there. Anything else is the whole of it.
 */
export function galleryAt(model: Pick<ModelDef, 'parts'>, what: string): { plinth: Plinth; part: string | null } {
  const all = plinths(model);
  const part = model.parts.find((p) => p.node === what);
  if (part) return { plinth: all[0]!, part: part.node };
  return { plinth: all.find((p) => p.id === what) ?? all[0]!, part: null };
}

/** The views there are of what stands on the plinth: the vehicle's own named views whose parts are all there, after one of the whole of it. */
export function plinthViews(model: Pick<ModelDef, 'views'>, plinth: Plinth): ViewDef[] {
  const there = (v: ViewDef) => Boolean(v.nodes?.length) && (!plinth.nodes || v.nodes!.every((n) => plinth.nodes!.includes(n)));
  // (a view that covers exactly what stands there is the whole of it again)
  const same = (v: ViewDef) => Boolean(plinth.nodes) && v.nodes!.length === plinth.nodes!.length;
  return [
    { id: WHOLE_VIEW, label: 'Whole' },
    ...model.views.filter((v) => there(v) && !same(v)).map((v) => ({ id: v.id, label: v.label, nodes: v.nodes! })),
  ];
}

/** The gallery's view of everything that stands there: named so it is no vehicle's own. */
export const WHOLE_VIEW = 'gallery-whole';

/**
 * The flight as the gallery's stage is given it: the vehicle alone, at the origin of a studio, as
 * built (its slider at rest, nothing asked of anything else), with no site, no clock to follow,
 * no trajectory, no seats to take and nobody to walk as.
 */
export function galleryFlight(flight: Flight): Flight {
  const vehicle = exhibit(flight);
  if (!vehicle) throw new Error(`${flight.id} has no vehicle to exhibit`);
  const { site: _site, trajectory: _trajectory, checks: _checks, flies: _flies, surroundings: _surroundings, ...rest } = flight;
  const {
    sequence: _sequence,
    walker: _walker,
    seats: _seats,
    with: _with,
    position: _position,
    rotationY: _rotationY,
    home: _home,
    ...model
  } = vehicle;
  const views = plinthViews(vehicle, plinths(vehicle)[0]!);
  return { ...rest, models: [{ ...model, backdrop: 'studio', wide: false, home: WHOLE_VIEW, views }] };
}

/** The figure that stands beside the vehicle for scale, where the flight has one: its first crew model. Null: an outline of a person does. */
export function scaleFigure(flight: Pick<Flight, 'models'>): ModelDef | null {
  return flight.models.find((m) => m.walker) ?? null;
}

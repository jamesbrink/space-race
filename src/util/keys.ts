/**
 * Every key the page answers to, as data (AGENTS.md: keys only every keyboard has): what it is pressed as, what it
 * does in the words the legends use, and where it applies. The listeners ask this table whether a key is theirs
 * (`is`, `which`) and the legends are drawn from it (`capsOf`, `doesOf`), so a key and what is said of it cannot drift
 * apart: change one here and both change. tests/keys.test.mjs holds the page to it (no key compared anywhere else,
 * every entry used). The curtain's rule is the curtain's (app/curtain.ts): no key acts under it, whatever this says.
 */
import { esc } from './dom.ts';

/** A key of the page: its slots (each the `e.key` values that press it, lower-cased; the first is the one drawn), what it does, where. */
export interface KeyDef {
  /** Each slot is one cap in the legend; a slot of several keys answers to any of them (R, and + or = for the same zoom). */
  slots: readonly (string | readonly string[])[];
  /** What it does, as the legend says it (a legend may put it its own way for a rig: `cam.home`). */
  does: string;
  /** Where and when it applies: the page, and the state it is in. */
  when: string;
}

const ARROWS = ['arrowup', 'arrowleft', 'arrowdown', 'arrowright'] as const;
const WASD = ['w', 'a', 's', 'd'] as const;
const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

export const KEYS = {
  // ---- every page with panels
  'page.cel': { slots: ['t'], does: 'cel shading', when: 'a site, the gallery, the Lineup' },
  'page.legend': { slots: ['?'], does: 'this list', when: 'a site, the gallery, the Lineup' },
  'page.bare': { slots: ['h'], does: 'hide panels', when: 'a site, the gallery, the Lineup' },
  // ---- a flight's site (main.ts, ui.ts, timebar.ts, sound)
  'clock.run': { slots: ['p'], does: 'run · stop', when: 'a site: the clock, from anywhere' },
  'clock.rate': { slots: ['[', ']'], does: 'slower · faster', when: 'a site: the clock' },
  'sound.toggle': { slots: ['u'], does: 'sound on · off', when: 'a site' },
  'cam.next': { slots: ['c'], does: 'next camera', when: 'a site, off foot (on foot C is foot.view)' },
  'cam.home': {
    slots: ['0'],
    does: 'reset view',
    when: 'a site, off foot: the section’s first view, the vehicle centred, or ahead from the seat',
  },
  'cut.toggle': { slots: ['y'], does: 'skin off · on', when: 'a site: what is on show that can be opened' },
  'page.back': { slots: ['escape'], does: 'back a step', when: 'a site: what is chosen let go, a callout put away' },
  'walk.go': { slots: ['v'], does: 'walk as crew', when: 'a site with a figure to walk as, off the flight deck' },
  'seat.lean': { slots: DIGITS, does: 'lean to', when: 'from a seat: the lookouts, each by its digit' },
  'seat.deck': { slots: ['p'], does: 'the flight deck back', when: 'on board in flight' },
  // ---- the camera's rigs (viewer/camera/input.ts hands them to the rig in charge, which reads them as held)
  'orbit.move': { slots: WASD, does: 'move', when: 'orbit: slide the pivot over the ground' },
  'orbit.turn': {
    slots: ARROWS,
    does: 'orbit · tilt',
    when: 'orbit, chase, locked (on the flight deck up and down are the throttle’s: deck.lever)',
  },
  'orbit.rise': { slots: ['e', 'q'], does: 'up · down', when: 'orbit, free' },
  'orbit.zoom': {
    slots: [
      ['r', '+', '='],
      ['f', '-'],
    ],
    does: 'zoom',
    when: 'every rig',
  },
  'free.fly': { slots: WASD, does: 'fly', when: 'free' },
  'free.look': { slots: ARROWS, does: 'look', when: 'free, on board' },
  'free.faster': { slots: ['shift'], does: 'faster', when: 'free' },
  'pad.frame': { slots: ARROWS, does: 'frame it', when: 'the pad camera' },
  // ---- on foot (viewer/onfoot/walk.ts; main.ts for a function worked by hand)
  'foot.walk': { slots: WASD, does: 'walk', when: 'on foot' },
  'foot.turn': { slots: ARROWS, does: 'walk · turn', when: 'on foot' },
  'foot.run': { slots: ['shift'], does: 'run', when: 'on foot' },
  'foot.jump': { slots: [' '], does: 'jump', when: 'on foot' },
  'foot.act': { slots: ['e'], does: 'act on what you face', when: 'on foot' },
  'foot.view': { slots: ['c'], does: 'eyes · over the shoulder', when: 'on foot' },
  'foot.free': {
    slots: ['escape'],
    does: 'free the mouse',
    when: 'on foot, the mouse captured for looking round: the walk goes on (viewer/onfoot/escape.ts)',
  },
  'foot.leave': {
    slots: ['escape'],
    does: 'back to the camera',
    when: 'on foot, the mouse free: a second Esc, or the first where it was never captured (V too, at once: walk.go)',
  },
  'foot.climb': { slots: ['w', 's'], does: 'up · down', when: 'on a ladder' },
  'work.push': {
    slots: [
      ['w', 'arrowup'],
      ['s', 'arrowdown'],
    ],
    does: 'run it on · back',
    when: 'on foot, working a function by hand',
  },
  'work.done': { slots: ['e'], does: 'done', when: 'on foot, working a function by hand' },
  // ---- the flight deck (deck/deck.ts) and its instruments
  'deck.toggle': { slots: ['l'], does: 'fly it yourself', when: 'a site with a flight to fly: in, and out again' },
  'deck.steer': {
    slots: ['w', 's', 'a', 'd', 'q', 'e'],
    does: 'pitch · yaw · roll',
    when: 'the flight deck, flown by hand: on a launch vehicle a key is a tenth of full throw (deck.ts `FINE`), the stick as far as pushed',
  },
  'deck.next': { slots: [' '], does: 'the next event now', when: 'the flight deck' },
  'deck.guidance': { slots: ['g'], does: 'guidance', when: 'the flight deck' },
  'deck.sequence': { slots: ['b'], does: 'sequencer', when: 'the flight deck' },
  'deck.hold': {
    slots: ['enter'],
    does: 'hold attitude',
    when: 'the flight deck: the autopilot keeps the attitude you leave it at while guidance is off (every letter is taken)',
  },
  'deck.again': { slots: ['n'], does: 'fly again', when: 'the flight deck' },
  'deck.leave': { slots: ['escape'], does: 'leave', when: 'the flight deck (L too)' },
  'deck.abort': { slots: ['x'], does: 'abort (twice)', when: 'the flight deck' },
  'deck.resume': {
    slots: [' '],
    does: 'resume the kept flight',
    when: 'the flight deck, a kept flight not yet resumed (N starts it over)',
  },
  'ask.stay': { slots: ['escape'], does: 'keep flying', when: 'the question of leaving a flight flown by hand: the default answer' },
  'ask.step': { slots: ['tab'], does: 'the other answer', when: 'the question of leaving a flight flown by hand' },
  'ask.press': {
    slots: [['enter', ' ']],
    does: 'the answer in focus: Keep flying until another is chosen',
    when: 'the question of leaving a flight flown by hand',
  },
  'ask.leave': { slots: ['l'], does: 'leave, and lose the flight', when: 'the question of leaving a flight flown by hand' },
  'ask.again': {
    slots: ['n'],
    does: 'start over, or throw the kept flight away',
    when: 'the question before a flight flown by hand is thrown away',
  },
  'path.show': { slots: ['j'], does: 'path', when: 'the flight deck (M is the map)' },
  'map.show': {
    slots: ['m'],
    does: 'map · back',
    when: 'the flight deck: the whole path from far out, and back to the view it was taken from',
  },
  'map.focus': { slots: ['c'], does: 'about the vehicle · the Earth', when: 'the map (C elsewhere is cam.next)' },
  'path.choose': { slots: ['k'], does: 'path · to cutoff · cut now', when: 'the flight deck, under guidance with the engine burning' },
  'navball.show': { slots: ['i'], does: 'navball', when: 'the flight deck' },
  'navball.frame': { slots: ['o'], does: 'surface · orbit', when: 'the flight deck' },
  'deck.lever': {
    slots: ['arrowup', 'arrowdown'],
    does: 'throttle up · down a notch',
    when: 'the flight deck: every liquid engine (sim/lever.ts); held, it goes on; the camera tilts by dragging there',
  },
  'deck.full': { slots: ['z'], does: 'throttle full', when: 'the flight deck: every liquid engine' },
  'deck.warp': {
    slots: ['k'],
    does: 'warp to the next · stop',
    when: 'the orbital deck on a coast on rails: as fast as the coast lets the clock run, to the next burn’s lead-in or whatever is due (K on the ballistic deck is path.choose)',
  },
  'warp.go': { slots: ['enter'], does: 'warp to the time typed', when: 'the warp’s time being typed, on the orbital deck' },
  'deck.code': { slots: ['0', ...DIGITS], does: 'a digit of the lock’s code', when: 'the orbital deck, the spacecraft alone and locked' },
  // ---- the gallery (ui/gallery.ts)
  'rover.drive': {
    slots: [
      ['w', 'arrowup'],
      ['a', 'arrowleft'],
      ['s', 'arrowdown'],
      ['d', 'arrowright'],
    ],
    does: 'forward · left · reverse · right',
    when: 'driving a lunar rover',
  },
  'rover.brake': { slots: [' '], does: 'brake', when: 'driving a lunar rover' },
  'rover.camera': { slots: ['c'], does: 'chase · driver’s seat', when: 'driving a lunar rover' },
  'rover.leave': { slots: ['escape'], does: 'return to the Gallery', when: 'driving a lunar rover' },
  'gallery.next': { slots: ['n', 'b'], does: 'next part · the one before', when: 'the gallery' },
  'gallery.sit': { slots: ['c'], does: 'sit in the cabin', when: 'the gallery, with a seat' },
  'gallery.cut': { slots: [['y', 'x']], does: 'cutaway', when: 'the gallery, a vehicle that opens (X was its key before Y)' },
  'gallery.scale': { slots: ['g'], does: 'a person for scale', when: 'the gallery' },
  'gallery.light': { slots: ['l'], does: 'light · dark room', when: 'the gallery' },
  'gallery.back': { slots: ['escape'], does: 'back to the whole of it', when: 'the gallery (from the seat: sit back, get up)' },
  'gallery.slide': { slots: WASD, does: 'slide', when: 'the gallery' },
  // ---- the Lineup (app/lineup.ts)
  'lineup.next': { slots: ['n', 'b'], does: 'the next · the one before', when: 'the Lineup' },
  'lineup.open': { slots: ['o'], does: 'open the chosen one’s gallery', when: 'the Lineup, one chosen' },
  'lineup.pick': { slots: ['x'], does: 'stand another beside it, to compare', when: 'the Lineup' },
  'lineup.row': { slots: ['p'], does: 'spacecraft alone · whole vehicles', when: 'the Lineup' },
  'lineup.scale': { slots: ['g'], does: 'people and heights, for scale', when: 'the Lineup' },
  'lineup.light': { slots: ['l'], does: 'light · dark hall', when: 'the Lineup' },
  'lineup.back': { slots: ['escape'], does: 'back a step: to the whole row', when: 'the Lineup' },
  'lineup.along': { slots: WASD, does: 'along the row', when: 'the Lineup' },
  // ---- widgets: a row of tabs, a menu, the wheel of choices (ui/wheel.ts)
  'tabs.step': { slots: ['arrowleft', 'arrowright'], does: 'the tab before · the next', when: 'a row of tabs with the focus' },
  'front.step': { slots: ['arrowup', 'arrowdown'], does: 'the choice above · below', when: 'the front page' },
  'front.into': { slots: ['arrowright'], does: 'to the flights', when: 'the front page, on the menu' },
  'front.back': { slots: [['arrowleft', 'escape']], does: 'back to the menu', when: 'the front page, in the flights' },
  'menu.close': { slots: ['escape'], does: 'close it', when: 'a menu open' },
  'wheel.aim': { slots: ARROWS, does: 'point at a choice', when: 'the wheel open' },
  'wheel.pick': { slots: [['enter', ' ']], does: 'choose it', when: 'the wheel open' },
  'wheel.step': { slots: ['tab'], does: 'the next choice (Shift: the one before)', when: 'the wheel open' },
  'wheel.choose': { slots: DIGITS, does: 'choose by its number', when: 'the wheel open' },
  'wheel.close': { slots: ['escape'], does: 'close it (left to whoever has the controls)', when: 'the wheel open' },
} as const satisfies Record<string, KeyDef>;

export type KeyName = keyof typeof KEYS;

/** The key a keyboard event names, as the table writes it (lower-cased: 'p', 'escape', 'arrowup', ' '). */
export const keyOf = (e: KeyboardEvent): string => e.key.toLowerCase();

/** Which slot of `name` the event presses (its index), or -1. */
export function which(e: KeyboardEvent | string, name: KeyName): number {
  const key = typeof e === 'string' ? e : keyOf(e);
  return (KEYS[name].slots as readonly (string | readonly string[])[]).findIndex((s) =>
    typeof s === 'string' ? s === key : s.includes(key),
  );
}

/** Whether the event presses `name`. */
export const is = (e: KeyboardEvent | string, name: KeyName): boolean => which(e, name) >= 0;

/** Every key that presses any of `names`. */
export function keysOf(...names: KeyName[]): Set<string> {
  return new Set(
    names.flatMap((n) => (KEYS[n].slots as readonly (string | readonly string[])[]).flatMap((s) => (typeof s === 'string' ? [s] : [...s]))),
  );
}

/** The keys the camera's rigs read as held (viewer/camera/input.ts): every rig's moving, turning, rising and zooming. */
export const CAMERA_HELD: ReadonlySet<string> = keysOf(
  'orbit.move',
  'orbit.turn',
  'orbit.rise',
  'orbit.zoom',
  'free.fly',
  'free.look',
  'pad.frame',
);

/** A held modifier makes a key the browser's or the system's: no shortcut of the page's. */
export const modified = (e: KeyboardEvent): boolean => e.metaKey || e.ctrlKey || e.altKey;

/** A modifier pressed alone (Shift, Control, Alt, Meta): no touch of the page's, the start of a chord. */
export const modifierOnly = (e: KeyboardEvent): boolean => ['Shift', 'Control', 'Alt', 'Meta'].includes(e.key);

const CAP: Record<string, string> = {
  arrowup: '↑',
  arrowleft: '←',
  arrowdown: '↓',
  arrowright: '→',
  escape: 'Esc',
  ' ': 'Space',
  shift: 'Shift',
};
/** How a key is drawn on its cap. */
export const capOf = (key: string): string => CAP[key] ?? (key.length === 1 ? key.toUpperCase() : key);

/** The caps of `name` (or of several, in turn: one legend row for keys of different handlers), as the legend draws them. */
export function capsOf(...names: KeyName[]): string[] {
  return names.flatMap((n) =>
    (KEYS[n].slots as readonly (string | readonly string[])[]).map((s) => capOf(typeof s === 'string' ? s : s[0]!)),
  );
}

/** What `name` does, in the legend's words. */
export const doesOf = (name: KeyName): string => KEYS[name].does;

/**
 * Whether a key is going into something being typed in, and so is no shortcut: a text field, a text area, a list, or
 * anything editable. A range input is not one: the keys keep working while a slider has the focus (it takes only the
 * arrows, which the camera leaves to it).
 */
export const isTyping = (e: KeyboardEvent): boolean =>
  (e.target as Element | null)?.matches?.('input:not([type=range]), textarea, select, [contenteditable]') ?? false;

/** Caps as the page draws them in a line of keys (`<kbd>` each, a space between). */
export const kbdOf = (caps: readonly string[]): string => caps.map((c) => `<kbd>${esc(c)}</kbd>`).join(' ');

/** The caps of `names`, drawn (a legend row's keys, a button's). */
export const kbd = (...names: KeyName[]): string => kbdOf(capsOf(...names));

/** The caps of `name` as a cluster draws them, side by side as they lie (a pad of arrows, W A S D, a pair). */
export const padCaps = (name: KeyName): string =>
  capsOf(name)
    .map((c) => `<kbd>${esc(c)}</kbd>`)
    .join('');

/** One legend row for each of `names`: its caps, and what it does (a line apart, as rows written by hand are). */
export const keyRows = (...names: KeyName[]): string =>
  names.map((n) => `<div><dt>${kbd(n)}</dt><dd>${esc(doesOf(n))}</dd></div>`).join('\n');

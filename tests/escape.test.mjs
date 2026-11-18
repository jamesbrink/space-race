// Escape on foot (src/viewer/onfoot/escape.ts): with the mouse captured for looking round, the first Escape only frees it
// and the walk goes on; a second, the mouse free, leaves. Where it was never captured one Escape leaves. A capture lost
// with the window is no Escape. Held to a table here; walk-test.mjs holds the page to it with real keys.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ECHO, onEscape } from '../src/viewer/onfoot/escape.ts';

const key = (over = {}) => ({ lost: false, captured: false, repeat: false, since: Number.POSITIVE_INFINITY, holder: null, ...over });
const lost = (over = {}) => ({ lost: true, focused: true, holder: null, ...over });

test('captured: the first Escape frees the mouse, however it is heard, and the walk goes on', () => {
  // the browser's way: it lets the pointer go and the page hears only that
  assert.equal(onEscape(lost()), 'freed');
  // a browser that sends the key while the pointer is still captured: let it go, which comes back as lost
  assert.equal(onEscape(key({ captured: true })), 'let-go');
});

test('free after one Escape: the second leaves', () => {
  assert.equal(onEscape(key({ since: 0.6 })), 'leave');
  assert.equal(onEscape(key({ since: 30 })), 'leave');
});

test('never captured (a finger, a coarse pointer, a capture refused): one Escape leaves', () => {
  assert.equal(onEscape(key()), 'leave');
});

test('the browser letting go and then sending the same press is one Escape, not two', () => {
  for (const since of [-0.02, 0, 0.004, ECHO - 0.001]) assert.equal(onEscape(key({ since })), 'quiet', `${since} s after`);
  assert.equal(onEscape(key({ since: ECHO })), 'leave');
});

test('a held key repeats nothing: its repeats are not a second Escape', () => {
  assert.equal(onEscape(key({ repeat: true, since: 1 })), 'quiet');
  assert.equal(onEscape(key({ repeat: true, captured: true })), 'quiet');
  assert.equal(onEscape(key({ repeat: true, holder: 'work', since: 1 })), 'quiet');
});

test('the window going (another app, alt-tab) lets the mouse go and is no Escape: nothing said, and the next Escape leaves', () => {
  for (const holder of [null, 'menu', 'work']) assert.equal(onEscape(lost({ focused: false, holder })), 'quiet');
  // (the free pointer it leaves is any free pointer: the walker does not count it as freed, so `since` stays as it was)
  assert.equal(onEscape(key()), 'leave');
});

test('the wheel open: the first Escape shuts it as a menu, the mouse free; the next leaves', () => {
  assert.equal(onEscape(lost({ holder: 'menu' })), 'freed-close');
  assert.equal(onEscape(key({ captured: true, holder: 'menu' })), 'let-go');
  // opened with the mouse free (or reopened after): Escape shuts it, and only the one after leaves
  assert.equal(onEscape(key({ holder: 'menu', since: 1 })), 'close');
  assert.equal(onEscape(key({ since: 1 })), 'leave');
});

test('a function worked by hand: the first Escape frees the mouse and the work goes on; the next lets go of it; then one leaves', () => {
  assert.equal(onEscape(lost({ holder: 'work' })), 'freed');
  assert.equal(onEscape(key({ captured: true, holder: 'work' })), 'let-go');
  assert.equal(onEscape(key({ holder: 'work', since: 1 })), 'close');
  assert.equal(onEscape(key({ since: 2 })), 'leave');
});

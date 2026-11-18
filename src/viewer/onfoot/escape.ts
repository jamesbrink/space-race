/**
 * Escape on foot, as a rule on its own so that it can be held to a table (tests/escape.test.mjs; walking.md, "Escape frees
 * the mouse first"). While the pointer is captured for looking round, the first Escape only lets it go: the walk goes on
 * from where it stood, nothing reset, and the page says so; a second Escape, the pointer now free, leaves (`foot.free`,
 * then `foot.leave`, in util/keys.ts). Where the pointer was never captured (a finger, a coarse pointer, a capture the
 * browser refused) there is nothing to free, and one Escape leaves.
 *
 * A captured pointer's Escape is the browser's: it lets the pointer go and the page may never hear the key, so the first
 * Escape is mostly heard as the capture lost while the page has the focus (`lost`). A browser that does send the key while
 * the pointer is still captured (headless Chrome does, and lets nothing go) is answered by letting it go here, which comes
 * back as `lost`; one that sends the key after letting go is heard within `ECHO` of the loss, and that is the same press.
 * The capture lost while the page has not the focus (another window, another app) is no Escape: nothing is said, and the
 * next Escape leaves, as from any free pointer, which is what the walk bar says then.
 *
 * Something else may have the controls (Walker.hold). A menu (the wheel, which takes the mouse) shuts at the first Escape
 * as menus do, the pointer going free with it; a function worked by hand (which leaves the mouse to the head) goes on, and
 * the next Escape lets go of it, and the one after that leaves. A held key's repeats are never a second Escape.
 */

/** What has the controls besides the walker: a menu that takes the mouse, a function worked by hand, or nothing. */
export type Holder = 'menu' | 'work' | null;

/** What was heard: the capture lost, or the Escape key itself. */
export type Heard =
  | {
      lost: true;
      /** The page had the focus as it was lost: Escape (or the browser's own reasons); without it, the window went. */
      focused: boolean;
      holder: Holder;
    }
  | {
      lost: false;
      /** The pointer is captured as the key arrives. */
      captured: boolean;
      /** A held key's repeat. */
      repeat: boolean;
      /** Seconds since the capture was last lost by Escape (`freed`), by the events' own times; Infinity if it has not been. */
      since: number;
      holder: Holder;
    };

/**
 * What to do:
 * - `quiet`: nothing (the window went, a repeat, the browser's own Escape heard a second time);
 * - `let-go`: let the captured pointer go, as the browser would (it comes back as `lost`);
 * - `freed`: the pointer has been let go by Escape: say so, and the walk goes on;
 * - `freed-close`: the same, and the menu that had the controls shuts;
 * - `close`: what has the controls lets go of them (the wheel shuts, a function worked by hand is let go);
 * - `leave`: back to the camera.
 */
export type Answer = 'quiet' | 'let-go' | 'freed' | 'freed-close' | 'close' | 'leave';

/** How soon after the capture is lost by Escape the key is still that same press, seconds: a person's second press is slower. */
export const ECHO = 0.1;

export function onEscape(heard: Heard): Answer {
  if (heard.lost) {
    if (!heard.focused) return 'quiet';
    return heard.holder === 'menu' ? 'freed-close' : 'freed';
  }
  if (heard.repeat) return 'quiet';
  if (heard.captured) return 'let-go';
  if (heard.since < ECHO) return 'quiet';
  return heard.holder ? 'close' : 'leave';
}

import { stepsIn } from './address.ts';
import { goHome } from './home.ts';
import { prefs } from './prefs.ts';
import { esc } from '../util/dom.ts';
import { is, KEYS, kbd } from '../util/keys.ts';
/**
 * The curtain: what is shown while something is on its way in. There is one, the same wherever
 * something loads (a flight's gallery, its launch site): the name of what is coming, a bar that
 * never goes back, what is being done now, and the steps with their sizes. Its looks are
 * style.css's (`.loading`); a failure is said in its place as a notice, with the way to try again.
 */

/** A step of the loading, as the curtain lists it: what it is, how far along (0 to 1), and a few words beside it (its size). */
export interface LoadStep {
  label: string;
  done: number;
  note?: string;
}

/** The curtain's markup: put it last in whatever it is to cover, and hand its element to `Curtain`. */
export const CURTAIN = `
      <div class="loading" role="status">
        <div class="loading-card">
          <p class="loading-kicker">Loading</p>
          <strong class="loading-name"></strong>
          <div class="loading-bar" aria-hidden="true"></div>
          <p class="loading-line"><span class="loading-now"></span><output class="loading-pct"></output></p>
          <ol class="loading-steps" aria-hidden="true"></ol>
          <button hidden title="Fetch it again">Try again</button>
          <p class="loading-ways">
            <button class="loading-cancel" data-cancel title="Stop loading and go back to where you were">${kbd('menu.close')}Cancel</button>
            <button class="loading-sound switch" data-sound aria-pressed="false" title="Sound on or off, before it starts">${kbd('sound.toggle')}Sound</button>
          </p>
        </div>
      </div>`;

/** Every curtain that is up: begun, and neither lifted nor failed. */
const up = new Set<Curtain>();
/** Who is to be told when a curtain next lifts and leaves none up. */
const waiting: (() => void)[] = [];
/**
 * Be told, once, the next time a curtain lifts with none left up: what was on its way in is there to be seen. (The
 * front page holds its own picture behind a flight's curtain until then: front.ts.)
 */
export function whenLifted(then: () => void): void {
  waiting.push(then);
}

/**
 * While a curtain is up and can be seen, no key reaches the page: whatever is on its way in is not there to be worked
 * yet, and a key that acted on it would act on half a scene. One listener, taken at the window before any other hears
 * the key, so nothing that listens for keys has to know about loading. Keys held with Command, Control or Alt are the
 * browser's; a key's release is let through, so nothing held when the curtain came down is left held; and what a key
 * does of itself (Tab, a focused "Try again") is untouched, since only the page's listeners are kept from it.
 */
function gate(e: KeyboardEvent): void {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  for (const curtain of up) {
    if (curtain.showing) {
      // two keys are the curtain's own: Escape gives the load up, and the sound's key is heard, since whether there is
      // to be sound is best said before there is any (it is let through to whoever keeps the sound, and settled here if nobody does)
      if (is(e, 'sound.toggle') && !e.repeat) {
        setTimeout(() => sound(), 0);
        return;
      }
      e.stopImmediatePropagation();
      if (is(e, 'menu.close') && !e.repeat) cancel(curtain);
      return;
    }
  }
}

/**
 * Give up what is on its way in and go back to where the visitor was: the step before, if the page made one to come
 * here (the front page, the gallery the site was asked for from); otherwise, come to by a link, out to the front page.
 */
function cancel(curtain?: Curtain): void {
  // (a page that knows better where the visitor was says so: the site asked for from the gallery has not named itself in the address yet)
  if (curtain?.onCancel?.()) return;
  if (stepsIn() > 0) history.back();
  else goHome();
}

/** Whether there is to be sound, as every curtain's switch shows it: called once the sound's key has been heard by whoever keeps the sound. */
// (prefs.ts reads the storage under a try: where it is missing, or denied and throws on being touched, as a private
// window's can, the sound is on; `typeof localStorage` touched it, and threw as the page loaded)
let heard = !prefs.get('soundOff');
function sound(): void {
  // (a site's sound hears the key itself and writes the choice down; where there is none yet, the choice is written here for it to find)
  if (!prefs.get('soundOff') === heard) prefs.set('soundOff', heard);
  heard = !prefs.get('soundOff');
  for (const b of document.querySelectorAll('.loading [data-sound]')) b.setAttribute('aria-pressed', String(heard));
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', gate, true);
  document.addEventListener('click', (e) => {
    const on = (e.target as HTMLElement).closest?.('.loading [data-cancel], .loading [data-sound]');
    if (on?.matches('[data-cancel]')) cancel([...up].find((c) => c.covers(on)));
    // (the switch presses the sound's key, so whoever keeps the sound hears it as from the keyboard)
    else if (on) window.dispatchEvent(new KeyboardEvent('keydown', { key: KEYS['sound.toggle'].slots[0], bubbles: true }));
  });
}

export class Curtain {
  private readonly el: HTMLElement;
  private progress = 0;

  /** It is up and on the page to be seen (one covering something that is itself put away is in nobody's way). */
  /** Its page has gone (to another flight) while it was up: it is no longer up, and nothing waits on it. */
  dismiss(): void {
    if (!up.delete(this)) return;
    if (!up.size) for (const then of waiting.splice(0)) then();
  }

  get showing(): boolean {
    return up.has(this) && this.el.getClientRects().length > 0;
  }

  /** The page's own way of giving up what this curtain covers; true if it took it. Left unset, the visitor's last step is taken back. */
  onCancel: (() => boolean) | null = null;

  constructor(el: HTMLElement) {
    this.el = el;
  }

  /** Whether `node` is on this curtain. */
  covers(node: Element): boolean {
    return this.el.contains(node);
  }

  /** The curtain is up: `what` is on its way in. */
  begin(what: string): void {
    const el = this.el;
    el.classList.remove('done', 'failed', 'began');
    void el.offsetWidth; // (so the list's late entrance starts again on a retry)
    el.classList.add('began');
    up.add(this);
    el.querySelector('[data-sound]')?.setAttribute('aria-pressed', String(!prefs.get('soundOff')));
    heard = !prefs.get('soundOff');
    el.querySelector('button')!.hidden = true;
    el.querySelector('.loading-kicker')!.textContent = 'Loading';
    el.querySelector('.loading-name')!.textContent = what;
    this.progress = 0;
    this.set(0, []);
  }

  /**
   * How far along the loading is, 0 to 1, and its steps as they stand. The bar never goes back: a step that turns out
   * bigger than it looked (a size that arrives late) holds the bar where it was until the rest catches up.
   */
  set(fraction: number, steps?: LoadStep[]): void {
    const el = this.el;
    this.progress = Math.max(this.progress, Math.min(1, fraction));
    el.style.setProperty('--p', this.progress.toFixed(4));
    const set = (target: Element, text: string) => {
      if (target.textContent !== text) target.textContent = text;
    };
    set(el.querySelector('.loading-pct')!, `${Math.floor(this.progress * 100)} %`);
    if (!steps) return;
    // what is being done now: the first step under way (or, between steps, the next one)
    const now = steps.find((x) => x.done > 0 && x.done < 1) ?? steps.find((x) => x.done < 1);
    set(el.querySelector('.loading-now')!, now ? `${now.label}${now.note ? ` · ${now.note}` : ''}` : steps.length ? 'Ready' : 'Starting');
    const list = el.querySelector<HTMLElement>('.loading-steps')!;
    if (list.children.length !== steps.length)
      list.innerHTML = steps.map((x) => `<li data-state="todo"><i></i><span>${esc(x.label)}</span><em></em></li>`).join('');
    steps.forEach((x, i) => {
      const row = list.children[i] as HTMLElement;
      const state = x.done >= 1 ? 'done' : x.done > 0 || x === now ? 'doing' : 'todo';
      if (row.dataset.state !== state) row.dataset.state = state;
      set(row.querySelector('em')!, x.note ?? '');
    });
  }

  /** It is in: the curtain lifts. */
  done(): void {
    up.delete(this);
    this.el.classList.add('done');
    if (!up.size) for (const then of waiting.splice(0)) then();
  }

  /** It did not arrive: said in the curtain's place as a notice, with the way to try again. */
  failed(message: string): void {
    const el = this.el;
    up.delete(this);
    el.classList.add('failed');
    el.querySelector('button')!.hidden = false;
    el.querySelector('.loading-kicker')!.textContent = 'Could not load';
    el.querySelector('.loading-now')!.textContent = message;
  }
}

/** The part of the bar that is the models arriving; the rest is what is done with them before they can be shown. */
const ARRIVING = 0.35;
const megabytes = (bytes: number) => `${(bytes / 1e6).toFixed(1)} MB`;

/**
 * What a curtain says as a load goes on: each model by its bytes, then the steps of making it ready
 * (`after`: each a label and its share of the bar, the shares fixed beforehand by how long each
 * takes, so the bar never waits at the end). A step that says nothing while it works (shaders
 * built: seconds, with an event only at the end) is drawn creeping toward nine tenths of its share
 * by the clock, so the bar is never still; the event sets it right. `end` when it is all done, or
 * has failed.
 */
export function follow<K extends string>(curtain: Curtain, models: string[], after: Record<K, { label: string; share: number }>) {
  const arriving: LoadStep[] = models.map((label) => ({ label, done: 0 }));
  const warming = Object.fromEntries(
    Object.entries(after).map(([k, v]) => [k, { ...(v as { label: string; share: number }), done: 0 }]),
  ) as Record<K, LoadStep & { share: number }>;
  const later = Object.values<LoadStep & { share: number }>(warming);
  const steps = [...arriving, ...later];
  const rest = Math.max(
    1e-6,
    later.reduce((sum, w) => sum + w.share, 0),
  );
  let arrived = 0;
  let over = false;
  let current: { step: LoadStep; since: number } | null = null;
  const say = () => {
    const doing = arrived < 1 ? null : (later.find((w) => w.done < 1) ?? null);
    if (doing !== (current?.step ?? null)) current = doing && { step: doing, since: performance.now() };
    const crept = (w: LoadStep) =>
      w === current?.step ? Math.max(w.done, 0.9 * (1 - Math.exp(-(performance.now() - current.since) / 8000))) : w.done;
    curtain.set(ARRIVING * arrived + ((1 - ARRIVING) * later.reduce((sum, w) => sum + w.share * crept(w), 0)) / rest, steps);
  };
  const creeping = window.setInterval(say, 200);
  return {
    /** The models as they arrive: how much of them all, and of each (with its size once known). */
    arrive(fraction: number, parts?: { fraction: number; total: number }[]): void {
      arrived = fraction;
      parts?.forEach((part, i) => {
        if (arriving[i]) Object.assign(arriving[i], { done: part.fraction, ...(part.total ? { note: megabytes(part.total) } : {}) });
      });
      say();
    },
    /** A step of making ready, 0 to 1. One that is not among `after` is not the curtain's business. */
    step(key: string, fraction: number): void {
      const w = (warming as Record<string, (LoadStep & { share: number }) | undefined>)[key];
      if (!w || over) return; // (nor is what is still arriving once it is over)
      arrived = 1;
      w.done = fraction;
      say();
    },
    /** It is over. With `done`, every step is marked finished and the bar is full. */
    end(done = true): void {
      clearInterval(creeping);
      over = true;
      if (!done) return;
      arrived = 1;
      for (const s of steps) s.done = 1;
      say();
    },
  };
}

/**
 * Every slider on the page under a finger: the one behaviour, for whichever panel made it (the
 * gallery's and the site's sliders, a part's functions, the clock's scrubs, the flight deck's
 * lever, the volume). A phone's own range input moves only when its thumb is taken, and the thumb
 * here is drawn thin; so a touch anywhere on a slider puts the thumb under the finger at once and
 * it follows from there, with `input` sent as it goes and `change` when it is let go, exactly as
 * a mouse would have sent them. While it is held it is marked `held` (style.css draws it so), and
 * the touch is the slider's alone: it does not scroll the page or move the sheet the slider is in.
 *
 * Nothing calls this: it listens on the page once, when first imported, for any `input[type=range]`.
 * A mouse and the keys are left to the browser.
 */

/** The width the finger's thumb is given (style.css), pixels: the track's ends are half of it in from the input's. */
const THUMB = 44;

let held: { input: HTMLInputElement; id: number } | null = null;

function follow(input: HTMLInputElement, x: number): void {
  const box = input.getBoundingClientRect();
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const step = input.step === 'any' ? 0 : Number(input.step || 1);
  const run = Math.max(1, box.width - THUMB);
  const k = Math.min(1, Math.max(0, (x - box.left - THUMB / 2) / run));
  let value = min + k * (max - min);
  if (step > 0) value = min + Math.round((value - min) / step) * step;
  // (as the input itself would write it: to the step's own precision, not a binary fraction's)
  const places = (String(step).split('.')[1] ?? '').length;
  const text = String(Number(Math.min(max, Math.max(min, value)).toFixed(places)));
  if (input.value === text) return;
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

if (typeof document !== 'undefined') {
  document.addEventListener(
    'touchstart',
    (e) => {
      const input = (e.target as HTMLElement).closest?.<HTMLInputElement>('input[type=range]');
      if (!input || input.disabled || held || e.changedTouches.length !== 1) return;
      const touch = e.changedTouches[0]!;
      held = { input, id: touch.identifier };
      input.classList.add('held');
      if (e.cancelable) e.preventDefault(); // (the browser's own handling would wait for the thumb to be taken, and may scroll)
      follow(input, touch.clientX);
    },
    { passive: false, capture: true },
  );
  document.addEventListener(
    'touchmove',
    (e) => {
      const touch = held && [...e.changedTouches].find((t) => t.identifier === held!.id);
      if (!held || !touch) return;
      if (e.cancelable) e.preventDefault();
      e.stopPropagation(); // (the sheet it is in does not take this for a pull)
      follow(held.input, touch.clientX);
    },
    { passive: false, capture: true },
  );
  const release = (e: TouchEvent): void => {
    if (!held || ![...e.changedTouches].some((t) => t.identifier === held!.id)) return;
    const { input } = held;
    held = null;
    input.classList.remove('held');
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };
  document.addEventListener('touchend', release, true);
  document.addEventListener('touchcancel', release, true);
}

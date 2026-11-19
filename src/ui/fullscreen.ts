import './fullscreen.css';

/**
 * Full screen, in and out, from anywhere: a small button in the window's top right corner on every page (the front
 * page has its own switch on the menu, and shows this one too once it is full screen), which says in a word what it
 * does when pointed at. There is none where the browser has no full screen to give (a phone's Safari).
 */

type Locking = Navigator & { keyboard?: { lock?: (keys: string[]) => Promise<void> } };

/** Go full screen, or come out of it. */
export function toggleFullscreen(): void {
  void (
    document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement
          .requestFullscreen()
          // (full screen, the browser would take Escape to leave it before the page heard it: kept for the page, where it can be)
          .then(() => (navigator as Locking).keyboard?.lock?.(['Escape']))
  ).catch(() => {});
}

const CORNERS = {
  // four corners pointing out: go full screen; pointing in: come out
  out: 'M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10',
  in: 'M6 2.5V6H2.5M10 2.5V6h3.5M13.5 10H10v3.5M2.5 10H6v3.5',
};

if (typeof document !== 'undefined' && document.fullscreenEnabled) {
  const button = document.createElement('button');
  button.id = 'fullscreen';
  const paint = (): void => {
    const full = Boolean(document.fullscreenElement);
    const says = full ? 'Exit full screen' : 'Full screen';
    button.setAttribute('aria-pressed', String(full));
    button.setAttribute('aria-label', says);
    button.title = says;
    button.innerHTML = `<span>${says}</span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${full ? CORNERS.in : CORNERS.out}"/></svg>`;
  };
  paint();
  button.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', paint);
  document.body.append(button);
}

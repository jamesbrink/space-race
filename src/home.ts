import { write } from './address';

/**
 * The way out to the front page, from anywhere in a flight (the Space Race crumb, an address that names nothing).
 * The front page is no flight's: it has a scene of its own (front.ts), and a flight's stages are a phone's whole
 * budget of memory. So going out lets the flight go entirely: the page fades to black and is opened again at the
 * address that names nothing, and nothing of the flight is held behind the front page. Chosen, it is a step like any
 * other (Back comes into the flight again, where it was); come to by Back, the entry is the one already there.
 */
export function goHome(): void {
  if (document.body.classList.contains('going-home')) return; // (a crumb is heard by its place and by the page)
  document.body.classList.add('going-home');
  const go = (): void => {
    write('');
    location.reload();
  };
  // (the fade is style.css's, 0.2 s; none for anyone who has asked for less motion, or a script)
  if (navigator.webdriver || matchMedia('(prefers-reduced-motion: reduce)').matches) go();
  else setTimeout(go, 220);
}

/**
 * The way out to the front page, from anywhere in a flight (the Space Race crumb, an address that names nothing).
 * The front page is no flight's: it has a scene of its own (front.ts), and a flight's stages are a phone's whole
 * budget of memory. So going out lets the flight go entirely: the page fades to black and is opened again at the
 * address that names nothing, and nothing of the flight is held behind the front page.
 */
export function goHome(): void {
  document.body.classList.add('going-home');
  const go = (): void => {
    history.replaceState(null, '', location.pathname + location.search);
    location.reload();
  };
  // (the fade is style.css's, 0.2 s; none for anyone who has asked for less motion, or a script)
  if (navigator.webdriver || matchMedia('(prefers-reduced-motion: reduce)').matches) go();
  else setTimeout(go, 220);
}

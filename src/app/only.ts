import type { Flight } from '../types.ts';
import { Gallery, type GalleryKept } from '../ui/gallery.ts';
import { formatAddress, parseAddress, settle, where } from './address.ts';
import { installDebug } from './debug.ts';
import { goHome } from './home.ts';
import type { Session } from './session.ts';

/**
 * The page of a flight that is only its vehicle yet: the gallery (gallery.ts), with its other places named and not yet
 * to be gone to; nothing else. There is no site, so there is no clock, no sound, nobody to walk as and nothing to fly,
 * and none of the code for them is brought in (main.ts opens this page, or session.ts's for a flight with a site).
 * The way out is the front page's (home.ts).
 */
export function onlySession(flight: Flight, kept?: GalleryKept): Session {
  document.title = `${flight.callsign} · ${flight.designation} · Space Race`;
  const gallery = new Gallery(
    document.body,
    flight,
    {
      go: () => {}, // (it has no other place yet: the switch says so, and cannot be put there)
      home: goHome,
      address: (what) => settle(formatAddress(flight.id, 'gallery', what)), // (within the place: no step of its own)
      covered: () => false,
    },
    kept,
  );

  /** The address settled into its own form (a flight with no place, or a place it has not got yet, is its gallery, and says so): what is there to be shown. */
  function follow(): string {
    const to = parseAddress(where());
    const what = to.place === 'gallery' ? to.what : '';
    settle(formatAddress(flight.id, 'gallery', what));
    return what;
  }
  void gallery.enter(follow());

  // debug handle, as the site's page has: sr.gallery, and sr.stage is the gallery's own
  installDebug({
    gallery,
    flight,
    get stage() {
      return gallery.stage;
    },
  });

  return {
    flight,
    follow: () => gallery.go(follow()),
    dispose: () => gallery.dispose(),
  };
}

import type { Flight } from '../types.ts';
import { Gallery, type GalleryKept } from '../ui/gallery.ts';
import { exhibit, formatAddress, parseAddress, settle, where } from './address.ts';
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
  const primary = exhibit(flight)!;
  let model = primary;
  let gallery: Gallery;
  const address = (what: string) =>
    settle(formatAddress(flight.id, 'gallery', [model.galleryCraft ? model.id : '', what].filter(Boolean).join('/')));

  function make(reuse?: GalleryKept) {
    return new Gallery(
      document.body,
      flight,
      {
        go: () => {},
        home: goHome,
        address,
        covered: () => false,
        craft: (id) => {
          settle(formatAddress(flight.id, 'gallery', id === primary.id ? '' : id));
          follow();
        },
      },
      reuse,
      model,
    );
  }

  function follow() {
    const to = parseAddress(where());
    const route = to.place === 'gallery' ? to.what : '';
    const [id, ...rest] = route.split('/');
    const craft = flight.models.find((m) => m.galleryCraft && (m.id === id || m.galleryAlias === id));
    const next = craft ?? primary;
    const what = craft ? rest.join('/') : route;
    if (!gallery || model !== next) {
      const reuse = gallery?.dispose() ?? kept;
      model = next;
      gallery = make(reuse);
      void gallery.enter(what);
    } else gallery.go(what);
    address(what);
  }
  follow();

  // debug handle, as the site's page has: sr.gallery, and sr.stage is the gallery's own
  installDebug({
    get gallery() {
      return gallery;
    },
    flight,
    get stage() {
      return gallery.stage;
    },
  });

  return {
    flight,
    follow,
    dispose: () => gallery.dispose(),
  };
}

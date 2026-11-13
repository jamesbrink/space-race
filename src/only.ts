import { flights } from '../missions';
import { flightFor, formatAddress, namesNothing, parseAddress } from './address';
import { Gallery } from './gallery';
import { goHome } from './home';

/**
 * The page for a flight that is only its vehicle yet: the gallery (gallery.ts), with its other
 * places named and not yet to be gone to; nothing else. There is no site, so there is no clock, no sound, nobody to walk as and
 * nothing to fly, and none of the code for them is brought in (enter.ts). The way out is the front page's (home.ts).
 */
const address = () => parseAddress(location.hash);
const flight = flightFor(flights, location.hash);
document.title = `${flight.callsign} · ${flight.designation} · Space Race`;

const gallery = new Gallery(document.body, flight, {
  go: () => {}, // (it has no other place yet: the switch says so, and cannot be put there)
  home: goHome,
  address: (what) => history.replaceState(null, '', formatAddress(flight.id, 'gallery', what)),
  covered: () => false,
});

const first = address();
// (an address that asks for a place it has not got yet is the gallery's, and says so)
if (first.place !== 'gallery') history.replaceState(null, '', formatAddress(flight.id, 'gallery'));
void gallery.enter(first.place === 'gallery' ? first.what : '');
window.addEventListener('hashchange', () => {
  if (namesNothing(location.hash)) return goHome();
  const to = address();
  if (to.flightId && to.flightId !== flight.id && flights.some((f) => f.id === to.flightId)) location.reload();
  else gallery.go(to.place === 'gallery' ? to.what : '');
});

// debug handle, as the site's page has: sr.gallery, and sr.stage is the gallery's own
Object.assign(window, {
  sr: {
    gallery,
    flight,
    get stage() {
      return gallery.stage;
    },
  },
});

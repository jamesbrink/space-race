import { flights } from '../missions';
import { flightFor, formatAddress, namesNothing, onMoved, parseAddress, settle, where } from './address';
import { Gallery } from './gallery';
import { goHome } from './home';

/**
 * The page for a flight that is only its vehicle yet: the gallery (gallery.ts), with its other
 * places named and not yet to be gone to; nothing else. There is no site, so there is no clock, no sound, nobody to walk as and
 * nothing to fly, and none of the code for them is brought in (enter.ts). The way out is the front page's (home.ts).
 */
const address = () => parseAddress(where());
const flight = flightFor(flights, where());
document.title = `${flight.callsign} · ${flight.designation} · Space Race`;

const gallery = new Gallery(document.body, flight, {
  go: () => {}, // (it has no other place yet: the switch says so, and cannot be put there)
  home: goHome,
  address: (what) => settle(formatAddress(flight.id, 'gallery', what)), // (within the place: no step of its own)
  covered: () => false,
});

/** The address settled into its own form (a flight with no place, or a place it has not got yet, is its gallery, and says so): what is there to be shown. */
function follow(): string {
  const to = address();
  const what = to.place === 'gallery' ? to.what : '';
  settle(formatAddress(flight.id, 'gallery', what));
  return what;
}
void gallery.enter(follow());
onMoved(() => {
  if (namesNothing(where())) return goHome();
  const to = address();
  if (to.flightId && to.flightId !== flight.id && flights.some((f) => f.id === to.flightId)) location.reload();
  else gallery.go(follow());
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

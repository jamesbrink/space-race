import { flights } from '../missions';
import { formatAddress, parseAddress } from './address';
import { Gallery } from './gallery';
import { Title } from './title';

/**
 * The page for a flight that is only its vehicle yet: the gallery (gallery.ts) and the front
 * page, and nothing else. There is no site, so there is no clock, no sound, nobody to walk as and
 * nothing to fly, and none of the code for them is brought in (enter.ts).
 */
const address = () => parseAddress(location.hash);
const flight = flights.find((f) => f.id === address().flightId)!;
document.title = `${flight.callsign} · ${flight.designation} · Space Race`;

const fronted = () => document.body.classList.contains('titled');
const gallery = new Gallery(document.body, flight, {
  toSite: () => {}, // (it has none: the switch says so and cannot be put there)
  home: () => {
    history.replaceState(null, '', location.pathname + location.search);
    title.show();
  },
  address: (what) => {
    if (!fronted()) history.replaceState(null, '', formatAddress(flight.id, 'gallery', what));
  },
  covered: fronted,
});

const title = new Title(document.body, flights, (id, place) => {
  if (id !== flight.id) {
    location.hash = formatAddress(id, place);
    return location.reload(); // another flight is another page's worth of state
  }
  title.hide();
  history.replaceState(null, '', formatAddress(flight.id, 'gallery'));
  void gallery.enter();
});
if (location.hash.length <= 1) title.show();

const first = address();
void gallery.enter(first.place === 'gallery' ? first.what : '');
window.addEventListener('hashchange', () => {
  if (location.hash.length <= 1) return title.show();
  if (title.showing) title.hide();
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

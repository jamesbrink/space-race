import { flights } from '../missions';
import { entrances, flightFor, namesNothing } from './address';

/**
 * The way in. The front page (front.ts) is what an address that names nothing shows. A flight is shown at its site (main.ts: the pad, the crew, the day, the clock, the
 * flight itself, with the gallery beside it) or, while only its vehicle is built, in the gallery
 * alone (only.ts). Which page is brought up is decided here, by the flight the address names, so
 * that a flight with no site never meets code that needs one. Another flight is another page's
 * worth of state: both pages reload to change flight.
 */

// While developing, `?fixture` adds the flight that is only a vehicle (tests/fixtures/vehicle-only), so that path can be
// looked at before any real flight takes it: /?fixture#test/fixture/vehicle-only. It is in no build.
if (import.meta.env.DEV && new URLSearchParams(location.search).has('fixture'))
  flights.push((await import('../tests/fixtures/vehicle-only/flight')).flight);

// `?mem` counts what the page allocates on the GPU (mem.ts): wrapped before any context is made, and loaded only when asked for.
if (new URLSearchParams(location.search).has('mem')) (await import('./mem')).install();

// An address that names nothing is the front page's, which is no flight's: the Earth from out by the Moon, and the
// list of flights over it (front.ts). It brings a flight's page up itself when one is chosen.
if (namesNothing(location.hash)) void import('./front');
else void (entrances(flightFor(flights, location.hash)).site ? import('./main') : import('./only'));

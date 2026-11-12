import { flights } from '../missions';
import { entrances, flightFor } from './address';

/**
 * The way in. A flight is shown at its site (main.ts: the pad, the crew, the day, the clock, the
 * flight itself, with the gallery beside it) or, while only its vehicle is built, in the gallery
 * alone (only.ts). Which page is brought up is decided here, by the flight the address names, so
 * that a flight with no site never meets code that needs one. Another flight is another page's
 * worth of state: both pages reload to change flight.
 */

// While developing, `?fixture` adds the flight that is only a vehicle (tests/fixtures/vehicle-only), so that path can be
// looked at before any real flight takes it: /?fixture#test/fixture/vehicle-only. It is in no build.
if (import.meta.env.DEV && new URLSearchParams(location.search).has('fixture'))
  flights.push((await import('../tests/fixtures/vehicle-only/flight')).flight);

const flight = flightFor(flights, location.hash);
void (entrances(flight).site ? import('./main') : import('./only'));

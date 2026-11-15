import { flights } from '../../missions/index.ts';
import { entrances, flightFor, namesLineup, namesNothing, where } from './address.ts';

/**
 * The way in. The front page (front.ts) is what an address that names nothing shows, and the Lineup (lineup.ts) what
 * `#lineup` does. A flight is shown at its site (main.ts: the pad, the crew, the day, the clock, the
 * flight itself, with the gallery beside it) or, while only its vehicle is built, in the gallery
 * alone (only.ts). Which page is brought up is decided here, by the flight the address names, so
 * that a flight with no site never meets code that needs one. Another flight is another page's
 * worth of state: both pages reload to change flight.
 */

// While developing, `?fixture` adds the flight that is only a vehicle (tests/fixtures/vehicle-only), so that path can be
// looked at before any real flight takes it: /?fixture#test/fixture/vehicle-only. It is in no build.
if (import.meta.env.DEV && new URLSearchParams(location.search).has('fixture'))
  flights.push((await import('../../tests/fixtures/vehicle-only/flight.ts')).flight);

// `?mem` counts what the page allocates on the GPU (mem.ts): wrapped before any context is made, and loaded only when asked for.
if (new URLSearchParams(location.search).has('mem')) (await import('./mem.ts')).install();

// An address that names nothing is the front page's, which is no flight's: the Earth from out by the Moon, and the
// list of flights over it (front.ts). It brings a flight's page up itself when one is chosen.
if (namesNothing(where())) void import('./front.ts');
// the Lineup is no flight's either: every vehicle side by side, on a stage of its own (lineup.ts)
else if (namesLineup(where())) void import('./lineup.ts');
else void (entrances(flightFor(flights, where())).site ? import('./main.ts') : import('./only.ts'));

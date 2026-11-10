import type { Flight } from '../src/types';
import { flight as mr3 } from './usa/mercury/flights/mr-3-freedom-7/flight';

/** Every flight the viewer can show, in launch order. Add a flight: import it, append it. */
export const flights: Flight[] = [mr3];

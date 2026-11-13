import type { Flight } from '../src/types';
import { flight as gt3 } from './usa/gemini/flights/gt-3/flight';
import { flight as mr3 } from './usa/mercury/flights/mr-3-freedom-7/flight';
import { flight as ma6 } from './usa/mercury/flights/ma-6-friendship-7/flight';
import { flight as ma7 } from './usa/mercury/flights/ma-7-aurora-7/flight';
import { flight as mr4 } from './usa/mercury/flights/mr-4-liberty-bell-7/flight';
import { flight as vostok1 } from './ussr/vostok/flights/vostok-1/flight';
import { flight as vostok2 } from './ussr/vostok/flights/vostok-2/flight';
import { flight as vostok3 } from './ussr/vostok/flights/vostok-3/flight';
import { flight as vostok4 } from './ussr/vostok/flights/vostok-4/flight';

/**
 * Every flight the viewer can show. Add a flight: import it, append it. The first is the one an address that names
 * no flight opens (`#pad`), so it stays the one that is whole; the front page lists them by launch date whatever the order here.
 */
export const flights: Flight[] = [mr3, vostok1, mr4, vostok2, ma6, ma7, vostok3, vostok4, gt3];

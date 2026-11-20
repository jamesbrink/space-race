import type { Flight } from '../src/types.ts';
import { flight as apollo7 } from './usa/apollo/flights/apollo-7/flight.ts';
import { flight as apollo8 } from './usa/apollo/flights/apollo-8/flight.ts';
import { flight as apollo9 } from './usa/apollo/flights/apollo-9/flight.ts';
import { flight as apollo11 } from './usa/apollo/flights/apollo-11/flight.ts';
import { flight as apollo16 } from './usa/apollo/flights/apollo-16/flight.ts';
import { flight as skylab2 } from './usa/skylab/flights/skylab-2/flight.ts';
import { flight as apollo17 } from './usa/apollo/flights/apollo-17/flight.ts';
import { flight as apollo15 } from './usa/apollo/flights/apollo-15/flight.ts';
import { flight as apollo14 } from './usa/apollo/flights/apollo-14/flight.ts';
import { flight as apollo13 } from './usa/apollo/flights/apollo-13/flight.ts';
import { flight as apollo12 } from './usa/apollo/flights/apollo-12/flight.ts';
import { flight as apollo10 } from './usa/apollo/flights/apollo-10/flight.ts';
import { flight as target5002 } from './usa/gemini/flights/gatv-5002/flight.ts';
import { flight as target5003 } from './usa/gemini/flights/gatv-5003/flight.ts';
import { flight as target5004 } from './usa/gemini/flights/gatv-5004/flight.ts';
import { flight as targetatda } from './usa/gemini/flights/atda/flight.ts';
import { flight as target5005 } from './usa/gemini/flights/gatv-5005/flight.ts';
import { flight as target5006 } from './usa/gemini/flights/gatv-5006/flight.ts';
import { flight as target5001 } from './usa/gemini/flights/gatv-5001/flight.ts';
import { flight as gt3 } from './usa/gemini/flights/gt-3/flight.ts';
import { flight as gt4 } from './usa/gemini/flights/gt-4/flight.ts';
import { flight as gt5 } from './usa/gemini/flights/gt-5/flight.ts';
import { flight as gt6a } from './usa/gemini/flights/gt-6a/flight.ts';
import { flight as gt7 } from './usa/gemini/flights/gt-7/flight.ts';
import { flight as gt8 } from './usa/gemini/flights/gt-8/flight.ts';
import { flight as gt9a } from './usa/gemini/flights/gt-9a/flight.ts';
import { flight as gt10 } from './usa/gemini/flights/gt-10/flight.ts';
import { flight as gt11 } from './usa/gemini/flights/gt-11/flight.ts';
import { flight as gt12 } from './usa/gemini/flights/gt-12/flight.ts';
import { flight as ma6 } from './usa/mercury/flights/ma-6-friendship-7/flight.ts';
import { flight as ma7 } from './usa/mercury/flights/ma-7-aurora-7/flight.ts';
import { flight as ma8 } from './usa/mercury/flights/ma-8-sigma-7/flight.ts';
import { flight as ma9 } from './usa/mercury/flights/ma-9-faith-7/flight.ts';
import { flight as mr3 } from './usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { flight as mr4 } from './usa/mercury/flights/mr-4-liberty-bell-7/flight.ts';
import { flight as soyuz1 } from './ussr/soyuz/flights/soyuz-1/flight.ts';
import { flight as soyuz3 } from './ussr/soyuz/flights/soyuz-3/flight.ts';
import { flight as soyuz4 } from './ussr/soyuz/flights/soyuz-4/flight.ts';
import { flight as soyuz10 } from './ussr/soyuz/flights/soyuz-10/flight.ts';
import { flight as soyuz12 } from './ussr/soyuz/flights/soyuz-12/flight.ts';
import { flight as soyuz16 } from './ussr/soyuz/flights/soyuz-16/flight.ts';
import { flight as soyuzT2 } from './ussr/soyuz/flights/soyuz-t-2/flight.ts';
import { flight as voskhod1 } from './ussr/voskhod/flights/voskhod-1/flight.ts';
import { flight as voskhod2 } from './ussr/voskhod/flights/voskhod-2/flight.ts';
import { flight as vostok1 } from './ussr/vostok/flights/vostok-1/flight.ts';
import { flight as vostok2 } from './ussr/vostok/flights/vostok-2/flight.ts';
import { flight as vostok3 } from './ussr/vostok/flights/vostok-3/flight.ts';
import { flight as vostok4 } from './ussr/vostok/flights/vostok-4/flight.ts';
import { flight as vostok5 } from './ussr/vostok/flights/vostok-5/flight.ts';
import { flight as vostok6 } from './ussr/vostok/flights/vostok-6/flight.ts';

/**
 * Every flight the viewer can show. Add a flight: import it, append it. The first is the one an address that names
 * no flight opens (`#pad`), so it stays the one that is whole; the front page lists them by launch date whatever the order here.
 */
export const flights: Flight[] = [
  mr3,
  vostok1,
  mr4,
  vostok2,
  ma6,
  ma7,
  vostok3,
  vostok4,
  ma8,
  vostok5,
  vostok6,
  ma9,
  voskhod1,
  voskhod2,
  gt3,
  gt4,
  gt5,
  gt7,
  gt6a,
  gt8,
  gt9a,
  gt10,
  gt11,
  gt12,
  target5002,
  target5003,
  target5004,
  targetatda,
  target5005,
  target5006,
  target5001,
  soyuz1,
  apollo7,
  soyuz3,
  apollo8,
  soyuz4,
  apollo9,
  apollo10,
  apollo11,
  apollo12,
  apollo13,
  apollo14,
  soyuz10,
  apollo15,
  apollo16,
  apollo17,
  skylab2,
  soyuz12,
  soyuz16,
  soyuzT2,
];

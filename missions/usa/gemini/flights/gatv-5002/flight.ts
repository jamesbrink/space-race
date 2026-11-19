import { targetFlight, lostParts } from '../../vehicles/target-flight.ts';

import { orbital } from './orbital.ts';

export const flight = targetFlight('gatv-5002', lostParts('5002'), orbital);

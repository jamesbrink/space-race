import { targetFlight, lostParts } from '../../vehicles/target-flight.ts';

import { orbital } from './orbital.ts';

export const flight = targetFlight('gatv-5004', lostParts('5004'), orbital);

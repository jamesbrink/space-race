import { targetFlight, encounterParts } from '../../vehicles/target-flight.ts';
import { flight as encounter } from '../gt-12/flight.ts';

import { orbital } from './orbital.ts';

export const flight = targetFlight('gatv-5001', encounterParts(encounter), orbital);

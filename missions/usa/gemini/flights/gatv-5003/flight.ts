import { targetFlight, encounterParts } from '../../vehicles/target-flight.ts';
import { flight as encounter } from '../gt-8/flight.ts';

export const flight = targetFlight('gatv-5003', encounterParts(encounter));

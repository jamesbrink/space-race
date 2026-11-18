import { targetFlight, encounterParts } from '../../vehicles/target-flight.ts';
import { flight as encounter } from '../gt-10/flight.ts';

export const flight = targetFlight('gatv-5005', encounterParts(encounter));

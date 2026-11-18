import { targetFlight, encounterParts } from '../../vehicles/target-flight.ts';
import { flight as encounter } from '../gt-9a/flight.ts';

export const flight = targetFlight('atda', encounterParts(encounter));

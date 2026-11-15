/**
 * A number with how far it can be trusted and where it came from: what every figure in the record is. It imports
 * nothing, so the world (src/world/), the simulator and the flights' data can all stand on it.
 */

/**
 * documented — a published figure (NASA report, manufacturer manual, museum record).
 * derived    — computed from documented figures; the note says how.
 * estimated  — read off photographs or drawings, or chosen to look right. Replace these
 *              before a simulation depends on them.
 */
export type Confidence = 'documented' | 'derived' | 'estimated';

/** A figure that is not a model's dimension (a place on the Earth), with how far it can be trusted and where it came from. */
export interface Measure {
  value: number;
  confidence: Confidence;
  /** Document and section, or the survey or map it was read from; for `derived`, how. */
  source: string;
}

/** A figure at the confidence given. */
export const measure = (value: number, confidence: Confidence, source: string): Measure => ({ value, confidence, source });
/** A published figure: `source` names the document and its section, figure or page. */
export const doc = (value: number, source: string): Measure => measure(value, 'documented', source);
/** Computed from documented figures: `source` says how. */
export const derived = (value: number, source: string): Measure => measure(value, 'derived', source);
/** Read off photographs or drawings, or chosen to look right: `source` says which. */
export const estimated = (value: number, source: string): Measure => measure(value, 'estimated', source);

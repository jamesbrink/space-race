/**
 * What the walk would sound like, as events, for whoever makes the sound. Nothing here plays
 * anything and there are no recordings: this is the interface a sound engine implements, fed by
 * the gait (viewer/gait.ts) through the walker (viewer/walk.ts: `Walker.sounds`). Every event is
 * a moment in the stride, never a timer, so what is heard is what is seen.
 */

/** A foot coming down: which, how fast the figure was going (m/s), and what kind of step it was. */
export interface Footfall {
  foot: 'L' | 'R';
  /** Over the ground, m/s (on a ladder, up or down it). */
  pace: number;
  /** A stride on the level or a stair, a rung of a ladder, or the feet arriving from a jump or a fall. */
  kind: 'step' | 'rung' | 'landing';
  /** For a landing: how far it fell, metres. */
  height?: number;
}

export interface Sounds {
  /** A foot has landed: at phase 0.25 (left) or 0.75 (right) of the stride, or both on a landing. */
  footfall(event: Footfall): void;
  /**
   * Where in the breath the figure is, 0 to 1 (0: about to breathe in; 0.5: about to breathe
   * out), told each frame it changes. In a pressure suit the breath is heard in the helmet.
   */
  breath(phase: number): void;
}

/** No sound: what the walker has until something that plays is given to it. */
export const silent: Sounds = {
  footfall: () => {},
  breath: () => {},
};

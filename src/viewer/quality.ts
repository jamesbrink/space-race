/**
 * A net under the frame rate: the drawing's resolution, lowered only when the machine cannot keep up, and put back.
 *
 * The scene is drawn at the screen's own pixels (up to two a CSS pixel) and that is what everything is tuned for. This
 * is for a machine too weak for that, and never a way to reach a frame rate on one that is not: a scene that is slow
 * on a capable machine is to be made faster. On a weak one the choice is between a sharp picture at a few frames a
 * second and a slightly softer one that moves. So while frames come slower than `SLOW` a second for `WINDOW` together,
 * the drawing's pixel ratio is taken down a tenth; while they come at `GOOD` or better it is tried a step higher
 * again, and a try that fails is not made again for twice as long (the hysteresis: it must not hunt). It never goes
 * under `FLOOR` of full nor under one pixel a CSS pixel, a view that is still is always drawn at full (the stage sees
 * to that), the page's own text and panels are never touched, and a machine that keeps up never sees any of
 * it: `scale` stays 1. Nor does one that is slow for another reason: if fewer pixels do not buy frames, they are given
 * back.
 *
 * What is counted is a run of frames drawn one after another by the page's own loop. A frame that took a quarter of a
 * second is a hitch (something loading, a camera cut, the tab coming back), not the machine's pace: it ends the run
 * and is not counted. Nothing is counted until `rest` has run out, which the stage asks for after loading, after a
 * change of look or of the window: those are slow for reasons that pass.
 *
 * It knows nothing of the renderer: it is given frame intervals and says what fraction of full resolution to draw at.
 */

/** Frames a second under which the resolution is taken down. */
export const SLOW = 30;
/** Frames a second at which a step back up is tried: well clear of `SLOW`, or the step would bring it straight back. */
export const GOOD = 40;
/** How long the pace is watched before anything is done about it, in ms. */
export const WINDOW = 4000;
/** A frame this long is a hitch, not a pace. */
export const HITCH = 250;
/** The least share of full resolution, each way: under this the picture is no longer the picture (and never under one pixel a CSS pixel). */
export const FLOOR = 0.6;
/** Each step is this much of the last: small, so that a step is not seen. */
export const STEP = 0.9;
/** How long after a step down before a step up is first tried, in ms; doubled by each try that fails, up to `PATIENCE_MOST`. */
export const PATIENCE = 15_000;
export const PATIENCE_MOST = 240_000;
/** A step down that has not made the pace this much better has bought nothing. */
export const GAIN = 1.03;

export class Quality {
  /** Off, as it starts: always the screen's own resolution, whatever the frame rate. On is the user's choice ("Hold frame rate"). */
  auto = false;
  /** The share of full resolution to draw at, each way: 1, or less while the machine cannot keep up. */
  scale = 1;
  /** The least `scale` may be: what leaves one pixel a CSS pixel (1 on a plain screen: nothing to give). */
  private floor = 1;
  private frames = 0;
  private span = 0;
  private restUntil = 0;
  private tryAt = 0;
  private patience = PATIENCE;
  /** A step up has just been made and has not yet held for a window: if the pace fails now, it was the step. */
  private trying = false;
  /** The pace that brought the last step down, and how many steps running have not bettered theirs. */
  private paceWas = 0;
  private futile = 0;

  /** `full`: the pixel ratio drawn at when nothing is lowered. */
  setFull(full: number): void {
    this.floor = Math.min(1, Math.max(FLOOR, 1 / Math.max(1, full)));
    if (this.scale < this.floor) this.scale = this.floor;
  }

  /** Count nothing for `ms` from `now`: what is slow for a while after a load or a change is not the machine's pace. */
  rest(now: number, ms: number): void {
    this.restUntil = Math.max(this.restUntil, now + ms);
    this.frames = this.span = 0;
  }

  /** The run of frames is broken (a frame was not drawn: the view is still). */
  idle(): void {
    this.frames = this.span = 0;
  }

  /** Back to full, at once (the setting was changed). */
  reset(): void {
    this.scale = 1;
    this.frames = this.span = 0;
    this.trying = false;
    this.patience = PATIENCE;
    this.paceWas = this.futile = 0;
  }

  /**
   * A frame was drawn `ms` after the one before it, at `now`. True if `scale` has changed: the caller draws at the new
   * resolution from the next frame.
   */
  frame(ms: number, now: number): boolean {
    if (!this.auto) {
      if (this.scale === 1) return false;
      this.reset();
      return true;
    }
    if (now < this.restUntil || ms >= HITCH || !(ms > 0)) {
      this.frames = this.span = 0;
      return false;
    }
    this.frames++;
    this.span += ms;
    if (this.span < WINDOW) return false;
    const pace = (this.frames * 1000) / this.span;
    this.frames = this.span = 0;
    if (pace < SLOW) {
      if (this.trying) this.patience = Math.min(PATIENCE_MOST, this.patience * 2); // the step up was too much: wait longer
      this.trying = false;
      this.tryAt = now + this.patience;
      // Fewer pixels must buy frames, or they are given up for nothing: where two steps running have not (the pace is
      // the processor's, or the browser holds the page to thirty a second to save the battery), it goes back to full
      // and is left there a good while.
      this.futile = this.paceWas && pace < this.paceWas * GAIN ? this.futile + 1 : 0;
      this.paceWas = pace;
      if (this.futile >= 2) {
        const changed = this.scale !== 1;
        this.reset();
        this.rest(now, PATIENCE_MOST);
        return changed;
      }
      if (this.scale <= this.floor) {
        this.paceWas = 0; // (no step was made: the next window has nothing to be compared with)
        return false;
      }
      this.scale = Math.max(this.floor, this.scale * STEP);
      return true;
    }
    this.paceWas = 0;
    this.futile = 0;
    if (this.trying) {
      // the step up held for a whole window: it stands, and the next may be tried as soon as the first was
      this.trying = false;
      this.patience = PATIENCE;
      this.tryAt = now + this.patience;
      return false;
    }
    if (pace >= GOOD && this.scale < 1 && now >= this.tryAt) {
      this.scale = Math.min(1, this.scale / STEP);
      if (1 - this.scale < 1e-6) this.scale = 1;
      this.trying = true;
      return true;
    }
    return false;
  }
}

import './callout.css';

/**
 * A callout: a mark on something in the scene and a card beside it saying what it is. Used by
 * the idle show, where the panels are away and the picture explains itself. The mark follows
 * whatever `anchor` reports each frame; with nothing to point at, the card sits low on the page.
 */
export interface CalloutText {
  /** A word above the title: which section this is. */
  eyebrow: string;
  title: string;
  text: string;
}

export class Callout {
  private readonly root: HTMLElement;
  private readonly card: HTMLElement;
  private readonly mark: HTMLElement;
  private readonly line: SVGLineElement;
  private readonly clock: HTMLElement;
  private anchor: (() => { x: number; y: number } | null) | null = null;
  private frame = 0;
  private swap = 0;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'callout';
    this.root.hidden = true;
    this.root.innerHTML = `
      <svg aria-hidden="true"><line /></svg>
      <i class="callout-mark" aria-hidden="true"></i>
      <article class="callout-card" aria-live="polite"><p></p><h2></h2><div></div></article>
      <p class="callout-clock"></p>`;
    parent.append(this.root);
    this.card = this.root.querySelector('.callout-card')!;
    this.mark = this.root.querySelector('.callout-mark')!;
    this.line = this.root.querySelector('line')!;
    this.clock = this.root.querySelector('.callout-clock')!;
  }

  /** Say something about what `anchor` points at. The card changes over with a short fade. */
  show(text: CalloutText, anchor: (() => { x: number; y: number } | null) | null): void {
    this.root.hidden = false;
    this.root.classList.remove('showing');
    clearTimeout(this.swap);
    // the old card fades out before the new one is written, and the camera has begun to move by then
    this.swap = window.setTimeout(() => {
      this.card.querySelector('p')!.textContent = text.eyebrow;
      this.card.querySelector('h2')!.textContent = text.title;
      this.card.querySelector('div')!.textContent = text.text;
      this.anchor = anchor;
      this.root.classList.add('showing');
    }, 450);
    if (!this.frame) this.frame = requestAnimationFrame(() => this.place());
  }

  /** The time of day, shown small while the callouts are up. */
  time(text: string): void {
    this.clock.textContent = text;
  }

  hide(): void {
    clearTimeout(this.swap);
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.anchor = null;
    this.root.hidden = true;
    this.root.classList.remove('showing');
  }

  private place(): void {
    this.frame = requestAnimationFrame(() => this.place());
    const at = this.anchor?.() ?? null;
    const w = window.innerWidth;
    const h = window.innerHeight;
    // The card keeps one place (the stylesheet's: low on the left, or across the foot of a
    // narrow page), so the eye knows where to read; only the mark and its leader move.
    const card = this.card.getBoundingClientRect();
    const pointed = Boolean(at && at.x > 0 && at.x < w && at.y > 0 && at.y < h) && !this.over(card, at!);
    this.root.classList.toggle('pointed', pointed);
    if (!pointed || !at) return;
    this.mark.style.transform = `translate(${Math.round(at.x)}px, ${Math.round(at.y)}px)`;
    // the leader leaves the card from the edge nearest the mark
    const cx = Math.max(card.left, Math.min(card.right, at.x));
    const cy = Math.max(card.top, Math.min(card.bottom, at.y));
    for (const [k, v] of [
      ['x1', at.x],
      ['y1', at.y],
      ['x2', cx],
      ['y2', cy],
    ] as const)
      this.line.setAttribute(k, String(Math.round(v)));
  }

  /** Whether a point is under the card: then there is nothing to draw a leader to. */
  private over(card: DOMRect, at: { x: number; y: number }): boolean {
    return at.x >= card.left && at.x <= card.right && at.y >= card.top && at.y <= card.bottom;
  }
}

/**
 * What one owner hangs on the page for as long as it is there: listeners on the window and the document, observers,
 * timers and a loop of frames. A flight's page is one such owner and its panels are others (app/session.ts): when the
 * page goes to another flight, each lets go of all of its at once (`dispose`), and nothing it hung goes on listening,
 * firing or holding what it was given.
 */
export class Scope {
  private readonly ac = new AbortController();
  private readonly observers: ResizeObserver[] = [];
  private readonly timers: number[] = [];
  private readonly frames = new Set<number>();

  /** Still there: a loop of frames goes on only while this is so. */
  get live(): boolean {
    return !this.ac.signal.aborted;
  }

  /** Aborted when the owner goes: for anything that takes a signal of its own (a fetch). */
  get signal(): AbortSignal {
    return this.ac.signal;
  }

  /** Listen on the window, the document or anything else, until the owner goes. */
  on<K extends keyof WindowEventMap>(
    target: Window,
    type: K,
    fn: (e: WindowEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  on<K extends keyof DocumentEventMap>(
    target: Document,
    type: K,
    fn: (e: DocumentEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  on(target: EventTarget, type: string, fn: (e: Event) => unknown, options?: boolean | AddEventListenerOptions): void;
  on(target: EventTarget, type: string, fn: (e: never) => unknown, options?: boolean | AddEventListenerOptions): void {
    const signal = this.ac.signal;
    if (signal.aborted) return;
    target.addEventListener(
      type,
      fn as EventListener,
      typeof options === 'boolean' ? { capture: options, signal } : { ...options, signal },
    );
  }

  /** A ResizeObserver, disconnected when the owner goes. */
  observer(callback: ResizeObserverCallback): ResizeObserver {
    const watch = new ResizeObserver(callback);
    this.observers.push(watch);
    return watch;
  }

  /** Every `ms` milliseconds until the owner goes. */
  every(fn: () => void, ms: number): void {
    if (this.live) this.timers.push(window.setInterval(fn, ms));
  }

  /** The next frame, unless the owner has gone by then. */
  frame(fn: FrameRequestCallback): number {
    if (!this.live) return 0;
    const id = requestAnimationFrame((t) => {
      this.frames.delete(id);
      if (this.live) fn(t);
    });
    this.frames.add(id);
    return id;
  }

  /** Let go of everything: listeners off, observers disconnected, timers and frames cancelled. */
  dispose(): void {
    this.ac.abort();
    for (const watch of this.observers.splice(0)) watch.disconnect();
    for (const id of this.timers.splice(0)) clearInterval(id);
    for (const id of this.frames) cancelAnimationFrame(id);
    this.frames.clear();
  }
}

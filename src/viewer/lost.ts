import type * as THREE from 'three';
import { chooseTier, tier } from './tier.ts';

/**
 * When the GPU gives up. A browser that is short of memory takes a page's WebGL context away
 * (`webglcontextlost`), or refuses an allocation and leaves a framebuffer that cannot be drawn
 * into. Left alone that is a dead picture, or a page the browser reloads until it stops trying.
 * So a lost context stops the stage's loop and says so, with the way back: "Reload with lighter
 * graphics" chooses the lighter tier (tier.ts), remembers it, and reloads; "Reload" only reloads.
 * Nothing here reloads by itself, so there is no loop for the browser to give up on. An allocation
 * refused while the page opened (asked once, at the end of `Stage.warm`) is said the same way.
 *
 * A context given back (`webglcontextrestored`) is not taken up: three makes its own state again,
 * but what this page drew into its targets once (the globe's packed maps, the clouds' field, the
 * baked ground) went with the old context, and the pictures they were made from have been let go.
 * The word stays up, and says so.
 */
let shown: HTMLElement | null = null;
/** Say that the picture has stopped, over the page, with the way back. */
function say(text: string): void {
  if (typeof document === 'undefined') return;
  if (shown) {
    shown.querySelector('p')!.textContent = text;
    return;
  }
  const lighter = tier().lighter;
  const el = document.createElement('div');
  el.className = 'lost';
  el.setAttribute('role', 'alertdialog');
  el.setAttribute('aria-label', 'The picture has stopped');
  el.innerHTML = `<div><p></p>${lighter ? '' : '<button data-lighter>Reload with lighter graphics</button>'}<button data-reload>Reload</button></div>`;
  el.querySelector('p')!.textContent = text;
  el.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b) return;
    if (b.hasAttribute('data-lighter')) chooseTier(true);
    location.reload();
  });
  document.body.append(el);
  shown = el;
  (el.querySelector('button') as HTMLElement | null)?.focus();
}

/** Watch a stage's canvas: `stop` is called when its context is lost (stop drawing; nothing more will be shown on it). */
export function watchContext(canvas: HTMLCanvasElement, stop: () => void): void {
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault(); // (so that the browser may give it back: it is still not taken up)
    stop();
    say(
      tier().lighter
        ? 'The graphics stopped: the browser took their memory away. Reloading starts them again.'
        : 'The graphics stopped: the browser took their memory away, most likely because this device has too little for the scene at full detail.',
    );
  });
  canvas.addEventListener('webglcontextrestored', () =>
    say('The browser has given the graphics back, but what was built for them went with the memory. Reloading starts them again.'),
  );
}

/**
 * Whether the GPU has refused something: an allocation it had no memory for, or a target that cannot be drawn into.
 * Asked once the page has opened (Stage.warm) and not every frame: asking waits for the GPU.
 */
export function refused(renderer: THREE.WebGLRenderer, targets: THREE.WebGLRenderTarget[]): boolean {
  const gl = renderer.getContext() as WebGL2RenderingContext;
  if (gl.isContextLost()) return false; // (that is `watchContext`'s)
  let bad = false;
  for (let e = gl.getError(); e !== gl.NO_ERROR; e = gl.getError()) if (e === gl.OUT_OF_MEMORY) bad = true;
  const was = renderer.getRenderTarget(),
    face = renderer.getActiveCubeFace(),
    level = renderer.getActiveMipmapLevel();
  for (const target of targets) {
    renderer.setRenderTarget(target);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) bad = true;
  }
  renderer.setRenderTarget(was, face, level);
  return bad;
}

/** The GPU refused something as the page opened: say so, with the way back. */
export function sayRefused(): void {
  say(
    tier().lighter
      ? 'The graphics could not be set up: this device has too little memory for the scene.'
      : 'The graphics could not be set up at full detail: this device has too little memory for the scene.',
  );
}

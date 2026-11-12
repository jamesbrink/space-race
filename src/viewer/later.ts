/**
 * What the first view does not need is fetched later: once the scene is up (main.ts marks the page
 * `scene-ready`) and a moment has passed, or at once when whoever asked says it is wanted now (the
 * eye has risen to where the globe's maps are seen). So the site's view does not wait on, or share
 * its bandwidth with, megabytes it cannot see. `later(load)` returns the "wanted now" call; `load`
 * runs once. Where there is no page (a test) it runs only if wanted.
 */
const PAUSE = 600;

export function later(load: () => void): () => void {
  let done = false;
  const run = (): void => {
    if (done) return;
    done = true;
    load();
  };
  if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
    const up = (): boolean => document.body.classList.contains('scene-ready');
    if (up()) setTimeout(run, PAUSE);
    else {
      const watch = new MutationObserver(() => {
        if (!up()) return;
        watch.disconnect();
        setTimeout(run, PAUSE);
      });
      watch.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
  }
  return run;
}

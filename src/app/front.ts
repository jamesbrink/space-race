import './front/front.css';
import { flights } from '../../missions/index.ts';
import {
  formatAddress,
  formatBrowse,
  formatLineup,
  moved,
  namesFront,
  onMoved,
  opensIn,
  type Place,
  parseBrowse,
  settle,
  undo,
  where,
  write,
} from './address.ts';
import { guarded } from './stake.ts';
import { whenLifted } from './curtain.ts';
import { installDebug, keepFront } from './debug.ts';
import { IDLE_TITLE } from './demo.ts';
import { FrontScene } from './front/scene.ts';
import { instantAt, PATH } from './front/view.ts';
import { Title } from '../ui/title.ts';
import { is } from '../util/keys.ts';
import { markRuns } from '../ui/runmark.ts';
import { isoDate } from '../world/time.ts';
import { scripted } from '../util/env.ts';

/**
 * The front page: the mark and the list of flights (title.ts), over a scene that is no flight's: the Earth seen
 * from out by the Moon at the instant a person first left it, the camera moving slowly out (front/scene.ts,
 * front/view.ts). It is what an address that names nothing shows, on every load.
 *
 * - **Left alone, this is the show.** Nothing else starts. After half a minute without a touch the list and the
 *   mark fade away so that the picture can be seen whole, and come back at the first movement, key or touch. Anyone
 *   who has asked their system for less motion is given a still picture (the Earth risen over a level horizon, the
 *   clock stopped at the instant), and a browser driven by a script is not left alone (`?demo` lets it be).
 * - **Going into a flight** names it in the address, takes the list away and brings that flight's page up under
 *   this scene (main.ts or only.ts, as enter.ts would have chosen), which goes on moving while the flight arrives:
 *   the flight's curtain says how far along it is, over the picture. When the curtain lifts the flight's own canvas
 *   fades in over this one, and then this scene is let go whole: its textures, its buffers, its context.
 * - **Going into the Lineup** (lineup.ts) is the same: named in the address, brought up under the picture.
 * - **Coming back out** (the Space Race crumb, or Back) is home.ts: the page is opened again at the address that names
 *   nothing, so a flight holds nothing of this and this nothing of a flight. Going in is a step in the history like any
 *   other (address.ts: `write`), so Back comes out here and Forward goes in again.
 */
const scene = new FrontScene(document.body);
scene.still = matchMedia('(prefers-reduced-motion: reduce)').matches;
// a script holds the picture where it asks (tools/shot.mjs: sr.front.seek); nobody is watching it move
const driven = scripted('demo');
if (driven) {
  scene.held = true;
  document.body.classList.add('instant');
}
void scene.ready.then(() => scene.canvas.classList.add('on'));

let entering = false;
const title = new Title(
  document.body,
  flights,
  (id, place) => void enter(id, place),
  () => void go(formatLineup(), () => import('./lineup.ts')),
  // the list narrowed to a nation or a programme: the address says so (the entry rewritten, not a step), so a link or
  // Back out of a flight comes to the list as it was left
  { at: parseBrowse(where()) ?? { nation: null, programme: null }, to: (b) => settle(formatBrowse(b)) },
);
title.show();
markRuns(document.body); // (a flight flown by hand that is kept says so on its row: ui/runmark.ts)

/**
 * Where the Earth is put in the picture: clear of the mark, to its right, where the window is wide; over the mark,
 * in the room the page leaves above it, where it is narrow. (Shares of the half breadth and half height from the
 * middle. The Earth is a third of the window's shorter side across.) With the words away, in the middle.
 */
function compose(): void {
  const [w, h] = [innerWidth, innerHeight];
  const radius = scene.earthPixels / 2;
  if (title.tucked) scene.aim = [0, w > h ? 0.32 : 0.4];
  else if (w > h) {
    const mark = document.querySelector('.title-mark')?.getBoundingClientRect();
    // (beside the mark if there is room between it and the window's edge; else as far right as it goes)
    const x = Math.min(w - radius - 14, Math.max((mark?.right ?? w * 0.75) + radius + 18, w * 0.72));
    scene.aim = [(x - w / 2) / (w / 2), 0.32];
  } else scene.aim = [0.3, 1 - (radius + 0.05 * h) / (h / 2)]; // (just under the top: title.css keeps the top two fifths clear)
}
compose();
addEventListener('resize', compose);

/** Go into a flight: its page is brought up under the picture, which is let go when the flight is there to be seen. */
async function enter(id: string, place: Place = 'gallery'): Promise<void> {
  const flight = flights.find((f) => f.id === id);
  if (flight) await go(formatAddress(id, opensIn(flight, place)), () => import('./main.ts').then((page) => page.opened));
}

/**
 * Go somewhere from here (a flight's gallery, the Lineup): the address says so at once, and that page is brought up
 * under the picture, which is let go when the page's curtain has lifted.
 */
async function go(address: string, page: () => Promise<unknown>): Promise<void> {
  if (entering) return;
  entering = true;
  write(address); // (a step of the visitor's: Back comes out to this page again)
  document.body.classList.add('fronted');
  title.hide();
  whenLifted(() => {
    // the flight's canvas fades in over this one (gallery.css, style.css); then this one is nobody's
    document.body.classList.remove('fronted');
    scene.canvas.classList.add('leaving');
    setTimeout(
      () => {
        scene.dispose();
        keepFront(null);
      },
      scripted() ? 0 : 1400,
    );
  });
  try {
    await page();
    // (the flight's page has its own debug handle: the picture is on it for as long as it lasts)
    keepFront(scene);
  } catch (e) {
    console.error(e);
    location.reload(); // (its page did not arrive: the address names the flight now, and says so there)
  }
}

// Escape while a flight is on its way in and its curtain is not yet up (its page still arriving) gives it up, as the
// curtain's own Escape does once it is up (curtain.ts): back to this page
addEventListener('keydown', (e) => {
  if (entering && document.body.classList.contains('fronted') && is(e, 'menu.close') && !e.repeat) history.back();
});

// an address typed or gone back or forward to that names a flight is that flight's page; and Back while a flight is
// on its way in is this page again, as it was before the flight was chosen
onMoved(() => {
  if (entering !== namesFront(where())) return;
  // (Back out of a flight flown by hand asks first, and puts the address back if the answer is to keep flying: stake.ts)
  const steps = moved();
  if (
    !guarded(
      () => location.reload(),
      () => undo(steps),
    )
  )
    location.reload();
});

/** Seconds the page has been left alone; past IDLE_TITLE the words make way for the picture. */
let idle = 0;
for (const touch of ['pointerdown', 'pointermove', 'wheel', 'keydown', 'touchstart'] as const)
  addEventListener(
    touch,
    () => {
      idle = 0;
      if (!title.tucked) return;
      title.tuck(false);
      compose();
    },
    { capture: true, passive: true },
  );
setInterval(() => {
  if (entering || document.hidden || driven) return;
  idle += 1;
  if (idle < IDLE_TITLE || title.tucked) return;
  title.tuck(true);
  compose(); // (the Earth comes to the middle of a picture that is all its own: the scene eases there)
}, 1000);

// debug handle, as a flight's page has: sr.front.seek(120) goes two minutes along the path; sr.front.stats(); sr.front.cost()
installDebug({
  front: scene,
  path: PATH,
  /** The moment on show, UTC. */
  get instant() {
    return isoDate(instantAt(scene.still ? 0 : scene.t));
  },
});

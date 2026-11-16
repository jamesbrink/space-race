import { flights } from '../../missions/index.ts';
import type { Flight, SitedFlight } from '../types.ts';
import type { GalleryKept } from '../ui/gallery.ts';
import { Stage } from '../viewer/stage.ts';
import { aboutNoFlight, entrances, flightFor, landed, moved, onMoved, parseAddress, undo, where } from './address.ts';
import { goHome } from './home.ts';
import { prefs } from './prefs.ts';
import { guarded } from './stake.ts';
import type { Session } from './session.ts';

/**
 * A flight's page, whichever flight (enter.ts brings it up for an address that names one; the front page brings it up
 * under its picture). It keeps what a page is given once: the stage the launch site is drawn on, made with the first
 * flight that has one, and the gallery's canvas and stage. Each flight gone to is a session on them (session.ts for a
 * flight with a site, only.ts for one that is only its vehicle), and going to another flight lets the last go and
 * opens the next on the same stages: no page is loaded again, and no renderer made again. Back and Forward are
 * followed within a flight by its session, and between flights here (only address.ts reads or writes the address).
 */

/** The launch site's stage: made with the first flight that has a site, and loaded again for each one after. */
let stage: Stage | null = null;
/** The gallery's canvas and stage, handed from each flight's gallery to the next. */
let kept: GalleryKept | undefined;
/** The flight on show, and the opening of the next while it is on its way (one at a time, in the order asked for). */
let session: Session | null = null;
let opening: Promise<void> = Promise.resolve();

/**
 * Let the flight on show go and open `flight` on the same stages. The launch site's stage is only quieted by the
 * session let go (Stage.quiet): the next flight's load keeps what the two share, a model or the place round the pad,
 * and lets go of the rest; with no site to follow it is let go of whole (Stage.unload).
 */
async function open(flight: Flight): Promise<void> {
  if (session) {
    kept = session.dispose();
    session = null;
  }
  if (entrances(flight).site) {
    const { siteSession } = await import('./session.ts');
    if (!stage) {
      stage = new Stage(document.querySelector<HTMLCanvasElement>('#stage')!);
      stage.pipe.quality.auto = prefs.get('resolutionAuto'); // ("Hold frame rate": off unless chosen, so the picture is the screen's own)
    }
    stage.sleep(false);
    session = siteSession(flight as SitedFlight, stage, kept);
  } else {
    stage?.unload(); // (the last flight's site has no next to give way to: let it go now)
    const { onlySession } = await import('./only.ts');
    session = onlySession(flight, kept);
  }
}

opening = open(flightFor(flights, where()));
/** The first flight's page is up (its session made, its debug handle put on the window): for the front page (front.ts). */
export const opened: Promise<void> = opening;
onMoved(() => {
  const steps = moved();
  const follow = (): void => {
    landed();
    if (aboutNoFlight(where())) {
      goHome(where(), true);
      return;
    }
    opening = opening.then(() => {
      const to = parseAddress(where());
      // another flight is another session on the same stages; within this one, its session follows the address
      if (to.flightId && to.flightId !== session?.flight.id && flights.some((f) => f.id === to.flightId))
        return open(flightFor(flights, where()));
      session?.follow();
    });
  };
  // Going out of the flight (to another, to the Lineup, to the front page) lets a flight flown by hand go, and nothing keeps
  // it: asked first (stake.ts). The address has moved already, so Keep flying moves it back to the entry it was on, which
  // is one the history still holds: no step is added and the page is not touched.
  const to = parseAddress(where());
  const beyond = aboutNoFlight(where()) || Boolean(to.flightId && to.flightId !== session?.flight.id && flights.some((f) => f.id === to.flightId));
  if (beyond && guarded(follow, () => undo(steps))) return;
  follow();
});

# The gallery

Part of the agent notes: start at [AGENTS.md](../../AGENTS.md).

A flight is seen in two places. The **site** is where it flew from: the pad, the crew, the day's
sky, the clock, the flight itself. The **gallery** is nowhere: the vehicle alone on a plain floor
under designed light, to be turned, taken apart, cut open and read. A flight whose site is not
built yet has only the gallery, and says so: that is how a new programme's first spacecraft is
first seen.

## Where it is in the page

- **The front page** gives each flight its ways in: *Launch site* and *Gallery* where it has both,
  *Gallery* alone (with "its launch site is not built yet") where it has only its vehicle.
- **Inside a flight** one switch, in the title card, is the same control in the same spot in both
  places (`placesNav` in `gallery.ts`). Beside a heading on a phone it stands to the right of it.
- **The address** carries it (`src/address.ts`, the only place that reads or writes one):
  `#<flight>/gallery`, `#<flight>/gallery/<part node>`, `#<flight>/gallery/<what stands there>`;
  `#<flight>/<model>` is the site, as it always was. No model may be called `gallery`.
- **Which page comes up** is decided in `enter.ts` by the flight the address names: `main.ts` for a
  flight with a site (it has the gallery beside it), `only.ts` for one without (the gallery and
  the front page, and none of the code that needs a site).

`entrances(flight)` says which ways in there are: a site when the flight has `site` and a model
whose `backdrop` is a place and not `'studio'`; a gallery when it has a vehicle (`exhibit`: the
model `flies` names, else the first that is neither a `walker` nor on the clock).

## One rule: nothing leaks

The gallery is **a second `Stage` on its own canvas**, given the flight with everything but its
vehicle left out (`galleryFlight`). It shares no object with the site's stage. While it is up the
site's stage is asleep (`Stage.sleep`): it draws nothing, hears no key and advances no clock, so
the vehicle on the pad, the selection, the camera, a figure walked somewhere and the clock's
instant are, when it wakes, exactly as they were left; and the gallery, come back to, is as it
was left too. Going to the gallery ends a walk (the figure stays where it stood), stops a running
clock (started again on the way back) and hushes the sound; it is refused from the flight deck.

Every key comes to the gallery first while it is up (a capturing listener in `gallery.ts`): the
camera's keys go on to its own stage's camera, its own keys are acted on, and nothing goes
further, so no key of the site's (the clock, the flight deck, going on foot) reaches a site that
is not on show. A new key for the gallery is added there and to its legend.

What the two places share is only what is remembered between visits (`prefs.ts`): the look, the
turntable, which panels are tucked.

## What it shows

Nothing new is asked of a flight. Everything comes from what a vehicle already declares:

- **What stands there** (`plinths`): the whole vehicle, or the parts under one heading of its parts
  list (`Part.group`: the spacecraft without its booster). `Stage.only` takes the rest out of the
  model and stands what is left on the floor; its slider is then the stretch of the vehicle's
  slider over which those parts move.
- **Views**: the vehicle's own named views whose parts are all there, as `nodes` only (a `centreY`
  measured on the pad means nothing here).
- **Taken apart**, each part is named as it comes clear of its neighbours (`viewer/labels.ts`:
  `cleared` from `Part.explode` and `order`, `layOut` for where the names go; both tested).
- **Scale** (off by default): the flight's own crew model if it has one, else a 1.8 m outline, and
  a range pole banded in metres as tall as what stands there. The pole's figure is the flight's
  own spec where one matches the model's height to a hundredth, with its confidence; otherwise
  "as modelled".
- **Part by part**: N and B step through the parts in order; left alone, the gallery tours itself
  with the same shots the idle show takes of a section (`tour` in `demo.ts`).

It is always drawn in full (`Stage.fullDetail`: the coarser levels are not even fetched).

## The studio

`viewer/studio.ts` is the setting, and not a place: no Sun, no sky, no haze, no hour. A sweep
drawn by direction (so there is no horizon line), a floor that is only what falls on it (shadow,
a soft dark where the thing stands, a pool of light), a key with a shadow, a rim and a fill, and
a room of softboxes baked for the metal to reflect. Dark or light by choice; in the cel look it
is paper whichever was chosen. Brightnesses are a design fitted by eye.

## To look at it

`/#usa/mercury/mr-3-freedom-7/gallery`. While developing, `/?fixture#test/fixture/vehicle-only`
shows the flight that is only a vehicle (`tests/fixtures/vehicle-only`), through `only.ts`.
`sr.gallery` is the handle; `sr.gallery.stage` its stage. `tools/shot.mjs out.png
usa/mercury/mr-3-freedom-7/gallery "" 1440 900 --ui` takes its picture.

# The gallery, and a flight's places

Part of the agent notes: start at [AGENTS.md](../../AGENTS.md).

## The navigation, the same for every flight

Every flight has the same three places, in the same order, and opens in the first:

| place | what it is | a flight has it when |
| --- | --- | --- |
| **Gallery** | the vehicle alone on a plain floor under designed light: turned, taken apart, cut open, read | it has a vehicle (`exhibit`) |
| **Launch site** | where it flew from: the pad, the place, the crew, the day's sky, the clock, walking. Its sections are the flight's models there (Vehicle, Launch pad, Crew) | it has `site` and a model whose `backdrop` is a place, not `'studio'` |
| **Fly** | the flight deck, at the site: the vehicle under your hands, and the recorded flight | it has the site, a `trajectory` with a `body`, and `flies` |

- **The front page** has one entrance per flight, by date. It always opens that flight's gallery.
- **Inside a flight** one switch, in the title card, shows the three places, the same control in
  the same spot in every place (`placesNav` in `gallery.ts`; on the flight deck, where the card
  makes way, the switch alone stays in its corner). A place the flight does not have yet is
  **shown, dimmed, and says why** when pointed at or pressed (`lacks` in `address.ts`: "Launch
  site: not built yet", "Fly: no trajectory yet"). It is never hidden: the visitor is told what
  is coming, and the control is the same for every flight.
- **The way back is always the same**: front page > flight > place, and the title card's crumbs
  say it (`crumbs`): "Space Race" is the front page, the flight's name its gallery.
- **The address** carries it (`src/address.ts`, the only place that reads or writes one):
  `#<flight>` and `#<flight>/gallery[/<part or what stands there>]` the gallery;
  `#<flight>/site[/<vehicle|pad|crew>]` the launch site; `#<flight>/fly` the flight deck.
  Addresses older than the places mean what they meant: `#<flight>/<model>` and a bare `#pad`,
  `#vehicle`, `#crew` (the first *listed* flight's: every tool and script uses them) are sections
  of the site. So no model may be called `gallery`, `site` or `fly`. The front page names nothing:
  the first flight *by date* turns behind it, in its gallery.
- **Loading follows the place.** Going into a flight fetches only what the gallery needs: the
  vehicle, in full. The site's models, scenery, globe and clouds are fetched when Launch site or
  Fly is first chosen, and kept.
- **Which page comes up** is decided in `enter.ts` by the flight the address is about (`flightFor`):
  `main.ts` for a flight with a site (the gallery beside it), `only.ts` for one without (the
  gallery and the front page, and none of the code that needs a site).

A flight with only a vehicle is complete enough to ship: it is in the gallery, and its site and
Fly light up as they are built.

## One rule: nothing leaks

The gallery is **a second `Stage` on its own canvas**, given the flight with everything but its
vehicle left out (`galleryFlight`). It shares no object with the site's stage. While it is up the
site's stage is asleep (`Stage.sleep`): it draws nothing, hears no key and advances no clock, so
the vehicle on the pad, the selection, the camera, a figure walked somewhere and the clock's
instant are, when it wakes, exactly as they were left; and the gallery, come back to, is as it
was left too. Going to the gallery ends a walk (the figure stays where it stood), stops a running
clock (started again on the way back), hushes the sound and leaves the flight deck.

Every key comes to the gallery first while it is up (a capturing listener in `gallery.ts`): the
camera's keys go on to its own stage's camera, its own keys are acted on, and nothing goes
further, so no key of the site's (the clock, the flight deck, going on foot) reaches a site that
is not on show. A new key for the gallery is added there and to its legend.

What the gallery and the site share is only what is remembered between visits (`prefs.ts`): the look, the
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

`/#usa/mercury/mr-3-freedom-7`, `/#usa/mercury/mr-4-liberty-bell-7` or `/#ussr/vostok/vostok-1`. While developing, `/?fixture#test/fixture/vehicle-only`
shows the flight that is only a vehicle (`tests/fixtures/vehicle-only`), through `only.ts`.
`sr.gallery` is the handle; `sr.gallery.stage` its stage. `pnpm test:places` (`tools/places-test.mjs`, with `pnpm dev`
running) goes between the places with slow loads and real keys and checks what is promised above. `tools/shot.mjs out.png
usa/mercury/mr-3-freedom-7/gallery "" 1440 900 --ui` takes its picture.

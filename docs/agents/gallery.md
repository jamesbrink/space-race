# The gallery, and a flight's places

Part of the agent notes: start at [AGENTS.md](../../AGENTS.md).

## The navigation, the same for every flight

Every flight has the same three places, in the same order, and opens in the first:

| place | what it is | a flight has it when |
| --- | --- | --- |
| **Gallery** | the vehicle alone on a plain floor under designed light: turned, taken apart, cut open, read | it has a vehicle (`exhibit`) |
| **Launch site** | where it flew from: the pad, the place, the crew, the day's sky, the clock, walking. Its sections are the flight's models there (Vehicle, Launch pad, Crew) | it has `site` and a model whose `backdrop` is a place, not `'studio'` |
| **Fly** | the flight deck, at the site: the vehicle under your hands, and the recorded flight | it has the site, a `trajectory` with a `body`, and `flies` |

- **The front page** is no flight's: it is what an address that names nothing shows (`front.ts`), the list of
  flights over a picture of its own, the Earth seen from out by the Moon ("The front page", below). It has one
  entrance per flight, by date, and a line for each flight to come. An entrance always opens that flight's gallery.
- **Inside a flight** one switch, in the title card, shows the three places, the same control in
  the same spot in every place (`placesNav` in `gallery.ts`; on the flight deck, where the card
  makes way, the switch alone stays in its corner). A place the flight does not have yet is
  **shown, dimmed, and says why** when pointed at or pressed (`lacks` in `address.ts`: "Launch
  site: not built yet", "Fly: no trajectory yet"). It is never hidden: the visitor is told what
  is coming, and the control is the same for every flight.
- **The way back is always the same**: front page > flight > place, and the title card's crumbs
  say it (`crumbs`): "Space Race" is the front page, the flight's name its gallery.
- **The flight's name is one line, whole.** A name too long for the title card at its usual size (a
  callsign with its Cyrillic: "Berkut (Беркут)") is set smaller until it fits (`fitName` in
  `fold.ts`, for the gallery's card and the site's); on a phone the top line's own rule holds.
- **The address** carries it (`src/address.ts`, the only place that reads or writes one):
  `#<flight>` and `#<flight>/gallery[/<part or what stands there>]` the gallery;
  `#<flight>/site[/<vehicle|pad|crew>]` the launch site; `#<flight>/fly` the flight deck.
  Addresses older than the places mean what they meant: `#<flight>/<model>` and a bare `#pad`,
  `#vehicle`, `#crew` (the first *listed* flight's: every tool and script uses them) are sections
  of the site. So no model may be called `gallery`, `site` or `fly`. An address that names nothing
  at all (`namesNothing`) is the front page's and is about no flight.
- **Loading follows the place.** The front page fetches its own picture and no flight (6 MB: the
  Earth's maps and the Moon's). Going into a flight fetches only what the gallery needs: the
  vehicle, in full. The site's models, scenery, globe and clouds are fetched when Launch site or
  Fly is first chosen, and kept.
- **Back and Forward** go where the visitor was. One rule, in `address.ts` (`write`, `samePlace`): going to another
  flight or another place (the front page, a flight's Gallery, Launch site, Fly) is a new entry in the history;
  anything chosen within a place (a part, a section of the site, what stands in the gallery) rewrites the entry it is
  on, and so does the page settling an address into its own form (`settle`: `#pad` becomes the flight's
  `#…/site/pad`, a flight named with no place its gallery) and anything the idle show does. So Back is never pressed
  twice to leave a place, and never traps. Taking the flight deck or leaving it by its own control (Fly it, L, Esc)
  is going between places, so a step too; following an address (Back, Forward, a link) is never one, whatever the
  page passes through on its way there (`following` in main.ts). Within a flight, Back and Forward between its places are followed in
  place (`onMoved`), with no load: the site as it was left, the gallery as it was left. The front page and a flight
  are two pages' worth of state, so Back or Forward across that line opens the page again at the address it lands on
  (`home.ts`; `front.ts` for an address that names a flight), the same as a reload or a pasted link. The Space Race
  crumb is a step like any other: Back comes into the flight again. `pnpm test:history` (tools/history-test.mjs)
  goes through it with real clicks.
- **Which page comes up** is decided in `enter.ts` by what the address names: `front.ts` for one
  that names nothing; otherwise, by the flight it is about (`flightFor`), `main.ts` for a flight
  with a site (the gallery beside it) and `only.ts` for one without (the gallery alone, and none
  of the code that needs a site). The front page brings a flight's page up itself when one is chosen.

A flight with only a vehicle is complete enough to ship: it is in the gallery, and its site and
Fly light up as they are built.

## The front page

`front.ts` is the page; `title.ts` its words (the mark, the list); `front/scene.ts` its picture, on a canvas and a
renderer of its own that share nothing with a flight's stages (rendering.md, "The front page's picture"; what the
picture is of, world.md).

- **Left alone, this is the show, and nothing else starts.** No flight is picked for the visitor. The camera goes
  out along its path for five minutes and settles; the Earth goes on turning. After half a minute without a touch
  (`IDLE_TITLE`) the words fade away and the Earth is eased to the middle of a picture that is all its own; the first
  movement, key or touch brings them back and eases it aside again. A browser driven by a script is not left alone
  and its picture is held still until told where to be (`sr.front.seek`), unless the address has `?demo`.
- **Less motion** (the system's setting): one still picture, the Earth risen over a level horizon 80 seconds along
  the path, the clock stopped at the instant; nothing is drawn twice.
- **Going into a flight** names it in the address at once, as a step in the history (so a refresh lands there, and
  Back comes out to the front page again), takes the words away and
  brings that flight's page up *under* the picture, which goes on moving while the flight arrives. The flight's
  curtain is a card over the picture, not a black page, and nothing else of the flight's page shows until it lifts
  (`body.fronted`, front.css). When it lifts (`whenLifted`, curtain.ts) the flight's canvas fades in over the
  picture's as it always does, and a moment later the picture is let go whole: textures, buffers, the context, the
  canvas. No key acts meanwhile: the flight's curtain is up, and the curtain's own rule holds.
- **Coming back out** (the Space Race crumb, Back, or an address edited to name nothing) is `home.ts`: the page fades to
  black and is opened again at the address that names nothing. A flight holds nothing of the front page and the
  front page nothing of a flight; the price is that the same flight gone into again is fetched from the browser's
  cache and its shaders built again.
- **The words are read over a picture that can be white.** Nothing veils or blurs the whole picture. Each thing
  that is read has its own dark glass (`--title-glass`, 0.84 of near black: the smallest text keeps 4.5:1 over
  white cloud), and the mark a soft dark behind it. Held upright, the top two fifths of the page are left to the
  picture and the list scrolls over the rest; on its side or on a desk the Earth is put clear of the mark, to its
  right (`compose` in front.ts measures the mark and tells the scene where the Earth is to be).

`sr.front` is the handle: `sr.front.seek(120)` goes two minutes along the path, `sr.front.stats()` and
`sr.front.cost()` say what it draws and what a frame costs, `sr.instant` the moment on show. `pnpm test:front`
(tools/front-test.mjs, with `pnpm dev` running) checks all of the above in a real browser, and what the page holds
as a phone. `tools/shot.mjs out.png "" "sr.front.seek(80)" 1440 900 --ui` takes its picture.

## One rule: nothing leaks

The gallery is **a second `Stage` on its own canvas**, given the flight with everything but its
vehicle left out (`galleryFlight`). It shares no object with the site's stage. While it is up the
site's stage is asleep (`Stage.sleep`): it draws nothing, hears no key and advances no clock, so
the vehicle on the pad, the selection, the camera, a figure walked somewhere and the clock's
instant are, when it wakes, exactly as they were left; and the gallery, come back to, is as it
was left too. Going to the gallery ends a walk (the figure stays where it stood), stops a running
clock (started again on the way back), hushes the sound and leaves the flight deck.

(The gallery was once also what showed behind the front page for a flight with no site, its show running there
unasked: `GalleryHost.covered` is what is left of that, and is now never true.)

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

## On a phone

Under 960 px wide or 520 px tall each place is the view with **one slim line across the top** and **one handle on
the bottom edge**; everything else is in the sheet the handle opens (`fold.ts`, `sheet.ts`, the narrow block of
`fold.css`). The launch site has the same top line, handle and sheet (its handle: the sections, Walk, More; its View tab:
the slider, the views, the switches, the scale and the diagnostics line; the clock is a small line under the top line,
the time of day said when it is opened), and the flight deck folds in its own terms (`cockpit.css`: the clock is the top
line with the place control at its right; held upright, on show are one compact line of height, speed and climb over
the one action, the abort and More, with the stick and roll in the corners above it; on its side the five figures in the
line. Everything else (the phase, the navball and the path, Guidance, the Sequencer, every key, the systems) is a swipe
up on the deck or More away, and a swipe down puts it away; a warning of load or heat, or an event that is due, stays
out).

- **The top line**: the heading is the way back to the front page (its chevron says so), the flight's designation
  small beside it, and one button naming the place ("Gallery") that drops the three places as a menu. A place the
  flight lacks is listed, dimmed, with why under its name.
- **Standing alone** is a chip under the top line: the diagram, "Spacecraft alone", and an x that is the way back.
- **The handle**: the part before, the chosen part's name and its one line (or what stands there and how many parts),
  Apart (all the way apart or together again, at the show's pace), the next part. A tap on the name, or a pull,
  opens the sheet; choosing a part only names it there and never opens anything.
- **The sheet**: tucked (the handle), half, full, the same grip; upright it rises from the foot, on its side it is a
  drawer down the right, shut until asked for. Its first tab, **View**, is the control block, docked piece by piece:
  taking it apart first, what stands there and the views each on a line that scrolls sideways, then the switches
  (cutaway, labels, scale, turntable, light, cel, lighter graphics) and the scale line. On View the half stop is as
  tall as what it holds (at most 58 % of the height); Parts, Specs and Motors as on a wide page. Where it was left
  is remembered (`sheetOpen`), and so is the hint said once on a first visit, in the gallery's notes stack
  (`handleSeen`).
- Opening or closing it moves no camera the hands have set: the canvas keeps the space above it and only a view
  still being followed is framed again in it (`Stage.setInset`).
- **Names on the parts** are smaller; where the column of names would lie on the thing (`covers` in `labels.ts`) each
  part has a pin with its number in the parts list instead. The measure's figures are the figures alone, and keep
  off the labels and each other.

## The studio

`viewer/studio.ts` is the setting, and not a place: no Sun, no sky, no haze, no hour. A sweep
drawn by direction (so there is no horizon line), a floor that is only what falls on it (shadow,
a soft dark where the thing stands, a pool of light), a key with a shadow, a rim and a fill, and
a room of softboxes baked for the metal to reflect. Dark or light by choice; in the cel look it
is paper whichever was chosen. Brightnesses are a design fitted by eye.

## To look at it

`/#usa/mercury/mr-3-freedom-7`, `/#usa/mercury/mr-4-liberty-bell-7`, `/#ussr/vostok/vostok-1`, `/#ussr/vostok/vostok-2`, `/#usa/mercury/ma-6-friendship-7`, `/#usa/mercury/ma-7-aurora-7` or `/#usa/mercury/ma-9-faith-7` (the last four are flights
that are only their vehicles so far: their Launch site and Fly say so). While developing, `/?fixture#test/fixture/vehicle-only`
shows the flight that is only a vehicle (`tests/fixtures/vehicle-only`), through `only.ts`.
`sr.gallery` is the handle; `sr.gallery.stage` its stage. `pnpm test:places` (`tools/places-test.mjs`, with `pnpm dev`
running) goes between the places with slow loads and real keys and checks what is promised above. `tools/shot.mjs out.png
usa/mercury/mr-3-freedom-7/gallery "" 1440 900 --ui` takes its picture.

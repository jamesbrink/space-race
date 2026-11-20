# The gallery, and a flight's places

Part of the agent notes: start at [AGENTS.md](../../AGENTS.md).

A named Gallery view may set `isolate` when its subject is enclosed on every side, as with Apollo 8’s instrument panel. The controls remain at their installed height. Moving the camera lets the visitor examine their faces and cases. Choosing another view, plinth, part or seat restores the assembly. A view with one node can set `onSelect` to give the same inspection angle and isolation when the visitor selects that part, as with Eagle’s two enclosed equipment bays.

## The navigation, the same for every flight

Every flight has the same three places, in the same order, and opens in the first:

| place | what it is | a flight has it when |
| --- | --- | --- |
| **Gallery** | the vehicle alone on a plain floor under designed light: turned, taken apart, cut open, read | it has a vehicle (`exhibit`) |
| **Launch site** | where it flew from: the pad, the place, the crew, the day's sky, the clock, walking. Its sections are the flight's models there (Vehicle, Launch pad, Crew) | it has `site` and a model whose `backdrop` is `'ground'` (its site's place), not `'studio'` |
| **Fly** | the flight deck, at the site: the vehicle under your hands, and the recorded flight | it has the site, a plan it can be steered on (a ballistic one's rigid body, an orbital one's steering law), and `flies` |

- **The front page** is no flight's: it is what an address that names nothing shows (`front.ts`), the list of
  flights over a picture of its own, the Earth seen from out by the Moon ("The front page", below). It has one
  entrance per flight, by date, and a line for each flight to come. An entrance always opens that flight's gallery (a
  kept flight's Continue, on the menu, opens its flight deck). On the menu stands the way into the Lineup, named
  Explore there ("The Lineup", below), which is no flight's either.
- **Inside a flight** the places are a path: the gallery is the flight's page, from it the launch site, from the site the
  launch. Every place has plain buttons for the ways from where it is (`nextStep` in `gallery.ts`): "Go to the launch
  site" in the gallery; "Gallery" and "Launch" at the site; back to either from the flight deck. On a wide page they
  are in the title card; on a phone they are the top line's one control (below, "On a phone"). A place
  the flight does not have yet is **shown, dimmed, and says why** (`lacks` in `address.ts`: "Launch site: not built
  yet", "Fly: no trajectory yet"). It is never hidden: the visitor is told what is coming.
- **The way back is always the same**: front page > nation > programme > flight > place, and the title card's crumbs
  say it (`crumbs`): "Space Race" is the front page, the nation and the programme the front page with its list narrowed
  to them (`#flights/<nation>[/<programme>]`, address.ts `parseBrowse`: still the front page's address, and no
  flight's), the flight's name its gallery. On the front page the same narrowing is the menu's nations and, over the
  list, a row of the chosen nation's programmes (a nation, then its programmes, named as the flights name them); choosing one rewrites the entry and is no step
  in the history, so Back out of a flight comes to the list as it was left.
- **The flight's name is one line, whole.** A name too long for the title card at its usual size (a
  callsign with its Cyrillic: "Berkut (Беркут)") is set smaller until it fits (`fitName` in
  `fold.ts`, for the gallery's card and the site's); on a phone the top line's own rule holds.
- **The address** carries it (`src/app/address.ts`, the only place that reads or writes one):
  `#<flight>` and `#<flight>/gallery[/<part, what stands there, or a seat sat in>]` the gallery;
  `#<flight>/site[/<vehicle|pad|crew>]` the launch site; `#<flight>/fly` the flight deck.
  Addresses older than the places mean what they meant: `#<flight>/<model>` and a bare `#pad`,
  `#vehicle`, `#crew` (the first *listed* flight's: every tool and script uses them) are sections
  of the site. So no model may be called `gallery`, `site`, `fly` or `lineup` (the Lineup's word, below). An address that names nothing
  at all (`namesNothing`) is the front page's and is about no flight.
- **Loading follows the place.** The front page fetches its own picture and no flight (6 MB: the
  Earth's maps and the Moon's). Going into a flight fetches only what the gallery needs: the
  vehicle, in full. The site's models, scenery, globe and clouds are fetched when Launch site or
  Fly is first chosen, and kept.
- **A site still arriving when the gallery is gone to** is left to arrive, asleep. Its models and its warming go on
  behind the gallery (the stage draws no frame, but loading and `Stage.warm` do not need one), so it is usually
  ready when it is next gone to; it is never entered, started or shown meanwhile: no flight deck, the clock stopped,
  the gallery the place on show, the gallery's address. How long that takes is the site's weight and the machine's,
  and nothing may depend on it. A flight that lacks Fly opens in its gallery when Fly is asked for, and its site
  is not fetched at all until Launch site is first chosen (`tools/places-test.mjs` asks for the site first for such a flight).
- **Leaving a flight flown by hand loses nothing** (`deck/leaving.ts` holds the rule): watching a flight as flown loses
  nothing and is never asked about. Once the visitor has taken it over and the run has not ended, every way out keeps it, with
  its clock stopped at the instant it was left, and asks nothing. *Within the flight* (the deck's Leave, Esc, the Gallery and
  Launch site tabs, the flight's crumb, Back and Forward between its places) the deck parks it in the page, and a passing note
  says so; *beyond it* (another flight, the Lineup, the front page) and through a reload or a closed tab it is kept in the
  browser's storage, one run a flight (simulator.md, "The deck": how). Where one is kept, the way to its launch (Launch at the site, which then says Resume) shows a lamp,
  its mission time and a mark that throws it away, and the front page's row for the flight says "In flight" and the time
  (`ui/runmark.ts`). Fly, now or days later, takes it up behind a card in the deck's style that says what is kept (its
  mission time, what it was doing, when it was left in plain words): Resume (focused: Space, Enter) goes on from exactly
  there, Start over (N) stands the flight on the pad as flown and lets the kept run go; the card is that question, so nothing
  more is asked. A kept run that cannot be flown again (the flight's data or the simulator changed since) is said to be so
  and let go; one that ended is not kept. Asked first, by the question (`deck/ask.ts`), is only what really loses a run:
  N (or New flight) with one going on ("Start over?"), the mark beside Fly ("Throw your flight away?"), and a way beyond the
  flight where the browser will not keep it (storage off or full) or a run that came down under four seconds ago ("Leave
  this flight?"). Every way out of the page goes through one guard, `app/stake.ts` `guarded`, called by `goHome` and by
  `main.ts`'s `onMoved`, which writes the run down and asks only if that fails. By Back, Forward or a typed address the
  entry has moved already, so Keep flying moves it back (`address.ts` `moved`, `undo`: each entry the page makes carries its
  number), which adds no step and loops no further. The question holds the clock, takes every key at the window, and is
  `role="alertdialog"` with its focus kept: the safe answer is the default (Esc, Enter, a press elsewhere), the act is its
  key (L, N) or a deliberate press. The browser's own `beforeunload` question is set only while a run would be lost by the
  page going (the browser will not keep it, or it has just come down); the page uses no alert, confirm or prompt.
- **Back and Forward** go where the visitor was. One rule, in `address.ts` (`write`, `samePlace`): going to another
  flight or another place (the front page, a flight's Gallery, Launch site, Fly) is a new entry in the history;
  anything chosen within a place (a part, a section of the site, what stands in the gallery) rewrites the entry it is
  on, and so does the page settling an address into its own form (`settle`: `#pad` becomes the flight's
  `#…/site/pad`, a flight named with no place its gallery) and anything the idle show does. So Back is never pressed
  twice to leave a place, and never traps. Taking the flight deck or leaving it by its own control (Launch, ‹ Site; L, Esc)
  is going between places, so a step too; following an address (Back, Forward, a link) is never one, whatever the
  page passes through on its way there (`following` in session.ts). How a place was left that the address does not say
  is kept with its entry (`keep`, `kept` in address.ts): the gallery's tab, chosen by hand, is open again on coming Back
  to it (from the Lineup by its History tab's link, say). Within a flight, Back and Forward between its places are followed in
  place (`onMoved`), with no load: the site as it was left, the gallery as it was left. Between two flights there is no
  load either: `main.ts` lets the last flight's session go (`dispose`: its panels, listeners, sound and deck, its models
  off the GPU, its place if the next is at another place or on another day) and opens the next on the same two stages
  (the site's and the gallery's, each loaded again: `Stage.load`, `Stage.unload`). The front page and a flight
  are two pages' worth of state, so Back or Forward across that line opens the page again at the address it lands on
  (`home.ts`; `front.ts` for an address that names a flight), the same as a reload or a pasted link. The Space Race
  crumb is a step like any other: Back comes into the flight again. `pnpm test:history` (tools/history-test.mjs)
  goes through it with real clicks.
- **Which page comes up** is decided in `enter.ts` by what the address names: `front.ts` for one
  that names nothing; otherwise `main.ts`, which opens a session for the flight it is about (`flightFor`):
  `session.ts` for a flight with a site (the gallery beside it) and `only.ts` for one without (the gallery alone, and
  none of the code that needs a site). The front page brings a flight's page up itself when one is chosen.

A flight with only a vehicle is complete enough to ship: it is in the gallery, and its site and
Fly light up as they are built.

## Icons, flags and emblems

Every small picture on the page is drawn by `ui/icons.ts` (inline SVG; no file, font, emoji or request), and sized by the
text it stands in (`icons.css`).

- **An icon goes beside its words, never instead of them**, in their colour and one stroke weight, `aria-hidden`: the
  three places wherever they are offered (the ways, whose way on gives its icon up on a phone's top line before the
  flight's name gives up a letter; a place not built dims with its name), the three again on each front-page row lit for
  those the flight has (`lacks`), the Lineup wherever it is gone to, Walk, the camera. The panel tabs and the switches
  have none: a tab row has no room for one at 30 % of the width, and **a switch has its lamp and no icon** (the lamp says
  whether it is on, which a picture cannot; one mark before a name is enough).
- **A flag** stands before a nation's name wherever it is named (the front page's rows and its menu's nations, the
  crumbs, the Lineup's key, card and Programmes tab, a gallery's History tab): the flag flown 1961 to 1969, to its
  statute's proportions (`FLAGS`, by the nation's word in an id: China is an entry). It is decorative, the name is beside it.
- **An emblem** stands before a programme's name (the front page's programme switches and rows, the crumbs, the Lineup's
  key, card, section and Programmes tab, a gallery's History tab), by programme id (`EMBLEMS`: the next programme is an
  entry). An American one is the programme's insignia drawn simply (docs/sources.md, "The page's flags and emblems"). The
  Soviet programmes had no patch: theirs is a line drawing of the spacecraft in the text's colour, and says it is this
  site's mark and not the programme's. Each says which it is (`says`: read out, shown when pointed at, and written under
  it large where the programme is told, `emblemFigure` in `programmeMarkup`). Never draw an invented emblem as a patch,
  nor call it the programme's.

## The front page

`front.ts` is the page; `title.ts` its words, laid out as a game's main menu (the mark; the menu: all missions, each
nation, Explore, which is the Lineup, a kept flight to continue, full screen; and the missions to choose from beside
it, which the menu and the programmes narrow; arrows, Enter and Escape work it: keys.ts `front.*`); `app/front/scene.ts` its picture, on a canvas and a
renderer of its own that share nothing with a flight's stages (rendering.md, "The front page's picture"; what the
picture is of, world.md).

- **Left alone, this is the show, and nothing else starts.** No flight is picked for the visitor. The picture opens
  40 m over a plain on the Moon's south-western limb, the blocks on it and their shadows in sight and the Earth half
  risen over a horizon six kilometres off; the camera is already rising, goes straight up (the Earth rises as the
  horizon falls), draws back from half a kilometre up, and goes out along its path for six minutes and a third
  (`PATH.seconds`) to settle 100,000 km behind the Moon; the Earth goes on turning. After half a minute without a touch
  (`IDLE_TITLE`) the words fade away and the Earth is eased to the middle of a picture that is all its own; the first
  movement, key or touch brings them back and eases it aside again. A browser driven by a script is not left alone
  and its picture is held still until told where to be (`sr.front.seek`), unless the address has `?demo`.
- **What of the Moon is real and what is made.** The place is found, not chosen by eye (view.ts `SITE`; `pnpm front:moon
  -- --find-site` lists the places that would do), and its ground down to 481 m is the laser altimeter's. Everything
  finer is made by rule and is `estimated`: the craters under two kilometres (as many of each size as the Moon's old
  ground has: Trask's equilibrium law), the soil's grain, and the blocks (Surveyor 1's and 7's counts; the largest a
  crater throws by Bart and Melosh's rule), all fixed to the ground from hashed whole numbers and a fixed seed, so
  they are the same on every visit (viewer/moonground.ts, moonrocks.ts; rendering.md, "The front page's picture").
  No crater or block there is one of the Moon's, and the page claims none.
- **Less motion** (the system's setting): one still picture, the Earth risen over a level horizon 105 seconds along
  the path (from 30 km: the craters under it have their shadows), the clock stopped at the instant; nothing is drawn twice.
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
- **The words are read over a picture that can be white.** The menu's side of the picture is darkened
  (a gradient that is gone by the middle; under the menu, held upright), and what is read there is `--dim` at the
  least; the missions are on dark glass of their own (the smallest text keeps 4.5:1 over white cloud). Held upright,
  the top of the page is left to the picture and the menu and missions scroll over the rest; on its side or on a
  desk the Earth is put between the menu and the missions, clear of the mark first (`compose` in front.ts measures
  both and tells the scene where the Earth is to be).

`sr.front` is the handle: `sr.front.seek(120)` goes two minutes along the path, `sr.front.stats()` and
`sr.front.cost()` say what it draws and what a frame costs, `sr.instant` the moment on show. `pnpm test:front`
(tools/front-test.mjs, with `pnpm dev` running) checks all of the above in a real browser, and what the page holds
as a phone. `tools/shot.mjs out.png "" "sr.front.seek(80)" 1440 900 --ui` takes its picture.

## The Lineup

`#lineup` is every vehicle the flights have built, side by side on one floor at one scale, in the order they flew
(`app/lineup.ts` the page; `app/lineup/` its scene, one vehicle of it, the hall and the arithmetic; `ui/lineup.ts` what is
written round it and on it). It is at the front page's level and, like it, no flight's: the front page's menu has it
(as Explore), its crumb goes back out, and a flight gone into from it is another page's worth of state (home.ts).

- **It reads the flights' data and the history, and nothing else.** A flight appended to `missions/index.ts` stands in
  the row, in its programme's section, on the timeline and in the figures, without being told how (`row.ts`, tested
  against every flight). Every word about a flight is its own (`flight.ts`) or the history's (`missions/history.ts`:
  each flight's story and its name's, the people, the programmes, the milestones); where the history says nothing of
  a flight yet, the first sentence of its own summary is its line. Nothing is written in the page but what the controls
  are called. A figure is a spec or a check of the flight, found by what its label says (`keyFigures`), shown with the
  confidence it was given there; one a flight does not give is not shown. How tall a vehicle "stands here" is measured on
  its model, and is the flight's own figure where one matches to a hundredth (the gallery's rule), else "as modelled".
- **To scale, and it says so.** Nothing is scaled, ever. Each stands on the floor about its own axis as built (not turned
  as its pad turns it), with the same clear floor between every two, half the widest one's width (`layOutRow`). The row is ruled in height in the plane
  of the vehicles' axes, so a top meets its line from any view; a person 1.8 m tall stands by each; a tape runs along the
  floor. `pnpm test:lineup` holds every vehicle's height to its flight's own figure.
- **What stands there** is the whole row, one programme's section of it, or two or more standing together to be
  compared; each whole on its launch vehicle, or the spacecraft alone: what rides on the launch vehicle, which is the
  parts under the vehicle's `Spacecraft` heading and those of any other heading that stands wholly on it, no lower than
  the spacecraft's own lowest point (Voskhod 2's airlock, listed under a heading of its own; address.ts `craftNodes`, measured on
  the model: no new field; a flight's gallery stands its spacecraft by the same rule). What the spacecraft flew to meet
  (`ModelDef.target`: a docking target) is neither: it is kept, on the floor beside the spacecraft and not lowered with it
  (joined apart from both, merge.ts `BESIDE`; raised in the model by as much as the spacecraft is lowered, stand.ts), and
  how tall the stand stands is the spacecraft's own height. Each is named under its own foot: the vehicle's label, with
  its length, under the vehicle (under its spacecraft, where that stands alone), and its target's own name and length,
  which the model states (`ModelDef.target`: "Agena target vehicle", 7.95 m), under the target. Forming the row again is a dip of the picture, never things sliding through each other.
- **One thing is chosen**, by a click on it, its name, its mark on the timeline, or N and B: the camera goes to it and its
  card comes up (its story, why it has its name, its crew, each of whom opens to their own, the way into its gallery,
  its figures). With nothing chosen a click on nothing does nothing; Escape and 0 go back a step (out of a comparison,
  off the one chosen, out of a section, then the whole row framed again).
- **A programme** has a colour (a step round from its nation's hue: `tintOf`), a lane on the timeline, and a section of
  the row; asked for (its lane's name, the key in the title card, the card's eyebrow, the Programmes tab) the row is
  its vehicles alone under its name, and the tab tells why it was, how it was done and what it left.
- **The address** (`parseLineup`, `formatLineup` in address.ts): `#lineup[/spacecraft][/<nation>/<programme>][/<flight
  id>[/vs/<flight id>...]]`. Everything chosen, compared or formed there rewrites the entry it is on (the Lineup is one
  place: `samePlace`); going to it from the front page and from it into a flight's gallery (`#<flight id>/gallery`) are
  steps, so Back comes out to the Lineup with the same thing chosen. No model may be called `lineup`.
- **Coarsest first, finest where the eye is** (rendering.md's rule; `scene.ts`). The page opens on the coarsest level of
  every vehicle, a fifth of the bytes. Each is then drawn at the level its size on screen calls for, the nearest to what
  is looked at first, as far as the device's allowance goes (`allot`, `ALLOWANCE`); a finer level is fetched once the
  view has rested on wanting it, fades in, and is let go whole when it is no longer wanted. Every level is drawn joined
  by paint (`merge.ts`: the meshes in a material that is only paint in one draw, each corner carrying its paint's number;
  nothing that can be seen changes), the finest part by part so that each part is still a thing of its own, the coarser
  two in as few pieces as can be. A small one-sided marking is omitted from a camera draw only when all of its triangles face away from that eye. Picking, bounds and the shadow cast from the light use the full mesh. The whole row has a budget of 220 draw calls. Each file is fetched and joined once,
  known by its bytes, and shared by every vehicle on it (`shelf.ts`: Vostok 3 to 6 stand on one coarsest file). It is not a `Stage`: a stage
  holds one flight in full. It shares the stages' camera (`viewer/camera`: every promise in camera.md holds), their two
  looks, their levels' fade and the studio's light. A vehicle's shadow is a picture of its own, drawn once (`stand.ts`).
  The identical scale figures beside the vehicles are drawn together in one call. Each turns toward the camera, and
  the visible figures are drawn from back to front.
- **The view is framed in what the panels leave clear**: beside the title card for a tall thing, under it for a long
  row, the pivot seen in the middle of that part (the rig tips the camera for what is covered at the foot; the scene
  turns it for what is covered at the side). Once the hands take the view only an explicit act moves it. A row too long
  to be read whole (its tallest under a third of the clear height: a phone held upright, a tablet) is framed by its
  height instead, and gone along: the row in miniature lies across the foot, each vehicle a mark of its height in its
  programme's tint and the part in the picture framed; a thumb on it goes along the row and lets go on the one nearest.
- **Its panels are the site's**, in the page's own `#ui`: the same glass, chevrons, H, legend and prefs, and on a phone
  the same top line, handle and sheet (fold.css). Names and heights are written on the picture, never under a panel
  or on each other, and are left out where there is no room.
- **Left alone it shows itself** (after 40 s; not for a script or anyone who has asked for less motion): the camera
  goes down the row, one vehicle at a time, a card saying what each was (the history's headline over the first part of
  its story, or its own summary where the history has none; on each as long as that takes to read: `showCard`), on a
  narrow page framed above the card as tall as its words come out (`showClear`). Any
  touch ends it and the view goes back to where it was left.
- **The history's words are written once** (`ui/history.ts`, `history.css`): the card's story, name, crew, programme
  and moments are the same markup and look as a flight's gallery's History tab.

`sr.lineup` is the handle (`sr.lineup.view`, `.choose(id)`, `.step(1)`, `.whole()`); `sr.stage` its scene
(`sr.stage.report()`, `.stats()`, `.pose(azimuth, elevation, distance, y, x)`). `tools/shot.mjs out.png lineup "" 1440
900 --ui` takes its picture; `pnpm test:lineup` (tools/lineup-test.mjs, `--shots <dir>`) checks all of the above in a
real browser at 1280, 820 and 390 wide, and what it holds as a phone.

## One rule: nothing leaks

The gallery is **a second `Stage` on its own canvas**, given the flight with everything but its
vehicle left out (`galleryFlight`). It shares no object with the site's stage. While it is up the
site's stage is asleep (`Stage.sleep`): it draws nothing, hears no key and advances no clock, so
the vehicle on the pad, the selection, the camera, a figure walked somewhere and the clock's
instant are, when it wakes, exactly as they were left; and the gallery, come back to, is as it
was left too. Going to the gallery ends a walk (the figure stays where it stood), stops a running
clock (started again on the way back), hushes the sound and leaves the flight deck.

The launch site, gone to the first time, opens stopped at liftoff on its first section, unless the flight says how it
first shows (`Flight.opens`: an instant, a section and a view; `openingFor` in `address.ts`). Vostok 1 opens at 06:50
Moscow time on the pad's send-off, the scene the film shows from the erector's head, because at liftoff its deck is
empty. The flight deck always starts at liftoff, a section named in the address keeps its section, and a clock already
run or moved is left where it is.

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
  list (`Part.group`: the spacecraft without its booster). The spacecraft alone is the Lineup's, by
  the same rule (address.ts `craftNodes`): once the model has arrived, the parts of any other heading
  that stands wholly on it are with it (Voskhod 2's airlock; `Stage.lowest` measures them). `Stage.only` takes the rest out of the
  model and stands what is left on the floor; its slider is then the stretch of the vehicle's
  slider over which those parts move.
  A heading may also be what the spacecraft flew to meet, a vehicle of its own: a Gemini's docking
  target, built into the vehicle's model standing on the floor 20 ft from its axis because the gallery
  shows one model of a flight. The model says so (`ModelDef.target`, the heading; address.ts
  `targetNodes`): it is a third kind, neither the spacecraft nor what carried it. It can stand alone,
  framed where it stands and not about the vehicle's axis (`Framing.view`); it keeps its own floor
  whatever the vehicle beside it does (`Stage.ground`: the rest lowered or lifted, and it not); and
  where the spacecraft stands alone it stands on the floor beside it, here and in the Lineup alike.
- **Views**: the vehicle's own named views whose parts are all there, as `nodes` only (a `centreY`
  measured on the pad means nothing here).
- **Taken apart**, each part is named as it comes clear of its neighbours (`viewer/labels.ts`:
  `cleared` from `Part.explode` and `order`, `layOut` for where the names go; both tested).
- **Scale** (off by default): the flight's own crew model if it has one, else a 1.8 m outline, and
  a range pole banded in metres as tall as what stands there. The pole's figure is the flight's
  own spec where one matches the model's height to a hundredth, with its confidence; otherwise
  "as modelled".
- **Part by part**: N and B step through the parts in order; left alone, the gallery tours itself:
  it is the site's idle show (`Demo` in `demo.ts`), given the room as its host, no clock and a pace and words of its own.
- **History** (the last tab; on a phone a tab of the sheet): what `missions/history.ts` tells of the flight
  (`toldOf` in `lineup/row.ts`), written as the Lineup's card writes it (`ui/history.ts`): its headline, story and
  firsts, why it has its name (with its source and confidence), the crew (each opens to their own story, dates and
  name in its own script), the history's milestones that are this flight, and its programme (opens to why, how and
  what it left). A flight the history has no story for has no History tab, never an empty one. Its **See it in the
  Lineup** goes to `#lineup/<flight id>` (`formatLineup`) through `home.ts`, a step: Back comes into the gallery again.
  The launch site and the flight deck say nothing of the history: the gallery is its home.

It is always drawn in full (`Stage.fullDetail`: the coarser levels are not even fetched).

## A seat

A vehicle whose data gives it `seats` can be sat in where it stands (the gallery's stage is an `exhibit`:
`CabinView.sit`, `Craft.exhibit` in camera/rig.ts). It is the on-board view the site has in flight, and the same code:

- **In**: the "Sit in the cabin" switch among the others, C, or an address that names the seat
  (`#usa/gemini/gt-3/gallery/Seat_CommandPilot`: `galleryAt` reads a seat's node as it reads a part's). Sitting stands
  the whole vehicle if the seat's part is not on show, puts it together and closes the cutaway: from inside, the cabin
  is the cabin. The camera goes to the seat's eyes with the usual handover; the seat's own `hide` (the man's helmet and
  head) is not drawn, and the man beside him is.
- **From the seat**, as on board at a site: drag and the arrows turn the head within `CabinDef.head`, the wheel and R F
  change the lens, the digits (and the bar on the right) lean to each window and the periscope, 0 looks ahead, a click
  works what is clicked (a control says what it is for: nothing is flown here; a switch is thrown and stays thrown),
  and each of the cabin's switches that switches something (its lights, the Globus's mode) is on its console and in the
  bar. A cabin with no switch built for its lights says so (`lighting.control` left out) and they are thrown from the bar
  alone. The cabin stands as built (`Cabin` with no site: needles at rest, telelights dark: an exhibit is not
  powered). What is seen through the windows and the periscope is the studio, as it is: there is no sky to invent.
- **Several seats**: C goes into the first, then each of the others (the eye carried across: `Cameras.reseat`), then
  out; the bar has a switch for each.
- **Out**: Esc (back from a lean first), C past the last seat, the switch, or Get up in the bar. The camera goes back to
  the view it was taken from, exactly as the hands had left it (`Cameras.unseat`: that rig is not stepped while seated).
  Choosing a part or a view from the seat is going out too, to it.
- **The address**: sitting, changing seat and getting up are choices within the gallery: the entry is rewritten, never
  a step; Back and Forward to an address that names a seat sit in it, and to one that does not get up.
- The show waits while someone sits, and the scale's figures are not written over the cabin.

`pnpm test:seat` (tools/seat-test.mjs, with a server running; `--shots <dir>` also takes a picture from every seat in both
looks) sits in every seat of every flight that has one, by the control and by C, at 1280 and 390 wide.

## On a phone

Under 960 px wide or 520 px tall each place is the view with **one slim line across the top** and **one handle on
the bottom edge**; everything else is in the sheet the handle opens (`fold.ts`, `sheet.ts`, the narrow block of
`fold.css`). The top line is the way back to the front page (the heading, its chevron), the flight's programme small,
and at its right the ways on: in the gallery the one amber button "Launch site ›", at the site "‹ Gallery" and "Launch ›".
Short of room the programme's line goes first and then the way back keeps only its chevron (`fitWays`); a way the flight
lacks is the same button dashed and dimmed with its reason, which a tap puts in the notes. The launch site has the same top line, handle and sheet (its handle: the sections, Walk, More; its View tab:
the slider, the views, the switches, the scale and the diagnostics line; the clock is a small line under the top line,
the time of day said when it is opened), and the flight deck folds in its own terms (`cockpit.css`: the clock is the top
line with "‹ Site" at its right; held upright, on show are one compact line of height, speed and climb over
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
  (cutaway, labels, scale, turntable, light, cel, lighter graphics) and the scale line. A line (`.sideways`, the
  launch site's views too) is one line however long, its label still at its start, and a finger swiped along it
  moves it and never the sheet or the page; it fades at an end only while there is more of it that way (`data-more`,
  fold.ts). Nothing in the sheet is taken off the page while a finger is on it: Safari on an iPhone gives the finger
  to the scroller it lands on, and one built again under it does not move (the sheet measures its stops only once
  it has the finger, and then as it is while moving). `pnpm test:sheet` holds all of this. On View the half stop is as
  tall as what it holds (at most 58 % of the height); Parts, Specs and Motors as on a wide page. Where it was left
  is remembered (`sheetOpen`), and so is the hint said once on a first visit, in the gallery's notes stack
  (`handleSeen`).
- Opening or closing it moves no camera the hands have set: the canvas keeps the space above it and only a view
  still being followed is framed again in it (`Framing.setInset`).
- **Names on the parts** are smaller; where the column of names would lie on the thing (`covers` in `labels.ts`) each
  part has a pin with its number in the parts list instead. The measure's figures are the figures alone, and keep
  off the labels and each other.

## The studio

`viewer/studio.ts` is the setting, and not a place: no Sun, no sky, no haze, no hour. A sweep
drawn by direction (so there is no horizon line), a floor that is only what falls on it (shadow,
a soft dark where the thing stands, a pool of light), a key with a shadow, a rim and a fill, and
a room of softboxes baked for the metal to reflect. Dark or light by choice; in the cel look it
is paper whichever was chosen. Brightnesses are a design fitted by eye.

The closed exhibit keeps its presentation limits, from just above level to 58 degrees
above it. In cutaway the camera may look up beneath downward-facing interior panels
or down from overhead; the orbit rig still holds the eye above the actual studio floor.
Opening the cutaway relaxes those limits without moving the camera by itself.
A named view devoted entirely to `inside` parts opens the cutaway too, with the
same temporary opening as selecting an interior part; a manual opening is kept.
The inspection lamp follows the camera's full gaze, including elevation, and lights
the open interior in both looks. It comes with the opening itself (`Stage.setCutaway`
calls the setting's `inside`), whoever opens it: the stage is never cut open unlit. It does not aim at the whole exhibit's centre when
the subject is a small panel elsewhere in the spacecraft.

## To look at it

`/#usa/mercury/mr-3-freedom-7`, `/#usa/mercury/mr-4-liberty-bell-7`, `/#ussr/vostok/vostok-1`, `/#ussr/vostok/vostok-2`, `/#usa/mercury/ma-6-friendship-7`, `/#usa/mercury/ma-7-aurora-7`, `/#usa/mercury/ma-8-sigma-7`, `/#usa/mercury/ma-9-faith-7`, `/#usa/gemini/gt-3`, `/#usa/gemini/gt-4`, `/#usa/gemini/gt-5`, `/#usa/gemini/gt-7`, `/#usa/gemini/gt-6a`, `/#usa/gemini/gt-8`, `/#usa/gemini/gt-9a`, `/#usa/apollo/apollo-7`, `/#usa/apollo/apollo-8`, `/#usa/apollo/apollo-10`, `/#usa/apollo/apollo-11`, `/#usa/apollo/apollo-12`, `/#usa/apollo/apollo-13`, `/#usa/apollo/apollo-14`, `/#usa/apollo/apollo-15`, `/#usa/apollo/apollo-16` or `/#usa/apollo/apollo-17`
(Gemini 8 to 12 fly their docking chapter; the Fly of Apollo 8 and 10 to 17 ends with the translunar injection). While developing, `/?fixture#test/fixture/vehicle-only`
shows the flight that is only a vehicle (`tests/fixtures/vehicle-only`), through `only.ts`.
`sr.gallery` is the handle; `sr.gallery.stage` its stage. `pnpm test:places` (`tools/places-test.mjs`, with `pnpm dev`
running) goes between the places with slow loads and real keys and checks what is promised above. `tools/shot.mjs out.png
usa/mercury/mr-3-freedom-7/gallery "" 1440 900 --ui` takes its picture.

A flight may give another exhibit a `galleryCraft` label. Its URL is `#<flight>/gallery/<model>`, optionally followed by a part or seat. Both the gallery-only and launch-site sessions switch exhibits on the gallery stage. Gemini X uses this for the dormant Agena Collins visited; the active docking target stands beside the Titan in the primary exhibit. A crew figure can be inspected alone in the gallery and walked at the launch site. The site projection keeps its walkers and drops the separate target exhibits, the primary target's parts, and views that select only those parts.

### Driving the lunar rovers

A Gallery craft with `lunarRover` opens its own driving scene. The Gallery keeps its inspection pose while the driver uses the rover’s assembled model and a separately loaded seated crew. Each rover remembers its own parking position for the browser session. The two scenes share the renderer. Returning to the exhibit releases the terrain, crew and driving controls.

The ground uses nested elevation grids centred 12 m east of the flight’s lunar module. Both tyre contacts and the drawn surface interpolate the same triangles. The inner grid resolves 2 m samples, the outer grids retain the topographic horizon, and a local plane beneath the lander fits the terrain around its pads. Lander heading, soil grain and small gravel are estimated. At Taurus–Littrow, the hatch faces west as seen in the window panoramas. The 2 m stereo strip around Challenger takes precedence over the 5 m valley mosaic. A 6.7 m keep-out radius around the lander accounts for the rover body and landing legs. The driveable radius is 9 km. Each rover site is a landing site (`missions/usa/places/moon/`), whose position and terrain products the scene reads through `src/world/lunar-sites.json`; regenerate the checked-in terrain with `pnpm lunar:terrain` (tools/lunar-terrain.py).

# Rendering — what keeps the picture right

Part of the agent notes: start at [AGENTS.md](../../AGENTS.md).

## Cutaway and what is inside

The vehicle can be sliced open. A model script lists the meshes that enclose something in
`SHELLS` and calls `srlib.mark_shells`; the viewer clips those (one quadrant, facing the default
camera) and leaves everything else whole. So when you add an interior, build it as its own mesh
and do not list it; when you add skin, list it. A part marked `inside: true` in `flight.ts` opens
the cutaway when selected. Interiors are built only at detail 0.75 and above (`srlib.interior()`),
so a distant level of detail does not carry a pilot and plumbing nobody can see.

## Windows are openings

A window is glass over a hole, with the real thing behind it. `srlib.bore` cuts a round hole
through skins (it divides the faces round the hole and removes those inside; a boolean would treat
a lathe with bulkheads as a solid). Frame the hole with a bezel or sleeve that overlaps its rim.
Name the pane's material `glass...` and the viewer makes it a clear pane. Only where nothing is
modelled behind (a lower level of detail, a distant building) does a dark `window-void` stand in.

## An inside to sit in

A model whose inside is somewhere to be (`ModelDef.cabin`) keeps to a few names so the viewer can work it without
knowing it: a `Seat_...` empty at the eyes, `Gauge_...` needles with their origins on their pivots and their scales
in their extras, `Tele_...` lamps each with a material of its own, `Ctl_...` controls, a screen for a periscope
(the table is in `missions/usa/mercury/vehicles/mercury-cabin.md`). A face is drawn by the script that builds the
dial, from the same scale the needle is given. Things stacked on a panel (face, needle, hub, glass, bezel lip) are
each 0.05 in or more apart: the clearance rule is 1 mm, and a needle's material is single-sided so only its front
is held to it. An instrument's cover is the blended material `crystal`, not `glass...`: a `glass` pane is a window,
and is offered to be looked through. What is under a `within` node is lit as indoors (simulator.md). The viewer's
lights inside a model cast no shadows, and cannot: every shadow map is one more texture for every lit surface in the
scene, and the ground and the globe are at the GPU's sixteen already (a shadow-casting cabin lamp stopped both from
compiling). A cabin's shadow is therefore the build's: `mercury_cabin.shade` casts rays in Blender and keeps the
result at the vertices in a colour attribute named `Shade`, the only one `srlib.export_glb` exports, which three
multiplies the surface by. It is two figures in one colour: red, green and blue with the cabin's own lamps on, alpha
with them off (how open the point is, and how much of what lets light in it sees). A viewer that knows no cabin
multiplies by the first, which is right for anything not seen through; `Cabin.shadeBy` patches the materials of the
meshes that carry four parts to mix the two by `uCabinLit`, which the lights' switch moves (`CabinDef.lighting`), so
switching the lamps is two uniforms and the lamps' strength: no light is added or taken away, and no shader is built.
A mesh that is seen through (`glass...`, `crystal`) is not shaded: its alpha is its own. What carries the shade is
indoors wherever it hangs in the model (a hatch's inner face). A shadow's edge is as fine as the vertices are: broad
surfaces are cut every inch and a half, shaded from every part of a lamp and evened between neighbours, and a ray
from one starts clear of what is fastened to it, or a vertex under a clip is a blot. To look at a cabin without the
browser, a model's stills can be taken from its seat (`srlib.render_preview`: `seat`, `look`, `lens`, `lamps`, `hide`).

## No flicker

Two faces in the same place flicker: the depth buffer cannot tell them apart and picks a
different one per pixel per frame. Three things stop it, and all three must stay true.

- **`srlib.check_clearance` runs on every model build and fails it** if two parallel,
  same-facing faces are under 1 mm apart, printing the two meshes and where. Fix the geometry:
  sink a fitting through the skin (so its hidden face is well inside) or stand it off by more
  than a millimetre. Do not pass `--allow-clashes`. Faces that cross at an angle are fine, and so
  are single-sided faces back to back; double-sided materials are held to the stricter rule, so
  use `double_sided=True` only where both sides are really seen.
- **`Stage.fitDepth` fits the near plane to what is there, every frame, whatever the rig**: it stands at half the
  way to the nearest thing drawn in the scene's depth, so depth resolution stays under a third of a millimetre across
  the pad and is millimetres at the ground from 20 km up (with the plane 15 m from a free camera up there, one step
  was 1.6 m and the pad's slab fought the ground under it). Do not give the camera a fixed near plane, and do not
  guess it from what the camera turns about. What is asked: the ground or the sea under the eye; the flown vehicle,
  what it has shed and its parachutes; and, in `Stage.uncut`, the nearest solid surface (the walker's `Solids`) and
  the nearest plant (`Setting.plantsClear`), with the plane's corner kept short of them, so what the camera passes
  is not sliced (`pnpm test:camera`, "the near plane cuts nothing"); a mesh with no hierarchy yet is taken as its box
  and its hierarchy is made in time to spare (`growTrees`), never in the frame that first comes near it (the capsule's
  were made as the chase view came in on it at separation, 26 ms). It comes in at once and goes out over a quarter
  of a second. Anything new that is drawn in the scene's depth and is in none of those (not a model, not the
  place, not a plant) must be asked there too. Following a vehicle the plane cannot go out (the vehicle is 30 m
  off), and the site far below is drawn in steps of centimetres to decimetres.
- **Nothing lies close above the terrain.** Depth interpolated across a triangle kilometres long
  is coarse: concrete 6 cm above such terrain flickered. So the terrain is finely divided (`land.ts`:
  half-metre cells near the eye, never more than 64 m), it sits 12 cm below the pad's surface (`GROUND_Y`, and `GROUND` in
  the site's builders: the pads and roads were at grade), and anything standing on the ground goes down past that (`FOOTING`
  in `site.py`). Change the two together and rebuild the pad and the place.
- **A mesh without a `normal` attribute is flat-shaded.** Three decides that by the geometry, whatever the shader
  writes: the land's patches have none, so each triangle is lit by its own plane unless the site's `LandSpec` asks
  `smooth` (Tyuratam does: its graded slopes showed every cell as a facet). The Cape's land does not yet, and its
  thickets' roofs are lit per triangle; turning it on there changes the Cape's picture.

- **Far off, parallel faces need centimetres, not a millimetre.** Seen from 150 m while the
  camera is close to something else, faces under about 5 cm apart fight. Scenery that is looked at
  from across the site (another pad's slab and its joints, a far track's rails) keeps that much
  between parallel faces, or sinks one through the other.

- **Laid on the ground: layers are told apart by name, at any distance** (`viewer/laid.ts`). Where the near plane
  cannot go out (a vehicle followed 30 m off, the site kilometres below) one step of depth is more than the 12 cm
  between a slab and the ground, and far more than the millimetres between a slab and what is marked or painted on
  it. So those are drawn a fixed number of depth steps apart by the GPU's polygon offset: the setting's floor 4
  steps further, and 2, 4 and 6 steps nearer a material named `concrete-stain…`, `concrete-scorch…` (surface.ts's
  marks), and `…-joint` or `paint-line-…` (what is laid or painted over slab and marks alike). No vertex moves, so
  nothing shifts or gaps; close to, the allowance is a fraction of a millimetre. **A model that lays something flat
  on a surface names its material by that rule** (or the list in laid.ts grows by a class, never by a flight).
  Measured with the near plane pinned at 16 m, straight down, eye moved 2 cm a frame, pixels a frame that change
  and change back: from 20 km 74 to 2, from 40 km 41 to 0.4, from 10 km 45 to 5 (cel: 46 to 3, 18 to 0.4, 54 to 7).
  `sr.stage.layered = false` draws them where they are, for measuring. The offset is the frame's alone: three draws
  a shadow map with a depth material of its own, which takes nothing of the surface's offset (counted: of the 1000 to
  1200 draws into each of the Sun's three maps none is under a polygon offset, layers on or off; the eight that are,
  are the frame's), so a shadow is cast from where the surface is and the maps are the same either way.

`pnpm test:flicker` checks the result in a real browser: every model, every view, six
directions, looking for patches of pixels that swap when the camera turns 0.005 degrees.
`--shots <dir>` writes a map of any it finds. Run it after changing a model or the renderer.

## Drawn from the eye

The GPU's floats step in 1 mm at 10 km and half a metre at the Earth's radius, so nothing is drawn
where it is (`viewer/origin.ts`). Positions live in doubles in JavaScript, in the scene's frame,
which is fixed to the Earth (today the site's): `position`, `matrixWorld`, a ray's hit, a box, at
every moment the page's code can see them. `Origin.draw` moves the whole scene by minus the eye for
the draw only, so every matrix uploaded is relative to the eye, then puts it back; it also moves
what three keeps in the scene's frame between draws (the cutaway's planes, each shadow's lookup,
a hemisphere light's direction). So:

- Read and write positions as they are; nothing outside the draw needs converting.
- Code that runs during the draw (`onBeforeRender`, a pass) sees eye-relative world matrices: put
  them back with `absolute()`.
- A shader that wants a position in the scene's frame from `modelMatrix` or `cameraPosition` adds
  `uOrigin` (as `surface.ts`'s grain and `air.ts`'s fog do); a position in an object's own frame
  needs nothing. `uOrigin` is declared in three's `common` chunk and given to every built-in
  material, so a shader patch uses it without declaring it (a second declaration will not compile).
- `sr.stage.origin.enabled = false` draws the old way: the two must look the same (checked from
  fixed views, frozen: a few dozen pixels in 640,000 differ, by one level, from rounding).

## Drawing only what changed

`Stage.frame` skips the draw when nothing has changed: the camera has not moved and nothing set
`dirty`. Scenery that moves by itself (surf) is redrawn twelve times a second. So anything new that
changes what is on screen must set `this.dirty = true`, or it will show up late. The shadow map is
likewise drawn on demand (`shadowMap.needsUpdate`): set it when something that casts a shadow moves.

## Nothing that is not a number

The frame is half floats and the bloom reads every pixel of it, so one pixel that is not a number
is a black frame: the bloom spreads it over the whole picture. A shader that writes to the frame
must not be able to make one. The frame is multisampled, so a varying is extrapolated past the edge
of its triangle at a pixel the triangle only partly covers: `1.0 - vT` is a hair under nothing
there, and `pow` of a negative number is not a number (this was the attitude jets, jets.ts). So:
clamp what goes into `pow`, `sqrt` and `log`; write a square as a product, not `pow(x, 2.0)`
(undefined for a negative `x`, and on some GPUs not a number); never `normalize` what can be
nothing, nor divide by what can be; and let a march that cannot say what it found `discard`. An
object scaled to nothing draws no pixels and is safe. To check, read the frame before the bloom
(`renderer.readRenderTargetPixels` on the composer's `readBuffer`, from a pass put in before it)
and count half floats whose exponent is all ones (`& 0x7c00`): none, through a whole flight, an
abort and a break-up, in both looks.

## Two looks

The stage draws in one of two looks (`viewer/look.ts`), switched by the Cel shading button or T
and remembered: `real`, the physically based one every model is built for, and `cel`, the same
scene as a drawing. Nothing is authored twice. `Looks` derives a toon twin from each real material
the first time it is needed (same name, colour, map and shader patches) and swaps meshes between
the two; `InkPass` draws the line from the frame's depth buffer. So anything put in the scene must
be handed to `Looks.add` (models are, in `dress`; a setting's floor and scenery are, in
`applySetting`), and code that changes a real material after it is made (the cutaway) calls
`Looks.sync`. Keep reading materials by name: the twin has the same one. What is made again and
again (a flight's parachutes) is given to `Looks.remove` before it is disposed of, or every one
ever made is kept.

`Stage.root` holds the flight's models, and with them what a flight leaves in the air (what it
shed, in its holders; the glow of entry; the ice). Only the models are measured (`modelsBox`): the
place's bounds, and so the depth range and how far a view pulls back, are theirs.

## Levels of detail

Models are generated, so a lower level of detail is a rebuild, not a remodel:
`blender ... -- --out x.glb --detail 0.3`. `srlib.DETAIL` thins every curve and, under 0.5, drops
fasteners; eight sides or fewer is a shape, not a curve, and is kept. The inventory uses 1.0.
The clearance check runs at every level, and coarser curves sit differently against each other,
so a fitting that clears at 1.0 can land on its neighbour at 0.3.

Every model build writes three files: `<name>.glb`, and `<name>.lod1.glb` and `.lod2.glb` at detail
0.6 and 0.3. The viewer draws whichever suits the thing's size on screen (`viewer/lod.ts`), in
pixels per metre at the nearest point of the box round it (`distanceTo`: never its middle, or the
far end of a long thing is coarse with the eye beside it), through the lens and on the screen
there is (`fitDetail`: the canvas's real height and the camera's field of view, so a narrow lens
or a dense screen keeps the fine level further). A model that is cut open is always drawn in full. The place round the pad (`Flight.surroundings`)
is chosen piece by piece (`Scenery` in lod.ts): each top-level node, a building or the track, at
the level its own size on screen calls for, so the building beside the walker is always the finest;
level 0 is the one picked, walked on, lit and worked, and anything driven is always drawn from it.
When the simulator needs distant LODs, add them to `build-model.mjs` as extra outputs per
script and a threshold to `LOD_ABOVE` (the choosing takes any number); do not hand-edit geometry for them.

**A change of level is never a cut.** The levels are not the same shape with fewer sides: below
1.0 the scripts leave out what stands behind a window, rail spikes, door furniture; below 0.5,
fasteners, a truss's lighter bracing, panel lines. Measured (the same view drawn at each level and
compared pixel by pixel), two levels of a building differ at any size at which it can be seen, by
a number of pixels that falls with its area on screen and no faster: no distance hides the change.
So (1) the thresholds (`LOD_ABOVE`: 8 and 2 px/m) are where what changes is tens of pixels in a
million, a few hundred at worst; (2) `chooseLevel` has a margin each way, so an eye resting on a
boundary does not flutter; and (3) the two levels are drawn together for `FADE` seconds
(`Crossfade`): each pixel of the screen has a fixed threshold (no pattern, the same every frame),
the level coming in is drawn where the fade has passed it and the level going out where it has
not, in the view and in the shadow map alike, so a shadow is handed over as its caster is. A
fading mesh wears its material's twin (`Fading.twin`: the material itself, by prototype, with
`LOD_FADE` defined and its own id), so nothing else carries the test and nothing has to be told
about it; `Stage.warm` builds those shaders with the rest. A test (`stage.frozen`) gets the cut.
A level that arrives after the scene is shown, for a thing already wanted that coarse, comes in the
same way (`add(level, object, true)`); under the curtain, asleep, frozen or forced it is a cut. A
change of look in the middle of a fade leaves it going, in the look's materials (`relook`).
To measure a change to any of this: `Staged.forced` and `Scenery.forced` draw a level whatever
the distance (for the place, a level for each piece named), so the same view can be drawn at two levels and
compared.

**Each thing has its own thresholds, measured.** 8 and 2 are what the worst things need (a gantry
whose bracing goes, the pad). Most differ far less from level to level (a road and a cable trench
not at all), and holding them fine until 8 px/m cost 8 ms a frame on the pad against 40 and 12.
So `node tools/lod-thresholds.mjs --measure` (needs `pnpm dev`; `--only <regex>` for some of them) draws every
model, and every piece of the place, at each pair of levels from the same eye at a range
of sizes, in both looks, and counts the pixels that differ in the worse of the two (the first level is drawn again
after the second as a control: it must be the same picture, `pnpm test:frozen`); a thing's threshold is the largest size at and under which no more than 100
(level 0 to 1) or 350 (1 to 2) pixels of 1280 x 800 differ, never under 8 and 2, the second kept a
size under the first so that nothing goes from 0 straight to 2, and never over the size at which the whole thing
is still in the window (nearer than that the picture is of a part of it: a gantry's two levels came out alike from
16 m with its bracing out of the frame). The figures and what was measured
are kept in `<name>.lod.json` beside the model's script and carried in the GLB's extras
(`lod_above`: the scene's for a model, a top-level node's for a piece), which lod.ts reads
(`thresholdsOf`); `build-model.mjs` puts them back after a rebuild and a test fails a GLB that has
lost them. **After changing what a level leaves out, measure again.** A thing with no record
has 8 and 2.

**Shadows reach as far as the place does.** The Sun has two maps. Its own (`fitShadows`,
`fitWalkShadows`) is fine and spent where it is looked at: the section's model, or 52 m of ground
round the walker. The far one (`viewer/shadows.ts`: `FarShadow`) covers everything that stands at
the place, coarsely, and is fitted once, so it never shifts under a walker; the shader's
directional light reads the fine map and, over its outer part and beyond, the far one, mixed
across the band. (Before, nothing past the fine map's edge had a shadow, and on foot that edge
was 26 m away and jumped every 9 m walked.) The far map belongs to a second directional light
that gives no light; it is drawn only when something it would show asked for the shadows again
(every `shadowMap.needsUpdate = true` is heard), not for the walked figure's own motion
(`FarShadow.nearOnly`), and on foot in a frame of its own with that figure's shadow off, or it
would keep his shadow where he had been. Two directional lights with shadows mean exactly this
pair to the shader: a third would need the patch widened.

**A shadow's depth bias is a length** (`depthBias` in shadows.ts: 2.5 texels of its map, at least
2 cm), never a share of the shadow camera's depth: as a share it came to 29 cm on foot and 60 cm
orbiting, and sunlight came through every roof slab along the tops of the walls inside. And
**model surfaces cast from both faces** (`shadowSide` in `Stage.dress`): three's default casts
from the faces turned from the light, a wall's inside, so its shadow began at the very surface a
room's walls meet and light crept in along each joint. A grazing surface is `normalBias`'s work.

**Indoors the eye adapts.** On foot `Stage.adapt` asks how enclosed the eye is (nine rays) and
takes the exposure over a second to the one a room has (`expose`: the one place the exposure is set;
`INDOORS_EXPOSURE`), up from the sunlit ground's by day and down from the night's, which is an eye
among floodlights: so a room's lamps (`Light_<room>`, on at every hour, their strength in fittings:
`interiors.ceiling_light`) look the same at noon, dusk and midnight, and the fittings' own glow is
told the exposure it is seen at (`Lamps.exposed`). In the cel look a point light falls square
on what it reaches (lamps.ts), or a room's lamp draws rings on its walls. A building whose inside
is not recorded is not offered empty: its door is built shut and its windows dark (sitelib
`door(works=False)`, building kinds "shut" and "blind").

A mesh is a draw call, and another in every shadow-map redraw, so each build joins meshes nobody
can tell apart before it exports (`srlib.merge_static`, at every level, after the clearance
check). The node tree is never changed: every empty keeps its name, transform and extras. Only
sibling meshes are joined, when they share a parent and a material and each is static and
anonymous: no transform of its own (an origin is a pivot), no children, skin or shared mesh data,
no custom property (but `shell`, joined with like), a name no flight's data and no viewer
contract asks for (`build-model.mjs` evaluates every `flight.ts` and passes its strings as
`--named`; without that list nothing is joined), and a material the viewer does not treat mesh by
mesh (`glass...`, `lamp...`, `concrete-scorch/stain...`, anything blended). A join spans at most
12 m, so Draco's step stays under 0.05 mm. The build compares every triangle before and after and
fails if one differs. So a mesh the viewer must find gets a name in `flight.ts`, a custom
property, or its own origin, and a new per-mesh material goes in `_PER_MESH_MATERIAL`.

## Performance: measured, and never bought with quality

Nothing visible is made coarser, blurrier, later or different for speed. Time is won from wasted
work, and a saving is only a saving once `pnpm bench` (`tools/bench.mjs`) has shown it.

The benchmark builds the production bundle into `node_modules/.bench/dist`, serves it on a free
port of its own (never the dev server) and drives it in Chrome with vsync off. The page knows
nothing of it: the script stops the page's loop through `window.sr` and turns it over by hand with
a fixed step of 1/60 s, so the clock, the camera and the walk are the same on every run. A frame's
cost is from calling `Stage.frame()` to the GPU having finished (a pixel read back; `gl.finish()`
does not wait in Chrome). Scenarios: the pad still, drawn and orbiting; each section with a part
selected and cut open; on foot standing, on the apron and on the gantry; the record's flight in
the chase view and the flight deck with navball and path at T+1 to T+700; a cold load (local and
at 20 Mbit/s: first frame, models on stage, ready, bytes by kind as GitHub Pages serves them,
programs, compile time, heap); a 60 s soak on the page's own loop (hitches, collections). Each at
1440x900@1, 1440x900@2 and 390x800@3 in both looks, `--reps` times: the table gives medians and
spread, draw calls, triangles, programs, textures, the cost of a shadow redraw and of each pass.
`--only <regex>`, `--sizes`, `--looks`, `--profile` (top self-time functions, from an unminified
build) narrow it; the header of the file lists the rest.

- **Two runs made at different times say little**: other work on the machine moves every figure by
  tens of per cent. Compare within one run. `--b-dist <dir>` or `--b-query <search>` measures a
  second build, or the same build with a switch in its address, turn about with the first, and
  ends with what moved by more than the noise. `--toggle "<script>" --toggle-off "<script>"`
  throws a switch inside one page and times blocks of frames each way, turn about, which is the
  closest comparison there is. `--compare old.json new.json` does the same for two kept results.
- **Pictures prove nothing across page loads** (cloud, surf and reflections go by the time since
  the page opened). What proves a change leaves the picture alone is `--shots <dir>` with
  `--toggle`: each scenario frozen (no time passes at all), drawn with the switch off, on, and off
  again, and the pixels that differ counted. Off against off again is the floor: most views are
  identical to the last bit, a few (cloud from above) wander by a level or two.
- **A frozen stage draws the same frame twice** (`stage.frozen`; `pnpm test:frozen` checks it in both looks, still
  and with every level of detail thrown to another and back). Every tool that compares pictures stands on it, so
  nothing may reach a frozen frame from the wall's clock or from an earlier frame. What did, and is now cut while
  frozen: a room's lamp handed from one room to the next over 0.6 s of `performance.now()` (lamps.ts `atOnce`: 72
  frames of a lit room changing after every move of the eye, thousands of pixels in the cel look, where a tone
  flips); the clouds' blend with their last frames (clouds.ts `frozen`: 25 frames to come to rest after anything
  changed the depth under a cloud, and a cel cloud's edge is cut at one half); and the Sun's maps, kept from
  whenever something last asked (a plant's shadow in the form the eye was then near enough for), which a frozen
  frame draws with itself; and the reflections' bake, faded in over up to six seconds of the wall's clock
  (backdrops.ts `Reflections`): coming down from orbit to the pad one ran on under the frozen frames that followed,
  and beside the gantry, where the vehicle fills the view, 13,000 to 25,000 of its pixels differed between two draws
  of one frozen frame (`Setting.at`'s `atOnce`: a bake owed is made at once, a fade under way is finished). Anything
  new that eases over time takes its time from `dt` and is cut by `frozen`.
  Nor may where something stands depend on how it got there: the box the chase camera and the Sun's map go by is
  taken in the vehicle's own frame through its nodes' own placings (taken in the scene's frame it was a different
  box for every attitude, and 1400 to 6200 pixels of the vehicle differed after a level went and came back), and
  a pivot or a light that follows is put where its subject is, not moved by how far it went (a sum of moves comes
  back a last bit out). And the frame leaves for the canvas opaque (`Bloom.adopt`): where something is blended into
  it (the air from above) its alpha is under one, and a copy of the canvas (`drawImage`, which every such tool
  uses) laid that over the copy before: a little of the last picture, at the edges of things.
  The page goes on arriving for seconds after the curtain lifts (coarser levels, trees, maps): a tool waits for
  a frame drawn again to be the same frame before its first picture.
- So **anything that changes how the scene is drawn keeps a switch** for as long as it is being
  judged: `?plain` in the address does everything the old way (the load as well), and each has its
  own flag on the stage (`sr.stage.glazing.enabled`).

What has been found, so it is not found again:

- **A clear two-sided material costs a shader lookup twice a draw.** Three draws a transparent
  `DoubleSide` mesh as back faces then front faces by changing the one material's `side` and
  marking it changed, and a changed material has its whole description rebuilt to find its
  program: with 120 panes on show, a tenth to a sixth of the pad's frame. `viewer/panes.ts` gives
  each pane a twin instead (back faces, drawn straight before it by `paneOrder`), with materials
  that never change: the same two draws, the same shaders, the same pixels. Anything new that is
  clear and two-sided and stands in numbers goes through `Panes.add`; a material that will be
  changed after it is made (a shell's, which the cutaway opens) is left to three.
- **Never draw the scene through a camera that cannot see its lights.** Three keeps one lighting state for each
  scene object it draws. The clouds' veil pass drew the scene on a layer of its own, where there are no lights:
  the state went from the frame's lights to none and back every frame, and each change sent every lit material of
  the frame to have its shader looked up again: 3 ms of the main thread and 1.4 MB of garbage a frame, in every
  view. Such a draw is given a scene of its own that holds the same children (`CloudPass.veiled`, as
  `outline.ts`'s list scenes are): same objects, same picture, its own state.
- **A shader is built for the buffer it draws into.** `renderer.compileAsync` builds what it is asked for off the
  main thread, but for whatever render target is set when it is called: with none set it built every shader for
  the canvas (tone-mapped, in the screen's colours), and the scene is drawn into the composer's buffer, so the
  first frame built them all again, one at a time, with the page stopped (`onFirstUse`: 3.7 s of a 10 s load).
  `Stage.warm` sets the frame's own target for the call. And nothing is drawn while the page opens (`Stage.held`)
  until `warm` has had them built: a draw that needs a shader not yet built waits for it there and then. Opening
  went from 8.8 s to 6.2 s on the same machine in the same run, the main thread blocked for 3.5 s instead of 6.4,
  and 183 programs are made where 321 were. Anything new that draws a scene into the frame's buffer is covered by
  `warm`; a pass with a shader of its own (a full-screen quad) is still built at its first draw.
- **Three builds only for what is shown.** `compileAsync` walks the visible scene, and a mesh's buffers go to the GPU
  the first time it is drawn: what the flight keeps hidden until its moment was built in front of whoever was flying.
  The attitude jets' shader and the cabin's 93 inside meshes (drawn only from within 30 m) went in the frame the capsule
  left its booster, the parachutes' three shaders as the drogue came out (25 to 120 ms each). `Stage.uncover` shows
  them for `warm`'s passes and `prebuild`'s; and the jets and parachutes are the flight's, kept when a run is flown
  (`flyRun`), not made again with shaders nobody built. Anything new that is hidden until an event goes in `uncover`.
- **One shader for every twin that can share one.** A cel twin (`look.ts`) had a program key of its own, so two
  hundred toon shaders were built, one after another, the first time T was pressed: the page stopped for four to
  seven seconds. Twins now share a shader unless their materials are patched differently (the material's own
  `customProgramCacheKey` says so), which is nineteen programs, and `Stage.prebuild` asks for the other look's
  at the end of `warm`, to be built behind what is on show: the first change of look is one frame.
- **On foot the fine shadow map is kept between steps** (`shadowcache.ts`). The walker's own shadow is in the 8192
  map, so every frame he moved three drew every caster in reach again: 270 draws and 470 000 triangles for one
  figure's shadow. A second depth map holds everything but the figure; a frame in which nothing else changed copies
  its texels back over where the figure's shadow was and draws the figure on top. Walking the apron at 1440x900:
  7.7 to 6.3 ms a frame (real), 6.0 to 4.6 (cel). The condition was that the map be the same to the last texel, and
  it is checked that way: at 114 stopped instants of seven walks (standing, walking, running a curve, first person,
  low Sun, the gantry rolling, the clock fast) the map was drawn both ways and compared, 67 million depths each
  time, none different. What that took is the lesson: nothing may be assumed to have told you it changed. Levels of
  detail change with the eye and ask nobody, so the cache reads every caster the light can see, every frame (which,
  where, what shape); the figure is skinned, so its bounds as built say nothing about where its shadow fell, and the
  texels to put back are found from spheres round its bones; and during the draw every matrix is relative to the
  eye (origin.ts), so a place is read with the scene's own shift taken off. Where a caster's shadow moves with the
  time alone (plants in the wind, a level of detail fading) nothing is kept and the map is drawn whole as before: so
  among plants, and on the gantry above them, it buys nothing. It costs 256 MiB while someone is on foot, freed with
  the 8192 map half a minute after.
- **A net under the frame rate, for a weak machine only** (`quality.ts`, the "Hold frame rate" switch, pref
  `resolutionAuto`, off unless chosen). Everything is drawn at the screen's own pixels. With the switch on, while
  frames drawn one after another stay under 30 a second for four seconds the drawing's pixel ratio is taken down a
  tenth, never under 0.6 of full nor one pixel a CSS pixel, and never the page's own panels; at 40 or better it is
  tried a step up again, and a try that fails waits twice as long before the next. A view that is still is always
  drawn at full. A hitch (a frame over a quarter of a second) and the seconds after a load, a resize or a change of
  look are not counted. If two steps running buy no frames (the pace is the processor's) the pixels are given back
  and left alone four minutes. The diagnostics line shows a lamp while it is acting. It is never a way to make a
  scene affordable on a capable machine: 24 ms a frame is that scene's fault and is to be fixed there. `pnpm bench`
  switches it off while it drives frames and its soak reports the least resolution drawn at.
- **A pass over the multisampled frame is the dear thing, not what it draws.** The frame is 4x multisampled half
  floats; a full-screen quad blended into it reads every sample back, writes every sample and has the whole frame
  resolved again. The glow did that to add itself (three's UnrealBloomPass ends by blending over the frame), as the
  clouds once did. It is now added in the output's own pass, under the clouds (`bloom.ts`: `Bloom.adopt`): 1.2 to 2.9
  ms a frame at 1440x900 on a dense screen, in every view, with the same picture (no pixel by more than one level).
  Its blurs are sized in CSS pixels, so the glow is as wide on any screen (it was half as wide on a dense one as on a
  plain one; the dense screen's is the one kept). Halving the finest blur's size as well bought nothing that could
  be measured and was up to 6 levels out, so it was not kept. GPU timer queries round each pass (scratch `gpu.mjs`)
  put the glow at a fifth to two fifths of the frame and did not move when its work was quartered: on this GPU
  (tile-based) they charge a pass with the loading and storing of whatever target it leaves, and are no guide to
  what a pass's own drawing costs. `sr.stage.bloomOld = true` (and `?plain`) draws it three's way, for measuring.
  Anything new that wants to lay something over the whole frame does it in the output's pass too.
- **The Cape's coarser levels are built and not drawn, and are not worth drawing.** The near complexes
  (`cape1961.ts`, `1961-05.glb`) are 28,332 triangles in full, 26,972 and 26,540 at levels 1 and 2 (LC-17, 12,336 of
  them, is the same at all three), and they are drawn as fourteen meshes, one a material, all five complexes joined.
  To choose a level a complex they would have to be drawn a complex, a material and a level apart: some seventy
  draws in place of fourteen, in a frame that is bound by its draws, to save 1,800 triangles of three million.
- **Tried and taken out: the pad choosing its level of detail piece by piece.** The pad is 160 m across and one
  model, so on foot it is always beside the walker and always in full. It was split as the place is (`Scenery`): each
  top-level node a piece, and a node whose children stand apart (the ground equipment, one node spread over the whole
  pad; the floodlights; the camera towers) taken child by child, 41 pieces, each with thresholds measured in both
  looks, a cross-fade of its own, its box taken again when the slider or a door moved, in full within 9 m and when
  cut open or driven. Thrown in one page (`pnpm bench --toggle`, the fades cut at each throw, three repeats, both
  looks, 1440x900 at 1 and 2) it took 3.6 % off the draws and 5.4 % off the triangles of the pad's own view and
  nothing off the frame: every pair of repeats within 0.3 ms either way at 1440x900 (12.88 to 12.68, 11.77 to 11.77
  ms), no scenario outside its spread. On foot 16 of the 41 went coarser and nothing changed, because **what is dear
  is what the walker stands beside** (the gantry, the cherry picker, the trucks) and the pieces that can go coarse
  are the cheap ones, most of them the same geometry at every level (huts, screens, barricades). And the picture
  paid: each piece kept inside its own 100 and 350 pixels, but 37 pieces each inside their own allowance came to
  1,900 pixels of 1.3 million in the pad's view where the pad in full drew none. A first timing had it 2 to 4 ms
  slower: every throw of the switch started 37 cross-fades, which the timed frames then drew (cut the fade before
  timing a change of level). Do not build it again for a pad; a model would have to be dear in its far parts.
- **Tried and taken out: drawing every mesh of a material in one multi-draw.** The pad's frame at 1440x900 is
  bound by the CPU (three's work per draw call), so a batch per material per file was built, with the meshes left
  in the scene on a layer the camera did not see (so picking, outline, cutaway, moves, levels of detail and
  collision asked the same objects) and each instance given the very matrices three gives a mesh, from a texture,
  in three's own draw order. It took the pad from 1422 calls to 676 and 12 to 15 % off its frame, and it lost: 2
  to 5 % slower in 15 of 50 scenario-looks (wherever little of what was batched was in view, every instance was
  still looked at every frame), and never the same picture: 1 to 37 edge pixels in 1.3 million differed (331 in one
  cel view), because the GPU's compiler rounds the batched shader's vertices one bit apart from the unbatched
  one's. `invariant gl_Position` made them agree exactly but moved 300,000 depths and 2,000 pixels against today's
  picture. What it taught is worth keeping: a texture written every frame must not be the one the last frame drew
  from (the driver waits for the GPU: 3 ms); an object three is left to walk past costs ten microseconds in every
  pass; where two faces are at one depth the later draw is the one seen, so draw order is part of the picture; and
  two shader variants of one material do not round alike. Do not build it again without a per-batch bound and a
  ruling on those pixels.

## Memory: what a phone can hold

A phone's browser kills a tab that holds too much and says nothing: the page reloads, then "a problem repeatedly
occurred". It happened (an iPhone, the launch site: drawn, then gone), and the cause was not one thing: at a phone's
size the page held 838 MiB of the GPU's with the curtain up, 1011 half a minute later when the globe's colours had
arrived, and 1091 on foot, most of it for things not on show (the globe's maps, a fifth of a gigabyte blank; the
cabin's panels; shadow maps sized for a desk's screen; three levels of detail of everything), beside 300 MB of
JavaScript heap and 125 MB of decoded pictures.

- **It is counted, not guessed.** `?mem` in the address (src/mem.ts) wraps every call that allocates on every WebGL
  context before one exists, and `srMem.report()` is every live texture, renderbuffer and buffer by bytes and by who
  asked (the page's own frames of the stack); `?mem=show` writes the totals in a corner, for a phone with no console.
  `pnpm test:mem` (tools/mem-test.mjs, `--table` for the list) opens the launch site as a phone (390x844 at 3, touch)
  and **fails over a budget** (MiB): 350 with the curtain up and half a minute later, 400 on foot, 450 in flight,
  500 from the couch and at any moment between (measured: 309, 317, 388, 409, 473; the full tier at the same size
  728, 902, 1091, 1095, 1172). The reasoning: the phone that was killed held between 838 and 1011 accounted, with
  some 430 MB more on the page's side, so a tab on a 4 GB iPhone dies near 1.3 to 1.4 GB all told. 400 with the
  340 the lighter tier holds on the page's side is a little over half of that: room for what the count does not see
  (a driver's own copies, the compositor's), and for the next flight. A desktop browser will not reproduce the
  kill: the account is the evidence. **Anything new that allocates is run through it**, and a figure is raised only
  with a reason written here.
- **Two tiers, decided once as the page opens** (`viewer/tier.ts`; `sr.stage.tier`). `full` is every size as it was
  made, and a desktop's picture is not touched by any of this (main against the branch, frozen, 1440x900: the pixels
  that differ are the clouds' and the sea's, which go by the time since the page opened, and as many differ between
  two loads of main). `lighter` is for a device that says it is constrained (its first pointer is a finger, as on
  every phone and tablet, whose Safari reports no memory; or it reports 4 GB or less; or its GPU takes no texture or
  renderbuffer of 8192), never by the browser's name; "Lighter graphics" in the controls chooses or refuses it on any
  machine (prefs `lighter`, `lighterOff`; it reloads, since what a tier allocates is allocated at the start), and
  `?lighter` / `?lighter=0` do it for one visit.
- **On every device:** the cabin's pictures (its panels, 155 MiB with their mip levels) are not sent as the page
  opens but by the cabin, a picture a frame, as the eye comes within 60 m of the vehicle (cabin.ts, `send`); three
  sends a picture whole, so the largest is one frame of some tens of milliseconds on a desk, once.
- **What the lighter tier changes, and what of it can be seen:**
  - *Nothing made that is not on show (no loss).* Only the levels of detail in view are sent to the GPU as the page
    opens (every level's shaders are still built: `warm`); another level is sent when first drawn. The whole Earth's
    cube is made from 150 m up, the relief and colours when the eye passes 1500 m and never by the timer (later.ts);
    each picture is decoded, copied in and let go before the next is fetched, where six decoded faces at once were
    100 MiB. A model's pictures are sent when first drawn, not all at the start; the cabin's only once the inside is
    drawn, and let go again when it is not. The other look's shaders are built at the first T, which then takes a
    moment. On foot there is no second fine shadow map (shadowcache.ts off: the same picture, more drawing), the
    walk's map is let go two seconds after a walk and not thirty, and only one of the Sun's fine maps is held at a
    time. Triangles are listed in two bytes a corner where a mesh has under 65,536 vertices (the same triangles).
  - *Sizes (seen, if looked for).* The Sun's fine map 2048 for 4096: a texel on the ground is twice the full tier's
    (2.4 cm for 1.2 round the vehicle, 12 cm for 6 across the pad), so a shadow's edge in a close view is softer. The
    far map 2048 for 4096: 30 cm a texel for 15, the soft shadows of things past the fine map's edge are softer still.
    The sky's map 1024 for 2048. On foot the fine map is 3072 over 36 m, 12 mm a texel, where a phone had 4096 and
    9 mm (a desk has 8192 over 52 m, 6 mm). A model's picture of 2048 a side or more is sent at half size each way
    (the cabin's main panel 2048 for 4096: 0.27 mm a texel, where a phone's pixel at the couch's distance is 0.6 mm;
    with the lens zoomed in past twice it is the picture that gives out first). The periscope's cube 512 a face for
    1024. The region's flat maps 2048 a layer for 4096 (the near map's coast 78 m a texel for 39, kept as a distance,
    so it is a smooth line either way, and from the ground at the horizon). The whole Earth's cube 1024 a face for
    2048 and its colours and relief at half size each way (globe.ts `small`, which was meant for this and never true
    on a phone: it compared device pixels): past the region's own maps coasts are rounder and the land's tones
    softer. Drawing pixels stay 1.5 a CSS pixel, as a finger's screen had already.
  - *Not changed:* the frame's 4x multisampling and half floats, the clouds' field (4096, 32 MiB) and the ground's
    cover maps (two of 2048, 43 MiB), anything's shape. Those are the next to weigh if the budget must come down;
    each is somebody's picture. The shadow maps' colour attachments, which nothing reads, stay: three's
    WebGLRenderer makes no target without one (a `count` of 0 is WebGPURenderer's only), and they are one byte a
    texel (R8), a quarter of the depth's.
- **The front page holds its own picture and nothing of a flight** (front/scene.ts): as a phone, 71 MiB (textures
  45: the Earth's three cubes and the Moon's six maps; the Moon's mesh 9; the canvas 17, at 1.5 drawing pixels a CSS
  pixel with its multisampling), where the front page had been Freedom 7's launch site behind a veil, 309. On a desk at 1440 x 900
  at 1 it is 155 (the colours at full size, the mesh four times as fine, the canvas 31). `pnpm test:front` holds it
  to 90 as a phone, and the most at any moment while a flight's gallery arrives over it to 350 (measured: 257, and
  186 once the picture is let go): the picture is let go only when the flight is there to be seen, so for those
  seconds the page holds both. A context that has been
  let go is counted as holding nothing (mem.ts), which is what losing it means.
- **A lost context is not a dead page** (`viewer/lost.ts`). `webglcontextlost` on a stage's canvas stops its loop for
  good and puts up a word with "Reload with lighter graphics" (which chooses the lighter tier and remembers it) and
  "Reload"; nothing reloads by itself, so there is no loop for the browser to give up on. An allocation the GPU
  refused while the page opened (out of memory, or the frame's target incomplete: asked once, at the end of `warm`)
  puts up the same word. A context given back (`webglcontextrestored`) is not taken up: what was drawn into targets
  once (packed maps, baked ground, the clouds' field) went with the old one, and the word says so.

## The Earth from height

What is seen from above the air is meant to stand beside photographs from orbit (the owner's word: clouds,
air and flight effects real, the ground near the eye designed). What keeps it so:

- **Data is baked, cited and dated.** Relief and the sea's bed are ETOPO 2022, the land's colours Blue Marble
  (May 2004), on the globe's cube and, finer, on a plane over the site's region (`pnpm globe:surface`; needs
  GDAL; downloads stay outside the repo; `--region <name>` bakes one region and leaves the others' files as they
  were). The colours are 2004's land, not 1961's: say so where it matters. A region may take another month of 2004
  for the season of its flights (Tyuratam's is April's: the steppe's short green).
  A region names its `banks` (pale sand under clear water) in tools/globe-surface.mjs: the sea's colour is
  worked from depth (`globeWater`), bright only there.
- **The weather is a day's, and the day is the flight's.** A flight's `weather` (types.ts: `DayWeather`; a
  `weather.ts` beside its `flight.ts`) is what was observed at or nearest its site at the hour nearest liftoff:
  the low cloud, the middle deck, the high cloud, the wind, how far one could see, each figure a `Measure`, and
  `beyond` for what a report says of a stretch of country. `viewer/day.ts` turns it once into what is drawn
  (`dayOf`), and nothing else in the viewer holds a figure of any day's sky: not `cape.ts`, not `weather.ts`. A
  flight with none stands under its site's (`SiteDef.weather`), and then under a clear sky: both estimates.
  - **A day is written into the shaders, not handed to them.** A flight is a page, so a page has one day: its
    figures are text in the shaders that draw it (`sheetsGlsl`, `weatherGlsl`, `overGlsl`, the shared chunk in
    air.ts, the globe's shade), and what a day does not have is not in the text at all (weather.ts: `highOf`).
    So on a day whose record has no high cloud every shader is, comments aside, what it was before a flight
    could give its day, and so is every pixel: tests/weather.test.mjs pins the sheets' and the map's text for
    Freedom 7's day, and the two builds were compared program by program and frame by frame when this was made
    (288 programs the same text; the sky from the pad and from 3, 8, 12 and 150 km the same to the last bit, in
    both looks). Two page loads can be compared so, whatever `pnpm bench` says of them, once what goes by the
    time since the page opened is put to one instant in each: freeze the stage, then `setting.tick(120 - e)`
    with `e` the seconds ticked so far, which the billows' rise gives (`stage.clouds.uniforms.uRise.value / 0.4`):
    the clouds' drift, the surf and the plants' sway are all the setting's tick. Handed over as uniforms instead, with every new term nothing on such a day, five pixels in a
    million came out a level different: the compiler orders and fuses arithmetic by the whole expression, not by
    what its terms come to. The cloud pass's shader is therefore made when the day is known (`CloudPass.dress`:
    the first time there is air with clouds or sheets in it, under the curtain), not when the stage is.
  - **The record holds at the site, layer by layer, whatever lies round it**: the cumulus within 12 km
    (`coverNear`), the deck within 40 km (`deckCoverAt`), the high cloud as far as an observer under it sees it
    (`reportReach`, `highCoverAt`; for fibres, not a veil, out to a lobed line, `heldDistance`, in the map and the
    shaders alike: along a circle it was a disc from height, with an edge in the cel look), and before the map has
    come in, everywhere. A record's stretch of country
    holds all over it (`weatherAt`: `MapDay.beyond`; tests/weather.test.mjs holds 21 July's).
  - **Everything else is estimated and says so**: `viewer/weather.ts` builds a plausible morning from the land
    map, the relief and the day's wind; no chart or reanalysis of any day has been read.
  - **One map is baked for each region and day** (`public/globe/<region>.<date>.weather.png`, `pnpm
    globe:weather`, which takes the flights): not one map with the record blended in as it is drawn, and not
    parameters to the shaders. weather.ts says why: a day's weather is not another's with a number changed, a
    stretch of country is a shape on a map, and a map a day leaves every shader as it was (one texture, nothing
    more for each pixel), so the first day's file and its pictures are what they were. Bake again after changing
    weather.ts, a flight's weather, the land map or the relief.
  - **High cloud is fibres or a veil.** Cirrus is `cirrusAt`'s fibres, never more than half opaque. Cirrostratus
    over the whole sky is `veilAt`: a smooth sheet as deep as the record's optical depth, the Sun's disc and a
    glow through it, whiter toward the horizon, a white sheet from above, one flat paler tone in the cel look from under it and its fibres in two flat tones from above it.
    It is lit by the Sun at its own height and from the Sun's own direction (`highSun`, `uTrueSun`: lit before
    sunrise on the ground; the scene's one light is the Moon by night and points nowhere in between, and a veil
    lit by it stepped at sunrise). What is under it has
    the Sun through it by one rule (`veilShade`, day.ts and weather.ts: half the depth along the slant, since
    ice sends half of what it scatters on beside the beam) in four places that must agree: the shared chunk
    (air.ts: `veilLightUniform`, one number set with the light, for what is below the veil's height), the
    marched cumulus (`sunUnder`), the far cumulus and the deck (clouds.ts), the globe (`sheetsShade`). What it
    takes it mostly gives back as the sky's light (`VEIL_DOWN`): to the clouds under it (`veilGlow`) and to the
    scene through the reflections' sky, which has the veil in it (backdrops.ts); the haze and the horizon lose
    their blue under it. Shadows under it are softer (`Setting.shadowRadius`). All of it follows the Sun's
    height smoothly: light must never step (world.md). Its opacity, its light and the half are estimated.
  - **A day without cumulus still has its sheets** (Vostok 1: cirrus and nothing under it): nothing is marched,
    the sheets are laid over the frame, and the chunk and the globe carry only the veil's shade.
  - A new figure of a day goes in the flight's `weather.ts` with its source; a new way of drawing one goes in
    day.ts as a stated rule. Never a constant in a place's file.
- **One field, three readers.** The cumulus's noise, cut where the weather says (`cumulusBias`), is read by
  the march's bake, the far cover (`farCumulus`) and the globe's shadows (`globeShade`): change one, change
  all. The far cover is slices of the same heap the volume marches, then the field averaged along a pixel's
  length, then cover alone: each fades into the next by the pixel's footprint, so nothing ends in a circle
  and nothing under a pixel is drawn.
- **From far above, cumulus are cells.** Where a pixel takes in 45 to 90 m of the field and more, the far cover and
  the globe's shadows read the field through `cumulusCells` (weather.ts: rounded, lobed domes where the noise is
  over its cut) instead of the noise cut at a level, which is a torn shape. Nearer, it is the noise, which the
  volume is heaped on: a cloud between the two is taken apart, 55 to 110 km off, never cross-faded
  (`cellsBlend`: first what of it is not a cell goes, then the cells where it had none come up; a mean of the two was
  both pictures at once). The cells are many and small (300 m
  apart, 150 to 700 m across, most of them small and low, so grey and half seen through) with a few broad heaps;
  a cell under a few pixels is lit evenly. What they cover is measured against the cover asked for (the figures
  are in weather.ts: `SCATTER` spreads the cells between the clumps and `SCATTER_SHIFT` keeps their cover; `MORPH` keeps
  the cover half way through the morph): change a cell's breadth or how many stand and measure again. Whether a cell stands is worked out at
  the cell's own middle from the coarse octaves' corners, read once a pixel (`cellsCorners`): not from the value and
  slope at the pixel (the same cell then stood for one pixel and not the next, and specks came and went), and not by
  reading the noise at each middle (nine cells, up to five times a pixel: 1 to 2 ms a frame in flight). A cell comes
  up from nothing as the field passes its cut, and one under three pixels across is spread over the pixels round it
  (`gHaze`) instead of being drawn as a dot that is there or not by where a pixel's middle falls; the veil between
  cells has an edge as soft as the pixel. Flips a frame on the climb, straight down: 47 to 13 from 187 km, 21 to 12
  from 150.
- **The middle deck is cloudlets of its own size, not tiles or puddles.** Round the site it is the day's record, at
  the record's height (written into the shaders: `sheetsGlsl`): on 5 May 1961 an eighth of altocumulus at 3,600 m (Patrick, 10:00 EST, NOAA ISD),
  which is patches over 0.30 of the sky, their cloudlets covering some 0.45 of a patch; on 21 July two eighths at
  5,400 m, patches over 0.43 (day.ts: `deckPatches`, measured: `DECK_SHARE`). Near to, `deckAt` (weather.ts) draws domes on a scatter of points `DECK_CELL` (120 m)
  apart, 70 to 220 m across (an altocumulus element is 1 to 5 degrees wide from under it: 60 to 300 m at that height),
  each heaped of puffs and frayed at its rim, standing apart where a patch is thin and packed with dark creases where
  it is thick: so from 7 to 25 km up a patch is a fine grain. Every figure of its detail was made on a plane where the
  cloudlets are 250 m apart and is read through it (`xs`, `fs`). Its slope is handed to clouds.ts (`gDeckSlope`), which
  lights its top by how it faces the Sun, and what lies in the shadow of the cloudlet beside it toward the Sun is
  darker (`gDeckShade`, `gDeckSun`). How many stand is what makes them cover the patch's share (`DECK_PRESENCE`,
  measured: change a dome's breadth, the puffs or the opacity and measure again), and each stands by the share at its
  own middle. It had been cells that each filled their ground with pixel-soft lanes between (a Voronoi mosaic, white
  plates with ruled cracks: the owner's ice floes, tuned by flips a frame and never set beside a photograph), and then
  domes 250 m apart that ran together into puddles a kilometre across. It is judged against photographs from
  airliners (docs/sources.md) as well as by its flicker. What keeps a field of small cloudlets still as the eye climbs:
  two run together over five pixels' worth at the least and a rim is as soft as two (a crease or an edge of one pixel
  between cloudlets 2 pixels a frame apart is what flipped); how many stand is read for the pixel (`DECK_PRESENCE` has
  a row a pixel size), since the broader union covers more; and in the cel look, which cuts each sharp, the cloudlets
  go to their mean at three and a half times the pixel, and one under three pixels across is not drawn (`gDeckCel`:
  softening the cut flickered more, not less). In the cel look the union is three pixels' worth, not five (cut at half,
  so broad a union ran the cloudlets into one white sheet with the sea in round holes), each cloudlet shrinks away flat
  as it goes to the mean (faded, they were a band of ghosts), and the mean is not cut but added as light, the sky's at
  an eighth over each patch with an edge (`gDeckBody`, `gDeckMean`, `gDeckNear`): near, separate cloudlets with the sea
  between; far, the same sea a tone lighter. (In the flip count every hard edge of the cel look scores, along the sides of
  each cloudlet, as if the count's chase view swayed a little between its frames: fewer, larger shapes lower it.)
- **The deck's shadow is its patches', on everything, from above.** `deckShadeAt` (weather.ts) is the deck where the
  ray to the Sun crosses it, as its patches with the share of each that is cloud, not its cloudlets (whose shadows the
  Sun's disc blurs by 33 m): a soft grey dapple 3 km from each patch away from the Sun at liftoff (Sun at 50 degrees).
  The globe has it in `globeShade`, and every material that takes the haze in the shared chunk (air.ts), by
  `deckShadeUniform`: none while the eye is under 1 km, all of it from 3 km up, so it costs nothing on foot.
- **The field is organised by where it is.** The weather map's alpha is land (`pnpm globe:weather` bakes it):
  over land the streets are straight and strong; over the sea they are weak and bend, and clusters and arcs
  (`cumulusArcs`) are most of the pattern. All of it is in `cumulusBias`, which the bake, the far cover and the
  globe's shadows all read.
- **A marched cloud's light is taken over a pixel, not at a point of it.** Whatever the march reads to light a
  step (which way the skin faces, clouds.ts `FACING`) is read across the pixel's own breadth on the cloud: read over
  4.5 m from 20 km, where a pixel is 14 m, a far cloud's face was lit as by chance and 15 pixels a frame flipped on
  the climb. And every marched pixel says where its cloud is (its near side, and its far side if it never hides half
  of what is behind): thin cloud left at the empty pixel's 60 km was laid over nothing nearer than that, so from
  above every cloud was cut at half opacity in a hard stair that jumped as the eye moved (another 15).
- **Far cloud is its mean over the pixel's whole footprint.** Looked along, a pixel takes in kilometres of a layer
  one way and metres the other. The far cumulus and the sheets are read with the footprint's true length (never a
  clamped cosine): each size of their noise is left at its mean as that length passes it, and the spread of what was
  left out softens the cut (`cloudNoiseKept`, deckAt's `left`), so the cover is kept and a row far aslant is a soft
  band. Point-sampled, each row was another place: dashes along the horizon from the pad, and 1,700 pixels a frame
  flipping in the chase view at T+20 (now 6 over the scene's own). Measure the chase view with the clouds on.
- **Far cloud is not hidden by the depth buffer's steps.** Hundreds of kilometres off one step is
  kilometres: far cloud is hidden only by what is nearer by a quarter of the way (`hidden`).
- **The air is one model.** `atmosphere.ts` makes two tables once (transmittance, multiple scattering) and
  `atmScatter` walks a ray with them: the ball, the far clouds (`throughAir`) and the globe's sunlight
  (`atmSunAt`) all use it. From the ground the sky is still daysky.ts's and the haze the scene's fog; both
  go out, and the air comes in, with `airAbove`, so nothing steps on the way up. The Sun's light above the
  air is derived from the scene's own at 50 degrees, so sunlit ground, cloud and sky keep their true ratios.
- **The air is drawn whatever the near plane.** The ball is a mesh round the eye, and `fitDepth` moves the near
  plane out to whatever is nearest: looking straight down from 150 km with nothing near, the plane stood at 100 km,
  the ball was cut away whole and the sea had no air over it (every straight-down picture before this was taken so).
  The ball's vertices are pushed out past the near plane's corners where that is further than the ball (globe.ts);
  it stays nearer than the sea because the near plane is kept inside nine tenths of the eye's height. A vehicle
  further off than the ball has the whole air's light over it: a known flaw, small. **What the ball draws is the
  eye's ray, not the way from the ball's middle** (`vDir`): the ball was placed as the frame began, before the rig
  moved the eye, so in flight it was a frame's travel off-centre (30 m in 8 km), and the limb stood 4 px out and
  jumped 4 more on every long frame (the owner's "constantly changing, flickery" horizon; chase T+150 with uneven
  frames: the row profile's frame-to-frame jerk 0.36 to 0.024, the same as with even frames). The camera's shake
  still moves the eye after it is placed. So nothing it draws may depend on where it sits, how big it is or where
  the near plane is (`pnpm test:frozen`: "ball", the ball moved and resized; "near", the near plane at half).
- **The setting is told the instant and where the eye is after the camera has moved** (`Stage.attend`, just before
  `fitDepth`), never as the frame begins: the sky, haze and stars for the eye's height (`Setting.at`), what is made or
  chosen round the eye (the globe's mesh and the air's ball, the land's cells, each plant's form and how far through
  its fade by `uEye`, flora.ts) and the rooms whose lamps are lit were otherwise a frame's travel behind it. A fast
  wheel zoom from the pad at liftoff, each frame against the same pose drawn at rest: mean difference 0.29 levels
  (worst frame 0.69, 0.7 % of 4x4 cells brighter by 8 levels or more, the plants' fading bands and the haze) to 0.14
  (0.35, none). `pnpm test:frozen`, "step": a pose drawn from 8 % further and put back must be the picture on its
  first frame (it was 117,000 pixels out, by up to 182 levels).
- **The Sun's glint is Cox and Munk's.** From above the air the sea's highlight is not the material's lobe (GGX,
  whose tail put a pale glare over the whole sea) but a Gaussian spread of wave slopes for the record's wind
  (`globeGlint`): a bounded patch round the mirror point, at its heart a quarter as bright as a white surface in the same Sun. From
  the ground the Cape's water keeps the look it was tuned to; the two are mixed by `uGlobeAbove`. The site's own
  water (land.ts) takes the same glint by the same height through `Beyond` (`beyondGlint`, `beyondGlinting`), and its
  waves and polish give way to the globe's sea at that rate, so the highlight is one patch across the edge of the
  site's ground at every height: change the glint in `GLINT` (globe.ts) and both follow.
- **One coast from every height.** The globe's region map (tools/globe-region.mjs, with the works built since the
  site's day undone: `region.later`, along a line or, for a sea that has shrunk, over a `ring` from a source of the
  time; a region with no coastline in it is land, and its `rivers` are drawn as channels along their middle lines) is the coast seen from above; the site's own ground has its own, finer, from the
  ground. Where the ground is handed over to the globe (by height, globe.ts `LIFT`, 3 to 20 km, its tones
  going on to the map's by 40 km, `LIFT_TONE`; and across the last of its square) the shore is one line moved from the one to the other: the land gives
  its own distance to its shore (`LandSpec.shore`) and the globe colours with the two mixed (`beyondShore`,
  `globeShoreOther`), within 300 m. Never two shores seen through each other: a site's water must be given as that
  distance, and what the site draws and the globe has must be the same things (the port's harbour is in both).
- **MODIS's true colour is not what an eye sees.** Its corrected reflectance has Rayleigh's scattering taken out,
  so its sea is navy and its land dark green; a photograph from orbit, and ours, has the air's blue over both (the
  sea straight down sends back about 3, 7 and 16 per cent of red, green and blue, most of it the air's). Compare
  cloud shapes and sizes with MODIS; compare colours with astronauts' photographs.
- **Nothing costs on the ground that is not seen there.** The ball and the globe are not drawn until the eye
  can see past the site; the sheets and far cumulus are worked out only for pixels that meet their shells.

## The front page's picture

The Earth from out by the Moon (`src/front/`) is a scene of its own, on its own canvas and renderer, and not a
`Stage`: it has no models, no looks, no picking, no post-processing. What it keeps of this file's rules, in its own
terms:

- **Drawn from the eye.** Positions are doubles in the Moon's frame (view.ts). The camera stays at the origin and
  only turns; the Earth is placed by where it is from the eye and the Moon's ground by the eye's place over it, so a
  float never holds 370,000 km and a metre together. The Earth's own arithmetic (where a pixel's ray meets its air
  and its sea) is done in the Earth's frame, where every number is a few thousand kilometres.
- **No fixed near plane.** The Moon's ground is the only thing with depth: the near plane is half the camera's
  height over the highest ground, the far one past the Earth. The Earth is drawn without depth, before the Moon,
  which is in front of it wherever both are; the stars before both, on a camera of their own (heavens.ts).
- **Drawn only when the picture changes.** Every frame while the camera is on its way (five minutes); settled, when
  the Earth has turned a quarter of a drawn pixel at its middle (two to five frames a second at a minute of the
  world a second), when a map is coming in, when the window changes or the Earth is being eased to another place in the
  picture. A still picture (less motion) is drawn once.
- **A lower level of detail is a rebuild.** The Earth is the globe's own maps baked small, never the globe's 300 MiB
  of them (`pnpm front:earth`); the Moon's relief is baked at three sizes and each is faded in over the coarser
  from its edge (`pnpm front:moon`). Both bakes follow from view.ts's figures (the instant, the limb the camera
  looks across) and tests/front.test.mjs fails until they are run again after those change.
- **A change of level fades.** A map that arrives comes up over 1.2 s; the canvas fades up when the first whole
  picture is drawn and out as a flight's fades in over it; the Moon's cast shadows, worked out for the Sun as it
  stood at the instant, are let go as the Sun moves on (gone by 8 degrees, sixteen hours of the world).
- **One exposure for both worlds**, as a photograph has: the Sun's light is the figure the globe is lit by above the
  air, the Moon's ground is scaled to the Moon's albedo and dimmed by its phase, and the exposure is set by the
  cloud. So the Moon is asphalt beside the Earth, as it is. Nothing is made larger or brighter to fill the frame:
  the lens is a stated one (500 mm on 70 mm film, 6.3 degrees) and the Earth is a third of the frame across.
- **What is simplified** is listed in earth.ts and moon.ts: the cloud is a reanalysis's and has no detail under a
  quarter of a degree; the night side has no lights; nothing on the Moon is finer than 481 m, and only the finest
  map casts shadows; the mid part of the path (10,000 to 20,000 km out) is drawn from the 3.7 km map and is soft.
- **A lost context there is not the page's end**: the picture is taken away and the list of flights stays, over
  black. No word is put up (lost.ts's is a stage's).

What it costs (`pnpm test:front` says so each run; measured when written on an M-series desk machine, 1280 x 800 at
1): a frame 1.1 to 1.3 ms from one end of the path to the other, and 2.8 to 3.0 with the machine busy with other
work; 1.9 million triangles in two draw calls (0.45 million on the lighter tier). What it holds: "Memory", above.
`pnpm bench` does not measure it (its harness turns a `Stage` over by hand). It has not been run on a real phone.

## Texture units

A fragment shader reads sixteen textures at once and no more (all WebGL 2 promises: `MAX_TEXTURE_IMAGE_UNITS`), and
one over fails to compile, on some machines only. The budget: **a lit material keeps three units free for lights**
(`UNITS_FREE` in `viewer/units.ts`), counted with the Sun's three shadow maps (near, far, and the sky's:
shadows.ts), the reflections and three's own table already in. Each shadow-casting point or spot light a material
is under takes one. Today the site's ground reads 13 and the globe 11; a model's materials far fewer.

- A development build warns in the console, a few seconds after the scene is up, of any program over the budget
  (`checkUnits`); `samplerCounts(renderer)` lists every program's samplers.
- One-channel maps are packed, not given a unit each (`viewer/pack.ts`): maps of a size as the channels of one cube
  (`packCube`: the globe's land, ice and relief are red, green and blue of `uGlobeMaps`), flat maps as the layers of
  one array texture, each in its layer's corner (`packLayer`: the region's near, wide and relief maps are layers 0 to
  2 of `uGlobeFlat`). They are copied in on the GPU texel for texel as they arrive, so what is read is the file's own
  bytes; a map that has not arrived reads 0. A new one-channel map goes into a spare channel or layer, not a new sampler.
- The output pass reads 13 (the clouds' composite 12, the glow 1) and is not lit: it is outside the budget, but is not to grow past 16.

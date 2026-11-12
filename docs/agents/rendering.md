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
and is offered to be looked through. What is under a `within` node is lit as indoors (simulator.md).

## No flicker

Two faces in the same place flicker: the depth buffer cannot tell them apart and picks a
different one per pixel per frame. Three things stop it, and all three must stay true.

- **`srlib.check_clearance` runs on every model build and fails it** if two parallel,
  same-facing faces are under 1 mm apart, printing the two meshes and where. Fix the geometry:
  sink a fitting through the skin (so its hidden face is well inside) or stand it off by more
  than a millimetre. Do not pass `--allow-clashes`. Faces that cross at an angle are fine, and so
  are single-sided faces back to back; double-sided materials are held to the stricter rule, so
  use `double_sided=True` only where both sides are really seen.
- **`Stage.fitDepth` moves the near plane out every frame** so depth resolution stays under a
  third of a millimetre at any distance. Do not give the camera a fixed near plane.
- **Nothing lies close above the terrain.** Depth interpolated across a triangle kilometres long
  is coarse: concrete 6 cm above such terrain flickered. So the terrain is finely divided (`land.ts`:
  half-metre cells near the eye, never more than 64 m), it sits 12 cm below the pad's surface (`GROUND_Y`, and `GROUND` in
  the site's builders: the pads and roads were at grade), and anything standing on the ground goes down past that (`FOOTING`
  in `site.py`). Change the two together and rebuild the pad and the place.

- **Far off, parallel faces need centimetres, not a millimetre.** Seen from 150 m while the
  camera is close to something else, faces under about 5 cm apart fight. Scenery that is looked at
  from across the site (another pad's slab and its joints, a far track's rails) keeps that much
  between parallel faces, or sinks one through the other.

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
To measure a change to any of this: `Staged.forced` and `Scenery.forced` draw a level whatever
the distance, so the same view can be drawn at two levels and compared.

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
- So **anything that changes how the scene is drawn keeps a switch** for as long as it is being
  judged: `?plain` in the address draws the old way, and each has its own flag on the stage
  (`sr.stage.glazing.enabled`).

What has been found, so it is not found again:

- **A clear two-sided material costs a shader lookup twice a draw.** Three draws a transparent
  `DoubleSide` mesh as back faces then front faces by changing the one material's `side` and
  marking it changed, and a changed material has its whole description rebuilt to find its
  program: with 120 panes on show, a tenth to a sixth of the pad's frame. `viewer/panes.ts` gives
  each pane a twin instead (back faces, drawn straight before it by `paneOrder`), with materials
  that never change: the same two draws, the same shaders, the same pixels. Anything new that is
  clear and two-sided and stands in numbers goes through `Panes.add`; a material that will be
  changed after it is made (a shell's, which the cutaway opens) is left to three.
- The pad's frame at 1440x900 is bound by the CPU, not the GPU: three's work per draw call.

## The Earth from height

What is seen from above the air is meant to stand beside photographs from orbit (the owner's word: clouds,
air and flight effects real, the ground near the eye designed). What keeps it so:

- **Data is baked, cited and dated.** Relief and the sea's bed are ETOPO 2022, the land's colours Blue Marble
  (May 2004), on the globe's cube and, finer, on a plane over the site's region (`pnpm globe:surface`; needs
  GDAL; downloads stay outside the repo). The colours are 2004's land, not 1961's: say so where it matters.
  A region names its `banks` (pale sand under clear water) in tools/globe-surface.mjs: the sea's colour is
  worked from depth (`globeWater`), bright only there.
- **The weather is estimated and says so.** `viewer/weather.ts` is a plausible fair morning built from the
  land map, the relief and the wind, baked by `pnpm globe:weather`; nothing in it is the day's analysed
  weather. The record's cover replaces it within 12 km of the site (`coverNear`), so the documented clouds
  are untouched. Bake it again after changing weather.ts, the land map or the relief.
- **One field, three readers.** The cumulus's noise, cut where the weather says (`cumulusBias`), is read by
  the march's bake, the far cover (`farCumulus`) and the globe's shadows (`globeShade`): change one, change
  all. The far cover is slices of the same heap the volume marches, then the field averaged along a pixel's
  length, then cover alone: each fades into the next by the pixel's footprint, so nothing ends in a circle
  and nothing under a pixel is drawn.
- **Far cloud is not hidden by the depth buffer's steps.** Hundreds of kilometres off one step is
  kilometres: far cloud is hidden only by what is nearer by a quarter of the way (`hidden`).
- **The air is one model.** `atmosphere.ts` makes two tables once (transmittance, multiple scattering) and
  `atmScatter` walks a ray with them: the ball, the far clouds (`throughAir`) and the globe's sunlight
  (`atmSunAt`) all use it. From the ground the sky is still daysky.ts's and the haze the scene's fog; both
  go out, and the air comes in, with `airAbove`, so nothing steps on the way up. The Sun's light above the
  air is derived from the scene's own at 50 degrees, so sunlit ground, cloud and sky keep their true ratios.
- **Nothing costs on the ground that is not seen there.** The ball and the globe are not drawn until the eye
  can see past the site; the sheets and far cumulus are worked out only for pixels that meet their shells.

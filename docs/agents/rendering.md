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
0.6 and 0.3. The viewer draws whichever suits the model's size on screen (`viewer/lod.ts`): the
thresholds sit where what the coarser level leaves out is under a pixel, so the change cannot be
seen and nothing is cross-faded. A model that is cut open is always drawn in full. The place round the pad (`Flight.surroundings`)
is chosen piece by piece (`Scenery` in lod.ts): each top-level node, a building or the track, at
the level its own size on screen calls for, so the building beside the walker is always the finest;
level 0 is the one picked, walked on, lit and worked, and anything driven is always drawn from it.
When the simulator needs distant LODs, add them to `build-model.mjs` as extra outputs per
script; do not hand-edit geometry for them.

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

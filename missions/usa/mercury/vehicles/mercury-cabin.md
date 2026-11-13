# The Mercury cabin

What [mercury_cabin.py](mercury_cabin.py) builds inside a Mercury spacecraft's pressure vessel: the painted lining
with its frames and rivet lines, each porthole's frame, retainer, inner pane and the sleeve through the wall, the
couch, the main instrument panel and the consoles, the periscope, the pilot's two controllers, cameras, stowage, and
the two cabin floodlights with their switch. A flight's `model/vehicle.py` gives it
the pressure vessel, the seated pilot's key points (crew/mark_iv_suit.py), the portholes and the hatch opening.

**The fit is a capsule's, not the type's.** This module holds spacecraft No. 7's (Freedom 7), whose panel is
the Postlaunch Report's Figure 3.1-2. Spacecraft No. 11's (Liberty Bell 7) is [mercury_cabin_11.py](mercury_cabin_11.py): its own panel,
consoles, window frame and hatch, calling this module for the lining, the couch, the restraints, the controllers, the
stowage, the periscope, the attitude indicator, the clock and the instruments' faces. Its record is
[that flight's spacecraft.md, "Cabin"](../flights/mr-4-liberty-bell-7/spacecraft.md). Every dimension, how sure it is and what is left out are in that flight's record:
[spacecraft.md, "Cabin"](../flights/mr-3-freedom-7/spacecraft.md). A later capsule (No. 11's window, the orbital
panel with its Earth-path indicator and time-to-retrograde clock) adds its own tables here and its own section there;
it does not edit No. 7's.

Spacecraft No. 13's (Friendship 7) is [mercury_cabin_13.py](mercury_cabin_13.py): No. 11's fit whole, since the report
of the flight prints No. 11's panel as its own, with the hatch's seventieth bolt in and this flight's words on what
is pointed at. Its record is [that flight's spacecraft.md, "Cabin"](../flights/ma-6-friendship-7/spacecraft.md).

## What the viewer is promised

| Node | What it is | Extras |
| --- | --- | --- |
| `Seat_Pilot` | an empty at the seated figure's eyes (the suit's own `eyes` key point, head bowed 30°: 21.1 in from the middle of the panel, 1.9° off square to it; the build prints both): in the file its +Z looks at the panel and its +Y is the top of his head | |
| `Gauge_<Name>` | a needle, bar or counter wheel, its origin on its pivot | `turn` (value, radians pairs about the face's normal, anticlockwise positive), or `slide` (value, metres pairs along its own X), or `drum` (figures on the wheel) with `place`; `rest` the value its face was built pointing at; `wrap` where the value goes round; `reach` |
| `Tele_<Name>` | a lamp's lens, with a material of its own so it is lit by itself | `reach` |
| `Ctl_<Name>` | a control: a pull ring, a push button, a grip, a toggle's lever | `pull` or `press`, metres along its own axis; or `throw`, a turn about its own X for each position a lever has, radians from where it was built (the first is 0: `mercury_cabin.thrown`); `reach` |
| `Lamp_<Side>` | a floodlight's tube, with a material of its own so it is put out by itself | |
| `Periscope_Screen` | the display's glass, which the viewer draws the outside onto | `screen_radius` |

`reach` is how near a pointer must come to mean the thing, metres. Faces, legends and lettering are drawn by the
script into three images (`cabin-main-panel`, `cabin-consoles`, `cabin-faces`), with the same tables the metal is
built from, so a needle's scale and the marks under it are one list.

Everything here is built only at detail 0.75 and above (`srlib.interior()`): the coarser levels have no cabin.

## One model, not two

The cabin seen from the couch and the cabin seen in the cutaway are the same meshes. A second, finer cabin shown only on
board was weighed (November 2026) and not built: the inside is already its own set of meshes, built at one level of
detail only and drawn only on board, cut open or from within 30 m (`viewer/cabin.ts`: `seen`), so nothing is saved by a
second file; two cabins would be two sets of needles, lamps and controls to keep in step, two bakes of shade and a
change from one to the other that must not be a cut; and from the couch is where a phone has least memory to spare
(473 of 500 MiB: rendering.md, "Memory"). What was wrong from the couch was wrong, not coarse: a port's ring wound inside
out and turned about the wrong line, shade asked at a vertex under a clip, plain boxes. Those are put right here, for
both views. If the cabin outgrows the cutaway on a phone, the place to split is `srlib.interior()` (a level above it
for what is seen only from the seat), not a second script.

## Ports, shade and lights: what is shared

- **A round port is one assembly on one line** (`port_inside`, and the flight's `build_ports`): the normal to the outer
  skin through the middle of the hole in it. Frame, retainer, inner pane, sleeve, outer pane, its ring and the plate
  outside are all turned about it.
- **`chamfered`** is the block every case, clip, dog and fitting is made of: a box with a chamfer along every edge.
  Nothing in a cabin is `MeshBuilder.box`.
- **`shade`** bakes the cabin's shadow at its vertices twice over, into the one colour attribute `Shade`: red, green
  and blue with the lamps on, alpha with them off (how open a point is, and how much of the ports and the periscope's
  screen it sees). The viewer mixes the two by the lights' switch. Broad surfaces (`BROAD`) are asked from every part of
  a lamp, from 1.5 in off the surface, and evened between neighbours; what is transparent is not shaded.
- **`floodlight`** is a four-watt fluorescent fitting; `thrown` a toggle the viewer throws. A capsule says where its
  lamps hang, which is the left hand one, and what its switch's positions are.

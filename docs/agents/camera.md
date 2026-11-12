# The camera

Part of the agent notes: start at [AGENTS.md](../../AGENTS.md).

`src/viewer/camera/` is the camera: `Stage` owns one `Cameras` (`stage.cam`) and asks it for
everything; nothing else moves the view when nobody is being walked as. It knows no flight: what
there is to turn about, sit in and follow comes through `Scene` (the ground's height, the plumb
line, what is solid under a pointer, the flown vehicle as a `Craft`), which `Stage.world()` answers.

A **rig** is one way of holding the camera (`rig.ts`: `Rig`): it keeps its own state, is stepped by
time, is told what the hands did, and says where the camera is. One is in charge:

| rig | what it is | hands |
| --- | --- | --- |
| `orbit` | turns about a pivot: a model, part, place or point | drag turns, right- or shift-drag and W A S D E Q slide the pivot over the ground, wheel and R F zoom, arrows turn and tilt, double-click turns about what was clicked |
| `free` | no subject: flies where it is pointed | W A S D E Q fly, drag and arrows look, wheel goes toward what the pointer is on by proportion, or back |
| `chase` | orbit with the flown vehicle for its pivot, carried with it, level with the horizon | as orbit, without sliding |
| `locked` | the chase view measured in the vehicle's own frame: it holds still and the world turns | the same |
| `onboard` | first person from a seat in the vehicle (`ModelDef.seats[0]`: `node`, whose +Z looks ahead and +Y is overhead, and `eye` in its frame) | drag and arrows turn the head within limits, wheel changes the lens |
| `pad` | stands at one place on the ground and follows the vehicle, closing its lens as it goes (to a quarter of a degree) | wheel asks for a tighter or wider frame, drag puts the vehicle off the middle |

C goes to the next of the rigs there are as things stand (`Cameras.available`): on the pad, orbit
and free; with a flight in the air, chase, locked, on board (if the vehicle has a seat), pad and
free; flying it by hand, those without free. Each change says the view's name across the screen
(`RIGS`, `ui.showCamera`). When the vehicle leaves the pad while its section is being looked at the
chase takes over by itself, and gives the view back to orbit when it is on the pad again; with a
flight in the air and the camera elsewhere, "Find the vehicle" (and C) goes to it. 0 is the reset:
the section's first view in orbit and free, the vehicle centred in the others. While the vehicle is
flown by hand W A S D Q E are its keys and the camera has the arrows, R, F, 0 and C.

Coming to the chase from near the vehicle, the view is taken up as it stands; from far off it goes
to where the whole vehicle is seen, from the side the last view saw its subject from; back from on
board or the pad camera it is as it was last left (`Rig.enter`'s `resume`). The pad camera stands
where the orbiting or free view was, set down on the ground at tripod height, if that was within
reach of the place; otherwise where it last stood, or to one side of the place (`Cameras.tripod`).
The seat the camera sits in is the flight's data: Freedom 7's is the model's own `Seat_Pilot` node, at the seated
figure's eyes, looking at the panel (a model without one may name a `standIn`, and says so). On board the head turns
within the seat's own limits (`CabinDef.head`, set on `OnboardRig.limits`), and can be told to look at something in
the cabin: `OnboardRig.lookAt(point, lens)` turns to it and holds it, in the seat's frame, until it is let go
(`lookAt(null)` goes back to where the head was) or the hands turn the head. `Stage.lookOut` uses it for a window's
pane (seen from the eye: the scene itself beyond the glass) and for the periscope's screen (brought to fill the view;
asked again, its power changes). A click on board selects nothing and flies nowhere: it works a control, looks out,
or lets go (`Stage.onCabin`); Escape lets go of a look before it is the flight deck's. Hover names only what is in the
cabin, and what is not drawn (the pilot's own helmet) is not picked.

What is promised, in every rig (`tests/camera.test.mjs` for the arithmetic and the rigs; the
browser's check below for the page):

- **Zooming out pulls straight back.** It never moves the pivot and never turns the view.
- **Zooming in goes toward the pointer only onto something near and solid** (`anchorOk`): a thing
  (a model, a building of the place round it) no further than two and a half times the pivot's
  distance, or bare ground beside the pivot (within a third of its distance). Never the sky, a
  field away, the far ground or the globe: zooming out and in again with the pointer left anywhere
  comes back to the subject. Then the point under the pointer stays under it and the pivot goes
  toward it (`zoomBy`); the pivot is shown for a moment whenever it has been moved
  (`Cameras.showPivot`). While the view drifts round a subject the zoom is about the subject.
  A double click is the explicit way to turn about any point, ground included.
- **A view the hands have set is only moved by an explicit act**: choosing something, a view
  button, 0, C. `Stage.following` is what was last framed and is let go the moment the hands turn,
  slide or zoom (`Told.taken`); what happens by itself (the slider, the clock, a panel opening, a
  resize) frames again only a view that is still being followed, and keeps its direction. Under a
  view the hands have set, the subject it was taken from is still watched (`Stage.watched`): if it
  was in the frame and would leave it, the view moves sideways by the least that keeps it in
  (`nudgeIntoFrame`), with the distance and direction untouched. A stage
  leaving the vehicle eases the chase pivot onto what is left and keeps a distance set by hand.
- **Zoom is by proportion** (nepers): a notch of the wheel is a sixth, at 5 cm from a rivet (the
  eye stops `NEAREST` short of a surface) and at 400 km. One wheel event counts for at most 150
  pixels and the zoom runs at a set pace with a short lead (`Zoom`), so a trackpad's flick, which
  sends events for a second after the fingers leave, is a few times and not a few hundred. A
  trackpad's pinch is a wheel with `ctrlKey` and zooms more finely.
- **Motion is by time, not by frame**: easing and coasting are closed forms (`approach`, `Coast`);
  a journey (`goTo`) is an arc eased at both ends, and any touch ends it where it is. A change of
  rig is a handover: the new rig is in charge from the first frame and what is left of the old
  view fades on top of it (`blendPose`), so it answers the hands at once and nothing jumps. With
  Motion off (`Cameras.calm`) nothing eases or coasts.
- **The eye never goes under the ground or the sea** (`World.clearance`: the site's terrain as a
  height, the globe beyond it): it comes up round the pivot at the same distance, never in.
- **The pivot is in the middle of the clear part of the frame**, by tipping the camera where it
  stands (`aimBelow`), so the controls never cover what is being turned about. `Stage.setInset`
  takes what the controls cover at the bottom and, as a second figure, what is covered at the top;
  today the page reports only the bottom, so on a phone the title and the clock still lie over the
  top of a tall subject.

`Stage.view`, `focus`, `visit`, `lookIn`, `section` and `swing` say what to frame and
`Cameras.frame` does it: flown to in orbit and free; in flight, a subject on the vehicle is the
chase view's (nothing else can keep up with it). `pose` and `shot` put the orbiting rig somewhere
exact for tests and screenshots (looking straight at the pivot, and still, with nothing left easing).
What is framed is where the clock has it at that moment (`view` and `focus` call `lift` first), so a
view asked for in the same breath as the clock is put back frames the vehicle on its pad, not where
it was last drawn. The near plane is not
the camera's: `Stage.fitDepth` fits it every frame to `cam.pivot`. A camera shake is applied for
the draw only (`Stage.shaker`), after the rig has said where the camera is.

To check a change: `node --test tests/camera.test.mjs`, then `pnpm test:camera` (`tools/camera-test.mjs`):
real wheel, drag, key and touch events in a browser, first the sequences that used to go wrong, then a
seeded soak with the clock running a flight and C stepping through the rigs, asserting on every frame
that nothing is not a number, the eye is above the ground, the pivot has not moved without cause, a
zoom out has moved and turned nothing, and the subject is where it should be. The idle show does not
start while a flight is being watched or flown, another rig than orbit is in charge, or the mouse
is moving (`demo.busy` in main.ts): it must never take a view that is being used.

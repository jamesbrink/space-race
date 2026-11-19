# The camera

Part of the agent notes: start at [AGENTS.md](../../AGENTS.md).

`src/viewer/camera/` is the camera: `Stage` owns one `Cameras` (`stage.cam`) and asks it for
everything; nothing else moves the view, on foot or off. It knows no flight: what
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
| `onboard` | first person from a seat in the vehicle (`ModelDef.seats[0]`: `node`, whose +Z looks ahead and +Y is overhead, and `eye` in its frame) | drag and arrows turn the head within limits, wheel changes the lens, 1 2 3 (and the lookouts' buttons) lean to a port or the periscope and back |
| `pad` | stands at one place on the ground and follows the vehicle, closing its lens as it goes (to a quarter of a degree) | wheel asks for a tighter or wider frame, drag puts the vehicle off the middle |
| `map` | the orbiting view pulled out to where the whole path is seen (`map.ts`): it turns about the vehicle or the Earth's centre, its angles held in the frame that does not turn, so the Earth goes round under the path | drag turns, wheel and R F zoom about what it turns about, arrows turn and tilt, C changes what it turns about, 0 frames everything again |
| `eyes`, `shoulder` | on foot (`foot.ts`): the walker's view, through the figure's eyes or over its shoulder, with the walker providing the eye pose (stride, lean, couch: walking.md) and the shoulder rig extending its boom until it meets an obstruction; `Cameras.foot` as a walk starts or C changes it, `unfoot` hands back to the rig the walk was taken from; while something is worked by hand they watch it (`Cameras.watch`, `FootRig.watch`: the head turned to it within a neck's reach, or the camera stepped aside and back off the figure; walking.md) until it is let go or the hands move the view | the walker's own (walking.md); C offers neither |

C goes to the next of the rigs there are as things stand (`Cameras.available`): on the pad, orbit
and free; with a flight in the air, chase, locked, on board (if the vehicle has a seat), pad and
free; flying it by hand, those without free. The pad camera is there only while it can see the vehicle
(`TrackRig.sees`: some of it above the level where the camera stands, within 1000 km): down the range
under a parachute the vehicle is below its horizon, and a pad camera in charge then hands over to the chase. Each change says the view's name across the screen
(`RIGS`, `ui.showCamera`). When the vehicle leaves the pad while its section is being looked at the
chase takes over by itself, and gives the view back to orbit when it is on the pad again; with a
flight in the air and the camera elsewhere, "Find the vehicle" (and C) goes to it. 0 is the reset:
the section's first view in orbit and free, the vehicle centred in the others. While the vehicle is
flown by hand W A S D Q E are its keys and the camera has the arrows, R, F, 0 and C.

**The map is M's, not C's** (`Cameras.mapped`; `available` never lists it). On the flight deck M (its switch beside
the path's by the navball, and among the deck's keys) puts the `map` rig in charge from whichever rig has the camera,
and M again gives the view back to that rig as it was left (`mapFrom`, `Rig.enter`'s `resume`). There is a map only
where there is something to map (`World.map`, a `MapOf`: the body, how far it has turned, and how far what is shown of
the flight reaches from its centre and from the vehicle; the stage is given it by whoever draws the path,
`Stage.mapOf`), and nobody on foot has one. Taken up with nobody having set it, it takes in all that is shown
(`mapFit`: in the height of the frame the controls leave clear, and in its width where the frame is narrower than it
is tall, a phone held upright) from over the vehicle, to the side the last view saw it from, so the vehicle is on the
near side of the Earth. What it turns about is chosen for it (`focusOf`: the vehicle while everything shown lies within four tenths of
the Earth's radius of it, a lob or a fall; the Earth's centre once anything is over six tenths, an orbit; between, as
it was), and that and the distance follow the path as it grows, until the hands choose: a zoom sets the distance, and C
there (`Cameras.refocus`: in the map C is the map's own, `map.focus`) the other thing to turn about, from as far off as
it was. 0 gives both back. A change of what it turns about slides the pivot there over `SLIDE` seconds, never cuts.

Its angles are measured in the frame that does not turn (`mapFrame`: the Earth's axis for its vertical, turned back by
as much as the Earth has turned), because the scene is fixed to the Earth: a view left alone stands still among the
stars and the Earth turns under the orbit, as it does. Its zoom is always about what it turns about (at that distance
nothing under the pointer is near and solid), so zooming out pulls straight back and in again comes back, as
everywhere. The eye stays `CLEAR` over the Earth's radius by coming up round the pivot at the same distance
(`MapRig.limit`); only where no place at that distance clears, the pivot on its way between the Earth's centre and the
vehicle with the eye close in, is it further off for as long as that lasts. What is drawn in the map is the path's
business (rendering.md, "The predicted path": on the map), and from that far the day's cloud is let go (rendering.md,
"The Earth from height").

Coming to the chase from near the vehicle, the view is taken up as it stands if its distance had
been set by hand; from the place's own view at a distance nobody chose (`Rig.enter`'s `unset`), or
from far off, it goes to where the whole vehicle is seen, from the side the last view saw its
subject from, turned about the plumb line by the least that leaves nothing of the place between the
eye and the vehicle (`World.blocked`, the solids the near plane asks: a structure rolled back on
its rails stands in the way from some sides). "The whole vehicle" is half the frame's height and never more than 85 per cent of
what the controls leave clear, top and bottom (`Camera.clear`, from `Framing.setInset`), and a chase
view nobody has set is framed again when that changes (the flight deck opening, a phone turned); back from on
board or the pad camera it is as it was last left (`Rig.enter`'s `resume`). The pad camera stands
where the orbiting or free view was, set down on the ground at tripod height, if that was within
reach of the place; otherwise where it last stood, or to one side of the place (`Cameras.tripod`).
In the gallery the vehicle is an exhibit (`Craft.exhibit`): it never flies, and C goes between orbit and on board
(one press per seat, `Cameras.reseat`); getting up (`Cameras.unseat`) gives the view back to the rig it was taken from as
that rig was left, not taken up from inside the cabin (gallery.md, "A seat"). The seat the camera sits in is the flight's data: Freedom 7's is the model's own `Seat_Pilot` node, at the seated
figure's eyes, looking at the panel (a model without one may name a `standIn`, and says so).

On board the head is a strapped-in person's (`camera/head.ts`, `Head`; the walker in a couch boarded on foot carries
the same one, walking.md): it turns aside about the neck, the eyes going round with as much of the turn as is the
head's (`HEAD_TURN`) and swivelling the rest, and a look up or down moves only the eyes. It turns within the seat's
own limits (`CabinDef.head`, set on `OnboardRig.limits`), less far down the further it is turned aside and the wider
the lens (`clampHead`): Freedom 7's are measured in the model so that no part of a 62 degree picture is nearer the
eyes than 12 cm, which is where the suit's collar and the couch's headrest are, which a helmet would hide. Nothing of
the pilot is then seen from inside or cut, and the near plane is not involved.

What can be looked out of is the cabin's data (`lookouts.ts`: each of `CabinDef.windows`, by its `name`, then the
periscope), and each is one explicit act: its digit, its button in the lookouts bar (`Ui.setLookouts`, right edge),
or a click on its pane or the screen (`CabinView.lookOut`). The pilot leans (`CabinView.leanTo`, `Head.leanIn`): the head
turns to it, the eyes go to it along a curve that comes in down the line it is looked through (`leanPath`), and the
lens closes on it last (`leanPhases`), eased by time, never a cut; the same act or Escape (or 0, which also looks
ahead) brings him back the same way. A port is leant to square to its pane where the model leaves room for a face
there, else as square as it allows, else along the line from the eyes to it as far as there is room
(`CabinView.approach` in stage/cabinview.ts, asked of the model's own meshes: what stands in a cabin is the cabin's, so the data cannot say),
and what is seen is the scene itself from that place. The periscope is leant to until its screen fills the picture;
clicked again, its power changes. While leaning the hands turn the look about what is leant to, within a glance
(`GLANCE`), and never end it. A click on board selects nothing and flies nowhere (a right click offers nothing): it
works a control, leans, or comes back (`Stage.onCabin`); Escape comes back from a lean before it is the flight deck's.
Hover names only what is in the cabin, a window by the name it is leant to by, and what is not drawn (the pilot's own
helmet) is not picked.

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
  button, 0, C. `Framing.following` (stage/framing.ts) is what was last framed and is let go the moment the hands turn,
  slide or zoom (`Told.taken`); what happens by itself (the slider, the clock, a panel opening, a
  resize) frames again only a view that is still being followed, and keeps its direction. Under a
  view the hands have set, the subject it was taken from is still watched (`Framing.watched`): if it
  was in the frame and would leave it, the view moves sideways by the least that keeps it in
  (`nudgeIntoFrame`), with the distance and direction untouched. A stage
  leaving the vehicle eases the chase pivot onto what is left and keeps a distance set by hand; a distance nobody set
  comes in with the pivot and never ahead of it, so what is left never goes further from the middle of the frame than
  it was as the stage left.
- **The view can go with a stage that has left.** A right click on something the vehicle has let go offers to follow
  it (`FlightShow.followShed`, by the ascent's drop): `Scene.craft()` then gives that piece (its nodes' bounds in the frame
  it is carried in, measured once), the chase view takes it up afresh (`Cameras.retake`: the whole of it, from the side
  it is seen from) and it, the locked view and the pad camera go with it; on board is not offered. The flight goes on
  being flown. 0 (`told.back`), a rig that is not about a vehicle, or the clock going back before the piece left, gives
  the view back to the vehicle, and a note says which it is with.
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
  height, the globe beyond it): it comes up round the pivot at the same distance, never in. The
  ground is the paving where there is one: the models' zero at a pad laid at grade, and under it by
  the site's `grade` at a pad whose zero is a deck on a stand (Complex 14), so the eye can go down
  to the foot of the stand.
- **The pivot is in the middle of the clear part of the frame**, by tipping the camera where it
  stands (`aimBelow`), so the controls never cover what is being turned about. `Framing.setInset`
  takes what the controls cover at the bottom and, as a second figure, what is covered at the top;
  today the page reports only the bottom, so on a phone the title and the clock still lie over the
  top of a tall subject.

`Framing.view` (`stage.framing`), `focus`, `visit`, `lookIn` and `swing`, and `Stage.section`, say what to frame and
`Cameras.frame` does it: flown to in orbit and free; in flight, a subject on the vehicle is the
chase view's (nothing else can keep up with it). `pose` and `shot` put the orbiting rig somewhere
exact for tests and screenshots (looking straight at the pivot, and still, with nothing left easing).
What is framed is where the clock has it at that moment (`view` and `focus` call `lift` first), so a
view asked for in the same breath as the clock is put back frames the vehicle on its pad, not where
it was last drawn. The near plane is not
the camera's: `Stage.fitDepth` fits it every frame to the nearest thing there is (rendering.md). A camera shake is applied for
the draw only (`Stage.shaker`), after the rig has said where the camera is.

To check a change: `node --test tests/camera.test.mjs`, then `pnpm test:camera` (`tools/camera-test.mjs`):
real wheel, drag, key and touch events in a browser, first the sequences that used to go wrong (and the map, in and
out, with M, the wheel, a drag, C and 0), then a
seeded soak with the clock running a flight and C stepping through the rigs, asserting on every frame
that nothing is not a number, the eye is above the ground, the pivot has not moved without cause, a
zoom out has moved and turned nothing, and the subject is where it should be. The idle show does not
start while a flight is being watched or flown, another rig than orbit is in charge, or the mouse
is moving (`demo.busy` in main.ts): it must never take a view that is being used.

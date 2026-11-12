# The Mercury cabin

What [mercury_cabin.py](mercury_cabin.py) builds inside a Mercury spacecraft's pressure vessel: the painted lining
with its frames and rivet lines, a ring round each porthole, the couch, the main instrument panel and the consoles,
the periscope, the pilot's two controllers, cameras, stowage and cabin lights. A flight's `model/vehicle.py` gives it
the pressure vessel, the seated pilot's key points (crew/mark_iv_suit.py), the portholes and the hatch opening.

**The fit is a capsule's, not the type's.** Today the module holds one: spacecraft No. 7 (Freedom 7), whose panel is
the Postlaunch Report's Figure 3.1-2. Every dimension, how sure it is and what is left out are in that flight's record:
[spacecraft.md, "Cabin"](../flights/mr-3-freedom-7/spacecraft.md). A later capsule (No. 11's window, the orbital
panel with its Earth-path indicator and time-to-retrograde clock) adds its own tables here and its own section there;
it does not edit No. 7's.

## What the viewer is promised

| Node | What it is | Extras |
| --- | --- | --- |
| `Seat_Pilot` | an empty at the seated figure's eyes: in the file its +Z looks at the panel and its +Y is the top of his head | |
| `Gauge_<Name>` | a needle, bar or counter wheel, its origin on its pivot | `turn` (value, radians pairs about the face's normal, anticlockwise positive), or `slide` (value, metres pairs along its own X), or `drum` (figures on the wheel) with `place`; `rest` the value its face was built pointing at; `wrap` where the value goes round; `reach` |
| `Tele_<Name>` | a lamp's lens, with a material of its own so it is lit by itself | `reach` |
| `Ctl_<Name>` | a control: a pull ring, a push button, a grip | `pull` or `press`, metres along its own axis; `reach` |
| `Periscope_Screen` | the display's glass, which the viewer draws the outside onto | `screen_radius` |

`reach` is how near a pointer must come to mean the thing, metres. Faces, legends and lettering are drawn by the
script into three images (`cabin-main-panel`, `cabin-consoles`, `cabin-faces`), with the same tables the metal is
built from, so a needle's scale and the marks under it are one list.

Everything here is built only at detail 0.75 and above (`srlib.interior()`): the coarser levels have no cabin.

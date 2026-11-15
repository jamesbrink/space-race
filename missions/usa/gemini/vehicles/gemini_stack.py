"""A Gemini on its Titan: the stack a flight's model/vehicle.py builds, and the stills its build takes of it.

A flight's script says what its own ship had (gemini_spacecraft.Fit), what its own launch vehicle had (the arguments of
titan_ii_glv.build) and what its parts say of themselves where the type's words are another flight's (`says`), and
calls build(); previews() is the set of stills every flight's build takes, to which a flight adds its own.

Every dimension is in inches and converted once, at the point of use, with IN. The model's origin is the spacecraft's
station Z103.44, where the re-entry module meets the adapter; +Z is toward the nose; the hatches are on +X.
(Gemini-Titan 3's script was written before this module and builds the same stack itself.)
"""

from __future__ import annotations

import gemini_spacecraft
import titan_ii_glv
from gemini_spacecraft import Z0, Z_BASE, Z_NOSE, Fit
from mercury_capsule import flag_image  # the fifty-star flag: the same flag as Mercury's ships wore
from srlib import IN, load_font, mark_shells, material

Z_BOOSTER_BASE = (Z_BASE - Z0) - titan_ii_glv.LENGTH  # the first stage engines' exit plane

# what the stills hide to see the windows' wells, the cabin, and the ship with its skins off
PANES = ("HatchLeft_Window", "HatchRight_Window")
SKINS = ("Cabin_", "Hatches_", "Hatch", "Experiment_")
BARE = ("Cabin_", "Hatches_", "Hatch", "Retro_Skin", "Retro_Foil", "Equipment_Skin", "Equipment_Foil", "RR_S", "RR_F", "RCS_S", "RCS_F", "RCS_Ports")
TITAN = ("Titan", "Stage", "Interstage")  # the launch vehicle, taken away to look into the back of the adapter
OPEN = (*BARE, *TITAN, "Equipment_Cover", "Pod_Cover", "Equipment_Stringers", "Retro_Stringers")  # and the adapter's skin and covers with it


def equipment_previews() -> list:
    """The stills of the equipment section, which every Gemini's build takes: looking forward into it from aft with the
    skin and the covers off (the ship's top is up and the crew's right is to the right); the same from one side and
    below; the section from the side; and the gold cover as another ship sees it, from where the camera of NASA
    S65-63221 stood, 41 degrees off the ship's axis."""
    return [
        ("equipment-aft.png", (0, 0, st(40)), 7.5, dict(azimuth=0, elevation=-89.9, res=(1500, 1500), hide=OPEN, lens=90)),
        ("equipment-modules.png", (0, 0, st(48)), 5.2, dict(azimuth=-55, elevation=-38, res=(1500, 1300), hide=OPEN, lens=50)),
        ("equipment-modules-far.png", (0, 0, st(48)), 5.2, dict(azimuth=125, elevation=-38, res=(1500, 1300), hide=OPEN, lens=50)),
        ("equipment-side.png", (0, 0, st(42)), 5.4, dict(azimuth=113, elevation=0, res=(1500, 1100), hide=OPEN, lens=60)),
        ("equipment-cover.png", (0, 0, st(26)), 6.4, dict(azimuth=-150, elevation=-49, res=(1500, 1500), hide=TITAN, lens=50)),
        ("equipment-cover-close.png", (0.9, 0.0, st(24)), 2.6, dict(azimuth=-150, elevation=-49, res=(1500, 1300), hide=TITAN, lens=50)),
    ]


def build(fit: Fit, says: dict[str, tuple[str, str]] | None = None, **vehicle) -> str:
    """The spacecraft `fit` describes on a launch vehicle built with `vehicle` (titan_ii_glv.build's arguments), each
    mesh named in `says` given the flight's own label and words. Returns the stack's overall size."""
    font = load_font()
    flag = material("flag", (1, 1, 1), 0.0, 0.6, double_sided=True, image=flag_image())
    size = gemini_spacecraft.build(font, flag, fit)
    titan_ii_glv.build(Z_BOOSTER_BASE, font, **vehicle)
    gemini_spacecraft.retell(says or {})
    mark_shells(gemini_spacecraft.shells(fit) + titan_ii_glv.SHELLS)
    return f"{(Z_NOSE - Z0 - Z_BOOSTER_BASE) * IN:.3f} m tall on the pad, {size}"


def station(s: float) -> float:
    """A station of the launch vehicle as a height in the model, metres."""
    return (Z_BOOSTER_BASE + (titan_ii_glv.S_EXIT - s)) * IN


def st(z: float) -> float:
    """A station of the spacecraft as a height in the model, metres."""
    return (z - Z0) * IN


def previews(own: tuple = ()) -> list:
    """The stills of a stack: the whole of it from both sides, the spacecraft from three, the launch vehicle's parts, the
    ship with its skins off, the cabin from above, and the equipment section; then a flight's `own`."""
    top = (Z_NOSE - Z0) * IN
    mid = (top + Z_BOOSTER_BASE * IN) / 2
    sc = (Z_NOSE + Z_BASE - 2 * Z0) / 2 * IN
    return [
        ("vehicle-stack.png", (0, 0, mid), 88, dict(azimuth=-20, res=(700, 1900))),
        ("vehicle-stack-far.png", (0, 0, mid), 88, dict(azimuth=160, res=(700, 1900))),
        ("spacecraft-left.png", (0, 0, sc), 17, dict(azimuth=-75, elevation=6, res=(1300, 1500))),
        ("spacecraft-top.png", (0, 0, sc), 17, dict(azimuth=0, elevation=8, res=(1300, 1500))),
        ("spacecraft-right.png", (0, 0, sc), 17, dict(azimuth=75, elevation=6, res=(1300, 1500))),
        ("hatch-close.png", (0.5, -0.3, 1.0), 4.2, dict(azimuth=-30, elevation=25, res=(1300, 1300))),
        ("adapter-foot.png", (0, 0, -1.6), 9, dict(azimuth=-60, elevation=-28, res=(1300, 1300))),
        ("stage2.png", (0, 0, station(390)), 17, dict(azimuth=-48, elevation=4, res=(1300, 1500))),
        ("stage1-letters.png", (0, 0, station(900)), 30, dict(azimuth=-20, elevation=2, res=(1100, 1700))),
        ("engines.png", (0, 0, station(1290)), 12, dict(azimuth=-60, elevation=-30, res=(1400, 1300))),
        # with the skins off: what the cutaway shows
        ("inside-spacecraft.png", (0, 0, sc), 15, dict(azimuth=-70, elevation=14, res=(1300, 1500), hide=BARE)),
        ("inside-spacecraft-right.png", (0, 0, sc), 15, dict(azimuth=110, elevation=14, res=(1300, 1500), hide=BARE)),
        # the crew station down through where the hatches are, and from the left side in section
        ("cabin-above.png", (0.35, 0, st(128)), 3.2, dict(azimuth=0, elevation=8, res=(1500, 1500), hide=SKINS, lens=50)),
        (
            "inside-cabin.png",
            (0.1, 0, 0.85),
            5.5,
            dict(azimuth=-28, elevation=38, res=(1400, 1300), hide=("Cabin_", "Hatches_", "Hatch", "CrewStation_PressureVessel")),
        ),
        *equipment_previews(),
        *own,
    ]

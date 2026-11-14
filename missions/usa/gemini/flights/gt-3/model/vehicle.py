"""Gemini spacecraft No. 3 on Gemini Launch Vehicle 3, as launched on Gemini-Titan 3 (23 March 1965).

Run headless:
    pnpm model:gt-3            (or: blender -b -P <this file> -- --out <glb> [--preview DIR])

The flight's vehicle: spacecraft and launch vehicle, as they left the pad. The spacecraft is
../../../vehicles/gemini_spacecraft.py (its skins in gemini_shell.py, its crew station in gemini_cabin.py) and the
launch vehicle ../../../vehicles/titan_ii_glv.py; what was this
ship's and this vehicle's own is said here (FIT, and the launch vehicle's arguments) and argued in ../spacecraft.md
and ../../../vehicles/titan-ii-glv.md.

Every dimension is in inches and converted once, at the point of use, with IN. The model's origin is the
spacecraft's station Z103.44, where the re-entry module meets the adapter; +Z is toward the nose; the hatches are
on +X.

Top-level nodes (the viewer's part list keys on these names):
    NoseFairing  RendezvousRecovery  ReentryControl  Hatches  ScannerFairing  Cabin  CrewStation  HeatShield
    RetroSection  EquipmentSection
and, from the launch vehicle:
    TitanStage2  TitanStage2Engine  TitanInterstage  TitanStage1  TitanStage1Engine
"""

from __future__ import annotations

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "gemini", "vehicles"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "mercury", "vehicles"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "gemini", "crew"))
from mathutils import Matrix, Vector  # noqa: E402

import g3c_suit  # noqa: E402
import gemini_spacecraft  # noqa: E402
import titan_ii_glv  # noqa: E402
from gemini_spacecraft import Z0, Z_BASE, Z_NOSE, Fit  # noqa: E402
from mercury_capsule import flag_image  # noqa: E402  (the fifty-star flag: the same flag as Mercury's ships wore)
from srlib import CM, IN, load_font, mark_shells, material, run  # noqa: E402

# Who sat where: the command pilot on the left (SEDR 300, p. 1-5).
CREW = {"CommandPilot": g3c_suit.GRISSOM, "Pilot": g3c_suit.YOUNG}
# Both men are aboard, seated as for the launch (../../../crew/g3c-suit.md, "Seated"): the crew station is fitted round
# them (../../../vehicles/gemini-spacecraft.md, "Crew station"), and each build prints the room each has
# (gemini_cabin.seat). False leaves the seats empty, with the harness lying on them and each seat's node where a
# seated Grissom's eyes come.
CREW_ABOARD = True


def crew(name: str, parent, sit: Matrix) -> dict:
    """The man for a seat, in his G3C suit (../../../crew/g3c_suit.py). `sit` is figurelib's seat frame laid where his
    back and his seat meet the seat's cushions: he is put so that they do."""
    who = CREW[name]
    g3c_suit.wear(who)
    keys = g3c_suit.seated_key_points()
    place = sit @ Matrix.Translation(Vector((0.0, -keys["seat_y"], -keys["back_plane_z"])) * CM)
    if CREW_ABOARD:
        keys = g3c_suit.build_seated(parent, place, f"Crew_{name}", who)
    return {**keys, "place": place, "aboard": CREW_ABOARD}


# What spacecraft 3 had, against the ships after it (../spacecraft.md, "This ship and the others").
FIT = Fit(
    radar=False,  # "Radar equipment is not carried for this flight" (the press kit, release 65-81, p. 37)
    lateral_thrusters=False,  # OAMS chambers 13 to 16 were dummies (Gemini IV mission report, 3.1.2.7)
    adapter_batteries=3,  # three of 400 ampere-hours (SEDR 300, p. 5-16; Gemini IV mission report, 3.1.2.6)
    water_tanks=1,  # "instead of the one flown on GT-3" (Gemini IV mission report, 3.1.2.3)
    experiments=("sea-urchin", "blood", "reentry-communications"),  # the press kit, pp. 26 to 30
    names=("Grissom", "Young"),
    crew=crew,
)

Z_BOOSTER_BASE = (Z_BASE - Z0) - titan_ii_glv.LENGTH  # the first stage engines' exit plane


def build() -> str:
    font = load_font()
    flag = material("flag", (1, 1, 1), 0.0, 0.6, double_sided=True, image=flag_image())
    size = gemini_spacecraft.build(font, flag, FIT)
    # GLV-3: the last vehicle to wear the insulation on its second stage's forward skirt (titan-ii-glv.md)
    titan_ii_glv.build(Z_BOOSTER_BASE, font, skirt_insulation=True)
    mark_shells(gemini_spacecraft.SHELLS + titan_ii_glv.SHELLS)
    return f"{(Z_NOSE - Z0 - Z_BOOSTER_BASE) * IN:.3f} m tall on the pad, {size}"


if __name__ == "__main__":
    top = (Z_NOSE - Z0) * IN
    base = Z_BOOSTER_BASE * IN
    mid = (top + base) / 2
    sc = (Z_NOSE + Z_BASE - 2 * Z0) / 2 * IN
    station = lambda s: base + (titan_ii_glv.S_EXIT - s) * IN  # noqa: E731
    st = lambda z: (z - Z0) * IN  # noqa: E731  (a station of the spacecraft)
    PANES = ("HatchLeft_Window", "HatchRight_Window")
    SKINS = ("Cabin_", "Hatches_", "Hatch", "Experiment_")
    OUTSIDE = (*SKINS, "RR_", "RCS_", "Retro", "Equipment", "Heat", "Nose", "Titan", "Scanner")
    run(
        "gt-3 vehicle",
        build,
        [
            ("vehicle-stack.png", (0, 0, mid), 88, dict(azimuth=-20, res=(700, 1900))),
            ("vehicle-stack-far.png", (0, 0, mid), 88, dict(azimuth=160, res=(700, 1900))),
            ("spacecraft-left.png", (0, 0, sc), 17, dict(azimuth=-75, elevation=6, res=(1300, 1500))),
            ("spacecraft-top.png", (0, 0, sc), 17, dict(azimuth=0, elevation=8, res=(1300, 1500))),
            ("spacecraft-bottom.png", (0, 0, sc), 17, dict(azimuth=170, elevation=6, res=(1300, 1500))),
            ("reentry-module.png", (0, 0, 1.6), 9.5, dict(azimuth=-35, elevation=12, res=(1300, 1400))),
            ("hatch-close.png", (0.5, -0.3, 1.0), 4.2, dict(azimuth=-30, elevation=25, res=(1300, 1300))),
            ("adapter-foot.png", (0, 0, -1.6), 9, dict(azimuth=-60, elevation=-28, res=(1300, 1300))),
            ("stage2.png", (0, 0, station(390)), 17, dict(azimuth=-48, elevation=4, res=(1300, 1500))),
            ("interstage.png", (0, 0, station(580)), 13, dict(azimuth=-48, elevation=6, res=(1300, 1300))),
            ("stage1-letters.png", (0, 0, station(900)), 30, dict(azimuth=-20, elevation=2, res=(1100, 1700))),
            ("engines.png", (0, 0, station(1290)), 12, dict(azimuth=-60, elevation=-30, res=(1400, 1300))),
            ("engines-side.png", (0, 0, station(1280)), 11, dict(azimuth=85, elevation=-4, res=(1400, 1300))),
            # with the skins off: what the cutaway shows
            (
                "inside-spacecraft.png",
                (0, 0, sc),
                15,
                dict(
                    azimuth=-70,
                    elevation=14,
                    res=(1300, 1500),
                    hide=(
                        "Cabin_",
                        "Hatches_",
                        "Hatch",
                        "Retro_Skin",
                        "Retro_Foil",
                        "Equipment_Skin",
                        "Equipment_Foil",
                        "RR_S",
                        "RR_F",
                        "RCS_S",
                        "RCS_F",
                        "RCS_Ports",
                    ),
                ),
            ),
            # from each seat: ahead, through his window, down at his knees, across the cabin. His own helmet is not drawn
            # (the eyes are in it), nor the windows' panes, which a still drawn here would show as opaque
            *(
                (
                    f"seat-{who}-{view}.png",
                    (0, 0, 0),
                    0,
                    dict(seat=f"Seat_{name}", look=look, lens=lens, lamps="Lamp_", res=(1600, 1000), hide=(f"Crew_{name}_Helmet", *PANES)),
                )
                for name, who in (("CommandPilot", "left"), ("Pilot", "right"))
                for view, look, lens in (
                    ("ahead", (0, 0), 18),
                    ("window", (0, 4), 35),
                    ("down", (0, -50), 16),
                    ("inboard", (-55 if name == "CommandPilot" else 55, -10), 18),
                )
            ),
            # the crew station and the men in it, as the sources look at them: down through where the hatches are
            # (S65-13244); over the beam at the command pilot (S65-22665); in through each window (S65-20605, S65-24719,
            # S65-24721); from the left side in section, the nose up; looking aft at the seats (SEDR 300, Figure 3-1)
            ("cabin-above.png", (0.35, 0, st(128)), 3.2, dict(azimuth=0, elevation=8, res=(1500, 1500), hide=SKINS, lens=50)),
            ("cabin-over-beam.png", (0.40, -0.43, st(125)), 0.84, dict(azimuth=23.4, elevation=10.4, res=(1400, 1400), hide=SKINS, lens=28)),
            ("cabin-window-left.png", (0.495, -0.46, st(127.5)), 0.80, dict(azimuth=0, elevation=84.7, res=(1100, 1400), hide=PANES[:1], lens=40)),
            ("cabin-window-right.png", (0.495, 0.46, st(127.5)), 0.80, dict(azimuth=0, elevation=84.7, res=(1100, 1400), hide=PANES[1:], lens=40)),
            ("cabin-side.png", (0, -0.3, st(130)), 6.0, dict(azimuth=-90, elevation=0, res=(1300, 1700), hide=(*OUTSIDE, "CrewStation_"), lens=110)),
            (
                "cabin-aft.png",
                (0, 0, st(120)),
                5.5,
                dict(
                    azimuth=180,
                    elevation=89.9,
                    res=(1500, 1500),
                    hide=(*OUTSIDE, "CrewCabin_", "Gauge", "Tele", "Ball", "Lamp", "CrewStation_"),
                    lens=90,
                ),
            ),
            (
                "inside-cabin.png",
                (0.1, 0, 0.85),
                5.5,
                dict(azimuth=-28, elevation=38, res=(1400, 1300), hide=("Cabin_", "Hatches_", "Hatch", "CrewStation_PressureVessel")),
            ),
        ],
    )

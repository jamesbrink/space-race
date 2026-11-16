"""Launch Complex 19, Cape Kennedy, as it stood for a Gemini-Titan on the date its flight's model/pad.py names
(23 March 1965 for Gemini 3): built with the erector standing round the vehicle, its platforms down and the white
room shut, as the crew went aboard; every moving part its own node. See ./lc-19.md for every dimension, its
confidence and source, the moving parts' pivots, and what stood when.

The pieces are in ./lc19/, one module each; each is one or more top-level nodes in pad.glb:
  LaunchStand            stand.py     the concrete stand, the steel launch deck, the two flame ducts, the stairs
  ThrustMount            stand.py     the four A-frames the first stage was bolted to
  Ramp                   stand.py     the earth ramp the stages came up
  Erector                erector.py   the complete vehicle erector and its white room (origin on its hinge)
  UmbilicalTower         towers.py    the complete vehicle umbilical tower, its seven booms, their lines
  Stage2Stand, Stage2UmbilicalTower, Stage2Erector   towers.py   the second-stage test position
  HoistingCrane          towers.py    the spacecraft hoisting crane
  CameraTower            towers.py    the lattice tower west of the deck
  DeckFittings, Floodlights   fittings.py   the crew's ramp, the guard's shelter, the fence, the lamps, the windsock

Frame: origin on the vehicle's axis at the launch deck, feet. +X runs along the stand toward the ramp, the way the
erector lowers and the hatches faced (175 degrees true); +Y is east, toward the sea. The vehicle stands square in it.
"""

from __future__ import annotations

import sitelib
from lc19 import erector, fittings, grounds, stand, towers
from lc19.site import ENGINE_EXIT, ERECTOR_TOP, GROUND, HINGE, UT_TOP, Parts, materials, stood

__all__ = ["ENGINE_EXIT", "ERECTOR_TOP", "GROUND", "HINGE", "UT_TOP", "build", "build_place"]

GEMINI = "NASA SP-4002, the entry of 21 May 1962: the complex's rebuilding for Gemini was complete and it was activated on 17 October 1963"


def build(date: str | None = None) -> None:
    """Build the pad as it stood on `date` ("1965-03-23"; None: everything)."""
    sitelib.as_of(date)
    parts = Parts(materials())
    stand.build(parts)
    stand.thrust_mount(parts)
    stand.ramp(parts)
    if stood(
        "Launch vehicle erector with its white room",
        since="1963-03",
        confidence="documented",
        source=f"{GEMINI}; the white room is in the museum's photograph of 14 March 1963",
    ):
        erector.build(parts)
    if stood("Complete vehicle umbilical tower, extended for the spacecraft's booms", since="1963-10-17", confidence="documented", source=GEMINI):
        towers.umbilical_tower(parts)
    towers.second_stage(parts)
    towers.crane(parts)
    if stood(
        "Camera tower west of the deck",
        since="1965-03",
        confidence="estimated",
        source="NASA S65-21881, March 1965: it is in that photograph; when it was put up and taken down is not read",
    ):
        towers.camera_tower(parts)
    fittings.build(parts)
    parts.build()
    print(sitelib.standing())


def build_place(date: str | None = None) -> None:
    """The rest of Complex 19 as it stood on `date`, in the pad's frame: the site's own model
    (lc19/model/<date>.py), which every flight from here in that state shows round its pad.
    Flume                 the apron under the flame ducts, the channel, the skimming basin
    Roads                 the loop, the roads to the ramp and the holding areas
    Blockhouse, Cableway  the dome under its sand, its entrance; the cable duct to the stand
    FuelHoldingArea, OxidizerHoldingArea   each a tank under its roof behind its revetment, and its line to the stand
    DecontaminationBuilding, SupportBuilding, AirConditioningShed
    Fence                 the perimeter's chain link
    """
    sitelib.as_of(date)
    parts = Parts(materials())
    grounds.build(parts)
    parts.build()
    print(sitelib.standing())

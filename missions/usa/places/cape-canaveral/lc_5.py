"""Launch Complex 5, Cape Canaveral, as it stood for a Mercury-Redstone on the date its flight's
model/pad.py names (5 May 1961 for MR-3, 21 July 1961 for MR-4): built in the service position, the
structure round the vehicle with its platforms closed and the cherry picker's cab at the capsule's
hatch, every moving part its own node. See ./lc-5.md for every dimension, its confidence and source,
the moving parts' pivots, and what differed between the two dates ("What stood when").

The pieces are in ./lc5/, one module each; each is one or more top-level nodes in pad.glb:
  Hardstand        hardstand.py         slabs, painted circle, four rails, scale plate, trench, track
  LaunchPedestal   launcher.py          the launch ring, its legs, deflector, tail plugs and cables
  UmbilicalMast    masts.py             cable mast No. 2, the capsule's (origin on its hinge pin, on the launcher's table)
  BoosterMast      masts.py             cable mast No. 1, the booster's (origin on its hinge pin, on the launcher's table)
  ServiceStructure service_structure.py the Noble A-frame structure, its platforms in halves, its wheels
  CherryPicker     cherry_picker.py     the mobile aerial tower: truck, outriggers, mast, jib, cab
  GroundEquipment, CameraTowers, Floodlights   ground_equipment.py (from July 1961: the transfer van and its tractor)

Frame: origin at the launcher's centre on the pad, feet in the sources' units. +X is square to the
rails on the blockhouse's side (WNW), where the cherry picker's truck stands; +Y runs along the rails
toward the structure's parking places (SSW). The vehicle stands turned in that frame, as the launcher's
table was set for the flight's azimuth: `build(date, azimuth)` (lc5/site.py: `aim`).
"""

from __future__ import annotations

import sitelib
from lc5 import (
    blockhouse,
    cherry_picker,
    ground_equipment,
    grounds,
    hardstand,
    labels,
    launcher,
    masts,
    outbuildings,
    pad6,
    service_structure,
    vehicles,
)
from lc5.site import HARDSTAND, LAUNCHER_TOP, STRUCTURE_LAUNCH, STRUCTURE_T55, STRUCTURE_TOP, TRUE_NORTH, Parts, aim, launcher_turn, materials, stood

PEDESTAL_TOP = LAUNCHER_TOP  # where the fins rest: what the viewer stands the vehicle on

__all__ = [
    "HARDSTAND",
    "PEDESTAL_TOP",
    "STRUCTURE_LAUNCH",
    "STRUCTURE_T55",
    "STRUCTURE_TOP",
    "TRUE_NORTH",
    "build",
    "build_place",
    "launcher_turn",
]


def build(date: str | None = None, azimuth: float | None = None) -> dict:
    """Build the pad as it stood on `date` ("1961-05-05"; None: everything), its launcher set for a flight on
    `azimuth` (degrees true; None: square to the rails, the hatch on +X). The vehicle, the two cable masts and the
    umbilical stand turned with the launcher's table, and what met them is fitted to where they then are. Returns
    the cherry picker's pins and stow angles, for the record."""
    sitelib.as_of(date)
    turned = aim(azimuth)
    print(f"launcher: set for {azimuth} degrees true: its table, the vehicle and the masts turned {turned:.1f} degrees from +X toward +Y")
    parts = Parts(materials())
    hardstand.build(parts)
    launcher.build(parts)
    masts.build(parts)
    service_structure.build(parts)
    pose = {}
    if stood("Mobile aerial tower (cherry picker)", since="1960-10-24", confidence="documented", source="SP-4001: at the Cape 24 October 1960"):
        pose = cherry_picker.build(parts)
    ground_equipment.build(parts)
    labels.apply(parts)
    parts.build()
    print(sitelib.standing())
    for node, turn in masts.resting().items():
        print(f"{node} lies on the pad {turn:.1f} degrees over")
    return pose


def build_place(date: str | None = None) -> None:
    """The rest of Complex 5/6 as it stood on `date`, in the pad's frame: the site's own model
    (lc5/model/<date>.py), which every flight from here in that state shows round its pad.
    Blockhouse, ReadyRoom           blockhouse.py     the arrow-shaped blockhouse, the ready rooms, their paving
    Pad6, Pad6Launcher, Pad6Gantry  pad6.py           the other pad, its launch ring and its square-topped gantry
    Track, Road, CableTrenches, Yard, Poles   grounds.py   what lies between
    Outbuildings                    outbuildings.py   two huts, the generator building, the shed
    Vehicles                        vehicles.py       the cars at the blockhouse
    """
    sitelib.as_of(date)
    aim(None)  # nothing stood on pad 6's launcher on these days: it is built square
    parts = Parts(materials())
    if stood("Blockhouse and ready rooms", since="1955", confidence="documented", source="NHL nomination 84003872: built 1955; standing today"):
        blockhouse.build(parts)
    if stood("Pad 6", since="1955", confidence="documented", source="the museum: first launch from pad 6 on 20 April 1955; the slab is there today"):
        pad6.build(parts)
    grounds.build(parts)
    outbuildings.build(parts)
    if stood(
        "Cars at the blockhouse",
        confidence="estimated",
        source="FHSU F16_016, July 1961: July's cars, in July's places; no view of the parking in May has been found",
    ):
        vehicles.build(parts)
    labels.apply(parts)
    parts.build()
    if hasattr(vehicles, "check_standing"):  # every tyre against what is under it, now that the site is built
        for line in vehicles.check_standing():
            print(line)
    print(sitelib.standing())

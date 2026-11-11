"""Launch Complex 5, Cape Canaveral, as it stood for Mercury-Redstone 3 at about T-55 minutes:
service structure rolled back to the edge of the pad with its platforms open, the cherry picker's
cab at the capsule hatch. Built by a flight's model/pad.py; see ./lc-5.md for every dimension, its
confidence and source, and the moving parts' pivots.

The pieces are in ./lc5/, one module each; each is one or more top-level nodes in pad.glb:
  Hardstand        hardstand.py         slabs, painted circle, four rails, scale plate, trench, track
  LaunchPedestal   launcher.py          the launch ring, its legs, deflector, tail plugs and cables
  UmbilicalMast    masts.py             cable mast No. 2, the capsule's (origin on its foot's hinge)
  BoosterMast      masts.py             cable mast No. 1, the booster's (origin on its foot's hinge)
  ServiceStructure service_structure.py the Noble A-frame structure, its platforms in halves, its wheels
  CherryPicker     cherry_picker.py     the mobile aerial tower: truck, outriggers, mast, jib, cab
  GroundEquipment, CameraTowers, Floodlights   ground_equipment.py

Frame: origin at the launcher's centre on the pad, feet in the sources' units. +X is the side the
hatch faces (WNW); +Y runs along the rails toward the structure's parking places (SSW).
"""

from __future__ import annotations

from lc5 import blockhouse, cherry_picker, ground_equipment, grounds, hardstand, launcher, masts, outbuildings, pad6, service_structure, vehicles
from lc5.site import HARDSTAND, LAUNCHER_TOP, STRUCTURE_LAUNCH, STRUCTURE_T55, STRUCTURE_TOP, TRUE_NORTH, Parts, materials

PEDESTAL_TOP = LAUNCHER_TOP  # where the fins rest: what the viewer stands the vehicle on

__all__ = ["HARDSTAND", "PEDESTAL_TOP", "STRUCTURE_LAUNCH", "STRUCTURE_T55", "STRUCTURE_TOP", "TRUE_NORTH", "build", "build_surroundings"]


def build() -> dict:
    """Build the pad. Returns the cherry picker's pins and stow angles, for the record."""
    parts = Parts(materials())
    hardstand.build(parts)
    launcher.build(parts)
    masts.build(parts)
    service_structure.build(parts)
    pose = cherry_picker.build(parts)
    ground_equipment.build(parts)
    parts.build()
    return pose


def build_surroundings() -> None:
    """The rest of Complex 5/6, in the pad's frame, as scenery (a flight's model/surroundings.py):
    Blockhouse, ReadyRoom           blockhouse.py     the arrow-shaped blockhouse, the ready rooms, their paving
    Pad6, Pad6Launcher, Pad6Gantry  pad6.py           the other pad, its launch ring and its square-topped gantry
    Track, Road, CableTrenches, Yard, Poles   grounds.py   what lies between
    Outbuildings                    outbuildings.py   two huts, the generator building, the shed
    Vehicles                        vehicles.py       the cars at the blockhouse
    """
    parts = Parts(materials())
    blockhouse.build(parts)
    pad6.build(parts)
    grounds.build(parts)
    outbuildings.build(parts)
    vehicles.build(parts)
    parts.build()

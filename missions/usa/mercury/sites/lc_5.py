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

from lc5 import cherry_picker, ground_equipment, hardstand, launcher, masts, service_structure
from lc5.site import HARDSTAND, LAUNCHER_TOP, STRUCTURE_LAUNCH, STRUCTURE_T55, STRUCTURE_TOP, TRUE_NORTH, Parts, materials

PEDESTAL_TOP = LAUNCHER_TOP  # where the fins rest: what the viewer stands the vehicle on

__all__ = ["HARDSTAND", "PEDESTAL_TOP", "STRUCTURE_LAUNCH", "STRUCTURE_T55", "STRUCTURE_TOP", "TRUE_NORTH", "build"]


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

"""Launch Complex 14, Cape Canaveral, as it stood for a Mercury-Atlas on the date its flight's model/pad.py names
(20 February 1962 for Mercury-Atlas 6): built in the service position, the service structure round the vehicle with
its leaves down and the white room shut, the bascule upright, the umbilical's boom over the capsule, every moving
part its own node. See ./lc-14.md for every dimension, its confidence and source, the moving parts' pivots, and what
stood when.

The pieces are in ./lc14/, one module each. `build(date)` is the pad, a flight's own model (pad.glb): what is worked,
taken apart and told about.
  LaunchStand, Launcher, FlameDeflector   stand.py              the deck on its steel, the launcher and its two arms, the flame bucket
  EgressTower                             tower.py              the umbilical and egress tower, its bascule and its boom
  ServiceStructure                        service_structure.py  the tower on its rails: legs, leaves, white room, stair, lift, head
  TransferTable                           table.py              the table that carried it east
`build_place(date)` is the rest of the complex, the place's own model (lc14/model/<date>.py), which every flight
from here in that state shows round its pad, and which the Cape's other pads see across the scrub.
  Ramp, LaunchPadBuilding, PTU, CompressorRoom                              ramp.py
  Apron, Tracks, TablePit, Flume, Cableway, Floodlights, Signal, FireNozzles  grounds.py
  Blockhouse, EquipmentShelter, ReadyBuilding, SentryHouse, CableHut        blockhouse.py
  LoxStorage, FuelStorage, POL                                              storage.py
`build_place(date, pad=True)` puts the pad's own hardware in with it, as it stood with no vehicle on it: the complex
whole, for the Cape's other pads to see (lc14/model/<date>-whole.py).

Frame: the origin is the vehicle's axis at the stand's deck, feet. +X bears 105 degrees true (the pitch axis; the
transfer table's travel), +Y 015 degrees (along the stand, the way the structure rolls off it). lc14/site.py.
"""

from __future__ import annotations

import sitelib
from lc14 import blockhouse, grounds, ramp, service_structure, stand, storage, table, tower
from lc14.site import HATCH_TURN, LAUNCHER_TOP, PARKED_X, STAND_L, STAND_W, STRUCTURE_TOP, TABLE_Y, TRUE_NORTH, Parts, materials, stood

__all__ = [
    "HATCH_TURN",
    "LAUNCHER_TOP",
    "PARKED_X",
    "STAND_L",
    "STAND_W",
    "STRUCTURE_TOP",
    "TABLE_Y",
    "TRUE_NORTH",
    "build",
    "build_place",
]

HAER = "HAER FL-8-7"


def hardware(parts: Parts) -> None:
    """The pad's own hardware, as it stood on the date being built."""
    stand.build(parts)
    if stood(
        "Umbilical and egress tower, tapered, with the bascule",
        since="1962-01-22",
        until="1964-01-01",
        confidence="estimated",
        source="it stands in NASA KSC-LOD-62-475 (22 January 1962) where a straight banded mast stood for MA-4 (13 September 1961): built between "
        f"the two; dismantled for Atlas-Agena ({HAER}, p. 27), work that was to begin on 1 January 1964 (NASA SP-4002)",
    ):
        tower.build(parts)
    if stood(
        "Service structure with the white room",
        since="1960",
        until="1976-12",
        confidence="documented",
        source=f"{HAER}, pp. 22, 23 and 27: modified 1959 to 1960; razed December 1976",
    ):
        service_structure.build(parts)
        table.build(parts)


def build(date: str | None = None) -> None:
    """The pad as it stood on `date` ("1962-02-20"; None: everything)."""
    sitelib.as_of(date)
    parts = Parts(materials())
    hardware(parts)
    parts.build()
    print(sitelib.standing())


def build_place(date: str | None = None, pad: bool = False) -> None:
    """The rest of the complex as it stood on `date`, in the pad's frame; with `pad`, the pad's own hardware too."""
    sitelib.as_of(date)
    parts = Parts(materials())
    if pad:
        hardware(parts)
    ramp.build(parts)
    grounds.build(parts)
    blockhouse.build(parts)
    storage.build(parts)
    parts.build()
    print(sitelib.standing())

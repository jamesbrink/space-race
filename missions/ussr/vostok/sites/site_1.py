"""Site 1, Tyuratam ("Gagarin's Start"), as it stood for the crewed Vostoks. Built by a flight's
model/pad.py; see ./site-1.md for every dimension, its confidence and source, and the moving parts' pivots.

The pieces are in ./site1/, one module each; each is one or more top-level nodes in pad.glb:
  Platform, FlamePit   platform.py        the slab on its pylons, its fence; the pit's lining and ground
  LaunchRing           launch_system.py   the turning ring, with Support_1..4 and Guide_1..4 under it

Frame: origin at the rocket's axis on the platform's deck, metres. +X is due east, out over the pit;
+Y is north. The rocket and the ring stand turned to the launch azimuth (site.TURN).
"""

from __future__ import annotations

import sitelib
from site1 import launch_system, platform
from site1.site import AZIMUTH, TAIL_Z, TIP_Z, TURN, Parts, materials

__all__ = ["AZIMUTH", "TAIL_Z", "TIP_Z", "TURN", "build", "build_place"]


def build(date: str | None = None) -> str:
    """Build the pad as it stood on `date` ("1961-04-12"; None: everything). Returns a line of its sizes."""
    sitelib.as_of(date)
    parts = Parts(materials())
    platform.build(parts)
    launch_system.build(parts)
    parts.build()
    print(sitelib.standing())
    return f"{platform.summary()}, rocket's tail {TAIL_Z:.2f} m, load ring {TIP_Z:.2f} m"


def build_place(date: str | None = None) -> str:
    """The rest of Site 1 as it stood on `date`, in the pad's frame: the site's own model (site1/model/<date>.py),
    which every flight from here in that state shows round its pad. Each piece says when it stood (sitelib.stood).
      CommandBunker                                               bunker.py     the mound over the firing room: periscopes, vents, entrance
      StorageBunker                                               storage.py    the three concrete bays west of it
      PropellantShed, CascadeFacility, PumpHouse, WorkShop,
      SupportBuilding, CheckoutShop, SecurityBuilding             buildings.py  what the U-2's photographs show near the pad
      ObservationPosts, SpoilHeap, CableConduit, FloodlightTower  rim.py        what stood round the flame pit's rim
      Outer/InnerFence<side>, LightPoles<side>, GuardTowers       perimeter.py  the double fence, its lights and its towers
    The roads are painted on the land (src/viewer/tyuratam.ts), as the tracks are. Returns a line of its sizes."""
    from site1 import buildings, bunker, perimeter, place, rim, storage

    sitelib.as_of(date)
    parts = Parts(place.materials())
    seen = dict(since="1957", confidence="documented")
    if sitelib.stood("Command bunker", **seen, source="HTA/JR-4/58 (U-2, August 1957); Chertok vol. 2 pp. 326-330; standing today"):
        bunker.build(parts)
    if sitelib.stood("Storage bunker of three bays", **seen, source="HTA/JR-4/58; PIC/JR-2/60; its three bays stand today"):
        storage.build(parts)
    buildings.build(parts)
    rim.build(parts)
    perimeter.build(parts)
    parts.build()
    print(sitelib.standing())
    return "; ".join((bunker.summary(), storage.summary(), buildings.summary(), rim.summary(), perimeter.summary()))

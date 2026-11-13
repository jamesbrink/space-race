"""Site 1, Tyuratam ("Gagarin's Start"), as it stood for the crewed Vostoks. Built by a flight's
model/pad.py; see ./site-1.md for every dimension, its confidence and source, and the moving parts' pivots.

The pieces are in ./site1/, one module each; each is one or more top-level nodes in pad.glb:
  Platform, FlamePit,
  FlameDeflector       platform.py        the slab on its pylons, its fence; the pit's lining and ground, the trenches and
                                          the sump on its base; the deflector under the opening
  DeckRails, Masts     deck.py            the rails in the deck; the two masts 110 ft high; the small building (under Platform)
  LaunchRing           launch_system.py   the turning ring, with Support_1..4 and Guide_1..4 under it
  ServiceTrusses       service_trusses.py the two service trusses, ServiceTruss_North and _South, hinged on the ring
  UpperCableMast       cable_mast.py      the cable mast to the third stage, hinged on the ring
  Erector              erector.py         the erector on the centre track, its boom up beside the rocket, with the lift

Frame: origin at the rocket's axis on the platform's deck, metres. +X is due east, out over the pit;
+Y is north. The rocket and the ring stand turned to the launch azimuth (site.TURN).
"""

from __future__ import annotations

import sitelib
from site1 import cable_mast, deck, erector, launch_system, platform, service_trusses
from site1.site import AZIMUTH, TAIL_Z, TIP_Z, TURN, Parts, materials

__all__ = ["AZIMUTH", "TAIL_Z", "TIP_Z", "TURN", "build", "build_place"]


def build(date: str | None = None) -> str:
    """Build the pad as it stood on `date` ("1961-04-12"; None: everything). Returns a line of its sizes."""
    sitelib.as_of(date)
    parts = Parts(materials())
    platform.build(parts, deck.slab_tracks())
    deck.build(parts)
    launch_system.build(parts)
    # what served the rocket that morning and was taken away before it left (each is built as it stood at the start)
    service_trusses.build(parts)
    cable_mast.build(parts)
    erector.build(parts)
    parts.build()
    print(sitelib.standing())
    served = f"{service_trusses.summary()}, {cable_mast.summary()}, {erector.summary()}"
    return f"{platform.summary()}, {deck.summary()}, rocket's tail {TAIL_Z:.2f} m, load ring {TIP_Z:.2f} m, {served}"


def build_place(date: str | None = None) -> str:
    """The rest of Site 1 as it stood on `date`, in the pad's frame: the site's own model (site1/model/<date>.py),
    which every flight from here in that state shows round its pad. Each piece says when it stood (sitelib.stood).
      CommandBunker                                               bunker.py     the mound over the firing room: periscopes, vents, entrance
      StorageBunker                                               storage.py    the three concrete bays west of it
      PropellantShed, CascadeFacility, PumpHouse, WorkShop,
      SupportBuilding, CheckoutShop, SecurityBuilding             buildings.py  what the U-2's photographs show near the pad
      ObservationPosts, SpoilHeap, CableConduit, FloodlightTower  rim.py        what stood round the flame pit's rim
      Tracks                                                      deck.py       the rails where they come up to the platform over the land
      Outer/InnerFence<side>, LightPoles<side>, GuardTowers       perimeter.py  the double fence, its lights and its towers
    The roads are painted on the land (src/viewer/tyuratam.ts), as the tracks are further off. Returns a line of its sizes."""
    from site1 import buildings, bunker, deck, perimeter, place, rim, storage

    sitelib.as_of(date)
    parts = Parts(place.materials())
    seen = dict(since="1957", confidence="documented")
    if sitelib.stood("Command bunker", **seen, source="HTA/JR-4/58 (U-2, August 1957); Chertok vol. 2 pp. 326-330; standing today"):
        bunker.build(parts)
    if sitelib.stood("Storage bunker of three bays", **seen, source="HTA/JR-4/58; PIC/JR-2/60; its three bays stand today"):
        storage.build(parts)
    buildings.build(parts)
    rim.build(parts)
    if sitelib.stood("Tracks onto the platform", **seen, source="HTA/JR-4/58 (five spurs in 1957); PIC/JR-2/61 Figure 1; OpenStreetMap"):
        deck.land_rails(parts)
    perimeter.build(parts)
    parts.build()
    print(sitelib.standing())
    return "; ".join((bunker.summary(), storage.summary(), buildings.summary(), rim.summary(), perimeter.summary()))

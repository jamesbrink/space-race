"""Site 1, Tyuratam ("Gagarin's Start"), as it stood for the crewed Vostoks. Built by a flight's
model/pad.py; see ./site-1.md for every dimension, its confidence and source, and the moving parts' pivots.

The pieces are in ./site1/, one module each; each is one or more top-level nodes in pad.glb:
  Platform, FlamePit   platform.py        the slab on its pylons, its fence; the pit's lining and ground
  LaunchRing           launch_system.py   the turning ring, with Support_1..4 and Guide_1..4 under it
  ServiceTrusses       service_trusses.py the two service trusses, ServiceTruss_North and _South, hinged on the ring
  UpperCableMast       cable_mast.py      the cable mast to the third stage, hinged on the ring
  Erector              erector.py         the erector on the centre track, its boom up beside the rocket, with the lift

Frame: origin at the rocket's axis on the platform's deck, metres. +X is due east, out over the pit;
+Y is north. The rocket and the ring stand turned to the launch azimuth (site.TURN).
"""

from __future__ import annotations

import sitelib
from site1 import cable_mast, erector, launch_system, platform, service_trusses
from site1.site import AZIMUTH, TAIL_Z, TIP_Z, TURN, Parts, materials

__all__ = ["AZIMUTH", "TAIL_Z", "TIP_Z", "TURN", "build"]


def build(date: str | None = None) -> str:
    """Build the pad as it stood on `date` ("1961-04-12"; None: everything). Returns a line of its sizes."""
    sitelib.as_of(date)
    parts = Parts(materials())
    platform.build(parts)
    launch_system.build(parts)
    # what served the rocket that morning and was taken away before it left (each is built as it stood at the start)
    service_trusses.build(parts)
    cable_mast.build(parts)
    erector.build(parts)
    parts.build()
    print(sitelib.standing())
    served = f"{service_trusses.summary()}, {cable_mast.summary()}, {erector.summary()}"
    return f"{platform.summary()}, rocket's tail {TAIL_Z:.2f} m, load ring {TIP_Z:.2f} m, {served}"

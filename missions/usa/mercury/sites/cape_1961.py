"""Cape Canaveral's launch complexes within a walk of Complex 5/6, as they stood: one top-level node a
complex, each in its own frame (cape/site.py), put where it stood by src/viewer/cape1961.ts. Built by
cape/model/<date>.py; ./cape.md records every dimension, its confidence and source, and what stood when.

  LC26        cape/lc26.py   pads 26A and 26B, their track, the Noble service structure, the blockhouse
  LC30        cape/lc30.py   Pershing: two pads, the mobile service tower, the two-storey blockhouse
  LC25, LC29  cape/lc25.py   Polaris: pad 25A and its tower, the ship motion simulator, pad 29A, their blockhouses
  LC17        cape/lc17.py   Thor: two pads, each with its launcher building, deck and service tower; the blockhouse
"""

from __future__ import annotations

import sitelib
from cape import lc17, lc25, lc26, lc30
from cape.site import Parts, materials

__all__ = ["build"]


def build(date: str | None = None) -> None:
    sitelib.as_of(date)
    parts = Parts(materials())
    lc26.build(parts)
    lc30.build(parts)
    lc25.build(parts)
    lc17.build(parts)
    parts.build()
    print(sitelib.standing())

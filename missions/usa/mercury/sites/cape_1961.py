"""Cape Canaveral's launch complexes within a walk of Complex 5/6, as they stood: one top-level node a
complex, each in its own frame (cape/site.py), put where it stood by src/viewer/cape1961.ts. Built by
cape/model/<date>.py; ./cape.md records every dimension, its confidence and source, and what stood when.

  LC26   cape/lc26.py   pads 26A and 26B, their track, the Noble service structure, the blockhouse
"""

from __future__ import annotations

import sitelib
from cape import lc26
from cape.site import Parts, materials

__all__ = ["build"]


def build(date: str | None = None) -> None:
    sitelib.as_of(date)
    parts = Parts(materials())
    lc26.build(parts)
    parts.build()
    print(sitelib.standing())

"""The transfer table: the rail-mounted table the service structure rolled on to, which "carried the Service Structure
from the Launch Stand area east to the Service Structure Parking Area, approximately 300' east of the Launch Stand"
(HAER FL-8-7, p. 22). Nothing else of it is published: its size is what carries the structure as modelled, its tracks
are OpenStreetMap's (site.py `TABLE_TRACKS`), and its form (a deck of steel on two girders, level with the paving,
the structure's two rails carried across it, eight wheels on the pit's two rails) is how such tables are built.
Estimated throughout.

  TransferTable            the deck, its girders, the two lengths of the structure's rails on it
  TransferTable_Wheel_n    its wheels, each on its axle (which lies along the stand, across its travel)

Built at the stand, where the structure rolls on to it.
"""

from __future__ import annotations

import sitelib
from srlib import FT

from .site import APRON, PIT, PIT_DEPTH, RAIL_TOP, RAIL_X, TABLE_HALF, TABLE_TRACKS, TABLE_Y, P, Parts, axle_cap, box, ftp, rail

G = "TransferTable"
WHEEL_R = 1.0
PIT_RAIL = APRON - PIT_DEPTH + 0.5  # the head of the pit's rails
WHEEL_X = (-38.0, -12.0, 12.0, 38.0)


def build(parts: Parts) -> None:
    # under the service structure's part, beside its tower, so that the two are carried east as one (../lc-14.parts.ts)
    parts.node(G, "ServiceStructure" if "ServiceStructure" in parts.nodes else None, (0.0, TABLE_Y, APRON))
    deck, steel = parts(G, "deck"), parts(G, "grey/girders")
    y0, y1 = PIT[0] + 0.25, PIT[1] - 0.25
    # the deck, in three strips between the structure's two rails, which are let in level with it
    for xa, xb in ((-TABLE_HALF, -RAIL_X - 0.3), (-RAIL_X + 0.3, RAIL_X - 0.3), (RAIL_X + 0.3, TABLE_HALF)):
        box(deck, (xa, y0, APRON - 0.4), (xb, y1, APRON))
    rails = parts(G, "rail", True)
    for s in (-1, 1):
        rail(rails, [(s * RAIL_X, PIT[0] + 0.004, RAIL_TOP), (s * RAIL_X, y1, RAIL_TOP)])
        box(steel, (s * RAIL_X - 0.9, y0, APRON - 1.6), (s * RAIL_X + 0.9, y1, APRON - 0.55))  # the beam under each
    # a girder over each of the pit's rails, and cross girders between them
    for yt in TABLE_TRACKS:
        for dy in (-1.3, 0.9):
            box(steel, (-TABLE_HALF, yt + dy, APRON - 2.3), (TABLE_HALF, yt + dy + 0.4, APRON - 0.41))
    for x in (-TABLE_HALF + 0.3, -17.0, 0.0, 17.0, TABLE_HALF - 0.3):
        box(steel, (x - 0.3, TABLE_TRACKS[0] + 1.31, APRON - 1.9), (x + 0.3, TABLE_TRACKS[1] - 1.31, APRON - 0.42))
    k = 0
    tread = [(0, -0.3), (0.8, -0.3), (WHEEL_R, -0.22), (WHEEL_R, 0.14), (1.1, 0.18), (1.1, 0.25), (0.4, 0.3), (0, 0.3)]
    for yt in TABLE_TRACKS:
        for x in WHEEL_X:
            k += 1
            name = f"{G}_Wheel_{k}"
            zc = PIT_RAIL + WHEEL_R
            parts.node(name, G, (x, yt, zc))
            w = parts(name, "grey", True)
            w.lathe(ftp(tread), sitelib.wheel_sides(24), matrix=sitelib.axes((x, yt, zc), (1, 0, 0), (0, 1, 0)))
            w.tube(P(x, yt - 0.85, zc), P(x, yt + 0.85, zc), 0.2 * FT, 10)
            for dy in (-1.31, 1.31):  # its bearings' caps, on the girders' outer faces
                axle_cap(parts(G, "grey/caps", True), (x, yt + dy, zc), (0, 1 if dy > 0 else -1, 0))

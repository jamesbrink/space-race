"""The command bunker, two hundred metres north of the rocket: node `CommandBunker`.

What is recorded of it:
  where       its outline on today's map (OpenStreetMap way 668506431, `military=bunker`, `location=underground`),
              its middle 3.6 m east and 206.6 m north of the rocket's axis. HTA/JR-4/58: "approximately 600 feet
              north of the launching platform", "in line with the servicing tower". Chertok (vol. 2, p. 326):
              "two hundred meters from the launch facility"
  its size    145 by 110 ft, the long side north to south (HTA/JR-4/58, PIC/JR-2/60: measured). The map's
              outline is 40 by 30 m, and the paved top seen from above today 43 by 37 m with rounded corners
  what it is  "an earth-covered control bunker" (HTA/JR-4/58); a bowl was dug, the bunker built in it, the bowl
              filled "and a concrete-encased hill was built upon it" (Chertok). So above the ground it is a low
              mound faced in concrete. Its rooms are some sixty steps down
  the roof    "some instruments or objects, possibly periscopes, situated on the roof" and "one unidentified object
              or vent ... at each corner" (HTA/JR-4/58); Figure 5 of PIC/JR-2/60 draws four objects south of the
              roof's middle and three corner objects, the north-west one "removed" by 1959, where "the probable
              personnel entrance" was found. Chertok: "two periscopes in the console room and two in the guest
              room". Four objects, four periscopes: they are taken for them
              room", naval ones (vol. 2, p. 330), "from old submarines" (vol. 3, p. 429)
  the way in  "about 60 steep steps" up from the rooms, then "another five to seven meters once you'd reached the
              top" before the rocket could be seen (Chertok, vol. 2, p. 330); a "smoking room" on the surface, "not
              far from the entrance" (p. 360, of the night of the first launch in 1957)

What is estimated: the mound's height and batter (the CIA's figure for the top's height against the platform is
redacted), the form of the periscopes' heads, the vents and the entrance, the entrance's facing, and the smoking
place (benches round a sunk drum, as such a place was on any Soviet range: its form and its place are ours). The rooms
below (five, Chertok) are not modelled: their plan is not published, and the land is not cut for the stair. The
entrance's door is therefore built shut.
"""

from __future__ import annotations

import math

from mathutils import Matrix

import sitelib

from .place import FOOTING, rounded
from .site import FT, GROUND, P, Parts, box, fine, obox, profile, stood

CENTRE = (3.6, 206.6)  # the middle of today's outline, m east and north of the rocket (OpenStreetMap way 668506431)
LONG, WIDE = 145.0 * FT, 110.0 * FT  # north to south, east to west (HTA/JR-4/58)
HEIGHT = 3.0  # the mound's top over the ground, m (estimated: low enough that the entrance's head stands out of its side)
BATTER = 4.5  # how far its sides run out, m: 1 in 1.5 (estimated)
CORNER = 6.0  # the radius its corners are rounded to at the foot, m (estimated from the paved top seen from above today)
SLAB = 3.0  # the facing's slabs, m square (estimated)
# The four periscopes and the three corner objects, m east and north of the bunker's middle: scaled off Figure 5
# (3.49 px a metre), so good to two or three metres.
PERISCOPES = [(-3.4, -2.0), (0.0, -5.7), (4.3, -0.9), (7.2, -0.9)]
VENTS = [(11.8, 16.4), (11.8, -16.4), (-11.8, -16.4)]  # north-east, south-east, south-west: set in from the top's corners (estimated)
PERISCOPE_HEAD = 2.0  # a head's window over the roof, m (estimated)
ENTRANCE_Y = 15.0  # the entrance's middle north of the bunker's middle, m: in the north-west corner (PIC/JR-2/60); the figure estimated


def top() -> float:
    return GROUND + HEIGHT


def build(parts: Parts) -> None:
    g = "CommandBunker"
    parts.node(
        g,
        label="Command bunker",
        about=(
            "The firing room is some sixty steps down under this mound, and the launch was commanded from it, watched through four "
            "periscopes off old submarines. Its place is today's map's and its size the CIA's (145 by 110 ft); the mound's height, "
            "the periscopes' heads, the vents and the entrance are estimated. The rooms below are not modelled."
        ),
    )
    cx, cy = CENTRE
    zt = top()
    conc, joints = parts(g, "concrete/mound"), parts(g, "joint")
    # the mound: its foot is the CIA's 145 by 110 ft, its top set in by the batter
    foot = rounded(cx, cy, WIDE, LONG, CORNER)
    crown = sitelib.offset_poly(foot, -BATTER)
    sitelib.slab(conc, crown, GROUND - FOOTING, zt, spread=BATTER)
    # its top faced in slabs: each its own, proud of the mound, on a dark bed that shows in the joints
    hx, hy = WIDE / 2 - BATTER - 0.5, LONG / 2 - BATTER - 0.5
    sitelib.panels(parts(g, "concrete/facing"), joints, cx - hx, cy - hy, cx + hx, cy + hy, SLAB, top=zt + 0.14, bottom=zt - 0.1, gap=0.05, inset=0.2)

    # the four periscopes: an armoured upstand, the tube, and a head with its window toward the rocket
    steel, dark, lens = parts(g, "grey/periscopes", True), parts(g, "dark/periscopes"), parts(g, "void/periscopes")
    for dx, dy in PERISCOPES:
        x, y = cx + dx, cy + dy
        box(conc, (x - 0.55, y - 0.55, zt - 0.2), (x + 0.55, y + 0.55, zt + 0.55))
        steel.lathe(
            profile([(0.0, 0.5), (0.2, 0.5), (0.2, 0.75), (0.11, 0.8), (0.11, PERISCOPE_HEAD - 0.3), (0.0, PERISCOPE_HEAD - 0.3)]),
            16,
            matrix=Matrix.Translation(P(x, y, zt)),
        )
        box(steel, (x - 0.16, y - 0.17, zt + PERISCOPE_HEAD - 0.32), (x + 0.16, y + 0.17, zt + PERISCOPE_HEAD + 0.22))
        # the window, on the side toward the rocket (south), under a hood
        box(lens, (x - 0.1, y - 0.19, zt + PERISCOPE_HEAD - 0.12), (x + 0.1, y - 0.15, zt + PERISCOPE_HEAD + 0.12))
        box(dark, (x - 0.19, y - 0.3, zt + PERISCOPE_HEAD + 0.15), (x + 0.19, y + 0.2, zt + PERISCOPE_HEAD + 0.25))
        if fine():  # the collar's bolts
            for k in range(8):
                a = math.tau * (k + 0.5) / 8
                steel.disc(P(x + 0.155 * math.cos(a), y + 0.155 * math.sin(a), zt + 0.75), (0, 0, 1), 0.02, 0.02, 6)

    # the corner vents: a concrete shaft's head under a steel cowl (the north-west one had gone by 1959: PIC/JR-2/60)
    cowl = parts(g, "grey/vents", True)
    for dx, dy in VENTS:
        x, y = cx + dx, cy + dy
        conc_r = parts(g, "concrete/vents", True)
        conc_r.lathe(profile([(0.0, -0.2), (0.75, -0.2), (0.75, 0.9), (0.0, 0.9)]), 20, matrix=Matrix.Translation(P(x, y, zt)))
        cowl.lathe(
            profile([(0.0, 0.85), (0.35, 0.85), (0.35, 1.25), (1.0, 1.3), (1.0, 1.38), (0.3, 1.75), (0.0, 1.8)]),
            20,
            matrix=Matrix.Translation(P(x, y, zt)),
        )

    # the entrance, in the north-west corner: a concrete head standing out of the mound's west side over the stair,
    # its steel door facing west, a low wall either side holding the bank back
    ex, ey = cx - WIDE / 2 - 0.6, cy + ENTRANCE_Y
    head = [(ex, ey - 1.6), (ex + 6.2, ey - 1.6), (ex + 6.2, ey + 1.6), (ex, ey + 1.6)]
    walls = sitelib.ring(head, 0.4)
    zh = GROUND + 2.65
    skin = parts(g, "concrete/entrance")
    for i, w in enumerate(walls):
        w.build(skin, -FOOTING, zh, [(1.1, 2.1, GROUND + 0.04, GROUND + 2.1)] if i == 3 else [])
    sitelib.slab(skin, sitelib.offset_poly(head, 0.3), zh, zh + 0.3, bottom=True)
    sitelib.wall_door(parts, f"{g}_Door", g, walls[3], 1.1, 2.1, GROUND + 0.04, GROUND + 2.1, depth=0.15, fittings="lever", works=False)
    obj = parts.nodes[f"{g}_Door"][0]
    obj["label"] = "Door to the bunker's stair, kept shut"
    obj["about"] = (
        "Sixty steep steps went down from here to five rooms (Chertok). Their plan is not published: they are not drawn, and the door stays shut."
    )
    for s in (-1, 1):  # the wing walls
        y0, y1 = sorted((ey + s * 1.6, ey + s * 2.0))
        box(skin, (ex + 0.3, y0, -FOOTING), (ex + 4.6, y1, GROUND + 1.9))
    box(skin, (ex - 1.6, ey - 1.3, -FOOTING), (ex + 0.02, ey + 1.3, GROUND + 0.02))  # the threshold slab before the door
    # the smoking place "not far from the entrance" (Chertok, 1957): three benches round a drum sunk in the ground
    if stood(
        "Smoking place by the bunker's entrance",
        since="1957-06",
        confidence="estimated",
        source="Chertok vol. 2 p. 360: 'the smoking room, not far from the entrance to the bunker', June 1957; its form and place are ours",
    ):
        wood, iron = parts(g, "plank/benches"), parts(g, "dark/benches")
        sx, sy = ex - 7.0, ey + 3.0
        for dx, dy, along in ((0.0, 1.5, (1, 0)), (0.0, -1.5, (1, 0)), (-1.5, 0.0, (0, 1))):
            ax, ay = along
            for k in (-1, 1):  # two posts in the ground and the seat's bearers
                box(
                    iron,
                    (sx + dx + k * ax * 0.8 - 0.05, sy + dy + k * ay * 0.8 - 0.05, -FOOTING),
                    (sx + dx + k * ax * 0.8 + 0.05, sy + dy + k * ay * 0.8 + 0.05, GROUND + 0.41),
                )
            for off in (-0.13, 0.0, 0.13):  # three boards
                obox(wood, (sx + dx - ay * off, sy + dy + ax * off, GROUND + 0.435), (ax, ay, 0), (0, 0, 1), (2.0, 0.11, 0.045))
        parts(g, "dark/drum", True).lathe(
            profile([(0.0, -0.4), (0.3, -0.4), (0.3, 0.12), (0.27, 0.12), (0.27, -0.25), (0.0, -0.25)]),
            16,
            matrix=Matrix.Translation(P(sx, sy, GROUND)),
        )
    obox(skin, (ex + 3.1, ey, zh + 0.45), (1, 0, 0), (0, 0, 1), (0.5, 0.5, 0.3))  # a vent stub on the head's roof


def summary() -> str:
    return f"bunker {LONG:.1f} by {WIDE:.1f} m ({LONG / FT:.0f} by {WIDE / FT:.0f} ft), its middle {CENTRE[1]:.1f} m north, mound {HEIGHT:.1f} m"

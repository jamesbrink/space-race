"""The 101-foot Gemini umbilical tower beside the Atlas, in feet above the stand.

The height is the Cape Canaveral Space Force Museum's. NASA 66-H-296 and 66-H-989 (SP-4002, figs. 120 and 125)
show the narrow tower, projecting upper galleries and two lengths of umbilical boom. The plan, bay count, access
ladder and exact position of the feet are estimates. It stands where the Mercury tower served the stand.
"""

from __future__ import annotations

from .site import Parts, beam, box, handrail, lattice

TOP = 101.0
NAME = "AgenaUmbilicalTower"
BOOM = NAME + "_Boom"
CENTRE = (14.0, -26.0)
GALLERIES = (29.0, 75.0, 87.0, TOP - 3.5)


def build(parts: Parts) -> None:
    parts.node(NAME)
    frame = parts(NAME, "orange")
    x, y = CENTRE

    def corner(i, z):
        half = 4.5 - min(max(z, 0.0), 35.0) / 35.0  # broader below the boom
        return (x + (half if i in (1, 2) else -half), y + (half if i in (2, 3) else -half), z)

    lattice(frame, corner, [-0.18, 10, 20, 30, 40, 50, 60, 70, 80, 90, GALLERIES[-1] - 0.18], 0.46, 0.29)
    for i, z in enumerate(GALLERIES):
        half = 6.2 if i == 3 else 4.8
        west = x - 5.8
        box(parts(NAME, "deck"), (west, y - half, z - 0.5), (x + half, y + half, z))
        handrail(
            frame,
            [(west, y - 1.1, z), (west, y - half, z), (x + half, y - half, z), (x + half, y + half, z), (west, y + half, z), (west, y + 1.1, z)],
        )
        # An outside run clears the gallery edge. Break at each landing, with a gap in the rail.
        parts.ladder(
            NAME, f"gallery_{i + 1}", (west - 0.5, y, GALLERIES[i - 1] if i else 0), (west - 0.5, y, z), face=(1, 0, 0), mat="grey", width=1.65
        )

    # The main arm rises from about one third of the shaft and bends back toward the vehicle (66-H-989). Its own node,
    # origin on its foot: its tip stands 3 ft from the axis beside the Agena, inside the Atlas's 5 ft radius, so it has
    # to go back before the Atlas comes up through where it stood (lc-14.md).
    parts.node(BOOM, NAME, (x - 2, y + 4, 32))
    arm = parts(BOOM, "grey/boom")
    # A pair of side plates and diagonal ties at the elbow. Their junction is inside the pin housing.
    for side in (-1, 1):
        foot = (x - 2 + side * 0.7, y + 4, 32)
        elbow = (6 + side * 0.7, -5, 84)
        tip = (1.6 + side * 0.58, -2.6, 93)
        beam(arm, foot, elbow, 0.55)
        beam(arm, elbow, tip, 0.44)
    for t in (0.12, 0.30, 0.48, 0.66, 0.84):

        def at(s, side):
            return (x - 2 + (8 - x) * s + side * 0.7, y + 4 + (-9 - y) * s, 32 + 52 * s)

        beam(arm, at(t, -1), at(t + 0.10, 1), 0.17)

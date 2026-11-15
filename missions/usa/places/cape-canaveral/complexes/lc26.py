"""Launch Complex 26: the Army's two Redstone, Jupiter and Juno pads north of Complex 5/6, their one
service structure and their blockhouse. One node, `LC26`.

Frame: the origin is pad 26B's centre; +Y runs along the track toward pad 26A, 025 degrees true (the
line through pads 5 and 6 carried on: *A Noble Endeavor* pp. 7-8); +X is 115 degrees, east-south-east.
Feet. ../cape.md has every figure's source and confidence; in short:

  documented  two pads, one gantry between them on rails, built by Noble in 1957, 111 ft 9 in to its
              top rail; a blockhouse 400 ft from each pad with walls 2 ft thick and a vaulted roof;
              at each pad a generator building, a fuel-truck revetment and two deluge monitors behind
              5 ft walls (the Cape Canaveral Space Force Museum's pages; the gantry's blueprint there)
  derived     where each thing stands (OpenStreetMap's outlines of what survives, as distance and
              bearing from a pad); the gantry's base, as its twin's on pad 5 (61 by 26 ft)
  estimated   every other size, scaled off the blueprint's photograph and the photographs of 1959 to
              1961; that the gantry stood at 26B on 5 May 1961 (see cape.md: no source says)
"""

from __future__ import annotations

import math

from .site import (
    FOOTING,
    FT,
    GROUND,
    P,
    Parts,
    at,
    axes,
    beam,
    box,
    ftp,
    handrail,
    obox,
    plate,
    prism,
    rails,
    slab,
    stood,
    wedge_blockhouse,
)

NODE = "LC26"
HEADING = 25.0  # the frame's +Y, degrees true
PAD_A = (0.0, 518.0)  # 26A from 26B: 518 ft on 025.0 degrees (derived from the two pads' coordinates)
APRON = 200.0  # each pad's concrete, a square on the track (estimated: 3.3 gantry bases across in the aerial of January 1961)
BLOCKHOUSE_APEX = (-303.0, 259.0)  # the point of its wedge: 399 ft from each pad (OpenStreetMap way 195709357; the museum: "a mere 400 feet")

# The gantry (documented unless said): its top rail; its base as its twin's.
TOP_RAIL = 111.75
BASE = (61.0, 26.0)  # long, wide
MAST_Y = -7.0  # the mast's plane, behind a vehicle on the pad's centre (estimated)
DECK = 9.5  # the base's deck (estimated, as pad 5's)
HEAD = 104.0  # the legs' heads, under the crane (estimated: the blueprint's hammerhead deck at about 102 ft)
LEGS = (
    13.0,
    7.0,
)  # each leg's distance from the middle at the deck and at the head (estimated: about 29 and 14 ft apart on the blueprint, on a base 26 wide)
PLATFORM = (34.0, 14.0)  # wide, deep (width estimated from the blueprint and checked against Juno II's length in a photograph)
LEVELS = {"I": 45.0, "II": 51.0, "III": 61.0, "IV": 81.0}  # floors above the rail (estimated off the blueprint, within a tenth)
BOOM = (-30.0, 28.0)  # the hammerhead's ends along the track: 58 ft, the long arm over the pad (estimated)


def leg_x(z: float) -> float:
    return LEGS[0] + (LEGS[1] - LEGS[0]) * (z - DECK) / (HEAD - DECK)


def pad(parts: Parts, centre, *, cannons, generator, revetment) -> None:
    """A pad: its apron, the scale platform at its middle, the launch stand, and what stood round it."""
    cx, cy = centre
    h = APRON / 2
    slab(parts(NODE, "concrete"), [(cx - h, cy - h), (cx + h, cy - h), (cx + h, cy + h), (cx - h, cy + h)], GROUND - FOOTING, 0.0)
    # the scale platform: a steel square let into the concrete, the scale room under it (its size is not recorded: estimated)
    box(parts(NODE, "deck"), (cx - 7.0, cy - 7.0, -0.5), (cx + 7.0, cy + 7.0, 0.2))
    # the launch stand: a ring table on four legs over a cone that turns the jet aside (estimated: 10 ft across, 5.5 ft high)
    steel = parts(NODE, "black", True)
    m = axes((cx, cy, 0.0), (1, 0, 0), (0, 0, 1))
    steel.lathe(ftp([(3.7, 4.7), (5.0, 4.7), (5.0, 5.5), (3.7, 5.5), (3.7, 4.7)]), 24, matrix=m)
    steel.lathe(ftp([(0.0, 0.2), (3.3, 0.2), (0.5, 3.4), (0.0, 3.6)]), 20, matrix=m)
    for k in range(4):
        q = math.tau * (k + 0.5) / 4
        beam(steel, (cx + 4.4 * math.cos(q), cy + 4.4 * math.sin(q), 4.8), (cx + 6.0 * math.cos(q), cy + 6.0 * math.sin(q), 0.2), 0.55)
        box(
            steel,
            (cx + 6.0 * math.cos(q) - 0.7, cy + 6.0 * math.sin(q) - 0.7, 0.2),
            (cx + 6.0 * math.cos(q) + 0.7, cy + 6.0 * math.sin(q) + 0.7, 0.32),
        )
    # two deluge monitors, each behind a wall 5 ft high (documented) and 16 ft long (derived), striped on the pad's side
    white, dark, pipe = parts(NODE, "white"), parts(NODE, "black/stripes"), parts(NODE, "grey", True)
    for bearing in cannons:
        wx, wy = at(90.0, bearing, HEADING, centre)
        out = ((cx - wx) / 90.0, (cy - wy) / 90.0)  # toward the pad
        along = (-out[1], out[0])
        obox(white, (wx, wy, (5.0 + GROUND - 1.0) / 2), (*along, 0), (0, 0, 1), (16.0, 1.0, 5.0 - GROUND + 1.0))
        for k in range(5):  # the stripes, each a band leaning across the face, standing off it
            a0 = -8.0 + 3.2 * k
            pts = [(a0 + 0.3, 0.3), (a0 + 1.7, 0.3), (a0 + 2.9, 4.7), (a0 + 1.5, 4.7)]
            plate(dark, [(wx + along[0] * a + out[0] * 0.58, wy + along[1] * a + out[1] * 0.58, z) for a, z in pts], 0.16)
        px, py = wx - out[0] * 3.0, wy - out[1] * 3.0  # the monitor, behind it
        pipe.tube(P(px, py, GROUND - 1.0), P(px, py, 5.6), 0.3 * FT, 10)
        beam(pipe, (px, py, 5.6), (px + out[0] * 3.4, py + out[1] * 3.4, 7.4), 0.4)
    # the generator building: reinforced concrete, flat-roofed, 23 by 17 ft (derived) and about 10 ft high (estimated)
    gx, gy = at(generator[0], generator[1], HEADING, centre)
    rect = [(gx - 8.5, gy - 11.5), (gx + 8.5, gy - 11.5), (gx + 8.5, gy + 11.5), (gx - 8.5, gy + 11.5)]
    prism(parts(NODE, "bunker"), rect, GROUND - FOOTING, 10.0)
    prism(parts(NODE, "tar"), [(gx - 9.2, gy - 12.2), (gx + 9.2, gy - 12.2), (gx + 9.2, gy + 12.2), (gx - 9.2, gy + 12.2)], 10.0, 10.6)
    box(parts(NODE, "blast"), (gx + 8.3, gy - 2.0, 0.0), (gx + 8.75, gy + 2.0, 7.2))  # its door, toward the pad, shut
    box(parts(NODE, "void"), (gx - 5.0, gy + 11.3, 5.5), (gx + 5.0, gy + 11.75, 8.5))  # a louvre
    # the fuel-truck revetment: a white wall on three sides, 33 by 21 ft (derived) and about 10 ft high (estimated), open away from the pad
    rx, ry = at(revetment[0], revetment[1], HEADING, centre)
    lo, hi = GROUND - FOOTING, 10.0
    box(white, (rx + 9.5, ry - 16.5, lo), (rx + 10.5, ry + 16.5, hi))
    for side in (-1, 1):
        box(white, (rx - 10.5, ry + side * 16.5 - 0.5, lo), (rx + 9.5, ry + side * 16.5 + 0.5, hi))


def gantry(parts: Parts) -> None:
    """The service structure, standing at 26B with its platforms closed: a long trussed base on four rail trucks, an
    A-frame mast of two legs at its pad end braced back to it, platforms carried forward of the mast (the enclosed
    ones white, with a band of windows), and a hammerhead crane along the track over its head."""
    red, white, galv, grey, void = (
        parts(NODE, "red"),
        parts(NODE, "white/cabins"),
        parts(NODE, "deck/gantry"),
        parts(NODE, "grey/gantry"),
        parts(NODE, "void/gantry"),
    )
    long, wide = BASE
    y1, y0 = MAST_Y + 2.0, MAST_Y + 2.0 - long  # the base lies back along the track, toward Complex 5/6 (the aerial of January 1961)
    # ---- the base: a truss over each pair of rails, cross frames, a deck, the office and the generator on it
    for sx in (-1, 1):
        x = sx * (wide / 2 - 1.5)
        beam(red, (x, y0, 3.0), (x, y1, 3.0), 1.1)
        beam(red, (x, y0, DECK - 0.5), (x, y1, DECK - 0.5), 1.1)
        bays = 6
        for k in range(bays + 1):
            y = y0 + (y1 - y0) * k / bays
            beam(red, (x, y, 3.0), (x, y, DECK - 0.5), 0.7)
            if k < bays:
                ya = y0 + (y1 - y0) * (k + 1) / bays
                beam(red, (x, y if k % 2 == 0 else ya, 3.0), (x, ya if k % 2 == 0 else y, DECK - 0.5), 0.55)
    for y in (y0 + 0.6, (y0 + y1) / 2, y1 - 0.6):
        beam(red, (-wide / 2 + 1.5, y, DECK - 0.5), (wide / 2 - 1.5, y, DECK - 0.5), 0.9)
    box(galv, (-wide / 2 + 0.6, y0, DECK), (wide / 2 - 0.6, y1 - 6.0, DECK + 0.25))
    box(white, (-9.0, y0 + 2.0, DECK + 0.25), (1.0, y0 + 16.0, DECK + 8.5))  # the office and ready room
    box(void, (-9.2, y0 + 5.0, DECK + 4.2), (1.2, y0 + 13.0, DECK + 6.4))
    box(grey, (3.5, y0 + 3.0, DECK + 0.25), (10.0, y0 + 13.0, DECK + 6.0))  # the standby generator
    handrail(
        red,
        [
            (-wide / 2 + 0.8, y1 - 6.2, DECK + 0.25),
            (-wide / 2 + 0.8, y0 + 0.2, DECK + 0.25),
            (wide / 2 - 0.8, y0 + 0.2, DECK + 0.25),
            (wide / 2 - 0.8, y1 - 6.2, DECK + 0.25),
        ],
    )
    for sx in (-1, 1):  # four trucks, each on two axles
        for y in (y0 + 6.0, y1 - 6.0):
            x = sx * (wide / 2 - 1.5)
            box(grey, (x - 2.6, y - 4.0, 1.3), (x + 2.6, y + 4.0, 2.9))
            for dy in (-2.2, 2.2):
                grey.tube(P(x - 2.9, y + dy, 1.28), P(x + 2.9, y + dy, 1.28), 1.25 * FT, 14)
    # ---- the mast: two legs, each a pair of chords laced together, leaning in to the head
    for sx in (-1, 1):
        zs = [DECK + (HEAD - DECK) * k / 12 for k in range(13)]
        for k, (za, zb) in enumerate(zip(zs, zs[1:])):
            for dy in (-2.0, 2.0):
                beam(red, (sx * leg_x(za), MAST_Y + dy, za), (sx * leg_x(zb), MAST_Y + dy, zb), 0.9)
            flip = 2.0 if k % 2 else -2.0
            beam(red, (sx * leg_x(za), MAST_Y + flip, za), (sx * leg_x(zb), MAST_Y - flip, zb), 0.45)
            beam(red, (sx * leg_x(zb), MAST_Y - 2.0, zb), (sx * leg_x(zb), MAST_Y + 2.0, zb), 0.45)
        beam(red, (sx * leg_x(45.0), MAST_Y - 2.0, 45.0), (sx * (wide / 2 - 1.5), MAST_Y - 34.0, DECK - 0.5), 1.0)  # the back brace
    for z in (22.0, *LEVELS.values(), 71.0, 92.0, HEAD):  # across, between the legs
        beam(red, (-leg_x(z), MAST_Y, z), (leg_x(z), MAST_Y, z), 0.7)
    for za, zb in ((61.0, 71.0), (71.0, 81.0), (92.0, HEAD)):
        beam(red, (-leg_x(za), MAST_Y, za), (leg_x(zb), MAST_Y, zb), 0.5)
        beam(red, (leg_x(za), MAST_Y, za), (-leg_x(zb), MAST_Y, zb), 0.5)
    # ---- the platforms, forward of the mast: one low and one at level I open and railed; II, III and IV enclosed
    pw, pd = PLATFORM
    ya, yb = MAST_Y + 3.2, MAST_Y + 3.2 + pd  # clear of the legs' forward chords
    for z in (22.0, LEVELS["I"]):
        box(galv, (-pw / 2, ya, z - 0.5), (pw / 2, yb, z))
        handrail(red, [(-pw / 2 + 0.2, ya, z), (-pw / 2 + 0.2, yb - 0.2, z), (pw / 2 - 0.2, yb - 0.2, z), (pw / 2 - 0.2, ya, z)])
    for name in ("II", "III", "IV"):
        z = LEVELS[name]
        box(galv, (-pw / 2 - 0.5, ya - 0.5, z - 0.6), (pw / 2 + 0.5, yb + 0.5, z))
        box(white, (-pw / 2, ya, z), (pw / 2, yb, z + 8.0))
        box(galv, (-pw / 2 - 0.5, ya - 0.5, z + 8.0), (pw / 2 + 0.5, yb + 0.5, z + 8.4))
        box(void, (-pw / 2 - 0.2, ya + 1.5, z + 3.6), (pw / 2 + 0.2, yb - 1.5, z + 5.6))  # the band of windows, through both sides
        box(void, (-pw / 2 + 1.5, yb - 1.0, z + 3.6), (pw / 2 - 1.5, yb + 0.2, z + 5.6))  # and across the front
    for z in (22.0, *LEVELS.values()):  # a raking bracket under each, from the legs
        for sx in (-1, 1):
            beam(red, (sx * leg_x(z - 7.0), MAST_Y + 2.0, z - 7.0), (sx * (pw / 2 - 2.0), yb - 2.0, z - 0.6), 0.5)
    # ---- the hammerhead: a boxed truss along the track across the mast's head, a railed deck on it, the hoist's house
    b0, b1 = MAST_Y + BOOM[0], MAST_Y + BOOM[1]
    top = TOP_RAIL - 3.5  # the deck its rail stands on
    for sx in (-1, 1):
        x = sx * 3.5
        beam(red, (x, b0, HEAD), (x, b1, HEAD), 0.8)
        beam(red, (x, b0, top - 0.4), (x, b1, top - 0.4), 0.8)
        n = 8
        for k in range(n + 1):
            y = b0 + (b1 - b0) * k / n
            beam(red, (x, y, HEAD), (x, y, top - 0.4), 0.45)
            if k < n:
                ynext = b0 + (b1 - b0) * (k + 1) / n
                beam(red, (x, y if k % 2 == 0 else ynext, HEAD), (x, ynext if k % 2 == 0 else y, top - 0.4), 0.4)
        beam(red, (sx * LEGS[1], MAST_Y, HEAD), (x, MAST_Y, HEAD), 0.8)
    box(galv, (-4.2, b0, top - 0.25), (4.2, b1, top))
    handrail(red, [(-4.0, b0 + 0.2, top), (-4.0, b1 - 0.2, top), (4.0, b1 - 0.2, top), (4.0, b0 + 0.2, top), (-4.0, b0 + 0.2, top)])
    box(grey, (-3.0, b0 + 2.0, top), (3.0, b0 + 10.0, top + 5.5))  # the hoist's house, on the short arm


def build(parts: Parts) -> None:
    parts.node(NODE, label="Launch Complex 26")
    stood(
        "Complex 26: two pads, their track, the blockhouse, a generator building, a revetment and two monitors a pad",
        since="1957",
        confidence="documented",
        source="the Cape Canaveral Space Force Museum: first launch 28 August 1957; all of it stands today",
    )
    pad(parts, (0.0, 0.0), cannons=(73.0, 253.0), generator=(123.0, 313.0), revetment=(137.0, 265.0))
    pad(parts, PAD_A, cannons=(335.0, 156.0), generator=(123.0, 279.0), revetment=(137.0, 327.0))
    rails(parts, NODE, -APRON / 2 - 60.0, PAD_A[1] + APRON / 2 + 30.0)
    # the blockhouse: the hardened part 47 ft across and 46 ft from its point to its back wall, an annexe behind (derived, from
    # today's outline); walls about 14 ft and the vault's crown about 18 ft 10 in (estimated: Complex 17's, of the same pattern)
    wedge_blockhouse(parts, NODE, BLOCKHOUSE_APEX, 0.0, 47.0, 46.0, 14.0, 18.83, annexe=50.0)
    covers = parts(NODE, "deck/trench")  # the cable trench to each pad, under steel plates (documented; its line is estimated: straight)
    for px, py in ((0.0, 0.0), PAD_A):
        ax, ay = BLOCKHOUSE_APEX
        t = (-APRON / 2 - ax) / (px - ax)  # where its line meets the apron's edge
        ex, ey = ax + (px - ax) * t, ay + (py - ay) * t
        length = math.hypot(ex - ax, ey - ay)
        along = ((ex - ax) / length, (ey - ay) / length, 0.0)
        obox(covers, ((ax + ex) / 2 + along[0] * 2.0, (ay + ey) / 2 + along[1] * 2.0, -0.4), along, (0, 0, 1), (length - 4.0, 3.0, 1.1))
    if stood(
        "Complex 26's service structure at pad 26B",
        since="1961-05",
        until="1961-05",
        confidence="estimated",
        source="it served both pads on one track; Juno II flew from 26B on 27 April and 24 May 1961; no source read says where it stood on 5 May",
    ):
        gantry(parts)

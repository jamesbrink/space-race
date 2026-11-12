"""Launch Complexes 25 and 29: the Navy's Polaris pads south of Complex 5/6. Two nodes, `LC25` and `LC29`.

Frames, in feet. LC25: the origin is pad 25A's centre; +Y runs to pad 25B, 213 degrees true. LC29: the origin is
pad 29A's centre; +Y is 203 degrees, the line the two complexes' blockhouses lie on. +X is ninety degrees
clockwise of +Y in each. ../cape.md has every figure's source and confidence; in short:

  documented  25A a flat pad of December 1957 "with an access stand"; 25B the ship motion simulator, a pit 33 ft
              square and 55 ft deep, last fired from in August 1960 and idle in May 1961; one blockhouse. Complex 29
              of 1958-59: one pad with "an access stand", in use from January 1961 (the museum; Spaceline)
  derived     where the pads and blockhouses stand (OpenStreetMap); that a closed tower stood at 25A by May 1961
              (it is behind the missile in a photograph of 9 March 1960)
  estimated   every size and form. 25A's tower is drawn as photographed about 1963. Complex 29's own closed tower
              is first seen about 1963 and is left out: its pad has what the photographs of 1961 show
"""

from __future__ import annotations

from .site import FOOTING, GROUND, P, Parts, apron, at, beam, box, lattice, obox, park, prism, ring_stand, stood, wedge_blockhouse


def build(parts: Parts) -> None:
    # ---------------------------------------------------------------- Complex 25
    node, heading = "LC25", 213.0
    parts.node(node, label="Launch Complex 25")
    stood(
        "Complex 25: pad 25A, the ship motion simulator at 25B, the blockhouse",
        since="1959-08",
        confidence="documented",
        source="the museum: 25A complete December 1957; Spaceline: the simulator first used 14 August 1959, mothballed October 1961",
    )
    pad_b = (0.0, 435.0)
    apron(parts, node, (0.0, 0.0), 150.0)  # (size estimated: no figure for 1961)
    ring_stand(parts, node, (0.0, 0.0), 8.0, 6.0, legs=6)
    if stood(
        "Pad 25A's closed service tower",
        since="1960-03",
        confidence="estimated",
        source="behind the missile in the photograph of 9 March 1960 (Commons, A1X-14); its form is Spaceline's photograph of about 1963",
    ):
        # a white slab-sided tower, 58 ft tall and 20 ft square, stepped at the top, cut away at the foot toward the pad (estimated)
        white, void = parts(node, "white"), parts(node, "void")
        tx, ty = 34.0, 0.0
        box(white, (tx - 10.0, ty - 10.0, 9.0), (tx + 10.0, ty + 10.0, 50.0))
        box(white, (tx - 4.0, ty - 10.0, GROUND - FOOTING), (tx + 10.0, ty + 10.0, 9.0))
        box(white, (tx - 2.0, ty - 7.0, 50.0), (tx + 10.0, ty + 7.0, 58.0))
        box(void, (tx - 10.2, ty - 6.0, 30.0), (tx - 9.0, ty + 6.0, 46.0))  # the opening its platforms reached the missile through, closed
        beam(parts(node, "grey", True), (tx - 2.0, ty, 57.0), (tx - 16.0, ty, 57.0), 1.0)  # the hoist beam
        # its frame showing through the cladding: posts at the corners, a girt at each floor, the door at its foot (estimated)
        frame = parts(node, "grey")
        for sx in (-1, 1):
            for sy in (-1, 1):
                box(frame, (tx + sx * 10.0 - 0.35, ty + sy * 10.0 - 0.35, 0.0), (tx + sx * 10.0 + 0.35, ty + sy * 10.0 + 0.35, 50.2))
        for z in (9.0, 19.0, 29.0, 39.0, 49.6):
            box(frame, (tx - 10.25, ty - 10.25, z), (tx + 10.25, ty + 10.25, z + 0.6))
        box(parts(node, "blast"), (tx + 9.8, ty - 2.0, 0.0), (tx + 10.3, ty + 2.0, 7.2))
    # 25B: the simulator's pit head, a concrete kerb 33 ft square (documented) under a steel frame (estimated, from a photograph of about 1959)
    bx, by = pad_b
    apron(parts, node, pad_b, 120.0)
    kerb = parts(node, "bunker")
    for x0, y0, x1, y1 in ((-18.5, -18.5, 18.5, -16.5), (-18.5, 16.5, 18.5, 18.5), (-18.5, -16.5, -16.5, 16.5), (16.5, -16.5, 18.5, 16.5)):
        box(kerb, (bx + x0, by + y0, GROUND - FOOTING), (bx + x1, by + y1, 3.0))
    box(parts(node, "deck"), (bx - 16.6, by - 16.6, 1.6), (bx + 16.6, by + 16.6, 2.0))  # the pit covered over: it was idle
    lattice(
        parts(node, "grey"), lambda i, z: (bx + 14.0 * (1 if i in (0, 3) else -1), by + 14.0 * (1 if i < 2 else -1), z), [3.0, 12.0, 21.0], 0.8, 0.4
    )
    # the blockhouse (its place derived; plan and height estimated, of the Cape's pattern)
    hx, hy = at(395.0, 259.0, heading)
    wedge_blockhouse(parts, node, (hx - 30.0, hy), 180.0, 46.0, 60.0, 14.0, 18.83, annexe=30.0)

    park(parts, node, 2)

    # ---------------------------------------------------------------- Complex 29
    node, heading = "LC29", 203.0
    parts.node(node, label="Launch Complex 29")
    stood(
        "Complex 29: pad 29A, its launcher and boom, the building behind it, the blockhouse",
        since="1959",
        confidence="documented",
        source="the museum: built 1958-59, Polaris A2 from 10 January 1961; photographs of 1961 (Commons, A2X on LC-29A)",
    )
    apron(parts, node, (0.0, 0.0), 150.0)
    ring_stand(parts, node, (0.0, 0.0), 8.0, 6.0, legs=6)
    # the umbilical boom, white, leaning from the launcher's foot: about 25 ft long (estimated, 0.8 of the missile's 31 ft)
    obox(parts(node, "white"), (7.5, 0.0, 14.0), (1, 0, 0), (0.26, 0.0, 0.966), (1.6, 2.2, 25.0))
    # a low white flat-roofed building behind the pad (seen in 1961; size and place estimated)
    rect = [(60.0, -15.0), (80.0, -15.0), (80.0, 15.0), (60.0, 15.0)]
    prism(parts(node, "block"), rect, GROUND - FOOTING, 10.0)
    prism(parts(node, "tar"), [(59.3, -15.7), (80.7, -15.7), (80.7, 15.7), (59.3, 15.7)], 10.0, 10.5)
    box(parts(node, "blast"), (59.6, -2.0, 0.0), (60.05, 2.0, 7.0))
    hx, hy = at(371.0, 253.0, heading)
    wedge_blockhouse(parts, node, (hx - 30.0, hy), 180.0, 46.0, 62.0, 14.0, 18.83, annexe=30.0)
    parts(node, "grey", True).tube(P(-8.0, 6.0, 0.0), P(-8.0, 6.0, 30.0), 0.2, 8)  # a lightning mast by the pad (estimated)
    park(parts, node, 3)

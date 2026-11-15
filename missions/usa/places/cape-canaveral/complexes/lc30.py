"""Launch Complex 30: the Army's Pershing complex west of Complex 5/6. One node, `LC30`.

Frame: the origin is pad 30A's centre; +Y runs to pad 30B, 202 degrees true; +X is 292 degrees. Feet.
../cape.md has every figure's source and confidence; in short:

  documented  two pads, a two-storey blockhouse with a roof 8 ft thick, accepted February 1960; one mobile
              service tower for both pads, taken down in 1968; only 30A was ever used (the museum; Spaceline)
  derived     where the pads and the blockhouse stand (OpenStreetMap)
  estimated   every size: the tower 63 ft tall and 26 ft square on a wheeled undercarriage, scaled from a man at
              its foot in the photographs of February and June 1960; the aprons; the blockhouse's plan and height;
              and that the tower stood at 30A on the day
"""

from __future__ import annotations

from .site import FT, P, Parts, apron, at, beam, box, lattice, park, ring_stand, stood, wedge_blockhouse

NODE = "LC30"
HEADING = 202.0
PAD_B = (0.0, 511.0)  # 30B from 30A: 511 ft on 202 degrees (derived)
APRON = 200.0  # each pad's concrete (derived: OpenStreetMap's outlines, about 200 ft square)
TOWER = (63.0, 26.0)  # tall, square (estimated)


def tower(parts: Parts, centre) -> None:
    """The mobile service tower: an open steel frame 26 ft square on a low wheeled undercarriage, in four tiers, the
    first and third closed in white panels with windows, the second dark, a dark hoist house on top with a short
    beam reaching out over the missile."""
    cx, cy = centre
    tall, side = TOWER
    h = side / 2
    frame, white, dark, void = parts(NODE, "grey/tower"), parts(NODE, "white"), parts(NODE, "black/cladding"), parts(NODE, "void")
    base = 5.0  # the undercarriage's deck
    tiers = [base + (tall - 9.0 - base) * k / 3 for k in range(4)]  # three tiers of work rooms, then the hoist house

    def corner(i: int, z: float):
        return (cx + h * (1 if i in (0, 3) else -1), cy + h * (1 if i < 2 else -1), z)

    lattice(frame, corner, [*tiers, tall], 1.0, 0.5)
    box(frame, (cx - h - 1.0, cy - h - 1.0, base - 1.4), (cx + h + 1.0, cy + h + 1.0, base))
    for sx in (-1, 1):  # two bogies of four tyres a side
        for dy in (-8.0, 8.0):
            for dx in (-1.6, 1.6):
                x = cx + sx * (h - 3.0) + dx
                parts(NODE, "black/tyres", True).tube(P(x - 0.6, cy + dy, 1.8), P(x + 0.6, cy + dy, 1.8), 1.8 * FT, 14)
            box(frame, (cx + sx * (h - 3.0) - 2.6, cy + dy - 0.5, 1.4), (cx + sx * (h - 3.0) + 2.6, cy + dy + 0.5, base - 1.4))
    for k, (z0, z1) in enumerate(zip(tiers, tiers[1:])):
        skin = dark if k == 1 else white
        box(skin, (cx - h + 1.2, cy - h + 1.2, z0 + 0.6), (cx + h - 1.2, cy + h - 1.2, z1 - 0.6))
        if k != 1:  # a band of windows round the closed tiers
            box(void, (cx - h + 1.0, cy - h + 3.0, z0 + 5.0), (cx + h - 1.0, cy + h - 3.0, z0 + 8.0))
            box(void, (cx - h + 3.0, cy - h + 1.0, z0 + 5.0), (cx + h - 3.0, cy + h - 1.0, z0 + 8.0))
    box(dark, (cx - h + 2.0, cy - h + 2.0, tiers[3] + 0.6), (cx + h - 2.0, cy + h - 2.0, tall - 0.4))  # the hoist house
    beam(frame, (cx, cy, tall - 2.0), (cx, cy + h + 9.0, tall - 2.0), 1.2)  # its beam, over the pad


def build(parts: Parts) -> None:
    parts.node(NODE, label="Launch Complex 30")
    stood(
        "Complex 30: two pads and the blockhouse",
        since="1960-02",
        confidence="documented",
        source="the Cape Canaveral Space Force Museum: accepted by the Army 10 February 1960",
    )
    apron(parts, NODE, (0.0, 0.0), APRON)
    apron(parts, NODE, PAD_B, APRON)
    apron(parts, NODE, (0.0, PAD_B[1] / 2), (40.0, PAD_B[1] - APRON))  # the paved strip between them (width estimated)
    # 30A's pedestal and the thin mast beside it (estimated from the photograph of 25 February 1960); 30B was never used and is bare
    ring_stand(parts, NODE, (0.0, 0.0), 5.0, 3.0)
    parts(NODE, "grey/tower", True).tube(P(6.0, 0.0, 0.0), P(6.0, 0.0, 36.0), 0.25 * FT, 8)
    # the blockhouse: two storeys under a roof 8 ft thick (documented); its plan and height are estimated
    bx, by = at(384.0, 256.0, HEADING)
    wedge_blockhouse(parts, NODE, (bx - 30.0, by), 180.0, 46.0, 60.0, 22.0, 27.0, annexe=30.0, annexe_height=12.0)
    if stood(
        "Complex 30's mobile service tower, at pad 30A",
        since="1960-02",
        until="1968-02",
        confidence="estimated",
        source="one tower for both pads, dismantled 14 February 1968 (Spaceline); photographed in 1960; where it stood on the day is not recorded",
    ):
        tower(parts, (0.0, -24.0))
    park(parts, NODE, 1)

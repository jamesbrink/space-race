"""The propellant and gas storage (HAER FL-8-7, pp. 21 to 23).

  LoxStorage   "The Liquid Oxygen (LOX) and Gaseous Nitrogen (GN2) storage area ... consisted of a LOX tank, a LOX
               Sub-cooler, and storage for GN2 bottles/tanks ... on a concrete slab foundation"; "three Nitrogen tanks
               were subsequently installed"; "The 28,000-gallon capacity LOX tank was constructed of steel with an
               aluminum inner liner"; "A reinforced concrete blast wall, approximately 110' long x 30' wide with
               earthen fill on the east side, bordered this fuel storage area on the east". Where it lay is
               OpenStreetMap's (way 1264624136: a slab 99 by 106 ft, 250 ft west of the ramp)
  FuelStorage  "Approximately 100' east of the Launch Stand and Ramp, the Jet Propellant-4 (JP-4) storage area consisted
               of a 16,000 gallon storage tank which was separated from the launch area on the north by a reinforced
               concrete blast wall approximately 50' long" (OSM way 1264975424 is the wall: 53 ft). The Atlas burned
               RP-1; the record calls the area by the Air Force's name for it
  POL          the Petroleum, Oil and Lubricants Building: concrete block, 120 square feet, a flat roof (OSM way 1264975419)

The tanks' sizes are not published. The LOX tank is scaled off the aerial of May 1963 (NASA KSC-63PC-0034: about
11 ft across and 50 long, a white vessel on saddles, lying along the wall); the fuel tank is sized to hold 16,000
gallons at 9 ft across, the proportion the same aerial shows; the nitrogen tanks, the sub-cooler, the walls' heights
and the berm's slope are read off it. Estimated. The tube-bank trailers that aerial has parked by the ramp and in
the storage area are not built: nothing places them on 20 February 1962.
"""

from __future__ import annotations

from srlib import FT

from .site import APRON, FOOTING, GROUND, P, Parts, axes, box, building, flat_roof, ftp, osm, solid, stood


def vessel(mb, saddles, centre, along: str, radius: float, length: float, n_saddles: int = 2) -> None:
    """A horizontal tank with dished ends, lying along X or Y, on concrete saddles down to the slab."""
    x, y, z = centre
    half = length / 2 - radius * 0.45
    prof = [
        (0.0, -half - radius * 0.45),
        (radius * 0.55, -half - radius * 0.36),
        (radius * 0.9, -half - radius * 0.15),
        (radius, -half),
        (radius, half),
        (radius * 0.9, half + radius * 0.15),
        (radius * 0.55, half + radius * 0.36),
        (0.0, half + radius * 0.45),
    ]
    z_axis = (1, 0, 0) if along == "x" else (0, 1, 0)
    x_axis = (0, 1, 0) if along == "x" else (1, 0, 0)
    mb.lathe(ftp(prof), 24, matrix=axes((x, y, z), x_axis, z_axis))
    for k in range(n_saddles):
        t = (k + 0.5) / n_saddles * 2 - 1
        d = t * half * 0.9
        if along == "x":
            box(saddles, (x + d - 0.6, y - radius * 0.85, APRON), (x + d + 0.6, y + radius * 0.85, z - radius * 0.5))
        else:
            box(saddles, (x - radius * 0.85, y + d - 0.6, APRON), (x + radius * 0.85, y + d + 0.6, z - radius * 0.5))


def lox(parts: Parts) -> None:
    g = "LoxStorage"
    x0, y0 = osm(-350.0, -232.0)
    x1, y1 = osm(-251.0, -126.0)
    parts.node(g, None, (x0, y0, APRON))
    box(parts(g, "concrete"), (x0, y0, GROUND - 1.5), (x1, y1, APRON + 0.05))
    # the blast wall along the east side, 110 ft long, and the fill banked against its east face, 30 ft out
    wy0, wy1 = (y0 + y1) / 2 - 55.0, (y0 + y1) / 2 + 55.0
    top = APRON + 15.0
    box(parts(g, "bunker/wall"), (x1 + 0.5, wy0, GROUND - FOOTING), (x1 + 2.5, wy1, top))
    solid(parts(g, "fill"), [[(x1 + 2.5, y, top - 1.2), (x1 + 2.5, y, GROUND - 1.0), (x1 + 32.5, y, GROUND - 1.0)] for y in (wy0, wy1)])
    white, saddles = parts(g, "tank", True), parts(g, "concrete/saddles")
    # the LOX tank, along the wall
    vessel(white, saddles, (x1 - 10.5, (y0 + y1) / 2 + 6.0, APRON + 8.5), "y", 5.5, 50.0, 3)
    if stood(
        "Three nitrogen tanks in the LOX area",
        confidence="estimated",
        source="HAER FL-8-7, p. 23: 'subsequently installed', undated; NASA KSC-63PC-0034 has them in May 1963",
    ):
        for k in range(3):
            vessel(white, saddles, (x1 - 30.0 - 5.2 * k, y0 + 22.0, APRON + 3.6), "y", 1.75, 24.0)
    # the sub-cooler: a lagged vessel in a frame at the tank's north end, and the pumps' house beside it
    box(parts(g, "tank/subcooler"), (x1 - 15.5, y1 - 16.0, APRON + 0.05), (x1 - 6.5, y1 - 6.0, APRON + 12.0))
    building(
        parts,
        g,
        "pumps",
        (x1 - 34.0, y1 - 18.0, x1 - 22.0, y1 - 6.0),
        APRON + 9.0,
        {0: [(4.4, 7.6, APRON + 0.05, APRON + 7.0, "shut")]},
        floor=APRON + 0.1,
        footing=GROUND - FOOTING,
    )
    flat_roof(parts, g, "pumps", (x1 - 34.0, y1 - 18.0, x1 - 22.0, y1 - 6.0), APRON + 9.0)
    # the transfer line from the tank's foot toward the stand: over the wall and away along the ground (its run to the
    # stand, 954 ft of line in all by HAER, is not built past the berm)
    pipe = parts(g, "pipe", True)
    ya = (y0 + y1) / 2 + 6.0
    pipe.tube(P(x1 - 10.5, ya, APRON + 2.6), P(x1 - 10.5, wy1 + 4.0, APRON + 2.6), 0.4 * FT, 10)
    pipe.tube(P(x1 - 10.5, wy1 + 4.0, APRON + 2.6), P(x1 + 34.0, wy1 + 4.0, APRON + 2.6), 0.4 * FT, 10)
    pipe.tube(P(x1 + 34.0, wy1 + 4.0, APRON + 2.6), P(x1 + 34.0, wy1 + 4.0, GROUND - 0.5), 0.4 * FT, 10)


def fuel(parts: Parts) -> None:
    g = "FuelStorage"
    (wx0, wy), (wx1, _) = osm(97.0, -70.0), osm(150.0, -70.0)
    parts.node(g, None, (wx0, wy, APRON))
    box(parts(g, "bunker/wall"), (wx0, wy - 1.0, GROUND - FOOTING), (wx1, wy + 1.0, APRON + 12.0))
    box(parts(g, "concrete"), (wx0 + 2.0, wy - 34.0, GROUND - 1.5), (wx1 - 2.0, wy - 1.0, APRON + 0.05))
    # 16,000 gallons is 2,139 cu ft: 9 ft across and 34 ft long over its dished ends (derived from the capacity)
    vessel(parts(g, "tank", True), parts(g, "concrete/saddles"), ((wx0 + wx1) / 2, wy - 14.0, APRON + 6.5), "x", 4.5, 34.0)
    pipe = parts(g, "pipe", True)
    xc = (wx0 + wx1) / 2
    pipe.tube(P(xc - 12.0, wy - 14.0, APRON + 2.4), P(xc - 12.0, wy - 26.0, APRON + 2.4), 0.3 * FT, 10)
    pipe.tube(P(xc - 12.0, wy - 26.0, APRON + 2.4), P(xc - 12.0, wy - 26.0, GROUND - 0.5), 0.3 * FT, 10)


def pol(parts: Parts) -> None:
    g = "POL"
    x0, y0 = osm(82.0, -271.0)
    parts.node(g, None, (x0, y0, APRON))
    rect = (x0, y0, x0 + 12.0, y0 + 10.0)
    building(parts, g, "pol", rect, APRON + 8.5, {1: [(3.5, 6.7, APRON, APRON + 6.8, "shut")]}, floor=APRON + 0.05, footing=GROUND - FOOTING)
    flat_roof(parts, g, "pol", rect, APRON + 8.5)


def build(parts: Parts) -> None:
    lox(parts)
    fuel(parts)
    pol(parts)

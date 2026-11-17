"""Nominal Block II SPS sump-tank envelopes, retained in source inches.

MIT R-547, volume III, October 1966, Table 1.4, p.1-19: CSM-101
preflight dimensions and Apollo XA/YA/ZA positions. Common sump dimensions
are corroborated by the Block II AOH p.2.4-42 and News Reference pp.56/58.
NASA TN D-7375 p.6 explicitly retains hemispherical heads in Block II.
These reference surfaces do not establish manufactured wall/insulation faces.
"""

import math

# Each tuple is (name, YA, ZA). Apollo's axial coordinate becomes model Z;
# the hatch-facing Blender basis is (-ZA, YA, XA), with no fitted rotation.
SUMP_CENTRES = (("Fuel", -48.3, -6.6), ("Oxidizer", 48.3, 6.6))
SUMP_RADIUS = 25.5
SUMP_BOTTOM_XA = 832.0
SUMP_TOP_XA = 985.8


def profile():
    """Two nominal hemispheres tangent to a cylinder; no guessed end contour."""
    from srlib import _segs

    steps = _segs(32)
    lower, upper = SUMP_BOTTOM_XA + SUMP_RADIUS, SUMP_TOP_XA - SUMP_RADIUS
    if upper < lower:
        raise ValueError("SPS sump envelope is shorter than its two hemispherical heads")
    return [(SUMP_RADIUS * math.sin(a), lower - SUMP_RADIUS * math.cos(a)) for a in (math.pi / 2 * i / steps for i in range(steps + 1))] + [
        (SUMP_RADIUS * math.cos(a), upper + SUMP_RADIUS * math.sin(a)) for a in (math.pi / 2 * i / steps for i in range(steps + 1))
    ]


def build(parent, origin_xa):
    """Build only at cabin detail; the node remains in every exported level."""
    from srlib import IN, interior, lathe_obj, material, prof

    if not interior():
        return
    # A neutral titanium reference finish, not measured colour or insulation.
    titanium = material("apollo-sps-tank-reference", (0.45, 0.47, 0.48), metallic=0.65, roughness=0.5)
    contour = prof([(r, xa - origin_xa) for r, xa in profile()])
    for name, ya, za in SUMP_CENTRES:
        obj = lathe_obj(f"SM_SPS_{name}Sump", contour, titanium, parent, segs=128)
        obj.location.x, obj.location.y = -za * IN, ya * IN
        # These are inside the barrel, not enclosing skins to remove in cutaway.

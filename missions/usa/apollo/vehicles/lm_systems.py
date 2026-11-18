"""LM-3 electrical, environmental and landing-radar display hardware. Dimensions in inches.

Component counts are from MSC-PA-R-69-2 A.2.4, A.2.7 and A.2.13. Case envelopes,
installation centres, brackets, terminals and external pipe runs are estimated.
"""

from lm_propulsion import box, pipe, surface, vessel
from srlib import MeshBuilder, interior


def batteries(owner, positions, metal, panel, black):
    for i, (x, y, z) in enumerate(positions, 1):
        case, fittings, insulation = MeshBuilder(), MeshBuilder(), MeshBuilder()
        box(case, (x, y, z), (12, 9, 13))
        box(fittings, (x, y, z + 6.9), (12.5, 9.5, 0.7))
        for dy in (-2.7, 2.7):
            box(insulation, (x + 3.5, y + dy, z + 7.7), (1.8, 1.8, 1))
            pipe(fittings, [(x + 3.5, y + dy, z + 8.5), (x, y + dy, z + 10), (x - 7, y + dy, z + 9)], 0.38)
        case.build(f"{owner.name}_Battery_{i}", panel, owner)
        fittings.build(f"{owner.name}_LidAndLeads_{i}", metal, owner)
        insulation.build(f"{owner.name}_Terminals_{i}", black, owner)


def build(parts, metal, panel, dark, white):
    radar = MeshBuilder()
    box(radar, (-59, 0, 53), (25, 21, 7))
    radar.build("LM3_LandingRadarAntenna", panel, parts["LMLandingRadar"])
    face = MeshBuilder()
    for x in (-65, -53):
        for y in (-5, 5):
            surface(face, (x, y, 49.3), [(0, 0), (4.3, 0), (4.3, -0.5), (0, -0.5)], 16)
    face.build("LM3_LandingRadarFace", dark, parts["LMLandingRadar"])
    if not interior():
        return
    batteries(parts["LMDescentPower"], [(x, -49, z) for x in (-54, -37) for z in (78, 99)], metal, panel, dark)
    batteries(parts["LMAscentPower"], [(-66, y, 174) for y in (-11, 11)], metal, panel, dark)
    for name, locations in (
        ("LMDescentConsumables", [("Water", 52, -47, 88, 11), ("Oxygen", 42, -59, 107, 7)]),
        (
            "LMAscentLifeSupport",
            [("Water1", -60, -16, 190, 6), ("Water2", -60, 16, 190, 6), ("Oxygen1", -60, -28, 165, 5), ("Oxygen2", -60, 28, 165, 5)],
        ),
    ):
        for label, x, y, z, radius in locations:
            tank, fittings = MeshBuilder(), MeshBuilder()
            vessel(tank, (x, y, z), radius, radius * 1.22)
            surface(fittings, (x, y, z + radius * 1.22), [(1, -0.4), (1.5, 0), (1.5, 1.8)], 12)
            pipe(fittings, [(x, y, z + radius * 1.22 + 2), (x, y, z + radius * 1.22 + 4), (x + 6, y, z + radius * 1.22 + 4)], 0.38)
            tank.build(f"LM3_{label}Vessel", white if label.startswith("Water") else panel, parts[name])
            fittings.build(f"LM3_{label}Fittings", metal, parts[name])
    pack, vents, cartridges = MeshBuilder(), MeshBuilder(), MeshBuilder()
    box(pack, (19, 22, 186), (17, 7, 22))
    for x in (14, 24):
        surface(cartridges, (x, 17, 180), [(3, 0), (3.4, 1), (3.4, 10), (3, 11), (0, 11)], 20)
        pipe(vents, [(x, 17, 192), (x, 17, 195), (x, 17, 197)], 0.85)
    pack.build("LM3_SuitCircuitAssembly", panel, parts["LMAscentLifeSupport"])
    cartridges.build("LM3_AirRevitalizationCartridges", white, parts["LMAscentLifeSupport"])
    vents.build("LM3_SuitCircuitDucts", metal, parts["LMAscentLifeSupport"])

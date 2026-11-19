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


def lm8_battery(owner, index, centre, size, opposite_terminals, metal, panel, dark):
    """Ribbed covers and relocated ascent terminals, MSC-04112 A.2.2. Case and cover occupy the nominal envelope."""
    x, y, z = centre
    width, length, height = size
    top = z + height / 2
    case, lid, insulation = MeshBuilder(), MeshBuilder(), MeshBuilder()
    box(case, (x, y, z - 0.3), (width - 0.18, length - 0.18, height - 0.6))
    box(lid, (x, y, top - 0.44), (width, length, 0.44))
    for k in (-3, -2, -1, 0, 1, 2, 3):
        box(lid, (x, y + k * length / 10, top - 0.2), (width - 0.65, 0.32, 0.4))
    for sign in (-1, 1):
        dy = (sign if opposite_terminals else 1) * (length / 2 - 1.15)
        tx, ty = x + sign * (width / 2 - 1.25), y + dy
        box(insulation, (tx, ty, top + 0.12), (1.4, 1.4, 0.88))
        pipe(lid, [(tx, ty, top + 0.7), (tx, ty + (1 if dy < 0 else -1) * 2, top + 1.25), (tx + sign * 2, ty, top + 1.05)], 0.25)
    case.build(f"{owner.name}_Battery_{index}", panel, owner)
    lid.build(f"{owner.name}_LidAndLeads_{index}", metal, owner)
    insulation.build(f"{owner.name}_Terminals_{index}", dark, owner)


def build(parts, metal, panel, dark, white, *, spacecraft=3):
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
    # MSC-00126 A.2.1: LM-4 divided its four batteries equally between the
    # two forward quadrants. Exact case stations within each bay are estimated.
    locations = [(63, y, z) for y in (-37, 37) for z in (72, 106)] if spacecraft >= 4 else [(x, -49, z) for x in (-54, -37) for z in (78, 99)]
    if spacecraft == 10:
        # LM-10 handbook §1.3: the five batteries stand on the aft (-Z) bulkhead.
        locations = [(-85, y, z) for y, z in ((-19, 78), (0, 78), (19, 78), (-10, 94), (10, 94))]
    if spacecraft in (8, 10):
        # NASA TN D-6976 table I. The narrow ascent batteries sit side by side.
        for owner, centres, size, opposite in (
            (parts["LMDescentPower"], locations, (9.04, 16.94, 9.96), False),
            (parts["LMAscentPower"], [(-62, 0, 174), (-68.5, 0, 174)], (4.95, 35.75, 7.70), True),
        ):
            for i, centre in enumerate(centres, 1):
                lm8_battery(owner, i, centre, size, opposite, metal, panel, dark)
    else:
        batteries(parts["LMDescentPower"], locations, metal, panel, dark)
        batteries(parts["LMAscentPower"], [(-66, y, 174) for y in (-11, 11)], metal, panel, dark)
    stores = [("Water", 52, -47, 88, 11), ("Oxygen", 42, -59, 107, 7)]
    if spacecraft == 10:
        stores = [
            ("Water", -43, 43, 95, 10),
            ("Oxygen", -56, -38, 91, 7),  # Original vessels in quadrants II and III.
            ("Water2", 52, -47, 88, 11),
            ("Oxygen2", 42, -59, 107, 7),
            ("Waste", 34, -43, 73, 5.8),  # J-mission additions in IV.
        ]
    for name, locations in (
        ("LMDescentConsumables", stores),
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

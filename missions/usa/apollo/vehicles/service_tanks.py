"""SM-101 service-module equipment, in the source drawing's inches.

R-547 III table 1.4 gives all four propellant tanks in Apollo (XA, YA, ZA).
The flight's press-kit drawing on p. 26a locates the other equipment. See
service-tanks.md for the common dimensions, photo estimates and discrepancies.
"""

import math
import sys
from pathlib import Path

from mathutils import Matrix, Vector

from srlib import IN, MeshBuilder, Surf, _segs, decal, interior, lathe_obj, load_font, mark_shells, material, prof, text_mesh

sys.path.append(str(Path(__file__).resolve().parents[2] / "mercury" / "vehicles"))
from mercury_capsule import flag_image  # noqa: E402 — the same flag asset that Gemini shares

SUMP_CENTRES = (("Fuel", -48.3, -6.6), ("Oxidizer", 48.3, 6.6))
STORAGE_CENTRES = (("Fuel", -14.8, -47.8), ("Oxidizer", 14.8, 47.8))
SUMP_RADIUS = 25.5
STORAGE_RADIUS = 22.5
SUMP_BOTTOM_XA = 832.0
SUMP_TOP_XA = 985.8
STORAGE_TOP_XA = 988.65
HELIUM_DIAMETER = 40.0
OXYGEN_DIAMETER = 26.55
HYDROGEN_DIAMETER = 31.80
FUEL_CELL_DIAMETER = 22.0
FUEL_CELL_HEIGHT = 44.0


def profile(radius=SUMP_RADIUS, bottom=SUMP_BOTTOM_XA, top=SUMP_TOP_XA):
    """Hemispherical heads and straight barrel, or a sphere if the tangencies meet."""
    steps = _segs(20)
    lower, upper = bottom + radius, top - radius
    if upper < lower - 1e-8:
        raise ValueError("Tank envelope is shorter than its two hemispherical heads")
    lower_dome = [(radius * math.sin(a), lower - radius * math.cos(a)) for a in (math.pi / 2 * i / steps for i in range(steps + 1))]
    upper_dome = [(radius * math.cos(a), upper + radius * math.sin(a)) for a in (math.pi / 2 * i / steps for i in range(steps + 1))]
    return lower_dome + (upper_dome[1:] if abs(upper - lower) < 1e-8 else upper_dome)


def _lathe(name, contour, centre, paint, parent):
    obj = lathe_obj(name, prof(contour), paint, parent, segs=64)
    obj.location = Vector(centre) * IN
    return obj


def _ball(name, diameter, centre, paint, parent):
    r = diameter / 2
    return _lathe(name, profile(r, -r, r), centre, paint, parent)


def _line(builder, points, radius):
    for a, b in zip(points, points[1:]):
        builder.tube(Vector(a) * IN, Vector(b) * IN, radius * IN, caps=False)


def _ring(inside, outside, lo, hi):
    return [(outside, lo), (outside, hi), (inside, hi), (inside, lo), (outside, lo)]


def build(parent, origin_xa):
    if not interior():
        return
    titanium = material("apollo-sps-tank-reference", (0.45, 0.47, 0.48), metallic=0.65, roughness=0.5)
    fittings = material("apollo-sps-tank-fittings", (0.43, 0.44, 0.43), metallic=0.72, roughness=0.37)
    lines = MeshBuilder()
    for kind, radius, top, centres in (
        ("Sump", SUMP_RADIUS, SUMP_TOP_XA, SUMP_CENTRES),
        ("Storage", STORAGE_RADIUS, STORAGE_TOP_XA, STORAGE_CENTRES),
    ):
        for fluid, ya, za in centres:
            _lathe(f"SM_SPS_{fluid}{kind}", profile(radius, SUMP_BOTTOM_XA, top), (-za, ya, -origin_xa), titanium, parent)
            # Upper polar bosses visible in the installation photographs, P-212.
            _lathe(
                f"SM_{fluid}{kind}Boss", [(3.2, -0.4), (3.2, 0.7), (1.55, 1.0), (1.55, 2.0), (0, 2.0)], (-za, ya, top - origin_xa), fittings, parent
            )
    # The flight report's A.1.8 and AOH Fig. 2.4-8 show the series connection;
    # the illustrated bends and diameters below the domes are estimates.
    for (_, ya, za), (_, sy, sz) in zip(SUMP_CENTRES, STORAGE_CENTRES):
        z = SUMP_BOTTOM_XA - origin_xa
        transfer = [(-sz, sy, z + 0.2), (-sz, sy, z - 2.5), (-sz * 0.88, sy * 1.11, z - 5), (-za * 1.65, ya, z - 5), (-za, ya, z + 0.2)]
        # Loft the elbows continuously as on Gemini's hoses. The two routes
        # leave the dome through separate fittings, on the aft side of the deck.
        lines.loft([Vector(p) * IN for p in transfer], [(1.15 * IN, 1.15 * IN)] * len(transfer), segs=12, ref=(1, 1, 0))
        sign = 1 if ya > 0 else -1
        feed = [
            (-za + sign * 4, ya, z + 0.65),
            (-za + sign * 4, ya, z - 2),
            (-za + sign * 4, ya * 0.80, z - 3.5),
            (sign * 11.8, sign * 20.8, z - 2.7),
            (sign * 13.5, sign * 13.5, z + 0.4),
            (sign * 13.5, sign * 13.5, z + 1.9),
        ]
        lines.loft([Vector(p) * IN for p in feed], [(1.45 * IN, 1.45 * IN)] * len(feed), segs=12, ref=(1, -1, 0))
        _lathe(
            f"SM_SPS_{'Oxidizer' if sign > 0 else 'Fuel'}FeedCoupling",
            _ring(1.26, 1.79, z + 1.3, z + 3.5),
            (sign * 13.5, sign * 13.5, 0),
            fittings,
            parent,
        )
    lines.build("SM_SPS_TransferAndFeedLines", fittings, parent)


def pressurant(parent, origin_xa):
    if not interior():
        return
    alloy = material("apollo-sps-helium-aluminium", (0.64, 0.65, 0.62), metallic=0.72, roughness=0.37)
    for label, xa in (("Aft", 916), ("Forward", 964)):
        _ball(f"SM_Helium{label}", HELIUM_DIAMETER, (0, 0, xa - origin_xa), alloy, parent)


def _bay(radial, across, xa, origin_xa):
    """Sector IV bisector, from the six-sector angular layout."""
    a = math.radians(220)
    return (radial * math.cos(a) - across * math.sin(a), radial * math.sin(a) + across * math.cos(a), xa - origin_xa)


def odyssey_oxygen(shelf, core, origin_xa):
    """SM-109 sector IV, Apollo 13 Review Board, ch. 4. Stations and local fittings are estimated."""
    if not interior():
        return
    jacket = material("apollo-dewar-jacket", (0.52, 0.53, 0.51), metallic=0.82, roughness=0.31)
    alloy = material("apollo-oxygen-shelf-anodized", (0.54, 0.28, 0.08), metallic=0.65, roughness=0.38)
    metal = material("apollo-oxygen-stainless", (0.56, 0.58, 0.58), metallic=0.76, roughness=0.33)
    black = material("apollo-oxygen-electrical", (0.10, 0.11, 0.12), metallic=0.25)
    leads = MeshBuilder()
    frame = MeshBuilder()
    for i, (r, a) in enumerate(((36, 1), (60.8, -11.6)), 1):
        centre = _bay(r, a, 920, origin_xa)
        _ball(f"SM_OxygenDewar_{i}", OXYGEN_DIAMETER, centre, jacket, shelf)
        _lathe(f"SM_OxygenMount_{i}", _ring(13.28, 13.60, -0.56, 0.56), centre, alloy, shelf)
        _lathe(
            f"SM_OxygenAccessory_{i}", [(2.9, 12.8), (3.5, 13.2), (3.5, 14.0), (2.7, 14.2), (2.7, 18), (2.3, 18.35), (0, 18.35)], centre, metal, shelf
        )
        for side in (-1, 1):
            _line(
                leads,
                [
                    _bay(r + dr, a + side * da, 920 + h, origin_xa)
                    for dr, da, h in ((0, 2.5, 16.3), (0, 5.5, 16.3), (1.1, 7.8, 14.5), (2.9, 11.8, 9), (3.5, 13.9, 2))
                ],
                0.30,
            )
    # The installation photo shows a common equatorial shelf. Carry its open webs
    # outside the jackets: the two centres lie along this local longitudinal axis.
    dr, da = 24.8, -12.6
    length = math.hypot(dr, da)

    def point(along, across, height):
        return _bay(36 + (along * dr - across * da) / length, 1 + (along * da + across * dr) / length, 920 + height, origin_xa)

    for side in (-1, 1):
        for h in (-0.67, 0.67):
            _line(
                frame,
                [
                    point(t, side * w, h)
                    for t, w in ((-11.4, 7.7), (-5.8, 12.55), (0, 13.78), (length, 13.78), (length + 5.8, 12.55), (length + 11.4, 7.7))
                ],
                0.29,
            )
        for t in range(0, 28, 4):
            _line(frame, [point(t, side * 13.78, -0.67), point(t + 2, side * 13.78, 0.67), point(t + 4, side * 13.78, -0.67)], 0.24)
    frame.build("SM_OxygenShelfTruss", alloy, shelf)
    leads.build("SM_OxygenAccessoryLines", metal, shelf)
    # Figure 4-1: two motors at opposite ends of the heater tube, a separate
    # capacitance quantity probe, and the helical heater windings.
    r, a = 60.8, -11.6
    centre = _bay(r, a, 920, origin_xa)
    tube = MeshBuilder()
    tube.lathe(prof(_ring(1.59, 1.80, -10.9, 10.9)), segs=40, arc=(math.radians(240), math.radians(360)))
    tube.build("SM_OxygenTwoHeaterTubeSection", metal, core).location = Vector(centre) * IN
    for label, h in (("Lower", -9.1), ("Upper", 9.1)):
        _lathe(f"SM_OxygenTwo{label}FanMotor", [(0.9, h - 1.55), (1.42, h - 1.25), (1.42, h + 1.25), (0.9, h + 1.55)], centre, black, core)
    elements = MeshBuilder()
    for n in range(2):
        turns = 8
        path = []
        for step in range(97):
            angle = 2 * math.pi * turns * step / 96 + n * math.pi
            path.append(_bay(r + 1.46 * math.cos(angle), a + 1.46 * math.sin(angle), 913.0 + 14 * step / 96, origin_xa))
        _line(elements, path, 0.14)
    elements.build("SM_OxygenTwoHeaterWindings", alloy, core)
    probe = MeshBuilder()
    _line(probe, [_bay(r - 2.45, a, h, origin_xa) for h in (908.4, 931.6)], 0.55)
    for h in (908.6, 931.5):
        _line(probe, [_bay(r - 2.45, a, h, origin_xa), _bay(r + 0.4, a, h, origin_xa)], 0.36)
    probe.build("SM_OxygenTwoQuantityProbe", metal, core)


def power(parent, origin_xa, *, separate_oxygen=False):
    if not interior():
        return
    dewar = material("apollo-dewar-jacket", (0.52, 0.53, 0.51), metallic=0.82, roughness=0.31)
    jacket = material("apollo-fuel-cell-jacket", (0.72, 0.72, 0.67), metallic=0.64, roughness=0.42)
    accessory = material("apollo-fuel-cell-accessory", (0.24, 0.25, 0.24), metallic=0.68, roughness=0.48)
    # Two oxygen tanks abreast and two hydrogen tanks one above the other.
    # Estimated local placements reproduce the flight plate's installation.
    for gas, diameter, positions in (
        ("Oxygen", OXYGEN_DIAMETER, ((36, -1, 920), (61.5, 11, 920))),
        ("Hydrogen", HYDROGEN_DIAMETER, ((56, 0, 858.5), (56, 0, 892.1))),
    ):
        if gas == "Oxygen" and separate_oxygen:
            continue
        for i, (radial, across, xa) in enumerate(positions, 1):
            if gas == "Hydrogen" and separate_oxygen:
                i = 3 - i  # SM-109 installation drawing labels the upper tank 1.
            centre = _bay(radial, across, xa, origin_xa)
            _ball(f"SM_{gas}Dewar_{i}", diameter, centre, dewar, parent)
            if gas == "Oxygen":
                # P-69 and the EPS chapter show the neck and accessory cover.
                _lathe(f"SM_OxygenAccessory_{i}", [(3.55, 12.7), (3.55, 16.0), (3.2, 16.5), (2.9, 19.6), (0, 19.6)], centre, accessory, parent)
    # The mission report (5.8.1) explicitly puts cell 2 inboard of 1 and 3.
    radius = FUEL_CELL_DIAMETER / 2
    for number, radial, across in ((1, 61, -12), (2, 39, 0), (3, 61, 12)):
        if separate_oxygen:
            across = -across  # Fig. 4-4, viewed from outside SM-109: cell 3 on the left, 1 on the right.
        centre = _bay(radial, across, 943.5, origin_xa)
        _lathe(
            f"SM_FuelCell_{number}_Jacket",
            [(0, 0), (9.8, 0), (radius, 0.6), (radius, 1.3), (10.65, 1.6), (10.65, 22), (radius, 22.8), (radius, 23.3), (0, 23.3)],
            centre,
            jacket,
            parent,
        )
        # P-141: the lower insulated stack and the smaller accessories above.
        _lathe(f"SM_FuelCell_{number}_Manifold", [(8.6, 23.3), (8.6, 25.5), (7.6, 28.5), (0, 28.5)], centre, accessory, parent)
        rack = MeshBuilder()
        for sign in (-1, 1):
            component = _bay(radial, across + sign * 4.25, 943.5 + 28.6, origin_xa)
            _lathe(
                f"SM_FuelCell_{number}_Accessory_{sign}",
                [(0, -1), (3.8, 0), (4, 2), (4, 10), (3.8, 11), (2.7, 12), (0, 12)],
                component,
                jacket,
                parent,
            )
            _line(rack, [_bay(radial - 6, across + sign * 5, 943.5 + h, origin_xa) for h in (23.1, FUEL_CELL_HEIGHT - 1.1)], 0.55)
        _line(rack, [_bay(radial - 6, across + d, 943.5 + FUEL_CELL_HEIGHT - 0.55, origin_xa) for d in (-5, 5)], 0.55)
        rack.build(f"SM_FuelCell_{number}_AccessoryFrame", accessory, parent)
    # Mounting shelf: the actual sector is 50 degrees, the free margins estimated.
    tray = MeshBuilder()
    tray.lathe(prof(_ring(24, 74.8, 942.6 - origin_xa, 943.5 - origin_xa)), segs=24, arc=(math.radians(195.6), math.radians(244.4)))
    tray.build("SM_FuelCellShelf", accessory, parent)


# Make the same rim polygons at every LOD. Each break falls on an ECS sector
# boundary, a 16-panel fairing joint, or the ordinary barrel's 15-degree grid.
ANGLES = sorted({*(range(0, 361, 15)), *(i * 22.5 for i in range(17)), 65, 195, 245})


def _markings(parent, radius, forward):
    """Photo S68-42513: lettering astride beam 2, the +Y/+Z radiator seam."""
    shell = Surf(radius, 0, 0)
    theta = math.radians(135)
    font = load_font()
    paint = MeshBuilder()
    for word, width, top in (("UNITED", 30.8, forward - 3.3), ("STATES", 32.3, forward - 11.3)):
        verts, faces = text_mesh(word, 1.0, font, cuts=2)
        xs, ys = [p[0] for p in verts], [p[1] for p in verts]
        left, right, bottom, upper = min(xs), max(xs), min(ys), max(ys)
        letter = [((x - (left + right) / 2) * width / (right - left), (y - upper) * 6.5 / (upper - bottom), 0) for x, y, _ in verts]
        decal(paint, shell, theta, top, letter, faces, False, off=0.12)
    ink = material("apollo-sm-national-lettering", (0.018, 0.018, 0.021), roughness=0.65)
    paint.build("SM_NationalLettering", ink, parent, smooth=False)
    height = 7.4
    flag = MeshBuilder()
    flag.grid(
        lambda u, v: shell.wrap(theta, forward - 19.6, (u / 8 - 0.5) * 1.9 * height, (v - 1) * height, 0.12),
        range(9),
        (0, 1),
        uv=lambda u, v: (u / 8, v),
    )
    flag.build("SM_NationalFlag", material("apollo-sm-national-flag", (1, 1, 1), roughness=0.65, image=flag_image()), parent)


def panels(parent, radius, aft, forward, fairing_radius, fairing_top, shield_radius, white, silver, *, sim_door=None):
    """Exterior partitions from the flight plate, NAR P-64 and S68-42513."""
    # Environmental Control, p.121: two 130-degree panels, about 49 ft² each.
    # Aft offset estimated against the 154-in barrel in NASA S68-42513.
    ecs_bottom = aft + 10
    ecs_top = ecs_bottom + 49 * 144 / (radius * math.radians(130))
    _markings(parent, radius, forward)
    barrel, ecs, inner, rim, fairing, eps = (MeshBuilder() for _ in range(6))
    door = MeshBuilder()
    for a, b in zip(ANGLES, ANGLES[1:]):
        deg = (a + b) / 2
        angle = (math.radians(a), math.radians(b))
        segs = max(1, round((b - a) / 3.75))

        def sector(builder, contour):
            builder.lathe(prof(contour), segs=segs, arc=angle)

        zone = deg % 180
        # II/III span 65..195 and V/VI 245..375 degrees. The inner surfaces
        # and annuli use precisely the same angular subdivisions as these skins.
        has_ecs = zone >= 65 or zone < 15
        if sim_door is not None and a >= 15 and b <= 65:
            # MSC-05161 fig. A-2. The tank panel closes the sector forward of the cut line.
            bottom, top = aft + 2.5, forward - 37
            for lo, hi in ((aft, bottom), (top, forward)):
                sector(barrel, [(radius, lo), (radius, hi)])
                sector(inner, [(radius - 1, hi), (radius - 1, lo)])
            sector(
                door, [(radius, bottom + 0.12), (radius, top - 0.12), (radius - 1, top - 0.12), (radius - 1, bottom + 0.12), (radius, bottom + 0.12)]
            )
            # Close the free edges of the jettisoned honeycomb panel.
            for edge in (a, b):
                if edge in (15, 65):
                    ca, sa = math.cos(math.radians(edge)), math.sin(math.radians(edge))
                    points = [
                        (r * ca * IN, r * sa * IN, h * IN)
                        for r, h in ((radius - 1, bottom + 0.12), (radius, bottom + 0.12), (radius, top - 0.12), (radius - 1, top - 0.12))
                    ]
                    door.add(points, [(0, 1, 2, 3) if edge == 15 else (3, 2, 1, 0)])
        else:
            for lo, hi, paint in ((aft, ecs_bottom, barrel), (ecs_bottom, ecs_top, ecs if has_ecs else barrel), (ecs_top, forward, barrel)):
                sector(paint, [(radius, lo), (radius, hi)])
            sector(inner, [(radius - 1, forward), (radius - 1, aft)])
        sector(rim, [(radius - 1, aft), (radius, aft)])
        sector(rim, [(radius, forward), (radius - 1, forward)])
        # P-64 and p.58: eight power radiators interleaved with plain panels.
        radiator = int(deg / 22.5) % 2 == 0
        sector(eps if radiator else fairing, [(fairing_radius, forward), (fairing_radius, fairing_top)])
        sector(fairing, [(radius, forward), (fairing_radius, forward)])
        sector(fairing, [(fairing_radius, fairing_top), (shield_radius, fairing_top)])
        sector(fairing, [(fairing_radius - 0.5, fairing_top), (fairing_radius - 0.5, forward)])
    if sim_door is not None:
        skin = door.build("SM112_SIMJettisonPanel", silver, sim_door)
        mark_shells([skin.name])
    for name, builder, finish in (
        ("SM_Panels", barrel, silver),
        ("SM_ECSRadiators", ecs, white),
        ("SM_InnerWall", inner, white),
        ("SM_BarrelRims", rim, silver),
        ("SM_CM_Fairing", fairing, silver),
        ("SM_EPSRadiators", eps, white),
    ):
        obj = builder.build(name, finish, parent)
        if name in ("SM_Panels", "SM_ECSRadiators", "SM_InnerWall", "SM_EPSRadiators"):
            sign = -1 if name == "SM_InnerWall" else 1
            obj.data.normals_split_custom_set_from_vertices([(Vector((v.co.x, v.co.y, 0)).normalized() * sign) for v in obj.data.vertices])


def structure(parent, origin_xa):
    if not interior():
        return
    import bmesh

    import perforated_wall

    alloy = material("apollo-sm-machined-beam", (0.52, 0.56, 0.57), metallic=0.7, roughness=0.43)
    deck = material("apollo-sm-bulkhead", (0.58, 0.59, 0.54), metallic=0.57, roughness=0.55)
    beams = MeshBuilder()
    for angle in (65, 135, 195, 245, 315, 15):
        orientation = Matrix.Rotation(math.radians(angle), 4, "Z")
        # Decks close the top and bottom ends of the webs. Mating faces there
        # would leave duplicate triangles on both bulkheads.
        verts = [
            orientation @ Vector((r * IN, w * IN, (z - origin_xa) * IN))
            for z in (838.65, 992.35)
            for r, w in ((22, -0.175), (75.9, -0.175), (75.9, 0.175), (22, 0.175))
        ]
        beams.add(verts, [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])
    web = beams.build("SM_RadialWebs", alloy, parent, smooth=False)

    def circle(x, y, r):
        return [Vector(((x + r * math.cos(a)) * IN, (y + r * math.sin(a)) * IN)) for a in (math.tau * i / 64 for i in range(64))]

    # Open up the aft deck where the actual domes cross its station. The
    # 0.8-in annular clearance is an estimate. Forward polar bosses end below XA993.
    holes = [circle(0, 0, 22.0)]
    for r, centres in ((SUMP_RADIUS, SUMP_CENTRES), (STORAGE_RADIUS, STORAGE_CENTRES)):
        height = 838.65 - SUMP_BOTTOM_XA
        rim = (2 * r * height - height**2) ** 0.5 + 0.8
        holes.extend(circle(-za, ya, rim) for _, ya, za in centres)
    aft = perforated_wall.disc("SM_AftBulkhead", parent, deck, -origin_xa, 838, 75.9, holes)
    forward = perforated_wall.disc("SM_ForwardBulkhead", parent, deck, -origin_xa, 993, 75.9, [circle(0, 0, 22.0)])
    # Both panels have faces toward the compartments and toward the outside,
    # with finite rims at the engine and tank holes. The 0.65-in section depth
    # is estimated. Both extrusions run into the documented barrel envelope.
    for panel, thickness in ((aft, -0.65), (forward, 0.65)):
        bm = bmesh.new()
        bm.from_mesh(panel.data)
        bmesh.ops.solidify(bm, geom=list(bm.faces), thickness=thickness * IN)
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
        bm.to_mesh(panel.data)
        bm.free()
        panel.data.update()
    mark_shells([web.name, aft.name, forward.name])


def engine(parent, length, exit_radius):
    """The actual extension is hollow; continue its open bore through the chamber."""
    skin = material("apollo-sps-extension", (0.25, 0.23, 0.23), metallic=0.77, roughness=0.45)
    chamber = material("apollo-sps-chamber", (0.32, 0.29, 0.27), metallic=0.52, roughness=0.7)
    flange = material("apollo-sps-machined-fittings", (0.54, 0.55, 0.53), metallic=0.78, roughness=0.39)
    # Stations along the extension read from NAR P-211. Retain the historical
    # rounded 94.5-in envelope; the handbook's exit diameter differs (see MD).
    wall = 0.3
    outline = [
        (exit_radius, 0),
        (exit_radius, 0.6),
        (exit_radius - 0.55, 1.0),
        (41.8, 27),
        (38.2, 44),
        (38.5, 44.3),
        (38.5, 45),
        (37.9, 45.3),
        (30.5, 70),
        (25.2, 84),
        (20.0, 97),
        (16.7, 104),
        (14.65, length),
    ]
    bore = [
        (14.15, length),
        (16.05, 104),
        (19.55, 97),
        (24.75, 84),
        (30.05, 70),
        (37.5, 45.0),
        (41.35, 27),
        (exit_radius - 0.85, 1.0),
        (exit_radius - wall, 0),
    ]
    _lathe("SPS_Bell", [*outline, *bore, outline[0]], (0, 0, 0), skin, parent)
    if not interior():
        return
    # Injector/chamber envelope, attachment collar and pitch/yaw actuators read
    # from the flight's gimballed assembly diagram and P-211/P-213. No working system.
    _lathe(
        "SPS_AblativeChamber",
        [
            (14.65, 0),
            (14.7, 1.1),
            (12.0, 6),
            (7.1, 13),
            (7.0, 15),
            (9.9, 21.4),
            (10.5, 23.8),
            (10.5, 30.8),
            (10.1, 31.8),
            (0, 31.8),
            (0, 29.8),
            (8.8, 29.8),
            (8.8, 23.8),
            (5.95, 15),
            (5.98, 13),
            (10.7, 6),
            (14.15, 0),
        ],
        (0, 0, length),
        chamber,
        parent,
    )
    _lathe("SPS_Injector", [(8.6, 31.8), (11, 32.5), (11, 34.2), (9.5, 34.9), (7.7, 36.9), (0, 36.9)], (0, 0, length), flange, parent)
    _lathe("SPS_GimbalRing", _ring(15.3, 19, 17.7, 19.0), (0, 0, length), flange, parent)
    bars = MeshBuilder()
    for x, y in ((1, 0), (0, 1), (-1, 0), (0, -1)):
        _line(bars, [(x * 17.1, y * 17.1, length + 18.4), (x * 9.0, y * 9.0, length + 33.2)], 0.88)
    for x, y in ((1, 0), (0, 1)):
        foot = Vector((x * 19.8, y * 19.8, length + 18.9))
        tip = Vector((x * 9, y * 9, length + 37.3))
        a, b = foot.lerp(tip, 0.12), foot.lerp(tip, 0.7)
        bars.tube(a * IN, b * IN, 2.1 * IN, segs=20)
        _line(bars, [foot, a, b, tip], 0.85)
    for x in (-1, 1):
        # Pivot fittings pick up the bulkhead on opposite sides of the ring.
        _line(bars, [(x * 18.5, 0, length + 18.4), (x * 23.8, 0, length + 18.4)], 1.3)
        bars.box((3.5 * IN, 4.2 * IN, 3.5 * IN), Matrix.Translation(Vector((x * 23, 0, length + 18.25)) * IN))
    bars.build("SPS_GimbalStrutsAndActuators", flange, parent)
    connections = MeshBuilder()
    for sign in (-1, 1):
        path = [
            (sign * 13.5, sign * 13.5, length + 17.1),
            (sign * 13.5, sign * 13.5, length + 19.1),
            (sign * 13.9, sign * 12.2, length + 23.9),
            (sign * 12, sign * 9, length + 32.4),
            (sign * 5.2, sign * 1.8, length + 37.6),
        ]
        connections.loft([Vector(p) * IN for p in path], [(1.45 * IN, 1.45 * IN)] * len(path), segs=12, ref=(1, -1, 0))
    connections.build("SPS_InjectorFeedElbows", flange, parent)
    for x in (-1, 1):
        _lathe(
            f"SPS_ValveAssembly_{x}", [(0, 0), (3.1, 0), (3.4, 1.2), (3.4, 4.8), (2.1, 6.1), (0, 6.1)], (x * 5.2, 0, length + 34.6), chamber, parent
        )

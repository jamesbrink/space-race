"""LRV-3 at the start of EVA-2. Inches in the rover frame. See lrv-3.md."""

from math import cos, radians, sin
from pathlib import Path

import bpy

from lm5_equipment import box, point, tube
from srlib import IN, MeshBuilder, group, material


def chart():
    name = "lrv3-traverse-chart"
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    path = Path(__file__).resolve().parents[1] / "flights/apollo-17/model/taurus-traverse-map.jpg"
    return material(name, (1, 1, 1), double_sided=True, image=bpy.data.images.load(str(path), check_existing=True))


def map_extension(parent, m):
    """Four overlapping sheets, a tape cross and the two lamp clamps. AS17-137-20979."""
    repair = group("LRV_MapFenderRepair", parent)
    pages, tape, clamps = MeshBuilder(), MeshBuilder(), MeshBuilder()

    def surface(t, y, lift=0):
        # The sheets bend along the wheel crown and bow across its width.
        a = radians(6 + 61 * t)
        r = 18.38 + 3.1 * t - 0.42 * (y / 5.5) ** 2 + lift
        return point(-r * sin(a), y, r * cos(a))

    for offset in (0, 0.5):
        for edge in (-5.25, 0):
            pages.grid(
                lambda t, y: surface(t, y),
                [offset + k / 16 for k in range(9)],
                [edge, edge + 2.625, edge + 5.25],
                uv=lambda t, y: ((y + 5.25) / 10.5, t),
                flip=True,
            )
    tape.grid(lambda t, y: surface(t, y, 0.08), [i / 16 for i in range(17)], [-0.60, 0.60], flip=True)
    for ya, yb in ((-5.25, -0.60), (0.60, 5.25)):
        tape.grid(lambda t, y: surface(t, y, 0.08), [0.46, 0.54], [ya, (ya + yb) / 2, yb], flip=True)
    for y in (-5.12, 5.12):
        side = 1 if y > 0 else -1
        # Each little C-frame hooks under an edge. Its thumbscrew and jaw bear on the map.
        for x, z in ((-2.9, 18.0), (-3.08, 19.15)):
            tube(clamps, (x, y - side * 0.72, z), (x, y + side * 0.61, z), 0.18)
        tube(clamps, (-2.9, y + side * 0.61, 18), (-3.08, y + side * 0.61, 19.15), 0.23)
        tube(clamps, (-3.08, y - side * 0.52, 18.2), (-3.08, y - side * 0.52, 19.87), 0.12)
        tube(clamps, (-3.55, y - side * 0.52, 19.83), (-2.61, y - side * 0.52, 19.83), 0.12)
    pages.build("LRV_FourLaminatedMapSheets", chart(), repair)
    tape.build("LRV_GrayTapeCross", material("lrv3-fender-tape", (0.31, 0.30, 0.28), roughness=0.85, double_sided=True), repair)
    clamps.build("LRV_UtilityLightClamps", m["hardware"], repair)


def traverse_gravimeter(alloy, dark, *, part=None, origin=(-60.1, -16.3, 33.8)):
    """NASA RP-1317 S-199, 50.8 x 27.9 x 24.8 cm. D-shaped blue housing, flat side toward its holder."""
    if part is None:
        part = group("RoverGravimeter")
    hull, fittings, marks = MeshBuilder(), MeshBuilder(), MeshBuilder()
    x, y, base = origin
    width, depth, height = (cm / 2.54 for cm in (27.9, 24.8, 50.8))
    radius = width / 2

    def section(z, scale):
        profile = [(depth / 2, -radius), (depth / 2, radius)]
        for a in range(0, 181, 15):
            profile.append((-(depth / 2 - 1.7) - 1.7 * sin(radians(a)), radius * cos(radians(a))))
        return [point(x + dx * scale, y + dy * scale, base + z) for dx, dy in profile]

    levels = [section(z, scale) for z, scale in ((0.8, 0.88), (1.35, 1), (16.6, 1), (17.25, 0.93))]
    n = len(levels[0])
    for a, b in zip(levels, levels[1:]):
        hull.add(a + b, [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)])
    hull.add(levels[-1], [tuple(range(n))])
    hull.add(levels[0], [tuple(reversed(range(n)))])
    # Fold-down carrying bail, closed control lid, external button and feet.
    box(fittings, (x + 0.43, y, base + 17.55), (6.25, 8.22, 0.36))
    for dy in (-4.4, 4.4):
        tube(fittings, (x, y + dy, base + 15.3), (x - 0.3, y + dy, base + height - 0.24), 0.22)
        tube(fittings, (x + 1.7, y + dy, base + 0.85), (x + 1.7, y + dy, base + 0.17), 0.36)
    tube(fittings, (x - 0.3, y - 4.4, base + height - 0.24), (x - 0.3, y + 4.4, base + height - 0.24), 0.24)
    tube(fittings, (x - 3.0, y, base + 0.84), (x - 3.0, y, base + 0.17), 0.41)
    tube(marks, (x, y - radius - 0.06, base + 10.5), (x, y - radius - 0.42, base + 10.5), 1.6)
    hull.build("LRV_BlueGravimeterCase", material("lrv3-gravimeter-blue", (0.15, 0.27, 0.34), metallic=0.36, roughness=0.65), part)
    fittings.build("LRV_GravimeterLidHandleAndFeet", alloy, part)
    marks.build("LRV_GravimeterSideFitting", dark, part)


def sep_receiver(alloy, ivory, dark, *, part=None, origin=(-38.5, -12.8, 27.3), deployed=True):
    if part is None:
        part = group("RoverSEP")
    case, post, loops, fittings = (MeshBuilder() for _ in range(4))
    x, y, base = origin
    box(case, (x, y, base + 4.5), (9.0, 9.2, 9.0))
    box(case, (x, y, base + 9.26), (9.48, 9.55, 0.4))
    box(fittings, (x - 4.61, y + 1.31, base + 2.8), (0.32, 4.1, 4.5))
    for dy in (-3.35, 3.35):
        tube(post, (x - 4.78, y + dy, base + 0.08), (x - 4.78, y + dy, base + 9.15), 0.19)
    if deployed:
        mast = x - 0.28, y - 5.24
        z = base + 55.7
        tube(post, (*mast, base - 3.2), (*mast, z), 0.33)
        # Three perpendicular loop antennas share a common centre and six corners.
        ends = [(mast[0] + 6.75, mast[1], z), (mast[0], mast[1] + 6.75, z), (mast[0] - 6.75, mast[1], z), (mast[0], mast[1] - 6.75, z)]
        for i, end in enumerate(ends):
            tube(loops, end, ends[(i + 1) % 4], 0.13)
            for dz in (-7, 7):
                tube(loops, end, (*mast, z + dz), 0.14)
    case.build("LRV_SEPReceiverThermalCover", ivory, part)
    fittings.build("LRV_SEPRecorder", dark, part)
    post.build("LRV_SEPMastAndMount", alloy, part)
    if deployed:
        loops.build("LRV_SEPThreeAxisLoopAntenna", alloy, part)


def sampler(alloy, ivory, dark):
    root = group("RoverLRVSampler")
    shaft, head, grip = MeshBuilder(), MeshBuilder(), MeshBuilder()
    # AS17-136-20760, sampler stowed pointing ahead of the right seat.
    tube(shaft, (-4.0, -23.3, 37.1), (22, -23.3, 42.3), 0.37)
    tube(grip, (-4.3, -23.3, 37.05), (1.6, -23.3, 38.21), 0.58)
    tube(shaft, (22, -23.3, 42.3), (24, -23.3, 41.4), 0.30)
    for dy in (-1.32, 1.32):
        tube(shaft, (24, -23.3, 41.4), (25.3, -23.3 + dy, 40.3), 0.21)
    for i in range(6):
        head.disc(point(25.3, -23.3, 40.3 - i * 0.25), (0.22, 0, 1), (1.47 - 0.04 * i) * IN, 0.13 * IN, segs=18)
    box(grip, (10.8, -23.3, 39.2), (1.1, 1.6, 1.3))
    tube(shaft, (10.8, -23.3, 38.67), (10.8, -23.3, 22), 0.33)
    shaft.build("LRV_SamplerUniversalHandlingTool", alloy, root)
    head.build("LRV_NestedCupBags", ivory, root)
    grip.build("LRV_SamplerGripAndStowageClip", dark, root)


def payload(alloy, ivory, dark):
    grav = group("RoverGravimeter")
    traverse_gravimeter(alloy, dark, part=grav)
    cradle = MeshBuilder()
    for dy in (-19.7, -12.9):
        tube(cradle, (-54, -14.4, 30.2), (-60, dy, 33.6), 0.27)
        tube(cradle, (-54, -14.4, 40.5), (-55.1, dy, 40.2), 0.24)
    box(cradle, (-59.2, -16.3, 33.55), (8.2, 9.6, 0.52))
    cradle.build("LRV_GravimeterCradle", alloy, grav)
    sep_receiver(alloy, ivory, dark)
    sampler(alloy, ivory, dark)
    rack = group("RoverSeismicCarrier")
    tray, cases, handles = MeshBuilder(), MeshBuilder(), MeshBuilder()
    box(tray, (-43.3, 10.4, 44), (17.7, 14.0, 0.8))
    for x in (-50.1, -36.8):
        tube(tray, (x, 9.8, 22.4), (x, 9.8, 43.5), 0.42)
    for x, y, w, d, h in ((-46.8, 10.1, 6.0, 9.4, 7.8), (-39.4, 13.4, 6.1, 5.0, 6.6), (-39.5, 7.2, 5.8, 5.1, 5.8)):
        box(cases, (x, y, 44.4 + h / 2), (w, d, h))
        for off in (-1.65, 1.65):
            tube(handles, (x + off, y, 44.4 + h), (x + off, y, 45.8 + h), 0.18)
        tube(handles, (x - 1.65, y, 45.8 + h), (x + 1.65, y, 45.8 + h), 0.18)
    tray.build("LRV_SeismicTransportPallet", alloy, rack)
    cases.build("LRV_SeismicTransitCases", dark, rack)
    handles.build("LRV_TransitCaseHandles", alloy, rack)

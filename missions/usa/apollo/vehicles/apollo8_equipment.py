"""Apollo 8 antenna, tunnel hatch and sighting accessories. Source units are inches; see csm-103.md."""

import math

import bpy
from mathutils import Matrix, Vector

from srlib import IN, MeshBuilder, frame, group, interior, lathe_obj, mark_shells, material, prof

DISH_RADIUS = 31 / 2  # Apollo 8 press kit p. 36
BOOM_CLOCK = 52.25  # Apollo 8 Mission Report, Fig. A.1-5: from -Y toward +Z (Apollo axes)


def metric(point):
    return Vector(point) * IN


def antenna(parent, sm_bottom):
    """Build in the launch attitude. The joint's parent supplies the as-flown azimuth."""
    metal = material("apollo-antenna-alloy", (0.56, 0.57, 0.55), metallic=0.65, roughness=0.42)
    dark = material("apollo-antenna-reflector", (0.055, 0.06, 0.065), metallic=0.42, roughness=0.62)
    white = material("apollo-antenna-insulation", (0.77, 0.77, 0.73), roughness=0.85)
    # Model X is Apollo -Z and model Y is Apollo +Y. Place the hinge on the aft bulkhead,
    # with +X in its local frame pointing outboard along the deployed arm.
    clock = math.radians(-90 - BOOM_CLOCK)
    mount = group("HGA_ClockedMount", parent)
    mount.rotation_euler.z = clock
    mount.location = metric((69 * math.cos(clock), 69 * math.sin(clock), sm_bottom - 2))
    swivel = group("HGA_Deployment", mount)
    fixed = MeshBuilder()
    fixed.box(metric((9, 13, 3)), Matrix.Translation(metric((-2, 0, 1))))
    for y in (-4.2, 4.2):
        fixed.tube(metric((0, y - 0.8, 0)), metric((0, y + 0.8, 0)), 3.3 * IN)
    fixed.build("HGA_HingeBracket", metal, mount)
    boom = MeshBuilder()
    boom.tube(metric((0, -4, 0)), metric((0, 4, 0)), 1.8 * IN, segs=32)
    boom.tube(metric((0, 0, -1)), metric((0, 0, -53)), 2.45 * IN, segs=40)
    boom.tube(metric((0, 0, -45)), metric((0, 0, -52)), 3.1 * IN, segs=32)
    boom.tube(metric((0, -4, -55)), metric((0, 4, -55)), 4 * IN, segs=32)
    boom.build("HGA_BoomAndGimbal", metal, swivel)
    # Flight photograph S68-52190 shows the dark shallow reflectors, white
    # feed supports, central horn and yoke. Perforations fall below the
    # drawing scale; use a finite, dark metal face.
    rigging, fittings = MeshBuilder(), MeshBuilder()
    depth = 3.2
    radii = [DISH_RADIUS * j / 12 for j in range(13)]
    profile = [(r, depth * (r / DISH_RADIUS) ** 2) for r in radii]
    # Front surface faces local +Z in the reflector frame.
    section = list(reversed(profile)) + [(r, z - 0.22) for r, z in profile] + [profile[-1]]
    centre = Vector((0, 0, -64))
    carrier = group("HGA_FourReflectors", swivel)
    reflector_mesh = None
    for y in (-16, 16):
        for z in (-16, 16):
            dish_at = centre + Vector((-3, y, z))
            name = f"HGA_Reflector_{y}_{z}"
            if reflector_mesh is None:
                dish = lathe_obj(name, prof(section), dark, carrier, segs=80)
                reflector_mesh = dish.data
            else:
                dish = bpy.data.objects.new(name, reflector_mesh)
                bpy.context.scene.collection.objects.link(dish)
                dish.parent = carrier
            dish.matrix_local = frame(metric(dish_at), (-1, 0, 0))
            fittings.tube(metric(centre), metric(dish_at), 1.1 * IN, segs=20)
            feed = dish_at + Vector((-8, 0, 0))
            for j in range(3):
                angle = math.tau * j / 3
                root = dish_at + Vector((-1.0, 8.8 * math.cos(angle), 8.8 * math.sin(angle)))
                rigging.tube(metric(root), metric(feed), 0.2 * IN)
            rigging.tube(metric(feed), metric(feed + Vector((-1.2, 0, 0))), 0.9 * IN)
    # Square-section wide-beam feed horn between the four reflectors.
    horn_pose = frame(metric(centre), (-1, 0, 0)) @ Matrix.Rotation(math.pi / 4, 4, "Z")
    corner = 5.5 * math.sqrt(2)
    rigging.lathe(prof([(2.6, 1), (2.6, 5), (corner, 12), (corner - 0.35, 12), (2.1, 5.5), (0, 5.5)]), segs=4, matrix=horn_pose)
    rigging.build("HGA_HornsAndSupports", white, swivel)
    fittings.build("HGA_ReflectorSupports", metal, swivel)


def combined_hatch(parent, base, alloy, dark):
    """Combined pressure and ablative hatch. Face arrangement from MSC-PA-R-69-1 Fig. A.1-1."""
    cap = material("apollo-forward-hatch-insulation", (0.56, 0.45, 0.33), roughness=0.87)
    # The external crown closes the tunnel even in the distant level.
    outer = lathe_obj(
        "CM_CombinedHatchCap",
        prof([(0, base + 110.7), (14.9, base + 110.7), (14.9, base + 111.7), (14.5, base + 112.05), (0, base + 112.05)]),
        cap,
        parent,
    )
    mark_shells([outer.name])
    if not interior():
        return
    dish = lathe_obj(
        "CM_CombinedHatchBody",
        prof([(0, base + 104.7), (10.5, base + 104.7), (14.85, base + 107.6), (14.85, base + 110.5), (0, base + 110.5)]),
        alloy,
        parent,
    )
    mark_shells([dish.name])
    centre = lathe_obj(
        "CM_EqualizationValve",
        prof([(0, base + 103.25), (1.4, base + 103.25), (2.05, base + 104.0), (2.5, base + 104.5), (2.5, base + 104.75)]),
        dark,
        parent,
    )
    mark_shells([centre.name])
    latch = MeshBuilder()
    for j in range(6):
        a = math.tau * j / 6
        poses = [(r * math.cos(a), r * math.sin(a), base + z) for r, z in ((9, 104.4), (11.2, 105.2), (14.45, 107.1))]
        latch.tube(metric(poses[0]), metric(poses[2]), 0.42 * IN)
    for start, end in [((4, -2, 104.6), (4, -2, 103)), ((4, -2, 103), (4, -8, 103)), ((4, -8, 103), (4, -8, 104.5))]:
        latch.tube(metric((start[0], start[1], base + start[2])), metric((end[0], end[1], base + end[2])), 0.4 * IN)
    mark_shells([latch.build("CM_CombinedHatchDrive", alloy, parent).name])


def navigation(parent, base):
    if not interior():
        return
    # Companion to the two oculars in cabin_bays.build. A sun filter on the
    # scanning telescope and camera adapter on the sextant were new in 103.
    black = material("apollo-optical-adapter", (0.065, 0.07, 0.068), metallic=0.4, roughness=0.48)
    axis = Vector((0.90, 0, 0.435)).normalized()
    for label, y, section in (
        ("SextantCameraAdapter", -4.75, [(1.55, 5.4), (2.0, 5.6), (2.0, 6.15), (1.52, 6.25), (1.55, 5.4)]),
        ("TelescopeFilterCell", 4.75, [(1.85, 6.85), (1.85, 7.45), (1.2, 7.45), (1.2, 7.02), (1.85, 6.85)]),
    ):
        collar = lathe_obj(f"CM_{label}", prof(section), black, parent, segs=40)
        collar.matrix_local = frame(metric((-42, y, base + 47)), axis)

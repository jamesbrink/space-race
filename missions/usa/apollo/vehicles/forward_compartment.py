"""CM forward compartment. Installed equipment envelopes estimated from NAR P-131. See cabin-fittings.md."""

import json
import math
from pathlib import Path

from mathutils import Matrix, Vector

import apollo8_equipment
import perforated_wall
from cm_reference import survey_cm
from srlib import CM, IN, MeshBuilder, interior, lathe_obj, mark_shells, material, prof


def build(parent, base, *, combined_hatch=False, hatch_setback=0):
    structure = material("apollo-tunnel-alloy", (0.64, 0.65, 0.62), metallic=0.6, roughness=0.55, double_sided=True)
    cloth = material("apollo-landing-pack", (0.66, 0.61, 0.48), roughness=0.96)
    strap = material("apollo-landing-webbing", (0.81, 0.77, 0.67), roughness=0.87)
    dark = material("apollo-recovery-fittings", (0.26, 0.29, 0.28), metallic=0.6, roughness=0.5)
    if combined_hatch:
        apollo8_equipment.combined_hatch(parent, base - hatch_setback, structure, dark)
    if not interior():
        return
    record = json.loads((Path(__file__).parent / "reference/apollo-cm-inner-apertures.json").read_text())
    rim = perforated_wall.convex_boundary(
        [Vector(survey_cm(p, record["registration"])) * CM / IN for p in record["tunnel_entry_interface"]["boundary_cm"]]
    )
    # Retain the measured entry, transitioning to a nominal 30-inch hatch.
    # Top station and wall section above the surveyed entry are estimates.
    mesh = MeshBuilder()
    rim = [a.lerp(b, i / 8) for a, b in zip(rim, rim[1:] + rim[:1]) for i in range(8)]
    rings = [[Vector((p.x, p.y, p.z)) for p in rim]]
    for r, h in ((15.4, 84), (15.4, 108), (15.0, 108), (15.0, 84)):
        rings.append([Vector((r * p.x / math.hypot(p.x, p.y), r * p.y / math.hypot(p.x, p.y), h)) for p in rim])

    rings.append([Vector((p.x, p.y, p.z)) + Vector((p.x, p.y, 0)).normalized() * -0.4 for p in rim])

    def world(p):
        return tuple((p + Vector((0, 0, base))) * IN)

    n = len(rim)
    faces = [
        (j * n + i, j * n + (i + 1) % n, ((j + 1) % len(rings)) * n + (i + 1) % n, ((j + 1) % len(rings)) * n + i)
        for j in range(len(rings))
        for i in range(n)
    ]
    mesh.add([world(p) for ring in rings for p in ring], faces)
    mesh.build("CM_ForwardTunnel", structure, parent)
    mark_shells(["CM_ForwardTunnel"])
    if not combined_hatch:
        hatch = lathe_obj(
            "CM_ForwardPressureHatch",
            prof([(0, base + 106.6), (14.8, base + 106.6), (14.9, base + 107.5), (14.7, base + 108), (0, base + 108)]),
            structure,
            parent,
            segs=80,
        )
        mark_shells([hatch.name])

        def tube(builder, a, b, r):
            builder.tube(world(Vector(a)), world(Vector(b)), r * IN, segs=12)

        fittings = MeshBuilder()
        for i in range(6):
            a = math.tau * i / 6
            tube(fittings, (8 * math.cos(a), 8 * math.sin(a), 106.05), (14 * math.cos(a), 14 * math.sin(a), 106.05), 0.35)
        tube(fittings, (3, -3, 105.1), (8, -3, 105.1), 0.55)
        tube(fittings, (3, -3, 105.1), (3, -3, 106.45), 0.6)
        fittings.build("CM_ForwardHatchLatches", dark, parent)
    # P-131 and P-136: three packs around the tunnel; fourth quadrant
    # contains recovery gear. Round the packet corners in radius and height.
    for index, middle in enumerate((math.pi, math.pi / 2, -math.pi / 2)):
        # The bands are integrated into the pack surface. Each has a raised
        # crown with sloping edges and its own cloth material.
        profile = [(17.0, 82.1), (31.5, 82.1), (33.4, 83.7), (26, 95.3), (24.5, 96.1), (17.6, 96.1), (16.6, 94.5), (16.6, 83.2)]
        angles = sorted({*range(-32, 33, 2), *[a + d for a in (-20, 0, 20) for d in (-1.3, -1, 1, 1.3)]})
        points, faces, strips = [], [], []
        for j, deg in enumerate(angles):
            angle = middle + math.radians(deg)
            raised = any(abs(deg - c) <= 1 for c in (-20, 0, 20))
            for r, h in profile:
                dr = 0.16 if raised and r > 23 else 0
                dz = 0.16 if raised and h > 94 else 0
                points.append(((r + dr) * math.cos(angle) * IN, (r + dr) * math.sin(angle) * IN, (base + h + dz) * IN))
            if j:
                k = len(profile)
                for i in range(k):
                    faces.append(((j - 1) * k + i, j * k + i, j * k + (i + 1) % k, (j - 1) * k + (i + 1) % k))
                    strips.append(any(abs((deg + angles[j - 1]) / 2 - c) < 1.3 for c in (-20, 0, 20)))
        k = len(profile)
        faces.extend((tuple(range(k)), tuple((len(angles) - 1) * k + i for i in reversed(range(k)))))
        m = MeshBuilder()
        m.add(points, faces)
        bag = m.build(f"CM_MainParachutePack_{index + 1}", cloth, parent, smooth=False)
        bag.data.materials.append(strap)
        for f, is_band in zip(bag.data.polygons, strips):
            f.material_index = int(is_band)
    for i, (angle, radius, body_radius, height) in enumerate(
        ((38, 24, 2, 9), (128, 24, 2, 9), (218, 24, 2, 9), (-23, 23, 3.3, 12), (22, 23, 3.3, 12))
    ):
        a = math.radians(angle)
        part = lathe_obj(
            f"CM_{'Pilot' if i < 3 else 'Drogue'}Canister_{i}",
            prof([(0, 0), (body_radius, 0), (body_radius, height - 0.45), (body_radius - 0.2, height), (0, height)]),
            dark,
            parent,
            segs=32,
        )
        part.matrix_local = Matrix.Translation(Vector((radius * math.cos(a), radius * math.sin(a), base + 82)) * IN)


def recovery_loop(parent, base):
    """CM-108 single nylon lifting loop, shown stowed in the forward recovery quadrant (estimated)."""
    if not interior():
        return
    web = material("apollo-recovery-nylon", (0.75, 0.70, 0.54), roughness=0.93, double_sided=True)
    metal = material("apollo-recovery-fittings", (0.26, 0.29, 0.28), metallic=0.6, roughness=0.5)
    # Two attachment cheeks with the folded sling lying between the drogue canisters.
    strap, cheeks = MeshBuilder(), MeshBuilder()
    path = [(19.2, -0.8), (21.7, -1.7), (25.4, -1.7), (26.1, -0.8), (26.1, 0.8), (25.4, 1.7), (21.7, 1.7), (19.2, 0.8)]
    for x, y in (path[0], path[-1]):
        cheeks.box((1.2 * IN, 0.6 * IN, 1.2 * IN), Matrix.Translation(Vector((x, y, base + 90.6)) * IN))
    vertices = [(x * IN, y * IN, (base + z) * IN) for x, y in path for z in (90.2, 91.0)]
    strap.add(vertices, [(2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2) for i in range(len(path) - 1)])
    strap.build("CM108_NylonRecoveryLoop", web, parent, smooth=False)
    cheeks.build("CM108_RecoveryLoopAnchors", metal, parent)

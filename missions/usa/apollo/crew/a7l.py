"""Apollo 7 intravehicular pressure garment. Dimensions estimated in cm from the flown suits (a7l.md)."""

import math

import bpy
from mathutils import Matrix, Vector

import figurelib as fl
import srlib
from srlib import MeshBuilder, arc_profile, frame, material

# Standing proportions are estimates. All three wear the intravehicular configuration.
MEN = {"Schirra": 175.0, "Eisele": 180.0, "Cunningham": 178.0}
HEAD = ("Head", "Eyes", "Irises", "Brows", "Lips", "Cap", "PressureBubble", "NeckRing", "Earphones")


def paint(name, rgb, **kwargs):
    return bpy.data.materials.get(name) or material(name, rgb, **kwargs)


def garment(who):
    body = fl.B
    cloth = paint("suit-beta-cloth", (0.88, 0.87, 0.81), roughness=0.9)
    dark = paint("apollo-suit-rubber", (0.04, 0.045, 0.05), roughness=0.8)
    blue = paint("apollo-suit-anodised-blue", (0.075, 0.19, 0.5), metallic=0.65)
    red = paint("apollo-suit-anodised-red", (0.52, 0.055, 0.04), metallic=0.65)
    metal = paint("apollo-suit-aluminium", (0.55, 0.56, 0.58), metallic=0.8)
    helmet = fl.group("Helmet")
    head, eyes, iris, brow, lip = (MeshBuilder() for _ in range(5))
    fl.build_head(head, eyes, iris, brow, lip)
    skin = paint("skin-apollo", (0.62, 0.41, 0.30))
    head.tube((0, 0.6, body.neck_z - 5), (0, 0.4, body.head.z - 6), 5.6, 24)
    for mesh, name, mat in [(head, "Head", skin), (eyes, "Eyes", cloth), (iris, "Irises", dark), (brow, "Brows", dark), (lip, "Lips", skin)]:
        if mesh.verts:
            fl.emit(mesh, "Helmet_" + name, mat, helmet)
    cap, phones, bubble, ring = (MeshBuilder() for _ in range(4))
    cap.lathe(
        arc_profile(0, 0, 1, 8, 90, 16),
        48,
        matrix=Matrix.Translation(body.head) @ Matrix.Diagonal((*[r + 0.8 for r in body.skull], 1)) @ Matrix.Rotation(math.radians(-56), 4, "X"),
    )
    for sign in (-1, 1):
        phones.lathe(
            [(0, 0), (5.6, 0), (5.5, 1.2), (4.4, 2.5), (0, 2.5)],
            28,
            matrix=frame(body.head + Vector((sign * (body.skull[0] - 0.3), 0.5, -1)), (sign, 0, 0)),
        )
    neck = Matrix.Translation((0, body.head_y, body.neck_z))
    ring.lathe([(10.3, -2.6), (12.3, -2.6), (12.8, -1.8), (12.8, 1.0), (11.9, 1.8), (10.3, 1.8)], 56, matrix=neck)
    bubble.lathe(
        [(11.7, 1.55), (13.0, 4.3), (14.4, 10), (14.6, 16), (13.7, 21), (11.6, 25.5), (8, 28.2), (4, 29.8), (0, 30.3)],
        64,
        matrix=neck @ Matrix.Diagonal((1, 1.08, 1, 1)),
    )
    for mesh, name, mat in [
        (cap, "Cap", cloth),
        (phones, "Earphones", dark),
        (ring, "NeckRing", blue),
        (bubble, "PressureBubble", paint("glass-visor", (0.8, 0.86, 0.88), alpha=0.13, roughness=0.06)),
    ]:
        fl.emit(mesh, "Helmet_" + name, mat, helmet)
    torso = fl.Tube([(0, 0, z) for z, _, _ in body.torso], [(x, y) for _, x, y in body.torso], resample=10)
    arms = {s: fl.Tube([(s * x, y, z) for x, y, z, _, _ in body.arm], [(a, b) for *_, a, b in body.arm], resample=12) for s in (-1, 1)}
    legs = {s: fl.Tube([(s * x, y, z) for x, y, z, _, _ in body.leg], [(a, b) for *_, a, b in body.leg], resample=12) for s in (-1, 1)}
    trunk, trousers, sleeves, gloves, ports, inlets, outlets, insert, pocket = (MeshBuilder() for _ in range(9))
    fl.build_shell(trunk, torso, arms)
    fl.Trousers(torso, legs).build(trousers)
    trunk_node = fl.group("Torso")
    fl.emit(trunk, "Torso_BetaCloth", cloth, trunk_node)
    # Disconnects let cabin air into the garment and carry expired air back to the suit circuit.
    for az, z, connector in [(-0.58, body.waist_z + 10, outlets), (0.51, body.waist_z + 10, inlets), (0.63, body.waist_z + 19, ports)]:
        d, theta = z - body.torso_z0, az - math.pi / 2
        m = frame(torso.at(d, theta), torso.normal(d, theta))
        connector.lathe([(0, -0.2), (3.1, -0.2), (3.2, 0.7), (2.4, 1.2), (2.4, 2.5), (1.9, 2.7), (1.6, 2.3)], 24, matrix=m)
        insert.lathe([(0, 2.0), (1.7, 2.0), (1.6, 2.3), (0, 2.3)], 20, matrix=m)
    for mesh, label, mat in [(outlets, "Exhaust", red), (inlets, "Supply", blue), (ports, "Electrical", metal), (insert, "Caps", dark)]:
        fl.emit(mesh, "Torso_" + label, mat, trunk_node)
    arm_node, glove_node, leg_node = fl.group("Arms"), fl.group("Gloves"), fl.group("Legs")
    rings = {-1: MeshBuilder(), 1: MeshBuilder()}
    fingers = []
    for sign, tube in arms.items():
        tube.mesh(sleeves, 32, tube.rows(body.sleeve_hem), caps=(False, True), sunk=lambda d: 1.1 * fl.smooth(d, tube.length - 5, tube.length))
        hand, palm = fl.gloved_hand(gloves, sign, tube.path[-1] - tube.path[-2], fingers)
        wrist = palm.centre(2.2)
        rings[sign].lathe(
            [(4.4, -1.7), (5.5, -1.7), (5.6, -0.6), (5.85, 0), (5.5, 1.4), (4.4, 1.4)], 32, matrix=frame(wrist, palm.centre(3.2) - palm.centre(1.2))
        )
        leg = legs[sign]
        d = leg.key_d(body.knee_at) + 4.5
        theta = leg.toward((sign * 0.6, -1, 0), d)
        leg.patch(pocket, d, d + 13, theta - 0.66, theta + 0.66, 0.65, nd=8, nt=8)
    gloves.share = fingers
    fl.emit(sleeves, "Arms_Sleeves", cloth, arm_node)
    fl.emit(gloves, "Gloves_PressureGloves", cloth, glove_node)
    for sign, mesh in rings.items():
        fl.emit(mesh, "Gloves_Wrist" + ("Right" if sign < 0 else "Left"), red if sign < 0 else blue, glove_node)
    fl.emit(trousers, "Legs_Trousers", cloth, leg_node)
    fl.emit(pocket, "Legs_Stowage", cloth, leg_node)
    boot_node = fl.group("Boots")
    upper, sole, laces, hooks, tongue = (MeshBuilder() for _ in range(5))
    fl.laced_boots(upper, sole, laces, hooks, tongue, 25, 30, body.stature / 180.3, lace_lift=1.35)
    for mesh, label, mat in [
        (upper, "Upper", cloth),
        (sole, "Sole", dark),
        (laces, "Laces", cloth),
        (hooks, "Hooks", metal),
        (tongue, "Tongue", cloth),
    ]:
        fl.emit(mesh, "Boots_" + label, mat, boot_node)


def fit(who):
    body = fl.man().scaled(stature=MEN[who], heel=2.8, breadth=1.0, girth=1.0, bulk=(0.9, 0.8, 0.6))
    x, y, z, _, _ = body.leg[-1]
    body.leg[-1] = (x, y, z, 3.5, 3.8)
    fl.use(body)


def standing(who):
    fit(who)
    fl.start()
    garment(who)
    fl.rig_standing()
    return f"{who}, intravehicular A7L pressure garment"


def seated(parent, base):
    from unitized_couch import BACK_PITCH_DEGREES, CENTRES_Y, HIP_X, HIP_XC

    if not srlib.interior():
        return
    pitch = math.radians(BACK_PITCH_DEGREES)
    headward = Vector((math.cos(pitch), 0, math.sin(pitch)))
    chest = Vector((-headward.z, 0, headward.x))
    across = Vector((0, 1, 0))
    for index, (who, y, seat) in enumerate(zip(MEN, CENTRES_Y, ("Seat_Commander", "Seat_CommandModulePilot", "Seat_LunarModulePilot"))):
        fit(who)
        place = Matrix((across, -headward, chest)).transposed().to_4x4()
        place.translation = (Vector((HIP_X, y, HIP_XC + base)) + chest * 6.75) * srlib.IN
        posture = {"hip": 94, "knee": 95, "ankle": 40, "knees_in": 2, "pelvis": 8, "elbow": 82, "elbow_toe_in": 35, "pronate": 40, "grip": 0.15}
        fl.build_posed(parent, place, "Crew_" + who, lambda: fl.seated_rig(posture, (-3, 11.5, 1.2)), lambda who=who: garment(who))
        eyes = bpy.data.objects.get(f"Crew_{who}_Helmet_Eyes")
        if eyes:
            anchor = bpy.data.objects[seat]
            anchor.location = sum((v.co for v in eyes.data.vertices), Vector()) / len(eyes.data.vertices)
        dress_harness(who, index, chest)


def dress_harness(who, index, chest):
    """Drape the six lengths of webbing over the occupied suit. Work in couch-local metres."""
    from mathutils.bvhtree import BVHTree

    trees = []
    for suffix in ("Torso_BetaCloth", "Legs_Trousers"):
        mesh = bpy.data.objects[f"Crew_{who}_{suffix}"].data
        trees.append(BVHTree.FromPolygons([v.co for v in mesh.vertices], [p.vertices[:] for p in mesh.polygons]))

    def lift(point):
        hits = [tree.ray_cast(point + chest, -chest, 1.05)[0] for tree in trees]
        return max([0.0, *((p - point).dot(chest) + 0.004 for p in hits if p is not None)])

    for item in ("Shoulder", "Lap", "Crotch"):
        for side in (-1, 1):
            obj = bpy.data.objects[f"CM_Couch{item}Harness_{index}_{side}"]
            mesh = obj.data
            rings = [[v.co.copy() for v in mesh.vertices[i : i + 4]] for i in range(0, len(mesh.vertices), 4)]
            steps = [[a.lerp(b, k / 16) for a, b in zip(prev, nxt)] for prev, nxt in zip(rings, rings[1:]) for k in range(16)] + [rings[-1]]
            points = []
            for ring in steps:
                shift = max(lift(p) for p in ring)
                points.extend([p + chest * shift for p in ring])
            faces = [(4 * i + j, 4 * i + (j + 1) % 4, 4 * (i + 1) + (j + 1) % 4, 4 * (i + 1) + j) for i in range(len(steps) - 1) for j in range(4)]
            faces.extend([(3, 2, 1, 0), tuple(range(len(points) - 4, len(points)))])
            mesh.clear_geometry()
            mesh.from_pydata(points, [], faces)
            mesh.update()
    buckle = bpy.data.objects[f"CM_CouchBuckle_{index}"]
    shift = max(lift(v.co) for v in buckle.data.vertices)
    for label in ("Buckle", "Release"):
        bpy.data.objects[f"CM_Couch{label}_{index}"].location += chest * shift

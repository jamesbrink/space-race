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


def chest_patch(torso, parent, image_path):
    """Circular flight emblem on the left breast, sized and placed from the launch-day photographs."""
    patch = MeshBuilder()
    radius = 4.2  # cm
    azimuth = -math.pi / 2 + 0.52
    height = fl.B.waist_z - fl.B.torso_z0 + 25.7

    def disk(u, v):
        return u * math.sqrt(1 - v * v / 2), v * math.sqrt(1 - u * u / 2)

    def surface(u, v):
        x, z = disk(u, v)
        return torso.at(height + z * radius, azimuth + x * radius / 19, 0.38)

    def picture(u, v):
        x, z = disk(u, v)
        return (0.5 + 0.485 * x) / fl.CM, (0.5 + 0.485 * z) / fl.CM

    grid = [i / 4 - 1 for i in range(9)]
    patch.grid(surface, grid, grid, uv=picture)
    image = bpy.data.images.load(str(image_path), check_existing=True)
    mat = paint(image_path.stem, (1, 1, 1), roughness=0.92, image=image)
    fl.emit(patch, "Torso_MissionEmblem", mat, parent)


def garment(who, *, ev=False, a7lb=False, insignia=None, sleeve_emblems=None, chest_layout=None):
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
        (ring, "NeckRing", red if a7lb else blue),
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
    if insignia is not None:
        chest_patch(torso, trunk_node, insignia)
    if sleeve_emblems is not None:
        sleeve_emblems(arms, trunk_node)
    # Disconnects let cabin air into the garment and carry expired air back to the suit circuit.
    connections = [(-0.58, 10, outlets), (0.51, 10, inlets), (0.63, 19, ports)]
    if a7lb:
        # The flown J suits carry four blue and two red disconnects in two triangles.
        # The CMP used a distinct rear-entry garment with three disconnects.
        connections = (
            [(-0.79, 16, inlets), (-0.28, 14, inlets), (-0.56, 5, outlets), (0.27, 14, inlets), (0.78, 16, inlets), (0.55, 5, outlets)]
            if ev
            else [(-0.55, 10, outlets), (0.50, 10, inlets), (0.58, 19, inlets)]
        )
        waist = body.waist_z - body.torso_z0
        closure = MeshBuilder()
        if ev:
            # Trace the covered entry closure diagonally around the side and back.
            rows = []
            for i in range(49):
                t = i / 48
                d, theta = waist + 22 - 24 * t, -0.30 + 3.5 * t
                rows.append([torso.at(d + dz, theta, 0.55) for dz in (-1.35, 1.35)])
            fl.skin(closure, rows, torso.centre(waist + 10))
        else:
            torso.patch(closure, waist - 6, torso.length - 4, 1.45, 1.69, 0.6)
        fl.emit(closure, "Torso_SideEntry" if ev else "Torso_RearEntry", paint("a7lb-closure-cloth", (0.73, 0.72, 0.67), roughness=0.9), trunk_node)
    elif ev:
        # Extra chest connections on the EV garment. The PLSS backpack stayed off for launch.
        connections += [(-0.62, 20, outlets), (0.55, 0.5, inlets), (-0.47, 0.5, ports)]
    if chest_layout is not None:
        connections = [(az, height, inlets if blue_coupling else outlets) for az, height, blue_coupling in chest_layout]
    for az, height, connector in connections:
        z = body.waist_z + height
        d, theta = z - body.torso_z0, az - math.pi / 2
        m = frame(torso.at(d, theta), torso.normal(d, theta))
        connector.lathe([(0, -0.2), (3.1, -0.2), (3.2, 0.7), (2.4, 1.2), (2.4, 2.5), (1.9, 2.7), (1.6, 2.3)], 24, matrix=m)
        insert.lathe([(0, 2.0), (1.7, 2.0), (1.6, 2.3), (0, 2.3)], 20, matrix=m)
    for mesh, label, mat in [
        (outlets, "Exhaust", red),
        (inlets, "BlueConnectors" if a7lb else "Supply", blue),
        (ports, "Electrical", metal),
        (insert, "Caps", dark),
    ]:
        if mesh.verts:
            fl.emit(mesh, "Torso_" + label, mat, trunk_node)
    arm_node, glove_node, leg_node = fl.group("Arms"), fl.group("Gloves"), fl.group("Legs")
    rings = {-1: MeshBuilder(), 1: MeshBuilder()}
    fingers = []
    for sign, tube in arms.items():
        tube.mesh(sleeves, 32, tube.rows(body.sleeve_hem), caps=(False, True), sunk=lambda d: 1.1 * fl.smooth(d, tube.length - 5, tube.length))
        hand, palm = fl.gloved_hand(gloves, sign, tube.path[-1] - tube.path[-2], fingers)
        wrist = palm.centre(2.2)
        wrist_frame = frame(wrist, palm.centre(3.2) - palm.centre(1.2))
        if a7lb and ev:
            # The J-mission lunar suits had larger wrist disconnects (MSC-05161, appendix A.3.1).
            wrist_frame = wrist_frame @ Matrix.Diagonal((1.09, 1.09, 1, 1))
        rings[sign].lathe([(4.4, -1.7), (5.5, -1.7), (5.6, -0.6), (5.85, 0), (5.5, 1.4), (4.4, 1.4)], 32, matrix=wrist_frame)
        if a7lb and not ev:
            # The CMP cuff is drawn on the same full-sized palm as its glove. Fit both about the wrist.
            fl.fitted(rings[sign], 0, hand)
        leg = legs[sign]
        d = leg.key_d(body.knee_at) + 4.5
        theta = leg.toward((sign * 0.6, -1, 0), d)
        leg.patch(pocket, d, d + 13, theta - 0.66, theta + 0.66, 0.65, nd=8, nt=8)
    gloves.share = fingers
    fl.emit(sleeves, "Arms_Sleeves", cloth, arm_node)
    fl.emit(gloves, "Gloves_PressureGloves", paint("a7lb-iv-glove", (0.018, 0.028, 0.048), roughness=0.53) if a7lb else cloth, glove_node)
    for sign, mesh in rings.items():
        fl.emit(mesh, "Gloves_Wrist" + ("Right" if sign < 0 else "Left"), red if sign < 0 else blue, glove_node)
    fl.emit(trousers, "Legs_Trousers", cloth, leg_node)
    fl.emit(pocket, "Legs_Stowage", cloth, leg_node)
    boot_node = fl.group("Boots")
    upper, sole, laces, hooks, tongue = (MeshBuilder() for _ in range(5))
    fl.laced_boots(upper, sole, laces, hooks, tongue, 25, 30, body.stature / 180.3, lace_lift=1.35)
    for mesh, label, mat in [
        (upper, "Upper", cloth),
        (sole, "Sole", paint("a7lb-launch-sole", (0.57, 0.36, 0.095), roughness=0.88) if a7lb else dark),
        (laces, "Laces", cloth),
        (hooks, "Hooks", metal),
        (tongue, "Tongue", cloth),
    ]:
        fl.emit(mesh, "Boots_" + label, mat, boot_node)


def fit(who, stature=None):
    body = fl.man().scaled(stature=MEN[who] if stature is None else stature, heel=2.8, breadth=1.0, girth=1.0, bulk=(0.9, 0.8, 0.6))
    x, y, z, _, _ = body.leg[-1]
    body.leg[-1] = (x, y, z, 3.5, 3.8)
    fl.use(body)


def standing(who, *, stature=None, ev=False, a7lb=False, insignia=None, sleeve_emblems=None):
    fit(who, stature)
    fl.start()
    garment(who, ev=ev, a7lb=a7lb, insignia=insignia, sleeve_emblems=sleeve_emblems)
    fl.rig_standing()
    return f"{who}, {'EV' if ev else 'CMP' if a7lb else 'IV'} {'A7LB' if a7lb else 'A7L'} pressure garment"


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


def commander_bands(prefix=""):
    stripe = paint("a7l-commander-red", (0.58, 0.035, 0.025), roughness=0.9)
    # The garment UV's second coordinate is the station along each limb in metres.
    # Colour existing rows of cloth so the bands bend with the sleeves and trousers.
    for name, station in (("Arms_Sleeves", 0.32), ("Legs_Trousers", 0.30 + 0.50)):
        mesh = bpy.data.objects[prefix + name].data
        mesh.materials.append(stripe)
        uv = mesh.uv_layers.active.data
        for face in mesh.polygons:
            along = sum(uv[i].uv.y for i in face.loop_indices) / len(face.loop_indices)
            if abs(along - station) < 0.019:
                face.material_index = 1

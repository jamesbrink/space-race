"""Skylab 4 S201 far-UV camera. JSC-08963 §A.5 and fig. A-4, dimensions in centimetres."""

from mathutils import Matrix, Vector

from srlib import IN, MeshBuilder, frame, interior, material, prof

CM = 0.01
# Table B-I records the launch load. The position within the cabin is estimated.
CENTRE_IN = (-17, 0, 23)


def build(parent, cm_base):
    if not interior():
        return
    centre = Vector((CENTRE_IN[0], CENTRE_IN[1], cm_base + CENTRE_IN[2])) * IN

    def at(x, y, z):
        return centre + Vector((x, y, z)) * CM

    def plate(mesh, x, y, z, dims):
        mesh.box(Vector(dims) * CM, Matrix.Translation(at(x, y, z)))

    # Two removable end covers seal the instrument. The photograph resolves
    # the flanges, toggle panel, double ring sight and projecting front cap.
    finish = material("skylab118-s201-canister", (0.78, 0.80, 0.78), metallic=0.56, roughness=0.42)
    alloy = material("skylab118-s201-hardware", (0.52, 0.55, 0.55), metallic=0.85, roughness=0.35)
    dark = material("skylab118-s201-gasket", (0.09, 0.10, 0.10), roughness=0.68)
    amber = material("skylab118-s201-lamp", (0.39, 0.24, 0.10), roughness=0.32)
    hardware, controls, indicators, gaskets = (MeshBuilder() for _ in range(4))

    def enclosure(name, x0, x1, width, height, finish):
        y, z = width / 2, height / 2
        edge = 1.6
        profile = [(-y + edge, -z), (y - edge, -z), (y, -z + edge), (y, z - edge), (y - edge, z), (-y + edge, z), (-y, z - edge), (-y, -z + edge)]
        verts = [at(x, b, c) for x in (x0, x1) for b, c in profile]
        n = len(profile)
        faces = [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
        mesh = MeshBuilder()
        mesh.add(verts, [*faces, tuple(reversed(range(n))), tuple(range(n, n * 2))])
        mesh.build("CM118_S201_" + name, finish, parent, smooth=False)

    enclosure("PressureHousing", -22.22, 17.92, 29, 24.2, finish)
    for tag, start, stop in (("Rear", -24.47, -22.6), ("Front", 18.3, 20.45)):
        enclosure(tag + "Cover", start, stop, 30.4, 25.2, finish)
        end = start if tag == "Rear" else stop
        for side in (-1, 1):
            for z in (-9.6, 0, 9.6):
                hardware.tube(at(end, side * 13.4, z), at(end + (-0.28 if tag == "Rear" else 0.28), side * 13.4, z), 0.44 * CM, segs=6)
    enclosure("RearSeal", -22.6, -22.22, 29.3, 24.5, dark)
    enclosure("FrontSeal", 17.92, 18.3, 29.3, 24.5, dark)

    axis = Vector((1, 0, 0))
    cap = MeshBuilder()
    cap.lathe(prof([(0, 0), (9.2, 0), (9.2, 0.65), (8.4, 1.1), (8.4, 3.55), (7.8, 4.3), (0, 4.3)], CM), segs=48, matrix=frame(at(20.45, 0, 0), axis))
    cap.build("CM118_S201_OpticalEndCover", alloy, parent)
    # Sight rings lie on the side opposite the controls' top edge and have a
    # common line of sight parallel to the optical axis.
    for x, radius in ((-10.5, 2.4), (10.5, 3.35)):
        sight = frame(at(x, 0, 15.85), axis)
        ring = [(radius - 0.24, 0), (radius, 0), (radius, 0.55), (radius - 0.24, 0.55), (radius - 0.24, 0)]
        hardware.lathe(prof(ring, CM), segs=32, matrix=sight)
        hardware.tube(at(x, 0, 12.32), at(x, 0, 15.85 - radius), 0.32 * CM, caps=False)
        plate(hardware, x, 0, 12.21, (3.1, 2.2, 0.22))

    plate(controls, 1.8, -15.94, 0, (24.8, 2.85, 14))
    for x in (-6.8, 7.5):
        plate(gaskets, x, -17.46, 2.0, (3.7, 0.16, 6.7))
        hardware.tube(at(x, -17.55, 1.6), at(x, -20.4, 2.65), 0.44 * CM)
        indicators.tube(at(x, -17.39, -3.3), at(x, -17.84, -3.3), 0.62 * CM, segs=16)
    for y in (-1, 1):
        for x in (-19.3, 15):
            for z in (-1, 1):
                hardware.tube(at(x, y * 14.52, z * 9.9), at(x, y * 14.95, z * 9.9), 0.40 * CM, segs=6)
    controls.build("CM118_S201_SwitchPanel", finish, parent, smooth=False)
    gaskets.build("CM118_S201_SwitchPlates", dark, parent, smooth=False)
    hardware.build("CM118_S201_SightSwitchesAndFasteners", alloy, parent)
    indicators.build("CM118_S201_SequenceIndicators", amber, parent)

"""Block II probe and drogue, modelled in inches about opposed hard-dock sealing planes.

NASA TN D-6854, figs. 9, A-5 and A-13: CM datum, drogue width and depth, structure,
capture and hard-dock hardware. Local hardware sections and depths unmarked on the
drawings are estimates. Each frame's Blender +Z (glTF +Y) is outboard.
"""

import math

from mathutils import Matrix, Vector

from srlib import IN, MeshBuilder, group, prof

CM_PLANE = 110.25  # CM station on fig. A-13.
LM_PLANE = 238.65  # Apollo 9 Mission Report fig. A.2-2: pad plane to the top of the ascent stage, assumed to be the docking plane.
DROGUE_RADIUS = 31.454 / 2  # mounting lugs, not the cone's mouth
MOUTH_SETBACK = 3.35  # scaled from fig. A-13, face to cone rim
CONE_DEPTH = 13.01  # fig. A-13, cone rim to centre opening
SOCKET_DEPTH = MOUTH_SETBACK + CONE_DEPTH


def radial(r, angle, z):
    return Vector((r * math.cos(angle), r * math.sin(angle), z)) * IN


def turned_pads(mesh, radius, angle, z, size):
    pose = Matrix.Translation(radial(radius, angle, z)) @ Matrix.Rotation(angle, 4, "Z")
    mesh.box(Vector(size) * IN, pose)


def surface(name, sections, paint, parent, sides=64):
    mesh = MeshBuilder()
    for section in sections:
        mesh.lathe(prof(section), sides)
    return mesh.build(name, paint, parent)


def station(name, parent, inches):
    node = group(name, parent)
    node.location.z = inches * IN
    return node


def command(parent, base, alloy, dark):
    # Keep the probe's moving piston as a direct descendant of the stationary frame.
    frame = station("GumdropDockingFrame", parent, base + CM_PLANE)
    surface(
        "CM104_DockingRing",
        [
            [
                (15.15, -3.6),
                (18.54, -3.6),
                (18.54, -0.48),
                (18.32, -0.12),
                (16, -0.12),
                (15.78, 0.85),
                (15.48, 0.85),
                (15.48, -1.25),
                (15.15, -1.75),
                (15.15, -3.6),
            ]
        ],
        alloy,
        frame,
    )
    seals = []
    for r in (16.55, 17.58):
        seals.append([(r - 0.14, -0.16), (r - 0.13, -0.05), (r, 0), (r + 0.13, -0.05), (r + 0.14, -0.16)])
    surface("CM104_ConcentricTunnelSeals", seals, dark, frame)

    stops = MeshBuilder()
    for i in range(12):
        a = math.tau * i / 12
        turned_pads(stops, 18.17, a, -2.64, (2.48, 2.08, 1.2))
        mount = group(f"CM104_LatchMount_{i}", frame)
        mount.location = radial(19.05, a, -2.53)
        mount.rotation_euler.z = a
        hinge = group(f"CM104_LatchHinge_{i}", mount)
        hinge.rotation_euler.y = math.radians(24)
        latch = MeshBuilder()
        # A cocked hook clears the lunar flange. At hard dock it swings over its shoulder.
        outline = [(0, 0), (0.08, 1.20), (0.08, 3.85), (-0.15, 4.27), (-0.90, 4.27)]
        for side in (-0.48, 0.48):
            for start, end in zip(outline, outline[1:]):
                latch.tube(Vector((start[0], side, start[1])) * IN, Vector((end[0], side, end[1])) * IN, 0.2 * IN, segs=8, caps=False)
        latch.tube(Vector((-0.90, -0.48, 4.27)) * IN, Vector((-0.90, 0.48, 4.27)) * IN, 0.2 * IN, segs=8)
        latch.build(f"CM104_DockingLatch_{i}", alloy, hinge)
    stops.build("CM104_DockingLatchMounts", alloy, frame)

    # Fig. A-5: three support beams, pitch arms and attenuators carry the central cylinder.
    surface("CM104_ProbeGuide", [[(2.65, -4.5), (3.48, -4.5), (3.48, 7.6), (3.18, 8.35), (2.65, 8.35), (2.65, -4.5)]], alloy, frame)
    for i in range(3):
        a = math.tau * i / 3 + math.pi / 6
        beam = MeshBuilder()
        turned_pads(beam, 14.84, a, -4.35, (1.6, 2.08, 2.35))
        for da in (-0.105, 0.105):
            beam.tube(radial(14.8, a + da, -4.2), radial(3.34, a + da, -1), 0.31 * IN, segs=10)
        beam.tube(radial(12.8, a, -3.6), radial(8.2, a, 0.15), 0.68 * IN, segs=12)
        beam.tube(radial(8.2, a, 0.15), radial(3.38, a, 4.1), 0.35 * IN, segs=10)
        beam.build(f"CM104_ProbeSupport_{i}", alloy, frame)
    extension = group("CM104_ProbeExtension", frame)
    surface(
        "CM104_DockingProbe",
        [
            [
                (0, -3.14),
                (2.45, -3.14),
                (2.45, 11.02),
                (1.52, 13.4),
                (1.25, SOCKET_DEPTH - 0.85),
                (1.40, SOCKET_DEPTH + 0.54),
                (1.1, SOCKET_DEPTH + 0.94),
                (0.45, SOCKET_DEPTH + 1.27),
                (0, SOCKET_DEPTH + 1.34),
            ]
        ],
        alloy,
        extension,
    )
    for i in range(3):
        hook = group(f"CM104_CaptureHook_{i}", extension)
        hook.rotation_euler.z = math.tau * i / 3
        # The head's compressed hooks pass through the lip. Each then springs out
        # along its own radial axis into the wider receptacle pocket (travel estimated).
        tooth = MeshBuilder()
        tooth.tube(radial(0.95, 0, SOCKET_DEPTH + 0.80), radial(1.48, 0, SOCKET_DEPTH + 0.38), 0.13 * IN, segs=8)
        tooth.build(f"CM104_ProbeHeadTooth_{i}", dark, hook)


def lunar(parent, alloy, dark):
    frame = station("SpiderDockingFrame", parent, LM_PLANE)
    surface(
        "LM3_DockingRing",
        [[(16, 0), (18.5, 0), (18.65, -0.28), (18.65, -1.45), (17.8, -1.61), (17.8, -3.20), (17.35, -3.20), (17.35, -2.55), (16, -2.55), (16, 0)]],
        alloy,
        frame,
    )

    # Fig. A-13. One-inch sandwich wall measured normal to the conical guide.
    def face(z):
        return -MOUTH_SETBACK - z

    section = [
        (14.2, face(0)),
        (2.54, face(CONE_DEPTH - 0.90)),
        (2.54, face(CONE_DEPTH + 0.12)),
        (2.83, face(CONE_DEPTH + 0.28)),
        (14.83, face(0.83)),
        (14.2, face(0)),
    ]
    surface("LM3_DockingDrogue", [section], alloy, frame)
    surface(
        "LM3_ProbeHeadReceptacle",
        [
            [
                (1.66, face(CONE_DEPTH)),
                (1.66, face(CONE_DEPTH + 0.21)),
                (2.07, face(CONE_DEPTH + 0.36)),
                (2.07, face(CONE_DEPTH + 1.60)),
                (1.4, face(CONE_DEPTH + 2.10)),
                (1.4, face(CONE_DEPTH + 2.48)),
                (2.47, face(CONE_DEPTH + 2.48)),
                (2.47, face(CONE_DEPTH - 0.93)),
                (1.66, face(CONE_DEPTH)),
            ]
        ],
        dark,
        frame,
    )
    beams, ribs = MeshBuilder(), MeshBuilder()
    for i in range(3):
        a = math.tau * i / 3 - math.pi / 2
        beams.tube(radial(2.66, a, face(CONE_DEPTH + 0.45)), radial(14.73, a, face(1.03)), 0.36 * IN, segs=10)
        turned_pads(beams, DROGUE_RADIUS - 0.53, a, face(0.80), (1.06, 1.53, 1.20))
        beams.tube(radial(14.62, a, face(1.06)), radial(16.15, a, -2.18), 0.44 * IN, segs=10)
        for da in (-math.radians(41), math.radians(41)):
            ribs.tube(radial(3.16, a + da, face(CONE_DEPTH)), radial(14.51, a + da, face(1.17)), 0.19 * IN, segs=8)
    beams.build("LM3_DrogueSupportBeamsAndMounts", alloy, frame)
    ribs.build("LM3_DrogueStringers", dark, frame)

"""Casper's service-engine yaw actuator. Profile and harness estimated from MSC-07230, fig. 14-12."""

from mathutils import Matrix, Vector

from srlib import IN, MeshBuilder, frame, material, prof


def yaw_actuator(parent, extension):
    # The common engine places its orthogonal actuators between the ring and the mount.
    # Build the finned drive and tethered harness in the frame of the +Y actuator.
    lower = Vector((0, 19.8, extension + 18.9))
    upper = Vector((0, 9, extension + 37.3))
    pose = frame(lower * IN, upper - lower)
    alloy = material("sm113-actuator-aluminium", (0.48, 0.5, 0.48), metallic=0.75, roughness=0.42)
    black = material("sm113-actuator-connectors", (0.07, 0.075, 0.07), metallic=0.45)
    braid = material("sm113-actuator-harness", (0.68, 0.64, 0.51), roughness=0.76)
    case, fins, plug, harness, clamps = (MeshBuilder() for _ in range(5))

    def point(x, y, z):
        return pose @ (Vector((x, y, z)) * IN)

    def box(mesh, x, y, z, dims):
        mesh.box(Vector(dims) * IN, pose @ Matrix.Translation(Vector((x, y, z)) * IN))

    # The rectangular case surrounds the shared actuator barrel. Its drive shaft is visible at the foot.
    box(case, 0, 0, 10.75, (6.25, 6.0, 7.0))
    for x in (-1, 1):
        for i in range(8):
            box(fins, x * 3.31, -2.6 + i * 0.74, 10.75, (0.36, 0.23, 6.4))
    for z in (7.08, 14.42):
        box(case, 0, 0, z, (6.55, 6.3, 0.31))
    for x in (-1, 1):
        for z in (8, 13.6):
            plug.tube(point(2.55 * x, -2.98, z), point(2.55 * x, -3.26, z), 0.2 * IN)
    plug_frame = frame(point(0, -2.99, 11.1), point(0, -4, 11.1) - point(0, -3, 11.1))
    plug.lathe(prof([(0, 0), (1.12, 0), (1.12, 0.4), (0.86, 0.55), (0.82, 1.35), (0.55, 1.9), (0.35, 2.5), (0, 2.5)]), 24, matrix=plug_frame)
    path = [
        (0, -5.30, 11.1),
        (0, -5.80, 10.85),
        (0.1, -6.05, 10.3),
        (0.25, -5.91, 9.4),
        (0.55, -5.42, 4.1),
        (0.75, -5.31, 2.65),
        (1.2, -5.45, 1.95),
        (2.5, -5.81, 1.75),
        (3.1, -6.25, 1.45),
    ]
    for a, b in zip(path, path[1:]):
        harness.tube(point(*a), point(*b), 0.26 * IN, segs=14)
    box(clamps, 0.8, -4.1, 2.7, (1.5, 2.8, 0.42))
    clamps.tube(point(0.7, -5.29, 2.45), point(0.8, -5.38, 2.94), 0.43 * IN)
    case.build("SM113_YawActuatorDrive", alloy, parent, smooth=False)
    fins.build("SM113_YawActuatorCoolingFins", alloy, parent, smooth=False)
    plug.build("SM113_YawActuatorConnector", black, parent)
    harness.build("SM113_YawActuatorHarness", braid, parent)
    clamps.build("SM113_YawActuatorLowerClamp", alloy, parent)

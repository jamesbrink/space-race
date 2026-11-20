"""S-IU-208's S150 galactic X-ray experiment. Inches, in each IU bay's local frame."""

import math

from mathutils import Vector

from saturn_structure import ball, pipe
from skylab_ib_equipment import IU_BASE, box
from srlib import IN, MeshBuilder, frame, group, material, prof


def bay(name, part, degrees):
    angle = math.radians(degrees)
    obj = group(name, group(part, lineup_enclosed=True))
    obj.location = Vector((123 * math.cos(angle), 123 * math.sin(angle), IU_BASE)) * IN
    obj.rotation_euler.z = angle
    return obj


def build():
    # NASA-CR-120167 vol II figs. 1-1 to 1-3 show the actual three equipped bays.
    # Local +X faces the IU skin, +Z up. Reconstructed clocking is in sa-207.md.
    alloy = material("s150-instrument-alloy", (0.62, 0.65, 0.66), metallic=0.65)
    black = material("s150-electronics", (0.085, 0.095, 0.105), metallic=0.35)
    foil = material("s150-counter-window", (0.43, 0.37, 0.28), metallic=0.70)
    white = material("s150-protective-cover", (0.77, 0.78, 0.75), roughness=0.58)
    sensor = bay("S150_Bay24", "XRayExperiment", -135)
    # Upper trunnions support the counter. It swings into the open bore of the
    # instrument unit once the CSM has gone; the launch cover folds over its distal end.
    for y in (-11.1, 11.1):
        box("S150_Bracket", sensor, (2.4, 1.2, 29), (-2.2, y, 18.2), alloy)
        bearing = MeshBuilder()
        bearing.lathe(
            prof([(0.81, -0.7), (1.4, -0.7), (1.4, 0.7), (0.81, 0.7), (0.81, -0.7)]), segs=24, matrix=frame(Vector((-4.4, y, 31.9)) * IN, (0, 1, 0))
        )
        bearing.build("S150_AxleBearing", alloy, sensor)
        box("S150_AxleSupport", sensor, (1.8, 1.52, 1.8), (-2.59, y, 31.9), alloy)
        for z in (5.2, 29.6):
            box("S150_WallFoot", sensor, (9.0, 2.1, 1.35), (1.85, y, z), alloy)
    hinge = group("S150_DeploymentPivot", sensor)
    hinge.location = Vector((-4.4, 0, 31.9)) * IN
    metalwork = MeshBuilder()
    metalwork.disc((0, -12.1 * IN, 0), (0, 1, 0), 0.69 * IN, 24.2 * IN, segs=16)
    metalwork.build("S150_CounterAxle", alloy, hinge)
    box("S150_CounterCasting", hinge, (4.78, 18.8, 23.4), (-0.6, 0, -12.55), black)
    box("S150_WindowFlange", hinge, (0.42, 17.35, 18.6), (-3.06, 0, -11.4), alloy)
    box("S150_EntranceWindow", hinge, (0.19, 16.4, 16.0), (-3.38, 0, -11.4), foil)
    for i in range(10):
        box("S150_CollimatorVane", hinge, (0.78, 0.12, 16.55), (-3.93, -7.8 + i * 1.73, -11.4), black)
    for y in (-6.6, 6.6):
        box("S150_StarSensorCase", hinge, (1.66, 3.1, 3.4), (-3.16, y, -22.1), alloy)
        box("S150_StarSensorSlit", hinge, (0.11, 1.85, 0.25), (-4.05, y, -22.2), black)
    lid = group("S150_CoverPivot", hinge)
    lid.location = Vector((-4.84, 0, -20.97)) * IN
    box("S150_ProtectiveCover", lid, (0.29, 17.8, 19.3), (0, 0, 9.86), white)
    for y in (-7.2, 7.2):
        box("S150_CoverHinge", lid, (0.91, 1.38, 0.78), (0, y, 0), alloy)

    gas = bay("S150_Bay14", "XRayGasSupply", 75)
    for y in (-5.6, 5.6):
        box("S150_GasPanelRail", gas, (6.0, 1.65, 23), (2.1, y, 14), alloy)
    sphere = MeshBuilder()
    ball(sphere, (-4.5, 0, 20), 7.0)
    sphere.build("S150_P10StorageSphere", alloy, gas)
    box("S150_RegulatorBase", gas, (1.0, 17.2, 7), (-1.0, 0, 7), black)
    flow = MeshBuilder()
    for y in (-5.2, 3.1):
        flow.disc((-1.5 * IN, y * IN, 7.3 * IN), (-1, 0, 0), 1.55 * IN, 2.6 * IN, segs=16)
    pipe(flow, [(-4.5, 0, 13.2), (-4.5, 0, 10.5), (-4.5, -5.2, 10.5), (-4.5, -5.2, 7.4)], 0.24)
    pipe(flow, [(-4.0, -5.2, 7.3), (-4.0, -5.2, 4.5), (-4.0, 3.1, 4.5), (-4.0, 3.1, 7.4)], 0.24)
    flow.build("S150_RegulatorsAndLines", alloy, gas)
    # Equipment panel at the next IU station. Five components belong to the ASAP package.
    rack = bay("S150_Bay23", "XRayRecorder", -150)
    for y in (-5.6, 5.6):
        box("S150_ASAPRackRail", rack, (6.5, 1.45, 30), (2.97, y, 17), alloy)
    for i, (y, z, w, h) in enumerate(((-5, 24, 8, 12), (6, 27, 8.4, 7.5), (6, 16.8, 8.7, 9), (-5, 12, 7.2, 6), (0, 5.1, 19.5, 6.1)), 1):
        box(f"S150_ASAPCase{i}", rack, (4.6, w, h), (-2.9, y, z), black)
        box(f"S150_ASAPFlange{i}", rack, (0.55, w + 0.8, h + 0.9), (-0.31, y, z), alloy)

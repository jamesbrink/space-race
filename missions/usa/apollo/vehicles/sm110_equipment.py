"""SM-110 reserve oxygen, redesigned heater and auxiliary battery. Source inches; see csm-110.md."""

import math

from mathutils import Matrix, Vector

from service_tanks import OXYGEN_DIAMETER, _ball, _lathe, _line, _ring
from srlib import IN, MeshBuilder, interior, material


def build(reserve, core, battery, origin_xa):
    if not interior():
        return
    silver = material("apollo-oxygen-stainless", (0.56, 0.58, 0.58), metallic=0.76, roughness=0.33)
    jacket = material("apollo-dewar-jacket", (0.52, 0.53, 0.51), metallic=0.82, roughness=0.31)
    support = material("apollo-oxygen-shelf-anodized", (0.54, 0.28, 0.08), metallic=0.65, roughness=0.38)
    dark = material("apollo-oxygen-electrical", (0.10, 0.11, 0.12), metallic=0.25)

    # Place sector I opposite IV. Local equipment stations are estimated.
    def bay(r, t, xa, angle=40):
        a = math.radians(angle)
        return (r * math.cos(a) - t * math.sin(a), r * math.sin(a) + t * math.cos(a), xa - origin_xa)

    def tank(x, y, z):
        return bay(53 + x, y, 920 + z)

    centre = tank(0, 0, 0)
    _ball("SM110_OxygenThreeVacuumJacket", OXYGEN_DIAMETER, centre, jacket, reserve)
    _lathe("SM110_OxygenThreeFlange", _ring(13.27, 14.0, -0.38, 0.38), centre, silver, reserve)
    _lathe("SM110_OxygenThreeDome", [(3.1, 12.5), (4.2, 12.9), (4.2, 16.6), (1.1, 17.9), (0.82, 18.7), (0, 18.7)], centre, jacket, reserve)
    tubing, mounts = MeshBuilder(), MeshBuilder()
    for angle in (0, 120, 240):
        a = math.radians(angle)
        _line(mounts, [tank(s * math.cos(a), s * math.sin(a), z) for s, z in ((13.82, -0.25), (14.2, -2.6), (14.2, -15))], 0.47)
    # Two transverse bearers meet the radial webs at 15 and 65 degrees.
    for x in (-7.1, 14.2):
        half_span = (53 + x) * math.tan(math.radians(25)) - 0.4
        _line(mounts, [tank(x, -half_span, -15), tank(x, half_span, -15)], 0.62)
    for side in (-1, 1):
        _line(mounts, [tank(-7.1, side * 12.30, -15), tank(14.2, 0, -15)], 0.38)
    mounts.build("SM110_OxygenThreeCradle", support, reserve)
    _line(tubing, [tank(x, y, z) for x, y, z in ((0, 3.9, 14.8), (0, 6.5, 14.8), (1, 8.1, 13), (3.2, 12, 12), (7, 12, 12))], 0.35)
    _line(tubing, [tank(x, y, z) for x, y, z in ((7, 12, 9), (7, 12, 7), (8.4, 13.5, 6), (12.5, 14, 5))], 0.35)
    tubing.build("SM110_OxygenThreeOutlet", silver, reserve)
    _lathe("SM110_ExternalOxygenFilter", [(0, 9), (0.65, 9), (1.08, 9.6), (1.08, 11.3), (0.62, 12.1), (0, 12.1)], tank(7, 12, 0), jacket, reserve)

    # NASA S71-16745 shows the gage alongside the three heater elements, hung from the dome.
    _lathe(
        "SM110_QuantityCapacitanceProbe",
        [(0, -11.5), (0.63, -11.5), (0.63, 10.8), (0.92, 10.8), (0.92, 11.7), (0, 11.7)],
        tank(0, -1.45, 0),
        silver,
        core,
    )
    _lathe("SM110_HeaterCarrier", [(0, -11.4), (0.78, -11.4), (0.78, 10.8), (0, 10.8)], tank(0, 1.45, 0), dark, core)
    heater = MeshBuilder()
    for n in range(3):
        path = []
        for step in range(129):
            a = math.tau * (8 * step / 128 + n / 3)
            path.append(tank(0.91 * math.cos(a), 1.45 + 0.91 * math.sin(a), -10.5 + 18.2 * step / 128))
        _line(heater, path, 0.18)
    heater.build("SM110_ThreeSheathedHeaters", silver, core)
    conduit = MeshBuilder()
    for side in (-1, 1):
        _line(conduit, [tank(0, y * side, z) for y, z in ((1.45, 10.5), (1.45, 12), (0.8, 13.4), (0.8, 14.3))], 0.24)
    conduit.build("SM110_InstrumentConduits", silver, core)

    # NASA TN D-6976 table I, fig. 17. The 17-inch dimension lies across the opening.
    def box(mesh, r, t, xa, dims):
        pose = Matrix.Translation(Vector(bay(r, t, xa, 220)) * IN) @ Matrix.Rotation(math.radians(220), 4, "Z")
        mesh.box(Vector(dims) * IN, pose)

    case, hardware, leads = MeshBuilder(), MeshBuilder(), MeshBuilder()
    r, t, base = 34, 0, 839.29
    length, width, height = 16.94, 9.04, 9.96
    # The cover and housing share the nominal type envelope.
    box(case, r, t, base + 4.63, (width - 0.12, length - 0.12, 9.26))
    box(hardware, r, t, base + height - 0.32, (width, length, 0.64))
    for side in (-1, 1):
        box(hardware, r + side * 4.2, t, base - 0.32, (1.6, 17.5, 0.64))
        stud = bay(r + 3.1, t + side * 6.5, base + height, 220)
        _lathe(f"SM110_BatteryTerminal{side}", [(0, 0.06), (0.50, 0.06), (0.50, 0.62), (0.27, 0.71), (0.27, 1.06), (0, 1.06)], stud, dark, battery)
        _line(
            leads,
            [
                bay(r + dr, t + side * dt, base + h, 220)
                for dr, dt, h in ((3.1, 6.5, 10.86), (4.2, 6.9, 11.25), (5.9, 7.1, 10.1), (7, 7, 7.6), (8, 6.5, 6.3))
            ],
            0.23,
        )
    case.build("SM110_AuxiliaryBatteryCase", dark, battery)
    hardware.build("SM110_BatteryCoverAndRails", silver, battery)
    leads.build("SM110_BatteryLeads", dark, battery)

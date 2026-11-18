"""Soyuz 10, 7K-OKS No. 31 and its 11A511. Spacecraft stations in millimetres from the aft end."""

from __future__ import annotations

import math
import sys
from pathlib import Path

from mathutils import Matrix

_root = next(path for path in Path(__file__).resolve().parents if (path / "tools" / "blender").is_dir())
sys.path.insert(0, str(_root / "tools" / "blender"))
sys.path.insert(0, str(_root / "missions" / "ussr" / "voskhod" / "crew"))
for _programme in ("vostok", "voskhod", "soyuz"):
    sys.path.insert(0, str(_root / "missions" / "ussr" / _programme / "vehicles"))

import soyuz_7kok  # noqa: E402
import soyuz_11a511  # noqa: E402
import soyuz_cabin  # noqa: E402
from flight_suit import Wearer  # noqa: E402
from soyuz_7kok import BOARDING_HATCH_AZIMUTH, BOARDING_HATCH_STATION, box, metres, polar, rod, surface  # noqa: E402
from srlib import MeshBuilder, frame, group, interior, mark_shells, run  # noqa: E402

# Shatalov is in the centre; the outboard arrangement follows the RKK Energia trainer photo.
# Crew clothing, figure proportions and poses are reconstructed.
COMMANDER = Wearer("Shatalov", wool_colour=(0.13, 0.087, 0.081))
PORT = Wearer("Rukavishnikov", breadth=0.97, wool_colour=(0.082, 0.088, 0.098))
STARBOARD = Wearer("Yeliseyev", breadth=0.97, wool_colour=(0.145, 0.169, 0.195))
TRANSFER_PLANE = 7130  # 2.65 m from the descent hatch datum; Portree §1.7.2
PROBE_TIP = 7500  # Portree §1.7.1, adopted as the overall length with probe


def orbital_module(paints):
    """The Salyut 1-type room and its forward pressure tunnel, Portree Fig. 1-18."""
    module = group("OrbitalModule")
    profile = [
        (1100 * math.cos(a), centre + 1100 * math.sin(a))
        for centre, angles in ((5580, range(-70, 1, 5)), (5750, range(0, 61, 5)))
        for a in map(math.radians, angles)
    ]
    skin = soyuz_7kok.insulation(module, "BO_Gores", profile, paints, 16)
    neck = surface(module, "BO_TransferNeck", paints["alloy"], [(369, 4455), (390, 4495), (384, 4552), (373, 4565)])
    forward = surface(module, "BO_ForwardTunnel", paints["tape"], [(554, 6687), (553, 6715), (542, 6780), (514, 6900), (513, 7005), (498, 7025)])
    mark_shells([neck.name, forward.name])
    soyuz_7kok.port(module, skin, "BO_SideHatch", BOARDING_HATCH_AZIMUTH, BOARDING_HATCH_STATION, 1098, 0, 320, paints, hatch=True)
    for az in (26, 155):
        soyuz_7kok.port(module, skin, "BO_Window" + str(az), az, 6130, 1038, 22, 104, paints)
    for az in (-134, -46):
        mount = frame(metres(polar(692, az, 6595)), polar(0.64, az, 0.77))
        fitting = surface(
            module,
            f"BO_ForwardFitting_{az}",
            paints["alloy"],
            [(58, -36), (61, 8), (53, 24), (46, 60), (34, 81), (0, 88)],
            mount,
            36,
        )
        mark_shells([fitting.name])
    if interior():
        lockers, faces, pulls, bench = (MeshBuilder() for _ in range(4))
        # Keep the central transfer route clear. Placement of these stores is illustrative.
        box(bench, (-655, 0, 5500), (318, 970, 300))
        box(bench, (-655, 0, 5660), (313, 952, 34))
        box(lockers, (687, 0, 5560), (328, 998, 550))
        for y in (-320, 0, 320):
            box(faces, (519, y, 5560), (13, 292, 520))
            rod(pulls, (489, y - 56, 5670), (489, y + 56, 5670), 8)
        for mesh, name, paint in (
            (bench, "BO_StowageBench", "tape"),
            (lockers, "BO_Storage", "white"),
            (faces, "BO_StorageDoors", "back"),
            (pulls, "BO_StoragePulls", "alloy"),
        ):
            mesh.build(name, paints[paint], module)


def docking_unit(paints):
    """Annular docking face, recessed pressure hatch and removable active probe."""
    collar = group("DockingCollar")
    mount = surface(
        collar,
        "SSVP_TunnelBody",
        paints["alloy"],
        [(484, 7002), (526, 7033), (541, 7075), (541, TRANSFER_PLANE), (421, TRANSFER_PLANE), (404, 7109), (404, 7000)],
    )
    seal = surface(collar, "SSVP_Seal", paints["dark"], [(444, 7127), (449, 7133), (458, 7134), (465, 7130)], sides=96)
    hatch = surface(collar, "SSVP_PressureHatch", paints["white"], [(404, 7057), (384, 7060), (355, 7071), (288, 7081), (0, 7086)])
    mark_shells([mount.name, hatch.name, seal.name])
    links, fasteners = MeshBuilder(), MeshBuilder()
    # Recessed latch housings suggested by the peripheral openings in the drawing.
    for index in range(12):
        az = 15 + 30 * index
        turn = Matrix.Rotation(math.radians(az), 4, "Z")
        links.box((0.031, 0.055, 0.008), Matrix.Translation(metres(polar(498, az, TRANSFER_PLANE + 5))) @ turn)
        for shift in (-4, 4):
            p = metres(polar(475, az + shift, TRANSFER_PLANE + 3))
            fasteners.disc(p, (0, 0, 1), 0.005, 0.006)
    pockets = links.build("SSVP_LatchPockets", paints["dark"], collar)
    bolts = fasteners.build("SSVP_CollarFasteners", paints["foil"], collar)
    mark_shells([pockets.name, bolts.name])

    probe = group("DockingProbe")
    surface(probe, "SSVP_ProbeHead", paints["alloy"], [(20, 7440), (32, 7448), (30, 7474), (16, 7496), (5, PROBE_TIP), (0, PROBE_TIP)])
    surface(
        probe,
        "SSVP_ProbeStem",
        paints["alloy"],
        [(158, 7083), (151, 7106), (127, 7138), (114, 7175), (85, 7205), (45, 7205), (36, 7235), (27, 7244), (19, 7251), (19, 7459)],
        sides=64,
    )
    bellows = [(radius, z) for station in range(7255, 7437, 13) for radius, z in ((25, station), (32, station + 4), (25, station + 8))]
    surface(probe, "SSVP_ProbeBellows", paints["dark"], bellows, sides=48)
    brace, rollers = MeshBuilder(), MeshBuilder()
    for az in (0, 120, 240):
        rod(brace, polar(282, az, 7084), polar(120, az, 7180), 14)
        rod(rollers, polar(38, az, 7452), polar(27, az, 7475), 5)
    brace.build("SSVP_ProbeSupports", paints["foil"], probe)
    rollers.build("SSVP_ProbeFittings", paints["alloy"], probe)


def rendezvous_antennas(paints):
    root = soyuz_7kok.igla_antenna(paints)
    brackets = MeshBuilder()
    for side, sign in (("Left", -1), ("Right", 1)):
        rod(brackets, (sign * 974, -350, 5960), (sign * 1084, -350, 6030), 20)
        boom = group("IglaAux" + side, root)
        boom.location = metres((sign * 1084, -350, 6030))
        mast = MeshBuilder()
        rod(mast, (0, 0, 0), (0, 0, 605), 19)
        rod(mast, (0, -27, 22), (0, -27, 535), 7)
        mast.build(boom.name + "_Mast", paints["alloy"], boom)
        dish = frame(metres((0, 0, 605)), (0, -1, 0))
        surface(boom, boom.name + "_Dish", paints["white"], [(0, -38), (54, -31), (97, -11), (104, 0), (99, 5), (54, -22), (0, -26)], dish, 40)
        surface(boom, boom.name + "_Feed", paints["foil"], [(14, -30), (12, 13), (22, 22), (0, 22)], dish, 24)
    brackets.build("Igla_AuxBearings", paints["foil"], root)


def build() -> str:
    paints = soyuz_7kok.palette()
    soyuz_7kok.service(paints, aft_torus=False)
    soyuz_7kok.descent(paints)
    orbital_module(paints)
    docking_unit(paints)
    rendezvous_antennas(paints)
    soyuz_7kok.infrared_vertical(paints)
    soyuz_7kok.wing("Left", -1, paints)
    soyuz_7kok.wing("Right", 1, paints)
    soyuz_cabin.build(COMMANDER, port=PORT, starboard=STARBOARD, hand_controls=True)
    launcher = soyuz_11a511.build(BOARDING_HATCH_AZIMUTH, BOARDING_HATCH_STATION)
    return f"{launcher}; {PROBE_TIP * soyuz_7kok.MM:.3f} m aft end to probe tip"


if __name__ == "__main__":
    base = soyuz_11a511.BASE_Z * soyuz_11a511.MM
    mid = base + soyuz_11a511.LENGTH * soyuz_11a511.MM / 2
    run(
        "soyuz-10 vehicle",
        build,
        [
            ("stack.png", (0, 0, mid), 145, dict(azimuth=-60, elevation=6, res=(900, 1900))),
            ("upper.png", (0, 0, 7), 52, dict(azimuth=30, elevation=8, res=(1100, 1900))),
        ],
    )

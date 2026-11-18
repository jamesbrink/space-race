"""Soyuz 12, 7K-T No. 37 and its 11A511. Spacecraft stations in millimetres from the aft end."""

from __future__ import annotations

import sys
from pathlib import Path

from mathutils import Matrix

_root = next(path for path in Path(__file__).resolve().parents if (path / "tools" / "blender").is_dir())
sys.path.insert(0, str(_root / "tools" / "blender"))
sys.path.insert(0, str(_root / "missions" / "ussr" / "voskhod" / "crew"))
for _programme in ("vostok", "voskhod", "soyuz"):
    sys.path.insert(0, str(_root / "missions" / "ussr" / _programme / "vehicles"))

import sokol_k  # noqa: E402
import soyuz_7kok  # noqa: E402
import soyuz_11a511  # noqa: E402
import soyuz_cabin  # noqa: E402
from flight_suit import Wearer  # noqa: E402
from soyuz_7kok import BOARDING_HATCH_AZIMUTH, BOARDING_HATCH_STATION, box, metres, polar, rod, surface  # noqa: E402
from soyuz_station import PROBE_TIP, docking_unit, orbital_module  # noqa: E402
from srlib import MeshBuilder, frame, group, interior, run  # noqa: E402

COMMANDER = Wearer("Lazarev", breadth=0.97)
ENGINEER = Wearer("Makarov", breadth=0.95)


def whip(side, sign, paints):
    """Ferry whips and their stowed bearings, inferred from Portree fig. 1-20."""
    node = group("WhipAntenna" + side)
    hinge = (sign * 1208, 0, 424)
    bracket = MeshBuilder()
    box(bracket, (sign * 1194, 0, 403), (74, 58, 62))
    rod(bracket, (sign * 1208, 0, 427), (sign * 1208, 0, 444), 18, 24)
    bracket.build("Whip" + side + "Bearing", paints["alloy"], node)
    mast = group("Whip" + side + "Mast", node)
    mast.location = metres(hinge)
    surface(mast, "Whip" + side + "Insulator", paints["white"], [(23, 14), (33, 29), (33, 65), (23, 93), (17, 121)], sides=32)
    surface(mast, "Whip" + side + "Rod", paints["alloy"], [(14, 105), (13, 179), (8, 556), (4, 1982), (0, 1986)], sides=18)


def rendezvous_antennas(paints):
    root = soyuz_7kok.igla_antenna(paints)
    for side, sign in (("Left", -1), ("Right", 1)):
        supports, rail = MeshBuilder(), MeshBuilder()
        rod(supports, (sign * 1025, 0, 6112), (sign * 1134, 0, 6165), 23)
        rod(supports, (sign * 1065, -65, 6138), (sign * 1134, -65, 6165), 14)
        supports.build("Igla_" + side + "AuxSupport", paints["foil"], root)
        boom = group("IglaAux" + side, root)
        boom.location = metres((sign * 1134, 0, 6165))
        for y in (-28, 28):
            rod(rail, (0, y, 0), (0, y, 613), 11)
        for station in (54, 229, 414, 600):
            rod(rail, (0, -27, station), (0, 27, station), 8)
        rail.build(boom.name + "_Rail", paints["alloy"], boom)
        dish = frame(metres((0, 0, 618)), (0, -1, 0.5))
        surface(boom, boom.name + "_Dish", paints["white"], [(0, -41), (61, -31), (95, -9), (103, 0), (96, 4), (59, -23), (0, -31)], dish, 48)
        surface(boom, boom.name + "_Feed", paints["foil"], [(11, -35), (10, 10), (19, 18), (0, 18)], dish, 24)


def suit_supply(paints):
    node = group("SuitSupply", lineup_enclosed=True)
    if not interior():
        return node
    rack, bottle, clamps, hoses = (MeshBuilder() for _ in range(4))
    # The 7K-T traded its third couch for suit support equipment. The visible packing is illustrative.
    for x in (379, 665):
        for y in (-380, 264):
            rod(rack, (x, y, 2480), (x, y, 2630), 21)
        rod(rack, (x, -432, 2630), (x, 315, 2630), 25)
    for y in (-340, 218):
        rod(rack, (340, y, 2620), (712, y, 2620), 18)
    for x in (456, 621):
        cylinder = frame(metres((x, -319, 2740)), (0, 1, 0))
        bottle.lathe([(0, 0), (0.044, 0.012), (0.062, 0.043), (0.067, 0.074), (0.067, 0.473), (0.055, 0.507), (0.032, 0.532)], 32, matrix=cylinder)
        for y in (-185, 84):
            band = frame(metres((x, y, 2740)), (0, 1, 0))
            clamps.lathe([(0.067, -0.016), (0.072, -0.015), (0.072, 0.015), (0.067, 0.016)], 32, matrix=band)
            rod(rack, (x, y, 2670), (x, y, 2630), 17)
        rod(clamps, (x, 209, 2740), (x, 255, 2740), 19)
        hoses.tube(metres((x, 253, 2740)), metres((x, 296, 2845)), 0.012, 14)
        hoses.tube(metres((x, 296, 2845)), metres((x - 48, 211, 2950)), 0.012, 14)
    box(rack, (548, -314, 2893), (234, 165, 98))
    face = frame(metres((548, -404, 2893)), (0, -1, 0))
    for x in (-58, 58):
        clamps.disc(face @ metres((x, 0, 0)), (0, -1, 0), 0.028, 0.014, 24)
        hoses.disc(face @ metres((x, 0, 10)), (0, -1, 0), 0.021, 0.004, 24)
    rack.build("SuitSupply_RackAndControls", paints["alloy"], node)
    bottle.build("SuitSupply_Bottles", paints["white"], node)
    clamps.build("SuitSupply_ClampsAndConnectors", paints["foil"], node)
    hoses.build("SuitSupply_HosesAndDialFaces", paints["dark"], node)
    return node


def lksa_camera(paints):
    node = group("LksaCamera", lineup_enclosed=True)
    if not interior():
        return
    # Film housing and mounting frame estimated from Kottsov's photograph (fig. 3, p. 167).
    # The photographed window is not identified. Place the assembly inside the starboard pane.
    mount = frame(metres(polar(809, 26, 6117)), polar(0.97, 26, 0.16))
    body, rails, face, leads = (MeshBuilder() for _ in range(4))
    for y in (-72, 0, 72):
        body.box(metres((206, 64, 163)), mount @ Matrix.Translation(metres((0, y, -27))))
        body.box(metres((217, 68, 24)), mount @ Matrix.Translation(metres((0, y, -115))))
        face.box(metres((212, 68, 16)), mount @ Matrix.Translation(metres((0, y, 61))))
    for x in (-125, 125):
        for y in (-94, 94):
            rails.tube(mount @ metres((x, y, -134)), mount @ metres((x, y, 138)), 0.013, 16)
        rails.tube(mount @ metres((x, -94, 133)), mount @ metres((x, 94, 133)), 0.016, 16)
        grip = [mount @ metres(p) for p in ((x, -79, -118), (x * 1.21, -83, -143), (x * 1.21, 82, -143), (x, 79, -118))]
        for a, b in zip(grip, grip[1:]):
            rails.tube(a, b, 0.012, 16)
    for x in (-62, 0, 62):
        for y in (-72, 0, 72):
            lens = mount @ Matrix.Translation(metres((x, y, 67)))
            face.lathe([(0.024, 0), (0.025, 0.019), (0.020, 0.027), (0.017, 0.027), (0.017, 0.019)], 32, matrix=lens)
            surface(node, f"LKSA_Optic_{x}_{y}", paints["glass"], [(17, 86), (9, 90), (0, 91)], mount @ Matrix.Translation(metres((x, y, 0))), 32)
    for x in (-52, 49):
        path = [mount @ metres(p) for p in ((x, -80, -119), (x, -125, -152), (x - 16, -164, -117), (x - 91, -207, -89))]
        for a, b in zip(path, path[1:]):
            leads.tube(a, b, 0.0075, 12)
    body.build("LKSA_ChannelHousings", paints["white"], node)
    rails.build("LKSA_CradleAndHandles", paints["alloy"], node)
    face.build("LKSA_ObjectiveHoods", paints["dark"], node)
    leads.build("LKSA_Leads", paints["foil"], node)


def build() -> str:
    paints = soyuz_7kok.palette()
    service = soyuz_7kok.service(paints, aft_torus=False)
    # Command radio band around the transfer frame, Portree §1.8.3 and fig. 1-20.
    surface(
        service,
        "PAO_CommandRadioRing",
        paints["white"],
        [(971, 2312), (998, 2312), (1012, 2319), (1012, 2362), (997, 2370), (969, 2370)],
    )
    soyuz_7kok.descent(paints)
    orbital_module(paints)
    docking_unit(paints)
    rendezvous_antennas(paints)
    soyuz_7kok.infrared_vertical(paints)
    whip("Left", -1, paints)
    whip("Right", 1, paints)
    lksa_camera(paints)
    soyuz_cabin.build(
        COMMANDER,
        port=ENGINEER,
        hand_controls=True,
        seated_figure=sokol_k.build_seated,
        omitted_couch="Starboard",
        extra_equipment=lambda: suit_supply(paints),
    )
    launcher = soyuz_11a511.build(BOARDING_HATCH_AZIMUTH, BOARDING_HATCH_STATION, exposed_tower=True)
    return f"{launcher}; {PROBE_TIP * soyuz_7kok.MM:.3f} m aft end to probe tip"


if __name__ == "__main__":
    base = soyuz_11a511.BASE_Z * soyuz_11a511.MM
    mid = base + soyuz_11a511.LENGTH * soyuz_11a511.MM / 2
    run(
        "soyuz-12 vehicle",
        build,
        [
            ("stack.png", (0, 0, mid), 145, dict(azimuth=-60, elevation=6, res=(900, 1900))),
            ("upper.png", (0, 0, 7), 52, dict(azimuth=30, elevation=8, res=(1100, 1900))),
        ],
    )

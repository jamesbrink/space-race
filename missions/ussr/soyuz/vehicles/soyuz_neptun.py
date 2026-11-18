"""Early Neptun PSA-11F732 layout after Vasilyev fig. 4 and Tiapchenko figs. 5.15–5.16."""

import math
from pathlib import Path

import bpy

from soyuz_sirius import Panel
from srlib import MeshBuilder, material

MM = 0.001


def build(parent, pose):
    albedo = Path(__file__).resolve().parents[4] / "public" / "globe" / "colour.pz.jpg"
    earth = bpy.data.images.load(str(albedo), check_existing=True)
    earth.scale(128, 128)
    paints = {
        "body": material("neptun-grey-green-enamel", (0.205, 0.248, 0.197), 0.12, 0.72),
        "plate": material("neptun-edge-alloy", (0.42, 0.45, 0.37), 0.50, 0.51),
        "dark": material("neptun-dark-bakelite", (0.025, 0.031, 0.023), 0.04, 0.66),
        "rim": material("neptun-crt-ivory", (0.75, 0.77, 0.68), 0.12, 0.58),
        "amber": material("neptun-keycap-amber", (0.66, 0.42, 0.16), 0.08, 0.56),
        "key": material("neptun-keycap-brown", (0.27, 0.133, 0.040), 0.04, 0.63),
        "white": material("neptun-light-legends", (0.89, 0.91, 0.75), 0.0, 0.81),
        "red": material("neptun-guard-red", (0.39, 0.032, 0.018), 0.16, 0.58),
        "screen": material("neptun-crt-phosphor", (0.17, 0.22, 0.18), 0.16, 0.39),
        "earth": material("neptun-ink-globe", (0.69, 0.73, 0.70), 0.0, 0.60, image=earth),
    }
    meshes = {finish: MeshBuilder() for finish in paints}
    panel = Panel(pose, meshes)

    # Downward cutout leaves room for the Vzor eyepiece. The upper rim bridges the centre console.
    outline = [
        (-360, -152),
        (-118, -152),
        (-92, -122),
        (90, -122),
        (110, -150),
        (325, -150),
        (356, -132),
        (363, 145),
        (333, 174),
        (-334, 174),
        (-362, 147),
    ]
    n = len(outline)
    meshes["body"].add(
        [(x, y, z) for z in (-47, 31) for x, y in outline],
        [tuple(reversed(range(n))), tuple(range(n, 2 * n)), *((i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n))],
        matrix=pose,
    )

    # Masked Simvol CRT with a deep faceted pale bevel. Content varies with the onboard program.
    bevel = [(-66, 26), (-56, 15), (52, 15), (67, 28), (68, 99), (54, 114), (-58, 114), (-66, 104)]
    for key, depth, scale in (("rim", 37, 1.0), ("dark", 45, 0.86), ("screen", 49, 0.69)):
        meshes[key].add([(x * scale, 65 + (y - 65) * scale, depth) for x, y in bevel], [tuple(range(len(bevel)))], matrix=pose)
    panel.legend("white", "СИМВОЛ", 0, 120, 34, 6.4, center=True)

    panel.block("plate", 220, 73, 34, 179, 111, 4)
    obliquity = [math.tau * i / 48 for i in range(48)]
    panel.ring("dark", 194, 72, 39, [(43, 0), (43, 10), (39, 15), (35, 15), (35, 2)], 48)
    panel.ring("rim", 194, 72, 56, [(39, 0), (37, 3), (35, 3)], 48)
    meshes["earth"].grid(
        lambda a, r: (194 + r * math.cos(a), 72 + r * math.sin(a), 46.5 + math.sqrt(42**2 - r**2) * 0.50),
        obliquity,
        [34 * (1 - i / 8) for i in range(9)],
        closed_u=True,
        uv=lambda a, r: (0.5 + r / 74 * math.cos(a), 0.5 + r / 74 * math.sin(a)),
        matrix=pose,
    )
    panel.legend("white", "ИНК", 188, 129, 34, 6.5, center=True)
    for x, y in ((148, 32), (250, 36), (287, 44), (293, 93), (245, 97)):
        panel.knob(x, y, 41, 7.5)

    # Illuminated matrix command fields replaced the earlier rotary command-signal devices.
    for x, y, cols, rows in (
        (-279, -27, 7, 7),
        (-182, 99, 9, 3),
        (-295, 97, 5, 3),
        (102, 93, 4, 4),
        (105, 25, 4, 4),
        (109, -46, 4, 4),
        (259, -55, 10, 6),
    ):
        steps = 13.4
        panel.block("rim", x, y, 34.5, cols * steps + 5, rows * steps + 4, 3)
        for col in range(cols):
            for row in range(rows):
                xx = x + (col - (cols - 1) / 2) * steps
                yy = y + (row - (rows - 1) / 2) * steps
                panel.block("amber" if row == 0 or (col + row) % 9 == 0 else "key", xx, yy, 39.5, 10.5, 10, 3.2)
    for x, y, count in ((-162, 40, 7), (-24, -23, 9), (-193, -106, 4), (150, -44, 4), (260, -102, 10)):
        for i in range(count):
            panel.block("amber", x + 10.6 * i, y, 36, 8.3, 10, 5)
    for i in range(5):
        panel.block("amber", -185, -10 - i * 13, 39, 9, 8, 4)
        panel.knob(-154, -10 - i * 13, 34, 4.3)
    panel.block("dark", -291, 137, 35, 97, 23, 5)
    panel.block("rim", -291, 137, 40, 87, 17, 4)
    panel.legend("dark", "БЧК", -298, 134, 44, 6.5)
    for x in (-329, -237, -98, 73, 151, 328):
        for y in (-124, 151) if x > -280 else (-124,):
            panel.ring("plate", x, y, 34.5, [(3, 0), (3, 2.6), (0, 2.6)], 16)

    # Vzor eyepiece and the two red latches appear immediately beneath the board in the cabin photo.
    panel.ring("plate", 0, -228, 0, [(79, 0), (76, 11), (62, 18), (55, 28)], 60)
    panel.ring("dark", 0, -228, 26, [(57, 0), (60, 12), (58, 29), (45, 31), (39, 22)], 60)
    panel.ring("screen", 0, -228, 43, [(38, 0), (26, -4), (0, -5)], 48)
    for x in (-53, 53):
        panel.ring("red", x, -151, 18, [(11, 0), (13, 9), (10, 18), (0, 18)], 24)
        panel.block("red", x, -151, 40, 62, 15, 12)

    for finish, mesh in meshes.items():
        if mesh.verts:
            mesh.verts = [tuple(MM * value for value in vertex) for vertex in mesh.verts]
            mesh.build(f"Neptun_{finish}", paints[finish], parent, sharp_angle=35)

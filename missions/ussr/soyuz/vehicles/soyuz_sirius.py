"""Sirius-7K instrument board and command panels, after Tyapchenko figs. 1.0–1.2. See cabin.md."""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

import srlib
from srlib import MeshBuilder, material

MM = 0.001


class Panel:
    """Assemble solid panel hardware in a face's own millimetre frame."""

    def __init__(self, frame, meshes):
        self.frame = frame
        self.meshes = meshes

    def point(self, x, y, z):
        return self.frame @ Matrix.Translation((x, y, z))

    def block(self, mat, x, y, z, w, h, depth):
        self.meshes[mat].box((w, h, depth), self.point(x, y, z))

    def ring(self, mat, x, y, z, profile, n=32):
        self.meshes[mat].lathe(profile, n, matrix=self.point(x, y, z))

    def legend(self, mat, text, x, y, z, size, center=False):
        vertices, faces = srlib.text_mesh(text, size, srlib.load_font(), cuts=0)
        if center:
            mid = (min(v[0] for v in vertices) + max(v[0] for v in vertices)) / 2
            x -= mid
        self.meshes[mat].add(vertices, faces, None, self.point(x, y, z))

    def rim(self, mat, x, y, z, width, height, frame, depth):
        for side in (-1, 1):
            self.block(mat, x + side * (width - frame) / 2, y, z, frame, height, depth)
            self.block(mat, x, y + side * (height - frame) / 2, z, width - 2 * frame, frame, depth)

    def knob(self, x, y, z, radius):
        self.ring("dark", x, y, z, [(radius, 0), (radius, 5), (radius - 2, 9), (0, 9)], 20)
        self.block("white", x - 0.2, y + radius * 0.23, z + 11, 1.3, radius * 0.65, 0.6)

    def key(self, x, y, w, h, text="", color="ivory", z=41, size=4.3):
        self.block("dark", x, y, z, w + 3, h + 3, 4)
        self.block(color, x, y, z + 5.2, w, h, 5.6)
        if text:
            self.legend("ink" if color != "hazard" else "white", text, x, y - 1.6, z + 9.5, size, center=True)

    def rectangular_gauge(self, x, y, w, h, title, double=False):
        self.block("dark", x, y, 44, w + 6, h + 6, 12)
        self.block("ivory", x, y, 51.2, w, h, 4)
        self.legend("ink", title, x, y + h / 2 - 8, 55, 5.7, center=True)
        for row in [-11, 8] if double else [0]:
            self.block("ink", x, y + row + 2, 55, w - 15, 1.0, 0.4)
            for i in range(7):
                self.block("ink", x + (i - 3) * (w - 19) / 6, y + row + 5.8, 55, 0.8, 3.0, 0.4)
            self.block("hazard", x + row * 1.6 + w / 6, y + row - 4, 55, 1.4, 7, 0.5)


def globe(panel):
    """The visible cap of the INK's mechanical globe, with a fixed illustrative orientation."""
    x, y = -225, 59
    panel.block("plate", -195, 55, 41, 187, 111, 7)
    panel.ring("dark", x, y, 45, [(51, 0), (51, 8), (46, 13), (40, 13), (40, 1)], 48)
    panel.ring("rim", x, y, 59, [(48, 0), (46, 4), (42, 4)], 48)
    angles = [math.tau * i / 48 for i in range(48)]
    radii = [38.2 * (1 - i / 8) for i in range(9)]

    def cap(a, r):
        return (x + r * math.cos(a), y + r * math.sin(a), 47 + math.sqrt(46**2 - r**2) * 0.65)

    def uv(a, r):
        return (0.5 + r / 83 * math.cos(a), 0.5 + r / 83 * math.sin(a))

    panel.meshes["earth"].grid(cap, angles, radii, closed_u=True, uv=uv, matrix=panel.frame)
    # A fine cross fixed to the lens, above the moving ball.
    panel.block("white", x, y + 5, 80, 0.8, 29, 0.7)
    panel.block("white", x - 8, y + 5, 81.6, 21, 0.8, 0.7)
    panel.block("plate", -286, 58, 47, 8, 44, 3)
    for i in range(7):
        panel.block("white", -285, 38 + i * 6, 50.6, 4.2, 1, 0.6)
    panel.legend("white", "ИНК", -252, 103, 47.5, 6.5)
    panel.legend("white", "МП", -249, 4, 47.5, 6.5)
    for xx, yy in ((-252, 11), (-171, 15), (-164, 84), (-131, 31), (-134, 72), (-130, 95)):
        panel.knob(xx, yy, 47, 5.6)


def center_board(panel):
    # The lower-starboard scallop is the opening below the digital-information block.
    outline = [(-298, -113), (90, -113), (104, -92), (128, -72), (167, -53), (205, -51), (295, -51), (295, 128), (-298, 128)]
    n = len(outline)
    vertices = [(x, y, z) for z in (-38, 37) for x, y in outline]
    faces = [tuple(range(n - 1, -1, -1)), tuple(range(n, 2 * n)), *((i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n))]
    panel.meshes["body"].add(vertices, faces, None, panel.frame)
    globe(panel)

    panel.block("dark", -57, 59, 42, 91, 104, 6)
    panel.legend("white", "ТСЭ", -57, 116, 41, 6.2, center=True)
    warnings = ["ПУСК", "СПУСК", "СВЯЗЬ", "СТЫК", "ОТКАЗ", "РЕЗЕРВ", "ДАВЛ.", "СИСТ."]
    for row in range(8):
        for col in range(4):
            x, y = -88 + col * 21, 101 - row * 12
            panel.block("amber" if row < 2 else "ivory", x, y, 47.5, 17.5, 8.5, 3)
            if col == 0:
                panel.legend("ink", warnings[row], x, y - 1.3, 51, 3.4, center=True)

    # The 84 mm square active field is recessed inside the black VKU hood.
    panel.rim("dark", 43, 58, 49, 108, 111, 9, 20)
    panel.block("screen", 43, 58, 41.5, 84, 84, 7)
    p = panel.point(43, 58, 47.5)
    panel.meshes["screen"].grid(
        lambda x, y: (x, y, 4.2 * (1 - (x / 42) ** 2) * (1 - (y / 42) ** 2)),
        [-42, -28, -14, 0, 14, 28, 42],
        [-42, -28, -14, 0, 14, 28, 42],
        matrix=p,
    )
    panel.legend("white", "ВКУ", 43, 119, 42, 6.7, center=True)
    for x in (-10, 96):
        panel.knob(x, -6, 40, 7.4)

    panel.block("plate", 144, 59, 40, 78, 116, 6)
    panel.rim("rim", 144, 59, 45, 71, 106, 3, 3)
    panel.block("program", 144, 59, 46.5, 63, 98, 3)
    panel.legend("white", "ИКП", 144, 119, 42, 6.7, center=True)
    panel.legend("white", "СПУСК 1", 147, 98, 50, 5.4, center=True)
    for i, command in enumerate(("ПРОГР.", "ОРИЕНТ.", "КОНТР.", "ТДУ", "РАЗДЕЛ.")):
        y = 83 - i * 16
        panel.block("line", 119, y, 50, 9, 1.4, 0.7)
        panel.legend("line", command, 131, y - 1.5, 50, 4.3)

    panel.block("plate", 236, 57, 43, 90, 111, 10)
    panel.legend("white", "БЦИ", 236, 119, 43, 6.7, center=True)
    for y in (94, 65, 36):
        for x in (214, 258):
            panel.block("dark", x, y, 51, 23, 12, 3)
            panel.legend("ivory", "00", x, y - 2, 55, 5.8, center=True)
            panel.knob(x, y - 12, 49, 4.4)
    panel.key(255, -9, 16, 15, "ВВОД")

    panel.ring("dark", -254, -77, 39, [(29, 0), (29, 8), (25, 11), (0, 11)], 40)
    panel.ring("ivory", -254, -77, 52, [(23, 0), (23, 2.4), (0, 2.4)], 40)
    for i in range(9):
        a = math.radians(20 + 17.5 * i)
        panel.block("ink", -254 + 18 * math.cos(a), -77 + 18 * math.sin(a), 57, 1.3, 2.5, 0.5)
    panel.block("hazard", -254, -71, 58, 1.3, 13, 0.5)
    panel.legend("ink", "ИНТ", -254, -87, 57, 5.2, center=True)
    panel.rectangular_gauge(-181, -72, 62, 58, "ИДТ", double=True)
    panel.rectangular_gauge(-90, -74, 91, 49, "БЧК")
    panel.rectangular_gauge(51, -72, 66, 58, "ИРС", double=True)
    for i, name in enumerate(("ЛЕВ", "ОБА", "ПР", "ВЫКЛ")):
        panel.key(-15, -51 - i * 13, 20, 8.5, name)
    panel.rim("hazard", -15, -43, 54, 30, 15, 3.3, 7.0)
    panel.block("plate", 9, -132, 42, 139, 24, 10)
    for x in (-40, -10, 20, 50):
        panel.knob(x, -132, 49, 5.5)

    panel.block("plate", 242, 154, 27, 99, 48, 51)
    panel.ring("dark", 231, 155, 56, [(22, 0), (22, 8), (19, 10), (0, 10)], 36)
    for i in range(10):
        a = i * math.tau / 10
        panel.block("white", 231 + 15 * math.cos(a), 155 + 15 * math.sin(a), 68, 1.8, 2.8, 0.6)
    panel.block("white", 231, 159, 70, 1.6, 16, 0.6)
    panel.knob(273, 151, 57, 6.5)


def command_panel(panel, side):
    """One KSU, reflected as a housing, with a system column, drum window and 24 numbered keys."""
    panel.block("body", 0, 0, 0, 146, 212, 74)
    panel.rim("rim", 0, 0, 40, 140, 208, 3, 4)
    panel.legend("white", "КСУ ЛЕВ" if side < 0 else "КСУ ПР", 0, 88, 47, 7, center=True)
    systems = ("СОУД", "СКДУ", "СТР", "КВ", "СЭП", "ТЕЛЕВ", "СВЯЗЬ", "РЕЖИМ", "ДВИГ.", "КОНТР.", "АРУ", "ВОЗДУХ", "ОСВЕТ.", "ПРОГР.", "ОПРОС", "УСТ.")
    panel.block("dark", -32 * side, -3, 43, 21, 174, 6)
    for i, system in enumerate(systems):
        y = 76 - i * 10.3
        panel.key(-55 * side, y, 14, 6.6, system, "hazard" if i == 11 else "ivory", z=40, size=3.0)
        panel.block("amber" if i in (1, 5, 9) else "program", -32 * side, y, 48, 13, 6.6, 3)
    for row in range(12):
        for col in range(2):
            panel.key((1 + 17 * col) * side, 74 - row * 12, 12.5, 7.2, str(2 * row + col + 1), "hazard" if row == 11 else "ivory", z=40)
    for i in range(3):
        panel.knob((2 + 21 * i) * side, -85, 39, 5.8)


def build(parent, frame):
    albedo = Path(__file__).resolve().parents[4] / "public" / "globe" / "colour.pz.jpg"
    earth = bpy.data.images.load(str(albedo), check_existing=True)
    earth.scale(128, 128)
    finishes = {
        "body": material("sirius-grey-green-enamel", (0.185, 0.22, 0.162), 0.12, 0.78),
        "plate": material("sirius-instrument-enamel", (0.285, 0.315, 0.245), 0.12, 0.77),
        "rim": material("sirius-edge-alloy", (0.36, 0.39, 0.34), 0.46, 0.57),
        "dark": material("sirius-dark-bakelite", (0.029, 0.033, 0.026), 0.0, 0.65),
        "ivory": material("sirius-ivory-keycaps", (0.82, 0.79, 0.59), 0.0, 0.64),
        "white": material("sirius-light-legends", (0.89, 0.91, 0.75), 0.0, 0.81),
        "ink": material("sirius-dark-legends", (0.09, 0.10, 0.073), 0.0, 0.85),
        "amber": material("sirius-amber-signal", (0.68, 0.32, 0.062), 0.0, 0.54),
        "hazard": material("sirius-emergency-red", (0.45, 0.052, 0.021), 0.0, 0.56),
        "program": material("sirius-electroluminescent-plate", (0.11, 0.19, 0.125), 0.12, 0.49),
        "line": material("sirius-electroluminescent-mark", (0.34, 0.58, 0.25), 0.0, 0.72),
        "screen": material("sirius-crt-phosphor", (0.19, 0.22, 0.158), 0.14, 0.48),
        "earth": material("sirius-ink-globe", (0.67, 0.72, 0.68), 0.0, 0.58, image=earth),
    }

    def finish(assembly, meshes):
        for finish, mesh in meshes.items():
            if mesh.verts:
                mesh.verts = [tuple(MM * n for n in v) for v in mesh.verts]
                mesh.build(f"{assembly}_{finish}", finishes[finish], parent, sharp_angle=35)

    main = {key: MeshBuilder() for key in finishes}
    board = Panel(frame, main)
    center_board(board)
    for side in (-1, 1):
        board.meshes["rim"].tube(frame @ Vector((side * 265, 70, 0)), frame @ Vector((side * 353, 179, -245)), 16, 12)
        wing = {key: MeshBuilder() for key in finishes}
        pose = frame @ Matrix.Translation((side * 382, -24, 18)) @ Matrix.Rotation(math.radians(-side * 24), 4, "Y")
        command_panel(Panel(pose, wing), side)
        finish("Sirius_KSU_Left" if side < 0 else "Sirius_KSU_Right", wing)
    finish("Sirius_Main", main)

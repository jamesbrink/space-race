"""LC-34 at the apron, in feet. +X follows the service railway toward the tower, +Y is northwest."""

from math import cos, radians, sin, tau

import sitelib
from sitelib import P, box, handrail, slab
from srlib import FT, material

sitelib.use(FT)

BEARING_X = 42
GROUND = -0.12 / FT
APRON_RADIUS = 215
PEDESTAL_HALF = 21
PEDESTAL_TOP = 27
FLAME_RADIUS = 12.5
TOWER_TOP = 240
TOWER_HALF = 12
TOWER_X = 45
CREW_LEVEL = 220
SERVICE_PARK = -600
SERVICE_HALF = (35, 65)
SERVICE_TOP = 310
RAIL_Y = (-59, -53, 53, 59)
PRESS_KIT = "Apollo 7 Press Kit, pp. 41–44 and plates 42a–42b"


def materials():
    return {
        "concrete": material("concrete", (0.49, 0.45, 0.40), 0, 0.92),
        "brick": material("concrete-refractory", (0.40, 0.29, 0.22), 0, 0.9),
        "asphalt": material("road-asphalt", (0.13, 0.13, 0.12), 0, 0.96),
        "earth": material("earth-sand", (0.40, 0.36, 0.27), 0, 0.96),
        "van_blue": material("paint-van-blue", (0.045, 0.13, 0.22), 0.18, 0.61),
        "van_seat": material("upholstery-van", (0.19, 0.22, 0.18), 0, 0.87),
        "timber": material("timber-pole", (0.137, 0.105, 0.067), 0, 0.9),
        "rail": material("steel-rail", (0.31, 0.32, 0.33), 0.77, 0.54),
        "steel": material("steel-launcher", (0.22, 0.23, 0.24), 0.45, 0.68),
        "plate": material("steel-scorched-duct", (0.14, 0.105, 0.087), 0.6, 0.8),
        "ceramic": material("ceramic-flame-chute", (0.40, 0.33, 0.28), 0.04, 0.91),
        "red": material("tower-red", (0.52, 0.092, 0.028), 0.2, 0.58),
        "white": material("paint-room-white", (0.84, 0.83, 0.79), 0.17, 0.61),
        "tank": material("paint-tank-white", (0.81, 0.82, 0.79), 0.1, 0.54),
        "galv": material("galvanised-steel", (0.49, 0.51, 0.50), 0.58, 0.45),
        "deck": material("galvanised-deck", (0.29, 0.32, 0.32), 0.28, 0.71),
        "chrome": material("chrome", (0.74, 0.75, 0.76), 0.79, 0.3),
        "black": material("paint-launcher-black", (0.038, 0.038, 0.034), 0.13, 0.78),
        "blast": material("steel-blast-door", (0.28, 0.30, 0.26), 0.3, 0.69),
        "glass": material("glass", (0.56, 0.68, 0.70), 0, 0.09),
        "yellow": material("paint-line-yellow", (0.73, 0.49, 0.05), 0, 0.59),
        "sign": material("paint-sign-white", (0.83, 0.82, 0.78), 0, 0.56),
        "water": material("water-still", (0.07, 0.13, 0.15), 0.01, 0.15),
        "lamp": material("lamp", (0.88, 0.9, 0.83), 0, 0.48, emission=(1, 0.95, 0.8), emission_strength=0.4),
        "apron_lamp": material("lamp-flood-apron", (0.88, 0.93, 1), 0, 0.16),
        "van_red": material("paint-van-pinstripe", (0.39, 0.035, 0.015), 0.11, 0.65),
        "bulb": material("lamp-red", (0.57, 0.035, 0.02), 0, 0.41, emission=(1, 0.06, 0.02), emission_strength=0.6),
    }


def image_at(pixel):
    """Estimate site coordinates from points on a north-up Esri World Imagery crop (lc-34.md)."""
    east, north = (pixel[0] - 526) * 2.3, (502 - pixel[1]) * 2.3
    a = radians(BEARING_X)
    return east * sin(a) + north * cos(a), -east * cos(a) + north * sin(a)


def circle(radius, count=96, x=0, y=0):
    return [(x + radius * cos(tau * i / count), y + radius * sin(tau * i / count)) for i in range(count)]


def pipe(mb, a, b, radius, segs=12):
    mb.tube(P(*a), P(*b), radius * sitelib.UNIT, segs)


def deck(mb, xa, xb, ya, yb, z, thick=0.28):
    box(mb, (xa, ya, z - thick), (xb, yb, z))


def rails(mb, xa, xb, ya, yb, z, *, open_side=None):
    """Guard three or four sides, leaving the side a walker crosses clear."""
    corners = [(xa, ya, z), (xb, ya, z), (xb, yb, z), (xa, yb, z)]
    if open_side is None:
        handrail(mb, corners)
        handrail(mb, [corners[-1], corners[0]])
    else:
        path = [corners[(open_side + i) % 4] for i in range(1, 5)]
        handrail(mb, path)


def hardstand(mb, radius, x=0, y=0, height=0):
    slab(mb, circle(radius, x=x, y=y), GROUND - 0.45, height)


def footing(mb, x, y, size, top=0.18):
    box(mb, (x - size / 2, y - size / 2, GROUND - 1), (x + size / 2, y + size / 2, top))

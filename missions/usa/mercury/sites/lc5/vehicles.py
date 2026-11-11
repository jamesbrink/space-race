"""The cars and trucks parked at the blockhouse on a launch morning.

FHSU F16_016 (print 222, July 1961, taken from pad 6's gantry) is the only view found of the
blockhouse's parking in 1961. Enlarged, it shows about seventeen vehicles, and several can be
told: nose-in at the ready rooms' far wall a light 1957 Ford, a Volkswagen and a small dark sedan
with a light roof (taken for a Rambler American); along the drive a Chevrolet Corvair, a white
1955 or 1956 Ford Fairlane (the strip down its side dips in a V) and a mid-toned station wagon of
the mid-1950s; elsewhere on the drive two long, flat-finned sedans (taken for 1959 Chevrolets); by
the blockhouse a white Ford-like pickup with separate rear wings, a closed utility body on its
bed and a round dark emblem on its door; and at the hut by the road a light carryall with windows
all round (taken for a Chevrolet Suburban: it has a bonnet, so it is not a forward-control van)
between two sedans, one dark and one white.

Those are the kinds built here, in that photograph's places. **Every identification is an
estimate made from a few dozen pixels**, every colour is a guess (the photograph is black and
white), and no photograph of this parking on 5 May 1961 has been found: these are July's cars.
The emblem on the pickup's door cannot be read and is a plain dark disc; nothing carries a badge,
a number plate or lettering. A small rounded import, a dark canvas-topped truck and a fourth car
at the ready rooms are in the photograph and not built.

The vehicles themselves are tools/blender/vehicles.py's (inches, each its own node with its wheels
on their axles): this module only says which stood where. A walker is 0.26 m in radius: the gaps
left between parked cars are 0.8 m and more, the noses stand 0.85 m off the ready rooms' wall, and
the space in front of its door is left empty.
"""

from __future__ import annotations

import math

import vehicles as cars
from srlib import FT, IN

from .blockhouse import APRON, S
from .site import GROUND, Parts


def park(parent, name: str, car: cars.Car, at, z: float, heading: float, *, by_nose: bool = False) -> dict:
    """Stand a vehicle with its middle (or, `by_nose`, the front of its body) at `at` (site
    feet), on ground at height z, facing `heading` degrees anticlockwise from the site's +X."""
    a = math.radians(heading)
    d = -(car.x1 if by_nose else (car.x0 + car.x1) / 2) * IN  # from there back to its rear axle, where the node's origin is
    return car.build(name, parent, (at[0] * FT + d * math.cos(a), at[1] * FT + d * math.sin(a), z * FT), heading)


def build(parts: Parts) -> None:
    lot = parts.node("Vehicles")
    on_shell, on_ground = APRON, GROUND
    fleet = [
        # nose-in along the ready rooms' far wall, on the shell; the space in front of the door (70.8 to 74 ft) is left clear
        (cars.ford_1957("seafoam", "white"), S(58.0, -62.2), on_shell, 92.0, True),
        (cars.volkswagen("cream"), S(66.5, -62.2), on_shell, 87.0, True),
        (cars.rambler_american("black", "white"), S(80.5, -62.2), on_shell, 91.0, True),
        (cars.chevrolet_1959("navy"), S(90.0, -62.2), on_shell, 88.0, True),
        # along the drive behind the blockhouse
        (cars.corvair_1960("white", upholstery="seat-red"), S(114.0, -30.0), on_shell, 268.0, False),
        (cars.ford_1956("white", "blue", upholstery="seat-tan"), S(114.0, -9.5), on_shell, 271.0, False),
        (cars.ford_1957("tan", None, wagon=True, whitewall=0.0, upholstery="seat-tan"), S(114.0, 11.0), on_shell, 266.0, False),
        # the pickup with the utility body, on the shell in front of the breezeway
        (cars.ford_f100("white", utility="white", insignia=True), S(46.0, -38.0), on_shell, 172.0, False),
        # at the hut by the road
        (cars.suburban_1960("white", upholstery="seat-green"), (286.0, -148.0), on_ground, 185.0, False),
        (cars.ford_1956("green", None, whitewall=0.0, cap_r=5.0, spear=()), (300.0, -146.5), on_ground, 92.0, False),
        (cars.chevrolet_1959("white", upholstery="seat-red"), (309.5, -146.0), on_ground, 88.0, False),
    ]
    total = 0
    for k, (car, at, z, heading, by_nose) in enumerate(fleet, 1):
        built = park(lot, f"Car_{k:02d}", car, at, z, heading, by_nose=by_nose)
        total += built["triangles"]
        print(f"  Car_{k:02d}: {car.what}, {built['triangles']:,} triangles")
    print(f"  vehicles: {total:,} triangles")


def check_standing(ground: float = GROUND, slack: float = 0.02) -> list[str]:
    """Call once the whole site is built (after `parts.build()`): what each tyre stands on. A ray
    is dropped from every wheel's hub to whatever of the site lies under it, or failing that to the
    viewer's terrain at `ground` (site feet); a line comes back, and is printed, for each tyre
    whose foot is more than `slack` metres above or below that. Nothing is moved."""
    import bpy
    from mathutils import Vector
    from mathutils.bvhtree import BVHTree

    bpy.context.view_layer.update()
    verts, faces = [], []
    for obj in bpy.data.objects:
        if obj.type == "MESH" and not obj.name.startswith("Car_"):
            base = len(verts)
            verts += [obj.matrix_world @ v.co for v in obj.data.vertices]
            faces += [[base + i for i in p.vertices] for p in obj.data.polygons]
    tree = BVHTree.FromPolygons(verts, faces)
    out = []
    for obj in bpy.data.objects:
        if obj.type == "EMPTY" and obj.name.startswith("Car_") and "Wheel_" in obj.name:
            car = obj.parent if "vehicle" in obj.parent else obj.parent.parent
            hub = obj.matrix_world.translation
            foot = hub.z - car["wheel_radius"]
            hit = tree.ray_cast(Vector((hub.x, hub.y, foot + 0.5)), Vector((0, 0, -1)), 4.0)
            under = max(hit[0].z if hit[0] is not None else -1e9, ground * FT)
            if abs(foot - under) > slack:
                what = "the site" if hit[0] is not None and hit[0].z > ground * FT else "the terrain"
                out.append(f"{obj.name}: {foot - under:+.3f} m from {what} under it")
    for line in out:
        print(f"  STANDING {line}")
    return out

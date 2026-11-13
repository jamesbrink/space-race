"""Capsule No. 18's cabin (Aurora 7, MA-7): capsule No. 11's fit, and what the record changes in it.

No figure of No. 18's panel has been read. The report of the flight lists what No. 18 had that No. 13 had
not, and what it flew without (NASA TN D-3814, pp. 5 and 6, and Table IV, pp. 31 and 32), so the fit is
built by mercury_cabin_11.py, as No. 13's is, with these left out, each on the report's word: the Earth-path
indicator, the cabin's relative-humidity indicator and the coolant-quantity indicator (a blank plate stands in
each one's place: what covered them is estimated), and the couch's knee and chest straps. What it was given is
here: the zero-gravity experiment, a glass sphere of green liquid in the place the instrument-panel camera had
left, by the pilot's head. What the report lists and no figure places is in the flight's spacecraft.md
("Cabin"), not modelled: the "maneuver" switch, the dual steam-vent temperature indicator.

Dimensions are inches.
"""

from __future__ import annotations

import math

import bpy
from mathutils import Matrix, Vector

import mercury_cabin_11
import mercury_cabin_13
from mercury_capsule import chamfered
from srlib import IN, MeshBuilder, Surf, frame, interior, material, prof

WINDOW_OPENING = mercury_cabin_11.WINDOW_OPENING

# The zero-gravity experiment (NASA TN D-3814, p. 73 and Figure 30): "a glass sphere approximately 3 3/8 inches in
# diameter containing a capillary tube, 2 inches in length and 1 1/4 inches in diameter", a fifth full of a green
# liquid, "encased in an aluminum and a plexiglass half section". Documented. The plate it is mounted on is scaled off
# the figure's two photographs against the sphere, and where it stood off the same figure's sketch of what the pilot
# camera saw: at the right of his helmet. Both estimated.
SPHERE_R = 3.375 / 2
STANDPIPE = (0.625, 2.0)  # the capillary tube's radius and length
LIQUID = 0.2  # of the sphere's volume: 60 ml
PLATE = (4.7, 0.4)  # the mounting plate: square, and its thickness
BESIDE_HELMET = (2.2, -0.5, 1.2)  # the plate's middle from the helmet: clear of its side, toward his head's top, toward the nose

# What a visitor points at in this cabin says: No. 11's meshes (and No. 13's seventieth bolt), with this flight's words.
THINGS = {
    "CrewCabin_Mirror": (
        "Chest mirror",
        "A convex mirror on the chest of the suit, so that the camera watching the pilot's face also photographed his instruments "
        "in it. On the way up Carpenter tried to watch the Atlas pitch over in it, and could see only the attitude indicator. "
        "The life vest was packed under it. It is laid on Shepard's figure: its size and how it was held are estimated.",
    ),
    "CrewCabin_PanelBlanks": (
        "Blanked instruments",
        "Three instruments Friendship 7 carried and this capsule did not: the Earth-path indicator, a clockwork globe judged too "
        "heavy for what it told a man with a window, and the cabin humidity and coolant quantity gauges, which had read poorly. "
        "That they were taken out is the report's; the plain plates over their places are ours.",
    ),
    "Hatch_Bolts": (
        "Hatch bolts",
        "Seventy quarter-inch titanium bolts held the hatch to its sill, each drilled to make a weak point; a mild detonating fuse in a "
        "channel round the hatch broke all of them at once. Bolting it on took twenty minutes of the count, and this time every bolt "
        "lined up. They were never broken: Carpenter left through the nose, and the hatch was unbolted on the destroyer's deck.",
    ),
    "Hatch_BoltSeventieth": (
        "Hatch bolts",
        "Seventy quarter-inch titanium bolts held the hatch to its sill, each drilled to make a weak point; a mild detonating fuse in a "
        "channel round the hatch broke all of them at once. Bolting it on took twenty minutes of the count, and this time every bolt "
        "lined up. They were never broken: Carpenter left through the nose, and the hatch was unbolted on the destroyer's deck.",
    ),
    "Hatch_Knife": (
        "Survival knife",
        "The knife rode on the hatch, as in Liberty Bell 7. Where on the door it rode is not in anything read.",
    ),
}
PLUNGER = (
    "Hatch plunger",
    "What would have blown the hatch from inside: with its cover off and the safety pin out, a blow of five or six pounds on this knob "
    "fired the fuse. It was not used. The capsule came down 250 miles from the nearest ship, floating low and leaning, and Carpenter "
    "would not open a door at the waterline: he climbed out through the nose instead. It is shown with the cover off and the pin in.",
)
ZERO_G = (
    "Zero-gravity experiment",
    "A glass ball three and three-eighths inches across, a fifth full of green water, with an open tube standing in it. Nobody knew "
    "where a liquid goes in a tank when nothing holds it down; a rocket that must restart in orbit has to know. Without weight the "
    "liquid should climb into the tube and stay there, and it did, fourteen seconds after the capsule left the Atlas, and again after "
    "the retrorockets had thrown it out. The camera on the panel filmed it beside the pilot's head. On the pad the liquid lies in "
    "the half of the ball behind the plate. The ball, its tube and its liquid are the report's; the plate and its place are "
    "scaled off one figure.",
)


def build(parent, vessel: Surf, M: dict, font, pilot: dict, hip, hatch, ceiling: float, suit, window: dict, scope_z: float) -> dict:
    """Everything inside capsule 18's pressure vessel but the pilot: capsule 11's fit (mercury_cabin_11.build, with the
    same arguments) less what this capsule flew without, then this capsule's own equipment and its words. Its pilot is
    seated in Shepard's suit, which has no mirror, so the cabin lays one on his chest (mercury_cabin_11.chest_mirror)."""
    out = mercury_cabin_11.build(
        parent,
        vessel,
        M,
        font,
        pilot,
        hip,
        hatch,
        ceiling,
        suit,
        window,
        scope_z,
        mirror=True,
        earth_path_indicator=False,
        without=("Humidity", "Coolant"),
        knee_and_chest_straps=False,
    )
    mercury_cabin_11.name_things(parent)
    if interior():
        zero_gravity(parent, M)
    name_things(parent)
    return out


def zero_gravity(parent, M: dict) -> None:
    """The zero-gravity experiment beside the pilot's helmet, facing the camera on the panel: a plate, the aluminium
    half behind it, the plexiglass half in front, and in that the glass sphere with its standpipe and its liquid as it
    lay on the pad, pooled toward the heat shield."""
    bpy.context.view_layer.update()
    corners = [
        o.matrix_world @ v.co for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("CrewCabin_Pilot_Helmet") for v in o.data.vertices
    ]
    if not corners:
        return
    lo = Vector([min(c[i] for c in corners) for i in range(3)]) / IN
    hi = Vector([max(c[i] for c in corners) for i in range(3)]) / IN
    dx, dy, dz = BESIDE_HELMET
    at = Vector((hi.x + PLATE[0] / 2 + dx, (lo.y + hi.y) / 2 + dy, (lo.z + hi.z) / 2 + dz))
    # (toward the panel's camera: up the capsule, a little toward his feet and toward him)
    F = frame(at * IN, Vector((-0.28, 0.42, 1.0)).normalized())
    side, thick = PLATE
    plate, metal, clear, glass, pipe, liquid = (MeshBuilder() for _ in range(6))
    chamfered(plate, (side, side, thick), F, 0.1)
    for sx in (-1, 1):  # its four screws
        for sy in (-1, 1):
            plate.lathe(
                prof([(0.2, 0.0), (0.2, 0.09), (0.0, 0.1)]),
                10,
                matrix=F @ Matrix.Translation((sx * (side / 2 - 0.42) * IN, sy * (side / 2 - 0.42) * IN, thick / 2 * IN)),
            )

    def arc(r: float, a0: float, a1: float, n: int = 12) -> list[tuple[float, float]]:
        """An arc of a profile about the apparatus's middle: (radius, height) from a0 to a1 degrees up from its plane."""
        at_ = [math.radians(a0 + (a1 - a0) * i / n) for i in range(n + 1)]
        return [(r * math.cos(a), r * math.sin(a)) for a in at_]

    # the aluminium half behind the plate, and a retaining ring round the plexiglass half in front
    metal.lathe(prof([(r, -z - thick / 2) for r, z in arc(SPHERE_R + 0.22, 0, 90)][::-1]), 32, matrix=F)
    metal.lathe(prof([(SPHERE_R + 0.5, thick / 2), (SPHERE_R + 0.5, thick / 2 + 0.12), (SPHERE_R + 0.24, thick / 2 + 0.12)]), 32, matrix=F)
    clear.lathe(prof([(r, z + thick / 2) for r, z in arc(SPHERE_R + 0.2, 0, 90)]), 32, matrix=F)
    # the glass sphere inside them, its middle in the plate's plane
    glass.lathe(prof(arc(SPHERE_R, -90, 90, 20)), 32, matrix=F)
    # the standpipe: from the sphere's wall at the back to just past its middle (the figure's side view)
    pr, pl = STANDPIPE
    pipe.lathe(prof([(pr, -SPHERE_R + 0.12), (pr, -SPHERE_R + 0.12 + pl), (pr - 0.06, -SPHERE_R + 0.12 + pl)]), 20, matrix=F)
    # The liquid, a fifth of the sphere, on the pad: a cap of the ball on its lowest side, toward the heat shield. A
    # cap h deep of a ball of radius R holds (pi h^2 (3R - h) / 3): a fifth of the whole at h = 0.574 R.
    R = SPHERE_R - 0.06  # (the liquid's own skin, clear of the glass's)
    h = 0.574 * R
    cap = arc(R, -90, -90 + math.degrees(math.acos(1 - h / R)), 10)
    liquid.lathe(prof([*cap, (0.0, cap[-1][1])]), 28, matrix=Matrix.Translation(at * IN))  # (in the capsule's own frame: aft is down)
    green = material("experiment-liquid-green", (0.03, 0.42, 0.16), 0.0, 0.25)
    for mb, name, mat in (
        (plate, "ZeroG_Plate", M["bezel"]),
        (metal, "ZeroG_Case", M["lever"]),
        (clear, "ZeroG_Dome", M["crystal"]),
        (glass, "ZeroG_Sphere", M["crystal"]),
        (pipe, "ZeroG_Standpipe", M["crystal"]),
        (liquid, "ZeroG_Liquid", green),
    ):
        obj = mb.build(name, mat, parent, sharp_angle=35)
        obj["label"], obj["about"] = ZERO_G
    # (a strut from behind it toward the wall: what held it is not in anything read)
    foot = MeshBuilder()
    back = F @ Vector((0.0, 0.0, -(SPHERE_R + 0.15) * IN))
    foot.tube(back, back + (Vector((at.x, at.y, 0.0)).normalized() * 3.2 - Vector((0.0, 0.0, 2.2))) * IN, 0.45 * IN, 10)
    obj = foot.build("ZeroG_Bracket", M["lever"], parent, sharp_angle=35)
    obj["label"], obj["about"] = ZERO_G


def hatch_inside(parent, vessel: Surf, M: dict, hatch) -> None:
    """The explosive hatch's inner face as No. 13's, with all seventy bolts in (mercury_cabin_13.hatch_inside), and
    this flight's words on it."""
    mercury_cabin_13.hatch_inside(parent, vessel, M, hatch)
    if not interior():
        return
    for name in ("Hatch_Initiator", "Hatch_Plunger", "Hatch_SafetyPin"):
        bpy.data.objects[name]["label"], bpy.data.objects[name]["about"] = PLUNGER
    name_things(parent)


def name_things(parent) -> None:
    for name, (label, about) in THINGS.items():
        obj = bpy.data.objects.get(name)
        if obj is not None and obj.parent == parent:
            obj["label"], obj["about"] = label, about

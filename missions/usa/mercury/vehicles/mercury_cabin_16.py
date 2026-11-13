"""Capsule No. 16's cabin (Sigma 7, MA-8): capsule No. 11's fit, and what the record changes in it.

No figure of No. 16's panel has been read. The report of the flight says No. 16 "was basically the same as
spacecraft 18" and lists what was changed from it (NASA TN D-4807, pp. 7 to 12, and Table IV, pp. 38 to 40),
so the fit is built by mercury_cabin_11.py with what No. 18 flew without left out again (the Earth-path
indicator, the cabin's relative-humidity and coolant-quantity indicators, the couch's knee and chest straps:
the list restores none of them), and without No. 18's zero-gravity experiment, which was that flight's. The
pilot wears no chest mirror: the photograph of him going aboard shows none (NASA S62-06002). What it was
given is here: the hand-held camera, a Hasselblad 500C, in the kit at the pilot's right. What the report
lists and no figure places is in the flight's spacecraft.md ("Cabin"), not modelled.

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

# The hand-held camera: "a Hasselblad camera, model 500-C, with a film aperture of 2-1/4 by 2-1/4 inches and an
# f/2.8, 80-mm, six-element lens" and a detachable magazine for 45 exposures (NASA TN D-4807, p. 73 and Figures 28 and
# 29). Documented: what it was. Its measures are not in the report: the body, the lens and the magazine are drawn to
# the type's general proportions, estimated, without the folding finder its Figure 28 shows it without.
CAMERA_BODY = (3.9, 3.7, 3.3)  # across, up, and front to back
CAMERA_LENS = (1.35, 2.2)  # the lens's radius and how far it stands out of the body
CAMERA_MAGAZINE = (3.6, 3.6, 1.9)
# It "was located in the special equipment-storage kit at the right-hand side of the pilot (pilot reference, ditty bag)"
# (the same report, p. 88); capsule 18's, which this one was built from, was "the equipment container located to the
# pilot's right, below the hatch" (NASA TN D-3814, p. 89). Documented: that side; derived: below the hatch. The kit is
# drawn as a pouch a little larger than the camera; how far below the hatch's sill it hung, how far in from the wall
# and where along the sill are estimated: under the end of the sill nearest the pilot's right hand, between the chest
# parachute's pack by his right shoulder and the suit's two hoses up the right wall, as mercury_cabin.py has them.
KIT = (5.0, 4.8, 4.6)
KIT_BELOW = 4.6  # the kit's middle below the hatch's sill, the station's inches
KIT_IN = 4.4  # and in from the pressure vessel's wall
KIT_ROUND = math.radians(9.5)  # and round the cabin, in from the hatch's edge on the pilot's right

# What a visitor points at in this cabin says: No. 11's meshes (and No. 13's seventieth bolt), with this flight's words.
BOLTS = (
    "Hatch bolts",
    "Seventy quarter-inch titanium bolts held the hatch to its sill, each drilled to make a weak point; a mild detonating fuse in a "
    "channel round the hatch broke all of them at once. Bolting it on took twelve minutes of the count, from T-108 to T-96, and "
    "every bolt sank into its thread. They were broken forty-five minutes after the landing, on the carrier's deck.",
)
THINGS = {
    "CrewCabin_PanelBlanks": (
        "Blanked instruments",
        "Three instruments Friendship 7 carried and Aurora 7 did not: the Earth-path indicator and the cabin humidity and coolant "
        "quantity gauges. The report of this flight lists what was changed from Aurora 7's capsule and restores none of them, so "
        "they are left out here too; a gauge for the oxygen in the cabin's air and one for a dozen temperatures were added, and "
        "are in no figure read. The plain plates are ours.",
    ),
    "Hatch_Bolts": BOLTS,
    "Hatch_BoltSeventieth": BOLTS,
    "Hatch_Knife": (
        "Survival knife",
        "The knife rode on the hatch, as in Liberty Bell 7. Where on the door it rode is not in anything read.",
    ),
}
PLUNGER = (
    "Hatch plunger",
    "What blew the hatch from inside: with its cover off and the safety pin out, a blow of five or six pounds on this knob fired the fuse. "
    "Schirra stayed in the capsule until it stood on the deck of USS Kearsarge, forty minutes after landing, and five minutes later "
    "hit the plunger. It kicked back and bruised and cut his hand through the glove, an injury the report calls almost identical to "
    "Glenn's. It is shown with the cover off and the pin in.",
)
CAMERA = (
    "Hand-held camera",
    "A Hasselblad 500C with an 80 mm lens and a magazine for forty-five frames of 70 mm film: the first of that make to be flown, "
    "where Glenn and Carpenter had carried 35 mm cameras. It rode in a kit at the pilot's right, which he found hard to reach "
    "into and too well stuck down with Velcro. Schirra spent little fuel pointing the capsule for it: fifteen frames for the "
    "Weather Bureau through a strip of six coloured filters, to choose a filter for a weather satellite's cameras, and fourteen "
    "in colour of the western United States, Mexico and South America, several of them overexposed. "
    "That it was a 500C and rode at his right is the report's; its measures are the type's, and where the kit hung is estimated.",
)


def build(parent, vessel: Surf, M: dict, font, pilot: dict, hip, hatch, ceiling: float, suit, window: dict, scope_z: float) -> dict:
    """Everything inside capsule 16's pressure vessel but the pilot: capsule 11's fit (mercury_cabin_11.build, with the
    same arguments) less what capsule 18 flew without, then this capsule's own equipment and its words."""
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
        earth_path_indicator=False,
        without=("Humidity", "Coolant"),
        knee_and_chest_straps=False,
    )
    mercury_cabin_11.name_things(parent)
    if interior():
        camera_kit(parent, M, vessel, hatch)
    name_things(parent)
    return out


def camera_kit(parent, M: dict, vessel: Surf, hatch) -> None:
    """The equipment kit at the pilot's right, below the hatch, with the hand-held camera standing in it, lens toward
    the capsule's nose: a pouch, the camera's body with its winding knob, its lens, and the magazine on its back, down
    in the pouch."""
    t = hatch[1] - KIT_ROUND
    z = hatch[2] - KIT_BELOW
    out = Vector((math.cos(t), math.sin(t), 0.0))
    at = out * (vessel.r(z) - KIT_IN) + Vector((0.0, 0.0, z))
    # (the camera's own frame: z out along its lens, toward the nose and a little in from the wall)
    F = frame(at * IN, (Vector((0.0, 0.0, 1.0)) - out * 0.22).normalized())
    to = lambda x, y, z: F @ Matrix.Translation(Vector((x, y, z)) * IN)  # noqa: E731
    pt = lambda x, y, z: F @ (Vector((x, y, z)) * IN)  # noqa: E731
    pouch, body, glass = MeshBuilder(), MeshBuilder(), MeshBuilder()
    kx, ky, kz = KIT
    chamfered(pouch, KIT, to(0.0, 0.0, -kz / 2 + 0.9), 0.45)
    # (a strap from the pouch to the wall: what held it is not in anything read)
    pouch.tube((at - Vector((0.0, 0.0, 1.4))) * IN, (at + out * (KIT_IN + 0.5) - Vector((0.0, 0.0, 1.4))) * IN, 0.4 * IN, 10)
    bx, by, bz = CAMERA_BODY
    mx, my, mz = CAMERA_MAGAZINE
    lr, ll = CAMERA_LENS
    front = 2.6  # the body's front face, up its lens's line from the pouch's mouth
    chamfered(body, CAMERA_BODY, to(0.0, 0.0, front - bz / 2), 0.14)
    chamfered(body, CAMERA_MAGAZINE, to(0.0, 0.0, front - bz - mz / 2 + 0.2), 0.14)
    # the lens: its mount, the barrel with its two rings standing proud, and the hood's lip round the front element
    body.lathe(
        prof(
            [
                (lr + 0.25, front - 0.2),
                (lr + 0.25, front + 0.25),
                (lr, front + 0.3),
                (lr, front + 0.8),
                (lr + 0.12, front + 0.85),
                (lr + 0.12, front + 1.35),
                (lr, front + 1.4),
                (lr, front + ll - 0.35),
                (lr + 0.1, front + ll - 0.3),
                (lr + 0.1, front + ll),
                (lr - 0.2, front + ll),
                (lr - 0.2, front + ll - 0.4),
            ]
        ),
        28,
        matrix=F,
    )
    glass.lathe(prof([(lr - 0.2, front + ll - 0.4), (0.0, front + ll - 0.28)]), 28, matrix=F)
    # the winding knob on its side, and the release on its front
    body.tube(pt(bx / 2 - 0.2, 0.3, front - 1.3), pt(bx / 2 + 0.8, 0.3, front - 1.3), 0.6 * IN, 16)
    body.tube(pt(bx / 2 + 0.7, 0.3, front - 1.3), pt(bx / 2 + 1.05, 0.3, front - 1.3), 0.3 * IN, 12)
    body.tube(pt(bx / 2 - 0.55, -by / 2 + 0.5, front - 0.2), pt(bx / 2 - 0.55, -by / 2 + 0.5, front + 0.3), 0.18 * IN, 10)
    for mb, name, mat in (
        (pouch, "Camera_Kit", material("kit-canvas", (0.50, 0.44, 0.33), 0.0, 0.92)),
        (body, "Camera_Body", M["bezel"]),
        (glass, "Camera_Lens", M["lens"]),
    ):
        obj = mb.build(name, mat, parent, sharp_angle=35)
        obj["label"], obj["about"] = CAMERA


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

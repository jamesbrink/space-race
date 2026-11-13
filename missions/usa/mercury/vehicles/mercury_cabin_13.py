"""Capsule No. 13's cabin (Friendship 7, MA-6): capsule No. 11's fit, and what the record changes in it.

The report of the flight prints the instrument panels as its Figure 2-4 (Results of the First United
States Manned Orbital Space Flight, p. 8), and that figure is the drawing the MR-4 report printed as
No. 11's: the same panel, consoles and legends, here with its groups named. So the fit is built by
mercury_cabin_11.py, whole, and this module only says what was otherwise on 20 February 1962: the
hatch went on with all seventy bolts, the Earth-path indicator was working, and the things a visitor
points at tell this flight's story and not Grissom's. What photographs of the capsule as it is kept
show that the figure does not is listed in the flight's spacecraft.md ("Cabin"), not modelled.

Dimensions are inches.
"""

from __future__ import annotations

import math

import bpy

import mercury_cabin_11
from srlib import IN, MeshBuilder, Surf, interior

WINDOW_OPENING = mercury_cabin_11.WINDOW_OPENING

# What a visitor points at in this cabin says (the viewer reads `label` and `about` off the mesh under the pointer):
# No. 11's meshes, with this flight's words.
THINGS = {
    "EarthPath_Glass": (
        "Earth-path indicator",
        "A small globe turned by clockwork under a window, set to the orbit's inclination and period, to show a pilot in orbit what lay "
        "under him. This was the flight it was made for. It was heavy for what it told a man who could look out of the window, and was "
        "left out of the next capsule to save weight. The globe is drawn as a bare graticule.",
    ),
    "CrewCabin_Mirror": (
        "Chest mirror",
        "A convex mirror strapped to the chest of the suit, so that the camera watching the pilot's face also photographed his "
        "instruments in it. Photographs of Glenn going aboard show it on him.",
    ),
    "Hatch_Bolts": (
        "Hatch bolts",
        "Seventy quarter-inch titanium bolts held the hatch to its sill, each drilled to make a weak point; a mild detonating fuse in a "
        "channel round the hatch broke all of them at once. On the morning one was found broken with most of them in, and the hatch "
        "was taken off and bolted on again, which cost forty minutes: Grissom had flown with sixty-nine, and nobody would this time.",
    ),
    "Hatch_Knife": (
        "Survival knife",
        "The knife rode on the hatch, as in Liberty Bell 7. Where on the door it rode is not in anything read.",
    ),
}
PLUNGER = (
    "Hatch plunger",
    "What blew the hatch from inside: with its cover off and the safety pin out, a blow of five or six pounds on this knob fired the fuse. "
    "Glenn stayed in the capsule until it was on the destroyer's deck, then warned the crew and hit the plunger with the back of his hand; "
    "it kicked back and cut his knuckles through the glove, his only injury of the flight. It is shown with the cover off and the pin in.",
)


def build(parent, vessel: Surf, M: dict, font, pilot: dict, hip, hatch, ceiling: float, suit, window: dict, scope_z: float) -> dict:
    """Everything inside capsule 13's pressure vessel but the pilot: capsule 11's fit (mercury_cabin_11.build, with the
    same arguments), then this capsule's words on it. Its pilot is seated in Shepard's suit, which has no mirror, so the
    cabin lays one on his chest (mercury_cabin_11.chest_mirror)."""
    out = mercury_cabin_11.build(parent, vessel, M, font, pilot, hip, hatch, ceiling, suit, window, scope_z, mirror=True)
    mercury_cabin_11.name_things(parent)
    name_things(parent)
    return out


def hatch_inside(parent, vessel: Surf, M: dict, hatch) -> None:
    """The explosive hatch's inner face as No. 11's, with the seventieth bolt in: No. 11's is built with the first of
    its seventy places empty (mercury_cabin_11.hatch_inside), and this fills that place."""
    mercury_cabin_11.hatch_inside(parent, vessel, M, hatch)
    if not interior():
        return
    t0, _t1, hz0, _hz1 = hatch
    inner = Surf(vessel.r0 - 0.12, vessel.z0, vessel.a)
    inset = 0.55  # as No. 11's row: the first place is at the corner of the row along the hatch's foot
    z = hz0 + inset * math.cos(vessel.a)
    t = t0 + inset / inner.r(z)
    bolt = MeshBuilder()
    bolt.disc(inner.p(t, z), -inner.n(t), 0.19 * IN, 0.12 * IN)
    obj = bolt.build("Hatch_BoltSeventieth", M["lever"], parent)
    obj["label"], obj["about"] = THINGS["Hatch_Bolts"]
    for name in ("Hatch_Initiator", "Hatch_Plunger", "Hatch_SafetyPin"):
        bpy.data.objects[name]["label"], bpy.data.objects[name]["about"] = PLUNGER
    name_things(parent)


def name_things(parent) -> None:
    for name, (label, about) in THINGS.items():
        obj = bpy.data.objects.get(name)
        if obj is not None and obj.parent == parent:
            obj["label"], obj["about"] = label, about

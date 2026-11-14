"""The Voskhod launch vehicle, 11A57: the R-7's core and four strap-on boosters as the Vostok's 8K72K had
them, a lattice, the larger third stage Block I with its four-chamber RD-0108, and a longer fairing.

Shared by the two crewed Voskhods; a flight's model/vehicle.py builds its spacecraft and calls build().
Every dimension is in millimetres. Stations are heights above the plane of the main nozzles' exits;
`base_z` puts that plane in the flight's own frame, and by default the spacecraft's frame rests on Block
I's adapter. See ../voskhod-11a57.md for what each number rests on.

What is the Vostok launcher's is imported from it and not built again
(../../../vostok/vehicles/vostok_8k72k/): the core (`core.build`), the four boosters (`booster.build`),
their engines, the lattice's builder and the fairing's, each given this vehicle's stations. What is
this vehicle's own is in upper.py: Block I and its engine, the aft section it sheds, the adapter, the
fairing's lengths, and for Voskhod 2 the blister over the folded airlock.

Top-level nodes:
    Fairing (Fairing_Left, Fairing_Right)  BlockI  AftSection (AftSection_1 to _3)  Interstage
    CoreStage  CoreEngine  Booster_B  Booster_V  Booster_G  Booster_D
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "vostok", "vehicles"))
from srlib import mark_shells  # noqa: E402
from vostok_8k72k import booster, core  # noqa: E402
from vostok_8k72k.common import BOOSTER_AZ, MM, SPAN, materials, reuse  # noqa: E402

from . import upper  # noqa: E402
from .upper import BASE_Z, LENGTH  # noqa: E402

SHELLS = (*core.SHELLS, *upper.SHELLS, *(name for letter in BOOSTER_AZ for name in booster.shells(letter)))


def build(hatch_az: float, hatch_z: float, base_z: float = BASE_Z, blister: tuple[float, float] | None = None) -> str:
    """Build the launch vehicle under a spacecraft already in the scene. `hatch_az` (radians) and `hatch_z`
    (the flight's stations, mm) are where the fairing's opening goes: over the spacecraft's entry hatch.
    `blister` is (azimuth in radians, station in the flight's frame, mm) of the middle of what stands out
    through the fairing's wall and is covered by a blister: Voskhod 2's folded airlock. What encloses something is
    marked for the viewer's cutaway here (SHELLS)."""
    M = reuse(materials())
    core.build(base_z, M, web_foot=244.0)  # (the brackets' webs end short of their feet: see core.build)
    for letter, az in BOOSTER_AZ.items():
        booster.build(base_z, M, letter, az)
    upper.build(base_z, M, hatch_az, hatch_z - base_z, None if blister is None else (blister[0], blister[1] - base_z))
    mark_shells((*SHELLS, "Fairing_Right_Blister") if blister else SHELLS)
    return f"{LENGTH * MM:.2f} m on the pad, {SPAN * MM:.1f} m over the rudders"

"""The Vostok-K launch vehicle, 8K72K: the R-7's core and four strap-on boosters, the lattice, the
third stage Block E, and the fairing.

Shared by the flights that rode it; a flight's model/vehicle.py builds its spacecraft and calls
build(). Every dimension is in millimetres. Stations are heights above the plane of the main
nozzles' exits; `base_z` puts that plane in the flight's own frame, and by default the 3KA
spacecraft's frame rests on Block E's adapter. See ../vostok-8k72k.md for what each number rests
on: the overall sizes are published, every station between them is estimated.

Top-level nodes:
    Fairing (Fairing_Left, Fairing_Right)  BlockE  Interstage  CoreStage  CoreEngine
    Booster_B  Booster_V  Booster_G  Booster_D
"""

from __future__ import annotations

from . import booster, core, upper
from .common import BASE_Z, BOOSTER_AZ, LENGTH, MM, SPAN, materials, reuse

SHELLS = (*core.SHELLS, *upper.SHELLS, *(name for letter in BOOSTER_AZ for name in booster.shells(letter)))


def build(hatch_az: float, hatch_z: float, base_z: float = BASE_Z) -> str:
    """Build the launch vehicle under a spacecraft already in the scene. `hatch_az` (radians) and `hatch_z`
    (the flight's stations, mm) are where the fairing's opening goes: over the spacecraft's entry hatch."""
    M = reuse(materials())
    core.build(base_z, M)
    for letter, az in BOOSTER_AZ.items():
        booster.build(base_z, M, letter, az)
    upper.build(base_z, M, hatch_az, hatch_z - base_z)
    return f"{LENGTH * MM:.2f} m on the pad, {SPAN * MM:.1f} m over the rudders"

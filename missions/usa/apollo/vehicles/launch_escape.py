"""Apollo 7 launch escape assembly: estimated member stations within the 224 ft stack.
NASA press kit Figures 25a–25c. No abort physics or articulated canards yet.
"""

import math

from apollo_csm import CM_BASE, bell, radial, tube
from command_module import CONE_Z, FORWARD_LIMIT, JOIN_Z, radius
from saturn_ib import CSM_OFFSET, HEIGHT
from srlib import group, lathe_obj, mark_shells, material, prof

# NAA Apollo News Reference, p.140, P-189: four fixed nozzles, each
# 35 degrees from the motor axis. This is not the 2.75-degree resultant
# thrust-vector offset, which comes from unequal nozzle throat areas.
NOZZLE_CANT_DEGREES = 35.0


def build():
    white = material("apollo-escape-white", (0.88, 0.87, 0.82), roughness=0.63)
    steel = material("apollo-escape-steel", (0.19, 0.21, 0.22), metallic=0.65, roughness=0.5)
    tower = group("LaunchEscape")
    cover = group("BoostCover")
    cm_base = CSM_OFFSET + CM_BASE
    # Retain the original unfinished escape assembly while the capsule is
    # reconstructed independently. This inherited envelope is NOT a sourced
    # cover station and must not be used as the capsule's height.
    cm_top = cm_base + 144.0
    # Retain the provisional 1.4-inch stand-off, following the corrected lower
    # contour so this unfinished cover no longer cuts through the cabin. This
    # is still a fit envelope, not the sourced BPC laminate or as-built mould line.
    stations = sorted({JOIN_Z, CONE_Z, FORWARD_LIMIT, *range(math.ceil(JOIN_Z), 81)})
    cover_profile = [(radius(z) + 1.4, cm_base + z) for z in stations]
    cover_profile += [(18.4, cm_top + 1.5), (0, cm_top + 1.5)]
    lathe_obj("BPC_Shell", prof(cover_profile), white, cover, segs=128)
    mark_shells(["BPC_Shell"])
    # Tapered four-legged truss. Structural joints are estimates from the press-kit perspective.
    levels = [(cm_top - 38, 29), (cm_top + 12, 26), (cm_top + 65, 22), (cm_top + 115, 17)]
    for i in range(4):
        a = math.pi / 4 + math.pi * i / 2
        b = a + math.pi / 2
        for j, ((z0, r0), (z1, r1)) in enumerate(zip(levels, levels[1:])):
            tube(f"LES_Leg_{i}_{j}", radial(r0, a, z0), radial(r1, a, z1), 1.4, white, tower)
            tube(f"LES_DiagonalA_{i}_{j}", radial(r0, a, z0 + 2), radial(r1, b, z1 - 2), 0.8, white, tower)
            tube(f"LES_DiagonalB_{i}_{j}", radial(r0, b, z0 + 2), radial(r1, a, z1 - 2), 0.8, white, tower)
        for j, (z, r) in enumerate(levels):
            tube(f"LES_Crossbar_{i}_{j}", radial(r, a, z), radial(r, b, z), 1.2, white, tower)
    motor_base = cm_top + 115
    lathe_obj("LES_Motor", prof([(0, motor_base), (13, motor_base), (13, HEIGHT - 35), (9, HEIGHT - 12), (0, HEIGHT)]), white, tower)
    mark_shells(["LES_Motor"])
    for i in range(4):
        # News Reference p.142: two nozzles in the pitch plane, two in yaw.
        # Apollo Z maps to model -X and Apollo Y to +Y, so these are the
        # cardinal planes, between the four diagonal tower legs.
        a = math.pi * i / 2
        cant = math.radians(NOZZLE_CANT_DEGREES)
        direction = (-math.sin(cant) * math.cos(a), -math.sin(cant) * math.sin(a), math.cos(cant))
        bell(f"LES_Nozzle_{i}", radial(19, a, motor_base - 10), direction, 17, 5.5, steel, tower)
    # Motor-case joint bands are gaps in the colour only, left for the detailed revision.
    return tower, cover

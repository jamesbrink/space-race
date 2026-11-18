"""Apollo 7 launch escape assembly: estimated member stations within the 224 ft stack.
NASA press kit Figures 25a–25c. No abort physics or articulated canards yet.
"""

import math

import boost_cover
from apollo_csm import CM_BASE, bell, radial, tube
from command_module import APEX, CONE_ANGLE
from saturn_ib import CSM_OFFSET, HEIGHT
from srlib import IN, MeshBuilder, group, lathe_obj, mark_shells, material, prof

# NAA Apollo News Reference, p.140, P-189: four fixed nozzles, each
# 35 degrees from the motor axis. This is not the 2.75-degree resultant
# thrust-vector offset, which comes from unequal nozzle throat areas.
NOZZLE_CANT_DEGREES = 35.0


def build(offset=CSM_OFFSET, height=HEIGHT, *, boardable=False):
    white = material("apollo-escape-white", (0.88, 0.87, 0.82), roughness=0.63)
    steel = material("apollo-escape-steel", (0.19, 0.21, 0.22), metallic=0.65, roughness=0.5)
    tower = group("LaunchEscape")
    cover = group("BoostCover")
    cm_base = offset + CM_BASE
    boost_cover.build(cover, cm_base, white, boardable=boardable)
    # Four-foot square at the base, three-foot square at the head of a
    # ten-foot truss (News Reference p. 140). Register the feet where the
    # diagonal radius meets the forward shield. Bay spacing is estimated.
    low_radius, high_radius = (side / math.sqrt(2) for side in (48, 36))
    foot = cm_base + APEX - low_radius / math.tan(CONE_ANGLE)
    levels = [(foot + 120 * fraction, low_radius + (high_radius - low_radius) * fraction) for fraction in (0, 1 / 3, 2 / 3, 1)]
    for i in range(4):
        a = math.pi / 4 + math.pi * i / 2
        b = a + math.pi / 2
        for j, ((z0, r0), (z1, r1)) in enumerate(zip(levels, levels[1:])):
            tube(f"LES_Leg_{i}_{j}", radial(r0, a, z0), radial(r1, a, z1), 1.75, white, tower)
            tube(f"LES_DiagonalA_{i}_{j}", radial(r0, a, z0 + 2), radial(r1, b, z1 - 2), 1.25, white, tower)
            tube(f"LES_DiagonalB_{i}_{j}", radial(r0, b, z0 + 2), radial(r1, a, z1 - 2), 1.25, white, tower)
        for j, (z, r) in enumerate(levels):
            tube(f"LES_Crossbar_{i}_{j}", radial(r, a, z), radial(r, b, z), 1.2, white, tower)
    motor_base = foot + 120
    lathe_obj("LES_Motor", prof([(0, motor_base), (13, motor_base), (13, height - 45), (6.65, height - 13.37), (0, height)]), white, tower)
    mark_shells(["LES_Motor"])
    for i in range(4):
        # News Reference p.142: two nozzles in the pitch plane, two in yaw.
        # Apollo Z maps to model -X and Apollo Y to +Y, so these are the
        # cardinal planes, between the four diagonal tower legs.
        a = math.pi * i / 2
        cant = math.radians(NOZZLE_CANT_DEGREES)
        direction = (-math.sin(cant) * math.cos(a), -math.sin(cant) * math.sin(a), math.cos(cant))
        bell(f"LES_Nozzle_{i}", radial(19, a, motor_base - 10), direction, 17, 5.5, steel, tower)
    if boardable:
        # North American Apollo News Reference pp. 138 and 142: two
        # fold-out canards below the pitch motor. Dimensions approximate.
        for i, side in enumerate((-1, 1)):
            wing = group(f"LES_Canard_{i}", tower)
            wing.location = (13.16 * side * IN, 0, (height - 54) * IN)
            shape = [(0, -8, 0), (0, 8, 0), (0, 10, -14), (0, 6, -23), (0, -6, -23), (0, -10, -14)]
            v = [(x * IN, y * IN, z * IN) for x, y, z in shape]
            mesh = MeshBuilder()
            mesh.add(
                v + [(x + side * 0.12 * IN, y, z) for x, y, z in v],
                [(0, 1, 2, 3, 4, 5), (11, 10, 9, 8, 7, 6)] + [(j, (j + 1) % 6, 6 + (j + 1) % 6, 6 + j) for j in range(6)],
            )
            mesh.build(f"LES_Canard_Surface_{i}", white, wing, smooth=False)
    # Motor-case joint bands are gaps in the colour only, left for the detailed revision.
    return tower, cover

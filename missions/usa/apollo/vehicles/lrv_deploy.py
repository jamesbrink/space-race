"""How the lunar roving vehicle came off the lunar module, and what it is built to be driven by: the vehicle contract's node
and its hinges (lunar-rovers.md, "Deployment"). Inches, +X forward, +Y left, Z up from the ground, as lunar_rover.py.

The rover is built deployed, as the gallery shows it. `assemble` hangs it under one node, `LRV`, built to the vehicle
contract (tools/blender/vehicles.py: its extras say what it is, its wheelbase and track, its wheels, its four-wheel
steering and its suspension), and under that on the nodes the deployment moves, each with its origin on its hinge:

    LRV                    the vehicle: origin on the ground under the middle of its wheelbase
      LRV_Tilt             the whole rover tipped out of quadrant I and let down until its rear wheels are on the ground
        LRV_Lower          its front then let down until all four are (the centre braked reel)
          RoverChassis ... the centre frame and what it carries
          LRV_Fore         the forward frame, on its hinge to the centre one
            LRV_Corner_FL, _FR   each front suspension and wheel, on the pivot it folds about
          LRV_Aft          the aft frame, on its hinge
            LRV_Corner_RL, _RR

`deployment_runs` writes each moving node's motion into its extras (`run`, types.ts Move): the five phases of the LRV
Operations Handbook (Boeing LS006-002-2H, 19 April 1971, section 1.9.3 and figure 1-39), played from where it was
stowed to where it stands on its wheels, in the frame of its place beside the LM (`LANDER_PLACE`).
"""

from math import pi, radians, sqrt

import bpy
from mathutils import Matrix, Vector

from srlib import IN, group

LB = 0.45359237
# Every figure the viewer drives it by. Documented unless said: LS006-002-2H section 1.3 (the mobility subsystem) and
# figure 1-1; the Apollo 16 press kit pp. 106-110 for the wheelbase, the track and the wheel.
CONTRACT = dict(
    vehicle="Lunar Roving Vehicle",
    wheelbase=round(90 * IN, 4),
    track=round(72 * IN, 4),
    wheel_radius=round(32.19 / 2 * IN, 4),
    # figure 1-1: deployed and empty, with its batteries and payload supports, 462 lb; section 5.1: 970 lb of payload
    mass=round(462 * LB, 1),
    payload=round(970 * LB, 1),
    # section 1.3.4: "a wall-to-wall turning radius of 122 inches"; outer wheel 22 degrees, inner 50; lock to lock 5.5 s
    turning_circle=round(2 * 122 * IN, 3),
    inner_lock=50,
    steer_time=5.5,
    rear_steer=1,
    # section 7.1.1: "Speed will vary between zero and 14 km/h"
    top_speed=round(14 / 3.6, 3),
    # section 1.3.2: a quarter horsepower traction motor at each wheel
    power=round(4 * 0.25 * 745.7, 1),
    # section 1.3.3: double wishbones on torsion bars, "14 inches of chassis ground clearance when the LRV is fully loaded
    # and 17 inches when unloaded"
    suspension="wishbone",
    clearance_loaded=round(14 * IN, 4),
    clearance_empty=round(17 * IN, 4),
    # (the clearances are the LRV's on the Moon, where it was rated to work: the Moon's surface gravity, its GM over its
    # mean radius squared, as world/bodies.ts gravityOn has it)
    rated_gravity=1.624,
)

# The hinges. The end frames' hinge pins are at 18.16 in (the model's ChassisHinges); the axes they fold about are put
# higher, so a folded frame lies over the centre one rather than through it: estimated, the real hinge's linkage is not
# modelled. Each suspension "can be rotated approximately 135 degrees to allow folding" (section 1.3.3), about a pivot
# inboard of its wishbones: the pivot's place is estimated.
FORE_HINGE = (26.85, 0.0, 31.0)
AFT_HINGE = (-26.85, 0.0, 37.0)
CORNER = {"F": 45.0, "R": -45.0}
PIVOT_Y, PIVOT_Z = 20.0, 18.5
CORNER_FOLD = 135.0

# Quadrant I of a J-mission LM (lm10_equipment.rover): the bay's middle 58.5 in out along each of the LM's +X and +Y
# (82.7 in from its axis), its face turned 135 degrees; the folded rover's underside is its outer face (3.45 in out from
# the bay's datum) and its middle 92 in over the footpads' plane, its forward end down.
BAY_OUT = 58.5 * sqrt(2)
BAY_FACE = 3.45
BAY_MIDDLE = 92.0
# Where it stands once it is off its saddle, its forward end toward the LM: its middle 154.5 in out from the LM's axis
# along quadrant I's diagonal, which puts its nose a foot outboard of the bay's face. Estimated: Irwin had it "off" and
# turned "a couple of feet" clear of Falcon (ALSJ, 120:26:47 to 120:27:34).
OUT = 154.5
# The point it turns about as it leaves the bay: the lower forward corner of the centre frame, at the walking hinge
# (section 1.9.3.3: on the apex fittings for its first 15 degrees, then the walking hinge). Estimated.
PIVOT = Vector((26.75, 0.0, 15.0))
# How far its front is held up once the rear wheels are down (the end of phase III), degrees: estimated.
HELD_UP = 25.0


def lander_place():
    """Where the `LRV` node stands in the LM model's own frame once deployed: x, y, z in metres (the viewer's axes, +Y up)
    and its turn about the vertical, radians (its +X toward the LM along quadrant I's diagonal)."""
    out = OUT * IN / sqrt(2)
    return [round(out, 4), 0.0, round(-out, 4), round(-3 * pi / 4, 6)]


def stowed():
    """The rover's pose in quadrant I, in the `LRV` node's frame: turned 90 degrees about its own Y (its forward end
    down, its underside outboard), its underside at the bay's face and its middle at the bay's."""
    # (its underside is 14 in over its own ground, the loaded clearance: that plane lies at the bay's face)
    face = OUT - BAY_OUT - BAY_FACE - 14.0
    return Matrix.Translation(Vector((face, 0, BAY_MIDDLE))) @ Matrix.Rotation(pi / 2, 4, "Y")


def ease(t):
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


def clamp(t):
    return min(1.0, max(0.0, t))


def phase_three(u):
    """Phases II and III (section 1.9.3.2 and .3) at `u` of the way through: how far the rover has turned out of the bay
    (degrees, 0 stowed, 90 level, beyond that its rear down), and where its pivot is in the LRV frame. The D-handle's
    push-off spring turns it out 4 degrees; it turns on the apex fittings to 15; then, on the walking hinge and the
    telescopic tubes, it goes on turning while it is let out and down until its rear wheels are on the ground with its
    front held up `HELD_UP` degrees. The angles are the handbook's; the times between them and the pivot's path are
    estimated."""
    if u <= 0.04:
        theta = 4.0 * ease(u / 0.04)
    elif u <= 0.16:
        theta = 4.0 + 11.0 * (u - 0.04) / 0.12
    else:
        theta = 15.0 + (75.0 + HELD_UP) * ease((u - 0.16) / 0.84) ** 0.85
    start = stowed() @ PIVOT
    end = held_up(HELD_UP) @ PIVOT
    w = 0.0 if u <= 0.16 else ease((u - 0.16) / 0.84)
    return theta, start.lerp(end, w)


def held_up(alpha):
    """The rover's pose with its rear wheels on the ground where they stand once it is deployed (each hub its radius over
    the ground, straight over where it touches) and its front up `alpha` degrees: phase IV lets it down to level about
    them, their brakes on (section 1.9.3.3)."""
    turn = Matrix.Rotation(-radians(alpha), 4, "Y")
    hub = Vector((-45.0, 0.0, 32.19 / 2))
    return Matrix.Translation(hub - turn @ hub) @ turn


def body_three(u):
    """The whole rover's pose at `u` through phase III: turned by its angle out of the bay, about its pivot."""
    theta, at = phase_three(u)
    turn = Matrix.Rotation(radians(90.0 - theta), 4, "Y")
    return Matrix.Translation(at - (turn @ PIVOT)) @ turn


def folds(u):
    """How far each frame and suspension is folded at `u` through phase III, degrees, from the angle the rover has turned
    (section 1.9.3.3): the aft frame is unlatched once the tubes stop at 45 degrees and unfolds on its torque bars; its
    wheels spring out once it is open to some 170 degrees; the forward frame unfolds on its torsion spring as the rear
    comes down, and its wheels spring out last. The angles at which each begins and ends are estimated."""
    theta, _ = phase_three(u)
    aft = 180.0 * (1 - ease((theta - 45.0) / 50.0))
    rear = CORNER_FOLD * (1 - ease((theta - 91.0) / 4.0))
    fore = 180.0 * (1 - ease((theta - 100.0) / 12.0))
    front = CORNER_FOLD * (1 - ease((theta - 111.0) / 4.0))
    return {"LRV_Aft": aft, "LRV_Fore": -fore, "R": rear, "F": front}


def assemble():
    """Hang everything built under the vehicle's node and its hinges, each piece staying where it was built."""
    bpy.context.view_layer.update()
    root = group("LRV", None, **CONTRACT, lander_place=lander_place())
    tilt = group("LRV_Tilt", root)
    lower = group("LRV_Lower", tilt)
    fore = group("LRV_Fore", lower)
    fore.location = Vector(FORE_HINGE) * IN
    aft = group("LRV_Aft", lower)
    aft.location = Vector(AFT_HINGE) * IN
    corners = {}
    for end, frame in (("F", fore), ("R", aft)):
        for side, sign in (("L", 1), ("R", -1)):
            corner = group(f"LRV_Corner_{end}{side}", frame)
            corner.location = Vector((CORNER[end], sign * PIVOT_Y, PIVOT_Z)) * IN - frame.location
            corners[end + side] = corner
    bpy.context.view_layer.update()

    def adopt(obj, parent):
        world = obj.matrix_world.copy()
        obj.parent = parent
        obj.matrix_parent_inverse = Matrix.Identity(4)
        obj.matrix_world = world

    carrier = bpy.data.objects["RoverSuspension"]
    for name, corner in corners.items():
        for o in list(carrier.children):
            if o.name.startswith(f"LRV_Link_{name}_") or o.name == f"LRV_Pivots_{name}":
                adopt(o, corner)
        adopt(bpy.data.objects[f"LRV_Steer_{name}"], corner)
    # what is left of the suspension's carrier is the two steering gears, one on each end frame
    for o in list(carrier.children):
        adopt(o, fore if o.name.endswith("_F") else aft)
    bpy.data.objects.remove(carrier)
    # every other piece by where it is: on an end frame if it lies beyond the centre frame's hinge, else on the centre
    bpy.context.view_layer.update()
    for o in [o for o in bpy.context.scene.objects if o.parent is None and o is not root]:
        xs = [(o.matrix_world @ c).x for c in o.bound_box] if o.type == "MESH" else []
        for child in o.children_recursive:
            if child.type == "MESH":
                xs += [(child.matrix_world @ Vector(c)).x for c in child.bound_box]
        middle = (min(xs) + max(xs)) / 2 / IN if xs else 0.0
        adopt(o, fore if middle > FORE_HINGE[0] else aft if middle < AFT_HINGE[0] else lower)
    bpy.context.view_layer.update()
    return root


def write_run(node, locals_, built):
    """A node's motion as the viewer plays it (types.ts Move, `run`): each sample how far it has moved and how it has
    turned from `built` (its local matrix as built), in its parent's frame, metres, the viewer's axes (+Y up)."""
    placed = built.translation
    rest = built.to_quaternion()
    run = []
    for m in locals_:
        by = (m.translation - placed) * IN
        q = m.to_quaternion() @ rest.inverted()
        run += [round(v, 6) + 0.0 for v in (by.x, by.z, -by.y, q.x, q.z, -q.y, q.w)]
    node["run"] = run


def deployment_runs(steps=160):
    """Write the motions of phases III and IV into the nodes that make them (`assemble`)."""
    bpy.context.view_layer.update()
    us = [i / steps for i in range(steps + 1)]
    write_run(bpy.data.objects["LRV_Tilt"], [body_three(u) for u in us], Matrix.Identity(4))
    for name, hinge in (("LRV_Fore", FORE_HINGE), ("LRV_Aft", AFT_HINGE)):
        at = Matrix.Translation(Vector(hinge))
        write_run(bpy.data.objects[name], [at @ Matrix.Rotation(radians(folds(u)[name]), 4, "Y") for u in us], at)
    for end in ("F", "R"):
        for side, sign in (("L", 1), ("R", -1)):
            node = bpy.data.objects[f"LRV_Corner_{end}{side}"]
            at = Matrix.Translation(node.location / IN)
            write_run(node, [at @ Matrix.Rotation(radians(sign * folds(u)[end]), 4, "X") for u in us], at)
    # phase IV: inside the rover tipped as phase III left it, its front let down about its rear wheels to level
    held = held_up(HELD_UP)
    vs = [i / 60 for i in range(61)]
    write_run(bpy.data.objects["LRV_Lower"], [held.inverted() @ held_up(HELD_UP * (1 - ease(v))) for v in vs], Matrix.Identity(4))
    # (the joins between phases are where the motions meet: the end of III is IV's start)
    gap = (body_three(1.0).translation - held.translation).length
    if gap > 0.01:
        raise ValueError(f"lrv_deploy: phase III ends {gap:.3f} in from where phase IV begins")
    low = lowest(us)
    if low < -0.05:
        raise ValueError(f"lrv_deploy: a wheel goes {-low:.2f} in under the ground before the rear wheels land")


def lowest(us):
    """How low any wheel's bottom comes before phase III's end, inches over the ground (it must not go under it)."""
    least = 1e9
    hub = {"F": 45.0, "R": -45.0}
    for u in us[:-1]:
        body = body_three(u)
        f = folds(u)
        for end, frame_name, hinge in (("F", "LRV_Fore", FORE_HINGE), ("R", "LRV_Aft", AFT_HINGE)):
            frame = Matrix.Translation(Vector(hinge)) @ Matrix.Rotation(radians(f[frame_name]), 4, "Y") @ Matrix.Translation(-Vector(hinge))
            for sign in (1, -1):
                pivot = Vector((hub[end], sign * PIVOT_Y, PIVOT_Z))
                corner = Matrix.Translation(pivot) @ Matrix.Rotation(radians(sign * f[end]), 4, "X") @ Matrix.Translation(-pivot)
                centre = body @ frame @ corner @ Vector((hub[end], sign * 36.0, 16.095))
                least = min(least, centre.z - 16.095)
    return least

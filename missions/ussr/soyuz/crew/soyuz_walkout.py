"""A crew member as a walker, with the same wearer and launch garment as the flight's seated figure."""

import bpy
from mathutils import Matrix

import figurelib as fl
import flight_suit
import sokol_k
from srlib import run


def run_walker(wearer, suit="flight"):
    def build():
        flight_suit.wear(wearer)
        # The reference wool cuff is cut for the 170 cm reconstruction. The hand scales with stature;
        # scale the two terminal cuff sections with it so the cloth still clears the wrist.
        cuff_scale = wearer.stature / flight_suit.KOMAROV.stature
        for i in (-2, -1):
            x, y, z, rx, ry = flight_suit.B.arm[i]
            flight_suit.B.arm[i] = (x, y, z, rx * cuff_scale, ry * cuff_scale)
        rig = fl.start()
        flight_suit.build_figure()
        if suit in ("sokol-k", "sokol-kv2"):
            keys = {**fl.head_view(rig), "shoulders": {s: fl.B.shoulder_point(s) for s in (-1, 1)}}
            sokol_k.dress(list(bpy.data.objects), Matrix.Identity(4), keys, suit == "sokol-kv2")
        fl.rig_standing()
        return f"{wearer.name}, {suit}, nominal stature {wearer.stature:.0f} cm"

    run(wearer.name, build, [("walkout.png", (0, 0, 0.88), 4.2, dict(azimuth=-72, elevation=6))])

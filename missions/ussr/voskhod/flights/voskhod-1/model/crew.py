"""Vladimir Komarov, standing, for Voskhod 1's launch site: a man to walk as. Run with `pnpm model voskhod-1`.

The figure is ../../../crew/flight_suit.py's, the commander as he lay in his couch (`KOMAROV`: 1.70 m, estimated, as all
three are), built standing and given figurelib's skeleton so the viewer can walk him. He is dressed as he was in the cabin:
the grey wool suit, the white headset cap, soft shoes. On the way to the lift the three wore light blue jackets over the
suits and boots, which they left at the hatch («Поверх — голубые куртки», TASS's correspondent; Siddiqi, p. 423): those are
not built, and the figure says so. The spacecraft is vehicle.py beside this file, where the same figure lies in his couch.
"""

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "ussr", "voskhod", "crew"))
import figurelib as fl  # noqa: E402
import flight_suit  # noqa: E402
from srlib import CM, run  # noqa: E402


def build() -> str:
    import bpy

    flight_suit.wear(flight_suit.KOMAROV)
    fl.start()
    flight_suit.build_figure()
    fl.rig_standing()
    height = max(v.co.z for o in bpy.data.objects if o.type == "MESH" for v in o.data.vertices)
    return f"standing height {height:.3f} m in his cap and shoes, built {flight_suit.KOMAROV.stature * CM:.3f} m"


if __name__ == "__main__":
    run(
        "voskhod-1 crew",
        build,
        [
            ("crew-front.png", (0, 0, 0.86), 4.3, dict(azimuth=-90, elevation=4)),
            ("crew-three-quarter.png", (0, 0, 0.86), 4.3, dict(azimuth=-52, elevation=10)),
        ],
    )

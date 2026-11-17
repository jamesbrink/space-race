"""M. Scott Carpenter, suited for Mercury-Atlas 7 on 24 May 1962. Run with `pnpm model ma-7`.

The suit is ../../../crew/mark_iv_suit.py, the one module the Mercury crews are built from: this script only says whose
it is and what the record gives of it on that day (`CARPENTER`). What Carpenter's suit had that the figure has not is in
../spacecraft.md, "The pilot". The vehicle and the pad are vehicle.py and pad.py beside this file.
"""

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "mercury", "crew"))
import mark_iv_suit  # noqa: E402
from srlib import CM, run  # noqa: E402

# Carpenter's suit on the day, as far as the record goes: the parabolic mirror on the chest ("the parabolic mirror on his
# chest", This New Ocean, NASA SP-4201, p. 447, and p. 445: documented); the rubber neck dam, rolled and stowed (NASA TN
# D-3814, p. 77: "His neck dam was still stowed", and p. 96: documented); the gloves locked to the sleeves on rings at the
# wrists, and the helmet's lead hanging on the chest with its plug (NASA S62-03907, at the hatch that morning: by
# photograph). His stature is not in anything read: 5 ft 10 in, as commonly given (estimated). Everything else is the suit
# as modelled for Shepard: not known to have been the same.
CARPENTER = mark_iv_suit.Fit("MA-7", "M. S. CARPENTER", 177.8, wrist_rings=True, mirror=True, lead=True, neck_dam=True)


def build() -> str:
    height = mark_iv_suit.build(CARPENTER)
    return f"standing height {height:.3f} m in helmet and boots, pilot {CARPENTER.stature * CM:.3f} m (estimated)"


if __name__ == "__main__":
    run(
        "ma-7 crew",
        build,
        [
            ("crew-front.png", (0.12, 0, 0.95), 4.7, dict(azimuth=-90, elevation=4)),
            ("crew-three-quarter.png", (0.12, 0, 0.95), 4.7, dict(azimuth=-52, elevation=10)),
            ("crew-back.png", (0.12, 0, 0.95), 4.7, dict(azimuth=90, elevation=6)),
        ],
    )

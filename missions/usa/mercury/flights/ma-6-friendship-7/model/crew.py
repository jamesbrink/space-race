"""John Glenn, suited for Mercury-Atlas 6 on 20 February 1962. Run with `pnpm model ma-6`.

The suit is ../../../crew/mark_iv_suit.py, the one module the Mercury crews are built from: this script only says whose
it is and what the record gives of it on that day (`GLENN`). What Glenn's suit had that the figure has not is in
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

# Glenn's suit on the day, as far as the record goes: gloves locked to the sleeves on ball-bearing rings (Results of
# the First United States Manned Orbital Space Flight, pp. 34 to 37: documented) and the convex mirror on the chest
# (NASA GPN-2006-000027: by photograph). His stature is not in anything read: 5 ft 10 1/2 in, as commonly given
# (estimated). Everything else is the suit as modelled for Shepard: not known to have been the same.
GLENN = mark_iv_suit.Fit("MA-6", "J. H. GLENN", 179.1, wrist_rings=True, mirror=True)


def build() -> str:
    height = mark_iv_suit.build(GLENN)
    return f"standing height {height:.3f} m in helmet and boots, pilot {GLENN.stature * CM:.3f} m (estimated)"


if __name__ == "__main__":
    run(
        "ma-6 crew",
        build,
        [
            ("crew-front.png", (0.12, 0, 0.95), 4.7, dict(azimuth=-90, elevation=4)),
            ("crew-three-quarter.png", (0.12, 0, 0.95), 4.7, dict(azimuth=-52, elevation=10)),
            ("crew-back.png", (0.12, 0, 0.95), 4.7, dict(azimuth=90, elevation=6)),
        ],
    )

"""Walter M. Schirra, Jr., suited for Mercury-Atlas 8 on 3 October 1962. Run with `pnpm model ma-8`.

The suit is ../../../crew/mark_iv_suit.py, the one module the Mercury crews are built from: this script only says whose
it is and what the record gives of it on that day (`SCHIRRA`). What Schirra's suit had that the figure has not is in
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

# Schirra's suit on the day, as far as the record goes, which is not far: the reports name a smaller helmet microphone,
# lights on the gloves' fingertips and a blood-pressure cuff with a right-angle adapter (NASA TN D-4807, pp. 11 and 61;
# NASA SP-12, pp. 5, 66 and 104), none of which the figure has, and no mirror and no neck dam. The gloves locked to the sleeves on
# rings at the wrists: Glenn's, Carpenter's and Cooper's did (assumed). His stature is not in anything read: 5 ft 10 in,
# as commonly given (estimated). Everything else is the suit as modelled for Shepard: not known to have been the same.
SCHIRRA = mark_iv_suit.Fit("MA-8", "W. M. SCHIRRA", 177.8, wrist_rings=True)


def build() -> str:
    height = mark_iv_suit.build(SCHIRRA)
    return f"standing height {height:.3f} m in helmet and boots, pilot {SCHIRRA.stature * CM:.3f} m (estimated)"


if __name__ == "__main__":
    run(
        "ma-8 crew",
        build,
        [
            ("crew-front.png", (0.12, 0, 0.95), 4.7, dict(azimuth=-90, elevation=4)),
            ("crew-three-quarter.png", (0.12, 0, 0.95), 4.7, dict(azimuth=-52, elevation=10)),
            ("crew-back.png", (0.12, 0, 0.95), 4.7, dict(azimuth=90, elevation=6)),
        ],
    )

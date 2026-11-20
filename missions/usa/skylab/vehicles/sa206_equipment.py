"""SA-206 experiment M415. Inch stations and reconstruction limits are in sa-206.md."""

import math

from skylab_ib_equipment import IU_BASE, box, fairing, mount, stage_equipment
from srlib import IN, MeshBuilder, group, interior, material


def build():
    white, metal, dark = stage_equipment(206)
    # MAN-206 figs. 6-29/30. Pos II at model +X. The two black control specimens occupy opposite panels' first rows.
    samples = [
        material("m415-" + name, rgb, roughness=0.8)
        for name, rgb in (("s13g", (0.85, 0.84, 0.78)), ("z93", (0.91, 0.91, 0.89)), ("hxw", (0.78, 0.79, 0.76)), ("control", (0.016, 0.016, 0.016)))
    ]
    rows = [("ADB", "CAB", "BCA", "ACB"), ("CDA", "BCA", "CBA", "CBA")]
    for i, az in enumerate((-51, 0)):
        panel = mount(f"M415_Panel{i + 1}", group(f"M415SensorPanel{i + 1}"), math.radians(az), IU_BASE + 18)
        box(f"M415_Panel{i + 1}_Plate", panel, (2.4, 11, 15), (1.5, 0, 0), metal)
        for sign in (-1, 1):
            fairing(f"M415_Panel{i + 1}_EndFairing", panel, [(sign * 7.55, 5.5, 2.7), (sign * 14.6, 5.5, 1.5)], metal)
        for row, layout in enumerate(rows[i]):
            z = 5.5 - row * 3.6
            for column, coating in enumerate(layout):
                sample = MeshBuilder()
                sample.disc((2.7 * IN, (column - 1) * 3.3 * IN, z * IN), (1, 0, 0), 1.25 * IN, 0.32 * IN, segs=24)
                sample.build(f"M415_Panel{i + 1}_R{row + 1}_C{column + 1}", samples["ABCD".index(coating)], panel)
            if row:
                lid = group(f"M415_Cover{i + 1}_{row}", panel)
                box(f"M415_Panel{i + 1}_Lid{row}", lid, (0.31, 10.8, 3.35), (3.55, 0, z), white)
                if interior():
                    heads = MeshBuilder()
                    for side in (-1, 1):
                        heads.disc((3.72 * IN, side * 4.8 * IN, z * IN), (1, 0, 0), 0.29 * IN, 0.16 * IN, segs=8)
                    heads.build(f"M415_Panel{i + 1}_Retainers{row}", dark, lid)

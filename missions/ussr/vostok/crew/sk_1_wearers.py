"""Every wearer of the SK-1 (sk_1.py) built at every level of detail, each under the build's clearance check, in one go:

    blender -b --factory-startup --python-exit-code 1 -P missions/ussr/vostok/crew/sk_1_wearers.py [-- --preview <dir>]

A flight's crew.py builds one wearer, so a fault that only one wearer's fittings have, at only one level, is not seen
until that flight's site is built (the elbow at the collar of the suits of June 1963, at 0.6: sk-1.md, "The wearers").
This builds them all: each `Wearer` the module names, standing as a crew model is at each level `pnpm model` builds
(full, then tools/build-model.mjs's LODS), and seated with the visor down as a cabin has him, at each level a cabin's
pilot is built at all (srlib.interior). Nothing is exported. It exits 1 if any of them fails; run it after any change
to sk_1.py or to what it is built from (figurelib, srlib). `--preview <dir>` also writes two stills of each standing
figure's helmet, from his right front and from his right, where the fittings that differ are:
<wearer>-<level>-helmet.png and <wearer>-<level>-collar.png.
"""

import argparse
import os
import re
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
from mathutils import Matrix  # noqa: E402

import sk_1  # noqa: E402
import srlib  # noqa: E402


def levels() -> list[tuple[str, float]]:
    """The levels a model is built at, by the name its file carries: read from the tool that builds them, so the two cannot drift."""
    with open(os.path.join(_root, "tools", "build-model.mjs"), encoding="utf8") as f:
        found = re.search(r"const LODS = \[([^\]]*)\]", f.read())
    if not found:
        sys.exit("sk-1 wearers: tools/build-model.mjs no longer says `const LODS = [...]`: read the levels from where they are now")
    return [("full", 1.0), *((f"lod{n + 1}", float(s)) for n, s in enumerate(found.group(1).split(",")))]


def wearers() -> dict[str, sk_1.Wearer]:
    """Every wearer the module names (GAGARIN, BYKOVSKY ...): one added there is built here without being listed."""
    return {name: who for name, who in vars(sk_1).items() if name.isupper() and name != "WEARER" and isinstance(who, sk_1.Wearer)}


def main() -> None:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", help="directory for EEVEE stills of each standing figure's helmet")
    args = ap.parse_args(argv)
    built = failed = 0
    for name, who in wearers().items():
        for level, detail in levels():
            srlib.DETAIL = detail
            for pose in ("standing", "seated") if srlib.interior() else ("standing",):
                srlib.reset_scene()
                sk_1.wear(who)
                if pose == "standing":
                    size = f"{sk_1.build():.3f} m tall"
                else:
                    sk_1.build_seated(srlib.group("Pilot"), Matrix.Identity(4), "Pilot")
                    size = "visor down"
                bpy.context.view_layer.update()
                clashes = srlib.check_clearance()
                built += 1
                failed += bool(clashes)
                state = "CLEARANCE FAILED" if clashes else "clear"
                print(f"sk-1 wearers: {name} {pose} at {level} ({detail:g}): {srlib.stats()[1]:,} triangles, {size}: {state}")
                for line in clashes:
                    print(f"  {line}")
                if args.preview and pose == "standing":
                    os.makedirs(args.preview, exist_ok=True)
                    at = (0.0, sk_1.HELMET_AT.y * srlib.CM, (sk_1.HELMET_RIM + 5.0) * srlib.CM)
                    for view, azimuth in (("helmet", -128.0), ("collar", -172.0)):
                        still = os.path.join(args.preview, f"{name.lower()}-{level}-{view}.png")
                        srlib.render_preview(still, at, 1.25, azimuth=azimuth, elevation=2.0, res=(1100, 1100))
    print(f"sk-1 wearers: {built} built, {failed} failed the clearance check")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()

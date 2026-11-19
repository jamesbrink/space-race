"""Site 1's Soyuz access towers on the existing deck, in the servicing position. See site-1.md."""

import sys
from pathlib import Path

_root = next(path for path in Path(__file__).resolve().parents if (path / "tools" / "blender").is_dir())
sys.path.insert(0, str(_root / "tools" / "blender"))
sys.path.insert(0, str(_root / "missions" / "ussr" / "places" / "tyuratam"))

import sitelib  # noqa: E402
from site1 import bunker, deck, launch_system, place, platform, storage  # noqa: E402
from site1.place import materials  # noqa: E402
from site1.site import Parts  # noqa: E402
from site1.soyuz_access import build_towers  # noqa: E402
from srlib import run  # noqa: E402


def build():
    # Earliest Soyuz 1/5 flight in this set. Excludes the SW mast, removed before Gagarin.
    sitelib.as_of("1967-04-23")
    surroundings = Parts(materials())
    bunker.build(surroundings)
    storage.build(surroundings)
    place.settle(surroundings)
    surroundings.build()
    parts = Parts(surroundings.M)
    platform.build(parts, deck.slab_tracks())
    deck.rails(parts)
    deck.land_rails(parts)
    deck.masts(parts)
    launch_system.build(parts)
    build_towers(parts)
    parts.build()
    return f"{platform.summary()}, Soyuz servicing towers, top platform 36 m (estimated from NASA S75-32339)"


if __name__ == "__main__":
    run("Soyuz at Site 1", build, [("site.png", (0, 0, 16), 125, dict(azimuth=-48, elevation=15, res=(960, 800)))])

"""Site 1, Tyuratam: the site's frame, its key dimensions and its materials.

Units. Nobody has published a drawing of this place, so each figure is kept in the units of whoever
measured it and multiplied once: feet (`FT`) where the CIA's photographic interpreters measured the
structure off U-2 photography of 1957 to 1959 (HTA/JR-4/58, PIC/JR-2/60, PIC/JR-2/61), millimetres
(`MM`) where a Soviet technical description of the launch system gives them (later, the Soyuz
complex: a cross-check), and metres for what is read off today's map. The scene is built in metres.

Frame (Blender): the origin is the rocket's axis at the platform's deck, the "zero mark". +Z is up.
+X is due east (090 true): the way the centre track runs onto the platform and on out over the
flame pit. +Y is north, toward the command bunker. True north is (0, 1, 0). See ../site-1.md.
"""

from __future__ import annotations

import math

import sitelib
from sitelib import P, Parts, beam, box, fine, handrail, lattice, obox, plate, prism, profile, stood, truss
from srlib import FT, material

MM = 0.001
sitelib.use(1.0)  # the scene's lengths are metres; a figure in feet or millimetres is multiplied where it is quoted

__all__ = [
    "FT",
    "MM",
    "P",
    "Parts",
    "Welded",
    "beam",
    "box",
    "fine",
    "handrail",
    "lattice",
    "materials",
    "obox",
    "plate",
    "prism",
    "profile",
    "stood",
    "truss",
]

# --------------------------------------------------------------------------- the site

TRUE_NORTH = (0.0, 1.0, 0.0)
GROUND = -0.12  # the viewer's terrain under the deck's level (backdrops.ts: GROUND_Y), m

# The platform: 135 ft square and about 10 ft thick (PIC/JR-2/60, measured; Zak: "40 x 40 m"), on four hollow
# pylons 30 ft long and 55 ft apart, 115 ft over the pair, about 10 ft thick (PIC/JR-2/61 Figure 1).
PLATFORM = 135.0 * FT
PLATFORM_T = 10.0 * FT
PYLON_LONG, PYLON_GAP, PYLON_T = 30.0 * FT, 55.0 * FT, 10.0 * FT
# Each row's centre line from the axis (derived): the four pylons are 115 ft over their outer faces north to south as
# well as east to west (PIC/JR-2/61 Figure 1 dimensions both; PIC/JR-2/60: "believed to be 115 feet square"), so a row's
# outer face is 57.5 ft out and its middle 5 ft less.
PYLON_Y = 115.0 * FT / 2 - PYLON_T / 2
FENCE_IN = 15.0 * FT  # the low fence on the three overhanging sides, set in from the edge (PIC/JR-2/61)
# The hole in the platform: "a dark circle about 65 feet in diameter" (PIC/JR-2/60)
OPENING_R = 65.0 * FT / 2

# The flame pit. 880 by 550 ft at the rim (HTA/JR-4/58); its depth is not agreed (site-1.md): 43 m is taken.
PIT_DEPTH = 43.0

# The rails on the deck: their heads stand this far proud of the concrete, m (estimated: the photograph of the morning
# shows them flush in the deck; 9 mm keeps head and concrete apart in depth). What rolls on them takes its height from this.
RAIL_TOP = 0.009
# The Soviet gauge between the rails' inner faces was 1,524 mm (5 ft) until 1970, when it was made 1,520 (documented:
# the standard; that this track was laid to it is assumed).
GAUGE = 1524.0 * MM

# The launch system's rotating ring, from the Soviet description of the later system (17P32-6): the
# ring is a frame 14,920 mm across its inside and 19,350 mm over its corners; the rotating part reaches
# 20,352 mm above the zero mark and 6,750 mm below it.
RING_IN = 14920.0 * MM / 2
RING_OUT = 19350.0 * MM / 2
ROTATING_TOP = 20352.0 * MM
ROTATING_BELOW = 6750.0 * MM

# The rocket in it. Its lowest point (the main nozzles' exits) hangs level with the foot of the rotating
# part (derived: "about 7 m below" in print), so the boosters' tips, where the core is widest and the
# four supports take its weight, are 19,759 - 6,750 = 13,009 mm above the deck.
TAIL_Z = -ROTATING_BELOW
TIP_Z = TAIL_Z + 19.759
# The launch azimuth, degrees true: derived from the orbit's inclination (the flight's README). The ring was turned to
# it; which of the rocket's planes lay along it is not recorded. Booster B's is taken (estimated): it puts the
# spacecraft's hatch (the vehicle's 135 degrees) 7.5 degrees south of due west, toward the erector on the centre track.
AZIMUTH = 37.5
TURN = math.radians(90.0 - AZIMUTH)  # the rocket's own +X from the site's +X, anticlockwise from above


class Welded:
    """A surface worked out on a grid, added a cell at a time: each grid point is one vertex of it, shared by the cells
    that meet there. (A cell added with four vertices of its own shares none with its neighbours, and a mesh shaded
    smooth then has nothing to average: every cell is lit as a facet.)"""

    def __init__(self, mb) -> None:
        self.mb, self.at = mb, {}

    def add(self, keys, points, faces) -> None:
        """A cell: its corners' names on the grid, where each is, and its faces as indices into those."""
        index = []
        for key, point in zip(keys, points):
            if key not in self.at:
                self.at[key] = len(self.mb.verts)
                self.mb.verts.append(tuple(point))
                self.mb.uvs.append((0.0, 0.0))
            index.append(self.at[key])
        self.mb.faces.extend(tuple(index[k] for k in face) for face in faces)


def about(az: float, r: float, z: float = 0.0) -> tuple[float, float, float]:
    """A point `r` from the axis at `az` degrees round the rocket from its own +X (a booster's plane), at height z."""
    a = TURN + math.radians(az)
    return (r * math.cos(a), r * math.sin(a), z)


def materials() -> dict:
    m = material
    return {
        "concrete": m("concrete", (0.5, 0.48, 0.43), 0.0, 0.9),
        "lining": m("concrete-lining", (0.44, 0.42, 0.38), 0.0, 0.95),
        "scorch": m("pit-floor-scorched", (0.16, 0.145, 0.13), 0.0, 1.0),
        "earth": m("earth-clay", (0.47, 0.4, 0.3), 0.0, 1.0),
        "ballast": m("ballast-gravel", (0.3, 0.28, 0.25), 0.0, 1.0),
        "tie": m("timber-tie", (0.12, 0.09, 0.07), 0.0, 0.9),
        "rail": m("steel-rail", (0.30, 0.25, 0.21), 1.0, 0.55),
        # the launch system, the erector and the tank cars were khaki green in the film of April 1961 (site-1.md)
        "green": m("paint-structure-khaki", (0.2, 0.24, 0.15), 0.1, 0.6),
        "dark": m("paint-structure-dark", (0.09, 0.1, 0.085), 0.2, 0.65),
        "deck": m("steel-deck", (0.24, 0.25, 0.23), 0.6, 0.65),
        "galv": m("galvanised-steel", (0.5, 0.51, 0.52), 0.9, 0.45),
        "weight": m("iron-counterweight", (0.11, 0.115, 0.11), 0.4, 0.75),
        "lamp": m("lamp", (0.9, 0.9, 0.85), 0.0, 0.3, emission=(1.0, 0.95, 0.8), emission_strength=0.6),
        "cable": m("cable", (0.03, 0.03, 0.03), 0.0, 0.7),
        # the road down into the pit: what it was made of is not recorded (estimated: rolled gravel)
        "road": m("road-gravel", (0.43, 0.4, 0.35), 0.0, 1.0),
        # a shut door and its frame, and the dark of what is not modelled behind an opening (as the place's: place.py)
        "blast": m("steel-door-green", (0.11, 0.14, 0.1), 0.5, 0.6),
        "frame": m("steel-window-frame", (0.07, 0.075, 0.075), 0.6, 0.55),
        "void": m("window-void", (0.02, 0.022, 0.025), 0.0, 0.6),
        # what the photographs and the film of 12 April 1961 show on the deck and beside the rocket (deck_fittings.py,
        # tank_cars.py, erector.py): the joints between slabs, a wire railing, a pale grey filler with black stencils,
        # red-painted fittings on the erector's wagon. The tones are read off a colour photograph and the film, and cleaned.
        "joint": m("concrete-joint", (0.07, 0.07, 0.065), 0.0, 1.0),
        "wire": m("steel-wire", (0.17, 0.15, 0.13), 0.8, 0.6),
        "filler": m("paint-filler-grey", (0.6, 0.61, 0.6), 0.1, 0.6),
        "stencil": m("paint-stencil-black", (0.03, 0.03, 0.032), 0.0, 0.7),
        "red": m("paint-fitting-red", (0.55, 0.07, 0.05), 0.1, 0.55),
    }

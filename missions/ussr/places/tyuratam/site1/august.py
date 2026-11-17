"""The people on the pad on the morning of 6 August 1961, as the film of the morning has them, in summer dress. The figures
are ../../crew/ground_party.py's, each jointed (`Walkers`) so that the viewer walks him off the pad, or onto it, on the
clock (the flight's `going`); this module only says who stood where, in what, and in which group.

Sources (../site-1.md, "The people of 6 August 1961"):
  The film «Снова к звёздам» (Моснаучфильм, 1961; the copy read is 960 px, mirrored and faded: its frames are flipped
    back). At 21:45, from the erector's head looking down to the south-west as the bus stops: some hundred to 130 people
    in view, a dense body south of the bus, a line across the apron's far end, a group nearer the erector, two or three
    at the door. At 21:47 to 21:56 at eye height: officers in khaki summer shirts with ties and air force caps, one in
    dark glasses, one in a tunic with shoulder boards. At 21:56 to 22:09, from the erector looking west: some
    twenty-five walk east between the tracks with Titov, six or eight more about them. At 22:13 to 22:24: some thirty to
    thirty-five stand 2 to 12 m west and south-west of the stair's foot, faces up. Nearly all in white shirts.
  Titov (1973): «Нас окружили десятки людей, все желали успеха». Against it, TASS's «Пустынна стартовая площадка»,
    written from the observation point 1.5 km off: the film is taken over it.

Every count is read off the 960 px frames and is estimated; so is where each man stood within his group, his dress
among the kinds the film shows, his stature and his stance. Where each group stood is the film's, to some five metres
(its views are from the erector, with the bus, the tracks and the low building for a scale).

Nodes: Crowd (in files south of the bus), CrowdWest (a line across the apron's far, western end) and
Escort (round the bus's door, who walk with him to the stair and stand at its foot): each with its skeleton
`<name>_People`, a node `<name>_Person_<n>` a man.
"""

from __future__ import annotations

import math
import random

import ground_party as gp
from ground_party import Person

from .site import GROUND, Parts, stood

BUS_DOOR = (-46.4, -16.45)  # the bus's door, parked (road_vehicles.py)
LANDING = (-11.3, -3.25)  # the head of the erector's stair (erector.py), where he turned and spoke
APART = 0.95  # the least room between two men standing, middle to middle, m (estimated: elbow room, no more)


def _to(x: float, y: float, tx: float, ty: float) -> float:
    """The heading from one place to another, degrees anticlockwise from east."""
    return math.degrees(math.atan2(ty - y, tx - x))


def _dress(kind: str, rng: random.Random) -> gp.Dress:
    """One of the kinds of dress the film shows, by name."""
    hair = rng.choices(("hair", "fair", "grey-hair"), (7, 2, 1))[0]
    if kind == "officer":
        return gp.summer_officer()
    if kind == "officer-glasses":
        return gp.summer_officer(glasses=True)
    if kind == "tunic":
        return gp.summer_tunic()
    if kind == "jacket":
        return gp.jacket(rng.choice(("black", "grey")), hat=None)
    if kind == "check":
        return gp.summer_shirt("shirt-check", hair=hair)
    return gp.summer_shirt({"white": "shirt-white", "cream": "shirt-cream", "blue": "shirt-blue"}[kind], hair=hair)


def _people(kinds: dict[str, int], rng: random.Random, arms: dict[tuple[str, str], int]) -> list[Person]:
    """So many of each kind of dress, shuffled, each man of his own stature and build and standing as `arms` deals out."""
    dresses = [kind for kind, n in kinds.items() for _ in range(n)]
    rng.shuffle(dresses)
    out = []
    for kind in dresses:
        stature = min(184.0, max(162.0, rng.gauss(172.0, 5.0)))
        out.append(
            # (no stouter than 1.05: a stouter man's thighs meet, and under a shirt nothing hides where they do)
            Person(
                _dress(kind, rng),
                round(stature, 1),
                min(1.05, round(rng.uniform(0.93, 1.12), 2)),
                arms=rng.choices(list(arms), list(arms.values()))[0],
            )
        )
    return out


def crowd() -> list:
    """The body drawn up south of the bus and back along it: four rows, some fifty men, facing it (the film, 21:45)."""
    rng = random.Random(6081961)
    who = _people(
        {"white": 28, "cream": 5, "blue": 5, "officer": 4, "jacket": 7, "tunic": 3},
        rng,
        {("down", "down"): 1},
    )
    out = []
    rows = (-18.0, -19.3, -20.6, -21.9)
    for i, p in enumerate(who):
        row, k = divmod(i, 13)
        x = -60.8 + k * 1.15 + rng.uniform(-0.05, 0.05) + (0.45 if row % 2 else 0.0)
        y = rows[row] + rng.uniform(-0.08, 0.08)
        out.append((p, x, y, _to(x, y, -50.0, -14.0) + rng.uniform(-6.0, 6.0)))
    return out


def crowd_west() -> list:
    """A line across the apron at its far, western end, beyond the body: eighteen (the film, 21:45)."""
    rng = random.Random(6081962)
    who = _people(
        {"white": 11, "cream": 2, "blue": 1, "officer": 2, "jacket": 2},
        rng,
        {("down", "down"): 1},
    )
    out = []
    for p, (x, y) in zip(who, _spread(lambda: (rng.uniform(-86.0, -84.4), rng.uniform(-19.5, 4.0)), len(who), rng)):
        out.append((p, x, y, _to(x, y, *BUS_DOOR) + rng.uniform(-12.0, 12.0)))
    return out


def escort() -> list:
    """Round the bus's door as he gets down: the officers who said goodbye (eight in khaki summer shirts, one of them in dark
    glasses, one in a tunic), and those who walk with him to the stair; thirty-four (the film, 21:45 to 22:24)."""
    rng = random.Random(6081963)
    who = _people(
        {"officer": 7, "officer-glasses": 1, "tunic": 1, "jacket": 4, "check": 1, "white": 14, "cream": 3, "blue": 3},
        rng,
        {("down", "down"): 1},
    )

    # a loose crowd east of the door, toward the erector: from south-east of the door round to the bus's front, and not
    # into the low building's north wall
    def spot() -> tuple[float, float]:
        a = math.radians(rng.uniform(-35.0, 75.0))
        r = rng.uniform(2.3, 6.4)
        return BUS_DOOR[0] + 1.0 + 1.6 * r * math.cos(a), BUS_DOOR[1] - 0.6 + r * math.sin(a)

    out = []
    for p, (x, y) in zip(who, _spread(spot, len(who), rng)):
        out.append((p, x, y, _to(x, y, BUS_DOOR[0] + 0.5, BUS_DOOR[1] - 1.0) + rng.uniform(-8.0, 8.0)))
    return out


def _spread(spot, n: int, rng: random.Random, apart: float = APART) -> list[tuple[float, float]]:
    """`n` places drawn from `spot`, none nearer another than `apart`: a crowd stands so (and two men built closer would
    stand in each other)."""
    out: list[tuple[float, float]] = []
    while len(out) < n:
        x, y = spot()
        if all(math.hypot(x - a, y - b) >= apart for a, b in out):
            out.append((x, y))
    return out


GROUPS = {
    "Crowd": (crowd, "in files south of the bus"),
    "CrowdWest": (crowd_west, "across the apron's far end"),
    "Escort": (escort, "round the bus's door, then at the stair's foot"),
}
ABOUT = {
    "Crowd": (
        "The crowd at the bus",
        "As the bus stopped the film, looking down from the erector, has a dense body of some fifty to sixty drawn up south of it, "
        "nearly all in white shirtsleeves. Fifty-two stand here; who they were, and each man's place in the body, are estimated.",
    ),
    "CrowdWest": (
        "Across the apron's far end",
        "Beyond the body the film has a line of twenty or so across the apron at its far, western end. Eighteen stand here.",
    ),
    "Escort": (
        "With him to the stair",
        "The officers who said goodbye at the bus, in khaki summer shirts and air force caps, and those who walked with Titov "
        "between the tracks to the erector's stair and stood at its foot, faces up, as he spoke from its head: some forty in the film.",
    ),
}


def build(parts: Parts) -> None:
    if not stood(
        "The people of 6 August: the crowd at the bus, along the apron, with the pilot to the stair",
        since="1961-08-06",
        until="1961-08-06",
        confidence="documented",
        source="the film of the morning («Снова к звёздам», Моснаучфильм 1961, 21:45 to 22:24); Titov (1973). That they were there, "
        "in summer dress: documented. How many and where each stood: estimated off 960 px frames",
    ):
        return
    cloth = gp.materials()
    total = 0
    memory = 0
    for name, (people, _) in GROUPS.items():
        label, about = ABOUT[name]
        walkers = gp.Walkers(name)
        spots = []
        for p, x, y, heading in people():
            walkers.stand(p, (x, y, GROUND), heading)
            spots.append((x, y))
        cx, cy = sum(x for x, _ in spots) / len(spots), sum(y for _, y in spots) / len(spots)
        origin = (cx, cy, 0.0)
        node = parts.node(name, None, origin, label=label, about=about)
        rig = walkers.build(f"{name}_People", node, origin, cloth, parent_at=origin)
        # (what the GPU holds for it: each vertex's place, normal, texture place, four joints and four weights, and the
        # triangles' corners; the export splits a vertex at a crease, so this is the least of it)
        verts = sum(len(o.data.vertices) for o in rig.children if o.type == "MESH")
        memory += verts * (12 + 12 + 8 + 8 + 16) + walkers.triangles * 3 * 4
        total += walkers.triangles
        print(f"  {name}: {walkers.people} people, {walkers.people} jointed, {walkers.triangles:,} triangles, middle at ({cx:.2f}, {cy:.2f})")
    print(f"  people of 6 August: {total:,} triangles, about {memory / 2**20:.1f} MiB on the GPU at this level")


def summary() -> str:
    return "the people of 6 August: " + ", ".join(f"{len(people())} {where}" for people, where in GROUPS.values())

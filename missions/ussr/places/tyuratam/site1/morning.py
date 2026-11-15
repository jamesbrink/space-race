"""The people on the pad on the morning of 12 April 1961, where the film, the photographs and the launch roster have
them. The figures are ../../crew/ground_party.py's; this module only says who stood where, in what, and in which group.

Sources (../site-1.md, "The morning's people and vehicles"):
  The film «Первый рейс к звёздам» (ЦСДФ, 1961). At 43:26, from the erector's head, the bus has just stopped: some
    twenty-five figures stand on the concrete in loose groups, four of them in a knot some ten metres ahead of the bus.
    At 43:33 and 43:42, at eye height: officers in tunics and peaked caps, no greatcoats; a general in red-striped
    trousers; men in navy hooded anoraks with red armbands; a doctor in a white coat; a cameraman walking backward
    with a hand-held camera. At 44:05 a dozen people wave from the stair's foot, two more from the wagon's deck.
  A colour photograph of Korolev and Marshal Moskalenko with Gagarin (the marshal's tunic and red-banded cap, the
    chief designer's dark overcoat and velour hat); one of the party walking to the stair (a doctor in white, a
    general, a man in a grey jacket and flat cap with a red armband; two men in the grey filler's doorway).
  Golovanov, «Королёв: факты и мифы», p. 645: the State Commission "standing in a tight group" some ten metres from
    the bus's door; the pilot reported to its chairman, Rudnev.
  The launch roster of 10 April 1961 («Первый пилотируемый полёт», 2011, doc 104): who left at which readiness, and
    for where. Most at one hour or thirty minutes, to 20 km; the upper-belt and truss crews at thirty minutes, to the
    bunker; the erector's crew at thirty minutes, to the bend of the road.

Where each group stands is measured off the film's frame against the bus (good to two or three metres); who is in a
group, beyond the few the sources name, and every stance, is estimated. A group is one node, and a part of the pad:
the flight's data says when it was there. They do not walk: a group is there until it left, and then is not.

Nodes: StateCommission, SendOff, StairParty (built out of sight, 90 m under where it stands: it is there for seven
minutes), PadCrew, TrussCrew, HatchCrew, each with its people on a node of their own under it (<name>_People), which
is what the clock moves; and Erector_Crew under Erector, on the wagon's deck.
"""

from __future__ import annotations

import math

import ground_party as gp
from ground_party import Person

from . import erector, service_trusses, tank_cars
from .deck import NORTH
from .site import GROUND, Parts, stood

HIDDEN = -90.0  # where a group is built when it is not there at the slider's start, m under where it stands
BUS_DOOR = (-46.4, -16.45)  # the bus's door, parked (road_vehicles.py)
STAIR_FOOT = (-15.9, -3.25)  # the foot of the erector's stair, on its south side (erector.py)
LANDING = (-11.3, -3.25, erector.LANDING_Z)


def _to(x: float, y: float, tx: float, ty: float) -> float:
    """The heading from one place to another, degrees anticlockwise from east."""
    return math.degrees(math.atan2(ty - y, tx - x))


def _officer(band: str = "black", **kw) -> Person:
    return Person(gp.officer(band), **kw)


def _worker(**kw) -> Person:
    dress = gp.worker(hat=kw.pop("hat", None), hair=kw.pop("hair", "hair"))
    return Person(dress, **kw)


def commission() -> list:
    """The knot ahead of the bus: the State Commission's chairman and those who stood with him to take the report."""
    cx, cy = -36.3, -17.3
    face = _to(cx, cy, *BUS_DOOR)
    return [
        # Rudnev, the chairman, a civilian (his dress is not recorded: a dark coat and hat, as the film's dark figures)
        (Person(gp.overcoat(coat="grey", felt="grey"), 174, 1.08, arms=("down", "down"), who="Rudnev"), cx + 0.1, cy, face),
        # Marshal Moskalenko, as the colour photograph has him
        (Person(gp.marshal(), 172, 1.05, arms=("down", "down"), who="Moskalenko"), cx - 0.1, cy - 0.95, face + 6),
        # Korolev: a dark overcoat, a black velour hat (Golovanov; the colour photograph)
        (Person(gp.overcoat(), 170, 1.15, arms=("back", "back"), who="Korolev"), cx - 0.2, cy + 0.95, face - 8),
        # Kamanin, a general of the air force: the film has a general in red-striped trousers at the pilot's side
        (Person(gp.general(), 176, 1.0, arms=("down", "down"), turn=10, who="Kamanin"), cx + 0.9, cy - 1.7, face + 10),
        # Voskresensky, Korolev's deputy for testing (a beret, by every account of him: estimated for the day)
        (Person(gp.jacket("black", hat="beret"), 176, 0.98, arms=("pocket", "down"), who="Voskresensky"), cx + 0.8, cy + 1.6, face - 12),
        (Person(gp.raincoat(), 172, 1.05, arms=("back", "back"), turn=-15), cx + 1.1, cy - 0.3, face),
    ]


def send_off() -> list:
    """Everyone else on the concrete as the bus stopped, in the film's groups."""
    door = BUS_DOOR
    out = []
    # a row of five well south-west of the bus (the film's upper left): officers and two civilians, watching
    row = [(-56.8, -27.75), (-57.6, -27.5), (-58.4, -27.2), (-59.2, -26.95), (-60.0, -26.7)]
    who = [
        _officer(stature=178, arms=("back", "back")),
        Person(gp.overcoat(hat="flat", coat="black", felt="grey"), 170, 1.1, arms=("pocket", "pocket")),
        _officer("blue", stature=172, build=1.05, arms=("down", "down")),
        _officer(stature=175, arms=("down", "down"), turn=-12),
        Person(gp.overcoat(), 168, 1.05, arms=("back", "back"), turn=10),
    ]
    out += [(p, x, y, _to(x, y, *door) + d) for p, (x, y), d in zip(who, row, (0, 5, -4, 3, -6))]
    # a looser group of seven nearer the bus: the launch crew's men in their anoraks, officers among them
    group = [(-52.2, -24.2), (-53.0, -23.6), (-53.9, -24.3), (-54.6, -25.2), (-53.3, -25.4), (-52.3, -25.9), (-54.2, -26.3)]
    who = [
        _worker(stature=180, build=0.95, arms=("pocket", "pocket"), hair="fair"),
        _worker(stature=172, arms=("down", "down"), hat="beret"),
        _officer(stature=174, arms=("back", "back"), turn=15),
        _worker(stature=176, arms=("down", "hip")),
        Person(gp.jacket("grey", armband="red"), 174, 1.05, arms=("pocket", "down")),
        _officer("blue", stature=170, arms=("down", "down")),
        _worker(stature=168, build=1.05, arms=("back", "back"), hat="flat", turn=-10),
    ]
    out += [(p, x, y, _to(x, y, *door) + d) for p, (x, y), d in zip(who, group, (0, -6, 8, 0, 5, -8, 4))]
    # at the bus's door: the doctor in white who handed the pilot down, two officers, a cameraman facing the door
    out += [
        (
            Person(gp.medic(), 166, 0.95, arms=("front", "front")),
            door[0] - 1.3,
            door[1] - 0.9,
            _to(door[0] - 1.3, door[1] - 0.9, door[0], door[1] - 1.8),
        ),
        (_officer(stature=176, arms=("down", "salute")), door[0] + 1.4, door[1] - 1.95, _to(door[0] + 1.4, door[1] - 1.95, door[0], door[1] - 1.2)),
        (
            _officer("blue", stature=172, arms=("down", "down"), turn=-10),
            door[0] + 2.8,
            door[1] + 0.85,
            _to(door[0] + 2.8, door[1] + 0.85, door[0], door[1] - 1.2),
        ),
        (_worker(stature=174, arms=("camera", "camera"), carries="camera"), door[0] + 0.4, door[1] - 3.4, _to(door[0] + 0.4, door[1] - 3.4, *door)),
    ]
    # by the saloon car and the corner of the low building: three
    out += [
        (Person(gp.overcoat(hat="flat", coat="black", felt="black"), 172, 1.0, arms=("pocket", "pocket")), -44.6, -19.4, _to(-44.6, -19.4, *door)),
        (_officer(stature=178, arms=("back", "back")), -45.0, -26.1, 80.0),
        (_officer(stature=171, build=1.08, arms=("down", "down"), turn=20), -44.3, -24.9, 100.0),
    ]
    # one beside the bus, one far out toward the road, one north of the tracks by the truck
    out += [
        (_worker(stature=175, arms=("down", "down")), -52.9, -18.7, 20.0),
        (_officer(stature=174, arms=("back", "back")), -64.7, -22.3, 15.0),
        (_worker(stature=178, arms=("pocket", "pocket"), hat="flat"), -37.7, -6.6, -150.0),
    ]
    return out


def stair_party() -> list:
    """Those who saw the pilot to the stair and waved as he turned on the landing (the film at 44:05; the photograph):
    a dozen backs, berets and peaked caps among them, a white coat; arms up."""
    lx, ly, _ = LANDING
    spots = [
        (-18.6, -8.3, "wave"), (-17.5, -9.0, "down"), (-16.4, -8.6, "wave"), (-15.3, -9.2, "cap"), (-14.3, -8.5, "wave"), (-13.2, -9.0, "down"),
        (-17.9, -7.2, "wave"), (-16.0, -7.3, "down"), (-14.9, -7.4, "wave"), (-13.6, -7.5, "wave"), (-12.5, -8.0, "down"),
    ]  # fmt: skip
    who = [
        Person(gp.overcoat(), 170, 1.15, who="Korolev"),
        Person(gp.marshal(), 172, 1.05, who="Moskalenko"),
        Person(gp.general(), 176, 1.0, who="Kamanin"),
        _worker(stature=180, build=0.95, hair="fair"),
        Person(gp.medic(), 166, 0.95),
        _officer(stature=174),
        Person(gp.jacket("black", hat="beret"), 176, 0.98, who="Voskresensky"),
        _officer("blue", stature=170),
        _worker(stature=172, hat="beret"),
        Person(gp.jacket("grey", armband="red"), 174, 1.05),
        _worker(stature=176, hat="flat"),
    ]
    out = []
    for p, (x, y, right) in zip(who, spots):
        p = gp.vary(p, arms=("down", right), nod=-14.0)
        out.append((p, x, y, _to(x, y, lx, ly)))
    return out


def pad_crew() -> list:
    """The launch crew at work on the deck through the first hour: two pairs by the launch system, a man in the grey
    filler's doorway and one below it (the colour photograph has two men in that doorway)."""
    car_y = NORTH[0] - tank_cars.WIDTH / 2
    door_x = tank_cars.CARS[0][4]
    return [
        (_worker(stature=176, arms=("down", "point"), nod=-12.0), -11.2, -7.2, _to(-11.2, -7.2, 0, 0)),
        (_worker(stature=172, arms=("hip", "down"), hat="beret", nod=-10.0), -10.2, -8.0, _to(-10.2, -8.0, 0, 0)),
        (_officer(stature=175, arms=("back", "back")), -15.0, 6.0, _to(-15.0, 6.0, -5, 2)),
        (_worker(stature=170, build=1.05, arms=("pocket", "pocket"), hair="fair"), -14.0, 6.9, _to(-14.0, 6.9, -15, 6)),
        (_worker(stature=174, arms=("hip", "down")), (door_x, car_y + 0.4, tank_cars.FLOOR + 0.02), None, -90.0),
        (_worker(stature=178, arms=("back", "back"), hat="flat", nod=-8.0), door_x - 1.5, car_y - 1.1, 40.0),
    ]


def truss_crew() -> list:
    """The upper-belt and truss crews on the north service truss's platforms, until thirty minutes: three men."""
    out = []
    for z, r, angle, arms in (
        (service_trusses.UPPER_Z, 3.2, 62.0, ("down", "down")),
        (service_trusses.UPPER_Z, 3.25, 128.0, ("hip", "down")),
        (service_trusses.MIDDLE_Z, 3.2, 96.0, ("down", "point")),
    ):
        a = math.radians(angle)
        x, y = r * math.cos(a), r * math.sin(a)
        out.append((_worker(stature=174, arms=arms), (x, y, z), None, _to(x, y, 0, 0)))
    return out


def hatch_crew() -> list:
    """The men at the hatch on the erector's upper platform: the lead designer and a fitter (Ivanovsky's account)."""
    z = erector.BRIDGE_Z
    return [
        (_worker(stature=176, arms=("down", "point"), who="Ivanovsky"), (-1.75, 1.2, z), None, -60.0),
        (_worker(stature=172, arms=("down", "down"), hat="beret"), (-2.85, -0.95, z), None, 20.0),
    ]


def erector_crew() -> list:
    """Two of the erector's crew on its wagon's deck, at the south rail (the colour photograph: men at a rail there)."""
    z = erector.DECK_Z
    return [
        (_officer(stature=174, arms=("down", "down")), (-15.6, -1.05, z), None, -80.0),
        (_worker(stature=178, arms=("down", "wave"), hat="beret"), (-16.7, -1.05, z), None, -70.0),
    ]


GROUPS = {
    "StateCommission": (commission, GROUND, "the knot ahead of the bus"),
    "SendOff": (send_off, GROUND, "on the concrete as the bus stopped"),
    "StairParty": (stair_party, 0.0, "at the stair's foot as the pilot waved"),
    "PadCrew": (pad_crew, 0.0, "at work on the deck"),
    "TrussCrew": (truss_crew, 0.0, "on the north service truss"),
    "HatchCrew": (hatch_crew, 0.0, "at the hatch"),
    "Erector_Crew": (erector_crew, 0.0, "on the wagon's deck"),
}
ABOUT = {
    "StateCommission": (
        "The State Commission's knot",
        "Some ten metres ahead of the bus's door stood the State Commission, 'in a tight group' (Golovanov): the pilot walked to it "
        "and reported to its chairman, Rudnev. Korolev in a dark overcoat and a black velour hat and Marshal Moskalenko in service "
        "dress are from a colour photograph; who else stood with them, and how, is estimated.",
    ),
    "SendOff": (
        "The send-off",
        "The film of the morning, looking down from the erector as the bus stopped, has some twenty-five figures on the concrete in "
        "loose groups: officers in tunics and peaked caps, the launch crew in navy anoraks with red armbands, a doctor in white. "
        "Their places are measured off that frame; who each was is not recorded.",
    ),
    "StairParty": (
        "At the stair's foot",
        "As Gagarin turned on the landing and waved, a dozen people at the stair's foot waved back: the film and a photograph show "
        "their backs, berets and peaked caps, a white coat. Korolev, Moskalenko and Kamanin had walked him there.",
    ),
    "PadCrew": (
        "The launch crew",
        "Men of the launch crew on the deck in the hour after the pilot went up. The roster sent most of the 688 on the pad away at "
        "one hour's readiness; where each stood before that is not recorded, but for two in the grey filler's doorway (a photograph).",
    ),
    "TrussCrew": (
        "On the service truss",
        "The upper-belt and truss crews worked from the service trusses' platforms and left at thirty minutes' readiness for the "
        "bunker (the launch roster). Three men stand for them; where they stood is estimated.",
    ),
    "HatchCrew": (
        "At the hatch",
        "Ivanovsky, the spacecraft's lead designer, rode up with the pilot, saw him into his seat and bolted the hatch with the "
        "fitters; they took the lift down after the seal was checked at 08:25.",
    ),
    "Erector_Crew": (
        "The erector's crew",
        "Two of the erector's crew at the wagon's rail, as a colour photograph of the morning has men standing there. They left "
        "at thirty minutes' readiness for the bend of the road (the launch roster).",
    ),
}


def build(parts: Parts) -> None:
    if not stood(
        "The people on the pad: the State Commission, the send-off, the launch crews",
        since="1961-04-12",
        until="1961-04-12",
        confidence="documented",
        source="the film of the morning («Первый рейс к звёздам», ЦСДФ 1961, 43:26 to 44:05); two colour photographs; Golovanov p. 645; "
        "the launch roster of 10 April 1961 («Первый пилотируемый полёт», 2011, doc 104). That they were there, in what, and when they "
        "left: documented. Where each stood: measured off the film to two or three metres, or estimated",
    ):
        return
    cloth = gp.materials()
    total = 0
    for name, (people, ground, _) in GROUPS.items():
        parent = "Erector" if name == "Erector_Crew" else None
        if parent and parent not in parts.nodes:
            continue
        label, about = ABOUT[name]
        down = HIDDEN if name == "StairParty" else 0.0
        party = gp.Party()
        spots = []
        for p, a, b, heading in people():
            x, y, z = (*a,) if b is None else (a, b, ground)
            party.stand(p, (x, y, z + down), heading)
            spots.append((x, y))
        cx, cy = sum(x for x, _ in spots) / len(spots), sum(y for _, y in spots) / len(spots)
        origin = (cx, cy, down)
        node = parts.node(name, parent, origin, label=label, about=about)
        if parent is None:
            # (a part of the pad stays where it is: what comes and goes on the clock is a node of its own under it)
            node = parts.node(f"{name}_People", name, origin)
        party.build(node, origin, cloth)
        total += party.triangles
        print(f"  {name}: {party.people} people, {party.triangles:,} triangles")
    print(f"  people: {total:,} triangles")


def summary() -> str:
    return "the morning's people: " + ", ".join(f"{len(people())} {where}" for people, _, where in GROUPS.values())

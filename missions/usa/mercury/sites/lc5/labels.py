"""What each thing at Launch Complex 5/6 is called when it is pointed at, and a sentence or two on
what it was for and how sure we are of it: the custom properties `label` and `about`, which the
viewer shows on hover and on a card when clicked. One table for the pad and the place, matched
against node names; a node that already says what it is (a car's `vehicle`, a searchlight's own
label) keeps what it has. The confidences restate ../lc-5.md, which is where the sources are.
"""

from __future__ import annotations

import re

import sitelib

from .site import Parts

DOOR = ("Door", "It opens and shuts on foot. Where the doors were, and their fittings, are estimated.")
SHUT = ("Door, kept shut", "What this building was for and what stood in it are not recorded, so its inside is not drawn and its door stays shut.")

TABLE: list[tuple[str, str, str]] = [
    # ---- the pad
    (
        "Hardstand",
        "Pad 5's hardstand",
        "Two hundred feet of concrete slabs with four rails let into it for the service structure. Its size and place "
        "are derived from OpenStreetMap and NASA's site plan; the joints, burns and rails' section are estimated.",
    ),
    (
        "LaunchPedestal",
        "Launcher",
        "The Redstone launch ring on four legs over a four-sided flame deflector, with the two tail plugs under fin II "
        "and the ground cables. The vehicle stood on it under its own weight. Its size is estimated from photographs.",
    ),
    (
        "UmbilicalMast",
        "Capsule cable mast",
        "Carried the capsule's umbilical until T-35 s, when a bungee pulled the released mast over. It is hinged on the launcher's "
        "table and stands close against the vehicle: its place is derived from photographs, its form and height estimated.",
    ),
    (
        "BoosterMast",
        "Booster cable mast",
        "Carried a plug and the instrument compartment's cooling package to the booster until the boom drop at about T-14 s. It is "
        "hinged on the launcher's table: its place is derived from photographs, its form and height estimated.",
    ),
    (
        "ServiceStructure",
        "Service structure",
        "The Noble Co. A-frame gantry that stood round the rocket until T-55 minutes, then rolled back on its rails. "
        "Its height is derived from published figures; most other sizes are scaled off photographs.",
    ),
    (
        "ServiceStructure_Platform3_(Left|Right)",
        "White room, {0} half",
        "The enclosed, air-conditioned room on level 3 round the capsule, built February to May 1961; Shepard went in "
        "through it. Its colour and size are estimated.",
    ),
    (
        r"ServiceStructure_Platform(\d)_(Left|Right)",
        "Work platform, level {0}, {1} half",
        "Each level's platform was in two halves that parted so the structure could roll back. That they parted is "
        "documented; how far, and that they slid, is estimated.",
    ),
    (
        "ServiceStructure_Lift",
        "Lift car",
        "An open mesh cage that ran up the leg to the working levels; Shepard rode it at 05:15. That there was a lift "
        "is documented; where its guides ran and where it stopped are estimated.",
    ),
    (
        "CherryPicker",
        "Mobile aerial tower (cherry picker)",
        "A truck-mounted tower that held a cab at the capsule's hatch from T-55 minutes, the pilot's way out until the "
        "last minutes. Its reach (125 ft) is documented; its make and lengths are estimated.",
    ),
    (
        "CherryPicker_Mast",
        "Cherry picker's mast",
        "The lattice mast, raised by two rams. Its length is chosen to reproduce the liftoff photographs: estimated.",
    ),
    (
        "CherryPicker_Jib",
        "Cherry picker's jib",
        "Lowered the cab 'away and down' by remote control in the last minutes. The lowering is documented; the jib's length is estimated.",
    ),
    ("CherryPicker_Cab", "Cherry picker's cab", "The cab held at the hatch, kept level as the jib moved. Its form is estimated."),
    (r"CherryPicker_Outrigger_(\d)", "Outrigger {0}", "One of four legs that steadied the truck. Their form and how they folded are estimated."),
    (
        "CherryPicker_Controls",
        "Tower controls",
        "The station at the rear of the truck the tower could be worked from (documented); the number of levers and what each worked are estimated.",
    ),
    (
        r"CherryPicker_Controls_(\w+)",
        "Control lever: {0}",
        "One of the tower's levers at the rear of the truck. Which lever worked what is not recorded: estimated.",
    ),
    ("GroundEquipment", "Ground equipment", "What stood on the pad round the launcher. Their positions are read off photographs and are estimated."),
    (
        "GroundEquipment_LoxTrailer",
        "LOX topping trailer",
        "Kept the booster's liquid-oxygen tank topped up until a minute before launch (documented). The long white tank on a "
        "trailer in the liftoff photographs is taken for it; its size is scaled off them and its fittings are estimated.",
    ),
    (
        r"GroundEquipment_(Lox|Tank)Screen",
        "Blast screen",
        "A screen of white panels between the launcher and the tank behind it, open to the sky: in every liftoff photograph. "
        "Its size is scaled off them; its posts and struts are estimated.",
    ),
    (
        "GroundEquipment_TankCart",
        "Tank on its cart",
        "An orange tank lying behind the lower screen, in the liftoff photographs. What it held is not recorded; its cart and "
        "fittings are estimated.",
    ),
    (
        "GroundEquipment_Sandbags",
        "Sandbags",
        "A wall of sandbags on the grass beyond the slab, in a photograph of the ignition. What it sheltered is not recorded.",
    ),
    (
        "GroundEquipment_ChevronDrum",
        "Chevron drum",
        "A drum painted in orange and black chevrons near the launcher, seen in the liftoff photographs. What it was for is not known.",
    ),
    (
        r"GroundEquipment_Danger(\d)",
        "DANGER board",
        "A warning board on a stand near the cherry picker. That boards stood there is from photographs; their wording beyond DANGER is not known.",
    ),
    (
        r"GroundEquipment_Camera(\d)",
        "Tripod camera",
        "One of the fixed engineering cameras that filmed the launch (twenty, documented). This is a 35 mm camera of "
        "the kind; type and places are estimated.",
    ),
    (
        "GroundEquipment_Shower",
        "Shower cart",
        "The emergency shower on its cart, photographed at the pad's edge that week (documented). It is wheeled off up "
        "the road before the rollback: that it left, and when, are estimated.",
    ),
    ("GroundEquipment_Case", "Packing case", "A case beside the shower in a NASA photograph of MR-3; carried off with it (estimated)."),
    ("GroundEquipment_Barricade", "Barricade", "A striped barricade at the pad's corner, from a photograph of July 1961; assumed for May."),
    (
        "GroundEquipment_Trailer",
        "Trailer, NASA SP-No 1",
        "A white trailer lettered NASA SP-No 1 beside the structure's base (documented, S61-03158), here fitted out as "
        "a test trailer of the period, and towed away before the rollback (estimated).",
    ),
    ("GroundEquipment_TrailerSteps", "Trailer steps", "The trailer's door steps, folded up before it is towed. Estimated."),
    (
        "GroundEquipment_TransferVan",
        "Transfer van, NASA TV No 1",
        "The van semi-trailer that brought the pilot from Hangar S, suited, his sensors on a recorder and his briefing given "
        "on the way; he stepped down from it beside the structure at 03:55 on 21 July. Its lettering, its white tractor and "
        "where it stood are from photographs of 6 and 19 July; its size is estimated, and it is not gone into: its "
        "inside is not recorded. The count moves it to its launch position at T-80: where that was is not known.",
    ),
    ("GroundEquipment_TransferVanSteps", "Van steps", "The van's door steps, folded up before it is moved. Estimated."),
    (
        r"GroundEquipment_Hut(\d)",
        "Hut {0}",
        "A hut on skids at the pad's edge, from a photograph of July 1961 (assumed for May), dragged off by a pickup "
        "before the rollback (estimated).",
    ),
    (
        r"GroundEquipment_Tow(\d)",
        "Pickup towing hut {0}",
        "A half-ton pickup chained to the hut to drag it off. Nothing records how the huts were moved: estimated.",
    ),
    (
        "GroundEquipment_Tractor",
        "Tractor unit",
        "The truck that tows the trailer SP-No 1 away. No photograph shows the trailer's tractor that day: estimated.",
    ),
    ("CameraTowers", "Camera towers", "Lattice towers carrying engineering cameras above the pad. Their heights and places are estimated."),
    (
        r"CameraTowers_Tower(\d)",
        "Camera tower {0}",
        "A lattice tower with a camera on its top deck and a ladder up its face. Height and place are estimated.",
    ),
    (
        "Floodlights",
        "Floodlights",
        "Timber poles round the pad's edge with floodlights on crossarms; the count ran through the night. Their form "
        "is from July 1961 photographs; places are estimated.",
    ),
    (
        r"Floodlights_Pole(\d)",
        "Floodlight pole",
        "A creosoted timber pole with three floodlights on a crossarm, aimed at the vehicle. Height and place are estimated.",
    ),
    # ---- the place
    (
        "Blockhouse",
        None,
        "The arrow-shaped, domed concrete bunker the count was run from, its point 305 ft from each pad. Its plan is "
        "derived from OpenStreetMap; walls and glass are documented of its twin at Complex 26; the rest is estimated.",
    ),
    (
        "ReadyRoom",
        None,
        "The ready rooms, kitchen and office in a concrete-block building beside the blockhouse (documented); its "
        "furniture is the period's kind, estimated.",
    ),
    (
        "Pad6",
        None,
        "The other pad of Complex 5/6, 520 ft up the track; it flew its last Redstone on 27 June 1961. Its plan is derived from OpenStreetMap.",
    ),
    (
        "Pad6Launcher",
        "Pad 6's launch ring",
        "A Redstone launch ring like pad 5's; the museum keeps one at pad 6. Its form is copied from pad 5's: estimated.",
    ),
    (
        "Pad6Gantry",
        None,
        "Pad 6's own square-topped gantry, documented there in 1959 and 1961; where on the track it stood that day is not recorded.",
    ),
    (
        "Track",
        "Track",
        "The four rails from pad 5 to pad 6 and beyond, and the turnout carrying both pairs away east. That they were "
        "there is documented; the rails' section and the turnout's parts are estimated.",
    ),
    (
        "Road",
        "Road between the pads",
        "The concrete road from pad 5 to pad 6, NO SMOKING painted across it. Its line is derived from OpenStreetMap; its width is estimated.",
    ),
    (
        "CableTrenches",
        "Cable trenches",
        "Covered trenches carrying the cables from each pad to its firing room. Their route is derived; widths are estimated.",
    ),
    ("Yard", "Cable racks and scaffold stair", "Seen north of pad 5 in July 1961 and assumed for May. Sizes are estimated."),
    ("Poles", "Pole line", "Timber poles along the road behind the blockhouse, from a July 1961 photograph. Places are estimated."),
    (
        "Outbuildings",
        "Outbuildings",
        "Huts, the generator building and a shed, at the places OpenStreetMap maps their survivors; heights and uses are estimated.",
    ),
    ("Vehicles", "Parked cars", "Cars at the blockhouse, chosen from a July 1961 photograph: types, not the cars, and July's not May's."),
]


# What is said instead from a date on, where the place's own record changed: (since, pattern, label, about), the first
# match for the date being built coming before the table above. A state of the place before that date is told as it
# was (the table), so a model built for an earlier flight says what it always said.
LATER: list[tuple[str, str, str, str]] = [
    (
        "1961-07",
        "ServiceStructure_Platform3_(Left|Right)",
        "White room, {0} half",
        "The enclosed, air-conditioned room on level 3 round the capsule, built February to May 1961; on 21 July Grissom "
        "went in through it at 03:58. Its colour and size are estimated.",
    ),
    (
        "1961-07",
        "ServiceStructure_Lift",
        "Lift car",
        "An open mesh cage that ran up the leg to the working levels; Grissom rode it at 03:55 on 21 July, and is "
        "photographed stepping out of it in a practice on the 7th. That there was a lift is documented; where its "
        "guides ran and where it stopped are estimated.",
    ),
    (
        "1961-07",
        "CherryPicker",
        "Mobile aerial tower (cherry picker)",
        "A truck-mounted tower that held a cab at the capsule's hatch once the structure had gone, the pilot's way out "
        "until the last minutes. Through the night's count it stood folded on its truck, as photographs taken "
        "that night show it. Its reach (125 ft) is documented; its make and lengths are estimated.",
    ),
    (
        "1961-07",
        "GroundEquipment_Shower",
        "Shower cart",
        "The emergency shower on its cart. Through the count it stood connected beside the structure's base, by the "
        "booster's tail, where photographs of 6, 19 and 21 July show it; at T-85 it was disconnected and stowed for "
        "launch (documented). Where it was stowed is taken as the pad's edge, where May's photographs have it: estimated.",
    ),
    ("1961-07", "GroundEquipment_Barricade", "Barricade", "A striped barricade at the pad's corner, from a photograph of July 1961."),
    (
        "1961-07",
        "GroundEquipment_Trailer",
        "Trailer, NASA SP-No 1",
        "A white trailer lettered NASA SP-No 1 beside the structure's base (documented, S61-03158; FHSU item 263 shows a "
        "white trailer there in July), here fitted out as a test trailer of the period. The count has a spare parts "
        "trailer moved at T-80, which SP is taken to stand for: that this is the one, and its route, are estimated.",
    ),
    (
        "1961-07",
        r"GroundEquipment_Hut(\d)",
        "Hut {0}",
        "A hut on skids at the pad's edge, from a photograph of July 1961, dragged off by a pickup before the rollback (estimated).",
    ),
    (
        "1961-07",
        "GroundEquipment_Tractor",
        "Tractor unit",
        "The truck that tows the trailer SP-No 1 away: a dark tractor of this kind is photographed coupled to it in July 1961. "
        "That it took the trailer off that morning, and its colour, are estimated.",
    ),
    ("1961-07", "Yard", "Cable racks and scaffold stair", "Seen north of pad 5 in photographs of July 1961. Sizes are estimated."),
    ("1961-07", "Vehicles", "Parked cars", "Cars at the blockhouse, chosen from a July 1961 photograph: types, not the cars."),
]


def apply(parts: Parts) -> None:
    """Give every node the table names its `label` and `about`, and every door its own."""
    as_of = sitelib.AS_OF
    table = [(pattern, label, about) for since, pattern, label, about in LATER if as_of is not None and since <= as_of] + TABLE
    for name, (obj, _) in parts.nodes.items():
        for pattern, label, about in table:
            m = re.fullmatch(pattern, name)
            if not m:
                continue
            if label and "label" not in obj and "vehicle" not in obj:
                obj["label"] = label.format(*m.groups())
            if "about" not in obj:
                obj["about"] = about
            break
        else:
            if re.search(r"Door\d*$", name) and "label" not in obj:
                obj["label"], obj["about"] = SHUT if "shut" in obj else DOOR

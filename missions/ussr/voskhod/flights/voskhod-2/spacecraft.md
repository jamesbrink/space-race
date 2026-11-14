# Voskhod 3KD No. 4, as flown on 18 and 19 March 1965

What the spacecraft in [model/vehicle.py](model/vehicle.py) is, and how far to trust it. The model
is the Voskhod's, [voskhod.py](../../vehicles/voskhod.py), built as the 3KD, and **every dimension of
it, with its confidence and basis, is in [voskhod.md](../../vehicles/voskhod.md)** (the airlock's
under "The Volga airlock"), which sends the reader to
[vostok-3ka.md](../../../vostok/vehicles/vostok-3ka.md) for what was the Vostok's. This file is what
is particular to No. 4 and to this flight.

**No. 4 was the only 3KD to carry a crew.** What is the flight's own in the model is the two men in
their couches, in the suits they wore that morning, and the pack beside Leonov.

It is built as it rode under the fairing on 11A57 No. R15000-05: the airlock folded on hatch No. 3
under the fairing's blister, the instrument module's ten antennas drawn in. As the vehicle is taken
apart the antennas come out and the airlock is drawn out to its 2.5 m, its outer hatch opens, and
with the launch vehicle gone the ship is as it was in orbit during the walk; further on the airlock
is shot off, leaving its ring, as it was before the descent.

**Confidence**: *documented* is a published figure; *derived* is computed from documented ones;
*estimated* was read off a drawing or photographs, or chosen to look right. **Assumed** means taken
to be as the Vostok or the 3KV had it, for want of anything read.

## The figures of this ship and flight

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Spacecraft | 3KD No. 4 (11F63) | documented | OKB-1's report of 6 June 1965, p. 6: «Ракета-носитель с объектом 3КД № 4 стартовала 18 марта 1965 г. в 10 час.00 мин.»; Siddiqi p. 454 and launch log |
| Launch vehicle | 11A57 No. R15000-05 | documented, tertiary | McDowell's launch log; spacefacts.de. Siddiqi's log gives none. Roscosmos's summary of a protocol of 13 January 1965 speaks of "11A57 No. 3 and No. 4" for ships No. 2 and No. 4: not reconciled, the protocol itself was not read |
| Mass in orbit | 5,682 kg | documented | Siddiqi, Table IB. The poster: 5,685; McDowell: 5.825 t |
| Airlock | 250 kg; 0.7 m folded, 2.5 m out; 1.2 m and 1.0 m across | documented | Siddiqi pp. 449 and 450 |
| Air beams' pressure in flight | 0.6 to 0.62 atmospheres | documented | Belyayev, 22 March 1965 |
| Airlock and cabin when joined | 0.7 and 0.72 atmospheres | documented | Belyayev |
| Airlock's own air bottles | 150 atm at the start, 140 after filling it once | documented | Belyayev |
| Cabin oxygen | up to 355 mm Hg (Belyayev); over 360 on orbits 5 to 7 (OKB-1, Table 4); the mark was 160 | documented | |
| Cabin pressure | up to 860 mm Hg on the 12th orbit, from an air bottle let in by mistake | documented | OKB-1's report, pp. 15 and 16 |
| Spin after the airlock was shot off | a turn in 20 to 22 s, slowing to 55 s by the 15th orbit | documented | Belyayev. OKB-1: up to 4.5°/s in pitch and yaw, over 6 in roll, against 3 allowed |
| Braking engine | fired by hand at 11:36:27; about 39 s | documented | the record's file; Belyayev |
| Separation of the modules | 14 min 31.3 s after the engine's start, on the thermal sensors | documented | OKB-1's report |
| Hand orientation's gas | 106 atm before the descent | documented | Belyayev |
| Cameras | one cine camera on the airlock's rim outside, two inside the airlock, a television "tower" with two vidicons, a hand-held Kiev in the cabin; a still camera F-21 on Leonov's suit, whose release was torn off | documented | Belyayev's and Leonov's reports; Siddiqi p. 450 |

## What differed from the 3KV

| Difference | Confidence | Source, and what the model does |
| --- | --- | --- |
| Two couches, "modified for spacesuited cosmonauts" | documented | Siddiqi p. 448. **Modelled**: two couches a little wider than the 3KV's; the one nearest hatch No. 3 gone. That it was that one is from a NASA diagram and from the hatch's cover needing the room (Altunin and Verba: it took "up to 30 %" of the cabin): estimated |
| The Volga airlock on hatch No. 3 | documented | Siddiqi p. 448; Zak. **Modelled** |
| The hatch into it opening inward, with the Vzor's porthole in its cover | documented, secondary | Zak. **Modelled as the Vostok's cover** with its porthole; its hinge and its 0.65 or 0.7 m opening are not |
| The ring left on the hull | documented | Kamanin, 26 February and 3 March 1965. **Modelled**, 34 mm proud |
| Pressure suits and their air conditioning; an emergency oxygen supply for the landing | documented | Siddiqi p. 448. The suits are **modelled**; the systems are not |
| The pack for the man going out | documented | **Modelled**, beside Leonov's couch; where it was stowed is not known |
| Automatic and manual controls for the airlock and both hatches; a panel inside the airlock | documented | Siddiqi pp. 448 and 450. Not modelled |
| More bottles of air on the outside of the instrument module | documented | Siddiqi p. 448. **Not modelled**: neither their number nor their place was found |
| The television "tower" outside, and its screen in the cabin | documented | Leonov's report: «башня ПРД с двумя мощными видиконами». **Not modelled**: its place was not found (Woods's reconstruction puts a camera on the reserve engine) |
| The couches lowered in flight and raised for the landing | documented, secondary | Zak. Not modelled: one position |

## Who lay where

Leonov at the crew's left, next to the airlock's hatch; Belyayev at their right, next to hatch
No. 1. **Derived**: «Вначале посадку в корабль произвел 2-й летчик-космонавт, затем я» (Belyayev's
report), and the entry hatch is at the crew's right ([Voskhod 1's spacecraft.md](../voskhod-1/spacecraft.md#who-lay-where)).
It agrees with what they did: the man going out was beside the airlock, and the commander had to
lie across both couches to reach the Vzor in the hatch at their left.

## The crew's figures

[berkut.py](../../crew/berkut.py)'s figure ([berkut.md](../../crew/berkut.md)), Belyayev at 170 cm
and Leonov at 172 cm, which are documented, with builds estimated from their documented masses.
Visors down, no pack on either back: the pack was put on in orbit. The pack is built by itself,
standing on edge at the cabin's left.

## How it was checked

The stills of the build were set beside: OKB-1's general drawing of the 3KD (the folded airlock on
the side of the ball, the reserve engine, the fairing's line); the Soviet poster of the ship and
Woods's drawing in Siddiqi (the airlock out, its ribbed tube, its head and camera); Abramov and
Skoog's section of the airlock as Pillet reproduces it (the outer hatch's domed cover, the rigid
head, the lower ring, the bottles at the foot); photographs of the airlock at the Memorial Museum of
Cosmonautics and at Zvezda (the cover in folds with hoops, the ribbed aluminium ring, four grey
spheres), of one without its cover (the fluted bladder, the camera on its bracket), of one folded
being lowered onto a ship and of one let out in the works; Zak's photograph of a 3KD cabin (the
couches' grey-green pads in aluminium pans, the hatch into the airlock on the far wall); and the
photographs of the two men at the pad and of the suits kept since.

What does not match: the airlock leans 15° toward the nose where the drawing, the poster and
Woods's drawing all have it leaning further (20 to 27° by the drawing); its tube is drawn in nine
bands with a hoop at each, where the museum's cover has three or four hoops and falls in loose
folds; its four bottles are spread round the nose side of its foot, where the museum's stand in a
cluster on a frame; the head carries no lamps and no television cameras; and the folded stack is a
plain 0.7 m, where the photograph of one being mounted shows the cloth bulging in three rolls.

## What is simplified, for this flight in particular

Everything in [voskhod.md](../../vehicles/voskhod.md) and [berkut.md](../../crew/berkut.md). Besides:

- **The airlock does not unfold; it is drawn out.** See [voskhod.md](../../vehicles/voskhod.md).
- **The pack's place is ours**, and it stands unfastened.
- **Leonov's line, the lamps, the panels and the cameras inside the airlock are not built.**
- **The cabin's oxygen, air bottle and their gauges**, on which half the flight's story turns, are
  not built: the cabin has the Vostok's board and nothing of the 3KD's own.

## Level of detail

| Level | Triangles (whole vehicle) | Meshes |
| --- | --- | --- |
| Full (1.0) | 708,803 | 247 |
| 0.6 | 261,241 | 173 |
| 0.3 | 130,704 | 173 |

The crew, the couches and the rest of the cabin's contents are left out below detail 0.75. The
clearance check passes at all three.

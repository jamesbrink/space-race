# The Mercury capsule, as the Redstone flights shared it

What [mercury_capsule.py](mercury_capsule.py) builds: the parts of the spacecraft that were the same
on capsule No. 7 (Freedom 7, MR-3) and capsule No. 11 (Liberty Bell 7, MR-4). A flight's
`model/vehicle.py` calls it for these and builds what was its own.

| Shared (here) | Each flight's own (its `model/vehicle.py`) |
| --- | --- |
| Dimensions and stations; materials | The afterbody's shingles as modelled |
| Heat-sink shield (`build_heat_shield`) | Windows: two ports (No. 7), the centreline window (No. 11) |
| Retropack (`build_retropack`) | The hatch: latched (No. 7), explosive (No. 11) |
| Recovery compartment (`build_recovery_compartment`) | Paint |
| Antenna canister (`build_antenna_canister`) | Where the periscope's door and the umbilical are |
| Escape tower (`build_escape_tower`) | The cabin's fit: [mercury_cabin.py](mercury_cabin.py) (No. 7), [mercury_cabin_11.py](mercury_cabin_11.py) (No. 11) |
| The periscope's objective (`periscope`), its door, well and the umbilical receptacle under it (`periscope_door`: built shut and drawn in, as at liftoff), as one linkage (`ScopeWorks`: the cartridge's travel, the door's hinge, the link between them), each moving piece a node of its own whose motion the build writes into its extras (`periscope_run`) and a flight plays on its clock (`vehicles/periscope.ts`); the lower housing's way through the pressure vessel (`periscope_mouth`); `chamfered`, the block every fitting here and in the cabins is made of; the roll jets in the top row (`roll_fittings`, No. 7) or at the base (`roll_thrusters`, No. 11, as built before No. 7's were read), the attach ring | |
| Screws round a plain plate (`fasten_round`) | |
| Standing the capsule on its booster (`stand`) | |
| The pressure vessel round a hatch opening, the bulkhead stiffeners, oxygen bottles, landing bag | |

Every dimension, its confidence and its source are in the flights' records:
[Freedom 7's spacecraft.md](../flights/mr-3-freedom-7/spacecraft.md) for all that is shared, and
[Liberty Bell 7's](../flights/mr-4-liberty-bell-7/spacecraft.md) for what differed, each item with
its source. That the shared parts were in fact the same on No. 11 is, for the shield, the landing
bag and the periscope, documented there; for the canister, the tower and the retropack it rests on
nothing read saying otherwise.

**The orbital capsules.** Spacecraft No. 13 (Friendship 7, MA-6) is built from this module, from Liberty Bell 7's own
script for the window, the hatch and the shingles round them (which No. 11 was the first to have), and from
[mercury_orbital.py](mercury_orbital.py) for what the capsules that went into orbit had and these two had not: the
ablation heat shield, and a name painted by hand. Its periscope's door, cartridge and link are this module's
(`ScopeWorks`, `periscope_mouth`, `periscope_run`), called from its own script with No. 11's door, station and tube. Its record is
[Friendship 7's spacecraft.md](../flights/ma-6-friendship-7/spacecraft.md).

Spacecraft No. 18 (Aurora 7, MA-7) is built the same way, with what its own photographs and report change: Liberty Bell 7's script is
told where the shingle under its window ends and to leave its paint off (`build_afterbody(name_foot=..., paint=False)`),
and [mercury_orbital.py](mercury_orbital.py) lets the balloon experiment's container into the top of the antenna canister this module
builds (`balloon_canister`). Its record is [Aurora 7's spacecraft.md](../flights/ma-7-aurora-7/spacecraft.md).

Spacecraft No. 16 (Sigma 7, MA-8) is built the same way again: the same two arguments to Liberty Bell 7's script, its own paint, nine
ablation panels laid on the recovery compartment's shingles this module builds, and from [mercury_orbital.py](mercury_orbital.py) the
stripes on the retropack and the dipole antenna's two units on it (`retropack_stripes`, `hf_dipole`), neither of which a capsule
that does not ask for them is given. Its record is [Sigma 7's spacecraft.md](../flights/ma-8-sigma-7/spacecraft.md).

Spacecraft No. 20 (Faith 7, MA-9) asks Liberty Bell 7's script for three things more, each of which a capsule that does not
ask is built without, to the byte: no periscope (`periscope=False`: no door, objective, link or well, and nothing of
`ScopeWorks`), a smaller opening in the plate at the pilot's feet for the umbilical's own door (`door`), and its own shingle
seams, the same two all round (`rows`), as its photographs have them. From [mercury_orbital.py](mercury_orbital.py)
it takes the balloon's container without Aurora 7's liners and the dipole antenna's two units; the beacon's canister and the
Geiger tubes on its retropack are its own script's. Its record is [Faith 7's spacecraft.md](../flights/ma-9-faith-7/spacecraft.md).

## Where the window stands

One figure for every capsule that has the window (Nos. 11, 13, 16, 18 and 20): the middle of the outer pane at
station 31.5 (`WINDOW_Z` in Liberty Bell 7's script, which every orbital capsule's script takes it from), so the
glass from 21.6 to 41.4 and the plate it is set in from 20.5 to 42.5. Estimated, to within 1.5 in: no document
read gives the window a station, and it is measured from photographs of Nos. 20 and 13 between the cone's two
ends and carried to No. 11 through the hatch beside it
([Liberty Bell 7's spacecraft.md](../flights/mr-4-liberty-bell-7/spacecraft.md), "The window"). Until November 2026
it was 35.8. What follows it: the outer pane and its rim, the well, the inner panes and their frame, the opening in
the structure under the shingles, the opening in the pressure vessel and the lining and the shroud into the cabin
([mercury_cabin_11.py](mercury_cabin_11.py), `WINDOW_OPENING`, stations 21.5 to 39.7), the seams of the shingles on
the window's side, and each capsule's paint under and beside it. The hatch did not move.

The shingle under the window is built by the same script for all five (`name_foot`, and ten beads to a stack,
`NAME_BEADS`, which `Skin.shingle` takes as `beads`: a shingle that is not told how many it has carries as many as go
at `PITCH`, as before). What was painted on it and beside it is each capsule's own, read again from its own
photographs when the window was moved: each flight's spacecraft.md, "Paint". What was not read again is the far
side: the seams from the hatch round past the periscope to 165°, the periscope's door and the umbilical, and
Liberty Bell 7's lettering and flag there, all laid out before against the window where it then stood.

## Open: where the cone meets the cylinder

Two figures that cannot both be right, left as they are:

| | Station | Where from |
| --- | --- | --- |
| As built here (`CONE_H`) | 58.38 | derived: (37.25 - 16) / tan 20°, from the 74.5 in diameter, the 32 in recovery compartment and the 20° half-angle, each documented |
| SEDR 104, Figure 1-3 | 57.21 | documented: Z161.71 on the stations diagram of November 1961, less Z104.50 for the plane of the greatest diameter (Z161.82, so 57.32, in the edition of December 1959) |

The cone probably does not begin at a radius of 37.25 in exactly at station 0 (74.5 in is the shield's diameter, and
the cone's skin may begin a little inside or above it), or the 20° is a round figure. Changing `CONE_H` moves every
capsule's skin, the recovery compartment, the antenna canister and the tower, so it is a change of its own and is
not made here. The window's stations were measured on photographs with 58.38 as the cone's upper end; with 57.21
they come out 0.6 to 1.1 in lower, inside the 1.5 in they are good to.

## Two ways of building shingles

- `shingle_row`: a ring of shingles with their beads along the meridian. Only the recovery
  compartment's cylinder uses it now.
- `Skin`: shingles with their beads running round the cone, in stacks, as every photograph of
  both capsules shows them, kept as a height field as well as a mesh so that paint can be laid on
  it and follow the beads (`Skin.paint`, `Skin.lettering`). Both flights' cones are built with it
  (Freedom 7's since November 2026).

## Which way round

A flight's script builds its capsule in the pilot's frame: angles round the cone from his right as
he lies, his feet (the periscope) at 90 degrees and his head at 270. Both capsules' hatches have
their middle at 315. `stand` then turns the spacecraft's nodes 45 degrees about the long axis, in
their meshes' vertices or in their placing, so that in the GLB the hatch is on +X, the side every
launch site's frame gives the hatch, and every top-level node keeps an identity transform. Anything
a flight's `flight.ts` quotes of the cabin (windows, periscope, lights, `overhead`) is in the
turned frame; Freedom 7's script prints it.

`wall` builds a wall of revolution with openings left in it (a hatch, a window, a door), their
angles whole multiples of 2.5° so that the facets of one band meet those of the next.

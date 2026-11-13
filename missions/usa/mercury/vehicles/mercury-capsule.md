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

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
| The periscope's objective (`periscope`), the umbilical receptacle, the roll thrusters, the attach ring | |
| The pressure vessel round a hatch opening, the bulkhead stiffeners, oxygen bottles, landing bag | |

Every dimension, its confidence and its source are in the flights' records:
[Freedom 7's spacecraft.md](../flights/mr-3-freedom-7/spacecraft.md) for all that is shared, and
[Liberty Bell 7's](../flights/mr-4-liberty-bell-7/spacecraft.md) for what differed, each item with
its source. That the shared parts were in fact the same on No. 11 is, for the shield, the landing
bag and the periscope, documented there; for the canister, the tower and the retropack it rests on
nothing read saying otherwise.

## Two ways of building shingles

- `shingle_row`: a ring of shingles with their beads along the meridian. Freedom 7's model uses it.
- `Skin`: shingles with their beads running round the cone, in stacks, as every photograph of
  capsule No. 11 shows them, kept as a height field as well as a mesh so that paint can be laid on
  it and follow the beads (`Skin.paint`, `Skin.lettering`). Liberty Bell 7's model uses it.

The two capsules' skins were of one design, so one of these is wrong for Freedom 7; the
photographs say it is the first. Freedom 7's model is left as it was built until that is decided:
see "Open questions" in Liberty Bell 7's spacecraft.md.

`wall` builds a wall of revolution with openings left in it (a hatch, a window, a door), their
angles whole multiples of 2.5° so that the facets of one band meet those of the next.

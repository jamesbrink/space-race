# Apollo 7 (AS-205)

The first Apollo flight with a crew, twenty months after the fire that killed the crew of Apollo 1 on the pad. Walter
M. Schirra Jr., Donn F. Eisele and R. Walter Cunningham spent eleven days in Earth orbit proving the redesigned Block II
command and service modules: the new hatch, the cabin, the guidance computer, the fuel cells, and the big engine on the
back, fired eight times. There was no lunar module; the crew rendezvoused instead with their own spent S-IVB.

| | |
| --- | --- |
| Liftoff | 11 October 1968, 15:02:45 UTC |
| Site | Cape Kennedy, Launch Complex 34 (not built) |
| Crew | Walter M. Schirra Jr., commander; Donn F. Eisele, command module pilot; R. Walter Cunningham, lunar module pilot |
| Spacecraft | command and service module CSM-101, Block II, North American Aviation: [spacecraft.md](spacecraft.md) |
| Launch vehicle | Saturn IB SA-205: [saturn-ib.md](../../vehicles/saturn-ib.md) |

**In this repo: the vehicle, in the gallery.** CSM-101 on SA-205, under its boost cover and escape tower, can be turned,
taken apart and cut open from the escape motor to the H-1 engines: the S-IB's cluster of tanks, the J-2 under the
S-IVB's common bulkhead, the instrument unit's racks, the service module's tanks, fuel cells, helium and engine, the
parachutes packed round the forward tunnel, and the cabin with its main console, DSKY, attitude balls and the three
unitized couches. **Sit in the cabin** (or C) puts the eye in Schirra's, Eisele's or Cunningham's couch, with the
cabin's lights. The adapter's four panels open as the spacecraft leaves it, and stay on the stage.

Not built: the launch site, the crew figures, the day's weather and the flight. The flight has no `site`, so there is
no computed Sun or Moon to state.

## The model and its sources

Every dimension is in its source's inches and carries its confidence in `flight.ts`; the hardware's notes say where
each came from and what is estimated:

- [spacecraft.md](spacecraft.md): CSM-101's stations, exterior and cabin, and how the parts below are put together.
- [command-module.md](../../vehicles/command-module.md), [pressure-vessel.md](../../vehicles/pressure-vessel.md),
  [windows.md](../../vehicles/windows.md): the outer shape, the pressure vessel inside it, the three-pane windows.
- [main-console.md](../../vehicles/main-console.md), [console-equipment.md](../../vehicles/console-equipment.md),
  [fdai.md](../../vehicles/fdai.md), [dsky-front.md](../../vehicles/dsky-front.md),
  [dsky-panels.md](../../vehicles/dsky-panels.md): the main display console and what is on it.
- [unitized-couch.md](../../vehicles/unitized-couch.md): the three couches on one frame.
- [reaction-control.md](../../vehicles/reaction-control.md), [service-tanks.md](../../vehicles/service-tanks.md): the
  service module.
- [launch-escape.md](../../vehicles/launch-escape.md), [saturn-ib.md](../../vehicles/saturn-ib.md): the escape system,
  the adapter and the launch vehicle.
- [reference/README.md](../../vehicles/reference/README.md): the survey outlines and drawing data the scripts read,
  with their hashes.

What is documented and what is not, in short. The outer shapes and stations are published figures: the press kit's
envelopes, North American's Block II structural plates, the MIT preflight tables for this very ship, the Saturn IB
checklist and the Douglas S-IVB-205 drawing; where they are the type's and not this ship's they are `assumed`. The
window and console outlines are measured from the Smithsonian's survey of Apollo 11's command module, the same
structure, and `assumed`. The panel layout is this ship's own drawing. The couches, the instruments and controls, the
cabin fittings, the engines' bell shapes and the painted markings are `estimated`, from photographs and illustrations.
[docs/sources.md](../../../../../docs/sources.md) lists what was read, under Apollo 7.

The press kit is a preflight document: its planned events are not taken for the flown record, and no timeline or
simulator plan is made from it. The mission's story is told in `missions/history.ts`, from NASA's *Apollo by the
Numbers* (SP-4029).

## What is not built or is simplified

- The launch site, the crew, the weather and the flight: the gallery is all there is.
- The cabin's stowage, suits, wiring, side consoles and most of the aft equipment bay; switches are one generic switch,
  meters and the DSKY are unlit and unpowered, and no reading is invented.
- The DSKY's bare housing behind its front plate ([dsky-housing.md](../../vehicles/dsky-housing.md): found, not
  installed).
- Each hardware note ends with its own list of what is wrong or left out.

# Apollo 7 (AS-205)

The first Apollo flight with a crew, twenty months after the fire that killed the crew of Apollo 1 on the pad. Walter
M. Schirra Jr., Donn F. Eisele and R. Walter Cunningham spent eleven days in Earth orbit proving the redesigned Block II
command and service modules: the new hatch, the cabin, the guidance computer, the fuel cells, and the big engine on the
back, fired eight times. There was no lunar module; the crew rendezvoused instead with their own spent S-IVB.

| | |
| --- | --- |
| Liftoff | 11 October 1968, 15:02:45 UTC |
| Site | Cape Kennedy, [Launch Complex 34](../../../places/cape-canaveral/lc-34.md) |
| Crew | Walter M. Schirra Jr., commander; Donn F. Eisele, command module pilot; R. Walter Cunningham, lunar module pilot |
| Spacecraft | command and service module CSM-101, Block II, North American Aviation: [spacecraft.md](spacecraft.md) |
| Launch vehicle | Saturn IB SA-205: [saturn-ib.md](../../vehicles/saturn-ib.md) |

**Gallery.** CSM-101 on SA-205, under its boost cover and escape tower, can be turned,
taken apart and cut open from the escape motor to the H-1 engines: the S-IB's cluster of tanks, the J-2 under the
S-IVB's common bulkhead, the instrument unit's racks, the service module's tanks, fuel cells, helium and engine, the
parachutes packed round the forward tunnel, and the cabin with its main console, DSKY, attitude balls and the three
unitized couches. **Sit in the cabin** (or C) puts the eye in Schirra's, Eisele's or Cunningham's couch, with the
cabin's lights. The adapter's four panels open as the spacecraft leaves it, and stay on the stage.

**Launch site.** The pad is dated to 11 October 1968. The Saturn IB stands on the 27-foot concrete pedestal above the flame deflector. Follow the service structure rails out to its parking area, or approach the spacecraft by the umbilical tower and crew access arm. The pad origin is the launch mount. The model’s X axis follows the northeast rails, on a bearing of about 42°. The latitude and longitude of the surviving pedestal are approximate. The [LC-34 hardware notes](../../../places/cape-canaveral/lc-34.md) distinguish measured structures from photographic reconstruction.

At 11:02:45 EDT the Sun was at azimuth 134.71°, elevation 43.08°. The waning Moon was at azimuth 295.21°, elevation 10.46°, with 77.7% of its disk illuminated (DE440, geometric elevations). NASA reported three-tenths cumulonimbus, base 2,100 ft, visibility ten statute miles and an east wind of 19.8 knots on the 59.4-foot light pole. The renderer approximates the launch cloud field with broad cumulus heaps using an estimated maximum depth of 1,150 m and a 3,600 m procedural field scale. ERA5 supplies the vertical wind profile and changes in the surface wind around launch.

**Fly.** See the [physics and accuracy report](physics.md) for the postflight reference states, engine and entry models, and measured differences at cutoff and splashdown. Eight H-1 engines lift SA-205 off the pedestal. The four inner engines shut down first. A single J-2 takes the S-IVB and CSM into Earth orbit. The crew exercises control of the combined vehicle, then separates at 02:55:02 GET. The empty adapter stays with the S-IVB. On the following day the crew uses the stage as a rendezvous target. Two initial SPS firings and the subsequent terminal approach culminate in station-keeping at about 70 ft. The target has its own trajectory. The October 11 photograph at 03:16, reported coelliptic offset, braking range, station-keeping distance and the later sextant observations at 160 and 320 nautical miles constrain a reconstruction. In the absence of a continuous tracking vector, the directions of the photographed and terminal slant ranges are assumed along track; motion between observations is approximate. The target continues independently when the player takes control. Its historical display ends at the impact time in the mission report (§3.4); upper-stage atmospheric breakup is outside the reconstruction. [NASA photograph and caption](https://science.nasa.gov/resource/apollo-7s-ivb-rendezvous-in-space/).

Apollo 7 carried neither a lunar module nor a docking probe.

The service engine fires eight times over the mission, including the deorbit firing. Entry follows CM/SM separation. The forward heat shield releases, two drogues stabilize the CM, and three mains carry it into the Atlantic. Near recovery, the sky transitions to the October 22 observations from USS *Essex*. The 600-foot overcast ceiling is documented. The recovery field fades in before entry and uses the ship’s two-nautical-mile visibility near splashdown. The modeled observation footprint is estimated at 125 km, tapering out by 250 km. The cloud pattern and vertical thickness are reconstructed; light rain is recorded in the weather notes. [NOAA Spaceflight Meteorology Group](https://www.weather.gov/smg/apollo).

The reported splashdown was at 260:09:03 GET on 22 October. The model follows the inverted capsule through inflation of the three uprighting bags. The recorded crew started inflation about nine minutes after splashdown and reported upright four minutes later. The simulated roll depends on the landing mass and centre of gravity, displaced seawater, bag volumes and reconstructed waves. The pressure history, bag attachment geometry and damping are estimates. Helicopter pickup and delivery to USS *Essex* are historical recovery events.

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

- The [LC-34 reconstruction](../../../places/cape-canaveral/lc-34.md) retains uncertainty in the access-arm geometry and site placement. The [flight report](physics.md) gives measured differences at cutoff and splashdown.
- The [A7L suits](../../crew/a7l.md) have estimated fits and seated poses. The cabin stowage, wiring, side consoles and aft equipment bay remain simplified. Switches share geometry,
  most meters and the DSKY are passive. The two attitude balls show the local-level attitude.
- The DSKY's bare housing behind its front plate ([dsky-housing.md](../../vehicles/dsky-housing.md): found, not
  installed).
- Each hardware note ends with its own list of what is wrong or left out.

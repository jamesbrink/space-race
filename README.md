<p align="center"><img src="docs/logo.svg" alt="Space Race" width="640"></p>

# Space Race

Every crewed spacecraft, modelled to scale and shown as it flew, in the place it flew from. The
first one built is **Freedom 7**, the Mercury capsule that carried Alan Shepard on 5 May 1961 on
its Redstone booster. It was the second crewed spaceflight (Yuri Gagarin had orbited the Earth in
Vostok 1 twenty-three days earlier) and it is the standard every later flight here is built to.

**Live: https://jamesbrink.online/space-race/**

```sh
pnpm install
pnpm dev        # http://localhost:5180
pnpm check      # typecheck, lint, format check, tests
pnpm models     # rebuild the models (needs Blender 5)
```

Each flight is one scene with three things to study: its **vehicle**, standing on its **launch
pad**, with its **crew**. Choosing a section, or clicking a model, flies the camera there. And it
can be flown.

- **Three places.** A flight opens in its **Gallery**: the vehicle alone in a studio, taken apart
  with every part named, cut open, a person beside it for scale. From there go on to its **Launch
  site** and to **Fly**; a place not built yet says so.
- **Look.** Drag to orbit, scroll to zoom, or let the view drift round on its own; `C` steps through
  the camera's views and the screen says which one it is in. Choose a part to fly to it and read
  about it; click a window to look in.
- **Fly it.** **Fly it** by the clock (or `L`) puts the vehicle on the pad under your hands: `Space`
  lights the engine and then sets off each event, `W A S D` steer, `G` hands the steering to the
  guidance or takes it back. It is a rigid body under real gravity, air and thrust, flown from the
  flight's own recorded figures; at the end your flight is set beside the one that was flown.
- **Watch it fly.** Run the clock (`P`) and the recorded flight goes from liftoff to splashdown,
  with the simulator's run laid against the reports' figures in the **Flight** tab.
- **Take it apart.** The slider explodes the vehicle; on the pad it runs the morning of the launch,
  from the gantry round the rocket to the pad cleared. **Cutaway** opens the capsule and booster.
- **Walk.** `V`, the **Walk** button in the Crew section, or a double-click on the pilot puts you
  on the pad on foot; Space jumps.
- **Cel shading** (or `T`) redraws the whole scene as an inked drawing.
- **Check the numbers.** The **Specs** and **Motors** tabs mark each figure as documented, derived
  or estimated.

The legend at the bottom left of the page lists every key and gesture.

| Flight | Nation | Date | Record | Models |
| --- | --- | --- | --- | --- |
| Mercury-Redstone 3, *Freedom 7* | USA | 5 May 1961 | [flight](missions/usa/mercury/flights/mr-3-freedom-7/README.md) · [spacecraft](missions/usa/mercury/flights/mr-3-freedom-7/spacecraft.md) · [launch vehicle](missions/usa/mercury/vehicles/redstone-mrlv.md) · [pad](missions/usa/mercury/sites/lc-5.md) · [suit](missions/usa/mercury/crew/mark-iv-suit.md) | [capsule](missions/usa/mercury/flights/mr-3-freedom-7/model/vehicle.py) · [booster](missions/usa/mercury/vehicles/redstone_mrlv.py) · [pad](missions/usa/mercury/sites/lc5/) · [suit](missions/usa/mercury/crew/mark_iv_suit.py) |
| Mercury-Redstone 4, *Liberty Bell 7* (spacecraft and launch vehicle, so far) | USA | 21 July 1961 | [flight](missions/usa/mercury/flights/mr-4-liberty-bell-7/README.md) · [spacecraft](missions/usa/mercury/flights/mr-4-liberty-bell-7/spacecraft.md) · [what it shared with Freedom 7](missions/usa/mercury/vehicles/mercury-capsule.md) · [launch vehicle](missions/usa/mercury/vehicles/redstone-mrlv.md) · [site as it stood that day: not built](missions/usa/mercury/sites/lc-5.md) | [capsule No. 11](missions/usa/mercury/flights/mr-4-liberty-bell-7/model/vehicle.py) · [its cabin](missions/usa/mercury/vehicles/mercury_cabin_11.py) · [shared](missions/usa/mercury/vehicles/mercury_capsule.py) · [booster](missions/usa/mercury/vehicles/redstone_mrlv.py) |
| Mercury-Atlas 6, *Friendship 7* (spacecraft and launch vehicle, so far) | USA | 20 February 1962 | [flight](missions/usa/mercury/flights/ma-6-friendship-7/README.md) · [spacecraft](missions/usa/mercury/flights/ma-6-friendship-7/spacecraft.md) · [launch vehicle](missions/usa/mercury/vehicles/atlas-lv3b.md) · [where it flew from: not built](missions/usa/mercury/sites/lc-14.ts) | [capsule No. 13](missions/usa/mercury/flights/ma-6-friendship-7/model/vehicle.py) · [its cabin](missions/usa/mercury/vehicles/mercury_cabin_13.py) · [the orbital capsules](missions/usa/mercury/vehicles/mercury_orbital.py) · [Atlas](missions/usa/mercury/vehicles/atlas_lv3b.py) |
| Mercury-Atlas 7, *Aurora 7* (spacecraft and launch vehicle, so far) | USA | 24 May 1962 | [flight](missions/usa/mercury/flights/ma-7-aurora-7/README.md) · [spacecraft](missions/usa/mercury/flights/ma-7-aurora-7/spacecraft.md) · [launch vehicle](missions/usa/mercury/vehicles/atlas-lv3b.md) · [where it flew from: not built](missions/usa/mercury/sites/lc-14.ts) | [capsule No. 18](missions/usa/mercury/flights/ma-7-aurora-7/model/vehicle.py) · [its cabin](missions/usa/mercury/vehicles/mercury_cabin_18.py) · [Atlas](missions/usa/mercury/vehicles/atlas_lv3b.py) |
| Mercury-Atlas 8, *Sigma 7* (spacecraft and launch vehicle, so far) | USA | 3 October 1962 | [flight](missions/usa/mercury/flights/ma-8-sigma-7/README.md) · [spacecraft](missions/usa/mercury/flights/ma-8-sigma-7/spacecraft.md) · [launch vehicle](missions/usa/mercury/vehicles/atlas-lv3b.md) · [where it flew from: not built](missions/usa/mercury/sites/lc-14.ts) | [capsule No. 16](missions/usa/mercury/flights/ma-8-sigma-7/model/vehicle.py) · [its cabin](missions/usa/mercury/vehicles/mercury_cabin_16.py) · [Atlas](missions/usa/mercury/vehicles/atlas_lv3b.py) |
| Mercury-Atlas 9, *Faith 7* (spacecraft and launch vehicle, so far) | USA | 15 May 1963 | [flight](missions/usa/mercury/flights/ma-9-faith-7/README.md) · [spacecraft](missions/usa/mercury/flights/ma-9-faith-7/spacecraft.md) · [launch vehicle](missions/usa/mercury/vehicles/atlas-lv3b.md) · [where it flew from: not built](missions/usa/mercury/sites/lc-14.ts) | [capsule No. 20](missions/usa/mercury/flights/ma-9-faith-7/model/vehicle.py) · [its cabin](missions/usa/mercury/vehicles/mercury_cabin_20.py) · [Atlas](missions/usa/mercury/vehicles/atlas_lv3b.py) |
| Vostok 1 (spacecraft and launch vehicle, so far) | USSR | 12 April 1961 | [flight](missions/ussr/vostok/flights/vostok-1/README.md) · [spacecraft](missions/ussr/vostok/flights/vostok-1/spacecraft.md) · [the 3KA](missions/ussr/vostok/vehicles/vostok-3ka.md) · [launch vehicle](missions/ussr/vostok/vehicles/vostok-8k72k.md) · [site: not built](missions/ussr/vostok/sites/site-1.md) | [flight's fit](missions/ussr/vostok/flights/vostok-1/model/vehicle.py) · [spacecraft](missions/ussr/vostok/vehicles/vostok_3ka.py) · [launch vehicle](missions/ussr/vostok/vehicles/vostok_8k72k/__init__.py) |
| Vostok 2 (spacecraft and launch vehicle, so far) | USSR | 6 August 1961 | [flight](missions/ussr/vostok/flights/vostok-2/README.md) · [spacecraft](missions/ussr/vostok/flights/vostok-2/spacecraft.md) · [the 3KA](missions/ussr/vostok/vehicles/vostok-3ka.md) · [launch vehicle](missions/ussr/vostok/vehicles/vostok-8k72k.md) | [flight's fit](missions/ussr/vostok/flights/vostok-2/model/vehicle.py) · [spacecraft](missions/ussr/vostok/vehicles/vostok_3ka.py) · [launch vehicle](missions/ussr/vostok/vehicles/vostok_8k72k/__init__.py) |
| Vostok 3 (spacecraft and launch vehicle, so far) | USSR | 11 August 1962 | [flight](missions/ussr/vostok/flights/vostok-3/README.md) · [spacecraft](missions/ussr/vostok/flights/vostok-3/spacecraft.md) · [the 3KA](missions/ussr/vostok/vehicles/vostok-3ka.md) · [launch vehicle](missions/ussr/vostok/vehicles/vostok-8k72k.md) | [flight's fit](missions/ussr/vostok/flights/vostok-3/model/vehicle.py) · [spacecraft](missions/ussr/vostok/vehicles/vostok_3ka.py) · [launch vehicle](missions/ussr/vostok/vehicles/vostok_8k72k/__init__.py) |
| Vostok 4 (spacecraft and launch vehicle, so far) | USSR | 12 August 1962 | [flight](missions/ussr/vostok/flights/vostok-4/README.md) · [spacecraft](missions/ussr/vostok/flights/vostok-4/spacecraft.md) · [the 3KA](missions/ussr/vostok/vehicles/vostok-3ka.md) · [launch vehicle](missions/ussr/vostok/vehicles/vostok-8k72k.md) | [flight's fit](missions/ussr/vostok/flights/vostok-4/model/vehicle.py) · [spacecraft](missions/ussr/vostok/vehicles/vostok_3ka.py) · [launch vehicle](missions/ussr/vostok/vehicles/vostok_8k72k/__init__.py) |
| Vostok 5 (spacecraft and launch vehicle, so far) | USSR | 14 June 1963 | [flight](missions/ussr/vostok/flights/vostok-5/README.md) · [spacecraft](missions/ussr/vostok/flights/vostok-5/spacecraft.md) · [the 3KA](missions/ussr/vostok/vehicles/vostok-3ka.md) · [launch vehicle](missions/ussr/vostok/vehicles/vostok-8k72k.md) | [flight's fit](missions/ussr/vostok/flights/vostok-5/model/vehicle.py) · [spacecraft](missions/ussr/vostok/vehicles/vostok_3ka.py) · [launch vehicle](missions/ussr/vostok/vehicles/vostok_8k72k/__init__.py) |
| Vostok 6 (spacecraft and launch vehicle, so far) | USSR | 16 June 1963 | [flight](missions/ussr/vostok/flights/vostok-6/README.md) · [spacecraft](missions/ussr/vostok/flights/vostok-6/spacecraft.md) · [the 3KA](missions/ussr/vostok/vehicles/vostok-3ka.md) · [launch vehicle](missions/ussr/vostok/vehicles/vostok-8k72k.md) | [flight's fit](missions/ussr/vostok/flights/vostok-6/model/vehicle.py) · [spacecraft](missions/ussr/vostok/vehicles/vostok_3ka.py) · [launch vehicle](missions/ussr/vostok/vehicles/vostok_8k72k/__init__.py) |
| Voskhod 1 (spacecraft, crew and launch vehicle, so far) | USSR | 12 October 1964 | [flight](missions/ussr/voskhod/flights/voskhod-1/README.md) · [spacecraft](missions/ussr/voskhod/flights/voskhod-1/spacecraft.md) · [the Voskhod](missions/ussr/voskhod/vehicles/voskhod.md) · [launch vehicle](missions/ussr/voskhod/vehicles/voskhod-11a57.md) · [what the crew wore](missions/ussr/voskhod/crew/flight-suit.md) | [flight's fit](missions/ussr/voskhod/flights/voskhod-1/model/vehicle.py) · [spacecraft](missions/ussr/voskhod/vehicles/voskhod.py) · [launch vehicle](missions/ussr/voskhod/vehicles/voskhod_11a57/__init__.py) · [crew](missions/ussr/voskhod/crew/flight_suit.py) |
| Voskhod 2 (spacecraft, airlock, crew and launch vehicle, so far) | USSR | 18 March 1965 | [flight](missions/ussr/voskhod/flights/voskhod-2/README.md) · [spacecraft](missions/ussr/voskhod/flights/voskhod-2/spacecraft.md) · [the Voskhod](missions/ussr/voskhod/vehicles/voskhod.md) · [launch vehicle](missions/ussr/voskhod/vehicles/voskhod-11a57.md) · [suit](missions/ussr/voskhod/crew/berkut.md) | [flight's fit](missions/ussr/voskhod/flights/voskhod-2/model/vehicle.py) · [spacecraft](missions/ussr/voskhod/vehicles/voskhod.py) · [launch vehicle](missions/ussr/voskhod/vehicles/voskhod_11a57/__init__.py) · [suit](missions/ussr/voskhod/crew/berkut.py) |
| Gemini-Titan 3, "Molly Brown" (spacecraft and launch vehicle, so far) | USA | 23 March 1965 | [flight](missions/usa/gemini/flights/gt-3/README.md) · [spacecraft](missions/usa/gemini/flights/gt-3/spacecraft.md) · [launch vehicle](missions/usa/gemini/vehicles/titan-ii-glv.md) · [where it flew from: not built](missions/usa/gemini/sites/lc-19.ts) | [spacecraft No. 3 on GLV-3](missions/usa/gemini/flights/gt-3/model/vehicle.py) · [the Gemini spacecraft](missions/usa/gemini/vehicles/gemini_spacecraft.py) · [Titan II](missions/usa/gemini/vehicles/titan_ii_glv.py) |

## Timeline

What there is to build, in the order it flew. One flight is built whole and two have their vehicles; the rest is the plan.

The first ten crewed flights:

| # | Date | Flight | Nation | Crew | What it was | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 12 Apr 1961 | Vostok 1 | USSR | Yuri Gagarin | First person in space; one orbit | **spacecraft and launch vehicle built** ([record](missions/ussr/vostok/flights/vostok-1/README.md)); site and trajectory to come |
| 2 | 5 May 1961 | Mercury-Redstone 3, *Freedom 7* | USA | Alan Shepard | Suborbital; first American in space | **built** |
| 3 | 21 Jul 1961 | Mercury-Redstone 4, *Liberty Bell 7* | USA | Gus Grissom | Suborbital; same pad as Freedom 7 | **spacecraft and launch vehicle built** ([record](missions/usa/mercury/flights/mr-4-liberty-bell-7/README.md)); site as it stood that day and trajectory to come |
| 4 | 6 Aug 1961 | Vostok 2 | USSR | Gherman Titov | A full day in orbit | **spacecraft and launch vehicle built** ([record](missions/ussr/vostok/flights/vostok-2/README.md)); site as it stood that day and trajectory to come |
| 5 | 20 Feb 1962 | Mercury-Atlas 6, *Friendship 7* | USA | John Glenn | First American in orbit | **spacecraft and launch vehicle built** ([record](missions/usa/mercury/flights/ma-6-friendship-7/README.md)); Launch Complex 14 and the orbit to come |
| 6 | 24 May 1962 | Mercury-Atlas 7, *Aurora 7* | USA | Scott Carpenter | Three orbits, with experiments; landed 250 nautical miles long | **spacecraft and launch vehicle built** ([record](missions/usa/mercury/flights/ma-7-aurora-7/README.md)); Launch Complex 14 and the orbit to come |
| 7 | 11 Aug 1962 | Vostok 3 | USSR | Andriyan Nikolayev | Four days; first of a pair | **spacecraft and launch vehicle built** ([record](missions/ussr/vostok/flights/vostok-3/README.md)); site as it stood that day and trajectory to come |
| 8 | 12 Aug 1962 | Vostok 4 | USSR | Pavel Popovich | Two crewed ships in orbit at once | **spacecraft and launch vehicle built** ([record](missions/ussr/vostok/flights/vostok-4/README.md)); site as it stood that day and trajectory to come |
| 9 | 3 Oct 1962 | Mercury-Atlas 8, *Sigma 7* | USA | Wally Schirra | Six orbits, most of them drifting; landed in sight of the carrier | **spacecraft and launch vehicle built** ([record](missions/usa/mercury/flights/ma-8-sigma-7/README.md)); Launch Complex 14 and the orbit to come |
| 10 | 15 May 1963 | Mercury-Atlas 9, *Faith 7* | USA | Gordon Cooper | A day in orbit; last Mercury | **spacecraft and launch vehicle built** ([record](missions/usa/mercury/flights/ma-9-faith-7/README.md)); Launch Complex 14 and the orbit to come |

And the programmes after them:

| Programme | Nation | Crewed flights | What it adds | Status |
| --- | --- | --- | --- | --- |
| Vostok | USSR | 1961 to 1963 | The first spacecraft; Baikonur | one spacecraft and its launch vehicle built |
| Mercury | USA | 1961 to 1963 | Redstone and Atlas; Cape Canaveral | one flight built, a second's vehicle |
| Voskhod | USSR | 1964 to 1965 | Three aboard; the first spacewalk | both flights’ spacecraft, crews and launch vehicle built ([programme](missions/ussr/voskhod/README.md)) |
| Gemini | USA | 1965 to 1966 | Two aboard, Titan II, rendezvous and docking | the first crewed flight's spacecraft and launch vehicle built ([Gemini-Titan 3](missions/usa/gemini/flights/gt-3/README.md)) |
| Soyuz | USSR, Russia | 1967 onward | The longest-serving crewed spacecraft | planned |
| Apollo | USA | 1968 to 1972 | Saturn IB and Saturn V; lunar orbit and the Moon | planned |
| Salyut, Skylab, Apollo-Soyuz | USSR, USA | 1971 to 1986 | The first space stations | planned |
| Space Shuttle, Mir | USA, USSR and Russia | 1981 to 2011 | A reusable orbiter; a station built in orbit | planned |
| International Space Station | many | 1998 onward | A station crewed without a break since 2000 | planned |
| Shenzhou and Tiangong | China | 2003 onward | China's crewed spacecraft and its own stations | planned |
| Commercial crew | USA | 2020 onward | Crew Dragon and Starliner | planned |
| Artemis | USA and partners | 2020s | Orion and the Space Launch System; back to the Moon | planned |

The dates and crews above are the published ones; each flight's own record, with sources, is
written when the flight is built.

## How it is made

The models are generated by Python scripts run through Blender, so every dimension is a line of
code with a comment, and each is built at three levels of detail. The simulator is plain TypeScript
(`src/sim/`): every input carries how sure we are of it, nothing is fitted to make a result come
out, and where it misses the record the miss is written down. The rules are in
[AGENTS.md](AGENTS.md), with the detail of each part under [docs/agents/](docs/agents/). What it
all rests on is in [docs/sources.md](docs/sources.md).

Where this is going: a simulator in which you run a space programme (USA, USSR, and those that
came later) from the first flights to the present, on hardware modelled to its real specifications.

## Licence

The code and the models are under the [MIT licence](LICENSE). The data baked into `public/` that
came from others keeps its own terms (OpenStreetMap's ODbL, the Copernicus licence, NASA's
guidelines), which [docs/sources.md](docs/sources.md) records beside each source.

---

Copyright © 2026 James Brink

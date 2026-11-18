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
- **The Lineup.** From the front page: every vehicle built so far side by side on one floor at one
  scale, in the order they flew, with a person beside each. Choose one to read its story, its crew
  and its figures; stand two together to compare them; see the spacecraft alone, or one
  programme's section; a timeline of the race runs under the row.
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
- **Check the numbers.** The **Specs** and **Motors** tabs mark each figure as documented, assumed
  from its type, derived or estimated.

The legend at the bottom left of the page lists every key and gesture.

| Flight | Nation | Date | Record | Models |
| --- | --- | --- | --- | --- |
| Vostok 1 | USSR | 12 April 1961 | [flight](missions/ussr/vostok/flights/vostok-1/README.md) · [spacecraft](missions/ussr/vostok/flights/vostok-1/spacecraft.md) · [the 3KA](missions/ussr/vostok/vehicles/vostok-3ka.md) · [launch vehicle](missions/ussr/vostok/vehicles/vostok-8k72k.md) · [site](missions/ussr/places/tyuratam/site-1.md) | [flight's fit](missions/ussr/vostok/flights/vostok-1/model/vehicle.py) · [spacecraft](missions/ussr/vostok/vehicles/vostok_3ka.py) · [launch vehicle](missions/ussr/vostok/vehicles/vostok_8k72k/__init__.py) |
| Mercury-Redstone 3, *Freedom 7* | USA | 5 May 1961 | [flight](missions/usa/mercury/flights/mr-3-freedom-7/README.md) · [spacecraft](missions/usa/mercury/flights/mr-3-freedom-7/spacecraft.md) · [launch vehicle](missions/usa/mercury/vehicles/redstone-mrlv.md) · [pad](missions/usa/places/cape-canaveral/lc-5.md) · [suit](missions/usa/mercury/crew/mark-iv-suit.md) | [capsule](missions/usa/mercury/flights/mr-3-freedom-7/model/vehicle.py) · [booster](missions/usa/mercury/vehicles/redstone_mrlv.py) · [pad](missions/usa/places/cape-canaveral/lc5/) · [suit](missions/usa/mercury/crew/mark_iv_suit.py) |
| Mercury-Redstone 4, *Liberty Bell 7* | USA | 21 July 1961 | [flight](missions/usa/mercury/flights/mr-4-liberty-bell-7/README.md) · [spacecraft](missions/usa/mercury/flights/mr-4-liberty-bell-7/spacecraft.md) · [what it shared with Freedom 7](missions/usa/mercury/vehicles/mercury-capsule.md) · [launch vehicle](missions/usa/mercury/vehicles/redstone-mrlv.md) · [pad](missions/usa/places/cape-canaveral/lc-5.md) | [capsule No. 11](missions/usa/mercury/flights/mr-4-liberty-bell-7/model/vehicle.py) · [its cabin](missions/usa/mercury/vehicles/mercury_cabin_11.py) · [shared](missions/usa/mercury/vehicles/mercury_capsule.py) · [booster](missions/usa/mercury/vehicles/redstone_mrlv.py) |
| Vostok 2 | USSR | 6 August 1961 | [flight](missions/ussr/vostok/flights/vostok-2/README.md) · [spacecraft](missions/ussr/vostok/flights/vostok-2/spacecraft.md) · [the 3KA](missions/ussr/vostok/vehicles/vostok-3ka.md) · [launch vehicle](missions/ussr/vostok/vehicles/vostok-8k72k.md) | [flight's fit](missions/ussr/vostok/flights/vostok-2/model/vehicle.py) · [spacecraft](missions/ussr/vostok/vehicles/vostok_3ka.py) · [launch vehicle](missions/ussr/vostok/vehicles/vostok_8k72k/__init__.py) |
| Mercury-Atlas 6, *Friendship 7* | USA | 20 February 1962 | [flight](missions/usa/mercury/flights/ma-6-friendship-7/README.md) · [spacecraft](missions/usa/mercury/flights/ma-6-friendship-7/spacecraft.md) · [launch vehicle](missions/usa/mercury/vehicles/atlas-lv3b.md) · [where it flew from](missions/usa/places/cape-canaveral/lc-14.ts) | [capsule No. 13](missions/usa/mercury/flights/ma-6-friendship-7/model/vehicle.py) · [its cabin](missions/usa/mercury/vehicles/mercury_cabin_13.py) · [the orbital capsules](missions/usa/mercury/vehicles/mercury_orbital.py) · [Atlas](missions/usa/mercury/vehicles/atlas_lv3b.py) |
| Mercury-Atlas 7, *Aurora 7* | USA | 24 May 1962 | [flight](missions/usa/mercury/flights/ma-7-aurora-7/README.md) · [spacecraft](missions/usa/mercury/flights/ma-7-aurora-7/spacecraft.md) · [launch vehicle](missions/usa/mercury/vehicles/atlas-lv3b.md) · [where it flew from](missions/usa/places/cape-canaveral/lc-14.ts) | [capsule No. 18](missions/usa/mercury/flights/ma-7-aurora-7/model/vehicle.py) · [its cabin](missions/usa/mercury/vehicles/mercury_cabin_18.py) · [Atlas](missions/usa/mercury/vehicles/atlas_lv3b.py) |
| Vostok 3 | USSR | 11 August 1962 | [flight](missions/ussr/vostok/flights/vostok-3/README.md) · [spacecraft](missions/ussr/vostok/flights/vostok-3/spacecraft.md) · [the 3KA](missions/ussr/vostok/vehicles/vostok-3ka.md) · [launch vehicle](missions/ussr/vostok/vehicles/vostok-8k72k.md) | [flight's fit](missions/ussr/vostok/flights/vostok-3/model/vehicle.py) · [spacecraft](missions/ussr/vostok/vehicles/vostok_3ka.py) · [launch vehicle](missions/ussr/vostok/vehicles/vostok_8k72k/__init__.py) |
| Vostok 4 | USSR | 12 August 1962 | [flight](missions/ussr/vostok/flights/vostok-4/README.md) · [spacecraft](missions/ussr/vostok/flights/vostok-4/spacecraft.md) · [the 3KA](missions/ussr/vostok/vehicles/vostok-3ka.md) · [launch vehicle](missions/ussr/vostok/vehicles/vostok-8k72k.md) | [flight's fit](missions/ussr/vostok/flights/vostok-4/model/vehicle.py) · [spacecraft](missions/ussr/vostok/vehicles/vostok_3ka.py) · [launch vehicle](missions/ussr/vostok/vehicles/vostok_8k72k/__init__.py) |
| Mercury-Atlas 8, *Sigma 7* | USA | 3 October 1962 | [flight](missions/usa/mercury/flights/ma-8-sigma-7/README.md) · [spacecraft](missions/usa/mercury/flights/ma-8-sigma-7/spacecraft.md) · [launch vehicle](missions/usa/mercury/vehicles/atlas-lv3b.md) · [where it flew from](missions/usa/places/cape-canaveral/lc-14.ts) | [capsule No. 16](missions/usa/mercury/flights/ma-8-sigma-7/model/vehicle.py) · [its cabin](missions/usa/mercury/vehicles/mercury_cabin_16.py) · [Atlas](missions/usa/mercury/vehicles/atlas_lv3b.py) |
| Mercury-Atlas 9, *Faith 7* | USA | 15 May 1963 | [flight](missions/usa/mercury/flights/ma-9-faith-7/README.md) · [spacecraft](missions/usa/mercury/flights/ma-9-faith-7/spacecraft.md) · [launch vehicle](missions/usa/mercury/vehicles/atlas-lv3b.md) · [where it flew from](missions/usa/places/cape-canaveral/lc-14.ts) | [capsule No. 20](missions/usa/mercury/flights/ma-9-faith-7/model/vehicle.py) · [its cabin](missions/usa/mercury/vehicles/mercury_cabin_20.py) · [Atlas](missions/usa/mercury/vehicles/atlas_lv3b.py) |
| Vostok 5 | USSR | 14 June 1963 | [flight](missions/ussr/vostok/flights/vostok-5/README.md) · [spacecraft](missions/ussr/vostok/flights/vostok-5/spacecraft.md) · [the 3KA](missions/ussr/vostok/vehicles/vostok-3ka.md) · [launch vehicle](missions/ussr/vostok/vehicles/vostok-8k72k.md) | [flight's fit](missions/ussr/vostok/flights/vostok-5/model/vehicle.py) · [spacecraft](missions/ussr/vostok/vehicles/vostok_3ka.py) · [launch vehicle](missions/ussr/vostok/vehicles/vostok_8k72k/__init__.py) |
| Vostok 6 | USSR | 16 June 1963 | [flight](missions/ussr/vostok/flights/vostok-6/README.md) · [spacecraft](missions/ussr/vostok/flights/vostok-6/spacecraft.md) · [the 3KA](missions/ussr/vostok/vehicles/vostok-3ka.md) · [launch vehicle](missions/ussr/vostok/vehicles/vostok-8k72k.md) | [flight's fit](missions/ussr/vostok/flights/vostok-6/model/vehicle.py) · [spacecraft](missions/ussr/vostok/vehicles/vostok_3ka.py) · [launch vehicle](missions/ussr/vostok/vehicles/vostok_8k72k/__init__.py) |
| Voskhod 1 | USSR | 12 October 1964 | [flight](missions/ussr/voskhod/flights/voskhod-1/README.md) · [spacecraft](missions/ussr/voskhod/flights/voskhod-1/spacecraft.md) · [the Voskhod](missions/ussr/voskhod/vehicles/voskhod.md) · [launch vehicle](missions/ussr/voskhod/vehicles/voskhod-11a57.md) · [what the crew wore](missions/ussr/voskhod/crew/flight-suit.md) | [flight's fit](missions/ussr/voskhod/flights/voskhod-1/model/vehicle.py) · [spacecraft](missions/ussr/voskhod/vehicles/voskhod.py) · [launch vehicle](missions/ussr/voskhod/vehicles/voskhod_11a57/__init__.py) · [crew](missions/ussr/voskhod/crew/flight_suit.py) |
| Voskhod 2 | USSR | 18 March 1965 | [flight](missions/ussr/voskhod/flights/voskhod-2/README.md) · [spacecraft](missions/ussr/voskhod/flights/voskhod-2/spacecraft.md) · [the Voskhod](missions/ussr/voskhod/vehicles/voskhod.md) · [launch vehicle](missions/ussr/voskhod/vehicles/voskhod-11a57.md) · [suit](missions/ussr/voskhod/crew/berkut.md) | [flight's fit](missions/ussr/voskhod/flights/voskhod-2/model/vehicle.py) · [spacecraft](missions/ussr/voskhod/vehicles/voskhod.py) · [launch vehicle](missions/ussr/voskhod/vehicles/voskhod_11a57/__init__.py) · [suit](missions/ussr/voskhod/crew/berkut.py) |
| Gemini-Titan 3, "Molly Brown" | USA | 23 March 1965 | [flight](missions/usa/gemini/flights/gt-3/README.md) · [spacecraft](missions/usa/gemini/flights/gt-3/spacecraft.md) · [launch vehicle](missions/usa/gemini/vehicles/titan-ii-glv.md) · [where it flew from](missions/usa/places/cape-canaveral/lc-19.ts) | [spacecraft No. 3 on GLV-3](missions/usa/gemini/flights/gt-3/model/vehicle.py) · [the Gemini spacecraft](missions/usa/gemini/vehicles/gemini_spacecraft.py) · [Titan II](missions/usa/gemini/vehicles/titan_ii_glv.py) |
| Gemini-Titan 4 (Gemini IV) | USA | 3 June 1965 | [flight](missions/usa/gemini/flights/gt-4/README.md) · [spacecraft](missions/usa/gemini/flights/gt-4/spacecraft.md) · [launch vehicle](missions/usa/gemini/vehicles/titan-ii-glv.md) · [where it flew from](missions/usa/places/cape-canaveral/lc-19.ts) | [spacecraft No. 4 on GLV-4](missions/usa/gemini/flights/gt-4/model/vehicle.py) · [the Gemini spacecraft](missions/usa/gemini/vehicles/gemini_spacecraft.py) · [Titan II](missions/usa/gemini/vehicles/titan_ii_glv.py) |
| Gemini-Titan 5 (Gemini V) | USA | 21 August 1965 | [flight](missions/usa/gemini/flights/gt-5/README.md) · [spacecraft](missions/usa/gemini/flights/gt-5/spacecraft.md) · [launch vehicle](missions/usa/gemini/vehicles/titan-ii-glv.md) · [where it flew from](missions/usa/places/cape-canaveral/lc-19.ts) | [spacecraft No. 5 on GLV-5](missions/usa/gemini/flights/gt-5/model/vehicle.py) · [the Gemini spacecraft](missions/usa/gemini/vehicles/gemini_spacecraft.py) · [Titan II](missions/usa/gemini/vehicles/titan_ii_glv.py) |
| Gemini-Titan 7 (Gemini VII) | USA | 4 December 1965 | [flight](missions/usa/gemini/flights/gt-7/README.md) · [spacecraft](missions/usa/gemini/flights/gt-7/spacecraft.md) · [launch vehicle](missions/usa/gemini/vehicles/titan-ii-glv.md) · [where it flew from](missions/usa/places/cape-canaveral/lc-19.ts) | [spacecraft No. 7 on GLV-7](missions/usa/gemini/flights/gt-7/model/vehicle.py) · [the Gemini spacecraft](missions/usa/gemini/vehicles/gemini_spacecraft.py) · [Titan II](missions/usa/gemini/vehicles/titan_ii_glv.py) |
| Gemini-Titan 6A (Gemini VI-A) | USA | 15 December 1965 | [flight](missions/usa/gemini/flights/gt-6a/README.md) · [spacecraft](missions/usa/gemini/flights/gt-6a/spacecraft.md) · [launch vehicle](missions/usa/gemini/vehicles/titan-ii-glv.md) · [where it flew from](missions/usa/places/cape-canaveral/lc-19.ts) | [spacecraft No. 6 on GLV-6](missions/usa/gemini/flights/gt-6a/model/vehicle.py) · [the Gemini spacecraft](missions/usa/gemini/vehicles/gemini_spacecraft.py) · [Titan II](missions/usa/gemini/vehicles/titan_ii_glv.py) |
| Gemini-Titan 8 (Gemini VIII) | USA | 16 March 1966 | [flight](missions/usa/gemini/flights/gt-8/README.md) · [spacecraft](missions/usa/gemini/flights/gt-8/spacecraft.md) · [launch vehicle](missions/usa/gemini/vehicles/titan-ii-glv.md) · [Agena target](missions/usa/gemini/vehicles/agena-target-vehicle.md) · [docking adapter](missions/usa/gemini/vehicles/target-docking-adapter.md) · [where it flew from](missions/usa/places/cape-canaveral/lc-19.ts) | [spacecraft No. 8 on GLV-8, and its target](missions/usa/gemini/flights/gt-8/model/vehicle.py) · [the Gemini spacecraft](missions/usa/gemini/vehicles/gemini_spacecraft.py) · [Titan II](missions/usa/gemini/vehicles/titan_ii_glv.py) · [Agena target](missions/usa/gemini/vehicles/agena_target_vehicle.py) · [docking adapter](missions/usa/gemini/vehicles/target_docking_adapter.py) |
| Gemini-Titan 9A (Gemini IX-A) | USA | 3 June 1966 | [flight](missions/usa/gemini/flights/gt-9a/README.md) · [spacecraft](missions/usa/gemini/flights/gt-9a/spacecraft.md) · [launch vehicle](missions/usa/gemini/vehicles/titan-ii-glv.md) · [ATDA](missions/usa/gemini/vehicles/atda.md) · [docking adapter](missions/usa/gemini/vehicles/target-docking-adapter.md) · [where it flew from](missions/usa/places/cape-canaveral/lc-19.ts) | [spacecraft No. 9 on GLV-9, and its target](missions/usa/gemini/flights/gt-9a/model/vehicle.py) · [the Gemini spacecraft](missions/usa/gemini/vehicles/gemini_spacecraft.py) · [Titan II](missions/usa/gemini/vehicles/titan_ii_glv.py) · [ATDA](missions/usa/gemini/vehicles/atda.py) · [docking adapter](missions/usa/gemini/vehicles/target_docking_adapter.py) |
| Apollo 7 | USA | 11 October 1968 | [flight](missions/usa/apollo/flights/apollo-7/README.md) · [CSM-101](missions/usa/apollo/flights/apollo-7/spacecraft.md) · [Saturn IB SA-205](missions/usa/apollo/vehicles/saturn-ib.md) | [launch stack and cutaway](missions/usa/apollo/flights/apollo-7/model/vehicle.py) · [command and service modules](missions/usa/apollo/vehicles/apollo_csm.py) · [Saturn IB](missions/usa/apollo/vehicles/saturn_ib.py) |
| Apollo 8 | USA | 21 December 1968 | [flight](missions/usa/apollo/flights/apollo-8/README.md) · [CSM-103](missions/usa/apollo/flights/apollo-8/spacecraft.md) · [Saturn V SA-503](missions/usa/apollo/vehicles/saturn-v.md) | [launch stack and lunar spacecraft](missions/usa/apollo/flights/apollo-8/model/vehicle.py) |
| Apollo 9 | USA | 3 March 1969 | [flight](missions/usa/apollo/flights/apollo-9/README.md) · [Gumdrop](missions/usa/apollo/flights/apollo-9/spacecraft.md) · [Spider](missions/usa/apollo/vehicles/lunar-module.md) | [SA-504 stack](missions/usa/apollo/flights/apollo-9/model/vehicle.py) · [deployed LM-3](missions/usa/apollo/flights/apollo-9/model/spider.py) |

## Programmes

What there is to build, in the order it flew. A flight's page says which of its places are built yet;
the next flights are listed in [missions/upcoming.ts](missions/upcoming.ts).

| Programme | Nation | Crewed flights | What it adds |
| --- | --- | --- | --- |
| Vostok | USSR | 1961 to 1963 | The first spacecraft; Baikonur |
| Mercury | USA | 1961 to 1963 | Redstone and Atlas; Cape Canaveral |
| Voskhod | USSR | 1964 to 1965 | Three aboard; the first spacewalk |
| Gemini | USA | 1965 to 1966 | Two aboard, Titan II, rendezvous and docking |
| Soyuz | USSR, Russia | 1967 onward | The longest-serving crewed spacecraft |
| Apollo | USA | 1968 to 1972 | Saturn IB and Saturn V; lunar orbit and the Moon |
| Salyut, Skylab, Apollo-Soyuz | USSR, USA | 1971 to 1986 | The first space stations |
| Space Shuttle, Mir | USA, USSR and Russia | 1981 to 2011 | A reusable orbiter; a station built in orbit |
| International Space Station | many | 1998 onward | A station crewed without a break since 2000 |
| Shenzhou and Tiangong | China | 2003 onward | China's crewed spacecraft and its own stations |
| Commercial crew | USA | 2020 onward | Crew Dragon and Starliner |
| Artemis | USA and partners | 2020s | Orion and the Space Launch System; back to the Moon |

The dates are the published ones; each flight's own record, with sources, is written when the
flight is built.

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

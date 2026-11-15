# Missions

The record, organised the way the history is: nation, programme, flight.

```
<nation>/<programme>/README.md                    the programme
<nation>/<programme>/flights/<flight>/README.md   one flight
<nation>/<programme>/flights/<flight>/spacecraft.md
<nation>/<programme>/flights/<flight>/flight.ts
<nation>/<programme>/flights/<flight>/model/<name>.py      vehicle, pad, crew
<nation>/<programme>/vehicles/  sites/  crew/              hardware shared between flights
```

| Nation | Programme | Flights modelled |
| --- | --- | --- |
| [USA](usa/) | [Project Mercury](usa/mercury/README.md) | [MR-3 *Freedom 7*](usa/mercury/flights/mr-3-freedom-7/README.md), [MR-4 *Liberty Bell 7*](usa/mercury/flights/mr-4-liberty-bell-7/README.md), [MA-6 *Friendship 7*](usa/mercury/flights/ma-6-friendship-7/README.md), [MA-7 *Aurora 7*](usa/mercury/flights/ma-7-aurora-7/README.md), [MA-8 *Sigma 7*](usa/mercury/flights/ma-8-sigma-7/README.md), [MA-9 *Faith 7*](usa/mercury/flights/ma-9-faith-7/README.md) |
| [USA](usa/) | [Project Gemini](usa/gemini/README.md) | [Gemini-Titan 3 "Molly Brown"](usa/gemini/flights/gt-3/README.md) |
| [USSR](ussr/) | [Vostok](ussr/vostok/README.md) | [Vostok 1](ussr/vostok/flights/vostok-1/README.md), [2](ussr/vostok/flights/vostok-2/README.md), [3](ussr/vostok/flights/vostok-3/README.md), [4](ussr/vostok/flights/vostok-4/README.md), [5](ussr/vostok/flights/vostok-5/README.md), [6](ussr/vostok/flights/vostok-6/README.md) |
| [USSR](ussr/) | [Voskhod](ussr/voskhod/README.md) | [Voskhod 1](ussr/voskhod/flights/voskhod-1/README.md), [Voskhod 2](ussr/voskhod/flights/voskhod-2/README.md) |

Which of a flight's places (Gallery, Launch site, Fly) are built, its page says.
The flights to come, in launch order, are in [upcoming.ts](upcoming.ts), which the front page
lists between the ones that are built; one drops out of it when its flight is added to
[index.ts](index.ts).

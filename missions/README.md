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
| [USA](usa/) | [Project Mercury](usa/mercury/README.md) | [MR-3 *Freedom 7*](usa/mercury/flights/mr-3-freedom-7/README.md); [MR-4 *Liberty Bell 7*](usa/mercury/flights/mr-4-liberty-bell-7/README.md): the vehicle, its launch site and its pilot; not yet flown; [MA-6 *Friendship 7*](usa/mercury/flights/ma-6-friendship-7/README.md), [MA-7 *Aurora 7*](usa/mercury/flights/ma-7-aurora-7/README.md) and [MA-8 *Sigma 7*](usa/mercury/flights/ma-8-sigma-7/README.md): each the vehicle, on its Atlas, in the Gallery |
| [USSR](ussr/) | [Vostok](ussr/vostok/README.md) | [Vostok 1](ussr/vostok/flights/vostok-1/README.md): the vehicle, its launch site as it stood that morning and its pilot; not yet flown; [Vostok 2](ussr/vostok/flights/vostok-2/README.md), [Vostok 3](ussr/vostok/flights/vostok-3/README.md) and [Vostok 4](ussr/vostok/flights/vostok-4/README.md): each its vehicle, in the Gallery |

Only Freedom 7 can be flown: Vostok 1 and Liberty Bell 7 have their launch sites and no trajectory
yet. The flights to come, in launch order, are in [upcoming.ts](upcoming.ts), which the front page
lists between the ones that are built; one drops out of it when its flight is added to
[index.ts](index.ts).

# The command and service module, put together (`apollo_csm.py`)

`apollo_csm.py` builds CSM-101 as one assembly: the service module's barrel, the CM/SM fairing, the four
reaction-control quads and the engine, and on top of them the command module from its own modules
([command-module.md](command-module.md), [pressure-vessel.md](pressure-vessel.md), [windows.md](windows.md),
[main-console.md](main-console.md), [dsky-front.md](dsky-front.md), [unitized-couch.md](unitized-couch.md),
[cabin-fittings.md](cabin-fittings.md)) and the service module's insides ([service-tanks.md](service-tanks.md)). Each
part is a top-level node named for its part in `flight.ts`.

It keeps the sources' inches and multiplies by `IN` once. Its stations are the Apollo integrated coordinate (XA) of
CSM-101's preflight reference, MIT R-547 (October 1966), Figure 1.4, p. 1-16, with the service module's own (Xs) for
the engine's attachment; the figures, each with its confidence, are tabled once in the flight's
[spacecraft.md](../flights/apollo-7/spacecraft.md), and quoted in `flight.ts`. The model's origin is the engine's nozzle
exit, XA 706, derived from those stations; no published overall length is fitted to.

What it does not draw: no docking probe and no high-gain antenna, which CSM-101 did not carry; and nothing of a lunar
module, which Apollo 7 did not carry.

## Simplifications and things still wrong

- The H-1 engines', the R-4D thrusters' and the escape motor's nozzles share one generic bell profile (`bell`: the
  wall drawn at 77, 36 and 23 per cent of the exit radius down its length), scaled to each one's published exit. Only
  the exits are documented; the shapes between are not any engine's own. The J-2's and the service engine's contours
  are their own (saturn-ib.md, service-tanks.md).
- `BELL_RIM`, the 0.3-inch lip on every such bell, is a display thickness, not a measured wall.
- The reaction-control quads stand at the preflight table's reference coordinates, which are not a surveyed housing's
  centre; their housings, brackets and individual nozzle mouths are estimated ([reaction-control.md](reaction-control.md)).
- The fairing is a derived closure between the command module's profile and the barrel; its radiators are drawn, its
  fasteners and thermal finish are not.
- The seven inches between the service module's top (XA 993) and the command module's datum (XA 1000) are a difference
  of datums, not a gap: the fairing bridges them.

# Saturn IB SA-205 — exterior study

This build is **SA-205 on Apollo 7**, not an early Saturn I or a later Skylab launcher.
Source: NASA *Apollo 7 press kit*, 68-168K, pp. 31–33 and Figure 25a (printed p. 25a),
and NASA photograph S68-48788, the Apollo 7 launch, viewed at NASA’s Apollo 50th photo gallery.

The script `saturn_ib.py` keeps inches; published feet are multiplied by 12 before geometry
is converted once with `IN`. `flight.ts` quotes the same dimensions with confidence.

| Figure | Source units | Confidence / source |
|---|---:|---|
| Full Apollo 7 stack, engine exit to Q-ball | 224 ft | documented, Figure 25a, rounded |
| S-IB stage length | 80.2 ft | documented, p. 32, rounded |
| Outer tanks | 8 × 70 in diameter | documented, p. 32 |
| Centre oxygen tank | 105 in diameter | documented, p. 32 |
| Tank cluster pitch radius | 93 in | estimated, not a documented tank station |
| S-IVB stage envelope | 58.4 ft | documented, p. 32, rounded |
| Interstage share of that envelope | 220 in | estimated from Figure 25a |
| IU height / diameter | 36 / 260 in | documented, p. 33 |
| Spacecraft adapter length | 28 ft | documented, p. 26 |
| Adapter aft / forward diameter | 260 / 154 in | documented, p. 26 |

The source describes the S-IB stage as 21.5 ft across while the instrument unit is 260 in;
the first stage’s tank cluster here is 256 in across (2 × (93 + 35)), with its forward ring
at the 260-inch interface. This approximate clustering is **estimated**, not a reconciliation
of the rounded source dimensions. The fins reach beyond the body.

S-IB top is Z962.4 in, S-IVB top Z1663.2, IU top Z1699.2 and adapter top Z2035.2.
These are arithmetic sums of rounded envelopes, not independently documented interface stations.
The SM barrel stands at the adapter’s top; its engine projects inside it. The command-module
base is Z2189.2 in and its forward deck Z2333.2. The escape motor ends at Z2688 (224 ft).
Its remaining height is allocated within that envelope by estimate. **Closing the overall
length does not validate the individual hardware stations.**

The studio’s exploded view is an illustration. Nothing here claims the timing or trajectories
of the hardware’s departure. No simulator or launch site is provided.

## Simplifications and things still wrong

- Fin profiles, nozzle contours, tank domes, pitch radii and structural stations are estimated.
- No tank interior, common bulkhead, detailed feed pipes, turbopumps, H-1 exhaust ducts,
  ullage rockets, vents, detailed APS engines, hold-downs or separation mechanisms.
- Stiffener count and size are estimated. Paint boundaries and lettering locations are estimated
  from S68-48788; the fin paint and small markings still need closer photographic reconstruction.
- IU has no internal electronics, antennas or access fittings.
- Adapter is one closed shell; no hinged forward panels, internal structure or rendezvous target yet.
- No LC-34 pedestal, umbilical tower, service structure or site scenery.
- No mass, thrust, aerodynamic or flight sequence data; the stack cannot be flown yet.

## Corrections after the first preview

The initial four S-IVB conduits were unsourced and lay directly over the USA lettering.
They have been removed, not moved to another guessed azimuth. The actual main and auxiliary
tunnels await their documented layout. The exploded exhibit now separates along the vehicle
axis, with higher parts moving first and farther, so the cover and adjacent modules clear
one another rather than crossing skins on diagonal paths. These offsets are an exhibit
layout, not historical dimensions or separation trajectories.

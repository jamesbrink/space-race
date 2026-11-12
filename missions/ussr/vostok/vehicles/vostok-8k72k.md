# Vostok-K (8K72K): not built yet

The launch vehicle of the crewed Vostoks: Korolev's R-7 with a third stage, Block E. **Nothing of it
is modelled.** This file records what has been read so far, so that whoever builds it starts from
the figures and their disagreements instead of from memory. Until it is built, Vostok 1 is shown as
a spacecraft alone.

## What has been read

Keys as in [docs/sources.md](../../../../docs/sources.md), "Vostok". None of these is a primary
document: no OKB-1 drawing or table of the launcher has been read.

| Item | Value | Confidence if used today | Basis |
| --- | --- | --- | --- |
| Length | 38.36 m | documented | Siddiqi, *Challenge to Apollo*, table of launch vehicles. RussianSpaceWeb also quotes 41 m from another source |
| Liftoff mass | 287 t | documented | Siddiqi, same table. Also in print: 290.5 t (RussianSpaceWeb), 281.4 t (Encyclopedia Astronautica) |
| Base diameter | 10.3 m | documented | Siddiqi, same table |
| Liftoff thrust | 409.8 tf | documented | Siddiqi, same table |
| Core (Block A) | 28.75 m long, 2.95 m across | not yet: secondary | RussianSpaceWeb; Russian Wikipedia |
| Strap-ons (Blocks B, V, G, D) | 19.8 m long, 2.68 m across | not yet: secondary | as the core |
| Block E | 2.84 m long, 2.56 m across; 7,775 kg fuelled, 1,440 kg empty | not yet: secondary, read through a summary | Encyclopedia Astronautica. RussianSpaceWeb gives 1.34 t dry |
| RD-0109 (Block E's engine) | 54.5 kN, about 324 s specific impulse, 430 s burn, four steering nozzles on turbopump exhaust | not yet: the sources disagree with themselves | Encyclopedia Astronautica gives 323.5 to 326 s and 365 to 430 s on different pages; the steering nozzles are from Russian Wikipedia, uncited |
| Spacecraft with Block E | 6.17 t, 7.35 m | documented | Great Soviet Encyclopedia, «Восток» |
| Fairing | 2.7 m greatest diameter, about 0.8 t, two halves, a round opening over hatch No. 1 for ejection on the pad | not yet: secondary | RussianSpaceWeb. Its length has not been found: about 2.2 sphere diameters on OKB-1's stack drawing |
| This flight's vehicle | No. E103-16; RD-0109 No. 17 | documented | Siddiqi, launch log |

On 12 April 1961 the core burned to T+300 s and Block E to T+676 s (Siddiqi); a wrongly assembled
valve on the RD-0109 let the stage burn long, which is why the apogee was 327 km instead of 230
(Siddiqi, The Space Review, 2015).

## What building it needs

- A dimensioned drawing of the 8K72K, or of the R-7 family with the Block E stack: stage stations,
  the strap-ons' taper, the tail fins and vernier chambers, Block E's lattice adapter. The
  references to seek are in "Known, not yet read".
- The fairing's length and split line, and the adapter the instrument module's aft cone sits in
  (a lattice, on OKB-1's drawing «Объект 3КА с блоком Е изделия 8К72»).
- For the simulator: masses and propellant loads by stage, thrust and specific impulse at sea
  level and in vacuum for the RD-107, RD-108 and RD-0109, the pitch programme, the staging times.
  The four figures above are the only ones held as documented.

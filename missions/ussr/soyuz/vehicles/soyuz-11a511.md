# Soyuz launch vehicle (11A511)

Soyuz 1 rode RN 03, the first-generation 11A511 with a 7K-OK and the original SAS launch
escape system. Mishin's preparation notes call the launcher RN 03, as reproduced by
[Zak, “Preparing the Soyuz-1 mission”](https://www.russianspaceweb.com/soyuz1-preparations.html).
Each flight builds its spacecraft above [soyuz_11a511.py](soyuz_11a511.py). All stations
are in millimetres from the plane of the main nozzle exits, with the spacecraft's aft
at station 35,695 in this reconstruction.

## Sources

- **E**. RKK Energia, dimensioned cutaway of the 11A511, reproduced by [Andrew LePage,
  “The Avoidable Tragedy of Soyuz 1”](https://www.drewexmachina.com/2017/04/26/soyuz-1-tragedy/),
  the launcher cutaway in “The Origins of Soyuz”.
- **S**. Asif Siddiqi, [*Challenge to Apollo*, NASA SP-2000-4408, p. 469](https://www.govinfo.gov/content/pkg/GOVPUB-NAS-PURL-gpo156748/pdf/GOVPUB-NAS-PURL-gpo156748.pdf).
  Names the 11A511, the inherited 11A57 configuration and the RD-0110. Gives the length
  with a Soyuz as 49.91 m.
- **Z**. Anatoly Zak, [“Emergency escape system of the Soyuz spacecraft”](https://www.russianspaceweb.com/soyuz_sas.html),
  “Development history” and the illustration of the original SAS credited to G. S.
  Narimanov, ed., *Sovetskie pilotiruemye korabli i orbitalnye stantsii* (Moscow, 1976).
  The early 7K-OK SAS has its shroud in a second illustration
  showing the change at Soyuz 12. Zak's [R-7 family history](https://www.russianspaceweb.com/soyuz_lv.html)
  reproduces a period photograph of an early 11A511 lifting off.

The type survey [«Первые Союзы», pp. 82–83](https://epizodsspace.airbase.ru/bibl/mpk/mpk.pdf) gives a shorter 49.012 m and a 3.000 m head-section diameter. The gallery follows the explicitly dimensioned Energia drawing for the overall height. Intermediate stations read from its image are estimates.

## Dimensions and model

| Item | In the model | Confidence and basis |
| --- | --- | --- |
| Nozzle datum to escape-tower tip | 49,913 mm | **Documented**, E. S rounds to 49.91 m. The inherited booster geometry projects 52 mm below the datum |
| Span over the rudders | 10,412 mm | **Documented**, E. The model extends each inherited rudder along its own radial axis to fit this span. The exact outline and the placement of the strap-ons are **estimated** |
| Block A top | 27,622 mm | **Documented**, E. The model extends the upper cylindrical section of the inherited core to this station |
| Lattice top | 28,300 mm | **Estimated** off E. The lattice is drawn with the inherited builder, shortened to reach this station |
| Block I body | 6,745 mm long, 2,660 mm diameter | **Documented**, E. The stage's exterior, skirt and engines use the inherited [Voskhod Block I](../../voskhod/vehicles/voskhod-11a57.md) geometry |
| Block I adapter | 650 mm | **Estimated** from E's narrow band under the payload, including the support for its fairing |
| Fairing | foot at 35,695 mm, cylinder 2,920 mm across, shoulder at 43,500 mm, cone ends at 45,250 mm | **Estimated** off E and adjusted to enclose the model's launch-stowed spacecraft |
| Fairing access cover | 41,435 mm from the nozzle datum | **Estimated**, directly outside the model's orbital boarding hatch, which is at 5,740 mm above the spacecraft aft. The cover's outline is illustrative |
| Launch escape tower | 4,663 mm from fairing lip to tip | **Derived** from the estimated fairing end and documented overall height. The broad shrouded base, central stalk and dark ring below the collar are **estimated** from Z and E |
| Liftoff thrust | 411.1 tf | **Documented**, S. This is a historical figure for the type |

In the gallery the escape tower is the tip, with two folded grid stabilizers on each
fairing half, placed at the base of the section that would leave with the crew during
an abort. Block I and its three-part aft section stand above the lattice interstage.
The core and four strap-ons take their shapes and colours from the Vostok family's
models. The short separation demonstration in the gallery shows the normal order and
uses illustrative movement distances.

## As flown

The orbital simulator flies the type from its own table of figures in «Мировая пилотируемая космонавтика» (2005), p. 83:
each block's mass, load and engine, the head block's 8,510 kg with its ship, the escape tower let go at 157 s and the
fairing at 161 s, and the escape modes by the second ([soyuz-11a511-flown.ts](soyuz-11a511-flown.ts)). What it does not
give is the 11A57's, the 8K72K's or estimated, and says so: the drag, the steering law, the throttles at the end of the
strap-ons' and the core's burns, the aft section, the split of the head block between the tower and the fairing. The
table's strap-on row prints 252 s at the ground, which its own thrusts and 313 s in vacuum do not fit on one nozzle:
257.5 s is derived.

### The 7K-T era

The 7K-T was heavier than the 7K-OK, and MPK has the 11A511 uprated for it: «Стартовая масса 7КТ увеличилась до 6700 кг
(масса 7КОК – 6400–6500 кг), поэтому РН «Союз» (11А511) была доработана с целью увеличения ее грузоподъемности» (p. 224);
p. 264 has it launching 7K-OK and 7K-T «массой до 6.6 т». How it was uprated is in nothing read.

Two steps, in order:

1. **The borrowed estimates first.** The vehicle as given above carries Soyuz 3's 6,575 kg to 183.5 km with 96 kg left in
   Block I, and Soyuz 10's and 12's ships not to their orbits. No documented figure of the 11A511's own was found to replace
   any of the 8K72K's estimates (the drag, the throttles at the end of the strap-ons' and the core's burns, the law):
   Encyclopedia Astronautica's stage table is tertiary and disagrees with MPK's masses, and its payload, 6,450 kg to a
   200 km orbit at 51.6°, agrees with what the vehicle as modelled carries. Nothing was changed.
2. **The uprating, sized from the documented capability** (`UPRATING_7KT`, `BLOCK_I_7KT` in
   [soyuz-11a511-flown.ts](soyuz-11a511-flown.ts)). The reference orbit is the type's planned insertion, 204.3 by 225.0 km
   at 51.69° (Mishin's flight plan for the active 7K-OK, Soyuz 3's, via Zak), the one nominal insertion of the type read:
   no 7K-T one was found. Flown on Soyuz 3's instants from Site 31 in the standard air and cut where it reaches that orbit's
   period, the 7K-OK era's vehicle carries 6,534 kg there; MPK's 6,700 kg is **166 kg more** (derived). Which figure carries
   it is **estimated**: Block I's own mass, the last stage, where a kilogram saved is a kilogram carried, because the 11A511's
   gains over the 11A57 were of that kind (MPK, p. 82: the cable network lightened, the telemetry replaced). It is sized on
   no 7K-T flight's orbit: Soyuz 10's and 12's insertion checks then hold or miss on their own. tests/soyuz-uprating.test.mjs
   finds the 6,534 kg again and holds the 7K-T era's vehicle to 6,700 kg; Soyuz 3 flies the 7K-OK era's, unchanged.

### The 11A511U (Soyuz-U)

Soyuz 16 was the first crew to fly the 11A511U, and Soyuz T-2 flew it too (Siddiqi, Table IA: "11A511U"; McDowell's launch
log: K15000-014 and Zh15000-196; MPK, p. 265: «это был первый запуск пилотируемого корабля с помощью модернизированной РН
11А511У «Союз-У»»). It was made one vehicle for the crewed ships and the uncrewed satellites in place of six (MPK, p. 264): new
engines on the strap-ons and the core, the 11D512 and the 11D511, run longer at their boosted thrust (lpre.de, from Energomash),
and a smaller, lighter control system on the core. «Общие технические характеристики РН изменились незначительно»: with the
7K-TM it was 49.313 m long and weighed 308 t, and it «позволяло увеличить массу корабля почти на 200 кг» (MPK, p. 264; RKK
Energia's history, ch. 6, «примерно на 200 кг»). It is flown as [soyuz-11a511u-flown.ts](soyuz-11a511u-flown.ts) gives it:

- **The engines' thrusts are the type's own table's** (RKK Energia 1946–1996, ch. 6, «Ракета-носитель 11А511У (У-2) с кораблями
  7К-СТ. Основные характеристики»): the first stage 413.3 tf at the ground and 505.3 tf in vacuum, the core 99.7 tf in vacuum
  (and 79.4 tf at the ground, lpre.de's), the strap-ons what that leaves, 83.5 and 101.4 tf each. Their impulses in vacuum
  are the makers' as lpre.de tabulates them, 314.6 and 315.9 s, and at the ground what the thrusts leave on one nozzle.
- **The blocks' masses and loads are the 11A511's** (MPK, p. 83), assumed: no figure of the 11A511U's own was found.
- **Its gain, sized from its documented capability**: the type's table has a Soyuz T of 6,855 kg put on an orbit of a mean
  height of 220 km at 51.6°. On the 11A511's blocks with its own engines, flown on Soyuz 16's instants from Site 1 in the
  standard air to that mean height (its perigee the type's planned 204.3 km), the vehicle carries 6,545 kg: **310 kg short**.
  Nothing found replaces an estimate (the throttles at the end of the strap-ons' and the core's burns are still the 8K72K's
  readings, though the 11A511U ran its engines longer at their boost), so the 310 kg is the one unknown, `derived` from the
  documented capability, and which figure carries it is `estimated`: Block I's own mass, a kilogram there a kilogram of ship,
  as the 7K-T era's uprating above. Off the core, where MPK says mass was taken out, it would take about a tonne, more than its
  control system weighed by any reckoning. It is sized on no flight's orbit: tests/soyuz-11a511u.test.mjs finds the 6,545 kg
  again and holds the vehicle to the 6,855 kg. Soyuz 16's and T-2's insertion checks then hold or miss on their own.
- **The second-generation escape system**: a stronger tower motor, and two pairs of motors on the fairing that carry the head
  block up and aside between the tower's going and the fairing's, so that there was no moment without an escape; the tower went
  at 123 s «вместо 160 с» (RKK Energia, ch. 6, for the Soyuz T; the first Soyuz's table has 157 s; MPK, p. 264, has the system on the 7K-TM's head block; Zak has it
  first flown on Soyuz 19). Neither escape is flown; the head block's mass is the first tower's estimate.

## What the model gets wrong or leaves out

- The detailed lower stack follows the earlier R-7 model. Its engines, paint and frost remain
  a stand-in for the 1967 vehicle. The rudder tips and Block A top match the cutaway
  dimensions. The booster load points and lower tie positions follow the inherited
  [Vostok 8K72K geometry](../../vostok/vehicles/vostok-8k72k.md).
- Block I's RD-0110 is represented by the existing four-chamber RD-0108 exterior. The shape of
  the 1967 engine, tank stations, aft-skirt seams and latch positions remain approximations.
- The conical shoulder and launch escape silhouette follow the early references. The
  station of the fairing hatch, access panel, join lines, tower openings, paint boundaries
  and grid dimensions are estimates. The fairing's split joints, access latches and
  attachment to the spacecraft are simplified. The internal SAS mechanisms are omitted.
- The 7K-T era's uprating is a size on one figure (Block I's mass), not the change that was made, which is not known.
  The tower without its shroud from Soyuz 12 on flies the earlier tower's estimated mass.
- The 11A511U's gain is likewise a size on Block I's mass: what each of its changes gave is not known. Its blocks' masses are
  the 11A511's, its engines' throttles at the ends of their burns the 8K72K's readings, and its heavier escape tower flies the
  first tower's estimated mass.

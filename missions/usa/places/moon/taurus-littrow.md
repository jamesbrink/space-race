# Taurus–Littrow, Apollo 17

Where Challenger came down on 11 December 1972, in the valley of Taurus–Littrow between the North and South Massifs.
Its position is [taurus-littrow.ts](taurus-littrow.ts); its ground `public/lunar/taurus-littrow.terrain.bin` (the rover's)
and `.descent.bin`.

The site knows nothing of the flight that landed there: a flight chooses it (C2), as a flight from the Cape chooses its pad.

## The site's frame

| | | Basis |
| --- | --- | --- |
| Origin | 20.1911° N, 30.7723° E, to 3.5 m: the descent stage of Challenger (A17_LM), from averaged mapping-orbit NAC images | documented: Wagner et al. (2017), as LROC publishes them (docs/sources.md, "The Moon's landing sites"), in the Moon's mean Earth/polar axis frame on the IAU's sphere of 1737.4 km |
| Height | -2626.69 m above the sphere of 1737.4 km: the ground under the LM | derived: the plane the bake fits to the stereo 7 to 10 m round the LM, at the LM (2.6° of slope there) |
| Sea level | 0 | by definition: the Moon has no sea, and every height is from the sphere |
| +X | east, 090° | by definition: the frame the terrain is baked in; +Y is the local vertical, +Z south |
| Clock | UTC | by definition |

**Against the altimeter.** SLDEM2015 (LOLA's heights, placed by SELENE's stereo, 59 m pixels) reads -2628.0 m at the
LM and -2627.7 m in the descent strip's 250 m cell there: 1.3 m from the stereo's ground
(tests/lunar-sites.test.mjs holds the two within 8 m at every site).

## Its ground

- **Round the LM**: nested square grids of 2, 8, 32, 128 and 512 m, 128 squares a side (out to 32.8 km), centred 12 m east of the LM, where the rover is parked in its gallery scene (estimated); the grids are byte for byte those the rover had:
  [NAC_DTM_APOLLO17_1](https://data.lroc.im-ldi.com/lroc/view_rdr_product/NAC_DTM_APOLLO17_1), a 2 m strip round Challenger, laid over [NAC_DTM_APOLLO17](https://data.lroc.im-ldi.com/lroc/view_rdr_product/NAC_DTM_APOLLO17), the valley at 5 m, with LOLA's 64 ppd heights beyond it.
- **Along the descent**: a strip 560 km long and 60 km wide of SLDEM2015, 250 m cells, from 520 km back along the track to
  40 km past the LM. Its heading at the LM: 270.51° (derived): the great circle from powered descent initiation, 19.13° N 48.75° E (Apollo 17 Mission Report, JSC-07904, table 3-III), 514 km uprange, to the LM.

## What is simplified

- **The ground under the pads is a plane.** The stereo's 2 m pixels cannot resolve the soil under the four pads, and the LM
  itself may stand in the model: the bake fits a plane to the terrain 7 to 10 m from the LM's middle and lays it under the
  pads, blended into the stereo by 10.5 m. The LM's own tilt as it stood is not in it.
- **The ground is as LRO saw it**, in 2009 to 2015: the descent stage stands on it and the soil its engine swept is in it,
  and the stereo is of that, not of the ground the LM came down on.
- **Beyond the stereo** the grids take LOLA's 64 ppd heights (474 m a pixel): nothing smaller than that is in them, and
  the coarser grids (128 and 512 m) draw the horizon from it.
- **The descent strip is a straight track**: the great circle through the LM on the heading flown there, 60 km wide. The
  descent's own ground track bent off it between where it began and where it ended (the guidance's steering, the crew's
  redesignations, the hand-flown last minutes); where its start is read (Apollo 11, 14, 16 and 17) the line runs through both. Its cells are SLDEM2015 averaged over 250 m: nothing smaller than a cell is in
  them, and SLDEM2015's own heights are good to a few metres.
- **Two frames meet in the heading.** The mission reports' positions are in the selenographic frame of their day, a
  kilometre or so from the mean Earth frame the LM's position is in: over a descent of some 500 km that turns the heading
  by about a tenth of a degree.
- **No surface time.** The ground does not change: no footprints, no tracks, nothing set down. That is for the surface
  phase (the plan's C3).

# Tranquility Base, Apollo 11

Where Eagle came down on 20 July 1969, in the south-west of the Sea of Tranquility (Mare Tranquillitatis). Its
position on the Moon is [tranquility.ts](tranquility.ts) (`LunarSiteDef`, through [site.ts](site.ts)); its ground is
`public/lunar/tranquility.terrain.bin` and `.descent.bin` ([tools/lunar-terrain.py](../../../../tools/lunar-terrain.py)).

The site knows nothing of the flight that landed there: a flight chooses it (C2), as a flight from the Cape chooses its pad.

## The site's frame

| | | Basis |
| --- | --- | --- |
| Origin | 0.67416° N, 23.47314° E, to 0.3 m: the descent stage of Eagle (A11_LM), from averaged mapping-orbit NAC images and laser ranging to the retroreflector | documented: Wagner et al. (2017), as LROC publishes them (docs/sources.md, "The Moon's landing sites"), in the Moon's mean Earth/polar axis frame on the IAU's sphere of 1737.4 km |
| Height | -1927.81 m above the sphere of 1737.4 km: the ground under the LM | derived: the plane the bake fits to the stereo 7 to 10 m round the LM, at the LM (2.7° of slope there) |
| Sea level | 0 | by definition: the Moon has no sea, and every height is from the sphere |
| +X | east, 090° | by definition: the frame the terrain is baked in; +Y is the local vertical, +Z south |
| Clock | UTC | by definition |

**Against the altimeter.** SLDEM2015 (LOLA's heights, placed by SELENE's stereo, 59 m pixels) reads -1930.0 m at the
LM and -1927.2 m in the descent strip's 250 m cell there: 2.2 m from the stereo's ground
(tests/lunar-sites.test.mjs holds the two within 8 m at every site).

## Its ground

- **Round the LM**: nested square grids of 2, 8, 32, 128 and 512 m, 128 squares a side (out to 32.8 km), centred on the LM:
  [NAC_DTM_APOLLO11](https://data.lroc.im-ldi.com/lroc/view_rdr_product/NAC_DTM_APOLLO11), 2 m a pixel, with LOLA's 64 ppd heights beyond it.
- **Along the descent**: a strip 560 km long and 60 km wide of SLDEM2015, 250 m cells, from 520 km back along the track to
  40 km past the LM. Its heading at the LM: 268.64° (derived): the great circle from powered descent initiation, 1.02° N 39.39° E (Apollo 11 Mission Report, MSC-00171, table 7-II), 483 km uprange, to the LM.

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

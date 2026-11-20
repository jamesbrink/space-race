# Ocean of Storms, Apollo 12

Where Intrepid came down on 19 November 1969, beside Surveyor crater in the Ocean of Storms (Oceanus
Procellarum), a walk from Surveyor 3, which its crew went to. Its position is [ocean-of-storms.ts](ocean-of-storms.ts); its ground
`public/lunar/ocean-of-storms.terrain.bin` and `.descent.bin`.

The site knows nothing of the flight that landed there: a flight chooses it (C2), as a flight from the Cape chooses its pad.

## The site's frame

| | | Basis |
| --- | --- | --- |
| Origin | 3.0128° S, 23.4219° W, to 2.2 m: the descent stage of Intrepid (A12_LM), from averaged mapping-orbit NAC images | documented: Wagner et al. (2017), as LROC publishes them (docs/sources.md, "The Moon's landing sites"), in the Moon's mean Earth/polar axis frame on the IAU's sphere of 1737.4 km |
| Height | -1422.77 m above the sphere of 1737.4 km: the ground under the LM | derived: the plane the bake fits to the stereo 7 to 10 m round the LM, at the LM (5.0° of slope there) |
| Sea level | 0 | by definition: the Moon has no sea, and every height is from the sphere |
| +X | east, 090° | by definition: the frame the terrain is baked in; +Y is the local vertical, +Z south |
| Clock | UTC | by definition |

**Against the altimeter.** SLDEM2015 (LOLA's heights, placed by SELENE's stereo, 59 m pixels) reads -1424.9 m at the
LM and -1424.9 m in the descent strip's 250 m cell there: 2.1 m from the stereo's ground
(tests/lunar-sites.test.mjs holds the two within 8 m at every site).

## Its ground

- **Round the LM**: nested square grids of 2, 8, 32, 128 and 512 m, 128 squares a side (out to 32.8 km), centred on the LM:
  [NAC_DTM_APOLLO12](https://data.lroc.im-ldi.com/lroc/view_rdr_product/NAC_DTM_APOLLO12), 2 m a pixel: a small model, 2.7 km east to west and 4.9 km north to south, so the grids are LOLA's past it, with LOLA's 64 ppd heights beyond it.
- **Along the descent**: a strip 560 km long and 60 km wide of SLDEM2015, 250 m cells, from 520 km back along the track to
  40 km past the LM. Its heading at the LM: 284.2° (estimated): powered descent began at 6.76° S (Apollo 12 Mission Report, MSC-01855, §5's table of trajectory parameters; the scan loses the longitude), taken 482 km uprange as Apollo 11's was; a descent of 450 to 495 km would move the heading by 0.3 to 1°.

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
- **The heading here is an estimate**: the start of the descent's longitude is lost in every scan read (docs/sources.md,
  "The Moon's landing sites"). An error of a degree moves the strip's far end 9 km across, inside its 30 km half-width.

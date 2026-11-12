# Site 1, Tyuratam ("Gagarin's Start"): not built yet

The R-7's first launch complex at NIIP-5, the range later called the Baikonur Cosmodrome. Sputnik,
Vostok 1 and every crewed Vostok left from it. **Nothing of the place is modelled.** Only its
position on the Earth is recorded, in [site-1.ts](site-1.ts), so that a flight from it has the
right sky and the right clock.

## Where it is

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Latitude | 45.92025° N | documented | OpenStreetMap way 172571408, «Гагаринский старт»: the middle of its outline, traced from imagery (a few metres). Wikipedia gives 45°55′13″N |
| Longitude | 63.34225° E | documented | as the latitude; Wikipedia gives 63°20′32″E |
| Height above the ellipsoid | 78 m | estimated | SRTM reads 112 m above the geoid at the point; the EGM96 geoid there is -33.7 m (GeographicLib GeoidEval). Good to some ten metres |
| Mean sea level | -34 m | estimated | the same geoid figure |
| Bearing of the frame's +X | 37.5° | derived | no model, so no pad axis: the frame is laid along the bearing that gives a 64°57′ orbit from this latitude, sin Az = cos i / cos φ, before allowing for the Earth's turning |
| Clock | Moscow time, UTC+3 | documented | every report of the flight is in Moscow time: liftoff 09:06:59.7 |

No surveyed coordinate, and no statement of the launch azimuth, has been found in anything read.

## What stood there on 12 April 1961, as far as has been read

Not enough to build from. The pad is a platform over a large flame pit, with the rocket hung by
its waist in four swinging trusses (the "tulip") that fall back as it lifts, service towers that
lower away, and a cable mast. All of that is from general knowledge of the R-7 pads and none of it
has been checked against a source for this date. When the site is built it follows
[AGENTS.md](../../../../AGENTS.md), "A place is built once and dated": hardware under
`sites/site1/`, knowing nothing of any flight, with what stood when recorded here.

# Service-module RCS — nominal quad positions and nozzle directions

MIT R-547, volume III, October 1966, Table 1.3, printed p. 1-18, gives the
CSM-101 preflight quad reference locations and thrust unit vectors. Section
1.4.1.1, p. 1-15, attributes the data to NAA-S-22 submitted 7 April 1966.

Let `r = 83.56 in`, `a = 7.25°`, and axial station `XA = 958.905 in`:

| Quad | YA | ZA |
|---|---|---|
| A | −r sin(a) | −r cos(a) |
| B | +r cos(a) | −r sin(a) |
| C | +r sin(a) | +r cos(a) |
| D | −r cos(a) | +r sin(a) |

The shared Apollo-to-Blender basis is `(-ZA, YA, XA)`. Thus, looking aft, the
quad references are clockwise from the Y/Z axes. The model's azimuths are
−7.25°, 82.75°, 172.75° and 262.75°. The axial coordinate relative to the CM
datum is `958.905 − 1000 = −41.095 in`, which the earlier Figure 1.4 rounds
to −41.10 in. The same existing SPS-exit origin XA706 is subtracted once.

The later Block II handbook, section 2.5.1, p. 2.5-1, explicitly corroborates
the **7°15′ offset**. Its section applies to CSM106 and subsequent, while the
earlier table is specifically CSM-101's preflight reference. Together they
support an **assumed common nominal geometry** for Apollo 7, not an as-built
inspection of its manufactured engine housings.

The press kit's p. 26a describes packages at ±Y and ±Z without that precision.
Treating that broad description as exact cardinal positioning was incorrect.
The initial 45° placement and the intermediate exact-axis placement are both
superseded by the tabulated references. The inherited 82-in reference radius is
also replaced; no dimension is inferred from the press-kit illustration.

## Thrust and exhaust are opposite

Table 1.3 expresses directions using sin/cos10°. Its footnote explicitly states
that these thrust vectors assume quad centres on the Y/Z axes. They therefore
need the same 7.25° rotation as the locations. Using the unrotated vectors at
rotated centres would omit that stated convention.

For outward unit vector `out` and an axial or circumferential unit direction
`along`, the model's plume direction is
`along × cos(10°) + out × sin(10°)`. Thrust points in the opposite direction,
with an inward component. `bell` takes the vector from mouth to chamber, so it
receives minus the plume direction. The later handbook describes the same
outward nozzle cant as approximately 10°, to reduce exhaust impingement on the
service-module skin.

## Engine exit diameter

North American Rockwell's *Apollo News Reference*, Reaction Control, printed
p. 150, identifies the sixteen Marquardt engines and gives each a **5.6-inch
nozzle exit diameter** and **13.400-inch overall engine length**. The exit
diameter replaces the inherited unsourced 6.8-inch display dimension in all
sixteen nozzles. It is an **assumed common R-4D dimension for Apollo 7**, not an
inspection of its individual engines. The overall engine length includes the
valve/injector assembly; it is not substituted for the nozzle length.

The published diameter alone does not resolve the nozzle's intermediate
profile or inner/outer lip datum. The inherited finite display rim and inner
contour are still provisional. This correction establishes the nominal exit
envelope, not a complete manufactured R-4D nozzle or its wall thickness.

Marquardt report A-1080, volume III, *Apollo SM-LM RCS Engine Development
Program Summary Report* (NASA CR-101931), printed p. 11-38, independently
describes the final two-piece chamber: a molybdenum combustor, L-605 exit bell,
Waspaloy attachment nut and strengthened ribbed bell. Its statement that
early and final chambers retain internal dimensions does not establish the
unchanged external profile of an early prototype. The prototype's overall
dimensions are not copied as flight nozzle dimensions.

## Simplifications and things still wrong

- These are nominal quad reference positions and directions. The box-shaped
  housings are still provisional; their centres are not independently surveyed
  manufactured housing datums.
- Individual chamber/mouth locations, roll-engine offsets, nozzle lengths,
  throat dimensions, bell profiles, display rims and bracket contours remain
  estimated. Correct axes and exit diameter do not validate those inherited
  geometric dimensions.
- Propellant tanks, plumbing, insulation, cork, wiring and servicing fittings
  remain unbuilt. No thruster force or flight simulation is assigned.
- Quads remain attached to the service module throughout the exploded exhibit;
  that layout is not a historical separation trajectory.

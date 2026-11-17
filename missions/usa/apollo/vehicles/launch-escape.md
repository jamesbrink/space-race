# Apollo 7 launch escape assembly — reconstruction in progress

`launch_escape.py` retains inches and converts once through `srlib.IN`.
Most of the initial assembly remains provisional; its envelope is not an
as-built reconstruction of the tower or boost protective cover.

## Escape-motor nozzle axes

The four fixed launch-escape-motor nozzles are canted **35 degrees from the
motor axis**, in North American Rockwell's *Apollo News Reference*, printed
p. 140, drawing P-189. The earlier SC012 *Apollo Operations Handbook*,
12 November 1966, p. 2.9-32, independently specifies the same nozzle-centreline
angle. This is an explicitly **assumed common escape-motor feature for Apollo 7**,
not a measurement of its individual motor. The initial model's direction vector
implied approximately 17.7 degrees and was incorrect.

For each nozzle at azimuth `a`, the vector pointing from its mouth toward the
motor is `(-sin(35°) cos(a), -sin(35°) sin(a), cos(35°))`. The vector is already
unit length. The nozzles lie in the two cardinal planes: two in the pitch plane and two in
the yaw plane (News Reference, p. 142). Apollo +Z maps to model −X and Apollo
+Y to model +Y, so these planes are azimuths 0°, 90°, 180° and 270°. The
initial diagonal arrangement incorrectly put the nozzles through the tower
legs. Mouth radii, axial coordinates and bell contours remain provisional.

The **2.75-degree resultant thrust-vector offset is a different quantity**.
The News Reference, p. 142, and NASA TN D-7083, p. 5, explain that unequal
nozzle throat areas produce a resultant offset. It must not replace the
individual nozzle cant. No abort force model is assigned to this geometry.

## Simplifications and things still wrong

- Tower stations, member lengths, tube diameters, bracing and attachment fittings
  remain estimated. The lower bay intersects the provisional CM/cover envelope.
- Motor stations and upper profile still close the rounded 224-foot full-stack
  envelope by estimate. No unverified conversion of a development-test assembly
  into flown hardware is made.
- Nozzle shapes, dimensions, mouth stations and unequal throats
  remain provisional. Correcting their axes does not validate those features.
- The boost protective cover retains a provisional 1.4-inch radial stand-off;
  this is not a sourced construction thickness. Its windows, access hatch,
  ports, laminate and attachment details remain unbuilt.
- Canards, pitch-control motor, tower-jettison nozzles, wiring and abort motion
  remain unbuilt. The gallery lifts the cover and tower together as an exhibit,
  not as a simulated jettison trajectory.

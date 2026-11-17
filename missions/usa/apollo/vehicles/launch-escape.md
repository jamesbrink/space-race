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

## Tower and viewing port

The *Apollo News Reference* pp. 140–142 gives the ten-foot truss, roughly four-foot square at its feet and three-foot square at its head. Its main and secondary tubes use the nominal 3.5- and 2.5-inch sizes. The diagonal feet intersect the forward cover at the radius implied by the square. Bay spacing, member assignment, attachments and nozzle contours are estimated. The Q-ball envelope is 13.37 inches long and 13.3 inches across its base.

The boost cover uses the nominal 11-foot height, 13-foot diameter and eight-inch commander’s viewing port. The port is a physical hole in the mesh directed at the left rendezvous opening with inset clear glazing. Its exact mounting plane and upper cover taper are estimated.

## Simplifications

The cover omits the access door, blow-out panels, detailed laminate and attachment hardware. Internal escape-system components, canards, wiring and abort dynamics are omitted. The tower and cover move together in the gallery.

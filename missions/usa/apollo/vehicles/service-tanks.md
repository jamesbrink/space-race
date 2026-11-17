# Service-propulsion sump tanks — nominal references

`service_tanks.py` builds the two downstream propellant-tank reference surfaces.
The upstream storage tanks remain unresolved. No tank dimensions are read from
photographs, scaled to fill a compartment, or taken from Apollo 11's equipment.

MIT Instrumentation Laboratory R-547, *Guidance System Operations Plan, AS-278*,
volume **III**, October 1966, section 1.4, identifies the data as CSM-101's
preflight reference. Table 1.4, printed p. 1-19 (PDF p. 23), gives:

| Sump tank | Radius | XA bottom | XA top | YA | ZA |
|---|---:|---:|---:|---:|---:|
| Fuel, sector V | 25.5 in | 832.0 in | 985.8 in | −48.3 in | −6.6 in |
| Oxidizer, sector II | 25.5 in | 832.0 in | 985.8 in | +48.3 in | +6.6 in |

Section 1.4.1.1, p. 1-15, attributes the table to the GN&C Data Exchange Program,
NAA-S-68, submitted 11 March 1966, modified for a 1.6 mixture ratio. These are
**assumed preflight installation references for Apollo 7**, not CM-101 as-built
inspection coordinates. R-547's later 1966 cover does not make the underlying
March data an October inspection.

The nominal height is derived as `985.8 − 832 = 153.8 in`; diameter is
`2 × 25.5 = 51 in`. Both agree with the later Block II *Apollo Operations
Handbook*, volume 1, printed p. 2.4-42 (15 April 1969, changed 16 July 1969),
and NAA *Apollo News Reference*, printed pp. 56–57. NASA TN D-7375,
*Apollo Experience Report—Service Propulsion Subsystem*, printed p. 6, explicitly
states that the Block II redesign retained the earlier diameters and
hemispherical heads, while shortening the cylindrical sections. It also
identifies the changed adjacent sump/storage arrangement. Block I's opposite
fuel/oxidizer assignment is not used.

The 1971 *CSM/LM Spacecraft Operational Data Book*, volume III, revision 3,
Table 4.1-1 introduction, printed p. 4.1-1 (PDF p. 147), independently retains
the same YA/ZA tank centrelines. Its mission-C pages have been deleted, so it
corroborates the common lateral layout, not Apollo 7's flight loading or a
later axial station for CM-101.

## Reconstruction

Each reference is a cylinder between tangent hemispherical heads, at the
tabulated nominal radius and axial limits. The head-centre stations are derived
as `832 + 25.5` and `985.8 − 25.5`; no end contour is fitted. The Apollo basis
`(XA, YA, ZA)` becomes Blender `(-ZA, YA, XA − 706)`, using the existing derived
SPS-exit origin. The launch-stack offset is applied once by the owning node.

These are **nominal reference surfaces**, not a claim to have resolved the
manufactured inner/outer wall datum. The News Reference's equipment description
identifies 51 in as an inside diameter; the model does not silently add a wall
outward or reinterpret the tabulated height's end-face datum. The handbook's
0.054-in wall thickness is recorded, but a complete wall/insulation section is
not reconstructed. Neutral material shading is illustrative, not measured
colourimetry or the flight's insulation finish.

The references are built at full interior detail, remain whole in the normal
cutaway, and move with the service-module barrel in the exploded exhibit.
The old provisional solid aft disc is removed: the nominal domes extend aft of
the XA838 bulkhead, and an unperforated disc passed through them. The real
bulkhead's penetrations and tank supports are not replaced by guessed holes.

## Storage-tank conflict

R-547 Table 1.4 gives a 22.5-in radius and XA832–988.65 envelope for each
storage tank: **156.65 in** high. The later handbook and News Reference pp. 57–58
give **154.47 in**, with 45-in inside diameter. The available sources do not
explain the 2.18-in difference or establish that the same lower face was retained.
Neither an invented neck nor a shifted top/bottom resolves that evidence gap.
The storage tanks are not installed yet.

## Simplifications and things still wrong

- The surfaces use nominal common dimensions and preflight installation
  references; they are not a manufactured CM-101 tank inspection.
- Wall and insulation surfaces, bosses, inlet/outlet fittings, retention
  reservoirs, standpipes, gauges, skirts, supports and plumbing are unbuilt.
- No propellant, tank mass, working pressure, capacity or thrust is assigned to
  a simulator from these geometric references.
- Storage tanks, helium tanks, the penetrated aft structure, radial beams and
  fuel cells remain pending. This is not the complete service-module interior.

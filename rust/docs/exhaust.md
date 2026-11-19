# Fire, smoke and heat

What the native build draws of the motors' fires, the cloud the launch raises, and what the air does to the
vehicle at speed; what each stands on; and every figure in it that is a judgement rather than a source. The
code says the same beside each constant; this note is where they are read together.

## The pieces

| Piece | Code | What drives it |
|---|---|---|
| A motor's fire | `sr-render/src/plume/` (`jet.rs`, `draw.rs`, `glare.rs`), `shaders/plume.wesl` | the motor's `Flame` (`sr-missions`), how hard it burns (`sr-game/src/flight/fire.rs`, from the hand and the plan), the air's pressure, how far down the jet the ground is |
| Its light | `plume/glare.rs` | two spot lamps back to back at the fire, as strong as the fire's outline and the burning sheet under it; the one down the jet casts shadows while the ground is within 60 m |
| The air round the pad | `sr-render/src/fumes/`, `shaders/fumes_solve.wesl`, `fumes.wesl`, `fumes_shadow.wesl` | a fluid solved on the GPU each step of the flight's clock, fed by the blast, the vents and the first fire (`flight/dust.rs`), with the day's wind (`PadAir`) |
| A burst booster's smoke | `sr-render/src/smoke.rs`, `shaders/puff.wesl` | puffs let go by the break-up (`flight/breakup.rs`) |
| The glow coming back in | `sr-render/src/shock/glow.rs`, `shock/light.rs`, `shaders/glow.wesl` | the stagnation heat flux and the gas temperature behind the shock (`Telemetry.heat`, `sr-sim/src/heat.rs`), the Mach number, how squarely the shield meets the air |
| The vapour collar near Mach 1 | `sr-render/src/shock/collar.rs`, `shaders/collar.wesl` | the Mach number and the height (`fire.rs`, `vapour`), how squarely the nose meets the air |

Nothing in `sr-render` knows a flight: the game hangs each piece on the node the flight's data names (the
engine's `Flame.node`, each `Fire`, `Parts.shield`) and hands it figures.

## The fire

**Shape (derived).** One-dimensional isentropic flow of a perfect gas from the chamber's pressure to the exit's
and then to the air's (`jet.rs`): the jet's settled width, its Mach number, the turn at the lip in thin air, a
shock cell of 1.306 d sqrt(M^2 - 1) (Prandtl and Pack, 1950) and a supersonic core of 3.45 d (1 + 0.38 M)^2
(NASA SP-8072, 1971, Figure 11). At the sea the A-7 is nearly matched (exit about 0.9 atm): a jet of its own
width with cells some 2.6 m long and a core of some ten metres. Above 20 km it swells and fans out at the lip.

**The datum.** The fire hangs at the exit plane of the A-7's chamber: the lowest ring of `Engine_ChamberLiner`
and `Engine_ChamberWall` in `vehicle.glb`, read off the meshes' vertices (the nodes carry no offset of their
own): y = -18.1458 m in the model's frame, a ring of 0.3937 m. `Engine_A7`'s own lowest ring, -17.855 m, is a
collar 291 mm up the bell. `FLAME.exit_height` is `derived` and says this.

**Look (estimated, each against a still).**
- Luminance 8,000 cd/m^2 through the heart (`FLAME.luminance`): paler than sunlit concrete and a little
  brighter than the hazy sky in NASA 6100884, S61-01928 and S63-22731 (MR-2).
- The knot: the shock cells show at no less than half strength even in a matched jet (`draw.rs`,
  `DIAMONDS_LEAST`), and where they cross on the axis the gas is a knot `KNOT` (16) times the heart about it,
  sharpest at the first and gone in `KNOTS_LAST` (2.2) cells (`plume.wesl`). Set so the first knot, as in
  6100884, is white on the print and blooms (over the grade's bloom threshold, some 33,000 cd/m^2) while the
  body does not.
- Colours (`FLAME.colours`): a white knot, a pale peach body, orange where the jet burns in the air and in the
  sheet on the launcher. Judged by eye against the same stills; they carry no `Measure`.
- The sheet on the launcher: orange tongues out to 3.4 m (`SHEET_REACH`), and as a light 40,000 cd/m^2 over
  that disc (`glare.rs`, `SHEET_GLOW`: a few times sunlit concrete, the brightest thing under the tail in
  6100884). This is what lights the cloud warm from inside at liftoff.
- Streak speed (`STREAMS`), the eddies' sizes and the body's spread are by eye.
- The solid motors (escape, jettison, posigrade, retro): chamber 1,000 psia, exit an atmosphere or three tenths
  of one, twice the alcohol flame's luminance, half-hiding smoke: all estimated (`mercury/fires.rs`); their
  thrusts and burn times are the plan's documented figures (`redstone.rs`, `TOWER_MOTORS`, `RETRO`; SP-45 Table
  3-III, SEDR 104). The escape rocket's three nozzles are canted 19 degrees (SEDR 104); the jettison rocket is
  drawn as one bell on the axis, as the model has it (it had three canted 30 degrees).

## The cloud at the pad

**What the stills show.** Mercury-Redstone launches from Complex 5 had no water deluge. Close to the pad just
off the ground the stills show a tan haze over the apron with orange fire on the launcher (6100884,
S61-01928); from low down, a dense knobbed white billow round the tail, standing above the fins and wider than
the frame (S61-02409, MR-3), and on MR-4 a grey-white bank across the whole pad some 10 to 15 m high
(S61-03121). At ignition a compact white billow some 10 m across stands round the launcher (S61-02407).

**What is fed (`flight/dust.rs`).** While the jet reaches the ground: a radial wall jet from a ring under the
nozzle (axis speed 6.8 sqrt(J/rho)/x, Pope 5.1; sheet 1.1 sqrt(J/rho)/r, Poreh, Tsuei and Cermak 1967; held to
45 m/s at no less than a 3 m ring, which is what the grid can carry), warm (`HOT`, 20 K over the air at its
fastest, estimated), carrying the exhaust's condensed water (`PadAir.condenses`, 6 a second, estimated against
S61-02409 and S61-03121), and raising the apron's dust where the air over it is faster than 6 m/s
(`PadAir.dust`, 0.02, estimated against S61-01928). As the engine lights, the white billow
(`PadAir.vapour`, 4.5, lasting `vapour_lasts`, 1 s, against S61-02407). Before launch and as it lifts, the
oxygen tank's vent (S61-03158, S61-01928). Why the exhaust condenses at all on a 24 C morning: the A-7 burned
75 per cent alcohol in water with liquid oxygen, so its exhaust is some two fifths water and cool per kilogram
of water; the mixing line with humid air can cross saturation. That reasoning is not worked here; the amount
is set against the stills.

**The fluid (`fumes_solve.wesl`).** Stam's stable fluids with vorticity confinement on a 220 x 50 x 120 m box of
1.25 m cells (dust and vapour on cells half that), the pad 60 m in from its upwind side, 60 steps to a second of
the clock (steps up to a twentieth of a second when the clock runs fast). Hot air rises; the wind is the day's (090 at 5.1 m/s at 10 m, ISD;
a seventh-power profile); the ground drags. The vapour evaporates in about 25 s (`VAPOUR_LASTS`; still dense with the vehicle well up in
S61-01908), the fine
dust lasts about two minutes beyond what mixing takes (`DUST_LASTS`) and falls at 4 cm/s (`DUST_FALLS`: Stokes
for 20 to 30 micrometre grains). All four are estimated.

**It drifts for minutes (`fumes/pace.rs`).** While anything feeds it the box stands with the pad in it. When
nothing does, it lets go and drifts down the wind at the wind's speed 2 m up (`CARRIED_AT`), coming to that
speed over 4 s (`LETS_GO`); the solver works in the moving box, so the air in it is the wind's less the box's
and the box's speeding up is a push up the wind. It is kept for 5 minutes after anything last fed it
(`LINGERS`). The picture thins the fumes over 18 m toward the box's open sides and over 7 m under its ceiling
(`fumes.wesl`, `WALLS`), so no wall of the grid is seen.

**Its light (`fumes.wesl`).** The Sun through the fumes (an opacity volume marched 8 m toward it), the
scattering orders after the first as a gain and a softer shade (`DEEPER_ORDERS`, `DEEPER_SHADE`), the sky
from above with three quarters of it kept even deep in the shade (`SKY_FLOOR`: the shaded side of the billows
in S61-02409 and S61-03121 is a light grey), the sunlit ground from below, and the fire and its sheet as a point lamp inside. The shadow of the
fumes falls on the ground, the vehicle and themselves through the Sun's own shadow maps (a stochastic shadow
map). A solid's shadow (the gantry's) takes all of the first scattering and only two fifths of
the rest (`SHADOW_FILLS`), so it falls grey on a billow, not black. Where the fumes are read is bent by the
repeating block of eddies at 9 m and 3.2 m by 1.6 m and 0.6 m (`BILLOWS`, `BENT`), so their outline is
knobbed at the sizes S61-02409 shows and not at the grid's. The phase function's forward weight, the gains,
the dust's and vapour's colours and that bending are estimated.

**What it costs.** On the shared M4 Max the frame with the cloud filling the view at eye height ran some 5 to
20 ms slower at 2560 x 1440 with the fumes on than off (`fumes::ON`, an A/B switch; the GPU was shared with
other work and the figure is not better than that). The march is most of it: per pixel some 20 steps, each
two reads of the eddies, the fumes, the light and every eighth a read of the Sun's shadow maps.

## Coming back in

Freedom 7 met the air blunt end first at about 2 km/s: the simulator has its cold-wall stagnation flux at some
3 kW/m^2 at T+470 s (85 km), 75 kW/m^2 at T+505 s (35 km) and past its peak by T+515 s, and the gas behind the
shock at about 2,100 K (perfect gas below 2,500 K, `sr-sim/src/heat.rs`). That is a warm entry, not a fireball.

**What is drawn (`shock/glow.rs`).** The shock layer over the shield, an ellipsoid as thick at the middle as
the shock stands off (Billig 1967: 0.143 R exp(3.24/M^2), about 0.32 m on the 80 in shield at Mach 6) and
wrapping a little past the rim, glowing as a black body at the gas temperature (`shock/light.rs`: Planck's law
weighed by the CIE 1931 observer; the test holds it to 60 cd/cm^2 at the freezing point of platinum) times an
emissivity. The layer is optically thin, so a pixel is as bright as the length of gas its ray crosses: the rim,
seen edge on, is brightest. Behind it a dimmer, cooler, flickering wake.

**What drives it, exactly.** emissivity = 2e-3 x (stagnation flux / 100 kW/m^2) x how squarely the shield
meets the air (`fire.rs`, `GLOW_EMISSIVITY`). That 2e-3 is an estimate and an upper one: no account of a glow
seen on a suborbital Mercury entry was found, and air at 2,100 K and a few hundredths of an atmosphere gives
very little visible light. It is set so that at the peak (about T+500 to T+510 s) the layer is a faint
orange-red rim seen against the black sky and lost against the sunlit Earth; at T+470 s, at 3 kW/m^2, nothing
shows. The shield's own surface is not drawn glowing: the simulator's hottest shield temperature stays far
below the 800 K at which a surface first shows red in the dark. There is no heat shimmer (refraction): the
wake's flicker stands for it.

## Near the speed of sound

At about T+67 s Freedom 7 passed Mach 1 near 8.3 km. Where the flow turns back past the shoulder at the
capsule's rim it expands and cools, and in humid air its water condenses in a collar until the shock behind
squeezes it dry. `shock/collar.rs` draws an open bell of mist from the rim, 1.4 rim radii long and flaring by
a third, streaked along the flow and lit by the Sun (mostly forward) and the sky. Its density (`fire.rs`,
`vapour`): 0.8 at its densest, at Mach 0.98, falling off over 0.05 of Mach either side, fading from 8 to 14
km as the air dries and thins, and only while the nose meets the air. Every one of those is estimated from
films of other launches (Saturn I and V, the Shuttle); no film of a Mercury-Redstone through Mach 1 was found,
nor the humidity aloft that morning. The Prandtl-Glauert cone of pictures (a disc at the shock) is the same
thing; only the collar at the one shoulder is drawn.

## What is simplified or left out

- The fire's look is judged, not worked: its luminance, colours, knots and streaks are by eye.
- The blast is fed at 45 m/s from a 3 m ring where the real wall jet is several times faster and thinner.
- Nothing solid stands in the fluid but the ground: the launcher, the vehicle and the gantry do not turn the air.
- The condensation of the exhaust is an amount set against the stills, not the mixing line worked from the
  day's humidity (which is not in the record read).
- A drifting cloud's lowest air moves slower than the box and thins out of its upwind side over minutes.
- The fumes do not shade the clouds' haze or the fire; the fire lights them as a point.
- No shimmer behind the fire or the capsule; no shock layer radiation worked from the gas's chemistry.
- One vapour collar, at the shield's rim; none at the tower or the tail.

## Sources

- NASA stills, images.nasa.gov: 6100884, S61-01928 (MR-3 just off the pad), S61-02407 (MR-3 ignition),
  S61-02409 (MR-3 liftoff from low down), S61-03121 and S61-03248 (MR-4 liftoff), S63-22731 (MR-2),
  S61-03158 (MR-3 on the pad at night), S61-01908 (MR-3 climbing).
- Q. D. Pack, "A note on the Prandtl-Meyer expansion of supersonic jets", Q. J. Mech. Appl. Math. 3, 1950.
- NASA SP-8072, Acoustic Loads Generated by the Propulsion System, 1971 (the core's length).
- S. B. Pope, Turbulent Flows, 2000, 5.1 (the round jet's decay).
- M. Poreh, Y. G. Tsuei and J. E. Cermak, "Investigation of a turbulent radial wall jet", J. Appl. Mech. 34, 1967.
- F. S. Billig, "Shock-wave shapes around spherical- and cylindrical-nosed bodies", J. Spacecraft 4, 1967.
- C. Wyman, P.-P. Sloan, P. Shirley, "Simple Analytic Approximations to the CIE XYZ Color Matching
  Functions", JCGT 2(2), 2013.
- J. Stam, "Stable Fluids", SIGGRAPH 1999; R. Fedkiw, J. Stam, H. W. Jensen, "Visual Simulation of Smoke",
  SIGGRAPH 2001; GPU Gems 3, ch. 30.
- NASA SP-45 (Table 3-III, the tower's motors); McDonnell SEDR 104 (the retrorockets, the escape nozzles' cant);
  NASA CR-649 (the shield's 80 in radius); ISD, Cape Canaveral, 5 May 1961 09:00 EST (the wind).

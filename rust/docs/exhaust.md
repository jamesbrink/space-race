# Fire, smoke and heat

What the native build draws of the motors' fires, the cloud the launch raises, and what the air does to the
vehicle at speed; what each stands on; and every figure in it that is a judgement rather than a source. The
code says the same beside each constant; this note is where they are read together.

## The pieces

| Piece | Code | What drives it |
|---|---|---|
| A motor's fire | `sr-render/src/plume/` (`jet.rs`, `draw.rs`, `glare.rs`), `shaders/plume.wesl` | the motor's `Flame` (`sr-missions`), how hard it burns (`sr-game/src/flight/fire.rs`, from the hand and the plan), the air's pressure, how far down the jet the ground is |
| Its light | `plume/glare.rs` | two spot lamps back to back at the fire, as strong as the fire's outline and the burning sheet under it; neither casts shadows (the frame's budget) |
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
- The diamonds: the shock cells show at no less than half strength even in a matched jet (`draw.rs`,
  `DIAMONDS_LEAST`), and where they cross on the axis the gas is a knot `KNOT` (24) times the heart about it,
  as wide as most of the jet, sharpest at the first and gone in `KNOTS_LAST` (3) cells (`plume.wesl`). Each cell is 0.84 of the one before
  (`CELL_SHRINKS`: the jet slows and narrows as it mixes), so the knots close up and narrow down the jet, a train
  of three to five; between them the expanded gas is up to 75 per cent dimmer (`GAPS`), so the train reads as
  beads; the first cells are less streaked than the mixed body below. As the air thins the jet swells and the
  train fades out with it. Set so the first knot, as in
  6100884, is white on the print and blooms (over the grade's bloom threshold, some 33,000 cd/m^2) while the
  body does not.
- Colours (`FLAME.colours`): a white knot, a translucent pink-peach body, salmon-orange where the jet burns late in
  the air and orange in the sheet on the launcher. Judged by eye against the same stills and S61-01908 (MR-3
  climbing against the sky); they carry no `Measure`.
- A soft cone, not a solid. The white heart is seen only in and just under the bell (`HEART_GOES`, 0.45 of the
  supersonic core) and then gives way to the body, which starts at the lip and widens at 0.14 of a metre a metre
  (`WIDENS`) and thins less than as the square of its width (`spent`, its 1.3th power), so the fire is a
  translucent cone some three bell widths across where it fades, as in S61-01908. All estimated.
- The Redstone's turbopump ran on hydrogen peroxide decomposed to steam and oxygen, so its turbine exhaust is
  steam, not the soot of a gas generator burning kerosene: there is no dark smoke to draw. (The steam's own plume
  is not drawn.)
- Above the air a fire is no beam: let go at the lip it spreads in a cone at the lip's turn and thins as the
  square of the cone's width (`plume.wesl`, `let_go`), and is drawn no longer than 60 of its nozzle's exit radii
  (`draw.rs`, `REACH`): the tower's jettison rocket and the retrorockets are short bright fires with a soft fan.
  Estimated.
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
fastest, estimated), carrying the exhaust's condensed water (`PadAir.condenses`, 3 a second, estimated against
S61-02409, S61-03121 and S61-03248) only while the jet arrives as the fire's own gas: the share falls by e over
6 m of the nozzle's height (`LADEN`), so the billow is thrown while the vehicle leaves the launcher and not
fed for the twenty seconds the jet still blows on the apron as a wind; and raising the apron's dust where the air
over it is faster than 6 m/s (`PadAir.dust`, 0.012, estimated against S61-01928 and S61-03248). As the engine
lights, the white billow (`PadAir.vapour`, 3, lasting `vapour_lasts`, 1 s, against S61-02407). Before launch and as it lifts, the
oxygen tank's vent (S61-03158, S61-01928). Why the exhaust condenses at all on a 24 C morning: the A-7 burned
75 per cent alcohol in water with liquid oxygen, so its exhaust is some two fifths water and cool per kilogram
of water; the mixing line with humid air can cross saturation. That reasoning is not worked here; the amount
is set against the stills.

**The fluid (`fumes_solve.wesl`).** Stam's stable fluids with vorticity confinement on a 220 x 50 x 120 m box of
1.25 m cells (dust and vapour on the same cells: the billows' finer shape is the picture's), the pad 60 m in from
its upwind side, one step a frame of the clock's time since the last (a sixtieth of a second at 60 frames, up to
a twentieth when the clock runs fast or a frame is slow), the pressure searched six times over in pairs. Hot air rises; the wind is the day's (090 at 5.1 m/s at 10 m, ISD;
a seventh-power profile); the ground drags. The vapour evaporates in about 20 s (`VAPOUR_LASTS`; the pad nearly
clear a few seconds up in S61-03248, a thin bank still about it in S61-01908), the fine
dust lasts about two minutes beyond what mixing takes (`DUST_LASTS`) and falls at 4 cm/s (`DUST_FALLS`: Stokes
for 20 to 30 micrometre grains). All four are estimated.

**It drifts for minutes (`fumes/pace.rs`).** While anything feeds it the box stands with the pad in it. When
nothing does, it lets go and drifts down the wind at the wind's speed 2 m up (`CARRIED_AT`), coming to that
speed over 4 s (`LETS_GO`); the solver works in the moving box, so the air in it is the wind's less the box's
and the box's speeding up is a push up the wind. It is kept for 5 minutes after anything last fed it
(`LINGERS`). The picture thins the fumes over 18 m toward the box's open sides and over 7 m under its ceiling
(`fumes.wesl`, `WALLS`), so no wall of the grid is seen.

**The picture (`fumes/pass.rs`, `fumes_march.wesl`, `fumes/lay.rs`, `fumes_lay.wesl`).** The fumes are marched in
their own pass, as the clouds are: one ray for every four pixels (a different one of the four each frame), into
two half-size targets, after the depth prepass; a ball round the eye lays them over the frame at full size,
taking for each pixel the rays that went about as far as what is solid there, so a gantry's edge stays sharp.
The box's mesh (`fumes.wesl`) now only casts the fumes' shadow into the Sun's shadow maps (a stochastic shadow
map: `fumes_shadow.wesl`); its own picture draws nothing. The march finds where along the ray there is anything
(5 m strides over a coarse volume), strides across empty air, steps back on meeting fumes so the outline is
found where it is, then steps by optical depth (0.35 of a step's worth, between 0.25 and 0.4 m where there are
fumes) and stops once less than 2 per cent of what is behind comes through.

**The billows.** The vapour is an off-white (it carries the apron's dust and the burned alcohol's haze), the dust
a dirty grey tan (`VAPOUR`, `DUST`). The vapour is eroded at its outline by eddies of three sizes (5.5, 2.2 and 0.9 m, `KNOBS`, read
from the repeating block of curl noise): where the grid's vapour is under 1.2/m (`SKIN`) the eddies eat up to
three quarters of it (`ERODE`) and what is left comes to full thickness over a short edge (`EDGE`), so the
outline is a crisp knobbed one, as S61-02409's; the hollows between knobs see up to half less of the Sun and the
sky (`HOLLOWS`); inside, the vapour varies by 60 per cent on the largest eddies and is never thicker than 5/m
(`INSIDE`, `THICKEST`), so the inside of a billow is seen into a metre or so. A cloud thinned below a third of
the outline's thickness as it drifts and evaporates has no knobs left: there the eddies only fray it and it is as
thin as the grid says (`fresh`), a haze, not a scatter of crisp knobs. Where the fumes are read is bent
by eddies of 9 and 3.2 m by 1.6 and 0.6 m (`BILLOWS`, `BENT`). The dust is cut at its edges finer than the grid
(`CUT`), as wisps. All estimated.

**Its light.** The Sun through the fumes (an opacity volume marched 8 m toward it), thrown by two lobes, a sharp
forward one (g 0.8, a third of the light) that silvers a billow seen toward the Sun and a broad one (g 0.2); the
scattering orders after the first as a gain and a softer shade (`DEEPER_ORDERS`, `DEEPER_SHADE`); the sky from
above with three quarters of it kept even deep in the shade (`SKY_FLOOR`: the shaded side of the billows in
S61-02409 and S61-03121 is a light grey); the sunlit apron from below (albedo 0.35, doubled for the light a thick
billow scatters about inside itself: `GROUND_ALBEDO`, `BOUNCE`); and the fire and its sheet as a point lamp
inside, its light thrown forward through the fumes toward an eye looking at it (g 0.6, `FIRE_G`), so a fire
seen through smoke glows. All estimated. The solid things' shadows in the fumes (the gantry's on a billow) are
not drawn: the march has no shadow maps to read.

**What it costs.** The budget is 3 ms for the fumes, the fire and the glow together at liftoff with the cloud
filling the view at eye height, 2560 x 1440, and 1 ms in flight. To hold it: the march is for a pixel in four;
the grid's dust and vapour are on its 1.25 m cells, not half that (eight times less to carry and light); one
solver step a frame; six pressure turns, not eight; the fire's lamps cast no shadows (each was the whole scene
drawn again). To measure it within one run, set `SR_AB` to a number of seconds: the fumes and the fires are on
and off by turns and each turn is logged, so `--bench` seconds can be split (`SR_AB_PARTS` picks `s` the solver,
`d` the fumes' picture, `f` the fires). Seen from more than a kilometre off the box's nearest side (the chase camera from about T+25 s), the solver works
only once its owed time has come to its longest step, a twentieth of a second, and lights the air only then: a
third of the cost (`pace.rs`, `FAR`), with no difference to be seen in a chase strip from T+20 to T+60 s. On the
shared machine (six to eight other renders and builds running)
the seconds without them were 2 to 7 ms faster at the quietest quarter of the run, in four runs; the medians
were too noisy to say more. `fumes::ON`, `plume::ON` and `shock::ON` take each out of the build.

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
squeezes it dry. `shock/collar.rs` draws a thin, translucent sheet of mist from the rim, reaching out to 1.75
rim radii and swept 0.45 rim radii aft, soft at the shoulder and feathered to nothing toward the shock (whose
place wavers round the body), streaked along the flow and flickering, lit almost only by the Sun scattered
forward (g 0.8), so it shows where the Sun is behind it and hardly at all elsewhere; it hides a third of what it
would for the light it scatters. Its density (`fire.rs`,
`vapour`): 0.8 at its densest, at Mach 0.98, falling off over 0.012 of Mach either side (the Redstone gained
about 0.02 of Mach a second there, so it is seen for under two seconds), fading from 8 to 14
km as the air dries and thins, and only while the nose meets the air. It is a soft shell, mottled and flickering,
not streaked: the flow through it is too fast for streaks to be seen. Every one of those is estimated from
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
- No shadow of a solid thing (the gantry, the vehicle) falls in the fumes: the quarter-rate march reads no
  shadow maps.

## Sources

- NASA stills, images.nasa.gov: 6100884, S61-01928 (MR-3 just off the pad), S61-02407 (MR-3 ignition),
  S61-02409 (MR-3 liftoff from low down), S61-01927 (MR-3 at liftoff from the ground), S61-03121 and S61-03248
  (MR-4 liftoff, and a few seconds up from the structure), S63-22731 (MR-2), S61-03158 (MR-3 on the pad at night),
  S61-01908 (MR-3 climbing).
- The A-7's turbopump, driven by steam from hydrogen peroxide over a permanganate catalyst: Aircraft Engine
  Historical Society, "U.S. Manned Rocket Propulsion Evolution", part 4 (enginehistory.org/Rockets/RPE04/).
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

# Vostok 1: the mission, and the plan to fly it

The flight's record as the simulator will need it, what the simulator lacks, and the order to build
it in. The numbers themselves live in [orbital.ts](orbital.ts) (`Flight.orbital`); the hardware in
[vostok-3ka.md](../../vehicles/vostok-3ka.md) and [vostok-8k72k.md](../../vehicles/vostok-8k72k.md);
the story in [README.md](README.md). Sources in full: [docs/sources.md](../../../../../docs/sources.md), "Vostok".

**Confidence** as everywhere: *documented* (a published figure, with where), *derived* (computed from
documented ones, with how), *estimated* (reckoned or chosen, and it says so). Times are Moscow time
(UTC+3) as every report gives them, and seconds from liftoff, T+.

Sources, by weight. **PPP**: «Первый пилотируемый полёт», book 2 (2011), the documents themselves, not read
at first hand: quoted by page in **K**, Gammal and Tuchin's reconstruction of the flight (Keldysh Institute preprint
2025 No. 15, read in full; its own ascent is a Soyuz's from Guiana turned to Tyuratam, and is not used). **B21**:
Baturin, Novaya Gazeta, 12 April 2021 (read in full; an editor of PPP, no footnotes). **R**: OKB-1's preliminary report of 3 May 1961 (read in full, in translation).
**G**: Gagarin's report to the State Commission of 13 April and the questions put to him (read in
full, in translation). **S**: Siddiqi, *Challenge to Apollo* (2000). **S15**: Siddiqi in The Space
Review, 2015. **Z**: Zak, RussianSpaceWeb (its launch, orbit and landing pages, read in full), which
carries **L**: Lissov's reckonings from *Novosti Kosmonavtiki*, not read at first hand. **N**: a set of figures in print
that has not been traced to a document (thought to be NASA NSSDC's for 1961-012A, whose page answered
with an error on both tries). **T**: the TASS announcement of the day, as Z tabulates it.

## 1. The record

### Timeline

| Moscow time | T+ s | Event | Confidence | Source, and who disagrees |
| --- | --- | --- | --- | --- |
| 07:50 or so | | Sealed in; hatch No. 1 taken off and refitted for a contact (30 screws) | documented | S; G |
| 09:06:59.7 | 0 | Liftoff. Engines through preliminary, intermediate and main stages first | documented | S launch log. R: 09:06:59 |
| | about 70 | Vibration changes: lower, larger | documented, loose | G |
| 09:08:59.2 | 119.5 | Strap-ons separate, on the integrator's command at 119.50 s, done 0.03 s later. "Approximately five G" before it, by feel | documented | PPP p. (as K quotes it). S p. 277 and Z: 119. The load: G |
| 09:09:34.3 | 154.6 | Fairing off | documented | PPP. **G: "at second 150". Z: 154. S's figure: 156** |
| | 156 | Radio guidance's power converter fails; the autonomous system flies on | documented, secondary | Z; B21; Chertok vol. 3 p. 291 |
| | 211 | Load "began to grow again" | documented | G |
| | 300 | Core cut off; Block E alight | documented | S. **Z: 299.** No instant in the telemetry (PPP p. 60). B21: cut 0.46 s late by the autonomous system's time mark, 22.0 m/s over the design |
| | 300 to 315 | "Weightlessness about 10-15 seconds until the third stage ignited" | documented | G. **Contradicts hot staging** (Minakov; RKK Energia), where Block E lights first. Not reconciled |
| | 676 | Block E cut off, sharply: orbit | documented | S p. 277. B21: 2.4 s longer than calculated; 25.43 m/s over in all |
| 09:18:28 | 688.3 | Spacecraft separates; clock, Globus and Granit-5V cycle 1 start | documented | R. **PPP: 09:18:26.8.** G: "after about 10 seconds". **Z notes 09:18:07 (L)** |
| 09:25 to 09:29 | | Asks Zarya-3 (Yelizovo) for his orbit four times; is not told | documented | Z, transcript |
| | | VHF lost at "about 30 degrees north latitude on the globus" | documented | G |
| before 09:50 | | Into the Earth's shadow, "very sharp" | documented, untimed | G. No source read gives the minute |
| about 09:50 | 2,580 | Solar orientation on; turning slows from 2 to 3 deg/s to "almost imperceptible" | documented, to the minute | Z (planned 09:50); G |
| 09:54 | | Vesna (Khabarovsk, HF): "the orbit is as calculated". It was not | documented | Z, transcript |
| | | Apogee "about when I was passing Cape Horn" | documented, loose | G |
| | | Out of the shadow; the sensor finds the Sun; attitude steady, TDU to the Sun | documented, untimed | G |
| "minute 56" | | First command of the descent cycle; second and third follow | documented | G. Minute of what clock is not said |
| 10:25:04.2 | 4,684.5 | Braking engine commanded ("pressurize") | documented | R |
| 10:25:06.4 | 4,686.7 | "Launch" | documented | R: 2.2 s after |
| 10:25:07.9 | 4,688.2 | Engine at its working mode | derived | R: 1.5 s after that |
| 10:25:46.4 | 4,726.7 | Fuel pressure falls: thrust ends | derived | R: 42.2 s after the command. G: "exactly 40 seconds" |
| 10:25:48.2 | 4,728.5 | Shut down by the timer, not the integrator; separation cancelled; pitch throttle seized, gas escaping | documented | R: 44.0 s |
| 10:25:48 on | | Tumbling. **R: up to 6 deg/s in pitch. G: "about 30 degrees per second, no less"** | documented, in dispute | not reconciled: one is telemetry on one axis, one a man's eye |
| 10:36 | 5,340 | Modules separate, "evidently from the emergency system, from temperature-sensitive elements" | documented | R. **G: 10:35.** L doubts thermal sensors could fire at 150 to 160 km; open |
| | | Rotation continues, then slows on all axes; swinging ±90 deg, ±15 deg by peak load | documented | G |
| | | Peak load. **G: "beyond 10g". S15: 10 to 12. "About 8" is in print unsourced** | documented, by feel | 2 to 3 s of greying vision (G; R) |
| 10:42 | 5,700 | Hatch No. 1 off at about 7,000 m; the seat a moment after | documented, to the minute | Z; height G. Planned 10:44:12 (Z) |
| | | Seat's stabilising parachute, then main canopy; reserve falls out and later fills: two canopies. Survival pack lost | documented | G; R |
| 10:48 | 6,060 | Descent module lands, on its own parachute (opened at 4 km: tertiary) | documented | R |
| 10:53 | 6,360 | Gagarin lands: 106 minutes | documented | R. **TASS and the marker: 10:55 (108 min).** Pekarsky's watch: 10:52 (Z) |

### The orbit

| | R (3 May 1961) | T (12 April) | N (untraced) | US radar, of Block E (Z, after L) | Planned (Z) |
| --- | --- | --- | --- | --- | --- |
| Perigee | 181 km | 175 km | 169 km | 190.6 km | 180 km |
| Apogee | 327 km | 302 km | 315 km | 326.2 km | 230 km |
| Inclination | 64°57′ | 65°4′ | | | |
| Period | 89.44 min | 89.1 min | 89.34 min | | |

- **The three sets are not three orbits.** By Kepler's law R's heights give R's period only over a
  ball of 6,371 km, T's the same, and N's over 6,378 km (*derived* here; `tests/orbit.test.mjs`
  holds all three). R and N then differ by 5 km in semi-major axis, 6 s in period. R is taken; N's
  origin has not been traced. Z's own table misprints R as 372 km and "64.57".
- **What kind of elements R's are is not stated** (osculating at injection, or a mean from
  tracking). Under the Earth's oblateness the difference is some kilometres in height. Taken as
  osculating at cutoff, and said so.
- **Not published anywhere read:** the node, the argument of perigee, the place or time of
  injection, the launch azimuth. So the orbit's plane and the spacecraft's place on it are not
  documented: see "Inputs".
- **Why the apogee was 97 km high: both accounts, together.** B21: the radio guidance's power
  converter failed at 156 s, its cutoff command never came, the core was cut 0.46 s late by the
  autonomous system's time mark (its preliminary command 0.51 s late), 22.0 m/s over the design; and
  Block E burned 2.4 s longer than calculated: 25.43 m/s too fast in all, 327 km for 230. Chertok
  (vol. 3, p. 291): the integrator cut the core "set for a velocity exceeding the design velocity for
  the radio system"; (p. 73) an integrator error "caused the apogee altitude to increase by 40
  kilometers". Z and S15 each had half of it. R gives the orbit and no cause.
- **What kind of elements.** K (from PPP p. 42): built by NII-4 "from the gyro platform's data and
  angle measurements", by a method that took in the field's non-centrality and drag; "the time of
  osculation is not stated in the sources". K takes the heights over the Krasovsky ellipsoid's radius;
  the repo's 6,371 km ball (Kepler against the period) is kept.
- **What it cost.** The fallback for a failed braking engine was decay within the supplies' ten
  days (planned: two to seven days; Ustinov's memorandum of 30 March). S15: from 327 km, about
  thirty days.

### The braking burn and the entry

- **Aim: by the Sun.** One sensor; "the TDU was directed to the Sun and quite steadily" (G); "oriented
  toward the Sun before the braking engine unit was turned on" (R). *Documented.* The launch hour set
  where the Sun would be: so the direction of the push is computed from the ephemeris, not chosen.
  **And that does not fit.** The Sun stood 41° out of the orbit's plane all morning (*derived* from
  the site, the hour and the inclination: `tests/orbital.test.mjs` prints it), and 30° above level at
  the burn. A push straight along the line from the Sun is then 54° off retrograde, 65 % of it
  across the track. Gagarin has the ground running "strictly according to the pointers of the Vzor"
  once oriented, and "at an angle of approximately 30 degrees" by the burn; and the landing lay
  where an in-plane push puts it (section 5). How the sensor's axis lay to the engine's, and what
  held the roll about the Sun's line, has not been read. **Open.**
- **Size: 132 m/s** of 136 programmed (Z, after L: *documented, secondary*). R: the impulse "was
  close to the estimated one" and the causes "have not been identified". 1,614 kgf for 38.5 s on
  4.7 t is 131 m/s (*derived*), which agrees.
- **Why short.** A valve did not close fully at the start, fuel leaked past the chamber, the engine
  starved a second early (Z, L; Chertok vol. 3 pp. 80-81: the check valve, "1 second before the
  integrator generated the primary command", 132 for 136 m/s). B21: normal running ended 40.1 s
  after the start (R: fuel pressure gone at 42.2 s), and "the consequence of this not-quite-second was
  an overshoot of 600 km": **long, not short**, which is the sign `flyOrbit` gives (below). Because the integrator had not reached its count, the timer shut
  it down, the sequencer cancelled separation, and gas went on escaping through the main nozzle and
  the steering nozzles.
- **The separation.** S (2000) has the lock opening on time and cables holding the modules; that is
  superseded. R and S15: no separation was commanded at all until the backup at 10:36. A harness
  did hold them some seconds after that (S15).
- **Landing short.** Planned: near Pestravka, 52.40° N 49.96° E (Z). Flown: 51°16′ N 45°59′ E (R),
  about 300 km short along the track. S15 puts it to the second of lost burn. A weaker burn carries
  further, not shorter; the high orbit, slower round to a timer that fired at a fixed time, falls
  short by itself. That reasoning is ours; `flyOrbit` bears out its sign and not its size (4 m/s more
  burn lands 157 km shorter, not longer; the planned orbit and burn on the same clock land 66 km
  beyond the flown ones, not 300: section 5).
- **The last minutes, by another clock.** B21: Engels' search radar saw the target at 10:48, 8 km up
  and 33 km to the south-west; ejection at 10:49 at 7 km; the main canopy 50 s later at about 4 km, as
  he left the seat; the reserve at 3 km. That puts the ejection seven minutes after Z's 10:42 and
  against R's module landing at 10:48. K quotes PPP book 1, p. 431: contact lost at 10:38:15, ejection
  at 10:45:41. **Three times for the ejection, not reconciled.** The descent system (Bobkov, OKB-1,
  1991; GCTC): the module's pilot parachute of 1.5 m² at about 7 km, braking parachute 18 m² at 4 km
  and 200 m/s, main 574 m² at 2.5 km, landing at 10 m/s; the pilot's braking parachute 2 m², main
  83.5 m² at 4 km, reserve 56 m² (put out automatically after the main on this flight only), 5 to 6
  m/s; the hatch at 7 km and 220 m/s, the seat 2 s later at up to 20 m/s.
- **Place.** R: 51°16′ N, 45°59′ E for the pilot; the module about 1.5 km off (G thought 4), "south
  of the city of Engels", the module 10 m from a ravine and the pilot some 9 km from the Volga (Z).
  About 50 m above the sea, 7.5 °C (Z). Wind at 7 km westerly and strong (Z); at the ground 5 to
  7 m/s (G). The monument: 51.2707° N 45.9973° E (maps: tertiary). Z's table prints the minutes as
  decimals ("51.16, 45.58").

### Ground track, communications, what he reported

- **Track** (from G, R, Z; none gives coordinates): north-east over Siberia (he saw "the Ob' or the
  Irtysh"), Kolpashevo, past Kamchatka (Yelizovo), south-east down the Pacific in darkness, round
  below Cape Horn, north-east up the South Atlantic into sunrise, the braking burn "over Africa",
  the north coast of Africa and the Mediterranean before separation, Turkey, the Black Sea, the
  Volga. The simulator's track is a result to compare with this, not an input.
- **Stations.** VHF ("Zarya", line of sight): Zarya-1 Tyuratam, Zarya-2 Kolpashevo, Zarya-3
  Yelizovo. HF ("Vesna"): Khabarovsk, then Moscow. Telemetry: IP-1, IP-4, IP-7 and others, and
  ships in the Atlantic (R). R: HF channel 1 never worked; channel 2 "satisfactory", fading as the
  ship turned; VHF normal, words lost under load. Signal (telegraph beacon) normal. The tape ran
  out before the shadow (G).
- **What was automatic: everything.** Ascent, separation, orientation, the burn, separation of the
  modules, ejection, the parachutes. The Granit-5V timer started at separation from Block E and
  fired the TDU 67 minutes on (S15). Z records a ground station's claim to have commanded it; R says
  the command link "was not used".
- **What he could do.** Talk, key Morse, take food and water, write, work the tape recorder, close
  the shades, read the board. The hand controller was locked by a three-digit code (1-2-5: S), kept
  in an envelope aboard; with it, manual orientation by the Vzor and a manual command to the TDU.
  Asked afterwards, he said he could have done it (G, questions: by the Vzor, over sea or land, and
  with the Globus could pick a landing "within a 300-kilometer deviation").
- **The instruments named in the record.** The Vzor (a ring of mirrors showing the whole horizon
  when the ship is level, and a centre in which the ground runs along index marks; field of the
  centre 7°: G); the Globus (a globe turned by clockwork to show the place below, and where a
  descent begun now would land); the PKRS descent-mode windows ("Spusk", "prepare for ejection");
  the clock and stopwatch; pressures of the orientation gas (150 atm falling to 110 by the burn)
  and the TDU's bottle (320 atm); humidity 65 to 71 %, 19 to 22 °C, 1.1 to 1.25 atm in the
  instrument module (G).

## 2. What the simulator needs, and the order to build it

Each step lands by itself with tests against published values. **Done** marks what is in this
branch.

| # | Step | Tested against | For |
| --- | --- | --- | --- |
| 1 | **Done.** `src/world/orbit.ts`: elements to and from state; Kepler's equation; J2 gravity and steady rates; RK4 coast; sub-satellite point; site to inertial and back; the plane of an inclination through a place; the Earth's shadow (umbra and penumbra) | Vallado examples 2-2, 2-5, 2-6; geostationary radius; Sun-synchronous 800 km at 98.6°; critical inclination; Vostok's own heights against its period | physics |
| 2 | **Done.** `Flight.orbital` (`src/sim/orbital.ts`: `OrbitalFlight`) and this flight's record in it | `tests/orbital.test.mjs`: every figure has a source; times in order | research |
| 3 | **Done.** `flyOrbit`: the coast from the published orbit, the burn aimed by the Sun, a ballistic sphere down to 7 km, checks and `MISSES` | the record (section 5) | physics |
| 4 | Parachutes and two bodies down: the module's canopy, the seat with its drogue, the pilot under one canopy (the reserve as data), wind from a profile. Reuse `shed.ts` for the seat and hatch | landing times 10:48 and 10:53; 1.5 km apart; descent rates | physics; research for canopy figures |
| 5 | Sphere drag from a source that is opened; free-molecule drag for decay over days; heating of the ball (below) | Bailey and Hiatt; the planned 2 to 7 day decay and S15's 30 days as checks | research, then physics |
| 6 | **Done.** **Staging types.** `OrbitalFlight.stages` flown: several engines at once, each with its own tanks, thrust by pressure between its sea-level and vacuum figures, a stage dropped when its time comes. A batch `flyAscent` on a prescribed pitch programme, as `fly.ts` is | propellant used against load by each cutoff; liftoff acceleration; Gagarin's loads | physics |
| 7 | **Done**, as a stated law (src/sim/staged.ts: `steer`), with the ascent's checks and misses, and the descent's two bodies (`flyDown`) | cutoff height, level flight, speed; apogee; landing times and sink rates | physics |
| 8 | Hand-over to the live vehicle: `vehicle.ts` in the inertial frame of date (it has the frame; it needs the sidereal time of launch, which the coast already uses), N engines, N sheds at once | `flyAscent` to 0.05 % as today | physics, with **sim** |
| 9 | **Coasting fast.** Section "Time" below | drift bounds already measured | physics, with **sim** |
| 10 | Attitude in orbit: free tumble, the gas jets (two sets of eight, 1.5 kgf), the solar sensor's law, the TDU's steering nozzles, the stuck throttle and the tumble as the record has it | gas used: 150 to 110 atm; rates 2 to 3 deg/s, 6 or 30 | physics |
| 11 | The flight deck for an orbit (below) | | interface, with **sim** and **phoneui** |
| 12 | The Earth along the track (below) | | renderer: **orbit4**, **perf3** |
| 13 | The cabin as a flight deck: Globus, Vzor, clock, PKRS windows, read from the run (`CabinDef`) | the Vzor's 7° field | modelling, interface |

### Frames and the hand-over

`fly.ts` and `vehicle.ts` already integrate in a frame that does not turn, with the Greenwich
meridian on +X at liftoff. `flyOrbit` uses frames.ts's inertial frame of date itself (the same
frame turned by the sidereal time at liftoff), because the Sun is needed in it. The hand-over is
one rotation about the pole and the velocity the turning adds: `siteToInertial`,
`inertialToSite`, tested. Nothing else is needed for one orbit; the frame's own drift (precession,
half a degree in forty years) is nothing in two hours.

### Gravity, and what is left out over one orbit

Point mass and J2. J2 moves this orbit's node 0.23° west in a revolution (25 km at the equator) and
the height by kilometres: required. Left out, with what each is worth over 108 minutes: higher
harmonics (hundreds of metres), Moon and Sun (metres), sunlight's pressure (less), the air above
180 km on a 4.7 t ship (0.02 m/s: it is in the code anyway, at the standard atmosphere's density,
which at these heights is good to a factor of two with the Sun's activity). Polar motion and UT1
less UTC are below the record's precision by orders.

### Time: coasting fast, and still integer ticks

- The live simulator's tick stays 0.01 s and a flight is still a count of ticks.
- A coast (no thrust, no jets firing, dynamic pressure under a stated threshold) may be stepped
  in **whole multiples of the tick on a fixed grid**: 1 s steps on ticks divisible by 100, 10 s
  steps on ticks divisible by 1,000. The state is kept at the last grid point and the instant on
  show is reached from it by finer steps that are thrown away, so the sequence of steps to any
  tick depends on the tick alone, not on the frame rate: the same flight to the last bit, as now.
- Integrator: the RK4 already in use. Measured (`tests/orbit.test.mjs`), on this orbit over 108
  minutes: energy drifts 1e-14 of itself at 1 s, 5e-11 at 10 s, 1.2e-8 at 30 s, 3.7e-7 at 60 s;
  a Kepler orbit closes on itself to 2 cm at 10 s, 1.7 m at 30 s, 31 m at 60 s. **10 s is the
  cap.** A flight of days (the ten-day decay) would want a symplectic or an embedded high-order
  method; not for this flight.
- This is `shed.ts`'s rule already (COARSE ticks at a time, only on ticks divisible by COARSE): grid points are fixed in
  the absolute tick count, never relative to when the warp was switched on, and the threshold of dynamic pressure is a
  constant with its reason beside it (**sim**).
- Attitude on a coast: torque-free tumbling integrated at the same coarse step is wrong for a body
  turning 30 deg/s. Either the attitude stays at the fine tick (cheap: no forces) or it is
  solved in closed form for an axisymmetric body. Decide with **sim**.
- Any event (a timer, a command, the shadow, 0.05 g) cuts the step to end on its tick, as `fly.ts`
  cuts on marks. Warp drops to 1 at thrust and in the air.
- The clock today runs the flight at up to five seconds a frame. An orbit wants 100 and 1,000
  times life; light must still never step (world.md), which the terminator will test.

### Sun and shadow

`sunlit(r, sun)` gives the fraction of the Sun's disc seen past the Earth (ball of the equatorial
radius, no air: refraction makes real sunset some seconds later). `flyOrbit` reports the crossings.
The viewer needs the same number for the light on the vehicle (and through its portholes), fading
through the penumbra in the seconds it takes; and the solar sensor needs it as its input.

### Attitude and the solar orientation

Free tumble from separation (2 to 3 deg/s: G). At about 09:50 the system damps rates on the gas
jets; out of the shadow it turns the sensor's axis to the Sun and holds it; roll about that axis is
free ("it turned by about 30 degrees" between sunrise and the burn: G). A single-axis pointing law
on the existing `steer`, with `body.capsule.rcs` as the jets and the gas as a supply. Inputs wanted
and not found: the jets' places (16 on the frame: estimated), the bottles' gas mass (12, 14 or 16
bottles: in dispute), the sensor's field and the law's gains.

### Staging

- Four strap-ons and the core burn together from the ground; each is a `StageRecord` with its own
  propellant. `Body` today has one engine and one `mixture`; this is the largest change to `src/sim`
  and is why the ascent comes after the coast.
- Agreed with **sim**: `Body.engine` and `Trajectory.engine` are not stretched. A `stages` list goes beside them (each
  with its engines as a list: thrust, specific impulse, start, cutoff or depletion, station, steering; and its own shed
  event), `vehicle.ts` sums thrust over the engines burning, and the Mercury flight is the one-stage case of it with
  `tests/vehicle.test.mjs` unchanged as the proof.
- The strap-ons leave as four `ShedBody`s at once, swinging out on their tips: `part` already
  conserves momentum for two bodies; four at one instant is four calls. Their residual thrust and
  the oxygen vented from the nose (Minakov) are the push; neither has a figure.
- Block E lights through the lattice while the core burns: for some tenths of a second two engines
  push on one stack and the upper's jet pushes back on the core's top. No figure for the overlap;
  flown as an instantaneous hand-over, and said so, with Gagarin's "10 to 15 seconds of
  weightlessness" recorded against it.
- The fairing: two halves as shed bodies at 150 s (154, 156); 0.8 t (0.64).

### The burn, the tumble, the entry

- The burn is flown as an even acceleration along the line from the Sun, fixed in the frame that
  does not turn, between the derived instants of thrust. The live simulator will want the TDU as an
  engine (thrust 15.83 kN, 266 s: neither yet in `orbital.ts` because the coast does not need
  them), its four steering nozzles, and the seized pitch throttle as an event.
- The tumble as documented is two figures that differ five-fold. Fly it from the cause (a stated
  torque from escaping gas for a stated time) only when a figure for either is found; until then it
  is a prescribed rate, labelled, with both figures shown.
- The sphere: no lift, drag on its disc, centre of mass off-centre so it rights itself. The coast
  flies it as a point. Live, it is a `Body` with a `Broadside`-free shape and a static margin;
  oscillation ±90° damping to ±15° by peak load (G) is the check.
- **Heating.** `heating.ts` is Sutton and Graves at the stagnation point feeding lumps. At orbital
  speed it needs: an ablator (the lump model lets a wall heat without limit; the ball's shield
  chars and gives off mass), the stagnation point wandering on a body that rolls, and radiative
  flux stated as left out (small under 8 km/s on a 1.15 m radius). It takes `fly.ts`'s `Sample`;
  an adapter from the coast's samples is a few lines. Nothing measured to hold it to has been
  found: the shield's thickness is 30 to 180 mm (tertiary).

### Ejection and two descents

The hatch, the seat on its two rockets, the stabilising parachute, the seat falling away at 4 km,
the main canopy, the reserve, the survival pack on its line; the module's own parachute at 4 km (or
2.5: tertiary sources differ). Each is a shed body or a canopy as `shed.ts` and `chute.ts` have
them. `Trajectory` has exactly two parachutes on one body; here there are two bodies with their own.
Wanted and not read: canopy areas (574 m² for the module, 83.5 m² for the pilot's: one tertiary
source), the seat's rockets, sink rates.

### The verdict and the misses

`verdict.ts` holds a landing to `capsule.limits`. For this flight the pilot's landing is his own
(parachute sink rate against a man's legs), the module's is not survivable aboard by design (some
10 m/s: tertiary), and the verdict must know that the pilot left. A new kind of end: still in
orbit, with supplies for ten days against the decay time. `MISSES` for the coast are in
`tests/orbital.test.mjs` and in section 5.

### The flight deck for an orbit

- Readouts: apogee, perigee, period, inclination (osculating, over a stated radius: R's 6,371 km,
  so they can be read against the record), time to apogee and perigee, to shadow and sunrise, to
  the timer's burn.
- The path: the orbit in the frame that does not turn (predict.ts already draws one and gives
  elements) and the ground track over the turning Earth, two revolutions ahead, with the stations'
  circles of sight and the landing the Globus would show.
- The navball's frames: Surface and Orbit exist. Add the Sun's direction as a marker (it is what
  the ship aims by) and the Vzor's own picture as the cabin's instrument.
- **What the pilot can do. Two modes, never mixed.**
  1. **As flown.** The hand controller is locked. The player rides: reports (the record's own
     exchanges on the clock), the board, the Vzor, the Globus, the shades, time acceleration. The
     sequencer does what the Granit did, faults and all. This is the record.
  2. **Manual, by the emergency procedure.** The envelope, the code 1-2-5 on the six-key panel, the
     hand controller live, orientation by the Vzor (the horizon even in the ring, the ground
     running along the marks), the TDU by hand. It is what the ship allowed and what Gagarin said
     he could have done; it is not what happened, and the deck says so on its face and in the
     verdict ("manual descent: not the flight of 12 April"). The Flown panel keeps the record's
     run beside it.
  The ascent has no manual mode: the vehicle had none. A player may watch it or abort by the
  ejection seat (to about 40 s) as the hardware allowed; an abort is a later step.

### The viewer

- The globe exists with coast, relief, colour and a fine region round the Cape. This flight needs a
  `RegionDef` round Tyuratam (site1's) and one round the landing (Saratov, Engels, the Volga:
  about 50° to 52.5° N, 44° to 48° E, dated 1961: the Volgograd reservoir was filled by then, the
  Saratov bridge of 1965 was not built). Nothing finer anywhere else: the track is seen from 180 to
  327 km.
- The night side and the terminator are lit by the true Sun already (`chapman`). To be checked
  from orbit at 1,000 times life: no stepping of light, stars by `starLimit` in shadow, the
  horizon's bands at sunrise as G describes them (orange, through the rainbow, to blue, to black).
  City lights: none in 1961 worth drawing over the Pacific; none is proposed.
- The ground track and the orbit as `Stage.overlay` lines; the vehicle found again from any
  distance (the chase rig's range grows from tens of kilometres to the whole Earth).
- The entry's glow (`entry.ts`) is scaled by heat flux over 250 kW/m²: an orbital entry is some
  1 MW/m², so this is the flight it was written for. The crimson light at the shutters' edges (G).

## 3. Inputs

### Found

Every one is in [orbital.ts](orbital.ts) with its source; the launch vehicle's in
[vostok-8k72k.md](../../vehicles/vostok-8k72k.md), "Masses" and "Engines".

| Input | Value | Confidence | Source |
| --- | --- | --- | --- |
| Liftoff | 06:06:59.7 UTC | documented | S launch log; R |
| Site | 45.92025° N, 63.34225° E, 78 m | documented (place), estimated (height) | site-1.ts; the site's own frame and what stands in it: sites/site-1.md |
| Liftoff mass | 287 t | documented | RKK Energia. 281.4 to 291.2 t in print |
| Strap-on, each | 43.3 t; 3.75 t dry; 39.16 t propellant | documented, three sources that do not sum | Astronautix; Minakov; Brügge |
| RD-107 | 815.9 kN and 256 s at the ground; 997.7 kN and 313 s in vacuum | documented, secondary | Energomash's table by way of Brügge |
| Core | 100.4 t; 6.8 t dry; 90.1 t propellant | documented, do not sum | as above |
| RD-108 | 744.3 kN, 248 s; 945.4 kN, 315 s | documented, secondary | as above |
| Block E | 7,984 kg; 1,472 kg burnt out | documented | Minakov |
| RD-0109 | 54.5 kN, 323.5 s, vacuum | documented, secondary | Brügge |
| Fairing | 0.8 t (0.64) | documented, secondary | Z (Brügge) |
| Spacecraft | 4,725 kg | documented | RKK Energia; FAI |
| Event times | 119, 150, 300, 676, 688.3 s | documented | S; G; R |
| Orbit | 181 by 327 km, 64°57′, 89.44 min | documented | R |
| Orbit's reference ball | 6,371 km | derived | heights against period |
| TDU command, thrust on, thrust off | 4,684.5; 4,688.2; 4,726.7 s | documented; derived; derived | R |
| Braking impulse | 132 m/s | documented, secondary | Z, after L |
| Aim of the burn | nozzle to the Sun | documented | G; R |
| TDU | 1,614 kgf, 266 s, 275 to 280 kg | documented | S p. 197; Astronautix |
| Module separation | 5,340 s | documented | R (G: a minute earlier) |
| Descent module | 2,460 kg, 2.3 m | documented | S p. 195 |
| Ejection height | 7,000 m | documented, "approximately" | G |
| Landing | 51°16′ N, 45°59′ E; 10:48 and 10:53 | documented | R |

### Not found, and what is honestly possible

| Input | State | Proposal |
| --- | --- | --- |
| **Launch azimuth as flown** | **found**: 34°37′59″.2, the aiming line's, in Gagarin's flight task (section 6) | Flown: the orbit comes out at 64.99° against 64.95° |
| **The solar sensor's axis against the engine's** | not found | The record's words are flown as written (push straight from the Sun) and the miss recorded. Research first; no angle is to be chosen to bring the landing in |
| **What kind of elements the published orbit is** | not stated | Flown as osculating at cutoff, which the flown apogee shows to be wrong by 18 km. Next: read them as mean elements, through a stated first-order conversion (Kozai's, tested against a published case), and say so |
| **Where on the orbit at cutoff** (`injection.arc`) | not found | **Estimated** today: 27.5° by hand, ±3°. Replaced by the flown ascent (step 7), when it becomes *derived*. Not to be solved from the landing point |
| **Argument of perigee** (`injection.anomaly`) | not found | **Estimated**: perigee at cutoff. The ascent gives it. G's "apogee at Cape Horn" is a loose check, not an input |
| **Pitch programme** | not found for the 8K72K (searched: Chertok vols 2 and 3, Siddiqi, Zak, K, B21, the 1957 reports of Sputnik's launch). Soyuz's from Baikonur is published (Starsem's manual, Fig. 2-4), a different vehicle | **A stated law**, `ascent.guidance` (src/sim/staged.ts): vertical for 15 s (estimated, from Soyuz's), a pitch-over over 10 s (estimated) to an angle that is solved, no angle of attack through the air to the strap-ons' separation, then the linear-tangent law to the last cutoff; the launch plane, the pitch-over's angle and the tangent's rate solved so that at 676 s it is level at the planned 180 km in a plane of 64.95°. So perigee and inclination are targets, not checks; **apogee, period, speeds and loads are results**. It is not the stored programme, which had radio corrections until 156 s |
| **Throttle** | found in kind, not in level: the strap-ons' intermediate stage before separation, the core's final stage on its steering chambers for 10 s (the 8D75's, lpre.de; Gagarin's 10 to 15 s of weightlessness), the RKS and SOB regulators | **Flown in kind at estimated levels** (section 6, "read again"): 60 % for the strap-ons' last 6.4 s, 10.4 % for the core's last 10 s. Worth more than the whole miss either way |
| **Cutoff logic** | found: the strap-ons by the integrator at 119.50 s (PPP); the core by the autonomous system 0.46 s late, the radio command having failed; Block E 2.4 s long; 25.43 m/s over (B21) | Fly the record's times (119.5, 300, 676 s) and let the orbit be a result. 0.6 s is worth 100 km of apogee (L), so **expect apogee in `MISSES`**, blamed on thrust and mass figures good to 1 to 4 %; do not tune |
| **Nozzle exit areas** | the chambers' exits found (lpre.de, from Gakhun et al.): 720 mm main, 310 mm steering | **Derived** from the two thrusts, 1.794 and 1.985 m², which the geometry confirms to 1 and 3 % |
| **Drag of the stack against Mach** | not found for any R-7 | **Estimated**, and labelled: a curve of the usual form on the cluster's frontal area (29.4 m², derived). The test prints what ±30 % of it moves |
| **Drag of the sphere** | not read | **Estimated** from memory of the standard curve; becomes *documented* when Bailey and Hiatt or Hoerner is opened (step 5). 0.92 hypersonic |
| **Mass at each event** | not found | **Derived** from the stage figures and flows; the stage figures' own spread (1 to 4 %) is carried as the uncertainty |
| **Propellant burned before liftoff** | not found | left out, and said so |
| **Separation's push, TDU's after-thrust, the tumble's torque** | not found | left out; listed with the simplifications |
| **Parachute areas, sink rates, wind aloft** | areas and heights found (Bobkov, OKB-1, 1991; GCTC; B21); wind aloft at Saratov not found | `descent` in orbital.ts: drag coefficients on the canopies' areas (0.75) and fill times chosen; no wind |
| **Jets' places, gas mass, sensor law** | not found | estimated, labelled, step 10's research |

## 4. Risks, and who does what

| Risk | What follows |
| --- | --- |
| The ascent cannot hit the apogee: half a second of burn is 100 km | Planned for: apogee is a result and a recorded miss. The coast is flown from the published orbit, as the Mercury capsule's half is flown from the report's separation, so the orbit, burn and entry do not wait on it |
| The injection point is an estimate, so the landing along the track is too | Reported apart from the cross-track miss, which does not depend on it |
| `Body` and `vehicle.ts` assume one engine and one burn | The largest change; owned with **sim**; staged after its abort and wind work lands |
| The record disagrees with itself (6 or 30 deg/s; 10:35 or 10:36; 150, 154 or 156 s) | Both kept as data (`EventRecord.also`); the simulator takes the one named and says which |
| Soviet primary sources are in translation or at second hand | *Pervyi pilotiruemyi polet* (2011) and *Novosti Kosmonavtiki* (Lissov) are the next things to read: the node, the injection point and the drop zones may be in them |
| Time acceleration breaks "the same flight at any frame rate" | The grid rule above; tested before it is used |
| Light stepping at 1,000 times life across the terminator | Checked as world.md says, before orbit is offered at that rate |

Order: steps 4 and 5 (physics, small) can go now. Research in parallel: the 2011 volumes and
Lissov for the azimuth, injection and drop zones; a sphere-drag source; parachutes. Steps 6 to 8
after **sim**'s current work lands. 9 and 10 after 8. 11 to 13 need 9 and each other's owners.

| Worker | Takes |
| --- | --- |
| Research | the 2011 documents, Lissov, the FAI file; drop zones; sphere drag; parachutes; jets and gas; a drag analogue for the stack |
| Physics | steps 4 to 10 |
| Modelling | the cabin's instruments as nodes with scales (Globus, Vzor, clock, PKRS, gauges); the seat, hatch and canopies as nodes; the landing region |
| Interface | the orbit deck, the two modes, the ground-track map, time acceleration's control |
| Renderer | the terminator at speed, the two regions, the path overlays, finding the vehicle from afar |

## 5. What the coast gives today

`flyOrbit` (src/sim/orbital.ts), from the inputs above with nothing adjusted; printed by
`tests/orbital.test.mjs`, which fails on a miss that is not recorded in its `MISSES`. Tolerances were
set in orbital.ts before the simulator was written.

| | Coast | Record | Tolerance | |
| --- | --- | --- | --- | --- |
| Period, from the published heights | 89.44 min | 89.44 min (R) | 2 s | holds (it is how the 6,371 km ball was found: a check on the record, not on the flying) |
| Apogee, flown round | 345.0 km | 327 km (R) | 5 km | **misses by +18 km** |
| Into the Earth's shadow | 09:35:18 | "before" the orientation of about 09:50 (G, Z) | | not held: no time in the record |
| Out of it | 10:09:30 | before the burn; orientation complete after it (G) | | not held |
| Burn begins over | 12.0° S, 9.3° E (off Angola) | "over Africa" (G) | | not held; agrees |
| Push off retrograde | 54° | | | see section 1 |
| Perigee after the burn | -37 km | | | no figure in the record |
| Height at 10:36 | 137 km | 150 to 160 (L); 150 to 170 (S15) | 15 km about 155 | **misses by -18 km** |
| Through 100 km | 10:39:02, 7,683 m/s through the air, 1.48° below level | | | no figure in the record |
| Greatest load | 8.55 g | "beyond 10" (G); 10 to 12 (S15) | 2 g about 10 | holds, at the low edge. A sphere with no lift from this orbit gives 8 to 9 g whatever else is changed |
| Greatest dynamic pressure | 54 kPa | | | |
| At 7 km | 10:45:45, falling 209 m/s | 10:42 (Z) | 60 s | **misses by +225 s** |
| Place, across the track | 69 km left | 51°16′ N 45°59′ E (R) | 25 km | **misses** |
| Place, along the track | 467 km beyond (54.82° N, 49.85° E) | the same | 100 km | **misses** |

What the misses say, in order of what is learned:

1. **Across the track is the burn's aim.** All 69 km is the sideways part of a push along the Sun's
   line. With the same impulse straight against the motion the miss across is 9 km (and along, 14 km,
   which the uncertain injection point makes no proof of anything). The plane derived from the
   inclination and the pad is therefore good to about 10 km at the landing, and the record's "TDU
   directed to the Sun" is not the whole of the geometry.
2. **The apogee is how the orbit is read.** The published heights are not osculating at cutoff.
3. **Along the track has three owners**, each worth hundreds of kilometres: the injection point
   (129 km a degree, estimated to 3°), the aim, and the reading of the orbit (both heights 9 km lower:
   302 km shorter). It is not to be tuned; the ascent flown replaces the first.
4. **The time at 7 km** is late partly because the place is long (467 km is a minute) and partly
   because the descent is slower than the flight's was, which is the aim again.
5. **The load does not depend on any of this**: 8.4 to 9.1 g across every variation tried. Gagarin's
   "beyond 10" is a sensation; "about 8", in print without a source, is what a ballistic sphere gives.

What each input moves (from the same test): `retro.deltaV` +4 m/s (as programmed): 157 km shorter;
+5 %: 254 km shorter. `orbit.radius` at the equatorial 6,378 km: 241 km further. `injection.anomaly`
+30°: 310 km shorter. The sphere's drag or mass ±5 %: 14 km. The module separation a minute earlier
(G's 10:35): nothing.

Not verified: the shadow against any published case (geometry only); the Sun-aimed push against
anything but the record's words; the sphere's drag curve against its source.

## 6. What the ascent gives

`flyWhole` (src/sim/staged.ts): the ascent from the pad on the stated law, the coast from where it left the spacecraft,
the two bodies down from 7 km; printed by `tests/staged.test.mjs`, which fails on a miss not recorded in its `MISSES`.
The checks were set in orbital.ts before any of it was flown.

| | Flown | Record | Tolerance | |
| --- | --- | --- | --- | --- |
| The law, solved | plane 66.58° at liftoff; pitch-over 9.37°; tangent falling 0.000526 a second | | | the launch plane is tilted 1.6° past the orbit's to take out the pad's own eastward motion |
| Strap-ons leave, 119.5 s | 42.7 km, 68 km down range, 2,413 m/s (2,222 through the air), climbing 18.1° | | | Sputnik's (a different vehicle, two stages): 57.7 km, 54.8 km, 2,189 m/s Earth-fixed, 36.3° |
| Greatest dynamic pressure | 49.6 kPa at 62 s | | | Soyuz's manual: 36 kPa at 66 s |
| A minute up | 2.19 g | 3 to 4 g (Z, by feel) | 1 g about 3.5 | **misses by -1.3 g**: thrust and mass give 2.4; Soyuz shows 2.6 |
| Greatest on the first stage | 5.25 g | about 5 (G, by feel) | 1 g | holds |
| Core cuts off, 300 s | 135.5 km, 699 km down range, 5,810 m/s | about 5.5 km/s (Z) | 400 m/s | holds. At rated flow its 90.1 t is gone at 294.4 s: it coasts 5.6 s before Block E lights |
| Last cutoff, 676 s | 180 km level, 7,986 m/s; 28.98° round from the pad (the coast's estimate: 27.5 ± 3) | | | |
| Perigee, inclination | 180 km, 64.950° | 181 km, 64°57′ (R) | | hold **by construction**: they are the law's targets |
| Apogee | **844 km** | 327 km (R) | 10 km | **misses by +517 km** |
| Period | 94.72 min | 89.44 min (R) | 15 s | misses, with the apogee |
| What the spacecraft weighs on leaving Block E, by the stages' own figures | 4,616 kg | 4,725 kg (RKK Energia) | | the record's masses do not quite sum (mission.md's sources disagree by 1 to 4 %) |
| Then the coast: height at 10:36 | 327 km | 150 to 170 (L; S15) | 15 km | misses |
| At 7 km | 10:48:58 | 10:42 (Z) | 60 s | misses by 7 min |
| Landing | 325 km short along the track, 96 km to the left | 51°16′ N 45°59′ E (R) | 100 and 25 km | misses |
| Module down; pilot down | 10:53:46, 9.0 m/s; 11:02:22, 4.5 m/s; 300 m apart | 10:48, 10 m/s; 10:53, 5 m/s; about 1.5 km (R; Bobkov; GCTC) | 120 s, 2 m/s, 1.5 m/s, 3 km | times miss, by the late arrival; sink rates and separation hold |

**The finding: the vehicle as recorded is 142 m/s too fast.** It passes the speed the record's orbit needs at 180 km
(7,844 m/s) 16 s before the recorded cutoff. Nothing was tuned to that or away from it. What owns it, from the same
test, each with the law solved afresh:

| Changed | Speed at cutoff | Apogee |
| --- | --- | --- |
| The core's load less its peroxide and nitrogen (3.12 t, Brügge) | -487 m/s | below the orbit |
| The strap-ons' less theirs (1.47 t) | -192 m/s | below the orbit |
| The tangent law from the core's cutoff, not the strap-ons' | -89 m/s | -327 km |
| The drag curves x 1.3 | -71 m/s | -261 km |
| The spacecraft 1 % heavier | -20 m/s | -74 km |
| The vertical rise 5 s longer | -6 m/s | -24 km |
| The core 1 % less thrust and flow; Block E 1 % less impulse | -2.5; +4.1 m/s | -9; +15 km |

So the published loads alone are worth several times the miss either way: which part of each stage's load the engines
burn is the input to find first, then the levels of the engines' intermediate and final stages of thrust (documented in
kind; flown here at rated thrust, which overdraws the core's load by 1.7 t at its recorded cutoff), then a pitch
programme. The real vehicle hid all of it: its integrators cut each stage on the velocity reached, and on 12 April that
came out 25.43 m/s fast (B21), where this run, cut by the clock at the record's instants, is 142.

### Cut on velocity, as the integrators cut it

The run above burned every stage to its recorded instant. The vehicle did not: its integrators cut each stage on the
velocity reached. Block E is now cut when its space-fixed speed reaches what the planned orbit needs at its perigee
(7,815.2 m/s, derived from Zak's 180 by 230 km over the 6,371 km ball) plus the documented 25.43 m/s over the design
(B21): `StageRecord.velocity`. The strap-ons keep the integrator's documented 119.50 s; the core keeps its 300 s,
because its design cutoff velocity has not been found. The recorded 676 s becomes a check (3 s, set before the run).

| | Burned to the times | Cut on velocity | Record | |
| --- | --- | --- | --- | --- |
| Block E cut off | 676 s (input) | **659.3 s, 338 kg left** | 676 s (S) | **misses by -16.7 s**: the vehicle as recorded still has 142 m/s more than it needs, and now it shows here |
| Orbit at cutoff | 180 by 844 km | 180 by 317 km, 89.33 min | 181 by 327 km, 89.44 min | apogee **misses by -10.04 km** (tolerance 10): the record's own figures do not quite agree (below) |
| Apogee flown round | 864 km | 335 km | 327 km | misses by +8 km: the elements at cutoff and the orbit flown round differ by 18 km under J2 |
| Height at 10:36 | 327 km | 132 km | 150 to 170 | misses by -23 km (the Sun-aimed burn, as in the coast from the published orbit) |
| At 7 km | 10:48:58 | 10:45:29 | 10:42 | misses by 3.5 min |
| Landing, across | 96 km left | **7 km left** | | **holds** (25 km) |
| Landing, along | 325 km short | 559 km beyond | | misses |
| Module, pilot down | 10:53:46, 11:02:22 | 10:50:17, 10:58:52 | 10:48, 10:53 | miss, by the late arrival at 7 km and the descent's own length |

**The record does not quite add up.** The planned orbit needs 7,815.2 m/s at 180 km; 25.43 m/s over it is 7,840.6;
the published 181 by 327 km needs 7,843.8. So cut where the record says, level at 180 km, the orbit is 317 km high at
its top, not 327. Which figure is off (Zak's planned orbit, Baturin's 25.43, the reference ball, or what kind of
elements the published orbit is) is not known, and nothing was changed.

What moves the cutoff now (the law solved afresh): the core's load without its peroxide and nitrogen leaves Block E
dry before its speed (-314 m/s, 19.7 s later); the strap-ons' likewise (-19 m/s); the law's shape 10 s; drag x 1.3, 8 s.

### The record read again: the flight task, the blocks' masses, the throttling

Three corrections to the inputs, none of them fitting (sources: docs/sources.md, "The ascent and the descent"):

- **Gagarin's flight task, page 1** (ЦА РКВ ф. 19, оп. 114сс, д. 15; pictured in Kommersant Nauka No. 9, 2021; read off a
  1,200-pixel image): the aiming azimuth **34°37′59″.2**; the third stage's main cutoff at **2,283.52 m/s of apparent
  velocity** (the third numeral could be a 6); the planned landing **52.5° N, 47.7° E**; the flight 1 h 46 min, 1.03 orbits.
  Also on it, not yet used: the B-137M's charging times for "Разделение", 308.29 s, and "Наддув", 399.88 s. The azimuth now
  sets the launch plane (the law solves two unknowns, not three) and Block E is cut on its apparent velocity.
- **The blocks' propellant figures were Soyuz-ST's**: Brügge's 39.16 t, 90.10 t, 1.47 t and 3.12 t are Arianespace's
  figures for Soyuz-ST, copied into every R-7. For the 8K72K only fuelled and dry masses exist: everything not structure is
  taken as what a block can burn (39.55 t, 93.6 t: derived), drained at the engine's whole flow, which already counts the
  turbine's peroxide (the RD-107's impulse is thrust over kerosene, oxygen and peroxide together: lpre.de).
- **The throttling, in kind**: the strap-ons' intermediate stage before separation and the core's final stage on its
  steering chambers for its last 10 s (the 8D75's, lpre.de; Gagarin's 10 to 15 s of weightlessness). Their levels for the
  8K72K were not found: 60 % (the 8K71's) and 10.4 % (the four steering chambers at their rated thrust, the most it can be).

| | Burned to the times (first reading) | Cut on the planned orbit's speed (second) | Read again (now) | Record | |
| --- | --- | --- | --- | --- | --- |
| Block E cut off | 676 s | 659.3 s | **676.4 s, 46 kg left** | 676 s | **holds**: the integrator's setting and Block E's figures agree with the recorded instant |
| Inclination | 64.95° (target) | 64.95° (target) | **64.99°** | 64.95° | **holds**, and is now a check |
| Core cut off | 5,810 m/s | 5,812 | 5,542 m/s, **4.5 t left** | about 5.5 km/s | holds |
| At the last cutoff | 7,986 m/s | 7,841 | **7,686 m/s, 157 short** | 7,844 needed | **misses: does not reach orbit** (perigee -189 km) |
| Most load, first stage | 5.25 g | 5.25 | 4.72 g | about 5 | holds |

**The finding now.** With the third stage cut where its integrator was set and arriving at the recorded instant, the
miss is the first two stages': 157 m/s short. Their throttling, documented in kind, is worth more than the whole miss either
way (no core final stage: +443 m/s; 5 s of it, not 10: +221; no strap-on intermediate stage: +143), and the core carries 4.5 t
to its cutoff, which a vehicle with tank-emptying regulators would not. So the core's load (100.4 less 6.8 t) and its final
stage as the sources give them do not agree with one another; which is wrong is not known.

**What is shown.** The scene, the deck and the coast's and descent's checks now fly the ascent as above and, from the
spacecraft's separation, the published orbit begun where the ascent left it (`published` in staged.ts: the place and
instant the ascent's, the speed the published orbit's there). That retires the estimated `injection.arc` (27.5°; the
ascent puts it at 27.84°). Flown so: period 89.44 min (holds), apogee flown round 346 km (+19), 138 km at 10:36, 10:45:40 at
7 km, landing 465 km long and 13 km across (holds), module 10:50:28, pilot 10:59:04.


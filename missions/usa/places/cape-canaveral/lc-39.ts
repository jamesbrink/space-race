import type { Keyframe, Machine, ModelDef, Move, Part, SiteDef } from '../../../../src/types.ts';
import { CAPE_CANAVERAL } from './place.ts';

const FT = 0.3048;
const KIT = 'Apollo 8 press kit, Launch Complex 39, “Mobile Launcher” and “Flame Trench and Deflector”';
const deck = (22 + 25) * FT;

function site(pad: 'A' | 'B', latitude: number, longitude: number, zone: SiteDef['zone']): SiteDef {
  const position = 'Approximate WGS 84 location of the launch axis at Kennedy Space Center, Pad ' + pad;
  return {
    name: 'Kennedy Space Center, Launch Complex 39' + pad,
    place: CAPE_CANAVERAL,
    latitude: { value: latitude, confidence: 'estimated', source: position },
    longitude: { value: longitude, confidence: 'estimated', source: position },
    height: {
      value: -29 + (pad === 'A' ? 48 : 53) * FT + deck,
      confidence: 'estimated',
      source: 'Apollo 10 press kit pp. 83–84: Pad A hardstand at 48 ft MSL, Pad B five feet higher. Cape geoid estimated at −29 m.',
    },
    grade: {
      value: -deck - 42 * FT,
      confidence: 'estimated',
      source: KIT + ', surrounding land approximated at the elevation of the trench floor.',
    },
    bearingX: {
      value: 0,
      confidence: 'assumed',
      source: 'Apollo/Saturn V Orientation and Camera Target Locations, figure 3-1. Tower north of vehicle.',
    },
    seaLevel: { value: -29, confidence: 'estimated', source: 'Cape EGM96 geoid rounded to a metre, as at LC-34.' },
    zone,
  };
}

export const LC39A = site('A', 28.6084, -80.6043, { name: 'EST', utcOffset: -5 });
export const LC39A_EDT: SiteDef = { ...LC39A, zone: { name: 'EDT', utcOffset: -4 } };
export const LC39B = site('B', 28.6272, -80.6208, { name: 'EDT', utcOffset: -4 });

function part(node: string, name: string, summary: string, detail: string): Part {
  return { node, name, summary, detail, order: 0, explode: [0, 0, 0], group: 'Launch Complex 39' };
}

const MANUAL = 'Saturn V Flight Manual SA-504, section VIII, figure 8-8.';
function armSwing(node: string, from: number, to: number, degrees = 90): Move {
  return {
    kind: 'swing',
    node,
    from,
    to,
    axis: [0, 1, 0],
    angle: (degrees * Math.PI) / 180,
    machine: {
      kind: 'hydraulic',
      confidence: 'documented',
      source: 'Apollo 8 press kit, Mobile Launcher. Hydraulic retraction. Mechanism sound approximated.',
    },
  };
}

interface Countdown {
  pad?: 'a' | 'b';
  ingress: number;
  parkCommand?: number;
  parkedBy: number;
  retractedBy?: number;
  pao: string;
  intertankClear: number;
  forwardRetract: number;
  terminalSource: string;
  intertankLatch?: number;
  firstMotion?: number;
  terminalConfidence?: 'assumed' | 'documented';
  holdDowns?: 'as-506' | 'as-507' | 'as-508' | 'as-509' | 'as-510' | 'as-511' | 'as-512';
}

const cover508 =
  'Launch film showed the umbilical cover on the stage failed to secure after this arm withdrew. The arm itself reached its latch. Its swing follows the flight manual’s nominal timing.';

interface Installation {
  pad?: string;
  tail: string;
  mastStrokes?: Record<'1_2' | '3_2' | '3_4', number>;
  hold: string;
  arm?: Record<number, string>;
}

// The same launcher's record and fittings can change between flights.
const installations: Record<NonNullable<Countdown['holdDowns']> | 'common', Installation> = {
  common: {
    tail: 'Two stood west of the engine opening and one to the east. Their steel supports and umbilical housings are simplified.',
    hold: 'Each holds a fitting at the foot of the first stage until release. Their geometry is reconstructed.',
  },
  'as-506': {
    pad: 'a-1969-07',
    tail: 'At liftoff the umbilical carriers drew back as the booms swung upright. All three protective hoods closed on Apollo 11. The individual transit times are estimated.',
    hold: 'All four released at T+0.3 s. Film showed the protective hood on No. 1 stayed open and the other three appeared to close late. The exhibit estimates their closing times and assumes No. 1 occupied position I.',
  },
  'as-507': {
    pad: 'a-1969-11',
    tail: 'All three retracted normally. As the booms rose, the umbilical carriers drew back into their protective housings. The individual strokes and hood closing times are estimated.',
    hold: 'ML-2 released SA-507 at T+0.25 s. All four arms unlatched within eight milliseconds. Their individual movements and the subsequent closing of the four protective hoods are reconstructed.',
    arm: {
      2: 'A valve in this arm’s industrial-water quench system failed to open after liftoff. Favorable wind and water spilling from the arms above protected it from apparent damage. Valve geometry and piping are estimated.',
      5: 'Launch film showed that the S-II forward umbilical cover did not secure when this arm withdrew. The five inflight arms began to swing when the vehicle moved. Individual sweeps are reconstructed.',
    },
  },
  'as-508': {
    pad: 'a-1970-04',
    tail: 'Television and the control panel showed all three masts retracted together and their hoods closed within four seconds of aft-plate separation. Individual timings are estimated because the digital event recorder failed.',
    hold: 'ML-3 released SA-508 at T+0.3 seconds. Switches at two hold-downs triggered the five inflight arms as the rocket rose. The four linkage and hood trajectories follow the nominal arrangement.',
    arm: {
      1: 'Two lines supplied the first-stage oxygen tank through its intertank. Replenishment began at T−5 h 41 min. The carrier withdrew on pneumatically driven parallel links. Inspect the flanged couplings and reconstructed ground-side pipework.',
      4: cover508,
      5: cover508,
    },
  },
  'as-509': {
    pad: 'a-1971-01',
    mastStrokes: { '1_2': 2.168, '3_2': 2.496, '3_4': 2.131 },
    tail: 'The measured strokes from plate separation to retraction were 2.168 s for mast 1-2, 2.496 s for 3-2 and 2.131 s for 3-4. After mast power went off, cutoff valve A18651 opened and residual RP-1 entered the piping in launcher room 4A. The replacement valve was scheduled for the next flight.',
    hold: 'All four arms released pneumatically within four milliseconds. SA-509 first moved at T+0.2 s. Two primary service-arm control switches closed 418 and 424 milliseconds after launch commit. The linkage and hood travel are reconstructed.',
    arm: {
      1: 'The S-IC received oxygen here. At 08:46 EST all three stages were replenishing. A replacement vent valve on the first stage worked throughout the countdown. The two ground-side couplings follow the preceding Saturn V installation.',
      2: 'A water header served the S-IC forward arm. The exhibit carries forward the quench valve and pipework reconstructed for this same mobile launcher on Apollo 12. The ground team reported satisfactory service-arm operation on Apollo 14.',
    },
  },
  'as-510': {
    pad: 'a-1971-07',
    mastStrokes: { '1_2': 2.307, '3_2': 2.151, '3_4': 2.688 },
    tail: 'Mast 3-2 retracted fastest. From plate separation to full retraction the booms took 2.307 seconds on 1-2, 2.151 on 3-2 and 2.688 on 3-4. Earlier, a pressure meter for mast 3-2 in Launch Control read about 150 psi low. Controllers monitored the pressure switches for readiness.',
    hold: 'The four hold-down arms released pneumatically within three milliseconds. The two primary service-arm control switches closed 449 and 476 milliseconds after launch commit. The exhibit places release at first motion and reconstructs the linkage and hood travel.',
    arm: {
      1: 'Two lines fed the S-IC oxygen tank through the intertank. During fast fill a gasket leaked at filter A224 in the lower fill-and-drain line. The leak stopped after about five minutes as the filter chilled. The exposed ground couplings and links follow this launcher’s Apollo 13 reconstruction.',
    },
  },
  'as-511': {
    pad: 'a-1972-04',
    mastStrokes: { '1_2': 2.649, '3_2': 2.292, '3_4': 2.505 },
    tail: 'From plate separation to full retraction, mast 1-2 took 2.649 seconds, mast 3-2 took 2.292 and mast 3-4 took 2.505. On this flight the team adjusted the first stage’s RP-1 level and inerted its fill line at T−60 minutes.',
    hold: 'All four hold-downs released pneumatically within twelve milliseconds. The two primary arm-control switches closed 423 and 417 milliseconds after launch commit. Bolts sheared on one side of hold-down No. 4’s fixed hood, warping both its fixed and moving hoods. The exhibit shows the intact launcher at release.',
    arm: {
      1: 'Two lines fed oxygen into the first stage through the intertank. After the carrier retract command its connected indication persisted for 35.9 seconds, much longer than in warm ground tests. The switches were sensitive to the cold. The arm itself withdrew normally.',
    },
  },
  'as-512': {
    pad: 'a-1972-12',
    mastStrokes: { '1_2': 2.76, '3_2': 1.98, '3_4': 2.685 },
    tail: 'Mast 3-2 was the first back. Its measured stroke from umbilical plate separation took 1.980 s, against 2.760 s for mast 1-2 and 2.685 s for mast 3-4. The breakaway instant of each carrier is estimated.',
    hold: 'The four hold-downs released pneumatically within six milliseconds of one another. Both primary service-arm switches closed 449 milliseconds after launch commit. The linked hoods are shown moving on reconstructed strokes.',
    arm: {
      1: 'At the first T−30 seconds the sequencer lacked confirmation of S-IVB oxygen tank pressurization. The interlock held this carrier at the rocket and stopped the count. It retracted on the successful count.',
      7: 'A sensor at the third-stage hydrogen vent disconnect intermittently detected gaseous hydrogen during the countdown. The team accepted the reading for launch. The coupling, sampling head and conduit are reconstructed on the arm.',
      9: 'The white room swung clear on the first count. During the hold it returned to the 12° standby position. At the end of the second count, the arm swung back alongside ML-3 again.',
    },
  },
};

export function mobileLauncher(
  number: 1 | 2 | 3,
  {
    pad = 'a',
    ingress,
    parkCommand,
    parkedBy,
    retractedBy,
    pao,
    intertankClear,
    forwardRetract,
    terminalSource,
    intertankLatch,
    firstMotion = 0,
    terminalConfidence = 'assumed',
    holdDowns,
  }: Countdown,
): ModelDef {
  const as507 = holdDowns === 'as-507';
  const as508 = holdDowns === 'as-508';
  const as509 = holdDowns === 'as-509';
  const as510 = holdDowns === 'as-510';
  const as511 = holdDowns === 'as-511';
  const as512 = holdDowns === 'as-512';
  const laterLauncher = holdDowns !== undefined && holdDowns !== 'as-506';
  const manualSerial = as510 || as511 || as512 ? '510' : as508 ? '508' : '507';
  const manual = laterLauncher ? `Saturn V Flight Manual SA-${manualSerial}, section VIII, figure 8-8.` : MANUAL;
  const evaluation = `AS-${holdDowns?.slice(3) ?? '506'} Flight Evaluation Report, §${as511 || as512 ? '3.5.1' : '3.6.1'}.`;
  const armSchedule = `SA-${manualSerial} Flight Manual, figure 8-20. Nominal end of the retract-and-lock interval.`;
  const configuration = installations[holdDowns ?? 'common'];
  // Layout along the common countdown slider. Inflight sweeps share its final nine seconds.
  const arms: [string, number, number][] = [
    ['S-IC intertank', 0.4, 0.5],
    ['S-IC forward', 0.5, 0.6],
    ['S-II aft', 0, 0.1],
    ['S-II intermediate', 0.6, 0.6 + (0.4 * 6.4) / 9],
    ['S-II forward', 0.6, 0.6 + (0.4 * 7.4) / 9],
    ['S-IVB aft', 0.6, 0.6 + (0.4 * 7.7) / 9],
    ['S-IVB forward', 0.6, 0.6 + (0.4 * 8.4) / 9],
    ['Service module', 0.6, 1],
    ['Spacecraft access', 0.1, 0.4],
  ];
  const key = (at: number, slider: number, event: string, confidence: Keyframe['confidence'], source: string): Keyframe => ({
    at,
    slider,
    event,
    confidence,
    source,
  });
  const sequence = [
    key(-43200, 0, 'S-II aft access arm withdraws', 'estimated', manual + ' Withdrawn as required. Time placed before crew ingress.'),
    key(-43170, 0.1, 'S-II aft arm clear', 'estimated', manual + ' Travel duration reconstructed.'),
    key(
      ingress,
      0.1,
      as511 || as512 ? 'Scheduled crew ingress' : 'Commander enters the spacecraft',
      as511 || as512 ? 'assumed' : as509 ? 'estimated' : 'documented',
      as511
        ? 'Apollo 16 press kit, countdown at T−2 h 40 min. The schedule stands in for the unrecorded entry time.'
        : as512
          ? 'Apollo 17 press kit, countdown at T−2 h 40 min against the original 21:53 EST launch time.'
          : pao,
    ),
    key(
      parkCommand ?? parkedBy - 30,
      0.1,
      'Crew access arm leaves the hatch',
      parkCommand === undefined || as509 ? 'estimated' : 'documented',
      parkCommand === undefined ? pao + ' Travel placed before the standby report.' : pao,
    ),
    key(parkedBy, 0.2, 'Crew access arm in its 12° standby position', 'estimated', pao + ' Arrival estimated from the standby exchanges.'),
    ...(as512
      ? [
          key(
            -9900,
            0.2,
            'First countdown: crew arm leaves standby',
            'estimated',
            pao + ' MC15/1 observed motion at the original T−4:55. The estimated ten-second stroke straddles that call.',
          ),
          key(-9890, 0.26, 'Arm alongside the tower before the first cutoff', 'estimated', pao),
          key(
            -8875,
            0.26,
            'Safing: crew arm swings back toward America',
            'estimated',
            pao + ' Flight Journal audio reports motion about 12 min 40 s after the cutoff at 02:52:30 UTC.',
          ),
          key(
            -8865,
            0.32,
            'Crew arm back at 12° for the recycle',
            'estimated',
            pao + ' A ten-second stroke is estimated. Launch Control confirmed standby shortly afterward.',
          ),
        ]
      : []),
    key(
      as511 ? -277 : -300,
      as512 ? 0.32 : 0.2,
      'Crew access arm retracts from standby',
      as510 || as511 || as512 ? 'estimated' : as509 ? 'assumed' : 'documented',
      as512
        ? pao + ' MC43/1 scheduled withdrawal near the five-minute mark. MC44/1 reported it in motion just after that mark.'
        : as510
          ? pao + ' Motion was observed just before the five-minute mark. The model rounds the start to that minute.'
          : pao,
    ),
    key(
      retractedBy ?? (as511 ? -267 : laterLauncher ? -290 : -270),
      0.4,
      'Crew access arm fully retracted',
      retractedBy === undefined ? (laterLauncher && !as511 && !as512 ? 'assumed' : 'estimated') : 'documented',
      as512
        ? pao + ' Final arrival is estimated from MC44/1 and the nominal ten-second stroke on ML-3.'
        : as511
          ? pao + ' The ten-second nominal stroke from SA-510 figure 8-20 is centred on the T−4:32 observation.'
          : laterLauncher && retractedBy === undefined
            ? armSchedule
            : retractedBy === undefined
              ? pao + ' Travel duration approximated from the countdown.'
              : pao + ' First full-retraction report.',
    ),
    key(-30, 0.4, 'S-IC intertank arm withdraws', terminalConfidence, terminalSource),
    key(
      intertankClear,
      0.5,
      'S-IC intertank arm clears the vehicle',
      terminalConfidence === 'documented' ? 'derived' : 'assumed',
      terminalSource,
    ),
    key(forwardRetract, 0.5, 'S-IC forward arm withdraws', terminalConfidence, terminalSource),
    key(
      laterLauncher ? -11 : forwardRetract + 8,
      0.6,
      'S-IC forward arm clear',
      'assumed',
      laterLauncher ? armSchedule : manual + ' Eight-second withdrawal.',
    ),
    key(
      firstMotion,
      0.6,
      'First vehicle motion releases five inflight arms',
      laterLauncher ? 'documented' : terminalConfidence,
      terminalSource + ' ' + manual + ' Trigger within the first inch of rise.',
    ),
    ...(intertankLatch === undefined
      ? []
      : [
          key(
            intertankLatch,
            0.6 + (0.4 * (intertankLatch - firstMotion)) / 9,
            'Intertank arm latchback confirmed',
            'documented',
            terminalSource,
          ),
        ]),
    key(firstMotion + 9, 1, 'Inflight arms clear', 'assumed', manual + ' Nominal sweeps use the published maximum retraction times.'),
  ];
  // Position I faces east, position II north. The local horizontal hinge axes below are in viewer coordinates.
  const hinges: [number, number, number][] = [
    [1, 0, 0],
    [0, 0, -1],
    [-1, 0, 0],
    [0, 0, 1],
  ];
  const holdDownRelease: Machine = {
    kind: 'release',
    confidence: 'documented',
    source: evaluation + ' Pneumatic hold-down release at first motion. Sound approximated.',
  };
  const tailHydraulics: Machine = {
    kind: 'hydraulic',
    confidence: laterLauncher ? 'documented' : 'assumed',
    source: laterLauncher
      ? `SA-${manualSerial} Flight Manual, §VIII, p. 8-8. Hydraulic carrier and mast operation. ${evaluation}`
      : 'SA-504 Flight Manual, §VIII, p. 8-8: hydraulic carrier and mast operation assumed for ML-1. AS-506 evaluation §3.6.1 records normal retraction.',
  };
  const hoodClosure: Machine = {
    kind: 'door',
    confidence: 'estimated',
    source: laterLauncher
      ? `SA-${manualSerial} Flight Manual, §VIII, figure 8-7. Hood motion and sound estimated for ML-${number}.`
      : 'AS-506 Flight Evaluation Report, §§3.6.1 and 3.6.3. The protective hoods swing shut. Closure sound approximated.',
  };
  const release = hinges.flatMap((axis, index): Move[] => {
    const arm = index + 1;
    return [
      {
        kind: 'swing',
        machine: holdDownRelease,
        node: `Holddown_Link_${arm}`,
        axis,
        angle: (82 * Math.PI) / 180,
        from: firstMotion,
        to: firstMotion + 0.5,
      },
      ...(arm === 1 && !laterLauncher
        ? []
        : [
            {
              kind: 'swing' as const,
              machine: hoodClosure,
              node: `Holddown_Hood_${arm}`,
              axis,
              angle: -Math.PI / 2,
              from: firstMotion + 1,
              to: firstMotion + 2,
            },
          ]),
    ];
  });
  const tailRetraction = (
    [
      ['1_2', -78],
      ['3_2', 78],
      ['3_4', 102],
    ] as const
  ).flatMap(([mast, degrees]): Move[] => {
    const angle = (degrees * Math.PI) / 180;
    // The flight evaluations time plate separation to mast retracted. The individual breakaway
    // instants are unavailable, so first motion anchors all three measured durations.
    const mastDuration = configuration.mastStrokes?.[mast] ?? 1.1;
    const mastRetracted = firstMotion + mastDuration;
    const radialX = Math.cos(angle);
    const radialZ = -Math.sin(angle);
    const axis: [number, number, number] = [radialZ, 0, -radialX];
    return [
      {
        kind: 'slide',
        machine: tailHydraulics,
        node: `Tail_Carrier_${mast}`,
        by: [radialX * FT, 0, radialZ * FT],
        from: firstMotion,
        to: firstMotion + 0.45,
      },
      {
        kind: 'swing',
        machine: tailHydraulics,
        node: `Tail_Boom_${mast}`,
        axis,
        angle: Math.PI / 2,
        from: firstMotion,
        to: mastRetracted,
      },
      {
        kind: 'swing',
        machine: hoodClosure,
        node: `Tail_Visor_${mast}`,
        axis,
        angle: -Math.PI / 2,
        from: mastRetracted,
        to: firstMotion + (configuration.mastStrokes ? mastDuration + 0.6 : 1.7),
      },
    ];
  });
  return {
    sequence,
    id: 'pad',
    name: 'Mobile launcher ' + number,
    backdrop: 'ground',
    url: `models/usa/places/cape-canaveral/lc39/pad-${configuration.pad ?? pad}.glb`,
    home: 'launcher',
    position: [0, -deck, 0],
    scale: '160 × 135 ft launcher base · 445 ft from hardstand to crane',
    slider: ['Service arms connected', 'Arms clear'],
    parts: [
      part(
        'Water_Valve_Pit',
        'Water valve pit',
        'A flush steel cover marks the water valve pit.',
        pad === 'b' ? 'At Pad B the water lines approached on the east side.' : 'At Pad A the water lines approached on the west side.',
      ),
      ...(pad === 'b'
        ? []
        : [
            part(
              'Substation',
              'Electrical substation',
              'The electrical substation stood in the open west of Pad A.',
              'On Pad B the corresponding installation was inside the slope. The equipment envelope is estimated.',
            ),
          ]),
      part(
        'Storage_Spheres',
        'Propellant storage spheres',
        'The oxygen and hydrogen storage tanks stood near the pad perimeter.',
        'Their nominal capacities were 900,000 and 850,000 US gallons. The jackets and supports are reconstructed.',
      ),
      part(
        'Hardstand',
        'Launch hardstand',
        'The crawler carried the assembled Saturn up to this raised pad.',
        'Two concrete working surfaces flank the open flame trench. Their outlines are reconstructed.',
      ),
      part(
        'Flame_Deflector',
        'Flame deflector',
        'The deflector divides the exhaust beneath the launcher.',
        'Its refractory surface directs exhaust along the trench in both directions. The curved profile is approximated.',
      ),
      ...(as510 || as511 || as512
        ? [
            part(
              'ECS_Room',
              'Environmental control room',
              'Air-handling units in the west side of the pad supplied conditioned air or nitrogen to the vehicle.',
              as512
                ? 'ECS chiller No. 1 stopped at T−48 hours. The team brought redundant chillers online and added refrigerant. The air-to-nitrogen changeover met the specified flows and pressures.'
                : as511
                  ? 'The team switched from air to gaseous nitrogen 23 minutes before the count resumed at T−9 hours. Reducing the flow during changeover softened the pressure surge observed in the countdown demonstration. The room and exterior plenum follow the July 1971 reconstruction at this pad.'
                  : 'The team changed over to gaseous nitrogen at 23:10 EDT the night before launch. The purge ended at 09:44 EDT, ten minutes after liftoff. Postlaunch inspection found scorched ducts and loose anchors at the air plenum on the exterior wall. Its shape and placement on this wall are estimated.',
            ),
          ]
        : []),
      ...(as511 || as512
        ? [
            part(
              'LH2_Purge_Console',
              'Level 200 purge console',
              'The tower’s 200-foot level carried a purge console for the liquid-hydrogen ground system.',
              as512
                ? 'The model carries forward the level 200 purge console documented on the same mobile launcher eight months earlier. Its case and fittings are reconstructed.'
                : 'Reach it from the tower elevator at level 200. Inspection after launch found a broken electrical terminal strip on the console. Its position on this level, instrument face and connections are reconstructed.',
            ),
          ]
        : []),
      ...(as512
        ? [
            part(
              'Xenon_Banks',
              'Xenon searchlights',
              'Ground crews lit SA-512 with 72 twenty-kilowatt xenon lamps and two sixty-kilowatt searchlight banks.',
              'Launch Control reported about 225 foot-candles on the vehicle. The lamps illuminate the stack after dark. Their positions, racks, optics and beam angles are estimated from prelaunch photographs.',
            ),
          ]
        : []),
      part(
        'Pad_Pedestals',
        'Launcher supports',
        'Six steel pedestals carry the mobile launcher after the crawler leaves.',
        'The launcher base stands 22 feet above the hardstand. Four additional columns stiffen the base for launch.',
      ),
      part(
        'Launcher_Base',
        'Launcher base',
        'The entire rocket and tower rode on this two-storey platform.',
        'Five F-1 engines fired through the 45-foot-square opening. The base was 25 feet deep.',
      ),
      {
        ...part('Tail_Service_Masts', 'Tail service masts', 'Three masts connected to the base of the first stage.', configuration.tail),
        ...(holdDowns ? { clocked: tailRetraction } : {}),
      },
      {
        ...part('Holddown_Arms', 'Hold-down arms', 'Four arms carry the Saturn over the exhaust opening.', configuration.hold),
        ...(holdDowns ? { clocked: release } : {}),
      },
      {
        ...part(
          'Umbilical_Tower',
          'Umbilical tower',
          'Two elevators served the work platforms beside the Saturn.',
          'The tower stood about 80 feet from the rocket, measured between their axes.',
        ),
        actions: [
          {
            id: 'crew-elevator',
            label: 'Call the crew elevator',
            do: {
              kind: 'lift',
              node: 'Tower_Lift',
              machine: { kind: 'lift', confidence: 'estimated', source: manual + ' The tower elevator sound is approximated.' },
              speed: (600 * FT) / 60,
              stops: [0, 30, 60, ...Array.from({ length: 14 }, (_, i) => 80 + 20 * i)].map((level) => ({
                name: level ? 'Level ' + level : 'Deck',
                by: [0, level ? (level + 0.85) * FT : 0, 0],
              })),
            },
          },
        ],
      },
      part(
        'Hammerhead_Crane',
        'Hammerhead crane',
        holdDowns
          ? 'The crane was parked across the tower before the countdown reached crew ingress.'
          : 'The crane reached out across the top of the Saturn.',
        as507
          ? 'Wind blew the Q-ball cover cable against the primary damper arm. The pad team loosened the cable sheath at this crane twice during the countdown so the damper could move.'
          : 'The hook could reach 85 feet from the tower axis.',
      ),
      ...arms.map(([arm, from, to], i): Part => {
        const node = `Service_Arm_${i + 1}`;
        return {
          ...part(
            node,
            arm + ' arm',
            i === 8
              ? 'The crew crossed this arm to the white room at the command module hatch.'
              : 'This arm carried connections between the tower and the Saturn V.',
            configuration.arm?.[i + 1] ??
              'Move the slider to inspect the swing away from the vehicle. The clock follows the countdown. Final sweep angles and individual transit times are reconstructed.',
          ),
          moves:
            i === 8
              ? as512
                ? [
                    armSwing(node, from, 0.2, 12),
                    armSwing(node, 0.2, 0.26, 78),
                    armSwing(node, 0.26, 0.32, -78),
                    armSwing(node, 0.32, to, 78),
                  ]
                : [armSwing(node, from, 0.2, 12), armSwing(node, 0.2, to, 78)]
              : i === 0 && intertankLatch !== undefined
                ? [armSwing(node, from, to, 72), armSwing(node, to, 0.6 + (0.4 * (intertankLatch - firstMotion)) / 9, 18)]
                : [armSwing(node, from, to)],
        };
      }),
    ],
    views: [
      { id: 'launcher', label: 'Mobile launcher', nodes: ['Launcher_Base', 'Umbilical_Tower', 'Hammerhead_Crane'], from: [-1, 0.18, 1] },
      ...(holdDowns
        ? [
            {
              id: 'hold-down',
              label: 'No. 1 hold-down',
              nodes: ['Holddown_Link_1', 'Holddown_Hood_1'],
              span: 5.5,
              from: [-1, 0.4, 0.6] as [number, number, number],
            },
          ]
        : []),
      ...(as507 || as509
        ? [
            {
              id: 'quench',
              label: 'Arm 2 quench valve',
              nodes: ['Arm2_Quench_Valve'],
              span: 2.5,
              from: [0.22, 0.23, -1] as [number, number, number],
            },
          ]
        : []),
      ...(as508 || as509 || as510 || as511 || as512
        ? [
            {
              id: 'intertank-carrier',
              label: 'Intertank oxygen carrier',
              nodes: ['Intertank_LOX_Carrier'],
              span: 3.3,
              from: [-0.55, 0.4, 1] as [number, number, number],
            },
          ]
        : []),
      ...(as509
        ? [
            {
              id: 'rp1-cutoff',
              label: 'RP-1 mast cutoff valve',
              nodes: ['RP1_Mast_Cutoff'],
              span: 1.2,
              from: [-0.9, 0.32, -0.46] as [number, number, number],
            },
          ]
        : []),
      ...(as510 || as511 || as512
        ? [
            {
              id: 'ecs-plenum',
              label: 'Environmental control air plenum',
              nodes: ['ECS_Air_Plenum'],
              span: 6,
              from: [-0.27, 0.14, -1] as [number, number, number],
            },
          ]
        : []),
      ...(as511 || as512
        ? [
            {
              id: 'purge-console',
              label: 'Level 200 purge console',
              nodes: ['LH2_Purge_Console'],
              span: 1.5,
              from: [-0.94, 0.08, 0.34] as [number, number, number],
            },
          ]
        : []),
      ...(as512
        ? [
            {
              id: 'xenon',
              label: 'Xenon searchlight bank',
              nodes: ['Xenon_Bank_1'],
              span: 6,
              from: [0.7, 0.3, -1] as [number, number, number],
            },
            {
              id: 'vent-disconnect',
              label: 'Arm 7 hydrogen vent',
              nodes: ['Arm7_Vent_Disconnect'],
              span: 4.7,
              from: [-0.3, 0.4, -1] as [number, number, number],
            },
          ]
        : []),
      { id: 'base', label: 'Launcher deck', nodes: ['Launcher_Base', 'Holddown_Arms'] },
      { id: 'crew-access', label: 'White room', nodes: ['Service_Arm_9'] },
    ],
  };
}

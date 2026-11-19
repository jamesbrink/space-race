import type { ModelDef, Part, ViewDef } from '../../../../src/types.ts';

/** Deployed surface configuration. The folded vehicle on the lander is separate hardware in the launch stack. */
export function roverModel(mission: 15 | 16 | 17): ModelDef {
  const hadley = mission === 15;
  const taurus = mission === 17;
  const serial = mission - 14;
  const crew = { 15: ['Scott', 'Irwin'], 16: ['Young', 'Duke'], 17: ['Cernan', 'Schmitt'] }[mission];
  const folder = `models/usa/apollo/apollo-${mission}`;
  const chassis = 'Chassis and mobility';
  const crewStation = 'Crew station';
  const radio = 'Communications and cameras';
  const science = 'Geology equipment';
  const parts: Part[] = [];
  const views: ViewDef[] = [];
  function part(
    node: string,
    name: string,
    group: string,
    summary: string,
    detail: string,
    facts: Part['facts'],
    explode: Part['explode'] = [0, 0, 0],
  ) {
    parts.push({ node, name, group, summary, detail, facts, explode, order: 0 });
  }
  function view(id: string, label: string, nodes: string[], from: NonNullable<ViewDef['from']>, isolate = true) {
    views.push({ id, label, nodes, from, isolate, onSelect: nodes.length === 1 });
  }
  part(
    'RoverChassis',
    'Three-section chassis',
    chassis,
    'Two hinged end frames carry the wheels. An open centre frame carries both astronauts.',
    'The rover travelled in quadrant I of the lunar module, folded into less than its driving wheelbase. On the Moon the end frames swung down, locked in line and took the loads from the suspension.',
    [
      ['Wheelbase', '90 in · Apollo 16 press kit p. 107'],
      ['Configuration', 'Unfolded on the lunar surface'],
    ],
  );
  part(
    'RoverSuspension',
    'Independent suspension',
    chassis,
    'Each wheel hung from its own pair of wishbones and torsion bars.',
    'Follow the upper and lower links from the chassis to one upright. A damper checked the wheel’s travel. Front and rear steering links let both axles turn.',
    [['Suspension', 'Independent double wishbones · LRV Operations Handbook']],
  );
  for (const [end, prefix, fore] of [
    ['front', 'F', 1],
    ['rear', 'R', -1],
  ] as const) {
    for (const [side, suffix, direction] of [
      ['left', 'L', -1],
      ['right', 'R', 1],
    ] as const) {
      const wheel = prefix + suffix;
      part(
        `LRV_Steer_${wheel}`,
        `${end === 'front' ? 'Front' : 'Rear'} ${side} wheel and drive`,
        chassis,
        'Wire mesh forms the tire. Chevron strips across its tread grip loose soil.',
        taurus && wheel === 'RR'
          ? 'Cernan caught his hammer on the telescoping rear extension during EVA-1. Before the second traverse the crew taped four laminated maps together and secured them to the remaining fender with two clamps from the lunar module.'
          : 'A titanium chevron covers only part of the woven tread, leaving mesh to flex under load. An inner bump stop limits deformation. The motor, reducer and mechanical brake are at the hub. The fiberglass fender is fixed to the wheel assembly above the turning tire.',
        [
          ['Free tire diameter', '32.19 in · Apollo 16 press kit p. 110'],
          ['Traction motor', '¼ hp · one per wheel'],
        ],
        [0.1 * fore, 0.03, direction * 0.64],
      );
    }
  }
  part(
    'RoverBatteries',
    'Traction batteries',
    chassis,
    'Two silver-zinc batteries supplied power to the four drive motors and the rover’s instruments.',
    'On the Moon there was no charging station. Radiating surfaces and reflective dust covers helped control battery temperature between traverses.',
    [
      ['Cells', '23 per battery · mission press kit'],
      ['Nominal battery capacity', `${hadley ? 115 : 121} Ah each · mission press kit`],
    ],
  );
  part(
    'RoverNavigation',
    'Navigation equipment',
    chassis,
    'The rover kept track of the direction and distance back to the lunar module.',
    'A directional gyro provided heading. Each wheel supplied odometer pulses. The signal-processing unit combined these readings so the crew could navigate beyond sight of their landing site.',
    [['Navigation', 'Wheel odometry and gyro heading · mission press kit']],
  );
  part(
    'RoverSeats',
    'Two webbed seats and footrests',
    crewStation,
    `${crew[0]} drove from the left. ${crew[1]} sat on the right.`,
    hadley
      ? 'Nylon webbing spanned the folding seat frames. A suited astronaut could lean his life-support pack into the open back while his boots rested farther forward. The two astronauts had difficulty fastening their individual lap belts.'
      : 'The crew tightened the stiffened belts with over-center mechanisms and secured them in loops for stowage. The stowage bags under the seats gained dust covers after Apollo 15.',
    [['Seats', 'Two folding aluminum frames with nylon webbing · mission press kit']],
  );
  part(
    'RoverConsole',
    'Hand controller and instruments',
    crewStation,
    'The driver steered, accelerated and braked with one T-shaped controller between the seats.',
    'Pushing the handle forward demanded traction and leaning it to either side commanded steering. Pulling back applied the brakes. The console grouped heading, bearing, range and total distance above the electrical controls.',
    [['Navigation display', 'Heading, bearing, range and distance']],
  );
  part(
    'RoverLCRU',
    'Lunar communications relay unit',
    radio,
    'The chest across the nose relayed crew speech, telemetry and camera signals directly to Earth.',
    'The astronauts spoke to it over VHF. The relay converted those signals to S-band. Mirror radiators behind an adjustable thermal blanket helped the unit shed heat. Its own battery could also power it after the rover was parked.',
    [
      ['Enclosure', '22 × 16 × 6 in · mission press kit, LCRU'],
      ['Battery', '19 silver-zinc cells · 400 Wh'],
    ],
    [0.88, 0.05, 0],
  );
  part(
    'RoverTV',
    'Color television camera and pointing mount',
    radio,
    'Mission Control could turn the camera to follow the astronauts at a station.',
    hadley
      ? 'The RCA camera sat over a two-axis pointing mount at the front right. The television camera’s elevation clutch slipped during the mission. The following flight carried a stronger spring.'
      : 'The RCA camera sat on a two-axis pointing mount at the front right. After the elevation clutch slipped on Apollo 15, the spring was strengthened for this flight.',
    [
      ['Pan travel', '340° between stops · mission press kit'],
      ['Tilt range', '45° down to 85° up'],
    ],
    [0.48, 0.36, 0.52],
  );
  part(
    'RoverHighGain',
    'High-gain antenna and sight',
    radio,
    'At a stop, a crewman used the optical sight to point the umbrella reflector at Earth.',
    'Fine metal mesh stretched between folding ribs to make the S-band reflector. The narrow beam carried television from a parked rover. An axial feed and the separate optical sight remain visible from the side.',
    [['Diameter', '3 ft · Apollo 15 press kit p. 98, Apollo 16 press kit p. 120']],
    [0.24, 0.44, -0.58],
  );
  part(
    'RoverLowGain',
    'Low-gain helical antenna',
    radio,
    'The smaller antenna carried voice and data while the rover was moving.',
    'Its broad beam made pointing less exacting than with the high-gain dish. The antenna stood on a separate stalk beside the commander’s console.',
    [['Service', 'S-band voice and data · mission press kit']],
    [0, 0.68, -0.2],
  );
  if (!taurus)
    part(
      'RoverCameras',
      '16 mm traverse camera',
      radio,
      'A second camera beside the lunar module pilot recorded the forward view on film.',
      'The compact data-acquisition camera and its magazine used a mount on the inboard handhold. It exposed film independently of the television camera and radio link.',
      [['Medium', '16 mm film · mission rover stowage drawing']],
      [0, 0.56, 0.22],
    );
  part(
    'RoverToolCarrier',
    'Rear pallet and folding tool carrier',
    science,
    'The crew installed the tool pallet behind the seats after they unfolded the rover.',
    'A frame, braces and clips secured tools for the drive. The hand-tool carrier could come off the pallet and stand on folding legs when the astronauts worked away from the vehicle.',
    [['Location', 'Aft chassis · mission stowage drawing']],
  );
  part(
    'RoverGeology',
    'Rake, tongs, scoop and hammer',
    science,
    'The rake combed out small rock fragments and let finer soil sift back through its tines.',
    'Tongs let the crew retrieve individual rocks while standing. An extension handle accepted other tools, including the adjustable scoop. The hammer could drive a core tube into the regolith.',
    [
      ['Tongs', '32 in · mission field geology equipment list'],
      ['Rake handle', '10 in · Apollo 15 press kit p. 72'],
    ],
    [-0.68, 0.12, 0],
  );
  part(
    'RoverSoilTools',
    taurus ? 'Geology gnomon' : 'Soil probe and gnomon',
    science,
    taurus
      ? 'The folding tripod gave geologists a scale and a vertical reference in photographs of each sample.'
      : 'A recording drum on the penetrometer traced the force required to push the probe into the ground.',
    taurus
      ? 'The astronauts set the gnomon beside a rock, photographed the scene and stowed the instrument again on the rear pallet.'
      : 'The gnomon beside it served a different purpose. At a stop the crew unfolded its tripod. Its staff and markings gave geologists a scale, a vertical reference and the shadow direction in sample photographs.',
    taurus
      ? [['Stowage', 'Aft geology pallet · Apollo 17 press kit, “Lunar Field Geology Equipment Stowage on LRV,” p. 74a']]
      : [
          ['Soil penetration shaft', '30 in · mission geology equipment list'],
          ['Gnomon staff', '12 in above gimbal · Apollo 15 press kit p. 71'],
        ],
    [-0.2, 0.26, -0.43],
  );
  part(
    'RoverSamples',
    'Sample collection bags',
    science,
    'Flexible bags carried documented samples back to the lunar module.',
    hadley
      ? 'While loading LRV-1, Irwin called out bag 4 on the right side of the carrier. Individual samples could first be sealed in a smaller numbered bag. The bags and handles here show an illustrative load.'
      : taurus
        ? 'Schmitt’s photograph at the SEP site shows a collection bag on the aft gate beside the scoop and rake. The bag shape represents a typical traverse load.'
        : 'Young and Duke distributed the collection bags between rover and crew at successive stops. This display follows the aft stowage area in the EVA-1 load diagram. Bag fullness and folds are estimated.',
    [
      [
        'Load reference',
        hadley ? 'Surface transcript 121:08:52' : taurus ? 'AS17-135-20542, start of EVA-2' : 'Apollo 16 Surface Procedures, fig. 3.5-7d',
      ],
    ],
    [-0.16, 0.48, 0.36],
  );
  if (mission === 16)
    part(
      'RoverScience',
      'Portable magnetometer',
      science,
      'The three-axis readout stayed at the rover while the sensor was set down well away from the vehicle.',
      'The crew unreeled a 50-foot cable and levelled the sensor on its tripod. One astronaut then called the three readings back to Earth. The collapsed tripod, readout and reel are on the rear pallet.',
      [
        ['Cable', '50 ft · Apollo 16 press kit p. 68'],
        ['Sensor placement', 'At least 46 ft from readout'],
      ],
      [-0.08, 0.88, 0],
    );
  if (taurus) {
    part(
      'RoverGravimeter',
      'Traverse gravimeter',
      science,
      'The blue instrument behind Schmitt measured how the Moon’s gravity varied from station to station.',
      'The astronaut could start a reading on the parked rover or lift the gravimeter by its handle and set it on its feet. A self-levelling sensor inside the case measured acceleration. The astronaut read the result to Houston.',
      [
        ['Experiment', 'S-199 · Apollo 17 Preliminary Science Report, ch. 13'],
        ['Envelope', '50.8 × 27.9 × 24.8 cm · NASA RP-1317, S-199'],
      ],
      [-0.14, 0.2, 0.69],
    );
    part(
      'RoverSEP',
      'Surface electrical properties receiver',
      science,
      'Three perpendicular antenna loops behind Schmitt’s seat picked up signals from a transmitter beside the landing site.',
      'The receiver recorded the radio measurements and rover navigation data together on tape as the crew drove away. Only the receiver and recorder travelled with the rover.',
      [
        ['Experiment', 'S-204 · Apollo 17 press kit, p. 45'],
        ['Antenna', 'Three-axis loop assembly · Apollo 17 surface equipment drawing, fig. 2-28(b)'],
      ],
      [0.06, 0.78, 0.14],
    );
    part(
      'RoverSeismicCarrier',
      'Seismic experiment carrier',
      science,
      'A raised pallet behind the driver carried the surface packages for the lunar seismic profiling experiment.',
      'Schmitt photographed the dark cases and their carrier at the SEP site as Cernan prepared to start the second traverse. The model shows their exterior stowage.',
      [['Flight photograph', 'AS17-135-20542']],
      [-0.38, 0.68, -0.17],
    );
    part(
      'RoverLRVSampler',
      'Rover sampling tool',
      science,
      'Schmitt could reach the ground from his seat to collect a small sample.',
      'The sampler head held nested cup-shaped bags on a long universal handling tool. Its clip held the shaft pointing forward beside his seat during a traverse.',
      [
        ['Stowage photograph', 'AS17-136-20760'],
        ['Tool', 'Apollo Geology Tool Catalog, fig. 80'],
      ],
      [0.12, 0.2, 0.64],
    );
    view('repair', 'Map fender and lamp clamps', ['LRV_MapFenderRepair'], [-0.54, 0.62, 1]);
    view('gravimeter', 'Traverse gravimeter', ['RoverGravimeter'], [-0.8, 0.4, 0.7]);
    view('receiver', 'SEP receiver and antenna', ['RoverSEP'], [-0.84, 0.27, 0.65]);
    view('sampler', 'Rover sampling tool', ['RoverLRVSampler'], [0.56, 0.38, 1]);
    view('carrier', 'Seismic carrier', ['RoverSeismicCarrier'], [-0.65, 0.6, -1]);
  }
  view('running-gear', 'Chassis and suspension', ['RoverChassis', 'RoverSuspension'], [-0.8, 0.25, -1]);
  view('wheel', 'Wire wheel and fender', ['LRV_Steer_FL'], [0.54, 0.24, -1]);
  view('hub', 'Traction motor and brake', ['LRV_Drive_FL'], [0.62, 0.25, 1]);
  view('mesh', 'Wire tire and bump stop', ['LRV_Wheel_FL'], [0.48, 0.25, -1]);
  view('fender', 'Fender and stays', ['LRV_Fender_FL'], [0.7, 0.51, -1]);
  view('battery', 'Two batteries', ['RoverBatteries'], [0.8, 0.8, -0.6]);
  view('navigation', 'Navigation unit', ['RoverNavigation'], [1, 0.58, 0.55]);
  view('seats', 'Seats and footrests', ['RoverSeats'], [1, 0.48, -0.63]);
  view('underseat', 'Underseat stowage', ['LRV_UnderseatBags'], [0.2, 0.03, -1]);
  view('controller', 'Driver’s console', ['RoverConsole'], [-1, 0.34, -0.18]);
  view('communications', 'Forward communications rack', ['RoverTV', 'RoverLCRU', 'RoverHighGain'], [0.86, 0.33, 0.65]);
  view('radio', 'Relay and radiators', ['RoverLCRU'], [1, 0.23, 0.32]);
  view('television', 'Color television', ['RoverTV'], [0.86, 0.24, 1]);
  view('dish', 'High-gain antenna', ['RoverHighGain'], [0.44, 0.67, -1]);
  view('helix', 'Low-gain antenna', ['RoverLowGain'], [1, 0.21, -0.65]);
  if (!taurus) view('film', 'Traverse film camera', ['RoverCameras'], [1, 0.3, 0.63]);
  view(
    'rear-pallet',
    'Loaded geology pallet',
    [
      'RoverToolCarrier',
      'RoverGeology',
      'RoverSoilTools',
      'RoverSamples',
      ...(mission === 16 ? ['RoverScience'] : taurus ? ['RoverGravimeter', 'RoverSEP', 'RoverSeismicCarrier'] : []),
    ],
    [-1, 0.32, 0.62],
  );
  view('tools', 'Hand tools', ['RoverGeology'], [-1, 0.17, 0.32]);
  view('soil', taurus ? 'Geology gnomon' : 'Penetrometer and gnomon', ['RoverSoilTools'], [-1, 0.28, -0.45]);
  view('samples', 'Sample bags', ['RoverSamples'], [-1, 0.48, -0.33]);
  if (mission === 16) view('magnetometer', 'Portable magnetometer', ['RoverScience'], [-1, 0.4, 0.52]);
  const open: [number, number] = taurus
    ? [114 * 3600 + 21 * 60 + 49, 168 * 3600 + 7 * 60 + 56]
    : hadley
      ? [119 * 3600 + 39 * 60, 171 * 3600 + 37 * 60]
      : [118 * 3600 + 53 * 60, 175 * 3600 + 31 * 60];
  return {
    id: 'rover',
    name: `Lunar Roving Vehicle ${serial}`,
    galleryCraft: `LRV-${serial} lunar rover`,
    url: `${folder}/rover.glb`,
    scale: '122 in long · 90 in wheelbase · 72 in track',
    backdrop: 'studio',
    galleryFrom: [0.78, 0.35, 1],
    lunarRover: { site: taurus ? 'taurus-littrow' : hadley ? 'hadley' : 'descartes', riders: `${folder}/riders.glb` },
    boardingLabel: 'Take a rover seat',
    slider: ['Ready for a traverse', 'Equipment separated'],
    cutaway: true,
    specGroups: [],
    motorNames: [],
    parts,
    views,
    seats: [
      { node: 'LRV_DriverEye', label: `${crew[0]}’s driver seat`, from: 'RoverSeats', open },
      { node: 'LRV_PassengerEye', label: `${crew[1]}’s passenger seat`, from: 'RoverSeats', open },
    ],
  };
}

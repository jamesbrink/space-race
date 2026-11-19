/**
 * The tracks round Site 1 as data, metres east and north of the rocket's axis: where their middle lines run, the same
 * lines with the bends nearest the platform curved, and the way a wagon is drawn off along them. Pure arithmetic: the
 * land paints these (ground.ts `RAILS`) and a flight's wagons follow them (site-1.parts.ts), and the place's model lays
 * its rails along the same (site1/tracks.py, the Python twin of this file: tests/tyuratam.test.mjs holds the two
 * together, point for point).
 *
 * The lines are OpenStreetMap's, simplified to a metre: the centre track from the west, on which the erector brought
 * the rocket (way 37547653, its last 2.6 km), and the four spurs beside it (ways 172441851, 172441854, 172441876,
 * 172441879). HTA/JR-4/58 counts five spurs onto the pad in August 1957. The other lines on today's map round the site
 * are not drawn: when each was laid is not known to us.
 *
 * Near the platform they are not quite the map's. The map has its centre track 3.0 m north of the middle of its outline
 * of the pad, which is this frame's origin; the rocket's axis was on that track, so the track is brought onto the axis
 * over its last 160 m (the erector is drawn off along it), and the three beside it are brought, over their last 60 m,
 * to where the CIA's plan of March 1961 has them on the platform (PIC/JR-2/61 Figure 1: site1/deck.py, which lays the
 * rails there), each within 1.5 m of the map's place measured from its own centre track. Their west ends are moved to
 * stay on the lines they branch from.
 *
 * A map's line is corners; a track is not. Where the rails are modelled (`MODELLED`), each bend (0.5 to 1.4 degrees: at
 * 60 m west on the three spurs, at 160 m on the centre track) is an arc of `RADIUS`, tangent to the line either side of
 * it and cut into chords of `CHORD` at the most: the model's rails, the land's paint and the wagons' ways are the same
 * chords. The radius is estimated (site-1.md, "The rails over the apron"). Further west the lines are paint on the land
 * and keep the map's corners; where the south spur meets the centre track (286 m west) the corner is a turnout's.
 */
export type Line = [number, number][];

export const CENTRE_TRACK: Line = [
  [-1796.8, -193.4],
  [-1766.0, -146.0],
  [-1749.7, -126.8],
  [-1719.8, -96.6],
  [-1692.5, -72.7],
  [-1667.5, -55.5],
  [-1636.4, -37.9],
  [-1585.5, -15.2],
  [-1554.4, -5.3],
  [-1522.2, 3.5],
  [-1492.0, 7.9],
  [-1464.7, 9.8],
  [-1400.7, 10.6],
  [-160.0, 0.0],
  [-25.8, 0.0],
];
/** North, the short one, south, and the northern one the propellant shed stands over. */
export const SPURS: Line[] = [
  [
    [15.0, 13.564],
    [-60.0, 13.564],
    [-212.6, 15.2],
  ],
  [
    [-204.5, -5.9],
    [-60.0, -8.321],
    [-26.8, -8.321],
  ],
  [
    [10.9, -12.375],
    [-60.0, -12.375],
    [-155.4, -10.1],
    [-286.2, 1.1],
  ],
  [
    [-330.6, 1.5],
    [-121.8, 25.7],
    [-39.8, 28.9],
  ],
];
/**
 * The line the rocket came by: out of the assembly building's north gate (around.ts; site-1.md, "On the horizon") and
 * round to join the centre track 1.32 km west of the pad. Today's map has it as an abandoned line (way 676662205) from
 * the building's north-north-east end, which was the hall's own in 1961 (the extension of the 1970s is at the other
 * end: site2/mik.py). That it was the way out in 1961 is derived: it is the one line from the gate to the pad.
 */
export const FROM_ASSEMBLY: Line = [
  [-1877.0, -520.3],
  [-1754.5, -284.4],
  [-1673.8, -150.8],
  [-1620.6, -95.7],
  [-1566.5, -56.2],
  [-1495.9, -21.4],
  [-1462.0, -9.8],
  [-1423.5, -1.9],
  [-1384.2, 2.5],
  [-1319.1, 9.5],
];

/** A bend's radius, metres (estimated). */
export const RADIUS = 200;
/** An arc is cut into chords no longer than this, metres: each within 0.6 mm of the arc. */
export const CHORD = 1;
/** How far west each track's rails are modelled, metres east of the axis (site1/deck.py): a bend east of this is curved. */
export const MODELLED = { centre: -170, spur: -110 };

/**
 * A track's line with each of its bends east of `west` made an arc of RADIUS: the corner is left out, and in its place
 * are the two points where the arc leaves the line's legs and the points between them, CHORD apart at the most. As
 * site1/tracks.py `curved`, line for line.
 */
export function curved(line: Line, west: number): Line {
  const out: Line = [line[0]!];
  for (let i = 1; i + 1 < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    const c = line[i + 1]!;
    const ul = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const vl = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const ux = (b[0] - a[0]) / ul;
    const uy = (b[1] - a[1]) / ul;
    const vx = (c[0] - b[0]) / vl;
    const vy = (c[1] - b[1]) / vl;
    const turn = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); // anticlockwise from above is positive
    if (b[0] <= west || Math.abs(turn) < 1e-9) {
      out.push(b);
      continue;
    }
    const back = RADIUS * Math.tan(Math.abs(turn) / 2); // from the corner back along each leg to where the arc begins
    if (back > 0.5 * Math.min(ul, vl)) throw new Error(`the bend at ${b} has no room for an arc of ${RADIUS} m`);
    const side = turn > 0 ? 1 : -1;
    const px = b[0] - ux * back;
    const py = b[1] - uy * back;
    const ox = px - side * RADIUS * uy; // the arc's centre: square to the first leg, on the bend's inside
    const oy = py + side * RADIUS * ux;
    const n = Math.max(1, Math.ceil((RADIUS * Math.abs(turn)) / CHORD));
    for (let k = 0; k <= n; k++) {
      const cos = Math.cos((turn * k) / n);
      const sin = Math.sin((turn * k) / n);
      out.push([ox + (px - ox) * cos - (py - oy) * sin, oy + (px - ox) * sin + (py - oy) * cos]);
    }
  }
  out.push(line[line.length - 1]!);
  return out;
}

export const CENTRE_CURVED: Line = curved(CENTRE_TRACK, MODELLED.centre);
export const SPURS_CURVED: Line[] = SPURS.map((line) => curved(line, MODELLED.spur));

/** Every track the land paints: the centre track, the four spurs, the line from the assembly building. */
export const RAILS: Line[] = [CENTRE_CURVED, ...SPURS_CURVED, FROM_ASSEMBLY];

/** A line's points from east to west (every line here runs one way in x). */
const westward = (line: Line): Line => (line[0]![0] > line[line.length - 1]![0] ? line : [...line].reverse());

/** How far north a line is at `x` metres east of the axis. */
export function northAt(line: Line, x: number): number {
  const pts = westward(line);
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    if (b[0] <= x && x <= a[0]) return a[1] + ((b[1] - a[1]) * (a[0] - x)) / (a[0] - b[0]);
  }
  throw new Error(`no track at ${x} m east`);
}

/**
 * The way west along `lines`, one after another (each taken up where the last one ends on it), from `from` metres east
 * of the axis on the first to `to` on the last: every point of the lines between the two and the end itself, as metres
 * east and south of where it starts (a drive's `path`: types.ts Drive).
 */
export function wayWest(lines: Line[], from: number, to: number): Line {
  const x0 = from;
  const y0 = northAt(lines[0]!, from);
  const out: Line = [];
  let east = from;
  lines.forEach((line, n) => {
    const pts = westward(line);
    const end = n + 1 < lines.length ? pts[pts.length - 1]![0] : to;
    for (const [x, y] of pts) if (x < east - 1e-6 && x > end + 1e-6) out.push([x - x0, y0 - y]);
    out.push([end - x0, y0 - northAt(line, end)]);
    east = end;
  });
  return out;
}

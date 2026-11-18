import './icons.css';
import { esc } from '../util/dom.ts';

/**
 * The page's small pictures, drawn here and nowhere else: inline SVG, no file, no font, nothing fetched.
 *
 * - **Icons** say where a control goes or what it does (a flight's three places, the Lineup, walking, the camera). One
 *   stroke weight, `currentColor`, so an icon is lit, dimmed and pointed at with the words beside it; always beside its
 *   words, never instead of them, and `aria-hidden` (the words say it). A switch has its lamp and no icon (icons.css).
 * - **Flags** are the flags the nations flew under in the years the flights were flown, keyed by the nation's word in a
 *   flight's id (`usa`, `ussr`): the next nation is an entry in `FLAGS`. Shown beside the nation's name, so `aria-hidden`.
 * - **Emblems** are keyed by programme id (`usa/mercury`): the next programme is an entry in `EMBLEMS`. An American one is a
 *   simplified drawing of the programme's own insignia (docs/sources.md, "The page's flags and emblems"); a Soviet
 *   programme had no patch, and its emblem is a mark of this site's own, drawn from the spacecraft. Each says which it is
 *   (`says`) to whoever points at it or reads it out, and in full where a programme is told (`emblemFigure`): an invented
 *   mark is never shown as a real one.
 */

/** An icon's strokes on a 16 by 16 square. */
const ICONS = {
  /** The gallery: the vehicle alone on its plinth. */
  gallery: 'M2 14.5h12M4 14.5v-3h8v3M6.3 11.5l1-6h1.4l1 6M8 5.5V3',
  /** The launch site: the service tower and the vehicle on its pad. */
  site: 'M1.5 14.5h13M3.5 14.5v-12h3v12M3.5 5.5l3 2.5-3 2.5 3 2.5M6.5 6h2.5M11.5 14.5V7l1-3 1 3v7.5M10.5 14.5l1-2.5M14.5 14.5l-1-2.5',
  /** Fly: a little rocket, climbing. */
  fly: 'M13.6 2.4c-2.6-.2-5 .9-6.9 3.1L4.6 8.2l3.2 3.2 2.7-2.1c2.2-1.9 3.3-4.3 3.1-6.9zM6.2 6.4 3.8 6l-1.7 1.7 2.5 1M9.6 9.8l.4 2.4-1.7 1.7-1-2.5M4.9 11.1 2.5 13.5',
  /** The Lineup: a row of heights on one floor. */
  lineup: 'M1.5 14.5h13M3.5 14.5V9M6.5 14.5V2.5M9.5 14.5V6M12.5 14.5V4.5',
  /** Walking: a figure in mid-stride. */
  walk: 'M8.3 2.6a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0-2.6 0M8.9 5.2 7.8 9.4l-2.1 2.4-1.2 2.7M7.8 9.4l2 2.1.5 3M5.4 8.4l1-2.4 2.5-.8 1.5 2.5 2 .7',
  /** The camera. */
  camera: 'M1.7 4.2h9.6v7.6H1.7zM11.3 7l3.4-2v6l-3.4-2',
} as const;
export type IconName = keyof typeof ICONS;

/** An icon as markup: decorative (its words are beside it), in the colour of the text it sits in. */
export const icon = (name: IconName): string =>
  `<svg class="icon icon-${name}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${ICONS[name]}"/></svg>`;

/** A filled star's path: five points at `r` round (x, y), the first straight up, drawn as a pentagram filled whole (nonzero). */
function star(x: number, y: number, r: number): string {
  const at = (k: number): string => {
    const a = (-90 + 144 * k) * (Math.PI / 180);
    return `${(x + r * Math.cos(a)).toFixed(2)} ${(y + r * Math.sin(a)).toFixed(2)}`;
  };
  return `M${at(0)}L${at(1)} ${at(2)} ${at(3)} ${at(4)}z`;
}

interface Flag {
  /** What it is, for anyone who asks (the docs, a test): which flag, and from when. */
  says: string;
  /** Its width over its height. */
  ratio: number;
  /** What is drawn, on a viewBox `ratio * 100` wide and 100 high. */
  body: () => string;
}

/**
 * The flags, by the nation's word in a flight's id. Each is the flag the nation flew under from 1961 to 1969, to its
 * statute's proportions, simplified only where its figure is below a pixel at the size it is drawn.
 */
export const FLAGS: Record<string, Flag> = {
  usa: {
    says: 'The flag of the United States, its 50 stars as flown from 4 July 1960',
    // (Executive Order 10834, 1959: hoist 1, fly 1.9, the union 7 stripes deep and 0.76 long, its stars 0.0616 across
    // on a grid of 0.054 by 0.063, rows of six and five)
    ratio: 1.9,
    body: () => {
      const stripe = 100 / 13;
      const red = Array.from({ length: 7 }, (_, i) => `M0 ${(2 * i * stripe).toFixed(2)}h190v${stripe.toFixed(2)}H0z`).join('');
      const stars: string[] = [];
      for (let row = 1; row <= 9; row++)
        for (let col = 1; col <= 11; col++) if ((row + col) % 2 === 0) stars.push(star(col * 6.333, row * 5.385, 3.08));
      return `<path fill="#fff" d="M0 0h190v100H0z"/><path fill="#b22234" d="${red}"/><path fill="#3c3b6e" d="M0 0h76v${(7 * stripe).toFixed(2)}H0z"/><path fill="#fff" d="${stars.join('')}"/>`;
    },
  },
  ussr: {
    says: 'The flag of the Soviet Union, as its statute of 1955 drew it',
    // (the 1955 statute: 1 by 2; the hammer and sickle in a square a quarter of the hoist, its middle a third of the hoist
    // from it; over it the star, inscribed in a circle an eighth of the hoist across whose centre is an eighth down, edged in gold)
    ratio: 2,
    body: () => {
      const x = 100 / 3;
      const side = 25;
      const top = 12.5 + 6.25;
      return `<path fill="#cc0000" d="M0 0h200v100H0z"/>
        <path fill="#cc0000" stroke="#ffd700" stroke-width="1.6" stroke-linejoin="miter" d="${star(x, 12.5, 6.25)}"/>
        <g transform="translate(${(x - side / 2).toFixed(2)} ${top})" fill="none" stroke="#ffd700" stroke-linecap="butt">
          <path stroke-width="3.4" d="M2.6 4.6 21.5 23.5"/><path stroke-width="4" d="M-0.4 7.6 5.6 1.6"/>
          <path stroke-width="3" d="M1.2 23.8 6.4 18.6A10.4 10.4 0 1 0 12.5 0.6"/>
        </g>`;
    },
  },
};

const flagCache = new Map<string, string>();

/** A nation's flag beside its name (`usa`, or the name itself: `USA`), or '' for a nation there is no flag for yet. */
export function flag(nation: string): string {
  const key = nation.toLowerCase();
  const f = FLAGS[key];
  if (!f) return '';
  let drawn = flagCache.get(key);
  if (!drawn) {
    drawn = `<svg class="flag" viewBox="0 0 ${f.ratio * 100} 100" style="--ratio: ${f.ratio}" preserveAspectRatio="none" aria-hidden="true" focusable="false">${f.body()}</svg>`;
    flagCache.set(key, drawn);
  }
  return drawn;
}

interface Emblem {
  /** 'insignia': the programme's own, drawn simply; 'ours': the programme had none, and this is a mark of this site's. */
  kind: 'insignia' | 'ours';
  /** What it is, said in full: read out, shown when pointed at, and written under it where the programme is told. */
  says: string;
  /** What is drawn, on a 24 by 24 square. */
  body: string;
}

/** A Soviet mark's line: the text's colour and one weight, so that it reads as a drawing and not as a patch. */
const OURS = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';

/** The emblems, by programme id. */
export const EMBLEMS: Record<string, Emblem> = {
  'usa/mercury': {
    kind: 'insignia',
    says: 'Project Mercury’s insignia, drawn simply: the numeral 7 over the astronomical sign of Mercury',
    body: `<g fill="none" stroke="#dcd7ca" stroke-width="1.7" stroke-linecap="butt">
      <path d="M6.6 2.2c3.6 1.8 7.2 1.8 10.8 0"/><ellipse cx="12" cy="9.3" rx="5.1" ry="4.7"/>
      <path stroke-width="1.5" d="M9.6 6.9h4.8c-1.8 1.8-2.4 4.1-2.4 7.1"/><path stroke-width="1.9" d="M12 14v8.6"/><path d="M8.2 18.5h7.6"/></g>`,
  },
  'usa/gemini': {
    kind: 'insignia',
    says: 'The Gemini programme’s insignia, drawn simply: the Roman numeral II and its two stars, without its lettering',
    body: `<circle cx="12" cy="12" r="11.4" fill="#0d2741"/>
      <path fill="#f4b223" d="M5.4 4.8h13.2v1.9H5.4zM5.4 17.3h13.2v1.9H5.4zM7.8 6.7h2.9c-.5 3.5-.5 7.1 0 10.6H7.8c.5-3.5.5-7.1 0-10.6zM13.3 6.7h2.9c-.5 3.5-.5 7.1 0 10.6h-2.9c.5-3.5.5-7.1 0-10.6z"/>
      <path fill="#fff" d="${star(9.1, 10.9, 2.7)}${star(15.1, 13.9, 2.3)}"/>`,
  },
  'usa/apollo': {
    kind: 'insignia',
    says: 'The Apollo programme’s insignia, drawn simply: the letter A with Orion’s three stars for its bar, the Moon and the Earth, without its lettering',
    body: `<circle cx="12" cy="12" r="11" fill="#0b1630" stroke="#a9a9a9" stroke-width="1.6"/>
      <ellipse cx="12" cy="11.6" rx="8.6" ry="2.6" transform="rotate(16 12 11.6)" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="0.5"/>
      <circle cx="6.5" cy="8.4" r="2.5" fill="#e3a93f"/><circle cx="17.5" cy="13.2" r="2.8" fill="#3d78b5"/>
      <path fill="#5e9a4c" d="M16.4 11.6c.9-.5 2-.2 2.4.6.3.7-.4 1.1-.2 1.8.2.8-.6 1.3-1.3.9-.6-.4-.3-1.1-.9-1.5-.6-.5-.6-1.4 0-1.8z"/>
      <path fill="#fff" d="M11.5 4h1.1l4.6 14.8h-2.5L11.3 6.6zM11.5 4h1.1L8.6 18.8H7.4z"/><path stroke="#fff" stroke-width="0.8" d="M6.6 18.8h2.9M13.8 18.8h4.2"/>
      <circle cx="10.1" cy="14.2" r="0.75" fill="#dceaff"/><circle cx="12" cy="14" r="0.75" fill="#dceaff"/><circle cx="13.9" cy="13.8" r="0.75" fill="#dceaff"/>`,
  },
  'ussr/vostok': {
    kind: 'ours',
    says: 'Vostok: a mark of this site’s own, drawn from the spacecraft (its sphere on its instrument module); not a patch the programme had',
    body: `<g ${OURS}><circle cx="12" cy="7.6" r="5"/><path d="M8.7 12.2 6.2 16.2l2.5 4.2h6.6l2.5-4.2-2.5-4M6.2 16.2h11.6M10.8 20.4l-.4 2h3.2l-.4-2M12 2.6V1.2"/></g>`,
  },
  'ussr/voskhod': {
    kind: 'ours',
    says: 'Voskhod: a mark of this site’s own, drawn from the spacecraft (the sphere with its reserve retro-rocket on top); not a patch the programme had',
    body: `<g ${OURS}><circle cx="12" cy="8.4" r="5"/><path d="M10.2 3.6V1.2h3.6v2.4M8.7 13 6.2 16.8l2.5 3.8h6.6l2.5-3.8L15.3 13M6.2 16.8h11.6M10.8 20.6l-.4 1.9h3.2l-.4-1.9"/></g>`,
  },
  'ussr/soyuz': {
    kind: 'ours',
    says: 'Soyuz: a mark of this site’s own, drawn from the spacecraft (its orbital module, descent module, and service module with its two wings); not a patch the programme had',
    body: `<g ${OURS}><circle cx="12" cy="4.6" r="3.2"/><path d="M9.6 8.4h4.8l1.5 5.2H8.1zM8.6 14.2h6.8v6.6H8.6zM8.6 16H2v3h6.6M15.4 16H22v3h-6.6M5.3 16v3M18.7 16v3"/></g>`,
  },
};

/** What a programme's emblem is, said in full (null: none yet). */
export const emblemSays = (programme: string): string | null => EMBLEMS[programme]?.says ?? null;

/**
 * A programme's emblem beside its name, or '' for one with none yet. It is a picture with words of its own (which it is,
 * and whether it is the programme's or this site's), read out and shown when pointed at; the name beside it is the name.
 */
export function emblem(programme: string): string {
  const e = EMBLEMS[programme];
  if (!e) return '';
  return `<span class="emblem ${e.kind}" title="${esc(e.says)}"><svg viewBox="0 0 24 24" role="img" aria-label="${esc(e.says)}" focusable="false">${e.body}</svg></span>`;
}

/** A programme's emblem large, with what it is written under it (so the picture itself is not read out twice): where the programme is told (ui/history.ts). */
export function emblemFigure(programme: string): string {
  const e = EMBLEMS[programme];
  if (!e) return '';
  return `<figure class="emblem-figure ${e.kind}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${e.body}</svg><figcaption>${esc(e.says)}</figcaption></figure>`;
}

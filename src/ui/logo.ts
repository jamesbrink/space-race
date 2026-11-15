/**
 * The mark: SPACE RACE in drawn letters, with each A a rocket on its pad. A trail leaves each
 * one, one in each side's colour, and the two cross on the way to the same place. It is
 * built here so the title screen, and anything later, draws the same thing at any size.
 */

/** Each letter as strokes on a 60 by 80 cell: one weight throughout, corners cut like stencilled hull lettering. */
const LETTERS: Record<string, string> = {
  S: 'M54 8H18L6 20V30L16 40H44L54 50V60L42 72H6',
  P: 'M6 72V8H42L54 20V32L42 44H6',
  A: 'M6 72L30 8L54 72',
  C: 'M54 8H18L6 20V60L18 72H54',
  E: 'M54 8H6V72H54M6 40H40',
  R: 'M6 72V8H42L54 20V32L42 44H6M32 44L54 72',
};
const ADVANCE = 74;
const WORD_GAP = 44;
export const USA = '#ffc46b';
export const USSR = '#e8563c';

/** The logo as an SVG element's markup. `title` is read out in place of the drawing. */
export function logo(title = 'Space Race'): string {
  let x = 0;
  const letters: string[] = [];
  const pads: number[] = []; // where each A's apex is
  for (const ch of 'SPACE RACE') {
    if (ch === ' ') {
      x += WORD_GAP;
      continue;
    }
    if (ch === 'A') pads.push(x + 30);
    letters.push(`<path transform="translate(${x} 0)" d="${LETTERS[ch]}"/>`);
    x += ADVANCE;
  }
  const width = x - (ADVANCE - 60);
  const [a, b] = pads as [number, number];
  // where both are going: a small world up and to the right, lit from the left
  const goal = { x: width - 6, y: -118, r: 17 };
  return `<svg class="logo" viewBox="-12 -150 ${width + 30} 236" role="img" aria-label="${title}" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke-linecap="butt" stroke-linejoin="miter">
      <g class="logo-goal">
        <circle cx="${goal.x}" cy="${goal.y}" r="${goal.r}" stroke="currentColor" stroke-width="2.5" opacity="0.9"/>
        <path d="M${goal.x} ${goal.y - goal.r}a${goal.r} ${goal.r} 0 0 0 0 ${goal.r * 2}a${goal.r * 0.45} ${goal.r} 0 0 1 0 ${-goal.r * 2}" fill="currentColor" stroke="none" opacity="0.9"/>
      </g>
      <path class="logo-trail" pathLength="1" stroke="${USA}" stroke-width="4" d="M${a} -4C${a} -86 ${a + 170} -128 ${goal.x - goal.r - 10} ${goal.y + 2}"/>
      <path class="logo-trail late" pathLength="1" stroke="${USSR}" stroke-width="4" d="M${b} -4C${b} -62 ${b + 40} -92 ${goal.x - goal.r - 9} ${goal.y + 12}"/>
      <g class="logo-word" stroke="currentColor" stroke-width="13">${letters.join('')}</g>
      <path stroke="${USA}" stroke-width="5" d="M${a - 9} 62H${a + 9}"/>
      <path stroke="${USSR}" stroke-width="5" d="M${b - 9} 62H${b + 9}"/>
    </g>
  </svg>`;
}

/**
 * A figure of the deck's middle panel made to fit its cell (deck.ts `Deck.figure`): at most `ROOM` digits (a minus sign
 * counted as one, the point not), as many decimals as the deck asks for while they fit, fewer as the number grows, and past
 * the last whole number that fits, the next larger unit, as KSP's (km, Mm, Gm; m/s, km/s; min, h, d). Far from the Earth
 * a height of 110,169.7 km is shown as 110.17 Mm, an apogee of 681,478 km as 681.48 Mm; nothing grows into the next figure.
 */

/** The most digits a figure's cell holds at the deck's every width (1280, 820, 390): the widest the deck showed before, 6378.1. */
export const ROOM = 5;

/** The larger units of a figure's unit, each with how many of the unit it is. */
const LARGER: Readonly<Record<string, readonly (readonly [number, string])[]>> = {
  km: [
    [1e3, 'Mm'],
    [1e6, 'Gm'],
  ],
  'm/s': [[1e3, 'km/s']],
  min: [
    [60, 'h'],
    [1440, 'd'],
  ],
};

/** The width of a figure's text in digits: each digit and a minus sign; the point is narrow. */
const width = (text: string) => text.replace(/[^0-9-]/g, '').length;

/** `value`, in `unit`, with up to `decimals` decimals: the text and the unit it is in, at most `ROOM` digits wide where any unit allows it. */
export function fit(value: number, unit: string, decimals: number): { text: string; unit: string } {
  for (let d = decimals; d >= 0; d--) {
    const text = value.toFixed(d);
    if (width(text) <= ROOM) return { text, unit };
  }
  for (const [by, larger] of LARGER[unit] ?? []) {
    // (in a larger unit, as many decimals as fit: 681.48 Mm, not 681 Mm)
    for (let d = ROOM - 1; d >= 0; d--) {
      const text = (value / by).toFixed(d);
      if (width(text) <= ROOM) return { text, unit: larger };
    }
  }
  // (past every unit it has: whole, in the largest; the cell clips it rather than let it touch the next)
  const [by, larger] = LARGER[unit]?.at(-1) ?? [1, unit];
  return { text: (value / by).toFixed(0), unit: larger };
}

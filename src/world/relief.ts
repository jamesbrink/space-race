/**
 * How the height of the Earth's solid surface is kept in one byte, for the relief maps
 * tools/globe-surface.mjs bakes (public/globe/relief.*.png and each region's .relief.png) and the
 * shaders that read them. Pure numbers: the tool, the tests and the shader all use what is here,
 * so the three cannot drift apart.
 *
 * Heights are metres above mean sea level as ETOPO 2022 gives them (the ice's surface, the sea's
 * bed). The sea gets a logarithm, so that shallow water has fine steps (0.4 m at 5 m, 3 m at
 * 50 m, 200 m at 4 km): a bank's colour turns on its last few metres. The land gets a square
 * root: a coastal plain in steps of a metre or two, the high mountains in steps of 70 m.
 *
 *   v = 128                                             sea level
 *   v = 128 - 127 ln(1 + d / 2) / ln(1 + 11000 / 2)     the sea's bed d metres down: 1 at 11,000 m
 *   v = 128 + 127 sqrt(h / 8850)                        land h metres up: 255 at 8,850 m
 *
 * rounded to the nearest whole number and held to 1..255. Zero is never written: it means "no data".
 */
export const RELIEF = {
  /** The byte that is sea level. */
  sea: 128,
  /** Bytes each way from sea level: the deepest sea is `sea - span`, the highest land `sea + span`. */
  span: 127,
  /** The depth the sea's logarithm is scaled by, metres: below about this the steps are a fifth of a metre, above it they grow with depth. */
  shallow: 2,
  /** The depth that reads 1, metres: a little over the Challenger Deep. */
  deepest: 11000,
  /** The height that reads 255, metres: Everest. */
  highest: 8850,
  /** The byte that means nothing was measured here. Never written by encodeRelief. */
  none: 0,
} as const;

const LOG_DEEPEST = Math.log(1 + RELIEF.deepest / RELIEF.shallow);

/** A height in metres (negative under the sea) as the byte the maps keep: a whole number, 1 to 255. */
export function encodeRelief(metres: number): number {
  const v =
    metres < 0
      ? RELIEF.sea - (RELIEF.span * Math.log(1 - metres / RELIEF.shallow)) / LOG_DEEPEST
      : RELIEF.sea + RELIEF.span * Math.sqrt(metres / RELIEF.highest);
  return Math.max(1, Math.min(255, Math.round(v)));
}

/** The height in metres a byte stands for. Takes fractions, as a filtered texture gives them. */
export function decodeRelief(v: number): number {
  if (v >= RELIEF.sea) {
    const t = (v - RELIEF.sea) / RELIEF.span;
    return RELIEF.highest * t * t;
  }
  return -RELIEF.shallow * (Math.exp(((RELIEF.sea - v) / RELIEF.span) * LOG_DEEPEST) - 1);
}

/** decodeRelief for a shader: `reliefMetres(texel.r * 255.0)`. */
export const RELIEF_GLSL = /* glsl */ `
float reliefMetres(float v) {
  float up = max(v - ${RELIEF.sea.toFixed(1)}, 0.0) / ${RELIEF.span.toFixed(1)};
  float down = max(${RELIEF.sea.toFixed(1)} - v, 0.0) / ${RELIEF.span.toFixed(1)};
  return ${RELIEF.highest.toFixed(1)} * up * up - ${RELIEF.shallow.toFixed(1)} * (exp(down * ${LOG_DEEPEST.toPrecision(9)}) - 1.0);
}
`;

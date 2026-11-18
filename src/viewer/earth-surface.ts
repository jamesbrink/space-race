import * as THREE from 'three';

/**
 * The deep sea seen from above the air: what clear ocean water sends back up from within, about 0.3, 1.6 and 4.5
 * per cent of red, green and blue (the reflectance of the clearest waters, Morel and Prieur's Case 1 at low
 * chlorophyll: rounded, estimated). Near black: the blue of the sea from orbit is mostly the air over it and the
 * sky in it, which are drawn as themselves (atmosphere.ts, the reflections). From the ground the sea is `SEA`,
 * the Cape's own, and goes over to this as the eye rises.
 */
export const DEEP = new THREE.Color().setRGB(0.003, 0.016, 0.045);
/**
 * The sea's waves, for the Sun's glint seen from above: their slopes have a mean square of 0.003 + 0.00512 U for a
 * wind of U m/s at mast height (Cox and Munk 1954), which is the station's wind at the ground (day.ts `wind.speed`):
 * 0.029 for Freedom 7's 5.1 m/s (derived). The glint itself is `globeGlint`.
 */
export const seaSlopes = (wind: number): number => 0.003 + 0.00512 * wind;
export const LAND = new THREE.Color(0x4f7a42); // (the Cape's canopy seen whole, so the site's ground and the land beyond it are one green: missions/usa/places/cape-canaveral/ground.ts PALETTE)
export const ICE = new THREE.Color(0xe4eaee);

export const WATER_GLSL = `
  vec3 globeWater(float bank, float depth, vec3 deep) {
    vec3 bed = mix(vec3(0.05, 0.06, 0.045), vec3(0.40, 0.42, 0.37), bank);
    return deep + (bed - deep) * exp(-vec3(0.70, 0.14, 0.07) * mix(2.2, 1.0, bank) * max(depth, 2.0));
  }
`;

export const GLINT_GLSL = /* glsl */ `
  // The Sun's glint on the sea, seen from above the air: the light a sea of waves sends from the Sun to the
  // eye, for each unit of the Sun's light falling squarely. Cox and Munk's law (1954): the waves' slopes are
  // spread as a bell (a Gaussian) whose mean square is the day's (seaSlopes), and a facet tilted to mirror the Sun into the
  // eye sends back Fresnel's share (2 % squarely, all of it at a graze). So the glint is a bounded patch
  // round the mirror point, 40 degrees from straight down with the Sun 50 up, and a sixth of the way across
  // it is all but gone. (Three's own lobe for a rough surface, GGX, has a far longer tail: with the same
  // spread it put ten times the light 50 degrees from the mirror point, a pale glare over the whole sea.)
  // l, n, v: toward the light, the sea's normal, toward the eye. Facets hiding one another: Cook and Torrance's term.
  float globeGlint(vec3 l, vec3 n, vec3 v, vec2 slopes) {
    vec3 h = normalize(l + v);
    float nh = dot(n, h), nl = dot(n, l), nv = max(dot(n, v), 1e-3), vh = clamp(dot(v, h), 1e-3, 1.0);
    if (nl <= 0.0 || nh <= 1e-3) return 0.0;
    float nh2 = nh * nh;
    float spread = exp(-(1.0 - nh2) / (nh2 * slopes.x)) / (slopes.y * nh2 * nh2);
    float away = 1.0 - vh;
    float fresnel = 0.02 + 0.98 * away * away * away * away * away;
    float seen = min(1.0, 2.0 * nh * min(nv, nl) / vh);
    return fresnel * spread * seen / (4.0 * nv);
  }
`;

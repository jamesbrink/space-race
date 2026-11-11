import * as THREE from 'three';

/**
 * The air between the eye and what it sees, for every material that takes the scene's fog.
 *
 * three's exponential fog thickens with distance alone, the same at the ground and a kilometre
 * up, so from the air a whole site was washed to the colour of the horizon while from the ground
 * the far tree line was not blue enough. The haze that does this is in the lowest kilometre or
 * so of the air and thins with height. So here the fog's density is the haze's at its base (per
 * metre, as `FogExp2.density`), falling off with height over `scale` metres, and what a ray sees
 * of it is the integral along the ray (Beer and Lambert): a surface keeps `exp(-tau)` of its own
 * light and takes the rest from the fog's colour, which is the light the haze scatters.
 *
 * A visibility V gives a base density of 3.912 / V (Koschmieder). The chunks are the stock fog
 * chunks with that in place of the stock formula: `FogExp2` stays the type, its colour and density
 * stay the setting's, and a material that replaces `fog_fragment` with its own still can.
 * Installed once, before anything is drawn.
 */
export interface Air {
  /** Metres over which the haze's density falls by e. */
  scale: number;
  /** The height (world y) at which the density is the fog's own: sea level. */
  base: number;
}

let installed: Air | null = null;

export function installAir(air: Air): void {
  if (installed && installed.scale === air.scale && installed.base === air.base) return;
  installed = air;
  const chunks = THREE.ShaderChunk as unknown as Record<string, string>;
  chunks.fog_pars_vertex = /* glsl */ `
    #ifdef USE_FOG
      varying float vFogDepth;
      varying vec3 vFogWorld;
    #endif`;
  // where the vertex is in the world: the eye plus the view-space offset turned back (the view's rotation is orthonormal)
  chunks.fog_vertex = /* glsl */ `
    #ifdef USE_FOG
      vFogDepth = - mvPosition.z;
      vFogWorld = cameraPosition + transpose(mat3(viewMatrix)) * mvPosition.xyz;
    #endif`;
  chunks.fog_pars_fragment = /* glsl */ `
    #ifdef USE_FOG
      uniform vec3 fogColor;
      varying float vFogDepth;
      varying vec3 vFogWorld;
      #ifdef FOG_EXP2
        uniform float fogDensity;
      #else
        uniform float fogNear;
        uniform float fogFar;
      #endif
      // how much of the haze lies between the eye and a point, as a fraction of the light lost: 1 - exp(-tau)
      float airFog(vec3 at) {
        float a = max(cameraPosition.y - ${air.base.toFixed(2)}, 0.0) / ${air.scale.toFixed(1)};
        float b = max(at.y - ${air.base.toFixed(2)}, 0.0) / ${air.scale.toFixed(1)};
        // the mean density along the ray, as a fraction of the base's: the integral of exp(-h) between the two heights
        float mean = abs(a - b) < 1e-3 ? exp(-0.5 * (a + b)) : (exp(-min(a, b)) - exp(-max(a, b))) / abs(b - a);
        return 1.0 - exp(-fogDensity * distance(cameraPosition, at) * mean);
      }
    #endif`;
  chunks.fog_fragment = /* glsl */ `
    #ifdef USE_FOG
      #ifdef FOG_EXP2
        float fogFactor = airFog(vFogWorld);
      #else
        float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
      #endif
      gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
    #endif`;
}

/** The haze's base density for a visibility in metres (Koschmieder: the distance at which contrast falls to 2 per cent). */
export const densityFor = (visibility: number): number => 3.912 / visibility;

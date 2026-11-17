import * as THREE from 'three';
import type { ModelDef } from '../types.ts';

/**
 * A cabin's own shadow, as the build baked it (rendering.md, "An inside to sit in"): at each vertex of what is indoors, a
 * colour of four parts named `Shade` in the model, `color` in three. Its red, green and blue are how lit the point is by
 * each of the model's own lamps alone (`ModelDef.lights`, in that order: red the first, green the second, blue the
 * third), its alpha how lit it is with them all out (how open the point is, and how much of what lets light in it sees).
 * A cabin of one lamp has the one figure in all three; one of two has the mean of them in its blue.
 *
 * Read as a colour, as three would, that tints the surface wherever the lamps' figures differ, so every place such a
 * model is drawn reads it as this does (`shadeBy`): `mix(shade.a, dot(shade.rgb, lamps), lit)`, with `lamps` each lamp's
 * share of the strength that is lit (they sum to one) and `lit` the share of the whole strength that is lit. The cabin
 * (cabin.ts) moves them with its lights' switch; anywhere else the model is drawn as built, every lamp lit (`asBuilt`).
 * Moving them is uniforms: no shader is built.
 *
 * What it scales is what the bake worked: the light of the lamps and what is left indoors (the indirect, diffuse and
 * mirrored), every direct light but the Sun's. The Sun's direct light has its own shadow maps (shadows.ts keeps it apart
 * in its loop), and a sunlit face in a cabin cut open, or under a window, is lit as the Sun lights it, however far the
 * lamps reach it: the shade once darkened the colour itself, and a console in full sun was near black in the cutaway.
 *
 * So what lights a cabin's inside is three things: its own lamps, shaded by the bake; the Sun, shaded by its own maps;
 * and the room's light while it is cut open (the room's own lights and the indirect, by the kept share of the shade).
 * The last holds for every material inside a cabin, baked or not (`insideBy`): the room's lights have no shadow map,
 * and a closed cabin in the Gallery was lit through its hull by the studio's rim and kicker.
 */
export interface Shading {
  /** The share of the lamps' whole strength that is lit, 0 to 1. */
  lit: { value: number };
  /** Each lamp's share of the strength that is lit, by channel (sum one); with none lit, each lamp's share of the whole. */
  lamps: { value: THREE.Vector3 };
  /** The colour the little light left indoors takes, as far as the lamps lit are not white (cabin.ts); white otherwise. */
  tint: { value: THREE.Color };
  /**
   * How much of the shade the indirect light keeps: 1 with the cabin closed; less while it is cut open (cabin.ts
   * `opened`), when the room's light comes in where the hull was and how open a point is, as the bake cast it with the
   * hull standing, no longer holds. The lamps' light keeps it all: what stands between a lamp and a point still does.
   */
  kept: { value: number };
  /**
   * Whether the cabin is cut open, 1, or closed, 0 (cabin.ts `opened`). The room's own lights (a studio's rim, kickers,
   * fill and the lamp over the viewer's shoulder: directional, with no shadow map to stop them at the hull) give the
   * inside nothing while it is closed, and while it is open they light it as the room's light that comes in at the
   * cut does: by the kept share of the shade where there is one (`ROOM_LIGHT`).
   */
  open: { value: number };
}

/** Whether a mesh carries a baked shade: a colour of four parts. */
export function carriesShade(mesh: THREE.Mesh): boolean {
  return mesh.geometry?.getAttribute('color')?.itemSize === 4;
}

/** Each lamp's share of the whole strength (`ModelDef.lights`), by channel: equal shares where the model gives none. */
export function sharesOf(lights: ModelDef['lights'], lit: readonly number[] = []): THREE.Vector3 {
  const strength = (lights ?? []).slice(0, 3).map((l, i) => l.intensity * (lit[i] ?? 1));
  const all = strength.reduce((a, b) => a + b, 0);
  if (!(all > 0)) return new THREE.Vector3(1 / 3, 1 / 3, 1 / 3);
  return new THREE.Vector3((strength[0] ?? 0) / all, (strength[1] ?? 0) / all, (strength[2] ?? 0) / all);
}

/** A model as built, every lamp lit at its own strength in its own colour: what is drawn of it where no cabin is worked. */
export function asBuilt(lights: ModelDef['lights']): Shading {
  return {
    lit: { value: 1 },
    lamps: { value: sharesOf(lights) },
    tint: { value: new THREE.Color(1, 1, 1) },
    kept: { value: 1 },
    open: { value: 0 },
  };
}

/**
 * The shade read at a point (`color_fragment`'s place): the figure the switch asks for, and what the Sun alone gives,
 * which shadows.ts's loop adds to (`CABIN_SHADE`). A mesh whose colour has three parts is coloured by it, as three has it.
 */
export const SHADE_READ = /* glsl */ `vec3 cabinSunDiffuse = vec3( 0.0 );
vec3 cabinSunSpecular = vec3( 0.0 );
vec3 cabinRoomDiffuse = vec3( 0.0 );
vec3 cabinRoomSpecular = vec3( 0.0 );
#if defined( USE_COLOR_ALPHA )
  float cabinShade = mix( vColor.a, dot( vColor.rgb, uCabinLamps ), uCabinLit );
#elif defined( USE_COLOR )
  diffuseColor.rgb *= vColor;
#endif`;
/**
 * The room's lights on a cabin's inside with no shade of its own to read (after the light is summed): none while the
 * cabin is closed, all of them while it is open. `cabinRoom...` is what shadows.ts's loop added up of them.
 */
export const ROOM_ONLY = /* glsl */ `reflectedLight.directDiffuse += cabinRoomDiffuse * ( uCabinOpen - 1.0 );
  reflectedLight.directSpecular += cabinRoomSpecular * ( uCabinOpen - 1.0 );`;
/**
 * The shade applied (after the light is summed, at `aomap_fragment`): the Sun's direct light as its shadow maps left it;
 * the room's lights (`cabinRoom...`, which shadows.ts's loop adds up for a material that defines `CABIN_INSIDE`) none
 * while the cabin is closed and the kept share of the shade while it is open; every other direct light (the lamps)
 * scaled by the shade, and the indirect, diffuse and mirrored, by as much of it as it keeps (`kept`). Then the fill
 * tinted.
 */
export const SHADE_APPLY = /* glsl */ `#if defined( USE_COLOR_ALPHA )
  float cabinRoom = uCabinOpen * mix( 1.0, cabinShade, uCabinKept );
  reflectedLight.directDiffuse = cabinSunDiffuse + cabinRoomDiffuse * cabinRoom + ( reflectedLight.directDiffuse - cabinSunDiffuse - cabinRoomDiffuse ) * cabinShade;
  reflectedLight.directSpecular = cabinSunSpecular + cabinRoomSpecular * cabinRoom + ( reflectedLight.directSpecular - cabinSunSpecular - cabinRoomSpecular ) * cabinShade;
  reflectedLight.indirectDiffuse *= mix( 1.0, cabinShade, uCabinKept );
  reflectedLight.indirectSpecular *= mix( 1.0, cabinShade, uCabinKept );
#else
  ${ROOM_ONLY}
#endif
reflectedLight.indirectDiffuse *= uCabinTint;
reflectedLight.indirectSpecular *= uCabinTint;`;

/** What each patched material reads its shade by: the last `shadeBy` given it (a cabin made again for the same model takes it over). */
const reading = new WeakMap<THREE.Material, { by: Shading }>();

/**
 * A material whose meshes carry the build's shade reads it by `by` (above). Its shader is patched once; asked again, it
 * reads by the new `by` from then on, with no shader built. A material patched before the looks make its cel twin
 * (look.ts) gives the twin the same reading.
 */
export function shadeBy(material: THREE.Material, by: Shading): void {
  const known = reading.get(material);
  if (known) {
    known.by = by;
    return;
  }
  const slot = { by };
  reading.set(material, slot);
  const prior = material.onBeforeCompile;
  const key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    prior.call(material, shader, renderer);
    // (read through the slot, so that whoever shades it last is who it is read by)
    shader.uniforms.uCabinLit = {
      get value() {
        return slot.by.lit.value;
      },
    };
    shader.uniforms.uCabinLamps = {
      get value() {
        return slot.by.lamps.value;
      },
    };
    shader.uniforms.uCabinTint = {
      get value() {
        return slot.by.tint.value;
      },
    };
    shader.uniforms.uCabinKept = {
      get value() {
        return slot.by.kept.value;
      },
    };
    shader.uniforms.uCabinOpen = {
      get value() {
        return slot.by.open.value;
      },
    };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#define CABIN_SHADE\n#define CABIN_INSIDE\n#include <common>\nuniform float uCabinLit;\nuniform vec3 uCabinLamps;\nuniform vec3 uCabinTint;\nuniform float uCabinKept;\nuniform float uCabinOpen;',
      )
      .replace('#include <color_fragment>', SHADE_READ)
      // (the fill: the little of the sky's light left indoors, and what metal mirrors in place of a cabin it cannot see,
      // takes the colour of the cabin's own lamps as far as they are lit: `tint`)
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>\n${SHADE_APPLY}`);
  };
  material.customProgramCacheKey = () => `${key}|cabin-shade`;
  material.needsUpdate = true;
}

/** What each material inside a cabin with no shade of its own is read by (`insideBy`). */
const inside = new WeakMap<THREE.Material, { by: Shading }>();

/**
 * A material inside a cabin that carries no shade (cabin.ts gives it every material it dresses as indoors): the room's
 * own lights give it nothing while the cabin is closed and all their light while it is open (`ROOM_ONLY`). One that
 * reads a shade already has this (`shadeBy`) and is left as it is. Patched once; asked again, it reads by the new `by`.
 */
export function insideBy(material: THREE.Material, by: Shading): void {
  if (reading.has(material)) return;
  const known = inside.get(material);
  if (known) {
    known.by = by;
    return;
  }
  const slot = { by };
  inside.set(material, slot);
  const prior = material.onBeforeCompile;
  const key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    prior.call(material, shader, renderer);
    shader.uniforms.uCabinOpen = {
      get value() {
        return slot.by.open.value;
      },
    };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#define CABIN_INSIDE\n#include <common>\nuniform float uCabinOpen;')
      .replace(
        '#include <color_fragment>',
        'vec3 cabinRoomDiffuse = vec3( 0.0 );\nvec3 cabinRoomSpecular = vec3( 0.0 );\n#include <color_fragment>',
      )
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>\n${ROOM_ONLY}`);
  };
  material.customProgramCacheKey = () => `${key}|cabin-inside`;
  material.needsUpdate = true;
}

/**
 * Every material of `root` drawn on a mesh that carries the shade is read by `by` (glass and crystal are not shaded:
 * their alpha is their own). Returns the materials, for a caller that wants them (cabin.ts: they are indoors).
 */
export function shadeAll(root: THREE.Object3D, by: Shading): THREE.Material[] {
  const out: THREE.Material[] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !carriesShade(mesh)) return;
    for (const material of new Set([mesh.userData.real, mesh.material] as (THREE.Material | undefined)[])) {
      if (!material || !(material as THREE.MeshStandardMaterial).vertexColors || material.name.startsWith('glass')) continue;
      shadeBy(material, by);
      out.push(material);
    }
  });
  return out;
}

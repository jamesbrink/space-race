import { prefs } from '../prefs.ts';

/**
 * What the device can hold. A phone's browser kills a tab that takes too much memory, without a
 * word (the page reloads, then "a problem repeatedly occurred"), and at a desktop's sizes this page
 * took a gigabyte of the GPU's. So there are two tiers, decided once as the page opens and fixed
 * until it is reloaded (what is allocated at the start cannot be taken back):
 *
 * - `full`: everything at the sizes it was made for. A desktop's, untouched.
 * - `lighter`: nothing is allocated that is not on show, and nothing at a size the screen cannot
 *   resolve. What each figure below is, and what it costs to see, is in rendering.md ("Memory").
 *
 * Which tier is decided from what the device says of itself, never from its name: its first
 * pointer is a finger (a phone or a tablet), or it reports four gigabytes of memory or less, or
 * its GPU takes no texture or renderbuffer of 8192. "Lighter graphics" in the page's controls
 * chooses it on any machine, or refuses it on a phone, and is remembered (prefs.ts); `?lighter`
 * and `?lighter=0` in the address do the same for one visit (the tests').
 */
export interface Tier {
  lighter: boolean;
  /** Why: said in the diagnostics and by `pnpm test:mem`. */
  why: string;
  /** The most drawing pixels a CSS pixel. */
  pixelRatio: number;
  /** Texels a side of the Sun's fine shadow map, of the far one, of the sky's, and the most of the fine one on foot (Stage.walkShadow). */
  shadow: { fine: number; far: number; sky: number; walk: number };
  /** On foot, a second fine map holds what does not move (shadowcache.ts). */
  walkCache: boolean;
  /** A model's picture (a cabin's panel) is sent at this share of its size each way if it is `pictureOver` texels a side or more. */
  pictureScale: number;
  pictureOver: number;
  /** Texels along a face of the cube a cabin's periscope looks at the world through (cabin.ts). */
  periscope: number;
  /** A mesh of fewer than 65,536 vertices has its triangles listed in two bytes a corner, not four: the same triangles. */
  shortIndices: boolean;
  /** Of the Sun's fine maps (the section's, the walk's) only the one in use is held; otherwise both, so going on foot and back allocates nothing. */
  oneFineMap: boolean;
  /** Every picture is sent to the GPU as the page opens, shown or not (Stage.warm); otherwise when it is first drawn. */
  warmPictures: boolean;
  /** Every level of detail of everything is drawn unseen as the page opens (Stage.warm), so all of it is on the GPU; otherwise each level's shaders are built then and the level is sent when first drawn. */
  warmLevels: boolean;
  /** The other look's shaders are built behind the first (Stage.prebuild); otherwise when the look is first changed. */
  prebuildLook: boolean;
  /** The globe's maps are fetched and allocated as the page opens and a moment after; otherwise when the eye first rises toward seeing them. */
  globeEager: boolean;
  /** The globe's colours and relief are loaded at half their size each way. */
  globeHalved: boolean;
  /** Texels a side of a layer of the region's flat maps (globe.ts): a map larger than that is sent at the size that fits. */
  regionLayer: number;
}

const FULL: Omit<Tier, 'why'> = {
  lighter: false,
  pixelRatio: 2,
  shadow: { fine: 4096, far: 4096, sky: 2048, walk: 8192 },
  walkCache: true,
  pictureScale: 1,
  pictureOver: Number.POSITIVE_INFINITY,
  periscope: 1024,
  shortIndices: false,
  oneFineMap: false,
  warmPictures: true,
  warmLevels: true,
  prebuildLook: true,
  globeEager: true,
  globeHalved: false,
  regionLayer: 4096,
};
const LIGHTER: Omit<Tier, 'why'> = {
  lighter: true,
  pixelRatio: 1.5,
  shadow: { fine: 2048, far: 2048, sky: 1024, walk: 3072 },
  walkCache: false,
  pictureScale: 0.5,
  pictureOver: 2048,
  periscope: 512,
  shortIndices: true,
  oneFineMap: true,
  warmPictures: false,
  warmLevels: false,
  prebuildLook: false,
  globeEager: false,
  globeHalved: true,
  regionLayer: 2048,
};

/** What a WebGL context says it can take: asked once, of a context made for the asking and let go. */
function limits(): { texture: number; renderbuffer: number } | null {
  if (typeof document === 'undefined') return null;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return null;
    const found = {
      texture: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
      renderbuffer: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number,
    };
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return found;
  } catch {
    return null;
  }
}

/** Why this device is taken to be constrained, or null if it is not. */
function constrained(): string | null {
  if (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) return 'its pointer is a finger';
  const memory = (globalThis.navigator as { deviceMemory?: number } | undefined)?.deviceMemory;
  if (memory !== undefined && memory <= 4) return `it reports ${memory} GB of memory`;
  const gpu = limits();
  if (gpu && Math.min(gpu.texture, gpu.renderbuffer) < 8192)
    return `its GPU takes no texture over ${Math.min(gpu.texture, gpu.renderbuffer)}`;
  return null;
}

let decided: Tier | null = null;
/** The tier this page was opened in. */
export function tier(): Tier {
  if (decided) return decided;
  const asked = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('lighter');
  const device = constrained();
  let lighter: boolean;
  let why: string;
  if (asked !== null) [lighter, why] = [asked !== '0', 'the address asks'];
  else if (prefs.get('lighter')) [lighter, why] = [true, 'chosen'];
  else if (prefs.get('lighterOff')) [lighter, why] = [false, 'refused'];
  else [lighter, why] = [device !== null, device ?? 'the device is not constrained'];
  // (a device that is constrained and has refused the lighter tier still has a finger's pixel ratio)
  decided = { ...(lighter ? LIGHTER : FULL), why };
  if (!lighter && device?.includes('finger')) decided.pixelRatio = 1.5;
  return decided;
}

/** Choose the tier for the next time the page opens (the "Lighter graphics" switch, or a lost context's way back). */
export function chooseTier(lighter: boolean): void {
  prefs.set('lighter', lighter);
  prefs.set('lighterOff', !lighter);
}

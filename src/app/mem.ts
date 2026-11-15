/**
 * What the page has allocated on the GPU, counted: `?mem` in the address. A phone's browser kills a
 * tab that takes too much memory and says nothing about why, so the page has to be able to say
 * what it holds. This wraps the calls that allocate (a texture's storage, a renderbuffer's, a
 * buffer's) on every WebGL 2 context the page makes, before any is made (enter.ts), and keeps for
 * each object its size in bytes and who asked for it (the page's own frames of the call's stack).
 * Nothing here is loaded without the flag, and nothing in the page knows of it.
 *
 * `window.srMem.report()` is the account: every live allocation, largest first, with totals by
 * kind and by context; `pnpm test:mem` (tools/mem-test.mjs) holds the totals to a budget. With
 * `?mem=show` the totals are also written in a corner of the page, for a phone with no console.
 *
 * What is counted is what was asked for, at the size the format says: a driver may round up, keep
 * a second copy, or (on a phone) store three-byte texels as four, which is how they are counted
 * here. A canvas's own drawing buffer is counted as its colour and its depth.
 */
type GL = WebGL2RenderingContext;

export interface Allocation {
  kind: 'texture' | 'renderbuffer' | 'buffer' | 'canvas';
  /** Which of the page's contexts it is in, in the order they were made. */
  context: number;
  bytes: number;
  /** Its shape, as allocated: `8192x8192 DEPTH_COMPONENT24`, `1170x2532 RGBA16F x4`. */
  what: string;
  /** Who asked: the page's own frames of the stack at the call, nearest first; then a name given by `label`. */
  owner: string;
  name?: string;
}

interface Kept {
  kind: Allocation['kind'];
  context: number;
  owner: string;
  name?: string;
  /** Bytes of each image of a texture (level and face), or the one figure of anything else. */
  images: Map<string, number>;
  mipmapped: boolean;
  what: string;
}

const kept = new Map<object, Kept>();
const contexts: GL[] = [];
/** Per context: the texture bound to each unit's target, and the renderbuffer and buffers bound. */
const bound = new WeakMap<
  GL,
  { unit: number; textures: Map<string, WebGLTexture | null>; rb: WebGLRenderbuffer | null; buffers: Map<number, WebGLBuffer | null> }
>();

/** Bytes a texel, by sized internal format. Three bytes are stored as four on every GPU a phone has. */
const TEXEL: Record<string, number> = {
  R8: 1,
  R8_SNORM: 1,
  R8UI: 1,
  R8I: 1,
  LUMINANCE: 1,
  ALPHA: 1,
  RED: 1,
  RG8: 2,
  RG8UI: 2,
  LUMINANCE_ALPHA: 2,
  R16F: 2,
  R16UI: 2,
  R16I: 2,
  RGB565: 2,
  RGBA4: 2,
  RGB5_A1: 2,
  DEPTH_COMPONENT16: 2,
  RGB: 4,
  RGB8: 4,
  SRGB8: 4,
  RGBA: 4,
  RGBA8: 4,
  SRGB8_ALPHA8: 4,
  RGB10_A2: 4,
  R11F_G11F_B10F: 4,
  RGB9_E5: 4,
  RG16F: 4,
  R32F: 4,
  R32UI: 4,
  R32I: 4,
  DEPTH_COMPONENT: 4,
  DEPTH_COMPONENT24: 4,
  DEPTH_COMPONENT32F: 4,
  DEPTH24_STENCIL8: 4,
  DEPTH_STENCIL: 4,
  STENCIL_INDEX8: 1,
  RGB16F: 8,
  RGBA16F: 8,
  RG32F: 8,
  DEPTH32F_STENCIL8: 8,
  RGB32F: 16,
  RGBA32F: 16,
};
let names: Map<number, string> | null = null;
function formatName(gl: GL, format: number, type?: number): string {
  if (!names) {
    names = new Map();
    for (const key of Object.keys(TEXEL)) {
      const value = (gl as unknown as Record<string, number>)[key];
      if (typeof value === 'number') names.set(value, key);
    }
  }
  const name = names.get(format) ?? `0x${format.toString(16)}`;
  // an unsized format takes its size from the type it is given in
  if (type === gl.HALF_FLOAT && (name === 'RGBA' || name === 'RGB')) return 'RGBA16F';
  if (type === gl.FLOAT && (name === 'RGBA' || name === 'RGB')) return 'RGBA32F';
  return name;
}
const texel = (name: string): number => TEXEL[name] ?? 4;

/** The page's own frames of the stack, nearest first: `stage.ts:2160 shadowGrain < stage.ts:491 Stage`. */
function owner(): string {
  const stack = new Error().stack ?? '';
  const out: string[] = [];
  for (const line of stack.split('\n')) {
    if (line.includes('/mem.ts') || line.includes('node_modules')) continue;
    const at = /\/src\/([\w./-]+?\.ts)[^:]*:(\d+)/.exec(line);
    if (!at) continue;
    const fn = /at (?:async )?(?:new )?([\w.$<>]+) \(/.exec(line)?.[1] ?? /^\s*([\w.$<>]+)@/.exec(line)?.[1] ?? '';
    out.push(`${at[1]!.replace(/^viewer\//, '')}:${at[2]}${fn ? ` ${fn.split('.').pop()}` : ''}`);
    if (out.length === 5) break;
  }
  return out.join(' < ');
}

function stateOf(gl: GL) {
  let s = bound.get(gl);
  if (!s) {
    s = { unit: 0, textures: new Map(), rb: null, buffers: new Map() };
    bound.set(gl, s);
    contexts.push(gl);
  }
  return s;
}

function textureAt(gl: GL, target: number): WebGLTexture | null {
  const s = stateOf(gl);
  // a cube's face is allocated through the cube's binding
  const binding = target >= gl.TEXTURE_CUBE_MAP_POSITIVE_X && target <= gl.TEXTURE_CUBE_MAP_NEGATIVE_Z ? gl.TEXTURE_CUBE_MAP : target;
  return s.textures.get(`${s.unit}:${binding}`) ?? null;
}

function keep(gl: GL, object: object | null, kind: Allocation['kind']): Kept | null {
  if (!object) return null;
  let k = kept.get(object);
  if (!k) {
    k = { kind, context: contexts.indexOf(gl), owner: owner(), images: new Map(), mipmapped: false, what: '' };
    kept.set(object, k);
  }
  return k;
}

/** Every level of a chain from `w` by `h` (by `d` deep where a volume halves too), in texels. */
function chain(levels: number, w: number, h: number, d: number, volume: boolean): number {
  let sum = 0;
  for (let i = 0; i < levels; i++) {
    sum += Math.max(1, w >> i) * Math.max(1, h >> i) * (volume ? Math.max(1, d >> i) : d);
  }
  return sum;
}

type Fn = (this: GL, ...args: never[]) => unknown;
function wrap(
  proto: object,
  name: string,
  before: (gl: GL, args: unknown[]) => void,
  after?: (gl: GL, args: unknown[], result: unknown) => void,
): void {
  const original = (proto as Record<string, Fn>)[name];
  if (!original) return;
  (proto as Record<string, unknown>)[name] = function (this: GL, ...args: unknown[]) {
    before(this, args);
    const result = (original as (...a: unknown[]) => unknown).apply(this, args);
    after?.(this, args, result);
    return result;
  };
}

const sizeOf = (source: unknown): [number, number] => {
  const s = source as {
    videoWidth?: number;
    videoHeight?: number;
    naturalWidth?: number;
    naturalHeight?: number;
    displayWidth?: number;
    displayHeight?: number;
    width?: number;
    height?: number;
  };
  return [
    s.videoWidth || s.naturalWidth || s.displayWidth || s.width || 0,
    s.videoHeight || s.naturalHeight || s.displayHeight || s.height || 0,
  ];
};

let installed = false;
export function install(): void {
  if (installed || typeof WebGL2RenderingContext === 'undefined') return;
  installed = true;
  Error.stackTraceLimit = 60; // (three's own frames lie between the call and whoever in the page asked)
  const P = WebGL2RenderingContext.prototype;
  const nothing = (): void => {};

  wrap(P, 'activeTexture', (gl, [unit]) => {
    stateOf(gl).unit = unit as number;
  });
  wrap(P, 'bindTexture', (gl, [target, texture]) => {
    const s = stateOf(gl);
    s.textures.set(`${s.unit}:${target as number}`, texture as WebGLTexture | null);
  });
  wrap(P, 'texImage2D', (gl, a) => {
    const [target, level, internal] = a as [number, number, number];
    const k = keep(gl, textureAt(gl, target), 'texture');
    if (!k) return;
    const [w, h] = a.length >= 9 ? [a[3] as number, a[4] as number] : sizeOf(a[5]);
    const name = formatName(gl, internal, (a.length >= 9 ? a[7] : a[4]) as number);
    k.images.set(`${target}:${level}`, w * h * texel(name));
    if (level === 0) k.what = `${w}x${h} ${name}${target !== gl.TEXTURE_2D ? ' cube' : ''}`;
  });
  wrap(P, 'texStorage2D', (gl, a) => {
    const [target, levels, internal, w, h] = a as [number, number, number, number, number];
    const k = keep(gl, textureAt(gl, target), 'texture');
    if (!k) return;
    const name = formatName(gl, internal);
    const faces = target === gl.TEXTURE_CUBE_MAP ? 6 : 1;
    k.images.set('storage', chain(levels, w, h, 1, false) * faces * texel(name));
    k.what = `${w}x${h} ${name}${faces > 1 ? ' cube' : ''}${levels > 1 ? ` ${levels} levels` : ''}`;
  });
  wrap(P, 'texStorage3D', (gl, a) => {
    const [target, levels, internal, w, h, d] = a as [number, number, number, number, number, number];
    const k = keep(gl, textureAt(gl, target), 'texture');
    if (!k) return;
    const name = formatName(gl, internal);
    k.images.set('storage', chain(levels, w, h, d, target === gl.TEXTURE_3D) * texel(name));
    k.what = `${w}x${h}x${d} ${name}${levels > 1 ? ` ${levels} levels` : ''}`;
  });
  wrap(P, 'texImage3D', (gl, a) => {
    const [target, level, internal, w, h, d] = a as [number, number, number, number, number, number];
    const k = keep(gl, textureAt(gl, target), 'texture');
    if (!k) return;
    const name = formatName(gl, internal, a[8] as number);
    k.images.set(`${target}:${level}`, w * h * d * texel(name));
    if (level === 0) k.what = `${w}x${h}x${d} ${name}`;
  });
  wrap(P, 'compressedTexImage2D', (gl, a) => {
    const [target, level, , w, h] = a as [number, number, number, number, number];
    const k = keep(gl, textureAt(gl, target), 'texture');
    if (!k) return;
    const data = a[6] as ArrayBufferView | undefined;
    k.images.set(`${target}:${level}`, data?.byteLength ?? w * h);
    if (level === 0) k.what = `${w}x${h} compressed`;
  });
  wrap(P, 'generateMipmap', (gl, [target]) => {
    const k = keep(gl, textureAt(gl, target as number), 'texture');
    if (k && !k.mipmapped) {
      k.mipmapped = true;
      if (!k.what.includes('levels')) k.what += ' mipmapped';
    }
  });
  wrap(P, 'deleteTexture', (_gl, [texture]) => {
    if (texture) kept.delete(texture as object);
  });

  wrap(P, 'bindRenderbuffer', (gl, [, rb]) => {
    stateOf(gl).rb = rb as WebGLRenderbuffer | null;
  });
  wrap(P, 'renderbufferStorage', (gl, a) => {
    const [, internal, w, h] = a as [number, number, number, number];
    const k = keep(gl, stateOf(gl).rb, 'renderbuffer');
    if (!k) return;
    const name = formatName(gl, internal);
    k.images.set('storage', w * h * texel(name));
    k.what = `${w}x${h} ${name}`;
  });
  wrap(P, 'renderbufferStorageMultisample', (gl, a) => {
    const [, samples, internal, w, h] = a as [number, number, number, number, number];
    const k = keep(gl, stateOf(gl).rb, 'renderbuffer');
    if (!k) return;
    const name = formatName(gl, internal);
    k.images.set('storage', w * h * texel(name) * Math.max(1, samples));
    k.what = `${w}x${h} ${name}${samples > 1 ? ` x${samples}` : ''}`;
  });
  wrap(P, 'deleteRenderbuffer', (_gl, [rb]) => {
    if (rb) kept.delete(rb as object);
  });

  wrap(P, 'bindBuffer', (gl, [target, buffer]) => {
    stateOf(gl).buffers.set(target as number, buffer as WebGLBuffer | null);
  });
  wrap(P, 'bufferData', (gl, a) => {
    const [target, data] = a as [number, number | ArrayBufferView | ArrayBuffer | null];
    const k = keep(gl, stateOf(gl).buffers.get(target) ?? null, 'buffer');
    if (!k) return;
    const whole = typeof data === 'number' ? data : (data?.byteLength ?? 0);
    const bytes = typeof a[4] === 'number' && a[4] > 0 ? a[4] * ((data as { BYTES_PER_ELEMENT?: number }).BYTES_PER_ELEMENT ?? 1) : whole;
    k.images.set('data', bytes);
    k.what = target === gl.ELEMENT_ARRAY_BUFFER ? 'indices' : 'vertices';
  });
  wrap(P, 'deleteBuffer', (_gl, [buffer]) => {
    if (buffer) kept.delete(buffer as object);
  });
  // (a context is known from its first call; one that has been made and not yet used is found here)
  wrap(P, 'getParameter', (gl) => void stateOf(gl), nothing);

  // decoded pictures held as bitmaps: counted while they have not been closed
  if (typeof createImageBitmap === 'function' && typeof ImageBitmap !== 'undefined') {
    const make = createImageBitmap;
    (globalThis as { createImageBitmap: unknown }).createImageBitmap = async (...args: Parameters<typeof createImageBitmap>) => {
      const bitmap = await make(...args);
      bitmaps.add(new WeakRef(bitmap));
      return bitmap;
    };
  }

  Object.assign(window, { srMem: { report, label, table, name: nameTexture } });
  if (new URLSearchParams(location.search).get('mem') === 'show') show();
}

const bitmaps = new Set<WeakRef<ImageBitmap>>();

/** Give a texture a name for the account (the page's own, by whatever it knows it as). */
function nameTexture(texture: object | null | undefined, name: string): void {
  const k = texture && kept.get(texture);
  if (k) k.name = name;
}

/**
 * Name what three knows: every texture a material under `roots` wears, by material and slot, and
 * what the renderer reads its picture from. `renderer` is a THREE.WebGLRenderer; nothing of three
 * is imported here.
 */
function label(
  renderer: { properties: { get(o: object): { __webglTexture?: object } } },
  roots: { traverse(f: (o: object) => void): void }[],
): void {
  for (const root of roots)
    root.traverse((o) => {
      const worn = (o as { material?: unknown }).material;
      const materials = (Array.isArray(worn) ? worn : worn ? [worn] : []) as Record<string, unknown>[];
      for (const m of materials) {
        const slots: [string, unknown][] = Object.entries(m);
        const uniforms = m.uniforms as Record<string, { value: unknown }> | undefined;
        if (uniforms) for (const [key, u] of Object.entries(uniforms)) slots.push([key, u?.value]);
        for (const [slot, value] of slots) {
          const t = value as { isTexture?: boolean; name?: string } | null;
          if (!t?.isTexture) continue;
          nameTexture(
            renderer.properties.get(t).__webglTexture,
            `${(m.name as string) || (m.type as string)}.${slot}${t.name ? ` (${t.name})` : ''}`,
          );
        }
      }
    });
}

export interface Report {
  /** Megabytes (2^20 bytes) by kind, and in all. */
  total: number;
  textures: number;
  renderbuffers: number;
  buffers: number;
  canvases: number;
  contexts: number;
  count: number;
  /** Decoded bitmaps made by `createImageBitmap` and not yet collected or closed, megabytes. */
  bitmaps: number;
  /** The JavaScript heap in use, megabytes, where the browser says (Chromium). */
  heap: number | null;
  /** Every allocation, largest first. */
  list: Allocation[];
}

const MB = 1 << 20;
function report(): Report {
  const list: Allocation[] = [];
  for (const k of kept.values()) {
    // (a context that has been let go holds nothing: the front page's, once a flight has arrived)
    if (contexts[k.context]?.isContextLost()) continue;
    let bytes = 0;
    for (const b of k.images.values()) bytes += b;
    // (a chain made by generateMipmap is a third more than its first level)
    if (k.mipmapped && !k.images.has('storage')) {
      let first = 0;
      for (const [key, b] of k.images) if (key.endsWith(':0')) first += b;
      bytes = Math.max(bytes, (first * 4) / 3);
    }
    if (bytes > 0) list.push({ kind: k.kind, context: k.context, bytes: Math.round(bytes), what: k.what, owner: k.owner, name: k.name });
  }
  contexts.forEach((gl, context) => {
    if (gl.isContextLost()) return;
    const { drawingBufferWidth: w, drawingBufferHeight: h } = gl;
    const attributes = gl.getContextAttributes();
    const bytes = w * h * 4 * (attributes?.antialias ? 5 : 1) + (attributes?.depth ? w * h * 4 : 0);
    list.push({ kind: 'canvas', context, bytes, what: `${w}x${h} drawing buffer`, owner: (gl.canvas as HTMLCanvasElement).id || 'canvas' });
  });
  list.sort((a, b) => b.bytes - a.bytes);
  const sum = (kind: Allocation['kind']): number => list.filter((a) => a.kind === kind).reduce((s, a) => s + a.bytes, 0) / MB;
  let held = 0;
  for (const ref of bitmaps) {
    const b = ref.deref();
    if (!b) bitmaps.delete(ref);
    else held += b.width * b.height * 4;
  }
  const heap = (performance as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;
  return {
    total: list.reduce((s, a) => s + a.bytes, 0) / MB,
    textures: sum('texture'),
    renderbuffers: sum('renderbuffer'),
    buffers: sum('buffer'),
    canvases: sum('canvas'),
    contexts: contexts.filter((gl) => !gl.isContextLost()).length,
    count: list.length,
    bitmaps: held / MB,
    heap: heap === undefined ? null : heap / MB,
    list,
  };
}

/** The account as text: the totals, then the `top` largest. */
function table(top = 30): string {
  const r = report();
  const lines = [
    `${r.total.toFixed(0)} MiB in ${r.count} allocations on ${r.contexts} context(s): textures ${r.textures.toFixed(0)}, renderbuffers ${r.renderbuffers.toFixed(0)}, buffers ${r.buffers.toFixed(0)}, canvases ${r.canvases.toFixed(0)}`,
  ];
  for (const a of r.list.slice(0, top))
    lines.push(
      `${(a.bytes / MB).toFixed(1).padStart(7)}  ${a.kind.padEnd(12)} c${a.context}  ${a.what.padEnd(34)} ${a.name ?? ''}${a.name && a.owner ? '  ' : ''}${a.owner}`,
    );
  return lines.join('\n');
}

/** The totals in a corner of the page, kept up: for a phone, where there is no console to ask. */
function show(): void {
  const el = document.createElement('pre');
  el.style.cssText =
    'position:fixed;left:4px;top:4px;z-index:99999;margin:0;padding:4px 6px;font:10px/1.3 ui-monospace,monospace;color:#fff;background:#000c;pointer-events:none;white-space:pre-wrap;max-width:96vw';
  const write = (): void => {
    if (!el.isConnected) document.body?.append(el);
    const r = report();
    el.textContent = `GPU ${r.total.toFixed(0)} MiB (tex ${r.textures.toFixed(0)}, rb ${r.renderbuffers.toFixed(0)}, buf ${r.buffers.toFixed(0)}) ctx ${r.contexts}\n${r.list
      .slice(0, 6)
      .map((a) => `${(a.bytes / MB).toFixed(0)} ${a.what}`)
      .join('\n')}`;
  };
  setInterval(write, 1000);
}

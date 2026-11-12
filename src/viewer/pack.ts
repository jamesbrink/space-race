import * as THREE from 'three';

/**
 * Maps packed together on the GPU, to save texture units.
 *
 * A fragment shader may read sixteen textures at once and no more (WebGL 2 promises only that many:
 * MAX_TEXTURE_IMAGE_UNITS), and every shadow-casting light a lit material is under takes one. The
 * globe's maps took eight of them. So one-channel maps of a size are kept as the channels of one
 * cube map (`packCube`) and one-channel flat maps as the layers of one array texture
 * (`packLayer`), each copied in on the GPU as it arrives: the decoded picture is uploaded once as
 * a plain texture, drawn into its channel or layer texel for texel (nearest, so what is kept is the
 * file's own bytes), and let go. Nothing is read back, and a map that has not arrived reads 0. Maps of
 * colours that arrive late are copied in the same way (`colourCube`, `colourMap`), so that no upload
 * holds a frame: a piece of a map a frame.
 */
const VERTEX = /* glsl */ `
  in vec3 position;
  void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const FRAGMENT = /* glsl */ `
  precision highp float;
  uniform sampler2D tFrom;
  uniform vec2 uSize;    // the size of the piece drawn, texels
  uniform vec2 uCorner;  // where in what is drawn into its first texel goes
  uniform vec4 uInto;    // which channel takes it; all nothing: its colours are taken as they are
  out vec4 oValue;
  void main() {
    vec4 from = texture(tFrom, (gl_FragCoord.xy - uCorner) / uSize);
    oValue = uInto == vec4(0.0) ? vec4(from.rgb, 1.0) : uInto * from.r;
  }`;

/** A map is copied in in pieces this many texels square, one a frame: a piece's upload is a few milliseconds, a whole map's a tenth of a second. */
const PIECE = 1024;

/**
 * One piece of GPU work a frame. A map arriving is megabytes to upload and a mip chain to make; several landing in
 * one frame held it for most of a second (seen as a lurch of the camera, and caught by the camera's test), so each
 * upload or copy is `queued` and takes a frame of its own. Where there are no frames (a test) it is done at once.
 */
const jobs: (() => void)[] = [];
let pumping = false;
function pump(): void {
  const job = jobs.shift();
  if (!job) {
    pumping = false;
    return;
  }
  job();
  requestAnimationFrame(pump);
}
export function queued(job: () => void): Promise<void> {
  return new Promise((done) => {
    const run = (): void => {
      job();
      done();
    };
    if (typeof requestAnimationFrame === 'undefined') return run();
    jobs.push(run);
    if (!pumping) {
      pumping = true;
      requestAnimationFrame(pump);
    }
  });
}

let pane: { scene: THREE.Scene; camera: THREE.Camera; material: THREE.RawShaderMaterial } | null = null;
function paneOf(): NonNullable<typeof pane> {
  if (pane) return pane;
  const triangle = new THREE.BufferGeometry();
  triangle.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  // (added to what is there: each channel is drawn on its own, into a target that began at nothing)
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      tFrom: { value: null },
      uSize: { value: new THREE.Vector2(1, 1) },
      uCorner: { value: new THREE.Vector2(0, 0) },
      uInto: { value: new THREE.Vector4(1, 0, 0, 0) },
    },
    depthTest: false,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneFactor,
  });
  const mesh = new THREE.Mesh(triangle, material);
  mesh.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(mesh);
  pane = { scene, camera: new THREE.Camera(), material };
  return pane;
}

/** A decoded picture as a plain texture for one copy: its first channel, texel for texel when it is `width` across, filtered when it is not (a map halved for a small screen). */
function source(bitmap: ImageBitmap, exact: boolean, colour: boolean): THREE.Texture {
  const texture = new THREE.Texture(bitmap as unknown as HTMLImageElement);
  texture.format = colour ? THREE.RGBAFormat : THREE.RedFormat;
  texture.type = THREE.UnsignedByteType;
  texture.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.flipY = false;
  texture.generateMipmaps = false;
  texture.minFilter = texture.magFilter = exact ? THREE.NearestFilter : THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Draw a picture into a rectangle (x, y, width, height: texels) of one part of a target: into one channel (0 red to
 * 3 alpha), added to what is there, or with `channel` null its colours as they are (an sRGB picture into an sRGB target).
 */
function draw(
  renderer: THREE.WebGLRenderer,
  target: THREE.WebGLRenderTarget,
  part: number,
  bitmap: ImageBitmap,
  rect: [number, number, number, number],
  channel: number | null,
  mips: boolean,
): void {
  const { scene, camera, material } = paneOf();
  const [x, y, width, height] = rect;
  // (the mip levels are made after this draw only if asked: a map's are made once, after its last piece)
  target.texture.generateMipmaps = mips;
  const from = source(bitmap, bitmap.width === width && bitmap.height === height, channel === null);
  material.uniforms.tFrom!.value = from;
  (material.uniforms.uSize!.value as THREE.Vector2).set(width, height);
  (material.uniforms.uCorner!.value as THREE.Vector2).set(x, y);
  (material.uniforms.uInto!.value as THREE.Vector4).set(
    Number(channel === 0),
    Number(channel === 1),
    Number(channel === 2),
    Number(channel === 3),
  );
  material.blending = channel === null ? THREE.NoBlending : THREE.CustomBlending;
  const was = renderer.getRenderTarget(),
    face = renderer.getActiveCubeFace(),
    level = renderer.getActiveMipmapLevel(),
    auto = renderer.autoClear,
    xr = renderer.xr.enabled;
  renderer.xr.enabled = false;
  renderer.autoClear = false;
  target.viewport.set(x, y, width, height);
  target.scissor.set(x, y, width, height);
  target.scissorTest = true;
  renderer.setRenderTarget(target, part);
  renderer.render(scene, camera);
  target.viewport.set(0, 0, target.width, target.height);
  target.scissor.set(0, 0, target.width, target.height);
  target.scissorTest = false;
  renderer.setRenderTarget(was, face, level);
  target.texture.generateMipmaps = true;
  renderer.autoClear = auto;
  renderer.xr.enabled = xr;
  from.dispose();
  bitmap.close();
}

/**
 * A picture into the corner of one part of a target, a piece a frame (`queued`): cut into pieces of PIECE texels by
 * the browser, off the page's thread, each uploaded and drawn in a frame of its own; the mip levels made after the
 * last, if asked. A picture of another size than `width` by `height` (a map halved for a small screen) goes in whole,
 * filtered.
 */
async function copyIn(
  renderer: THREE.WebGLRenderer,
  target: THREE.WebGLRenderTarget,
  part: number,
  bitmap: ImageBitmap,
  width: number,
  height: number,
  channel: number | null,
  mips: boolean,
): Promise<void> {
  if (bitmap.width !== width || bitmap.height !== height || typeof createImageBitmap === 'undefined')
    return queued(() => draw(renderer, target, part, bitmap, [0, 0, width, height], channel, mips));
  const pieces: [number, number, number, number][] = [];
  for (let y = 0; y < height; y += PIECE)
    for (let x = 0; x < width; x += PIECE) pieces.push([x, y, Math.min(PIECE, width - x), Math.min(PIECE, height - y)]);
  const cut = await Promise.all(
    pieces.map(([x, y, w, h]) =>
      createImageBitmap(bitmap, x, y, w, h, { colorSpaceConversion: 'none', premultiplyAlpha: 'none', imageOrientation: 'none' }),
    ),
  );
  bitmap.close();
  for (const [i, piece] of cut.entries())
    await queued(() => draw(renderer, target, part, piece, pieces[i]!, channel, mips && i === cut.length - 1));
}

/** Clear every part of a new target to nothing. */
function blank(renderer: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, parts: number): void {
  const was = renderer.getRenderTarget(),
    face = renderer.getActiveCubeFace(),
    level = renderer.getActiveMipmapLevel();
  const colour = renderer.getClearColor(new THREE.Color()),
    alpha = renderer.getClearAlpha();
  renderer.setClearColor(0x000000, 0);
  for (let part = 0; part < parts; part++) {
    renderer.setRenderTarget(target, part);
    renderer.clear(true, false, false);
  }
  renderer.setClearColor(colour, alpha);
  renderer.setRenderTarget(was, face, level);
}

/** A cube map of four channels, `size` texels a face, all nothing, with its mip levels: for `packCube`. */
export function cubeOf(renderer: THREE.WebGLRenderer, size: number): THREE.WebGLCubeRenderTarget {
  const target = new THREE.WebGLCubeRenderTarget(size, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    colorSpace: THREE.NoColorSpace,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
  });
  blank(renderer, target, 6);
  return target;
}

/** Six faces of a one-channel map (in a cube map's order), into one channel (0 red to 3 alpha) of a packed cube: a face a frame. */
export async function packCube(
  renderer: THREE.WebGLRenderer,
  target: THREE.WebGLCubeRenderTarget,
  faces: ImageBitmap[],
  channel: number,
): Promise<void> {
  for (const [i, face] of faces.entries())
    await copyIn(renderer, target, i, face, target.width, target.height, channel, i === faces.length - 1);
}

/** An array of one-channel maps, each layer `size` texels square, all nothing, with its mip levels: for `packLayer`. */
export function layersOf(renderer: THREE.WebGLRenderer, size: number, layers: number): THREE.WebGLArrayRenderTarget {
  const target = new THREE.WebGLArrayRenderTarget(size, size, layers, {
    format: THREE.RedFormat,
    type: THREE.UnsignedByteType,
    colorSpace: THREE.NoColorSpace,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
  });
  target.texture.wrapS = target.texture.wrapT = THREE.ClampToEdgeWrapping;
  target.texture.anisotropy = 8; // seen edge-on from low down; three keeps it to what the GPU allows
  blank(renderer, target, layers);
  return target;
}

/**
 * A one-channel map into a layer, at its own size (or smaller to fit, each way alike) in the layer's corner (the rest of the layer stays nothing).
 * Returns the share of the layer it takes each way: what its own texture coordinates are multiplied by.
 */
export async function packLayer(
  renderer: THREE.WebGLRenderer,
  target: THREE.WebGLArrayRenderTarget,
  layer: number,
  bitmap: ImageBitmap,
): Promise<[number, number]> {
  // (one larger than the layer goes in filtered at the size that fits it, each way alike: a browser that would not resize it)
  const fit = Math.min(1, target.width / bitmap.width, target.height / bitmap.height);
  const width = Math.round(bitmap.width * fit),
    height = Math.round(bitmap.height * fit);
  await copyIn(renderer, target, layer, bitmap, width, height, 0, true);
  return [width / target.width, height / target.height];
}

/**
 * A cube map of colours from six pictures (sRGB, in a cube map's order), with its mip levels, copied in a piece a
 * frame: for the globe's land, which arrives after the first view. Resolves when all of it is in.
 */
export async function colourCube(renderer: THREE.WebGLRenderer, faces: ImageBitmap[]): Promise<THREE.CubeTexture> {
  const size = faces[0]!.width;
  const target = colourCubeOf(size);
  for (const [i, face] of faces.entries()) await copyIn(renderer, target, i, face, size, size, null, i === faces.length - 1);
  return target.texture;
}

/** A cube map of colours (sRGB), `size` texels a face, with its mip levels: for `colourCube`, or to be filled a face at a time by `packFace`. */
export function colourCubeOf(size: number): THREE.WebGLCubeRenderTarget {
  return new THREE.WebGLCubeRenderTarget(size, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    colorSpace: THREE.SRGBColorSpace,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
  });
}

/**
 * One face of a cube, by itself: a one-channel map into `channel` of a packed cube, or with `channel` null a picture's
 * colours into a cube of colours; `last` makes the mip levels after it. For whoever cannot hold six decoded faces at
 * once (the lighter tier, tier.ts): each is decoded, copied in and let go before the next is fetched.
 */
export function packFace(
  renderer: THREE.WebGLRenderer,
  target: THREE.WebGLCubeRenderTarget,
  face: number,
  bitmap: ImageBitmap,
  channel: number | null,
  last: boolean,
): Promise<void> {
  return copyIn(renderer, target, face, bitmap, target.width, target.height, channel, last);
}

/** A flat map of colours from a picture (sRGB), with its mip levels, copied in a piece a frame. */
export async function colourMap(renderer: THREE.WebGLRenderer, bitmap: ImageBitmap): Promise<THREE.Texture> {
  const { width, height } = bitmap;
  const target = new THREE.WebGLRenderTarget(width, height, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    colorSpace: THREE.SRGBColorSpace,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
  });
  target.texture.wrapS = target.texture.wrapT = THREE.ClampToEdgeWrapping;
  target.texture.anisotropy = 8;
  await copyIn(renderer, target, 0, bitmap, width, height, null, true);
  return target.texture;
}

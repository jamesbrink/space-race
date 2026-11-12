import type * as THREE from 'three';
import { tier } from './tier.ts';

/**
 * A model's pictures at the size the tier allows (tier.ts), before any is sent to the GPU. A cabin's
 * main panel is 4096 texels square: 85 MiB with its mip levels, and as much again decoded on the
 * page's side, for a picture a phone's screen is a third as wide as. On the lighter tier a picture
 * of `pictureOver` texels a side or more is made again at `pictureScale` (the browser's best
 * resampling, off the page's thread) and the first is let go. On the full tier nothing is touched.
 */
export async function fitPictures(root: THREE.Object3D): Promise<void> {
  const { pictureScale: scale, pictureOver: over } = tier();
  if (scale >= 1) return;
  const found = new Set<THREE.Texture>();
  root.traverse((o) => {
    const worn = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    for (const m of worn ? (Array.isArray(worn) ? worn : [worn]) : [])
      for (const v of Object.values(m)) {
        const t = v as THREE.Texture | null;
        const image = t?.isTexture ? (t.image as { width?: number; height?: number } | null) : null;
        if (t && image?.width && image.height && Math.max(image.width, image.height) >= over) found.add(t);
      }
  });
  // (several textures may be one picture: it is made again once)
  const made = new Map<unknown, Promise<ImageBitmap | HTMLCanvasElement>>();
  await Promise.all(
    [...found].map(async (t) => {
      const image = t.image as ImageBitmap | HTMLImageElement;
      let smaller = made.get(image);
      if (!smaller) {
        smaller = resized(image, Math.max(1, Math.round(image.width * scale)), Math.max(1, Math.round(image.height * scale)));
        made.set(image, smaller);
      }
      t.image = await smaller;
      t.needsUpdate = true;
    }),
  );
  for (const image of made.keys()) (image as Partial<ImageBitmap>).close?.();
}

/**
 * A model's triangles listed in two bytes a corner where the mesh has few enough vertices for that (the decoder hands
 * every list over in four): the same triangles in half the memory, on the GPU and on the page's side. Lighter tier only.
 */
export function fitIndices(root: THREE.Object3D): void {
  if (!tier().shortIndices) return;
  const done = new Set<THREE.BufferGeometry>();
  root.traverse((o) => {
    const geometry = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    const index = geometry?.index;
    if (!geometry || !index || done.has(geometry)) return;
    done.add(geometry);
    const position = geometry.getAttribute('position');
    if (!(index.array instanceof Uint32Array) || !position || position.count > 65535) return;
    const short = new Uint16Array(index.array);
    geometry.setIndex(new (index.constructor as typeof THREE.BufferAttribute)(short, 1));
  });
}

async function resized(image: ImageBitmap | HTMLImageElement, width: number, height: number): Promise<ImageBitmap | HTMLCanvasElement> {
  try {
    const bitmap = await createImageBitmap(image, {
      resizeWidth: width,
      resizeHeight: height,
      resizeQuality: 'high',
      premultiplyAlpha: 'none',
      colorSpaceConversion: 'none',
    });
    if (bitmap.width === width && bitmap.height === height) return bitmap;
    bitmap.close(); // (a browser that takes the call and not the size)
  } catch {
    // no resizing bitmaps here: drawn smaller instead
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, width, height);
  return canvas;
}

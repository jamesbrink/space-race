import * as THREE from 'three';
import { drawn, type Joined, join, type Piece } from './merge.ts';

/**
 * What the Lineup has fetched, each file once (lineup/scene.ts). Two vehicles may stand on the same file: two flights
 * pointing at one GLB (a booster model shared between flights), or two files that are the same bytes (Vostok 3 to 6
 * were built alike, and their middle and coarsest levels are one file four times over). A file is known by its bytes
 * (`keyOf`), so either way it is fetched, decoded, joined (merge.ts) and sent to the GPU once, and every vehicle on it
 * draws the one copy: its geometry and its pictures are shared, its materials are each vehicle's own (a change of look
 * or of level is one vehicle's, and so is letting its materials go). What is shared is let go when the last vehicle on
 * it lets it go. The bytes themselves are let go once joined: a level asked for again after that is fetched again
 * (from the browser's cache).
 */

/** A level as the shelf hands it to a vehicle: its own drawing of it, and what was found out about the file. */
export interface Taken {
  root: THREE.Object3D;
  /** The spacecraft's top-level nodes, as `craft` found them on this level (null: none). */
  craft: string[] | null;
  /** What the level took before it was joined, bytes. */
  raw: number;
}

interface Made {
  joined: Joined;
  craft: string[] | null;
  raw: number;
}

/** Bytes of a file, known by what they are: a hash of them, two ways round, and their length. */
export function keyOf(bytes: ArrayBuffer): string {
  const data = new Uint8Array(bytes);
  // FNV-1a, and the same with another basis read from the other end: 64 bits that two different GLBs will not share
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ data.length;
  for (let i = 0, j = data.length - 1; i < data.length; i++, j--) {
    a = Math.imul(a ^ data[i]!, 0x01000193);
    b = Math.imul(b ^ data[j]!, 0x01000193);
  }
  return `${(a >>> 0).toString(16)}${(b >>> 0).toString(16)}-${data.length}`;
}

/** Every picture a material wears. */
export function* picturesOf(material: THREE.Material): Generator<THREE.Texture> {
  for (const value of Object.values(material)) if ((value as THREE.Texture | null)?.isTexture) yield value as THREE.Texture;
}

/** What the meshes under `root` take as buffers and pictures, bytes, each once, whether drawn or not. */
export function rawBytes(root: THREE.Object3D): number {
  const seen = new Set<unknown>();
  let bytes = 0;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.geometry) return;
    if (!seen.has(mesh.geometry)) {
      seen.add(mesh.geometry);
      for (const a of Object.values(mesh.geometry.attributes)) bytes += (a as THREE.BufferAttribute).array?.byteLength ?? 0;
      bytes += mesh.geometry.index?.array.byteLength ?? 0;
    }
    for (const m of mesh.material ? [mesh.material].flat() : [])
      for (const picture of picturesOf(m)) {
        const image = picture.image as { width?: number; height?: number } | null;
        if (!image?.width || !image.height || seen.has(image)) continue;
        seen.add(image);
        bytes += (image.width * image.height * 4 * 4) / 3;
      }
  });
  return bytes;
}

/** Let go of materials, and of their pictures if `pictures`. */
function letGo(materials: Iterable<THREE.Material>, pictures: boolean): void {
  for (const m of materials) {
    if (pictures)
      for (const picture of picturesOf(m)) {
        picture.dispose();
        (picture.image as Partial<ImageBitmap> | null)?.close?.();
      }
    m.dispose();
  }
}

function materialsOf(root: THREE.Object3D): Set<THREE.Material> {
  const out = new Set<THREE.Material>();
  root.traverse((o) => {
    const worn = (o as THREE.Mesh).material;
    for (const m of worn ? [worn].flat() : []) out.add(m);
  });
  return out;
}

/** What a joined level keeps of the level it was joined from: the materials of its own pieces, which hold their pictures. */
function keptOf(joined: Joined): Set<THREE.Material> {
  const out = new Set<THREE.Material>();
  for (const p of joined.pieces) {
    if (p.material) out.add(p.material);
    if (p.object) for (const m of materialsOf(p.object)) out.add(m);
  }
  return out;
}

/** Coarse paint pieces can be identical across different files. Match the encoded corners,
 * their winding and their paint table before sharing the buffers (and instancing their draws). */
class PaintBuffers {
  private readonly buckets = new Map<string, Map<THREE.BufferGeometry, number>>();
  private readonly keys = new Map<THREE.BufferGeometry, string>();

  take(piece: Piece): void {
    const g = piece.geometry;
    // joinPaint always writes normalized short positions, signed byte normals, byte paint and an index.
    const arrays = (geometry: THREE.BufferGeometry) => [
      geometry.index!.array,
      geometry.getAttribute('position').array,
      geometry.getAttribute('normal').array,
      geometry.getAttribute('paint').array,
    ];
    const data = arrays(g);
    const key = JSON.stringify([piece.paints, ...data.map((a) => a.length)]);
    const bucket = this.buckets.get(key) ?? new Map<THREE.BufferGeometry, number>();
    for (const [held, users] of bucket) {
      if (arrays(held).every((a, i) => a.constructor === data[i]!.constructor && a.every((value, j) => value === data[i]![j]))) {
        bucket.set(held, users + 1);
        piece.geometry = held;
        g.dispose();
        return;
      }
    }
    bucket.set(g, 1);
    this.buckets.set(key, bucket);
    this.keys.set(g, key);
  }

  give(g: THREE.BufferGeometry): void {
    const key = this.keys.get(g);
    if (key !== undefined) {
      const bucket = this.buckets.get(key)!;
      const remaining = bucket.get(g)! - 1;
      if (remaining) {
        bucket.set(g, remaining);
        return;
      }
      bucket.delete(g);
      if (!bucket.size) this.buckets.delete(key);
      this.keys.delete(g);
    }
    g.dispose();
  }
}

export class Shelf {
  private readonly paint = new PaintBuffers();
  /** Each URL's bytes on their way (only while they are: then their key is known and they are let go). */
  private readonly fetching = new Map<string, Promise<{ key: string; bytes: ArrayBuffer }>>();
  /** Each URL's key, once its bytes have been seen. */
  private readonly keys = new Map<string, string>();
  private readonly made = new Map<string, { made: Promise<Made>; users: number }>();
  private readonly loader = new THREE.FileLoader().setResponseType('arraybuffer');
  private readonly parse: (bytes: ArrayBuffer, url: string) => Promise<THREE.Object3D>;

  /** `parse`: the bytes of a GLB made a scene, its pictures fitted and its glass dressed (scene.ts). */
  constructor(parse: (bytes: ArrayBuffer, url: string) => Promise<THREE.Object3D>) {
    this.parse = parse;
  }

  private bytesOf(url: string, onProgress?: (loaded: number, total: number) => void): Promise<{ key: string; bytes: ArrayBuffer }> {
    let on = this.fetching.get(url);
    if (!on) {
      on = (this.loader.loadAsync(url, (e) => onProgress?.(e.loaded, e.total)) as Promise<ArrayBuffer>).then((bytes) => {
        const key = keyOf(bytes);
        this.keys.set(url, key);
        return { key, bytes };
      });
      on.finally(() => this.fetching.delete(url)).catch(() => {});
      this.fetching.set(url, on);
    }
    return on;
  }

  /**
   * A level, for one vehicle: `url` its file; `byPart` joined part by part (the finest) or as few pieces as can be;
   * `craft` how its spacecraft is told apart on a level, and `key` what that is told from (the vehicle's headings: two
   * vehicles on one file with different headings are joined apart), and `beside` the nodes of what its spacecraft flew
   * to meet, joined apart from both. Every `take` is matched by a `give`.
   */
  async take(
    url: string,
    byPart: boolean,
    craft: { key: string; of: (root: THREE.Object3D) => string[] | null; beside?: readonly string[] },
    onProgress?: (loaded: number, total: number) => void,
  ): Promise<Taken> {
    const madeKey = (file: string): string => `${file}|${byPart ? 'parts' : 'whole'}|${craft.key}`;
    let file = this.keys.get(url);
    let held = file ? this.made.get(madeKey(file)) : undefined;
    if (!held) {
      const { key, bytes } = await this.bytesOf(url, onProgress);
      file = key;
      // (asked for meanwhile, by another vehicle on the same bytes: one is made)
      held = this.made.get(madeKey(key));
      if (!held) {
        const made = this.parse(bytes, url).then((level): Made => {
          const nodes = craft.of(level);
          const raw = rawBytes(level);
          const joined = join(level, nodes, byPart, craft.beside);
          if (!byPart) for (const piece of joined.pieces) if (piece.paints) this.paint.take(piece);
          // (what was joined was never sent to the GPU: its geometry and materials go, but for what its own pieces keep)
          const kept = keptOf(joined);
          const keptGeometry = new Set(joined.pieces.filter((p) => p.object).map((p) => p.geometry));
          level.traverse((o) => {
            const g = (o as THREE.Mesh).geometry;
            if (g && !keptGeometry.has(g)) g.dispose();
          });
          letGo(
            [...materialsOf(level)].filter((m) => !kept.has(m)),
            false,
          );
          return { joined, craft: nodes, raw };
        });
        held = { made, users: 0 };
        this.made.set(madeKey(key), held);
        made.catch(() => this.made.delete(madeKey(key)));
      }
    }
    held.users++;
    let made: Made;
    try {
      made = await held.made;
    } catch (e) {
      held.users--;
      throw e;
    }
    const root = drawn(made.joined);
    root.userData.shelf = madeKey(file!);
    return { root, craft: made.craft, raw: made.raw };
  }

  /** A vehicle has let a level go (the looks have let go of its twins first): its materials, and the level itself if nobody else has it. */
  give(root: THREE.Object3D): void {
    const key = root.userData.shelf as string | undefined;
    letGo(materialsOf(root), false);
    root.removeFromParent();
    const held = key ? this.made.get(key) : undefined;
    if (!held || --held.users > 0) return;
    this.made.delete(key!);
    void held.made.then((made) => {
      for (const piece of made.joined.pieces) this.paint.give(piece.geometry);
      letGo(keptOf(made.joined), true);
    });
  }

  /** How many levels are held, and of how many files: for tests. */
  get counts(): { levels: number; files: number } {
    return { levels: this.made.size, files: new Set([...this.made.keys()].map((k) => k.split('|')[0])).size };
  }
}

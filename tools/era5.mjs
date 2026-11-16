// ECMWF's ERA5 reanalysis as the tools read it: the public ARCO-ERA5 copy Google keeps (gs://gcp-public-data-arco-era5,
// a quarter of a degree, hourly from 1940), a Zarr store of Blosc-compressed chunks of little-endian floats. A
// single-level field at an hour is one chunk of 721 x 1440 (rows from the north pole, columns from Greenwich eastward);
// a pressure-level field one chunk of 37 levels of that. tools/front-earth.mjs reads whole fields; tools/era5-aloft.mjs
// reads only the Blosc blocks that hold the few cells round a place, by HTTP ranges, so a profile costs megabytes, not
// the 85 MB a level field is whole. Everything read is cached (fetched once, never committed).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const ARCO = 'https://storage.googleapis.com/gcp-public-data-arco-era5/ar/full_37-1h-0p25deg-chunk-1.zarr-v3';
export const ROWS = 721;
export const COLS = 1440;
/** A generic client name: nothing about whoever runs a tool is sent. */
const HEADERS = { 'User-Agent': 'ephemeris-bake' };

/** An LZ4 block, decompressed to `size` bytes. */
export function lz4(src, size) {
  const dst = Buffer.alloc(size);
  let s = 0,
    d = 0;
  while (s < src.length) {
    const token = src[s++];
    let literals = token >> 4;
    if (literals === 15) for (let b = 255; b === 255; ) literals += b = src[s++];
    src.copy(dst, d, s, s + literals);
    s += literals;
    d += literals;
    if (s >= src.length) break;
    const offset = src[s] | (src[s + 1] << 8);
    s += 2;
    let match = token & 15;
    if (match === 15) for (let b = 255; b === 255; ) match += b = src[s++];
    match += 4;
    for (let k = 0; k < match; k++, d++) dst[d] = dst[d - offset];
  }
  if (d !== size) throw new Error(`LZ4: ${d} bytes, not ${size}`);
  return dst;
}

/**
 * One block of a Blosc 1 chunk (LZ4, bytes shuffled), decompressed: `buf` holds the block's compressed bytes from its
 * start, `size` is its length decompressed. A full block is kept as one stream for each byte of the type; a short one
 * (the last) as a single stream.
 */
export function unbloscBlock(buf, { flags, typesize, blocksize }, size) {
  const streams = !(flags & 16) && typesize <= 16 && blocksize / typesize >= 128 && size === blocksize ? typesize : 1;
  const each = size / streams;
  const block = Buffer.alloc(size);
  let at = 0;
  for (let k = 0; k < streams; k++) {
    const c = buf.readUInt32LE(at);
    at += 4;
    if (c === each) buf.copy(block, k * each, at, at + c);
    else lz4(buf.subarray(at, at + c), each).copy(block, k * each);
    at += c;
  }
  if (!(flags & 1)) return block;
  // unshuffle: the block holds every value's first byte, then every value's second, and so on
  const out = Buffer.alloc(size);
  const n = Math.floor(size / typesize);
  for (let k = 0; k < typesize; k++) for (let i = 0; i < n; i++) out[i * typesize + k] = block[k * n + i];
  block.copy(out, n * typesize, n * typesize);
  return out;
}

/** A Blosc chunk's header: its flags, the size of its type, its bytes decompressed and compressed, its blocks' size. */
export function bloscHeader(buf) {
  const flags = buf[2];
  if (flags >> 5 !== 1) throw new Error('not LZ4 inside Blosc');
  return { flags, typesize: buf[3], nbytes: buf.readUInt32LE(4), blocksize: buf.readUInt32LE(8), cbytes: buf.readUInt32LE(12) };
}

/** A whole Blosc 1 chunk of little-endian floats, as Zarr keeps one: the floats. */
export function unblosc(buf) {
  const h = bloscHeader(buf);
  const out = Buffer.alloc(h.nbytes);
  if (h.flags & 2) buf.copy(out, 0, 16, 16 + h.nbytes);
  else {
    const blocks = Math.ceil(h.nbytes / h.blocksize);
    for (let b = 0; b < blocks; b++) {
      const size = Math.min(h.blocksize, h.nbytes - b * h.blocksize);
      unbloscBlock(buf.subarray(buf.readUInt32LE(16 + 4 * b)), h, size).copy(out, b * h.blocksize);
    }
  }
  return new Float32Array(out.buffer, out.byteOffset, h.nbytes / 4);
}

/** Bytes `from` to `to` (exclusive) of a URL, by an HTTP range, cached under `file`. */
async function range(cache, file, url, from, to) {
  const path = join(cache, file);
  if (existsSync(path)) return readFileSync(path);
  mkdirSync(cache, { recursive: true });
  const res = await fetch(url, { headers: { ...HEADERS, Range: `bytes=${from}-${to - 1}` } });
  if (res.status !== 206 && res.status !== 200) throw new Error(`${url} ${from}-${to}: ${res.status}`);
  let buf = Buffer.from(await res.arrayBuffer());
  if (res.status === 200) buf = buf.subarray(from, to);
  writeFileSync(path, buf);
  return buf;
}

/** The hour of ERA5 nearest an instant (ISO 8601): hours since 1900-01-01 00:00 UTC, and that hour as ISO. */
export function hourOf(iso) {
  const hour = Math.round((Date.parse(iso) - Date.UTC(1900, 0, 1)) / 3_600_000);
  return { hour, at: new Date(Date.UTC(1900, 0, 1) + hour * 3_600_000).toISOString().replace('.000', '') };
}

/** The grid cells round a place and each one's weight (bilinear): rows from the north pole, columns from Greenwich. */
export function cellsRound(latitude, longitude) {
  const y = Math.min(ROWS - 1, Math.max(0, (90 - latitude) * 4));
  const x = ((((longitude % 360) + 360) % 360) * 4) % COLS;
  const j = Math.min(ROWS - 2, Math.floor(y));
  const i = Math.floor(x);
  const [fy, fx] = [y - j, x - i];
  const i1 = (i + 1) % COLS;
  return [
    [j, i, (1 - fy) * (1 - fx)],
    [j, i1, (1 - fy) * fx],
    [j + 1, i, fy * (1 - fx)],
    [j + 1, i1, fy * fx],
  ];
}

/**
 * A field of ERA5 at an hour, at a place, between its four cells round it: one value for a single-level field, one a
 * level (`levels`, 37, from 1 hPa down to 1000 hPa) for a pressure-level one. Only the Blosc blocks that hold those cells
 * are fetched, by range.
 */
export async function fieldAt(cache, name, hour, latitude, longitude, levels = 0) {
  const key = `${ARCO}/${name}/${hour}.0.0${levels ? '.0' : ''}`;
  const tag = `${name}.${hour}${levels ? '.l' : ''}`;
  const head = await range(cache, `${tag}.head`, key, 0, 16);
  const h = bloscHeader(head);
  if (h.flags & 2) throw new Error(`${name}: a chunk kept as it is, not read by blocks`);
  const blocks = Math.ceil(h.nbytes / h.blocksize);
  const starts = await range(cache, `${tag}.starts`, key, 16, 16 + 4 * blocks);
  const startOf = (b) => (b < blocks ? starts.readUInt32LE(4 * b) : h.cbytes);
  const decoded = new Map();
  const block = async (b) => {
    if (!decoded.has(b)) {
      const size = Math.min(h.blocksize, h.nbytes - b * h.blocksize);
      const raw = await range(cache, `${tag}.b${b}`, key, startOf(b), startOf(b + 1));
      decoded.set(b, unbloscBlock(raw, h, size));
    }
    return decoded.get(b);
  };
  const cells = cellsRound(latitude, longitude);
  const out = [];
  for (let l = 0; l < Math.max(1, levels); l++) {
    let sum = 0;
    for (const [j, i, w] of cells) {
      const byte = ((l * ROWS + j) * COLS + i) * 4;
      const b = Math.floor(byte / h.blocksize);
      sum += w * (await block(b)).readFloatLE(byte - b * h.blocksize);
    }
    out.push(sum);
  }
  return levels ? out : out[0];
}

/** ERA5's 37 pressure levels, hPa, in the store's order (its `level` coordinate). */
export async function pressureLevels(cache) {
  const path = join(cache, 'level.0');
  if (!existsSync(path)) {
    mkdirSync(cache, { recursive: true });
    const res = await fetch(`${ARCO}/level/0`, { headers: HEADERS });
    if (!res.ok) throw new Error(`level: ${res.status}`);
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  }
  const buf = readFileSync(path);
  const h = bloscHeader(buf);
  const raw = h.flags & 2 ? buf.subarray(16, 16 + h.nbytes) : unbloscBlock(buf.subarray(buf.readUInt32LE(16)), h, h.nbytes);
  return Array.from({ length: h.nbytes / 8 }, (_, k) => Number(raw.readBigInt64LE(8 * k)));
}

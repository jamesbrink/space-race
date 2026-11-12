// A one-channel 8-bit PNG (and a three-channel one, writeRgbPng), written without a library: each row filtered by whichever of Sub or Up
// leaves it smaller (a distance field is smooth both ways), then deflated.
import { writeFileSync } from 'node:fs';
import { crc32, deflateSync, inflateSync } from 'node:zlib';

/** Write `data` (width * height bytes, rows top first) to `path` as a greyscale PNG. */
export function writeGreyPng(path, data, width, height) {
  const raw = Buffer.alloc((width + 1) * height);
  for (let j = 0; j < height; j++) {
    const row = j * (width + 1);
    const at = j * width;
    let sub = 0,
      up = 0;
    for (let i = 0; i < width; i++) {
      const v = data[at + i];
      sub += Math.abs(((v - (i ? data[at + i - 1] : 0)) << 24) >> 24);
      up += Math.abs(((v - (j ? data[at - width + i] : 0)) << 24) >> 24);
    }
    raw[row] = sub <= up ? 1 : 2;
    for (let i = 0; i < width; i++) {
      const v = data[at + i];
      const prior = sub <= up ? (i ? data[at + i - 1] : 0) : j ? data[at - width + i] : 0;
      raw[row + 1 + i] = (v - prior) & 255;
    }
  }
  const chunk = (type, body) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(body.length);
    const tb = Buffer.concat([Buffer.from(type, 'ascii'), body]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(tb));
    return Buffer.concat([len, tb, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bits
  ihdr[9] = 0; // greyscale
  writeFileSync(
    path,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
}

/** Write `data` (width * height * 3 bytes: red, green, blue; or 4 with `channels`, alpha last; rows top first) to `path` as an 8-bit colour PNG, filtered as writeGreyPng's is. */
export function writeRgbPng(path, data, width, height, channels = 3) {
  const stride = width * channels;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let j = 0; j < height; j++) {
    const row = j * (stride + 1);
    const at = j * stride;
    let sub = 0,
      up = 0;
    for (let i = 0; i < stride; i++) {
      const v = data[at + i];
      sub += Math.abs(((v - (i >= channels ? data[at + i - channels] : 0)) << 24) >> 24);
      up += Math.abs(((v - (j ? data[at - stride + i] : 0)) << 24) >> 24);
    }
    raw[row] = sub <= up ? 1 : 2;
    for (let i = 0; i < stride; i++) {
      const prior = sub <= up ? (i >= channels ? data[at + i - channels] : 0) : j ? data[at - stride + i] : 0;
      raw[row + 1 + i] = (data[at + i] - prior) & 255;
    }
  }
  const chunk = (type, body) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(body.length);
    const tb = Buffer.concat([Buffer.from(type, 'ascii'), body]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(tb));
    return Buffer.concat([len, tb, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bits
  ihdr[9] = channels === 4 ? 6 : 2; // colour, or colour with alpha
  writeFileSync(
    path,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
}

/** Read a PNG that writeGreyPng wrote (8-bit greyscale, not interlaced): its bytes, rows top first. */
export function readGreyPng(buffer) {
  const width = buffer.readUInt32BE(16),
    height = buffer.readUInt32BE(20);
  if (buffer[24] !== 8 || buffer[25] !== 0) throw new Error('not an 8-bit greyscale PNG');
  const idat = [];
  for (let at = 8; at < buffer.length; ) {
    const len = buffer.readUInt32BE(at);
    const type = buffer.toString('ascii', at + 4, at + 8);
    if (type === 'IDAT') idat.push(buffer.subarray(at + 8, at + 8 + len));
    at += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const data = new Uint8Array(width * height);
  for (let j = 0; j < height; j++) {
    const f = raw[j * (width + 1)];
    for (let i = 0; i < width; i++) {
      const x = raw[j * (width + 1) + 1 + i];
      const a = i ? data[j * width + i - 1] : 0;
      const b = j ? data[(j - 1) * width + i] : 0;
      const c = i && j ? data[(j - 1) * width + i - 1] : 0;
      const p = a + b - c,
        pa = Math.abs(p - a),
        pb = Math.abs(p - b),
        pc = Math.abs(p - c);
      const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f];
      data[j * width + i] = (x + pred) & 255;
    }
  }
  return { width, height, data };
}

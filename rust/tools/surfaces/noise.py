"""Repeatable tileable fields for the native material bakes. Colours below are sRGB paint chips."""

import struct
import zlib

import numpy as np


class Tile:
    def __init__(self, width, height, seed=17):
        self.rng = np.random.default_rng(seed)
        self.w, self.h = width, height
        self.u = (np.arange(width, dtype=np.float32)[None, :] + 0.5) / width
        # v grows upwards in Blender. PNG rows and glTF V run down the picture.
        self.v = 1 - (np.arange(height, dtype=np.float32)[:, None] + 0.5) / height

    def noise(self, across, up):
        """Smooth interpolation on a wrapping lattice, centred on zero."""
        grid = self.rng.uniform(-1, 1, (up, across)).astype(np.float32)
        x, y = self.u * across, self.v * up
        i, j = x.astype(int), y.astype(int)
        a, b = ease(x - i), ease(y - j)
        i, j = i % across, j % up
        k, m = (i + 1) % across, (j + 1) % up
        return mix(mix(grid[j, i], grid[j, k], a), mix(grid[m, i], grid[m, k], a), b).astype(np.float32)

    def grain(self):
        return self.rng.uniform(-1, 1, (self.h, self.w)).astype(np.float32)


def ease(x):
    t = np.clip(x, 0, 1)
    return t * t * (3 - 2 * t)


def mix(a, b, t):
    return a + (b - a) * t


def pigment(a, b, t):
    return mix(np.array(a), np.array(b), np.asarray(t)[..., None])


def channels(*values):
    return np.stack(np.broadcast_arrays(*values), axis=-1)


def normal_map(height, strength):
    """Finite differences in the tangent frame. Image rows increase toward negative Blender V."""
    dx = np.roll(height, 1, axis=1) - np.roll(height, -1, axis=1)
    dy = np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)
    n = channels(dx * strength, dy * strength, 1)
    return 127.5 * (1 + n / np.linalg.norm(n, axis=-1, keepdims=True))


def png(pixels):
    """Lossless byte buffer for a GLB image. Sub filtering keeps slow pigment gradients small."""
    a = np.ascontiguousarray(np.clip(pixels, 0, 255).round(), dtype=np.uint8)
    h, w, depth = a.shape
    packed = a.copy()
    packed[:, 1:] -= a[:, :-1]
    rows = np.concatenate((np.ones((h, 1), dtype=np.uint8), packed.reshape(h, -1)), axis=1)

    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))

    header = struct.pack(">2I5B", w, h, 8, {3: 2, 4: 6}[depth], 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(rows.tobytes(), 6)) + chunk(b"IEND", b"")


def maps(rgb, rough, metal, height, strength, alpha=None):
    if alpha is not None:
        rgb = channels(*np.moveaxis(rgb, -1, 0), alpha * 255)
    return {
        "colour": png(rgb),
        "response": png(channels(np.ones_like(height), rough, metal) * 255),
        "normal": png(normal_map(height, strength)),
    }

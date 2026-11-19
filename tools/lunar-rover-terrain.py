# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy>=2", "tifffile>=2024.9"]
# ///
"""uv run --script tools/lunar-rover-terrain.py. LROC NAC stereo terrain near each LM, LOLA beyond the footprint."""

import json
import subprocess
from pathlib import Path

import numpy as np
import tifffile

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path.home() / ".cache/space-race/moon"
CONFIG = json.loads((ROOT / "src/world/lunar-rover-sites.json").read_text())
RADIUS = 1_737_400  # m, sphere in the PDS map labels


def source(path, url):
    if not path.is_file():
        path.parent.mkdir(parents=True, exist_ok=True)
        temp = path.with_suffix(".download")
        subprocess.run(["curl", "--fail", "--location", "--retry", "2", "--output", str(temp), url], check=True)
        temp.replace(path)
    return path


def interpolate(data, x, y, fallback):
    """Bilinear sampling at pixel centres. Use the altimeter where the stereo mosaic has no data."""
    h, w = data.shape
    i, j = np.floor(x).astype(int), np.floor(y).astype(int)
    valid = (i >= 0) & (j >= 0) & (i < w - 1) & (j < h - 1)
    fx, fy = x - i, y - j
    i, j = np.clip(i, 0, w - 2), np.clip(j, 0, h - 2)
    a, b, c, d = data[j, i], data[j, i + 1], data[j + 1, i], data[j + 1, i + 1]
    valid &= np.minimum(np.minimum(a, b), np.minimum(c, d)) > -1e6
    return np.where(valid, (1 - fy) * (a * (1 - fx) + b * fx) + fy * (c * (1 - fx) + d * fx), fallback)


def read_stereo(area):
    product = f"NAC_DTM_{area}"
    url = f"https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/DATA/SDP/NAC_DTM/{area}/{product}.TIF"
    with tifffile.TiffFile(source(CACHE / "apollo-dtm" / f"{product}.TIF", url)) as tif:
        geo = tif.geotiff_metadata
        stereo = tif.asarray()
    sx, sy, _ = geo["ModelPixelScale"]
    _, _, _, left, top, _ = geo["ModelTiepoint"]
    def sample(latitude, longitude, fallback):
        easting = RADIUS * (longitude - np.radians(geo["ProjCenterLongGeoKey"])) * np.cos(np.radians(geo["ProjStdParallel1GeoKey"]))
        return interpolate(stereo, (easting - left) / sx - 0.5, (top - RADIUS * latitude) / sy - 0.5, fallback)

    return sample


def bake(name, site, altimeter):
    products = [read_stereo(area) for area in site.get("stereo", [f"APOLLO{site['mission']}"])]
    lat, lon = np.radians(site["landing"])
    up = np.array([np.cos(lat) * np.cos(lon), np.cos(lat) * np.sin(lon), np.sin(lat)])
    east = np.array([-np.sin(lon), np.cos(lon), 0])
    north = np.cross(up, east)
    half = CONFIG["intervals"] // 2
    tiles = []
    for step in CONFIG["spacing"]:
        # The rover starts 12 m east of the LM. Viewer +X is east and +Z is south.
        x, z = np.meshgrid(np.arange(-half, half + 1) * step + 12, np.arange(-half, half + 1) * step)
        xyz = up * RADIUS + x[..., None] * east - z[..., None] * north
        unit = xyz / np.linalg.norm(xyz, axis=-1, keepdims=True)
        latitude = np.arcsin(unit[..., 2])
        longitude = np.arctan2(unit[..., 1], unit[..., 0])
        h, w = altimeter.shape
        broad = 0.5 * interpolate(altimeter, (longitude / (2 * np.pi) + 0.5) * w - 0.5, (0.5 - latitude / np.pi) * h - 0.5, np.nan) - 10_000
        height = broad
        for sample in products:
            height = sample(latitude, longitude, height)
        # Project the relief onto the local vertical, retaining the curvature of the horizon.
        local = (RADIUS + height) * (unit @ up) - RADIUS
        if step == CONFIG["spacing"][0]:
            # The flight hardware is drawn separately. Two-metre stereo pixels cannot resolve
            # the soil below its four pads. Fit a local support plane to the surrounding annulus.
            distance = np.hypot(x, z)
            rim = (distance >= 7) & (distance <= 10)
            design = np.stack([x[rim], z[rim], np.ones(np.count_nonzero(rim))], axis=1)
            a, b, c = np.linalg.lstsq(design, local[rim], rcond=None)[0]
            mix = np.clip((distance - 6.5) / 4, 0, 1)
            local = local * mix + (a * x + b * z + c) * (1 - mix)
        relative = np.rint((local - local[half, half]) * 100)
        if not np.isfinite(relative).all() or np.max(np.abs(relative)) >= 2**31:
            raise ValueError(f"Invalid terrain sample at {name}")
        tiles.append(relative.astype("<i4"))
    path = ROOT / "public/lunar" / f"{name}.terrain.bin"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(np.stack(tiles).tobytes())
    print(f"{name}: {len(tiles)} grids, origin {local[half, half]:.1f} m, {path.stat().st_size:,} bytes")


if __name__ == "__main__":
    dem = "ldem_64_uint.tif"
    lola = tifffile.memmap(source(CACHE / dem, f"https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/{dem}"))
    for key, definition in CONFIG["sites"].items():
        bake(key, definition, lola)

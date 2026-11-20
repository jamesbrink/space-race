# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy>=2", "tifffile>=2024.9"]
# ///
"""uv run --script tools/lunar-terrain.py [site ...]: each Apollo landing site's ground, from src/world/lunar-sites.json.

Two products a site, both under public/lunar/:

- <site>.terrain.bin: nested square grids round the lunar module, LROC NAC stereo terrain near it and LOLA's 64 ppd
  heights beyond the stereo's footprint (src/world/lunar-terrain.ts LunarTerrain reads them: int32 centimetres above the
  grid's centre, on the tangent plane, its curvature kept).
- <site>.descent.bin: a strip along the descent's ground track, from SLDEM2015 at 512 ppd averaged to the strip's spacing
  (src/world/lunar-ground.ts DescentStrip reads it; its format is described there and in docs/agents/world.md).

Every input is fetched once into ~/.cache/space-race/moon. Run it on a machine with ~7 GB to spare: the SLDEM2015 tiles
are 1.4 GB each.
"""

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import tifffile

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path.home() / ".cache/space-race/moon"
CONFIG = json.loads((ROOT / "src/world/lunar-sites.json").read_text())
RADIUS = CONFIG["radius"]  # m, the sphere every product's heights are above (the PDS map labels)
SLDEM = "https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/sldem2015/tiles/float_img"
NAC = "https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/DATA/SDP/NAC_DTM"


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
    with tifffile.TiffFile(source(CACHE / "apollo-dtm" / f"{product}.TIF", f"{NAC}/{area}/{product}.TIF")) as tif:
        geo = tif.geotiff_metadata
        stereo = tif.asarray()
    sx, sy, _ = geo["ModelPixelScale"]
    _, _, _, left, top, _ = geo["ModelTiepoint"]

    def sample(latitude, longitude, fallback):
        # Each product's longitudes are east from its centre (180 degrees: the far side), so a site west of the prime meridian is
        # 360 degrees round from the -180..180 a longitude is worked in here.
        offset = longitude - np.radians(geo["ProjCenterLongGeoKey"])
        offset = np.where(np.abs(offset) > np.pi, np.mod(offset + np.pi, 2 * np.pi) - np.pi, offset)
        easting = RADIUS * offset * np.cos(np.radians(geo["ProjStdParallel1GeoKey"]))
        return interpolate(stereo, (easting - left) / sx - 0.5, (top - RADIUS * latitude) / sy - 0.5, fallback)

    return sample


def frame(site):
    """The LM's vertical, east and north as unit vectors in the Moon's body frame (mean Earth/polar axis)."""
    lat, lon = np.radians(site["landing"])
    up = np.array([np.cos(lat) * np.cos(lon), np.cos(lat) * np.sin(lon), np.sin(lat)])
    east = np.array([-np.sin(lon), np.cos(lon), 0])
    return up, east, np.cross(up, east)


def selenographic(xyz):
    unit = xyz / np.linalg.norm(xyz, axis=-1, keepdims=True)
    return unit, np.arcsin(unit[..., 2]), np.arctan2(unit[..., 1], unit[..., 0])


def bake(name, site, altimeter):
    """The nested grids. Unchanged from the rover's bake (tools/lunar-rover-terrain.py) but for where they are centred."""
    products = [read_stereo(area) for area in site["stereo"]]
    up, east, north = frame(site)
    half = CONFIG["intervals"] // 2
    tiles = []
    for step in CONFIG["spacing"]:
        # The grids are centred `centre` metres east of the LM (where the rover was parked, at 15 to 17). +X east, +Z south.
        x, z = np.meshgrid(np.arange(-half, half + 1) * step + site["centre"], np.arange(-half, half + 1) * step)
        unit, latitude, longitude = selenographic(up * RADIUS + x[..., None] * east - z[..., None] * north)
        h, w = altimeter.shape
        broad = 0.5 * interpolate(altimeter, (longitude / (2 * np.pi) + 0.5) * w - 0.5, (0.5 - latitude / np.pi) * h - 0.5, np.nan) - 10_000
        height = broad
        for sample in products:
            height = sample(latitude, longitude, height)
        # Project the relief onto the local vertical, retaining the curvature of the horizon.
        local = (RADIUS + height) * (unit @ up) - RADIUS
        if step == CONFIG["spacing"][0]:
            stereo = np.isfinite(height) & (height != broad)
            covered = stereo[np.hypot(x, z) <= 10].mean()
            # The flight hardware is drawn separately. Two-metre stereo pixels cannot resolve
            # the soil below its four pads. Fit a local support plane to the surrounding annulus.
            distance = np.hypot(x, z)
            rim = (distance >= 7) & (distance <= 10)
            design = np.stack([x[rim], z[rim], np.ones(np.count_nonzero(rim))], axis=1)
            a, b, c = np.linalg.lstsq(design, local[rim], rcond=None)[0]
            mix = np.clip((distance - 6.5) / 4, 0, 1)
            local = local * mix + (a * x + b * z + c) * (1 - mix)
            lm = c
            tilt = np.degrees(np.arctan(np.hypot(a, b)))
        relative = np.rint((local - local[half, half]) * 100)
        if not np.isfinite(relative).all() or np.max(np.abs(relative)) >= 2**31:
            raise ValueError(f"Invalid terrain sample at {name}")
        tiles.append(relative.astype("<i4"))
    path = ROOT / "public/lunar" / f"{name}.terrain.bin"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(np.stack(tiles).tobytes())
    print(
        f"{name}: {len(tiles)} grids, {path.stat().st_size:,} bytes; the ground under the LM {lm:.2f} m above {RADIUS} m "
        f"(the stereo's support plane, {tilt:.1f} deg of slope; stereo covers {100 * covered:.0f}% within 10 m), "
        f"the grid's centre {local[half, half]:.2f} m; site.height says {site['height']} m"
    )
    return lm


class Sldem:
    """SLDEM2015's 512 ppd tiles (30 degrees of latitude by 45 of longitude, float32 kilometres above 1737.4 km, pixel registered)."""

    PPD = 512

    def __init__(self):
        self.tiles = {}

    def tile(self, band, sector):
        key = (band, sector)
        if key not in self.tiles:
            south = band * 30
            north = south + 30
            west = sector * 45
            hemisphere = "s" if band < 0 else "n"  # a southern band's tiles run 30s_00s, a northern band's 00n_30n
            stem = f"sldem2015_512_{abs(south):02d}{hemisphere}_{abs(north):02d}{hemisphere}_{west:03d}_{west + 45:03d}_float.img"
            path = source(CACHE / "sldem2015" / stem, f"{SLDEM}/{stem}")
            self.tiles[key] = (np.memmap(path, dtype="<f4", mode="r", shape=(30 * self.PPD, 45 * self.PPD)), north, west)
        return self.tiles[key]

    def height(self, latitude, longitude):
        """Metres above 1737.4 km at latitudes and longitudes in degrees, bilinear between pixel centres (clamped at a tile's edge)."""
        longitude = np.mod(longitude, 360)
        band = np.floor(latitude / 30).astype(int)
        sector = np.floor(longitude / 45).astype(int)
        out = np.full(latitude.shape, np.nan)
        for b, s in set(zip(band.ravel().tolist(), sector.ravel().tolist(), strict=True)):
            data, north, west = self.tile(b, s)
            inside = (band == b) & (sector == s)
            row = (north - latitude[inside]) * self.PPD - 0.5
            col = (longitude[inside] - west) * self.PPD - 0.5
            h, w = data.shape
            i = np.clip(np.floor(col).astype(int), 0, w - 2)
            j = np.clip(np.floor(row).astype(int), 0, h - 2)
            fx = np.clip(col - i, 0, 1)
            fy = np.clip(row - j, 0, 1)
            a, b2, c, d = data[j, i], data[j, i + 1], data[j + 1, i], data[j + 1, i + 1]
            out[inside] = ((1 - fy) * (a * (1 - fx) + b2 * fx) + fy * (c * (1 - fx) + d * fx)) * 1000
        return out


MAGIC = b"SRDS"
HEADER = np.dtype([("magic", "S4"), ("version", "<u4"), ("columns", "<u4"), ("rows", "<u4"), ("values", "<f8", 7)])


def strip(name, site, sldem):
    """The descent strip: heights along and across the ground track the LM flew down to the site (src/world/lunar-ground.ts)."""
    s = CONFIG["strip"]
    up, east, north = frame(site)
    heading = np.radians(site["approach"])
    along = np.cos(heading) * north + np.sin(heading) * east  # the way the LM flew, at the LM
    right = np.cross(along, up)  # the great circle's pole: the right of the track
    spacing = s["spacing"]
    u = np.arange(-s["uprange"], s["downrange"] + spacing / 2, spacing)
    v = np.arange(-s["half"], s["half"] + spacing / 2, spacing)
    # Each cell is the mean of the 4 x 4 SLDEM samples spread over it, so that a 59 m pit or peak does not alias.
    n = s["average"]
    offsets = (np.arange(n) + 0.5) / n * spacing - spacing / 2
    total = np.zeros((len(v), len(u)))
    for du in offsets:
        for dv in offsets:
            uu, vv = np.meshgrid((u + du) / RADIUS, (v + dv) / RADIUS)
            p = (np.cos(uu)[..., None] * up + np.sin(uu)[..., None] * along) * np.cos(vv)[..., None] + np.sin(vv)[..., None] * right
            _, latitude, longitude = selenographic(p)
            total += sldem.height(np.degrees(latitude), np.degrees(longitude))
    heights = total / (n * n)
    halves = np.rint(heights * 2)
    if not np.isfinite(halves).all() or np.max(np.abs(halves)) >= 2**15:
        raise ValueError(f"Invalid strip sample at {name}")
    header = np.zeros((), HEADER)
    header["magic"], header["version"], header["columns"], header["rows"] = MAGIC, 1, len(u), len(v)
    header["values"] = [*site["landing"], site["approach"], spacing, u[0], v[0], RADIUS]
    path = ROOT / "public/lunar" / f"{name}.descent.bin"
    path.write_bytes(header.tobytes() + halves.astype("<i2").tobytes())
    at = sldem.height(np.array([site["landing"][0]]), np.array([site["landing"][1]]))[0]
    lowest, highest = heights.min(), heights.max()
    print(
        f"{name}: descent strip {len(u)} x {len(v)} at {spacing} m, {path.stat().st_size:,} bytes; SLDEM2015 at the LM {at:.1f} m, "
        f"the strip's cell there {heights[np.argmin(np.abs(v)), np.argmin(np.abs(u))]:.1f} m; {lowest:.0f} to {highest:.0f} m along it"
    )


if __name__ == "__main__":
    # [site ...] [--grids | --strips]: the sites named (every one if none), both products unless one is asked for.
    flags = {a for a in sys.argv[1:] if a.startswith("--")}
    wanted = [a for a in sys.argv[1:] if not a.startswith("--")] or list(CONFIG["sites"])
    dem = "ldem_64_uint.tif"
    lola = tifffile.memmap(source(CACHE / dem, f"https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/{dem}"))
    sldem = Sldem()
    for key in wanted:
        definition = CONFIG["sites"][key]
        if "--strips" not in flags:
            bake(key, definition, lola)
        if "--grids" not in flags:
            strip(key, definition, sldem)

"""Measured-scale (metre UVs), tileable material samples. Numerical finishes and individual marks are estimates."""

import numpy as np

from .noise import Tile, ease, maps, mix, pigment

# Kind and repeat in metres. A named material keeps its original base colour unless its surface is itself an alloy.
PROFILES = {
    "paint-structure-red": ("enamel", 2.7),
    "paint-structure-grey": ("enamel", 2.7),
    "paint-structure-white": ("enamel", 2.7),
    "tower-red": ("tower", 0.85),
    "paint-launcher-black": ("launcher", 1.6),
    "steel-scorched": ("burnt", 1.4),
    "concrete": ("slab", 6.7),
    "concrete-block-painted": ("block", 2),
    "concrete-painted": ("block", 2),
    "concrete-stained": ("stain", 1),
    "concrete-scorched": ("soot", 1),
    "steel-rail": ("rail", 1.7),
    "rubber": ("rubber", 0.32),
    "canvas-sandbag": ("canvas", 0.24),
    "canvas-cab-top": ("canvas", 0.24),
    "heatsink-beryllium": ("shield", 0.86),
    "shingle-beryllium": ("shield", 0.86),
    "chamber-liner": ("hot", 0.53),
    "graphite": ("carbon", 0.24),
    "engine-steel": ("hot", 0.53),
    "aluminium-sheet": ("sheet", 0.70),
    "fastener": ("bolt", 0.15),
    "steel": ("bolt", 0.40),
    "galvanised-steel": ("zinc", 0.44),
    "galvanised-mesh": ("zinc", 0.44),
    "galvanised-corrugated": ("zinc", 0.44),
    "galvanised-deck": ("zinc", 0.44),
}


def finish(kind, base, metal):
    size = 1024 if kind == "slab" else 256 if kind in ("bolt", "canvas", "rubber", "carbon") else 512
    t = Tile(size, size, seed=53)
    wash, grain, fleck = t.noise(5, 6), t.grain(), t.noise(44, 57)
    scratch = t.noise(8, 220)
    rgb = np.array(base) + (wash * 6 + fleck * 3 + grain * 2)[..., None]
    height, rough, alpha = grain * 0.22, 0.5 + fleck * 0.06, None
    if kind in ("enamel", "tower"):
        # In this UV layout, V=0 is the raised end of the face. Primer and the runs start there.
        joint = np.minimum(t.v, 1 - t.v)
        drips = ease((t.noise(63, 5) + 0.8 * t.noise(19, 4) - 0.33) * 3)
        rust = ease(1 - joint / (0.008 + 0.17 * drips)) * (0.25 + 0.55 * drips)
        chalk = ease(0.40 + wash * 0.54 + fleck * 0.16)
        rgb = mix(rgb, np.array([210, 192, 170]), (chalk * 0.21)[..., None])
        rgb = mix(rgb, np.array([113, 63, 42]), rust[..., None])
        rough = 0.49 + chalk * 0.23 + rust * 0.17 + 0.03 * grain
        height += rust * fleck
    elif kind == "zinc":
        # Spangle boundaries are crystal faces: each nearest seed has its own tone and roughness.
        x, y = t.u * 68, t.v * 68
        i, j = x.astype(int), y.astype(int)
        seeds = t.rng.random((68, 68, 3))
        d, crystal = np.full((size, size), 5.0), np.zeros((size, size))
        for b in (-1, 0, 1):
            for a in (-1, 0, 1):
                s = seeds[(j + b) % 68, (i + a) % 68]
                dd = (i + a + s[..., 0] - x) ** 2 + (j + b + s[..., 1] - y) ** 2
                crystal = np.where(dd < d, s[..., 2], crystal)
                d = np.minimum(d, dd)
        rgb = pigment((145, 151, 154), (185, 187, 182), crystal) + (8 * wash + grain * 2)[..., None]
        rough, metal = 0.43 + 0.21 * crystal + 0.06 * wash, 0.78
        height += crystal * 0.15
    elif kind in ("slab", "block", "soot", "stain"):
        pores = ease((fleck + 0.60 * grain - 0.92) * 4)
        vein = np.abs(t.noise(3, 4) + 0.17 * t.noise(17, 21) + 0.04 * fleck)
        crack = ease(1 - vein / 0.014) * ease((wash + 0.20) * 2) if kind == "slab" else 0
        rgb += (3 * wash + 4 * grain - 13 * pores - 37 * crack)[..., None]
        rough, height = 0.84 + 0.08 * fleck, 0.58 * grain - 0.8 * pores - crack
        if kind in ("stain", "soot"):
            r = np.hypot(2 * t.u - 1, 2 * t.v - 1)
            alpha = ease((0.91 - r + wash * 0.17 + fleck * 0.07) / 0.42) * (0.53 + 0.32 * wash)
            if kind == "stain":
                rough -= alpha * 0.37
    elif kind == "rail":
        head = ease((t.v - 0.53) / 0.07)
        rgb = pigment((94, 62, 46), (170, 174, 173), head) + (9 * wash + scratch * 9 + grain * 3)[..., None]
        rough, metal = mix(0.77, 0.28, head) + 0.06 * scratch, mix(0.24, 0.91, head)
    elif kind in ("hot", "shield", "sheet", "bolt", "burnt", "carbon", "launcher"):
        tone = wash * 0.5 + fleck * 0.14
        if kind in ("burnt", "hot"):
            rgb = pigment((71, 70, 75), (142, 105, 78), ease(tone + 0.52)) + (scratch * 6 + grain * 3)[..., None]
            metal, rough = 0.67 - 0.14 * wash, 0.53 + 0.17 * wash
        elif kind == "carbon":
            # Carbon remains matt. Ash on the exposed vane edge is grey, with no metallic heat rainbow.
            edge = ease((t.v - 0.61 + fleck * 0.07) / 0.36)
            rgb = pigment((52, 51, 50), (112, 106, 96), edge * (0.66 + 0.21 * wash))
            rgb += (2 * grain + 4 * scratch)[..., None]
            metal, rough = 0, 0.79 + 0.08 * fleck
        elif kind == "launcher":
            oil = ease((wash + 0.24 * fleck - 0.14) * 2)
            rgb = mix(rgb, np.array([39, 36, 32]), (0.57 * oil)[..., None])
            rough = 0.73 - 0.4 * oil
        else:
            rgb += (4 * scratch + 4 * wash)[..., None]
            rough = (0.31 if kind == "bolt" else 0.42) + 0.09 * scratch + 0.080 * wash
        height += scratch * 0.35
    elif kind in ("rubber", "canvas"):
        warp = np.sin(2 * np.pi * t.u * 52)
        weft = np.sin(2 * np.pi * t.v * 58)
        weave = warp * weft
        if kind == "canvas":
            rgb += (weave * 9 + wash * 6)[..., None]
            height += weave * 0.95
        rough = 0.82 + 0.07 * wash
    return maps(rgb, rough, metal, height, 0.27, alpha)

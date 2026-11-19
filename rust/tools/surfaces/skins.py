"""Unique wraps for the stack. Sources and interpretation are in the booster and spacecraft hardware notes."""

import numpy as np

from .lettering import letters
from .noise import Tile, ease, maps, mix, pigment


def booster(name, scene):
    # The whole stack shares a frame so the frost stops at the same place on a letter and on the shell.
    t = Tile(768, 2048)
    lo, hi = scene.booster
    z = lo + t.v * (hi - lo)
    az = t.u * (2 * np.pi)
    spray, tooth = t.noise(40, 18), t.grain()
    brush = t.noise(225, 15)
    sector = np.floor(t.u * 16)
    panel = np.cos(sector * 5.7 + np.floor((z - lo) / 1.19) * 4.9)
    tail = ease(1 - (z - lo) / 1.4) * (0.55 + 0.32 * spray + 0.13 * brush)
    drain = np.zeros_like(spray)
    for angle, height in scene.fills:
        distance = np.abs(np.sin((az - angle) / 2)) * 2
        below = height - z
        drain += np.exp(-(((distance + brush * 0.007) / 0.035) ** 2)) * ease(below / 0.05) * ease(1 - below / 0.9)
    dark = name == "paint-booster-black"
    base = (43, 44, 45) if dark else (223, 222, 215)
    tone = (3.8 * panel + 4.8 * spray + 2.5 * brush + tooth * 1.8)[..., None]
    rgb = pigment(base, (91, 82, 71) if not dark else (65, 57, 49), tail * 0.49 + drain * 0.40) + tone
    ink = scene.booster_ink
    if ink is None:
        scene.booster_ink = ink = letters("CenterUnit_Lettering", t, scene.booster)
    # The national legend is pigment on the structural skin, including its dry state under the ice.
    ink = ink * (0.94 + 0.03 * tooth)
    rgb = mix(rgb, np.array([152, 42, 33]), ink[..., None])
    rough = 0.43 + 0.054 * spray + 0.051 * brush + 0.04 * panel + tail * 0.20 - drain * 0.11
    alpha = None
    height = 0.22 * tooth + 0.32 * brush
    if name == "frost-lox":
        low, high = scene.frost
        # Clear at the warm ends and at ring frames. Their pitch follows the modeled tank rings.
        bond = np.minimum(z - low, high - z)
        frame = np.abs((z - scene.frame_start + scene.frame_pitch / 2) % scene.frame_pitch - scene.frame_pitch / 2)
        feather = t.noise(60, 150) * 0.025 + spray * 0.045
        margin = ease((np.minimum(bond, frame * 1.9) + feather) / 0.11)
        alpha = margin * np.clip(0.79 + 0.17 * t.noise(19, 48) + 0.10 * t.noise(96, 140) + 0.045 * tooth, 0, 1)
        height += alpha * (0.66 * tooth + 0.3 * t.noise(200, 390))
    return maps(rgb, rough, 0, height, 0.19, alpha)


def shingles(scene):
    t = Tile(2048, 768)
    # Each formed sheet has its own temper. Follow the source model's columns and station breaks.
    angle = (t.u * 360 + scene.hatch_deg) % 360
    column = np.searchsorted(scene.seams, angle, side="right")
    station = (scene.cone[0] + t.v * (scene.cone[1] - scene.cone[0])) / 0.0254
    row = np.searchsorted(scene.rows, station)
    batch = np.sin(column * 7.13 + row * 2.89)
    grain, wash, satin = t.grain(), t.noise(31, 13), t.noise(330, 21)
    tint = np.clip(0.45 + 0.27 * batch + 0.24 * wash, 0, 1)
    rgb = pigment((56, 65, 75), (80, 78, 76), tint) + (3.8 * satin + 2.5 * grain)[..., None]
    ink = letters("Afterbody_Lettering", t, scene.cone, hand=True)
    # Short stencil bridges interrupt the bowls on the upper national legend only.
    bridge = (np.abs(station - 36.3) < 0.11) & ((angle > 126) & (angle < 130))
    ink = ink * (1 - bridge) * (0.95 + 0.025 * grain)
    rgb = mix(rgb, np.array([229, 225, 211]), ink[..., None])
    rough = mix(0.34 + 0.075 * batch + 0.055 * wash + 0.04 * satin, 0.54, ink)
    return maps(rgb, rough, mix(0.61 + 0.08 * wash, 0.02, ink), 0.35 * satin + 0.2 * grain, 0.15)

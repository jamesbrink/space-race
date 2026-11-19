"""Lay UVs on existing corners after static joining. No nodes, vertices, normals or movement pivots are moved."""

import sys

import bpy
import numpy as np

from .finishes import PROFILES
from .lettering import cylinder

BOOSTER = {"frost-lox", "paint-booster-white", "paint-booster-black"}


class SkinLayout:
    def __init__(self):
        # These values belong to the flight drawing. Read them while its build script is still loaded.
        import redstone_mrlv as booster
        from srlib import IN

        flight = sys.modules["__main__"]
        base = flight.Z_BOOSTER_BASE
        self.booster = (base * IN, 0)
        self.cone = (0, flight.CONE_H * IN)
        self.hatch_deg = np.degrees(sum(flight.HATCH[:2]) / 2)
        self.rows = np.array([flight.SEAM_LOW, flight.SEAM_HIGH])
        self.seams = np.sort([a for a, _, _ in flight.COLUMNS])
        corners = np.array(bpy.data.objects["CenterUnit_Frost"].bound_box)
        self.frost = (corners[:, 2].min(), corners[:, 2].max())
        self.frame_start = (base + int(booster.S_TAIL) + 2) * IN
        self.frame_pitch = 47 * IN
        self.fills = [(np.radians(az), (base + booster.S_TAIL + h) * IN) for az, h in ((135, 180), (315, 420))]
        self.booster_ink = None


def array(collection, field, width, dtype):
    a = np.empty(len(collection) * width, dtype=dtype)
    collection.foreach_get(field, a)
    return a.reshape(-1, width) if width > 1 else a


def project(obj, mat, layout):
    mesh = obj.data
    positions = array(mesh.vertices, "co", 3, np.float32)
    starts = array(mesh.polygons, "loop_start", 1, np.int32)
    counts = array(mesh.polygons, "loop_total", 1, np.int32)
    index = array(mesh.loops, "vertex_index", 1, np.int32)
    world = np.array(obj.matrix_world)
    # Bake in the construction frame, including the initial pose of moving pieces. The UVs travel with them.
    p = (positions @ world[:3, :3].T + world[:3, 3])[index]
    if mat in BOOSTER or mat == "shingle-rene41":
        uv = cylinder(p, layout.booster if mat in BOOSTER else layout.cone)
        if "Fins" in obj.name:
            uv[:, 0] += np.maximum(0, np.hypot(p[:, 0], p[:, 1]) - 0.889) * 0.16
        # Open a cylindrical seam per face, never across a facet at the back of the vehicle.
        u = uv[:, 0]
        crosses = np.maximum.reduceat(u, starts) - np.minimum.reduceat(u, starts) > 0.5
        u += np.repeat(crosses, counts) & (u < 0.5)
    else:
        kind, scale = PROFILES[mat]
        n = array(mesh.polygons, "normal", 3, np.float32) @ np.linalg.inv(world[:3, :3])
        axis = np.repeat(np.argmax(np.abs(n), axis=1), counts)
        x, y, z = p.T
        u = np.where(axis == 0, y, x) / scale
        v = np.where(axis == 2, y, z) / scale
        if kind in ("tower", "enamel"):
            # A narrow run starts at the higher end of a member and follows gravity down its web.
            top = np.repeat(np.maximum.reduceat(z, starts), counts)
            v = np.where(axis == 2, v, (z - top) / scale)
        elif kind == "carbon":
            v = np.clip((z.max() - z) / max(0.001, np.ptp(z)), 0.002, 0.998)
            u = (x + y) / scale
        elif mat == "heatsink-beryllium":
            # Tangential tooling lines across the dish and its rolled edge.
            u = (x - y) / scale
            v = np.hypot(x, y) / scale
        elif kind == "rail":
            # Keep the contact stripe on the crown. Tie plates, fishplates and the spiked feet weather brown.
            crown = (np.repeat(n[:, 2], counts) > 0.65) & (z > np.max(z) - 0.009)
            if "Fitting" in obj.name or "Spikes" in obj.name:
                crown[:] = False
            u = y / scale
            v = np.where(crown, 0.74 + x * 0.002, 0.26 + (z - z.max()) * 0.15)
        elif kind in ("soot", "stain"):
            uv = (p[:, :2] - p[:, :2].min(axis=0)) / np.maximum(np.ptp(p[:, :2], axis=0), 0.001)
            u, v = uv.T
        uv = np.column_stack((u, v))
    mesh.uv_layers.active.uv.foreach_set("vector", np.ascontiguousarray(uv, dtype=np.float32).ravel())


def prepare():
    layout = None
    if "Afterbody_Lettering" in bpy.data.objects:
        layout = SkinLayout()
        # Keep the carrier mesh and its extents for callers. Its glyphs are now in the metal's maps;
        # only this mesh gets the transparent mask. The periscope lining also uses paint-white.
        mesh = bpy.data.objects["Afterbody_Lettering"].data
        carrier = mesh.materials[0].copy()
        carrier.name = "paint-lettering-carrier"
        mesh.materials[0] = carrier
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH" and len(obj.data.materials) == 1:
            mat = obj.data.materials[0].name
            if mat in PROFILES or mat in BOOSTER or mat == "shingle-rene41":
                project(obj, mat, layout)
    return layout

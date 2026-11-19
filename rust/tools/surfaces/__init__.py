"""Embed reproducible native hardware finishes; images are GLB-owned and need no sidecar files."""

import hashlib
import json
import struct
import tempfile
from pathlib import Path

import numpy as np

from .finishes import PROFILES, finish
from .projection import BOOSTER, prepare
from .skins import booster, shingles


def share_textures(doc):
    """Bevy loads a GPU image per glTF *texture*. Blender exports the same cabin dial atlas for every lamp."""
    originals = doc.get("textures", [])
    textures, indices = [], []
    for texture in originals:
        if texture not in textures:
            textures.append(texture)
        indices.append(textures.index(texture))

    def remap(info):
        for key, child in info.items():
            if isinstance(child, dict):
                if key.endswith("Texture") and "index" in child:
                    child["index"] = indices[child["index"]]
                else:
                    remap(child)

    for material in doc["materials"]:
        remap(material)
    if originals:
        doc["textures"] = textures


def export_finished(path, export):
    layout = prepare()
    target = Path(path)
    with tempfile.TemporaryDirectory(dir=target.parent) as staging:
        built = Path(staging) / target.name
        export(str(built))
        embed(built, layout)
        built.replace(target)


def embed(path, layout):
    glb = path.read_bytes()
    size = struct.unpack_from("<I", glb, 12)[0]
    doc = json.loads(glb[20 : 20 + size])
    share_textures(doc)
    body = bytearray(glb[28 + size :])
    cache = {}
    samplers = doc.setdefault("samplers", [])
    repeat = {"magFilter": 9729, "minFilter": 9987, "wrapS": 10497, "wrapT": 10497}
    if repeat not in samplers:
        samplers.append(repeat)
    sampler = samplers.index(repeat)

    def texture(name, data):
        digest = hashlib.sha256(data).digest()
        if digest not in cache:
            start = len(body)
            body.extend(data)
            body.extend(bytes(-len(body) % 4))
            views = doc["bufferViews"]
            views.append({"buffer": 0, "byteOffset": start, "byteLength": len(data)})
            images = doc.setdefault("images", [])
            images.append({"name": name, "bufferView": len(views) - 1, "mimeType": "image/png"})
            textures = doc.setdefault("textures", [])
            cache[digest] = len(textures)
            textures.append({"sampler": sampler, "source": len(images) - 1})
        return {"index": cache[digest]}

    for mat in doc["materials"]:
        name = mat["name"]
        pbr = mat.setdefault("pbrMetallicRoughness", {})
        if name in ("paint-lettering-carrier", "paint-booster-red"):
            pbr["baseColorFactor"] = [1, 1, 1, 0]
            mat.update(alphaMode="MASK", alphaCutoff=0.5)
            continue
        if name in BOOSTER:
            baked = booster(name, layout)
        elif name == "shingle-rene41":
            baked = shingles(layout)
        elif name in PROFILES:
            kind, _ = PROFILES[name]
            linear = np.array(pbr.get("baseColorFactor", [1, 1, 1, 1])[:3])
            srgb = 255 * np.where(linear < 0.0031308, linear * 12.92, 1.055 * linear ** (1 / 2.4) - 0.055)
            baked = finish(kind, srgb, pbr.get("metallicFactor", 1))
            if kind in ("soot", "stain"):
                mat["alphaMode"] = "BLEND"
        else:
            continue
        pbr.update(baseColorFactor=[1, 1, 1, 1], metallicFactor=1, roughnessFactor=1)
        pbr["baseColorTexture"] = texture(name + "-colour", baked["colour"])
        pbr["metallicRoughnessTexture"] = texture(name + "-response", baked["response"])
        mat["normalTexture"] = texture(name + "-normal", baked["normal"])
    doc["buffers"][0]["byteLength"] = len(body)
    header = json.dumps(doc, separators=(",", ":")).encode()
    header += b" " * (-len(header) % 4)
    with path.open("wb") as out:
        out.write(struct.pack("<4s4I", b"glTF", 2, 28 + len(header) + len(body), len(header), 0x4E4F534A))
        out.write(header)
        out.write(struct.pack("<I4s", len(body), b"BIN\0"))
        out.write(body)

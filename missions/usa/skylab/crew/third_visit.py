"""Launch garments for the last crew. The breast patch follows the outline of NASA S72-53094."""

import math

import bpy

import figurelib as fl
from skylab_suit import launch_suit
from srlib import MeshBuilder, material, run

# Horizontal scan lines traced on the 512-pixel flight emblem, from the bottom edge to the top.
# Each is (row from top, left edge, right edge). Keeping the mesh within the blue border leaves
# the actual suit cloth visible beside the patch, including the two corners beside the SKYLAB text.
BORDER = [
    (488, 303, 335),
    (484, 281, 358),
    (480, 268, 371),
    (464, 234, 403),
    (448, 203, 423),
    (416, 142, 450),
    (400, 112, 459),
    (384, 88, 465),
    (368, 72, 470),
    (352, 59, 472),
    (336, 49, 473),
    (320, 41, 473),
    (304, 35, 473),
    (288, 31, 473),
    (256, 28, 473),
    (224, 31, 473),
    (208, 35, 473),
    (192, 41, 473),
    (176, 48, 473),
    (160, 58, 472),
    (144, 71, 469),
    (128, 88, 465),
    (112, 111, 459),
    (96, 142, 450),
    (64, 203, 424),
    (48, 233, 404),
    (32, 267, 373),
    (27, 285, 356),
    (23, 306, 333),
]


def breast_patch(torso, parent, image):
    patch = MeshBuilder()

    def xy(u, row):
        top, left, right = BORDER[row]
        return (left + u * (right - left)) / 512, 1 - top / 512

    def surface(u, row):
        x, y = xy(u, row)
        height = fl.B.waist_z - fl.B.torso_z0 + 25.7
        # 9 cm square photo field, estimated against Carr's suit-up photograph.
        return torso.at(height + (y - 0.5) * 9, -math.pi / 2 + 0.52 + (x - 0.5) * 9 / 19, 0.38)

    def uv(u, row):
        x, y = xy(u, row)
        return x / fl.CM, y / fl.CM

    patch.grid(surface, [i / 8 for i in range(9)], range(len(BORDER)), uv=uv)
    cloth = material(image.stem, (1, 1, 1), roughness=0.92, image=bpy.data.images.load(str(image)))
    fl.emit(patch, "Torso_MissionEmblem", cloth, parent)


def build_suit(who, script):
    # NASA TM X-58163, Appendix A records all three men at 69 inches.
    def build():
        return launch_suit(who, 69, script.with_name("skylab-iii-insignia.jpg"), shoulder_inset=0.65, chest_emblem=breast_patch)

    run(f"Skylab 4 {who}", build, [(f"{who.lower()}.png", (0, 0, 0.93), 4.2, dict(azimuth=-83, elevation=3, res=(620, 800), lens=50))])

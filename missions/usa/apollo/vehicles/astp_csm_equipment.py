"""ASTP command/service hardware. JSC-10607 figs. A-20, A-26 and A-29. Dimensions in inches."""

import math

from mathutils import Matrix, Vector

from skylab_csm_equipment import propellant_module
from srlib import IN, MeshBuilder, frame, group, interior, lathe_obj, load_font, material, prof, text_mesh

# Small remotely controlled covers in SM bay I. Angular spans, axial stations
# and hinge positions are estimates registered to the side view in fig. A-29.
COVERS = (
    ("EUV", 30, 45, 854, 871),
    ("HeliumGlow", 45, 60, 854, 871),
    ("SoftXRay", 45, 60, 875, 893),
)


def cover_stations(origin):
    return [(name, a0, a1, xa0 - origin, xa1 - origin) for name, a0, a1, xa0, xa1 in COVERS]


def science_bay(groups, origin, radius):
    shell = groups["ASTPExperimentCovers"]
    instruments = groups["ASTPScienceBay"]
    rim = material("astp-instrument-frame", (0.46, 0.49, 0.51), metallic=0.67, roughness=0.48)
    cover = material("astp-instrument-cover", (0.62, 0.64, 0.62), metallic=0.78, roughness=0.47)
    body = material("astp-electronics-anodized", (0.20, 0.24, 0.23), metallic=0.53, roughness=0.55)
    lens = material("glass-astp-filter", (0.12, 0.20, 0.24), metallic=0.33, roughness=0.28)
    seals = material("astp-instrument-lip", (0.11, 0.12, 0.13), roughness=0.64)
    for name, a0, a1, z0, z1 in cover_stations(origin):
        angle = math.radians((a0 + a1) / 2)
        outward = Vector((math.cos(angle), math.sin(angle), 0))
        across = Vector((-outward.y, outward.x, 0))
        pivot = group(f"SM111_{name}CoverPivot", shell)
        pivot.location = (outward * radius + Vector((0, 0, z0))) * IN
        local = Matrix.Translation(-pivot.location)
        arc = (math.radians(a0), math.radians(a1))
        # The cover's narrow reveal has physical thickness and a gap at all edges.
        inset = math.radians(0.12)
        lip = MeshBuilder()
        for lower, upper in ((z0 + 0.07, z0 + 0.35), (z1 - 0.35, z1 - 0.07)):
            lip.lathe(
                prof([(radius, lower), (radius, upper), (radius - 1, upper), (radius - 1, lower), (radius, lower)]),
                segs=4,
                arc=(arc[0] + inset, arc[1] - inset),
            )
        lip.build(f"SM111_{name}InstrumentSill", seals, shell)
        leaf = MeshBuilder()
        lower, upper = z0 + 0.45, z1 - 0.45
        leaf.lathe(
            prof([(radius, lower), (radius, upper), (radius - 0.28, upper), (radius - 0.28, lower), (radius, lower)]),
            segs=4,
            arc=(arc[0] + inset, arc[1] - inset),
            matrix=local,
        )
        leaf.build(f"SM111_{name}Cover", cover, pivot)
        hinge = MeshBuilder()
        hinge.tube(-across * 6.0 * IN, across * 6.0 * IN, 0.25 * IN)
        hinge.build(f"SM111_{name}Hinge", rim, pivot)
        if not interior():
            continue
        z = (z0 + z1) / 2
        mount = frame((outward * (radius - 7.2) + Vector((0, 0, z))) * IN, outward)
        case = MeshBuilder()
        case.box((13 * IN, 9 * IN, 10 * IN), mount)
        case.build(f"SM111_{name}ReceiverCase", body, instruments, smooth=False)

        # One grazing-incidence telescope, four helium-glow detector paths and the
        # covered proportional counter. The hardware report gives the functional
        # arrangement; the envelopes of individual components are reconstructed.
        face = MeshBuilder()
        ports = ((0.0, 0.0, 3.45),) if name != "HeliumGlow" else tuple((x, y, 1.32) for x in (-2.05, 2.05) for y in (-2.6, 2.6))
        for i, (x, y, bore) in enumerate(ports):
            seat = mount @ Matrix.Translation(Vector((x, y, 5.2)) * IN)
            face.lathe(prof([(bore, -0.3), (bore, 0.7), (bore + 0.55, 0.7), (bore + 0.55, -0.3), (bore, -0.3)]), segs=28, matrix=seat)
            optic = lathe_obj(f"SM111_{name}Filter_{i}", prof([(0, 0.21), (bore - 0.07, 0.21)]), lens, instruments, segs=28)
            optic.matrix_local = seat
        face.build(f"SM111_{name}OpticSeats", rim, instruments)


def cabin_panel(parent, station, width, height, title, controls):
    case = material("astp-cabin-instrument-case", (0.20, 0.22, 0.21), metallic=0.27, roughness=0.62)
    bare = material("astp-cabin-controls-metal", (0.64, 0.66, 0.65), metallic=0.61)
    ink = material("astp-cabin-legend", (0.88, 0.88, 0.80), roughness=0.67)
    glass = material("astp-cabin-indicator-amber", (0.51, 0.22, 0.04), roughness=0.44)
    # Lower equipment bay installation reconstructed from fig. A-26 and
    # control positions from ASTP Operations Handbook §1, CM prelaunch checks.
    mount = frame(Vector(station) * IN, Vector((1, 0, 0)))
    cabinet, switches, lamps, text = (MeshBuilder() for _ in range(4))

    def at(x, y, z):
        return mount @ Matrix.Translation(Vector((x, y, z)) * IN)

    def label(marking, x, y, size):
        points, faces = text_mesh(marking, 1, load_font(), cuts=2)
        lo = min(v[0] for v in points)
        hi = max(v[0] for v in points)
        text.add([((vx - (lo + hi) / 2) * size * IN, vy * size * IN, vz * size * IN) for vx, vy, vz in points], faces, matrix=at(x, y, 0.15))

    def box(builder, x, y, z, dims):
        builder.box(Vector(dims) * IN, at(x, y, z))

    box(cabinet, 0, 0, -0.5, (width, height, 1.2))
    label(title, 0, height / 2 - 0.8, 0.44)
    for i, name in enumerate(controls):
        x = (i - (len(controls) - 1) / 2) * (width - 0.8) / len(controls)
        y = -0.36
        box(lamps, x, y + 0.95, 0.22, (0.52, 0.36, 0.28))
        box(switches, x, y, 0.18, (0.44, 0.44, 0.28))
        switches.tube(at(x, y, 0.30).translation, at(x, y + 0.24, 0.71).translation, 0.085 * IN, segs=8)
        label(name, x, y - 0.83, 0.28)
    cabinet.build(f"{parent.name}_Enclosure", case, parent, smooth=False)
    switches.build(f"{parent.name}_Switches", bare, parent, smooth=False)
    lamps.build(f"{parent.name}_StatusWindows", glass, parent, smooth=False)
    text.build(f"{parent.name}_Legends", ink, parent, smooth=False)


def build(groups, origin, base, radius):
    names = ("PropellantStorageModule", "ASTPExperimentCovers", "ASTPScienceBay", "ASTPExperimentControls", "ASTPVideoRecorder")
    groups.update({name: group(name) for name in names})
    science_bay(groups, origin, radius)
    propellant_module(groups["PropellantStorageModule"], origin, 111, axial_shift=8)
    if interior():
        cabin_panel(groups["ASTPExperimentControls"], (-33.0, -13.4, base + 38.0), 12.4, 4.6, "EXPERIMENT SELECT", ("EUV", "HE", "X-RAY", "POWER"))
        cabin_panel(groups["ASTPVideoRecorder"], (-33.0, 13.4, base + 38.0), 13.0, 4.6, "VIDEO TAPE RECORDER", ("POWER", "HEAD", "TAPE", "MODE"))

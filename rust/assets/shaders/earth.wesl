// The Earth's surface (sr-render/src/earth). The engine lights it as any surface; this says what the surface is
// at each point: where the shore is, from the finest map that reaches there; the land near the site as a ground
// to stand on (earth_land.wesl) going over to the planet's own colours and relief with distance and height; and
// a sea that moves, breaks on the beach and is coloured by its depth (sea.wesl). rust/docs/terrain.md has the
// reading behind it.

import bevy_pbr::render::{
    pbr_fragment::pbr_input_from_standard_material,
    forward_io::{VertexOutput, FragmentOutput},
    pbr_functions::{apply_pbr_lighting, main_pass_post_lighting_processing},
};
import super::earth_noise::{TAU, noise_sampler, lattice3, grain, billow, shown};
import super::earth_land::{Site, Soil, ground};
import super::sea::{Waves, waves, Surf, surf, surf_far, water, SEA, DEEP, LAGOON, LAGOON_EDGE, FOAM, SURF_ZONE, TURBID};
import super::earth_glint::{sunlight, to_sun, glint, sun_on_water};
import super::earth_frame::{Plane, EarthFrame, through_cloud};
import super::earth_baked::fields_at;
import super::earth_far::ground_far;
import bevy_pbr::render::mesh_view_bindings as view_bindings;

// The made ground round the site (sr-render/src/earth/marks.rs).
struct EarthMarks {
    ways: array<vec4<f32>, 32>,
    way_kinds: array<vec4<f32>, 32>,
    patches: array<vec4<f32>, 24>,
    patch_kinds: array<vec4<f32>, 24>,
    counts: vec4<f32>,
}

@group(constants::MATERIAL_BIND_GROUP) @binding(100) var<uniform> earth: EarthFrame;
// (a fragment shader may have sixteen samplers and the engine takes ten: every cube map is read through the
// colour's, every flat one through the shore's)
@group(constants::MATERIAL_BIND_GROUP) @binding(101) var colour_map: texture_cube<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(102) var colour_sampler: sampler;
@group(constants::MATERIAL_BIND_GROUP) @binding(103) var shore_map: texture_2d<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(104) var shore_sampler: sampler;
@group(constants::MATERIAL_BIND_GROUP) @binding(105) var relief_map: texture_cube<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(107) var land_map: texture_cube<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(109) var wide_map: texture_2d<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(111) var region_relief_map: texture_2d<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(113) var region_colour_map: texture_2d<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(115) var coast_map: texture_2d<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(117) var<uniform> marks: EarthMarks;
@group(constants::MATERIAL_BIND_GROUP) @binding(120) var cumulus_map: texture_2d<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(121) var day_map: texture_2d<f32>;

// Switches for measuring what each part costs (rust/docs/terrain.md, "Measuring"): the near land's material and
// the sea's waves, foam and depth colour. With one off, that part is a flat tone. Leave them on.
// (and `earth.day.w` turns the land's (1) and the sea's (2) off: the A/B switch, sr-render/src/earth/ab.rs)
const LAND_DETAIL: bool = true;
// The ground a pixel covers (m) over which the near ground gives way to the small one (earth_far.wesl). Chosen by
// looking: past it nothing the near ground draws is more than a pixel across.
const FAR: vec2<f32> = vec2(0.4, 0.7);
const SEA_DETAIL: bool = true;
// The designed ground near the site and the photograph's land beyond it, seen from 10 km up over the same ground
// (`--reference`, the clouds left out, the air's own light taken away), came to (0.072, 0.112, 0.042) and
// (0.049, 0.072, 0.012) with the photograph brightened as it was (doubled, its colour pressed 1.35 times): the
// designed ground half as bright again and far bluer. Measured at two places 32 and 63 km west of the site. They meet
// halfway: the photograph is multiplied by `FAR_GAIN`, and the designed ground seen from the air by `AIR_MEET`, set so
// that measured again the two agree: (0.061, 0.090, 0.021) against (0.060, 0.089, 0.018), after correcting twice by
// the root of what was left on each side. Derived from those measurements. `FAR_MOST` holds the
// brightest land (a desert's, far off) to a pale sand's albedo: estimated.
const FAR_GAIN: vec3<f32> = vec3(2.21, 2.48, 1.08);
const AIR_MEET: vec3<f32> = vec3(0.87, 0.83, 0.36);
const FAR_MOST: f32 = 0.6;
// The mean colour of the land round the Cape in the region's colour map (Blue Marble, May; linear): measured over
// 45 by 90 km of it west of the site. Where the photograph is darker or paler, or another hue, than this, so is the
// designed ground seen from the air, by `AIR_TONE` of the square root of the ratio, held within `TINT`. From the
// eye height `ALOFT` (m) it comes in. All but the mean are estimated, by looking.
const CAPE_LAND: vec3<f32> = vec3(0.0525, 0.0629, 0.0174);
const AIR_TONE: f32 = 0.85;
const TINT: vec2<f32> = vec2(0.6, 1.6);
const ALOFT: vec2<f32> = vec2(150.0, 1500.0);
// How far round a point of the photograph its mean is taken, in texels (450 m), and how strongly the point's own
// difference from that mean is drawn. Estimated, by looking.
const AROUND: f32 = 4.0;
const LOCAL_GAIN: f32 = 1.3;
// The ground a pixel covers (m, as a square) over which the surf's breakers, drawn one by one, give way to the share
// of the pixel their band whitens (sea.wesl `surf_far`). Chosen so that nothing within a few kilometres of the eye
// at the pad or on the chase changes: there a pixel covers a few metres.
const SURF_FAR: vec2<f32> = vec2(40.0, 160.0);
// And the Sun's glint on the water (earth_glint.wesl): off, the water has the Sun's light through it and none off it.
const GLINT: bool = true;
// The sphere's radius, m, near enough for turning a map's texels into distances over the ground.
const EARTH: f32 = 6371000.0;
// The whole Earth's maps: texels along a face, and how many its shores keep a distance over (tools/globe.mjs).
const FACE: f32 = 2048.0;
const SPREAD: f32 = 8.0;

// The height of the solid surface a byte of a relief map stands for, m: the sea's bed is negative
// (src/world/relief.ts `decodeRelief`: 128 the sea's level, a logarithm below it, a square root above).
fn relief_metres(v: f32) -> f32 {
    let above = max(v - 128.0, 0.0) / 127.0;
    let below = max(128.0 - v, 0.0) / 127.0;
    return 8850.0 * above * above - 2.0 * (exp(below * 8.6127) - 1.0);
}

// Where an Earth-fixed direction falls on a regional map (xy), and how much the map is to be believed there (z):
// nothing off it, all of it once well inside its edge (src/world/region.ts `toPlane`).
fn on_plane(plane: Plane, d: vec3<f32>) -> vec3<f32> {
    let q = vec3(dot(plane.east.xyz, d), dot(plane.north.xyz, d), dot(plane.middle.xyz, d));
    let p = q.xy / max(q.z, 0.001);
    let b = plane.bounds;
    let edge = min(min(p.x - b.x, b.y - p.x), min(p.y - b.z, b.w - p.y));
    let inside = select(0.0, smoothstep(0.0, max(plane.scale.y, 1.0e-6), edge), q.z > 0.5);
    // (its rows run north to south)
    return vec3(saturate(vec2((p.x - b.x) / (b.y - b.x), (b.w - p.y) / (b.w - b.z))), inside);
}

// What the designed ground is multiplied by when seen from the air (`aloft` 1): the photograph's tones at the size
// of its texels. The Cape's marsh, flatwoods, hammocks, scrub and burns are darker, paler, greener or browner than
// what is round them, and so is the ground over them: by the ratio of the photograph (`photo`, at `uv` on the
// region's map) to its mean over the few kilometres round it, and by the square root of that mean's to the Cape's.
// Near the ground the palette's own.
fn from_air(photo: vec3<f32>, uv: vec2<f32>, aloft: f32) -> vec3<f32> {
    if aloft <= 0.0 {
        return vec3(1.0);
    }
    let d = AROUND / vec2<f32>(textureDimensions(region_colour_map));
    let around = 0.25 * (textureSampleLevel(region_colour_map, shore_sampler, uv + vec2(d.x, 0.0), 0.0).rgb
        + textureSampleLevel(region_colour_map, shore_sampler, uv - vec2(d.x, 0.0), 0.0).rgb
        + textureSampleLevel(region_colour_map, shore_sampler, uv + vec2(0.0, d.y), 0.0).rgb
        + textureSampleLevel(region_colour_map, shore_sampler, uv - vec2(0.0, d.y), 0.0).rgb);
    let here = pow(photo / max(around, vec3(1.0e-4)), vec3(LOCAL_GAIN));
    let tint = clamp(here * sqrt(around / CAPE_LAND), vec3(TINT.x), vec3(TINT.y));
    return mix(vec3(1.0), AIR_MEET * mix(vec3(1.0), tint, AIR_TONE), aloft);
}

// The height of the solid surface toward an Earth-fixed direction, m: the region's map where it reaches, the
// whole Earth's beyond (ETOPO 2022).
fn relief_at(d: vec3<f32>) -> f32 {
    let whole = relief_metres(textureSampleLevel(relief_map, colour_sampler, d, 0.0).r * 255.0);
    let at = on_plane(earth.region, d);
    let fine = relief_metres(textureSampleLevel(region_relief_map, shore_sampler, at.xy, 0.0).r * 255.0);
    return mix(whole, fine, at.z * earth.region.scale.w) * earth.eye.y;
}

// The made ground at a point: how much of it is a clearing, graded, built on; how far out from what is built;
// how far from the nearest way and what that is.
struct Made {
    cleared: f32,
    graded: f32,
    built: f32,
    kerb: f32,
    way: f32,
    surface: f32,
}

fn made_at(p: vec2<f32>) -> Made {
    var m: Made;
    m.kerb = 1.0e6;
    m.way = 1.0e6;
    m.surface = 1.0;
    let ways = i32(marks.counts.x);
    for (var i = 0; i < ways; i++) {
        let a = marks.ways[i].xy;
        let ab = marks.ways[i].zw - a;
        let along = saturate(dot(p - a, ab) / max(dot(ab, ab), 1.0e-6));
        let d = length(p - a - ab * along) - marks.way_kinds[i].x;
        if d < m.way {
            m.way = d;
            m.surface = marks.way_kinds[i].y;
        }
    }
    // (past the furthest patch's reach none need be looked at)
    let patches = select(0, i32(marks.counts.y), length(p) < marks.counts.z);
    for (var i = 0; i < patches; i++) {
        let box = marks.patches[i];
        let kind = marks.patch_kinds[i];
        let off = p - box.xy;
        let q = abs(vec2(dot(off, kind.xy), dot(off, vec2(-kind.y, kind.x)))) - box.zw;
        let d = length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - kind.z;
        if kind.w < 0.5 {
            // (ground.ts COVER: a clearing's ragged edge, and a graded apron's)
            m.cleared = max(m.cleared, 1.0 - smoothstep(-2.0, 4.0, d + 3.0 * (grain(p * 0.2, 39u) - 0.5)));
        } else if kind.w < 1.5 {
            m.graded = max(m.graded, 1.0 - smoothstep(-6.0, 6.0, d + 8.0 * (grain(p * 0.08, 44u) - 0.5)));
        } else {
            m.built = max(m.built, 1.0 - smoothstep(-0.5, 0.5, d));
            // (a paved patch's edge is the paving's own)
            m.kerb = min(m.kerb, select(1.0e6, d, kind.w > 2.5));
        }
    }
    // Handed no marks, the ground round the site's own models is taken as cleared, as a complex's is. Estimated.
    if ways + i32(marks.counts.y) == 0 {
        m.cleared = 1.0 - smoothstep(230.0, 290.0, length(p) + 40.0 * (grain(p * 0.02, 39u) - 0.5));
    }
    return m;
}

@fragment
fn fragment(in: VertexOutput, @builtin(front_facing) is_front: bool) -> FragmentOutput {
    var pbr = pbr_input_from_standard_material(in, is_front);
    let up = normalize(in.world_normal);
    let en = in.uv;
    let range = length(en);
    let clock = earth.sun.w;
    let height = max(earth.eye.x, 0.0);
    // The ground a pixel covers, m: along its longer side, which is what a line must be faded by, and as the side
    // of a square of its area, which is what a clump is: edge-on a pixel is long and narrow.
    let seen = max(length(fwidth(en)), 0.001);
    let en_x = dpdx(en);
    let en_y = dpdy(en);
    let seen_square = max(sqrt(abs(en_x.x * en_y.y - en_x.y * en_y.x)), 0.001);
    let fixed = normalize(earth.x.xyz * up.x + earth.y.xyz * up.y + earth.z.xyz * up.z);
    // The relief raised near the site (sr-render/src/earth/relief.rs): its slope east and north. The mesh's normal
    // stays the sphere's, by which the maps are read.
    var relief = vec2(0.0);
    @if(VERTEX_UVS_B) {
        relief = in.uv_b;
    }

    // The shore: how far inland this is, m (negative at sea), from the finest map that reaches here: the whole
    // Earth's, the region's wide one over it, the near one over that, each faded in from its edge so that no
    // map's edge can be seen.
    let most = max(max(abs(fixed.x), abs(fixed.y)), abs(fixed.z));
    var texel = 2.0 / FACE * EARTH * most * sqrt(most);
    let marble = textureSample(colour_map, colour_sampler, fixed).rgb;
    let whole = (textureSample(land_map, colour_sampler, fixed).r * 255.0 - 128.0) * SPREAD / 127.0 * texel;
    // (until the whole Earth's shores arrive, the colour map's sea, which is bluer than it is red)
    let guessed = (0.5 - smoothstep(1.02, 1.22, marble.b / max(marble.r, 0.004))) * texel;
    var inland = mix(guessed, whole, earth.eye.z);
    let on_wide = on_plane(earth.wide, fixed);
    let wide_w = on_wide.z * earth.wide.scale.w;
    let wide = (textureSample(wide_map, shore_sampler, on_wide.xy).r * 255.0 - 128.0) / 127.0
        * earth.wide.scale.z * earth.wide.scale.x;
    inland = mix(inland, wide, wide_w);
    texel = mix(texel, earth.wide.scale.x, wide_w);
    let half = earth.shore.x;
    let on_near = earth.shore.w * (1.0 - smoothstep(0.86 * half, 0.97 * half, max(abs(en.x), abs(en.y))));
    let shore_uv = vec2(0.5 + en.x / (2.0 * half + 1.0), 0.5 - en.y / (2.0 * half + 1.0));
    let near = (textureSample(shore_map, shore_sampler, shore_uv).r * 255.0 - 128.0) / 127.0 * earth.shore.z * earth.shore.y;
    inland = mix(inland, near, on_near);
    texel = mix(texel, earth.shore.y, on_near);
    let reach_m = earth.shore.z * earth.shore.y;

    // The open sea told from enclosed water (sr-render/src/earth/coast.rs): metres from the one's shore and from
    // the other, coarse; the near map's own distance is the fine one, within its reach of a shore.
    let sorted = textureSample(coast_map, shore_sampler, shore_uv).rg;
    let known = on_near * earth.eye.w;
    let faces_sea = mix(1.0, smoothstep(-150.0, 150.0, sorted.g - abs(sorted.r)), known);
    let by_shore = 1.0 - smoothstep(0.55 * reach_m, 0.9 * reach_m, abs(near));
    // metres inland of the open sea's shore, and from enclosed water
    let shore = mix(mix(inland, sorted.r, known), near, on_near * faces_sea * by_shore);
    let river = mix(mix(1.0e5, sorted.g, known), near, known * (1.0 - faces_sea) * by_shore);

    // How much the ground here is the site's own, drawn as a place to stand: all of it near and from low down,
    // none from where its detail is under a pixel, and the planet's own colours take over.
    let own = on_near * (1.0 - smoothstep(8000.0, 40000.0, range)) * (1.0 - smoothstep(4000.0, 30000.0, height));

    // The surf and the swash: the sea breaks along every open beach the near map has, and comes up the sand and goes
    // back. (From high up the breakers are their mean, a white band: `surf` fades them by the size of a pixel.)
    let open_shore = on_near * faces_sea * (1.0 - smoothstep(200.0, 280.0, abs(near)));
    var ashore = vec2(-1.0, 0.0);
    var beach: Surf;
    beach.foam = 0.0;
    beach.slope = vec2(0.0);
    beach.reach = 0.0;
    let out_ = -near;
    // (the bed falls 2.2 m in every 100 offshore, with a bar 75 m out: ground.ts, the lie of the land)
    let bar = (out_ - 75.0) / 18.0;
    let shelving = max(0.022 * max(out_, -shore) - 0.45 * exp(-bar * bar), 0.0);
    if open_shore > 0.0 {
        let step_uv = vec2(1.0 / earth.shore.x * earth.shore.y * 0.5, 0.0);
        let rise = vec2(
            textureSampleLevel(shore_map, shore_sampler, shore_uv + step_uv.xy, 0.0).r
                - textureSampleLevel(shore_map, shore_sampler, shore_uv - step_uv.xy, 0.0).r,
            textureSampleLevel(shore_map, shore_sampler, shore_uv - step_uv.yx, 0.0).r
                - textureSampleLevel(shore_map, shore_sampler, shore_uv + step_uv.yx, 0.0).r,
        );
        ashore = select(ashore, normalize(rise), dot(rise, rise) > 1.0e-8);
        beach = surf(en, out_, ashore, shelving, clock, seen);
    }
    let waterline = inland - beach.reach * open_shore * (1.0 - smoothstep(20.0, 60.0, abs(near)));
    let land = smoothstep(-0.5, 0.5, waterline / (fwidth(inland) * 0.8 + 0.03 * texel));
    let wet = 1.0 - land;

    var colour = vec3(0.0);
    var slope = vec2(0.0);
    var rough = 0.95;
    var sky = 1.0;

    // The land.
    if land > 0.0 {
        // far off and from high up: the planet's own colours (Blue Marble, May), finer over the region, lit by
        // its relief
        let on_region = on_plane(earth.region, fixed);
        let region_w = on_region.z * earth.region.scale.z;
        let finer = textureSampleLevel(region_colour_map, shore_sampler, on_region.xy, 0.0).rgb;
        var far_land = mix(marble, finer, region_w);
        let photo = far_land;
        // (the map is a photograph's tones, and the site's ground is drawn lighter than a photograph (ground.ts
        // PALETTE): the two meet halfway, measured (`FAR_GAIN`, `AIR_MEET`), so the land keeps one tone as the eye
        // climbs and from the designed ground near the site to the photograph's beyond it)
        far_land = min(far_land * FAR_GAIN, vec3(FAR_MOST));
        // (closer than the map's texels, what grows is still not smooth: mottled, the more for being green)
        let green = saturate((far_land.g - max(far_land.r, far_land.b)) * 12.0 + 0.3);
        let close = 1.0 - smoothstep(120.0, 500.0, seen);
        let mottle = (billow(en / 700.0, 90u) - 0.5) * shown(700.0, seen) + (billow(en / 160.0, 91u) - 0.5) * shown(160.0, seen) * 0.7;
        far_land *= 1.0 + (0.5 + 0.5 * green) * mottle * close;
        colour = far_land;
        if earth.eye.y > 0.5 && own < 1.0 {
            // the slope from the height a texel away, two ways
            let step_ = mix(1.5708 / FACE, 450.0 / EARTH, on_region.z * earth.region.scale.w);
            let east_f = normalize(cross(vec3(0.0, 0.0, 1.0), fixed));
            let north_f = cross(fixed, east_f);
            let here = max(relief_at(fixed), 0.0);
            let de = (max(relief_at(normalize(fixed + east_f * step_)), 0.0) - here) / (step_ * EARTH);
            let dn = (max(relief_at(normalize(fixed + north_f * step_)), 0.0) - here) / (step_ * EARTH);
            // (east and north there, in the site's frame, near enough: the frame's own compass turned to it)
            slope = vec2(de, dn) * (1.0 - own);
        }
        if own > 0.0 && LAND_DETAIL && (u32(earth.day.w) & 1u) == 0u {
            var site: Site;
            site.p = en;
            site.shore = shore;
            site.river = river;
            site.seen = seen_square;
            site.line = seen;
            let made = made_at(en);
            site.cleared = made.cleared;
            site.graded = made.graded;
            site.built = made.built;
            site.kerb = made.kerb;
            site.way = made.way;
            site.surface = made.surface;
            site.reach = beach.reach;
            let sun_en = vec2(dot(earth.sun.xyz, earth.east.xyz), dot(earth.sun.xyz, earth.north.xyz));
            site.sunward = sun_en / max(earth.sun.y, 0.15);
            site.steep = saturate(dot(up, pbr.V));
            site.f = fields_at(en, length(in.world_position.xyz - view_bindings::view.world_position), earth.baked);
            site.wind = select(vec2(-1.0, 0.0), normalize(earth.wind.xy), dot(earth.wind.xy, earth.wind.xy) > 1.0e-4);
            // (where a pixel covers more than half a metre, the small ground: earth_far.wesl)
            let far = smoothstep(FAR.x, FAR.y, seen_square);
            var soil: Soil;
            if far < 1.0 {
                soil = ground(site);
            }
            if far > 0.0 {
                let distant = ground_far(site);
                soil.colour = mix(soil.colour, distant.colour, far);
                soil.slope = mix(soil.slope, distant.slope, far);
                soil.rough = mix(soil.rough, distant.rough, far);
                soil.sky = mix(soil.sky, distant.sky, far);
            }
            soil.colour *= from_air(photo, on_region.xy, smoothstep(ALOFT.x, ALOFT.y, height) * region_w);
            colour = mix(colour, soil.colour, own);
            slope = mix(slope, soil.slope, own);
            rough = mix(rough, soil.rough, own);
            sky = mix(1.0, soil.sky, own);
        }
        slope += relief;
    }

    // The sea.
    var sea_colour = vec3(0.0);
    var sea_slope = vec2(0.0);
    var sea_rough = 0.3;
    var sea_lean = vec3(0.0);
    var sea_mss = 0.03;
    var sea_foam = 0.0;
    let sea_detail = SEA_DETAIL && (u32(earth.day.w) & 2u) == 0u;
    if wet > 0.0 && !sea_detail {
        sea_colour = SEA;
    }
    if wet > 0.0 && sea_detail {
        let blown = earth.wind.xy;
        let speed = length(blown);
        let toward = select(vec2(-1.0, 0.0), blown / max(speed, 0.001), speed > 0.01);
        let lagoon = known * (1.0 - smoothstep(0.0, 200.0, sorted.g));
        let w = waves(en, toward, max(speed, 1.0), clock, seen, lagoon, smoothstep(120.0, 300.0, -near) + (1.0 - on_near * faces_sea));
        // its depth: off an open beach the bed shelves; further out, and wherever else it is known, the relief's
        let bed = -relief_at(fixed);
        // (water over ground the relief has above the sea is a lagoon or a lake, whose bed is not in the relief:
        // taken as shallow, one tone: src/viewer/globe.ts)
        let mapped = select(max(bed, 2.0), 1.5, bed < 0.5);
        var bank = 0.0;
        for (var i = 0; i < 6; i++) {
            bank = max(bank, smoothstep(earth.banks[i].w - 0.0001, earth.banks[i].w + 0.00005, dot(fixed, earth.banks[i].xyz)));
        }
        // How much this is the open sea off a beach, to be drawn as the Cape's own is: the near map tells the open
        // sea from enclosed water; beyond it, water the relief puts over the sea's floor is the open sea's, and a bank
        // of pale sand keeps its own colour. One rule for the inshore water, the surf and the bed inside the near map
        // and beyond it, so its edge cannot be seen.
        let open_side = mix(smoothstep(0.5, 2.0, bed) * (1.0 - bank), faces_sea, on_near);
        // (beyond the near map the bed shelves from the wider map's shore, without the bar)
        let shelves = mix(max(-0.022 * shore, 0.0), shelving, on_near);
        let depth = mix(mapped, shelves, open_side * (1.0 - smoothstep(150.0, 900.0, -shore)));
        // (the water's own colour: off a continental shore it is green with what is in it, and off the shelf the
        // open ocean's dark blue, which sends back a fiftieth of the light. Where one gives way to the other, by
        // depth, is estimated.)
        let above = smoothstep(15000.0, 80000.0, height);
        let deep = mix(SEA, DEEP, max(above, 0.5 * smoothstep(40.0, 400.0, depth)));
        var body = water(bank, depth, deep);
        // (off the site's own shore, the Cape's water: green over sand where it is shallow, blue-grey offshore:
        // ground.ts PAINT)
        // (inshore the water is turbid and green, in plumes the tide and the surf stir up; it clears to blue
        // offshore over a kilometre or two, raggedly: from the air a pale green band along every beach, as in the
        // photographs of 1964 (docs/sources.md))
        let silt = billow(en / 900.0, 92u) + 0.35 * (billow(en / 260.0, 93u) - 0.5);
        let cape = mix(SURF_ZONE, mix(TURBID, deep, smoothstep(3.0 + 5.0 * silt, 7.0 + 14.0 * silt, depth)),
            smoothstep(0.3, 4.0, depth));
        body = mix(body, cape, open_side * (1.0 - smoothstep(25.0, 40.0, depth)));
        // (and the open sea is not one tone: water of a little more or less plankton and silt lies in masses
        // kilometres across, and the light that comes up out of it with them. Estimated.)
        body *= 0.82 + 0.36 * billow(en / 5200.0 + 3.1, 94u) * (1.0 - lagoon);
        // (a lagoon: still, stained, shallow all over, the sand showing pale through its edges)
        body = mix(body, mix(LAGOON, LAGOON_EDGE, 0.7 * (1.0 - smoothstep(0.0, 90.0, -near))), lagoon);
        // (under a gust the sea is darker, in a lull paler: its roughness changes what of the sky it sends back,
        // and by a little what comes up from within. Estimated.)
        body *= (0.72 + 0.56 * (1.0 - w.gust)) * (1.0 - 0.08 * w.slick);
        // (the surf: where its band is under a pixel, the share of the pixel it whitens, along every open beach)
        let surf_mean = surf_far(mix(-shore, out_, on_near), seen_square) * open_side;
        let foam = max(w.foam, mix(beach.foam * open_shore, surf_mean, smoothstep(SURF_FAR.x, SURF_FAR.y, seen_square)));
        sea_colour = mix(body, FOAM, foam);
        sea_slope = (w.slope + beach.slope * open_shore) * (1.0 - foam);
        // (the slopes too fine to see are the surface's roughness: for the sky it sends back, a sea whose mean
        // square slope is s is a surface of roughness sqrt(s), and the engine's is that one's square root. The
        // Sun's own light off it is worked apart: earth_glint.wesl)
        sea_mss = w.unseen;
        sea_foam = foam;
        sea_rough = mix(clamp(sqrt(sqrt(w.unseen)), 0.16, 0.6), 0.7, foam);
        // Seen near edge-on, the faces of a rough sea that can be seen at all are the ones tilted toward the eye:
        // the far sea mirrors the sky above the horizon, not the horizon itself, and is the paler for it. The
        // tilt is the waves' own (the root of their mean square slope), by how nearly edge-on. Estimated.
        let level = pbr.V - up * dot(up, pbr.V);
        let graze = 1.0 - saturate(dot(up, pbr.V));
        sea_lean = level * (0.7 * sqrt(w.unseen) * graze * graze);
    }

    pbr.material.base_color = vec4(mix(colour, sea_colour, wet), 1.0);
    pbr.material.perceptual_roughness = mix(rough, sea_rough, wet);
    pbr.material.metallic = 0.0;
    pbr.material.reflectance = vec3(mix(0.3, 0.354, wet));
    let tilt = mix(slope, sea_slope, wet);
    pbr.N = normalize(up - earth.east.xyz * tilt.x - earth.north.xyz * tilt.y + sea_lean * wet);
    pbr.world_normal = up;
    pbr.diffuse_occlusion = min(pbr.diffuse_occlusion, vec3(mix(sky, 1.0, wet)));

    // The cumulus' shadows, moving with the wind: where the Sun's ray to this point passes through cloud. They
    // fall on the sea's glint as on anything the Sun lights.
    let cloud_lit = through_cloud(earth, cumulus_map, noise_sampler, day_map, shore_sampler, en);
    // (on the water the Sun's light is worked here and not by the engine: earth_glint.wesl)
    pbr.directional_shadow_factor = cloud_lit * (1.0 - wet);

    var out: FragmentOutput;
    out.color = apply_pbr_lighting(pbr);
    if wet > 0.0 {
        let lit = sunlight(in.world_position, up, in.position.xy, cloud_lit);
        let l = to_sun();
        let n = pbr.N;
        // the water's own colour, lit by the Sun through its surface, and the foam on it
        let body = pbr.material.base_color.rgb * saturate(dot(n, l)) / 3.14159265
            * (1.0 - 0.06 * (1.0 - sea_foam));
        let reflected = select(0.0, glint(n, pbr.V, l, sea_mss, en, seen_square, clock), GLINT && sea_detail) * (1.0 - sea_foam);
        out.color = vec4(out.color.rgb + wet * (lit * body + sun_on_water(lit, reflected)), out.color.a);
    }
    out.color = main_pass_post_lighting_processing(pbr, out.color);
    return out;
}

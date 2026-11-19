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
import super::sea::{Waves, waves, Surf, surf, water, SEA, DEEP, LAGOON, LAGOON_EDGE, FOAM};

// A regional map's plane (sr-render/src/earth/chart.rs).
struct Plane {
    east: vec4<f32>,
    north: vec4<f32>,
    middle: vec4<f32>,
    // west, east, south, north, in units of the sphere's radius
    bounds: vec4<f32>,
    // metres to a texel, how far in from its edge it is faded in, and two that each map reads its own way
    scale: vec4<f32>,
}

struct EarthFrame {
    x: vec4<f32>,
    y: vec4<f32>,
    z: vec4<f32>,
    east: vec4<f32>,
    north: vec4<f32>,
    // half the shore map's width (m), metres to a texel, texels it keeps a distance over, whether there is one
    shore: vec4<f32>,
    // the cloud's shadow: cover, a cloud's size (m), the height it is sunward from (m), whether there is any
    cloud: vec4<f32>,
    // how the cover lays the cumulus out: every turret's spread, the metres to a cell of their field, their depth (m)
    lay: vec4<f32>,
    // toward the Sun, and the clock (s)
    sun: vec4<f32>,
    // the cloud's drift, m/s east and north
    wind: vec4<f32>,
    // the eye's height (m); whether the whole Earth's relief has arrived, its shores, and the sorted coast
    eye: vec4<f32>,
    // the region's wider shore map: its scale's third is the texels it keeps a distance over, its fourth whether
    // it has arrived
    wide: Plane,
    // the region's relief and colour: its scale's third is whether the colour has arrived, its fourth the relief
    region: Plane,
    // banks of pale sand: a direction from the Earth's centre and the cosine of its radius
    banks: array<vec4<f32>, 6>,
}

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

// Switches for measuring what each part costs (rust/docs/terrain.md, "Measuring"): the near land's material and
// the sea's waves, foam and depth colour. With one off, that part is a flat tone. Leave both on.
const LAND_DETAIL: bool = true;
const SEA_DETAIL: bool = true;
// The sphere's radius, m, near enough for turning a map's texels into distances over the ground.
const EARTH: f32 = 6371000.0;
// The whole Earth's maps: texels along a face, and how many its shores keep a distance over (tools/globe.mjs).
const FACE: f32 = 2048.0;
const SPREAD: f32 = 8.0;

fn hash21(p: vec2<f32>) -> f32 {
    var q = fract(vec3(p.xyx) * 0.1031);
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
}

fn noise2(p: vec2<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);
    let a = mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x);
    let b = mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x);
    return mix(a, b, u.y);
}

// How much of the Sun a point of the ground has lost to the cumulus: 0 in the open, 0.9 under a cloud. `en` is
// where the sunbeam to it crossed the layer, in the cumulus' drifting frame. This is clouds.wesl's `in_shadow`
// (its `gather`, its `column` read from the same sheet, the same edge and strength), and the two must be kept in
// step, or the shadows part from the clouds that throw them.
fn cloud_shade(en: vec2<f32>, clock: f32, seen: f32) -> f32 {
    let cell = earth.lay.y;
    let cells = en / cell;
    let gathered = 0.62 + 0.76 * smoothstep(0.2, 0.8, noise2(cells * 0.21 + 7.3));
    let texel = textureSampleLevel(cumulus_map, noise_sampler, en / (cell * 16.0), 0.0);
    let spread = earth.lay.x * gathered;
    let within = 1.0 - texel.r / spread;
    let radius = texel.g * spread * cell;
    let breath = (0.9 + 0.1 * sin(clock / 160.0 + texel.a * TAU)) * (0.75 + 0.25 * texel.a);
    let top = earth.lay.z * (1.0 - exp(-radius / (0.16 * earth.cloud.y))) * breath;
    let shade = 0.9 * smoothstep(0.12, 0.4, within) * smoothstep(0.0, 120.0, top);
    // (where a cloud's shadow is under a pixel or two the ground has the field's mean, and does not shimmer)
    return mix(0.8 * earth.cloud.x, shade, shown(0.25 * cell, seen));
}

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
    let patches = i32(marks.counts.y);
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
    if ways + patches == 0 {
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

    // The swash: the sea comes up the beach and goes back.
    let open_shore = own * faces_sea * (1.0 - smoothstep(200.0, 280.0, abs(near)));
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
        // (the map is a photograph's tones, and the site's ground is drawn lighter and clearer than a photograph
        // (ground.ts PALETTE): the map is brought toward it, so the land does not change its look as the eye
        // climbs. By how much is estimated.)
        far_land = max(mix(vec3(dot(far_land, vec3(0.2126, 0.7152, 0.0722))), far_land, 1.35) * 2.0, vec3(0.0));
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
        if own > 0.0 && LAND_DETAIL {
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
            let soil = ground(site);
            colour = mix(colour, soil.colour, own);
            slope = mix(slope, soil.slope, own);
            rough = mix(rough, soil.rough, own);
            sky = mix(1.0, soil.sky, own);
        }
    }

    // The sea.
    var sea_colour = vec3(0.0);
    var sea_slope = vec2(0.0);
    var sea_rough = 0.3;
    var sea_lean = vec3(0.0);
    if wet > 0.0 && !SEA_DETAIL {
        sea_colour = SEA;
    }
    if wet > 0.0 && SEA_DETAIL {
        let blown = earth.wind.xy;
        let speed = length(blown);
        let toward = select(vec2(-1.0, 0.0), blown / max(speed, 0.001), speed > 0.01);
        let lagoon = known * (1.0 - smoothstep(0.0, 200.0, sorted.g));
        let w = waves(en, toward, max(speed, 1.0), clock, seen, lagoon);
        // its depth: off an open beach the bed shelves; further out, and wherever else it is known, the relief's
        let bed = -relief_at(fixed);
        // (water over ground the relief has above the sea is a lagoon or a lake, whose bed is not in the relief:
        // taken as shallow, one tone: src/viewer/globe.ts)
        let mapped = select(max(bed, 2.0), 1.5, bed < 0.5);
        let depth = mix(mapped, shelving, own * faces_sea * (1.0 - smoothstep(150.0, 900.0, -shore)));
        var bank = 0.0;
        for (var i = 0; i < 6; i++) {
            bank = max(bank, smoothstep(earth.banks[i].w - 0.0001, earth.banks[i].w + 0.00005, dot(fixed, earth.banks[i].xyz)));
        }
        // (the water's own colour: off a continental shore it is green with what is in it, and off the shelf the
        // open ocean's dark blue, which sends back a fiftieth of the light. Where one gives way to the other, by
        // depth, is estimated.)
        let above = smoothstep(15000.0, 80000.0, height);
        let deep = mix(SEA, DEEP, max(above, 0.5 * smoothstep(40.0, 400.0, depth)));
        var body = water(bank, depth, deep);
        // (off the site's own shore, the Cape's water: green over sand where it is shallow, blue-grey offshore:
        // ground.ts PAINT)
        let shoal = saturate(depth / 6.0);
        let cape = mix(vec3(0.16, 0.29, 0.25), mix(vec3(0.045, 0.14, 0.16), deep, smoothstep(0.4, 1.0, shoal)), smoothstep(0.0, 0.35, shoal));
        // (inshore the water is turbid and green, in plumes the tide and the surf stir up; it clears to blue
        // offshore over a few kilometres, raggedly)
        let silt = billow(en / 900.0, 92u);
        body = mix(body, cape, own * (1.0 - smoothstep(3.0 + 6.0 * silt, 8.0 + 14.0 * silt, depth)));
        // (a lagoon: still, stained, shallow all over, the sand showing pale through its edges)
        body = mix(body, mix(LAGOON, LAGOON_EDGE, 0.7 * (1.0 - smoothstep(0.0, 90.0, -near))), lagoon);
        // (under a gust the sea is darker, in a lull paler: its roughness changes what of the sky it sends back,
        // and by a little what comes up from within. Estimated.)
        body *= 0.72 + 0.56 * (1.0 - w.gust);
        let foam = max(w.foam, beach.foam * open_shore);
        sea_colour = mix(body, FOAM, foam);
        sea_slope = (w.slope + beach.slope * open_shore) * (1.0 - foam);
        // The Sun's glitter. The waves too fine to see are not a blur: each patch of sea a pixel across holds a
        // few facets, and one of them, tilted just so, flashes the Sun at the eye. So most of the unseen slope is
        // drawn as one facet to a patch, its tilt taken from the same bell the roughness stands for (Cox and Munk:
        // slopes spread as a Gaussian of the day's mean square) and held a quarter of a second; the rest stays
        // roughness. Over many patches and moments the light sent back is what the roughness alone would send, but
        // near the eye it sparkles. From far enough that a pixel holds thousands of facets (6 m of sea to a pixel:
        // estimated) it is the smooth patch seen from orbit, and none of this is done.
        let sparkling = (1.0 - smoothstep(0.7, 6.0, seen_square)) * (1.0 - foam);
        var hidden = w.unseen;
        if sparkling > 0.0 {
            // (a patch is a power of two across, so that it holds still as the eye moves; where one size gives way to
            // the next is frayed, or the change would show as a line across the sea)
            let grid = exp2(ceil(log2(seen_square) + grain(en / (seen_square * 48.0), 96u) - 0.5));
            let facet = vec2<i32>(floor(en / grid));
            let own = lattice3(facet, 97u);
            let tick = i32(floor(clock * 4.0 + own.z * 4.0));
            let drawn = lattice3(facet + vec2(tick * 7919, tick * 104729), 98u);
            let share = 0.85 * sparkling * w.unseen;
            sea_slope += sqrt(-log(max(drawn.x, 1.0e-4)) * share) * vec2(cos(TAU * drawn.y), sin(TAU * drawn.y));
            hidden -= share;
        }
        // (the slopes too fine to see are the surface's roughness: a sea whose mean square slope is s scatters
        // the Sun as a surface of roughness sqrt(s) does, and the engine's is that one's square root)
        sea_rough = mix(clamp(sqrt(sqrt(hidden)), 0.16, 0.6), 0.7, foam);
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
    if earth.cloud.w > 0.5 && earth.sun.y > 0.05 {
        let sunward = earth.sun.xyz / earth.sun.y * earth.cloud.z;
        // (the clouds are laid out on the site's own level plane, east and north of it as the crow would fly through
        // the Earth, not over the ground: the two part by half a kilometre 500 km down range)
        let angle = range / EARTH;
        let level = en * (1.0 - angle * angle / 6.0) * (1.0 + earth.cloud.z / EARTH);
        let over = level + vec2(dot(sunward, earth.east.xyz), dot(sunward, earth.north.xyz)) - earth.wind.xy * clock;
        pbr.directional_shadow_factor = 1.0 - cloud_shade(over, clock, seen);
    }

    var out: FragmentOutput;
    out.color = apply_pbr_lighting(pbr);
    out.color = main_pass_post_lighting_processing(pbr, out.color);
    return out;
}

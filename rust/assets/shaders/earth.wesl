// The Earth's surface (sr-render/src/earth). The engine lights it as any surface; this says what the surface is
// at each point: the planet's colour from the cube map, the land near the site in the repo's palette, the shore
// from the region's map, and a sea that moves.

import bevy_pbr::render::{
    pbr_fragment::pbr_input_from_standard_material,
    forward_io::{VertexOutput, FragmentOutput},
    pbr_functions::{apply_pbr_lighting, main_pass_post_lighting_processing},
};

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
    // toward the Sun, and the clock (s)
    sun: vec4<f32>,
    // the cloud's drift, m/s east and north
    wind: vec4<f32>,
}

@group(constants::MATERIAL_BIND_GROUP) @binding(100) var<uniform> earth: EarthFrame;
@group(constants::MATERIAL_BIND_GROUP) @binding(101) var colour_map: texture_cube<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(102) var colour_sampler: sampler;
@group(constants::MATERIAL_BIND_GROUP) @binding(103) var shore_map: texture_2d<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(104) var shore_sampler: sampler;

// The ground's colours, linear (missions/usa/places/cape-canaveral/ground.ts PALETTE: estimated, from period
// colour photographs of the Cape, each cover one clear tone).
const SAND: vec3<f32> = vec3(0.694, 0.624, 0.423);
const SAND_DARK: vec3<f32> = vec3(0.509, 0.434, 0.254);
const HERB_DRY: vec3<f32> = vec3(0.397, 0.376, 0.133);
const HERB_GREEN: vec3<f32> = vec3(0.202, 0.296, 0.080);
const LEAF: vec3<f32> = vec3(0.036, 0.087, 0.028);
// The sea off the Cape, and its shallows (src/viewer/globe.ts SEA: estimated, against photographs from orbit).
const SEA: vec3<f32> = vec3(0.018, 0.07, 0.12);
const SHALLOWS: vec3<f32> = vec3(0.05, 0.19, 0.2);
const TAU: f32 = 6.2831853;

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

fn fbm2(p: vec2<f32>) -> f32 {
    var sum = 0.0;
    var weight = 0.5;
    var q = p;
    for (var i = 0; i < 4; i++) {
        sum += weight * noise2(q);
        q = q * 2.03 + 11.7;
        weight *= 0.5;
    }
    return sum / 0.9375;
}

// How much of the sky over a point of the ground is cumulus: 0 clear, 1 cloud. clouds.wesl has the same, and the
// two must be kept in step, or the shadows part from the clouds that sunward them.
fn cover_at(en: vec2<f32>, size: f32, cover: f32) -> f32 {
    let p = en / size;
    let field = noise2(p * 0.5 + 17.0) * 0.6 + noise2(p * 1.1 + 3.0) * 0.3 + noise2(p * 2.3 + 9.0) * 0.1;
    // (clouds.wesl `density`: the same threshold, and the cloud's edge where the noise leaves it)
    let threshold = 0.685 - 0.48 * cover;
    return smoothstep(threshold + 0.03, threshold + 0.1, field);
}

// One train of waves: the slope it gives the water, east and north.
fn wave(en: vec2<f32>, toward: vec2<f32>, length: f32, height: f32, clock: f32, keep: f32) -> vec2<f32> {
    let k = TAU / length;
    let phase = dot(en, toward) * k - sqrt(9.81 * k) * clock;
    return toward * (0.5 * height * k * cos(phase) * keep);
}

@fragment
fn fragment(in: VertexOutput, @builtin(front_facing) is_front: bool) -> FragmentOutput {
    var pbr = pbr_input_from_standard_material(in, is_front);
    let up = normalize(in.world_normal);
    let en = in.uv;
    let far = length(en);
    let clock = earth.sun.w;

    // The planet's own colour, by Earth-fixed direction.
    let fixed = earth.x.xyz * up.x + earth.y.xyz * up.y + earth.z.xyz * up.z;
    let marble = textureSample(colour_map, colour_sampler, fixed).rgb;
    let marble_sea = smoothstep(1.25, 1.9, marble.b / max(marble.r, 0.004));

    // The shore, sharp, where the region's map reaches; the cube map's beyond it.
    let half = earth.shore.x;
    let on_map = earth.shore.w * (1.0 - smoothstep(0.86 * half, 0.97 * half, max(abs(en.x), abs(en.y))));
    let shore_uv = vec2(0.5 + en.x / (2.0 * half + 1.0), 0.5 - en.y / (2.0 * half + 1.0));
    let field = textureSample(shore_map, shore_sampler, shore_uv).r;
    // metres to the shore, land positive
    let inland = (field * 255.0 - 128.0) / 127.0 * earth.shore.z * earth.shore.y;
    let edge = max(fwidth(inland), 0.5);
    let sea = mix(marble_sea, 1.0 - smoothstep(-edge, edge, inland), on_map);

    // The land near the site: sand, with herbs and scrub in patches, and the beach.
    let patches = fbm2(en / 190.0) * 0.6 + fbm2(en / 31.0 + 5.0) * 0.4;
    let cleared = smoothstep(90.0, 420.0, far);
    let growth = smoothstep(0.36, 0.66, patches) * cleared;
    var land = mix(mix(SAND, SAND_DARK, fbm2(en / 7.0)), HERB_DRY, smoothstep(0.0, 0.45, growth));
    land = mix(land, HERB_GREEN, smoothstep(0.4, 0.75, growth));
    land = mix(land, LEAF, smoothstep(0.72, 1.0, growth) * 0.85);
    land = mix(SAND, land, smoothstep(15.0, 90.0, inland));
    let near_land = on_map * (1.0 - smoothstep(6000.0, 40000.0, far));
    land = mix(marble, land, near_land);

    // The sea: the swell and the wind's waves give it its slopes; what is too fine to see is roughness instead.
    let blown = earth.wind.xy;
    let toward = select(vec2(-1.0, 0.0), normalize(blown), dot(blown, blown) > 0.0001);
    let across = vec2(-toward.y, toward.x);
    let seen = max(length(fwidth(en)), 0.001);
    var slope = vec2(0.0);
    var lost = 0.0;
    let trains = array<vec4<f32>, 6>(
        // wavelength (m), height (m), and how far off the wind it runs
        vec4(67.0, 0.96, 0.0, 0.0), vec4(41.0, 0.5, 0.35, 0.0), vec4(16.0, 0.55, -0.2, 0.0),
        vec4(9.0, 0.3, 0.5, 0.0), vec4(4.1, 0.16, -0.6, 0.0), vec4(1.7, 0.07, 0.25, 0.0),
    );
    for (var i = 0; i < 6; i++) {
        let train = trains[i];
        let heading = normalize(toward + across * train.z);
        let keep = saturate(train.x / (seen * 5.0) - 0.3);
        slope += wave(en, heading, train.x, train.y, clock, keep);
        let steep = 0.5 * train.y * TAU / train.x;
        lost += steep * steep * (1.0 - keep * keep);
    }
    let ripple = (vec2(noise2(en * 2.3 + clock * 0.7), noise2(en * 2.3 + 40.0 - clock * 0.6)) - 0.5) * 0.12;
    slope += ripple * saturate(0.6 / seen - 0.2);
    let water_n = normalize(up - earth.east.xyz * slope.x - earth.north.xyz * slope.y);
    let depth_tint = mix(SEA, SHALLOWS, on_map * smoothstep(-900.0, -20.0, inland));
    let water = mix(mix(marble, SEA, 0.75), depth_tint, near_land);

    pbr.material.base_color = vec4(mix(land, water, sea), 1.0);
    pbr.material.perceptual_roughness = mix(0.95, clamp(0.07 + 1.6 * sqrt(lost), 0.07, 0.5), sea);
    pbr.material.metallic = 0.0;
    pbr.material.reflectance = vec3(mix(0.3, 0.354, sea));
    pbr.N = normalize(mix(up, water_n, sea));
    pbr.world_normal = up;

    // The cumulus' shadows, moving with the wind: where the Sun's ray to this point passes through cloud.
    if earth.cloud.w > 0.5 && earth.sun.y > 0.02 {
        let sunward = earth.sun.xyz / earth.sun.y * earth.cloud.z;
        let over = en + vec2(dot(sunward, earth.east.xyz), dot(sunward, earth.north.xyz)) - blown * clock;
        pbr.directional_shadow_factor = 1.0 - 0.8 * cover_at(over, earth.cloud.y, earth.cloud.x);
    }

    var out: FragmentOutput;
    out.color = apply_pbr_lighting(pbr);
    out.color = main_pass_post_lighting_processing(pbr, out.color);
    return out;
}

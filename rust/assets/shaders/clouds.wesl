// The day's clouds (sr-render/src/clouds), marched from the eye through each layer's shell round the Earth.
//
// At every step that finds cloud a second, short march goes toward the Sun, so a cloud shades itself: bright
// where the Sun strikes it, grey-blue underneath, with the silver lining forward scattering gives. What stands in
// front of the cloud is found from the depth already drawn. All lengths are metres and all light is in the
// engine's physical units (lux, cd/m^2), exposed at the end as everything else is.

import bevy_pbr::render::{
    forward_io::VertexOutput,
    mesh_view_bindings::{view, globals},
    view_transformations::{frag_coord_to_ndc, position_ndc_to_world},
};
import bevy_pbr::prepass::utils::prepass_depth;

struct CloudFrame {
    // the vertical at the eye; w: the eye's height above the ground
    up: vec4<f32>,
    // east at the site; w: the ground's radius
    east: vec4<f32>,
    // north at the site; w: the clock
    north: vec4<f32>,
    // toward the Sun; w: how far one can see
    sun: vec4<f32>,
    sunlight: vec4<f32>,
    skylight: vec4<f32>,
    // the eye over the ground in the cumulus' drifting frame (east, north), then the deck's
    eye_over: vec4<f32>,
    // cover, base, depth, a cloud's size
    cumulus: vec4<f32>,
    deck: vec4<f32>,
}

@group(constants::MATERIAL_BIND_GROUP) @binding(0) var<uniform> frame: CloudFrame;
@group(constants::MATERIAL_BIND_GROUP) @binding(1) var volume: texture_3d<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(2) var volume_sampler: sampler;

// How much light a metre of cloud takes out of a ray: fair-weather cumulus is 0.03 to 0.1 a metre.
const EXTINCTION: f32 = 0.05;
// The shape noise repeats over this far, and the detail over this, m.
const SHAPE_TILE: f32 = 2300.0;
const DETAIL_TILE: f32 = 430.0;
// No cloud is marched beyond this, m.
const REACH: f32 = 700000.0;
const PI: f32 = 3.14159265;
// The light of the scattering orders that are not marched, as a gain on those that are: with it the sunlit side
// of a thick cloud is about as bright as white paint in the same Sun, which is what a cumulus is. Estimated.
const DEEPER_ORDERS: f32 = 2.6;
// How much of the Sun's light the land and sea under the cloud send back up. Estimated.
const GROUND_ALBEDO: f32 = 0.22;

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

// Where the clouds of a layer stand over the ground, before any is cut to shape: earth.wesl's `cover_at` is this
// field put through the same threshold, and the two must be kept in step.
fn field_at(en: vec2<f32>, size: f32) -> f32 {
    let p = en / size;
    return noise2(p * 0.5 + 17.0) * 0.6 + noise2(p * 1.1 + 3.0) * 0.3 + noise2(p * 2.3 + 9.0) * 0.1;
}

struct Slab {
    start: f32,
    end: f32,
}

// The two distances along a ray at which it crosses the sphere `shell` metres over the ground, the nearer first;
// both negative if it never does. `h` is the eye's height and `mu` the ray's cosine from the vertical. Written so
// that nothing large is taken from anything large: the Earth's radius is six million of these metres.
fn crossings(h: f32, mu: f32, shell: f32) -> vec2<f32> {
    let radius = frame.east.w;
    let b = (radius + h) * mu;
    let c = (h - shell) * (2.0 * radius + h + shell);
    let disc = b * b - c;
    if disc < 0.0 {
        return vec2(-1.0);
    }
    let root = sqrt(disc);
    if b >= 0.0 {
        let near_one = -b - root;
        return vec2(near_one, select(-1.0, c / near_one, near_one != 0.0));
    }
    let far_one = -b + root;
    return vec2(c / far_one, far_one);
}

// The stretch of a ray that lies inside a layer between `base` and `top`.
fn inside(h: f32, mu: f32, base: f32, top: f32) -> Slab {
    let under = crossings(h, mu, base);
    let above = crossings(h, mu, top);
    if h < base {
        // from below: in through the base, out through the top
        return Slab(under.y, above.y);
    }
    if h <= top {
        // from inside: out through the base if the ray goes down to it, else out through the top
        return Slab(0.0, select(above.y, under.x, under.x > 0.0));
    }
    // from above: in through the top, out through the base, or the top again if the ray misses the base
    if above.x <= 0.0 {
        return Slab(-1.0, -1.0);
    }
    return Slab(above.x, select(above.y, under.x, under.x > 0.0));
}

// How dense the cloud is at a point: its place over the ground in the layer's drifting frame, and its height.
fn density(en: vec2<f32>, h: f32, layer: vec4<f32>, fine: bool, banked: bool) -> f32 {
    let lifted = (h - layer.y) / layer.z;
    if lifted <= 0.0 || lifted >= 1.0 {
        return 0.0;
    }
    // A deck of cloudlets does not sprinkle the whole sky: it lies in banks, a quarter of the sky at most, and
    // within a bank it is that much thicker, so that the sky's cover is still the record's.
    var cover = layer.x;
    var bank = 1.0;
    if banked {
        bank = smoothstep(0.56, 0.66, noise2(en / (layer.w * 22.0) + 41.0));
        if bank <= 0.0 {
            return 0.0;
        }
        cover = min(layer.x * 4.0, 0.85);
    }
    let field = field_at(en, layer.w);
    // (the field's own quantiles, measured: a fraction `cover` of it lies above 0.74 - 0.48 cover; the cloud's
    // edge, once the noise has cut it, stands about 0.055 above this threshold)
    let threshold = 0.685 - 0.48 * cover;
    // How far inside its cloud a column stands: a slope, not a step, so that the noise has something to carve.
    let within = saturate((field - threshold) / 0.16) * bank;
    if within <= 0.0 {
        return 0.0;
    }
    // A flat base, and a top that is higher the further inside a column stands and where the air is heaping:
    // mounds, and a few towers.
    let p = vec3(en.x, h, en.y);
    let heap = textureSampleLevel(volume, volume_sampler, vec3(en.x, 0.0, en.y) / (SHAPE_TILE * 1.9), 0.0).r;
    let tall = mix(0.25, 1.0, smoothstep(0.1, 0.9, within)) * mix(0.55, 1.0, heap);
    let dome = smoothstep(0.0, 0.06, lifted) * (1.0 - smoothstep(0.15 * tall, tall, lifted));
    let body = within * dome;
    let shape = textureSampleLevel(volume, volume_sampler, p / SHAPE_TILE, 0.0).r;
    // (cut deeper toward the top: a base is whole, a top is knobs)
    let cut = (1.0 - shape) * mix(0.3, 0.62, lifted) + 0.06;
    var d = saturate((body - cut) / (1.0 - cut));
    if fine && d > 0.0 {
        // The edges fray: finer billows eat into what is thin.
        let detail = textureSampleLevel(volume, volume_sampler, p / DETAIL_TILE, 0.0).g;
        let eat = (1.0 - detail) * 0.16;
        d = saturate((d - eat) / (1.0 - eat));
    }
    // (cloud is cloud almost as soon as there is any: its water does not thin toward its edge as the slope does)
    d = saturate(d * 4.0);
    // (a deck's cloudlets are thin: the Sun comes through them)
    return d * EXTINCTION * select(1.0, 0.28, banked);
}

fn henyey_greenstein(cosine: f32, g: f32) -> f32 {
    let k = 1.0 + g * g - 2.0 * g * cosine;
    return (1.0 - g * g) / (4.0 * PI * k * sqrt(k));
}

// Forward and back together: the silver lining, and the glow of a cloud seen with the Sun behind the eye.
fn phase(cosine: f32, spread: f32) -> f32 {
    return mix(henyey_greenstein(cosine, -0.25 * spread), henyey_greenstein(cosine, 0.8 * spread), 0.62);
}

// How much cloud lies between a point and the Sun.
fn toward_sun(en: vec2<f32>, h: f32, layer: vec4<f32>, banked: bool) -> f32 {
    let sun = frame.sun.xyz;
    let level = vec2(dot(sun, frame.east.xyz), dot(sun, frame.north.xyz));
    let rise = dot(sun, frame.up.xyz);
    var depth = 0.0;
    var gone = 0.0;
    var stride = 45.0;
    for (var i = 0; i < 5; i++) {
        let at = gone + 0.5 * stride;
        depth += density(en + level * at, h + rise * at, layer, false, banked) * stride;
        gone += stride;
        stride *= 1.9;
    }
    return depth;
}

struct Seen {
    // light gathered, already weighted by how much of the cloud is in the way
    light: vec3<f32>,
    // how much of what is behind still shows
    through: f32,
    // how far off the cloud is, weighted by what it shows
    range: f32,
    weight: f32,
}

// March one layer along the ray from the eye and add what is seen to `seen`.
fn march(seen_in: Seen, ray: vec3<f32>, h: f32, mu: f32, limit: f32, layer: vec4<f32>, over: vec2<f32>, steps: i32, jitter: f32, banked: bool) -> Seen {
    var seen = seen_in;
    if layer.x <= 0.0 {
        return seen;
    }
    let slab = inside(h, mu, layer.y, layer.y + layer.z);
    let start = max(slab.start, 0.0);
    let end = min(min(slab.end, limit), REACH);
    if slab.end <= 0.0 || end <= start {
        return seen;
    }
    let level = vec2(dot(ray, frame.east.xyz), dot(ray, frame.north.xyz));
    let radius = frame.east.w + h;
    let cosine = dot(ray, frame.sun.xyz);
    // Long strides through clear air; on meeting cloud, back to where the air was last clear and through the
    // cloud in short ones. A cloud's light is in its skin, the first few metres the Sun reaches: strides that
    // land deep inside find only the shade there, and every cloud comes out grey.
    var t = start + jitter * clamp(0.035 * start, 25.0, 0.28 * layer.w);
    var short_left = 0;
    for (var i = 0; i < steps; i++) {
        if t >= end {
            break;
        }
        // (never so long that a whole cloud could stand between two of them)
        let long_stride = clamp(0.035 * t, 25.0, 0.28 * layer.w);
        let short_stride = max(0.006 * t, 9.0);
        // (the height there, exactly, and again with nothing large taken from anything large)
        let height = h + (2.0 * radius * mu * t + t * t) / (radius + sqrt(radius * radius + 2.0 * radius * mu * t + t * t));
        let en = over + level * t;
        let d = density(en, height, layer, true, banked);
        if d <= 0.0 {
            short_left = max(short_left - 1, 0);
            t += select(long_stride, short_stride, short_left > 0);
            continue;
        }
        if short_left == 0 {
            // (enough short strides to come back to here)
            short_left = 12;
            t = max(t - long_stride + short_stride * jitter, start);
            continue;
        }
        short_left = max(short_left, 4);
        let stride = short_stride;
        t += stride;
        let shade = toward_sun(en, height, layer, banked);
        // Light that has scattered once, and then again and again: each time weaker, deeper, and less directed.
        var sunlit = 0.0;
        var strength = 1.0;
        var reach = 1.0;
        var spread = 1.0;
        for (var bounce = 0; bounce < 4; bounce++) {
            sunlit += strength * exp(-shade * reach) * phase(cosine, spread);
            strength *= 0.6;
            reach *= 0.32;
            spread *= 0.5;
        }
        let lifted = saturate((height - layer.y) / layer.z);
        // The sky from above and round about, and from below the sunlit ground: that is what a base is lit by.
        let sky = frame.skylight.xyz * mix(0.5, 1.0, lifted);
        let ground = frame.sunlight.xyz * (GROUND_ALBEDO / PI) * max(dot(frame.sun.xyz, frame.up.xyz), 0.0) * (1.0 - 0.7 * lifted);
        let glow = frame.sunlight.xyz * sunlit * DEEPER_ORDERS + sky + ground;
        let stopped = 1.0 - exp(-d * stride);
        let shows = seen.through * stopped;
        seen.light += glow * shows;
        seen.range += t * shows;
        seen.weight += shows;
        seen.through *= 1.0 - stopped;
        if seen.through < 0.01 {
            seen.through = 0.0;
            break;
        }
    }
    return seen;
}

// A different fraction at every pixel and every frame, for the temporal anti-aliasing to average.
fn dither(at: vec2<f32>) -> f32 {
    let shifted = at + 5.588238 * f32(globals.frame_count % 64u);
    return fract(52.9829189 * fract(0.06711056 * shifted.x + 0.00583715 * shifted.y));
}

@fragment
fn fragment(
    @if(MULTISAMPLED) @builtin(sample_index) sample_index: u32,
    in: VertexOutput,
) -> @location(0) vec4<f32> {
    @if(!MULTISAMPLED) let sample_index = 0u;
    let ray = normalize(in.world_position.xyz - view.world_position);
    let h = frame.up.w;
    let mu = dot(ray, frame.up.xyz);

    // How far the ray goes before it meets something solid.
    var limit = REACH;
    @if(DEPTH_PREPASS) {
        let depth = prepass_depth(in.position, sample_index);
        if depth > 0.0 {
            let ndc = frag_coord_to_ndc(vec4(in.position.xy, depth, 1.0));
            limit = distance(position_ndc_to_world(ndc), view.world_position);
        }
    }

    let jitter = dither(in.position.xy);
    var seen = Seen(vec3(0.0), 1.0, 0.0, 0.0);
    // Nearest layer first: the cumulus from under the deck, the deck from over it.
    if h < frame.deck.y {
        seen = march(seen, ray, h, mu, limit, frame.cumulus, frame.eye_over.xy, 220, jitter, false);
        seen = march(seen, ray, h, mu, limit, frame.deck, frame.eye_over.zw, 48, jitter, true);
    } else {
        seen = march(seen, ray, h, mu, limit, frame.deck, frame.eye_over.zw, 48, jitter, true);
        seen = march(seen, ray, h, mu, limit, frame.cumulus, frame.eye_over.xy, 220, jitter, false);
    }
    if seen.weight <= 0.0 {
        discard;
    }

    // The air between the eye and the cloud: distant cloud goes the colour of the horizon.
    let range = seen.range / seen.weight;
    // (from above the haze only the last of the way to the cloud is through it: the air is thin above 9 km)
    let hazy = select(range, min(range, 9000.0 / max(abs(mu), 0.05)), h > 9000.0);
    let haze = 1.0 - exp(-3.912 * hazy / frame.sun.w);
    let veil = (frame.skylight.xyz * 1.3 + frame.sunlight.xyz * 0.035) * (1.0 - seen.through);
    let light = mix(seen.light, veil, haze * 0.85);
    return vec4(light * view.exposure, 1.0 - seen.through);
}

// The stars (sr-render/src/night/stars.rs): every catalogue star as a small soft point at its place, its light in
// physical units (lux above the air) spread over the pixels it covers, so the exposure decides what is seen. Drawn
// before the sky, with no depth of its own: the atmosphere's pass then dims and reddens it by the air it is seen
// through and lays the sky's light over it, and the Earth, the cloud and the vehicle stand in front by depth.

import bevy_pbr::render::mesh_view_bindings::{view, globals};

struct StarSky {
    // J2000 to the site's frame, as three columns
    turn_x: vec4<f32>,
    turn_y: vec4<f32>,
    turn_z: vec4<f32>,
    // the eye's up; w: how much of the air is above the eye (1 at the sea, 0 above it)
    up: vec4<f32>,
    // x: how far the stars are drawn, m; y: how strongly they are drawn (1: as they are)
    far: vec4<f32>,
}

@group(constants::MATERIAL_BIND_GROUP) @binding(0) var<uniform> sky: StarSky;

struct Vertex {
    @builtin(vertex_index) index: u32,
    @location(0) toward: vec3<f32>,
    @location(1) corner: vec2<f32>,
    @location(2) light: vec4<f32>,
}

struct Out {
    @builtin(position) clip: vec4<f32>,
    // pixels from the star's middle
    @location(0) offset: vec2<f32>,
    // its light, lux, as linear colour; w: the blur's spread, pixels
    @location(1) light: vec4<f32>,
}

// How far the air lifts a body at this elevation (radians), radians: Saemundsson's formula (Meeus 16.4).
fn lifted(elevation: f32) -> f32 {
    let h = max(degrees(elevation), -1.0);
    return radians(1.02 / tan(radians(h + 10.3 / (h + 5.11))) / 60.0);
}

fn hash(n: f32) -> f32 {
    return fract(sin(n * 12.9898) * 43758.5453);
}

@vertex
fn vertex(v: Vertex) -> Out {
    var out: Out;
    let turn = mat3x3(sky.turn_x.xyz, sky.turn_y.xyz, sky.turn_z.xyz);
    var toward = normalize(turn * v.toward);
    let up = sky.up.xyz;
    let air = sky.up.w;
    // lifted by the air toward the zenith
    let s = dot(toward, up);
    let across = normalize(up - toward * s + vec3(1e-6, 0.0, 0.0));
    let lift = lifted(asin(clamp(s, -1.0, 1.0))) * air;
    toward = toward * cos(lift) + across * sin(lift);
    // A little scintillation low down, where the light crosses the most air: each star its own, some ten times a
    // second. Estimated: a few tens of per cent at the horizon on a steady night, nothing overhead.
    let star = f32(v.index / 4u);
    let low = air * (1.0 - smoothstep(0.0, 0.5, s));
    let twinkle = 1.0 + 0.35 * low * sin(globals.time * (9.0 + 7.0 * hash(star)) + 6.283 * hash(star + 0.5));
    let lux = v.light.rgb * 1e-6 * twinkle * sky.far.y;
    // the blur: some two thirds of a pixel, as a good lens holds a star, so it moves smoothly over the pixels as the
    // view turns and neither twinkles nor pops; the brightest are made larger by the bloom, as by an eye or a lens
    let spread = 0.7;
    let reach = spread * 3.5;
    var clip = view.clip_from_world * vec4(toward * sky.far.x, 1.0);
    clip = vec4(clip.xy + v.corner * reach * 2.0 / view.viewport.zw * clip.w, clip.zw);
    out.clip = clip;
    out.offset = v.corner * reach;
    out.light = vec4(lux, spread);
    return out;
}

@fragment
fn fragment(in: Out) -> @location(0) vec4<f32> {
    let spread = in.light.w;
    let r2 = dot(in.offset, in.offset);
    // the share of the star's light that falls on this pixel, over the pixel's solid angle: a luminance
    let share = exp(-r2 / (2.0 * spread * spread)) / (6.2831853 * spread * spread);
    let pixel = 2.0 / (view.clip_from_view[1][1] * view.viewport.w);
    let luminance = in.light.rgb * share / (pixel * pixel);
    if share < 1e-4 {
        discard;
    }
    return vec4(luminance * view.exposure, 1.0);
}

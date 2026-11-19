// Rays of light in the haze (sr-render/src/clouds/rays.rs): crepuscular rays, worked on the picture and not in the
// air. Where the sky round the Sun shows between clouds, the haze in front of it is lit along the line to the Sun,
// and where a cloud stands in the way it is not; so the frame's own picture of what is open sky (the march's
// clouds and what is solid) is smeared toward the Sun's place on the screen, fading as it goes, and what comes of it
// is added as light the haze throws forward. It is an image-space approximation of the in-scattering in shadowed
// haze at scales the march does not resolve, as games of the time did it (Dragon Rising among them), not a
// measurement; its strength is estimated, by eye against photographs of rays from fair-weather cumulus.

import bevy_core_pipeline::fullscreen_vertex_shader::FullscreenVertexOutput;
import bevy_render::view::View;
import bevy_render::globals::Globals;
import super::clouds_frame::CloudFrame;

// (clouds/rays.rs `lay_pipe`: the order of these is its order)
@group(0) @binding(0) var<uniform> view: View;
@group(0) @binding(1) var<uniform> globals: Globals;
@group(0) @binding(2) var<uniform> frame: CloudFrame;
@group(0) @binding(3) var cloud_marched: texture_2d<f32>;
@group(0) @binding(4) var reach_marched: texture_2d<f32>;
@group(0) @binding(5) var clamped: sampler;

const PI: f32 = 3.14159265;
// Readings along the way to the Sun.
const SAMPLES: i32 = 48;
// How much each reading counts against the one before it, on the way out from the pixel.
const DECAY: f32 = 0.99;
// How far toward the Sun the readings reach, as a share of the way.
const REACH: f32 = 1.0;
// How wide the bright sky round the Sun is that the rays are of, radians (a glow, not the disc).
const SOURCE: f32 = 0.08;
// How strongly the haze throws the Sun's light forward along the rays (Henyey-Greenstein asymmetry), and how much
// of the light the rays add. Estimated, by eye.
const FORWARD: f32 = 0.75;
const STRENGTH: f32 = 5.0;
// (see `lit` below)
const EDGE_GAIN: f32 = 1.0;
const SHADOW_GAIN: f32 = 0.08;
// Where a march's ray went no further than this, km, it met something solid (clouds.wesl REACH less a little).
const OPEN_SKY: f32 = 699.0;
// Switch: off, there are no rays (for measuring what they cost, and for comparing). Leave it on.
const RAYS: bool = true;
// A cloud's light, against white paint in the Sun, from which on it counts as a blazing edge, and wholly. By eye.
const RIM_FROM: f32 = 0.9;
const RIM_TO: f32 = 2.0;

fn henyey_greenstein(cosine: f32, g: f32) -> f32 {
    let k = 1.0 + g * g - 2.0 * g * cosine;
    return (1.0 - g * g) / (4.0 * PI * k * sqrt(k));
}

// How much open sky near the Sun there is at a place on the screen: none where something solid stands, less where a
// cloud does, and the more the nearer the Sun.
// `x` the bright sky the place would show with nothing in the way, `y` what it does show.
fn open_sky(at: vec2<f32>, sun_at: vec2<f32>, size: vec2<f32>, per_unit: vec2<f32>, white: f32) -> vec2<f32> {
    let off = length((at - sun_at) * per_unit);
    let bright = exp(-(off * off) / (SOURCE * SOURCE));
    let texel = vec2<i32>(clamp(at, vec2(0.0), vec2(0.999)) * size);
    if textureLoad(reach_marched, texel, 0).y < OPEN_SKY {
        return vec2(bright, 0.0);
    }
    let cloud = textureSampleLevel(cloud_marched, clamped, at, 0.0);
    // (what shows of the sky through thin cloud, and a cloud's own edge where the Sun blazes through it: the silver
    // lining is as much a source of rays as the open sky, and it is what is ragged)
    let face = dot(cloud.rgb, vec3(0.2126, 0.7152, 0.0722)) / white;
    let shows = (1.0 - cloud.a) + cloud.a * smoothstep(RIM_FROM, RIM_TO, face);
    return vec2(bright, bright * shows);
}

@fragment
fn fragment(in: FullscreenVertexOutput) -> @location(0) vec4<f32> {
    let sun = frame.sun.xyz;
    if !RAYS || dot(sun, frame.up.xyz) < 0.0 {
        return vec4(0.0);
    }
    // Where the Sun is on the screen; none of this when it is behind the eye.
    let s = view.unjittered_clip_from_world * vec4(sun, 0.0);
    if s.w <= 1.0e-4 {
        return vec4(0.0);
    }
    let sun_at = vec2(s.x / s.w * 0.5 + 0.5, 0.5 - s.y / s.w * 0.5);
    // (fading as the Sun leaves the screen: the rays are of the sky round it)
    let edge = max(abs(sun_at.x - 0.5), abs(sun_at.y - 0.5));
    let on_screen = 1.0 - smoothstep(0.5, 1.2, edge);
    if on_screen <= 0.0 {
        return vec4(0.0);
    }
    let size = vec2<f32>(textureDimensions(reach_marched));
    // (a screen unit in radians, each way)
    let per_unit = vec2(2.0 / view.clip_from_view[0][0], 2.0 / view.clip_from_view[1][1]);
    let uv = in.uv;
    let jitter = fract(52.9829189 * fract(dot(in.position.xy + f32(globals.frame_count % 64u) * 5.588, vec2(0.0671, 0.0058))));
    let stride = (sun_at - uv) * (REACH / f32(SAMPLES));
    // (how bright white paint is in this Sun, exposed: what a cloud's rim is measured against)
    let white = max(dot(frame.sunlight.xyz, vec3(0.2126, 0.7152, 0.0722)) * view.exposure / PI, 1.0e-4);
    var sum = vec2(0.0);
    var weight = 0.0;
    var decay = 1.0;
    for (var i = 0; i < SAMPLES; i++) {
        let at = uv + stride * (f32(i) + jitter);
        sum += open_sky(at, sun_at, size, per_unit, white) * decay;
        weight += decay;
        decay *= DECAY;
    }
    // What is lit, against what would be with nothing in the way (`f`). Where the way to the Sun is all open or all
    // shut nothing is added: the march has the haze's glow and its shadow. Where it is part shut, it crosses the
    // edge of what stands before the Sun, and there the rays are: bright, fanning out from the gaps (EDGE_GAIN), and
    // a little darker inside the shadow (SHADOW_GAIN), so the bright ones have dark ones between.
    let open = sum.x / weight;
    let f = sum.y / max(sum.x, 1.0e-6);
    let lit = open * (EDGE_GAIN * 4.0 * f * (1.0 - f) - SHADOW_GAIN * (1.0 - f));
    // The ray of this pixel: how much haze lies along it (the march's transmittance through the haze to what it met)
    // and the angle it makes with the Sun.
    let pixel = vec2<i32>(floor(in.position.xy));
    let behind = textureLoad(reach_marched, pixel, 0).z;
    // (not over a cloud's face: the haze before a cloud a kilometre off is too little to hold rays)
    let clear = 1.0 - textureLoad(cloud_marched, pixel, 0).a;
    let ndc = vec2(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0);
    let near = view.world_from_clip * vec4(ndc, 1.0, 1.0);
    let ray = normalize(near.xyz / near.w - view.world_position);
    let phase = henyey_greenstein(dot(ray, sun), FORWARD);
    let light = frame.sunlight.xyz * phase * (1.0 - behind) * clear * lit * STRENGTH * on_screen;
    let out = light * view.exposure;
    // (darker where shadowed: the laying-on keeps the sum of light from going below nothing)
    return vec4(select(vec3(0.0), clamp(out, vec3(-6.0e4), vec3(6.0e4)), all(out == out)), 0.0);
}

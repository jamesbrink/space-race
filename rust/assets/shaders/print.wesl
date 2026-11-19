// The print (sr-render/src/print.rs), made from the developed frame after the tone curve.
//
// The frame here is light as the screen will show it, not yet coded for the screen. Everything below is done in
// the screen's own coding (near enough: a 2.2 power), where equal steps look equal: colour held back, the middle
// pulled apart about a pivot, the shade and the light each toned as a soft light, the black lifted, the corners
// darkened, and grain, strongest in the middle greys as a print's is.

import bevy_core_pipeline::fullscreen_vertex_shader::FullscreenVertexOutput;

@group(0) @binding(0) var screen_texture: texture_2d<f32>;
@group(0) @binding(1) var texture_sampler: sampler;

struct Print {
    // what the shade and the light are toned toward (rgb) and how strongly (a)
    shade: vec4<f32>,
    light: vec4<f32>,
    colour: f32,
    contrast: f32,
    pivot: f32,
    gain: f32,
    corners: f32,
    falloff: f32,
    grain: f32,
    // which frame this is
    frame: f32,
}

@group(0) @binding(2) var<uniform> print: Print;

const LUMA = vec3<f32>(0.2126, 0.7152, 0.0722);
// What a colour is taken for grey as when its colour is held back: blue counted for more than the eye counts it,
// as a bleached print does, so a blue sky pales instead of going dark.
const BLEACH = vec3<f32>(0.3, 0.48, 0.22);

// Three fractions for a place and a frame, well mixed.
fn hash33(p: vec3<f32>) -> vec3<f32> {
    var q = fract(p * vec3(0.1031, 0.1030, 0.0973));
    q += dot(q, q.yxz + 33.33);
    return fract((q.xxy + q.yxx) * q.zyx);
}

// An S about the pivot that leaves black black and white white: a logistic curve, stretched back to 0..1.
fn pulled(x: vec3<f32>, hardness: f32, pivot: f32) -> vec3<f32> {
    if hardness <= 0.001 {
        return x;
    }
    let low = 1.0 / (1.0 + exp(hardness * pivot));
    let high = 1.0 / (1.0 + exp(-hardness * (1.0 - pivot)));
    let curved = 1.0 / (1.0 + exp(-hardness * (x - pivot)));
    return (curved - low) / (high - low);
}

// A colour laid over the frame as a soft light: mid grey leaves it alone, darker darkens, lighter lightens.
fn soft_light(under: vec3<f32>, over: vec3<f32>) -> vec3<f32> {
    return (1.0 - 2.0 * over) * under * under + 2.0 * over * under;
}

@fragment
fn fragment(in: FullscreenVertexOutput) -> @location(0) vec4<f32> {
    let developed = textureSampleLevel(screen_texture, texture_sampler, in.uv, 0.0);
    var coded = pow(clamp(developed.rgb, vec3(0.0), vec3(1.0)), vec3(1.0 / 2.2));

    // exposure, then colour held back, then the middle pulled apart
    coded = clamp(coded * print.gain, vec3(0.0), vec3(1.0));
    coded = mix(vec3(dot(coded, BLEACH)), coded, print.colour);
    coded = clamp(pulled(coded, print.contrast, print.pivot), vec3(0.0), vec3(1.0));

    // the grey mapped from the shade's colour to the light's and laid over the frame as a soft light
    let tone = mix(print.shade.rgb, print.light.rgb, dot(coded, LUMA));
    coded = mix(coded, soft_light(coded, tone), print.shade.a);

    // the corners let go: a gradient from the middle to the corners, taken to a power, its floor raised
    let across = (in.uv - 0.5) * vec2(16.0, 9.0);
    let middle = 1.0 - clamp(length(across) / length(vec2(8.0, 4.5)), 0.0, 1.0);
    coded *= mix(print.corners, 1.0, pow(middle, print.falloff));

    // grain: two draws summed (a bell, as a count of silver grains is), mostly the same in all three colours
    let draw = hash33(vec3(in.position.xy, print.frame)) + hash33(vec3(in.position.yx + 17.0, print.frame + 31.0)) - 1.0;
    let speck = mix(vec3(draw.x), draw, 0.25);
    let lit = dot(coded, LUMA);
    let shows = 4.0 * lit * (1.0 - lit) * 0.8 + 0.2 * (1.0 - lit);
    coded = max(coded + speck * print.grain * shows, vec3(0.0));

    return vec4(pow(coded, vec3(2.2)), developed.a);
}

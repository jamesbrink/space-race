// An engine's fire (sr-render/src/plume). Two shells of light: how bright each point is follows how squarely
// the shell is seen there, so the flame is dense through its middle and thins to nothing at its edge, as a
// volume of glowing gas does. It is added to what is behind it and writes no depth.

import bevy_pbr::render::{
    forward_io::VertexOutput,
    mesh_view_bindings::{view, globals},
};

struct Fire {
    core: vec4<f32>,
    hot: vec4<f32>,
    warm: vec4<f32>,
    cool: vec4<f32>,
    thin: vec4<f32>,
    // how hard it burns, how far it has spread, how bright its heart is, whether this is the inner flame
    state: vec4<f32>,
}

@group(constants::MATERIAL_BIND_GROUP) @binding(0) var<uniform> fire: Fire;

fn hash11(p: f32) -> f32 {
    var q = fract(p * 0.1031);
    q *= q + 33.33;
    return fract((q + q) * q);
}

fn noise1(p: f32) -> f32 {
    let i = floor(p);
    let f = fract(p);
    return mix(hash11(i), hash11(i + 1.0), f * f * (3.0 - 2.0 * f));
}

@fragment
fn fragment(in: VertexOutput) -> @location(0) vec4<f32> {
    let along = in.uv.x;
    let burning = fire.state.x;
    let spread = fire.state.y;
    let inner = fire.state.w;
    let toward_eye = normalize(view.world_position - in.world_position.xyz);
    let squarely = abs(dot(normalize(in.world_normal), toward_eye));

    // Dense through the middle, nothing at the edge; brightest at the nozzle, gone at the tip.
    let through = pow(squarely, mix(1.6, 1.1, inner));
    let left = pow(1.0 - along, mix(1.3, 0.8, inner));
    // The flame is never still: it runs down itself, faster than the eye follows.
    let clock = globals.time;
    let run = noise1(along * 9.0 - clock * 31.0) * 0.5 + noise1(along * 23.0 - clock * 57.0 + 7.0) * 0.5;
    let flicker = mix(1.0, 0.55 + 0.9 * run, smoothstep(0.05, 0.6, along));
    // At sea level the jet is squeezed and swells by turns: the diamonds. They go as it spreads.
    let diamonds = 1.0 + 0.45 * cos(along * 44.0) * (1.0 - smoothstep(0.0, 0.5, along)) * (1.0 - smoothstep(1.0, 2.2, spread));

    let heat = through * left * flicker * diamonds;
    var colour = mix(fire.cool.rgb, fire.warm.rgb, smoothstep(0.0, 0.35, heat));
    colour = mix(colour, fire.hot.rgb, smoothstep(0.25, 0.7, heat));
    colour = mix(colour, fire.core.rgb, smoothstep(0.6, 1.0, heat) * mix(0.5, 1.0, inner));
    // In thin air the fire is a pale fan: fainter by as much as it has spread, and bluer.
    colour = mix(colour, fire.thin.rgb, smoothstep(1.5, 5.0, spread) * 0.8);
    let faint = 1.0 / (spread * spread);
    let light = colour * heat * heat * burning * fire.state.z * mix(0.55, 1.0, inner) * faint;
    return vec4(light * view.exposure, 0.0);
}

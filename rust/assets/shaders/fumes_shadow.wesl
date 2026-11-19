// The shadow of the dust and vapour round the pad (sr-render/src/fumes), in the Sun's shadow maps.
//
// A shadow map holds one depth a texel, and fumes are not solid: so each texel of the Sun's view either lets
// its sunbeam by or stops it, by chance, as often as the fumes on that beam would stop it (the solver's `shade`
// volume says how much they take), and a stopped beam is stopped where, along it, as much of the fumes lie
// before as the chance says. Over the few texels the engine's shadow filter reads, the chances average to the
// shade the fumes really cast, at every depth: on the ground under them, on the vehicle among them and on the
// fumes themselves (stochastic shadow maps: Enderton et al., Stochastic Transparency, 2010; McGuire and
// Enderton, Colored Stochastic Shadow Maps, 2011). In any other light's shadow maps the fumes cast nothing.

import bevy_pbr::prepass::io::VertexOutput;
import bevy_pbr::render::{mesh_functions, mesh_view_bindings::view};

import super::fumes_frame::{Fume, Source};

@group(constants::MATERIAL_BIND_GROUP) @binding(0) var<uniform> fume: Fume;
@group(constants::MATERIAL_BIND_GROUP) @binding(1) var stuff: texture_3d<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(2) var stuff_sampler: sampler;
@group(constants::MATERIAL_BIND_GROUP) @binding(5) var shade: texture_3d<f32>;

// A chance that is different at every texel of the shadow map, and even over any few of them together.
fn chance(at: vec2<f32>) -> f32 {
    return fract(52.9829189 * fract(0.06711056 * at.x + 0.00583715 * at.y));
}

@fragment
fn fragment(in: VertexOutput) -> @builtin(frag_depth) f32 {
    var suns = false;
    @if(VIEW_PROJECTION_ORTHOGRAPHIC) {
        suns = true;
    }
    if !suns {
        discard;
    }
    // Where this sunbeam crosses the Sun's view of the box.
    let room = fume.size.xyz;
    let inward = mesh_functions::get_local_from_world(in.instance_index);
    let outward = mesh_functions::get_world_from_local(in.instance_index);
    let p = ((inward * vec4(in.world_position.xyz, 1.0)).xyz * 0.5 + 0.5) * room;
    let off = p - 0.5 * room;
    let spot = vec2(dot(off, fume.sun_a.xyz), dot(off, fume.sun_b.xyz)) / fume.sun.w + 0.5;
    let beam = textureSampleLevel(shade, stuff_sampler, vec3(spot, 0.5), 0.0);
    let luck = chance(in.position.xy);
    if beam.x <= 0.0 || luck <= exp(-beam.x) {
        discard;
    }
    // Stopped: as far along the beam, from the Sun's side, as the chance says.
    let part = saturate(-log(luck) / beam.x);
    let along = -mix(beam.y, beam.z, part);
    let stopped = 0.5 * room + (fume.sun_a.xyz * (spot.x - 0.5) + fume.sun_b.xyz * (spot.y - 0.5)) * fume.sun.w
        + fume.sun.xyz * along;
    let world = outward * vec4((stopped / room * 2.0 - 1.0), 1.0);
    let clip = view.clip_from_world * vec4(world.xyz, 1.0);
    return clip.z / clip.w;
}

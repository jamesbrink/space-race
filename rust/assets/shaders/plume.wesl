// An engine's fire (sr-render/src/plume): a volume of glowing gas, marched from the eye through the box that
// holds it. The gas is where a jet of its pressure would be in air of this pressure (plume/jet.rs works the
// figures): a supersonic core that swells and narrows by turns in shock cells, a shear layer round it that burns
// in the air, a turbulent body where the two have mixed, and where the jet strikes the ground a sheet thrown out
// along it. In thin air the jet swells and a fan of gas turns out at the lip. Its streaks run down it with the
// flight's clock. All lengths are metres along the jet (s) and out from its axis (r); light is in the engine's
// physical units and is exposed at the end as everything else is.

import bevy_pbr::render::{
    forward_io::VertexOutput,
    mesh_functions,
    mesh_view_bindings::{view, globals},
    view_transformations::{frag_coord_to_ndc, position_ndc_to_world},
};
import bevy_pbr::prepass::utils::prepass_depth;

struct Jet {
    core: vec4<f32>,
    hot: vec4<f32>,
    warm: vec4<f32>,
    cool: vec4<f32>,
    thin: vec4<f32>,
    // the exit's radius, the settled jet's radius, a shock cell's length, the supersonic core's length
    shape: vec4<f32>,
    // how hard it burns, how much air there is, light from a metre of its heart, what a metre of it hides
    state: vec4<f32>,
    // how fast its streaks run (1/s), the clock, how far down the jet the ground is, where the fire ends
    flow: vec4<f32>,
    // the shock cells' strength (signed), the tangent of the lip's turn, the box's radius and length
    bounds: vec4<f32>,
}

@group(constants::MATERIAL_BIND_GROUP) @binding(0) var<uniform> jet: Jet;

const TAU: f32 = 6.2831853;
// Steps through the box: the field is smooth, and each pixel's steps are staggered frame by frame.
const STEPS: i32 = 36;
// A streak is this many exit radii long at the nozzle and lengthens by this much a metre. Estimated.
const STREAK: f32 = 5.0;
const STREAK_GROWS: f32 = 0.45;
// The turbulent body widens by this much a metre (a free jet's half-width grows as 0.085 x).
const WIDENS: f32 = 0.085;
// The sheet along the ground: how far it reaches at full strength, m, how thick it is at the strike and how
// much thicker a metre out. Estimated from stills of MR-3's liftoff (orange for three to four metres).
const SHEET_REACH: f32 = 3.4;
const SHEET_THICK: f32 = 0.35;
const SHEET_THICKENS: f32 = 0.18;

fn hash31(p: vec3<f32>) -> f32 {
    var q = fract(p * vec3(0.1031, 0.1030, 0.0973));
    q += dot(q, q.yxz + 33.33);
    return fract((q.x + q.y) * q.z);
}

fn noise3(p: vec3<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);
    let x00 = mix(hash31(i), hash31(i + vec3(1.0, 0.0, 0.0)), u.x);
    let x10 = mix(hash31(i + vec3(0.0, 1.0, 0.0)), hash31(i + vec3(1.0, 1.0, 0.0)), u.x);
    let x01 = mix(hash31(i + vec3(0.0, 0.0, 1.0)), hash31(i + vec3(1.0, 0.0, 1.0)), u.x);
    let x11 = mix(hash31(i + vec3(0.0, 1.0, 1.0)), hash31(i + vec3(1.0, 1.0, 1.0)), u.x);
    return mix(mix(x00, x10, u.y), mix(x01, x11, u.y), u.z);
}

// Where along its run a streak that is now `s` metres down the jet began: streaks lengthen as they go, so this
// is the logarithm that makes their run even, and the clock carries them down.
fn run(s: f32) -> f32 {
    let first = STREAK * jet.shape.x;
    return log(1.0 + STREAK_GROWS * s / first) / STREAK_GROWS - jet.flow.x * jet.flow.y;
}

struct Gas {
    // light given by a metre of it, before its colour: its heart and its cooler body
    heart: f32,
    body: f32,
    // how far it has cooled, 0 at the nozzle to 1 where it goes out
    cooled: f32,
}

// The free jet at `s` metres down it and `r` out, at `q` in its own frame.
fn free_jet(q: vec3<f32>, s: f32, r_in: f32) -> Gas {
    let exit = jet.shape.x;
    let settled = jet.shape.y;
    let cell = jet.shape.z;
    let core = jet.shape.w;
    let air = jet.state.y;
    let ends = jet.flow.w;
    // The jet's edge: at the exit's radius, then swelling or narrowing to its own and back, less each cell.
    let cells = cos(TAU * s / cell) * exp(-s / (0.7 * core));
    let edge = settled + (exit - settled) * cells;
    // The turbulent body it becomes, widening from part way down the core.
    let wide = 0.75 * edge + WIDENS * max(s - 0.4 * core, 0.0);
    let streak = noise3(vec3(q.x / (0.5 * wide), run(s) * 1.0, q.z / (0.5 * wide)));
    let roll = noise3(vec3(q.x / (0.28 * wide), run(s) * 2.3 + 17.0, q.z / (0.28 * wide)));
    // (its outline is not a ruled line: the eddies push it about, more the further down)
    let r = r_in * (1.0 + 0.3 * (roll - 0.5) * smoothstep(0.0, 0.6 * core, s));

    // The heart: gas straight from the nozzle, inside the shear layer, gone where the layer has eaten it.
    let layer = edge * mix(0.18, 0.85, saturate(s / core));
    // (swollen many times over in thin air it has no edge to speak of: it thins outward, as any gas let go)
    let swollen = smoothstep(2.0, 10.0, settled / exit);
    let inside = mix(1.0 - smoothstep(edge - layer, edge, r), exp(-pow(r / (0.55 * edge), 2.0)), swollen);
    // Where the jet is squeezed its gas is hot and bright, where it has swollen thin and dim: the diamonds,
    // each a lozenge on the axis.
    let squeezed = cells * sign(settled - exit) * abs(jet.bounds.x) * (1.0 - swollen);
    let lozenge = 1.0 - smoothstep(0.0, edge * (0.45 + 0.4 * squeezed), r);
    let dense = (exit * exit) / (edge * edge);
    var heart = inside * dense * (1.0 + 1.6 * squeezed * lozenge) * (1.0 - smoothstep(0.5 * core, 1.15 * core, s));
    // (straight from the throat it is at its hottest for a few exit widths; and it is streaked, never even)
    let fine = noise3(vec3(q.x / (0.16 * wide), run(s) * 3.1 + 5.0, q.z / (0.16 * wide)));
    heart *= (1.0 + 1.4 * exp(-s / (4.0 * exit))) * mix(0.45 + 0.7 * streak + 0.5 * fine, 0.8 + 0.4 * streak, swollen);
    // (and with no air to hold it to a width it goes on thinning, as the square of how far it has gone)
    heart *= mix(1.0, 1.0 / (1.0 + pow(s / (6.0 * settled), 2.0)), swollen);

    // The shear layer burning in the air, and the turbulent body downstream of the core.
    let ring = exp(-pow((r - edge) / max(layer * 0.6, 0.03), 2.0)) * air * (0.35 + 0.9 * roll);
    let spent = (exit * exit) / (wide * wide);
    // (it is the air it mixes with that makes this body: in none there is none)
    let mixed = exp(-pow(r / wide, 2.0)) * spent * smoothstep(0.15 * core, 0.9 * core, s) * (0.25 + 1.5 * streak * roll)
        * smoothstep(0.0, 0.3, air);
    let fades = 1.0 - smoothstep(0.45 * ends, ends, s);
    let body = (0.45 * ring * (1.0 - smoothstep(0.3 * core, core, s)) + 1.4 * mixed) * fades;

    // In thin air: a fan of gas turned out at the lip, thinning as the square of how far it has spread.
    let turn = jet.bounds.y;
    let fan_edge = exit + turn * s;
    let fan = smoothstep(0.05, 0.6, turn) * (1.0 - smoothstep(0.55 * fan_edge, fan_edge, r))
        * (exit * exit) / (fan_edge * fan_edge) * (0.7 + 0.6 * streak);
    return Gas(heart, body + 0.5 * fan, saturate(s / ends));
}

// The sheet the jet throws out along the ground it strikes: `high` metres above it and `away_in` from the strike.
fn sheet(q: vec3<f32>, high: f32, away_in: f32) -> Gas {
    let ground = jet.flow.z;
    let ends = jet.flow.w;
    // How much of the fire reaches the ground at all.
    let strikes = saturate(1.25 - ground / ends);
    if strikes <= 0.0 || high < -0.05 {
        return Gas(0.0, 0.0, 1.0);
    }
    let reach = SHEET_REACH * strikes;
    let clock = jet.flow.x * jet.flow.y;
    // (read across a turned grid, so that the tongues do not line up with the pad's own lines)
    let across = vec2(q.x * 0.8 - q.z * 0.6, q.x * 0.6 + q.z * 0.8);
    let lick = noise3(vec3(across * 0.9, away_in * 0.7 - clock * 1.7));
    let curl = noise3(vec3(across.yx * 2.3 + 9.0, high * 2.5 - clock * 1.3));
    let away = away_in * (0.75 + 0.5 * lick);
    // It stands taller the further out it has rolled.
    let thick = SHEET_THICK + SHEET_THICKENS * away * (0.5 + 1.2 * curl);
    let along = exp(-away / reach) * smoothstep(0.0, 0.4 * jet.shape.x, away + 0.2);
    // Tongues of it, not a disc: bright where a lick and a curl meet, dimmer between them.
    let tongues = 0.25 + 0.75 * smoothstep(0.2, 0.8, 0.6 * lick + 0.4 * curl);
    let body = strikes * along * exp(-max(high, 0.0) / thick) * tongues;
    return Gas(0.0, 2.2 * body, saturate(0.3 + 0.55 * away / reach));
}

// A fraction that is different at every pixel and every frame, for the temporal anti-aliasing to average.
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
    let burning = jet.state.x;
    if burning <= 0.0 {
        discard;
    }
    // The eye and its ray in the box's own frame, in metres: the box is two units a side, scaled to its size.
    let halves = vec3(jet.bounds.z, 0.5 * jet.bounds.w, jet.bounds.z);
    let inward = mesh_functions::get_local_from_world(in.instance_index);
    let eye = (inward * vec4(view.world_position, 1.0)).xyz * halves;
    let there = (inward * vec4(in.world_position.xyz, 1.0)).xyz * halves;
    let reach = distance(in.world_position.xyz, view.world_position);
    let ray = (there - eye) / reach;

    // Where the ray is inside the box, and how far it goes before it meets something solid.
    let a = (-halves - eye) / ray;
    let b = (halves - eye) / ray;
    let lo = min(a, b);
    let hi = max(a, b);
    let enters = max(max(lo.x, lo.y), max(lo.z, 0.0));
    var leaves = min(min(hi.x, hi.y), hi.z);
    @if(DEPTH_PREPASS) {
        let depth = prepass_depth(in.position, sample_index);
        if depth > 0.0 {
            let ndc = frag_coord_to_ndc(vec4(in.position.xy, depth, 1.0));
            leaves = min(leaves, distance(position_ndc_to_world(ndc), view.world_position));
        }
    }
    if leaves <= enters {
        discard;
    }

    let stride = (leaves - enters) / f32(STEPS);
    let ground = jet.flow.z;
    let air = jet.state.y;
    var light = vec3(0.0);
    var through = 1.0;
    var t = enters + stride * dither(in.position.xy);
    for (var i = 0; i < STEPS; i++) {
        let q = eye + ray * t;
        t += stride;
        let s = halves.y - q.y;
        let r = length(q.xz);
        var gas = Gas(0.0, 0.0, 0.0);
        if s < ground {
            gas = free_jet(q, s, r);
        }
        let thrown = sheet(q, ground - s, r);
        // Its colour by how hot it still is: white-hot at the heart, then the gas's own pale flame, then the
        // orange of what burns late in the air; and in no air, only the gas's own faint glow.
        var body_colour = mix(jet.hot.rgb, jet.warm.rgb, smoothstep(0.35, 0.95, gas.cooled));
        body_colour = mix(jet.thin.rgb, body_colour, smoothstep(0.0, 0.25, air));
        let heart_colour = mix(jet.thin.rgb, jet.core.rgb, smoothstep(0.0, 0.1, air));
        let sheet_colour = mix(jet.warm.rgb, jet.cool.rgb, smoothstep(0.5, 1.0, thrown.cooled));
        let given = heart_colour * gas.heart + body_colour * gas.body + sheet_colour * thrown.body;
        let amount = gas.heart + gas.body + thrown.body;
        let hidden = 1.0 - exp(-jet.state.w * amount * stride);
        light += through * given * jet.state.z * stride;
        through *= 1.0 - hidden;
    }
    light *= burning;
    return vec4(clamp(light * view.exposure, vec3(0.0), vec3(1.0e4)), clamp(1.0 - through, 0.0, 1.0));
}

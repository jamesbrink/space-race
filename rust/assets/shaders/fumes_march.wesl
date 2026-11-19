// The dust and vapour round the pad (sr-render/src/fumes/pass.rs), marched from the eye through the box the
// solver works (`fumes_solve.wesl`), one ray for every four pixels of the frame (a different one of the four each
// frame), into two half-size targets that `fumes_lay.wesl` lays over the frame at full size.
//
// A coarse march first finds where along the ray there is anything at all; the fine march then spends its steps
// there, longer where the fumes are thin, and stops once next to nothing of what is behind comes through. The
// vapour is shaped into billows at its outline: what the grid carries is eroded by eddies of three sizes, so its
// edge is a crisp knobbed one and the hollows between knobs are shaded. Each step is lit by the Sun through the
// rest of the fumes (the solver's light volume: a deep opacity map kept as a volume), by the sky overhead, by the
// sunlit ground under it and by the fire inside it. Lengths are metres in the box's frame; light is in the
// engine's physical units, exposed at the end.

import bevy_core_pipeline::fullscreen_vertex_shader::FullscreenVertexOutput;
import bevy_render::view::View;
import bevy_render::globals::Globals;
import super::fumes_frame::{Fume, Source};

@group(0) @binding(0) var<uniform> view: View;
@group(0) @binding(1) var<uniform> globals: Globals;
@group(0) @binding(2) var<uniform> fume: Fume;
@group(0) @binding(3) var depth_drawn: texture_depth_2d;
@group(0) @binding(4) var stuff: texture_3d<f32>;
@group(0) @binding(5) var lit: texture_3d<f32>;
@group(0) @binding(6) var occupied: texture_3d<f32>;
@group(0) @binding(7) var bounds: texture_3d<f32>;
@group(0) @binding(8) var gusts: texture_3d<f32>;
@group(0) @binding(9) var clamped: sampler;
@group(0) @binding(10) var repeating: sampler;

const PI: f32 = 3.14159265;
// No ray is followed further than this, m: the targets hold half-precision figures.
const FARTHEST: f32 = 6.0e4;
// What dust off a concrete apron and Florida sand sends back of each colour, and what vapour does. Estimated:
// the haze in the stills of MR-3 and MR-2 leaving the pad is a whitish tan, the billow at ignition white; in
// the films of the launches the haze the blast leaves is a dirtier, greyer tan than the sunlit sand.
const DUST: vec3<f32> = vec3<f32>(0.70, 0.63, 0.53);
// (the condensed exhaust carries the apron's dust and the burned alcohol's own haze: an off-white, as a cloud of
// steam over sand reads in the colour stills, not the clean white of a cumulus)
const VAPOUR: vec3<f32> = vec3<f32>(0.88, 0.865, 0.83);
// How the fumes throw the light they scatter: two lobes of Henyey and Greenstein's, a sharp forward one (the
// droplets' and fine grains' diffraction peak, which silvers a billow seen toward the Sun) and a broad one, and
// how much of the light goes in the sharp one. Estimated.
const SHARP_G: f32 = 0.8;
const BROAD_G: f32 = 0.2;
const SHARP_SHARE: f32 = 0.35;
// The light of the scattering orders that are not marched, against the first, and how much less the rest of
// the fumes shades it (as a power of what gets through). Estimated, as the clouds' is.
const DEEPER_ORDERS: f32 = 1.6;
const DEEPER_SHADE: f32 = 0.18;
// How much of the sky's light reaches the shaded inside of the fumes for all the fumes over it. Estimated: the
// shaded side of the billow in S61-02409 and S61-03121 is a light grey, never near black.
const SKY_FLOOR: f32 = 0.75;
// What the sunlit apron sends back up (concrete, 0.35), and how much more of it reaches a thick billow's underside
// than once-scattered light would carry, for the light the billow scatters about inside itself. Estimated: the
// undersides in S61-03121 are a mid grey, lit from the concrete.
const GROUND_ALBEDO: f32 = 0.35;
const BOUNCE: f32 = 2.0;
// How the fire's light is thrown forward through the fumes toward an eye looking at it (Henyey and Greenstein's
// g): the glow round a fire seen through smoke. Estimated.
const FIRE_G: f32 = 0.6;
// The billows: the vapour's outline is where it is this thick (1/m); there the eddies erode it by up to this
// share, and the edge is this sharp (the share of the outline over which it comes to its full thickness). Inside,
// it varies by this much. Hollows between knobs are darkened by up to this much. All estimated against the knobbed
// white billow of S61-02409.
const SKIN: f32 = 1.2;
const ERODE: f32 = 0.75;
const EDGE: f32 = 0.12;
const INSIDE: f32 = 0.6;
// The vapour is never thicker than this, 1/m, whatever the grid holds where it is fed: inside a billow one sees
// a metre or so, and its folds and the fire's glow through it. Estimated.
const THICKEST: f32 = 5.0;
const HOLLOWS: f32 = 0.5;
// The eddies' sizes, m: a billow's knobs (some five metres), the knobs on those, and the knobs on those.
const KNOBS: vec3<f32> = vec3<f32>(5.5, 2.2, 0.9);
// Where the fumes are read is bent by eddies this big and by this much, m (the knobs do the smaller sizes).
// Estimated.
const BILLOWS: f32 = 9.0;
const BENT: f32 = 1.6;
// How deeply the dust's edges are cut by what the grid is too coarse to hold, and the thickness (1/m) above which
// they are cut no deeper. Estimated.
const CUT: f32 = 0.6;
const CUT_UNDER: f32 = 0.35;
// The box's open sides and its ceiling are where the grid ends, not where the fumes do: what is near them is
// thinned smoothly over this far, m, so that no wall is ever seen. Estimated.
const WALLS: f32 = 18.0;
// The coarse march's stride, m (a cell of `occupied`) and its most steps; the fine march's steps across what it
// found, the least and the most it takes, m, and how much of a step's light the step may stop before the next is
// shortened (an optical depth). The march stops once less than `CLEARS` of what is behind comes through.
const COARSE: f32 = 5.0;
const COARSE_STEPS: i32 = 48;
const FINE_STEPS: f32 = 20.0;
const FINEST: f32 = 0.25;
const COARSEST: f32 = 3.0;
const STEP_DEPTH: f32 = 0.35;
const CLEARS: f32 = 0.02;
// Where there are fumes the fine march strides no longer than this, m, so a knob's edge is not stepped over.
const NEAR_EDGE: f32 = 0.4;

struct Marched {
    // the fumes' light, exposed, and how much of what is behind them they hide
    @location(0) light: vec4<f32>,
    // m: how far the ray went before it met something solid, and how far before it met any fumes
    @location(1) reach: vec4<f32>,
}

// Which of four pixels the ray goes through this frame (clouds.wesl `picked`, so the two marches share a pattern).
fn picked(frame_count: u32) -> vec2<i32> {
    let k = frame_count % 4u;
    return vec2<i32>(i32(k & 1u), i32(((k >> 1u) ^ k) & 1u));
}

// A fraction that is different at every pixel and every frame, for the temporal anti-aliasing to average.
fn dither(at: vec2<f32>) -> f32 {
    let shifted = at + 5.588238 * f32(globals.frame_count % 64u);
    return fract(52.9829189 * fract(0.06711056 * shifted.x + 0.00583715 * shifted.y));
}

fn phase(g: f32, cosine: f32) -> f32 {
    return (1.0 - g * g) / (4.0 * PI * pow(1.0 + g * g - 2.0 * g * cosine, 1.5));
}

// The eddies at a place, drifting with the wind and turning over as they rise: a velocity of about one in size.
fn eddy(p: vec3<f32>, size: f32, rises: f32) -> vec3<f32> {
    let drifted = p + vec3(fume.drift.z, 0.0, 0.0) - vec3(0.7 * fume.time.z, rises, 0.0) * fume.time.y;
    return textureSampleLevel(gusts, repeating, drifted / size, 0.0).xyz;
}

// Where the fumes at `p` are read from: bent by eddies, so the grid's own cells are never seen.
fn bent(p: vec3<f32>) -> vec3<f32> {
    return p + (eddy(p, BILLOWS, 0.4) * 2.0 - 1.0) * BENT;
}

// The dust's edges are finer than the grid: cut back by eddies, most where there is least, so a thin haze is in
// wisps; the grid's own figure is kept where it is thick.
fn cut_dust(amount: f32, knobs: f32) -> f32 {
    return max(amount * (1.0 + CUT) - CUT * 1.9 * knobs * min(amount, CUT_UNDER), 0.0);
}

struct Billow {
    // how thick it is here, 1/m, and how deep in a hollow between knobs, 0 to 1
    amount: f32,
    hollow: f32,
}

// The vapour as billows: eroded at its outline by the eddies of three sizes, with a crisp edge, varying inside.
fn billow(vapour: f32, p: vec3<f32>) -> Billow {
    let covered = saturate(vapour / SKIN);
    // (so little that the eddies would eat all of it: nothing to read)
    if covered < 0.05 {
        return Billow(0.0, 0.0);
    }
    let a = eddy(p, KNOBS.x, 0.6);
    let inside = mix(1.0, 0.4 + 1.2 * a.y, INSIDE);
    // (inside the outline the eddies take nothing: the smaller two need not be read)
    if covered >= 1.0 {
        return Billow(min(vapour, THICKEST) * inside, 0.0);
    }
    let b = eddy(p.yzx, KNOBS.y, 0.9);
    let c = eddy(p.zxy, KNOBS.z, 1.2);
    // (the eddies' parts are about a half each, give or take a third: this spreads them over nought to one)
    let knobs = saturate((0.5 * a.x + 0.3 * b.y + 0.2 * c.z - 0.25) * 2.0);
    // (a cloud thinned to a haze as it drifts and evaporates has no knobs left to show: below a third of the
    // outline's thickness the eddies only fray it, and it is as thin as the grid says, not a scatter of crisp
    // knobs each as thick as a billow's skin. Estimated: the drifting remains in the films are a haze)
    let fresh = smoothstep(0.3, 0.7, covered);
    let eroded = ERODE * knobs * mix(0.35, 1.0, fresh);
    let shaped = saturate((covered - eroded) / max(1.0 - eroded, 0.05));
    let edge = smoothstep(0.0, EDGE, shaped);
    let thick = mix(vapour, clamp(vapour, SKIN, THICKEST), fresh);
    return Billow(edge * thick * inside, knobs * (1.0 - shaped) * fresh);
}

fn walls(p: vec3<f32>) -> f32 {
    let room = fume.size.xyz;
    let side = min(min(p.x, room.x - p.x), min(p.z, room.z - p.z));
    return smoothstep(0.0, WALLS, side) * smoothstep(0.0, 0.4 * WALLS, room.y - p.y);
}

// Where along the ray, between `enters` and `leaves`, there is anything at all.
fn found(eye: vec3<f32>, ray: vec3<f32>, enters: f32, leaves: f32, jitter: f32) -> vec2<f32> {
    let room = fume.size.xyz;
    var begins = 1.0e9;
    var ends = -1.0e9;
    for (var i = 0; i < COARSE_STEPS; i++) {
        let t = enters + (f32(i) + jitter) * COARSE;
        if t > leaves + COARSE {
            break;
        }
        let there = textureSampleLevel(occupied, clamped, (eye + ray * min(t, leaves)) / room, 0.0).x;
        if there > 2.0e-4 {
            begins = min(begins, t - COARSE);
            ends = t + COARSE;
        }
    }
    return vec2(max(begins, enters), min(ends, leaves));
}

@fragment
fn fragment(in: FullscreenVertexOutput) -> Marched {
    let size = vec2<i32>(textureDimensions(depth_drawn));
    let pixel = clamp(vec2<i32>(floor(in.position.xy)) * 2 + picked(globals.frame_count), vec2(0), size - 1);
    let uv = (vec2<f32>(pixel) + 0.5) / vec2<f32>(size);
    let ndc = vec2(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0);
    let near = view.world_from_clip * vec4(ndc, 1.0, 1.0);
    let ray_world = normalize(near.xyz / near.w - view.world_position);
    var limit = FARTHEST;
    let depth = textureLoad(depth_drawn, pixel, 0);
    if depth > 0.0 {
        let solid = view.world_from_clip * vec4(ndc, depth, 1.0);
        limit = min(distance(solid.xyz / solid.w, view.world_position), FARTHEST);
    }
    var out: Marched;
    out.light = vec4(0.0);
    out.reach = vec4(limit, FARTHEST, 0.0, 0.0);

    // The eye and its ray in the box's frame (the box is moved and turned, never stretched).
    let eye = (fume.box_from_world * vec4(view.world_position, 1.0)).xyz;
    let ray = (fume.box_from_world * vec4(ray_world, 0.0)).xyz;
    let low = textureLoad(bounds, vec3(0, 0, 0), 0).xyz;
    let high = textureLoad(bounds, vec3(1, 0, 0), 0).xyz;
    let a = (low - eye) / ray;
    let b = (high - eye) / ray;
    let enters = max(max(min(a.x, b.x), min(a.y, b.y)), max(min(a.z, b.z), 0.0));
    let leaves = min(min(max(a.x, b.x), max(a.y, b.y)), min(max(a.z, b.z), limit));
    if leaves <= enters {
        return out;
    }
    let jitter = dither(vec2<f32>(pixel));
    let span = found(eye, ray, enters, leaves, jitter);
    if span.y <= span.x {
        return out;
    }
    let seen = march(eye, ray, span, jitter);
    out.light = vec4(seen.light, 1.0 - seen.through);
    out.reach.y = seen.first;
    return out;
}

struct Seen {
    // the fumes' light, exposed; how much of what is behind comes through; how far along the ray they began, m
    light: vec3<f32>,
    through: f32,
    first: f32,
}

// The fine march over `span`.
fn march(eye: vec3<f32>, ray: vec3<f32>, span: vec2<f32>, jitter: f32) -> Seen {
    let room = fume.size.xyz;
    let base = clamp((span.y - span.x) / FINE_STEPS, FINEST, COARSEST);
    let cosine = dot(ray, fume.sun.xyz);
    let straight = mix(phase(BROAD_G, cosine), phase(SHARP_G, cosine), SHARP_SHARE);
    let sun_high = saturate(fume.sun.y);
    let fire_at = fume.lamp.xyz;
    var light = vec3(0.0);
    var through = 1.0;
    var first = FARTHEST;
    var t = span.x + base * jitter;
    var striding = true;
    for (var i = 0; i < 72; i++) {
        if t >= span.y || through < CLEARS {
            break;
        }
        let p = eye + ray * t;
        let here = textureSampleLevel(stuff, clamped, bent(p) / room, 0.0).xy;
        if here.x + here.y < 1.0e-4 {
            t += base;
            striding = true;
            continue;
        }
        // (the first fumes after a long stride: back most of it, so the outline is found where it is and not
        // where the stride happened to land, which would band it)
        if striding && t - base > span.x {
            t -= 0.85 * base;
            striding = false;
            continue;
        }
        striding = false;
        let shaped = billow(here.y, p);
        var dust = 0.0;
        if here.x > 1.0e-3 {
            dust = cut_dust(here.x, eddy(p, 1.3, 0.25).x);
        }
        let amount = (shaped.amount + dust) * walls(p);
        // (a step is shortened where the fumes are thick, so no one step swallows a billow's lit skin whole; near
        // a billow's outline, where the vapour is there but may be eroded away, it is short enough to find the
        // knobs' edges; through a thin haze it is long)
        let outline = here.y > 0.05 * SKIN && here.y < 1.5 * SKIN;
        let longest = select(base, min(base, NEAR_EDGE), outline);
        let stride = clamp(STEP_DEPTH / max(amount, 1.0e-3), FINEST, longest);
        t += stride;
        if amount <= 1.0e-4 {
            continue;
        }
        first = min(first, t - stride);
        let reaches = textureSampleLevel(lit, clamped, p / room, 0.0);
        let colour = (DUST * dust + VAPOUR * shaped.amount) / max(dust + shaped.amount, 1.0e-4);
        // The hollows between knobs see less of the Sun and of the sky: the knobs round them stand in the way.
        let open = 1.0 - HOLLOWS * shaped.hollow;
        // The Sun: once scattered, and the orders after it, from all round and less shaded.
        let deeper = DEEPER_ORDERS / (4.0 * PI) * pow(reaches.x, DEEPER_SHADE);
        let sun = fume.sunlight.xyz * (straight * reaches.x + deeper) * open;
        // The sky from above, and the sunlit apron from below.
        let sky = fume.skylight.xyz * (SKY_FLOOR + (1.0 - SKY_FLOOR) * reaches.z) * 0.5 * open;
        let ground = fume.sunlight.xyz * (GROUND_ALBEDO / PI) * sun_high * 0.5 * BOUNCE
            * (0.5 + 0.5 * sqrt(reaches.x)) * exp(-p.y / 12.0);
        // The fire: falling off as the square of how far it is, and thrown forward toward an eye looking at it.
        let off = p - fire_at;
        let toward_eye = dot(normalize(off), -ray);
        let fire = fume.lamp_colour.xyz * fume.lamp.w / max(dot(off, off), 0.5) * reaches.y * phase(FIRE_G, toward_eye);
        let stopped = 1.0 - exp(-amount * stride);
        light += through * stopped * colour * (sun + sky + ground + fire);
        through *= 1.0 - stopped;
    }
    // (a figure that is not a number would be kept by the temporal anti-aliasing for good: none gets out)
    let shown = clamp(light * view.exposure, vec3(0.0), vec3(1.0e4));
    let kept = select(shown, vec3(0.0), shown != shown);
    return Seen(kept, saturate(through), select(first, FARTHEST, through > 0.999));
}

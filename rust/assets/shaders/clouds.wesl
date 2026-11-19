// The day's clouds and the haze under them (sr-render/src/clouds), marched from the eye through each layer's
// shell round the Earth, one ray for every four pixels (clouds/pass.rs); clouds_lay.wesl lays the result over the
// frame. docs/look.md says where each part of the technique comes from.
//
// The cumulus are a field of clouds, each a huddle of turrets with one flat base, cut to knobs by a block of
// noise that rises through them as the clock runs; many scraps and a few big ones, in clumps and in streets along
// the wind (clouds/field.rs, clouds_cover.wesl). At every step that finds cloud a second, short march goes toward
// the Sun, so a cloud shades itself: bright where the Sun strikes it, grey-blue underneath, with the silver lining
// forward scattering gives. Far off, where a cloud is a pixel or two, the field is not marched but read as a cover
// at the pixel's coarseness (clouds/cover.rs), so it is soft and does not sparkle. The deck above is a sheet of
// cloudlets in banks. Last, the haze between the eye and whatever it sees is marched too, in and out of the
// clouds' shadows, which is what puts shafts of light in the air. What stands in front of a cloud is found from the
// depth already drawn. All lengths are metres and all light is in the engine's physical units (lux, cd/m^2),
// exposed at the end as everything else is.

import bevy_core_pipeline::fullscreen_vertex_shader::FullscreenVertexOutput;
import bevy_render::view::View;
import bevy_render::globals::Globals;
import super::clouds_frame::CloudFrame;
import super::clouds_cover::{
    CELLS, EDGE, Column, along_wind, column, gather, mirrored, on_sheet, second_laying, shadow_from, sheet_texel,
    spread_for, SHADOW_UP,
};


// (clouds/pass.rs `lay_pipe`: the order of these is its order)
@group(0) @binding(0) var<uniform> view: View;
@group(0) @binding(1) var<uniform> globals: Globals;
@group(0) @binding(2) var<uniform> frame: CloudFrame;
@group(0) @binding(3) var depth_drawn: texture_depth_2d;
@group(0) @binding(4) var volume: texture_3d<f32>;
@group(0) @binding(5) var field: texture_2d<f32>;
@group(0) @binding(6) var cover: texture_2d<f32>;
@group(0) @binding(7) var ripple: texture_2d<f32>;
@group(0) @binding(8) var day_map: texture_2d<f32>;
@group(0) @binding(9) var repeating: sampler;
@group(0) @binding(10) var clamped: sampler;

const PI: f32 = 3.14159265;
// How much light a metre of cloud takes out of a ray at a cumulus' top: fair-weather cumulus is 0.03 to 0.1 a
// metre, the more the higher above the base (there is more water in it).
const EXTINCTION: f32 = 0.075;
// A deck's cloudlets are thin: the Sun comes through them.
const DECK_EXTINCTION: f32 = 0.009;
// Past this many levels of the cloudlets' coarser copies under a pixel the deck is read once, not marched; and the
// share of the way through it its lens of cloud fills, on the whole. Chosen by eye.
const DECK_FAR: f32 = 3.0;
const DECK_FILL: f32 = 0.2;
// The shape noise repeats over this far, and the detail over this, m; and the side of one of its voxels.
const SHAPE_TILE: f32 = 1200.0;
const DETAIL_TILE: f32 = 260.0;
const VOXELS: f32 = 128.0;
// How many coarser copies of the noise the detail is read further down than its footprint asks: at its own footprint
// (log2(SHAPE_TILE / DETAIL_TILE) = 2.2) the fraying sparkles; at the shape's, it is soft. Chosen by eye.
const DETAIL_FINER: f32 = 1.0;
// The noise rises through a cloud at about the speed its air does, m/s: the knobs swell and roll. Estimated.
const UPDRAUGHT: f32 = 0.9;
// A cloud's top leans down the wind by this much of its height for each m/s. Estimated.
const LEAN: f32 = 0.035;
// The most steps a ray takes through the cumulus, and through the deck.
const MARCH_STEPS: i32 = 128;
// Readings toward the Sun from each step in cloud.
const LIGHT_STEPS: i32 = 3;
// The mean density of a cumulus' body, against the extinction at its top: what the rest of the way to the Sun
// through it is taken at. Estimated.
const REST_DENSITY: f32 = 0.5;
// Beyond this, m, two readings toward the Sun do.
const LIGHT_NEAR: f32 = 6000.0;
// Beyond this, m, the fraying of a cloud's edge is too fine to see, and is left out.
const FINE_NEAR: f32 = 10000.0;
const DECK_STEPS: i32 = 12;
// No cloud is marched beyond this, m.
const REACH: f32 = 700000.0;
// The light of the scattering orders that are not marched, as a gain on those that are: with it the sunlit side
// of a thick cloud is about as bright as white paint in the same Sun, which is what a cumulus is. Estimated.
const DEEPER_ORDERS: f32 = 2.6;
// How much of the later scattering orders a thick cloud loses looked at against the Sun, and how strong the forward
// scatter through a thin edge is. Estimated, by eye against photographs of cumulus toward the Sun.
const CONTRE_JOUR: f32 = 0.9;
const RIM: f32 = 1.4;
// Looking toward the Sun, a cloud's sunlit light falls by e for every this many metres of it overhead. Estimated.
const BODY_DEPTH: f32 = 120.0;
// How much of the Sun's light the land and sea under the cloud send back up. Estimated.
const GROUND_ALBEDO: f32 = 0.2;
// What clean air scatters of each colour in a metre at the ground (Rayleigh), and the height it thins by e over.
const RAYLEIGH: vec3<f32> = vec3<f32>(5.8e-6, 13.5e-6, 33.1e-6);
const RAYLEIGH_HEIGHT: f32 = 8000.0;

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

// The height above the ground a ray has reached after `t` metres (exactly, and again with nothing large taken
// from anything large).
fn height_at(h: f32, mu: f32, t: f32) -> f32 {
    let radius = frame.east.w + h;
    return h + (2.0 * radius * mu * t + t * t) / (radius + sqrt(radius * radius + 2.0 * radius * mu * t + t * t));
}

// Within the first of these distances from the site the cumulus' cover is the record's; by the second it is the
// day's map's, m (src/viewer/weather.ts NEAR).
const RECORD_NEAR: vec2<f32> = vec2<f32>(12000.0, 40000.0);

// How far the cumulus' turrets are spread at a place in their drifting frame before they are gathered: as the day's
// map has the cover there, the record's near the site. It changes slowly.
fn laid_spread(en: vec2<f32>) -> f32 {
    var spread = frame.lay.x;
    if frame.day.x > 0.0 {
        let ground = en + frame.wind.xy * frame.north.w;
        let uv = vec2(0.5 + ground.x / frame.day.x, 0.5 - ground.y / frame.day.x);
        let mapped = spread_for(textureSampleLevel(day_map, clamped, uv, 0.0).r);
        // (src/viewer/weather.ts NEAR: the record's cover near the site, the map's from further out)
        spread = mix(spread, mapped, smoothstep(RECORD_NEAR.x, RECORD_NEAR.y, length(ground)));
    }
    return spread;
}

// And gathered: one reading does for a step and its march toward the Sun.
fn spread_at(en: vec2<f32>) -> f32 {
    return laid_spread(en) * gather(on_sheet(en, along_wind(frame.wind.xy), frame.lay.y));
}

// What changes only over kilometres along a ray, read once for many steps: the spread (gathered) and how much of
// the sheet's second laying there is.
struct Slow {
    spread: f32,
    second: f32,
    // where along the ray it was read, m
    at: f32,
}

// Read again only every this many metres along a ray. The gathering changes over about 20 km, the layings over 50.
const SLOW_EVERY: f32 = 1500.0;

fn slow_at(en: vec2<f32>, t: f32) -> Slow {
    return Slow(spread_at(en), second_laying(en / frame.lay.y), t);
}

// What the field says of the column of air at a place in the cumulus' drifting frame.
fn column_at(en: vec2<f32>, slow: Slow) -> Column {
    let cell = frame.lay.y;
    let texel = sheet_texel(field, repeating, en, along_wind(frame.wind.xy), cell, slow.second);
    return column(texel, slow.spread, cell, frame.cumulus.z, frame.north.w);
}

struct Cloud {
    // how much light a metre of it takes out of a ray
    thick: f32,
    // how far inside the cloud's body the place is, 0 at its skin to 1 deep in
    deep: f32,
    // metres of cloud overhead, about
    under: f32,
}

// How dense the cumulus is at a place `z` metres above its base. `coarse` is how many levels down the noise's
// coarser copies to read (far off, or on the way to the Sun); the detail is left out when `fine` is not set.
fn cumulus(col: Column, en: vec2<f32>, z: f32, coarse: f32, fine: bool) -> Cloud {
    var cloud = Cloud(0.0, 0.0, 0.0);
    if col.within <= 0.0 || z <= 0.0 || z >= col.top {
        return cloud;
    }
    // A loaf standing on its flat base, its sides steep: the turret's body before the noise has cut it.
    let lifted = z / col.top;
    let outward = 1.0 - min(col.within, 1.0);
    if outward * outward * sqrt(outward) + lifted * lifted > 1.7 {
        return cloud;
    }
    let clock = frame.north.w;
    let p = vec3(en.x, z + frame.cumulus.y - clock * UPDRAUGHT, en.y);
    let shape = textureSampleLevel(volume, repeating, p / SHAPE_TILE, coarse);
    // (the loaf itself is pushed out here and drawn in there, so no two turrets are the same loaf: its sides
    // bulge and its shoulders overhang)
    let bulged = max(outward + (0.5 - shape.b) * 0.5 * smoothstep(0.0, 0.25, lifted), 0.0);
    let raised = max(lifted + (0.5 - shape.a) * 0.35, 0.0);
    // (and drawn in a little at the very base: a cumulus stands on its base, it does not spread a skirt)
    let body = 1.0 - sqrt(bulged * bulged * sqrt(bulged) + raised * raised) - 0.2 * (1.0 - smoothstep(0.0, 0.25, lifted));
    if body <= 0.0 {
        return cloud;
    }
    // The noise cuts only the cloud's outer part, so what is left is whole knobs standing on a solid middle, not
    // spikes: deeper toward the top (a base is whole, a top is knobs) and deeper into an old cloud.
    let reach = mix(0.55, 0.8, smoothstep(0.0, 0.5, lifted)) * (1.0 + 0.3 * col.age);
    let cut = (1.0 - shape.r) * reach;
    var d = saturate((saturate(body * 2.0) - cut) / (1.0 - cut));
    cloud.deep = d;
    if fine && d > 0.0 {
        // The edges fray: finer billows eat into what is thin, pushed about so that no edge is stamped, rising
        // faster than the shape. Near the base and in an old cloud they are wisps, higher up they are knobs.
        let pushed = p + vec3(shape.b - 0.5, 0.0, shape.a - 0.5) * 90.0 - vec3(0.0, clock * UPDRAUGHT * 0.8, 0.0);
        // (the detail is finer than the shape: its own coarser copy for the same footprint)
        let billows = textureSampleLevel(volume, repeating, pushed / DETAIL_TILE, max(coarse - 1.0 + DETAIL_FINER, 0.0)).g;
        let knobbed = saturate(lifted * 3.0 - col.age * 0.5);
        let eat = mix(billows, 1.0 - billows, knobbed) * mix(0.42, 0.38, knobbed);
        d = saturate((d - eat) / (1.0 - eat));
    }
    // Cloud is cloud almost as soon as there is any, the more so the higher: a top is crisp, a base is soft. It
    // comes on slowly at first, which leaves every edge a thin fringe for the Sun to shine through.
    let crisp = mix(4.0, 14.0, saturate(lifted * 2.0)) * mix(1.0, 0.4, col.age);
    let edge = saturate(d * crisp);
    // (the water in it grows with the height above the base, and the base itself is not a knife's edge)
    let wet = mix(0.3, 1.0, saturate(z / 280.0)) * smoothstep(0.0, 40.0, z);
    cloud.thick = edge * sqrt(edge) * wet * EXTINCTION;
    cloud.under = max(col.top * sqrt(max(1.0 - outward * outward * sqrt(outward), 0.0)) - z, 0.0);
    return cloud;
}

fn henyey_greenstein(cosine: f32, g: f32) -> f32 {
    let k = 1.0 + g * g - 2.0 * g * cosine;
    return (1.0 - g * g) / (4.0 * PI * k * sqrt(k));
}

// Forward and back together: the silver lining, and the glow of a cloud seen with the Sun behind the eye.
fn phase(cosine: f32, spread: f32) -> f32 {
    return mix(henyey_greenstein(cosine, -0.25 * spread), henyey_greenstein(cosine, 0.8 * spread), 0.62);
}

// Light that has scattered once, and then again and again: each time weaker, deeper, and less directed
// (Wrenninge's octaves). `shade` is the cloud between the place and the Sun, as an optical depth; `deep` holds
// back the later orders at a cloud's skin and in its creases, where there is too little round about to have
// sent them. `rim` is how thin the cloud is here: through a thin edge the light goes on scattering forward, which
// the octaves forget, and that is the silver lining of a cloud that stands before the Sun. Its strength is
// estimated.
fn scattered(shade: f32, cosine: f32, deep: f32, rim: f32) -> f32 {
    // (toward the Sun the light must come through the whole cloud to the eye, and the orders after the first are
    // held back the more: a thick cloud against the Sun is a dark mass with a blazing edge. Estimated.)
    let against = 1.0 - CONTRE_JOUR * smoothstep(0.2, 0.9, cosine) * smoothstep(0.2, 1.5, shade);
    var sunlit = exp(-shade) * phase(cosine, 1.0) + rim * RIM * exp(-shade * 0.3) * henyey_greenstein(cosine, 0.9);
    var strength = 0.6;
    var reach = 0.42;
    var spread = 0.5;
    for (var bounce = 1; bounce < 4; bounce++) {
        sunlit += strength * exp(-shade * reach) * phase(cosine, spread) * deep * against;
        strength *= 0.6;
        reach *= 0.42;
        spread *= 0.5;
    }
    return sunlit;
}

// The lean of the cumulus with the wind: how far a place `z` above the base is carried, level.
fn lean(z: f32) -> vec2<f32> {
    return frame.wind.xy * (LEAN * z);
}

// How much cumulus lies between a place and the Sun, as an optical depth. `jitter` moves the places it is read
// at, so that they do not print the cloud's outline on its own lit side as rings.
fn cumulus_toward_sun(en: vec2<f32>, z: f32, slow: Slow, coarse: f32, jitter: f32, far: f32) -> f32 {
    let sun = frame.sun.xyz;
    let level = vec2(dot(sun, frame.east.xyz), dot(sun, frame.north.xyz));
    let rise = dot(sun, frame.up.xyz);
    var depth = 0.0;
    var gone = 0.0;
    // (a cloud far off is a few pixels a knob: two readings, longer, do)
    let few = far > LIGHT_NEAR;
    var stride = select(20.0, 80.0, few);
    for (var i = 0; i < select(LIGHT_STEPS, 2, few); i++) {
        let at = gone + (0.15 + 0.7 * jitter) * stride;
        let there = en + level * at;
        let up = z + rise * at;
        // (the nearest reading with the detail in it: that is what shades one knob with the next)
        let col = column_at(there - lean(up), slow);
        depth += cumulus(col, there, up, coarse + select(1.0, 0.0, i < 1), i < 1 && !few).thick * stride;
        gone += stride;
        stride *= 4.5;  // (20, 90 and 400 m: through the whole of a big cloud toward the Sun)
    }
    // And the rest of the way out through the top of the column the sunbeam is in, which the readings stop short
    // of: from below, the Sun's light comes down through the whole height of a cloud, and a base against the Sun is
    // dark. Taken at REST_DENSITY of the full extinction, the cloud's mean. Estimated.
    let up = z + rise * gone;
    let there = en + level * gone;
    let col = column_at(there - lean(up), slow);
    let rest = max(col.top * sqrt(saturate(col.within * 3.0)) - up, 0.0) / max(rise, 0.1);
    return depth + rest * EXTINCTION * REST_DENSITY;
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

// A fraction that is different at every step of a march as well as at every pixel and frame.
fn stagger(jitter: f32, i: i32) -> f32 {
    return fract(jitter + 0.618034 * f32(i));
}

// Light, as one step of a march sees it, added to what was seen before.
fn add_seen(seen_in: Seen, glow: vec3<f32>, stopped: f32, t: f32) -> Seen {
    var seen = seen_in;
    let shows = seen.through * stopped;
    seen.light += glow * shows;
    seen.range += t * shows;
    seen.weight += shows;
    seen.through *= 1.0 - stopped;
    if seen.through < 0.03 {
        seen.through = 0.0;
    }
    return seen;
}

// March the cumulus along the ray from the eye, from `start` to `end`, and add what is seen to `seen`.
fn march_cumulus(seen_in: Seen, ray: vec3<f32>, h: f32, mu: f32, start: f32, end: f32, pixel: f32, jitter: f32) -> Seen {
    var seen = seen_in;
    let layer = frame.cumulus;
    let level = vec2(dot(ray, frame.east.xyz), dot(ray, frame.north.xyz));
    let slope = max(length(level), 0.03);
    let cosine = dot(ray, frame.sun.xyz);
    let sun_high = max(dot(frame.sun.xyz, frame.up.xyz), 0.0);
    let leaning = length(frame.wind.xy) * LEAN * layer.z;
    // Long strides through clear air; on meeting cloud, back to where the air was last clear and through the
    // cloud in short ones. A cloud's light is in its skin, the first few metres the Sun reaches: strides that
    // land deep inside find only the shade there, and every cloud comes out grey and in bands.
    var t = start + jitter * max(0.004 * start, 8.0);
    var clear_at = t;
    var short_left = 0;
    var slow = slow_at(frame.eye_over.xy + level * t, t);
    var shaded = 0.0;
    for (var i = 0; i < MARCH_STEPS; i++) {
        if t >= end || seen.through <= 0.0 {
            break;
        }
        let wobble = 0.7 + 0.6 * stagger(jitter, i);
        // (never so long that a cloud seen from far above is stepped over, nor longer than a tenth of a cloud
        // until a pixel is)
        let short_stride = min(min(max(0.004 * t, 8.0), max((end - start) / 12.0, 8.0)), max(0.1 * layer.w, t * 0.0007));
        let height = height_at(h, mu, t);
        let z = height - layer.y;
        let en = frame.eye_over.xy + level * t;
        if abs(t - slow.at) > SLOW_EVERY {
            slow = slow_at(en, t);
        }
        let col = column_at(en - lean(z), slow);
        var cloud = Cloud(0.0, 0.0, 0.0);
        // (far off, the noise is read from a coarser copy: as coarse as the stride, or as one of the march's pixels)
        let coarse = max(log2(max(short_stride * 0.5, t * pixel * frame.day.z) / (SHAPE_TILE / VOXELS)) + 1.0, 0.0);
        if col.within > 0.0 {
            cloud = cumulus(col, en, z, coarse, t < FINE_NEAR);
        }
        if cloud.thick <= 0.0 {
            if short_left > 0 {
                short_left -= 1;
                t += short_stride * wobble;
                continue;
            }
            clear_at = t;
            // (outside every outline: as far as the field says is clear, and never less than a few short strides)
            // (less what the lean of the tops can bring nearer as the ray climbs or falls through the layer)
            let open = col.open - leaning;
            let long_stride = select(short_stride * 2.5, max(open / slope, short_stride * 3.0), col.within <= 0.0);
            t += long_stride * wobble;
            continue;
        }
        if short_left == 0 {
            short_left = 6;
            t = clear_at + short_stride * stagger(jitter, i + 3);
            continue;
        }
        short_left = 3;
        // (deep in, little of what is seen is still to come: longer strides, and the light from toward the Sun
        // worked again only every other step)
        let stride = short_stride * wobble * (1.0 + 0.5 * (1.0 - seen.through));
        t += stride;
        if (seen.through > 0.35 && t < LIGHT_NEAR) || (i & 1) == 0 {
            shaded = cumulus_toward_sun(en, z, slow, coarse, stagger(jitter, i + 7), t);
        }
        let embedded = mix(0.7, 1.0, smoothstep(0.0, 0.3, cloud.deep));
        // (against the Sun, what is seen of a cloud is the light that has come through all of it above and beyond:
        // the readings toward the Sun pass out of a narrow turret's side, so its body is held back by the cloud over
        // it as well, and only a thin edge, with little over it, blazes)
        let through_body = mix(1.0, exp(-cloud.under / BODY_DEPTH), smoothstep(0.2, 0.9, cosine));
        let sunlit = scattered(shaded, cosine, embedded, 1.0 - smoothstep(0.0, 0.45, cloud.deep)) * through_body;
        // The sky from above, less the more cloud is overhead, and from round about; and from below the sunlit
        // ground, less the higher into the cloud: that is what a base is lit by.
        // (the sky behind the eye lights the side seen; looking at the Sun, that side is the shaded one)
        let sky = frame.skylight.xyz * (0.15 + 0.85 * exp(-cloud.under / 120.0)) * (1.0 - 0.45 * smoothstep(0.3, 0.9, cosine));
        let ground = frame.sunlight.xyz * (GROUND_ALBEDO / PI) * sun_high * exp(-z / 220.0);
        let glow = frame.sunlight.xyz * sunlit * DEEPER_ORDERS + sky + ground;
        seen = add_seen(seen, glow, 1.0 - exp(-cloud.thick * stride), t);
    }
    marched_to = min(t, end);
    return seen;
}

// How far along the ray the last march of the cumulus got: short of its end when it ran out of steps, and the cover
// is read from there on.
var<private> marched_to: f32;

// The spreads `cover`'s channels hold the cover for (clouds/cover.rs SPREADS).
const COVER_SPREADS: vec4<f32> = vec4<f32>(2.0, 4.0, 7.0, 11.0);
// Texels along a side of the field's sheet (clouds/field.rs SIDE).
const SHEET_TEXELS: f32 = 1024.0;
// Where the march gives way to the cover: where a pixel is this much of a cell of the field (about the spacing of
// the clouds). Chosen by eye: a cloud is then a few pixels across and has no more shape to
// show than its outline.
const FAR_AT: f32 = 0.03;
// The far cover is read this many levels coarser than the pixel: a field of small cumulus seen from high up is a
// soft white veil with the clumps and streets in it, as photographs from orbit show it, not a scatter of specks.
// Chosen by eye.
const FAR_SOFT: f32 = 3.0;

// How much of the sky the cumulus cover about a place, as seen by a pixel `footprint` metres across.
fn far_cover(en: vec2<f32>, footprint: f32) -> f32 {
    let cell = frame.lay.y;
    let k = spread_at(en) * (1.0 - EDGE);
    let on = on_sheet(en, along_wind(frame.wind.xy), cell);
    let level = log2(max(footprint * SHEET_TEXELS / (cell * CELLS), 1.0)) + FAR_SOFT;
    let second = second_laying(en / cell);
    let c = mix(textureSampleLevel(cover, repeating, on / CELLS, level),
        textureSampleLevel(cover, repeating, mirrored(on) / CELLS, level), second);
    let s = COVER_SPREADS;
    var got = c.r * k / s.x;
    if k > s.z {
        got = mix(c.b, c.a, (k - s.z) / (s.w - s.z));
    } else if k > s.y {
        got = mix(c.g, c.b, (k - s.y) / (s.z - s.y));
    } else if k > s.x {
        got = mix(c.r, c.g, (k - s.x) / (s.y - s.x));
    }
    return saturate(got);
}

// The cumulus from far off, between `start` and `end` along the ray: the cover read once, where the ray is
// halfway through the layer, at the coarseness of the pixel's footprint on it (longer the more slanting the ray).
// A ray down through the layer meets cloud as often as the cover says; a ray along it crosses a cloud's breadth at
// a time, and meets many. Lit as a cloud's sunlit top from above, its shaded base from below and its shadowed side
// from the side away from the Sun. Estimated, and matched by eye to the march where the two meet.
fn far_cumulus(seen_in: Seen, ray: vec3<f32>, h: f32, mu: f32, start: f32, end: f32, pixel: f32) -> Seen {
    let layer = frame.cumulus;
    let level = vec2(dot(ray, frame.east.xyz), dot(ray, frame.north.xyz));
    let cosine = dot(ray, frame.sun.xyz);
    let sun_high = max(dot(frame.sun.xyz, frame.up.xyz), 0.0);
    let steep = abs(mu);
    // (what the ray sees of a cloud: its top from above, its base from below, its side between; on the side away
    // from the Sun the side is in its own shadow)
    let from_below = smoothstep(-0.2, 0.2, mu);
    let shaded = mix(0.6, 7.0, from_below) + 4.0 * max(cosine, 0.0) * (1.0 - steep);
    let sunlit = scattered(shaded, cosine, 1.0, 0.0);
    let sky = frame.skylight.xyz * mix(0.95, 0.45, from_below);
    let ground = frame.sunlight.xyz * (GROUND_ALBEDO / PI) * sun_high * from_below;
    let glow = frame.sunlight.xyz * sunlit * DEEPER_ORDERS + sky + ground;
    let t = 0.5 * (start + end);
    let footprint = t * pixel / sqrt(max(steep, 0.05));
    let c = far_cover(frame.eye_over.xy + level * t, footprint);
    let chord = max(mix(0.5 * layer.w, layer.z, steep), 1.0);
    let stopped = 1.0 - pow(1.0 - min(c, 0.98), max((end - start) / chord, 1.0));
    return add_seen(seen_in, glow, stopped, t);
}

// The cumulus along the ray: marched near, and read as a cover from where a cloud is a few pixels across (a little
// nearer or further at each pixel and frame, so that the line between the two is never seen).
fn see_cumulus(seen_in: Seen, ray: vec3<f32>, h: f32, mu: f32, limit: f32, pixel: f32, jitter: f32) -> Seen {
    let layer = frame.cumulus;
    if layer.x <= 0.0 && frame.day.x <= 0.0 {
        return seen_in;
    }
    let slab = inside(h, mu, layer.y, layer.y + layer.z);
    let start = max(slab.start, 0.0);
    let end = min(min(slab.end, limit), REACH);
    if slab.end <= 0.0 || end <= start {
        return seen_in;
    }
    let split = frame.lay.y * FAR_AT / pixel * (0.8 + 0.4 * jitter);
    var seen = seen_in;
    var onward = max(start, split);
    if start < split {
        seen = march_cumulus(seen, ray, h, mu, start, min(end, split), pixel, jitter);
        onward = marched_to;
    }
    if end > onward && seen.through > 0.0 {
        seen = far_cumulus(seen, ray, h, mu, onward, end, pixel);
    }
    return seen;
}

// The banks of the deck are the size of twenty cloudlets and more, and are pushed about so that they do not come
// round again as the texture does: how far, at a place. It changes slowly, so one reading does for a ray.
fn bank_push(en: vec2<f32>) -> vec2<f32> {
    let tile = frame.lay.w * 9.0;
    return 0.2 * tile * (vec2(noise2(en / tile * 2.3 + 5.0), noise2(en / tile * 2.3 + 71.0)) - 0.5);
}

// How far above the rank at which a bank begins a place is: negative outside every bank, and the more so the
// further from one.
// `coarse` is how many of the banks' texels a pixel covers, as a level of the texture's coarser copies. The edge is
// torn at the scale of a few cloudlets, so that it is never the texture's own smooth line.
fn bank_over(en: vec2<f32>, push: vec2<f32>, coarse: f32) -> f32 {
    let torn = 0.07 * (noise2(en / (frame.deck.w * 2.7) + 21.0) - 0.5) * (1.0 - smoothstep(1.0, 3.0, coarse));
    return textureSampleLevel(ripple, repeating, (en + push) / (frame.lay.w * 9.0), coarse).g - frame.lay.z + torn;
}

// Within the first of these distances from the site the deck is the record's; by the second it is the day's map's,
// m (src/viewer/weather.ts `deckCoverAt`).
const DECK_NEAR: vec2<f32> = vec2<f32>(40000.0, 150000.0);

// How much of the record's deck stands at a place in its drifting frame: all of it near the site, and further off
// as much as the day's map has of layered cloud there, against the record's cover.
fn deck_share(en: vec2<f32>) -> f32 {
    if frame.day.x <= 0.0 {
        return 1.0;
    }
    let ground = en + frame.wind.zw * frame.north.w;
    let uv = vec2(0.5 + ground.x / frame.day.x, 0.5 - ground.y / frame.day.x);
    let mapped = saturate(textureSampleLevel(day_map, clamped, uv, 0.0).b / max(frame.deck.x, 0.01));
    return mix(1.0, mapped, smoothstep(DECK_NEAR.x, DECK_NEAR.y, length(ground)));
}

// What the deck is at a place.
struct Sheet {
    // how much light a metre of it takes out of a ray
    thick: f32,
    // the cloud between the place and the Sun, as an optical depth
    shade: f32,
}

// The deck at a place: cloudlets in rows, each a lens of thin cloud, more of them and thicker toward the middle of
// a bank, with the blue showing between. `coarse` is how many levels down the texture's coarser copies to read:
// far off, where a pixel holds many cloudlets, it is their mean that is drawn and not one of them.
fn deck(en: vec2<f32>, height: f32, bank: f32, coarse: f32) -> Sheet {
    let layer = frame.deck;
    // (two readings of the cloudlets, the second turned and finer: one alone is a lattice from below)
    let turned = vec2(0.8 * en.x - 0.6 * en.y, 0.6 * en.x + 0.8 * en.y) / (frame.lay.w * 0.71) + 0.37;
    let rank = 0.62 * textureSampleLevel(ripple, repeating, en / frame.lay.w, coarse).r
        + 0.38 * textureSampleLevel(ripple, repeating, turned, coarse + 0.5).r;
    // (clouds/ripple.rs: its THICK, and the ramp its test integrates; thinner and thicker from place to place)
    let patchy = noise2(en / (layer.w * 7.0) + 13.0) - 0.5;
    let threshold = 1.0 - 0.7 * pow(bank, 0.7) + 0.5 * patchy;
    let one = smoothstep(threshold - 0.1, threshold + 0.7, rank);
    let many = saturate(0.75 - threshold);
    let cloudlet = mix(one, many, smoothstep(1.0, 2.5, coarse));
    // (a lens: thickest at its middle, a little flatter underneath than on top)
    let off_middle = (height - layer.y) / layer.z * 2.0 - 0.85;
    let lens = cloudlet - off_middle * off_middle * select(1.0, 2.2, off_middle < 0.0);
    if lens <= 0.0 {
        return Sheet(0.0, 0.0);
    }
    let p = vec3(en.x, height, en.y) - vec3(0.0, frame.north.w * UPDRAUGHT * 0.3, 0.0);
    let billows = textureSampleLevel(volume, repeating, p / (DETAIL_TILE * 2.2), coarse).g;
    let thick = saturate(lens * 1.3 - (1.0 - billows) * 0.3) * DECK_EXTINCTION;
    // (so thin that the cloud overhead is as much as lies between it and the Sun: a cloudlet's middle is grey
    // from below and its edge is bright. The 2.5 stands for the cloud being thicker further in. Estimated.)
    let overhead = max(layer.y + layer.z * (0.425 + 0.5 * sqrt(cloudlet)) - height, 0.0);
    return Sheet(thick, thick * overhead * 1.8 / max(dot(frame.sun.xyz, frame.up.xyz), 0.2));
}

// March the deck along the ray and add what is seen to `seen`.
fn march_deck(seen_in: Seen, ray: vec3<f32>, h: f32, mu: f32, limit: f32, pixel: f32, jitter: f32) -> Seen {
    var seen = seen_in;
    let layer = frame.deck;
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
    let cosine = dot(ray, frame.sun.xyz);
    var t = start + jitter * max(0.006 * start, 14.0);
    let push = bank_push(frame.eye_over.zw + level * 0.5 * (start + end));
    // Far off, where a pixel holds many cloudlets, the deck is read once in the middle of the way through it and
    // taken to be that thick all the way: a thin sheet stepped through a few times gives each pixel its own answer,
    // which from orbit is a hatching.
    // (no bank where the ray enters the deck nor where it leaves: nothing to march)
    let banks_far = max(log2((end - start) * 0.5 / (frame.lay.w * 9.0 / 512.0)), 0.0);
    let entering = bank_over(frame.eye_over.zw + level * start, push, banks_far);
    let leaving = bank_over(frame.eye_over.zw + level * end, push, banks_far);
    if max(entering, leaving) < -0.04 {
        return seen;
    }
    let far = start * pixel * 1.5 / sqrt(max(abs(mu), 0.05));
    if log2(far / (frame.lay.w / 512.0)) + 1.0 > DECK_FAR {
        let middle = 0.5 * (start + end);
        let en = frame.eye_over.zw + level * middle;
        let banks_coarse = max(DECK_FAR - log2(9.0), 0.0);
        let bank = saturate(bank_over(en, push, banks_coarse + 1.0) / (0.2 + 0.05 * banks_coarse)) * deck_share(en);
        let sheet = deck(en, layer.y + 0.425 * layer.z, bank, DECK_FAR + 1.0);
        let sunlit = scattered(sheet.shade, cosine, 1.0, 0.5);
        let glow = frame.sunlight.xyz * sunlit * DEEPER_ORDERS + frame.skylight.xyz * 0.85;
        return add_seen(seen, glow, 1.0 - exp(-sheet.thick * DECK_FILL * (end - start)), middle);
    }
    for (var i = 0; i < DECK_STEPS; i++) {
        if t >= end {
            break;
        }
        let wobble = 0.7 + 0.6 * stagger(jitter, i);
        // (a deck is a thin sheet: six strides through it, jittered, are as good as many to the temporal filter)
        let stride = min(max(0.006 * t, 14.0), max((end - start) / 6.0, 14.0)) * wobble;
        let height = height_at(h, mu, t);
        let en = frame.eye_over.zw + level * t;
        // (as coarse as the stride, or as a pixel's footprint on the deck)
        let footprint = max(stride * 0.5, t * pixel * 1.5 / sqrt(max(abs(mu), 0.05)));
        let coarse = max(log2(footprint / (frame.lay.w / 512.0)) + 1.0, 0.0);
        let banks_coarse = max(coarse - log2(9.0), 0.0);
        let over = bank_over(en, push, banks_coarse);
        if over <= 0.0 {
            // (clear of every bank: the further below a bank's rank, the further off the nearest one is)
            t += max(stride * 2.0, -over * frame.lay.w * 1.2 * wobble);
            continue;
        }
        // (clouds/ripple.rs: its FRINGE, widened as the banks' texels shrink under a pixel)
        let bank = saturate(over / (0.1 + 0.05 * banks_coarse)) * deck_share(en);
        let sheet = deck(en, height, bank, coarse);
        t += stride;
        if sheet.thick <= 0.0 {
            continue;
        }
        let lifted = saturate((height - layer.y) / layer.z);
        let sunlit = scattered(sheet.shade, cosine, 1.0, 0.5);
        let glow = frame.sunlight.xyz * sunlit * DEEPER_ORDERS + frame.skylight.xyz * mix(0.7, 1.0, lifted);
        let stopped = 1.0 - exp(-sheet.thick * stride);
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

// How much air of a kind that thins by e over `scale` metres lies along the first `range` metres of the ray, as
// metres of that air at the ground.
fn air_along(h: f32, mu: f32, range: f32, scale: f32) -> f32 {
    var sum = 0.0;
    for (var i = 0; i < 6; i++) {
        sum += exp(-max(height_at(h, mu, range * (f32(i) + 0.5) / 6.0), 0.0) / scale);
    }
    return sum * range / 6.0;
}

// How much of the Sun a place in the air has lost to the cumulus (clouds_cover.wesl `sun_shadow`, which the
// ground's shadows are too).
// `slow` is read near the place: it changes over kilometres, so one reading does for many steps.
fn in_shadow(en: vec2<f32>, height: f32, slow: Slow) -> f32 {
    let layer = frame.cumulus;
    let sun = frame.sun.xyz;
    let rise = dot(sun, frame.up.xyz);
    if height > layer.y + layer.z {
        return 0.0;
    }
    let up = max(layer.z * SHADOW_UP, height - layer.y);
    let there = en + vec2(dot(sun, frame.east.xyz), dot(sun, frame.north.xyz)) * (max(layer.y + up - height, 0.0) / rise);
    return shadow_from(field, repeating, there, up, slow.spread, slow.second, along_wind(frame.wind.xy), layer.z,
        frame.lay.y, frame.north.w);
}

// The moist air under the cumulus and round them, which the record does not give: how much light a metre of it
// takes out of a ray at the ground. Estimated. With the day's haze it puts how far one can see at the ground near
// 35 km (and nearer 9 km just under the bases), past the 16 km the station could report; it is what makes the light under and round the clouds
// a thing that can be seen, as it is on a humid morning by the sea.
const HUMID: f32 = 1.0e-4;
// That at the ground and just under the bases, as a share of HUMID: wetted aerosol swells with the humidity, which
// is highest under the bases. Estimated.
const HUMID_SWELL: vec2<f32> = vec2<f32>(0.5, 3.0);
// The haze throws its light forward: two lobes, a narrow one that makes the glare round the Sun and a broad one
// that makes the sky round it pale. Estimated, as aerosol phase functions near the sea are measured (asymmetry
// about 0.7 overall).
const HAZE_LOBES: vec3<f32> = vec3<f32>(0.88, 0.45, 0.6);
// Beyond this, m, the haze is not asked whether it is in a cloud's shadow: a shaft so far off is a few pixels
// across and lost in the haze before it. Chosen for what it costs.
const SHAFT_REACH: f32 = 12000.0;
// Steps through the air below the cumulus' tops, where the shafts are; and before and after it.
const SHAFT_STEPS: i32 = 9;
const HAZE_STEPS: i32 = 5;

// How much light a metre of the air takes out of a ray at a height, and where it scatters it.
fn haze_density(height: f32) -> f32 {
    let layer = frame.cumulus;
    // (Koschmieder: one can see as far as the air leaves a fiftieth of the contrast)
    var density = 3.912 / frame.sun.w * exp(-height / frame.sunlight.w);
    if layer.x > 0.0 || frame.day.x > 0.0 {
        // (the more toward the bases, where the rising air is near saturation and the haze swells)
        let swelling = mix(HUMID_SWELL.x, HUMID_SWELL.y, smoothstep(0.0, layer.y, height));
        density += HUMID * swelling * (1.0 - smoothstep(layer.y, layer.y + 0.5 * layer.z, height));
    }
    return density;
}

struct Hazed {
    // the haze's own light, as it reaches the eye
    light: vec3<f32>,
    // how much of the cloud's light comes through the haze in front of it, and of what is behind everything
    cloud: f32,
    behind: f32,
}

// Part of a walk through the haze, from `t0` to `t1` in `steps` steps, in or out of the clouds' shadows.
fn haze_walk(walked: Hazed, ray: vec3<f32>, h: f32, mu: f32, t0: f32, t1: f32, steps: i32, shadowed: bool,
    range: f32, through: f32, jitter: f32) -> Hazed {
    var out = walked;
    if t1 <= t0 {
        return out;
    }
    let level = vec2(dot(ray, frame.east.xyz), dot(ray, frame.north.xyz));
    let cosine = dot(ray, frame.sun.xyz);
    let glare = mix(henyey_greenstein(cosine, HAZE_LOBES.x), henyey_greenstein(cosine, HAZE_LOBES.y), HAZE_LOBES.z);
    let direct = frame.sunlight.xyz * glare;
    // (the sky's light and the Sun's that the haze has passed about within itself, from all round)
    let about = frame.skylight.xyz * 1.5 + frame.sunlight.xyz * 0.045;
    var before = t0;
    var slow = Slow(0.0, 0.0, -1.0e9);
    for (var i = 0; i < steps; i++) {
        // (steps that lengthen with distance: the near air is where a shaft is seen)
        let f = (f32(i) + jitter) / f32(steps);
        let t = t0 + (t1 - t0) * f * f;
        let g = (f32(i) + 1.0) / f32(steps);
        let next = t0 + (t1 - t0) * g * g;
        let height = max(height_at(h, mu, t), 0.0);
        let en = frame.eye_over.xy + level * t;
        let stopped = 1.0 - exp(-haze_density(height) * (next - before));
        before = next;
        if stopped < 1.0e-6 {
            continue;
        }
        var shadow = 0.0;
        if shadowed {
            if abs(t - slow.at) > SLOW_EVERY {
                slow = slow_at(en, t);
            }
            shadow = in_shadow(en, height, slow);
        }
        let glow = direct * (1.0 - shadow) + about * (1.0 - 0.35 * shadow);
        let hidden = select(through, 1.0, t < range);
        out.light += glow * (out.behind * stopped * hidden);
        if t < range {
            out.cloud *= 1.0 - stopped;
        }
        out.behind *= 1.0 - stopped;
    }
    return out;
}

// The day's haze between the eye and what it sees, marched in and out of the cumulus' shadows: toward the Sun it
// glows, under a cloud it is dark, and the edge between the two is a shaft of light. `range` is how far off the
// cloud on this ray is and `through` how much shows past it. The stretch of the ray below the cumulus' tops, where
// the shadows are, is walked in short steps; the rest in a few long ones.
fn haze(ray: vec3<f32>, h: f32, mu: f32, limit: f32, range: f32, through: f32, jitter: f32) -> Hazed {
    var out = Hazed(vec3(0.0), 1.0, 1.0);
    let slab = inside(h, mu, -50.0, 5.0 * frame.sunlight.w);
    let start = max(slab.start, 0.0);
    let end = min(min(slab.end, limit), REACH);
    if slab.end <= 0.0 || end <= start {
        return out;
    }
    let low = inside(h, mu, -50.0, frame.cumulus.y + frame.cumulus.z);
    let low_start = clamp(low.start, start, end);
    let low_end = clamp(select(low.end, start, low.end <= 0.0), low_start, min(end, low_start + SHAFT_REACH));
    let shadowed = (frame.cumulus.x > 0.0 || frame.day.x > 0.0) && dot(frame.sun.xyz, frame.up.xyz) > 0.05;
    // (a shaft is seen in the light the haze throws forward: looking away from the Sun a few steps do)
    let toward = smoothstep(-0.2, 0.7, dot(ray, frame.sun.xyz));
    let steps = select(HAZE_STEPS, i32(mix(f32(SHAFT_STEPS) * 0.35, f32(SHAFT_STEPS), toward)), shadowed);
    out = haze_walk(out, ray, h, mu, start, low_start, HAZE_STEPS, false, range, through, jitter);
    out = haze_walk(out, ray, h, mu, low_start, low_end, steps, shadowed, range, through, jitter);
    out = haze_walk(out, ray, h, mu, low_end, end, HAZE_STEPS, false, range, through, jitter);
    return out;
}

// Off, nothing is marched and the clouds and haze are gone: for measuring what they cost. Leave it on.
const MARCH: bool = true;
// How many times the march is done over, for measuring what one costs. Leave it at 1.
const MEASURE_REPEAT: i32 = 1;
// Which parts are done over: 1 the cumulus, 2 the deck, 4 the haze.
const MEASURE_PARTS: i32 = 7;
// Which parts are left out: 1 the cumulus, 2 the deck, 4 the haze. Leave it at 0.
const MEASURE_SKIP: i32 = 0;

// A different fraction at every pixel and every frame, for the temporal anti-aliasing to average.
fn dither(at: vec2<f32>) -> f32 {
    let shifted = at + 5.588238 * f32(globals.frame_count % 64u);
    return fract(52.9829189 * fract(0.06711056 * shifted.x + 0.00583715 * shifted.y));
}

// Which of the `every` x `every` pixels under one of the march's this frame's ray goes through: each in turn, so
// that over every^2 frames every pixel of the frame has had a ray of its own. clouds.wesl and clouds_lay.wesl have
// the same.
fn picked(frame_count: u32, every: i32) -> vec2<i32> {
    let k = i32(frame_count % u32(every * every));
    return vec2(k % every, (k / every + k) % every);
}

struct Marched {
    // the cloud's light, exposed; and how much of what is behind it it hides
    @location(0) cloud: vec4<f32>,
    // the haze's light, exposed, in front of the cloud and behind it; and how much of the cloud comes through
    @location(1) haze: vec4<f32>,
    // km: how far off the cloud is, and how far the ray went; how much of what is solid comes through the haze
    @location(2) reach: vec4<f32>,
}

// No light may be other than a finite number: one NaN taken into the temporal filter's history stays there and
// spreads, and the frame goes black.
fn finite(v: vec4<f32>) -> vec4<f32> {
    let ok = (v == v) & (abs(v) < vec4(6.0e4));
    return select(vec4(0.0), v, ok);
}

@fragment
fn fragment(in: FullscreenVertexOutput) -> Marched {
    if !MARCH {
        return Marched(vec4(0.0), vec4(0.0, 0.0, 0.0, 1.0), vec4(REACH / 1000.0, REACH / 1000.0, 1.0, 0.0));
    }
    let size = vec2<i32>(textureDimensions(depth_drawn));
    let every = i32(frame.day.z);
    let pixel = clamp(vec2<i32>(floor(in.position.xy)) * every + picked(globals.frame_count, every), vec2(0), size - 1);
    let uv = (vec2<f32>(pixel) + 0.5) / vec2<f32>(size);
    let ndc = vec2(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0);
    let near = view.world_from_clip * vec4(ndc, 1.0, 1.0);
    let ray = normalize(near.xyz / near.w - view.world_position);
    let h = frame.up.w;
    let mu = dot(ray, frame.up.xyz);
    // (how wide a pixel is at a metre: what is far off is read as coarse as this)
    let across = 2.0 / (view.clip_from_view[1][1] * f32(size.y));

    // How far the ray goes before it meets something solid.
    var limit = REACH;
    let depth = textureLoad(depth_drawn, pixel, 0);
    if depth > 0.0 {
        let solid = view.world_from_clip * vec4(ndc, depth, 1.0);
        limit = min(distance(solid.xyz / solid.w, view.world_position), REACH);
    }

    // (from the march's own pixel: a dither read every third pixel of the frame is a lattice)
    let jitter = dither(floor(in.position.xy));
    var seen = Seen(vec3(0.0), 1.0, 0.0, 0.0);
    // Nearest layer first: the cumulus from under the deck, the deck from over it.
    if h < frame.deck.y {
        if (MEASURE_SKIP & 1) == 0 { seen = see_cumulus(seen, ray, h, mu, limit, across, jitter); }
        if (MEASURE_SKIP & 2) == 0 { seen = march_deck(seen, ray, h, mu, limit, across, jitter); }
    } else {
        if (MEASURE_SKIP & 2) == 0 { seen = march_deck(seen, ray, h, mu, limit, across, jitter); }
        if (MEASURE_SKIP & 1) == 0 { seen = see_cumulus(seen, ray, h, mu, limit, across, jitter); }
    }

    // The clean air between the eye and the cloud: it takes the cloud's blue first and gives back the sky's, so
    // distant cloud goes the colour of the horizon, as distant land does in the engine's own atmosphere.
    var range = REACH;
    var light = vec3(0.0);
    if seen.weight > 0.0 {
        range = seen.range / seen.weight;
        let kept = exp(-RAYLEIGH * air_along(h, mu, range, RAYLEIGH_HEIGHT));
        let veil = frame.skylight.xyz * 1.6 + frame.sunlight.xyz * 0.05;
        light = seen.light * kept + veil * (1.0 - kept) * (1.0 - seen.through);
    }
    // And the day's haze, in front of the cloud and behind it.
    var hazed = Hazed(vec3(0.0), 1.0, 1.0);
    if (MEASURE_SKIP & 4) == 0 { hazed = haze(ray, h, mu, limit, range, seen.through, jitter); }
    var out: Marched;
    out.cloud = finite(vec4(light * view.exposure, 1.0 - seen.through));
    out.haze = finite(vec4(hazed.light * view.exposure, hazed.cloud));
    out.reach = finite(vec4(range / 1000.0, limit / 1000.0, hazed.behind, 0.0));
    // (the whole march again, for measuring: its cost is then the frame's change over the repeats)
    for (var again = 1; again < MEASURE_REPEAT; again++) {
        let other = fract(jitter + 0.37 * f32(again));
        var twice = Seen(vec3(0.0), 1.0, 0.0, 0.0);
        if (MEASURE_PARTS & 1) != 0 {
            twice = see_cumulus(twice, ray, h, mu, limit, across, other);
        }
        if (MEASURE_PARTS & 2) != 0 {
            twice = march_deck(twice, ray, h, mu, limit, across, other);
        }
        if (MEASURE_PARTS & 4) != 0 {
            twice.light += haze(ray, h, mu, limit, range, twice.through, other).light;
        }
        out.cloud.x += 1.0e-20 * twice.light.x;
    }
    return out;
}

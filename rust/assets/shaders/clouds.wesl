// The day's clouds and the haze under them (sr-render/src/clouds), marched from the eye through each layer's
// shell round the Earth. docs/look.md says where each part of the technique comes from.
//
// The cumulus are a field of clouds, each a huddle of turrets with one flat base, cut to knobs by a block of
// noise that rises through them as the clock runs. At every step that finds cloud a second, short march goes
// toward the Sun, so a cloud shades itself: bright where the Sun strikes it, grey-blue underneath, with the silver
// lining forward scattering gives. The deck above is a sheet of cloudlets in banks. Last, the haze between the
// eye and whatever it sees is marched too, in and out of the clouds' shadows, which is what puts light in the
// air. What stands in front of a cloud is found from the depth already drawn. All lengths are metres and all
// light is in the engine's physical units (lux, cd/m^2), exposed at the end as everything else is.

import bevy_core_pipeline::fullscreen_vertex_shader::FullscreenVertexOutput;
import bevy_render::view::View;
import bevy_render::globals::Globals;

struct CloudFrame {
    // the vertical at the eye; w: the eye's height above the ground
    up: vec4<f32>,
    // east at the site; w: the ground's radius
    east: vec4<f32>,
    // north at the site; w: the clock
    north: vec4<f32>,
    // toward the Sun; w: how far one can see
    sun: vec4<f32>,
    // w: the height over which the haze thins by e
    sunlight: vec4<f32>,
    skylight: vec4<f32>,
    // the eye over the ground in the cumulus' drifting frame (east, north), then the deck's
    eye_over: vec4<f32>,
    // cover, base, depth, a cloud's size
    cumulus: vec4<f32>,
    deck: vec4<f32>,
    // how each layer drifts, m/s east and north: the cumulus, then the deck
    wind: vec4<f32>,
    // the cumulus' spread and the metres to a cell of its field; where the deck's banks begin, and the metres to
    // a tile of its cloudlets
    lay: vec4<f32>,
    // the day's map: how far across it is, m (0: there is none); the height its high cloud is drawn at, m
    day: vec4<f32>,
}

// (clouds/pass.rs `lay_pipe`: the order of these is its order)
@group(0) @binding(0) var<uniform> view: View;
@group(0) @binding(1) var<uniform> globals: Globals;
@group(0) @binding(2) var<uniform> frame: CloudFrame;
@group(0) @binding(3) var depth_drawn: texture_depth_2d;
@group(0) @binding(4) var volume: texture_3d<f32>;
@group(0) @binding(5) var field: texture_2d<f32>;
@group(0) @binding(6) var ripple: texture_2d<f32>;
@group(0) @binding(7) var day_map: texture_2d<f32>;
@group(0) @binding(8) var repeating: sampler;
@group(0) @binding(9) var clamped: sampler;

const PI: f32 = 3.14159265;
const TAU: f32 = 6.2831853;
// How much light a metre of cloud takes out of a ray at a cumulus' top: fair-weather cumulus is 0.03 to 0.1 a
// metre, the more the higher above the base (there is more water in it).
const EXTINCTION: f32 = 0.075;
// A deck's cloudlets are thin: the Sun comes through them.
const DECK_EXTINCTION: f32 = 0.009;
// The shape noise repeats over this far, and the detail over this, m; and the side of one of its voxels.
const SHAPE_TILE: f32 = 1200.0;
const DETAIL_TILE: f32 = 260.0;
const VOXELS: f32 = 128.0;
// The noise rises through a cloud at about the speed its air does, m/s: the knobs swell and roll. Estimated.
const UPDRAUGHT: f32 = 0.9;
// A cloud's top leans down the wind by this much of its height for each m/s. Estimated.
const LEAN: f32 = 0.035;
// No cloud is marched beyond this, m.
const REACH: f32 = 700000.0;
// The light of the scattering orders that are not marched, as a gain on those that are: with it the sunlit side
// of a thick cloud is about as bright as white paint in the same Sun, which is what a cumulus is. Estimated.
const DEEPER_ORDERS: f32 = 2.6;
// How much of the Sun's light the land and sea under the cloud send back up. Estimated.
const GROUND_ALBEDO: f32 = 0.2;
// The field of cumulus (clouds/field.rs): cells to a tile, the narrowest turret's radius in cells, and how far
// its outlines are pushed about.
const FIELD_CELLS: f32 = 16.0;
const NARROWEST: f32 = 0.016;
const PUSHED: f32 = 0.06;
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

// Clouds gather in one part of the sky and thin in the next: what the day's spread is multiplied by at a place
// (in cells of the field). Its mean is 1, so the cover is still the record's. earth.wesl's `cover_at` uses the
// same, and the two must be kept in step.
fn gather(cells: vec2<f32>) -> f32 {
    return 0.62 + 0.76 * smoothstep(0.2, 0.8, noise2(cells * 0.21 + 7.3));
}

// The scramble clouds/field.rs shares: whole numbers in, 32 well-mixed bits out, and two fractions from them.
fn scramble(x: u32, y: u32, seed: u32) -> u32 {
    var k = (x * 0x9E3779B1u) ^ (y * 0x85EBCA77u) ^ (seed * 0x27D4EB2Fu);
    k ^= k >> 15u;
    k *= 0x2C1B3C6Du;
    k ^= k >> 12u;
    k *= 0x297A2D39u;
    k ^= k >> 15u;
    return k;
}

fn low_half(k: u32) -> f32 {
    return f32(k & 0xFFFFu) / 65536.0;
}

fn high_half(k: u32) -> f32 {
    return f32(k >> 16u) / 65536.0;
}

fn wrapped(v: i32, period: i32) -> u32 {
    return u32(((v % period) + period) % period);
}

// Smooth noise on the whole-number lattice, repeating with the field's tile.
fn lattice(p: vec2<f32>, seed: u32) -> f32 {
    let corner = vec2<i32>(floor(p));
    let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);
    let x = vec2(wrapped(corner.x, 32), wrapped(corner.x + 1, 32));
    let y = vec2(wrapped(corner.y, 32), wrapped(corner.y + 1, 32));
    let a = mix(low_half(scramble(x.x, y.x, seed)), low_half(scramble(x.y, y.x, seed)), u.x);
    let b = mix(low_half(scramble(x.x, y.y, seed)), low_half(scramble(x.y, y.y, seed)), u.x);
    return mix(a, b, u.y);
}

// Where the cumulus stand, without the texture: how far a place (in cells of the field) is from the nearest
// turret's middle, in that turret's radii. This is clouds/field.rs `near`, which the texture is baked from,
// written again: the march reads the texture, and earth.wesl's `cover_at` is this (it has no texture), put
// through the same spread and the same `gather`. The three must be kept in step; set FROM_FIELD_AT to see the
// clouds drawn from this one instead, which must leave the picture as it was.
fn field_at(p: vec2<f32>) -> f32 {
    let q = p + 0.06 * vec2(lattice(p * 2.0, 11u) - 0.5, lattice(p * 2.0, 13u) - 0.5);
    let home = vec2<i32>(floor(q));
    var best = 10.5;
    for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) {
            let at = home + vec2(dx, dy);
            let x = wrapped(at.x, 16);
            let y = wrapped(at.y, 16);
            let place = scramble(x, y, 1u);
            let vigour = scramble(x, y, 2u);
            if high_half(vigour) < 0.3 {
                continue;
            }
            let middle = vec2<f32>(at) + 0.5 + 0.6 * (vec2(low_half(place), high_half(place)) - 0.5);
            let foot = 0.2 * (0.4 + 0.9 * low_half(vigour) * low_half(vigour));
            for (var turret = 0u; turret < 8u; turret++) {
                let a = scramble(x, y, 3u + turret);
                let b = scramble(x, y, 13u + turret);
                // (the first stands in the middle and is the widest; the rest huddle round it)
                let out = select(0.8 * sqrt(high_half(a)), 0.0, turret == 0u);
                let radius = select(0.2 + 0.26 * low_half(b), 0.5, turret == 0u);
                let angle = TAU * low_half(a);
                let stands = middle + foot * out * vec2(cos(angle), sin(angle));
                best = min(best, distance(q, stands) / (foot * radius));
            }
        }
    }
    return best;
}

const FROM_FIELD_AT: bool = false;

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

// What the field says of a column of air.
struct Column {
    // how far inside its turret the column stands: 0 on the outline, 1 at the middle, negative outside
    within: f32,
    // at least this many metres of level air are clear of any cloud
    open: f32,
    // how high that turret's dome stands above the base at its middle
    top: f32,
    // how far gone its cloud is, 0 new to 1 old
    age: f32,
}

// `en` is a place over the ground in the cumulus' drifting frame; `gathered` is `gather` there (it changes
// slowly, so one reading does for a step and its march toward the Sun).
fn column(en: vec2<f32>, gathered: f32) -> Column {
    let cell = frame.lay.y;
    let texel = textureSampleLevel(field, repeating, en / (cell * FIELD_CELLS), 0.0);
    let spread = frame.lay.x * gathered;
    var scaled = texel.r;
    if FROM_FIELD_AT {
        scaled = field_at(en / cell);
    }
    var col: Column;
    col.within = 1.0 - scaled / spread;
    // (every turret is at least the narrowest's radius times as far off as the nearest is in its own radii)
    col.open = (max(scaled - spread, 0.0) * NARROWEST - PUSHED) * cell * 0.8;
    let radius = texel.g * spread * cell;
    // The wider a turret the taller, toward the layer's depth, and some are taller than their width would have
    // them: heaps, and a few towers. Each swells and sinks a little in its own time.
    let breath = (0.9 + 0.1 * sin(frame.north.w / 160.0 + texel.a * TAU)) * (0.75 + 0.25 * texel.a);
    col.top = frame.cumulus.z * (1.0 - exp(-radius / (0.16 * frame.cumulus.w))) * breath;
    col.age = texel.b;
    return col;
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
    if outward * outward * outward + lifted * lifted > 1.7 {
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
    let body = 1.0 - sqrt(bulged * bulged * bulged + raised * raised) - 0.2 * (1.0 - smoothstep(0.0, 0.25, lifted));
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
        let billows = textureSampleLevel(volume, repeating, pushed / DETAIL_TILE, coarse).g;
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
    cloud.under = max(col.top * sqrt(max(1.0 - outward * outward * outward, 0.0)) - z, 0.0);
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
    var sunlit = exp(-shade) * phase(cosine, 1.0) + rim * 0.5 * exp(-shade * 0.3) * henyey_greenstein(cosine, 0.86);
    var strength = 0.6;
    var reach = 0.42;
    var spread = 0.5;
    for (var bounce = 1; bounce < 4; bounce++) {
        sunlit += strength * exp(-shade * reach) * phase(cosine, spread) * deep;
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
fn cumulus_toward_sun(en: vec2<f32>, z: f32, gathered: f32, coarse: f32, jitter: f32) -> f32 {
    let sun = frame.sun.xyz;
    let level = vec2(dot(sun, frame.east.xyz), dot(sun, frame.north.xyz));
    let rise = dot(sun, frame.up.xyz);
    var depth = 0.0;
    var gone = 0.0;
    var stride = 16.0;
    for (var i = 0; i < 5; i++) {
        let at = gone + (0.15 + 0.7 * jitter) * stride;
        let there = en + level * at;
        let up = z + rise * at;
        // (the nearest readings with the detail in them: that is what shades one knob with the next)
        depth += cumulus(column(there - lean(up), gathered), there, up, coarse + select(1.0, 0.0, i < 2), i < 2).thick * stride;
        gone += stride;
        stride *= 2.1;
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

// A fraction that is different at every step of a march as well as at every pixel and frame.
fn stagger(jitter: f32, i: i32) -> f32 {
    return fract(jitter + 0.618034 * f32(i));
}

// March the cumulus along the ray from the eye and add what is seen to `seen`.
fn march_cumulus(seen_in: Seen, ray: vec3<f32>, h: f32, mu: f32, limit: f32, jitter: f32) -> Seen {
    var seen = seen_in;
    let layer = frame.cumulus;
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
    let slope = max(length(level), 0.03);
    let cosine = dot(ray, frame.sun.xyz);
    let sun_high = max(dot(frame.sun.xyz, frame.up.xyz), 0.0);
    let cell = frame.lay.y;
    // Long strides through clear air; on meeting cloud, back to where the air was last clear and through the
    // cloud in short ones. A cloud's light is in its skin, the first few metres the Sun reaches: strides that
    // land deep inside find only the shade there, and every cloud comes out grey and in bands.
    var t = start + jitter * max(0.004 * start, 8.0);
    var clear_at = t;
    var short_left = 0;
    for (var i = 0; i < 220; i++) {
        if t >= end {
            break;
        }
        let wobble = 0.7 + 0.6 * stagger(jitter, i);
        // (never so long that a cloud seen from far above is stepped over, nor longer than a tenth of a cloud
        // until a pixel is)
        let short_stride = min(min(max(0.004 * t, 8.0), max((end - start) / 12.0, 8.0)), max(0.1 * layer.w, t * 0.0007));
        let height = height_at(h, mu, t);
        let z = height - layer.y;
        let en = frame.eye_over.xy + level * t;
        let gathered = gather(en / cell);
        let col = column(en - lean(z), gathered);
        var cloud = Cloud(0.0, 0.0, 0.0);
        // (far off, the noise is read from a coarser copy: as coarse as the stride, or as a pixel)
        let coarse = max(log2(max(short_stride * 0.5, t * 0.0006) / (SHAPE_TILE / VOXELS)) + 1.0, 0.0);
        if col.within > 0.0 {
            cloud = cumulus(col, en, z, coarse, true);
        }
        if cloud.thick <= 0.0 {
            if short_left > 0 {
                short_left -= 1;
                t += short_stride * wobble;
                continue;
            }
            clear_at = t;
            // (outside every outline: as far as the field says is clear, and never less than a few short strides)
            let long_stride = select(short_stride * 2.5, max(col.open / slope, short_stride * 3.0), col.within <= 0.0);
            t += long_stride * wobble;
            continue;
        }
        if short_left == 0 {
            short_left = 8;
            t = clear_at + short_stride * stagger(jitter, i + 3);
            continue;
        }
        short_left = 5;
        let stride = short_stride * wobble;
        t += stride;
        let shade = cumulus_toward_sun(en, z, gathered, coarse, stagger(jitter, i + 7));
        let embedded = mix(0.7, 1.0, smoothstep(0.0, 0.3, cloud.deep));
        let sunlit = scattered(shade, cosine, embedded, 1.0 - smoothstep(0.0, 0.45, cloud.deep));
        let lifted = saturate(z / layer.z);
        // The sky from above, less the more cloud is overhead, and from round about; and from below the sunlit
        // ground, less the higher into the cloud: that is what a base is lit by.
        let sky = frame.skylight.xyz * (0.3 + 0.7 * exp(-cloud.under / 160.0));
        let ground = frame.sunlight.xyz * (GROUND_ALBEDO / PI) * sun_high * exp(-z / 220.0);
        let glow = frame.sunlight.xyz * sunlit * DEEPER_ORDERS + sky + ground;
        let stopped = 1.0 - exp(-cloud.thick * stride);
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

// The banks of the deck are the size of twenty cloudlets and more, and are pushed about so that they do not come
// round again as the texture does: how far, at a place. It changes slowly, so one reading does for a ray.
fn bank_push(en: vec2<f32>) -> vec2<f32> {
    let tile = frame.lay.w * 9.0;
    return 0.2 * tile * (vec2(noise2(en / tile * 2.3 + 5.0), noise2(en / tile * 2.3 + 71.0)) - 0.5);
}

// How far above the rank at which a bank begins a place is: negative outside every bank, and the more so the
// further from one.
fn bank_over(en: vec2<f32>, push: vec2<f32>) -> f32 {
    return textureSampleLevel(ripple, repeating, (en + push) / (frame.lay.w * 9.0), 0.0).g - frame.lay.z;
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
    let rank = textureSampleLevel(ripple, repeating, en / frame.lay.w, coarse).r;
    // (clouds/ripple.rs: its THICK, and the ramp its test integrates; thinner and thicker from place to place)
    let patchy = noise2(en / (layer.w * 7.0) + 13.0) - 0.5;
    let threshold = 1.0 - 0.7 * pow(bank, 0.7) + 0.5 * patchy;
    let one = smoothstep(threshold - 0.1, threshold + 0.7, rank);
    let many = saturate(0.75 - threshold);
    let cloudlet = mix(one, many, smoothstep(2.0, 4.0, coarse));
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
fn march_deck(seen_in: Seen, ray: vec3<f32>, h: f32, mu: f32, limit: f32, jitter: f32) -> Seen {
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
    for (var i = 0; i < 56; i++) {
        if t >= end {
            break;
        }
        let wobble = 0.7 + 0.6 * stagger(jitter, i);
        let stride = min(max(0.006 * t, 14.0), max((end - start) / 10.0, 14.0)) * wobble;
        let height = height_at(h, mu, t);
        let en = frame.eye_over.zw + level * t;
        let over = bank_over(en, push);
        if over <= 0.0 {
            // (clear of every bank: the further below a bank's rank, the further off the nearest one is)
            t += max(stride * 2.0, -over * frame.lay.w * 1.2 * wobble);
            continue;
        }
        // (clouds/ripple.rs: its FRINGE)
        let bank = saturate(over / 0.1);
        let coarse = max(log2(max(stride, t * 0.0006) / (frame.lay.w / 512.0)), 0.0);
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

// How much of the Sun a place in the air under the cumulus has lost to them: what the field says of the column
// its sunbeam came down through.
fn in_shadow(en: vec2<f32>, height: f32) -> f32 {
    let layer = frame.cumulus;
    let sun = frame.sun.xyz;
    let rise = dot(sun, frame.up.xyz);
    let middle = layer.y + 0.3 * layer.z;
    if layer.x <= 0.0 || rise < 0.05 || height > layer.y + layer.z {
        return 0.0;
    }
    let along = max(middle - height, 0.0) / rise;
    let there = en + vec2(dot(sun, frame.east.xyz), dot(sun, frame.north.xyz)) * along;
    let col = column(there, gather(there / frame.lay.y));
    return 0.9 * smoothstep(0.12, 0.4, col.within) * smoothstep(0.0, 120.0, col.top);
}

struct Hazed {
    // the haze's own light, as it reaches the eye
    light: vec3<f32>,
    // how much of the cloud's light comes through the haze in front of it, and of what is behind everything
    cloud: f32,
    behind: f32,
}

// The day's haze between the eye and what it sees, marched in and out of the cumulus' shadows: toward the Sun it
// glows, under a cloud it is dark, and the edge between the two is a shaft of light. `range` is how far off the
// cloud on this ray is and `through` how much shows past it.
fn haze(ray: vec3<f32>, h: f32, mu: f32, limit: f32, range: f32, through: f32, jitter: f32) -> Hazed {
    var out = Hazed(vec3(0.0), 1.0, 1.0);
    let scale = frame.sunlight.w;
    // (Koschmieder: one can see as far as the air leaves a fiftieth of the contrast)
    let thickness = 3.912 / frame.sun.w;
    let slab = inside(h, mu, -50.0, 5.0 * scale);
    let start = max(slab.start, 0.0);
    let end = min(min(slab.end, limit), REACH);
    if slab.end <= 0.0 || end <= start {
        return out;
    }
    let level = vec2(dot(ray, frame.east.xyz), dot(ray, frame.north.xyz));
    let cosine = dot(ray, frame.sun.xyz);
    // Haze throws most of its light on forward: a glow round the Sun. The rest is the sky's light and the Sun's
    // that it has passed about within itself, which comes from all round. Estimated.
    let glare = mix(henyey_greenstein(cosine, 0.78), henyey_greenstein(cosine, -0.2), 0.12);
    let direct = frame.sunlight.xyz * glare;
    let about = frame.skylight.xyz * 1.5 + frame.sunlight.xyz * 0.045;
    var clear = 1.0;
    var before = start;
    // (a step to every few hundred metres at first, and no more than eighteen however far)
    let steps = clamp(i32((end - start) / 250.0), 3, 18);
    for (var i = 0; i < steps; i++) {
        // (steps that lengthen with distance: the near air is where a shaft is seen)
        let f = (f32(i) + jitter) / f32(steps);
        let t = start + (end - start) * f * f;
        let next = start + (end - start) * pow((f32(i) + 1.0) / f32(steps), 2.0);
        let height = max(height_at(h, mu, t), 0.0);
        let stopped = 1.0 - exp(-thickness * exp(-height / scale) * (next - before));
        before = next;
        if stopped < 1.0e-5 {
            continue;
        }
        let shadow = in_shadow(frame.eye_over.xy + level * t, height);
        let glow = direct * (1.0 - shadow) + about * (1.0 - 0.35 * shadow);
        let hidden = select(through, 1.0, t < range);
        out.light += glow * (clear * stopped * hidden);
        if t < range {
            out.cloud *= 1.0 - stopped;
        }
        clear *= 1.0 - stopped;
    }
    out.behind = clear;
    return out;
}

// A different fraction at every pixel and every frame, for the temporal anti-aliasing to average.
fn dither(at: vec2<f32>) -> f32 {
    let shifted = at + 5.588238 * f32(globals.frame_count % 64u);
    return fract(52.9829189 * fract(0.06711056 * shifted.x + 0.00583715 * shifted.y));
}

// Which of the four pixels under one of the march's this frame's ray goes through: each in turn, so that over four
// frames every pixel of the frame has had a ray of its own. clouds_lay.wesl `picked` is the same.
fn picked(frame_count: u32) -> vec2<i32> {
    let k = frame_count % 4u;
    return vec2<i32>(i32(k & 1u), i32(((k >> 1u) ^ k) & 1u));
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
    let size = vec2<i32>(textureDimensions(depth_drawn));
    let pixel = clamp(vec2<i32>(floor(in.position.xy)) * 2 + picked(globals.frame_count), vec2(0), size - 1);
    let uv = (vec2<f32>(pixel) + 0.5) / vec2<f32>(size);
    let ndc = vec2(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0);
    let near = view.world_from_clip * vec4(ndc, 1.0, 1.0);
    let ray = normalize(near.xyz / near.w - view.world_position);
    let h = frame.up.w;
    let mu = dot(ray, frame.up.xyz);

    // How far the ray goes before it meets something solid.
    var limit = REACH;
    let depth = textureLoad(depth_drawn, pixel, 0);
    if depth > 0.0 {
        let solid = view.world_from_clip * vec4(ndc, depth, 1.0);
        limit = min(distance(solid.xyz / solid.w, view.world_position), REACH);
    }

    let jitter = dither(vec2<f32>(pixel));
    var seen = Seen(vec3(0.0), 1.0, 0.0, 0.0);
    // Nearest layer first: the cumulus from under the deck, the deck from over it.
    if h < frame.deck.y {
        seen = march_cumulus(seen, ray, h, mu, limit, jitter);
        seen = march_deck(seen, ray, h, mu, limit, jitter);
    } else {
        seen = march_deck(seen, ray, h, mu, limit, jitter);
        seen = march_cumulus(seen, ray, h, mu, limit, jitter);
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
    let hazed = haze(ray, h, mu, limit, range, seen.through, jitter);
    var out: Marched;
    out.cloud = finite(vec4(light * view.exposure, 1.0 - seen.through));
    out.haze = finite(vec4(hazed.light * view.exposure, hazed.cloud));
    out.reach = finite(vec4(range / 1000.0, limit / 1000.0, hazed.behind, 0.0));
    return out;
}

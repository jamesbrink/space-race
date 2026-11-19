// Noise for the ground and the sea (earth.wesl, earth_land.wesl, sea.wesl).
//
// Smooth noise is read from one small tile of lumps with their slopes (sr-render/src/earth/grain.rs), turned and
// shifted differently for each use so that its repeats do not line up; where a lump is under a pixel the tile's
// own coarser copies give its mean, so nothing fine can shimmer. What is scattered (a plant, a bit of shell) is
// placed by hashing whole numbers, which is as good 80 km from the site as on it.

const TAU: f32 = 6.2831853;
// The tile: lumps along it, and the steepest slope it keeps (grain.rs LUMPS, STEEPEST).
const LUMPS: f32 = 32.0;
const STEEPEST: f32 = 2.0;

@group(constants::MATERIAL_BIND_GROUP) @binding(118) var noise_map: texture_2d<f32>;
@group(constants::MATERIAL_BIND_GROUP) @binding(119) var noise_sampler: sampler;

// A lattice point to [0, 1).
fn lattice(c: vec2<i32>, seed: u32) -> f32 {
    var h = (bitcast<u32>(c.x) * 0x9E3779B1u) ^ (bitcast<u32>(c.y) * 0x85EBCA77u) ^ (seed * 0x27D4EB2Fu);
    h = h ^ (h >> 15u);
    h = h * 0x2C1B3C6Du;
    h = h ^ (h >> 12u);
    h = h * 0x297A2D39u;
    h = h ^ (h >> 15u);
    return f32(h >> 8u) / 16777216.0;
}

// Three numbers for a lattice point, each in [0, 1).
fn lattice3(c: vec2<i32>, seed: u32) -> vec3<f32> {
    var h = (bitcast<u32>(c.x) * 0x9E3779B1u) ^ (bitcast<u32>(c.y) * 0x85EBCA77u) ^ (seed * 0x27D4EB2Fu);
    h = h ^ (h >> 15u);
    h = h * 0x2C1B3C6Du;
    h = h ^ (h >> 12u);
    h = h * 0x297A2D39u;
    h = h ^ (h >> 15u);
    return vec3(f32(h & 0x7FFu), f32((h >> 11u) & 0x7FFu), f32(h >> 22u) * 2.0) / 2048.0;
}

// The turn a use of the tile is given: each seed its own.
fn turn(seed: u32) -> vec2<f32> {
    let a = f32(seed) * 2.3999632;
    return vec2(cos(a), sin(a));
}

// Smooth noise about 0.5, one lump to a unit of p, with how fast it changes along each axis of p: (value, d/dx,
// d/dy).
fn grain_d(p: vec2<f32>, seed: u32) -> vec3<f32> {
    let t = turn(seed);
    let q = vec2(t.x * p.x - t.y * p.y, t.y * p.x + t.x * p.y) + f32(seed) * 0.713;
    let n = textureSample(noise_map, noise_sampler, q / LUMPS);
    let s = (n.gb - 0.5) * (2.0 * STEEPEST);
    return vec3(n.r, t.x * s.x + t.y * s.y, t.x * s.y - t.y * s.x);
}

// How many lumps of the noise a pixel covers at p, across: where it is many, the lumps are under the pixel and the
// noise is its mean, which need not be read.
fn lumps_seen(p: vec2<f32>) -> f32 {
    let w = fwidth(p);
    return max(w.x, w.y);
}

// The noise alone.
fn grain(p: vec2<f32>, seed: u32) -> f32 {
    // (the tile's mean, where a pixel covers four lumps and more: its coarsest copies are that already)
    if lumps_seen(p) > 4.0 {
        return 0.5;
    }
    let t = turn(seed);
    let q = vec2(t.x * p.x - t.y * p.y, t.y * p.x + t.x * p.y) + f32(seed) * 0.713;
    return textureSample(noise_map, noise_sampler, q / LUMPS).r;
}

// Three octaves of it, each twice as fine and half as strong, about 0.5.
// (an octave whose lumps are under two pixels is its mean, and is not read)
fn billow(p: vec2<f32>, seed: u32) -> f32 {
    let seen = lumps_seen(p);
    var sum = grain(p, seed) * 4.0;
    sum += select(1.0, grain(p * 2.03, seed + 1u) * 2.0, seen < 0.25);
    sum += select(0.5, grain(p * 4.11, seed + 2u), seen < 0.12);
    return sum / 7.0;
}

// Scattered points, one to a unit cell: the vector from p to the nearest (xy), and a number of that point's own
// in [0, 1) (z). What grows in clumps and what lies in lumps is laid out with it.
fn nearest(p: vec2<f32>, seed: u32) -> vec3<f32> {
    let cell = floor(p);
    let i = vec2<i32>(cell);
    let f = p - cell;
    var best = vec3(8.0, 8.0, 0.0);
    var least = 64.0;
    for (var y = -1; y <= 1; y++) {
        for (var x = -1; x <= 1; x++) {
            let o = vec2(x, y);
            let own = lattice3(i + o, seed);
            let at = vec2<f32>(o) + 0.15 + 0.7 * own.xy - f;
            let d = dot(at, at);
            if d < least {
                least = d;
                best = vec3(at, own.z);
            }
        }
    }
    return best;
}

// How much of a thing `size` metres across can be seen where a pixel covers `seen` metres: all of it at six
// pixels and more, none under a pixel and a half. What is not read from the tile is faded out by it.
fn shown(size: f32, seen: f32) -> f32 {
    return saturate(size / (seen * 5.0) - 0.3);
}

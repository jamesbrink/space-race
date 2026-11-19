// Where the cumulus stand, as the clouds' march and the ground's shadows both read it: one fetch of the field's sheet
// (sr-render/src/clouds/field.rs) and the arithmetic round it. clouds.wesl and earth.wesl both import this, so the
// shadows on the ground cannot part from the clouds that throw them.
//
// The field's sheet is laid with its first axis along the wind, which is how its streets come to lie along it.
// `en` is a place in metres east and north in the cumulus' drifting frame (the eye's place over the ground less the
// layer's drift on the clock); `cell` the metres to a cell of the field (field.rs `lay`).

// (field.rs: CELLS, GROWS, EDGE, MOST. Its tests hold these to it.)
const CELLS: f32 = 16.0;
const GROWS_A: f32 = 0.0077;
const GROWS_B: f32 = 0.00327;
const EDGE: f32 = 0.12;
const MOST: f32 = 0.22;
// The spread the sheet's clear way is baked for (field.rs OPEN_AT); and the widest turret's radius in cells,
// unspread (field.rs FOOT x the largest size x WIDE x NARROWER), which is how fast that way closes as the turrets
// are spread further.
const OPEN_AT: f32 = 5.0;
const WIDEST: f32 = 0.0715;
const TAU: f32 = 6.2831853;
// A big turret stands this many times its radius high, up to the layer's depth; a small one is flatter, a dome or a
// lens: its height for its radius falls off below SMALL_TURRET (m). Estimated: fair-weather cumulus humilis are
// wider than tall, and only the bigger ones heap up as tall as they are wide.
const ASPECT: f32 = 1.8;
const SMALL_TURRET: f32 = 160.0;
// The spread is scaled by this everywhere, so that the field as drawn covers what the record says: measured from a
// render straight down from 25 km over the site, which without it showed 0.21 of the sky covered where the record
// has 0.10 (the gathering's swings are not even in the cover, and the cut cloud's edge is not the field's
// outline). Measured, for this field and this gathering.
const GATHER_TRIM: f32 = 0.7;
// The patches each laying of the sheet takes, a fraction of a patch to a cell (about 60 km across).
const PATCHES: f32 = 0.03;

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

// The wind's way as a unit vector (east, north); east if there is no wind.
fn along_wind(wind: vec2<f32>) -> vec2<f32> {
    return select(vec2(1.0, 0.0), wind * inverseSqrt(max(dot(wind, wind), 1.0e-12)), dot(wind, wind) > 1.0e-6);
}

// Where a place falls on the field's sheet, in cells: turned so the sheet's first axis lies along the wind.
fn on_sheet(en: vec2<f32>, along: vec2<f32>, cell: f32) -> vec2<f32> {
    return vec2(dot(en, along), dot(en, vec2(-along.y, along.x))) / cell;
}

// The sheet tiles, and from high up a tile's clumps would stand in rows. So it is laid twice, the second time
// mirrored across the wind and moved, and each place takes one or the other in patches tens of kilometres across;
// where the two meet, the clouds of the one shrink away as the other's grow. How much a place has of the second
// (in cells, not turned).
fn second_laying(cells: vec2<f32>) -> f32 {
    return smoothstep(0.38, 0.62, noise2(cells * PATCHES + 3.1));
}

// Where a place falls on the second laying, in cells of the field.
fn mirrored(on: vec2<f32>) -> vec2<f32> {
    return vec2(on.x + 7.3, 3.1 - on.y);
}

// The sheet read at a place: red the scaled distance to the nearest turret, green its radius in cells, blue its
// cloud's age, alpha how far every turret's edge is, unspread, in cells (field.rs `texture`). Both layings, where
// a place has some of each: whichever turret is nearer once each is shrunk by how little of its laying is there.
// `second` is `second_laying` there: it changes over tens of kilometres, so a march may read it once for many steps.
fn sheet_texel(sheet: texture_2d<f32>, smp: sampler, en: vec2<f32>, along: vec2<f32>, cell: f32, second: f32)
    -> vec4<f32> {
    let on = on_sheet(en, along, cell);
    if second <= 0.0 {
        return textureSampleLevel(sheet, smp, on / CELLS, 0.0);
    }
    let b = textureSampleLevel(sheet, smp, mirrored(on) / CELLS, 0.0);
    if second >= 1.0 {
        return b;
    }
    let a = textureSampleLevel(sheet, smp, on / CELLS, 0.0);
    let scaled = vec2(a.r / sqrt(1.0 - second), b.r / sqrt(second));
    let clear = min(a.a, b.a);
    if scaled.x <= scaled.y {
        return vec4(scaled.x, a.gb, clear);
    }
    return vec4(scaled.y, b.gb, clear);
}

// Fair-weather cumulus gather: in streets along the wind a few kilometres apart and tens long, in clumps between,
// and over tens of kilometres more and less. What the day's spread is multiplied by at a place `on` the sheet (in
// cells, the first axis along the wind; `on_sheet`). Where it is low the turrets shrink to nothing and the air is
// clear; where it is high they swell and join. Noise that never repeats, so the sheet's tiling does not show from
// high up. Its scale is chosen so the cover is still the record's on the whole. Estimated: the sizes and the mix by
// eye from photographs of such fields from aircraft and from orbit.
fn gather(on: vec2<f32>) -> f32 {
    let streets = noise2(vec2(on.x * 0.07, on.y * 0.21) + 1.7);
    let clumps = noise2(on * 0.11 + 7.3);
    let broad = noise2(on * 0.022 + 3.9);
    let v = 0.35 * streets + 0.4 * clumps + 0.25 * broad;
    return (0.12 + 1.8 * smoothstep(0.28, 0.72, v)) / 1.12 * GATHER_TRIM;
}

// How far every turret is spread for clouds covering `cover` of the sky (field.rs `spread_for`).
fn spread_for(cover: f32) -> f32 {
    let c = clamp(cover, 0.0, MOST);
    return (sqrt(GROWS_A * GROWS_A + 4.0 * GROWS_B * c) - GROWS_A) / (2.0 * GROWS_B) / (1.0 - EDGE);
}

// What the field says of a column of air.
struct Column {
    // how far inside its turret the column stands: 0 on the outline, 1 at the middle, negative outside
    within: f32,
    // at least this many metres of level air round it are clear of any cloud
    open: f32,
    // how high that turret's dome stands above the base at its middle, m
    top: f32,
    // how far gone its cloud is, 0 new to 1 old
    age: f32,
}

// The column at a place. `texel` is the sheet read there (`sheet_texel`); `spread` the spread there (`spread_for`
// times `gather`); `depth` the layer's depth, m; `clock` the flight's clock, s.
fn column(texel: vec4<f32>, spread: f32, cell: f32, depth: f32, clock: f32) -> Column {
    var col: Column;
    col.within = 1.0 - texel.r / max(spread, 1.0e-3);
    col.open = max(texel.a - WIDEST * max(spread - OPEN_AT, 0.0) - 0.01, 0.0) * cell;
    let radius = texel.g * spread * cell;
    // The wider a turret the taller, up to the layer's depth. Each swells and sinks a little in its own time.
    let phase = fract(texel.g * 977.0);
    let breath = (0.9 + 0.1 * sin(clock / 160.0 + phase * TAU)) * (0.75 + 0.25 * phase);
    let aspect = ASPECT * radius / (radius + SMALL_TURRET);
    col.top = depth * (1.0 - exp(-aspect * radius / depth)) * breath;
    col.age = texel.b;
    return col;
}

// How much of the Sun's beam the thick of a cumulus stops: a cumulus a few hundred metres deep is tens of optical
// depths, so all of it but a trace. (It was 0.9, and the forward-scattering haze in a cloud's shadow, looked at
// against the Sun, then glowed as if the cloud were not there.) What still reaches a shadowed place is the sky's
// light, which is not this.
const SHADE_MOST: f32 = 0.985;
// Where a sunbeam is taken to cross the layer, as a share of its depth above the base: low, where a cumulus is
// broadest, so that its shadow is the shape of its base. Estimated.
const SHADOW_UP: f32 = 0.12;

// How much of the Sun the cloud over a column takes: 0 in the open, SHADE_MOST under the thick of a cloud.
fn shade(col: Column) -> f32 {
    return SHADE_MOST * smoothstep(0.0, 0.15, col.within) * smoothstep(0.0, 120.0, col.top);
}

// How much of the Sun a place `height` m up has lost to the cumulus: what the field says of the columns its
// sunbeam came down through low in the layer (SHADOW_UP), if its turret stands that high. The
// shadows on the ground (height 0) and the shafts in the air are both this. `en` is the place in the cumulus'
// drifting frame; `sun` the way to the Sun as (east, north, up); `layer` the cumulus' base and depth, m; `laid`
// the spread before it is gathered (`spread_for` of the cover there); `wind` their drift, m/s; `cell` the metres
// to a cell; `clock` the flight's clock, s.
fn sun_shadow(sheet: texture_2d<f32>, smp: sampler, en: vec2<f32>, height: f32, sun: vec3<f32>, layer: vec2<f32>,
    laid: f32, wind: vec2<f32>, cell: f32, clock: f32) -> f32 {
    if sun.z < 0.05 || height > layer.x + layer.y {
        return 0.0;
    }
    let along = along_wind(wind);
    // (where the sunbeam crosses SHADOW_UP of the way up the layer, or the place itself if it is higher)
    let up = max(layer.y * SHADOW_UP, height - layer.x);
    let there = en + sun.xy * (max(layer.x + up - height, 0.0) / sun.z);
    let spread = laid * gather(on_sheet(there, along, cell));
    let second = second_laying(there / cell);
    return shadow_from(sheet, smp, there, up, spread, second, along, layer.y, cell, clock);
}

// The same, from the place `there` where the sunbeam crosses the layer `up` m above its base, with the spread there
// (gathered) and its `second_laying` already known: for a march that reads those once for many steps.
fn shadow_from(sheet: texture_2d<f32>, smp: sampler, there: vec2<f32>, up: f32, spread: f32, second: f32,
    along: vec2<f32>, depth: f32, cell: f32, clock: f32) -> f32 {
    let col = column(sheet_texel(sheet, smp, there, along, cell, second), spread, cell, depth, clock);
    return shade(col) * smoothstep(0.0, 60.0, col.top - up);
}

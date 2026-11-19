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
    // that turret's radius, m
    radius: f32,
}

// The column at a place. `texel` is the sheet read there (`sheet_texel`); `spread` the spread there (`spread_for`
// times `gather`); `depth` the layer's depth, m; `clock` the flight's clock, s.
fn column(texel: vec4<f32>, spread: f32, cell: f32, depth: f32, clock: f32) -> Column {
    var col: Column;
    col.within = 1.0 - texel.r / max(spread, 1.0e-3);
    col.open = max(texel.a - WIDEST * max(spread - OPEN_AT, 0.0) - 0.01, 0.0) * cell;
    let radius = texel.g * spread * cell;
    col.radius = radius;
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
// Where the shadow begins and is whole, in how far inside a turret's outline (0 the outline, 1 the middle): the
// cloud seen is the outline cut back by EDGE and by the noise, and the shadow must be no bigger. Matched by eye from
// straight above.
const SHADOW_EDGE: vec2<f32> = vec2<f32>(0.2, 0.36);

// How much of the Sun the cloud over a column takes: 0 in the open, SHADE_MOST under the thick of a cloud.
fn shade(col: Column) -> f32 {
    return SHADE_MOST * smoothstep(SHADOW_EDGE.x, SHADOW_EDGE.y, col.within) * smoothstep(0.0, 120.0, col.top);
}

// The ground's shadows are read through the layer at this many heights, evenly, each where the sunbeam to the place
// crosses it: a tall turret shades where its top stands, not only its base, and a shadow is as dark as the cloud
// along the beam is thick.
const SHADOW_READS: i32 = 4;
// How much light a metre of cumulus takes out of the Sun's beam, as its shadow on the ground has it: far less than
// the 0.075 of its top (clouds.wesl EXTINCTION), since what scatters forward out of the cloud still comes down
// under it, and a scrap's shadow is only a dimming. Estimated, by eye against photographs of cumulus shadows on flat
// land.
const SHADOW_EXTINCTION: f32 = 0.008;
// The most of the Sun the ground's shadow takes: the rest is the light a fair-weather cumulus lets through and its
// sunlit sides throw down round it, so that with the sky's light a shadow is a little more than half as bright as
// the sunlit ground beside it, and never black. Estimated, by eye against photographs.
const GROUND_SHADE_MOST: f32 = 0.5;
// How dark a whole cloud's shadow is on the whole, against GROUND_SHADE_MOST: what a pixel that holds many shadows
// darkens by for each part of it that is under cloud. Estimated, from the reads through a cloud of middling height.
const SHADOW_MEAN: f32 = 0.8;
// Where the shadows give way to their mean, in how much of a cell of the field one pixel of the ground covers: from
// the first the shadows blur with the pixel, by the second the ground is darkened by the share of it under cloud and
// no single shadow is drawn, so that from high up the land is not peppered with dots. Chosen by eye.
const SHADOW_FAR: vec2<f32> = vec2<f32>(0.04, 0.35);
// How soft a shadow's edge is either way, m: this much for every metre the cloud stands above the place (the Sun's
// disc is 0.009 of that; the rest is the cloud's own ragged, thinning edge), and at least the second. Estimated.
const SHADOW_SOFT: vec2<f32> = vec2<f32>(0.045, 20.0);
// The lumps of a shadow's outline: two sizes of them, m, and how far they push it in or out, m. Estimated, as the
// knobs of a cumulus' side are a hundred metres or two across.
const SHADOW_LUMPS: vec3<f32> = vec3<f32>(160.0, 60.0, 110.0);

// How much of the Sun a place `height` m up (the ground) has lost to the cumulus: the cloud along its sunbeam,
// read at SHADOW_READS heights through the layer, each softened by how far above the place it is. `en` is the place
// in the cumulus' drifting frame; `sun` the way to the Sun as (east, north, up); `layer` the cumulus' base and
// depth, m; `laid` the spread before it is gathered (`spread_for` of the cover there); `wind` their drift, m/s;
// `cell` the metres to a cell; `clock` the flight's clock, s. The shafts in the air are `shadow_from`, read once.
fn sun_shadow(sheet: texture_2d<f32>, smp: sampler, en: vec2<f32>, height: f32, sun: vec3<f32>, layer: vec2<f32>,
    laid: f32, wind: vec2<f32>, cell: f32, clock: f32) -> f32 {
    // (how much ground one pixel covers, m: read first, before anything differs from pixel to pixel)
    let footprint = max(length(dpdx(en)), length(dpdy(en)));
    if sun.z < 0.05 || height > layer.x + layer.y {
        return 0.0;
    }
    let along = along_wind(wind);
    // (the gathering and the layings change over kilometres: once, where the beam is halfway through the layer)
    let middle = en + sun.xy * (max(layer.x + 0.5 * layer.y - height, 0.0) / sun.z);
    let spread = laid * gather(on_sheet(middle, along, cell));
    // Far off, the share of the ground under cloud (field.rs GROWS: the cover for a spread), darkened as a whole.
    let k = spread * (1.0 - EDGE);
    let mean = GROUND_SHADE_MOST * SHADOW_MEAN * saturate(GROWS_A * k + GROWS_B * k * k);
    let far = smoothstep(SHADOW_FAR.x, SHADOW_FAR.y, footprint / cell);
    if far >= 1.0 {
        return mean;
    }
    let second = second_laying(middle / cell);
    let rise = layer.y / f32(SHADOW_READS);
    var depth = 0.0;
    for (var i = 0; i < SHADOW_READS; i++) {
        let up = (f32(i) + 0.5) * rise;
        let above = layer.x + up - height;
        if above <= 0.0 {
            continue;
        }
        let there = en + sun.xy * (above / sun.z);
        let col = column(sheet_texel(sheet, smp, there, along, cell, second), spread, cell, layer.y, clock);
        if col.within <= -0.5 || up >= col.top {
            continue;
        }
        // (the dome narrows toward its top, and the cloud seen stands inside the field's outline: clouds.wesl
        // `cumulus`, and SHADOW_EDGE)
        let lifted = up / col.top;
        let breadth = pow(max(1.0 - lifted * lifted, 0.0), 0.4) * (1.0 - 0.5 * (SHADOW_EDGE.x + SHADOW_EDGE.y));
        // (a cloud's outline is knobbed, not a turret's circle: pushed in and out by its own lumps)
        // (and as soft as the pixel is wide, the lumps going as they become finer than it)
        let lumps = (noise2(there / SHADOW_LUMPS.x) - 0.5) + 0.5 * (noise2(there / SHADOW_LUMPS.y + 17.0) - 0.5);
        let lumped = lumps * SHADOW_LUMPS.z * (1.0 - smoothstep(0.5, 2.0, footprint / SHADOW_LUMPS.y));
        let inward = (breadth - (1.0 - col.within)) * col.radius + lumped;
        let soft = max(SHADOW_SOFT.x * above + SHADOW_SOFT.y, footprint);
        depth += smoothstep(-soft, soft, inward) * SHADOW_EXTINCTION * rise / sun.z;
    }
    return mix(GROUND_SHADE_MOST * (1.0 - exp(-depth)), mean, far);
}

// The same, from the place `there` where the sunbeam crosses the layer `up` m above its base, with the spread there
// (gathered) and its `second_laying` already known: for a march that reads those once for many steps.
fn shadow_from(sheet: texture_2d<f32>, smp: sampler, there: vec2<f32>, up: f32, spread: f32, second: f32,
    along: vec2<f32>, depth: f32, cell: f32, clock: f32) -> f32 {
    let col = column(sheet_texel(sheet, smp, there, along, cell, second), spread, cell, depth, clock);
    return shade(col) * smoothstep(0.0, 60.0, col.top - up);
}

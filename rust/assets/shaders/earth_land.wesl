// The land near the site, for someone standing on it and from the air over it (earth.wesl): what grows where, as
// the web build has it (missions/usa/places/cape-canaveral/ground.ts COVER, after Oddy and others 1999 and FNAI
// 2010: beach, dune, coastal strand, scrub with its openings and grassy swales, marsh by the lagoon), and each
// cover drawn as a designed surface: sand with its lumps and shell, grass in tufts, scrub as the domes of its
// crowns. Every colour and density is estimated; rust/docs/terrain.md says from what.

import super::earth_noise::{TAU, lattice, lattice3, grain, grain_d, billow, nearest, shown};

// The ground's colours, linear (ground.ts PALETTE: estimated, from period colour photographs of the Cape, each
// cover one clear tone).
const SAND: vec3<f32> = vec3(0.694, 0.624, 0.423);
const SAND_DARK: vec3<f32> = vec3(0.509, 0.434, 0.254);
const HERB_DRY: vec3<f32> = vec3(0.397, 0.376, 0.133);
const HERB_GREEN: vec3<f32> = vec3(0.202, 0.296, 0.080);
const LITTER: vec3<f32> = vec3(0.068, 0.056, 0.032);
const LEAF: vec3<f32> = vec3(0.036, 0.087, 0.028);
const LEAF_LIT: vec3<f32> = vec3(0.127, 0.254, 0.059);
const LEAF_OTHER: vec3<f32> = vec3(0.095, 0.195, 0.042);
// Dry beach sand, the wrack on it, a shell road and a rail bed's stone (ground.ts PAINT: estimated).
const BEACH: vec3<f32> = vec3(0.62, 0.56, 0.45);
const WRACK: vec3<f32> = vec3(0.12, 0.1, 0.07);
const SHELL: vec3<f32> = vec3(0.42, 0.40, 0.35);
const BALLAST: vec3<f32> = vec3(0.30, 0.29, 0.27);
// The cell the scrub's crowns are scattered by, m (earth/sow.rs has the same). Estimated.
const CROWN_CELL: f32 = 2.2;
// Marsh grass, the mud at a lagoon's edge and mangrove (estimated: no source of ours gives their colours).
const MARSH: vec3<f32> = vec3(0.21, 0.23, 0.075);
const MUD: vec3<f32> = vec3(0.085, 0.072, 0.052);
const MANGROVE: vec3<f32> = vec3(0.024, 0.062, 0.024);

// What is known of a point of the land.
struct Site {
    // metres east and north of the site
    p: vec2<f32>,
    // metres inland of the open sea's shore, and from enclosed water
    shore: f32,
    river: f32,
    // the ground a pixel covers, m: the side of a square of its area, and its longer side
    seen: f32,
    line: f32,
    // kept ground (earth/marks.rs), each 0 to 1: a clearing, graded sand, where a model stands
    cleared: f32,
    graded: f32,
    built: f32,
    // metres out from the edge of the nearest ground a model stands on
    kerb: f32,
    // metres from the nearest way's edge (negative on it), and what it is surfaced with
    way: f32,
    surface: f32,
    // how far up the beach the swash is just now, m
    reach: f32,
    // over the ground toward the Sun, as long as the shadow of something a metre high
    sunward: vec2<f32>,
    // how squarely the ground is seen: 1 from straight above, 0 edge-on
    steep: f32,
    // the way the wind blows over it (unit, east and north)
    wind: vec2<f32>,
}

// What the ground there is.
struct Soil {
    colour: vec3<f32>,
    // the slope of its surface, east and north
    slope: vec2<f32>,
    rough: f32,
    // how much of the sky's light reaches it, 0 to 1
    sky: f32,
}

struct Cover {
    woody: f32,
    herb: f32,
    // the community's order, coast to lagoon: 0 the surf line, 0.75 the scrub inland, 1 the lagoon's hammock
    zone: f32,
    beach: f32,
    dune: f32,
    marsh: f32,
    swale: f32,
    // an old burn, grown back; the open strand behind the dune
    burn: f32,
    strand: f32,
}

// What covers the ground (ground.ts COVER, which this follows where it can, made to read as the Cape does from the
// air: NASA's photograph of Missile Row, 13 November 1964, docs/sources.md). `earth/flora.rs` repeats it line for
// line, so that what is stood up as plants stands where this paints them: keep the two in step.
fn cover(s: Site) -> Cover {
    var c: Cover;
    let p = s.p;
    c.zone = 0.75 * saturate(s.shore / 400.0) + 0.25 * (1.0 - smoothstep(150.0, 700.0, s.river));
    // The old beach ridges lie along the shore, 110 m apart (ground.ts; Rink and Forrest 2005 have 109 m), and the
    // swales between them are what shows: long, curving, broken lines, each its own width and strength, running
    // out and taken up again, closer or wider from one tract to the next.
    let wander = 9.0 * (billow(p * 0.0025, 35u) - 0.5) + 3.0 * (billow(p * 0.011, 46u) - 0.5);
    let spacing = 0.057 * (0.8 + 0.4 * billow(p * 0.0007, 48u));
    let phase = s.shore * spacing + wander;
    let ridge = sin(phase) * 0.5 + 0.5;
    let which = lattice3(vec2<i32>(i32(floor(phase / TAU + 0.25)), 7), 50u);
    let pieces = smoothstep(0.48, 0.62, grain(p * 0.0026 + which.yz * 40.0, 49u));
    c.swale = smoothstep(0.74 + 0.16 * which.x, 0.99, ridge) * pieces * (0.25 + 0.75 * which.z);
    // The openings: sandy, grassy, of every size from a room to a field, and in drifts: a tract full of them and the
    // next with few, so that from the air the scrub is mottled at every scale and not one even scatter.
    let big = billow(p / 330.0, 31u);
    let mid = billow(p / 85.0, 47u);
    let small = grain(p / 22.0, 57u);
    let drift = smoothstep(0.35, 0.65, billow(p / 1300.0, 58u));
    var opening = smoothstep(0.63, 0.68, big + 0.12 * (mid - 0.5) + 0.06 * (small - 0.5));
    opening = max(opening, smoothstep(0.65, 0.7, mid + 0.14 * (small - 0.5) + 0.1 * (drift - 0.5)) * (0.4 + 0.6 * drift));
    opening = max(opening, smoothstep(0.72, 0.78, small + 0.1 * (mid - 0.5)) * drift * 0.8);
    // Old burns: the scrub is burned every decade or two and comes back lower and paler, in tracts a kilometre and
    // more across.
    c.burn = smoothstep(0.6, 0.7, billow(p / 1700.0 + 5.3, 85u) + 0.08 * (big - 0.5));
    var woody = 0.95 - 0.8 * opening - 0.3 * c.swale - 0.25 * c.burn;
    var herb = 0.2 + 0.7 * (1.0 - woody) * (0.75 + 0.35 * grain(p * 0.04, 34u));
    // from the sea: beach, then the dune's grasses with patches of sea grape, then the strand, open and low, out to a
    // ragged edge a few hundred metres in, and the scrub
    c.beach = 1.0 - smoothstep(38.0, 48.0, s.shore);
    c.dune = smoothstep(38.0, 48.0, s.shore) * (1.0 - smoothstep(70.0, 95.0, s.shore));
    let strand_edge = 160.0 + 140.0 * billow(p / 600.0, 59u);
    c.strand = smoothstep(55.0, 90.0, s.shore) * (1.0 - smoothstep(strand_edge - 40.0, strand_edge + 40.0, s.shore));
    woody *= smoothstep(55.0, 110.0, s.shore) * (1.0 - 0.35 * c.strand);
    woody = max(woody, c.dune * 0.5 * smoothstep(0.55, 0.7, grain(p * 0.05, 37u)));
    let oats = 0.85 + 0.15 * grain(p * 0.1, 38u) - 0.55 * smoothstep(0.62, 0.75, grain(p * 0.03, 39u));
    herb = mix(herb, oats, c.dune) * (1.0 - c.beach);
    // toward the lagoon, marsh grass at its edge
    c.marsh = 1.0 - smoothstep(20.0, 90.0, s.river);
    woody = mix(woody, 0.15, c.marsh);
    herb = mix(herb, 0.8, c.marsh);
    // the clearings: mown grass, thin and patchy, sand showing through; a few shrubs left standing
    let mown = 0.82 + 0.4 * (billow(p * 0.06, 41u) - 0.5) - 0.5 * smoothstep(0.62, 0.78, grain(p * 0.025, 42u));
    woody *= 1.0 - s.cleared;
    herb = mix(herb, mown, s.cleared);
    // graded aprons: sand, a little grass coming back
    herb = mix(herb, 0.12 + 0.2 * grain(p * 0.3, 45u), s.graded);
    woody *= 1.0 - s.graded;
    // the ways: bare, with a verge kept cut back ten metres and more, raggedly (the photographs' pale margins
    // along every road)
    let on_way = 1.0 - smoothstep(-0.5, 1.5, s.way);
    let verge = 1.0 - smoothstep(4.0, 12.0 + 8.0 * grain(p * 0.03, 43u), s.way);
    woody *= 1.0 - verge;
    herb = mix(herb, 0.45, verge) * (1.0 - on_way);
    // nothing grows where a model stands, nor in the water
    let dry = (1.0 - s.built) * smoothstep(0.0, 1.5, s.shore) * smoothstep(0.0, 1.5, s.river);
    c.woody = saturate(woody) * dry;
    c.herb = saturate(herb) * dry;
    return c;
}

// Flecks scattered one to a cell of side `cell` (m): the cell's own number (x), and how much of the point `p` is
// its fleck (y), a rounded one of its own size and place, softened by the ground a pixel covers, `seen`.
fn flecks(p: vec2<f32>, cell: f32, seed: u32, seen: f32) -> vec2<f32> {
    let at = vec2<i32>(floor(p / cell));
    let own = lattice3(at, seed);
    // (sizes from a crumb to nearly the cell, most small)
    let r = 0.08 + 0.3 * own.z * own.z;
    let d = length(fract(p / cell) - 0.3 - 0.4 * own.xy) - r;
    return vec2(fract(own.x * 7.31 + own.y * 3.7), 1.0 - smoothstep(-0.5, 0.5, d * cell / max(seen, 0.002)));
}

// The sand: its tone, its lumps, the shell in it.
fn sand(s: Site, c: Cover) -> Soil {
    var o: Soil;
    let p = s.p;
    let tone = billow(p / 7.0, 3u);
    let damp = smoothstep(0.45, 0.7, billow(p / 45.0, 4u));
    var colour = mix(SAND, SAND_DARK, saturate(0.8 * tone * tone + 0.3 * damp));
    // the beach: paler and finer above the reach of the waves
    colour = mix(colour, colour * BEACH / SAND, 0.75 * c.beach);
    // its lumps: trodden and churned at a foot's size, hummocks, and the lie of it over some metres
    let churn = 0.6 + 0.8 * max(s.graded, c.beach);
    // (the finer two only where they can be seen: past that they are their mean)
    var foot = vec3(0.5, 0.0, 0.0);
    var hummock = vec3(0.5, 0.0, 0.0);
    if s.seen < 1.0 {
        foot = grain_d(p / 0.35, 5u);
        hummock = grain_d(p / 1.6, 6u);
    }
    let lie = grain_d(p / 7.0, 7u);
    o.slope = foot.yz * (0.085 * churn) + hummock.yz * 0.05 + lie.yz * 0.03;
    // (a hollow is darker: less of the sky reaches it, and what is damp gathers there)
    let hollow = (0.5 - foot.x) * churn * 0.5 + (0.5 - hummock.x) + (0.5 - lie.x) * 0.6;
    colour *= 1.0 - 0.3 * hollow;
    o.sky = saturate(1.0 - 0.5 * hollow);
    // loose dry sand (the beach above the swash, the dune): rippled by the wind, a crest every ten centimetres
    // square to it, the troughs darker with the heavy minerals that gather there; blown paler and darker in
    // patches of every size; and darker where it is damp in the lows behind the dune. Estimated.
    let loose = saturate(c.beach + c.dune + 0.6 * c.strand);
    if loose > 0.0 && s.seen < 3.0 {
        let ripple = shown(0.1, s.seen) * loose;
        let phase = dot(p, s.wind) * (TAU / 0.1) + 6.0 * grain(p / 0.8, 64u) + 3.0 * grain(p / 3.0, 65u);
        o.slope += s.wind * (0.12 * cos(phase) * ripple);
        colour *= 1.0 - 0.08 * ripple * (0.5 - 0.5 * sin(phase));
        let blown = billow(p / 3.5, 66u) * 0.6 + billow(p / 22.0, 67u) * 0.4;
        colour *= 1.0 + 0.22 * (blown - 0.5) * loose;
        let low = smoothstep(0.55, 0.75, billow(p / 30.0, 68u)) * (c.dune + c.strand);
        colour = mix(colour, colour * vec3(0.72, 0.7, 0.68), 0.6 * low);
    }
    // shell hash: broken shell a few centimetres across, pale, and darker bits among it; coarser pieces rarer
    // (shell lies where the sea leaves it: thick along the wrack line, in drifts and scatters on the upper beach,
    // little inland; and each piece is its own size. Far off it is part of the sand's tone, not a dot)
    let see_hash = shown(0.12, s.seen) * (1.0 - smoothstep(0.02, 0.05, s.seen));
    if see_hash > 0.0 {
        // (each bit a rounded fleck of its own size somewhere in its cell, its edge as soft as a pixel: squares
        // would show as the texels of a picture)
        let fine = flecks(p, 0.03, 8u, s.seen);
        let coarse = flecks(p, 0.11, 9u, s.seen);
        let wrack = 1.0 - smoothstep(0.0, 5.0, abs(s.shore - 17.0 - 3.0 * grain(vec2(p.y * 0.05, 0.0), 25u)));
        let drift = smoothstep(0.55, 0.8, grain(p / 2.5, 29u)) * smoothstep(0.3, 0.6, grain(p / 9.0, 30u));
        let shelly = 0.01 + (0.18 * wrack + 0.1 * drift) * c.beach + 0.02 * drift;
        colour = mix(colour, vec3(0.80, 0.76, 0.66), see_hash * fine.y * step(1.0 - shelly, fine.x));
        colour = mix(colour, colour * 0.55, see_hash * fine.y * step(fine.x, 0.6 * shelly));
        let big = step(1.0 - 0.25 * shelly, coarse.x);
        colour = mix(colour, vec3(0.74, 0.70, 0.62), shown(0.4, s.seen) * see_hash * coarse.y * big);
    }
    o.colour = colour;
    o.rough = 0.95;
    return o;
}

// The beach's own marks: the wrack line, and sand the swash has just left, dark and shining.
fn strand(s: Site, soil: Soil, c: Cover) -> Soil {
    var o = soil;
    let along = s.p.y * 0.05;
    let line = 1.0 - smoothstep(0.1, 0.7 + s.line, abs(s.shore - 17.0 - 3.0 * grain(vec2(along, 0.0), 25u)));
    let wrack = line * smoothstep(0.55, 0.7, grain(s.p * 9.0, 26u)) * smoothstep(0.35, 0.6, grain(s.p * 0.4, 28u));
    o.colour = mix(o.colour, WRACK, 0.7 * wrack * shown(0.2, s.seen));
    let wet = (1.0 - smoothstep(s.reach + 0.5, 11.0 + 2.0 * grain(vec2(along * 0.6, 0.0), 27u), s.shore)) * c.beach;
    o.colour *= 1.0 - 0.3 * wet;
    o.rough = mix(o.rough, 0.25, wet);
    o.slope *= 1.0 - 0.8 * wet;
    return o;
}

// A made way: a shell road with its ruts, a rail bed's stone, a firebreak's harrowed sand.
fn made(s: Site, soil: Soil) -> Soil {
    var o = soil;
    let on_way = 1.0 - smoothstep(-0.6 - s.line, 0.8 + s.line, s.way + 0.5 * (grain(s.p * 0.9, 20u) - 0.5));
    if on_way <= 0.0 {
        return o;
    }
    var shell = SHELL * (0.86 + 0.22 * grain(s.p * 0.7, 21u));
    let stone = BALLAST * (0.8 + 0.4 * mix(0.5, grain(s.p * 22.0, 22u), shown(0.09, s.seen)));
    // the ruts: a wheel's track 0.75 m in from each edge, where the shell is ground fine and darker
    let rut = (1.0 - smoothstep(0.15, 0.4, abs(-s.way - 0.75))) * shown(0.6, s.seen);
    shell *= 1.0 - 0.18 * rut;
    let harrowed = mix(SAND, SAND_DARK, 0.25 + 0.3 * grain(s.p * vec2(0.3, 2.5), 24u));
    let colour = mix(mix(stone, shell, saturate(s.surface)), harrowed, saturate(s.surface - 1.0));
    o.colour = mix(o.colour, colour, on_way);
    o.slope = mix(o.slope, grain_d(s.p * 12.0, 23u).yz * 0.12 * shown(0.16, s.seen), on_way);
    o.rough = mix(o.rough, 0.9, on_way);
    return o;
}

// Grass and herbs: a thin cover the sand shows through, and tufts a hand to a forearm across where they can be
// seen one by one.
fn herbs(s: Site, soil: Soil, c: Cover) -> Soil {
    var o = soil;
    let lush = saturate(0.25 + 0.5 * c.swale + 0.6 * c.marsh + 0.5 * grain(s.p * 0.02, 50u) - 0.3 * c.dune);
    // (a swale's grass is rank and wet: darker than an opening's, and nearer the scrub's own tone from the air)
    let green = mix(mix(HERB_DRY, HERB_GREEN, lush), MARSH, c.marsh) * (1.0 - 0.4 * c.swale);
    // the thin cover: stalks and runners, finer than can be told apart
    let thin = c.herb * (0.35 + 0.5 * grain(s.p * 0.9, 53u)) * (0.8 + 0.4 * grain(s.p * 7.0, 54u));
    o.colour = mix(o.colour, green * (0.8 + 0.4 * grain(s.p * 3.1, 55u)), saturate(thin));
    let see = shown(0.5, s.seen);
    // (from the air an opening is its grass more than its sand, and does not flash pale among the scrub; the
    // change comes on with distance, over four times the range at which the tufts themselves are lost)
    var cover = saturate(c.herb * mix(0.95, 0.8, shown(2.0, s.seen)));
    if see > 0.0 {
        let cell = 0.55;
        let tuft = nearest(s.p / cell, 9u);
        // (they grow in drifts: thick here, none there)
        let has = step(tuft.z, c.herb * (0.15 + 1.5 * grain(s.p * 0.3, 52u)));
        let size = fract(tuft.z * 17.0);
        let r = 0.14 + 0.38 * size * size;
        // (its outline ragged)
        let d = length(tuft.xy) * (0.85 + 0.35 * grain(s.p / 0.09 + tuft.z * 31.0, 58u));
        let body = (1.0 - smoothstep(r * 0.55, r, d)) * has;
        // (its blades: a fan of light and dark round its middle)
        // (lighter and darker by its own lumps, not a star: a painted tuft is seen from above, where its blades
        // lie every which way)
        let blades = 0.85 + 0.3 * (grain(s.p / 0.07 + tuft.z * 50.0, 56u) - 0.5) * shown(0.06, s.seen);
        let own = mix(HERB_DRY, HERB_GREEN, saturate(lush + (fract(tuft.z * 7.0) - 0.5) * 0.7)) * blades * (0.6 + 0.6 * d / r);
        // its shadow on the sand, away from the Sun
        let lee = tuft.xy * cell - s.sunward * (0.5 * r * cell);
        let shade = (1.0 - smoothstep(r * cell * 0.5, r * cell, length(lee))) * has * (1.0 - body);
        o.colour = mix(o.colour * (1.0 - 0.35 * shade * see), mix(green, own, see), mix(cover, body, see));
        o.slope += -tuft.xy / max(d, 0.05) * (0.5 * body * see * d / r);
        o.sky *= 1.0 - 0.3 * shade * see;
        cover = mix(cover, body, see);
    } else {
        o.colour = mix(o.colour, green, cover);
    }
    o.rough = mix(o.rough, 0.8, max(cover, saturate(thin)));
    return o;
}

// The scrub: saw palmetto, sea grape and scrub oak as the domes of their crowns, lit on the Sun's side, with their
// litter and shade under and between them; by the lagoon, mangrove. Where a crown is under a pixel the scrub is its
// one tone, mottled.
fn scrub(s: Site, soil: Soil, c: Cover) -> Soil {
    var o = soil;
    if c.woody <= 0.01 {
        return o;
    }
    // (salt-pruned low by the sea, two metres in the scrub, a hammock's trees by the lagoon: ground.ts CANOPY)
    let height = mix(mix(0.9, 2.1, smoothstep(0.12, 0.42, c.zone)), 6.0, smoothstep(0.82, 0.98, c.zone));
    // (the crowns are scattered on one lattice everywhere: a lattice whose size followed the zone would be
    // stretched across it, and its cells would run in stairs along the shore)
    let cell = CROWN_CELL;
    let small = mix(0.6, 1.0, smoothstep(0.9, 2.1, height));
    // (not one green: stands of different ages and kinds, tens to hundreds of metres across)
    let stand = billow(s.p * 0.0025, 64u);
    let leafy = mix(mix(LEAF_LIT, LEAF_OTHER, grain(s.p * 0.03, 60u)), MANGROVE, c.marsh) * (0.75 + 0.5 * stand);
    // (after a burn it comes back lower, thinner and browner)
    let young = mix(leafy, HERB_DRY * 0.6, 0.5 * c.burn);
    // (from the air the scrub is clumps: oak close and dark, palmetto paler between, each clump throwing its shadow
    // to the side away from the Sun, so that from above the scrub has relief; the photographs' near-black green)
    let clumps = billow(s.p / 9.0, 61u);
    let lee = billow((s.p + s.sunward * (0.8 * height)) / 9.0, 61u);
    let shadowed = smoothstep(0.0, 0.08, lee - clumps);
    let whole = mix(LEAF * 0.8, young, 0.1 + 0.6 * smoothstep(0.3, 0.7, clumps) + 0.3 * (stand - 0.5))
        * (1.0 - 0.45 * shadowed);
    // (seen edge-on a painted crown is a stain, not a dome: the scrub is then its one tone)
    // (a crown is drawn as one once it is three pixels across; below that the scrub's tone carries it, and the
    // search for the nearest crown, the costliest part of the ground, is not made)
    let see = shown(0.5 * cell, s.seen) * smoothstep(0.1, 0.3, s.steep);
    var canopy = c.woody;
    var colour = whole;
    if see > 0.0 {
        let crown = nearest(s.p / cell, 12u);
        let has = step(crown.z, c.woody * 1.1);
        let r = (0.55 + 0.4 * fract(crown.z * 13.0)) * small;
        let d = length(crown.xy) / r;
        // (a crown painted no wider than the plant stood on it: earth/sow.rs makes it eight tenths of its cell's share)
        let body = (1.0 - smoothstep(0.68, 0.8, d)) * has;
        let rise = sqrt(max(1.0 - d * d, 0.0));
        // its own green, darker low on its sides, and its leaves: fans, or a mottle of small ones
        let kind = fract(crown.z * 29.0);
        // (a palmetto seen from above is a clump of fans overlapping every which way, not a star)
        let fans = 0.82 + 0.36 * grain(s.p / 0.3 + crown.z * 50.0, 62u) * (1.0 - 0.5 * rise) * shown(0.15, s.seen);
        let leaves = 0.8 + 0.4 * grain(s.p / 0.22, 63u) * shown(0.4, s.seen);
        let own = mix(LEAF, mix(leafy, LEAF_OTHER, step(0.6, kind)), 0.25 + 0.75 * rise) * mix(fans, leaves, step(0.45, kind));
        // (near the eye a plant stands on its crown and is seen, so what is painted there is the ground under it:
        // litter in the plant's shade. A painted crown seen beside the plant would be a decal lying on the sand)
        let stood = 1.0 - smoothstep(0.03, 0.09, s.seen);
        // the shadow it throws, and the litter and shade under the scrub
        let thrown = crown.xy * cell - s.sunward * (0.6 * height);
        let shade = (1.0 - smoothstep(0.6 * r * cell, 1.05 * r * cell, length(thrown))) * has * (1.0 - body);
        let under = mix(o.colour, LITTER, saturate(c.woody * 1.3) * 0.8 * (1.0 - 0.6 * stood)) * (1.0 - 0.55 * shade * (1.0 - stood));
        // (only a little darker than the sand round it: the plants are stood by the coarser coast the processor
        // has, and where one is not quite where its crown is painted, a dark disc would show)
        let ground = mix(own, mix(o.colour, LITTER, 0.2) * (0.85 + 0.15 * d), stood);
        colour = mix(whole, mix(under, ground, body), see);
        canopy = mix(c.woody, max(body, saturate(c.woody * 1.3) * 0.8), see);
        // (a dome's slope, steeper toward its edge)
        o.slope = mix(o.slope, -crown.xy / max(length(crown.xy), 0.05) * min(d / max(rise, 0.35), 2.2) * (height / (r * cell)) * 0.5, body * see);
        o.sky *= 1.0 - see * (0.45 * shade + 0.35 * body * (1.0 - rise));
    }
    o.colour = mix(o.colour, colour, canopy);
    o.rough = mix(o.rough, 0.62, canopy);
    return o;
}

// Round the edge of ground a model stands on, the join is a dirty one: sand blown thin over the concrete's foot,
// darker where the rain runs off it, and weeds along it.
fn kerb(s: Site, soil: Soil) -> Soil {
    var o = soil;
    let near_edge = (1.0 - smoothstep(0.0, 2.5, s.kerb)) * (1.0 - s.built);
    if near_edge <= 0.0 {
        return o;
    }
    let ragged = grain(s.p * 0.8, 70u);
    let stain = (1.0 - smoothstep(0.0, 0.5 + 1.4 * ragged, s.kerb)) * near_edge;
    o.colour *= 1.0 - 0.3 * stain;
    let weeds = (1.0 - smoothstep(0.1, 0.5 + 0.6 * ragged, s.kerb)) * smoothstep(0.45, 0.65, grain(s.p * 2.2, 71u))
        * shown(0.3, s.seen);
    o.colour = mix(o.colour, mix(HERB_DRY, HERB_GREEN, 0.5 * ragged) * 0.8, weeds * 0.85);
    o.sky *= 1.0 - 0.35 * (1.0 - smoothstep(0.0, 0.4, s.kerb));
    return o;
}

// The ground at a point of the land.
fn ground(s: Site) -> Soil {
    let c = cover(s);
    var o = sand(s, c);
    if c.beach > 0.0 {
        o = strand(s, o, c);
    }
    // the lagoon's edge: mud, wet
    let mud = (1.0 - smoothstep(2.0, 14.0 + 10.0 * grain(s.p * 0.05, 72u), s.river));
    o.colour = mix(o.colour, MUD, mud);
    o.rough = mix(o.rough, 0.4, mud);
    o = made(s, o);
    o = herbs(s, o, c);
    o = scrub(s, o, c);
    o = kerb(s, o);
    return o;
}

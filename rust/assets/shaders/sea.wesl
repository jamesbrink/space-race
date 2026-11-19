// The sea's surface and what is under it (earth.wesl): the swell and the wind's waves as slopes, the foam where
// they break, and the colour the water sends back up by its depth. See rust/docs/terrain.md for where each
// figure is from.

import super::earth_noise::{TAU, lattice, grain, grain_d, billow, shown};

// The open sea off the Cape, linear (src/viewer/globe.ts SEA; src/viewer/earth-surface.ts DEEP: estimated, against
// photographs from orbit): its own colour seen from the shore, and the deep ocean's seen from above the air.
const SEA: vec3<f32> = vec3(0.018, 0.07, 0.12);
const DEEP: vec3<f32> = vec3(0.003, 0.016, 0.045);
// A lagoon's water: shallow, still, stained and silted (missions/usa/places/cape-canaveral/ground.ts, the Banana
// River: estimated).
const LAGOON: vec3<f32> = vec3(0.045, 0.1, 0.09);
// And where it is a foot or two deep along its shores, over sand and grass. Estimated.
const LAGOON_EDGE: vec3<f32> = vec3(0.13, 0.19, 0.13);
// Foam (ground.ts PAINT: estimated).
const FOAM: vec3<f32> = vec3(0.86, 0.88, 0.86);

struct Waves {
    // the water's slope, east and north
    slope: vec2<f32>,
    // the mean square slope of the waves too fine to be seen here: the surface is that much rougher instead
    unseen: f32,
    // how much of the surface is foam, 0 to 1
    foam: f32,
    // how hard the wind is blowing just here, about a half: it comes in gusts
    gust: f32,
}

// The wind's waves and the swell at a point p (m east and north), for a wind blowing `toward` (unit) at `speed`
// m/s. `seen` is the ground a pixel covers, m; `calm` is 1 on sheltered water.
//
// Ten trains from 21 m (the peak of a sea raised by 5 m/s: Pierson and Moskowitz 1964, derived) down to 0.3 m,
// each as steep as the last (a slope of about a twentieth: estimated, so that with the ripples under them their mean
// square slope is Cox and Munk's 0.003 + 0.00512 U), running within 60 degrees of the wind and coming and going
// along their crests; and the swell. Crests are sharper than troughs, as a trochoid's are.
fn waves(p: vec2<f32>, toward: vec2<f32>, speed: f32, clock: f32, seen: f32, calm: f32) -> Waves {
    var out: Waves;
    let across = vec2(-toward.y, toward.x);
    // (a wind sea grows as the square of the wind: against the 5 m/s the trains are set for)
    let blown = clamp(speed / 5.0, 0.3, 2.5) * (1.0 - 0.8 * calm);
    var slope = vec2(0.0);
    var unseen = 0.0;
    var crests = 0.0;
    var span = 21.0 * blown * blown;
    for (var i = 0u; i < 10u; i++) {
        let keep = shown(span, seen);
        let steep = 0.07 * (1.0 - 0.035 * f32(i));
        if keep > 0.0 {
            let k = TAU / span;
            let off = (lattice(vec2(i32(i), 3), 5u) - 0.5) * (1.2 + 0.1 * f32(i));
            let heading = toward * cos(off) + across * sin(off);
            let bunch = smoothstep(0.2, 0.8, grain(p * (0.35 / span) + f32(i) * 7.3 + clock * 0.02, 11u + i));
            let phase = dot(p, heading) * k - sqrt(9.81 * k) * clock + f32(i) * 1.7
                + 3.0 * grain(p * (0.6 / span), 23u + i);
            let s = sin(phase);
            // (a trochoid's slope: steeper by the crest)
            let tilt = steep * 1.5 * bunch * cos(phase) / (1.0 - 0.45 * s);
            slope += heading * tilt * keep;
            crests += bunch * max(s, 0.0) * step(4.0, span) * keep;
        }
        // (what a train's slopes come to, mean square, seen or not: its bunching and its sharpened crests counted)
        unseen += 0.3 * steep * steep * (1.0 - keep * keep);
        span *= 0.62;
    }
    // the swell, from where the wind has been blowing
    // (0.96 m high and 6.55 s apart, so 67 m from crest to crest in deep water: the day's, as the flight's lead
    // gave it; assumed here until the game hands the day's sea over. Its crests wander and come in sets, and from
    // the air they are the lines on the sea.)
    let swell_keep = shown(67.0, seen) * (1.0 - calm);
    let swell_k = TAU / 67.0;
    let swell = dot(p, toward) * swell_k - TAU / 6.55 * clock + 5.0 * grain(p * 0.0022, 41u);
    let sets = 0.45 + 0.9 * grain(p * 0.0011 + 3.0, 42u);
    slope += toward * (0.96 * 0.5 * swell_k * sets * cos(swell) / (1.0 - 0.3 * sin(swell)) * swell_keep);
    // ripples, under everything: they are what glitters
    for (var j = 0u; j < 3u; j++) {
        let size = 0.3 / exp2(f32(j));
        // (hundreds of kilometres from the site a float no longer tells one centimetre from the next: a ripple
        // finer than it can place is left to the roughness)
        let keep = shown(size * 2.0, seen) * saturate(size / (length(p) * 4.0e-6) - 0.5);
        let strength = 0.055 * (1.0 - 0.6 * calm);
        if keep > 0.0 {
            let drift = (toward * (0.5 + 0.2 * f32(j)) + across * (0.3 * f32(j) - 0.3)) * clock;
            let g = grain_d((p - drift) / size, 31u + j);
            slope += g.yz * (strength * 1.2 * keep);
        }
        unseen += strength * strength * (1.0 - keep * keep);
    }
    out.slope = slope;
    // (and what is finer than any of these: the capillary waves, never seen one by one. Estimated.)
    // The wind is not even: it comes in gusts a kilometre and more across, and the sea under a gust is rougher.
    // And it is not the same wind for tens of kilometres: from high up the Sun's glint is mottled by it.
    // Nearer, a gust is a cat's-paw: a dark roughened patch a few hundred metres long, drawn out down the wind,
    // with slicks of smoother water between.
    let paws = billow(vec2(dot(p, toward) / 700.0 - clock * 0.006, dot(p, across) / 190.0), 45u);
    out.gust = 0.4 * smoothstep(0.3, 0.7, paws) + 0.35 * billow(p / 1500.0 - toward * (clock * 0.004), 43u)
        + 0.25 * billow(p / 26000.0, 44u);
    out.unseen = (unseen + 0.004 * (1.0 - 0.7 * calm)) * (0.4 + 1.2 * out.gust);
    // Whitecaps: a crest breaks where the trains pile up. At 5 m/s a thousandth of the sea is white (Monahan and
    // O'Muircheartaigh 1980: 3.84e-6 U^3.41); where the piling passes the mark is estimated to give about that.
    let cover = 3.84e-6 * pow(max(speed, 0.1), 3.41);
    let mark = 2.75 - 60.0 * cover;
    let lace = grain(p * 0.9 + clock * 0.1, 51u);
    // (and a cap is not a white sheet: it is streaked and torn, and under a light wind thin enough to see through)
    let torn = smoothstep(0.35, 0.65, grain(p * 2.7 - toward * clock * 0.4, 52u));
    out.foam = smoothstep(mark, mark + 0.35, crests + 0.5 * lace) * mix(0.5, torn, shown(1.5, seen))
        * saturate(cover / 0.004) * (1.0 - calm) * shown(6.0, seen);
    return out;
}

struct Surf {
    // foam on the water, 0 to 1
    foam: f32,
    // the swell turned to the shore: more slope, east and north
    slope: vec2<f32>,
    // how far up the beach the water is just now, m past the still shore
    reach: f32,
}

// The swell coming ashore on an open beach (ground.ts PAINT and SWELL, which this follows): crests along the
// shore 55 m apart, in every 7.7 s, breaking over the bar 75 m out and on the beach face, each leaving a sheet
// of foam that goes to lace behind it, and the swash running up the sand and drawing back. `out_` is metres
// offshore (negative up the beach), `ashore` the unit vector toward the land, `depth` the water's, m.
fn surf(p: vec2<f32>, out_: f32, ashore: vec2<f32>, depth: f32, clock: f32, seen: f32) -> Surf {
    var s: Surf;
    let along = dot(p, vec2(-ashore.y, ashore.x));
    let phase = out_ * TAU / 55.0 + clock * TAU / 7.7 + 1.6 * (grain(vec2(along * 0.015, 1.0), 81u) - 0.5);
    // 0 at a crest, rising to 1 at the next one behind it
    let behind = fract(-phase / TAU + 0.25);
    let lace = grain(p * 0.35 + clock * 0.2, 61u) * 0.6 + grain(p * 1.4 - clock * 0.35, 62u) * 0.4;
    let breaking = (1.0 - smoothstep(0.7, 1.5, depth)) * smoothstep(0.0, 2.0, out_);
    // (the crest a solid white roll as it breaks; behind it a sheet of foam going to lace and then to nothing)
    let fine = shown(3.0, seen);
    let roll = exp(-behind * 30.0) * mix(0.6, smoothstep(0.15, 0.4, lace), fine);
    let trail = exp(-behind * 4.0) * mix(0.45, smoothstep(0.15 + 0.6 * behind, 0.5 + 0.35 * behind, lace), fine);
    // (from where one breaker cannot be told from the next, the surf is its mean: a white band along the beach)
    var foam = mix(breaking * 0.45, breaking * max(roll, trail), shown(55.0, seen));
    // the swash: each wave runs up the beach face and draws back
    s.reach = 4.0 + 3.0 * sin(clock * 0.816 + along * 0.05) + 1.5 * sin(clock * 0.37 + along * 0.013);
    let edge = 1.0 - smoothstep(0.0, 0.6 + seen, abs(out_ + s.reach));
    foam = max(foam, edge * mix(0.6, smoothstep(0.3, 0.6, lace), fine));
    // (spent foam drifting between the bar and the beach)
    foam = max(foam, smoothstep(0.5, 0.9, depth) * (1.0 - smoothstep(1.2, 2.2, depth)) * 0.25
        * smoothstep(0.55, 0.8, lace) * fine);
    s.foam = foam;
    // the swell itself, steepening as it shoals: too gentle to see past a few hundred metres out
    let near_shore = (1.0 - smoothstep(120.0, 350.0, out_)) * smoothstep(-3.0, 3.0, out_) * shown(55.0, seen);
    let crest = 0.5 + 0.5 * sin(phase);
    let amp = 0.32 * (1.0 + 0.5 * (1.0 - smoothstep(0.8, 2.5, depth)));
    s.slope = -ashore * (amp * 6.0 * crest * crest * cos(phase) * 0.5 * TAU / 55.0) * near_shore;
    return s;
}

// What the sea sends back up from within, by its depth in metres (src/viewer/earth-surface.ts WATER_GLSL, which
// this follows): the deep water's own colour, and over a shallow bed the light that reaches the bed and comes
// back, which loses its red in a few metres and its green in tens, so pale sand under 3 m of water is turquoise
// and under 20 m blue. Twice the water's diffuse attenuation (clear ocean water, Jerlov type IB: about 0.35,
// 0.07 and 0.035 a metre) over carbonate sand on a bank; elsewhere a darker bed of quartz sand under water little
// more than half as clear, a continental shelf's (the web build has a darker bed still under murkier water, which hides
// the Cape's shoals; they show from the air). Estimated from those, not measured here.
fn water(bank: f32, depth: f32, deep: vec3<f32>) -> vec3<f32> {
    let bed = mix(vec3(0.2, 0.2, 0.15), vec3(0.40, 0.42, 0.37), bank);
    return deep + (bed - deep) * exp(-vec3(0.70, 0.14, 0.07) * mix(1.8, 1.0, bank) * max(depth, 0.0));
}

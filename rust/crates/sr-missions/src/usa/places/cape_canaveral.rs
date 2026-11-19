//! Cape Canaveral: its launch complexes on the Earth (`missions/usa/places/cape-canaveral/`).

use sr_measure::Measure;

use crate::SiteDef;
use crate::types::Region;

/// The Cape's region (`public/globe/cape-canaveral.json`, level `near`: the coastline as of 1961-05-05, from
/// OpenStreetMap, 39 m to a texel).
pub const REGION: Region = Region {
    shore: "cape-canaveral.near.png",
    half_width: 0.012_566_597_031_386_075,
    texels: 4096,
    spread: 8,
};

/// Launch Complex 5: the origin of the pad model's frame is the launcher's centre on the hardstand
/// (`missions/usa/places/cape-canaveral/lc-5.ts`, and `lc-5.md`, "The site's frame").
pub const LC5: SiteDef = SiteDef {
    name: "Cape Canaveral, Launch Complex 5",
    latitude: Measure::documented(
        28.439426,
        "OpenStreetMap relation 16884747, the launcher at the middle of the hardstand, traced from imagery (a few \
         metres); Wikipedia gives 28.43944 N for the complex. No surveyed coordinate was found",
    ),
    longitude: Measure::documented(
        -80.573292,
        "OpenStreetMap relation 16884747, as the latitude; Wikipedia gives 80.57333 W",
    ),
    height: Measure::estimated(
        -27.0,
        "about 2 m above mean sea level (USGS GNIS feature 285392: 6 ft), and mean sea level at the Cape is about \
         29 m below the WGS 84 ellipsoid (EGM96, to the nearest metre)",
    ),
    sea_level: Measure::estimated(-29.0, "the EGM96 geoid at the Cape, read to the nearest metre"),
    bearing_x: Measure::estimated(
        295.0,
        "square to the rails, which run 025/205 degrees true (OpenStreetMap, within 1 degree), on the side the \
         blockhouse and the cherry picker's truck are (TM X-53107 Figure 7-6; liftoff photograph 6100884)",
    ),
    grade: Measure::estimated(
        -0.12,
        "the hardstand and the roads were laid at grade (photographs of July 1961), so the sand is a hand's breadth \
         under the concrete: 12 cm is chosen",
    ),
    region: Some(REGION),
    made: Some(super::lc5_ground::MADE),
};

/// What stood round Complex 5 in May 1961, in the pad's frame: the blockhouse, Pad 6 and its gantry, the roads.
pub const LC5_SURROUNDINGS_1961_05: &str = "usa/places/cape-canaveral/lc5/1961-05.glb";

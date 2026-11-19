//! A piece of the Earth laid flat, finer than the globe's maps: the web build's regional maps, each on the plane
//! touching the sphere at its own middle (`src/world/region.ts`: the gnomonic projection of directions from the
//! Earth's centre), described by the JSON its tool wrote beside it (`tools/globe-region.mjs`,
//! `tools/globe-surface.mjs`).

use bevy::math::{DVec3, DVec4};
use bevy::prelude::*;
use sr_world::earth;

use super::json::Json;

/// A map on such a plane.
#[derive(Debug, Clone, PartialEq)]
pub struct Chart {
    /// Its file under `public/globe/`.
    pub file: String,
    /// Its middle: geodetic latitude and longitude, degrees.
    pub centre: [f64; 2],
    /// What it covers on its plane, in units of the sphere's radius: west, east, south, north (its `box`).
    pub bounds: [f64; 4],
    /// Metres of ground to a texel, at its middle.
    pub metres: f64,
    /// How far in from its edge it is faded in, on the plane.
    pub fade: f64,
}

impl Chart {
    fn read(file: &Json, place: &Json) -> Option<Self> {
        Some(Self {
            file: file.get("file")?.text()?.to_owned(),
            centre: place.get("centre")?.numbers()?,
            bounds: place.get("box")?.numbers()?,
            metres: file.get("metres")?.number()?,
            fade: place.get("fade")?.number()?,
        })
    }

    /// The plane's east, north and middle as Earth-fixed unit vectors (`planeAt` in `src/world/region.ts`).
    #[must_use]
    pub fn plane(&self) -> [DVec3; 3] {
        let middle =
            DVec3::from_array(earth::ecef(self.centre[0], self.centre[1], 0.0).to_array()).normalize();
        let east = DVec3::Z.cross(middle).normalize();
        [east, middle.cross(east), middle]
    }

    /// The plane as a shader takes it: east, north, middle, then the bounds.
    #[must_use]
    pub fn uniforms(&self) -> [Vec4; 4] {
        let [east, north, middle] = self.plane().map(|v| v.as_vec3().extend(0.0));
        [east, north, middle, DVec4::from_array(self.bounds).as_vec4()]
    }
}

/// A region's wider shore map, from `<region>.json`: the level named `wide`, and how many texels it keeps a
/// distance over.
#[must_use]
pub fn wide(region: &Json) -> Option<(Chart, f32)> {
    let spread = region.get("spread")?.number()? as f32;
    let level =
        region.get("levels")?.list().iter().find(|l| l.get("name").and_then(Json::text) == Some("wide"))?;
    Some((Chart::read(level, level)?, spread))
}

/// A region's surface, from `<region>.surface.json`: the height of the solid surface and the land's colour on one
/// plane, and the banks of pale sand it names (latitude, longitude, radius in km).
#[derive(Debug, Clone, PartialEq)]
pub struct Surface {
    /// The relief (`src/world/relief.ts` says how a height is kept in a byte).
    pub relief: Chart,
    /// The colour.
    pub colour: Chart,
    /// The banks.
    pub banks: Vec<[f64; 3]>,
}

impl Surface {
    /// Read from the tool's JSON.
    #[must_use]
    pub fn read(surface: &Json) -> Option<Self> {
        Some(Self {
            relief: Chart::read(surface.get("relief")?, surface)?,
            colour: Chart::read(surface.get("colour")?, surface)?,
            banks: surface
                .get("banks")
                .map_or(&[][..], Json::list)
                .iter()
                .filter_map(Json::numbers)
                .collect(),
        })
    }

    /// Each bank as a shader takes it: the Earth-fixed direction of its middle and the cosine of its radius.
    #[must_use]
    pub fn banks(&self, radius: f64) -> Vec<Vec4> {
        let bank = |&[latitude, longitude, km]: &[f64; 3]| {
            let middle = DVec3::from_array(earth::ecef(latitude, longitude, 0.0).to_array()).normalize();
            middle.extend((km * 1000.0 / radius).cos()).as_vec4()
        };
        self.banks.iter().map(bank).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const REGION: &str = r#"{ "spread": 8, "levels": [
        { "name": "near", "file": "a.near.png", "centre": [28.4, -80.5], "box": [-0.01, 0.01, -0.01, 0.01],
          "metres": 39.0, "fade": 0.001 },
        { "name": "wide", "file": "a.wide.png", "centre": [27.6, -78.35], "box": [-0.05, 0.05, -0.03, 0.04],
          "metres": 155.0, "fade": 0.005 } ] }"#;

    #[test]
    fn the_wide_level_is_found() {
        let (chart, spread) = wide(&Json::parse(REGION).unwrap()).unwrap();
        assert_eq!(chart.file, "a.wide.png");
        assert_eq!(chart.bounds, [-0.05, 0.05, -0.03, 0.04]);
        assert_eq!(spread, 8.0);
    }

    #[test]
    fn a_plane_is_square_and_its_north_is_north() {
        let (chart, _) = wide(&Json::parse(REGION).unwrap()).unwrap();
        let [east, north, middle] = chart.plane();
        assert!(east.dot(north).abs() < 1e-12 && east.dot(middle).abs() < 1e-12);
        assert!((east.cross(north) - middle).length() < 1e-12);
        // North of the equator the way north leans toward the pole; east has no part along the axis.
        assert!(north.z > 0.0 && east.z.abs() < 1e-12);
        // 78.35 W: the middle is in the quadrant of +X and -Y.
        assert!(middle.x > 0.0 && middle.y < 0.0);
    }
}

//! The field's tests: it tiles, it covers what the day says, and its texture holds what it is given.

use super::*;

/// The fraction of a tile within `spread` radii of a turret.
fn covered(spread: f32) -> f32 {
    let n = 400;
    let mut inside = 0;
    for i in 0..n * n {
        let p = Vec2::new((i % n) as f32 + 0.5, (i / n) as f32 + 0.5) * (CELLS as f32 / n as f32);
        inside += u32::from(near(p).scaled < spread);
    }
    inside as f32 / (n * n) as f32
}

#[test]
fn a_half_holds_what_it_is_given() {
    assert_eq!(half(1.0), 0x3C00_u16.to_le_bytes());
    assert_eq!(half(0.5), 0x3800_u16.to_le_bytes());
    assert_eq!(half(6.0), 0x4600_u16.to_le_bytes());
    assert_eq!(half(0.0), [0, 0]);
}

#[test]
fn it_tiles() {
    for &(x, y) in &[(0.3, 5.2), (15.9, 0.1), (7.7, 15.95)] {
        let p = Vec2::new(x, y);
        assert!((near(p).scaled - near(p + Vec2::new(CELLS as f32, 0.0)).scaled).abs() < 1.0e-3);
        assert!((near(p).scaled - near(p - Vec2::new(0.0, CELLS as f32)).scaled).abs() < 1.0e-3);
    }
}

#[test]
fn the_day_s_cover_is_what_the_field_covers() {
    for cover in [0.05, 0.1, 0.2, MOST] {
        // (the outline the noise cuts back from; the shader's gathering, whose mean is 1, left out)
        let got = covered(lay(cover, 1500.0).x * (1.0 - EDGE));
        assert!((got - cover).abs() < 0.1 * cover, "{cover} of the sky asked for, {got} covered");
    }
}

#[test]
fn the_clear_way_is_never_too_long() {
    // (the march strides as far as `clear` says: nothing within it may be inside a turret spread OPEN_AT times)
    for i in 0..300 {
        let p = Vec2::new((i * 37 % 160) as f32 * 0.1, (i * 53 % 160) as f32 * 0.1);
        let clear = near(p).clear;
        if clear <= 0.0 {
            continue;
        }
        for ring in [0.3_f32, 0.6, 0.98] {
            for k in 0..24 {
                let angle = k as f32 / 24.0 * std::f32::consts::TAU;
                let there = p + ring * clear * Vec2::new(angle.cos(), angle.sin());
                assert!(
                    near(there).scaled >= OPEN_AT * 0.999,
                    "{p}: clear {clear}, but {there} is in a cloud"
                );
            }
        }
    }
}

#[test]
fn the_shaders_know_the_field_as_it_is() {
    let cover = include_str!("../../../../assets/shaders/clouds_cover.wesl");
    let clouds = include_str!("../../../../assets/shaders/clouds.wesl");
    for line in [
        format!("const CELLS: f32 = {:?};", CELLS as f32),
        format!("const GROWS_A: f32 = {:?};", GROWS[0]),
        format!("const GROWS_B: f32 = {:?};", GROWS[1]),
        format!("const EDGE: f32 = {EDGE:?};"),
        format!("const MOST: f32 = {MOST:?};"),
        format!("const OPEN_AT: f32 = {OPEN_AT:?};"),
    ] {
        assert!(cover.contains(&line), "clouds_cover.wesl lacks {line}");
    }
    let [a, b, c, d] = super::super::cover::SPREADS;
    let spreads = format!("vec4<f32>({a:?}, {b:?}, {c:?}, {d:?})");
    assert!(clouds.contains(&spreads), "clouds.wesl's COVER_SPREADS is not {spreads}");
    assert!(clouds.contains(&format!("const SHEET_TEXELS: f32 = {:?};", SIDE as f32)));
}

/// Prints how much is covered at each spread: for fitting [`GROWS`] after the field is changed.
#[test]
#[ignore = "a measurement, not a test"]
fn measure_growth() {
    for k in [0.5_f32, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0] {
        eprintln!("{k} {}", covered(k));
    }
}

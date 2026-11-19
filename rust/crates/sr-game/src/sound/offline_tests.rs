//! The flight flown without a window and listened to: what the whole of it comes to, from the game's own clock,
//! physics and cameras through the model and the synthesiser to the tape.

use super::*;
use crate::sound::cues::Cue;

/// The record's flight from `at` to `until`, heard from one of the cameras.
fn heard(name: &str, rig: &str, at: f64, until: f64) -> Render {
    let file = std::env::temp_dir().join(format!("sr-sound-{}-{name}.wav", std::process::id()));
    // (before liftoff the record is given the flight with G; after it, a flight joined is the record's already)
    let keys = if at < 0.0 { crate::script::parse(&format!("{}:G", at + 0.5)).unwrap() } else { Vec::new() };
    let options = Options {
        at,
        until: Some(until),
        rig: Some(rig.to_owned()),
        keys,
        hear: Some(file.clone()),
        ..Options::default()
    };
    let render = hear(&options).unwrap();
    let written = crate::sound::wav::read(&file).unwrap();
    assert!(
        (written[0].len() as f64 / f64::from(RATE) - (until - at)).abs() < 1.5,
        "{} frames",
        written[0].len()
    );
    assert!(written.iter().flatten().all(|sample| sample.abs() < 1.0), "nothing reaches full scale");
    let mut beside = file.clone().into_os_string();
    beside.push(".txt");
    std::fs::remove_file(&file).unwrap();
    std::fs::remove_file(&beside).unwrap();
    render
}

fn cues(render: &Render) -> Vec<Cue> {
    render.played.iter().map(|played| played.cue).collect()
}

#[test]
fn the_roar_reaches_each_camera_its_distance_over_the_speed_of_sound_after_the_flame() {
    for (rig, metres) in [("pad", 69.0), ("tracking", 253.0)] {
        let render = heard(rig, rig, -6.0, 3.0);
        let ((_, lit), onset) = (render.lit.unwrap(), render.onset.unwrap());
        let late = metres / 340.3;
        // (the tape is read a hundredth of a second at a time, and a knob takes three to come up)
        assert!((onset - lit - late).abs() < 0.03, "{rig}: {} s after the flame, for {late}", onset - lit);
        let solved = render.seconds.last().unwrap().delay.unwrap();
        assert!((solved - late).abs() < 0.01, "{rig}: {solved} against {late}");
        // Before it, the place: quiet, and not silent. With it, loud, and under full scale.
        let (quiet, loud) = (render.seconds[1], render.seconds[7]);
        assert!(quiet.rms < -36.0 && quiet.rms > -60.0, "{rig}: {}", quiet.rms);
        assert!(loud.rms > quiet.rms + 20.0 && loud.peak < 0.0, "{rig}: {} dB, peak {}", loud.rms, loud.peak);
        assert_eq!(cues(&render), [Cue::Ignition], "{rig}");
    }
}

#[test]
fn out_of_the_air_the_camera_beside_hears_nothing_and_the_cabin_hears_what_the_structure_brings() {
    // From T+140: cutoff at 141.8, the tower at 142.2 and the capsule's separation at 152.3, all above 60 km.
    let beside = heard("beside", "chase", 140.0, 160.0);
    assert!(beside.played.is_empty(), "{:?}", beside.played);
    // The last of the wind on the camera thins away (at 59 km it is 48 dB under full scale already), and then
    // there is nothing at all: not the engine's last two seconds, not the tower's rocket, not the posigrades.
    let levels: Vec<f32> = beside.seconds.iter().map(|second| second.rms).collect();
    assert!(levels[0] < -45.0 && levels.windows(2).all(|pair| pair[1] <= pair[0] + 0.5), "{levels:?}");
    assert_eq!(levels[19], -120.0, "{levels:?}");
    let aboard = heard("aboard", "onboard", 140.0, 160.0);
    let at = |cue: Cue| {
        aboard.played.iter().filter(|played| played.cue == cue).map(|played| played.t).collect::<Vec<_>>()
    };
    // Each when it happened: the structure has no delay. The tower's rocket, then the posigrades.
    let rockets = at(Cue::Rocket);
    assert!(
        rockets.len() == 2 && (rockets[0] - 142.2).abs() < 0.03 && (rockets[1] - 152.3).abs() < 0.03,
        "{rockets:?}"
    );
    assert_eq!(at(Cue::Bolt).len(), 2);
    // The engine's rumble before its cutoff, and after everything only the cabin: its fans, far under it.
    let (burning, coasting) = (aboard.seconds[0], aboard.seconds[18]);
    assert!(burning.rms > -34.0 && burning.centroid < 300.0, "{burning:?}");
    assert!(coasting.rms < burning.rms - 15.0 && coasting.rms > -60.0, "{coasting:?}");
}

#[test]
fn coming_down_the_capsules_shock_is_heard_beside_it_as_it_slows_and_again_when_the_sea_sends_it_back() {
    let render = heard("down", "chase", 515.0, 612.0);
    let booms: Vec<_> = render.played.iter().filter(|played| played.cue == Cue::Boom).collect();
    assert_eq!(booms.len(), 2, "{:?}", render.played);
    // The first as its cone opens past the camera, from close by: the vehicle is just under Mach 1 by then.
    let (own, back) = (booms[0], booms[1]);
    assert!(own.distance < 2000.0 && own.level > 120.0 && (0.05..0.5).contains(&own.seconds), "{own:?}");
    let then = render.seconds.iter().find(|second| second.t >= own.t).unwrap();
    assert!((0.7..1.1).contains(&then.mach), "Mach {} at the boom", then.mach);
    // The second has been down to the sea and back: twenty kilometres and more, a minute and more later, fainter.
    assert!(back.distance > 15_000.0 && back.t > own.t + 50.0 && back.level < own.level - 8.0, "{back:?}");
    // And between them, the drogue's mortar.
    let mortar = render.played.iter().find(|played| played.cue == Cue::Mortar).unwrap();
    assert!(mortar.t > own.t && mortar.t < back.t, "{mortar:?}");
}

//! Frames of the curtain and the opening written to a folder (`--film <dir> --frames <list>`), then the game
//! leaves: how the opening is looked at without a person watching it. They are drawn as `--shot`'s are, into an
//! image with no window (`shot::offscreen`). While filming, the opening runs a sixtieth
//! of a second a frame whatever the frame took, so a strip of frames is what sixty frames a second would show.

use std::path::PathBuf;

use bevy::prelude::*;
use bevy::render::view::screenshot::{ScreenshotCaptured, save_to_disk};

use super::{Opening, Phase};
use crate::Options;
use crate::curtain::Curtain;
use crate::shot::Offscreen;

/// A frame to write.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Frame {
    /// The curtain, once its words are up.
    Curtain,
    /// So many seconds into the opening.
    At(f64),
}

/// Where the frames go, and which.
#[derive(Debug, Clone, PartialEq)]
pub struct Film {
    /// The folder.
    pub dir: PathBuf,
    /// The frames, in order.
    pub frames: Vec<Frame>,
}

impl Film {
    /// Into `dir`, keeping the frames of one given before.
    #[must_use]
    pub fn new(dir: PathBuf, before: Option<Self>) -> Self {
        Self { dir, frames: before.map(|film| film.frames).unwrap_or_default() }
    }
}

/// The frames a list asks for: seconds, spans with a step (`20:30:0.5`) and `c` for the curtain.
#[must_use]
pub fn frames(list: &str) -> Option<Vec<Frame>> {
    let mut out = Vec::new();
    for item in list.split(',') {
        let parts: Vec<&str> = item.split(':').collect();
        match parts.as_slice() {
            ["c"] => out.push(Frame::Curtain),
            [at] => out.push(Frame::At(at.parse().ok()?)),
            [from, to, step] => {
                let (from, to, step): (f64, f64, f64) =
                    (from.parse().ok()?, to.parse().ok()?, step.parse().ok()?);
                if step <= 0.0 {
                    return None;
                }
                let count = ((to - from) / step + 1e-9).floor() as usize;
                out.extend((0..=count).map(|i| Frame::At(from + i as f64 * step)));
            }
            _ => return None,
        }
    }
    Some(out)
}

/// The curtain's frame is taken once it has been up this many frames: its words are laid out and drawn.
const CURTAIN_AFTER: u32 = 20;

/// What has been taken, and what is still being written.
#[derive(Resource, Default)]
pub struct Filming {
    next: usize,
    curtain_frames: u32,
    writing: usize,
    done: bool,
}

/// Each frame: the next frame wanted, if it is due.
pub fn take(
    mut commands: Commands,
    options: Res<Options>,
    curtain: Res<Curtain>,
    opening: Res<Opening>,
    offscreen: Option<Res<Offscreen>>,
    mut filming: ResMut<Filming>,
) {
    let Some(film) = &options.film else { return };
    let Some(&frame) = film.frames.get(filming.next) else {
        filming.done = true;
        return;
    };
    let (due, name) = match frame {
        Frame::Curtain => {
            filming.curtain_frames += u32::from(curtain.is_up());
            (filming.curtain_frames >= CURTAIN_AFTER, "curtain".to_owned())
        }
        Frame::At(at) => (opening.phase != Phase::Waiting && opening.tau >= at, format!("opening-{at:06.2}")),
    };
    if !due {
        return;
    }
    filming.next += 1;
    filming.writing += 1;
    let path = film.dir.join(format!("{name}.png"));
    commands.spawn(Offscreen::capture(offscreen.as_deref())).observe(save_to_disk(path)).observe(written);
}

fn written(_: On<ScreenshotCaptured>, mut filming: ResMut<Filming>) {
    filming.writing = filming.writing.saturating_sub(1);
}

/// Once every frame is taken and written, leave.
pub fn leave(filming: Res<Filming>, mut exit: MessageWriter<AppExit>, mut waited: Local<u32>) {
    if filming.done && filming.writing == 0 {
        // (a few frames more, for the last file to reach the disk)
        *waited += 1;
        if *waited > 10 {
            exit.write(AppExit::Success);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_list_of_frames_reads_as_it_is_written() {
        let got = frames("c,0,10:11:0.5").unwrap_or_default();
        assert_eq!(
            got,
            vec![Frame::Curtain, Frame::At(0.0), Frame::At(10.0), Frame::At(10.5), Frame::At(11.0)]
        );
        assert!(frames("1:2").is_none() && frames("x").is_none() && frames("1:2:0").is_none());
    }
}

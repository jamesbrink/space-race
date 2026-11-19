//! What the command line asked for.

use crate::script::Press;
use std::path::PathBuf;

use bevy::prelude::Resource;

/// How the game was started.
#[derive(Resource, Debug, Clone, PartialEq)]
pub struct Options {
    /// The window's size, in points.
    pub size: (u32, u32),
    /// Seconds from liftoff to open at.
    pub at: f64,
    /// Write one frame here and leave, instead of opening a window.
    pub shot: Option<PathBuf>,
    /// The camera for that frame: bearing and elevation in degrees, distance and height of what it looks at in m.
    pub pose: Option<[f32; 4]>,
    /// A camera placed anywhere, for a frame of the land: metres east, north and up of the site's origin, then the
    /// compass bearing and the elevation it looks along, degrees. It takes the place of the pad's rig.
    pub eye: Option<[f32; 5]>,
    /// The rig to open on, by name.
    pub rig: Option<String>,
    /// Print what a frame costs once a second.
    pub bench: bool,
    /// Open in the straight grade instead of the film's.
    pub reference: bool,
    /// Keys to press by themselves, at instants of the flight's clock.
    pub keys: Vec<Press>,
    /// The frame `shot` writes is taken when the flight's clock reaches this, s.
    pub until: Option<f64>,
    /// How many seconds of the flight pass in one of ours, to open at.
    pub rate: f32,
    /// Open with the sound off.
    pub mute: bool,
    /// Fly without a window and write what would have been heard here, a WAV file, instead of opening one.
    pub hear: Option<PathBuf>,
}

impl Default for Options {
    fn default() -> Self {
        Self {
            size: (1600, 900),
            at: -12.0,
            shot: None,
            pose: None,
            eye: None,
            rig: None,
            bench: false,
            reference: false,
            keys: Vec::new(),
            until: None,
            rate: 1.0,
            mute: false,
            hear: None,
        }
    }
}

/// How to use it.
pub const USAGE: &str = "\
space-race [--at <seconds>] [--size <w>x<h>] [--rig <name>] [--rate <n>] [--bench] [--reference] [--mute]
           [--shot <file.png> [--pose <bearing>,<elevation>,<distance>,<height>] [--until <seconds>]]
           [--eye <east>,<north>,<up>,<bearing>,<elevation>]
           [--keys <time>:<key>[:<held>],...] [--hear <file.wav> [--until <seconds>]]

  --at     seconds from liftoff to open at (default -12)
  --rig    pad | tracking | chase | onboard
  --shot   write one frame to a PNG and leave
  --pose   the camera for that frame, about the vehicle: degrees, degrees, metres, metres
  --eye    the camera for that frame, placed: metres east, north and up of the site, then the compass bearing and
           the elevation it looks along, degrees
  --until  take that frame when the flight's clock reaches this
  --rate   seconds of the flight in one of ours, to open at (1, 2, 4 ... 64)
  --keys   keys pressed by themselves at instants of the clock: 0:Space,18:W:9 is Space at liftoff's hold and
           W held nine seconds from T+18 (Space W S A D Q E T Z X B G P C L I H 1 2 3 4 [ ])
  --bench  print what a frame costs once a second
  --mute   open with the sound off (M puts it on)
  --hear   fly without a window, to --until, and write what would have been heard to a WAV file
  --reference  the straight grade, for judging colours, instead of the film's";

impl Options {
    /// From the arguments after the program's name.
    ///
    /// # Errors
    /// What was wrong with them, for showing with [`USAGE`].
    pub fn parse(args: impl IntoIterator<Item = String>) -> Result<Self, String> {
        let mut options = Self::default();
        let mut args = args.into_iter();
        while let Some(flag) = args.next() {
            match flag.as_str() {
                "--bench" => options.bench = true,
                "--reference" => options.reference = true,
                "--mute" => options.mute = true,
                _ => {}
            }
            if matches!(flag.as_str(), "--bench" | "--reference" | "--mute") {
                continue;
            }
            let value = args.next().ok_or_else(|| format!("{flag} needs a value"))?;
            let bad = || format!("{flag}: cannot read {value:?}");
            match flag.as_str() {
                "--at" => options.at = value.parse().map_err(|_| bad())?,
                "--rig" => options.rig = Some(value),
                "--until" => options.until = Some(value.parse().map_err(|_| bad())?),
                "--rate" => options.rate = value.parse().map_err(|_| bad())?,
                "--keys" => options.keys = crate::script::parse(&value)?,
                "--shot" => options.shot = Some(PathBuf::from(value)),
                "--hear" => options.hear = Some(PathBuf::from(value)),
                "--size" => {
                    let (w, h) = value.split_once('x').ok_or_else(bad)?;
                    options.size = (w.parse().map_err(|_| bad())?, h.parse().map_err(|_| bad())?);
                }
                "--pose" | "--eye" => {
                    let parts: Vec<f32> =
                        value.split(',').map(str::parse).collect::<Result<_, _>>().map_err(|_| bad())?;
                    if flag == "--pose" {
                        options.pose = Some(parts.try_into().map_err(|_| bad())?);
                    } else {
                        options.eye = Some(parts.try_into().map_err(|_| bad())?);
                    }
                }
                _ => return Err(format!("unknown option {flag}")),
            }
        }
        Ok(options)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(line: &str) -> Result<Options, String> {
        Options::parse(line.split_whitespace().map(String::from))
    }

    #[test]
    fn it_reads_what_it_documents() {
        let o = parse("--at 30 --size 1280x720 --shot out.png --pose 215,9,150,14 --bench").unwrap();
        assert_eq!((o.at, o.size, o.bench), (30.0, (1280, 720), true));
        assert_eq!(o.pose, Some([215.0, 9.0, 150.0, 14.0]));
        assert_eq!(parse("").unwrap(), Options::default());
        let o = parse("--keys 0:Space,18:W:9 --until 40 --rate 8").unwrap();
        assert_eq!((o.keys.len(), o.until, o.rate), (2, Some(40.0), 8.0));
    }

    #[test]
    fn it_says_what_was_wrong() {
        assert!(parse("--pose 1,2").is_err());
        assert_eq!(parse("--eye 10,-20,1.7,99,8").unwrap().eye, Some([10.0, -20.0, 1.7, 99.0, 8.0]));
        assert!(parse("--eye 1,2,3,4").is_err());
        assert!(parse("--nonsense 1").is_err());
        assert!(parse("--at").is_err());
    }
}

//! What the command line asked for.

use crate::opening::film::Film;
use crate::script::Press;
use std::path::PathBuf;

use bevy::prelude::Resource;

/// Where the game opens.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Begins {
    /// On the morning, played fast from the curtain to T-12, where the player takes it.
    Morning,
    /// At `--at` on the count, straight away.
    Count,
}

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
    /// Where it opens: on the morning played to T-12 (`opening/`) unless something asked to open somewhere else.
    pub begins: Begins,
    /// Frames of the curtain and the opening to write, and leave (`--film`, `--frames`).
    pub film: Option<Film>,
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
            begins: Begins::Morning,
            film: None,
        }
    }
}

/// How to use it.
pub const USAGE: &str = "\
space-race [--at <seconds>] [--size <w>x<h>] [--rig <name>] [--rate <n>] [--bench] [--reference] [--mute]
           [--shot <file.png> [--pose <bearing>,<elevation>,<distance>,<height>] [--until <seconds>]]
           [--eye <east>,<north>,<up>,<bearing>,<elevation>]
           [--keys <time>:<key>[:<held>],...] [--hear <file.wav> [--until <seconds>]]
           [--film <dir> [--frames <list>]]

  --at     seconds from liftoff to open at (default -12)
  --rig    pad | tracking | chase | onboard
  --shot   write one frame to a PNG and leave
  --pose   the camera for that frame, about the vehicle: degrees, degrees, metres, metres
  --eye    the camera for that frame, placed: metres east, north and up of the site, then the compass bearing and
           the elevation it looks along, degrees
  --until  take that frame when the flight's clock reaches this
  --rate   seconds of the flight in one of ours, to open at (1, 2, 4 ... 64)
  --keys   keys pressed by themselves at instants of the clock: 0:Space,18:W:9 is Space at liftoff's hold and
           W held nine seconds from T+18 (Space W S A D Q E T Z X B G P C L K N M - = I H 1 2 3 4 [ ])
  --bench  print what a frame costs once a second
  --mute   open with the sound off (M puts it on)
  --hear   fly without a window, to --until, and write what would have been heard to a WAV file
  --reference  the straight grade, for judging colours, instead of the film's
  --film   play the curtain and the opening and write frames of them to a folder, then leave
  --frames which: seconds of the opening, a span with a step, or c for the curtain (c,0,12.5,20:30:0.5)

  With none of --at, --shot, --pose, --eye, --keys, --bench or --hear it opens on the morning: the pad's last
  three hours played fast to T-12 (any key or click skips to it).";

impl Options {
    /// From the arguments after the program's name.
    ///
    /// # Errors
    /// What was wrong with them, for showing with [`USAGE`].
    pub fn parse(args: impl IntoIterator<Item = String>) -> Result<Self, String> {
        let mut options = Self::default();
        let mut args = args.into_iter();
        let mut placed = false;
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
                "--at" => {
                    options.at = value.parse().map_err(|_| bad())?;
                    placed = true;
                }
                "--rig" => options.rig = Some(value),
                "--until" => options.until = Some(value.parse().map_err(|_| bad())?),
                "--rate" => options.rate = value.parse().map_err(|_| bad())?,
                "--keys" => options.keys = crate::script::parse(&value)?,
                "--shot" => options.shot = Some(PathBuf::from(value)),
                "--hear" => options.hear = Some(PathBuf::from(value)),
                "--film" => options.film = Some(Film::new(PathBuf::from(value), options.film.take())),
                "--frames" => {
                    let frames = crate::opening::film::frames(&value).ok_or_else(bad)?;
                    let film = options.film.take().unwrap_or_else(|| Film::new(PathBuf::from("."), None));
                    options.film = Some(Film { frames, ..film });
                }
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
        // (anything that asks to open somewhere, or to measure or record a flight, starts there; a film is the opening)
        let elsewhere = options.shot.is_some() || options.pose.is_some() || options.eye.is_some();
        let measuring = !options.keys.is_empty() || options.bench || options.hear.is_some();
        options.begins = if options.film.is_some() || !(elsewhere || measuring || placed) {
            Begins::Morning
        } else {
            Begins::Count
        };
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
        assert_eq!(
            (parse("").unwrap().begins, parse("--rate 2").unwrap().begins),
            (Begins::Morning, Begins::Morning)
        );
        assert_eq!(
            (parse("--at -12").unwrap().begins, parse("--shot a.png").unwrap().begins),
            (Begins::Count, Begins::Count)
        );
        let o = parse("--at 30 --film shots --frames c,0,10:11:0.5").unwrap();
        assert_eq!(o.begins, Begins::Morning);
        assert!(o.film.is_some_and(|film| film.frames.len() == 5));
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

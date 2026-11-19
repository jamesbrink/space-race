//! Fly a flight without a window and write what would have been heard to a WAV file, with a report beside it
//! (`<file>.txt`: each second's level, peak and spectrum, how late the engine's sound was, everything that
//! happened once). It takes the game's own command line:
//!
//! ```sh
//! cargo run --release -p sr-game --example hear -- --hear out.wav --at -4 --keys 0:G --until 60 --rig pad
//! ```

use std::process::ExitCode;

use sr_game::Options;
use sr_game::options::USAGE;
use sr_game::sound::offline::hear;

fn main() -> ExitCode {
    let options = match Options::parse(std::env::args().skip(1)) {
        Ok(options) => options,
        Err(wrong) => {
            eprintln!("{wrong}\n\n{USAGE}");
            return ExitCode::from(2);
        }
    };
    match hear(&options) {
        Ok(render) => {
            eprintln!("{} s written, {} things heard once", render.seconds.len(), render.played.len());
            ExitCode::SUCCESS
        }
        Err(wrong) => {
            eprintln!("{wrong}");
            ExitCode::FAILURE
        }
    }
}

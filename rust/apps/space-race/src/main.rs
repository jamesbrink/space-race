//! Space Race, native: reads the command line and opens the game.

use std::process::ExitCode;

use sr_game::options::USAGE;
use sr_game::{AppExit, Options};

fn main() -> ExitCode {
    let options = match Options::parse(std::env::args().skip(1)) {
        Ok(options) => options,
        Err(wrong) => {
            eprintln!("{wrong}\n\n{USAGE}");
            return ExitCode::from(2);
        }
    };
    // Heard and not seen: fly without a window and write the sound to a file.
    if options.hear.is_some() {
        return match sr_game::sound::offline::hear(&options) {
            Ok(_) => ExitCode::SUCCESS,
            Err(wrong) => {
                eprintln!("{wrong}");
                ExitCode::FAILURE
            }
        };
    }
    match sr_game::run(options) {
        AppExit::Success => ExitCode::SUCCESS,
        AppExit::Error(code) => ExitCode::from(code.get()),
    }
}

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
    match sr_game::run(options) {
        AppExit::Success => ExitCode::SUCCESS,
        AppExit::Error(code) => ExitCode::from(code.get()),
    }
}

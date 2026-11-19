//! The opening's shots, as data: where the eye stands, what it looks at, the lens, and the stretch of the flight's
//! clock each covers. Presentation, all of it: the shot list is ours, chosen to follow what moves on the pad that
//! morning and to face into the light where the morning is beautiful. Where a shot follows a part of the pad it
//! names the part's node, so it follows the part wherever the morning's motions take it.
//!
//! The site's frame: the launcher at the origin, +X square to the rails toward the blockhouse and the cherry picker
//! (bearing 295), +Z along them (025); the structure rolls back toward -Z. The early Sun is low toward -X and +Z.

/// Where the eye stands, or what it looks at.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Spot {
    /// A place in the site's frame, m.
    At([f64; 3]),
    /// A pad node's place now, and so far from it in the site's frame, m.
    On(&'static str, [f64; 3]),
    /// Where the player's camera on the pad stands, or what it looks at: the shot hands over to it.
    Rig,
}

/// How a shot is come to from the one before it.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Enter {
    /// Straight to it.
    Cut,
    /// Down to dark and up again over so many seconds of the opening: time has passed.
    Dip(f64),
}

/// How a shot's move goes from its start to its end over its seconds.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Ease {
    /// Evenly.
    Even,
    /// Gathering at the start and settling at the end.
    Both,
    /// Evenly, then settling: what hands over to the player.
    Settle,
}

/// A shot.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Shot {
    /// What it is of.
    pub name: &'static str,
    /// The flight's clock when it begins and ends, s from liftoff.
    pub from: f64,
    /// As `from`.
    pub to: f64,
    /// Where the eye stands at its start and its end.
    pub eye: [Spot; 2],
    /// What it looks at, at its start and its end.
    pub look: [Spot; 2],
    /// The lens's vertical field at its start and its end, degrees.
    pub lens: [f64; 2],
    /// How it is come to.
    pub enter: Enter,
    /// How its move goes.
    pub ease: Ease,
}

/// The shot list.
pub const SHOTS: [Shot; 7] = [
    Shot {
        // (straight into the Sun this low the haze takes everything: it stands off to the left, edging the steel)
        name: "Dawn, the Sun low to the left: the last platforms part round the rocket, the trailer and the huts go",
        from: -11_050.0,
        to: -10_640.0,
        eye: [Spot::At([-50.0, 1.8, -98.0]), Spot::At([-60.0, 2.2, -88.0])],
        look: [Spot::At([0.0, 17.0, 0.0]), Spot::At([0.0, 18.0, 2.0])],
        lens: [34.0, 30.0],
        enter: Enter::Cut,
        ease: Ease::Even,
    },
    Shot {
        name: "The gantry rolls back, followed along its rails, and leaves the rocket standing",
        from: -10_640.0,
        to: -10_330.0,
        eye: [
            Spot::On("ServiceStructure", [58.0, 3.0, 22.0]),
            Spot::On("ServiceStructure", [64.0, 5.0, 40.0]),
        ],
        look: [Spot::On("ServiceStructure", [-2.0, 20.0, 10.0]), Spot::At([0.0, 16.0, 0.0])],
        lens: [34.0, 32.0],
        enter: Enter::Cut,
        ease: Ease::Both,
    },
    Shot {
        name: "The cherry picker's cab rises to the hatch, seen from beside its truck",
        from: -10_330.0,
        to: -10_150.0,
        eye: [Spot::At([33.0, 1.6, 16.0]), Spot::At([31.0, 2.4, 13.0])],
        look: [Spot::On("CherryPicker_Cab", [0.0, 1.0, 0.0]), Spot::On("CherryPicker_Cab", [0.0, 1.0, 0.0])],
        lens: [44.0, 30.0],
        enter: Enter::Cut,
        ease: Ease::Both,
    },
    Shot {
        // (from the blockhouse's roof: on the ground out here the scrub stands in front of a long lens)
        name: "The long wait: a long lens from the blockhouse's roof, the light coming round as the Sun climbs",
        from: -10_150.0,
        to: -700.0,
        eye: [Spot::At([63.0, 15.5, 93.0]), Spot::At([60.0, 15.5, 90.0])],
        look: [Spot::At([-4.0, 17.0, -14.0]), Spot::At([-2.0, 16.0, -8.0])],
        lens: [20.0, 16.0],
        enter: Enter::Dip(1.2),
        ease: Ease::Even,
    },
    Shot {
        name: "The structure goes on to its launch position: low and wide, the Sun behind the eye",
        from: -700.0,
        to: -420.0,
        eye: [Spot::At([-62.0, 1.3, -12.0]), Spot::At([-58.0, 1.6, -22.0])],
        look: [Spot::On("ServiceStructure", [0.0, 16.0, 6.0]), Spot::At([0.0, 14.0, -18.0])],
        lens: [46.0, 44.0],
        enter: Enter::Dip(1.0),
        ease: Ease::Both,
    },
    Shot {
        name: "The cab away and down, a long lens into the light",
        from: -420.0,
        to: -120.0,
        eye: [Spot::At([62.0, 5.0, -64.0]), Spot::At([60.0, 5.0, -60.0])],
        look: [Spot::At([3.0, 20.0, 0.0]), Spot::At([6.0, 15.0, 0.0])],
        lens: [17.0, 20.0],
        enter: Enter::Cut,
        ease: Ease::Both,
    },
    Shot {
        name: "The masts fall: a slow crane out and up from the Redstone's tail, settling where the player takes it",
        from: -120.0,
        to: -12.0,
        eye: [Spot::At([-7.0, 1.3, -25.0]), Spot::Rig],
        look: [Spot::At([0.0, 6.0, 0.0]), Spot::Rig],
        lens: [52.0, 47.0],
        enter: Enter::Cut,
        ease: Ease::Settle,
    },
];

/// How far along its move a shot is `p` of the way through its seconds.
#[must_use]
pub fn eased(ease: Ease, p: f64) -> f64 {
    let p = p.clamp(0.0, 1.0);
    match ease {
        Ease::Even => p,
        Ease::Both => p * p * p * (p * (6.0 * p - 15.0) + 10.0),
        // even for most of it, slowing to a stop: the derivative is 1 at the start and 0 at the end
        Ease::Settle => p * (2.0 - p),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_shots_follow_one_another_from_the_first_paced_instant_to_the_hand_over() {
        assert_eq!(SHOTS[0].from, super::super::pace::PACES[0].at);
        assert_eq!(SHOTS[SHOTS.len() - 1].to, -12.0);
        assert!(SHOTS.windows(2).all(|pair| pair[0].to == pair[1].from && pair[0].from < pair[0].to));
        assert_eq!(SHOTS[SHOTS.len() - 1].eye[1], Spot::Rig);
    }

    #[test]
    fn a_move_starts_where_it_starts_and_stops_where_it_stops() {
        for ease in [Ease::Even, Ease::Both, Ease::Settle] {
            assert_eq!((eased(ease, 0.0), eased(ease, 1.0)), (0.0, 1.0));
        }
        // settling: still at the end
        assert!((eased(Ease::Settle, 1.0) - eased(Ease::Settle, 0.999)) < 1e-5);
    }
}

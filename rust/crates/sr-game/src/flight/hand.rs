//! The hand on the controls: what the pilot has switched, and the keys that switch it.
//!
//! By hand is how the flight starts (the web build's rule too: the record is an aid, not the game): the engine is
//! lit, the vehicle steered and each piece let go by the player, in any order, and each act has the consequence the
//! hardware would have had. G before the engine is lit hands the flight to the record instead.

use bevy::prelude::*;
use sr_sim::{Body, Drive, Plan};

use super::fire;
use crate::clock::Clock;
use crate::{Options, Showing};

/// What the next press of the action key does.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Action {
    /// Light the booster's engine.
    Light,
    /// Let the escape tower go.
    Tower,
    /// Separate the capsule from the booster.
    Separate,
    /// Fire the retrorockets.
    Retro,
    /// Let the retropack go.
    Retropack,
    /// Nothing is left to do: the parachutes come out by themselves.
    Nothing,
}

impl Action {
    /// What the readout calls it.
    #[must_use]
    pub fn label(self) -> &'static str {
        match self {
            Self::Light => "light the engine",
            Self::Tower => "jettison the tower",
            Self::Separate => "separate the capsule",
            Self::Retro => "fire the retrorockets",
            Self::Retropack => "jettison the retropack",
            Self::Nothing => "nothing: the parachutes are automatic",
        }
    }
}

/// Why a piece of the vehicle was lost.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Why {
    /// The air bent it past what it stands.
    Bending,
    /// The load on it was past what it stands.
    Load,
    /// It struck something.
    Blow,
}

/// A piece of the vehicle lost.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Loss {
    /// Why.
    pub why: Why,
    /// By how much: the part of its limit the bending or the load came to, or the speed lost in the blow, m/s.
    pub by: f64,
    /// When, s on the clock.
    pub t: f64,
}

impl Loss {
    /// What the readout says of it.
    #[must_use]
    pub fn reading(&self) -> String {
        match self.why {
            Why::Bending => "the air bent it past what it stands".to_owned(),
            Why::Load => "it was loaded past what it stands".to_owned(),
            Why::Blow => format!("struck at {:.0} m/s", self.by),
        }
    }
}

/// What the pilot has switched.
#[derive(Resource, Debug, Clone, PartialEq)]
pub struct Hand {
    /// The flight is flown by the record, hands off.
    pub guided: bool,
    /// The attitude is held: the stick asks for a rate of turn, and letting it go stops the turn.
    pub hold: bool,
    /// The stick: pitch, yaw and roll, each -1 to 1.
    pub stick: Vec3,
    /// The booster's engine is burning.
    pub burning: bool,
    /// Propellant left, kg.
    pub propellant: f64,
    /// When the engine was first lit, the tower let go, the capsule separated, the retrorockets fired and the
    /// retropack let go: seconds on the clock, `None` until it has happened.
    pub lit: Option<f64>,
    /// As `lit`.
    pub tower: Option<f64>,
    /// As `lit`.
    pub separated: Option<f64>,
    /// As `lit`.
    pub retro: Option<f64>,
    /// As `lit`.
    pub retropack: Option<f64>,
    /// The booster broke up.
    pub broke: Option<Loss>,
    /// The capsule, and the man in it, were lost: nothing more can be done.
    pub lost: Option<Loss>,
}

impl Hand {
    /// At the start: by hand unless the flight was joined after liftoff, which only the record can do.
    #[must_use]
    pub fn new(plan: &Plan, at: f64) -> Self {
        Self {
            guided: at > 0.0,
            hold: true,
            stick: Vec3::ZERO,
            burning: false,
            propellant: plan.usable_propellant(),
            lit: None,
            tower: None,
            separated: None,
            retro: None,
            retropack: None,
            broke: None,
            lost: None,
        }
    }

    /// Something has failed: the booster under the capsule, or the capsule itself (a blow takes both). A flight
    /// on the record is the record's no longer: what it had done by now is done, and the rest is the hand's.
    pub fn fail(&mut self, plan: &Plan, body: Body, loss: Loss) {
        let t = loss.t;
        if self.guided {
            let done = |at: f64| (t >= at).then_some(at);
            self.guided = false;
            self.propellant = plan.usable_propellant() - plan.engine.flow() * t.clamp(0.0, plan.cutoff.value);
            self.lit = Some(0.0);
            self.tower = done(plan.tower_off.value);
            self.separated = done(plan.separation.value);
            self.retro = done(plan.retro_fires[0].value);
            self.retropack = done(plan.retropack_off.value);
        }
        if body == Body::Stack && self.broke.is_none() {
            // What was on the booster comes off it as it goes.
            self.broke = Some(loss);
            self.burning = false;
            self.lit.get_or_insert(t);
            self.tower.get_or_insert(t);
            self.separated.get_or_insert(t);
        }
        if (body == Body::Capsule || loss.why == Why::Blow) && self.lost.is_none() {
            self.lost = Some(loss);
            self.burning = false;
        }
    }

    /// What the action key does next.
    #[must_use]
    pub fn next(&self) -> Action {
        match (self.lit, self.tower, self.separated, self.retro, self.retropack) {
            _ if self.lost.is_some() => Action::Nothing,
            (None, ..) => Action::Light,
            (_, None, ..) => Action::Tower,
            (_, _, None, ..) => Action::Separate,
            (_, _, _, None, _) => Action::Retro,
            (_, _, _, _, None) => Action::Retropack,
            _ => Action::Nothing,
        }
    }

    /// Do it, at this instant.
    pub fn act(&mut self, t: f64) {
        match self.next() {
            Action::Light => {
                self.lit = Some(t);
                self.burning = self.propellant > 0.0;
            }
            Action::Tower => self.tower = Some(t),
            // (the booster's engine is cut as the capsule leaves it, as the sequencer did)
            Action::Separate => {
                self.separated = Some(t);
                self.burning = false;
            }
            Action::Retro => self.retro = Some(t),
            Action::Retropack => self.retropack = Some(t),
            Action::Nothing => {}
        }
    }

    /// When the tower, the booster and the retropack leave: the record's times, or the hand's.
    #[must_use]
    pub fn leaves(&self, plan: &Plan) -> [Option<f64>; 3] {
        if self.guided {
            [Some(plan.tower_off.value), Some(plan.separation.value), Some(plan.retropack_off.value)]
        } else {
            [self.tower, self.separated, self.retropack]
        }
    }

    /// Whether the capsule is free of its booster.
    #[must_use]
    pub fn free(&self, plan: &Plan, t: f64) -> bool {
        if self.guided { t >= plan.separation.value } else { self.separated.is_some() }
    }

    /// How hard the engine burns, 0 to 1, for its fire.
    #[must_use]
    pub fn fire(&self, plan: &Plan, t: f64) -> f32 {
        if self.guided { fire::burning(t, plan.cutoff.value) } else { f32::from(self.burning) }
    }

    /// How much of the propellant is left, 0 to 1.
    #[must_use]
    pub fn remaining(&self, plan: &Plan, t: f64) -> f64 {
        let whole = plan.usable_propellant();
        if self.guided {
            1.0 - plan.engine.flow() * t.clamp(0.0, plan.cutoff.value) / whole
        } else {
            self.propellant / whole
        }
    }

    /// What a body's engines are doing and what it weighs.
    #[must_use]
    pub fn drive(&self, plan: &Plan, body: Body, t: f64) -> Drive {
        if self.guided {
            return Drive::flown(plan, body, t);
        }
        let quiet = Drive { mass: 0.0, burning: false, retro: 0.0, tower: 0.0 };
        match body {
            Body::Stack => {
                let burned = plan.usable_propellant() - self.propellant;
                let tower = if self.tower.is_some() { plan.tower_mass.value } else { 0.0 };
                Drive { mass: plan.liftoff_mass.value - burned - tower, burning: self.burning, ..quiet }
            }
            Body::Capsule => {
                let pack = if self.retropack.is_some() {
                    plan.capsule_mass.value - plan.entry_mass.value
                } else {
                    0.0
                };
                // Each retrorocket fires as long after the first as the record has it.
                let first = plan.retro_fires[0].value;
                let retro = self.retro.map_or(0.0, |lit| {
                    plan.retro_fires
                        .iter()
                        .map(|fired| plan.retro.thrust_after(t - lit - (fired.value - first)))
                        .sum()
                });
                Drive { mass: plan.capsule_mass.value - pack, retro, ..quiet }
            }
            Body::Booster => Drive { mass: plan.booster_mass.value, ..quiet },
            Body::Tower => {
                let since = self.tower.map_or(f64::MAX, |off| t - off);
                let tower = plan.tower_motors.iter().map(|motor| motor.thrust_after(since)).sum();
                Drive { mass: plan.tower_mass.value, tower, ..quiet }
            }
        }
    }
}

/// The hand's start.
pub fn take(mut commands: Commands, showing: Res<Showing>, options: Res<Options>) {
    commands.insert_resource(Hand::new(&showing.0.plan, options.at));
}

/// The keys: the stick, the engine, the action key, the hold and the record.
pub fn keys(keys: Res<ButtonInput<KeyCode>>, mut hand: ResMut<Hand>, mut clock: ResMut<Clock>) {
    let axis = |plus: KeyCode, minus: KeyCode| f32::from(keys.pressed(plus)) - f32::from(keys.pressed(minus));
    let stick = Vec3::new(
        axis(KeyCode::KeyW, KeyCode::KeyS),
        axis(KeyCode::KeyD, KeyCode::KeyA),
        axis(KeyCode::KeyE, KeyCode::KeyQ),
    );
    let stick = if hand.lost.is_some() { Vec3::ZERO } else { stick };
    if hand.stick != stick {
        hand.stick = stick;
    }
    if keys.just_pressed(KeyCode::KeyT) {
        hand.hold = !hand.hold;
    }
    // The record can only be given the flight while it is still on the pad, and takes its own count.
    if keys.just_pressed(KeyCode::KeyG) && hand.lit.is_none() {
        hand.guided = !hand.guided;
        clock.t = clock.t.min(-5.0);
    }
    if hand.guided || !clock.ready || hand.lost.is_some() {
        return;
    }
    if keys.just_pressed(KeyCode::Space) || (keys.just_pressed(KeyCode::KeyZ) && hand.lit.is_none()) {
        // Lit during the count, the count is over: liftoff is when the pilot says.
        clock.t = clock.t.max(0.0);
        hand.act(clock.t);
    }
    if keys.just_pressed(KeyCode::KeyZ)
        && hand.lit.is_some()
        && hand.separated.is_none()
        && hand.propellant > 0.0
    {
        hand.burning = true;
    }
    if keys.just_pressed(KeyCode::KeyX) {
        hand.burning = false;
    }
}

/// The engine drinks its propellant, and stops when one of them is gone.
pub fn burn(showing: Res<Showing>, clock: Res<Clock>, time: Res<Time>, mut hand: ResMut<Hand>) {
    if !clock.ready || hand.guided || !hand.burning {
        return;
    }
    hand.propellant -= showing.0.plan.engine.flow() * time.delta_secs_f64();
    if hand.propellant <= 0.0 {
        hand.propellant = 0.0;
        hand.burning = false;
    }
}

/// By hand the count holds at zero until the engine is lit: liftoff is when the pilot says.
pub fn hold_count(hand: Res<Hand>, mut clock: ResMut<Clock>) {
    if !hand.guided && hand.lit.is_none() && clock.t > 0.0 {
        clock.t = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sr_missions::usa::mercury::mr3::PLAN;

    #[test]
    fn the_action_key_goes_through_the_flight_in_order() {
        let mut hand = Hand::new(&PLAN, -12.0);
        let mut done = Vec::new();
        for t in 0..6 {
            done.push(hand.next());
            hand.act(f64::from(t));
        }
        let all = [
            Action::Light,
            Action::Tower,
            Action::Separate,
            Action::Retro,
            Action::Retropack,
            Action::Nothing,
        ];
        assert_eq!(done, all);
        assert!(!hand.burning, "separating cuts the engine");
    }

    #[test]
    fn a_booster_that_breaks_up_on_the_record_s_flight_throws_the_capsule_clear_and_the_hand_has_it() {
        let mut hand = Hand::new(&PLAN, 40.0);
        assert!(hand.guided);
        hand.fail(&PLAN, Body::Stack, Loss { why: Why::Bending, by: 1.2, t: 60.0 });
        assert!(!hand.guided && !hand.burning);
        assert_eq!((hand.tower, hand.separated), (Some(60.0), Some(60.0)));
        assert!(hand.lost.is_none(), "the capsule is whole");
        assert_eq!(hand.next(), Action::Retro);
        hand.fail(&PLAN, Body::Capsule, Loss { why: Why::Blow, by: 80.0, t: 200.0 });
        assert_eq!(hand.next(), Action::Nothing);
    }

    #[test]
    fn by_hand_the_stack_weighs_what_it_has_not_burned() {
        let mut hand = Hand::new(&PLAN, -12.0);
        assert!((hand.drive(&PLAN, Body::Stack, 0.0).mass - PLAN.liftoff_mass.value).abs() < 1e-6);
        hand.propellant -= 1000.0;
        hand.tower = Some(1.0);
        let lighter = PLAN.liftoff_mass.value - 1000.0 - PLAN.tower_mass.value;
        assert!((hand.drive(&PLAN, Body::Stack, 2.0).mass - lighter).abs() < 1e-6);
    }
}

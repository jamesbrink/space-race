//! What the air's heat is worked on, on a Mercury-Redstone (`mercury-redstone.ts`, `heated`): the capsule's heat
//! sink and shingles and the booster's skin.
//!
//! The shield's size, shape and thickness are the record's; how the heat is shared out over each surface, and how
//! well each radiates, are not in anything read, and say so. Nothing is fitted: no temperature measured on the
//! flight is in the sources read, so there is nothing to hold the result against.

use sr_measure::Measure;
use sr_sim::Body;
use sr_sim::heat::{Heating, Surface};

use super::redstone::IN;

/// Beryllium's density, kg/m^3, and its specific heat at 25 C, J/(kg K): quoted from memory as the CRC
/// Handbook's figures, the handbook not opened (the web build's `HANDBOOK`).
const BERYLLIUM: f64 = 1848.0;
const BERYLLIUM_HEAT: f64 = 1825.0;

const SURFACES: [Surface; 4] = [
    Surface {
        name: "Heat shield",
        on: Body::Capsule,
        up: None,
        down: Some(Measure::estimated(
            0.9,
            "the laminar flux over a sphere falls off from its stagnation point about as the cosine of the angle to \
             the power 1.5, and the cap reaches only 27.7 degrees: 0.83 at the rim, some 0.9 over the face. No \
             measured distribution read",
        )),
        areal_mass: Measure::estimated(
            BERYLLIUM * 1.0 * IN,
            "Hammack and Heberlig, p. 5: a beryllium heat sink \"approximately 1-inch-thick\", at 1,848 kg/m3: \
             46.9 kg behind each square metre. The thickness is approximate and the density remembered",
        ),
        specific_heat: Measure::estimated(
            BERYLLIUM_HEAT,
            "beryllium at 25 C; it rises with temperature, so held constant it overstates the rise",
        ),
        emissivity: Measure::estimated(
            0.5,
            "between bare polished beryllium (about 0.2) and an oxidised face (about 0.6): its finish is not read",
        ),
        limit: Measure::estimated(1560.0, "beryllium melts at 1,287 C, as remembered"),
    },
    Surface {
        name: "Afterbody shingles",
        on: Body::Capsule,
        up: Some(Measure::estimated(
            0.3,
            "a 20 degree cone's flank in attached flow, against the stagnation point of a 2 m sphere: a judgement. \
             CR-649 has the measurements; not read for them",
        )),
        down: Some(Measure::estimated(
            0.05,
            "in the wake behind the shield: a few per cent of the stagnation flux is the usual figure for a blunt \
             body's afterbody",
        )),
        areal_mass: Measure::estimated(
            8250.0 * 0.016 * IN,
            "Hammack and Heberlig; CR-649: Rene 41 shingles 0.016 in thick, at 8.25 g/cm3 as remembered of the \
             maker's sheet: 3.35 kg/m2. The insulation behind is left out",
        ),
        specific_heat: Measure::estimated(
            452.0,
            "Rene 41 at room temperature, 0.108 Btu/lb F, as remembered",
        ),
        emissivity: Measure::estimated(
            0.85,
            "the shingles had a dark oxidised finish so as to radiate: no figure read",
        ),
        limit: Measure::estimated(
            1255.0,
            "Rene 41 is used to about 1,800 F: the shingles' own limit is not read",
        ),
    },
    Surface {
        name: "Recovery compartment shingles",
        on: Body::Capsule,
        up: Some(Measure::estimated(
            0.15,
            "a cylinder lying along the flow behind the canister: half the cone's share, by judgement",
        )),
        down: Some(Measure::estimated(0.03, "furthest back in the wake: by judgement")),
        areal_mass: Measure::estimated(
            BERYLLIUM * 0.22 * IN,
            "Hammack and Heberlig; CR-649: beryllium shingles 0.22 in thick, at 1,848 kg/m3: 10.3 kg/m2",
        ),
        specific_heat: Measure::estimated(BERYLLIUM_HEAT, "beryllium at 25 C"),
        emissivity: Measure::estimated(0.5, "as the heat shield: the finish is not read"),
        limit: Measure::estimated(1560.0, "beryllium melts at 1,287 C, as remembered"),
    },
    Surface {
        name: "Booster skin",
        on: Body::Stack,
        up: Some(Measure::estimated(
            0.1,
            "a cylinder's side at no angle to the flow, far behind the nose: by judgement. No measurement read",
        )),
        down: None,
        areal_mass: Measure::estimated(
            2680.0 * 0.09 * IN,
            "NASA TM X-53107, 4.2.1: aft section skin 0.090 in of 5052 aluminium, at 2.68 g/cm3 as remembered: \
             6.1 kg/m2",
        ),
        specific_heat: Measure::estimated(880.0, "5052 aluminium at room temperature, as remembered"),
        emissivity: Measure::estimated(0.85, "white paint: by judgement"),
        limit: Measure::estimated(
            475.0,
            "aluminium alloys of this kind lose their strength from about 200 C: the booster's own limit is not read",
        ),
    },
];

/// The stack's heating, from what it stood at on its day, K.
#[must_use]
pub const fn heated(starts: Measure) -> Heating {
    Heating {
        nose_radius: Measure::documented(
            80.0 * IN,
            "NASA CR-649: the heat shield is a spherical cap of 80 in radius",
        ),
        starts,
        surfaces: &SURFACES,
    }
}

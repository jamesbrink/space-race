"""Common launch configuration for Gemini X to XII. Each spacecraft.md documents the flight's differences."""

import gemini_stack
from gemini_spacecraft import Fit

# These selectable mesh captions replace accounts of earlier missions embedded in the common geometry.
CAPTIONS = {
    "RR_MainParachute": (
        "Main parachute",
        "The main ringsail canopy was packed behind the radar face. After opening it lowered the cabin into its two-point landing attitude.",
    ),
    "RR_DrogueMortar": (
        "Drogue and pilot parachutes",
        "The drogue stabilized the returning spacecraft. The pilot parachute drew off the rendezvous section and extracted the main canopy.",
    ),
    "RCS_ThrustChambers": ("Reentry control chambers", "Two independent rings steered the cabin after the equipment adapter had been discarded."),
    "RCS_CableCover": (
        "Cable cover",
        "The external fairing continues along the side of the reentry assembly. Its position is assumed from earlier Gemini spacecraft.",
    ),
    "Cabin_CableCover": (
        "Cable cover",
        "A raised cover over the cable run outside the pressure vessel. Its position is assumed from earlier spacecraft.",
    ),
    "Retro_ForwardThrusters": ("Forward-facing thrusters", "These adapter thrusters could slow the spacecraft relative to its docking target."),
    "Retro_LateralThrusters": ("Lateral thrusters", "Four chambers allowed the pilot to translate the spacecraft sideways, upward and downward."),
    "Retro_Rockets": ("Retrorockets", "Four solid retrorockets in the adapter slowed the spacecraft for its return."),
    "Retro_WaterTank": ("Retrograde-section water tank", "One of the water tanks carried in the adapter; fittings and position are estimated."),
    "Equipment_AftThrusters": ("Aft-facing thrusters", "This pair pushed the spacecraft forward for separation and orbital maneuvering."),
    "Equipment_OamsTanks": (
        "Maneuvering propellant tanks",
        "The common four-position module was supplemented by the 22-inch oxidizer sphere on the former primary oxygen "
        "mount. See Gemini X figure 3.1-3.",
    ),
    "Equipment_FuelCells": (
        "Fuel cells",
        "Two sections held the hydrogen-oxygen fuel cells that supplied electricity and produced water. Both sections "
        "were grouped together as on spacecraft 7.",
    ),
    "Equipment_RssHydrogen": (
        "Fuel-cell hydrogen",
        "The cryogenic hydrogen supply for the fuel cells, supported on the same module as the shared oxygen supply.",
    ),
    "Equipment_WaterTankA": (
        "Product-water tank",
        "A tank on the fuel-cell module received the water produced by the cells. Its relocation is documented in "
        "Gemini X figure 3.1-2; the model’s mounts are estimated.",
    ),
    "Equipment_BlastShieldDoor": (
        "Retro-rocket access panel",
        "A removable panel between the module support beams gave access to the retrograde section.",
    ),
    "Equipment_Cover": (
        "Thermal curtain",
        "Gold-colored thermal fabric shielded equipment in the open end of the adapter. The pleats are estimated from earlier flight photographs.",
    ),
    "CrewCabin_InstrumentPanel": (
        "Instrument panels",
        "The two pilots faced separate panels with shared instruments between them. The cabin cutaway shows their "
        "relationship to the windows and ejection seats.",
    ),
    "CrewStation_PressureVessel": (
        "Pressure vessel",
        "A welded pressure vessel inside the outer shingles enclosed the crew. Equipment occupied the space between its sides and the outer shell.",
    ),
    "Stage1_OxidiserFeedConduit": (
        "External conduit",
        "The first stage carried this long fairing down the outside of its tanks. Its position follows the common Gemini launch vehicle drawing.",
    ),
    "Stage1Engine_PogoSuppressors": ("Oscillation suppressors", "The Gemini launch vehicle incorporated changes to limit longitudinal vibration."),
}


def build(number, names, target):
    fit = Fit(
        late=number,
        radar=True,
        mooring_latches=True,
        index_bar=True,
        docking_light=True,
        oams_tanks=2,
        oams_reserve_tank=number != 12,
        adapter_batteries=0,
        fuel_cells=True,
        water_tanks=0,
        module_water_tank=True,
        retro_water_tank=True,
        handrails=True,
        eva_light=True,
        gold_inside=True,
        window_covers=True,
        right_hatch_opens=True,
        retro_experiments=("s-9" if number == 11 else "s-12",),
        names=names,
        white_disc=False,
        gmt_clock=True,
        get_clock=True,
    )
    captions = dict(CAPTIONS)
    for mesh in ("Hatches_WindowFrames", "HatchRight_WindowFrames"):
        captions[mesh] = (
            "Hatch window",
            "The outer pane sat at about 35 degrees to the hatch. Its outline and location are assumed from earlier Gemini spacecraft.",
        )
    if number != 12:
        captions["Equipment_OamsReserveTank"] = (
            "Reserve oxidizer",
            "This long cylindrical reserve tank replaced the reserve fuel tank of spacecraft 9. It was separate from the "
            "added 22-inch spherical main oxidizer tank.",
        )
    else:
        captions["Retro_ExperimentS12"] = (
            "Micrometeorite collector",
            "The door protected the collection surfaces at launch. "
            "Ground command opened it in orbit; Aldrin recovered the package during his first stand-up EVA (Gemini XII report §8.10).",
        )
    return gemini_stack.build(fit, captions, target=target, skirt_insulation=False)

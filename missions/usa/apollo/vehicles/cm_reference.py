"""Nominal Apollo station datum; a fitted outer apex is not Xc zero.

NASA TN D-3888 (August 1967), Figure 2, printed p.27: the aft outer
apex is 1.30 inches below Xc0. NAA structures training (1966), p.1-13,
defines Xc0 at the heat-shield outer facesheet, excluding the ablator.
This is an assumed common geometric reference, not a CM-101 inspection or
a measurement of CM-107's remaining post-entry ablator.
"""

AFT_APEX_XC = -1.30


def survey_cm(point, registration):
    """Rotate original centimetres and map the fitted apex to its Apollo station."""
    if registration["rotation_degrees_about_z"] != 90:
        raise ValueError("Apollo survey reference expects the recorded 90-degree basis rotation")
    x, y, z = point
    return -y, x, z - registration["scan_sphere_apex_cm"] + AFT_APEX_XC * 2.54

# Shared Block II aperture measurements

`apollo-cm-apertures.json` records four **CM-107**, not CM-101, aperture outlines.
They are used as **assumed shared hardware**, with the user's explicit approval for
verified shared Block II structure. Apollo 7's press kit Figure 25d and the 1967
*Apollo Spacecraft and Systems Familiarization* exterior drawing identify the same
two side observation and two triangular rendezvous windows. This does not verify
Apollo 11's equipment, paint, heat damage, recovery configuration or individual
couch settings for Apollo 7; none of those is imported.

Source: Smithsonian Institution, National Air and Space Museum, CM-107 exterior
survey, shell derivative `x3d-cm-exterior-shell-90k-uvs-150k-4096-high.glb`.
The exact public asset URL and SHA-256 are in the JSON. The Smithsonian's
[scene rights metadata](https://ids.si.edu/ids/media_view?id=3d_package%3Ad8c6457e-4ebc-11ea-b77f-2e728ce88125&format=text)
releases the content under CC0. No photographic textures are used.

The survey's physical centimetres are retained. Blender's glTF import changes the
coordinate basis to Z-up. The module turns that basis 90 degrees about Z so the
side hatch faces +X, subtracts the registered aft apex, and converts centimetres to
metres once. Registration uses the median centre of the aft spherical surface,
with the published 184.8-inch nominal radius; it is **not** an independently
surveyed Apollo station datum. The measured outlines are projected onto their
best-fit planes, then their convex hulls are retained. Maximum plane residuals
are recorded: about 1.4 mm for a side opening and 0.12 mm for a rendezvous opening.
These residuals do not establish the absolute accuracy of the source survey.

The large side hatch boundary was rejected: it is curved, with a plane residual
of nearly 40 mm. It must not be used as a flattened door or as a fifth measured
window. Its circular window, glazing layers, seals and mechanism remain pending.

`command_module.py` projects each outline along its measured plane normal onto
the nominal conical wall, builds a constrained opening and joins the two boundaries
with a reveal. The reveal is a reconstruction between two references, not a survey
of the ablator's recessed wall. Apertures retain dark temporary closures until the
cabin and glazing are built. There is no claim here that an accurate cabin exists.

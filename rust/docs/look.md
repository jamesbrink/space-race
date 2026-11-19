# The look

What the native build's picture is meant to be, where that came from, and what each part of the code is for.
The sky's inputs are the flight's record (`sr_render::air::Air`: each layer's cover, base, depth, size and wind,
the visibility, the haze's depth); everything below is how they are drawn, and where a constant is chosen by eye
the code says "estimated".

## Art direction

The brief: Operation Flashpoint: Dragon Rising's image (Codemasters, EGO engine, 2009) over Arma 3's daylight.

1. **A real day, not a mood.** Arma 3's 2016 "visual upgrade" is the model for the light: "a natural contrast and
   saturation", "no artificial coloration of scenes for story purposes alone". The Sun, the sky and the shade keep
   their true ratios; the grade comes after and is small.
2. **Distance is read in the air.** What reviewers kept of Dragon Rising is its draw distance and its "tropical
   haze": far land goes pale and blue in steps. Here the day's haze is marched, so it thickens toward the
   horizon, glows toward the Sun and darkens under cloud.
3. **A big sky that is doing something.** Cumulus with flat grey-blue bases and knobbled white tops, at their
   recorded height, a thin rippled deck far above them, each cloud working as the clock runs. The sky is half of
   most frames of a launch and is treated as a subject.
4. **Light you can see.** Dragon Rising leaned on bloom, enough that reviewers complained of it ("bloom-heavy",
   "can turn visibility from good to bad"). The lesson taken is the glow and not the wash: bloom only on what is
   brighter than white paint in the Sun (the Sun, the flame, a glint, a cloud's lit edge), laid over the frame.
5. **Backlight is the drama.** Looking toward the Sun a cloud is dark with a silver lining and the haze round the
   Sun glows; away from it the same cloud is white on deep blue. Both must be right from the same numbers.
6. **A print.** Slightly held-back colour, a little more contrast in the middle, the corners let go, fine grain:
   a 1961 film print rather than a video feed. ACES is the curve; an earlier AgX attempt went pastel.
7. **Nothing breaks the spell.** No bands, no rings, no sparkle in far cloud, no pop as the eye climbs through
   a layer. Near cloud is marched at full resolution; only what is far is read coarser.

The Dragon Rising notes rest on reviews and on memory of its screenshots (muted olive and straw land, blue-grey
distance, a bright hazy sky), not on a published breakdown of the EGO engine's pipeline: none was found. Arma 3's
clouds are Simul's trueSKY volumes; its statements above are Bohemia's own.

## What each technique is for

| In the code | What it is | What it is for |
|---|---|---|
| `clouds/field.rs`, `field_at` | A tiling field of clouds, each a huddle of eight turrets, baked to a texture of distance-to-turret | Cumulus as separate clouds with turrets, not blobs cut from noise; the cover and size are the record's (`lay`). It also tells the march how far the air is clear. |
| `clouds/volume.rs` | 128^3 Perlin-Worley shape, Worley detail, two smooth channels, with mips (Schneider's Nubis noise) | The knobs of a cumulus top (inverted Worley), the fraying of its edge, and coarser copies so far cloud does not sparkle |
| `cumulus` in `clouds.wesl` | A loaf-shaped body per turret, bulged by smooth noise, its outer part cut by the shape noise and then by detail; density rising with height | Flat bases, steep sides, cauliflower tops; crisp above and soft below, as liquid water grows with height above the base |
| `UPDRAUGHT`, `LEAN`, `breath` | The noise rises through the body on the clock; tops lean down the wind; each turret swells and sinks | "Dynamic": the cloud evolves and does not only drift. All on the flight's clock, so a stopped clock stops the sky |
| `march_cumulus` | Long strides where the field says the air is clear, back to the last clear place on meeting cloud, short jittered strides through it | A cloud's light is in its skin: strides that land deep inside give grey, banded cloud. Jitter with temporal anti-aliasing removes the bands |
| `cumulus_toward_sun` | Five readings toward the Sun, the nearest with detail | Self-shadow: one knob shades the next |
| `scattered` | Beer's law, a two-lobed Henyey-Greenstein phase, Wrenninge's octaves for the later scattering orders (as Hillaire uses in Frostbite), and a forward term in thin cloud | White sunlit sides without marching every bounce; the silver lining |
| sky and ground terms | Sky light by how much cloud is overhead; sunlit ground from below | Grey-blue bases |
| `clouds/ripple.rs`, `deck` | A ranked tiling texture of cloudlets in rows and of banks; thin lenses lit without a march | Altocumulus: a rippled sheet in banks, bright at each cloudlet's edge and grey at its middle; the banks come to the record's cover, the softening of each cloudlet is by eye |
| `haze`, `in_shadow` | The day's haze marched from the eye, each step asking the field whether a cloud stands between it and the Sun | Aerial perspective on land and cloud alike, the glow round the Sun, shadows and shafts in the air |
| Rayleigh term in `fragment` | Clean air's blue taken from far cloud and the sky's given back | Far cloud goes cream and then the horizon's colour, as far land does in the engine's atmosphere |
| `look.rs` | ACES, restrained grading, thresholded additive bloom, vignette | The print |
| `grain.rs`, `grain.wesl` | Grain after the tone curve, strongest in mid-greys | The print's surface |

## Sources

- A. Schneider, "The Real-time Volumetric Cloudscapes of Horizon Zero Dawn", SIGGRAPH 2015:
  https://www.advances.realtimerendering.com/s2015/The%20Real-time%20Volumetric%20Cloudscapes%20of%20Horizon%20-%20Zero%20Dawn%20-%20ARTR.pdf
- A. Schneider, "Nubis: Authoring Real-Time Volumetric Cloudscapes with the Decima Engine", SIGGRAPH 2017:
  https://www.guerrilla-games.com/read/nubis-authoring-real-time-volumetric-cloudscapes-with-the-decima-engine
- A. Schneider, "Nubis, Evolved", SIGGRAPH 2022: https://www.guerrilla-games.com/read/nubis-evolved
- S. Hillaire, "Physically Based Sky, Atmosphere and Cloud Rendering in Frostbite", SIGGRAPH 2016:
  https://media.contentapi.ea.com/content/dam/eacom/frostbite/files/s2016_pbs_frostbite_sky_clouds.pdf
- S. Hillaire, "A Scalable and Production Ready Sky and Atmosphere Rendering Technique", EGSR 2020:
  https://diglib.eg.org/handle/10.1111/cgf14050 (the engine's own atmosphere follows it)
- M. Wrenninge, C. Kulla, V. Lundqvist, "Oz: The Great and Volumetric", SIGGRAPH 2013 talks (the octaves):
  https://dl.acm.org/doi/10.1145/2504459.2504518
- Bohemia Interactive, "OPREP: Visual Upgrade", 2016: https://dev.arma3.com/post/oprep-visual-upgrade
- Simul, trueSKY (Arma 3's clouds): https://simul.co
- Dragon Rising reviews read: https://msdn.duke4.net/revdragon.shtml (the bloom that "can turn visibility from
  good to bad"), https://bit-tech.net/reviews/gaming/pc/operation-flashpoint-dragon-rising-review/3/ ("the
  lighting system and view distance are fantastic"). "Bloom-heavy" and "tropical haze" are from other 2009
  reviews as a search quoted them; those pages were not opened.

Not read in full: the Nubis slide decks' exact constants (the pages fetched gave abstracts only); the figures in
the shader are this build's own, tuned by looking, and each says so.

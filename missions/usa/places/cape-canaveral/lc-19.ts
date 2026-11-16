import type { SiteDef } from '../../../../src/types.ts';
import { CAPE_CANAVERAL } from './place.ts';

const FT = 0.3048;
const HANDBOOK =
  'Martin Company, Gemini-Titan II Air Force Launch Vehicle Press Handbook (the revision of late 1965), chapter 7, "Launch Complex 19"';

/**
 * Launch Complex 19 on the Earth: where every crewed Gemini left from. The origin is the launch vehicle's axis on the
 * launch deck, the steel deck the thrust mount stood on; the pad's model is built round it (places/cape-canaveral/lc_19.py,
 * lc19/), and the complex is drawn as scenery from the other pads (scenery.ts). Its record is lc-19.md.
 *
 * +X runs along the stand toward its ramp: the way the erector was laid down, and the side the spacecraft's hatches
 * faced (vehicles/gemini-spacecraft.md: the model's +X is the spacecraft's top, between the two hatches), so the vehicle
 * stands square in this frame.
 */
export const LC19: SiteDef = {
  name: 'Cape Kennedy, Launch Complex 19',
  place: CAPE_CANAVERAL,
  latitude: {
    value: 28.506909,
    confidence: 'derived',
    source:
      'the opening under the thrust mount as it shows in imagery of what is left of the stand (Esri World Imagery), which is 21 m north and ' +
      '4 m west of the middle of OpenStreetMap way 195727094, "Launch Complex 19" (28.506719, -80.554253): the vehicle stood at the ' +
      `stand's north end, over the flame bucket, not on its middle (lc-19.md, "The site's frame"). Good to some 5 m. ${HANDBOOK}, p. 7-2, ` +
      'gives 28°30′24″ N to the second, which is 26 m south of this. No surveyed coordinate has been read',
  },
  longitude: {
    value: -80.554297,
    confidence: 'derived',
    source:
      'as the latitude. The handbook prints 80°31′16″ W, which is 3 km out to sea and a misprint; Wikipedia gives 80°33′15″ W (80.55417)',
  },
  height: {
    value: -19.3,
    confidence: 'derived',
    source:
      `"31.9 feet above sea level" (${HANDBOOK}, p. 7-2: documented), taken as the launch deck's, which stands 28 ft over land that is ` +
      'itself a few feet over the sea; and mean sea level at the Cape about 29 m below the WGS 84 ellipsoid (EGM96, to the nearest ' +
      'metre). 9.7 m less 29. It moves the Sun by nothing that can be measured',
  },
  grade: {
    value: -28 * FT,
    confidence: 'documented',
    source:
      `"The launch stand is 28 feet tall, 65 feet wide and 450 feet long", and the spacecraft was hoisted "28 feet from the ground to the ` +
      `deck" (${HANDBOOK}, p. 7-8, and chapter 4, p. 4-15). The NHL nomination's "three stories high" is the same stand; photographs agree to a foot ` +
      'or two (S65-49568: 27 ft). places/cape-canaveral/lc19/site.py GROUND is the same in feet: change them together',
  },
  // Eastern Standard Time: Florida kept no daylight time in March 1965, and the programme's tables give the launch in e.s.t.
  // (NASA SP-4002, Appendix 1, Table A)
  zone: { name: 'EST', utcOffset: -5 },
  seaLevel: {
    value: -29,
    confidence: 'estimated',
    source: 'the EGM96 geoid at the Cape, read to the nearest metre: the figure Complex 5’s record uses',
  },
  bearingX: {
    value: 175,
    confidence: 'derived',
    source:
      `along the stand toward its ramp. (1) "The center line of the test stand is five degrees west of north", and "the thrust mount's ` +
      `center line is five degrees south of west" (${HANDBOOK}, p. 7-2: documented); OpenStreetMap way 195727094 lies on 175/355 to ` +
      'about a degree. (2) The ramp is its south end and the flume its north (the same page), so the erector, which lay on "the ramp ' +
      'level", was laid down to the south: 175, not 355. (3) That is also the side the hatches faced: the pilots’ abort area, where ' +
      'their seats would have thrown them out through the hatches, is "400 to 1000 feet south of the thrust mounts" in a 54 degree arc ' +
      '(p. 7-2; Martin’s paper on the launch vehicle, NTRS 19720063749, p. 69), the count has "Verify erector position is less than ' +
      '40°. Notify spacecraft test conductor ejection path is clear" as the erector goes down, and both hatches face the camera in NASA ' +
      'S65-21881, taken from the deck’s south end. Derived from those three; no drawing of the stand has been read. Until November 2026 ' +
      'this was 84.9, argued from the roll programme: that is the launch vehicle’s pitch plane (lc-19.md), not the hatches',
  },
  // the flame goes down through the deck into the bucket and out north along the flume
  exhaust: {
    way: 'pit',
    toward: {
      value: 355,
      confidence: 'documented',
      source: `the flume is at the stand's north end, on its centre line (${HANDBOOK}, p. 7-2)`,
    },
    depth: {
      value: 26 * FT,
      confidence: 'estimated',
      source: 'the deck over the flume’s apron: 28 ft over the land (documented), the apron taken two feet over it (NASA S65-43447)',
    },
    out: {
      value: 36 * FT,
      confidence: 'estimated',
      source: 'the ducts’ mouths under the deck’s north edge, which is 42 ft north of the vehicle’s axis in NASA S65-49568',
    },
    width: {
      value: (19 + 8 / 12) * FT,
      confidence: 'documented',
      source: `"The flame bucket is 19 feet 8 inches wide and 17 feet 6 inches tall" where the flame enters it (${HANDBOOK}, p. 7-10)`,
    },
  },
};

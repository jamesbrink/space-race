import type { SiteDef } from '../../../../src/types.ts';
import { CAPE_CANAVERAL } from './place.ts';

/**
 * Launch Complex 19 on the Earth: where every crewed Gemini left from. The origin is the middle of the launch
 * stand, at the deck the Titan's thrust mount stood on; the site's own model is not built (the complex is drawn as
 * scenery from Complex 5: missions/usa/places/cape-canaveral/scenery.ts), so nothing stands on this frame so far and only the sky over it
 * is used, with its grade and its bearing. Its record is lc-19.md.
 *
 * +X is the side the spacecraft's hatches faced on the stand (vehicles/gemini-spacecraft.md: the model's +X is the
 * spacecraft's top, TY, between the two hatches).
 */
export const LC19: SiteDef = {
  name: 'Cape Kennedy, Launch Complex 19',
  place: CAPE_CANAVERAL,
  latitude: {
    value: 28.506719,
    confidence: 'documented',
    source:
      'OpenStreetMap way 195727094, "Launch Complex 19": the middle of the launch stand as it stands today, traced from imagery (a ' +
      'few metres): the point that places the complex as scenery in missions/usa/places/cape-canaveral/scenery.ts. Wikipedia gives 28°30′24″ N ' +
      '(28.50667). No surveyed coordinate has been read',
  },
  longitude: {
    value: -80.554253,
    confidence: 'documented',
    source: 'OpenStreetMap way 195727094, as the latitude; Wikipedia gives 80°33′15″ W (80.55417)',
  },
  height: {
    value: -22,
    confidence: 'estimated',
    source:
      'the stand’s deck taken as about 7 m above mean sea level (the ramp up to a Titan stand; the height of this one has not ' +
      'been read), and mean sea level at the Cape about 29 m below the WGS 84 ellipsoid (EGM96, to the nearest metre). It moves the ' +
      'Sun by nothing that can be measured',
  },
  grade: {
    value: -3 * 10 * 0.3048,
    confidence: 'estimated',
    source:
      'the stand was "65 feet wide, 450 feet long, and three stories high" (the NHL nomination of Cape Canaveral AFS, Item 7, p. 9: ' +
      'documented); a storey’s height is not given, and 10 ft is taken, so 30 ft. With the deck about 7 m above mean sea level (`height`) ' +
      'that would put the ground under the sea, which it is not (about 2 m above it at Complex 5): one of the two is wrong, and neither ' +
      'has been read. The complex’s drawings (issue #25: not cleared for release) would settle both',
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
    value: 84.9,
    confidence: 'estimated',
    source:
      'the side the spacecraft’s hatches faced on the stand (lc-19.md, "The site\'s frame"). (1) The flight azimuth was 72° (NASA SP-4002, ' +
      'Appendix 1, Table A; the press kit, release 65-81, p. 7), and the vehicle was rolled to it after liftoff: on the flight after this ' +
      'one, from the same stand to the same azimuth, at 1.25°/s from 10.16 s to 20.48 s (Gemini Program Mission Report, Gemini IV, ' +
      'Tables 4-I and 5.2-V), which is 12.9°: documented. (2) Which way it rolled is not in anything read: 84.9° (72 + 12.9) or 59.1°. ' +
      'The stand’s long axis lies on 175/355 (OpenStreetMap way 195727094: derived, to about a degree), and 84.9 is square to it, as ' +
      'Complex 14’s documented pitch line (105°) is square to its stand (015°); 59.1 is 26° off square. So 84.9, from that likeness, ' +
      'which is one other pad’s. (3) The crew rode heads down, the hatches toward the ground once the vehicle had pitched ' +
      'over, so toward the target on the stand, not 265°: derived from the Gemini IV crew rolling "to a heads-up position" after ' +
      'insertion (the same report, p. 7-17); nothing read says it of this flight. The erector lowered south over the ramp and the ' +
      'blockhouse stands 738 ft west (issue #25): neither tells the hatches’ side. Estimated as a whole: to be settled from the ' +
      'complex’s drawings',
  },
};

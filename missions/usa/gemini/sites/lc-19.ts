import type { SiteDef } from '../../../../src/types';

/**
 * Launch Complex 19 on the Earth: where every crewed Gemini left from. The origin is the middle of the launch
 * stand, at the deck the Titan's thrust mount stood on; the site's own model is not built (the complex is drawn as
 * scenery from Complex 5: src/viewer/cape1961.ts), so nothing stands on this frame so far and only the sky over it
 * is used. When it is built its record goes in lc-19.md.
 *
 * +X is the side the spacecraft's hatches faced on the stand (vehicles/gemini-spacecraft.md: the model's +X is the
 * spacecraft's top, TY, between the two hatches).
 */
export const LC19: SiteDef = {
  name: 'Cape Kennedy, Launch Complex 19',
  latitude: {
    value: 28.506719,
    confidence: 'documented',
    source:
      'OpenStreetMap way 195727094, "Launch Complex 19": the middle of the launch stand as it stands today, traced from imagery (a ' +
      'few metres): the point that places the complex as scenery in src/viewer/cape1961.ts. Wikipedia gives 28°30′24″ N ' +
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
      'the side the spacecraft’s hatches faced on the stand, taken as the stand’s own azimuth. Three steps, the last two not ' +
      'settled. (1) The flight azimuth was 72° (NASA SP-4002, Appendix 1, Table A; the press kit, release 65-81, p. 7), and the ' +
      'vehicle was rolled to it after liftoff: on the flight after this one, from the same stand to the same azimuth, at ' +
      '1.25°/s from 10.16 s to 20.48 s (Gemini Program Mission Report, Gemini IV, Tables 4-I and 5.2-V), which is 12.9°. ' +
      '(2) Which way it rolled is not in anything read: 84.9° (72 + 12.9) is taken, as general knowledge has the stand; 59.1° is the ' +
      'other answer. (3) The crew rode heads down, the hatches toward the ground once the vehicle had pitched over, so toward ' +
      'the target on the stand: derived from the Gemini IV crew rolling "to a heads-up position" after insertion (the same ' +
      'report, p. 7-17); nothing read says it of this flight. To be settled from the complex’s drawings when it is built',
  },
  // (no `region` yet: the country round the Cape is baked for Complex 5's flights, and an orbital flight's is the whole globe)
};

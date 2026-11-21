// The orbital deck's phase (src/deck/phases/phase.ts): chosen from the run's state, and the middle panel's figures in each
// as the deck showed them before it had phases: alone, the orbit; above the air on the launch vehicle, the orbit it would
// be on were it cut; otherwise, and down, the five a ballistic flight shows.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ABOVE_AIR, PHASES, phaseOf } from '../src/deck/phases/phase.ts';

test("the phase is chosen from the run's state, and shows the figures the deck showed before it had phases", () => {
  const flags = [false, true];
  for (const down of flags)
    for (const parted of flags)
      for (const struck of flags)
        for (const burning of flags)
          for (const entering of flags)
            for (const altitude of [0, ABOVE_AIR - 1, ABOVE_AIR, ABOVE_AIR + 1, 200_000]) {
              // (as orbitdeck.ts `show` has them: alone once parted, unless down or struck on the pad)
              const alone = parted && !down && !struck;
              const high = !alone && !down && altitude > ABOVE_AIR;
              const s = { down, alone, burning, entering, altitude };
              const id = phaseOf(s);
              assert.equal(id, down ? 'surface' : !alone ? 'ascent' : burning ? 'burn' : entering ? 'entry' : 'coast');
              assert.equal(PHASES[id].id, id);
              const shown = PHASES[id].figures(s);
              const ids = alone
                ? ['altitude', 'speed', 'apogee', 'perigee', 'period']
                : high
                  ? ['altitude', 'speed', 'climb', 'apogee', 'perigee']
                  : ['altitude', 'speed', 'climb', 'g', 'mach'];
              assert.deepEqual(
                shown.map((f) => f.id),
                ids,
              );
              // (the speed: space-fixed in or towards an orbit, over the turning Earth otherwise)
              assert.equal(shown[1].about.includes('space-fixed'), alone || high);
            }
});

// A mechanism on a programme that a hand can take (src/sim/mechanism.ts): the periscope and its door. Pure arithmetic.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readingFor, sentAt, sentBy, travelAt } from '../src/sim/mechanism.ts';

// Freedom 7's periscope: out on the pad, in at the umbilical's release, out at separation, in for the entry, out under the drogue
const programme = {
  events: [
    [-86_400, true],
    [-35, false],
    [152.3, true],
    [404, false],
    [578.1, true],
  ],
  takes: 4,
};
const near = (a, b, why) => assert.ok(Math.abs(a - b) < 1e-9, `${why}: ${a}, not ${b}`);

test('the programme alone: out and in at its instants, a travel taking its time, and still between them', () => {
  near(travelAt(programme, -1000), 1, 'on the pad it stands out');
  near(travelAt(programme, -35), 1, 'at the instant it is told, it has not moved');
  near(travelAt(programme, -34), 0.75, 'a second in, a quarter of the way');
  near(travelAt(programme, -33), 0.5, 'half way');
  near(travelAt(programme, -31), 0, 'four seconds: in');
  near(travelAt(programme, 0), 0, 'at liftoff: in');
  near(travelAt(programme, 153.3), 0.25, 'a second after separation');
  near(travelAt(programme, 300), 1, 'above the air: out');
  near(travelAt(programme, 500), 0, 'through the entry: in');
  near(travelAt(programme, 600), 1, 'under the parachute: out');
  assert.equal(sentAt(programme, -100_000), false, 'before anything it is as built: in');
  assert.equal(sentAt(programme, 200), true);
  assert.equal(sentAt(programme, 404), false);
});

test('a hand takes it: it goes where it is sent and stays, until the programme next speaks', () => {
  const hands = [{ t: 200, out: false }];
  near(travelAt(programme, 199, hands), 1, 'before the hand, the programme');
  near(travelAt(programme, 202, hands), 0.5, 'two seconds after: half way in');
  near(travelAt(programme, 300, hands), 0, 'in, and held in');
  assert.equal(sentBy(programme, 300, hands), false);
  // the entry's own event sends it in, which it is; the drogue's sends it out again: the programme has it back
  near(travelAt(programme, 500, hands), 0, 'still in through the entry');
  near(travelAt(programme, 590, hands), 1, 'and out with the drogue, as programmed');
  assert.equal(sentBy(programme, 590, hands), true);
  // sent out again by hand before that, it is out
  const back = [...hands, { t: 250, out: true }];
  near(travelAt(programme, 251, back), 0.25, 'on its way out again');
  near(travelAt(programme, 300, back), 1, 'out');
});

test('a hand that changes its mind half way: the motor turns round where it is', () => {
  const hands = [
    { t: 200, out: false },
    { t: 201, out: true },
  ];
  near(travelAt(programme, 201, hands), 0.75, 'a second in');
  near(travelAt(programme, 201.5, hands), 0.875, 'and back the way it came');
  near(travelAt(programme, 202, hands), 1, 'out again, in the second it took to come in');
  near(travelAt(programme, 250, hands), 1, 'and no further');
});

test('with the automatic off the programme is not heard; switched back on, it goes to where the programme has it', () => {
  // off from before separation until 300 s: it does not come out by itself
  const off = [{ from: 100, to: 300 }];
  near(travelAt(programme, 200, [], off), 0, 'separation passes unheard');
  assert.equal(sentBy(programme, 200, [], off), false);
  near(travelAt(programme, 302, [], off), 0.5, 'switched back on: on its way to where the programme has it');
  near(travelAt(programme, 310, [], off), 1, 'out');
  // a hand works it while the automatic is off, and the switch takes it back
  const hands = [{ t: 150, out: true }];
  near(travelAt(programme, 160, hands, off), 1, 'put out by hand with the automatic off');
  near(travelAt(programme, 420, hands, off), 0, 'and in for the entry, the automatic on again');
  // still off (to: Infinity): nothing by itself, to the end
  const still = [{ from: 100, to: Infinity }];
  near(travelAt(programme, 700, [], still), 0, 'never told, it never moves');
  near(travelAt(programme, 700, [{ t: 600, out: true }], still), 1, 'but a hand still works it');
});

test('at one instant the hand has the last word', () => {
  near(travelAt(programme, 160, [{ t: 152.3, out: false }]), 0, 'told out by the programme and in by the hand at once: in');
});

test('the instant of the programme’s own motions that shows a travel: the stretch from a travel out, played once', () => {
  near(readingFor(programme, 152.3, 0), 152.3, 'in: where the travel begins');
  near(readingFor(programme, 152.3, 0.5), 154.3, 'half way');
  near(readingFor(programme, 152.3, 1), 156.3, 'out: where it ends');
  near(readingFor(programme, 152.3, 1.4), 156.3, 'and no further');
  // and the programme's own travel at that instant is the travel asked for
  for (const travel of [0, 0.2, 0.5, 0.9, 1]) near(travelAt(programme, readingFor(programme, 152.3, travel)), travel, `travel ${travel}`);
});

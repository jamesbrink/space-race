# Ideas

What the simulator lacks to play as a game, kept so it is not forgotten. Not a plan and not a promise: each is weighed
against the rules in [AGENTS.md](../AGENTS.md) (every number carries its confidence, the scene shows what was flown) when
it is taken up. Roughly in order of what each would add; 2, 3 and 4 are the cheapest, since they stand on what is
already built.

1. **The race as a campaign.** Today the flights are a menu. A timeline to advance through: the milestones of both
   sides as objectives, firsts claimed or lost, flights unlocking as their programme reaches them. The data is there
   (launch dates, programmes, `sim/verdict.ts`); nothing strings the flights together.
2. **Objectives and a debrief.** `verdict.ts` says what happened and deliberately gives no score. Per-flight goals (reach
   orbit, come down within so many km of the record's point, dock on the first pass, a propellant budget) and a debrief
   setting the flight against the record, figure by figure, would give a reason to fly again without inventing a score.
3. **Failures in flight.** At present only a hand causes trouble. The drama was the hardware: Friendship 7's
   heat-shield light, Gemini 8's stuck thruster, Aurora 7's attitude trouble, Voskhod 2's swollen suit and manual entry,
   Soyuz 1's parachute. Optional, from the record (scripted) or within documented failure modes (drawn by chance).
4. **Mission Control and the radio.** No ground voice today. Synthesised radio (sound.md: no files), callouts from the
   air-to-ground transcripts ("Go for orbit"), loss of signal between tracking stations: the deck would feel crewed.
5. **A cabin worked by hand.** The cabin can be sat in, but flying is the shared deck's keys. Clickable switches,
   T-handles, the Vostok's globus, each cabin's own, over the deck's command layer.
6. **The crew's day, unbroken.** Walking, driving and operating are built and V is meant to board. Suit-up, the transfer
   van, the gantry's lift, strapping into the couch, the count; and recovery at the other end: the helicopter, the
   carrier's deck, the descent module on the steppe.
7. **EVA, played.** Voskhod 2 and the Gemini spacewalks are flights, but a spacewalk is not flown by hand. Leonov's
   airlock and Gemini 9A's are set pieces.
8. **The Moon.** The ephemeris, lunar orbit and Apollo 7 to 10 are in; no lunar module and no landing, which is the
   race's payoff.
9. **Controllers.** No gamepad (`getGamepads`) or HOTAS; rumble could follow `viewer/shake.ts`.
10. **Time warp with event markers, and replays.** `deck/tape.ts` already flies a run again to the last bit: a scrubbable
    replay, a free camera over it and a shareable link to it cost little.
11. **What if.** A flight on another day's weather, a vehicle on another profile, the cancelled flights (Vostok 7, the
    Gemini rescue cases); each labelled with how sure it is.
12. **A guided first flight.** Freedom 7 with its steps explained as they come; the deck is dense for a first visit.

import { capOf, capsOf, KEYS, type KeyName, kbd, keysOf } from '../util/keys.ts';
import type { DeckSpec, Figure } from './deck.ts';

/** Why the deck on the Moon will not lift off: said on its button and when it is pressed (phases/surface.ts). */
export const LIFTOFF_NOT_YET = 'Lift off: the ascent from the surface is not flown yet, so the ascent engine is not lit from here';

/** A reading of the right panel, under Details: its name, its figure and its unit. */
const pair = (f: Figure) =>
  `<div class="reading" title="${f.about}"><span>${f.label}</span><b><u data-cell="${f.id}">0</u>${f.unit ? `<i>${f.unit}</i>` : ''}</b></div>`;

/**
 * The deck's three panels as markup (deck.ts `Deck`): the navball's corner is left to navball.ts; the middle one (the
 * kept card, the phase and the switches, the figures, the throttle, the action, the keys that steer and behind Keys every
 * key and control of the deck, each a button that does what its key does) and the systems on the right, with the finger's
 * stick and roll. What differs by kind is the spec's (`DeckSpec`); every key's cap and word is the table's (keys.ts).
 */
export function deckMarkup(spec: DeckSpec): string {
  // a key that steers, as a button: held, it is the key held (W S A D Q E)
  const hold = (key: string, about: string) =>
    `<button data-hold="${key}" title="${about} (${capOf(key)})"><kbd>${capOf(key)}</kbd></button>`;
  // the keys of the deck's steering, in the table's order (keys.ts `deck.steer`: W S A D Q E)
  const [pitchDown, pitchUp, yawLeft, yawRight, rollLeft, rollRight] = [...keysOf('deck.steer')] as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  // a slot of a key in the table as a button that presses it: held (`data-held`) for the camera's turning and zooming
  const slot = (name: KeyName, i: number) => KEYS[name].slots[i] as string;
  const turn = (i: number, about: string) =>
    `<button data-press="${slot('orbit.turn', i)}" data-held title="${about}"><kbd>${capOf(slot('orbit.turn', i))}</kbd></button>`;
  const zoom = (i: number, about: string) => {
    const key = (KEYS['orbit.zoom'].slots[i] as readonly string[])[0]!;
    return `<button data-press="${key}" data-held title="${about} (${capOf(key)})"><kbd>${capOf(key)}</kbd></button>`;
  };
  const warp = (i: number, about: string) =>
    `<button data-press="${slot('clock.rate', i)}" title="${about} (${capOf(slot('clock.rate', i))})"><kbd>${capOf(slot('clock.rate', i))}</kbd></button>`;
  const rate = (i: number, about: string, label: string) =>
    `<button data-press="${slot('clock.rate', i)}" title="${about} (${capOf(slot('clock.rate', i))})"><kbd>${capOf(slot('clock.rate', i))}</kbd>${label}</button>`;
  const { steering, events, restart } = spec.labels ?? { steering: 'Steering', events: 'Events', restart: 'Restart' };
  // The deck is three panels: the navball's (navball.ts puts it in), this one in the middle, the systems on the right.
  return `
    <section class="deck-main">
      <div class="cockpit-card" hidden></div>
      <div class="cockpit-card cockpit-kept" role="group" aria-labelledby="deck-kept-t" hidden>
        <h3 id="deck-kept-t"><span data-kept="title">Your flight, kept at </span><span data-cell="kept-at"></span></h3>
        <span class="cockpit-why" data-kept="why"></span>
        <p>
          <button data-do="resume" title="Fly on from where it was left (${capsOf('deck.resume').join(' ')})">${kbd('deck.resume')}Resume</button>
          <button data-do="again" title="Throw it away and start again from the pad, as flown (${capsOf('deck.again').join(' ')})">${kbd('deck.again')}Start over</button>
        </p>
      </div>
      <p class="cockpit-phase"><b data-cell="phase"></b><span data-cell="mode"></span>
        <span class="deck-modes">
          <span class="deck-takeover">A switch, the action or the throttle takes control</span>
          <button data-do="guidance" class="switch" aria-pressed="true" title="${spec.guidance} (${capsOf('deck.guidance').join(' ')})">${kbd('deck.guidance')}<span class="for-keys">Guidance</span><span class="for-touch">${steering} · <span class="deck-auto">Auto</span><span class="deck-manual">Manual</span></span></button>
          <button data-do="sequence" class="switch" aria-pressed="true" title="${spec.sequence} (${capsOf('deck.sequence').join(' ')})">${kbd('deck.sequence')}<span class="for-keys">Sequencer</span><span class="for-touch">${events} · <span class="deck-auto">Auto</span><span class="deck-manual">Manual</span></span></button>
          ${spec.hold === false ? '' : `<button data-do="hold" class="switch" aria-pressed="true" title="Hold: the autopilot keeps the attitude you leave it at, within what the vehicle can steer with; your keys move it, and the navball's flight director shows where the record's programme points. Off, the keys work the controls themselves (${capsOf('deck.hold').join(' ')})">${kbd('deck.hold')}<span>Hold</span></button>`}
        </span></p>
      <div class="gauges"></div>
      <div class="deck-throttle" hidden>
        <span class="thr-name">Throttle</span>
        <span class="thr-lever"><input type="range" min="0" max="1" step="0.05" value="1" data-lever aria-label="Throttle" title="The throttle lever: a notch with the arrows (${capsOf('deck.lever').join(' ')}), ${capsOf('deck.full').join(' ')} full" /></span>
        <b data-cell="lever">100 %</b>
        <span class="thr-do">
          <button data-press="${KEYS['deck.lever'].slots[1]}" class="for-keys" title="Throttle down a notch (${capOf(KEYS['deck.lever'].slots[1] as string)})"><kbd>${capOf(KEYS['deck.lever'].slots[1] as string)}</kbd></button>
          <button data-press="${KEYS['deck.lever'].slots[0]}" class="for-keys" title="Throttle up a notch (${capOf(KEYS['deck.lever'].slots[0] as string)})"><kbd>${capOf(KEYS['deck.lever'].slots[0] as string)}</kbd></button>
          <button data-press="${KEYS['deck.full'].slots[0]}" title="Full throttle (${capsOf('deck.full').join(' ')})">${kbd('deck.full')}Full</button>
          <button data-do="cut" title="Cut: the lever to nothing, and every liquid engine it works shut down (a solid burns on)">Cut</button>
        </span>
        <span class="thr-what" data-cell="lever-engine"></span>
        <span class="thr-left" data-cell="lever-left"></span>
      </div>
      <div class="deck-act">
        <button data-do="next" class="cockpit-next" title="Set off the next event of the flight now (${capsOf('deck.next').join(' ')})">${kbd('deck.next')}<span data-cell="next"></span></button>
        <span class="deck-surface" hidden>
          <button data-do="out" title="Go out: through the forward hatch onto the porch, on foot as the commander, and down the ladder (${capsOf('deck.out').join(' ')})">${kbd('deck.out')}Go out</button>
          <button data-do="off-surface" aria-disabled="true" title="${LIFTOFF_NOT_YET} (${capsOf('deck.liftoff').join(' ')})">${kbd('deck.liftoff')}Lift off</button>
        </span>
        <p class="cockpit-prompt" data-cell="prompt" role="status" hidden></p>
        <button data-do="abort" class="cockpit-abort" title="Abort: the escape the spacecraft had at this instant, while it is on its launch vehicle: press twice (${capsOf('deck.abort').join(' ')}, ${capsOf('deck.abort').join(' ')})">${kbd('deck.abort')}${kbd('deck.abort')}<span data-cell="abort">Abort</span></button>
      </div>
      <p class="deck-foot">
        <span class="deck-steer for-keys" title="W S pitch, A D yaw, Q E roll. On a launch vehicle flown by hand a key is a tenth of full throw (fine control); with guidance on it leans the programme">${hold(pitchDown, 'Pitch the nose downrange')}${hold(pitchUp, 'Pitch the nose back')}<em>pitch</em>${hold(yawLeft, 'Yaw left')}${hold(yawRight, 'Yaw right')}<em>yaw</em>${hold(rollLeft, 'Roll left')}${hold(rollRight, 'Roll right')}<em>roll</em></span>
        <span class="for-touch">Stick steers · ⟲ ⟳ roll</span>
        <span class="deck-turn deck-warp for-keys" title="How fast time runs: slower, faster (${capsOf('clock.rate').join(' ')})">${warp(0, 'Time runs slower')}${warp(1, 'Time runs faster')}<em data-cell="warp">1×</em></span>
        ${spec.warp ? `<button data-do="warp" class="deck-warp-next" aria-pressed="false" title="Warp to the next: on a coast, as fast as the coast lets time run (to ten million times, far from every body), to the next burn's lead-in, the Moon's sphere, the entry interface or whatever is due, landing on it at life's pace; it stops for anything due and for a hand on the controls. Again, to stop (${capsOf('deck.warp').join(' ')})">${kbd('deck.warp')}<span data-warp-label>Warp</span></button>` : ''}
        <button data-do="keys" aria-expanded="false" title="Every key and control of the flight deck"><span class="for-keys">Keys</span><span class="for-touch">More</span><i class="chevron"></i></button>
      </p>
      <div class="cockpit-keys" hidden>
        <div><h4>Flight</h4><p>
          ${spec.flightKeys}
          <button data-do="again" title="${restart} (${capsOf('deck.again').join(' ')})">${kbd('deck.again')}${restart}</button>
          <button data-do="leave" title="Leave the flight deck (${capsOf('deck.leave').join(' ')})">${kbd('deck.leave')}Leave</button>
        </p></div>
        <div><h4>Show</h4><p>
          <button data-do="path" class="switch" aria-pressed="true" title="The predicted path: where it goes from here if nothing more is done, its apogee, what happens on the way and where it comes down (${capsOf('path.show').join(' ')})">${kbd('path.show')}Path</button>
          <button data-press="${KEYS['map.show'].slots[0]}" data-map class="switch" aria-pressed="false" title="The map: the whole path from far out, the way it came and what else flies, the Earth turning under it; again for the view it was taken from (${capsOf('map.show').join(' ')})">${kbd('map.show')}Map</button>
          <button data-do="navball" class="switch" aria-pressed="true" title="The navball: attitude against the horizon, prograde and retrograde (${capsOf('navball.show').join(' ')})">${kbd('navball.show')}Navball</button>
          <button data-press="${KEYS['cut.toggle'].slots[0]}" data-skin class="switch" aria-pressed="true" title="The vehicle's skin: off, to see what is inside it and how little room there is, and out of it all round; on, as it flew (${capsOf('cut.toggle').join(' ')})">${kbd('cut.toggle')}Skin</button>
          <button data-press="${KEYS['navball.frame'].slots[0]}" title="The navball's markers and speed: over the turning Earth, or in the frame that does not turn; and a path that goes round, drawn in the same frame (${capsOf('navball.frame').join(' ')})">${kbd('navball.frame')}Surface · orbit</button>
          ${spec.choose ? `<button data-press="${KEYS['path.choose'].slots[0]}" title="While the engine burns under guidance: the path if guidance flies on to the record's cutoff, or if the engine were cut now (${capsOf('path.choose').join(' ')})">${kbd('path.choose')}Path · to cutoff · cut now</button>` : ''}
        </p></div>
        <div><h4>Camera</h4><p>
          <button data-press="${KEYS['cam.next'].slots[0]}" title="The next camera (${capsOf('cam.next').join(' ')})">${kbd('cam.next')}Next view</button>
          <button data-press="${KEYS['cam.home'].slots[0]}" title="Centre the vehicle (${capsOf('cam.home').join(' ')})">${kbd('cam.home')}Centre</button>
          <span class="deck-turn" title="Turn the view (the left and right arrows; drag to tilt it: up and down are the throttle's)">${turn(1, 'Turn the view left')}${turn(3, 'Turn the view right')}<em>turn</em></span>
          <span class="deck-turn">${zoom(0, 'Zoom in')}${zoom(1, 'Zoom out')}<em>zoom</em></span>
          <button data-press="${KEYS['page.cel'].slots[0]}" title="Cel shading (${capsOf('page.cel').join(' ')})">${kbd('page.cel')}Cel</button>
          <button data-press="${KEYS['page.bare'].slots[0]}" class="for-keys" title="Hide every panel; ${capsOf('page.bare').join(' ')} shows them again (${capsOf('page.bare').join(' ')})">${kbd('page.bare')}Hide panels</button>
        </p></div>
        <div><h4>Clock</h4><p>
          <button data-press="${KEYS['clock.run'].slots[0]}" title="Run or stop the clock, and the flight with it (${capsOf('clock.run').join(' ')})">${kbd('clock.run')}Run · stop</button>
          ${rate(0, 'Time runs slower', 'Slower')}
          ${rate(1, 'Time runs faster', 'Faster')}${
            spec.warp
              ? `
          <button data-do="warp" aria-pressed="false" title="Warp to the next: as fast as the coast lets time run, landing on the next thing ahead at life's pace; again, to stop (${capsOf('deck.warp').join(' ')})">${kbd('deck.warp')}<span data-warp-label>Warp</span></button>`
              : ''
          }
          <button data-press="${KEYS['sound.toggle'].slots[0]}" title="Sound on or off (${capsOf('sound.toggle').join(' ')})">${kbd('sound.toggle')}Sound</button>${
            spec.warp
              ? `
          <span class="deck-warps" data-warps></span>
          <span class="deck-warp-time" data-warp-time><label>Warp to T+<input inputmode="numeric" autocomplete="off" placeholder="61:30:00" aria-label="A mission time to warp to: hours, minutes and seconds, or days in front (2d 13:30)" title="A mission time: hours:minutes:seconds, or days in front (2d 13:30). The warp stops on the way for anything due or a burn's lead-in (${capsOf('warp.go').join(' ')})" /></label><button data-do="warp-time" title="Warp to the time typed (${capsOf('warp.go').join(' ')})">${kbd('warp.go')}Go</button></span>`
              : ''
          }
        </p></div>
      </div>
    </section>
    <section class="deck-sys" aria-label="Systems">
      <div class="systems" data-cell="systems"></div>
      <button class="sys-more" data-do="details" aria-expanded="false" title="The air on the vehicle, where it is and how it points: shown, or folded away"><span>Details</span><i class="chevron"></i></button>
      <div class="sys-detail">
        <div class="readings">
          ${spec.readings.map(pair).join('\n            ')}
        </div>
      </div>
      <em data-cell="load" class="cockpit-load" hidden title="The bending load on the stack (dynamic pressure times the angle off the wind) against what it can take: amber past four fifths, red over. Half a second over, or half as much again at once, breaks it"></em>
      <em data-cell="heat" hidden title="The heat shield's temperature against its limit, and the heat flux at its stagnation point: amber past four fifths of the limit"></em>
    </section>
    <div class="cockpit-stick" aria-hidden="true"><i></i></div>
    <div class="cockpit-roll"><button data-roll="-1" aria-label="Roll left" title="Roll left">⟲</button><button data-roll="1" aria-label="Roll right" title="Roll right">⟳</button></div>`;
}

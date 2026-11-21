import './time.css';
import { prefs } from '../app/prefs.ts';
import type { Flight, SitedFlight } from '../types.ts';
import { type Clock, localTime, missionTime, rateText } from '../world/clock.ts';
import { capsOf, is, isTyping, modified, which } from '../util/keys.ts';
import { Scope } from '../util/scope.ts';

/**
 * The clock's face: what time it is at the site, where that is in the count, and the means to
 * run it, stop it and move it. It draws the simulation clock (world/clock.ts) and knows nothing
 * of what follows that clock: the sky does today; the countdown and the flight will.
 *
 * Folded, it is the readout and one button. Open, it adds a scrub across the launch day (local
 * midnight to midnight), the rates, and the way back to liftoff. Whether it is open is
 * remembered; the time itself is not, so every visit starts stopped at liftoff.
 */
export class TimeBar {
  private readonly root: HTMLElement;
  private readonly clock: Clock;
  private readonly zone: SitedFlight['site']['zone'];
  /** Seconds from local midnight to the launch: where t = 0 falls on the scrub. */
  private readonly launchAt: number;
  private readonly local: HTMLElement;
  private readonly count: HTMLElement;
  /** Where a warp is going (world/clock.ts `warpTo`), while one is. */
  private readonly warp: HTMLElement;
  private readonly play: HTMLButtonElement;
  private readonly scrub: HTMLInputElement;
  /** A finer scrub over the flight itself, where the flight has a trajectory to fly. */
  private readonly flightScrub: HTMLInputElement | null;
  /** Slower and Faster: a step down or up the clock's rates, each twice the last. */
  private readonly steps: HTMLButtonElement[];
  /** The rate it runs at; pressed, it goes back to real time. */
  private readonly rate: HTMLButtonElement;
  private readonly home: HTMLButtonElement;

  /** What it hangs on the window (util/scope.ts): let go of with the page it is on. */
  private readonly scope = new Scope();

  constructor(parent: HTMLElement, clock: Clock, flight: SitedFlight) {
    this.clock = clock;
    this.zone = flight.site.zone;
    this.launchAt = Math.round(localTime(clock.epoch, this.zone.utcOffset).dayFraction * 86_400);
    const root = (this.root = document.createElement('aside'));
    root.className = 'timebar';
    root.setAttribute('aria-label', 'Time');
    root.innerHTML = `
      <div class="time-row">
        <button class="time-play" aria-pressed="false" title="Run or stop the clock (P)"></button>
        <p class="time-read" aria-live="off"><time class="time-local"></time><time class="time-count"></time><time class="time-warp" hidden></time></p>
        <button class="time-toggle chevron" aria-expanded="true" aria-label="Show or hide the time controls" title="Tuck away"></button>
      </div>
      <div class="time-body">
        <label class="time-scrub"><span>00:00</span><input type="range" min="0" max="86400" step="30" aria-label="Time of day at the site" /><span>24:00</span></label>
        ${flightSpan(flight) !== null ? `<label class="time-scrub time-flight"><span>T−1:00</span><input type="range" min="-60" max="${flightSpan(flight)}" step="0.5" aria-label="The flight, from a minute before liftoff to landing" /><span>Landing</span></label>` : ''}
        <div class="time-rates" role="group" aria-label="How fast time runs">
          <button data-step="-1" title="Half as fast (${capsOf('clock.rate')[0]})">Slower</button>
          <button class="time-rate" title="Real time">1×</button>
          <button data-step="1" title="Twice as fast (${capsOf('clock.rate')[1]})">Faster</button>
          <button class="time-home" title="Back to liftoff, stopped">Liftoff</button>
        </div>
      </div>`;
    parent.append(root);
    const q = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
    this.local = q('.time-local');
    this.count = q('.time-count');
    this.warp = q('.time-warp');
    this.play = q('.time-play');
    this.scrub = q('.time-scrub input');
    this.flightScrub = root.querySelector<HTMLInputElement>('.time-flight input');
    this.flightScrub?.addEventListener('input', () => {
      clock.pause();
      clock.seek(Number(this.flightScrub!.value));
    });
    this.steps = [...root.querySelectorAll<HTMLButtonElement>('[data-step]')];
    this.rate = q('.time-rate');
    this.home = q('.time-home');

    const toggle = q('.time-toggle');
    const open = (on: boolean) => {
      root.classList.toggle('folded', !on);
      toggle.setAttribute('aria-expanded', String(on));
      prefs.set('timeOpen', on);
    };
    open(prefs.get('timeOpen'));
    toggle.addEventListener('click', () => open(root.classList.contains('folded')));
    this.play.addEventListener('click', () => clock.play(!clock.running));
    for (const b of this.steps) b.addEventListener('click', () => clock.step(b.dataset.step === '1' ? 1 : -1));
    // (the rate itself goes back to real time, keeping the way it was running)
    this.rate.addEventListener('click', () => clock.setRate(clock.rate < 0 ? -1 : 1));
    this.home.addEventListener('click', () => clock.reset());
    // taking hold of the scrub stops the clock: the hand is where the finger is, not running on from it
    this.scrub.addEventListener('input', () => {
      clock.pause();
      clock.seek(Number(this.scrub.value) - this.launchAt);
    });
    // P runs and stops the clock from anywhere (the camera legend lists it)
    this.scope.on(window, 'keydown', (e) => {
      const typing = isTyping(e);
      if (modified(e) || typing || e.repeat) return;
      if (is(e, 'clock.run')) clock.play(!clock.running);
      // [ and ] step the rate down and up; the rate shows in the bar, which opens so the change is seen
      const rate = which(e, 'clock.rate');
      if (rate >= 0) clock.step(rate ? 1 : -1);
    });
    clock.listen(() => this.render());
    this.render();
  }

  /** The page it is on has gone: off the window. */
  dispose(): void {
    this.scope.dispose();
  }

  private render(): void {
    const { clock } = this;
    const at = localTime(clock.jdUT, this.zone.utcOffset);
    set(this.local, `${at.text} ${this.zone.name}`);
    set(this.count, missionTime(clock.t));
    // the rate is on the button, so it is seen with the bar folded
    set(this.play, `${clock.running ? 'Stop' : 'Run'}${Math.abs(clock.rate) === 1 ? '' : ` · ${rateText(clock.rate)}`}`);
    // (a warp: where it is going, and when that is)
    const w = clock.warp;
    this.warp.hidden = !w;
    set(this.warp, w ? `to ${w.what} ${missionTime(w.t)}` : '');
    this.warp.title = w
      ? `Warping as fast as the coast lets time run, to ${w.what} at ${missionTime(w.t)}: it lands there at life's pace`
      : '';
    this.play.setAttribute('aria-pressed', String(clock.running));
    const size = Math.abs(clock.rate);
    set(this.rate, rateText(clock.rate));
    this.rate.title = size === 1 ? 'Real time' : `${rateTitle(size)}: press for real time`;
    this.rate.setAttribute('aria-pressed', String(size !== 1));
    for (const b of this.steps) b.disabled = b.dataset.step === '1' ? size >= clock.fastest : size <= 1;
    this.home.disabled = clock.t === 0 && !clock.running;
    // off the launch day the hand waits at the end it left by
    const hand = String(Math.max(0, Math.min(86_400, Math.round(clock.t + this.launchAt))));
    if (document.activeElement !== this.scrub || this.scrub.value !== hand) this.scrub.value = hand;
    if (this.flightScrub) {
      const along = String(Math.max(-60, Math.min(Number(this.flightScrub.max), Math.round(clock.t * 2) / 2)));
      if (this.flightScrub.value !== along) this.flightScrub.value = along;
    }
    this.root.classList.toggle('away', clock.t !== 0);
  }
}

/** How far a flight's own scrub runs past liftoff, seconds: a minute past its documented landing, or seventeen minutes where that is not recorded. */
/**
 * How far the flight's own scrub reaches, s from liftoff: a minute past the landing, where the record gives how long the
 * flight lasted (its `duration` check) and that is short enough to scrub by the half second (under an hour). Null for a
 * flight with none, which scrubs by the time of day alone.
 */
const flightSpan = (flight: Flight): number | null => {
  const lasted = flight.checks?.find((c) => c.id === 'duration')?.value;
  return lasted !== undefined && lasted < 3600 ? Math.ceil((lasted + 60) / 10) * 10 : null;
};

/** Only touch the page when what it says has changed: the clock may tell us sixty times a second. */
function set(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

/** A rate in words: seconds, minutes or hours of the world to one of ours, to a decimal place where it is not whole. */
function rateTitle(rate: number): string {
  if (rate === 1) return 'Real time';
  const say = (n: number, unit: string) => `${Number(n.toFixed(1))} ${unit}${Number(n.toFixed(1)) === 1 ? '' : 's'} a second`;
  if (rate < 60) return say(rate, 'second');
  if (rate < 3600) return say(rate / 60, 'minute');
  if (rate < 86_400) return say(rate / 3600, 'hour');
  return say(rate / 86_400, 'day');
}

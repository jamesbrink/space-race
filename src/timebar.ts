import './time.css';
import { prefs } from './prefs';
import type { Flight } from './types';
import { type Clock, localTime, missionTime, RATES } from './world/clock.ts';

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
  private readonly zone: Flight['site']['zone'];
  /** Seconds from local midnight to the launch: where t = 0 falls on the scrub. */
  private readonly launchAt: number;
  private readonly local: HTMLElement;
  private readonly count: HTMLElement;
  private readonly play: HTMLButtonElement;
  private readonly scrub: HTMLInputElement;
  private readonly rates: HTMLButtonElement[];
  private readonly home: HTMLButtonElement;

  constructor(parent: HTMLElement, clock: Clock, flight: Flight) {
    this.clock = clock;
    this.zone = flight.site.zone;
    this.launchAt = Math.round(localTime(clock.epoch, this.zone.utcOffset).dayFraction * 86_400);
    const root = (this.root = document.createElement('aside'));
    root.className = 'timebar';
    root.setAttribute('aria-label', 'Time');
    root.innerHTML = `
      <div class="time-row">
        <button class="time-play" aria-pressed="false" title="Run or stop the clock (P)"></button>
        <p class="time-read" aria-live="off"><time class="time-local"></time><time class="time-count"></time></p>
        <button class="time-toggle chevron" aria-expanded="true" aria-label="Show or hide the time controls" title="Tuck away"></button>
      </div>
      <div class="time-body">
        <label class="time-scrub"><span>00:00</span><input type="range" min="0" max="86400" step="30" aria-label="Time of day at the site" /><span>24:00</span></label>
        <div class="time-rates" role="group" aria-label="How fast time runs">
          ${RATES.map((r) => `<button data-rate="${r}" aria-pressed="false" title="${rateTitle(r)}">${r}×</button>`).join('')}
          <button class="time-home" title="Back to liftoff, stopped">Liftoff</button>
        </div>
      </div>`;
    parent.append(root);
    const q = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
    this.local = q('.time-local');
    this.count = q('.time-count');
    this.play = q('.time-play');
    this.scrub = q('.time-scrub input');
    this.rates = [...root.querySelectorAll<HTMLButtonElement>('[data-rate]')];
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
    for (const b of this.rates) b.addEventListener('click', () => clock.setRate(Number(b.dataset.rate)));
    this.home.addEventListener('click', () => clock.reset());
    // taking hold of the scrub stops the clock: the hand is where the finger is, not running on from it
    this.scrub.addEventListener('input', () => {
      clock.pause();
      clock.seek(Number(this.scrub.value) - this.launchAt);
    });
    // P runs and stops the clock from anywhere (the camera legend lists it)
    window.addEventListener('keydown', (e) => {
      const typing = (e.target as HTMLElement).matches?.('input:not([type=range]), textarea');
      if (e.metaKey || e.ctrlKey || e.altKey || typing || e.repeat) return;
      if (e.key.toLowerCase() === 'p') clock.play(!clock.running);
      // [ and ] step the rate down and up; the rate shows in the bar, which opens so the change is seen
      if (e.key === '[') clock.step(-1);
      if (e.key === ']') clock.step(1);
    });
    clock.listen(() => this.render());
    this.render();
  }

  private render(): void {
    const { clock } = this;
    const at = localTime(clock.jdUT, this.zone.utcOffset);
    set(this.local, `${at.text} ${this.zone.name}`);
    set(this.count, missionTime(clock.t));
    // the rate is on the button, so it is seen with the bar folded
    set(this.play, `${clock.running ? 'Stop' : 'Run'}${Math.abs(clock.rate) === 1 ? '' : ` · ${clock.rate}×`}`);
    this.play.setAttribute('aria-pressed', String(clock.running));
    for (const b of this.rates) b.setAttribute('aria-pressed', String(Number(b.dataset.rate) === clock.rate));
    this.home.disabled = clock.t === 0 && !clock.running;
    // off the launch day the hand waits at the end it left by
    const hand = String(Math.max(0, Math.min(86_400, Math.round(clock.t + this.launchAt))));
    if (document.activeElement !== this.scrub || this.scrub.value !== hand) this.scrub.value = hand;
    this.root.classList.toggle('away', clock.t !== 0);
  }
}

/** Only touch the page when what it says has changed: the clock may tell us sixty times a second. */
function set(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

function rateTitle(rate: number): string {
  if (rate === 1) return 'Real time';
  if (rate < 60) return `${rate} seconds a second`;
  if (rate < 3600) return `${rate / 60} minute${rate === 60 ? '' : 's'} a second`;
  return `${rate / 3600} hour${rate === 3600 ? '' : 's'} a second`;
}

import './cockpit.css';
import './orbitdeck.css';
import type { CockpitHost } from './cockpit';
import { aboutAxis, multiply, normalize, type Quat, turn } from './sim/rigid.ts';
import { byHand, flyWhole, type FlownWhole, held, recordSamples } from './sim/staged.ts';
import type { LiveSample, VehicleState } from './sim/vehicle.ts';
import { orbitPredictor } from './sim/orbitpath.ts';
import type { OrbitalFlight } from './sim/orbital.ts';
import type { Predictor } from './sim/predict.ts';
import type { SitedFlight } from './types';
import type { Run } from './viewer/ascent';
import { orbitalFlown, orbitalRecord } from './viewer/ascent';
import type { Clock } from './world/clock.ts';
import { sunPosition } from './world/ephemeris.ts';
import { DEG, siteFrame, type Vec3 } from './world/frames.ts';
import { elementsOf } from './world/orbit.ts';
import { greenwichSiderealTime, julianDate, terrestrialTime } from './world/time.ts';

/**
 * The flight deck of a flight into orbit (`Flight.orbital` with an `ascent`): what the pilot of such a flight could do,
 * and no more. Nothing here knows which flight it is: the stages, the events and what the hands could reach are the
 * flight's record (sim/orbital.ts: `manual`).
 *
 * As flown, the whole flight is automatic, as Vostok's was: the ascent on its law (sim/staged.ts), the coast, the
 * braking burn at the record's instant aimed as the record has it, the descent. The pilot rides, and the clock runs it
 * (up to 3,600 times life: an orbit in a minute and a half). That run is the record's own, the same physics.
 *
 * By hand: once the spacecraft is alone, the code on the lock (`manual.code`, typed as its digits) frees the hand
 * controls, as the envelope aboard did. Then W S A D Q E turn the spacecraft about its own axes at the hand
 * controller's rate (`manual.rate`, estimated), the automatic burn is given up, and Space fires the braking engine
 * along the spacecraft's long axis as it then points, for as long as its integrator takes to reach its impulse
 * (`manual.deltaV` at `manual.thrust`). From there the coast, the entry and the descent are flown again (orbital.ts
 * flyOrbit, with that aim; flyDown) and shown: where it comes down, against the record's landing. The attitude is turned
 * as a hand turns it, not flown as a rigid body: the jets, their gas and the tumbles of the record are not modelled.
 * The ascent has no hand controls: the vehicle had none.
 */
const FT = 1000;
const KEYS: Record<string, [axis: Vec3, sense: number]> = {
  w: [[0, 1, 0], 1],
  s: [[0, 1, 0], -1],
  a: [[0, 0, 1], 1],
  d: [[0, 0, 1], -1],
  q: [[1, 0, 0], -1],
  e: [[1, 0, 0], 1],
};

export class OrbitDeck {
  private readonly flight: SitedFlight;
  private readonly clock: Clock;
  private readonly host: CockpitHost;
  private readonly root: HTMLElement;
  private readonly button: HTMLButtonElement;
  private readonly cells = new Map<string, HTMLElement>();
  private readonly watchers: ((sample: LiveSample, live: VehicleState | null) => void)[] = [];
  private on = false;
  /** The record's run, and the one on show (the record's, or one with a burn by hand). */
  private record: Run | null = null;
  private run: Run | null = null;
  private flown: FlownWhole | null = null;
  /** The lock: digits typed so far; freed once the code is in. */
  private typed = '';
  private free = false;
  /** The hand's attitude (fly.ts's frame, body to frame) and when it was last turned; the burn by hand, once fired. */
  private hand: { q: Quat; t: number; log: { t: number; q: Quat }[] } | null = null;
  private fired: number | null = null;
  /** The record as this flight now has it: the record's own, its burn given up (hands free, nothing fired), or the hand's burn. */
  private planned: OrbitalFlight | null = null;
  private readonly held = new Set<string>();

  constructor(parent: HTMLElement, flight: SitedFlight, clock: Clock, host: CockpitHost) {
    this.flight = flight;
    this.clock = clock;
    this.host = host;
    const root = (this.root = document.createElement('aside'));
    root.className = 'cockpit orbit-deck';
    root.hidden = true;
    root.setAttribute('aria-label', 'Flight instruments');
    const cell = (id: string, label: string, unit: string, about: string) =>
      `<div class="gauge" title="${about}"><span>${label}</span><i>${unit}</i><b data-cell="${id}">0</b></div>`;
    const pair = (id: string, label: string, unit: string, about: string) =>
      `<div class="reading" title="${about}"><span>${label}</span><b><u data-cell="${id}">0</u>${unit ? `<i>${unit}</i>` : ''}</b></div>`;
    const code = String(flight.orbital?.manual?.code.value ?? '');
    root.innerHTML = `
      <section class="deck-main">
        <div class="cockpit-card" hidden></div>
        <p class="cockpit-phase"><b data-cell="phase"></b><span data-cell="mode"></span></p>
        <div class="gauges">
          ${cell('altitude', 'Height', 'km', 'Height above the sea')}
          <div class="gauge" title="Speed over the turning Earth while the launch vehicle flies; once the spacecraft is alone, in the frame that does not turn (its orbital speed), as the navball's own modes have it"><span data-cell="speedframe">Surface</span><i>m/s</i><b data-cell="speed">0</b></div>
          ${cell('apogee', 'Apogee', 'km', 'The orbit’s highest point now, over the record’s reference ball')}
          ${cell('perigee', 'Perigee', 'km', 'The orbit’s lowest point now, over the same ball: under the ground, it comes down')}
          ${cell('g', 'Load', 'g', 'What an accelerometer reads')}
        </div>
        <div class="deck-act">
          <button data-do="next" class="cockpit-next" title="The next thing the pilot can do (Space)"><kbd>Space</kbd><span data-cell="next"></span></button>
          <p class="cockpit-prompt" data-cell="prompt" role="status"></p>
        </div>
        <p class="deck-foot">
          <span class="deck-steer">${code ? `${[...code].map((d) => `<button data-press="${d}" title="A digit of the lock’s code (${d})"><kbd>${d}</kbd></button>`).join('')}<em>lock</em>` : ''}
          ${Object.keys(KEYS)
            .map(
              (k) =>
                `<button data-hold="${k}" title="Turn the spacecraft by hand, once freed (${k.toUpperCase()})"><kbd>${k.toUpperCase()}</kbd></button>`,
            )
            .join('')}<em>turn</em></span>
          <button data-do="again" title="A new flight: back to the pad (N)"><kbd>N</kbd></button>
          <button data-do="keys" aria-expanded="false" title="On a narrow screen, the systems’ readings: shown or put away"><span>More</span><i class="chevron"></i></button>
          <button data-do="leave" class="for-keys" title="Leave the flight deck (Esc)"><kbd>Esc</kbd>Leave</button>
        </p>
      </section>
      <section class="deck-sys" aria-label="Systems">
        <div class="readings">
          ${pair('stage', 'Burning', '', 'What is burning now')}
          ${pair('period', 'Period', 'min', 'Once round the orbit now')}
          ${pair('retro', 'Braking', '', 'The braking engine: when the timer fires it, or what the hand did')}
          ${pair('aim', 'Off retrograde', '°', 'How far the spacecraft’s long axis (the braking engine’s push) is from straight against its motion')}
          ${pair('lock', 'Hand controls', '', 'Locked, as flown; the code frees them')}
          ${pair('range', 'Range', 'km', 'Distance over the ground from the pad')}
        </div>
      </section>`;
    parent.append(root);
    for (const el of root.querySelectorAll<HTMLElement>('[data-cell]')) this.cells.set(el.dataset.cell!, el);
    const press = (key: string, down: boolean) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key }));
    root.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('button');
      if (b?.dataset.do) this.command(b.dataset.do);
      else if (b?.dataset.press) {
        press(b.dataset.press, true);
        press(b.dataset.press, false);
      }
      (document.activeElement as HTMLElement | null)?.blur?.();
    });
    for (const b of root.querySelectorAll<HTMLButtonElement>('[data-hold]')) {
      const key = b.dataset.hold!;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.held.add(key);
      });
      for (const end of ['pointerup', 'pointercancel', 'pointerleave'] as const) b.addEventListener(end, () => this.held.delete(key));
    }
    this.button = document.createElement('button');
    this.button.className = 'cockpit-enter';
    this.button.innerHTML = '<kbd>Esc</kbd><span>Fly it</span>';
    this.button.title = 'Ride this flight, and take what controls its pilot had (L)';
    this.button.addEventListener('click', () => (this.on ? this.leave() : this.enter()));
    (parent.querySelector('.time-row') ?? parent).append(this.button);
    window.addEventListener('keydown', (e) => this.key(e, true));
    window.addEventListener('keyup', (e) => this.key(e, false));
    window.addEventListener('blur', () => this.held.clear());
    clock.listen(() => this.follow());
  }

  get active(): boolean {
    return this.on;
  }
  get able(): boolean {
    return Boolean(this.flight.orbital?.ascent && this.flight.flies);
  }
  /** No vehicle of sim/vehicle.ts's is flown here: the predicted path and the guidance's programme are not offered. */
  get craft(): null {
    return null;
  }
  /** What the predicted path is made from (viewer/path.ts): this flight's plan, as it stands. */
  get plan(): string {
    return this.fired !== null ? `hand ${this.fired}` : this.free ? 'free' : 'record';
  }

  /** The path ahead from a sample of the spacecraft alone: none on the launch vehicle, whose law the path does not fly. */
  predict(start: { t: number; r: Vec3; v: Vec3 }): Predictor | null {
    const o = this.flight.orbital!;
    if (start.t <= (o.stages[o.stages.length - 1]!.separation?.value ?? Infinity)) return null;
    let plan = this.planned ?? o;
    if (this.free && this.fired === null) {
      // the timer's burn given up and none fired yet: it stays up, as far as anyone has said
      plan = structuredClone(o);
      plan.retro.on.value = plan.retro.off.value = plan.entry.separation.value = Number.MAX_SAFE_INTEGER;
    }
    return orbitPredictor(plan, siteFrame(this.flight.site), julianDate(this.flight.launch), this.flight.site.seaLevel.value, start);
  }

  get steering(): { guidance: boolean; sequence: boolean; trim: { pitch: number; yaw: number } } {
    return { guidance: !this.free, sequence: !this.free, trim: { pitch: 0, yaw: 0 } };
  }
  listen(fn: (sample: LiveSample, live: VehicleState | null) => void): void {
    this.watchers.push(fn);
  }
  // (no mechanism, no part's command: the deck of a ballistic flight has them, this one does not yet)
  travel(_id: string, _t: number): number | null {
    return null;
  }
  work(_id: string): string | null {
    return null;
  }
  headed(_id: string): boolean | null {
    return null;
  }
  can(_what: string): boolean {
    return false;
  }
  ask(_what: string): void {}

  enter(): void {
    if (!this.able || this.on) return;
    this.on = true;
    this.root.hidden = false;
    this.button.querySelector('span')!.textContent = 'Leave';
    this.host.piloting(true);
    this.fresh();
  }

  leave(): void {
    if (!this.on) return;
    this.on = false;
    this.root.hidden = true;
    this.button.querySelector('span')!.textContent = 'Fly it';
    this.held.clear();
    this.host.fly(null);
    this.clock.reset();
    this.host.piloting(false);
  }

  /** Back on the pad, the clock stopped at liftoff, the lock shut. */
  private fresh(): void {
    this.clock.reset();
    this.record ??= orbitalRecord(this.flight);
    this.run = this.record;
    this.flown = null;
    this.typed = '';
    this.free = false;
    this.hand = null;
    this.fired = null;
    this.planned = null;
    this.host.fly(this.run);
    this.show();
  }

  private command(what: string): void {
    if (what === 'leave') this.leave();
    else if (what === 'again') this.fresh();
    else if (what === 'next') this.next();
    else if (what === 'keys') {
      const open = !this.root.classList.contains('keys-open');
      this.root.classList.toggle('keys-open', open);
      this.root.querySelector('[data-do=keys]')!.setAttribute('aria-expanded', String(open));
    }
  }

  /** Space: liftoff from the pad; with the hand controls free and the burn not yet made, the braking engine. */
  private next(): void {
    const t = this.clock.t;
    if (t <= 0 && !this.clock.running) {
      this.clock.play(true);
      return;
    }
    if (this.free && this.fired === null && this.hand) this.fire(t);
  }

  private key(e: KeyboardEvent, down: boolean): void {
    const typing = (e.target as HTMLElement).matches?.('input:not([type=range]), textarea');
    if (e.metaKey || e.ctrlKey || e.altKey || typing) return;
    const k = e.key.toLowerCase();
    if (!this.on) {
      if (down && k === 'l' && !e.repeat && this.able) this.enter();
      return;
    }
    if (k in KEYS) {
      if (down) this.held.add(k);
      else this.held.delete(k);
      e.preventDefault();
      return;
    }
    if (!down) return;
    if (k === ' ') {
      e.preventDefault();
      this.next();
    } else if (k === 'n') this.fresh();
    else if (k === 'escape' || k === 'l') this.leave();
    else if (/^[0-9]$/.test(k)) this.digit(k);
  }

  /** A digit on the lock: the code in order frees the hand controls, once the spacecraft is alone in orbit. */
  private digit(d: string): void {
    const o = this.flight.orbital!;
    const code = String(o.manual?.code.value ?? '');
    if (!code || this.free) return;
    const alone = this.clock.t > (o.stages[o.stages.length - 1]!.separation?.value ?? Infinity);
    this.typed = (this.typed + d).slice(-code.length);
    if (this.typed !== code) return;
    if (!alone) {
      this.host.say?.('Hand controls', 'Not on the launch vehicle: there were none to free');
      this.typed = '';
      return;
    }
    if (this.clock.t >= o.retro.on.value) {
      this.host.say?.('Hand controls', 'The braking burn has been made: the descent is the automatic system’s');
      return;
    }
    this.free = true;
    const s = this.sampleAt(this.clock.t);
    this.hand = { q: s.attitude, t: s.t, log: [{ t: s.t, q: s.attitude }] };
    this.host.say?.(
      'Hand controls free',
      'Manual descent: not the flight of 12 April. Turn with W S A D Q E, fire the braking engine with Space',
    );
    this.show();
  }

  /** Fire the braking engine by hand along the long axis as it points: the rest of the flight flown again from it. */
  private fire(t: number): void {
    const o = this.flight.orbital!;
    const m = o.manual!;
    const site = siteFrame(this.flight.site);
    const jd = julianDate(this.flight.launch);
    const gast0 = greenwichSiderealTime(jd);
    this.turnTo(t);
    // the long axis in fly.ts's frame, into the inertial frame of date
    const x = turn(this.hand!.q, [1, 0, 0]);
    const [c, s] = [Math.cos(gast0), Math.sin(gast0)];
    const aim: Vec3 = [c * x[0] - s * x[1], s * x[0] + c * x[1], x[2]];
    const plan = byHand(o, t, aim);
    const burn = plan.retro.off.value - t;
    this.planned = plan;
    this.flown = flyWhole(plan, site, jd, this.flight.site.seaLevel.value, undefined, 1, 'published');
    const samples = recordSamples(plan, this.flown, jd, (this.flight.flies?.datum ?? 0) + (o.ascent!.centre?.value ?? 0), (at) =>
      sunPosition(terrestrialTime(jd + at / 86_400)),
    );
    // as the hand turned it, to the burn's end, then as it falls
    const log = this.hand!.log;
    for (const sample of samples) {
      if (sample.t < log[0]!.t || sample.t > t + burn) continue;
      const at = log.filter((k) => k.t <= sample.t).at(-1) ?? log[0]!;
      sample.attitude = at.q;
      sample.axis = turn(at.q, [1, 0, 0]);
    }
    const record = this.record!;
    this.fired = t;
    // what leaves at the modules' parting and at the ejection leaves when this flight has them, or never
    const ejected = this.flown.coast.results.ejectionAt;
    const dropped = this.flight.flies!.drops.map((d, i) =>
      d.on === 'modules'
        ? plan.entry.separation.value
        : d.on === 'ejection'
          ? Number.isFinite(ejected)
            ? ejected
            : Infinity
          : record.dropped[i]!,
    );
    this.run = { ...record, samples, dropped, duration: samples[samples.length - 1]!.t };
    this.host.fly(this.run);
    this.host.say?.('Braking engine', `Fired by hand: ${burn.toFixed(0)} s to ${m.deltaV.value} m/s`);
  }

  /** Turn the hand's attitude on to `t` by the keys held. */
  private turnTo(t: number): void {
    const h = this.hand;
    if (!h || this.fired !== null) return;
    const dt = t - h.t;
    h.t = t;
    if (dt <= 0 || this.held.size === 0) return;
    const rate = (this.flight.orbital!.manual!.rate.value * DEG) as number;
    let q = h.q;
    for (const k of this.held) {
      const [axis, sense] = KEYS[k]!;
      q = normalize(multiply(q, aboutAxis(axis, sense * rate * dt)));
    }
    h.q = q;
    h.log.push({ t, q });
  }

  private sampleAt(t: number): LiveSample {
    const samples = this.run!.samples as readonly LiveSample[];
    let lo = 0;
    let hi = samples.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (samples[mid]!.t <= t) lo = mid;
      else hi = mid;
    }
    return samples[t >= samples[hi]!.t ? hi : lo]!;
  }

  /** The clock has moved: turn by hand, put the moment on the instruments, and stop at the end. */
  private follow(): void {
    if (!this.on || !this.run) return;
    const t = this.clock.t;
    if (t < 0) this.clock.seek(0);
    if (this.free && this.fired === null && this.hand) {
      this.turnTo(t);
      // the turned attitude is what the scene shows from here on
      const samples = this.run.samples as LiveSample[];
      const copy = samples.map((s) =>
        s.t >= this.hand!.log[0]!.t ? { ...s, attitude: this.hand!.q, axis: turn(this.hand!.q, [1, 0, 0]) } : s,
      );
      this.run = { ...this.run, samples: copy };
      this.host.fly(this.run);
    }
    if (t > this.run.duration + 12) {
      this.clock.pause();
      this.clock.seek(this.run.duration + 12);
    }
    this.show();
  }

  /** What came of a burn by hand: where the pilot came down against the record's landing, or that it stays up. */
  private outcome(t: number): string {
    const o = this.flight.orbital!;
    const down = this.flown?.down;
    const pilot = down ? (down.landed.pilot ?? Object.values(down.landed)[0]) : undefined;
    if (!pilot) return 'Still in orbit: it comes down only as the orbit decays, on ten days of supplies';
    if (!this.run || t < this.run.duration) return 'Fired: what follows is flown from your burn';
    const [la, lo] = [o.landing.latitude.value * DEG, o.landing.longitude.value * DEG];
    const [pa, po] = [pilot.latitude * DEG, pilot.longitude * DEG];
    const apart = 6_371 * Math.acos(Math.min(1, Math.sin(la) * Math.sin(pa) + Math.cos(la) * Math.cos(pa) * Math.cos(po - lo)));
    return `Down at ${pilot.latitude.toFixed(2)}° N ${pilot.longitude.toFixed(2)}° E, ${apart.toFixed(0)} km from where Gagarin landed, at ${pilot.speed.toFixed(1)} m/s`;
  }

  private show(): void {
    if (!this.run) return;
    const o = this.flight.orbital!;
    const t = Math.max(0, this.clock.t);
    const s = this.sampleAt(t);
    for (const fn of this.watchers) fn(s, null);
    const set = (id: string, text: string) => {
      const el = this.cells.get(id);
      if (el && el.textContent !== text) el.textContent = text;
    };
    const jd = julianDate(this.flight.launch);
    const gast0 = greenwichSiderealTime(jd);
    const [c, sn] = [Math.cos(gast0), Math.sin(gast0)];
    const into = (v: Vec3): Vec3 => [c * v[0] - sn * v[1], sn * v[0] + c * v[1], v[2]];
    const el = elementsOf(into(s.r), into(s.v));
    const ball = o.orbit.radius.value;
    const flying = t > 0 && s.phase !== 'main';
    set('altitude', (s.altitude / FT).toFixed(1));
    // (as a person expects: over the ground standing on the pad and going up, then the orbit's)
    const orbiting = t > (o.stages[o.stages.length - 1]!.separation?.value ?? Infinity) && s.altitude > 100_000;
    set('speedframe', orbiting ? 'Orbit' : 'Surface');
    set('speed', (orbiting ? s.speed : t > 0 ? s.groundSpeed : 0).toFixed(0));
    set('apogee', flying && el.e < 1 ? ((el.a * (1 + el.e) - ball) / FT).toFixed(0) : '—');
    set('perigee', flying && el.e < 1 ? ((el.a * (1 - el.e) - ball) / FT).toFixed(0) : '—');
    set('g', t > 0 ? s.g.toFixed(2) : '1.00'); // (on the pad it stands on the launch system: one g)
    set('period', flying && el.e < 1 && el.a > ball ? ((2 * Math.PI * Math.sqrt(el.a ** 3 / 3.986004418e14)) / 60).toFixed(1) : '—');
    set('range', (s.range / FT).toFixed(0));
    const burning = o.stages.filter((st) => t >= st.ignition.value && t < st.cutoff.value && t > 0).map((st) => st.name.split(',')[0]!);
    set('stage', burning.join(' + ') || (t >= o.retro.on.value && t < o.retro.off.value && this.fired === null ? 'Braking engine' : '—'));
    const v = s.v;
    const off = Math.acos(Math.max(-1, Math.min(1, -(s.axis[0] * v[0] + s.axis[1] * v[1] + s.axis[2] * v[2]) / Math.hypot(...v)))) / DEG;
    set('aim', t > 0 ? off.toFixed(0) : '—');
    set('lock', this.free ? 'Free: by hand' : 'Locked');
    const clock = (at: number) =>
      new Date(Date.parse(this.flight.launch) + at * 1000 + this.flight.site.zone.utcOffset * 3600_000).toISOString().slice(11, 19);
    const command = o.events.find((e) => e.id === 'retro-command')?.at.value ?? o.retro.on.value;
    set('retro', this.fired !== null ? `By hand, ${clock(this.fired)}` : this.free ? 'Yours: Space' : `Timer, ${clock(command)}`);
    const phase =
      t <= 0
        ? 'On the pad'
        : s.phase === 'powered'
          ? 'Powered flight'
          : s.phase === 'coast'
            ? 'On the third stage'
            : s.phase === 'capsule'
              ? 'In orbit'
              : s.phase === 'entry'
                ? 'Re-entry'
                : t >= this.run.duration
                  ? 'Down'
                  : 'Under the parachutes';
    set('phase', phase);
    set('mode', this.free ? 'Manual descent: not the flight of 12 April' : 'As flown: automatic');
    const alone = t > (o.stages[o.stages.length - 1]!.separation?.value ?? Infinity);
    set(
      'next',
      t <= 0 && !this.clock.running
        ? 'Liftoff'
        : this.free && this.fired === null
          ? 'Braking engine'
          : alone
            ? 'Riding'
            : 'Riding: no hand controls',
    );
    const code = String(o.manual?.code.value ?? '');
    set(
      'prompt',
      t <= 0 && !this.clock.running
        ? 'Ready: Space starts the clock, and the flight is the record’s. ] runs time faster'
        : !alone
          ? 'The launch vehicle flies itself'
          : this.free
            ? this.fired === null
              ? 'Turn the long axis against the motion, then fire'
              : this.outcome(t)
            : code && t < o.retro.on.value
              ? `The hand controls are locked: the code ${[...code].join('-')} frees them`
              : 'The descent is automatic',
    );
    this.root.classList.toggle('free', this.free);
    this.card(t);
  }

  /**
   * Down: the card of the flight against the record's, as the ballistic deck's is. The figures are the run's own (sim/staged.ts
   * `held`), whoever flew it; a check the record's own run is known to miss is marked so, from tests/staged.test.mjs's reasons
   * as mission.md states them, by name only.
   */
  private card(t: number): void {
    const el = this.root.querySelector<HTMLElement>('.cockpit-card')!;
    const whole = this.flown ?? orbitalFlown(this.flight);
    const down = whole.down?.landed.pilot ?? (whole.down ? Object.values(whole.down.landed)[0] : undefined);
    // (the run on show follows the descent module down; the pilot lands under his canopy some minutes after it)
    const over = this.run !== null && down !== undefined && t >= this.run.duration;
    if (el.hidden === !over && el.dataset.at === String(this.fired)) return;
    el.hidden = !over;
    el.dataset.at = String(this.fired);
    if (!over) return;
    const o = this.flight.orbital!;
    const clock = (at: number) =>
      new Date(Date.parse(this.flight.launch) + at * 1000 + this.flight.site.zone.utcOffset * 3600_000).toISOString().slice(11, 19);
    const show = (unit: string, v: number) =>
      unit === 'm' ? `${(v / 1000).toFixed(1)} km` : unit === 's' ? clock(v) : `${v.toFixed(unit === 'deg' ? 2 : 1)} ${unit}`;
    // (the coast's and the descent's: what a pilot's hand can change. The ascent's are the Flown panel's)
    const rows = held(o, whole)
      .slice(o.ascent?.checks.length ?? 0)
      .filter((c) => Number.isFinite(c.got) && c.id !== 'period')
      .map(
        (c) =>
          `<tr${Math.abs(c.got - c.value) > c.tolerance ? ' class="out"' : ''}><th>${c.label}</th><td>${show(c.unit, c.got)}</td><td>${show(c.unit, c.value)}</td></tr>`,
      )
      .join('');
    const [la, lo] = [o.landing.latitude.value * DEG, o.landing.longitude.value * DEG];
    const [pa, po] = [down.latitude * DEG, down.longitude * DEG];
    const apart = 6_371 * Math.acos(Math.min(1, Math.sin(la) * Math.sin(pa) + Math.cos(la) * Math.cos(pa) * Math.cos(po - lo)));
    el.innerHTML = `
      <h3>${this.fired !== null ? 'Down, by your own braking burn' : 'Down, as the automatic system flew it'}</h3>
      <p class="cockpit-why">The descent module landed at ${clock(this.run!.duration)}; the pilot at ${clock(down.at)} Moscow time, ${down.latitude.toFixed(2)}° N ${down.longitude.toFixed(2)}° E, at ${down.speed.toFixed(1)} m/s: ${apart.toFixed(0)} km from where Gagarin came down.${this.fired !== null ? ' A manual descent: not the flight of 12 April.' : ''}</p>
      <table>
        <thead><tr><td></td><td>Flown</td><td>${this.flight.callsign}</td></tr></thead>
        ${rows}
      </table>
      <p class="cockpit-why">Amber rows are outside the tolerance the record sets. The flight as recorded misses several of them itself (the Flown panel, and the flight’s mission.md, say why).</p>
      <p><button data-do="again"><kbd>N</kbd> Fly it again</button><button data-do="leave"><kbd>Esc</kbd> Leave</button></p>`;
  }
}

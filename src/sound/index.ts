/**
 * Sound for the page: the flight heard from wherever the ears are, the place's quiet, and the
 * walk. This file is the joinery: it asks the scene where the vehicle is and the clock what
 * time it is, gives them to sound/model.ts, and sets sound/engine.ts to the answer twenty times
 * a second. It knows no flight: the engine is the flight's plan's, the events are the
 * run's own times and `Flight.flies.drops`.
 *
 * Sound follows the simulation clock and nothing else. What is heard at the clock's instant is
 * what left the vehicle a distance-over-the-speed-of-sound earlier; with the clock stopped the
 * flight is silent (the place is not); run faster than twice life it is a low bed with no
 * events; put somewhere else, nothing that was passed over is played. An event sounds when the
 * heard instant passes it, so nothing is ever queued against wall time.
 *
 * Nothing plays until the page has been touched (browsers insist), sound is on unless switched
 * off (the speaker by the clock, or U) at a volume that is remembered, and a hidden page is
 * suspended.
 */
import { Quaternion, Vector3 } from 'three';
import { type Driving, type Footfall, machinery, type Sounds, type Underfoot } from './audio.ts';
import { prefs } from '../app/prefs.ts';
import { G0 } from '../world/bodies.ts';
import type { LiveSample, VehicleState } from '../sim/vehicle.ts';
import type { SitedFlight, TreadKind } from '../types.ts';
import { brakingOf, liftoffOf, recordOf, type Run } from '../sim/run.ts';
import { Ascent } from '../viewer/ascent.ts';
import type { Clock } from '../world/clock.ts';
import { Engine } from './engine.ts';
import {
  breath,
  type Craft,
  type Cue,
  carries,
  craft,
  cueShots,
  FASTEST,
  type Hearing,
  heightOf,
  type Mix,
  type Moment,
  mix,
  score,
  dropCue,
  type Source,
  stepShots,
  treadOf,
  type Vec,
  Works,
} from './model.ts';
import { is, isTyping, modified } from '../util/keys.ts';
import { Scope } from '../util/scope.ts';

export interface SoundHost {
  /** Where the ears are, in the scene's frame: the camera. */
  ears(): { x: number; y: number; z: number };
  /** Whether the view is going with the flown vehicle (the chase camera) rather than standing somewhere. */
  riding(): boolean;
  /**
   * Whether the scene's hardware is catching the clock up after a jump (viewer/stage.ts `catchingUp`: the last stretch
   * replayed at several times life). That replay is seen and not heard: the site's machines are held silent through it.
   */
  catchingUp?(): boolean;
  /** What the land is painted as at (x, z) in the scene's frame (a road, an apron: Setting.paintedAt), or null where it is the land's own. */
  painted?(x: number, z: number): string | null;
}

/** Seconds between settings of the engine, and how long a start or a stop fades over. */
const EVERY = 0.05;
const FADE = 0.18;
/** The volume until one is chosen. */
const VOLUME = 0.6;

export class Sound {
  /** The walk's sounds (audio.ts): give this to the walker. */
  readonly walk: Sounds;
  private readonly flight: SitedFlight;
  private readonly clock: Clock;
  private readonly host: SoundHost;
  private readonly ascent: Ascent | null;
  private readonly craft: Craft | null;
  private readonly padTurn = new Quaternion();
  private readonly home: Vec;
  private readonly padHeight: number;
  private readonly button: HTMLButtonElement;
  private readonly slider: HTMLInputElement;

  private ctx: AudioContext | null = null;
  /** What it hangs on the window and the frame (util/scope.ts). */
  private readonly scope = new Scope();
  private engine: Engine | null = null;
  private analyser: AnalyserNode | null = null;
  private enabled = !prefs.get('soundOff');
  private level = prefs.level('soundVolume', VOLUME);
  /** The run being flown by hand. */
  private live: Run | null = null;
  /** How far the ears are riding, eased, and the flight instant last heard. */
  private riding = 0;
  private heard = Number.NaN;
  private last: Mix | null = null;
  private setAt = 0;
  private breathAt = 0;
  // ---- the works (issues #2 and #4): the vehicle at whose wheel the walker sits, and every move that names a machine ----
  private readonly works = new Works();
  private driving: Driving | null = null;
  private drivingAt = 0;
  private readonly labels = new Map<unknown, string>();
  private readonly node = new Vector3();

  constructor(parent: HTMLElement, flight: SitedFlight, clock: Clock, host: SoundHost) {
    this.flight = flight;
    this.clock = clock;
    this.host = host;
    this.ascent = Ascent.of(flight);
    // (the engines lit on the ground, heard as one: sim/run.ts `liftoffOf`)
    const lit = liftoffOf(flight.plan);
    this.craft = lit ? craft(lit.thrust, lit.exhaustSpeed / G0, lit.exitArea) : null;
    const def = flight.models.find((m) => m.id === flight.flies?.model);
    this.padTurn.setFromAxisAngle(new Vector3(0, 1, 0), def?.rotationY ?? 0);
    this.home = def?.position ?? [0, 0, 0];
    this.padHeight = flight.site.height.value - flight.site.seaLevel.value;

    this.walk = {
      footfall: (e: Footfall) => {
        if (!this.playing) return;
        for (const s of stepShots(e.kind, e.pace, e.height)) this.engine!.shot(s, this.ctx!.currentTime);
      },
      breath: (phase: number) => {
        if (!this.playing) return;
        const b = breath(phase);
        this.engine!.breath(b.gain, b.centre, this.ctx!.currentTime);
        this.breathAt = performance.now();
      },
      driving: (state: Driving | null) => {
        this.driving = state;
        this.drivingAt = performance.now();
      },
    };

    // the control: a speaker beside the clock, which is always on show, and a volume with the clock's other controls
    this.button = document.createElement('button');
    this.button.className = 'time-sound';
    this.button.innerHTML =
      '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M2 6h2.5L8 3v10L4.5 10H2z" fill="currentColor"/><path class="waves" d="M10.5 5.5a3.5 3.5 0 0 1 0 5M12.3 3.6a6.2 6.2 0 0 1 0 8.8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
    this.button.addEventListener('click', () => this.set(!this.enabled));
    const row = parent.querySelector('.time-row');
    (row ?? parent).insertBefore(this.button, row?.querySelector('.time-toggle') ?? null);
    const label = document.createElement('label');
    label.className = 'time-scrub time-volume';
    label.innerHTML = '<span>Sound</span><input type="range" min="0" max="100" step="1" aria-label="Volume" /><span></span>';
    this.slider = label.querySelector('input')!;
    this.slider.value = String(Math.round(this.level * 100));
    this.slider.addEventListener('input', () => {
      this.level = Number(this.slider.value) / 100;
      prefs.setLevel('soundVolume', this.level);
      if (!this.enabled && this.level > 0) this.set(true);
      this.engine?.setVolume(this.level, this.ctx!.currentTime);
      this.render();
    });
    parent.querySelector('.time-body')?.append(label);
    this.render();

    // a browser lets nothing sound before the page has been touched: the first click or key starts it
    const wake = (): void => {
      if (this.enabled) this.start();
      if (this.ctx?.state === 'running') for (const touch of TOUCHES) window.removeEventListener(touch, wake, true);
    };
    for (const touch of TOUCHES) this.scope.on(window, touch, wake, { capture: true, passive: true });
    this.scope.on(window, 'keydown', (e) => {
      const typing = isTyping(e);
      if (modified(e) || typing || e.repeat) return;
      if (is(e, 'sound.toggle')) this.set(!this.enabled);
    });
    this.scope.on(document, 'visibilitychange', () => {
      if (document.hidden) void this.ctx?.suspend();
      else if (this.enabled) this.start();
    });
    const frame = (): void => {
      this.scope.frame(frame);
      this.update();
    };
    this.scope.frame(frame);
  }

  get on(): boolean {
    return this.enabled;
  }

  get volume(): number {
    return this.level;
  }

  /** Switch sound on or off: remembered, and faded either way. */
  /** The page has gone to another flight: off the window, no more frames, and the sound's context closed. */
  dispose(): void {
    this.scope.dispose();
    this.button.remove();
    void this.ctx?.close();
    this.ctx = null;
    this.engine = null;
  }

  set(on: boolean): void {
    this.enabled = on;
    prefs.set('soundOff', !on);
    this.render();
    if (on) {
      this.start();
      return;
    }
    const { ctx, engine } = this;
    if (!ctx || !engine) return;
    engine.out.gain.cancelScheduledValues(ctx.currentTime);
    engine.out.gain.setTargetAtTime(0, ctx.currentTime, FADE / 3);
    setTimeout(() => !this.enabled && void ctx.suspend(), FADE * 2000);
  }

  /**
   * Say nothing for now, or go on again: the page is somewhere that is no place (the gallery), where the site is not
   * to be heard. The choice of on or off is not touched.
   */
  hush(on: boolean): void {
    if (on === this.hushed) return;
    this.hushed = on;
    const { ctx, engine } = this;
    if (!ctx || !engine || !this.enabled) return;
    engine.out.gain.cancelScheduledValues(ctx.currentTime);
    engine.out.gain.setTargetAtTime(on ? 0 : 1, ctx.currentTime, FADE / 3);
  }
  private hushed = false;

  /** A flight being flown by hand is on show (sim/run.ts `Run`), or the record's again (null). */
  fly(run: Run | null): void {
    this.live = run;
    this.ascent?.use(run);
    this.heard = Number.NaN; // another flight: nothing of the last one is owed
  }

  /** The live flight's state, each time the cockpit shows a sample: nothing the run itself does not say (sim/run.ts `Run.events`). */
  follow(_sample: LiveSample, _state: VehicleState | null): void {}

  /** What is coming out now: level and peak of full scale, and the spectrum's centroid, Hz. For measuring what cannot be heard. */
  meter(): { rms: number; peak: number; centroid: number; state: string } {
    const a = this.analyser;
    if (!a || !this.ctx) return { rms: 0, peak: 0, centroid: 0, state: this.ctx?.state ?? 'none' };
    const wave = new Float32Array(a.fftSize);
    a.getFloatTimeDomainData(wave);
    let sum = 0;
    let peak = 0;
    for (const v of wave) {
      sum += v * v;
      peak = Math.max(peak, Math.abs(v));
    }
    const bins = new Float32Array(a.frequencyBinCount);
    a.getFloatFrequencyData(bins);
    let power = 0;
    let moment = 0;
    bins.forEach((db, i) => {
      const p = 10 ** (db / 10);
      power += p;
      moment += p * ((i * this.ctx!.sampleRate) / a.fftSize);
    });
    return { rms: Math.sqrt(sum / wave.length), peak, centroid: power > 0 ? moment / power : 0, state: this.ctx.state };
  }

  /** The mix last set, for diagnostics. */
  get mix(): Mix | null {
    return this.last;
  }

  /**
   * Render `seconds` of the flight from `from` (s from liftoff) through the same model and graph,
   * with the clock running at life's rate, for ears at `ears` (or riding with the vehicle): a
   * mono signal at 48 kHz. For listening to offline, and for measuring.
   */
  async offline(seconds: number, from: number, ears: Vec, riding = false): Promise<Float32Array> {
    const rate = 48_000;
    const ctx = new OfflineAudioContext(1, Math.round(seconds * rate), rate);
    const engine = new Engine(ctx, undefined, this.flight.site.place.mains.value);
    engine.out.connect(ctx.destination);
    engine.setVolume(this.level, 0);
    let heard = Number.NaN;
    for (let at = 0; at < seconds; at += EVERY) {
      const t = from + at;
      const h = this.hearing(t, 1, true, riding ? this.near(t) : ears, riding ? 1 : 0);
      const m = mix(h);
      engine.apply(m, at);
      for (const shot of this.due(heard, m.heard.emitted, h)) engine.shot(shot, at);
      heard = m.heard.emitted;
    }
    return (await ctx.startRendering()).getChannelData(0);
  }

  private get playing(): boolean {
    return this.enabled && this.ctx?.state === 'running' && this.engine !== null;
  }

  private render(): void {
    this.button.setAttribute('aria-pressed', String(this.enabled));
    this.button.title = this.enabled ? 'Sound is on: switch it off (U)' : 'Sound is off: switch it on (U)';
    this.button.setAttribute('aria-label', this.button.title);
    this.slider.nextElementSibling!.textContent = this.enabled ? `${Math.round(this.level * 100)}%` : 'Off';
  }

  /** Make the context if there is none, and run it, fading up. */
  private start(): void {
    if (document.hidden) return;
    if (!this.ctx) {
      // An iPhone treats a page's Web Audio as ambient sound unless told otherwise, and ambient sound is silenced by the
      // ring/silent switch: with the switch on silent the speaker showed sound on and none was heard. Played as media
      // plays (Safari 17's audio session), it is heard as a video's is.
      const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
      if (session) session.type = 'playback';
      const ctx = (this.ctx = new AudioContext({ latencyHint: 'balanced' }));
      const engine = (this.engine = new Engine(ctx, undefined, this.flight.site.place.mains.value));
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      engine.out.connect(this.analyser);
      engine.out.connect(ctx.destination);
      engine.out.gain.value = 0;
      engine.setVolume(this.level, 0);
    }
    const { ctx, engine } = this;
    void ctx.resume().then(() => {
      if (!this.enabled || this.hushed) return;
      engine!.out.gain.cancelScheduledValues(ctx.currentTime);
      engine!.out.gain.setTargetAtTime(1, ctx.currentTime, FADE);
    });
  }

  /** Every frame; the engine is set every EVERY seconds. */
  private update(): void {
    if (!this.playing) return;
    const ctx = this.ctx!;
    const engine = this.engine!;
    const now = ctx.currentTime;
    if (now - this.setAt < EVERY) return;
    const dt = Math.min(0.5, now - this.setAt);
    this.setAt = now;
    this.riding += Math.max(-dt / 0.4, Math.min(dt / 0.4, Number(this.host.riding()) - this.riding));
    const e = this.host.ears();
    const h = this.hearing(this.clock.t, this.clock.rate, this.clock.running, [e.x, e.y, e.z], this.riding);
    const m = (this.last = mix(h));
    engine.apply(m, now);
    // an event is heard as the heard instant passes it, at life's pace or near it; a jump passes over events without playing them
    if (this.clock.running && this.clock.rate > 0 && this.clock.rate <= FASTEST)
      for (const shot of this.due(this.heard, m.heard.emitted, h)) engine.shot(shot, now);
    this.heard = m.heard.emitted;
    // a breath nobody has reported for a while has stopped (the walk has ended)
    if (this.breathAt && performance.now() - this.breathAt > 400) {
      engine.breath(0, 1000, now);
      this.breathAt = 0;
    }
    this.hearWorks([e.x, e.y, e.z], dt, now);
  }

  // ---- the works: what of the site moves, and the vehicle being driven, heard from the ears (model.ts `Works`) ----

  /** Set the works' voices to what moves now (sound/audio.ts `machinery`) and what is being driven, and play their one-shots. */
  private hearWorks(ears: Vec, dt: number, now: number): void {
    const place = this.flight.site.place;
    // what a tyre is on: the material under it, else what the land is painted as there, else the land
    const tread = (u: Underfoot): TreadKind =>
      treadOf(u.material, place.tread, u.material ? null : (this.host.painted?.(u.x, u.z) ?? null));
    const sources: Source[] = [];
    for (const [key, w] of machinery.working()) {
      if (w.machine.kind === 'none') continue;
      w.node.getWorldPosition(this.node);
      if (!this.labels.has(key)) this.labels.set(key, w.node.name);
      const tyres = w.machine.kind === 'road' || w.machine.kind === 'towed';
      sources.push({
        key,
        kind: w.machine.kind,
        along: w.along,
        travel: w.travel,
        where: [this.node.x, this.node.y, this.node.z],
        engine: w.machine.engine ? place.engines[w.machine.engine] : null,
        ...(w.rider?.joints ? { joints: w.rider.joints } : {}),
        // (each wheel's own, as its rider last stood it; with none, what is under the move's node)
        ...(tyres
          ? { treads: w.rider?.under.length ? w.rider.under.map(tread) : [tread({ material: null, x: this.node.x, z: this.node.z })] }
          : {}),
      });
    }
    // (a driver nobody has reported for a while has got out: the walk has ended)
    const d = this.driving && performance.now() - this.drivingAt < 400 ? this.driving : null;
    if (d) {
      this.labels.set(DRIVEN, d.engine ?? 'vehicle');
      sources.push({
        key: DRIVEN,
        kind: 'road',
        along: 0,
        travel: Number.POSITIVE_INFINITY,
        where: d.at,
        driven: { speed: d.speed, top: d.top, throttle: d.throttle },
        engine: d.engine ? (place.engines[d.engine] ?? null) : null,
        treads: d.under.map(tread),
      });
    }
    const { voices, shots } = this.works.hear(sources, ears, dt, place.tread.land.kind);
    // a catch-up after a jump is the hardware hurrying to where the clock was put: what it does then is not heard at that
    // pace. The machines fade out over a moment as it starts and come back in over half a second once it is done (by then
    // whatever it moved is running down at its own rate), so neither end is a step; their one-shots are not played
    // meanwhile. The vehicle being driven is the driver's, not the clock's, and is heard throughout.
    this.held = this.host.catchingUp?.() ? Math.max(0, this.held - dt / HUSH) : Math.min(1, this.held + dt / UNHUSH);
    for (let i = 0; i < voices.length; i++) {
      const v = voices[i];
      if (v && this.works.playing[i]?.key !== DRIVEN) voices[i] = { ...v, gain: v.gain * this.held };
    }
    this.engine!.works(voices, now);
    if (this.held >= 1) for (const shot of shots) this.engine!.shot(shot, now);
  }
  /** How much of the site's machines is let through, 0 to 1: nought through a catch-up (`hearWorks`). */
  private held = 1;

  /** The place's hum's tones, Hz (its mains and twice it: engine.ts `humOf`), as the engine was built; empty before it is. */
  get hum(): number[] {
    return this.engine?.hum ?? [];
  }

  /** What the works are playing now, slot by slot (null: silent): for measuring what cannot be heard (`sr.sound.voices`). */
  get voices(): ({ what: string; kind: string; part: string; gain: number; metres: number; rpm?: number; tread?: string } | null)[] {
    return this.works.playing.map((p) =>
      p
        ? {
            what: this.labels.get(p.key) ?? '?',
            kind: p.kind,
            part: p.part,
            gain: p.key === DRIVEN ? p.gain : p.gain * this.held,
            metres: p.metres,
            rpm: p.rpm,
            tread: p.tread,
          }
        : null,
    );
  }

  /** Where the engine is at `t`, in the scene's frame: where the scene puts the model (viewer/ascent.ts), on its pad when it is not flying. */
  private readonly at = new Vector3();
  private readonly turn = new Quaternion();
  private where(t: number): Vec {
    return this.ascent?.place(t, this.padTurn, this.at, this.turn) ? [this.at.x, this.at.y, this.at.z] : this.home;
  }

  /** Ears beside the vehicle at `t`, for a render that rides with it: thirty metres off, level with it. */
  private near(t: number): Vec {
    const [x, y, z] = this.where(t);
    return [x + 30, y + 10, z];
  }

  /** The run on show as sound needs it. */
  private hearing(t: number, rate: number, running: boolean, ears: Vec, riding: number): Hearing {
    let samples: readonly Moment[] = [];
    let out = { drogue: Infinity, main: Infinity };
    let duration = Infinity;
    // (the run on show: the one being flown, or the record's, whichever kind of flight it is: sim/run.ts `recordOf`)
    const run = this.live ?? (this.ascent ? recordOf(this.flight) : null);
    if (run) ({ samples, out, duration } = run);
    return {
      t,
      rate,
      running,
      ears,
      riding,
      craft: this.craft ?? { thrust: 0, exhaustSpeed: 0, peak: 50 },
      where: (at) => this.where(at),
      burn: (at) => this.ascent?.burn(at).on ?? 0,
      samples,
      out,
      duration,
      stays: this.live !== null,
      padHeight: this.padHeight,
      place: this.flight.site.place.quiet,
    };
  }

  /** The run's events, at its own times: the record's retrorockets at the record's times, a hand-flown flight's from when its first was lit. */
  private cues(h: Hearing): Cue[] {
    const plan = this.flight.plan;
    if (!this.ascent || !plan) return [];
    // What leaves, each when the run on show has it go, and the spacecraft's braking burn where the run lights one
    // (sim/run.ts `brakingOf`: a ballistic flight's retrorockets, the first at its lighting and the rest on their timer; a
    // flight into orbit's braking engine while the run burns it, the record's timer's or a hand's, as one burn of its length at
    // its thrust: the TDU-1's 1,614 kgf where the record gives it, else the impulse over the burn, its own timbre, a
    // pressure-fed liquid engine's, not synthesised apart)
    const run = this.live ?? recordOf(this.flight);
    const braking = run ? brakingOf(this.flight, run) : null;
    return score({
      drops: this.ascent.drops.map((d, i) => ({ at: d.at, cue: dropCue(plan, this.flight.flies!.drops[i]?.on) })),
      retro: braking ? { fires: braking.fires, burn: braking.burn, thrust: braking.thrust } : null,
      out: h.out,
      duration: h.duration,
    });
  }

  /** The one-shots owed as the heard instant goes from `before` to `after`: none unless it went forward by a moment. */
  private due(before: number, after: number, h: Hearing) {
    if (!(after > before) || after - before > 1) return [];
    const earsAir = carries(heightOf(h.ears, h.padHeight));
    return this.cues(h)
      .filter((c) => c.at > before && c.at <= after)
      .flatMap((c) => {
        const from = h.where(c.at - 0.05); // (a moment before: at its landing the record's vehicle is put back on its pad)
        const metres = Math.hypot(h.ears[0] - from[0], h.ears[1] - from[1], h.ears[2] - from[2]);
        const there = carries(heightOf(from, h.padHeight));
        return cueShots(c, metres, Math.min(earsAir, there), h.riding, there);
      });
  }
}

const TOUCHES = ['pointerdown', 'keydown', 'touchend'] as const;
/** The key the vehicle being driven is heard by (there is one at a time). */
const DRIVEN = Symbol('driven');
/** How long the site's machines take to fade out as a catch-up begins, and to come back once it is over, s. */
const HUSH = 0.15;
const UNHUSH = 0.5;

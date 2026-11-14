/**
 * Sound for the page: the flight heard from wherever the ears are, the place's quiet, and the
 * walk. This file is the joinery: it asks the scene where the vehicle is and the clock what
 * time it is, gives them to sound/model.ts, and sets sound/engine.ts to the answer twenty times
 * a second. It knows no flight: the engine is the flight's `trajectory`, the events are the
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
import type { Footfall, Sounds } from '../audio';
import { prefs } from '../prefs';
import { flownOnce, G0 } from '../sim/fly.ts';
import type { LiveSample, VehicleState } from '../sim/vehicle.ts';
import type { SitedFlight } from '../types';
import { liftoffEngine } from '../sim/staged.ts';
import { Ascent, orbitalRecord, type Run } from '../viewer/ascent';
import type { Clock } from '../world/clock.ts';
import { siteFrame } from '../world/frames.ts';
import { Engine } from './engine';
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
  PLACE,
  score,
  stepShots,
  type Vec,
} from './model.ts';

export interface SoundHost {
  /** Where the ears are, in the scene's frame: the camera. */
  ears(): { x: number; y: number; z: number };
  /** Whether the view is going with the flown vehicle (the chase camera) rather than standing somewhere. */
  riding(): boolean;
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
  private engine: Engine | null = null;
  private analyser: AnalyserNode | null = null;
  private enabled = !prefs.get('soundOff');
  private level = prefs.level('soundVolume', VOLUME);
  /** The run being flown by hand, and when its first retrorocket lit. */
  private live: Run | null = null;
  private retroAt: number | null = null;
  /** How far the ears are riding, eased, and the flight instant last heard. */
  private riding = 0;
  private heard = Number.NaN;
  private last: Mix | null = null;
  private setAt = 0;
  private breathAt = 0;

  constructor(parent: HTMLElement, flight: SitedFlight, clock: Clock, host: SoundHost) {
    this.flight = flight;
    this.clock = clock;
    this.host = host;
    this.ascent = Ascent.of(flight);
    const tr = flight.trajectory;
    // (an orbital flight's engines lit on the ground, heard as one: sim/staged.ts)
    const lit = !tr && flight.orbital?.ascent ? liftoffEngine(flight.orbital) : null;
    this.craft = tr
      ? craft(tr.engine.thrust.value, tr.engine.isp.value, tr.engine.exitArea.value)
      : lit
        ? craft(lit.thrust, lit.exhaustSpeed / G0, lit.exitArea)
        : null;
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
    for (const touch of TOUCHES) window.addEventListener(touch, wake, { capture: true, passive: true });
    window.addEventListener('keydown', (e) => {
      const typing = (e.target as HTMLElement).matches?.('input:not([type=range]), textarea');
      if (e.metaKey || e.ctrlKey || e.altKey || typing || e.repeat) return;
      if (e.key.toLowerCase() === 'u') this.set(!this.enabled);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) void this.ctx?.suspend();
      else if (this.enabled) this.start();
    });
    const frame = (): void => {
      requestAnimationFrame(frame);
      this.update();
    };
    requestAnimationFrame(frame);
  }

  get on(): boolean {
    return this.enabled;
  }

  get volume(): number {
    return this.level;
  }

  /** Switch sound on or off: remembered, and faded either way. */
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

  /** A flight being flown by hand is on show (viewer/ascent.ts `Run`), or the record's again (null). */
  fly(run: Run | null): void {
    this.live = run;
    this.retroAt = null;
    this.ascent?.use(run);
    this.heard = Number.NaN; // another flight: nothing of the last one is owed
  }

  /** The live flight's state, each time the cockpit shows a sample: what the run itself does not say. */
  follow(_sample: LiveSample, state: VehicleState | null): void {
    if (state) this.retroAt = state.retroAt; // (looking back at what was flown, it is as it was left)
  }

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
    const engine = new Engine(ctx);
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
      const engine = (this.engine = new Engine(ctx));
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
    const tr = this.flight.trajectory;
    let samples: readonly Moment[] = [];
    let out = { drogue: Infinity, main: Infinity };
    let duration = Infinity;
    if (this.live) ({ samples, out, duration } = this.live);
    else if (!tr && this.ascent && this.flight.orbital?.ascent) ({ samples, duration } = orbitalRecord(this.flight));
    else if (tr && this.ascent) {
      const flown = flownOnce(tr, siteFrame(this.flight.site), this.flight.site.seaLevel.value);
      samples = flown.samples;
      const when = (v: number): number => (Number.isFinite(v) ? v : Infinity);
      out = { drogue: when(flown.results.drogueAt), main: when(flown.results.mainAt) };
      duration = flown.results.duration;
    }
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
      place: PLACE,
    };
  }

  /** The run's events, at its own times: the record's retrorockets at the record's times, a hand-flown flight's from when its first was lit. */
  private cues(h: Hearing): Cue[] {
    const tr = this.flight.trajectory;
    if (!this.ascent) return [];
    // (an orbital flight's drops are heard; its braking engine is not yet)
    if (!tr)
      return score({
        drops: this.ascent.drops.map((d, i) => ({ at: d.at, on: this.flight.flies!.drops[i]?.on })),
        retro: null,
        out: h.out,
        duration: h.duration,
      });
    const fires = tr.retro.fires.map((f) => f.value);
    const lit = this.live ? this.retroAt : fires[0]!;
    const drops = this.ascent.drops.map((d, i) => ({ at: d.at, on: this.flight.flies!.drops[i]?.on }));
    return score({
      drops,
      retro:
        lit === null || lit === undefined
          ? null
          : { fires: fires.map((f) => f - fires[0]! + lit), burn: tr.retro.burn.value, thrust: tr.retro.thrust.value },
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

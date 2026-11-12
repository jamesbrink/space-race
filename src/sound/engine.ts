/**
 * The sound itself: a small Web Audio graph that is set to whatever sound/model.ts works out. It
 * decides nothing: every level, frequency and delay is the model's, and this file only turns
 * them into AudioParam ramps, so the same code plays live and renders offline.
 *
 * Honesty. Nothing is recorded: every sound is noise through filters, a few oscillators and
 * envelopes, so every timbre is an impression, `estimated`. What drives each is real: the
 * engine's level and spectrum come from the flight's thrust, specific impulse and nozzle and
 * from where the ears are (distance, the air's absorption, the delay and Doppler of the path,
 * the ground's reflection); the air's roar from dynamic pressure and Mach number; the events
 * from the run's own times; the place's bed is a fixed, quiet guess. See model.ts for which
 * figures are rules of thumb.
 *
 * The graph (three looping noise buffers shared by everything, made once from a seeded generator):
 *
 *   brown   -> low-pass at 4 x the spectrum's peak -> rumble --+
 *   brown   -> band-pass at the peak               -> sub -----+-> low-pass (air, structure) -> engine -+-> flight
 *   crackle -> high-pass 250 Hz                    -> crackle -+                     +-> delay (ground) -+
 *   white   -> band-pass (air on the skin) -> flutter (an LFO) -> air   -> flight
 *   white   -> band-pass 3.2 kHz                               -> jets  -> flight
 *   white   -> band-pass 380 Hz -> wind (wanders)   -> place
 *   white   -> low-pass 650 Hz  -> water (swells)   -> place
 *   60 and 120 Hz                -> hum             -> place
 *   white   -> band-pass         -> breath          -> walk
 *   one-shots (model.ts `Shot`): a stretch of a buffer -> filter -> envelope -> flight or walk
 *   flight + place + walk -> volume -> compressor -> soft clip (never past full scale) -> out
 *
 * `crackle` is what makes a rocket a rocket: noise in bursts whose positive peaks are sharper
 * than its negative ones, as a supersonic jet's pressure is.
 */
import type { Mix, Shot } from './model.ts';

/** Seconds of each noise buffer. */
const LOOP = 5;
/** How fast a setting is approached, s: slow enough not to click, fast enough to follow a frame. */
const EASE = 0.06;
/** The most one-shots sounding at once: more are dropped, not queued. */
const VOICES = 14;

/** A generator of the same numbers every time (mulberry32): a render is the same render. */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Scale to a peak, about zero. */
function settle(data: Float32Array, peak: number): void {
  let mean = 0;
  for (const v of data) mean += v;
  mean /= data.length;
  let most = 1e-9;
  for (let i = 0; i < data.length; i++) {
    data[i]! -= mean;
    most = Math.max(most, Math.abs(data[i]!));
  }
  for (let i = 0; i < data.length; i++) data[i]! *= peak / most;
}

/** The three noises: white; brown (white summed, leaking), its ends joined so the loop has no step; and crackle. */
function noises(ctx: BaseAudioContext, seed: number): Record<Shot['noise'], AudioBuffer> {
  const n = Math.round(LOOP * ctx.sampleRate);
  const rnd = random(seed);
  const make = (fill: (data: Float32Array) => void): AudioBuffer => {
    const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
    fill(buffer.getChannelData(0));
    return buffer;
  };
  const white = make((d) => {
    for (let i = 0; i < n; i++) d[i] = rnd() * 2 - 1;
  });
  const brown = make((d) => {
    let v = 0;
    for (let i = 0; i < n; i++) {
      v = 0.996 * v + 0.06 * (rnd() * 2 - 1);
      d[i] = v;
    }
    const step = d[n - 1]! - d[0]!;
    for (let i = 0; i < n; i++) d[i]! -= (step * i) / (n - 1);
    settle(d, 0.9);
  });
  // bursts arriving at random (about ninety a second), each dying in a few milliseconds, over a steady floor;
  // then the positive half made taller and the negative shallower: the skewness heard as crackle
  const crackle = make((d) => {
    let burst = 0;
    const perSample = 90 / ctx.sampleRate;
    let fall = 0.999;
    for (let i = 0; i < n; i++) {
      if (rnd() < perSample) {
        burst = 0.6 + 1.8 * rnd();
        fall = Math.exp(-1 / (ctx.sampleRate * (0.002 + 0.01 * rnd())));
      }
      burst *= fall;
      const v = (rnd() * 2 - 1) * (0.3 + burst);
      d[i] = v > 0 ? 1.7 * v : 0.55 * v;
    }
    settle(d, 0.9);
  });
  return { white, brown, crackle };
}

/** The curve the last stage follows: straight below 0.7 and bent over to 0.98, so nothing leaves it past full scale. */
function softClip(): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(new ArrayBuffer(4 * 2049));
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    const a = Math.abs(x);
    curve[i] = Math.sign(x) * (a < 0.7 ? a : 0.7 + 0.28 * Math.tanh((a - 0.7) / 0.28));
  }
  return curve;
}

export class Engine {
  readonly ctx: BaseAudioContext;
  /** The last node: join it to the destination (or to an analyser on the way). */
  readonly out: GainNode;
  private readonly buffers: Record<Shot['noise'], AudioBuffer>;
  private readonly loops: AudioBufferSourceNode[] = [];
  private readonly buses: Record<Shot['bus'], GainNode>;
  private readonly volume: GainNode;
  private readonly p: {
    rumbleLow: AudioParam;
    rumble: AudioParam;
    subBand: AudioParam;
    sub: AudioParam;
    crackle: AudioParam;
    engineLow: AudioParam;
    echoDelay: AudioParam;
    echo: AudioParam;
    airBand: AudioParam;
    air: AudioParam;
    flutter: AudioParam;
    flutterRate: AudioParam;
    jets: AudioParam;
    wind: AudioParam;
    water: AudioParam;
    hum: AudioParam;
    breathBand: AudioParam;
    breath: AudioParam;
  };
  private sounding = 0;
  private readonly rnd: () => number;

  constructor(ctx: BaseAudioContext, seed = 1961) {
    this.ctx = ctx;
    this.rnd = random(seed + 1);
    this.buffers = noises(ctx, seed);
    const gain = (value: number, to?: AudioNode): GainNode => {
      const g = ctx.createGain();
      g.gain.value = value;
      if (to) g.connect(to);
      return g;
    };
    const filter = (type: BiquadFilterType, hertz: number, q: number, to: AudioNode): BiquadFilterNode => {
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = hertz;
      f.Q.value = q;
      f.connect(to);
      return f;
    };
    const loop = (noise: Shot['noise'], to: AudioNode[]): AudioBufferSourceNode => {
      const src = ctx.createBufferSource();
      src.buffer = this.buffers[noise];
      src.loop = true;
      for (const node of to) src.connect(node);
      src.start(0, this.rnd() * LOOP);
      this.loops.push(src);
      return src;
    };
    const lfo = (hertz: number, to: AudioParam, depth: number): { rate: AudioParam; depth: AudioParam } => {
      const osc = ctx.createOscillator();
      osc.frequency.value = hertz;
      const by = gain(depth);
      osc.connect(by);
      by.connect(to);
      osc.start();
      return { rate: osc.frequency, depth: by.gain };
    };

    // the end of the chain: volume, a compressor as a limiter, a soft clip that cannot pass full scale
    this.out = gain(1);
    const clip = ctx.createWaveShaper();
    clip.curve = softClip();
    clip.connect(this.out);
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -16;
    limiter.knee.value = 10;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    limiter.connect(clip);
    this.volume = gain(0.5, limiter);
    const flight = gain(0, this.volume);
    const place = gain(1, this.volume);
    const walk = gain(1, this.volume);
    this.buses = { flight, walk };

    // the engine
    const engine = gain(1, flight);
    const echoGain = gain(0, flight);
    const echo = ctx.createDelay(0.6);
    echo.connect(echoGain);
    engine.connect(echo);
    const engineLow = filter('lowpass', 16_000, 0.5, engine);
    const rumble = gain(0, engineLow);
    const sub = gain(0, engineLow);
    const crackle = gain(0, engineLow);
    const rumbleLow = filter('lowpass', 200, 0.6, rumble);
    const subBand = filter('bandpass', 50, 1.1, sub);
    loop('brown', [rumbleLow, subBand]);
    loop('crackle', [filter('highpass', 250, 0.6, crackle)]);

    // the air, the jets, the place and the breath share one white noise
    const air = gain(0, flight);
    const flutterOn = gain(1, air);
    const flutter = lfo(9, flutterOn.gain, 0);
    const airBand = filter('bandpass', 400, 0.6, flutterOn);
    const jets = gain(0, flight);
    const wind = gain(0, place);
    const windWander = gain(1, wind);
    lfo(0.07, windWander.gain, 0.35);
    lfo(0.19, windWander.gain, 0.2);
    const water = gain(0, place);
    const swell = gain(0.6, water);
    lfo(0.115, swell.gain, 0.4); // a wave on the beach every nine seconds or so
    const breath = gain(0, walk);
    const breathBand = filter('bandpass', 1000, 1.2, breath);
    loop('white', [
      airBand,
      filter('bandpass', 3200, 0.8, jets),
      filter('bandpass', 380, 0.5, windWander),
      filter('lowpass', 650, 0.5, swell),
      breathBand,
    ]);
    const hum = gain(0, place);
    for (const [hertz, level] of [
      [60, 1],
      [120, 0.5],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.frequency.value = hertz;
      osc.connect(gain(level, hum));
      osc.start();
    }

    this.p = {
      rumbleLow: rumbleLow.frequency,
      rumble: rumble.gain,
      subBand: subBand.frequency,
      sub: sub.gain,
      crackle: crackle.gain,
      engineLow: engineLow.frequency,
      echoDelay: echo.delayTime,
      echo: echoGain.gain,
      airBand: airBand.frequency,
      air: air.gain,
      flutter: flutter.depth,
      flutterRate: flutter.rate,
      jets: jets.gain,
      wind: wind.gain,
      water: water.gain,
      hum: hum.gain,
      breathBand: breathBand.frequency,
      breath: breath.gain,
    };
  }

  /** Go toward a mix from `when` (the context's time). */
  apply(m: Mix, when: number, ease = EASE): void {
    const p = this.p;
    const to = (param: AudioParam, value: number, slow = ease) => param.setTargetAtTime(Number.isFinite(value) ? value : 0, when, slow);
    const top = this.ctx.sampleRate / 2.2;
    const rate = m.engine.rate;
    to(this.buses.flight.gain, m.flight, 0.12);
    to(p.rumble, m.engine.gain);
    to(p.sub, 1.6 * m.engine.sub);
    to(p.crackle, 0.9 * m.engine.crackle);
    to(p.rumbleLow, Math.min(top, 4 * m.engine.peak * rate));
    to(p.subBand, m.engine.peak * rate);
    to(p.engineLow, Math.min(top, m.engine.cutoff * rate));
    // Doppler: the noise itself is played faster or slower (the brown and the crackle loops: the engine's two)
    for (const src of this.loops.slice(0, 2)) to(src.playbackRate, rate, 0.15);
    to(p.echoDelay, m.engine.echo.delay, 0.2);
    to(p.echo, m.engine.echo.gain);
    to(p.air, 2.2 * m.air.gain);
    to(p.airBand, Math.min(top, m.air.centre), 0.25);
    to(p.flutter, m.air.flutter, 0.25);
    to(p.flutterRate, m.air.flutterRate, 0.25);
    to(p.jets, m.jets, 0.02);
    to(p.wind, m.place.wind, 0.4);
    to(p.water, m.place.water, 0.4);
    to(p.hum, m.place.hum, 0.4);
  }

  /** Play a one-shot at `when`. */
  shot(s: Shot, when: number): void {
    if (this.sounding >= VOICES || !(s.gain > 0)) return;
    const { ctx } = this;
    const at = Math.max(when, ctx.currentTime);
    const length = s.attack + s.hold + s.decay;
    const top = ctx.sampleRate / 2.2;
    const src = ctx.createBufferSource();
    src.buffer = this.buffers[s.noise];
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = s.filter;
    f.Q.value = s.q;
    f.frequency.setValueAtTime(Math.min(top, s.from), at);
    f.frequency.exponentialRampToValueAtTime(Math.min(top, Math.max(20, s.to)), at + length);
    const env = ctx.createGain();
    // (a band of noise is quieter than the whole of it: made up, roughly, so a recipe's gain is what is heard)
    const level = s.gain * (s.filter === 'bandpass' && s.q > 4 ? 6 : 1.8);
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(level, at + s.attack);
    env.gain.setValueAtTime(level, at + s.attack + s.hold);
    env.gain.setTargetAtTime(0, at + s.attack + s.hold, s.decay / 6.9); // (to a thousandth in `decay`)
    src.connect(f);
    f.connect(env);
    env.connect(this.buses[s.bus]);
    src.start(at, this.rnd() * (LOOP - 1));
    src.stop(at + length + 0.05);
    this.sounding++;
    src.onended = () => {
      this.sounding--;
      env.disconnect();
    };
    if (s.thump) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.setValueAtTime(s.thump.from, at);
      osc.frequency.exponentialRampToValueAtTime(Math.max(15, s.thump.to), at + s.thump.decay);
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(s.thump.gain, at + 0.004);
      g.gain.setTargetAtTime(0, at + 0.004, s.thump.decay / 6.9);
      osc.connect(g);
      g.connect(this.buses[s.bus]);
      osc.start(at);
      osc.stop(at + s.thump.decay + 0.05);
      osc.onended = () => g.disconnect();
    }
  }

  /** The breath in the helmet: its hiss toward a level and a band. */
  breath(gain: number, centre: number, when: number): void {
    this.p.breath.setTargetAtTime(gain, when, 0.07);
    this.p.breathBand.setTargetAtTime(centre, when, 0.07);
  }

  /** The master volume, 0 to 1, eased. */
  setVolume(v: number, when: number): void {
    this.volume.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), when, 0.05);
  }
}

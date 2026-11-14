import './time.css';
import { flownOnce, type Sample, sampleAt } from './sim/fly.ts';
import { held } from './sim/staged.ts';
import type { SitedFlight } from './types';
import { orbitalFlown, orbitalRecord } from './viewer/ascent';
import type { Run } from './viewer/ascent';
import { type Clock, missionTime } from './world/clock.ts';
import { siteFrame } from './world/frames.ts';

/**
 * The flight as the simulator flies it (sim/fly.ts), beside what the reports say happened: four
 * traces against time with the clock's instant marked on them, the figures at that instant, and
 * a table of the documented results with the simulator's and how far apart they are. The scene
 * shows the same run (viewer/ascent.ts): from liftoff to landing the vehicle is where this has it.
 *
 * Dragging along a trace moves the clock, as the time bar's scrub does.
 *
 * A flight flown by hand (`fly`, given the cockpit's run) is drawn over the record's in amber as it
 * grows: one more polyline a trace, its points rewritten a few times a second and only when the
 * run has more samples, on the record's own axes (what goes past them is not drawn past them).
 */
interface Trace {
  label: string;
  unit: string;
  of: (s: Sample) => number;
  /** A documented figure drawn across the trace as a line to meet. */
  marks: { id: string; scale: number }[];
  digits: number;
}

const TRACES: Trace[] = [
  { label: 'Height', unit: 'km', of: (s) => s.altitude / 1000, marks: [{ id: 'apogee', scale: 1e-3 }], digits: 1 },
  { label: 'Range', unit: 'km', of: (s) => s.range / 1000, marks: [{ id: 'range', scale: 1e-3 }], digits: 1 },
  { label: 'Speed, space-fixed', unit: 'km/h', of: (s) => s.speed * 3.6, marks: [{ id: 'separationSpeed', scale: 3.6 }], digits: 0 },
  {
    label: 'Load',
    unit: 'g',
    of: (s) => s.g,
    marks: [
      { id: 'exitG', scale: 1 },
      { id: 'entryG', scale: 1 },
    ],
    digits: 2,
  },
];
const W = 300;
const H = 56;
/** The live run's traces are redrawn no more often than this, ms, and with no more points than this. */
const REDRAW = 250;
const POINTS = 400;

/**
 * A run's samples as an SVG polyline's points on a trace `W` by `H`: time across `duration`, the value up to `top`,
 * thinned to `most` points (the last always kept) and held inside the box.
 */
export function points(samples: readonly Sample[], of: (s: Sample) => number, duration: number, top: number, most = POINTS): string {
  const step = Math.max(1, Math.ceil(samples.length / most));
  const out: string[] = [];
  for (let i = 0; i < samples.length; i += step) {
    const s = i + step >= samples.length ? samples[samples.length - 1]! : samples[i]!;
    const x = Math.max(0, Math.min(W, (s.t / duration) * W));
    const y = Math.max(0, Math.min(H, H - (of(s) / top) * H));
    out.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return out.join(' ');
}

/** How a check's value reads: in the units people use for it, whatever SI unit it is recorded in. */
function shown(c: { unit: string }, value: number): string {
  if (c.unit === 'm') return `${(value / 1000).toFixed(1)} km`;
  if (c.unit === 'm/s') return `${Math.round(value * 3.6).toLocaleString('en-GB')} km/h`;
  if (c.unit === 'Pa') return `${(value / 1000).toFixed(1)} kPa`;
  if (c.unit === 's') return missionTime(value).replace('T+', '');
  if (c.unit === 'deg') return `${value.toFixed(1)}°`;
  return `${value.toFixed(1)} ${c.unit}`;
}

export class Flown {
  private readonly root: HTMLElement;
  private readonly clock: Clock;
  private readonly flight: SitedFlight;
  private samples: Sample[] = [];
  private duration = 0;
  private cursors: SVGLineElement[] = [];
  private values: HTMLElement[] = [];
  private phase: HTMLElement | null = null;
  /** A flight being flown by hand, drawn over the record's: its run, its polylines, each trace's top, and what of it is drawn. */
  private live: Run | null = null;
  private lines: SVGPolylineElement[] = [];
  private tops: number[] = [];
  private drawn = { count: -1, at: 0, t: -1 };

  /**
   * Draw a flight being flown by hand over the record's (the cockpit's run: it grows). Null says the flight deck has
   * been left: the last flight flown stays drawn, until another is begun.
   */
  fly(run: Run | null): void {
    if (run) this.live = run;
    this.drawn = { count: -1, at: 0, t: -1 };
    this.root.classList.toggle('flying', run !== null);
    this.root.classList.toggle('flew', this.live !== null && this.live.samples.length > 1);
    this.trace();
  }

  /** The live run's polylines, brought up to its samples: a few times a second at most, and only when there is more to draw. */
  private trace(): void {
    if (!this.lines.length) return;
    const run = this.live;
    if (!run) {
      for (const line of this.lines) line.setAttribute('points', '');
      return;
    }
    const last = run.samples[run.samples.length - 1];
    const now = performance.now();
    if (!last || (run.samples.length === this.drawn.count && last.t === this.drawn.t)) return;
    if (now - this.drawn.at < REDRAW && !Number.isFinite(run.duration) && this.drawn.count >= 0) return;
    this.root.classList.add('flew');
    this.drawn = { count: run.samples.length, at: now, t: last.t };
    TRACES.forEach((trace, i) => this.lines[i]?.setAttribute('points', points(run.samples, trace.of, this.duration, this.tops[i]!)));
  }

  constructor(root: HTMLElement, clock: Clock, flight: SitedFlight) {
    this.root = root;
    this.clock = clock;
    this.flight = flight;
    if (!flight.trajectory && !flight.orbital?.ascent) return;
    root.innerHTML = '<p class="fine flown-wait">Flying it…</p>';
    // a fifteen-minute flight is integrated in a tenth of a second, but not in the middle of the page opening
    setTimeout(() => this.build(), 300);
  }

  /** How long the flown flight lasts, seconds: 0 until it has been flown. */
  get seconds(): number {
    return this.duration;
  }

  private build(): void {
    const { flight, root } = this;
    // a ballistic flight's run and checks (sim/fly.ts), or an orbital one's: the whole record flown (sim/staged.ts), and every
    // check its record sets, the ascent's, the coast's and the descent's, as one list
    let samples: Sample[];
    let rowsOf: { label: string; value: number; unit: string; tolerance: number; got: number }[];
    let checks: { id: string; value: number }[];
    if (flight.trajectory) {
      const flown = flownOnce(flight.trajectory, siteFrame(flight.site), flight.site.seaLevel.value);
      samples = flown.samples;
      this.duration = flown.results.duration;
      checks = flight.checks ?? [];
      rowsOf = (flight.checks ?? []).map((c) => ({ ...c, got: flown.results[c.id] }));
    } else {
      const run = orbitalRecord(flight);
      samples = run.samples as Sample[];
      this.duration = run.duration;
      const all = held(flight.orbital!, orbitalFlown(flight));
      rowsOf = all;
      checks = all.map((c) => ({ id: c.id, value: c.value }));
    }
    this.samples = samples;
    const x = (t: number) => (t / this.duration) * W;
    const traces = TRACES.map((trace) => {
      const top =
        Math.max(...samples.map(trace.of), ...trace.marks.map((m) => (checks.find((c) => c.id === m.id)?.value ?? 0) * m.scale)) * 1.08;
      this.tops.push(top);
      const y = (v: number) => H - (v / top) * H;
      const line = samples.map((s) => `${x(s.t).toFixed(1)},${y(trace.of(s)).toFixed(1)}`).join(' ');
      const marks = trace.marks
        .map((m) => checks.find((c) => c.id === m.id))
        .map((c, i) =>
          c
            ? `<line class="said" x1="0" x2="${W}" y1="${y(c.value * trace.marks[i]!.scale).toFixed(1)}" y2="${y(c.value * trace.marks[i]!.scale).toFixed(1)}" />`
            : '',
        )
        .join('');
      return `<figure class="trace"><figcaption><span>${trace.label}</span><b></b></figcaption>
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${trace.label} against time">${marks}<polyline points="${line}" /><polyline class="yours" points="" /><line class="now" y1="0" y2="${H}" /></svg></figure>`;
    }).join('');
    const rows = rowsOf
      .map((c) => {
        const got = c.got;
        if (got === undefined || !Number.isFinite(got)) return '';
        const off = got - c.value;
        const out = Math.abs(off) > c.tolerance;
        const by =
          c.unit === 's' || c.unit === 'deg' || c.unit === 'g'
            ? `${off >= 0 ? '+' : '−'}${Math.abs(off).toFixed(1)} ${c.unit}`
            : `${off >= 0 ? '+' : '−'}${Math.abs((off / c.value) * 100).toFixed(1)} %`;
        return `<tr${out ? ' class="out"' : ''}><th>${c.label}</th><td>${shown(c, c.value)}</td><td>${shown(c, got)}</td><td>${by}</td></tr>`;
      })
      .join('');
    root.innerHTML = `
      <h2>Flown</h2>
      <p class="fine">The flight as the simulator integrates it from the figures in the record: thrust, flow, drag, gravity, the tilt programme. Nothing is fitted to the result.
        Dashed lines are what the reports give. <span class="flown-yours">The amber trace is the flight you flew by hand.</span> <span class="flown-phase"></span></p>
      <div class="traces" title="Drag to move the clock">${traces}</div>
      <table class="flown-checks"><thead><tr><th></th><td>Report</td><td>Flown</td><td></td></tr></thead>${rows}</table>
      <p class="fine">Amber rows are outside the tolerance set for them. ${flight.flownNote ?? ''} In the view the vehicle flies this run from liftoff to landing; C to the chase camera follows it.</p>`;
    this.cursors = [...root.querySelectorAll<SVGLineElement>('line.now')];
    this.lines = [...root.querySelectorAll<SVGPolylineElement>('polyline.yours')];
    root.classList.toggle('flew', this.live !== null && this.live.samples.length > 1);
    this.values = [...root.querySelectorAll<HTMLElement>('.trace b')];
    this.phase = root.querySelector('.flown-phase');
    // dragging along the traces is a scrub over the flight: it takes hold of the clock
    const traceBox = root.querySelector<HTMLElement>('.traces')!;
    const seek = (e: PointerEvent) => {
      const svg = (e.target as Element).closest('.trace')?.querySelector('svg') ?? traceBox.querySelector('svg')!;
      const box = svg.getBoundingClientRect();
      this.clock.pause();
      this.clock.seek(Math.max(0, Math.min(1, (e.clientX - box.left) / box.width)) * this.duration);
    };
    traceBox.addEventListener('pointerdown', (e) => {
      traceBox.setPointerCapture(e.pointerId);
      seek(e);
    });
    traceBox.addEventListener('pointermove', (e) => {
      if (traceBox.hasPointerCapture(e.pointerId)) seek(e);
    });
    this.clock.listen(() => this.render());
    this.render();
  }

  private render(): void {
    if (!this.samples.length) return;
    this.trace();
    const t = this.clock.t;
    const inFlight = t >= 0 && t <= this.duration;
    const s = sampleAt(this.samples, Math.max(0, Math.min(this.duration, t)));
    const at = String(((s.t / this.duration) * W).toFixed(1));
    this.cursors.forEach((c) => {
      c.setAttribute('x1', at);
      c.setAttribute('x2', at);
      c.style.visibility = inFlight ? 'visible' : 'hidden';
    });
    TRACES.forEach((trace, i) => {
      const text = `${trace.of(s).toFixed(trace.digits)} ${trace.unit}`;
      const el = this.values[i];
      if (el && el.textContent !== text) el.textContent = text;
    });
    const said = t < 0 ? 'Before liftoff.' : t > this.duration ? 'Down.' : `Now: ${PHASES[s.phase]}.`;
    if (this.phase && this.phase.textContent !== said) this.phase.textContent = said;
  }
}

const PHASES: Record<Sample['phase'], string> = {
  powered: 'under power',
  coast: 'coasting on the booster',
  escape: 'on the escape rocket',
  capsule: 'capsule in free flight',
  entry: 'entry',
  drogue: 'on the drogue',
  main: 'on the main parachute',
  landed: 'down',
};

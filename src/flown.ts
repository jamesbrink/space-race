import './time.css';
import { fly, type Sample, sampleAt } from './sim/fly.ts';
import type { Flight, FlightCheck } from './types';
import { type Clock, missionTime } from './world/clock.ts';
import { siteFrame } from './world/frames.ts';

/**
 * The flight as the simulator flies it (sim/fly.ts), beside what the reports say happened: four
 * traces against time with the clock's instant marked on them, the figures at that instant, and
 * a table of the documented results with the simulator's and how far apart they are. It is a
 * readout, not a picture: the vehicle in the view stays on its pad until the scene can follow it
 * to 187 km, and says so.
 *
 * Dragging along a trace moves the clock, as the time bar's scrub does.
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

/** How a check's value reads: in the units people use for it, whatever SI unit it is recorded in. */
function shown(c: FlightCheck, value: number): string {
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
  private readonly flight: Flight;
  private samples: Sample[] = [];
  private duration = 0;
  private cursors: SVGLineElement[] = [];
  private values: HTMLElement[] = [];
  private phase: HTMLElement | null = null;

  constructor(root: HTMLElement, clock: Clock, flight: Flight) {
    this.root = root;
    this.clock = clock;
    this.flight = flight;
    if (!flight.trajectory) return;
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
    const { samples, results } = fly(flight.trajectory!, siteFrame(flight.site), flight.site.seaLevel.value);
    this.samples = samples;
    this.duration = results.duration;
    const x = (t: number) => (t / results.duration) * W;
    const checks = flight.checks ?? [];
    const traces = TRACES.map((trace) => {
      const top =
        Math.max(...samples.map(trace.of), ...trace.marks.map((m) => (checks.find((c) => c.id === m.id)?.value ?? 0) * m.scale)) * 1.08;
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
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${trace.label} against time">${marks}<polyline points="${line}" /><line class="now" y1="0" y2="${H}" /></svg></figure>`;
    }).join('');
    const rows = checks
      .map((c) => {
        const got = (results as unknown as Record<string, number>)[c.id];
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
        Dashed lines are what the reports give. <span class="flown-phase"></span></p>
      <div class="traces" title="Drag to move the clock">${traces}</div>
      <table class="flown-checks"><thead><tr><th></th><td>Report</td><td>Flown</td><td></td></tr></thead>${rows}</table>
      <p class="fine">Amber rows are outside the tolerance set for them. The powered flight ends 4 % too fast, and what follows from that is high and long:
        leaving the pad at 1.19 g, one per cent in thrust or weight is four in speed, and the engine is two figures from a summary table. Flown from the separation the
        report gives, the capsule’s half agrees: height and range within a per cent, the landing within a second (tests/sim.test.mjs). In the view the vehicle stays on its pad: it is flown here in numbers until the scene can follow it to 187 km.</p>`;
    this.cursors = [...root.querySelectorAll<SVGLineElement>('line.now')];
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
  capsule: 'capsule in free flight',
  entry: 'entry',
  drogue: 'on the drogue',
  main: 'on the main parachute',
  landed: 'down',
};

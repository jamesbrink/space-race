import { downOf } from '../../sim/descent.ts';
import { crewWords, decay } from '../../sim/orbital.ts';
import { orbitalFlown } from '../../sim/run.ts';
import { type FlownWhole, held } from '../../sim/staged.ts';
import { downVerdict, ejectedVerdict, landsOf } from '../../sim/verdict.ts';
import { EARTH_SPHERE } from '../../world/bodies.ts';
import { DEG } from '../../world/frames.ts';
import type { OrbitDeck } from '../orbitdeck.ts';
import { burnByHand } from './burn.ts';
import { KM } from './phase.ts';

/**
 * Down (phase.ts `surface`): the end of the flight and the card that holds it against the record's (`card`, `outcome`,
 * `over`, `apart`), and the wall clock the deck tells its times by (`wall`). Functions of the deck's state (orbitdeck.ts),
 * each what was a method of it.
 */

/** The months, for a time on another day than the launch's ('10:18:00 on 7 August'). */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** A latitude or longitude as a place is written: degrees and the side of the equator or the meridian it is on. */
const degrees = (x: number, plus: string, minus: string): string => `${Math.abs(x).toFixed(2)}° ${x < 0 ? minus : plus}`;

/**
 * Down: the card of the flight against the record's, as the ballistic deck's is. The figures are the run's own (sim/staged.ts
 * `held`), whoever flew it: the coast's and the descent's; and the ascent's too when the ascent was the user's.
 */
export function card(deck: OrbitDeck, t: number): void {
  const el = deck.root.querySelector<HTMLElement>('.cockpit-card')!;
  if (deck.ejected) return void ejectedCard(deck, el, t);
  if (deck.padImpact) {
    const hit = deck.padImpact;
    el.hidden = t < hit.t;
    const key = `pad-impact-${hit.t}`;
    if (el.dataset.at !== key) {
      el.dataset.at = key;
      el.innerHTML = `<h3>Launch structure strike</h3><p class="cockpit-why">${hit.name} · T+${hit.t.toFixed(2)} s · ${hit.speed.toFixed(1)} m/s. The escape ended at contact.</p>
        <p><button data-do="again"><kbd>N</kbd> Fly it again</button><button data-do="leave"><kbd>Esc</kbd> Leave</button></p>`;
    }
    return;
  }
  const whole = deck.flown ?? orbitalFlown(deck.flight);
  const down = landed(whole);
  // (the run on show follows the descent module down; the pilot lands under his canopy some minutes after it)
  const crashed = deck.state?.landed && t >= deck.state.landed.t;
  const broke = deck.state?.broke && t >= deck.state.broke.t - 1e-9 ? deck.state.broke : null;
  // (a flight that does not come down: its coast flown six hours on, still up)
  const stays = !whole.down && whole.coast.samples[whole.coast.samples.length - 1]!.phase !== 'down';
  // (and the card waits until the last of them is down)
  const over = deck.run !== null && (Boolean(crashed) || broke !== null || ((down !== undefined || stays) && t >= overAt(deck)));
  const key = `${deck.flownAt}|${deck.mine}|${crashed}|${broke?.t}`;
  if (el.hidden === !over && el.dataset.at === key) return;
  el.hidden = !over;
  el.dataset.at = key;
  if (!over) return;
  const record = deck.recordPlan.record!;
  const buttons = '<p><button data-do="again"><kbd>N</kbd> Fly it again</button><button data-do="leave"><kbd>Esc</kbd> Leave</button></p>';
  // (an abort whose seat was to wait for the falling stack to come down through its height, and the stack ended first)
  const waited = deck.aborted?.mode.escape?.eject?.falling;
  const unwaited = deck.aborted && waited ? `Aborted at T+${deck.aborted.t.toFixed(0)} s: by the record, ${deck.aborted.mode.does}.` : '';
  if (broke) {
    // what the record says its escape would have done at that instant (`ascent.aborts`): said, not flown
    const abort = record.aborts?.find((x) => broke.t < x.until.value);
    el.innerHTML = `<h3>Broke up on the launch vehicle</h3><p class="cockpit-why"><b>${broke.text}.</b></p>${
      unwaited
        ? `<p class="cockpit-why">${unwaited} It broke up before it came down through ${(waited!.value / KM).toFixed(0)} km, where the seat was to take the pilot out: what comes through a breakup is not modelled, and the flight ends there.</p>`
        : abort
          ? `<p class="cockpit-why">What the spacecraft’s escape did at that time, by the record: ${abort.does}. Not flown here: the flight ends at the breakup.</p>`
          : ''
    }<p class="cockpit-why">Not the flight of ${deck.day}.</p>${buttons}`;
    return;
  }
  if (crashed) {
    el.innerHTML = `<h3>Down, on the launch vehicle</h3><p class="cockpit-why">${
      unwaited
        ? `${unwaited} It never came down through ${(waited!.value / KM).toFixed(0)} km falling, where the seat was to fire: it came down`
        : 'Your flight never parted the spacecraft from its launch vehicle: it came down with it'
    } at ${deck.state!.landed!.speed.toFixed(0)} m/s, ${(deck.sampleAt(t).range / KM).toFixed(0)} km from the pad. Not survivable.</p>${buttons}`;
    return;
  }
  // how it ended for him, in the record's terms (sim/verdict.ts downVerdict), and how long an orbit that stays up lasts
  const plan = deck.flownPlan ?? deck.recordPlan;
  let decayed: number | undefined;
  if (stays && !record.bound) {
    if (deck.lasts?.of !== whole)
      deck.lasts = {
        of: whole,
        s: decay(plan, deck.frame, deck.flight.site.seaLevel.value, whole.coast.samples[whole.coast.samples.length - 1]!),
      };
    decayed = deck.lasts.s;
  }
  const v = downVerdict(
    plan,
    whole,
    (at) => wall(deck, at),
    (at) => apart(deck, at),
    decayed,
  );
  // (in the words the flight's data gives for whoever rode it: sim/orbital.ts `crewWords`)
  const { who, many } = crewWords(plan.craft[0]!.crew);
  const lives =
    stays || v.survivable === null
      ? ''
      : v.survivable
        ? ` ${who} ${many ? 'live' : 'lives'}, by the limits taken.`
        : ` ${who} ${many ? 'do' : 'does'} not live, by the limits taken.`;
  // the record's own landings: each body's time (its check) and the place the record gives
  const when = (id: string) => plan.checks.find((c) => c.of === 'descent' && c.id === `${id}.at`);
  const landing = record.landing;
  const { on } = landsOf(plan);
  const landings = [
    ...(downOf(plan)?.bodies.slice(0, 2) ?? []).flatMap((b) => {
      const c = when(b.id);
      return c ? [`${c.label} at ${wall(deck, c.value)}`] : [];
    }),
    // (the place in the record's words, in the sea or near a place on land as the flight's data says: verdict.ts `landsOf`)
    // (a flight the run does not bring down, a target or one bound for the Moon, has no landing of the record's to set beside it)
    ...(landing
      ? [
          `the landing${landing.near ? ` ${on === 'sea' ? 'in' : on === 'land' ? 'near' : 'at'} ${landing.near}` : ''}, ${degrees(landing.latitude.value, 'N', 'S')} ${degrees(landing.longitude.value, 'E', 'W')}${on === 'sea' || !record.ground ? '' : `, ${record.ground.value.toFixed(0)} m above the sea`}`,
        ]
      : []),
  ].join('; ');
  const show = (unit: string, x: number) =>
    unit === 'm' ? `${(x / 1000).toFixed(1)} km` : unit === 's' ? wall(deck, x) : `${x.toFixed(unit === 'deg' ? 2 : 1)} ${unit}`;
  // (a figure is held together, a figure and its unit, a day and its month: a time that carries its date may break before
  // its "on" only, so the two columns fit the card at any width: cockpit.css)
  const cell = (x: string) => x.replace(/ /g, '\u00a0').replace('\u00a0on\u00a0', ' on\u00a0');
  // (the coast's and the descent's: what a pilot's hand can change; the ascent's too, on a flight that was the user's going up)
  const rows = held(deck.recordPlan, whole)
    .slice(deck.mine !== null ? 0 : deck.ascentChecks)
    .filter((c) => Number.isFinite(c.got) && c.id !== 'period' && !(stays && c.got === 0))
    .map(
      (c) =>
        `<tr${Math.abs(c.got - c.value) > c.tolerance ? ' class="out"' : ''}><th>${c.label}</th><td>${cell(show(c.unit, c.got))}</td><td>${cell(show(c.unit, c.value))}</td></tr>`,
    )
    .join('');
  const mine = deck.mine !== null || deck.fired !== null || deck.downMine !== null || deck.free;
  el.innerHTML = `
    <h3>${stays ? (record.bound ? `On its way to ${record.bound.for}` : 'Still in orbit') : deck.mine !== null ? 'Down, on your own flight' : deck.downMine !== null ? 'Down, on your own descent' : deck.fired !== null ? 'Down, by your own braking burn' : burnByHand(deck) ? 'Down, as flown on the day: the braking burn by hand' : 'Down, as the automatic system flew it'}</h3>
    <p class="cockpit-why"><b>${v.how}.</b>${lives}${mine ? ` Not the flight of ${deck.day}.` : ''}</p>
    <p class="cockpit-why">${v.why.join(' ')}</p>
    ${deck.impactSummary()}
    ${v.against ? `<p class="cockpit-why">${v.against}</p>` : ''}
    ${landings ? `<p class="cockpit-why">${deck.flight.callsign} as recorded: ${landings}.</p>` : ''}
    ${
      rows
        ? `<table class="dated">
      <thead><tr><td></td><td>You</td><td>${deck.flight.callsign}</td></tr></thead>
      ${rows}
    </table>
    <p class="cockpit-why">Amber rows are outside the tolerance the record sets. The flight as recorded misses several of them itself (the Flown panel, and the flight’s mission.md, say why).</p>`
        : ''
    }
    ${buttons}`;
}

/**
 * The card after an abort's ejection from the launch vehicle, once the crew and the stack are both done: how it ended for
 * them by the limits taken (sim/verdict.ts `ejectedVerdict`), the escape the record has for that instant, and what became
 * of the stack.
 */
export function ejectedCard(deck: OrbitDeck, el: HTMLElement, t: number): void {
  const out = deck.ejected!;
  const s = deck.state!;
  const over = t >= overAt(deck);
  const key = `ejected|${out.at}|${s.landed?.t}|${s.broke?.t}|${s.parted?.t}`;
  if (el.hidden === !over && el.dataset.at === key) return;
  el.hidden = !over;
  el.dataset.at = key;
  if (!over) return;
  const plan = deck.recordPlan;
  const pad = deck.flight.site;
  const v = ejectedVerdict(
    plan,
    out.down,
    (at) => wall(deck, at),
    (at) => apart(deck, at, { latitude: { value: pad.latitude.value }, longitude: { value: pad.longitude.value } }),
  )!;
  const { who, many } = crewWords(plan.craft[0]!.crew);
  const lives =
    v.survivable === null
      ? ''
      : ` ${who} ${v.survivable ? (many ? 'live' : 'lives') : many ? 'do not live' : 'does not live'}, by the limits taken.`;
  const at = (x: number) => `T+${x.toFixed(0)} s`;
  const stack = s.broke
    ? `The launch vehicle broke up at ${at(s.broke.t)}: ${s.broke.text}.`
    : s.landed
      ? `The launch vehicle came back to the ground at ${at(s.landed.t)}, ${s.landed.speed.toFixed(0)} m/s, the empty ship on it.`
      : s.parted
        ? `The launch vehicle flew on and let the empty ship go at ${at(s.parted.t)}: not followed further.`
        : '';
  const buttons = '<p><button data-do="again"><kbd>N</kbd> Fly it again</button><button data-do="leave"><kbd>Esc</kbd> Leave</button></p>';
  el.innerHTML = `
    <h3>Ejected from the launch vehicle</h3>
    <p class="cockpit-why"><b>${v.how}.</b>${lives} Not the flight of ${deck.day}.</p>
    <p class="cockpit-why">Aborted at ${at(deck.aborted!.t)}: by the record, ${deck.aborted!.mode.does}. Out on the seat at ${at(out.at)}.</p>
    <p class="cockpit-why">${v.why.join(' ')}</p>
    ${deck.impactSummary()}
    ${stack ? `<p class="cockpit-why">${stack}</p>` : ''}
    <p class="cockpit-why">Not modelled: the seat’s way out through the fairing’s opening (thrown here against its motion through the air, as from the falling ball), and what the stack did to anyone near it.</p>
    <p class="cockpit-why">${v.against}</p>
    ${buttons}`;
}

/** What came of a burn by hand: where the pilot came down against the record's landing, or that it stays up. */
export function outcome(deck: OrbitDeck, t: number): string {
  if (deck.padImpact && t >= deck.padImpact.t) return 'Escape ended in a strike on the launch structure';
  const pilot = landed(deck.flown);
  if (!pilot) return 'Still in orbit: it comes down only as the orbit decays, on ten days of supplies';
  if (!deck.run || t < deck.run.duration) return deck.fired !== null ? 'Fired: what follows is flown from your burn' : 'Coming down';
  return `Down at ${pilot.latitude.toFixed(2)}° N ${pilot.longitude.toFixed(2)}° E, ${apart(deck, pilot).toFixed(0)} km from where the record has the landing, at ${pilot.speed.toFixed(1)} m/s`;
}

export function landed(whole: FlownWhole | null) {
  const down = whole?.down;
  return down ? (down.landed.pilot ?? Object.values(down.landed)[0]) : undefined;
}

/** How far a landing is from the record's, km. */
/** When the flight on show is over: the last body of its descent on the ground (the pilot, minutes after the module), or the run's own end. */
export function overAt(deck: OrbitDeck): number {
  const run = deck.run;
  if (!run) return Infinity;
  const whole = deck.flown ?? (deck.mine === null && deck.fired === null ? orbitalFlown(deck.flight) : null);
  // (or the crew ejected from the launch vehicle, and the stack: the later of their ends)
  const landings = Object.values((deck.ejected ?? whole)?.down?.landed ?? {}).map((l) => l.at);
  return Math.max(run.duration, run.afloat?.samples.at(-1)?.t ?? 0, ...landings);
}

export function apart(
  deck: OrbitDeck,
  at: { latitude: number; longitude: number },
  landing: { latitude: { value: number }; longitude: { value: number } } = deck.recordPlan.record!.landing!,
): number {
  const [la, lo] = [landing.latitude.value * DEG, landing.longitude.value * DEG];
  const [pa, po] = [at.latitude * DEG, at.longitude * DEG];
  return (EARTH_SPHERE / KM) * Math.acos(Math.min(1, Math.sin(la) * Math.sin(pa) + Math.cos(la) * Math.cos(pa) * Math.cos(po - lo)));
}

/** A time of the flight as a clock on the wall read it that day. */
export function wall(deck: OrbitDeck, at: number): string {
  // (an instant that never comes: a target's braking burn, which it has none of)
  if (!Number.isFinite(at)) return 'never';
  const local = (t: number) => new Date(Date.parse(deck.flight.launch) + t * 1000 + deck.flight.site.zone.utcOffset * 3600_000);
  const when = local(at);
  // (on a flight that runs past midnight, a time on another day than the launch's says which)
  const day =
    when.toISOString().slice(0, 10) === local(0).toISOString().slice(0, 10) ? '' : ` on ${when.getUTCDate()} ${MONTHS[when.getUTCMonth()]}`;
  return when.toISOString().slice(11, 19) + day;
}

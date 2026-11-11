/**
 * A sequence joins a slider to the clock. A model's slider (0 to 1) lays a run of events out so
 * that each can be seen: two hours of waiting and fourteen seconds of a boom falling each get a
 * stretch of it. The clock runs in seconds. Keyframes say which instant is which place on the
 * slider, and between them both run evenly, so there is one notion of when: the clock's, seen
 * through the hardware.
 *
 * Keyframes are in order of time and the slider never goes backwards. It may stand still (two
 * keyframes with the same slider value: nothing moves while the clock runs on), and before the
 * first keyframe and after the last it stays at their values.
 */
export interface Key {
  /** Seconds from the clock's epoch (the launch): negative before it. */
  at: number;
  /** Where the slider is then, 0 to 1. */
  slider: number;
}

/** Where the slider is at an instant. */
export function sliderAt(sequence: readonly Key[], t: number): number {
  const first = sequence[0];
  const last = sequence[sequence.length - 1];
  if (!first || !last) return 0;
  if (t <= first.at) return first.slider;
  if (t >= last.at) return last.slider;
  for (let i = 1; i < sequence.length; i++) {
    const a = sequence[i - 1]!;
    const b = sequence[i]!;
    if (t <= b.at) return b.at === a.at ? b.slider : a.slider + ((b.slider - a.slider) * (t - a.at)) / (b.at - a.at);
  }
  return last.slider;
}

/**
 * The instant at which the slider reads `slider`. Where the slider stands still over a stretch
 * of time, it is the start of that stretch: the moment the hardware came to rest there.
 */
export function timeAt(sequence: readonly Key[], slider: number): number {
  const first = sequence[0];
  const last = sequence[sequence.length - 1];
  if (!first || !last) return 0;
  if (slider <= first.slider) return first.at;
  for (let i = 1; i < sequence.length; i++) {
    const a = sequence[i - 1]!;
    const b = sequence[i]!;
    if (slider <= b.slider) return b.slider === a.slider ? a.at : a.at + ((b.at - a.at) * (slider - a.slider)) / (b.slider - a.slider);
  }
  return last.at;
}

/** What is wrong with a sequence, as sentences; none if it is sound. For the flights' test. */
export function faults(sequence: readonly Key[]): string[] {
  const out: string[] = [];
  if (sequence.length < 2) out.push('a sequence needs at least two keyframes');
  sequence.forEach((k, i) => {
    if (!(k.slider >= 0 && k.slider <= 1)) out.push(`keyframe ${i}: slider ${k.slider} is not between 0 and 1`);
    if (!Number.isFinite(k.at)) out.push(`keyframe ${i}: no time`);
    const before = sequence[i - 1];
    if (before && k.at < before.at) out.push(`keyframe ${i}: earlier than the one before it`);
    if (before && k.slider < before.slider) out.push(`keyframe ${i}: the slider goes backwards`);
  });
  return out;
}

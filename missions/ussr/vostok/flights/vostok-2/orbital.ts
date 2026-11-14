/** Seconds from liftoff, 09:00:00 Moscow time on 6 August 1961, of a Moscow time that day (h) or, past midnight, on the 7th (h + 24). */
export const MSK = (h: number, min: number, s = 0): number => (h - 9) * 3600 + min * 60 + s;

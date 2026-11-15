/** What the page is being run by and asked for, beyond its address's own names. */

/**
 * A script is driving the page (a browser test, a screenshot: `navigator.webdriver`), and has not asked, by naming
 * `unless` in the query (`?demo`, `?hint`), to be shown what a person would be.
 */
export const scripted = (unless?: string): boolean => navigator.webdriver && !(unless !== undefined && location.search.includes(unless));

/** The visitor has asked for less motion. */
export const reducedMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Nobody is there to be shown anything that plays by itself: a script that has not asked for the show, or less motion asked for. */
export const unattended = (): boolean => scripted('demo') || reducedMotion();

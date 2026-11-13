/**
 * The flights to come: those of the first ten crewed spaceflights that are not built yet, as the front page lists
 * them between the ones that are. One is dropped from the page the day a flight with its `id` is in `index.ts`, so
 * nothing here has to be taken out by hand; the next ones are added as they are decided on.
 *
 * These are placeholders, not records: the names, pilots and dates are the programmes' own tables
 * (usa/mercury/README.md, ussr/vostok/README.md), which say they are set down from general knowledge and are checked
 * against sources only when each flight is built. A date is a day, in UTC, and no more.
 */
export interface Upcoming {
  /** The id the flight will have: <nation>/<programme>/<flight>. */
  id: string;
  nation: string;
  /** What the page calls it, and the line under that (the mission's designation where the name is the spacecraft's, and the pilot). */
  name: string;
  line: string;
  /** The day of launch, ISO 8601 (a date only). */
  launch: string;
}

export const upcoming: Upcoming[] = [
  { id: 'ussr/vostok/vostok-2', nation: 'USSR', name: 'Vostok 2', line: 'Gherman Titov', launch: '1961-08-06' },
  { id: 'usa/mercury/ma-6-friendship-7', nation: 'USA', name: 'Friendship 7', line: 'Mercury-Atlas 6 · John Glenn', launch: '1962-02-20' },
  { id: 'usa/mercury/ma-7-aurora-7', nation: 'USA', name: 'Aurora 7', line: 'Mercury-Atlas 7 · Scott Carpenter', launch: '1962-05-24' },
  { id: 'ussr/vostok/vostok-3', nation: 'USSR', name: 'Vostok 3', line: 'Andriyan Nikolayev', launch: '1962-08-11' },
  { id: 'ussr/vostok/vostok-4', nation: 'USSR', name: 'Vostok 4', line: 'Pavel Popovich', launch: '1962-08-12' },
  { id: 'usa/mercury/ma-8-sigma-7', nation: 'USA', name: 'Sigma 7', line: 'Mercury-Atlas 8 · Wally Schirra', launch: '1962-10-03' },
  { id: 'usa/mercury/ma-9-faith-7', nation: 'USA', name: 'Faith 7', line: 'Mercury-Atlas 9 · Gordon Cooper', launch: '1963-05-15' },
];

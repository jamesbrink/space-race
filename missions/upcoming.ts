/**
 * The flights to come, in the order they flew: the rest of Gemini, then Apollo and Soyuz to the end of 1972, as the front
 * page lists them between the ones that are built. One is dropped from the page the day a flight with its `id` is in
 * `index.ts`, so nothing here has to be taken out by hand; the next ones are added as they are decided on.
 *
 * These are placeholders, not records: the names, crews and dates are set down from general knowledge and checked
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
  {
    id: 'usa/gemini/gt-10',
    nation: 'USA',
    name: 'Gemini 10',
    line: 'Gemini-Titan 10 · John Young · Michael Collins',
    launch: '1966-07-18',
  },
  { id: 'usa/gemini/gt-11', nation: 'USA', name: 'Gemini 11', line: 'Gemini-Titan 11 · Pete Conrad · Dick Gordon', launch: '1966-09-12' },
  { id: 'usa/gemini/gt-12', nation: 'USA', name: 'Gemini 12', line: 'Gemini-Titan 12 · Jim Lovell · Buzz Aldrin', launch: '1966-11-11' },
  { id: 'ussr/soyuz/soyuz-1', nation: 'USSR', name: 'Soyuz 1', line: 'Vladimir Komarov', launch: '1967-04-23' },
  {
    id: 'usa/apollo/apollo-7',
    nation: 'USA',
    name: 'Apollo 7',
    line: 'Wally Schirra · Donn Eisele · Walter Cunningham',
    launch: '1968-10-11',
  },
  { id: 'ussr/soyuz/soyuz-3', nation: 'USSR', name: 'Soyuz 3', line: 'Georgy Beregovoy', launch: '1968-10-26' },
  { id: 'usa/apollo/apollo-8', nation: 'USA', name: 'Apollo 8', line: 'Frank Borman · Jim Lovell · Bill Anders', launch: '1968-12-21' },
  { id: 'ussr/soyuz/soyuz-4', nation: 'USSR', name: 'Soyuz 4', line: 'Vladimir Shatalov', launch: '1969-01-14' },
  {
    id: 'ussr/soyuz/soyuz-5',
    nation: 'USSR',
    name: 'Soyuz 5',
    line: 'Boris Volynov · Alexei Yeliseyev · Yevgeny Khrunov',
    launch: '1969-01-15',
  },
  {
    id: 'usa/apollo/apollo-9',
    nation: 'USA',
    name: 'Apollo 9',
    line: 'Jim McDivitt · David Scott · Rusty Schweickart',
    launch: '1969-03-03',
  },
  { id: 'usa/apollo/apollo-10', nation: 'USA', name: 'Apollo 10', line: 'Tom Stafford · John Young · Gene Cernan', launch: '1969-05-18' },
  {
    id: 'usa/apollo/apollo-11',
    nation: 'USA',
    name: 'Apollo 11',
    line: 'Neil Armstrong · Michael Collins · Buzz Aldrin',
    launch: '1969-07-16',
  },
  { id: 'ussr/soyuz/soyuz-6', nation: 'USSR', name: 'Soyuz 6', line: 'Georgy Shonin · Valery Kubasov', launch: '1969-10-11' },
  {
    id: 'ussr/soyuz/soyuz-7',
    nation: 'USSR',
    name: 'Soyuz 7',
    line: 'Anatoly Filipchenko · Vladislav Volkov · Viktor Gorbatko',
    launch: '1969-10-12',
  },
  { id: 'ussr/soyuz/soyuz-8', nation: 'USSR', name: 'Soyuz 8', line: 'Vladimir Shatalov · Alexei Yeliseyev', launch: '1969-10-13' },
  { id: 'ussr/soyuz/soyuz-9', nation: 'USSR', name: 'Soyuz 9', line: 'Andriyan Nikolayev · Vitaly Sevastyanov', launch: '1970-06-01' },
  {
    id: 'ussr/soyuz/soyuz-10',
    nation: 'USSR',
    name: 'Soyuz 10',
    line: 'Vladimir Shatalov · Alexei Yeliseyev · Nikolai Rukavishnikov',
    launch: '1971-04-22',
  },
  {
    id: 'ussr/soyuz/soyuz-11',
    nation: 'USSR',
    name: 'Soyuz 11',
    line: 'Georgy Dobrovolsky · Vladislav Volkov · Viktor Patsayev',
    launch: '1971-06-06',
  },
  { id: 'usa/apollo/apollo-15', nation: 'USA', name: 'Apollo 15', line: 'David Scott · Alfred Worden · James Irwin', launch: '1971-07-26' },
  { id: 'usa/apollo/apollo-16', nation: 'USA', name: 'Apollo 16', line: 'John Young · Ken Mattingly · Charles Duke', launch: '1972-04-16' },
  {
    id: 'usa/apollo/apollo-17',
    nation: 'USA',
    name: 'Apollo 17',
    line: 'Gene Cernan · Ronald Evans · Harrison Schmitt',
    launch: '1972-12-07',
  },
];

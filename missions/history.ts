/**
 * The history the Lineup tells: the moments of the Space Race on a timeline, what each flight was for, why each ship
 * has its name, the people who flew them and the programmes they flew in. A flight's figures are its own (flight.ts);
 * nothing here is a number the simulator reads. Every entry names where it is from; docs/sources.md has the books.
 */
import type { Confidence } from '../src/measure.ts';
import { targetLaunches } from './usa/gemini/vehicles/target-launches.ts';

/** One moment of the Space Race, on the timeline. */
export interface Milestone {
  /** UTC: 'YYYY-MM-DD', or a full ISO instant where the source gives the time. */
  date: string;
  /** The flight it belongs to: an id from missions/index.ts or missions/upcoming.ts; absent for an event that was no crewed flight (Sputnik 1, a speech). */
  flight?: string;
  nation: 'USA' | 'USSR';
  /** A first or a turning point, in a few words: "First person in space". */
  title: string;
  /** One or two sentences: what happened and why it mattered. */
  text: string;
  /** Where it is from: document, author, year, page or section. */
  source: string;
  confidence: Confidence;
}

/** What the Lineup's card says about one flight beyond its own data (its figures come from flight.ts, never from here). */
export interface FlightStory {
  flight: string;
  /** One line under the name: what this flight was for. */
  headline: string;
  /** Two to four sentences: why it flew, what it proved, what went wrong or nearly did, what it led to. */
  story: string;
  /** Its firsts, each a few words (the same wording as its Milestone titles). */
  firsts: string[];
  source: string;
  /** Why the ship has its name (or why it has none). */
  named?: { why: string; source: string; confidence: Confidence };
}

/** Someone who flew one of the flights. */
export interface Person {
  /** A short slug: 'gagarin', 'grissom'. */
  id: string;
  /** As the flights' `crew` gives it. */
  name: string;
  /** The name in its own script, where that is not the Latin alphabet: 'Юрий Алексеевич Гагарин'. */
  native?: string;
  /** 'YYYY-MM-DD'. */
  born: string;
  /** 'YYYY-MM-DD'; absent while they live. */
  died?: string;
  nation: 'USA' | 'USSR';
  /** The ids of the flights they flew, from missions/index.ts or missions/upcoming.ts, in the order flown. */
  flights: string[];
  /** Three to six sentences: who they were before, what they did, what came after. */
  bio: string;
  source: string;
  confidence: Confidence;
}

/** A programme: the flights of one kind of ship. */
export interface Programme {
  /** The flights' id prefix, as missions/<nation>/<programme>: 'usa/mercury'. */
  id: string;
  name: string;
  nation: 'USA' | 'USSR';
  /** Its crewed flights' years, for display: '1961–1963'. */
  years: string;
  /** Why it was started, and by whom. */
  why: string;
  /** The hardware and the plan, in brief. */
  how: string;
  /** What it led to. */
  legacy: string;
  source: string;
}

// The books most entries rest on (docs/sources.md). Pages are the printed pages.
const TNO = 'Swenson, Grimwood and Alexander, This New Ocean: A History of Project Mercury, NASA SP-4201 (1966)';
const TITANS = 'Hacker and Grimwood, On the Shoulders of Titans: A History of Project Gemini, NASA SP-4203 (1977)';
const FACT_BOOK = 'NASA, Astronaut Fact Book (Johnson Space Center, updated January 2023)';
const JSC_BIO = 'NASA Johnson Space Center, Biographical Data sheet';
const ABTN = 'Orloff, Apollo by the Numbers: A Statistical Reference, NASA SP-2000-4029 (2000)';
const CHARIOTS = 'Brooks, Grimwood and Swenson, Chariots for Apollo: A History of Manned Lunar Spacecraft, NASA SP-4205 (1979)';
const CALLSIGNS = `${ABTN}, “Call Signs”, p. 282 (after Lattimer, Astronaut Mission Patches and Spacecraft Callsigns)`;
const SIDDIQI = 'Siddiqi, Challenge to Apollo: The Soviet Union and the Space Race, 1945–1974, NASA SP-2000-4408 (2000)';
const BEYOND = 'Siddiqi, Beyond Earth: A Chronicle of Deep Space Exploration, 1958–2016, NASA SP-2018-4041 (2018)';
const LOG = `${SIDDIQI}, Table IA, “Orbital Launch Attempts in the Soviet Piloted Space Program”, p. 873`;
const CREWS = `${SIDDIQI}, Table II, “Cosmonaut Selection Groups, 1960–74”, pp. 881 to 885`;
const SPACEFACTS = 'Spacefacts (Joachim Becker), cosmonaut biography';
const SF_MISSION = 'Spacefacts (Joachim Becker), mission page';
const MSK = 'Moscow time less three hours';

export const MILESTONES: readonly Milestone[] = [
  {
    date: '1957-10-04T19:28:34Z',
    nation: 'USSR',
    title: 'First artificial satellite',
    text:
      'Sputnik went up from Tyuratam on an R-7, Korolev’s intercontinental missile. Nothing made by people had been in orbit ' +
      'before; overnight, in the world’s eyes, the Soviet Union went from a nation of old farm machinery to the one ahead.',
    source: `${SIDDIQI}, p. 167 (liftoff at 22:28:34 Moscow time; ${MSK}) and the Introduction`,
    confidence: 'derived',
  },
  {
    date: '1957-11-03T02:30:42Z',
    nation: 'USSR',
    title: 'First animal in orbit',
    text:
      'Sputnik 2 carried the dog Laika, chosen for her even temper, with no way home. The cabin overheated: Siddiqi, in 2000, ' +
      'has her dying on the fourth day; the account Dimitri Malashenkov gave in 2002 has her dead within hours of launch.',
    source:
      `${SIDDIQI}, pp. 173 and 174 (liftoff at 05:30:42 Moscow time; ${MSK}); Malashenkov, World Space Congress, ` +
      'Houston, October 2002, as reported (not read)',
    confidence: 'derived',
  },
  {
    date: '1958-02-01T03:48Z',
    nation: 'USA',
    title: 'First American satellite',
    text:
      'Explorer 1 went up on a Jupiter C from Cape Canaveral late on the evening of 31 January, local time. Its instruments, ' +
      'James Van Allen’s, found a deep zone of radiation girdling the Earth: the first discovery made in space.',
    source: `${TNO}, p. 29; NASA Science, “About Explorer 1” (10:48 p.m. EST, taken to UTC)`,
    confidence: 'derived',
  },
  {
    date: '1958-10-01',
    nation: 'USA',
    title: 'NASA opens',
    text:
      'Eisenhower signed the National Aeronautics and Space Act on 29 July 1958, and on 1 October the old NACA and its ' +
      'laboratories became the National Aeronautics and Space Administration, a civilian agency for the work in space.',
    source: `${TNO}, pp. 98 and 113`,
    confidence: 'documented',
  },
  {
    date: '1959-04-09',
    nation: 'USA',
    title: 'The Mercury Seven named',
    text:
      'At a press conference in Washington, NASA’s Administrator Keith Glennan introduced seven test pilots chosen from ' +
      '500 candidates: Carpenter, Cooper, Glenn, Grissom, Schirra, Shepard and Slayton. They were famous before any of them flew.',
    source: `${TNO}, p. 160; ${FACT_BOOK}, preface and section 3.0, Group 1`,
    confidence: 'documented',
  },
  {
    date: '1959-09-13T21:02:23Z',
    nation: 'USSR',
    title: 'First craft to reach the Moon',
    text:
      'The Second Soviet Space Rocket, called Luna 2 from 1963, struck the Moon near the crater Autolycus, carrying Soviet ' +
      'emblems: the first thing made by people to touch another world. Its magnetometer found no magnetic field to speak of.',
    source:
      `${BEYOND}, p. 13: 21:02:23 UT “on 14 September”, which was the date in Moscow; the UT date, from its launch at ` +
      '06:39:42 UT on 12 September, is the 13th',
    confidence: 'derived',
  },
  {
    date: '1959-10-07T03:30Z',
    nation: 'USSR',
    title: 'First sight of the Moon’s far side',
    text:
      'The Automatic Interplanetary Station, later Luna 3, swung round the Moon and took 29 pictures of the side no one had ' +
      'ever seen, developed the film on board and scanned it down to the Crimea.',
    source: `${BEYOND}, pp. 13 and 14`,
    confidence: 'documented',
  },
  {
    date: '1960-08-19T08:44:06.8Z',
    nation: 'USSR',
    title: 'First animals home from orbit',
    text:
      'Korabl-Sputnik 2, a Vostok without its pilot, carried the dogs Belka and Strelka through a day in orbit and back to ' +
      'the steppe: the first living things recovered from orbit, and the proof that the ship could bring a passenger home.',
    source: `${SIDDIQI}, p. 253; ${LOG} (liftoff at 11:44:06.8 Moscow time; ${MSK})`,
    confidence: 'derived',
  },
  {
    date: '1961-01-31',
    nation: 'USA',
    title: 'Ham rides a Mercury-Redstone',
    text:
      'A chimpanzee named Ham flew the capsule Shepard would fly. The Redstone flew high and fast, the cabin lost its pressure ' +
      'and he came down far beyond the ships, but alive. One more Redstone was flown without a man, on 24 March, before Shepard’s.',
    source: `${TNO}, pp. 314 to 316 and 324`,
    confidence: 'documented',
  },
  {
    date: '1961-03-25T05:54:00.4Z',
    nation: 'USSR',
    title: 'The last rehearsal',
    text:
      'Korabl-Sputnik 5 flew the single orbit planned for a man, with the dog Zvezdochka and a mannequin in a spacesuit in the ' +
      'seat. It came down in a snowstorm, and villagers had to be shown that the “man” under the parachute was a dummy. ' +
      'Gagarin flew eighteen days later.',
    source: `${SIDDIQI}, p. 267; ${LOG} (liftoff at 08:54:00.4 Moscow time; ${MSK})`,
    confidence: 'derived',
  },
  {
    date: '1961-04-12T06:06:59.7Z',
    flight: 'ussr/vostok/vostok-1',
    nation: 'USSR',
    title: 'First person in space and in orbit',
    text:
      'Yuri Gagarin went once round the Earth in Vostok and came down beside the Volga. He left the ship at about 7 km and ' +
      'landed by parachute; the rules for a record asked that a pilot land in his craft, and for ten years the Soviet Union ' +
      'said he had. The FAI ratified the record all the same.',
    source: `${SIDDIQI}, pp. 275 to 283 and the launch log; the flight’s README; FAI, “History of Manned Spaceflight: the pioneers”`,
    confidence: 'documented',
  },
  {
    date: '1961-05-05T14:34:13Z',
    flight: 'usa/mercury/mr-3-freedom-7',
    nation: 'USA',
    title: 'First American in space',
    text:
      'Alan Shepard rode Freedom 7 fifteen minutes up and down the Atlantic Missile Range, three weeks after Gagarin. It was not ' +
      'an orbit, but where Gagarin’s ship had flown itself, Shepard steered his capsule by hand in all three axes.',
    source: `Postlaunch Report for Mercury-Redstone No. 3 (NASA STG, 16 June 1961); ${TNO}, pp. 341 to 362`,
    confidence: 'documented',
  },
  {
    date: '1961-05-25',
    nation: 'USA',
    title: 'Kennedy sets the Moon as the goal',
    text:
      'Twenty days after Shepard’s flight, Kennedy asked Congress to commit the nation “to achieving the goal, before this decade ' +
      'is out, of landing a man on the moon and returning him safely to the earth.” Congress agreed, and Apollo became a landing.',
    source: `${TNO}, p. 362, quoting the Special Message to the Congress on Urgent National Needs, 25 May 1961`,
    confidence: 'documented',
  },
  {
    date: '1961-07-21T12:20:36Z',
    flight: 'usa/mercury/mr-4-liberty-bell-7',
    nation: 'USA',
    title: 'Liberty Bell 7 sinks',
    text:
      'Grissom’s flight went as Shepard’s had, but after splashdown the new explosive hatch went off before the helicopter had ' +
      'hold of the capsule. He swam out and was nearly drowned; the capsule sank in water some 15,000 feet deep.',
    source: `${TNO}, pp. 373 to 376`,
    confidence: 'documented',
  },
  {
    date: '1961-08-06T06:00:00Z',
    flight: 'ussr/vostok/vostok-2',
    nation: 'USSR',
    title: 'First full day in orbit',
    text:
      'Gherman Titov flew seventeen orbits and a day, ate, slept and turned the ship by hand. He was sick from the first ' +
      'orbit, and the next Soviet flight waited a year while the doctors studied what had happened to him.',
    source: `${SIDDIQI}, pp. 292, 293 and 359; ${LOG} (09:00 Moscow time; ${MSK})`,
    confidence: 'derived',
  },
  {
    date: '1961-11-29',
    nation: 'USA',
    title: 'Enos orbits on a Mercury-Atlas',
    text:
      'The chimpanzee Enos flew two orbits on MA-5 and came home working his levers. It was the rehearsal NASA wanted before ' +
      'it put a man on an Atlas, and it cleared the way for Glenn.',
    source: `${TNO}, pp. 400 to 406`,
    confidence: 'documented',
  },
  {
    date: '1962-02-20T14:47:39Z',
    flight: 'usa/mercury/ma-6-friendship-7',
    nation: 'USA',
    title: 'First American in orbit',
    text:
      'John Glenn went three times round the Earth in Friendship 7, ten months after Gagarin, flying most of it by hand. ' +
      'A false signal that his heat shield was loose kept the retropack strapped on for the entry.',
    source: `${TNO}, chapter 13, pp. 420 to 437; ${FACT_BOOK}, section 4.0`,
    confidence: 'documented',
  },
  {
    date: '1962-05-24T12:45:16Z',
    flight: 'usa/mercury/ma-7-aurora-7',
    nation: 'USA',
    title: 'Aurora 7 lands long',
    text:
      'Scott Carpenter’s three orbits were the first given over to science, and the fuel ran low. He fired the retrorockets by hand ' +
      'and late, and came down 250 nautical miles beyond the ships; for a while the country did not know whether he was alive.',
    source: `${TNO}, chapter 13, pp. 443 to 458; NASA TN D-3814`,
    confidence: 'documented',
  },
  {
    date: '1962-08-11T08:30:00Z',
    flight: 'ussr/vostok/vostok-3',
    nation: 'USSR',
    title: 'First to float free in his cabin',
    text:
      'Andriyan Nikolayev undid his straps and floated, four times in the flight for about an hour, and felt none of what ' +
      'Titov had felt.',
    source: `The flight’s README (missions/ussr/vostok/flights/vostok-3), from the State Commission’s record; ${LOG} (11:30 Moscow time; ${MSK})`,
    confidence: 'derived',
  },
  {
    date: '1962-08-11',
    flight: 'ussr/vostok/vostok-3',
    nation: 'USSR',
    title: 'First television broadcast from a crewed ship',
    text:
      'On his seventh orbit Soviet television showed Nikolayev live. Titov’s ship had already sent pictures down a year ' +
      'before, but to the ground stations, not to the public; whether Vostok 3’s 400-line system was new is disputed.',
    source: `The flight’s README, from Efimov’s articles on the Seliger television system (1996, 2007); ${SIDDIQI}, p. 293`,
    confidence: 'documented',
  },
  {
    date: '1962-08-12T08:02:33Z',
    flight: 'ussr/vostok/vostok-4',
    nation: 'USSR',
    title: 'First two crewed ships in orbit at once',
    text:
      'Pavel Popovich left the same pad as Vostok 3 passed overhead and was soon a few kilometres from it, the two pilots ' +
      'talking by radio. The ships could not steer toward each other; the West thought they might, and Moscow let it think so.',
    source: `${SIDDIQI}, pp. 360 and 361; ${LOG} (11:02:33 Moscow time; ${MSK})`,
    confidence: 'derived',
  },
  {
    date: '1962-10-03T12:15:11Z',
    flight: 'usa/mercury/ma-8-sigma-7',
    nation: 'USA',
    title: 'Sigma 7, the textbook flight',
    text:
      'Wally Schirra flew six orbits, drifting for hours with the jets off to show how little fuel a careful pilot needed, and ' +
      'came down in the Pacific four miles from the carrier, near enough to be lifted aboard in his capsule.',
    source: `${TNO}, chapter 14, pp. 470 to 490`,
    confidence: 'documented',
  },
  {
    date: '1963-05-15T13:04:13Z',
    flight: 'usa/mercury/ma-9-faith-7',
    nation: 'USA',
    title: 'First American more than a day in space',
    text:
      'Gordon Cooper’s 22 orbits closed Project Mercury. Near the end a short circuit took the autopilot, and he flew the ' +
      'retrofire and the entry by hand, by the stars and the window, to a landing beside the carrier.',
    source: `${TNO}, chapter 14, pp. 489 to 503`,
    confidence: 'documented',
  },
  {
    date: '1963-06-14T11:58:58Z',
    flight: 'ussr/vostok/vostok-5',
    nation: 'USSR',
    title: 'Longest flight alone, never since beaten',
    text:
      'Valeriy Bykovskiy stayed up almost five days by himself, in an orbit too low for the eight planned. No one flying ' +
      'alone has stayed longer: the FAI lists it as a current record.',
    source: `FAI, record file for Vostok 5 (www-2025.fai.org/node/53033: “ratified – current record”); ${LOG} (11:58:58 Moscow time; ${MSK})`,
    confidence: 'documented',
  },
  {
    date: '1963-06-16T09:29:52Z',
    flight: 'ussr/vostok/vostok-6',
    nation: 'USSR',
    title: 'First woman in space',
    text:
      'Valentina Tereshkova, 26, a parachutist from the Yaroslavl region, flew three days alongside Bykovskiy. TASS called ' +
      'her a civilian; she was a junior lieutenant.',
    source: `${SIDDIQI}, pp. 353 and 369 (12:29:52 Moscow time; ${MSK}); the flight’s README`,
    confidence: 'derived',
  },
  {
    date: '1964-10-12T07:30:01Z',
    flight: 'ussr/voskhod/voskhod-1',
    nation: 'USSR',
    title: 'First crew of more than one',
    text:
      'A pilot, an engineer from Korolev’s bureau and the first doctor to fly spent a day in a Vostok’s ball with the seat ' +
      'taken out. They went without pressure suits, which is often called a first: it was done because three suited men ' +
      'would not fit.',
    source: `${SIDDIQI}, pp. 263, 409 to 414 and 423; ${LOG} (10:30:01 Moscow time; ${MSK})`,
    confidence: 'derived',
  },
  {
    date: '1965-03-18T08:34:51Z',
    flight: 'ussr/voskhod/voskhod-2',
    nation: 'USSR',
    title: 'First walk in space',
    text:
      'Aleksey Leonov floated out of an inflatable airlock on a 5.35 m line for twelve minutes and nine seconds. His suit had ' +
      'swollen stiff, and he got back in only by letting air out of it.',
    source: `${SIDDIQI}, pp. 455 and 456 (out at 11:34:51 Moscow time; ${MSK})`,
    confidence: 'derived',
  },
  {
    date: '1965-03-23T14:24:00.064Z',
    flight: 'usa/gemini/gt-3',
    nation: 'USA',
    title: 'First crew to change their orbit',
    text:
      'Gus Grissom and John Young flew the first Gemini with a crew, and fired its thrusters to change the shape and the plane of ' +
      'its orbit. No crewed ship before it could do more than coast where its rocket had left it.',
    source: `${TITANS}, pp. 232 to 237 and Appendix B; ${JSC_BIO}, Virgil I. Grissom (December 1997)`,
    confidence: 'documented',
  },
  {
    date: '1965-06-03T15:15:59.562Z',
    flight: 'usa/gemini/gt-4',
    nation: 'USA',
    title: 'First flight run from Houston',
    text:
      'Gemini 4 was the first flight controlled from the new Mission Control Center in Houston, which took over from the control ' +
      'centre at the Cape and ran every American flight after it.',
    source: `${TITANS}, p. 239; the launch, 10:15:59.562 a.m. EST, Appendix B, taken to UTC`,
    confidence: 'documented',
  },
  {
    date: '1965-06-03',
    flight: 'usa/gemini/gt-4',
    nation: 'USA',
    title: 'First American spacewalk',
    text:
      'On the third orbit Ed White left Gemini 4 on a tether and moved himself about with a hand-held gas gun, ten weeks after ' +
      'Leonov. Told to come back in, he called it the saddest moment of his life.',
    source: `${TITANS}, pp. 248 and 249; ${FACT_BOOK}, section 4.0`,
    confidence: 'documented',
  },
  {
    date: '1965-08-29',
    flight: 'usa/gemini/gt-5',
    nation: 'USA',
    title: 'Eight days in orbit, a new record',
    text:
      'Gordon Cooper and Pete Conrad stayed up for eight days, as long as a trip to the Moon and back would take, and came ' +
      'down on 29 August having passed Bykovsky’s five days in Vostok 5.',
    source: `${TITANS}, pp. 256 to 262 and Appendix B (190 h 55 min 14 s, against Vostok 5’s 118 h 56 min on the FAI’s books)`,
    confidence: 'derived',
  },
  {
    date: '1965-12-12T14:54:03Z',
    flight: 'usa/gemini/gt-6a',
    nation: 'USA',
    title: 'Gemini 6 shuts down on the pad',
    text:
      'The Titan’s engines lit and stopped 1.2 seconds later with the rocket still on the stand. The rules said eject; Schirra ' +
      'felt no motion and did not, which saved the flight. A dust cover left in a gas generator was found to be the cause.',
    source: `Martin, Launch Vehicle No. 6 Flight Evaluation, Supplemental Report 2 to the Gemini VI and VI-A mission reports (ER 13227-6, February 1966), section III.B: the sequencer's T-0 at 14:54:03.20 G.m.t. and its holdfire at 14:54:04.40; ${TITANS}, pp. 283 to 285`,
    confidence: 'documented',
  },
  {
    date: '1965-12-15T19:33Z',
    flight: 'usa/gemini/gt-6a',
    nation: 'USA',
    title: 'First rendezvous in orbit',
    text:
      'Schirra and Stafford flew Gemini 6A up to Gemini 7 and held station 40 metres from it, with no motion between them. ' +
      'Two ships had met in orbit by steering, the thing a landing on the Moon would depend on.',
    // The instant the two ships were still, 120 ft apart, and station keeping began: the rendezvous as Schirra counted it
    // (Titans, p. 288) and NASA's chronology times it (SP-4002, Appendix 1, Table B: 5:56:00 after Gemini 6A's liftoff at
    // 13:37:26 G.m.t.). The Gemini VII mission report's "accomplished at 263:58 g.e.t." (section 1.0) is 19:28 G.m.t., 5:50:37
    // of Gemini 6A's flight: the start of braking at about 3,000 ft (SP-4002, 15 December 1965), not the end of it
    source: `${TITANS}, pp. 286 to 289 (2:33 p.m. EST, taken to UTC: station keeping begun, 120 ft below Gemini 7)`,
    confidence: 'derived',
  },
  {
    date: '1965-12-18',
    flight: 'usa/gemini/gt-7',
    nation: 'USA',
    title: 'Two weeks in orbit',
    text:
      'Frank Borman and Jim Lovell came down after fourteen days, the longest anyone had flown, a record that stood until Soyuz 9 ' +
      'in 1970, and longer than any Apollo flight would take.',
    source: `${TITANS}, foreword and Appendix B (330 h 35 min 1 s)`,
    confidence: 'documented',
  },
  {
    date: '1966-01-14',
    nation: 'USSR',
    title: 'Korolev dies',
    text:
      'Sergey Korolev, the chief designer behind Sputnik, Vostok and Voskhod, died on the operating table. Siddiqi counts his ' +
      'death one of the three defining moments of the Soviet programme, with its birth in 1946 and the end of the N1 in 1974.',
    source: `${SIDDIQI}, pp. 528, 838 and 839`,
    confidence: 'documented',
  },
  {
    date: '1966-02-03T18:45:30Z',
    nation: 'USSR',
    title: 'First soft landing on the Moon',
    text:
      'Luna 9 came down in the Ocean of Storms inside airbags and sent back the first pictures from the surface. Jodrell Bank ' +
      'in England picked them up and published them before Pravda could.',
    source: `${BEYOND}, pp. 2 and 56; ${SIDDIQI}, pp. 528 and 529`,
    confidence: 'documented',
  },
  {
    date: '1966-02-28',
    flight: 'usa/gemini/gt-9a',
    nation: 'USA',
    title: 'Gemini 9’s crew killed before they flew',
    text:
      'Elliot See and Charles Bassett, the prime crew of Gemini 9, died when their T-38 came down in bad weather at St. Louis, ' +
      'into the McDonnell building where their own spacecraft was being made ready. Their backups, Tom Stafford and Gene ' +
      'Cernan, took the flight: the first time in NASA’s crewed programme that a backup crew had taken over a mission.',
    source: 'Hacker and Grimwood, On the Shoulders of Titans, NASA SP-4203 (1977), pp. 323 to 325',
    confidence: 'documented',
  },
  {
    date: '1966-03-16',
    flight: 'usa/gemini/gt-8',
    nation: 'USA',
    title: 'First docking in orbit',
    text:
      'Neil Armstrong eased Gemini 8 into the docking cone of an Agena target six and a half hours into the flight: the first ' +
      'time two craft had been joined in orbit. The rendezvous that got him there was the second in Gemini, after 6A and 7.',
    source: 'SP-4203, pp. 309 to 312 and 321 ("the first space docking"); NASA JSC biographical data, Neil A. Armstrong (August 2012)',
    confidence: 'documented',
  },
  {
    date: '1966-03-17',
    flight: 'usa/gemini/gt-8',
    nation: 'USA',
    title: 'A thruster stuck on, and home early',
    text:
      'Soon after docking, out of reach of any ground station, a thruster on Gemini 8 stuck open and the joined craft ' +
      'began to roll. Undocked, the Gemini spun faster, close to a turn a second, until Armstrong shut down the manoeuvring ' +
      'thrusters and steadied it on the re-entry ones. Using those meant coming home: the flight planned for three days ' +
      'landed in the western Pacific after under eleven hours, in the early hours of 17 March by UTC.',
    source:
      'SP-4203, pp. 312 to 315, 319 and 321; landing date derived from Appendix B, p. 526 (launch 11:41:02 a.m. e.s.t. on 16 March, duration 10 h 41 min 26 s)',
    confidence: 'documented',
  },
  {
    date: '1966-06-03',
    flight: 'usa/gemini/gt-9a',
    nation: 'USA',
    title: 'The angry alligator',
    text:
      'Gemini 9A caught its target on the third orbit and found the shroud over its docking port half open, held by two ' +
      'lanyards: "It looks like an angry alligator out here rotating around," said Stafford. There could be no docking. ' +
      'The target was itself a stand-in, flown after the Atlas carrying the flight’s Agena failed on 17 May.',
    source: 'SP-4203, pp. 330 to 334 and Appendix B, p. 527 (notes 15 and 16)',
    confidence: 'documented',
  },
  {
    date: '1966-06-05',
    flight: 'usa/gemini/gt-9a',
    nation: 'USA',
    title: 'A walk outside proves too hard',
    text:
      'Gene Cernan went out to put on the Air Force’s rocket backpack at the back of the spacecraft and found that with so ' +
      'few handholds every task fought him. He overheated, his faceplate fogged until he could barely see, and the backpack ' +
      'was given up. Getting real work done outside became the question the rest of Gemini had to answer.',
    source: 'SP-4203, pp. 337 to 339',
    confidence: 'documented',
  },
  {
    date: '1966-07-19',
    flight: 'usa/gemini/gt-10',
    nation: 'USA',
    title: 'First crew boosted by a docked rocket stage',
    text:
      'Docked to their Agena, John Young and Michael Collins lit its main engine and were thrown forward in their straps as ' +
      'it pushed them, flying backward, into a far higher orbit than any crew had reached, and on to a second target: the ' +
      'Agena left in orbit by Gemini 8.',
    source:
      'SP-4203, foreword ("first docking of one spacecraft with a propulsive stage and use of that stage to transfer man to high altitude"), pp. 345 and 348; ' +
      'the date derived from the launch at 5:20:26 p.m. e.s.t. on 18 July (Appendix B, p. 527) and the burn some seven and a half hours later (p. 345)',
    confidence: 'documented',
  },
  {
    date: '1966-07-20',
    flight: 'usa/gemini/gt-10',
    nation: 'USA',
    title: 'First visit to another craft in orbit',
    text:
      'Collins pushed off from Gemini 10, floated across to the Agena that Gemini 8 had left four months before and took ' +
      'off a package that had been collecting micrometeorites on it, losing his grip once and getting back with a nitrogen ' +
      'gun. No one had gone out to another craft before.',
    source:
      'SP-4203, pp. 348 and 349; NASA JSC biographical data, Michael Collins (September 2015). That it was the first is derived: ' +
      'no earlier walk outside (Leonov, White, Cernan) left its own craft for another. The date is derived from the launch (Appendix B, p. 527) and the sighting at 45:38 elapsed (p. 348)',
    confidence: 'derived',
  },
  {
    date: '1966-09-12',
    flight: 'usa/gemini/gt-11',
    nation: 'USA',
    title: 'First rendezvous on the first orbit',
    text:
      'Pete Conrad and Dick Gordon left the pad in the shortest launch window of Gemini and were beside their Agena 85 ' +
      'minutes later, over California, before they had been once round the Earth. It was the kind of quick rendezvous a ' +
      'lunar module coming up from the Moon would need.',
    source: 'SP-4203, pp. 355, 358 and 359; NASA JSC biographical data, Richard F. Gordon, Jr. (November 2017)',
    confidence: 'documented',
  },
  {
    date: '1966-09-14',
    flight: 'usa/gemini/gt-11',
    nation: 'USA',
    title: 'Highest Earth orbit flown to that day',
    text:
      'A 26-second burn of the docked Agena’s engine lifted Gemini 11 to an apogee of 1,369 km, a world altitude record, from ' +
      'which Conrad saw "the world’s round" across about 150 degrees of it. No crew went higher round the Earth until ' +
      'Polaris Dawn in 2024.',
    source:
      'SP-4203, p. 363 and Appendix B, p. 528 (highest apogee 1368.9 km); the record: NASA JSC biographical data, Richard F. Gordon, Jr. (November 2017: "FAI World Record (Altitude Record, Gemini XI)"). ' +
      'The date is derived from the burn at 40:30 elapsed (p. 363) and the launch at 9:42:26 a.m. e.s.t. on 12 September (p. 528). Polaris Dawn is not in a source read here',
    confidence: 'derived',
  },
  {
    date: '1966-11-13',
    flight: 'usa/gemini/gt-12',
    nation: 'USA',
    title: 'Work outside shown to be possible',
    text:
      'After three walks that ended in exhaustion, Buzz Aldrin, trained under water and given handrails, handholds and ' +
      'waist tethers, worked slowly through a set of tasks on the Agena and at the back of his own craft for two hours. ' +
      'What he did was planned on what Cernan, Collins and Gordon had found.',
    source:
      'SP-4203, pp. 372, 373, 377 to 379 and 381; the date derived from the launch at 3:46:33 p.m. e.s.t. on 11 November (Appendix B, p. 529) and the start near 43 h elapsed (p. 378)',
    confidence: 'documented',
  },
  {
    date: '1966-11-15',
    flight: 'usa/gemini/gt-12',
    nation: 'USA',
    title: 'Gemini ends',
    text:
      'Gemini 12 came down in the Atlantic under automatic control, and the programme ended. In twenty months ten crews had ' +
      'shown that people could live for two weeks in orbit, find and dock with another craft and work outside it: what a ' +
      'flight to the Moon would ask of them.',
    source: 'SP-4203, pp. 381 and 382, and Appendix B, p. 529',
    confidence: 'documented',
  },
  {
    date: '1966-11-28T11:00Z',
    nation: 'USSR',
    title: 'The first Soyuz flies, and fails',
    text:
      'An uncrewed Soyuz, announced only as Kosmos-133, was to dock with a second. Its thrusters turned it the wrong way, the ' +
      'second launch was called off, and after five firings of its engine the capsule vanished from radar on the way down, ' +
      'its path too flat. The commission thought a cosmonaut aboard could have saved it.',
    source: `${SIDDIQI}, pp. 571 to 573; ${LOG} (14:00 Moscow time; ${MSK})`,
    confidence: 'derived',
  },
  {
    date: '1967-01-27',
    nation: 'USA',
    title: 'Apollo 1: three die in a test on the pad',
    text:
      'Gus Grissom, Ed White and Roger Chaffee were killed when fire broke out in their command module during a ' +
      'countdown rehearsal at Launch Complex 34, a little after 23:31 UTC, in a cabin of pure oxygen above the ' +
      'pressure outside. No Apollo flew with a crew for twenty-one months, and the command module was rebuilt.',
    source:
      `${ABTN}, Apollo 1, pp. 1 to 8 (the chronology of the fire, 23:31:04 to 23:31:30 GMT); ${CHARIOTS}, pp. 213 to 214 ` +
      '(the test, the cabin "pure oxygen at ... 16.7 pounds per square inch"); SP-2000-4029 p. 14 ("Twenty-one months after the Apollo 1 fire")',
    confidence: 'documented',
  },
  {
    date: '1967-04-24T03:24Z',
    flight: 'ussr/soyuz/soyuz-1',
    nation: 'USSR',
    title: 'First death on a spaceflight',
    text:
      'Vladimir Komarov came down from a failing first flight of Soyuz with his main parachute stuck in its container and his ' +
      'reserve tangled, and was killed when the ship hit the steppe. Nobody had died on a spaceflight before.',
    source: `${SIDDIQI}, pp. 581 to 589 (landing at 06:24 Moscow time, p. 586; ${MSK})`,
    confidence: 'derived',
  },
  {
    date: '1967-11-09',
    nation: 'USA',
    title: 'First flight of the Saturn V',
    text:
      'Apollo 4 flew the whole rocket at once, all three live stages under an unmanned command module, at 7:00 in ' +
      'the morning Florida time. Testing "all-up", rather than one stage at a time, was George Mueller’s decision, ' +
      'and it is why a crew could ride the third Saturn V.',
    source: `${CHARIOTS}, p. 232 (the launch, 7:00 a.m., 9 November 1967) and p. 130 (Mueller's all-up decision)`,
    confidence: 'documented',
  },
  {
    date: '1968-03-27',
    nation: 'USSR',
    title: 'Gagarin dies',
    text:
      'Yuri Gagarin and his instructor Vladimir Seregin were killed when their two-seat MiG-15 trainer flew into a forest near ' +
      'Kirzhach. The official report blamed a sudden turn; the cosmonauts would not accept that it was pilot error.',
    source: `${SIDDIQI}, pp. 627 and 628`,
    confidence: 'documented',
  },
  {
    date: '1968-09-21T16:08Z',
    nation: 'USSR',
    title: 'First living things round the Moon and back',
    text:
      'Zond 5, the ship meant to carry two cosmonauts round the Moon, flew it uncrewed with two tortoises, flies’ eggs, seeds ' +
      'and plants aboard, and came down in the Indian Ocean. The tortoises lived: the first creatures to go round the Moon ' +
      'and come home.',
    source: `${BEYOND}, pp. 79 and 80`,
    confidence: 'documented',
  },
  {
    date: '1968-10-11T15:02:45Z',
    flight: 'usa/apollo/apollo-7',
    nation: 'USA',
    title: 'First crewed Apollo flight',
    text:
      'Schirra, Eisele and Cunningham flew the rebuilt command and service module for eleven days in Earth orbit ' +
      'on a Saturn IB. It was the shakedown the fire had made necessary, and its success let the next flight go to ' +
      'the Moon.',
    source: `${ABTN}, Apollo 7, pp. 14 and 15 (Range Zero, 15:02:45 GMT, 11 October 1968); p. 32 (Apollo 7's results deciding Apollo 8's mission)`,
    confidence: 'documented',
  },
  {
    date: '1968-10-14',
    flight: 'usa/apollo/apollo-7',
    nation: 'USA',
    title: 'First live television from a US spacecraft',
    text:
      'Three days up, the crew turned on a camera and showed the cabin to the ground for seven minutes: the ' +
      'first of seven live broadcasts, and the first from a piloted American spacecraft.',
    source: `${ABTN}, Apollo 7, p. 17 ("At 071:43, the first of seven television transmissions began and lasted for seven minutes"); the day is 71 h 43 min after the launch of p. 15`,
    confidence: 'documented',
  },
  {
    date: '1968-10-26T08:34Z',
    flight: 'ussr/soyuz/soyuz-3',
    nation: 'USSR',
    title: 'Soyuz flies with a crew again',
    text:
      'Eighteen months after Komarov, Georgiy Beregovoy flew a Soyuz up to an uncrewed one and could not dock: he steered ' +
      'his ship into the wrong attitude at the last. He came home four days later, the first Soyuz crew to come home.',
    source: `${SIDDIQI}, pp. 659 and 660; ${LOG} (11:34 Moscow time; ${MSK}); ${SF_MISSION}, Soyuz 3 (landing 30 October)`,
    confidence: 'derived',
  },
  {
    date: '1968-12-21T15:47:05Z',
    flight: 'usa/apollo/apollo-8',
    nation: 'USA',
    title: 'First crew to leave Earth orbit',
    text:
      'Two hours and fifty-six minutes after the first crewed Saturn V left the pad, its third stage relit and ' +
      'sent Borman, Lovell and Anders towards the Moon. Nobody had been farther than a few hundred miles from the ' +
      'Earth before.',
    source: `${ABTN}, Apollo 8, p. 32 ("the first piloted mission launched with the three-stage Saturn V") and p. 48 (translunar injection, 002:56:05.51, 15:47:05 GMT, 21 Dec 1968)`,
    confidence: 'documented',
  },
  {
    date: '1968-12-24T09:59:20Z',
    flight: 'usa/apollo/apollo-8',
    nation: 'USA',
    title: 'First crew in orbit round the Moon',
    text:
      'Behind the Moon and out of radio contact, the service module’s engine slowed them into lunar orbit. They ' +
      'went round ten times, photographed the Earth rising over the lunar horizon, and on Christmas Eve read from ' +
      'Genesis to the people watching at home.',
    source:
      `${ABTN}, Apollo 8, p. 49 (lunar orbit insertion ignition, 09:59:20 GMT, 24 Dec 1968) and p. 38 (the reading on Christmas Eve); ` +
      'NASA, "Earthrise by NASA Astronaut Bill Anders" (nasa.gov image article): taken by Anders on 24 December 1968',
    confidence: 'documented',
  },
  {
    date: '1969-01-16T08:20Z',
    flight: 'ussr/soyuz/soyuz-4',
    nation: 'USSR',
    title: 'First docking of two crewed ships',
    text:
      'Shatalov and Volynov took manual control about 100 metres apart. They held at about 40 metres off the African coast, ' +
      'then closed for docking in television range of the Soviet ground stations. Gemini 8 had docked with an uncrewed target.',
    source: `${SIDDIQI}, pp. 670 and 674 (hard dock at 11:20 Moscow time; ${MSK}); Shatalov, postflight press conference, NASA translation HL-PR-10803, pp. 4–5`,
    confidence: 'derived',
  },
  {
    date: '1969-01-16',
    flight: 'ussr/soyuz/soyuz-5',
    nation: 'USSR',
    title: 'First crew to move between ships in orbit',
    text:
      'Aleksey Yeliseyev and Yevgeniy Khrunov went out of Soyuz 5 in their suits and into Soyuz 4, carrying letters and the ' +
      'newspapers that told of its launch. The transfer took about 37 minutes.',
    source: `${SIDDIQI}, pp. 671 to 674`,
    confidence: 'documented',
  },
  {
    date: '1969-02-21T09:18:07Z',
    nation: 'USSR',
    title: 'The Moon rocket’s first flight fails',
    text:
      'The first N1, the rocket for a Soviet landing, rose on thirty engines; at 70 seconds its control system shut them all ' +
      'down. Its escape rocket pulled the unmanned ship clear.',
    source: `${SIDDIQI}, pp. 681 and 682 (12:18:07 Moscow time; ${MSK})`,
    confidence: 'derived',
  },
  {
    date: '1969-03-03T16:00:00Z',
    flight: 'usa/apollo/apollo-9',
    nation: 'USA',
    title: 'First crewed flight of a lunar module',
    text:
      'In Earth orbit, McDivitt and Schweickart flew the lander away from the command module, Scott alone in it, and ' +
      'brought it back to a rendezvous: the first test with a crew of the "lunar ferry" that would land on the Moon.',
    source: `${ABTN}, Apollo 9, p. 52 ("the first piloted test of the 'lunar ferry'") and p. 53 (Range Zero, 16:00:00 GMT); ${CHARIOTS}, pp. 297 to 299`,
    confidence: 'documented',
  },
  {
    date: '1969-05-22T20:35:01Z',
    flight: 'usa/apollo/apollo-10',
    nation: 'USA',
    title: 'First lunar module flown at the Moon',
    text:
      'Stafford and Cernan took Snoopy down to within 47,400 feet of the surface and back to Young in Charlie Brown: ' +
      'everything of a landing except the last few miles.',
    source: `${ABTN}, Apollo 10, p. 72 ("the dress rehearsal for the first piloted landing"), p. 76 (lowest point, 47,400 feet) and p. 87 (descent orbit insertion, 20:35:01 GMT, 22 May 1969)`,
    confidence: 'documented',
  },
  {
    date: '1969-07-03T20:18:32Z',
    nation: 'USSR',
    title: 'The Moon rocket falls on its pad',
    text:
      'Less than two weeks before Apollo 11 left, the second N1 rose 200 metres, fell back and exploded on its pad: by some ' +
      'estimates the most powerful explosion in the history of rockets. No one was hurt.',
    source: `${SIDDIQI}, pp. 688, 691 and 693 (23:18:32 Moscow time; ${MSK})`,
    confidence: 'derived',
  },
  {
    date: '1969-07-20T20:17:39Z',
    flight: 'usa/apollo/apollo-11',
    nation: 'USA',
    title: 'First landing on the Moon',
    text:
      'Armstrong and Aldrin brought Eagle down in the Sea of Tranquility, through a string of computer alarms and ' +
      'with Armstrong flying the last of the descent by hand, while Collins orbited overhead in Columbia.',
    source: `${ABTN}, Apollo 11, p. 94 ("The LM landed on the Moon at 20:17:39 GMT ... on 20 July 1969 at 102:45:39.9") and p. 107 (the 1202 alarms, 20:10:22 to 20:14:58 GMT)`,
    confidence: 'documented',
  },
  {
    date: '1969-07-21T02:56:15Z',
    flight: 'usa/apollo/apollo-11',
    nation: 'USA',
    title: 'First person to walk on the Moon',
    text:
      'Armstrong’s left foot touched the surface six and a half hours after the landing, "one small step for a ' +
      'man". Aldrin followed him down the ladder, and the two spent about two and a half hours outside.',
    source: `${ABTN}, Apollo 11, p. 94 ("first contact with the lunar surface at 02:56:15 GMT on 21 July") and p. 108 (the timeline and the words)`,
    confidence: 'documented',
  },
  {
    date: '1969-10-13T10:19:09Z',
    flight: 'ussr/soyuz/soyuz-8',
    nation: 'USSR',
    title: 'Three crewed ships in orbit at once',
    text:
      'With Soyuz 8 up, Soyuz 6 and 7 were already there: seven cosmonauts in orbit together, the most there had ever been. ' +
      'Soyuz 7 and 8 were to dock; their radar failed and they never came closer than about half a kilometre.',
    source: `${SIDDIQI}, pp. 702 and 706 to 708 (13:19:09 Moscow time; ${MSK})`,
    confidence: 'derived',
  },
  {
    date: '1969-10-16',
    flight: 'ussr/soyuz/soyuz-6',
    nation: 'USSR',
    title: 'First welding in space',
    text:
      'Valeriy Kubasov sealed himself in Soyuz 6’s descent module, let the air out of the living compartment and ran the ' +
      'Vulkan unit there by remote control: arc, electron-beam and a third method, in vacuum.',
    source: `${SIDDIQI}, p. 709`,
    confidence: 'documented',
  },
  {
    date: '1969-11-19T06:54:36Z',
    flight: 'usa/apollo/apollo-12',
    nation: 'USA',
    title: 'First precision landing on the Moon',
    text:
      'Conrad set Intrepid down in the Ocean of Storms 535 feet from Surveyor III, a robot lander that had been ' +
      'there since April 1967, and he and Bean walked over and brought pieces of it home. A landing could now be ' +
      'aimed at a place.',
    source: `${ABTN}, Apollo 12, p. 116 (the landing, 110:32:36.2, and "just 535 feet from" Surveyor III, landed 20 April 1967), p. 118 (parts of it removed) and p. 131 (06:54:36 GMT, 19 Nov 1969)`,
    confidence: 'documented',
  },
  {
    date: '1970-04-14T03:07:53Z',
    flight: 'usa/apollo/apollo-13',
    nation: 'USA',
    title: 'Apollo 13’s oxygen tank fails',
    text:
      'Fifty-six hours out, the crew heard a loud bang: the second oxygen tank in the service module had failed, ' +
      'taking the fuel cells with it. The landing was given up, and the lunar module became the lifeboat that ' +
      'kept three men alive round the Moon and back.',
    source: `${ABTN}, Apollo 13, p. 154 ("the crew heard a loud bang", 055:54:53.555, 03:07:53 GMT, 14 Apr 1970), p. 140 (the LM as "lifeboat") and p. 146 (the cause: heater switches rated for 28 V on a tank heated from 65 V on the ground)`,
    confidence: 'documented',
  },
  {
    date: '1970-04-17T18:07:41Z',
    flight: 'usa/apollo/apollo-13',
    nation: 'USA',
    title: 'Apollo 13 comes home',
    text:
      'Lovell, Swigert and Haise splashed down in the Pacific in Odyssey, having left Aquarius and the crippled ' +
      'service module behind them in space a few hours before.',
    source: `${ABTN}, Apollo 13, p. 143 (splashdown, 18:07:41 GMT, 17 April 1970)`,
    confidence: 'documented',
  },
  {
    date: '1970-06-19T11:58:55Z',
    flight: 'ussr/soyuz/soyuz-9',
    nation: 'USSR',
    title: 'Longest flight to that day',
    text:
      'Andriyan Nikolayev and Vitaliy Sevastyanov came down after nearly eighteen days, the record back in Soviet hands after ' +
      'four years. They could not climb out of their ship and had to be carried.',
    source: `${SIDDIQI}, pp. 724 to 728; ${SF_MISSION}, Soyuz 9 (landing 11:58:55 UTC)`,
    confidence: 'documented',
  },
  {
    date: '1970-09-24T05:26Z',
    nation: 'USSR',
    title: 'First Moon sample brought back by a robot',
    text:
      'Luna 16 landed in the Sea of Fertility on 20 September, drilled 35 centimetres into the soil and sent the sample home ' +
      'in a small capsule that came down by parachute in Kazakhstan.',
    source: `${BEYOND}, p. 96`,
    confidence: 'documented',
  },
  {
    date: '1970-11-17T06:27:07Z',
    nation: 'USSR',
    title: 'First wheeled vehicle on the Moon',
    text:
      'Lunokhod 1 rolled off Luna 17 onto the Sea of Rains and was driven from the Earth for 322 days, a machine whose ' +
      'design had begun as part of the crewed landings.',
    source: `${BEYOND}, pp. 2 and 97`,
    confidence: 'documented',
  },
  {
    date: '1971-02-05T09:18:11Z',
    flight: 'usa/apollo/apollo-14',
    nation: 'USA',
    title: 'The first American in space lands on the Moon',
    text:
      'Shepard landed Antares at Fra Mauro, the site Apollo 13 had been aimed at, nearly ten years after Freedom 7. ' +
      'Before he climbed back in he hit two golf balls.',
    source: `${ABTN}, Apollo 14, p. 163 (the landing in "the Fra Mauro highlands", 04:18:11 a.m. EST on 5 February) and p. 166 (the golf balls)`,
    confidence: 'documented',
  },
  {
    date: '1971-04-19T01:40Z',
    nation: 'USSR',
    title: 'First space station',
    text:
      'DOS-1 went up on a Proton. It was to have been called Zarya; at the last it was renamed Salyut, “salute”, for the ' +
      'tenth year since Gagarin, and the old name stayed painted on its side.',
    source: `${SIDDIQI}, p. 773 (04:40 Moscow time; ${MSK})`,
    confidence: 'derived',
  },
  {
    date: '1971-04-24T01:47Z',
    flight: 'ussr/soyuz/soyuz-10',
    nation: 'USSR',
    title: 'First soft docking with a space station',
    text:
      'Soyuz 10’s probe caught in Salyut’s docking cone. The docking rings stayed nine centimetres apart, leaving the transfer ' +
      'passage unsealed. It took hours to free the ship.',
    source: `TASS, 25 April 1971 (capture at 04:47 Moscow time, ${MSK}); Kamanin, Hidden Cosmos, 25 April 1971`,
    confidence: 'derived',
  },
  {
    date: '1971-06-07',
    flight: 'ussr/soyuz/soyuz-11',
    nation: 'USSR',
    title: 'First crew aboard a space station',
    text:
      'Georgiy Dobrovolskiy, Vladislav Volkov and Viktor Patsayev docked with Salyut and went in, Patsayev first: the first ' +
      'people to live in a station, for more than three weeks.',
    source: `${SIDDIQI}, pp. 777 to 781; ${SF_MISSION}, Soyuz 11 (docking 07:49 UTC on 7 June)`,
    confidence: 'documented',
  },
  {
    date: '1971-06-29T22:47:28Z',
    flight: 'ussr/soyuz/soyuz-11',
    nation: 'USSR',
    title: 'Soyuz 11’s crew lost coming home',
    text:
      'As the modules parted 150 km up, a valve opened and the cabin lost its air in under a minute. The ship landed on time ' +
      'and on its mark, and the three were found dead in their seats, in no pressure suits: there had been no room for any.',
    source: `${SIDDIQI}, pp. 781 to 783 (separation at 01:47:28 Moscow time on 30 June; ${MSK})`,
    confidence: 'derived',
  },
  {
    date: '1971-07-31T14:05:33Z',
    flight: 'usa/apollo/apollo-15',
    nation: 'USA',
    title: 'First crew to drive on the Moon',
    text:
      'Scott and Irwin unfolded the first Lunar Roving Vehicle from the side of Falcon at Hadley Rille, under the ' +
      'Apennine Mountains, and drove it out on the first of three excursions: the first of the long-stay "J" ' +
      'missions, made for science.',
    source: `${ABTN}, Apollo 15, p. 184 (the first Type J mission, the LRV "to be used for the first time", the site) and p. 207 (LRV deployed, 14:05:33 GMT, 31 July 1971)`,
    confidence: 'documented',
  },
  {
    date: '1972-04-21T02:23:35Z',
    flight: 'usa/apollo/apollo-16',
    nation: 'USA',
    title: 'Landing in the Moon’s central highlands',
    text:
      'Young and Duke landed Orion on the Cayley Plains near Descartes, in the rugged highlands, to sample rock ' +
      'from far from the dark lowland seas the earlier crews had mostly walked on. (Apollo 14’s Fra Mauro is also ' +
      'called a highland; Descartes was the first site chosen for the highlands themselves.)',
    source:
      `${ABTN}, Apollo 16, p. 212 (the objectives at Descartes) and p. 234 (landing, 02:23:35 GMT, 21 Apr 1972); p. 163 for Fra Mauro as "highlands"; ` +
      `${JSC_BIO}, Charles M. Duke, Jr. ("the first scientific expedition to inspect ... the rugged lunar highlands")`,
    confidence: 'documented',
  },
  {
    date: '1972-12-11',
    flight: 'usa/apollo/apollo-17',
    nation: 'USA',
    title: 'First scientist on the Moon',
    text:
      'Harrison Schmitt, a geologist with a doctorate from Harvard, landed with Cernan in the valley of ' +
      'Taurus-Littrow: the one professional scientist of the twelve who walked on the Moon. He and Cernan found the ' +
      'orange soil at Shorty Crater.',
    source: `${ABTN}, Apollo 17, p. 240 ("A geologist, Schmitt was the first true scientist to explore the Moon"), p. 243 (landed in Taurus-Littrow, 11 December) and p. 246 (the orange soil, station 4)`,
    confidence: 'documented',
  },
  {
    date: '1972-12-14T22:54:37Z',
    flight: 'usa/apollo/apollo-17',
    nation: 'USA',
    title: 'The last crew leaves the Moon',
    text:
      'Challenger’s ascent stage lifted Cernan and Schmitt off the surface after three days in the valley, ending ' +
      'the sixth landing and the programme. No one has walked on the Moon since (as this is written, in 2026).',
    source: `${ABTN}, Apollo 17, p. 263 (LM lunar liftoff ignition, 185:21:37, 22:54:37 GMT, 14 Dec 1972); ${CHARIOTS}, p. xiv (the final return from the Moon on flight 17)`,
    confidence: 'documented',
  },
  {
    date: '1973-05-25T13:00:00Z',
    flight: 'usa/skylab/skylab-2',
    nation: 'USA',
    title: 'First crew of an American space station',
    text:
      'Pete Conrad, Joseph Kerwin and Paul Weitz took off in an Apollo spacecraft eleven days after Skylab reached orbit. ' +
      'The station had lost its meteoroid shield and one workshop solar wing during launch. Their cabin now carried tools and sunshades.',
    source: 'Kennedy Space Center, Skylab Program, pp. XI-1–XI-2 (NTRS 19740015280)',
    confidence: 'documented',
  },
  {
    date: '1973-09-27T12:18:16Z',
    flight: 'ussr/soyuz/soyuz-12',
    nation: 'USSR',
    title: 'First crewed test of the redesigned Soyuz ferry',
    text:
      'More than two years after the loss of Soyuz 11, Vasily Lazarev and Oleg Makarov flew the rebuilt ferry. ' +
      'The space for a third crew member now held life-support equipment for the two men’s Sokol-K pressure suits.',
    source: 'Mishin, State Commission address, 27 September 1973, pp. 92–93; NASA, Mir Hardware Heritage, §1.8; Spacefacts, Soyuz 12',
    confidence: 'documented',
  },
  {
    date: '1974-12-02T09:40:00Z',
    flight: 'ussr/soyuz/soyuz-16',
    nation: 'USSR',
    title: 'First crewed rehearsal for Apollo–Soyuz',
    text:
      'Anatoliy Filipchenko and Nikolay Rukavishnikov flew the modified Soyuz after two uncrewed tests. ' +
      'They rehearsed docking against a ring that represented Apollo and tried the cabin atmosphere they would use for crew transfers.',
    source: 'TASS, Soyuz 16 flight chronicle, 18 December 1974, p. 1; NASA SP-4209, pp. 266–270; Czech Academy of Sciences, 1974-096A',
    confidence: 'documented',
  },
  {
    date: '1980-06-05T14:19:30Z',
    flight: 'ussr/soyuz/soyuz-t-2',
    nation: 'USSR',
    title: 'First crewed Soyuz T flight',
    text:
      'Yuri Malyshev and Vladimir Aksyonov took the new Soyuz T to Salyut 6. When the computer-guided rendezvous broke off, ' +
      'they took over and docked by hand.',
    source:
      'Novosti Kosmonavtiki, no. 4 (231), 2002, p. 71 (17:19:30 Moscow time). V. I. Vasilyev, Manned Spaceflight, no. 4 (41), 2021, pp. 118, 130–131',
    confidence: 'documented',
  },
];

export const STORIES: Readonly<Record<string, FlightStory>> = {
  ...Object.fromEntries(
    Object.entries(targetLaunches).map(([id, record]) => {
      const flight = 'usa/gemini/' + id;
      return [
        flight,
        { flight, headline: record.headline, story: record.story, firsts: [], source: 'NASA SP-4002, Appendix I, Table B and Part III' },
      ];
    }),
  ),
  'ussr/vostok/vostok-1': {
    flight: 'ussr/vostok/vostok-1',
    headline: 'The first person in space: one orbit, flown automatically',
    story:
      'Five uncrewed Vostoks, with dogs and a mannequin, had flown the way for it. Gagarin’s controls were locked behind a ' +
      'code in a sealed envelope, because nobody knew what weightlessness would do to a mind. He reported all the way round, ' +
      'and showed that it did nothing much.\n\n' +
      'It nearly went wrong twice. The last stage burned long and left him in a higher orbit than planned, which mattered if ' +
      'the braking engine failed; after the burn the two halves of the ship stayed joined for ten minutes and it tumbled. ' +
      'He ejected at about 7 km and came down by parachute near Smelovka, a fact the Soviet Union hid for a decade because ' +
      'a record was meant to end with the pilot in his craft.',
    firsts: ['First person in space and in orbit'],
    source: `${SIDDIQI}, pp. 265 to 283; the flight’s README and mission.md`,
    named: {
      why:
        'Кедр (Kedr), “cedar”, was Gagarin’s call sign on the radio; the ground answered as Заря-1 (Zarya-1, “dawn”), the ' +
        'name of the ship’s voice radio. The ship itself was announced as Vostok, “east”, with no number: the 1 came later.',
      source: `${SIDDIQI}, pp. 250 and 275; ${LOG}`,
      confidence: 'documented',
    },
  },
  'ussr/vostok/vostok-2': {
    flight: 'ussr/vostok/vostok-2',
    headline: 'A whole day in orbit, and the first space sickness',
    story:
      'Khrushchev asked for the flight by 10 August; three days after it, the building of the Berlin Wall began, and Titov ' +
      'was the good news he had wanted. Titov flew the ship by hand, the first Soviet pilot to, and had his meals from tubes ' +
      'on television.\n\n' +
      'He was disoriented and sick from the first orbit and told the ground that all was in order. The next Soviet flight ' +
      'waited a year while the doctors studied what had happened to him.',
    firsts: ['First full day in orbit'],
    source: `${SIDDIQI}, pp. 292, 293 and 359; the flight’s README`,
    named: {
      why:
        'Орёл (Oryol), “eagle”: Titov’s call sign. The first cosmonauts’ call signs were mostly strong birds; Kedr was the ' + 'exception.',
      source: 'The flight’s README; N. Yachmennikova, “Кедр, Кречет, Бурлак”, Rossiyskaya Gazeta, 24 August 2025',
      confidence: 'documented',
    },
  },
  'ussr/vostok/vostok-3': {
    flight: 'ussr/vostok/vostok-3',
    headline: 'Four days in orbit, and the first half of a pair',
    story:
      'Nikolayev went up alone and a day later had company: Vostok 4, launched as he passed over the pad. He unstrapped and ' +
      'floated, filmed, talked to Popovich by radio and was seen live on Soviet television.\n\n' +
      'His cabin went cold, and the State Commission argued over whether to keep him up for a fourth day; he said he felt ' +
      'excellent. He came down by parachute south of Karaganda, minutes before Popovich.',
    firsts: ['First to float free in his cabin', 'First television broadcast from a crewed ship'],
    source: 'The flight’s README (missions/ussr/vostok/flights/vostok-3), from Siddiqi pp. 354 to 361, Chertok and Efimov',
    named: {
      why:
        'Сокол (Sokol), “falcon”: Nikolayev’s call sign. Eight years later, commanding Soyuz 9, he was Sokol again, as ' +
        'Komarov was Рубин on both his flights.',
      source: `The flight’s README; ${SF_MISSION}, Soyuz 9 (call sign Sokol)`,
      confidence: 'derived',
    },
  },
  'ussr/vostok/vostok-4': {
    flight: 'ussr/vostok/vostok-4',
    headline: 'The second ship of the first group flight',
    story:
      'Timed to the second, Popovich’s launch put him a few kilometres from Nikolayev. Neither ship could steer toward the ' +
      'other, so they drifted apart; abroad it was taken for a step to docking, and Moscow said nothing to correct it.\n\n' +
      'Before the flight he had agreed to code phrases for trouble, and “observing a thunderstorm” meant he was sick. When ' +
      'he reported a real one, the ground thought he wanted to come home.',
    firsts: ['First two crewed ships in orbit at once'],
    source: `${SIDDIQI}, pp. 359 to 361; the flight’s README`,
    named: {
      why: 'Беркут (Berkut), “golden eagle”: Popovich’s call sign, another of the first cosmonauts’ strong birds.',
      source: 'The flight’s README; N. Yachmennikova, “Кедр, Кречет, Бурлак”, Rossiyskaya Gazeta, 24 August 2025',
      confidence: 'documented',
    },
  },
  'ussr/vostok/vostok-5': {
    flight: 'ussr/vostok/vostok-5',
    headline: 'Five days alone, longer than anyone since',
    story:
      'Bykovskiy was meant to stay eight days. The countdown failed three times in an afternoon and he went up into an orbit ' +
      'too low to last, so the flight was cut to five. For three of them Vostok 6 was within radio call.\n\n' +
      'No one flying alone has stayed up longer since.',
    firsts: ['Longest flight alone, never since beaten'],
    source: 'The flight’s README; FAI, record file for Vostok 5 (www-2025.fai.org/node/53033)',
    named: {
      why: 'Ястреб (Yastreb), “hawk”: Bykovskiy’s call sign. The cosmonauts’ spacesuits for walking between Soyuz ships were later called Yastreb too.',
      source: `The flight’s README; ${SIDDIQI}, p. 559`,
      confidence: 'documented',
    },
  },
  'ussr/vostok/vostok-6': {
    flight: 'ussr/vostok/vostok-6',
    headline: 'The first woman in space, and the last Vostok',
    story:
      'Five women were chosen in 1962, none of them Air Force pilots. Kamanin, who ran the cosmonauts, chose Tereshkova over ' +
      'women with more flying or more learning behind them: “Tereshkova, she is a Gagarin in a skirt”, he wrote.\n\n' +
      'She flew three days, longer than all the American flights to then put together, in a cabin laid out for a longer ' +
      'reach than hers, and could not hold the ship’s attitude by hand until the last morning. She was judged afterwards by ' +
      'standards the men were never held to.',
    firsts: ['First woman in space'],
    source: `${SIDDIQI}, pp. 353, 362, 369 and 372; the flight’s README`,
    named: {
      why: 'Чайка (Chayka), “seagull”: Tereshkova’s call sign, and with Kedr the best known of them all.',
      source: 'The flight’s README; N. Yachmennikova, “Кедр, Кречет, Бурлак”, Rossiyskaya Gazeta, 24 August 2025',
      confidence: 'documented',
    },
  },
  'ussr/voskhod/voskhod-1': {
    flight: 'ussr/voskhod/voskhod-1',
    headline: 'Three men in a ship built for one',
    story:
      'Someone above Korolev wanted three cosmonauts up before the two-man Gemini; who, Siddiqi finds, the record does not ' +
      'say. Feoktistov, the engineer who would fly, proposed taking out the ejection seat and the suits, and for the first ' +
      'minute or so of the climb there was no way to save them if the rocket failed.\n\n' +
      'They flew a day and were the first cosmonauts to come down inside their ship. While they were up, Khrushchev, who ' +
      'had spoken to them on the third orbit, was removed from power.',
    firsts: ['First crew of more than one'],
    source: `${SIDDIQI}, pp. 385, 409 to 414, 423 and 427; the flight’s README`,
    named: {
      why:
        'Рубин (Rubin), “ruby”: Komarov’s call sign, which he carried again on Soyuz 1. Voskhod, “sunrise”, was the name ' +
        'chosen so the world would take the ship for a new one, not a Vostok with three couches.',
      source: `${SIDDIQI}, p. 385; the flight’s README; ${SF_MISSION}, Soyuz 1 (call sign “Ruby”)`,
      confidence: 'documented',
    },
  },
  'ussr/voskhod/voskhod-2': {
    flight: 'ussr/voskhod/voskhod-2',
    headline: 'The first walk in space, and a hard way home',
    story:
      'A Voskhod was given a cloth-and-rubber airlock that folded under the fairing and inflated in orbit. Leonov floated out for ' +
      'twelve minutes; his suit swelled so stiff that he could not get back in until he bled its pressure down.\n\n' +
      'The next day the automatic descent failed. Belyayev turned the ship and fired the engine by hand, an orbit late, and ' +
      'they came down in deep forest north of Perm, where they spent two nights in the snow before they could be got out.',
    firsts: ['First walk in space'],
    source: `${SIDDIQI}, pp. 448 to 460; the flight’s README`,
    named: {
      why: 'Алмаз (Almaz), “diamond”: the crew’s call sign on the radio.',
      source: 'The flight’s README',
      confidence: 'documented',
    },
  },
  'ussr/soyuz/soyuz-1': {
    flight: 'ussr/soyuz/soyuz-1',
    headline: 'The first Soyuz with a crew, and the first death in flight',
    story:
      'Komarov was to be joined in orbit by Soyuz 2, whose crew would walk across to him. Every uncrewed Soyuz before had ' +
      'failed somehow; one came home with a hole burned in its heat shield. In orbit one solar panel stayed folded and a ' +
      'sensor failed; Soyuz 2 was called off and he was brought down early.\n\n' +
      'The main parachute never left its container and the reserve did not fill; he died when the ship hit the ground. The ' +
      'commission blamed pressure and friction in the container; an account Siddiqi thinks likelier blames the factory, ' +
      'and a fault Soyuz 2 shared. The stories that he screamed on the way down are not borne out.',
    firsts: ['First death on a spaceflight'],
    source: `${SIDDIQI}, pp. 571 to 589`,
    named: {
      why: 'Рубин (Rubin), “ruby”: Komarov’s call sign, the one he had flown Voskhod under.',
      source: `${SF_MISSION}, Soyuz 1 (call sign “Ruby”); the Voskhod 1 README`,
      confidence: 'documented',
    },
  },
  'ussr/soyuz/soyuz-3': {
    flight: 'ussr/soyuz/soyuz-3',
    headline: 'Soyuz flies again, and misses its docking',
    story:
      'After Komarov, two uncrewed pairs docked by themselves. Beregovoy, at 47 the oldest man yet to fly, was brought by ' +
      'radar to 200 metres from the uncrewed Soyuz 2 and took over, and put his ship into the wrong attitude; the docking ' +
      'never came.\n\n' +
      'He came home safely four days after launch, the first man to fly a Soyuz and live.',
    firsts: [],
    source: `${SIDDIQI}, pp. 659 and 660`,
    named: {
      why: 'Аргон (Argon), the gas: Beregovoy’s call sign.',
      source: `${SF_MISSION}, Soyuz 3`,
      confidence: 'documented',
    },
  },
  'ussr/soyuz/soyuz-4': {
    flight: 'ussr/soyuz/soyuz-4',
    headline: 'Went up with one man, came home with three',
    story:
      'Shatalov launched alone, and the television showed two empty couches. On 16 January, two days after launch, he docked with Soyuz 5 by hand, ' +
      'and two of its crew climbed across outside. The press called the pair the first experimental space station.',
    firsts: ['First docking of two crewed ships'],
    source: `${SIDDIQI}, pp. 670 to 674`,
    named: {
      why: 'Амур (Amur), the river of the Far East: Shatalov’s call sign. He was Гранит (Granit) on his next two flights.',
      source: `${SF_MISSION}, Soyuz 4, Soyuz 8 and Soyuz 10`,
      confidence: 'documented',
    },
  },
  'ussr/soyuz/soyuz-5': {
    flight: 'ussr/soyuz/soyuz-5',
    headline: 'Two walked to the other ship; one rode it down',
    story:
      'Yeliseyev and Khrunov carried letters and newspapers across; Yeliseyev let his camera float away. Volynov came home ' +
      'alone, and the service module did not separate: the ship went in nose first, its hatch buckled, then its parachute ' +
      'lines twisted. He landed so hard that the roots of his upper teeth broke, 600 km from his mark.',
    firsts: ['First crew to move between ships in orbit'],
    source: `${SIDDIQI}, pp. 670 to 674`,
    named: {
      why: 'Байкал (Baikal), the lake: Volynov’s call sign.',
      source: `${SF_MISSION}, Soyuz 5`,
      confidence: 'documented',
    },
  },
  'ussr/soyuz/soyuz-6': {
    flight: 'ussr/soyuz/soyuz-6',
    headline: 'Three ships at once, and a welding machine',
    story:
      'Soyuz 6 had no docking gear; it was there to watch Soyuz 7 and 8 dock and to try welding in vacuum, which it did. ' +
      'The crew also looked for the flames of missiles launched at night from Tyuratam below them.',
    firsts: ['First welding in space'],
    source: `${SIDDIQI}, pp. 705 to 709`,
    named: {
      why: 'Антей (Antey), Antaeus, the giant of Greek myth: Shonin’s call sign.',
      source: `${SF_MISSION}, Soyuz 6`,
      confidence: 'documented',
    },
  },
  'ussr/soyuz/soyuz-7': {
    flight: 'ussr/soyuz/soyuz-7',
    headline: 'The target for a docking that never came',
    story:
      'Soyuz 7 was the passive ship for Soyuz 8. Five attempts to come together failed, the radar not locking and the ' +
      'crews unable to judge distance by eye in the Earth’s shadow. None of the photographs taken had been published thirty ' +
      'years later.',
    firsts: [],
    source: `${SIDDIQI}, pp. 706 to 709`,
    named: {
      why: 'Буран (Buran), “snowstorm”: Filipchenko’s call sign.',
      source: `${SF_MISSION}, Soyuz 7`,
      confidence: 'documented',
    },
  },
  'ussr/soyuz/soyuz-8': {
    flight: 'ussr/soyuz/soyuz-8',
    headline: 'Shatalov and Yeliseyev fly again, nine months on',
    story:
      'It was to have docked with Soyuz 7. Its radar failed, and the CIA, in a report released in 1997, counted five ' +
      'attempts, every one a miss. For the first time seven people were in orbit at once.',
    firsts: ['Three crewed ships in orbit at once'],
    source: `${SIDDIQI}, pp. 702 and 706 to 709`,
    named: {
      why: 'Гранит (Granit), “granite”: Shatalov’s call sign here and on Soyuz 10.',
      source: `${SF_MISSION}, Soyuz 8 and Soyuz 10`,
      confidence: 'documented',
    },
  },
  'ussr/soyuz/soyuz-9': {
    flight: 'ussr/soyuz/soyuz-9',
    headline: 'Eighteen days, and what it did to two men',
    story:
      'The flight was to take back the endurance record Gemini 7 had held for four years. They exercised twice a day, ' +
      'played chess with the ground and drew, and had the first food heater on a Soviet ship.\n\n' +
      'They could not get out of the ship by themselves and had to be carried; days later Kamanin found them pale, puffy and ' +
      'listless, worse than he had counted on. Two weeks and more without weight had taken a great deal out of them.',
    firsts: ['Longest flight to that day'],
    source: `${SIDDIQI}, pp. 702 and 724 to 728`,
    named: {
      why: 'Сокол (Sokol), “falcon”: Nikolayev’s call sign from Vostok 3, eight years before.',
      source: `${SF_MISSION}, Soyuz 9; the Vostok 3 README`,
      confidence: 'documented',
    },
  },
  'ussr/soyuz/soyuz-10': {
    flight: 'ussr/soyuz/soyuz-10',
    headline: 'Reached the first station, and could not go in',
    story:
      'Shatalov flew the final approach to Salyut by hand. After the probe caught, Soyuz’s attitude thrusters kept firing, ' +
      'overloading the mechanism that aligned the two ships. With the passage unsealed, the crew could not enter Salyut. ' +
      'They freed Soyuz from the station’s only port and came home early, making the first Soviet crewed landing at night.',
    firsts: ['First soft docking with a space station'],
    source: 'Chertok, Rockets and People, vol. 4, ch. 15; Kamanin, Hidden Cosmos, 25 April and 10 May 1971',
    named: {
      why: 'Гранит (Granit), “granite”: Shatalov’s call sign, as on Soyuz 8.',
      source: 'NASA, Mir Hardware Heritage, §1.7.3; Afanasyev and Vorontsov, The First Soyuz Spacecraft, p. 227',
      confidence: 'documented',
    },
  },
  'ussr/soyuz/soyuz-11': {
    flight: 'ussr/soyuz/soyuz-11',
    headline: 'The first crew to live in a station, lost coming home',
    story:
      'Leonov’s crew was to fly. Days before launch the doctors grounded Kubasov (one account says for a shadow on his lung), ' +
      'and the whole crew was replaced by its backups, a crew formed less than four months before.\n\n' +
      'They spent more than three weeks aboard Salyut, often on Soviet television. As the ship’s modules separated a ' +
      'breathing valve opened, and the cabin lost its air in under a minute. Within weeks the engineers were recommending ' +
      'that crews fly two to a ship, in pressure suits.',
    firsts: ['First crew aboard a space station'],
    source: `${SIDDIQI}, pp. 776 to 783`,
    named: {
      why: 'Янтарь (Yantar), “amber”: the crew’s call sign.',
      source: `${SF_MISSION}, Soyuz 11`,
      confidence: 'documented',
    },
  },
  'ussr/soyuz/soyuz-12': {
    flight: 'ussr/soyuz/soyuz-12',
    headline: 'Two cosmonauts take the rebuilt Soyuz back to orbit',
    story:
      'After Soyuz 11 lost its cabin air, engineers revised the valve and made room for two men in pressure suits. ' +
      'The station Lazarev and Makarov had trained to visit failed before they could fly to it, so they spent two days ' +
      'testing the ship on its own. They raised their orbit and photographed Earth in several bands of light before ' +
      'landing on the Kazakh steppe.',
    firsts: ['First crewed test of the redesigned Soyuz ferry'],
    source:
      'Mishin, State Commission address, 27 September 1973, pp. 92–93; NASA, Astronautics and Aeronautics, 1973, p. 273; Anatoly Zak, Soyuz 12',
    named: {
      why: 'Урал (Ural): the crew’s call sign, after the Ural Mountains. Lazarev was Ural-1 and Makarov was Ural-2.',
      source: 'NASA, Mir Hardware Heritage, §1.8.4.1; Gagarin Cosmonaut Training Center, biographies of Lazarev and Makarov',
      confidence: 'documented',
    },
  },
  'ussr/soyuz/soyuz-16': {
    flight: 'ussr/soyuz/soyuz-16',
    headline: 'A dress rehearsal for Apollo–Soyuz',
    story:
      'Filipchenko and Rukavishnikov took the 7K-TM into orbit seven months before the joint flight. They lowered the cabin ' +
      'pressure and raised the oxygen fraction to make it easier for crews to move between Soyuz and Apollo. NASA tracked ' +
      'Soyuz from its own ground stations so the two teams could compare their data.\n\n' +
      'A test ring on the nose stood in for Apollo. The crew checked capture, alignment and release. In the last test, ' +
      'they stopped the hooks partway through opening and fired the emergency release to separate the ring. The capsule ' +
      'landed north of Dzhezkazgan after almost six days in orbit.',
    firsts: ['First crewed rehearsal for Apollo–Soyuz'],
    source: 'TASS, Soyuz 16 flight chronicle, 18 December 1974, p. 1; NASA SP-4209, pp. 266–270',
    named: {
      why: 'Буран (Buran), “blizzard”, was the crew’s radio call sign. Filipchenko had also used it on Soyuz 7.',
      source: 'NASA, Mir Hardware Heritage, §1.9.3; Astronaut.ru, Soviet and Russian spacecraft crew call signs, Soyuz 7 and Soyuz 16',
      confidence: 'documented',
    },
  },
  'ussr/soyuz/soyuz-t-2': {
    flight: 'ussr/soyuz/soyuz-t-2',
    headline: 'The new Soyuz T finishes its first crewed docking by hand',
    story:
      'The previous winter an uncrewed Soyuz T had already docked with Salyut 6. Malyshev and Aksyonov took the new ' +
      'ferry up to test it with people aboard, including the Argon-16 digital flight computer and the propulsion system ' +
      'that fed the main engine and small thrusters from the same supply.\n\n' +
      'On the final approach the rendezvous system lost its radar lock, and Malyshev brought the ship to the station’s ' +
      'aft port by hand. The crew visited Leonid Popov and Valery Ryumin and returned in their own capsule after about 65 hours docked.',
    firsts: ['First crewed Soyuz T flight'],
    source:
      'V. I. Vasilyev, Manned Spaceflight, no. 4 (41), 2021, pp. 118–120, 129–131. NASA, Mir Hardware Heritage, §§1.12.3.1–1.12.3.2 and p. 85. Spacefacts, Soyuz T-2 (docking and undocking times)',
    named: {
      why: 'Юпитер (Yupiter), the Russian name for Jupiter, was the crew’s radio call sign.',
      source: 'V. I. Vasilyev, Manned Spaceflight, no. 4 (41), 2021, p. 118. NASA, Mir Hardware Heritage, §1.12.3.2',
      confidence: 'documented',
    },
  },
  'usa/apollo/apollo-7': {
    flight: 'usa/apollo/apollo-7',
    headline: 'Eleven days to prove the rebuilt Apollo',
    story:
      'The first Apollo with a crew flew twenty-one months after the fire, to show that the redesigned command and ' +
      'service module could be trusted with three men. It worked: the big engine of the service module fired eight ' +
      'times, the crew rendezvoused with their spent upper stage, and they sent the first live television from an ' +
      'American spacecraft.\n\nIt was not a comfortable flight. Schirra caught a bad head cold about an hour after ' +
      'launch and the other two had it the next day, for most of eleven days in a small cabin. Schirra became the ' +
      'first person to go into space three times; none of the three flew again.',
    firsts: ['First crewed Apollo flight', 'First live television from a US spacecraft'],
    source:
      `${ABTN}, Apollo 7, pp. 14 to 17 (objectives, the cold, the television, "the first person to make three trips into space"); ` +
      `${FACT_BOOK} (each man's flights: Schirra's last is Apollo 7, Eisele's and Cunningham's only)`,
    named: {
      why:
        'No name. After Grissom’s "Molly Brown" on Gemini 3 (an allusion to the unsinkable heroine, and to Liberty ' +
        'Bell 7 sinking), NASA called its flights by the programme and a number. The command module was simply ' +
        'Apollo 7. Chariots for Apollo says officials turned the name down, though it was used on the day.',
      source:
        `${CHARIOTS}, p. 292; ${CALLSIGNS} (Apollo 7: "Apollo 7", no lunar module); Hacker and Grimwood, On the Shoulders of Titans, ` +
        'NASA SP-4203, p. 233 (Cooper at launch: "You\'re on your way, Molly Brown")',
      confidence: 'documented',
    },
  },
  'usa/apollo/apollo-8': {
    flight: 'usa/apollo/apollo-8',
    headline: 'The first crew to leave the Earth, and to see it whole',
    story:
      'The lunar module would not be ready for a flight in December 1968, so on 19 August NASA put a test article ' +
      'in its place and told the crew to train for the Moon. After Apollo 7 came home the decision was made, on ' +
      '12 November, five weeks before launch: the first crewed Saturn V would go to lunar orbit.\n\nBorman, Lovell and ' +
      'Anders went round the Moon ten times on Christmas Eve, read from Genesis to the people watching, and came home ' +
      'with the photograph of the Earth rising. Everything rode on one engine: if the service module’s engine had ' +
      'failed behind the Moon, there was no other way home.',
    firsts: ['First crew to leave Earth orbit', 'First crew in orbit round the Moon'],
    source: `${ABTN}, Apollo 8, pp. 32 to 34 (the decisions of 19 August and 12 November, the risks, the first piloted Saturn V), p. 38 (Genesis), p. 49`,
    named: {
      why:
        'No name: like Apollo 7, it went by the programme and a number, under the practice NASA had kept since Gemini 3. ' +
        'Apollo 8 carried no lunar module, only a test article for its weight, so one name was enough.',
      source: `${CALLSIGNS} (Apollo 8: "Apollo 8", no lunar module); ${CHARIOTS}, p. 292; ${ABTN}, p. 32 (the LM test article)`,
      confidence: 'documented',
    },
  },
  'usa/apollo/apollo-9': {
    flight: 'usa/apollo/apollo-9',
    headline: 'The lunar module, flown for the first time with a crew',
    story:
      'Before anyone trusted a lander at the Moon, it had to fly with men in it near home. For ten days in Earth orbit ' +
      'McDivitt, Scott and Schweickart docked with Spider, flew it apart from Gumdrop, fired its descent and ascent ' +
      'engines, and brought the two craft back together. Schweickart was sick twice early in the flight, so his ' +
      'excursion was kept to one daylight period; he still stood outside on the lander’s porch in the suit and ' +
      'backpack the moonwalkers would wear.',
    firsts: ['First crewed flight of a lunar module'],
    source: `${ABTN}, Apollo 9, pp. 52 to 56 (the objectives, the EVA from the "porch", the rendezvous); ${CHARIOTS}, pp. 292 to 299 (pp. 294 to 296: the illness and the one daylight period)`,
    named: {
      why:
        'Two craft flying apart needed two names, so Apollo 9 brought call signs back. The lander was Spider, for its ' +
        'long thin legs and bug-like body. The command module arrived in Florida in blue wrapping that made it look ' +
        'like a wrapped sweet, so it became Gumdrop.',
      source: `${CHARIOTS}, p. 292; ${CALLSIGNS}`,
      confidence: 'documented',
    },
  },
  'usa/apollo/apollo-10': {
    flight: 'usa/apollo/apollo-10',
    headline: 'Everything of a landing but the landing',
    story:
      'Apollo 10 flew the whole lunar mission short of touching down, to prove the lander, the navigation and the ' +
      'tracking at the Moon itself. Stafford and Cernan took Snoopy down to 47,400 feet over the planned landing ' +
      'zone while Young waited in orbit, then climbed back and docked. Its crew had been to space before, all three, ' +
      'and two of them went back to walk there: Young on Apollo 16, Cernan on 17.',
    firsts: ['First lunar module flown at the Moon'],
    source: `${ABTN}, Apollo 10, pp. 72 to 76 (crew, objectives, "dress rehearsal", lowest point 47,400 ft); pp. 212 and 240 (Young and Cernan later)`,
    named: {
      why:
        'For the Peanuts comic strip. The command module was Charlie Brown, who would watch over his beagle, and the ' +
        'lander Snoopy, because it would go "snooping" round the surface in low orbit. At the Manned Spacecraft ' +
        'Center a silver Snoopy pin was the award for outstanding work.',
      source: CALLSIGNS,
      confidence: 'documented',
    },
  },
  'usa/apollo/apollo-11': {
    flight: 'usa/apollo/apollo-11',
    headline: 'The landing Kennedy asked for, with five months to spare',
    story:
      'Eight years after Kennedy asked for it, Armstrong and Aldrin landed Eagle in the Sea of Tranquility on ' +
      '20 July 1969. The descent was the hard part: the computer raised alarm after alarm, and the automatic system ' +
      'was taking them into a crater strewn with boulders, so Armstrong took over and flew on past it. They spent ' +
      'about two and a half hours outside and lifted off the next day to rejoin Collins in Columbia.\n\nIt met the ' +
      'goal of the decade; every landing after it was for what could be learned there.',
    firsts: ['First landing on the Moon', 'First person to walk on the Moon'],
    source: `${ABTN}, Apollo 11, p. 94 (the crater "with boulders of five to ten feet in diameter and larger. Consequently, he switched to manual attitude control"), pp. 107 and 108 (the 1202 alarms, landing, first step, liftoff)`,
    named: {
      why:
        'The command module was Columbia, after Jules Verne’s moon gun, the Columbiad, and for the word’s ties to the ' +
        'nation’s founding. The lander was Eagle, after the bird on the mission’s insignia.',
      source: CALLSIGNS,
      confidence: 'documented',
    },
  },
  'usa/apollo/apollo-12': {
    flight: 'usa/apollo/apollo-12',
    headline: 'A landing aimed at a place, after a launch through lightning',
    story:
      'Apollo 12 was launched into a rainstorm and was struck by lightning twice in its first minute; the spacecraft ' +
      'lost its power for a moment and its lamps lit up, but the rocket flew on and the crew put it right. Four days ' +
      'later Conrad landed Intrepid within walking distance of Surveyor III, a robot that had been there two and a half ' +
      'years, and he and Bean brought home parts of it for the engineers to see what the Moon had done to them.',
    firsts: ['First precision landing on the Moon'],
    source: `${ABTN}, Apollo 12, p. 113 (the lightning, at 36.5 and 52 seconds by the timeline: "the vehicle had indeed been struck"; power lost; "Numerous indicator lamps"), pp. 116 and 118`,
    named: {
      why:
        'Both names were chosen from names put forward by employees of the contractors: Yankee Clipper by those of the ' +
        'command module’s builder, Intrepid by those of the lunar module’s.',
      source: CALLSIGNS,
      confidence: 'documented',
    },
  },
  'usa/apollo/apollo-13': {
    flight: 'usa/apollo/apollo-13',
    headline: 'The landing given up, and the crew brought home',
    story:
      'Three days before launch Mattingly was taken off the crew, exposed to German measles, and Swigert flew in his ' +
      'place. Fifty-six hours out an oxygen tank in the service module failed, and with it the power and the air the ' +
      'command module needed for the rest of the trip.\n\nThe lunar module, built for two men for a short stay, kept ' +
      'three alive; its descent engine put them back on course round the Moon, and they came down safely in the ' +
      'Pacific on 17 April. The cause was a heater whose switches had been made for a lower voltage than the ground ' +
      'equipment used.',
    firsts: [],
    source: `${ABTN}, Apollo 13, p. 136 (rubella), pp. 139 to 141 (the failure and the lifeboat), p. 143 (the splashdown) and p. 146 (the cause)`,
    named: {
      why:
        'Odyssey, for the long voyage of Odysseus. Aquarius, for the water carrier; the explanation given was that ' +
        'Aquarius brought life and knowledge to the Nile valley, as the crew hoped to bring knowledge back from the ' +
        'Moon. (The book that records it calls Aquarius an Egyptian god, which is its own slip.)',
      source: CALLSIGNS,
      confidence: 'documented',
    },
  },
  'usa/apollo/apollo-14': {
    flight: 'usa/apollo/apollo-14',
    headline: 'Shepard goes back, to the place Apollo 13 could not reach',
    story:
      'Apollo 14 took Apollo 13’s target, the hills of Fra Mauro, and the man who had been the first American in ' +
      'space. Getting there was not easy: the command module docked with the lander only at the sixth try, and on ' +
      'the way down a faulty abort switch had to be worked round so that the computer would not end the landing on ' +
      'its own. On the surface Shepard and Mitchell pulled their tools in a two-wheeled cart, and Shepard hit two golf ' +
      'balls before climbing back in.',
    firsts: [],
    source: `${ABTN}, Apollo 14, p. 162 (the first five docking attempts), p. 163 (the abort switch and the landing) and p. 166 (the golf balls); the cart: JSC Biographical Data, Stuart A. Roosa ("first use of the Mobile Equipment Transporter")`,
    named: {
      why:
        'Kitty Hawk, for the place of the Wright brothers’ first flight. Antares, for the star the lander would be ' +
        'oriented by for the landing.',
      source: CALLSIGNS,
      confidence: 'documented',
    },
  },
  'usa/apollo/apollo-15': {
    flight: 'usa/apollo/apollo-15',
    headline: 'The first of the long expeditions, with a car',
    story:
      'Apollo 15 was the first "J" mission: a lander that could stay three days, a car to range over the ground, and ' +
      'cameras and instruments in the service module for the man left in orbit. Scott and Irwin drove the rover over ' +
      'the plain between Hadley Rille and the foot of the Apennine Mountains. On the way home Worden went outside into deep ' +
      'space to fetch the film from the cameras.',
    firsts: ['First crew to drive on the Moon'],
    source: `${ABTN}, Apollo 15, p. 184 (the Type J, the LRV, the site), p. 196 (Worden's transearth EVA) and p. 207`,
    named: {
      why:
        'Endeavour, for the ship that carried Captain James Cook on his scientific voyages of the eighteenth century. ' +
        'Falcon, for the mascot of the Air Force Academy, named by a crew who were all Air Force officers.',
      source: CALLSIGNS,
      confidence: 'documented',
    },
  },
  'usa/apollo/apollo-16': {
    flight: 'usa/apollo/apollo-16',
    headline: 'Into the highlands, to find what the Moon’s crust is made of',
    story:
      'Apollo 16 went to the Descartes region, the rough central highlands, to sample the old crust far from the ' +
      'dark plains of lava. Young and Duke, on Duke’s first flight and Young’s fourth, drove the second rover over the ' +
      'roughest ground yet. Mattingly, who had been taken off Apollo 13 after an exposure to German measles, flew ' +
      'the command module and stepped outside on the way home to fetch its film.',
    firsts: [],
    source: `${ABTN}, Apollo 16, p. 212 (objectives, crew, Mattingly's history) and p. 224 (the transearth EVA); ${JSC_BIO}, Charles M. Duke, Jr. (the highlands, Orion, "the roughest and blockiest surface yet")`,
    named: {
      why:
        'Casper, for Casper the Friendly Ghost, because the crew’s white suits looked shapeless on television. Orion, ' +
        'for the constellation, because the crew would steer by the stars between the Earth and the Moon.',
      source: CALLSIGNS,
      confidence: 'documented',
    },
  },
  'usa/apollo/apollo-17': {
    flight: 'usa/apollo/apollo-17',
    headline: 'The last of the six landings, and the first scientist',
    story:
      'The last Apollo to the Moon carried a geologist, Harrison Schmitt, with Cernan to the valley of Taurus-Littrow ' +
      'for three days on the surface, while Evans mapped from orbit. They found orange soil at Shorty Crater, a sign ' +
      'of volcanic glass. When Challenger lifted off on 14 December 1972 it closed the programme; no one has walked on ' +
      'the Moon since.',
    firsts: ['First scientist on the Moon'],
    source: `${ABTN}, Apollo 17, pp. 240 to 263 (crew, Taurus-Littrow, the orange soil "believed to be of volcanic origin", the liftoff)`,
    named: {
      why:
        'America, as a tribute and thanks to the American people who made Apollo possible. Challenger, for the ' +
        'challenges of the future beyond Apollo.',
      source: CALLSIGNS,
      confidence: 'documented',
    },
  },
  'usa/skylab/skylab-2': {
    flight: 'usa/skylab/skylab-2',
    headline: 'The crew that made Skylab habitable',
    story:
      'From the open Apollo hatch, Weitz tried to free the workshop’s surviving solar wing while Conrad flew alongside and Kerwin held his legs. ' +
      'The metal trapping the wing held. Once aboard, the crew pushed a folding parasol out through a scientific airlock. In its shade the workshop cooled.' +
      '\n\n' +
      'On 7 June Conrad and Kerwin went outside with a cable cutter on a pole. With the strip of metal cut, they pulled the wing free. ' +
      'Power from its solar cells let the crew run experiments that had been waiting for electricity. Their Apollo brought all three back on 22 June.',
    firsts: ['First crew of an American space station'],
    source:
      'Kennedy Space Center, Skylab Program, p. XI-2 (NTRS 19740015280). NASA, Skylab 2 Astronauts Deploy Jammed Solar Array During Spacewalk (2023).',
    named: {
      why: 'NASA counted the station itself as Skylab 1. The Apollo that brought its first crew to orbit was Skylab 2.',
      source: 'Kennedy Space Center, Skylab Program, pp. XI-1–XI-2 (NTRS 19740015280)',
      confidence: 'documented',
    },
  },
  'usa/gemini/gt-8': {
    flight: 'usa/gemini/gt-8',
    headline: 'The first docking, and the first spin out of control',
    story:
      'Gemini 8 was to dock with an Agena and spend three days practising with it, Dave Scott going outside with a backpack. ' +
      'Armstrong made the rendezvous and the docking look easy.\n\n' +
      'Then, out of radio contact, one thruster stuck open, probably through an electrical short, and would not stop firing. The pair rolled, and after ' +
      'Armstrong pulled the Gemini free it spun near one turn a second, the crew dizzy and the dials blurred, until he cut ' +
      'out the manoeuvring system and steadied the ship on its re-entry thrusters. Mission rules then sent them home, to a ' +
      'destroyer in the Pacific. The fix was a switch that cut the thrusters’ power, and the docking had been proved.',
    firsts: ['First docking in orbit'],
    source: 'Hacker and Grimwood, On the Shoulders of Titans, NASA SP-4203 (1977), pp. 304 to 321 and Appendix B, p. 526',
    named: {
      why:
        'It has no name. After Gemini 3’s "Molly Brown" NASA referred to its spacecraft officially by a Roman numeral, and the ' +
        'ground called this one by it: "Gemini VIII, CSQ Cap Com."',
      source:
        'SP-4203, p. 233 ("Later spacecraft were officially referred to by a Roman numeral, although a few had nicknames as well") and p. 314',
      confidence: 'documented',
    },
  },
  'usa/gemini/gt-9a': {
    flight: 'usa/gemini/gt-9a',
    headline: 'A replacement crew, a jammed target, a walk too hard',
    story:
      'Gemini 9 lost its crew three months before launch, when Elliot See and Charles Bassett were killed flying to St. ' +
      'Louis; their backups, Tom Stafford and Gene Cernan, flew it. It lost its Agena too, when the Atlas carrying it failed, ' +
      'and became 9A with a simpler target whose shroud then failed to come off.\n\n' +
      'Stafford flew three kinds of rendezvous with it all the same. Cernan’s walk, meant to end in a test of the Air ' +
      'Force’s rocket backpack, became a struggle with too few handholds, a suit that overheated and a faceplate that ' +
      'fogged; it was called off, and what it taught shaped every walk after it.',
    firsts: [],
    source: 'SP-4203, pp. 323 to 339 and Appendix B, p. 527',
    named: {
      why:
        'It has no name: the spacecraft was Gemini IX-A, officially by its numeral as every Gemini after "Molly Brown" was. ' +
        'The A is for the second attempt, after its target was lost on 17 May.',
      source: 'SP-4203, p. 233; Appendix B, p. 527 (note 15: "Atlas failure on 17 May 1966, mission rescheduled")',
      confidence: 'documented',
    },
  },
  'usa/gemini/gt-10': {
    flight: 'usa/gemini/gt-10',
    headline: 'Two targets, and the Agena’s engine as a ride',
    story:
      'John Young and Michael Collins docked with their own Agena and used its engine to climb higher than any crew had ' +
      'been, then to chase the Agena Gemini 8 had left behind. The first rendezvous used three times the fuel of any before it, ' +
      'so docking practice was dropped.\n\n' +
      'Collins stood in the open hatch to photograph the southern Milky Way, and the next day went out on a line to the old Agena, the first ' +
      'person to reach another craft in orbit. Cernan had warned him how hard it would be, and it was: the Agena had nothing ' +
      'to hold, and he came back tangled in his umbilical.',
    firsts: ['First crew boosted by a docked rocket stage', 'First visit to another craft in orbit'],
    source: 'SP-4203, pp. 341 to 350 and Appendix B, p. 527',
    named: {
      why:
        'It has no name: "Your range, Gemini X, is 95 miles." After "Molly Brown" NASA used the Roman numeral officially for ' +
        'every Gemini.',
      source: 'SP-4203, pp. 233 and 348',
      confidence: 'documented',
    },
  },
  'usa/gemini/gt-11': {
    flight: 'usa/gemini/gt-11',
    headline: 'Rendezvous in one orbit, and the highest ride yet',
    story:
      'Pete Conrad and Dick Gordon caught their Agena before they had been once round the Earth, as a lunar module would ' +
      'have to. Gordon’s walk did not go so well: astride the nose tying a tether to the Agena, he fought his suit until ' +
      'sweat blinded him and Conrad brought him in after 33 minutes of a planned 107.\n\n' +
      'Then the Agena’s engine took them 1,369 km up, where Conrad found the world round and blue. They flew the two craft ' +
      'joined by the tether, turning about each other, and came down with the computer flying the re-entry, the first time ' +
      'one was flown so, to within a few kilometres of the ship.',
    firsts: ['First rendezvous on the first orbit', 'Highest Earth orbit flown to that day'],
    source: 'SP-4203, pp. 354 to 370 and Appendix B, p. 528; NASA JSC biographical data, Richard F. Gordon, Jr. (November 2017)',
    named: {
      why:
        'It has no name: "Gemini XI, you’re GO for M equals 1." After "Molly Brown" NASA referred to each Gemini officially ' +
        'by its Roman numeral.',
      source: 'SP-4203, pp. 233 and 358',
      confidence: 'documented',
    },
  },
  'usa/gemini/gt-12': {
    flight: 'usa/gemini/gt-12',
    headline: 'The last Gemini: learning to work outside',
    story:
      'By its commander’s account Gemini 12 had no mission of its own; it had a theme, to find out why working outside was ' +
      'so hard. Buzz Aldrin trained under water, where moving is like moving in a pressurised suit, and flew with forty-four ' +
      'restraints where Gemini 9A had nine.\n\n' +
      'With Jim Lovell he docked with the Agena though the radar failed, by charts and sums, and in three periods outside ' +
      'Aldrin worked slowly and deliberately through what was planned for him. What was remembered of the flight was his ' +
      'work outside, and Gemini ended with its landing.',
    firsts: ['Work outside shown to be possible'],
    source: 'SP-4203, pp. 372 to 382 and Appendix B, p. 529',
    named: {
      why: 'It has no name: it is Gemini XII, by the Roman numeral NASA gave every Gemini officially after "Molly Brown".',
      source: 'SP-4203, p. 233',
      confidence: 'documented',
    },
  },
  'usa/mercury/mr-3-freedom-7': {
    flight: 'usa/mercury/mr-3-freedom-7',
    headline: 'The first American in space: fifteen minutes up and down',
    story:
      'Mercury’s first flight with a man aboard was to show that one could be sent into space and brought back, and could work ' +
      'there. The Redstone could not reach orbit, so it was an arc down the Atlantic, and Gagarin had been round the world three ' +
      'weeks before in a ship that flew itself. Shepard took the controls and turned his capsule by hand in pitch, yaw and roll.' +
      '\n\n' +
      'Twenty days later Kennedy asked Congress for the Moon.',
    firsts: ['First American in space'],
    source: `Postlaunch Report for Mercury-Redstone No. 3 (NASA STG, 16 June 1961); ${TNO}, pp. 341 to 363`,
    named: {
      why:
        'Shepard named his capsule Freedom and added a 7 for the seven astronauts; it was also McDonnell’s spacecraft No. 7. ' +
        'Every Mercury pilot after him kept the 7.',
      source:
        'M. Neufeld, “First American In Space: The Flight of Alan B. Shepard”, Smithsonian National Air and Space Museum, 5 May 2021; ' +
        `${TNO}, pp. 368, 446, 470 and 492`,
      confidence: 'documented',
    },
  },
  'usa/mercury/mr-4-liberty-bell-7': {
    flight: 'usa/mercury/mr-4-liberty-bell-7',
    headline: 'The second American in space, and a capsule lost',
    story:
      'A repeat of Shepard’s flight in a better capsule: a window in front of the pilot, and a hatch that explosive bolts could ' +
      'throw off so that he could get out without help. After splashdown it went off before the helicopter had hold, the ' +
      'capsule filled and sank, and Grissom, his suit letting in water, was nearly drowned before he was lifted out.' +
      '\n\n' +
      'Why the hatch fired has never been settled. This New Ocean (1966) lists the theories and says the cause could not be ' +
      'found with the capsule on the sea floor; On the Shoulders of Titans (1977) puts it to a faulty circuit. Grissom said he ' +
      'never touched the plunger, and he was the one pilot to use that hatch without bruising his hand. The capsule was raised in 1999.',
    firsts: [],
    source: `${TNO}, pp. 368 to 377; ${TITANS}, p. 233`,
    named: {
      why:
        'Grissom chose Liberty Bell 7 for a bell-shaped capsule, because the name was to Americans almost another word for ' +
        'freedom, and the 7 for the teamwork of the seven. A crack was painted down its side, as the bell in Philadelphia has.',
      source: `${TNO}, p. 368; the crack from NASA’s photographs of the capsule (spacecraft.md, “Paint”)`,
      confidence: 'documented',
    },
  },
  'usa/mercury/ma-6-friendship-7': {
    flight: 'usa/mercury/ma-6-friendship-7',
    headline: 'The first American in orbit',
    story:
      'Two Russians had been round the world before an American went once. Glenn’s flight slipped for a month, through cloud and ' +
      'a leak in the Atlas, and when it went a small thruster failed and he flew most of it by hand. A signal said the heat ' +
      'shield had come loose, so he came down with the retropack left on to hold it, its straps burning away past the window. ' +
      'The signal was false.' +
      '\n\n' +
      'He came home the most famous man in America, and did not fly again for thirty-six years.',
    firsts: ['First American in orbit'],
    source: `${TNO}, chapter 13, pp. 420 to 437; ${FACT_BOOK}, Glenn (Mercury 6, STS-95)`,
    named: {
      why: 'Named in a contest within Glenn’s own family. The 7 is the Mercury Seven’s.',
      source: `${TNO}, p. 420`,
      confidence: 'documented',
    },
  },
  'usa/mercury/ma-7-aurora-7': {
    flight: 'usa/mercury/ma-7-aurora-7',
    headline: 'Three orbits given to science, and a landing far off',
    story:
      'The second American orbital flight was handed to experiments: a tethered balloon, the behaviour of liquids, the horizon ' +
      'through filters. A horizon scanner fed the autopilot false attitudes from the start, Carpenter spent his fuel freely, and he ' +
      'fired the retrorockets by hand and late. He came down 250 nautical miles beyond the ships and climbed out into his raft; ' +
      'an aeroplane found him in 36 minutes, a helicopter lifted him out after three hours, and for some of that time the country ' +
      'did not know whether he was alive.' +
      '\n\n' +
      'Carpenter never flew in space again.',
    firsts: [],
    source: `${TNO}, chapter 13, pp. 443 to 458; NASA TN D-3814 (1967), the recovery`,
    named: {
      why:
        'Carpenter chose Aurora because he thought of Project Mercury, conducted in the open, as a light in the sky, and because ' +
        'aurora means dawn: “the dawn of a new age. The 7, of course, stands for the original seven astronauts.” As a boy he had ' +
        'lived at the corner of Aurora and Seventh Avenues in Boulder.',
      source: `${TNO}, p. 446`,
      confidence: 'documented',
    },
  },
  'usa/mercury/ma-8-sigma-7': {
    flight: 'usa/mercury/ma-8-sigma-7',
    headline: 'Six orbits flown with care, to show a day was possible',
    story:
      'Nearly twice as long as any Mercury before it, and flown to show how little fuel a careful pilot needed. Schirra drifted for ' +
      'hours with the jets off, fired the retrorockets by the clock and came down in the Pacific four miles from the carrier, and ' +
      'stayed in his capsule until it stood on her deck. The next Mercury was sent up for a day and a half.',
    firsts: [],
    source: `${TNO}, chapter 14, pp. 465 to 490`,
    named: {
      why:
        'Sigma, the engineer’s sign for a sum, in honour of the engineering behind a flight that was itself an engineering ' +
        'test. The 7 is the Mercury Seven’s.',
      source: `${TNO}, p. 470`,
      confidence: 'documented',
    },
  },
  'usa/mercury/ma-9-faith-7': {
    flight: 'usa/mercury/ma-9-faith-7',
    headline: 'Mercury’s last flight: a day and a half in orbit',
    story:
      'A capsule built for a few hours was changed in 183 ways to last a day and more. Cooper slept, ate, threw out a flashing ' +
      'beacon and found it again, and said he could see roads, houses and the smoke from chimneys, which not everyone on the ' +
      'ground believed. On the last orbits ' +
      'a short circuit took the autopilot and the instruments, and he flew the retrofire and the entry by hand.' +
      '\n\n' +
      'NASA flew no more Mercurys. Two years went by before the next American flight.',
    firsts: ['First American more than a day in space'],
    source: `${TNO}, chapter 14, pp. 489 to 503`,
    named: {
      why:
        'Cooper’s Faith 7 stood for “my trust in God, my country, and my teammates”. NASA’s press officers worried, the ' +
        'Washington Post reported, how it would read if the capsule were lost at sea: “The United States today lost Faith.”',
      source: `${TNO}, p. 492`,
      confidence: 'documented',
    },
  },
  'usa/gemini/gt-3': {
    flight: 'usa/gemini/gt-3',
    headline: 'The first crewed Gemini: the first crew to steer in orbit',
    story:
      'Three orbits to prove a new two-man ship and its Titan II. Grissom and Young fired the thrusters three times, changing ' +
      'the orbit, and came down short of the carrier because Gemini made less lift in the air than the wind tunnels had said. ' +
      'Young had smuggled a corned beef sandwich aboard, and Congress heard about it.' +
      '\n\n' +
      'Ten Gemini crews followed in less than twenty months.',
    firsts: ['First crew to change their orbit'],
    source: `${TITANS}, pp. 232 to 237, foreword and Appendix B`,
    named: {
      why:
        'Grissom had lost Liberty Bell 7 to the sea, so he called this one Molly Brown, after the “unsinkable” heroine of a ' +
        'Broadway musical. NASA’s leaders thought it lacked dignity, but his second choice was Titanic, and they let it stand. ' +
        'Later Geminis were known officially by their numbers.',
      source: `${TITANS}, p. 233`,
      confidence: 'documented',
    },
  },
  'usa/gemini/gt-4': {
    flight: 'usa/gemini/gt-4',
    headline: 'Four days, and the first American to walk in space',
    story:
      'Gemini 4 was to fly four days, twice as long as any American, and to try two new things. Ed White went outside on a ' +
      'tether, moving himself with a hand-held gas gun. Jim McDivitt tried to fly alongside their spent second stage and could ' +
      'not close on it: thrusting toward a thing in orbit takes you higher and slower, and the crew had had no way to practise.' +
      '\n\n' +
      'It was the first flight run from Houston. White died in the Apollo 1 fire nineteen months later.',
    firsts: ['First flight run from Houston', 'First American spacewalk'],
    source: `${TITANS}, pp. 239 to 254; ${JSC_BIO}, Edward H. White II (December 1997)`,
    named: {
      why:
        'It had no name, official or otherwise, and its pilots wore no patch of their own. A few newsmen called it Little Eva, ' +
        'for the walk outside.',
      source: `${TITANS}, p. 245, note`,
      confidence: 'documented',
    },
  },
  'usa/gemini/gt-5': {
    flight: 'usa/gemini/gt-5',
    headline: 'Eight days: as long as a trip to the Moon and back',
    story:
      'Apollo would need men to live a week in space, so Gemini 5 was to stay up for eight days, the first crewed ship to run on ' +
      'fuel cells. Within hours the cells’ oxygen pressure fell so low that the flight was nearly called down; Cooper and Conrad ' +
      'powered down, drifted and waited, and the pressure held. They lasted the eight days and took the endurance record from ' +
      'the Soviet Union.',
    firsts: ['Eight days in orbit, a new record'],
    source: `${TITANS}, pp. 213, 256 to 262, foreword and Appendix B`,
    named: {
      why:
        'NASA’s headquarters allowed no names by then. Cooper wanted a patch instead: a covered wagon, after a model Conrad’s ' +
        'father-in-law had whittled, and the motto “Eight days or bust”. Webb approved the patch and struck the motto, in case ' +
        'the flight came home early and was said to have bust. It was the first crew patch of the programme.',
      source: `${TITANS}, pp. 245 (note) and 256`,
      confidence: 'documented',
    },
  },
  'usa/gemini/gt-7': {
    flight: 'usa/gemini/gt-7',
    headline: 'Fourteen days in orbit, and a target for Gemini 6A',
    story:
      'Gemini 7 was to show that men and ship could last two weeks, longer than any Apollo flight would take. When Gemini 6 lost ' +
      'its Agena target, Gemini 7 was made into one: Borman and Lovell flew up first, wore a lighter suit they could take off in ' +
      'the cabin, and eleven days in had company. They came down on 18 December with the record, and three years later flew ' +
      'together to the Moon.',
    firsts: ['Two weeks in orbit'],
    source: `${TITANS}, pp. 277 to 292, foreword and Appendix B; ${JSC_BIO}, Frank Borman`,
    named: {
      why: 'No name: after Molly Brown, Geminis went by their numbers.',
      source: `${TITANS}, p. 233`,
      confidence: 'documented',
    },
  },
  'usa/gemini/gt-6a': {
    flight: 'usa/gemini/gt-6a',
    headline: 'The first meeting of two ships in orbit',
    story:
      'Gemini 6 was to meet and dock with an Agena, which blew up on its way to orbit on 25 October 1965. NASA flew the crew ' +
      'to Gemini 7 instead. On 12 December the Titan lit and shut down on the stand, and Schirra chose not to eject; three days ' +
      'later it flew, and that afternoon 6A came to a stop 40 metres from Gemini 7. For more than three orbits the two flew ' +
      'together, at times thirty centimetres apart.' +
      '\n\n' +
      'Then they went home, playing “Jingle Bells” over the radio.',
    firsts: ['First rendezvous in orbit'],
    source: `${TITANS}, pp. 283 to 292 and 298; ${JSC_BIO}, Walter M. Schirra`,
    named: {
      why: 'No name: after Molly Brown, Geminis went by their numbers. The A is for the second try at Gemini 6’s mission.',
      source: `${TITANS}, p. 233`,
      confidence: 'documented',
    },
  },
};

export const PEOPLE: readonly Person[] = [
  {
    id: 'gagarin',
    name: 'Yuri A. Gagarin',
    native: 'Юрий Алексеевич Гагарин',
    born: '1934-03-09',
    died: '1968-03-27',
    nation: 'USSR',
    flights: ['ussr/vostok/vostok-1'],
    bio:
      'An Air Force pilot of 27, one of the twenty men of the first cosmonaut group. After his one orbit he was kept on the ' +
      'ground, made a colonel and, in 1963, a deputy director of the cosmonauts’ training centre, with no chance of flying in ' +
      'space again soon. He went back to flying aircraft in 1968 and was killed in a MiG-15 trainer with his instructor, ' +
      'Vladimir Seregin, that March. Hundreds of thousands of Muscovites watched his ashes go to the Kremlin wall.',
    source: `${CREWS}; ${SIDDIQI}, pp. 375 and 627 to 628`,
    confidence: 'documented',
  },
  {
    id: 'titov',
    name: 'Gherman S. Titov',
    native: 'Герман Степанович Титов',
    born: '1935-09-11',
    died: '2000-09-20',
    nation: 'USSR',
    flights: ['ussr/vostok/vostok-2'],
    bio:
      'Gagarin’s backup, and only 25 when he flew Vostok 2. On his day in orbit he was the first person to be sick in space, ' +
      'and told the ground that all was in order. He never flew again, and left the cosmonaut group in 1970.',
    source: `${CREWS}; ${SIDDIQI}, pp. 292 and 293; ${SPACEFACTS}, Gherman Titov`,
    confidence: 'documented',
  },
  {
    id: 'nikolayev',
    name: 'Andriyan G. Nikolayev',
    native: 'Андриян Григорьевич Николаев',
    born: '1929-09-05',
    died: '2004-07-03',
    nation: 'USSR',
    flights: ['ussr/vostok/vostok-3', 'ussr/soyuz/soyuz-9'],
    bio:
      'A pilot from Chuvashia in the first group, Titov’s backup on Vostok 2. He flew four days in Vostok 3 and, in 1970, ' +
      'eighteen in Soyuz 9, a record. He married Valentina Tereshkova; their daughter Elena spoke to him by video from the ' +
      'control centre on her birthday during Soyuz 9.',
    source: `${SPACEFACTS}, Andrian Nikolayev; ${SIDDIQI}, p. 726; the Vostok 2 README`,
    confidence: 'documented',
  },
  {
    id: 'popovich',
    name: 'Pavel R. Popovich',
    native: 'Павел Романович Попович',
    born: '1930-10-05',
    died: '2009-09-29',
    nation: 'USSR',
    flights: ['ussr/vostok/vostok-4'],
    bio:
      'Born in the Kiev region of Ukraine, a pilot of the first group, and the voice on the radio from the pad for the ' +
      'launch of the last rehearsal before Gagarin. In Vostok 4 he was the livelier of the pair on television. He flew again in 1974, ' +
      'commanding Soyuz 14.',
    source: `${SPACEFACTS}, Pavel Popovich; ${SIDDIQI}, p. 267; the Vostok 4 README`,
    confidence: 'documented',
  },
  {
    id: 'bykovskiy',
    name: 'Valeriy F. Bykovskiy',
    native: 'Валерий Фёдорович Быковский',
    born: '1934-08-02',
    died: '2019-03-27',
    nation: 'USSR',
    flights: ['ussr/vostok/vostok-5'],
    bio:
      'A pilot of the first group, backup for Vostok 3. His five days alone in Vostok 5 are still the longest flight ' +
      'anyone has made by himself. He flew twice more, commanding Soyuz 22 in 1976 and Soyuz 31 in 1978.',
    source: `${SPACEFACTS}, Valery Bykovsky; FAI, record file for Vostok 5`,
    confidence: 'documented',
  },
  {
    id: 'tereshkova',
    name: 'Valentina V. Tereshkova',
    native: 'Валентина Владимировна Терешкова',
    born: '1937-03-06',
    nation: 'USSR',
    flights: ['ussr/vostok/vostok-6'],
    bio:
      'From the Yaroslavl region on the upper Volga, a mill worker and sports parachutist with 78 jumps when she was ' +
      'chosen in 1962, one of five women and none of them pilots. After Vostok 6 she never flew again. She married ' +
      'Andriyan Nikolayev, graduated from the Zhukovsky Air Force Engineering Academy in 1969 and retired a major general.',
    source: `${SIDDIQI}, pp. 353 and 726; ${SPACEFACTS}, Valentina Tereshkova; the Vostok 6 README`,
    confidence: 'documented',
  },
  {
    id: 'komarov',
    name: 'Vladimir M. Komarov',
    native: 'Владимир Михайлович Комаров',
    born: '1927-03-16',
    died: '1967-04-24',
    nation: 'USSR',
    flights: ['ussr/voskhod/voskhod-1', 'ussr/soyuz/soyuz-1'],
    bio:
      'An Air Force engineer-colonel of the first group, among its oldest. He commanded Voskhod 1, the first crew of more ' +
      'than one, and on the first Soyuz became the first Soviet cosmonaut to fly twice. He was killed at its landing when ' +
      'the parachutes failed, the first person to die on a spaceflight.',
    source: `${CREWS}; ${SIDDIQI}, pp. 581 to 589`,
    confidence: 'documented',
  },
  {
    id: 'feoktistov',
    name: 'Konstantin P. Feoktistov',
    native: 'Константин Петрович Феоктистов',
    born: '1926-02-07',
    died: '2009-11-21',
    nation: 'USSR',
    flights: ['ussr/voskhod/voskhod-1'],
    bio:
      'An engineer in Korolev’s bureau who had a large hand in the design of Vostok. He argued against squeezing three men ' +
      'into it, then, offered a seat for one of the bureau’s engineers, proposed how: take out the ejection seat and the ' +
      'suits. He flew in it himself, the first of the bureau’s engineers to go into space.',
    source: `${SIDDIQI}, pp. 263 and 409; ${SPACEFACTS}, Konstantin Feoktistov`,
    confidence: 'documented',
  },
  {
    id: 'yegorov',
    name: 'Boris B. Yegorov',
    native: 'Борис Борисович Егоров',
    born: '1937-11-26',
    died: '1994-09-12',
    nation: 'USSR',
    flights: ['ussr/voskhod/voskhod-1'],
    bio:
      'A civilian physician of 26 from the Air Force’s institute of aviation medicine, who had served on the recovery teams ' +
      'for the Vostok flights. His father, a member of the Academy of Medical Sciences, had told Korolev of his son’s wish ' +
      'to fly. He was the first doctor in space, and trained for no more than a few months.',
    source: `${CREWS}; ${SIDDIQI}, pp. 263 and 414`,
    confidence: 'documented',
  },
  {
    id: 'belyayev',
    name: 'Pavel I. Belyayev',
    native: 'Павел Иванович Беляев',
    born: '1925-06-26',
    died: '1970-01-10',
    nation: 'USSR',
    flights: ['ussr/voskhod/voskhod-2'],
    bio:
      'The oldest of the twenty men of the first group. He commanded Voskhod 2, talked Leonov through the spacewalk ' +
      '(“Take it easy, Aleksey... Be patient”), and flew the ship down by hand when the automatic descent failed. He died ' +
      'five years later, still a cosmonaut, and never flew again.',
    source: `${CREWS}; ${SIDDIQI}, p. 455; the Voskhod 2 README`,
    confidence: 'documented',
  },
  {
    id: 'leonov',
    name: 'Aleksey A. Leonov',
    native: 'Алексей Архипович Леонов',
    born: '1934-05-30',
    died: '2019-10-11',
    nation: 'USSR',
    flights: ['ussr/voskhod/voskhod-2'],
    bio:
      'An Air Force pilot from the Kemerovo region of Siberia, the first person to go outside a spacecraft. His crew was to have flown Soyuz 11 and ' +
      'was stood down two days before it; in 1975 he commanded Soyuz 19, the Soviet half of the Apollo–Soyuz flight.',
    source: `${SPACEFACTS}, Aleksei Leonov; ${SIDDIQI}, pp. 455 and 777`,
    confidence: 'documented',
  },
  {
    id: 'beregovoy',
    name: 'Georgiy T. Beregovoy',
    native: 'Георгий Тимофеевич Береговой',
    born: '1921-04-15',
    died: '1995-06-30',
    nation: 'USSR',
    flights: ['ussr/soyuz/soyuz-3'],
    bio:
      'A test pilot added to the cosmonauts in 1964, and at 47 the oldest person to have flown in space when he went up in ' +
      'Soyuz 3. His failure to dock with Soyuz 2 was put down to his own handling. He did not fly again.',
    source: `${CREWS}; ${SIDDIQI}, pp. 659 and 660`,
    confidence: 'documented',
  },
  {
    id: 'shatalov',
    name: 'Vladimir A. Shatalov',
    native: 'Владимир Александрович Шаталов',
    born: '1927-12-08',
    died: '2021-06-15',
    nation: 'USSR',
    flights: ['ussr/soyuz/soyuz-4', 'ussr/soyuz/soyuz-8', 'ussr/soyuz/soyuz-10'],
    bio:
      'An Air Force pilot from Petropavlovsk in Kazakhstan, of the second group. He commanded three Soyuz in two years and ' +
      'docked with Soyuz 5 by hand, the first docking of two crewed ships; with Yeliseyev he was the first Soviet cosmonaut ' +
      'to fly three times.',
    source: `${SPACEFACTS}, Vladimir Shatalov; ${SIDDIQI}, pp. 670 and 774`,
    confidence: 'documented',
  },
  {
    id: 'volynov',
    name: 'Boris V. Volynov',
    native: 'Борис Валентинович Волынов',
    born: '1934-12-18',
    nation: 'USSR',
    flights: ['ussr/soyuz/soyuz-5'],
    bio:
      'A pilot of the first group from Irkutsk who waited nine years to fly, backing up Voskhod 1 among others. He came home ' +
      'from Soyuz 5 alone through what Siddiqi calls perhaps the most dangerous entry of the Soviet programme, and flew ' +
      'again in 1976, 49 days on Soyuz 21. He was, Siddiqi notes, the first Jew from Russia to fly in space.',
    source: `${SPACEFACTS}, Boris Volynov; ${SIDDIQI}, pp. 669 and 673; the Voskhod 1 README`,
    confidence: 'documented',
  },
  {
    id: 'yeliseyev',
    name: 'Aleksey S. Yeliseyev',
    native: 'Алексей Станиславович Елисеев',
    born: '1934-07-13',
    nation: 'USSR',
    flights: ['ussr/soyuz/soyuz-5', 'ussr/soyuz/soyuz-8', 'ussr/soyuz/soyuz-10'],
    bio:
      'A civilian engineer from Korolev’s bureau, the first of its group to fly, whose place Korolev and then Mishin had ' +
      'fought for. He went up in Soyuz 5 and came down in Soyuz 4 with Shatalov, and flew twice more with him within two years.',
    source: `${SPACEFACTS}, Aleksei Yeliseyev; ${SIDDIQI}, pp. 669 to 672 and 774`,
    confidence: 'documented',
  },
  {
    id: 'khrunov',
    name: 'Yevgeniy V. Khrunov',
    native: 'Евгений Васильевич Хрунов',
    born: '1933-09-10',
    died: '2000-05-19',
    nation: 'USSR',
    flights: ['ussr/soyuz/soyuz-5'],
    bio:
      'A pilot of the first group, Leonov’s backup for the first spacewalk. In 1969 he made the second Soviet walk, from ' +
      'Soyuz 5 to Soyuz 4. He was dropped from the first station crews after a road accident and never flew again.',
    source: `${CREWS}; ${SIDDIQI}, pp. 669 to 672 and 770`,
    confidence: 'documented',
  },
  {
    id: 'shonin',
    name: 'Georgiy S. Shonin',
    native: 'Георгий Степанович Шонин',
    born: '1935-08-03',
    died: '1997-04-07',
    nation: 'USSR',
    flights: ['ussr/soyuz/soyuz-6'],
    bio:
      'A pilot of the first group who commanded Soyuz 6, the welding flight. From orbit he watched for the flames of ' +
      'missiles launched at night below him, and reported that he could clearly see the lights set out on the ground for him.',
    source: `${CREWS}; ${SIDDIQI}, pp. 705 to 707`,
    confidence: 'documented',
  },
  {
    id: 'kubasov',
    name: 'Valeriy N. Kubasov',
    native: 'Валерий Николаевич Кубасов',
    born: '1935-01-07',
    died: '2014-02-19',
    nation: 'USSR',
    flights: ['ussr/soyuz/soyuz-6'],
    bio:
      'An engineer from Korolev’s bureau who ran the first welding in space on Soyuz 6. His grounding by the doctors days ' +
      'before Soyuz 11 stood down Leonov’s whole crew. He flew with Leonov in 1975 on Soyuz 19, and once more in 1980.',
    source: `${SPACEFACTS}, Valeri Kubasov; ${SIDDIQI}, pp. 709 and 777`,
    confidence: 'documented',
  },
  {
    id: 'filipchenko',
    name: 'Anatoliy V. Filipchenko',
    native: 'Анатолий Васильевич Филипченко',
    born: '1928-02-26',
    died: '2022-08-07',
    nation: 'USSR',
    flights: ['ussr/soyuz/soyuz-7', 'ussr/soyuz/soyuz-16'],
    bio:
      'An Air Force pilot of the second group, 41 when he commanded Soyuz 7, the target ship of the failed triple flight. ' +
      'He commanded Soyuz 16 in 1974.',
    source: `${SPACEFACTS}, Anatoli Filipchenko; ${SIDDIQI}, p. 706`,
    confidence: 'documented',
  },
  {
    id: 'volkov',
    name: 'Vladislav N. Volkov',
    native: 'Владислав Николаевич Волков',
    born: '1935-11-23',
    died: '1971-06-30',
    nation: 'USSR',
    flights: ['ussr/soyuz/soyuz-7', 'ussr/soyuz/soyuz-11'],
    bio:
      'A civilian engineer from Korolev’s bureau, flight engineer of Soyuz 7. On Soyuz 11 he was the only one of the three ' +
      'who had flown before, and his were the last words heard from the ship. He died with his crewmates as they came home.',
    source: `${CREWS}; ${SIDDIQI}, pp. 706, 777 and 781`,
    confidence: 'documented',
  },
  {
    id: 'gorbatko',
    name: 'Viktor V. Gorbatko',
    native: 'Виктор Васильевич Горбатко',
    born: '1934-12-03',
    died: '2017-05-17',
    nation: 'USSR',
    flights: ['ussr/soyuz/soyuz-7'],
    bio:
      'A pilot of the first group who waited until 1969 to fly, as research engineer of Soyuz 7. He played Soyuz 9’s crew ' +
      'at chess from the ground, and commanded two more flights, Soyuz 24 in 1977 and Soyuz 37 in 1980.',
    source: `${SPACEFACTS}, Viktor Gorbatko; ${SIDDIQI}, p. 725`,
    confidence: 'documented',
  },
  {
    id: 'sevastyanov',
    name: 'Vitaliy I. Sevastyanov',
    native: 'Виталий Иванович Севастьянов',
    born: '1935-07-08',
    died: '2010-04-05',
    nation: 'USSR',
    flights: ['ussr/soyuz/soyuz-9'],
    bio:
      'A civilian engineer from Korolev’s bureau, the fourth of them to fly. He spent eighteen days with Nikolayev in Soyuz 9 ' +
      'and came home unable to climb out; in 1975 he flew two months more on Soyuz 18.',
    source: `${SPACEFACTS}, Vitali Sevastyanov; ${SIDDIQI}, pp. 724 and 728`,
    confidence: 'documented',
  },
  {
    id: 'rukavishnikov',
    name: 'Nikolay N. Rukavishnikov',
    native: 'Николай Николаевич Рукавишников',
    born: '1932-09-18',
    died: '2002-10-19',
    nation: 'USSR',
    flights: ['ussr/soyuz/soyuz-10', 'ussr/soyuz/soyuz-16'],
    bio:
      'An engineer from Tomsk who had trained hard for the circumlunar flights, the only newcomer on Soyuz 10. He flew ' +
      'twice more, on Soyuz 16 in 1974 and, as its commander, Soyuz 33 in 1979.',
    source: `${SPACEFACTS}, Nikolai Rukavishnikov; ${SIDDIQI}, p. 774`,
    confidence: 'documented',
  },
  {
    id: 'dobrovolskiy',
    name: 'Georgiy T. Dobrovolskiy',
    native: 'Георгий Тимофеевич Добровольский',
    born: '1928-06-01',
    died: '1971-06-30',
    nation: 'USSR',
    flights: ['ussr/soyuz/soyuz-11'],
    bio:
      'An Air Force pilot of the second group, 43, on his first flight when his crew was moved up from backup two days ' +
      'before launch. He commanded the first crew to live in a space station, and died with them as they came home.',
    source: `${CREWS}; ${SIDDIQI}, pp. 777 and 781`,
    confidence: 'documented',
  },
  {
    id: 'patsayev',
    name: 'Viktor I. Patsayev',
    native: 'Виктор Иванович Пацаев',
    born: '1933-06-19',
    died: '1971-06-30',
    nation: 'USSR',
    flights: ['ussr/soyuz/soyuz-11'],
    bio:
      'A civilian engineer from Korolev’s bureau, on his first flight. He was the first person to enter a space station, ' +
      'and took the photographs of Salyut as Soyuz 11 left it. He died on the way home, eleven days after his 38th birthday, ' +
      'which he had spent in the station.',
    source: `${CREWS}; ${SIDDIQI}, pp. 777 and 781`,
    confidence: 'documented',
  },
  {
    id: 'lazarev',
    name: 'Vasily G. Lazarev',
    native: 'Василий Григорьевич Лазарев',
    born: '1928-02-23',
    died: '1990-12-31',
    nation: 'USSR',
    flights: ['ussr/soyuz/soyuz-12'],
    bio:
      'Lazarev trained as a surgeon before becoming an Air Force test pilot. He commanded the first crewed test of the ' +
      'redesigned Soyuz with Oleg Makarov. The pair flew together again in 1975 and survived a launch abort that brought ' +
      'them down in the Altai mountains.',
    source: 'Gagarin Cosmonaut Training Center, biography of Vasily Lazarev; RGANTD, On the 95th Anniversary of V. G. Lazarev',
    confidence: 'documented',
  },
  {
    id: 'makarov',
    name: 'Oleg G. Makarov',
    native: 'Олег Григорьевич Макаров',
    born: '1933-01-06',
    died: '2003-05-28',
    nation: 'USSR',
    flights: ['ussr/soyuz/soyuz-12'],
    bio:
      'Makarov worked in Korolev’s design bureau before joining the cosmonaut corps. He trained for lunar and space-station ' +
      'missions before becoming Soyuz 12’s flight engineer. After surviving a launch abort with Lazarev in 1975, he flew two ' +
      'more missions, both to Salyut 6.',
    source: 'Gagarin Cosmonaut Training Center, biography of Oleg Makarov; RGANTD, On the 90th Anniversary of O. G. Makarov',
    confidence: 'documented',
  },
  {
    id: 'malyshev',
    name: 'Yuri V. Malyshev',
    native: 'Юрий Васильевич Малышев',
    born: '1941-08-27',
    died: '1999-11-08',
    nation: 'USSR',
    flights: ['ussr/soyuz/soyuz-t-2'],
    bio:
      'An Air Force pilot from the Volgograd region, Malyshev commanded the first crewed Soyuz T on his first spaceflight. ' +
      'He flew the final approach and docking at Salyut 6 by hand. In 1984 he commanded the Soviet–Indian visit to Salyut 7 ' +
      'with Gennadi Strekalov and Rakesh Sharma, India’s first cosmonaut.',
    source:
      'Gagarin Cosmonaut Training Center, biography of Yuri Malyshev. V. I. Vasilyev, Manned Spaceflight, no. 4 (41), 2021, pp. 130–131',
    confidence: 'documented',
  },
  {
    id: 'aksyonov',
    name: 'Vladimir V. Aksyonov',
    native: 'Владимир Викторович Аксёнов',
    born: '1935-02-01',
    died: '2024-04-09',
    nation: 'USSR',
    flights: ['ussr/soyuz/soyuz-t-2'],
    bio:
      'Aksyonov joined Korolev’s design bureau as an instrument engineer and led flight tests in weightlessness. ' +
      'On Soyuz 22 he and Valery Bykovsky tested a multispectral Earth camera made with East Germany. ' +
      'He worked with the Soyuz T designers before flying the ship’s first crewed test as Malyshev’s flight engineer.',
    source:
      'Gagarin Cosmonaut Training Center, biography of Vladimir Aksyonov. V. I. Vasilyev, Manned Spaceflight, no. 4 (41), 2021, p. 129',
    confidence: 'documented',
  },
  {
    id: 'eisele',
    name: 'Donn F. Eisele',
    born: '1930-06-23',
    died: '1987-12-02',
    nation: 'USA',
    flights: ['usa/apollo/apollo-7'],
    bio:
      'An Air Force test pilot from Columbus, Ohio, a graduate of the Naval Academy who chose the Air Force and flew ' +
      'experimental tests for the Special Weapons Center. He was chosen with NASA’s third group in October 1963. On ' +
      'Apollo 7 he sat in the command module pilot’s seat for the eleven-day shakedown of the rebuilt spacecraft, his ' +
      'one flight. He was backup command module pilot for Apollo 10, and died of a heart attack on a business trip to ' +
      'Tokyo in December 1987.',
    source: `${JSC_BIO}, Donn F. Eisele; ${FACT_BOOK} (died 2 December 1987). SP-2000-4029 p. 14 gives 1 December: the date in Tokyo and in the United States differ by a day`,
    confidence: 'documented',
  },
  {
    id: 'cunningham',
    name: 'R. Walter Cunningham',
    born: '1932-03-16',
    died: '2023-01-03',
    nation: 'USA',
    flights: ['usa/apollo/apollo-7'],
    bio:
      'Born in Creston, Iowa, he joined the Navy in 1951 and flew 54 missions as a Marine night fighter pilot in ' +
      'Korea, then studied physics at UCLA and worked on the Earth’s magnetosphere at the Rand Corporation. Chosen ' +
      'with the third group in 1963, he was backup lunar module pilot for Apollo 1. On Apollo 7, his one flight, he ' +
      'flew eleven days in orbit as lunar module pilot of a flight without a lunar module. He left NASA in 1971 for ' +
      'business, and died in Houston in January 2023, aged 90.',
    source: `${JSC_BIO}, Walter Cunningham; ${FACT_BOOK}; NASA release, "Apollo Astronaut Walter Cunningham Dies at 90", 3 January 2023`,
    confidence: 'documented',
  },
  {
    id: 'anders',
    name: 'William A. Anders',
    born: '1933-10-17',
    died: '2024-06-07',
    nation: 'USA',
    flights: ['usa/apollo/apollo-8'],
    bio:
      'Born in Hong Kong, he went from the Naval Academy into the Air Force as an all-weather fighter pilot and then ' +
      'to nuclear engineering, working on reactor shielding and radiation. NASA chose him in 1963. As lunar module ' +
      'pilot of Apollo 8, with no lunar module to fly, he took the photograph of the Earth rising over the Moon. ' +
      'He later ran the National Aeronautics and Space Council’s staff, was the first chairman of the Nuclear ' +
      'Regulatory Commission and ambassador to Norway, and died at 90 when the old aeroplane he was flying came down ' +
      'in the San Juan Channel.',
    source:
      `${JSC_BIO}, William A. Anders; ${FACT_BOOK}; NASA Science, "Remembering Bill Anders" (June 2024: died 7 June 2024). ` +
      'The Fact Book and SP-2000-4029 p. 33 say selected 1963, his JSC biography 1964 (the group was named in October 1963)',
    confidence: 'documented',
  },
  {
    id: 'schweickart',
    name: 'Russell L. Schweickart',
    born: '1935-10-25',
    nation: 'USA',
    flights: ['usa/apollo/apollo-9'],
    bio:
      'Born in Neptune, New Jersey, he flew fighters in the Air Force and the Massachusetts Air National Guard and ' +
      'was a research scientist at MIT’s Experimental Astronomy Laboratory when NASA chose him in 1963, one of two ' +
      'civilians in the group. On Apollo 9 he was the ' +
      'lunar module pilot and stood outside on Spider’s porch to test the suit and backpack of the moonwalkers. He ' +
      'was backup commander of the first Skylab crew and worked out how to rescue the station when its shield was torn ' +
      'off at launch. After NASA he advised California’s governor on science and chaired its Energy Commission, founded ' +
      'the Association of Space Explorers for astronauts and cosmonauts alike, and spent his later years on defending ' +
      'the Earth from asteroids through the B612 Foundation.',
    source:
      `${JSC_BIO}, Russell L. Schweickart; ${FACT_BOOK}; SP-2000-4029 p. 52 (born 25 October 1935); ${CHARIOTS}, p. 130 note (only Cunningham and Schweickart of the third group not in the services). ` +
      'Whether he was living in 2026 was not checked',
    confidence: 'documented',
  },
  {
    id: 'bean',
    name: 'Alan L. Bean',
    born: '1932-03-15',
    died: '2018-05-26',
    nation: 'USA',
    flights: ['usa/apollo/apollo-12'],
    bio:
      'A Navy pilot from Wheeler, Texas, chosen in 1963. On Apollo 12 he was lunar module pilot and the fourth ' +
      'person to walk on the Moon, beside the Surveyor III lander in the Ocean of Storms. He went back to space in 1973 ' +
      'as commander of the second Skylab crew, on a 59-day flight that was a record for its time. He left NASA in ' +
      '1981 to paint, in acrylics worked with fragments of his mission patches and the marks of lunar boots, and died ' +
      'in Houston in May 2018.',
    source: `${FACT_BOOK} (Captain, U.S. Navy; Apollo 12, Skylab 3); NASA, "Family Release Regarding the Passing of Apollo, Skylab Astronaut Alan Bean" (May 2018); SP-2000-4029 p. 112`,
    confidence: 'documented',
  },
  {
    id: 'swigert',
    name: 'John L. Swigert Jr.',
    born: '1931-08-30',
    died: '1982-12-27',
    nation: 'USA',
    flights: ['usa/apollo/apollo-13'],
    bio:
      'From Denver, chosen in 1966. He was backup command module pilot for Apollo 13 and was moved onto the prime crew ' +
      'three days before launch when Ken Mattingly was exposed to German measles, and so was in Odyssey when its oxygen ' +
      'tank failed. It was his one flight. He died in Washington in December 1982, of complications of treatment ' +
      'for bone marrow cancer, at 51.',
    source: `${FACT_BOOK}; SP-2000-4029 pp. 136 and 137 (the substitution; born 30 August 1931; died 27 December 1982 of complications from bone marrow cancer treatments, in Washington, DC)`,
    confidence: 'documented',
  },
  {
    id: 'haise',
    name: 'Fred W. Haise Jr.',
    born: '1933-11-14',
    nation: 'USA',
    flights: ['usa/apollo/apollo-13'],
    bio:
      'From Biloxi, Mississippi, a Marine and Air National Guard fighter pilot and then a NASA research pilot at ' +
      'Cleveland and at Edwards before he was chosen in 1966. He was lunar module pilot of Apollo 13, the landing he ' +
      'never made, and its lunar module became the crew’s lifeboat. In 1977 he commanded one of the two crews that ' +
      'flew the Space Shuttle Enterprise off the back of a Boeing 747 in the approach and landing tests. He left NASA ' +
      'in 1979 for Grumman, the lunar module’s builder.',
    source: `${JSC_BIO}, Fred W. Haise, Jr.; ${FACT_BOOK}; SP-2000-4029 p. 137. Whether he was living in 2026 was not checked`,
    confidence: 'documented',
  },
  {
    id: 'roosa',
    name: 'Stuart A. Roosa',
    born: '1933-08-16',
    died: '1994-12-12',
    nation: 'USA',
    flights: ['usa/apollo/apollo-14'],
    bio:
      'From Durango, Colorado, an Air Force test pilot chosen in 1966. He flew Kitty Hawk alone in lunar orbit on ' +
      'Apollo 14 while Shepard and Mitchell were at Fra Mauro, his one flight. He was backup command module pilot ' +
      'for Apollo 16 and 17, worked on the Space Shuttle until he retired in 1976, and went into business. He died ' +
      'of complications of pancreatitis in December 1994.',
    source: `${JSC_BIO}, Stuart A. Roosa; ${FACT_BOOK}; SP-2000-4029 p. 161`,
    confidence: 'documented',
  },
  {
    id: 'mitchell',
    name: 'Edgar D. Mitchell',
    born: '1930-09-17',
    died: '2016-02-04',
    nation: 'USA',
    flights: ['usa/apollo/apollo-14'],
    bio:
      'Born in Hereford, Texas, and raised in Artesia, New Mexico, a Navy pilot with a doctorate in aeronautics and ' +
      'astronautics from MIT, chosen in 1966 after graduating first in his class from the Air Force’s test-pilot ' +
      'school. On Apollo 14, his one flight, he was lunar module pilot, and the sixth person to walk on the Moon, at ' +
      'Fra Mauro. He died in West Palm Beach, Florida, at 85, on the eve of the 45th anniversary of his landing.',
    source: `${JSC_BIO}, Edgar D. Mitchell; ${FACT_BOOK}; NASA, "NASA Administrator Remembers Apollo-Era Astronaut Edgar Mitchell" (February 2016) and Kennedy Space Center's blog for February 2016`,
    confidence: 'documented',
  },
  {
    id: 'worden',
    name: 'Alfred M. Worden',
    born: '1932-02-07',
    died: '2020-03-18',
    nation: 'USA',
    flights: ['usa/apollo/apollo-15'],
    bio:
      'From Jackson, Michigan, an Air Force test pilot and instructor, chosen in 1966. He flew Endeavour round the ' +
      'Moon on Apollo 15 with the first full set of mapping cameras and instruments in its service module, alone for ' +
      'three days, and on the way home went outside to fetch their film: the first walk in space so far from the Earth. ' +
      'He went on to NASA’s Ames Research Center and then to industry, and died in Texas in March 2020.',
    source:
      `${JSC_BIO}, Alfred M. Worden ("first scientific instrument module bay flown"); ${FACT_BOOK}; SP-2000-4029 p. 196 (the transearth EVA); ` +
      'NASA, "NASA Administrator Statement on Apollo Astronaut Al Worden" and "Remembering Apollo 15 Astronaut Al Worden" (March 2020). "The first walk in space so far from the Earth" is derived: it was the first EVA on the way home from the Moon',
    confidence: 'documented',
  },
  {
    id: 'irwin',
    name: 'James B. Irwin',
    born: '1930-03-17',
    died: '1991-08-08',
    nation: 'USA',
    flights: ['usa/apollo/apollo-15'],
    bio:
      'From Pittsburgh, a graduate of the Naval Academy who went into the Air Force and became a test pilot, chosen in ' +
      '1966. On Apollo 15 he was lunar module pilot and the eighth person to walk on the Moon, driving the first rover ' +
      'with Scott at Hadley. He left NASA and the Air Force in July 1972 to found a religious organisation, the High ' +
      'Flight Foundation, and died of a heart attack in August 1991, the first of the moonwalkers to die.',
    source: `${JSC_BIO}, James Irwin; ${FACT_BOOK}; SP-2000-4029 p. 185. "The first of the moonwalkers to die" is derived from the death dates of the twelve in the Fact Book`,
    confidence: 'documented',
  },
  {
    id: 'mattingly',
    name: 'Thomas K. Mattingly II',
    born: '1936-03-17',
    died: '2023-10-31',
    nation: 'USA',
    flights: ['usa/apollo/apollo-16'],
    bio:
      'A Navy pilot from Chicago, chosen in 1966, who worked on the Apollo suit and backpack. He was to fly Apollo 13 ' +
      'as command module pilot and was taken off 72 hours before launch for an exposure to German measles. He flew ' +
      'Casper on Apollo 16 instead and walked outside on the way home. He went on to command two Space Shuttle ' +
      'flights, STS-4 in 1982 and STS-51C in 1985, and died in October 2023.',
    source: `${JSC_BIO}, Thomas K. Mattingly II (deceased; died 31 October 2023; "removed from flight status 72 hours prior to the scheduled launch"); ${FACT_BOOK}; SP-2000-4029 pp. 136, 212 and 224`,
    confidence: 'documented',
  },
  {
    id: 'duke',
    name: 'Charles M. Duke Jr.',
    born: '1935-10-03',
    nation: 'USA',
    flights: ['usa/apollo/apollo-16'],
    bio:
      'From Charlotte, North Carolina, a Naval Academy graduate who flew fighters for the Air Force in Germany and ' +
      'taught at its test-pilot school, chosen in 1966. He was capsule communicator, the one voice from Houston, for ' +
      'Apollo 11, and backup lunar module pilot of Apollo 13. On Apollo 16 he and Young spent three days at Descartes, the tenth ' +
      'person to walk on the Moon. He retired from NASA in 1975 for business, and became a Christian lay speaker.',
    source: `${JSC_BIO}, Charles Moss Duke, Jr.; ${FACT_BOOK}; SP-2000-4029 p. 212. Whether he was living in 2026 was not checked`,
    confidence: 'documented',
  },
  {
    id: 'evans',
    name: 'Ronald E. Evans',
    born: '1933-11-10',
    died: '1990-04-06',
    nation: 'USA',
    flights: ['usa/apollo/apollo-17'],
    bio:
      'From St. Francis, Kansas, a Navy fighter pilot who was flying combat missions off the carrier Ticonderoga ' +
      'over Vietnam when he was told he had been chosen, in 1966. On Apollo 17 he flew America in lunar orbit while ' +
      'Cernan and Schmitt were in Taurus-Littrow, his one flight. He worked on the Space Shuttle, retired from NASA ' +
      'in 1977 for the coal industry, and died of a heart attack in Scottsdale, Arizona, in 1990.',
    source: `${JSC_BIO}, Ronald E. Evans (died 6 April 1990); ${FACT_BOOK} (6 April); SP-2000-4029 p. 240 gives 7 April`,
    confidence: 'documented',
  },
  {
    id: 'schmitt',
    name: 'Harrison H. Schmitt',
    born: '1935-07-03',
    nation: 'USA',
    flights: ['usa/apollo/apollo-17'],
    bio:
      'A geologist from Santa Rita, New Mexico, with a doctorate from Harvard, who had worked in the field in Norway ' +
      'and for the US Geological Survey and was chosen as a scientist-astronaut in 1965. On Apollo 17 he was the one ' +
      'professional scientist to explore the Moon, and the twelfth and last person to step onto it. He left NASA in ' +
      '1975, was elected to the Senate from New Mexico in 1976 and served one term, and later chaired the NASA Advisory ' +
      'Council.',
    source: `${JSC_BIO}, Harrison H. Schmitt; ${FACT_BOOK}; SP-2000-4029 p. 240. "The twelfth and last to step onto it" is derived from the order of the Apollo 17 EVA (Cernan out first). Whether he was living in 2026 was not checked`,
    confidence: 'documented',
  },
  {
    id: 'armstrong',
    name: 'Neil A. Armstrong',
    born: '1930-08-05',
    died: '2012-08-25',
    nation: 'USA',
    flights: ['usa/gemini/gt-8', 'usa/apollo/apollo-11'],
    bio:
      'Born in Wapakoneta, Ohio, Armstrong was a naval aviator, then an engineer and research pilot for NACA and NASA, flying ' +
      'more than 200 kinds of aircraft, the X-15 among them. A civilian, he became an astronaut in 1962.\n\n' +
      'He commanded Gemini 8, which made the first docking in orbit and then had to be saved from a spin, and Apollo 11, on ' +
      'which he was the first person to land on the Moon and step onto it. He left NASA in 1971 to teach aerospace ' +
      'engineering at the University of Cincinnati, and was vice-chairman of the commission on the Challenger accident.',
    source: 'NASA JSC biographical data, Neil A. Armstrong (August 2012); SP-4203, p. 304',
    confidence: 'documented',
  },
  {
    id: 'scott',
    name: 'David R. Scott',
    born: '1932-06-06',
    nation: 'USA',
    flights: ['usa/gemini/gt-8', 'usa/apollo/apollo-9', 'usa/apollo/apollo-15'],
    bio:
      'Born in San Antonio, Texas, Scott graduated fifth of 633 at West Point, flew fighters in the Netherlands and studied ' +
      'at MIT before NASA chose him in its third group, in October 1963.\n\n' +
      'He was pilot of Gemini 8, cut short by a stuck thruster; command module pilot of Apollo 9, the first test of the whole ' +
      'Apollo spacecraft in Earth orbit; and commander of Apollo 15, which took a rover and stayed nearly three days at Hadley ' +
      'Rille below the Apennines. He is one of three astronauts to have flown Apollo both round the Earth and to the Moon.',
    source: 'NASA JSC biographical data, David R. Scott (December 1975); NASA Astronaut Fact Book (June 2022)',
    confidence: 'documented',
  },
  {
    id: 'cernan',
    name: 'Eugene A. Cernan',
    born: '1934-03-14',
    died: '2017-01-16',
    nation: 'USA',
    flights: ['usa/gemini/gt-9a', 'usa/apollo/apollo-10', 'usa/apollo/apollo-17'],
    bio:
      'Born in Chicago, Cernan studied electrical engineering at Purdue and flew attack jets for the Navy before joining the ' +
      'third group of astronauts in 1963.\n\n' +
      'He came to Gemini 9 as a backup when its crew were killed, and made the second American walk outside, a struggle that ' +
      'changed how the rest were planned. He was lunar module pilot on Apollo 10, the lander’s test round the Moon, and commanded ' +
      'Apollo 17, the last landing; his footprints were the last left there. He left the Navy and NASA in 1976 for business.',
    source:
      'NASA, "Eugene A. Cernan" (nasa.gov/people/eugene-a-cernan); NASA Astronaut Fact Book (June 2022: died 16 January 2017); SP-4203, pp. 323 to 325 and 337 to 339',
    confidence: 'documented',
  },
  {
    id: 'collins',
    name: 'Michael Collins',
    born: '1930-10-31',
    died: '2021-04-28',
    nation: 'USA',
    flights: ['usa/gemini/gt-10', 'usa/apollo/apollo-11'],
    bio:
      'Born in Rome, where his father was posted, Collins went from West Point into the Air Force and tested fighters at ' +
      'Edwards before joining the third group of astronauts in 1963.\n\n' +
      'On Gemini 10 he went out twice, the second time across to an Agena left in orbit four months before. On Apollo 11 he ' +
      'flew Columbia alone round the Moon while Armstrong and Aldrin landed, and docked with them when they came back up. He left NASA in January ' +
      '1970, was director of the Smithsonian’s National Air and Space Museum, and wrote "Carrying the Fire" (1974).',
    source:
      'NASA JSC biographical data, Michael Collins (September 2015); NASA JSC, statement on the passing of Michael Collins (28 April 2021); SP-4203, pp. 348 and 349',
    confidence: 'documented',
  },
  {
    id: 'gordon',
    name: 'Richard F. Gordon Jr.',
    born: '1929-10-05',
    died: '2017-11-06',
    nation: 'USA',
    flights: ['usa/gemini/gt-11', 'usa/apollo/apollo-12'],
    bio:
      'Born in Seattle, Gordon studied chemistry, became a naval aviator and a test pilot on the F4H Phantom II, and in May ' +
      '1961 won the Bendix race from Los Angeles to New York in a transcontinental record. He joined the third group of ' +
      'astronauts in 1963.\n\n' +
      'On Gemini 11 he tied the tether between the Gemini and its Agena, a task that wore him out, before the flight set a ' +
      'world altitude record. On Apollo 12 he flew Yankee Clipper in lunar orbit while Conrad and Bean landed. He left NASA ' +
      'and the Navy in 1972 and went into business, first with the New Orleans Saints.',
    source: 'NASA JSC biographical data, Richard F. Gordon, Jr. (November 2017); SP-4203, pp. 361 and 362',
    confidence: 'documented',
  },
  {
    id: 'aldrin',
    name: 'Edwin E. Aldrin Jr.',
    born: '1930-01-20',
    nation: 'USA',
    flights: ['usa/gemini/gt-12', 'usa/apollo/apollo-11'],
    bio:
      'Born in Montclair, New Jersey, Aldrin, called Buzz, graduated third in his class at West Point and flew 66 combat ' +
      'missions in F-86s in Korea. His MIT doctorate was on guidance for crewed rendezvous in orbit, and he joined the third ' +
      'group of astronauts in 1963.\n\n' +
      'On Gemini 12 he showed that a person could work outside a spacecraft without exhaustion, and on Apollo 11 he followed ' +
      'Armstrong onto the Moon. He left NASA in 1971, commanded the Air Force’s test pilot school, and has argued since for ' +
      'going on outward.',
    source: 'NASA JSC biographical data, Buzz Aldrin (January 1996); SP-4203, pp. 373 and 377 to 381',
    confidence: 'documented',
  },
  {
    id: 'shepard',
    name: 'Alan B. Shepard Jr.',
    born: '1923-11-18',
    died: '1998-07-21',
    nation: 'USA',
    flights: ['usa/mercury/mr-3-freedom-7', 'usa/apollo/apollo-14'],
    bio:
      'A New Hampshire man and Annapolis graduate who served on a destroyer in the Pacific in the war, then flew Navy fighters ' +
      'and became a test pilot at Patuxent River. Chosen as one of the Mercury Seven, he was the first American in space.' +
      '\n\n' +
      'An inner-ear disorder grounded him from 1963; he ran the Astronaut Office instead, until surgery restored him to flight in ' +
      '1969. He commanded Apollo 14 and walked on the Moon at 47, the only one of the seven to go there.',
    source: `${JSC_BIO}, Alan B. Shepard, Jr. (September 1998); Neufeld, Smithsonian NASM, 5 May 2021`,
    confidence: 'documented',
  },
  {
    id: 'grissom',
    name: 'Virgil I. Grissom',
    born: '1926-04-03',
    died: '1967-01-27',
    nation: 'USA',
    flights: ['usa/mercury/mr-4-liberty-bell-7', 'usa/gemini/gt-3'],
    bio:
      '“Gus” Grissom, from Mitchell, Indiana, flew 100 combat missions over Korea in F-86s, studied engineering at Purdue and ' +
      'became an Air Force test pilot. He flew the second Mercury into space and lost it to the sea, then commanded the first ' +
      'Gemini with a crew.' +
      '\n\n' +
      'He was to command the first Apollo, and died with Ed White and Roger Chaffee when their spacecraft burned on the pad ' +
      'during a test on 27 January 1967.',
    source: `${JSC_BIO}, Virgil I. Grissom (December 1997); ${FACT_BOOK}`,
    confidence: 'documented',
  },
  {
    id: 'glenn',
    name: 'John H. Glenn, Jr.',
    born: '1921-07-18',
    died: '2016-12-08',
    nation: 'USA',
    flights: ['usa/mercury/ma-6-friendship-7'],
    bio:
      'A Marine pilot from Ohio who flew 59 combat missions in the Second World War and 63 in Korea, and in 1957 flew from Los ' +
      'Angeles to New York faster than sound, on average, in 3 hours 23 minutes. He was the first American to orbit the Earth.' +
      '\n\n' +
      'He left NASA in 1964, and in 1974 won a seat in the Senate, which he held for four terms. In 1998, at 77, he flew again, ' +
      'on the Shuttle Discovery: then the oldest person to go into space.',
    source: `NASA, “John H. Glenn” (nasa.gov/people/john-glenn); ${FACT_BOOK}`,
    confidence: 'documented',
  },
  {
    id: 'carpenter',
    name: 'M. Scott Carpenter',
    born: '1925-05-01',
    died: '2013-10-10',
    nation: 'USA',
    flights: ['usa/mercury/ma-7-aurora-7'],
    bio:
      'Born in Boulder, Colorado, he studied aeronautical engineering, was commissioned in the Navy in 1949 and flew patrol ' +
      'aircraft in the Korean War before test flying at Patuxent River. He was Glenn’s backup, then flew Aurora 7.' +
      '\n\n' +
      'In 1965, on leave from NASA, he lived thirty days on the sea floor off La Jolla in the Navy’s SEALAB II, and went on to ' +
      'a second career in the ocean.',
    source: `NASA, “M. Scott Carpenter” (nasa.gov/people/m-scott-carpenter); ${FACT_BOOK}`,
    confidence: 'documented',
  },
  {
    id: 'schirra',
    name: 'Walter M. Schirra, Jr.',
    born: '1923-03-12',
    died: '2007-05-02',
    nation: 'USA',
    flights: ['usa/mercury/ma-8-sigma-7', 'usa/gemini/gt-6a', 'usa/apollo/apollo-7'],
    bio:
      'A Navy pilot from New Jersey, Annapolis-trained, who flew in Korea and tested aircraft before he was chosen as one of the ' +
      'Mercury Seven. He flew Sigma 7, commanded Gemini 6A to the first rendezvous, and commanded Apollo 7, the first Apollo ' +
      'with a crew.' +
      '\n\n' +
      'He is the only astronaut to have flown Mercury, Gemini and Apollo. He left NASA in 1969 for business.',
    source: `${JSC_BIO}, Walter M. Schirra; ${FACT_BOOK}`,
    confidence: 'documented',
  },
  {
    id: 'cooper',
    name: 'L. Gordon Cooper, Jr.',
    born: '1927-03-06',
    died: '2004-10-04',
    nation: 'USA',
    flights: ['usa/mercury/ma-9-faith-7', 'usa/gemini/gt-5'],
    bio:
      'Born in Shawnee, Oklahoma, he flew fighters for the Air Force in Germany and was a test pilot at Edwards when he was ' +
      'chosen as one of the Mercury Seven. He flew Mercury’s last and longest flight, and two years later commanded ' +
      'Gemini 5 for eight days.' +
      '\n\n' +
      'NASA counts him the first person to make a second flight in orbit. He left NASA and the Air Force in 1970.',
    source: `NASA, “Leroy Gordon Cooper, Jr.” (nasa.gov/people/leroy-gordon-cooper-jr); ${FACT_BOOK}`,
    confidence: 'documented',
  },
  {
    id: 'young',
    name: 'John W. Young',
    born: '1930-09-24',
    died: '2018-01-05',
    nation: 'USA',
    flights: ['usa/gemini/gt-3', 'usa/gemini/gt-10', 'usa/apollo/apollo-10', 'usa/apollo/apollo-16'],
    bio:
      'A Navy test pilot from San Francisco, chosen in 1962, who was the first of his group to fly: as Grissom’s pilot on ' +
      'Gemini 3. He commanded Gemini 10, flew Apollo 10 round the Moon and walked on it as commander of Apollo 16.' +
      '\n\n' +
      'In 1981 he commanded the first flight of the Space Shuttle, and in 1983 its ninth, the first person to fly in space six ' +
      'times. He ran the Astronaut Office for thirteen years and worked for NASA until the end of 2004.',
    source: `NASA, “Former Astronaut John W. Young”; ${FACT_BOOK}`,
    confidence: 'documented',
  },
  {
    id: 'mcdivitt',
    name: 'James A. McDivitt',
    born: '1929-06-10',
    died: '2022-10-13',
    nation: 'USA',
    flights: ['usa/gemini/gt-4', 'usa/apollo/apollo-9'],
    bio:
      'Born in Chicago, he flew 145 combat missions in Korea, then studied astronautical engineering at Michigan and was a test ' +
      'pilot at Edwards. He commanded Gemini 4 and Apollo 9, the first flight of the lunar module.' +
      '\n\n' +
      'From August 1969 he managed the Apollo spacecraft programme, for Apollo 12 to 16, and left NASA and the Air Force in ' +
      '1972 for industry.',
    source: `${JSC_BIO}, James A. McDivitt (December 1994); ${FACT_BOOK}`,
    confidence: 'documented',
  },
  {
    id: 'white',
    name: 'Edward H. White II',
    born: '1930-11-14',
    died: '1967-01-27',
    nation: 'USA',
    flights: ['usa/gemini/gt-4'],
    bio:
      'Born in San Antonio, a West Point graduate who flew fighters in Germany and was an Air Force test pilot at Wright-Patterson. ' +
      'On Gemini 4 he was the first American to go outside a spacecraft, and the first person to move himself about there with a ' +
      'manoeuvring gun.' +
      '\n\n' +
      'He was named to the first Apollo crew, and died with Grissom and Chaffee in its fire on the pad.',
    source: `${JSC_BIO}, Edward H. White, II (December 1997); ${FACT_BOOK}`,
    confidence: 'documented',
  },
  {
    id: 'conrad',
    name: 'Charles Conrad Jr.',
    born: '1930-06-02',
    died: '1999-07-08',
    nation: 'USA',
    flights: ['usa/gemini/gt-5', 'usa/gemini/gt-11', 'usa/apollo/apollo-12', 'usa/skylab/skylab-2'],
    bio:
      '“Pete” Conrad, of Philadelphia and Princeton, was a Navy test pilot at Patuxent River when he was chosen in 1962. He ' +
      'flew eight days on Gemini 5, commanded Gemini 11 to a record height, and commanded Apollo 12, the second landing on the Moon.' +
      '\n\n' +
      'In 1973 he commanded the first crew of Skylab, which repaired the damaged station and saved it. He died after a motorcycle ' +
      'accident in 1999.',
    source: `${JSC_BIO}, Charles Conrad, Jr.; ${FACT_BOOK}, section 4.0`,
    confidence: 'documented',
  },
  {
    id: 'kerwin',
    name: 'Joseph P. Kerwin',
    born: '1932-02-19',
    nation: 'USA',
    flights: ['usa/skylab/skylab-2'],
    bio:
      'A Navy flight surgeon and aviator, Kerwin joined NASA’s first class of scientist-astronauts in 1965. ' +
      'As Skylab’s first science pilot he could study what weeks of weightlessness did to his crewmates and to himself. ' +
      'Outside the station he and Conrad freed the jammed solar wing that supplied power to the workshop.',
    source: 'NASA, Biographical Data, Joseph P. Kerwin. Kennedy Space Center, Skylab Program, p. XI-2 (NTRS 19740015280).',
    confidence: 'documented',
  },
  {
    id: 'weitz',
    name: 'Paul J. Weitz',
    born: '1932-07-25',
    died: '2017-10-22',
    nation: 'USA',
    flights: ['usa/skylab/skylab-2'],
    bio:
      'A Navy pilot from Erie, Pennsylvania, Weitz joined NASA in 1966. On his first flight he stood in the open Apollo hatch with a long tool ' +
      'to try to free Skylab’s trapped solar wing. Ten years later he commanded the first flight of the space shuttle Challenger.',
    source:
      'NASA, Skylab, Shuttle Astronaut Paul Weitz Dies at 85 (2017). Kennedy Space Center, Skylab Program, p. XI-2 (NTRS 19740015280).',
    confidence: 'documented',
  },
  {
    id: 'stafford',
    name: 'Thomas P. Stafford',
    born: '1930-09-17',
    died: '2024-03-18',
    nation: 'USA',
    flights: ['usa/gemini/gt-6a', 'usa/gemini/gt-9a', 'usa/apollo/apollo-10'],
    bio:
      'An Oklahoman who went to Annapolis and into the Air Force, flew interceptors in Germany and taught at its test pilot ' +
      'school. He flew Gemini 6A to the first rendezvous, commanded Gemini 9A, and took Apollo 10’s lunar module to within nine ' +
      'miles of the Moon.' +
      '\n\n' +
      'In 1975 he commanded the American half of the Apollo-Soyuz flight, shaking hands in orbit with Aleksey Leonov.',
    source: `${JSC_BIO}, Thomas P. Stafford; ${FACT_BOOK}; NASA, “NASA Administrator Pays Tribute to Space Pioneer Thomas Stafford” (March 2024)`,
    confidence: 'documented',
  },
  {
    id: 'borman',
    name: 'Frank Borman',
    born: '1928-03-14',
    died: '2023-11-07',
    nation: 'USA',
    flights: ['usa/gemini/gt-7', 'usa/apollo/apollo-8'],
    bio:
      'Born in Gary, Indiana, a West Point graduate and Air Force fighter and test pilot who taught thermodynamics at West Point. ' +
      'He commanded Gemini 7’s fourteen days and Apollo 8, the first crew to go round the Moon.' +
      '\n\n' +
      'He sat on the board that investigated the Apollo 1 fire and led the team that reworked the spacecraft. After NASA he ran ' +
      'Eastern Air Lines, as chief executive from 1975 to 1986.',
    source: `${JSC_BIO}, Frank Borman; ${FACT_BOOK}; NASA, “NASA Administrator Honors Life of Apollo Astronaut Frank Borman” (November 2023)`,
    confidence: 'documented',
  },
  {
    id: 'lovell',
    name: 'James A. Lovell Jr.',
    born: '1928-03-25',
    died: '2025-08-07',
    nation: 'USA',
    flights: ['usa/gemini/gt-7', 'usa/gemini/gt-12', 'usa/apollo/apollo-8', 'usa/apollo/apollo-13'],
    bio:
      'Born in Cleveland, an Annapolis graduate and Navy test pilot at Patuxent River. He flew fourteen days on Gemini 7, ' +
      'commanded Gemini 12, the last, and went round the Moon on Apollo 8.' +
      '\n\n' +
      'He commanded Apollo 13, and when an oxygen tank burst on the way out, brought his crew home in the lunar module. He was ' +
      'the first person to go to the Moon twice, and held the record for time in space until Skylab.',
    source: `${JSC_BIO}, James A. Lovell; ${FACT_BOOK}; NASA, “Acting NASA Administrator Reflects on Legacy of Astronaut Jim Lovell” (August 2025)`,
    confidence: 'documented',
  },
];

export const PROGRAMMES: readonly Programme[] = [
  {
    id: 'ussr/vostok',
    name: 'Vostok',
    nation: 'USSR',
    years: '1961–1963',
    why:
      'Korolev’s design bureau, OKB-1, had been working toward a piloted satellite since Sputnik, and a secret decree of ' +
      '22 May 1959 approved it alongside the reconnaissance satellite it shared much of its hardware with. The aim, ' +
      'unspoken, was to put a man in orbit before the Americans.',
    how:
      'A sphere for the pilot, its heat shield all round it, on a conical instrument module with the braking engine, ' +
      'launched on the R-7 with an added third stage. The pilot rode an ejection seat, the escape on the pad and the way ' +
      'down at the end: at about 7 km he left the sphere and came down under his own parachute. Uncrewed ships with dogs ' +
      'and, at the last, a mannequin flew first; six pilots followed.',
    legacy:
      'The first person in orbit, the first day, the first pair of ships, the first woman. Its systems were shared with the ' +
      'Zenit reconnaissance satellites, and the ship itself flew on with a crew of three as Voskhod.',
    source: `${SIDDIQI}, pp. 193, 250, 253 to 283 and 353; the Vostok flights’ READMEs`,
  },
  {
    id: 'ussr/voskhod',
    name: 'Voskhod',
    nation: 'USSR',
    years: '1964–1965',
    why:
      'To fly three cosmonauts, and then a walk outside, before Gemini could. Who ordered it is not settled: the long-told ' +
      'story is Khrushchev’s, but Siddiqi finds the evidence for that thin, and some of it pointing to Korolev himself.',
    how:
      'A Vostok rebuilt in five months: the ejection seat out, couches across the sphere, no pressure suits, a backup ' +
      'braking engine (three people had air for a day, not the ten days that let a Vostok wait for its orbit to decay) and ' +
      'solid rockets in the parachute lines to soften the landing, on a launch vehicle first built for the Zenit ' +
      'satellites. The second carried an airlock that folded up under the fairing and inflated in orbit.',
    legacy:
      'Two flights and two firsts, a crew of three and a walk in space, at the cost of two years in which the Soyuz waited. ' +
      'Voskhod 3, an eighteen-day flight, was cancelled in 1966 two weeks before it was to fly.',
    source: `${SIDDIQI}, pp. 385, 409 to 460, 525, 658 and 669`,
  },
  {
    id: 'ussr/soyuz',
    name: 'Soyuz',
    nation: 'USSR',
    years: '1967–',
    why:
      'Born in 1963 as the Soyuz complex, “union”: a ship and rocket stages to be joined in orbit to send cosmonauts round ' +
      'the Moon. The Moon went to other ships, and Soyuz became the craft for learning to dock, and then the ferry to the ' +
      'stations.',
    how:
      'Three modules: a living compartment in front, the descent module for landing, and an instrument module with the ' +
      'engine and the solar panels; a radar, Igla, to bring two ships together by themselves. It is launched on a rocket ' +
      'descended from the R-7 that put up Sputnik.',
    legacy:
      'It began with Komarov’s death and lost three more men on Soyuz 11, and it is still flying: Soyuz ships carry crews to ' +
      'the International Space Station today.',
    source: `${SIDDIQI}, pp. 347 to 349, 571 to 589 and 773 to 783; Rossiyskaya Gazeta, 24 August 2025 (the Soyuz MS crews)`,
  },
  {
    id: 'usa/apollo',
    name: 'Apollo',
    nation: 'USA',
    years: '1968–1972',
    why:
      'NASA announced in July 1960 a programme to follow Mercury and fly men round the Moon, and named it Apollo. ' +
      'Gagarin’s flight changed its aim: on 25 May 1961 President Kennedy asked Congress to commit the nation to ' +
      'landing a man on the Moon and returning him safely to the Earth before the decade was out.',
    how:
      'NASA chose lunar-orbit rendezvous, announced on 11 July 1962: one Saturn V would send ' +
      'a three-man command and service module and a two-man lunar module to the Moon, the lander would go down and ' +
      'come back up, and only the command module would return. The smaller Saturn IB tested the ships in Earth orbit. ' +
      'The fire of January 1967 killed a crew, and the first crew did not fly until twenty-one months later, in ' +
      'October 1968; the first landing was in July 1969.',
    legacy:
      'Six landings between 1969 and 1972 put twelve men on the Moon and brought back its rocks. Its hardware flew on ' +
      'in Skylab in 1973 and 1974 and in the joint flight with the Soviet Union, Apollo-Soyuz, in July 1975.',
    source: `${CHARIOTS}, pp. xiii and xiv (the plan of July 1960; Skylab; Apollo-Soyuz), p. 29 (Kennedy, 25 May 1961), p. 85 (lunar-orbit rendezvous announced 11 July 1962); ${ABTN}, pp. 14 and 94`,
  },
  {
    id: 'usa/skylab',
    name: 'Skylab',
    nation: 'USA',
    years: '1973–1974',
    why:
      'Skylab gave crews time to ask questions that a short flight could barely begin to answer. They measured how their bodies changed ' +
      'over weeks in orbit, watched the Sun through telescopes above the atmosphere and trained instruments on the Earth.',
    how:
      'A Saturn V launched the uncrewed station with its workshop already fitted out inside a converted rocket stage. ' +
      'Each crew followed separately in an Apollo command and service module on a Saturn IB. The crew docked at one end of the station ' +
      'and lived and worked in what had been designed as a liquid hydrogen tank.',
    legacy:
      'The first crew repaired the station. Two more crews followed, bringing the three stays to 28, 59 and 84 days. ' +
      'The last crew came home in February 1974. Skylab itself re-entered over the Indian Ocean and Western Australia in July 1979.',
    source: 'NASA, Skylab mission overview. Compton and Benson, Living and Working in Space, NASA SP-4208, chapters 14–19.',
  },
  {
    id: 'usa/mercury',
    name: 'Project Mercury',
    nation: 'USA',
    years: '1961–1963',
    why:
      'NASA’s first programme, given it in its first weeks: to put a man into orbit, see how he fared and bring him back. The ' +
      'Space Task Group at Langley, under Robert Gilruth, ran it; Glennan and Dryden named it on 26 November 1958, for the ' +
      'messenger of the gods.',
    how:
      'A one-man capsule built by McDonnell, blunt end first, with a tower to pull it off a failing rocket. Redstones for ' +
      'flights up and down, Atlases for orbit; animals before men; a network of tracking stations round the world. Seven pilots ' +
      'were chosen in April 1959 and six flew: two suborbital flights and four orbital.',
    legacy:
      'It showed that a person could live and work in orbit and come back, and gave NASA its astronauts, its control centre and ' +
      'its tracking network. Before it ended, Kennedy had given the agency the Moon, and Gemini was being built to learn how.',
    source: `${TNO}, pp. 113, 132, 160 and chapters 11 to 14`,
  },
  {
    id: 'usa/gemini',
    name: 'Project Gemini',
    nation: 'USA',
    years: '1965–1966',
    why:
      'Between Mercury and Apollo, NASA needed to learn what a trip to the Moon would ask: to meet and dock with another craft, ' +
      'to stay up two weeks, to work outside. Gilruth announced a two-man Mercury on 7 December 1961; a committee at headquarters ' +
      'named it Gemini, the Twins, after Alex Nagy’s suggestion.',
    how:
      'A two-man McDonnell spacecraft that could change its orbit, launched on the Air Force’s Titan II, with Agena target ' +
      'stages sent up on Atlases to be met and docked with. Ten crews flew in less than twenty months.',
    legacy:
      'Rendezvous, docking, two weeks in orbit and work outside were all done by the end of 1966, and the men who did them flew ' +
      'Apollo. Its history calls it the time when America caught up with the Soviet Union in human spaceflight and passed it.',
    source: `${TITANS}, pp. 1 to 4 and 73, and the foreword`,
  },
];

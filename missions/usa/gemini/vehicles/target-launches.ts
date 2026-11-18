/** NASA SP-4002, Appendix I, Table B (launch times in EST, converted to UTC); NASA CR-1106, pp. 334–336 and 342 (adapter identities). */
export const targetLaunches = {
  'gatv-5002': {
    name: 'GATV-5002',
    mission: 'Gemini VI',
    launch: '1965-10-25T15:00:04.490Z',
    atlas: '5301',
    adapter: '2',
    headline: 'The target Gemini VI never reached',
    story:
      'The target was lost during ascent on 25 October 1965. Schirra and Stafford were still on the pad. They flew in December to meet Gemini VII instead.',
  },
  'gatv-5003': {
    name: 'GATV-5003',
    mission: 'Gemini VIII',
    launch: '1966-03-16T15:00:03.127Z',
    atlas: '5302',
    adapter: '3',
    headline: 'The target for the first orbital docking',
    story:
      'Armstrong and Scott docked with this Agena in March. Four months later Collins reached it again from Gemini X and retrieved its micrometeorite collector.',
  },
  'gatv-5004': {
    name: 'GATV-5004',
    mission: 'Gemini IX',
    launch: '1966-05-17T15:15:03.422Z',
    atlas: '5303',
    adapter: '5',
    headline: 'The original Gemini IX target',
    story:
      'The Atlas and Agena were lost together on 17 May 1966. A replacement target reached orbit on 1 June, giving Stafford and Cernan a second chance to fly the rendezvous.',
  },
  atda: {
    name: 'ATDA',
    mission: 'Gemini IX-A',
    launch: '1966-06-01T15:00:02.363Z',
    atlas: '5304',
    adapter: '4',
    headline: 'A shroud held open',
    story:
      'Launched as the replacement for GATV-5004, the shorter target kept both halves of its shroud. Stafford and Cernan flew three rendezvous. The obstructed cone prevented docking.',
  },
  'gatv-5005': {
    name: 'GATV-5005',
    mission: 'Gemini X',
    launch: '1966-07-18T20:39:46.131Z',
    atlas: '5305',
    adapter: '1A',
    headline: 'An engine for a second rendezvous',
    story:
      'Young and Collins docked with their Agena and used its engine to change orbit. They then left it to visit the dormant target from Gemini VIII.',
  },
  'gatv-5006': {
    name: 'GATV-5006',
    mission: 'Gemini XI',
    launch: '1966-09-12T13:05:01.725Z',
    atlas: '5306',
    adapter: '6',
    headline: 'A target on a tether',
    story:
      'Conrad and Gordon docked on their first orbit. The Agena later raised the joined spacecraft to a high apogee. Gordon attached the tether for the subsequent separation experiment.',
  },
  'gatv-5001': {
    name: 'GATV-5001',
    mission: 'Gemini XII',
    launch: '1966-11-11T19:07:58.688Z',
    atlas: '5307',
    adapter: '7A',
    headline: 'A workplace for Aldrin',
    story:
      'Lovell and Aldrin docked with the refurbished target after their rendezvous radar failed. The fittings on its adapter gave Aldrin secure holds while working outside.',
  },
} as const;

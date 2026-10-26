export interface Landmark {
  id: string
  name: string
  category: string
  description: string
  facts: { label: string; value: string }[]
  longitude: number
  latitude: number
  /** Ellipsoidal (WGS84) height of the ground at the landmark, in meters. */
  height: number
  /** Camera framing: heading/pitch in degrees, range in meters from the target. */
  view: { heading: number; pitch: number; range: number }
}

// Coordinates from Wikipedia; heights from Kartverket's NN2000 terrain model,
// converted to ellipsoidal heights (geoid separation ≈ 39.4 m in Lillehammer).
export const landmarks: Landmark[] = [
  {
    id: 'art-museum',
    name: 'Lillehammer Art Museum',
    category: 'Art & culture',
    description:
      'Founded in 1921 as a gift from merchant Einar Lunde, the museum on Stortorget holds over 100 paintings from adherents of the Matisse school alongside 19th-century Norwegian art. The older building was designed by Erling Viksjø; the newer wing by Snøhetta served as the main cultural venue during the 1994 Winter Olympics.',
    facts: [
      { label: 'Founded', value: '1921' },
      { label: 'Architects', value: 'Viksjø, Snøhetta' },
      { label: 'Location', value: 'Stortorget' },
    ],
    longitude: 10.46389,
    latitude: 61.11556,
    height: 226.8,
    view: { heading: 60, pitch: -30, range: 450 },
  },
  {
    id: 'church',
    name: 'Lillehammer Church',
    category: 'Architecture',
    description:
      'The red brick long church was built in 1882 to plans by architect Henrik Thrap-Meyer. It is the parish church of Lillehammer and the seat of the Sør-Gudbrandsdal deanery in the Diocese of Hamar.',
    facts: [
      { label: 'Built', value: '1882' },
      { label: 'Architect', value: 'H. Thrap-Meyer' },
      { label: 'Seats', value: '≈ 650' },
    ],
    longitude: 10.46447,
    latitude: 61.11151,
    height: 223.7,
    view: { heading: 45, pitch: -30, range: 400 },
  },
  {
    id: 'maihaugen',
    name: 'Maihaugen',
    category: 'Open-air museum',
    description:
      "With close to 200 buildings, Maihaugen is one of Northern Europe's largest open-air museums. Its farms, workshops and town houses trace Norwegian everyday life through the centuries, and it is one of Lillehammer's most visited attractions.",
    facts: [
      { label: 'Buildings', value: '≈ 200' },
      { label: 'Type', value: 'Open-air museum' },
      { label: 'Founder', value: 'Anders Sandvig' },
    ],
    longitude: 10.47843,
    latitude: 61.11282,
    height: 295.4,
    view: { heading: 30, pitch: -35, range: 700 },
  },
  {
    id: 'hakons-hall',
    name: 'Håkons Hall',
    category: '1994 Olympic venue',
    description:
      "Opened in 1993 for the Olympic ice hockey tournament, Håkons Hall at Stampesletta seats 11,500 and is Norway's largest handball and ice hockey arena. It has since hosted world championships in ice hockey and handball and the Junior Eurovision Song Contest 2004.",
    facts: [
      { label: 'Opened', value: '1 Feb 1993' },
      { label: 'Capacity', value: '11,500' },
      { label: 'Cost', value: 'NOK 238 M' },
    ],
    longitude: 10.47406,
    latitude: 61.12382,
    height: 302.8,
    view: { heading: 60, pitch: -30, range: 600 },
  },
  {
    id: 'hakon-hakonssons-veg-38',
    name: 'Håkon Håkonssons veg 38',
    category: 'Residential address',
    description:
      "A residential address on the hillside 1.6 km north of Stortorget, about 268 m above sea level. The surrounding streets are named after figures from the saga age, such as Kong Sverres veg, Hertug Skules veg, Halvdan Svartes veg and Snorres veg. The street's namesake, King Håkon Håkonsson (1204–1263), was carried as an infant from Lillehammer over the mountains to Østerdalen by Birkebeiner skiers in 1206, the journey commemorated by today's Birkebeiner races.",
    facts: [
      { label: 'Gnr./bnr.', value: '52/112' },
      { label: 'Elevation', value: '268 m' },
      { label: 'To Stortorget', value: '1.6 km' },
    ],
    // Address point from Kartverket's address register.
    longitude: 10.465938,
    latitude: 61.129469,
    height: 307.4,
    view: { heading: 70, pitch: -35, range: 350 },
  },
  {
    id: 'lysgardsbakken',
    name: 'Lysgårdsbakkene Ski Jumping Arena',
    category: '1994 Olympic venue',
    description:
      'The ski jumps above the town hosted ski jumping, Nordic combined and the opening and closing ceremonies of the 1994 Winter Olympics. The large hill was rebuilt to a larger profile in 2007 and the arena still hosts World Cup events, with room for 35,000 spectators.',
    facts: [
      { label: 'Opened', value: '1993' },
      { label: 'Large hill', value: 'K123 / HS138' },
      { label: 'Capacity', value: '35,000' },
    ],
    longitude: 10.48722,
    latitude: 61.125,
    height: 384.7,
    view: { heading: 90, pitch: -20, range: 900 },
  },
  {
    id: 'birkebeineren',
    name: 'Birkebeineren Ski Stadium',
    category: '1994 Olympic venue',
    description:
      'Three kilometers from the town center at 485 m above sea level, this cross-country and biathlon venue was built for the 1994 Olympics and Paralympics. It later hosted World Cup races and the 2016 Winter Youth Olympics.',
    facts: [
      { label: 'Elevation', value: '485 m' },
      { label: 'Capacity', value: '31,000' },
      { label: 'Cost', value: 'NOK 83.6 M' },
    ],
    longitude: 10.50637,
    latitude: 61.13411,
    height: 528.4,
    view: { heading: 45, pitch: -30, range: 800 },
  },
  {
    id: 'bobsleigh',
    name: 'Olympic Bobsleigh and Luge Track',
    category: '1994 Olympic venue',
    description:
      'At Hunderfossen, 15 km north of the town center, the 1,710 m track was completed in 1992 for the Olympic bobsleigh and luge events. The bobsleigh course drops 114 m at an average grade of 8.5 percent.',
    facts: [
      { label: 'Completed', value: '1992' },
      { label: 'Length', value: '1,710 m' },
      { label: 'Vertical drop', value: '114 m' },
    ],
    longitude: 10.42742,
    latitude: 61.22429,
    height: 264.7,
    view: { heading: 20, pitch: -30, range: 1100 },
  },
]

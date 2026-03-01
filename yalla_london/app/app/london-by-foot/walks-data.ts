export interface WalkStop {
  name: string
  description: string
  tip: string
}

export interface Walk {
  slug: string
  title: string
  subtitle: string
  heroImage: string
  distance: string
  duration: string
  difficulty: string
  startPoint: string
  endPoint: string
  bestTime: string
  mapQuery: string
  intro: string
  stops: WalkStop[]
  pdfTeaser: string
}

export const walks: Walk[] = [
  {
    slug: 'royal-london-walk',
    title: 'The Royal London Walk',
    subtitle: 'Buckingham Palace to Big Ben via St James\'s Park',
    heroImage: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=1200&q=80',
    distance: '3.2 km (2 miles)',
    duration: '2-3 hours',
    difficulty: 'Easy',
    startPoint: 'Green Park Station',
    endPoint: 'Westminster Station',
    bestTime: 'Morning (catch the Changing of the Guard at 11:00)',
    mapQuery: 'Buckingham+Palace+to+Westminster+London',
    intro: 'This walk takes you through the ceremonial heart of London — from the gates of Buckingham Palace, through the elegant St James\'s Park, past Horse Guards Parade, and finishing at the iconic Houses of Parliament and Big Ben. You\'ll pass more royal landmarks in 2 miles than most cities have in their entire country. Perfect for first-time visitors or anyone who wants to understand why London is the world\'s most regal capital.',
    stops: [
      {
        name: 'Buckingham Palace & The Queen Victoria Memorial',
        description: 'Start at the grand forecourt of Buckingham Palace, the King\'s official London residence since 1837. The ornate Queen Victoria Memorial sits at the centre of the roundabout, with golden angels and marble sculptures. If you arrive before 11:00 AM, position yourself along the railings for the Changing of the Guard ceremony — a spectacle of precision, music, and bearskin hats.',
        tip: 'The Changing of the Guard happens daily April-July and every other day the rest of the year. Arrive 45 minutes early for a good spot.'
      },
      {
        name: 'The Mall & St James\'s Park',
        description: 'Walk down The Mall, the grand ceremonial avenue lined with Union Jack flags that leads from Buckingham Palace to Trafalgar Square. Turn into St James\'s Park — London\'s oldest royal park and arguably its most beautiful. Follow the lakeside path where you\'ll spot pelicans (fed daily at 2:30 PM), black swans, and picture-perfect views of the palace framed by weeping willows.',
        tip: 'The bridge in the centre of the lake offers the best photo opportunity in all of London — Buckingham Palace in one direction, the London Eye in the other.'
      },
      {
        name: 'Horse Guards Parade',
        description: 'Exit St James\'s Park onto Horse Guards Parade, the vast ceremonial ground where Trooping the Colour takes place each June. Walk through the archway to see the mounted Queen\'s Life Guard — two soldiers on horseback in gleaming breastplates and plumed helmets, standing perfectly still. You can stand right next to them for photos.',
        tip: 'The guard changes at 11:00 AM (10:00 AM Sundays). The dismounted inspection at 4:00 PM is less crowded and equally impressive.'
      },
      {
        name: 'Downing Street & The Cenotaph',
        description: 'Continue along Whitehall past the gates of 10 Downing Street, the Prime Minister\'s residence since 1735. Further along stands The Cenotaph, Britain\'s national war memorial. This simple Portland stone monument is the focal point of Remembrance Day each November, when the nation falls silent.',
        tip: 'You can\'t enter Downing Street, but the famous black door is visible through the security gates. Look for the policeman standing guard.'
      },
      {
        name: 'Houses of Parliament, Big Ben & Westminster Abbey',
        description: 'The walk culminates at Parliament Square, surrounded by arguably the most photographed buildings on Earth. The Palace of Westminster (Houses of Parliament) stretches along the Thames with its Gothic Revival spires. Big Ben — technically the name of the bell, not the tower (which is the Elizabeth Tower) — chimes on the quarter hour. Across the road, Westminster Abbey has hosted every coronation since 1066.',
        tip: 'Cross Westminster Bridge for the classic postcard shot of Big Ben and Parliament reflected in the Thames. The best light is in the late afternoon.'
      }
    ],
    pdfTeaser: 'Our complete Royal London PDF guide includes an offline map, minute-by-minute timing for the Changing of the Guard, best photography positions, a secret entrance to St James\'s Park with no queues, and insider tips for skipping the Westminster Abbey line.'
  },
  {
    slug: 'south-bank-cultural-mile',
    title: 'The South Bank Cultural Mile',
    subtitle: 'Tate Modern to Tower Bridge along the Thames',
    heroImage: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&q=80',
    distance: '4 km (2.5 miles)',
    duration: '3-4 hours',
    difficulty: 'Easy',
    startPoint: 'Southwark Station',
    endPoint: 'Tower Hill Station',
    bestTime: 'Late morning (markets and galleries open by 10:00)',
    mapQuery: 'Tate+Modern+to+Tower+Bridge+London',
    intro: 'The South Bank is where London comes alive. This riverside walk connects the city\'s greatest free gallery, Shakespeare\'s reconstructed theatre, London\'s most famous food market, and its most photographed bridge — all linked by a continuous Thames-side promenade with views of St Paul\'s Cathedral and the City skyline. Every 100 metres brings something new: street performers, book stalls, pop-up food vendors, and some of the best views in the city.',
    stops: [
      {
        name: 'Tate Modern',
        description: 'Begin at the former Bankside Power Station, now one of the world\'s most visited modern art galleries — and it\'s completely free. The Turbine Hall hosts colossal installations that change annually. Permanent collections include Warhol, Picasso, Rothko, and Hockney. The 10th floor viewing gallery offers sweeping panoramas of the Thames and St Paul\'s Cathedral.',
        tip: 'The viewing gallery on Level 10 of the Blavatnik Building is free and less crowded than the paid viewing platforms across the river. Go at sunset.'
      },
      {
        name: 'Millennium Bridge & Shakespeare\'s Globe',
        description: 'Step onto the Millennium Bridge — the sleek pedestrian bridge that famously wobbled when it opened in 2000 (now fixed). It frames a perfect view of St Paul\'s Cathedral. Back on the South Bank, you\'ll pass Shakespeare\'s Globe Theatre, a faithful recreation of the 1599 original. In summer, you can watch open-air performances exactly as Elizabethan audiences did.',
        tip: 'Standing tickets (called "groundling" tickets) at the Globe cost just £5 and are the most authentic way to experience Shakespeare — but you\'ll stand for 3 hours.'
      },
      {
        name: 'Borough Market',
        description: 'London\'s oldest food market has been trading since 1014 — over a thousand years. Today it\'s a gourmet paradise under Victorian iron-and-glass arches. Sample artisan cheeses, fresh oysters, Ethiopian injera, Neapolitan pizza, Turkish gozleme, and some of the best sourdough bread in Britain. This isn\'t a tourist trap — London chefs shop here.',
        tip: 'Come hungry. The best stalls for a quick lunch: Kappacasein (raclette), Bread Ahead (doughnuts), and Padella (fresh pasta — the queue moves fast).'
      },
      {
        name: 'HMS Belfast & The Shard',
        description: 'Continue along the riverside past the towering Shard (Western Europe\'s tallest building at 310m) and HMS Belfast, a WWII cruiser permanently moored in the Thames. You can board the ship and explore nine decks of naval history, from the bridge to the boiler rooms. The Shard\'s viewing gallery on floors 69-72 offers London\'s highest panorama.',
        tip: 'Skip the Shard\'s paid viewing gallery (£28+). Instead, ride the free lift to the Aqua Shard restaurant on the 31st floor — you can order just a drink and enjoy similar views.'
      },
      {
        name: 'Tower Bridge',
        description: 'The walk\'s grand finale is Tower Bridge, London\'s most recognisable landmark. Built in 1894, its twin Gothic towers house an exhibition explaining the Victorian engineering that lifts the bridge for tall ships (it still opens around 800 times a year). The glass floor walkway on the upper level lets you look straight down at the Thames 42 metres below.',
        tip: 'Check the Tower Bridge lift times online before you visit. Watching the bridge open from the South Bank walkway is free and spectacular.'
      }
    ],
    pdfTeaser: 'Our complete South Bank PDF guide includes a Borough Market food map with our top 15 stalls ranked, free gallery highlights route, best photography spots at golden hour, and a secret Thames-side pub trail with 6 historic riverside pubs most tourists never find.'
  },
  {
    slug: 'historic-city-of-london',
    title: 'The Historic City of London Walk',
    subtitle: 'The Tower of London to St Paul\'s Cathedral through 2,000 years of history',
    heroImage: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200&q=80',
    distance: '3.5 km (2.2 miles)',
    duration: '2.5-3.5 hours',
    difficulty: 'Easy-Moderate',
    startPoint: 'Tower Hill Station',
    endPoint: 'St Paul\'s Station',
    bestTime: 'Weekday morning (the City is quiet on weekends)',
    mapQuery: 'Tower+of+London+to+St+Pauls+Cathedral+London',
    intro: 'The Square Mile — London\'s ancient walled city — packs 2,000 years of history into the smallest area imaginable. Roman walls sit next to Norman castles, medieval churches hide between glass skyscrapers, and the streets follow paths laid down before the English language existed. This walk connects London\'s most important historical sites while weaving through the hidden alleys and courtyards that most visitors never discover.',
    stops: [
      {
        name: 'Tower of London',
        description: 'Begin at William the Conqueror\'s 1066 fortress — a UNESCO World Heritage Site that has served as a royal palace, prison, armoury, treasury, and zoo. The Crown Jewels are housed here, including the 530-carat Great Star of Africa diamond. Yeoman Warders (Beefeaters) lead free tours every 30 minutes, telling tales of executions, escapes, and royal intrigue.',
        tip: 'Arrive when the gates open at 9:00 AM and go straight to the Crown Jewels — by 11:00 AM the queue can be 45 minutes. The Yeoman Warder tours start from the main entrance every 30 minutes.'
      },
      {
        name: 'The Monument & Pudding Lane',
        description: 'Walk west to The Monument, a 62-metre Doric column designed by Christopher Wren to commemorate the Great Fire of London in 1666. It stands exactly 62 metres from the spot on Pudding Lane where the fire began in Thomas Farriner\'s bakery. Climb the 311 steps to the top for a 360-degree view of the City — you\'ll receive a certificate for completing the climb.',
        tip: 'The 311 steps are worth every one. Combined tickets with Tower Bridge save £3. The staircase is narrow — not for the claustrophobic.'
      },
      {
        name: 'Leadenhall Market',
        description: 'Duck into Leadenhall Market, a stunning Victorian covered market with ornate cobalt blue, maroon, and cream ironwork. It\'s been a market site since the 14th century and was used as Diagon Alley in the first Harry Potter film. Today it houses boutique shops, wine bars, and City restaurants — a secret oasis surrounded by towering offices.',
        tip: 'The entrance from Gracechurch Street is the one used in Harry Potter. Come at lunchtime on a weekday to experience the buzzing City atmosphere, but visit on a weekend for empty photo ops.'
      },
      {
        name: 'Bank of England & The Royal Exchange',
        description: 'The heart of the financial world. The Bank of England has controlled Britain\'s money supply since 1694 — its free museum displays gold bars you can (try to) lift, historic banknotes, and a section of Roman mosaic found during construction. Across the road, the Royal Exchange (founded 1565) is now a luxury shopping arcade with a grand courtyard.',
        tip: 'The Bank of England Museum is free and rarely crowded. The gold bar weighs 13kg — most people can\'t lift it with one hand. Open weekdays only.'
      },
      {
        name: 'St Paul\'s Cathedral',
        description: 'Sir Christopher Wren\'s masterpiece, completed in 1710 after the Great Fire destroyed its medieval predecessor. The dome is one of the largest in the world — climb 528 steps to the Golden Gallery at the very top for the best panorama in London. The Whispering Gallery demonstrates an acoustic phenomenon: whisper against the wall and someone on the opposite side, 34 metres away, can hear you clearly.',
        tip: 'Visit at 5:00 PM for Evensong (free) — the choir is world-class and you experience the cathedral in its most magical state, lit by candles. No photography during services.'
      }
    ],
    pdfTeaser: 'Our complete Historic City PDF guide includes a secret Roman London trail with 8 hidden ruins, the best pubs in the Square Mile ranked by a local, a complete Wren churches walking tour (51 churches!), and an after-dark City walk with ghost stories at every stop.'
  },
  {
    slug: 'notting-hill-kensington',
    title: 'Notting Hill to Kensington Walk',
    subtitle: 'Portobello Road to the Royal Museums via hidden garden squares',
    heroImage: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=1200&q=80',
    distance: '4.5 km (2.8 miles)',
    duration: '3-4 hours',
    difficulty: 'Easy',
    startPoint: 'Notting Hill Gate Station',
    endPoint: 'South Kensington Station',
    bestTime: 'Saturday morning (Portobello Market day)',
    mapQuery: 'Portobello+Road+to+South+Kensington+London',
    intro: 'From the colourful antique stalls of Portobello Road to the grand museums of South Kensington, this walk takes you through some of London\'s most photogenic neighbourhoods. You\'ll pass pastel-coloured houses that inspired a hundred Instagram accounts, wander through hidden garden squares, explore the grounds of a royal palace, and finish at the world\'s greatest free museums. This is London at its most charming.',
    stops: [
      {
        name: 'Portobello Road Market',
        description: 'Start at the world\'s largest antique market. On Saturdays, Portobello Road transforms into a mile-long treasure hunt stretching from Notting Hill Gate to Ladbroke Grove. The southern end sells genuine antiques and vintage jewellery, the middle section has food stalls and fashion, and the northern end under the Westway has emerging designers and vinyl records. The pastel-painted houses along the road are the most Instagrammed in London.',
        tip: 'Come early (before 9:00 AM on Saturday) for the best antiques finds. The food stalls under the Westway canopy are excellent — try the Moroccan tagine and the German bratwurst.'
      },
      {
        name: 'The Colourful Houses of Notting Hill',
        description: 'Wander east from Portobello Road into the residential streets of Notting Hill. Lancaster Road, Westbourne Grove, and Elgin Crescent are lined with candy-coloured Georgian townhouses in shades of pink, baby blue, lemon yellow, and mint green. This is the neighbourhood made famous by the Hugh Grant film — the blue door from the movie is on Westbourne Park Road.',
        tip: 'The best street for photos is Lancaster Road (near the junction with Portobello). For the famous blue door, head to 280 Westbourne Park Road — but please be respectful of residents.'
      },
      {
        name: 'Kensington Palace & Gardens',
        description: 'Enter Kensington Gardens (the western extension of Hyde Park) and walk to Kensington Palace, the official London residence of the Prince and Princess of Wales. The palace has been a royal home since 1689 — Queen Victoria was born here in 1819. The formal Sunken Garden is one of London\'s hidden gems: a geometric pond surrounded by lime trees and flowering beds.',
        tip: 'The Sunken Garden is free to view from the path and is stunning in spring/summer. The palace State Apartments are worth the entry fee for the King\'s Gallery and the Victoria Revealed exhibition.'
      },
      {
        name: 'The Albert Memorial & Royal Albert Hall',
        description: 'Cross Kensington Gardens to the ornate Albert Memorial, a 54-metre Gothic Revival monument commissioned by Queen Victoria for her beloved husband Prince Albert. Across the road stands the Royal Albert Hall, the iconic circular concert venue that hosts the BBC Proms every summer. The red-brick exterior and terracotta frieze are magnificent even from outside.',
        tip: 'Guided tours of the Royal Albert Hall run daily and take you backstage, into the Royal Box, and up to the gallery. Book in advance — they sell out.'
      },
      {
        name: 'Natural History Museum & V&A',
        description: 'Finish at Exhibition Road, home to two of the world\'s greatest museums — both completely free. The Natural History Museum\'s Romanesque terracotta cathedral houses dinosaur skeletons, the Darwin Centre, and an earthquake simulator. Next door, the Victoria & Albert Museum (V&A) is the world\'s largest museum of decorative arts: fashion, sculpture, photography, and architecture across 7 miles of galleries.',
        tip: 'The Natural History Museum\'s Hintze Hall with the blue whale skeleton is breathtaking. At the V&A, don\'t miss the Cast Courts (full-size replica of Trajan\'s Column) and the jewellery galleries on the first floor.'
      }
    ],
    pdfTeaser: 'Our complete Notting Hill to Kensington PDF guide includes a Portobello Market haggling guide with insider price ranges, a secret garden squares trail (6 hidden gardens), Kensington Palace photography spots, and a curated list of the 10 best cafés along the route with our personal order recommendations.'
  },
  {
    slug: 'east-london-creative-quarter',
    title: 'East London Creative Quarter',
    subtitle: 'Shoreditch to Brick Lane — street art, markets, and London\'s coolest neighbourhood',
    heroImage: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&q=80',
    distance: '3.8 km (2.4 miles)',
    duration: '3-4 hours',
    difficulty: 'Easy',
    startPoint: 'Shoreditch High Street Overground',
    endPoint: 'Whitechapel Station',
    bestTime: 'Sunday morning (all markets open, Brick Lane buzzing)',
    mapQuery: 'Shoreditch+High+Street+to+Whitechapel+London',
    intro: 'Forget the tourist London of postcards. East London is where the city\'s creative pulse beats loudest. This walk takes you through the street art capital of Europe, past the curry houses of Brick Lane, through vintage markets bursting with one-of-a-kind finds, and into the craft beer bars and independent coffee shops that have made Shoreditch the coolest neighbourhood in Britain. This is the London that Londoners love most.',
    stops: [
      {
        name: 'Shoreditch Street Art Trail',
        description: 'Start at Shoreditch High Street and immediately plunge into the world\'s greatest open-air gallery. Every surface — walls, shutters, phone boxes, bins — is covered in street art by international artists. Rivington Street, Great Eastern Street, and the alleys off Curtain Road are dense with murals that change weekly. Look for works by Banksy, Stik, Ben Eine, and ROA.',
        tip: 'The best street art concentrates around Rivington Street, Fashion Street, and the Nomadic Community Garden on Shoreditch High Street. Works change constantly — that\'s the point.'
      },
      {
        name: 'Boxpark Shoreditch & Old Spitalfields Market',
        description: 'Boxpark Shoreditch is a shipping container mall with independent food vendors — grab a specialty coffee or a Korean bao bun. Continue south to Old Spitalfields Market, a covered market under a Victorian glass roof that has traded since 1638. Depending on the day: vintage clothes (Thursday), antiques (Wednesday), or independent designers (weekends).',
        tip: 'Thursday is the best day for Spitalfields — the vintage and antiques stalls are excellent and far less crowded than the weekend. The Ottolenghi stall in the market is superb.'
      },
      {
        name: 'Brick Lane',
        description: 'London\'s most famous multicultural street. The northern end is the curry capital of Britain — dozens of Bangladeshi restaurants compete for your attention with touts and special offers. The southern end has transformed into a hipster paradise of vintage shops, independent galleries, bagel shops (the Beigel Bake has been open 24/7 since 1974), and the Sunday UpMarket with 140+ food and craft stalls.',
        tip: 'The Beigel Bake at 159 Brick Lane is a London institution — open 24 hours, a salt beef bagel costs under £5 and is enormous. The queue moves fast.'
      },
      {
        name: 'Columbia Road Flower Market (Sunday only)',
        description: 'If walking on a Sunday, detour to Columbia Road — a narrow Victorian street that transforms into London\'s most beautiful market. From 8:00 AM, the entire street fills with flower sellers, their stalls overflowing with orchids, sunflowers, roses, and rare plants. The atmosphere is intoxicating: cockney traders shouting prices, the scent of fresh flowers, and independent shops lining both sides.',
        tip: 'Arrive by 8:30 AM for the full experience and the best selection. By noon, sellers slash prices to clear stock — you can pick up extraordinary bouquets for £5. Sunday only.'
      },
      {
        name: 'Whitechapel Gallery & The Blind Beggar',
        description: 'End at the Whitechapel Gallery, one of London\'s most important contemporary art spaces (free entry), which first exhibited Picasso\'s Guernica to the British public in 1939. Nearby, the Blind Beggar pub on Whitechapel Road is where Ronnie Kray shot George Cornell in 1966 — one of the most infamous moments in London\'s gangland history. Today it\'s a perfectly pleasant pub.',
        tip: 'The Whitechapel Gallery\'s ground floor shows and café are free. Check their website for current exhibitions — they consistently show some of London\'s most exciting contemporary art.'
      }
    ],
    pdfTeaser: 'Our complete East London PDF guide includes a self-guided street art map with 30+ must-see murals and their exact locations, a Brick Lane food guide with our top 8 curry houses ranked, a vintage shopping price guide, and a Sunday market schedule covering all 5 East London markets with timings and specialties.'
  }
]

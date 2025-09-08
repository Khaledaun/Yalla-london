/**
 * Phase 4A Initial Seeding Script
 * 
 * This script provides idempotent seeding for Phase 4A database extensions:
 * - 30 Places (London attractions, restaurants, etc.)
 * - 7 PageType recipes (content templates)
 * - Initial Rulebook version
 * 
 * Safe to run multiple times - uses upsert patterns to avoid duplicates
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting Phase 4A initial seeding...')

  // Seed PageType recipes
  console.log('📄 Seeding PageType recipes...')
  
  const pageTypeRecipes = [
    {
      type: 'guide',
      requiredBlocks: ['introduction', 'main_content', 'conclusion', 'practical_info'],
      optionalBlocks: ['gallery', 'map', 'tips', 'related_content'],
      schemaPlan: {
        '@type': 'Article',
        mainEntityOfPage: true,
        author: true,
        datePublished: true,
        breadcrumb: true
      },
      minWordCount: 1200
    },
    {
      type: 'place',
      requiredBlocks: ['overview', 'location', 'contact_info', 'opening_hours'],
      optionalBlocks: ['gallery', 'reviews', 'amenities', 'nearby_places'],
      schemaPlan: {
        '@type': 'Place',
        address: true,
        geo: true,
        openingHours: true,
        aggregateRating: true
      },
      minWordCount: 800
    },
    {
      type: 'event',
      requiredBlocks: ['event_details', 'date_time', 'location', 'booking_info'],
      optionalBlocks: ['gallery', 'schedule', 'speakers', 'sponsors'],
      schemaPlan: {
        '@type': 'Event',
        startDate: true,
        endDate: true,
        location: true,
        organizer: true
      },
      minWordCount: 600
    },
    {
      type: 'list',
      requiredBlocks: ['introduction', 'list_items', 'methodology'],
      optionalBlocks: ['comparison_table', 'map', 'conclusion'],
      schemaPlan: {
        '@type': 'Article',
        mainEntityOfPage: true,
        itemList: true
      },
      minWordCount: 1000
    },
    {
      type: 'faq',
      requiredBlocks: ['questions_answers', 'introduction'],
      optionalBlocks: ['related_links', 'contact_info'],
      schemaPlan: {
        '@type': 'FAQPage',
        mainEntity: true
      },
      minWordCount: 400
    },
    {
      type: 'news',
      requiredBlocks: ['headline', 'article_body', 'date_published'],
      optionalBlocks: ['images', 'related_articles', 'author_bio'],
      schemaPlan: {
        '@type': 'NewsArticle',
        headline: true,
        datePublished: true,
        author: true
      },
      minWordCount: 500
    },
    {
      type: 'itinerary',
      requiredBlocks: ['overview', 'day_by_day', 'practical_tips'],
      optionalBlocks: ['map', 'budget_breakdown', 'packing_list'],
      schemaPlan: {
        '@type': 'Article',
        mainEntityOfPage: true,
        itinerary: true
      },
      minWordCount: 1500
    }
  ]

  for (const recipe of pageTypeRecipes) {
    await prisma.pageTypeRecipe.upsert({
      where: { type: recipe.type },
      update: {
        requiredBlocks: recipe.requiredBlocks,
        optionalBlocks: recipe.optionalBlocks,
        schemaPlan: recipe.schemaPlan,
        minWordCount: recipe.minWordCount
      },
      create: {
        type: recipe.type,
        requiredBlocks: recipe.requiredBlocks,
        optionalBlocks: recipe.optionalBlocks,
        schemaPlan: recipe.schemaPlan,
        minWordCount: recipe.minWordCount
      }
    })
  }

  console.log(`✅ Seeded ${pageTypeRecipes.length} PageType recipes`)

  // Seed initial Rulebook version
  console.log('📋 Seeding initial Rulebook version...')
  
  await prisma.rulebookVersion.upsert({
    where: { version: '2024.09.1' },
    update: {
      changelog: 'Initial Phase 4A release with content automation support',
      weights: {
        keyword_density: 0.15,
        readability: 0.20,
        structure: 0.25,
        uniqueness: 0.20,
        engagement: 0.20
      },
      schemaRequirements: {
        all_pages: ['@type', 'name', 'description'],
        article: ['headline', 'datePublished', 'author'],
        place: ['address', 'geo'],
        event: ['startDate', 'location']
      },
      prompts: {
        content_generation: 'Create engaging, SEO-optimized content for London experiences targeting Arabic-speaking visitors...',
        keyword_research: 'Identify relevant keywords for London tourism content in both English and Arabic...',
        content_audit: 'Analyze the following content for SEO compliance and engagement potential...'
      },
      isActive: true
    },
    create: {
      version: '2024.09.1',
      changelog: 'Initial Phase 4A release with content automation support',
      weights: {
        keyword_density: 0.15,
        readability: 0.20,
        structure: 0.25,
        uniqueness: 0.20,
        engagement: 0.20
      },
      schemaRequirements: {
        all_pages: ['@type', 'name', 'description'],
        article: ['headline', 'datePublished', 'author'],
        place: ['address', 'geo'],
        event: ['startDate', 'location']
      },
      prompts: {
        content_generation: 'Create engaging, SEO-optimized content for London experiences targeting Arabic-speaking visitors...',
        keyword_research: 'Identify relevant keywords for London tourism content in both English and Arabic...',
        content_audit: 'Analyze the following content for SEO compliance and engagement potential...'
      },
      isActive: true
    }
  })

  console.log('✅ Seeded initial Rulebook version')

  // Seed 30 Places (London attractions, restaurants, hotels)
  console.log('🏛️ Seeding 30 London places...')
  
  const places = [
    // Major Attractions
    {
      slug: 'tower-of-london',
      name: 'Tower of London',
      category: 'attraction',
      address: 'St Katharine\'s & Wapping, London EC3N 4AB',
      latitude: 51.5081,
      longitude: -0.0759,
      description: 'Historic castle and fortress housing the Crown Jewels',
      website: 'https://www.hrp.org.uk/tower-of-london/',
      openingHours: { 
        monday: '10:00-17:30',
        tuesday: '09:00-17:30',
        wednesday: '09:00-17:30',
        thursday: '09:00-17:30',
        friday: '09:00-17:30',
        saturday: '09:00-17:30',
        sunday: '10:00-17:30'
      },
      priceRange: '£££',
      rating: 4.4,
      tags: ['historic', 'unesco', 'crown-jewels', 'fortress']
    },
    {
      slug: 'london-eye',
      name: 'London Eye',
      category: 'attraction',
      address: 'Riverside Building, County Hall, London SE1 7PB',
      latitude: 51.5033,
      longitude: -0.1196,
      description: 'Giant observation wheel offering panoramic views of London',
      website: 'https://www.londoneye.com/',
      priceRange: '£££',
      rating: 4.2,
      tags: ['views', 'landmark', 'family-friendly', 'thames']
    },
    {
      slug: 'british-museum',
      name: 'British Museum',
      category: 'museum',
      address: 'Great Russell St, Bloomsbury, London WC1B 3DG',
      latitude: 51.5194,
      longitude: -0.1270,
      description: 'World-renowned museum of human history, art and culture',
      website: 'https://www.britishmuseum.org/',
      priceRange: '£',
      rating: 4.5,
      tags: ['museum', 'culture', 'history', 'free-entry']
    },
    {
      slug: 'westminster-abbey',
      name: 'Westminster Abbey',
      category: 'attraction',
      address: '20 Deans Yd, Westminster, London SW1P 3PA',
      latitude: 51.4994,
      longitude: -0.1273,
      description: 'Gothic abbey church and coronation site of British monarchs',
      website: 'https://www.westminster-abbey.org/',
      priceRange: '£££',
      rating: 4.4,
      tags: ['historic', 'religious', 'royal', 'gothic-architecture']
    },
    {
      slug: 'buckingham-palace',
      name: 'Buckingham Palace',
      category: 'attraction',
      address: 'Westminster, London SW1A 1AA',
      latitude: 51.5014,
      longitude: -0.1419,
      description: 'Official London residence of the British monarch',
      website: 'https://www.rct.uk/visit/buckingham-palace',
      priceRange: '£££',
      rating: 4.3,
      tags: ['royal', 'palace', 'changing-guard', 'historic']
    },
    {
      slug: 'tate-modern',
      name: 'Tate Modern',
      category: 'museum',
      address: 'Bankside, London SE1 9TG',
      latitude: 51.5076,
      longitude: -0.0994,
      description: 'Modern art gallery in former power station',
      website: 'https://www.tate.org.uk/visit/tate-modern',
      priceRange: '£',
      rating: 4.4,
      tags: ['art', 'modern', 'gallery', 'free-entry']
    },
    {
      slug: 'tower-bridge',
      name: 'Tower Bridge',
      category: 'attraction',
      address: 'Tower Bridge Rd, London SE1 2UP',
      latitude: 51.5055,
      longitude: -0.0754,
      description: 'Iconic Victorian Gothic bascule bridge over the Thames',
      website: 'https://www.towerbridge.org.uk/',
      priceRange: '££',
      rating: 4.3,
      tags: ['bridge', 'victorian', 'thames', 'views']
    },
    {
      slug: 'covent-garden',
      name: 'Covent Garden',
      category: 'district',
      address: 'Covent Garden, London WC2E',
      latitude: 51.5118,
      longitude: -0.1226,
      description: 'Historic market area with shops, restaurants and street performers',
      priceRange: '££',
      rating: 4.2,
      tags: ['shopping', 'entertainment', 'market', 'street-performers']
    },
    {
      slug: 'st-pauls-cathedral',
      name: 'St Paul\'s Cathedral',
      category: 'attraction',
      address: 'St. Paul\'s Churchyard, London EC4M 8AD',
      latitude: 51.5138,
      longitude: -0.0984,
      description: 'Iconic Baroque cathedral with famous dome',
      website: 'https://www.stpauls.co.uk/',
      priceRange: '££',
      rating: 4.5,
      tags: ['cathedral', 'baroque', 'dome', 'religious']
    },
    {
      slug: 'london-bridge',
      name: 'London Bridge',
      category: 'attraction',
      address: 'London Bridge, London SE1',
      latitude: 51.5079,
      longitude: -0.0877,
      description: 'Historic bridge crossing the River Thames',
      priceRange: '£',
      rating: 4.0,
      tags: ['bridge', 'historic', 'thames', 'walking']
    },
    
    // Restaurants - Fine Dining
    {
      slug: 'sketch-london',
      name: 'Sketch',
      category: 'restaurant',
      address: '9 Conduit St, Mayfair, London W1S 2XG',
      latitude: 51.5139,
      longitude: -0.1436,
      description: 'Innovative fine dining with unique artistic interior design',
      website: 'https://sketch.london/',
      priceRange: '££££',
      rating: 4.2,
      tags: ['fine-dining', 'michelin', 'artistic', 'mayfair']
    },
    {
      slug: 'dishoom-covent-garden',
      name: 'Dishoom Covent Garden',
      category: 'restaurant',
      address: '12 Upper St Martin\'s Ln, London WC2H 9FB',
      latitude: 51.5134,
      longitude: -0.1251,
      description: 'Bombay-style cafe serving authentic Indian cuisine',
      website: 'https://www.dishoom.com/',
      priceRange: '££',
      rating: 4.4,
      tags: ['indian', 'authentic', 'casual-dining', 'popular']
    },
    {
      slug: 'gordon-ramsay-savoy-grill',
      name: 'Savoy Grill by Gordon Ramsay',
      category: 'restaurant',
      address: 'Strand, London WC2R 0EU',
      latitude: 51.5103,
      longitude: -0.1201,
      description: 'Classic British fine dining at the historic Savoy Hotel',
      website: 'https://www.gordonramsayrestaurants.com/savoy-grill/',
      priceRange: '££££',
      rating: 4.3,
      tags: ['fine-dining', 'british', 'historic', 'gordon-ramsay']
    },
    {
      slug: 'dal-london-italian',
      name: 'Dalloway Terrace',
      category: 'restaurant',
      address: '16-22 Great Russell St, Bloomsbury, London WC1B 3NN',
      latitude: 51.5186,
      longitude: -0.1289,
      description: 'Beautiful terrace restaurant with botanical decor',
      priceRange: '£££',
      rating: 4.1,
      tags: ['terrace', 'botanical', 'british', 'bloomsbury']
    },
    {
      slug: 'aqua-shard',
      name: 'Aqua Shard',
      category: 'restaurant',
      address: 'Level 31, The Shard, 31 St Thomas St, London SE1 9RY',
      latitude: 51.5045,
      longitude: -0.0865,
      description: 'Contemporary British cuisine with panoramic London views',
      website: 'https://www.aquashard.co.uk/',
      priceRange: '££££',
      rating: 4.2,
      tags: ['views', 'contemporary', 'shard', 'fine-dining']
    },

    // Hotels
    {
      slug: 'the-savoy-hotel',
      name: 'The Savoy',
      category: 'hotel',
      address: 'Strand, London WC2R 0EZ',
      latitude: 51.5103,
      longitude: -0.1201,
      description: 'Legendary luxury hotel with Art Deco elegance',
      website: 'https://www.thesavoylondon.com/',
      priceRange: '££££',
      rating: 4.6,
      tags: ['luxury', 'historic', 'art-deco', 'five-star']
    },
    {
      slug: 'claridges-hotel',
      name: 'Claridge\'s',
      category: 'hotel',
      address: 'Brook St, Mayfair, London W1K 4HR',
      latitude: 51.5127,
      longitude: -0.1462,
      description: 'Iconic Mayfair hotel blending timeless elegance with modern luxury',
      website: 'https://www.claridges.co.uk/',
      priceRange: '££££',
      rating: 4.5,
      tags: ['luxury', 'mayfair', 'iconic', 'five-star']
    },
    {
      slug: 'the-zetter-townhouse',
      name: 'The Zetter Townhouse',
      category: 'hotel',
      address: '49-50 Seymour St, Marylebone, London W1H 7JG',
      latitude: 51.5155,
      longitude: -0.1578,
      description: 'Charming boutique hotel with vintage character',
      website: 'https://www.thezettertownhouse.com/',
      priceRange: '£££',
      rating: 4.3,
      tags: ['boutique', 'vintage', 'marylebone', 'charming']
    },
    {
      slug: 'the-ned-hotel',
      name: 'The Ned',
      category: 'hotel',
      address: '27 Poultry, London EC2R 8AJ',
      latitude: 51.5130,
      longitude: -0.0885,
      description: 'Grand hotel in former banking hall with multiple restaurants',
      website: 'https://www.thened.com/',
      priceRange: '££££',
      rating: 4.4,
      tags: ['grand', 'banking-hall', 'restaurants', 'city']
    },
    {
      slug: 'premier-inn-london-city',
      name: 'Premier Inn London City',
      category: 'hotel',
      address: '1 Paternoster Row, St Paul\'s, London EC4M 7DX',
      latitude: 51.5143,
      longitude: -0.0999,
      description: 'Modern budget hotel near St Paul\'s Cathedral',
      website: 'https://www.premierinn.com/',
      priceRange: '££',
      rating: 4.1,
      tags: ['budget', 'modern', 'st-pauls', 'convenient']
    },

    // Shopping & Markets
    {
      slug: 'harrods-knightsbridge',
      name: 'Harrods',
      category: 'shopping',
      address: '87-135 Brompton Rd, Knightsbridge, London SW1X 7XL',
      latitude: 51.4994,
      longitude: -0.1635,
      description: 'World-famous luxury department store',
      website: 'https://www.harrods.com/',
      priceRange: '££££',
      rating: 4.2,
      tags: ['luxury', 'department-store', 'knightsbridge', 'iconic']
    },
    {
      slug: 'borough-market',
      name: 'Borough Market',
      category: 'market',
      address: '8 Southwark St, London SE1 1TL',
      latitude: 51.5055,
      longitude: -0.0909,
      description: 'Historic food market with artisanal producers',
      website: 'https://boroughmarket.org.uk/',
      priceRange: '££',
      rating: 4.3,
      tags: ['food-market', 'historic', 'artisanal', 'southwark']
    },
    {
      slug: 'camden-market',
      name: 'Camden Market',
      category: 'market',
      address: 'Camden Lock Pl, Camden Town, London NW1 8AF',
      latitude: 51.5415,
      longitude: -0.1439,
      description: 'Alternative market with vintage clothing and street food',
      priceRange: '££',
      rating: 4.0,
      tags: ['alternative', 'vintage', 'street-food', 'camden']
    },
    {
      slug: 'oxford-street',
      name: 'Oxford Street',
      category: 'shopping',
      address: 'Oxford St, London',
      latitude: 51.5154,
      longitude: -0.1419,
      description: 'Europe\'s busiest shopping street with major retailers',
      priceRange: '££',
      rating: 4.0,
      tags: ['shopping-street', 'retail', 'busy', 'flagship-stores']
    },

    // Parks & Green Spaces
    {
      slug: 'hyde-park',
      name: 'Hyde Park',
      category: 'park',
      address: 'Hyde Park, London',
      latitude: 51.5074,
      longitude: -0.1657,
      description: 'Large Royal Park with Speaker\'s Corner and Serpentine Lake',
      priceRange: '£',
      rating: 4.4,
      tags: ['royal-park', 'speakers-corner', 'serpentine', 'recreational']
    },
    {
      slug: 'regents-park',
      name: 'Regent\'s Park',
      category: 'park',
      address: 'Chester Rd, London NW1 4NR',
      latitude: 51.5313,
      longitude: -0.1564,
      description: 'Royal Park featuring London Zoo and beautiful gardens',
      priceRange: '£',
      rating: 4.5,
      tags: ['royal-park', 'zoo', 'gardens', 'rose-garden']
    },
    {
      slug: 'richmond-park',
      name: 'Richmond Park',
      category: 'park',
      address: 'Richmond, London TW10 5HS',
      latitude: 51.4513,
      longitude: -0.2665,
      description: 'Largest Royal Park with roaming deer and panoramic views',
      priceRange: '£',
      rating: 4.6,
      tags: ['royal-park', 'deer', 'largest', 'views']
    },

    // Neighborhoods
    {
      slug: 'notting-hill',
      name: 'Notting Hill',
      category: 'district',
      address: 'Notting Hill, London',
      latitude: 51.5158,
      longitude: -0.2058,
      description: 'Trendy area famous for Portobello Road Market and colorful houses',
      priceRange: '£££',
      rating: 4.3,
      tags: ['trendy', 'portobello', 'colorful-houses', 'carnival']
    },
    {
      slug: 'shoreditch',
      name: 'Shoreditch',
      category: 'district',
      address: 'Shoreditch, London',
      latitude: 51.5244,
      longitude: -0.0821,
      description: 'Hip East London area known for street art and nightlife',
      priceRange: '££',
      rating: 4.2,
      tags: ['hip', 'street-art', 'nightlife', 'east-london']
    },
    {
      slug: 'greenwich',
      name: 'Greenwich',
      category: 'district',
      address: 'Greenwich, London',
      latitude: 51.4779,
      longitude: -0.0014,
      description: 'Historic maritime district with Royal Observatory and Cutty Sark',
      priceRange: '££',
      rating: 4.4,
      tags: ['maritime', 'observatory', 'cutty-sark', 'unesco']
    }
  ]

  for (const place of places) {
    await prisma.place.upsert({
      where: { slug: place.slug },
      update: {
        name: place.name,
        category: place.category,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        description: place.description,
        website: place.website,
        openingHours: place.openingHours,
        priceRange: place.priceRange,
        rating: place.rating,
        tags: place.tags
      },
      create: {
        slug: place.slug,
        name: place.name,
        category: place.category,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        description: place.description,
        website: place.website,
        openingHours: place.openingHours,
        priceRange: place.priceRange,
        rating: place.rating,
        tags: place.tags || []
      }
    })
  }

  console.log(`✅ Seeded ${places.length} London places`)

  console.log('🎉 Phase 4A initial seeding completed successfully!')
  console.log('')
  console.log('Summary:')
  console.log(`- ${pageTypeRecipes.length} PageType recipes`)
  console.log(`- 1 Rulebook version (2024.09.1)`)
  console.log(`- ${places.length} London places`)
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
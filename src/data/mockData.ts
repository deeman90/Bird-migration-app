import { BirdSpecies, Hotspot, LeaderboardEntry, MigrationRoute, RewardMilestone, Sighting, User, isRareOrExtinctSpecies } from '../types';

export const DEFAULT_USER: User = {
  id: 'guest',
  name: 'Guest Observer',
  email: '',
  phone: '',
  avatar: '',
  region: 'Global',
  tier: 'free',
  sightingsCount: 0,
  rareSpeciesCount: 0,
  points: 0,
  badges: [],
  bio: '',
  joinedDate: '',
  address: {
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  },
  favoriteBird: '',
  cameraGear: '',
  socialWebsite: '',
  socialTwitter: '',
  socialInstagram: '',
  emailNotifications: {
    migrationAlerts: true,
    communityActivity: true,
    weeklyDigest: false,
  },
  privacyMode: 'public',
};

export const BIRD_SPECIES_LIST: BirdSpecies[] = [
  {
    id: 'sp_arctic_tern',
    commonName: 'Arctic Tern',
    scientificName: 'Sterna paradisaea',
    category: 'Seabird',
    conservationStatus: 'Least Concern',
    image: 'https://images.unsplash.com/photo-1551085254-e96b210df58a?auto=format&fit=crop&q=80&w=600',
    flywayRegion: 'Global Atlantic & Pacific Flyways',
    description: 'Holds the record for the longest known migration of any animal, travelling up to 90,000 km round-trip every year between Greenland/Arctic and Antarctica.',
    averageFlockSize: '20 - 150 birds',
    wingspanCm: 85
  },
  {
    id: 'sp_osprey',
    commonName: 'Osprey (Fish Hawk)',
    scientificName: 'Pandion haliaetus',
    category: 'Raptor',
    conservationStatus: 'Least Concern',
    image: 'https://images.unsplash.com/photo-1606567595334-d39972c85dbe?auto=format&fit=crop&q=80&w=600',
    flywayRegion: 'Americas & Euro-African Flyway',
    description: 'A spectacular fish-eating raptor that migrates over long distances across lakes, estuaries, and coastlines.',
    averageFlockSize: 'Solitary or pairs',
    wingspanCm: 180
  },
  {
    id: 'sp_godwit',
    commonName: 'Bar-tailed Godwit',
    scientificName: 'Limosa lapponica',
    category: 'Shorebird',
    conservationStatus: 'Near Threatened',
    image: 'https://images.unsplash.com/photo-1618172193763-c511deb635ca?auto=format&fit=crop&q=80&w=600',
    flywayRegion: 'East Asian-Australasian Flyway',
    description: 'Famous for non-stop flights over 11,000 km across the open Pacific Ocean without resting or feeding.',
    averageFlockSize: '50 - 500 birds',
    wingspanCm: 75
  },
  {
    id: 'sp_stork',
    commonName: 'White Stork',
    scientificName: 'Ciconia ciconia',
    category: 'Wader',
    conservationStatus: 'Least Concern',
    image: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&q=80&w=600',
    flywayRegion: 'Euro-African Flyway',
    description: 'Migrates in thermal updrafts over the Strait of Gibraltar and the Bosporus into Sub-Saharan Africa.',
    averageFlockSize: '100 - 1,000+ thermal thermalling flocks',
    wingspanCm: 215
  },
  {
    id: 'sp_sandhill_crane',
    commonName: 'Sandhill Crane',
    scientificName: 'Antigone canadensis',
    category: 'Crane',
    conservationStatus: 'Least Concern',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=600',
    flywayRegion: 'Central & Mississippi Flyways',
    description: 'Gather in massive numbers along Nebraska’s Platte River during spring migration before heading to Canada & Alaska.',
    averageFlockSize: '500 - 10,000 birds',
    wingspanCm: 200
  },
  {
    id: 'sp_hummingbird',
    commonName: 'Ruby-throated Hummingbird',
    scientificName: 'Archilochus colubris',
    category: 'Songbird / Hummingbird',
    conservationStatus: 'Least Concern',
    image: 'https://images.unsplash.com/photo-1520808663317-647b476a81b9?auto=format&fit=crop&q=80&w=600',
    flywayRegion: 'Atlantic & Mississippi Flyway',
    description: 'Smallest migratory marvel that flies non-stop 800 km across the Gulf of Mexico in 18 to 22 hours.',
    averageFlockSize: 'Solitary migratory fliers',
    wingspanCm: 11
  },
  {
    id: 'sp_california_condor',
    commonName: 'California Condor',
    scientificName: 'Gymnogyps californianus',
    category: 'Raptor / Rare Giant',
    conservationStatus: 'Critically Endangered',
    image: 'https://images.unsplash.com/photo-1543549036-ed4571d871bd?auto=format&fit=crop&q=80&w=600',
    flywayRegion: 'Pacific Flyway / Western Mountains',
    description: 'The largest wild land bird in North America with a massive 3-meter wingspan, surviving through intensive sanctuary breeding & reintroduction.',
    averageFlockSize: 'Solitary or pairs',
    wingspanCm: 300
  },
  {
    id: 'sp_whooping_crane',
    commonName: 'Whooping Crane',
    scientificName: 'Grus americana',
    category: 'Crane / Rare Wader',
    conservationStatus: 'Endangered',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=600',
    flywayRegion: 'Central Flyway (Canada to Texas Coast)',
    description: 'North America’s tallest flying bird, famed for ultralight-guided migrations and vocal trumpet calls. Highly rare and protected.',
    averageFlockSize: 'Small family groups (2 - 8 birds)',
    wingspanCm: 230
  },
  {
    id: 'sp_spix_macaw',
    commonName: 'Spix’s Macaw (Little Blue Macaw)',
    scientificName: 'Cyanopsitta spixii',
    category: 'Parrot / Extinct in Wild',
    conservationStatus: 'Extinct in the Wild',
    image: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?auto=format&fit=crop&q=80&w=600',
    flywayRegion: 'Neotropical / Caatinga Gallery Forests',
    description: 'Stunning cobalt-blue species formerly native to Brazil, now surviving solely in conservation sanctuaries with active rewilding projects.',
    averageFlockSize: 'Reintroduced pairs',
    wingspanCm: 120
  },
  {
    id: 'sp_spoon_billed_sandpiper',
    commonName: 'Spoon-billed Sandpiper',
    scientificName: 'Calidris pygmaea',
    category: 'Shorebird / Ultra-Rare',
    conservationStatus: 'Critically Endangered',
    image: 'https://images.unsplash.com/photo-1618172193763-c511deb635ca?auto=format&fit=crop&q=80&w=600',
    flywayRegion: 'East Asian-Australasian Flyway',
    description: 'Famous for its unique spatulate bill used to sweep intertidal mudflats. Extremely rare with under 500 individuals remaining.',
    averageFlockSize: '1 - 5 in mixed shorebird flocks',
    wingspanCm: 38
  },
  {
    id: 'sp_passenger_pigeon',
    commonName: 'Passenger Pigeon',
    scientificName: 'Ectopistes migratorius',
    category: 'Historical Extinct Species',
    conservationStatus: 'Extinct',
    image: 'https://images.unsplash.com/photo-1551085254-e96b210df58a?auto=format&fit=crop&q=80&w=600',
    flywayRegion: 'Eastern North American Woodlands',
    description: 'Once billions strong in dark migratory flocks, now a historical emblem of conservation awareness.',
    averageFlockSize: 'Historical mega-flocks',
    wingspanCm: 60
  },
  {
    id: 'sp_mexican_free_tailed_bat',
    commonName: 'Mexican Free-tailed Bat',
    scientificName: 'Tadarida brasiliensis',
    category: 'Chiroptera (Bat Exception)',
    conservationStatus: 'Least Concern',
    image: 'https://images.unsplash.com/photo-1574063413132-355dbfd83e25?auto=format&fit=crop&q=80&w=600',
    flywayRegion: 'Americas Nocturnal Flyways',
    description: 'Permitted aerial mammal exception. Renowned for massive seasonal migratory flights and level-flight speeds reaching over 160 km/h.',
    averageFlockSize: 'Roost colonies of 1,000 to 1,000,000+',
    wingspanCm: 32
  },
  {
    id: 'sp_large_flying_fox',
    commonName: 'Large Flying Fox (Fruit Bat)',
    scientificName: 'Pteropus vampyrus',
    category: 'Chiroptera (Megabat)',
    conservationStatus: 'Near Threatened',
    image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=600',
    flywayRegion: 'Indo-Pacific & Australasian Flyways',
    description: 'Permitted aerial mammal exception. One of the largest bat species in the world with a wingspan up to 1.5 meters, vital for canopy pollination.',
    averageFlockSize: 'Colonies of 100 - 2,000',
    wingspanCm: 150
  },
  {
    id: 'sp_little_brown_bat',
    commonName: 'Little Brown Bat',
    scientificName: 'Myotis lucifugus',
    category: 'Chiroptera (Microbat)',
    conservationStatus: 'Endangered',
    image: 'https://images.unsplash.com/photo-1574063413132-355dbfd83e25?auto=format&fit=crop&q=80&w=600',
    flywayRegion: 'North American Flyways',
    description: 'Permitted aerial mammal exception. Agile nocturnal insectivore that navigates seasonal corridors between summer maternity roosts and winter hibernacula.',
    averageFlockSize: 'Maternity colonies of 50 - 500',
    wingspanCm: 26
  },
  {
    id: 'sp_hoary_bat',
    commonName: 'Hoary Bat',
    scientificName: 'Lasiurus cinereus',
    category: 'Chiroptera (Migratory Bat)',
    conservationStatus: 'Least Concern',
    image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=600',
    flywayRegion: 'Pan-American Long-Distance Flyway',
    description: 'Permitted aerial mammal exception. Celebrated solitary long-distance seasonal migrant traveling thousands of miles across North & South America.',
    averageFlockSize: 'Solitary aerial migrants',
    wingspanCm: 40
  },
  {
    id: 'sp_big_brown_bat',
    commonName: 'Big Brown Bat',
    scientificName: 'Eptesicus fuscus',
    category: 'Chiroptera (Microbat)',
    conservationStatus: 'Least Concern',
    image: 'https://images.unsplash.com/photo-1574063413132-355dbfd83e25?auto=format&fit=crop&q=80&w=600',
    flywayRegion: 'North American Flyways',
    description: 'Permitted aerial mammal exception. Hardy insectivorous bat known for consuming agricultural crop pests and navigating via echolocation.',
    averageFlockSize: 'Maternity colonies of 20 - 300',
    wingspanCm: 35
  },
  {
    id: 'sp_indiana_bat',
    commonName: 'Indiana Bat',
    scientificName: 'Myotis sodalis',
    category: 'Chiroptera (Endangered Bat)',
    conservationStatus: 'Endangered',
    image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=600',
    flywayRegion: 'Eastern & Midwestern US Flyways',
    description: 'Permitted aerial mammal exception. High-priority endangered species that hibernates in large cave clusters and forages along riparian river corridors.',
    averageFlockSize: 'Winter hibernacula clusters',
    wingspanCm: 27
  },
  {
    id: 'sp_pallid_bat',
    commonName: 'Pallid Bat',
    scientificName: 'Antrozous pallidus',
    category: 'Chiroptera (Desert Bat)',
    conservationStatus: 'Least Concern',
    image: 'https://images.unsplash.com/photo-1574063413132-355dbfd83e25?auto=format&fit=crop&q=80&w=600',
    flywayRegion: 'Western North American Arid Corridors',
    description: 'Permitted aerial mammal exception. Pale desert bat with large ears capable of gleaning scorpions and insects directly from the ground surface.',
    averageFlockSize: 'Roost colonies of 20 - 100',
    wingspanCm: 38
  },
  {
    id: 'sp_silver_haired_bat',
    commonName: 'Silver-haired Bat',
    scientificName: 'Lasionycteris noctivagans',
    category: 'Chiroptera (Migratory Bat)',
    conservationStatus: 'Least Concern',
    image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=600',
    flywayRegion: 'Boreal & Temperate Forest Flyways',
    description: 'Permitted aerial mammal exception. Beautiful silver-frosted forest bat that undertakes seasonal long-distance latitudinal migrations.',
    averageFlockSize: 'Solitary seasonal migrants',
    wingspanCm: 30
  },
  {
    id: 'sp_common_pipistrelle',
    commonName: 'Common Pipistrelle',
    scientificName: 'Pipistrellus pipistrellus',
    category: 'Chiroptera (Microbat)',
    conservationStatus: 'Least Concern',
    image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=600',
    flywayRegion: 'Palearctic & European Flyways',
    description: 'Permitted aerial mammal exception. Tiny, highly agile bat that can consume up to 3,000 midges and mosquitoes in a single night.',
    averageFlockSize: 'Maternity roosts of 50 - 200',
    wingspanCm: 22
  }
];

export const MIGRATION_ROUTES: MigrationRoute[] = [
  {
    id: 'rt_arctic_tern',
    speciesName: 'Arctic Tern',
    speciesId: 'sp_arctic_tern',
    color: '#06b6d4',
    flywayName: 'Trans-Atlantic Arctic-Antarctic Pole Loop',
    totalDistanceKm: 44000,
    activeMonths: ['May', 'June', 'July', 'August', 'September', 'October'],
    status: 'Peak Migration',
    pathPoints: [
      { lat: 64.14, lng: -21.94, name: 'Breeding Grounds (Iceland)', season: 'Summer Nesting' },
      { lat: 43.65, lng: -70.25, name: 'Stopover (Gulf of Maine)', isStopover: true },
      { lat: 14.69, lng: -17.44, name: 'Western Africa Transit', isStopover: true },
      { lat: -33.92, lng: 18.42, name: 'Cape of Good Hope Rest Point', isStopover: true },
      { lat: -71.20, lng: -11.50, name: 'Wintering (Weddell Sea, Antarctica)', season: 'Antarctic Wintering' }
    ]
  },
  {
    id: 'rt_stork',
    speciesName: 'White Stork',
    speciesId: 'sp_stork',
    color: '#10b981',
    flywayName: 'Euro-African Flyway (Gibraltar & Bosporus)',
    totalDistanceKm: 12000,
    activeMonths: ['August', 'September', 'October', 'March', 'April'],
    status: 'Peak Migration',
    pathPoints: [
      { lat: 52.52, lng: 13.40, name: 'Breeding Grounds (Central Europe)', season: 'Nesting' },
      { lat: 36.01, lng: -5.60, name: 'Gibraltar Strait Chokepoint', isStopover: true },
      { lat: 21.00, lng: -10.50, name: 'Sahara Crossing corridor', isStopover: true },
      { lat: 9.03, lng: 38.74, name: 'East African Rift Stopover', isStopover: true },
      { lat: -25.74, lng: 28.18, name: 'Winter Grounds (South Africa)', season: 'Wintering' }
    ]
  },
  {
    id: 'rt_sandhill_crane',
    speciesName: 'Sandhill Crane',
    speciesId: 'sp_sandhill_crane',
    color: '#f59e0b',
    flywayName: 'Central Flyway Corridor',
    totalDistanceKm: 6500,
    activeMonths: ['March', 'April', 'September', 'October', 'November'],
    status: 'Approaching Grounds',
    pathPoints: [
      { lat: 64.83, lng: -147.77, name: 'Nesting Grounds (Alaska)', season: 'Nesting' },
      { lat: 40.71, lng: -98.34, name: 'Platte River Valley (Nebraska Hotspot)', isStopover: true },
      { lat: 33.82, lng: -106.88, name: 'Bosque del Apache Refuge', isStopover: true },
      { lat: 25.68, lng: -100.31, name: 'Wintering Grounds (Northern Mexico)', season: 'Wintering' }
    ]
  },
  {
    id: 'rt_godwit',
    speciesName: 'Bar-tailed Godwit',
    speciesId: 'sp_godwit',
    color: '#ec4899',
    flywayName: 'East Asian-Australasian Pacific Flyway',
    totalDistanceKm: 11000,
    activeMonths: ['September', 'October', 'April', 'May'],
    status: 'Peak Migration',
    pathPoints: [
      { lat: 64.50, lng: -165.40, name: 'Alaska Yukon Staging Ground', season: 'Breeding' },
      { lat: 31.23, lng: 121.47, name: 'Yellow Sea Mudflats, China', isStopover: true },
      { lat: -36.84, lng: 174.76, name: 'Miranda Shorebird Center (New Zealand)', season: 'Wintering' }
    ]
  }
];

export const HOTSPOTS: Hotspot[] = [
  {
    id: 'hs_gibraltar',
    name: 'Strait of Gibraltar Migration Chokepoint',
    locationName: 'Tarifa, Spain & Tangier, Morocco',
    region: 'Europe / North Africa',
    latitude: 36.01,
    longitude: -5.60,
    trafficRating: 'extreme',
    rareSpeciesPresent: ['Short-toed Snake Eagle', 'Black Stork', 'Egyptian Vulture', 'Booted Eagle'],
    isExclusive: true,
    description: 'Over 500,000 birds of prey and storks funnel through this 14km sea gap every autumn and spring due to thermal winds.',
    photoUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=600',
    currentDensity: '12,400 birds/hr radar density',
    peakMonth: 'September - October',
    activeBirdCount: 48500,
    flywayType: 'Euro-African Flyway'
  },
  {
    id: 'hs_point_pelee',
    name: 'Point Pelee National Park',
    locationName: 'Ontario, Canada',
    region: 'North America',
    latitude: 41.96,
    longitude: -82.51,
    trafficRating: 'extreme',
    rareSpeciesPresent: ['Prothonotary Warbler', 'Cerulean Warbler', 'Olive-sided Flycatcher'],
    isExclusive: true,
    description: 'A famous peninsula jutting into Lake Erie where millions of migratory songbirds rest before crossing the open water.',
    photoUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80&w=600',
    currentDensity: '8,900 birds/hr radar density',
    peakMonth: 'May (Spring Peak)',
    activeBirdCount: 32100,
    flywayType: 'Mississippi Flyway'
  },
  {
    id: 'hs_bosque',
    name: 'Bosque del Apache National Wildlife Refuge',
    locationName: 'Socorro, New Mexico, USA',
    region: 'North America',
    latitude: 33.82,
    longitude: -106.88,
    trafficRating: 'high',
    rareSpeciesPresent: ['Whooping Crane', 'Ross’s Goose', 'Sandhill Crane'],
    isExclusive: false,
    description: 'Wintering haven for tens of thousands of cranes and snow geese along the Rio Grande wetland corridor.',
    photoUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=600',
    currentDensity: '5,200 birds/hr radar density',
    peakMonth: 'November - February',
    activeBirdCount: 24000,
    flywayType: 'Central Flyway'
  },
  {
    id: 'hs_eilat',
    name: 'Eilat International Birding Center',
    locationName: 'Eilat, Israel',
    region: 'Middle East',
    latitude: 29.55,
    longitude: 34.95,
    trafficRating: 'extreme',
    rareSpeciesPresent: ['Steppe Eagle', 'Lesser Kestrel', 'Levant Sparrowhawk', 'White Pelican'],
    isExclusive: true,
    description: 'The sole land bridge connecting Eurasia and Africa. Billions of migratory birds stop here to refuel after crossing the Sahara and Red Sea deserts.',
    photoUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&q=80&w=600',
    currentDensity: '18,200 birds/hr radar density',
    peakMonth: 'March - May',
    activeBirdCount: 61000,
    flywayType: 'Eurasian-East African Flyway'
  },
  {
    id: 'hs_cape_may',
    name: 'Cape May Point Observatory',
    locationName: 'New Jersey, USA',
    region: 'North America',
    latitude: 38.93,
    longitude: -74.96,
    trafficRating: 'high',
    rareSpeciesPresent: ['Peregrine Falcon', 'Merlin', 'Swainson’s Hawk'],
    isExclusive: false,
    description: 'Raptor capital of North America. Autumn winds force thousands of hawks, falcons, and owls to gather at the southern tip of New Jersey.',
    photoUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80&w=600',
    currentDensity: '4,100 birds/hr radar density',
    peakMonth: 'September - November',
    activeBirdCount: 15300,
    flywayType: 'Atlantic Flyway'
  },
  {
    id: 'hs_poyang',
    name: 'Poyang Lake National Nature Reserve',
    locationName: 'Jiangxi, China',
    region: 'Asia-Pacific',
    latitude: 29.11,
    longitude: 116.02,
    trafficRating: 'extreme',
    rareSpeciesPresent: ['Siberian Crane', 'Oriental Stork', 'White-naped Crane', 'Swan Goose'],
    isExclusive: true,
    description: 'Winter habitat for 98% of the world’s endangered Siberian Cranes along the East Asian flyway.',
    photoUrl: 'https://images.unsplash.com/photo-1511497584788-876761c11969?auto=format&fit=crop&q=80&w=600',
    currentDensity: '14,000 birds/hr radar density',
    peakMonth: 'December - February',
    activeBirdCount: 41200,
    flywayType: 'East Asian-Australasian Flyway'
  }
];

export const INITIAL_SIGHTINGS: Sighting[] = [];

export const LEADERBOARD_DATA: Record<string, LeaderboardEntry[]> = {
  'Global': [],
  'North America': [],
  'Europe': [],
  'Asia-Pacific': [],
};

export function buildLeaderboardData(
  sightings: Sighting[],
  currentUser?: User
): Record<string, LeaderboardEntry[]> {
  const result: Record<string, LeaderboardEntry[]> = {
    'Global': [],
    'North America': [],
    'Europe': [],
    'Asia-Pacific': [],
  };

  // Build real user sightings map
  const userMap = new Map<string, {
    userId: string;
    name: string;
    avatar: string;
    region: string;
    tier: 'free' | 'paid';
    sightings: number;
    rareCount: number;
  }>();

  if (Array.isArray(sightings)) {
    for (const s of sightings) {
      if (!s) continue;
      const uId = s.userId || 'anonymous';
      const isRare = s.isRareSpecies || isRareOrExtinctSpecies(undefined, s.speciesName, s.scientificName);
      const existing = userMap.get(uId);
      if (!existing) {
        userMap.set(uId, {
          userId: uId,
          name: s.userName || 'Anonymous Observer',
          avatar: s.userAvatar || '',
          region: s.region || 'Global',
          tier: s.userTier || 'free',
          sightings: 1,
          rareCount: isRare ? 1 : 0,
        });
      } else {
        existing.sightings += 1;
        if (isRare) existing.rareCount += 1;
        if (!existing.avatar && s.userAvatar) existing.avatar = s.userAvatar;
      }
    }
  }

  // Include current logged-in user if they have recorded sightings but none in this list yet
  if (currentUser && currentUser.id && currentUser.id !== 'guest' && !userMap.has(currentUser.id) && currentUser.sightingsCount > 0) {
    userMap.set(currentUser.id, {
      userId: currentUser.id,
      name: currentUser.name || 'Observer',
      avatar: currentUser.avatar || '',
      region: currentUser.region || 'Global',
      tier: currentUser.tier,
      sightings: currentUser.sightingsCount,
      rareCount: currentUser.rareSpeciesCount || 0,
    });
  }

  if (userMap.size === 0) {
    return result;
  }

  const allUsers = Array.from(userMap.values()).sort((a, b) => {
    if (b.sightings !== a.sightings) return b.sightings - a.sightings;
    return b.rareCount - a.rareCount;
  });

  const getBadgeTitle = (sightingsCount: number, tier: string) => {
    if (tier === 'paid') return 'VIP Flyway Sentinel';
    if (sightingsCount >= 30) return 'Gold Flyway Ambassador';
    if (sightingsCount >= 15) return 'Silver Sentinel';
    if (sightingsCount >= 5) return 'Bronze Observer';
    return 'Field Observer';
  };

  const getRewardUnlocked = (sightingsCount: number) => {
    if (sightingsCount >= 30) return 'Featured Birder Profile';
    if (sightingsCount >= 15) return 'VIP Hotspot Pass';
    if (sightingsCount >= 5) return 'Observer Badge';
    return `${Math.max(1, 5 - sightingsCount)} sightings to Bronze`;
  };

  // Global ranking
  result['Global'] = allUsers.map((u, idx) => {
    const isMe = currentUser && u.userId === currentUser.id;
    return {
      rank: idx + 1,
      userId: u.userId,
      name: isMe ? `${u.name} (You)` : u.name,
      avatar: u.avatar,
      region: u.region,
      sightings: u.sightings,
      rareCount: u.rareCount,
      tier: u.tier,
      badgeTitle: getBadgeTitle(u.sightings, u.tier),
      rewardUnlocked: getRewardUnlocked(u.sightings),
    };
  });

  // Regional ranking
  for (const reg of ['North America', 'Europe', 'Asia-Pacific']) {
    const regionalUsers = allUsers.filter((u) => u.region === reg);
    result[reg] = regionalUsers.map((u, idx) => {
      const isMe = currentUser && u.userId === currentUser.id;
      return {
        rank: idx + 1,
        userId: u.userId,
        name: isMe ? `${u.name} (You)` : u.name,
        avatar: u.avatar,
        region: u.region,
        sightings: u.sightings,
        rareCount: u.rareCount,
        tier: u.tier,
        badgeTitle: getBadgeTitle(u.sightings, u.tier),
        rewardUnlocked: getRewardUnlocked(u.sightings),
      };
    });
  }

  return result;
}

export const REWARD_MILESTONES: RewardMilestone[] = [
  {
    id: 'rw_01',
    title: 'Bronze Observer',
    requiredSightings: 5,
    description: 'Log 5 verified bird observations with accurate GPS coordinates.',
    iconName: 'Award',
    unlocked: true,
    perk: 'Custom Profile Badge & Early Sightings Radar'
  },
  {
    id: 'rw_02',
    title: 'Silver Sentinel (VIP Hotspot Pass)',
    requiredSightings: 15,
    description: 'Log 15 verified sightings during peak migration season.',
    iconName: 'Zap',
    unlocked: false,
    perk: 'Unlocks 1 Month Free VIP Hotspot Access'
  },
  {
    id: 'rw_03',
    title: 'Gold Flyway Ambassador',
    requiredSightings: 30,
    description: 'Log 30 sightings across at least 2 flyway regions.',
    iconName: 'Crown',
    unlocked: false,
    perk: 'Featured Birder Profile + Free Optics Strap Gift'
  },
  {
    id: 'rw_04',
    title: 'Rare Species Pioneer',
    requiredSightings: 50,
    description: 'Discover and document 10 endangered or rare migratory species.',
    iconName: 'Compass',
    unlocked: false,
    perk: 'Official Field Researcher Certification'
  }
];

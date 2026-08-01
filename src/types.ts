export type UserTier = 'free' | 'paid';

export interface UserAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar: string;
  region: string;
  tier: UserTier;
  sightingsCount: number;
  rareSpeciesCount: number;
  points: number;
  badges: string[];
  bio?: string;
  joinedDate: string;
  
  // Account Restriction & Authenticity Enforcement
  restrictedUntil?: string; // ISO date string when 3-day restriction ends
  restrictionReason?: string;
  violationCount?: number;

  // Personal & Address Details
  address?: UserAddress;
  favoriteBird?: string;
  cameraGear?: string;
  socialWebsite?: string;
  socialTwitter?: string;
  socialInstagram?: string;
  
  // Preferences
  emailNotifications?: {
    migrationAlerts: boolean;
    communityActivity: boolean;
    weeklyDigest: boolean;
  };
  privacyMode?: 'public' | 'blurred_location' | 'private';
}

export interface BirdSpecies {
  id: string;
  commonName: string;
  scientificName: string;
  category: string;
  conservationStatus: 'Least Concern' | 'Near Threatened' | 'Vulnerable' | 'Endangered' | 'Critically Endangered';
  image: string;
  flywayRegion: string;
  description: string;
  averageFlockSize: string;
  wingspanCm: number;
}

export type SightingBehavior = 'flying' | 'nesting' | 'resting' | 'feeding';

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: string;
}

export interface ImageMetaData {
  isGenuinePhoto: boolean;
  deviceMake?: string;
  deviceModel?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  dateTimeCaptured?: string;
  authenticityStatus: 'authentic_camera_photo' | 'web_download_detected' | 'missing_metadata';
  failureReason?: string;
  confidenceScore?: number;
}

export interface Sighting {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userTier: UserTier;
  speciesId: string;
  speciesName: string;
  scientificName: string;
  latitude: number;
  longitude: number;
  locationName: string;
  region: string;
  timestamp: string;
  photoUrl: string;
  flockCount: number;
  behavior: SightingBehavior;
  notes: string;
  verified: boolean;
  likesCount: number;
  likedByMe?: boolean;
  comments: Comment[];
  isHotspotExclusive?: boolean;
  hotspotName?: string;
  weather?: string;
  imageMetaData?: ImageMetaData;
}

export interface RoutePoint {
  lat: number;
  lng: number;
  name: string;
  season?: string;
  isStopover?: boolean;
}

export interface MigrationRoute {
  id: string;
  speciesName: string;
  speciesId: string;
  color: string;
  pathPoints: RoutePoint[];
  activeMonths: string[];
  totalDistanceKm: number;
  status: 'Peak Migration' | 'Approaching Grounds' | 'Wintering' | 'Nesting';
  flywayName: string;
}

export interface Hotspot {
  id: string;
  name: string;
  locationName: string;
  region: string;
  latitude: number;
  longitude: number;
  trafficRating: 'extreme' | 'high' | 'moderate';
  rareSpeciesPresent: string[];
  isExclusive: boolean;
  description: string;
  photoUrl: string;
  currentDensity: string;
  peakMonth: string;
  activeBirdCount: number;
  flywayType: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar: string;
  region: string;
  sightings: number;
  rareCount: number;
  tier: UserTier;
  badgeTitle: string;
  rewardUnlocked: string;
}

export interface RewardMilestone {
  id: string;
  title: string;
  requiredSightings: number;
  description: string;
  iconName: string;
  unlocked: boolean;
  perk: string;
}

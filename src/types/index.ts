export interface Bird {
  id: string
  commonName: string
  scientificName: string
  ruName?: string
  imageUrl?: string
  thumbnailUrl?: string
  description?: string
  habitat?: string
  range?: string
  facts?: string[]
  order?: string
  family?: string
  sounds?: BirdSound[]
  rarity?: 'common' | 'uncommon' | 'rare' | 'very_rare'
  wikipediaUrl?: string
  inaturalistId?: number
  ebirdCode?: string
}

export interface BirdSound {
  id: string
  url: string
  recordist: string
  country: string
  type: string
}

export interface ObservedBird {
  id: string
  bird: Bird
  observedAt: string
  location?: GeoLocation
  method: 'photo' | 'sound' | 'manual'
  imageUrl?: string
  confidence?: number
  notes?: string
}

export interface GeoLocation {
  lat: number
  lng: number
  accuracy?: number
  city?: string
  country?: string
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: 'collection' | 'exploration' | 'time' | 'skill' | 'rarity' | 'taxonomy'
  points: number
  rarity: 'bronze' | 'silver' | 'gold' | 'platinum'
  unlockedAt?: string
}

export interface UserStats {
  totalBirds: number
  uniqueSpecies: number
  byPhoto: number
  bySound: number
  byManual: number
  streak: number
  lastObservedAt?: string
  firstObservedAt?: string
  locations: string[]
  observations: ObservedBird[]
  families: string[]
  orders: string[]
  earlyMorning: number
  lateNight: number
  rareBirds: number
}

export interface NearbyBird {
  speciesCode: string
  comName: string
  sciName: string
  obsDt: string
  thumbnailUrl?: string
}

export interface IdentifyResult {
  bird: Bird
  confidence: number
  source: 'inaturalist' | 'manual'
}

export type TabName = 'identify' | 'collection' | 'achievements' | 'nearby'

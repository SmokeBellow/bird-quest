import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ObservedBird, Achievement, UserStats, GeoLocation, Bird, PlantObservation, PlantStats, Plant, FungusObservation, FungusStats, Fungus } from '../types'
import { ACHIEVEMENTS } from '../achievements/definitions'
import { PLANT_ACHIEVEMENTS } from '../achievements/plantDefinitions'
import { FUNGUS_ACHIEVEMENTS } from '../achievements/fungusDefinitions'
import {
  upsertBirdObservation, deleteBirdObservation, fetchBirdObservations,
  upsertPlantObservation, deletePlantObservation, fetchPlantObservations,
  upsertFungusObservation, deleteFungusObservation, fetchFungusObservations,
  uploadAllLocalData,
} from '../services/sync'

export interface SupabaseUser {
  id: string
  email?: string
}

interface BirdStore {
  observations: ObservedBird[]
  unlockedAchievements: Achievement[]
  newAchievements: Achievement[]
  plantObservations: PlantObservation[]
  unlockedPlantAchievements: Achievement[]
  newPlantAchievements: Achievement[]
  fungusObservations: FungusObservation[]
  unlockedFungusAchievements: Achievement[]
  newFungusAchievements: Achievement[]
  location: GeoLocation | null
  ebirdApiKey: string
  // Auth — NOT persisted, Supabase manages the session
  supabaseUser: SupabaseUser | null
  isSyncing: boolean

  addObservation: (obs: ObservedBird) => void
  removeObservation: (id: string) => void
  addPlantObservation: (obs: PlantObservation) => void
  removePlantObservation: (id: string) => void
  addFungusObservation: (obs: FungusObservation) => void
  removeFungusObservation: (id: string) => void
  setLocation: (loc: GeoLocation) => void
  setEbirdApiKey: (key: string) => void
  dismissNewAchievements: () => void
  dismissNewPlantAchievements: () => void
  dismissNewFungusAchievements: () => void
  getStats: () => UserStats
  getPlantStats: () => PlantStats
  getFungusStats: () => FungusStats
  hasObserved: (birdId: string) => boolean
  hasObservedPlant: (plantId: string) => boolean
  hasObservedFungus: (fungusId: string) => boolean
  updateBirdInfo: (birdId: string, info: Partial<Bird>) => void
  // Auth & sync
  setSupabaseUser: (user: SupabaseUser | null) => void
  uploadLocalToSupabase: () => Promise<{ birds: number; plants: number; fungi: number }>
  loadFromSupabase: () => Promise<void>
}

function computeStats(observations: ObservedBird[]): UserStats {
  const uniqueSpeciesMap = new Map<string, Bird>()
  for (const obs of observations) {
    if (!uniqueSpeciesMap.has(obs.bird.id)) {
      uniqueSpeciesMap.set(obs.bird.id, obs.bird)
    }
  }

  const families = [...new Set(observations.map((o) => o.bird.family).filter(Boolean) as string[])]
  const orders = [...new Set(observations.map((o) => o.bird.order).filter(Boolean) as string[])]

  const locationSet = new Set<string>()
  for (const obs of observations) {
    if (obs.location) {
      const key = `${obs.location.lat.toFixed(2)},${obs.location.lng.toFixed(2)}`
      locationSet.add(key)
    }
  }

  let earlyMorning = 0
  let lateNight = 0
  for (const obs of observations) {
    const hour = new Date(obs.observedAt).getHours()
    if (hour < 7) earlyMorning++
    if (hour >= 23) lateNight++
  }

  const rareBirds = observations.filter(
    (o) => o.bird.rarity === 'rare' || o.bird.rarity === 'very_rare'
  ).length

  // compute streak
  const days = [...new Set(observations.map((o) => o.observedAt.slice(0, 10)))].sort()
  let streak = 0
  if (days.length > 0) {
    let cur = 1
    for (let i = 1; i < days.length; i++) {
      const prev = new Date(days[i - 1])
      const curr = new Date(days[i])
      const diff = (curr.getTime() - prev.getTime()) / 86400000
      if (diff === 1) {
        cur++
      } else {
        cur = 1
      }
    }
    streak = cur
  }

  return {
    totalBirds: observations.length,
    uniqueSpecies: uniqueSpeciesMap.size,
    byPhoto: observations.filter((o) => o.method === 'photo').length,
    bySound: observations.filter((o) => o.method === 'sound').length,
    byManual: observations.filter((o) => o.method === 'manual').length,
    streak,
    lastObservedAt: observations[observations.length - 1]?.observedAt,
    firstObservedAt: observations[0]?.observedAt,
    locations: [...locationSet],
    observations,
    families,
    orders,
    earlyMorning,
    lateNight,
    rareBirds,
  }
}

function computeNatureStreak(dates: string[]): number {
  if (dates.length === 0) return 0
  let cur = 1
  for (let i = 1; i < dates.length; i++) {
    const diff = (new Date(dates[i]).getTime() - new Date(dates[i - 1]).getTime()) / 86400000
    if (diff === 1) cur++
    else cur = 1
  }
  return cur
}

function computePlantStats(observations: PlantObservation[]): PlantStats {
  const uniqueSpeciesMap = new Map<string, Plant>()
  for (const obs of observations) {
    if (!uniqueSpeciesMap.has(obs.plant.id)) uniqueSpeciesMap.set(obs.plant.id, obs.plant)
  }
  const families = [...new Set(observations.map((o) => o.plant.family).filter(Boolean) as string[])]
  const locationSet = new Set<string>()
  for (const obs of observations) {
    if (obs.location) locationSet.add(`${obs.location.lat.toFixed(2)},${obs.location.lng.toFixed(2)}`)
  }
  let earlyMorning = 0, lateNight = 0
  for (const obs of observations) {
    const h = new Date(obs.observedAt).getHours()
    if (h < 7) earlyMorning++
    if (h >= 23) lateNight++
  }
  const days = [...new Set(observations.map((o) => o.observedAt.slice(0, 10)))].sort()
  return {
    totalPlants: observations.length,
    uniqueSpecies: uniqueSpeciesMap.size,
    earlyMorning,
    lateNight,
    streak: computeNatureStreak(days),
    locations: [...locationSet],
    families,
    observations,
  }
}

function computeFungusStats(observations: FungusObservation[]): FungusStats {
  const uniqueSpeciesMap = new Map<string, Fungus>()
  for (const obs of observations) {
    if (!uniqueSpeciesMap.has(obs.fungus.id)) uniqueSpeciesMap.set(obs.fungus.id, obs.fungus)
  }
  const families = [...new Set(observations.map((o) => o.fungus.family).filter(Boolean) as string[])]
  const locationSet = new Set<string>()
  for (const obs of observations) {
    if (obs.location) locationSet.add(`${obs.location.lat.toFixed(2)},${obs.location.lng.toFixed(2)}`)
  }
  let earlyMorning = 0, lateNight = 0
  for (const obs of observations) {
    const h = new Date(obs.observedAt).getHours()
    if (h < 7) earlyMorning++
    if (h >= 23) lateNight++
  }
  const days = [...new Set(observations.map((o) => o.observedAt.slice(0, 10)))].sort()
  return {
    totalFungi: observations.length,
    uniqueSpecies: uniqueSpeciesMap.size,
    earlyMorning,
    lateNight,
    streak: computeNatureStreak(days),
    locations: [...locationSet],
    families,
    observations,
  }
}

function checkNewAchievements(
  stats: UserStats,
  already: Achievement[]
): Achievement[] {
  const alreadyIds = new Set(already.map((a) => a.id))
  const newOnes: Achievement[] = []
  for (const def of ACHIEVEMENTS) {
    if (!alreadyIds.has(def.id) && def.condition(stats)) {
      const { condition: _c, ...ach } = def
      newOnes.push({ ...ach, unlockedAt: new Date().toISOString() })
    }
  }
  return newOnes
}

function checkNewPlantAchievements(stats: PlantStats, already: Achievement[]): Achievement[] {
  const alreadyIds = new Set(already.map((a) => a.id))
  return PLANT_ACHIEVEMENTS
    .filter((def) => !alreadyIds.has(def.id) && def.condition(stats))
    .map(({ condition: _c, ...ach }) => ({ ...ach, unlockedAt: new Date().toISOString() }))
}

function checkNewFungusAchievements(stats: FungusStats, already: Achievement[]): Achievement[] {
  const alreadyIds = new Set(already.map((a) => a.id))
  return FUNGUS_ACHIEVEMENTS
    .filter((def) => !alreadyIds.has(def.id) && def.condition(stats))
    .map(({ condition: _c, ...ach }) => ({ ...ach, unlockedAt: new Date().toISOString() }))
}

export const useBirdStore = create<BirdStore>()(
  persist(
    (set, get) => ({
      observations: [],
      unlockedAchievements: [],
      newAchievements: [],
      plantObservations: [],
      unlockedPlantAchievements: [],
      newPlantAchievements: [],
      fungusObservations: [],
      unlockedFungusAchievements: [],
      newFungusAchievements: [],
      location: null,
      ebirdApiKey: '',
      supabaseUser: null,
      isSyncing: false,

      addObservation: (obs) => {
        set((state) => {
          const observations = [...state.observations, obs]
          const stats = computeStats(observations)
          const newAchs = checkNewAchievements(stats, state.unlockedAchievements)
          // fire-and-forget sync
          if (state.supabaseUser) {
            upsertBirdObservation(state.supabaseUser.id, obs).catch(console.error)
          }
          return {
            observations,
            unlockedAchievements: [...state.unlockedAchievements, ...newAchs],
            newAchievements: [...state.newAchievements, ...newAchs],
          }
        })
      },

      removeObservation: (id) => {
        const { supabaseUser } = get()
        if (supabaseUser) {
          deleteBirdObservation(id).catch(console.error)
        }
        set((state) => ({
          observations: state.observations.filter((o) => o.id !== id),
        }))
      },

      addPlantObservation: (obs) => {
        set((state) => {
          const plantObservations = [...state.plantObservations, obs]
          const stats = computePlantStats(plantObservations)
          const newAchs = checkNewPlantAchievements(stats, state.unlockedPlantAchievements)
          if (state.supabaseUser) {
            upsertPlantObservation(state.supabaseUser.id, obs).catch(console.error)
          }
          return {
            plantObservations,
            unlockedPlantAchievements: [...state.unlockedPlantAchievements, ...newAchs],
            newPlantAchievements: [...state.newPlantAchievements, ...newAchs],
          }
        })
      },

      removePlantObservation: (id) => {
        const { supabaseUser } = get()
        if (supabaseUser) {
          deletePlantObservation(id).catch(console.error)
        }
        set((state) => ({
          plantObservations: state.plantObservations.filter((o) => o.id !== id),
        }))
      },

      addFungusObservation: (obs) => {
        set((state) => {
          const fungusObservations = [...state.fungusObservations, obs]
          const stats = computeFungusStats(fungusObservations)
          const newAchs = checkNewFungusAchievements(stats, state.unlockedFungusAchievements)
          if (state.supabaseUser) {
            upsertFungusObservation(state.supabaseUser.id, obs).catch(console.error)
          }
          return {
            fungusObservations,
            unlockedFungusAchievements: [...state.unlockedFungusAchievements, ...newAchs],
            newFungusAchievements: [...state.newFungusAchievements, ...newAchs],
          }
        })
      },

      removeFungusObservation: (id) => {
        const { supabaseUser } = get()
        if (supabaseUser) {
          deleteFungusObservation(id).catch(console.error)
        }
        set((state) => ({
          fungusObservations: state.fungusObservations.filter((o) => o.id !== id),
        }))
      },

      setLocation: (loc) => set({ location: loc }),

      setEbirdApiKey: (key) => set({ ebirdApiKey: key }),

      dismissNewAchievements: () => set({ newAchievements: [] }),

      dismissNewPlantAchievements: () => set({ newPlantAchievements: [] }),

      dismissNewFungusAchievements: () => set({ newFungusAchievements: [] }),

      getStats: () => computeStats(get().observations),

      getPlantStats: () => computePlantStats(get().plantObservations),

      getFungusStats: () => computeFungusStats(get().fungusObservations),

      hasObserved: (birdId) => get().observations.some((o) => o.bird.id === birdId),

      hasObservedPlant: (plantId) => get().plantObservations.some((o) => o.plant.id === plantId),

      hasObservedFungus: (fungusId) => get().fungusObservations.some((o) => o.fungus.id === fungusId),

      updateBirdInfo: (birdId, info) => {
        set((state) => ({
          observations: state.observations.map((o) =>
            o.bird.id === birdId ? { ...o, bird: { ...o.bird, ...info } } : o
          ),
        }))
      },

      // ── Auth & sync ──────────────────────────────────────────────────────────

      setSupabaseUser: (user) => set({ supabaseUser: user }),

      uploadLocalToSupabase: async () => {
        const { supabaseUser, observations, plantObservations, fungusObservations } = get()
        if (!supabaseUser) return { birds: 0, plants: 0, fungi: 0 }
        set({ isSyncing: true })
        try {
          await uploadAllLocalData(supabaseUser.id, observations, plantObservations, fungusObservations)
          return {
            birds: observations.length,
            plants: plantObservations.length,
            fungi: fungusObservations.length,
          }
        } finally {
          set({ isSyncing: false })
        }
      },

      loadFromSupabase: async () => {
        const { supabaseUser } = get()
        if (!supabaseUser) return
        set({ isSyncing: true })
        try {
          const [birds, plants, fungi] = await Promise.all([
            fetchBirdObservations(supabaseUser.id),
            fetchPlantObservations(supabaseUser.id),
            fetchFungusObservations(supabaseUser.id),
          ])

          // Recompute unlocked achievements from the loaded data
          const birdStats = computeStats(birds)
          const plantStats = computePlantStats(plants)
          const fungusStats = computeFungusStats(fungi)

          const unlockedAchievements = ACHIEVEMENTS
            .filter((def) => def.condition(birdStats))
            .map(({ condition: _c, ...ach }) => ({ ...ach, unlockedAt: new Date().toISOString() }))

          const unlockedPlantAchievements = PLANT_ACHIEVEMENTS
            .filter((def) => def.condition(plantStats))
            .map(({ condition: _c, ...ach }) => ({ ...ach, unlockedAt: new Date().toISOString() }))

          const unlockedFungusAchievements = FUNGUS_ACHIEVEMENTS
            .filter((def) => def.condition(fungusStats))
            .map(({ condition: _c, ...ach }) => ({ ...ach, unlockedAt: new Date().toISOString() }))

          set({
            observations: birds,
            plantObservations: plants,
            fungusObservations: fungi,
            unlockedAchievements,
            unlockedPlantAchievements,
            unlockedFungusAchievements,
            newAchievements: [],
            newPlantAchievements: [],
            newFungusAchievements: [],
          })
        } finally {
          set({ isSyncing: false })
        }
      },
    }),
    {
      name: 'bird-quest-store',
      partialize: (state) => ({
        observations: state.observations,
        unlockedAchievements: state.unlockedAchievements,
        newAchievements: state.newAchievements,
        plantObservations: state.plantObservations,
        unlockedPlantAchievements: state.unlockedPlantAchievements,
        newPlantAchievements: state.newPlantAchievements,
        fungusObservations: state.fungusObservations,
        unlockedFungusAchievements: state.unlockedFungusAchievements,
        newFungusAchievements: state.newFungusAchievements,
        location: state.location,
        ebirdApiKey: state.ebirdApiKey,
        // supabaseUser and isSyncing are intentionally NOT persisted
      }),
    }
  )
)

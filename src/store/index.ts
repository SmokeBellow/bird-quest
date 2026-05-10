import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ObservedBird, Achievement, UserStats, GeoLocation, Bird, PlantObservation, PlantStats, Plant } from '../types'
import { ACHIEVEMENTS } from '../achievements/definitions'
import { PLANT_ACHIEVEMENTS } from '../achievements/plantDefinitions'

interface BirdStore {
  observations: ObservedBird[]
  unlockedAchievements: Achievement[]
  newAchievements: Achievement[]
  plantObservations: PlantObservation[]
  unlockedPlantAchievements: Achievement[]
  newPlantAchievements: Achievement[]
  location: GeoLocation | null
  ebirdApiKey: string

  addObservation: (obs: ObservedBird) => void
  removeObservation: (id: string) => void
  addPlantObservation: (obs: PlantObservation) => void
  removePlantObservation: (id: string) => void
  setLocation: (loc: GeoLocation) => void
  setEbirdApiKey: (key: string) => void
  dismissNewAchievements: () => void
  dismissNewPlantAchievements: () => void
  getStats: () => UserStats
  getPlantStats: () => PlantStats
  hasObserved: (birdId: string) => boolean
  hasObservedPlant: (plantId: string) => boolean
  updateBirdInfo: (birdId: string, info: Partial<Bird>) => void
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

function computePlantStats(observations: PlantObservation[]): PlantStats {
  const uniqueSpeciesMap = new Map<string, Plant>()
  for (const obs of observations) {
    if (!uniqueSpeciesMap.has(obs.plant.id)) uniqueSpeciesMap.set(obs.plant.id, obs.plant)
  }
  const families = [...new Set(observations.map((o) => o.plant.family).filter(Boolean) as string[])]
  const locationSet = new Set<string>()
  for (const obs of observations) {
    if (obs.location) {
      const key = `${obs.location.lat.toFixed(2)},${obs.location.lng.toFixed(2)}`
      locationSet.add(key)
    }
  }
  let earlyMorning = 0, lateNight = 0
  for (const obs of observations) {
    const hour = new Date(obs.observedAt).getHours()
    if (hour < 7) earlyMorning++
    if (hour >= 23) lateNight++
  }
  const fungi = observations.filter((o) => (o.plant.iconic || '').toLowerCase() === 'fungi').length
  const days = [...new Set(observations.map((o) => o.observedAt.slice(0, 10)))].sort()
  let streak = 0
  if (days.length > 0) {
    let cur = 1
    for (let i = 1; i < days.length; i++) {
      const diff = (new Date(days[i]).getTime() - new Date(days[i - 1]).getTime()) / 86400000
      if (diff === 1) cur++
      else cur = 1
    }
    streak = cur
  }
  return {
    totalPlants: observations.length,
    uniqueSpecies: uniqueSpeciesMap.size,
    earlyMorning,
    lateNight,
    streak,
    locations: [...locationSet],
    families,
    fungi,
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

function checkNewPlantAchievements(
  stats: PlantStats,
  already: Achievement[]
): Achievement[] {
  const alreadyIds = new Set(already.map((a) => a.id))
  const newOnes: Achievement[] = []
  for (const def of PLANT_ACHIEVEMENTS) {
    if (!alreadyIds.has(def.id) && def.condition(stats)) {
      const { condition: _c, ...ach } = def
      newOnes.push({ ...ach, unlockedAt: new Date().toISOString() })
    }
  }
  return newOnes
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
      location: null,
      ebirdApiKey: '',

      addObservation: (obs) => {
        set((state) => {
          const observations = [...state.observations, obs]
          const stats = computeStats(observations)
          const newAchs = checkNewAchievements(stats, state.unlockedAchievements)
          return {
            observations,
            unlockedAchievements: [...state.unlockedAchievements, ...newAchs],
            newAchievements: [...state.newAchievements, ...newAchs],
          }
        })
      },

      removeObservation: (id) => {
        set((state) => ({
          observations: state.observations.filter((o) => o.id !== id),
        }))
      },

      addPlantObservation: (obs) => {
        set((state) => {
          const plantObservations = [...state.plantObservations, obs]
          const stats = computePlantStats(plantObservations)
          const newAchs = checkNewPlantAchievements(stats, state.unlockedPlantAchievements)
          return {
            plantObservations,
            unlockedPlantAchievements: [...state.unlockedPlantAchievements, ...newAchs],
            newPlantAchievements: [...state.newPlantAchievements, ...newAchs],
          }
        })
      },

      removePlantObservation: (id) => {
        set((state) => ({
          plantObservations: state.plantObservations.filter((o) => o.id !== id),
        }))
      },

      setLocation: (loc) => set({ location: loc }),

      setEbirdApiKey: (key) => set({ ebirdApiKey: key }),

      dismissNewAchievements: () => set({ newAchievements: [] }),

      dismissNewPlantAchievements: () => set({ newPlantAchievements: [] }),

      getStats: () => computeStats(get().observations),

      getPlantStats: () => computePlantStats(get().plantObservations),

      hasObserved: (birdId) => get().observations.some((o) => o.bird.id === birdId),

      hasObservedPlant: (plantId) => get().plantObservations.some((o) => o.plant.id === plantId),

      updateBirdInfo: (birdId, info) => {
        set((state) => ({
          observations: state.observations.map((o) =>
            o.bird.id === birdId ? { ...o, bird: { ...o.bird, ...info } } : o
          ),
        }))
      },
    }),
    {
      name: 'bird-quest-store',
    }
  )
)

import type { Achievement, FungusStats } from '../types'

export interface FungusAchievementDef extends Achievement {
  condition: (stats: FungusStats) => boolean
}

export const FUNGUS_ACHIEVEMENTS: FungusAchievementDef[] = [
  // ─── КОЛЛЕКЦИЯ ────────────────────────────────────────────────────────────
  {
    id: 'fungus_first',
    name: 'Первый гриб',
    description: 'Определи свой первый гриб',
    icon: '🍄',
    category: 'collection',
    points: 10,
    rarity: 'bronze',
    condition: (s) => s.uniqueSpecies >= 1,
  },
  {
    id: 'fungus_5',
    name: 'Начинающий грибник',
    description: 'Найди 5 разных видов грибов',
    icon: '🍄',
    category: 'collection',
    points: 25,
    rarity: 'bronze',
    condition: (s) => s.uniqueSpecies >= 5,
  },
  {
    id: 'fungus_10',
    name: 'Опытный грибник',
    description: 'Найди 10 разных видов грибов',
    icon: '🧺',
    category: 'collection',
    points: 50,
    rarity: 'bronze',
    condition: (s) => s.uniqueSpecies >= 10,
  },
  {
    id: 'fungus_25',
    name: 'Знаток грибов',
    description: 'Найди 25 разных видов грибов',
    icon: '🌲',
    category: 'collection',
    points: 100,
    rarity: 'silver',
    condition: (s) => s.uniqueSpecies >= 25,
  },
  {
    id: 'fungus_50',
    name: 'Мастер микологии',
    description: 'Найди 50 разных видов грибов',
    icon: '🏅',
    category: 'collection',
    points: 200,
    rarity: 'gold',
    condition: (s) => s.uniqueSpecies >= 50,
  },
  {
    id: 'fungus_100',
    name: 'Гранд-миколог',
    description: 'Найди 100 разных видов грибов',
    icon: '👑',
    category: 'collection',
    points: 500,
    rarity: 'platinum',
    condition: (s) => s.uniqueSpecies >= 100,
  },
  {
    id: 'fungus_total_10',
    name: 'Юный миколог',
    description: 'Сделай 10 наблюдений за грибами',
    icon: '📋',
    category: 'collection',
    points: 20,
    rarity: 'bronze',
    condition: (s) => s.totalFungi >= 10,
  },
  {
    id: 'fungus_total_50',
    name: 'Усердный миколог',
    description: 'Сделай 50 наблюдений за грибами',
    icon: '📊',
    category: 'collection',
    points: 75,
    rarity: 'silver',
    condition: (s) => s.totalFungi >= 50,
  },

  // ─── ТАКСОНОМИЯ ───────────────────────────────────────────────────────────
  {
    id: 'fungus_families_3',
    name: 'Разнообразие грибов',
    description: 'Найди грибы из 3 разных семейств',
    icon: '🌿',
    category: 'taxonomy',
    points: 40,
    rarity: 'bronze',
    condition: (s) => s.families.length >= 3,
  },
  {
    id: 'fungus_families_7',
    name: 'Систематик-миколог',
    description: 'Найди грибы из 7 разных семейств',
    icon: '🔎',
    category: 'taxonomy',
    points: 120,
    rarity: 'silver',
    condition: (s) => s.families.length >= 7,
  },
  {
    id: 'fungus_families_15',
    name: 'Энциклопедист грибов',
    description: 'Найди грибы из 15 разных семейств',
    icon: '🔬',
    category: 'taxonomy',
    points: 300,
    rarity: 'gold',
    condition: (s) => s.families.length >= 15,
  },
  {
    id: 'fungus_big_day',
    name: 'Грибной день',
    description: 'Найди 5 видов грибов за один день',
    icon: '⚡',
    category: 'taxonomy',
    points: 100,
    rarity: 'silver',
    condition: (s) => {
      const byDay: Record<string, Set<string>> = {}
      for (const obs of s.observations) {
        const day = obs.observedAt.slice(0, 10)
        if (!byDay[day]) byDay[day] = new Set()
        byDay[day].add(obs.fungus.id)
      }
      return Object.values(byDay).some((set) => set.size >= 5)
    },
  },

  // ─── ВРЕМЯ ────────────────────────────────────────────────────────────────
  {
    id: 'fungus_morning',
    name: 'Ранний грибник',
    description: 'Найди гриб до 7 утра',
    icon: '🌅',
    category: 'time',
    points: 25,
    rarity: 'bronze',
    condition: (s) => s.earlyMorning >= 1,
  },
  {
    id: 'fungus_night',
    name: 'Ночной грибник',
    description: 'Найди гриб после 23:00',
    icon: '🌙',
    category: 'time',
    points: 40,
    rarity: 'silver',
    condition: (s) => s.lateNight >= 1,
  },
  {
    id: 'fungus_streak_3',
    name: 'Три грибных дня',
    description: 'Ищи грибы 3 дня подряд',
    icon: '🔥',
    category: 'time',
    points: 40,
    rarity: 'bronze',
    condition: (s) => s.streak >= 3,
  },
  {
    id: 'fungus_streak_7',
    name: 'Грибная неделя',
    description: 'Ищи грибы 7 дней подряд',
    icon: '📅',
    category: 'time',
    points: 150,
    rarity: 'gold',
    condition: (s) => s.streak >= 7,
  },

  // ─── ИССЛЕДОВАНИЯ ─────────────────────────────────────────────────────────
  {
    id: 'fungus_explorer',
    name: 'Грибы в трёх местах',
    description: 'Найди грибы в 3 разных местах',
    icon: '🗺️',
    category: 'exploration',
    points: 80,
    rarity: 'silver',
    condition: (s) => s.locations.length >= 3,
  },
  {
    id: 'fungus_traveler',
    name: 'Грибы в пяти местах',
    description: 'Найди грибы в 5 разных местах',
    icon: '🧭',
    category: 'exploration',
    points: 150,
    rarity: 'gold',
    condition: (s) => s.locations.length >= 5,
  },
  {
    id: 'fungus_explorer_10',
    name: 'Первооткрыватель грибов',
    description: 'Найди грибы в 10 разных местах',
    icon: '🌍',
    category: 'exploration',
    points: 350,
    rarity: 'platinum',
    condition: (s) => s.locations.length >= 10,
  },
]

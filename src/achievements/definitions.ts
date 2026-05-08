import type { Achievement, UserStats } from '../types'

export interface AchievementDef extends Achievement {
  condition: (stats: UserStats) => boolean
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // --- КОЛЛЕКЦИЯ ---
  {
    id: 'first_bird',
    name: 'Первая птица',
    description: 'Определи свою первую птицу',
    icon: '🐦',
    category: 'collection',
    points: 10,
    rarity: 'bronze',
    condition: (s) => s.uniqueSpecies >= 1,
  },
  {
    id: 'five_birds',
    name: 'Начинающий орнитолог',
    description: 'Найди 5 разных видов',
    icon: '🔍',
    category: 'collection',
    points: 25,
    rarity: 'bronze',
    condition: (s) => s.uniqueSpecies >= 5,
  },
  {
    id: 'ten_birds',
    name: 'Любитель птиц',
    description: 'Найди 10 разных видов',
    icon: '📖',
    category: 'collection',
    points: 50,
    rarity: 'bronze',
    condition: (s) => s.uniqueSpecies >= 10,
  },
  {
    id: 'twenty_five_birds',
    name: 'Знаток птиц',
    description: 'Найди 25 разных видов',
    icon: '🎯',
    category: 'collection',
    points: 100,
    rarity: 'silver',
    condition: (s) => s.uniqueSpecies >= 25,
  },
  {
    id: 'fifty_birds',
    name: 'Опытный орнитолог',
    description: 'Найди 50 разных видов',
    icon: '🏅',
    category: 'collection',
    points: 200,
    rarity: 'silver',
    condition: (s) => s.uniqueSpecies >= 50,
  },
  {
    id: 'hundred_birds',
    name: 'Эксперт-орнитолог',
    description: 'Найди 100 разных видов',
    icon: '🏆',
    category: 'collection',
    points: 500,
    rarity: 'gold',
    condition: (s) => s.uniqueSpecies >= 100,
  },
  {
    id: 'two_hundred_birds',
    name: 'Мастер-орнитолог',
    description: 'Найди 200 разных видов',
    icon: '👑',
    category: 'collection',
    points: 1000,
    rarity: 'platinum',
    condition: (s) => s.uniqueSpecies >= 200,
  },

  // --- ВРЕМЯ ---
  {
    id: 'early_bird',
    name: 'Ранняя пташка',
    description: 'Определи птицу до 7 утра',
    icon: '🌅',
    category: 'time',
    points: 30,
    rarity: 'bronze',
    condition: (s) => s.earlyMorning >= 1,
  },
  {
    id: 'night_watcher',
    name: 'Ночной наблюдатель',
    description: 'Определи птицу после 23:00',
    icon: '🌙',
    category: 'time',
    points: 40,
    rarity: 'silver',
    condition: (s) => s.lateNight >= 1,
  },
  {
    id: 'dedicated',
    name: 'Преданный наблюдатель',
    description: 'Наблюдай за птицами 7 дней подряд',
    icon: '🔥',
    category: 'time',
    points: 150,
    rarity: 'gold',
    condition: (s) => s.streak >= 7,
  },

  // --- НАВЫК ---
  {
    id: 'photographer',
    name: 'Фотограф',
    description: 'Определи 10 птиц по фотографии',
    icon: '📸',
    category: 'skill',
    points: 75,
    rarity: 'bronze',
    condition: (s) => s.byPhoto >= 10,
  },
  {
    id: 'listener',
    name: 'Слушатель',
    description: 'Определи 10 птиц по звуку',
    icon: '🎵',
    category: 'skill',
    points: 100,
    rarity: 'silver',
    condition: (s) => s.bySound >= 10,
  },
  {
    id: 'centurion_photos',
    name: 'Мастер фото',
    description: 'Определи 50 птиц по фотографии',
    icon: '🎞️',
    category: 'skill',
    points: 300,
    rarity: 'gold',
    condition: (s) => s.byPhoto >= 50,
  },

  // --- РЕДКОСТЬ ---
  {
    id: 'rare_find',
    name: 'Редкая находка',
    description: 'Встреть редкий или очень редкий вид',
    icon: '💎',
    category: 'rarity',
    points: 200,
    rarity: 'gold',
    condition: (s) => s.rareBirds >= 1,
  },
  {
    id: 'rare_collector',
    name: 'Охотник за редкостями',
    description: 'Встреть 5 редких видов',
    icon: '🦄',
    category: 'rarity',
    points: 500,
    rarity: 'platinum',
    condition: (s) => s.rareBirds >= 5,
  },

  // --- ТАКСОНОМИЯ ---
  {
    id: 'songbird_fan',
    name: 'Воробьиные',
    description: 'Найди 10 видов воробьеобразных (Passeriformes)',
    icon: '🎶',
    category: 'taxonomy',
    points: 80,
    rarity: 'silver',
    condition: (s) =>
      s.observations.filter((o) => o.bird.order === 'Passeriformes').map((o) => o.bird.id)
        .filter((id, i, arr) => arr.indexOf(id) === i).length >= 10,
  },
  {
    id: 'raptor_finder',
    name: 'Пернатые хищники',
    description: 'Найди ястреба, орла, сокола или коршуна',
    icon: '🦅',
    category: 'taxonomy',
    points: 120,
    rarity: 'silver',
    condition: (s) =>
      s.observations.some((o) =>
        ['Accipitriformes', 'Falconiformes', 'Strigiformes'].includes(o.bird.order || '')
      ),
  },
  {
    id: 'waterbird',
    name: 'Водоплавающие',
    description: 'Найди утку, цаплю, чайку или лысуху',
    icon: '🦢',
    category: 'taxonomy',
    points: 80,
    rarity: 'bronze',
    condition: (s) =>
      s.observations.some((o) =>
        ['Anseriformes', 'Pelecaniformes', 'Charadriiformes', 'Gruiformes'].includes(
          o.bird.order || ''
        )
      ),
  },
  {
    id: 'owl_hunter',
    name: 'Охотник за совами',
    description: 'Найди сову',
    icon: '🦉',
    category: 'taxonomy',
    points: 150,
    rarity: 'gold',
    condition: (s) => s.observations.some((o) => o.bird.order === 'Strigiformes'),
  },
  {
    id: 'family_collector',
    name: 'Систематик',
    description: 'Найди птиц из 5 разных семейств',
    icon: '🌳',
    category: 'taxonomy',
    points: 100,
    rarity: 'silver',
    condition: (s) => s.families.length >= 5,
  },
  {
    id: 'order_collector',
    name: 'Энциклопедист',
    description: 'Найди птиц из 5 разных отрядов',
    icon: '📚',
    category: 'taxonomy',
    points: 200,
    rarity: 'gold',
    condition: (s) => s.orders.length >= 5,
  },

  // --- ИССЛЕДОВАНИЯ ---
  {
    id: 'explorer',
    name: 'Путешественник',
    description: 'Найди птиц в 3 разных местах',
    icon: '🗺️',
    category: 'exploration',
    points: 100,
    rarity: 'silver',
    condition: (s) => s.locations.length >= 3,
  },
  {
    id: 'prolific',
    name: 'Продуктивный день',
    description: 'Найди 5 видов за один день',
    icon: '⚡',
    category: 'exploration',
    points: 80,
    rarity: 'silver',
    condition: (s) => {
      const byDay: Record<string, Set<string>> = {}
      for (const obs of s.observations) {
        const day = obs.observedAt.slice(0, 10)
        if (!byDay[day]) byDay[day] = new Set()
        byDay[day].add(obs.bird.id)
      }
      return Object.values(byDay).some((set) => set.size >= 5)
    },
  },
]

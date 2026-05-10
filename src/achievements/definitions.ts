import type { Achievement, UserStats } from '../types'

export interface AchievementDef extends Achievement {
  condition: (stats: UserStats) => boolean
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // ─── КОЛЛЕКЦИЯ ────────────────────────────────────────────────────────────
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
  {
    id: 'total_10',
    name: 'Первая десятка',
    description: 'Сделай 10 наблюдений',
    icon: '📋',
    category: 'collection',
    points: 20,
    rarity: 'bronze',
    condition: (s) => s.totalBirds >= 10,
  },
  {
    id: 'total_50',
    name: 'Полсотни',
    description: 'Сделай 50 наблюдений',
    icon: '📊',
    category: 'collection',
    points: 75,
    rarity: 'silver',
    condition: (s) => s.totalBirds >= 50,
  },
  {
    id: 'total_200',
    name: 'Двести наблюдений',
    description: 'Сделай 200 наблюдений',
    icon: '🗃️',
    category: 'collection',
    points: 250,
    rarity: 'gold',
    condition: (s) => s.totalBirds >= 200,
  },

  // ─── ВРЕМЯ ────────────────────────────────────────────────────────────────
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
    id: 'early_bird_x5',
    name: 'Жаворонок',
    description: 'Определи 5 птиц до 7 утра',
    icon: '🌄',
    category: 'time',
    points: 100,
    rarity: 'silver',
    condition: (s) => s.earlyMorning >= 5,
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
    id: 'night_watcher_x3',
    name: 'Сова',
    description: 'Определи 3 птицы после 23:00',
    icon: '🦉',
    category: 'time',
    points: 120,
    rarity: 'gold',
    condition: (s) => s.lateNight >= 3,
  },
  {
    id: 'streak_3',
    name: 'Три дня подряд',
    description: 'Наблюдай за птицами 3 дня подряд',
    icon: '🔥',
    category: 'time',
    points: 40,
    rarity: 'bronze',
    condition: (s) => s.streak >= 3,
  },
  {
    id: 'dedicated',
    name: 'Преданный наблюдатель',
    description: 'Наблюдай за птицами 7 дней подряд',
    icon: '📅',
    category: 'time',
    points: 150,
    rarity: 'gold',
    condition: (s) => s.streak >= 7,
  },
  {
    id: 'streak_30',
    name: 'Месяц с птицами',
    description: 'Наблюдай за птицами 30 дней подряд',
    icon: '🏆',
    category: 'time',
    points: 500,
    rarity: 'platinum',
    condition: (s) => s.streak >= 30,
  },

  // ─── НАВЫК ────────────────────────────────────────────────────────────────
  {
    id: 'first_photo',
    name: 'Первый снимок',
    description: 'Определи птицу по фотографии',
    icon: '📷',
    category: 'skill',
    points: 15,
    rarity: 'bronze',
    condition: (s) => s.byPhoto >= 1,
  },
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
    id: 'centurion_photos',
    name: 'Мастер фото',
    description: 'Определи 50 птиц по фотографии',
    icon: '🎞️',
    category: 'skill',
    points: 300,
    rarity: 'gold',
    condition: (s) => s.byPhoto >= 50,
  },
  {
    id: 'first_sound',
    name: 'Первый звук',
    description: 'Определи птицу по пению',
    icon: '🎤',
    category: 'skill',
    points: 20,
    rarity: 'bronze',
    condition: (s) => s.bySound >= 1,
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
    id: 'audiophile',
    name: 'Знаток пения',
    description: 'Определи 25 птиц по звуку',
    icon: '🎶',
    category: 'skill',
    points: 250,
    rarity: 'gold',
    condition: (s) => s.bySound >= 25,
  },
  {
    id: 'all_rounder',
    name: 'Универсал',
    description: 'Используй все три способа определения',
    icon: '🎯',
    category: 'skill',
    points: 80,
    rarity: 'silver',
    condition: (s) => s.byPhoto >= 1 && s.bySound >= 1 && s.byManual >= 1,
  },
  {
    id: 'big_day',
    name: 'Большой день',
    description: 'Найди 10 видов за один день',
    icon: '⚡',
    category: 'skill',
    points: 150,
    rarity: 'gold',
    condition: (s) => {
      const byDay: Record<string, Set<string>> = {}
      for (const obs of s.observations) {
        const day = obs.observedAt.slice(0, 10)
        if (!byDay[day]) byDay[day] = new Set()
        byDay[day].add(obs.bird.id)
      }
      return Object.values(byDay).some((set) => set.size >= 10)
    },
  },

  // ─── РЕДКОСТЬ ─────────────────────────────────────────────────────────────
  {
    id: 'uncommon_find',
    name: 'Необычная встреча',
    description: 'Встреть уязвимый вид',
    icon: '🔮',
    category: 'rarity',
    points: 80,
    rarity: 'silver',
    condition: (s) =>
      s.observations.some((o) => o.bird.rarity === 'uncommon'),
  },
  {
    id: 'rare_find',
    name: 'Редкая находка',
    description: 'Встреть редкий или исчезающий вид',
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
  {
    id: 'very_rare',
    name: 'Критически редкий',
    description: 'Встреть критически исчезающий вид',
    icon: '⭐',
    category: 'rarity',
    points: 400,
    rarity: 'platinum',
    condition: (s) =>
      s.observations.some((o) => o.bird.rarity === 'very_rare'),
  },

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
  {
    id: 'woodpecker',
    name: 'Дятел найден',
    description: 'Найди дятла (Piciformes)',
    icon: '🪵',
    category: 'taxonomy',
    points: 60,
    rarity: 'silver',
    condition: (s) => s.observations.some((o) => o.bird.order === 'Piciformes'),
  },
  {
    id: 'pigeon_watcher',
    name: 'Городской натуралист',
    description: 'Найди голубя или горлицу (Columbiformes)',
    icon: '🕊️',
    category: 'taxonomy',
    points: 20,
    rarity: 'bronze',
    condition: (s) => s.observations.some((o) => o.bird.order === 'Columbiformes'),
  },
  {
    id: 'shorebird',
    name: 'Береговой охотник',
    description: 'Найди кулика или зуйка (Charadriiformes)',
    icon: '🏖️',
    category: 'taxonomy',
    points: 90,
    rarity: 'silver',
    condition: (s) => s.observations.some((o) => o.bird.order === 'Charadriiformes'),
  },
  {
    id: 'ten_families',
    name: 'Знаток семейств',
    description: 'Найди птиц из 10 разных семейств',
    icon: '🌿',
    category: 'taxonomy',
    points: 200,
    rarity: 'gold',
    condition: (s) => s.families.length >= 10,
  },
  {
    id: 'ten_orders',
    name: 'Мастер систематики',
    description: 'Найди птиц из 10 разных отрядов',
    icon: '🔬',
    category: 'taxonomy',
    points: 400,
    rarity: 'platinum',
    condition: (s) => s.orders.length >= 10,
  },

  // ─── ИССЛЕДОВАНИЯ ─────────────────────────────────────────────────────────
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
    id: 'explorer_5',
    name: 'Исследователь',
    description: 'Найди птиц в 5 разных местах',
    icon: '🧭',
    category: 'exploration',
    points: 200,
    rarity: 'gold',
    condition: (s) => s.locations.length >= 5,
  },
  {
    id: 'explorer_10',
    name: 'Первооткрыватель',
    description: 'Найди птиц в 10 разных местах',
    icon: '🌍',
    category: 'exploration',
    points: 400,
    rarity: 'platinum',
    condition: (s) => s.locations.length >= 10,
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
  {
    id: 'comeback',
    name: 'Снова в деле',
    description: 'Вернись к наблюдениям после перерыва',
    icon: '🔄',
    category: 'exploration',
    points: 30,
    rarity: 'bronze',
    condition: (s) => {
      if (s.observations.length < 2) return false
      const sorted = [...s.observations].sort(
        (a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime()
      )
      for (let i = 1; i < sorted.length; i++) {
        const gap =
          new Date(sorted[i].observedAt).getTime() -
          new Date(sorted[i - 1].observedAt).getTime()
        if (gap > 7 * 24 * 3600 * 1000) return true
      }
      return false
    },
  },
  {
    id: 'same_spot',
    name: 'Любимое место',
    description: 'Найди птиц в одном месте 3 раза',
    icon: '📍',
    category: 'exploration',
    points: 60,
    rarity: 'silver',
    condition: (s) => {
      const count: Record<string, number> = {}
      for (const obs of s.observations) {
        if (obs.location) {
          const key = `${Math.round(obs.location.lat * 10)}_${Math.round(obs.location.lng * 10)}`
          count[key] = (count[key] || 0) + 1
        }
      }
      return Object.values(count).some((c) => c >= 3)
    },
  },
]

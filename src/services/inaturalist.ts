import type { Bird, IdentifyResult } from '../types'
import { getBirdNetUrl } from './birdnet'

export interface PlantResult {
  id: string
  commonName: string
  scientificName: string
  thumbnailUrl?: string
  imageUrl?: string
  wikipediaUrl?: string
  confidence: number
  family?: string
}

const INAT_BASE = 'https://api.inaturalist.org/v1'

interface INatTaxon {
  id: number
  name: string
  preferred_common_name?: string
  default_photo?: { medium_url?: string; square_url?: string; url?: string }
  iconic_taxon_name?: string
  rank?: string
  ancestor_ids?: number[]
  wikipedia_url?: string
  conservation_status?: { status_name?: string }
}

interface INatScoreResult {
  taxon: INatTaxon
  score?: number
  combined_score?: number  // vision + location frequency (preferred when available)
  vision_score?: number
}

function rarityFromConservation(status?: string): Bird['rarity'] {
  if (!status) return 'common'
  const s = status.toLowerCase()
  if (s.includes('critically') || s.includes('extinct')) return 'very_rare'
  if (s.includes('endangered')) return 'rare'
  if (s.includes('vulnerable') || s.includes('near threatened')) return 'uncommon'
  return 'common'
}

function taxonToBird(taxon: INatTaxon): Bird {
  return {
    id: `inat_${taxon.id}`,
    commonName: taxon.preferred_common_name || taxon.name,
    scientificName: taxon.name,
    imageUrl: taxon.default_photo?.medium_url,
    thumbnailUrl: taxon.default_photo?.square_url || taxon.default_photo?.url,
    wikipediaUrl: taxon.wikipedia_url,
    inaturalistId: taxon.id,
    rarity: rarityFromConservation(taxon.conservation_status?.status_name),
  }
}

/** Resize + compress image to ≤1 MB JPEG for the iNaturalist Vision API. */
async function prepareImage(file: File): Promise<Blob> {
  const MAX = 1_000_000
  if (file.size <= MAX && file.type === 'image/jpeg') return file

  const img = new Image()
  const blobUrl = URL.createObjectURL(file)
  await new Promise<void>((res, rej) => {
    img.onload = () => res()
    img.onerror = rej
    img.src = blobUrl
  })
  URL.revokeObjectURL(blobUrl)

  let quality = 0.85
  let scale = 1
  if (file.size > MAX) scale = Math.sqrt(MAX / file.size) * 0.9

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)

  return new Promise((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', quality))
}

async function fetchVisionResults(
  file: File,
  lat?: number,
  lng?: number
): Promise<INatScoreResult[]> {
  const image = await prepareImage(file)
  const formData = new FormData()
  formData.append('image', image, 'photo.jpg')
  if (lat !== undefined) formData.append('lat', lat.toString())
  if (lng !== undefined) formData.append('lng', lng.toString())

  // Route through our backend proxy — it adds the iNaturalist Bearer token.
  // Fallback: try iNaturalist directly (works only if API allows unauthenticated).
  const backendBase = getBirdNetUrl()
  const useProxy = backendBase !== '/birdnet'
  const url = useProxy
    ? `${backendBase}/identify/image`
    : `${INAT_BASE}/computervision/score_image`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(30000),
    })
  } catch {
    throw new Error('Сервер недоступен. Подожди 30–60 секунд — он просыпается после простоя.')
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403)
      throw new Error('Ошибка авторизации iNaturalist. Проверь настройки сервера.')
    if (res.status === 429)
      throw new Error('Превышен лимит запросов iNaturalist. Подожди минуту и попробуй снова.')
    if (res.status === 503)
      throw new Error('Сервер просыпается, подожди 30–60 секунд и попробуй снова.')
    throw new Error(`Ошибка iNaturalist ${res.status}`)
  }

  const data = await res.json()
  return data.results || []
}

export async function identifyFromImage(
  file: File,
  lat?: number,
  lng?: number
): Promise<IdentifyResult[]> {
  const results = await fetchVisionResults(file, lat, lng)
  const filtered = results
    .filter((r) => {
      const iconic = (r.taxon.iconic_taxon_name || '').toLowerCase()
      return iconic === 'aves' || r.taxon.ancestor_ids?.includes(3)
    })
    .slice(0, 5)

  // Prefer combined_score (vision + location) over vision-only score.
  // Normalize relative to sum so the top result gets an intuitive %.
  const getScore = (r: INatScoreResult) => {
    const v = r.combined_score ?? r.score ?? r.vision_score ?? 0
    return typeof v === 'number' && isFinite(v) ? v : 0
  }
  const total = filtered.reduce((sum, r) => sum + getScore(r), 0)
  return filtered.map((r) => ({
    bird: taxonToBird(r.taxon),
    confidence: total > 0 ? getScore(r) / total : getScore(r),
    source: 'inaturalist' as const,
  }))
}

function scoreResultToPlantResult(r: INatScoreResult, normalizedScore: number): PlantResult {
  return {
    id: `inat_${r.taxon.id}`,
    commonName: r.taxon.preferred_common_name || r.taxon.name,
    scientificName: r.taxon.name,
    thumbnailUrl: r.taxon.default_photo?.square_url || r.taxon.default_photo?.url,
    imageUrl: r.taxon.default_photo?.medium_url,
    wikipediaUrl: r.taxon.wikipedia_url,
    confidence: normalizedScore,
  }
}

export async function identifyPlantFromImage(
  file: File,
  lat?: number,
  lng?: number
): Promise<PlantResult[]> {
  const results = await fetchVisionResults(file, lat, lng)
  const filtered = results
    .filter((r) => {
      const iconic = (r.taxon.iconic_taxon_name || '').toLowerCase()
      return iconic === 'plantae' || r.taxon.ancestor_ids?.includes(47126)
    })
    .slice(0, 5)
  const getScore = (r: INatScoreResult) => {
    const v = r.combined_score ?? r.score ?? r.vision_score ?? 0
    return typeof v === 'number' && isFinite(v) ? v : 0
  }
  const total = filtered.reduce((sum, r) => sum + getScore(r), 0)
  return filtered.map((r) => scoreResultToPlantResult(r, total > 0 ? getScore(r) / total : getScore(r)))
}

export async function identifyFungusFromImage(
  file: File,
  lat?: number,
  lng?: number
): Promise<PlantResult[]> {
  const results = await fetchVisionResults(file, lat, lng)
  const filtered = results
    .filter((r) => {
      const iconic = (r.taxon.iconic_taxon_name || '').toLowerCase()
      return iconic === 'fungi' || r.taxon.ancestor_ids?.includes(47170)
    })
    .slice(0, 5)
  const getScore = (r: INatScoreResult) => {
    const v = r.combined_score ?? r.score ?? r.vision_score ?? 0
    return typeof v === 'number' && isFinite(v) ? v : 0
  }
  const total = filtered.reduce((sum, r) => sum + getScore(r), 0)
  return filtered.map((r) => scoreResultToPlantResult(r, total > 0 ? getScore(r) / total : getScore(r)))
}

export async function getBirdDetails(inaturalistId: number): Promise<Partial<Bird>> {
  const res = await fetch(`${INAT_BASE}/taxa/${inaturalistId}`)
  if (!res.ok) return {}
  const data = await res.json()
  const taxon = data.results?.[0] as INatTaxon | undefined
  if (!taxon) return {}

  let order = ''
  let family = ''
  if (taxon.ancestor_ids) {
    const ancestorsRes = await fetch(
      `${INAT_BASE}/taxa?id=${taxon.ancestor_ids.slice(-10).join(',')}&per_page=30`
    )
    if (ancestorsRes.ok) {
      const ancestorsData = await ancestorsRes.json()
      for (const anc of ancestorsData.results || []) {
        if (anc.rank === 'order') order = anc.name
        if (anc.rank === 'family') family = anc.name
      }
    }
  }

  return {
    order: order || undefined,
    family: family || undefined,
    imageUrl: taxon.default_photo?.medium_url,
    thumbnailUrl: taxon.default_photo?.square_url,
    rarity: rarityFromConservation(taxon.conservation_status?.status_name),
  }
}

export async function searchBirdByName(query: string): Promise<Bird[]> {
  const res = await fetch(
    `${INAT_BASE}/taxa?q=${encodeURIComponent(query)}&iconic_taxa=Aves&rank=species&per_page=10&locale=ru`
  )
  if (!res.ok) return []
  const data = await res.json()
  return (data.results || []).map((t: INatTaxon) => taxonToBird(t))
}

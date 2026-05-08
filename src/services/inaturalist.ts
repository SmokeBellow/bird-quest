import type { Bird, IdentifyResult } from '../types'

const BASE = 'https://api.inaturalist.org/v1'

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
  score: number
  vision_score?: number
  frequency_score?: number
}

function rarityFromConservation(status?: string): Bird['rarity'] {
  if (!status) return 'common'
  const s = status.toLowerCase()
  if (s.includes('critically') || s.includes('extinct')) return 'very_rare'
  if (s.includes('endangered')) return 'rare'
  if (s.includes('vulnerable') || s.includes('near threatened')) return 'uncommon'
  return 'common'
}

function taxonToBird(taxon: INatTaxon, score?: number): Bird {
  return {
    id: `inat_${taxon.id}`,
    commonName: taxon.preferred_common_name || taxon.name,
    scientificName: taxon.name,
    imageUrl: taxon.default_photo?.medium_url,
    thumbnailUrl: taxon.default_photo?.square_url || taxon.default_photo?.url,
    wikipediaUrl: taxon.wikipedia_url,
    inaturalistId: taxon.id,
    rarity: rarityFromConservation(taxon.conservation_status?.status_name),
    // order/family filled by separate lookup
  }
}

export async function identifyFromImage(
  file: File,
  lat?: number,
  lng?: number
): Promise<IdentifyResult[]> {
  const formData = new FormData()
  formData.append('image', file)
  if (lat !== undefined) formData.append('lat', lat.toString())
  if (lng !== undefined) formData.append('lng', lng.toString())

  const res = await fetch(`${BASE}/computervision/score_image`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error(`iNaturalist API error: ${res.status}`)
  const data = await res.json()

  const results: INatScoreResult[] = data.results || []
  return results
    .filter((r) => r.taxon.iconic_taxon_name === 'Aves' || r.taxon.rank === 'species')
    .filter((r) => {
      const name = (r.taxon.preferred_common_name || r.taxon.name || '').toLowerCase()
      const iconic = (r.taxon.iconic_taxon_name || '').toLowerCase()
      return iconic === 'aves' || name.includes('bird') || r.taxon.ancestor_ids?.includes(3)
    })
    .slice(0, 5)
    .map((r) => ({
      bird: taxonToBird(r.taxon),
      confidence: r.score,
      source: 'inaturalist' as const,
    }))
}

export async function getBirdDetails(inaturalistId: number): Promise<Partial<Bird>> {
  const res = await fetch(`${BASE}/taxa/${inaturalistId}`)
  if (!res.ok) return {}
  const data = await res.json()
  const taxon = data.results?.[0] as INatTaxon | undefined
  if (!taxon) return {}

  let order = ''
  let family = ''
  if (taxon.ancestor_ids) {
    const ancestorsRes = await fetch(
      `${BASE}/taxa?id=${taxon.ancestor_ids.slice(-10).join(',')}&per_page=30`
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
    `${BASE}/taxa?q=${encodeURIComponent(query)}&iconic_taxa=Aves&rank=species&per_page=10&locale=ru`
  )
  if (!res.ok) return []
  const data = await res.json()
  return (data.results || []).map((t: INatTaxon) => taxonToBird(t))
}

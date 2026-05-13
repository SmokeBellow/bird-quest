import type { NearbyBird, NearbyTaxon } from '../types'

const INAT_BASE = 'https://api.inaturalist.org/v1'

const TAXON_IDS: Record<NearbyTaxon, number> = {
  birds: 3,
  plants: 47126,
  fungi: 47170,
}

export async function getNearbyObservations(
  lat: number,
  lng: number,
  distKm = 25,
  taxon: NearbyTaxon = 'birds'
): Promise<NearbyBird[]> {
  const res = await fetch(
    `${INAT_BASE}/observations?taxon_id=${TAXON_IDS[taxon]}&lat=${lat}&lng=${lng}&radius=${distKm}&per_page=100&order_by=observed_on&order=desc&quality_grade=research,needs_id`,
    { signal: AbortSignal.timeout(15000) }
  )
  if (!res.ok) throw new Error(`iNaturalist error: ${res.status}`)
  const data = await res.json()

  const seen = new Set<number>()
  const results: NearbyBird[] = []

  for (const obs of data.results || []) {
    const t = obs.taxon
    if (!t) continue
    const tid: number = t.id
    if (seen.has(tid)) continue
    seen.add(tid)

    const photo = t.default_photo || {}
    let obsLat: number | undefined
    let obsLng: number | undefined
    if (obs.location) {
      const parts = (obs.location as string).split(',')
      const a = parseFloat(parts[0])
      const b = parseFloat(parts[1])
      if (!isNaN(a) && !isNaN(b)) { obsLat = a; obsLng = b }
    }

    results.push({
      speciesCode: String(tid),
      comName: t.preferred_common_name || t.name || '',
      sciName: t.name || '',
      obsDt: obs.observed_on || '',
      thumbnailUrl: photo.square_url,
      lat: obsLat,
      lng: obsLng,
    })
  }

  return results
}

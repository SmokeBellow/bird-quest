import type { NearbyBird, NearbyTaxon } from '../types'
import { getBirdNetUrl } from './birdnet'

const base = () => getBirdNetUrl()

export async function getNearbyObservations(
  lat: number,
  lng: number,
  distKm = 25,
  taxon: NearbyTaxon = 'birds'
): Promise<NearbyBird[]> {
  const res = await fetch(`${base()}/nearby?lat=${lat}&lng=${lng}&dist=${distKm}&taxon=${taxon}`)
  if (!res.ok) throw new Error(`Nearby API error: ${res.status}`)
  return res.json()
}

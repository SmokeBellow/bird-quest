import type { NearbyBird } from '../types'
import { getBirdNetUrl } from './birdnet'

const base = () => getBirdNetUrl()

export async function getNearbyObservations(
  lat: number,
  lng: number,
  distKm = 25
): Promise<NearbyBird[]> {
  const res = await fetch(`${base()}/nearby?lat=${lat}&lng=${lng}&dist=${distKm}`)
  if (!res.ok) throw new Error(`Nearby API error: ${res.status}`)
  return res.json()
}

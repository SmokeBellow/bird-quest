import type { NearbyBird } from '../types'
import { getBirdNetUrl } from './birdnet'

const base = () => getBirdNetUrl()

export async function getNearbyObservations(
  lat: number,
  lng: number,
  distKm = 25,
  backDays = 14
): Promise<NearbyBird[]> {
  const res = await fetch(
    `${base()}/nearby?lat=${lat}&lng=${lng}&dist=${distKm}&back=${backDays}`
  )
  if (!res.ok) throw new Error(`eBird API error: ${res.status}`)
  return res.json()
}

export async function getSpeciesInfo(speciesCode: string) {
  const res = await fetch(`${base()}/ebird/taxonomy?species=${speciesCode}`)
  if (!res.ok) return null
  const data = await res.json()
  return data?.[0] ?? null
}

export async function getNearbySpecies(
  lat: number,
  lng: number,
  distKm = 50
): Promise<{ speciesCode: string; comName: string; sciName: string }[]> {
  const codesRes = await fetch(
    `${base()}/ebird/spplist/${lat.toFixed(2)}/${lng.toFixed(2)}?dist=${distKm}`
  )
  if (!codesRes.ok) return []
  const codes: string[] = await codesRes.json()
  if (!codes.length) return []

  const taxRes = await fetch(
    `${base()}/ebird/taxonomy?species=${codes.slice(0, 100).join(',')}`
  )
  if (!taxRes.ok) return codes.map((c) => ({ speciesCode: c, comName: c, sciName: '' }))
  const tax = await taxRes.json()
  return tax.map((t: { speciesCode: string; comName: string; sciName: string }) => ({
    speciesCode: t.speciesCode,
    comName: t.comName,
    sciName: t.sciName,
  }))
}

import type { NearbyBird } from '../types'

const BASE = 'https://api.ebird.org/v2'

export async function getNearbyObservations(
  lat: number,
  lng: number,
  apiKey: string,
  distKm = 25,
  backDays = 14
): Promise<NearbyBird[]> {
  const url = `${BASE}/data/obs/geo/recent?lat=${lat}&lng=${lng}&dist=${distKm}&back=${backDays}&maxResults=100`
  const res = await fetch(url, {
    headers: { 'X-eBirdApiToken': apiKey },
  })
  if (!res.ok) throw new Error(`eBird API error: ${res.status}`)
  return res.json()
}

export async function getSpeciesInfo(speciesCode: string, apiKey: string) {
  const url = `${BASE}/ref/taxonomy/ebird?species=${speciesCode}&fmt=json`
  const res = await fetch(url, {
    headers: { 'X-eBirdApiToken': apiKey },
  })
  if (!res.ok) return null
  const data = await res.json()
  return data?.[0] ?? null
}

export async function getNearbySpecies(
  lat: number,
  lng: number,
  apiKey: string,
  distKm = 50
): Promise<{ speciesCode: string; comName: string; sciName: string }[]> {
  const url = `${BASE}/product/spplist/${lat.toFixed(2)}/${lng.toFixed(2)}?dist=${distKm}`
  const res = await fetch(url, {
    headers: { 'X-eBirdApiToken': apiKey },
  })
  if (!res.ok) return []
  // eBird spplist returns just species codes, fetch taxonomy for names
  const codes: string[] = await res.json()
  if (!codes.length) return []
  const taxUrl = `${BASE}/ref/taxonomy/ebird?species=${codes.slice(0, 100).join(',')}&fmt=json`
  const taxRes = await fetch(taxUrl, { headers: { 'X-eBirdApiToken': apiKey } })
  if (!taxRes.ok) return codes.map((c) => ({ speciesCode: c, comName: c, sciName: '' }))
  const tax = await taxRes.json()
  return tax.map((t: { speciesCode: string; comName: string; sciName: string }) => ({
    speciesCode: t.speciesCode,
    comName: t.comName,
    sciName: t.sciName,
  }))
}

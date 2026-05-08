import type { BirdSound } from '../types'

interface XCRecording {
  id: string
  gen: string
  sp: string
  en: string
  rec: string
  cnt: string
  type: string
  file: string
  'file-name': string
  q: string
  length: string
}

interface XCResponse {
  numRecordings: string
  recordings: XCRecording[]
}

export async function getBirdSounds(scientificName: string, maxResults = 3): Promise<BirdSound[]> {
  try {
    const [genus, species] = scientificName.split(' ')
    if (!genus) return []
    const query = species ? `${genus}+${species}+q:A` : `${genus}+q:A`
    const res = await fetch(
      `https://xeno-canto.org/api/2/recordings?query=${encodeURIComponent(query)}&page=1`
    )
    if (!res.ok) return []
    const data: XCResponse = await res.json()
    return (data.recordings || []).slice(0, maxResults).map((r) => ({
      id: r.id,
      url: r.file.startsWith('//') ? `https:${r.file}` : r.file,
      recordist: r.rec,
      country: r.cnt,
      type: r.type,
    }))
  } catch {
    return []
  }
}

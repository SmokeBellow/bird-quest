export interface BirdNetDetection {
  commonName: string
  scientificName: string
  confidence: number
}

interface BirdNetResponse {
  msg: string
  results: {
    detections: Record<string, number>
  }
}

function getWeekNumber(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1)
  const diff = date.getTime() - start.getTime()
  const week = Math.ceil((diff / 86400000 + 1) / 7.25)
  return Math.min(48, Math.max(1, week))
}

/**
 * Returns the base URL for BirdNET API calls.
 *
 * Priority:
 *   1. Value stored in localStorage by the user (Settings page)
 *   2. VITE_BIRDNET_URL build-time env variable (set in GitHub Actions secret)
 *   3. '/birdnet' — Vite dev-server proxy → localhost:8080
 */
export function getBirdNetUrl(): string {
  const stored = localStorage.getItem('birdnet-server-url')
  if (stored) return stored.replace(/\/$/, '')
  const env = import.meta.env.VITE_BIRDNET_URL as string | undefined
  if (env) return env.replace(/\/$/, '')
  return '/birdnet'
}

export async function identifyFromAudio(
  audioBlob: Blob,
  lat?: number,
  lng?: number
): Promise<BirdNetDetection[]> {
  const base = getBirdNetUrl()
  const formData = new FormData()
  const ext = audioBlob.type.includes('webm') ? 'webm' : 'wav'
  formData.append('audio', audioBlob, `recording.${ext}`)
  if (lat !== undefined) formData.append('lat', lat.toString())
  if (lng !== undefined) formData.append('lon', lng.toString())
  formData.append('week', getWeekNumber(new Date()).toString())
  formData.append('sensitivity', '1.0')
  formData.append('locale', 'ru')

  const res = await fetch(`${base}/analyze`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    if (res.status === 0 || res.status === 502 || res.status === 503) {
      throw new BirdNetUnavailableError()
    }
    throw new Error(`BirdNET error: ${res.status}`)
  }

  const data: BirdNetResponse = await res.json()
  if (data.msg !== 'Success.' || !data.results?.detections) return []

  return Object.entries(data.results.detections)
    .map(([key, confidence]) => {
      const idx = key.indexOf('_')
      return {
        commonName: idx > -1 ? key.slice(0, idx) : key,
        scientificName: idx > -1 ? key.slice(idx + 1) : key,
        confidence,
      }
    })
    .filter((d) => d.confidence >= 0.1)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5)
}

export class BirdNetUnavailableError extends Error {
  constructor() {
    super('BirdNET server unavailable')
    this.name = 'BirdNetUnavailableError'
  }
}

// Returns: 'available' | 'waking' | 'unavailable'
export async function checkBirdNetAvailable(): Promise<'available' | 'waking' | 'unavailable'> {
  const base = getBirdNetUrl()

  // Quick check — if it responds within 5s it's warm
  try {
    const res = await fetch(`${base}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) return 'available'
  } catch {
    // fall through to slow check
  }

  // Slow check — Render free tier cold start can take up to 50s
  try {
    const res = await fetch(`${base}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(60000),
    })
    return res.ok ? 'available' : 'unavailable'
  } catch {
    // If no VITE_BIRDNET_URL configured at all, report as unavailable
    if (base === '/birdnet') return 'unavailable'
    // URL is configured but server didn't respond — it's sleeping
    return 'waking'
  }
}

interface WikiSummary {
  title: string
  extract: string
  thumbnail?: { source: string }
  content_urls?: { desktop?: { page?: string } }
}

export async function getBirdWikiInfo(
  scientificName: string,
  lang = 'ru'
): Promise<{ description: string; facts: string[]; imageUrl?: string } | null> {
  try {
    // try scientific name first
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(scientificName)}`
    let res = await fetch(url)

    if (!res.ok && lang !== 'en') {
      // fallback to English
      const enUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(scientificName)}`
      res = await fetch(enUrl)
    }
    if (!res.ok) return null

    const data: WikiSummary = await res.json()
    const extract = data.extract || ''
    const sentences = extract.split(/(?<=[.!?])\s+/).filter((s) => s.length > 20)

    const description = sentences.slice(0, 3).join(' ')
    const facts = sentences.slice(3, 8)

    return {
      description,
      facts,
      imageUrl: data.thumbnail?.source,
    }
  } catch {
    return null
  }
}

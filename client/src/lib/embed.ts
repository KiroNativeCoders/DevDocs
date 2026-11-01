// URL -> embeddable iframe src, using each provider's PUBLIC embed form.
// No API keys, no OAuth — just the documented iframe/oEmbed URL patterns.

export type EmbedProvider = 'youtube' | 'figma' | 'loom' | 'googlemaps' | 'generic'

export type EmbedInfo = {
  provider: EmbedProvider
  src: string
  // Aspect-ratio hint for the wrapper (width:height). 0 = let it fill a default.
  ratio?: number
  title: string
}

function ytId(url: string): string | null {
  const m =
    url.match(/[?&]v=([\w-]{11})/) ||
    url.match(/youtu\.be\/([\w-]{11})/) ||
    url.match(/youtube\.com\/embed\/([\w-]{11})/) ||
    url.match(/youtube\.com\/shorts\/([\w-]{11})/)
  return m ? m[1] : null
}

/** Resolve a pasted URL to an embed, or null if we don't recognise it. */
export function resolveEmbed(raw: string): EmbedInfo | null {
  const url = raw.trim()
  if (!/^https?:\/\//i.test(url)) return null

  // YouTube
  const yt = ytId(url)
  if (yt) {
    // Pass the embedding origin so YouTube's player accepts the embed. Omitting
    // the referrer entirely (or not declaring an origin) triggers the
    // "Video player configuration error" (15x / Error 153) on many videos.
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const params = new URLSearchParams({ rel: '0', modestbranding: '1' })
    if (origin) params.set('origin', origin)
    return {
      provider: 'youtube',
      src: `https://www.youtube.com/embed/${yt}?${params.toString()}`,
      ratio: 16 / 9,
      title: 'YouTube video',
    }
  }

  // Loom
  const loom = url.match(/loom\.com\/(?:share|embed)\/([0-9a-f]{20,})/i)
  if (loom) {
    return { provider: 'loom', src: `https://www.loom.com/embed/${loom[1]}`, ratio: 16 / 9, title: 'Loom recording' }
  }

  // Figma — official embed wrapper around the file/proto URL
  if (/figma\.com\/(file|design|proto|board)\//i.test(url)) {
    return {
      provider: 'figma',
      src: `https://www.figma.com/embed?embed_host=devdocs&url=${encodeURIComponent(url)}`,
      ratio: 4 / 3,
      title: 'Figma file',
    }
  }

  // Google Maps — place/embed share links
  if (/google\.[^/]+\/maps/i.test(url)) {
    // A full share URL works inside an iframe via the output=embed form.
    const src = url.includes('output=embed') ? url : `${url}${url.includes('?') ? '&' : '?'}output=embed`
    return { provider: 'googlemaps', src, ratio: 4 / 3, title: 'Google Map' }
  }

  return null
}

// Providers offered in the slash menu / embed picker.
export const EMBED_PROVIDERS: { key: EmbedProvider; label: string; hint: string }[] = [
  { key: 'youtube', label: 'YouTube', hint: 'Paste a YouTube video link' },
  { key: 'figma', label: 'Figma', hint: 'Paste a Figma file / prototype link' },
  { key: 'loom', label: 'Loom', hint: 'Paste a Loom recording link' },
  { key: 'googlemaps', label: 'Google Maps', hint: 'Paste a Google Maps link' },
]

// Branding for the empty-state card header (glyph + brand colour + label).
export const PROVIDER_META: Record<EmbedProvider, { label: string; icon: string; color: string; placeholder: string }> = {
  youtube: { label: 'YouTube', icon: '▶', color: '#ff0000', placeholder: 'Paste a YouTube video link' },
  figma: { label: 'Figma', icon: 'F', color: '#a259ff', placeholder: 'Paste a Figma file or prototype link' },
  loom: { label: 'Loom', icon: '◉', color: '#625df5', placeholder: 'Paste a Loom recording link' },
  googlemaps: { label: 'Google Maps', icon: '◆', color: '#34a853', placeholder: 'Paste a Google Maps link' },
  generic: { label: 'Embed', icon: '🔗', color: '#64748b', placeholder: 'Paste a YouTube / Figma / Loom / Google Maps link' },
}

// Client-side analytics tracker: tracks daily visits and page views into Supabase Postgres via the backend API.

const VISITOR_ID_KEY = 'dx_visitor_id'
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

export type AnalyticsStats = {
  ok: boolean
  warning?: string
  today: {
    uniqueVisitors: number
    totalViews: number
  }
  totalRecordedVisits?: number
  history: Array<{
    date: string
    uniqueVisitors: number
    totalViews: number
  }>
  topPages: Array<{
    path: string
    count: number
  }>
}

/** Get or initialize a persistent anonymous visitor ID */
export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY)
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'v_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36)
      localStorage.setItem(VISITOR_ID_KEY, id)
    }
    return id
  } catch {
    return 'anonymous'
  }
}

let lastLoggedPath: string | null = null

/** Record a page view / visitor heartbeat */
export async function recordVisit(userId?: string | null): Promise<void> {
  try {
    const path = window.location.pathname || '/'
    if (path === lastLoggedPath) return
    lastLoggedPath = path

    const visitorId = getVisitorId()
    const referrer = document.referrer || null

    await fetch(`${BASE}/api/analytics/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId,
        path,
        referrer,
        userId: userId || null,
      }),
    })
  } catch {
    // silently ignore network issues
  }
}

/** Fetch daily visitor metrics */
export async function fetchAnalyticsStats(): Promise<AnalyticsStats | null> {
  try {
    const res = await fetch(`${BASE}/api/analytics/stats`)
    if (!res.ok) return null
    return (await res.json()) as AnalyticsStats
  } catch {
    return null
  }
}

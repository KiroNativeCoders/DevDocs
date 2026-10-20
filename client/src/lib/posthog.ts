import posthog from 'posthog-js'

export const POSTHOG_KEY =
  import.meta.env.VITE_POSTHOG_KEY || 'phc_ucmzHcEFrUFJsXE3xuFMeasMy2TUVsbbeg3ttKyXC2Xq'
export const POSTHOG_HOST =
  import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

/** Initialize PostHog analytics */
export function initPostHog(): void {
  if (typeof window === 'undefined') return
  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
    })
  } catch (err) {
    console.warn('[PostHog] init warning:', err)
  }
}

/** Associate actions with an identified user */
export function identifyUser(id: string, properties?: Record<string, unknown>): void {
  try {
    posthog.identify(id, properties)
  } catch {
    // ignore
  }
}

/** Reset user session upon logout */
export function resetUser(): void {
  try {
    posthog.reset()
  } catch {
    // ignore
  }
}

export { posthog }

export const COOKIE_CONSENT_KEY = 'vibeshow_cookie_consent'
export const COOKIE_CONSENT_VERSION = '1.0'

export interface CookieConsentState {
  necessary: true
  analytics: boolean
  marketing: boolean
  consentDate: string
  consentVersion: string
}

declare global {
  interface Window {
    vibeshowLoadMarketing?: () => void
  }
}

export function createCookieConsent(options: { analytics: boolean; marketing: boolean }): CookieConsentState {
  return {
    necessary: true,
    analytics: options.analytics,
    marketing: options.marketing,
    consentDate: new Date().toISOString(),
    consentVersion: COOKIE_CONSENT_VERSION,
  }
}

export function readCookieConsent(): CookieConsentState | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const stored = window.localStorage.getItem(COOKIE_CONSENT_KEY)

    if (!stored) {
      return null
    }

    const parsed = JSON.parse(stored) as Partial<CookieConsentState>

    if (parsed.necessary !== true || typeof parsed.analytics !== 'boolean' || typeof parsed.marketing !== 'boolean') {
      return null
    }

    return {
      necessary: true,
      analytics: parsed.analytics,
      marketing: parsed.marketing,
      consentDate: typeof parsed.consentDate === 'string' ? parsed.consentDate : new Date().toISOString(),
      consentVersion: typeof parsed.consentVersion === 'string' ? parsed.consentVersion : COOKIE_CONSENT_VERSION,
    }
  } catch {
    return null
  }
}

export function hasAnalyticsConsent() {
  return readCookieConsent()?.analytics === true
}

export function saveCookieConsent(consent: CookieConsentState) {
  window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent))
  window.dispatchEvent(new CustomEvent('vibeshow-cookie-consent-changed', { detail: consent }))

  if (consent.marketing) {
    window.vibeshowLoadMarketing?.()
  }
}

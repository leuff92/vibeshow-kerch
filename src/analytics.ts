import { hasAnalyticsConsent } from './cookieConsent'

type Goal = 'phone_click' | 'messenger_click' | 'lead_submitted' | 'program_view' | 'video_start' | 'video_complete'
type CounterCall = [number, string, ...unknown[]]
type Counter = ((...args: CounterCall) => void) & { a?: CounterCall[]; l?: number }

declare global {
  interface Window {
    ym?: Counter
  }
}

const counterId = 109062327
const scriptUrl = 'https://mc.yandex.ru/metrika/tag.js'
let counterActive = false
let lastPage = ''

function startCounter() {
  if (!window.ym) {
    const queue: CounterCall[] = []
    window.ym = Object.assign((...args: CounterCall) => queue.push(args), { a: queue, l: Date.now() })
  }

  send('init', { defer: true, accurateTrackBounce: true, clickmap: false, trackLinks: false, webvisor: false })
  counterActive = true

  if (!document.querySelector('script[data-vibeshow-metrika]')) {
    const script = document.createElement('script')
    script.src = scriptUrl
    script.async = true
    script.setAttribute('data-vibeshow-metrika', '')
    document.head.append(script)
  }
}

function send(command: string, ...args: unknown[]) {
  try {
    window.ym?.(counterId, command, ...args)
  } catch {
    // Analytics must not interrupt navigation, playback, or booking.
  }
}

export function trackPage(program?: string) {
  if (!hasAnalyticsConsent()) {
    if (counterActive) {
      if (window.ym?.a) {
        window.ym.a.length = 0
      }
      send('destruct')
      counterActive = false
      lastPage = ''
    }
    return
  }

  if (!counterActive) {
    startCounter()
  }

  const url = new URL(window.location.href)
  url.hash = ''
  url.searchParams.delete('program')
  if (url.href === lastPage) {
    return
  }
  send('hit', url.href, { title: document.title, referer: lastPage || document.referrer })
  lastPage = url.href
  if (program) {
    trackGoal('program_view', { program })
  }
}

export function trackGoal(goal: Goal, params?: Record<string, string>) {
  if (counterActive && hasAnalyticsConsent()) {
    send('reachGoal', goal, params)
  }
}

export function trackContactClick(event: MouseEvent) {
  const link = (event.target instanceof Element ? event.target.closest('a[href]') : null) as HTMLAnchorElement | null
  if (!link) {
    return
  }
  if (link.protocol === 'tel:') {
    trackGoal('phone_click')
  } else if (link.hostname === 'vk.com' && /^\/im\/?$/.test(link.pathname)) {
    trackGoal('messenger_click', { channel: 'vk' })
  } else if (link.hostname === 'max.ru' && link.pathname.startsWith('/join/')) {
    trackGoal('messenger_click', { channel: 'max' })
  }
}

self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()))
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let isTest = false
  try {
    isTest = event.data?.json()?.type === 'test'
  } catch {
    // Keep the notification visible even when there is no parseable payload.
  }
  const title = isTest ? 'Тестовое уведомление' : 'Новая заявка'
  event.waitUntil(self.registration.showNotification(title, {
    body: 'Вайб Шоу',
    icon: '/leads/icon-192.png',
    ...(isTest ? { tag: 'vibeshow-push-test' } : {}),
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const cabinet = clients.find((client) => new URL(client.url).pathname === '/leads/')
    if (cabinet) {
      await cabinet.focus()
      cabinet.postMessage('refresh-leads')
    } else {
      await self.clients.openWindow('/leads/')
    }
  })())
})

async (page) => {
  const origin = 'http://127.0.0.1:8787'
  await page.context().grantPermissions(['notifications'], { origin })
  await page.goto(`${origin}/leads/`)
  const field = page.getByLabel('Пароль')
  await field.fill('wrong-password')
  await page.getByRole('button', { name: 'Войти' }).click()
  await page.getByText('Неверный пароль.').waitFor()
  await field.fill('demo-vibeshow-2027')
  await page.getByRole('button', { name: 'Войти' }).click()
  await page.getByRole('heading', { name: 'Заявки', exact: true }).waitFor()
  if (await page.getByRole('link', { name: '+7 000 000-00-00' }).first().getAttribute('href') !== 'tel:+70000000000') {
    throw new Error('Phone link is missing')
  }
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 })
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
    if (!fits) throw new Error(`Horizontal overflow at ${width}px`)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: 'output/leads-iphone-preview.png' })

  const sw = await page.context().newCDPSession(page)
  const registered = new Promise((done) => sw.on('ServiceWorker.workerRegistrationUpdated', ({ registrations }) => {
    const match = registrations.find((entry) => !entry.isDeleted && entry.scopeURL === `${origin}/leads/`)
    if (match) done(match.registrationId)
  }))
  await sw.send('ServiceWorker.enable')
  const registrationId = await Promise.race([registered, new Promise((_, reject) => setTimeout(() => reject(new Error('No service worker')), 5000))])
  await sw.send('ServiceWorker.deliverPushMessage', { origin, registrationId, data: '{"type":"test"}' })
  await page.waitForFunction(async () => (await (await navigator.serviceWorker.ready).getNotifications()).some(
    (item) => item.title === 'Тестовое уведомление' && item.body === 'Вайб Шоу',
  ))
  await sw.send('ServiceWorker.deliverPushMessage', { origin, registrationId, data: '{"type":"lead"}' })
  await page.waitForFunction(async () => (await (await navigator.serviceWorker.ready).getNotifications()).some(
    (item) => item.title === 'Новая заявка' && item.body === 'Вайб Шоу',
  ))
  await sw.detach()
  await page.getByRole('button', { name: 'Выйти' }).click()
  await field.waitFor()
  if (await page.getByText('Тестовая заявка').count()) throw new Error('Private details still visible')
  return 'Passed: mobile and desktop layout, invalid password, login/logout, contact link, two service worker notifications.'
}

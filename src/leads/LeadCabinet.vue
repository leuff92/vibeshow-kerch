<script setup lang="ts">
import { Bell, BellOff, ChevronDown, Inbox, LockKeyhole, LogOut, Phone, RefreshCw, Send } from '@lucide/vue'
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'

type Lead = {
  key: number
  programName?: string
  parentName?: string
  parentPhone?: string
  date?: string
  time?: string
  childrenCount?: number
  comment?: string
  savedAt?: string
  createdAt?: string
}

type Response = { ok: boolean; error?: string; leads?: Lead[]; next?: number | null; pushKey?: string | null; registered?: boolean }
const API = '/api/leads/admin.php'
const view = ref<'loading' | 'login' | 'leads' | 'unavailable'>('loading')
const leads = ref<Lead[]>([])
const next = ref<number | null>(null)
const pushKey = ref<string | null>(null)
const password = ref('')
const pageMessage = ref('')
const pushMessage = ref('')
const pushError = ref(false)
const busy = ref(false)
const pushBusy = ref(false)
const registration = shallowRef<ServiceWorkerRegistration | null>(null)
const subscription = shallowRef<PushSubscription | null>(null)
const subscribed = ref(false)
const ios = /iP(?:hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const installed = matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
const needsInstall = ios && !installed
const canPush = !needsInstall && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
const permission = ref(canPush ? Notification.permission : 'default')
const pushStatus = computed(() => {
  if (needsInstall) return 'Доступны в приложении на экране «Домой»'
  if (!canPush || !pushKey.value) return 'На этом устройстве недоступны'
  if (permission.value === 'denied') return 'Запрещены в настройках устройства'
  if (subscribed.value) return 'Включены на этом устройстве'
  return 'Выключены на этом устройстве'
})
const receivedFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Moscow' })

async function request(data?: Record<string, unknown>, before: number | null = null) {
  const response = await fetch(`${API}${before === null ? '' : `?before=${before}`}`, {
    cache: 'no-store', credentials: 'same-origin', redirect: 'error',
    ...(data ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}),
  })
  const body = await response.json() as Response
  return { status: response.status, ...body }
}

function showLogin() {
  view.value = 'login'
  leads.value = []
  next.value = null
  pushKey.value = null
  pushMessage.value = ''
}

async function readLeads(append = false) {
  const result = await request(undefined, append ? next.value : null)
  if (result.status === 401) {
    showLogin()
    return
  }
  if (result.error === 'not_configured') {
    showLogin()
    view.value = 'unavailable'
    return
  }
  if (!result.ok) throw new Error('lead list')
  leads.value = append ? [...leads.value, ...(result.leads ?? [])] : (result.leads ?? [])
  next.value = result.next ?? null
  pushKey.value = result.pushKey ?? null
  view.value = 'leads'
}

async function load(append = false) {
  if (busy.value || pushBusy.value) return
  busy.value = true
  pageMessage.value = ''
  try {
    await readLeads(append)
    if (view.value === 'leads' && !append) void checkDevice()
  } catch {
    if (view.value === 'loading') view.value = 'unavailable'
    pageMessage.value = 'Не удалось загрузить заявки. Попробуйте ещё раз.'
  } finally {
    busy.value = false
  }
}

async function logIn() {
  if (busy.value || !password.value.trim()) return
  busy.value = true
  pageMessage.value = ''
  try {
    const result = await request({ action: 'login', password: password.value.trim() })
    if (result.error === 'invalid_password') pageMessage.value = 'Неверный пароль.'
    else if (result.error === 'too_many_attempts') pageMessage.value = 'Слишком много попыток. Попробуйте через 15 минут.'
    else if (!result.ok) throw new Error('login')
    else {
      password.value = ''
      await readLeads()
      if (view.value === 'leads') void checkDevice()
    }
  } catch {
    pageMessage.value = 'Не удалось войти. Попробуйте ещё раз.'
  } finally {
    busy.value = false
  }
}

async function logOut() {
  if (busy.value || pushBusy.value) return
  busy.value = true
  try {
    const device = await registration.value?.pushManager.getSubscription().catch(() => null)
    const result = await request({ action: 'logout', endpoint: device?.endpoint })
    if (!result.ok && result.status !== 401) throw new Error('logout')
    if (result.ok) await device?.unsubscribe().catch(() => false)
    subscription.value = null
    subscribed.value = false
    pageMessage.value = ''
    showLogin()
  } catch {
    pageMessage.value = 'Не удалось выйти. Попробуйте ещё раз.'
  } finally {
    busy.value = false
  }
}

async function preparePush() {
  if (!canPush || registration.value) return
  await navigator.serviceWorker.register('/leads/sw.js', { scope: '/leads/', updateViaCache: 'none' })
  registration.value = await navigator.serviceWorker.ready
  void checkDevice()
}

async function checkDevice() {
  if (!registration.value || view.value !== 'leads' || !pushKey.value || pushBusy.value) return
  permission.value = Notification.permission
  try {
    const device = await registration.value.pushManager.getSubscription()
    subscription.value = device
    const result = device ? await request({ action: 'device_status', endpoint: device.endpoint }) : null
    if (!pushBusy.value) subscribed.value = Boolean(result?.registered)
  } catch {
    subscribed.value = false
  }
}

function keyBytes(value: string) {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

async function enablePush() {
  if (!pushKey.value || !registration.value || pushBusy.value) return
  pushBusy.value = true
  pushMessage.value = ''
  pushError.value = false
  let created: PushSubscription | null = null
  try {
    permission.value = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
    if (permission.value !== 'granted') return
    const applicationServerKey = keyBytes(pushKey.value)
    let device = await registration.value.pushManager.getSubscription()
    if (device?.options.applicationServerKey) {
      const previous = new Uint8Array(device.options.applicationServerKey)
      if (previous.length !== applicationServerKey.length || !previous.every((value, i) => value === applicationServerKey[i])) {
        await device.unsubscribe()
        device = null
      }
    }
    if (!device) {
      created = await registration.value.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })
      device = created
    }
    const result = await request({ action: 'subscribe', ...device.toJSON() })
    if (result.error === 'device_limit') {
      pushMessage.value = 'Подключено четыре устройства. Отключите одно из них.'
      throw new Error('device limit')
    }
    if (result.status === 401) showLogin()
    if (!result.ok) throw new Error('subscribe')
    subscription.value = device
    subscribed.value = true
  } catch {
    await created?.unsubscribe().catch(() => false)
    pushError.value = true
    pushMessage.value ||= 'Не удалось включить уведомления. Попробуйте ещё раз.'
  } finally {
    pushBusy.value = false
  }
}

async function managePush(action: 'unsubscribe' | 'test') {
  const device = subscription.value
  if (!device || pushBusy.value) return
  pushBusy.value = true
  pushError.value = false
  pushMessage.value = ''
  try {
    const result = await request({ action, endpoint: device.endpoint })
    if (result.status === 401) {
      showLogin()
      return
    }
    if (result.error === 'test_limit') {
      pushMessage.value = 'Следующий тест можно отправить через 20 секунд.'
      return
    }
    if (!result.ok) throw new Error('push')
    if (action === 'test') pushMessage.value = 'Тест передан. Проверьте уведомления на телефоне.'
    else {
      await device.unsubscribe().catch(() => false)
      subscription.value = null
      subscribed.value = false
    }
  } catch {
    pushError.value = true
    pushMessage.value = action === 'test' ? 'Тест не отправился. Попробуйте ещё раз.' : 'Не удалось отключить уведомления.'
  } finally {
    pushBusy.value = false
    void checkDevice()
  }
}

function refreshVisible() {
  if (document.visibilityState === 'visible' && view.value === 'leads') void load()
}
function workerMessage(event: MessageEvent) {
  if (event.data === 'refresh-leads') refreshVisible()
}
function received(lead: Lead) {
  const date = new Date(lead.savedAt || lead.createdAt || '')
  return Number.isNaN(date.valueOf()) ? '' : receivedFormat.format(date)
}
function eventDate(date?: string) {
  return date?.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3.$2.$1')
}
function tel(number: string) {
  return `tel:${number.replace(/[^+\d]/g, '')}`
}

onMounted(() => {
  void load()
  void preparePush().catch(() => {
    pushError.value = true
    pushMessage.value = 'Модуль уведомлений не загрузился.'
  })
  if (canPush) navigator.serviceWorker.addEventListener('message', workerMessage)
  document.addEventListener('visibilitychange', refreshVisible)
  window.addEventListener('pageshow', refreshVisible)
})
onUnmounted(() => {
  if (canPush) navigator.serviceWorker.removeEventListener('message', workerMessage)
  document.removeEventListener('visibilitychange', refreshVisible)
  window.removeEventListener('pageshow', refreshVisible)
})
</script>

<template>
  <header class="topbar">
    <div class="topbar-inner">
      <img src="/favicon-48x48.png" width="36" height="36" alt="" />
      <span>Вайб Шоу</span>
      <button v-if="view === 'leads'" class="icon-button exit" type="button" :disabled="busy || pushBusy" title="Выйти" aria-label="Выйти" @click="logOut"><LogOut :size="19" /></button>
    </div>
  </header>

  <main class="cabinet" :class="{ 'cabinet-login': view !== 'leads' }">
    <template v-if="view === 'leads'">
      <div class="heading">
        <h1>Заявки</h1>
        <button class="icon-button" type="button" :disabled="busy || pushBusy" title="Обновить" aria-label="Обновить заявки" @click="load()"><RefreshCw :size="19" :class="{ spinning: busy }" /></button>
      </div>

      <section class="push-settings" aria-label="Уведомления">
        <div class="push-heading">
          <Bell v-if="subscribed" :size="21" />
          <BellOff v-else :size="21" />
          <div>
            <h2>Уведомления</h2>
            <p>{{ pushStatus }}</p>
          </div>
        </div>
        <div v-if="canPush && pushKey && permission !== 'denied'" class="push-actions">
          <template v-if="subscribed">
            <button class="button secondary" type="button" :disabled="pushBusy" @click="managePush('test')"><Send :size="16" /> Отправить тест</button>
            <button class="icon-button outlined" type="button" :disabled="pushBusy" title="Отключить уведомления" aria-label="Отключить уведомления" @click="managePush('unsubscribe')"><BellOff :size="17" /></button>
          </template>
          <button v-else class="button primary" type="button" :disabled="!registration || pushBusy" @click="enablePush"><Bell :size="16" /> Включить</button>
        </div>
        <p v-if="pushMessage" class="push-feedback" :class="{ error: pushError }" role="status">{{ pushMessage }}</p>
      </section>

      <p v-if="pageMessage" class="error" role="alert">{{ pageMessage }}</p>
      <div v-if="!leads.length" class="empty"><Inbox :size="29" /><p>Заявок пока нет</p></div>
      <ul v-else class="lead-list" aria-label="Список заявок">
        <li v-for="lead in leads" :key="lead.key" class="lead">
          <div class="lead-top">
            <h2>{{ lead.programName || 'Без названия' }}</h2>
            <time v-if="received(lead)" :datetime="lead.savedAt || lead.createdAt">{{ received(lead) }}</time>
          </div>
          <div class="contact">
            <span v-if="lead.parentName">{{ lead.parentName }}</span>
            <a v-if="lead.parentPhone" :href="tel(lead.parentPhone)"><Phone :size="17" /> {{ lead.parentPhone }}</a>
          </div>
          <dl v-if="lead.date || lead.time || lead.childrenCount" class="facts">
            <div v-if="lead.date || lead.time"><dt>Когда</dt><dd>{{ [eventDate(lead.date), lead.time].filter(Boolean).join(' · ') }}</dd></div>
            <div v-if="lead.childrenCount"><dt>Детей</dt><dd>{{ lead.childrenCount }}</dd></div>
          </dl>
          <p v-if="lead.comment" class="comment">{{ lead.comment }}</p>
        </li>
      </ul>
      <button v-if="next !== null" class="button secondary load-more" type="button" :disabled="busy" @click="load(true)"><ChevronDown :size="17" /> Показать ещё</button>
    </template>

    <template v-else>
      <div class="login-symbol"><LockKeyhole :size="24" /></div>
      <h1>Заявки Вайб Шоу</h1>
      <p v-if="view === 'loading'" class="muted" role="status">Загрузка…</p>
      <form v-else-if="view === 'login'" class="login-form" @submit.prevent="logIn">
        <label for="password">Пароль</label>
        <input id="password" v-model="password" type="password" autocomplete="current-password" maxlength="120" required />
        <p v-if="pageMessage" class="error" role="alert">{{ pageMessage }}</p>
        <button class="button primary" type="submit" :disabled="busy || !password.trim()">{{ busy ? 'Входим…' : 'Войти' }}</button>
      </form>
      <template v-else>
        <p class="muted" role="status">{{ pageMessage || 'Кабинет пока не настроен.' }}</p>
        <button class="button secondary" type="button" :disabled="busy" @click="load()"><RefreshCw :size="17" /> Попробовать снова</button>
      </template>
    </template>
  </main>
</template>

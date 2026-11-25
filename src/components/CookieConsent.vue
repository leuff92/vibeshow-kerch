<script setup lang="ts">
import { Settings2 } from '@lucide/vue'
import { onMounted, onUnmounted, ref } from 'vue'
import { createCookieConsent, readCookieConsent, saveCookieConsent } from '../cookieConsent'

const showBanner = ref(false)
const showSettings = ref(false)
const analytics = ref(false)
const marketing = ref(false)
const hasSavedChoice = ref(false)

function syncDraftFromStored() {
  const stored = readCookieConsent()

  analytics.value = stored?.analytics ?? false
  marketing.value = stored?.marketing ?? false
  hasSavedChoice.value = Boolean(stored)
}

function persistChoice(nextAnalytics: boolean, nextMarketing: boolean) {
  const consent = createCookieConsent({
    analytics: nextAnalytics,
    marketing: nextMarketing,
  })

  analytics.value = consent.analytics
  marketing.value = consent.marketing
  hasSavedChoice.value = true
  saveCookieConsent(consent)
  showBanner.value = false
  showSettings.value = false
}

function acceptAll() {
  persistChoice(true, true)
}

function rejectOptional() {
  persistChoice(false, false)
}

function saveSelection() {
  persistChoice(analytics.value, marketing.value)
}

function openSettings() {
  syncDraftFromStored()
  showSettings.value = true
}

function closeSettings() {
  if (hasSavedChoice.value) {
    showSettings.value = false
  }
}

function handleOpenSettings() {
  openSettings()
}

onMounted(() => {
  const stored = readCookieConsent()
  syncDraftFromStored()

  if (!stored) {
    showBanner.value = true
  }

  window.addEventListener('vibeshow-open-cookie-settings', handleOpenSettings)
})

onUnmounted(() => {
  window.removeEventListener('vibeshow-open-cookie-settings', handleOpenSettings)
})
</script>

<template>
  <Teleport to="body">
    <section v-if="showBanner" class="cookie-banner" aria-labelledby="cookie-banner-title">
      <div class="cookie-banner__content">
        <div>
          <h2 id="cookie-banner-title">Мы используем cookie</h2>
          <p>Необходимые cookie помогают сайту работать. Аналитические и маркетинговые используются только с вашего согласия.</p>
          <div class="cookie-banner__links">
            <a href="/privacy-policy">Политика данных</a>
            <a href="/cookie-policy">Политика cookie</a>
          </div>
        </div>

        <div class="cookie-banner__actions">
          <button class="btn btn--secondary" type="button" aria-label="Только необходимые cookie" @click="rejectOptional">
            Только необходимые
          </button>
          <button class="btn btn--primary" type="button" @click="acceptAll">Принять все</button>
          <button class="btn btn--ghost cookie-banner__settings" type="button" aria-label="Настроить cookie" title="Настроить cookie" @click="openSettings">
            <Settings2 :size="19" aria-hidden="true" />
            <span>Настроить</span>
          </button>
        </div>
      </div>
    </section>

    <div v-if="showSettings" class="cookie-modal" role="dialog" aria-modal="true" aria-labelledby="cookie-settings-title">
      <button class="cookie-modal__backdrop" type="button" aria-label="Закрыть настройки cookie" @click="closeSettings"></button>

      <section class="cookie-modal__panel">
        <div class="cookie-modal__head">
          <div>
            <h2 id="cookie-settings-title">Настройки cookie</h2>
            <p>
              Вы можете выбрать, какие cookie разрешить. Необходимые cookie всегда активны, потому что без них сайт не
              сможет работать корректно.
            </p>
          </div>
          <button v-if="hasSavedChoice" class="cookie-modal__close" type="button" aria-label="Закрыть" @click="closeSettings">
            ×
          </button>
        </div>

        <div class="cookie-options">
          <article class="cookie-option">
            <div>
              <h3>Необходимые cookie</h3>
              <p>Нужны для работы сайта, сохранения настроек и корректной отправки форм.</p>
            </div>
            <label class="cookie-switch">
              <input type="checkbox" checked disabled />
              <span>Включено</span>
            </label>
          </article>

          <article class="cookie-option">
            <div>
              <h3>Аналитические cookie</h3>
              <p>Помогают понять, как посетители используют сайт, чтобы улучшать страницы и удобство.</p>
            </div>
            <label class="cookie-switch">
              <input v-model="analytics" type="checkbox" />
              <span>{{ analytics ? 'Включено' : 'Выключено' }}</span>
            </label>
          </article>

          <article class="cookie-option">
            <div>
              <h3>Маркетинговые cookie</h3>
              <p>Используются для рекламы, ретаргетинга и оценки эффективности рекламных кампаний.</p>
            </div>
            <label class="cookie-switch">
              <input v-model="marketing" type="checkbox" />
              <span>{{ marketing ? 'Включено' : 'Выключено' }}</span>
            </label>
          </article>
        </div>

        <div class="cookie-modal__actions">
          <button class="btn btn--primary" type="button" @click="saveSelection">Сохранить выбор</button>
          <button class="btn btn--ghost" type="button" @click="acceptAll">Принять все</button>
          <button class="btn btn--secondary" type="button" @click="rejectOptional">Отклонить необязательные</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

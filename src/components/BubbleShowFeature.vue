<script setup lang="ts">
import { Phone, Sparkles } from '@lucide/vue'
import { ref } from 'vue'
import { CONTACT_PHONE_HREF } from '../siteConfig'
import { trackGoal } from '../analytics'

defineEmits<{ book: [] }>()
const videoFailed = ref(false)
let started = false

function trackStart() {
  if (!started) {
    trackGoal('video_start', { program: 'bubble-show' })
    started = true
  }
}

function trackComplete() {
  trackGoal('video_complete', { program: 'bubble-show' })
  started = false
}
</script>

<template>
  <section id="bubble-show" class="bubble-show" aria-labelledby="bubble-show-title">
    <div class="bubble-show__copy">
      <p class="bubble-show__label"><Sparkles :size="19" aria-hidden="true" /> Новинка</p>
      <h2 id="bubble-show-title">Шоу мыльных пузырей</h2>
      <p class="bubble-show__lead">Сказочная фея, огромные пузыри и маленькое чудо для каждого ребёнка.</p>
      <ul class="bubble-show__details">
        <li>Необычные трюки с мыльными пузырями</li>
        <li>Дети становятся участниками шоу</li>
        <li>Яркие моменты и фотографии на память</li>
      </ul>
      <div class="bubble-show__actions">
        <button class="btn btn--primary" type="button" @click="$emit('book')">Забронировать шоу</button>
        <a class="bubble-show__phone" :href="CONTACT_PHONE_HREF"><Phone :size="17" aria-hidden="true" /> Уточнить детали</a>
      </div>
    </div>
    <div class="bubble-show__media">
      <video
        controls
        playsinline
        preload="none"
        poster="/videos/bubble-show-poster.jpg"
        width="720"
        height="1280"
        aria-label="Видео шоу мыльных пузырей Вайб Шоу"
        @error="videoFailed = true"
        @playing="trackStart"
        @ended="trackComplete"
      >
        <source src="/videos/bubble-show-2026.mp4" type="video/mp4" @error="videoFailed = true" />
        <a href="/videos/bubble-show-2026.mp4">Открыть видео шоу мыльных пузырей</a>
      </video>
      <p v-if="videoFailed" class="bubble-show__error" role="status">
        Не удалось загрузить видео. <a href="/videos/bubble-show-2026.mp4">Открыть отдельно</a>
      </p>
    </div>
  </section>
</template>

<style scoped>
.bubble-show {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(240px, 330px);
  align-items: center;
  gap: 40px;
  margin-top: 48px;
  padding: 32px 0;
  border-top: 1px solid #fff3;
  border-bottom: 1px solid #fff3;
  color: #fffaff;
}

.bubble-show__copy {
  max-width: 620px;
  min-width: 0;
}

.bubble-show__label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  color: #ffb7e5;
  font-size: 14px;
  font-weight: 800;
}

.bubble-show h2 {
  margin: 0;
  font-size: 36px;
  line-height: 1.15;
}

.bubble-show__lead {
  max-width: 44ch;
  margin: 16px 0 0;
  color: #eadcff;
  font-size: 18px;
  line-height: 1.6;
}

.bubble-show__details {
  display: grid;
  gap: 12px;
  margin: 24px 0;
  padding-left: 20px;
  color: #f4eafa;
  line-height: 1.5;
}

.bubble-show__details li::marker {
  color: #ff8bd8;
}

.bubble-show__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
}

.bubble-show__phone {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  font-size: 14px;
  font-weight: 700;
}

.bubble-show__phone:hover {
  text-decoration: underline;
}

.bubble-show__media {
  display: grid;
  justify-items: center;
  gap: 10px;
  min-width: 0;
}

.bubble-show video {
  display: block;
  width: min(100%, 304px);
  height: auto;
  aspect-ratio: 9 / 16;
  border: 1px solid #ffffff40;
  border-radius: 8px;
  background: #190b26;
}

.bubble-show__error {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.bubble-show__error a {
  text-decoration: underline;
}

@media (max-width: 640px) {
  .bubble-show {
    grid-template-columns: minmax(0, 1fr);
    gap: 22px;
    margin-top: 28px;
    padding: 24px 0;
  }

  .bubble-show h2 {
    max-width: 18ch;
    font-size: 28px;
  }

  .bubble-show__lead {
    margin-top: 12px;
    font-size: 16px;
  }

  .bubble-show__details {
    gap: 8px;
    margin: 18px 0;
    font-size: 14px;
  }

  .bubble-show__actions {
    gap: 6px;
  }

  .bubble-show__phone {
    margin: 0 auto;
  }

  .bubble-show video {
    width: min(100%, 260px);
  }
}
</style>

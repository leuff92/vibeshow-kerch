<script setup lang="ts">
import { nextTick, onUnmounted, ref } from 'vue'
import { ArrowLeft, ArrowRight, ArrowUpRight, Maximize2, Phone, Snowflake, X } from '@lucide/vue'
import { formatHolidayPrice, holidayBookingHref, holidayIndex, holidayProgramPage, holidayPrograms, seasonPosters } from '../holidayPrograms'
import type { HolidayProgram } from '../holidayPrograms'

defineProps<{ standalone?: boolean; program?: HolidayProgram }>()

type HolidayOffer = HolidayProgram | (typeof seasonPosters)[number]

const groups = [
  { id: 'programs', title: 'Новогодние программы', offers: holidayPrograms },
  { id: 'posters', title: 'Афиши сезона', offers: seasonPosters },
]
const offers = [...holidayPrograms, ...seasonPosters]

function isProgram(offer: HolidayOffer): offer is HolidayProgram {
  return 'price' in offer
}

const activeOffer = ref<HolidayOffer | null>(null)
const posterDialog = ref<HTMLDialogElement | null>(null)
let savedBodyOverflow = ''
let scrollLocked = false

function posterPath(offer: HolidayOffer) {
  return `/images/new-year/${offer.image}.jpg`
}

function posterSrcset(offer: HolidayOffer) {
  return [400, 640, 853].map((width) => `/images/new-year/${offer.image}-${width}.webp ${width}w`).join(', ')
}

async function openPoster(offer: HolidayOffer) {
  activeOffer.value = offer
  await nextTick()
  posterDialog.value?.showModal()
  savedBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  scrollLocked = true
}

function releaseScroll() {
  if (scrollLocked) {
    document.body.style.overflow = savedBodyOverflow
    scrollLocked = false
  }
}

function onPosterClose() {
  activeOffer.value = null
  releaseScroll()
}

function changePoster(direction: number) {
  const index = offers.findIndex((offer) => offer.id === activeOffer.value?.id)
  activeOffer.value = offers[(index + direction + offers.length) % offers.length] ?? null
  posterDialog.value?.scrollTo({ top: 0 })
}

onUnmounted(releaseScroll)
</script>

<template>
  <section id="new-year" :class="['holiday-section', { 'holiday-section--standalone': standalone }]" aria-labelledby="new-year-title">
    <div v-if="program" class="holiday-detail">
      <div class="holiday-detail__copy">
        <a class="holiday-detail__back" :href="holidayIndex.path"><ArrowLeft :size="16" aria-hidden="true" /> Новогодние программы</a>
        <h1 id="new-year-title">{{ program.title }}</h1>
        <p class="holiday-detail__audience">{{ program.audience }}</p>
        <p class="holiday-section__intro">{{ program.detail }}</p>
        <dl class="holiday-detail__facts">
          <div v-if="program.schedule"><dt>Сеансы</dt><dd>{{ program.schedule }}</dd></div>
          <div v-if="program.duration"><dt>Длительность</dt><dd>{{ program.duration }}</dd></div>
          <div v-if="program.location"><dt>Место</dt><dd>{{ program.location }}</dd></div>
          <div v-if="program.price !== null"><dt>Цена</dt><dd>{{ formatHolidayPrice(program) }}</dd></div>
        </dl>
        <p v-if="program.tickets" class="holiday-detail__audience">{{ program.tickets }}</p>
        <div class="holiday-detail__actions">
          <a class="holiday-card__book" :href="holidayBookingHref(program.id)">Забронировать</a>
          <a class="holiday-section__contact" :href="program.phoneHref"><Phone :size="16" aria-hidden="true" /> {{ program.phone }}</a>
        </div>
      </div>
      <button class="holiday-detail__poster" type="button" :aria-label="`Открыть афишу «${program.title}»`" @click="openPoster(program)">
        <img :src="`/images/new-year/${program.image}-640.webp`" :srcset="posterSrcset(program)" sizes="(max-width: 640px) calc(100vw - 32px), 400px" :alt="`Афиша: ${program.title}`" width="853" height="1280" />
        <span class="holiday-card__expand" aria-hidden="true"><Maximize2 :size="18" /></span>
      </button>
    </div>
    <template v-else>
    <header class="holiday-section__head">
      <div>
        <p class="holiday-section__season"><Snowflake :size="19" aria-hidden="true" /> Сезон 2026 / 2027</p>
        <component :is="standalone ? 'h1' : 'h2'" id="new-year-title">{{ standalone ? holidayIndex.heading : 'Новый год с Вайб Шоу' }}</component>
        <p class="holiday-section__intro">Ёлки, утренники и вечеринки для детей в Керчи.</p>
      </div>
      <a class="holiday-section__contact" href="https://vk.com/im?sel=-191575734" target="_blank" rel="noopener noreferrer">
        Написать в VK <ArrowUpRight :size="20" aria-hidden="true" />
      </a>
    </header>

    <div v-for="group in groups" :key="group.id" class="holiday-group">
      <h3 class="holiday-group__title">{{ group.title }}</h3>
      <div :class="['holiday-grid', `holiday-grid--${group.id}`]">
        <article v-for="offer in group.offers" :key="offer.id" class="holiday-card" :data-offer="offer.id">
          <button
            class="holiday-card__poster"
            type="button"
            :aria-label="`Открыть афишу «${offer.title}»`"
            :title="`Открыть афишу «${offer.title}»`"
            @click="openPoster(offer)"
          >
            <img
              :src="`/images/new-year/${offer.image}-640.webp`"
              :srcset="posterSrcset(offer)"
              :sizes="group.id === 'posters' ? '220px' : '(max-width: 640px) calc(100vw - 32px), (max-width: 1060px) 48vw, (max-width: 1400px) 24vw, 326px'"
              :alt="`Новогодняя афиша Вайб Шоу: ${offer.title}`"
              width="853"
              height="1280"
              loading="lazy"
              decoding="async"
            />
            <span class="holiday-card__expand" aria-hidden="true"><Maximize2 :size="18" /></span>
          </button>
          <div class="holiday-card__body">
            <p class="holiday-card__audience">{{ offer.audience }}</p>
            <h4>{{ offer.title }}</h4>
            <p class="holiday-card__detail">{{ offer.detail }}</p>
            <template v-if="isProgram(offer)">
              <p v-if="offer.schedule" class="holiday-card__note">{{ offer.schedule }}</p>
              <p v-if="offer.duration || offer.price !== null" class="holiday-card__note">
                {{ [offer.duration, offer.price !== null ? formatHolidayPrice(offer) : ''].filter(Boolean).join(' · ') }}
              </p>
              <p v-if="offer.location" class="holiday-card__location">{{ offer.location }}</p>
            </template>
          </div>
          <footer class="holiday-card__footer">
            <template v-if="isProgram(offer)">
              <a class="holiday-card__book" :href="holidayBookingHref(offer.id)" :aria-label="`Забронировать: ${offer.title}`">Забронировать</a>
              <a class="holiday-card__phone" :href="holidayProgramPage(offer).path" :aria-label="`Подробнее: ${offer.title}`">Подробнее <ArrowUpRight :size="14" aria-hidden="true" /></a>
            </template>
            <template v-else>
              <a class="holiday-card__book" :href="offer.phoneHref" :aria-label="`Позвонить: ${offer.title}, ${offer.phone}`">
                <Phone :size="15" aria-hidden="true" /> Позвонить
              </a>
              <a class="holiday-card__phone" :href="offer.phoneHref">{{ offer.phone }}</a>
            </template>
          </footer>
        </article>
      </div>
    </div>
    </template>
  </section>

  <Teleport to="body">
    <dialog
      ref="posterDialog"
      class="holiday-dialog"
      aria-labelledby="holiday-poster-title"
      @close="onPosterClose"
      @click.self="posterDialog?.close()"
      @keydown.left.prevent="changePoster(-1)"
      @keydown.right.prevent="changePoster(1)"
    >
      <div v-if="activeOffer" class="holiday-dialog__content">
        <header class="holiday-dialog__toolbar">
          <h2 id="holiday-poster-title">{{ activeOffer.title }}</h2>
          <div class="holiday-dialog__controls">
            <button type="button" aria-label="Предыдущая афиша" title="Предыдущая афиша" @click="changePoster(-1)"><ArrowLeft :size="22" aria-hidden="true" /></button>
            <button type="button" aria-label="Следующая афиша" title="Следующая афиша" @click="changePoster(1)"><ArrowRight :size="22" aria-hidden="true" /></button>
            <a :href="posterPath(activeOffer)" target="_blank" rel="noopener noreferrer" aria-label="Открыть оригинал афиши" title="Открыть оригинал афиши"><ArrowUpRight :size="22" aria-hidden="true" /></a>
            <button type="button" aria-label="Закрыть афишу" title="Закрыть афишу" autofocus @click="posterDialog?.close()"><X :size="22" aria-hidden="true" /></button>
          </div>
        </header>
        <img :key="activeOffer.id" :src="posterPath(activeOffer)" :alt="`Афиша: ${activeOffer.title}`" width="853" height="1280" />
        <a class="holiday-dialog__booking" :href="activeOffer.phoneHref">Запись: {{ activeOffer.phone }}</a>
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.holiday-section {
  margin: 48px 0 40px;
  padding: 32px 0 0;
  border-top: 1px solid #fff3;
  color: var(--surface-strong);
  --holiday-button: #832dc2;
  --holiday-button-hover: #6e22a6;
}

.holiday-section--standalone {
  margin-top: 0;
  padding-top: 16px;
  border-top: 0;
}

.holiday-section__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 30px;
  padding-bottom: 26px;
  border-bottom: 1px solid #ffffff30;
}

.holiday-section__season {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  color: #f7d797;
  font-size: 14px;
  font-weight: 750;
}

.holiday-section h2,
.holiday-section h1 {
  margin: 0;
  font-size: 40px;
  line-height: 1.15;
}

.holiday-section__intro {
  max-width: 55ch;
  margin: 10px 0 0;
  color: #eadcff;
  line-height: 1.6;
}

.holiday-section__contact {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  min-height: 44px;
  padding: 8px 13px;
  border: 1px solid #ffffff65;
  border-radius: 6px;
  color: var(--surface-strong);
  font-size: 14px;
  font-weight: 750;
}

.holiday-section__contact:hover {
  background: #ffffff15;
}

.holiday-group + .holiday-group {
  margin-top: 32px;
}

.holiday-group__title {
  margin: 0 0 14px;
  font-size: 19px;
  line-height: 1.3;
}

.holiday-grid {
  display: grid;
  gap: 18px;
}

.holiday-grid--programs {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.holiday-grid--posters {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.holiday-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  border: 1px solid #ffffff70;
  border-radius: 8px;
  background: var(--surface-strong);
  color: var(--ink);
}

.holiday-card__poster {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  min-height: 0;
  padding: 0;
  border: 0;
  background: var(--bg);
  cursor: zoom-in;
}

.holiday-card__poster img {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center var(--poster-position, 28%);
}

.holiday-card[data-offer='residence'] .holiday-card__poster {
  --poster-position: 26%;
}

.holiday-card[data-offer='grinch'] .holiday-card__poster {
  --poster-position: 31%;
}

.holiday-grid--posters .holiday-card {
  display: grid;
  grid-template-columns: minmax(100px, 32%) minmax(0, 1fr);
  grid-template-rows: 1fr auto;
}

.holiday-grid--posters .holiday-card__poster {
  grid-row: span 2;
  min-height: 100%;
  aspect-ratio: auto;
}

.holiday-card__expand {
  position: absolute;
  top: 12px;
  right: 12px;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 6px;
  background: #241133e8;
  color: #fff;
}

.holiday-card__poster:hover .holiday-card__expand {
  background: #fff;
  color: var(--ink);
}

.holiday-card__body {
  flex: 1;
  min-width: 0;
  padding: 18px 18px 0;
}

.holiday-card__audience {
  margin: 0 0 5px;
  color: #7420ae;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.5;
}

.holiday-card h4 {
  margin: 0;
  font-size: 22px;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.holiday-card__detail {
  margin: 8px 0 0;
  color: #624d71;
  font-size: 15px;
  line-height: 1.5;
}

.holiday-card__note {
  margin: 11px 0 0;
  font-size: 14px;
  font-weight: 750;
  line-height: 1.5;
}

.holiday-card__location {
  margin: 6px 0 0;
  color: #624d71;
  font-size: 13px;
  line-height: 1.5;
}

.holiday-card__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  padding: 16px 18px 18px;
}

.holiday-card__book {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 44px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--holiday-button);
  color: #fff;
  font-size: 14px;
  font-weight: 750;
}

.holiday-card__book:hover {
  background: var(--holiday-button-hover);
}

.holiday-card__phone {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 44px;
  font-size: 13px;
  font-weight: 750;
  white-space: nowrap;
}

.holiday-card__phone:hover {
  text-decoration: underline;
}

.holiday-detail {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 400px);
  align-items: start;
  gap: 32px 48px;
  max-width: 1120px;
  margin-inline: auto;
}

.holiday-detail__copy {
  min-width: 0;
}

.holiday-detail__back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  margin-bottom: 12px;
  color: #eadcff;
  font-weight: 750;
}

.holiday-detail__back:hover {
  text-decoration: underline;
}

.holiday-detail__audience {
  margin: 12px 0 0;
  color: #f7d797;
  font-weight: 750;
}

.holiday-detail__facts {
  display: grid;
  gap: 12px;
  margin: 24px 0 0;
}

.holiday-detail__facts > div {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr);
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid #ffffff30;
}

.holiday-detail__facts dt {
  color: #eadcff;
  font-size: 14px;
}

.holiday-detail__facts dd {
  margin: 0;
  line-height: 1.5;
  font-weight: 700;
}

.holiday-detail__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
}

.holiday-detail__poster {
  position: relative;
  display: block;
  width: 100%;
  padding: 0;
  overflow: hidden;
  border: 1px solid #fff5;
  border-radius: 8px;
  background: var(--bg);
  cursor: zoom-in;
}

.holiday-detail__poster img {
  display: block;
  width: 100%;
  height: auto;
}

.holiday-card__poster:focus-visible,
.holiday-detail__poster:focus-visible,
.holiday-detail a:focus-visible,
.holiday-card a:focus-visible,
.holiday-section__contact:focus-visible,
.holiday-dialog button:focus-visible,
.holiday-dialog a:focus-visible {
  outline: 3px solid #b96cff;
  outline-offset: -4px;
}

.holiday-dialog {
  width: min(900px, calc(100% - 32px));
  max-width: none;
  max-height: calc(100dvh - 32px);
  margin: auto;
  padding: 0;
  border: 1px solid #fff5;
  border-radius: 8px;
  background: #fffaff;
  color: #241133;
  overscroll-behavior: contain;
}

.holiday-dialog::backdrop {
  background: rgba(10, 5, 18, 0.88);
}

.holiday-dialog__toolbar {
  position: sticky;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #e5dce9;
  background: #fffaff;
}

.holiday-dialog__toolbar h2 {
  margin: 0;
  font-size: 18px;
  line-height: 1.35;
}

.holiday-dialog__controls {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.holiday-dialog__controls button,
.holiday-dialog__controls a {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid #d5c8df;
  border-radius: 6px;
  background: #fff;
  color: #241133;
  font: inherit;
  font-size: 24px;
  cursor: pointer;
}

.holiday-dialog__controls button:hover,
.holiday-dialog__controls a:hover {
  background: #f1e2ff;
}

.holiday-dialog__content > img {
  display: block;
  width: 100%;
  height: auto;
}

.holiday-dialog__booking {
  display: block;
  padding: 20px 16px;
  color: #7420ae;
  font-weight: 800;
  text-align: center;
}

@media (max-width: 1060px) {
  .holiday-grid--programs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 800px) {
  .holiday-detail {
    grid-template-columns: minmax(0, 1fr);
  }

  .holiday-detail__poster {
    max-width: 400px;
  }
}

@media (max-width: 640px) {
  .holiday-section {
    margin-top: 36px;
    padding-top: 24px;
  }

  .holiday-section__head {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
    margin-bottom: 20px;
    padding-bottom: 20px;
  }

  .holiday-section--standalone {
    margin-top: 0;
    padding-top: 0;
  }

  .holiday-section h2,
  .holiday-section h1 {
    font-size: 28px;
  }

  .holiday-grid--posters,
  .holiday-grid--programs {
    grid-template-columns: minmax(0, 1fr);
  }

  .holiday-grid {
    gap: 14px;
  }

  .holiday-card h4 {
    font-size: 20px;
  }

  .holiday-card__body {
    padding: 14px 14px 0;
  }

  .holiday-card__footer {
    padding: 12px 14px 14px;
  }

  .holiday-dialog {
    width: calc(100% - 16px);
    max-height: calc(100dvh - 16px);
  }

  .holiday-dialog__toolbar {
    align-items: stretch;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
  }

  .holiday-dialog__toolbar h2 {
    font-size: 16px;
  }

  .holiday-dialog__controls {
    justify-content: flex-end;
  }
}
</style>

<script setup lang="ts">
defineProps<{
  author: string
  date: string
  rating: number
  summary: string
}>()
</script>

<template>
  <article class="review-card review-card--yandex">
    <div class="review-card__head">
      <span class="review-card__avatar" aria-hidden="true">{{ author.slice(0, 1) }}</span>
      <div>
        <strong>{{ author }}</strong>
        <p class="review-card__meta">
          <span role="img" :aria-label="`Оценка ${rating} из 5`">{{ '★'.repeat(rating) + '☆'.repeat(5 - rating) }}</span>
          {{ date }}
        </p>
      </div>
    </div>
    <p>{{ summary }}</p>
  </article>
</template>

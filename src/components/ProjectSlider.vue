<script setup lang="ts">
import { ref } from 'vue';
import type { LinkedRecord } from '../content';
defineProps<{ items: LinkedRecord[] }>();
const slider = ref<HTMLElement | null>(null);
function move(direction: number) {
  const element = slider.value;
  if (!element) return;
  const cards = Array.from(element.querySelectorAll<HTMLElement>('.entry'));
  const current = cards.reduce((best, card, i) => Math.abs(card.offsetLeft - element.scrollLeft - element.offsetLeft) < Math.abs(cards[best].offsetLeft - element.scrollLeft - element.offsetLeft) ? i : best, 0);
  const target = cards[Math.max(0, Math.min(cards.length - 1, current + direction))];
  if (target) element.scrollTo({ left: target.offsetLeft - element.offsetLeft, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}
function onKey(event: KeyboardEvent) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1);
}
</script>
<template>
  <div class="slider-controls"><button type="button" aria-label="Previous project" @click="move(-1)">←</button><button type="button" aria-label="Next project" @click="move(1)">→</button></div>
  <div ref="slider" class="project-slider" tabindex="0" aria-label="Projects" @keydown="onKey">
    <div v-for="(item, index) in items" :key="item.href" class="entry project-card">
      <div v-if="item.cover" class="project-image"><img :src="item.cover.url" :alt="item.cover.alt" :width="item.cover.width" :height="item.cover.height" style="width:100%;height:100%;object-fit:cover" /></div>
      <div v-else class="project-image" role="img" :aria-label="`Dummy image for ${item.title}`">DUMMY IMAGE / {{ String(index + 1).padStart(2, '0') }}</div>
      <h3><a :href="item.href">{{ item.title }} ↗</a></h3><p>{{ item.detail }}</p>
    </div>
  </div>
</template>

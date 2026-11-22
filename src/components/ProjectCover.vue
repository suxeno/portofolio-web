<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
const props = defineProps<{ url: string; alt: string; width: number; height: number }>();
const frame = ref<HTMLElement | null>(null);
const overlay = ref<HTMLCanvasElement | null>(null);
let observer: IntersectionObserver | undefined;
let cancelled = false;

// Decode a separate CORS-enabled image: failure must never break the visible original.
function drawDither() {
  const source = new Image();
  source.crossOrigin = 'anonymous';
  source.onload = () => {
    if (cancelled || !overlay.value) return;
    const canvas = overlay.value;
    const scale = Math.min(1, 320 / Math.max(source.naturalWidth, source.naturalHeight));
    canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    try {
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const bayer = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        const luminance = .2126 * pixels.data[i] + .7152 * pixels.data[i+1] + .0722 * pixels.data[i+2];
        const value = luminance > (bayer[(y % 4) * 4 + x % 4] + .5) * 16 ? 255 : 0;
        pixels.data[i] = pixels.data[i+1] = pixels.data[i+2] = value;
      }
      ctx.putImageData(pixels, 0, 0);
      canvas.dataset.ready = 'true';
    } catch { /* Original image remains visible when pixels are unavailable. */ }
  };
  source.src = props.url;
}
onMounted(() => {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches || !frame.value) return;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer?.disconnect(); drawDither(); }
    }, { rootMargin: '300px' });
    observer.observe(frame.value);
  } else drawDither();
});
onUnmounted(() => { cancelled = true; observer?.disconnect(); });
</script>
<template>
  <div ref="frame" class="project-image"><img :src="url" :alt="alt" :width="width" :height="height" /><canvas ref="overlay" aria-hidden="true"></canvas></div>
</template>

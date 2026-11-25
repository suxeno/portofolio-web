<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
const props = defineProps<{ url: string; alt: string; width: number; height: number }>();
const frame = ref<HTMLElement | null>(null);
const image = ref<HTMLImageElement | null>(null);
const overlay = ref<HTMLCanvasElement | null>(null);
let disposed = false;
let fallback = false;
let resizeTimer: ReturnType<typeof setTimeout> | undefined;
const onResize = () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(drawDither, 150);
};

// Use the same CORS-enabled image for both the canvas and the intentional reveal.
function drawDither() {
  const source = image.value;
  const canvas = overlay.value;
  if (disposed || fallback || !source || !canvas || !source.naturalWidth) return;
  // On narrow frames, quantize at display resolution instead of shrinking a
  // fixed Bayer grid into moiré. Cap DPR to keep canvas work bounded.
  const compact = window.matchMedia('(max-width: 600px)').matches;
  const rect = frame.value?.getBoundingClientRect();
  const displayScale = rect ? Math.max(rect.width / source.naturalWidth, rect.height / source.naturalHeight) * Math.min(window.devicePixelRatio || 1, 2) : 1;
  const scale = compact ? Math.min(1, displayScale, 960 / Math.max(source.naturalWidth, source.naturalHeight)) : Math.min(1, 640 / Math.max(source.naturalWidth, source.naturalHeight));
  canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return showFallback();
  try {
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const bayer = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
    // Error diffusion avoids the conspicuous repeated Bayer grid on a phone.
    // No lifted black floor: large near-black areas stay quiet.
    let errors = new Float32Array(canvas.width + 2);
    let nextErrors = new Float32Array(canvas.width + 2);
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        const luminance = .2126 * pixels.data[i] + .7152 * pixels.data[i+1] + .0722 * pixels.data[i+2];
        let value: number;
        if (compact) {
          const tone = Math.min(255, luminance * 1.08) + errors[x + 1];
          value = tone >= 128 ? 255 : 0;
          const error = tone - value;
          errors[x + 2] += error * 7 / 16;
          nextErrors[x] += error * 3 / 16;
          nextErrors[x + 1] += error * 5 / 16;
          nextErrors[x + 2] += error / 16;
        } else {
          value = Math.min(255, luminance * 1.08 + 5) > (bayer[(y % 4) * 4 + x % 4] + .5) * 16 ? 255 : 0;
        }
        pixels.data[i] = pixels.data[i+1] = pixels.data[i+2] = value;
        pixels.data[i+3] = 255;
      }
      [errors, nextErrors] = [nextErrors, errors];
      nextErrors.fill(0);
    }
    ctx.putImageData(pixels, 0, 0);
    canvas.dataset.ready = 'true';
    frame.value?.setAttribute('data-cover-state', 'ready');
  } catch { showFallback(); }
}
function showFallback() {
  if (disposed || !image.value || !frame.value) return;
  if (fallback) {
    frame.value.dataset.coverState = 'error';
    return;
  }
  fallback = true;
  // A denied CORS response cannot be read into canvas; retry as a normal image.
  if (!image.value.naturalWidth) {
    frame.value.dataset.coverState = 'retry';
    image.value.removeAttribute('crossorigin');
    image.value.src = props.url;
  } else {
    frame.value.dataset.coverState = 'fallback';
  }
}
onMounted(() => {
  const source = image.value;
  if (!source || !frame.value) return;
  const load = () => { if (fallback && frame.value) frame.value.dataset.coverState = 'fallback'; else drawDither(); };
  const error = () => showFallback();
  source.addEventListener('load', load);
  source.addEventListener('error', error);
  window.addEventListener('resize', onResize);
  if (source.complete) source.naturalWidth ? drawDither() : showFallback();
});
onUnmounted(() => {
  disposed = true;
  clearTimeout(resizeTimer);
  window.removeEventListener('resize', onResize);
});
</script>
<template>
  <div ref="frame" class="project-image" role="img" :aria-label="alt"><img ref="image" :src="url" alt="" aria-hidden="true" :width="width" :height="height" crossorigin="anonymous" /><canvas ref="overlay" aria-hidden="true"></canvas><span class="cover-error" aria-hidden="true">Image unavailable</span><noscript><img loading="lazy" :src="url" alt="" :width="width" :height="height" /></noscript></div>
</template>

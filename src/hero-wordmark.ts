const STRIP_COUNT = 10;
const STEP_MS = 48;
const TOTAL_STEPS = 16; // 16 * 48ms = 768ms

const OFFSETS = [
  [-1, 1, -2, 2, -1, 1, -2, 1, -1, 1],
  [-2, 2, -3, 3, -2, 2, -3, 2, -1, 2],
  [2, -3, 3, -2, 3, -3, 2, -2, 3, -1],
  [-3, 2, -2, 3, -3, 2, -2, 3, -2, 2],
  [1, -2, 3, -3, 2, -2, 3, -1, 2, -2],
  [-2, 1, -2, 2, -3, 3, -2, 2, -1, 1],
  [1, -1, 2, -2, 2, -2, 1, -2, 1, -1],
  [-1, 2, -1, 2, -2, 1, -1, 2, -1, 1],
  [1, -1, 1, -1, 2, -1, 1, -1, 1, 0],
  [0, 1, -1, 1, -1, 1, -1, 1, 0, 0],
  [0, 0, 1, -1, 1, -1, 1, 0, 0, 0],
  [0, 0, 0, 1, -1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, -1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

const DROPOUTS: readonly Set<number>[] = [
  new Set([2, 7]),
  new Set([1, 4, 8]),
  new Set([0, 5, 9]),
  new Set([3, 6]),
  new Set([2, 5, 7]),
  new Set([1, 8]),
  new Set([4, 6]),
  new Set([3]),
  new Set([5]),
  new Set([4]),
  new Set(),
  new Set(),
  new Set(),
  new Set(),
  new Set(),
  new Set(),
];

function initHeroWordmark(): void {
  const button = document.querySelector<HTMLButtonElement>('.hero-wordmark');
  const textEl = button?.querySelector<HTMLElement>('.hero-wordmark-text');
  if (!button || !textEl) return;

  const label = (textEl.textContent ?? '').trim();
  if (!label) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  const stripsWrap = document.createElement('span');
  stripsWrap.className = 'hero-wordmark-strips';
  stripsWrap.setAttribute('aria-hidden', 'true');
  stripsWrap.hidden = true;
  button.append(stripsWrap);

  let strips: HTMLSpanElement[] = [];
  let scanline: HTMLSpanElement | null = null;
  let rafId = 0;
  let started = 0;
  let lastStep = -1;
  let activeVariant = 0;
  let previousVariant = -1;

  const canAnimate = (): boolean =>
    !reduced.matches &&
    !document.hidden &&
    !document.body.classList.contains('title-paused');

  function resetToResting(): void {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    started = 0;
    lastStep = -1;
    button!.removeAttribute('data-replaying');
    stripsWrap.hidden = true;
    stripsWrap.replaceChildren();
    strips = [];
    scanline = null;
  }

  function buildStrips(): void {
    strips = [];
    for (let i = 0; i < STRIP_COUNT; i++) {
      const strip = document.createElement('span');
      strip.className = 'hero-wordmark-strip';
      strip.textContent = label;
      const top = i * (100 / STRIP_COUNT);
      const bottom = (STRIP_COUNT - 1 - i) * (100 / STRIP_COUNT);
      strip.style.clipPath = `inset(${top}% 0 ${bottom}% 0)`;
      stripsWrap.append(strip);
      strips.push(strip);
    }
    scanline = document.createElement('span');
    scanline.className = 'hero-wordmark-scanline';
    stripsWrap.append(scanline);
  }

  function applyStep(step: number): void {
    const unit = Math.max(3, Math.min(8, Math.round(button!.clientWidth * 0.02)));
    const rowOffsets = OFFSETS[step] ?? OFFSETS[OFFSETS.length - 1];
    const dropped = DROPOUTS[step] ?? DROPOUTS[DROPOUTS.length - 1];

    for (let i = 0; i < strips.length; i++) {
      const dx = rowOffsets[i] * unit;
      const direction = i % 2 === 0 ? -1 : 1;
      const progress = Math.min(1, step / (TOTAL_STEPS - 1));
      if (activeVariant === 0) {
        strips[i].style.transform = `translateX(${dx}px)`;
        strips[i].style.opacity = dropped.has(i) ? '0' : '1';
      } else if (activeVariant === 1) {
        const dy = direction * (TOTAL_STEPS - step) * 1.15;
        strips[i].style.transform = `translate(${dx}px, ${dy}px) skewX(${direction * (1 - progress) * 6}deg)`;
        strips[i].style.opacity = dropped.has(i) ? '0' : '1';
      } else {
        const dy = direction * (TOTAL_STEPS - step) * 1.8;
        strips[i].style.transform = `translateY(${dy}px) scaleX(${0.86 + progress * 0.14})`;
        strips[i].style.opacity = dropped.has(i) ? '0' : String(Math.min(1, progress * 1.6));
      }
    }

    if (scanline) {
      if (step >= 3 && step <= 11) {
        const pct = Math.round(((step - 3) / 8) * 92);
        scanline.style.top = `${pct}%`;
        scanline.style.opacity = step % 2 === 0 ? '0.85' : '0.45';
      } else {
        scanline.style.opacity = '0';
      }
    }
  }

  function tick(now: number): void {
    rafId = 0;
    if (!canAnimate()) {
      resetToResting();
      return;
    }
    if (!started) started = now;
    const step = Math.floor((now - started) / STEP_MS);
    if (step >= TOTAL_STEPS) {
      resetToResting();
      return;
    }
    if (step !== lastStep) {
      lastStep = step;
      applyStep(step);
    }
    rafId = requestAnimationFrame(tick);
  }

  function startReplay(): void {
    if (!canAnimate()) {
      resetToResting();
      return;
    }
    resetToResting();
    activeVariant = Math.floor(Math.random() * 3);
    if (activeVariant === previousVariant) activeVariant = (activeVariant + 1 + Math.floor(Math.random() * 2)) % 3;
    previousVariant = activeVariant;
    button!.dataset.variant = String(activeVariant);
    buildStrips();
    button!.setAttribute('data-replaying', 'true');
    stripsWrap.hidden = false;
    started = performance.now();
    lastStep = 0;
    applyStep(0);
    rafId = requestAnimationFrame(tick);
  }

  button.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'touch') startReplay();
  });
  button.addEventListener('click', event => {
    if (event.detail === 0) startReplay();
  });

  const bodyObserver = new MutationObserver(() => {
    if (document.body.classList.contains('title-paused')) {
      resetToResting();
    }
  });
  bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  const onReducedChange = () => {
    if (reduced.matches) resetToResting();
  };
  const onVisibilityChange = () => {
    if (document.hidden) resetToResting();
  };
  const onPageHide = () => {
    resetToResting();
  };

  reduced.addEventListener('change', onReducedChange);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', onPageHide);
}

initHeroWordmark();

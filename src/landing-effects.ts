export {};

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const fine = matchMedia('(any-pointer: fine) and (any-hover: hover)');
const hero = document.querySelector<HTMLImageElement>('.hero-dots');
const still = hero?.getAttribute('src');
const canvas = document.querySelector<HTMLCanvasElement>('.pointer-trail');
const ctx = canvas?.getContext('2d');
const cell = 32;
const fade = 480;
const limit = 140;
const pulseMaxRadius = 3;
const pulseRingStep = 52;
const pulseRingFade = 360;
const pulseBeats = [{ delay: 0, alpha: 0.44 }, { delay: 170, alpha: 0.22 }] as const;
const pulseDuration = pulseBeats[pulseBeats.length - 1].delay + pulseMaxRadius * pulseRingStep + pulseRingFade;
const pulseLimit = 8;
const blockedSelector = [
  '.boot', '#mobile-menu', '.site-header', 'nav', 'footer', '.hero',
  '.project-card', '.document', '.tool', '.tools-row', '.slider-controls',
  '.terminal-shell', '#command-form', 'form', 'a', 'button', 'input',
  'textarea', 'select', 'option', 'label', '[role="button"]', '[role="link"]',
  '[contenteditable="true"]', '.entry-date',
  'h1, h2, h3, h4, h5, h6, p, strong, em, time, img, canvas, svg, li, span, pre, code, blockquote',
].join(',');
const tiles = new Map<string, {x: number; y: number; time: number}>();
const pulses: Array<{x: number; y: number; time: number}> = [];
let frame = 0;
let previous: {x: number; y: number} | undefined;
let pendingPointer: {id: number; x: number; y: number; sx: number; sy: number} | undefined;
let visible = false;
let active = true;
const allowed = () => active && !document.hidden && !reduced.matches && !document.body.classList.contains('title-paused');
const hasOverlay = () => Boolean(document.querySelector('.boot, #mobile-menu[open]'));

function clearTrail() {
  previous = undefined;
  tiles.clear();
  if (!pulses.length) {
    cancelAnimationFrame(frame);
    frame = 0;
    if (canvas) ctx?.clearRect(0, 0, canvas.width, canvas.height);
  }
}
function clear() {
  cancelAnimationFrame(frame);
  frame = 0;
  previous = undefined;
  pendingPointer = undefined;
  tiles.clear();
  pulses.length = 0;
  if (canvas) ctx?.clearRect(0, 0, canvas.width, canvas.height);
}
function ensureCanvasSize(): boolean {
  if (!canvas) return false;
  const {clientWidth: width, clientHeight: height} = document.documentElement;
  if (canvas.width !== width || canvas.height !== height) {
    clear();
    canvas.width = width;
    canvas.height = height;
  }
  return true;
}
function sync() {
  const src = allowed() && visible ? hero?.dataset.loop : still;
  if (src && hero?.getAttribute('src') !== src) hero?.setAttribute('src', src);
  if (!allowed()) clear();
  else if (!fine.matches) clearTrail();
}
function strokeCell(gx: number, gy: number) {
  if (!ctx || !canvas) return;
  const px = gx * cell, py = gy * cell;
  if (px < 0 || py < 0 || px >= canvas.width || py >= canvas.height) return;
  ctx.strokeRect(px + 2, py + 2, cell - 4, cell - 4);
}
function drawPulse(pulse: {x: number; y: number; time: number}, now: number): boolean {
  const elapsed = now - pulse.time;
  if (elapsed < 0 || elapsed >= pulseDuration) return false;
  for (const beat of pulseBeats) {
    for (let r = 0; r <= pulseMaxRadius; r++) {
      const age = elapsed - beat.delay - r * pulseRingStep;
      if (age < 0 || age >= pulseRingFade) continue;
      const life = 1 - age / pulseRingFade;
      ctx!.globalAlpha = beat.alpha * life ** 1.5;
      if (r === 0) {
        strokeCell(pulse.x, pulse.y);
        continue;
      }
      for (let dx = -r; dx <= r; dx++) {
        strokeCell(pulse.x + dx, pulse.y - r);
        strokeCell(pulse.x + dx, pulse.y + r);
      }
      for (let dy = -r + 1; dy <= r - 1; dy++) {
        strokeCell(pulse.x - r, pulse.y + dy);
        strokeCell(pulse.x + r, pulse.y + dy);
      }
    }
  }
  return true;
}
function draw(now: number) {
  frame = 0;
  if (!ctx || !canvas || !allowed() || hasOverlay()) { clear(); return; }
  if (!fine.matches) { tiles.clear(); previous = undefined; }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#f5f5f0';
  ctx.lineWidth = 2;
  for (const [key, tile] of tiles) {
    const life = 1 - Math.max(0, now - tile.time) / fade;
    if (life <= 0) { tiles.delete(key); continue; }
    ctx.globalAlpha = .38 * life ** 1.5;
    ctx.strokeRect(tile.x * cell + 2, tile.y * cell + 2, cell - 4, cell - 4);
  }
  for (let i = pulses.length - 1; i >= 0; i--) {
    if (!drawPulse(pulses[i], now)) pulses.splice(i, 1);
  }
  ctx.globalAlpha = 1;
  if (!tiles.size) previous = undefined;
  if (tiles.size || pulses.length) frame = requestAnimationFrame(draw);
}
function isBackgroundTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element) || hasOverlay()) return false;
  return !target.closest(blockedSelector);
}
function invalidateMovedPointer(event: PointerEvent) {
  if (!pendingPointer || pendingPointer.id !== event.pointerId) return;
  if (Math.hypot(event.clientX - pendingPointer.x, event.clientY - pendingPointer.y) > 8) {
    pendingPointer = undefined;
  }
}
function pointerDown(event: PointerEvent) {
  if (!ctx || !canvas || !allowed() || !event.isPrimary || event.button !== 0) return;
  if (!isBackgroundTarget(event.target)) { pendingPointer = undefined; return; }
  pendingPointer = { id: event.pointerId, x: event.clientX, y: event.clientY, sx: window.scrollX, sy: window.scrollY };
}
function pointerCancel(event: PointerEvent) {
  if (pendingPointer?.id === event.pointerId) pendingPointer = undefined;
}
function pointerUp(event: PointerEvent) {
  const start = pendingPointer;
  if (!start || start.id !== event.pointerId) return;
  pendingPointer = undefined;
  if (!ctx || !canvas || !allowed() || !event.isPrimary || event.button !== 0) return;
  if (!isBackgroundTarget(event.target)) return;
  if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) return;
  if (Math.abs(window.scrollX - start.sx) > 2 || Math.abs(window.scrollY - start.sy) > 2) return;
  if (!ensureCanvasSize()) return;
  while (pulses.length >= pulseLimit) pulses.shift();
  pulses.push({ x: Math.floor(event.clientX / cell), y: Math.floor(event.clientY / cell), time: performance.now() });
  if (!frame) frame = requestAnimationFrame(draw);
}
function move(event: PointerEvent) {
  invalidateMovedPointer(event);
  if (!ctx || !canvas || event.pointerType !== 'mouse' || !allowed() || !fine.matches || hasOverlay()) return;
  if (!ensureCanvasSize()) return;
  const x = Math.floor(event.clientX / cell), y = Math.floor(event.clientY / cell);
  const start = previous ?? {x, y};
  const distance = Math.max(Math.abs(x - start.x), Math.abs(y - start.y));
  const time = performance.now();
  for (let i = Math.max(0, distance - 24); i <= distance; i++) {
    const t = distance ? i / distance : 1;
    const tx = Math.round(start.x + (x - start.x) * t), ty = Math.round(start.y + (y - start.y) * t);
    const neighbors = [[0,0], [0, (tx + ty) % 2 ? -1 : 1], [(tx * 3 + ty) % 2 ? -1 : 1, 0]];
    for (const [dx, dy] of neighbors) {
      const nx = tx + dx, ny = ty + dy, key = `${nx}:${ny}`;
      tiles.delete(key);
      tiles.set(key, {x:nx, y:ny, time:time - (dx || dy ? 90 : 0)});
    }
  }
  while (tiles.size > limit) {
    const oldest = tiles.keys().next().value;
    if (oldest === undefined) break;
    tiles.delete(oldest);
  }
  previous = {x, y};
  if (!frame) frame = requestAnimationFrame(draw);
}

if (hero) {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(hero);
  } else visible = true;
  if (still) hero.addEventListener('error', () => {
    if (hero.getAttribute('src') === hero.dataset.loop) hero.setAttribute('src', still);
  });
}
new MutationObserver(sync).observe(document.body, {attributes:true, attributeFilter:['class']});
reduced.addEventListener('change', sync);
fine.addEventListener('change', sync);
document.addEventListener('visibilitychange', sync);
window.addEventListener('pointerdown', pointerDown, {passive:true});
window.addEventListener('pointerup', pointerUp, {passive:true});
window.addEventListener('pointercancel', pointerCancel, {passive:true});
window.addEventListener('pointermove', move, {passive:true});
window.addEventListener('pointerout', event => { if (!event.relatedTarget) previous = undefined; });
window.addEventListener('resize', clear, {passive:true});
window.addEventListener('pagehide', () => { active = false; sync(); });
window.addEventListener('pageshow', () => { active = true; sync(); });
sync();
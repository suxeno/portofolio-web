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
const tiles = new Map<string, {x: number; y: number; time: number}>();
let frame = 0;
let previous: {x: number; y: number} | undefined;
let visible = false;
let active = true;
const allowed = () => active && !document.hidden && !reduced.matches && !document.body.classList.contains('title-paused');

function clear() {
  cancelAnimationFrame(frame);
  frame = 0;
  previous = undefined;
  tiles.clear();
  if (canvas) ctx?.clearRect(0, 0, canvas.width, canvas.height);
}
function sync() {
  const src = allowed() && visible ? hero?.dataset.loop : still;
  if (src && hero?.getAttribute('src') !== src) hero?.setAttribute('src', src);
  if (!allowed() || !fine.matches) clear();
}
function draw(now: number) {
  frame = 0;
  if (!ctx || !canvas || !allowed() || !fine.matches) { clear(); return; }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#f5f5f0';
  ctx.lineWidth = 2;
  for (const [key, tile] of tiles) {
    const life = 1 - Math.max(0, now - tile.time) / fade;
    if (life <= 0) { tiles.delete(key); continue; }
    ctx.globalAlpha = .38 * life ** 1.5;
    ctx.strokeRect(tile.x * cell + 2, tile.y * cell + 2, cell - 4, cell - 4);
  }
  ctx.globalAlpha = 1;
  if (tiles.size) frame = requestAnimationFrame(draw);
  else previous = undefined;
}
function move(event: PointerEvent) {
  if (!ctx || !canvas || event.pointerType !== 'mouse' || !allowed() || !fine.matches || document.querySelector('.boot, #mobile-menu[open]')) return;
  const {clientWidth:width, clientHeight:height} = document.documentElement;
  if (canvas.width !== width || canvas.height !== height) {
    clear(); canvas.width = width; canvas.height = height;
  }
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
window.addEventListener('pointermove', move, {passive:true});
window.addEventListener('pointerout', event => { if (!event.relatedTarget) previous = undefined; });
window.addEventListener('resize', clear, {passive:true});
window.addEventListener('pagehide', () => { active = false; sync(); });
window.addEventListener('pageshow', () => { active = true; sync(); });
sync();

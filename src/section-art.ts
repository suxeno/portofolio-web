// Bounded ink studies: writing, building blocks, a career path, a cup and a signal.
const artworks = [...document.querySelectorAll<HTMLCanvasElement>('canvas.section-art[data-dither]')];
const writingFrame = document.querySelector<HTMLElement>('[data-writing-art]');
const writingVideo = writingFrame?.querySelector<HTMLVideoElement>('.writing-video') ?? null;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const visible = new Set<HTMLCanvasElement>();
const drawn = new WeakSet<HTMLCanvasElement>();
const toggle = document.querySelector<HTMLButtonElement>('.art-toggle');
let writingNear = false;
let writingVisible = false;
let writingError = false;
let writingBound = false;
let writingLoadObserver: IntersectionObserver | null = null;
let writingPlayObserver: IntersectionObserver | null = null;
let paused = false;
try { paused = sessionStorage.getItem('art-paused') === 'true'; } catch { /* storage may be unavailable */ }
function updateToggle(): void {
  if (!toggle) return;
  toggle.setAttribute('aria-label', paused ? 'Resume animations' : 'Pause animations');
  document.body.classList.toggle('title-paused', paused);
  toggle.setAttribute('aria-pressed', String(paused));
  toggle.hidden = false;
}
function onToggle(): void {
  paused = !paused;
  try { sessionStorage.setItem('art-paused', String(paused)); } catch { /* storage may be unavailable */ }
  updateToggle();
  if (paused) { cancelAnimationFrame(frame); frame = 0; started = 0; }
  else schedule();
  syncWriting();
}
let frame = 0;
let started = 0;
let last = 0;

function draw(canvas: HTMLCanvasElement, phase: number): void {
  drawn.add(canvas);
  const c = canvas.getContext('2d', { willReadFrequently: true });
  if (!c) return;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, canvas.width, canvas.height);
  if (canvas.width === 192) c.scale(2, 2);
  c.lineWidth = 1;
  c.strokeStyle = '#fff';
  c.fillStyle = '#aaa';
  const wave = Math.sin(phase * Math.PI * 2);
  switch (canvas.dataset.dither) {
    case 'writing':
      // A page in perspective, with ruled notes and a hand holding the pen.
      c.fillStyle = '#555'; c.beginPath(); c.moveTo(9,24); c.lineTo(63,9); c.lineTo(85,70); c.lineTo(27,87); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = '#ccc'; c.beginPath(); c.moveTo(13,28); c.lineTo(60,15); c.lineTo(79,67); c.lineTo(30,81); c.closePath(); c.stroke();
      c.strokeStyle = '#ddd'; for (let i=0;i<8;i++) { const y=32+i*5; c.beginPath(); c.moveTo(23+i*1.5,y); c.lineTo(56+i*1.5,y-9); c.stroke(); }
      c.fillStyle = '#aaa'; c.strokeStyle = '#fff'; c.beginPath(); c.moveTo(92,35); c.bezierCurveTo(82,31,78,33,73,38); c.lineTo(61,47); c.bezierCurveTo(56,50,56,56,61,58); c.lineTo(70,55); c.bezierCurveTo(75,62,83,65,95,64); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = '#222'; c.beginPath(); c.moveTo(67,46); c.lineTo(78,41); c.moveTo(70,50); c.lineTo(81,45); c.moveTo(73,54); c.lineTo(83,50); c.stroke();
      c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(79,20 + Math.round(wave)); c.lineTo(49,62 + Math.round(wave)); c.stroke(); c.lineWidth = 1; c.beginPath(); c.moveTo(49,62); c.lineTo(47,67); c.lineTo(52,63); c.stroke();
      break;
    case 'projects':
      // Interlocking modules with an orbiting data point.
      c.fillRect(20, 14, 26, 24); c.strokeRect(20, 14, 26, 24);
      c.fillStyle = '#777'; c.fillRect(47, 30, 27, 25); c.strokeRect(47, 30, 27, 25);
      c.strokeRect(30, 42, 13, 13); c.fillStyle = '#fff'; c.fillRect(64 + wave * 3, 15, 3, 3);
      c.beginPath(); c.moveTo(46, 25); c.lineTo(64, 25); c.lineTo(64, 19); c.stroke();
      break;
    case 'experience':
      // A path joining milestones, with the last node gently pulsing.
      c.strokeRect(19, 12, 58, 48);
      c.fillStyle = '#555'; for (let x = 25; x < 73; x += 8) c.fillRect(x, 16, 2, 2);
      for (let y = 23; y < 55; y += 8) c.fillRect(22, y, 2, 2);
      c.beginPath(); c.moveTo(27, 52); c.lineTo(39, 43); c.lineTo(49, 45); c.lineTo(59, 28); c.lineTo(70, 21); c.stroke();
      [[27,52],[39,43],[49,45],[59,28],[70,21]].forEach(([x,y], i) => { c.fillStyle = i === 4 ? '#fff' : '#999'; c.fillRect(x-2,y-2,5,5); });
      c.fillStyle = '#fff'; c.fillRect(69 + Math.round(wave), 20, 3, 3);
      c.fillStyle = '#777'; c.fillRect(25, 57, 46, 2);
      break;
    case 'achievements':
      // Paper pieces pop outward then drift down; the quiet endpoint resets cleanly.
      const t = ((phase % 1) + 1) % 1;
      const pieces = [[20,12,-8,-5],[30,8,-5,-6],[40,6,-2,-5],[55,7,3,-6],[67,9,5,-5],[77,13,8,-4],[12,24,-5,-3],[84,24,5,-3]];
      pieces.forEach(([x,y,dx,dy], i) => {
        const q = reduced.matches ? .35 : Math.max(0, Math.min(1, (t - i * .015) / .85));
        if (!reduced.matches && (t < i * .015 || q >= 1)) return;
        const pop = 1 - Math.exp(-q * 9);
        c.save(); c.translate(x + dx * pop + Math.sin(q * 7 + i) * q * 2, y + dy * pop + q * q * 24);
        c.rotate((i % 2 ? 1 : -1) * (q * 4 + i)); c.fillStyle = i % 3 ? '#aaa' : '#ddd'; c.fillRect(-2.5,-1.25,5,2.5); c.restore();
      });
      // One shared transform keeps both handle grips attached throughout the lift.
      c.save(); c.translate(0, 2 - 3 * (1 - Math.cos(phase * Math.PI * 2)) / 2);
      c.lineWidth=3; c.strokeStyle='#fff'; c.beginPath(); c.moveTo(31,29); c.bezierCurveTo(12,22,14,51,31,51); c.moveTo(65,29); c.bezierCurveTo(84,22,82,51,65,51); c.stroke(); c.lineWidth=1;
      c.fillStyle='#aaa'; c.beginPath(); c.moveTo(29,22); c.lineTo(67,22); c.lineTo(64,43); c.bezierCurveTo(62,55,56,61,48,62); c.bezierCurveTo(40,61,34,55,32,43); c.closePath(); c.fill(); c.stroke();
      c.fillStyle='#ddd'; c.fillRect(27,19,42,4); c.fillRect(44,62,8,11); c.fillRect(38,73,20,4); c.fillRect(33,78,30,6); c.strokeRect(33,78,30,6);
      c.strokeStyle='#fff'; c.beginPath(); c.moveTo(36,27); c.bezierCurveTo(36,42,39,48,43,52); c.stroke();
      // Mirrored hands enter from below/outside, fingers curl across each ear.
      for (const mirror of [false, true]) {
        c.save(); if (mirror) { c.translate(96,0); c.scale(-1,1); }
        c.fillStyle='#aaa'; c.strokeStyle='#fff'; c.lineWidth=1;
        c.beginPath(); c.moveTo(2,86); c.lineTo(8,73); c.lineTo(12,58); c.bezierCurveTo(13,52,14,47,15,42); c.lineTo(16,35); c.bezierCurveTo(17,32,20,33,20,36); c.lineTo(20,42); c.lineTo(22,34); c.bezierCurveTo(23,31,26,32,26,35); c.lineTo(25,43); c.lineTo(27,38); c.bezierCurveTo(29,35,32,37,31,40); c.lineTo(28,49); c.lineTo(24,55); c.bezierCurveTo(24,64,22,72,17,79); c.lineTo(14,88); c.closePath(); c.fill(); c.stroke();
        c.strokeStyle='#333'; c.beginPath(); c.moveTo(20,42); c.lineTo(19,48); c.moveTo(25,43); c.lineTo(23,49); c.moveTo(28,44); c.lineTo(26,50); c.moveTo(13,58); c.lineTo(20,61); c.stroke(); c.restore();
      }
      c.restore();
      break;
    case 'contact':
      // A message leaving a terminal as concentric signal arcs.
      c.strokeRect(16, 23, 37, 27); c.beginPath(); c.moveTo(17, 24); c.lineTo(34, 38); c.lineTo(52, 24); c.stroke();
      c.strokeStyle = '#bbb';
      for (let r = 9; r <= 23; r += 7) { c.beginPath(); c.arc(54, 36, r + wave, -0.8, 0.8); c.stroke(); }
      c.fillStyle = '#fff'; c.fillRect(58, 34, 3, 3);
      break;
  }
  // Ordered 1-bit threshold: white ink or transparent, never a gray pixel.
  const image = c.getImageData(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
    const i = (y * canvas.width + x) * 4;
    const ink = image.data[i + 3] * image.data[i] / 255;
    const on = ink > (bayer[(y % 4) * 4 + x % 4] + 0.5) * 16;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = 255;
    image.data[i + 3] = on ? 255 : 0;
  }
  c.putImageData(image, 0, 0);
}

function tick(now: number): void {
  frame = 0;
  if (document.hidden || reduced.matches || paused || !visible.size) return;
  if (!started) started = now;
  if (now - last >= 125) {
    for (const canvas of visible) draw(canvas, (now - started) / 4000);
    last = now;
  }
  frame = requestAnimationFrame(tick);
}
function schedule(): void {
  if (!frame && !document.hidden && !reduced.matches && !paused && visible.size) frame = requestAnimationFrame(tick);
}
const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  entries.forEach(entry => {
    const canvas = entry.target as HTMLCanvasElement;
    if (entry.isIntersecting) { visible.add(canvas); if (!drawn.has(canvas) || (reduced.matches && !paused)) draw(canvas, 0); }
    else visible.delete(canvas);
  });
  if (!visible.size) { cancelAnimationFrame(frame); frame = 0; started = 0; }
  schedule();
}) : null;
function bindWriting(): void {
  if (writingBound || !writingFrame || !writingVideo) return;
  writingBound = true;
  const markReady = () => {
    if (!writingError && writingVideo.readyState >= 2) writingFrame.dataset.ready = 'true';
  };
  writingVideo.addEventListener('playing', markReady);
  writingVideo.addEventListener('loadeddata', () => {
    if (writingVideo.currentTime > 0.04) markReady();
  });
  writingVideo.addEventListener('error', () => {
    writingError = true;
    writingFrame.dataset.error = 'true';
    writingFrame.dataset.ready = 'false';
  });
}
function syncWriting(): void {
  if (!writingFrame || !writingVideo) return;
  writingFrame.dataset.reduced = String(reduced.matches);
  const shouldLoad = (writingNear || writingVisible) && !paused && !document.hidden && !reduced.matches && !writingError;
  if (shouldLoad && !writingVideo.getAttribute('src') && writingVideo.dataset.src) {
    writingVideo.src = writingVideo.dataset.src;
    writingVideo.load();
  }
  const shouldPlay = writingVisible && !paused && !document.hidden && !reduced.matches && !writingError;
  if (shouldPlay) {
    if (writingVideo.readyState >= 2 && writingVideo.currentTime > 0.04) {
      writingFrame.dataset.ready = 'true';
    }
    if (writingVideo.paused) {
      void writingVideo.play().catch(() => { /* autoplay or abort errors keep static poster */ });
    }
  } else if (!writingVideo.paused) {
    writingVideo.pause();
  }
}
function onVisibility(): void {
  if (document.hidden) { cancelAnimationFrame(frame); frame = 0; started = 0; }
  else schedule();
  syncWriting();
}
function onMotion(): void {
  if (reduced.matches) { cancelAnimationFrame(frame); frame = 0; started = 0; if (!paused) visible.forEach(canvas => draw(canvas, 0)); }
  else schedule();
  syncWriting();
}
function connect(): void {
  updateToggle();
  bindWriting();
  toggle?.addEventListener('click', onToggle);
  if (observer) artworks.forEach(canvas => observer.observe(canvas));
  else artworks.forEach(canvas => draw(canvas, 0));
  if (writingFrame && writingVideo) {
    if ('IntersectionObserver' in window) {
      writingLoadObserver = new IntersectionObserver(entries => {
        writingNear = entries.some(entry => entry.isIntersecting);
        syncWriting();
      }, { rootMargin: '120px' });
      writingPlayObserver = new IntersectionObserver(entries => {
        writingVisible = entries.some(entry => entry.isIntersecting);
        syncWriting();
      });
      writingLoadObserver.observe(writingFrame);
      writingPlayObserver.observe(writingFrame);
    } else {
      writingNear = true;
      writingVisible = true;
    }
    syncWriting();
  }
  document.addEventListener('visibilitychange', onVisibility);
  reduced.addEventListener('change', onMotion);
}
connect();
window.addEventListener('pagehide', () => {
  cancelAnimationFrame(frame); frame = 0; started = 0; observer?.disconnect(); visible.clear();
  writingLoadObserver?.disconnect(); writingLoadObserver = null; writingNear = false;
  writingPlayObserver?.disconnect(); writingPlayObserver = null; writingVisible = false; writingVideo?.pause();
  toggle?.removeEventListener('click', onToggle);
  document.removeEventListener('visibilitychange', onVisibility); reduced.removeEventListener('change', onMotion);
});
window.addEventListener('pageshow', event => { if (event.persisted) connect(); });

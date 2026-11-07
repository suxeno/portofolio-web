import './terminal';

const sections = ['experience', 'projects', 'about', 'contact'] as const;

function startIntro(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const overlay = document.createElement('div');
  overlay.className = 'boot';
  overlay.setAttribute('aria-label', 'Simulated profile introduction');
  overlay.innerHTML = `<div class="boot-inner"><div class="boot-header"><span>ARVIN / PROFILE</span><button type="button">Skip intro <span aria-hidden="true">↗</span></button></div><div class="boot-body"><p class="boot-caption">SIMULATED PACKAGE UPDATE / DEMO TRANSFER VALUES</p><img class="arvin-glyph boot-glyph" src="/arvin.svg" alt="Arvin" /><p class="boot-name">arvin profile</p><div class="boot-packages" aria-hidden="true"><p class="boot-summary"></p><div class="boot-table"></div><div class="boot-total"></div><div class="boot-transaction"></div></div></div><div class="boot-footer">PERSONAL PROFILE <span>2026</span></div></div>`;
  document.body.append(overlay);
  let timer: number;
  let interval: number | undefined;
  const dismiss = () => { clearTimeout(timer); clearInterval(interval); overlay.remove(); window.removeEventListener('keydown', onKey); document.removeEventListener('click', onAnchor); };
  // Fictional package sizes are visual storytelling, never network telemetry.
  const packageDuration = 800;
  const downloadDuration = sections.length * packageDuration;
  const sizes = [48, 96, 24, 8];
  const totalSize = sizes.reduce((sum, size) => sum + size, 0);
  const summary = overlay.querySelector<HTMLElement>('.boot-summary')!;
  summary.textContent = `Updating arvin-profile: 4 section packages (${totalSize} KiB).`;
  const table = overlay.querySelector<HTMLElement>('.boot-table')!;
  const rows = sections.map((section, index) => {
    const row = document.createElement('div');
    row.className = 'boot-package';
    row.dataset.bootPackage = section;
    row.innerHTML = '<span class="boot-package-name"></span><span class="boot-percent"></span><span class="boot-speed"></span><span class="boot-size"></span><span class="boot-time"></span>';
    row.querySelector('.boot-package-name')!.textContent = `[${index + 1}/4] ${section}-profile`;
    table.append(row);
    return row;
  });
  const total = overlay.querySelector<HTMLElement>('.boot-total')!;
  total.classList.add('boot-package');
  total.innerHTML = '<span class="boot-package-name">[4/4] Total</span><span class="boot-percent">100%</span><span class="boot-speed"></span><span class="boot-size"></span><span class="boot-time">00m03s</span>';
  total.querySelector('.boot-speed')!.textContent = `${(totalSize / (downloadDuration / 1000)).toFixed(1)} KiB/s`;
  total.querySelector('.boot-size')!.textContent = `${totalSize.toFixed(1)} KiB`;
  const transaction = overlay.querySelector<HTMLElement>('.boot-transaction')!;
  const started = performance.now();
  function renderPackages(): void {
    const elapsed = performance.now() - started;
    rows.forEach((row, index) => {
      const progress = Math.max(0, Math.min(1, (elapsed - index * packageDuration) / packageDuration));
      row.hidden = elapsed < index * packageDuration;
      row.dataset.state = progress === 1 ? 'complete' : 'downloading';
      row.querySelector('.boot-percent')!.textContent = `${Math.floor(progress * 100)}%`;
      row.querySelector('.boot-speed')!.textContent = `${(sizes[index] / (packageDuration / 1000)).toFixed(1)} KiB/s`;
      row.querySelector('.boot-size')!.textContent = `${(sizes[index] * progress).toFixed(1)} KiB`;
      row.querySelector('.boot-time')!.textContent = '00m00s';
    });
    total.hidden = elapsed < downloadDuration;
    const steps = [
      'Running transaction',
      '[1/3] Verify profile files   100%',
      '[2/3] Prepare profile       100%',
      '[3/3] Installing arvin-profile   100%',
      'Complete!',
    ];
    const transactionStart = downloadDuration + 300;
    const count = elapsed < transactionStart ? 0 : Math.min(steps.length, Math.floor((elapsed - transactionStart) / 250) + 1);
    transaction.textContent = steps.slice(0, count).join('\n');
    if (count === steps.length) clearInterval(interval);
  }
  renderPackages();
  interval = window.setInterval(renderPackages, 40);
  const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss(); };
  const onAnchor = (event: MouseEvent) => { if (event.target instanceof Element && event.target.closest('a')) dismiss(); };
  overlay.querySelector('button')?.addEventListener('click', dismiss);
  window.addEventListener('keydown', onKey);

  document.addEventListener('click', onAnchor);
  timer = window.setTimeout(dismiss, 5000);
}
startIntro();

// Progressive enhancement: the document stays visible if motion is unavailable.
function enhanceSectionMotion(): void {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (preference.matches || !('IntersectionObserver' in window) || !Element.prototype.animate) return;
  const animations = new Set<Animation>();
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      if (preference.matches) continue;
      const section = entry.target.closest('section')?.id;
      const from = section === 'projects' ? (window.matchMedia('(max-width: 600px)').matches ? 'translateX(-12px)' : 'translateX(-48px)') : section === 'experience' ? (window.matchMedia('(max-width: 600px)').matches ? 'translateY(18px)' : 'translateX(18px)') : section === 'writing' ? 'translateY(22px)' : 'translateY(12px)';
      const rows = section === 'projects' ? [...(entry.target.closest('#projects')?.querySelectorAll('.entry') ?? [])] : [];
      const index = rows.indexOf(entry.target);
      const animation = entry.target.animate(
        [{ transform: from }, { transform: 'translate(0, 0)' }],
        { duration: section === 'projects' ? 700 : 520, delay: index < 0 ? 0 : index * 90, fill: 'backwards', easing: 'cubic-bezier(.22,1,.36,1)' },
      );
      animations.add(animation);
      animation.onfinish = () => animations.delete(animation);
    }
  }, { threshold: 0.15 });
  document.querySelectorAll('.editorial h2, .editorial .entry, .project-line, .about-copy, .contact-inner h2').forEach(element => observer.observe(element));
  preference.addEventListener('change', () => {
    if (!preference.matches) return;
    observer.disconnect();
    animations.forEach(animation => animation.cancel());
    animations.clear();
  });
}
enhanceSectionMotion();

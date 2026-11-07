const form = document.querySelector<HTMLFormElement>('#command-form');
const input = document.querySelector<HTMLInputElement>('#command');
const output = document.querySelector<HTMLElement>('#terminal-output');
const sections = ['experience', 'projects', 'about', 'contact'] as const;

function runCommand(raw: string): void {
  if (!output) return;
  const command = raw.trim().toLowerCase();
  if (!command) { output.textContent = 'Enter a command or choose a link.'; return; }
  if (command === 'clear') { output.textContent = ''; return; }
  if (command === 'help') { output.textContent = 'Commands: experience, projects, about, contact, help, clear. Section commands navigate the page.'; return; }
  if (sections.some(section => section === command)) {
    output.textContent = `Opening ${command}.`;
    window.location.hash = command;
    document.querySelector<HTMLElement>(`#${command}-title`)?.focus({ preventScroll: true });
    return;
  }
  output.textContent = 'Command not recognized. Type help, or use the page links.';
}
form?.addEventListener('submit', event => { event.preventDefault(); runCommand(input?.value ?? ''); if (input) input.value = ''; });
document.querySelectorAll<HTMLButtonElement>('[data-command]').forEach(button => button.addEventListener('click', () => runCommand(button.dataset.command ?? '')));

function startIntro(): void {
  if (window.location.hash || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  try { if (sessionStorage.getItem('arvin-intro-seen')) return; sessionStorage.setItem('arvin-intro-seen', '1'); } catch { return; }
  const overlay = document.createElement('div');
  overlay.className = 'boot';
  overlay.setAttribute('aria-label', 'Simulated profile introduction');
  overlay.innerHTML = `<div class="boot-inner"><div class="boot-header"><span>ARVIN / PROFILE</span><button type="button">Skip intro <span aria-hidden="true">↗</span></button></div><div class="boot-body"><p class="boot-caption">SIMULATED PACKAGE UPDATE / DEMO TRANSFER VALUES</p><pre aria-hidden="true">  _   ______     _____ _   _
 / \\ |  _ \\ \\   / /_ _| \\ | |
/ _ \\| |_) \\ \\ / / | ||  \\| |
/ ___ \\  _ &lt; \\ V /  | || |\\  |
/_/   \\_\\_| \\_\\ \\_/  |___|_| \\_|

 P R O F I L E</pre><p class="boot-compact" aria-hidden="true">arvin<br />profile_</p><p class="boot-name">arvin profile</p><div class="boot-packages" aria-hidden="true"><p class="boot-summary"></p><div class="boot-table"></div><div class="boot-total"></div><div class="boot-transaction"></div></div></div><div class="boot-footer">PERSONAL PROFILE <span>2026</span></div></div>`;
  document.body.append(overlay);
  let timer: number;
  let interval: number | undefined;
  const dismiss = () => { clearTimeout(timer); clearInterval(interval); overlay.remove(); window.removeEventListener('keydown', onKey); window.removeEventListener('scroll', dismiss); document.removeEventListener('click', onAnchor); };
  // Fictional package sizes are visual storytelling, never network telemetry.
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
  total.innerHTML = '<span class="boot-package-name">[4/4] Total</span><span class="boot-percent">100%</span><span class="boot-speed"></span><span class="boot-size"></span><span class="boot-time">00m01s</span>';
  total.querySelector('.boot-speed')!.textContent = `${(totalSize / 1.28).toFixed(1)} KiB/s`;
  total.querySelector('.boot-size')!.textContent = `${totalSize.toFixed(1)} KiB`;
  const transaction = overlay.querySelector<HTMLElement>('.boot-transaction')!;
  const started = performance.now();
  function renderPackages(): void {
    const elapsed = performance.now() - started;
    rows.forEach((row, index) => {
      const progress = Math.max(0, Math.min(1, (elapsed - index * 320) / 320));
      row.hidden = elapsed < index * 320;
      row.dataset.state = progress === 1 ? 'complete' : 'downloading';
      row.querySelector('.boot-percent')!.textContent = `${Math.floor(progress * 100)}%`;
      row.querySelector('.boot-speed')!.textContent = `${(sizes[index] / 0.32).toFixed(1)} KiB/s`;
      row.querySelector('.boot-size')!.textContent = `${(sizes[index] * progress).toFixed(1)} KiB`;
      row.querySelector('.boot-time')!.textContent = '00m00s';
    });
    total.hidden = elapsed < 1280;
    const steps = [
      'Running transaction',
      '[1/3] Verify profile files   100%',
      '[2/3] Prepare profile       100%',
      '[3/3] Installing arvin-profile   100%',
      'Complete!',
    ];
    const count = elapsed < 1400 ? 0 : Math.min(steps.length, Math.floor((elapsed - 1400) / 130) + 1);
    transaction.textContent = steps.slice(0, count).join('\n');
    if (count === steps.length) clearInterval(interval);
  }
  renderPackages();
  interval = window.setInterval(renderPackages, 40);
  const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss(); };
  const onAnchor = (event: MouseEvent) => { if (event.target instanceof Element && event.target.closest('a')) dismiss(); };
  overlay.querySelector('button')?.addEventListener('click', dismiss);
  window.addEventListener('keydown', onKey);
  window.addEventListener('scroll', dismiss, { passive: true });
  document.addEventListener('click', onAnchor);
  timer = window.setTimeout(dismiss, 2400);
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
      const animation = entry.target.animate(
        [{ transform: 'translateY(16px)' }, { transform: 'translateY(0)' }],
        { duration: 520, easing: 'cubic-bezier(.2,.65,.3,1)' },
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

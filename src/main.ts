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
  overlay.innerHTML = `<div class="boot-inner"><div class="boot-header"><span>ARVIN / PROFILE</span><button type="button">Skip intro <span aria-hidden="true">↗</span></button></div><div class="boot-body"><p class="boot-caption">A SIMULATED INTRODUCTION / NO INSTALLATION</p><pre aria-hidden="true">  _   ______     _____ _   _
 / \\ |  _ \\ \\   / /_ _| \\ | |
/ _ \\| |_) \\ \\ / / | ||  \\| |
/ ___ \\  _ &lt; \\ V /  | || |\\  |
/_/   \\_\\_| \\_\\ \\_/  |___|_| \\_|

 P R O F I L E</pre><p class="boot-compact" aria-hidden="true">arvin<br />profile_</p><p class="boot-name">arvin profile</p><p class="boot-index">indexing profile sections <span>· experience</span> <span>· projects</span> <span>· about</span> <span>· contact</span></p></div><div class="boot-footer">PERSONAL PROFILE <span>2026</span></div></div>`;
  document.body.append(overlay);
  let timer: number;
  const dismiss = () => { clearTimeout(timer); overlay.remove(); window.removeEventListener('keydown', onKey); window.removeEventListener('scroll', dismiss); document.removeEventListener('click', onAnchor); };
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

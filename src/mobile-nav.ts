const trigger = document.querySelector<HTMLButtonElement>('.menu-trigger');
const dialog = document.querySelector<HTMLDialogElement>('#mobile-menu');
const compact = window.matchMedia('(max-width: 899px)');

if (trigger && dialog && typeof dialog.showModal === 'function') {
  const button = trigger;
  const panel = dialog;
  let savedOverflow = '';
  let savedPadding = '';
  document.documentElement.classList.add('mobile-nav-ready');
  button.hidden = false;

  function close(): void {
    if (panel.open) panel.close();
  }
  button.addEventListener('click', () => {
    savedOverflow = document.documentElement.style.overflow;
    savedPadding = document.documentElement.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbar) document.documentElement.style.paddingRight = `${scrollbar}px`;
    document.documentElement.style.overflow = 'hidden';
    panel.showModal();
    button.setAttribute('aria-expanded', 'true');
  });
  panel.addEventListener('close', () => {
    document.documentElement.style.overflow = savedOverflow;
    document.documentElement.style.paddingRight = savedPadding;
    button.setAttribute('aria-expanded', 'false');
  });
  panel.querySelector('.menu-close')?.addEventListener('click', close);
  panel.addEventListener('click', event => {
    if (event.target === panel) {
      const rect = panel.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
    }
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!link) return;
    event.preventDefault();
    const target = document.querySelector<HTMLElement>(link.hash);
    close();
    history.pushState(null, '', link.hash);
    target?.scrollIntoView();
    target?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  });
  compact.addEventListener('change', () => { if (!compact.matches) close(); });
  window.addEventListener('pagehide', close);
  window.addEventListener('pageshow', close);
  window.addEventListener('popstate', close);
}

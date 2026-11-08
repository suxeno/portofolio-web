import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
const media = gsap.matchMedia();
media.add('(prefers-reduced-motion: no-preference)', () => {
  const mobile = window.matchMedia('(max-width: 600px)').matches;
  const elements = gsap.utils.toArray<HTMLElement>('.editorial h2, .editorial .entry, .contact-inner h2');
  elements.forEach(element => {
    const section = element.closest('section')?.id;
    const entries = section === 'projects' ? Array.from(document.querySelectorAll('#projects .entry')) : [];
    const index = entries.indexOf(element);
    const from = section === 'projects' ? { x: mobile ? -12 : -48 } : section === 'experience' ? (mobile ? { y: 18 } : { x: 18 }) : { y: section === 'writing' ? 22 : 12 };
    gsap.fromTo(element, from, {
      x: 0, y: 0, duration: section === 'projects' ? 0.7 : 0.52,
      delay: index < 0 ? 0 : index * 0.09, ease: 'power3.out', immediateRender: false,
      scrollTrigger: { trigger: element, start: 'top 85%', once: true }
    });
  });
});
window.addEventListener('pagehide', () => media.revert(), { once: true });

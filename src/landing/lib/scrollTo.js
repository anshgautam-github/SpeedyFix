import { gsap } from './gsap';

/** Smooth-scrolls to a section id. Falls back to an instant jump for reduced motion. */
export function scrollToId(id, reduced = false) {
  const el = document.getElementById(id);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY;
  if (reduced) window.scrollTo(0, y);
  else gsap.to(window, { scrollTo: { y, autoKill: true }, duration: 1.2, ease: 'power3.inOut', overwrite: true });
  window.history.replaceState(null, '', `#${id}`);
}

/** Click handler for in-page anchors. Keeps the real href so middle-click and no-JS still work. */
export function anchorClick(id, reduced, after) {
  return (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    scrollToId(id, reduced);
    if (after) after();
  };
}

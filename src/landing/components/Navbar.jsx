import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { anchorClick } from '../lib/scrollTo';
import { useIsoLayoutEffect, useReducedMotion } from '../hooks/useReducedMotion';
import MagneticButton from './MagneticButton';
import Logo from './Logo';

const LINKS = [
  { id: 'journey', label: 'The journey' },
  { id: 'why', label: 'Why Speedy Fix' },
  { id: 'how', label: 'How it works' },
  { id: 'partner', label: 'Partner' },
];

export default function Navbar() {
  const reduced = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('');

  // Active link and scrolled state update only when a boundary is crossed, never per frame.
  useIsoLayoutEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({ start: 40, end: 'max', onToggle: (self) => setScrolled(self.isActive) });
      ScrollTrigger.create({ trigger: '#top', start: 'top 55%', end: 'bottom 55%', onToggle: (s) => s.isActive && setActive('') });
      LINKS.forEach(({ id }) => {
        ScrollTrigger.create({
          trigger: `#${id}`,
          start: 'top 55%',
          end: 'bottom 55%',
          onToggle: (self) => self.isActive && setActive(id),
        });
      });
    });
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const go = (id) => anchorClick(id, reduced, () => setOpen(false));

  return (
    <motion.header
      initial={reduced ? false : { y: -28, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      className={`fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-300 ${
        scrolled || open ? 'border-white/10 bg-midnight/80 backdrop-blur-xl' : 'border-transparent'
      }`}
    >
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-white px-4 py-2 text-sm font-semibold text-midnight focus:not-sr-only focus:absolute focus:left-4 focus:top-3"
      >
        Skip to content
      </a>
      <nav aria-label="Primary" className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-4 sm:px-8 md:h-[72px]">
        <a href="#top" onClick={go('top')} className="flex items-center gap-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt-glow">
          <Logo />
          <span className="font-display text-lg leading-none text-white">
            Speedy Fix<span className="ml-1.5 hidden text-sm font-medium text-silver sm:inline">Auto Assists</span>
          </span>
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map(({ id, label }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                onClick={go(id)}
                aria-current={active === id ? 'true' : undefined}
                className={`rounded-full px-3.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt-glow ${
                  active === id ? 'bg-white/10 text-white' : 'text-silver hover:text-white'
                }`}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <a href="/login" className="hidden rounded-full px-3.5 py-2 text-sm text-silver transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt-glow md:inline-block">
            Log in
          </a>
          <MagneticButton href="#partner" onClick={go('partner')} className="hidden !min-h-[42px] px-5 text-sm md:inline-flex">
            Partner With Us
          </MagneticButton>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-white md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={reduced ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
            className="border-t border-white/10 px-4 pb-6 pt-3 md:hidden"
          >
            <ul className="flex flex-col">
              {LINKS.map(({ id, label }) => (
                <li key={id}>
                  <a href={`#${id}`} onClick={go(id)} className="block rounded-xl px-3 py-3.5 text-lg text-white active:bg-white/5">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
            <a href="/login" className="mt-2 block rounded-xl px-3 py-3.5 text-lg text-white active:bg-white/5">Log in</a>
            <MagneticButton href="#partner" onClick={go('partner')} className="mt-3 w-full">
              Partner With Us
            </MagneticButton>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}


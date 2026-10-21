import Logo from './Logo';
import { SITE, hasContact } from '../config';
import { ContactList } from './PartnerCTA';
import { anchorClick } from '../lib/scrollTo';
import { useReducedMotion } from '../hooks/useReducedMotion';

const LINKS = [
  { id: 'journey', label: 'The journey' },
  { id: 'why', label: 'Why Speedy Fix' },
  { id: 'how', label: 'How it works' },
  { id: 'partner', label: 'Partner' },
];

export default function Footer() {
  const reduced = useReducedMotion();
  return (
    <footer className="border-t border-white/10 bg-[#04070e] py-12 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <Logo className="h-11 w-11" />
            <p className="font-display text-lg leading-tight">{SITE.name}</p>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-silver">
            Pickup and drop, handled for your workshop. A driver at your customer&apos;s door, the vehicle in your bay, and every handover on record.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="space-y-1.5 text-sm">
            {LINKS.map(({ id, label }) => (
              <li key={id}>
                <a href={`#${id}`} onClick={anchorClick(id, reduced)} className="inline-block py-1 text-silver hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt-glow">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div>{hasContact() && <ContactList />}</div>
      </div>
      <p className="mx-auto mt-10 max-w-7xl px-4 text-xs text-silver-dim sm:px-8">
        &copy; {new Date().getFullYear()} {SITE.name}. Screens on this page show sample data for demonstration.
      </p>
    </footer>
  );
}

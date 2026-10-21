import { useEffect } from 'react';
import './landing.css';
import { ScrollTrigger } from './lib/gsap';
import { useIsoLayoutEffect } from './hooks/useReducedMotion';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import CarJourneySection from './journey/CarJourneySection';
import BenefitsSection from './components/BenefitsSection';
import WorkflowTimeline from './components/WorkflowTimeline';
import PartnerCTA from './components/PartnerCTA';
import Footer from './components/Footer';

export default function LandingPage() {
  // Parent layout effects run after every child has created its ScrollTriggers, so one refresh settles all positions.
  useIsoLayoutEffect(() => {
    const refresh = () => ScrollTrigger.refresh();
    const raf = requestAnimationFrame(refresh);
    window.addEventListener('load', refresh);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('load', refresh);
    };
  }, []);

  useEffect(() => {
    // Web fonts change text metrics, so positions are measured again once they have loaded.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }, []);

  return (
    <div className="sf-landing bg-midnight font-sans text-white antialiased">
      <Navbar />
      <main id="main">
        <HeroSection />
        <CarJourneySection />
        <BenefitsSection />
        <WorkflowTimeline />
        <PartnerCTA />
      </main>
      <Footer />
    </div>
  );
}

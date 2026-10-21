import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

// Registered once for the whole landing page.
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
// Stops the mobile address bar from triggering a full refresh (and a jump) while scrolling.
ScrollTrigger.config({ ignoreMobileResize: true });

export { gsap, ScrollTrigger };

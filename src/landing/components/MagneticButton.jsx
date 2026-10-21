import { useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useReducedMotion } from '../hooks/useReducedMotion';

const VARIANTS = {
  primary:
    'bg-volt text-white shadow-[0_12px_40px_-12px_rgba(31,107,255,.9),inset_0_0_0_1px_rgba(255,255,255,.14)] hover:bg-volt-soft',
  ghost: 'border border-white/25 text-white hover:border-white/50 hover:bg-white/10',
  dark: 'bg-midnight text-white hover:bg-navy-800',
};

/**
 * Link or button that leans toward the pointer. The effect is skipped for touch input and
 * reduced motion, and never changes the element's hit area or keyboard behaviour.
 */
export default function MagneticButton({ as = 'a', variant = 'primary', className = '', children, strength = 0.22, ...rest }) {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 230, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 230, damping: 18, mass: 0.4 });
  const Comp = motion[as];

  const onMove = (e) => {
    if (reduced || e.pointerType !== 'mouse' || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <Comp
      ref={ref}
      style={{ x: sx, y: sy }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-6 text-base font-semibold transition-colors duration-200 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </Comp>
  );
}

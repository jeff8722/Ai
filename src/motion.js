import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

export { gsap, ScrollTrigger, SplitText };

export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches;

let lenis;
/** One smooth-scroll instance for the session; null when motion is reduced. */
export function getLenis() {
  if (lenis !== undefined) return lenis;
  if (reduced()) return (lenis = null);
  lenis = new Lenis({ autoRaf: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export function scrollTop() {
  getLenis()?.scrollTo(0, { immediate: true, force: true });
  window.scrollTo(0, 0);
}

/** Magnetic pull for [data-magnetic] controls, by delegation so it survives re-renders. */
export function magnetic() {
  if (reduced() || !finePointer()) return () => {};
  const pulls = new WeakMap();
  let held = null;
  const move = e => {
    const m = e.target.closest?.('[data-magnetic]') ?? null;
    if (held && held !== m) pulls.get(held)?.forEach(f => f(0));
    held = m;
    if (!m || m.disabled) return;
    if (!pulls.has(m)) pulls.set(m, [gsap.quickTo(m, 'x', { duration: 0.5, ease: 'power3.out' }), gsap.quickTo(m, 'y', { duration: 0.5, ease: 'power3.out' })]);
    const r = m.getBoundingClientRect();
    const [mx, my] = pulls.get(m);
    mx((e.clientX - r.left - r.width / 2) * 0.22);
    my((e.clientY - r.top - r.height / 2) * 0.3);
  };
  window.addEventListener('pointermove', move);
  return () => window.removeEventListener('pointermove', move);
}

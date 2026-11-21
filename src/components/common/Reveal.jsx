import { useEffect, useRef, useState } from 'react';

// Reveal each section once. Older browsers and reduced-motion users see it immediately.
export default function Reveal({ children, className = '' }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(
    () =>
      typeof IntersectionObserver === 'undefined' ||
      globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (seen || !ref.current) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [seen]);

  return (
    <div ref={ref} className={`reveal${seen ? ' in' : ''} ${className}`}>
      {children}
    </div>
  );
}

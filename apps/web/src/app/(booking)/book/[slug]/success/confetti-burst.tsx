'use client';

import { useEffect } from 'react';

interface Props {
  /** Storage-Key. Bei demselben Wert (= selber appointmentId) feuert
   *  Confetti nur einmal pro Browser-Session. */
  fireKey: string;
}

/**
 * Goldene Konfetti beim ersten /success-Load. Pure CSS — keine npm-dep,
 * <100 LOC. ~40 Partikel fallen 2.4s, dann fade. Idempotent via
 * sessionStorage damit Reload nicht nochmal feuert (Peak-End Rule:
 * der Moment soll besonders bleiben).
 */
export function ConfettiBurst({ fireKey }: Props): React.JSX.Element | null {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = `confetti_fired:${fireKey}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, '1');

    // Mini haptic — schadet nicht auf Desktop.
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([20, 40, 20]);
    }
  }, [fireKey]);

  // Generate 40 particles statically — animations + delay variation in CSS.
  const particles = Array.from({ length: 40 }, (_, i) => i);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
      style={{ contain: 'strict' }}
    >
      {particles.map((i) => {
        // pseudo-random aber deterministisch via index
        const left = (i * 37) % 100;
        const delay = (i * 73) % 1500; // 0–1500ms
        const duration = 1800 + ((i * 91) % 1200); // 1800–3000ms
        const size = 6 + ((i * 13) % 8); // 6–14px
        const colors = ['#D0B07C', '#F0E0A0', '#C8A96E', '#FFFFFF'];
        const color = colors[i % colors.length];
        const rotate = (i * 113) % 360;
        const sway = ((i * 53) % 30) - 15; // -15..15 vw drift
        return (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${left}%`,
              top: '-20px',
              width: `${size}px`,
              height: `${size * 0.4}px`,
              backgroundColor: color,
              animationDelay: `${delay}ms`,
              animationDuration: `${duration}ms`,
              transform: `rotate(${rotate}deg)`,
              ['--sway' as unknown as string]: `${sway}vw`,
            }}
          />
        );
      })}
      <style>{`
        .confetti-piece {
          position: absolute;
          opacity: 0;
          border-radius: 1px;
          animation-name: confetti-fall;
          animation-timing-function: cubic-bezier(0.4, 0.05, 0.6, 1);
          animation-fill-mode: forwards;
        }
        @keyframes confetti-fall {
          0% {
            opacity: 0;
            transform: translate(0, 0) rotate(0deg);
          }
          10% {
            opacity: 1;
          }
          85% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(var(--sway), 110vh) rotate(720deg);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .confetti-piece {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

import * as React from 'react';

// ─── ShakeOnError / useShake ──────────────────────────────────
//
// Für Form-Validierung: bei Fehler schüttelt die Komponente kurz,
// damit sich der visuelle Fehler auch haptisch "echt" anfühlt.
// Keine externe Animations-Library — ausschließlich CSS-Keyframes,
// injiziert via <style>-Tag (einmalig pro Tree).

const SHAKE_STYLE = `
@keyframes salon-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
[data-salon-shake="true"] {
  animation: salon-shake 320ms cubic-bezier(0.36, 0.07, 0.19, 0.97);
}
`;

function useInjectStyle(): void {
  React.useEffect(() => {
    const id = 'salon-shake-style';
    if (document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = SHAKE_STYLE;
    document.head.appendChild(el);
  }, []);
}

/**
 * Hook-Variante: ruf `shake()` auf, die Ref-Node bekommt `data-salon-shake`
 * für die Animations-Dauer. Typ. Einsatz: bei gescheiterter Validierung.
 */
export function useShake<T extends HTMLElement>(): {
  ref: React.RefObject<T | null>;
  shake: () => void;
} {
  useInjectStyle();
  const ref = React.useRef<T | null>(null);
  const shake = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute('data-salon-shake', 'true');
    const reset = (): void => {
      el.removeAttribute('data-salon-shake');
      el.removeEventListener('animationend', reset);
    };
    el.addEventListener('animationend', reset);
  }, []);
  return { ref, shake };
}

/**
 * Deklarative Variante: `active`-Prop triggert eine einzelne Shake-Iteration
 * und setzt das Attribut danach wieder zurück.
 */
export interface ShakeOnErrorProps {
  active: boolean;
  children: React.ReactNode;
  className?: string;
}

export function ShakeOnError({
  active,
  children,
  className,
}: ShakeOnErrorProps): React.JSX.Element {
  useInjectStyle();
  const divRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = divRef.current;
    if (!el || !active) return;
    el.setAttribute('data-salon-shake', 'true');
    const reset = (): void => el.removeAttribute('data-salon-shake');
    el.addEventListener('animationend', reset, { once: true });
    return () => el.removeEventListener('animationend', reset);
  }, [active]);

  return (
    <div ref={divRef} className={className}>
      {children}
    </div>
  );
}

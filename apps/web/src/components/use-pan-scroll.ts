'use client';
import * as React from 'react';

/**
 * Click-and-drag horizontal panning für overflow-x-auto Container.
 * User klickt irgendwo auf leere Fläche, hält die Maus gedrückt und
 * zieht — Container scrollt mit. Touch-Geräte behalten natives
 * Finger-Swipen (kein preventDefault auf touchstart).
 *
 * Skip-Logik: Pan startet NUR wenn auf der leeren Fläche gedrückt
 * wurde. Elemente mit `data-no-pan`, interaktive Elemente (a, button,
 * input, select, textarea) oder Drag-Handles (`[data-dnd-drag]`)
 * blocken den Pan-Start, damit Termin-Karten / Links / Inputs normal
 * funktionieren.
 */
export function usePanScroll<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
): void {
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Zwei Phasen:
    // 1. "armed": pointerdown erfasst; wartet auf Bewegung > THRESHOLD
    // 2. "panning": Bewegung > THRESHOLD → ab hier scrollen + Click
    //    unterdrücken
    // Reine Clicks (< THRESHOLD Bewegung) gehen normal durch an das
    // Ziel-Element (Slot erstellt Termin etc).
    const THRESHOLD = 6;
    let phase: 'idle' | 'armed' | 'panning' = 'idle';
    let startX = 0;
    let startScrollLeft = 0;
    let pointerId: number | null = null;

    const shouldSkip = (target: EventTarget | null): boolean => {
      if (!(target instanceof Element)) return false;
      // Explizite Opt-Outs
      if (target.closest('[data-no-pan]')) return true;
      // Termin-Karten gehören dnd-kit
      if (target.closest('[data-dnd-drag]')) return true;
      // Form-Inputs: User will editieren, nicht pannen
      if (target.closest('input,select,textarea')) return true;
      // Buttons (Slots!) + Links: arm-Phase blockt onClick nicht,
      // erst nach 6px Bewegung wird's zum Pan — Click funktioniert
      // weiterhin für Slots (Neuer Termin), Zoom-Buttons etc.
      return false;
    };

    const onPointerDown = (e: PointerEvent): void => {
      // Nur Maus/Stift — Touch via native scroll. Linke Maustaste only.
      if (e.pointerType === 'touch') return;
      if (e.button !== 0) return;
      if (shouldSkip(e.target)) return;

      phase = 'armed';
      startX = e.clientX;
      startScrollLeft = el.scrollLeft;
      pointerId = e.pointerId;
      // Früh capturen: pointerleave auf Sticky-Children würde sonst in
      // der armed-Phase den Pan töten, bevor die 6px-Schwelle erreicht
      // ist. Capture leitet alle Moves an el weiter.
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* some pointers refuse capture; weiterarbeiten */
      }
    };

    const onPointerMove = (e: PointerEvent): void => {
      if (phase === 'idle' || e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      if (phase === 'armed') {
        if (Math.abs(dx) < THRESHOLD) return;
        phase = 'panning';
        el.style.cursor = 'grabbing';
        el.style.userSelect = 'none';
      }
      el.scrollLeft = startScrollLeft - dx;
    };

    const suppressNextClick = (e: MouseEvent): void => {
      e.stopPropagation();
      e.preventDefault();
    };

    const stop = (e: PointerEvent): void => {
      if (phase === 'idle' || e.pointerId !== pointerId) return;
      const wasPanning = phase === 'panning';
      phase = 'idle';
      pointerId = null;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* capture may already be released */
      }
      if (wasPanning) {
        el.style.cursor = '';
        el.style.userSelect = '';
        // Click unterdrücken, damit Slot-onClick nach einem Pan nicht
        // unbeabsichtigt einen Termin anlegt. { once: true } + Timeout-
        // Fallback falls der Click nie kommt (Release ausserhalb, kein
        // bubble) — ohne Timeout würde der nächste echte Click
        // geschluckt.
        el.addEventListener('click', suppressNextClick, {
          capture: true,
          once: true,
        });
        window.setTimeout(() => {
          el.removeEventListener('click', suppressNextClick, {
            capture: true,
          });
        }, 300);
      }
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', stop);
      el.removeEventListener('pointercancel', stop);
    };
  }, [ref]);
}

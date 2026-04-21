// ─── Confetti-Trigger ─────────────────────────────────────────
//
// Thin wrapper um canvas-confetti. Kapselt "default-Presets" für häufige
// Salon-Events: Buchung bestätigt, Tip ≥ 20 €, Milestone erreicht.
// Dynamischer Import, damit das 30-KiB-Bundle erst bei erstem Trigger
// geladen wird — der Happy-Path fühlt sich dadurch nicht träge an.

export type ConfettiPreset = 'booking-confirmed' | 'big-tip' | 'milestone';

export async function burstConfetti(preset: ConfettiPreset = 'booking-confirmed'): Promise<void> {
  if (typeof window === 'undefined') return;
  const mod = await import('canvas-confetti');
  const confetti = mod.default;

  switch (preset) {
    case 'big-tip':
      confetti({
        particleCount: 120,
        spread: 100,
        startVelocity: 45,
        origin: { y: 0.6 },
        colors: ['#facc15', '#f59e0b', '#fde68a'],
      });
      return;
    case 'milestone':
      confetti({
        particleCount: 200,
        spread: 160,
        startVelocity: 55,
        origin: { y: 0.5 },
      });
      return;
    case 'booking-confirmed':
    default:
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
      });
      return;
  }
}

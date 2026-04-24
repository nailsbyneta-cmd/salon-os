'use client';
import * as React from 'react';

/**
 * Share-Button mit Web Share API — Kundin teilt den Salon-Link mit
 * Freundinnen. Fallback: Clipboard-Copy. Pure Referral-Feature,
 * kostet 0 und bringt Word-of-Mouth.
 */
export function ShareButton({
  slug,
  salonName,
}: {
  slug: string;
  salonName: string;
}): React.JSX.Element {
  const [copied, setCopied] = React.useState(false);
  const [supported, setSupported] = React.useState(false);

  React.useEffect(() => {
    setSupported(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  const handleShare = async (): Promise<void> => {
    const shareUrl = `${window.location.origin}/book/${slug}`;
    const data = {
      title: salonName,
      text: `Ich war gerade bei ${salonName} — kann ich dir weiterempfehlen 💛`,
      url: shareUrl,
    };
    if (supported) {
      try {
        await navigator.share(data);
      } catch {
        // User cancelled — ignore
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback failed — do nothing
      }
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-text-secondary transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:text-text-primary hover:shadow-md active:translate-y-0 active:scale-[0.98]"
    >
      {copied ? '✓ Link kopiert' : supported ? '↗ Weiterempfehlen' : '🔗 Link kopieren'}
    </button>
  );
}

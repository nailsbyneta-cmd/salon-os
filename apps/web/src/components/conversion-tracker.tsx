'use client';

import { useEffect } from 'react';

type EventName = 'phorest_click' | 'whatsapp_click' | 'phone_click';

function classify(href: string): EventName | null {
  const lower = href.toLowerCase();
  if (lower.startsWith('tel:')) return 'phone_click';
  if (
    lower.startsWith('https://wa.me/') ||
    lower.startsWith('http://wa.me/') ||
    lower.startsWith('whatsapp://') ||
    lower.includes('api.whatsapp.com/send') ||
    lower.includes('web.whatsapp.com')
  ) {
    return 'whatsapp_click';
  }
  if (
    lower.includes('phorest.com') ||
    lower.includes('phorestlive.com') ||
    lower.includes('phorest.me') ||
    lower.includes('book.phorest')
  ) {
    return 'phorest_click';
  }
  return null;
}

export function ConversionTracker(): null {
  useEffect(() => {
    function onClick(event: MouseEvent): void {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;
      const eventName = classify(href);
      if (!eventName) return;

      const gtag = window.gtag;
      if (typeof gtag !== 'function') return;

      gtag('event', eventName, {
        link_url: href,
        link_text: (anchor.textContent ?? '').trim().slice(0, 100),
        page_location: window.location.href,
        page_path: window.location.pathname,
      });
    }

    document.addEventListener('click', onClick, { capture: true });
    return (): void => {
      document.removeEventListener('click', onClick, { capture: true });
    };
  }, []);

  return null;
}

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Beautycenter by Neta',
    short_name: 'Beautyneta',
    description: 'Termine buchen bei Beautycenter by Neta',
    start_url: '/book/beautycenter-by-neta',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#171717',
    lang: 'de-CH',
    orientation: 'portrait',
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}

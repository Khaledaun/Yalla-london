export const BRAND = {
  colors: {
    red: '#C8322B',
    gold: '#C49A2A',
    blue: '#4A7BA8',
    charcoal: '#1C1917',
    cream: '#F5F0E8',
    navy: '#0F1621',
    parchment: '#EDE9E1',
    gray: '#A09A8E',
    white: '#FFFFFF',
  },
  fonts: {
    display: 'Anybody',
    body: 'Source Serif 4',
    mono: 'IBM Plex Mono',
  },
  tribar: { height: 3 },
  goldRule: { width: 48, height: 2 },
  stamp: { src: '/yalla-stamp-500.png', size: 36 },
  watermark: { src: '/yalla-watermark-500.png' },
  canvas: { width: 1080, height: 1920, fps: 30 },
} as const;

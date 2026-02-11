
import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Brand Kit v2 — Yalla London
        london: {
          50: '#fef2f2',
          100: '#fde3e3',
          200: '#fccbcb',
          300: '#f9a3a3',
          400: '#f06b6b',
          500: '#e34040',
          600: '#C8322B',  // PRIMARY — London Red
          700: '#a82520',
          800: '#8b1f1c',
          900: '#751d1b',
          950: '#400b0a',
        },
        'yalla-gold': {
          50: '#fbf8eb',
          100: '#f5eecb',
          200: '#ede09a',
          300: '#e2cc60',
          400: '#d9b938',
          500: '#C49A2A',  // SECONDARY — Gold
          600: '#a87a22',
          700: '#8a5c1e',
          800: '#724a20',
          900: '#5f3e20',
          950: '#371f0e',
        },
        thames: {
          50: '#f0f7fa',
          100: '#dbeef4',
          200: '#bbdee9',
          300: '#8bc6d9',
          400: '#54a6c1',
          500: '#3B7EA1',  // Thames Blue — links, info
          600: '#326b8b',
          700: '#2d5872',
          800: '#2b4a5f',
          900: '#283e50',
          950: '#172735',
        },
        stamp: {
          DEFAULT: '#4A7BA8',  // Stamp Blue — LDN stamp, interactive
        },
        charcoal: {
          DEFAULT: '#1C1917',  // Dark bg, primary text
          light: '#3D3835',    // Graphite — borders, cards
        },
        stone: {
          DEFAULT: '#78716C',  // Secondary text, metadata
        },
        sand: {
          DEFAULT: '#D6D0C4',  // Light mode borders, dividers
        },
        cream: {
          DEFAULT: '#FAF8F4',  // Light mode background
        },
        forest: {
          DEFAULT: '#2D5A3D',  // Success states
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        'soft': '12px',
        'card': '16px',
      },
      boxShadow: {
        'sm': '0 1px 3px rgba(28, 25, 23, 0.06)',
        'md': '0 4px 12px rgba(28, 25, 23, 0.08)',
        'luxury': '0 4px 20px rgba(28, 25, 23, 0.08)',
        'elegant': '0 8px 40px rgba(28, 25, 23, 0.12)',
        'card': '0 2px 12px rgba(28, 25, 23, 0.06)',
        'hover': '0 12px 32px rgba(28, 25, 23, 0.15)',
        'xl': '0 20px 60px rgba(28, 25, 23, 0.16)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "shimmer": {
          from: { backgroundPosition: "-200% 0" },
          to: { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-up": "slide-up 0.5s ease-out",
        "scale-in": "scale-in 0.3s ease-out",
        "shimmer": "shimmer 2s infinite linear",
      },
      fontFamily: {
        'sans': ['var(--font-body)'],
        'display': ['var(--font-display)'],
        'editorial': ['var(--font-editorial)'],
        'mono': ['var(--font-system)'],
        'arabic': ['var(--font-arabic)'],
        // Legacy aliases
        'serif': ['var(--font-editorial)'],
        'cairo': ['var(--font-arabic)'],
        'playfair': ['var(--font-display)'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-luxury': 'linear-gradient(135deg, #C8322B 0%, #8b1f1c 100%)',
        'gradient-gold': 'linear-gradient(135deg, #C49A2A 0%, #d9b938 100%)',
        'gradient-tricolor': 'linear-gradient(90deg, #C8322B, #C49A2A, #3B7EA1)',
        'pattern-arabesque': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4AF37' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config

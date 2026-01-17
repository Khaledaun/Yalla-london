
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
        // Custom brand colors
        burgundy: {
          50: '#fdf2f4',
          100: '#fce7eb',
          200: '#f9d0d9',
          300: '#f5a8bb',
          400: '#ee7694',
          500: '#e34d70',
          600: '#ce2d54',
          700: '#ad2145',
          800: '#8B1538',
          900: '#5C0A23',
          950: '#3d0515',
        },
        gold: {
          50: '#fbf9eb',
          100: '#f6f1cb',
          200: '#efe299',
          300: '#E8D5A3',
          400: '#D4AF37',
          500: '#C5A572',
          600: '#a78532',
          700: '#856429',
          800: '#6f5126',
          900: '#5f4424',
          950: '#372411',
        },
        cream: {
          50: '#FFFDF8',
          100: '#FDF8F3',
          200: '#F5EDE4',
          300: '#e8ddd0',
          400: '#d4c4b0',
          500: '#bea78f',
          600: '#ab8f74',
          700: '#8f7561',
          800: '#766153',
          900: '#615146',
          950: '#332a24',
        },
        warm: {
          gray: '#6B5B4F',
          charcoal: '#3D2F27',
          text: '#2D1810',
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
        'luxury': '0 4px 20px rgba(139, 21, 56, 0.08)',
        'elegant': '0 8px 40px rgba(139, 21, 56, 0.12)',
        'card': '0 2px 12px rgba(45, 24, 16, 0.06)',
        'hover': '0 12px 32px rgba(139, 21, 56, 0.15)',
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
        'sans': ['var(--font-inter)'],
        'cairo': ['var(--font-cairo)'],
        'arabic': ['var(--font-arabic)'],
        'serif': ['var(--font-serif)'],
        'playfair': ['var(--font-serif)'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-luxury': 'linear-gradient(135deg, #8B1538 0%, #5C0A23 100%)',
        'gradient-gold': 'linear-gradient(135deg, #D4AF37 0%, #C5A572 100%)',
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

/**
 * Vuexy-Inspired Design Tokens for Yalla London Admin
 * Professional, modern design system with custom twist
 */

export const designTokens = {
  // Professional Color Palette - Vuexy inspired
  colors: {
    // Primary brand colors
    primary: {
      50: '#f0f4ff',
      100: '#e0e9ff',
      200: '#c7d6fe',
      300: '#a5b8fc',
      400: '#8b95f8',
      500: '#7c3aed', // Main primary
      600: '#6d28d9',
      700: '#5b21b6',
      800: '#4c1d95',
      900: '#3c1877',
    },
    
    // Secondary accent colors
    secondary: {
      50: '#fefce8',
      100: '#fef9c3',
      200: '#fef08a',
      300: '#fde047',
      400: '#facc15',
      500: '#eab308', // Main secondary
      600: '#ca8a04',
      700: '#a16207',
      800: '#854d0e',
      900: '#713f12',
    },
    
    // Success colors
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    
    // Warning colors
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    
    // Error/Danger colors
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
    
    // Neutral grays - Professional palette
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },
    
    // Surface colors for cards, backgrounds
    surface: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
      elevated: '#ffffff',
    },
    
    // Border colors
    border: {
      light: '#e2e8f0',
      medium: '#cbd5e1',
      strong: '#94a3b8',
    }
  },
  
  // Typography scale
  typography: {
    fontFamilies: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      serif: ['Playfair Display', 'Georgia', 'serif'],
      mono: ['JetBrains Mono', 'Menlo', 'monospace'],
    },
    
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      '5xl': ['3rem', { lineHeight: '1' }],
      '6xl': ['3.75rem', { lineHeight: '1' }],
    },
    
    fontWeight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
  },
  
  // Spacing scale
  spacing: {
    px: '1px',
    0: '0',
    0.5: '0.125rem',
    1: '0.25rem',
    1.5: '0.375rem',
    2: '0.5rem',
    2.5: '0.625rem',
    3: '0.75rem',
    3.5: '0.875rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    7: '1.75rem',
    8: '2rem',
    9: '2.25rem',
    10: '2.5rem',
    11: '2.75rem',
    12: '3rem',
    14: '3.5rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    28: '7rem',
    32: '8rem',
    36: '9rem',
    40: '10rem',
    44: '11rem',
    48: '12rem',
    52: '13rem',
    56: '14rem',
    60: '15rem',
    64: '16rem',
    72: '18rem',
    80: '20rem',
    96: '24rem',
  },
  
  // Border radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    base: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px',
  },
  
  // Shadows - Professional depth
  shadows: {
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    base: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    md: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    lg: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    xl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    
    // Elevated surfaces
    elevated: '0 8px 30px rgb(0 0 0 / 0.12)',
    floating: '0 20px 40px rgb(0 0 0 / 0.1)',
  },
  
  // Animation and transitions
  animation: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    
    easing: {
      linear: 'linear',
      ease: 'ease',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
  
  // Layout breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  
  // Z-index scale
  zIndex: {
    auto: 'auto',
    0: '0',
    10: '10',
    20: '20',
    30: '30',
    40: '40',
    50: '50',
    dropdown: '1000',
    sticky: '1020',
    fixed: '1030',
    modal: '1040',
    popover: '1050',
    tooltip: '1060',
    toast: '1070',
    max: '2147483647',
  },
}

// CSS Custom Properties for dynamic theming
export const cssVariables = {
  light: {
    '--color-primary': designTokens.colors.primary[500],
    '--color-primary-foreground': '#ffffff',
    '--color-secondary': designTokens.colors.secondary[500],
    '--color-secondary-foreground': designTokens.colors.neutral[900],
    '--color-success': designTokens.colors.success[500],
    '--color-warning': designTokens.colors.warning[500],
    '--color-error': designTokens.colors.error[500],
    '--color-background': designTokens.colors.surface.primary,
    '--color-surface': designTokens.colors.surface.secondary,
    '--color-foreground': designTokens.colors.neutral[900],
    '--color-muted': designTokens.colors.neutral[500],
    '--color-muted-foreground': designTokens.colors.neutral[600],
    '--color-border': designTokens.colors.border.light,
    '--color-input': designTokens.colors.border.light,
    '--color-ring': designTokens.colors.primary[500],
    '--shadow-elevated': designTokens.shadows.elevated,
    '--shadow-floating': designTokens.shadows.floating,
  },
  
  dark: {
    '--color-primary': designTokens.colors.primary[400],
    '--color-primary-foreground': designTokens.colors.neutral[900],
    '--color-secondary': designTokens.colors.secondary[400],
    '--color-secondary-foreground': designTokens.colors.neutral[100],
    '--color-success': designTokens.colors.success[400],
    '--color-warning': designTokens.colors.warning[400],
    '--color-error': designTokens.colors.error[400],
    '--color-background': designTokens.colors.neutral[900],
    '--color-surface': designTokens.colors.neutral[800],
    '--color-foreground': designTokens.colors.neutral[50],
    '--color-muted': designTokens.colors.neutral[400],
    '--color-muted-foreground': designTokens.colors.neutral[300],
    '--color-border': designTokens.colors.neutral[700],
    '--color-input': designTokens.colors.neutral[700],
    '--color-ring': designTokens.colors.primary[400],
    '--shadow-elevated': '0 8px 30px rgb(0 0 0 / 0.24)',
    '--shadow-floating': '0 20px 40px rgb(0 0 0 / 0.2)',
  }
}

export default designTokens
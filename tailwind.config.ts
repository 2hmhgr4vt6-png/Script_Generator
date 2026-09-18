import type { Config } from 'tailwindcss'

/**
 * Bhasika design system.
 * Pure black canvas, charcoal cards, one accent orange. No gradients.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#000000',
        surface: '#0A0A0B',
        card: '#101012',
        elevated: '#17171A',
        line: '#232327',
        'line-strong': '#2E2E34',
        ink: '#FFFFFF',
        muted: '#A1A1AA',
        faint: '#6B6B75',
        accent: {
          DEFAULT: '#FF8C00',
          soft: 'rgba(255, 140, 0, 0.12)',
          border: 'rgba(255, 140, 0, 0.35)',
          hover: '#FF9D24',
        },
        success: '#3DD68C',
        warning: '#F5C144',
        danger: '#F06464',
        info: '#6AA6FF',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
        'slide-in': { from: { opacity: '0', transform: 'translateX(12px)' }, to: { opacity: '1', transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out',
        'slide-in': 'slide-in 200ms ease-out',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
}

export default config

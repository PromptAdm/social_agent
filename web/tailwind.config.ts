import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        base:     '#09090E',
        inset:    '#0E0E16',
        surface:  '#111118',
        elevated: '#17171F',
        line:     '#1E1E2A',
        border:   '#27273A',
        muted:    '#3F3F56',
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],    // 10px
        xs:    ['0.6875rem', { lineHeight: '1rem' }],   // 11px — tighter than default
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
      },
      animation: {
        'fade-in':        'fadeIn 150ms ease-out',
        'fade-up':        'fadeUp 180ms ease-out',
        'slide-in-right': 'slideInRight 180ms ease-out',
        'spin-slow':      'spin 1.4s linear infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { transform: 'translateX(16px)', opacity: '0' },
          to:   { transform: 'translateX(0)',    opacity: '1' },
        },
      },
      boxShadow: {
        card:   '0 1px 3px 0 rgba(0,0,0,0.4), 0 1px 2px -1px rgba(0,0,0,0.4)',
        modal:  '0 20px 60px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.03)',
        glow:   '0 0 0 2px rgba(99,102,241,0.25)',
      },
    },
  },
  plugins: [],
}

export default config

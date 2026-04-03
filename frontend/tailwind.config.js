/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0a0a',
          surface: 'rgba(255,255,255,0.05)',
          elevated: 'rgba(255,255,255,0.09)',
          hover: 'rgba(255,255,255,0.13)',
          wash: 'rgba(10,10,10,0.8)',
          solid: '#161616',
        },
        accent: {
          DEFAULT: '#e8d5b7',
          warm: '#c9a87c',
          muted: '#8b7355',
          bright: '#f0dfc4',
        },
        green: { soft: '#34d399', muted: '#2d6a4f' },
        red: { soft: '#fb7185', muted: '#9b2c2c' },
        blue: { soft: '#60a5fa', muted: '#2563eb' },
        purple: { soft: '#a78bfa', muted: '#7c3aed' },
        orange: { soft: '#fb923c', muted: '#c2410c' },
        cyan: { soft: '#22d3ee' },
        border: {
          DEFAULT: 'rgba(255,255,255,0.12)',
          strong: 'rgba(255,255,255,0.20)',
          accent: 'rgba(232,213,183,0.22)',
        },
        text: {
          primary: 'rgba(255,255,255,0.95)',
          secondary: 'rgba(255,255,255,0.72)',
          muted: 'rgba(255,255,255,0.55)',
        },
        glass: {
          DEFAULT: 'rgba(255,255,255,0.04)',
          strong: 'rgba(255,255,255,0.07)',
          border: 'rgba(255,255,255,0.1)',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'sans-serif'],
        display: ['Inter', '-apple-system', 'SF Pro Display', 'sans-serif'],
        mono: ['SF Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
      },
      backdropBlur: {
        xs: '4px',
        glass: '40px',
        heavy: '64px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,0.4)',
        card: '0 4px 24px -4px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
        glow: '0 0 40px rgba(232,213,183,0.06)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.03)',
        'glass': '0 8px 32px -8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        'glass-sm': '0 2px 12px -2px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        'float': '0 16px 48px -12px rgba(0,0,0,0.6)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'check-pop': 'checkPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        checkPop: {
          '0%': { transform: 'scale(0)' },
          '60%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}

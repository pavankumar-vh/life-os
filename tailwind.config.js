/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0a0a',
          surface: '#111111',
          elevated: '#1a1a1a',
          hover: '#222222',
        },
        brutal: {
          yellow: '#FACC15',
          green: '#22C55E',
          red: '#EF4444',
          blue: '#3B82F6',
          purple: '#A855F7',
          orange: '#F97316',
          pink: '#EC4899',
          cyan: '#06B6D4',
        },
        border: {
          DEFAULT: '#2a2a2a',
          strong: '#444444',
          brutal: '#FACC15',
        },
        text: {
          primary: '#FAFAFA',
          secondary: '#A1A1AA',
          muted: '#71717A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        brutal: '4px 4px 0px 0px #FACC15',
        'brutal-sm': '2px 2px 0px 0px #FACC15',
        'brutal-lg': '6px 6px 0px 0px #FACC15',
        'brutal-white': '4px 4px 0px 0px #FAFAFA',
        'brutal-green': '4px 4px 0px 0px #22C55E',
        'brutal-red': '4px 4px 0px 0px #EF4444',
        'brutal-blue': '4px 4px 0px 0px #3B82F6',
        'brutal-purple': '4px 4px 0px 0px #A855F7',
        glow: '0 0 20px rgba(250, 204, 21, 0.15)',
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.15)',
      },
      borderWidth: {
        3: '3px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'streak-glow': 'streakGlow 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        bounceIn: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        streakGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(250, 204, 21, 0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(250, 204, 21, 0.5)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

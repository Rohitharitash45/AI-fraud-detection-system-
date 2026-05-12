/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body:    ['DM Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#EEF3FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          500: '#3B82F6',
          600: '#1B5EF7',
          700: '#1449D4',
          800: '#1e3a8a',
        },
      },
      borderRadius: {
        xl:  '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      boxShadow: {
        card:       '0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)',
        'card-hover':'0 4px 16px rgba(0,0,0,.08), 0 1px 3px rgba(0,0,0,.04)',
        brand:      '0 4px 14px rgba(27,94,247,.35)',
      },
      animation: {
        'fade-up':    'fadeUp .25s ease both',
        'shake':      'shake .4s ease',
        'pulse-ring': 'pulse-ring 1.5s ease infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%':     { transform: 'translateX(-6px)' },
          '40%':     { transform: 'translateX(6px)' },
          '60%':     { transform: 'translateX(-4px)' },
          '80%':     { transform: 'translateX(4px)' },
        },
        'pulse-ring': {
          '0%':   { boxShadow: '0 0 0 0 rgba(27,94,247,.3)' },
          '70%':  { boxShadow: '0 0 0 8px rgba(27,94,247,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(27,94,247,0)' },
        },
      },
    },
  },
  plugins: [],
}
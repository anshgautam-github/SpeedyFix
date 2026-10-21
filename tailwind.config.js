/** Merge `theme.extend` into your existing config if you already use Tailwind. */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        midnight: '#060A13',
        navy: { 900: '#0A1226', 800: '#0E1A36', 700: '#16264A' },
        volt: { DEFAULT: '#1F6BFF', soft: '#3B8BFF', glow: '#5BA2FF' },
        silver: { DEFAULT: '#C9D3E3', dim: '#8C9BB5' },
        paper: '#F3F6FB',
        ok: '#34D399',
      },
      fontFamily: {
        display: ['Archivo', 'Instrument Sans', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        sans: ['"Instrument Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

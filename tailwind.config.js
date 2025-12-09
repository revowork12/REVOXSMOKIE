/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#c4c4c4',
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#c4c4c4',
          600: '#a8a8a8',
          700: '#8c8c8c',
          800: '#525252',
          900: '#404040',
        },
        secondary: {
          DEFAULT: '#214194',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#214194',
          600: '#1e3a8a',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        accent: {
          DEFAULT: '#CC2133',
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#CC2133',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        // Keep old names for backward compatibility
        navy: {
          DEFAULT: '#214194',
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#214194',
          600: '#1e3a8a',
          700: '#1d4ed8',
        },
        cream: {
          DEFAULT: '#c4c4c4',
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
        },
      },
      fontFamily: {
        montserrat: ['Montserrat', 'sans-serif'],
        sans: ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
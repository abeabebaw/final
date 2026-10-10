/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        crprs: {
          50: '#f5f8f4',
          100: '#ebf2ec',
          200: '#dfece6',
          300: '#bfd4c8',
          400: '#9ab9a5',
          500: '#6d9384',
          600: '#4c6f62',
          700: '#2d5046',
          800: '#123f32',
          900: '#0d2f2a',
        },
        gold: {
          50: '#fffaf0',
          100: '#fef3cf',
          200: '#fbe7a3',
          300: '#f3d77b',
          400: '#d8ae47',
          500: '#c29b31',
          600: '#a67c1d',
        }
      },
      boxShadow: {
        brand: '0 10px 25px rgba(18, 63, 50, 0.18)',
      }
    },
  },
  plugins: [],
}

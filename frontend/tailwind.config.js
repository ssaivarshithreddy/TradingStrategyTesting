/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#060913',
          900: '#0B0F19',
          800: '#121824',
          700: '#1B2330',
        },
        slatecard: '#151C2C',
        gold: {
          light: '#F1D26F',
          DEFAULT: '#D4AF37',
          dark: '#B08E22',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

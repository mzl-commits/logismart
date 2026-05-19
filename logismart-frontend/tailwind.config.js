/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      },
      colors: {
        'main-bg': '#0D1F23',
        surface: '#132E35',
        surface2: '#2D4A53',
        accent: '#69818D',
        muted: '#5A636A',
        light: '#AFB3B7',
      }
    }
  },
  plugins: [],
}

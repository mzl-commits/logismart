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
        'main-bg': 'var(--color-main-bg)',     // Dinámico por tema
        surface: 'var(--color-surface)',       // Dinámico por tema
        surface2: 'var(--color-surface2)',     // Dinámico por tema
        accent: 'var(--color-accent)',         // Dinámico por tema
        muted: 'var(--color-muted)',           // Dinámico por tema
        light: 'var(--color-light)',           // Dinámico por tema
      }
    }
  },
  plugins: [],
}

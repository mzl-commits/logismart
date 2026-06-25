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
        'main-bg': '#0A0A0C',     // Negro carbón profundo
        surface: '#121214',       // Gris oscuro de primer nivel (tarjetas)
        surface2: '#1E1E22',      // Gris oscuro interactivo (hovers, botones secundarios)
        accent: '#8E95A5',        // Gris acero para elementos destacados
        muted: '#94A3B8',         // Gris medio de alta legibilidad para textos secundarios
        light: '#F8FAFC',         // Blanco grisáceo para textos principales
      }
    }
  },
  plugins: [],
}

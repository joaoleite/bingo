/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#e94560',
        dark: '#1a1a2e',
        darker: '#16213e',
        light: '#f5f5f5'
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
      }
    },
  },
  plugins: [],
}

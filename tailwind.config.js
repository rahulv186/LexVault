/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'security-black': '#0a0a0a',
        'security-gray-900': '#121212',
        'security-gray-800': '#1a1a1a',
        'security-gray-700': '#242424',
        'security-accent': '#00ffaa',
      },
    },
  },
  plugins: [],
}

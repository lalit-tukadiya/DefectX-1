/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        industrial: {
          dark: '#0b0f19',
          card: '#131b2e',
          border: '#1f293d',
          accent: '#06b6d4',
          pass: '#10b981',
          reject: '#ef4444',
          warning: '#f59e0b',
        }
      }
    },
  },
  plugins: [],
}

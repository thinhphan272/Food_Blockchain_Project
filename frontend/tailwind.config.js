/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#10b981", // Emerald green for fresh food
        secondary: "#0284c7" // Ocean blue for cold chain
      }
    },
  },
  plugins: [],
}

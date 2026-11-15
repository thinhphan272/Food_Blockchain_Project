/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: "#F95716",
          hover: "#E0430B",
          light: "#FFF3ED",
        },
        momentum: {
          orange: "#F95716",
          orangeDark: "#E0430B",
          darkBg: "#120C08",
          darkCard: "#1C140F",
          lightBg: "#F6F3F0",
          lightCard: "#FFFFFF",
        }
      },
      boxShadow: {
        'momentum-card': '0 8px 30px rgba(0, 0, 0, 0.04)',
        'momentum-orange': '0 8px 20px rgba(249, 87, 22, 0.35)',
        'momentum-glass': '0 8px 32px rgba(120, 40, 0, 0.18)',
      }
    },
  },
  plugins: [],
}

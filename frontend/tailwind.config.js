/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bakery: {
          black: "#0b0b0b",
          red: "#b30000",
          brown: "#2b1b17",
          gold: "#d4af37",
          darkGray: "#121212",
          cardBg: "rgba(18, 18, 18, 0.7)",
          cardBorder: "rgba(179, 0, 0, 0.2)"
        }
      },
      boxShadow: {
        'neon-red': '0 0 10px rgba(179, 0, 0, 0.4), 0 0 20px rgba(179, 0, 0, 0.2)',
        'neon-red-strong': '0 0 15px rgba(179, 0, 0, 0.6), 0 0 30px rgba(179, 0, 0, 0.3)',
        'neon-gold': '0 0 10px rgba(212, 175, 55, 0.4)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s infinite alternate',
      },
      keyframes: {
        pulseGlow: {
          '0%': { boxShadow: '0 0 5px rgba(179, 0, 0, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(179, 0, 0, 0.6)' },
        }
      }
    },
  },
  plugins: [],
}

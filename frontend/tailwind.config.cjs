module.exports = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#E1002A",
          dark: "#B8001F",
          light: "#FFF0F3",
        },
        accent: {
          DEFAULT: "#0D2240",
          light: "#1A3A5C",
        },
        hays: {
          red: "#E1002A",
          "red-dark": "#B8001F",
          "red-light": "#FFF0F3",
          navy: "#0D2240",
          "navy-light": "#1A3A5C",
          "navy-lighter": "#2A5080",
          gold: "#C5A253",
        },
        soft: "#F5F6F8",
        slate: {
          950: "#020617",
        }
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Roboto Slab', 'Georgia', 'serif'],
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      }
    }
  },
  plugins: []
};

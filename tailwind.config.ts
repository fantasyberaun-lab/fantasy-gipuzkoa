import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Fondo de la app (claro / oscuro). Sacados del escudo del club.
        board: {
          light: "#F5F3FB",
          dark: "#0B0A1C",
        },
        // Morado del club. Se usa a través de variables CSS (ver globals.css)
        // para que en modo oscuro sea un punto más claro y se lea bien.
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          hover: "rgb(var(--accent-hover) / <alpha-value>)",
        },
        // Escala completa del morado, por si quieres usarla en algún sitio.
        brand: {
          50: "#F5F0FF",
          100: "#EBE0FF",
          200: "#D6BFFF",
          300: "#B98CFF",
          400: "#9F5CFE",
          500: "#842FFD",
          600: "#6D22E0",
          700: "#5A17BD",
          800: "#431190",
          900: "#2E0C66",
          950: "#170634",
        },
        // Amarillo del club: solo para detalles (pestaña activa, saldo,
        // avisos). Si se abusa de él, pierde fuerza.
        gold: {
          DEFAULT: "#FFD426",
          dark: "#E0B400",
        },
        // Grises con un pequeño tinte azul-violeta para que combinen con el
        // morado. Al redefinir "neutral", todas las clases neutral-* que ya
        // hay en la app cambian solas.
        neutral: {
          50: "#F7F6FB",
          100: "#EFEDF7",
          200: "#E1DEEE",
          300: "#CBC6DE",
          400: "#9A94B3",
          500: "#746D90",
          600: "#57516E",
          700: "#3F3A55",
          800: "#2A2640",
          900: "#15122A",
          950: "#0E0C1E",
        },
        positive: "#2E7D32",
        negative: "#C62828",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
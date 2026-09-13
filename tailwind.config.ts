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
        // Paleta provisional inspirada en el tablero de ajedrez: base neutra
        // + un acento. Se puede/debe afinar en la fase de diseño visual.
        board: {
          light: "#EDEAE3",
          dark: "#141416",
        },
        accent: {
          DEFAULT: "#2F6F4E", // verde tablero
          hover: "#255A3F",
        },
        positive: "#2E7D32",
        negative: "#C62828",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

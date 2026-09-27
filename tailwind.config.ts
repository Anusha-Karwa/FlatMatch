import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Aqua brand (500 = #4AD1C4). Light shades carry dark text; 700+ carry white text.
        brand: {
          50: "#effcfa",
          100: "#d2f6f2",
          200: "#a6ece5",
          300: "#74dfd4",
          400: "#5ed8cc",
          500: "#4ad1c4",
          600: "#259c91",
          700: "#1f7f77",
          800: "#1d6560",
          900: "#1a524e",
          950: "#0b3431",
        },
        // Warm sand accent for price tags and highlights
        sand: {
          50: "#fbf7ef",
          100: "#f5ecd9",
          200: "#ead7b0",
          300: "#dcbd80",
          400: "#cfa45a",
          500: "#b98a3e",
          600: "#9a6f31",
        },
        ink: "#15241b",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(21,36,27,0.04), 0 8px 24px -8px rgba(21,36,27,0.12)",
        lift: "0 2px 4px rgba(21,36,27,0.05), 0 18px 40px -12px rgba(22,62,42,0.28)",
      },
    },
  },
  plugins: [],
};

export default config;

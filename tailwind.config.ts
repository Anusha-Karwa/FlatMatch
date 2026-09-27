import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Sea green brand (500 = #2E8B57)
        brand: {
          50: "#eff8f2",
          100: "#d9efe1",
          200: "#b5dfc6",
          300: "#86c9a3",
          400: "#55ad7d",
          500: "#2e8b57",
          600: "#257549",
          700: "#1f5e3c",
          800: "#1b4c32",
          900: "#163e2a",
          950: "#0c2418",
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

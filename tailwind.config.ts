import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7f6",
          100: "#d5ecea",
          200: "#aad9d4",
          500: "#2a9d8f",
          600: "#23857a",
          700: "#1d6b62",
          900: "#12403b",
        },
        ink: "#1f2a37",
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0B1F3A",
          800: "#16345C",
          700: "#1E4578",
        },
        sand: "#F3F0E8",
        ink: "#142033",
        muted: "#5C6B7A",
        line: "#D5DDE6",
        pine: "#0F6E56",
        clay: "#9F1239",
        amber: "#8A5A00",
      },
      fontFamily: {
        sans: ["Avenir Next", "Segoe UI", "Helvetica Neue", "sans-serif"],
        serif: ["Iowan Old Style", "Palatino Linotype", "Palatino", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(11, 31, 58, 0.06), 0 8px 24px rgba(11, 31, 58, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;

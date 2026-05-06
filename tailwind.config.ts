import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-fraunces)", "Georgia", "Times New Roman", "serif"]
      },
      colors: {
        paper: "#ffffff",
        parchment: "#fbf3e7",
        ink: "#1a1614",
        "ink-soft": "#5e564e",
        rule: "#e6dccb",
        claret: {
          DEFAULT: "#8a1d1d",
          deep: "#6e1414"
        },
        moss: "#2f5d3a",
        mustard: "#9a6b1a"
      }
    }
  },
  plugins: []
};

export default config;

import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Georgia", "ui-serif", "serif"],
      },
      colors: {
        curtain: {
          bg: "#0e0a0d",
          panel: "#1a1216",
          ink: "#f4ead5",
          accent: "#c9a96e",
          velvet: "#5b1a1f",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

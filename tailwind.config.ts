import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Tajawal", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        control: "0 1px 2px var(--ring-shadow)",
        card: "0 1px 3px var(--ring-shadow), 0 1px 2px var(--ring-shadow)",
        "card-md": "0 4px 12px var(--ring-shadow), 0 2px 6px var(--ring-shadow)",
        "card-lg": "0 8px 24px var(--ring-shadow), 0 4px 12px var(--ring-shadow)",
        "inset-border": "inset 0 0 0 1px var(--border)",
      },
      borderRadius: {
        "2xl": "12px",
        "3xl": "16px",
        "4xl": "20px",
      },
      animation: {
        "fade-in": "fadeIn 200ms ease forwards",
        "slide-up": "slideUp 200ms ease forwards",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

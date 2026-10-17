import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "background-dark": "#090A0F",
        "surface-dark": "#12141D",
        "surface-border": "#1E2235",
        "brand-primary": "#6366F1",
        "brand-secondary": "#06B6D4",
        "text-primary": "#F8FAFC",
        "text-secondary": "#94A3B8",
        success: "#10B981",
        danger: "#EF4444",
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          500: "#6366F1",
          600: "#4f46e5",
          700: "#4338ca",
          900: "#312e81",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        heading: ["Plus Jakarta Sans", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      boxShadow: {
        "ambient-glow": "0 0 35px -5px rgba(99, 102, 241, 0.15)",
        "ambient-cyan": "0 0 35px -5px rgba(6, 182, 212, 0.15)",
      },
    },
  },
  plugins: [],
};

export default config;

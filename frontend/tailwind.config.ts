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
        // Palette from Color Specification
        "background-dark": "#0B132B", // Dark Primary
        "surface-dark": "#0C1A2B",    // Circuit Navy
        "surface-border": "#1A283D",  // High-contrast border
        "brand-primary": "#B6FF3B",   // Solar Lime
        "solar-lime": "#B6FF3B",      // Solar Lime accent
        "circuit-navy": "#0C1A2B",    // Circuit Navy
        "dark-primary": "#0B132B",    // Dark Primary
        "light-primary": "#F8F9FA",   // Light Primary
        "brand-secondary": "#38BDF8", // Cyan / Electric Secondary
        "text-primary": "#F8F9FA",    // High-contrast primary text
        "text-secondary": "#94A3B8",  // Clean muted secondary text
        success: "#10B981",
        danger: "#EF4444",
        brand: {
          50: "#f7fee7",
          100: "#ecfccb",
          200: "#d9f99d",
          300: "#bef264",
          400: "#B6FF3B",
          500: "#B6FF3B",
          600: "#84cc16",
          700: "#65a30d",
          900: "#365314",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        heading: ["var(--font-heading)", "Space Grotesk", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
        display: ["var(--font-heading)", "Space Grotesk", "sans-serif"],
      },
      boxShadow: {
        "ambient-glow": "0 0 35px -5px rgba(182, 255, 59, 0.20)",
        "solar-glow": "0 0 25px 0px rgba(182, 255, 59, 0.35)",
        "circuit-glow": "0 0 30px 2px rgba(12, 26, 43, 0.8)",
        "ambient-cyan": "0 0 35px -5px rgba(56, 189, 248, 0.20)",
      },
    },
  },
  plugins: [],
};

export default config;

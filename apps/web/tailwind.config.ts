import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        pv: {
          bg: "#0e0f12",
          panel: "#16181d",
          panel2: "#1c1f26",
          border: "#2a2e38",
          accent: "#3d8bfd",
          accent2: "#2ecc9a",
          danger: "#e85d5d",
          muted: "#8b93a7",
          text: "#eef1f6",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Segoe UI", "sans-serif"],
        mono: ["var(--font-mono)", "Consolas", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(61,139,253,0.35), 0 8px 24px rgba(0,0,0,0.45)",
      },
    },
  },
  plugins: [],
};

export default config;

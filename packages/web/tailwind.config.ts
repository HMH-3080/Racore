import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#0a0a0a",
        "surface-1": "#141414",
        "surface-2": "#1e1e1e",
        ink: "#ffffff",
        "ink-muted": "#999999",
        "accent-blue": "#0099ff",
        hairline: "rgba(255,255,255,0.08)",
        "hairline-soft": "rgba(255,255,255,0.04)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Inter", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "Inter", "system-ui", "sans-serif"],
        mono: ["'Geist Mono'", "ui-monospace", "monospace"],
      },
      fontSize: {
        "display-xxl": ["110px", { lineHeight: "0.85", letterSpacing: "-5.5px" }],
        "display-xl": ["85px", { lineHeight: "0.95", letterSpacing: "-4.25px" }],
        "display-lg": ["62px", { lineHeight: "1.00", letterSpacing: "-3.1px" }],
        "display-md": ["32px", { lineHeight: "1.13", letterSpacing: "-1.0px" }],
        headline: ["22px", { lineHeight: "1.20", letterSpacing: "-0.8px" }],
        subhead: ["24px", { lineHeight: "1.30", letterSpacing: "-0.01px" }],
        "body-lg": ["18px", { lineHeight: "1.30", letterSpacing: "-0.18px" }],
        body: ["15px", { lineHeight: "1.30", letterSpacing: "-0.15px" }],
        "body-sm": ["14px", { lineHeight: "1.40", letterSpacing: "-0.14px" }],
        caption: ["13px", { lineHeight: "1.20", letterSpacing: "-0.13px" }],
        micro: ["12px", { lineHeight: "1.20", letterSpacing: "-0.12px" }],
        btn: ["14px", { lineHeight: "1.0", letterSpacing: "-0.14px" }],
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "10px",
        lg: "15px",
        xl: "20px",
        xxl: "30px",
        pill: "100px",
        full: "9999px",
      },
      spacing: {
        hair: "1px",
        xxs: "4px",
        xs: "8px",
        sm: "12px",
        md: "15px",
        lg: "20px",
        xl: "30px",
        xxl: "40px",
        section: "96px",
      },
      boxShadow: {
        "light-edge":
          "0 0.5px 0 0 rgba(255,255,255,0.10), 0 10px 30px 0 rgba(0,0,0,0.25)",
        "blue-ring": "0 0 0 1px rgba(0,153,255,0.15)",
        "selected": "0 0 0 1px rgba(0,153,255,0.40)",
      },
    },
  },
  plugins: [],
};

export default config;

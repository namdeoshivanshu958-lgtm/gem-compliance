/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      colors: {
        // Primary — Government Blue & institutional shades
        primary: {
          50: "#eaf2fa",
          100: "#d6e5f6",
          200: "#b3cfef",
          300: "#81b1e4",
          400: "#498dd6",
          500: "#2468b5",
          600: "#1f5faf", // Government Blue
          700: "#184b8c",
          800: "#163a63", // Secondary Navy
          900: "#0b1f3a", // Deep Government Navy
          950: "#071426",
        },
        // Navy — deep desaturated government blue
        navy: {
          50: "#f4f7fa",
          100: "#e6ecf4",
          200: "#c7d4e5",
          300: "#9fb5d1",
          400: "#6e8db6",
          500: "#4b6f9c",
          600: "#375680",
          700: "#294163",
          800: "#163a63", // Secondary Navy
          900: "#0b1f3a", // Deep Government Navy
          950: "#071426",
        },
        // Strict government semantic colors
        gov: {
          navy: "#0B1F3A",
          secnavy: "#163A63",
          blue: "#1F5FAF",
          lightblue: "#EAF2FA",
          bg: "#F5F7FA",
          surface: "#FFFFFF",
          border: "#D9E1EA",
          text: "#172033",
          muted: "#5B6878",
          success: "#16845B",
          warning: "#C98200",
          danger: "#C63D3D",
          info: "#2468B5",
        },
        success: {
          50: "#eaf8f1",
          100: "#cef0df",
          200: "#a3e1c4",
          300: "#6fc9a3",
          400: "#3dae81",
          500: "#21996c",
          600: "#16845b", // Strict Gov Success
          700: "#126a4a",
          800: "#11543c",
          900: "#0f4533",
        },
        warning: {
          50: "#fef9ec",
          100: "#fdf0cd",
          200: "#fbe09a",
          300: "#f7cc61",
          400: "#f2b32b",
          500: "#e09a09",
          600: "#c98200", // Strict Gov Warning
          700: "#a06305",
          800: "#804e0b",
          900: "#6a400e",
        },
        danger: {
          50: "#fdf3f3",
          100: "#fbe3e3",
          200: "#f7cacb",
          300: "#f1a4a6",
          400: "#e87377",
          500: "#db484e",
          600: "#c63d3d", // Strict Gov Danger
          700: "#a52d2d",
          800: "#892828",
          900: "#742626",
        },
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(11, 31, 58, 0.06), 0 1px 2px 0 rgba(11, 31, 58, 0.04)",
        "card-hover":
          "0 3px 8px -1px rgba(11, 31, 58, 0.08), 0 1px 4px -1px rgba(11, 31, 58, 0.05)",
        elevated:
          "0 8px 24px -4px rgba(11, 31, 58, 0.12), 0 2px 8px -2px rgba(11, 31, 58, 0.06)",
        glass:
          "0 4px 16px 0 rgba(11, 31, 58, 0.08), inset 0 0 0 1px rgba(255, 255, 255, 0.6)",
        focus: "0 0 0 3px rgba(31, 95, 175, 0.25)",
      },
      borderRadius: {
        card: "8px",
        panel: "10px",
        input: "6px",
        btn: "7px",
        modal: "10px",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.98)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.18s ease-out",
        "slide-up": "slide-up 0.2s ease-out",
        "scale-in": "scale-in 0.15s ease-out",
      },
      backgroundImage: {
        "sidebar-gradient":
          "linear-gradient(180deg, #0B1F3A 0%, #102644 60%, #071426 100%)",
        "brand-gradient":
          "linear-gradient(135deg, #0B1F3A 0%, #163A63 50%, #1F5FAF 100%)",
      },
    },
  },
  plugins: [],
}

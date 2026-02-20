import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary)",
        secondary: "var(--secondary)",
        "background-light": "var(--background-light)",
        "surface-light": "var(--surface-light)",
        error: "var(--error)",
        warning: "var(--warning)",
        success: "var(--success)",
        info: "var(--info)",
        scheduled: "var(--scheduled)",
        cancelled: "var(--cancelled)",
      },
    },
  },
  plugins: [],
} satisfies Config;

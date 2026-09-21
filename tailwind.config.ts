import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 18px 80px rgba(157, 55, 21, 0.18)",
      },
      letterSpacing: {
        micro: "0.18em",
      },
    },
  },
  plugins: [],
};

export default config;

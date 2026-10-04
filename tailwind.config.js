/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { 950: "#060d1f", 900: "#0a1530", 800: "#0f1f45", 700: "#172a5c" },
        electric: { DEFAULT: "#2f6bff", 600: "#2559d9" },
        accent: "#ffc531",
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};

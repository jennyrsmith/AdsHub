export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: { DEFAULT: "8px" },
      boxShadow: { card: "0 6px 16px rgba(0,0,0,0.08)" },
      colors: {
        ink: "#0F172A",
        muted: "#64748B",
        surface: "#FFFFFF",
        surfaceAlt: "#F8FAFC",
        border: "#E2E8F0",
        brand: { DEFAULT: "#4F46E5", fg: "#FFFFFF" }
      }
    }
  },
  plugins: []
};

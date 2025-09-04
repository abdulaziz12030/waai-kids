import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#3BA4F0",
          yellow: "#FFCF4A",
          green: "#3CCF91"
        }
      }
    }
  },
  plugins: []
};
export default config;

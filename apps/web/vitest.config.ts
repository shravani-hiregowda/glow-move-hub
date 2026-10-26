import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@jerai/shared": path.resolve(__dirname, "../../packages/shared/src"),
      "@functions": path.resolve(__dirname, "../../functions"),
    },
  },
  server: {
    fs: {
      allow: ["..", "../../functions"],
    },
  },
});

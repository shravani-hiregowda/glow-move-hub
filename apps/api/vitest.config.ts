import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname),
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.{test,spec}.ts"],
  },
  resolve: {
    alias: {
      "@jerai/shared": path.resolve(__dirname, "../../packages/shared/src"),
    },
  },
});

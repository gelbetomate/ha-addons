import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/ulux-display-panel.ts"),
      name: "UluxDisplayPanel",
      fileName: () => "ulux-display-panel.js",
      formats: ["es"],
    },
    outDir: "dist",
    emptyOutDir: false,
    rollupOptions: {
      external: [],
    },
    minify: true,
    sourcemap: false,
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});

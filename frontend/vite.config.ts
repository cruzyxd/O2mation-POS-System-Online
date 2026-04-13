import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  optimizeDeps: {
    include: ["lucide-react"],
  },
  plugins: [tailwindcss(), react(), tsconfigPaths()],
  resolve: {
    // In an npm workspace, React is hoisted to the root node_modules.
    // dedupe ensures Vite resolves a single instance from there.
    dedupe: ["react", "react-dom", "@tanstack/react-query"],
    alias: {
      react: path.resolve(__dirname, "../node_modules/react"),
      "react-dom": path.resolve(__dirname, "../node_modules/react-dom"),
    },
  },
  server: {
    port: 5173,
  },
});

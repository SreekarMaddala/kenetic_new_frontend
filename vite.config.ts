import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const apiTarget = (process.env.VITE_API_BASE_URL || env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

  return {
  server: {
    proxy: apiTarget ? {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api(?=\/|$)/, ""),
      },
    } : undefined,
  },
  // amazon-cognito-identity-js still references Node's `global` identifier.
  // In a browser build, map it to the standard global object before loading
  // the SDK so authentication cannot crash the entire React application.
  define: {
    global: "globalThis",
  },
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    TanStackRouterVite({
      autoCodeSplitting: true,
    }),
    react(),
  ],
  assetsInclude: ["**/*.glb"],
  };
});

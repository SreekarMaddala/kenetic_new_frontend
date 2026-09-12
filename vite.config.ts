import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
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
});

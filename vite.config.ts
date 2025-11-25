import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(async () => {
  const plugins: any[] = [
    react(),
    runtimeErrorOverlay(),
  ];

  // 只在 Replit 環境中載入這些插件
  if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {
    try {
      const [cartographerModule, devBannerModule] = await Promise.all([
        import("@replit/vite-plugin-cartographer"),
        import("@replit/vite-plugin-dev-banner"),
      ]);
      plugins.push(
        cartographerModule.cartographer(),
        devBannerModule.devBanner(),
      );
    } catch (error) {
      console.warn("Failed to load Replit plugins:", error);
    }
  }

  return {
    plugins,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  };
});

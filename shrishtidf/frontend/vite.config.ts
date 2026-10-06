import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Shrishti A2 Milk",
        short_name: "Shrishti A2",
        description: "Farm Fresh Certified A2 milk",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/app",
        icons: [
          {
            src: "/assets/logo.webp",
            sizes: "192x192",
            type: "image/webp",
          },
          {
            src: "/assets/logo.webp",
            sizes: "512x512",
            type: "image/webp",
          }
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5555",
        changeOrigin: true,
      },
    },
  },
});

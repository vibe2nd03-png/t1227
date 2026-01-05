import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React 코어
          "vendor-react": ["react", "react-dom"],
          // 지도 라이브러리
          "vendor-map": ["leaflet", "react-leaflet"],
          // 차트 라이브러리
          "vendor-chart": ["chart.js", "react-chartjs-2"],
          // Supabase
          "vendor-supabase": ["@supabase/supabase-js"],
        },
      },
    },
  },
});

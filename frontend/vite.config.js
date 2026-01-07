import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // 프로덕션 빌드에서 console 제거
  esbuild: {
    drop: ["console", "debugger"],
  },
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
    // 프로덕션 최적화
    target: "es2020",
    minify: "esbuild",
    // CSS 최적화
    cssMinify: true,
    // 소스맵 비활성화 (프로덕션)
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // React 코어
          "vendor-react": ["react", "react-dom"],
          // 지도 라이브러리
          "vendor-map": ["leaflet", "react-leaflet"],
          // Supabase
          "vendor-supabase": ["@supabase/supabase-js"],
          // Chart.js는 WeatherComparisonChart와 함께 지연 로딩됨
        },
      },
    },
  },
});

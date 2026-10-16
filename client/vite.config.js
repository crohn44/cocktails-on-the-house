import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Forward API calls to the Node server so cookies work on one origin.
    proxy: {
      // changeOrigin must stay false: the API rejects writes whose Origin doesn't match the Host
      // header, and Vite's string shorthand would rewrite Host to localhost:3001.
      "/api": { target: "http://localhost:3001", changeOrigin: false },
    },
  },
});

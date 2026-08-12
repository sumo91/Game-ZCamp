import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  // GitHub Pages serves this repository below /Game-ZCamp/; keep the dev
  // server at / so local development remains directly accessible.
  base: command === "build" ? "/Game-ZCamp/" : "/",
  server: {
    host: "0.0.0.0",
  },
}));

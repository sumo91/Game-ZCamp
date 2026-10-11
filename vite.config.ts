import { defineConfig } from "vite";

export default defineConfig(({ command, isPreview }) => ({
  // Preview must serve the same repository base baked into the build's assets.
  // Keep only the development server at /.
  base: command === "build" || isPreview === true ? "/Game-ZCamp/" : "/",
  server: {
    host: "0.0.0.0",
  },
}));

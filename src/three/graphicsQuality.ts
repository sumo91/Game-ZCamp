export type GraphicsQuality = "standard" | "low";
export const GRAPHICS_QUALITY = {
  standard: { label: "标准", maxDpr: 1.5, shadowSize: 1024, animationHz: 30, decorations: true },
  low: { label: "流畅", maxDpr: 1, shadowSize: 0, animationHz: 15, decorations: false },
} as const;
const KEY = "zcamp.graphics-quality.v1";
export function readGraphicsQuality(): GraphicsQuality {
  try { return localStorage.getItem(KEY) === "low" ? "low" : "standard"; } catch { return "standard"; }
}
export function saveGraphicsQuality(quality: GraphicsQuality): void {
  try { localStorage.setItem(KEY, quality); } catch { /* Current session still uses the selection. */ }
}

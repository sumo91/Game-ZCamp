import Phaser from "phaser";

// Phaser 4.2.1's Graphics.fillTriangle command never renders on either pipeline;
// filled polygons must go through fillPoints (path -> FILL_PATH) instead.
// Shared scratch points avoid per-frame allocations across scenes.
const TRIANGLE_POINTS = [new Phaser.Math.Vector2(), new Phaser.Math.Vector2(), new Phaser.Math.Vector2()];

export function fillTriangle(graphics: Phaser.GameObjects.Graphics, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number): void {
  TRIANGLE_POINTS[0]!.set(x0, y0);
  TRIANGLE_POINTS[1]!.set(x1, y1);
  TRIANGLE_POINTS[2]!.set(x2, y2);
  graphics.fillPoints(TRIANGLE_POINTS, true);
}

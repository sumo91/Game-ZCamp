import Phaser from "phaser";
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from "../layout";

type PulseTarget = Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text | Phaser.GameObjects.Graphics;
type ModalTarget = Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text;

/**
 * Owns every presentation-only tween and camera effect. The scene keeps its per-frame
 * redraw in renderState(); this layer only adds transient motion on top of it.
 */
export class FxDirector {
  public constructor(private readonly scene: Phaser.Scene) {}

  public pressPulse(target: PulseTarget): void {
    this.scene.tweens.killTweensOf(target);
    target.setScale(0.93);
    this.scene.tweens.add({ targets: target, scale: 1, duration: 220, ease: "Back.easeOut" });
  }

  public textPulse(target: Phaser.GameObjects.Text, peak = 1.3): void {
    this.scene.tweens.killTweensOf(target);
    target.setScale(1);
    this.scene.tweens.add({ targets: target, scale: peak, duration: 90, yoyo: true, ease: "Quad.easeOut" });
  }

  public errorShake(target: PulseTarget): void {
    this.scene.tweens.killTweensOf(target);
    const originalX = target.x;
    this.scene.tweens.add({
      targets: target,
      x: { from: originalX - 7, to: originalX },
      duration: 260,
      ease: "Elastic.easeOut",
    });
  }

  /** Entrance for overlays/panels/titles: alpha + rise. Only for objects whose alpha is not rewritten per frame. */
  public modalIn(objects: readonly ModalTarget[]): void {
    objects.forEach((object, index) => {
      const targetAlpha = object.alpha;
      const targetY = object.y;
      object.setAlpha(0).setY(targetY + 16);
      this.scene.tweens.add({
        targets: object,
        alpha: targetAlpha,
        y: targetY,
        duration: 180,
        delay: index * 35,
        ease: "Quad.easeOut",
      });
    });
  }

  /** Staggered scale entrance for option buttons whose alpha is managed by renderState every frame. */
  public stackIn(objects: readonly PulseTarget[], delayStepMs = 70): void {
    objects.forEach((object, index) => {
      object.setScale(0.85);
      this.scene.tweens.add({
        targets: object,
        scale: 1,
        duration: 220,
        delay: index * delayStepMs,
        ease: "Back.easeOut",
      });
    });
  }

  public shake(durationSeconds: number, intensity: number): void {
    if (durationSeconds <= 0 || intensity <= 0) return;
    this.scene.cameras.main.shake(Math.round(durationSeconds * 1000), intensity);
  }

  public zoomPunch(amount = 0.035): void {
    const camera = this.scene.cameras.main;
    this.scene.tweens.killTweensOf(camera);
    camera.setZoom(1);
    this.scene.tweens.add({ targets: camera, zoom: 1 + amount, duration: 110, yoyo: true, ease: "Quad.easeOut" });
  }

  public edgeFlash(color: number, peakAlpha: number, durationSeconds = 0.26): void {
    if (peakAlpha <= 0) return;
    const flash = this.scene.add.rectangle(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, LOGICAL_WIDTH, LOGICAL_HEIGHT, color, 1).setDepth(69);
    flash.setAlpha(peakAlpha);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: Math.round(durationSeconds * 1000),
      ease: "Quad.easeOut",
      onComplete: () => flash.destroy(),
    });
  }

  /** Rising fading combat text (damage numbers, coin labels). Self-destructs. */
  public floatText(x: number, y: number, text: string, color: string, size = 17): void {
    const label = this.scene.add.text(x, y, text, { fontFamily: "Noto Sans SC, Microsoft YaHei, system-ui, sans-serif", fontSize: size + "px", color, stroke: "#1c1508", strokeThickness: 3 }).setOrigin(0.5).setDepth(30);
    this.scene.tweens.add({
      targets: label,
      y: y - 30,
      alpha: 0,
      duration: 620,
      ease: "Quad.easeOut",
      onComplete: () => label.destroy(),
    });
  }

  /** Coin dot flying to a resource counter; optional text label rides along. Self-destructs. */
  public flyCoin(fromX: number, fromY: number, toX: number, toY: number, label: string | null): void {
    const coin = this.scene.add.graphics().setDepth(30);
    coin.fillStyle(0xf6c453, 1).fillCircle(0, 0, 7);
    coin.lineStyle(2, 0x714c17, 1).strokeCircle(0, 0, 5);
    coin.setPosition(fromX, fromY);
    this.scene.tweens.add({
      targets: coin,
      x: toX,
      y: toY,
      duration: 480,
      ease: "Cubic.easeIn",
      onComplete: () => coin.destroy(),
    });
    if (label !== null) {
      const text = this.scene.add.text(fromX, fromY - 14, label, { fontFamily: "Noto Sans SC, Microsoft YaHei, system-ui, sans-serif", fontSize: "15px", color: "#f6c453", stroke: "#1c1508", strokeThickness: 3 }).setOrigin(0.5).setDepth(30);
      this.scene.tweens.add({
        targets: text,
        x: toX,
        y: toY - 10,
        duration: 480,
        ease: "Cubic.easeIn",
        onComplete: () => text.destroy(),
      });
    }
  }

  /** Big center wave banner: slides in, holds, fades out. Self-destructs. */
  public waveBanner(text: string, color: string, isBossWave: boolean): void {
    const label = this.scene.add.text(LOGICAL_WIDTH / 2, 400, text, { fontFamily: "Noto Sans SC, Microsoft YaHei, system-ui, sans-serif", fontSize: (isBossWave ? 44 : 38) + "px", color, stroke: "#1a130a", strokeThickness: 7, fontStyle: "bold" }).setOrigin(0.5).setDepth(60).setAlpha(0);
    label.setY(430);
    this.scene.tweens.add({ targets: label, alpha: 1, y: 400, duration: 240, ease: "Back.easeOut" });
    this.scene.tweens.add({ targets: label, alpha: 0, duration: 420, delay: isBossWave ? 1500 : 1100, ease: "Quad.easeIn", onComplete: () => label.destroy() });
  }

  /** Boss name card: slams in from above scale, holds, fades. Self-destructs. */
  public bossEntrance(name: string, subtitle: string): void {
    const card = this.scene.add.rectangle(LOGICAL_WIDTH / 2, 560, 560, 150, 0x1c0f12, 0.92).setDepth(61).setStrokeStyle(3, 0xf06a6a, 1).setAlpha(0);
    const title = this.scene.add.text(LOGICAL_WIDTH / 2, 530, name, { fontFamily: "Noto Sans SC, Microsoft YaHei, system-ui, sans-serif", fontSize: "42px", color: "#f06a6a", stroke: "#2a0f12", strokeThickness: 6, fontStyle: "bold" }).setOrigin(0.5).setDepth(62).setAlpha(0).setScale(1.6);
    const hint = this.scene.add.text(LOGICAL_WIDTH / 2, 590, subtitle, { fontFamily: "Noto Sans SC, Microsoft YaHei, system-ui, sans-serif", fontSize: "19px", color: "#ffd9d9", stroke: "#2a0f12", strokeThickness: 4 }).setOrigin(0.5).setDepth(62).setAlpha(0);
    this.scene.tweens.add({ targets: card, alpha: 0.92, duration: 200, ease: "Quad.easeOut" });
    this.scene.tweens.add({ targets: title, alpha: 1, scale: 1, duration: 320, ease: "Back.easeOut" });
    this.scene.tweens.add({ targets: hint, alpha: 1, duration: 200, delay: 150 });
    const fadeOut = { targets: [card, title, hint], alpha: 0, duration: 380, delay: 1600, ease: "Quad.easeIn", onComplete: () => { card.destroy(); title.destroy(); hint.destroy(); } };
    this.scene.tweens.add(fadeOut);
  }

  /** Rolling number for result screens. formatter receives the current value each frame. */
  public countUp(target: Phaser.GameObjects.Text, from: number, to: number, durationSeconds: number, formatter: (value: number) => string, onDone?: () => void): void {
    const counter = { value: from };
    this.scene.tweens.add({
      targets: counter,
      value: to,
      duration: Math.round(durationSeconds * 1000),
      ease: "Cubic.easeOut",
      onUpdate: () => target.setText(formatter(Math.round(counter.value))),
      onComplete: () => {
        target.setText(formatter(to));
        onDone?.();
      },
    });
  }
}

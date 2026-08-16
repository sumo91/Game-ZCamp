import Phaser from "phaser";
import { starterHeroContent } from "../core/hero";
import type { HeroId, LevelId } from "../core/hero";
import { decideLobbyAction, deriveLobbyView } from "./lobbyUi";
import type { LobbyCardView, LobbyIntent, LobbyViewModel } from "./lobbyUi";
import { clearedLevelIdSet, loadProgression, recordSelection } from "./progressionStore";
import { FxDirector } from "./fx/FxDirector";
import { getSoundDirector } from "./fx/SoundDirector";
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from "./layout";

/** Clash-flavored material palette: night sky, warm wood panels, gold trim, two-tone bevels. */
const WOOD = { base: 0x6b4226, light: 0x7f512d, dark: 0x50311a, edge: 0x2f1c0e, selected: 0x8a5a2e, selectedLight: 0xa06a32 };
const RIBBON = { level: [0x3f7d46, 0x2f5f8a, 0x6a3f8a] as const, hero: [0x4e6e3a, 0x3a5560, 0x71502a] as const, edge: 0x1c2a16 };
const COLORS = { text: "#fff3d2", muted: "#cdbf9a", gold: 0xf6c453, paleGold: "#ffe9a0" };
const SILHOUETTE = 0x0a1416;

const CARD_WIDTH = 200;
const CARD_HEIGHT = 164;
const CARD_XS = [40, 260, 480];
const LEVEL_CARD_Y = 172;
const HERO_CARD_Y = 422;
const PREVIEW_Y = 628;
const HERO_CIRCLE_COLORS: Record<HeroId, number> = { camp_warden: 0x5b7042, vanguard_gunner: 0x5c6470, lumber_baron: 0x7a5a34 };
const HERO_SHORT_ROLES: Record<HeroId, string> = { camp_warden: "均衡", vanguard_gunner: "战斗", lumber_baron: "经济" };

interface CardWidgets {
  frame: Phaser.GameObjects.Rectangle;
  bevel: Phaser.GameObjects.Graphics;
  title: Phaser.GameObjects.Text;
  badge: Phaser.GameObjects.Text;
  detail: Phaser.GameObjects.Text;
  lock: Phaser.GameObjects.Graphics;
}

/** Drop shadow + base + top-light two-tone + thick edge: turns a flat panel into a chunky object. */
function drawBevel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, base: number, light: number, edge: number, selected: boolean): void {
  g.fillStyle(0x000000, 0.35).fillRect(x + 4, y + 5, w, h);
  g.fillStyle(base, 1).fillRect(x, y, w, h);
  g.fillStyle(light, 0.5).fillRect(x + 2, y + 2, w - 4, Math.floor(h * 0.42));
  g.lineStyle(selected ? 4 : 3, selected ? COLORS.gold : edge, 1).strokeRect(x, y, w, h);
  g.lineStyle(1, light, 0.55).lineBetween(x + 3, y + 2, x + w - 3, y + 2);
}

export class LobbyScene extends Phaser.Scene {
  private readonly sfx = getSoundDirector();
  private fx!: FxDirector;
  private infoText!: Phaser.GameObjects.Text;
  private levelDetailText!: Phaser.GameObjects.Text;
  private startButton!: Phaser.GameObjects.Rectangle;
  private startFace!: Phaser.GameObjects.Rectangle;
  private startLabel!: Phaser.GameObjects.Text;
  private startSublabel!: Phaser.GameObjects.Text;
  private levelCards: CardWidgets[] = [];
  private heroCards: CardWidgets[] = [];
  private view!: LobbyViewModel;
  private previewLevelScene!: Phaser.GameObjects.Graphics;
  private previewHeroAvatar!: Phaser.GameObjects.Graphics;
  private previewLevelName!: Phaser.GameObjects.Text;
  private previewLevelStars!: Phaser.GameObjects.Text;
  private previewHeroName!: Phaser.GameObjects.Text;
  private previewHeroRole!: Phaser.GameObjects.Text;
  private previewHeroDetails: Phaser.GameObjects.Text[] = [];

  public constructor() {
    super("LobbyScene");
  }

  public create(): void {
    this.fx = new FxDirector(this);
    this.sfx.unlock();
    this.input.on("pointerdown", () => this.sfx.unlock());
    const progression = loadProgression();
    this.view = deriveLobbyView(starterHeroContent, clearedLevelIdSet(progression), { heroId: progression.lastHeroId ?? undefined, levelId: progression.lastLevelId ?? undefined });
    this.drawBackground();
    this.drawCampSilhouette();
    this.drawDriftingHorde();
    this.drawTitle();
    this.add.text(44, 144, "选择关卡", { ...this.textStyle(22, COLORS.text), fontStyle: "bold", stroke: "#241708", strokeThickness: 4 }).setDepth(4);
    this.add.graphics().setDepth(4).lineStyle(3, COLORS.gold, 0.9).lineBetween(160, 154, 560, 154);
    this.add.text(600, 148, "难度 ★ 越多越险", this.textStyle(13, COLORS.muted)).setOrigin(1, 0).setDepth(4);
    this.levelCards = starterHeroContent.levels.map((level, index) => this.makeCard(CARD_XS[index]!, LEVEL_CARD_Y, this.view.levelCards[index]!, "level", level.id));
    this.levelDetailText = this.add.text(44, 348, "", { ...this.textStyle(15, "#ffe9a0"), fontStyle: "bold", stroke: "#1c1206", strokeThickness: 3, wordWrap: { width: 632 } }).setDepth(4);

    this.add.text(44, 392, "选择英雄", { ...this.textStyle(22, COLORS.text), fontStyle: "bold", stroke: "#241708", strokeThickness: 4 }).setDepth(4);
    this.add.graphics().setDepth(4).lineStyle(3, COLORS.gold, 0.9).lineBetween(160, 402, 560, 402);
    this.add.text(600, 396, "驻守攻击自动进行", this.textStyle(13, COLORS.muted)).setOrigin(1, 0).setDepth(4);
    this.heroCards = starterHeroContent.heroes.map((hero, index) => this.makeCard(CARD_XS[index]!, HERO_CARD_Y, this.view.heroCards[index]!, "hero", hero.id));

    this.createPreview();
    this.createArtifactCapsule();
    this.createStartButton();

    this.infoText = this.add.text(44, 896, "点击卡片切换出战关卡与英雄；通关后解锁更多内容", { ...this.textStyle(15, COLORS.muted), wordWrap: { width: 632 } }).setDepth(4);
    this.events.on(Phaser.Scenes.Events.WAKE, () => this.refreshFromProgression());
    this.refresh();
  }

  /** Night sky with god rays and a radial glow behind the title; diagonal weave adds texture. */
  private drawBackground(): void {
    const graphics = this.add.graphics().setDepth(0);
    const bands: Array<[number, number]> = [[0, 0x10142a], [140, 0x16203c], [280, 0x1b2c48], [430, 0x203650], [590, 0x1b3548], [760, 0x182f40], [940, 0x152b38], [1128, 0x122732]];
    for (const [y, color] of bands) {
      const next = bands.find(([bandY]) => bandY > y)?.[0] ?? LOGICAL_HEIGHT;
      graphics.fillStyle(color, 1).fillRect(0, y, LOGICAL_WIDTH, next - y);
    }
    // Faint diagonal weave so the backdrop reads as fabric rather than flat fill.
    graphics.lineStyle(22, 0xffffff, 0.022);
    for (let x = -LOGICAL_HEIGHT; x < LOGICAL_WIDTH + LOGICAL_HEIGHT; x += 52) graphics.lineBetween(x, 0, x + LOGICAL_HEIGHT, LOGICAL_HEIGHT);
    graphics.lineStyle(22, 0x000000, 0.03);
    for (let x = -LOGICAL_HEIGHT; x < LOGICAL_WIDTH + LOGICAL_HEIGHT; x += 52) graphics.lineBetween(x + 26, LOGICAL_HEIGHT, x + 26 + LOGICAL_HEIGHT, 0);
    // God rays fanning from behind the title.
    const rays = this.add.graphics().setDepth(0);
    for (const [angle, alpha] of [[0.42, 0.07], [0.16, 0.05], [-0.1, 0.06], [-0.36, 0.05]] as const) {
      const dx = Math.sin(angle) * 1500;
      const dy = Math.cos(angle) * 1500;
      rays.lineStyle(64, 0xfff2c8, alpha).lineBetween(300, -60, 300 + dx, -60 + dy);
    }
    // Radial glow behind the emblem.
    const halo = this.add.graphics().setDepth(0);
    for (const [r, alpha] of [[210, 0.035], [160, 0.045], [110, 0.06], [64, 0.08]] as const) halo.fillStyle(0xffe9a0, alpha).fillCircle(180, 80, r);
    graphics.fillStyle(0x2a4a6a, 0.14).fillCircle(120, 210, 190).fillCircle(610, 520, 230);
    graphics.fillStyle(0x6a4a2a, 0.1).fillCircle(260, 1080, 150);
    const moonGlow = this.add.graphics().setDepth(0);
    moonGlow.fillStyle(0xf4ecd2, 0.1).fillCircle(600, 76, 52);
    const moon = this.add.graphics().setDepth(0);
    moon.fillStyle(0xe8ecf2, 1).fillCircle(600, 76, 30);
    moon.fillStyle(0xcdd4de, 1).fillCircle(588, 68, 6).fillCircle(610, 84, 4).fillCircle(596, 90, 3);
    const stars = this.add.graphics().setDepth(0);
    const starPoints: Array<[number, number, number]> = [[70, 60, 2], [140, 120, 1.5], [220, 48, 2], [310, 100, 1.5], [400, 60, 2], [470, 130, 1.5], [516, 34, 1.5], [680, 130, 2], [60, 170, 1.5], [180, 200, 1.5], [340, 180, 1.5], [660, 200, 1.5], [90, 250, 1.5], [700, 60, 1.5], [420, 220, 1.5]];
    for (const [x, y, r] of starPoints) stars.fillStyle(0xf4ecd2, 0.75).fillCircle(x, y, r);
    for (const index of [1, 4, 7, 12]) {
      const glowStar = this.add.graphics().setDepth(0);
      const [x, y, r] = starPoints[index]!;
      glowStar.fillStyle(0xf4ecd2, 0.85).fillCircle(x, y, r + 0.5);
      this.tweens.add({ targets: glowStar, alpha: { from: 0.2, to: 1 }, duration: 1200 + index * 350, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
    for (const [cx, cy] of [[0, 0], [LOGICAL_WIDTH, 0], [0, LOGICAL_HEIGHT], [LOGICAL_WIDTH, LOGICAL_HEIGHT]]) {
      graphics.fillStyle(0x060a12, 0.26).fillCircle(cx, cy, 175);
    }
  }

  /** Silhouette skyline along the bottom: fence, watchtower with a lit window, tents and a breathing campfire. */
  private drawCampSilhouette(): void {
    const graphics = this.add.graphics().setDepth(1);
    // Ground band is a shade lighter than the shapes so the skyline actually reads.
    graphics.fillStyle(0x16281d, 1).fillRect(0, 1128, LOGICAL_WIDTH, LOGICAL_HEIGHT - 1128);
    graphics.lineStyle(2, 0x2a4a36, 0.6).lineBetween(0, 1128, LOGICAL_WIDTH, 1128);
    graphics.lineStyle(3, SILHOUETTE, 1);
    // Fence posts skip the tent spans so the tents read as standing in front of the fence.
    for (let x = 30; x <= 690; x += 34) {
      if ((x >= 308 && x <= 372) || (x >= 528 && x <= 592)) continue;
      graphics.lineBetween(x, 1148, x, 1178);
    }
    graphics.lineBetween(24, 1160, 696, 1160);
    graphics.fillStyle(SILHOUETTE, 1).fillRect(78, 1100, 30, 56);
    graphics.fillStyle(SILHOUETTE, 1).fillRect(78, 1090, 7, 10).fillRect(90, 1090, 7, 10).fillRect(101, 1090, 7, 10);
    graphics.fillStyle(0xf6a13a, 0.95).fillRect(88, 1122, 9, 9);
    graphics.lineStyle(2, 0x8a5c22, 0.8).strokeRect(88, 1122, 9, 9);
    for (const cx of [340, 560]) {
      graphics.fillStyle(SILHOUETTE, 1);
      graphics.lineStyle(3, SILHOUETTE, 1).lineBetween(cx, 1120, cx - 28, 1168).lineBetween(cx, 1120, cx + 28, 1168).lineBetween(cx - 28, 1168, cx + 28, 1168);
    }
    const glow = this.add.graphics().setDepth(1);
    glow.fillStyle(0xf6a13a, 0.16).fillCircle(260, 1190, 34);
    this.tweens.add({ targets: glow, alpha: { from: 0.55, to: 1 }, duration: 1600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    graphics.lineStyle(5, 0x6f401f, 1).lineBetween(245, 1200, 275, 1182).lineBetween(245, 1182, 275, 1200);
    graphics.fillStyle(0xf07b28, 1).fillCircle(260, 1186, 7);
    graphics.fillStyle(0xffd27a, 1).fillCircle(260, 1184, 4);
    graphics.lineStyle(2, 0xf6a13a, 0.5).lineBetween(260, 1174, 260, 1162).lineBetween(248, 1178, 238, 1170).lineBetween(272, 1178, 282, 1170);
  }

  /** A few shambling silhouettes drift across the header: the horde is coming. */
  private drawDriftingHorde(): void {
    const lanes: Array<[number, number, number]> = [[-60, 52, 26000], [-240, 86, 34000], [-420, 116, 42000]];
    for (const [startX, y, duration] of lanes) {
      const zombie = this.add.graphics().setDepth(2).setAlpha(0.5);
      zombie.fillStyle(SILHOUETTE, 1).fillCircle(0, -14, 7).fillRect(-8, -6, 16, 22);
      zombie.lineStyle(3, SILHOUETTE, 1).lineBetween(-8, -2, -19, 3).lineBetween(8, -2, 19, -1).lineBetween(-4, 16, -6, 26).lineBetween(4, 16, 7, 26);
      zombie.setPosition(startX, y);
      this.tweens.add({
        targets: zombie,
        x: 800,
        duration,
        repeat: -1,
        ease: "Linear",
        onRepeat: () => zombie.setX(-80),
      });
      this.tweens.add({ targets: zombie, y: y + 3, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
  }

  private drawTitle(): void {
    this.add.text(42, 34, "尸潮营地", { ...this.textStyle(44, "#f6c453"), fontStyle: "bold", stroke: "#2a1a06", strokeThickness: 8 }).setDepth(4);
    const emblem = this.add.graphics().setDepth(4);
    emblem.fillStyle(0x000000, 0.3).fillRect(253, 47, 28, 22);
    emblem.fillStyle(COLORS.gold, 1).fillRect(250, 44, 28, 22);
    emblem.fillStyle(0xffe08a, 1).fillRect(250, 44, 28, 5);
    emblem.fillStyle(COLORS.gold, 1).fillRect(250, 36, 6, 8).fillRect(261, 36, 6, 8).fillRect(272, 36, 6, 8);
    emblem.fillStyle(0x213524, 1).fillCircle(264, 58, 5);
    emblem.lineStyle(2, COLORS.gold, 0.9).lineBetween(282, 36, 282, 58).lineBetween(282, 36, 296, 40).lineBetween(282, 42, 296, 46);
    this.add.text(44, 98, "尸潮来临前 · 先配置你的防线", { ...this.textStyle(15, COLORS.muted), stroke: "#101c26", strokeThickness: 3 }).setDepth(4);
  }

  private createPreview(): void {
    this.add.text(44, 606, "出战预览", { ...this.textStyle(17, "#ffe9a0"), fontStyle: "bold", stroke: "#1c1206", strokeThickness: 3 }).setDepth(3);
    this.add.text(676, 610, "开战前的最后确认", this.textStyle(12, COLORS.muted)).setOrigin(1, 0).setDepth(3);
    const banner = this.add.graphics().setDepth(2);
    drawBevel(banner, 40, PREVIEW_Y, 640, 168, WOOD.base, WOOD.light, WOOD.edge, true);
    const inset = this.add.graphics().setDepth(3);
    inset.fillStyle(0x000000, 0.3).fillRect(56, 648, 212, 92);
    inset.lineStyle(3, 0x2f1c0e, 1).strokeRect(52, 644, 216, 96);
    this.previewLevelScene = this.add.graphics().setDepth(4);
    this.previewLevelName = this.add.text(60, 716, "", { ...this.textStyle(15, COLORS.text), fontStyle: "bold", stroke: "#1c1206", strokeThickness: 3 }).setDepth(5);
    this.previewLevelStars = this.add.text(252, 719, "", { ...this.textStyle(12, "#f6c453"), stroke: "#1c1206", strokeThickness: 2 }).setOrigin(1, 0).setDepth(5);
    this.previewHeroAvatar = this.add.graphics().setDepth(4);
    this.previewHeroName = this.add.text(398, 650, "", { ...this.textStyle(18, COLORS.text), fontStyle: "bold", stroke: "#1c1206", strokeThickness: 3 }).setDepth(5);
    this.previewHeroRole = this.add.text(398, 676, "", this.textStyle(12, COLORS.muted)).setDepth(5);
    this.previewHeroDetails = [0, 1, 2].map((index) => this.add.text(398, 702 + index * 24, "", this.textStyle(13, index === 0 ? COLORS.text : COLORS.muted)).setDepth(5));
  }

  private createArtifactCapsule(): void {
    const capsule = this.add.graphics().setDepth(2);
    drawBevel(capsule, 40, 824, 640, 44, 0x3a2f22, 0x4c3d2c, 0x241a10, false);
    const lock = this.add.graphics().setDepth(3);
    this.drawLockGlyph(lock, 320, 842);
    this.add.text(360, 846, "神器 / 养成位 · 敬请期待", { ...this.textStyle(14, COLORS.muted), stroke: "#171006", strokeThickness: 2 }).setOrigin(0.5).setDepth(3);
  }

  /** Chunky extruded battle button: dark base block, bright gold top face, press sinks the face. */
  private createStartButton(): void {
    const base = this.add.graphics().setDepth(2);
    base.fillStyle(0x000000, 0.4).fillRect(76, 972, 568, 112);
    base.fillStyle(0x8a5a10, 1).fillRect(80, 976, 560, 100);
    base.lineStyle(5, 0x4a3008, 1).strokeRect(80, 976, 560, 100);
    this.startButton = this.add.rectangle(360, 1012, 560, 88, 0x000000, 0).setDepth(3).setInteractive({ useHandCursor: true });
    this.startFace = this.add.rectangle(360, 1006, 546, 84, 0xf2c14e, 1).setDepth(4);
    this.startFace.setStrokeStyle(3, 0xb8871e, 1);
    const faceShine = this.add.rectangle(360, 988, 522, 38, 0xfbd76b, 1).setDepth(5);
    this.startLabel = this.add.text(360, 998, "开始战斗", { ...this.textStyle(30, "#ffffff"), fontStyle: "bold", stroke: "#5a3a0a", strokeThickness: 7 }).setOrigin(0.5).setDepth(6);
    this.startSublabel = this.add.text(360, 1042, "", { ...this.textStyle(13, "#fff3d2"), stroke: "#5a3a0a", strokeThickness: 3 }).setOrigin(0.5).setDepth(6);
    const pressTargets = [this.startFace, faceShine, this.startLabel, this.startSublabel];
    this.startButton.on("pointerdown", () => {
      this.sfx.unlock();
      this.sfx.playUi("click");
      this.tweens.add({ targets: pressTargets, y: "+=8", duration: 80, yoyo: true, ease: "Quad.easeOut" });
    });
    this.startButton.on("pointerdown", () => this.handleIntent("start"));
    for (const bx of [52, 668]) {
      const torch = this.add.graphics().setDepth(3);
      torch.fillStyle(0x3a2f22, 1).fillRect(bx - 12, 1024, 24, 14);
      torch.fillStyle(0x50311a, 1).fillRect(bx - 7, 1038, 14, 22);
      torch.lineStyle(3, 0x241a10, 1).strokeRect(bx - 12, 1024, 24, 14);
      torch.lineStyle(4, 0x6f401f, 1).lineBetween(bx - 8, 1022, bx + 8, 1022);
      // Flame is drawn in local space anchored at its base so scaling licks upward, not sideways.
      const flame = this.add.graphics().setDepth(3).setPosition(bx, 1019);
      flame.fillStyle(0xf07b28, 1).fillCircle(0, -7, 7);
      flame.fillStyle(0xffd27a, 1).fillCircle(0, -9, 4);
      const torchGlow = this.add.graphics().setDepth(2);
      torchGlow.fillStyle(0xf6a13a, 0.14).fillCircle(bx, 1012, 30);
      this.tweens.add({ targets: torchGlow, alpha: { from: 0.5, to: 1 }, duration: 1300, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.tweens.add({ targets: flame, scaleX: { from: 0.95, to: 1.04 }, scaleY: { from: 0.9, to: 1.05 }, duration: 640, delay: bx < 360 ? 0 : 280, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
  }

  /** A card is a framed picture: art window with real content, name ribbon, badge pill. */
  private makeCard(x: number, y: number, card: LobbyCardView, kind: "level" | "hero", id: string): CardWidgets {
    const frame = this.add.rectangle(x + CARD_WIDTH / 2, y + CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 0x000000, 0).setDepth(2).setInteractive({ useHandCursor: true });
    const bevel = this.add.graphics().setDepth(1);
    const art = this.add.graphics().setDepth(3);
    this.drawCardArt(art, kind, id, x, y);
    const ribbonColor = kind === "level" ? RIBBON.level[card.stars - 1] ?? RIBBON.level[0]! : RIBBON.hero[CARD_XS.indexOf(x)] ?? RIBBON.hero[0]!;
    const ribbon = this.add.graphics().setDepth(4);
    ribbon.fillStyle(0x000000, 0.35).fillRect(x + 16, y + 114, CARD_WIDTH - 30, 26);
    ribbon.fillStyle(ribbonColor, 1).fillRect(x + 14, y + 112, CARD_WIDTH - 30, 26);
    ribbon.fillStyle(RIBBON.edge, 1).fillRect(x + 14, y + 138, 9, 9).fillRect(x + CARD_WIDTH - 25, y + 138, 9, 9);
    ribbon.lineStyle(2, RIBBON.edge, 1).strokeRect(x + 14, y + 112, CARD_WIDTH - 30, 26);
    const title = this.add.text(x + CARD_WIDTH / 2, y + 125, card.title, { ...this.textStyle(16, "#ffffff"), fontStyle: "bold", stroke: "#141c10", strokeThickness: 3 }).setOrigin(0.5).setDepth(5);
    const badgePill = this.add.graphics().setDepth(4);
    badgePill.fillStyle(0x0c160f, 0.85).fillRect(x + 15, y + 15, 64, 24);
    badgePill.lineStyle(2, 0xc9b06a, 0.9).strokeRect(x + 15, y + 15, 64, 24);
    const badge = this.add.text(x + 47, y + 27, "", { ...this.textStyle(13, "#f6c453"), fontStyle: "bold", stroke: "#141c10", strokeThickness: 2 }).setOrigin(0.5).setDepth(5);
    const detail = this.add.text(x + 14, y + 142, "", { ...this.textStyle(11, COLORS.muted), stroke: "#1c1206", strokeThickness: 2, wordWrap: { width: CARD_WIDTH - 26 } }).setDepth(5);
    const lock = this.add.graphics().setDepth(6);
    frame.on("pointerdown", () => this.handleIntent(kind, id));
    frame.on("pointerdown", () => {
      this.sfx.unlock();
      this.sfx.playUi("click");
      this.tweens.add({ targets: [frame, bevel, art, ribbon], y: "+=3", duration: 60, yoyo: true, ease: "Quad.easeOut" });
    });
    return { frame, bevel, title, badge, detail, lock };
  }

  /** Illustrated art window for a card: each level and hero gets its own mini scene. */
  private drawCardArt(g: Phaser.GameObjects.Graphics, kind: "level" | "hero", id: string, x: number, y: number): void {
    const ax = x + 10;
    const ay = y + 10;
    const aw = CARD_WIDTH - 20;
    const ah = 98;
    g.fillStyle(0x000000, 0.3).fillRect(ax + 2, ay + 3, aw, ah);
    if (kind === "level" && id === "first_defense") {
      g.fillStyle(0x33607a, 1).fillRect(ax, ay, aw, ah);
      g.fillStyle(0x3f748e, 0.8).fillRect(ax, ay, aw, 22);
      g.fillStyle(0xf6e3a1, 0.9).fillCircle(ax + 94, ay + 16, 8);
      g.fillStyle(0x2f5230, 1).fillRect(ax, ay + 44, aw, ah - 44);
      g.fillStyle(0x35603a, 1).fillRect(ax, ay + 44, aw, 8);
      g.fillStyle(0x1d3524, 1).fillRect(ax + aw - 62, ay + 18, 24, 30);
      g.fillStyle(0x1d3524, 1).fillRect(ax + aw - 64, ay + 12, 6, 7).fillRect(ax + aw - 53, ay + 12, 6, 7).fillRect(ax + aw - 42, ay + 12, 6, 7);
      g.fillStyle(0xf6a13a, 0.9).fillCircle(ax + aw - 50, ay + 28, 2.5);
      g.lineStyle(3, 0x6f401f, 1);
      for (let fx = ax + 8; fx <= ax + aw - 70; fx += 14) g.lineBetween(fx, ay + 62, fx, ay + 82);
      g.lineBetween(ax + 6, ay + 68, ax + aw - 74, ay + 68);
    } else if (kind === "level" && id === "broken_valley") {
      g.fillStyle(0x8a5a30, 1).fillRect(ax, ay, aw, ah);
      g.fillStyle(0xa06a38, 0.85).fillRect(ax, ay, aw, 20);
      g.fillStyle(0xe8e0d0, 0.95).fillCircle(ax + 24, ay + 30, 7);
      g.fillStyle(0x3a2a1a, 1).fillCircle(ax + 21.5, ay + 29, 1.6).fillCircle(ax + 26.5, ay + 29, 1.6);
      g.fillStyle(0x4a3018, 1).fillRect(ax, ay + 52, aw, ah - 52);
      g.lineStyle(4, 0x2a1a0e, 1).lineBetween(ax + 4, ay + 84, ax + 34, ay + 56).lineBetween(ax + 34, ay + 56, ax + 72, ay + 86).lineBetween(ax + 72, ay + 86, ax + 112, ay + 54).lineBetween(ax + 112, ay + 54, ax + 152, ay + 84).lineBetween(ax + 152, ay + 84, ax + aw - 4, ay + 60);
      g.lineStyle(2, 0x6b4c2c, 0.9).lineBetween(ax + 4, ay + 92, ax + 48, ay + 72).lineBetween(ax + 48, ay + 72, ax + 100, ay + 92).lineBetween(ax + 100, ay + 92, ax + aw - 4, ay + 76);
      g.lineStyle(3, 0x3f6a3a, 1).lineBetween(ax + aw - 20, ay + 78, ax + aw - 20, ay + 52).lineBetween(ax + aw - 12, ay + 80, ax + aw - 12, ay + 58);
    } else if (kind === "level" && id === "kings_march") {
      g.fillStyle(0x241a3e, 1).fillRect(ax, ay, aw, ah);
      g.fillStyle(0x2f2350, 0.9).fillRect(ax, ay, aw, 24);
      g.fillStyle(0xf4ecd2, 0.85).fillCircle(ax + 16, ay + 14, 1.5).fillCircle(ax + 52, ay + 8, 1.5).fillCircle(ax + 88, ay + 16, 1.5).fillCircle(ax + aw - 24, ay + 10, 1.8).fillCircle(ax + aw - 60, ay + 18, 1.3);
      g.fillStyle(0xe8ecf2, 1).fillCircle(ax + aw - 16, ay + 16, 6);
      g.fillStyle(0x3a2c55, 1).fillRect(ax, ay + 76, aw, ah - 76);
      for (const towerX of [ax + 42, ax + aw - 78]) {
        g.fillStyle(0x160f28, 1).fillRect(towerX, ay + 36, 26, 50);
        g.fillStyle(0x160f28, 1).fillRect(towerX - 3, ay + 27, 9, 9).fillRect(towerX + 9, ay + 27, 9, 9).fillRect(towerX + 20, ay + 27, 9, 9);
        g.fillStyle(0xf6a13a, 0.95).fillCircle(towerX + 13, ay + 48, 3).fillCircle(towerX + 13, ay + 62, 2.5);
      }
    } else if (kind === "hero" && id === "vanguard_gunner") {
      g.fillStyle(0x2c3540, 1).fillRect(ax, ay, aw, ah);
      g.fillStyle(0x38444f, 0.9).fillRect(ax, ay, aw, 26);
      g.fillStyle(0x3a4450, 1).fillRect(ax + 34, ay + 40, 96, 40);
      g.fillStyle(0x2a323c, 1).fillRect(ax + 34, ay + 40, 96, 9);
      g.lineStyle(5, 0x222a34, 1).lineBetween(ax + 84, ay + 50, ax + 122, ay + 42).lineBetween(ax + 84, ay + 62, ax + 122, ay + 56);
      g.fillStyle(0xfff3c1, 1).fillCircle(ax + 124, ay + 42, 3.5);
      g.fillStyle(0x8dd8c3, 1).fillCircle(ax + 50, ay + 30, 3);
      g.fillStyle(0x8a7a55, 1).fillCircle(ax + 20, ay + 86, 7).fillCircle(ax + 36, ay + 88, 7).fillCircle(ax + 52, ay + 86, 7).fillCircle(ax + 68, ay + 88, 7).fillCircle(ax + 84, ay + 86, 7).fillCircle(ax + 100, ay + 88, 7).fillCircle(ax + 116, ay + 86, 7).fillCircle(ax + 132, ay + 88, 7).fillCircle(ax + 148, ay + 86, 7).fillCircle(ax + 164, ay + 88, 7);
      g.lineStyle(2, 0x5c5238, 1).strokeCircle(ax + 20, ay + 86, 4).strokeCircle(ax + 52, ay + 86, 4).strokeCircle(ax + 84, ay + 86, 4).strokeCircle(ax + 116, ay + 86, 4).strokeCircle(ax + 148, ay + 86, 4);
    } else if (kind === "hero" && id === "lumber_baron") {
      g.fillStyle(0x6a5030, 1).fillRect(ax, ay, aw, ah);
      g.fillStyle(0x7a5c38, 0.9).fillRect(ax, ay, aw, 24);
      g.fillStyle(0x4a3018, 1).fillRect(ax, ay + 70, aw, ah - 70);
      g.fillStyle(0xc9853d, 1).fillCircle(ax + 54, ay + 74, 13).fillCircle(ax + 84, ay + 74, 13).fillCircle(ax + 114, ay + 74, 13).fillCircle(ax + 69, ay + 54, 13).fillCircle(ax + 99, ay + 54, 13);
      g.lineStyle(2.5, 0x8a5a26, 1).strokeCircle(ax + 54, ay + 74, 8).strokeCircle(ax + 84, ay + 74, 8).strokeCircle(ax + 114, ay + 74, 8).strokeCircle(ax + 69, ay + 54, 8).strokeCircle(ax + 99, ay + 54, 8);
      g.fillStyle(0xe2ad64, 1).fillCircle(ax + 69, ay + 54, 3.5).fillCircle(ax + 99, ay + 54, 3.5).fillCircle(ax + 54, ay + 74, 3.5);
      g.fillStyle(0x6f401f, 1).fillRect(ax + 138, ay + 52, 26, 22);
      g.lineStyle(4, 0x2a1d14, 1).lineBetween(ax + 150, ay + 52, ax + 162, ay + 24);
      g.lineStyle(3, 0xd9d9d9, 1).lineBetween(ax + 158, ay + 16, ax + 172, ay + 30).lineBetween(ax + 172, ay + 30, ax + 163, ay + 37).lineBetween(ax + 163, ay + 37, ax + 158, ay + 16);
    } else {
      g.fillStyle(0x33607a, 1).fillRect(ax, ay, aw, ah);
      g.fillStyle(0x3f748e, 0.8).fillRect(ax, ay, aw, 20);
      g.fillStyle(0x2f5230, 1).fillCircle(ax + aw / 2, ay + 96, 52);
      g.fillStyle(0x35603a, 1).fillCircle(ax + aw / 2, ay + 96, 44);
      g.fillStyle(0x000000, 0.3).fillRect(ax + aw / 2 - 19, ay + 39, 38, 32);
      g.fillStyle(COLORS.gold, 1).fillRect(ax + aw / 2 - 21, ay + 37, 38, 32);
      g.fillStyle(0xffe08a, 1).fillRect(ax + aw / 2 - 21, ay + 37, 38, 7);
      g.fillStyle(COLORS.gold, 1).fillRect(ax + aw / 2 - 21, ay + 26, 9, 11).fillRect(ax + aw / 2 - 4.5, ay + 26, 9, 11).fillRect(ax + aw / 2 + 12, ay + 26, 9, 11);
      g.fillStyle(0x213524, 1).fillCircle(ax + aw / 2, ay + 56, 7);
      g.lineStyle(2, COLORS.gold, 0.9).lineBetween(ax + aw / 2 + 24, ay + 30, ax + aw / 2 + 24, ay + 8).lineBetween(ax + aw / 2 + 24, ay + 8, ax + aw / 2 + 38, ay + 13).lineBetween(ax + aw / 2 + 24, ay + 15, ax + aw / 2 + 38, ay + 20);
    }
    g.lineStyle(3, 0x2f1c0e, 1).strokeRect(ax, ay, aw, ah);
  }

  private drawLockGlyph(graphics: Phaser.GameObjects.Graphics, x: number, y: number): void {
    graphics.lineStyle(3, 0xc9b06a, 1).lineBetween(x - 4, y + 2, x - 4, y - 4).lineBetween(x + 4, y + 2, x + 4, y - 4).lineBetween(x - 4, y - 4, x + 4, y - 4);
    graphics.fillStyle(0xc9b06a, 1).fillRect(x - 7, y + 2, 14, 10);
  }

  private refresh(): void {
    this.applyCards(this.levelCards, this.view.levelCards, LEVEL_CARD_Y, true);
    this.applyCards(this.heroCards, this.view.heroCards, HERO_CARD_Y, false);
    this.levelDetailText.setText(this.view.selectedLevelDetail + (this.view.selectedLevelCleared ? " · 已通关" : ""));
    this.drawPreview();
    this.startSublabel.setText(this.view.startSublabel);
  }

  private applyCards(widgets: CardWidgets[], cards: LobbyCardView[], y: number, isLevel: boolean): void {
    widgets.forEach((widget, index) => {
      const card = cards[index]!;
      const x = CARD_XS[index]!;
      widget.bevel.clear();
      drawBevel(widget.bevel, x, y, CARD_WIDTH, CARD_HEIGHT, card.selected ? WOOD.selected : WOOD.base, card.selected ? WOOD.selectedLight : WOOD.light, WOOD.edge, card.selected);
      if (card.locked) widget.bevel.fillStyle(0x060a12, 0.5).fillRect(x + 6, y + 6, CARD_WIDTH - 12, CARD_HEIGHT - 12);
      widget.title.setText(card.title).setColor(card.locked ? "#e8dcc0" : "#ffffff");
      if (isLevel) {
        widget.badge.setText(card.locked ? "🔒" : "★".repeat(card.stars));
      } else {
        const hero = starterHeroContent.heroes[index];
        widget.badge.setText(card.locked ? "🔒" : (hero ? HERO_SHORT_ROLES[hero.id] : ""));
      }
      widget.detail.setText(card.locked ? card.lockHint : (isLevel ? card.subtitle : this.heroKeyLine(card.id)));
      widget.detail.setColor(card.locked ? "#e8dcc0" : COLORS.muted);
      widget.lock.clear();
      if (card.locked) {
        this.drawLockGlyph(widget.lock, x + CARD_WIDTH / 2, y + 58);
      }
    });
  }

  private drawPreview(): void {
    const view = this.view;
    this.drawLevelScene(view.selectedLevelId);
    this.previewLevelName.setText(view.selectedLevelName);
    const level = starterHeroContent.levels.find((candidate) => candidate.id === view.selectedLevelId)!;
    this.previewLevelStars.setText("★".repeat(level.difficultyStars));
    this.drawHeroAvatar(view.selectedHeroId);
    this.previewHeroName.setText(view.selectedHeroName);
    this.previewHeroRole.setText(starterHeroContent.heroes.find((hero) => hero.id === view.selectedHeroId)!.role);
    view.selectedHeroDetailLines.forEach((line, index) => this.previewHeroDetails[index]?.setText(line));
    this.previewHeroDetails.forEach((text, index) => text.setVisible(index < view.selectedHeroDetailLines.length));
  }

  /** Scene strip for the selected level: each level gets a signature primitive skyline. */
  private drawLevelScene(levelId: LevelId): void {
    const g = this.previewLevelScene;
    g.clear();
    const x0 = 52;
    const y0 = 644;
    const w = 216;
    const h = 96;
    if (levelId === "broken_valley") {
      g.fillStyle(0x4a3521, 1).fillRect(x0, y0, w, h);
      g.fillStyle(0x5c4529, 0.7).fillRect(x0, y0, w, 20);
      g.lineStyle(3, 0x2a1c10, 1).lineBetween(x0 + 4, y0 + 64, x0 + 34, y0 + 28).lineBetween(x0 + 34, y0 + 28, x0 + 72, y0 + 66).lineBetween(x0 + 72, y0 + 66, x0 + 112, y0 + 24).lineBetween(x0 + 112, y0 + 24, x0 + 152, y0 + 64).lineBetween(x0 + 152, y0 + 64, x0 + 190, y0 + 30).lineBetween(x0 + 190, y0 + 30, x0 + 212, y0 + 58);
      g.lineStyle(2, 0x6b4c2c, 0.8).lineBetween(x0 + 4, y0 + 78, x0 + 44, y0 + 50).lineBetween(x0 + 44, y0 + 50, x0 + 96, y0 + 80).lineBetween(x0 + 96, y0 + 80, x0 + 156, y0 + 46).lineBetween(x0 + 156, y0 + 46, x0 + 212, y0 + 74);
    } else if (levelId === "kings_march") {
      g.fillStyle(0x2f2440, 1).fillRect(x0, y0, w, h);
      g.fillStyle(0x3d2f52, 0.8).fillRect(x0, y0, w, 22);
      for (const towerX of [x0 + 40, x0 + 140]) {
        g.fillStyle(0x1c1430, 1).fillRect(towerX, y0 + 34, 22, 46);
        g.fillStyle(0x1c1430, 1).fillRect(towerX - 3, y0 + 26, 8, 8).fillRect(towerX + 7, y0 + 26, 8, 8).fillRect(towerX + 17, y0 + 26, 8, 8);
        g.fillStyle(0xf6a13a, 0.9).fillCircle(towerX + 11, y0 + 46, 3);
      }
      g.lineStyle(2, 0x44365e, 1).lineBetween(x0, y0 + 80, x0 + w, y0 + 80);
    } else {
      g.fillStyle(0x2c4a2a, 1).fillRect(x0, y0, w, h);
      g.fillStyle(0x3a5c36, 0.8).fillRect(x0, y0, w, 20);
      g.lineStyle(3, 0x6f401f, 1);
      for (let fx = x0 + 10; fx <= x0 + w - 10; fx += 16) g.lineBetween(fx, y0 + 44, fx, y0 + 66);
      g.lineBetween(x0 + 6, y0 + 50, x0 + w - 6, y0 + 50);
      g.lineStyle(2, 0x4f7a45, 1).lineBetween(x0 + 12, y0 + 84, x0 + 12, y0 + 76).lineBetween(x0 + 60, y0 + 86, x0 + 60, y0 + 77).lineBetween(x0 + 120, y0 + 84, x0 + 120, y0 + 76).lineBetween(x0 + 176, y0 + 86, x0 + 176, y0 + 77);
    }
    g.fillStyle(0x0c160f, 0.72).fillRect(x0, y0 + 66, w, 30);
    g.lineStyle(2, 0x000000, 0.35).lineBetween(x0 + 4, y0 + 70, x0 + w - 4, y0 + 70);
  }

  /** Hero avatar pedestal in the preview banner; one signature glyph per hero. */
  private drawHeroAvatar(heroId: HeroId): void {
    const g = this.previewHeroAvatar;
    g.clear();
    const cx = 340;
    const cy = 706;
    const color = HERO_CIRCLE_COLORS[heroId] ?? 0x5b7042;
    g.fillStyle(0x000000, 0.35).fillCircle(cx + 3, cy + 4, 44);
    g.fillStyle(color, 1).fillCircle(cx, cy, 44);
    g.fillStyle(0xffffff, 0.09).fillCircle(cx - 12, cy - 14, 30);
    g.lineStyle(4, COLORS.gold, 1).strokeCircle(cx, cy, 44);
    g.lineStyle(2, 0x8a6a2a, 0.9).strokeCircle(cx, cy, 40);
    if (heroId === "vanguard_gunner") {
      g.fillStyle(0x2c3540, 1).fillRect(cx - 16, cy - 10, 26, 20);
      g.lineStyle(4, 0x2c3540, 1).lineBetween(cx + 4, cy - 4, cx + 24, cy - 8).lineBetween(cx + 4, cy + 4, cx + 24, cy);
      g.fillStyle(0xfff3c1, 1).fillCircle(cx + 25, cy - 8, 3);
      g.fillStyle(0x8dd8c3, 1).fillCircle(cx - 8, cy - 16, 3);
    } else if (heroId === "lumber_baron") {
      g.lineStyle(4, 0x2a1d14, 1).lineBetween(cx - 14, cy + 16, cx + 12, cy - 16);
      g.lineStyle(3, 0xd9d9d9, 1).lineBetween(cx + 2, cy - 24, cx + 16, cy - 8).lineBetween(cx + 16, cy - 8, cx + 6, cy - 2).lineBetween(cx + 6, cy - 2, cx + 2, cy - 24);
      g.fillStyle(0xc9853d, 1).fillCircle(cx - 16, cy + 18, 5);
      g.lineStyle(2, 0x6f401f, 1).strokeCircle(cx - 16, cy + 18, 3);
    } else {
      g.fillStyle(COLORS.gold, 1).fillRect(cx - 15, cy - 8, 30, 22);
      g.fillStyle(0xffe08a, 1).fillRect(cx - 15, cy - 8, 30, 5);
      g.fillStyle(COLORS.gold, 1).fillRect(cx - 15, cy - 16, 7, 8).fillRect(cx - 3.5, cy - 16, 7, 8).fillRect(cx + 8, cy - 16, 7, 8);
      g.fillStyle(0x213524, 1).fillCircle(cx, cy + 5, 5);
    }
  }

  private heroKeyLine(heroId: string): string {
    const hero = starterHeroContent.heroes.find((candidate) => candidate.id === heroId);
    return hero ? hero.detailLines[1] ?? hero.role : "";
  }

  private refreshFromProgression(): void {
    const progression = loadProgression();
    this.view = deriveLobbyView(starterHeroContent, clearedLevelIdSet(progression), { heroId: progression.lastHeroId ?? undefined, levelId: progression.lastLevelId ?? undefined });
    this.refresh();
    this.infoText.setText("点击卡片切换出战关卡与英雄；通关后解锁更多内容");
  }

  private handleIntent(kind: "level" | "hero" | "start", id?: string): void {
    const cleared = clearedLevelIdSet(loadProgression());
    const selection = { heroId: this.view.selectedHeroId as string, levelId: this.view.selectedLevelId as string };
    const intent: LobbyIntent = kind === "start" ? { kind: "start" } : { kind, id: id! };
    const decision = decideLobbyAction(starterHeroContent, cleared, intent, selection);
    if (decision.kind === "blocked") {
      this.infoText.setText(decision.reason);
      this.fx.errorShake(this.infoText);
      return;
    }
    if (decision.kind === "start_battle") {
      this.sfx.playUi("battle_start");
      const progression = loadProgression();
      this.scene.switch("GameScene", { heroId: decision.heroId, levelId: decision.levelId, clearedLevelIds: progression.clearedLevelIds });
      return;
    }
    const nextSelection = decision.kind === "select_level" ? { ...selection, levelId: decision.levelId } : { ...selection, heroId: decision.heroId };
    // Only explicit card choices are remembered, each id independently; returning from a win falls back to the next uncleared level.
    recordSelection(decision.kind === "select_hero" ? decision.heroId : undefined, decision.kind === "select_level" ? decision.levelId : undefined);
    this.view = deriveLobbyView(starterHeroContent, cleared, nextSelection);
    this.refresh();
    this.infoText.setText(decision.kind === "select_level" ? "已选择《" + this.view.selectedLevelName + "》" : "已选择 " + this.view.selectedHeroName + " · 驻守攻击自动进行");
  }

  private textStyle(size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'Arial, "Microsoft YaHei", sans-serif', fontSize: size + "px", color };
  }
}

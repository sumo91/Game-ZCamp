import Phaser from "phaser";
import { starterHeroContent } from "../core/hero";
import { decideLobbyPointer, deriveLobbyView } from "./lobbyUi";
import { FxDirector } from "./fx/FxDirector";
import { getSoundDirector } from "./fx/SoundDirector";
import { fillTriangle } from "./fx/draw";
import { LOBBY_ARTIFACT_BOUNDS, LOGICAL_HEIGHT, LOGICAL_WIDTH } from "./layout";

const COLORS = { bg: 0x172d20, panel: 0x29442d, panelLight: 0x3f5b3b, line: 0xb89b4c, gold: 0xf6c453, text: "#fff3d2", muted: "#d6d39c", cyan: "#8dd8c3" };

export class LobbyScene extends Phaser.Scene {
  private readonly view = deriveLobbyView(starterHeroContent);
  private readonly sfx = getSoundDirector();
  private fx!: FxDirector;
  private infoText!: Phaser.GameObjects.Text;
  private levelCard!: Phaser.GameObjects.Rectangle;
  private heroCard!: Phaser.GameObjects.Rectangle;
  private startButton!: Phaser.GameObjects.Rectangle;

  public constructor() {
    super("LobbyScene");
  }

  public create(): void {
    this.fx = new FxDirector(this);
    this.sfx.unlock();
    this.input.on("pointerdown", () => this.sfx.unlock());
    this.drawBackground();
    this.add.text(42, 46, "ZCAMP", this.textStyle(30, "#f6c453")).setDepth(3);
    this.add.text(44, 87, "尸潮来临前 · 先配置你的防线", this.textStyle(16, COLORS.muted)).setDepth(3);
    this.add.text(44, 150, "营地", this.textStyle(28, COLORS.text)).setDepth(3);
    this.add.text(44, 190, "当前出战配置", this.textStyle(15, COLORS.cyan)).setDepth(3);

    this.levelCard = this.makeCard(40, 230, 640, 190, this.view.levelName, this.view.levelSubtitle, "点击查看关卡规则");
    this.levelCard.on("pointerdown", () => this.handle("level"));
    this.heroCard = this.makeCard(40, 450, 640, 300, this.view.heroName, this.view.heroRole + " · 点击查看详情", "");
    this.heroCard.on("pointerdown", () => this.handle("hero"));
    this.view.heroDetails.forEach((detail, index) => {
      this.add.text(78, 548 + index * 48, detail, this.textStyle(index === 0 ? 17 : 15, index === 0 ? COLORS.text : COLORS.muted)).setDepth(4);
    });
    const heroGlyph = this.add.graphics().setDepth(4);
    heroGlyph.fillStyle(0x5b7042, 1).fillCircle(570, 590, 58);
    heroGlyph.lineStyle(4, COLORS.gold, 1).strokeCircle(570, 590, 58);
    heroGlyph.fillStyle(COLORS.gold, 1);
    fillTriangle(heroGlyph, 570, 525, 530, 590, 610, 590);
    heroGlyph.fillStyle(0x213524, 1).fillCircle(570, 579, 11);

    const artifact = this.add.rectangle(
      LOBBY_ARTIFACT_BOUNDS.x + LOBBY_ARTIFACT_BOUNDS.width / 2,
      LOBBY_ARTIFACT_BOUNDS.y + LOBBY_ARTIFACT_BOUNDS.height / 2,
      LOBBY_ARTIFACT_BOUNDS.width,
      LOBBY_ARTIFACT_BOUNDS.height,
      0x202f24,
      1,
    ).setDepth(2).setStrokeStyle(2, 0x68755a, 1);
    this.add.text(LOBBY_ARTIFACT_BOUNDS.x + 32, LOBBY_ARTIFACT_BOUNDS.y + 30, this.view.artifactLabel, this.textStyle(19, COLORS.text)).setDepth(4);
    this.add.text(LOBBY_ARTIFACT_BOUNDS.x + 32, LOBBY_ARTIFACT_BOUNDS.y + 65, "本阶段不提供可用套组", this.textStyle(15, COLORS.muted)).setDepth(4);
    artifact.setAlpha(0.88);

    this.startButton = this.add.rectangle(360, 1010, 640, 88, 0x476d3d, 1).setDepth(3).setInteractive({ useHandCursor: true });
    this.startButton.setStrokeStyle(3, COLORS.gold, 1);
    this.bindPressFeedback(this.startButton);
    this.add.text(360, 995, this.view.startLabel, this.textStyle(27, COLORS.text)).setOrigin(0.5).setDepth(4);
    this.add.text(360, 1034, "以当前关卡和英雄创建全新十波战斗", this.textStyle(14, COLORS.muted)).setOrigin(0.5).setDepth(4);
    this.startButton.on("pointerdown", () => this.handle("start"));

    this.infoText = this.add.text(44, 1160, "点击关卡或英雄查看配置；局内资源将在开始战斗后出现", { ...this.textStyle(15, COLORS.muted), wordWrap: { width: 632 } }).setDepth(4);
  }

  private drawBackground(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.bg, 1).fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    graphics.fillStyle(0x2a572e, 0.75).fillRect(24, 0, 672, 140);
    graphics.fillStyle(0x355d34, 0.42).fillCircle(160, 280, 210).fillCircle(620, 820, 260);
    graphics.lineStyle(2, COLORS.line, 0.6).lineBetween(40, 132, 680, 132).lineBetween(40, 1128, 680, 1128);
  }

  private makeCard(x: number, y: number, width: number, height: number, title: string, subtitle: string, hint: string): Phaser.GameObjects.Rectangle {
    const card = this.add.rectangle(x + width / 2, y + height / 2, width, height, COLORS.panel, 1).setDepth(2).setInteractive({ useHandCursor: true });
    card.setStrokeStyle(2, COLORS.line, 0.9);
    this.bindPressFeedback(card);
    this.add.text(x + 32, y + 32, title, this.textStyle(25, COLORS.text)).setDepth(4);
    this.add.text(x + 34, y + 79, subtitle, { ...this.textStyle(16, COLORS.muted), wordWrap: { width: width - 68 } }).setDepth(4);
    if (hint) this.add.text(x + 34, y + height - 40, hint, this.textStyle(13, COLORS.cyan)).setDepth(4);
    return card;
  }

  private bindPressFeedback(target: Phaser.GameObjects.Rectangle): void {
    target.on("pointerdown", () => {
      this.sfx.unlock();
      this.sfx.playUi("click");
      this.fx.pressPulse(target);
    });
  }

  private handle(kind: "level" | "hero" | "start"): void {
    const decision = decideLobbyPointer(kind);
    if (decision === "start_battle") {
      this.sfx.playUi("battle_start");
      this.scene.start("GameScene", { heroId: this.view.heroId, levelId: this.view.levelId });
      return;
    }
    if (decision === "show_level") this.infoText.setText(this.view.levelName + "：" + this.view.levelSubtitle + "。当前没有其他关卡可选择。");
    if (decision === "show_hero") this.infoText.setText(this.view.heroName + "：" + this.view.heroDetails.join(" · ") + "。基础攻击自动进行，不是主动技能。");
  }

  private textStyle(size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'Arial, "Microsoft YaHei", sans-serif', fontSize: size + "px", color };
  }
}

import Phaser from "phaser";
import { starterHeroContent } from "../core/hero";
import type { HeroId, LevelId } from "../core/hero";
import { decideLobbyAction, deriveLobbyView } from "./lobbyUi";
import type { LobbyCardView, LobbyIntent, LobbyViewModel } from "./lobbyUi";
import { clearedLevelIdSet, loadProgression, recordSelection } from "./progressionStore";
import { FxDirector } from "./fx/FxDirector";
import { getSoundDirector } from "./fx/SoundDirector";
import { LOBBY_ARTIFACT_BOUNDS, LOGICAL_HEIGHT, LOGICAL_WIDTH } from "./layout";

const COLORS = { bg: 0x172d20, panel: 0x29442d, panelLight: 0x3f5b3b, line: 0xb89b4c, gold: 0xf6c453, text: "#fff3d2", muted: "#d6d39c", cyan: "#8dd8c3" };

const CARD_WIDTH = 200;
const CARD_HEIGHT = 148;
const CARD_XS = [40, 260, 480];
const LEVEL_CARD_Y = 176;
const HERO_CARD_Y = 426;
const HERO_CIRCLE_COLORS: Record<HeroId, number> = { camp_warden: 0x5b7042, vanguard_gunner: 0x5c6470, lumber_baron: 0x7a5a34 };

interface CardWidgets {
  frame: Phaser.GameObjects.Rectangle;
  title: Phaser.GameObjects.Text;
  badge: Phaser.GameObjects.Text;
  detail: Phaser.GameObjects.Text;
  lock: Phaser.GameObjects.Graphics;
}

export class LobbyScene extends Phaser.Scene {
  private readonly sfx = getSoundDirector();
  private fx!: FxDirector;
  private infoText!: Phaser.GameObjects.Text;
  private levelDetailText!: Phaser.GameObjects.Text;
  private heroDetailTexts: Phaser.GameObjects.Text[] = [];
  private heroGlyph!: Phaser.GameObjects.Graphics;
  private startButton!: Phaser.GameObjects.Rectangle;
  private startSublabel!: Phaser.GameObjects.Text;
  private levelCards: CardWidgets[] = [];
  private heroCards: CardWidgets[] = [];
  private view!: LobbyViewModel;

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
    this.add.text(42, 46, "ZCAMP", this.textStyle(30, "#f6c453")).setDepth(3);
    this.add.text(44, 87, "尸潮来临前 · 先配置你的防线", this.textStyle(16, COLORS.muted)).setDepth(3);
    this.add.text(44, 146, "选择关卡", this.textStyle(22, COLORS.text)).setDepth(3);
    this.add.text(600, 150, "难度 ★ 越多越险", this.textStyle(13, COLORS.muted)).setOrigin(1, 0).setDepth(3);
    this.levelCards = starterHeroContent.levels.map((level, index) => this.makeCard(CARD_XS[index]!, LEVEL_CARD_Y, this.view.levelCards[index]!, "level", level.id));
    this.levelDetailText = this.add.text(44, 338, "", { ...this.textStyle(15, COLORS.cyan), wordWrap: { width: 632 } }).setDepth(4);

    this.add.text(44, 396, "选择英雄", this.textStyle(22, COLORS.text)).setDepth(3);
    this.add.text(600, 400, "驻守攻击自动进行", this.textStyle(13, COLORS.muted)).setOrigin(1, 0).setDepth(3);
    this.heroCards = starterHeroContent.heroes.map((hero, index) => this.makeCard(CARD_XS[index]!, HERO_CARD_Y, this.view.heroCards[index]!, "hero", hero.id));
    this.heroDetailTexts = [0, 1, 2].map((index) => this.add.text(44, 590 + index * 28, "", this.textStyle(index === 0 ? 16 : 14, index === 0 ? COLORS.text : COLORS.muted)).setDepth(4));
    this.heroGlyph = this.add.graphics().setDepth(4);

    const artifact = this.add.rectangle(
      LOBBY_ARTIFACT_BOUNDS.x + LOBBY_ARTIFACT_BOUNDS.width / 2,
      LOBBY_ARTIFACT_BOUNDS.y + LOBBY_ARTIFACT_BOUNDS.height / 2,
      LOBBY_ARTIFACT_BOUNDS.width,
      LOBBY_ARTIFACT_BOUNDS.height,
      0x202f24,
      1,
    ).setDepth(2).setStrokeStyle(2, 0x68755a, 1);
    this.add.text(LOBBY_ARTIFACT_BOUNDS.x + 32, LOBBY_ARTIFACT_BOUNDS.y + 30, "神器 / 养成位 · 尚未开放", this.textStyle(19, COLORS.text)).setDepth(4);
    this.add.text(LOBBY_ARTIFACT_BOUNDS.x + 32, LOBBY_ARTIFACT_BOUNDS.y + 65, "本阶段不提供可用套组", this.textStyle(15, COLORS.muted)).setDepth(4);
    artifact.setAlpha(0.88);

    this.startButton = this.add.rectangle(360, 1010, 640, 88, 0x476d3d, 1).setDepth(3).setInteractive({ useHandCursor: true });
    this.startButton.setStrokeStyle(3, COLORS.gold, 1);
    this.bindPressFeedback(this.startButton);
    this.add.text(360, 995, "开始战斗", this.textStyle(27, COLORS.text)).setOrigin(0.5).setDepth(4);
    this.startSublabel = this.add.text(360, 1034, "", this.textStyle(14, COLORS.muted)).setOrigin(0.5).setDepth(4);
    this.startButton.on("pointerdown", () => this.handleIntent("start"));

    this.infoText = this.add.text(44, 1160, "点击卡片切换出战关卡与英雄；通关后解锁更多内容", { ...this.textStyle(15, COLORS.muted), wordWrap: { width: 632 } }).setDepth(4);
    this.refresh();
  }

  private drawBackground(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.bg, 1).fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    graphics.fillStyle(0x2a572e, 0.75).fillRect(24, 0, 672, 140);
    graphics.fillStyle(0x355d34, 0.42).fillCircle(160, 280, 210).fillCircle(620, 820, 260);
    graphics.lineStyle(2, COLORS.line, 0.6).lineBetween(40, 132, 680, 132).lineBetween(40, 1128, 680, 1128);
  }

  private makeCard(x: number, y: number, card: LobbyCardView, kind: "level" | "hero", id: string): CardWidgets {
    const frame = this.add.rectangle(x + CARD_WIDTH / 2, y + CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, COLORS.panel, 1).setDepth(2).setInteractive({ useHandCursor: true });
    this.bindPressFeedback(frame);
    const title = this.add.text(x + 18, y + 14, card.title, this.textStyle(21, COLORS.text)).setDepth(4);
    const badge = kind === "level"
      ? this.add.text(x + 18, y + 52, "", this.textStyle(14, "#f6c453")).setDepth(4)
      : this.add.text(x + 18, y + 52, "", this.textStyle(13, COLORS.muted)).setDepth(4);
    const detail = this.add.text(x + 18, y + 80, "", { ...this.textStyle(12, COLORS.muted), wordWrap: { width: CARD_WIDTH - 34 } }).setDepth(4);
    const lock = this.add.graphics().setDepth(4);
    frame.on("pointerdown", () => this.handleIntent(kind, id));
    return { frame, title, badge, detail, lock };
  }

  private drawLockGlyph(graphics: Phaser.GameObjects.Graphics, x: number, y: number): void {
    graphics.lineStyle(3, 0xc9b06a, 1).lineBetween(x - 4, y + 2, x - 4, y - 4).lineBetween(x + 4, y + 2, x + 4, y - 4).lineBetween(x - 4, y - 4, x + 4, y - 4);
    graphics.fillStyle(0xc9b06a, 1).fillRect(x - 7, y + 2, 14, 10);
  }

  private refresh(): void {
    this.applyCards(this.levelCards, this.view.levelCards, LEVEL_CARD_Y, true);
    this.applyCards(this.heroCards, this.view.heroCards, HERO_CARD_Y, false);
    this.levelDetailText.setText(this.view.selectedLevelDetail + (this.view.selectedLevelCleared ? " · 已通关" : ""));
    this.view.selectedHeroDetailLines.forEach((line, index) => this.heroDetailTexts[index]?.setText(line));
    this.heroDetailTexts.forEach((text, index) => text.setVisible(index < this.view.selectedHeroDetailLines.length));
    this.drawHeroGlyph(this.view.selectedHeroId);
    this.startSublabel.setText(this.view.startSublabel);
  }

  private applyCards(widgets: CardWidgets[], cards: LobbyCardView[], y: number, isLevel: boolean): void {
    widgets.forEach((widget, index) => {
      const card = cards[index]!;
      widget.frame.setFillStyle(card.selected ? COLORS.panelLight : COLORS.panel, 1);
      widget.frame.setStrokeStyle(card.selected ? 3 : 2, card.selected ? COLORS.gold : COLORS.line, card.selected ? 1 : 0.9);
      widget.frame.setAlpha(card.locked ? 0.62 : 1);
      widget.title.setText(card.title).setColor(card.locked ? COLORS.muted : COLORS.text);
      if (isLevel) {
        widget.badge.setText(card.locked ? "" : "★".repeat(card.stars) + " " + card.starLabel).setColor(card.stars >= 3 ? "#f08a5a" : card.stars === 2 ? "#f6c453" : "#8dd8c3");
      } else {
        widget.badge.setText(card.locked ? "" : card.subtitle);
      }
      widget.detail.setText(card.locked ? card.lockHint : (isLevel ? card.subtitle : this.heroKeyLine(card.id)));
      widget.detail.setColor(card.locked ? "#c9a86a" : COLORS.muted);
      widget.lock.clear();
      if (card.locked) this.drawLockGlyph(widget.lock, CARD_XS[index]! + CARD_WIDTH - 26, y + 28);
    });
  }

  private heroKeyLine(heroId: string): string {
    const hero = starterHeroContent.heroes.find((candidate) => candidate.id === heroId);
    return hero ? hero.detailLines[1] ?? hero.role : "";
  }

  private drawHeroGlyph(heroId: HeroId): void {
    const graphics = this.heroGlyph;
    graphics.clear();
    const circleColor = HERO_CIRCLE_COLORS[heroId] ?? 0x5b7042;
    graphics.fillStyle(circleColor, 1).fillCircle(585, 622, 40);
    graphics.lineStyle(3, COLORS.gold, 1).strokeCircle(585, 622, 40);
    // Gold keep matching the in-battle main city.
    graphics.fillStyle(COLORS.gold, 1).fillRect(565, 610, 40, 30);
    graphics.fillStyle(0xffe08a, 1).fillRect(565, 610, 40, 6);
    graphics.fillStyle(COLORS.gold, 1).fillRect(565, 601, 9, 9).fillRect(580, 601, 9, 9).fillRect(596, 601, 9, 9);
    graphics.fillStyle(0x213524, 1).fillCircle(585, 628, 9);
  }

  private bindPressFeedback(target: Phaser.GameObjects.Rectangle): void {
    target.on("pointerdown", () => {
      this.sfx.unlock();
      this.sfx.playUi("click");
      this.fx.pressPulse(target);
    });
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
      this.scene.start("GameScene", { heroId: decision.heroId, levelId: decision.levelId, clearedLevelIds: progression.clearedLevelIds });
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

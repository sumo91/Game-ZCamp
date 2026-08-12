import Phaser from "phaser";
import { GameSimulation } from "../core/game";
import { starterCatalog, type CardDefinition, type EnemyDefinition, type TowerDefinition } from "../core/content";
import type { BuildingState, CardInstance, EnemyRuntimeState, GameEvent, GamePhase, GameState } from "../core/types";
import { buildingMatchesBaseAction, findBaseAction, getCardUseReadiness, isGameplayInputPhase } from "../core/cardAvailability";
import { getSupplyProgressPresentation } from "../core/presentation";
import { getWoodProductionPerSecond } from "../core/resources";
import { decideCardClick } from "./cardInput";
import { CARD_HAND, CARD_LAYOUTS, CAMP_SLOT_LAYOUTS, ENEMY_ZONE, GRID_ZONE, LOGICAL_HEIGHT, LOGICAL_WIDTH, RESOURCE_RAIL, WALL_ZONE } from "./layout";

type Feedback = { kind: "shot" | "hit" | "defeat"; x: number; y: number; targetX?: number; targetY?: number; ttl: number };
type CardTextBlock = {
  title: Phaser.GameObjects.Text;
  role: Phaser.GameObjects.Text;
  cost: Phaser.GameObjects.Text;
  hint: Phaser.GameObjects.Text;
  category: Phaser.GameObjects.Text;
};

const COLORS = {
  bg: 0x1d3824,
  panel: 0x53643b,
  panelDeep: 0x29442d,
  line: 0xb89b4c,
  text: 0xfff3d2,
  muted: 0xd6d39c,
  cyan: 0x4dd7e8,
  gold: 0xf6c453,
  danger: 0xf06a6a,
  success: 0x62d79b,
  blue: 0x4d83ff,
  orange: 0xf28b37,
};

export class GameScene extends Phaser.Scene {
  private readonly simulation = new GameSimulation();
  private dynamic!: Phaser.GameObjects.Graphics;
  private feedbacks: Feedback[] = [];
  private selectedCardInstanceId: string | null = null;
  private selectedSlotId: string | null = null;
  private discardMode = false;
  private cardButtons: Phaser.GameObjects.Rectangle[] = [];
  private cardGlyphs: Phaser.GameObjects.Graphics[] = [];
  private cardPaymentFills: Phaser.GameObjects.Graphics[] = [];
  private cardCostIcons: Phaser.GameObjects.Graphics[] = [];
  private cardTextBlocks: CardTextBlock[] = [];
  private slotButtons: Phaser.GameObjects.Zone[] = [];
  private wallButton!: Phaser.GameObjects.Zone;
  private pauseButton!: Phaser.GameObjects.Rectangle;
  private pauseButtonLabel!: Phaser.GameObjects.Text;
  private contextActionButton!: Phaser.GameObjects.Rectangle;
  private contextActionLabel!: Phaser.GameObjects.Text;
  private countdownText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private woodText!: Phaser.GameObjects.Text;
  private woodIcon!: Phaser.GameObjects.Graphics;
  private woodRateText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private goldIcon!: Phaser.GameObjects.Graphics;
  private wallText!: Phaser.GameObjects.Text;
  private enemyText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private supplyText!: Phaser.GameObjects.Text;
  private battleNoticeText!: Phaser.GameObjects.Text;
  private enemyLabels = new Map<string, Phaser.GameObjects.Text>();
  private slotLabels: Phaser.GameObjects.Text[] = [];
  private tacticalPanel!: Phaser.GameObjects.Rectangle;
  private tacticalTitle!: Phaser.GameObjects.Text;
  private tacticalHint!: Phaser.GameObjects.Text;
  private tacticalResumeButton!: Phaser.GameObjects.Rectangle;
  private tacticalResumeLabel!: Phaser.GameObjects.Text;
  private tacticalRestartButton!: Phaser.GameObjects.Rectangle;
  private tacticalRestartLabel!: Phaser.GameObjects.Text;
  private systemOverlay!: Phaser.GameObjects.Rectangle;
  private systemTitle!: Phaser.GameObjects.Text;
  private systemHint!: Phaser.GameObjects.Text;
  private resultOverlay!: Phaser.GameObjects.Rectangle;
  private resultTitle!: Phaser.GameObjects.Text;
  private resultHint!: Phaser.GameObjects.Text;
  private resultRestartButton!: Phaser.GameObjects.Rectangle;
  private resultRestartLabel!: Phaser.GameObjects.Text;
  private messageTimer = 0;
  private messageColor = "#fff0b0";
  private battleNoticeTimer = 0;
  private showcaseMode = false;
  private showcaseCapture: "charge" | "inspire" | null = null;
  private showcaseFreeze = false;

  public constructor() {
    super("GameScene");
    const showcaseParam = typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("stage4-demo") ?? new URLSearchParams(window.location.search).get("stage3-demo")) : null;
    this.showcaseMode = import.meta.env.DEV && (showcaseParam === "1" || showcaseParam === "charge" || showcaseParam === "inspire");
    this.showcaseCapture = this.showcaseMode && (showcaseParam === "charge" || showcaseParam === "inspire") ? showcaseParam : null;
    if (this.showcaseMode) {
      const state = this.simulation.getState();
      state.wallMaxHp = 1000000;
      state.wallHp = state.wallMaxHp;
    }
  }

  public create(): void {
    this.createBackground();
    this.dynamic = this.add.graphics().setDepth(5);
    this.createHud();
    this.createInteractionZones();
    this.createCards();
    this.createPausePanels();
    this.bindLifecycle();
    this.renderState();
  }

  public update(_time: number, delta: number): void {
    const step = Math.min(0.25, Math.max(0, delta / 1000));
    if (step > 0) {
      if (this.showcaseMode) this.simulation.getState().wallHp = this.simulation.getState().wallMaxHp;
      if (!this.showcaseFreeze) this.simulation.tick(this.showcaseMode ? step * 30 : step);
      if (this.showcaseMode && this.simulation.getState().phase === "RUNNING") this.simulation.getState().wallHp = this.simulation.getState().wallMaxHp;
      this.processEvents(this.simulation.drainEvents());
      this.feedbacks = this.feedbacks
        .map((feedback) => ({ ...feedback, ttl: feedback.ttl - step }))
        .filter((feedback) => feedback.ttl > 0);
      this.messageTimer = Math.max(0, this.messageTimer - step);
      this.battleNoticeTimer = Math.max(0, this.battleNoticeTimer - step);
    }
    this.renderState();
  }

  private createBackground(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.bg, 1).fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // D3 keeps the threat zone bright and warm, framed by saturated green edges.
    graphics.fillStyle(0x317a24, 1).fillRect(24, 0, 672, 708);
    graphics.fillStyle(0x4b9a29, 1).fillRect(52, 0, 616, 708);
    graphics.fillStyle(0xe0a51e, 1).fillRect(124, 0, 472, 708);
    graphics.fillStyle(0xefbd37, 1).fillRect(235, 0, 250, 708);
    graphics.fillStyle(0xf4d15b, 0.36).fillRect(284, 0, 152, 708);
    graphics.fillStyle(0x2a6b24, 0.42).fillRect(52, 0, 22, 708);
    graphics.fillStyle(0x2a6b24, 0.42).fillRect(646, 0, 22, 708);
    graphics.fillStyle(0xffe28a, 0.16).fillCircle(178, 168, 88);
    graphics.fillStyle(0xffe28a, 0.13).fillCircle(560, 290, 112);
    graphics.fillStyle(0xd48b12, 0.16).fillCircle(158, 536, 120);
    graphics.fillStyle(0xd48b12, 0.12).fillCircle(574, 612, 128);
    graphics.lineStyle(2, 0xffe28a, 0.42).lineBetween(124, 92, 596, 92);
    graphics.lineStyle(2, 0x9b6d13, 0.38).lineBetween(124, 604, 596, 604);
    graphics.lineStyle(2, 0x2b681f, 0.72).strokeRect(24, 0, 672, 708);

    graphics.fillStyle(0x715137, 1).fillRect(WALL_ZONE.x, WALL_ZONE.y, WALL_ZONE.width, WALL_ZONE.height);
    graphics.lineStyle(2, 0xb9894b, 1).lineBetween(WALL_ZONE.x, 721, WALL_ZONE.x + WALL_ZONE.width, 721);
    graphics.lineStyle(2, 0x3b281b, 0.9).lineBetween(WALL_ZONE.x, 756, WALL_ZONE.x + WALL_ZONE.width, 756);
    graphics.lineStyle(2, COLORS.line, 0.9).strokeRect(WALL_ZONE.x, WALL_ZONE.y, WALL_ZONE.width, WALL_ZONE.height);

    graphics.fillStyle(0x69783e, 1).fillRect(GRID_ZONE.x, GRID_ZONE.y, GRID_ZONE.width, GRID_ZONE.height);
    graphics.lineStyle(2, 0xc6a442, 0.78).lineBetween(GRID_ZONE.x, 784, GRID_ZONE.x + GRID_ZONE.width, 784);
    graphics.lineStyle(2, COLORS.line, 0.85).strokeRect(GRID_ZONE.x, GRID_ZONE.y, GRID_ZONE.width, GRID_ZONE.height);

    graphics.fillStyle(0x5b4728, 1).fillRect(RESOURCE_RAIL.x, RESOURCE_RAIL.y, RESOURCE_RAIL.width, RESOURCE_RAIL.height);
    graphics.lineStyle(2, 0xd3a345, 1).lineBetween(RESOURCE_RAIL.x + 8, RESOURCE_RAIL.y + 8, RESOURCE_RAIL.x + RESOURCE_RAIL.width - 8, RESOURCE_RAIL.y + 8);
    graphics.lineStyle(2, COLORS.line, 0.85).strokeRect(RESOURCE_RAIL.x, RESOURCE_RAIL.y, RESOURCE_RAIL.width, RESOURCE_RAIL.height);

    graphics.fillStyle(0x29442d, 1).fillRect(CARD_HAND.x, CARD_HAND.y, CARD_HAND.width, CARD_HAND.height);
    graphics.lineStyle(2, COLORS.line, 0.85).strokeRect(CARD_HAND.x, CARD_HAND.y, CARD_HAND.width, CARD_HAND.height);

    graphics.fillStyle(0x2a572e, 0.9).fillRect(24, 10, 672, 116);
    graphics.lineStyle(1, 0xffdf78, 0.46).lineBetween(32, 132, 688, 132);

    this.add.text(34, 154, "战场", this.textStyle(14, "#fff0b0")).setDepth(6);
    this.add.text(34, 716, "城墙", this.textStyle(14, "#ffe1a2")).setDepth(6);
    this.add.text(34, 1092, "资源", this.textStyle(13, "#ffe1a2")).setDepth(6);
  }
  private createHud(): void {
    // Compact battle HUD: no title card, only wave, timer, threat, resources and pause.
    this.phaseText = this.add.text(32, 18, "", this.textStyle(14, "#fff0b0")).setDepth(10);
    this.waveText = this.add.text(32, 40, "", this.textStyle(22, "#fff3d2")).setDepth(10);
    this.timerText = this.add.text(32, 72, "", this.textStyle(14, "#ffe08a")).setDepth(10);

    this.enemyText = this.add.text(320, 56, "", this.textStyle(14, "#fff3d2")).setDepth(10);
    this.wallText = this.add.text(360, 733, "", { ...this.textStyle(16, "#fff3d2"), align: "center", stroke: "#21170f", strokeThickness: 4 }).setOrigin(0.5).setDepth(10);
    this.statusText = this.add.text(34, 750, "", this.textStyle(13, "#fff0b0")).setDepth(10);
    this.messageText = this.add.text(34, 1055, "", this.textStyle(14, "#9ff0b2")).setDepth(10);
    this.woodIcon = this.add.graphics().setDepth(10);
    this.woodText = this.add.text(58, 1097, "", { ...this.textStyle(16, "#fff3d2"), fontStyle: "bold" }).setDepth(10);
    this.woodRateText = this.add.text(58, 1120, "", this.textStyle(12, "#ffe0a0")).setDepth(10);
    this.goldIcon = this.add.graphics().setDepth(10);
    this.goldText = this.add.text(154, 1097, "", { ...this.textStyle(16, "#fff3d2"), fontStyle: "bold" }).setDepth(10);
    this.supplyText = this.add.text(220, 1097, "", this.textStyle(12, "#fff0c2")).setDepth(10);

    this.battleNoticeText = this.add.text(360, 174, "", { ...this.textStyle(17, "#fff3d2"), align: "center", stroke: "#315c28", strokeThickness: 4 }).setOrigin(0.5).setDepth(12);

    this.pauseButton = this.add.rectangle(646, 44, 104, 56, COLORS.blue, 1).setDepth(11).setInteractive({ useHandCursor: true });
    this.pauseButtonLabel = this.add.text(646, 44, "暂停", this.textStyle(15, "#ffffff")).setOrigin(0.5).setDepth(12);
    this.pauseButton.on("pointerdown", () => this.toggleTacticalPause());

    this.contextActionButton = this.add.rectangle(650, 1114, 82, 56, COLORS.line, 1).setDepth(16).setInteractive({ useHandCursor: true });
    this.contextActionLabel = this.add.text(650, 1114, "弃牌", this.textStyle(13, "#ffffff")).setOrigin(0.5).setDepth(17);
    this.contextActionButton.on("pointerdown", () => this.handleContextAction());

    this.countdownText = this.add.text(360, 410, "", {
      ...this.textStyle(76, "#ffe08a"),
      stroke: "#315c28",
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(20);
  }
  private createInteractionZones(): void {
    for (const layout of CAMP_SLOT_LAYOUTS) {
      const zone = this.add.zone(layout.x + layout.width / 2, layout.y + layout.height / 2, layout.width, layout.height)
        .setDepth(15)
        .setInteractive({ useHandCursor: true });
      zone.on("pointerdown", () => this.handleSlotClick(layout.id));
      this.slotButtons.push(zone);
      const label = this.add.text(layout.x + layout.width / 2, layout.y + layout.height / 2, "", {
        ...this.textStyle(13, "#dbe6f4"),
        align: "center",
        wordWrap: { width: layout.width - 10 },
      }).setOrigin(0.5).setDepth(16);
      this.slotLabels.push(label);
    }
    this.wallButton = this.add.zone(WALL_ZONE.x + WALL_ZONE.width / 2, WALL_ZONE.y + WALL_ZONE.height / 2, WALL_ZONE.width, WALL_ZONE.height)
      .setDepth(15)
      .setInteractive({ useHandCursor: true });
    this.wallButton.on("pointerdown", () => this.handleWallClick());
  }

  private createCards(): void {
    for (const [index, layout] of CARD_LAYOUTS.entries()) {
      const button = this.add.rectangle(layout.x + layout.width / 2, layout.y + layout.height / 2, layout.width, layout.height, COLORS.panel, 1)
        .setDepth(15).setInteractive({ useHandCursor: true });
      button.on("pointerdown", () => this.handleCardClick(index));
      this.cardButtons.push(button);
      this.cardTextBlocks.push({
        title: this.add.text(layout.x + 10, layout.y + 12, "", this.textStyle(16, "#f3f5f9")).setDepth(16),
        role: this.add.text(layout.x + 10, layout.y + 46, "", this.textStyle(11, "#fff0c2")).setDepth(16),
        cost: this.add.text(layout.x + 32, layout.y + 80, "", this.textStyle(16, "#ffe08a")).setDepth(16),
        hint: this.add.text(layout.x + 10, layout.y + 108, "", this.textStyle(11, "#ffffff")).setDepth(16),
        category: this.add.text(layout.x + layout.width - 10, layout.y + 13, "", { ...this.textStyle(11, "#dbe6f4"), align: "right" }).setOrigin(1, 0).setDepth(16),
      });
      this.cardGlyphs.push(this.add.graphics().setDepth(15.5));
      this.cardPaymentFills.push(this.add.graphics().setDepth(15.25));
      this.cardCostIcons.push(this.add.graphics().setDepth(16));
    }
  }
  private createPausePanels(): void {
    this.tacticalPanel = this.add.rectangle(360, 470, 560, 154, COLORS.panelDeep, 0.96).setDepth(40);
    this.tacticalPanel.setStrokeStyle(2, COLORS.gold, 1);
    this.tacticalTitle = this.add.text(360, 420, "战术暂停", this.textStyle(22, "#f6c453")).setOrigin(0.5).setDepth(41);
    this.tacticalHint = this.add.text(360, 450, "世界冻结 · 可使用手牌规划基地", this.textStyle(15, "#dbe6f4")).setOrigin(0.5).setDepth(41);
    this.tacticalResumeButton = this.add.rectangle(298, 502, 150, 38, COLORS.blue, 1).setDepth(41).setInteractive({ useHandCursor: true });
    this.tacticalResumeLabel = this.add.text(298, 502, "继续战斗", this.textStyle(14, "#ffffff")).setOrigin(0.5).setDepth(42);
    this.tacticalResumeButton.on("pointerdown", () => this.simulation.dispatch({ type: "resume" }));
    this.tacticalRestartButton = this.add.rectangle(480, 502, 150, 38, COLORS.line, 1).setDepth(41).setInteractive({ useHandCursor: true });
    this.tacticalRestartLabel = this.add.text(480, 502, "重新开始", this.textStyle(14, "#ffffff")).setOrigin(0.5).setDepth(42);
    this.tacticalRestartButton.on("pointerdown", () => this.restartSimulation());

    this.systemOverlay = this.add.rectangle(360, 640, 720, 1280, 0x07101d, 0.9).setDepth(80).setInteractive();
    this.systemTitle = this.add.text(360, 560, "系统暂停", this.textStyle(34, "#ffffff")).setOrigin(0.5).setDepth(81);
    this.systemHint = this.add.text(360, 612, "窗口不可见期间，战斗与输入均已冻结", this.textStyle(17, "#a7b6ca")).setOrigin(0.5).setDepth(81);

    this.resultOverlay = this.add.rectangle(360, 548, 600, 286, 0x142218, 0.96).setDepth(90).setInteractive();
    this.resultOverlay.setStrokeStyle(3, COLORS.gold, 0.9);
    this.resultTitle = this.add.text(360, 486, "", this.textStyle(42, "#ffffff")).setOrigin(0.5).setDepth(91);
    this.resultHint = this.add.text(360, 548, "", { ...this.textStyle(18, "#dbe6f4"), align: "center", wordWrap: { width: 500 } }).setOrigin(0.5).setDepth(91);
    this.resultRestartButton = this.add.rectangle(360, 636, 180, 46, COLORS.blue, 1).setDepth(91).setInteractive({ useHandCursor: true });
    this.resultRestartLabel = this.add.text(360, 636, "重新部署", this.textStyle(17, "#ffffff")).setOrigin(0.5).setDepth(92);
    this.resultRestartButton.on("pointerdown", () => this.restartSimulation());
  }

  private bindLifecycle(): void {
    document.addEventListener("visibilitychange", () => document.hidden ? this.setSystemPause(true) : this.setSystemPause(false));
    this.game.events.on(Phaser.Core.Events.BLUR, () => this.setSystemPause(true));
    this.game.events.on(Phaser.Core.Events.FOCUS, () => this.setSystemPause(false));
  }

  private setSystemPause(paused: boolean): void {
    const phase = this.simulation.getState().phase;
    if (paused) this.simulation.dispatch({ type: "system_pause" });
    else if (phase === "SYSTEM_PAUSE") this.simulation.dispatch({ type: "system_resume" });
    this.renderState();
  }

  private toggleTacticalPause(): void {
    const phase = this.simulation.getState().phase;
    if (phase === "RUNNING") this.simulation.dispatch({ type: "pause" });
    else if (phase === "TACTICAL_PAUSE") this.simulation.dispatch({ type: "resume" });
    this.renderState();
  }

  private restartSimulation(): void {
    this.simulation.dispatch({ type: "restart" });
    this.selectedCardInstanceId = null;
    this.selectedSlotId = null;
    this.discardMode = false;
    this.renderState();
  }

  private handleCardClick(index: number): void {
    if (!this.canReceiveGameplayInput()) return;
    const state = this.simulation.getState();
    const card = state.hand[index];
    if (!card) return;
    if (this.discardMode) {
      this.discardCardAtIndex(index);
      return;
    }
    const definition = this.cardDefinition(card.definitionId);
    const decision = decideCardClick(
      state.hand,
      index,
      this.selectedCardInstanceId,
      (definitionId) => starterCatalog.cards.find((candidate) => candidate.id === definitionId),
      (candidate) => getCardUseReadiness(candidate, state),
    );
    if (decision.kind === "blocked") {
      this.selectedCardInstanceId = null;
      this.selectedSlotId = null;
      this.showMessage(decision.hint, false);
      this.renderState();
      return;
    }
    if (decision.kind === "cancel") {
      this.selectedCardInstanceId = null;
      this.selectedSlotId = null;
      this.showMessage("已取消选择", true);
      this.renderState();
      return;
    }
    if (decision.kind === "play") {
      const result = this.simulation.dispatch(decision.command);
      this.showMessage(result.accepted ? "卡牌效果已生效" : (result.reason ?? "暂不可使用"), result.accepted);
      this.selectedCardInstanceId = null;
      this.selectedSlotId = null;
      this.renderState();
      return;
    }
    if (decision.kind === "noop") return;
    this.selectedCardInstanceId = card.instanceId;
    this.selectedSlotId = null;
    if (definition.category === "base") {
      this.showMessage("已选基地牌，点击对应空格或城墙", true);
    } else {
      const readiness = getCardUseReadiness(definition, state);
      this.showMessage(readiness.hint, readiness.usable);
    }
    this.renderState();
  }

  private handleSlotClick(slotId: string): void {
    if (!this.canReceiveGameplayInput()) return;
    const state = this.simulation.getState();
    if (this.discardMode) {
      this.showMessage("弃牌模式 · 点击一张手牌", false);
      this.renderState();
      return;
    }
    if (!this.selectedCardInstanceId) {
      const building = state.buildings.find((item) => item.slotId === slotId);
      if (building && building.kind !== "main_city") {
        this.selectedSlotId = slotId;
        this.showMessage("已选中建筑，可点击拆除；主城不可拆除", true);
        this.renderState();
      } else if (building?.kind === "main_city") {
        this.showMessage("主城固定在 r3-c3，不可替换、升级或拆除", false);
      } else {
        this.showMessage("先从下方手牌选择基地牌", false);
      }
      return;
    }
    const card = this.cardFromSelected();
    if (!card) return;
    const definition = this.cardDefinition(card.definitionId);
    if (definition.category !== "base") {
      this.showMessage("永久 / 战术牌请再次点击卡牌使用", false);
      return;
    }
    const result = this.simulation.dispatch({ type: "play_card", cardInstanceId: card.instanceId, target: { kind: "slot", slotId } });
    this.showMessage(result.accepted ? "基地卡牌已落地" : (result.reason ?? "目标不合法"), result.accepted);
    if (result.accepted) {
      this.selectedCardInstanceId = null;
      this.selectedSlotId = slotId;
    }
    this.renderState();
  }

  private handleWallClick(): void {
    if (!this.canReceiveGameplayInput()) return;
    if (this.discardMode) {
      this.showMessage("弃牌模式 · 点击一张手牌", false);
      this.renderState();
      return;
    }
    const card = this.cardFromSelected();
    if (!card) {
      this.showMessage("选择工程 / 修理牌后点击城墙", false);
      return;
    }
    const definition = this.cardDefinition(card.definitionId);
    if (definition.category !== "base" || definition.id !== "repair_shop") {
      this.showMessage("只有工程 / 修理牌可以作用于城墙", false);
      return;
    }
    const result = this.simulation.dispatch({ type: "play_card", cardInstanceId: card.instanceId, target: { kind: "wall" } });
    this.showMessage(result.accepted ? "城墙工程效果已生效" : (result.reason ?? "暂不可修理"), result.accepted);
    if (result.accepted) this.selectedCardInstanceId = null;
    this.renderState();
  }

  private toggleDiscardMode(): void {
    if (!this.canReceiveGameplayInput()) return;
    if (this.selectedCardInstanceId) {
      const result = this.simulation.dispatch({ type: "discard_card", cardInstanceId: this.selectedCardInstanceId });
      this.showMessage(result.accepted ? "手牌已弃置，无资源返还" : (result.reason ?? "暂不可弃牌"), result.accepted);
      this.selectedCardInstanceId = null;
      this.selectedSlotId = null;
      this.discardMode = false;
      this.renderState();
      return;
    }
    this.discardMode = !this.discardMode;
    this.selectedSlotId = null;
    this.showMessage(this.discardMode ? "弃牌模式 · 点击一张手牌" : "已取消弃牌模式", true);
    this.renderState();
  }

  private discardCardAtIndex(index: number): void {
    const card = this.simulation.getState().hand[index];
    if (!card) return;
    const result = this.simulation.dispatch({ type: "discard_card", cardInstanceId: card.instanceId });
    this.showMessage(result.accepted ? "手牌已弃置，无资源返还" : (result.reason ?? "暂不可弃牌"), result.accepted);
    if (result.accepted) {
      this.selectedCardInstanceId = null;
      this.selectedSlotId = null;
      this.discardMode = false;
    }
    this.renderState();
  }

  private handleContextAction(): void {
    if (!this.canReceiveGameplayInput()) return;
    if (this.discardMode || this.selectedCardInstanceId) {
      this.toggleDiscardMode();
      return;
    }
    if (this.selectedSlotId) {
      this.destroySelectedBuilding();
      return;
    }
    this.toggleDiscardMode();
  }

  private destroySelectedBuilding(): void {
    if (!this.canReceiveGameplayInput() || !this.selectedSlotId) {
      this.showMessage("先点击一座非主城建筑", false);
      return;
    }
    const result = this.simulation.dispatch({ type: "destroy_building", slotId: this.selectedSlotId });
    this.showMessage(result.accepted ? "建筑已拆除，木材不返还" : (result.reason ?? "暂不可拆除"), result.accepted);
    if (result.accepted) this.selectedSlotId = null;
    this.renderState();
  }

  private cardFromSelected(): CardInstance | null {
    if (!this.selectedCardInstanceId) return null;
    return this.simulation.getState().hand.find((card) => card.instanceId === this.selectedCardInstanceId) ?? null;
  }

  private syncSelectionWithState(state: GameState): void {
    if (!this.selectedCardInstanceId) return;
    const card = state.hand.find((candidate) => candidate.instanceId === this.selectedCardInstanceId);
    if (!card) {
      this.selectedCardInstanceId = null;
      this.selectedSlotId = null;
      return;
    }
    const readiness = getCardUseReadiness(this.cardDefinition(card.definitionId), state);
    if (!readiness.usable) {
      this.selectedCardInstanceId = null;
      this.selectedSlotId = null;
      this.showMessage(readiness.hint, false);
    }
  }

  private processEvents(events: GameEvent[]): void {
    for (const event of events) {
      if (event.type === "tower_attack") {
        const building = this.simulation.getState().buildings.find((item) => item.id === event.buildingId);
        if (building) this.feedbacks.push({ kind: "shot", x: this.towerX(building), y: this.towerY(building), targetX: this.enemyX(event.targetId), targetY: this.enemyY(event.targetPosition), ttl: 0.16 });
      } else if (event.type === "enemy_hit") {
        this.feedbacks.push({ kind: "hit", x: this.enemyX(event.enemyId), y: this.enemyY(event.position), ttl: 0.16 });
      } else if (event.type === "enemy_defeated") {
        this.feedbacks.push({ kind: "defeat", x: this.enemyX(event.enemyId), y: this.enemyY(event.position), ttl: 0.34 });
      } else if (event.type === "enemy_charge_warning") {
        this.showBattleNotice("⚠ 冲锋预警 · " + event.durationSeconds.toFixed(1) + " 秒", "#f06a6a", this.showcaseCapture === "charge" ? 60 : event.durationSeconds + 0.3);
      } else if (event.type === "enemy_charge_started") {
        this.showBattleNotice("冲锋开始 · 直线突进", "#f28b37", 1.2);
      } else if (event.type === "enemy_charge_impact") {
        this.showBattleNotice("冲锋撞墙 · 城墙承受冲击", "#f06a6a", 1.5);
      } else if (event.type === "overlord_inspire") {
        this.showBattleNotice("尸潮君王鼓舞 · 残余尸潮 +" + Math.round((event.multiplier - 1) * 100) + "%", "#f6c453", this.showcaseCapture === "inspire" ? 60 : event.durationSeconds);
      } else if (event.type === "enemy_burned") {
        this.showBattleNotice("燃烧区域 · " + event.damagePerSecond + "/秒 · " + event.durationSeconds + "秒", "#f28b37", 1.4);
      } else if (event.type === "tower_special") {
        this.showBattleNotice(event.effect + "命中", event.effect === "过载" ? "#d06cff" : "#f6c453", 0.8);
      } else if (event.type === "global_freeze_armed") {
        this.showBattleNotice("全场短冻已预置 · 等待下一只敌人", "#8ce8ff", 2.2);
      } else if (event.type === "global_freeze_started") {
        this.showBattleNotice("全场短冻启动 · 敌停塔不停", "#8ce8ff", event.durationSeconds);
      } else if (event.type === "focus_fire_marked") {
        this.showBattleNotice(event.nextSpawn ? "集中火力已预置 · 锁定下一只" : "集中火力锁定目标", "#ffb45c", 1.6);
      } else if (event.type === "wave_started") {
        this.showMessage("第 " + event.wave + " 波尸潮已接近", false);
      }
      const shouldCaptureCharge = this.showcaseCapture === "charge" && (event.type === "enemy_charge_warning" || event.type === "enemy_charge_started" || event.type === "enemy_charge_impact");
      const shouldCaptureInspire = this.showcaseCapture === "inspire" && event.type === "overlord_inspire";
      if ((shouldCaptureCharge || shouldCaptureInspire) && this.simulation.getState().phase === "RUNNING") this.showcaseFreeze = true;
    }
  }

  private renderState(): void {
    const state = this.simulation.getState();
    if (!isGameplayInputPhase(state.phase)) this.discardMode = false;
    this.syncSelectionWithState(state);
    if (import.meta.env.DEV) {
      const debugState = {
        phase: state.phase,
        wave: state.wave,
        effectiveBattleTimeSeconds: state.effectiveBattleTimeSeconds,
        enemyCount: state.enemies.filter((enemy) => enemy.hp > 0).length,
        notice: this.battleNoticeTimer > 0 ? this.battleNoticeText.text : "",
        hand: state.hand.map((card) => card.definitionId),
        nextSupplyCard: state.nextSupplyCard?.definitionId ?? null,
        waitingCard: state.supplyWaitingCard?.definitionId ?? null,
        wallHp: state.wallHp,
        gold: state.gold,
        wood: Math.floor(state.wood),
      };
      (window as Window & { __zcampDebug?: Record<string, unknown> }).__zcampDebug = debugState;
      document.body.dataset.zcampPhase = state.phase;
      document.body.dataset.zcampWave = String(state.wave);
      document.body.dataset.zcampEnemyCount = String(debugState.enemyCount);
      document.body.dataset.zcampNotice = debugState.notice;
      document.body.dataset.zcampHand = debugState.hand.join(",");
      document.body.dataset.zcampNextSupply = debugState.nextSupplyCard ?? "";
    }

    this.phaseText.setText(this.phaseLabel(state.phase));
    this.waveText.setText(state.wave > 0 ? "波次  " + state.wave + " / " + state.maxWave : "首波");
    const terminal = state.phase === "VICTORY" || state.phase === "DEFEAT";
    this.timerText.setText(terminal ? "战斗结束" : state.phase === "OPENING_COUNTDOWN" || state.wave === 0 ? "首波准备中" : "下一波  " + this.formatSeconds(state.nextWaveTimeRemainingSeconds));
    this.woodText.setText("木材  " + Math.floor(state.wood));
    this.woodRateText.setText("+" + this.formatRate(getWoodProductionPerSecond(state)) + "/秒");
    this.goldText.setText("金币  " + Math.floor(state.gold));
    this.woodIcon.clear();
    this.woodIcon.fillStyle(0xc9853d, 1).fillRect(36, 1105, 24, 14);
    this.woodIcon.fillStyle(0xe2ad64, 1).fillCircle(36, 1112, 7);
    this.woodIcon.lineStyle(2, 0x6f401f, 1).strokeCircle(36, 1112, 5);
    this.woodIcon.lineStyle(2, 0x6f401f, 0.9).lineBetween(44, 1108, 58, 1108).lineBetween(44, 1116, 58, 1116);
    this.goldIcon.clear();
    this.goldIcon.fillStyle(COLORS.gold, 1).fillCircle(140, 1106, 9);
    this.goldIcon.lineStyle(2, 0x714c17, 1).strokeCircle(140, 1106, 7);
    this.goldIcon.lineStyle(2, 0xfff0a0, 0.8).lineBetween(136, 1106, 144, 1106);

    const shownWallMax = this.showcaseMode ? 100 : state.wallMaxHp;
    const shownWallHp = this.showcaseMode ? 100 : Math.ceil(state.wallHp);
    const wallRatio = state.wallMaxHp > 0 ? state.wallHp / state.wallMaxHp : 0;
    const selectedWallCard = this.cardFromSelected();
    const selectedWallDefinition = selectedWallCard ? this.cardDefinition(selectedWallCard.definitionId) : null;
    const wallHint = selectedWallDefinition?.category === "base" ? " · " + this.wallTargetStatus(selectedWallDefinition, state).label.replace(String.fromCharCode(10), " ") : "";
    this.wallText
      .setText("城墙  " + shownWallHp + " / " + shownWallMax + (state.wallShieldHp > 0 ? "   护盾 " + Math.ceil(state.wallShieldHp) : "") + wallHint)
      .setColor(wallRatio > 0.35 ? "#fff3d2" : "#f06a6a");

    const activeEnemyCount = state.enemies.filter((enemy) => enemy.hp > 0).length;
    this.enemyText.setText("威胁  " + activeEnemyCount + " · 击杀  " + state.defeatedEnemies);

    const transientMessageVisible = this.messageTimer > 0 && this.messageText.text.length > 0;
    this.statusText
      .setText(transientMessageVisible ? this.messageText.text : this.discardMode ? "弃牌模式 · 点击一张手牌" : this.selectedCardInstanceId ? this.compactTargetStatus(state) : this.statusLabel(state))
      .setColor(transientMessageVisible ? this.messageColor : "#fff0b0");
    // Selection and target feedback live on the card / grid; keep transient copy out of the battle field.
    this.messageText.setVisible(false);
    const canPause = state.phase === "RUNNING" || state.phase === "TACTICAL_PAUSE";
    this.pauseButtonLabel.setText(state.phase === "TACTICAL_PAUSE" ? "继续" : "暂停");
    this.pauseButton.setFillStyle(state.phase === "OPENING_COUNTDOWN" ? COLORS.line : COLORS.blue, 1);
    this.pauseButton.input!.enabled = canPause;
    this.pauseButton.setVisible(canPause);
    this.pauseButtonLabel.setVisible(canPause);

    this.countdownText.setVisible(state.phase === "OPENING_COUNTDOWN");
    if (state.phase === "OPENING_COUNTDOWN") this.countdownText.setText(String(Math.ceil(state.openingCountdownRemainingSeconds)));

    const supplyPresentation = getSupplyProgressPresentation(state);
    this.supplyText.setText(supplyPresentation.label).setColor(supplyPresentation.state === "waiting" ? "#ffd37a" : supplyPresentation.state === "stopped" ? "#c0b995" : "#fff0c2");

    if (state.globalFreezeNextSpawn && this.battleNoticeTimer <= 0) this.showBattleNotice("全场短冻预置 · 下一只敌人启动", "#8ce8ff", 0.2);
    if (state.globalFreezeRemainingSeconds > 0 && this.battleNoticeTimer <= 0) this.showBattleNotice("全场短冻 · 敌停塔不停", "#8ce8ff", 0.2);
    this.battleNoticeText.setVisible(this.battleNoticeTimer > 0);

    const canContextAction = isGameplayInputPhase(state.phase);
    const contextLabel = this.discardMode ? "取消" : this.selectedSlotId && !this.selectedCardInstanceId ? "拆除" : "弃牌";
    this.contextActionButton.input!.enabled = canContextAction;
    this.contextActionButton.setFillStyle(this.discardMode ? COLORS.blue : COLORS.line, 1);
    this.contextActionLabel.setText(contextLabel);
    this.contextActionButton.setVisible(canContextAction);
    this.contextActionLabel.setVisible(canContextAction);

    // Tactical pause is a planning ribbon, not a modal that hides the battlefield.
    this.tacticalPanel.setVisible(false);
    this.tacticalTitle.setVisible(false);
    this.tacticalHint.setVisible(false);
    this.tacticalResumeButton.setVisible(false);
    this.tacticalResumeLabel.setVisible(false);
    this.tacticalRestartButton.setVisible(false);
    this.tacticalRestartLabel.setVisible(false);

    this.systemOverlay.setVisible(state.phase === "SYSTEM_PAUSE");
    this.systemTitle.setVisible(state.phase === "SYSTEM_PAUSE");
    this.systemHint.setVisible(state.phase === "SYSTEM_PAUSE");

    const resultVisible = state.phase === "VICTORY" || state.phase === "DEFEAT";
    this.resultOverlay.setVisible(resultVisible);
    this.resultTitle.setVisible(resultVisible);
    this.resultHint.setVisible(resultVisible);
    this.resultRestartButton.setVisible(resultVisible);
    this.resultRestartLabel.setVisible(resultVisible);
    if (resultVisible) {
      const victory = state.phase === "VICTORY";
      this.resultTitle.setText(victory ? "守住了" : "城墙失守").setColor(victory ? "#62d79b" : "#f06a6a");
      this.resultHint.setText(victory ? "最终首领已击破 · 波次 " + state.wave + " · 击杀 " + state.defeatedEnemies : "防线在第 " + state.wave + " 波失守 · 重新部署");
    }

    this.renderDynamic(state);
  }
  private renderDynamic(state: GameState): void {
    this.dynamic.clear();

    const supplyPresentation = getSupplyProgressPresentation(state);
    const railX = 220;
    const railY = 1112;
    const railWidth = 370;
    this.dynamic.fillStyle(0x2d281d, 0.9).fillRect(railX, railY, railWidth, 10);
    this.dynamic.lineStyle(1, 0xd3a345, 0.9).strokeRect(railX, railY, railWidth, 10);
    const railColor = supplyPresentation.state === "waiting" ? COLORS.gold : supplyPresentation.state === "stopped" ? 0x82775b : COLORS.cyan;
    this.dynamic.fillStyle(railColor, supplyPresentation.state === "stopped" ? 0.55 : 0.95).fillRect(railX + 2, railY + 2, (railWidth - 4) * supplyPresentation.ratio, 6);

    const wallRatio = Math.max(0, Math.min(1, state.wallHp / state.wallMaxHp));
    const wallColor = wallRatio > 0.35 ? 0x6d5235 : 0x71342d;
    this.dynamic.fillStyle(wallColor, 1).fillRect(WALL_ZONE.x, WALL_ZONE.y, WALL_ZONE.width, WALL_ZONE.height);
    this.dynamic.lineStyle(2, 0x9a7046, 1).lineBetween(WALL_ZONE.x, 721, WALL_ZONE.x + WALL_ZONE.width, 721);
    this.dynamic.lineStyle(2, 0x2a1c14, 0.9).lineBetween(WALL_ZONE.x, 756, WALL_ZONE.x + WALL_ZONE.width, 756);
    this.dynamic.fillStyle(0x271d15, 0.7).fillRect(44, 712, 632, 7);
    this.dynamic.fillStyle(wallRatio > 0.35 ? COLORS.success : COLORS.danger, 1).fillRect(44, 712, 632 * wallRatio, 7);
    if (state.wallShieldHp > 0) {
      this.dynamic.lineStyle(3, COLORS.cyan, 0.95).strokeRect(30, 711, 660, 56);
    }
    if (wallRatio < 0.5) {
      this.dynamic.lineStyle(3, COLORS.danger, 0.8).lineBetween(178, 731, 205, 752);
      this.dynamic.lineBetween(205, 752, 226, 735);
      this.dynamic.lineBetween(514, 730, 492, 752);
      this.dynamic.lineBetween(492, 752, 470, 739);
    }

    const selectedDefinition = this.selectedCardInstanceId ? this.cardFromSelected() : null;
    const selectedCardDefinition = selectedDefinition ? this.cardDefinition(selectedDefinition.definitionId) : null;
    for (const layout of CAMP_SLOT_LAYOUTS) {
      const building = state.buildings.find((item) => item.slotId === layout.id);
      const selected = this.selectedSlotId === layout.id;
      const target = selectedCardDefinition?.category === "base" ? this.slotTargetStatus(layout.id, building, selectedCardDefinition, state) : null;
      const borderColor = target ? (target.legal ? COLORS.success : COLORS.danger) : selected ? COLORS.gold : COLORS.line;
      const fillColor = target?.legal ? 0x29483b : target ? 0x493039 : building ? 0x263d32 : 0x263a2c;
      this.dynamic.fillStyle(fillColor, 1).fillRect(layout.x, layout.y, layout.width, layout.height);
      this.dynamic.lineStyle(target || selected ? 4 : 2, borderColor, 1).strokeRect(layout.x, layout.y, layout.width, layout.height);
      if (building) this.drawBuilding(building, layout.x + layout.width / 2, layout.y + layout.height / 2 - (target ? 6 : 0));
      else this.dynamic.fillStyle(target?.legal ? COLORS.success : 0x53644a, target ? 0.9 : 0.7).fillCircle(layout.x + layout.width / 2, layout.y + layout.height / 2, 17);

      const label = this.slotLabels[CAMP_SLOT_LAYOUTS.indexOf(layout)];
      if (label) {
        const labelY = target ? layout.y + layout.height - 16 : building ? layout.y + layout.height - 10 : layout.y + layout.height / 2;
        label.setPosition(layout.x + layout.width / 2, labelY);
        label.setFontSize(target ? "10px" : building ? "11px" : "13px");
        label.setText(target ? (building && target.label !== this.buildingLabel(building) ? this.buildingLabel(building) + String.fromCharCode(10) + target.label : target.label) : building ? this.buildingLabel(building) : "空格");
        label.setColor(target?.legal ? "#fff3b0" : target ? "#ffb0a6" : building?.kind === "main_city" ? "#ffe08a" : building ? "#fff3d2" : "#d6d39c");
      }
    }

    const wallTarget = selectedCardDefinition?.category === "base" ? this.wallTargetStatus(selectedCardDefinition, state) : null;
    this.dynamic.lineStyle(wallTarget ? 4 : 2, wallTarget ? (wallTarget.legal ? COLORS.success : COLORS.danger) : COLORS.line, 1)
      .strokeRect(WALL_ZONE.x, WALL_ZONE.y, WALL_ZONE.width, WALL_ZONE.height);

    if (state.globalFreezeRemainingSeconds > 0) {
      this.dynamic.lineStyle(4, COLORS.cyan, 0.85).strokeRect(30, 198, 660, 430);
    }

    const visibleEnemyIds = new Set<string>();
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0) continue;
      visibleEnemyIds.add(enemy.id);
      const x = this.enemyX(enemy.id);
      const y = this.enemyY(enemy.position);
      const definition = this.enemyDefinition(enemy.definitionId);
      const color = this.enemyColor(definition);
      const radius = definition.tier === "boss" ? 21 : definition.tier === "elite" ? 16 : enemy.definitionId === "tank" ? 14 : 11;

      if (state.focusFireTargetId === enemy.id && state.focusFireRemainingSeconds > 0) {
        this.dynamic.lineStyle(3, COLORS.gold, 1).strokeCircle(x, y, radius + 9);
      }
      if (enemy.chargeWarningRemainingSeconds > 0) {
        this.dynamic.lineStyle(4, COLORS.danger, 0.95).strokeCircle(x, y, radius + 14);
        this.dynamic.lineStyle(2, COLORS.danger, 0.45).strokeCircle(x, y, radius + 20);
      }
      if (state.overlordInspireRemainingSeconds > 0 && definition.tier !== "boss") {
        this.dynamic.lineStyle(3, COLORS.orange, 0.7).strokeCircle(x, y, radius + 6);
      }
      if (enemy.burnRemainingSeconds > 0) {
        const burnRadius = 22 + Math.min(22, enemy.burnRemainingSeconds * 3);
        this.dynamic.lineStyle(2, COLORS.orange, 0.8).strokeCircle(x, y, burnRadius);
      }

      this.drawEnemy(definition, enemy, x, y, radius);
      this.dynamic.fillStyle(0x263029, 1).fillRect(x - 20, y - 30, 40, 4);
      this.dynamic.fillStyle(COLORS.success, 1).fillRect(x - 20, y - 30, 40 * Math.max(0, enemy.hp / enemy.maxHp), 4);

      let label = this.enemyLabels.get(enemy.id);
      if (!label) {
        const labelSize = definition.tier === "boss" ? 15 : definition.tier === "elite" ? 13 : 11;
        label = this.add.text(x, y - radius - 14, "", {
          ...this.textStyle(labelSize, definition.tier === "boss" ? "#f06a6a" : definition.tier === "elite" ? "#f28b37" : "#e4efdc"),
          align: "center",
          stroke: "#19231b",
          strokeThickness: definition.tier === "boss" ? 4 : 3,
        }).setOrigin(0.5).setDepth(7);
        this.enemyLabels.set(enemy.id, label);
      }
      const warningLabel = enemy.chargeWarningRemainingSeconds > 0 ? " · ⚠冲锋" : enemy.burnRemainingSeconds > 0 ? " · 燃烧" : "";
      const showLabel = definition.tier !== "normal" || warningLabel.length > 0 || (state.focusFireTargetId === enemy.id && state.focusFireRemainingSeconds > 0);
      label.setPosition(x, y - radius - 14).setText(definition.displayName + warningLabel).setVisible(showLabel);
    }
    for (const [enemyId, label] of this.enemyLabels) {
      if (!visibleEnemyIds.has(enemyId)) label.setVisible(false);
    }

    for (const feedback of this.feedbacks) {
      if (feedback.kind === "shot" && feedback.targetX !== undefined && feedback.targetY !== undefined) {
        this.dynamic.lineStyle(4, COLORS.gold, Math.min(1, feedback.ttl * 7)).beginPath();
        this.dynamic.moveTo(feedback.x, feedback.y);
        this.dynamic.lineTo(feedback.targetX, feedback.targetY);
        this.dynamic.strokePath();
      } else if (feedback.kind === "hit") {
        this.dynamic.lineStyle(3, 0xffffff, Math.min(1, feedback.ttl * 7)).strokeCircle(feedback.x, feedback.y, 22);
      } else {
        this.dynamic.lineStyle(4, COLORS.orange, Math.min(1, feedback.ttl * 4)).strokeCircle(feedback.x, feedback.y, 26);
      }
    }

    for (const [index, button] of this.cardButtons.entries()) {
      const card = state.hand[index];
      const selected = card?.instanceId === this.selectedCardInstanceId;
      const definition = card ? this.cardDefinition(card.definitionId) : null;
      const readiness = definition ? getCardUseReadiness(definition, state) : null;
      const usable = readiness?.usable ?? false;
      button.setVisible(Boolean(card));
      button.setFillStyle(selected ? 0x34583e : !card ? COLORS.panelDeep : usable ? COLORS.panel : readiness?.kind === "insufficient" ? 0x4b4030 : 0x394238, 1);
      button.setAlpha(card && readiness?.hardBlocked ? 0.72 : 1);
      button.setStrokeStyle(selected ? 3 : 2, selected ? COLORS.gold : card && !usable ? 0x7f7560 : COLORS.line, 1);

      const paymentFill = this.cardPaymentFills[index]!;
      paymentFill.clear().setVisible(Boolean(card));
      const glyph = this.cardGlyphs[index]!;
      glyph.clear().setVisible(Boolean(card));
      glyph.setAlpha(card && readiness?.hardBlocked ? 0.42 : 1);
      if (card && definition) this.drawCardGlyph(glyph, CARD_LAYOUTS[index]!.x + CARD_LAYOUTS[index]!.width - 26, CARD_LAYOUTS[index]!.y + 35, definition);

      const costIcon = this.cardCostIcons[index]!;
      costIcon.clear().setVisible(Boolean(card));
      const text = this.cardTextBlocks[index]!;
      text.title.setVisible(Boolean(card));
      text.role.setVisible(Boolean(card));
      text.cost.setVisible(Boolean(card));
      text.hint.setVisible(Boolean(card));
      text.category.setVisible(Boolean(card));
      if (card && definition && readiness) {
        this.drawCardPayment(paymentFill, CARD_LAYOUTS[index]!, readiness);
        this.drawResourceIcon(costIcon, CARD_LAYOUTS[index]!.x + 19, CARD_LAYOUTS[index]!.y + 88, readiness.resource, readiness.hardBlocked);
        const warningColor = readiness.kind === "insufficient" ? "#ffd37a" : "#c1c6b5";
        const cardColor = readiness.hardBlocked ? warningColor : definition.accentColor;
        text.title.setText(definition.displayName).setColor(cardColor).setAlpha(readiness.hardBlocked ? 0.72 : 1);
        text.role.setText(definition.role);
        text.cost.setText(readiness.displayCost === null ? "" : String(readiness.displayCost));
        text.hint.setText(selected && definition.category === "base" ? "已选 · 点目标" : selected ? "已选 · 再点确认" : readiness.hardBlocked ? readiness.hint : readiness.usable ? "可用" : "");
        text.hint.setColor(readiness.usable ? "#9ff0b2" : warningColor);
        text.category.setText(definition.category === "base" ? "基地" : definition.category === "permanent" ? "永久" : "战术");
        text.category.setColor(definition.category === "base" ? "#c5d2bd" : definition.category === "permanent" ? "#f6c453" : "#8ce8ff");
        text.role.setAlpha(readiness.hardBlocked ? 0.65 : 1);
        text.cost.setColor(readiness.usable ? "#ffe08a" : warningColor).setAlpha(readiness.hardBlocked ? 0.72 : 1);
        text.hint.setAlpha(1);
        text.category.setAlpha(readiness.hardBlocked ? 0.7 : 1);
      }
    }
  }

  private drawCardPayment(
    graphics: Phaser.GameObjects.Graphics,
    layout: (typeof CARD_LAYOUTS)[number],
    readiness: ReturnType<typeof getCardUseReadiness>,
  ): void {
    const x = layout.x + 2;
    const y = layout.y + 2;
    const width = layout.width - 4;
    const height = layout.height - 4;
    if (readiness.hardBlocked) {
      graphics.fillStyle(0x18231d, 0.66).fillRect(x, y, width, height);
      graphics.lineStyle(2, 0xb9bda7, 0.72).strokeRect(layout.x + layout.width / 2 - 8, layout.y + 66, 16, 14);
      graphics.lineStyle(3, 0xb9bda7, 0.72).arc(layout.x + layout.width / 2, layout.y + 66, 11, Math.PI, Math.PI * 2, false);
      return;
    }
    const progress = readiness.progress ?? 0;
    const fillHeight = height * progress;
    const fillColor = readiness.resource === "wood" ? 0xc9853d : COLORS.gold;
    if (fillHeight > 0) graphics.fillStyle(fillColor, 0.48).fillRect(x, y + height - fillHeight, width, fillHeight);
    const liquidY = y + height - fillHeight;
    graphics.lineStyle(2, readiness.resource === "wood" ? 0xe2ad64 : 0xfff0a0, 0.95).lineBetween(x, liquidY, x + width, liquidY);
    if (readiness.progress !== null && readiness.progress >= 1) {
      graphics.lineStyle(2, COLORS.success, 0.95).strokeRect(layout.x + 1, layout.y + 1, layout.width - 2, layout.height - 2);
    }
  }

  private drawResourceIcon(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    resource: "wood" | "gold",
    muted: boolean,
  ): void {
    const alpha = muted ? 0.55 : 1;
    if (resource === "wood") {
      graphics.fillStyle(0xc9853d, alpha).fillRect(x - 8, y - 5, 14, 10);
      graphics.fillStyle(0xe2ad64, alpha).fillCircle(x - 8, y, 5);
      graphics.lineStyle(1, 0x6f401f, alpha).strokeCircle(x - 8, y, 4);
      graphics.lineStyle(1, 0x6f401f, alpha).lineBetween(x - 4, y - 3, x + 5, y - 3).lineBetween(x - 4, y + 3, x + 5, y + 3);
      return;
    }
    graphics.fillStyle(COLORS.gold, alpha).fillCircle(x - 1, y, 7);
    graphics.lineStyle(1, 0x714c17, alpha).strokeCircle(x - 1, y, 5);
    graphics.lineStyle(1, 0xfff0a0, alpha).lineBetween(x - 4, y, x + 2, y);
  }
  private drawCardGlyph(glyph: Phaser.GameObjects.Graphics, x: number, y: number, definition: CardDefinition): void {
    const color = this.hex(definition.accentColor);
    glyph.lineStyle(2, 0x182219, 0.95);
    if (definition.category === "base") {
      glyph.fillStyle(color, 1).fillCircle(x, y, 12);
      glyph.lineStyle(2, 0xf1f5df, 0.8).strokeCircle(x, y, 12);
      if (definition.effect.kind === "base" && definition.effect.targetKind === "tower") {
        glyph.lineStyle(4, 0xf1f5df, 1).lineBetween(x - 3, y + 2, x + 10, y - 6);
        glyph.lineBetween(x - 3, y - 2, x + 10, y + 6);
      } else {
        glyph.fillTriangle(x, y - 8, x - 9, y + 8, x + 9, y + 8);
      }
      return;
    }
    if (definition.category === "permanent") {
      glyph.fillStyle(color, 0.28).fillCircle(x, y, 13);
      glyph.lineStyle(3, color, 1).strokeCircle(x, y, 11);
      glyph.fillStyle(color, 1).fillCircle(x, y, 4);
      return;
    }
    glyph.fillStyle(color, 0.9).fillTriangle(x, y - 12, x - 11, y + 9, x + 11, y + 9);
    glyph.lineStyle(2, 0xf1f5df, 0.9).lineBetween(x - 3, y - 5, x + 4, y + 1);
  }

  private selectedTargetHint(state: GameState): string {
    const card = this.cardFromSelected();
    if (!card) return "";
    const definition = this.cardDefinition(card.definitionId);
    if (definition.category !== "base" || definition.effect.kind !== "base") {
      return " · 已选 " + definition.displayName + " · " + getCardUseReadiness(definition, state).hint;
    }
    return " · 目标提示：绿可用 / 红不可用";
  }

  private compactTargetStatus(state: GameState): string {
    const phase = state.phase === "TACTICAL_PAUSE" ? "战术暂停 · 时间 / 战斗冻结" : state.phase === "RUNNING" ? "连续战斗" : "开局部署";
    return phase + this.selectedTargetHint(state);
  }

  private slotTargetStatus(slotId: string, building: BuildingState | undefined, card: CardDefinition, state: GameState): { legal: boolean; label: string } {
    if (card.effect.kind !== "base") return { legal: false, label: "不可用" };
    const readiness = getCardUseReadiness(card, state);
    const action = findBaseAction(readiness, { kind: "slot", slotId });
    if (!building && action) {
      const affordable = state.wood >= action.cost;
      return { legal: affordable, label: affordable ? "建造 木材 " + action.cost : "还差 " + Math.ceil(action.cost - state.wood) + " 木材" };
    }
    if (!building) return { legal: false, label: "暂无合法目标" };
    if (building.kind === "main_city") return { legal: false, label: "主城 · 固定" };
    if (!buildingMatchesBaseAction(building, card)) {
      return { legal: false, label: "异类 · 不可用" };
    }
    if (building.level >= 3) return { legal: false, label: "已达 Lv.3" };
    if (!action) return { legal: false, label: "暂无合法目标" };
    const affordable = state.wood >= action.cost;
    return { legal: affordable, label: (affordable ? "升级 木材 " : "还差 ") + (affordable ? action.cost : Math.ceil(action.cost - state.wood)) + (affordable ? "" : " 木材") };
  }
  private wallTargetStatus(card: CardDefinition, state: GameState): { legal: boolean; label: string } {
    if (card.effect.kind !== "base" || card.effect.targetKind !== "repair_shop") return { legal: false, label: "城墙\n当前牌不可用" };
    const action = findBaseAction(getCardUseReadiness(card, state), { kind: "wall" });
    if (!action) return { legal: false, label: "城墙\n暂无合法目标" };
    const affordable = state.wood >= action.cost;
    return { legal: affordable, label: affordable ? "城墙\n修理 / 护盾 " + action.cost : "城墙\n还差 " + Math.ceil(action.cost - state.wood) + " 木材" };
  }

  private drawEnemy(definition: EnemyDefinition, enemy: EnemyRuntimeState, x: number, y: number, radius: number): void {
    const color = this.enemyColor(definition);
    const dark = 0x263029;
    const light = 0xffe7aa;
    const legY = y + radius * 0.92;
    const headY = y - radius * 0.52;

    // Toy-like silhouettes: head, torso, short limbs and role-specific armor.
    this.dynamic.fillStyle(0x513c1e, 0.34).fillRect(x - radius, y + radius * 0.82, radius * 2, 5);
    if (definition.tier === "boss") {
      this.dynamic.fillStyle(dark, 1).fillRect(x - 18, y - 1, 36, 28);
      this.dynamic.fillStyle(color, 1).fillCircle(x, headY, 15);
      this.dynamic.fillStyle(0x482c25, 1).fillTriangle(x, headY - 19, x - 13, headY - 5, x - 5, headY - 22);
      this.dynamic.fillTriangle(x, headY - 20, x + 13, headY - 5, x + 5, headY - 22);
      this.dynamic.fillStyle(light, 1).fillCircle(x - 5, headY - 1, 3);
      this.dynamic.fillCircle(x + 5, headY - 1, 3);
      this.dynamic.lineStyle(5, color, 1).lineBetween(x - 22, y + 2, x - 31, y + 18);
      this.dynamic.lineBetween(x + 22, y + 2, x + 31, y + 18);
      this.dynamic.lineStyle(5, dark, 1).lineBetween(x - 10, y + 26, x - 15, legY + 5);
      this.dynamic.lineBetween(x + 10, y + 26, x + 15, legY + 5);
      return;
    }

    if (definition.behavior === "tank") {
      this.dynamic.fillStyle(color, 1).fillRect(x - 15, y - 3, 30, 25);
      this.dynamic.lineStyle(3, light, 0.9).strokeRect(x - 15, y - 3, 30, 25);
      this.dynamic.fillStyle(color, 1).fillCircle(x, headY, 11);
      this.dynamic.fillStyle(0x5b4e82, 1).fillRect(x - 14, headY - 3, 28, 7);
      this.dynamic.lineStyle(5, dark, 1).lineBetween(x - 15, y + 5, x - 25, y + 17);
      this.dynamic.lineBetween(x + 15, y + 5, x + 25, y + 17);
      this.dynamic.lineStyle(5, dark, 1).lineBetween(x - 8, y + 22, x - 12, legY + 3);
      this.dynamic.lineBetween(x + 8, y + 22, x + 12, legY + 3);
      return;
    }

    const runner = definition.behavior === "runner";
    const elite = definition.tier === "elite";
    const bodyWidth = elite ? 17 : runner ? 11 : 14;
    const bodyHeight = elite ? 23 : runner ? 20 : 18;
    this.dynamic.fillStyle(color, 1).fillRect(x - bodyWidth, y - 1, bodyWidth * 2, bodyHeight);
    if (elite) {
      this.dynamic.lineStyle(3, light, 0.9).strokeRect(x - bodyWidth - 3, y - 5, bodyWidth * 2 + 6, bodyHeight + 7);
      this.dynamic.fillStyle(0xd98b31, 1).fillTriangle(x - 19, y - 5, x - 8, y - 16, x - 5, y + 4);
      this.dynamic.fillTriangle(x + 19, y - 5, x + 8, y - 16, x + 5, y + 4);
    }
    this.dynamic.fillStyle(color, 1).fillCircle(x + (runner ? 4 : 0), headY, runner ? 8 : 9);
    this.dynamic.fillStyle(light, 1).fillCircle(x - 3 + (runner ? 4 : 0), headY - 1, 2);
    this.dynamic.fillCircle(x + 3 + (runner ? 4 : 0), headY - 1, 2);
    this.dynamic.lineStyle(3, dark, 1).lineBetween(x - bodyWidth, y + 3, x - bodyWidth - (runner ? 10 : 6), y + 16);
    this.dynamic.lineBetween(x + bodyWidth, y + 3, x + bodyWidth + (runner ? 8 : 6), y + 14);
    this.dynamic.lineStyle(4, dark, 1).lineBetween(x - 6, y + bodyHeight, x - 9, legY + 3);
    this.dynamic.lineBetween(x + 6, y + bodyHeight, x + 9, legY + 3);
    if (enemy.burnRemainingSeconds > 0) this.dynamic.lineStyle(2, 0xffd15c, 0.9).strokeCircle(x, y + 2, radius + 3);
  }
  private drawBuilding(building: BuildingState, x: number, y: number): void {
    if (building.kind === "main_city") {
      this.dynamic.fillStyle(0x73552c, 1).fillRect(x - 34, y - 18, 68, 34);
      this.dynamic.lineStyle(3, COLORS.gold, 1).strokeRect(x - 34, y - 18, 68, 34);
      this.dynamic.fillStyle(0xf6c453, 1).fillTriangle(x, y - 43, x - 19, y - 17, x + 19, y - 17);
      this.dynamic.fillStyle(0xffe59a, 1).fillCircle(x, y - 28, 4);
      return;
    }

    const color = building.kind === "tower"
      ? this.hex(this.towerDefinition(building.definitionId).accentColor)
      : building.kind === "lumberyard" ? 0x6fce8b : 0x8fb5ff;
    this.dynamic.fillStyle(0x1b241d, 0.55).fillCircle(x, y + 18, 25);
    this.dynamic.fillStyle(0x55636a, 1).fillCircle(x, y + 8, 23);
    this.dynamic.lineStyle(3, 0x202a22, 1).strokeCircle(x, y + 8, 23);

    if (building.kind === "tower") {
      if (building.definitionId === "machine_gun") {
        this.dynamic.fillStyle(color, 1).fillRect(x - 15, y - 12, 27, 23);
        this.dynamic.lineStyle(5, color, 1).lineBetween(x + 3, y - 5, x + 27, y - 8);
        this.dynamic.lineBetween(x + 3, y + 3, x + 27, y);
        this.dynamic.fillStyle(0xfff3c1, 1).fillCircle(x + 28, y - 8, 3);
      } else if (building.definitionId === "cannon") {
        this.dynamic.fillStyle(color, 1).fillCircle(x, y + 7, 17);
        this.dynamic.lineStyle(10, color, 1).lineBetween(x - 2, y - 5, x + 25, y - 18);
        this.dynamic.fillStyle(0x202a22, 1).fillCircle(x + 27, y - 19, 7);
      } else if (building.definitionId === "frost") {
        this.dynamic.fillStyle(color, 1).fillTriangle(x, y - 31, x - 18, y + 2, x + 18, y + 2);
        this.dynamic.lineStyle(2, 0xe6fbff, 0.9).lineBetween(x, y - 27, x, y - 3);
        this.dynamic.lineBetween(x - 14, y - 2, x + 14, y - 2);
      } else {
        this.dynamic.fillStyle(color, 1).fillRect(x - 14, y - 11, 28, 24);
        this.dynamic.lineStyle(3, 0xf2d8ff, 1).strokeCircle(x, y - 14, 12);
        this.dynamic.lineStyle(3, color, 1).lineBetween(x - 23, y - 20, x - 10, y - 8);
        this.dynamic.lineBetween(x + 23, y - 20, x + 10, y - 8);
      }
    } else if (building.kind === "lumberyard") {
      this.dynamic.fillStyle(color, 1).fillTriangle(x, y - 28, x - 25, y + 8, x + 25, y + 8);
      this.dynamic.fillStyle(0x2a1d14, 1).fillRect(x - 9, y - 1, 18, 18);
      this.dynamic.fillStyle(0xc9853d, 1).fillCircle(x - 23, y + 16, 7);
      this.dynamic.fillStyle(0xdba25a, 1).fillCircle(x - 11, y + 19, 7);
    } else {
      this.dynamic.fillStyle(color, 1).fillTriangle(x, y - 28, x - 25, y + 8, x + 25, y + 8);
      this.dynamic.fillStyle(0x2a1d14, 1).fillRect(x - 9, y - 1, 18, 18);
      this.dynamic.lineStyle(4, 0xf1f5df, 1).lineBetween(x + 13, y - 18, x + 13, y + 1);
      this.dynamic.lineBetween(x + 4, y - 9, x + 22, y - 9);
    }
    const maxLevel = building.kind === "tower" ? this.towerDefinition(building.definitionId).maxLevel : 3;
    this.dynamic.fillStyle(0x202a22, 1).fillRect(x - 19, y + 25, 38, 4);
    this.dynamic.fillStyle(COLORS.gold, 1).fillRect(x - 19, y + 25, 38 * Math.min(1, building.level / maxLevel), 4);
  }

  private buildingLabel(building: BuildingState): string {
    if (building.kind === "main_city") return "主城 · 固定";
    if (building.kind === "lumberyard") return "伐木场 Lv." + building.level;
    if (building.kind === "repair_shop") return "工程所 Lv." + building.level;
    return this.towerDefinition(building.definitionId).displayName + " Lv." + building.level;
  }

  private canReceiveGameplayInput(): boolean {
    return isGameplayInputPhase(this.simulation.getState().phase);
  }

  private statusLabel(state: GameState): string {
    if (state.phase === "OPENING_COUNTDOWN") return "5 秒部署 · 战斗尚未开始";
    if (state.phase === "TACTICAL_PAUSE") return "暂停中 · 可规划基地与手牌";
    if (state.phase === "SYSTEM_PAUSE") return "系统暂停 · 输入已锁定";
    if (state.phase === "VICTORY") return "胜利 · 最终首领已击破";
    if (state.phase === "DEFEAT") return "失守 · 城墙耐久归零";
    return "尸潮持续推进";
  }

  private phaseLabel(phase: GamePhase): string {
    if (phase === "OPENING_COUNTDOWN") return "开局部署";
    if (phase === "RUNNING") return "连续战斗";
    if (phase === "TACTICAL_PAUSE") return "战术暂停";
    if (phase === "SYSTEM_PAUSE") return "系统暂停";
    return phase === "VICTORY" ? "胜利" : "失守";
  }

  private showMessage(message: string, positive: boolean): void {
    this.messageColor = positive ? "#62d79b" : "#f6c453";
    this.messageText.setColor(this.messageColor);
    this.messageText.setText(message);
    this.messageTimer = 2.2;
  }

  private showBattleNotice(message: string, color: string, durationSeconds: number): void {
    this.battleNoticeText.setText(message).setColor(color);
    this.battleNoticeTimer = Math.max(this.battleNoticeTimer, durationSeconds);
  }

  private formatSeconds(seconds: number): string {
    const safe = Math.max(0, Math.ceil(seconds));
    const minutes = Math.floor(safe / 60);
    return String(minutes).padStart(2, "0") + ":" + String(safe % 60).padStart(2, "0");
  }

  private formatRate(rate: number): string {
    return Number.isInteger(rate) ? String(rate) : rate.toFixed(1).replace(/\.0$/, "");
  }

  private enemyX(id: string): number {
    let hash = 0;
    for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    const lane = hash % 7;
    return ENEMY_ZONE.x + 64 + (lane / 6) * (ENEMY_ZONE.width - 128);
  }

  private enemyY(position: number): number {
    const progress = Math.max(0, Math.min(1, position));
    return ENEMY_ZONE.y + 184 + progress * (ENEMY_ZONE.height - 230);
  }
  private towerX(building: BuildingState): number {
    return ENEMY_ZONE.x + 32 + building.lanePosition * (ENEMY_ZONE.width - 64);
  }

  private towerY(building: BuildingState): number {
    const layout = CAMP_SLOT_LAYOUTS.find((item) => item.id === building.slotId);
    return layout ? layout.y - 82 : 560;
  }

  private cardDefinition(id: string): CardDefinition {
    return starterCatalog.cards.find((card) => card.id === id) ?? starterCatalog.cards[0]!;
  }

  private towerDefinition(id: string): TowerDefinition {
    return starterCatalog.towers.find((tower) => tower.id === id) ?? starterCatalog.towers[0]!;
  }

  private enemyDefinition(id: string): EnemyDefinition {
    return starterCatalog.enemies.find((enemy) => enemy.id === id) ?? starterCatalog.enemies[0]!;
  }

  private enemyColor(definition: EnemyDefinition): number {
    if (definition.tier === "boss") return 0xc94d58;
    if (definition.tier === "elite") return 0xe67f27;
    if (definition.behavior === "runner") return 0x4eaa61;
    if (definition.behavior === "tank") return 0x6959a8;
    return 0x54758b;
  }

  private hex(value: string): number {
    return Number.parseInt(value.replace("#", ""), 16);
  }

  private textStyle(size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: "Noto Sans SC, Microsoft YaHei, system-ui, sans-serif", fontSize: String(size) + "px", color };
  }
}

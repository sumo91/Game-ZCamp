import Phaser from "phaser";
import { starterCatalog, type EnemyDefinition } from "../core/content";
import { resolveBattleConfig } from "../core/battleConfig";
import type { BattleLaunchData } from "../core/battleConfig";
import { getGrowthBuildingPresentation } from "../core/buildingGrowth";
import { GameSimulation } from "../core/game";
import { getWoodProductionPerSecond } from "../core/resources";
import type { HeroDefinition } from "../core/hero";
import type { BuildingState, EnemyRuntimeState, GameEvent, GamePhase, GameState } from "../core/types";
import type { LogicalBounds } from "./layout";
import {
  deriveBuildingDetail,
  deriveEmptySlotActions,
  deriveGrowthPauseControl,
  deriveTraitOptions,
  deriveTransformOptions,
  decideGrowthAction,
  decideGrowthTrait,
  decideGrowthTransform,
  decideGrowthPointer,
  getGrowthInputPriority,
  hitGrowthPointer,
  type GrowthActionView,
  type GrowthBuildingDetailView,
  type GrowthResource,
  type GrowthTraitOptionView,
} from "./growthUi";
import { deriveResultActions } from "./lobbyUi";
import { AMBIENT_NOTICE_MIN_INTERVAL_SECONDS, ThrottleGate, coinFlightLabel, decideResourcePulse, decideWallImpact, deriveWaveBanner, isBossEntrance, mapTowerProjectileStyle, routeBattleNotice, shouldShowDamageNumber } from "./feedback";
import type { FeedbackNotice, ProjectileStyle } from "./feedback";
import { FxDirector } from "./fx/FxDirector";
import { getSoundDirector } from "./fx/SoundDirector";
import { CAMP_SLOT_LAYOUTS, CONTEXT_PANEL, ENEMY_ZONE, GRID_ZONE, GROWTH_TRANSFORM_CLOSE_BOUNDS, GROWTH_TRANSFORM_OPTION_BOUNDS, LOGICAL_HEIGHT, LOGICAL_WIDTH, RESOURCE_RAIL, WALL_ZONE, deriveSlotActionBarBounds } from "./layout";

type Feedback = { kind: "shot" | "hit" | "defeat"; x: number; y: number; targetX?: number; targetY?: number; ttl: number; style?: ProjectileStyle; jitter?: number[] };
type ShotFeedback = { kind: "shot"; x: number; y: number; targetX: number; targetY: number; ttl: number; style?: ProjectileStyle; jitter?: number[] };
type PanelAction = { label: string; available: boolean; reason: string; description: string; resource: GrowthResource | null; resourceLabel: string; statusLabel: string; run: () => void };

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

const TRANSFORM_COLORS: Record<string, number> = {
  machine_gun: 0xf6c453,
  cannon: 0xf07b28,
  frost: 0x42d3f3,
  electric: 0xd06cff,
};

export class GameScene extends Phaser.Scene {
  private simulation!: GameSimulation;
  private heroDefinition!: HeroDefinition;
  private readonly resultActions = deriveResultActions();
  private dynamic!: Phaser.GameObjects.Graphics;
  private feedbacks: Feedback[] = [];
  private selectedSlotId: string | null = null;
  private destroyConfirm = false;
  private transformOpen = false;
  private traitLocked = false;
  private panelActions: PanelAction[] = [];
  private slotLabels: Phaser.GameObjects.Text[] = [];
  private contextPanel!: Phaser.GameObjects.Rectangle;
  private contextTitle!: Phaser.GameObjects.Text;
  private contextDetail!: Phaser.GameObjects.Text;
  private contextHint!: Phaser.GameObjects.Text;
  private pauseButton!: Phaser.GameObjects.Rectangle;
  private pauseButtonLabel!: Phaser.GameObjects.Text;
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
  private shieldText!: Phaser.GameObjects.Text;
  private heroText!: Phaser.GameObjects.Text;
  private enemyText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private battleNoticeText!: Phaser.GameObjects.Text;
  private enemyLabels = new Map<string, Phaser.GameObjects.Text>();
  private resultOverlay!: Phaser.GameObjects.Rectangle;
  private resultTitle!: Phaser.GameObjects.Text;
  private resultHint!: Phaser.GameObjects.Text;
  private resultRestartButton!: Phaser.GameObjects.Rectangle;
  private resultRestartLabel!: Phaser.GameObjects.Text;
  private resultLobbyButton!: Phaser.GameObjects.Rectangle;
  private resultLobbyLabel!: Phaser.GameObjects.Text;
  private transformOverlay!: Phaser.GameObjects.Rectangle;
  private transformPanel!: Phaser.GameObjects.Rectangle;
  private transformTitle!: Phaser.GameObjects.Text;
  private transformHint!: Phaser.GameObjects.Text;
  private transformCloseButton!: Phaser.GameObjects.Rectangle;
  private transformCloseLabel!: Phaser.GameObjects.Text;
  private transformButtons: Phaser.GameObjects.Rectangle[] = [];
  private transformLabels: Phaser.GameObjects.Text[] = [];
  private transformIcons: Phaser.GameObjects.Graphics[] = [];
  private transformCostIcons: Phaser.GameObjects.Graphics[] = [];
  private traitOverlay!: Phaser.GameObjects.Rectangle;
  private traitPanel!: Phaser.GameObjects.Rectangle;
  private traitTitle!: Phaser.GameObjects.Text;
  private traitTarget!: Phaser.GameObjects.Text;
  private traitHint!: Phaser.GameObjects.Text;
  private traitButtons: Phaser.GameObjects.Rectangle[] = [];
  private traitLabels: Phaser.GameObjects.Text[] = [];
  private systemOverlay!: Phaser.GameObjects.Rectangle;
  private systemTitle!: Phaser.GameObjects.Text;
  private systemHint!: Phaser.GameObjects.Text;
  private messageTimer = 0;
  private messageColor = "#fff0b0";
  private battleNoticeTimer = 0;
  private showcaseMode = false;
  private showcaseCapture: "charge" | "inspire" | null = null;
  private showcaseFreeze = false;
  private fx!: FxDirector;
  private readonly sfx = getSoundDirector();
  private readonly noticeGate = new ThrottleGate();
  private soundButton!: Phaser.GameObjects.Rectangle;
  private soundButtonLabel!: Phaser.GameObjects.Text;
  private ambientNoticeText!: Phaser.GameObjects.Text;
  private ambientNoticeTimer = 0;
  private lastWallHp: number | null = null;
  private lastWallShield: number | null = null;
  private lastWood: number | null = null;
  private lastGold: number | null = null;
  private lastPhase: GamePhase | null = null;
  private modalEntrance = { transform: false, trait: false, system: false, result: false };
  private wallImpactMarks: Array<{ x: number; ttl: number }> = [];
  private bossNameText!: Phaser.GameObjects.Text;
  private resultCounting = false;
  private pauseDimmer!: Phaser.GameObjects.Rectangle;
  private pauseBadgeText!: Phaser.GameObjects.Text;
  private slotBarButtons: Phaser.GameObjects.Rectangle[] = [];
  private slotBarLabels: Phaser.GameObjects.Text[] = [];
  private slotBarBounds: LogicalBounds | null = null;
  private suppressScenePointer = false;

  public constructor() {
    super("GameScene");
    const showcaseParam = typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("stage4-demo") ?? new URLSearchParams(window.location.search).get("stage3-demo")) : null;
    this.showcaseMode = import.meta.env.DEV && (showcaseParam === "1" || showcaseParam === "charge" || showcaseParam === "inspire");
    this.showcaseCapture = this.showcaseMode && (showcaseParam === "charge" || showcaseParam === "inspire") ? showcaseParam : null;
  }

  public init(data: BattleLaunchData = {}): void {
    const battleConfig = resolveBattleConfig(data);
    this.heroDefinition = battleConfig.hero;
    this.simulation = new GameSimulation(starterCatalog, 1337, battleConfig);
    if (this.showcaseMode) {
      const state = this.simulation.getState();
      state.wallMaxHp = 1000000;
      state.wallHp = state.wallMaxHp;
    }
  }

  public create(): void {
    this.createBackground();
    this.dynamic = this.add.graphics().setDepth(5);
    this.fx = new FxDirector(this);
    this.input.on("pointerdown", () => this.sfx.unlock());
    this.createHud();
    this.createInteractionZones();
    this.createContextPanel();
    this.createModalPanels();
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
      this.feedbacks = this.feedbacks.map((feedback) => ({ ...feedback, ttl: feedback.ttl - step })).filter((feedback) => feedback.ttl > 0);
      this.wallImpactMarks = this.wallImpactMarks.map((mark) => ({ ...mark, ttl: mark.ttl - step })).filter((mark) => mark.ttl > 0);
      this.messageTimer = Math.max(0, this.messageTimer - step);
      this.battleNoticeTimer = Math.max(0, this.battleNoticeTimer - step);
      this.ambientNoticeTimer = Math.max(0, this.ambientNoticeTimer - step);
    }
    this.renderState();
  }

  private createBackground(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.bg, 1).fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    graphics.fillStyle(0x317a24, 1).fillRect(24, 0, 672, WALL_ZONE.y);
    graphics.fillStyle(0x4b9a29, 1).fillRect(52, 0, 616, WALL_ZONE.y);
    graphics.fillStyle(0xe0a51e, 1).fillRect(124, 0, 472, WALL_ZONE.y);
    graphics.fillStyle(0xefbd37, 1).fillRect(235, 0, 250, WALL_ZONE.y);
    graphics.fillStyle(0xf4d15b, 0.36).fillRect(284, 0, 152, WALL_ZONE.y);
    graphics.fillStyle(0x2a6b24, 0.42).fillRect(52, 0, 22, WALL_ZONE.y);
    graphics.fillStyle(0x2a6b24, 0.42).fillRect(646, 0, 22, WALL_ZONE.y);
    graphics.fillStyle(0xffe28a, 0.16).fillCircle(178, 168, 88);
    graphics.fillStyle(0xffe28a, 0.13).fillCircle(560, 290, 112);
    graphics.fillStyle(0xd48b12, 0.16).fillCircle(158, 536, 120);
    graphics.fillStyle(0xd48b12, 0.12).fillCircle(574, 612, 128);
    graphics.lineStyle(2, 0xffe28a, 0.42).lineBetween(124, 92, 596, 92);
    graphics.lineStyle(2, 0x9b6d13, 0.38).lineBetween(124, 604, 596, 604);
    graphics.lineStyle(2, 0x2b681f, 0.72).strokeRect(24, 0, 672, WALL_ZONE.y);

    graphics.fillStyle(0x715137, 1).fillRect(WALL_ZONE.x, WALL_ZONE.y, WALL_ZONE.width, WALL_ZONE.height);
    graphics.lineStyle(2, 0xb9894b, 1).lineBetween(WALL_ZONE.x, WALL_ZONE.y + 13, WALL_ZONE.x + WALL_ZONE.width, WALL_ZONE.y + 13);
    graphics.lineStyle(2, 0x3b281b, 0.9).lineBetween(WALL_ZONE.x, WALL_ZONE.y + 48, WALL_ZONE.x + WALL_ZONE.width, WALL_ZONE.y + 48);
    graphics.lineStyle(2, COLORS.line, 0.9).strokeRect(WALL_ZONE.x, WALL_ZONE.y, WALL_ZONE.width, WALL_ZONE.height);

    graphics.fillStyle(0x69783e, 1).fillRect(GRID_ZONE.x, GRID_ZONE.y, GRID_ZONE.width, GRID_ZONE.height);
    graphics.lineStyle(2, 0xc6a442, 0.78).lineBetween(GRID_ZONE.x, GRID_ZONE.y + 12, GRID_ZONE.x + GRID_ZONE.width, GRID_ZONE.y + 12);
    graphics.lineStyle(2, COLORS.line, 0.85).strokeRect(GRID_ZONE.x, GRID_ZONE.y, GRID_ZONE.width, GRID_ZONE.height);

    graphics.fillStyle(0x5b4728, 1).fillRect(RESOURCE_RAIL.x, RESOURCE_RAIL.y, RESOURCE_RAIL.width, RESOURCE_RAIL.height);
    graphics.lineStyle(2, 0xd3a345, 1).lineBetween(RESOURCE_RAIL.x + 8, RESOURCE_RAIL.y + 8, RESOURCE_RAIL.x + RESOURCE_RAIL.width - 8, RESOURCE_RAIL.y + 8);
    graphics.lineStyle(2, COLORS.line, 0.85).strokeRect(RESOURCE_RAIL.x, RESOURCE_RAIL.y, RESOURCE_RAIL.width, RESOURCE_RAIL.height);

    graphics.fillStyle(0x29442d, 1).fillRect(CONTEXT_PANEL.x, CONTEXT_PANEL.y, CONTEXT_PANEL.width, CONTEXT_PANEL.height);
    graphics.lineStyle(2, COLORS.line, 0.85).strokeRect(CONTEXT_PANEL.x, CONTEXT_PANEL.y, CONTEXT_PANEL.width, CONTEXT_PANEL.height);

    graphics.fillStyle(0x2a572e, 0.9).fillRect(24, 10, 672, 116);
    graphics.lineStyle(1, 0xffdf78, 0.46).lineBetween(32, 132, 688, 132);
    this.add.text(34, 154, "战场", this.textStyle(14, "#fff0b0")).setDepth(6);
    this.add.text(34, WALL_ZONE.y + 8, "城墙", this.textStyle(14, "#ffe1a2")).setDepth(6);
  }

  private createHud(): void {
    this.phaseText = this.add.text(32, 18, "", this.textStyle(14, "#fff0b0")).setDepth(10);
    this.waveText = this.add.text(32, 40, "", this.textStyle(22, "#fff3d2")).setDepth(10);
    this.timerText = this.add.text(32, 72, "", this.textStyle(14, "#ffe08a")).setDepth(10);
    this.enemyText = this.add.text(320, 56, "", this.textStyle(14, "#fff3d2")).setDepth(10);
    this.heroText = this.add.text(434, 18, this.heroDefinition.displayName + " · " + this.heroDefinition.role, { ...this.textStyle(13, "#fff3d2"), align: "right" }).setOrigin(1, 0).setDepth(10);
    this.shieldText = this.add.text(360, WALL_ZONE.y + 16, "", { ...this.textStyle(14, "#bce9e4"), align: "center", stroke: "#162b27", strokeThickness: 3 }).setOrigin(0.5).setDepth(10);
    this.wallText = this.add.text(360, WALL_ZONE.y + 40, "", { ...this.textStyle(16, "#fff3d2"), align: "center", stroke: "#21170f", strokeThickness: 4 }).setOrigin(0.5).setDepth(10);
    this.statusText = this.add.text(34, WALL_ZONE.y + 54, "", this.textStyle(13, "#fff0b0")).setDepth(10);
    this.messageText = this.add.text(34, RESOURCE_RAIL.y - 20, "", this.textStyle(14, "#9ff0b2")).setDepth(10);
    this.woodIcon = this.add.graphics().setDepth(10);
    this.woodText = this.add.text(58, RESOURCE_RAIL.y + 7, "", { ...this.textStyle(16, "#fff3d2"), fontStyle: "bold" }).setDepth(10);
    this.woodRateText = this.add.text(58, RESOURCE_RAIL.y + 30, "", this.textStyle(12, "#ffe0a0")).setDepth(10);
    this.goldIcon = this.add.graphics().setDepth(10);
    this.goldText = this.add.text(204, RESOURCE_RAIL.y + 7, "", { ...this.textStyle(16, "#fff3d2"), fontStyle: "bold" }).setDepth(10);
    this.battleNoticeText = this.add.text(360, 174, "", { ...this.textStyle(17, "#fff3d2"), align: "center", stroke: "#315c28", strokeThickness: 4 }).setOrigin(0.5).setDepth(12);
    this.pauseButton = this.add.rectangle(646, 44, 104, 56, COLORS.blue, 1).setDepth(11).setInteractive({ useHandCursor: true });
    this.pauseButtonLabel = this.add.text(646, 44, "暂停", this.textStyle(15, "#ffffff")).setOrigin(0.5).setDepth(12);
    this.pauseButton.on("pointerdown", () => this.toggleTacticalPause());
    this.bindPressFeedback(this.pauseButton);
    this.soundButton = this.add.rectangle(646, 100, 104, 40, COLORS.panelDeep, 1).setDepth(11).setInteractive({ useHandCursor: true });
    this.soundButton.setStrokeStyle(2, COLORS.line, 0.85);
    this.soundButtonLabel = this.add.text(646, 100, "", this.textStyle(13, "#fff3d2")).setOrigin(0.5).setDepth(12);
    this.soundButton.on("pointerdown", () => {
      this.sfx.toggleMuted();
      this.syncSoundButton();
      this.fx.pressPulse(this.soundButton);
    });
    this.ambientNoticeText = this.add.text(360, 204, "", { ...this.textStyle(13, "#d6d39c"), align: "center", stroke: "#23301f", strokeThickness: 3 }).setOrigin(0.5).setDepth(12);
    this.countdownText = this.add.text(360, 410, "", { ...this.textStyle(76, "#ffe08a"), stroke: "#315c28", strokeThickness: 8 }).setOrigin(0.5).setDepth(20);
    this.bossNameText = this.add.text(360, 143, "", { ...this.textStyle(13, "#ffc9c9"), align: "center", stroke: "#2a0f12", strokeThickness: 4 }).setOrigin(0.5).setDepth(10).setVisible(false);
    this.pauseDimmer = this.add.rectangle(360, 640, LOGICAL_WIDTH, LOGICAL_HEIGHT, 0x0c1a10, 1).setDepth(4).setAlpha(0).setInteractive();
    this.pauseBadgeText = this.add.text(360, 250, "‖ 战术暂停 · 时间冻结", { ...this.textStyle(30, "#bfe8ff"), align: "center", stroke: "#10231c", strokeThickness: 6 }).setOrigin(0.5).setDepth(12).setVisible(false);
    for (let index = 0; index < 3; index += 1) {
      const button = this.add.rectangle(0, 0, 100, 46, COLORS.blue, 1).setDepth(18).setVisible(false).setInteractive({ useHandCursor: true });
      const label = this.add.text(0, 0, "", { ...this.textStyle(13, "#ffffff"), align: "center" }).setOrigin(0.5).setDepth(19).setVisible(false);
      button.on("pointerdown", () => this.handleActionClick(index));
      this.bindPressFeedback(button);
      this.slotBarButtons.push(button);
      this.slotBarLabels.push(label);
    }
  }

  private bindPressFeedback(button: Phaser.GameObjects.Rectangle): void {
    button.on("pointerdown", () => {
      this.fx.pressPulse(button);
      this.sfx.playUi("click");
    });
  }

  private syncSoundButton(): void {
    this.soundButtonLabel.setText(this.sfx.isMuted() ? "🔇 已静音" : "🔊 音效开");
  }

  private createInteractionZones(): void {
    for (const layout of CAMP_SLOT_LAYOUTS) {
      this.slotLabels.push(this.add.text(layout.x + layout.width / 2, layout.y + layout.height / 2, "", { ...this.textStyle(13, "#dbe6f4"), align: "center", wordWrap: { width: layout.width - 10 } }).setOrigin(0.5).setDepth(16));
    }
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      // A bar button that acted (e.g. built, clearing the bar) must not re-route this same click.
      const suppress = this.suppressScenePointer;
      this.suppressScenePointer = false;
      if (suppress) return;
      const state = this.simulation.getState();
      const priority = getGrowthInputPriority(state.phase, this.transformOpen);
      if (priority === "transform") {
        const decision = decideGrowthPointer(priority, hitGrowthPointer(pointer.x, pointer.y, true));
        if (decision.kind === "dispatch" && decision.hit.kind === "transform_close") {
          this.transformOpen = false;
          this.renderState();
        }
        return;
      }
      if (priority !== "building") return;
      // Interactive buttons handle their own pointerdown; the scene-level route must not double-fire.
      if (this.pauseButton.visible && this.pauseButton.getBounds().contains(pointer.x, pointer.y)) return;
      if (this.soundButton.visible && this.soundButton.getBounds().contains(pointer.x, pointer.y)) return;
      if (this.hitsSlotBarButton(pointer.x, pointer.y)) return;
      if (this.slotBarBackdropHit(pointer.x, pointer.y)) {
        this.clearSelection();
        return;
      }
      const decision = decideGrowthPointer(priority, hitGrowthPointer(pointer.x, pointer.y, false));
      if (decision.kind === "dispatch" && decision.hit.kind === "slot") {
        this.handleSlotClick(decision.hit.slotId);
        return;
      }
      // Tapping blank space (battlefield, HUD, bottom panel) closes the floating bar.
      this.clearSelection();
    });
  }

  private hitsSlotBarButton(x: number, y: number): boolean {
    if (!this.slotBarBounds) return false;
    const bounds = this.slotBarBounds;
    for (let index = 0; index < this.slotBarButtons.length; index += 1) {
      const button = this.slotBarButtons[index]!;
      if (!button.visible) continue;
      const centerX = bounds.x + 52 + index * 106;
      if (x >= centerX - 50 && x <= centerX + 50 && y >= bounds.y + 7 && y <= bounds.y + 51) return true;
    }
    return false;
  }

  private slotBarBackdropHit(x: number, y: number): boolean {
    if (!this.slotBarBounds) return false;
    const bounds = this.slotBarBounds;
    return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
  }

  private createContextPanel(): void {
    this.contextPanel = this.add.rectangle(360, CONTEXT_PANEL.y + CONTEXT_PANEL.height / 2, CONTEXT_PANEL.width, CONTEXT_PANEL.height, COLORS.panelDeep, 0.98).setDepth(13);
    this.contextPanel.setStrokeStyle(2, COLORS.line, 0.85);
    this.contextTitle = this.add.text(42, CONTEXT_PANEL.y + 6, "营地操作", this.textStyle(17, "#fff3d2")).setDepth(16);
    this.contextDetail = this.add.text(42, CONTEXT_PANEL.y + 32, "点击空格建造，点击建筑查看", { ...this.textStyle(13, "#d6d39c"), wordWrap: { width: 620 } }).setDepth(16);
    this.contextHint = this.add.text(42, CONTEXT_PANEL.y + 54, "", { ...this.textStyle(12, "#f6c453"), wordWrap: { width: 620 } }).setDepth(16);
  }

  private createModalPanels(): void {
    this.transformOverlay = this.add.rectangle(360, 640, 720, 1280, 0x07101d, 0.58).setDepth(70).setInteractive();
    this.transformPanel = this.add.rectangle(360, 650, 660, 650, COLORS.panelDeep, 0.98).setDepth(71);
    this.transformPanel.setStrokeStyle(3, COLORS.gold, 1);
    this.transformTitle = this.add.text(360, 352, "改造箭塔", this.textStyle(28, "#f6c453")).setOrigin(0.5).setDepth(72);
    this.transformHint = this.add.text(360, 395, "选择一种确定性特殊塔 · 背景建筑保持可见", { ...this.textStyle(15, "#dbe6f4"), align: "center" }).setOrigin(0.5).setDepth(72);
    for (const bounds of GROWTH_TRANSFORM_OPTION_BOUNDS) {
      const index = this.transformButtons.length;
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      const button = this.add.rectangle(centerX, centerY, bounds.width, bounds.height, COLORS.panel, 1).setDepth(72).setInteractive({ useHandCursor: true });
      const label = this.add.text(bounds.x + 76, centerY, "", { ...this.textStyle(15, "#fff3d2"), wordWrap: { width: bounds.width - 92 }, align: "left" }).setOrigin(0, 0.5).setDepth(74);
      const icon = this.add.graphics().setDepth(74);
      const costIcon = this.add.graphics().setDepth(74);
      button.on("pointerdown", () => this.handleTransformClick(index));
      this.bindPressFeedback(button);
      this.transformButtons.push(button);
      this.transformLabels.push(label);
      this.transformIcons.push(icon);
      this.transformCostIcons.push(costIcon);
    }
    this.transformCloseButton = this.add.rectangle(GROWTH_TRANSFORM_CLOSE_BOUNDS.x + GROWTH_TRANSFORM_CLOSE_BOUNDS.width / 2, GROWTH_TRANSFORM_CLOSE_BOUNDS.y + GROWTH_TRANSFORM_CLOSE_BOUNDS.height / 2, GROWTH_TRANSFORM_CLOSE_BOUNDS.width, GROWTH_TRANSFORM_CLOSE_BOUNDS.height, COLORS.blue, 1).setDepth(72).setInteractive({ useHandCursor: true });
    this.bindPressFeedback(this.transformCloseButton);
    this.transformCloseLabel = this.add.text(GROWTH_TRANSFORM_CLOSE_BOUNDS.x + GROWTH_TRANSFORM_CLOSE_BOUNDS.width / 2, GROWTH_TRANSFORM_CLOSE_BOUNDS.y + GROWTH_TRANSFORM_CLOSE_BOUNDS.height / 2, "返回建筑详情", this.textStyle(16, "#ffffff")).setOrigin(0.5).setDepth(73);

    this.traitOverlay = this.add.rectangle(360, 640, 720, 1280, 0x07101d, 0.66).setDepth(80).setInteractive();
    this.traitPanel = this.add.rectangle(360, 650, 660, 900, COLORS.panelDeep, 0.99).setDepth(81);
    this.traitPanel.setStrokeStyle(3, COLORS.gold, 1);
    this.traitTitle = this.add.text(360, 240, "选择一个以完成升级成长", { ...this.textStyle(28, "#f6c453"), align: "center" }).setOrigin(0.5).setDepth(82);
    this.traitTarget = this.add.text(360, 300, "", { ...this.textStyle(17, "#fff3d2"), align: "center" }).setOrigin(0.5).setDepth(82);
    this.traitHint = this.add.text(360, 350, "三选一只作用于当前建筑 · 不能跳过", { ...this.textStyle(15, "#dbe6f4"), align: "center" }).setOrigin(0.5).setDepth(82);
    for (let index = 0; index < 3; index += 1) {
      const y = 480 + index * 175;
      const button = this.add.rectangle(360, y, 600, 140, COLORS.panel, 1).setDepth(82).setInteractive({ useHandCursor: true });
      const label = this.add.text(84, y, "", { ...this.textStyle(15, "#fff3d2"), wordWrap: { width: 550 } }).setOrigin(0, 0.5).setDepth(84);
      button.on("pointerdown", () => this.handleTraitClick(index));
      this.bindPressFeedback(button);
      this.traitButtons.push(button);
      this.traitLabels.push(label);
    }

    this.systemOverlay = this.add.rectangle(360, 640, 720, 1280, 0x07101d, 0.9).setDepth(100).setInteractive();
    this.systemTitle = this.add.text(360, 560, "系统暂停", this.textStyle(34, "#ffffff")).setOrigin(0.5).setDepth(101);
    this.systemHint = this.add.text(360, 612, "窗口不可见期间，战斗与输入均已冻结", this.textStyle(17, "#a7b6ca")).setOrigin(0.5).setDepth(101);

    this.resultOverlay = this.add.rectangle(360, 570, 600, 390, 0x142218, 0.96).setDepth(110).setInteractive();
    this.resultOverlay.setStrokeStyle(3, COLORS.gold, 0.9);
    this.resultTitle = this.add.text(360, 486, "", this.textStyle(42, "#ffffff")).setOrigin(0.5).setDepth(111);
    this.resultHint = this.add.text(360, 548, "", { ...this.textStyle(18, "#dbe6f4"), align: "center", wordWrap: { width: 500 } }).setOrigin(0.5).setDepth(111);
    this.resultRestartButton = this.add.rectangle(360, 636, 180, 56, COLORS.blue, 1).setDepth(111).setInteractive({ useHandCursor: true });
    this.resultRestartLabel = this.add.text(360, 636, this.resultActions.rematchLabel, this.textStyle(17, "#ffffff")).setOrigin(0.5).setDepth(112);
    this.resultRestartButton.on("pointerdown", () => this.restartSimulation());
    this.bindPressFeedback(this.resultRestartButton);
    this.resultLobbyButton = this.add.rectangle(360, 706, 180, 56, COLORS.panel, 1).setDepth(111).setInteractive({ useHandCursor: true });
    this.resultLobbyLabel = this.add.text(360, 706, this.resultActions.lobbyLabel, this.textStyle(17, "#fff3d2")).setOrigin(0.5).setDepth(112);
    this.resultLobbyButton.on("pointerdown", () => this.scene.start("LobbyScene"));
    this.bindPressFeedback(this.resultLobbyButton);
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
    const pauseControl = deriveGrowthPauseControl(phase);
    if (pauseControl.label === "暂停" && pauseControl.enabled) this.simulation.dispatch({ type: "pause" });
    else if (pauseControl.label === "继续" && pauseControl.enabled) this.simulation.dispatch({ type: "resume" });
    this.renderState();
  }

  private restartSimulation(): void {
    this.simulation.dispatch({ type: "restart" });
    this.selectedSlotId = null;
    this.destroyConfirm = false;
    this.transformOpen = false;
    this.traitLocked = false;
    this.lastWallHp = null;
    this.lastWallShield = null;
    this.lastWood = null;
    this.lastGold = null;
    this.lastPhase = null;
    this.renderState();
  }

  private handleSlotClick(slotId: string): void {
    const state = this.simulation.getState();
    if (getGrowthInputPriority(state.phase, this.transformOpen) !== "building") return;
    if (this.selectedSlotId === slotId) {
      this.showMessage("已取消目标选择", true);
      this.clearSelection();
      return;
    }
    this.selectedSlotId = slotId;
    this.destroyConfirm = false;
    this.renderState();
  }

  /** Deselecting hides the floating bar; the only ways out of a selection. */
  private clearSelection(): void {
    if (this.selectedSlotId === null && !this.destroyConfirm) return;
    this.selectedSlotId = null;
    this.destroyConfirm = false;
    this.renderState();
  }

  private handleActionClick(index: number): void {
    if (getGrowthInputPriority(this.simulation.getState().phase, this.transformOpen) !== "building") return;
    const action = this.panelActions[index];
    if (!action) return;
    this.suppressScenePointer = true;
    if (!action.available) {
      this.showMessage(action.reason, false, action.resource ?? undefined);
      this.renderState();
      return;
    }
    action.run();
    this.renderState();
  }

  private handleTransformClick(index: number): void {
    const state = this.simulation.getState();
    if (getGrowthInputPriority(state.phase, this.transformOpen) !== "transform") return;
    const building = this.selectedBuilding(state);
    if (!building) return;
    const option = deriveTransformOptions(starterCatalog.buildingGrowth, state, building)[index];
    if (!option) return;
    const decision = decideGrowthTransform(option);
    if (decision.kind === "blocked") {
      this.showMessage(decision.reason, false, option.resource);
      this.renderState();
      return;
    }
    const result = this.simulation.dispatch(decision.command);
    this.showMessage(result.accepted ? "改造完成 · 等级与词条已保留" : (result.reason ?? "改造失败"), result.accepted, result.accepted ? undefined : option.resource);
    if (result.accepted) this.transformOpen = false;
    this.renderState();
  }

  private handleTraitClick(index: number): void {
    const state = this.simulation.getState();
    if (getGrowthInputPriority(state.phase, this.transformOpen) !== "trait_draft" || !state.pendingTraitDraft) return;
    const option = deriveTraitOptions(starterCatalog.buildingGrowth, state, state.pendingTraitDraft)[index];
    if (!option) return;
    const decision = decideGrowthTrait(option, state.pendingTraitDraft.buildingId, this.traitLocked);
    if (decision.kind === "blocked") {
      this.showMessage(decision.reason, false);
      return;
    }
    this.traitLocked = true;
    const result = this.simulation.dispatch(decision.command);
    if (!result.accepted) {
      this.traitLocked = false;
      this.showMessage(result.reason ?? "词条选择失败", false);
    } else {
      this.showMessage("词条已附加到当前建筑", true);
    }
    this.renderState();
  }

  private performBuild(action: GrowthActionView): void {
    const decision = decideGrowthAction(action);
    if (decision.kind === "blocked") {
      this.showMessage(decision.reason, false, action.resource);
      return;
    }
    const result = this.simulation.dispatch(decision.command);
    if (result.accepted) {
      this.showMessage("建造完成", true);
      this.clearSelection();
    } else {
      this.showMessage(result.reason ?? "建造失败", false, action.resource);
    }
  }

  private performUpgrade(action: GrowthActionView): void {
    const decision = decideGrowthAction(action);
    if (decision.kind === "blocked") {
      this.showMessage(decision.reason, false);
      return;
    }
    const result = this.simulation.dispatch(decision.command);
    this.showMessage(result.accepted ? "升级完成 · 请选择一个词条" : (result.reason ?? "升级失败"), result.accepted, result.accepted ? undefined : action.resource);
    if (result.accepted) this.traitLocked = false;
  }

  private performDestroy(): void {
    if (!this.selectedSlotId) return;
    const result = this.simulation.dispatch({ type: "destroy_building", slotId: this.selectedSlotId });
    this.showMessage(result.accepted ? "建筑已拆除，木材不返还" : (result.reason ?? "暂不可拆除"), result.accepted);
    if (result.accepted) {
      this.selectedSlotId = null;
      this.destroyConfirm = false;
    }
  }

  private selectedBuilding(state: GameState): BuildingState | undefined {
    return this.selectedSlotId ? state.buildings.find((building) => building.slotId === this.selectedSlotId) : undefined;
  }

  private renderState(): void {
    const state = this.simulation.getState();
    if (!state.pendingTraitDraft) this.traitLocked = false;
    if (this.selectedSlotId && !CAMP_SLOT_LAYOUTS.some((slot) => slot.id === this.selectedSlotId)) this.selectedSlotId = null;
    if (this.transformOpen && this.selectedBuilding(state)?.growthDefinitionId !== "arrow_tower") this.transformOpen = false;

    if (import.meta.env.DEV) {
      const debugState = {
        phase: state.phase,
        wave: state.wave,
        effectiveBattleTimeSeconds: state.effectiveBattleTimeSeconds,
        enemyCount: state.enemies.filter((enemy) => enemy.hp > 0).length,
        wallHp: state.wallHp,
        wallShield: state.wallShield,
        gold: state.gold,
        wood: Math.floor(state.wood),
        selectedSlotId: this.selectedSlotId,
        transformOpen: this.transformOpen,
        traitDraft: state.pendingTraitDraft ? [...state.pendingTraitDraft.options] : null,
      };
      (window as Window & { __zcampDebug?: Record<string, unknown> }).__zcampDebug = debugState;
      document.body.dataset.zcampPhase = state.phase;
      document.body.dataset.zcampWave = String(state.wave);
      document.body.dataset.zcampEnemyCount = String(debugState.enemyCount);
    }

    this.phaseText.setText(this.phaseLabel(state.phase));
    this.observePhase(state);
    this.observeWall(state);
    this.observeResources(state);
    this.trackModalEntrance(state);
    this.syncSoundButton();
    this.waveText.setText(state.wave > 0 ? "波次  " + state.wave + " / " + state.maxWave : "首波");
    const terminal = state.phase === "VICTORY" || state.phase === "DEFEAT";
    this.timerText.setText(terminal ? "战斗结束" : state.phase === "OPENING_COUNTDOWN" || state.wave === 0 ? "首波准备中" : "下一波  " + this.formatSeconds(state.nextWaveTimeRemainingSeconds));
    this.woodText.setText("木材  " + Math.floor(state.wood));
    this.woodRateText.setText("+" + this.formatRate(getWoodProductionPerSecond(state, starterCatalog, this.heroDefinition)) + "/秒");
    this.goldText.setText("金币  " + Math.floor(state.gold));
    this.renderResourceIcons();

    const shownWallMax = this.showcaseMode ? 100 : state.wallMaxHp;
    const shownWallHp = this.showcaseMode ? 100 : Math.ceil(state.wallHp);
    const shownShieldMax = this.showcaseMode ? this.heroDefinition.startingWallShield : state.wallShieldMax;
    const shownShield = this.showcaseMode ? shownShieldMax : Math.ceil(state.wallShield);
    const wallRatio = state.wallMaxHp > 0 ? state.wallHp / state.wallMaxHp : 0;
    this.shieldText.setText("护盾  " + shownShield + " / " + shownShieldMax);
    this.wallText.setText("城墙  " + shownWallHp + " / " + shownWallMax).setColor(wallRatio > 0.35 ? "#fff3d2" : "#f06a6a");
    const activeEnemyCount = state.enemies.filter((enemy) => enemy.hp > 0).length;
    this.enemyText.setText("威胁  " + activeEnemyCount + " · 击杀  " + state.defeatedEnemies);
    const transient = this.messageTimer > 0 && this.messageText.text.length > 0;
    this.statusText.setText(transient ? this.messageText.text : this.statusLabel(state)).setColor(transient ? this.messageColor : "#fff0b0");
    this.messageText.setVisible(false);

    const pauseControl = deriveGrowthPauseControl(state.phase);
    this.pauseButtonLabel.setText(pauseControl.label);
    this.pauseButton.setFillStyle(pauseControl.enabled ? COLORS.blue : COLORS.line, 1).setVisible(pauseControl.visible);
    this.pauseButtonLabel.setVisible(pauseControl.visible);
    this.countdownText.setVisible(state.phase === "OPENING_COUNTDOWN");
    if (state.phase === "OPENING_COUNTDOWN") this.countdownText.setText(String(Math.ceil(state.openingCountdownRemainingSeconds)));
    const pauseTint = state.phase === "TACTICAL_PAUSE";
    this.pauseDimmer.setAlpha(pauseTint ? 0.38 : 0);
    this.pauseBadgeText.setVisible(pauseTint);
    this.battleNoticeText.setVisible(this.battleNoticeTimer > 0);
    this.ambientNoticeText.setVisible(this.ambientNoticeTimer > 0);

    this.renderContext(state);
    this.renderDynamic(state);
    this.renderSlotBarBackdrop();
    this.renderSlotActionBar(state);
    this.renderTransformModal(state);
    this.renderTraitModal(state);
    this.renderSystemAndResult(state);
    this.syncInput(state);
  }

  private observePhase(state: GameState): void {
    if (this.lastPhase === state.phase) return;
    this.lastPhase = state.phase;
    if (state.phase === "VICTORY") {
      this.sfx.playUi("victory");
      this.fx.shake(0.3, 0.006);
      this.beginResultCountUp(state, true);
    } else if (state.phase === "DEFEAT") {
      this.sfx.playUi("defeat");
      this.fx.shake(0.45, 0.01);
      this.fx.edgeFlash(0xf06a6a, 0.45, 0.5);
      this.beginResultCountUp(state, false);
    }
  }

  private beginResultCountUp(state: GameState, victory: boolean): void {
    const prefix = victory ? "最终首领已击破 · 波次 " + state.wave + " · 击杀 " : "防线在第 " + state.wave + " 波失守 · 击杀 ";
    this.resultCounting = true;
    this.fx.countUp(this.resultHint, 0, state.defeatedEnemies, 1.1, (value) => prefix + value + (victory ? "" : " · 重新部署"), () => { this.resultCounting = false; });
  }

  private observeWall(state: GameState): void {
    if (this.lastWallHp === null || this.lastWallShield === null) {
      this.lastWallHp = state.wallHp;
      this.lastWallShield = state.wallShield;
      return;
    }
    const wallDrop = this.lastWallHp - state.wallHp;
    const shieldDrop = this.lastWallShield - state.wallShield;
    this.lastWallHp = state.wallHp;
    this.lastWallShield = state.wallShield;
    if (this.showcaseMode) return;
    if (wallDrop > 0.5) {
      const impact = decideWallImpact(wallDrop, state.wallMaxHp);
      if (!impact) return;
      this.fx.shake(impact.shakeDurationSeconds, impact.shakeIntensity);
      this.fx.edgeFlash(0xf06a6a, impact.flashAlpha);
      this.fx.textPulse(this.wallText, 1.22);
      this.sfx.playWallImpact(impact.tier);
      for (const enemy of state.enemies) if (enemy.atWall) this.wallImpactMarks.push({ x: this.enemyX(enemy.id), ttl: 0.3 });
    } else if (shieldDrop > 0.5) {
      this.sfx.playWallImpact("light");
      this.fx.textPulse(this.shieldText, 1.18);
    }
  }

  private observeResources(state: GameState): void {
    const woodPulse = this.lastWood === null ? null : decideResourcePulse(this.lastWood, state.wood);
    const goldPulse = this.lastGold === null ? null : decideResourcePulse(this.lastGold, state.gold);
    this.lastWood = state.wood;
    this.lastGold = state.gold;
    if (woodPulse !== null) this.fx.textPulse(this.woodText, 1.22);
    if (goldPulse !== null) this.fx.textPulse(this.goldText, 1.22);
  }

  private trackModalEntrance(state: GameState): void {
    const priority = getGrowthInputPriority(state.phase, this.transformOpen);
    const visibility = {
      transform: this.transformOpen && priority === "transform",
      trait: state.phase === "TRAIT_DRAFT" && Boolean(state.pendingTraitDraft) && priority === "trait_draft",
      system: state.phase === "SYSTEM_PAUSE",
      result: state.phase === "VICTORY" || state.phase === "DEFEAT",
    };
    if (visibility.transform && !this.modalEntrance.transform) {
      this.fx.modalIn([this.transformOverlay, this.transformPanel, this.transformTitle, this.transformHint]);
      this.fx.stackIn(this.transformButtons);
    }
    if (visibility.trait && !this.modalEntrance.trait) {
      this.fx.modalIn([this.traitOverlay, this.traitPanel, this.traitTitle, this.traitTarget, this.traitHint]);
      this.fx.stackIn(this.traitButtons);
    }
    if (visibility.system && !this.modalEntrance.system) this.fx.modalIn([this.systemOverlay, this.systemTitle, this.systemHint]);
    if (visibility.result && !this.modalEntrance.result) {
      this.fx.modalIn([this.resultOverlay, this.resultTitle, this.resultHint, this.resultRestartButton, this.resultRestartLabel, this.resultLobbyButton, this.resultLobbyLabel]);
    }
    this.modalEntrance = visibility;
  }

  private renderResourceIcons(): void {
    this.drawResourceIcon(this.woodIcon, "wood", 36, RESOURCE_RAIL.y + 22);
    this.drawResourceIcon(this.goldIcon, "gold", 184, RESOURCE_RAIL.y + 16);
  }

  private drawResourceIcon(graphics: Phaser.GameObjects.Graphics, resource: GrowthResource, x: number, y: number, scale = 1): void {
    graphics.clear();
    if (resource === "wood") {
      graphics.fillStyle(0xc9853d, 1).fillRect(x - 11 * scale, y - 6 * scale, 22 * scale, 12 * scale);
      graphics.fillStyle(0xe2ad64, 1).fillCircle(x - 11 * scale, y, 6 * scale);
      graphics.lineStyle(Math.max(1, 2 * scale), 0x6f401f, 1).strokeCircle(x - 11 * scale, y, 4.5 * scale);
      graphics.lineBetween(x - 4 * scale, y - 3 * scale, x + 10 * scale, y - 3 * scale).lineBetween(x - 4 * scale, y + 3 * scale, x + 10 * scale, y + 3 * scale);
      return;
    }
    graphics.fillStyle(COLORS.gold, 1).fillCircle(x, y, 8 * scale);
    graphics.lineStyle(Math.max(1, 2 * scale), 0x714c17, 1).strokeCircle(x, y, 6 * scale);
    graphics.lineStyle(Math.max(1, 1.5 * scale), 0xfff0a0, 0.85).lineBetween(x - 3 * scale, y, x + 3 * scale, y);
  }

  private renderContext(state: GameState): void {
    this.panelActions = [];
    const selected = this.selectedSlotId;
    const building = this.selectedBuilding(state);
    const transient = this.messageTimer > 0 && this.messageText.text.length > 0;
    if (!selected) {
      this.contextTitle.setText("营地操作");
      this.contextDetail.setText("点击空格建造，点击建筑查看");
      this.contextHint.setText(transient ? this.messageText.text : "");
    } else if (!building) {
      const layout = CAMP_SLOT_LAYOUTS.find((slot) => slot.id === selected)!;
      const actions = deriveEmptySlotActions(starterCatalog.buildingGrowth, state, selected);
      this.contextTitle.setText("空建筑格 · 第 " + (layout.row + 1) + " 排·第 " + (layout.column + 1) + " 格");
      this.contextDetail.setText("选择一种建筑 · 两项费用均来自核心成长内容");
      this.contextHint.setText(transient ? this.messageText.text : "资源不足时仍可查看按钮，点击只提示准确差额");
      this.panelActions = actions.map((action) => ({
        label: action.label,
        available: action.affordable,
        reason: action.reason,
        description: action.description,
        resource: action.resource,
        resourceLabel: action.resourceLabel,
        statusLabel: action.statusLabel,
        run: () => this.performBuild(action),
      }));
    } else if (building.kind === "main_city") {
      this.contextTitle.setText(this.heroDefinition.displayName + " · 驻守");
      this.contextDetail.setText(this.heroDefinition.detailLines[0] + " · 第 3 排·第 3 格");
      this.contextHint.setText(transient ? this.messageText.text : this.heroDefinition.detailLines.slice(1).join(" · ") + " · 不可建造/升级/改造/拆除");
    } else {
      const detail = deriveBuildingDetail(starterCatalog.buildingGrowth, state, building);
      if (detail) this.renderBuildingDetail(detail, transient ? this.messageText.text : "");
      else {
        this.contextTitle.setText("建筑内容不可用");
        this.contextDetail.setText("当前建筑缺少成长内容定义，未显示猜测费用或等级");
        this.contextHint.setText(transient ? this.messageText.text : "暂无合法操作");
      }
    }
  }

  private renderBuildingDetail(detail: GrowthBuildingDetailView, transientHint: string): void {
    this.contextTitle.setText(detail.name + " · Lv." + detail.level);
    this.contextDetail.setText(detail.role + " · " + this.formatStats(detail.current) + (detail.next ? " · 下级 " + this.formatStats(detail.next) : " · 已满级"));
    const traitText = detail.traits.length === 0 ? "尚无词条" : "词条：" + detail.traits.map((trait) => trait.name + " ×" + trait.currentStacks).join("、");
    this.contextHint.setText(transientHint || (this.destroyConfirm ? "拆除不返还资源 · 再次确认将永久失去等级与词条" : traitText));
    if (this.destroyConfirm) {
      this.panelActions = [
        { label: "取消拆除", available: true, reason: "返回建筑详情", description: "返回建筑详情", resource: null, resourceLabel: "", statusLabel: "返回", run: () => { this.destroyConfirm = false; } },
        { label: "确认拆除", available: true, reason: "", description: "永久移除当前建筑", resource: null, resourceLabel: "", statusLabel: "确认", run: () => this.performDestroy() },
      ];
      return;
    }
    this.panelActions = [{
      label: detail.upgrade.label,
      available: detail.upgrade.affordable,
      reason: detail.upgrade.reason,
      description: detail.upgrade.description,
      resource: detail.upgrade.resource,
      resourceLabel: detail.upgrade.resourceLabel,
      statusLabel: detail.upgrade.statusLabel,
      run: () => this.performUpgrade(detail.upgrade),
    }];
    if (detail.canTransform) this.panelActions.push({
      label: "改造｜" + detail.transformResourceLabel + " " + (detail.transformCostLabel ?? ""),
      available: true,
      reason: "打开四路改造选择",
      description: "选择特殊塔职责",
      resource: detail.transformResource,
      resourceLabel: detail.transformResourceLabel,
      statusLabel: "查看改造",
      run: () => { this.transformOpen = true; },
    });
    this.panelActions.push({ label: "拆除", available: true, reason: "拆除不返还资源", description: "移除当前建筑", resource: null, resourceLabel: "", statusLabel: "可拆除", run: () => { this.destroyConfirm = true; } });
  }

  /** Floating near-slot action bar mirroring the first three panel actions; closes with the selection. */
  private renderSlotActionBar(state: GameState): void {
    const show = this.selectedSlotId !== null && this.panelActions.length > 0 && getGrowthInputPriority(state.phase, this.transformOpen) === "building";
    this.slotBarBounds = show ? deriveSlotActionBarBounds(this.selectedSlotId!) : null;
    for (let index = 0; index < this.slotBarButtons.length; index += 1) {
      const button = this.slotBarButtons[index]!;
      const label = this.slotBarLabels[index]!;
      const action = this.panelActions[index];
      const visible = show && Boolean(action);
      button.setVisible(visible);
      if (button.input) button.input.enabled = visible;
      label.setVisible(visible);
      if (!visible || !action || !this.slotBarBounds) continue;
      const centerX = this.slotBarBounds.x + 52 + index * 106;
      const centerY = this.slotBarBounds.y + this.slotBarBounds.height / 2;
      button.setPosition(centerX, centerY).setSize(100, 44);
      button.setFillStyle(action.available ? COLORS.blue : 0x3c4439, 1).setAlpha(action.available ? 1 : 0.75).setStrokeStyle(2, action.available ? COLORS.gold : 0x77796c, 1);
      const costSuffix = action.resource && action.resourceLabel ? "\n" + action.resourceLabel : "";
      label.setPosition(centerX, centerY).setText(action.label.split("｜")[0] + costSuffix).setColor(action.available ? "#ffffff" : "#c0c3b5");
    }
  }

  /** Slot bar backing plate drawn under the dynamic layer's redraw cycle. */
  private renderSlotBarBackdrop(): void {
    if (!this.slotBarBounds) return;
    this.dynamic.fillStyle(0x1d2b21, 0.94).fillRect(this.slotBarBounds.x, this.slotBarBounds.y, this.slotBarBounds.width, this.slotBarBounds.height);
    this.dynamic.lineStyle(2, COLORS.gold, 0.9).strokeRect(this.slotBarBounds.x, this.slotBarBounds.y, this.slotBarBounds.width, this.slotBarBounds.height);
  }

  private renderTransformModal(state: GameState): void {
    const visible = this.transformOpen && getGrowthInputPriority(state.phase, true) === "transform";
    this.transformOverlay.setVisible(visible);
    this.transformPanel.setVisible(visible);
    this.transformTitle.setVisible(visible);
    this.transformHint.setVisible(visible);
    this.transformCloseButton.setVisible(visible);
    this.transformCloseLabel.setVisible(visible);
    const transient = this.messageTimer > 0 && this.messageText.text.length > 0;
    this.transformHint.setText(transient ? this.messageText.text : "选择一种确定性特殊塔 · 背景建筑保持可见").setColor(transient ? this.messageColor : "#dbe6f4");
    const building = this.selectedBuilding(state);
    const options = building ? deriveTransformOptions(starterCatalog.buildingGrowth, state, building) : [];
    for (let index = 0; index < this.transformButtons.length; index += 1) {
      const option = options[index];
      const button = this.transformButtons[index]!;
      const label = this.transformLabels[index]!;
      const icon = this.transformIcons[index]!;
      const costIcon = this.transformCostIcons[index]!;
      button.setVisible(visible && Boolean(option));
      label.setVisible(visible && Boolean(option));
      icon.setVisible(visible && Boolean(option));
      costIcon.setVisible(visible && Boolean(option));
      if (!option) continue;
      const color = TRANSFORM_COLORS[option.targetTowerId] ?? COLORS.gold;
      button.setFillStyle(option.affordable ? 0x41543d : 0x343a34, 1).setAlpha(option.affordable ? 1 : 0.8).setStrokeStyle(2, option.affordable ? color : 0x74786c, 1);
      label.setText(option.name + "\n" + option.role + "\n" + option.resourceLabel + " " + option.goldCost + " · " + option.statusLabel).setColor(option.affordable ? "#fff3d2" : "#c6c7bc");
      const bounds = GROWTH_TRANSFORM_OPTION_BOUNDS[index]!;
      const iconX = bounds.x + 36;
      const iconY = bounds.y + bounds.height / 2;
      icon.clear().fillStyle(color, option.affordable ? 1 : 0.6).fillCircle(iconX, iconY, 24);
      this.drawTowerGlyph(icon, option.targetTowerId, iconX, iconY, color);
      this.drawResourceIcon(costIcon, option.resource, bounds.x + 64, iconY + 22, 0.58);
    }
  }

  private renderTraitModal(state: GameState): void {
    const visible = state.phase === "TRAIT_DRAFT" && Boolean(state.pendingTraitDraft) && getGrowthInputPriority(state.phase, false) === "trait_draft";
    this.traitOverlay.setVisible(visible);
    this.traitPanel.setVisible(visible);
    this.traitTitle.setVisible(visible);
    this.traitTarget.setVisible(visible);
    this.traitHint.setVisible(visible);
    const draft = state.pendingTraitDraft;
    const building = draft ? state.buildings.find((candidate) => candidate.id === draft.buildingId) : undefined;
    const options = deriveTraitOptions(starterCatalog.buildingGrowth, state, draft);
    if (building && draft) {
      const layout = CAMP_SLOT_LAYOUTS.find((slot) => slot.id === building.slotId);
      const name = deriveBuildingDetail(starterCatalog.buildingGrowth, state, building)?.name ?? "当前建筑";
      this.traitTarget.setText(name + " · 第 " + ((layout?.row ?? 0) + 1) + " 排·第 " + ((layout?.column ?? 0) + 1) + " 格 · Lv." + draft.createdAtLevel);
    }
    for (let index = 0; index < this.traitButtons.length; index += 1) {
      const option = options[index];
      const button = this.traitButtons[index]!;
      const label = this.traitLabels[index]!;
      button.setVisible(visible && Boolean(option)).setAlpha(this.traitLocked ? 0.55 : 1);
      label.setVisible(visible && Boolean(option));
      if (!option) continue;
      button.setFillStyle(this.traitLocked ? 0x303830 : index === 0 ? 0x4b5d3e : COLORS.panel, 1).setStrokeStyle(2, this.traitLocked ? 0x74786c : COLORS.gold, 1);
      label.setText(option.name + " · " + option.categoryLabel + "\n当前 " + option.currentStacks + " 层 → 选择后 " + option.nextStacks + " 层\n" + option.effectText).setColor(this.traitLocked ? "#b6b9ae" : "#fff3d2");
    }
  }

  private renderSystemAndResult(state: GameState): void {
    const systemVisible = state.phase === "SYSTEM_PAUSE";
    this.systemOverlay.setVisible(systemVisible);
    this.systemTitle.setVisible(systemVisible);
    this.systemHint.setVisible(systemVisible);
    const resultVisible = state.phase === "VICTORY" || state.phase === "DEFEAT";
    this.resultOverlay.setVisible(resultVisible);
    this.resultTitle.setVisible(resultVisible);
    this.resultHint.setVisible(resultVisible);
    this.resultRestartButton.setVisible(resultVisible);
    this.resultRestartLabel.setVisible(resultVisible);
    this.resultLobbyButton.setVisible(resultVisible);
    this.resultLobbyLabel.setVisible(resultVisible);
    if (resultVisible) {
      const victory = state.phase === "VICTORY";
      this.resultTitle.setText(victory ? "守住了" : "城墙失守").setColor(victory ? "#62d79b" : "#f06a6a");
      if (!this.resultCounting) this.resultHint.setText(victory ? "最终首领已击破 · 波次 " + state.wave + " · 击杀 " + state.defeatedEnemies : "防线在第 " + state.wave + " 波失守 · 击杀 " + state.defeatedEnemies + " · 重新部署");
    }
  }

  private syncInput(state: GameState): void {
    const priority = getGrowthInputPriority(state.phase, this.transformOpen);
    const buildingInput = priority === "building";
    for (const button of this.slotBarButtons) button.input!.enabled = buildingInput && button.visible;
    const pauseControl = deriveGrowthPauseControl(state.phase);
    this.pauseButton.input!.enabled = priority === "building" && pauseControl.enabled;
    const transformInput = priority === "transform";
    this.transformCloseButton.input!.enabled = transformInput;
    for (const button of this.transformButtons) button.input!.enabled = transformInput && button.visible;
    const traitInput = priority === "trait_draft" && !this.traitLocked;
    for (const button of this.traitButtons) button.input!.enabled = traitInput && button.visible;
    this.resultRestartButton.input!.enabled = state.phase === "VICTORY" || state.phase === "DEFEAT";
    this.resultLobbyButton.input!.enabled = state.phase === "VICTORY" || state.phase === "DEFEAT";
    this.systemOverlay.input!.enabled = state.phase === "SYSTEM_PAUSE";
    this.soundButton.input!.enabled = true;
    this.transformOverlay.input!.enabled = transformInput;
    this.traitOverlay.input!.enabled = priority === "trait_draft";
    this.resultOverlay.input!.enabled = state.phase === "VICTORY" || state.phase === "DEFEAT";
  }

  private renderDynamic(state: GameState): void {
    this.dynamic.clear();
    const wallRatio = Math.max(0, Math.min(1, state.wallHp / state.wallMaxHp));
    const wallColor = wallRatio > 0.35 ? 0x6d5235 : 0x71342d;
    this.dynamic.fillStyle(wallColor, 1).fillRect(WALL_ZONE.x, WALL_ZONE.y, WALL_ZONE.width, WALL_ZONE.height);
    this.dynamic.lineStyle(2, 0x9a7046, 1).lineBetween(WALL_ZONE.x, WALL_ZONE.y + 13, WALL_ZONE.x + WALL_ZONE.width, WALL_ZONE.y + 13);
    this.dynamic.lineStyle(2, 0x2a1c14, 0.9).lineBetween(WALL_ZONE.x, WALL_ZONE.y + 48, WALL_ZONE.x + WALL_ZONE.width, WALL_ZONE.y + 48);
    const shieldRatio = state.wallShieldMax > 0 ? Math.max(0, Math.min(1, state.wallShield / state.wallShieldMax)) : 0;
    this.dynamic.fillStyle(0x17353a, 0.9).fillRect(44, WALL_ZONE.y - 2, 632, 6);
    this.dynamic.fillStyle(0x72d6c9, 1).fillRect(44, WALL_ZONE.y - 2, 632 * shieldRatio, 6);
    this.dynamic.fillStyle(0x271d15, 0.7).fillRect(44, WALL_ZONE.y + 4, 632, 7);
    this.dynamic.fillStyle(wallRatio > 0.35 ? COLORS.success : COLORS.danger, 1).fillRect(44, WALL_ZONE.y + 4, 632 * wallRatio, 7);
    if (wallRatio < 0.5) {
      const crackTop = WALL_ZONE.y + 23;
      const crackBottom = WALL_ZONE.y + 44;
      this.dynamic.lineStyle(3, COLORS.danger, 0.8).lineBetween(178, crackTop, 205, crackBottom).lineBetween(205, crackBottom, 226, crackTop + 4);
      this.dynamic.lineBetween(514, crackTop - 1, 492, crackBottom).lineBetween(492, crackBottom, 470, crackTop + 8);
    }
    for (const mark of this.wallImpactMarks) {
      this.dynamic.fillStyle(0xf06a6a, Math.min(0.5, mark.ttl * 3)).fillRect(mark.x - 16, WALL_ZONE.y + 6, 32, WALL_ZONE.height - 12);
    }

    const boss = state.enemies.find((enemy) => enemy.hp > 0 && this.enemyDefinition(enemy.definitionId).tier === "boss");
    this.bossNameText.setVisible(Boolean(boss));
    if (boss) {
      const ratio = Math.max(0, boss.hp / boss.maxHp);
      const definition = this.enemyDefinition(boss.definitionId);
      this.bossNameText.setText(definition.displayName + "  " + Math.ceil(boss.hp) + " / " + boss.maxHp);
      this.dynamic.fillStyle(0x1c1512, 0.88).fillRect(110, 133, 500, 20);
      this.dynamic.lineStyle(2, COLORS.line, 0.9).strokeRect(110, 133, 500, 20);
      this.dynamic.fillStyle(COLORS.danger, 1).fillRect(112, 135, 496 * ratio, 16);
    }

    for (const layout of CAMP_SLOT_LAYOUTS) {
      const building = state.buildings.find((item) => item.slotId === layout.id);
      const selected = this.selectedSlotId === layout.id;
      this.dynamic.fillStyle(building ? 0x263d32 : 0x263a2c, 1).fillRect(layout.x, layout.y, layout.width, layout.height);
      this.dynamic.lineStyle(selected ? 4 : 2, selected ? COLORS.gold : COLORS.line, 1).strokeRect(layout.x, layout.y, layout.width, layout.height);
      if (building) this.drawBuilding(building, layout.x + layout.width / 2, layout.y + layout.height / 2 - (selected ? 6 : 0), this.growthMaxLevel(state, building));
      else {
        // Opening guidance: empty slots breathe while the player still has free build time.
        const guiding = state.phase === "OPENING_COUNTDOWN";
        const pulse = guiding ? Math.sin(this.time.now / 260) * 0.5 + 0.5 : 0;
        const radius = selected ? 20 : 17 + pulse * 4;
        this.dynamic.fillStyle(selected || guiding ? COLORS.gold : 0x53644a, selected ? 0.95 : guiding ? 0.4 + pulse * 0.5 : 0.7).fillCircle(layout.x + layout.width / 2, layout.y + layout.height / 2, radius);
        this.dynamic.lineStyle(2, selected || guiding ? COLORS.text : 0xa8b18c, selected || guiding ? 0.9 : 0.8).lineBetween(layout.x + layout.width / 2 - 9, layout.y + layout.height / 2, layout.x + layout.width / 2 + 9, layout.y + layout.height / 2).lineBetween(layout.x + layout.width / 2, layout.y + layout.height / 2 - 9, layout.x + layout.width / 2, layout.y + layout.height / 2 + 9);
      }
      const label = this.slotLabels[CAMP_SLOT_LAYOUTS.indexOf(layout)]!;
      label.setPosition(layout.x + layout.width / 2, building ? layout.y + layout.height - 10 : layout.y + layout.height / 2 + 26);
      label.setFontSize(building ? "11px" : "12px");
      label.setText(building ? this.buildingLabel(building) : selected ? "已选空格" : "空格");
      label.setColor(building?.kind === "main_city" ? "#ffe08a" : selected ? "#fff3b0" : "#d6d39c");
    }

    const visibleEnemyIds = new Set<string>();
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0) continue;
      visibleEnemyIds.add(enemy.id);
      const x = this.enemyX(enemy.id);
      const y = this.enemyY(enemy.position);
      const definition = this.enemyDefinition(enemy.definitionId);
      const radius = definition.tier === "boss" ? 21 : definition.tier === "elite" ? 16 : enemy.definitionId === "tank" ? 14 : 11;
      if (enemy.chargeWarningRemainingSeconds > 0) {
        this.dynamic.lineStyle(4, COLORS.danger, 0.95).strokeCircle(x, y, radius + 14);
        this.dynamic.lineStyle(2, COLORS.danger, 0.45).strokeCircle(x, y, radius + 20);
      }
      if (state.overlordInspireRemainingSeconds > 0 && definition.tier !== "boss") this.dynamic.lineStyle(3, COLORS.orange, 0.7).strokeCircle(x, y, radius + 6);
      if ((enemy.growthBurnStates?.length ?? 0) > 0) this.dynamic.lineStyle(2, COLORS.orange, 0.8).strokeCircle(x, y, 24);
      this.drawEnemy(definition, enemy, x, y, radius);
      this.dynamic.fillStyle(0x263029, 1).fillRect(x - 20, y - 30, 40, 4);
      this.dynamic.fillStyle(COLORS.success, 1).fillRect(x - 20, y - 30, 40 * Math.max(0, enemy.hp / enemy.maxHp), 4);
      let label = this.enemyLabels.get(enemy.id);
      if (!label) {
        const labelSize = definition.tier === "boss" ? 15 : definition.tier === "elite" ? 13 : 11;
        label = this.add.text(x, y - radius - 14, "", { ...this.textStyle(labelSize, definition.tier === "boss" ? "#f06a6a" : definition.tier === "elite" ? "#f28b37" : "#e4efdc"), align: "center", stroke: "#19231b", strokeThickness: definition.tier === "boss" ? 4 : 3 }).setOrigin(0.5).setDepth(7);
        this.enemyLabels.set(enemy.id, label);
      }
      const warningLabel = enemy.chargeWarningRemainingSeconds > 0 ? " · ⚠冲锋" : (enemy.growthBurnStates?.length ?? 0) > 0 ? " · 燃烧" : "";
      const showLabel = definition.tier !== "normal" || warningLabel.length > 0;
      label.setPosition(x, y - radius - 14).setText(definition.displayName + warningLabel).setVisible(showLabel);
    }
    for (const [enemyId, label] of this.enemyLabels) if (!visibleEnemyIds.has(enemyId)) label.setVisible(false);
    for (const feedback of this.feedbacks) {
      if (feedback.kind === "shot" && feedback.targetX !== undefined && feedback.targetY !== undefined) this.drawProjectile(feedback as ShotFeedback);
      else if (feedback.kind === "hit") this.dynamic.lineStyle(3, 0xffffff, Math.min(1, feedback.ttl * 7)).strokeCircle(feedback.x, feedback.y, 22);
      else this.drawDefeatBurst(feedback.x, feedback.y, feedback.ttl);
    }
  }

  private drawProjectile(feedback: ShotFeedback): void {
    const alpha = Math.min(1, feedback.ttl * 7);
    const tx = feedback.targetX;
    const ty = feedback.targetY;
    if (feedback.style === "arc") {
      const peakY = Math.min(feedback.y, ty) - 70;
      this.dynamic.lineStyle(5, 0xf07b28, alpha).beginPath().moveTo(feedback.x, feedback.y);
      for (let step = 1; step <= 8; step += 1) {
        const ratio = step / 8;
        const lerpY = feedback.y + (ty - feedback.y) * ratio;
        this.dynamic.lineTo(feedback.x + (tx - feedback.x) * ratio, lerpY + (peakY - lerpY) * 4 * ratio * (1 - ratio));
      }
      this.dynamic.strokePath();
      this.dynamic.lineStyle(3, 0xffd9a0, alpha * 0.8).strokeCircle(tx, ty, 30 + (1 - feedback.ttl / 0.16) * 22);
      return;
    }
    if (feedback.style === "bolt") {
      const deltaX = tx - feedback.x;
      const deltaY = ty - feedback.y;
      const length = Math.hypot(deltaX, deltaY) || 1;
      const normalX = -deltaY / length;
      const normalY = deltaX / length;
      const jitter = feedback.jitter ?? [0, 6, -6, 5, 0];
      this.dynamic.lineStyle(3, 0xd06cff, alpha).beginPath().moveTo(feedback.x, feedback.y);
      jitter.forEach((offset, index) => {
        const ratio = (index + 1) / jitter.length;
        this.dynamic.lineTo(feedback.x + deltaX * ratio + normalX * offset, feedback.y + deltaY * ratio + normalY * offset);
      });
      this.dynamic.strokePath();
      return;
    }
    if (feedback.style === "shard") {
      this.dynamic.lineStyle(3, 0x9ce7ff, alpha).lineBetween(feedback.x, feedback.y, tx, ty);
      this.dynamic.lineStyle(2, 0xd9f6ff, alpha).strokeCircle(tx, ty, 9);
      return;
    }
    this.dynamic.lineStyle(4, COLORS.gold, alpha).beginPath().moveTo(feedback.x, feedback.y).lineTo(tx, ty).strokePath();
  }

  private drawDefeatBurst(x: number, y: number, ttl: number): void {
    const alpha = Math.min(1, ttl * 4);
    const progress = 1 - ttl / 0.34;
    this.dynamic.lineStyle(3, COLORS.orange, alpha).strokeCircle(x, y, 14 + progress * 22);
    this.dynamic.lineStyle(2, 0xffd9a0, alpha);
    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6 + 0.4;
      const inner = 10 + progress * 26;
      const outer = inner + 8;
      this.dynamic.lineBetween(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner, x + Math.cos(angle) * outer, y + Math.sin(angle) * outer);
    }
  }

  private boltJitter(enemyId: string): number[] {
    let hash = 0;
    for (const char of enemyId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return Array.from({ length: 5 }, (_, index) => ((hash >> (index * 3)) % 17) - 8);
  }

  private processEvents(events: GameEvent[]): void {
    const bossIds = starterCatalog.enemies.filter((enemy) => enemy.tier === "boss").map((enemy) => enemy.id);
    for (const event of events) {
      this.sfx.handleEvent(event);
      if (event.type === "tower_attack") {
        const building = this.simulation.getState().buildings.find((item) => item.id === event.buildingId);
        const heroBuilding = this.simulation.getState().buildings.find((item) => item.kind === "main_city");
        const source = building ?? (event.buildingId === this.simulation.getState().hero?.id ? heroBuilding : undefined);
        if (source) this.feedbacks.push({ kind: "shot", x: this.towerX(source), y: this.towerY(source), targetX: this.enemyX(event.targetId), targetY: this.enemyY(event.targetPosition), ttl: 0.16, style: mapTowerProjectileStyle(event.towerDefinitionId), jitter: this.boltJitter(event.targetId) });
      } else if (event.type === "enemy_hit") {
        this.feedbacks.push({ kind: "hit", x: this.enemyX(event.enemyId), y: this.enemyY(event.position), ttl: 0.16 });
        if (shouldShowDamageNumber(event.damage)) this.fx.floatText(this.enemyX(event.enemyId), this.enemyY(event.position) - 28, String(Math.round(event.damage)), "#ffe9a0", 18);
      } else if (event.type === "enemy_defeated") {
        this.feedbacks.push({ kind: "defeat", x: this.enemyX(event.enemyId), y: this.enemyY(event.position), ttl: 0.34 });
        const reward = this.enemyDefinition(event.enemyId.slice(0, event.enemyId.lastIndexOf("-"))).goldReward;
        this.fx.flyCoin(this.enemyX(event.enemyId), this.enemyY(event.position), 204, RESOURCE_RAIL.y + 7, coinFlightLabel(reward));
      } else if (event.type === "wave_started") {
        this.fx.zoomPunch();
        const banner = deriveWaveBanner(event.wave, this.simulation.getState().maxWave);
        if (banner) this.fx.waveBanner(banner.text, banner.color, banner.isBossWave);
      } else if (event.type === "enemy_spawned" && isBossEntrance(event.definitionId, bossIds)) {
        const definition = this.enemyDefinition(event.definitionId);
        this.sfx.playUi("boss_roar");
        this.fx.bossEntrance(definition.displayName + " 登场", definition.role);
        this.fx.shake(0.35, 0.008);
        this.fx.edgeFlash(0x2a0f12, 0.5, 0.45);
      }
      const notice = routeBattleNotice(event);
      if (notice && event.type !== "wave_started") this.handleNotice(notice);
      const captureCharge = this.showcaseCapture === "charge" && (event.type === "enemy_charge_warning" || event.type === "enemy_charge_started" || event.type === "enemy_charge_impact");
      const captureInspire = this.showcaseCapture === "inspire" && event.type === "overlord_inspire";
      if ((captureCharge || captureInspire) && this.simulation.getState().phase === "RUNNING") this.showcaseFreeze = true;
    }
  }

  private handleNotice(notice: FeedbackNotice): void {
    if (notice.channel === "ambient") {
      const key = notice.throttleKey ?? notice.text;
      if (!this.noticeGate.allow(key, this.time.now / 1000, AMBIENT_NOTICE_MIN_INTERVAL_SECONDS)) return;
      this.ambientNoticeText.setText(notice.text).setColor(notice.color);
      this.ambientNoticeTimer = Math.max(this.ambientNoticeTimer, notice.durationSeconds);
      return;
    }
    const showcaseHold = (this.showcaseCapture === "charge" && notice.channel === "warning") || (this.showcaseCapture === "inspire" && notice.text.includes("鼓舞"));
    this.showBattleNotice(notice.text, notice.color, showcaseHold ? 60 : notice.durationSeconds);
  }

  private drawEnemy(definition: EnemyDefinition, enemy: EnemyRuntimeState, x: number, y: number, radius: number): void {
    const color = this.enemyColor(definition);
    const dark = 0x263029;
    const light = 0xffe7aa;
    const legY = y + radius * 0.92;
    const headY = y - radius * 0.52;
    this.dynamic.fillStyle(0x513c1e, 0.34).fillRect(x - radius, y + radius * 0.82, radius * 2, 5);
    if (definition.tier === "boss") {
      this.dynamic.fillStyle(dark, 1).fillRect(x - 18, y - 1, 36, 28);
      this.dynamic.fillStyle(color, 1).fillCircle(x, headY, 15);
      this.dynamic.fillStyle(0x482c25, 1).fillTriangle(x, headY - 19, x - 13, headY - 5, x - 5, headY - 22).fillTriangle(x, headY - 20, x + 13, headY - 5, x + 5, headY - 22);
      this.dynamic.fillStyle(light, 1).fillCircle(x - 5, headY - 1, 3).fillCircle(x + 5, headY - 1, 3);
      this.dynamic.lineStyle(5, color, 1).lineBetween(x - 22, y + 2, x - 31, y + 18).lineBetween(x + 22, y + 2, x + 31, y + 18);
      this.dynamic.lineStyle(5, dark, 1).lineBetween(x - 10, y + 26, x - 15, legY + 5).lineBetween(x + 10, y + 26, x + 15, legY + 5);
      return;
    }
    if (definition.behavior === "tank") {
      this.dynamic.fillStyle(color, 1).fillRect(x - 15, y - 3, 30, 25);
      this.dynamic.lineStyle(3, light, 0.9).strokeRect(x - 15, y - 3, 30, 25);
      this.dynamic.fillStyle(color, 1).fillCircle(x, headY, 11);
      this.dynamic.fillStyle(0x5b4e82, 1).fillRect(x - 14, headY - 3, 28, 7);
      this.dynamic.lineStyle(5, dark, 1).lineBetween(x - 15, y + 5, x - 25, y + 17).lineBetween(x + 15, y + 5, x + 25, y + 17);
      this.dynamic.lineStyle(5, dark, 1).lineBetween(x - 8, y + 22, x - 12, legY + 3).lineBetween(x + 8, y + 22, x + 12, legY + 3);
      return;
    }
    const runner = definition.behavior === "runner";
    const elite = definition.tier === "elite";
    const bodyWidth = elite ? 17 : runner ? 11 : 14;
    const bodyHeight = elite ? 23 : runner ? 20 : 18;
    this.dynamic.fillStyle(color, 1).fillRect(x - bodyWidth, y - 1, bodyWidth * 2, bodyHeight);
    if (elite) {
      this.dynamic.lineStyle(3, light, 0.9).strokeRect(x - bodyWidth - 3, y - 5, bodyWidth * 2 + 6, bodyHeight + 7);
      this.dynamic.fillStyle(0xd98b31, 1).fillTriangle(x - 19, y - 5, x - 8, y - 16, x - 5, y + 4).fillTriangle(x + 19, y - 5, x + 8, y - 16, x + 5, y + 4);
    }
    this.dynamic.fillStyle(color, 1).fillCircle(x + (runner ? 4 : 0), headY, runner ? 8 : 9);
    this.dynamic.fillStyle(light, 1).fillCircle(x - 3 + (runner ? 4 : 0), headY - 1, 2).fillCircle(x + 3 + (runner ? 4 : 0), headY - 1, 2);
    this.dynamic.lineStyle(3, dark, 1).lineBetween(x - bodyWidth, y + 3, x - bodyWidth - (runner ? 10 : 6), y + 16).lineBetween(x + bodyWidth, y + 3, x + bodyWidth + (runner ? 8 : 6), y + 14);
    this.dynamic.lineStyle(4, dark, 1).lineBetween(x - 6, y + bodyHeight, x - 9, legY + 3).lineBetween(x + 6, y + bodyHeight, x + 9, legY + 3);
  }

  private growthMaxLevel(state: GameState, building: BuildingState): number | null {
    if (!building.growthDefinitionId) return null;
    return deriveBuildingDetail(starterCatalog.buildingGrowth, state, building)?.maxLevel ?? null;
  }

  private drawBuilding(building: BuildingState, x: number, y: number, maxLevel: number | null): void {
    if (building.kind === "main_city") {
      this.dynamic.fillStyle(0x344e39, 1).fillCircle(x, y, 28);
      this.dynamic.lineStyle(3, 0x72d6c9, 1).strokeCircle(x, y, 28);
      this.dynamic.fillStyle(COLORS.gold, 1).fillTriangle(x, y - 40, x - 20, y - 3, x + 20, y - 3);
      this.dynamic.fillStyle(0x213524, 1).fillCircle(x, y - 12, 8);
      this.dynamic.lineStyle(3, COLORS.gold, 1).lineBetween(x - 12, y + 8, x + 12, y + 8);
      return;
    }
    const towerId = building.growthDefinitionId ?? "arrow_tower";
    const color = building.kind === "tower" ? this.growthTowerColor(towerId) : building.kind === "lumberyard" ? 0x6fce8b : 0x8fb5ff;
    this.dynamic.fillStyle(0x1b241d, 0.55).fillCircle(x, y + 18, 25);
    this.dynamic.fillStyle(0x55636a, 1).fillCircle(x, y + 8, 23);
    this.dynamic.lineStyle(3, 0x202a22, 1).strokeCircle(x, y + 8, 23);
    if (building.kind === "tower") this.drawTowerGlyph(this.dynamic, towerId, x, y, color);
    else if (building.kind === "lumberyard") {
      this.dynamic.fillStyle(color, 1).fillTriangle(x, y - 28, x - 25, y + 8, x + 25, y + 8);
      this.dynamic.fillStyle(0x2a1d14, 1).fillRect(x - 9, y - 1, 18, 18);
      this.dynamic.fillStyle(0xc9853d, 1).fillCircle(x - 23, y + 16, 7).fillCircle(x - 11, y + 19, 7);
    }
    this.dynamic.fillStyle(0x202a22, 1).fillRect(x - 19, y + 25, 38, 4);
    if (maxLevel !== null && maxLevel > 0) this.dynamic.fillStyle(COLORS.gold, 1).fillRect(x - 19, y + 25, 38 * Math.min(1, building.level / maxLevel), 4);
  }

  private drawTowerGlyph(graphics: Phaser.GameObjects.Graphics, towerId: string, x: number, y: number, color: number): void {
    if (towerId === "machine_gun") {
      graphics.fillStyle(color, 1).fillRect(x - 15, y - 12, 27, 23);
      graphics.lineStyle(5, color, 1).lineBetween(x + 3, y - 5, x + 27, y - 8).lineBetween(x + 3, y + 3, x + 27, y);
      graphics.fillStyle(0xfff3c1, 1).fillCircle(x + 28, y - 8, 3);
    } else if (towerId === "cannon") {
      graphics.fillStyle(color, 1).fillCircle(x, y + 7, 17);
      graphics.lineStyle(10, color, 1).lineBetween(x - 2, y - 5, x + 25, y - 18);
      graphics.fillStyle(0x202a22, 1).fillCircle(x + 27, y - 19, 7);
    } else if (towerId === "frost") {
      graphics.fillStyle(color, 1).fillTriangle(x, y - 31, x - 18, y + 2, x + 18, y + 2);
      graphics.lineStyle(2, 0xe6fbff, 0.9).lineBetween(x, y - 27, x, y - 3).lineBetween(x - 14, y - 2, x + 14, y - 2);
    } else if (towerId === "electric") {
      graphics.fillStyle(color, 1).fillRect(x - 14, y - 11, 28, 24);
      graphics.lineStyle(3, 0xf2d8ff, 1).strokeCircle(x, y - 14, 12);
      graphics.lineStyle(3, color, 1).lineBetween(x - 23, y - 20, x - 10, y - 8).lineBetween(x + 23, y - 20, x + 10, y - 8);
    } else {
      graphics.fillStyle(color, 1).fillTriangle(x, y - 31, x - 18, y + 5, x + 18, y + 5);
      graphics.lineStyle(4, 0xfff3c1, 1).lineBetween(x - 3, y - 1, x + 14, y - 11).lineBetween(x - 3, y + 2, x + 14, y + 12);
    }
  }

  private formatStats(stats: { kind: "tower" | "lumberyard"; damage?: number; attackIntervalSeconds?: number; range?: number; woodPerSecond?: number }): string {
    if (stats.kind === "lumberyard") return "木材 " + this.formatRate(stats.woodPerSecond ?? 0) + "/秒";
    return "伤害 " + this.formatRate(stats.damage ?? 0) + " · 间隔 " + this.formatRate(stats.attackIntervalSeconds ?? 0) + "s · 射程 " + this.formatRate(stats.range ?? 0);
  }

  private buildingLabel(building: BuildingState): string {
    if (building.kind === "main_city") return this.heroDefinition.displayName + " · 驻守";
    if (building.kind === "lumberyard") return "木材厂 Lv." + building.level;
    const towerId = building.growthDefinitionId && building.growthDefinitionId !== "lumberyard" ? building.growthDefinitionId : "arrow_tower";
    const presentation = getGrowthBuildingPresentation(starterCatalog.buildingGrowth, towerId);
    return (presentation?.displayName ?? "箭塔") + " Lv." + building.level;
  }

  private growthTowerColor(towerId: string): number {
    return TRANSFORM_COLORS[towerId] ?? 0xf6c453;
  }

  private statusLabel(state: GameState): string {
    if (state.phase === "OPENING_COUNTDOWN") return "5 秒部署 · 点击空格即可建造";
    if (state.phase === "TACTICAL_PAUSE") return "战术暂停 · 时间 / 战斗冻结，仍可规划建筑";
    if (state.phase === "SYSTEM_PAUSE") return "系统暂停 · 输入已锁定";
    if (state.phase === "TRAIT_DRAFT") return "升级已完成 · 必须选择当前建筑词条";
    if (state.phase === "VICTORY") return "胜利 · 最终首领已击破";
    if (state.phase === "DEFEAT") return "失守 · 城墙耐久归零";
    return "尸潮持续推进 · 木材建造/升级，金币改造";
  }

  private phaseLabel(phase: GamePhase): string {
    if (phase === "OPENING_COUNTDOWN") return "开局部署";
    if (phase === "RUNNING") return "连续战斗";
    if (phase === "TACTICAL_PAUSE") return "战术暂停";
    if (phase === "SYSTEM_PAUSE") return "系统暂停";
    if (phase === "TRAIT_DRAFT") return "强制词条选择";
    return phase === "VICTORY" ? "胜利" : "失守";
  }

  private showMessage(message: string, positive: boolean, resource?: GrowthResource): void {
    this.messageColor = positive ? "#62d79b" : "#f6c453";
    this.messageText.setColor(this.messageColor).setText(message);
    this.messageTimer = 1.5;
    if (positive) return;
    this.sfx.playUi("error");
    this.fx.edgeFlash(0xf06a6a, 0.08, 0.2);
    if (resource === "wood") this.fx.errorShake(this.woodText);
    else if (resource === "gold") this.fx.errorShake(this.goldText);
  }

  private showBattleNotice(message: string, color: string, durationSeconds: number): void {
    this.battleNoticeText.setText(message).setColor(color);
    this.battleNoticeTimer = Math.max(this.battleNoticeTimer, durationSeconds);
  }

  private formatSeconds(seconds: number): string {
    const safe = Math.max(0, Math.ceil(seconds));
    return String(Math.floor(safe / 60)).padStart(2, "0") + ":" + String(safe % 60).padStart(2, "0");
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

  private textStyle(size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: "Noto Sans SC, Microsoft YaHei, system-ui, sans-serif", fontSize: String(size) + "px", color };
  }
}

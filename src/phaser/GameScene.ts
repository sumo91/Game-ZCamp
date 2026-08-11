import Phaser from "phaser";
import { FixedStepClock } from "../core/clock";
import { starterCatalog } from "../core/content";
import { GameSimulation } from "../core/game";
import type { GameEvent, GamePhase } from "../core/types";
import { CAMP_SLOT_LAYOUTS, CARD_LAYOUTS, ENEMY_ZONE, GRID_ZONE, LOGICAL_HEIGHT, LOGICAL_WIDTH, RESOURCE_RAIL, WALL_ZONE } from "./layout";

const STEP_SECONDS = 1 / 30;
const PALETTE = {
  ink: 0x1b241d,
  night: 0x17251d,
  enemyZone: 0x263c2f,
  road: 0xdca321,
  roadLight: 0xefbd37,
  vegetation: 0x317a24,
  vegetationLight: 0x4b9a29,
  wall: 0x4b2e1b,
  wallLight: 0xc9853d,
  board: 0x7d9b2b,
  slot: 0xe6b84d,
  text: 0xfff3d2,
  secondary: 0xd8c59b,
  danger: 0xef5a43,
  zombie: 0x69b64a,
  infected: 0x4f9f3b,
  gold: 0xf6c453,
  wood: 0xc9853d,
} as const;

interface EnemyHealthBars {
  track: Phaser.GameObjects.Rectangle;
  fill: Phaser.GameObjects.Rectangle;
}

interface CardView {
  card: Phaser.GameObjects.Rectangle;
  name: Phaser.GameObjects.Text;
  role: Phaser.GameObjects.Text;
  cost: Phaser.GameObjects.Text;
  icon: Phaser.GameObjects.Container;
}

export class GameScene extends Phaser.Scene {
  private readonly clock = new FixedStepClock(STEP_SECONDS);
  private simulation!: GameSimulation;
  private coinText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private enemyCountText!: Phaser.GameObjects.Text;
  private wallText!: Phaser.GameObjects.Text;
  private woodText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private shopPanel!: Phaser.GameObjects.Container;
  private shopTitle!: Phaser.GameObjects.Text;
  private prepButton!: Phaser.GameObjects.Rectangle;
  private prepButtonText!: Phaser.GameObjects.Text;
  private countdownText!: Phaser.GameObjects.Text;
  private pauseButton!: Phaser.GameObjects.Rectangle;
  private pausePanel!: Phaser.GameObjects.Container;
  private resultPanel!: Phaser.GameObjects.Container;
  private resultTitle!: Phaser.GameObjects.Text;
  private detailPanel!: Phaser.GameObjects.Container;
  private detailTitle!: Phaser.GameObjects.Text;
  private detailBody!: Phaser.GameObjects.Text;
  private detailUpgradeButton!: Phaser.GameObjects.Rectangle;
  private detailUpgradeText!: Phaser.GameObjects.Text;
  private upgradePanel!: Phaser.GameObjects.Container;
  private upgradeChoiceButtons: Phaser.GameObjects.Rectangle[] = [];
  private upgradeChoiceLabels: Phaser.GameObjects.Text[] = [];
  private slotPanels = new Map<string, Phaser.GameObjects.Rectangle>();
  private slotLabels = new Map<string, Phaser.GameObjects.Text>();
  private towerVisuals = new Map<string, Phaser.GameObjects.Container>();
  private cardViews = new Map<string, CardView>();
  private enemyVisuals = new Map<string, Phaser.GameObjects.Container>();
  private enemyHealthBars = new Map<string, EnemyHealthBars>();
  private slotPositions = new Map<string, { x: number; y: number }>();
  private selectedTowerId: string | null = "machine_gun";
  private selectedBuildingSlotId: string | null = null;
  private lastRenderedPhase: GamePhase | null = null;

  public constructor() {
    super("game");
  }

  public create(): void {
    this.simulation = new GameSimulation(starterCatalog, this.getDebugSeed());
    this.cameras.main.setBackgroundColor("#17251d");
    this.createBackground();
    this.createBattlefield();
    this.createHud();
    this.createCampGrid();
    this.createResourceRail();
    this.createCardHand();
    this.createShopPanel();
    this.createDetailPanel();
    this.createUpgradePanel();
    this.createPausePanel();
    this.createResultPanel();
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.handleHidden, this);
    this.renderState();
  }

  public update(_time: number, deltaMilliseconds: number): void {
    this.clock.advance(deltaMilliseconds / 1000, (stepSeconds) => {
      this.simulation.tick(stepSeconds);
    });
    this.renderState();
  }

  private createBackground(): void {
    const background = this.add.graphics().setDepth(0);
    background.fillStyle(PALETTE.night, 1);
    background.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    background.fillStyle(PALETTE.enemyZone, 1);
    background.fillRect(ENEMY_ZONE.x, ENEMY_ZONE.y, ENEMY_ZONE.width, ENEMY_ZONE.height);
    background.fillStyle(PALETTE.road, 1);
    background.fillRect(292, 0, 136, 724);
    background.fillStyle(PALETTE.roadLight, 1);
    background.fillRect(310, 0, 100, 724);
    background.fillStyle(PALETTE.vegetation, 1);
    background.fillRect(24, 90, 42, 170);
    background.fillRect(654, 170, 42, 190);
    background.fillRect(24, 440, 54, 180);
    background.fillRect(638, 510, 58, 160);
    background.fillStyle(PALETTE.vegetationLight, 1);
    background.fillRect(38, 120, 18, 80);
    background.fillRect(666, 210, 16, 100);
    background.fillRect(42, 480, 20, 96);
    background.fillRect(652, 550, 20, 80);
    background.lineStyle(3, PALETTE.roadLight, 0.45);
    for (let y = 70; y < 700; y += 92) {
      background.lineBetween(300, y, 420, y);
    }
    background.lineStyle(2, PALETTE.text, 0.18);
    background.lineBetween(24, 180, 696, 180);
    background.lineBetween(24, 450, 696, 450);
    background.fillStyle(PALETTE.board, 1);
    background.fillRect(GRID_ZONE.x, GRID_ZONE.y, GRID_ZONE.width, GRID_ZONE.height);
    background.lineStyle(3, PALETTE.ink, 0.6);
    background.strokeRect(GRID_ZONE.x, GRID_ZONE.y, GRID_ZONE.width, GRID_ZONE.height);
    background.fillStyle(PALETTE.wall, 1);
    background.fillRect(WALL_ZONE.x, WALL_ZONE.y + 12, WALL_ZONE.width, 48);
    background.lineStyle(4, PALETTE.wallLight, 1);
    background.strokeRect(WALL_ZONE.x, WALL_ZONE.y + 12, WALL_ZONE.width, 48);
    background.fillStyle(PALETTE.wallLight, 1);
    for (let x = 40; x < 690; x += 52) {
      background.fillRect(x, WALL_ZONE.y + 19, 30, 8);
      background.fillRect(x + 18, WALL_ZONE.y + 45, 30, 8);
    }
    background.fillStyle(PALETTE.wall, 1);
    background.fillRect(RESOURCE_RAIL.x, RESOURCE_RAIL.y, RESOURCE_RAIL.width, RESOURCE_RAIL.height);
    background.lineStyle(2, PALETTE.wallLight, 1);
    background.strokeRect(RESOURCE_RAIL.x, RESOURCE_RAIL.y, RESOURCE_RAIL.width, RESOURCE_RAIL.height);
    background.fillStyle(PALETTE.wall, 1);
    background.fillRect(24, 1138, 672, 142);
    background.lineStyle(3, PALETTE.wallLight, 1);
    background.lineBetween(24, 1138, 696, 1138);
  }

  private createBattlefield(): void {
    this.add.text(38, 82, "敌潮入口", this.textStyle(20, "#fff3d2")).setDepth(4);
    this.add.text(38, 654, "推进方向  ↓", this.textStyle(18, "#d8c59b")).setDepth(4);
    this.countdownText = this.add.text(360, 370, "", {
      ...this.textStyle(116, "#fff3d2"),
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5).setDepth(80);
  }

  private createHud(): void {
    const coinIcon = this.add.graphics().setDepth(50);
    coinIcon.fillStyle(PALETTE.gold, 1);
    coinIcon.fillCircle(42, 38, 15);
    coinIcon.lineStyle(3, PALETTE.ink, 1);
    coinIcon.strokeCircle(42, 38, 15);
    this.add.text(37, 26, "¢", this.textStyle(20, "#1b241d")).setDepth(51);
    this.coinText = this.add.text(66, 26, "", this.textStyle(22, "#fff3d2")).setDepth(50);
    this.waveText = this.add.text(260, 22, "", { ...this.textStyle(22, "#fff3d2"), align: "center" }).setOrigin(0.5, 0).setDepth(50);
    this.enemyCountText = this.add.text(260, 52, "", { ...this.textStyle(16, "#d8c59b"), align: "center" }).setOrigin(0.5, 0).setDepth(50);
    this.pauseButton = this.add.rectangle(666, 38, 56, 56, PALETTE.wall, 0.95).setDepth(60);
    this.pauseButton.setStrokeStyle(3, PALETTE.text, 1);
    this.pauseButton.setInteractive({ useHandCursor: true });
    this.pauseButton.on("pointerdown", () => this.togglePause());
    this.add.text(666, 38, "Ⅱ", { ...this.textStyle(28, "#fff3d2"), align: "center" }).setOrigin(0.5).setDepth(61);
  }

  private createCampGrid(): void {
    for (const layout of CAMP_SLOT_LAYOUTS) {
      const centerX = layout.x + layout.width / 2;
      const centerY = layout.y + layout.height / 2;
      const slot = this.add.rectangle(centerX, centerY, layout.width, layout.height, PALETTE.slot, 1).setDepth(20);
      slot.setStrokeStyle(3, PALETTE.ink, 0.8);
      slot.setInteractive({ useHandCursor: true });
      slot.on("pointerdown", () => this.handleSlotClick(layout.id));
      this.slotPanels.set(layout.id, slot);
      this.slotLabels.set(layout.id, this.add.text(centerX, centerY + 25, "", { ...this.textStyle(15, "#1b241d"), align: "center" }).setOrigin(0.5).setDepth(24));
      this.slotPositions.set(layout.id, { x: centerX, y: centerY - 8 });
    }
  }

  private createResourceRail(): void {
    const woodIcon = this.add.graphics().setDepth(50);
    woodIcon.fillStyle(PALETTE.wood, 1);
    woodIcon.fillRect(40, 1104, 24, 18);
    woodIcon.lineStyle(3, PALETTE.ink, 1);
    woodIcon.strokeRect(40, 1104, 24, 18);
    woodIcon.lineBetween(46, 1104, 52, 1122);
    woodIcon.lineBetween(54, 1104, 60, 1122);
    this.woodText = this.add.text(76, 1099, "", this.textStyle(22, "#fff3d2")).setDepth(50);
    this.statusText = this.add.text(360, 1114, "", { ...this.textStyle(15, "#d8c59b"), align: "center" }).setOrigin(0.5).setDepth(50);
    this.wallText = this.add.text(360, 736, "", { ...this.textStyle(18, "#fff3d2"), align: "center" }).setOrigin(0.5).setDepth(50);
  }

  private createCardHand(): void {
    starterCatalog.towers.forEach((tower, index) => {
      const layout = CARD_LAYOUTS[index]!;
      const card = this.add.rectangle(layout.x + layout.width / 2, layout.y + layout.height / 2, layout.width, layout.height, PALETTE.wall, 1).setDepth(30);
      card.setStrokeStyle(3, PALETTE.secondary, 1);
      card.setInteractive({ useHandCursor: true });
      card.on("pointerdown", () => this.handleCardClick(tower.id));
      const icon = this.createTowerIcon(layout.x + 42, layout.y + 48, tower.id, 0.72, 34);
      const name = this.add.text(layout.x + 78, layout.y + 22, tower.displayName, { ...this.textStyle(18, "#fff3d2"), fontStyle: "bold" }).setDepth(35);
      const role = this.add.text(layout.x + 78, layout.y + 50, tower.role, this.textStyle(13, "#d8c59b")).setDepth(35);
      const cost = this.add.text(layout.x + 18, layout.y + 101, "木材 " + tower.buildCost, this.textStyle(16, "#f6c453")).setDepth(35);
      this.cardViews.set(tower.id, { card, name, role, cost, icon });
    });
  }

  private createShopPanel(): void {
    this.shopPanel = this.add.container(0, 0).setDepth(70);
    const panel = this.add.rectangle(360, 244, 608, 254, PALETTE.ink, 0.94);
    panel.setStrokeStyle(4, PALETTE.wallLight, 1);
    panel.setInteractive();
    this.shopPanel.add(panel);
    this.shopTitle = this.add.text(360, 176, "", { ...this.textStyle(28, "#fff3d2"), align: "center", fontStyle: "bold" }).setOrigin(0.5);
    this.shopPanel.add(this.shopTitle);
    this.shopPanel.add(this.add.text(360, 218, "建塔、升级，确认后进入战场", { ...this.textStyle(17, "#d8c59b"), align: "center" }).setOrigin(0.5));
    this.prepButton = this.add.rectangle(360, 315, 240, 62, PALETTE.road, 1);
    this.prepButton.setStrokeStyle(3, PALETTE.text, 1);
    this.prepButton.setInteractive({ useHandCursor: true });
    this.prepButton.on("pointerdown", () => this.handleCompletePrep());
    this.prepButtonText = this.add.text(360, 315, "完成整备", { ...this.textStyle(21, "#1b241d"), align: "center", fontStyle: "bold" }).setOrigin(0.5);
    this.shopPanel.add(this.prepButton);
    this.shopPanel.add(this.prepButtonText);
  }

  private createDetailPanel(): void {
    this.detailPanel = this.add.container(0, 0).setDepth(75);
    const panel = this.add.rectangle(360, 540, 530, 130, PALETTE.ink, 0.96);
    panel.setStrokeStyle(3, PALETTE.gold, 1);
    panel.setInteractive();
    this.detailPanel.add(panel);
    this.detailTitle = this.add.text(110, 495, "", { ...this.textStyle(21, "#fff3d2"), fontStyle: "bold" });
    this.detailBody = this.add.text(110, 530, "", this.textStyle(15, "#d8c59b"));
    this.detailUpgradeButton = this.add.rectangle(570, 550, 130, 54, PALETTE.road, 1);
    this.detailUpgradeButton.setStrokeStyle(2, PALETTE.text, 1);
    this.detailUpgradeButton.setInteractive({ useHandCursor: true });
    this.detailUpgradeButton.on("pointerdown", () => this.handleUpgradeClick());
    this.detailUpgradeText = this.add.text(570, 550, "升级", { ...this.textStyle(18, "#1b241d"), align: "center" }).setOrigin(0.5);
    this.detailPanel.add([this.detailTitle, this.detailBody, this.detailUpgradeButton, this.detailUpgradeText]);
  }

  private createUpgradePanel(): void {
    this.upgradePanel = this.add.container(0, 0).setDepth(100);
    const backdrop = this.add.rectangle(360, 640, 720, 1280, PALETTE.ink, 0.78);
    backdrop.setInteractive();
    this.upgradePanel.add(backdrop);
    const panel = this.add.rectangle(360, 370, 610, 440, PALETTE.wall, 1);
    panel.setStrokeStyle(4, PALETTE.gold, 1);
    this.upgradePanel.add(panel);
    this.upgradePanel.add(this.add.text(360, 210, "选择一项强化", { ...this.textStyle(28, "#fff3d2"), align: "center", fontStyle: "bold" }).setOrigin(0.5));
    this.upgradePanel.add(this.add.text(360, 250, "强化后继续整备下一波", { ...this.textStyle(16, "#d8c59b"), align: "center" }).setOrigin(0.5));
    [330, 445, 560].forEach((y, index) => {
      const button = this.add.rectangle(360, y, 520, 88, PALETTE.ink, 1);
      button.setStrokeStyle(2, PALETTE.secondary, 1);
      button.setInteractive({ useHandCursor: true });
      button.on("pointerdown", () => this.chooseUpgrade(index));
      const label = this.add.text(360, y, "", { ...this.textStyle(16, "#fff3d2"), align: "center", wordWrap: { width: 480 } }).setOrigin(0.5);
      this.upgradePanel.add(button);
      this.upgradePanel.add(label);
      this.upgradeChoiceButtons.push(button);
      this.upgradeChoiceLabels.push(label);
    });
  }

  private createPausePanel(): void {
    this.pausePanel = this.add.container(0, 0).setDepth(110);
    const backdrop = this.add.rectangle(360, 640, 720, 1280, PALETTE.ink, 0.72);
    backdrop.setInteractive();
    this.pausePanel.add(backdrop);
    const panel = this.add.rectangle(360, 500, 420, 270, PALETTE.wall, 1);
    panel.setStrokeStyle(4, PALETTE.secondary, 1);
    this.pausePanel.add(panel);
    this.pausePanel.add(this.add.text(360, 420, "已暂停", { ...this.textStyle(30, "#fff3d2"), align: "center", fontStyle: "bold" }).setOrigin(0.5));
    const resumeButton = this.add.rectangle(360, 500, 280, 58, PALETTE.road, 1);
    resumeButton.setInteractive({ useHandCursor: true });
    resumeButton.on("pointerdown", () => this.togglePause());
    this.pausePanel.add(resumeButton);
    this.pausePanel.add(this.add.text(360, 500, "继续", { ...this.textStyle(20, "#1b241d"), align: "center" }).setOrigin(0.5));
    const restartButton = this.add.rectangle(360, 590, 280, 58, PALETTE.danger, 1);
    restartButton.setInteractive({ useHandCursor: true });
    restartButton.on("pointerdown", () => this.restartGame());
    this.pausePanel.add(restartButton);
    this.pausePanel.add(this.add.text(360, 590, "重新开始", { ...this.textStyle(20, "#fff3d2"), align: "center" }).setOrigin(0.5));
  }

  private createResultPanel(): void {
    this.resultPanel = this.add.container(0, 0).setDepth(110);
    const backdrop = this.add.rectangle(360, 640, 720, 1280, PALETTE.ink, 0.68);
    backdrop.setInteractive();
    this.resultPanel.add(backdrop);
    const panel = this.add.rectangle(360, 500, 460, 250, PALETTE.wall, 1);
    panel.setStrokeStyle(4, PALETTE.gold, 1);
    this.resultPanel.add(panel);
    this.resultTitle = this.add.text(360, 445, "", { ...this.textStyle(30, "#fff3d2"), align: "center", fontStyle: "bold" }).setOrigin(0.5);
    this.resultPanel.add(this.resultTitle);
    const restartButton = this.add.rectangle(360, 610, 260, 58, PALETTE.road, 1);
    restartButton.setInteractive({ useHandCursor: true });
    restartButton.on("pointerdown", () => this.restartGame());
    this.resultPanel.add(restartButton);
    this.resultPanel.add(this.add.text(360, 610, "再来一局", { ...this.textStyle(20, "#1b241d"), align: "center" }).setOrigin(0.5));
  }

  private handleCardClick(towerId: string): void {
    const state = this.simulation.getState();
    if (this.isModalOpen()) {
      return;
    }
    if (state.phase === "COUNTDOWN") {
      this.showStatus("倒计时中，暂不能建造或升级");
      return;
    }
    if (state.phase !== "SHOP" && state.phase !== "COMBAT") {
      this.showStatus("当前阶段不能操作塔卡");
      return;
    }
    const tower = starterCatalog.towers.find((candidate) => candidate.id === towerId);
    if (!tower) {
      return;
    }
    this.selectedTowerId = towerId;
    this.selectedBuildingSlotId = null;
    if (state.wood < tower.buildCost) {
      this.showStatus("木材不足，还差 " + (tower.buildCost - state.wood).toFixed(0));
    } else {
      this.showStatus("已选择" + tower.displayName + "，点击空营地格建造");
    }
  }

  private handleSlotClick(slotId: string): void {
    const state = this.simulation.getState();
    if (this.isModalOpen()) {
      return;
    }
    const existingBuilding = state.buildings.find((building) => building.slotId === slotId);
    if (existingBuilding) {
      this.selectedBuildingSlotId = slotId;
      this.selectedTowerId = null;
      const tower = starterCatalog.towers.find((candidate) => candidate.id === existingBuilding.definitionId);
      this.showStatus("已查看" + (tower?.displayName ?? "防御塔") + "，请点击明确的升级按钮");
      return;
    }
    if (state.phase === "COUNTDOWN") {
      this.showStatus("倒计时中，暂不能建造或升级");
      return;
    }
    if (state.phase !== "SHOP" && state.phase !== "COMBAT") {
      this.showStatus("当前阶段不能建造防御塔");
      return;
    }
    if (!this.selectedTowerId) {
      this.showStatus("先选择一张塔卡");
      return;
    }
    const result = this.simulation.dispatch({ type: "build_tower", definitionId: this.selectedTowerId, slotId });
    const tower = starterCatalog.towers.find((candidate) => candidate.id === this.selectedTowerId);
    this.showStatus(result.accepted ? (tower?.displayName ?? "防御塔") + "已建造" : result.reason ?? "无法建造");
    if (result.accepted) {
      this.selectedTowerId = null;
    }
  }

  private handleCompletePrep(): void {
    const result = this.simulation.dispatch({ type: "complete_prep" });
    this.showStatus(result.accepted ? "整备完成，倒计时开始" : result.reason ?? "无法完成整备");
    if (result.accepted) {
      this.selectedTowerId = null;
      this.selectedBuildingSlotId = null;
    }
  }

  private handleUpgradeClick(): void {
    if (!this.selectedBuildingSlotId) {
      return;
    }
    const result = this.simulation.dispatch({ type: "upgrade_tower", slotId: this.selectedBuildingSlotId });
    this.showStatus(result.accepted ? "防御塔升级完成" : result.reason ?? "无法升级");
  }

  private chooseUpgrade(index: number): void {
    const upgradeId = this.simulation.getState().pendingUpgradeChoices[index];
    if (!upgradeId) {
      return;
    }
    const result = this.simulation.dispatch({ type: "choose_upgrade", upgradeId });
    this.showStatus(result.accepted ? "强化已生效" : result.reason ?? "无法选择强化");
  }

  private togglePause(): void {
    const state = this.simulation.getState();
    const result = this.simulation.dispatch({ type: state.phase === "PAUSED" ? "resume" : "pause" });
    if (!result.accepted) {
      this.showStatus(result.reason ?? "当前不能暂停");
    }
  }

  private restartGame(): void {
    this.simulation.dispatch({ type: "restart" });
    this.clock.reset();
    this.selectedTowerId = "machine_gun";
    this.selectedBuildingSlotId = null;
    this.showStatus("新的营地已准备");
  }

  private renderState(): void {
    const state = this.simulation.getState();
    const previousPhase = this.lastRenderedPhase;
    this.coinText.setText("金币 " + this.formatNumber(state.gold));
    this.waveText.setText((state.wave === 0 ? "下一波" : "第 " + state.wave + " 波") + " / " + state.maxWave);
    this.enemyCountText.setText("尸潮 " + state.enemies.length + " · 已歼 " + state.defeatedEnemies);
    this.woodText.setText("木材 " + this.formatNumber(state.wood));
    this.wallText.setText("城墙  " + this.formatNumber(state.wallHp) + " / " + this.formatNumber(state.wallMaxHp));
    this.countdownText.setVisible(state.phase === "COUNTDOWN");
    this.countdownText.setText(state.phase === "COUNTDOWN" ? String(Math.max(1, Math.ceil(state.countdownRemainingSeconds))) : "");
    this.shopPanel.setVisible(state.phase === "SHOP" && state.pendingUpgradeChoices.length === 0);
    this.upgradePanel.setVisible(state.phase === "SHOP" && state.pendingUpgradeChoices.length > 0);
    this.pausePanel.setVisible(state.phase === "PAUSED");
    this.resultPanel.setVisible(state.phase === "VICTORY" || state.phase === "DEFEAT");
    this.detailPanel.setVisible(Boolean(this.selectedBuildingSlotId) && !this.isModalOpen());
    this.prepButton.setVisible(state.phase === "SHOP" && state.pendingUpgradeChoices.length === 0);
    this.prepButtonText.setVisible(state.phase === "SHOP" && state.pendingUpgradeChoices.length === 0);
    this.shopTitle.setText(state.wave === 0 ? "营地整备" : "波间整备");
    this.renderShopButton(state);
    this.renderSlots(state);
    this.renderCards(state);
    this.renderDetail(state);
    this.renderUpgradeChoices(state);
    this.renderResult(state);
    this.syncCombatEvents();
    this.syncEnemyVisuals(state.enemies);
    if (previousPhase !== state.phase && state.phase === "SHOP" && state.wave > 0 && state.pendingUpgradeChoices.length === 0) {
      this.showStatus("尸潮已清除，开始下一轮整备");
    }
    this.lastRenderedPhase = state.phase;
  }

  private renderShopButton(state: Readonly<ReturnType<GameSimulation["getState"]>>): void {
    const enabled = state.phase === "SHOP" && state.pendingUpgradeChoices.length === 0 && state.buildings.length > 0;
    this.prepButton.setFillStyle(enabled ? PALETTE.road : 0x6b5b3d, 1);
    this.prepButtonText.setColor(enabled ? "#1b241d" : "#d8c59b");
  }

  private renderSlots(state: Readonly<ReturnType<GameSimulation["getState"]>>): void {
    const buildingBySlot = new Map(state.buildings.map((building) => [building.slotId, building]));
    const selectedTower = this.selectedTowerId ? starterCatalog.towers.find((tower) => tower.id === this.selectedTowerId) : undefined;
    for (const layout of CAMP_SLOT_LAYOUTS) {
      const slot = this.slotPanels.get(layout.id);
      const label = this.slotLabels.get(layout.id);
      if (!slot || !label) {
        continue;
      }
      const building = buildingBySlot.get(layout.id);
      const legal = !building && Boolean(selectedTower) && (state.phase === "SHOP" || state.phase === "COMBAT") && state.wood >= (selectedTower?.buildCost ?? 0);
      const target = this.selectedBuildingSlotId === layout.id;
      slot.setFillStyle(building ? 0x5a7130 : legal ? 0xf6c453 : 0xb9a95f, 1);
      slot.setStrokeStyle(3, target ? PALETTE.text : legal ? this.towerColor(selectedTower?.id ?? "machine_gun") : PALETTE.ink, 1);
      if (building) {
        const tower = starterCatalog.towers.find((candidate) => candidate.id === building.definitionId);
        label.setText("R" + (layout.row + 1) + " C" + (layout.column + 1) + "\nLv." + building.level);
        label.setColor("#fff3d2");
        let visual = this.towerVisuals.get(layout.id);
        if (!visual && tower) {
          visual = this.createTowerIcon(layout.x + 64, layout.y + 40, tower.id, 0.72, 25);
          this.towerVisuals.set(layout.id, visual);
        }
        visual?.setVisible(true);
      } else {
        label.setText("R" + (layout.row + 1) + " C" + (layout.column + 1) + "\n" + (legal ? "可建造" : "空位"));
        label.setColor("#1b241d");
        this.towerVisuals.get(layout.id)?.setVisible(false);
      }
    }
  }

  private renderCards(state: Readonly<ReturnType<GameSimulation["getState"]>>): void {
    for (const tower of starterCatalog.towers) {
      const view = this.cardViews.get(tower.id);
      if (!view) {
        continue;
      }
      const selected = this.selectedTowerId === tower.id;
      const affordable = state.wood >= tower.buildCost;
      view.card.setFillStyle(selected ? 0x6b4b21 : 0x3c2c20, 1);
      view.card.setStrokeStyle(selected ? 5 : 3, selected ? this.towerColor(tower.id) : PALETTE.secondary, 1);
      const cardIndex = starterCatalog.towers.findIndex((candidate) => candidate.id === tower.id);
      const cardLayout = CARD_LAYOUTS[cardIndex]!;
      const selectedOffset = selected ? -5 : 0;
      view.card.setPosition(cardLayout.x + cardLayout.width / 2, cardLayout.y + cardLayout.height / 2 + selectedOffset);
      view.name.setY(cardLayout.y + 22 + selectedOffset);
      view.role.setY(cardLayout.y + 50 + selectedOffset);
      view.cost.setY(cardLayout.y + 101 + selectedOffset);
      view.icon.setY(cardLayout.y + 48 + selectedOffset);
      view.name.setColor(affordable ? "#fff3d2" : "#9b8d75");
      view.role.setColor(affordable ? "#d8c59b" : "#8d806c");
      view.cost.setColor(affordable ? "#f6c453" : "#ef5a43");
      view.icon.setAlpha(affordable ? 1 : 0.45);
    }
  }

  private renderDetail(state: Readonly<ReturnType<GameSimulation["getState"]>>): void {
    if (!this.selectedBuildingSlotId) {
      return;
    }
    const building = state.buildings.find((candidate) => candidate.slotId === this.selectedBuildingSlotId);
    if (!building) {
      this.selectedBuildingSlotId = null;
      return;
    }
    const tower = starterCatalog.towers.find((candidate) => candidate.id === building.definitionId);
    const upgradeCost = tower ? Math.round(tower.buildCost * (1 + building.level * 0.5)) : 0;
    this.detailTitle.setText((tower?.displayName ?? "防御塔") + " · Lv." + building.level);
    this.detailBody.setText((tower?.role ?? "防御") + "    下一次升级 " + upgradeCost + " 木材");
    this.detailUpgradeText.setText(building.level >= 3 ? "已满级" : "升级");
    this.detailUpgradeButton.setFillStyle(building.level >= 3 ? 0x6b5b3d : PALETTE.road, 1);
  }

  private renderUpgradeChoices(state: Readonly<ReturnType<GameSimulation["getState"]>>): void {
    this.upgradeChoiceButtons.forEach((button, index) => {
      const upgrade = starterCatalog.upgrades.find((candidate) => candidate.id === state.pendingUpgradeChoices[index]);
      button.setVisible(Boolean(upgrade));
      this.upgradeChoiceLabels[index]?.setVisible(Boolean(upgrade));
      this.upgradeChoiceLabels[index]?.setText(upgrade ? upgrade.title + "\n" + upgrade.description : "");
    });
  }

  private renderResult(state: Readonly<ReturnType<GameSimulation["getState"]>>): void {
    this.resultTitle.setText(state.phase === "VICTORY" ? "营地守住了" : "城墙失守");
  }

  private syncCombatEvents(): void {
    for (const event of this.simulation.drainEvents()) {
      if (event.type === "tower_attack") {
        this.showTowerAttack(event);
      } else if (event.type === "enemy_hit") {
        this.showEnemyHit(event);
      } else {
        this.showEnemyDefeated(event);
      }
    }
  }

  private showTowerAttack(event: Extract<GameEvent, { type: "tower_attack" }>): void {
    const building = this.simulation.getState().buildings.find((candidate) => candidate.id === event.buildingId);
    const start = building ? this.slotPositions.get(building.slotId) : undefined;
    if (!start) {
      return;
    }
    const end = this.enemyPosition(event.targetPosition, event.targetId);
    const shotStart = { x: start.x, y: WALL_ZONE.y - 8 };
    const graphics = this.add.graphics().setDepth(40);
    const color = this.towerColor(event.towerDefinitionId);
    graphics.lineStyle(event.towerDefinitionId === "machine_gun" ? 4 : 6, color, 0.95);
    if (event.towerDefinitionId === "electric") {
      graphics.beginPath();
      graphics.moveTo(shotStart.x, shotStart.y);
      graphics.lineTo(start.x + 40, start.y - 18);
      graphics.lineTo(end.x - 34, end.y + 20);
      graphics.lineTo(end.x, end.y);
      graphics.strokePath();
    } else if (event.towerDefinitionId === "frost") {
      graphics.lineBetween(shotStart.x, shotStart.y, end.x, end.y - 12);
      graphics.lineBetween(shotStart.x, shotStart.y, end.x - 24, end.y + 8);
      graphics.lineBetween(shotStart.x, shotStart.y, end.x + 24, end.y + 8);
    } else {
      graphics.lineBetween(shotStart.x, shotStart.y, end.x, end.y);
      if (event.towerDefinitionId === "cannon") {
        graphics.strokeCircle(end.x, end.y, 22);
      }
    }
    this.tweens.add({ targets: graphics, alpha: 0, duration: event.towerDefinitionId === "machine_gun" ? 360 : 320, onComplete: () => graphics.destroy() });
  }

  private showEnemyHit(event: Extract<GameEvent, { type: "enemy_hit" }>): void {
    const point = this.enemyPosition(event.position, event.enemyId);
    const flash = this.add.graphics().setDepth(45);
    flash.lineStyle(4, PALETTE.text, 1);
    flash.lineBetween(point.x - 16, point.y - 16, point.x + 16, point.y + 16);
    flash.lineBetween(point.x + 16, point.y - 16, point.x - 16, point.y + 16);
    const damageText = this.add.text(point.x, point.y - 34, "-" + this.formatNumber(event.damage), this.textStyle(18, "#fff3d2")).setOrigin(0.5).setDepth(46);
    this.tweens.add({ targets: [flash, damageText], y: "-=24", alpha: 0, duration: 520, onComplete: () => { flash.destroy(); damageText.destroy(); } });
  }

  private showEnemyDefeated(event: Extract<GameEvent, { type: "enemy_defeated" }>): void {
    const point = this.enemyPosition(event.position, event.enemyId);
    const burst = this.add.graphics().setDepth(45);
    burst.lineStyle(5, PALETTE.danger, 1);
    burst.strokeRect(point.x - 18, point.y - 18, 36, 36);
    burst.lineBetween(point.x - 28, point.y, point.x + 28, point.y);
    burst.lineBetween(point.x, point.y - 28, point.x, point.y + 28);
    this.tweens.add({ targets: burst, scale: 1.5, alpha: 0, duration: 260, onComplete: () => burst.destroy() });
  }

  private syncEnemyVisuals(enemies: ReadonlyArray<{ id: string; definitionId: string; position: number; hp: number; maxHp: number }>): void {
    const activeIds = new Set(enemies.map((enemy) => enemy.id));
    for (const [id, visual] of this.enemyVisuals) {
      if (!activeIds.has(id)) {
        visual.destroy();
        this.enemyVisuals.delete(id);
        const bars = this.enemyHealthBars.get(id);
        bars?.track.destroy();
        bars?.fill.destroy();
        this.enemyHealthBars.delete(id);
      }
    }
    for (const enemy of enemies) {
      let visual = this.enemyVisuals.get(enemy.id);
      if (!visual) {
        visual = this.createEnemyVisual(enemy.definitionId);
        this.enemyVisuals.set(enemy.id, visual);
        const track = this.add.rectangle(360, 90, 48, 6, PALETTE.ink, 0.95).setOrigin(0.5).setDepth(14);
        const fill = this.add.rectangle(336, 90, 48, 6, 0x8fd14f, 1).setOrigin(0, 0.5).setDepth(15);
        this.enemyHealthBars.set(enemy.id, { track, fill });
      }
      const point = this.enemyPosition(enemy.position, enemy.id);
      visual.setPosition(point.x, point.y);
      const definition = starterCatalog.enemies.find((candidate) => candidate.id === enemy.definitionId);
      visual.setScale(definition?.tier === "boss" ? 1.35 : definition?.tier === "elite" ? 1.08 : 0.86);
      const bars = this.enemyHealthBars.get(enemy.id);
      bars?.track.setPosition(point.x, point.y - 32);
      bars?.fill.setPosition(point.x - 24, point.y - 32);
      bars?.fill.setDisplaySize(Math.max(2, 48 * Math.max(0, enemy.hp / enemy.maxHp)), 6);
    }
  }

  private createEnemyVisual(enemyId: string): Phaser.GameObjects.Container {
    const container = this.add.container(360, 120).setDepth(12);
    const definition = starterCatalog.enemies.find((candidate) => candidate.id === enemyId);
    const color = definition?.tier === "boss" ? 0x7c3f58 : definition?.tier === "elite" ? PALETTE.infected : PALETTE.zombie;
    const body = this.add.graphics();
    body.fillStyle(color, 1);
    body.fillRect(-18, -4, 36, 34);
    body.fillCircle(0, -22, 22);
    body.lineStyle(4, PALETTE.ink, 1);
    body.strokeRect(-18, -4, 36, 34);
    body.strokeCircle(0, -22, 22);
    body.lineStyle(5, color, 1);
    body.lineBetween(-16, 4, -34, 18);
    body.lineBetween(16, 4, 34, 18);
    body.fillStyle(PALETTE.text, 1);
    body.fillRect(-10, -26, 6, 7);
    body.fillRect(5, -26, 6, 7);
    body.fillStyle(PALETTE.ink, 1);
    body.fillRect(-8, -24, 3, 4);
    body.fillRect(7, -24, 3, 4);
    container.add(body);
    return container;
  }

  private createTowerIcon(x: number, y: number, towerId: string, scale: number, depth: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y).setDepth(depth).setScale(scale);
    const graphics = this.add.graphics();
    const color = this.towerColor(towerId);
    graphics.fillStyle(color, 1);
    graphics.lineStyle(4, PALETTE.ink, 1);
    if (towerId === "machine_gun") {
      graphics.fillRect(-26, -8, 40, 20);
      graphics.strokeRect(-26, -8, 40, 20);
      graphics.fillRect(-4, -24, 16, 16);
      graphics.strokeRect(-4, -24, 16, 16);
      graphics.fillRect(10, -2, 32, 7);
    } else if (towerId === "cannon") {
      graphics.fillRect(-22, -5, 44, 22);
      graphics.strokeRect(-22, -5, 44, 22);
      graphics.fillRect(0, -28, 12, 25);
      graphics.strokeRect(0, -28, 12, 25);
      graphics.fillCircle(-12, 20, 8);
      graphics.fillCircle(14, 20, 8);
      graphics.lineStyle(3, PALETTE.ink, 1);
      graphics.strokeCircle(-12, 20, 8);
      graphics.strokeCircle(14, 20, 8);
    } else if (towerId === "frost") {
      graphics.fillTriangle(0, -32, -24, 18, 24, 18);
      graphics.lineStyle(4, PALETTE.ink, 1);
      graphics.strokeTriangle(0, -32, -24, 18, 24, 18);
      graphics.lineBetween(0, -22, 0, 10);
      graphics.lineBetween(-12, 2, 12, 2);
    } else {
      graphics.fillRect(-22, -5, 44, 22);
      graphics.strokeRect(-22, -5, 44, 22);
      graphics.lineStyle(5, PALETTE.text, 1);
      graphics.beginPath();
      graphics.moveTo(-10, -30);
      graphics.lineTo(4, -12);
      graphics.lineTo(-4, 2);
      graphics.lineTo(14, 22);
      graphics.strokePath();
    }
    container.add(graphics);
    return container;
  }

  private enemyPosition(position: number, id: string): { x: number; y: number } {
    const code = id.charCodeAt(id.length - 1) || 0;
    return { x: 360 + (code % 5 - 2) * 18, y: 120 + position * 550 };
  }

  private towerColor(towerId: string): number {
    const tower = starterCatalog.towers.find((candidate) => candidate.id === towerId);
    if (tower) {
      return Number.parseInt(tower.accentColor.slice(1), 16);
    }
    return PALETTE.gold;
  }

  private isModalOpen(): boolean {
    const phase = this.simulation.getState().phase;
    return phase === "PAUSED" || phase === "VICTORY" || phase === "DEFEAT" || this.simulation.getState().pendingUpgradeChoices.length > 0;
  }

  private showStatus(message: string): void {
    this.statusText.setText(message);
  }

  private formatNumber(value: number): string {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }

  private handleHidden(): void {
    const state = this.simulation.getState();
    if (state.phase === "SHOP" || state.phase === "COUNTDOWN" || state.phase === "COMBAT") {
      this.simulation.dispatch({ type: "pause" });
      this.showStatus("页面隐藏，游戏已暂停");
    }
  }

  private textStyle(fontSize: number, color: string): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      color,
      fontFamily: "Noto Sans SC, Microsoft YaHei, system-ui, sans-serif",
      fontSize: fontSize + "px",
    };
  }

  private getDebugSeed(): number {
    const rawSeed = new URLSearchParams(window.location.search).get("seed");
    const parsedSeed = rawSeed === null ? Number.NaN : Number(rawSeed);
    return Number.isFinite(parsedSeed) ? parsedSeed : 0x5ec0de;
  }
}

import Phaser from "phaser";
import setupCheckUrl from "../assets/setup-check.svg";
import { FixedStepClock } from "../core/clock";
import { starterCatalog } from "../core/content";
import { GameSimulation } from "../core/game";
import type { GameEvent, GamePhase } from "../core/types";

const WIDTH = 720;
const HEIGHT = 1280;
const STEP_SECONDS = 1 / 30;

export class GameScene extends Phaser.Scene {
  private readonly clock = new FixedStepClock(STEP_SECONDS);
  private simulation!: GameSimulation;
  private phaseText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private resourceText!: Phaser.GameObjects.Text;
  private wallText!: Phaser.GameObjects.Text;
  private enemyCountText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private startButton!: Phaser.GameObjects.Rectangle;
  private startButtonText!: Phaser.GameObjects.Text;
  private restartButton!: Phaser.GameObjects.Rectangle;
  private restartButtonText!: Phaser.GameObjects.Text;
  private slotLabels: Phaser.GameObjects.Text[] = [];
  private towerVisuals = new Map<string, Phaser.GameObjects.Rectangle>();
  private paletteButtons = new Map<string, Phaser.GameObjects.Rectangle>();
  private enemyVisuals = new Map<string, Phaser.GameObjects.Arc>();
  private enemyHealthBars = new Map<string, { track: Phaser.GameObjects.Rectangle; fill: Phaser.GameObjects.Rectangle }>();
  private slotPositions = new Map<string, { x: number; y: number }>();
  private selectedTowerId = "machine_gun";
  private upgradePanel!: Phaser.GameObjects.Container;
  private upgradeChoiceButtons: Phaser.GameObjects.Rectangle[] = [];
  private upgradeChoiceLabels: Phaser.GameObjects.Text[] = [];
  private lastRenderedPhase: GamePhase | null = null;

  public constructor() {
    super("game");
  }

  public preload(): void {
    this.load.image("setup-check", setupCheckUrl);
  }

  public create(): void {
    this.simulation = new GameSimulation(starterCatalog, this.getDebugSeed());
    this.cameras.main.setBackgroundColor("#101827");

    this.createBackground();
    this.createHud();
    this.createSetupMarker();
    this.createBattlefield();
    this.createBuildArea();
    this.createControls();
    this.createUpgradePanel();
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
    const graphics = this.add.graphics();
    graphics.fillStyle(0x101827, 1);
    graphics.fillRect(0, 0, WIDTH, HEIGHT);
    graphics.fillStyle(0x172338, 1);
    graphics.fillRect(24, 180, WIDTH - 48, 620);
    graphics.fillStyle(0x263b57, 1);
    graphics.fillRect(WIDTH / 2 - 62, 220, 124, 560);
    graphics.lineStyle(2, 0x475569, 1);
    graphics.strokeRect(WIDTH / 2 - 62, 220, 124, 560);
    graphics.fillStyle(0x0d1421, 1);
    graphics.fillRect(24, 920, WIDTH - 48, 280);
    graphics.lineStyle(4, 0x7f1d1d, 1);
    graphics.lineBetween(24, 820, WIDTH - 24, 820);
    graphics.lineStyle(2, 0x334155, 1);
    graphics.lineBetween(24, 180, WIDTH - 24, 180);
    graphics.lineBetween(24, 920, WIDTH - 24, 920);
  }

  private createHud(): void {
    this.add.text(32, 24, "尸潮营地", {
      color: "#f8fafc",
      fontFamily: "Arial, Microsoft YaHei, sans-serif",
      fontSize: "34px",
      fontStyle: "bold",
    });

    this.phaseText = this.add.text(32, 76, "", this.textStyle(22, "#93c5fd"));
    this.waveText = this.add.text(32, 116, "", this.textStyle(22, "#f8fafc"));
    this.resourceText = this.add.text(380, 76, "", this.textStyle(22, "#fcd34d"));
    this.wallText = this.add.text(380, 116, "", this.textStyle(22, "#fca5a5"));
    this.enemyCountText = this.add.text(32, 152, "", this.textStyle(18, "#cbd5e1"));
  }

  private createSetupMarker(): void {
    this.add.image(474, 48, "setup-check").setDisplaySize(34, 34);
    this.add.text(500, 30, `Phaser ${Phaser.VERSION}`, this.textStyle(16, "#94a3b8"));
    this.add.text(500, 54, "SETUP READY", this.textStyle(14, "#86efac"));
  }

  private createBattlefield(): void {
    this.add.text(32, 204, "尸潮通道", this.textStyle(20, "#94a3b8"));
    this.add.text(32, 744, "固定单通道 · 自动战斗区域", this.textStyle(18, "#64748b"));
    this.add.text(32, 834, "城墙 · 唯一失败目标", this.textStyle(24, "#fecaca"));

    const gate = this.add.rectangle(WIDTH / 2, 640, 92, 170, 0x3b4b63, 1);
    gate.setStrokeStyle(3, 0x94a3b8, 1);
    this.add.text(WIDTH / 2, 565, "尸潮\n↓", {
      ...this.textStyle(26, "#cbd5e1"),
      align: "center",
    }).setOrigin(0.5);
  }

  private createBuildArea(): void {
    this.add.text(32, 944, "有限建筑格", this.textStyle(24, "#cbd5e1"));
    this.add.text(32, 974, "选择塔种后点击格子建造，战斗中也可调整防线", this.textStyle(16, "#94a3b8"));

    const towerXs = [112, 278, 444, 610];
    starterCatalog.towers.forEach((tower, index) => {
      const button = this.add.rectangle(towerXs[index]!, 1012, 142, 42, 0x334155, 1);
      button.setStrokeStyle(2, 0x64748b, 1);
      button.setInteractive();
      button.on("pointerdown", () => {
        this.selectedTowerId = tower.id;
        this.messageText.setText(`已选择${tower.displayName}：${tower.role}`);
      });
      this.paletteButtons.set(tower.id, button);
      this.add.text(towerXs[index]!, 1012, `${tower.displayName} ${tower.buildCost}`, {
        ...this.textStyle(15, "#f8fafc"),
        align: "center",
      }).setOrigin(0.5);
    });

    const slotXs = [80, 220, 360, 500, 640];
    const slotYs = [1090, 1170];
    slotYs.forEach((y, row) => slotXs.forEach((x, column) => {
      const index = row * slotXs.length + column;
      const slot = this.add.rectangle(x, y, 112, 62, 0x26354d, 1);
      slot.setStrokeStyle(3, 0x64748b, 1);
      slot.setInteractive();
      slot.on("pointerdown", () => {
        const slotId = `slot-${index + 1}`;
        const existingBuilding = this.simulation.getState().buildings.find((building) => building.slotId === slotId);
        if (existingBuilding) {
          const result = this.simulation.dispatch({ type: "upgrade_tower", slotId });
          this.messageText.setText(result.accepted ? "防御塔已升级" : result.reason ?? "无法升级");
          return;
        }

        const result = this.simulation.dispatch({
          type: "build_tower",
          definitionId: this.selectedTowerId,
          slotId,
        });
        const tower = starterCatalog.towers.find((candidate) => candidate.id === this.selectedTowerId);
        this.messageText.setText(result.accepted ? `${tower?.displayName ?? "防御塔"}已建造` : result.reason ?? "无法建造");
      });

      const label = this.add.text(x, y, `格子 ${index + 1}`, {
        ...this.textStyle(16, "#cbd5e1"),
        align: "center",
      }).setOrigin(0.5);
      this.slotLabels.push(label);
      this.slotPositions.set(`slot-${index + 1}`, { x, y: y - 16 });

      const towerVisual = this.add.rectangle(x, y - 16, 70, 28, 0xf59e0b, 1);
      towerVisual.setStrokeStyle(2, 0xfef3c7, 1);
      towerVisual.setVisible(false);
      this.towerVisuals.set(`slot-${index + 1}`, towerVisual);
    }));
  }

  private createControls(): void {
    this.startButton = this.add.rectangle(540, 246, 140, 54, 0x2563eb, 1);
    this.startButton.setInteractive();
    this.startButton.on("pointerdown", () => {
      const state = this.simulation.getState();
      if (state.phase === "PAUSED") {
        this.simulation.dispatch({ type: "resume" });
        return;
      }

      this.simulation.dispatch({ type: "start_wave" });
    });
    this.startButtonText = this.add.text(540, 246, "开始第 1 波", {
      ...this.textStyle(20, "#ffffff"),
      align: "center",
    }).setOrigin(0.5);

    const pauseButton = this.add.rectangle(540, 316, 140, 46, 0x475569, 1);
    pauseButton.setInteractive();
    pauseButton.on("pointerdown", () => {
      const state = this.simulation.getState();
      this.simulation.dispatch({ type: state.phase === "PAUSED" ? "resume" : "pause" });
    });
    this.add.text(540, 316, "暂停 / 恢复", {
      ...this.textStyle(18, "#ffffff"),
      align: "center",
    }).setOrigin(0.5);

    this.restartButton = this.add.rectangle(540, 386, 140, 46, 0xb91c1c, 1);
    this.restartButton.setInteractive();
    this.restartButton.on("pointerdown", () => {
      this.simulation.dispatch({ type: "restart" });
      this.clock.reset();
      this.messageText.setText("新的一局已开始");
    });
    this.restartButtonText = this.add.text(540, 386, "重新开始", {
      ...this.textStyle(18, "#ffffff"),
      align: "center",
    }).setOrigin(0.5);

    const repairButton = this.add.rectangle(360, 386, 140, 46, 0x0f766e, 1);
    repairButton.setInteractive();
    repairButton.on("pointerdown", () => {
      const result = this.simulation.dispatch({ type: "repair_wall" });
      this.messageText.setText(result.accepted ? "城墙已维修" : result.reason ?? "无法维修");
    });
    this.add.text(360, 386, "维修城墙 20", {
      ...this.textStyle(17, "#ffffff"),
      align: "center",
    }).setOrigin(0.5);

    this.messageText = this.add.text(32, 880, "先建造一座塔，再开始第 1 波", this.textStyle(20, "#fbbf24"));
  }

  private createUpgradePanel(): void {
    this.upgradePanel = this.add.container(0, 0);
    const panel = this.add.rectangle(WIDTH / 2, 570, 650, 650, 0x0f172a, 0.97);
    panel.setStrokeStyle(4, 0xf59e0b, 1);
    this.upgradePanel.add(panel);
    this.upgradePanel.add(this.add.text(360, 290, "选择一项强化", {
      ...this.textStyle(30, "#fef3c7"),
      align: "center",
    }).setOrigin(0.5));
    this.upgradePanel.add(this.add.text(360, 340, "选择后立即生效，改变后续防守构筑", {
      ...this.textStyle(18, "#cbd5e1"),
      align: "center",
    }).setOrigin(0.5));

    [470, 610, 750].forEach((y, index) => {
      const button = this.add.rectangle(360, y, 550, 100, 0x334155, 1);
      button.setStrokeStyle(2, 0x94a3b8, 1);
      button.setInteractive();
      button.on("pointerdown", () => this.chooseUpgrade(index));
      const label = this.add.text(360, y, "", {
        ...this.textStyle(18, "#f8fafc"),
        align: "center",
        wordWrap: { width: 500 },
      }).setOrigin(0.5);
      this.upgradePanel.add(button);
      this.upgradePanel.add(label);
      this.upgradeChoiceButtons.push(button);
      this.upgradeChoiceLabels.push(label);
    });
    this.upgradePanel.setVisible(false);
  }

  private renderState(): void {
    const state = this.simulation.getState();
    const previousPhase = this.lastRenderedPhase;
    this.phaseText.setText(`阶段：${this.phaseLabel(state.phase)}`);
    this.waveText.setText(`波次：${state.wave} / ${state.maxWave}    剩余：${state.waveTimeRemainingSeconds.toFixed(1)}s`);
    this.resourceText.setText(`木材：${this.formatNumber(state.wood)}    金币：${this.formatNumber(state.gold)}`);
    this.wallText.setText(`城墙：${this.formatNumber(state.wallHp)} / ${this.formatNumber(state.wallMaxHp)}`);
    this.enemyCountText.setText(`战场敌人：${state.enemies.length}    已击杀：${state.defeatedEnemies}    等级：${state.level} (${state.xp}/${state.xpToNextLevel})`);
    this.startButtonText.setText(this.startWaveLabel(state.phase, state.wave));
    this.startButton.setFillStyle(state.phase === "PREPARE" ? 0x2563eb : 0x475569, 1);
    this.restartButton.setVisible(state.phase === "VICTORY" || state.phase === "DEFEAT");
    this.restartButtonText.setVisible(state.phase === "VICTORY" || state.phase === "DEFEAT");

    for (const [towerId, button] of this.paletteButtons) {
      button.setFillStyle(towerId === this.selectedTowerId ? 0x2563eb : 0x334155, 1);
    }

    const buildingBySlot = new Map(state.buildings.map((building) => [building.slotId, building]));
    this.slotLabels.forEach((label, index) => {
      const building = buildingBySlot.get(`slot-${index + 1}`);
      const tower = building ? starterCatalog.towers.find((candidate) => candidate.id === building.definitionId) : undefined;
      label.setText(building ? `${tower?.displayName ?? "防御塔"}\nLv.${building.level}` : `格子 ${index + 1}`);
      label.setColor(building ? "#fcd34d" : "#cbd5e1");
      const towerVisual = this.towerVisuals.get(`slot-${index + 1}`);
      towerVisual?.setVisible(Boolean(building));
      if (tower) {
        towerVisual?.setFillStyle(this.towerColor(tower.id), 1);
      }
    });

    this.syncCombatEvents();
    this.syncEnemyVisuals(state.enemies);
    this.upgradePanel.setVisible(state.phase === "UPGRADE");
    this.upgradeChoiceButtons.forEach((button, index) => {
      const upgradeId = state.pendingUpgradeChoices[index];
      const upgrade = starterCatalog.upgrades.find((candidate) => candidate.id === upgradeId);
      this.upgradeChoiceLabels[index]?.setText(upgrade ? `${upgrade.title}\n${upgrade.description}` : "");
      button.setVisible(Boolean(upgrade));
    });

    if (state.phase === "VICTORY") {
      this.messageText.setText("第 20 波完成：胜利！");
    } else if (state.phase === "DEFEAT") {
      this.messageText.setText("城墙失守：本局失败");
    } else if (state.phase === "UPGRADE") {
      this.messageText.setText("升级完成，请选择一项强化");
    } else if (previousPhase === "UPGRADE" && state.wave > 0) {
      this.messageText.setText("强化已生效，准备下一波");
    }
    this.lastRenderedPhase = state.phase;
  }

  private chooseUpgrade(index: number): void {
    const upgradeId = this.simulation.getState().pendingUpgradeChoices[index];
    if (!upgradeId) {
      return;
    }
    const result = this.simulation.dispatch({ type: "choose_upgrade", upgradeId });
    if (!result.accepted) {
      this.messageText.setText(result.reason ?? "无法选择强化");
    }
  }

  private syncCombatEvents(): void {
    for (const event of this.simulation.drainEvents()) {
      if (event.type === "tower_attack") {
        this.showProjectile(event);
      } else if (event.type === "enemy_hit") {
        this.showEnemyHit(event);
      } else {
        this.showEnemyDefeated(event);
      }
    }
  }

  private showProjectile(event: Extract<GameEvent, { type: "tower_attack" }>): void {
    const building = this.simulation.getState().buildings.find((candidate) => candidate.id === event.buildingId);
    const start = building ? this.slotPositions.get(building.slotId) : undefined;
    if (!start) {
      return;
    }

    const end = this.enemyPosition(event.targetPosition);
    const color = this.towerColor(event.towerDefinitionId);
    const muzzle = this.add.circle(start.x, start.y, 11, color, 0.8);
    this.tweens.add({
      targets: muzzle,
      scale: 1.7,
      alpha: 0,
      duration: 100,
      onComplete: () => muzzle.destroy(),
    });

    const projectile = this.add.circle(start.x, start.y, 5, color, 1);
    this.tweens.add({
      targets: projectile,
      x: end.x,
      y: end.y,
      duration: 220,
      ease: "Cubic.easeOut",
      onComplete: () => projectile.destroy(),
    });
  }

  private showEnemyHit(event: Extract<GameEvent, { type: "enemy_hit" }>): void {
    const point = this.enemyPosition(event.position);
    const flash = this.add.circle(point.x, point.y, 20, 0xfef08a, 0.18);
    flash.setStrokeStyle(3, 0xfef08a, 1);
    this.tweens.add({
      targets: flash,
      scale: 1.5,
      alpha: 0,
      duration: 180,
      onComplete: () => flash.destroy(),
    });

    const damageText = this.add.text(point.x, point.y - 24, `-${this.formatNumber(event.damage)}`, this.textStyle(16, "#fde68a"));
    damageText.setOrigin(0.5);
    this.tweens.add({
      targets: damageText,
      y: point.y - 52,
      alpha: 0,
      duration: 420,
      onComplete: () => damageText.destroy(),
    });
  }

  private showEnemyDefeated(event: Extract<GameEvent, { type: "enemy_defeated" }>): void {
    const point = this.enemyPosition(event.position);
    const burst = this.add.circle(point.x, point.y, 24, 0xf97316, 0.22);
    burst.setStrokeStyle(4, 0xfbbf24, 1);
    this.tweens.add({
      targets: burst,
      scale: 1.8,
      alpha: 0,
      duration: 260,
      onComplete: () => burst.destroy(),
    });
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
        visual = this.add.circle(WIDTH / 2, 220, 18, this.enemyColor(enemy.definitionId), 1);
        visual.setStrokeStyle(3, 0xf8fafc, 0.9);
        this.enemyVisuals.set(enemy.id, visual);
        const track = this.add.rectangle(WIDTH / 2, 196, 42, 6, 0x0f172a, 0.95).setOrigin(0.5);
        const fill = this.add.rectangle(WIDTH / 2 - 21, 196, 42, 6, 0x4ade80, 1).setOrigin(0, 0.5);
        this.enemyHealthBars.set(enemy.id, { track, fill });
      }

      const point = this.enemyPosition(enemy.position);
      visual.setPosition(point.x, point.y);
      visual.setScale(Math.max(0.72, Math.min(1.25, 0.72 + enemy.hp / enemy.maxHp * 0.5)));
      const bars = this.enemyHealthBars.get(enemy.id);
      bars?.track.setPosition(point.x, point.y - 28);
      bars?.fill.setPosition(point.x - 21, point.y - 28);
      bars?.fill.setDisplaySize(Math.max(2, 42 * Math.max(0, enemy.hp / enemy.maxHp)), 6);
    }
  }

  private enemyPosition(position: number): { x: number; y: number } {
    return { x: WIDTH / 2, y: 230 + position * 540 };
  }

  private towerColor(towerId: string): number {
    switch (towerId) {
      case "machine_gun":
        return 0xf59e0b;
      case "cannon":
        return 0xef4444;
      case "frost":
        return 0x38bdf8;
      case "electric":
        return 0xa78bfa;
      default:
        return 0xf59e0b;
    }
  }

  private enemyColor(enemyId: string): number {
    const enemy = starterCatalog.enemies.find((candidate) => candidate.id === enemyId);
    if (enemy?.tier === "boss") {
      return 0xef4444;
    }
    if (enemy?.tier === "elite") {
      return 0xc084fc;
    }
    if (enemy?.behavior === "runner" || enemy?.behavior === "volatile") {
      return 0xfb923c;
    }
    return 0x4ade80;
  }

  private formatNumber(value: number): string {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
  }

  private handleHidden(): void {
    const state = this.simulation.getState();
    if (state.phase === "PREPARE" || state.phase === "COMBAT") {
      this.simulation.dispatch({ type: "pause" });
      this.messageText.setText("页面已隐藏，游戏已暂停");
    }
  }

  private phaseLabel(phase: GamePhase): string {
    switch (phase) {
      case "PREPARE":
        return "修整建设";
      case "COMBAT":
        return "自动战斗";
      case "UPGRADE":
        return "选择强化";
      case "PAUSED":
        return "已暂停";
      case "VICTORY":
        return "胜利结算";
      case "DEFEAT":
        return "失败结算";
    }
  }

  private startWaveLabel(phase: GamePhase, wave: number): string {
    if (phase === "COMBAT") {
      return "战斗进行中";
    }

    if (phase === "PAUSED") {
      return "恢复战斗";
    }

    if (phase === "UPGRADE") {
      return "选择强化";
    }

    if (phase === "VICTORY" || phase === "DEFEAT") {
      return "本局结束";
    }

    return `开始第 ${wave + 1} 波`;
  }

  private textStyle(fontSize: number, color: string): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      color,
      fontFamily: "Arial, Microsoft YaHei, sans-serif",
      fontSize: `${fontSize}px`,
    };
  }

  private getDebugSeed(): number {
    const rawSeed = new URLSearchParams(window.location.search).get("seed");
    const parsedSeed = rawSeed === null ? Number.NaN : Number(rawSeed);
    return Number.isFinite(parsedSeed) ? parsedSeed : 0x5ec0de;
  }
}

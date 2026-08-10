import Phaser from "phaser";
import { FixedStepClock } from "../core/clock";
import { starterCatalog } from "../core/content";
import { GameSimulation } from "../core/game";
import type { GamePhase } from "../core/types";

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
  private messageText!: Phaser.GameObjects.Text;
  private startButton!: Phaser.GameObjects.Rectangle;
  private startButtonText!: Phaser.GameObjects.Text;
  private restartButton!: Phaser.GameObjects.Rectangle;
  private restartButtonText!: Phaser.GameObjects.Text;
  private slotLabels: Phaser.GameObjects.Text[] = [];

  public constructor() {
    super("game");
  }

  public create(): void {
    this.simulation = new GameSimulation(starterCatalog, this.getDebugSeed());
    this.cameras.main.setBackgroundColor("#101827");

    this.createBackground();
    this.createHud();
    this.createBattlefield();
    this.createBuildArea();
    this.createControls();
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
    this.add.text(32, 982, "点击格子建造机枪塔（40 木材）", this.textStyle(18, "#94a3b8"));

    const slotXs = [126, 282, 438, 594];
    slotXs.forEach((x, index) => {
      const slot = this.add.rectangle(x, 1080, 120, 120, 0x26354d, 1);
      slot.setStrokeStyle(3, 0x64748b, 1);
      slot.setInteractive();
      slot.on("pointerdown", () => {
        const result = this.simulation.dispatch({
          type: "build_tower",
          definitionId: "machine_gun",
          slotId: `slot-${index + 1}`,
        });
        this.messageText.setText(result.accepted ? "机枪塔已建造" : result.reason ?? "无法建造");
      });

      const label = this.add.text(x, 1080, `格子 ${index + 1}`, {
        ...this.textStyle(20, "#cbd5e1"),
        align: "center",
      }).setOrigin(0.5);
      this.slotLabels.push(label);
    });
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

    this.messageText = this.add.text(32, 880, "先建造一座塔，再开始第 1 波", this.textStyle(20, "#fbbf24"));
  }

  private renderState(): void {
    const state = this.simulation.getState();
    this.phaseText.setText(`阶段：${this.phaseLabel(state.phase)}`);
    this.waveText.setText(`波次：${state.wave} / ${state.maxWave}    剩余：${state.waveTimeRemainingSeconds.toFixed(1)}s`);
    this.resourceText.setText(`木材：${state.wood}    金币：${state.gold}`);
    this.wallText.setText(`城墙：${state.wallHp} / ${state.wallMaxHp}`);
    this.startButtonText.setText(this.startWaveLabel(state.phase, state.wave));
    this.startButton.setFillStyle(state.phase === "PREPARE" ? 0x2563eb : 0x475569, 1);
    this.restartButton.setVisible(state.phase === "VICTORY" || state.phase === "DEFEAT");
    this.restartButtonText.setVisible(state.phase === "VICTORY" || state.phase === "DEFEAT");

    const buildingBySlot = new Map(state.buildings.map((building) => [building.slotId, building]));
    this.slotLabels.forEach((label, index) => {
      const building = buildingBySlot.get(`slot-${index + 1}`);
      label.setText(building ? "机枪塔\nLv.1" : `格子 ${index + 1}`);
      label.setColor(building ? "#fcd34d" : "#cbd5e1");
    });

    if (state.phase === "VICTORY") {
      this.messageText.setText("第 20 波完成：胜利！");
    } else if (state.phase === "DEFEAT") {
      this.messageText.setText("城墙失守：本局失败");
    }
  }

  private phaseLabel(phase: GamePhase): string {
    switch (phase) {
      case "PREPARE":
        return "修整建设";
      case "COMBAT":
        return "自动战斗";
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

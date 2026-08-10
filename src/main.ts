import Phaser from "phaser";
import "./styles.css";
import { GameScene } from "./phaser/GameScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  parent: "app",
  width: 720,
  height: 1280,
  backgroundColor: "#101827",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [GameScene],
};

new Phaser.Game(config);

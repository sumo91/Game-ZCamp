import Phaser from "phaser";
import "./styles.css";
import { GameScene } from "./phaser/GameScene";
import { LobbyScene } from "./phaser/LobbyScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  width: 720,
  height: 1280,
  backgroundColor: "#101827",
  title: "ZCamp",
  version: "0.1.0",
  disableContextMenu: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [LobbyScene, GameScene],
};

const game = new Phaser.Game(config);

// DEV-only handle for live inspection and evidence tooling.
if (import.meta.env.DEV) {
  (window as Window & { __zcampGame?: Phaser.Game }).__zcampGame = game;
}

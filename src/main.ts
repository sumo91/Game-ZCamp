import "./styles.css";

if (new URLSearchParams(window.location.search).get("preview") === "threejs") {
  const { mountWhiteboxPreview } = await import("./three/WhiteboxPreview");
  const dispose = mountWhiteboxPreview(document.querySelector<HTMLElement>("#app")!);
  import.meta.hot?.dispose(dispose);
} else {
  const { default: Phaser } = await import("phaser");
  const { GameScene } = await import("./phaser/GameScene");
  const { LobbyScene } = await import("./phaser/LobbyScene");

  const config: import("phaser").Types.Core.GameConfig = {
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
    (window as Window & { __zcampGame?: import("phaser").Game }).__zcampGame = game;
  }
  import.meta.hot?.dispose(() => game.destroy(true));
}

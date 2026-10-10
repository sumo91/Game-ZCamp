import "./styles.css";

const entryParams = new URLSearchParams(window.location.search);
const preview = entryParams.get("preview");
if (preview === "asset-pressure" || entryParams.get("phone") === "iqoo-z10-turbo") {
  const { mountAssetPressure } = await import("./three/AssetPressure");
  const dispose = mountAssetPressure(document.querySelector<HTMLElement>("#app")!);
  import.meta.hot?.dispose(dispose);
} else if (preview === "threejs") {
  const mount = entryParams.has("demo") ? (await import("./three/WhiteboxPreview")).mountBattlePresentation : (await import("./three/ThreeGame")).mountThreeGame;
  const dispose = mount(document.querySelector<HTMLElement>("#app")!);
  import.meta.hot?.dispose(dispose);
} else if (entryParams.get("dev") === "demo") {
  const { mountBattlePresentation } = await import("./three/WhiteboxPreview");
  import.meta.hot?.dispose(mountBattlePresentation(document.querySelector<HTMLElement>("#app")!));
} else {
  const { mountThreeGame } = await import("./three/ThreeGame");
  const dispose = mountThreeGame(document.querySelector<HTMLElement>("#app")!, { developmentReplay: entryParams.get("dev") === "campaign" });
  import.meta.hot?.dispose(dispose);
}

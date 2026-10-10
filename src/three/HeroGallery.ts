import { AnimationMixer, ACESFilmicToneMapping, DirectionalLight, HemisphereLight, LoopRepeat, OrthographicCamera, Scene, WebGLRenderer } from "three";
import type { Object3D } from "three";
import { starterHeroContent } from "../core/hero";
import { heroAsset } from "./assetCatalog";
import type { ModelLibrary } from "./ModelLibrary";

/** One canvas renders the same three rigged heroes into their lobby card portraits. */
export class HeroGallery {
  private readonly renderer = new WebGLRenderer({ alpha: true, antialias: true });
  private readonly camera = new OrthographicCamera(-.88, .88, .92, -.92, .1, 20);
  private readonly views: Array<{ scene: Scene; object: Object3D; mixer: AnimationMixer; host: HTMLElement }> = [];
  public constructor(private readonly host: HTMLElement, private readonly library: ModelLibrary) {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.className = "lobby-hero-canvas";
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    host.prepend(this.renderer.domElement);
    this.camera.position.set(1.7, 1.7, 3.5); this.camera.lookAt(0, .80, 0);
    for (const hero of starterHeroContent.heroes) {
      const scene = new Scene();
      scene.add(new HemisphereLight(0xdbe9ff, 0x6b5a3e, 1.9));
      const light = new DirectionalLight(0xffe5ac, 3.1); light.position.set(-3,5,4); scene.add(light);
      const model = library.create(heroAsset(hero.id)); scene.add(model.object);
      const mixer = new AnimationMixer(model.object);
      const clip = model.clips.find((clip) => clip.name === "idle");
      if (clip) mixer.clipAction(clip).setLoop(LoopRepeat, Infinity).play();
      this.views.push({ scene, object: model.object, mixer, host: host.querySelector<HTMLElement>(`[data-portrait="${hero.id}"]`)! });
    }
  }
  public render(deltaSeconds: number): void {
    const bounds = this.host.getBoundingClientRect();
    this.renderer.setSize(bounds.width, bounds.height, false);
    this.renderer.setScissorTest(false); this.renderer.clear(); this.renderer.setScissorTest(true);
    for (const view of this.views) {
      const rect = view.host.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      const aspect = rect.width / rect.height;
      this.camera.left = -.92*aspect; this.camera.right = .92*aspect; this.camera.updateProjectionMatrix();
      const x = rect.left-bounds.left, y = bounds.bottom-rect.bottom;
      this.renderer.setViewport(x, y, rect.width, rect.height); this.renderer.setScissor(x, y, rect.width, rect.height);
      view.mixer.update(deltaSeconds);
      this.renderer.render(view.scene, this.camera);
    }
  }
  public dispose(): void {
    for (const view of this.views) { view.mixer.stopAllAction(); view.mixer.uncacheRoot(view.object); this.library.releaseInstance(view.object); }
    this.renderer.dispose(); this.renderer.domElement.remove();
  }
}

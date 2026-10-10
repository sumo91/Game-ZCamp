import {
  ACESFilmicToneMapping, AnimationMixer, BoxGeometry, DirectionalLight, HemisphereLight,
  LoopRepeat, Matrix4, Mesh, MeshStandardMaterial, OrthographicCamera, PCFShadowMap,
  Scene, Vector3, WebGLRenderer,
} from "three";
import type { AnimationAction, Object3D } from "three";
import { buildingAsset, type AnimationSemantic, type AssetId } from "./assetCatalog";
import { CAMP_POSITIONS } from "./coordinates";
import type { ModelLibrary } from "./ModelLibrary";

export type PressureQuality = "standard" | "reduced";
type Unit = { object: Object3D; mixer: AnimationMixer; actions: Map<AnimationSemantic, AnimationAction>; semantic?: AnimationSemantic; x: number; z: number };
const SEMANTICS: readonly AnimationSemantic[] = ["walk", "attack", "hit", "death"];

/** Presentation-only scene: never constructs or mutates a battle session. */
export class AssetPressureField {
  private readonly renderer = new WebGLRenderer({ antialias: true });
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-6, 6, 8, -8, .1, 100);
  private readonly ownedGround: Mesh[] = [];
  private readonly instances: Object3D[] = [];
  private readonly units: Unit[] = [];
  private readonly sun = new DirectionalLight(0xffe8c4, 3.2);
  private elapsed = 0;
  private quality: PressureQuality = "standard";
  public readonly composition: Partial<Record<AssetId, number>> = {};

  public constructor(private readonly host: HTMLElement, private readonly library: ModelLibrary) {
    this.renderer.setClearColor(0x222330);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.setAttribute("aria-label", "表现资产压力实验：十五格营地与活动骷髅");
    host.append(this.renderer.domElement);
    this.camera.position.set(0, 23, 14);
    this.camera.lookAt(0, 0, -2);
    this.scene.add(new HemisphereLight(0xd2ddf0, 0x5b5649, 1.7));
    this.sun.position.set(-5, 14, 6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, { left: -9, right: 9, top: 13, bottom: -13 });
    this.sun.shadow.bias = -.0003;
    this.sun.shadow.normalBias = .025;
    this.scene.add(this.sun);
    for (const [depth, color, z] of [[12, 0x605c73, -6], [8.2, 0x749051, 4.1]]) {
      const ground = new Mesh(new BoxGeometry(12, .12, depth), new MeshStandardMaterial({ color }));
      ground.position.set(0, -.12, z);
      ground.receiveShadow = true;
      this.scene.add(ground);
      this.ownedGround.push(ground);
    }
    this.batch("wall", Array.from({ length: 6 }, (_, i) => new Matrix4().makeTranslation(-4.75 + i * 1.9, 0, 0)));
    this.batch("plot", [...CAMP_POSITIONS.values()].map(p => new Matrix4().makeTranslation(p.x, p.y, p.z)));
    this.batch("tree", [[-5.35, 2.8], [5.35, 3.3], [-5.3, -2.7], [5.3, -5.7]].map(([x, z]) => new Matrix4().makeTranslation(x, 0, z).scale(new Vector3(.85, .85, .85))));
    this.batch("rocks", [[-5.35, .8], [5.35, -.9], [-5.2, -5.1], [5.25, -8.3]].map(([x, z]) => new Matrix4().makeTranslation(x, 0, z)));
    for (const [index, [slot, position]] of [...CAMP_POSITIONS].entries()) {
      const id = slot === "slot-r3-c3" ? "main_city" : index % 2 === 0 ? "arrow_tower" : "lumberyard";
      const asset = buildingAsset(id, [1, 3, 5][index % 3])!;
      const object = library.create(asset).object;
      object.position.copy(position);
      this.add(asset, object);
    }
    this.configure(100, "standard");
  }

  public get canvas(): HTMLCanvasElement { return this.renderer.domElement; }

  public configure(count: number, quality: PressureQuality): void {
    this.clearUnits();
    this.quality = quality;
    this.elapsed = 0;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === "standard" ? 2 : 1));
    const columns = count === 100 ? 10 : 20;
    const rows = count / columns;
    for (let index = 0; index < count; index += 1) {
      const instance = this.library.create("skeleton");
      const x = ((index % columns) / (columns - 1) - .5) * 8.4;
      const z = -10.25 + Math.floor(index / columns) / (rows - 1) * 8.8;
      instance.object.position.set(x, 0, z);
      const mixer = new AnimationMixer(instance.object);
      const actions = new Map(instance.clips.map(clip => [clip.name as AnimationSemantic, mixer.clipAction(clip)]));
      for (const action of actions.values()) action.setLoop(LoopRepeat, Infinity);
      const semantic = SEMANTICS[index % SEMANTICS.length];
      actions.get(semantic)!.play();
      this.units.push({ object: instance.object, mixer, actions, x, z, semantic });
      this.scene.add(instance.object);
    }
    this.composition.skeleton = this.units.length;
    this.resize();
  }

  public resize(): void {
    const width = this.host.clientWidth, height = this.host.clientHeight;
    if (!width || !height) return;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality === "standard" ? 2 : 1));
    this.renderer.setSize(width, height);
    const aspect = width / height, halfHeight = Math.max(8.1, 5.9 / aspect);
    Object.assign(this.camera, { left: -halfHeight * aspect, right: halfHeight * aspect, top: halfHeight, bottom: -halfHeight });
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  }

  public render(deltaSeconds: number): void {
    this.elapsed += deltaSeconds;
    this.units.forEach((unit, index) => {
      const semantic = SEMANTICS[(Math.floor(this.elapsed / 4) + index) % SEMANTICS.length];
      if (semantic !== unit.semantic) {
        unit.mixer.stopAllAction();
        unit.actions.get(semantic)!.reset().play();
        unit.semantic = semantic;
      }
      unit.object.position.x = unit.x + Math.sin(this.elapsed + index) * .04;
      unit.mixer.update(deltaSeconds);
    });
    this.renderer.render(this.scene, this.camera);
  }

  public snapshot() {
    const units = this.units.map((unit, index) => {
      const p = unit.object.position.clone().project(this.camera);
      return { id: index + 1, clip: unit.semantic, mixerTimeSeconds: unit.mixer.time,
        visible: unit.object.visible, actionRunning: unit.actions.get(unit.semantic!)!.isRunning(),
        centerInView: Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1 && p.z >= -1 && p.z <= 1 };
    });
    return {
      activeUnits: units.filter(unit => unit.visible && unit.actionRunning).length,
      independentMixers: new Set(this.units.map(unit => unit.mixer)).size,
      centersInView: units.filter(unit => unit.centerInView).length, units,
      animation: "SkeletonUtils.clone + 每实例 AnimationMixer；四动作每4秒轮换并循环；所有 mixer 每个显示帧更新",
      semantics: Object.fromEntries(SEMANTICS.map(s => [s, this.units.filter(u => u.semantic === s).length])),
      animationTimeSeconds: this.elapsed,
      rendererDpr: this.renderer.getPixelRatio(), quality: this.quality,
      shadow: { enabled: true, type: "PCFShadowMap", resolution: [1024, 1024], groundProjection: true },
      ...this.frameMetrics(),
      canvasCss: { width: this.host.clientWidth, height: this.host.clientHeight },
      composition: { ...this.composition },
    };
  }

  public frameMetrics() {
    return { calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries, textures: this.renderer.info.memory.textures };
  }

  public dispose(): void {
    this.clearUnits();
    for (const object of this.instances) this.library.releaseInstance(object);
    for (const ground of this.ownedGround) { ground.geometry.dispose(); (ground.material as MeshStandardMaterial).dispose(); }
    this.sun.shadow.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private add(id: AssetId, object: Object3D): void {
    this.instances.push(object);
    this.scene.add(object);
    this.composition[id] = (this.composition[id] ?? 0) + 1;
  }

  private batch(id: AssetId, transforms: Matrix4[]): void {
    this.add(id, this.library.createStaticBatch(id, transforms));
    this.composition[id] = transforms.length;
  }

  private clearUnits(): void {
    for (const unit of this.units) {
      unit.mixer.stopAllAction(); unit.mixer.uncacheRoot(unit.object);
      this.scene.remove(unit.object); this.library.releaseInstance(unit.object);
    }
    this.units.length = 0;
  }
}

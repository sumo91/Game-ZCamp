import { Box3, Group, InstancedMesh, Mesh, SkinnedMesh, Texture, Vector3 } from "three";
import type { AnimationClip, BufferGeometry, Material, Matrix4, Object3D, Skeleton } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { SAMPLE_ASSETS, validateSampleCatalog, type AssetId, type PresentationAsset } from "./assetCatalog";

export interface ModelInstance { object: Object3D; clips: AnimationClip[] }
export interface AssetProgress { loaded: number; total: number; name: string }

/** Owns shared GLB geometry/material/textures. Instances own only their cloned rigs. */
export class ModelLibrary {
  private readonly models = new Map<AssetId, GLTF>();
  private disposed = false;

  public static async load(progress: (value: AssetProgress) => void): Promise<ModelLibrary> {
    const library = new ModelLibrary();
    const loader = new GLTFLoader();
    try {
      validateSampleCatalog();
      for (const [index, asset] of SAMPLE_ASSETS.entries()) {
        progress({ loaded: index, total: SAMPLE_ASSETS.length, name: asset.file });
        let model: GLTF;
        try { model = await loader.loadAsync(`${import.meta.env.BASE_URL}assets/threejs/${asset.file}`); }
        catch (cause) { throw new Error(`模型或材质资源不可用：${asset.file}`, { cause }); }
        library.models.set(asset.id, model);
        library.validate(asset, model);
        progress({ loaded: index + 1, total: SAMPLE_ASSETS.length, name: asset.file });
      }
      return library;
    } catch (error) {
      library.dispose();
      throw error;
    }
  }

  public create(id: AssetId): ModelInstance {
    if (this.disposed) throw new Error("模型资源已释放");
    const model = this.models.get(id);
    if (!model) throw new Error(`样板模型未加载：${id}`);
    const object = clone(model.scene);
    object.userData.sharedAsset = true;
    object.traverse((child) => {
      if (child instanceof Mesh) { child.castShadow = true; child.receiveShadow = true; }
    });
    return { object, clips: model.animations };
  }

  public createStaticBatch(id: AssetId, transforms: readonly Matrix4[]): Object3D {
    const model = this.models.get(id);
    if (this.disposed || !model) throw new Error(`样板模型未加载：${id}`);
    if (model.animations.length) throw new Error(`带动作的模型不能使用静态合批：${id}`);
    const group = new Group();
    group.userData.sharedAsset = true;
    model.scene.updateMatrixWorld(true);
    model.scene.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      if (child instanceof SkinnedMesh) throw new Error(`蒙皮模型不能使用静态合批：${id}`);
      const batch = new InstancedMesh(child.geometry, child.material, transforms.length);
      batch.castShadow = true;
      batch.receiveShadow = true;
      transforms.forEach((transform, index) => batch.setMatrixAt(index, transform.clone().multiply(child.matrixWorld)));
      batch.instanceMatrix.needsUpdate = true;
      batch.computeBoundingSphere();
      group.add(batch);
    });
    return group;
  }

  public releaseInstance(object: Object3D): void {
    const skeletons = new Set<Skeleton>();
    object.traverse((child) => {
      if (child instanceof SkinnedMesh) skeletons.add(child.skeleton);
      if (child instanceof InstancedMesh) child.dispose();
    });
    for (const skeleton of skeletons) skeleton.dispose();
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const geometries = new Set<BufferGeometry>();
    const materials = new Set<Material>();
    const textures = new Set<Texture>();
    for (const { scene } of this.models.values()) scene.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      geometries.add(child.geometry);
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
        materials.add(material);
        for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value);
      }
    });
    for (const resource of [...geometries, ...materials, ...textures]) resource.dispose();
    if (typeof ImageBitmap !== "undefined") for (const texture of textures) if (texture.image instanceof ImageBitmap) texture.image.close();
    this.models.clear();
  }

  private validate(asset: PresentationAsset, model: GLTF): void {
    for (const name of ["asset_root", ...asset.anchors]) if (!model.scene.getObjectByName(name)) throw new Error(`${asset.file} 缺少 ${name}`);
    for (const clip of asset.clips) if (!model.animations.some((animation) => animation.name === clip)) throw new Error(`${asset.file} 缺少动作 ${clip}`);
    const size = new Box3().setFromObject(model.scene).getSize(new Vector3());
    if ([size.x, size.y, size.z].some((value, index) => !Number.isFinite(value) || value <= 0 || value > asset.maximumSize[index]!)) throw new Error(`${asset.file} 的尺寸不符合样板约定`);
    const bounds = new Box3().setFromObject(model.scene);
    if (Math.abs(bounds.min.y) > .035) throw new Error(`${asset.file} 未以脚底/基座落地`);
    const root = model.scene.getObjectByName("asset_root")!;
    if (root.scale.distanceTo(new Vector3(1, 1, 1)) > .001 || root.position.length() > .001) throw new Error(`${asset.file} 的原点或缩放不符合约定`);
  }
}

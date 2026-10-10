import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Mesh, MeshStandardMaterial, SkinnedMesh } from "three";
import { ModelLibrary } from "../../src/three/ModelLibrary";

afterEach(() => vi.unstubAllGlobals());

/** Only browser I/O is substituted. The library and GLTFLoader parse the actual saved GLBs. */
async function loadLibrary(): Promise<ModelLibrary> {
  const originalFetch = globalThis.fetch;
  const OriginalRequest = globalThis.Request;
  class Bitmap { width = 256; height = 256; closed = false; close() { this.closed = true; } }
  vi.stubGlobal("ImageBitmap", Bitmap);
  vi.stubGlobal("createImageBitmap", async () => new Bitmap());
  vi.stubGlobal("self", globalThis);
  vi.stubGlobal("ProgressEvent", class extends Event { loaded = 0; total = 0; });
  vi.stubGlobal("Request", class extends OriginalRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      super(typeof input === "string" && !input.includes(":") ? new URL(input, "http://assets.test/") : input, init);
    }
  });
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith("blob:")) return originalFetch(input, init);
    const name = new URL(url).pathname.split("/").pop()!;
    const bytes = await readFile(new URL(`../../public/assets/threejs/${name}`, import.meta.url));
    return new Response(new Uint8Array(bytes));
  });
  return ModelLibrary.load(() => {});
}

describe("model cache GPU lifetime", () => {
  it("retains an active consumer, retires bindings after the last consumer, and keeps cloneable CPU models", async () => {
    const library = await loadLibrary();
    const first = library.create("skeleton");
    let mesh: Mesh | undefined;
    first.object.traverse((object) => { if (object instanceof Mesh) mesh ??= object; });
    const geometry = mesh!.geometry;
    const material = mesh!.material as MeshStandardMaterial;
    const texture = material.map!;
    const resources = [geometry, material, texture];
    const retired: unknown[] = [];
    for (const resource of resources) {
      const onDispose = () => { retired.push(resource); resource.removeEventListener("dispose", onDispose); };
      resource.addEventListener("dispose", onDispose);
    }
    const endFirst = library.acquireRendererResources();
    const endSecond = library.acquireRendererResources();
    endFirst(); endFirst();
    expect(retired).toHaveLength(0);
    endSecond(); endSecond();
    expect(retired).toEqual(resources);
    const next = library.create("skeleton");
    let nextMesh: Mesh | undefined;
    next.object.traverse((object) => { if (object instanceof Mesh) nextMesh ??= object; });
    expect(nextMesh!.geometry).toBe(geometry);
    expect(nextMesh!.material).toBe(material);
    expect((texture.image as { closed: boolean }).closed).toBe(false);
    expect(library.snapshot()).toMatchObject({ cachedAssets: 33, disposed: false, rendererUsers: 0 });
    let rig: SkinnedMesh | undefined;
    first.object.traverse((object) => { if (object instanceof SkinnedMesh) rig ??= object; });
    rig!.skeleton.computeBoneTexture();
    const boneTexture = rig!.skeleton.boneTexture!;
    let boneRetirements = 0;
    boneTexture.addEventListener("dispose", () => { boneRetirements += 1; });
    library.releaseInstance(first.object); library.releaseInstance(first.object);
    expect(boneRetirements).toBe(1);
    expect(rig!.skeleton.boneTexture).toBeNull();
    library.releaseInstance(next.object); library.dispose();
    expect((texture.image as { closed: boolean }).closed).toBe(true);
  });
});

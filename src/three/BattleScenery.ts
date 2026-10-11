import {
  BoxGeometry, CanvasTexture, ConeGeometry, CylinderGeometry, Group, InstancedMesh,
  Matrix4, Mesh, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace, Vector3,
} from "three";
import type { BufferGeometry, Material } from "three";

/** Small, static terrain dressing. Owns its generated resources, never GLB resources. */
export class BattleScenery {
  public readonly object = new Group();
  private readonly decorations = new Group();
  private readonly geometries = new Set<BufferGeometry>();
  private readonly materials = new Set<Material>();
  private readonly textures: CanvasTexture[] = [];

  public constructor() {
    this.ground(12, 12, -6, false);
    this.ground(12, 8.2, 4.1, true);
    this.campPaths();
    this.wallLights();
    this.object.add(this.decorations);
  }

  public setDecorations(visible: boolean): void { this.decorations.visible = visible; }

  public dispose(): void {
    this.object.removeFromParent();
    for (const texture of this.textures) texture.dispose();
    for (const material of this.materials) material.dispose();
    for (const geometry of this.geometries) geometry.dispose();
    this.object.traverse((object) => { if (object instanceof InstancedMesh) object.dispose(); });
    this.object.clear();
  }

  private ground(width: number, depth: number, z: number, camp: boolean): void {
    const canvas = document.createElement("canvas");
    canvas.width = 256; canvas.height = 512;
    const context = canvas.getContext("2d")!;
    context.fillStyle = camp ? "#70834b" : "#665d75";
    context.fillRect(0, 0, canvas.width, canvas.height);
    // Broad colour washes keep the surface clean at a phone's actual size.
    const wash = (x: number, y: number, radius: number, color: string) => {
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, color); gradient.addColorStop(1, "transparent");
      context.fillStyle = gradient; context.fillRect(0, 0, 256, 512);
    };
    wash(128, 260, 270, camp ? "#9aaf6644" : "#b0a7ba44");
    wash(35, 85, 135, camp ? "#b1b67722" : "#49405944");
    wash(220, 445, 170, camp ? "#54633844" : "#51445944");
    // Sparse, low-contrast facets suggest earth rather than a flat colour card.
    for (let index = 0; index < 18; index += 1) {
      const x = (index * 73 + 19) % 256, y = (index * 137 + 31) % 512;
      const size = 16 + index % 4 * 8;
      context.beginPath();
      context.moveTo(x - size, y + size * .2);
      context.lineTo(x - size * .3, y - size * .65);
      context.lineTo(x + size * .7, y - size * .3);
      context.lineTo(x + size, y + size * .5);
      context.lineTo(x, y + size * .8);
      context.closePath();
      context.fillStyle = camp ? "#51663a16" : index % 2 ? "#c3b9ca16" : "#40354f18";
      context.fill();
    }
    // A soft dark border frames the playable centre without tall obstructions.
    for (const edge of [0, 256]) wash(edge, 256, 100, camp ? "#36463238" : "#312a423b");
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    this.textures.push(texture);
    const material = this.material(new MeshStandardMaterial({ map: texture, roughness: 1 }));
    const ground = new Mesh(this.geometry(new PlaneGeometry(width, depth)), material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -.06, z);
    ground.receiveShadow = true;
    this.object.add(ground);
  }

  private campPaths(): void {
    const soil = this.material(new MeshStandardMaterial({ color: 0x8d865f, roughness: 1 }));
    const pathGeometry = this.geometry(new BoxGeometry(1, .022, 1));
    const paths = [
      ...[.45, 2.6, 5, 7.3].map((z) => ({ x: 0, z, width: 10.1, depth: .34 })),
      ...[-3, -1, 1, 3].map((x) => ({ x, z: 3.85, width: .13, depth: 6.2 })),
    ];
    const path = new InstancedMesh(pathGeometry, soil, paths.length);
    paths.forEach(({ x, z, width, depth }, index) => {
      path.setMatrixAt(index, new Matrix4().makeScale(width, 1, depth).setPosition(x, -.035, z));
    });
    path.instanceMatrix.needsUpdate = true;
    path.receiveShadow = true;
    path.computeBoundingSphere();
    this.object.add(path);

    const stone = this.material(new MeshStandardMaterial({ color: 0xb6b095, roughness: .95 }));
    const geometry = this.geometry(new BoxGeometry(.27, .018, .16));
    const stones = new InstancedMesh(geometry, stone, 32);
    for (let index = 0; index < stones.count; index += 1) {
      const row = Math.floor(index / 8), column = index % 8;
      const matrix = new Matrix4().makeRotationY(Math.sin(index * 2.3) * .13);
      matrix.scale(new Vector3(.85 + index % 3 * .12, 1, .85 + index % 2 * .2));
      matrix.setPosition(-4.35 + column * 1.23, -.009, [.45, 2.6, 5, 7.3][row]!);
      stones.setMatrixAt(index, matrix);
    }
    stones.instanceMatrix.needsUpdate = true;
    stones.receiveShadow = true;
    stones.computeBoundingSphere();
    this.object.add(stones);
  }

  private wallLights(): void {
    const iron = this.material(new MeshStandardMaterial({ color: 0x665749, roughness: .68, metalness: .35 }));
    const rim = this.material(new MeshStandardMaterial({ color: 0xc6994c, roughness: .64, metalness: .25 }));
    const flame = this.material(new MeshStandardMaterial({ color: 0xffb83e, emissive: 0xff8b22, emissiveIntensity: 1.8, roughness: 1 }));
    const core = this.material(new MeshStandardMaterial({ color: 0xffe6a0, emissive: 0xffd279, emissiveIntensity: 2.2, roughness: 1 }));
    const stemGeometry = this.geometry(new CylinderGeometry(.08, .11, .47, 6));
    const cupGeometry = this.geometry(new CylinderGeometry(.23, .14, .14, 7));
    const flameGeometry = this.geometry(new ConeGeometry(.13, .47, 5));
    const coreGeometry = this.geometry(new ConeGeometry(.07, .29, 5));
    for (const [geometry, material, y] of [
      [stemGeometry, iron, 1.07], [cupGeometry, rim, 1.34],
      [flameGeometry, flame, 1.6], [coreGeometry, core, 1.51],
    ] as const) {
      const batch = new InstancedMesh(geometry, material, 2);
      [-5.28, 5.28].forEach((x, index) => batch.setMatrixAt(index, new Matrix4().makeTranslation(x, y, .07)));
      batch.instanceMatrix.needsUpdate = true;
      batch.computeBoundingSphere();
      this.decorations.add(batch);
    }
  }

  private geometry<T extends BufferGeometry>(resource: T): T { this.geometries.add(resource); return resource; }
  private material<T extends Material>(resource: T): T { this.materials.add(resource); return resource; }
}

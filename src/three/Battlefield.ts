import {
  BoxGeometry, Color, CylinderGeometry, DirectionalLight, Group, HemisphereLight,
  Mesh, MeshBasicMaterial, MeshStandardMaterial, OrthographicCamera, PlaneGeometry,
  Raycaster, Scene, SphereGeometry, Vector2, Vector3, WebGLRenderer,
} from "three";
import type { BufferGeometry, Material, Object3D } from "three";
import { starterCatalog } from "../core/content";
import type { BuildingState, GameEvent, GameState } from "../core/types";
import { CAMP_POSITIONS, enemyPosition } from "./coordinates";
import { isWallInDanger, whiteboxEnemy } from "./whiteboxCatalog";

type Effect = { object: Object3D; ttl: number };

/** Owns all preview GPU resources, picking and event-driven presentation. */
export class Battlefield {
  private readonly renderer = new WebGLRenderer({ antialias: true, alpha: false });
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-6, 6, 8, -8, 0.1, 100);
  private readonly raycaster = new Raycaster();
  private readonly pickers: Mesh[] = [];
  private readonly tiles = new Map<string, Mesh>();
  private readonly buildings = new Map<string, Group>();
  private readonly enemies = new Map<string, Group>();
  private readonly effects: Effect[] = [];
  private readonly geometries = new Set<BufferGeometry>();
  private readonly materials = new Set<Material>();
  private readonly wall: Mesh;
  private width = 1;
  private height = 1;
  private previousWall: number | null = null;
  private wallFlash = 0;

  public constructor(private readonly host: HTMLElement) {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x222330);
    this.renderer.shadowMap.enabled = true;
    this.renderer.domElement.setAttribute("aria-label", "3D 白模战场");
    this.host.prepend(this.renderer.domElement);
    this.camera.position.set(0, 24, 12);
    this.camera.lookAt(0, 0, -2);
    this.scene.add(new HemisphereLight(0xe9eef9, 0x465440, 2.5));
    const sun = new DirectionalLight(0xffeed5, 3);
    sun.position.set(-5, 14, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -9;
    sun.shadow.camera.right = 9;
    sun.shadow.camera.top = 13;
    sun.shadow.camera.bottom = -13;
    this.scene.add(sun);
    this.box(12, 0.12, 12, 0x494450, new Vector3(0, -0.12, -6));
    this.box(12, 0.12, 8.2, 0x56634f, new Vector3(0, -0.12, 4.1));
    this.wall = this.box(11.4, 0.9, 0.55, 0xc3c6c8, new Vector3(0, 0.45, 0));
    for (let index = 0; index < 12; index += 1) this.box(0.48, 0.3, 0.65, 0xd3d6d6, new Vector3(-5.25 + index * 0.95, 1.02, 0));
    for (const [slotId, position] of CAMP_POSITIONS) {
      const tile = this.box(1.85, 0.09, 1.58, 0x899287, position.clone());
      this.tiles.set(slotId, tile);
      const picker = new Mesh(this.geometry(new PlaneGeometry(1.95, 1.65)), this.material(new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })));
      picker.rotation.x = -Math.PI / 2;
      picker.position.copy(position).y = 0.12;
      picker.userData.slotId = slotId;
      this.pickers.push(picker);
      this.scene.add(picker);
    }
  }

  public resize(): void {
    this.width = this.host.clientWidth;
    this.height = this.host.clientHeight;
    if (!this.width || !this.height) return;
    this.renderer.setSize(this.width, this.height);
    const aspect = this.width / this.height;
    const halfHeight = Math.max(8.1, 5.9 / aspect);
    this.camera.left = -halfHeight * aspect;
    this.camera.right = halfHeight * aspect;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  }

  public pick(clientX: number, clientY: number): string | null {
    const bounds = this.renderer.domElement.getBoundingClientRect();
    this.raycaster.setFromCamera(new Vector2((clientX - bounds.left) / bounds.width * 2 - 1, -(clientY - bounds.top) / bounds.height * 2 + 1), this.camera);
    return this.raycaster.intersectObjects(this.pickers, false)[0]?.object.userData.slotId ?? null;
  }

  public projectSlot(slotId: string): { x: number; y: number } {
    const projected = CAMP_POSITIONS.get(slotId)!.clone().add(new Vector3(0, 0.2, 0)).project(this.camera);
    return { x: (projected.x + 1) * this.width / 2, y: (1 - projected.y) * this.height / 2 };
  }

  public render(state: GameState, events: GameEvent[], deltaSeconds: number, selectedSlot: string | null): void {
    this.synchronizeBuildings(state.buildings);
    this.synchronizeEnemies(state);
    for (const event of events) this.presentEvent(state, event);
    const wallTotal = state.wallHp + state.wallShield;
    if (this.previousWall !== null && wallTotal < this.previousWall) this.wallFlash = 0.24;
    this.previousWall = wallTotal;
    this.wallFlash = Math.max(0, this.wallFlash - deltaSeconds);
    (this.wall.material as MeshStandardMaterial).color.set(this.wallFlash > 0 ? 0xf67f70 : isWallInDanger(state) ? 0xb47673 : 0xc3c6c8);
    for (const [slotId, tile] of this.tiles) (tile.material as MeshStandardMaterial).color.set(slotId === selectedSlot ? 0xeed58b : 0x899287);
    for (let index = this.effects.length - 1; index >= 0; index -= 1) {
      const effect = this.effects[index]!;
      effect.ttl -= deltaSeconds;
      if (effect.ttl <= 0) {
        this.scene.remove(effect.object);
        this.disposeObject(effect.object);
        this.effects.splice(index, 1);
      } else if (effect.object.userData.reward) effect.object.position.y += deltaSeconds * 1.6;
    }
    this.renderer.render(this.scene, this.camera);
  }

  public reset(): void {
    for (const object of [...this.buildings.values(), ...this.enemies.values(), ...this.effects.map((effect) => effect.object)]) {
      this.scene.remove(object);
      this.disposeObject(object);
    }
    this.buildings.clear();
    this.enemies.clear();
    this.effects.length = 0;
    this.previousWall = null;
    this.wallFlash = 0;
  }

  public dispose(): void {
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.scene.traverse((object) => { if (object instanceof DirectionalLight) object.shadow.dispose(); });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private synchronizeBuildings(buildings: BuildingState[]): void {
    for (const building of buildings) {
      if (this.buildings.has(building.id)) continue;
      const group = new Group();
      const city = building.kind === "main_city";
      group.add(this.meshBox(city ? 1.5 : 0.85, city ? 1.15 : 1.1, city ? 1.2 : 0.85, 0xcbd0d2, new Vector3(0, city ? 0.63 : 0.6, 0)));
      const roof = new Mesh(this.geometry(new CylinderGeometry(0, city ? 1.03 : 0.65, 0.55, 4)), this.standard(0x7992b5));
      roof.rotation.y = Math.PI / 4;
      roof.position.y = city ? 1.48 : 1.4;
      roof.castShadow = true;
      group.add(roof);
      if (!city) group.add(this.meshBox(0.14, 0.14, 0.8, 0xd6bc8a, new Vector3(0, 1.18, -0.25)));
      group.position.copy(CAMP_POSITIONS.get(building.slotId)!);
      this.buildings.set(building.id, group);
      this.scene.add(group);
    }
  }

  private synchronizeEnemies(state: GameState): void {
    const active = new Set(state.enemies.map((enemy) => enemy.id));
    for (const [id, object] of this.enemies) {
      if (!active.has(id)) { this.scene.remove(object); this.disposeObject(object); this.enemies.delete(id); }
    }
    for (const enemy of state.enemies) {
      let group = this.enemies.get(enemy.id);
      if (!group) {
        const view = whiteboxEnemy(enemy.definitionId);
        group = new Group();
        group.add(this.meshBox(0.38, 0.65, 0.28, view.color, new Vector3(0, 0.55, 0)));
        group.add(this.meshBox(0.3, 0.28, 0.3, 0xe2e0df, new Vector3(0, 1.02, 0)));
        group.add(this.meshBox(0.13, 0.3, 0.16, view.color, new Vector3(-0.12, 0.16, 0)));
        group.add(this.meshBox(0.13, 0.3, 0.16, view.color, new Vector3(0.12, 0.16, 0)));
        group.scale.setScalar(view.scale);
        this.enemies.set(enemy.id, group);
        this.scene.add(group);
      }
      group.position.copy(enemyPosition(enemy.id, enemy.position));
      // Driven by effective simulation time; all battle motion stops in frozen phases.
      const phase = state.effectiveBattleTimeSeconds * (enemy.atWall ? 9 : 6) + Number(enemy.id.slice(enemy.id.lastIndexOf("-") + 1));
      group.rotation.x = enemy.atWall ? Math.sin(phase) * 0.15 : Math.sin(phase) * 0.06;
      group.position.y = enemy.atWall ? 0 : Math.abs(Math.sin(phase)) * 0.04;
    }
  }

  private presentEvent(state: GameState, event: GameEvent): void {
    if (event.type === "tower_attack") {
      const source = state.buildings.find((building) => building.id === event.buildingId) ?? (event.buildingId === state.hero?.id ? state.buildings.find((building) => building.kind === "main_city") : undefined);
      if (!source) return;
      const from = CAMP_POSITIONS.get(source.slotId)!.clone().add(new Vector3(0, 1.25, 0));
      const to = enemyPosition(event.targetId, event.targetPosition).add(new Vector3(0, 0.5, 0));
      const direction = to.clone().sub(from);
      const shot = new Mesh(this.geometry(new CylinderGeometry(0.025, 0.025, direction.length(), 5)), this.material(new MeshBasicMaterial({ color: 0xffdd90 })));
      shot.position.copy(from).add(to).multiplyScalar(0.5);
      shot.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize());
      this.addEffect(shot, 0.12);
    } else if (event.type === "enemy_hit" || event.type === "enemy_defeated") {
      // Event carries the last anchor even if the simulation removed this enemy.
      const position = enemyPosition(event.enemyId, event.position).add(new Vector3(0, 0.5, 0));
      const death = event.type === "enemy_defeated";
      const object = new Mesh(this.geometry(new SphereGeometry(death ? 0.32 : 0.18, 6, 4)), this.material(new MeshBasicMaterial({ color: death ? 0xd6bd77 : 0xfff0d2, wireframe: death })));
      object.position.copy(position);
      this.addEffect(object, death ? 0.4 : 0.12);
      if (death) {
        const definitionId = event.enemyId.slice(0, event.enemyId.lastIndexOf("-"));
        const reward = starterCatalog.enemies.find((enemy) => enemy.id === definitionId)?.goldReward ?? 0;
        if (reward > 0) {
          const coin = new Mesh(this.geometry(new CylinderGeometry(0.12, 0.12, 0.05, 8)), this.standard(0xffcc61));
          coin.rotation.x = Math.PI / 2;
          coin.position.copy(position);
          coin.userData.reward = reward;
          this.addEffect(coin, 0.7);
        }
      }
    }
  }

  private addEffect(object: Object3D, duration: number): void {
    this.scene.add(object);
    this.effects.push({ object, ttl: duration });
  }

  private geometry<T extends BufferGeometry>(geometry: T): T { this.geometries.add(geometry); return geometry; }
  private material<T extends Material>(material: T): T { this.materials.add(material); return material; }
  private standard(color: number): MeshStandardMaterial { return this.material(new MeshStandardMaterial({ color: new Color(color), roughness: 0.85 })); }
  private meshBox(width: number, height: number, depth: number, color: number, position: Vector3): Mesh {
    const mesh = new Mesh(this.geometry(new BoxGeometry(width, height, depth)), this.standard(color));
    mesh.position.copy(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
  private box(width: number, height: number, depth: number, color: number, position: Vector3): Mesh {
    const mesh = this.meshBox(width, height, depth, color, position);
    this.scene.add(mesh);
    return mesh;
  }
  private disposeObject(object: Object3D): void {
    object.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.geometry.dispose();
      this.geometries.delete(child.geometry);
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) { material.dispose(); this.materials.delete(material); }
    });
  }
}

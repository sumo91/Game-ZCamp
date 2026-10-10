import {
  BoxGeometry, Color, CylinderGeometry, DirectionalLight, Group, HemisphereLight,
  Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, OctahedronGeometry, OrthographicCamera, PlaneGeometry,
  Raycaster, Scene, SphereGeometry, Vector2, Vector3, WebGLRenderer,
  AnimationMixer, LoopOnce, LoopRepeat, PCFShadowMap, ACESFilmicToneMapping,
} from "three";
import type { AnimationAction, BufferGeometry, Material, Object3D } from "three";
import { starterCatalog } from "../core/content";
import type { BuildingState, GameEvent, GameState } from "../core/types";
import { CAMP_POSITIONS, enemyDisplayPosition } from "./coordinates";
import { isWallInDanger, whiteboxEnemy } from "./whiteboxCatalog";
import { buildingAsset, enemyAsset, type AnimationSemantic } from "./assetCatalog";
import type { ModelLibrary } from "./ModelLibrary";
import { SiegeFeedback } from "./siegeFeedback";
import { ArcaneFeedback } from "./arcaneFeedback";

type Effect = { object: Object3D; ttl: number; duration: number; from?: Vector3; to?: Vector3 };
type EnemyView = { object: Object3D; definitionId: string; mixer?: AnimationMixer; actions?: Map<AnimationSemantic, AnimationAction>; current?: AnimationSemantic; interrupt: number; dying: number | null; atWall: boolean; slowMultiplier?: number };

/** Owns all preview GPU resources, picking and event-driven presentation. */
export class Battlefield {
  private readonly renderer = new WebGLRenderer({ antialias: true, alpha: false });
  private readonly scene = new Scene();
  private readonly siege = new SiegeFeedback(this.scene);
  private readonly arcane = new ArcaneFeedback(this.scene);
  private readonly camera = new OrthographicCamera(-6, 6, 8, -8, 0.1, 100);
  private readonly raycaster = new Raycaster();
  private readonly pickers: Mesh[] = [];
  private readonly tiles = new Map<string, Mesh>();
  private readonly buildings = new Map<string, Object3D>();
  private readonly enemies = new Map<string, EnemyView>();
  private readonly enemyAnchors = new Map<string, { definitionId: string; position: number }>();
  private library: ModelLibrary | null = null;
  private readonly effects: Effect[] = [];
  private readonly geometries = new Set<BufferGeometry>();
  private readonly materials = new Set<Material>();
  private wall: Object3D;
  private readonly environment = new Group();
  private width = 1;
  private height = 1;
  private previousWall: number | null = null;
  private wallFlash = 0;

  public constructor(private readonly host: HTMLElement) {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x222330);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.setAttribute("aria-label", "3D 白模战场");
    this.host.prepend(this.renderer.domElement);
    this.camera.position.set(0, 23, 14);
    this.camera.lookAt(0, 0, -2);
    this.scene.add(new HemisphereLight(0xd2ddf0, 0x5b5649, 1.7));
    const sun = new DirectionalLight(0xffe8c4, 3.2);
    sun.position.set(-5, 14, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -9;
    sun.shadow.camera.right = 9;
    sun.shadow.camera.top = 13;
    sun.shadow.camera.bottom = -13;
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.025;
    this.scene.add(sun);
    this.box(12, 0.12, 12, 0x605c73, new Vector3(0, -0.12, -6));
    this.box(12, 0.12, 8.2, 0x749051, new Vector3(0, -0.12, 4.1));
    this.wall = new Group();
    this.wall.add(this.box(11.4, 0.9, 0.55, 0xc3c6c8, new Vector3(0, 0.45, 0)));
    for (let index = 0; index < 12; index += 1) this.wall.add(this.box(0.48, 0.3, 0.65, 0xd3d6d6, new Vector3(-5.25 + index * 0.95, 1.02, 0)));
    this.scene.add(this.wall, this.environment);
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

  public setModels(library: ModelLibrary): void {
    this.reset();
    this.scene.remove(this.wall);
    this.disposeObject(this.wall);
    this.disposeObject(this.environment);
    this.environment.clear();
    this.library = library;
    this.wall = library.createStaticBatch("wall", Array.from({ length: 6 }, (_, index) => new Matrix4().makeTranslation(-4.75 + index * 1.9, 0, 0)));
    this.scene.add(this.wall);
    this.environment.userData.sharedAsset = true;
    this.environment.add(library.createStaticBatch("plot", [...CAMP_POSITIONS.values()].map((position) => new Matrix4().makeTranslation(position.x, position.y, position.z))));
    for (const [slotId, position] of CAMP_POSITIONS) {
      const oldTile = this.tiles.get(slotId)!;
      this.scene.remove(oldTile);
      this.disposeObject(oldTile);
      const selection = new Mesh(this.geometry(new PlaneGeometry(1.86, 1.58)), this.material(new MeshBasicMaterial({ color: 0xffd774, transparent: true, opacity: .24, depthWrite: false })));
      selection.rotation.x = -Math.PI / 2;
      selection.position.copy(position).y = .063;
      selection.visible = false;
      this.tiles.set(slotId, selection);
      this.scene.add(selection);
    }
    const trees = [[-5.35, 2.8], [5.35, 3.3], [-5.3, -2.7], [5.3, -5.7]].map(([x, z]) => new Matrix4().makeTranslation(x!, 0, z!).scale(new Vector3(.85, .85, .85)));
    const rocks = [[-5.35, .8], [5.35, -.9], [-5.2, -5.1], [5.25, -8.3]].map(([x, z]) => new Matrix4().makeTranslation(x!, 0, z!));
    this.environment.add(library.createStaticBatch("tree", trees), library.createStaticBatch("rocks", rocks));
    this.renderer.domElement.setAttribute("aria-label", "3D 精修美术样板战场");
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
    const hits = this.raycaster.intersectObjects([...this.buildings.values(), ...this.pickers], true);
    for (const hit of hits) {
      let object: Object3D | null = hit.object;
      while (object) { if (object.userData.slotId) return object.userData.slotId as string; object = object.parent; }
    }
    return null;
  }

  public projectSlot(slotId: string): { x: number; y: number } {
    const model = [...this.buildings.values()].find((building) => building.userData.slotId === slotId);
    const projected = this.anchorPosition(model, "label_anchor", CAMP_POSITIONS.get(slotId)!.clone().add(new Vector3(0, .025, .5))).project(this.camera);
    return { x: (projected.x + 1) * this.width / 2, y: (1 - projected.y) * this.height / 2 };
  }

  public render(state: GameState, events: GameEvent[], deltaSeconds: number, selectedSlot: string | null): void {
    for (const event of events) if (event.type === "enemy_spawned") this.enemyAnchors.set(event.enemyId, { definitionId: event.definitionId, position: 0 });
    for (const enemy of state.enemies) this.enemyAnchors.set(enemy.id, { definitionId: enemy.definitionId, position: enemy.position });
    this.synchronizeBuildings(state.buildings);
    this.synchronizeEnemies(state);
    this.arcane.synchronize(state);
    for (const event of events) this.presentEvent(state, event);
    this.siege.advance(state, deltaSeconds, (id, position) => this.enemyHitPosition(id, position));
    const active = new Set(state.enemies.map((enemy) => enemy.id));
    for (const [id, view] of this.enemies) {
      if (view.dying !== null) view.dying -= deltaSeconds;
      else if (!active.has(id)) view.dying = 0;
      if (view.dying !== null && view.dying <= 0) {
        this.scene.remove(view.object);
        view.mixer?.stopAllAction();
        view.mixer?.uncacheRoot(view.object);
        this.disposeObject(view.object);
        this.enemies.delete(id);
        this.enemyAnchors.delete(id);
      } else {
        view.interrupt = Math.max(0, view.interrupt - deltaSeconds);
        if (view.dying === null && view.interrupt === 0) {
          this.play(view, "walk");
          const walk = view.actions?.get("walk");
          if (walk) {
            walk.paused = view.atWall;
            if (view.atWall) walk.time = 0;
          }
        }
        if (view.mixer) {
          view.mixer.timeScale = view.current === "walk" ? view.slowMultiplier ?? 1 : 1;
          view.mixer.update(deltaSeconds);
        }
      }
    }
    const wallTotal = state.wallHp + state.wallShield;
    if (this.previousWall !== null && wallTotal < this.previousWall) this.wallFlash = 0.24;
    this.previousWall = wallTotal;
    this.wallFlash = Math.max(0, this.wallFlash - deltaSeconds);
    const wallTint = this.wallFlash > 0 ? 0xff9b87 : isWallInDanger(state) ? 0xd3847f : this.library ? 0xffffff : 0xc3c6c8;
    this.wall.traverse((object) => { if (object instanceof Mesh && object.material instanceof MeshStandardMaterial) object.material.color.set(wallTint); });
    for (const [slotId, tile] of this.tiles) {
      if (this.library) tile.visible = slotId === selectedSlot;
      else (tile.material as MeshStandardMaterial).color.set(slotId === selectedSlot ? 0xeed58b : 0x899287);
    }
    for (let index = this.effects.length - 1; index >= 0; index -= 1) {
      const effect = this.effects[index]!;
      effect.ttl -= deltaSeconds;
      if (effect.ttl <= 0) {
        this.scene.remove(effect.object);
        this.disposeObject(effect.object);
        this.effects.splice(index, 1);
      } else if (effect.from && effect.to) {
        const progress = 1 - effect.ttl / effect.duration;
        effect.object.position.lerpVectors(effect.from, effect.to, progress);
      } else if (effect.object.userData.reward) effect.object.position.y += deltaSeconds * 1.6;
    }
    this.arcane.advance(deltaSeconds);
    this.renderer.render(this.scene, this.camera);
    // Read-only presentation evidence in the development sample, never a core handle.
    this.host.dataset.presentation = JSON.stringify({ models: this.library !== null, enemies: [...this.enemies].map(([id, view]) => ({ id, definitionId: view.definitionId, clip: view.current ?? "development", dying: view.dying !== null, time: view.mixer?.time ?? 0 })), effects: this.effects.length, arcane: this.arcane.describe(), calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles, geometries: this.renderer.info.memory.geometries, textures: this.renderer.info.memory.textures });
  }

  public reset(): void {
    this.siege.reset();
    this.arcane.reset();
    for (const view of this.enemies.values()) { view.mixer?.stopAllAction(); view.mixer?.uncacheRoot(view.object); }
    for (const object of [...this.buildings.values(), ...[...this.enemies.values()].map((view) => view.object), ...this.effects.map((effect) => effect.object)]) {
      this.scene.remove(object);
      this.disposeObject(object);
    }
    this.buildings.clear();
    this.enemies.clear();
    this.enemyAnchors.clear();
    this.effects.length = 0;
    this.previousWall = null;
    this.wallFlash = 0;
  }

  public dispose(): void {
    this.reset();
    this.siege.dispose();
    this.arcane.dispose();
    this.disposeObject(this.wall);
    this.disposeObject(this.environment);
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.scene.traverse((object) => { if (object instanceof DirectionalLight) object.shadow.dispose(); });
    this.renderer.dispose();
    this.renderer.domElement.remove();
    delete this.host.dataset.presentation;
  }

  private synchronizeBuildings(buildings: BuildingState[]): void {
    const active = new Set(buildings.map((building) => building.id));
    for (const [id, object] of this.buildings) {
      if (!active.has(id)) { this.scene.remove(object); this.disposeObject(object); this.buildings.delete(id); }
    }
    for (const building of buildings) {
      const signature = `${building.growthDefinitionId ?? building.kind}:${building.level}`;
      const previous = this.buildings.get(building.id);
      if (previous?.userData.signature === signature) continue;
      if (previous) { this.scene.remove(previous); this.disposeObject(previous); }
      const asset = buildingAsset(building.growthDefinitionId ?? "main_city", building.level);
      const group = asset && this.library ? this.library.create(asset).object : this.makeWhiteboxBuilding(building);
      group.userData.signature = signature;
      group.userData.slotId = building.slotId;
      group.position.copy(CAMP_POSITIONS.get(building.slotId)!);
      this.buildings.set(building.id, group);
      this.scene.add(group);
    }
  }

  private makeWhiteboxBuilding(building: BuildingState): Group {
    const group = new Group();
    const id = building.growthDefinitionId ?? "main_city";
    const addBox = (w: number, h: number, d: number, color: number, x: number, y: number, z: number) => {
      const mesh = this.meshBox(w, h, d, color, new Vector3(x, y, z));
      group.add(mesh);
      return mesh;
    };
    const addCylinder = (top: number, bottom: number, height: number, color: number, x: number, y: number, z: number, sides = 8) => {
      const mesh = new Mesh(this.geometry(new CylinderGeometry(top, bottom, height, sides)), this.standard(color));
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      group.add(mesh);
      return mesh;
    };
    const stone = 0xcbd0d2;
    const blue = 0x7992b5;
    const gold = 0xd6bc8a;
    addBox(id === "main_city" ? 1.6 : 1.35, 0.15, id === "main_city" ? 1.35 : 1.1, 0x8a9395, 0, 0.17, 0);
    if (id === "main_city") {
      addBox(1.5, 1.15, 1.2, stone, 0, 0.8, 0);
      const roof = addCylinder(0, 1.03, 0.55, blue, 0, 1.65, 0, 4);
      roof.rotation.y = Math.PI / 4;
    } else if (id === "lumberyard") {
      addBox(1.15, 0.55, 0.8, 0xa1815b, 0, 0.48, 0);
      const roof = addCylinder(0, 0.82, 0.42, blue, 0, 0.98, 0, 4);
      roof.rotation.y = Math.PI / 4;
      for (const x of [-0.35, 0, 0.35]) {
        const log = addCylinder(0.13, 0.13, 0.62, 0x815e3c, x, 0.36, 0.57);
        log.rotation.x = Math.PI / 2;
      }
    } else {
      addBox(0.8, 0.95, 0.8, stone, 0, 0.72, 0);
      if (id === "arrow_tower") {
        const roof = addCylinder(0, 0.65, 0.55, blue, 0, 1.5, 0, 4);
        roof.rotation.y = Math.PI / 4;
        addBox(0.14, 0.14, 0.8, gold, 0, 1.23, -0.25);
      } else if (id === "machine_gun") {
        addBox(0.85, 0.3, 0.6, blue, 0, 1.35, 0);
        for (const x of [-0.2, 0.2]) {
          const barrel = addCylinder(0.07, 0.07, 0.9, gold, x, 1.4, -0.35);
          barrel.rotation.x = Math.PI / 2;
        }
      } else if (id === "cannon") {
        const barrel = addCylinder(0.18, 0.24, 0.85, 0x6e717b, 0, 1.35, -0.2);
        barrel.rotation.x = Math.PI / 2.6;
        addCylinder(0.4, 0.45, 0.18, gold, 0, 1.17, 0);
      } else if (id === "frost") {
        const crystal = new Mesh(this.geometry(new OctahedronGeometry(0.45)), this.standard(0x92d6e2));
        crystal.position.y = 1.6;
        crystal.scale.y = 1.35;
        crystal.castShadow = true;
        group.add(crystal);
      } else if (id === "electric") {
        addCylinder(0.14, 0.35, 0.45, 0x9276bd, 0, 1.38, 0);
        addBox(0.8, 0.1, 0.12, gold, 0, 1.7, 0);
        for (const x of [-0.35, 0.35]) addCylinder(0, 0.12, 0.38, 0xc5aedf, x, 1.87, 0, 4);
      }
    }
    // Gold bands make each real level visible without changing the picking footprint.
    for (let level = 2; level <= building.level; level += 1) addBox(1.02, 0.07, 0.92, gold, 0, 0.3 + (level - 2) * 0.17, 0);
    return group;
  }

  private synchronizeEnemies(state: GameState): void {
    for (const enemy of state.enemies) {
      let view = this.enemies.get(enemy.id);
      if (!view) {
        view = this.makeEnemy(enemy.id, enemy.definitionId);
      }
      const group = view.object;
      group.position.copy(enemyDisplayPosition(enemy.id, enemy.position, enemy.definitionId));
      view.atWall = enemy.atWall;
      view.slowMultiplier = Math.min(1, ...(enemy.growthSlowStates ?? []).filter((slow) => slow.remainingSeconds > .000001).map((slow) => slow.multiplier));
      // Driven by effective simulation time; all battle motion stops in frozen phases.
      const phase = state.effectiveBattleTimeSeconds * (enemy.atWall ? 9 : 6) + Number(enemy.id.slice(enemy.id.lastIndexOf("-") + 1));
      if (!view.mixer) {
        group.rotation.x = enemy.atWall ? Math.sin(phase) * 0.15 : Math.sin(phase) * 0.06;
        group.position.y = enemy.atWall ? 0 : Math.abs(Math.sin(phase)) * 0.04;
      }
    }
  }

  private makeEnemy(id: string, definitionId: string): EnemyView {
    let view: EnemyView;
    const asset = enemyAsset(definitionId);
    if (asset && this.library) {
      const instance = this.library.create(asset);
      const mixer = new AnimationMixer(instance.object);
      view = { object: instance.object, definitionId, mixer, actions: new Map(instance.clips.map((clip) => [clip.name as AnimationSemantic, mixer.clipAction(clip)])), interrupt: 0, dying: null, atWall: false };
      this.play(view, "walk");
      let phase = 0;
      for (const character of id) phase = (phase * 31 + character.charCodeAt(0)) % 997;
      mixer.update(phase / 997 * .8);
    } else {
      const style = whiteboxEnemy(definitionId);
      const group = new Group();
      group.add(this.meshBox(0.38, 0.65, 0.28, style.color, new Vector3(0, 0.55, 0)));
      group.add(this.meshBox(0.3, 0.28, 0.3, 0xe2e0df, new Vector3(0, 1.02, 0)));
      group.add(this.meshBox(0.13, 0.3, 0.16, style.color, new Vector3(-0.12, 0.16, 0)));
      group.add(this.meshBox(0.13, 0.3, 0.16, style.color, new Vector3(0.12, 0.16, 0)));
      group.scale.setScalar(style.scale);
      view = { object: group, definitionId, interrupt: 0, dying: null, atWall: false };
    }
    this.enemies.set(id, view);
    this.scene.add(view.object);
    return view;
  }

  private presentEvent(state: GameState, event: GameEvent): void {
    if (event.type === "tower_attack") {
      const source = state.buildings.find((building) => building.id === event.buildingId) ?? (event.buildingId === state.hero?.id ? state.buildings.find((building) => building.kind === "main_city") : undefined);
      if (!source) return;
      const from = this.anchorPosition(this.buildings.get(source.id), "attack_anchor", CAMP_POSITIONS.get(source.slotId)!.clone().add(new Vector3(0, 1.25, 0)));
      if (this.siege.present(event, from, (id, position) => this.enemyHitPosition(id, position))) return;
      const to = this.enemyHitPosition(event.targetId, event.targetPosition);
      if (this.arcane.attack(event.towerDefinitionId, event.buildingId, event.targetId, from, to)) return;
      const direction = to.clone().sub(from);
      const shot = new Mesh(this.geometry(new CylinderGeometry(0.018, 0.025, .4, 5)), this.material(new MeshBasicMaterial({ color: 0xffdd90 })));
      shot.position.copy(from);
      shot.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize());
      this.addEffect(shot, 0.15, from, to);
    } else if (event.type === "tower_special") {
      this.siege.present(event, undefined, (id, position) => this.enemyHitPosition(id, position));
      if (event.effect === "弹射") {
        const position = event.targetPosition ?? this.enemyAnchors.get(event.targetId)?.position;
        if (position !== undefined) this.arcane.chain(event.buildingId, event.targetId, this.enemyHitPosition(event.targetId, position));
      }
    } else if (event.type === "enemy_wall_attack") {
      const view = this.enemies.get(event.enemyId);
      if (view?.dying === null) {
        view.interrupt = Math.min(.8, event.intervalSeconds * .8);
        this.play(view, "attack", true);
        view.actions?.get("attack")?.setEffectiveTimeScale(.8 / view.interrupt);
      }
      const position = enemyDisplayPosition(event.enemyId, 1, event.definitionId);
      position.set(position.x, .68, -.38);
      const heavy = event.definitionId === "brute";
      const strike = new Mesh(this.geometry(new SphereGeometry(heavy ? .23 : .10, 6, 4)), this.material(new MeshBasicMaterial({ color: heavy ? 0xf29d6a : 0xf7d6b0, wireframe: true })));
      strike.position.copy(position);
      this.addEffect(strike, heavy ? .25 : .15);
    } else if (event.type === "enemy_hit" || event.type === "enemy_defeated") {
      // Event carries the last anchor even if the simulation removed this enemy.
      const cached = this.enemyAnchors.get(event.enemyId);
      // A target can spawn and die within the same batch of fixed steps.
      const view = this.enemies.get(event.enemyId) ?? (cached ? this.makeEnemy(event.enemyId, cached.definitionId) : undefined);
      if (cached) cached.position = event.position;
      const death = event.type === "enemy_defeated";
      const position = this.enemyHitPosition(event.enemyId, event.position);
      if (death && view) view.object.position.copy(enemyDisplayPosition(event.enemyId, event.position, view.definitionId));
      const object = new Mesh(this.geometry(new SphereGeometry(death ? 0.32 : 0.18, 6, 4)), this.material(new MeshBasicMaterial({ color: death ? 0xd6bd77 : 0xfff0d2, wireframe: death })));
      object.position.copy(position);
      this.addEffect(object, death ? 0.4 : 0.12);
      if (death) {
        if (view) { view.dying = .95; this.play(view, "death"); }
        const reward = starterCatalog.enemies.find((enemy) => enemy.id === cached?.definitionId)?.goldReward ?? 0;
        if (reward > 0) {
          const coin = new Mesh(this.geometry(new CylinderGeometry(0.12, 0.12, 0.05, 8)), this.standard(0xffcc61));
          coin.rotation.x = Math.PI / 2;
          coin.position.copy(position);
          coin.userData.reward = reward;
          this.addEffect(coin, 0.7);
        }
      } else if (view?.dying === null) { view.interrupt = .3; this.play(view, "hit"); }
    }
  }

  private anchorPosition(object: Object3D | undefined, name: string, fallback: Vector3): Vector3 {
    const anchor = object?.getObjectByName(name);
    if (!anchor) return fallback;
    object!.updateMatrixWorld(true);
    return anchor.getWorldPosition(new Vector3());
  }

  private enemyHitPosition(id: string, progress: number): Vector3 {
    const object = this.enemies.get(id)?.object;
    const eventPosition = enemyDisplayPosition(id, progress, this.enemyAnchors.get(id)?.definitionId ?? "walker");
    if (!object) return eventPosition.add(new Vector3(0, .65, 0));
    // A fixed-step batch may contain an earlier hit and a later final position.
    // Sample the event anchor without moving a living actor back along its path.
    const currentPosition = object.position.clone();
    object.position.copy(eventPosition);
    const anchor = this.anchorPosition(object, "hit_anchor", eventPosition.add(new Vector3(0, .65, 0)));
    object.position.copy(currentPosition);
    return anchor;
  }

  private play(view: EnemyView, semantic: AnimationSemantic, restart = false): void {
    if (view.current === semantic && !restart) return;
    const next = view.actions?.get(semantic);
    if (!next) return;
    const previous = view.current ? view.actions?.get(view.current) : undefined;
    previous?.fadeOut(.08);
    next.reset().setLoop(semantic === "walk" ? LoopRepeat : LoopOnce, semantic === "walk" ? Infinity : 1);
    next.paused = false;
    next.setEffectiveTimeScale(1);
    next.clampWhenFinished = semantic === "death";
    next.fadeIn(.08).play();
    view.current = semantic;
  }

  private addEffect(object: Object3D, duration: number, from?: Vector3, to?: Vector3): void {
    this.scene.add(object);
    this.effects.push({ object, ttl: duration, duration, from, to });
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
    if (object.userData.sharedAsset) { this.library?.releaseInstance(object); return; }
    object.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.geometry.dispose();
      this.geometries.delete(child.geometry);
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) { material.dispose(); this.materials.delete(material); }
    });
  }
}

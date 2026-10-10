import { CylinderGeometry, Group, Mesh, MeshBasicMaterial, OctahedronGeometry, TorusGeometry, Vector3 } from "three";
import type { Object3D, Scene } from "three";
import type { GameState } from "../core/types";
import { enemyDisplayPosition } from "./coordinates";

type ArcaneEffect = { object: Object3D; remaining: number; duration: number; from?: Vector3; to?: Vector3; material?: MeshBasicMaterial[] };

/** Visual ice and rune feedback. It observes core targets/statuses and never settles combat. */
export class ArcaneFeedback {
  private readonly crystalGeometry = new OctahedronGeometry(.12, 0);
  private readonly ringGeometry = new TorusGeometry(.40, .028, 4, 12);
  private readonly boltGeometry = new CylinderGeometry(.045, .045, 1, 4);
  private readonly boltCoreGeometry = new CylinderGeometry(.015, .015, 1, 4);
  private readonly iceMaterial = new MeshBasicMaterial({ color: 0x74d0ef });
  private readonly runeMaterial = new MeshBasicMaterial({ color: 0xbf83ff });
  private readonly runeCoreMaterial = new MeshBasicMaterial({ color: 0xe8daff });
  private readonly slowed = new Map<string, Group>();
  private readonly chainAnchors = new Map<string, Vector3>();
  private readonly chainTargets = new Map<string, string[]>();
  private readonly effects: ArcaneEffect[] = [];

  public constructor(private readonly scene: Scene) {}

  public attack(towerId: string, buildingId: string, targetId: string, from: Vector3, to: Vector3): boolean {
    if (towerId === "electric") {
      this.lightning(from, to);
      this.chainAnchors.set(buildingId, to.clone());
      this.chainTargets.set(buildingId, [targetId]);
      return true;
    }
    if (towerId !== "frost") return false;
    const shard = new Mesh(this.crystalGeometry, this.iceMaterial);
    shard.scale.set(.85, 2.3, .85);
    shard.position.copy(from);
    shard.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), to.clone().sub(from).normalize());
    this.add(shard, .22, from.clone(), to.clone());
    const impactMaterial = this.fadeMaterial(this.iceMaterial);
    const impact = new Mesh(this.ringGeometry, impactMaterial);
    impact.rotation.x = Math.PI / 2;
    impact.position.copy(to).y = .08;
    this.add(impact, .32, undefined, undefined, [impactMaterial]);
    return true;
  }

  /** Called only for a core-selected secondary target, in the core's event order. */
  public chain(buildingId: string, targetId: string, to: Vector3): void {
    const from = this.chainAnchors.get(buildingId);
    if (!from) return;
    this.lightning(from, to);
    this.chainAnchors.set(buildingId, to.clone());
    this.chainTargets.get(buildingId)?.push(targetId);
  }

  public synchronize(state: GameState): void {
    const active = new Set<string>();
    for (const enemy of state.enemies) {
      if (!(enemy.growthSlowStates ?? []).some((slow) => slow.remainingSeconds > .000001)) continue;
      active.add(enemy.id);
      let group = this.slowed.get(enemy.id);
      if (!group) {
        group = new Group();
        const ring = new Mesh(this.ringGeometry, this.iceMaterial);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = .08;
        group.add(ring);
        for (let index = 0; index < 3; index += 1) {
          const shard = new Mesh(this.crystalGeometry, this.iceMaterial);
          const angle = index * Math.PI * 2 / 3;
          shard.position.set(Math.cos(angle) * .40, .20, Math.sin(angle) * .40);
          shard.scale.set(.7, 1.8, .7);
          group.add(shard);
        }
        this.scene.add(group);
        this.slowed.set(enemy.id, group);
      }
      group.position.copy(enemyDisplayPosition(enemy.id, enemy.position, enemy.definitionId));
    }
    for (const [id, group] of this.slowed) if (!active.has(id)) {
      this.scene.remove(group);
      this.slowed.delete(id);
    }
    const livingBuildings = new Set(state.buildings.map((building) => building.id));
    for (const id of this.chainAnchors.keys()) if (!livingBuildings.has(id)) {
      this.chainAnchors.delete(id);
      this.chainTargets.delete(id);
    }
  }

  /** delta is completed simulation time, including zero for every frozen phase. */
  public advance(deltaSeconds: number): void {
    for (let index = this.effects.length - 1; index >= 0; index -= 1) {
      const effect = this.effects[index]!;
      effect.remaining -= deltaSeconds;
      if (effect.remaining <= 0) {
        this.scene.remove(effect.object);
        effect.material?.forEach((material) => material.dispose());
        this.effects.splice(index, 1);
      } else {
        if (effect.from && effect.to) effect.object.position.lerpVectors(effect.from, effect.to, 1 - effect.remaining / effect.duration);
        // Hold the first third at full strength, then fade without advancing
        // during pauses. Each flash owns its materials, so attacks do not fade
        // one another or dim the real, persistent slow-state markers.
        effect.material?.forEach((material) => { material.opacity = Math.min(1, effect.remaining / (effect.duration * 2 / 3)); });
      }
    }
  }

  public describe(): { slowedIds: string[]; chains: Array<{ buildingId: string; targetIds: string[] }>; effects: number } {
    return { slowedIds: [...this.slowed.keys()], chains: [...this.chainTargets].map(([buildingId, targetIds]) => ({ buildingId, targetIds: [...targetIds] })), effects: this.effects.length };
  }

  public reset(): void {
    for (const group of this.slowed.values()) this.scene.remove(group);
    for (const effect of this.effects) {
      this.scene.remove(effect.object);
      effect.material?.forEach((material) => material.dispose());
    }
    this.slowed.clear();
    this.effects.length = 0;
    this.chainAnchors.clear();
    this.chainTargets.clear();
  }

  public dispose(): void {
    this.reset();
    for (const resource of [this.crystalGeometry, this.ringGeometry, this.boltGeometry, this.boltCoreGeometry, this.iceMaterial, this.runeMaterial, this.runeCoreMaterial]) resource.dispose();
  }

  private lightning(from: Vector3, to: Vector3): void {
    const group = new Group();
    const direction = to.clone().sub(from);
    const side = new Vector3(-direction.z, 0, direction.x).normalize().multiplyScalar(.14);
    const points = [from.clone(), from.clone().lerp(to, .3).add(side).add(new Vector3(0, .25, 0)), from.clone().lerp(to, .56).sub(side).add(new Vector3(0, .35, 0)), from.clone().lerp(to, .78).add(side.clone().multiplyScalar(.65)).add(new Vector3(0, .20, 0)), to.clone()];
    const outerMaterial = this.fadeMaterial(this.runeMaterial);
    const coreMaterial = this.fadeMaterial(this.runeCoreMaterial);
    for (let index = 1; index < points.length; index += 1) {
      const start = points[index - 1]!;
      const end = points[index]!;
      const delta = end.clone().sub(start);
      const bolt = new Mesh(this.boltGeometry, outerMaterial);
      bolt.position.copy(start).add(end).multiplyScalar(.5);
      bolt.scale.y = delta.length();
      bolt.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), delta.normalize());
      group.add(bolt);
      const core = new Mesh(this.boltCoreGeometry, coreMaterial);
      core.position.copy(bolt.position);
      core.scale.copy(bolt.scale);
      core.quaternion.copy(bolt.quaternion);
      group.add(core);
    }
    const spark = new Mesh(this.crystalGeometry, coreMaterial);
    spark.position.copy(to);
    spark.scale.setScalar(.85);
    group.add(spark);
    this.add(group, .34, undefined, undefined, [outerMaterial, coreMaterial]);
  }

  private fadeMaterial(source: MeshBasicMaterial): MeshBasicMaterial {
    const material = source.clone();
    material.transparent = true;
    material.depthWrite = false;
    return material;
  }

  private add(object: Object3D, duration: number, from?: Vector3, to?: Vector3, material?: MeshBasicMaterial[]): void {
    this.scene.add(object);
    this.effects.push({ object, remaining: duration, duration, from, to, material });
  }
}

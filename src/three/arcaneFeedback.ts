import { CylinderGeometry, Group, Mesh, MeshBasicMaterial, OctahedronGeometry, TorusGeometry, Vector3 } from "three";
import type { Object3D, Scene } from "three";
import type { GameState } from "../core/types";
import { enemyDisplayPosition } from "./coordinates";

type ArcaneEffect = { object: Object3D; remaining: number; duration: number; from?: Vector3; to?: Vector3 };

/** Visual ice and rune feedback. It observes core targets/statuses and never settles combat. */
export class ArcaneFeedback {
  private readonly crystalGeometry = new OctahedronGeometry(.12, 0);
  private readonly ringGeometry = new TorusGeometry(.32, .023, 4, 12);
  private readonly boltGeometry = new CylinderGeometry(.018, .018, 1, 4);
  private readonly iceMaterial = new MeshBasicMaterial({ color: 0x74d0ef });
  private readonly runeMaterial = new MeshBasicMaterial({ color: 0xae91ef });
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
    shard.scale.set(.65, 1.8, .65);
    shard.position.copy(from);
    shard.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), to.clone().sub(from).normalize());
    this.add(shard, .13, from.clone(), to.clone());
    const impact = new Mesh(this.ringGeometry, this.iceMaterial);
    impact.rotation.x = Math.PI / 2;
    impact.position.copy(to).y = .055;
    this.add(impact, .20);
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
        ring.position.y = .025;
        group.add(ring);
        for (let index = 0; index < 3; index += 1) {
          const shard = new Mesh(this.crystalGeometry, this.iceMaterial);
          const angle = index * Math.PI * 2 / 3;
          shard.position.set(Math.cos(angle) * .30, .14, Math.sin(angle) * .30);
          shard.scale.set(.5, 1.3, .5);
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
        this.effects.splice(index, 1);
      } else if (effect.from && effect.to) {
        effect.object.position.lerpVectors(effect.from, effect.to, 1 - effect.remaining / effect.duration);
      }
    }
  }

  public describe(): { slowedIds: string[]; chains: Array<{ buildingId: string; targetIds: string[] }>; effects: number } {
    return { slowedIds: [...this.slowed.keys()], chains: [...this.chainTargets].map(([buildingId, targetIds]) => ({ buildingId, targetIds: [...targetIds] })), effects: this.effects.length };
  }

  public reset(): void {
    for (const group of this.slowed.values()) this.scene.remove(group);
    for (const effect of this.effects) this.scene.remove(effect.object);
    this.slowed.clear();
    this.effects.length = 0;
    this.chainAnchors.clear();
    this.chainTargets.clear();
  }

  public dispose(): void {
    this.reset();
    for (const resource of [this.crystalGeometry, this.ringGeometry, this.boltGeometry, this.iceMaterial, this.runeMaterial, this.runeCoreMaterial]) resource.dispose();
  }

  private lightning(from: Vector3, to: Vector3): void {
    const group = new Group();
    const direction = to.clone().sub(from);
    const side = new Vector3(-direction.z, 0, direction.x).normalize().multiplyScalar(.09);
    const points = [from.clone(), from.clone().lerp(to, .3).add(side), from.clone().lerp(to, .56).sub(side), from.clone().lerp(to, .78).add(side.clone().multiplyScalar(.65)), to.clone()];
    for (let index = 1; index < points.length; index += 1) {
      const start = points[index - 1]!;
      const end = points[index]!;
      const delta = end.clone().sub(start);
      const bolt = new Mesh(this.boltGeometry, this.runeMaterial);
      bolt.position.copy(start).add(end).multiplyScalar(.5);
      bolt.scale.y = delta.length();
      bolt.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), delta.normalize());
      group.add(bolt);
    }
    const spark = new Mesh(this.crystalGeometry, this.runeCoreMaterial);
    spark.position.copy(to);
    spark.scale.setScalar(.85);
    group.add(spark);
    this.add(group, .17);
  }

  private add(object: Object3D, duration: number, from?: Vector3, to?: Vector3): void {
    this.scene.add(object);
    this.effects.push({ object, remaining: duration, duration, from, to });
  }
}

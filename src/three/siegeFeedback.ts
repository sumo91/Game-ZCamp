import { ConeGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, RingGeometry, SphereGeometry, Vector3 } from "three";
import type { GameEvent, GameState } from "../core/types";
import type { Object3D, Scene } from "three";

type SiegeShot = { object: Object3D; age: number; duration: number; from?: Vector3; to?: Vector3; arc?: number; expand?: boolean };
type AnchorLookup = (id: string, position: number) => Vector3;

/** Visual-only siege feedback. Every endpoint is a core event snapshot; no hit is calculated here. */
export class SiegeFeedback {
  private readonly boltGeometry = new CylinderGeometry(.021, .035, .38, 5);
  private readonly ballGeometry = new SphereGeometry(.12, 8, 6);
  private readonly flashGeometry = new ConeGeometry(.12, .32, 5);
  private readonly ringGeometry = new RingGeometry(.15, .21, 12);
  private readonly flameGeometry = new ConeGeometry(.09, .31, 5);
  private readonly boltMaterial = new MeshBasicMaterial({ color: 0xffda84 });
  private readonly ballMaterial = new MeshBasicMaterial({ color: 0x454657 });
  private readonly flashMaterial = new MeshBasicMaterial({ color: 0xffbd51 });
  private readonly ringMaterial = new MeshBasicMaterial({ color: 0xff8f38, transparent: true, opacity: .68, depthWrite: false });
  private readonly flameMaterial = new MeshBasicMaterial({ color: 0xfda43e });
  private readonly shots: SiegeShot[] = [];
  private readonly lastHits = new Map<string, { kind: string; position: Vector3 }>();
  private readonly burns = new Map<string, Group>();

  public constructor(private readonly scene: Scene) {}

  public get count(): number { return this.shots.length + this.burns.size; }

  public present(event: GameEvent, from: Vector3 | undefined, hit: AnchorLookup): boolean {
    if (event.type === "tower_attack" && from && (event.towerDefinitionId === "machine_gun" || event.towerDefinitionId === "cannon")) {
      const to = hit(event.targetId, event.targetPosition);
      this.lastHits.set(event.buildingId, { kind: event.towerDefinitionId, position: to.clone() });
      const cannon = event.towerDefinitionId === "cannon";
      const shot = new Mesh(cannon ? this.ballGeometry : this.boltGeometry, cannon ? this.ballMaterial : this.boltMaterial);
      shot.position.copy(from);
      if (!cannon) shot.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), to.clone().sub(from).normalize());
      this.add({ object: shot, age: 0, duration: cannon ? .22 : .12, from: from.clone(), to, arc: cannon ? .65 : undefined });
      this.flash(from, cannon ? .13 : .075);
      // Core damage has already settled. The compact impact starts immediately.
      if (cannon) this.explosion(to);
      return true;
    }
    if (event.type === "tower_special" && event.targetPosition !== undefined) {
      const previous = this.lastHits.get(event.buildingId);
      const to = hit(event.targetId, event.targetPosition);
      if (event.effect === "穿透" && previous?.kind === "machine_gun") {
        const bolt = new Mesh(this.boltGeometry, this.boltMaterial);
        bolt.position.copy(previous.position);
        bolt.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), to.clone().sub(previous.position).normalize());
        this.add({ object: bolt, age: 0, duration: .10, from: previous.position.clone(), to });
        this.flash(to, .07);
        previous.position.copy(to);
        return true;
      }
      if (event.effect === "溅射" && previous?.kind === "cannon") {
        this.flash(to, .10);
        return true;
      }
    }
    return false;
  }

  public advance(state: GameState, deltaSeconds: number, hit: AnchorLookup): void {
    const activeBuildings = new Set(state.buildings.map((building) => building.id));
    for (const id of this.lastHits.keys()) if (!activeBuildings.has(id)) this.lastHits.delete(id);
    const burning = new Set<string>();
    for (const enemy of state.enemies) {
      if (!(enemy.growthBurnStates ?? []).some((burn) => burn.remainingSeconds > 0 && activeBuildings.has(burn.sourceBuildingId))) continue;
      burning.add(enemy.id);
      let flames = this.burns.get(enemy.id);
      if (!flames) {
        flames = new Group();
        for (const x of [-.10, .10]) {
          const flame = new Mesh(this.flameGeometry, this.flameMaterial);
          flame.position.set(x, .10, 0);
          flames.add(flame);
        }
        this.scene.add(flames);
        this.burns.set(enemy.id, flames);
      }
      flames.position.copy(hit(enemy.id, enemy.position)).y -= .26;
      // The source's effective time freezes every flame during all pause phases.
      flames.scale.y = .85 + Math.sin(state.effectiveBattleTimeSeconds * 13) * .15;
    }
    for (const [id, flames] of this.burns) if (!burning.has(id)) { this.scene.remove(flames); this.burns.delete(id); }
    for (let index = this.shots.length-1; index >= 0; index -= 1) {
      const shot = this.shots[index]!;
      shot.age += deltaSeconds;
      if (shot.age >= shot.duration) { this.scene.remove(shot.object); this.shots.splice(index, 1); continue; }
      const progress = shot.age/shot.duration;
      if (shot.from && shot.to) {
        shot.object.position.lerpVectors(shot.from, shot.to, progress);
        shot.object.position.y += 4*(shot.arc ?? 0)*progress*(1-progress);
      }
      if (shot.expand) shot.object.scale.setScalar(.7+progress*2);
    }
  }

  public reset(): void {
    for (const shot of this.shots) this.scene.remove(shot.object);
    for (const flames of this.burns.values()) this.scene.remove(flames);
    this.shots.length = 0;
    this.burns.clear();
    this.lastHits.clear();
  }

  public dispose(): void {
    this.reset();
    for (const geometry of [this.boltGeometry, this.ballGeometry, this.flashGeometry, this.ringGeometry, this.flameGeometry]) geometry.dispose();
    for (const material of [this.boltMaterial, this.ballMaterial, this.flashMaterial, this.ringMaterial, this.flameMaterial]) material.dispose();
  }

  private flash(position: Vector3, duration: number): void {
    const flash = new Mesh(this.flashGeometry, this.flashMaterial);
    flash.position.copy(position);
    this.add({ object: flash, age: 0, duration });
  }

  private explosion(position: Vector3): void {
    const ring = new Mesh(this.ringGeometry, this.ringMaterial);
    ring.rotation.x = -Math.PI/2;
    ring.position.copy(position); ring.position.y = .12;
    this.add({ object: ring, age: 0, duration: .26, expand: true });
    this.flash(position, .18);
  }

  private add(shot: SiegeShot): void { this.scene.add(shot.object); this.shots.push(shot); }
}

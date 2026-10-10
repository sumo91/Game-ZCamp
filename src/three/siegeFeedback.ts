import { ConeGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, RingGeometry, SphereGeometry, Vector3 } from "three";
import type { GameEvent, GameState } from "../core/types";
import type { Object3D, Scene } from "three";

type SiegeShot = { object: Object3D; age: number; duration: number; from?: Vector3; to?: Vector3; arc?: number; expand?: boolean; fadeMaterial?: MeshBasicMaterial };
type AnchorLookup = (id: string, position: number) => Vector3;

/** Visual-only siege feedback. Every endpoint is a core event snapshot; no hit is calculated here. */
export class SiegeFeedback {
  private readonly boltGeometry = new CylinderGeometry(.04, .055, .58, 5);
  private readonly ballGeometry = new SphereGeometry(.16, 8, 6);
  private readonly trailGeometry = new CylinderGeometry(.025, .055, .8, 5);
  private readonly flashGeometry = new ConeGeometry(.12, .32, 5);
  private readonly ringGeometry = new RingGeometry(.22, .32, 16);
  private readonly flameGeometry = new ConeGeometry(.11, .42, 5);
  private readonly boltMaterial = new MeshBasicMaterial({ color: 0xffefba });
  private readonly ballMaterial = new MeshBasicMaterial({ color: 0xffbc64 });
  private readonly flashMaterial = new MeshBasicMaterial({ color: 0xffbd51 });
  private readonly trailMaterial = new MeshBasicMaterial({ color: 0xffbe59, transparent: true, opacity: .55, depthWrite: false });
  private readonly ringMaterial = new MeshBasicMaterial({ color: 0xff8f38, transparent: true, opacity: .8, depthWrite: false });
  private readonly flameMaterial = new MeshBasicMaterial({ color: 0xfda43e });
  private readonly shots: SiegeShot[] = [];
  private readonly lastHits = new Map<string, { kind: string; position: Vector3 }>();
  private readonly burns = new Map<string, Group>();
  private readonly direction = new Vector3();

  public constructor(private readonly scene: Scene) {}

  public get count(): number { return this.shots.length + this.burns.size; }

  public present(event: GameEvent, from: Vector3 | undefined, hit: AnchorLookup): boolean {
    if (event.type === "tower_attack" && from && (event.towerDefinitionId === "machine_gun" || event.towerDefinitionId === "cannon")) {
      const to = hit(event.targetId, event.targetPosition);
      this.lastHits.set(event.buildingId, { kind: event.towerDefinitionId, position: to.clone() });
      const cannon = event.towerDefinitionId === "cannon";
      this.projectile(from, to, cannon ? .34 : .20, cannon);
      this.flash(from, cannon ? .13 : .075);
      // Core damage has already settled. The compact impact starts immediately.
      if (cannon) this.explosion(to);
      return true;
    }
    if (event.type === "tower_special" && event.targetPosition !== undefined) {
      const previous = this.lastHits.get(event.buildingId);
      const to = hit(event.targetId, event.targetPosition);
      if (event.effect === "穿透" && previous?.kind === "machine_gun") {
        this.projectile(previous.position, to, .16, false);
        this.flash(to, .12);
        previous.position.copy(to);
        return true;
      }
      if (event.effect === "溅射" && previous?.kind === "cannon") {
        this.flash(to, .16);
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
        for (const x of [-.18, .18]) {
          const flame = new Mesh(this.flameGeometry, this.flameMaterial);
          // +Z faces the game camera: the flame must sit in front of the skin,
          // rather than being hidden inside the chest at the hit anchor.
          flame.position.set(x, .10, .4);
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
      if (shot.age >= shot.duration) { this.scene.remove(shot.object); shot.fadeMaterial?.dispose(); this.shots.splice(index, 1); continue; }
      const progress = shot.age/shot.duration;
      if (shot.from && shot.to) {
        shot.object.position.lerpVectors(shot.from, shot.to, progress);
        shot.object.position.y += 4*(shot.arc ?? 0)*progress*(1-progress);
        this.direction.subVectors(shot.to, shot.from);
        this.direction.y += 4*(shot.arc ?? 0)*(1-2*progress);
        if (this.direction.lengthSq() > .0001) shot.object.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), this.direction.normalize());
      }
      if (shot.expand) shot.object.scale.setScalar(.75+progress*2.25);
      if (shot.fadeMaterial) shot.fadeMaterial.opacity = (shot.expand ? .8 : .55)*(1-progress);
    }
  }

  public reset(): void {
    for (const shot of this.shots) { this.scene.remove(shot.object); shot.fadeMaterial?.dispose(); }
    for (const flames of this.burns.values()) this.scene.remove(flames);
    this.shots.length = 0;
    this.burns.clear();
    this.lastHits.clear();
  }

  public dispose(): void {
    this.reset();
    for (const geometry of [this.boltGeometry, this.ballGeometry, this.trailGeometry, this.flashGeometry, this.ringGeometry, this.flameGeometry]) geometry.dispose();
    for (const material of [this.boltMaterial, this.ballMaterial, this.trailMaterial, this.flashMaterial, this.ringMaterial, this.flameMaterial]) material.dispose();
  }

  private projectile(from: Vector3, to: Vector3, duration: number, cannon: boolean): void {
    const object = new Group();
    object.add(new Mesh(cannon ? this.ballGeometry : this.boltGeometry, cannon ? this.ballMaterial : this.boltMaterial));
    const fadeMaterial = this.trailMaterial.clone();
    const trail = new Mesh(this.trailGeometry, fadeMaterial);
    trail.position.y = cannon ? -.52 : -.68;
    object.add(trail);
    object.position.copy(from);
    this.add({ object, age: 0, duration, from: from.clone(), to: to.clone(), arc: cannon ? .95 : undefined, fadeMaterial });
  }

  private flash(position: Vector3, duration: number): void {
    const flash = new Mesh(this.flashGeometry, this.flashMaterial);
    flash.position.copy(position);
    this.add({ object: flash, age: 0, duration });
  }

  private explosion(position: Vector3): void {
    const fadeMaterial = this.ringMaterial.clone();
    const ring = new Mesh(this.ringGeometry, fadeMaterial);
    ring.rotation.x = -Math.PI/2;
    ring.position.copy(position); ring.position.y = .12;
    this.add({ object: ring, age: 0, duration: .42, expand: true, fadeMaterial });
    // Lift the compact burst above the hit anchor so the living skin does not
    // hide it. The ground ring still marks the exact cached impact location.
    this.flash(position.clone().add(new Vector3(0, .25, 0)), .24);
  }

  private add(shot: SiegeShot): void { this.scene.add(shot.object); this.shots.push(shot); }
}

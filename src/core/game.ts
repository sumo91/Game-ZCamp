import {
  starterCatalog,
  validateCatalog,
  type ContentCatalog,
  type EnemyDefinition,
  type TowerDefinition,
  type UpgradeEffect,
  type WaveDefinition,
} from "./content";
import { SeededRandom } from "./random";
import { CAMP_SLOT_IDS } from "./types";
import type { CommandResult, EnemyRuntimeState, GameCommand, GameEvent, GameState } from "./types";

export const MAX_WAVE = 20;
export const WALL_MAX_HP = 100;
export const INITIAL_WOOD = 120;
export const INITIAL_GOLD = 0;
export const INITIAL_XP_TO_NEXT_LEVEL = 3;
export const REPAIR_COST = 20;
export const REPAIR_AMOUNT = 25;

export class GameSimulation {
  private readonly random: SeededRandom;
  private readonly catalog: ContentCatalog;
  private readonly state: GameState;
  private events: GameEvent[] = [];

  public constructor(catalog: ContentCatalog = starterCatalog, seed = 0x5ec0de) {
    validateCatalog(catalog);
    this.catalog = catalog;
    this.random = new SeededRandom(seed);
    this.state = {
      phase: "SHOP",
      pausedFromPhase: null,
      wave: 0,
      maxWave: MAX_WAVE,
      wood: INITIAL_WOOD,
      gold: INITIAL_GOLD,
      wallHp: WALL_MAX_HP,
      wallMaxHp: WALL_MAX_HP,
      waveTimeRemainingSeconds: 0,
      waveElapsedSeconds: 0,
      countdownRemainingSeconds: 0,
      nextSpawnEventIndex: 0,
      spawnedEnemies: 0,
      defeatedEnemies: 0,
      xp: 0,
      level: 1,
      xpToNextLevel: INITIAL_XP_TO_NEXT_LEVEL,
      upgradeIds: [],
      pendingUpgradeChoices: [],
      seed,
      buildings: [],
      enemies: [],
    };
  }

  public getState(): Readonly<GameState> {
    return this.state;
  }

  public drainEvents(): GameEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }

  public dispatch(command: GameCommand): CommandResult {
    switch (command.type) {
      case "complete_prep":
        return this.completePrep();
      case "build_tower":
        return this.buildTower(command.definitionId, command.slotId);
      case "upgrade_tower":
        return this.upgradeTower(command.slotId);
      case "choose_upgrade":
        return this.chooseUpgrade(command.upgradeId);
      case "repair_wall":
        return this.repairWall();
      case "pause":
        return this.pause();
      case "resume":
        return this.resume();
      case "restart":
        return this.restart();
    }
  }

  public tick(deltaSeconds: number): void {
    if (deltaSeconds <= 0 || this.state.phase === "PAUSED") {
      return;
    }

    if (this.state.phase === "COUNTDOWN") {
      const afterCountdown = this.state.countdownRemainingSeconds - deltaSeconds;
      this.state.countdownRemainingSeconds = Math.max(0, afterCountdown);
      if (afterCountdown < 0) {
        this.beginCombat();
        deltaSeconds = -afterCountdown;
      } else if (afterCountdown === 0) {
        this.beginCombat();
        return;
      } else {
        return;
      }
    }

    if (this.state.phase !== "COMBAT") {
      return;
    }

    this.state.waveElapsedSeconds += deltaSeconds;
    this.state.waveTimeRemainingSeconds = Math.max(0, this.state.waveTimeRemainingSeconds - deltaSeconds);
    this.state.wood += this.getWoodIncome() * deltaSeconds;
    this.state.wallHp = Math.min(this.state.wallMaxHp, this.state.wallHp + this.getWallRepair() * deltaSeconds);

    this.spawnDueEnemies();
    this.updateEnemies(deltaSeconds);
    this.resolveTowerAttacks(deltaSeconds);
    this.resolveWallAttacks(deltaSeconds);
    this.removeDefeatedEnemies();

    if (this.state.phase !== "COMBAT") {
      return;
    }

    const wave = this.getWaveDefinition(this.state.wave);
    if (this.state.nextSpawnEventIndex >= wave.spawnEvents.length && this.state.enemies.length === 0) {
      this.finishWave();
    }
  }
  public damageWall(amount: number): void {
    if (this.state.phase !== "COMBAT" || amount <= 0) {
      return;
    }

    const reducedAmount = amount * this.getWallDamageMultiplier();
    this.state.wallHp = Math.max(0, this.state.wallHp - reducedAmount);
    if (this.state.wallHp === 0) {
      this.state.phase = "DEFEAT";
      this.state.waveTimeRemainingSeconds = 0;
    }
  }

  public nextRandomInt(minInclusive: number, maxExclusive: number): number {
    return this.random.nextInt(minInclusive, maxExclusive);
  }

  private completePrep(): CommandResult {
    if (this.state.phase !== "SHOP") {
      return { accepted: false, reason: "只能在整备商店中完成准备。" };
    }

    if (this.state.wave >= this.state.maxWave) {
      return { accepted: false, reason: "所有波次已经完成。" };
    }

    if (this.state.pendingUpgradeChoices.length > 0) {
      return { accepted: false, reason: "请先选择一项强化。" };
    }

    if (this.state.buildings.length === 0) {
      return { accepted: false, reason: "请先建造一座防御塔。" };
    }

    this.state.phase = "COUNTDOWN";
    this.state.countdownRemainingSeconds = 3;
    return { accepted: true };
  }

  private beginCombat(): void {
    this.state.wave += 1;
    this.state.phase = "COMBAT";
    this.state.countdownRemainingSeconds = 0;
    this.state.waveTimeRemainingSeconds = this.getWaveDuration(this.state.wave);
    this.state.waveElapsedSeconds = 0;
    this.state.countdownRemainingSeconds = 0;
    this.state.nextSpawnEventIndex = 0;
    this.state.spawnedEnemies = 0;
    this.state.enemies = [];
  }
  private buildTower(definitionId: string, slotId: string): CommandResult {
    if (this.state.phase !== "SHOP" && this.state.phase !== "COMBAT") {
      return { accepted: false, reason: "整备或战斗中才能建造防御塔。" };
    }

    if (!CAMP_SLOT_IDS.includes(slotId)) {
      return { accepted: false, reason: "请选择有效的 5×3 营地格。" };
    }

    if (this.state.buildings.some((building) => building.slotId === slotId)) {
      return { accepted: false, reason: "That building slot is occupied." };
    }

    const definition = this.catalog.towers.find((tower) => tower.id === definitionId);
    if (!definition) {
      return { accepted: false, reason: `Unknown tower: ${definitionId}.` };
    }

    if (this.state.wood < definition.buildCost) {
      return { accepted: false, reason: "木材不足，无法建造。" };
    }

    this.state.wood -= definition.buildCost;
    this.state.buildings.push({
      id: definitionId + "-" + (this.state.buildings.length + 1),
      slotId,
      kind: "tower",
      definitionId,
      level: 1,
      lanePosition: 0.5,
      attackCooldownSeconds: 0,
    });
    return { accepted: true };
  }

  private upgradeTower(slotId: string): CommandResult {
    if (this.state.phase !== "SHOP" && this.state.phase !== "COMBAT") {
      return { accepted: false, reason: "整备或战斗中才能升级防御塔。" };
    }

    const building = this.state.buildings.find((candidate) => candidate.slotId === slotId);
    if (!building) {
      return { accepted: false, reason: "There is no tower in that slot." };
    }

    if (building.level >= 3) {
      return { accepted: false, reason: "That tower is already at maximum level." };
    }

    const definition = this.getTowerDefinition(building.definitionId);
    const cost = Math.round(definition.buildCost * (1 + building.level * 0.5));
    if (this.state.wood < cost) {
      return { accepted: false, reason: `需要 ${cost} 木材升级。` };
    }

    this.state.wood -= cost;
    building.level += 1;
    return { accepted: true };
  }

  private chooseUpgrade(upgradeId: string): CommandResult {
    if (this.state.phase !== "SHOP" || this.state.pendingUpgradeChoices.length === 0) {
      return { accepted: false, reason: "There is no upgrade choice pending." };
    }

    if (!this.state.pendingUpgradeChoices.includes(upgradeId)) {
      return { accepted: false, reason: "That upgrade is not one of the current choices." };
    }

    const upgrade = this.catalog.upgrades.find((candidate) => candidate.id === upgradeId);
    if (!upgrade) {
      return { accepted: false, reason: `Unknown upgrade: ${upgradeId}.` };
    }

    this.state.upgradeIds.push(upgrade.id);
    if (upgrade.effect.kind === "wall_max_hp") {
      this.state.wallMaxHp += upgrade.effect.amount;
      this.state.wallHp += upgrade.effect.amount;
    }

    this.state.pendingUpgradeChoices = [];
    this.state.phase = "SHOP";
    return { accepted: true };
  }

  private repairWall(): CommandResult {
    if (this.state.phase !== "SHOP" && this.state.phase !== "COMBAT") {
      return { accepted: false, reason: "整备或战斗中才能维修城墙。" };
    }

    if (this.state.wallHp >= this.state.wallMaxHp) {
      return { accepted: false, reason: "城墙耐久已经满了。" };
    }

    if (this.state.wood < REPAIR_COST) {
      return { accepted: false, reason: "木材不足，无法维修城墙。" };
    }

    this.state.wood -= REPAIR_COST;
    this.state.wallHp = Math.min(this.state.wallMaxHp, this.state.wallHp + REPAIR_AMOUNT);
    return { accepted: true };
  }

  private pause(): CommandResult {
    if (this.state.phase !== "SHOP" && this.state.phase !== "COUNTDOWN" && this.state.phase !== "COMBAT") {
      return { accepted: false, reason: "当前阶段不能暂停。" };
    }

    this.state.pausedFromPhase = this.state.phase;
    this.state.phase = "PAUSED";
    return { accepted: true };
  }
  private resume(): CommandResult {
    if (this.state.phase !== "PAUSED" || this.state.pausedFromPhase === null) {
      return { accepted: false, reason: "The game is not paused." };
    }

    this.state.phase = this.state.pausedFromPhase;
    this.state.pausedFromPhase = null;
    return { accepted: true };
  }

  private restart(): CommandResult {
    this.state.phase = "SHOP";
    this.state.pausedFromPhase = null;
    this.state.wave = 0;
    this.state.wood = INITIAL_WOOD;
    this.state.gold = INITIAL_GOLD;
    this.state.wallHp = WALL_MAX_HP;
    this.state.wallMaxHp = WALL_MAX_HP;
    this.state.waveTimeRemainingSeconds = 0;
    this.state.waveElapsedSeconds = 0;
    this.state.nextSpawnEventIndex = 0;
    this.state.spawnedEnemies = 0;
    this.state.defeatedEnemies = 0;
    this.state.xp = 0;
    this.state.level = 1;
    this.state.xpToNextLevel = INITIAL_XP_TO_NEXT_LEVEL;
    this.state.upgradeIds = [];
    this.state.pendingUpgradeChoices = [];
    this.state.buildings = [];
    this.state.enemies = [];
    this.events = [];
    return { accepted: true };
  }

  private finishWave(): void {
    if (this.state.wave >= this.state.maxWave) {
      this.state.phase = "VICTORY";
      return;
    }

    if (this.state.xp >= this.state.xpToNextLevel) {
      this.state.xp -= this.state.xpToNextLevel;
      this.state.level += 1;
      this.state.xpToNextLevel = Math.ceil(this.state.xpToNextLevel * 1.35);
      this.state.pendingUpgradeChoices = this.createUpgradeChoices();
      this.state.phase = "SHOP";
      return;
    }

    this.state.phase = "SHOP";
  }

  private getWaveDuration(wave: number): number {
    return this.getWaveDefinition(wave).durationSeconds;
  }

  private getWaveDefinition(wave: number): WaveDefinition {
    return this.catalog.waves.find((definition) => definition.wave === wave) ?? this.catalog.waves.at(-1)!;
  }

  private spawnDueEnemies(): void {
    const wave = this.getWaveDefinition(this.state.wave);
    while (
      this.state.nextSpawnEventIndex < wave.spawnEvents.length
      && wave.spawnEvents[this.state.nextSpawnEventIndex]!.atSeconds <= this.state.waveElapsedSeconds
    ) {
      const event = wave.spawnEvents[this.state.nextSpawnEventIndex]!;
      const definition = this.catalog.enemies.find((enemy) => enemy.id === event.enemyId);
      if (definition) {
        this.state.spawnedEnemies += 1;
        this.state.enemies.push(this.createEnemy(definition));
      }
      this.state.nextSpawnEventIndex += 1;
    }
  }

  private createEnemy(definition: EnemyDefinition, position = 0): EnemyRuntimeState {
    return {
      id: `${definition.id}-${this.state.spawnedEnemies}`,
      definitionId: definition.id,
      position,
      hp: definition.maxHp,
      maxHp: definition.maxHp,
      atWall: position >= 1,
      attackCooldownSeconds: 0,
      slowMultiplier: 1,
      slowRemainingSeconds: 0,
      abilityCooldownSeconds: 0,
    };
  }

  private updateEnemies(deltaSeconds: number): void {
    const screamerAlive = this.state.enemies.some((enemy) => this.getEnemyDefinition(enemy.definitionId).behavior === "screamer" && enemy.hp > 0);
    const overlordAlive = this.state.enemies.some((enemy) => this.getEnemyDefinition(enemy.definitionId).behavior === "overlord" && enemy.hp > 0);

    for (const enemy of this.state.enemies) {
      const definition = this.getEnemyDefinition(enemy.definitionId);
      if (enemy.slowRemainingSeconds > 0) {
        enemy.slowRemainingSeconds = Math.max(0, enemy.slowRemainingSeconds - deltaSeconds);
      } else {
        enemy.slowMultiplier = 1;
      }

      if (definition.behavior === "regenerator") {
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + (definition.regenPerSecond ?? 0) * deltaSeconds);
      }

      if (!enemy.atWall) {
        let speedMultiplier = enemy.slowMultiplier;
        if (definition.behavior === "charger" && enemy.position > 0.5) {
          speedMultiplier *= 1.8;
        }
        if (screamerAlive && definition.behavior !== "screamer") {
          speedMultiplier *= 1.1;
        }
        if (overlordAlive && definition.behavior !== "overlord") {
          speedMultiplier *= 1.15;
        }
        enemy.position = Math.min(1, enemy.position + definition.moveSpeed * speedMultiplier * deltaSeconds);
        enemy.atWall = enemy.position >= 1;
      }

      if (enemy.atWall) {
        enemy.attackCooldownSeconds = Math.max(0, enemy.attackCooldownSeconds - deltaSeconds);
      }
    }
  }

  private resolveTowerAttacks(deltaSeconds: number): void {
    for (const building of this.state.buildings) {
      const definition = this.getTowerDefinition(building.definitionId);
      building.attackCooldownSeconds = Math.max(0, building.attackCooldownSeconds - deltaSeconds);
      if (building.attackCooldownSeconds > 0) {
        continue;
      }

      const target = this.state.enemies
        .filter((enemy) => this.isTargetable(enemy) && Math.abs(enemy.position - building.lanePosition) <= this.getTowerRange(definition, building.level))
        .sort((left, right) => right.position - left.position)[0];
      if (!target) {
        continue;
      }

      this.applyTowerAttack(building.id, definition, building.level, target);
      building.attackCooldownSeconds = this.getTowerAttackInterval(definition, building.level);
    }
  }

  private applyTowerAttack(buildingId: string, definition: TowerDefinition, level: number, target: EnemyRuntimeState): void {
    if (definition.attackType === "splash") {
      const radius = this.getTowerSplashRadius(definition, level);
      for (const enemy of this.state.enemies) {
        if (this.isTargetable(enemy) && Math.abs(enemy.position - target.position) <= radius) {
          this.attackEnemy(buildingId, definition, enemy, this.getTowerDamage(definition, level));
        }
      }
      return;
    }

    this.attackEnemy(buildingId, definition, target, this.getTowerDamage(definition, level));

    if (definition.attackType === "slow") {
      target.slowMultiplier = Math.min(target.slowMultiplier, this.getTowerSlowMultiplier(definition, level));
      target.slowRemainingSeconds = Math.max(target.slowRemainingSeconds, definition.slowDurationSeconds ?? 1);
    }

    if (definition.attackType === "chain") {
      const chainTargets = this.state.enemies
        .filter((enemy) => enemy !== target && this.isTargetable(enemy))
        .sort((left, right) => Math.abs(left.position - target.position) - Math.abs(right.position - target.position))
        .slice(0, Math.max(0, (definition.chainTargets ?? 2) + level - 2));
      for (const enemy of chainTargets) {
        this.attackEnemy(buildingId, definition, enemy, this.getTowerDamage(definition, level));
      }
    }
  }

  private attackEnemy(buildingId: string, definition: TowerDefinition, enemy: EnemyRuntimeState, damage: number): void {
    this.events.push({
      type: "tower_attack",
      buildingId,
      towerDefinitionId: definition.id,
      targetId: enemy.id,
      targetPosition: enemy.position,
    });
    this.applyDamage(enemy, damage);
  }

  private applyDamage(enemy: EnemyRuntimeState, amount: number): void {
    const definition = this.getEnemyDefinition(enemy.definitionId);
    const damage = amount * (definition.damageMultiplier ?? 1);
    enemy.hp -= damage;
    this.events.push({
      type: "enemy_hit",
      enemyId: enemy.id,
      position: enemy.position,
      damage,
      remainingHp: Math.max(0, enemy.hp),
    });
  }

  private resolveWallAttacks(deltaSeconds: number): void {
    for (const enemy of this.state.enemies) {
      if (!enemy.atWall || enemy.hp <= 0) {
        continue;
      }

      const definition = this.getEnemyDefinition(enemy.definitionId);
      if (enemy.attackCooldownSeconds <= 0) {
        this.damageWall(definition.wallDamage);
        enemy.attackCooldownSeconds = definition.wallAttackIntervalSeconds;
      }

      if (this.state.phase === "DEFEAT") {
        return;
      }
    }
  }

  private removeDefeatedEnemies(): void {
    const remainingEnemies: EnemyRuntimeState[] = [];
    const children: EnemyRuntimeState[] = [];
    let awardedXp = 0;

    for (const enemy of this.state.enemies) {
      if (enemy.hp > 0) {
        remainingEnemies.push(enemy);
        continue;
      }

      const definition = this.getEnemyDefinition(enemy.definitionId);
      this.state.defeatedEnemies += 1;
      this.events.push({
        type: "enemy_defeated",
        enemyId: enemy.id,
        position: enemy.position,
      });
      this.state.gold += Math.max(1, Math.round(definition.goldReward * this.getGoldMultiplier()));
      awardedXp += definition.xpReward;

      if (definition.onDeathWallDamage) {
        this.damageWall(definition.onDeathWallDamage);
      }

      if (definition.splitInto) {
        const childDefinition = this.getEnemyDefinition(definition.splitInto.enemyId);
        for (let index = 0; index < definition.splitInto.count; index += 1) {
          this.state.spawnedEnemies += 1;
          children.push(this.createEnemy(childDefinition, enemy.position));
        }
      }
    }

    this.state.enemies = remainingEnemies.concat(children);
    if (awardedXp > 0 && this.state.phase === "COMBAT") {
      this.awardExperience(awardedXp);
    }
  }

  private awardExperience(amount: number): void {
    this.state.xp += amount;
  }

  private createUpgradeChoices(): string[] {
    const candidates = this.catalog.upgrades.filter((upgrade) => !this.state.upgradeIds.includes(upgrade.id));
    const choices: string[] = [];
    while (choices.length < 3 && candidates.length > 0) {
      const index = this.random.nextInt(0, candidates.length);
      choices.push(candidates.splice(index, 1)[0]!.id);
    }
    return choices;
  }

  private isTargetable(enemy: EnemyRuntimeState): boolean {
    if (enemy.hp <= 0) {
      return false;
    }
    const definition = this.getEnemyDefinition(enemy.definitionId);
    return definition.behavior !== "burrower" || enemy.position >= (definition.untargetableUntil ?? 0.55);
  }

  private getEnemyDefinition(definitionId: string): EnemyDefinition {
    const definition = this.catalog.enemies.find((enemy) => enemy.id === definitionId);
    if (!definition) {
      throw new Error(`Unknown enemy definition: ${definitionId}.`);
    }
    return definition;
  }

  private getTowerDefinition(definitionId: string): TowerDefinition {
    const definition = this.catalog.towers.find((tower) => tower.id === definitionId);
    if (!definition) {
      throw new Error(`Unknown tower definition: ${definitionId}.`);
    }
    return definition;
  }

  private getSelectedEffects(): UpgradeEffect[] {
    return this.state.upgradeIds
      .map((upgradeId) => this.catalog.upgrades.find((upgrade) => upgrade.id === upgradeId)?.effect)
      .filter((effect): effect is UpgradeEffect => effect !== undefined);
  }

  private getTowerDamage(definition: TowerDefinition, level: number): number {
    let damage = definition.damage;
    for (const effect of this.getSelectedEffects()) {
      if (effect.kind === "all_tower_damage") {
        damage += effect.amount;
      }
      if (effect.kind === "tower_damage" && effect.towerId === definition.id) {
        damage += effect.amount;
      }
    }
    return damage * (1 + 0.3 * (level - 1));
  }

  private getTowerAttackInterval(definition: TowerDefinition, level: number): number {
    let multiplier = 1;
    for (const effect of this.getSelectedEffects()) {
      if (effect.kind === "all_tower_attack_speed") {
        multiplier *= effect.multiplier;
      }
      if (effect.kind === "tower_attack_speed" && effect.towerId === definition.id) {
        multiplier *= effect.multiplier;
      }
    }
    return Math.max(0.15, definition.attackIntervalSeconds * Math.pow(0.9, level - 1) * multiplier);
  }

  private getTowerRange(definition: TowerDefinition, level = 1): number {
    let amount = 0;
    for (const effect of this.getSelectedEffects()) {
      if (effect.kind === "tower_range" && effect.towerId === definition.id) {
        amount += effect.amount;
      }
    }
    return definition.range + amount + 0.05 * (level - 1);
  }

  private getTowerSplashRadius(definition: TowerDefinition, level = 1): number {
    let amount = 0;
    for (const effect of this.getSelectedEffects()) {
      if (effect.kind === "tower_splash_radius" && effect.towerId === definition.id) {
        amount += effect.amount;
      }
    }
    return (definition.splashRadius ?? 0.2) + amount + 0.03 * (level - 1);
  }

  private getTowerSlowMultiplier(definition: TowerDefinition, level = 1): number {
    let reduction = 0;
    for (const effect of this.getSelectedEffects()) {
      if (effect.kind === "tower_slow" && effect.towerId === definition.id) {
        reduction += effect.amount;
      }
    }
    return Math.max(0.2, (definition.slowMultiplier ?? 0.6) - reduction - 0.04 * (level - 1));
  }

  private getWoodIncome(): number {
    let amount = 0;
    for (const effect of this.getSelectedEffects()) {
      if (effect.kind === "wood_income") {
        amount += effect.amount;
      }
    }
    return 2 + amount;
  }

  private getGoldMultiplier(): number {
    let amount = 0;
    for (const effect of this.getSelectedEffects()) {
      if (effect.kind === "gold_multiplier") {
        amount += effect.amount;
      }
    }
    return 1 + amount;
  }

  private getWallRepair(): number {
    let amount = 0;
    for (const effect of this.getSelectedEffects()) {
      if (effect.kind === "wall_repair") {
        amount += effect.amount;
      }
    }
    return amount;
  }

  private getWallDamageMultiplier(): number {
    let reduction = 0;
    for (const effect of this.getSelectedEffects()) {
      if (effect.kind === "wall_damage_reduction") {
        reduction += effect.amount;
      }
    }
    return Math.max(0.2, 1 - reduction);
  }
}

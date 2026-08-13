import { starterCatalog, validateCatalog } from "./content";
import type { ContentCatalog, EnemyDefinition } from "./content";
import { getGrowthBuildingDefinition, getGrowthTraitDefinition, getGrowthTowerDefinition, getGrowthUpgradeCost, selectTraitOptions } from "./buildingGrowth";
import type { GrowthBuildingId, GrowthSpecialTowerId, GrowthTraitId } from "./buildingGrowth";
import {
  getGrowthCannonBurn,
  getGrowthCannonSplashRadius,
  getGrowthElectricChainExtraTargets,
  getGrowthFrostSlow,
  getGrowthMachinePenetrationMultiplier,
  getGrowthMachinePenetrationTargets,
  getGrowthSecondaryDamageMultiplier,
  getGrowthTowerAttackProfile,
  getGrowthTowerDamage,
  compareStableIds,
} from "./growthCombat";
import { getGrowthLumberyardUpgradeDiscount, getGrowthLumberyardWaveStockpile } from "./growthEconomy";
import { getWoodProductionPerSecond } from "./resources";
import { CAMP_SLOT_IDS } from "./types";
import type {
  BuildingState,
  CommandResult,
  EnemyRuntimeState,
  GrowthBurnState,
  GrowthSlowState,
  GameCommand,
  GameEvent,
  GamePhase,
  GameState,
  PlayPhase,
} from "./types";

export const MAX_WAVE = 10;
export const WALL_MAX_HP = 100;
export const INITIAL_WOOD = 120;
export const INITIAL_GOLD = 0;
export const OPENING_COUNTDOWN_SECONDS = 5;
export const WAVE_INTERVAL_SECONDS = 60;
export const SPAWN_WINDOW_SECONDS = 40;
export const MAIN_CITY_ID = "main-city";

const EPSILON = 0.000001;

export class GameSimulation {
  private readonly catalog: ContentCatalog;
  private readonly initialSeed: number;
  private state: GameState;
  private events: GameEvent[] = [];
  private randomState: number;
  private growthBurnRemainingAtStepStart = new Map<string, number>();

  public constructor(catalog: ContentCatalog = starterCatalog, seed = 1337) {
    validateCatalog(catalog);
    this.catalog = catalog;
    this.initialSeed = seed >>> 0;
    this.randomState = this.initialSeed;
    this.state = this.createInitialState();
  }

  public getState(): GameState {
    return this.state;
  }

  public drainEvents(): GameEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }

  public dispatch(command: GameCommand): CommandResult {
    switch (command.type) {
      case "build_building":
        return this.buildGrowthBuilding(command.slotId, command.definitionId);
      case "upgrade_building":
        return this.upgradeGrowthBuilding(command.buildingId);
      case "choose_building_trait":
        return this.chooseGrowthTrait(command.buildingId, command.traitDefinitionId);
      case "transform_tower":
        return this.transformGrowthTower(command.buildingId, command.targetTowerId);
      case "destroy_building":
        return this.destroyBuilding(command.slotId);
      case "pause":
        return this.pause();
      case "resume":
        return this.resume();
      case "system_pause":
        return this.systemPause();
      case "system_resume":
        return this.systemResume();
      case "restart":
        this.restart();
        return { accepted: true };
      default:
        return { accepted: false, reason: "未知指令" };
    }
  }

  public tick(deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
    if (this.state.phase === "SYSTEM_PAUSE" || this.state.phase === "TACTICAL_PAUSE" || this.state.phase === "TRAIT_DRAFT" || this.state.phase === "VICTORY" || this.state.phase === "DEFEAT") return;

    if (this.state.phase === "OPENING_COUNTDOWN") {
      const remaining = this.state.openingCountdownRemainingSeconds - deltaSeconds;
      if (remaining > EPSILON) {
        this.state.openingCountdownRemainingSeconds = remaining;
        return;
      }
      this.state.openingCountdownRemainingSeconds = 0;
      this.beginRunning();
      const overflow = Math.max(0, -remaining);
      if (overflow > EPSILON) this.advanceRunning(overflow);
      return;
    }

    if (this.state.phase === "RUNNING") this.advanceRunning(deltaSeconds);
  }

  public nextRandomInt(maxExclusive: number): number {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) return 0;
    this.randomState = (Math.imul(this.randomState, 1664525) + 1013904223) >>> 0;
    return this.randomState % maxExclusive;
  }

  private createInitialState(): GameState {
    return {
      phase: "OPENING_COUNTDOWN",
      pausedFromPhase: null,
      systemPausedFromPhase: null,
      wave: 0,
      maxWave: MAX_WAVE,
      effectiveBattleTimeSeconds: 0,
      nextWaveTimeRemainingSeconds: WAVE_INTERVAL_SECONDS,
      openingCountdownRemainingSeconds: OPENING_COUNTDOWN_SECONDS,
      waveSpawnProgress: Array.from({ length: MAX_WAVE }, () => 0),
      spawnedEnemies: 0,
      defeatedEnemies: 0,
      wood: INITIAL_WOOD,
      gold: INITIAL_GOLD,
      wallHp: WALL_MAX_HP,
      wallMaxHp: WALL_MAX_HP,
      overlordInspireRemainingSeconds: 0,
      overlordInspireMultiplier: 1,
      seed: this.initialSeed,
      buildings: [this.createMainCity()],
      enemies: [],
      pendingTraitDraft: null,
    };
  }

  private createMainCity(): BuildingState {
    return { id: MAIN_CITY_ID, slotId: "slot-r3-c3", kind: "main_city", definitionId: "main_city", level: 1, lanePosition: 0.5, attackCooldownSeconds: 0 };
  }

  private beginRunning(): void {
    this.state.phase = "RUNNING";
    this.state.pausedFromPhase = null;
    this.updateWaveSchedule();
    this.spawnDueEnemies();
  }

  private advanceRunning(deltaSeconds: number): void {
    let remaining = deltaSeconds;
    while (remaining > EPSILON && this.state.phase === "RUNNING") {
      this.updateWaveSchedule();
      this.spawnDueEnemies();
      const nextSpawnTime = this.getNextSpawnTime();
      let step = Math.min(remaining, 0.25);
      if (nextSpawnTime !== null && nextSpawnTime > this.state.effectiveBattleTimeSeconds + EPSILON) {
        step = Math.min(step, nextSpawnTime - this.state.effectiveBattleTimeSeconds);
      }
      if (step <= EPSILON) {
        this.state.effectiveBattleTimeSeconds = nextSpawnTime ?? this.state.effectiveBattleTimeSeconds + remaining;
        continue;
      }
      this.state.effectiveBattleTimeSeconds += step;
      this.state.wood += getWoodProductionPerSecond(this.state, this.catalog) * step;
      this.updateWaveSchedule();
      this.updateEnemies(step);
      if (this.state.phase !== "RUNNING") return;
      this.resolveTowerAttacks(step);
      this.resolveWallAttacks();
      if (this.state.wallHp <= 0) return;
      this.removeDefeatedEnemies();
      this.advanceTemporaryEffects(step);
      this.spawnDueEnemies();
      remaining -= step;
    }
  }

  private updateWaveSchedule(): void {
    const previousWave = this.state.wave;
    const nextWave = Math.min(MAX_WAVE, Math.floor(this.state.effectiveBattleTimeSeconds / WAVE_INTERVAL_SECONDS) + 1);
    this.state.wave = nextWave;
    this.state.nextWaveTimeRemainingSeconds = nextWave < MAX_WAVE ? Math.max(0, nextWave * WAVE_INTERVAL_SECONDS - this.state.effectiveBattleTimeSeconds) : 0;
    for (let wave = previousWave + 1; wave <= nextWave; wave += 1) {
      this.state.wood += this.state.buildings.reduce((total, building) => total + getGrowthLumberyardWaveStockpile(this.catalog.buildingGrowth, building), 0);
      this.events.push({ type: "wave_started", wave });
    }
  }

  private spawnDueEnemies(): void {
    const battleTime = this.state.effectiveBattleTimeSeconds;
    for (let waveIndex = 0; waveIndex < this.state.wave; waveIndex += 1) {
      const wave = this.catalog.waves[waveIndex];
      if (!wave) continue;
      let progress = this.state.waveSpawnProgress[waveIndex] ?? 0;
      while (progress < wave.spawnEvents.length) {
        const spawnEvent = wave.spawnEvents[progress];
        if (!spawnEvent || wave.startSeconds + spawnEvent.atSeconds > battleTime + EPSILON) break;
        this.spawnEnemy(wave.wave, spawnEvent.enemyId);
        progress += 1;
      }
      this.state.waveSpawnProgress[waveIndex] = progress;
    }
  }

  private getNextSpawnTime(): number | null {
    let nextTime: number | null = null;
    for (let waveIndex = 0; waveIndex < MAX_WAVE; waveIndex += 1) {
      const wave = this.catalog.waves[waveIndex];
      const progress = this.state.waveSpawnProgress[waveIndex] ?? 0;
      const spawnEvent = wave?.spawnEvents[progress];
      if (!wave || !spawnEvent) continue;
      const eventTime = wave.startSeconds + spawnEvent.atSeconds;
      if (eventTime <= this.state.effectiveBattleTimeSeconds + EPSILON) continue;
      if (nextTime === null || eventTime < nextTime) nextTime = eventTime;
    }
    return nextTime;
  }

  private spawnEnemy(wave: number, enemyId: string): void {
    const definition = this.getEnemyDefinition(enemyId);
    const enemy: EnemyRuntimeState = {
      id: enemyId + "-" + this.state.spawnedEnemies,
      definitionId: enemyId,
      wave,
      position: 0,
      hp: definition.maxHp,
      maxHp: definition.maxHp,
      atWall: false,
      attackCooldownSeconds: definition.wallAttackIntervalSeconds,
      abilityCooldownSeconds: definition.signature?.initialCooldownSeconds ?? 0,
      growthSlowStates: [],
      growthBurnStates: [],
      chargeWarningRemainingSeconds: 0,
      chargeRemainingSeconds: 0,
      chargeTargetPosition: 0,
    };
    this.state.enemies.push(enemy);
    this.state.spawnedEnemies += 1;
    this.events.push({ type: "enemy_spawned", enemyId: enemy.id, definitionId: enemy.definitionId, wave });
  }

  private buildGrowthBuilding(slotId: string, definitionId: GrowthBuildingId): CommandResult {
    if (!this.canOperateBase()) return { accepted: false, reason: "当前状态不可建造" };
    if (!CAMP_SLOT_IDS.includes(slotId)) return { accepted: false, reason: "请选择合法营地格" };
    if (this.state.buildings.some((building) => building.slotId === slotId)) return { accepted: false, reason: "该格已有建筑" };
    const definition = getGrowthBuildingDefinition(this.catalog.buildingGrowth, definitionId);
    if (!definition?.buildable) return { accepted: false, reason: "该建筑不可建造" };
    if (this.state.wood < definition.buildCost) return { accepted: false, reason: "木材不足" };
    this.state.wood -= definition.buildCost;
    const building: BuildingState = {
      id: "growth-" + slotId,
      slotId,
      kind: definition.kind,
      definitionId,
      growthDefinitionId: definitionId,
      level: 1,
      lanePosition: this.getLanePosition(slotId),
      attackCooldownSeconds: 0,
      traits: [],
    };
    this.state.buildings.push(building);
    this.events.push({ type: "building_built", buildingId: building.id, slotId, definitionId });
    return { accepted: true, buildingId: building.id };
  }

  private upgradeGrowthBuilding(buildingId: string): CommandResult {
    if (!this.canOperateBase()) return { accepted: false, reason: "当前状态不可升级" };
    if (this.state.pendingTraitDraft) return { accepted: false, reason: "请先选择当前建筑词条" };
    const building = this.state.buildings.find((candidate) => candidate.id === buildingId);
    if (!building || !building.growthDefinitionId) return { accepted: false, reason: "不是成长建筑" };
    const discount = getGrowthLumberyardUpgradeDiscount(this.catalog.buildingGrowth, building);
    const cost = getGrowthUpgradeCost(this.catalog.buildingGrowth, building.growthDefinitionId, building.level, discount);
    if (cost === null) return { accepted: false, reason: "建筑已达到 Lv.5" };
    if (this.state.wood < cost) return { accepted: false, reason: "木材不足" };
    const options = selectTraitOptions(this.catalog.buildingGrowth, building.growthDefinitionId, (maxExclusive) => this.nextRandomInt(maxExclusive));
    if (!options) return { accepted: false, reason: "当前建筑没有足够的词条选项" };
    const currentPhase = this.state.phase;
    if (currentPhase !== "OPENING_COUNTDOWN" && currentPhase !== "RUNNING" && currentPhase !== "TACTICAL_PAUSE") return { accepted: false, reason: "当前状态不可升级" };
    const returnPhase: PlayPhase = currentPhase === "OPENING_COUNTDOWN" ? "OPENING_COUNTDOWN" : "TACTICAL_PAUSE";
    this.state.wood -= cost;
    building.level += 1;
    const draft = { buildingId, options: [options[0], options[1], options[2]] as [GrowthTraitId, GrowthTraitId, GrowthTraitId], createdAtLevel: building.level, returnPhase };
    this.state.pendingTraitDraft = draft;
    this.state.phase = "TRAIT_DRAFT";
    this.events.push({ type: "building_upgraded", buildingId, level: building.level });
    this.events.push({ type: "building_trait_draft_created", buildingId, optionDefinitionIds: [...options], level: building.level });
    return { accepted: true, buildingId };
  }

  private chooseGrowthTrait(buildingId: string, traitDefinitionId: GrowthTraitId): CommandResult {
    if (this.state.phase === "SYSTEM_PAUSE") return { accepted: false, reason: "系统暂停中，恢复后才能选择词条" };
    if (this.state.phase !== "TRAIT_DRAFT" || !this.state.pendingTraitDraft) return { accepted: false, reason: "当前没有待选择词条" };
    const draft = this.state.pendingTraitDraft;
    if (draft.buildingId !== buildingId) return { accepted: false, reason: "只能选择当前建筑词条" };
    if (!draft.options.includes(traitDefinitionId)) return { accepted: false, reason: "只能选择当前三个词条之一" };
    const building = this.state.buildings.find((candidate) => candidate.id === buildingId);
    const trait = getGrowthTraitDefinition(this.catalog.buildingGrowth, traitDefinitionId);
    if (!building || !trait) return { accepted: false, reason: "词条目标已失效" };
    const traits = building.traits ?? (building.traits = []);
    const existing = traits.find((candidate) => candidate.definitionId === traitDefinitionId);
    if (existing && trait.repeatable) {
      existing.stacks += 1;
      existing.acquiredAtLevel = draft.createdAtLevel;
    } else if (!existing) {
      traits.push({ definitionId: traitDefinitionId, stacks: 1, acquiredAtLevel: draft.createdAtLevel });
    } else {
      return { accepted: false, reason: "该词条不能重复获得" };
    }
    this.state.pendingTraitDraft = null;
    this.state.phase = draft.returnPhase;
    this.events.push({ type: "building_trait_chosen", buildingId, traitDefinitionId, level: draft.createdAtLevel });
    return { accepted: true, buildingId };
  }

  private transformGrowthTower(buildingId: string, targetTowerId: GrowthSpecialTowerId): CommandResult {
    if (!this.canOperateBase()) return { accepted: false, reason: "当前状态不可改造" };
    if (this.state.pendingTraitDraft) return { accepted: false, reason: "请先选择当前建筑词条" };
    const building = this.state.buildings.find((candidate) => candidate.id === buildingId);
    const route = this.catalog.buildingGrowth.transformations.find((candidate) => candidate.from === building?.growthDefinitionId && candidate.to === targetTowerId);
    if (!building || building.growthDefinitionId !== "arrow_tower" || !route) return { accepted: false, reason: "只有箭塔可以改造成特殊塔" };
    if (this.state.gold < route.goldCost) return { accepted: false, reason: "金币不足" };
    const target = getGrowthTowerDefinition(this.catalog.buildingGrowth, targetTowerId);
    if (!target) return { accepted: false, reason: "目标塔型无效" };
    this.state.gold -= route.goldCost;
    building.definitionId = targetTowerId;
    building.growthDefinitionId = targetTowerId;
    building.attackCooldownSeconds = Math.min(building.attackCooldownSeconds, target.baseAttackIntervalSeconds);
    this.events.push({ type: "tower_transformed", buildingId, fromTowerId: "arrow_tower", toTowerId: targetTowerId });
    return { accepted: true, buildingId };
  }

  private destroyBuilding(slotId: string): CommandResult {
    if (!this.canOperateBase()) return { accepted: false, reason: "当前状态不可拆除" };
    const index = this.state.buildings.findIndex((building) => building.slotId === slotId);
    if (index < 0) return { accepted: false, reason: "该格没有可拆除建筑" };
    const building = this.state.buildings[index]!;
    if (building.kind === "main_city") return { accepted: false, reason: "主城不可拆除" };
    this.removeGrowthSourceStates(building.id);
    this.state.buildings.splice(index, 1);
    this.events.push({ type: "building_destroyed", buildingId: building.id, slotId: building.slotId });
    return { accepted: true, buildingId: building.id };
  }

  private advanceTemporaryEffects(deltaSeconds: number): void {
    this.state.overlordInspireRemainingSeconds = Math.max(0, this.state.overlordInspireRemainingSeconds - deltaSeconds);
    if (this.state.overlordInspireRemainingSeconds <= EPSILON) this.state.overlordInspireMultiplier = 1;
  }

  private isActiveGrowthSource(sourceBuildingId: string): boolean {
    const source = this.state.buildings.find((building) => building.id === sourceBuildingId);
    return source?.kind === "tower" && source.growthDefinitionId !== undefined;
  }

  private advanceGrowthBurnStates(deltaSeconds: number): void {
    this.growthBurnRemainingAtStepStart.clear();
    for (const enemy of this.state.enemies) {
      const activeStates: GrowthBurnState[] = [];
      for (const state of enemy.growthBurnStates ?? []) {
        if (!this.isActiveGrowthSource(state.sourceBuildingId)) continue;
        this.growthBurnRemainingAtStepStart.set(this.growthBurnStateKey(enemy.id, state.sourceBuildingId), state.remainingSeconds);
        const burnStep = Math.min(deltaSeconds, state.remainingSeconds);
        if (enemy.hp > 0 && burnStep > EPSILON) this.applyContinuousDamage(enemy, state.damagePerSecond * burnStep, "growth-burn:" + state.sourceBuildingId);
        const remainingSeconds = Math.max(0, state.remainingSeconds - deltaSeconds);
        if (remainingSeconds > EPSILON) activeStates.push({ ...state, remainingSeconds });
      }
      enemy.growthBurnStates = activeStates;
    }
  }

  private advanceGrowthSlowStates(enemy: EnemyRuntimeState, deltaSeconds: number): number {
    let remainingSeconds = deltaSeconds;
    let effectiveSlowSeconds = 0;
    const states: GrowthSlowState[] = (enemy.growthSlowStates ?? [])
      .filter((state) => this.isActiveGrowthSource(state.sourceBuildingId) && state.remainingSeconds > EPSILON)
      .map((state) => ({ ...state }));
    while (remainingSeconds > EPSILON) {
      const multiplier = states.reduce((lowest, state) => Math.min(lowest, state.multiplier), 1);
      const nextExpiry = states.reduce((soonest, state) => Math.min(soonest, state.remainingSeconds), remainingSeconds);
      const slice = Math.min(remainingSeconds, nextExpiry);
      effectiveSlowSeconds += slice * multiplier;
      remainingSeconds -= slice;
      for (const state of states) state.remainingSeconds = Math.max(0, state.remainingSeconds - slice);
      for (let index = states.length - 1; index >= 0; index -= 1) {
        if (states[index]!.remainingSeconds <= EPSILON) states.splice(index, 1);
      }
      if (slice <= EPSILON) break;
    }
    enemy.growthSlowStates = states;
    return effectiveSlowSeconds;
  }

  private updateEnemies(deltaSeconds: number): void {
    this.advanceGrowthBurnStates(deltaSeconds);
    const overlord = this.state.enemies.find((enemy) => enemy.definitionId === "overlord_boss" && enemy.hp > 0);
    const overlordDefinition = overlord ? this.getEnemyDefinition(overlord.definitionId) : null;
    const inspireEffect = overlordDefinition?.signature?.kind === "overlord" ? overlordDefinition.signature : null;
    if (overlord && inspireEffect && this.state.overlordInspireRemainingSeconds <= EPSILON && overlord.abilityCooldownSeconds <= EPSILON) {
      const targetIds = this.state.enemies
        .filter((enemy) => enemy.hp > 0 && enemy.definitionId !== "overlord_boss")
        .map((enemy) => enemy.id);
      this.state.overlordInspireRemainingSeconds = inspireEffect.inspireDurationSeconds;
      this.state.overlordInspireMultiplier = inspireEffect.inspireMultiplier;
      overlord.abilityCooldownSeconds = inspireEffect.cooldownSeconds;
      this.events.push({
        type: "overlord_inspire",
        enemyId: overlord.id,
        targetIds,
        durationSeconds: inspireEffect.inspireDurationSeconds,
        multiplier: inspireEffect.inspireMultiplier,
      });
    }

    for (const enemy of this.state.enemies) {
      if (enemy.hp <= 0) continue;
      const definition = this.getEnemyDefinition(enemy.definitionId);
      const effectiveGrowthSlowSeconds = this.advanceGrowthSlowStates(enemy, deltaSeconds);
      if (enemy.hp <= 0) continue;

      enemy.attackCooldownSeconds = Math.max(0, enemy.attackCooldownSeconds - deltaSeconds);
      enemy.abilityCooldownSeconds = Math.max(0, enemy.abilityCooldownSeconds - deltaSeconds);
      if (enemy.atWall) continue;

      if (definition.behavior === "charger" && definition.signature?.kind === "charger") {
        const signature = definition.signature;
        if (enemy.chargeWarningRemainingSeconds > EPSILON) {
          enemy.chargeWarningRemainingSeconds = Math.max(0, enemy.chargeWarningRemainingSeconds - deltaSeconds);
          if (enemy.chargeWarningRemainingSeconds <= EPSILON) {
            enemy.chargeRemainingSeconds = signature.chargeDurationSeconds;
            enemy.chargeTargetPosition = Math.min(1, enemy.position + signature.chargeDistance);
            this.events.push({ type: "enemy_charge_started", enemyId: enemy.id, position: enemy.position, targetPosition: enemy.chargeTargetPosition });
          }
          continue;
        }
        if (enemy.chargeRemainingSeconds > EPSILON) {
          const chargeSpeed = signature.chargeDistance / signature.chargeDurationSeconds;
          enemy.position = Math.min(enemy.chargeTargetPosition, enemy.position + chargeSpeed * deltaSeconds);
          enemy.chargeRemainingSeconds = Math.max(0, enemy.chargeRemainingSeconds - deltaSeconds);
          if (enemy.chargeRemainingSeconds <= EPSILON || enemy.position >= enemy.chargeTargetPosition - EPSILON) {
            enemy.chargeRemainingSeconds = 0;
            enemy.atWall = enemy.position >= 1 - EPSILON;
            this.events.push({ type: "enemy_charge_impact", enemyId: enemy.id, position: enemy.position });
          }
          continue;
        }
        if (enemy.abilityCooldownSeconds <= EPSILON) {
          enemy.chargeWarningRemainingSeconds = signature.warningSeconds;
          enemy.abilityCooldownSeconds = signature.cooldownSeconds;
          this.events.push({ type: "enemy_charge_warning", enemyId: enemy.id, position: enemy.position, durationSeconds: signature.warningSeconds });
          continue;
        }
      }

      let speed = definition.moveSpeed;
      if (this.state.overlordInspireRemainingSeconds > EPSILON && definition.tier !== "boss") {
        speed *= this.state.overlordInspireMultiplier;
      }
      enemy.position = Math.min(1, enemy.position + speed * effectiveGrowthSlowSeconds);
      enemy.atWall = enemy.position >= 1 - EPSILON;
    }
  }

  private resolveTowerAttacks(deltaSeconds: number): void {
    for (const building of this.state.buildings) {
      if (building.kind !== "tower") continue;
      this.resolveGrowthTowerAttack(building, deltaSeconds);
    }
  }

  private resolveGrowthTowerAttack(building: BuildingState, deltaSeconds: number): void {
    const profile = getGrowthTowerAttackProfile(this.catalog.buildingGrowth, building);
    if (!profile) return;
    const cooldownBefore = building.attackCooldownSeconds;
    if (cooldownBefore > deltaSeconds + EPSILON) {
      building.attackCooldownSeconds = cooldownBefore - deltaSeconds;
      return;
    }
    const attackOffsetSeconds = Math.min(deltaSeconds, Math.max(0, cooldownBefore));
    const target = this.findTarget(building, { range: profile.range });
    const activeAfterAttackSeconds = Math.max(0, deltaSeconds - attackOffsetSeconds);
    building.attackCooldownSeconds = Math.max(0, profile.attackIntervalSeconds - activeAfterAttackSeconds);
    if (!target) return;

    const splashTargets = profile.tower.attackType === "splash"
      ? this.state.enemies
        .filter((enemy) => enemy.id !== target.id && enemy.hp > 0 && this.isGrowthTargetInRange(enemy, target.position, getGrowthCannonSplashRadius(this.catalog.buildingGrowth, building)))
        .sort((left, right) => right.position - left.position || compareStableIds(left.id, right.id))
      : [];
    const directDamage = this.getGrowthDamage(building, target);
    this.applyDamage(target, directDamage, building.id);
    this.events.push({ type: "tower_attack", buildingId: building.id, towerDefinitionId: profile.tower.id, targetId: target.id, targetPosition: target.position });

    if (profile.tower.id === "frost") {
      const slow = getGrowthFrostSlow(this.catalog.buildingGrowth, building);
      if (slow && target.hp > 0) this.applyGrowthSlow(target, building.id, slow.multiplier, slow.durationSeconds);
    }

    if (profile.tower.id === "cannon") {
      for (const enemy of splashTargets) {
        this.applyDamage(enemy, this.getGrowthDamage(building, enemy) * getGrowthSecondaryDamageMultiplier(profile), building.id);
        this.events.push({ type: "tower_special", buildingId: building.id, effect: "溅射", targetId: enemy.id });
      }
      const burn = getGrowthCannonBurn(this.catalog.buildingGrowth, building);
      if (burn) {
        for (const enemy of [target, ...splashTargets]) {
          if (enemy.hp <= 0) continue;
          this.applyGrowthBurn(enemy, building.id, burn.damagePerSecond, burn.durationSeconds);
          const activeAfterAttackSeconds = Math.max(0, deltaSeconds - attackOffsetSeconds);
          const previousRemainingSeconds = this.growthBurnRemainingAtStepStart.get(this.growthBurnStateKey(enemy.id, building.id));
          const uncoveredAfterAttackSeconds = previousRemainingSeconds === undefined
            ? activeAfterAttackSeconds
            : Math.max(0, deltaSeconds - Math.max(attackOffsetSeconds, previousRemainingSeconds));
          this.advanceFreshGrowthBurn(enemy, building.id, burn.damagePerSecond, activeAfterAttackSeconds, uncoveredAfterAttackSeconds);
          this.events.push({ type: "enemy_burned", enemyId: enemy.id, position: enemy.position, damagePerSecond: burn.damagePerSecond, durationSeconds: burn.durationSeconds, areaRadius: getGrowthCannonSplashRadius(this.catalog.buildingGrowth, building), sourceBuildingId: building.id });
        }
      }
    }

    if (profile.tower.id === "electric") {
      const chainTargets = this.state.enemies
        .filter((enemy) => enemy.id !== target.id && enemy.hp > 0 && this.isGrowthTargetInRange(enemy, target.position, profile.range))
        .sort((left, right) => right.position - left.position || compareStableIds(left.id, right.id))
        .slice(0, Math.max(0, (profile.tower.chainTargets ?? 1) - 1 + getGrowthElectricChainExtraTargets(this.catalog.buildingGrowth, building)));
      for (const enemy of chainTargets) {
        this.applyDamage(enemy, this.getGrowthDamage(building, enemy) * getGrowthSecondaryDamageMultiplier(profile), building.id);
        this.events.push({ type: "tower_special", buildingId: building.id, effect: "弹射", targetId: enemy.id });
      }
    }

    if (profile.tower.id === "machine_gun") {
      const penetrationTargets = this.state.enemies
        .filter((enemy) => enemy.id !== target.id && enemy.hp > 0 && enemy.position < target.position && this.isGrowthTargetInRange(enemy, target.position, profile.range))
        .sort((left, right) => right.position - left.position || compareStableIds(left.id, right.id))
        .slice(0, getGrowthMachinePenetrationTargets(this.catalog.buildingGrowth, building));
      const carryMultiplier = getGrowthMachinePenetrationMultiplier(this.catalog.buildingGrowth);
      for (const enemy of penetrationTargets) {
        this.applyDamage(enemy, this.getGrowthDamage(building, enemy) * carryMultiplier, building.id);
        this.events.push({ type: "tower_special", buildingId: building.id, effect: "穿透", targetId: enemy.id });
      }
    }
  }

  private isGrowthTargetInRange(enemy: EnemyRuntimeState, targetPosition: number, range: number): boolean {
    return enemy.atWall || Math.abs(enemy.position - targetPosition) <= range;
  }

  private getGrowthDamage(building: BuildingState, enemy: EnemyRuntimeState): number {
    const ownSlowActive = building.growthDefinitionId === "frost" && (enemy.growthSlowStates ?? []).some((state) => state.sourceBuildingId === building.id && state.remainingSeconds > EPSILON);
    return getGrowthTowerDamage(this.catalog.buildingGrowth, building, {
      tier: this.getEnemyDefinition(enemy.definitionId).tier,
      hp: enemy.hp,
      maxHp: enemy.maxHp,
      atWall: enemy.atWall,
    }, ownSlowActive);
  }

  private applyGrowthSlow(enemy: EnemyRuntimeState, sourceBuildingId: string, multiplier: number, durationSeconds: number): void {
    const states = enemy.growthSlowStates ?? (enemy.growthSlowStates = []);
    const existing = states.find((state) => state.sourceBuildingId === sourceBuildingId);
    if (existing) {
      existing.multiplier = multiplier;
      existing.remainingSeconds = Math.max(existing.remainingSeconds, durationSeconds);
      return;
    }
    states.push({ sourceBuildingId, multiplier, remainingSeconds: durationSeconds });
  }

  private applyGrowthBurn(enemy: EnemyRuntimeState, sourceBuildingId: string, damagePerSecond: number, durationSeconds: number): void {
    const states = enemy.growthBurnStates ?? (enemy.growthBurnStates = []);
    const existing = states.find((state) => state.sourceBuildingId === sourceBuildingId);
    if (existing) {
      existing.damagePerSecond = damagePerSecond;
      existing.remainingSeconds = Math.max(existing.remainingSeconds, durationSeconds);
      return;
    }
    states.push({ sourceBuildingId, damagePerSecond, remainingSeconds: durationSeconds });
  }

  private growthBurnStateKey(enemyId: string, sourceBuildingId: string): string {
    return enemyId + "\u0000" + sourceBuildingId;
  }

  private advanceFreshGrowthBurn(enemy: EnemyRuntimeState, sourceBuildingId: string, damagePerSecond: number, activeSeconds: number, damageSeconds = activeSeconds): void {
    if (activeSeconds <= EPSILON) return;
    if (enemy.hp > 0 && damageSeconds > EPSILON) this.applyContinuousDamage(enemy, damagePerSecond * damageSeconds, "growth-burn:" + sourceBuildingId);
    const states = enemy.growthBurnStates ?? [];
    const state = states.find((candidate) => candidate.sourceBuildingId === sourceBuildingId);
    if (!state) return;
    state.remainingSeconds = Math.max(0, state.remainingSeconds - activeSeconds);
    enemy.growthBurnStates = states.filter((candidate) => candidate.remainingSeconds > EPSILON);
  }

  private removeGrowthSourceStates(sourceBuildingId: string): void {
    for (const enemy of this.state.enemies) {
      enemy.growthSlowStates = (enemy.growthSlowStates ?? []).filter((state) => state.sourceBuildingId !== sourceBuildingId);
      enemy.growthBurnStates = (enemy.growthBurnStates ?? []).filter((state) => state.sourceBuildingId !== sourceBuildingId);
    }
  }

  private findTarget(building: { lanePosition: number }, tower: { range: number }): EnemyRuntimeState | undefined {
    // Keep normal range differences, but never let a live wall-contact enemy
    // disappear from targeting just because the scalar lane/depth values do
    // not share the same geometric axis.
    const candidates = this.state.enemies.filter((enemy) => enemy.hp > 0 && (enemy.atWall || Math.abs(enemy.position - building.lanePosition) <= tower.range));
    const wallContact = candidates
      .filter((enemy) => enemy.atWall)
      .sort((left, right) => right.position - left.position || compareStableIds(left.id, right.id))[0];
    return wallContact ?? candidates.sort((left, right) => right.position - left.position || compareStableIds(left.id, right.id))[0];
  }

  private applyDamage(enemy: EnemyRuntimeState, damage: number, sourceId: string): void {
    const definition = this.getEnemyDefinition(enemy.definitionId);
    const actualDamage = Math.max(1, damage * (definition.damageMultiplier ?? 1));
    enemy.hp = Math.max(0, enemy.hp - actualDamage);
    this.events.push({ type: "enemy_hit", enemyId: enemy.id, position: enemy.position, damage: actualDamage, remainingHp: enemy.hp });
  }

  private applyContinuousDamage(enemy: EnemyRuntimeState, damage: number, sourceId: string): void {
    const definition = this.getEnemyDefinition(enemy.definitionId);
    const actualDamage = Math.max(0, damage * (definition.damageMultiplier ?? 1));
    if (actualDamage <= EPSILON) return;
    enemy.hp = Math.max(0, enemy.hp - actualDamage);
    this.events.push({ type: "enemy_hit", enemyId: enemy.id, position: enemy.position, damage: actualDamage, remainingHp: enemy.hp });
  }

  private resolveWallAttacks(): void {
    for (const enemy of this.state.enemies) {
      if (enemy.hp <= 0 || !enemy.atWall || enemy.attackCooldownSeconds > EPSILON) continue;
      const definition = this.getEnemyDefinition(enemy.definitionId);
      enemy.attackCooldownSeconds = definition.wallAttackIntervalSeconds;
      const damage = this.state.overlordInspireRemainingSeconds > EPSILON && definition.tier !== "boss"
        ? definition.wallDamage * this.state.overlordInspireMultiplier
        : definition.wallDamage;
      this.applyWallDamage(damage);
      if (this.state.wallHp <= 0) {
        this.state.phase = "DEFEAT";
        return;
      }
    }
  }

  private applyWallDamage(amount: number): void {
    this.state.wallHp = Math.max(0, this.state.wallHp - amount);
  }

  private removeDefeatedEnemies(): void {
    const remaining: EnemyRuntimeState[] = [];
    let finalBossDefeated = false;
    for (const enemy of this.state.enemies) {
      if (enemy.hp > 0) {
        remaining.push(enemy);
        continue;
      }
      const definition = this.getEnemyDefinition(enemy.definitionId);
      this.state.defeatedEnemies += 1;
      this.state.gold += definition.goldReward;
      this.events.push({ type: "enemy_defeated", enemyId: enemy.id, position: enemy.position });
      if (definition.isFinalBoss) finalBossDefeated = true;
    }
    this.state.enemies = remaining;
    if (this.state.phase !== "DEFEAT" && finalBossDefeated) this.state.phase = "VICTORY";
  }

  private canOperateBase(): boolean {
    return this.state.phase === "OPENING_COUNTDOWN" || this.state.phase === "RUNNING" || this.state.phase === "TACTICAL_PAUSE";
  }

  private pause(): CommandResult {
    if (this.state.phase !== "OPENING_COUNTDOWN" && this.state.phase !== "RUNNING") return { accepted: false, reason: "只能在可操作阶段进入战术暂停" };
    this.state.pausedFromPhase = this.state.phase;
    this.state.phase = "TACTICAL_PAUSE";
    return { accepted: true };
  }

  private resume(): CommandResult {
    if (this.state.phase !== "TACTICAL_PAUSE") return { accepted: false, reason: "当前不是战术暂停" };
    this.state.phase = this.state.pausedFromPhase ?? "RUNNING";
    this.state.pausedFromPhase = null;
    return { accepted: true };
  }

  private systemPause(): CommandResult {
    if (this.state.phase !== "OPENING_COUNTDOWN" && this.state.phase !== "RUNNING" && this.state.phase !== "TACTICAL_PAUSE" && this.state.phase !== "TRAIT_DRAFT") return { accepted: false, reason: "当前不可系统暂停" };
    this.state.systemPausedFromPhase = this.state.phase;
    this.state.phase = "SYSTEM_PAUSE";
    return { accepted: true };
  }

  private systemResume(): CommandResult {
    if (this.state.phase !== "SYSTEM_PAUSE") return { accepted: false, reason: "当前不是系统暂停" };
    this.state.phase = this.state.systemPausedFromPhase ?? "RUNNING";
    this.state.systemPausedFromPhase = null;
    return { accepted: true };
  }

  private restart(): void {
    this.randomState = this.initialSeed;
    this.events = [];
    this.state = this.createInitialState();
  }

  private getLanePosition(slotId: string): number {
    const match = /slot-r(\d+)-c(\d+)/.exec(slotId);
    if (!match) return 0.5;
    const column = Number(match[2]);
    return Math.max(0.1, Math.min(0.9, (column - 1) / 4));
  }

  private getEnemyDefinition(id: string): EnemyDefinition {
    const enemy = this.catalog.enemies.find((item) => item.id === id);
    if (!enemy) throw new Error("Unknown enemy: " + id);
    return enemy;
  }

}

export function phaseAllowsBaseOperations(phase: GamePhase): phase is PlayPhase {
  return phase === "OPENING_COUNTDOWN" || phase === "RUNNING" || phase === "TACTICAL_PAUSE";
}

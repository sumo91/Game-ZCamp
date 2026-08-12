import { FIRST_BATCH_CARD_IDS, SUPPLY_CATEGORY_PATTERN, starterCatalog, validateCatalog } from "./content";
import type { CardDefinition, CardEffect, ContentCatalog, EnemyDefinition, TowerDefinition } from "./content";
import { CAMP_SLOT_IDS } from "./types";
import type {
  BuildingState,
  CardInstance,
  CardTarget,
  CommandResult,
  EnemyRuntimeState,
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
export const HAND_LIMIT = 4;
export const SUPPLY_CYCLE_SECONDS = 18;
export const WALL_SHIELD_MAX_HP = 60;
export const MAIN_CITY_ID = "main-city";

const EPSILON = 0.000001;
const MAIN_CITY_WOOD_INCOME = 0.5;
const LUMBERYARD_INCOME = [0, 1, 1.8, 3];
const BASE_REPAIR_AMOUNT = 25;

export class GameSimulation {
  private readonly catalog: ContentCatalog;
  private readonly initialSeed: number;
  private state: GameState;
  private events: GameEvent[] = [];
  private randomState: number;

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
      case "play_card":
        return this.playCard(command.cardInstanceId, command.target);
      case "discard_card":
        return this.discardCard(command.cardInstanceId);
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
    if (this.state.phase === "SYSTEM_PAUSE" || this.state.phase === "TACTICAL_PAUSE" || this.state.phase === "VICTORY" || this.state.phase === "DEFEAT") return;

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
    const firstBatch = FIRST_BATCH_CARD_IDS.map((definitionId, index) => this.createCardInstance(definitionId, 1, index));
    const hand = firstBatch.slice(0, 4);
    const remaining = firstBatch.slice(4);
    const nextSupplyCard = remaining.shift() ?? null;
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
      wallShieldHp: 0,
      wallShieldMaxHp: WALL_SHIELD_MAX_HP,
      wallShieldRemainingSeconds: 0,
      globalFreezeRemainingSeconds: 0,
      globalFreezeNextSpawn: false,
      globalFreezePendingDurationSeconds: 0,
      focusFireRemainingSeconds: 0,
      focusFireTargetId: null,
      focusFireNextSpawn: false,
      overlordInspireRemainingSeconds: 0,
      overlordInspireMultiplier: 1,
      seed: this.initialSeed,
      buildings: [this.createMainCity()],
      enemies: [],
      hand,
      nextSupplyCard,
      supplyWaitingCard: null,
      supplyProgressSeconds: 0,
      supplyCycleSeconds: SUPPLY_CYCLE_SECONDS,
      supplyBatchNumber: 1,
      supplyBatchRemaining: remaining,
      permanentApplications: {},
    };
  }

  private createMainCity(): BuildingState {
    return { id: MAIN_CITY_ID, slotId: "slot-r3-c3", kind: "main_city", definitionId: "main_city", level: 1, lanePosition: 0.5, attackCooldownSeconds: 0 };
  }

  private createCardInstance(definitionId: string, batchNumber: number, batchIndex: number): CardInstance {
    return {
      instanceId: definitionId + "@" + batchNumber + "-" + batchIndex,
      definitionId,
      batchNumber,
      batchIndex,
    };
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
      this.state.wood += this.getWoodIncome() * step;
      this.advanceSupply(step);
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
    for (let wave = previousWave + 1; wave <= nextWave; wave += 1) this.events.push({ type: "wave_started", wave });
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
      slowMultiplier: 1,
      slowRemainingSeconds: 0,
      abilityCooldownSeconds: definition.signature?.initialCooldownSeconds ?? 0,
      burnDamagePerSecond: 0,
      burnRemainingSeconds: 0,
      chargeWarningRemainingSeconds: 0,
      chargeRemainingSeconds: 0,
      chargeTargetPosition: 0,
    };
    this.state.enemies.push(enemy);
    this.state.spawnedEnemies += 1;
    this.events.push({ type: "enemy_spawned", enemyId: enemy.id, definitionId: enemy.definitionId, wave });
    if (this.state.globalFreezeNextSpawn && this.state.globalFreezePendingDurationSeconds > EPSILON) {
      this.state.globalFreezeRemainingSeconds = this.state.globalFreezePendingDurationSeconds;
      this.state.globalFreezePendingDurationSeconds = 0;
      this.state.globalFreezeNextSpawn = false;
      this.events.push({ type: "global_freeze_started", enemyId: enemy.id, durationSeconds: this.state.globalFreezeRemainingSeconds });
    }
    if (this.state.focusFireNextSpawn && this.state.focusFireRemainingSeconds > EPSILON) {
      this.state.focusFireTargetId = enemy.id;
      this.state.focusFireNextSpawn = false;
      this.events.push({ type: "focus_fire_marked", enemyId: enemy.id, nextSpawn: false, durationSeconds: this.state.focusFireRemainingSeconds });
    }
  }

  private advanceSupply(deltaSeconds: number): void {
    if (!this.state.nextSupplyCard || this.state.supplyWaitingCard) return;
    this.state.supplyProgressSeconds = Math.min(this.state.supplyCycleSeconds, this.state.supplyProgressSeconds + deltaSeconds);
    if (this.state.supplyProgressSeconds + EPSILON < this.state.supplyCycleSeconds) return;
    const card = this.state.nextSupplyCard;
    if (this.state.hand.length >= HAND_LIMIT) {
      this.state.supplyWaitingCard = card;
      this.state.nextSupplyCard = null;
      this.state.supplyProgressSeconds = this.state.supplyCycleSeconds;
      this.events.push({ type: "card_waiting", cardInstanceId: card.instanceId, definitionId: card.definitionId });
      return;
    }
    this.state.hand.push(card);
    this.events.push({ type: "card_received", cardInstanceId: card.instanceId, definitionId: card.definitionId, fromWaiting: false });
    this.startNextSupplyCycle();
  }

  private startNextSupplyCycle(): void {
    this.state.nextSupplyCard = this.drawNextBatchCard();
    this.state.supplyProgressSeconds = 0;
  }

  private drawNextBatchCard(): CardInstance {
    if (this.state.supplyBatchRemaining.length === 0) {
      this.state.supplyBatchNumber += 1;
      this.state.supplyBatchRemaining = this.generateBatch(this.state.supplyBatchNumber);
    }
    return this.state.supplyBatchRemaining.shift()!;
  }

  private generateBatch(batchNumber: number): CardInstance[] {
    const result: CardInstance[] = [];
    // The cap applies to the player's hand, including high-cost cards retained
    // from an earlier batch. Start with that observed count so a new batch cannot
    // introduce a third high-cost card before the player has a chance to discard.
    let highCostCount = this.state.hand.reduce((count, instance) => {
      const definition = this.getCardDefinition(instance.definitionId);
      return count + (definition.category === "base" && definition.cost >= 65 ? 1 : 0);
    }, 0);
    let goldStreak = 0;
    for (let index = 0; index < SUPPLY_CATEGORY_PATTERN.length; index += 1) {
      const category = SUPPLY_CATEGORY_PATTERN[index]!;
      const candidates = this.catalog.cards.filter((card) => card.category === category && this.isCardAvailable(card));
      const isSafe = (card: CardDefinition): boolean => {
        const highCost = card.category === "base" && card.cost >= 65;
        const gold = card.category !== "base";
        return !(highCost && highCostCount >= 2) && !(gold && goldStreak >= 2);
      };
      const safeCandidates = candidates.filter(isSafe);
      // If a permanent candidate has reached its cap (or a requested category
      // is otherwise unavailable), downgrade deterministically to a legal base
      // card. This keeps the 12-card supply alive without burning or hiding cards.
      const fallbackCandidates = this.catalog.cards
        .filter((card) => card.category === "base" && this.isCardAvailable(card))
        .filter(isSafe);
      const legalCandidates = safeCandidates.length > 0
        ? safeCandidates
        : fallbackCandidates.length > 0
          ? fallbackCandidates
          : this.catalog.cards.filter((card) => this.isCardAvailable(card)).filter(isSafe);
      if (legalCandidates.length === 0) {
        throw new Error("No legal card candidate for deterministic batch.");
      }
      const card = legalCandidates[this.nextRandomInt(legalCandidates.length)]!;
      result.push(this.createCardInstance(card.id, batchNumber, index));
      if (card.category === "base" && card.cost >= 65) highCostCount += 1;
      goldStreak = card.category === "base" ? 0 : goldStreak + 1;
    }
    return result;
  }

  private isCardAvailable(card: CardDefinition): boolean {
    if (card.repeatable) {
      const max = card.maxApplications;
      return max === undefined || (this.state.permanentApplications[card.id] ?? 0) < max || card.category === "base" || card.category === "tactical";
    }
    return (this.state.permanentApplications[card.id] ?? 0) === 0;
  }

  private cardFromHand(instanceId: string): { card: CardInstance; index: number } | null {
    const index = this.state.hand.findIndex((card) => card.instanceId === instanceId);
    if (index < 0) return null;
    return { card: this.state.hand[index]!, index };
  }

  private playCard(instanceId: string, target?: CardTarget): CommandResult {
    if (!this.canOperateBase()) return { accepted: false, reason: "当前状态不可使用手牌" };
    const entry = this.cardFromHand(instanceId);
    if (!entry) return { accepted: false, reason: "手牌中没有这张牌" };
    const definition = this.getCardDefinition(entry.card.definitionId);
    if (definition.category === "base") return this.playBaseCard(entry, definition, target);
    if (definition.category === "permanent") return this.playPermanentCard(entry, definition);
    return this.playTacticalCard(entry, definition);
  }

  private playBaseCard(entry: { card: CardInstance; index: number }, card: CardDefinition, target?: CardTarget): CommandResult {
    if (card.effect.kind !== "base" || !target) return { accepted: false, reason: "请选择合法基地目标" };
    if (card.effect.targetKind === "repair_shop" && target.kind === "wall") {
      if (this.state.wood < card.cost) return { accepted: false, reason: "木材不足" };
      this.state.wood -= card.cost;
      if (this.state.wallHp < this.state.wallMaxHp) {
        const amount = Math.min(this.getRepairAmount(), this.state.wallMaxHp - this.state.wallHp);
        this.state.wallHp += amount;
        this.events.push({ type: "wall_repaired", amount });
      } else {
        this.grantShield(30, 12);
      }
      this.consumeCard(entry, card);
      return { accepted: true, cardInstanceId: entry.card.instanceId };
    }
    if (target.kind !== "slot" || !CAMP_SLOT_IDS.includes(target.slotId)) return { accepted: false, reason: "请选择合法营地格" };
    const existing = this.state.buildings.find((building) => building.slotId === target.slotId);
    if (existing?.kind === "main_city") return { accepted: false, reason: "主城固定，不可替换或升级" };
    const targetMatches = existing && this.baseTargetMatches(existing, card.effect);
    if (existing && !targetMatches) return { accepted: false, reason: "只能对同类建筑使用这张牌" };
    const cost = existing ? this.getUpgradeCost(card.cost, existing.level) : card.cost;
    if (existing && existing.level >= 3) return { accepted: false, reason: "建筑已达到 Lv.3" };
    if (this.state.wood < cost) return { accepted: false, reason: "木材不足" };
    this.state.wood -= cost;
    if (existing) {
      existing.level += 1;
      this.events.push({ type: "building_upgraded", buildingId: existing.id, level: existing.level });
    } else {
      const building = this.createBuildingFromCard(target.slotId, card.effect);
      this.state.buildings.push(building);
      this.events.push({ type: "building_built", buildingId: building.id, slotId: building.slotId, definitionId: building.definitionId });
    }
    this.consumeCard(entry, card);
    return { accepted: true, cardInstanceId: entry.card.instanceId, buildingId: existing?.id };
  }

  private playPermanentCard(entry: { card: CardInstance; index: number }, card: CardDefinition): CommandResult {
    if (card.effect.kind === "base") return { accepted: false, reason: "无效发展牌" };
    const applied = this.state.permanentApplications[card.id] ?? 0;
    if (card.maxApplications !== undefined && applied >= card.maxApplications) return { accepted: false, reason: "该永久发展已达到上限" };
    if (this.state.gold < card.cost) return { accepted: false, reason: "金币不足" };
    this.state.gold -= card.cost;
    this.state.permanentApplications[card.id] = applied + 1;
    if (card.effect.kind === "wall_reinforcement") {
      this.state.wallMaxHp += card.effect.amount;
      this.state.wallHp += card.effect.amount;
    }
    this.events.push({ type: "permanent_applied", cardInstanceId: entry.card.instanceId, definitionId: card.id });
    this.consumeCard(entry, card);
    return { accepted: true, cardInstanceId: entry.card.instanceId };
  }

  private playTacticalCard(entry: { card: CardInstance; index: number }, card: CardDefinition): CommandResult {
    if (card.effect.kind === "base") return { accepted: false, reason: "无效战术牌" };
    if (this.state.gold < card.cost) return { accepted: false, reason: "金币不足" };
    this.state.gold -= card.cost;
    if (card.effect.kind === "wall_shield") this.grantShield(card.effect.amount, card.effect.durationSeconds);
    if (card.effect.kind === "global_freeze") {
      const hasTarget = this.state.enemies.some((enemy) => enemy.hp > 0);
      if (hasTarget) {
        this.state.globalFreezeRemainingSeconds = Math.max(this.state.globalFreezeRemainingSeconds, card.effect.durationSeconds);
        this.state.globalFreezeNextSpawn = false;
        this.state.globalFreezePendingDurationSeconds = 0;
      } else {
        this.state.globalFreezeRemainingSeconds = 0;
        this.state.globalFreezeNextSpawn = true;
        this.state.globalFreezePendingDurationSeconds = card.effect.durationSeconds;
        this.events.push({ type: "global_freeze_armed", durationSeconds: card.effect.durationSeconds });
      }
    }
    if (card.effect.kind === "focus_fire") {
      const target = this.state.enemies
        .filter((enemy) => enemy.hp > 0)
        .sort((left, right) => right.position - left.position)[0];
      this.state.focusFireTargetId = target?.id ?? null;
      this.state.focusFireNextSpawn = !target;
      this.state.focusFireRemainingSeconds = card.effect.durationSeconds;
      this.events.push({ type: "focus_fire_marked", enemyId: target?.id ?? null, nextSpawn: !target, durationSeconds: card.effect.durationSeconds });
    }
    if (card.effect.kind === "wood_drop") this.state.wood += card.effect.amount;
    this.events.push({ type: "tactical_used", cardInstanceId: entry.card.instanceId, definitionId: card.id });
    this.consumeCard(entry, card);
    return { accepted: true, cardInstanceId: entry.card.instanceId };
  }

  private consumeCard(entry: { card: CardInstance; index: number }, card: CardDefinition): void {
    this.state.hand.splice(entry.index, 1);
    this.events.push({ type: "card_played", cardInstanceId: entry.card.instanceId, definitionId: card.id });
    this.fillFromWaitingCard();
  }

  private discardCard(instanceId: string): CommandResult {
    if (!this.canOperateBase()) return { accepted: false, reason: "当前状态不可弃牌" };
    const entry = this.cardFromHand(instanceId);
    if (!entry) return { accepted: false, reason: "手牌中没有这张牌" };
    this.state.hand.splice(entry.index, 1);
    this.events.push({ type: "card_discarded", cardInstanceId: entry.card.instanceId, definitionId: entry.card.definitionId });
    this.fillFromWaitingCard();
    return { accepted: true, cardInstanceId: entry.card.instanceId };
  }

  private fillFromWaitingCard(): void {
    if (!this.state.supplyWaitingCard || this.state.hand.length >= HAND_LIMIT) return;
    const waiting = this.state.supplyWaitingCard;
    this.state.supplyWaitingCard = null;
    this.state.hand.push(waiting);
    this.events.push({ type: "card_received", cardInstanceId: waiting.instanceId, definitionId: waiting.definitionId, fromWaiting: true });
    this.startNextSupplyCycle();
  }

  private destroyBuilding(slotId: string): CommandResult {
    if (!this.canOperateBase()) return { accepted: false, reason: "当前状态不可拆除" };
    const index = this.state.buildings.findIndex((building) => building.slotId === slotId);
    if (index < 0) return { accepted: false, reason: "该格没有可拆除建筑" };
    const building = this.state.buildings[index]!;
    if (building.kind === "main_city") return { accepted: false, reason: "主城不可拆除" };
    this.state.buildings.splice(index, 1);
    this.events.push({ type: "building_destroyed", buildingId: building.id, slotId: building.slotId });
    return { accepted: true, buildingId: building.id };
  }

  private createBuildingFromCard(slotId: string, effect: Extract<CardDefinition["effect"], { kind: "base" }>): BuildingState {
    const kind = effect.targetKind;
    return {
      id: effect.definitionId + "-" + slotId,
      slotId,
      kind,
      definitionId: effect.definitionId,
      level: 1,
      lanePosition: this.getLanePosition(slotId),
      attackCooldownSeconds: 0,
    };
  }

  private baseTargetMatches(building: BuildingState, effect: Extract<CardDefinition["effect"], { kind: "base" }>): boolean {
    return building.kind === effect.targetKind && building.definitionId === effect.definitionId;
  }

  private getUpgradeCost(baseCost: number, currentLevel: number): number {
    return Math.round(baseCost * (currentLevel === 1 ? 1.5 : 2.25));
  }

  private grantShield(amount: number, durationSeconds: number): void {
    this.state.wallShieldHp = Math.min(this.state.wallShieldMaxHp, this.state.wallShieldHp + amount);
    this.state.wallShieldRemainingSeconds = Math.max(this.state.wallShieldRemainingSeconds, durationSeconds);
  }

  private getWoodIncome(): number {
    const lumberyardIncome = this.state.buildings
      .filter((building) => building.kind === "lumberyard")
      .reduce((total, building) => total + (LUMBERYARD_INCOME[building.level] ?? 0), 0);
    const incomeEffect = this.getPermanentEffect("wood_income");
    const woodBuffs = incomeEffect?.kind === "wood_income" ? this.getPermanentApplications("wood_income") * incomeEffect.amountPerSecond : 0;
    return MAIN_CITY_WOOD_INCOME + lumberyardIncome + woodBuffs;
  }

  private getRepairAmount(): number {
    const repairShop = this.state.buildings
      .filter((building) => building.kind === "repair_shop")
      .sort((left, right) => right.level - left.level)[0];
    const shopBonus = repairShop ? Math.max(0, repairShop.level - 1) * 10 : 0;
    const masteryEffect = this.getPermanentEffect("repair_mastery");
    const masteryBonus = masteryEffect?.kind === "repair_mastery" ? this.getPermanentApplications("repair_mastery") * masteryEffect.amount : 0;
    return BASE_REPAIR_AMOUNT + shopBonus + masteryBonus;
  }

  private advanceTemporaryEffects(deltaSeconds: number): void {
    this.state.wallShieldRemainingSeconds = Math.max(0, this.state.wallShieldRemainingSeconds - deltaSeconds);
    if (this.state.wallShieldRemainingSeconds <= EPSILON) this.state.wallShieldHp = 0;
    this.state.globalFreezeRemainingSeconds = Math.max(0, this.state.globalFreezeRemainingSeconds - deltaSeconds);
    this.state.focusFireRemainingSeconds = Math.max(0, this.state.focusFireRemainingSeconds - deltaSeconds);
    this.state.overlordInspireRemainingSeconds = Math.max(0, this.state.overlordInspireRemainingSeconds - deltaSeconds);
    if (this.state.focusFireRemainingSeconds <= EPSILON) {
      this.state.focusFireTargetId = null;
      this.state.focusFireNextSpawn = false;
    }
    if (this.state.overlordInspireRemainingSeconds <= EPSILON) this.state.overlordInspireMultiplier = 1;
  }

  private updateEnemies(deltaSeconds: number): void {
    const frozen = this.state.globalFreezeRemainingSeconds > EPSILON;
    if (!frozen) {
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
    }

    for (const enemy of this.state.enemies) {
      if (enemy.hp <= 0) continue;
      const definition = this.getEnemyDefinition(enemy.definitionId);
      if (enemy.slowRemainingSeconds > 0) enemy.slowRemainingSeconds = Math.max(0, enemy.slowRemainingSeconds - deltaSeconds);
      else enemy.slowMultiplier = 1;

      if (enemy.burnRemainingSeconds > EPSILON) {
        const burnStep = Math.min(deltaSeconds, enemy.burnRemainingSeconds);
        this.applyDamage(enemy, enemy.burnDamagePerSecond * burnStep, "burn");
        enemy.burnRemainingSeconds = Math.max(0, enemy.burnRemainingSeconds - deltaSeconds);
        if (enemy.burnRemainingSeconds <= EPSILON) enemy.burnDamagePerSecond = 0;
      }
      if (enemy.hp <= 0 || frozen) continue;

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

      let speed = definition.moveSpeed * enemy.slowMultiplier;
      if (this.state.overlordInspireRemainingSeconds > EPSILON && definition.tier !== "boss") {
        speed *= this.state.overlordInspireMultiplier;
      }
      enemy.position = Math.min(1, enemy.position + speed * deltaSeconds);
      enemy.atWall = enemy.position >= 1 - EPSILON;
    }
  }

  private resolveTowerAttacks(deltaSeconds: number): void {
    for (const building of this.state.buildings) {
      if (building.kind !== "tower") continue;
      building.attackCooldownSeconds = Math.max(0, building.attackCooldownSeconds - deltaSeconds);
      if (building.attackCooldownSeconds > EPSILON) continue;
      const tower = this.getTowerDefinition(building.definitionId);
      const target = this.findTarget(building, tower);
      building.attackCooldownSeconds = tower.attackIntervalSeconds;
      if (!target) continue;

      const damage = this.getTowerDamage(building, tower, target);
      this.emitTowerSpecialIfNeeded(building, tower, target);
      this.applyDamage(target, damage, building.id);
      this.events.push({ type: "tower_attack", buildingId: building.id, towerDefinitionId: tower.id, targetId: target.id, targetPosition: target.position });

      if (tower.attackType === "slow") {
        const slowEffect = this.getPermanentEffect("tower_slow", tower.id);
        const hasSlowEffect = slowEffect?.kind === "tower_slow" && this.getPermanentApplications("tower_slow", tower.id) > 0;
        target.slowMultiplier = hasSlowEffect ? slowEffect.slowMultiplier : (tower.slowMultiplier ?? 0.5);
        target.slowRemainingSeconds = hasSlowEffect ? slowEffect.durationSeconds : (tower.slowDurationSeconds ?? 1);
      }

      let splashTargets: EnemyRuntimeState[] = [];
      if (tower.attackType === "splash" && (tower.splashRadius ?? 0) > 0) {
        const blastEffect = this.getPermanentEffect("tower_blast_radius", tower.id);
        const radius = (tower.splashRadius ?? 0) + (blastEffect?.kind === "tower_blast_radius" && this.getPermanentApplications("tower_blast_radius", tower.id) > 0 ? blastEffect.amount : 0);
        splashTargets = this.state.enemies.filter((enemy) => enemy.id !== target.id && enemy.hp > 0 && Math.abs(enemy.position - target.position) <= radius);
        for (const enemy of splashTargets) {
          this.emitTowerSpecialIfNeeded(building, tower, enemy);
          this.applyDamage(enemy, this.getTowerDamage(building, tower, enemy) * 0.45, building.id);
        }
      }

      if (tower.id === "cannon") {
        const burnEffect = this.getPermanentEffect("tower_burn", tower.id);
        if (burnEffect?.kind === "tower_burn" && this.getPermanentApplications("tower_burn", tower.id) > 0) {
          const cannonBlastEffect = this.getPermanentEffect("tower_blast_radius", tower.id);
          const blastRadius = (tower.splashRadius ?? 0) + (cannonBlastEffect?.kind === "tower_blast_radius" && this.getPermanentApplications("tower_blast_radius", tower.id) > 0 ? cannonBlastEffect.amount : 0);
          const burnTargets = [target, ...splashTargets].filter((enemy, index, all) => enemy.hp > 0 && all.findIndex((candidate) => candidate.id === enemy.id) === index);
          for (const enemy of burnTargets) {
            enemy.burnDamagePerSecond = Math.max(enemy.burnDamagePerSecond, burnEffect.damagePerSecond);
            enemy.burnRemainingSeconds = Math.max(enemy.burnRemainingSeconds, burnEffect.durationSeconds);
            this.events.push({ type: "enemy_burned", enemyId: enemy.id, position: enemy.position, damagePerSecond: burnEffect.damagePerSecond, durationSeconds: burnEffect.durationSeconds, areaRadius: blastRadius });
          }
        }
      }

      if (tower.attackType === "chain") {
        const chainEffect = this.getPermanentEffect("tower_chain", tower.id);
        const extraJumps = chainEffect?.kind === "tower_chain" && this.getPermanentApplications("tower_chain", tower.id) > 0 ? chainEffect.extraTargets : 0;
        const chainTargets = this.state.enemies
          .filter((enemy) => enemy.id !== target.id && enemy.hp > 0 && Math.abs(enemy.position - target.position) <= tower.range)
          .sort((left, right) => right.position - left.position || left.id.localeCompare(right.id))
          .slice(0, Math.max(0, (tower.chainTargets ?? 1) - 1 + extraJumps));
        for (const enemy of chainTargets) {
          this.emitTowerSpecialIfNeeded(building, tower, enemy);
          this.applyDamage(enemy, this.getTowerDamage(building, tower, enemy) * 0.55, building.id);
        }
      }

      if (tower.id === "machine_gun") {
        const penetrationEffect = this.getPermanentEffect("tower_penetration", tower.id);
        const penetrationTargets = penetrationEffect?.kind === "tower_penetration" && this.getPermanentApplications("tower_penetration", tower.id) > 0
          ? this.state.enemies
            .filter((enemy) => enemy.id !== target.id && enemy.hp > 0 && enemy.position < target.position && Math.abs(enemy.position - target.position) <= tower.range)
            .sort((left, right) => right.position - left.position || left.id.localeCompare(right.id))
            .slice(0, Math.max(0, Math.floor(penetrationEffect.amount)))
          : [];
        for (const penetrationTarget of penetrationTargets) {
          this.applyDamage(penetrationTarget, this.getTowerDamage(building, tower, penetrationTarget), building.id);
          this.events.push({ type: "tower_special", buildingId: building.id, effect: "穿透", targetId: penetrationTarget.id });
        }
      }
    }
  }

  private getTowerDamage(building: BuildingState, tower: TowerDefinition, target: EnemyRuntimeState): number {
    let damage = tower.damage + Math.max(0, building.level - 1) * Math.max(1, tower.damage * 0.25);
    const focusEffect = this.getCardEffect("focus_fire");
    if (focusEffect?.kind === "focus_fire" && this.state.focusFireTargetId === target.id && this.state.focusFireRemainingSeconds > EPSILON) damage *= 1 + focusEffect.damageMultiplier;
    const vulnerabilityEffect = this.getPermanentEffect("tower_vulnerability", "frost");
    if (vulnerabilityEffect?.kind === "tower_vulnerability" && target.slowRemainingSeconds > EPSILON && this.getPermanentApplications("tower_vulnerability", "frost") > 0) damage *= 1 + vulnerabilityEffect.amount;
    const targetTier = this.getEnemyDefinition(target.definitionId).tier;
    const bossDamageEffect = this.getPermanentEffect("tower_boss_damage", tower.id);
    if (bossDamageEffect?.kind === "tower_boss_damage" && ["elite", "boss"].includes(targetTier) && this.getPermanentApplications("tower_boss_damage", tower.id) > 0) damage *= 1 + bossDamageEffect.amount;
    const overloadEffect = this.getPermanentEffect("tower_overload", tower.id);
    if (overloadEffect?.kind === "tower_overload" && ["elite", "boss"].includes(targetTier) && this.getPermanentApplications("tower_overload", tower.id) > 0) damage *= 1 + overloadEffect.amount;
    const synergyEffect = this.getPermanentEffect("tower_synergy");
    if (synergyEffect?.kind === "tower_synergy" && this.getPermanentApplications("tower_synergy") > 0 && this.hasTowerSynergy()) damage *= 1 + synergyEffect.amount;
    return damage;
  }

  private emitTowerSpecialIfNeeded(building: BuildingState, tower: TowerDefinition, target: EnemyRuntimeState): void {
    const overloadEffect = this.getPermanentEffect("tower_overload", tower.id);
    const tier = this.getEnemyDefinition(target.definitionId).tier;
    if (overloadEffect?.kind === "tower_overload" && ["elite", "boss"].includes(tier) && this.getPermanentApplications("tower_overload", tower.id) > 0) {
      this.events.push({ type: "tower_special", buildingId: building.id, effect: "过载", targetId: target.id });
    }
  }

  private findTarget(building: { lanePosition: number }, tower: TowerDefinition): EnemyRuntimeState | undefined {
    // Keep normal range differences, but never let a live wall-contact enemy
    // disappear from targeting just because the scalar lane/depth values do
    // not share the same geometric axis.
    const candidates = this.state.enemies.filter((enemy) => enemy.hp > 0 && (enemy.atWall || Math.abs(enemy.position - building.lanePosition) <= tower.range));
    const focused = candidates.find((enemy) => enemy.id === this.state.focusFireTargetId && this.state.focusFireRemainingSeconds > EPSILON);
    const wallContact = candidates
      .filter((enemy) => enemy.atWall)
      .sort((left, right) => right.position - left.position || left.id.localeCompare(right.id))[0];
    return focused ?? wallContact ?? candidates.sort((left, right) => right.position - left.position || left.id.localeCompare(right.id))[0];
  }

  private getCardEffect(kind: CardEffect["kind"], towerId?: string): CardEffect | undefined {
    return this.catalog.cards.find((card) => {
      if (card.effect.kind !== kind) return false;
      if (towerId === undefined) return true;
      return "towerId" in card.effect && card.effect.towerId === towerId;
    })?.effect;
  }

  private getPermanentEffect(kind: CardEffect["kind"], towerId?: string): CardEffect | undefined {
    return this.catalog.cards.find((card) => {
      if (card.category !== "permanent" || card.effect.kind !== kind) return false;
      if (towerId === undefined) return true;
      return "towerId" in card.effect && card.effect.towerId === towerId;
    })?.effect;
  }

  private getPermanentApplications(kind: CardEffect["kind"], towerId?: string): number {
    const card = this.catalog.cards.find((candidate) => {
      if (candidate.category !== "permanent" || candidate.effect.kind !== kind) return false;
      if (towerId === undefined) return true;
      return "towerId" in candidate.effect && candidate.effect.towerId === towerId;
    });
    return card ? (this.state.permanentApplications[card.id] ?? 0) : 0;
  }

  private hasTowerSynergy(): boolean {
    return new Set(this.state.buildings.filter((building) => building.kind === "tower").map((building) => building.definitionId)).size >= 3;
  }

  private applyDamage(enemy: EnemyRuntimeState, damage: number, sourceId: string): void {
    const definition = this.getEnemyDefinition(enemy.definitionId);
    const actualDamage = Math.max(1, damage * (definition.damageMultiplier ?? 1));
    enemy.hp = Math.max(0, enemy.hp - actualDamage);
    this.events.push({ type: "enemy_hit", enemyId: enemy.id, position: enemy.position, damage: actualDamage, remainingHp: enemy.hp });
  }

  private resolveWallAttacks(): void {
    if (this.state.globalFreezeRemainingSeconds > EPSILON) return;
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
    const shieldDamage = Math.min(this.state.wallShieldHp, amount);
    this.state.wallShieldHp -= shieldDamage;
    const remaining = amount - shieldDamage;
    this.state.wallHp = Math.max(0, this.state.wallHp - remaining);
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
      if (this.state.focusFireTargetId === enemy.id) this.state.focusFireTargetId = null;
      this.events.push({ type: "enemy_defeated", enemyId: enemy.id, position: enemy.position });
      if (definition.isFinalBoss) finalBossDefeated = true;
      if (definition.splitInto) {
        for (let index = 0; index < definition.splitInto.count; index += 1) this.spawnEnemy(enemy.wave, definition.splitInto.enemyId);
      }
    }
    this.state.enemies = remaining;
    if (this.state.phase !== "DEFEAT" && finalBossDefeated) this.state.phase = "VICTORY";
  }

  private canOperateBase(): boolean {
    return this.state.phase === "OPENING_COUNTDOWN" || this.state.phase === "RUNNING" || this.state.phase === "TACTICAL_PAUSE";
  }

  private pause(): CommandResult {
    if (this.state.phase !== "RUNNING") return { accepted: false, reason: "只能在战斗中进入战术暂停" };
    this.state.pausedFromPhase = "RUNNING";
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
    if (this.state.phase !== "OPENING_COUNTDOWN" && this.state.phase !== "RUNNING" && this.state.phase !== "TACTICAL_PAUSE") return { accepted: false, reason: "当前不可系统暂停" };
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

  private getTowerDefinition(id: string): TowerDefinition {
    const tower = this.catalog.towers.find((item) => item.id === id);
    if (!tower) throw new Error("Unknown tower: " + id);
    return tower;
  }

  private getEnemyDefinition(id: string): EnemyDefinition {
    const enemy = this.catalog.enemies.find((item) => item.id === id);
    if (!enemy) throw new Error("Unknown enemy: " + id);
    return enemy;
  }

  private getCardDefinition(id: string): CardDefinition {
    const card = this.catalog.cards.find((item) => item.id === id);
    if (!card) throw new Error("Unknown card: " + id);
    return card;
  }
}

export function phaseAllowsBaseOperations(phase: GamePhase): phase is PlayPhase {
  return phase === "OPENING_COUNTDOWN" || phase === "RUNNING" || phase === "TACTICAL_PAUSE";
}

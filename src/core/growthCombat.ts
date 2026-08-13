import { getGrowthTraitDefinition, getGrowthTowerDefinition } from "./buildingGrowth";
import type { BuildingGrowthContent, GrowthTowerDefinition, GrowthTraitEffect, GrowthTraitId } from "./buildingGrowth";
import type { BuildingState, EnemyTier } from "./types";

/** The minimum movement multiplier allowed by any growth frost slow. */
export const GROWTH_FROST_MIN_SLOW_MULTIPLIER = 0.1;

export interface GrowthTowerAttackProfile {
  tower: GrowthTowerDefinition;
  baseAttackDamage: number;
  attackIntervalSeconds: number;
  range: number;
}

export interface GrowthDamageTarget {
  tier: EnemyTier;
  hp: number;
  maxHp: number;
  atWall: boolean;
}

export interface GrowthSlowEffect {
  multiplier: number;
  durationSeconds: number;
}

function getEffect(content: BuildingGrowthContent, traitId: GrowthTraitId): GrowthTraitEffect | undefined {
  return getGrowthTraitDefinition(content, traitId)?.effect;
}

export function getGrowthTraitStacks(building: BuildingState, traitId: GrowthTraitId): number {
  if (building.model !== "growth") return 0;
  return Math.max(0, building.traits?.find((trait) => trait.definitionId === traitId)?.stacks ?? 0);
}

export function getGrowthTowerAttackProfile(content: BuildingGrowthContent, building: BuildingState): GrowthTowerAttackProfile | null {
  if (building.model !== "growth" || building.kind !== "tower" || !building.growthDefinitionId || building.growthDefinitionId === "lumberyard") return null;
  const tower = getGrowthTowerDefinition(content, building.growthDefinitionId);
  if (!tower) return null;
  const level = Math.max(1, building.level);
  const damageEffect = getEffect(content, "tower_damage");
  const attackSpeedEffect = getEffect(content, "tower_attack_speed");
  const rangeEffect = getEffect(content, "tower_range");
  const damageStacks = getGrowthTraitStacks(building, "tower_damage");
  const attackSpeedStacks = getGrowthTraitStacks(building, "tower_attack_speed");
  const rangeStacks = getGrowthTraitStacks(building, "tower_range");
  const levelDamageMultiplier = 1 + tower.levelDamageMultiplier * (level - 1);
  const levelAttackSpeedMultiplier = 1 + tower.levelAttackSpeedMultiplier * (level - 1);
  const damageMultiplier = 1 + (damageEffect?.kind === "tower_damage_percent" ? damageEffect.amount * damageStacks : 0);
  const attackSpeedMultiplier = 1 + (attackSpeedEffect?.kind === "tower_attack_speed_percent" ? attackSpeedEffect.amount * attackSpeedStacks : 0);
  const rangeMultiplier = 1 + (rangeEffect?.kind === "tower_range_percent" ? rangeEffect.amount * rangeStacks : 0);
  return {
    tower,
    baseAttackDamage: tower.baseDamage * levelDamageMultiplier * damageMultiplier,
    attackIntervalSeconds: tower.baseAttackIntervalSeconds / (levelAttackSpeedMultiplier * attackSpeedMultiplier),
    range: tower.range * rangeMultiplier,
  };
}

export function getGrowthTowerDamage(
  content: BuildingGrowthContent,
  building: BuildingState,
  target: GrowthDamageTarget,
  ownSlowActive = false,
): number {
  const profile = getGrowthTowerAttackProfile(content, building);
  if (!profile) return 0;
  let multiplier = 1;
  const isEliteOrBoss = target.tier === "elite" || target.tier === "boss";
  if (isEliteOrBoss) {
    const commonElite = getEffect(content, "tower_elite_damage");
    if (commonElite?.kind === "tower_elite_damage_percent") multiplier += commonElite.amount * getGrowthTraitStacks(building, "tower_elite_damage");
    const specialEliteId = profile.tower.id === "machine_gun" ? "machine_hunter" : profile.tower.id === "electric" ? "electric_overload" : null;
    if (specialEliteId) {
      const specialElite = getEffect(content, specialEliteId);
      if (specialElite?.kind === "tower_elite_damage_percent") multiplier += specialElite.amount * getGrowthTraitStacks(building, specialEliteId);
    }
  }
  if (target.atWall) {
    const wallGuard = getEffect(content, "tower_wall_guard");
    if (wallGuard?.kind === "tower_wall_damage_percent") multiplier += wallGuard.amount * getGrowthTraitStacks(building, "tower_wall_guard");
  }
  const finisher = getEffect(content, "tower_finisher");
  if (finisher?.kind === "tower_finisher_damage_percent" && target.maxHp > 0 && target.hp / target.maxHp < finisher.healthThreshold) {
    multiplier += finisher.amount * getGrowthTraitStacks(building, "tower_finisher");
  }
  if (profile.tower.id === "frost" && ownSlowActive) {
    const vulnerability = getEffect(content, "frost_vulnerability");
    if (vulnerability?.kind === "tower_vulnerability_percent") multiplier += vulnerability.amount * getGrowthTraitStacks(building, "frost_vulnerability");
  }
  return profile.baseAttackDamage * multiplier;
}

export function getGrowthCannonSplashRadius(content: BuildingGrowthContent, building: BuildingState): number {
  const profile = getGrowthTowerAttackProfile(content, building);
  if (!profile || profile.tower.id !== "cannon") return 0;
  const blast = getEffect(content, "cannon_blast");
  const multiplier = 1 + (blast?.kind === "tower_splash_radius_percent" ? blast.amount * getGrowthTraitStacks(building, "cannon_blast") : 0);
  return (profile.tower.splashRadius ?? 0) * multiplier;
}

export function getGrowthMachinePenetrationTargets(content: BuildingGrowthContent, building: BuildingState): number {
  const effect = getEffect(content, "machine_penetration");
  return effect?.kind === "tower_penetration" ? effect.extraTargets * getGrowthTraitStacks(building, "machine_penetration") : 0;
}

export function getGrowthElectricChainExtraTargets(content: BuildingGrowthContent, building: BuildingState): number {
  const effect = getEffect(content, "electric_chain");
  return effect?.kind === "tower_chain" ? effect.extraTargets * getGrowthTraitStacks(building, "electric_chain") : 0;
}

export function getGrowthMachinePenetrationMultiplier(content: BuildingGrowthContent): number {
  const effect = getEffect(content, "machine_penetration");
  return effect?.kind === "tower_penetration" ? effect.carryMultiplier : 0;
}

export function getGrowthCannonBurn(content: BuildingGrowthContent, building: BuildingState): { damagePerSecond: number; durationSeconds: number } | null {
  const profile = getGrowthTowerAttackProfile(content, building);
  const effect = getEffect(content, "cannon_burn");
  const stacks = getGrowthTraitStacks(building, "cannon_burn");
  if (!profile || profile.tower.id !== "cannon" || effect?.kind !== "tower_burn" || stacks <= 0) return null;
  return {
    damagePerSecond: profile.baseAttackDamage * effect.damagePercent * Math.pow(1.5, stacks - 1),
    durationSeconds: effect.durationSeconds,
  };
}

export function getGrowthFrostSlow(content: BuildingGrowthContent, building: BuildingState): GrowthSlowEffect | null {
  const profile = getGrowthTowerAttackProfile(content, building);
  const effect = getEffect(content, "frost_deep");
  const stacks = getGrowthTraitStacks(building, "frost_deep");
  if (!profile || profile.tower.id !== "frost") return null;
  const baseMultiplier = profile.tower.slowMultiplier ?? 1;
  const baseDuration = profile.tower.slowDurationSeconds ?? 0;
  return {
    multiplier: Math.max(GROWTH_FROST_MIN_SLOW_MULTIPLIER, baseMultiplier - (effect?.kind === "tower_slow_depth" ? effect.extraSlowMultiplier * stacks : 0)),
    durationSeconds: baseDuration + (effect?.kind === "tower_slow_depth" ? effect.durationSeconds * stacks : 0),
  };
}

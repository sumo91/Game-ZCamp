import type { GameEvent } from "../core/types";

export type NoticeChannel = "global" | "warning" | "ambient";

export interface FeedbackNotice {
  channel: NoticeChannel;
  text: string;
  color: string;
  durationSeconds: number;
  throttleKey?: string;
}

export const AMBIENT_NOTICE_MIN_INTERVAL_SECONDS = 0.9;

/** Pure routing from core events to layered battle notices. Global and warning always show; ambient is throttled. */
export function routeBattleNotice(event: GameEvent): FeedbackNotice | null {
  switch (event.type) {
    case "wave_started":
      return { channel: "global", text: "第 " + event.wave + " 波尸潮已接近", color: "#f6c453", durationSeconds: 1.8 };
    case "overlord_inspire":
      return { channel: "global", text: "尸潮君王鼓舞 · 残余尸潮 +" + Math.round((event.multiplier - 1) * 100) + "%", color: "#f6c453", durationSeconds: Math.max(1, event.durationSeconds) };
    case "enemy_charge_warning":
      return { channel: "warning", text: "⚠ 冲锋预警 · " + event.durationSeconds.toFixed(1) + " 秒", color: "#f06a6a", durationSeconds: event.durationSeconds + 0.3 };
    case "enemy_charge_started":
      return { channel: "warning", text: "冲锋开始 · 直线突进", color: "#f28b37", durationSeconds: 1.2 };
    case "enemy_charge_impact":
      return { channel: "warning", text: "冲锋撞墙 · 城墙承受冲击", color: "#f06a6a", durationSeconds: 1.5 };
    case "enemy_burned":
      return { channel: "ambient", text: "燃烧 · " + event.damagePerSecond + "/秒 · " + event.durationSeconds + "秒", color: "#f28b37", durationSeconds: 1.4, throttleKey: "burn" };
    case "tower_special":
      return { channel: "ambient", text: event.effect + "命中", color: "#f6c453", durationSeconds: 0.8, throttleKey: "special:" + event.effect };
    default:
      return null;
  }
}

/** Time-based gate shared by notice and sound throttling. Pure with respect to the passed clock. */
export class ThrottleGate {
  private lastAllowedAtSeconds = new Map<string, number>();

  public allow(key: string, nowSeconds: number, minIntervalSeconds: number): boolean {
    const last = this.lastAllowedAtSeconds.get(key);
    if (last !== undefined && nowSeconds - last < minIntervalSeconds) return false;
    this.lastAllowedAtSeconds.set(key, nowSeconds);
    return true;
  }

  public reset(): void {
    this.lastAllowedAtSeconds.clear();
  }
}

export interface WallImpactFeedback {
  tier: "light" | "heavy" | "critical";
  shakeDurationSeconds: number;
  shakeIntensity: number;
  flashAlpha: number;
}

/** Wall damage has no core event; the presentation infers it from frame deltas and maps it to feedback tiers. */
export function decideWallImpact(damage: number, wallMaxHp: number): WallImpactFeedback | null {
  if (!(damage > 0)) return null;
  const ratio = wallMaxHp > 0 ? damage / wallMaxHp : 0;
  if (ratio >= 0.15) return { tier: "critical", shakeDurationSeconds: 0.32, shakeIntensity: 0.013, flashAlpha: 0.4 };
  if (ratio >= 0.05) return { tier: "heavy", shakeDurationSeconds: 0.2, shakeIntensity: 0.008, flashAlpha: 0.28 };
  return { tier: "light", shakeDurationSeconds: 0, shakeIntensity: 0, flashAlpha: 0.14 };
}

export type ResourcePulseKind = "gain" | "spend";

/**
 * Distinguish meaningful resource jumps from continuous lumber income so the counters pulse on
 * spends and big rewards without flickering every frame.
 */
export function decideResourcePulse(previous: number, current: number, epsilon = 0.51): ResourcePulseKind | null {
  if (current > previous + epsilon) return "gain";
  if (current < previous - epsilon) return "spend";
  return null;
}

export type ProjectileStyle = "tracer" | "arc" | "bolt" | "shard";

/** Each tower family reads differently in motion; the mapping is content, not scene logic. */
export function mapTowerProjectileStyle(towerDefinitionId: string): ProjectileStyle {
  if (towerDefinitionId === "cannon") return "arc";
  if (towerDefinitionId === "electric") return "bolt";
  if (towerDefinitionId === "frost") return "shard";
  return "tracer";
}

export const DAMAGE_NUMBER_MIN = 15;

/** Full damage numbers only for heavy hits; per-hit spam from fast towers would flood the field. */
export function shouldShowDamageNumber(damage: number): boolean {
  return damage >= DAMAGE_NUMBER_MIN;
}

export const COIN_TEXT_MIN_REWARD = 1;

/** Every kill flies a coin; only meaningful rewards (>= 1 gold) also carry a text label. */
export function coinFlightLabel(goldReward: number): string | null {
  return goldReward >= COIN_TEXT_MIN_REWARD ? "+" + goldReward : null;
}

export interface WaveBannerView {
  wave: number;
  text: string;
  color: string;
  isBossWave: boolean;
}

/** Wave starts are the game's rhythm beats; boss waves get the alarm treatment. */
export function deriveWaveBanner(wave: number, maxWave: number): WaveBannerView | null {
  if (!Number.isInteger(wave) || wave < 1 || wave > maxWave) return null;
  const isBossWave = wave === maxWave - 5 || wave === maxWave;
  if (wave === maxWave) return { wave, text: "最终决战 · 第 " + wave + " 波", color: "#f06a6a", isBossWave: true };
  if (isBossWave) return { wave, text: "首领来袭 · 第 " + wave + " 波", color: "#f28b37", isBossWave };
  return { wave, text: "第 " + wave + " 波 · 尸潮接近", color: "#f6c453", isBossWave: false };
}

/** Boss entrance announcements share one cadence across spawn events. */
export function isBossEntrance(definitionId: string, bossDefinitionIds: readonly string[]): boolean {
  return bossDefinitionIds.includes(definitionId);
}

import { BattleSession } from "../core/battleSession";
import { starterCatalog, type ContentCatalog } from "../core/content";
import { CAMP_SLOT_IDS, type GameCommand } from "../core/types";

export type BattlePressureCount = 100 | 200 | 300;
export const PRESSURE_SEED = 120200;
export const PRESSURE_CONDITIONS = "开发压力：HP 10亿、攻墙伤害0维持活动数量；其余攻击、移动、减速、链电及Boss技能沿用正式规则。";

export function battlePressureCatalog(count: BattlePressureCount): ContentCatalog {
  const ordinary = ["walker", "runner", "tank", "armored", "brute"];
  const spawnEvents = Array.from({ length: count - 2 }, (_, index) => ({ atSeconds: 0, enemyId: ordinary[index % ordinary.length]! }));
  spawnEvents.push({ atSeconds: 0, enemyId: "charger_boss" }, { atSeconds: 0, enemyId: "overlord_boss" });
  const waves = [{ wave: 1, startSeconds: 0, pulseIntervalSeconds: 1, spawnEvents }];
  return { ...starterCatalog, developmentPressure: { kind: "mixed-battle-pressure", activeUnits: count },
    enemies: starterCatalog.enemies.map((enemy) => ({ ...enemy, maxHp: 1_000_000_000, wallDamage: 0 })),
    levelWaves: { first_defense: waves, broken_valley: waves, kings_march: waves } };
}

export function createBattlePressureSession(count: BattlePressureCount): BattleSession {
  const session = new BattleSession({ catalog: battlePressureCatalog(count), seed: PRESSURE_SEED, config: { heroId: "camp_warden", levelId: "first_defense" }, initialResources: { wood: 100_000, gold: 100_000 } });
  const send = (command: GameCommand) => {
    const result = session.dispatch(command);
    if (!result.accepted) throw new Error(`压力配置命令失败：${result.reason}`);
    return result;
  };
  const families = ["arrow_tower", "machine_gun", "cannon", "frost", "electric"] as const;
  for (const [index, slotId] of CAMP_SLOT_IDS.filter((id) => !session.getState().buildings.some((building) => building.slotId === id)).entries()) {
    const { buildingId } = send({ type: "build_building", slotId, definitionId: "arrow_tower" });
    const family = families[index % families.length]!;
    if (family !== "arrow_tower") send({ type: "transform_tower", buildingId: buildingId!, targetTowerId: family });
  }
  // Normal 5-second opening, advanced only by the public fixed-step boundary.
  for (let step = 0; step < 151; step += 1) session.advance(1 / 30);
  session.drainEvents();
  return session;
}

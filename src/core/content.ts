export interface TowerDefinition {
  id: string;
  displayName: string;
  role: string;
  buildCost: number;
  maxLevel: number;
}

export interface EnemyDefinition {
  id: string;
  displayName: string;
  role: string;
  maxHp: number;
  moveSpeed: number;
  wallDamage: number;
  goldReward: number;
}

export interface WaveDefinition {
  wave: number;
  durationSeconds: number;
  enemyIds: string[];
}

export interface ContentCatalog {
  towers: TowerDefinition[];
  enemies: EnemyDefinition[];
  waves: WaveDefinition[];
}

export const starterCatalog: ContentCatalog = {
  towers: [
    {
      id: "machine_gun",
      displayName: "机枪塔",
      role: "快速单体输出",
      buildCost: 40,
      maxLevel: 3,
    },
  ],
  enemies: [
    {
      id: "walker",
      displayName: "行尸",
      role: "基础推进",
      maxHp: 20,
      moveSpeed: 1,
      wallDamage: 5,
      goldReward: 2,
    },
  ],
  waves: [
    {
      wave: 1,
      durationSeconds: 5,
      enemyIds: ["walker"],
    },
  ],
};

function assertUniqueIds(ids: string[], label: string): void {
  if (new Set(ids).size !== ids.length) {
    throw new Error(`${label} contains duplicate ids.`);
  }
}

export function validateCatalog(catalog: ContentCatalog): void {
  if (catalog.towers.length === 0 || catalog.enemies.length === 0 || catalog.waves.length === 0) {
    throw new Error("Content catalog must contain towers, enemies, and waves.");
  }

  assertUniqueIds(catalog.towers.map((item) => item.id), "Towers");
  assertUniqueIds(catalog.enemies.map((item) => item.id), "Enemies");
  assertUniqueIds(catalog.waves.map((item) => String(item.wave)), "Waves");

  for (const wave of catalog.waves) {
    if (wave.durationSeconds <= 0 || wave.enemyIds.length === 0) {
      throw new Error(`Wave ${wave.wave} must define a positive duration and at least one enemy.`);
    }

    for (const enemyId of wave.enemyIds) {
      if (!catalog.enemies.some((enemy) => enemy.id === enemyId)) {
        throw new Error(`Wave ${wave.wave} references unknown enemy ${enemyId}.`);
      }
    }
  }
}

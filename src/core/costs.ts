export function getUpgradeCost(baseCost: number, currentLevel: number): number {
  return Math.round(baseCost * (currentLevel === 1 ? 1.5 : 2.25));
}
